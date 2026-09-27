/**
 * Hive git hygiene: what the hive repo is allowed to version, and how it stops
 * versioning what it should never have taken.
 *
 * WHY THIS MODULE EXISTS. The hive is a git repo the main process commits to on
 * every mutation, with `git add -A`. That is fine for the ledgers it was built
 * for (registry, board, tasks, memory) and catastrophic for anything large or
 * machine generated, because every commit stores a fresh copy of the whole
 * file. Three shapes have been seen in the wild:
 *
 *   1. An append only log. `cost-ledger.jsonl` and `log.jsonl` gain a row per
 *      event, so a few thousand commits behind a quarter gigabyte ledger is
 *      hundreds of gigabytes of blob.
 *   2. A tool's private state. A Codex worker's CODEX_HOME lives inside its
 *      agent dir and fills with session transcripts and an 80MB+ sqlite. Twenty
 *      of them took one hive's .git to 7.5GB, at which point git's own auto gc
 *      tried to repack it, took 22GB of RAM, and the machine swapped.
 *   3. Build output. An agent that runs `npm install` in a shared folder puts
 *      the whole tree into hive history, and every reinstall adds another copy.
 *      One live hive had 29,155 tracked files under shared node_modules, a 72MB
 *      chrome headless shell and several video renders.
 *
 * WHY THE PREVIOUS FIX DID NOT WORK. Both earlier passes added a .gitignore
 * line and then tried to drop the path from the index, because git goes on
 * recording a file it already tracks no matter what .gitignore says. The ignore
 * half worked. The untrack half was written as the pathspec `agents/*.codex`
 * with a slash in it, and a git pathspec containing a wildcard does NOT do the
 * leading directory match a literal pathspec does: it matched the directory and
 * nothing under it, so `ls-files` returned zero, the probe read that as "clean"
 * and returned. On the hive that produced this module the Codex sqlite files
 * were still tracked with the fix shipped and running, and `log.jsonl`, ignored
 * since 0.4.10, had never been dropped from the index at all: 190MB of packed
 * history and still growing. A fix that reads as a fix while the repo goes on
 * growing is worse than no fix, because nobody looks again.
 *
 * SO THE UNTRACK IS NOT A PATH LIST ANY MORE. It asks git the one question that
 * cannot go stale: which tracked files do the ignore rules say to ignore
 * (`ls-files --cached --ignored`). Every rule in every .gitignore in the tree is
 * honoured, including the per agent ones, so a rule added later needs no second
 * edit here, and no pathspec is written by hand.
 *
 * AND A SIZE CEILING CATCHES WHAT NO LIST FORESAW. A name list always lags the
 * next tool. Before each commit, any UNTRACKED file over the cap gets its own
 * anchored ignore line instead of a place in history. Untracked only: a file
 * already in the repo keeps its history, so a long memory.md is never dropped.
 *
 * Nothing here deletes anything. Every file stays on disk exactly where it was,
 * so `codex --resume`, the cost history and the logs all keep working. Only
 * their versioning stops.
 */

/** Runs a git command in the hive root. Returns ok=false rather than throwing. */
export type GitRun = (
  args: string[],
  opts?: { timeoutMs?: number; input?: string }
) => { ok: boolean; out: string; err: string };

/** The filesystem calls the hygiene pass needs, injected so a test can watch. */
export interface RepoFs {
  read(path: string): string | null;
  write(path: string, body: string): void;
  /** Size in bytes, or null when the path is missing or not a regular file. */
  sizeOf(path: string): number | null;
}

/**
 * Ignore rules for the hive root.
 *
 * The first group is churn: files the app rewrites constantly.
 *   fleet.json        live snapshot, rewritten every beat
 *   hooks.sock        a socket, never content
 *   cost-ledger.jsonl append only, one row per usage sample
 *   log.jsonl         append only, one row per routed message
 *   crashes/          raw PTY output from an abnormal exit. DELIBERATELY out:
 *                     it is whatever the provider printed, which can carry a
 *                     token or a prompt fragment, and a hive commit is forever.
 *
 * The second group is machine generated trees. These are never hand written
 * deliverables, so ignoring them costs nothing, and each one has been seen in a
 * real hive. A trailing slash with no other slash in the line matches the
 * directory at ANY depth, which is what we want: they turn up under shared
 * work, not at the root.
 */
export const HIVE_IGNORE_LINES: string[] = [
  'fleet.json',
  'hooks.sock',
  // 0.5.3, B23: which floor process has this hive open (floorLock.ts). Live
  // state like hooks.sock, and a committed copy would claim a pid forever.
  '.floor-lock',
  'cost-ledger.jsonl',
  'log.jsonl',
  '.DS_Store',
  'crashes/',
  'node_modules/',
  '.npm-cache/',
  '.yarn/cache/',
  '.pnpm-store/',
  '.venv/',
  '__pycache__/',
  '.pytest_cache/',
  '.turbo/',
  '.next/',
  '.gradle/',
  '.remotion/',
];

/** Ignore rules for an agent dir. `.codex/` is the load bearing one: see the
 *  module header, shape 2. The rest keep `mempalace mine` off non memory files. */
export const AGENT_IGNORE_LINES: string[] = [
  'settings.json',
  'cursor.json',
  'inbox/',
  'outbox/',
  '.codex/',
];

/** An untracked file bigger than this is ignored rather than committed.
 *  10MB is above every ledger and memory file a hive has produced and below
 *  every accident: the smallest thing the size guard is here for was a 25MB
 *  video render, the largest an 80MB sqlite. */
export const OVERSIZE_CAP_BYTES = 10 * 1024 * 1024;

/** How long the one time index rewrite may take. The normal git timeout is
 *  eight seconds, which is not enough to drop thirty thousand paths. */
export const UNTRACK_TIMEOUT_MS = 120_000;

/**
 * Merge `want` into an existing .gitignore body. Returns the new body, or null
 * when every wanted line is already present, so the caller can skip the write.
 * Append only: an entry the user added by hand is never removed or reordered.
 */
export function mergeIgnoreLines(existing: string, want: string[]): string | null {
  const have = new Set(existing.split('\n').map((l) => l.trim()));
  const missing = want.filter((w) => !have.has(w));
  if (missing.length === 0) return null;
  const prefix = existing && !existing.endsWith('\n') ? existing + '\n' : existing;
  return prefix + missing.join('\n') + '\n';
}

/**
 * A .gitignore line matching exactly one path and nothing else.
 *
 * Anchored with a leading slash so `shared/out.mp4` cannot also silence a file
 * of that name somewhere else, and every character gitignore treats as syntax
 * is escaped: a backslash, a glob character, a leading `#` (comment) or `!`
 * (negation), and a trailing space (stripped unless escaped).
 */
export function ignoreLineFor(relPath: string): string {
  let out = '';
  for (const ch of relPath.replace(/^\/+/, '')) {
    out += ch === '\\' || ch === '*' || ch === '?' || ch === '[' || ch === ']' ? '\\' + ch : ch;
  }
  if (out.startsWith('#') || out.startsWith('!')) out = '\\' + out;
  if (out.endsWith(' ')) out = out.slice(0, -1) + '\\ ';
  return '/' + out;
}

/** Split a NUL terminated git list. Empty in, empty out. */
function nulList(out: string): string[] {
  return out.split('\0').filter((s) => s.length > 0);
}

/**
 * Drop from the index every tracked file the ignore rules say to ignore.
 *
 * `core.excludesFile=` is emptied for the query on purpose. `--exclude-standard`
 * otherwise folds in the user's GLOBAL gitignore, and a person whose global file
 * says `*.md` would be asking this pass to untrack every memory file in the
 * hive. Measured on git 2.50, ls-files does not in fact report a TRACKED file as
 * ignored on a global rule alone, so today the override changes nothing. It
 * stays because that is an observed behaviour and not a promise, and the cost of
 * being wrong about it is a person's notes falling out of their history. Only
 * the repo's own rules decide.
 *
 * The paths are handed back through `--pathspec-from-file` with `:(literal)`
 * magic, which is both the way to pass thirty thousand of them without an argv
 * limit and the reason no glob can be misread. Files are removed from the index
 * only; `--cached` leaves every one of them on disk.
 */
export function untrackIgnored(run: GitRun): { paths: string[]; ok: boolean } {
  const listed = run(
    ['-c', 'core.excludesFile=', 'ls-files', '-z', '--cached', '--ignored', '--exclude-standard'],
    { timeoutMs: UNTRACK_TIMEOUT_MS }
  );
  if (!listed.ok) return { paths: [], ok: false };
  const paths = nulList(listed.out);
  if (paths.length === 0) return { paths: [], ok: true };
  const input = paths.map((p) => ':(literal)' + p).join('\0') + '\0';
  const removed = run(
    ['rm', '--cached', '-q', '--ignore-unmatch', '-r', '--pathspec-from-file=-', '--pathspec-file-nul'],
    { timeoutMs: UNTRACK_TIMEOUT_MS, input }
  );
  return { paths, ok: removed.ok };
}

/**
 * Give every untracked file over `cap` its own ignore line, before `git add -A`
 * can put it in history. Returns the paths newly ignored, for the caller to log.
 *
 * `--others --exclude-standard` is exactly the set `add -A` is about to take,
 * so the cost is proportional to the work being done: a quiet hive lists a
 * handful of files, and the one case where it lists thousands is the case where
 * thousands were about to be committed.
 */
export function ignoreOversized(
  run: GitRun,
  fs: RepoFs,
  root: string,
  join: (a: string, b: string) => string,
  cap: number = OVERSIZE_CAP_BYTES
): string[] {
  const listed = run(['ls-files', '-z', '--others', '--exclude-standard']);
  if (!listed.ok) return [];
  const over: string[] = [];
  for (const rel of nulList(listed.out)) {
    const size = fs.sizeOf(join(root, rel));
    if (size !== null && size > cap) over.push(rel);
  }
  if (over.length === 0) return [];
  const path = join(root, '.gitignore');
  const merged = mergeIgnoreLines(fs.read(path) ?? '', over.map(ignoreLineFor));
  if (merged === null) return [];
  fs.write(path, merged);
  return over;
}

/** Past this, the repo is worth compacting and a gc on it is worth bounding.
 *  Two gigabytes is far above any hive that only ever held its ledgers and far
 *  below the sizes that brought this in: 7.5GB of Codex sqlite, and user
 *  reports of 200GB and up. */
export const REPO_SIZE_WARN_BYTES = 2 * 1024 * 1024 * 1024;

/** Bytes git is holding for this repo: loose objects, packs and garbage.
 *  `count-objects -v` reports KiB, one number per line. Returns null when git
 *  cannot answer rather than a zero that would read as a small repo. */
export function packedBytes(run: GitRun): number | null {
  const res = run(['count-objects', '-v']);
  if (!res.ok) return null;
  let total = 0;
  let sawOne = false;
  for (const line of res.out.split('\n')) {
    const m = /^(size|size-pack|size-garbage): (\d+)$/.exec(line.trim());
    if (m) { total += Number(m[2]) * 1024; sawOne = true; }
  }
  return sawOne ? total : null;
}

/**
 * Bound what git's own auto gc may spend on this repo.
 *
 * A hive that has already grown large is the one case where a routine gc hurts
 * most: repacking 7.5GB of Codex sqlite revisions took 22GB of RAM and swapped
 * the machine. These two settings cap the delta window and stop pack objects
 * running one thread per core, which trades a slower repack for one that
 * finishes. Repo local, so nothing outside the hive is touched. Written once at
 * init; `--replace-all` keeps it idempotent.
 */
export function boundGcMemory(run: GitRun): void {
  run(['config', '--replace-all', 'pack.windowMemory', '128m']);
  run(['config', '--replace-all', 'pack.packSizeLimit', '1g']);
  run(['config', '--replace-all', 'pack.threads', '1']);
}
