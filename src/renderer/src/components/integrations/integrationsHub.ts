/**
 * WHAT THE INTEGRATIONS LIST SAYS OF EACH SERVICE. Two kinds kept clear:
 * events coming in, and agents using a service.
 *
 * One GitHub: one row, one credential. A token from before keeps working, under
 * the same row. Pure.
 */
import { isGithubToken, servesGithub } from '@shared/githubToken';
import { GITHUB_WEBHOOK_EVENTS, type GithubWebhookEvent } from '@shared/triggers';

export type HubTab = 'apps' | 'providers' | 'keys';
export type ServiceKind = 'in' | 'use' | 'both';
export type KindFilter = 'in' | 'use' | null;

/** The services that can bring events in through a webhook of their own, as well as being used. */
const BOTH = new Set(['linear', 'jira', 'sentry']);
export const serviceKind = (id: string | undefined): ServiceKind => (id && BOTH.has(id) ? 'both' : 'use');

/** Whether a row of this kind shows under the card that is pressed. */
export const kindShown = (kind: ServiceKind, filter: KindFilter): boolean => filter === null || kind === 'both' || kind === filter;

/** The order of the list. A service not named here comes after these and before the blank form. */
const LIST_ORDER: readonly string[] = ['slack', 'github', 'linear', 'jira', 'monday', 'notion', 'confluence', 'stripe', 'sentry', 'hubspot', 'razorpay'];

/** Apps that work first, the blank form last of those, and Coming soon after them. Keeps its own order inside each part. */
export function workingFirst<T extends { key: string; soon?: boolean }>(rows: readonly T[]): T[] {
  const rank = (r: T): number => {
    if (r.soon) return LIST_ORDER.length + 2;
    const id = r.key.split(':').pop() ?? '';
    if (id === 'my-api') return LIST_ORDER.length + 1;
    const at = LIST_ORDER.indexOf(id);
    return at < 0 ? LIST_ORDER.length : at;
  };
  return rows.map((r, i) => ({ r, i })).sort((a, b) => rank(a.r) - rank(b.r) || a.i - b.i).map((x) => x.r);
}

/** What a token alone cannot reach a service without, so it stays beside the token and out of the fold: an address still to fill in, and a user name. */
export function connectNeeds(d: { baseUrl: string; authType: string; authUser: string }): { baseUrl: boolean; user: boolean } {
  return { baseUrl: !d.baseUrl.trim() || d.baseUrl.includes('your-domain'), user: d.authType === 'basic' && !d.authUser.trim() };
}

/** The services whose secret is not a plain token: their own word for it, and how it is written, stay beside the field. */
const OWN_TOKEN_WORD: ReadonlySet<string> = new Set(['jira', 'confluence', 'razorpay']);
export const keepsTokenWord = (templateId: string | undefined): boolean => !!templateId && OWN_TOKEN_WORD.has(templateId);

type GitHubish = Parameters<typeof servesGithub>[0];

/** The records behind the one GitHub row. One for another host is a connection of its own. */
export function githubRecords<T extends GitHubish>(records: readonly T[]): { api: T | null; git: T | null } {
  const served = records.filter(servesGithub);
  return { api: served.find(isGithubToken) ?? null, git: served.find((r) => !isGithubToken(r)) ?? null };
}

/** Each GitHub event's word, under integrations.hub.in. */
export const GITHUB_EVENT_WORD: Record<GithubWebhookEvent, string> = { pull_request: 'pr', issues: 'issues', checks_failed: 'checks', push: 'push' };

/** The events that go on to an agent. No list is every one. */
export const githubEventsOn = (events: readonly GithubWebhookEvent[] | undefined): readonly GithubWebhookEvent[] => events ?? GITHUB_WEBHOOK_EVENTS;

/** The list after one box changes. */
export function githubEventsAfter(events: readonly GithubWebhookEvent[] | undefined, event: GithubWebhookEvent, on: boolean): GithubWebhookEvent[] {
  const had = githubEventsOn(events);
  return GITHUB_WEBHOOK_EVENTS.filter((e) => (e === event ? on : had.includes(e)));
}
