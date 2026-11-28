import * as pty from 'node-pty';
import type { PtyOwner } from '../core/host';
export type { PtyOwner };
import { existsSync, readFileSync, statSync } from 'node:fs';
import { delimiter, join, win32 } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ensureKilled, hardKillTree } from './procKill';
import type { AgentLedger } from './staleAgents';
import { expandTilde } from './fs';
import { buildPtyEnv } from './ptyEnv';
import { commonBinDirs, findCommandOnPath, forgetShellLookups, isSafeCommandName, shellPathGeneration, userShellPath, windowsFallbackCandidates } from './shellEnv';

/** APPEND the hive's bundled-node dir (`<HIVE_ROOT>/bin/runtime`, which holds a
 *  shim literally named `node`) to a child's PATH.
 *
 *  Layer 1 routed the commands WE generate through `hive-node`. This covers the
 *  ones we don't: an MCP server declared as `node ./server.js`, a provider CLI
 *  that shells out to node, a helper script the agent wrote itself. With no
 *  system node those all die with 127 — the same bug, one level down.
 *
 *  APPENDED, never prepended: a user who has their own node keeps it, and we are
 *  only the fallback. Prepending would silently swap the node version under the
 *  user's own projects for Electron's, which is a different (and wrong) product
 *  decision. No-ops when there is no hive root or the dir was never written. */
export function withHiveRuntimeFallback(path: string, hiveRoot?: string): string {
  if (!hiveRoot) return path;
  const dir = join(hiveRoot, 'bin', 'runtime');
  if (!existsSync(dir)) return path;
  const entries = path.split(delimiter).filter(Boolean);
  if (entries.includes(dir)) return path; // re-spawn of a live agent
  return [...entries, dir].join(delimiter);
}

/** How much trailing PTY output to retain per session for crash diagnostics.
 *  Big enough for a stack trace or a panic banner, small enough that N idle
 *  agents cost kilobytes, not megabytes. */
const TAIL_MAX = 8192;

/** Output coalescing (see `flushOutput`). One animation frame: long enough to
 *  collapse a TUI's redraw burst into a single IPC message, short enough that
 *  typing still echoes at once. */
const OUTPUT_FLUSH_MS = 16;
/** Flush at once when this much has built up, so a large burst (a build log, a
 *  `cat` of a big file) is never held back by the timer. */
const OUTPUT_FLUSH_BYTES = 64 * 1024;

/** What the exit handler is told about a process that just died. Passed by
 *  value because the session is deleted from the map before the handler runs. */
export interface PtyExitInfo {
  signal?: number;
  tail?: string;
  command?: string;
  cwd?: string;
  /** Epoch ms the process was spawned, so the exit handler can bucket the
   *  run's length (`agent_run_ended`, 0.5.1). A number and nothing else, which
   *  is why it is the one field besides `signal` that telemetry may read:
   *  `tail` is raw terminal output, `command` a command line and `cwd` a
   *  path, and none of those may leave the machine (TELEMETRY.md). */
  startedAt?: number;
}

interface PtySession {
  id: string;
  proc: pty.IPty;
  cwd: string;
  command: string;
  /** The window (webContents) that spawned this PTY and should receive its
   *  output. Multi-window: each floor owns its own terminals, so `pty:data:<id>`
   *  / `pty:exit:<id>` route ONLY here — never broadcast — so one floor's stream
   *  never leaks into another. Null falls back to the default attached sink
   *  (the primary window), preserving single-window behavior. */
  owner: PtyOwner | null;
  /** Epoch ms of the most recent byte this PTY emitted (bumped in onData). The
   *  heartbeat (Lane A #1) reads this for two things: floor-quiet detection (an
   *  agent printing/thinking counts as activity even before it writes a hive
   *  file) and the idle handshake that gates god's PTY nudge (never type into a
   *  PTY that produced output in the last few seconds = mid-stream). */
  lastOutputAt: number;
  /** Epoch ms of the spawn. Only ever subtracted from Date.now() at exit, for
   *  the run's coarse duration bucket. */
  startedAt: number;
  /** A bounded ring of the most recent output bytes, kept ONLY so an abnormal
   *  exit can say what was on screen when the process died. A provider that
   *  crashes on startup (Bun SIGILL, a missing shared library, an auth failure)
   *  prints its explanation and vanishes; without this the explanation exists
   *  nowhere but a terminal pane the operator may never have been looking at.
   *  Capped at TAIL_MAX so a chatty agent cannot grow it without bound. */
  tail: string;
  /** True after the child has emitted at least one frame. Automation waits for
   *  this before typing, so startup prompts cannot outrun the TUI subscription. */
  hasOutput: boolean;
  /** Output held since the last flush, and the timer that will send it. See
   *  `flushOutput` for why the stream is coalesced rather than forwarded chunk
   *  by chunk. Only the IPC packaging waits: hasOutput, lastOutputAt, tail and
   *  the data hook all still move on every chunk. */
  pending: string;
  flushTimer: NodeJS.Timeout | null;
}

export interface SpawnOptions {
  id: string;
  cwd: string;
  command: string;       // e.g. 'claude'
  args?: string[];
  cols?: number;
  rows?: number;
  /** Extra environment for the child (merged over the resolved shell env). */
  env?: Record<string, string>;
  /** When set, run this string as a VISIBLE shell script instead of resolving/
   *  spawning `command`. Used by the missing-CLI auto-install path: the script
   *  (a banner + an install command) streams to the same Terminal tab. Routed
   *  through `$SHELL -lc` on unix and `cmd.exe /d /s /c` on Windows. The script
   *  MUST contain no embedded double-quotes (it is wrapped verbatim on Windows).
   *  `command` is still recorded for display but is not executed. */
  shellScript?: string;
}

/**
 * (#55) Build the single pre-escaped command-line STRING for routing a non-.exe
 * Windows target through cmd.exe. Returns the args portion only (everything after
 * `cmd.exe`), in Node's canonical `child_process` form:
 *
 *   /d /s /c "<target> <arg> <arg> ..."
 *
 * Each token (the resolved target + every user arg) is double-quoted only when it
 * contains a space/tab/quote, then the WHOLE inner command is wrapped in one more
 * outer quote pair. cmd.exe's `/s` strips exactly that outer pair and executes the
 * remainder literally, so a `C:\Program Files\...` target survives its space.
 *
 * This is handed to `pty.spawn(file, args, ...)` as a STRING, which node-pty treats
 * as a pre-escaped CommandLine and passes through VERBATIM (no per-arg re-escaping),
 * so the quoting here is never double-wrapped.
 *
 * ⚠️ LAST-RESORT PATH — DO NOT PUT AN AGENT PROMPT THROUGH IT. Two hard limits of
 * cmd.exe's parser that no amount of escaping here can work around:
 *
 *  1. **cmd.exe has NO backslash escape.** An earlier version of this comment
 *     claimed `\"` was "cmd's quote-escape". It is not: to cmd, `\` is an ordinary
 *     character and every `"` TOGGLES quote state. So `\"` does not embed a quote —
 *     it closes (or opens) the quoted run and dumps everything after it back into
 *     bare, metacharacter-interpreting context. The `\"` produced below survives
 *     only because the CRT of the *final* program un-escapes it; the intermediate
 *     cmd.exe still mis-tracks quote state across it.
 *  2. **A newline can never survive.** cmd.exe treats CR/LF as a statement
 *     separator before quoting is even considered, so a multi-line argument is
 *     TRUNCATED at its first newline and the remainder is executed as commands.
 *     That is exactly how the Windows hive protocol prompt (multi-line, full of
 *     `(`/`)` which cmd reads as block delimiters) was being destroyed: the agent
 *     booted looking healthy but never received the HIVE PROTOCOL block, so it
 *     never knew its inbox/outbox existed and no agent could message another.
 *
 * There is also cmd.exe's ~8191-character command-line ceiling, which the injected
 * hive prompt (~6.1k chars) sits uncomfortably close to.
 *
 * Prompt-carrying spawns therefore go through `parseNpmCmdShim` instead (spawn the
 * shim's real interpreter with an ARRAY of args, so node-pty's own CRT-correct
 * `argsToCommandLine` runs and no shell parser is involved). This function remains
 * the fallback for every target we cannot decode — strictly no worse than before.
 */
export function buildCmdCommandLine(resolved: string, args: string[]): string {
  const quoteToken = (s: string): string => {
    // Escape any embedded double-quote, then quote the token if it needs it.
    // Quote on whitespace/quote AND on cmd.exe metacharacters (& | ^ < > ( ) % !):
    // an unquoted `&`/`|`/etc. would let one token chain a second command once this
    // string is executed by cmd.exe. Quoting neutralizes them — cmd does not
    // interpret metacharacters inside a double-quoted run.
    const escaped = s.replace(/"/g, '\\"');
    return /[ \t"&|^<>()%!]/.test(s) ? `"${escaped}"` : escaped;
  };
  const inner = [resolved, ...args].map(quoteToken).join(' ');
  return `/d /s /c "${inner}"`;
}

/** What an npm-style Windows `.cmd` shim actually runs, decoded from its text. */
export interface NpmShimTarget {
  /** BARE interpreter name — `node`, `bun` or `deno` — to be resolved off PATH by
   *  the caller (kept bare deliberately: see parseNpmCmdShim), or NULL when the
   *  shim runs a native executable directly and there is no interpreter at all. */
  interpreter: string | null;
  /** Absolute, normalized win32 path to the script that interpreter should run —
   *  or to the executable itself when `interpreter` is null. */
  scriptPath: string;
}

/** Interpreters we are willing to spawn directly. Deliberately a tiny allowlist:
 *  anything else (a hand-written batch file, a python/ruby shim, a shape we have
 *  not seen) resolves to null and falls back to the cmd.exe path — never worse
 *  than today's behaviour. */
const SHIM_INTERPRETERS = new Set(['node', 'bun', 'deno']);
/** The shim's target must look like a JS entry point. A shim that points at
 *  something else is not a shape we understand → null. */
const SHIM_SCRIPT_EXT = /\.(?:c|m)?js$/i;

/**
 * Decode an npm-generated Windows `.cmd` shim into the interpreter + script it
 * would have run. PURE (no filesystem, no `process.platform`): it takes the shim's
 * path and its CONTENT so it is unit-testable on macOS/Linux, where every Windows
 * build is authored.
 *
 * WHY THIS EXISTS. On Windows a `.cmd`/`.bat` cannot be handed to CreateProcess,
 * so the spawn path used to route it through `cmd.exe /d /s /c "<line>"`. That
 * turns argv into a single string parsed by cmd.exe — which cannot carry a newline
 * (statement separator), reads `(`/`)` as block delimiters, has no backslash escape,
 * and caps out near 8191 chars. The hive protocol prompt is a ~6.1k-char, 11-line,
 * 62-paren argument, so on Windows it was truncated at its first newline: every
 * npm-installed CLI (OpenCode always; `claude.cmd` whenever there is no native
 * `claude.exe`) started up looking perfectly healthy but never received the HIVE
 * PROTOCOL block, never learned that `inbox/`/`outbox/` existed, and so no agent
 * ever heard from another. Claude appeared to work only because its native
 * `claude.exe` skipped cmd.exe entirely.
 *
 * Spawning the shim's own interpreter with an ARRAY of args removes cmd.exe from
 * the picture: node-pty's `argsToCommandLine` applies MSDN/CRT escaping (backslash
 * doubling before a quote, whole-arg quoting on whitespace) and hands the result
 * straight to CreateProcess, which passes the raw command line to the child. A
 * newline inside a quoted CRT argument is just a character there, and the limit
 * becomes CreateProcess's 32767 rather than cmd's 8191.
 *
 * SHAPES HANDLED (npm's cmd-shim, across its historical revisions; pnpm/yarn emit
 * the same families):
 *
 *   modern (cmd-shim ≥4 / npm ≥7) — dp0 captured into a variable, program chosen
 *   into %_prog%, single trailing exec line:
 *       SET dp0=%~dp0
 *       IF EXIST "%dp0%\node.exe" ( SET "_prog=%dp0%\node.exe" ) ELSE ( SET "_prog=node" … )
 *       endLocal & goto #_undefined_# 2>NUL || title %COMSPEC% & "%_prog%"  "%dp0%\node_modules\pkg\bin\cli.js" %*
 *
 *   classic (cmd-shim 2/3, npm 5/6) — IF/ELSE with the exec inlined in both arms:
 *       @IF EXIST "%~dp0\node.exe" (
 *         "%~dp0\node.exe"  "%~dp0\node_modules\pkg\bin\cli.js" %*
 *       ) ELSE ( … node  "%~dp0\node_modules\pkg\bin\cli.js" %* )
 *
 *   ancient single-line:
 *       @"%~dp0\node.exe"  "%~dp0\node_modules\pkg\bin\cli.js" %*
 *
 * The interpreter is returned BARE (`node`), not as the shim's `%dp0%\node.exe`
 * candidate, on purpose: that candidate only exists for an npm install that ships a
 * colocated node, and that directory is on PATH by construction — so resolving the
 * bare name finds the same binary while also going through the caller's existing
 * PATH/candidate-dir resolution and cache.
 *
 * Returns null — meaning "fall back to the cmd.exe path" — for ANY shape that is
 * not fully understood: unknown interpreter, unexpanded `%VAR%` left in the target,
 * a relative target, extra interpreter flags we would otherwise silently drop, a
 * non-JS target, a file too large to be a shim, or plain garbage.
 */
export function parseNpmCmdShim(shimPath: string, content: string): NpmShimTarget | null {
  if (typeof shimPath !== 'string' || typeof content !== 'string') return null;
  if (!shimPath || !content) return null;
  // A cmd-shim is ~1KB. Anything larger is somebody's real batch script (or a
  // binary someone named `.cmd`) and is not ours to reinterpret.
  if (content.length > 8192 || content.includes('\0')) return null;

  // win32.* explicitly — these paths are Windows paths regardless of the host we
  // are running (or testing) on.
  const dir = win32.dirname(shimPath);
  if (!dir || dir === '.') return null;

  /** Expand a shim token's `%~dp0` / `%dp0%` (the shim's OWN directory, which cmd
   *  expands WITH a trailing backslash) into an absolute, normalized path. Any
   *  other surviving `%` means a variable we did not model → refuse. */
  const expand = (raw: string): string | null => {
    let s = raw.replace(/%~dp0%?|%dp0%/gi, `${dir}\\`);
    if (s.includes('%')) return null;
    if (!s.trim()) return null;
    // `<dir>\` + `\node_modules\…` produces a doubled separator that Windows
    // tolerates; collapse it so the path we hand to existsSync is clean. A leading
    // UNC `\\server\share` prefix must survive that collapse.
    const unc = /^[\\/]{2}/.test(s);
    s = s.replace(/[\\/]+/g, '\\');
    if (unc) s = `\\${s}`;
    if (!win32.isAbsolute(s)) return null;
    return win32.normalize(s);
  };

  // Every `SET "_prog=…"` the shim performs (the IF-EXISTS arm and the PATH arm).
  const progValues: string[] = [];
  for (const m of content.matchAll(/^\s*@?SET\s+"?_prog=([^"\r\n]*)"?/gim)) progValues.push(m[1]);

  // The exec line is the LAST line carrying `%*` (cmd's "forward all args"): in the
  // modern shim that is the single `endLocal & … & "%_prog%" "<script>" %*` line;
  // in the classic IF/ELSE shim it is the ELSE arm, which runs the same script.
  const lines = content.split(/\r?\n/);
  let execLine: string | null = null;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].includes('%*')) { execLine = lines[i]; break; }
  }
  if (!execLine) return null;

  const head = execLine.slice(0, execLine.lastIndexOf('%*'));
  const quoted = [...head.matchAll(/"([^"]*)"/g)].map((m) => ({
    text: m[1],
    start: m.index ?? 0,
    end: (m.index ?? 0) + m[0].length
  }));
  if (quoted.length === 0) return null;

  const scriptTok = quoted[quoted.length - 1];
  // Locate the program token and PROVE nothing sits between it and the script.
  // Interpreter flags baked into a shebang (`#!/usr/bin/env node --flag`) land
  // there; dropping them silently would change how the CLI runs, so we bail out
  // to the cmd.exe fallback instead.
  let progRaw: string;
  if (quoted.length >= 2) {
    const progTok = quoted[quoted.length - 2];
    if (head.slice(progTok.end, scriptTok.start).trim() !== '') return null;
    progRaw = progTok.text;
  } else {
    // Two one-token shapes share this branch, told apart by what precedes the quote.
    const before = head.slice(0, scriptTok.start).trim().replace(/^@/, '').trim();
    if (before === '') {
      // DIRECT-EXECUTABLE shim: nothing before the quoted target, so there is no
      // interpreter — the shim runs a native binary. npm writes this whenever the
      // package's bin has no shebang, which is the norm for a compiled CLI:
      //
      //   "%dp0%\..\opencode-ai\bin\opencode.exe"   %*
      //
      // opencode-ai is exactly that (its bin is ./bin/opencode.exe, a real
      // binary), so EVERY Windows OpenCode install hit this shape, fell through to
      // null, and got the cmd.exe fallback that truncates the hive protocol at its
      // first newline. The agent then booted looking healthy with no idea it had
      // an inbox. Handing the binary straight to CreateProcess with an argv array
      // is strictly better than routing it through cmd.exe — same program, no
      // shell parser in between.
      const exe = expand(scriptTok.text);
      if (!exe) return null;
      // Only a real executable. Anything else here is a shape we have not modelled.
      if (!/\.(exe|com)$/i.test(exe)) return null;
      return { interpreter: null, scriptPath: exe };
    }
    // Classic ELSE arm: `node  "<script>" %*` — the program is an unquoted word.
    const word = before.split(/\s+/).filter(Boolean).pop();
    if (!word || word !== before) return null; // anything else before it → unknown shape
    progRaw = word;
  }

  // `"%_prog%"` → the value the shim SET. Prefer the bare-name arm (the PATH
  // fallback); a `%dp0%\node.exe` value still reduces to the same basename below.
  if (/^%_prog%$/i.test(progRaw)) {
    if (progValues.length === 0) return null;
    progRaw = progValues.find((v) => !/[%\\/]/.test(v)) ?? progValues[progValues.length - 1];
  }
  const interpreter = (progRaw.split(/[\\/]/).pop() ?? '').replace(/\.exe$/i, '').toLowerCase();
  if (!SHIM_INTERPRETERS.has(interpreter)) return null;

  const scriptPath = expand(scriptTok.text);
  if (!scriptPath || !SHIM_SCRIPT_EXT.test(scriptPath)) return null;
  return { interpreter, scriptPath };
}

/** How long the intermediate grid of a redraw stays in place. Long enough for
 *  an idle child to take the first SIGWINCH and read the size; short enough that
 *  the one row wobble is one frame on screen. */
const REDRAW_STEP_MS = 80;

/** A usable cell count: a positive whole number. FitAddon proposes 2 by 1 for
 *  an unsized host and NaN for a hidden one; neither is a pane. */
function validCell(n: unknown): number | undefined {
  return typeof n === 'number' && Number.isInteger(n) && n >= 2 ? n : undefined;
}

/** How long a close waits for a write that is still in the thread pool. */
export const PTY_WRITE_SETTLE_MS = 1_000;

/** The part of node-pty 1.1.0's unix write stream the close below relies on. */
interface PtyWriteStream {
  _writeQueue: unknown[];
  _writeImmediate?: unknown;
  _processWriteQueue: () => void;
}

/** Empty node-pty's write queue, and say whether a write is still in flight
 *  (0.5.6). node-pty 1.1.0 writes with `fs.write(fd)` and retries on EAGAIN,
 *  and its dispose() only clears a waiting retry: a write already in the thread
 *  pool lands, or comes back and retries, on the fd NUMBER after destroy()
 *  closed it, and the next open has taken that number by then. A terminal
 *  spawned in the same tick takes it while its master is still blocking, the
 *  write sleeps in the kernel holding libuv's macOS write lock, and the next
 *  sync file write on the main thread waits forever: the whole app freezes.
 *  It needs unsent input, so a child that stopped reading (a TUI that never
 *  took its prompt). Returns a function that calls `then` once the write in
 *  flight has returned, or null when none is and the fd can close now. */
export function dropPendingPtyWrites(proc: pty.IPty): ((then: () => void) => void) | null {
  try {
    const ws = (proc as unknown as { _writeStream?: PtyWriteStream })._writeStream;
    if (!ws || !Array.isArray(ws._writeQueue) || typeof ws._processWriteQueue !== 'function') return null;
    // A non-empty queue is either waiting on its retry (dispose() clears that)
    // or has its first write in the thread pool.
    const inFlight = ws._writeQueue.length > 0 && ws._writeImmediate === undefined;
    ws._writeQueue.length = 0;
    if (!inFlight) return null;
    return (then) => {
      let done = false;
      const settle = (): void => { if (!done) { done = true; clearTimeout(timer); then(); } };
      // node-pty calls this when the write returns (now, or one tick later on
      // EAGAIN). It does not on any other error: the timer covers that.
      ws._processWriteQueue = settle;
      const timer = setTimeout(settle, PTY_WRITE_SETTLE_MS);
      timer.unref?.();
    };
  } catch { return null; /* a node-pty without this queue has nothing to drop */ }
}

/** Close a PTY's master fd on demand. node-pty's public IPty hides destroy():
 *  kill() only SIGNALS the child, and the master fd stays open until node-pty's
 *  internal exit, EIO or timeout close chain runs. When that chain stalls (the
 *  slave still held by a grandchild, or an exit event that never fires) the fd
 *  leaks. macOS caps the whole SYSTEM at kern.tty.ptmx_max (511) ptys; enough
 *  leaked masters and EVERY later spawn (agent terminals and, until 0.5.6,
 *  hidden condense checks) dies with node-pty's errno-less
 *  "posix_spawnp failed.". destroy()
 *  is idempotent here: on an already-closed terminal the socket 'close' event
 *  never fires again, so its deferred SIGHUP is skipped and only the dead fd
 *  is closed. Never call this on a session whose child is still meant to live:
 *  destroy() HUPs the foreground process group as the socket closes. */
export function forceClosePty(proc: pty.IPty, platform: NodeJS.Platform = process.platform): void {
  // Windows: node-pty 1.1.0's windowsTerminal destroy() calls kill() again, so
  // after our own kill() it would re-run the agent kill and the native kill on a
  // closed handle. The leak this fixes is the macOS pty cap; leave Windows alone.
  if (platform === 'win32') return;
  const destroy = (): void => {
    try { (proc as unknown as { destroy?: () => void }).destroy?.(); } catch { /* already closed */ }
  };
  // The fd number must not be free while a write to it is still in the thread
  // pool: close once that write has returned (see dropPendingPtyWrites).
  const afterWrite = dropPendingPtyWrites(proc);
  if (afterWrite) afterWrite(destroy); else destroy();
}

export class PtyManager {
  private sessions = new Map<string, PtySession>();
  /** Dead-session reaper timer (lazy-started on first spawn, cleared by
   *  killAll). node-pty's close chain occasionally never completes: the app
   *  then holds a master fd for a child that no longer exists, and masters
   *  accumulate toward the system pty cap. The reaper bounds that. */
  private reaper: NodeJS.Timeout | null = null;
  private static readonly REAPER_INTERVAL_MS = 60_000;
  /** Durable record of the PTYs this run started, so a run that never gets to
   *  quit can be cleaned up by the NEXT one. Optional: the manager works
   *  without it, and every call is guarded, so a ledger failure can never break
   *  a spawn. See staleAgents.ts. */
  private ledger: AgentLedger | null = null;
  /** THE GRID THE RENDERER LAST ASKED FOR, per pty id, alive or not (0.5.3,
   *  founder 24 Sep: Claude Code drew at about 70% of the pane). The visible
   *  xterm is the only thing that knows how many cells fit the pane, and it
   *  says so through resize(). But the pane is often measured BEFORE its
   *  process exists: a restored orchestrator row mounts while his spawn is
   *  still provisioning, a new agent's screen opens before its spawn answers,
   *  a restart kills and respawns under the same id. resize() used to answer
   *  "no pty" and forget, the spawn then took the caller's placeholder (100
   *  by 30), and the renderer never repeated itself because its own grid had
   *  not changed. The TUI stayed 100 columns wide in a 136 column pane.
   *
   *  So the ask is kept here and a spawn under that id starts at it; the
   *  placeholder is only for a pane nobody has measured yet. The renderer
   *  stays the truth: every later fit that moves the grid lands here too. */
  private wanted = new Map<string, { cols: number; rows: number }>();
  private webContents: PtyOwner | null = null;
  /** Fired when a PTY exits on its OWN (child finished/crashed/killed
   *  externally), so the main process can run the SAME lifecycle teardown
   *  (archive, worktree removal, map cleanup) that the explicit kill() path
   *  runs. Best-effort — set once by the main process. */
  private exitHandler:
    ((id: string, exitCode?: number, info?: PtyExitInfo) => void) | null = null;

  /** The default/fallback output sink — set to the PRIMARY window. Used only for
   *  sessions with no recorded owner; owned sessions route to their owner. */
  attachWebContents(wc: PtyOwner) {
    this.webContents = wc;
  }

  /** Attach the stale agent ledger. Set once at startup, after the previous
   *  run's ledger was taken off disk. */
  setLedger(ledger: AgentLedger): void {
    this.ledger = ledger;
  }

  private forgetPid(pid: number): void {
    try { this.ledger?.remove(pid); } catch { /* best effort */ }
  }

  /** Count live PTYs owned by a given window — used to scope a floor's
   *  close-confirmation to its OWN terminals, not the whole app's. */
  countByOwner(wc: PtyOwner): number {
    let n = 0;
    for (const s of this.sessions.values()) if (s.owner === wc) n++;
    return n;
  }

  /** Kill every PTY owned by a window (its onExit runs the normal teardown:
   *  archive + worktree cleanup). Called when a floor window closes so its
   *  terminals don't linger as orphaned processes writing to a dead webContents. */
  killByOwner(wc: PtyOwner): void {
    for (const [id, s] of [...this.sessions.entries()]) {
      if (s.owner === wc) {
        try {
          const pid = s.proc.pid;
          s.proc.kill();
          ensureKilled(pid);
          forceClosePty(s.proc);
        } catch { /* already gone */ }
        // The sink is closing with the window: cancel the flush rather than
        // aim it at a webContents that is about to be destroyed.
        this.dropOutput(s);
        void id;
      }
    }
  }

  /** Release sessions whose child is already dead but whose exit event (and
   *  with it node-pty's master fd close) never fired. kill(pid, 0) probes
   *  liveness without signalling: ESRCH means gone (a zombie still answers,
   *  but node-pty's waiter thread reaps those). The dead session gets the
   *  SAME lifecycle teardown as a natural exit, then its fd is force-closed.
   *  A pid reused by an unrelated process in the gap reads as alive and is
   *  simply swept on a later pass: the leak is bounded, never unbounded.
   *  Public so a test can drive one pass without waiting for the timer. */
  reapDeadSessions(): string[] {
    const reaped: string[] = [];
    for (const [id, s] of [...this.sessions.entries()]) {
      let alive = true;
      try { process.kill(s.proc.pid, 0); } catch (e) {
        // EPERM means the pid exists but belongs to someone else: alive.
        alive = (e as NodeJS.ErrnoException)?.code === 'EPERM';
      }
      if (alive) continue;
      // Same order as a natural exit: the last output, then the terminal's own
      // exit event (an open terminal shows the end), then the teardown.
      this.flushOutput(s);
      this.safeSend(`pty:exit:${id}`, { exitCode: undefined, signal: undefined }, s.owner);
      this.sessions.delete(id);
      forceClosePty(s.proc);
      this.forgetPid(s.proc.pid);
      reaped.push(id);
      try {
        this.exitHandler?.(id, undefined, {
          startedAt: s.startedAt,
          tail: s.tail,
          command: s.command,
          cwd: s.cwd
        });
      } catch { /* never throw out of the reaper */ }
    }
    return reaped;
  }

  /** Register the natural-exit teardown callback. Invoked from inside node-pty's
   *  onExit after the session is cleaned up. The exit code is forwarded so the
   *  handler can distinguish a clean exit (e.g. a successful first-time CLI
   *  install → auto restart-and-continue) from a crash. */
  setExitHandler(
    handler: (id: string, exitCode?: number, info?: PtyExitInfo) => void
  ): void {
    this.exitHandler = handler;
  }

  /** A tap on every pty's output, after it was routed to its window (I2: the
   *  sign in watcher reads a fresh CLI's prompt from it). One hook, cheap,
   *  never throws into node-pty's callback. */
  private dataHook?: (id: string, data: string) => void;
  setDataHook(hook: ((id: string, data: string) => void) | undefined): void { this.dataHook = hook; }

  /** Buffer a chunk and make sure a flush is scheduled.
   *
   *  node-pty emits one callback per read, and an agent CLI redrawing a TUI
   *  produces a long train of tiny writes. Forwarding each one as its own
   *  `pty:data:<id>` cost a structured clone, an IPC hop and a separate
   *  renderer main thread task PER CHUNK, for every session at once, whether
   *  or not its terminal was even on screen. With a handful of busy agents that
   *  is enough main thread work to starve the renderer: the office floor stops
   *  painting and the window stops answering the compositor's ping.
   *
   *  Coalescing changes only the packaging, never the bytes or their order. */
  private queueOutput(session: PtySession, chunk: string): void {
    session.pending += chunk;
    if (session.pending.length >= OUTPUT_FLUSH_BYTES) { this.flushOutput(session); return; }
    if (session.flushTimer) return;
    session.flushTimer = setTimeout(() => this.flushOutput(session), OUTPUT_FLUSH_MS);
    // A pending flush must never hold the process open at quit.
    session.flushTimer.unref?.();
  }

  /** Send everything buffered for a session as one message. Safe to call at any
   *  time, including on an already drained or already dead session. */
  private flushOutput(session: PtySession): void {
    if (session.flushTimer) { clearTimeout(session.flushTimer); session.flushTimer = null; }
    const data = session.pending;
    if (!data) return;
    session.pending = '';
    this.safeSend(`pty:data:${session.id}`, data, session.owner);
  }

  /** Forget buffered output without sending it (its window is going away). */
  private dropOutput(session: PtySession): void {
    if (session.flushTimer) { clearTimeout(session.flushTimer); session.flushTimer = null; }
    session.pending = '';
  }

  /** Send to the renderer only if it's still alive. During app quit, killing a
   *  PTY fires onExit asynchronously — by then app.quit() may have destroyed the
   *  window, and `.send()` on a destroyed webContents throws "Object has been
   *  destroyed", which surfaces as the main-process crash dialog. Guard it. */
  private safeSend(channel: string, payload: unknown, target?: PtyOwner | null): void {
    // Route to the session's owner window when known (multi-window: keeps each
    // floor's stream private); fall back to the default attached sink otherwise.
    const wc = target ?? this.webContents;
    if (!wc || wc.isDestroyed()) return;
    try { wc.send(channel, payload); } catch { /* window tore down mid-send */ }
  }

  /** Whether an engine CLI is actually installed/locatable on this machine.
   *  Used PRE-SPAWN by the missing-CLI auto-install path: a bare `claude`/`codex`
   *  that resolveCommand can't locate would otherwise be spawned and die with
   *  "process exited (code 1)". Reuses the exact same `which`/`where` +
   *  candidate-dir logic as spawn(), so detection and spawning never disagree. */
  /** The environment a child spawned with this agent env would get (same user
   *  PATH and the same strip as spawn()), for a short helper that must see
   *  exactly what the agent sees: the sign in check (batch 2). */
  childEnv(agentEnv?: Record<string, string>): Record<string, string> {
    const userPath = withHiveRuntimeFallback(
      process.platform === 'win32' ? (process.env.PATH || '') : userShellPath(),
      agentEnv?.HIVE_ROOT
    );
    return buildPtyEnv(process.env, userPath, agentEnv);
  }

  /** Look again from scratch: a fresh login shell PATH and no cached `which`.
   *  Called when a CLI may have just been installed where the startup lookup
   *  could not see it (an install ended; manual setup's Start, batch 4). */
  forgetLookups(): void {
    forgetShellLookups();
    this.resolvedCommands.clear();
  }

  isCommandAvailable(command: string): boolean {
    return this.resolveCommand(command).found;
  }

  /** The absolute path a bare command resolves to for THIS user, or null when it
   *  isn't installed. Same resolution + cache as spawn(), so a caller that probes
   *  a binary (e.g. `node --version`, to decide whether it is too old to keep)
   *  inspects exactly the executable an agent would have run. */
  commandPath(command: string): string | null {
    const r = this.resolveCommand(command);
    return r.found ? r.path : null;
  }

  /** Session cache of SUCCESSFUL command resolutions, each good for the PATH
   *  it was made against (`gen`): a lookup made before the login shell
   *  answered is made again once it has. A miss is a walk of the PATH's
   *  folders, no shell (0.5.5, Plan G; it used to boot a blocking login shell
   *  per command). Negatives are deliberately NOT cached: the missing-CLI
   *  auto-install path must see a just-installed binary on its re-check. */
  private readonly resolvedCommands = new Map<string, { path: string; found: boolean; gen: number }>();

  /** Resolve a bare command (e.g. 'claude') against the user's PATH +
   *  common install locations. Needed because Electron's spawn env on
   *  macOS launches without the user's interactive shell PATH. Returns the
   *  best path AND whether an existing executable was actually located (`found`):
   *  when nothing is found, `path` falls back to the bare command (spawn would
   *  ENOENT) and `found` is false — the signal the missing-CLI path keys on. */
  private resolveCommand(command: string): { path: string; found: boolean } {
    const cached = this.resolvedCommands.get(command);
    const gen = shellPathGeneration();
    // Trust a positive hit only while the binary still exists (uninstall/update
    // between spawns must re-probe rather than hand out a dead path) and the
    // PATH it was found on is still the one in use.
    if (cached && cached.gen === gen && existsSync(cached.path)) return cached;
    const res = this.resolveCommandUncached(command);
    if (res.found) this.resolvedCommands.set(command, { ...res, gen });
    else this.resolvedCommands.delete(command);
    return res;
  }

  private resolveCommandUncached(command: string): { path: string; found: boolean } {
    // Already an absolute/relative path (Unix `/` or Windows `\`) — pass through;
    // `found` reflects whether that path actually exists on disk.
    if (command.includes('/') || command.includes('\\')) return { path: command, found: existsSync(command) };
    // Only a plain command name is resolved against PATH. Anything else is
    // refused here so it never reaches `which`/`where`; `found:false` makes the
    // caller treat it as missing.
    if (!isSafeCommandName(command)) return { path: command, found: false };
    if (process.platform === 'win32') {
      // `where` is the Windows equivalent of `which`.
      // It can return MULTIPLE matches in PATH order; the first is often an
      // EXTENSIONLESS shim (bare `claude`). Skip extensionless hits and take
      // the first PATHEXT-eligible one (.CMD/.BAT/.EXE/…). NOTE: even .CMD/.BAT
      // files are not directly spawnable by node-pty's CreateProcess (error 193);
      // spawn() either decodes the shim to its real interpreter or, failing that,
      // routes it through `cmd.exe /c` (see resolveWindowsShimSpawn below).
      try {
        // No `shell:true`: `command` is proven metacharacter-free above, and
        // running `where` directly keeps cmd.exe from re-parsing the argument.
        const res = spawnSync('where', [command], { encoding: 'utf8', timeout: 3000 });
        const lines = (res.stdout ?? '').trim().split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        const pathExts = (process.env.PATHEXT ?? '.COM;.EXE;.BAT;.CMD')
          .split(';').map((e) => e.trim().toUpperCase()).filter(Boolean);
        const isExecutable = (p: string): boolean => {
          const dot = p.lastIndexOf('.');
          const sep = Math.max(p.lastIndexOf('\\'), p.lastIndexOf('/'));
          if (dot <= sep) return false; // no extension on the basename
          return pathExts.includes(p.slice(dot).toUpperCase());
        };
        const exe = lines.find((p) => isExecutable(p) && existsSync(p));
        if (exe) return { path: exe, found: true };
      } catch { /* fall through */ }
      // Common Windows install locations (npm global = %APPDATA%\npm\<cmd>.cmd).
      const winCandidates = windowsFallbackCandidates(command);
      for (const c of winCandidates) if (existsSync(c)) return { path: c, found: true };
      // Last resort — let node-pty try; will fail with ENOENT if missing.
      return { path: command, found: false };
    }
    // macOS / Linux: what `which` says in the person's login shell, so we pick
    // up nvm/asdf/brew paths: the first file on that shell's PATH that can be
    // run. Found by walking the folders, never by starting a shell.
    const onPath = findCommandOnPath(command, userShellPath());
    if (onPath) return { path: onPath, found: true };
    // Common explicit locations
    const candidates = commonBinDirs(process.env.HOME ?? '').map((d) => `${d}/${command}`);
    for (const c of candidates) if (existsSync(c)) return { path: c, found: true };
    // Last resort — let node-pty try; will fail with ENOENT if missing.
    return { path: command, found: false };
  }

  /**
   * WINDOWS ONLY. Decide whether `resolved` is an npm-style shim we can spawn
   * DIRECTLY (its real interpreter + script, as an argv ARRAY) instead of routing
   * it through `cmd.exe /d /s /c "<one big string>"`.
   *
   * The cmd.exe route destroys any multi-line argument (see buildCmdCommandLine),
   * which is what silently stripped the HIVE PROTOCOL block out of every
   * npm-installed agent CLI's system prompt on Windows — agents booted fine and
   * then never messaged each other because they never learned inbox/outbox exist.
   *
   * Returns null for anything not fully understood, and EVERY failure mode here
   * (not a shim, unreadable, unknown shape, script missing on disk, interpreter
   * not installed or itself not a real .exe) degrades to exactly today's cmd.exe
   * behaviour. Never throws.
   */
  private resolveWindowsShimSpawn(resolved: string): { file: string; script: string | null } | null {
    if (process.platform !== 'win32') return null;
    try {
      const lower = resolved.toLowerCase();
      // The `.cmd` IS the shim. An extensionless npm shim (`%APPDATA%\npm\claude`)
      // is a POSIX **sh** script that cmd.exe cannot run at all; npm always writes a
      // `.cmd` sibling naming the same target, so read that instead — strictly an
      // improvement over handing sh syntax to cmd.exe.
      const shimPath = lower.endsWith('.cmd') || lower.endsWith('.bat')
        ? resolved
        : (existsSync(`${resolved}.cmd`) ? `${resolved}.cmd` : null);
      if (!shimPath) return null;
      const st = statSync(shimPath);
      if (!st.isFile() || st.size > 8192) return null;

      const target = parseNpmCmdShim(shimPath, readFileSync(shimPath, 'utf8'));
      if (!target) return null;
      // The shim can outlive the package it points at (a half-removed global
      // install). Falling back to cmd.exe then at least reproduces today's error.
      if (!existsSync(target.scriptPath)) return null;

      // Direct-executable shim: the target IS the program. No interpreter to
      // resolve, and no script argument to prepend — spawning it with an argv
      // array is exactly what the cmd.exe route was standing in the way of.
      if (target.interpreter === null) {
        return { file: target.scriptPath, script: null };
      }

      const interp = this.resolveCommand(target.interpreter);
      if (!interp.found) return null;
      // Must be a REAL executable: if `node` itself only resolves to a `.cmd`
      // (e.g. our own bundled-runtime shim appended to PATH), spawning it directly
      // would hit the very CreateProcess limitation we are routing around.
      const il = interp.path.toLowerCase();
      if (!il.endsWith('.exe') && !il.endsWith('.com')) return null;

      return { file: interp.path, script: target.scriptPath };
    } catch {
      return null; // unreadable/racing shim — fall back, never break the spawn
    }
  }

  spawn(opts: SpawnOptions, owner: PtyOwner | null = null): { ok: boolean; error?: string } {
    if (this.sessions.has(opts.id)) {
      return { ok: false, error: `pty already exists for id ${opts.id}` };
    }
    // Defense-in-depth: cwd is already tilde-expanded at ingestion (spawnAgentCore),
    // but any other caller reaching the PTY directly gets the same treatment —
    // `existsSync('~/dev/foo')` is always false, only a shell expands `~`.
    opts = { ...opts, cwd: expandTilde(opts.cwd) };
    if (!existsSync(opts.cwd)) {
      return { ok: false, error: `cwd does not exist: ${opts.cwd}` };
    }
    const resolved = this.resolveCommand(opts.command).path;
    try {
      // Build a user-shell PATH so child can resolve subprocess deps. Cached
      // for the session (shellEnv.userShellPath, fenced against rc-file noise) —
      // the interactive-shell launch it replaces cost ~1s of main-thread freeze
      // on EVERY spawn.
      const userPath = withHiveRuntimeFallback(
        process.platform === 'win32' ? (process.env.PATH || '') : userShellPath(),
        opts.env?.HIVE_ROOT
      );

      // On Windows, .cmd/.bat files (and extensionless shims) cannot be executed
      // directly by CreateProcess — only .exe/.com can. Two ways out, in order of
      // preference: (1) decode an npm shim to the interpreter + script it wraps and
      // spawn THAT with an argv array (correct escaping, newlines survive); or
      // (2) the legacy fallback, route the whole thing through cmd.exe as one
      // pre-escaped string (loses newlines — see buildCmdCommandLine).
      const isWin = process.platform === 'win32';
      const lower = resolved.toLowerCase();
      const directExe = lower.endsWith('.exe') || lower.endsWith('.com');
      const needsCmd = isWin && !directExe;
      // Prefer decoding an npm shim to its interpreter over the cmd.exe route (see
      // resolveWindowsShimSpawn). win32-only and null-on-anything-unexpected, so
      // macOS/Linux and every undecodable Windows target keep today's behaviour.
      // Skipped entirely for a shellScript spawn, which never executes `resolved`.
      const shimSpawn = needsCmd && typeof opts.shellScript !== 'string'
        ? this.resolveWindowsShimSpawn(resolved)
        : null;
      let file: string;
      let spawnArgs: string[] | string;
      if (typeof opts.shellScript === 'string') {
        // Missing-CLI auto-install: run a banner + install command through the
        // platform shell so it streams to this same Terminal tab. On Windows we
        // hand cmd.exe a verbatim STRING (`/d /s /c "<script>"`) — node-pty passes
        // strings through unescaped, and `/s` strips exactly the outer quote pair,
        // so the `&`-chained script runs as-is (the script carries no embedded `"`).
        // On unix we use `$SHELL -lc <script>` (login, non-interactive): npm is
        // already on PATH because spawn() sets env.PATH to the captured interactive
        // shell PATH (nvm/asdf/brew included), and skipping `-i` avoids dumping the
        // user's interactive-rc session-restore noise into the install terminal. The
        // script is one argv element, so no shell-quoting is needed here.
        if (isWin) {
          file = process.env.ComSpec || 'cmd.exe';
          spawnArgs = `/d /s /c "${opts.shellScript}"`;
        } else {
          file = process.env.SHELL || '/bin/sh';
          spawnArgs = ['-lc', opts.shellScript];
        }
      } else if (needsCmd && shimSpawn) {
        // WINDOWS, npm-shim target: spawn the shim's own interpreter with an ARRAY
        // of args. node-pty then runs its `argsToCommandLine` (MSDN/CRT escaping:
        // backslash doubling before a quote, whole-arg quoting on whitespace) and
        // hands the result straight to CreateProcess — no shell parser anywhere in
        // the chain. That is what lets the hive protocol prompt through intact:
        // its newlines, parentheses and embedded quotes are just characters inside
        // one quoted CRT argument, and the ceiling becomes CreateProcess's 32767
        // instead of cmd.exe's 8191. Routing the same prompt through cmd.exe
        // truncated it at the first newline, which is why Windows agents never
        // learned they had an inbox/outbox and could not message each other.
        file = shimSpawn.file;
        // `script` is null for a direct-executable shim — there is nothing to
        // prepend, the args go straight to the binary.
        spawnArgs = shimSpawn.script === null
          ? [...(opts.args ?? [])]
          : [shimSpawn.script, ...(opts.args ?? [])];
      } else {
        file = needsCmd ? (process.env.ComSpec || 'cmd.exe') : resolved;
        // #55: when routing through cmd.exe we must NOT pass `resolved` as a bare,
        // unquoted array element. A Program-Files path (`C:\Program Files\nodejs\node`)
        // would split on its space under cmd.exe → "C:\Program is not recognized" and
        // every Windows agent terminal dies. Build a single, fully-quoted command line
        // and hand it to node-pty as a STRING (not an array): node-pty's
        // argsToCommandLine() only re-escapes ARRAY args; a string is passed through
        // verbatim (isCommandLine === true → `file + " " + args`), so our quoting is
        // never double-wrapped. We mirror Node's own child_process form,
        // `cmd.exe /d /s /c "<command>"`, wrapping the WHOLE inner command in one outer
        // quote pair — cmd's /s flag strips exactly that pair and runs the remainder
        // (where the resolved path keeps its own quotes) literally. /d skips AutoRun.
        spawnArgs = needsCmd
          ? buildCmdCommandLine(resolved, opts.args ?? [])
          : (opts.args ?? []);
        // The cmd.exe fallback is LOSSY and was previously SILENT, which is how a
        // Windows agent could look perfectly healthy while never having received
        // the hive protocol: cmd.exe cuts a multi-line argument at its first
        // newline, and the whole protocol block rides on one such argument.
        // resolveWindowsShimSpawn returns null for any shim shape it does not
        // fully understand, so this path is reachable on a real machine while
        // every unit test passes. Say so, loudly, with the two facts needed to
        // diagnose it: which target refused to decode, and whether a multi-line
        // argument is actually at risk in THIS spawn.
        if (needsCmd) {
          const multiline = (opts.args ?? []).some((a) => a.includes('\n'));
          console.warn(
            `[pty] Windows: "${resolved}" could not be decoded as an npm shim — falling back to cmd.exe.` +
            (multiline
              ? ' A MULTI-LINE ARGUMENT IS PRESENT AND WILL BE TRUNCATED AT ITS FIRST NEWLINE.' +
                ' The agent will start and look healthy without ever receiving the hive protocol.'
              : ' No multi-line argument in this spawn, so nothing is lost here.')
          );
        }
      }
      const grid = this.gridFor(opts);
      const proc = pty.spawn(file, spawnArgs, {
        name: 'xterm-256color',
        cols: grid.cols,
        rows: grid.rows,
        cwd: opts.cwd,
        // Inherited env minus the parent Claude session's identity markers,
        // then the app's defaults and locale, then per-agent values — see
        // ptyEnv.ts for why the strip exists and why it is prefix-based.
        env: buildPtyEnv(process.env, userPath, opts.env)
      });

      // Capture THIS session object so the proc's callbacks can tell whether the
      // id still belongs to them. A model change / restart does kill()+spawn()
      // reusing the SAME id: the old process's kill is asynchronous, so its
      // onData/onExit can fire AFTER the replacement session is already in the
      // map. Without the identity guard the dying process would (a) spray its
      // final bytes into the new agent's fresh TUI frame — scattered/overlapping
      // text — and (b) on exit delete the replacement session and emit a false
      // `pty:exit`, killing input to the agent that just started.
      const session: PtySession = {
        id: opts.id,
        proc,
        cwd: opts.cwd,
        command: resolved,
        lastOutputAt: Date.now(),
        startedAt: Date.now(),
        hasOutput: false,
        tail: '',
        owner,
        pending: '',
        flushTimer: null
      };
      this.sessions.set(opts.id, session);
      // Noted here, while the process is definitely ours. Only a Map insert:
      // the identity (start time, command) is read by an async ps later, never
      // on this path (see staleAgents.ts).
      try { void this.ledger?.add(opts.id, proc.pid); } catch { /* never block a spawn */ }

      proc.onData((data) => {
        // Drop trailing output from a process whose id was already reclaimed by
        // a respawn (or killed) — it would corrupt the new session's screen.
        if (this.sessions.get(opts.id) !== session) return;
        session.hasOutput = true;
        session.lastOutputAt = Date.now();
        // Keep only the trailing window; slice AFTER appending so a single
        // oversized write still leaves us its end (the part that explains a death).
        session.tail = (session.tail + data).slice(-TAIL_MAX);
        // Route to the session's owner window (multi-window owner routing),
        // coalesced rather than sent per chunk: see flushOutput(). The hook
        // below still sees every chunk as it arrives.
        this.queueOutput(session, data);
        if (this.dataHook) { try { this.dataHook(opts.id, data); } catch (e) { console.error('[pty] data hook:', e); } }
      });
      proc.onExit(({ exitCode, signal }) => {
        // Stale exit from a process whose id was reclaimed (kill()+respawn) — do
        // NOT touch the live session or tell the renderer the new pty died.
        if (this.sessions.get(opts.id) !== session) return;
        // Ordering: whatever the process printed on its way out must reach the
        // terminal BEFORE the exit banner, so drain the buffer first.
        this.flushOutput(session);
        this.safeSend(`pty:exit:${opts.id}`, { exitCode, signal }, session.owner);
        this.forgetPid(proc.pid);
        this.sessions.delete(opts.id);
        // node-pty closes the master fd before emitting exit, but that chain has
        // observable failure modes. Close it again so an exit NEVER leaves the
        // fd behind (idempotent; see forceClosePty).
        forceClosePty(session.proc);
        // Natural exit must run the same lifecycle teardown as an explicit kill.
        // Guarded so a teardown error can never crash node-pty's exit callback.
        // `signal` is forwarded, not dropped: a provider killed by SIGILL/SIGSEGV
        // exits with code 0 and a non-zero signal, so an exitCode-only handler
        // cannot tell a crash from a clean finish. `tail` carries whatever the
        // process printed on its way out.
        // The session is already out of `sessions` by now, so anything the
        // handler needs about the dead process must be handed to it here —
        // it cannot look the session up any more.
        try {
          this.exitHandler?.(opts.id, exitCode, {
            signal,
            startedAt: session.startedAt,
            tail: session.tail,
            command: session.command,
            cwd: session.cwd
          });
        } catch { /* never throw out of onExit */ }
      });

      // Lazy-start the dead-session reaper (see reapDeadSessions). unref'd so
      // the timer never keeps the main process alive on its own.
      if (!this.reaper) {
        this.reaper = setInterval(() => this.reapDeadSessions(), PtyManager.REAPER_INTERVAL_MS);
        this.reaper.unref?.();
      }

      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  write(id: string, data: string): { ok: boolean; error?: string } {
    const s = this.sessions.get(id);
    if (!s) return { ok: false, error: `no pty: ${id}` };
    try {
      s.proc.write(data);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  /** The grid a spawn starts at: the renderer's last measured one for this
   *  id when there is one, else the caller's, else the placeholder. */
  gridFor(opts: { id: string; cols?: number; rows?: number }): { cols: number; rows: number } {
    const want = this.wanted.get(opts.id);
    if (want) return want;
    return { cols: validCell(opts.cols) ?? 100, rows: validCell(opts.rows) ?? 30 };
  }

  /** The renderer's last word on a pty's grid, or null. Tests read it. */
  wantedGrid(id: string): { cols: number; rows: number } | null {
    return this.wanted.get(id) ?? null;
  }

  /** Move the pty to the grid the visible xterm fitted. A same size call is
   *  free (no SIGWINCH, see redraw). With no process under the id yet the ask
   *  is REMEMBERED for the spawn, and answered `pending` rather than refused:
   *  the pane measured first, and it is right. A grid no pane can have (0, NaN,
   *  a negative) is a measuring accident, not a request, and is dropped. */
  resize(id: string, cols: number, rows: number): { ok: boolean; error?: string; pending?: boolean } {
    const c = validCell(cols);
    const r = validCell(rows);
    if (c === undefined || r === undefined) return { ok: false, error: `bad grid: ${cols}x${rows}` };
    this.wanted.set(id, { cols: c, rows: r });
    const s = this.sessions.get(id);
    if (!s) return { ok: true, pending: true };
    try {
      s.proc.resize(c, r);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  /** Ask the foreground TUI for a fresh frame, ending at the geometry it had.
   *  Startup output may predate the renderer subscription, and a same-sized
   *  first fit otherwise emits no resize.
   *
   *  0.5.3 bug 22. This used to resize the pty to the size it already had. A
   *  same size TIOCSWINSZ delivers no SIGWINCH, so the TUI was never told
   *  anything and never repainted: a restored agent's pane stayed blank until a
   *  keystroke, and nothing on it scrolled or clicked because nothing was there.
   *  Measured on de9e70aa: zero signals per same size resize, one per real
   *  change (test/pty-redraw-winch.test.cjs).
   *
   *  So the grid is moved one row and moved back. The pause between the two is
   *  not decoration: Node based TUIs (Claude Code among them) handle SIGWINCH by
   *  re reading the size and comparing it with the last one, and two resizes
   *  landing before that read would show the same size twice and repaint
   *  nothing. The child has to see the intermediate grid. */
  async redraw(id: string): Promise<{ ok: boolean; error?: string }> {
    const s = this.sessions.get(id);
    if (!s) return { ok: false, error: `no pty: ${id}` };
    try {
      const { cols, rows } = s.proc;
      const step = rows > 1 ? rows - 1 : rows + 1;
      s.proc.resize(cols, step);
      await new Promise((r) => setTimeout(r, REDRAW_STEP_MS));
      // A restart under the same id in that window owns a different process now.
      if (this.sessions.get(id) !== s) return { ok: false, error: `pty replaced during redraw: ${id}` };
      // THE GRID MAY HAVE MOVED DURING THE WAIT (0.5.3, founder 24 Sep: Claude
      // Code drew at about 70% of the pane). This redraw is asked for at attach,
      // and the view's first real fit lands a frame or two later, inside these
      // 80 ms: it moved the pty from the spawn placeholder (100 by 30) to the
      // pane's true grid, and the restore below then put the placeholder back.
      // The view never asked again, because its own grid had not changed. So
      // a grid that is no longer the one this redraw set is left alone: it is
      // newer, and it is the pane's.
      if (s.proc.cols !== cols || s.proc.rows !== step) return { ok: true };
      s.proc.resize(cols, rows);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  kill(id: string): { ok: boolean; error?: string } {
    const s = this.sessions.get(id);
    if (!s) return { ok: false, error: `no pty: ${id}` };
    try {
      const pid = s.proc.pid;
      s.proc.kill();
      ensureKilled(pid); // verify + sweep the process group so no PID leaks
      forceClosePty(s.proc); // release the master fd now, not whenever node-pty's close chain runs
      // Deliver the last buffered bytes (they may be the reason it was killed),
      // and make sure no timer outlives the session.
      this.flushOutput(s);
      this.forgetPid(pid);
      this.sessions.delete(id);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  /** `cols` and `rows` are the process grid: the renderer sizes a terminal
   *  nobody has opened to it, so its screen can be read (autosend, 0.5.5). */
  list(): Array<{ id: string; cwd: string; command: string; pid: number; lastOutputAt: number; hasOutput: boolean; cols: number; rows: number }> {
    return Array.from(this.sessions.values()).map(s => ({
      id: s.id,
      cwd: s.cwd,
      command: s.command,
      pid: s.proc.pid,
      lastOutputAt: s.lastOutputAt,
      hasOutput: s.hasOutput,
      cols: s.proc.cols,
      rows: s.proc.rows
    }));
  }

  /** One pty's process facts for the submitter, or null. */
  info(id: string): { pid: number; cols: number; rows: number; hasOutput: boolean; startedAt: number; command: string } | null {
    const s = this.sessions.get(id);
    if (!s) return null;
    return { pid: s.proc.pid, cols: s.proc.cols, rows: s.proc.rows, hasOutput: s.hasOutput, startedAt: s.startedAt, command: s.command };
  }

  /** Send to the window that owns this pty (the default sink when none).
   *  False when there is no live window to send to. */
  sendToOwner(id: string, channel: string, payload: unknown): boolean {
    // Output still held by the coalescer goes first: IPC to one webContents is
    // ordered, so a terminal:probe then reads a screen that has every byte the
    // pty printed before the question was asked.
    const held = this.sessions.get(id);
    if (held) this.flushOutput(held);
    const wc = this.sessions.get(id)?.owner ?? this.webContents;
    if (!wc || wc.isDestroyed()) return false;
    try { wc.send(channel, payload); return true; } catch { return false; }
  }

  /** The bounded ring of recent raw output (TAIL_MAX bytes), or '' if no such
   *  PTY. The voice read tool's fallback when no terminal has drawn this pty
   *  in the renderer (0.5.2); escapes are stripped by the caller. */
  tail(id: string): string {
    return this.sessions.get(id)?.tail ?? '';
  }

  /** Epoch ms of this PTY's most recent output, or undefined if no such PTY. */
  lastOutputAt(id: string): number | undefined {
    return this.sessions.get(id)?.lastOutputAt;
  }

  /** Milliseconds since this PTY last produced output (Date.now() - lastOutputAt),
   *  or undefined if no such PTY. The idle handshake: large value = safe to type. */
  idleFor(id: string): number | undefined {
    const s = this.sessions.get(id);
    return s ? Date.now() - s.lastOutputAt : undefined;
  }

  /** Bulk-kill every PTY for app quit / reset. This is wholesale shutdown, not
   *  individual agent lifecycle, so it suppresses the natural-exit teardown —
   *  we don't want to archive every agent or fire a storm of `git worktree
   *  remove` while the process is tearing down.
   *
   *  On Windows the tree sweep runs SYNCHRONOUSLY here, unlike kill():
   *  ensureKilled's grace timer is unref'd, and on the quit path the main
   *  process exits (will-quit caps the analytics flush at ~1.2s) long before
   *  the 4s grace — so the deferred `taskkill /T /F` never ran and agent trees
   *  survived the app. conpty's own kill is async and best-effort (and our
   *  conpty patch degrades a failed console enumeration to killing nothing),
   *  so the synchronous sweep is the only reliable reaper at quit. POSIX keeps
   *  the graceful path: closing the pty HUPs the foreground process group, so
   *  trees die without us SIGKILLing mid-cleanup. */
  killAll() {
    this.exitHandler = null;
    if (this.reaper) { clearInterval(this.reaper); this.reaper = null; }
    const sweepNow = process.platform === 'win32';
    for (const s of this.sessions.values()) {
      const pid = s.proc.pid;
      if (sweepNow) {
        // Capture and kill the intact Windows process tree before closing
        // ConPTY: once the root exits, taskkill may no longer be able to find
        // descendants by that PID. Keep node-pty cleanup independent so a
        // failure in either operation cannot prevent the other.
        try { hardKillTree(pid); } catch { /* noop */ }
        try { s.proc.kill(); } catch { /* noop */ }
      } else {
        try { s.proc.kill(); } catch { /* noop */ }
        ensureKilled(pid);
      }
      forceClosePty(s.proc);
      this.flushOutput(s);
      // Forget each PTY AS IT DIES, not the whole ledger at the end: a teardown
      // that wedges part way must leave exactly its survivors recorded for the
      // next launch to sweep.
      this.forgetPid(pid);
    }
    this.sessions.clear();
  }
}
