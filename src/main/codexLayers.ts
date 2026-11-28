/**
 * A project's own Codex settings need the person's OK.
 *
 * A hive Codex agent starts with its folder marked trusted in its own config
 * (installCodexHooks seeds the trust entry) and with
 * --dangerously-bypass-hook-trust. Codex then loads the project's own `.codex`
 * folders without asking anyone: hooks and MCP servers that run, and command
 * rules. So before such an agent starts, every `.codex` folder Codex would
 * load that holds config.toml, hooks.json, rules/, agents/ or hooks/ must be
 * one the person allowed (config `codexLayerOptIns`); otherwise the start is
 * held and names the folders, and `codex:allowFolder` records the OK and
 * starts it.
 *
 * Which folders, as the fork read Codex 0.157.1 (Prozzta/guppyos 02d0d50b,
 * src/main/codexProjectLayers.ts, MIT), kept without its version check or its
 * TOML reader, so it holds for whichever Codex is installed:
 * - The project root is the nearest folder up from the agent's folder that
 *   holds `.git` (a `.git` folder needs a HEAD; a `.git` file counts). With
 *   none, the agent's folder alone. A person's config that sets
 *   `project_root_markers` walks to the top of the disk instead, because we do
 *   not read their markers; so does a `.git` that cannot be read.
 * - Each folder from that root down to the agent's folder whose `.codex` is a
 *   folder is loaded, except the agent's own CODEX_HOME and ~/.codex (the
 *   person's own settings, not the project's).
 * - In a linked worktree a folder's hooks (the `hooks` table in config.toml,
 *   hooks.json, hooks/) come from the same folder in the main checkout, so
 *   that `.codex` counts too. A `.git` file that does not
 *   lead to a main checkout counts every `.codex` folder found.
 * - Anything that cannot be read counts as holding settings.
 *
 * An OK is kept per folder, spelled as in the main checkout, so one OK covers
 * every worktree of the project. It is not tied to the folder's contents.
 */
import { readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';

/** What is at a path: null for nothing, 'other' for anything that could not be read. */
export type PathKind = 'dir' | 'file' | 'other' | null;

export interface LayerFs {
  kind(p: string): PathKind;
  read(p: string): string;
  real(p: string): string;
}

const nodeFs: LayerFs = {
  kind(p) {
    try {
      const s = statSync(p);
      return s.isDirectory() ? 'dir' : s.isFile() ? 'file' : 'other';
    } catch (e) {
      const code = (e as NodeJS.ErrnoException)?.code;
      return code === 'ENOENT' || code === 'ENOTDIR' ? null : 'other';
    }
  },
  read: (p) => readFileSync(p, 'utf8'),
  real: (p) => realpathSync(p)
};

/** True when a Codex config's text sets project_root_markers (read as text, not TOML). */
export function setsProjectRootMarkers(configText: string | null | undefined): boolean {
  return typeof configText === 'string' && /^\s*project_root_markers\s*=/m.test(configText);
}

/** What a `.codex` folder may hold that counts as settings. Codex 0.153.4
 *  also reads `.codex/agents` (a role file can carry mcp_servers) and
 *  `.codex/hooks`, so those count too (fail safe). */
const SETTINGS_FILES = ['config.toml', 'hooks.json'] as const;
const SETTINGS_DIRS = ['rules', 'agents', 'hooks'] as const;
/** What Codex reads from each folder in a linked worktree: hooks (the `hooks`
 *  table in config.toml, hooks.json, hooks/) from the main checkout's, the
 *  rest (config.toml's mcp_servers, rules/, agents/) from the worktree's own.
 *  config.toml is read from both. */
const FROM_MAIN = new Set<string>(['config.toml', 'hooks.json', 'hooks']);
const FROM_OWN = new Set<string>(['config.toml', 'rules', 'agents']);

/** True when the folder holds any of `names` (all settings by default). */
function holdsSettings(fs: LayerFs, dotCodex: string, names: ReadonlySet<string> | null = null): boolean {
  return [...SETTINGS_FILES, ...SETTINGS_DIRS].some((n) => (names === null || names.has(n)) && fs.kind(join(dotCodex, n)) !== null);
}

/** One `.codex` layer: the folder the OK is kept for (`key`, as in the main
 *  checkout), the folder in the agent's own checkout, and in a linked worktree
 *  the main checkout's folder its hooks come from. */
export interface CodexLayer { key: string; own: string; main: string | null }

/**
 * The `.codex` folders that would load into a Codex agent started in `cwd`
 * and hold settings, each spelled as in the main checkout. In order, from the
 * project root down, without repeats.
 */
export function codexLayerFolders(
  cwd: string,
  opts: { exclude?: string[]; walkToTop?: boolean; fs?: LayerFs; platform?: NodeJS.Platform } = {}
): string[] {
  return codexLayers(cwd, opts).map((l) => l.key);
}

/** codexLayerFolders with where each layer's files are read from. */
export function codexLayers(
  cwd: string,
  opts: { exclude?: string[]; walkToTop?: boolean; fs?: LayerFs; platform?: NodeJS.Platform } = {}
): CodexLayer[] {
  const fs = opts.fs ?? nodeFs;
  const win = (opts.platform ?? process.platform) === 'win32';
  const same = (a: string, b: string): boolean => (win ? a.toLowerCase() === b.toLowerCase() : a === b);
  const real = (p: string): string => { try { return fs.real(p); } catch { return resolve(p); } };

  const start = real(resolve(cwd));
  const ancestors: string[] = [];
  for (let d = start; ; d = dirname(d)) { ancestors.push(d); if (dirname(d) === d) break; }

  // The git checkout this folder is in, as Codex finds its project root.
  let checkout: string | null = null;
  let walkToTop = opts.walkToTop === true;
  for (const a of ancestors) {
    const k = fs.kind(join(a, '.git'));
    if (k === null) continue;
    if (k === 'other') { walkToTop = true; break; }
    if (k === 'dir' && fs.kind(join(a, '.git', 'HEAD')) === null) continue;
    checkout = a;
    break;
  }
  const rootIdx = walkToTop ? ancestors.length - 1 : checkout ? ancestors.indexOf(checkout) : 0;

  // A linked worktree's main checkout: `.git` says `gitdir: <main>/.git/worktrees/<name>`,
  // whose `commondir` leads to the main `.git`.
  let main: string | null = null;
  let mainUnknown = false;
  if (checkout && fs.kind(join(checkout, '.git')) !== 'dir') {
    try {
      const m = /^gitdir:\s*(.+?)\s*$/m.exec(fs.read(join(checkout, '.git')));
      if (!m) throw new Error('no gitdir line');
      const gitDir = resolve(checkout, m[1]);
      const common = resolve(gitDir, fs.read(join(gitDir, 'commondir')).trim());
      if (basename(dirname(gitDir)) !== 'worktrees' || basename(common) !== '.git') throw new Error('not a linked worktree');
      main = real(dirname(common));
      if (same(main, checkout)) main = null;
    } catch {
      mainUnknown = true;
    }
  }

  const skip = [...(opts.exclude ?? []), join(homedir(), '.codex')].map(real);
  const found: CodexLayer[] = [];
  for (const dir of ancestors.slice(0, rootIdx + 1).reverse()) {
    const dotCodex = join(dir, '.codex');
    const kind = fs.kind(dotCodex);
    if (kind === null || kind === 'file') continue; // Codex loads a folder only
    if (skip.some((s) => same(s, real(dotCodex)))) continue;
    const rel = main && checkout ? relative(checkout, dir) : null;
    const inMain = main && rel !== null && !rel.startsWith('..') && !isAbsolute(rel) ? join(main, rel, '.codex') : null;
    // In a linked worktree each folder counts only for what Codex reads from
    // it, which is what the card lists for it.
    const counts = kind === 'other' || mainUnknown
      || holdsSettings(fs, dotCodex, inMain !== null ? FROM_OWN : null) || (inMain !== null && holdsSettings(fs, inMain, FROM_MAIN));
    const key = inMain ?? dotCodex;
    if (counts && !found.some((f) => same(f.key, key))) found.push({ key, own: dotCodex, main: inMain });
  }
  return found;
}

/** How many files from rules/, agents/ and hooks/ together the card lists per
 *  folder; `more` counts the rest. */
const LISTED_DIR_FILES = 20;

/** The settings files a `.codex` folder holds, for the person to see before
 *  they allow it. Only what is really there: config.toml and hooks.json when
 *  they are files; rules/, agents/ and hooks/ when they are folders (each file
 *  in them, sorted, at most 20 across the three, "rules/" when the folder
 *  cannot be listed) or files ("rules"). Anything that cannot be read is not
 *  listed, so an unreadable `.codex` lists nothing and the card says so.
 *  `more` is how many files of the three folders are not listed. `part` keeps
 *  only what Codex reads from a main checkout's folder ('main') or from the
 *  worktree's own ('own'). */
export function codexFolderListing(dotCodex: string, fs: LayerFs = nodeFs, part: 'all' | 'own' | 'main' = 'all'): { files: string[]; more: number } {
  const wanted = (n: string): boolean => part === 'all' || (part === 'main' ? FROM_MAIN : FROM_OWN).has(n);
  const files = SETTINGS_FILES.filter((n) => wanted(n) && fs.kind(join(dotCodex, n)) === 'file') as string[];
  let listed = 0;
  let more = 0;
  for (const d of SETTINGS_DIRS) {
    if (!wanted(d)) continue;
    const kind = fs.kind(join(dotCodex, d));
    if (kind === 'file') { files.push(d); continue; }
    if (kind !== 'dir') continue;
    let names: string[];
    try { names = readdirSync(join(dotCodex, d)).sort(); } catch { files.push(`${d}/`); continue; }
    const room = Math.max(0, LISTED_DIR_FILES - listed);
    files.push(...names.slice(0, room).map((n) => `${d}/${n}`));
    listed += Math.min(room, names.length);
    more += Math.max(0, names.length - room);
  }
  return { files, more };
}

/**
 * Where a layer's settings load from, for the card: its own folder with every
 * file, or in a linked worktree the worktree's folder (config.toml, rules/,
 * agents/) and the main checkout's (config.toml, hooks.json, hooks/). A folder with nothing
 * listed is left out, but one is always kept.
 */
export function codexLayerLoads(layer: CodexLayer, fs: LayerFs = nodeFs): Array<{ folder: string; files: string[]; more: number }> {
  if (!layer.main || layer.main === layer.own) return [{ folder: layer.key, ...codexFolderListing(layer.key, fs) }];
  const own = { folder: layer.own, ...codexFolderListing(layer.own, fs, 'own') };
  const main = { folder: layer.main, ...codexFolderListing(layer.main, fs, 'main') };
  const shown = [own, main].filter((l) => l.files.length > 0 || l.more > 0);
  return shown.length > 0 ? shown : [own];
}

/** The folders not yet allowed. */
export function codexFoldersNeedingOk(folders: string[], optIns: unknown, platform: NodeJS.Platform = process.platform): string[] {
  const norm = (p: string): string => (platform === 'win32' ? p.toLowerCase() : p);
  const allowed = new Set((Array.isArray(optIns) ? optIns : []).filter((x): x is string => typeof x === 'string').map(norm));
  return folders.filter((f) => !allowed.has(norm(f)));
}
