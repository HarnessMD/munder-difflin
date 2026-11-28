/**
 * Integrations registry + encrypted secret store (Phase 2 foundation, main process).
 *
 * Two responsibilities, deliberately separated from the broker:
 *   1. Registry — config-backed CRUD over IntegrationRecord metadata (NO secrets).
 *   2. Secret store — secrets ENCRYPTED AT REST, kept in a file SEPARATE from
 *      config.json, opened only here, only in main. Each one is sealed with
 *      its own name and with what it may be used for (src/main/sealedStore.ts):
 *      a caller says what it wants the secret for and gets it for that only.
 *
 * The broker (src/main/integrationBroker.ts) is electron-free and receives `getRecord`
 * + `getSecret` from here by injection, so it stays unit-testable without electron.
 *
 * SECURITY: a secret is never written unless `safeStorage.isEncryptionAvailable()`
 * (fail closed — no plaintext fallback), never returned to the renderer, never logged,
 * never placed in agent env/transcript, never echoed in any response. Records carry
 * only a `secretRef` handle.
 *
 * Contract: hive/docs/integrations-spec.md.
 */
import { officePaths } from '../core/paths';
import { secretCipher } from '../core/secrets';
import { baseAddress, type SecretUse } from '../core/sealedSecrets';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import {
  type IntegrationRecord,
  validateIntegrationRecord,
  authTypeNeedsSecret,
  secretRefFor,
  resolveTemplate,
  INTEGRATION_TEMPLATES
} from '../shared/integrations';
import { createSealedStore, type HeldSecret, type MoveResult, type SealedStore } from './sealedStore';
import { readConfig, writeConfig } from './config';

// ─── Registry (config-backed) ────────────────────────────────────────────────

/** All registered integration records (metadata only). */
export function listRecords(): IntegrationRecord[] {
  return readConfig().integrations ?? [];
}

/** Look up one record by id. */
export function getRecord(id: string): IntegrationRecord | undefined {
  return listRecords().find((r) => r.id === id);
}

/** Ids of integrations a worker may use right now (enabled, and — for secret auth —
 *  actually holding a stored secret). This is the default capability scope granted to
 *  every ephemeral worker. */
export function enabledIds(): string[] {
  return listRecords()
    .filter((r) => r.enabled && (!authTypeNeedsSecret(r.authType) || hasSecretFor(r)))
    .map((r) => r.id);
}

/** Create or replace a record (validated). Stamps createdAt/updatedAt; preserves the
 *  original createdAt on update. Called for the person only (their window). When
 *  they change the address, the stored secret follows it, but only a secret that
 *  was sealed for the address the record had (sealedStore.ts, `readdress`).
 *  `moveKey: false` (an office): the stored secret is left where it is; it
 *  stays sealed for the address it was saved for. */
export function upsertRecord(input: unknown, opts: { moveKey?: boolean } = {}): { ok: true; record: IntegrationRecord } | { ok: false; error: string } {
  const v = validateIntegrationRecord(input);
  if (!v.ok) return v;
  const now = Date.now();
  const existing = getRecord(v.value.id);
  const record: IntegrationRecord = {
    ...v.value,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  };
  const next = listRecords().filter((r) => r.id !== record.id);
  next.push(record);
  writeConfig({ integrations: next });
  if (opts.moveKey !== false && existing && existing.baseUrl !== record.baseUrl) secrets().readdress(record.secretRef, existing.baseUrl, record.baseUrl);
  return { ok: true, record };
}

/** Remove a record AND its stored secret. */
export function removeRecord(id: string): { ok: boolean } {
  const next = listRecords().filter((r) => r.id !== id);
  // The secret first: a record is never reported gone while its key could not be deleted.
  try { deleteSecret(secretRefFor(id)); } catch { return { ok: false }; }
  writeConfig({ integrations: next });
  return { ok: true };
}

/** Switch a record off (it stays, without being reachable). Idempotent. */
export function disableRecord(id: string): void {
  const all = listRecords();
  if (!all.some((r) => r.id === id && r.enabled)) return;
  writeConfig({ integrations: all.map((r) => (r.id === id ? { ...r, enabled: false, updatedAt: Date.now() } : r)) });
}

/** Records with the secretRef redacted to a boolean — the renderer-safe shape. */
export function listRecordsRedacted(): Array<Omit<IntegrationRecord, 'secretRef'> & { hasSecret: boolean }> {
  return listRecords().map(({ secretRef, ...rest }) => ({ ...rest, hasSecret: !!secretRef && hasSecretFor({ secretRef, baseUrl: rest.baseUrl }) }));
}

// ─── Secret store (sealed, encrypted at rest) ────────────────────────────────

function secretsPath(): string {
  return join(officePaths().userData(), 'integration-secrets.json');
}

let store: SealedStore | null = null;
let storeDir = '';
/** The sealed store over this office's data folder. */
function secrets(): SealedStore {
  const dir = officePaths().userData();
  if (!store || storeDir !== dir) {
    store = createSealedStore({ secretsFile: secretsPath(), keyFile: join(dir, 'secret-store.key'), cipher: secretCipher, expectedRefs: () => listRecords().flatMap((r) => (r.secretRef ? [r.secretRef] : [])) });
    storeDir = dir;
  }
  return store;
}

/** The file of kept keys, asked now: read (`ok`), not there (`none`: nothing
 *  was ever kept), or there and not readable (`unreadable`). A file that is
 *  there while no key to seal with was given is `unreadable` too: nothing in
 *  it can be opened, and nothing can be saved over it. */
export function secretFileState(): 'ok' | 'none' | 'unreadable' {
  if (secrets().fileUnreadable()) return 'unreadable';
  if (!existsSync(secretsPath())) return 'none';
  return secretCipher().available() ? 'ok' : 'unreadable';
}

/** Why a key kept under a name cannot be read: the whole file (`store`), or
 *  that one key (`key`). Null when that is not the reason: nothing is kept
 *  under the name, or it can be opened (whatever address it is sealed for).
 *  THE ONE QUESTION for an office's broker, its grant and `secretStore:health`. */
export function keyProblem(secretRef: string | undefined): 'store' | 'key' | null {
  if (secretFileState() === 'unreadable') return 'store';
  return secrets().state(secretRef) === 'unreadable' ? 'key' : null;
}

/** Store a secret ENCRYPTED, sealed for one use. Fail closed if OS encryption
 *  is unavailable (never writes plaintext). FOR THE PERSON'S OWN WINDOW ONLY:
 *  whatever calls this decides what a secret may be used for. */
export function setSecret(secretRef: string, use: SecretUse, plaintext: string): { ok: boolean; error?: string } {
  return secrets().set(secretRef, use, plaintext);
}

/** Open a secret for one use. MAIN-INTERNAL ONLY — never expose this over IPC.
 *  Returns undefined if absent, sealed for another name or another use, held,
 *  or unreadable (the broker maps that to 503 no_secret). */
export function getSecret(secretRef: string | undefined, use: SecretUse): string | undefined {
  return secrets().get(secretRef, use);
}

/** Every ref the store holds (no decryption). Custom secrets are listed from
 *  their `env:` refs, so the store is the one record of which exist. */
export function listSecretRefs(): string[] {
  return secrets().refs();
}

/** Whether a secret is stored for this ref and may be used now (not held,
 *  not unreadable). The value is not handed out. */
export function hasSecret(secretRef: string | undefined): boolean {
  return secrets().has(secretRef);
}

/** Whether this record's secret is there AND sealed for the address the
 *  record has now. A record whose address was changed in the file has none. */
export function hasSecretFor(rec: Pick<IntegrationRecord, 'secretRef' | 'baseUrl'>): boolean {
  const use = secrets().useOf(rec.secretRef);
  return use?.kind === 'http' && use.url === baseAddress(rec.baseUrl);
}

/** The provider's own address, when this record is a built in one whose
 *  provider has a single fixed address (not Jira's or Confluence's, where
 *  every person has their own). */
export function providerAddressOf(rec: Pick<IntegrationRecord, 'kind' | 'baseUrl' | 'templateId'>): string | undefined {
  const t = resolveTemplate(INTEGRATION_TEMPLATES, rec);
  return t && t.baseUrl !== '' && !t.baseUrl.includes('your-domain') ? t.baseUrl : undefined;
}

const NOT_THE_PROVIDERS = 'not saved: this address is not the provider\'s own. Use the provider\'s address, or add this address as a custom integration';

/**
 * Save an integration's key, from the person's window. `seenUrl` is the
 * address the window showed when the person pressed Save: the key is sealed
 * for that address, and only when the record still has it.
 *
 * Held instead (it waits for the person's "This is right" in the notice) when
 * the key would go somewhere the person may not have chosen: the record is a
 * built in one and the address is not the provider's own, or a key is already
 * kept for this record under another address.
 *
 * `noHold`: the caller has no notice to confirm in (an office). A key that
 * would be held is refused with the code `key_needs_check`, and nothing is kept.
 * `replace`: the key the person typed takes the place of one kept under
 * another address (an office's save, where the old key is never moved); that
 * alone no longer holds or refuses it.
 */
export function setIntegrationSecret(id: string, plaintext: string, seenUrl: string, opts: { noHold?: boolean; replace?: boolean } = {}): { ok: boolean; error?: string; held?: boolean; code?: 'key_needs_check'; fault?: true } {
  const rec = getRecord(id);
  if (!rec || !rec.secretRef) return { ok: false, error: 'save the integration before its key' };
  const url = baseAddress(rec.baseUrl);
  if (url === null) return { ok: false, error: 'this integration has no address a key can be kept for' };
  if (typeof seenUrl !== 'string' || baseAddress(seenUrl) !== url) return { ok: false, error: 'the address of this integration changed while you were saving; open it again and check the address' };
  const provider = providerAddressOf(rec);
  const before = secrets().useOf(rec.secretRef);
  const elsewhere = !opts.replace && (before?.kind === 'http' || before?.kind === 'held') && before.url !== url;
  const held = elsewhere || (provider !== undefined && baseAddress(provider) !== url);
  if (held && opts.noHold) {
    return {
      ok: false,
      code: 'key_needs_check',
      error: elsewhere
        ? 'not saved: a key is already kept for this integration under another address. Remove the integration and add it again with the address you want'
        : NOT_THE_PROVIDERS
    };
  }
  const r = secrets().set(rec.secretRef, held ? { kind: 'held', url } : { kind: 'http', url }, plaintext);
  return r.ok && held ? { ok: true, held: true } : r;
}

/**
 * The move of the secrets an older version kept (bare keychain values), at
 * the app's start, before anything reads one. `isAgentKey`: whether a name is
 * one whose secret goes into agents' environment (a provider key, a key by
 * name). A name no record and no agent key uses is dropped. Every other key
 * works at once, and keys an earlier 0.5.8 start held or dropped
 * come back from the copy of the old file (sealedStore.ts, fromOldCopies).
 */
export function moveOldSecrets(opts: { appKeyFiles: readonly string[]; isAgentKey: (ref: string) => boolean }): MoveResult {
  const records = listRecords();
  return lastMove = secrets().move({
    appKeyFiles: opts.appKeyFiles,
    sinkOf: (ref) => {
      if (opts.isAgentKey(ref)) return { kind: 'env' };
      const rec = records.find((r) => r.secretRef === ref && authTypeNeedsSecret(r.authType));
      return rec ? { kind: 'http', recordUrl: rec.baseUrl } : { kind: 'none' };
    }
  });
}

let lastMove: MoveResult = { decisions: [] };
/** What the move did at this start (for the notice: whether it could look at the old keys at all). */
export function lastSecretMove(): MoveResult {
  return lastMove;
}

/** The names whose old key the update could not keep, until the person has seen them. */
export function lostSecrets(): string[] {
  return secrets().lost();
}
export function seenLostSecrets(refs: readonly string[]): void {
  secrets().seenLost(refs);
}

/** The names that still hold an old value the move could not look at. */
export function oldSecretRefs(): string[] {
  return secrets().oldRefs();
}
/** The cause of a move that stood back which the person has pressed Done on. */
export function seenSecretSkip(): string | undefined {
  return secrets().skipSeen();
}
export function seeSecretSkip(cause: string): void {
  secrets().seeSkip(cause);
}

/** What waits for the person's yes, masked (for the notice). */
export function heldSecrets(): HeldSecret[] {
  return secrets().held();
}

/** The person's "This is right", for the exact value they were shown. */
export function releaseHeldSecret(secretRef: string, shown: string): boolean {
  return secrets().release(secretRef, shown);
}

/** The person's "Switch off", for the exact value they were shown. */
export function forgetHeldSecret(secretRef: string, shown: string): boolean {
  return secrets().forgetHeld(secretRef, shown);
}

/** Delete a stored secret. Idempotent. */
export function deleteSecret(secretRef: string | undefined): void {
  secrets().remove(secretRef);
}
