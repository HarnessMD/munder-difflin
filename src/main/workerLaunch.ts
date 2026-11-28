/**
 * How a god-hired worker's spawn request becomes an executable + argv, as a
 * pure function: this exact translation silently killed real workers for days
 * while reporting success, which is what earned it a unit test.
 */
import {
  autoModeFlagForProvider,
  commandForExplicitProvider,
  hasAutoModeStance,
  inferAgentProvider,
  normalizeAgentProvider
} from '../shared/agentProvider';
import { joinCommandLine, tokenizeCommand } from '../shared/commandLine';

/** What main can read of a lasting agent's launch (0.5.6, for a clone). The
 *  hive registry holds the provider alone; the line an agent starts on and the
 *  model it was given live on its card, which the renderer mirrors into
 *  roster.json on every change (store.ts `Agent`). */
export interface SavedCard {
  name?: string;
  /** The full launch LINE, flags included, as the Edit Agent box holds it. */
  command?: string;
  provider?: string;
  model?: string;
  character?: string;
  accent?: string;
}

/** One agent's card out of a roster snapshot: on the floor, archived or
 *  restorable, in that order. Null when the roster has no card for the id. */
export function savedCardOf(
  roster: { agents?: unknown; archived?: unknown; restorable?: unknown } | null | undefined,
  agentId: string
): SavedCard | null {
  for (const list of [roster?.agents, roster?.archived, roster?.restorable]) {
    if (!Array.isArray(list)) continue;
    for (const entry of list) {
      if (!entry || typeof entry !== 'object' || (entry as { id?: unknown }).id !== agentId) continue;
      const text = (key: string): string | undefined => {
        const v = (entry as Record<string, unknown>)[key];
        return typeof v === 'string' && v.trim() ? v.trim() : undefined;
      };
      return { name: text('name'), command: text('command'), provider: text('provider'), model: text('model'), character: text('character'), accent: text('accent') };
    }
  }
  return null;
}

/** The engine fields a clone's launch is built from: its source's line,
 *  provider and model, unless the request sets its own. A request that names a
 *  `command` or a `provider` chose its engine, so nothing of the source's is
 *  mixed in (a Claude model handed to a Codex line fails the temp at launch).
 *  A request that names only a `model` keeps the source's line and puts its
 *  model on it; the line's own `--model` is taken out first, because
 *  buildWorkerLaunch lets a model on the line win over the separate field. */
export function cloneEngine(
  request: { command?: unknown; provider?: unknown; model?: unknown },
  source: SavedCard | null
): { command?: unknown; provider?: unknown; model?: unknown } {
  const named = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
  if (!source || named(request.command) || named(request.provider)) return { command: request.command, provider: request.provider, model: request.model };
  if (!named(request.model)) return { command: source.command, provider: source.provider, model: source.model };
  const tokens = tokenizeCommand(source.command ?? '');
  const kept: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] === '--model') { i++; continue; }
    if (!tokens[i].startsWith('--model=')) kept.push(tokens[i]);
  }
  return { command: kept.length > 0 ? joinCommandLine(kept) : undefined, provider: source.provider, model: request.model };
}

/** What a clone is told before its job: whose copy it is, where that agent's
 *  rules are, and what it must leave alone. `palace` is whether `mempalace` is
 *  on its PATH; without it the search line would name a command that is not
 *  there. */
export function cloneBrief(source: {
  id: string; name: string; role?: string;
  /** ABSOLUTE path of the source's hive folder (memory.md, inbox). */
  agentDir: string;
  /** ABSOLUTE path of the source's memory.md. */
  memoryPath: string;
  /** The folder the source works in, when the clone got a worktree of its own
   *  cut from it. Absent when the two share one folder (not a git repo). */
  cwd?: string;
  /** The source's folder when it is not a git repository: the clone runs in
   *  `ownFolder`, a new empty folder, and may only read this one. */
  readOnly?: string;
  ownFolder?: string;
  palace: boolean;
}): string {
  return `[CLONE] You are a temp cloned from ${source.name} (${source.id}). Its role: ${source.role?.trim() || 'agent'}. `
    + `Read the Rules part of ${source.memoryPath} first. `
    + (source.palace ? 'Search the rest with `md-memory search "<a few words>"`; never read the whole file. ' : '')
    + (source.cwd
      ? `Never write to that agent's memory, its inbox or its folders (${source.agentDir} and ${source.cwd}). Your own folder is a copy of its branch, and its uncommitted changes are not in it.`
      : source.readOnly && source.ownFolder
        ? `Never write to that agent's memory, its inbox or its folders (${source.agentDir} and ${source.readOnly}). ${source.readOnly} is not a git repository, so you have no copy of it: read files there when the work needs them, and write only in your own folder ${source.ownFolder}, which starts empty.`
        : `Never write to that agent's memory, its inbox or its folder ${source.agentDir}.`);
}

export interface WorkerLaunch {
  /** The executable name alone — what the PTY layer resolves and spawns. */
  bin: string;
  /** Everything else, in argv form, model flag included when applicable. */
  args: string[];
  /** The full effective command line, for display and floor cards. */
  command: string;
}

export function buildWorkerLaunch(opts: {
  /** `command` from the spawn request — god authors a full command LINE. */
  requestCommand?: unknown;
  requestProvider?: unknown;
  /** Separate `model` field from the request, if any. */
  requestModel?: unknown;
  /** config.subAgentDefaultModel (#585): the model for a god-started temp whose
   *  request names none. Claude ids only, so it applies to Claude temps only. */
  fallbackModel?: string;
  defaultCommand?: string;
  /** The app's auto (skip-permissions) setting. */
  autoMode: boolean;
}): WorkerLaunch {
  const requestCommand =
    typeof opts.requestCommand === 'string' && opts.requestCommand.trim()
      ? opts.requestCommand.trim()
      : '';
  const requestProvider = normalizeAgentProvider(opts.requestProvider);
  const fallbackCommand = opts.defaultCommand?.trim() || 'claude';
  // An explicit command may be a wrapper or shim and stays authoritative.
  // Without one, a request that names a provider launches that provider's CLI
  // (#499): `{provider:"codex"}` used to run the configured default, often
  // claude, with codex flags. The configured command is still used when it
  // serves the same provider (its own flags, or a Claude wrapper).
  let command =
    requestCommand ||
    (requestProvider ? commandForExplicitProvider(requestProvider, fallbackCommand) || fallbackCommand : fallbackCommand);
  // Inherit the app's auto (skip-permissions) mode when the request takes no
  // stance of its own: a headless worker has no human to click through tool
  // prompts, so without the flag it stalls at the first ask until the idle
  // reaper kills it. The flag is the PROVIDER'S — a codex worker needs
  // `-a never -s workspace-write`, and claude's --permission-mode
  // would mean nothing to it (an earlier hardcoded-claude version left every
  // non-claude worker stalling; review caught it). An explicit stance in the
  // request still wins: the flag's leading token already present as a TOKEN
  // (not substring — copilot's flag starts with `-s`) means the request chose.
  const provider = inferAgentProvider(command, requestProvider);
  const autoFlag = opts.autoMode ? autoModeFlagForProvider(provider) : '';
  if (autoFlag && !hasAutoModeStance(tokenizeCommand(command), provider)) {
    command += ` ${autoFlag}`;
  }
  // god authors `command` as a full command LINE ("claude --model … --permission-mode …"),
  // but the PTY layer takes ONE executable name (resolveCommand) plus argv — the
  // unsplit line made node-pty exec a binary literally named like the whole
  // string → ENOENT → the worker died within ~1s of spawning while its request
  // archived as .done (this killed both flag-carrying Ryan spawns on 2026-08-16;
  // only the bare-`claude` one lived). Split with the SAME tokenizer the
  // renderer's spawn flows use, and hand the flags over as argv.
  const tokens = tokenizeCommand(command);
  const bin = tokens[0] || command;
  const flags = tokens.slice(1);
  // A separate `model` field only applies when the command line didn't pick a
  // model itself (spawnAgentCore likewise skips its default-model injection
  // when argv already carries --model).
  // The fallback is gated on the provider: a Claude id handed to
  // `codex --model` would fail the temp at launch.
  const fallback =
    provider === 'claude' && typeof opts.fallbackModel === 'string' && opts.fallbackModel.trim()
      ? opts.fallbackModel.trim()
      : '';
  const model =
    typeof opts.requestModel === 'string' && opts.requestModel.trim() ? opts.requestModel.trim() : fallback;
  const args = [...flags, ...(model && !flags.includes('--model') ? ['--model', model] : [])];
  return { bin, args, command };
}
