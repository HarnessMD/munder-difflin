/**
 * A PENDING PATCH ON A LIVE OBJECT (0.5.3 Settings redesign: "only one save
 * button"). Some sections cannot stage plain config fields, because their
 * write goes through a setter of its own in main that re-arms something
 * (transcribeSetConfig re-arms the dictation keys; freeflowSetConfig the Free
 * Flow hotkey). They keep what the person changed as a patch over the live
 * value, and Save sends the patch through that setter.
 *
 * The page shows live + patch, so it keeps following the live value (the
 * Stapler changes config.transcribe too) for every field the person has not
 * touched. A field set back to its live value drops out of the patch, and an
 * empty patch means nothing is pending: Save goes quiet again.
 *
 * Import free, so test/load-ts.cjs runs it.
 */

/** Deep equal for config values, whatever order the keys were written in. */
const canon = (v: unknown): unknown =>
  Array.isArray(v) ? v.map(canon)
    : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, canon((v as Record<string, unknown>)[k])]))
      : v;
export const sameValue = (a: unknown, b: unknown): boolean => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
const same = sameValue;

/** `prev` plus `change`, less every field that now equals the live value. */
export function mergePending<T extends object>(live: T, prev: Partial<T>, change: Partial<T>): Partial<T> {
  const out: Partial<T> = {};
  const next = { ...prev, ...change } as Partial<T>;
  for (const k of Object.keys(next) as Array<keyof T>) {
    if (!same(next[k], live[k])) out[k] = next[k];
  }
  return out;
}

export const isEmptyPatch = (p: object): boolean => Object.keys(p).length === 0;

/** Where each draft keeps its pending patches, by task id. The patch lives as
 *  long as its task does: a section drawn again after the person looked at
 *  another tab shows what is still waiting for Save. */
const store = new WeakMap<object, Map<string, object>>();

export function pendingFor<T extends object>(draft: object, id: string): Partial<T> {
  return (store.get(draft)?.get(id) ?? {}) as Partial<T>;
}

export function setPendingFor(draft: object, id: string, patch: object | null): void {
  let m = store.get(draft);
  if (!m) { m = new Map(); store.set(draft, m); }
  if (patch && !isEmptyPatch(patch)) m.set(id, patch); else m.delete(id);
}
