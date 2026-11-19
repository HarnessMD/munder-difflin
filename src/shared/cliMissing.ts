/**
 * A missing engine CLI, said calmly (0.5.3, I2, the founder's 23 Sep list).
 *
 * Until now a spawn whose binary was not on PATH ran the install ladder by
 * itself in the agent's terminal, and a failure ended in "process exited
 * (code 1)": the person saw an error for something that had not started.
 * Now main spawns nothing and sends this state instead; the terminal draws
 * an information card with one button, and the install runs only when the
 * person presses it. The relaunch after a clean install is the seam that
 * already existed (pty:relaunch): the terminal alone restarts.
 *
 * Shared and dependency free so the renderer can draw it and the test can
 * load it without Electron. Main builds it from the ladder (cliInstall.ts).
 */
import type { AgentProvider } from './agentProvider';

export type CliMissingRung = 'npm' | 'node-then-npm' | 'native' | 'manual';

export interface CliMissingState {
  provider: AgentProvider;
  /** The provider's friendly name ("Claude Code"). */
  label: string;
  /** The binary that was not found. */
  bin: string;
  rung: CliMissingRung;
  /** The exact command Install runs, in this terminal, for the person to read
   *  before pressing. Null on the manual rung: nothing we can run here. */
  command: string | null;
  /** On the manual rung, the line a person can paste after they have fixed
   *  what is missing (the provider's npm line when Node is the gap). */
  manualCommand: string | null;
  /** Node.js is absent or too old for the npm rung. */
  nodeMissing: boolean;
  /** The Node the node-then-npm rung installs first ("v24.19.0"). */
  nodeVersion?: string;
  docsUrl?: string;
  /** The last attempt, when Install ran and did not finish: the card comes
   *  back with the installer's own last lines and Try again. */
  failed?: { exitCode: number; tail: string };
}

const ANSI = new RegExp(String.fromCharCode(27) + '\\[[0-9;?]*[A-Za-z]', 'g');

/** The last lines of an installer's output, plain text, for the card. ANSI
 *  colour is stripped, blank lines dropped, `keep` lines at most. */
export function installerTail(tail: string | undefined, keep = 8): string {
  if (!tail) return '';
  const lines = tail.replace(ANSI, '').split(/\r?\n|\r/).map((l) => l.trimEnd()).filter((l) => l.trim());
  return lines.slice(-keep).join('\n');
}

/** Which button the card offers. Install and Try again run the rung; Check
 *  again re-probes PATH for a CLI the person installed by hand. */
export function cliMissingAction(s: CliMissingState): 'install' | 'retry' | 'check' {
  if (s.rung === 'manual') return 'check';
  return s.failed ? 'retry' : 'install';
}
