/**
 * Is this CLI signed in? (0.5.3, batch 2 (e), the founder: "think about how
 * can we have a hook to see if installed and logged in"; the provider table
 * and these rules were agreed with Kevin on 24 Sep 2026 before building.)
 *
 * Installed is already answered elsewhere (the binary resolves on the spawn
 * PATH). Signed in is answered here, and only for the three CLIs that have a
 * non-interactive status command whose answer can be read without guessing:
 *
 *   claude  `claude auth status`   exit 0 signed in; exit 1 with JSON
 *                                  {"loggedIn": false} signed out
 *   codex   `codex login status`   exit 0 signed in; exit 1 with
 *                                  "Not logged in" signed out
 *   cursor  `cursor-agent status`  exits 0 either way, so the text decides:
 *                                  exactly "Not logged in" signed out, a line
 *                                  "Logged in as ..." signed in. Matched
 *                                  against cursor-agent 2026.09.23-86fc751
 *                                  (its status printer, 3939.index.js).
 *
 * Copilot has none (batch 2, 24 Sep 2026): `copilot help` (1.0.88) lists no
 * status or whoami command, and its sign in is either its own OAuth token in
 * the keychain or, failing that, whatever `gh auth token` prints (it runs gh
 * from PATH; seen with a stand in gh in a throwaway HOME). Neither can be read
 * without touching the keychain or the network, so Copilot is 'unknown' and a
 * signed out run is caught when it ends instead (offerSignInAfterExit).
 *
 * Every other provider, and every answer that is not one of those, is
 * 'unknown' (cannot tell): the panel with "Setup complete, start agent" is
 * shown, and the person decides. The rules Kevin set:
 *   - the check runs with the agent's own spawn environment (its per agent
 *     CLI home), stdin closed, a 10 second limit, and is killed by pid when
 *     it runs over;
 *   - a check that fails or times out is 'unknown', never 'signed out';
 *   - the app never touches the macOS keychain itself (no `security`, no
 *     keytar): a keychain prompt in front of the person is worse than the
 *     panel. The CLI's own status command reads the CLI's own credential
 *     store, which may be a keychain item the CLI created; that is the same
 *     read the CLI makes every time an agent starts.
 */
import { spawn } from 'node:child_process';
import type { AgentProvider } from '../shared/agentProvider';

export type SignInState = 'signed-in' | 'signed-out' | 'unknown';

/** The status argv per provider, for the three that have a readable one. */
const STATUS_ARGS: Partial<Record<AgentProvider, string[]>> = {
  claude: ['auth', 'status'],
  codex: ['login', 'status'],
  cursor: ['status']
};

export const SIGNIN_CHECK_TIMEOUT_MS = 10_000;

/** True when this provider has a status command the app reads. */
export function hasSignInCheck(provider: AgentProvider): boolean {
  return !!STATUS_ARGS[provider];
}

const ANSI = new RegExp(String.fromCharCode(27) + '\\[[0-9;?]*[A-Za-z]', 'g');

/** Read one status run. Pure, so every rule above is tested on its own. */
export function readSignInStatus(provider: AgentProvider, exitCode: number | null, stdout: string, stderr: string): SignInState {
  const out = stdout.replace(ANSI, '');
  const all = (out + '\n' + stderr.replace(ANSI, '')).trim();
  switch (provider) {
    case 'claude': {
      if (exitCode === 0) return 'signed-in';
      if (exitCode !== 1) return 'unknown';
      try {
        const j = JSON.parse(out) as { loggedIn?: unknown };
        return j.loggedIn === false ? 'signed-out' : 'unknown';
      } catch { return 'unknown'; }
    }
    case 'codex': {
      if (exitCode === 0) return 'signed-in';
      // codex prints a harmless PATH alias warning first on some homes, so the
      // signed out line is looked for as a whole line, not as the whole output.
      if (exitCode === 1 && all.split(/\r?\n/).some((l) => l.trim() === 'Not logged in')) return 'signed-out';
      return 'unknown';
    }
    case 'cursor': {
      if (exitCode !== 0) return 'unknown';
      const lines = out.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length === 1 && lines[0] === 'Not logged in') return 'signed-out';
      if (lines.some((l) => /^(\S+\s+)?Logged in as \S/.test(l))) return 'signed-in';
      return 'unknown';
    }
    default:
      return 'unknown';
  }
}

/**
 * Run the provider's status command and read it. `binPath` is the resolved
 * binary; `env` is the full environment the agent is spawned with. Never
 * throws: anything that goes wrong is 'unknown'.
 */
export function checkSignedIn(
  provider: AgentProvider,
  binPath: string,
  env: Record<string, string | undefined>,
  cwd: string,
  timeoutMs: number = SIGNIN_CHECK_TIMEOUT_MS
): Promise<SignInState> {
  const args = STATUS_ARGS[provider];
  if (!args) return Promise.resolve('unknown');
  return new Promise((resolve) => {
    let settled = false;
    const done = (s: SignInState) => { if (!settled) { settled = true; resolve(s); } };
    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(binPath, args, { cwd, env: env as NodeJS.ProcessEnv, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    } catch { done('unknown'); return; }
    let stdout = '';
    let stderr = '';
    const cap = 64 * 1024;
    child.stdout?.on('data', (d: Buffer) => { if (stdout.length < cap) stdout += d.toString('utf8'); });
    child.stderr?.on('data', (d: Buffer) => { if (stderr.length < cap) stderr += d.toString('utf8'); });
    const timer = setTimeout(() => {
      // Over time: killed by pid, and the answer is "cannot tell".
      if (child.pid) { try { process.kill(child.pid, 'SIGKILL'); } catch { /* already gone */ } }
      done('unknown');
    }, timeoutMs);
    child.on('error', () => { clearTimeout(timer); done('unknown'); });
    child.on('close', (code) => { clearTimeout(timer); done(readSignInStatus(provider, code, stdout, stderr)); });
  });
}
