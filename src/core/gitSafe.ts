/**
 * GIT IN A FOLDER SOMEBODY ELSE PREPARED.
 *
 * Git reads `.git/config` of the folder it runs in, and many settings there
 * name a program git then runs. An agent can write that file from its
 * sandbox, and a person can open a folder that someone else prepared. A `git status` the app runs must not run what that file says.
 *
 * Every git (and gh, which runs git) the app starts goes through `safeGit`.
 *
 *  1. ONLY NAMED COMMANDS. The sub commands the app runs are listed
 *     (`GIT_COMMANDS`), each with the flags that are always added. Any other
 *     sub command is refused, so a new caller is reviewed before it runs.
 *
 *  2. THE REPOSITORY IS FOUND BY THE APP, NOT BY GIT. `findRepo` walks up
 *     from the real path of the folder to a `.git`. A `.git` that is a link
 *     is refused. A `.git` FILE must be a linked work tree whose repository
 *     points back at it, or a sub module inside a repository above it; any
 *     other pointer is refused. No repository: the answer is "not a git
 *     repository" and git is not started at all.
 *
 *  3. A PRIVATE COPY OF THE CONFIG, BY ALLOW LIST. The repository's config
 *     file is read by name (`git config --file`, which runs nothing and
 *     follows no include), the keys on the allow list
 *     (src/shared/gitConfigAllow.ts) are written to a file in a folder only
 *     the app's own user can write (under the app's data folder, which no
 *     agent sandbox mounts; see `setGitPrivateRoot`), and git runs with THAT folder as
 *     `GIT_COMMON_DIR`, `GIT_DIR` and `GIT_WORK_TREE` set by name. The other
 *     entries of the folder are links to the real objects and refs. The run
 *     never opens the file an agent can write: a change made between the
 *     read and the run changes nothing. `info/attributes` is not carried
 *     over either.
 *
 *  4. THE ENVIRONMENT. Every `GIT_*` name the app was started with is
 *     dropped. `GIT_ALLOW_PROTOCOL=""` (no transport at all),
 *     `GIT_NO_LAZY_FETCH=1`, `GIT_TERMINAL_PROMPT=0`, `GIT_ASKPASS=""`,
 *     `GIT_LFS_SKIP_SMUDGE=1` (Git LFS reads `.lfsconfig` from the work tree
 *     and would fetch from an address a client chose; the app's own switch
 *     therefore leaves LFS POINTER files, which is accepted for the app's
 *     git), and the fixed switches
 *     as command scope config, which also reach a git that gh starts:
 *     no file monitor, no hooks, no signature check, no descent into sub
 *     modules, no bare repository found by walking, no automatic maintenance, no clean
 *     up left running in the background.
 *
 *  5. NO GIT INSIDE A NESTED REPOSITORY. A child git started inside a nested
 *     repository would run under THAT folder's config. `status` and `diff`
 *     carry `--ignore-submodules=all`; `switch` is quiet (its summary is
 *     what starts a child). In the hive, a nested repository is never
 *     recorded at all: any gitlink is taken out of the index before and
 *     after an `add`, by plumbing that starts no child.
 *
 *  6. IT FAILS CLOSED. Anything that cannot be read, made or checked refuses
 *     the call.
 *
 *  7. GIT AND GH ARE STARTED BY FULL PATH, found once on PATH (absolute
 *     folders only). A bare name on Windows is looked for in the folder the
 *     process starts in first; a path inside the work tree is refused.
 *
 * THE FIXED SWITCHES ARE A SECOND LAYER. The allow list already keeps every
 * key they set out of the copy of the REPOSITORY's config. What they add:
 * they also beat the person's global and the system config (fsmonitor,
 * hooks, pager, credential helper, attributes file, askpass), they reach a
 * git that gh starts, and they hold if a key is ever allowed by mistake.
 *
 * KNOWN GAP: a write to the real config (`git config --file`, and the
 * upstream a switch records) checks that the file is a plain file, then git
 * writes it by name. Somebody who swaps the file for a link between the two
 * has git write through the link. The write is one allowed key with a
 * checked value, so what can be written elsewhere is that line.
 *
 * The system and the person's global config are otherwise left as they are.
 * Nothing of the repository's own config that names a program is ever in
 * the copy.
 */
import { spawn, spawnSync } from 'node:child_process';
import { chmodSync, closeSync, constants, copyFileSync, fstatSync, lstatSync, mkdirSync, mkdtempSync, openSync, readdirSync, readFileSync, readSync, realpathSync, renameSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { devNull, tmpdir } from 'node:os';
import { basename, delimiter, dirname, isAbsolute, join, resolve, sep } from 'node:path';
import { GIT_CONFIG_ALLOW, gitConfigAllowed, gitConfigKeyKnown, parseConfigList, privateConfigText } from '../shared/gitConfigAllow';
import { isTempAgentId } from '../shared/tempAgent';

/**
 * WHERE THE PRIVATE FOLDERS ARE MADE. The main process sets it to a folder
 * under the app's data folder. Not the system temp folder: an agent
 * that can write there could add to a private config between its making and
 * the run. Unset (a test, a script), a folder of this process's own is made
 * in the temp folder.
 */
let privateRootSource: (() => string) | null = null;
let privateRootReady: string | null = null;
export function setGitPrivateRoot(root: string | (() => string) | null): void {
  privateRootSource = root === null ? null : typeof root === 'string' ? () => root : root;
  privateRootReady = null;
}
/** Folders of runs that never ended (a crash) are removed after this long. */
const STALE_PRIVATE_MS = 6 * 60 * 60 * 1000;
/** The temp folders this process made with no root set (a test, a script), removed when it ends: one a
 *  process was left behind in the temp folder before. */
const ownTempRoots: string[] = [];
function removeOwnTempRoots(): void {
  for (const dir of ownTempRoots.splice(0)) {
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* left to the system's temp sweep */ }
  }
}
/** The folder, made for this user alone. Throws when it cannot be. */
export function gitPrivateRoot(): string {
  if (privateRootReady) return privateRootReady;
  let dir: string;
  if (privateRootSource) {
    dir = privateRootSource();
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    if (!lstatSync(dir).isDirectory()) throw new Error('the private git folder is not a folder');
    if (process.platform !== 'win32') chmodSync(dir, 0o700);
    for (const name of readdirSync(dir)) {
      if (!name.startsWith('md-git-')) continue;
      try { if (Date.now() - lstatSync(join(dir, name)).mtimeMs > STALE_PRIVATE_MS) rmSync(join(dir, name), { recursive: true, force: true }); } catch { /* next time */ }
    }
  } else {
    dir = mkdtempSync(join(tmpdir(), 'md-git-root-'));
    if (ownTempRoots.push(dir) === 1) process.once('exit', removeOwnTempRoots);
  }
  privateRootReady = realpathSync(dir);
  return privateRootReady;
}

/**
 * The full path of git or gh, found on PATH. Only absolute folders of PATH
 * are looked in (an empty entry or `.` means the current folder). Kept per
 * PATH value: the app learns its PATH from the login shell after start.
 * Null when it is not installed.
 */
const resolvedPrograms = new Map<string, string | null>();
export function resolveProgram(name: 'git' | 'gh', env: NodeJS.ProcessEnv = process.env): string | null {
  const win = process.platform === 'win32';
  const PATH = env.PATH ?? env.Path ?? '';
  const key = name + '\0' + PATH;
  const known = resolvedPrograms.get(key);
  if (known !== undefined) return known;
  let found: string | null = null;
  for (const dir of PATH.split(delimiter)) {
    if (!dir || !isAbsolute(dir)) continue;
    for (const ext of win ? ['.exe', '.com'] : ['']) {
      const p = join(dir, name + ext);
      try { const st = statSync(p); if (st.isFile() && (win || (st.mode & 0o111) !== 0)) { found = p; break; } } catch { /* not here */ }
    }
    if (found) break;
  }
  resolvedPrograms.set(key, found);
  return found;
}
/** Is `file` inside `folder` (both taken as real paths)? */
function insideFolder(file: string, folder: string): boolean {
  const f = real(file) ?? file;
  return f === folder || f.startsWith(folder.endsWith(sep) ? folder : folder + sep);
}

/** A path where no hook can be: `/dev/null` cannot hold a file. On Windows a
 *  name inside a folder made for this process alone, never created. */
let noHooks: string | null = null;
export function emptyHooksDir(): string {
  if (process.platform !== 'win32') return '/dev/null';
  if (!noHooks) noHooks = join(mkdtempSync(join(gitPrivateRoot(), 'md-git-')), 'no-hooks');
  return noHooks;
}

/** The fixed switches: command scope config, which beats every config file. */
export function gitFixedConfig(): Array<[string, string]> {
  return [
    ['core.fsmonitor', 'false'],
    ['core.hooksPath', emptyHooksDir()],
    ['log.showSignature', 'false'],
    ['submodule.recurse', 'false'],
    ['diff.ignoreSubmodules', 'all'],
    ['safe.bareRepository', 'explicit'],
    ['maintenance.auto', 'false'],
    // Nothing of a run may outlive it: the private folder is removed when
    // the run is over, and a clean up left in the background would lose it.
    ['gc.autoDetach', 'false'],
    // The person's own global config is theirs, but the app's git runs unseen:
    // it must not page, ask for a password through a program, hand a
    // credential to a helper, or take filters from a global attributes file.
    ['core.pager', 'cat'],
    ['core.askPass', ''],
    ['credential.helper', ''],
    ['core.attributesFile', devNull]
  ];
}

/** The same as `-c key=value` pairs. */
export function gitSafeArgs(): string[] {
  return gitFixedConfig().flatMap(([k, v]) => ['-c', `${k}=${v}`]);
}

/**
 * The environment for a git, or a gh, the app starts: the caller's with every
 * `GIT_*` name dropped, the transports and prompts off, and the fixed
 * switches as config (`GIT_CONFIG_COUNT`), so they reach a git that another
 * program (gh) starts too.
 */
export function gitSafeEnv(base: NodeJS.ProcessEnv = process.env, more: Record<string, string> = {}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [k, v] of Object.entries(base)) if (!/^GIT_/i.test(k)) env[k] = v;
  env.GIT_ALLOW_PROTOCOL = '';
  env.GIT_NO_LAZY_FETCH = '1';
  env.GIT_TERMINAL_PROMPT = '0';
  env.GIT_ASKPASS = '';
  env.GIT_LFS_SKIP_SMUDGE = '1';
  const fixed = gitFixedConfig();
  env.GIT_CONFIG_COUNT = String(fixed.length);
  fixed.forEach(([k, v], i) => { env[`GIT_CONFIG_KEY_${i}`] = k; env[`GIT_CONFIG_VALUE_${i}`] = v; });
  return { ...env, ...more };
}

/**
 * The sub commands the app runs, and the flags each always gets. `hive`: only
 * the hive's own git may run it (the app commits in nobody else's
 * repository). `temp`: also, or only, in a work tree the app made for a temp,
 * in the one form its teardown runs (`isTempWorktree`, `tempFormOk`). Anything
 * not here is refused.
 */
export const GIT_COMMANDS: Record<string, { flags: string[]; hive?: true; temp?: true }> = {
  status: { flags: ['--ignore-submodules=all'] },
  // No external diff program, the person's global `diff.external` included.
  diff: { flags: ['--ignore-submodules=all', '--no-ext-diff'] },
  // Quiet: the summary a switch prints is what starts a child git inside a
  // nested repository.
  switch: { flags: ['-q', '--no-recurse-submodules'] },
  reset: { flags: ['-q', '--no-recurse-submodules'] },
  log: { flags: ['--no-ext-diff'] },
  show: { flags: ['--no-ext-diff'] },
  'rev-parse': { flags: [] },
  'rev-list': { flags: [] },
  branch: { flags: [] },
  'for-each-ref': { flags: [] },
  'merge-base': { flags: [] },
  'diff-tree': { flags: [] },
  'cat-file': { flags: [] },
  // Reads one folder's own listing: what a name in it is (a file, a folder), without reading the thing named.
  'ls-tree': { flags: [] },
  'ls-files': { flags: [] },
  'count-objects': { flags: [] },
  'update-index': { flags: [] },
  worktree: { flags: [] },
  config: { flags: [] },
  add: { flags: [], hive: true, temp: true },
  commit: { flags: [], hive: true, temp: true },
  rm: { flags: [], hive: true },
  gc: { flags: [], hive: true },
  reflog: { flags: [], hive: true },
  // The committer a temp's teardown commit is made as: the person's own when
  // one is set (main/git.ts commitAllInWorktree).
  var: { flags: [], temp: true }
};

/**
 * `git init` of a new hive. Only where NOTHING named `.git` is: a `.git`
 * that is a link, a dangling one included, would have git make a repository
 * at a place somebody else chose. No template (`--template=`), so neither a
 * hook nor a config comes from a template folder a config names. False when
 * nothing was made. With `firstCommit`, one empty commit with that message
 * follows, with no hook (a project folder the app makes in the hive,
 * core/hiveProjects.ts: a work tree can be made of it), and false
 * when that commit failed.
 */
export function gitInitSync(cwd: string, baseArgs: string[] = [], firstCommit?: string): boolean {
  try { lstatSync(join(cwd, '.git')); return false; } catch { /* nothing there: go on */ }
  const git = resolveProgram('git');
  if (!git || insideFolder(git, real(cwd) ?? cwd)) return false;
  const r = spawnSync(git, [...gitSafeArgs(), ...baseArgs, 'init', '-q', '--template='], { cwd, env: gitSafeEnv(), encoding: 'utf8', timeout: 8000 });
  if (r.status !== 0 || firstCommit === undefined) return r.status === 0;
  const c = spawnSync(git, [...gitSafeArgs(), ...baseArgs, 'commit', '-q', '--allow-empty', '--no-verify', '-m', firstCommit], { cwd, env: gitSafeEnv(), encoding: 'utf8', timeout: 8000 });
  return c.status === 0;
}

/** The `worktree` actions the app runs. `remove` only with `--force`: without
 *  it git starts a `git status` of its own inside the work tree. */
function worktreeOk(rest: string[]): boolean {
  const action = rest.find((a) => !a.startsWith('-'));
  if (action === 'add' || action === 'list') return true;
  return action === 'remove' && rest.includes('--force');
}

/** `ls-tree` in the one form the app runs: one folder's own listing, from
 *  the top of the repository whatever folder the call is in, for one name
 *  taken letter for letter. No other flag reaches it. */
function lsTreeOk(rest: string[]): boolean {
  return rest.length === 5 && rest[0] === '-z' && rest[1] === '--full-tree' && !rest[2].startsWith('-')
    && rest[3] === '--' && rest[4].startsWith(':(literal)');
}

/** A temp's teardown, in a work tree the app made for it (main/git.ts
 *  commitAllInWorktree): everything left, staged; one commit with no hook;
 *  and the committer asked for. Each in that one form. */
function tempFormOk(sub: string, rest: string[]): boolean {
  if (sub === 'add') return rest.length === 1 && rest[0] === '-A';
  if (sub === 'commit') return rest.length === 3 && rest[0] === '--no-verify' && rest[1] === '-m';
  if (sub === 'var') return rest.length === 1 && rest[0] === 'GIT_COMMITTER_IDENT';
  return false;
}

/** Where the sub command is in `args`: the first word that is not an option
 *  (`-c x` takes one more word). */
function subIndex(args: string[]): number {
  let i = 0;
  while (i < args.length && args[i].startsWith('-')) i += args[i] === '-c' || args[i] === '-C' ? 2 : 1;
  return i;
}

/** `args` with the flags its sub command always gets, or null when the sub
 *  command is not one the app runs. `temp`: the folder is a work tree the app
 *  made for a temp (`isTempWorktree`), where its teardown's forms run. */
export function withCommandFlags(args: string[], hive: boolean, temp = false): string[] | null {
  const i = subIndex(args);
  // `-C <dir>` would move git somewhere else, and `--git-dir` and friends
  // before the sub command would name another repository.
  for (let j = 0; j < i; j++) if (args[j] !== '-c' && args[j - 1] !== '-c') return null;
  const rule = GIT_COMMANDS[args[i] ?? ''];
  if (!rule || !Object.prototype.hasOwnProperty.call(GIT_COMMANDS, args[i])) return null;
  const byHive = rule.hive === true && hive;
  const byTemp = rule.temp === true && temp && tempFormOk(args[i], args.slice(i + 1));
  if ((rule.hive || rule.temp) && !byHive && !byTemp) return null;
  // A temp's commit: no hook and no signing key, whatever the caller's own
  // switches say (the last one given wins), and quiet, as a switch is.
  if (byTemp && !byHive && args[i] === 'commit') {
    return [...args.slice(0, i), '-c', `core.hooksPath=${emptyHooksDir()}`, '-c', 'commit.gpgsign=false', 'commit', '-q', ...args.slice(i + 1)];
  }
  if (args[i] === 'worktree' && !worktreeOk(args.slice(i + 1))) return null;
  if (args[i] === 'ls-tree' && !lsTreeOk(args.slice(i + 1))) return null;
  const add = rule.flags.filter((f) => !args.includes(f));
  return [...args.slice(0, i + 1), ...add, ...args.slice(i + 1)];
}

/** The branch the app makes for a work tree it cuts (main/git.ts
 *  addWorktree): `agent/<folder name as a slug>`. */
export function agentBranchFor(wtPath: string): string {
  const base = wtPath.split(/[\\/]/).filter(Boolean).pop() ?? 'agent';
  const slug = base.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'agent';
  return `agent/${slug}`;
}

/**
 * Is `cwd` the top of a work tree the app made for a temp? The one place
 * outside the hive where the app commits: a temp's teardown commits what it
 * left to its own branch before the folder goes (main/git.ts
 * finalizeTempWorktree). The proof is the teardown's own, read here from the
 * folder and never taken from the caller:
 *   - a linked work tree, which its repository lists (`findRepo`);
 *   - named for a temp (`worker-<id>`; an agent's id never starts so,
 *     shared/tempAgent.ts) in a folder named `worktrees`, where the app cuts
 *     them (core/spawnAgent.ts);
 *   - on the branch the app made for it (`agentBranchFor`), as its own HEAD
 *     file says.
 * The main work tree, an agent's work tree and any other repository are not.
 */
export function isTempWorktree(cwd: string): boolean {
  const place = findRepo(cwd);
  if (!place || place === 'refused' || place.gitDir === place.commonDir || real(cwd) !== place.top) return false;
  if (basename(dirname(place.top)) !== 'worktrees' || !isTempAgentId(basename(place.top))) return false;
  const head = join(place.gitDir, 'HEAD');
  try {
    const st = lstatSync(head);
    if (!st.isFile() || st.size > 1024) return false;
    return readFileSync(head, 'utf8').trim() === `ref: refs/heads/${agentBranchFor(place.top)}`;
  } catch { return false; }
}

export interface RepoPlace {
  /** The folder that holds the `.git` (a real path). */
  top: string;
  /** This work tree's own git folder (HEAD and the index live here). */
  gitDir: string;
  /** The folder the config, objects and refs live in (the same, or the main
   *  repository's for a linked work tree). */
  commonDir: string;
}

const real = (p: string): string | null => { try { return realpathSync(p); } catch { return null; } };
const isRealDir = (p: string): boolean => { try { return lstatSync(p).isDirectory(); } catch { return false; } };
const isRealFile = (p: string): boolean => { try { return lstatSync(p).isFile(); } catch { return false; } };

/**
 * The repository `cwd` is in, found by walking up from its REAL path. Null
 * when there is none. `'refused'` when there is a `.git` that points
 * somewhere the app will not follow:
 *
 *   - a `.git` that is a link;
 *   - a `.git` folder with a `commondir` file (a repository does not have one);
 *   - a `.git` file that is not (a) a linked work tree: `<repo>/worktrees/<id>`
 *     whose `commondir` is `../..` and whose `gitdir` points back at this
 *     very `.git` file, so only a repository that itself lists the work tree
 *     is used; or (b) a sub module: a git folder under `.git/modules/` of a
 *     repository in a folder above this one.
 */
export function findRepo(cwd: string): RepoPlace | 'refused' | null {
  let dir = real(cwd);
  if (!dir) return null;
  for (;;) {
    const dot = join(dir, '.git');
    let st: ReturnType<typeof lstatSync> | null = null;
    try { st = lstatSync(dot); } catch { /* not here */ }
    if (st) {
      if (st.isSymbolicLink()) return 'refused';
      if (st.isDirectory()) {
        try { lstatSync(join(dot, 'commondir')); return 'refused'; } catch { /* as it should be */ }
        return { top: dir, gitDir: dot, commonDir: dot };
      }
      if (!st.isFile()) return 'refused';
      let named: string | null = null;
      try { named = /^gitdir:\s*(.+?)\s*$/m.exec(readFileSync(dot, 'utf8'))?.[1] ?? null; } catch { /* unreadable */ }
      const gitDir = named ? real(isAbsolute(named) ? named : resolve(dir, named)) : null;
      if (!gitDir || !isRealDir(gitDir)) return 'refused';
      let common: string | null = null;
      try { common = readFileSync(join(gitDir, 'commondir'), 'utf8').trim(); } catch { /* none */ }
      if (common !== null) {
        // (a) A linked work tree.
        if (common !== '../..' || basename(dirname(gitDir)) !== 'worktrees') return 'refused';
        let back: string | null = null;
        try { back = readFileSync(join(gitDir, 'gitdir'), 'utf8').trim(); } catch { /* none */ }
        const backReal = back ? real(isAbsolute(back) ? back : resolve(gitDir, back)) : null;
        if (backReal !== dot) return 'refused';
        const commonDir = dirname(dirname(gitDir));
        if (!isRealDir(commonDir)) return 'refused';
        return { top: dir, gitDir, commonDir };
      }
      // (b) A sub module of a repository in a folder above.
      const mark = `${sep}.git${sep}modules${sep}`;
      const at = gitDir.indexOf(mark);
      if (at <= 0) return 'refused';
      const above = gitDir.slice(0, at);
      if (!dir.startsWith(above + sep) || !isRealDir(join(above, '.git'))) return 'refused';
      return { top: dir, gitDir, commonDir: gitDir };
    }
    const up = dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
}

type Out = { code: number | null; out: string; err: string; timedOut: boolean; overCap?: boolean; notText?: boolean };
/** `bare`: `args` is the whole command line the safe layer made (its fixed
 *  switches included) for `program`. `capBytes`: a smaller cap than every
 *  run has. `strictText`: output that is not valid UTF-8 is not an answer
 *  (`notText`, code null), where a path in it is opened afterwards. */
type OwnMore = { program?: string; bare?: boolean; capBytes?: number; strictText?: boolean };

/** The most one run of this module's own may print, both pipes counted. One
 *  string cannot hold more than about 512 MB, and a repository's own files
 *  (its config, its alternates) can make git print any amount. Past the cap
 *  git and what it started are stopped and the run has no answer. */
const OWN_OUTPUT_MAX = 64 * 1024 * 1024;
const ownOutputCap = OWN_OUTPUT_MAX;

/** One git run of this module's own: the fixed switches, the given
 *  environment, never a shell. */
function own(cwd: string, env: NodeJS.ProcessEnv, args: string[], timeoutMs: number, input?: string, more: OwnMore = {}): Promise<Out> {
  return new Promise((done) => {
    // Kept as bytes and made into text ONCE, at the end: a letter of more
    // than one byte that is cut at the end of a piece is not lost.
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    let bytes = 0;
    const cap = Math.min(more.capBytes ?? ownOutputCap, ownOutputCap);
    let timedOut = false;
    let proc: ReturnType<typeof spawn>;
    let overCap = false;
    let ended = false;
    const end = (code: number | null, error?: string): void => {
      if (ended) return;
      ended = true;
      clearTimeout(timer);
      if (overCap) { done({ code: null, out: '', err: '', timedOut, overCap }); return; }
      let text = '';
      let notText = false;
      const all = Buffer.concat(out);
      if (more.strictText) { try { text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(all); } catch { notText = true; } }
      else text = all.toString();
      done({ code: timedOut || notText ? null : code, out: text, err: error ?? Buffer.concat(err).toString(), timedOut, overCap, notText });
    };
    const git = more.program ?? resolveProgram('git');
    if (!git) { done({ code: null, out: '', err: 'spawn git ENOENT', timedOut: false }); return; }
    // Its own process group (not on Windows), so a stop ends git AND what git
    // started: a child that holds git's pipes open would otherwise keep this
    // call waiting past its limit.
    const grouped = process.platform !== 'win32';
    try { proc = spawn(git, more.bare ? args : [...gitSafeArgs(), ...args], { cwd, env, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'], detached: grouped }); } catch (e) { done({ code: null, out: '', err: e instanceof Error ? e.message : String(e), timedOut: false }); return; }
    const stop = (): void => {
      try { if (grouped && proc.pid) process.kill(-proc.pid, 'SIGKILL'); } catch { /* no such group: the one process below */ }
      try { proc.kill('SIGKILL'); } catch { /* gone */ }
      // What left the group and still holds the pipes cannot keep the call: they are closed from this end.
      proc.stdout?.destroy();
      proc.stderr?.destroy();
    };
    const timer = setTimeout(() => { timedOut = true; stop(); }, timeoutMs);
    const take = (into: Buffer[]) => (d: Buffer): void => {
      if (overCap || ended) return;
      bytes += d.length;
      if (bytes > cap) { overCap = true; out.length = 0; err.length = 0; stop(); return; }
      into.push(d);
    };
    proc.stdout?.on('data', take(out));
    proc.stderr?.on('data', take(err));
    proc.on('error', (e) => end(null, e.message));
    proc.on('close', (code) => end(code));
    proc.stdin?.on('error', () => { /* git exited before reading */ });
    proc.stdin?.end(input ?? '');
  });
}

/** What a private run needs. */
export interface PrivateRepo {
  /** The folder made for this run; removed when it is over. */
  base: string;
  /** The private common folder inside it (named as the real one is). */
  commonDir: string;
  /** The text of the config copy, as written. */
  configText: string;
  env: NodeJS.ProcessEnv;
}

/** The real entries the private folder links to. `hooks` is not one (no hook
 *  runs), nor `info` (made here, below), nor `branches`, `remotes` or
 *  `modules` (they name remotes and nested repositories). `lfs` is where the
 *  person's own Git LFS keeps its objects. */
const LINKED_DIRS = ['objects', 'refs', 'logs', 'worktrees', 'reftable', 'lfs'];
const LINKED_FILES = ['packed-refs', 'shallow', 'HEAD'];
/** The most of `info/exclude` that is carried over. */
const EXCLUDE_MAX_BYTES = 1024 * 1024;

/** Thrown when the repository's exclude file is there and cannot be carried over. */
class ExcludeRefused extends Error {}

/**
 * The repository's own exclude rules (`info/exclude`), read as git reads
 * them: THROUGH a link, since people do link that file. The rules name no
 * program and nothing includes another file; all they do is leave files out.
 *
 *   - not there, or a link that leads to nothing: no rules, as for git;
 *   - an ordinary file, reached directly or through a link: its text;
 *   - anything else (a folder, a pipe, a device), one that cannot be opened,
 *     or one larger than the cap: thrown. Carried as empty, the files it
 *     left out would be listed and the hive's add would take them.
 *
 * Opened without waiting, so a pipe with no writer does not hold the call,
 * and judged by what was OPENED, so nothing can be swapped between the look
 * and the read.
 */
function readExcludeRules(file: string): string {
  let fd: number;
  try {
    fd = openSync(file, constants.O_RDONLY | (constants.O_NONBLOCK ?? 0));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return '';
    throw new ExcludeRefused('info/exclude cannot be opened');
  }
  try {
    const st = fstatSync(fd);
    if (!st.isFile()) throw new ExcludeRefused('info/exclude is not an ordinary file');
    // Too large to carry: refused, not cut, or files it excluded would be taken.
    if (st.size > EXCLUDE_MAX_BYTES) throw new ExcludeRefused('info/exclude is too large');
    // One byte past the cap: a file that grew after the look is refused too.
    const buf = Buffer.alloc(EXCLUDE_MAX_BYTES + 1);
    let got = 0;
    for (;;) {
      const n = readSync(fd, buf, got, buf.length - got, null);
      if (n <= 0) break;
      got += n;
      if (got > EXCLUDE_MAX_BYTES) throw new ExcludeRefused('info/exclude is too large');
    }
    return buf.toString('utf8', 0, got);
  } catch (e) {
    if (e instanceof ExcludeRefused) throw e;
    throw new ExcludeRefused('info/exclude cannot be read');
  } finally {
    try { closeSync(fd); } catch { /* closed */ }
  }
}

/** The nested repositories found in each hive, so its next status and add do
 *  not see them at all. Kept for the life of the process. */
const nestedInHive = new Map<string, Set<string>>();

/**
 * Make the private folder for one run. Throws when anything cannot be made.
 * `excludes`: more lines for `info/exclude` (the hive's nested repositories).
 */
export function makePrivateRepo(place: RepoPlace, configText: string, excludes: string[] = []): PrivateRepo {
  // The real path: git prints real paths, and `fix` puts them back.
  const base = realpathSync(mkdtempSync(join(gitPrivateRoot(), 'md-git-')));
  try {
    const commonDir = join(base, basename(place.commonDir));
    mkdirSync(commonDir, { mode: 0o700 });
    writeFileSync(join(commonDir, 'config'), configText, { mode: 0o600 });
    for (const name of LINKED_DIRS) symlinkSync(join(place.commonDir, name), join(commonDir, name), 'junction');
    for (const name of LINKED_FILES) {
      // The main work tree's own HEAD is found in GIT_DIR; this one is only
      // for listing the main work tree from a linked one.
      if (name === 'HEAD' && place.gitDir !== place.commonDir && !isRealFile(join(place.commonDir, name))) continue;
      // Windows: a copy. Only a file that is NOT THERE is left out. One that is
      // there and could not be copied (locked, no access) is not "none": git
      // would write a new one in its place and copyBack would put that over
      // the real file. Thrown: the run is refused.
      if (process.platform === 'win32') { try { copyFileSync(join(place.commonDir, name), join(commonDir, name)); } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; } }
      else symlinkSync(join(place.commonDir, name), join(commonDir, name), 'file');
    }
    // `info` is made, not linked: the exclude rules are carried over (they
    // name no program), `info/attributes` is not.
    mkdirSync(join(commonDir, 'info'));
    // Only an exclude file that is not there is carried as empty; one that
    // cannot be read as rules refuses the run (readExcludeRules).
    let exclude = readExcludeRules(join(place.commonDir, 'info', 'exclude'));
    if (exclude && !exclude.endsWith('\n')) exclude += '\n';
    for (const p of excludes) exclude += '/' + p.replace(/[\\*?[\]!# ]/g, '\\$&') + '/\n';
    writeFileSync(join(commonDir, 'info', 'exclude'), exclude, { mode: 0o600 });
    return {
      base, commonDir, configText,
      env: gitSafeEnv(process.env, { GIT_DIR: place.gitDir, GIT_COMMON_DIR: commonDir, GIT_WORK_TREE: place.top })
    };
  } catch (e) {
    try { rmSync(base, { recursive: true, force: true }); } catch { /* best effort */ }
    throw e;
  }
}

export interface SafeGitOptions {
  timeoutMs?: number;
  /** The hive's own repository: `add`, `commit`, `rm`, `gc` and `reflog` are
   *  allowed, and a nested repository is never recorded. */
  hive?: boolean;
  /** `gh` runs git itself: no sub command to check, the same environment. */
  program?: 'git' | 'gh';
}

/**
 * What became of the settings git wrote to the private copy during a run
 * (the upstream of a branch a switch creates):
 *  - 'nothing': git wrote none.
 *  - 'carried': they are in the repository's real config.
 *  - 'not-carried': they are NOT, or not all of them. The run itself stands
 *    (the branch is switched); what it meant to record is not recorded.
 */
export type SettingsCarried = 'nothing' | 'carried' | 'not-carried';
export interface SafeGitDone { settings: SettingsCarried }

export type SafeGit =
  | {
    ok: true;
    /** The full path of git (or gh) to start. */
    program: string;
    /** What to start git with (the fixed switches, then the caller's). */
    args: string[];
    env: NodeJS.ProcessEnv;
    /** The folder to start it in. */
    cwd: string;
    /** Git's output with the private folder's path put back to the real one. */
    fix: (text: string) => string;
    /** Call when the run is over: carries over what git wrote to the copy,
     *  and removes the private folder. Answers what became of the settings
     *  git wrote during the run. */
    done: () => Promise<SafeGitDone>;
  }
  | { ok: false; error: string };

export const NOT_A_REPOSITORY = 'fatal: not a git repository';
const REFUSED = 'the settings of this repository could not be read safely; git was not run';
/** The same refusal when it is the exclude file that could not be carried over. */
export const EXCLUDE_REFUSED = 'the exclude file of this repository (info/exclude in its .git folder) could not be read, so git was not run. Replace it with an ordinary file under 1 MB that you can open, then try again';


/** The most a repository's settings may list. The list is walked in one go
 *  on the app's own thread (parsed, then matched against the allow list),
 *  which no time limit covers. The time follows the number of entries more
 *  than the size: 6 MB of two million short entries was measured at 1.3 s,
 *  so a list at this cap can hold the thread for about two seconds.
 *  Past this the settings are not read, and git is not run (REFUSED). No
 *  config a person or a tool writes is near it. */
const CONFIG_LIST_MAX = 8 * 1024 * 1024;

/** The repository's own config, read by name. Runs in a folder that is not a
 *  repository, with no `GIT_DIR`: nothing but that one file is read, no
 *  include is followed, nothing is run. Null when it cannot be read. */
async function readRepoConfig(place: RepoPlace, timeoutMs: number): Promise<string | null> {
  const file = join(place.commonDir, 'config');
  if (!isRealFile(file)) return null;
  const r = await own(gitPrivateRoot(), gitSafeEnv(), ['config', '--file', file, '--no-includes', '-z', '--list'], timeoutMs, undefined, { capBytes: CONFIG_LIST_MAX });
  if (r.code !== 0) return null;
  // A work tree's own settings (`config.worktree`, where `git sparse-checkout`
  // keeps its two keys). Git reads that file only when the repository says
  // `extensions.worktreeConfig`; the app never lets git read it, and takes
  // the allowed keys from it the same way, by name.
  if (!parseConfigList(r.out).some((e) => e.key === 'extensions.worktreeconfig' && gitTrue(e.value))) return r.out;
  const own2 = join(place.gitDir, 'config.worktree');
  try { lstatSync(own2); } catch { return r.out; }
  if (!isRealFile(own2)) return null;
  const w = await own(gitPrivateRoot(), gitSafeEnv(), ['config', '--file', own2, '--no-includes', '-z', '--list'], timeoutMs, undefined, { capBytes: CONFIG_LIST_MAX });
  return w.code === 0 ? r.out + w.out : null;
}

/** A PARTIAL CLONE has objects it never downloaded; git fetches one when it
 *  is needed. The app's git fetches NOTHING, for no command: a fetch would
 *  use the person's credentials, askpass and ssh for a remote that the
 *  repository's own config names, and an agent can write that config (an
 *  ordinary repository can be made to read as a partial clone of a host the
 *  person holds a credential for). Without the fetch a switch would move
 *  HEAD and leave the files it could not read out of the work tree. So the
 *  commands that write a work tree are refused in a partial clone, with
 *  words that say what the person can do. A LOSS against 0.5.5, where git
 *  fetched: no branch switch from the app and no isolated agent in a
 *  partial clone. The way to lift it later is to ask the person once,
 *  showing the remote's address. */
export const PARTIAL_CLONE = 'this repository\'s settings name it a partial clone (some of its files are not downloaded) and the app does not fetch them. Do it in a terminal; if this is not a partial clone, its settings are wrong. Nothing was run';
/** The same, when the settings do not say so and git's own marks on the disk do. */
export const PARTIAL_CLONE_BY_MARKS = 'git\'s own marks in this repository show it is a partial clone (some of its files are not downloaded), though its settings do not say so, and the app does not fetch them. Do it in a terminal. Nothing was run';
/** The same, when the app could not find out. It refuses: a switch in a partial clone it did not see would leave files out. */
export const PARTIAL_CLONE_UNSURE = 'the app could not tell whether this repository is a partial clone (it could not list or look in the object folders it borrows from), and in one it does not fetch the files that are not downloaded. Do it in a terminal. Nothing was run';
/** The refusal, naming what was refused and what showed the partial clone. */
export function partialCloneRefusal(sub: string, by: 'settings' | 'marks' | 'unsure' = 'settings'): string {
  const what = sub === 'switch' ? 'the branch was not switched' : sub === 'reset' ? 'the reset was not done' : 'the work tree was not made';
  return `${what}: ${by === 'marks' ? PARTIAL_CLONE_BY_MARKS : by === 'unsure' ? PARTIAL_CLONE_UNSURE : PARTIAL_CLONE}`;
}
/** A config value read as git reads a yes or no: no value at all, a word for
 *  yes, or any whole number but 0. A number as git's own reader takes it:
 *  spaces before it, a sign, decimal or 0x hex, and a k, m or g after it. */
function gitTrue(v: string | null): boolean {
  if (v === null || /^(true|yes|on)$/i.test(v)) return true;
  const n = /^\s*[-+]?(0x[0-9a-f]+|[0-9]+)[kmg]?$/i.exec(v);
  return n !== null && !/^(0x)?0+$/i.test(n[1]);
}
/** The most git may print when asked for its object folders. Past it the
 *  answer is "cannot tell". */
const ALTERNATES_OUTPUT_MAX = 1024 * 1024;
/** How deep git follows a borrowed folder's own borrowed folders. It OPENS
 *  the alternates file one folder further than that before it says "too
 *  deep", so the look ahead goes that one further too. */
const ALTERNATES_DEPTH = 5;
/** The most folders the look ahead visits; past it git's own run decides. */
const ALTERNATES_LOOK_MAX = 4096;

/**
 * A LOOK AHEAD of git at the alternates file of an object folder and of the
 * folders it names, as deep as git goes. Its one use is to answer AT ONCE
 * where git would wait out the whole time limit: what the name leads to,
 * links followed, must be a file. Git would open anything: a pipe holds it
 * until the limit, a device that never ends (/dev/zero) is read until the
 * limit. False: it cannot be told. A link that leads nowhere, and a file that
 * cannot be opened, are git's to read.
 *
 * It decides NOTHING else: which folders are borrowed is still what git
 * prints (gitAlternates below). A line read differently here than git reads
 * it costs the wait and no more.
 */
function alternatesAreFiles(objects: string, depth: number, seen: Set<string>): boolean {
  if (depth > ALTERNATES_DEPTH + 1 || seen.size >= ALTERNATES_LOOK_MAX || seen.has(objects)) return true;
  seen.add(objects);
  let fd: number;
  // Opened without waiting, and judged by what was opened: a pipe put there
  // between a check and a read would hold this process itself.
  try { fd = openSync(join(objects, 'info', 'alternates'), constants.O_RDONLY | (constants.O_NONBLOCK ?? 0)); } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    return code === 'ENOENT' || code === 'ENOTDIR' || code === 'EACCES';
  }
  let text: string;
  try {
    const st = fstatSync(fd);
    if (!st.isFile() || st.size > ALTERNATES_OUTPUT_MAX) return false;
    const buf = Buffer.alloc(st.size);
    let got = 0;
    while (got < buf.length) {
      const n = readSync(fd, buf, got, buf.length - got, got);
      if (n <= 0) break;
      got += n;
    }
    text = buf.subarray(0, got).toString();
  } catch { return false; } finally { closeSync(fd); }
  for (const line of text.split('\n')) {
    if (!line || line.startsWith('#') || line.startsWith('"')) continue;
    if (!alternatesAreFiles(isAbsolute(line) ? line : resolve(objects, line), depth + 1, seen)) return false;
  }
  return true;
}

/**
 * The object folders this repository borrows from, AS GIT ITSELF NAMES THEM
 * (`git count-objects -v` prints one "alternate:" line for each, the borrowed
 * folders of borrowed folders included). The app does not read
 * `objects/info/alternates` by hand: git's reader has rules of its own
 * (quoting, depth, relative paths) and every miss would be a switch that
 * should have been refused.
 *
 * Null when it cannot be told: git could not be run, ran over its time,
 * printed too much, or named a folder in a form that is not plain text.
 * The caller reads null as "refuse".
 */
async function gitAlternates(cwd: string, place: RepoPlace, timeoutMs: number): Promise<string[] | null> {
  // No such file, and no link of that name: git borrows from nowhere.
  const file = join(place.commonDir, 'objects', 'info', 'alternates');
  try { lstatSync(file); } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
    return null;
  }
  // This file, and the same file of every folder it leads to, must be a
  // file: what is not is never asked of git. It cannot be told, at once.
  if (!alternatesAreFiles(join(place.commonDir, 'objects'), 0, new Set())) return null;
  // core.quotePath off: git then prints a path with letters outside ASCII as
  // it is, not in quotes with escapes. Those are raw bytes: the run's output
  // is made into text once, whole, and a name that is not valid UTF-8 is not
  // an answer (the folder looked in afterwards would be another one).
  const run = await safeGit(cwd, ['-c', 'core.quotePath=false', 'count-objects', '-v'], { timeoutMs });
  if (!run.ok) return null;
  try {
    const r = await own(run.cwd, run.env, run.args, timeoutMs, undefined, { program: run.program, bare: true, capBytes: ALTERNATES_OUTPUT_MAX, strictText: true });
    if (r.code !== 0 || r.timedOut || r.overCap || r.notText) return null;
    const out: string[] = [];
    for (const line of run.fix(r.out).split('\n')) {
      if (!line.startsWith('alternate: ')) continue;
      const folder = line.slice('alternate: '.length);
      // Git prints a path with odd characters in quotes. It is not unquoted here: cannot tell.
      if (!folder || folder.startsWith('"') || !isAbsolute(folder)) return null;
      out.push(folder);
    }
    return out;
  } finally {
    await run.done().catch(() => undefined);
  }
}

/** Does this object folder hold a promisor pack? The mark counts with its
 *  pack AND the pack's index beside it, as git itself counts a pack. Null
 *  when the folder cannot be looked in. No pack folder in an object folder
 *  that is there is "no"; an object folder that is NOT there is null: git
 *  names only folders that exist, so the name was not read as git wrote it. */
function promisorPackIn(objects: string): boolean | null {
  let names: Set<string>;
  try { names = new Set(readdirSync(join(objects, 'pack'))); } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') return null;
    try { return statSync(objects).isDirectory() ? false : null; } catch { return null; }
  }
  for (const n of names) {
    if (!n.endsWith('.promisor')) continue;
    const base = n.slice(0, -'.promisor'.length);
    if (names.has(base + '.pack') && names.has(base + '.idx')) return true;
  }
  return false;
}

/** A partial clone by its settings, OR by what is on the disk: git leaves a
 *  `.promisor` file beside every pack it fetched from a promisor remote. The
 *  settings alone can be hidden (moved to an include or to config.worktree,
 *  or taken out), and a switch would then leave files out and still say ok.
 *
 *  FAILS CLOSED: when the object folders cannot be listed or looked in, the
 *  answer is 'unsure' and the caller refuses. Never "no" on a doubt. */
async function partialCloneBy(entries: Array<{ key: string; value: string | null }>, cwd: string, place: RepoPlace, timeoutMs: number): Promise<'settings' | 'marks' | 'unsure' | null> {
  // A remote's filter key counts by itself, whatever it holds: git takes the
  // remote it is on as a promisor, with no promisor key beside it.
  if (entries.some((e) => e.key === 'extensions.partialclone' || (/^remote\..+\.promisor$/.test(e.key) && gitTrue(e.value)) || /^remote\..+\.partialclonefilter$/.test(e.key))) return 'settings';
  const own1 = promisorPackIn(join(place.commonDir, 'objects'));
  if (own1) return 'marks';
  const borrowed = await gitAlternates(cwd, place, timeoutMs);
  if (borrowed === null) return 'unsure';
  let unsure = own1 === null;
  for (const folder of borrowed) {
    const there = promisorPackIn(folder);
    if (there) return 'marks';
    if (there === null) unsure = true;
  }
  return unsure ? 'unsure' : null;
}
/** Whether the repository `cwd` is in is a partial clone. False when there is
 *  no repository, or its settings cannot be read. */
export async function isPartialCloneAt(cwd: string, timeoutMs = 8000): Promise<boolean> {
  const place = findRepo(cwd);
  if (place === null || place === 'refused') return false;
  const listed = await readRepoConfig(place, timeoutMs);
  return (await partialCloneBy(listed === null ? [] : parseConfigList(listed), cwd, place, timeoutMs)) !== null;
}

/** Split a config key as git does: section and variable in lower case, the
 *  subsection as written. */
function normalKey(key: string): string {
  const first = key.indexOf('.');
  const last = key.lastIndexOf('.');
  if (first <= 0 || last === key.length - 1) return key.toLowerCase();
  return key.slice(0, first).toLowerCase() + key.slice(first, last + 1) + key.slice(last + 1).toLowerCase();
}

const CONFIG_FLAGS = new Set(['--local', '--get', '--get-all', '--add', '--replace-all', '--unset', '--unset-all', '-z']);

/** `git config ...` from a caller, as a call on the real file by name. Only a
 *  key on the allow list may be read or written, with a value it may hold. */
function configCall(args: string[], file: string): string[] | null {
  const i = subIndex(args);
  const rest = args.slice(i + 1);
  const flags = rest.filter((a) => a.startsWith('-'));
  const words = rest.filter((a) => !a.startsWith('-'));
  if (flags.some((f) => !CONFIG_FLAGS.has(f)) || words.length < 1 || words.length > 2) return null;
  const key = normalKey(words[0]);
  const reading = flags.includes('--get') || flags.includes('--get-all');
  const removing = flags.includes('--unset') || flags.includes('--unset-all');
  if (reading || removing ? words.length !== 1 : words.length !== 2) return null;
  const probe = reading || removing ? null : words[1];
  const known = probe === null ? gitConfigKeyKnown(key, GIT_CONFIG_ALLOW) : gitConfigAllowed(key, probe, GIT_CONFIG_ALLOW);
  if (!known) return null;
  return ['config', '--file', file, ...flags.filter((f) => f !== '--local'), ...words];
}

/** The gitlinks (nested repositories recorded as one entry) in the index. */
async function gitlinks(p: PrivateRepo, cwd: string, timeoutMs: number): Promise<string[] | null> {
  const r = await own(cwd, p.env, ['ls-files', '-s', '-z'], timeoutMs);
  if (r.code !== 0) return null;
  const out: string[] = [];
  for (const e of r.out.split('\0')) if (e.startsWith('160000 ')) out.push(e.slice(e.indexOf('\t') + 1));
  return out;
}

/** Take every gitlink out of the hive's index, by plumbing that starts no
 *  child git, and remember the paths so they are excluded from then on.
 *  False when it could not be done. */
async function dropGitlinks(p: PrivateRepo, place: RepoPlace, timeoutMs: number): Promise<boolean> {
  const found = await gitlinks(p, place.top, timeoutMs);
  if (found === null) return false;
  if (found.length === 0) return true;
  const known = nestedInHive.get(place.top) ?? new Set<string>();
  for (const f of found) known.add(f);
  nestedInHive.set(place.top, known);
  const r = await own(place.top, p.env, ['update-index', '--force-remove', '-z', '--stdin'], timeoutMs, found.join('\0') + '\0');
  return r.code === 0;
}

/**
 * What to start `git <args>` (or a gh that runs git; pass `program: 'gh'`)
 * with in `cwd`. The caller runs it with `args`, `env` and `cwd`, passes its
 * output through `fix`, then calls `done()`.
 */
export async function safeGit(cwd: string, args: string[], opts: SafeGitOptions = {}): Promise<SafeGit> {
  const timeoutMs = opts.timeoutMs ?? 8000;
  const gh = opts.program === 'gh';
  const hive = opts.hive === true;
  // A temp's teardown: proved from the folder, only for the commands it runs.
  const temp = !gh && !hive && GIT_COMMANDS[args[subIndex(args)] ?? '']?.temp === true && isTempWorktree(cwd);
  const run = gh ? args : withCommandFlags(args, hive, temp);
  if (!run) return { ok: false, error: `git ${args[subIndex(args)] ?? ''} is not a command the app runs here; git was not run` };
  const sub = gh ? '' : args[subIndex(args)];

  // No repository: said here. Git is not started in a folder the app could
  // not place.
  const place = findRepo(cwd);
  if (place === null) return { ok: false, error: NOT_A_REPOSITORY };
  if (place === 'refused') return { ok: false, error: 'the .git of this folder points somewhere the app will not follow; git was not run' };
  const realCwd = real(cwd);
  if (!realCwd) return { ok: false, error: NOT_A_REPOSITORY };
  // The hive commits in its OWN repository only. If its `.git` is gone, the
  // walk up would find a repository above, and the hive's add and commit
  // would land there.
  if (hive && place.top !== realCwd) return { ok: false, error: 'the hive has no repository of its own; git was not run' };
  // By full path, and never a program that sits inside the work tree.
  const program = resolveProgram(gh ? 'gh' : 'git');
  const gitItself = resolveProgram('git');
  if (!program || !gitItself) return { ok: false, error: `spawn ${gh ? 'gh' : 'git'} ENOENT` };
  if (insideFolder(program, place.top) || insideFolder(gitItself, place.top)) return { ok: false, error: 'git on PATH is inside this folder; git was not run' };
  // The folder the private copies are made in: refused when it cannot be made.
  try { gitPrivateRoot(); } catch { return { ok: false, error: REFUSED }; }

  const listed = await readRepoConfig(place, timeoutMs);
  if (listed === null) return { ok: false, error: REFUSED };
  const entries = parseConfigList(listed);
  const configText = privateConfigText(entries, GIT_CONFIG_ALLOW);
  if (sub === 'switch' || sub === 'reset' || (sub === 'worktree' && args.includes('add'))) {
    const by = await partialCloneBy(entries, cwd, place, timeoutMs);
    if (by) return { ok: false, error: partialCloneRefusal(sub, by) };
  }

  // `git config`: on the real file, by name, and only an allowed key. Run
  // outside any repository, so nothing else is read.
  if (sub === 'config') {
    const call = configCall(args, join(place.commonDir, 'config'));
    if (!call) return { ok: false, error: 'this setting is not one the app reads or writes; git was not run' };
    return { ok: true, args: [...gitSafeArgs(), ...call], env: gitSafeEnv(), cwd: gitPrivateRoot(), program, fix: (t) => t, done: async () => ({ settings: 'nothing' as const }) };
  }

  let p: PrivateRepo;
  try {
    // A new work tree is listed in `worktrees`: made first, in the repository
    // the app placed, so the link to it is not left dangling.
    if (sub === 'worktree') { try { mkdirSync(join(place.commonDir, 'worktrees')); } catch { /* there */ } }
    p = makePrivateRepo(place, configText, hive ? [...(nestedInHive.get(place.top) ?? [])] : []);
  } catch (e) {
    // The refusal names what could not be read.
    return { ok: false, error: e instanceof ExcludeRefused ? EXCLUDE_REFUSED : REFUSED };
  }
  const remove = (): void => { try { rmSync(p.base, { recursive: true, force: true }); } catch { /* a temp folder; the system clears it */ } };

  // The hive never holds a nested repository in its index when a command that
  // could step into one runs.
  const indexCommand = sub === 'add' || sub === 'commit' || sub === 'rm';
  if (hive && indexCommand && !(await dropGitlinks(p, place, timeoutMs))) { remove(); return { ok: false, error: REFUSED }; }

  const realParent = dirname(place.commonDir);
  return {
    ok: true,
    program,
    args: gh ? run : [...gitSafeArgs(), ...run],
    env: p.env,
    cwd: realCwd,
    fix: (text) => mapPrivatePath(text, p.base, realParent),
    done: async () => {
      // Each step by itself: one that throws must not skip the next, and the
      // carry over's own answer is what the caller is told.
      try { if (hive && sub === 'add') await dropGitlinks(p, place, timeoutMs); } catch { /* the run's own answer stands */ }
      let settings: SettingsCarried = 'not-carried';
      try { settings = await carryOver(p, place, timeoutMs); } catch { /* not carried: said to the caller */ }
      try { if (process.platform === 'win32') copyBack(p, place); } catch { /* the run's own answer stands */ }
      remove();
      return { settings };
    }
  };
}

/**
 * Git's output with the private folder `base` put back to `realParent`, the
 * folder that holds the repository's real `.git`.
 *
 * Windows (issue 853): `base` has backslashes, but git prints an absolute
 * path with forward slashes (`C:/Users/.../md-git-ABC123/.git`), so a plain
 * search for `base` found nothing and the private path came out as it was:
 * the roster named each project `MD-GIT-ABC123`. On Windows both spellings
 * are put back, without regard to case (`c:` and `C:` are one drive), and a
 * path git printed with forward slashes keeps them.
 */
export function mapPrivatePath(text: string, base: string, realParent: string, win = process.platform === 'win32'): string {
  if (!win) return text.split(base).join(realParent);
  const slashed = base.replace(/\\/g, '/');
  const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const spellings = slashed === base ? [base] : [base, slashed];
  const found = new RegExp(spellings.map(escape).join('|'), 'gi');
  return text.replace(found, (m) => (m.includes('/') ? realParent.replace(/\\/g, '/') : realParent));
}

/** Windows only: `packed-refs` was a copy; if git rewrote it, put it back. */
function copyBack(p: PrivateRepo, place: RepoPlace): void {
  const mine = join(p.commonDir, 'packed-refs');
  if (!isRealFile(mine)) return;
  const tmp = join(place.commonDir, `packed-refs.md-${process.pid}`);
  copyFileSync(mine, tmp);
  renameSync(tmp, join(place.commonDir, 'packed-refs'));
}

/**
 * What git wrote to the private copy during the run (the upstream of a branch
 * a switch creates) is written to the repository's real config: only keys on
 * the allow list, with values they may hold, and only when the real config
 * is a plain file (git's lock would follow a link).
 *
 * IT WRITES THE PERSON'S OWN CONFIG, so it writes only from what it KNOWS.
 * The two lists it compares (the copy before the run and after it) are each
 * read by a git run, and such a run can fail: over its time, over the output
 * cap, git not started, a file git cannot read. A list that was not read is
 * NOT an empty list. Read as empty, "after" would say every key is gone and
 * each would be removed from the real config (the remotes, the upstreams,
 * the user's name); "before" would say every key is new. So when either list
 * was not read NOTHING is written, and the answer is 'not-carried'. The same
 * answer when the copy cannot be read, when the real config is not a plain
 * file, and when a write of its own fails.
 */
async function carryOver(p: PrivateRepo, place: RepoPlace, timeoutMs: number): Promise<SettingsCarried> {
  let after: string;
  try { after = readFileSync(join(p.commonDir, 'config'), 'utf8'); } catch { return 'not-carried'; }
  if (after === p.configText) return 'nothing';
  const file = join(place.commonDir, 'config');
  if (!isRealFile(file)) return 'not-carried';
  /** Null when the listing failed: never an empty list. */
  const list = async (path: string): Promise<Map<string, string[]> | null> => {
    const r = await own(gitPrivateRoot(), gitSafeEnv(), ['config', '--file', path, '--no-includes', '-z', '--list'], timeoutMs);
    if (r.code !== 0) return null;
    const m = new Map<string, string[]>();
    for (const e of parseConfigList(r.out)) m.set(e.key, [...(m.get(e.key) ?? []), e.value ?? 'true']);
    return m;
  };
  const before = join(p.base, 'config.before');
  writeFileSync(before, p.configText, { mode: 0o600 });
  const was = await list(before);
  if (was === null) return 'not-carried';
  const now = await list(join(p.commonDir, 'config'));
  if (now === null) return 'not-carried';
  let all = true;
  const write = async (args: string[]): Promise<void> => {
    const r = await own(gitPrivateRoot(), gitSafeEnv(), ['config', '--file', file, ...args], timeoutMs);
    if (r.code !== 0) all = false;
  };
  for (const [key, values] of now) {
    if (JSON.stringify(was.get(key) ?? []) === JSON.stringify(values)) continue;
    // A key or a value that is not allowed is left out, as it is from every copy: not a failure.
    if (values.some((v) => !gitConfigAllowed(key, v, GIT_CONFIG_ALLOW))) continue;
    await write(['--replace-all', key, values[0]]);
    for (const v of values.slice(1)) await write(['--add', key, v]);
  }
  for (const key of was.keys()) if (!now.has(key)) await write(['--unset-all', key]);
  return all ? 'carried' : 'not-carried';
}
