import { createHash } from 'node:crypto';
import { join } from 'node:path';

export const CODEX_REMOTE_SOCKET_RELATIVE =
  'app-server-control/app-server-control.sock';

/** macOS caps a Unix socket path at 104 bytes (`sun_path`), and Codex builds its
 *  control socket as `$CODEX_HOME/app-server-control/app-server-control.sock` —
 *  42 bytes of suffix. So the alias home itself must fit in ~61 bytes.
 *
 *  `$TMPDIR` cannot host it: macOS spells it
 *  `/var/folders/xx/<30-char-hash>/T/` (49 bytes) and the alias came out at 121
 *  — LONGER than the 118-byte real home it was introduced to shorten, so every
 *  daemon start failed with `path must be shorter than SUN_LEN`. Root the alias
 *  at a fixed short prefix instead and keep the digest to 8 hex chars: the whole
 *  socket path then lands at 60 bytes with room to spare. */
export const CODEX_REMOTE_ALIAS_ROOT = '/tmp/mdc';

/** Longest socket path the platform will accept, minus a small safety margin. */
export const CODEX_REMOTE_SOCKET_MAX = 104;

/** Keep the CODEX_HOME spelling short enough for macOS's Unix-socket limit.
 *  `tempRoot` defaults to the short fixed root; callers may override it (tests). */
export function codexRemoteAliasPath(
  realHome: string,
  agentId: string,
  tempRoot: string = CODEX_REMOTE_ALIAS_ROOT
): string {
  const digest = createHash('sha256')
    .update(`${realHome}\0${agentId}`)
    .digest('hex')
    .slice(0, 8);
  return join(tempRoot, digest);
}

/** Whether a candidate home yields a control socket the platform can bind. */
export function codexRemoteSocketFits(shortHome: string): boolean {
  return join(shortHome, CODEX_REMOTE_SOCKET_RELATIVE).length < CODEX_REMOTE_SOCKET_MAX;
}

export function codexRemoteEndpoint(shortHome: string): string {
  return `unix://${join(shortHome, CODEX_REMOTE_SOCKET_RELATIVE)}`;
}

/** Pull every `--add-dir <dir>` (and `--add-dir=<dir>`) out of an argv.
 *
 *  Codex refuses the pair outright: `Error: --add-dir is not supported with
 *  --remote. Configure additional workspace roots on the server.` A user hit
 *  exactly that (0.5.3): the hive adds the agent folder and the hive root as
 *  writable roots for auto mode, and remote control then killed the session at
 *  launch. Under --remote the roots belong in the daemon's config instead
 *  (`codexWritableRootsToml`). */
export function splitCodexAddDirs(args: string[]): { args: string[]; dirs: string[] } {
  const out: string[] = [];
  const dirs: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--add-dir' && i + 1 < args.length) { dirs.push(args[++i]); continue; }
    if (a.startsWith('--add-dir=')) { dirs.push(a.slice('--add-dir='.length)); continue; }
    out.push(a);
  }
  return { args: out, dirs };
}

/** Put `dirs` into a Codex config.toml as `sandbox_workspace_write.writable_roots`,
 *  the server side twin of --add-dir. Returns null when the config already sets
 *  writable_roots itself: merging someone's own list is not ours to guess, and
 *  the caller then keeps the plain local TUI, where --add-dir still works.
 *
 *  A dotted key has to sit above the first table header, and a second
 *  `[sandbox_workspace_write]` header would be a duplicate table, so the line
 *  goes under the user's header when there is one and at the top otherwise. */
export function codexWritableRootsToml(toml: string, dirs: string[]): string | null {
  if (dirs.length === 0) return toml;
  if (/^\s*(sandbox_workspace_write\.)?writable_roots\s*=/m.test(toml)) return null;
  const list = `[${dirs.map((d) => JSON.stringify(d)).join(', ')}]`;
  const header = /^\s*\[sandbox_workspace_write\]\s*$/m.exec(toml);
  if (header) {
    const at = header.index + header[0].length;
    return `${toml.slice(0, at)}\nwritable_roots = ${list}${toml.slice(at)}`;
  }
  return `sandbox_workspace_write.writable_roots = ${list}\n${toml}`;
}

/** Turn on the network inside Codex's workspace-write sandbox:
 *  it is off there by default, and an agent's git fetch, push and gh need it.
 *  `sandbox_workspace_write.network_access = true`, placed as the writable
 *  roots line is. A config that sets network_access itself is left as it is:
 *  the person's own choice wins. Applies only when the sandbox is
 *  workspace-write; Codex ignores the table otherwise. */
export function codexNetworkToml(toml: string): string {
  if (/^\s*(sandbox_workspace_write\.)?network_access\s*=/m.test(toml)) return toml;
  const header = /^\s*\[sandbox_workspace_write\]\s*$/m.exec(toml);
  if (header) {
    const at = header.index + header[0].length;
    return `${toml.slice(0, at)}\nnetwork_access = true${toml.slice(at)}`;
  }
  return `sandbox_workspace_write.network_access = true\n${toml}`;
}

/** Codex's global options that take a value as the next word (`codex --help`,
 *  0.164.0). Read so the subcommand is found behind them: `-m x resume <id>`. */
const CODEX_VALUE_OPTIONS = new Set([
  '-m', '--model', '-c', '--config', '-p', '--profile', '-s', '--sandbox',
  '-a', '--ask-for-approval', '-C', '--cd', '--add-dir', '-i', '--image',
  '--remote', '--enable', '--disable', '--local-provider'
]);

/** The subcommands Codex refuses permission flags on when the task is on a
 *  remote app-server: `resume` and `fork` both answer "Permission overrides are
 *  not supported when resuming a remote task" (codex-cli 0.164.0). */
const CODEX_RESUMING_SUBCOMMANDS = new Set(['resume', 'fork']);

/** The first word of a Codex argv that is neither an option nor an option's
 *  value: the subcommand, or the prompt when there is none. */
export function codexSubcommand(args: readonly string[]): string | undefined {
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--') return args[i + 1];
    if (a.startsWith('-')) {
      if (CODEX_VALUE_OPTIONS.has(a)) i++;
      continue;
    }
    return a;
  }
  return undefined;
}

/** Whether this argv reopens a saved session (`codex resume` or `codex fork`).
 *  spawnAgent puts `resume` at argv[0]; a command a person typed may put global
 *  options in front of it, and that must not send it to the daemon either. */
export function isCodexResumeArgs(args: readonly string[]): boolean {
  const sub = codexSubcommand(args);
  return sub !== undefined && CODEX_RESUMING_SUBCOMMANDS.has(sub);
}

/** Pull every `--remote <endpoint>` (and `--remote=<endpoint>`) out of an argv. */
export function withoutCodexRemote(args: readonly string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--remote') { i++; continue; }
    if (a.startsWith('--remote=')) continue;
    out.push(a);
  }
  return out;
}

const SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The same argv as a FRESH start: the `resume`/`fork` subcommand, its session
 *  id and `--last` taken out, every other flag and the prompt kept. What the app
 *  starts after Codex refused a resume, so the next run cannot be that resume. */
export function withoutCodexResume(args: readonly string[]): string[] {
  if (!isCodexResumeArgs(args)) return [...args];
  const sub = codexSubcommand(args);
  const at = args.indexOf(sub as string);
  const rest = args.slice(at + 1);
  const afterId = rest.length > 0 && SESSION_ID.test(rest[0]) ? rest.slice(1) : rest;
  return [...args.slice(0, at), ...afterId.filter((a) => a !== '--last')];
}

/** Name the agent's own folder on Codex's command line. Under `--remote` the terminal's folder is
 *  not sent: the thread runs in the folder the daemon was started from, which is the app's, not the
 *  agent's. And a resume whose recorded folder differs from the terminal's stops on Codex's own
 *  "Working directory" question with nobody to answer it, which every session started under `--remote`
 *  does. `--cd` settles both (`codex --help` and `codex resume --help`, 0.164.0). */
export function withCodexFolder(args: string[], cwd: string | undefined): string[] {
  if (!cwd || args.includes('--cd') || args.includes('-C')) return args;
  if (isCodexResumeArgs(args)) return [...args.slice(0, 2), '--cd', cwd, ...args.slice(2)];
  return ['--cd', cwd, ...args];
}

/** Global options must precede `resume`, so prepend the endpoint in all cases.
 *  --add-dir never survives next to --remote (see splitCodexAddDirs).
 *
 *  A `resume` argv is handed back UNTOUCHED, with no endpoint: Codex refuses the
 *  permission flags it carries when the task is resumed on a remote app-server
 *  ("Permission overrides are not supported when resuming a remote task"), and it never applies
 *  `--dangerously-bypass-hook-trust` either, so the hive's eight generated hooks
 *  come back as "8 hooks are new or changed" and the worker sits on that popup
 *  for ever. The local TUI takes all of them (`codex resume --help`, 0.164.0),
 *  so a restart resumes locally and comes back working. An endpoint already on a
 *  resume argv (a command line copied from a remote session) is taken off too. */
export function withCodexRemoteArgs(args: string[], endpoint: string): string[] {
  if (isCodexResumeArgs(args)) return args.some((a) => a === '--remote' || a.startsWith('--remote=')) ? withoutCodexRemote(args) : args;
  const rest = splitCodexAddDirs(args).args;
  if (rest.includes('--remote')) return rest;
  return ['--remote', endpoint, ...rest];
}

/** Keep a resume off Codex's shared background app-server.
 *
 *  Dropping `--remote` (withCodexRemoteArgs) is not enough on its own. A restart
 *  deliberately KEEPS the agent's daemon alive so the agent coming straight back
 *  reuses it (teardownPty), and `codex resume` joins "the shared
 *  background server ... even if it is already running" (`codex resume --help`,
 *  0.164.0). A resume launched while that server is up is therefore a remote task
 *  again, by adoption rather than by argv, and Codex refuses its permission flags
 *  with the very error this whole path exists to avoid. `--no-daemon` says the
 *  quiet part out loud: this one invocation runs on its own.
 *
 *  Placed straight after `resume <id>`, as the folder flag is, so the positional
 *  session id and prompt keep their order. */
export function withoutCodexDaemon(args: string[]): string[] {
  if (!isCodexResumeArgs(args) || args.includes('--no-daemon')) return args;
  // After `resume` and its session id wherever the subcommand stands (a typed
  // line may put global options in front of it).
  const at = args.indexOf(codexSubcommand(args) as string);
  const after = at + 1 < args.length && !args[at + 1].startsWith('-') ? at + 2 : at + 1;
  return [...args.slice(0, after), '--no-daemon', ...args.slice(after)];
}
