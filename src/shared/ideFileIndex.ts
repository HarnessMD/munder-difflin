/**
 * FINDING A FILE BY ITS NAME (0.4.9 phase 8).
 *
 * The IDE gained repo-wide CONTENT search in phase 9 of the previous pass, and
 * that is a different question from the one people ask most often. "Where is
 * IdePanel.tsx" is not answered by grepping for `IdePanel.tsx` (which finds
 * every import of it and not the file), and it is not answered by opening
 * fourteen folders in a tree. Two searches, two result shapes.
 *
 * There is no `fs:findByName` IPC and this does not invent one. The tree is
 * walked through the SAME `fs:listDir` door the file tree already uses, once,
 * into an index the query then filters in memory. That is what makes typing
 * cheap enough to debounce instead of demanding Enter: the keystroke filters an
 * array, it does not walk a disk.
 *
 * Everything here is pure. The walk takes its lister as an argument, so the
 * test drives it with a fake tree and no filesystem at all.
 */

/** One file in the index. */
export interface IndexEntry {
  /** Path relative to the workspace root. */
  rel: string;
  /** Final segment. */
  name: string;
  /** Folder part, `''` at the root. */
  dir: string;
}

export interface ListedEntry { name: string; isDir: boolean }

/** Exactly the shape of `window.cth.listDir` minus the root, which the caller
 *  has already bound. An unreadable folder answers `ok: false` and the walk
 *  steps over it rather than failing the whole index. */
export type Lister = (rel: string) => Promise<
  { ok: true; entries: ListedEntry[] } | { ok: false; error: string }
>;

/**
 * Folders that are never a person's own source and are routinely enormous.
 *
 * This list is a near-copy of SEARCH_SKIP_DIRS in `src/main/fs.ts` and that is
 * a deliberate duplication, not an oversight: this walk runs in the RENDERER
 * over an IPC door that lists one directory at a time, and main's constant is
 * private to the main bundle. The two lists answer the same question for two
 * processes. If one gains an entry, give it to the other.
 */
export const INDEX_SKIP_DIRS: ReadonlySet<string> = new Set([
  '.git', 'node_modules', 'dist', 'out', 'build', 'coverage', '.next', '.nuxt',
  '.cache', '.turbo', '.parcel-cache', '__pycache__', '.venv', 'venv',
  '.mypy_cache', '.pytest_cache', 'target', 'vendor', 'Pods', '.gradle', '.dart_tool'
]);

export interface IndexLimits {
  /** Stop indexing after this many files and say so. */
  maxFiles?: number;
  /** Stop after this many directory listings. A tree with a million folders
   *  would otherwise make a million IPC round trips. */
  maxDirs?: number;
}

export interface FileIndex {
  entries: IndexEntry[];
  /** True when a limit stopped the walk. The index is then a PREFIX of the
   *  tree, not a sample of it, which is why the walk is breadth first. */
  truncated: boolean;
  dirsScanned: number;
}

const DEFAULT_MAX_FILES = 20000;
const DEFAULT_MAX_DIRS = 4000;

/**
 * Walk the workspace BREADTH FIRST and collect every file path.
 *
 * Breadth first because the walk can be cut short, and when it is, the half we
 * kept has to be the useful half. Depth first would spend the whole budget
 * inside the first folder it entered and index nothing at the top level, so a
 * truncated index would be missing exactly the files people look for by name.
 */
export async function collectFiles(list: Lister, limits: IndexLimits = {}): Promise<FileIndex> {
  const maxFiles = Math.max(1, limits.maxFiles ?? DEFAULT_MAX_FILES);
  const maxDirs = Math.max(1, limits.maxDirs ?? DEFAULT_MAX_DIRS);
  const entries: IndexEntry[] = [];
  const queue: string[] = [''];
  const seen = new Set<string>(['']);
  let dirsScanned = 0;
  let truncated = false;

  while (queue.length) {
    if (dirsScanned >= maxDirs) { truncated = true; break; }
    const dir = queue.shift() as string;
    const res = await list(dir);
    dirsScanned++;
    if (!res.ok) continue; // an unreadable folder is not a failed index
    for (const e of res.entries) {
      const rel = dir ? `${dir}/${e.name}` : e.name;
      if (e.isDir) {
        if (INDEX_SKIP_DIRS.has(e.name)) continue;
        // One folder is queued once. This is not a symlink cycle guard and
        // does not pretend to be one: a loop through symlinks produces a fresh
        // path every time round, and the thing that actually stops it is
        // `maxDirs`. This stops a lister that repeats a name in one listing.
        if (seen.has(rel)) continue;
        seen.add(rel);
        queue.push(rel);
        continue;
      }
      if (entries.length >= maxFiles) { truncated = true; return { entries, truncated, dirsScanned }; }
      entries.push({ rel, name: e.name, dir });
    }
  }
  return { entries, truncated, dirsScanned };
}

/** One file that matched, with where it matched so the row can mark it. */
export interface NameMatch {
  rel: string;
  name: string;
  dir: string;
  /** True when the highlight indexes into `name`, false when it indexes into
   *  `dir`. The row draws those as two different pieces of text, so a single
   *  offset into `rel` would be unusable. */
  inName: boolean;
  start: number;
  length: number;
}

export interface NameResults {
  matches: NameMatch[];
  /** How many files matched in total, including the ones past the limit. */
  total: number;
  /** True when `matches` is shorter than `total`. */
  truncated: boolean;
}

export const DEFAULT_NAME_LIMIT = 60;

/**
 * Filter and rank the index for `query`.
 *
 * Substring, not fuzzy. A fuzzy matcher scores `IdePanel.tsx` as a hit for
 * `ipt` and also for four hundred other files, and the person cannot tell why
 * any of them are there. Whitespace splits the query into terms that must ALL
 * appear somewhere in the path, which is how people actually type ("ide panel",
 * "shared teams"); the first term is the one that gets highlighted.
 *
 * Ranking, best first:
 *   1. the whole name is the term
 *   2. the name starts with it
 *   3. the name contains it
 *   4. only the folder path contains it
 * then the shorter path, then alphabetically, so the order never depends on
 * the order the directories happened to be listed in.
 */
export function matchNames(
  entries: readonly IndexEntry[],
  query: string,
  limit: number = DEFAULT_NAME_LIMIT
): NameResults {
  const terms = (typeof query === 'string' ? query : '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return { matches: [], total: 0, truncated: false };

  const scored: { m: NameMatch; rank: number; at: number }[] = [];
  for (const e of entries) {
    const lowerRel = e.rel.toLowerCase();
    if (!terms.every((term) => lowerRel.includes(term))) continue;
    const head = terms[0];
    const lowerName = e.name.toLowerCase();
    const inName = lowerName.includes(head);
    const at = inName ? lowerName.indexOf(head) : e.dir.toLowerCase().indexOf(head);
    const rank = !inName ? 3
      : lowerName === head ? 0
        : at === 0 ? 1
          : 2;
    scored.push({
      // `at` can be -1 when the head term straddles the slash between folder
      // and name ("ide/panel"): the path contains it, neither piece does. The
      // row then draws no highlight rather than an invented one.
      m: { rel: e.rel, name: e.name, dir: e.dir, inName, start: at, length: at < 0 ? 0 : head.length },
      rank,
      at
    });
  }

  scored.sort((a, b) => (
    a.rank - b.rank
    || a.m.rel.length - b.m.rel.length
    || a.m.rel.localeCompare(b.m.rel)
  ));

  const cap = Math.max(1, limit);
  return {
    matches: scored.slice(0, cap).map((s) => s.m),
    total: scored.length,
    truncated: scored.length > cap
  };
}
