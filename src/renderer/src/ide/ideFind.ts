/**
 * FIND AND REPLACE IN AN OPEN FILE (0.5.3, founder ask 25 Sep). No React in
 * it, so test/ide-find.test.cjs runs it against real dispatched events.
 *
 * THE UI IS MONACO'S OWN FIND WIDGET, not a new one. It already has everything
 * the ask lists: match case, whole word, regex, next and previous, the match
 * count, a replace row that folds out under the find row (its chevron), replace
 * and replace all, and Esc closing it with the caret back in the text. It is
 * docked top right INSIDE the editor, so it can never cover the tab strip, and
 * it narrows and then hides with the editor's width. Its colours come from the
 * app's tokens (defineMonacoTheme in monaco.ts).
 *
 * What Monaco cannot do by itself is hear the key when the caret is not in the
 * text: the IDE takes focus on its own panel when it opens (takeFocusForPanel),
 * and a click on the file tree or a tab leaves it there. Cmd/Ctrl+F then did
 * nothing. So the panel asks THIS on every keydown:
 *
 *  - the chord is the platform's: Cmd+F and Cmd+Option+F on a Mac, Ctrl+F and
 *    Ctrl+H elsewhere, the same keys Monaco binds inside the text;
 *  - a key Monaco already handled (the caret was in the editor or in the find
 *    box) is left alone: Monaco stops it and marks it handled;
 *  - focus must be inside the IDE. A key typed anywhere else, or with a modal
 *    drawn over the IDE, is not ours;
 *  - there must be an editor on screen. An image or a markdown preview has no
 *    text to search, and the key is then left to whatever else wants it.
 * ⇧⌘F stays the sidebar's workspace search.
 */
import type { ChordKey } from '../components/pro/proKeys';

export type FindChord = 'find' | 'replace';

/** Monaco's own action ids for the two. */
export const FIND_ACTION: Record<FindChord, string> = {
  find: 'actions.find',
  replace: 'editor.action.startFindReplaceAction'
};

/** Which find chord a keydown is, or null. Option on a Mac changes `key` to a
 *  symbol ("ƒ"), so the physical key is read too. */
export function findChordFor(e: ChordKey, mac: boolean): FindChord | null {
  if (e.shiftKey) return null;
  const k = typeof e.key === 'string' ? e.key.toLowerCase() : '';
  const isF = k === 'f' || e.code === 'KeyF';
  if (mac) {
    if (!e.metaKey || e.ctrlKey) return null;
    if (isF) return e.altKey ? 'replace' : 'find';
    return null;
  }
  if (!e.ctrlKey || e.metaKey || e.altKey) return null;
  if (isF) return 'find';
  if (k === 'h' || e.code === 'KeyH') return 'replace';
  return null;
}

/** The editor, as the rule needs it. */
export interface FindEditor {
  /** The caret or the find box is in this editor: Monaco has the key already. */
  hasWidgetFocus(): boolean;
  focus(): void;
  getAction(id: string): { run(): unknown } | null;
}

export interface FindDeps {
  /** The editor on screen, or null when the tab is not text. */
  editor: () => FindEditor | null;
  /** Focus is in the IDE panel (or nowhere, as right after it opened). */
  inIde: () => boolean;
  /** A modal is drawn over the IDE. */
  covered: () => boolean;
  mac: boolean;
}

type FindKey = ChordKey & { defaultPrevented?: boolean };

/** Open the find (or find and replace) bar for this keydown, if it is ours.
 *  True when it did, and the caller then keeps the key from anything else. */
export function routeFindKey(e: FindKey, deps: FindDeps): boolean {
  const chord = findChordFor(e, deps.mac);
  if (!chord || e.defaultPrevented) return false;
  if (!deps.inIde() || deps.covered()) return false;
  const ed = deps.editor();
  if (!ed || ed.hasWidgetFocus()) return false;
  ed.focus();
  ed.getAction(FIND_ACTION[chord])?.run();
  return true;
}
