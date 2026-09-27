/**
 * The descriptor main broadcasts on `hive:agentSpawned`, from which the renderer
 * builds the floor card for a worker it did not start itself: one the
 * orchestrator hired, one hired by voice, or one brought back from the archive.
 *
 * 0.5.3 bug 7. By the time main broadcasts, it has already resolved the worker's
 * real engine (inferred from the binary when the request names none) and its
 * model (from the command line, the request's separate `model`, or the floor
 * default). It sent neither. The engine went out as the request's raw field or
 * 'claude', so a codex worker hired with `command: "codex"` was carded as Claude;
 * the model never went out, so the row read "CLI default" for a worker main had
 * started on a named model; and the unarchive path sent the id alone, so that
 * row was named after the raw id with no engine and no folder.
 *
 * One builder for all three broadcasts, so they cannot drift apart again.
 */
import { inferAgentProvider, type AgentProvider } from './agentProvider';
import { tokenizeCommand } from './commandLine';

export interface SpawnedCardInput {
  id: string;
  name?: string;
  /** The request's or the registry's provider, if any. Explicit wins. */
  provider?: unknown;
  cwd?: string;
  /** The command LINE as authored (may carry flags). */
  command?: string;
  /** argv main actually spawned with, when it differs from the command line. */
  args?: readonly string[];
  role?: string;
  worktreePath?: string;
  character?: string;
  accent?: string;
}

export interface SpawnedCard {
  id: string;
  name: string;
  provider: AgentProvider;
  cwd: string;
  command?: string;
  model?: string;
  role?: string;
  worktreePath?: string;
  character?: string;
  accent?: string;
}

/** The value of `--model`, in either `--model x` or `--model=x` form. Every
 *  provider preset uses `--model` (agentProvider.ts). Undefined when absent, or
 *  when what follows the flag is another flag. */
export function modelFromArgs(args: readonly string[]): string | undefined {
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--model=')) return a.slice('--model='.length) || undefined;
    if (a === '--model') {
      const v = args[i + 1];
      return v && !v.startsWith('-') ? v : undefined;
    }
  }
  return undefined;
}

export function spawnedCard(input: SpawnedCardInput): SpawnedCard {
  const tokens = input.command ? tokenizeCommand(input.command) : [];
  return {
    id: input.id,
    name: input.name?.trim() || input.id,
    provider: inferAgentProvider(input.command, input.provider),
    cwd: input.cwd ?? '',
    command: input.command,
    // The command line is what a restore replays, so it is asked first.
    model: modelFromArgs(tokens.slice(1)) ?? modelFromArgs(input.args ?? []),
    role: input.role,
    worktreePath: input.worktreePath,
    character: input.character,
    accent: input.accent
  };
}
