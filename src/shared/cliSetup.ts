/**
 * The steps between "not installed" and a running agent (0.5.3, batch 2, the
 * founder's 24 Sep flow: "installation should begin and until installed the
 * queue send button should be disabled and when installation completes ...
 * it starts login command ... and when user is done with login and clicks on
 * 'setup complete spawn agent' the cli agent running terminal and older
 * terminal is discarded").
 *
 *   installing  the installer runs in the agent's terminal; nothing may be
 *               typed or queued into it.
 *   signin      the install finished. The provider's own login command runs
 *               in the same terminal (the install output stays above it), and
 *               the panel above the composer offers "Setup complete, start
 *               agent". Pressing it discards that terminal and starts the
 *               agent fresh.
 *   manual      the install or the sign in could not be done here (batch 4,
 *               founder 24 Sep). "Set up manually" opened a terminal with the
 *               agent's own environment and the provider's command in it: the
 *               install command when the install failed, else the CLI itself so
 *               the person signs in inside it. They check the agent works
 *               there, then press "Setup complete, start agent", which is live
 *               the whole time: the person is the check.
 *
 * Until batch 2 a clean install restarted the agent straight away, which
 * cleared the installer's output the moment it ended; for Copilot, whose
 * preset runs in silent print mode, the terminal then stayed blank while the
 * first prompt ran.
 *
 * Shared and dependency free so main, the renderer and the tests load it.
 */
import type { AgentProvider } from './agentProvider';

export type CliSetupPhase = 'installing' | 'signin' | 'manual';

export interface CliSetupState {
  phase: CliSetupPhase;
  provider: AgentProvider;
  /** The provider's friendly name ("Copilot"). */
  label: string;
  /** The sign in command running in the terminal, as shown to the person, or
   *  null when the CLI has no separate login step (it asks on its first run). */
  loginCommand: string | null;
  /** Set once the provider's own status command says the CLI is signed in
   *  (claude, codex, cursor only; see main/cliReadiness.ts). Never set false:
   *  "cannot tell" and "signed out" both simply leave the panel as it is. */
  signedIn?: boolean;
  /** The login command's own run: running until it exits, then done (exit 0)
   *  or failed. Absent when there is no login command. */
  login?: 'running' | 'done' | 'failed';
  /** Set in the manual phase: why the person is setting up by hand, and the
   *  command the manual terminal runs, as shown to them. */
  manual?: { reason: 'install' | 'signin'; command: string };
  /** Set when this panel came up because an installed CLI's run ended the way
   *  a signed out one does (see offerSignInAfterExit), not after an install.
   *  The login does not start by itself: the person presses Sign in. */
  cause?: 'exit';
  /** The line that looked like a sign in failure, as printed, when there was
   *  one; shown on the panel so the person sees why. */
  authLine?: string;
}

/**
 * May "Setup complete, start agent" be pressed? (founder, 24 Sep 2026, on the
 * first build of this panel: "the setup complete spawn agent was enabled even
 * when the login was not completed".) Only once the sign in has actually
 * finished: the login command exited 0, or the CLI's own status command says
 * signed in. A CLI with no login command asks on its first run, so there is
 * nothing to wait for. A login that failed offers "Sign in again" and a
 * quieter "Start anyway" instead (see startAnyway).
 */
export function setupCanStart(s: CliSetupState | null): boolean {
  // Manual setup (founder, 24 Sep): the person says when the agent works in
  // that terminal; nothing here can know better.
  if (s?.phase === 'manual') return true;
  if (!s || s.phase !== 'signin') return false;
  if (s.loginCommand === null) return true;
  return s.login === 'done' || !!s.signedIn;
}

/** A failed login may still be skipped on purpose (the person signs in some
 *  other way); this is the only other door to the start. */
export function setupCanStartAnyway(s: CliSetupState | null): boolean {
  return !!s && s.phase === 'signin' && s.login === 'failed' && !s.signedIn;
}

/** May "Set up manually" be offered on the sign in panel? Whenever the sign in
 *  has not been seen to finish: it failed, it is still running, or this CLI
 *  gives no way to tell (founder, 24 Sep: "login or setup can not be done
 *  either due to installation issue or authentication issue"). */
export function setupCanGoManual(s: CliSetupState | null): boolean {
  return !!s && s.phase === 'signin' && s.login !== 'done' && !s.signedIn;
}

/**
 * The provider's own login subcommand, verified against each CLI's --help in
 * a throwaway HOME on 24 Sep 2026. Only providers whose login is a plain
 * subcommand of the agent binary are listed; the rest sign in on their first
 * run (Gemini, Qwen, Antigravity), take keys through config or env (Pi), or
 * need a platform argument we cannot choose for the person (Crush).
 */
const LOGIN_ARGS: Partial<Record<AgentProvider, string[]>> = {
  claude: ['auth', 'login'],
  codex: ['login'],
  copilot: ['login'],
  grok: ['login'],
  kimi: ['login'],
  cursor: ['login'],
  opencode: ['auth', 'login']
};

/** The login argv for this provider's binary, or null when there is none. */
export function providerLoginArgs(provider: AgentProvider): string[] | null {
  return LOGIN_ARGS[provider] ?? null;
}

/** The line shown to the person for the login step ("copilot login"). */
export function loginCommandLine(bin: string, provider: AgentProvider): string | null {
  const args = providerLoginArgs(provider);
  if (!args) return null;
  const name = bin.split('/').pop() || bin;
  return [name, ...args].join(' ');
}

/** Why the composer cannot send right now, as an i18n key, or null. A message
 *  typed into an installer or a login prompt would be read by the wrong
 *  program, so both phases hold the composer and the queue. */
export function composerHoldKey(setup: CliSetupState | null, missing: boolean): string | null {
  if (setup?.phase === 'installing') return 'terminal.cliSetup.holdInstalling';
  if (setup?.phase === 'signin' || setup?.phase === 'manual') return 'terminal.cliSetup.holdSignin';
  if (missing) return 'terminal.cliSetup.holdMissing';
  return null;
}

/* ─── an installed CLI that is not signed in (batch 2, founder 24 Sep) ─────
 * "even if it's not installed, it should still show the installation section
 * that we just built". The panel above came up only after an Install someone
 * pressed, so a CLI that was already installed but signed out died as "This
 * agent stopped" with nothing to press. Main now reads every agent run that
 * ends on its own and offers the same panel when the run looks like a CLI
 * that could not sign in. Nothing restarts by itself: the panel waits for a
 * person, so there is no loop. */

/** How long a run counts as "ended at start". */
export const EARLY_EXIT_MS = 60_000;

/**
 * Lines a CLI prints when it has no usable sign in. Matched per line, case
 * insensitive, against the last lines of the run only (never the whole
 * scrollback: an agent may discuss logins in its own work).
 *
 *   copilot  "Error: No authentication information found." (Copilot CLI
 *            1.0.88, `copilot -p` in a throwaway HOME, 24 Sep 2026; exit 1
 *            after about 5 s). Its log line "no authenticated GitHub host
 *            available" is NOT here: Copilot writes it while resolving the
 *            account even when signed in, and only to its log file.
 *   any      not logged in, please log in / sign in, run `x login`, not
 *            authenticated, authentication required, unauthorized with 401,
 *            a missing or invalid API key.
 */
const AUTH_FAILURE_RES: RegExp[] = [
  /no authentication information found/i,
  /\bnot (logged|signed) in\b/i,
  /\bplease (log ?in|sign ?in|login|authenticate)\b/i,
  /\b(run|use|try) [`'"]?[\w./-]+ (auth )?(login|signin)\b/i,
  /\bnot authenticated\b/i,
  /\bauthentication (is )?required\b/i,
  /\b401\b.*unauthori[sz]ed|unauthori[sz]ed.*\b401\b/i,
  /\b(invalid|missing|no) (api[ _-]?key|auth(entication)? token)\b/i,
  /\bapi[ _-]?key (is )?(not set|required|missing)\b/i
];

const ANSI_RE = new RegExp(String.fromCharCode(27) + '\\[[0-9;?]*[A-Za-z]|' + String.fromCharCode(27) + '\\][^' + String.fromCharCode(7) + ']*' + String.fromCharCode(7), 'g');

/** The last line of the run's output that reads as a sign in failure, or
 *  null. Only the last `lines` non empty lines are read. */
export function authFailureLine(tail: string, lines = 15): string | null {
  const last = tail.replace(ANSI_RE, '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(-lines);
  for (let i = last.length - 1; i >= 0; i--) {
    if (AUTH_FAILURE_RES.some((re) => re.test(last[i]))) return last[i].slice(0, 200);
  }
  return null;
}

/**
 * Does this run's end look like a CLI that could not sign in? The rule Kevin
 * set: a non zero exit in the first minute, or a recognised sign in failure.
 * The failure line alone is not enough on a long run that ended cleanly (that
 * is an agent that finished work which mentioned a login), so:
 *
 *   exit != 0 within EARLY_EXIT_MS           yes
 *   exit != 0 later, with a failure line     yes
 *   exit 0 within EARLY_EXIT_MS, with a line yes
 *   anything else                            no
 *
 * A signal is a kill from outside, not a sign in problem, unless the line
 * says otherwise. A custom command is never offered (no login is known).
 */
export function offerSignInAfterExit(e: { provider: AgentProvider; exitCode: number; signal?: number; ranMs: number; tail: string }): { offer: boolean; line: string | null } {
  if (e.provider === 'custom') return { offer: false, line: null };
  const line = authFailureLine(e.tail);
  const early = e.ranMs >= 0 && e.ranMs < EARLY_EXIT_MS;
  const killed = typeof e.signal === 'number' && e.signal !== 0;
  if (killed) return { offer: !!line && early, line };
  if (e.exitCode !== 0) return { offer: early || !!line, line };
  return { offer: early && !!line, line };
}

/**
 * Is this run a print mode run, one that answers once and exits? Then a clean
 * exit is the task finishing, not the agent stopping (founder, batch 2:
 * Copilot's row said "This agent stopped" after it had answered). Read from
 * the argv the agent was spawned with: -p, --print or --prompt (Copilot,
 * Claude, Gemini, Qwen), or `codex exec`.
 */
export function isPrintModeRun(provider: AgentProvider, args: readonly string[]): boolean {
  if (provider === 'codex' && args[0] === 'exec') return true;
  return args.some((a) => a === '-p' || a === '--print' || a === '--prompt' || a.startsWith('--prompt=') || a.startsWith('--print='));
}
