/**
 * The IDE's unsaved edits: what may close, what is kept, what is dropped.
 * (Review findings 6, 13 and 15, 0.5.3.)
 *
 * The panel's rule has always been "refused outright while anything is unsaved,
 * no confirmation nobody reads". It held that rule at the PANEL's X and at the
 * project switcher, and nowhere else. A tab's own X closed a dirty tab and left
 * its buffer behind, so the IDE then refused to close with nothing on screen
 * saying why; trashing a dirty file did the same with no file left to save
 * into; and a save that kept failing had no way out at all.
 *
 * So the rule is held everywhere, and given the one exit it lacked:
 *  - a DIRTY editor tab does not close. Close others and close right keep it.
 *  - Discard changes, chosen by a person, puts a buffer back to what is on disk.
 *  - a trashed file's buffer goes with it: the person deleted the file.
 *  - a dirty buffer that somehow has no tab is FOUND, so the panel can show it
 *    instead of refusing in silence.
 *
 * Pure, with no React and no window, because IdePanel.tsx cannot be mounted by
 * the test suite and a rule about losing someone's edits should be one that ran.
 */

export interface IdeBufferLike { content: string; original: string; status: string }
export interface IdeTabLike { key: string; mode: string; rel: string }

/** Only a READY buffer can be dirty: a loading or failed one holds nothing of
 *  the person's. */
export function isDirty(buf: IdeBufferLike | undefined): boolean {
  return !!buf && buf.status === 'ready' && buf.content !== buf.original;
}

/** Only an EDITOR tab onto a file owns its unsaved text: a diff, an image or
 *  the home tab closes freely. And two editor tabs on one file are two windows
 *  onto ONE buffer (the panel's Duplicate), so closing one of them loses
 *  nothing; only the LAST editor tab onto a dirty file is held. */
export function canCloseTab(tab: IdeTabLike, buffers: Readonly<Record<string, IdeBufferLike>>, tabs: readonly IdeTabLike[] = []): boolean {
  if (tab.mode !== 'edit' || !isDirty(buffers[tab.rel])) return true;
  return tabs.some((tb) => tb.key !== tab.key && tb.mode === 'edit' && tb.rel === tab.rel);
}

export function tabsAfterCloseOthers<T extends IdeTabLike>(tabs: readonly T[], key: string, buffers: Readonly<Record<string, IdeBufferLike>>): T[] {
  return tabs.filter((tb) => tb.key === key || !canCloseTab(tb, buffers, tabs.filter((x) => x.key === key)));
}

export function tabsAfterCloseRight<T extends IdeTabLike>(tabs: readonly T[], key: string, buffers: Readonly<Record<string, IdeBufferLike>>): T[] {
  const at = tabs.findIndex((tb) => tb.key === key);
  if (at === -1) return [...tabs];
  return tabs.filter((tb, i) => i <= at || !canCloseTab(tb, buffers, tabs.slice(0, at + 1)));
}

/** The buffer back to what is on disk. Same object when there is nothing to do,
 *  so a caller can hand it straight to setState. */
export function discardChanges<B extends IdeBufferLike>(buffers: Readonly<Record<string, B>>, rel: string): Readonly<Record<string, B>> {
  const buf = buffers[rel];
  if (!buf || !isDirty(buf)) return buffers;
  return { ...buffers, [rel]: { ...buf, content: buf.original } };
}

/** Without the buffers of `rel` and of everything under it. `src` takes
 *  `src/a.ts` and never `srcish.ts`. */
export function buffersAfterTrash<B>(buffers: Readonly<Record<string, B>>, rel: string): Record<string, B> {
  const out: Record<string, B> = {};
  for (const [k, v] of Object.entries(buffers)) if (k !== rel && !k.startsWith(`${rel}/`)) out[k] = v;
  return out;
}

/** Files with unsaved text and NO editor tab showing them. */
export function orphanDirtyRels(tabs: readonly IdeTabLike[], buffers: Readonly<Record<string, IdeBufferLike>>): string[] {
  const shown = new Set(tabs.filter((tb) => tb.mode === 'edit').map((tb) => tb.rel));
  return Object.keys(buffers).filter((rel) => isDirty(buffers[rel]) && !shown.has(rel));
}

/** How many files hold unsaved text. This is what main is told, so quitting
 *  can say so (finding 15). The text itself never leaves the renderer. */
export function dirtyCount(buffers: Readonly<Record<string, IdeBufferLike>>): number {
  return Object.values(buffers).filter(isDirty).length;
}

/**
 * Main's count of unsaved IDE files, per window. A class and not a bare Map so
 * that FORGETTING is part of it and is run under test: a window closed with
 * "Lose the changes" never speaks again (its panel is destroyed, not unmounted),
 * and on macOS the app outlives its last window, so the next quit asked about a
 * window that no longer existed. A reload loses the text the same way.
 */
export class IdeDirtyLedger {
  private readonly byWindow = new Map<number, number>();
  /** True when the count for this window CHANGED. */
  report(id: number, n: unknown): boolean {
    const count = typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
    if (this.get(id) === count) return false;
    if (count > 0) this.byWindow.set(id, count); else this.byWindow.delete(id);
    return true;
  }
  get(id: number): number { return this.byWindow.get(id) ?? 0; }
  forget(id: number): void { this.byWindow.delete(id); }
  total(): number { let sum = 0; for (const n of this.byWindow.values()) sum += n; return sum; }
}

/** What main asks before it lets unsaved IDE text be lost. Plain words, no
 *  dash, and the count, so a person knows how much they are about to drop. */
export function ideQuitWarning(unsaved: number): { message: string; detail: string } {
  const files = unsaved === 1 ? '1 file' : `${unsaved} files`;
  return {
    message: `${files} in the IDE ${unsaved === 1 ? 'has' : 'have'} unsaved changes.`,
    detail: 'Closing now loses them. Unsaved text is never stored. Go back and save with Command S, or discard the changes from the tab menu.'
  };
}

/** A file read answers later. If the project changed meanwhile, the answer
 *  belongs to a root that is no longer open, and agent worktrees of one repo
 *  share every relative path: B's package.json would land, clean, under A
 *  (finding 13). */
export function readStillWanted(askedUnder: string, currentRoot: string | null | undefined): boolean {
  return !!currentRoot && askedUnder === currentRoot;
}
