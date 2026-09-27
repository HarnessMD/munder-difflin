/**
 * Key entry from the setup cards. 0.4.11, founder 6 Sep 2026: "change the drop
 * down idea in there to just show the groq api key input box", and for Talk
 * "when clicked on it should open a dropdown modal asking user to add their
 * openai api keys (stored locally)".
 *
 * Four cards use this (the Classic and PRO microphone cards, the Classic and
 * PRO Talk cards), and since 0.5.2 the Stapler screen's Transcription section
 * (components/pro/PuckScreen GroqKeyField) too. Each keeps its own chrome; the
 * saving goes through here so there is one rule for where a key is stored and
 * what the renderer learns.
 * Only PRESENCE reaches the store. The key text is handed to main and
 * forgotten; nothing here logs it or keeps it.
 */
import { useStore } from '@/store/store';

export const GROQ_KEYS_URL = 'https://console.groq.com/keys';
export const OPENAI_KEYS_URL = 'https://platform.openai.com/api-keys';

export interface KeySaveResult {
  ok: boolean;
  /** Short reason on failure. Never the key. */
  error?: string;
}

/** The Groq key lives in main config beside the Free Flow flag, the same slot
 *  Settings, Voice writes. Mirroring presence is what lights the microphone
 *  up at once instead of on the next launch. */
export async function saveGroqKey(raw: string): Promise<KeySaveResult> {
  const key = raw.trim();
  if (!key) return { ok: false, error: 'empty' };
  try {
    const r = await window.cth.freeflowSetConfig({ apiKey: key });
    if (!r || !r.ok) return { ok: false, error: 'not saved' };
    useStore.getState().setHasGroqKey(true);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** The OpenAI key goes to the secret broker slot the engines share
 *  (apikey:openai), the same one Settings, Voice and Agents & Models write.
 *  Talk mints its short lived token from it in main. */
export async function saveOpenAiKey(raw: string): Promise<KeySaveResult> {
  const key = raw.trim();
  if (!key) return { ok: false, error: 'empty' };
  try {
    const r = await window.cth.providerKeySet({ backend: 'openai', key });
    if (!r || !r.ok) return { ok: false, error: r?.error || 'not saved' };
    useStore.getState().setHasOpenAiKey(true);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
