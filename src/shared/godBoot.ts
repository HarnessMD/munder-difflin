/**
 * Is the orchestrator already running? (Review of 6bef7c9b, the same bug class
 * one screen up.)
 *
 * His boot read the live terminals with `listPtys().catch(() => [])`. A listing
 * that FAILED and a floor with no terminals were then the same empty list, so a
 * failed listing read as "he is not running": his row was removed from the
 * store, a second spawn was attempted, main refused it as a duplicate, and the
 * floor was left saying "failed" with no orchestrator row while he was alive.
 *
 * Kevin's rule, from the first time this shape bit us: when two opposite facts
 * arrive as the same value, the dangerous direction must need proof. Removing a
 * live orchestrator's row is the dangerous direction, so only a listing that
 * ANSWERED may say he is not running.
 */
export type GodRunning = 'yes' | 'no' | 'unknown';

export function godRunning(listing: { answered: boolean; ids: readonly string[] }, godPty: string): GodRunning {
  if (!listing.answered) return 'unknown';
  return listing.ids.includes(godPty) ? 'yes' : 'no';
}

/** Main refuses a second terminal under an id it already holds. That refusal is
 *  itself proof he is alive, whatever the listing said. */
export function refusedBecauseAlive(error: string | undefined): boolean {
  return /\balready exists\b/i.test(error ?? '');
}
