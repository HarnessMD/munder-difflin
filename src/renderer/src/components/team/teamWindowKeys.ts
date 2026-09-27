/**
 * The Team window's one chord and its on-screen spelling (v0.4.9 phase 8,
 * plan Part 7, Option B). Pure, like pro/proKeys.ts, so a test can call it
 * with a plain object.
 *
 * ⌘⇧T on macOS, Ctrl+Shift+T elsewhere. Shift is part of the chord on
 * purpose: ⌘T alone is "new tab" in every browser a person has ever used,
 * and PRO's table (proKeys.ts) leaves every Shift chord free for exactly
 * this kind of binding. The app menu claims only ⌘⇧N (New Floor), so no
 * menu item replays this one. `code` is read as well as `key`, so a layout
 * that types another script through the T key still opens the window.
 */
export interface ChordKey {
  key: string;
  code?: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

/** True when a keydown is the Team window chord and nothing else. */
export function isTeamWindowChord(e: ChordKey): boolean {
  if (!(e.metaKey || e.ctrlKey)) return false;
  if (e.altKey || !e.shiftKey) return false;
  return e.key.toLowerCase() === 't' || e.code === 'KeyT';
}

/** What the tooltip and the window header spell the chord as. */
export function teamWindowHint(platform: string | undefined): string {
  return platform === 'darwin' ? '⌘⇧T' : 'Ctrl+Shift+T';
}
