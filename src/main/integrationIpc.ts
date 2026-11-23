/**
 * The integrations IPC doors that change what agents may reach: upsert,
 * setSecret and remove. Electron free, so the save path is tested in node
 * (test/v055-key-reaches-agents.test.cjs); index.ts registers these.
 *
 * 0.5.5 rc2, Track K1 (founder, 30 Sep): Save in Keys & Secrets is upsert
 * THEN setSecret. upsert retargets the live grants, but a record needing a
 * secret is not enabled until the secret is stored, so the new id was left
 * out, and setSecret retargeted nothing. Every running agent got 403 until a
 * restart. Every door that changes what is reachable now retargets after it.
 */
import type { IntegrationRecord } from '../shared/integrations';

export interface IntegrationIpcDeps {
  upsertRecord: (input: unknown) => { ok: true; record: IntegrationRecord } | { ok: false; error: string };
  /** Save a record's key, sealed for the address the person's window showed (integrations.ts). */
  setIntegrationSecret: (id: string, plaintext: string, seenUrl: string) => { ok: boolean; error?: string; held?: boolean; code?: string };
  removeRecord: (id: string) => { ok: boolean };
  /** Point every live grant at the ids enabled now (BrokerGrants.onIntegrationsChanged). */
  onChanged: () => void;
}

export function integrationHandlers(deps: IntegrationIpcDeps) {
  return {
    upsert(record: unknown) {
      const r = deps.upsertRecord(record);
      // 0.5.5: an integration enabled (or disabled) now reaches running agents too.
      deps.onChanged();
      return r;
    },
    setSecret(payload: unknown): { ok: boolean; error?: string; held?: boolean; code?: string } {
      const p = (payload ?? {}) as { id?: unknown; secret?: unknown; baseUrl?: unknown };
      if (typeof p.id !== 'string' || !p.id) return { ok: false, error: 'id required' };
      if (typeof p.secret !== 'string' || !p.secret) return { ok: false, error: 'secret required' };
      // The address the window showed is part of the save: the key is kept for it and no other.
      if (typeof p.baseUrl !== 'string' || !p.baseUrl) return { ok: false, error: 'the address this key is for is required' };
      const r = deps.setIntegrationSecret(p.id, p.secret, p.baseUrl);
      // The record is enabled only once its secret is stored: now it is.
      if (r.ok) deps.onChanged();
      return r;
    },
    remove(payload: unknown): { ok: boolean; error?: string } {
      const p = (payload ?? {}) as { id?: unknown };
      if (typeof p.id !== 'string' || !p.id) return { ok: false, error: 'id required' };
      const r = deps.removeRecord(p.id);
      deps.onChanged();
      return r;
    }
  };
}
