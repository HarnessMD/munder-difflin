/**
 * 0.5.6: one MemPalace process at a time on this machine.
 *
 * Every `mempalace search` (and the app's own `mempalace mine`) is a new
 * Python process that loads the store and the embedding model, 270 MB to
 * 1.5 GB each. Nothing stopped a burst of agents from starting several at
 * once, which fills the memory of an 8 GB Mac.
 *
 * The gate below is a small stdlib only script run by MemPalace's own Python.
 * It takes a kernel lock on a file (fcntl.flock, or msvcrt.locking on
 * Windows), then runs the real mempalace with the same arguments, passing
 * stdout, stderr and the exit code through. The system drops the lock when
 * the gate ends in any way (exit, crash, kill), so it never goes stale. A
 * waiter only polls the lock; it never imports MemPalace.
 *
 * One lock per store: `<palace>.lock`, beside the folder MEMPALACE_PALACE_PATH
 * names. Beside, not inside: the store folder is renamed aside once in 0.5.6
 * (palaceScope.ts), and a lock inside would move with it. The app creates the
 * file (memory.ts), because a sandboxed agent may write the store folder but
 * not its parent; the gate can still lock a file it can only read.
 *
 * Agents run it as `md-memory` (written to the hive's runtime bin dir, beside
 * the `mempalace` shim): wait up to 60 s, then print MEMORY_BUSY_LINE and exit
 * 0; a run past 180 s is stopped. The app's own runs (memory.ts) pass the
 * same script with `-c` and their own wait and limit through the env.
 */
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readSync, realpathSync, writeFileSync, chmodSync } from 'node:fs';
import { posix, win32 } from 'node:path';

/** What a waiter prints when the lock stayed busy, then exits 0. */
export const MEMORY_BUSY_LINE = 'MemPalace is busy with another search. Carry on without it, or try again in a minute.';

/** Exit code the app's own runs ask for when the lock stayed busy
 *  (MD_MEMORY_BUSY_EXIT), so a mine that never started is not counted done. */
export const MEMORY_GATE_BUSY_EXIT = 75;

/** The gate. Stdlib only, Python 3.6 and up. Run with `-I -S` so nothing from
 *  the agent's folder or the environment is imported. */
export const MEMORY_GATE_SCRIPT = String.raw`# md-memory gate, written by Munder Difflin. The app rewrites this file.
# Runs MemPalace under one lock per search store, so only one MemPalace
# process loads its model at a time on this machine. The lock is a kernel lock
# on a file (flock, or msvcrt.locking on Windows): the system drops it when
# this process ends in any way, so it never goes stale.
#
# python -I -S md-memory-gate.py <lock when MEMPALACE_PALACE_PATH is unset> <mempalace> [args...]
# MD_MEMORY_WAIT_SECONDS   how long to wait for the lock (60)
# MD_MEMORY_LIMIT_SECONDS  how long MemPalace may run once started; 0 is no limit (180)
# MD_MEMORY_BUSY_EXIT      exit code when the lock stayed busy (0)
import errno
import os
import signal
import subprocess
import sys
import time

BUSY = "MemPalace is busy with another search. Carry on without it, or try again in a minute."
STATE = {"child": None, "signal": None}


def seconds(name, default):
    try:
        value = float(os.environ.get(name, ""))
    except ValueError:
        return default
    return value if value >= 0 else default


def lock_path(fallback):
    palace = os.environ.get("MEMPALACE_PALACE_PATH", "")
    if not palace:
        return fallback
    return (palace.rstrip("/\\") or palace) + ".lock"


def open_lock(path):
    try:
        return os.open(path, os.O_RDWR | os.O_CREAT, 0o666)
    except OSError:
        pass
    try:
        # A sandboxed agent can read the lock file the app made but not create one.
        return os.open(path, os.O_RDONLY)
    except OSError:
        return None


def try_lock(fd):
    # True: held. False: another process holds it. None: locks do not work here.
    if os.name == "nt":
        import msvcrt
        try:
            os.lseek(fd, 0, os.SEEK_SET)
            msvcrt.locking(fd, msvcrt.LK_NBLCK, 1)
            return True
        except OSError as e:
            return False if e.errno in (errno.EACCES, errno.EDEADLK) else None
    import fcntl
    try:
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        return True
    except OSError as e:
        return False if e.errno in (errno.EAGAIN, errno.EWOULDBLOCK, errno.EACCES) else None


def on_signal(signum, frame):
    child = STATE["child"]
    if child is None:
        os._exit(128 + signum)
    STATE["signal"] = signum
    try:
        child.send_signal(signum)
    except (OSError, ValueError):
        pass


def stop(child):
    if child.poll() is not None:
        return
    try:
        child.terminate()
    except OSError:
        pass
    try:
        child.wait(timeout=3)
    except subprocess.TimeoutExpired:
        try:
            child.kill()
        except OSError:
            pass
        child.wait()


def run(cmd, limit):
    try:
        child = subprocess.Popen(cmd)
    except OSError as e:
        sys.stderr.write("md-memory could not start MemPalace: %s\n" % e)
        return 127
    STATE["child"] = child
    started = time.monotonic()
    while True:
        try:
            code = child.wait(timeout=0.25)
            break
        except subprocess.TimeoutExpired:
            pass
        if STATE["signal"] is not None:
            stop(child)
            return 128 + STATE["signal"]
        if limit > 0 and time.monotonic() - started >= limit:
            stop(child)
            sys.stderr.write("MemPalace ran past its %g second limit and was stopped. Carry on without it.\n" % limit)
            return 124
    return 128 - code if code < 0 else code


def main(argv):
    if len(argv) < 3:
        sys.stderr.write("md-memory: the app did not say where mempalace is.\n")
        return 2
    for name in ("SIGTERM", "SIGINT", "SIGHUP"):
        sig = getattr(signal, name, None)
        if sig is not None:
            try:
                signal.signal(sig, on_signal)
            except (OSError, ValueError):
                pass
    fallback, cmd = argv[1], argv[2:]
    wait = seconds("MD_MEMORY_WAIT_SECONDS", 60.0)
    limit = seconds("MD_MEMORY_LIMIT_SECONDS", 180.0)
    try:
        busy_exit = int(os.environ.get("MD_MEMORY_BUSY_EXIT", "0"))
    except ValueError:
        busy_exit = 0
    fd = open_lock(lock_path(fallback))
    held = None if fd is None else try_lock(fd)
    deadline = time.monotonic() + wait
    while held is False:
        left = deadline - time.monotonic()
        if left <= 0:
            sys.stdout.write(BUSY + "\n")
            sys.stdout.flush()
            return busy_exit
        time.sleep(min(0.2, left))
        held = try_lock(fd)
    # Held, or this system cannot lock the file at all: then MemPalace runs as
    # it did before the gate. fd stays open until this process ends.
    return run(cmd, limit)


if __name__ == "__main__":
    sys.exit(main(sys.argv))
`;

/** The lock file for a store: `<palace>.lock`, beside it. Same rule as the
 *  gate's lock_path, so the app and every agent lock one file. */
export function palaceLockPath(palace: string): string {
  return `${palace.replace(/[\\/]+$/, '') || palace}.lock`;
}

/** Create the lock file when it is missing. Best effort: the gate creates it
 *  too when it can, and runs as before when no lock file can be opened. */
export function ensureLockFile(path: string): void {
  try {
    if (!existsSync(path)) closeSync(openSync(path, 'a'));
  } catch { /* parent missing or not writable */ }
}

/** The interpreter named on a script's #! line, as an argv prefix, or null.
 *  Knows the plain form, `/usr/bin/env python3`, and the /bin/sh launcher pip
 *  and uv write when the Python path has a space or is very long. */
function shebangPython(bin: string): string[] | null {
  let head = '';
  try {
    const fd = openSync(bin, 'r');
    try {
      const buf = Buffer.alloc(2048);
      head = buf.subarray(0, readSync(fd, buf, 0, buf.length, 0)).toString('utf8');
    } finally { closeSync(fd); }
  } catch { return null; }
  if (!head.startsWith('#!')) return null;
  const first = head.slice(2).split('\n')[0].trim();
  const parts = first.split(/\s+/).filter(Boolean);
  if (!parts.length) return null;
  if (/(^|\/)(ba|da)?sh$/.test(parts[0])) {
    // '''exec' "/path with space/python" "$0" "$@"
    const m = /^'''exec' (?:"([^"]+)"|'([^']+)'|(\S+)) "\$0" "\$@"/m.exec(head);
    const py = m ? (m[1] ?? m[2] ?? m[3]) : null;
    return py && posix.isAbsolute(py) && existsSync(py) ? [py] : null;
  }
  if (/(^|\/)env$/.test(parts[0])) {
    const name = parts.slice(1).find((p) => !p.startsWith('-'));
    return name && /python/.test(name) ? [parts[0], name] : null;
  }
  return posix.isAbsolute(parts[0]) && existsSync(parts[0]) ? [parts[0]] : null;
}

/**
 * MemPalace's own Python, as the argv prefix that runs the gate, or null.
 *
 * macOS and Linux: the #! line of the mempalace script (a uv tool's is its own
 * `<tool>/bin/python`), else a python beside the real file. Windows: the
 * python.exe in the tool's Scripts folder. `~\.local\bin\mempalace.exe` is a
 * copy of uv's launcher, not a link, so the uv tools folder is looked in too,
 * and a pip install's `<Python>\Scripts\mempalace.exe` has python.exe one up.
 */
export function gatePython(
  bin: string,
  platform: NodeJS.Platform = process.platform,
  env: NodeJS.ProcessEnv = process.env
): string[] | null {
  if (platform === 'win32') {
    const dir = win32.dirname(bin);
    const candidates = [win32.join(dir, 'python.exe')];
    try { candidates.push(win32.join(win32.dirname(realpathSync(bin)), 'python.exe')); } catch { /* gone */ }
    if (env.UV_TOOL_DIR) candidates.push(win32.join(env.UV_TOOL_DIR, 'mempalace', 'Scripts', 'python.exe'));
    if (env.APPDATA) {
      candidates.push(win32.join(env.APPDATA, 'uv', 'data', 'tools', 'mempalace', 'Scripts', 'python.exe'));
      candidates.push(win32.join(env.APPDATA, 'uv', 'tools', 'mempalace', 'Scripts', 'python.exe'));
    }
    candidates.push(win32.join(win32.dirname(dir), 'python.exe'));
    const found = candidates.find((c) => { try { return existsSync(c); } catch { return false; } });
    return found ? [found] : null;
  }
  const fromShebang = shebangPython(bin);
  if (fromShebang) return fromShebang;
  try {
    const dir = posix.dirname(realpathSync(bin));
    for (const name of ['python3', 'python']) {
      const p = posix.join(dir, name);
      if (existsSync(p)) return [p];
    }
  } catch { /* gone */ }
  return null;
}

/** Wait and limit for one gated run, in seconds; unset keeps the gate's own
 *  60 s and 180 s. limitSeconds 0 is no limit. */
export interface GateOptions {
  waitSeconds?: number;
  limitSeconds?: number;
  busyExit?: number;
}

/** The env entries that carry GateOptions to the gate. */
export function gateEnv(opts: GateOptions = {}): Record<string, string> {
  const out: Record<string, string> = {};
  if (opts.waitSeconds !== undefined) out.MD_MEMORY_WAIT_SECONDS = String(opts.waitSeconds);
  if (opts.limitSeconds !== undefined) out.MD_MEMORY_LIMIT_SECONDS = String(opts.limitSeconds);
  if (opts.busyExit !== undefined) out.MD_MEMORY_BUSY_EXIT = String(opts.busyExit);
  return out;
}

/** How the app runs `mempalace <args>` under the gate: MemPalace's Python with
 *  the gate passed by `-c`. Null when no Python was found; the caller then runs
 *  mempalace directly, as before the gate. */
export function gatedCommand(
  bin: string,
  args: string[],
  fallbackLock: string,
  platform: NodeJS.Platform = process.platform
): { command: string; args: string[] } | null {
  const py = gatePython(bin, platform);
  if (!py) return null;
  return { command: py[0], args: [...py.slice(1), '-I', '-S', '-c', MEMORY_GATE_SCRIPT, fallbackLock, bin, ...args] };
}

const shQuote = (s: string): string => `'${s.replace(/'/g, `'\\''`)}'`;
const cmdQuote = (s: string): string => `"${s.replace(/%/g, '%%')}"`;

/** The files `md-memory` is made of, for a runtime bin dir. Pure (beyond
 *  finding Python), so a test can read every body. */
export function memoryGateFiles(
  dir: string,
  bin: string,
  platform: NodeJS.Platform = process.platform,
  env: NodeJS.ProcessEnv = process.env
): Array<{ name: string; body: string; executable: boolean }> {
  const win = platform === 'win32';
  const path = win ? win32 : posix;
  const gate = path.join(dir, 'md-memory-gate.py');
  const fallback = path.join(dir, 'md-memory.lock');
  const py = gatePython(bin, platform, env);
  const head = '#!/bin/sh\n# md-memory: runs mempalace one at a time on this machine. Written by Munder Difflin.\n';
  // Git Bash on Windows runs this one; it wants forward slashes.
  const sh = (p: string): string => shQuote(win ? p.replace(/\\/g, '/') : p);
  const shBody = py
    ? `${head}exec ${[...py.map(sh), '-I', '-S', sh(gate), sh(fallback), sh(bin)].join(' ')} "$@"\n`
    : `${head}# No Python was found for the lock, so this runs mempalace directly.\nexec ${sh(bin)} "$@"\n`;
  const files = [
    { name: 'md-memory-gate.py', body: MEMORY_GATE_SCRIPT, executable: false },
    { name: 'md-memory', body: shBody, executable: true }
  ];
  if (win) {
    const line = py
      ? `${[...py.map(cmdQuote), '-I', '-S', cmdQuote(gate), cmdQuote(fallback), cmdQuote(bin)].join(' ')} %*`
      : `${cmdQuote(bin)} %*`;
    files.push({ name: 'md-memory.cmd', body: `@echo off\r\n${line}\r\nexit /b %ERRORLEVEL%\r\n`, executable: false });
  }
  return files;
}

/** Write `md-memory` (and `md-memory.cmd` on Windows) and the gate into `dir`,
 *  each only when its content changed, and the hive fallback lock file. */
export function writeMemoryGate(
  dir: string,
  bin: string,
  platform: NodeJS.Platform = process.platform,
  env: NodeJS.ProcessEnv = process.env
): void {
  mkdirSync(dir, { recursive: true });
  for (const f of memoryGateFiles(dir, bin, platform, env)) {
    const p = (platform === 'win32' ? win32 : posix).join(dir, f.name);
    if (existsSync(p) && readFileSync(p, 'utf8') === f.body) continue;
    writeFileSync(p, f.body, 'utf8');
    if (f.executable && platform !== 'win32') chmodSync(p, 0o755);
  }
  ensureLockFile((platform === 'win32' ? win32 : posix).join(dir, 'md-memory.lock'));
}
