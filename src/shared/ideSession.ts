/**
 * What the IDE remembers about a workspace between openings (0.5.3, bug 13).
 *
 * Until now it remembered nothing. `App.tsx` mounts the panel only while it is
 * open, and every tab, the active one and the side panel were component state,
 * so closing the IDE, or the app, threw the whole session away and the next
 * open was a blank home tab. Four cosmetic preferences were persisted and the
 * one thing a person would call "my IDE state" was not.
 *
 * A session is kept PER WORKSPACE ROOT, because a tab is a path relative to the
 * root it was opened under, and the same relative path in another project is a
 * different file.
 *
 * WHAT IS DELIBERATELY NOT KEPT:
 *   - unsaved edits. A buffer restored from storage can silently disagree with
 *     the file an agent rewrote while the IDE was shut. Instead the panel
 *     refuses to close over unsaved work, a dirty tab refuses to close, and
 *     quitting or closing the window ASKS first (main is told how many files
 *     are unsaved, never the text). What is NOT guarded, said plainly: a sign
 *     out and a licence that ends both unmount the panel, and a renderer reload
 *     in development does too. Unsaved text is lost there.
 *   - revision diffs. They are pinned to two commits and mean little later.
 *   - the home tab. It is what you get when nothing else is open.
 *
 * Pure: no React, no storage. The panel owns reading and writing the string.
 */

export type IdeSessionTabMode = 'edit' | 'diff' | 'image';
export type IdeSideTab = 'explorer' | 'search' | 'git';
export type IdeMdView = 'code' | 'split' | 'preview';

export interface IdeSessionTab { mode: IdeSessionTabMode; rel: string }
export interface IdeSession {
  tabs: IdeSessionTab[];
  /** Index into `tabs`, or -1 for none (the panel then shows its first tab). */
  active: number;
  sideTab: IdeSideTab;
  mdViews: Record<string, IdeMdView>;
}

export const IDE_SESSION_KEY = 'cth.ide.session::';
export const IDE_SESSION_MAX_TABS = 20;
const REL_MAX = 1024;

const MODES: readonly string[] = ['edit', 'diff', 'image'];
const SIDE_TABS: readonly string[] = ['explorer', 'search', 'git'];
const MD_VIEWS: readonly string[] = ['code', 'split', 'preview'];

export const EMPTY_IDE_SESSION: IdeSession = { tabs: [], active: -1, sideTab: 'explorer', mdViews: {} };

/** A path we are willing to hand back to the file reader: relative, inside the
 *  root, and of a sane length. Storage is writable by anything in the renderer,
 *  so what comes out of it is checked like any other input. */
export function isSafeRel(rel: unknown): rel is string {
  if (typeof rel !== 'string' || rel.length === 0 || rel.length > REL_MAX) return false;
  if (rel.startsWith('/') || rel.startsWith('\\') || /^[a-zA-Z]:/.test(rel) || rel.includes('\0')) return false;
  return !rel.split(/[\\/]/).some((part) => part === '..');
}

/** The panel's live tabs, reduced to what is worth keeping. */
export function toIdeSession(input: {
  tabs: ReadonlyArray<{ key: string; mode: string; rel: string }>;
  activeKey: string | null;
  sideTab: string;
  mdViews: Readonly<Record<string, string>>;
}): IdeSession {
  // One tab per file and mode, the rule parseIdeSession reads back by (finding
  // 24): written with a duplicate, the active index pointed at a tab the reader
  // then dropped, and the IDE reopened on another file. A duplicate that is the
  // ACTIVE tab hands that to its surviving twin.
  const first = new Map<string, string>();
  const unique = input.tabs.filter((tb) => {
    if (!MODES.includes(tb.mode) || !isSafeRel(tb.rel)) return false;
    const id = `${tb.mode}::${tb.rel}`;
    if (first.has(id)) return false;
    first.set(id, tb.key);
    return true;
  });
  const activeTab = input.tabs.find((tb) => tb.key === input.activeKey);
  const activeKey = activeTab ? first.get(`${activeTab.mode}::${activeTab.rel}`) ?? null : null;
  // Over the cap, keep the NEWEST, and always the active one (finding 17). Tabs
  // are appended as they open, so `slice(0, cap)` kept the oldest twenty and
  // dropped the file the person had just asked for.
  let kept = unique;
  if (unique.length > IDE_SESSION_MAX_TABS) {
    const tail = unique.slice(unique.length - IDE_SESSION_MAX_TABS);
    const active = unique.find((tb) => tb.key === activeKey);
    kept = !active || tail.includes(active) ? tail : [active, ...tail.slice(1)];
  }
  const tabs = kept.map((tb) => ({ mode: tb.mode as IdeSessionTabMode, rel: tb.rel }));
  const open = new Set(tabs.map((tb) => tb.rel));
  const mdViews: Record<string, IdeMdView> = {};
  for (const [rel, v] of Object.entries(input.mdViews)) {
    if (open.has(rel) && MD_VIEWS.includes(v)) mdViews[rel] = v as IdeMdView;
  }
  return {
    tabs,
    active: kept.findIndex((tb) => tb.key === activeKey),
    sideTab: SIDE_TABS.includes(input.sideTab) ? (input.sideTab as IdeSideTab) : 'explorer',
    mdViews
  };
}

/** Storage to a session. Anything unreadable or malformed is an empty session,
 *  never a throw: a bad string must not be able to stop the IDE opening. */
export function parseIdeSession(raw: string | null | undefined): IdeSession {
  if (!raw) return EMPTY_IDE_SESSION;
  let v: unknown;
  try { v = JSON.parse(raw); } catch { return EMPTY_IDE_SESSION; }
  if (!v || typeof v !== 'object') return EMPTY_IDE_SESSION;
  const o = v as { tabs?: unknown; active?: unknown; sideTab?: unknown; mdViews?: unknown };
  const seen = new Set<string>();
  const tabs: IdeSessionTab[] = [];
  // Where each stored tab ended up, so `active` can follow a tab that moved
  // because an earlier one was dropped.
  const landed: number[] = [];
  for (const tb of Array.isArray(o.tabs) ? o.tabs : []) {
    const t = (tb ?? {}) as { mode?: unknown; rel?: unknown };
    const key = `${String(t.mode)}::${String(t.rel)}`;
    const ok = typeof t.mode === 'string' && MODES.includes(t.mode) && isSafeRel(t.rel) && !seen.has(key) && tabs.length < IDE_SESSION_MAX_TABS;
    landed.push(ok ? tabs.length : -1);
    if (!ok) continue;
    seen.add(key);
    tabs.push({ mode: t.mode as IdeSessionTabMode, rel: t.rel as string });
  }
  const want = typeof o.active === 'number' && Number.isInteger(o.active) ? o.active : -1;
  const open = new Set(tabs.map((tb) => tb.rel));
  const mdViews: Record<string, IdeMdView> = {};
  if (o.mdViews && typeof o.mdViews === 'object') {
    for (const [rel, view] of Object.entries(o.mdViews as Record<string, unknown>)) {
      if (open.has(rel) && typeof view === 'string' && MD_VIEWS.includes(view)) mdViews[rel] = view as IdeMdView;
    }
  }
  return {
    tabs,
    active: want >= 0 && want < landed.length ? landed[want] : -1,
    sideTab: typeof o.sideTab === 'string' && SIDE_TABS.includes(o.sideTab) ? (o.sideTab as IdeSideTab) : 'explorer',
    mdViews
  };
}
