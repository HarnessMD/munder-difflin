/**
 * App-wide SEASON: an axis beside light/dark (theme.ts). It dresses the office for a holiday and never changes layout.
 *
 * 'none' is the DEFAULT from 0.5.8 (founder and god, 2 Nov 2026). It was
 * 'halloween' from 28 Sep 2026, stored as nothing, so an unset value is a person
 * who never chose and is off now. Only the switch writes 'halloween' (Settings
 * writes nothing when the pick equals what is on disk), so a stored 'halloween'
 * is a person's own choice and stays on. 'christmas' (0.6.x) is a third pick
 * beside it, written the same way: only the switch writes it, so nobody who
 * never chose wakes up in December dressed for it.
 *
 * What reads it:
 *   - season.css keys its accents on `:root[data-cth-season='halloween']`
 *     and `:root[data-cth-season='christmas']`;
 *   - portraitArt.ts dresses every character in that season's costume
 *     (costumes.ts, christmasCostumes.ts);
 *   - HalloweenLayer.tsx draws the bats, ChristmasLayer.tsx the snow;
 *   - the Classic floor draws its own props (OfficeFloor: SeasonDecor for
 *     Halloween, ChristmasDecor for Christmas).
 *
 * The stored value is `config.seasonalTheme`. App.tsx mirrors it here, and the
 * localStorage key is only a boot cache so the first paint is already right.
 * Same subscribable pattern as skin.ts: components read it with `useSeason()`.
 */
import { useSyncExternalStore } from 'react';

export type Season = 'halloween' | 'christmas' | 'none';
export const SEASONS: readonly Season[] = ['halloween', 'christmas', 'none'];
export const DEFAULT_SEASON: Season = 'none';

/** The boot cache's key. A new name in 0.5.8: the old one holds 'halloween' for
 *  everyone from the old default, and would dress the first paint. */
const LS_KEY = 'cth.season.v2';

/** Any stored or config value to a Season; unknown and missing mean the default. */
export function normalizeSeason(v: unknown): Season {
  return v === 'none' || v === 'halloween' || v === 'christmas' ? v : DEFAULT_SEASON;
}

function load(): Season {
  try { return normalizeSeason(window.localStorage.getItem(LS_KEY)); } catch { return DEFAULT_SEASON; }
}

let season: Season = typeof window === 'undefined' ? DEFAULT_SEASON : load();
const subscribers = new Set<() => void>();

function apply(): void {
  try { document.documentElement.dataset.cthSeason = season; } catch { /* SSR/tests */ }
}
apply();

export function currentSeason(): Season {
  return season;
}

export function setSeason(next: Season): void {
  if (next === season) return;
  season = next;
  try { window.localStorage.setItem(LS_KEY, next); } catch { /* noop */ }
  apply();
  subscribers.forEach((fn) => fn());
}

export function subscribeSeason(fn: () => void): () => void {
  subscribers.add(fn);
  return () => { subscribers.delete(fn); };
}

export function useSeason(): Season {
  // The third reader is for a render with no window (tests draw to a string).
  return useSyncExternalStore(subscribeSeason, () => season, () => season);
}
