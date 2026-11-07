/** Source identity shared by the installer and the catalog's Installed state.
 *  No Node imports: the same URL parsing and folder validation run in both
 *  Electron's main process and the renderer. */

/**
 * A GitHub source URL → the pieces the contents API needs.
 *
 * Two shapes, because the catalog uses both: a folder inside a repo
 * (`owner/repo/tree/<ref>/<path>`, 145 entries) and a whole repo whose root IS
 * the skill (`owner/repo`, 81 entries). For the latter `ref` is empty and the
 * caller omits it, which makes the API use the repo's default branch — there is
 * no reliable way to guess between `main` and `master` and no need to.
 */
export function parseGitHubSourceUrl(url: string): { owner: string; repo: string; ref: string; path: string } | null {
  const clean = url.trim().replace(/[#?].*$/, '').replace(/\/+$/, '');
  const tree = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)\/?(.*)$/.exec(clean);
  if (tree) {
    const [, owner, repo, ref, path] = tree;
    if (!owner || !repo || !ref) return null;
    return { owner, repo, ref, path: path.replace(/\/+$/, '') };
  }
  const root = /^https:\/\/github\.com\/([^/]+)\/([^/]+)$/.exec(clean);
  if (root) {
    const [, owner, repo] = root;
    // Reserved paths that are not repositories.
    if (['orgs', 'topics', 'collections', 'sponsors', 'features'].includes(owner.toLowerCase())) return null;
    return { owner, repo: repo.replace(/\.git$/i, ''), ref: '', path: '' };
  }
  return null;
}

/** A folder name we are willing to create. Anything with a separator, a dot-dot,
 *  or a leading dot is rejected outright rather than massaged into safety. */
export function safeSkillDirName(raw: string): string | null {
  const base = raw.trim().split('/').pop() ?? '';
  if (!base || base === '.' || base === '..') return null;
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(base)) return null;
  if (base.includes('..')) return null;
  return base;
}

interface InstalledSkillRef {
  path: string;
  provider: string;
}

/** Claude skills can be installed outside this app (including as symlinks).
 *  Match the install folder, not arbitrary frontmatter/display names: an alias
 *  can otherwise hide a different skill whose destination is still available.
 *  OpenCode/Codex plugins are not Claude skills, even with an identical name. */
export function installedSkillKeys(local: readonly InstalledSkillRef[]): Set<string> {
  const keys = new Set<string>();
  for (const skill of local) {
    if (skill.provider !== 'claude') continue;
    const folder = skill.path.replace(/[\\/]+$/, '').split(/[\\/]/).pop() ?? '';
    const key = folder.toLowerCase();
    if (key) keys.add(key);
  }
  return keys;
}

/** A tree URL's folder wins over its display name. Repo-root entries use the
 *  catalog name, as the installer does for a root SKILL.md or named subfolder.
 *  Unresolved third-party directory pages stay installable: their URL alone
 *  does not identify a destination, and guessing can hide a different skill. */
export function isCatalogSkillInstalled(
  skill: { name: string; url: string },
  installed: ReadonlySet<string>
): boolean {
  const source = parseGitHubSourceUrl(skill.url);
  if (!source) return false;
  const folder = safeSkillDirName(source.path || skill.name);
  return folder !== null && installed.has(folder.toLowerCase());
}
