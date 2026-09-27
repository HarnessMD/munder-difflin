/**
 * REST TOKENS WAITING FOR SAVE (0.5.3 Settings redesign, Keys & Secrets). An
 * added or edited integration, or a removed one, is a draft task
 * `rest:<id>`; the footer Save runs it. Until then the list shows the stored
 * records with what is waiting laid over them, so the person sees the page
 * as Save will leave it.
 *
 * Import free, so test/load-ts.cjs runs it.
 */

/** `secret`: a key typed for this change, kept until Save sends it, so
 *  editing a waiting add again does not lose it. */
export type RestChange<V> = { kind: 'save'; view: V; secret?: string } | { kind: 'remove' };
export type RestRowState = 'stored' | 'save' | 'remove';

export const restTaskId = (id: string): string => `rest:${id}`;

/** The stored rows with the waiting changes laid over them: an edit replaces
 *  its row, an add joins the end, a removal stays listed (so it can be undone)
 *  and says so. `waiting(id)` is whether the change's task is still in the
 *  draft; a change whose task is gone (saved, or the page was closed) is
 *  ignored. */
export function overlayRows<V extends { id: string }>(
  stored: readonly V[],
  changes: Readonly<Record<string, RestChange<V>>>,
  waiting: (id: string) => boolean
): Array<{ row: V; state: RestRowState }> {
  const live = (id: string): RestChange<V> | null => (changes[id] && waiting(id) ? changes[id] : null);
  const out = stored.map((r) => {
    const c = live(r.id);
    if (!c) return { row: r, state: 'stored' as RestRowState };
    return c.kind === 'remove' ? { row: r, state: 'remove' as RestRowState } : { row: c.view, state: 'save' as RestRowState };
  });
  for (const [id, c] of Object.entries(changes)) {
    if (c.kind === 'save' && waiting(id) && !stored.some((r) => r.id === id)) out.push({ row: c.view, state: 'save' });
  }
  return out;
}
