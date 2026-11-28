/**
 * Is a window on screen? The rule behind the floor pause (0.5.5). Pure, no
 * imports, so a test runs it without Electron.
 *
 * `document.hidden` cannot answer this: the app sets backgroundThrottling
 * false, and with that Chromium keeps the page "visible" when the window is
 * minimised, hidden, fully covered or hidden with Cmd+H (measured on Electron
 * 32.3.3). So main keeps the answer per window from the window's own events:
 *  - minimize and restore set and clear `minimized` (every platform);
 *  - hide and show set and clear `occluded`. On macOS Electron also sends them
 *    when another window fully covers this one, and then isVisible() stays
 *    TRUE, which is why the state comes from events and not from isVisible().
 *    macOS orders them minimize, hide and restore, show; Windows sends only
 *    minimize and restore. Two flags are right for both orders.
 *  - focus clears both: a focused window is on screen, so a missed show can
 *    never leave the floor frozen in front of the person.
 */
export interface WindowVisibility {
  minimized: boolean;
  occluded: boolean;
}

export type WindowVisibilityEvent = 'minimize' | 'restore' | 'hide' | 'show' | 'focus';

/** The first read, and the answer after a reload. It cannot see "fully
 *  covered"; the next hide or show corrects it. */
export function initialWindowVisibility(isVisible: boolean, isMinimized: boolean): WindowVisibility {
  return { minimized: isMinimized, occluded: !isVisible && !isMinimized };
}

export function nextWindowVisibility(state: WindowVisibility, event: WindowVisibilityEvent): WindowVisibility {
  switch (event) {
    case 'minimize': return { ...state, minimized: true };
    case 'restore': return { ...state, minimized: false };
    case 'hide': return { ...state, occluded: true };
    case 'show': return { ...state, occluded: false };
    case 'focus': return { minimized: false, occluded: false };
  }
}

export function windowHidden(state: WindowVisibility): boolean {
  return state.minimized || state.occluded;
}
