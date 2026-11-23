/**
 * WHAT ONLY A DEVELOPMENT RUN MAY DO. A packaged app (the one people install)
 * takes none of these, whatever its environment or its command line says:
 *
 *   - the dev renderer address is used only by a build that is not packaged;
 *   - a packaged app does not start with a debug switch;
 *   - a packaged app opens a floor only on a folder it would have made itself.
 *
 * Every rule here takes "packaged" as a fact it is handed, so each is tested
 * as a packaged app without building one.
 * No electron import.
 */
import { basename, dirname, join } from 'node:path';
import { FLOORS_DIR, type FloorArgs } from './floorArgs';

type Env = Readonly<Record<string, string | undefined>>;

/** The dev server's address, or null: a packaged app has none. The ONE place
 *  that decides it; every window and the navigation rule ask here. */
export function devRendererUrl(packaged: boolean, env: Env): string | null {
  if (packaged) return null;
  return env.ELECTRON_RENDERER_URL || null;
}

/** Switches that open a way in to the running process for a debugger. */
const CHROMIUM_DEBUG = ['remote-debugging-port', 'remote-debugging-pipe', 'remote-debugging-address', 'remote-debugging-targets'];
const NODE_DEBUG = ['inspect', 'inspect-brk', 'inspect-brk-node', 'inspect-port', 'inspect-wait', 'inspect-publish-uid', 'debug', 'debug-brk', 'debug-port'];
const named = (arg: string, names: readonly string[]): string | null => {
  if (!arg.startsWith('--')) return null;
  const name = arg.slice(2).split('=')[0].toLowerCase();
  return names.includes(name) ? name : null;
};

/**
 * The debug switch this process was started with, by name, or null. Looked
 * for in every place one can come from: the command line, Node's own
 * arguments, NODE_OPTIONS, and what Chromium ended up with after it read its
 * own sources (`hasSwitch`, which is `app.commandLine.hasSwitch` in the app).
 */
export function debugSwitch(from: { argv: readonly string[]; execArgv: readonly string[]; env: Env; hasSwitch: (name: string) => boolean }): string | null {
  const all = [...CHROMIUM_DEBUG, ...NODE_DEBUG];
  for (const arg of [...from.argv.slice(1), ...from.execArgv, ...(from.env.NODE_OPTIONS ?? '').split(/\s+/)]) {
    const hit = named(arg, all);
    if (hit) return `--${hit}`;
  }
  for (const name of CHROMIUM_DEBUG) if (from.hasSwitch(name)) return `--${name}`;
  return null;
}

/** A folder's real path. One that is not made yet is the real path of the nearest folder above
 *  it that is, plus the names below: so a link anywhere on the way is still followed. */
function realOf(path: string, realpath: (p: string) => string): string {
  const below: string[] = [];
  for (let at = path; ; at = dirname(at)) {
    try { return join(realpath(at), ...below); } catch { /* not there: one up */ }
    if (dirname(at) === at) return path;
    below.unshift(basename(at));
  }
}

/**
 * Whether a packaged app may open on these floor folders. The app starts a
 * floor on `<its own data folder>/floors/<12 hex>` with its own data folder as
 * the shared one (floorArgs.ts `floorDataDirFor`), and on nothing else. Real
 * paths are compared, so a link does not stand in for either.
 *
 * @param mainUserData  this install's own data folder (`app.getPath('userData')` before anything moved it)
 */
export function floorFoldersAllowed(args: FloorArgs, mainUserData: string, realpath: (p: string) => string): { ok: true } | { ok: false; why: string } {
  const main = realOf(mainUserData, realpath);
  const shared = realOf(args.sharedDir, realpath);
  const data = realOf(args.dataDir, realpath);
  if (shared !== main) return { ok: false, why: `This floor was started on another install's data folder (${args.sharedDir}). This app's own is ${mainUserData}.` };
  if (dirname(data) !== join(main, FLOORS_DIR) || !/^[0-9a-f]{12}$/.test(basename(data))) {
    return { ok: false, why: `This floor's data folder (${args.dataDir}) is not one the app made. A floor's data is kept in ${join(mainUserData, FLOORS_DIR)}.` };
  }
  return { ok: true };
}

/** What the person is told when a floor is refused. */
export const FLOOR_REFUSED_TITLE = 'This floor cannot be opened';
export const floorRefusedWords = (why: string): string => `${why}\n\nOpen the floor from the app instead: File, New Floor, and choose its folder.`;
