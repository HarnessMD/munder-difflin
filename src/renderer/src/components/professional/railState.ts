/**
 * Rail collapse state — section 7: "It is collapsible to a 56px icon-only strip
 * and that state is remembered."
 *
 * Same shape as design/theme.ts and design/skin.ts: a subscribable module with a
 * localStorage key, so the rail and anything laying out beside it read one source
 * instead of prop-drilling a boolean through the tree.
 */
import { useSyncExternalStore } from 'react';
import { clampRailWidth, RAIL_WIDTH_DEFAULT } from '@shared/railWidth';

const LS_KEY = 'cth.railCollapsed';

export const RAIL_WIDTH = 300;
export const RAIL_WIDTH_COLLAPSED = 56;

function load(): boolean {
  try { return window.localStorage.getItem(LS_KEY) === '1'; } catch { return false; }
}

let collapsed = load();
const subscribers = new Set<() => void>();

export function setRailCollapsed(next: boolean): void {
  if (next === collapsed) return;
  collapsed = next;
  try { window.localStorage.setItem(LS_KEY, next ? '1' : '0'); } catch { /* noop */ }
  subscribers.forEach((fn) => fn());
}

export function toggleRailCollapsed(): void {
  setRailCollapsed(!collapsed);
}

export function useRailCollapsed(): boolean {
  return useSyncExternalStore(
    (onChange) => { subscribers.add(onChange); return () => subscribers.delete(onChange); },
    () => collapsed
  );
}

/* THE PRO SIDEBAR'S WIDTH (0.5.3 rc.4, founder 25 Sep 2026): dragged on its
   inner edge, remembered across launches the same way the fold is. A drag
   draws every move at once and stores only on release (`persist`). The
   rules are @shared/railWidth. */
const WIDTH_KEY = 'cth.proRailWidth';

function loadWidth(): number {
  try { return clampRailWidth(window.localStorage.getItem(WIDTH_KEY)); } catch { return RAIL_WIDTH_DEFAULT; }
}

let width = loadWidth();
const widthSubscribers = new Set<() => void>();

export function setRailWidth(next: number, persist = true): void {
  const w = clampRailWidth(next);
  if (persist) { try { window.localStorage.setItem(WIDTH_KEY, String(w)); } catch { /* noop */ } }
  if (w === width) return;
  width = w;
  widthSubscribers.forEach((fn) => fn());
}

export function useRailWidth(): number {
  return useSyncExternalStore(
    (onChange) => { widthSubscribers.add(onChange); return () => widthSubscribers.delete(onChange); },
    () => width
  );
}

/**
 * A row another surface contributes to the sidebar (today: the Teams seam's
 * Team and Requests rows). Lived in ProfessionalRail.tsx until PRO replaced
 * the rail; it lives here now because the seam and the sidebar both need it
 * and neither should import the other.
 */
export interface RailRowSpec {
  /** Must match the key in `extraPanes`. That pairing IS the seam. */
  id: string;
  label: string;
  /** Sprite glyph id. The PRO sidebar draws its own stroke icon for these rows
   *  and ignores it; kept so the seam's rows do not change shape. */
  glyph: string;
  /**
   * How many things are waiting behind this row. Omitted or 0 renders nothing.
   *
   * This is not decoration. `Requests 2` is the row where THE NUMBER IS THE
   * REASON ANYONE CLICKS IT — a queue you have to open to discover is empty is
   * a queue people stop opening, and then an approval sits for a week.
   */
  count?: number;
}

/** The panes this layout ships with. `agent:<id>` selects one agent. */
export type BuiltinPaneId = 'org' | 'memory' | 'tasks' | 'askme' | `agent:${string}`;

/**
 * Which pane the rail is showing.
 *
 * THE SET OF PANES IS OPEN BY CONSTRUCTION and it has to be: `extraPanes` and
 * `companyRows` exist so a fork adds a destination without editing this file,
 * and a closed union would mean every fork's first change is to widen it —
 * which is the merge conflict the seam was built to avoid.
 *
 * `(string & {})` is the open-enum idiom: it accepts any id while still
 * autocompleting the built-in ones. The trade is real and worth naming — a typo
 * in `'org'` is no longer a type error. The rail rows and the panes are keyed by
 * the same id and mismatches show up as a row that opens nothing, so this is
 * covered by the seam test rather than by the compiler.
 */
export type PaneId = BuiltinPaneId | (string & {});
