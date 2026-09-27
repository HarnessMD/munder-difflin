/**
 * THE AI PROVIDER KEYS, AS DRAFT TASKS (0.5.3 Settings redesign, Keys &
 * Secrets). Founder, 24 Sep 2026: "only one save button that saves the
 * settings whatever changes are made ... no save individually". A key typed
 * in Keys & Secrets is not stored on the spot: it becomes a task in the page's
 * draft, and the footer Save runs it. The broker stays write only: the key goes
 * in, only "set or not" ever comes back.
 *
 * Import free, so test/load-ts.cjs runs it.
 */

/** Backend model providers whose keys the CLIs read from standard env vars.
 *  Must match BACKEND_KEY_ENV in src/main/index.ts. */
export const PROVIDER_KEY_BACKENDS: ReadonlyArray<{ id: string; label: string; envVar: string }> = [
  { id: 'anthropic', label: 'Anthropic', envVar: 'ANTHROPIC_API_KEY' },
  { id: 'openai', label: 'OpenAI', envVar: 'OPENAI_API_KEY' },
  { id: 'google', label: 'Google Gemini', envVar: 'GEMINI_API_KEY' },
  { id: 'openrouter', label: 'OpenRouter', envVar: 'OPENROUTER_API_KEY' },
  { id: 'groq', label: 'Groq', envVar: 'GROQ_API_KEY' }
];

export const keyTaskId = (backend: string): string => `key:${backend}`;

/** What Save does to one provider's key: store a new one, or remove it. */
export type KeyEdit = { kind: 'set'; key: string } | { kind: 'clear' };

/** The write only broker, as the renderer reaches it (window.cth). */
export interface KeyBroker {
  set(backend: string, key: string): Promise<{ ok: boolean; error?: string }>;
  clear(backend: string): Promise<unknown>;
}

/** The edit a field's text stands for: a key to store, or nothing to do. */
export function editFor(text: string): KeyEdit | null {
  const key = text.trim();
  return key ? { kind: 'set', key } : null;
}

/** The task Save runs for one provider. A refused key throws, so the draft
 *  keeps the task and the footer names the failure; `done` hears the new
 *  "set or not" only after the broker said yes. */
export function keyTask(backend: string, edit: KeyEdit, broker: KeyBroker, done: (has: boolean) => void): () => Promise<void> {
  return async () => {
    if (edit.kind === 'clear') {
      await broker.clear(backend);
      done(false);
      return;
    }
    const r = await broker.set(backend, edit.key);
    if (!r.ok) throw new Error(r.error || `${backend} key was refused`);
    done(true);
  };
}
