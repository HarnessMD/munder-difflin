/**
 * What the search store (MemPalace) indexes, and the one time rebuild (0.5.6).
 *
 * Before 0.5.6 the miner was pointed at the whole agent folder, so whatever an
 * agent put there was indexed: session logs of other engines, code checkouts,
 * a Python environment. One real store reached 3.2 GB, 385,956 chunks from
 * 28,324 files, and memory files were 2 percent of it.
 *
 * Now the store holds memory files only. `mempalace mine` takes a folder and
 * has no option that names files (read at 3.3.5: `--include-ignored` adds
 * paths, it does not limit the scan to them). An allow list in the agent
 * folder's .gitignore would do it, but that file also steers the hive's git
 * history (shared/hiveRepo.ts), and an allow list there would drop every other
 * agent file from that history. So each agent gets a small staging folder that
 * holds copies of its memory files and nothing else, and the miner is pointed
 * at that. Copies, not links: the miner skips symbolic links, and a hard link
 * would let anything that writes the staged name change the agent's own notes.
 *
 * Search output is the same as before: MemPalace prints the wing (the agent
 * id, passed with --wing) and the file name, never the folder.
 *
 * No electron import, so test/v056-palace-memory-only.test.cjs drives all of
 * it on temp folders.
 */
import {
  copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, renameSync, rmSync, unlinkSync, utimesSync,
  writeFileSync
} from 'node:fs';
import { basename, dirname, join } from 'node:path';

/** The staging folder under the hive root, one sub folder per agent id. Outside
 *  every agent folder, and on HIVE_IGNORE_LINES (shared/hiveRepo.ts) so the
 *  copies never enter the hive's git history. */
export const MINE_STAGE_DIR = '.palace-stage';

/** memory.md, memory-archive.md, the per office index memory-archive-laptop.md
 *  and memory-archive-cloud.md once an office syncs, the raw archive parts
 *  memory-archive-raw*.md (shared/memoryShape.ts), handoff.md
 *  (shared/handoff.ts) and, codex-memory.md: the copy of a Codex
 *  agent's own memories, there only while its switch is on
 *  (shared/codexMemory.ts). Exact names. */
const MEMORY_FILE = /^(?:memory|memory-archive|memory-archive-(?:laptop|cloud)|memory-archive-raw[^/\\]*|handoff|codex-memory)\.md$/;

/** True for the file names the search store indexes. A name, not a path:
 *  only the top level of an agent folder is ever looked at. */
export function isMemoryFile(name: string): boolean {
  return MEMORY_FILE.test(name);
}

export interface MemoryFile {
  name: string;
  size: number;
  mtimeMs: number;
}

/** The memory files in the top level of `agentDir`, by name. Regular files
 *  only: a folder or a link that carries one of the names is not indexed. */
export function memoryFilesOf(agentDir: string): MemoryFile[] {
  let names: string[];
  try { names = readdirSync(agentDir); } catch { return []; }
  const out: MemoryFile[] = [];
  for (const name of names.sort()) {
    if (!isMemoryFile(name)) continue;
    try {
      const st = lstatSync(join(agentDir, name));
      if (st.isFile()) out.push({ name, size: st.size, mtimeMs: st.mtimeMs });
    } catch { /* gone between the list and the stat */ }
  }
  return out;
}

/** One string that changes when a memory file is added, removed or written.
 *  The mine loop skips an agent whose string is the one it mined last. */
export function memoryFilesStamp(files: MemoryFile[]): string {
  return files.map((f) => `${f.name}:${f.size}:${f.mtimeMs}`).join('|');
}

/**
 * Is there a real folder at `path`? Asked without following a link, as
 * memoryFilesOf asks of the sources. A link or a file that has the name is
 * removed: the link itself, never what it leads to. Throws when that fails,
 * so the caller stages nothing through it.
 */
function realFolder(path: string): boolean {
  let folder: boolean;
  try { folder = lstatSync(path).isDirectory(); } catch { return false; } // nothing has the name
  if (!folder) unlinkSync(path);
  return folder;
}

/**
 * Bring `stageDir` in step with the memory files of `agentDir`: copy what is
 * new or changed, remove what is no longer a memory file of the agent. Returns
 * how many files are staged. Throws when a copy fails, so the caller does not
 * mine a half filled folder.
 *
 * A copy is given the mtime of its source. The miner skips a file whose mtime
 * it has already filed (to the millisecond), so an unchanged note is not
 * embedded again, and the same comparison tells this function a copy is
 * current. A file written while it is copied carries the older mtime, so the
 * next cycle copies and mines it again.
 *
 * `stageDir` is `<stage root>/<agent id>`. Neither name is followed when it
 * is a link: what is removed and written below would be in the folder it
 * leads to. The link goes (realFolder) and a real folder is made in its
 * place. Only a parent named MINE_STAGE_DIR is taken for the stage root.
 */
export function syncMineStage(
  agentDir: string,
  stageDir: string,
  want: MemoryFile[] = memoryFilesOf(agentDir)
): number {
  const root = dirname(stageDir);
  let have: string[] = [];
  if ((basename(root) !== MINE_STAGE_DIR || realFolder(root)) && realFolder(stageDir)) {
    try { have = readdirSync(stageDir); } catch { /* cannot be listed */ }
  }
  if (!want.length && !have.length) return 0; // nothing to stage, nothing to clear
  mkdirSync(stageDir, { recursive: true });
  const keep = new Set(want.map((f) => f.name));
  for (const name of have) {
    if (!keep.has(name)) rmSync(join(stageDir, name), { recursive: true, force: true });
  }
  for (const f of want) {
    const dst = join(stageDir, f.name);
    try {
      const st = lstatSync(dst);
      if (st.isFile() && st.size === f.size && Math.abs(st.mtimeMs - f.mtimeMs) < 1) continue;
      if (!st.isFile()) rmSync(dst, { recursive: true, force: true });
    } catch { /* not staged yet */ }
    copyFileSync(join(agentDir, f.name), dst);
    utimesSync(dst, Date.now() / 1000, f.mtimeMs / 1000);
  }
  return want.length;
}

/** Remove the staging folder of every agent whose own folder is gone, so the
 *  notes of a removed agent do not stay behind as copies. Staged copies only:
 *  nothing outside `stageRoot` is touched. A root that is a link is not
 *  listed: its names would be those of the folder it leads to. */
export function pruneMineStage(stageRoot: string, agentIds: string[]): void {
  let have: string[];
  try {
    if (!lstatSync(stageRoot).isDirectory()) return;
    have = readdirSync(stageRoot);
  } catch { return; }
  const live = new Set(agentIds);
  for (const name of have) {
    if (live.has(name)) continue;
    try { rmSync(join(stageRoot, name), { recursive: true, force: true }); }
    catch { /* locked or gone: the next pass tries again */ }
  }
}

// The one time rebuild.

/** The store from before 0.5.6 is renamed to the store path plus this. The app
 *  never deletes it: the release notes name it so the person can. */
export const PALACE_ASIDE_SUFFIX = '.pre-056';

/** The marker is a file at the store path plus this. Beside the store and not
 *  in the app config, because the store belongs to the home folder: a second
 *  home has its own store and must get its own rebuild. Outside the hive, so
 *  it is never in the hive's git history. The home move in index.ts copies it
 *  with the store. */
export const PALACE_REBUILT_SUFFIX = '.rebuilt-056';

export type PalaceRebuildState =
  | 'done'          // the marker is there: handled in an earlier run
  | 'renamed'       // the old store was moved aside, the miner fills a new one
  | 'no-store'      // nothing to move: the first store is made by this version
  | 'aside-exists'  // the new name is taken: nothing is renamed onto it
  | 'failed';       // the rename threw: the old store stays in use, no marker

export interface PalaceRebuild {
  state: PalaceRebuildState;
  /** The store path plus PALACE_ASIDE_SUFFIX. */
  aside: string;
  error?: string;
}

/** existsSync follows links; a dangling link still takes the name. */
function nameTaken(path: string): boolean {
  try { lstatSync(path); return true; } catch { return false; }
}

/**
 * Move the store from before 0.5.6 aside, once.
 *
 * The caller holds the mine loop's `mining` flag, so no mine of the app is
 * writing the store while it is renamed. Nothing is deleted and nothing is
 * renamed onto a name that exists. The marker is written in every case but a
 * failed rename, so a failure is tried again at the next launch and every
 * other outcome is final: a store this version made is never moved, also not
 * after the person removes the folder set aside.
 *
 * `rename` is a parameter so a test can make it fail.
 */
export function rebuildPalaceOnce(
  palace: string,
  rename: (from: string, to: string) => void = renameSync,
  now: Date = new Date()
): PalaceRebuild {
  const aside = palace + PALACE_ASIDE_SUFFIX;
  const marker = palace + PALACE_REBUILT_SUFFIX;
  if (existsSync(marker)) return { state: 'done', aside };

  let state: PalaceRebuildState;
  let what: string;
  if (nameTaken(aside)) {
    // Either an earlier run renamed and then could not write the marker, or
    // the name is someone else's. Both ways there is nothing to rename.
    state = 'aside-exists';
    what = `${aside} was already there, so nothing was renamed.`;
  } else if (!existsSync(palace)) {
    state = 'no-store';
    what = 'There was no store from before to set aside.';
  } else {
    try { rename(palace, aside); }
    catch (e) { return { state: 'failed', aside, error: e instanceof Error ? e.message : String(e) }; }
    state = 'renamed';
    what = `The store from before is the folder ${aside}. The app no longer uses it. It is safe to delete.`;
  }
  const body = [
    `The search store at ${palace} holds memory files only since version 0.5.6 (checked ${now.toISOString()}).`,
    what,
    'Keep this file. Without it the app sets the store aside again at its next start.',
    ''
  ].join('\n');
  try { writeFileSync(marker, body, 'utf8'); }
  catch (e) { return { state, aside, error: `marker not written: ${e instanceof Error ? e.message : String(e)}` }; }
  return { state, aside };
}
