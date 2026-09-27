/**
 * CUSTOM SECRETS (0.5.3, founder batch 3 #6: Keys & Secrets). A person adds a
 * name and a value; the value is stored encrypted on this machine, in the same
 * write only store as the provider keys (main/integrations.ts, safeStorage),
 * under `env:<NAME>`; every agent is started with it as the env var NAME.
 *
 * A name is capitals, digits and underscores only. It may not be one of the
 * names the harness or the shell sets itself (an agent that lost PATH, or its
 * own AGENT_ID, would not start or would talk as someone else), nor a provider
 * key, which has its own row above. Main checks the same rule again: the
 * renderer is never trusted to have checked.
 *
 * Import free, so test/load-ts.cjs runs it and both main and renderer use it.
 */

export const SECRET_NAME_RE = /^[A-Z0-9_]+$/;
export const SECRET_NAME_MAX = 64;
export const CUSTOM_SECRET_PREFIX = 'env:';

/** Names an agent's environment already means something by. */
export const RESERVED_SECRET_NAMES: ReadonlySet<string> = new Set([
  // the shell and the OS
  'PATH', 'HOME', 'SHELL', 'USER', 'LOGNAME', 'TMPDIR', 'PWD', 'TERM', 'LANG', 'LC_ALL',
  // the harness
  'AGENT_ID', 'AGENT_NAME', 'AGENT_DIR', 'HIVE_ROOT', 'MD_BROKER_URL', 'MEMPALACE_PALACE_PATH', 'HIVE_AUTO_APPROVE',
  // the provider keys (their own rows, BACKEND_KEY_ENV in main)
  'ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'GEMINI_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY', 'OPENROUTER_API_KEY', 'GROQ_API_KEY'
]);

export type SecretNameProblem = 'empty' | 'shape' | 'long' | 'reserved';

/** Why a name cannot be used, or null when it can. */
export function secretNameProblem(name: string): SecretNameProblem | null {
  if (!name) return 'empty';
  if (!SECRET_NAME_RE.test(name)) return 'shape';
  if (name.length > SECRET_NAME_MAX) return 'long';
  if (RESERVED_SECRET_NAMES.has(name)) return 'reserved';
  return null;
}

export const customSecretRef = (name: string): string => `${CUSTOM_SECRET_PREFIX}${name}`;

/** The names held in the store, from its refs, sorted. */
export function customSecretNames(refs: readonly string[]): string[] {
  return refs
    .filter((r) => r.startsWith(CUSTOM_SECRET_PREFIX))
    .map((r) => r.slice(CUSTOM_SECRET_PREFIX.length))
    .filter((n) => secretNameProblem(n) === null)
    .sort();
}

/** Main, at spawn: the env vars the custom secrets add. A name the agent's
 *  env already sets is left alone, so a secret never overrides the harness. */
export function customSecretEnv(names: readonly string[], get: (ref: string) => string | undefined, env: Readonly<Record<string, string | undefined>>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of names) {
    if (secretNameProblem(name) !== null || env[name] !== undefined) continue;
    const value = get(customSecretRef(name));
    if (value) out[name] = value;
  }
  return out;
}

export const secretTaskId = (name: string): string => `secret:${name}`;

/** What Save does to one custom secret. */
export type SecretEdit = { kind: 'set'; value: string } | { kind: 'remove' };

/** The store, as the renderer reaches it (window.cth). */
export interface SecretStore {
  set(name: string, value: string): Promise<{ ok: boolean; error?: string }>;
  remove(name: string): Promise<{ ok: boolean; error?: string }>;
}

/** The task Save runs for one secret. A refusal throws, so the draft keeps the
 *  task and the footer names the failure; `done` runs only once main agreed. */
export function secretTask(name: string, edit: SecretEdit, store: SecretStore, done: () => void): () => Promise<void> {
  return async () => {
    const r = edit.kind === 'set' ? await store.set(name, edit.value) : await store.remove(name);
    if (!r.ok) throw new Error(r.error || `${name} was refused`);
    done();
  };
}
