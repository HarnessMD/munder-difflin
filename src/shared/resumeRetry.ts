/**
 * A resume that died at the gate starts a fresh session instead of leaving the
 * agent dead (every engine).
 *
 * The app checks a session before it attaches it where it can (src/core/
 * spawnAgent.ts: Claude's transcript, Codex's index, the stores in
 * shared/resumeStore.ts), but the CLI can still refuse it AFTER it launched,
 * and some stores cannot be read at all: OpenCode keeps its sessions in a
 * database, so its recorded id goes on the line unchecked. On 12 Nov 2026 an
 * OpenCode agent answered "Error: Invalid session ID: unknown error", exited 1,
 * and every Restart tried the same id again.
 *
 * So: a run of ANY engine that ATTACHED a resume and exited with a code, within
 * the launch window or on the CLI's own refusal words, never resumed anything,
 * and is started again once with no resume at all. The session is lost; the
 * alternative is an agent that is lost. The refused id is never offered again,
 * and the fresh run is not a resume, so a CLI that cannot start for its own
 * reasons cannot loop: it meets the crash loop hold instead.
 */
import { withoutCodexResume } from './codexRemote';

/** How long after launch an abnormal exit still counts as "it never started".
 *  A resumed worker that is really running lives for minutes; the refusals
 *  above all land in the first second or two. */
export const RESUME_FAIL_WINDOW_MS = 20_000;

/** What a CLI that would not reopen the session says on its way out, lower-cased.
 *
 *  The window above is a guess about timing, and on 8 Nov 2026 the timing was
 *  wrong: three Codex agents were refused, but Codex first opened its TUI, put up
 *  "Hooks need review. 8 hooks are new or changed", waited for the app to answer
 *  it on screen and only then printed the refusal and exited 1. A run that spends
 *  half a minute at a popup it cannot get past is still a resume that never
 *  resumed, so when the CLI SAYS so its own words decide and the clock does not. */
export const RESUME_REFUSAL_SIGNS: readonly string[] = [
  // codex-cli 0.164.0, a resume on a remote app-server (by --remote or by joining
  // a running shared background server).
  'permission overrides are not supported when resuming',
  // The recorded id is not in this CODEX_HOME's index any more.
  'no saved session found with id',
  // --add-dir next to --remote: the start never gets going.
  'is not supported with --remote',
  // The hook-trust gate, which only ever opens on a resume the bypass flag did
  // not reach. Nobody is at the keyboard, so it is a dead end, not a question.
  'hooks need review',
  // Every other engine's own words for an id it will not open, read
  // from each installed CLI (12 Nov 2026). Grok and Antigravity are not here:
  // on a bad id they stay open on a new session, so there is nothing to start.
  // OpenCode 1.18: an id not in its `ses_…` form ("Error: Invalid session ID:
  // unknown error", the founder's test build), or one its database lacks
  // ("Error: Session not found: <id>", Crush says it the same way).
  'invalid session id',
  'session not found',
  // Claude Code 2.1: "No conversation found with session ID: <id>".
  'no conversation found with session id',
  // Gemini CLI 0.46 (exit 42): "Error resuming session: Invalid session identifier \"<id>\"."
  'error resuming session',
  // Qwen Code 0.18, by title (by id it says Codex's words above).
  'no saved session found with title',
  // Kimi Code: 'error: failed to start shell: Session "<id>" not found.', or the id is another folder's.
  'failed to start shell: session',
  'was created under a different directory',
  // Pi 0.79: "No session found matching '<id>'".
  'no session found matching',
  // Copilot CLI 1.0: "Error: No session, task, or name matched '<id>'."
  'no session, task, or name matched'
];

/** How many of the last output lines are read for the CLI's last words. A
 *  session that only TALKED about one of these errors and then went on working
 *  has scrolled them out of reach; Codex prints its refusal last and exits. */
export const REFUSAL_LINES = 12;

/** The last output lines, escape sequences and blank lines removed. */
function lastLines(tail: string, n: number): string[] {
  const plain = tail
    .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '')
    .replace(/\x1b\[[0-9;?<>=]*[ -/]*[@-~]/g, '')
    .replace(/\x1b[@-_]/g, '')
    .replace(/\r/g, '\n');
  return plain.split('\n').map((l) => l.trim()).filter(Boolean).slice(-n);
}

/** The line in which the CLI said it would not reopen the session, or null. */
export function resumeRefusal(tail: string | undefined | null): string | null {
  if (!tail) return null;
  for (const line of lastLines(tail, REFUSAL_LINES).reverse()) {
    const l = line.toLowerCase();
    if (!RESUME_REFUSAL_SIGNS.some((s) => l.includes(s))) continue;
    // A TUI redraw has no line breaks, so the refusal can share its line with
    // the screen before it: hand back Codex's own `Error:` message when there is one.
    const at = line.indexOf('Error:');
    return at >= 0 ? line.slice(at) : line;
  }
  return null;
}

/** Did the CLI print, in so many words, that it would not reopen the session? */
export function isResumeRefusalTail(tail: string | undefined | null): boolean {
  return resumeRefusal(tail) !== null;
}

/** How an engine takes a session id back (AgentProviderPreset). */
export interface ResumeForm {
  resumeFlag?: string;
  resumeSubcommand?: string;
}

/**
 * The same argv as a FRESH start, for any engine: Codex's `resume <id>`
 * subcommand, or the engine's own resume flag with the id after it
 * (`--resume <id>`, `--session <id>`, `--conversation=<id>`). Every other
 * word is kept, the prompt included. What the app starts after a refusal, so
 * the next run cannot be that resume.
 */
export function withoutResume(args: readonly string[], form: ResumeForm): string[] {
  const out = form.resumeSubcommand === 'resume' ? withoutCodexResume(args) : [...args];
  const flag = form.resumeFlag;
  if (!flag) return out;
  const kept: string[] = [];
  for (let i = 0; i < out.length; i++) {
    const a = out[i];
    if (a === flag) {
      // The id, when one follows: a bare flag (Claude's picker) has none.
      if (i + 1 < out.length && !out[i + 1].startsWith('-')) i++;
      continue;
    }
    if (a.startsWith(`${flag}=`)) continue;
    kept.push(a);
  }
  return kept;
}

export interface ResumeExit {
  /** Did this run actually attach a resume (SpawnResult.resumed)? */
  resumed: boolean;
  /** The CLI's own code. A signal is not a refusal: closing a floor or stopping an agent ends a run with one. */
  exitCode?: number;
  /** How long the process lived. */
  ranMs: number;
  /** The last of the terminal's output, where the CLI's own reason is printed. */
  tail?: string;
}

/** Whether to start this agent again with a fresh session. */
export function freshAfterFailedResume(e: ResumeExit): boolean {
  if (!e.resumed) return false;
  if (typeof e.exitCode !== 'number' || e.exitCode === 0) return false;
  // Its own words, whatever the clock says.
  if (isResumeRefusalTail(e.tail)) return true;
  return e.ranMs >= 0 && e.ranMs <= RESUME_FAIL_WINDOW_MS;
}

/**
 * What follows a person's agent that ended by itself: a fresh start (its resume was refused), the sign in panel, or
 * neither. The sign in panel is offered for ANY non zero exit in the first minute (cliSetup.ts), and the
 * fresh start used to wait for no panel at all, so a refused resume, which always ends in that minute, never started
 * fresh: the founder's OpenCode agent Angela exited 1 on "Invalid session ID" after 20 s and 12 s on RC2, and was
 * left on the panel. A refused resume goes first; the panel keeps a run that names a sign in failure and does not
 * say its session was refused (a fresh start would fail the same way, and is then not a resume, so the panel follows).
 */
export function freshOrSignIn(e: { resumeFailed: boolean; signIn: { line: string | null } | null; tail?: string }): 'fresh' | 'signin' | null {
  if (e.resumeFailed && !(e.signIn?.line && !isResumeRefusalTail(e.tail))) return 'fresh';
  return e.signIn ? 'signin' : null;
}
