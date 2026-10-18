/**
 * REFRESH-MODELS (1.1.73; the Human's call, god c6e41f/df3983): ONE models file, filled ONLY when the
 * user presses Settings -> Agents & Models -> "Refresh models". Every model picker reads it. The
 * hard-coded lists in the renderer are only the floor, used when the file is missing or a provider
 * could not be listed. Nothing is looked up at startup or when a picker opens.
 *
 * Per provider, measured 2026-09-28 (REFRESH-MODELS-PLAN.md):
 * - antigravity: `agy models`, one `slug<TAB>label` line per model (agy 1.2.12, no sign-in).
 *   `--model` takes the LABEL.
 * - codex: `codex debug models`, the raw catalog as JSON (codex 0.157.1). Only
 *   `visibility: "list"` models are offered; the output is ~600 KB.
 * - opencode: `opencode models`, one `provider/model` per line (documented; not installed here).
 * - claude: NO list command. The Anthropic Models API (GET /v1/models) is used ONLY when the user
 *   stored an Anthropic BYOK key. Subscription/OAuth credentials are never read. Otherwise the
 *   curated list, reported as "no list command".
 * - everyone else: not installed, or no known list command -> the floor.
 *
 * Every lookup is async: executables are resolved with `where` / `command -v` through execFile,
 * never a sync child process on main. A .cmd/.bat shim runs through cmd.exe /d /s /c with fixed
 * arguments; a path with a quote or cmd metacharacter is refused. Each run is hidden and time-boxed.
 * The file is re-validated when it is loaded (once per process, then cached; a refresh replaces the
 * cached copy with its own validated result), so a hand edit cannot put an unsafe id on a command line.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { dirname } from 'node:path';

import type { ModelEntry, ProviderStatus, ProviderModels, ModelsCatalog, ModelsRefreshRow } from '../shared/modelCatalog';
export type { ModelEntry, ProviderStatus, ProviderModels };
export type ModelsFile = ModelsCatalog;

export const MODELS_FILE_VERSION = 1;
export const LIST_TIMEOUT_MS = 20_000;
const MAX_MODELS = 64;
/** A model id goes on a command line (`--model <id>`): printable, no quotes, no shell or cmd
 *  metacharacters. `[` `]` for Claude's `[1m]`, `/` for opencode's `provider/model`, spaces and
 *  parentheses for agy's labels. */
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9 ._()/:+[\]-]{0,99}$/;
/** A label is only displayed (React escapes it); still: no control characters, bounded. */
const SAFE_LABEL = /^[^\u0000-\u001f\u007f]{1,80}$/;
const STATUSES: readonly ProviderStatus[] = ['ok', 'not-installed', 'unsupported', 'failed'];

/** Keep only well-formed, unique entries (by id), at most MAX_MODELS. Total. */
export function cleanModels(list: unknown): ModelEntry[] {
  if (!Array.isArray(list)) return [];
  const out: ModelEntry[] = [];
  const seen = new Set<string>();
  for (const m of list) {
    const id = m && typeof (m as ModelEntry).id === 'string' ? (m as ModelEntry).id.trim() : '';
    const label = m && typeof (m as ModelEntry).label === 'string' ? (m as ModelEntry).label.trim() : '';
    if (!SAFE_ID.test(id) || !SAFE_LABEL.test(label) || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, label });
    if (out.length >= MAX_MODELS) break;
  }
  return out;
}

// ── Parsers (each total: null = nothing usable) ──────────────────────────────────────────

/** "Gemini 3.8 Flash (Medium)" -> "Gemini 3.8 Flash · Med"; "(Thinking)" dropped. */
export function agyDisplayLabel(label: string): string {
  const m = /^(.*\S) \((High|Medium|Low|Thinking)\)$/.exec(label);
  if (!m) return label;
  if (m[2] === 'Thinking') return m[1];
  return /^Gemini /.test(m[1]) ? `${m[1]} · ${m[2] === 'Medium' ? 'Med' : m[2]}` : m[1];
}

export function parseAgyModels(stdout: unknown): ModelEntry[] | null {
  if (typeof stdout !== 'string') return null;
  const raw: ModelEntry[] = [];
  for (const line of stdout.split(/\r?\n/)) {
    const parts = line.split('\t');
    if (parts.length !== 2 || !/^[a-z0-9][a-z0-9._-]{0,79}$/.test(parts[0].trim())) continue;
    const id = parts[1].trim(); // the LABEL is what --model takes
    raw.push({ id, label: agyDisplayLabel(id) });
  }
  // a shortened label that collides keeps the full label
  for (const m of raw) if (raw.filter((x) => x.label === m.label).length > 1) m.label = m.id;
  const out = cleanModels(raw);
  return out.length ? out : null;
}

export function parseCodexModels(stdout: unknown): ModelEntry[] | null {
  if (typeof stdout !== 'string') return null;
  const line = stdout.split(/\r?\n/).find((l) => l.trimStart().startsWith('{'));
  if (!line) return null;
  let j: { models?: Array<{ slug?: unknown; display_name?: unknown; visibility?: unknown; priority?: unknown }> };
  try { j = JSON.parse(line); } catch { return null; }
  if (!Array.isArray(j.models)) return null;
  const listed = j.models
    .filter((m) => m && m.visibility === 'list' && typeof m.slug === 'string')
    .sort((a, b) => (typeof a.priority === 'number' ? a.priority : 999) - (typeof b.priority === 'number' ? b.priority : 999))
    .map((m) => ({ id: String(m.slug), label: typeof m.display_name === 'string' && m.display_name.trim() ? m.display_name.trim().replace(/^(GPT-[\d.]+)-/, '$1 ') : String(m.slug) }));
  const out = cleanModels(listed);
  return out.length ? out : null;
}

export function parseOpencodeModels(stdout: unknown): ModelEntry[] | null {
  if (typeof stdout !== 'string') return null;
  const raw = stdout.split(/\r?\n/).map((l) => l.trim()).filter((l) => /^[a-z0-9][a-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._:/-]*$/.test(l))
    .map((id) => ({ id, label: id }));
  const out = cleanModels(raw);
  return out.length ? out : null;
}

export function parseAnthropicModels(body: unknown): ModelEntry[] | null {
  const data = (body as { data?: Array<{ id?: unknown; display_name?: unknown; type?: unknown }> } | null)?.data;
  if (!Array.isArray(data)) return null;
  const out = cleanModels(data.filter((m) => m && typeof m.id === 'string')
    .map((m) => ({ id: String(m.id), label: typeof m.display_name === 'string' && m.display_name.trim() ? m.display_name.trim() : String(m.id) })));
  return out.length ? out : null;
}

// ── The file ─────────────────────────────────────────────────────────────────────────────

/** Re-validate a models file (shape AND every entry). Null when unusable. */
export function validModelsFile(v: unknown): ModelsFile | null {
  const f = v as { version?: unknown; refreshedAt?: unknown; providers?: unknown } | null;
  if (!f || f.version !== MODELS_FILE_VERSION || typeof f.refreshedAt !== 'number' || !f.providers || typeof f.providers !== 'object') return null;
  const providers: Record<string, ProviderModels> = {};
  for (const [id, p] of Object.entries(f.providers as Record<string, unknown>)) {
    if (!/^[a-z][a-z-]{0,30}$/.test(id) || !p || typeof p !== 'object') continue;
    const q = p as ProviderModels;
    if (!STATUSES.includes(q.status)) continue;
    const entry: ProviderModels = { status: q.status };
    if (typeof q.source === 'string') entry.source = q.source.slice(0, 80);
    if (typeof q.fetchedAt === 'number') entry.fetchedAt = q.fetchedAt;
    if (typeof q.reason === 'string') entry.reason = q.reason.slice(0, 120);
    const models = cleanModels(q.models);
    if (models.length) entry.models = models;
    if (entry.status === 'ok' && !entry.models) continue; // "ok" with nothing usable is not ok
    providers[id] = entry;
  }
  return { version: MODELS_FILE_VERSION, refreshedAt: f.refreshedAt, providers };
}

// ── Running a CLI (async only) ───────────────────────────────────────────────────────────

type ExecErr = Error & { code?: unknown; killed?: boolean };
/** child_process.execFile in the app. It returns the child (its pid is needed to kill a Windows
 *  process TREE on timeout). `timeout: 0` means no built-in timeout (the caller times the run). */
export type ModelsExec = (file: string, args: string[], opts: { timeout: number; windowsHide: true; maxBuffer: number; windowsVerbatimArguments?: boolean }, cb: (err: ExecErr | null, stdout: string) => void) => { pid?: number } | void;
export interface CliDeps {
  platform: NodeJS.Platform;
  env: NodeJS.ProcessEnv;
  exec: ModelsExec;
  exists: (p: string) => boolean;
}

/** How long a tree kill may take before the time box gives up waiting for it. */
export const TREE_KILL_TIMEOUT_MS = 10_000;

/**
 * MODELS-173-AUDIT (Dwight): on Windows the time box must end the whole PROCESS TREE. execFile's own
 * timeout kills only the direct child, and for an npm .cmd shim that is cmd.exe: its node/codex
 * descendants would keep running, orphaned. So on win32 this times the run itself; on expiry it
 * awaits `taskkill /PID <pid> /T /F` on the still-live child (the tree goes with it) and then reports a
 * timeout. Races are tolerated: the process may exit on its own first, and taskkill may fail. POSIX
 * keeps execFile's timeout.
 */
const execP = (d: CliDeps, file: string, args: string[], timeout: number, maxBuffer: number, verbatim = false): Promise<{ stdout: string } | { err: ExecErr }> =>
  new Promise((resolve) => {
    let settled = false;
    const done = (r: { stdout: string } | { err: ExecErr }): void => { if (!settled) { settled = true; resolve(r); } };
    const ownTimer = d.platform === 'win32';
    let timer: ReturnType<typeof setTimeout> | null = null;
    // Once the time box fires, the result IS a timeout: the killed process's own exit (exit 1) can
    // arrive before taskkill answers and must not be reported instead.
    let timingOut = false;
    try {
      const child = d.exec(file, args, { timeout: ownTimer ? 0 : timeout, windowsHide: true, maxBuffer, ...(verbatim ? { windowsVerbatimArguments: true } : {}) },
        (err, stdout) => { if (timer) clearTimeout(timer); if (timingOut) return; done(err ? { err } : { stdout: String(stdout) }); });
      if (ownTimer) {
        timer = setTimeout(() => {
          if (settled) return;
          timingOut = true;
          const pid = child && typeof child.pid === 'number' ? child.pid : null;
          const timedOut = Object.assign(new Error('timeout'), { killed: true }) as ExecErr;
          if (!pid) { done({ err: timedOut }); return; }
          // Await the tree kill (bounded), then report the timeout; an error or race is not fatal.
          let killDone = false;
          const finish = (): void => { if (!killDone) { killDone = true; done({ err: timedOut }); } };
          try {
            d.exec('taskkill', ['/PID', String(pid), '/T', '/F'], { timeout: TREE_KILL_TIMEOUT_MS, windowsHide: true, maxBuffer: 64 * 1024 }, () => finish());
          } catch { finish(); }
          setTimeout(finish, TREE_KILL_TIMEOUT_MS + 1000);
        }, timeout);
      }
    } catch (e) {
      if (timer) clearTimeout(timer);
      done({ err: e as ExecErr });
    }
  });

/** Where is `bin`? `where` (Windows) / `command -v` in a login shell, then the usual install dirs. */
export async function resolveCliAsync(d: CliDeps, bin: string): Promise<string | null> {
  if (!/^[a-z][a-z0-9-]{0,30}$/.test(bin)) return null;
  const pick = (out: string, last: boolean): string | null => {
    let lines = out.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (d.platform === 'win32') lines = [...lines.filter((l) => /\.(exe|cmd|bat)$/i.test(l)), ...lines.filter((l) => !/\.(exe|cmd|bat)$/i.test(l))];
    for (const p of last ? lines.reverse() : lines) if (d.exists(p)) return p;
    return null;
  };
  if (d.platform === 'win32') {
    const r = await execP(d, 'where', [bin], 3000, 64 * 1024);
    if ('stdout' in r) { const p = pick(r.stdout, false); if (p) return p; }
    const la = d.env.LOCALAPPDATA ?? ''; const ad = d.env.APPDATA ?? '';
    for (const c of [`${la}\\${bin}\\bin\\${bin}.exe`, `${ad}\\npm\\${bin}.cmd`]) if (d.exists(c)) return c;
    return null;
  }
  const r = await execP(d, d.env.SHELL || '/bin/sh', ['-lc', `command -v ${bin}`], 3000, 64 * 1024);
  if ('stdout' in r) { const p = pick(r.stdout, true); if (p) return p; }
  const home = d.env.HOME ?? '';
  for (const c of [`/opt/homebrew/bin/${bin}`, `/usr/local/bin/${bin}`, `${home}/.local/bin/${bin}`]) if (d.exists(c)) return c;
  return null;
}

function reasonOf(err: ExecErr): string {
  if (err.killed) return 'timeout';
  if (typeof err.code === 'number') return `exit ${err.code}`;
  return String(err.code ?? err.message ?? 'error').slice(0, 80);
}

/** Run `<exe> <args>` (a .cmd/.bat through cmd.exe). The args are fixed literals, never user input. */
export async function runCli(d: CliDeps, exe: string, args: string[], maxBuffer: number, timeout = LIST_TIMEOUT_MS): Promise<{ stdout: string } | { reason: string }> {
  let r;
  if (d.platform === 'win32' && /\.(cmd|bat)$/i.test(exe)) {
    if (/["%^&|<>!\r\n]/.test(exe) || args.some((a) => !/^[a-z-]+$/.test(a))) return { reason: 'unsafe-path' };
    r = await execP(d, d.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `""${exe}" ${args.join(' ')}"`], timeout, maxBuffer, true);
  } else {
    r = await execP(d, exe, args, timeout, maxBuffer);
  }
  return 'stdout' in r ? { stdout: r.stdout } : { reason: reasonOf(r.err) };
}

// ── Adapters ─────────────────────────────────────────────────────────────────────────────

export type ListResult = { status: 'ok'; models: ModelEntry[]; source: string } | { status: Exclude<ProviderStatus, 'ok'>; reason: string; source?: string };
export type Adapter = () => Promise<ListResult>;

/** A provider whose CLI can list its models. */
export function cliAdapter(d: CliDeps, bin: string, args: string[], parse: (s: unknown) => ModelEntry[] | null, maxBuffer = 256 * 1024): Adapter {
  const source = `${bin} ${args.join(' ')}`;
  return async () => {
    const exe = await resolveCliAsync(d, bin);
    if (!exe) return { status: 'not-installed', reason: `${bin} not found`, source };
    const r = await runCli(d, exe, args, maxBuffer);
    if ('reason' in r) return { status: 'failed', reason: r.reason, source };
    const models = parse(r.stdout);
    return models ? { status: 'ok', models, source } : { status: 'failed', reason: 'unparsable output', source };
  };
}

/** A provider with no list command: only tells whether it is installed. */
export function noListAdapter(d: CliDeps, bin: string): Adapter {
  return async () => ((await resolveCliAsync(d, bin))
    ? { status: 'unsupported', reason: 'no list command (built-in list kept)' }
    : { status: 'not-installed', reason: `${bin} not found` });
}

/** Claude: the Anthropic Models API, ONLY with a stored BYOK key (never subscription credentials). */
export function anthropicAdapter(getKey: () => string | undefined, fetchJson: (url: string, headers: Record<string, string>, timeoutMs: number) => Promise<{ status: number; body: unknown }>): Adapter {
  const source = 'Anthropic Models API (your API key)';
  return async () => {
    const key = getKey();
    if (!key) return { status: 'unsupported', reason: 'no list command (no Anthropic API key stored; built-in list kept)' };
    try {
      const r = await fetchJson('https://api.anthropic.com/v1/models?limit=100', { 'x-api-key': key, 'anthropic-version': '2023-06-01' }, LIST_TIMEOUT_MS);
      if (r.status !== 200) return { status: 'failed', reason: `HTTP ${r.status}`, source };
      const models = parseAnthropicModels(r.body);
      return models ? { status: 'ok', models, source } : { status: 'failed', reason: 'unparsable response', source };
    } catch (e) {
      return { status: 'failed', reason: /abort|timeout/i.test(String((e as Error)?.name ?? e)) ? 'timeout' : 'request failed', source };
    }
  };
}

// ── The store ────────────────────────────────────────────────────────────────────────────

export type RefreshRow = ModelsRefreshRow;

export class ProviderModelStore {
  private file: ModelsFile | null = null;
  private loaded = false;
  private running: Promise<{ file: ModelsFile; rows: RefreshRow[] }> | null = null;

  constructor(private readonly deps: { path: string; now: () => number; log?: (row: Record<string, unknown>) => void }) {}

  /** The validated file, or null. A FILE READ only (once per process); never a lookup. */
  read(): ModelsFile | null {
    if (!this.loaded) {
      this.loaded = true;
      try { if (existsSync(this.deps.path)) this.file = validModelsFile(JSON.parse(readFileSync(this.deps.path, 'utf8'))); } catch { this.file = null; }
    }
    return this.file;
  }

  isRefreshing(): boolean { return this.running !== null; }

  /** The button: run every adapter in parallel, merge, write atomically, log one row. One at a time. */
  refresh(adapters: Record<string, Adapter>): Promise<{ file: ModelsFile; rows: RefreshRow[] }> {
    if (this.running) return this.running;
    this.running = (async () => {
      try {
        const prev = this.read();
        const ids = Object.keys(adapters);
        const results = await Promise.all(ids.map(async (id) => {
          const t0 = this.deps.now();
          let r: ListResult;
          try { r = await adapters[id](); } catch { r = { status: 'failed', reason: 'error' }; }
          return { id, r, ms: this.deps.now() - t0 };
        }));
        const providers: Record<string, ProviderModels> = {};
        const rows: RefreshRow[] = [];
        for (const { id, r, ms } of results) {
          const before = prev?.providers[id];
          const beforeIds = new Set((before?.status === 'ok' || before?.status === 'failed' ? before.models ?? [] : []).map((m) => m.id));
          if (r.status === 'ok') {
            providers[id] = { status: 'ok', source: r.source, fetchedAt: this.deps.now(), models: r.models };
            const now = new Set(r.models.map((m) => m.id));
            rows.push({ provider: id, status: 'ok', count: r.models.length, added: r.models.map((m) => m.id).filter((x) => !beforeIds.has(x)), removed: [...beforeIds].filter((x) => !now.has(x)), ms });
          } else if (r.status === 'failed' && before?.models?.length) {
            // A failed run keeps the last good list (the pickers keep using it).
            providers[id] = { status: 'failed', source: r.source ?? before.source, fetchedAt: before.fetchedAt, models: before.models, reason: r.reason };
            rows.push({ provider: id, status: 'failed', count: before.models.length, added: [], removed: [], reason: r.reason, keptLast: true, ms });
          } else {
            providers[id] = { status: r.status, reason: r.reason, ...(r.source ? { source: r.source } : {}) };
            rows.push({ provider: id, status: r.status, count: 0, added: [], removed: [], reason: r.reason, ms });
          }
        }
        const file: ModelsFile = { version: MODELS_FILE_VERSION, refreshedAt: this.deps.now(), providers };
        try {
          mkdirSync(dirname(this.deps.path), { recursive: true });
          const tmp = `${this.deps.path}.tmp`;
          writeFileSync(tmp, JSON.stringify(file, null, 1));
          renameSync(tmp, this.deps.path);
        } catch { /* the in-memory copy still serves this run */ }
        this.file = file;
        this.loaded = true;
        try {
          this.deps.log?.({ kind: 'models-refresh', providers: Object.fromEntries(rows.map((x) => [x.provider, { status: x.status, count: x.count, added: x.added.length, removed: x.removed.length, ...(x.reason ? { reason: x.reason } : {}) }])) });
        } catch { /* diagnostics */ }
        return { file, rows };
      } finally {
        this.running = null;
      }
    })();
    return this.running;
  }
}

/** Which providers the button queries, and how (the app's wiring). */
export function defaultAdapters(d: CliDeps, getAnthropicKey: () => string | undefined, fetchJson: Parameters<typeof anthropicAdapter>[1]): Record<string, Adapter> {
  return {
    claude: anthropicAdapter(getAnthropicKey, fetchJson),
    codex: cliAdapter(d, 'codex', ['debug', 'models'], parseCodexModels, 4 * 1024 * 1024),
    antigravity: cliAdapter(d, 'agy', ['models'], parseAgyModels),
    opencode: cliAdapter(d, 'opencode', ['models'], parseOpencodeModels, 1024 * 1024),
    gemini: noListAdapter(d, 'gemini'),
    grok: noListAdapter(d, 'grok'),
    kimi: noListAdapter(d, 'kimi'),
    qwen: noListAdapter(d, 'qwen'),
    crush: noListAdapter(d, 'crush'),
    pi: noListAdapter(d, 'pi'),
    copilot: noListAdapter(d, 'copilot'),
    cursor: noListAdapter(d, 'cursor-agent')
  };
}
