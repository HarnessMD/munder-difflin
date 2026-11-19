// Ported from Prozzta/guppyos 02d0d50b (MIT).
/**
 * Did this window's last page end without unloading? ("Today a
 * crashed window reloads in silence.")
 *
 * A page marks itself alive in sessionStorage and clears the mark on pagehide,
 * which every reload, navigation and close fires. A renderer that crashed, or
 * hung until main reloaded it (main/rendererHealth.ts), never ran pagehide, so
 * the page main loads next finds the mark. sessionStorage belongs to the
 * window and survives that reload. Renderer only: main is not asked.
 */

const ALIVE = 'cth.pageAlive';
/** Set while the hive is open on this page, so "Reload the window" can go back to it. */
const HIVE_OPEN = 'cth.pageHiveOpen';
/** App.tsx's own key: the next page opens the hive instead of the picker. */
const SKIP_PICKER = 'cth.skipHivePickerOnce';

export interface CrashReload {
  /** When this page found the mark, ms. */
  at: number;
}

let boot: CrashReload | null | undefined;

/** Read once, before anything marks the page (main.tsx calls it first); later calls return the same answer. */
export function crashReloadAtBoot(): CrashReload | null {
  if (boot !== undefined) return boot;
  boot = null;
  try {
    const s = window.sessionStorage;
    if (s.getItem(ALIVE)) boot = { at: Date.now() };
    s.setItem(ALIVE, '1');
    s.removeItem(HIVE_OPEN);
    window.addEventListener('pagehide', () => {
      try { s.removeItem(ALIVE); s.removeItem(HIVE_OPEN); } catch { /* storage gone */ }
    });
  } catch { /* no sessionStorage: never claim a crash */ }
  return boot;
}

/** App.tsx: whether the hive is open on this page. */
export function markHiveOpen(open: boolean): void {
  try {
    if (open) window.sessionStorage.setItem(HIVE_OPEN, '1');
    else window.sessionStorage.removeItem(HIVE_OPEN);
  } catch { /* preview or blocked storage */ }
}

/** The root error box's "Reload the window": back to the open hive, not the picker (a
 *  switch from the picker tears down the live agents), as the picker's own reload does. */
export function reloadWindow(): void {
  try { if (window.sessionStorage.getItem(HIVE_OPEN) === '1') window.localStorage.setItem(SKIP_PICKER, '1'); } catch { /* storage blocked */ }
  window.location.reload();
}
