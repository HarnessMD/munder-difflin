import { realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { isAbsolute, parse, relative, resolve, sep } from 'node:path';
import { officePaths } from '../core/paths';

/** Why an agent may not work in a folder. */
export type UnsafeAgentFolder = 'root' | 'home' | 'contains-app-data';

/** The app's data folder (config.json, the stores, the secrets), or null before a
 *  host has registered its paths. */
function appDataFolder(): string | null {
  try { return officePaths().userData(); } catch { return null; }
}

const real = (p: string): string => { try { return realpathSync(p); } catch { return resolve(p); } };

/** `d` is `base` or inside it. */
const within = (base: string, d: string): boolean => {
  const r = relative(base, d);
  return r === '' || (r !== '..' && !r.startsWith(`..${sep}`) && !isAbsolute(r));
};

/** True when `dir` is the app's data folder or holds it, by its path or through a link. */
export function holdsAppData(dir: string, appData: string | null = appDataFolder()): boolean {
  if (!appData) return false;
  return within(resolve(dir), resolve(appData)) || within(real(dir), real(appData));
}

/**
 * Why an agent may not work in `folder`, or null when it may.
 *
 * An agent's working folder is the first of its writable folders. The disk root
 * and the home folder hold everything, and a folder that holds the app's data
 * folder would put config.json and the secrets inside the agent's reach: Claude's
 * sandbox carves that folder back out (userDataDeny in hive.ts), Codex's
 * workspace-write has no way to. Symlinks are followed, so a link to home counts.
 */
export function unsafeAgentFolder(
  folder: string,
  home: string = homedir(),
  appData: string | null = appDataFolder()
): UnsafeAgentFolder | null {
  const plain = resolve(folder);
  const linked = real(folder);
  if (plain === parse(plain).root || linked === parse(linked).root) return 'root';
  if (plain === resolve(home) || linked === real(home)) return 'home';
  if (holdsAppData(folder, appData)) return 'contains-app-data';
  return null;
}

/** What the person is told when a spawn is refused for its folder. */
export function unsafeAgentFolderMessage(folder: string, why: UnsafeAgentFolder): string {
  const what = why === 'root' ? 'the top of the disk'
    : why === 'home' ? 'your home folder'
    : "a folder that holds the app's own data folder";
  return `An agent can't work in ${folder}: it is ${what}, which would let the agent change the app's own settings. Pick a project folder instead.`;
}
