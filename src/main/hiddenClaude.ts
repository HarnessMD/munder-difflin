import { spawn as nodeSpawn, type ChildProcess, type SpawnOptions } from 'node:child_process';
import { randomUUID as nodeRandomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolveCommand, userShellPath } from './shellEnv';
import { expandTilde } from './fs';
import { ensureKilled } from './procKill';

/**
 * Shared helper: run ONE hidden `claude --print` process and return its structured
 * JSON result.
 *
 * "Hidden" means: not added to the PtyManager, not emitted to the renderer, not visible
 * in the agent list or OfficeFloor scene. Each call owns its own process and session id,
 * and kills it after capture — no /clear needed, no context bleed.
 *
 * WHY PRINT MODE, AND WHAT IT COSTS (changed in 1.1.47). This used to run an interactive
 * PTY and read the answer back out of the newest `.jsonl` under the shared Claude project
 * directory. That protocol had no way to know which session it was reading: every hidden
 * condensation for every agent shares one harness-home cwd, and the selector admitted any
 * transcript touched within 5 s of spawn, so one agent's summary could be captured as
 * another's. It also treated 3.5 s of TUI silence as turn completion, which it is not.
 * The v1.1.46 log shows the result: 820 condense-abort records, zero successes.
 *
 * The old comment here justified the PTY as protecting the user's interactive-plan quota
 * against Agent-SDK credit accounting. That premise no longer holds: per Anthropic's
 * 2026-06-16 Agent SDK notice, the 2026-06-15 accounting change was PAUSED and `claude -p`
 * still draws from subscription usage limits, with any future change to be announced
 * first. Metering follows AUTHENTICATION, not print-vs-interactive. The real billing trap
 * is credential precedence — `ANTHROPIC_API_KEY` overrides a logged-in subscription and
 * bills pay-as-you-go — so this helper strips the credential-bearing variables from the
 * child env (see API_KEY_ENV) and lets the user's subscription auth stand. Re-check that
 * dated notice before a release that leans on it.
 *
 * Session lifecycle:
 *   spawn (--print, one --session-id, --output-format json, --json-schema) →
 *   prompt written to stdin, stdin closed → bounded stdout/stderr →
 *   'close' (streams drained, not mere 'exit') → envelope validated → cleanup
 */

/** Hard cap on captured stdout. Far above a 1,500-word summary; stops a runaway
 *  child growing Electron main's heap. */
const MAX_STDOUT_BYTES = 1024 * 1024;
/** Enough stderr for a diagnosis, never enough to be a log-sized payload. */
const MAX_STDERR_BYTES = 8 * 1024;

/**
 * Credential-bearing variables that make the CLI bill pay-as-you-go even when the user is
 * logged in to a subscription. Stripped from the child env AFTER every merge, so neither
 * the inherited environment nor `opts.env` can reintroduce one.
 *
 * Deliberately NOT stripped: CLAUDE_CODE_USE_BEDROCK / CLAUDE_CODE_USE_VERTEX and the
 * like. Those route a deliberately-configured deployment rather than silently overriding
 * a subscription, and removing them would break a user who means to run there.
 */
export const API_KEY_ENV = ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_API_KEY_HELPER'] as const;

export interface HiddenClaudeOptions {
  /** Model to use (e.g. 'claude-haiku-4-5'). */
  model: string;
  /** Working directory for the claude session. */
  cwd: string;
  /** Base claude command/binary. Defaults to 'claude'. */
  command?: string;
  /** Tools the session is forbidden to use. Defaults to ['Edit','Write','NotebookEdit']. */
  disallowedTools?: string[];
  /** Directories added via --add-dir (for context gathering). */
  addDirs?: string[];
  /** JSON Schema the CLI must validate its structured output against. */
  jsonSchema?: unknown;
  /** Total timeout ms. Default 180000. */
  timeoutMs?: number;
  /** Extra env merged over the resolved shell env (e.g. the shared MemPalace). */
  env?: Record<string, string>;
}

export interface HiddenClaudeResult {
  ok: boolean;
  /** The session id this attempt owns. Always present once a spawn was attempted. */
  sessionId?: string;
  /** The CLI's `structured_output`, unvalidated beyond "it was present". */
  structuredOutput?: unknown;
  /** The CLI's `result` string, kept for the caller's exact-JSON compatibility parse. */
  result?: string;
  /** Stable category/detail. Never the prompt, the memory, or the full response. */
  error?: string;
}

/** The effects this module owns, injectable so the race is testable on a fake clock. */
export interface HiddenClaudeDeps {
  spawn: (file: string, args: string[], options: SpawnOptions) => ChildProcess;
  randomUUID: () => string;
  setTimeout: (fn: () => void, ms: number) => NodeJS.Timeout;
  clearTimeout: (t: NodeJS.Timeout) => void;
  ensureKilled: (pid: number | undefined) => void;
}

const defaultDeps: HiddenClaudeDeps = {
  spawn: nodeSpawn as HiddenClaudeDeps['spawn'],
  randomUUID: nodeRandomUUID,
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (t) => clearTimeout(t),
  ensureKilled
};

/** The Claude print-mode envelope, as much of it as we are willing to trust. */
interface ClaudeEnvelope {
  session_id?: unknown;
  structured_output?: unknown;
  result?: unknown;
  is_error?: unknown;
  subtype?: unknown;
}

export function runHiddenClaude(
  prompt: string,
  opts: HiddenClaudeOptions,
  deps: HiddenClaudeDeps = defaultDeps
): Promise<HiddenClaudeResult> {
  return new Promise((resolve) => {
    if (!prompt.trim()) { resolve({ ok: false, error: 'empty prompt' }); return; }
    // Defense-in-depth: `~` is shell syntax, not a path Node understands.
    const cwd = opts.cwd ? expandTilde(opts.cwd) : opts.cwd;
    if (!cwd || !existsSync(cwd)) {
      resolve({ ok: false, error: `cwd does not exist: ${opts.cwd}` });
      return;
    }

    const sessionId = deps.randomUUID();
    const binary = (opts.command || 'claude').trim().split(/\s+/)[0] || 'claude';
    const exe = resolveCommand(binary);
    const disallowed = opts.disallowedTools ?? ['Edit', 'Write', 'NotebookEdit'];
    const addDirs = (opts.addDirs ?? []).filter((d) => d && existsSync(d));
    const timeoutMs = opts.timeoutMs ?? 180_000;

    const args: string[] = [
      '--print',
      '--model', opts.model,
      '--session-id', sessionId,
      '--output-format', 'json',
      '--permission-mode', 'bypassPermissions',
      '--disallowedTools', ...disallowed,
    ];
    if (opts.jsonSchema !== undefined) args.push('--json-schema', JSON.stringify(opts.jsonSchema));
    for (const d of addDirs) { args.push('--add-dir', d); }

    // The prompt NEVER goes on argv: memory input can exceed the Windows command-line
    // limit, and argv is visible to every process on the machine.
    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      PATH: userShellPath(),
      ...(opts.env ?? {}),
    };
    for (const k of API_KEY_ENV) delete env[k];

    // Windows: CreateProcess cannot exec the npm `.cmd`/extensionless `claude` shim
    // directly (ERROR_BAD_EXE_FORMAT, error 193), and Node refuses a .cmd without a
    // shell — route non-.exe targets through cmd.exe. A real claude.exe (WinGet)
    // launches directly. (#22)
    const winWrap = process.platform === 'win32' && !/\.(exe|com)$/i.test(exe);
    const spawnFile = winWrap ? (process.env.ComSpec || 'cmd.exe') : exe;
    const spawnArgs = winWrap ? ['/d', '/s', '/c', exe, ...args] : args;

    let child: ChildProcess;
    try {
      child = deps.spawn(spawnFile, spawnArgs, {
        cwd,
        env,
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (e) {
      resolve({ ok: false, sessionId, error: e instanceof Error ? e.message : String(e) });
      return;
    }

    let settled = false;
    let stdout = '';
    let stderr = '';
    let overflowed = false;
    let timer: NodeJS.Timeout | null = null;

    // Hidden sessions are ephemeral CHECKS — nothing they spawn (MCP servers, helpers)
    // may outlive them. Kill politely, then sweep the process tree so every check
    // releases its PIDs even if `claude` shrugs off the signal.
    const kill = (): void => {
      const pid = child.pid;
      try { child.kill(); } catch { /* already gone */ }
      deps.ensureKilled(pid);
    };

    const finish = (r: HiddenClaudeResult): void => {
      if (settled) return;                       // a late 'close' after a timeout is ignored
      settled = true;
      if (timer) { deps.clearTimeout(timer); timer = null; }
      resolve({ sessionId, ...r });
    };

    const abort = (error: string): void => {
      if (settled) return;
      kill();
      finish({ ok: false, error });
    };

    child.on('error', (e: Error) => abort(e.message));

    child.stdout?.setEncoding?.('utf8');
    child.stdout?.on('data', (chunk: string | Buffer) => {
      if (settled || overflowed) return;
      stdout += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
      if (stdout.length > MAX_STDOUT_BYTES) {
        overflowed = true;
        abort(`stdout exceeded ${MAX_STDOUT_BYTES} bytes`);
      }
    });

    child.stderr?.setEncoding?.('utf8');
    child.stderr?.on('data', (chunk: string | Buffer) => {
      if (stderr.length >= MAX_STDERR_BYTES) return;
      stderr += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
      if (stderr.length > MAX_STDERR_BYTES) stderr = stderr.slice(0, MAX_STDERR_BYTES);
    });

    // 'close', never 'exit': exit fires when the process ends, close when its stdio has
    // been drained. A summary whose final bytes arrive between the two is the whole bug
    // this module is being rewritten for.
    child.on('close', (code: number | null) => {
      if (settled) return;
      if (code !== 0) {
        const tail = stderr.trim().split('\n').slice(-3).join(' | ').slice(0, 500);
        finish({ ok: false, error: `claude exited ${code ?? 'null'}${tail ? `: ${tail}` : ''}` });
        return;
      }
      finish(readEnvelope(stdout, sessionId));
    });

    timer = deps.setTimeout(() => abort('hidden session timed out'), timeoutMs);

    try {
      child.stdin?.end(prompt);
    } catch (e) {
      abort(e instanceof Error ? e.message : String(e));
    }
  });
}

/**
 * Validate the print-mode envelope. STRICT by construction: the whole of stdout must be
 * one JSON object. There is no brace scanning, no fence stripping and no substring
 * rescue — a partial or noisy capture is a failure, because the failure mode being fixed
 * is exactly "plausible text from somewhere else was accepted as this agent's summary".
 */
export function readEnvelope(stdout: string, sessionId: string): HiddenClaudeResult {
  const raw = stdout.trim();
  if (!raw) return { ok: false, error: 'empty stdout' };
  let env: ClaudeEnvelope;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, error: 'stdout was not a JSON object' };
    }
    env = parsed as ClaudeEnvelope;
  } catch {
    return { ok: false, error: 'stdout was not JSON' };
  }
  if (env.is_error === true) {
    const sub = typeof env.subtype === 'string' ? `: ${env.subtype}` : '';
    return { ok: false, error: `claude reported an error${sub}` };
  }
  // A returned id that is not ours means the envelope describes someone else's turn —
  // the exact confusion the old transcript selector shipped. Absent is tolerated: the
  // fixed argv still owns the session.
  if (typeof env.session_id === 'string' && env.session_id !== sessionId) {
    return { ok: false, error: 'session id mismatch' };
  }
  return {
    ok: true,
    structuredOutput: env.structured_output,
    result: typeof env.result === 'string' ? env.result : undefined
  };
}
