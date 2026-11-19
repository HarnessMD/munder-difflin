/**
 * The text of the `hive-node` launcher (hive.ts writeNodeLauncher), and the
 * probe for a real system node it prefers (#493).
 *
 * `hive-node` runs once per hook and once per hive CLI call, and each call cold
 * starts whatever binary is baked in. A real node starts far faster than the
 * Electron binary run as node (measured on Windows 11 by the author of #493:
 * about 132 ms against 225 ms per call), so a new enough system node is baked
 * in first.
 *
 * Electron stays the guarantee. A hook runs with a bare PATH where an nvm or
 * Homebrew node is invisible, which is why the launcher exists at all, and a
 * baked node path goes stale the moment the user removes or switches node
 * (nvm use, brew upgrade). So the script checks the baked node is still there
 * EVERY run and falls back to Electron as node when it is not: removing node
 * never breaks a hook, it only makes it slower until the next bootstrap
 * re-bakes the launcher.
 *
 * No Electron import, so test/hive-node-system.test.cjs runs it directly.
 */
import { existsSync } from 'node:fs';
import { delimiter, isAbsolute, join } from 'node:path';

export interface LauncherBodies {
  /** hive-node.cmd on Windows, hive-node elsewhere. */
  main: string;
  /** The POSIX sh launcher. On POSIX it is `main`; on Windows it is written
   *  beside the .cmd for Claude Code's Git Bash (#477), forward slashes. */
  posix: string;
}

/** The launcher texts for this platform. `systemNode` null: Electron only,
 *  exactly the launcher before #493. */
export function nodeLauncherBodies(execPath: string, systemNode: string | null, platform: NodeJS.Platform = process.platform): LauncherBodies {
  // Forward slashes inside the sh script on every platform: bash keeps them,
  // Windows accepts them, and a backslash is the one character sh treats
  // specially even inside double quotes.
  const fwd = (p: string): string => p.replace(/\\/g, '/');
  const electronSh = `ELECTRON_RUN_AS_NODE=1 exec "${fwd(execPath)}" "$@"\n`;
  const posix = systemNode
    ? `#!/bin/sh\nif [ -x "${fwd(systemNode)}" ]; then exec "${fwd(systemNode)}" "$@"; fi\n${electronSh}`
    : `#!/bin/sh\n${electronSh}`;
  if (platform !== 'win32') return { main: posix, posix };
  const electronCmd = `set ELECTRON_RUN_AS_NODE=1\r\n"${execPath}" %*\r\n`;
  const main = systemNode
    // goto keeps parentheses out of it: a path like "Program Files (x86)"
    // inside an if ( ... ) block would close the block early.
    ? `@echo off\r\nif not exist "${systemNode}" goto electron\r\n"${systemNode}" %*\r\ngoto :eof\r\n:electron\r\n${electronCmd}`
    : `@echo off\r\n${electronCmd}`;
  return { main, posix };
}

/** The first `node` on `pathValue`, as an absolute path, or null. A plain
 *  directory scan: no shell, so no login shell probe on the main thread. */
export function findNodeOnPath(pathValue: string, platform: NodeJS.Platform = process.platform): string | null {
  const names = platform === 'win32' ? ['node.exe'] : ['node'];
  const sep = platform === 'win32' ? ';' : delimiter;
  for (const dir of pathValue.split(sep)) {
    const d = dir.trim().replace(/^"(.*)"$/, '$1');
    if (!d || !isAbsolute(d)) continue;
    for (const n of names) {
      const p = join(d, n);
      if (existsSync(p)) return p;
    }
  }
  return null;
}
