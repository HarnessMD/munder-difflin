/**
 * A PROJECT FOLDER INSIDE THE HIVE.
 *
 * A new install has no project folder: `registeredRepos` is empty until the person adds an agent by hand. So the
 * orchestrator's first hire on this computer was refused ("this computer has no project folder yet"), a hire naming
 * a folder it had made itself was refused as not one of the person's, and its brief told it to use one of the
 * person's folders, of which there were none. Now a project folder can be made under the hive: `<hive>/projects/<name>`.
 *
 *  - Any folder under `<hive>/projects` may be named in a hire's or a temp's "cwd", and is made when it is not there.
 *  - A hire or a temp that names no folder, on a computer with no project folder yet, gets `<hive>/projects/<its id>`.
 *  - `projects` itself is never a project, and links are followed: a link inside it that leads out is not inside it.
 *  - The hive is a git repository that commits all it holds, so `/projects/` is on its ignore list
 *    (shared/hiveRepo.ts), and each project folder is a git repository of its own, with one empty commit: an agent
 *    started isolated there gets a worktree of its project, never of the hive.
 */
import { lstatSync, mkdirSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import { gitInitSync } from './gitSafe';

export const HIVE_PROJECTS_DIR = 'projects';

/** `<hive>/projects`. */
export function hiveProjectsDir(root: string): string {
  return path.join(path.resolve(root), HIVE_PROJECTS_DIR);
}

/** A path as it would be once made: the real path of its nearest part that exists, plus the rest by its words.
 *  Null when that part is a link that leads nowhere. */
function realOf(p: string): string | null {
  let probe = path.resolve(p);
  const rest: string[] = [];
  for (;;) {
    try { return path.join(realpathSync(probe), ...rest.reverse()); } catch {
      try { if (lstatSync(probe).isSymbolicLink()) return null; } catch { /* not there at all */ }
      const up = path.dirname(probe);
      if (up === probe) return null;
      rest.push(path.basename(probe));
      probe = up;
    }
  }
}

/** Is `folder` (absolute) under `<root>/projects`, links followed, and not `projects` itself? It need not exist yet. */
export function inHiveProjects(root: string | null | undefined, folder: string | null | undefined): boolean {
  if (!root || !folder || typeof folder !== 'string' || !path.isAbsolute(folder)) return false;
  const base = realOf(hiveProjectsDir(root));
  const real = realOf(folder);
  if (!base || !real) return false;
  const rel = path.relative(base, real);
  return rel !== '' && rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel);
}

/** A folder name from an id or a name: lower case, letters, digits, dot, dash and underscore, at most 64. */
export function projectFolderName(name: string): string {
  const s = String(name ?? '').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^[-.]+|[-.]+$/g, '').slice(0, 64).replace(/[-.]+$/g, '');
  return s || 'project';
}

const PROJECT_GIT_ARGS = ['-c', 'commit.gpgsign=false', '-c', 'user.name=Munder Difflin', '-c', 'user.email=hive@local'];
const has = (p: string): boolean => { try { lstatSync(p); return true; } catch { return false; } };

/** The project a folder under projects belongs to: `<root>/projects/<its first part>`. */
function projectTopOf(root: string, folder: string): string {
  const base = realOf(hiveProjectsDir(root)) ?? hiveProjectsDir(root);
  const rel = path.relative(base, realOf(folder) ?? path.resolve(folder));
  return path.join(base, rel.split(path.sep)[0]);
}

/** Make the project `top` a git repository of its own with one empty commit, unless something named `.git` is
 *  there. True when it is one after this. */
function ownRepo(top: string): boolean {
  if (has(path.join(top, '.git'))) return true;
  // git is started from core/gitSafe.ts only.
  return gitInitSync(top, PROJECT_GIT_ARGS, 'Project folder made by Munder Difflin');
}

/** Make `folder` (under `<root>/projects`; it may be there already) and return it. When the hive is a git
 *  repository, the project the folder is in is made one of its own (see the note at the top). Throws when the folder
 *  is not under projects, cannot be made, or would be left inside the hive's own repository. */
export function makeHiveProjectFolder(root: string, folder: string): string {
  if (!inHiveProjects(root, folder)) throw new Error(`${folder} is not under ${hiveProjectsDir(root)}`);
  mkdirSync(folder, { recursive: true });
  if (!statSync(folder).isDirectory()) throw new Error(`${folder} is not a folder`);
  if (has(path.join(path.resolve(root), '.git')) && !ownRepo(projectTopOf(root, folder))) {
    throw new Error(`${projectTopOf(root, folder)} could not be made a repository of its own, and the hive is one`);
  }
  return folder;
}

/** `<root>/projects/<id>`, made: the folder of a hire or a temp that names none on a computer with no project folder. */
export function defaultHiveProjectFolder(root: string, id: string): string {
  return makeHiveProjectFolder(root, path.join(hiveProjectsDir(root), projectFolderName(id)));
}
