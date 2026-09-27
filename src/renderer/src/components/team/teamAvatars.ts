/**
 * Which sprite draws a teammate in the Team window (phase 8).
 *
 * A teammate is a person, not an agent, and the roster carries no avatar
 * for a person: Pam's custom avatar work is about agents. So the choice is
 * made here and made ONCE per person. A first name that is a cast member's
 * name gets that sprite (Pam is Pam, Kevin is Kevin); everyone else gets a
 * stable pick from the rest of the cast, keyed by their member id, so the
 * face never changes between reloads and is the same on every teammate's
 * machine. Michael is left out of the pool: on this floor Michael is the
 * orchestrator, and a teammate wearing his face would read as him.
 *
 * castRoster is metadata only (no pixi, no painter), so this is safe to
 * import from anywhere; SpritePortrait loads the painter itself.
 */
import { OFFICE_CAST, type OfficeCharacterName } from '../../scene/office/castRoster';

const POOL: OfficeCharacterName[] = OFFICE_CAST.map((c) => c.name).filter((n) => n !== 'michael');

export function characterForTeammate(name: string, id: string): OfficeCharacterName {
  const first = (name.trim().split(/\s+/)[0] ?? '').toLowerCase();
  const named = first
    ? OFFICE_CAST.find((c) => c.name === first || c.displayName.toLowerCase() === first)
    : undefined;
  if (named && named.name !== 'michael') return named.name;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return POOL[h % POOL.length];
}
