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

/** Choose the managed remote transport only when Codex supports the launch.
 * Remote resume cannot override permissions, and remote launches cannot accept
 * --add-dir. Keep those options intact in a local TUI rather than weakening the
 * requested permissions or losing the hive's writable directories. */
export function planCodexLaunch(args: string[]): {
  args: string[];
  managedRemote: boolean;
  localReason?: string;
} {
  // Respect an explicitly selected transport; never redirect an external server
  // to an agent's local home or start a managed daemon for --no-daemon.
  if (args.some(a => a === '--remote' || a.startsWith('--remote=') || a === '--no-daemon')) {
    return { args, managedRemote: false };
  }

  const valueOptions = new Set([
    '--model', '-m', '--config', '-c', '--profile', '-p', '--cd', '-C',
    '--image', '-i', '--enable', '--disable', '--local-provider',
    '--ask-for-approval', '-a', '--sandbox', '-s', '--add-dir',
    '--permission-profile', '-P'
  ]);
  const permissionOptions = new Set([
    '--ask-for-approval', '-a', '--sandbox', '-s', '--profile', '-p',
    '--permission-profile', '-P', '--full-auto', '--approve-for-me',
    '--dangerously-bypass-approvals-and-sandbox', '--yolo'
  ]);
  let resume = false;
  let positionalSeen = false;
  let permissions = false;
  let extraDirs = false;
  let bypass = false;
  const directoryArgIndices = new Set<number>();
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--') break; // remaining tokens are literal positional text
    const option = arg.split('=', 1)[0];
    if (!arg.startsWith('-')) {
      if (!positionalSeen) resume = arg === 'resume' || arg === 'fork';
      positionalSeen = true;
      continue;
    }
    if (permissionOptions.has(option) || /^-[asPp].+/.test(arg)) permissions = true;
    if (option === '--dangerously-bypass-approvals-and-sandbox' || option === '--yolo') bypass = true;
    if (option === '--add-dir') {
      extraDirs = true;
      directoryArgIndices.add(i);
      if (arg === option && i + 1 < args.length) directoryArgIndices.add(i + 1);
    }
    if (option === '--config' || option === '-c' || arg.startsWith('-c')) {
      const config = arg === option && (option === '-c' || option === '--config')
        ? args[i + 1] ?? '' : arg.slice(option === '--config' ? '--config='.length : 2).replace(/^=/, '');
      if (/^(approval_policy|sandbox_mode|sandbox_workspace_write|permissions|default_permissions)([.=]|$)/.test(config)) {
        permissions = true;
      }
    }
    if (valueOptions.has(option) && arg === option) i++;
  }

  // Full bypass already permits access to the entire filesystem. These roots
  // are redundant only in that explicit mode; retain them for sandboxed runs.
  const launchArgs = bypass ? args.filter((_, i) => !directoryArgIndices.has(i)) : args;
  const localReason = resume && (permissions || extraDirs)
    ? 'remote resume does not support permission overrides'
    : extraDirs && !bypass ? 'remote launches do not support --add-dir' : undefined;
  return localReason
    ? { args: ['--no-daemon', ...args], managedRemote: false, localReason }
    : { args: launchArgs, managedRemote: true };
}

/** Global options must precede `resume`, so prepend the endpoint in all cases. */
export function withCodexRemoteArgs(args: string[], endpoint: string): string[] {
  if (args.includes('--remote')) return args;
  return ['--remote', endpoint, ...args];
}
