/**
 * HEAVY-JOB-SERIALIZE (1.1.55; god andyheavy/andyheavycfg). On 2026-09-26 the Human's PC went
 * unresponsive with several CPU/antivirus-heavy jobs running at once from different agents (an
 * npm ci + electron-rebuild, a parity replay spawning a Python process per query, full test
 * suites, mutation runs). The floor rule "one heavy job at a time" was prose only, and it was
 * broken twice. This makes it a machine lock the app enforces at the PreToolUse boundary.
 *
 *  - classifyHeavy: a pure, table-driven classifier of a tool call's command (no model).
 *  - HeavyJobLock: a counting semaphore of `limit` slots (the Settings value "Heavy jobs at once":
 *    'off' or N, default 1), held per AGENT; released by the PostToolUse of a foreground call, by
 *    the job's processes exiting (a background job; checked only while held), by the holder's PTY
 *    exiting, or by a TTL.
 * No Electron dependency: every piece is injectable, so the tests never inspect the real machine.
 */
import { execFile } from 'node:child_process';

export type HeavyKind = 'install' | 'build' | 'suite' | 'bench';
export interface HeavyClass { heavy: boolean; kind?: HeavyKind; why?: string }

/** Command-shaped tool input (the same reading as DESKTOP-LAUNCH-GUARD's). */
export function commandFromToolInput(input: unknown): string | null {
  if (typeof input === 'string') return input;
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const r = input as Record<string, unknown>;
  const v = r.command ?? r.cmd ?? r.script;
  if (Array.isArray(v) && v.every((x) => typeof x === 'string')) return (v as string[]).join(' ');
  return typeof v === 'string' ? v : null;
}

/** Split a command line into words, honouring simple quotes (not a full shell parser). */
function words(s: string): string[] {
  const out: string[] = [];
  const re = /"((?:[^"\\]|\\.)*)"|'([^']*)'|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) out.push(m[1] ?? m[2] ?? m[3]);
  return out;
}

/** The segments a shell would run: split on ; && || | and newlines, OUTSIDE quotes. */
function segments(cmd: string): string[] {
  const out: string[] = [];
  let cur = ''; let q: string | null = null;
  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i];
    if (q) { cur += c; if (c === q && cmd[i - 1] !== '\\') q = null; continue; }
    if (c === '"' || c === "'") { q = c; cur += c; continue; }
    if (c === ';' || c === '\n' || c === '|' || c === '&') {
      if (c === '&' && cmd[i + 1] !== '&' && cmd[i - 1] !== '&') { cur += ' &'; out.push(cur); cur = ''; continue; } // a lone & = background
      out.push(cur); cur = '';
      if ((c === '&' || c === '|') && cmd[i + 1] === c) i++;
      continue;
    }
    cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean);
}

const WRAPPERS = new Set(['bash', 'sh', 'zsh', 'cmd', 'cmd.exe', 'powershell', 'powershell.exe', 'pwsh', 'pwsh.exe', 'bash.exe']);
const BENCH_SCRIPT = /(mutant|mutation|replay|bench|backfill|parity|speed|stress|soak)[^\\/]*\.(c?m?js|ts)$/i;
export const SUITE_MANY_FILES = 20;
/** node flags that take their value as the NEXT argument (so that value is not a test file). */
const NODE_VALUE_FLAGS = new Set(['--test-name-pattern', '--test-skip-pattern', '--test-reporter', '--test-reporter-destination', '--test-concurrency', '--test-timeout', '--test-shard', '--import', '--require', '-r', '--loader', '--experimental-loader', '--env-file', '--conditions', '-C', '--input-type']);

/** Strip the prefixes that do not change what runs: VAR=x, env [-u X]..., timeout N, nice, cd x. */
function leading(ws: string[]): string[] {
  let i = 0;
  while (i < ws.length) {
    const w = ws[i];
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(w)) { i++; continue; }
    if (w === 'env') { i++; while (i < ws.length && (ws[i].startsWith('-') || /^[A-Za-z_][A-Za-z0-9_]*=/.test(ws[i]))) { if (ws[i] === '-u') i++; i++; } continue; }
    if (w === 'timeout' || w === 'nice') { i++; while (i < ws.length && (/^-/.test(ws[i]) || /^\d+[smhd]?$/.test(ws[i]))) i++; continue; }
    if (w === 'cd' || w === 'pushd') return []; // `cd x` alone is its own segment
    break;
  }
  return ws.slice(i);
}

function classifyWords(ws0: string[], depth: number): HeavyClass {
  const ws = leading(ws0);
  if (!ws.length) return { heavy: false };
  const bin = ws[0].replace(/\\/g, '/').split('/').pop()!.toLowerCase().replace(/\.(exe|cmd)$/, '');
  const args = ws.slice(1);
  // One level of a shell wrapper: bash -c "...", cmd /c ..., powershell -Command ...
  if (WRAPPERS.has(bin) && depth === 0) {
    // -c (sh), /c /k (cmd; Git Bash spells it //c), -Command (PowerShell)
    const k = args.findIndex((a) => /^(-c|\/\/?c|\/\/?k|-command)$/i.test(a));
    if (k >= 0) return classifyCommand(args.slice(k + 1).join(' '), depth + 1);
    return { heavy: false };
  }
  const has = (...xs: string[]): boolean => xs.some((x) => args.includes(x));
  if (bin === 'npm' || bin === 'pnpm' || bin === 'yarn') {
    const sub = args.find((a) => !a.startsWith('-')) ?? (bin === 'yarn' ? 'install' : '');
    if (sub === 'ci' || sub === 'rebuild') return { heavy: true, kind: 'install', why: `${bin} ${sub}` };
    if (sub === 'install' || sub === 'i' || sub === 'add') {
      // `npm install` with no package = a full install; with packages it is still an install
      return { heavy: true, kind: 'install', why: `${bin} ${sub}` };
    }
    if (sub === 'test' || sub === 't') return { heavy: true, kind: 'suite', why: `${bin} test` };
    if (sub === 'run' || sub === 'run-script') {
      const script = args.slice(args.indexOf(sub) + 1).find((a) => !a.startsWith('-')) ?? '';
      if (/^(build|dist)(:.*)?$/.test(script)) return { heavy: true, kind: 'build', why: `${bin} run ${script}` };
      if (/^test(:.*)?$/.test(script)) return { heavy: true, kind: 'suite', why: `${bin} run ${script}` };
    }
    return { heavy: false };
  }
  if (bin === 'npx') return classifyWords(args.filter((a) => !a.startsWith('-')), depth);
  if (bin === 'electron-rebuild' || bin === 'node-gyp') return { heavy: true, kind: 'install', why: bin };
  if (bin === 'electron-builder') return { heavy: true, kind: 'build', why: bin };
  if (bin === 'electron-vite' && has('build')) return { heavy: true, kind: 'build', why: 'electron-vite build' };
  if (bin === 'vitest') {
    const files = args.filter((a) => !a.startsWith('-') && a !== 'run');
    if (!files.length) return { heavy: true, kind: 'suite', why: 'vitest (all)' };
    return { heavy: false };
  }
  if (bin === 'node' || bin === 'electron' || bin === 'munder difflin') {
    if (args.some((a) => a.startsWith('--native-memory-bench'))) return { heavy: true, kind: 'bench', why: 'native-memory bench' };
    if (args.includes('--test')) {
      // Positional args only: the value of a flag that takes one is not a test file.
      const files: string[] = [];
      for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a.startsWith('-')) { if (NODE_VALUE_FLAGS.has(a)) i++; continue; }
        files.push(a);
      }
      if (!files.length) return { heavy: true, kind: 'suite', why: 'node --test (all)' };
      if (files.some((f) => /[*?]/.test(f) || !/\.[cm]?[jt]s$/.test(f))) return { heavy: true, kind: 'suite', why: 'node --test (a glob or a directory)' };
      if (files.length >= SUITE_MANY_FILES) return { heavy: true, kind: 'suite', why: `node --test (${files.length} files)` };
      return { heavy: false };
    }
    const script = args.find((a) => !a.startsWith('-'));
    if (script && BENCH_SCRIPT.test(script)) return { heavy: true, kind: 'bench', why: `node ${script.replace(/\\/g, '/').split('/').pop()}` };
    return { heavy: false };
  }
  return { heavy: false };
}

/** Classify a command line: heavy if ANY segment it runs is heavy. */
export function classifyCommand(cmd: string, depth = 0): HeavyClass {
  for (const seg of segments(cmd)) {
    const c = classifyWords(words(seg.replace(/\s&$/, '')), depth);
    if (c.heavy) return c;
  }
  return { heavy: false };
}

/** Classify a tool call (any provider: the command-shaped input only). */
export function classifyHeavy(_toolName: string | undefined, input: unknown): HeavyClass {
  const cmd = commandFromToolInput(input);
  return cmd ? classifyCommand(cmd) : { heavy: false };
}

/** Does this tool call leave the job running after the call returns? */
export function isBackground(input: unknown): boolean {
  if (input && typeof input === 'object' && (input as Record<string, unknown>).run_in_background === true) return true;
  const cmd = commandFromToolInput(input) ?? '';
  return /(^|[^&])&\s*$/.test(cmd.trim()) || /\bnohup\b|\bStart-Job\b|\bsetsid\b/.test(cmd);
}

// — the lock —

export type HeavyLimit = number | 'off';
/** The Settings value, normalised: 'off', or an integer 1..16 (default 1). */
export function heavyLimit(v: unknown): HeavyLimit {
  if (v === 'off' || v === false || v === 0) return 'off';
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isInteger(n) && n >= 1 ? Math.min(16, n) : 1;
}

export interface HeavyHolder {
  agentId: string;
  kind: HeavyKind;
  command: string;
  since: number;
  /** Last acquire or re-entry: the TTL runs from here. */
  touched: number;
  /** Foreground heavy calls still running (their PostToolUse releases them). */
  calls: Set<string>;
  /** A backgrounded job: released by its processes exiting (the watcher), the PTY, or the TTL. */
  background: boolean;
  /** Consecutive watcher scans that found no heavy process of this holder. */
  misses: number;
}

export interface ProcRow { pid: number; parentPid: number; commandLine: string }
export interface HeavyLockDeps {
  limit: () => HeavyLimit;
  now?: () => number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (t: unknown) => void;
  /** The PTY root pid of each agent (main's pty manager). */
  roots?: () => Array<{ agentId: string; pid: number }>;
  /** A process listing (hidden; only ever called while a background holder exists). */
  probe?: () => Promise<ProcRow[]>;
  log?: (row: Record<string, unknown>) => void;
}

export const HEAVY_TTL_MS = 60 * 60_000;
export const HEAVY_SCAN_MS = 20_000;
export const HEAVY_SCAN_MISSES = 2;

export type HeavyDecision = { allow: true; acquired: boolean } | { allow: false; reason: string; holders: HeavyHolder[] };

export class HeavyJobLock {
  private readonly holders = new Map<string, HeavyHolder>();
  private timer: unknown = null;
  private readonly now: () => number;
  private readonly setTimer: (fn: () => void, ms: number) => unknown;
  private readonly clearTimer: (t: unknown) => void;

  constructor(private readonly d: HeavyLockDeps) {
    this.now = d.now ?? Date.now;
    this.setTimer = d.setTimer ?? ((fn, ms) => { const t = setTimeout(fn, ms); (t as { unref?: () => void }).unref?.(); return t; });
    this.clearTimer = d.clearTimer ?? ((t) => clearTimeout(t as NodeJS.Timeout));
  }

  /** The current holders (fleet.json, the deny text, tests). Expired ones are released first. */
  snapshot(): Array<{ agentId: string; kind: HeavyKind; command: string; since: string; background: boolean }> {
    this.expire();
    return [...this.holders.values()].map((h) => ({ agentId: h.agentId, kind: h.kind, command: h.command, since: new Date(h.since).toISOString(), background: h.background }));
  }

  /** PreToolUse: a heavy call from `agentId`. Take a slot, share the agent's own, or deny. */
  acquire(agentId: string, cls: HeavyClass, command: string, callId: string, background: boolean): HeavyDecision {
    const limit = this.d.limit();
    if (limit === 'off' || !cls.heavy || !cls.kind) return { allow: true, acquired: false };
    this.expire();
    const mine = this.holders.get(agentId);
    if (mine) {
      // Re-entrant: an agent's heavy calls share its one slot (and refresh its TTL).
      mine.calls.add(callId); mine.background = mine.background || background; mine.touched = this.now(); mine.misses = 0;
      this.log({ kind: 'heavy-lock', action: 'reenter', agentId, heavyKind: cls.kind, command: command.slice(0, 200) });
      this.arm();
      return { allow: true, acquired: false };
    }
    if (this.holders.size >= limit) {
      const holders = [...this.holders.values()];
      const who = holders.map((h) => `${h.agentId} (${h.kind}: ${h.command.slice(0, 80)}, since ${new Date(h.since).toISOString().slice(11, 19)}Z)`).join('; ');
      const reason = `Denied by HEAVY-JOB-LOCK: the machine allows ${limit} heavy job${limit === 1 ? '' : 's'} at once and ${holders.length === 1 ? 'it is' : 'they are'} held by ${who}. Wait until a slot is released (when that job finishes, or after ${Math.round(HEAVY_TTL_MS / 60_000)} min), or ask the orchestrator. Light work (single test files, reads, edits) is not limited.`;
      this.log({ kind: 'heavy-lock', action: 'deny', agentId, heavyKind: cls.kind, command: command.slice(0, 200), holders: holders.map((h) => h.agentId), limit });
      return { allow: false, reason, holders };
    }
    this.holders.set(agentId, { agentId, kind: cls.kind, command: command.slice(0, 200), since: this.now(), touched: this.now(), calls: new Set([callId]), background, misses: 0 });
    this.log({ kind: 'heavy-lock', action: 'acquire', agentId, heavyKind: cls.kind, command: command.slice(0, 200), background, limit });
    this.arm();
    return { allow: true, acquired: true };
  }

  /** PostToolUse of a heavy call: a FOREGROUND call's job is done. The slot is freed when the
   *  agent has no foreground call left and no background job. */
  callDone(agentId: string, callId: string): void {
    const h = this.holders.get(agentId);
    if (!h || !h.calls.delete(callId)) return;
    if (!h.calls.size && !h.background) this.release(agentId, 'posttool');
  }

  /** The holder's PTY exited: its jobs are gone with it. */
  agentGone(agentId: string): void {
    if (this.holders.has(agentId)) this.release(agentId, 'pty-exit');
  }

  private release(agentId: string, reason: 'posttool' | 'process-exit' | 'pty-exit' | 'ttl'): void {
    const h = this.holders.get(agentId);
    if (!h) return;
    this.holders.delete(agentId);
    this.log({ kind: 'heavy-lock', action: 'release', agentId, heavyKind: h.kind, reason, heldMs: this.now() - h.since });
    if (!this.holders.size && this.timer) { this.clearTimer(this.timer); this.timer = null; }
  }

  private expire(): void {
    const t = this.now();
    for (const h of [...this.holders.values()]) if (t - h.touched >= HEAVY_TTL_MS) this.release(h.agentId, 'ttl');
  }

  /** The watcher runs only while a slot is held: TTL expiry for everyone, and a process check
   *  for background holders (a hidden listing every HEAVY_SCAN_MS). */
  private arm(): void {
    if (this.timer || !this.holders.size) return;
    this.timer = this.setTimer(() => { this.timer = null; void this.scan().finally(() => this.arm()); }, HEAVY_SCAN_MS);
  }

  /** One watcher tick (exported for tests). */
  async scan(): Promise<void> {
    this.expire();
    const bg = [...this.holders.values()].filter((h) => h.background);
    if (!bg.length || !this.d.probe || !this.d.roots) return;
    let procs: ProcRow[];
    try { procs = await this.d.probe(); } catch { return; }
    const parent = new Map(procs.map((p) => [p.pid, p.parentPid]));
    const rootOf = new Map(this.d.roots().map((r) => [r.pid, r.agentId]));
    const ownerOf = (pid: number): string | null => {
      const seen = new Set<number>(); let cur: number | undefined = pid;
      while (cur !== undefined && !seen.has(cur)) { seen.add(cur); const a = rootOf.get(cur); if (a) return a; cur = parent.get(cur); }
      return null;
    };
    const busy = new Set<string>();
    for (const p of procs) if (classifyCommand(p.commandLine).heavy) { const a = ownerOf(p.pid); if (a) busy.add(a); }
    for (const h of bg) {
      if (busy.has(h.agentId)) { h.misses = 0; continue; }
      h.misses++;
      if (h.misses >= HEAVY_SCAN_MISSES) { h.background = false; if (!h.calls.size) this.release(h.agentId, 'process-exit'); }
    }
  }

  private log(row: Record<string, unknown>): void { try { this.d.log?.(row); } catch { /* best effort */ } }
}

/** The default process listing: one hidden, non-interactive PowerShell CIM query (Windows only). */
export function probeProcesses(): Promise<ProcRow[]> {
  if (process.platform !== 'win32') return Promise.resolve([]);
  const script = 'Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,CommandLine | ConvertTo-Json -Compress';
  return new Promise((resolve) => execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { windowsHide: true, timeout: 10_000, maxBuffer: 16 * 1024 * 1024 }, (err, stdout) => {
    if (err || !stdout.trim()) return resolve([]);
    try {
      const rows = JSON.parse(stdout) as Array<{ ProcessId: number; ParentProcessId: number; CommandLine: string | null }>;
      resolve((Array.isArray(rows) ? rows : [rows]).filter((r) => r && Number.isInteger(r.ProcessId)).map((r) => ({ pid: r.ProcessId, parentPid: r.ParentProcessId, commandLine: r.CommandLine ?? '' })));
    } catch { resolve([]); }
  }));
}
