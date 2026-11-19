/**
 * USAGE LIMITS, the latest reading per engine. One of these in main;
 * `telemetry:usageLimits` answers from it.
 *
 * Where the readings come from:
 *  - Claude Code: the status line JSON every Claude agent already sends
 *    (core/hookServer.ts, the Status branch). As of the last agent reply;
 *    with no Claude agent running there is no new one (the last seen value
 *    with its time, never the sign in token).
 *  - Codex: the newest token_count row of the session file a Codex hook names
 *    (CodexUsageScheduler), and on a fresh read `codex app-server`'s
 *    account/rateLimits/read.
 *  - Antigravity: on a fresh read only, `agy -p "/usage" --output-format json`,
 *    which answers with no model turn.
 *  - OpenCode: reports no limits.
 *
 * Each engine reads its own login in its own process. Only the fields of
 * shared/usageLimits.ts are kept, in memory: never an account id, never what
 * an engine printed, never a log line of it. A fresh read asks each engine at
 * most once per cooldown, whatever the answer, and one at a time per engine.
 * No electron import.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { open, stat, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { hardKillTree } from './procKill';
import {
  LIMIT_ENGINES, parseAgyUsage, parseClaudeAccount, parseClaudeRateLimits, parseCodexAccount, parseCodexRateLimits, parseGrokCreditsTail, parseGrokSettingsTier, parseOpencodeAccount,
  type EngineLimits, type LimitAccount, type LimitEngine, type LimitSource, type LimitWindow, type UsageLimitsReadOptions, type UsageLimitsSnapshot
} from '../shared/usageLimits';
import type { CodexRateLimitsTail } from './codexUsage';

/** A fresh read asks an engine again only when its reading is older than this. */
export const LIMITS_COOLDOWN_MS = 5 * 60_000;
const RUN_TIMEOUT_MS = 30_000;
const MAX_OUTPUT_BYTES = 1024 * 1024;
/** How far back Grok Build's log is read. It writes a credits row about every 30 s while it runs. */
const GROK_TAIL_BYTES = 1024 * 1024;
/** How long `codex app-server` is given for the account once its limits are in. */
const CODEX_ACCOUNT_GRACE_MS = 2_000;

const ENGINE_COMMAND: Readonly<Record<LimitEngine, string>> = {
  claude: 'claude', codex: 'codex', antigravity: 'agy', grok: 'grok', opencode: 'opencode'
};

interface Reading {
  windows: LimitWindow[];
  plan: string | null;
  asOf: number;
  fromAgent: string | null;
  source: LimitSource;
}

export interface UsageLimitsDeps {
  /** The absolute path of an engine's command, or null when it is not installed. */
  commandPath(command: string): string | null;
  /** The environment an engine is asked with: this person's (or this office's), never an agent's own home. */
  env(): Record<string, string>;
  /** Where the engines are asked from. */
  cwd(): string;
  /** Wait for the login shell's PATH before a command is looked up. */
  ready?(): Promise<void>;
  now?(): number;
  /** Tests hand in their own askers. */
  askCodex?(bin: string, env: Record<string, string>, cwd: string): Promise<unknown>;
  askAgy?(bin: string, env: Record<string, string>, cwd: string): Promise<string | null>;
  askClaudeAccount?(bin: string, env: Record<string, string>, cwd: string): Promise<string | null>;
  askOpencodeAccount?(bin: string, env: Record<string, string>, cwd: string): Promise<string | null>;
}

export class UsageLimits {
  private readonly readings = new Map<LimitEngine, Reading>();
  private readonly asked = new Map<LimitEngine, number>();
  private readonly inFlight = new Map<LimitEngine, Promise<void>>();
  /** Engines whose last ask came back with nothing usable. */
  private readonly failed = new Set<LimitEngine>();
  /** The sign in each engine last named. Only a plan's name and whether it is an API key. */
  private readonly accounts = new Map<LimitEngine, LimitAccount>();
  private readonly accountAsked = new Map<LimitEngine, number>();
  private readonly accountsInFlight = new Map<LimitEngine, Promise<void>>();
  /** Grok Build's log and settings as last read, so an unchanged file is not read again. */
  private grokSeen = '';
  private grokUnrecognised = false;

  constructor(private readonly deps: UsageLimitsDeps) {}

  private now(): number {
    return this.deps.now?.() ?? Date.now();
  }

  /** A Claude agent's status line tick (its `rate_limits`, when the CLI sent one). */
  noteClaudeStatus(agentId: string | undefined, raw: unknown): void {
    const windows = parseClaudeRateLimits(raw);
    if (!windows.length) return;
    this.readings.set('claude', { windows, plan: null, asOf: this.now(), fromAgent: agentId ?? null, source: 'status-line' });
  }

  /** The newest rate limits a Codex agent's session file holds. An older row than the reading kept is dropped. */
  noteCodexSession(agentId: string, tail: CodexRateLimitsTail): void {
    const kept = this.readings.get('codex');
    if (kept && kept.asOf >= tail.ts) return;
    this.readings.set('codex', { windows: tail.windows, plan: tail.plan, asOf: tail.ts, fromAgent: agentId, source: 'session-file' });
    this.failed.delete('codex');
  }

  /** Every engine's latest reading. `fresh` asks Codex and Antigravity again when theirs is old. */
  async read(opts: UsageLimitsReadOptions = {}): Promise<UsageLimitsSnapshot> {
    await this.deps.ready?.().catch(() => undefined);
    const bins = new Map(LIMIT_ENGINES.map((e) => [e, this.deps.commandPath(ENGINE_COMMAND[e])] as const));
    if (bins.get('grok')) await this.readGrok().catch(() => undefined);
    // A plan's name is shown from the first read on: the kept read does not wait for it, the next one has it.
    const accounts = Promise.all((['claude', 'opencode'] as const).map((e) => {
      const bin = bins.get(e);
      return bin ? this.askAccount(e, bin) : undefined;
    }));
    if (opts.fresh) {
      await Promise.all([accounts, ...(['codex', 'antigravity'] as const).map((e) => {
        const bin = bins.get(e);
        return bin ? this.askOnce(e, bin) : undefined;
      })]);
    }
    return { engines: LIMIT_ENGINES.map((e) => this.view(e, bins.get(e) ?? null)), readAt: this.now() };
  }

  private view(engine: LimitEngine, bin: string | null): EngineLimits {
    const r = this.readings.get(engine);
    const failed = this.failed.has(engine);
    const account = this.accounts.get(engine);
    const apiKey = account?.apiKey ?? false;
    const plan = account?.plan ?? r?.plan ?? null;
    const none = { windows: [], asOf: null, plan: null, apiKey: false, fromAgent: null, source: null, failed: false };
    // A reading outlives an uninstall only until the next read: what is shown is what is here now.
    if (!bin) return { engine, state: 'not-installed', ...none };
    if (engine === 'opencode') return { engine, state: 'not-available', ...none, apiKey };
    if (engine === 'grok' && this.grokUnrecognised) return { engine, state: 'not-available', ...none, plan };
    // An API key has no plan limits, so nothing is on its way; a reading an agent brought is still shown.
    if (!r && apiKey) return { engine, state: 'not-available', ...none, apiKey };
    if (!r) return { engine, state: 'no-reading', ...none, plan, failed };
    return { engine, state: r.windows.length ? 'ok' : 'not-available', windows: r.windows, asOf: r.asOf, plan, apiKey, fromAgent: r.fromAgent, source: r.source, failed };
  }

  /** Ask one engine, unless its reading is recent, it was asked within the cooldown, or it is being asked now. */
  private askOnce(engine: 'codex' | 'antigravity', bin: string): Promise<void> | undefined {
    const now = this.now();
    const kept = this.readings.get(engine);
    if (kept && now - kept.asOf < LIMITS_COOLDOWN_MS) return undefined;
    const running = this.inFlight.get(engine);
    if (running) return running;
    if (now - (this.asked.get(engine) ?? -Infinity) < LIMITS_COOLDOWN_MS) return undefined;
    this.asked.set(engine, now);
    const job = (engine === 'codex' ? this.askCodex(bin) : this.askAgy(bin))
      .catch(() => false)
      .then((ok) => { if (ok) this.failed.delete(engine); else this.failed.add(engine); })
      .finally(() => this.inFlight.delete(engine));
    this.inFlight.set(engine, job);
    return job;
  }

  /** Ask an engine who it is signed in as, at most once per cooldown. Nothing it says is kept but the plan's name and the key's kind. */
  private askAccount(engine: 'claude' | 'opencode', bin: string): Promise<void> | undefined {
    const now = this.now();
    const running = this.accountsInFlight.get(engine);
    if (running) return running;
    if (now - (this.accountAsked.get(engine) ?? -Infinity) < LIMITS_COOLDOWN_MS) return undefined;
    this.accountAsked.set(engine, now);
    const ask = engine === 'claude' ? this.deps.askClaudeAccount ?? askClaudeAuthStatus : this.deps.askOpencodeAccount ?? askOpencodeAuthList;
    const parse = engine === 'claude' ? parseClaudeAccount : parseOpencodeAccount;
    const job = ask(bin, this.deps.env(), this.deps.cwd())
      .catch(() => null)
      .then((text) => { const account = text === null ? null : parse(text); if (account) this.accounts.set(engine, account); })
      .finally(() => this.accountsInFlight.delete(engine));
    this.accountsInFlight.set(engine, job);
    return job;
  }

  /** Grok Build's newest credits row, from its own log, and its tier from its settings. Neither file holds a
   *  credential (its sign in is in auth.json, which is never opened). A file that did not change is not read. */
  private async readGrok(): Promise<void> {
    const env = this.deps.env();
    const home = env.GROK_HOME || join(env.HOME || env.USERPROFILE || this.deps.cwd(), '.grok');
    const logPath = join(home, 'logs', 'unified.jsonl');
    const settingsPath = join(home, 'settings_cache.json');
    const mark = async (path: string) => { const s = await stat(path).catch(() => null); return s ? `${s.mtimeMs}:${s.size}` : '-'; };
    const seen = `${await mark(logPath)}|${await mark(settingsPath)}`;
    if (seen === this.grokSeen) return;
    this.grokSeen = seen;
    const tier = parseGrokSettingsTier(await readFile(settingsPath, 'utf8').catch(() => ''));
    const row = parseGrokCreditsTail(await readTail(logPath, GROK_TAIL_BYTES).catch(() => ''));
    this.grokUnrecognised = row === 'unrecognised';
    if (row && row !== 'unrecognised') {
      const kept = this.readings.get('grok');
      if (!kept || kept.asOf < row.ts) this.readings.set('grok', { windows: row.windows, plan: row.plan, asOf: row.ts, fromAgent: null, source: 'grok-log' });
    }
    if (tier) this.accounts.set('grok', { plan: tier, apiKey: false });
  }

  /** True when the engine answered with something usable. */
  private async askCodex(bin: string): Promise<boolean> {
    const result = await (this.deps.askCodex ?? askCodexAppServer)(bin, this.deps.env(), this.deps.cwd());
    const answer = result as { rateLimits?: unknown; account?: unknown } | null;
    const account = parseCodexAccount(answer?.account);
    if (account) this.accounts.set('codex', account);
    const parsed = parseCodexRateLimits(answer?.rateLimits);
    // An API key has no plan limits to read: that is the answer, not a failed ask.
    if (!parsed) return account?.apiKey === true;
    const asOf = this.now();
    const kept = this.readings.get('codex');
    if (!kept || kept.asOf < asOf) this.readings.set('codex', { windows: parsed.windows, plan: parsed.plan, asOf, fromAgent: null, source: 'codex-app-server' });
    return true;
  }

  private async askAgy(bin: string): Promise<boolean> {
    const text = await (this.deps.askAgy ?? askAgyUsage)(bin, this.deps.env(), this.deps.cwd());
    const windows = text === null ? null : parseAgyUsage(text);
    if (!windows) return false;
    this.readings.set('antigravity', { windows, plan: null, asOf: this.now(), fromAgent: null, source: 'agy-usage' });
    return true;
  }
}

/** The last `bytes` of a file, starting at a whole line. */
async function readTail(path: string, bytes: number): Promise<string> {
  const file = await open(path, 'r');
  try {
    const { size } = await file.stat();
    const start = Math.max(0, size - bytes);
    const chunk = Buffer.alloc(size - start);
    await file.read(chunk, 0, chunk.length, start);
    const text = chunk.toString('utf8');
    return start === 0 ? text : text.slice(text.indexOf('\n') + 1);
  } finally {
    await file.close();
  }
}

/** The names an engine is asked with: where it is, whose home it signs in from, its locale and a
 *  proxy. Nothing else of the app's (or the office daemon's) own environment goes to it. */
const ENGINE_ENV_NAMES = [
  'PATH', 'HOME', 'USER', 'LOGNAME', 'SHELL', 'LANG', 'LC_ALL', 'TMPDIR', 'CODEX_HOME', 'GROK_HOME',
  'HTTPS_PROXY', 'HTTP_PROXY', 'NO_PROXY', 'https_proxy', 'http_proxy', 'no_proxy',
  'SystemRoot', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'PATHEXT', 'TEMP', 'TMP'
];

export function engineEnv(base: Record<string, string | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of ENGINE_ENV_NAMES) {
    const value = base[name];
    if (typeof value === 'string' && value) out[name] = value;
  }
  return out;
}

/** One engine run: started, read, and ended for good. A Windows npm shim (codex.cmd) starts only
 *  through a shell (Node refuses a .cmd or .bat without one), as claudeVersionOnce runs claude.cmd;
 *  every argument here is a fixed word, never text from a person or a file. Through a shell the
 *  engine is the shell's child, so it is ended with its tree (hardKillTree: taskkill /T). */
function runEngine(bin: string, args: string[], env: Record<string, string>, cwd: string, stdin: boolean): {
  child: ChildProcess | null; stop(): void;
} {
  const viaShell = process.platform === 'win32' && /\.(cmd|bat)$/i.test(bin);
  let child: ChildProcess | null = null;
  try {
    child = spawn(viaShell ? `"${bin}"` : bin, args, { cwd, env, shell: viaShell, stdio: [stdin ? 'pipe' : 'ignore', 'pipe', 'ignore'], windowsHide: true });
  } catch { child = null; }
  const stop = () => {
    if (!child || child.exitCode !== null || child.signalCode !== null) return;
    if (viaShell && child.pid) hardKillTree(child.pid);
    else { try { child.kill('SIGKILL'); } catch { /* already gone */ } }
  };
  return { child, stop };
}

/** `codex app-server` over stdio: initialize, then account/rateLimits/read and account/read.
 *  The limits' result object with the account's type and plan beside them, or null. The email in
 *  the account's answer goes no further than this function. The process is ended as soon as both
 *  answers are in; an older Codex with no account/read still gives its limits. */
export function askCodexAppServer(bin: string, env: Record<string, string>, cwd: string): Promise<unknown> {
  return new Promise((resolve) => {
    const run = runEngine(bin, ['app-server'], env, cwd, true);
    const child = run.child;
    let settled = false;
    let limits: object | null = null;
    let account: { type: unknown; planType: unknown } | null = null;
    const done = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearTimeout(grace);
      run.stop();
      resolve(limits || account ? { ...limits, account } : null);
    };
    let grace: ReturnType<typeof setTimeout> | undefined;
    const timer = setTimeout(done, RUN_TIMEOUT_MS);
    if (!child) { done(); return; }
    child.on('error', done);
    child.on('close', done);
    let buffered = '';
    let answers = 0;
    let seen = 0;
    child.stdout?.on('data', (chunk: Buffer) => {
      seen += chunk.length;
      if (seen > MAX_OUTPUT_BYTES) { done(); return; }
      buffered += chunk.toString('utf8');
      let nl: number;
      while ((nl = buffered.indexOf('\n')) !== -1) {
        const line = buffered.slice(0, nl);
        buffered = buffered.slice(nl + 1);
        let msg: { id?: unknown; result?: unknown; error?: unknown };
        try { msg = JSON.parse(line); } catch { continue; }
        if (msg.id === 2) {
          limits = !msg.error && msg.result && typeof msg.result === 'object' ? msg.result : null;
          answers += 1;
          grace = setTimeout(done, CODEX_ACCOUNT_GRACE_MS);
        } else if (msg.id === 3) {
          const a = (msg.result as { account?: { type?: unknown; planType?: unknown } } | undefined)?.account;
          account = !msg.error && a ? { type: a.type, planType: a.planType } : null;
          answers += 1;
        }
        if (answers === 2) { done(); return; }
      }
    });
    const send = (o: object) => child.stdin?.write(`${JSON.stringify(o)}\n`);
    child.stdin?.on('error', done);
    send({ id: 1, method: 'initialize', params: { clientInfo: { name: 'munder-difflin', version: '1' } } });
    send({ method: 'initialized' });
    send({ id: 2, method: 'account/rateLimits/read' });
    send({ id: 3, method: 'account/read', params: {} });
  });
}

/** `agy -p "/usage" --output-format json`: what it printed, or null. */
export function askAgyUsage(bin: string, env: Record<string, string>, cwd: string): Promise<string | null> {
  return runPrint(bin, ['-p', '/usage', '--output-format', 'json'], env, cwd, true);
}

/** `claude auth status --json`. No model turn. What it printed, signed in or not; a caller keeps only the plan and the key's kind. */
export function askClaudeAuthStatus(bin: string, env: Record<string, string>, cwd: string): Promise<string | null> {
  return runPrint(bin, ['auth', 'status', '--json'], env, cwd, false);
}

/** `opencode auth list`: the providers and their kinds. No key is printed. */
export function askOpencodeAuthList(bin: string, env: Record<string, string>, cwd: string): Promise<string | null> {
  return runPrint(bin, ['auth', 'list'], env, cwd, false);
}

/** Run an engine for what it prints, or null. `mustSucceed` drops the output of a failed exit. */
function runPrint(bin: string, args: string[], env: Record<string, string>, cwd: string, mustSucceed: boolean): Promise<string | null> {
  return new Promise((resolve) => {
    const run = runEngine(bin, args, env, cwd, false);
    const child = run.child;
    let settled = false;
    const done = (value: string | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      run.stop();
      resolve(value);
    };
    const timer = setTimeout(() => done(null), RUN_TIMEOUT_MS);
    if (!child) { done(null); return; }
    const chunks: Buffer[] = [];
    let seen = 0;
    child.stdout?.on('data', (chunk: Buffer) => {
      seen += chunk.length;
      if (seen > MAX_OUTPUT_BYTES) { done(null); return; }
      chunks.push(chunk);
    });
    child.on('error', () => done(null));
    child.on('close', (code) => done(code === 0 || !mustSucceed ? Buffer.concat(chunks).toString('utf8') : null));
  });
}
