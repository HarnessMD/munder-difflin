import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { PixelBadge, labelKeyByStatus } from './PixelBadge';
import { PixelButton } from './PixelButton';
import { PtyTerminalView } from './PtyTerminalView';
import { terminalInstanceKey } from './terminalRecovery';
import { MessageQueueComposer, requestComposerFocus } from './MessageQueueComposer';
import { AgentControlStrip } from './AgentControlStrip';
import { CommandCenterPanel } from './CommandCenterPanel';
import { EditAgentModal } from './EditAgentModal';
import { Icon } from './Icon';
import { SpritePortrait } from './SpritePortrait';
import { PORTRAIT_W } from '@/scene/office/portraitArt';
import { RealtimeMichaelToggle } from './RealtimeMichaelToggle';
import { CostHud } from '@/realtime/CostHud';
import { useStore, type Agent } from '@/store/store';
import { useAgent } from '@/store/useAgent';
import { NotepadGlyph } from './agentRow/NotepadGlyph';
import { agentSliceHook } from '@/store/agentSlices';
import { ticketOf, useTaskLedger } from '@/store/taskLedger';
import { useLastActivityOf } from './pro/activityData';
import { EngineBadge } from './pro/Engine';
import { ENGINE_NAME } from '@shared/engine';
import { modelWord } from '@/store/config';
import { Ago } from './agentRow/Ago';
import { ContextGauge, contextPercent, percentColor, segmentsOf } from './agentRow/ContextGauge';
import { useAgentMenu } from './agentRow/AgentContextMenu';
import { usePtyParser } from '@/hooks/usePtyParser';
import { useRestoreTeam } from '@/hooks/useRestoreTeam';
import { useTerminalFontSize } from './terminalFontSize';
import { useHasTerminalDraft, disposeTerminal, reflowTerminal, notifyThemeChangeAll } from './terminalPool';
import { useAppTheme, toggleAppTheme } from '@/design/theme';
import type { HarnessConfig } from '@/store/config';
import { useRtl } from '@/i18n/useDirection';

/** Roster rail width. A fixed 232px is right on a 14" laptop but reads as a
 *  sliver on a 27" display, where names truncate for no reason — so it tracks
 *  the viewport between those two ends. */
const SIDEBAR_WIDTH = 'clamp(232px, 14vw, 340px)';
/** Remembers the roster collapse across fullscreen sessions and app restarts. */
const ROSTER_COLLAPSED_KEY = 'cth.fullscreen.rosterCollapsed';

/** Roster type scale, derived from the shared terminal zoom so Cmd +/- resizes
 *  the whole roster along with the terminal — one knob for the whole view
 *  instead of a size that only looked right on the display it was tuned on.
 *  Each is clamped: names are a pixel display face that turns to mush when it
 *  strays too far from its native size, and the bullets have to stay subordinate
 *  to the name however far the terminal is zoomed. */
function rosterScale(zoom: number) {
  const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(n)));
  // The portrait is sized in SPRITE steps, not free pixels. The art is an 18×28
  // pixel stamp: widening the tile alone just pads it (which is what the old
  // `clamp(zoom * 1.2, 18, 40)` did past 18px — a bigger frame around the same
  // small figure), and a scale like 1.37× renders some pixel rows one device
  // pixel tall and others two. Half-steps double every other row cleanly, so
  // that is the grid the size moves on. Floor is 1.5× — 1× was too small to
  // tell two hires apart at a glance, which is the tile's whole job.
  const portraitScale = Math.min(2.5, Math.max(1.5, Math.round(zoom * 0.11 * 2) / 2));
  return {
    name: clamp(zoom * 0.48, 7, 14),
    group: clamp(zoom * 0.45, 7, 13),
    note: clamp(zoom * 0.68, 10, 20),
    portraitScale,
    portrait: Math.round(PORTRAIT_W * portraitScale)
  };
}

function basename(path: string): string {
  // Split on BOTH separators: `git:mainRepo` hands back whatever the platform
  // uses, and a Windows `C:\work\repo` contains no '/' at all — so a '/'-only
  // split returned the whole absolute path as the group's "name".
  return path.split(/[\\/]/).filter(Boolean).pop() ?? path;
}

/** cwd → main-repo basename, resolved once per path and shared by every mount.
 *  An isolated agent's cwd is its own git worktree (`…/worktrees/<agent-id>`),
 *  so naming the group after that path buckets each such agent under its own id
 *  instead of the repository the user actually picked. `git:mainRepo` follows a
 *  linked worktree back to its main checkout. */
const repoRootByCwd = new Map<string, string | null>();
/** cwds with a lookup in flight, so a re-render can't start a second one. */
const repoLookupsInFlight = new Set<string>();

/** Which repository an agent belongs to — the ABSOLUTE root, so it is a real
 *  identity. Two unrelated checkouts can share a basename (`~/client-a/app` and
 *  `~/client-b/app`); keying groups on the name merged them into one section and
 *  let agents be dragged between two different repositories.
 *
 *  Falls back to the cwd itself until the async resolution lands, and for
 *  directories that aren't git repos at all. */
/** What the roster itself needs of an agent to group and order it (0.5.3,
 *  F25 groundwork, Pam's audit): the rows read their own records. */
type RosterAgent = Pick<Agent, 'id' | 'isGod' | 'cwd' | 'project' | 'name' | 'ptyId'>;
const useRosterAgents = agentSliceHook(['isGod', 'cwd', 'project', 'name', 'ptyId'] as const);
function repoKeyOf(agent: RosterAgent): string {
  return repoRootByCwd.get(agent.cwd) || agent.cwd || 'unknown';
}

/** What that group is CALLED — the basename, or the project the user picked. */
function repoLabelOf(agent: RosterAgent): string {
  const root = repoRootByCwd.get(agent.cwd);
  if (root) return basename(root);
  const project = agent.project?.trim();
  if (project) return project;
  return basename(agent.cwd) || 'unknown';
}

/** Resolve every distinct cwd's repository root, then re-render. Exactly one git
 *  call per distinct path, ever. */
function useResolvedRepoNames(agents: readonly RosterAgent[]): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const pending = [...new Set(agents.map(a => a.cwd).filter(Boolean))]
      // `has` (not a truthiness check) so a resolved-to-null path — a cwd that
      // is not a git repo — counts as answered. Caching only successes meant
      // every agent outside a repo re-asked on each pass, and this effect
      // depends on `agents`, which the pty parser replaces on every chunk of
      // terminal output: one such agent spawned `git rev-parse` continuously
      // for as long as it was talking. In-flight paths are skipped too, so a
      // re-render mid-lookup doesn't stack a second round of subprocesses.
      .filter(cwd => !repoRootByCwd.has(cwd) && !repoLookupsInFlight.has(cwd));
    if (pending.length === 0) return;
    pending.forEach(cwd => repoLookupsInFlight.add(cwd));
    void Promise.all(pending.map(async (cwd) => {
      try {
        repoRootByCwd.set(cwd, (await window.cth.gitMainRepo(cwd)) || null);
      } catch {
        // Record the failure as answered as well — retrying a path that throws
        // is what the unbounded-subprocess bug was made of.
        repoRootByCwd.set(cwd, null);
      } finally {
        repoLookupsInFlight.delete(cwd);
      }
    })).then(() => { if (!cancelled) setVersion(v => v + 1); });
    return () => { cancelled = true; };
  }, [agents]);
  return version;
}

/** The roster section an agent lives in — god agents share one ungrouped
 *  section, everyone else groups by repository. */
function groupKey(agent: RosterAgent): string {
  return agent.isGod ? '__god__' : repoKeyOf(agent);
}

/** Drag-reorder wiring handed down to each row. */
interface RowDrag {
  start: (id: string) => void;
  over: (id: string) => void;
  leave: (id: string) => void;
  drop: (id: string) => void;
  end: () => void;
}

export interface FullscreenTerminalProps {
  /** Only needed to rebuild a spawn command for a restorable agent saved before
   *  the `command` field existed — same role as in AgentStrip. */
  config?: HarnessConfig | null;
}

export function FullscreenTerminal({ config }: FullscreenTerminalProps) {
  const { t } = useTranslation();
  // The roster lists by five fields; a pty chunk never renders it. The
  // focused agent is read whole, by id, for the terminal and the header.
  const agents = useRosterAgents();
  const restorableAgents = useStore(s => s.restorableAgents);
  const fullscreenAgentId = useStore(s => s.fullscreenAgentId);
  const setFullscreen = useStore(s => s.setFullscreen);
  const select = useStore(s => s.select);
  const setAddAgentOpen = useStore(s => s.setAddAgentOpen);
  const addAgentOpen = useStore(s => s.addAgentOpen);
  // Owned HERE, not in Header, purely so the Esc handler below can see it:
  // Esc closing the dialog must not also throw you out of focus mode.
  const [editAgentOpen, setEditAgentOpen] = useState(false);
  const updateAgent = useStore(s => s.updateAgent);
  // The floor strip (and with it the restore button) is hidden behind the
  // overlay, so the roster carries restore too.
  const { restoring, autoRestoring, restoreTeam } = useRestoreTeam(config);
  const appThemeNow = useAppTheme();

  const agent = useAgent(fullscreenAgentId ?? '');
  const parser = usePtyParser(agent?.id ?? '__none__');

  const repoVersion = useResolvedRepoNames(agents);
  const scale = rosterScale(useTerminalFontSize());

  // Drag-to-reorder, same as the floor strip (native HTML5 DnD, no dep). A plain
  // click still selects — a drag only starts on movement. Drops are confined to
  // the dragged agent's OWN group: the repo header comes from its cwd, so a
  // cross-group drop would reorder the array and then snap the row straight back
  // under its own header, which just reads as "reordering is broken".
  const reorderAgents = useStore(s => s.reorderAgents);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  // Roster collapse. Persisted because it is a working preference, not a mode:
  // someone who hides the rail to read wide terminal output wants it still hidden
  // the next time they go fullscreen, not to re-hide it every single time.
  const [rosterCollapsed, setRosterCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(ROSTER_COLLAPSED_KEY) === '1'; } catch { return false; }
  });
  const toggleRoster = (): void => {
    setRosterCollapsed((v) => {
      const next = !v;
      try { localStorage.setItem(ROSTER_COLLAPSED_KEY, next ? '1' : '0'); } catch { /* private mode */ }
      return next;
    });
  };
  // One function each for the life of the screen (the rows are memoised):
  // the drop reads the dragged id off a ref rather than closing over state.
  const dragIdRef = useRef<string | null>(null);
  dragIdRef.current = dragId;
  const agentsRef = useRef(agents);
  agentsRef.current = agents;
  const drag = useMemo<RowDrag>(() => ({
    start: (id) => setDragId(id),
    over: (id) => setOverId((prev) => (prev === id ? prev : id)),
    leave: (id) => setOverId((prev) => (prev === id ? null : prev)),
    drop: (id) => {
      const dragging = dragIdRef.current;
      if (dragging && dragging !== id) {
        const from = agentsRef.current.find(a => a.id === dragging);
        const to = agentsRef.current.find(a => a.id === id);
        if (from && to && groupKey(from) === groupKey(to)) reorderAgents(dragging, id);
      }
      setDragId(null);
      setOverId(null);
    },
    end: () => { setDragId(null); setOverId(null); }
  }), [reorderAgents]);
  // Open, Message, Rename, Add or Edit note from the right click menu (0.5.3,
  // F25). Rename and note are requests the row answers: a counter per id.
  const openAgent = useCallback((id: string) => { select(id); setFullscreen(id); }, [select, setFullscreen]);
  const [renameReq, setRenameReq] = useState<{ id: string; n: number }>({ id: '', n: 0 });
  const [noteReq, setNoteReq] = useState<{ id: string; n: number }>({ id: '', n: 0 });
  const menu = useAgentMenu({
    onOpen: openAgent,
    onMessage: (id) => { openAgent(id); requestComposerFocus(id); },
    onRename: (id) => setRenameReq((r) => ({ id, n: r.n + 1 })),
    onEditNote: (id) => setNoteReq((r) => ({ id, n: r.n + 1 }))
  });
  const rowFor = (a: RosterAgent) => (
    <SidebarRow
      key={a.id}
      id={a.id}
      active={a.id === agent?.id}
      dragging={dragId === a.id}
      over={overId === a.id && !!dragId && dragId !== a.id}
      dragActive={!!dragId}
      onOpen={openAgent}
      onContextMenu={menu.open}
      renameRequest={renameReq.id === a.id ? renameReq.n : 0}
      noteRequest={noteReq.id === a.id ? noteReq.n : 0}
      drag={drag}
      scale={scale}
    />
  );
  // Roster: god agents first and ungrouped, everyone else bucketed by repo.
  // Insertion order is preserved inside each bucket (it's the user's own
  // drag-reorder from the floor strip) and buckets appear in first-seen order,
  // so the list doesn't reshuffle as statuses change.
  const { gods, groups } = useMemo(() => {
    const godList: RosterAgent[] = [];
    // Keyed by absolute repo root (identity); the label is carried alongside so
    // two same-named repos stay two groups but still read by name.
    const byRepo = new Map<string, { label: string; members: RosterAgent[] }>();
    for (const a of agents) {
      if (a.isGod) { godList.push(a); continue; }
      const key = repoKeyOf(a);
      const bucket = byRepo.get(key);
      if (bucket) bucket.members.push(a);
      else byRepo.set(key, { label: repoLabelOf(a), members: [a] });
    }
    return { gods: godList, groups: [...byRepo.entries()] };
    // repoVersion: rebucket once the async main-repo lookups land.
  }, [agents, repoVersion]);

  // Focus mode: adding (or removing) an agent changes the layout around the
  // focused terminal, but nothing re-fits it, so the grid stays wrong until the
  // user switches agent and back (a remount, hence a fresh fit). Re-fit on
  // every roster change. reflowTerminal only pokes the pty when cols/rows
  // actually moved and never scrolls, so a no-op roster change costs nothing.
  // Two passes: one after layout settles, one after the roster row has painted.
  const rosterKey = agents.map(a => a.id).join('\n');
  const focusedPtyId = agent?.ptyId;
  useEffect(() => {
    if (!focusedPtyId) return;
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => reflowTerminal(focusedPtyId)));
    const late = setTimeout(() => reflowTerminal(focusedPtyId), 240);
    return () => { cancelAnimationFrame(raf); clearTimeout(late); };
  }, [rosterKey, focusedPtyId]);

  // Esc exits fullscreen
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // A modal above fullscreen owns the interaction until it closes. Without
        // this guard, Esc from the Add Agent form unexpectedly exits fullscreen.
        if (addAgentOpen || editAgentOpen) return;
        e.preventDefault();
        setFullscreen(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [addAgentOpen, editAgentOpen, setFullscreen]);

  // Focus mode is pointing at something we cannot render. Re-home to another live
  // agent rather than dropping the user out; leave only when nothing is left.
  // In an effect, not in render: setState during render is a React anti-pattern,
  // and hard-nulling here defeated the store's re-homing the same way onKill did.
  // `refocusFullscreen`, NOT `setFullscreen`: this is the app following the user,
  // not the user telling the app what they want. Going through the explicit
  // toggle here wrote `prefersFocusMode = false` every time an agent went away,
  // which is the same "fix the store, then overwrite it from a call site" trap
  // that broke closing an agent in focus mode.
  useEffect(() => {
    if (agent && agent.ptyId) return;
    const s = useStore.getState();
    const next = s.agents.find((a) => a.id !== agent?.id && a.ptyId);
    s.refocusFullscreen(next?.id ?? null);
  }, [agent]);

  if (!agent || !agent.ptyId) return null;

  // No kill button here on purpose. Killing an agent is a destructive action
  // that belongs with the rest of its lifecycle controls in the docked panel;
  // sitting inches from the tab you click to switch agents, it was only ever a
  // mis-click waiting to happen. Exiting fullscreen is likewise already covered
  // twice over (Esc, and the terminal toolbar's own fullscreen toggle).
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'var(--cth-cream-100)',
      zIndex: 250,
      display: 'flex',
      flexDirection: 'column',
      paddingTop: 36  // leave room for macOS traffic lights / drag region
    }}>
      {/* Title bar drag region (so the user can still move the window) */}
      <div
        className="cth-titlebar-drag"
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 36,
          background: 'linear-gradient(180deg, var(--cth-cream-100) 0%, var(--cth-cream-200) 100%)',
          borderBottom: '1px solid var(--cth-ink-300)',
          display: 'flex', alignItems: 'center',
          paddingLeft: 96, paddingRight: 12, gap: 12,
          userSelect: 'none'
        }}
      >
        <span style={{
          fontFamily: 'var(--cth-font-display)', fontSize: 12, lineHeight: '20px',
          color: 'var(--cth-ink-900)'
        }}>MUNDER DIFFLIN · FOCUS MODE</span>
        {/* Same top-right controls as the main title bar — fullscreen covers
            it, so theme / exit-fullscreen / IDE must live here too. */}
        <div className="cth-titlebar-nodrag" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={toggleRoster}
            title={rosterCollapsed ? t('fullscreenTerminal.showAgentList') : t('fullscreenTerminal.hideAgentList')}
            aria-label={rosterCollapsed ? t('fullscreenTerminal.showAgentList') : t('fullscreenTerminal.hideAgentList')}
            aria-pressed={rosterCollapsed}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, padding: 0,
              // Pressed-in when collapsed, so the rail's absence reads as a state
              // this button is holding rather than something that broke.
              background: rosterCollapsed ? 'var(--cth-lemon)' : 'var(--cth-paper-100)',
              boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)',
              border: 'none', borderRadius: 'var(--cth-radius-md, 2px)', cursor: 'pointer',
              color: rosterCollapsed ? 'var(--cth-ink-900)' : 'var(--cth-ink-900)'
            }}
          >
            <Icon name="sidebar" size={1} style={{ width: 16, height: 16 }} />
          </button>
          <button
            onClick={() => {
              const next = toggleAppTheme();
              void window.cth.updateConfig({ terminalTheme: next });
              // Focus mode has its OWN theme button, so notifying only from the
              // title-bar toggle meant a flip made from in here never reached a
              // running TUI. Both entry points must tell them.
              notifyThemeChangeAll(next === 'dark' ? 'dark' : 'light');
            }}
            title={appThemeNow === 'dark' ? t('fullscreenTerminal.lightTheme') : t('fullscreenTerminal.darkTheme')}
            aria-label={t('fullscreenTerminal.toggleTheme')}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, padding: 0,
              background: 'var(--cth-paper-100)',
              boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)',
              border: 'none', borderRadius: 'var(--cth-radius-md, 2px)', cursor: 'pointer',
              color: 'var(--cth-ink-900)', fontSize: 13, lineHeight: 1
            }}
          >
            {appThemeNow === 'dark' ? '☀' : '☾'}
          </button>
          {/* Settings — the main title bar has it, so fullscreen must too:
              anything reachable in one mode and not the other is a trap. Uses
              App's existing `cth:open-settings` event rather than a new store
              action, because this overlay is not a child of App. */}
          <button
            className="cth-settings-btn"
            onClick={() => window.dispatchEvent(new CustomEvent('cth:open-settings'))}
            title="Settings"
            aria-label="Settings"
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, padding: 0,
              background: 'var(--cth-paper-100)',
              boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)',
              border: 'none', borderRadius: 'var(--cth-radius-md, 2px)', cursor: 'pointer',
              color: 'var(--cth-ink-900)'
            }}
          >
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={2}
              strokeLinecap="round" strokeLinejoin="round"
              aria-hidden="true" focusable="false"
            >
              <path d="M15.5 3.5a5 5 0 0 0-6.1 6.1l-5.6 5.6a2.3 2.3 0 1 0 3.2 3.2l5.6-5.6a5 5 0 0 0 6.1-6.1l-3 3-2.2-.6-.6-2.2z" />
            </svg>
          </button>
          <button
            onClick={() => setFullscreen(null)}
            title={t('fullscreenTerminal.exitFullscreen')}
            aria-label={t('fullscreenTerminal.exitFullscreen')}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, padding: 0,
              background: 'var(--cth-paper-100)',
              boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)',
              border: 'none', borderRadius: 'var(--cth-radius-md, 2px)', cursor: 'pointer',
              color: 'var(--cth-ink-900)'
            }}
          >
            <Icon name="minimize" size={1} style={{ width: 16, height: 16 }} />
          </button>
          {/* v0.3.4: IDE moved to agent level — it lives in each agent's
              header (see Header below), not in this global bar. */}
        </div>
      </div>

      {/* Body — roster on the left, the focused agent's terminal on the right.
          A vertical list scales past the handful of agents a horizontal tab bar
          could show, and grouping by repository is how the user actually thinks
          about the fleet. */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        {/* Unmounted rather than width:0 when collapsed — the roster renders a row
            per agent with live status, and keeping a hidden copy mounted would go
            on doing that work for a rail nobody can see. Remounting is cheap; the
            terminals live in the pool and are untouched by this. */}
        {!rosterCollapsed && (
        <aside style={{
          width: SIDEBAR_WIDTH, flexShrink: 0,
          display: 'flex', flexDirection: 'column',
          background: 'var(--cth-cream-200)',
          borderRight: '1px solid var(--cth-ink-300)'
        }}>
          <div style={{ padding: 8, borderBottom: '1px solid var(--cth-ink-300)' }}>
            <button
              onClick={() => setAddAgentOpen(true)}
              title={t('fullscreenTerminal.addAgent')}
              style={{
                width: '100%', height: 32,
                background: 'var(--cth-cream-100)',
                border: 'none',
                boxShadow: 'inset 0 0 0 1px var(--cth-ink-100)',
                fontFamily: 'var(--cth-font-ui)',
                fontSize: 'clamp(14px, 0.7vw, 15px)',
                color: 'var(--cth-ink-900)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                cursor: 'pointer'
              }}
            >
              <Icon name="plus" /> {t('agentStrip.addAgent')}
            </button>
          </div>

          {menu.element}
          <div className="cth-scroll-hidden" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '6px 0' }}>
            {/* The god agent runs the floor rather than a checkout, so it gets no
                repository header — it sits alone at the top of the roster. */}
            {gods.map(rowFor)}
            {groups.map(([repoKey, { label, members }]) => (
              // Repos are the roster's real structure, so they get real
              // separation — a hairline plus air above, not just a label.
              <div key={repoKey} style={{ marginTop: 16, paddingTop: 10, borderTop: '1px solid var(--cth-ink-300)' }}>
                <div
                  title={repoKey}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '0 10px 6px',
                    fontFamily: 'var(--cth-font-display)',
                    fontSize: scale.group, lineHeight: 1.5,
                    color: 'var(--cth-ink-500)'
                  }}
                >
                  {/* Native 16px, never a fraction of it: this is pixel art on
                      a 16-unit grid, so squeezing it to match a 7px label
                      merged the outline into mush. Dimmed instead of shrunk. */}
                  <span style={{ flexShrink: 0, display: 'inline-flex', opacity: 0.7 }}>
                    <Icon name="folder" size={scale.group >= 13 ? 2 : 1} />
                  </span>
                  <span style={{
                    minWidth: 0,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                  }}>{label.toUpperCase()}</span>
                </div>
                {members.map(rowFor)}
              </div>
            ))}
          </div>

          {/* Last session's team, same as the floor strip — pinned to the bottom
              so it can't be scrolled out of reach behind a long roster. */}
          {(restorableAgents.length > 0 || autoRestoring) && (
            <div style={{
              flexShrink: 0, padding: 8, display: 'flex', flexDirection: 'column', gap: 6,
              borderTop: '1px solid var(--cth-ink-300)'
            }}>
              {autoRestoring && (
                // Same banner as the floor strip: terminals that open by
                // themselves need to say why.
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '4px 8px',
                  fontFamily: 'var(--cth-font-ui)', fontSize: 11,
                  color: 'var(--cth-ink-900)',
                  background: 'var(--cth-status-working)',
                  boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)'
                }}>
                  <Icon name="play" /> restoring your team…
                </div>
              )}
              {!autoRestoring && restorableAgents.length > 0 && (
                <PixelButton
                  variant="primary"
                  size="sm"
                  onClick={restoreTeam}
                  disabled={restoring}
                  style={{ width: '100%' }}
                  title={t('fullscreenTerminal.respawnTitle', { names: restorableAgents.map((a: Agent) => a.name).join(', ') })}
                >
                  <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                    <Icon name="play" /> {restoring ? t('agentStrip.restoringTeam') : t('agentStrip.restoreTeam', { count: restorableAgents.length })}
                  </span>
                </PixelButton>
              )}
              {!autoRestoring && restorableAgents.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {restorableAgents.map((a: Agent) => (
                    <span
                      key={a.id}
                      title={`${a.name} — restorable from last session`}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 2,
                        height: 20, padding: '0 2px 0 6px',
                        fontFamily: 'var(--cth-font-ui)', fontSize: 11,
                        color: 'var(--cth-ink-700)', background: 'var(--cth-paper-100)',
                        boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)'
                      }}
                    >
                      {a.name}
                      <button
                        onClick={() => useStore.getState().removeRestorableAgent(a.id)}
                        title={`Dismiss ${a.name} — remove permanently from the restore list`}
                        aria-label={`Dismiss ${a.name}`}
                        style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: 14, height: 14, padding: 0, lineHeight: 1,
                          fontFamily: 'var(--cth-font-ui)', fontSize: 11,
                          color: 'var(--cth-ink-500)', background: 'transparent',
                          border: 'none', cursor: 'pointer'
                        }}
                      >✕</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </aside>
        )}

        <div style={{
          flex: 1, minWidth: 0, minHeight: 0,
          display: 'flex', flexDirection: 'column',
          padding: 12, gap: 10
        }}>
          {agent.isGod ? (
            // Michael runs the floor from the command center — its tabs (tasks,
            // ask me, triggers, memory, graph…) are the whole point of selecting
            // him, and fullscreen used to drop them for a bare terminal.
            // Column so the panel's `height: 100%` resolves against a definite
            // height and `align-items: stretch` gives it the full width.
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <CommandCenterPanel agent={agent} fullscreen />
            </div>
          ) : (
            <>
              <Header agent={agent} onEdit={() => setEditAgentOpen(true)} />
              {editAgentOpen && (
                <EditAgentModal agent={agent} onClose={() => setEditAgentOpen(false)} />
              )}

              {/* #7C — pause / halt / steer. These only existed in the docked
                  sidebar, so going fullscreen took the operator controls away. */}
              <AgentControlStrip key={agent.id} agentId={agent.id} />

              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
                  <PtyTerminalView
                    key={terminalInstanceKey(agent.ptyId, agent.terminalGeneration)}
                    ptyId={agent.ptyId}
                    provider={agent.provider}
                    onStreamData={parser}
                    onUserPrompt={(t) => {
                      updateAgent(agent.id, { lastPrompt: t });
                      if (t.trim().toLowerCase() === '/clear') {
                        updateAgent(agent.id, { contextTokens: 0, contextLimit: undefined, progress: 0 });
                      }
                      void window.cth.historyAdd({ agentId: agent.id, cwd: agent.cwd, text: t });
                    }}
                    onToggleFullscreen={() => setFullscreen(null)}
                    fullscreen
                  />
                </div>
                <MessageQueueComposer agent={agent} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** THE ROSTER ROW, 0.5.3 (Pam's Classic cards, hive/shared/design/sidebar-free/
 *  final, card 1). Line 1: the name in the display face, BOSS, 1:1, the status
 *  chip. Line 2: the engine tile, the model, the context percent. Line 3: the
 *  eight segment gauge. Line 4: the ticket id and title. Line 5: the live
 *  action with its age. A CRASHED strip when the process died. Then the note,
 *  a paper block with the notepad glyph and one bullet per line, which opens
 *  the editor beside the row; a row with no note shows the add control on
 *  hover only.
 *
 *  Memoised and its own subscriber: it takes an id and reads the agent
 *  through `useAgent`, so a hook event on another agent never reaches this
 *  function; the ticket comes from the shared ledger and the age from the
 *  activity digest, each by id. */
export const SidebarRow = memo(function SidebarRow({
  id,
  active,
  dragging,
  over,
  dragActive,
  onOpen,
  onContextMenu,
  renameRequest,
  noteRequest,
  drag,
  scale
}: {
  id: string;
  active: boolean;
  dragging: boolean;
  over: boolean;
  dragActive: boolean;
  onOpen: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
  /** A counter; a new value opens the name editor (the menu's Rename). */
  renameRequest: number;
  /** A counter; a new value opens the note editor (the menu's note item). */
  noteRequest: number;
  drag: RowDrag;
  scale: ReturnType<typeof rosterScale>;
}) {
  const { t } = useTranslation();
  const rtl = useRtl();
  const agent = useAgent(id);
  const setAgentNote = useStore(s => s.setAgentNote);
  const renameAgent = useStore(s => s.renameAgent);
  const openTaskDetail = useStore(s => s.openTaskDetail);
  const { tasks } = useTaskLedger(10_000);
  const last = useLastActivityOf(id);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const noteRef = useRef<HTMLDivElement>(null);
  const [notePosition, setNotePosition] = useState<{ left: number; top: number } | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState('');

  // The editor rides the terminal's zoom, capped — it's a short note, not a
  // reading pane, and following the terminal all the way up turned it into a
  // banner wider than the roster itself.
  const noteFontSize = Math.min(useTerminalFontSize(), 14);
  const noteLabelSize = Math.max(8, Math.round(noteFontSize * 0.6));
  const noteWidth = Math.min(300, Math.round(noteFontSize * 20));
  const noteHeight = Math.round(noteFontSize * 9);
  const popoverHeight = noteHeight + noteLabelSize * 2 + 40;

  const typing = useHasTerminalDraft(agent?.ptyId);

  /** The ✎ button opens the editor beside the row — the bullets on the row are
   *  the summary, this is where you write them. EXPLICIT open only (v0.3.4). */
  const toggleEditor = useCallback(() => {
    if (notePosition) { setNotePosition(null); return; }
    if (dragActive) return;
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    setNotePosition({
      left: Math.min(rect.right + 6, window.innerWidth - noteWidth - 8),
      top: Math.max(8, Math.min(rect.top, window.innerHeight - popoverHeight - 8))
    });
  }, [notePosition, dragActive, noteWidth, popoverHeight]);
  // The menu's requests: each new count is one open.
  const seenNote = useRef(noteRequest);
  useEffect(() => {
    if (noteRequest === seenNote.current) return;
    seenNote.current = noteRequest;
    if (!notePosition) toggleEditor();
  }, [noteRequest, notePosition, toggleEditor]);
  const seenRename = useRef(renameRequest);
  const name = agent?.name ?? '';
  useEffect(() => {
    if (renameRequest === seenRename.current) return;
    seenRename.current = renameRequest;
    setDraft(name);
    setRenaming(true);
  }, [renameRequest, name]);

  if (!agent) return null;
  const bullets = (agent.note ?? '').split('\n').map(x => x.trim()).filter(Boolean);
  const pct = contextPercent(agent.contextTokens, agent.contextLimit);
  const segments = pct !== null ? segmentsOf(pct) : Math.min(8, Math.max(0, agent.progress ?? 0));
  const word = modelWord(agent.provider, agent.model) ?? t('fullscreenTerminal.cliDefault');
  const ticket = ticketOf(tasks, agent.id);
  const crashed = agent.exit?.verdict === 'crashed';
  const metaSize = Math.max(9, scale.name - 3);
  // What the agent says it is doing, else its status word: a waiting agent
  // with nothing to say is waiting, not idle (Pam's review of #36).
  const liveText = agent.action || t(labelKeyByStatus[agent.status]);
  /** The add control for a row with no note: only while the row is hovered
   *  (global.css), so a control with nothing to edit never floats as a stray
   *  mark. The orchestrator has no note control, as before. */
  const noteAdd = !agent.isGod && bullets.length === 0 ? (
    <span
      data-note-add={agent.id}
      data-open={notePosition ? '' : undefined}
      role="button"
      tabIndex={0}
      onClick={(e) => { e.stopPropagation(); toggleEditor(); }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); toggleEditor(); }
      }}
      title={t('agentCard.addNote')}
      aria-label={t('agentCard.editNoteAria', { name: agent.name })}
      style={{ flexShrink: 0, display: 'inline-flex', color: 'var(--cth-ink-500)', cursor: 'pointer' }}
    ><NotepadGlyph size={Math.max(10, metaSize)} /></span>
  ) : null;
  const commitRename = async () => {
    const next = draft.trim();
    setRenaming(false);
    if (!next || next === agent.name) return;
    await renameAgent(agent.id, next).catch(() => ({ ok: false }));
  };

  return (
    <>
      <button
        ref={buttonRef}
        draggable
        data-roster-row={agent.id}
        onDragStart={(e) => { drag.start(agent.id); e.dataTransfer.effectAllowed = 'move'; }}
        onDragOver={(e) => {
          if (!dragActive || dragging) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          drag.over(agent.id);
        }}
        onDragLeave={() => drag.leave(agent.id)}
        onDrop={(e) => { e.preventDefault(); drag.drop(agent.id); }}
        onDragEnd={drag.end}
        onClick={() => onOpen(agent.id)}
        onContextMenu={(e) => onContextMenu(e, agent.id)}
        aria-label={`${agent.name} · ${agent.project}`}
        aria-current={active ? 'true' : undefined}
        style={{
          width: '100%',
          padding: '6px 8px',
          background: active ? 'var(--cth-cream-100)' : 'transparent',
          border: 'none',
          boxShadow: active
            ? 'inset 3px 0 0 var(--cth-ink-900), inset 0 0 0 1px var(--cth-ink-100)'
            // Insertion cue on the hovered drop target.
            : over ? 'inset 0 2px 0 var(--cth-ink-900)' : 'none',
          opacity: dragging ? 0.4 : 1,
          display: 'flex', alignItems: 'flex-start', gap: 8,
          cursor: dragActive ? 'grabbing' : 'grab',
          position: 'relative',
          textAlign: 'left',
          fontFamily: 'var(--cth-font-ui)', fontSize: 13,
          color: 'var(--cth-ink-900)',
          transition: 'opacity 120ms ease'
        }}
      >
        <div style={{
          width: scale.portrait, height: Math.round(scale.portrait * 1.3), flexShrink: 0,
          background: `var(--cth-${agent.accent}-light)`,
          boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)',
          // Anchor the sprite's TOP: the portrait is taller than this tile, and
          // bottom-anchoring cropped the head — crop feet, not face (v0.3.4).
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          overflow: 'hidden'
        }}>
          <SpritePortrait character={agent.character} scale={scale.portraitScale} description={agent.description} isGod={agent.isGod} />
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Line 1: name, BOSS, 1:1, the status chip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            {renaming ? (
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onBlur={() => { void commitRename(); }}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter') void commitRename();
                  if (e.key === 'Escape') setRenaming(false);
                }}
                aria-label={t('agentMenu.rename')}
                style={{
                  flex: 1, minWidth: 0, height: 20, padding: '1px 4px', boxSizing: 'border-box',
                  border: 'none', outline: 'none', background: 'var(--cth-paper-100)',
                  boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)',
                  fontFamily: 'var(--cth-font-display)', fontSize: scale.name, color: 'var(--cth-ink-900)', textTransform: 'uppercase'
                }}
              />
            ) : (
              <span style={{
                flex: 1, minWidth: 0,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                fontFamily: 'var(--cth-font-display)',
                fontSize: scale.name, lineHeight: 1.5
              }}>{agent.name.toUpperCase()}</span>
            )}
            {agent.isGod && (
              <span data-boss style={{
                fontFamily: 'var(--cth-font-display)', fontSize: 7, lineHeight: '11px',
                background: 'var(--cth-lemon)', color: 'var(--cth-ink-900)', padding: '1px 4px 0', flexShrink: 0
              }}>{t('agentCard.boss')}</span>
            )}
            {agent.onHold && (
              <span data-hold title={t('agentRow.oneOnOne')} style={{
                fontSize: 9, lineHeight: '12px', padding: '0 4px', flexShrink: 0,
                background: 'var(--cth-cream-100)', boxShadow: 'inset 0 0 0 1px var(--cth-ink-100)', color: 'var(--cth-ink-500)'
              }}>1:1</span>
            )}
            {/* Your unsent text outranks the agent's own state here: an idle
                agent with a draft on its prompt is not idle-and-free, it is
                idle-and-held, and nothing else on screen said so. */}
            <PixelBadge status={typing ? 'typing' : agent.status} />
          </div>
          {/* Line 2: engine, model, percent */}
          <div data-engine-line style={{
            display: 'flex', alignItems: 'center', gap: 6, minWidth: 0,
            fontSize: metaSize, lineHeight: 1.4, color: 'var(--cth-ink-500)'
          }}>
            <EngineBadge provider={agent.provider} size={13} title={`${ENGINE_NAME[agent.provider ?? 'claude']} · ${word}`} />
            <span
              style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              title={agent.model ? t('fullscreenTerminal.modelTitle', { model: agent.model }) : t('fullscreenTerminal.cliDefault')}
            >{word}</span>
            {pct !== null
              ? <span data-context-pct title={t('agentRow.contextTitle', { pct })} style={{ flexShrink: 0, fontVariantNumeric: 'tabular-nums', fontWeight: 500, color: percentColor(pct) }}>{pct}%</span>
              : <span style={{ flexShrink: 0, opacity: 0.7 }}>{t('agentRow.noSession')}</span>}
          </div>
          {/* Line 3: the gauge, only with a session */}
          {pct !== null && (
            <div style={{ display: 'flex', alignItems: 'center', height: 10 }} title={t('agentRow.contextTitle', { pct })}>
              <ContextGauge segments={segments} accent={agent.accent} height={5} />
            </div>
          )}
          {/* Line 4: the ticket */}
          {ticket && (
            <div data-ticket={ticket.id} style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, fontSize: Math.max(10, metaSize + 1), lineHeight: 1.35, color: 'var(--cth-ink-900)' }}>
              <span
                role="link" tabIndex={-1}
                onClick={(e) => { e.stopPropagation(); openTaskDetail(ticket.id); }}
                style={{ flexShrink: 0, fontFamily: 'var(--cth-font-mono)', fontSize: Math.max(9, metaSize - 1), color: 'var(--cth-ink-500)', cursor: 'pointer' }}
              >{ticket.id}</span>
              <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={ticket.title}>{ticket.title}</span>
            </div>
          )}
          {/* Line 5: the live action and its age; a dead agent gets the strip instead */}
          {!agent.exit && (
            <div data-live-line={agent.id} title={agent.action || undefined} style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0, fontSize: metaSize + 1, lineHeight: 1.35, color: 'var(--cth-ink-500)' }}>
              <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{liveText}</span>
              <Ago ts={last?.ts ?? agent.recentTextTs} />
              {noteAdd}
            </div>
          )}
          {agent.exit && (
            <div data-crashed-strip role="status" style={{
              marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, minWidth: 0,
              padding: '3px 6px', fontSize: metaSize + 1, lineHeight: 1.35,
              background: 'var(--cth-coral-light)', boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)', color: 'var(--cth-ink-900)'
            }}>
              <b style={{ flexShrink: 0, fontFamily: 'var(--cth-font-display)', fontSize: 7, fontWeight: 400 }}>{crashed ? t('agentRow.crashed') : agent.exit.verdict === 'finished' ? t('agentRow.finished') : t('agentRow.stopped')}</b>
              <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {agent.exit.exitCode !== undefined ? `exit ${agent.exit.exitCode}` : agent.exit.signal !== undefined ? `signal ${agent.exit.signal}` : ''}
              </span>
              <Ago ts={agent.exit.at} />
              {noteAdd}
            </div>
          )}
          {/* The note, when there is one: a paper block with the notepad glyph
              in front and one bullet per line (founder, 23 Sep: the note must
              look different from the live line). Clicking it opens the editor
              beside the row; the orchestrator's note is read only, as before. */}
          {bullets.length > 0 && (
            <div
              data-agent-note={agent.id}
              role={agent.isGod ? undefined : 'button'}
              tabIndex={agent.isGod ? undefined : 0}
              onClick={agent.isGod ? undefined : (e) => { e.stopPropagation(); toggleEditor(); }}
              onKeyDown={agent.isGod ? undefined : (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); toggleEditor(); }
              }}
              title={agent.isGod ? agent.note : t('agentCard.editNote')}
              aria-label={agent.isGod ? undefined : t('agentCard.editNoteAria', { name: agent.name })}
              style={{
                display: 'flex', gap: 6, alignItems: 'flex-start', minWidth: 0, marginTop: 2,
                padding: '3px 6px',
                background: notePosition ? 'var(--cth-cream-200)' : 'var(--cth-cream-100)',
                boxShadow: 'inset 0 0 0 1px var(--cth-ink-100)',
                color: 'var(--cth-ink-700)', cursor: agent.isGod ? 'default' : 'pointer'
              }}
            >
              <NotepadGlyph size={Math.max(10, scale.note)} style={{ marginTop: 2, opacity: 0.75 }} />
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {bullets.map((line, i) => (
                  <span key={i} title={line} style={{ display: 'flex', gap: 5, alignItems: 'baseline', fontSize: scale.note, lineHeight: 1.35 }}>
                    <span style={{ flexShrink: 0, color: 'var(--cth-ink-500)' }}>▪</span>
                    {/* Exactly one line per bullet: a wrapping row would make the
                        roster's height jump around as notes are typed. */}
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{line}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </button>
      {notePosition && createPortal(
        <>
        {/* click-away backdrop — the editor stays until dismissed on purpose */}
        <div
          onClick={() => setNotePosition(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 449, background: 'transparent' }}
        />
        <div
          ref={noteRef}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            left: notePosition.left,
            top: notePosition.top,
            width: noteWidth,
            zIndex: 450,
            padding: 8,
            background: 'var(--cth-paper-100)',
            boxShadow: 'inset 0 0 0 1.5px var(--cth-ink-500), 4px 4px 0 rgba(26,19,32,0.25)',
            boxSizing: 'border-box'
          }}
        >
          <div style={{
            marginBottom: 6,
            fontFamily: 'var(--cth-font-display)',
            fontSize: noteLabelSize,
            lineHeight: `${Math.round(noteLabelSize * 1.5)}px`,
            color: 'var(--cth-ink-700)'
          }}>PRIVATE NOTE</div>
          {/* A textarea, not an input: the note is a bullet list, so Enter has
              to make a new line rather than doing nothing. */}
          <textarea
            dir={rtl ? 'auto' : undefined}
            autoFocus
            value={agent.note ?? ''}
            onChange={(e) => setAgentNote(agent.id, e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation(); // don't let Esc/typing reach the fullscreen handler
              if (e.key === 'Escape') {
                setNotePosition(null);
                buttonRef.current?.focus();
              }
            }}
            placeholder={t('agentStrip.notePlaceholder')}
            aria-label={t('agentCard.noteAria', { name: agent.name })}
            style={{
              width: '100%',
              height: noteHeight,
              padding: '5px 7px',
              border: 'none',
              outline: 'none',
              resize: 'vertical',
              boxSizing: 'border-box',
              background: 'var(--cth-cream-100)',
              boxShadow: 'inset 0 0 0 1px var(--cth-ink-100)',
              fontFamily: 'var(--cth-font-mono)',
              fontSize: noteFontSize,
              lineHeight: `${Math.round(noteFontSize * 1.6)}px`,
              color: 'var(--cth-ink-900)'
            }}
          />
          <div style={{
            marginTop: 5, fontSize: 10, color: 'var(--cth-ink-500)'
          }}>{t('agentStrip.oneLineOneBullet')}</div>
        </div>
        </>,
        document.body
      )}
    </>
  );
});

function Header({ agent, onEdit }: { agent: Agent; onEdit: () => void }) {
  const { t } = useTranslation();
  const typing = useHasTerminalDraft(agent.ptyId);
  const archiveAgent = useStore((st) => st.archiveAgent);
  const [openState, setOpenState] = useState<'idle' | 'opening' | 'ok' | 'error'>('idle');

  /** Same action as the docked panel: open the OS terminal in this agent's
   *  working directory. Fullscreen had no way to do it, which is backwards —
   *  this is the mode where you are most likely to want a shell beside it. */
  const openTerminal = async () => {
    setOpenState('opening');
    try {
      const res = await window.cth.openTerminalAt(agent.worktreePath || agent.cwd);
      setOpenState(res.ok ? 'ok' : 'error');
    } catch { setOpenState('error'); }
    setTimeout(() => setOpenState('idle'), 1500);
  };

  /** Kill + archive, mirroring AgentDetailPanel. Confirmed, because it ends a
   *  running process. God is exempt: the floor respawns it immediately, so the
   *  button would read as "restart Michael" while looking like "close". */
  const onKill = async () => {
    if (!agent.ptyId) return;
    if (!confirm(t('agentDetail.killConfirm', { name: agent.name }))) return;
    await window.cth.killPty(agent.ptyId);
    disposeTerminal(agent.ptyId);
    // archiveAgent re-homes focus mode to the next agent, and only leaves it when
    // the last one is gone. Hard-nulling here threw that away, which is why
    // closing an agent from inside focus mode still dropped you to the sidebar
    // even after the store was fixed.
    archiveAgent(agent.id);
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '6px 10px',
      background: 'var(--cth-cream-50)',
      boxShadow: 'inset 0 0 0 1px var(--cth-ink-100)'
    }}>
      <span style={{
        fontFamily: 'var(--cth-font-display)', fontSize: 10, lineHeight: '16px',
        color: 'var(--cth-ink-900)'
      }}>{agent.name.toUpperCase()}</span>
      {/* Edit belongs with the NAME, not with the action cluster on the right:
          it changes who this agent is, and the right-hand group is things you do
          with the agent. Icon-only because it sits inside the identity line —
          the word "edit" there would push the path off. God is excluded, as
          everywhere else: his identity is the hive's, not the roster's. */}
      {!agent.isGod && (
        <PixelButton variant="secondary" size="sm" onClick={onEdit}>
          <span
            className="cth-tip cth-tip-left cth-tip-wrap"
            data-tip={`Edit ${agent.name}: their name and face, which engine they run on, and the briefing that tells them what they are for.`}
            aria-label={`Edit ${agent.name}`}
            style={{ display: 'inline-flex', alignItems: 'center', lineHeight: 0 }}
          >
            <Icon name="edit" />
          </span>
        </PixelButton>
      )}
      <span style={{
        fontSize: 12, color: 'var(--cth-ink-500)',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        maxWidth: 300
      }}>{agent.cwd}</span>
      <span style={{
        fontSize: 12, color: 'var(--cth-ink-700)',
        fontStyle: 'italic'
      }}>“{agent.description}”</span>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* v0.3.4: the IDE opens from agent level — full Monaco editor + git
            diff over this agent's workspace. The id is passed EXPLICITLY:
            fullscreen does not change the selection, so leaving the IDE to infer
            its agent would open whichever agent happens to be selected in the
            sidebar rather than the one filling the screen. */}
        <PixelButton variant="secondary" size="sm" onClick={() => useStore.getState().setIdeOpen(true, agent.id)}>
          <span
            className="cth-tip cth-tip-wrap"
            data-tip={t('fullscreenTerminal.ideTip', { name: agent.name })}
            aria-label={t('fullscreenTerminal.openIdeAria')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            <Icon name="code" /> {t('commandCenter.ide')}
          </span>
        </PixelButton>
        {/* Voice toggle is ALWAYS reachable in fullscreen — it controls Michael (the
            god orchestrator) globally, not the agent in view, so users can start a
            voice session even while a worker's terminal fills the screen. The cost
            HUD stays Michael-only (it belongs to his card). */}
        <RealtimeMichaelToggle />
        {agent.isGod && <CostHud compact />}
        <PixelButton variant="secondary" size="sm" onClick={openTerminal} disabled={openState === 'opening'}>
          <span
            className="cth-tip cth-tip-wrap"
            data-tip={t('fullscreenTerminal.openTerminalTip', { cwd: agent.worktreePath || agent.cwd })}
            aria-label={t('fullscreenTerminal.openTerminalAria')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            <Icon name="terminal" />
            {openState === 'opening' ? t('agentDetail.opening') : openState === 'ok' ? t('agentDetail.ok') : openState === 'error' ? t('agentDetail.err') : t('agentDetail.open')}
          </span>
        </PixelButton>
        {/* The badge is a STATUS, not a button, but it sits in a row of them.
            Its own box is 20px (lineHeight 18 + 2px padding) against the 24px
            every size="sm" PixelButton is fixed at, so the row read as ragged.
            Sized through the badge's own style prop rather than a wrapper: a
            wrapper only centres the 20px box inside 24px, it does not make the
            visible border match. */}
        <PixelBadge
          status={typing ? 'typing' : agent.status}
          style={{ height: 24, padding: '0 8px', lineHeight: '24px' }}
        />
        {!agent.isGod && (
          <PixelButton variant="destructive" size="sm" onClick={onKill}>
            {/* inline-flex + center: the other buttons hold TEXT, whose line box
                the button centres for free. A bare <Icon> is replaced-content
                sitting on the text baseline, so it rode low and overhung the
                24px box — the button measured the same as its neighbours while
                reading taller than them. */}
            <span
              title={t('fullscreenTerminal.closeAgent', { name: agent.name })}
              style={{ display: 'inline-flex', alignItems: 'center', lineHeight: 0 }}
            >
              <Icon name="x" />
            </span>
          </PixelButton>
        )}
      </div>
    </div>
  );
}
