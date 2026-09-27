/**
 * The IDE shortcut's behaviour, with no React in it (0.5.3 review, findings 7,
 * 12 and 16 against commit 6764fbb2).
 *
 * The first version of this shortcut was tested by reading its source, and the
 * tests passed with three faults in it. Everything that decides something now
 * lives here, takes the window and document it acts on as arguments, and is RUN
 * by test/ide-shortcut.test.cjs against a real EventTarget. IdeShortcut.tsx and
 * IdePanel.tsx only hand it the real ones.
 */
import { opensIde, type ChordKey } from '../components/pro/proKeys';

/** The IDE panel's z index. Anything full screen above it is a modal. */
export const IDE_Z_INDEX = 290;

interface RectLike { width: number; height: number }
interface ElLike { parentElement: ElLike | null; getBoundingClientRect?: () => RectLike }
export interface CoverDoc { elementsFromPoint: (x: number, y: number) => ElLike[] }
export interface CoverWin {
  innerWidth: number; innerHeight: number;
  getComputedStyle: (el: never) => { position: string; zIndex: string };
}

/**
 * Is something drawn OVER where the IDE would appear? (finding 16)
 *
 * The IDE sits at z index 290 and Settings, Add agent and the quit warning at
 * 300 and up, so opened behind one of them it was invisible with its listeners
 * live: Command S, N and P acted on a panel nobody could see. There are some
 * twenty overlays in the app and they share no flag, so this asks the screen
 * instead: whatever is at the centre of the window, is it, or anything it sits
 * in, fixed, above the IDE and covering most of the window? A tooltip or a
 * toast is small and does not count. Measured, not inferred from a list of
 * modals that the next modal would not be on.
 */
export function coveredAboveIde(doc: CoverDoc, win: CoverWin, z: number = IDE_Z_INDEX): boolean {
  let stack: ElLike[];
  try { stack = doc.elementsFromPoint(win.innerWidth / 2, win.innerHeight / 2) ?? []; } catch { return false; }
  const seen = new Set<ElLike>();
  for (const hit of stack) {
    for (let el: ElLike | null = hit; el && !seen.has(el); el = el.parentElement) {
      seen.add(el);
      let cs: { position: string; zIndex: string };
      try { cs = win.getComputedStyle(el as never); } catch { continue; }
      if (cs.position !== 'fixed') continue;
      const zi = parseInt(cs.zIndex, 10);
      if (!Number.isFinite(zi) || zi <= z) continue;
      const r = el.getBoundingClientRect?.();
      if (r && r.width >= win.innerWidth * 0.9 && r.height >= win.innerHeight * 0.9) return true;
    }
  }
  return false;
}

export interface IdeShortcutDeps {
  isOpen: () => boolean;
  open: () => void;
  /** True while a modal is up. The chord then does nothing at all. */
  covered: () => boolean;
  mac?: boolean;
}

/** Would this keydown open the IDE right now? The window listener and the
 *  terminal's key handler both ask THIS, so a terminal never swallows a key the
 *  listener is about to ignore. */
export function ideChordOpens(e: ChordKey, deps: IdeShortcutDeps): boolean {
  return opensIde(e, deps.isOpen(), deps.mac) && !deps.covered();
}

type KeyListener = (e: ChordKey & { preventDefault: () => void }) => void;
/** A window, or a plain EventTarget in a test. Loose on purpose: the DOM's
 *  overloads do not narrow to one listener shape. */
interface KeyTarget {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addEventListener: (type: 'keydown', fn: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  removeEventListener: (type: 'keydown', fn: any) => void;
}

/** Attach the shortcut to a window. Returns the detach. */
export function installIdeShortcut(target: KeyTarget, deps: IdeShortcutDeps): () => void {
  const onKey: KeyListener = (e) => {
    if (!ideChordOpens(e, deps)) return;
    e.preventDefault();
    deps.open();
  };
  target.addEventListener('keydown', onKey);
  return () => target.removeEventListener('keydown', onKey);
}

interface Focusable { focus: (o?: { preventScroll?: boolean }) => void; isConnected?: boolean }

/**
 * Give the keyboard to the panel when it opens, and back when it closes
 * (finding 7, the serious one).
 *
 * Every earlier way into the IDE was a click, and a click moves focus off the
 * terminal by itself. The shortcut is the first keyboard way in, pressed FROM a
 * focused terminal, and the panel took focus nowhere. So the keyboard still
 * belonged to the agent under the panel: what the person typed, and Enter, went
 * into a CLI they could no longer see, and the Escape that closed the IDE also
 * reached xterm, where Claude Code reads Escape as "interrupt the turn".
 *
 * Returns the restore. The element that had focus gets it back only if it is
 * still in the page and nothing else took focus while the IDE was open.
 */
export function takeFocusForPanel(root: Focusable | null, doc: { activeElement: unknown; body?: unknown }): () => void {
  const before = doc.activeElement as (Focusable & { blur?: () => void }) | null;
  if (!root) return () => {};
  try { root.focus({ preventScroll: true }); } catch { /* not focusable yet */ }
  // A root that could not take focus must still not leave it in the terminal.
  if (doc.activeElement === before && before && before !== doc.body) { try { before.blur?.(); } catch { /* noop */ } }
  return () => {
    if (!before || before === doc.body || before.isConnected === false) return;
    try { before.focus({ preventScroll: true }); } catch { /* gone */ }
  };
}
