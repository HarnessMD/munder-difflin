import { accessSync, constants as fsConstants, existsSync, statSync } from 'node:fs';
import { execFile, spawn, spawnSync } from 'node:child_process';
import { delimiter, isAbsolute, join, win32 } from 'node:path';

// These helpers mirror the resolution logic in pty.ts. They exist separately so
// headless child processes can launch `claude` with the same PATH the user's
// interactive shell sees — Electron on macOS starts without the login-shell PATH,
// so a bare `claude` would otherwise fail
// with ENOENT in a packaged build.

/** The PATH the person's login shell last gave, or null before the first
 *  answer. Kept while a fresh read is in flight, so a caller that cannot wait
 *  reads the last good one. */
let shellPath: string | null = null;
/** The read in flight that callers wait on, or null. */
let reading: Promise<string> | null = null;
/** True from a read that failed until a later one answers: the fallback is in
 *  use, NOT stored, and a retry runs in the background. */
let readFailed = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retryCount = 0;
/** Bumped whenever the PATH in use may have changed. A cache of lookups made
 *  against an older PATH (pty.ts, memory.ts, hive.ts) compares and drops. */
let generation = 0;
/** Counts the PATH reads started, the launch read, fresh reads and retries
 *  alike. A read that answers after a newer one started is out of date: it
 *  was asked before whatever made the newer one necessary (an install). */
let readsStarted = 0;

/** How long the one login shell may take. It runs off the main thread, so the
 *  limit only bounds how long the first agent start waits (0.5.5, Plan G). */
export const SHELL_PATH_LIMIT_MS = 10_000;
const RETRY_DELAYS_MS = [5_000, 30_000, 120_000];
const FENCE = '__MD_SHELL_FENCE__';

/** Run `script` in the user's INTERACTIVE login shell and return only what the
 *  script itself printed, without blocking the main process.
 *
 *  An interactive shell is required to pick up nvm/asdf/brew PATH edits, but it
 *  also runs the user's rc files, which are free to print. Some zsh setups emit
 *  `Restored session: <date>` from a session-save plugin BEFORE the script's
 *  own output, which silently poisons every value read back: a plain `.trim()`
 *  on `echo "$PATH"` yields `"Restored session: …\n/opt/homebrew/bin:…"` and
 *  that whole string gets handed to every agent as its PATH. Fencing the output
 *  between two markers makes rc-file chatter (before, after, or both)
 *  impossible to mistake for a result. Resolves null when the shell fails, the
 *  fence never appears, or the limit passes (the shell is then killed).
 *
 *  Answers as soon as the closing fence is seen: an rc file that leaves a job
 *  holding the pipe open must not hold the answer back. */
export function readFromLoginShell(script: string, timeoutMs: number = SHELL_PATH_LIMIT_MS): Promise<string | null> {
  return new Promise((resolve) => {
    let output = '';
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const fenced = (): string | null => {
      const start = output.indexOf(FENCE);
      const end = output.lastIndexOf(FENCE);
      return start < 0 || end <= start ? null : output.slice(start + FENCE.length, end);
    };
    const finish = (value: string | null): void => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(value);
    };
    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(
        process.env.SHELL ?? '/bin/zsh',
        ['-ilc', `printf %s ${FENCE}; ${script}; printf %s ${FENCE}`],
        { stdio: ['ignore', 'pipe', 'pipe'] }
      );
    } catch { resolve(null); return; }
    timer = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch { /* gone */ }
      // Something the rc files started may outlive the shell and hold the
      // pipes open: let go of them, so nothing here waits on it.
      try { child.stdout?.destroy(); child.stderr?.destroy(); child.unref(); } catch { /* gone */ }
      finish(null);
    }, timeoutMs);
    timer.unref?.();
    child.stdout?.setEncoding('utf8');
    child.stdout?.on('data', (chunk: string) => {
      output += chunk;
      const value = fenced();
      if (value !== null) finish(value);
    });
    child.stderr?.resume(); // rc-file chatter on stderr must not fill the pipe
    child.on('error', () => finish(null));
    child.on('close', () => finish(fenced()));
  });
}

/** What an agent gets while no login shell has answered: the PATH the app was
 *  started with, then the known install folders. Never stored as the answer. */
export function fallbackShellPath(env: NodeJS.ProcessEnv = process.env): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const dir of [...(env.PATH ?? '').split(delimiter), ...commonBinDirs(env.HOME ?? '')]) {
    if (!dir || seen.has(dir)) continue;
    seen.add(dir);
    out.push(dir);
  }
  return out.join(delimiter);
}

function scheduleRetry(): void {
  if (retryTimer || retryCount >= RETRY_DELAYS_MS.length) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    retryCount++;
    const mine = ++readsStarted;
    void readShellPathOnce().then((value) => {
      // A fresh read started while this retry ran (forgetShellLookups,
      // refreshShellPath): that one decides, this one is dropped.
      if (mine !== readsStarted) return;
      if (value === null) { scheduleRetry(); return; }
      land(value);
    });
  }, RETRY_DELAYS_MS[retryCount]);
  retryTimer.unref?.();
}

function land(value: string): void {
  readFailed = false;
  retryCount = 0;
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
  if (shellPath !== value) generation++;
  shellPath = value;
}

async function readShellPathOnce(): Promise<string | null> {
  const value = (await readFromLoginShell('printf %s "$PATH"'))?.trim();
  // A PATH is a single colon-joined line. Anything multi-line is rc-file noise
  // that slipped the fence: no answer, rather than hand the agent a corrupt
  // PATH it would carry into every subprocess it spawns.
  return value && !value.includes('\n') ? value : null;
}

function startRead(): Promise<string> {
  const seq = ++readsStarted;
  const mine: Promise<string> = readShellPathOnce().then((value) => {
    // A read that a newer one replaced lands its PATH only while there is
    // none at all: an answer is better than the fallback, and the newer read
    // replaces it when it answers.
    const current = seq === readsStarted;
    if (reading === mine) reading = null;
    if (value !== null) { if (current || shellPath === null) land(value); return shellPath ?? value; }
    if (!current) return shellPath ?? fallbackShellPath();
    if (!readFailed) {
      console.error(`[shell] the login shell gave no PATH within ${SHELL_PATH_LIMIT_MS / 1000} s; agents start with the fallback PATH, and the read is tried again in the background`);
    }
    readFailed = true;
    scheduleRetry();
    return shellPath ?? fallbackShellPath();
  });
  reading = mine;
  return mine;
}

/** The user's interactive-shell PATH, for a caller that can wait (0.5.5,
 *  Plan G). ONE login shell per launch reads it, off the main thread, however
 *  many callers ask; every agent start waits on this. After a read that
 *  failed it answers at once with the fallback, which is never stored, while
 *  the read is tried again in the background. */
export function shellPathReady(): Promise<string> {
  if (process.platform === 'win32') return Promise.resolve(process.env.PATH || '');
  if (reading) return reading;
  if (shellPath !== null) return Promise.resolve(shellPath);
  if (readFailed) return Promise.resolve(fallbackShellPath());
  return startRead();
}

/** Read the PATH again in a fresh login shell and wait for it: the person
 *  asked for a fresh look (the setup panel's check). Callers at the same
 *  time share one shell. */
export function refreshShellPath(): Promise<string> {
  if (process.platform === 'win32') return Promise.resolve(process.env.PATH || '');
  if (reading) return reading;
  readFailed = false;
  retryCount = 0;
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
  return startRead();
}

/** Forget every lookup made so far and read the PATH again in a fresh login
 *  shell, in the background. For the moments a CLI may have just landed
 *  somewhere new: an install ended, or the person set one up by hand (batch 4).
 *  A native installer (kimi, grok) adds its own bin folder to the rc files,
 *  which the PATH read at app start never saw. The last PATH stays in use
 *  until the new one answers; a caller that must have the new one waits on
 *  shellPathReady(). */
export function forgetShellLookups(): void {
  generation++;
  if (process.platform === 'win32') return;
  readFailed = false;
  retryCount = 0;
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
  void startRead();
}

/** Changes whenever the PATH in use may have: a cached lookup is good only
 *  for the generation it was made in. */
export function shellPathGeneration(): number { return generation; }

/** Folders the vendors' own installers put their binary in, checked after
 *  `which` (0.5.3): npm's user prefix, Claude's local install, Volta, and the
 *  native kimi and grok installers, whose folders are on no PATH until a new
 *  shell reads the line they added. */
export function commonBinDirs(home: string): string[] {
  return ['/opt/homebrew/bin', '/usr/local/bin', `${home}/.local/bin`, `${home}/.claude/local`, `${home}/.volta/bin`, `${home}/.kimi-code/bin`, `${home}/.grok/bin`];
}

/** The user's interactive-shell PATH, for a caller that cannot wait. Never
 *  starts a blocking shell: before the login shell has answered it returns the
 *  fallback (and makes sure the read is under way). Anything that starts an
 *  agent waits on shellPathReady() first, so it reads the real one here. */
export function userShellPath(): string {
  // Windows has no interactive login-shell PATH problem — use the process PATH directly.
  if (process.platform === 'win32') return process.env.PATH || '';
  if (shellPath !== null) return shellPath;
  if (!reading && !readFailed) void startRead();
  return fallbackShellPath();
}

/** The file a login shell's `which <command>` would name on this PATH: the
 *  first folder, in PATH order, that holds a file of that name which can be
 *  run. A plain directory walk, no shell (0.5.5, Plan G: every `which` used
 *  to boot one more blocking login shell). A folder that is not absolute is
 *  skipped: it would be read against the app's own working folder. */
export function findCommandOnPath(command: string, pathValue: string): string | null {
  if (!isSafeCommandName(command)) return null;
  for (const raw of pathValue.split(delimiter)) {
    const dir = raw.trim();
    if (!dir || !isAbsolute(dir)) continue;
    const candidate = join(dir, command);
    try {
      if (!statSync(candidate).isFile()) continue;
      accessSync(candidate, fsConstants.X_OK);
      return candidate;
    } catch { /* not there, or not something that can be run */ }
  }
  return null;
}

/** Resolve a bare command (e.g. 'claude') against the user's PATH + common
 *  install locations. Returns the input unchanged if it already looks like a path. */
/** A plain executable name — the only shape we resolve against the user's PATH.
 *  A resolver may interpolate this token into a shell (`$SHELL -ilc "… which
 *  <it> …"`), so it is constrained to characters that are unambiguously part of
 *  a binary name (`[A-Za-z0-9._+-]`); anything else is not a command name and is
 *  refused rather than resolved. Callers early-return real paths (containing `/`
 *  or `\`) before this, so the only input that reaches a resolver is meant to be
 *  a bare binary name. */
export function isSafeCommandName(command: string): boolean {
  return /^[A-Za-z0-9._+-]+$/.test(command);
}

interface WindowsFallbackLocation {
  commands: readonly string[];
  root: 'LOCALAPPDATA';
  segments: readonly string[];
}

/** Known provider-specific Windows locations, checked after the established
 *  npm/Claude fallbacks. Keep filesystem knowledge here so another verified
 *  installer location can be added without branching either resolver. */
const WINDOWS_FALLBACK_LOCATIONS: readonly WindowsFallbackLocation[] = [
  {
    commands: ['agy'],
    root: 'LOCALAPPDATA',
    segments: ['agy', 'bin', 'agy.exe']
  }
];

function isAbsoluteWindowsPathWithVolume(path: string): boolean {
  if (!win32.isAbsolute(path)) return false;
  const root = win32.parse(path).root;
  // win32.isAbsolute also accepts `\foo` and `/c/foo`, which are rooted only
  // relative to the current drive (or are MSYS syntax), not stable env roots.
  return root !== '\\' && root !== '/';
}

/** Build Windows fallback candidates only; callers retain their own PATH lookup,
 *  existence checks, caching, and spawn semantics. */
export function windowsFallbackCandidates(
  command: string,
  env: NodeJS.ProcessEnv = process.env
): string[] {
  const appData = env.APPDATA ?? '';
  const localAppData = env.LOCALAPPDATA ?? '';
  const home = env.USERPROFILE ?? env.HOME ?? '';
  const candidates = [
    `${appData}\\npm\\${command}.cmd`,
    `${appData}\\npm\\${command}`,
    `${localAppData}\\Programs\\claude\\${command}.exe`,
    `${home}\\.claude\\local\\${command}.cmd`,
    `${home}\\.claude\\local\\${command}`
  ];
  const normalizedCommand = command.replace(/\.exe$/i, '').toLowerCase();

  for (const location of WINDOWS_FALLBACK_LOCATIONS) {
    if (!location.commands.includes(normalizedCommand)) continue;
    const root = env[location.root];
    // Provider-specific additions fail closed: an absent, relative, or POSIX
    // root must not turn into a plausible-looking Windows path.
    if (!root || !isAbsoluteWindowsPathWithVolume(root)) continue;
    candidates.push(win32.join(root, ...location.segments));
  }

  return candidates;
}

function whereAsync(command: string): Promise<string | null> {
  return new Promise((resolve) => {
    execFile('where', [command], { encoding: 'utf8', timeout: 3000 }, (_error, stdout) => {
      const resolvedPath = String(stdout ?? '').trim().split(/\r?\n/)[0];
      resolve(resolvedPath && existsSync(resolvedPath) ? resolvedPath : null);
    });
  });
}

/** Resolve many safe command names without blocking (issue #446: the setup
 *  panel used a synchronous login shell per binary, a ~5.6 s main process
 *  freeze). The person asked to look, so the PATH is read again in ONE fresh
 *  login shell, then every name is found by walking its folders, then the
 *  same fallback folders as `resolveCommand`. Missing entries are null. */
export async function resolveCommands(commands: readonly string[]): Promise<Map<string, string | null>> {
  const names = [...new Set(commands.filter((command) => isSafeCommandName(command)))];
  const found = new Map<string, string | null>(names.map((command) => [command, null]));
  if (names.length === 0) return found;

  if (process.platform === 'win32') {
    const paths = await Promise.all(names.map(whereAsync));
    names.forEach((command, i) => found.set(command, paths[i]));
  } else {
    const pathValue = await refreshShellPath();
    for (const command of names) found.set(command, findCommandOnPath(command, pathValue));
  }

  for (const command of names) {
    if (found.get(command)) continue;
    const candidates = process.platform === 'win32'
      ? windowsFallbackCandidates(command)
      : commonBinDirs(process.env.HOME ?? '').map((d) => `${d}/${command}`);
    for (const candidate of candidates) {
      if (candidate && existsSync(candidate)) { found.set(command, candidate); break; }
    }
  }
  return found;
}

export function resolveCommand(command: string): string {
  // Already an absolute/relative path (Unix `/` or Windows `\`) — pass through.
  if (command.includes('/') || command.includes('\\')) return command;
  // Not a plain command name → nothing to resolve. Returned unchanged so the
  // caller's spawn ENOENTs it, and no shell ever sees it.
  if (!isSafeCommandName(command)) return command;
  if (process.platform === 'win32') {
    // `where` is the Windows equivalent of `which`. No `shell:true`: the command
    // is already proven metacharacter-free above, and running `where` directly
    // (libuv resolves it to where.exe via PATHEXT) keeps cmd.exe out of the loop.
    try {
      const res = spawnSync('where', [command], { encoding: 'utf8', timeout: 3000 });
      const path = (res.stdout ?? '').trim().split(/\r?\n/)[0];
      if (path && existsSync(path)) return path;
    } catch { /* fall through */ }
    const winCandidates = windowsFallbackCandidates(command);
    for (const c of winCandidates) if (existsSync(c)) return c;
    return command;
  }
  const onPath = findCommandOnPath(command, userShellPath());
  if (onPath) return onPath;
  const candidates = commonBinDirs(process.env.HOME ?? '').map((d) => `${d}/${command}`);
  for (const c of candidates) if (existsSync(c)) return c;
  return command;
}
