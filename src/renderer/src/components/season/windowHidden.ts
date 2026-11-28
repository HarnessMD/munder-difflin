/**
 * Is this window off screen? Stamped on <html> as data-cth-window="hidden" so
 * one CSS rule can pause every decoration. `document.hidden` cannot answer:
 * the app keeps backgroundThrottling false, so main tells the window
 * (src/main/windowVisibility.ts). The floor keeps its own copy of this rule
 * because its ticker is not CSS.
 *
 * ONE listener for the app: HalloweenLayer starts it, and it is mounted once.
 */
function stamp(hidden: boolean): void {
  const el = document.documentElement;
  if (hidden) el.dataset.cthWindow = 'hidden';
  else delete el.dataset.cthWindow;
}

export function watchWindowHidden(): () => void {
  let hidden = false;
  let heard = false;
  // A missed 'show' must not leave still decorations in front of the person:
  // a pointer move or a key in this window means it is on screen. Listened
  // for only while hidden.
  const onScreen = (): void => { set(false); };
  const set = (next: boolean): void => {
    if (next === hidden) return;
    hidden = next;
    stamp(hidden);
    const change = hidden ? window.addEventListener : window.removeEventListener;
    change.call(window, 'pointermove', onScreen, true);
    change.call(window, 'keydown', onScreen, true);
  };
  // Subscribe first, then ask: an event that lands before the answer wins.
  const off = window.cth?.onWindowVisibility?.((v) => { heard = true; set(v.hidden === true); });
  void window.cth?.getWindowVisibility?.().then((v) => { if (!heard) set(v?.hidden === true); }).catch(() => {});
  return () => {
    off?.();
    set(false);
  };
}
