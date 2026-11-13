/**
 * Realtime Michael — main-process ephemeral-token mint (card rt-1, Phase 1).
 *
 * The voice orchestrator (OpenAI `gpt-realtime-2`, speech-to-speech over WebRTC)
 * connects from the RENDERER. The renderer must NEVER hold the real OpenAI key, so
 * MAIN owns it: the BYOK key is stored encrypted at rest in `integration-secrets.json`
 * under `apikey:openai` (the same write-only broker the CLI engines use — set via the
 * `providerKey:*` IPC, materialized main-only, never echoed back). On demand MAIN
 * decrypts it ONCE to mint a SHORT-LIVED EPHEMERAL client secret; only that token +
 * a minimal session config cross IPC to the renderer's `RealtimeSession`. The real
 * key is never returned over IPC, never logged.
 *
 * Phase 1 is read-only — this module ONLY mints (no action tools; that's rt-5).
 *
 * The server is OpenAI unless Settings → Voice names another OpenAI Realtime
 * compatible one (a self-hosted LocalAI, say). For such a server, or when the token
 * mint is skipped, MAIN also makes the SDP exchange (`realtime:sdp`): the renderer's
 * CSP only reaches OpenAI, and with the mint skipped the bearer is the key itself.
 *
 * Branch feat/realtime-michael. See board.md "🎙 REALTIME MICHAEL".
 */
import { ipcMain } from 'electron';
import { getSecret, hasSecret } from './integrations';
import { readConfig } from './config';
import { checkRealtimeBaseUrl, DEFAULT_REALTIME_BASE_URL } from '../shared/realtimeEndpoint';
import { exchangeSdp, mintToken, type MintResult } from './realtimeHttp';

/** Mirrors `providerKeyRef('openai')` in src/main/index.ts (BACKEND_KEY_ENV maps
 *  openai→OPENAI_API_KEY). Inlined as a local const so this module needs no new
 *  export added to index.ts — keeping the index.ts edit to a single registration
 *  line (rt-1 COORD: Oscar also edits index.ts). */
const OPENAI_KEY_REF = 'apikey:openai';

/** GA speech-to-speech model for the voice orchestrator (v0.3.4: bumped to the
 *  July 2026 gpt-realtime-2.1 — 25% p95 latency cut, better interruption handling).
 *  Defined in shared/ and re-exported here: Settings names this model in copy the
 *  user reads, so main and the UI must not be able to disagree about it. */
export { REALTIME_MODEL } from '../shared/realtimePricing';
import { REALTIME_MODEL } from '../shared/realtimePricing';

export type { MintResult } from './realtimeHttp';

/** Whether a BYOK OpenAI key is stored (presence only — no decryption). Gates the
 *  Realtime Michael voice toggle in the renderer, the way `hasGroqKey` gates the
 *  Free Flow mic button. */
export function hasOpenAiKey(): boolean {
  return hasSecret(OPENAI_KEY_REF);
}

/** Talk's server as configured in Settings → Voice: base URL (default OpenAI),
 *  whether the token mint is skipped, and the model to ask for. */
function voiceEndpoint():
  | { ok: true; base: string; isDefaultBase: boolean; direct: boolean; model: string }
  | { ok: false; error: string } {
  const cfg = readConfig();
  const checked = checkRealtimeBaseUrl(cfg.realtimeBaseUrl);
  if (!checked.ok) return { ok: false, error: `${checked.error} Fix it in Settings → Voice.` };
  const model = (typeof cfg.realtimeModel === 'string' && cfg.realtimeModel.trim()) || REALTIME_MODEL;
  return {
    ok: true,
    base: checked.url,
    isDefaultBase: checked.url === DEFAULT_REALTIME_BASE_URL,
    direct: cfg.realtimeSkipTokenMint === true,
    model
  };
}

/** Mint a short-lived ephemeral client secret for a realtime WebRTC session, at
 *  the configured base URL. With "Skip token request" on, nothing is minted (the
 *  server has no token endpoint) and main later sends the key itself in
 *  `realtime:sdp`. The real OpenAI key is decrypted MAIN-ONLY here and is NEVER
 *  part of the result. */
export async function mintRealtimeToken(model?: string): Promise<MintResult> {
  const key = getSecret(OPENAI_KEY_REF);
  if (!key) {
    return { ok: false, error: 'no OpenAI API key set — add one in Settings → Voice', code: 'no_key' };
  }
  const ep = voiceEndpoint();
  if (!ep.ok) return { ok: false, error: ep.error, code: 'bad_base_url' };
  return mintToken({
    key,
    base: ep.base,
    model: model ?? ep.model,
    direct: ep.direct,
    isDefaultBase: ep.isDefaultBase
  });
}

/** Register the renderer-facing realtime IPC. A SINGLE call from index.ts (rather
 *  than per-handler `ipcMain.handle` lines there) keeps the index.ts footprint to
 *  one line — rt-1 COORD note (Oscar also edits index.ts). No handler ever
 *  returns the real OpenAI key. */
export function registerRealtimeIpc(): void {
  // Boolean presence only — gates the voice toggle.
  ipcMain.handle('realtime:hasKey', () => hasOpenAiKey());
  // Mint an ephemeral token; returns { token, sessionConfig, sdpViaMain } only. A
  // model the renderer asks for wins; otherwise the one set in Settings → Voice.
  ipcMain.handle('realtime:mintToken', async (_evt, payload: unknown) => {
    const p = (payload ?? {}) as { model?: unknown };
    const model = typeof p.model === 'string' && p.model.trim() ? p.model.trim() : undefined;
    return mintRealtimeToken(model);
  });
  // The SDP offer/answer exchange, made here when the mint said `sdpViaMain`. The
  // base URL, mode and key are read here, never taken from the renderer: the
  // renderer supplies only the offer, the minted token it was given, and the model.
  ipcMain.handle('realtime:sdp', async (_evt, payload: unknown) => {
    const p = (payload ?? {}) as { sdp?: unknown; token?: unknown; model?: unknown };
    const ep = voiceEndpoint();
    if (!ep.ok) return { ok: false, error: ep.error };
    const model = typeof p.model === 'string' && p.model.trim() ? p.model.trim() : ep.model;
    let bearer: string;
    if (ep.direct) {
      const key = getSecret(OPENAI_KEY_REF);
      if (!key) return { ok: false, error: 'no OpenAI API key set — add one in Settings → Voice' };
      bearer = key;
    } else {
      bearer = typeof p.token === 'string' ? p.token : '';
    }
    return exchangeSdp({
      sdp: typeof p.sdp === 'string' ? p.sdp : '',
      base: ep.base,
      model,
      direct: ep.direct,
      bearer
    });
  });
}
