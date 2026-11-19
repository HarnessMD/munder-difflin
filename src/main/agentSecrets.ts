/**
 * KEYS AND SECRETS FOR A RUNNING AGENT (0.5.6). Founder, 16 Oct 2026: "keys
 * and secrets should be available for agents to be accessed safely as soon as
 * it gets added, even existing agents should be able to use the keys as and
 * when needed after it has been added once (no need to restart or do
 * anything)".
 *
 * An agent's env vars are fixed when it starts, so a key saved in Settings
 * after that never reached it. The integration broker now answers two routes
 * for the agent its capability token was granted to, and
 * `resources/md-secret.cjs` is how an agent calls them:
 *
 *   GET or POST /secrets   the names this agent may use and their kind
 *                          (an AI provider key, by its env var name, or a
 *                          custom secret). Never a value.
 *   POST /secrets/read     {"name": "X"}: the value saved for X right now.
 *
 * Both read the store Settings writes (main/integrations.ts) at request time:
 * a key saved a second ago is there, a removed one is gone. Only the five
 * provider keys (`apikey:<backend>`) and custom secrets (`env:<NAME>`) can be
 * named; a service connection's key (`int:<id>`) never leaves the broker.
 *
 * Every read is logged: the agent, the name, the outcome (the hive log adds
 * the time). Never the value. A read whose line cannot be logged is refused.
 * A name that is not one of these gets the same answer as a name with
 * nothing saved, so a refusal tells nothing.
 *
 * Electron free: main injects the store and the log.
 */
import { SECRET_NAME_MAX, SECRET_NAME_RE, customSecretNames, customSecretRef, secretNameProblem } from '../shared/customSecrets';

/** One AI provider key: the env var an agent knows it by, and its store ref. */
export interface ProviderKeyName { envVar: string; ref: string }

export type AgentSecretKind = 'provider' | 'custom';
export interface AgentSecretEntry { name: string; kind: AgentSecretKind }

/** One line in the hive log. `name` is null when what was sent is not shaped
 *  like a name, so a value pasted by mistake never lands in the log. */
export interface SecretReadEvent {
  kind: 'secret-read';
  agentId: string;
  name: string | null;
  outcome: 'ok' | 'not-found';
}

export interface AgentSecretsDeps {
  /** The provider keys main knows (BACKEND_KEY_ENV), env var and ref. */
  providers: readonly ProviderKeyName[];
  /** Every ref the store holds now (no decryption). */
  listRefs: () => string[];
  /** Decrypt one ref now; undefined when nothing is saved. */
  getSecret: (ref: string) => string | undefined;
  log: (event: SecretReadEvent) => void;
}

export interface AgentSecretsAnswer { status: number; body: unknown }

/** The one answer for every name that cannot be read. */
export const SECRET_NOT_FOUND = Object.freeze({
  ok: false as const,
  code: 'not_found',
  error: 'No key or secret by that name is saved in Integrations, Keys and secrets.'
});

/** The names this agent may use right now, provider keys first. */
export function agentSecretNames(deps: Pick<AgentSecretsDeps, 'providers' | 'listRefs'>): AgentSecretEntry[] {
  const refs = deps.listRefs();
  const held = new Set(refs);
  const out: AgentSecretEntry[] = deps.providers.filter((p) => held.has(p.ref)).map((p) => ({ name: p.envVar, kind: 'provider' as const }));
  for (const name of customSecretNames(refs)) out.push({ name, kind: 'custom' });
  return out;
}

/** The store ref a name stands for, or undefined. A provider env var maps to
 *  its key; any other name only to `env:<NAME>`, and only when it is a name
 *  a person could have saved (the reserved ones, the provider names among
 *  them, never are). */
export function secretRefForName(name: string, providers: readonly ProviderKeyName[]): string | undefined {
  const provider = providers.find((p) => p.envVar === name);
  if (provider) return provider.ref;
  return secretNameProblem(name) === null ? customSecretRef(name) : undefined;
}

const nameShaped = (name: string): boolean => name.length > 0 && name.length <= SECRET_NAME_MAX && SECRET_NAME_RE.test(name);

/** One request from the agent `agentId` (the token's, never the body's). */
export function agentSecretsRoute(agentId: string, route: 'list' | 'read', body: unknown, deps: AgentSecretsDeps): AgentSecretsAnswer {
  if (route === 'list') return { status: 200, body: { ok: true, secrets: agentSecretNames(deps) } };

  const raw = body && typeof body === 'object' ? (body as { name?: unknown }).name : undefined;
  const name = typeof raw === 'string' ? raw : '';
  const ref = nameShaped(name) ? secretRefForName(name, deps.providers) : undefined;
  let value: string | undefined;
  try { value = ref ? deps.getSecret(ref) : undefined; } catch { value = undefined; }
  const ok = typeof value === 'string' && value.length > 0;
  try {
    deps.log({ kind: 'secret-read', agentId, name: nameShaped(name) ? name : null, outcome: ok ? 'ok' : 'not-found' });
  } catch {
    // No value leaves without its log line.
    return { status: 500, body: { ok: false, code: 'not_logged', error: 'The read could not be logged, so it was refused. Try again.' } };
  }
  if (!ok) return { status: 404, body: SECRET_NOT_FOUND };
  return { status: 200, body: { ok: true, name, value } };
}
