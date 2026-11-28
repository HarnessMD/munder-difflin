/**
 * The names an agent's turned off skills answer to, read from disk at launch
 * (shared/agentSkills.ts says why both the folder and the SKILL.md `name`).
 * Read only: a skill folder is never written, moved or deleted here.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { parseSkillFrontmatter } from './skills';
import { expandTilde } from './fs';
import { isSkillName, skillOffNames } from '../shared/agentSkills';

/** A SKILL.md bigger than this is not read for its name; the folder rule holds. */
const MAX_SKILL_MD_BYTES = 256 * 1024;

/** Where Claude Code finds a skill for an agent in `cwd`: the person's own
 *  skills, then the project's. */
export function skillRootsFor(cwd?: string): string[] {
  return [join(homedir(), '.claude', 'skills'), ...(cwd ? [join(expandTilde(cwd), '.claude', 'skills')] : [])];
}

/** The `name` the folder's SKILL.md gives itself, from the first root that
 *  holds the folder, or undefined. */
export function skillNameOnDisk(folder: string, roots: readonly string[]): string | undefined {
  if (!isSkillName(folder)) return undefined;
  for (const root of roots) {
    const md = join(root, folder, 'SKILL.md');
    try {
      if (!existsSync(md) || statSync(md).size > MAX_SKILL_MD_BYTES) continue;
      return parseSkillFrontmatter(readFileSync(md, 'utf8')).name;
    } catch { /* unreadable: the folder rule still holds */ }
  }
  return undefined;
}

/** Every name to turn off for these folders, for an agent in `cwd`. */
export function skillsOffNamesOnDisk(folders: readonly string[], roots: readonly string[]): string[] {
  return skillOffNames(folders, (folder) => skillNameOnDisk(folder, roots));
}
