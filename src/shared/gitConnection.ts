/**
 * A GIT CREDENTIAL IS A CONNECTION. The rules the Connections sheet holds.
 *
 * One credential a host. A host is compared whole, lower case, with its
 * port: never "ends with".
 *
 * Import free of Node and Electron.
 */

/** The template a git credential is made from (INTEGRATION_TEMPLATES, its `idSuggestion`). */
export const GIT_TEMPLATE_ID = 'git-https';
/** What the address field of a new one starts with. The person changes it for another host. */
export const GIT_HOST_START = 'https://github.com';

type GitConn = { id: string; templateId?: string; baseUrl: string };

/** Whether a connection was made from the git template. */
export const isGitConnection = (rec: { templateId?: string }): boolean => rec.templateId === GIT_TEMPLATE_ID;

/** The host of a git address, lower case, with its port when it has one. Null
 *  unless the address is https with a host and no user name or password in it.
 *  Not trimmed: the caller hands the address as it will be kept. */
export function gitHostOf(url: unknown): string | null {
  if (typeof url !== 'string' || url.length === 0 || url.length > 2048) return null;
  // Read one way here and another by git: a backslash, white space or a
  // control character. An address that holds one is nobody's.
  if (/[\\\s\u0000-\u001f\u007f]/.test(url)) return null;
  // Spelled as git reads it. `https:host`, `https:/host` and `https:///host`
  // name a host to this parser and a path, another transport or no host to git.
  // The scheme in any case, as a person may have typed and saved it; whoever
  // hands the address to git writes it in lower case.
  if (!/^https:\/\/[^/?#@:]/i.test(url)) return null;
  let u: URL;
  try { u = new URL(url); } catch { return null; }
  if (u.protocol !== 'https:' || u.hostname === '' || u.username !== '' || u.password !== '') return null;
  return u.host.toLowerCase();
}

/** The host a git connection is for: its address must be https, the host, and
 *  nothing after it. Null otherwise, and such a connection is nobody's credential. */
export function gitConnectionHost(baseUrl: unknown): string | null {
  const host = gitHostOf(baseUrl);
  if (!host) return null;
  const u = new URL(baseUrl as string);
  return u.pathname.replace(/\/+$/, '') === '' && u.search === '' && u.hash === '' ? host : null;
}

/** What is wrong with the address of a git connection, or null: not https at
 *  all, or https with something after the host. Each has its own line. */
export function gitAddressProblem(baseUrl: unknown): 'not-https' | 'host-only' | null {
  if (gitConnectionHost(baseUrl)) return null;
  return gitHostOf(baseUrl) ? 'host-only' : 'not-https';
}

/** The host another git connection already has, when this one would be a
 *  second for it; null when it may be saved. Switched off ones count: a
 *  person can switch one on again. */
export function gitHostTaken(rec: GitConn, others: readonly GitConn[]): string | null {
  if (!isGitConnection(rec)) return null;
  const host = gitConnectionHost(rec.baseUrl);
  if (!host) return null;
  return others.some((o) => o.id !== rec.id && isGitConnection(o) && gitConnectionHost(o.baseUrl) === host) ? host : null;
}

/** The locale key of a template's name, for the two templates the locale
 *  names ("Git repositories", "GitHub API") so they do not read as one. Null:
 *  the template is named by its own label. One name for one template, on
 *  every screen that lists connections. */
export function templateNameKey(tpl: { kind: string; idSuggestion: string }): string | null {
  if (tpl.idSuggestion === GIT_TEMPLATE_ID) return 'pro.conn.kind.git';
  return tpl.kind === 'github' ? 'pro.conn.kind.github' : null;
}
