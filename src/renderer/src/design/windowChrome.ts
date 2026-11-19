/**
 * THE WINDOW'S TOP ROW OFF THE MAC (founder ask, 26 Oct 2026; main `windowFrame`).
 *
 * On Windows and Linux the app's bar is the window's only top row: there is no
 * system title bar and no File / Edit / View / Window row. The system's
 * minimise, maximise and close are drawn over the bar's right end, and the menu
 * opens from a button at its left (WindowMenuButton). The Mac keeps its traffic
 * lights and its own menu; nothing here runs there.
 *
 *   OWN_FRAME              true off the Mac.
 *   startWindowControls()  once per page: marks <html> `cth-own-frame` (the
 *                          bars' padding in global.css: the controls' width
 *                          free at the right, no inset for traffic lights at
 *                          the left), and keeps the system's controls in the
 *                          colours and height of the bar on top at the
 *                          window's top edge (ink 700 symbols, Pam's section
 *                          G), on every theme or season change and
 *                          resize (pickBar).
 *   windowBarRef           a bar's ref, so one that comes or goes (focus
 *                          mode or the IDE over the app bar) is matched too,
 *                          and counted: with none mounted (the onboarding,
 *                          the hive picker, a blank hold) the page's
 *                          WindowDragStrip stands in, so the window still moves.
 *
 * A bar is any element with the class `cth-window-bar`. Its own background
 * colour is used, or the CSS colour named by `data-window-bar-color` when the
 * background is a gradient (the Classic bars), or, for `behind`, the colour of
 * the page under it (WindowDragStrip, on the screens that have no bar).
 */
export const OWN_FRAME: boolean = typeof window !== 'undefined' && !!window.cth && window.cth.platform !== 'darwin';

/** `rgb(r, g, b)` or an opaque `rgba(...)` as `#rrggbb`; null for anything else (a transparent colour, a gradient). */
function toHex(css: string): string | null {
  const m = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/.exec(css.trim());
  if (!m) return null;
  if (m[4] !== undefined && parseFloat(m[4]) === 0) return null;
  return '#' + [m[1], m[2], m[3]].map((n) => Math.min(255, Number(n)).toString(16).padStart(2, '0')).join('');
}

/** The first opaque background under the point, below `bar`: the page a transparent strip sits on. */
function colorBehind(bar: HTMLElement, x: number): string | null {
  for (const el of document.elementsFromPoint(x, 1)) {
    if (el === bar || bar.contains(el)) continue;
    for (let at: Element | null = el; at; at = at.parentElement) {
      const hex = toHex(getComputedStyle(at).backgroundColor);
      if (hex) return hex;
    }
  }
  return toHex(getComputedStyle(document.body).backgroundColor);
}

/** A CSS colour (a value or `var(--x)`) as the page draws it now. */
function resolveColor(value: string): string | null {
  const probe = document.createElement('span');
  probe.style.display = 'none';
  probe.style.color = value;
  document.body.appendChild(probe);
  const out = toHex(getComputedStyle(probe).color);
  probe.remove();
  return out;
}

let last = '';
let queued = false;

/** The bar on top at the window's top edge. Of the bars whose box starts at the top and has a size, the first
 *  found walking the whole stack under the point (elementsFromPoint, plural: a plain element over the bar does
 *  not hide it, as it did for one probe on the Windows runner, Kevin's gate of 674); else the last in the page,
 *  which is drawn over the others (focus mode, the IDE). Exported for tests. */
export function pickBar(x: number): HTMLElement | null {
  const bars = Array.from(document.querySelectorAll<HTMLElement>('.cth-window-bar')).filter((b) => {
    const r = b.getBoundingClientRect();
    return r.top <= 1 && r.bottom > 1 && r.width > 0 && r.height > 0;
  });
  if (!bars.length) return null;
  for (const el of document.elementsFromPoint(x, 1)) {
    const hit = bars.find((b) => b === el || b.contains(el));
    if (hit) return hit;
  }
  return bars[bars.length - 1];
}

function syncNow(): void {
  queued = false;
  const x = Math.max(1, Math.floor(window.innerWidth / 3));
  const bar = pickBar(x);
  if (!bar) return;
  const named = bar.dataset.windowBarColor;
  const color = named === 'behind' ? colorBehind(bar, x) : named ? resolveColor(named) : toHex(getComputedStyle(bar).backgroundColor);
  const symbolColor = resolveColor('var(--cth-ink-700)');
  const height = Math.round(bar.getBoundingClientRect().height);
  if (!color || !symbolColor || height < 24 || height > 64) return;
  const key = `${color}${symbolColor}${height}`;
  if (key === last) return;
  last = key;
  void window.cth.windowChrome.setControls({ color, symbolColor, height }).catch(() => { last = ''; });
}

/** Match the system's controls to the bar on top, after the page has painted. */
export function syncWindowControls(): void {
  if (!OWN_FRAME || queued) return;
  queued = true;
  requestAnimationFrame(() => requestAnimationFrame(syncNow));
}

export function startWindowControls(): void {
  if (!OWN_FRAME) return;
  document.documentElement.classList.add('cth-own-frame');
  // The theme and the season are stamped on <html> (design/theme.ts, season.ts); the season
  // changes the creams. A resize (maximise, restore) can change which bar is at the top.
  new MutationObserver(syncWindowControls).observe(document.documentElement, { attributes: true, attributeFilter: ['data-cth-theme', 'data-cth-season'] });
  window.addEventListener('resize', syncWindowControls);
  syncWindowControls();
}

/** The drag band's ref (WindowDragStrip): it takes the colour of the page under it, and that page changes
 *  while the band stays up (the blank hold, then the onboarding; one step, then the next). So while it is up,
 *  any change to the page matches the controls again; a sync waits two frames and sends only a new colour.
 *  Kevin's gate of 674: matched once on mount, the first run's controls kept the blank hold's white. */
let behind: MutationObserver | null = null;
export function windowBandRef(el: HTMLElement | null): void {
  behind?.disconnect();
  behind = null;
  if (!el) return;
  behind = new MutationObserver(syncWindowControls);
  behind.observe(document.body, { childList: true, subtree: true });
  syncWindowControls();
}

/** How many bars are mounted, for WindowDragStrip, which stands in only while there are none. */
let bars = 0;
const barListeners = new Set<() => void>();

/** A bar's ref (one stable function, so React calls it with the element on mount and null on unmount):
 *  match the controls when it comes and when it goes, and count it. */
export function windowBarRef(el: HTMLElement | null): void {
  bars = Math.max(0, bars + (el ? 1 : -1));
  for (const l of barListeners) l();
  syncWindowControls();
}

export function windowBarsMounted(): number {
  return bars;
}

export function onWindowBars(listener: () => void): () => void {
  barListeners.add(listener);
  return () => { barListeners.delete(listener); };
}
