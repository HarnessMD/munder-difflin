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

/** Global options must precede `resume`, so prepend the endpoint in all cases.
 *  --add-dir never survives next to --remote (see splitCodexAddDirs). */
export function withCodexRemoteArgs(args: string[], endpoint: string): string[] {
  const rest = splitCodexAddDirs(args).args;
  if (rest.includes('--remote')) return rest;
  return ['--remote', endpoint, ...rest];
}
