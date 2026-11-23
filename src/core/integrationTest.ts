/**
 * AN INTEGRATION'S TEST BEFORE IT IS SAVED. The Integrations
 * screen's Test button probes an address through the broker's own auth path
 * (`integrations:test` in src/main/index.ts); this reads the form as it stands.
 */
import { validateIntegrationRecord, authTypeNeedsSecret, type IntegrationRecord } from '../shared/integrations';

/**
 * A Test before anything is saved: `{ draft, secret }`, the form as it stands
 * and the token typed on it. Null when the call names a saved record. Only the
 * typed token is sent: a kept key never goes where a draft says. Nothing is
 * kept and no line is logged, as there is no record yet for a line to belong to.
 */
export function draftForTest(payload: unknown): { rec: IntegrationRecord; secret: string } | { error: string } | null {
  const p = (payload ?? {}) as { draft?: unknown; secret?: unknown };
  if (p.draft === undefined) return null;
  const v = validateIntegrationRecord(p.draft);
  if (!v.ok) return { error: v.error };
  const secret = typeof p.secret === 'string' ? p.secret : '';
  if (authTypeNeedsSecret(v.value.authType) && !secret.trim()) return { error: 'no token typed' };
  return { rec: { ...v.value, createdAt: 0, updatedAt: 0 }, secret };
}
