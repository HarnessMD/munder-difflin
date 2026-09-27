/**
 * ONE SEARCH (0.4.11, the IDE redesign the founder approved on 5 Sep 2026).
 *
 * The 0.4.9 IDE had two panes for two questions: NamePane found a FILE by its
 * name, SearchPane found a LINE inside files. The questions are still two,
 * and so are the answers (a name hit is a file, a text hit is a line, and the
 * row for one cannot show the other). What changes is who asks: one box, in
 * three places (the Search tab, the quick open in the top bar, the home tab),
 * and every one of them reads this hook, so the three can never disagree
 * about what is in the workspace.
 *
 * What is kept from the two panes, because each was a guarantee:
 *   the index      the tree is listed ONCE through the same `fs:listDir`
 *                  door the file tree uses (collectFiles), breadth first and
 *                  capped, and typing filters that array in memory. Debounced
 *                  by NAME_DEBOUNCE_MS only to spare React a long list per
 *                  keystroke.
 *   the contents   `window.cth.searchFiles`, the matcher in main, so `col`
 *                  and `length` are its and the highlight here and the
 *                  selection in the editor cannot disagree. It walks the
 *                  disk, so it is debounced by TEXT_DEBOUNCE_MS rather than
 *                  fired per keystroke, and a `run` bump (Enter) fires it at
 *                  once. Only the newest run may write a result.
 *   the ceilings   both are stated, never hidden: the index says when it
 *                  stopped early, the name list says when it is showing part
 *                  of what matched, and the contents result repeats main's
 *                  `truncated` instead of presenting five hundred hits as all.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SearchHit } from '../../../preload';
import { DEFAULT_NAME_LIMIT, collectFiles, matchNames, type FileIndex, type NameMatch } from '@shared/ideFileIndex';

/** Long enough that a fast typist filters once, short enough that it never
 *  feels like waiting. */
export const NAME_DEBOUNCE_MS = 120;
/** The contents search walks the disk, so it waits for the typing to settle. */
export const TEXT_DEBOUNCE_MS = 250;

export interface SearchOptions { caseSensitive: boolean; wholeWord: boolean; regex: boolean }
export const NO_OPTIONS: SearchOptions = { caseSensitive: false, wholeWord: false, regex: false };

/** A file whose name or folder matched, with where it matched so a row can mark it. */
export type NameHit = NameMatch;
/** A line that matched, with the matcher's own column and length. */
export type TextHit = SearchHit;

export interface WorkspaceSearch {
  names: NameHit[];
  /** How many files matched in total, including the ones past the limit. */
  namesTotal: number;
  /** True when `names` is shorter than `namesTotal`. */
  namesTruncated: boolean;
  /** True when a limit stopped the index walk: the index is a prefix of the tree. */
  indexTruncated: boolean;
  /** Files in the index, or null while it is still being read. */
  indexed: number | null;
  hits: TextHit[];
  /** Distinct files the hits fall in. */
  hitFiles: number;
  /** True when main stopped early and `hits` is the first part only. */
  hitsTruncated: boolean;
  filesScanned: number;
  status: 'idle' | 'indexing' | 'searching' | 'ready' | 'error';
  error?: string;
  /** Read the file list again (a file made outside the IDE is not in the index until then). */
  reindex: () => void;
}

type IndexState = { kind: 'building' } | { kind: 'ready'; index: FileIndex };
type TextState =
  | { kind: 'idle' }
  | { kind: 'searching' }
  | { kind: 'done'; hits: SearchHit[]; truncated: boolean; filesScanned: number }
  | { kind: 'error'; message: string };

export function useWorkspaceSearch(
  root: string,
  query: string,
  opts: SearchOptions = NO_OPTIONS,
  run = 0,
  nameLimit: number = DEFAULT_NAME_LIMIT
): WorkspaceSearch {
  const [index, setIndex] = useState<IndexState>({ kind: 'building' });
  /** What the name list is actually filtered by. Lags `query` by the debounce. */
  const [applied, setApplied] = useState('');
  const [text, setText] = useState<TextState>({ kind: 'idle' });
  const [rebuild, setRebuild] = useState(0);
  /** Only the newest contents search may write a result: a slow one that
   *  started first would otherwise land on top of a fast one that started later. */
  const runId = useRef(0);
  const lastRun = useRef(run);

  // The index: once per root, and again on demand.
  useEffect(() => {
    let alive = true;
    setIndex({ kind: 'building' });
    void collectFiles(async (rel) => {
      const res = await window.cth.listDir(root, rel);
      return res.ok ? { ok: true, entries: res.entries } : { ok: false, error: res.error };
    }).then((ix) => { if (alive) setIndex({ kind: 'ready', index: ix }); });
    return () => { alive = false; };
  }, [root, rebuild]);
  const reindex = useCallback(() => setRebuild((n) => n + 1), []);

  useEffect(() => {
    const id = window.setTimeout(() => setApplied(query), NAME_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [query]);

  const nameResults = useMemo(
    () => matchNames(index.kind === 'ready' ? index.index.entries : [], applied, nameLimit),
    [index, applied, nameLimit]
  );

  // The contents. A `run` bump (Enter) skips the debounce; a keystroke waits.
  const { caseSensitive, wholeWord, regex } = opts;
  useEffect(() => {
    const q = query.trim();
    const pressed = run !== lastRun.current;
    lastRun.current = run;
    if (!q) { runId.current++; setText({ kind: 'idle' }); return; }
    const delay = pressed ? 0 : TEXT_DEBOUNCE_MS;
    const id = window.setTimeout(() => {
      const mine = ++runId.current;
      setText({ kind: 'searching' });
      void window.cth.searchFiles(root, q, { caseSensitive, wholeWord, regex }).then((res) => {
        if (mine !== runId.current) return;
        if (!res.ok) { setText({ kind: 'error', message: res.error }); return; }
        setText({ kind: 'done', hits: res.hits, truncated: res.truncated, filesScanned: res.filesScanned });
      });
    }, delay);
    return () => window.clearTimeout(id);
  }, [root, query, caseSensitive, wholeWord, regex, run]);

  return useMemo<WorkspaceSearch>(() => {
    const hits = text.kind === 'done' ? text.hits : [];
    const hasQuery = query.trim().length > 0;
    const status: WorkspaceSearch['status'] = !hasQuery ? 'idle'
      : text.kind === 'error' ? 'error'
        : index.kind === 'building' ? 'indexing'
          : text.kind === 'done' ? 'ready'
            : 'searching';
    return {
      names: nameResults.matches,
      namesTotal: nameResults.total,
      namesTruncated: nameResults.truncated,
      indexTruncated: index.kind === 'ready' ? index.index.truncated : false,
      indexed: index.kind === 'ready' ? index.index.entries.length : null,
      hits,
      hitFiles: new Set(hits.map((h) => h.rel)).size,
      hitsTruncated: text.kind === 'done' ? text.truncated : false,
      filesScanned: text.kind === 'done' ? text.filesScanned : 0,
      status,
      error: text.kind === 'error' ? text.message : undefined,
      reindex
    };
  }, [nameResults, index, text, query, reindex]);
}
