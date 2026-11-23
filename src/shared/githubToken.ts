/**
 * ONE GITHUB TOKEN. A pasted token, used by git, gh and the API.
 *
 * On each machine, an enabled `github` connection (the template with that name,
 * address api.github.com) is the token for git on github.com and for gh. A
 * machine with only a git-https connection for github.com is served by that
 * connection's token, so a token saved before this keeps working and nobody
 * types it again. When both exist the git-https one wins, so nothing that
 * worked changes. Two for github.com is neither, the rule of gitRecordFor.
 *
 * WHO CAN READ IT. Every agent started while it is on. It reaches the agent's
 * environment as GH_TOKEN, and all agents of a machine run as one user, so
 * there is no per agent rule and no promise that agents do not see it. With a
 * token, the token decides which repositories.
 *
 * Import free of Node and Electron.
 */
import type { IntegrationRecord } from './integrations';
import { gitConnectionHost, isGitConnection } from './gitConnection';

export const GITHUB_HOST = 'github.com';
export const GITHUB_API = 'https://api.github.com';
/** The user name git sends with a token. GitHub reads the token alone. */
export const GITHUB_TOKEN_USER = 'x-access-token';
/** Where gh reads it. A variable a person set by that name is left alone. */
export const GITHUB_TOKEN_ENV = 'GH_TOKEN';

type Open = (ref: string | undefined, use: { kind: 'http'; url: string }) => string | undefined;

/** Whether a connection is a `github` token: the one row's record. */
export function isGithubToken(r: Pick<IntegrationRecord, 'kind' | 'authType' | 'baseUrl'>): boolean {
  return r.kind === 'github' && r.authType === 'github' && r.baseUrl.replace(/\/+$/, '') === GITHUB_API;
}

/** Whether a connection is one of the two that can serve github.com. */
export function servesGithub(r: Pick<IntegrationRecord, 'kind' | 'authType' | 'baseUrl' | 'templateId'>): boolean {
  return isGithubToken(r) || (isGitConnection(r) && gitConnectionHost(r.baseUrl) === GITHUB_HOST);
}

/** The enabled `github` connection, when there is exactly one. */
export function githubTokenRecord(records: readonly IntegrationRecord[]): IntegrationRecord | null {
  const found = records.filter((r) => r.enabled && isGithubToken(r));
  return found.length === 1 ? found[0] : null;
}

/** A value that fits on one line of git's helper protocol. */
const oneLine = (v: unknown): v is string => typeof v === 'string' && v !== '' && !/[\n\r\0]/.test(v);

/** This machine's GitHub token, opened for the address it was sealed for, or null. */
export function githubToken(records: readonly IntegrationRecord[], open: Open): string | null {
  const git = records.filter((r) => r.enabled && isGitConnection(r) && r.authType === 'basic' && gitConnectionHost(r.baseUrl) === GITHUB_HOST);
  if (git.length > 1) return null;
  if (git.length === 1) {
    const token = open(git[0].secretRef, { kind: 'http', url: `https://${GITHUB_HOST}` });
    return oneLine(token) ? token : null;
  }
  const rec = githubTokenRecord(records);
  const token = rec ? open(rec.secretRef, { kind: 'http', url: rec.baseUrl }) : undefined;
  return oneLine(token) ? token : null;
}

/** git's helper for github.com, on this computer. It holds no value: it reads GH_TOKEN when git asks. */
export const GITHUB_GIT_HELPER = `!f() { test "$1" = get && printf 'username=${GITHUB_TOKEN_USER}\\npassword=%s\\n' "$${GITHUB_TOKEN_ENV}"; }; f`;

/**
 * What a start on this computer adds: GH_TOKEN, and git's own config variables
 * naming the helper for github.com only. The empty helper first clears the ones
 * named before it for that host. Nothing when a name the start sets already says
 * GH_TOKEN, so a person's own secret by that name stands, and git follows it.
 */
export function githubStartEnv(token: string | null, env: Readonly<Record<string, string | undefined>>): Record<string, string> {
  if (!token || env[GITHUB_TOKEN_ENV] !== undefined) return {};
  const at = Number.parseInt(env.GIT_CONFIG_COUNT ?? '0', 10);
  const n = Number.isInteger(at) && at >= 0 ? at : 0;
  const key = `credential.https://${GITHUB_HOST}.helper`;
  return {
    [GITHUB_TOKEN_ENV]: token,
    [`GIT_CONFIG_KEY_${n}`]: key,
    [`GIT_CONFIG_VALUE_${n}`]: '',
    [`GIT_CONFIG_KEY_${n + 1}`]: key,
    [`GIT_CONFIG_VALUE_${n + 1}`]: GITHUB_GIT_HELPER,
    GIT_CONFIG_COUNT: String(n + 2)
  };
}
