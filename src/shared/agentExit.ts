/**
 * An agent's process has ended by itself. What does the floor say? (0.5.3
 * feature 18.)
 *
 * Until now a dead agent said nothing anywhere a person looks. The terminal
 * pane printed "process exited (code N)", but only if that agent's terminal had
 * been opened, and the sidebar row kept whatever dot it had. Main recorded an
 * abnormal death in log.jsonl and told the renderer nothing.
 *
 * A deliberate kill never gets here: `ptyManager.kill()` deletes the session
 * before node-pty's exit callback fires, so the exit handler only sees a process
 * that ended on its own. That is what makes "crashed" an honest word for it.
 */

/** 'finished': a print mode run (it answers once and exits, Copilot's -p)
 *  that exited cleanly. Its task is done; it did not stop or crash (founder,
 *  batch 2, 24 Sep 2026). Restartable like the other two. */
export type ExitVerdict = 'crashed' | 'stopped' | 'finished';

export interface AgentExit {
  verdict: ExitVerdict;
  exitCode?: number;
  signal?: number;
  at: number;
}

/** The rule hive.recordAgentExit already uses for "abnormal": a signal means
 *  killed (node-pty reports exitCode 0 in that case, so the signal is checked on
 *  its own), and so does a non zero code. A clean exit is a person typing /exit:
 *  the agent is just as gone, and just as restartable, but it did not crash. */
export function exitVerdict(exitCode: number | undefined, signal: number | undefined, printMode = false): ExitVerdict {
  const abnormal = (typeof signal === 'number' && signal !== 0) || (typeof exitCode === 'number' && exitCode !== 0);
  if (abnormal) return 'crashed';
  return printMode ? 'finished' : 'stopped';
}

export function agentExitOf(exitCode: number | undefined, signal: number | undefined, at: number, printMode = false): AgentExit {
  return { verdict: exitVerdict(exitCode, signal, printMode), exitCode, signal, at };
}
