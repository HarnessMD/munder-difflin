/**
 * The window's drag strip on the screens that have no app bar (the blank hold
 * while the records load, the onboarding, the hive picker, the
 * takeover), off the Mac only (design/windowChrome.ts). With no system title
 * bar, nothing else would move the window there, and the system's window
 * controls would sit in their default colour over the page (Kevin's gate of
 * PR 674).
 *
 * Mounted once, first in the page's root (main.tsx), and drawn only while no
 * app bar is mounted (windowBarsMounted). A transparent band across the top,
 * 38px, that gives the window controls the colour
 * of the page under it (`data-window-bar-color="behind"`). Being first in the
 * page is what lets a control in the band that is marked `cth-titlebar-nodrag`
 * stay clickable: only a later no-drag cuts a hole in an earlier drag. The
 * band takes no pointer events: the drag comes from its app-region, not from
 * hit testing, and a click the system lets through a no-drag hole must reach
 * the control under the band (the onboarding back link, Kevin's gate of 674).
 * pickBar still finds it, as the only bar while none is mounted. While it is
 * up, a change to the page under it matches the controls again (windowBandRef).
 * The Mac is unchanged: nothing is drawn there.
 */
import { useSyncExternalStore } from 'react';
import { OWN_FRAME, onWindowBars, windowBandRef, windowBarsMounted } from '../design/windowChrome';

export function WindowDragStrip() {
  const bars = useSyncExternalStore(onWindowBars, windowBarsMounted);
  if (!OWN_FRAME || bars > 0) return null;
  return (
    <div
      ref={windowBandRef}
      aria-hidden
      className="cth-titlebar-drag cth-window-bar"
      data-window-bar-color="behind"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 38, zIndex: 1000, background: 'transparent', pointerEvents: 'none' }}
    />
  );
}
