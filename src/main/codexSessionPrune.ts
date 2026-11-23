/**
 * Old Codex conversations of the hive's own agents (0.5.6).
 *
 * Every Codex agent writes one JSONL file per conversation ("rollout"). hive.ts
 * (`exposeCodexDataDir`) moves each agent's `sessions` and `archived_sessions`
 * folders to `~/.codex/<kind>/munder-difflin/<hiveId>/<agentId>` and leaves a
 * link in the agent's CODEX_HOME. Nothing ever removed them, and one person had
 * 2.8 GB of them. This deletes an agent's FINISHED rollouts once they have not
 * changed for CODEX_SESSION_KEEP_MS.
 *
 * Deleting is the dangerous direction, so every rule below keeps a file when in
 * doubt:
 *   - only `~/.codex/sessions/munder-difflin/<this hive>/` and
 *     `~/.codex/archived_sessions/munder-difflin/<this hive>/` are walked, and
 *     every folder from `<kind>` down must be a real folder, not a link;
 *   - only a regular file named `rollout-*.jsonl` is ever a candidate; a link
 *     is never followed and never deleted;
 *   - a file changed in the last CODEX_SESSION_KEEP_MS is kept (Codex may
 *     still be writing it, or be about to resume it);
 *   - a file whose name holds the id of any agent's current registry session
 *     is kept, however old; so is the displaced session a restart would fall
 *     back to when the current one has no file (CodexPruneKeep.chains);
 *   - a file a live agent's hooks reported as its transcript is kept;
 *   - the keep list is read again for every folder, and the file is checked
 *     again right before it is removed.
 * Afterwards a date folder (`2026`, `09`, `01`) left empty is removed, unless
 * it is today's, yesterday's or tomorrow's (Codex may be creating it); an
 * agent's own folder never.
 *
 * No electron import: the main process wires it (index.ts) and the unit test
 * drives it against a temp home.
 */
import { createHash } from 'node:crypto';
import type { Dirent, Stats } from 'node:fs';
import { lstat, readdir, realpath, rmdir, unlink } from 'node:fs/promises';
import { basename, join, resolve, sep } from 'node:path';

/** A finished conversation is kept this long after its last change. */
export const CODEX_SESSION_KEEP_MS = 14 * 24 * 60 * 60 * 1000;
/** First run this long after the app starts, so a launch is never slowed. */
export const CODEX_PRUNE_FIRST_DELAY_MS = 5 * 60 * 1000;
/** Then once a day. */
export const CODEX_PRUNE_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** The two Codex folders hive.ts exposes. */
export const CODEX_PRUNE_KINDS = ['sessions', 'archived_sessions'] as const;
/** `rollout-<time>-<id>.jsonl`, as Codex names a conversation file. */
const ROLLOUT = /^rollout-[^/\\]+\.jsonl$/;
/** `<agent>/<YYYY>/<MM>/<DD>/` is depth 4; a little room, never unbounded. */
const MAX_DEPTH = 6;
/** Only a folder named like a date part (`2026`, `09`, `01`) is ever removed. */
const DATE_PART = /^\d{2,4}$/;

/** The hive's folder name under `~/.codex/<kind>/munder-difflin/`. The same
 *  formula as hive.ts `exposeCodexDataDir` (the test pins the two together). */
export function codexHiveId(hiveRoot: string): string {
  return createHash('sha1').update(hiveRoot).digest('hex').slice(0, 12);
}

/**
 * What registry.json says to keep, and the agent ids for asking the hook
 * server. One chain per agent, in the order a restart tries them
 * (hive.resumeCandidates): the current `sessionId` first, then the
 * `sessionHistory` it displaced. Throws on a registry it cannot read for sure:
 * hive.registry() answers an unreadable file with an empty registry, and an
 * empty keep list must never reach the walk.
 */
export function registryKeep(registryJson: string): { chains: string[][]; agentIds: string[] } {
  const doc = JSON.parse(registryJson) as { agents?: unknown };
  const agents = doc?.agents;
  if (!agents || typeof agents !== 'object' || Array.isArray(agents)) {
    throw new Error('registry.json has no agents table');
  }
  const chains: string[][] = [];
  const agentIds: string[] = [];
  for (const [agentId, a] of Object.entries(agents as Record<string, unknown>)) {
    agentIds.push(agentId);
    if (!a || typeof a !== 'object') continue;
    const { sessionId, sessionHistory } = a as { sessionId?: unknown; sessionHistory?: unknown };
    const chain: string[] = [];
    if (typeof sessionId === 'string' && sessionId) chain.push(sessionId);
    if (Array.isArray(sessionHistory)) {
      for (const h of sessionHistory) if (typeof h === 'string' && h && !chain.includes(h)) chain.push(h);
    }
    if (chain.length) chains.push(chain);
  }
  return { chains, agentIds };
}

/** What must survive this run, read fresh for every folder. */
export interface CodexPruneKeep {
  /**
   * Each agent's sessions in the order a restart tries them, current first.
   * The first is always kept. The rest are kept only up to the first one whose
   * file is in `sessions`: that is the one a restart resumes when the current
   * one has no file (index.ts pickResumableSession with
   * findCodexHomeForSession), and the ones after it are never reached. So a
   * conversation a clear left behind is not kept forever just for being in
   * the history.
   */
  chains: Iterable<Iterable<string | undefined | null>>;
  /** Transcript paths the agents' hooks reported. Matched by file name. */
  paths: Iterable<string | undefined | null>;
}

export interface CodexPruneInput {
  /** The person's Codex home, `~/.codex`. */
  codexHome: string;
  /** `<harnessHome>/hive`, exactly as hive.root() returns it. */
  hiveRoot: string;
  keep: () => CodexPruneKeep;
  now?: number;
  keepMs?: number;
  /** True stops the run between folders (quit, reset, home change). */
  aborted?: () => boolean;
}

export interface CodexPruneResult {
  files: number;
  bytes: number;
  dirs: number;
  /** Why a folder was not walked, when it exists but failed a gate. */
  refused: string[];
}

interface KeepSet { ids: string[]; names: Set<string> }

const UUID_TAIL = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Which session ids have a file in this hive's `sessions` folder, from the
 *  names listed once at the start of a run. A file written after that counts
 *  as missing, which only ever keeps more. */
class Present {
  private readonly ids = new Set<string>();
  private readonly names: string[] = [];
  add(name: string): void {
    const lower = name.toLowerCase();
    this.names.push(lower);
    const m = UUID_TAIL.exec(lower);
    if (m) this.ids.add(m[1]);
  }
  has(id: string): boolean {
    if (UUID.test(id)) return this.ids.has(id);
    return this.names.some((n) => n.includes(id));
  }
}

function keepSet(k: CodexPruneKeep, present: Present): KeepSet {
  const ids: string[] = [];
  for (const chain of k.chains) {
    for (const raw of chain) {
      if (typeof raw !== 'string' || !raw.trim()) continue;
      const id = raw.trim().toLowerCase();
      ids.push(id);
      if (present.has(id)) break; // a restart resumes this one; the rest are never reached
    }
  }
  const names = new Set<string>();
  for (const p of k.paths) {
    if (typeof p !== 'string' || !p) continue;
    // A hook path may use either separator (Windows); the name is what matters.
    const name = basename(p.replace(/\\/g, '/')).toLowerCase();
    if (name) names.add(name);
  }
  return { ids, names };
}

function kept(name: string, k: KeepSet): boolean {
  const lower = name.toLowerCase();
  if (k.names.has(lower)) return true;
  for (const id of k.ids) if (lower.includes(id)) return true;
  return false;
}

function within(root: string, target: string): boolean {
  const r = resolve(root);
  const t = resolve(target);
  return t.startsWith(r + sep);
}

/** A real directory (lstat: a link to one is not). */
async function plainDir(p: string): Promise<Stats | null> {
  try {
    const s = await lstat(p);
    return s.isDirectory() && !s.isSymbolicLink() ? s : null;
  } catch { return null; }
}

/** Let the main process breathe between folders. */
function yieldNow(): Promise<void> {
  return new Promise((done) => setImmediate(done));
}

function pad(n: number): string { return String(n).padStart(2, '0'); }

/** Folders for yesterday, today and tomorrow in local time and UTC. Codex may
 *  be creating one of them right now, so none is ever removed. */
function liveDateFolders(now: number): Set<string> {
  const out = new Set<string>();
  for (const t of [now - 86_400_000, now, now + 86_400_000]) {
    const d = new Date(t);
    for (const [y, m, day] of [
      [d.getFullYear(), d.getMonth() + 1, d.getDate()],
      [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()]
    ]) {
      out.add(`${y}`);
      out.add(`${y}/${pad(m)}`);
      out.add(`${y}/${pad(m)}/${pad(day)}`);
    }
  }
  return out;
}

interface Walk {
  base: string;
  input: CodexPruneInput;
  now: number;
  keepMs: number;
  live: Set<string>;
  present: Present;
  result: CodexPruneResult;
}

/** List the rollout names under `dir`, the same way the walk goes: real
 *  folders only, links skipped, depth bounded, a breath between folders. */
async function listRollouts(dir: string, depth: number, present: Present, aborted?: () => boolean): Promise<void> {
  if (aborted?.()) return;
  await yieldNow();
  let entries: Dirent[];
  try { entries = await readdir(dir, { withFileTypes: true }); }
  catch { return; }
  for (const e of entries) {
    if (e.isSymbolicLink()) continue;
    if (e.isDirectory()) {
      if (depth < MAX_DEPTH) await listRollouts(join(dir, e.name), depth + 1, present, aborted);
    } else if (e.isFile() && ROLLOUT.test(e.name)) {
      present.add(e.name);
    }
  }
}

/** `~/.codex/<kind>/munder-difflin/<hiveId>`, when it and every folder above
 *  it up to `<kind>` is a real folder. Null when missing or refused. */
async function hiveBase(home: string, kind: string, hiveId: string, refused: string[]): Promise<string | null> {
  const chain = [join(home, kind), join(home, kind, 'munder-difflin'), join(home, kind, 'munder-difflin', hiveId)];
  for (const p of chain) {
    try {
      const s = await lstat(p);
      if (!s.isDirectory() || s.isSymbolicLink()) { refused.push(`${p} is not a plain folder`); return null; }
    } catch { return null; } // missing: nothing to do
  }
  return chain[2];
}

/**
 * One folder below an agent folder (depth 1 is the agent folder itself).
 * Returns true when something inside it was removed by this run.
 */
async function walkDir(w: Walk, dir: string, rel: string[], depth: number): Promise<boolean> {
  if (w.input.aborted?.()) return false;
  await yieldNow();
  if (w.input.aborted?.()) return false;

  let entries: Dirent[];
  try { entries = await readdir(dir, { withFileTypes: true }); }
  catch { return false; }

  // Read once per folder, so an agent that resumed an old conversation a
  // moment ago is honoured without re-reading the registry for every file.
  let k: KeepSet;
  try { k = keepSet(w.input.keep(), w.present); }
  catch { return false; } // no keep list, no deleting

  let removedHere = false;
  for (const e of entries) {
    if (w.input.aborted?.()) return removedHere;
    const name = e.name;
    if (basename(name) !== name || name === '.' || name === '..') continue;
    const p = join(dir, name);
    if (!within(w.base, p)) continue;
    // Dirent types come from lstat: a link is a link here, never its target.
    if (e.isSymbolicLink()) continue;
    if (e.isDirectory()) {
      if (depth >= MAX_DEPTH) continue;
      if (await walkDir(w, p, [...rel, name], depth + 1)) removedHere = true;
      continue;
    }
    if (!e.isFile() || !ROLLOUT.test(name)) continue;
    if (kept(name, k)) continue;

    // Stat'd here, right before the removal, not when the folder was listed:
    // Codex may have written it since.
    let st: Stats;
    try { st = await lstat(p); } catch { continue; }
    if (!st.isFile() || st.isSymbolicLink()) continue;
    if (w.now - st.mtimeMs < w.keepMs) continue; // recent, or dated in the future
    try {
      await unlink(p);
      w.result.files += 1;
      w.result.bytes += st.size;
      removedHere = true;
    } catch { /* gone already, or not ours to remove: the next run tries again */ }
  }

  // An agent's own folder (depth 1) always stays; it is the link's target.
  if (depth < 2 || w.input.aborted?.()) return removedHere;
  if (!DATE_PART.test(basename(dir)) || w.live.has(rel.join('/'))) return removedHere;
  try {
    if ((await readdir(dir)).length > 0) return removedHere;
    const st = await plainDir(dir);
    if (!st) return removedHere;
    // Emptied by this run, or empty and untouched for the whole keep window.
    if (!removedHere && w.now - st.mtimeMs < w.keepMs) return removedHere;
    await rmdir(dir); // never recursive: fails if anything arrived meanwhile
    w.result.dirs += 1;
    return true;
  } catch { return removedHere; }
}

/** One pass over this hive's two Codex folders. Never throws. */
export async function pruneCodexSessions(input: CodexPruneInput): Promise<CodexPruneResult> {
  const result: CodexPruneResult = { files: 0, bytes: 0, dirs: 0, refused: [] };
  const now = input.now ?? Date.now();
  const keepMs = Math.max(input.keepMs ?? CODEX_SESSION_KEEP_MS, 0);
  if (!input.codexHome || !input.hiveRoot) return result;
  const hiveId = codexHiveId(input.hiveRoot);
  if (!/^[0-9a-f]{12}$/.test(hiveId)) return result;

  // The Codex home itself may be a link (a dotfiles setup); everything from
  // `<kind>` down must be real folders.
  let home: string;
  try { home = await realpath(input.codexHome); }
  catch { return result; }

  const bases: Array<string | null> = [];
  for (const kind of CODEX_PRUNE_KINDS) bases.push(await hiveBase(home, kind, hiveId, result.refused));

  // Which sessions have a file where a restart looks for one (`sessions`),
  // before anything is removed.
  const present = new Present();
  if (bases[0]) await listRollouts(bases[0], 0, present, input.aborted);

  const live = liveDateFolders(now);
  for (const base of bases) {
    if (!base || input.aborted?.()) continue;
    let agents: Dirent[];
    try { agents = await readdir(base, { withFileTypes: true }); }
    catch { continue; }
    for (const a of agents) {
      if (input.aborted?.()) break;
      if (!a.isDirectory() || a.isSymbolicLink()) continue;
      if (basename(a.name) !== a.name || a.name === '.' || a.name === '..') continue;
      await walkDir({ base, input, now, keepMs, live, present, result }, join(base, a.name), [], 1);
    }
  }
  return result;
}

// ─── the timer ───────────────────────────────────────────────────────────────

export interface CodexPruneSchedule {
  /** Everything a run needs, read when it starts. Null skips the run. */
  input: () => Omit<CodexPruneInput, 'aborted'> | null;
  /** Called after every run that finished without being stopped. */
  onResult: (r: CodexPruneResult) => void;
  firstDelayMs?: number;
  intervalMs?: number;
}

let firstTimer: ReturnType<typeof setTimeout> | null = null;
let dayTimer: ReturnType<typeof setInterval> | null = null;
let inFlight: Promise<CodexPruneResult | null> | null = null;
let generation = 0;

/** One run now, unless one is already going (then that run's promise). */
export function runCodexSessionPruneNow(s: CodexPruneSchedule): Promise<CodexPruneResult | null> {
  if (inFlight) return inFlight;
  const mine = generation;
  const run = (async (): Promise<CodexPruneResult | null> => {
    let input: Omit<CodexPruneInput, 'aborted'> | null;
    try { input = s.input(); } catch (e) { console.error('[codex-prune]', e); return null; }
    if (!input) return null;
    const r = await pruneCodexSessions({ ...input, aborted: () => generation !== mine });
    // A run stopped by a quit, a reset or a home change must not write into
    // whichever hive is current by now; the console still says what it did.
    if (generation !== mine) {
      if (r.files > 0) console.log(`[codex-prune] stopped early after removing ${r.files} file(s), ${r.bytes} bytes`);
      return r;
    }
    try { s.onResult(r); } catch (e) { console.error('[codex-prune]', e); }
    return r;
  })();
  const tracked: Promise<CodexPruneResult | null> = run.finally(() => {
    if (inFlight === tracked) inFlight = null;
  });
  inFlight = tracked;
  return tracked;
}

/** Arm it: once after the first delay, then daily. Re-arming is safe. */
export function startCodexSessionPrune(s: CodexPruneSchedule): void {
  stopCodexSessionPrune();
  const tick = (): void => {
    void runCodexSessionPruneNow(s).catch((e) => console.error('[codex-prune]', e));
  };
  firstTimer = setTimeout(tick, s.firstDelayMs ?? CODEX_PRUNE_FIRST_DELAY_MS);
  dayTimer = setInterval(tick, s.intervalMs ?? CODEX_PRUNE_INTERVAL_MS);
  firstTimer.unref?.();
  dayTimer.unref?.();
}

/** Clear the timers and stop a run in progress at its next folder. */
export function stopCodexSessionPrune(): void {
  generation += 1;
  if (firstTimer) { clearTimeout(firstTimer); firstTimer = null; }
  if (dayTimer) { clearInterval(dayTimer); dayTimer = null; }
}
