import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useTranslation } from 'react-i18next';
import { AgentCard } from './AgentCard';
import { PixelButton } from './PixelButton';
import { Icon } from './Icon';
import { useStore, type Agent } from '@/store/store';
import { useAgent } from '@/store/useAgent';
import { tasksOf, ticketOf, useTaskLedger } from '@/store/taskLedger';
import { useLastActivityOf } from './pro/activityData';
import { useAgentMenu } from './agentRow/AgentContextMenu';
import { requestComposerFocus } from './MessageQueueComposer';
import { CARD_H } from './AgentCard';
import type { HiveTask } from './TasksKanban';
import { type HarnessConfig } from '@/store/config';
import { useRestoreTeam } from '@/hooks/useRestoreTeam';
import { useRtl } from '@/i18n/useDirection';

export interface AgentStripProps {
  /** Needed to rebuild a spawn command when a restorable agent predates the
   *  persisted `command` field. Optional so the strip renders without config. */
  config?: HarnessConfig | null;
}

export function AgentStrip({ config }: AgentStripProps) {
  const { t } = useTranslation();
  // IDS ONLY (0.5.3, Pam's audit). The strip orders the cards; each card reads
  // its own agent (StripEntry, below). The roster's ids change when an agent
  // is added, removed or reordered, and for nothing else, so the pty parser's
  // per chunk writes never render the strip.
  const ids = useStore(useShallow((s) => s.agents.map((a) => a.id)));
  const restorableAgents = useStore(s => s.restorableAgents);
  const selectedId = useStore(s => s.selectedId);
  const setAddAgentOpen = useStore(s => s.setAddAgentOpen);
  const reorderAgents = useStore(s => s.reorderAgents);
  // Shared with the fullscreen roster so both show one restore in progress.
  const { restoring, autoRestoring, restoreTeam } = useRestoreTeam(config);
  // ONE restore control (bottom-right): a button whose dropdown OPENS UPWARD and
  // lists last session's agents with per-agent dismiss. The menu is position:
  // fixed (anchored off the button's rect) because the strip scrolls with
  // overflow hidden — an absolute child would be clipped.
  const [restoreMenuOpen, setRestoreMenuOpen] = useState(false);
  const [restoreMenuPos, setRestoreMenuPos] = useState<{ right: number; bottom: number } | null>(null);
  const restoreBtnRef = useRef<HTMLSpanElement>(null);
  const restoreBusy = restoring || autoRestoring;
  useEffect(() => {
    if (restorableAgents.length === 0 || restoreBusy) setRestoreMenuOpen(false);
  }, [restorableAgents.length, restoreBusy]);
  const toggleRestoreMenu = (anchor: HTMLElement | null) => {
    if (restoreMenuOpen) { setRestoreMenuOpen(false); return; }
    const rect = anchor?.getBoundingClientRect();
    if (!rect) return;
    setRestoreMenuPos({
      right: Math.max(8, window.innerWidth - rect.right),
      bottom: Math.max(8, window.innerHeight - rect.top + 6)
    });
    setRestoreMenuOpen(true);
  };
  // Drag-to-reorder the roster: dragId = the card being dragged, overId = the card
  // currently hovered as a drop target (drives the insertion-line cue).
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  // Note editing is EXPLICIT (✎ toggles the editor) — nothing appears on hover.
  // The editor is a fixed popover ABOVE the card (anchored off its rect): the
  // strip clips overflow and the compact cards have no room for an inline box.
  const [noteEditId, setNoteEditId] = useState<string | null>(null);
  // One function each for the life of the strip, so a memoised entry's props
  // only change when its own facts do. The drop reads the dragged id off a
  // ref rather than closing over state, for the same reason.
  const dragIdRef = useRef<string | null>(null);
  dragIdRef.current = dragId;
  const onDragStart = useCallback((id: string) => setDragId(id), []);
  const onDragOverEntry = useCallback((id: string) => setOverId((cur) => (cur === id ? cur : id)), []);
  const onDragLeaveEntry = useCallback((id: string) => setOverId((cur) => (cur === id ? null : cur)), []);
  const onDropOn = useCallback((id: string) => {
    const from = dragIdRef.current;
    if (from && from !== id) reorderAgents(from, id);
    setDragId(null);
    setOverId(null);
  }, [reorderAgents]);
  const onDragEnd = useCallback(() => { setDragId(null); setOverId(null); }, []);
  const openNoteEditor = useCallback((id: string) => setNoteEditId(id), []);
  const closeNoteEditor = useCallback(() => setNoteEditId(null), []);
  // The right click menu (0.5.3, F25): Open and Message select the card as a
  // click does; Rename is a request the card's name editor answers.
  const select = useStore(s => s.select);
  const [renameReq, setRenameReq] = useState<{ id: string; n: number }>({ id: '', n: 0 });
  const menu = useAgentMenu({
    onOpen: select,
    onMessage: (id) => { select(id); requestComposerFocus(id); },
    onRename: (id) => setRenameReq((r) => ({ id, n: r.n + 1 })),
    onEditNote: openNoteEditor
  });
  // Each worker's actively-DOING ledger tasks, from the one shared ledger
  // poll (store/taskLedger.ts) — rendered as a sticky note on the avatar
  // card (click → task detail). The strip used to run a poll of its own.
  const { tasks } = useTaskLedger(5000);

  return (
    <div data-agent-strip style={{
      display: 'flex',
      gap: 12,
      padding: '14px 16px',
      overflowX: 'auto',
      overflowY: 'hidden',
      borderTop: '1px solid var(--cth-ink-300)',
      background: 'var(--cth-cream-200)',
      // Tall enough for the god card to stand proud of the row (it's taller and
      // rides a drop shadow) plus the hover-lift on every card, without clipping.
      // 0.5.3: the card is 92 tall (Pam's Classic cards), the dock 124.
      height: CARD_H + 32,
      minHeight: CARD_H + 32,
      alignItems: 'center'
    }}>
      {/* One memoised entry per agent (0.5.3, Pam's audit): the entry reads
          its own record, so a pty chunk on one agent renders that card and
          no other, and the strip itself, which lists ids only, does not
          render at all. test/v053-sidebar-row-renders counts it. */}
      {ids.map((id) => (
        <StripEntry
          key={id} id={id}
          selected={id === selectedId}
          dragging={dragId === id}
          over={overId === id && !!dragId && dragId !== id}
          dragActive={!!dragId}
          noteEditing={noteEditId === id}
          doingCount={doingOf(tasks, id).length}
          firstDoing={doingOf(tasks, id)[0]?.id}
          onDragStart={onDragStart} onDragOverEntry={onDragOverEntry} onDragLeaveEntry={onDragLeaveEntry}
          onDropOn={onDropOn} onDragEnd={onDragEnd}
          openNoteEditor={openNoteEditor} closeNoteEditor={closeNoteEditor}
          onContextMenu={menu.open}
          renameRequest={renameReq.id === id ? renameReq.n : 0}
          ticket={ticketOf(tasks, id)}
        />
      ))}
      {menu.element}
      <PixelButton
        variant="secondary"
        size="lg"
        style={{ alignSelf: 'center', flexShrink: 0 }}
        onClick={() => setAddAgentOpen(true)}
      >
        <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', whiteSpace: 'nowrap' }}>
          <Icon name="plus" /> {t('agentStrip.addAgent')}
        </span>
      </PixelButton>
      {/* ONE restore control, pinned to the strip's right edge. Busy (manual OR
          boot auto-restore) collapses to a single disabled "restoring your
          team…"; otherwise the button opens an upward dropdown listing last
          session's agents (per-agent ✕ dismiss + restore all). No outcome note
          is rendered afterwards — the restored agents appearing IS the outcome. */}
      {(restorableAgents.length > 0 || restoreBusy) && (
        <span
          ref={restoreBtnRef}
          style={{ alignSelf: 'center', flexShrink: 0, marginLeft: 'auto' }}
          title={restoreBusy
            ? t('agentStrip.restoringTitle')
            : t('agentStrip.restoreTitle', { names: restorableAgents.map((a: Agent) => a.name).join(', ') })}
        >
          <PixelButton
            variant="primary"
            size="lg"
            disabled={restoreBusy}
            onClick={() => toggleRestoreMenu(restoreBtnRef.current)}
          >
            <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', whiteSpace: 'nowrap' }}>
              <Icon name="play" />
              {restoreBusy ? t('agentStrip.restoringTeam') : t('agentStrip.restoreTeam', { count: restorableAgents.length })}
            </span>
          </PixelButton>
        </span>
      )}
      {restoreMenuOpen && restoreMenuPos && restorableAgents.length > 0 && (
        <>
          {/* click-away backdrop */}
          <div
            onClick={() => setRestoreMenuOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 349, background: 'transparent' }}
          />
          <div style={{
            position: 'fixed', right: restoreMenuPos.right, bottom: restoreMenuPos.bottom,
            zIndex: 350, minWidth: 240, maxHeight: '50vh', overflowY: 'auto',
            background: 'var(--cth-cream-50)',
            boxShadow: '0 0 0 2px var(--cth-ink-900), 3px 4px 0 0 rgba(26,19,32,0.22)',
            padding: 8, display: 'flex', flexDirection: 'column', gap: 6,
            fontFamily: 'var(--cth-font-ui)'
          }}>
            <span style={{
              fontFamily: 'var(--cth-font-display)', fontSize: 8, lineHeight: '12px',
              color: 'var(--cth-ink-500)', textTransform: 'uppercase'
            }}>
              {t('agentStrip.previousSession')}
            </span>
            {/* Per-agent dismiss wires straight to removeRestorableAgent
                (filters + persistRestorable), so a dismissed agent never
                reappears after reload. */}
            {restorableAgents.map((a: Agent) => (
              <span
                key={a.id}
                title={t('agentStrip.restorable', { name: a.name })}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  height: 26, padding: '0 4px 0 8px',
                  fontSize: 12, color: 'var(--cth-ink-900)',
                  background: 'var(--cth-paper-100)',
                  boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)'
                }}
              >
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {a.name}
                </span>
                <span style={{ fontSize: 11, color: 'var(--cth-ink-500)', whiteSpace: 'nowrap' }}>
                  {a.description ? a.description.slice(0, 24) : ''}
                </span>
                <button
                  onClick={() => useStore.getState().removeRestorableAgent(a.id)}
                  title={t('agentStrip.dismiss', { name: a.name })}
                  aria-label={t('agentStrip.dismissAria', { name: a.name })}
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 18, height: 18, padding: 0, lineHeight: 1,
                    fontSize: 12, color: 'var(--cth-ink-500)',
                    background: 'transparent', border: 'none', cursor: 'pointer'
                  }}
                >✕</button>
              </span>
            ))}
            <PixelButton
              variant="primary"
              size="sm"
              onClick={() => { setRestoreMenuOpen(false); void restoreTeam(); }}
            >
              <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', whiteSpace: 'nowrap' }}>
                <Icon name="play" /> {t('agentStrip.restoreAll', { count: restorableAgents.length })}
              </span>
            </PixelButton>
          </div>
        </>
      )}
    </div>
  );
}

interface StripEntryProps {
  id: string;
  selected: boolean;
  /** This card is the one being dragged. */
  dragging: boolean;
  /** A drag from another card is over this one (the insertion cue). */
  over: boolean;
  /** Some card is being dragged: the note editor stays shut meanwhile. */
  dragActive: boolean;
  noteEditing: boolean;
  doingCount: number;
  firstDoing: string | undefined;
  onDragStart: (id: string) => void;
  onDragOverEntry: (id: string) => void;
  onDragLeaveEntry: (id: string) => void;
  onDropOn: (id: string) => void;
  onDragEnd: () => void;
  openNoteEditor: (id: string) => void;
  closeNoteEditor: () => void;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
  /** A counter; a new value opens the name editor (the menu's Rename). */
  renameRequest: number;
  /** The card this agent is on, from the shared ledger; the same object
   *  until the ledger changes, so the memo holds between polls. */
  ticket: HiveTask | null;
}

/** ONE AGENT'S PLACE IN THE STRIP: the draggable wrapper, the card and the
 *  note editor it opens. Memoised, and its own subscriber: it takes an id
 *  and reads the agent through `useAgent`, which answers the same object
 *  until that agent's record changes, so another agent's hook event never
 *  reaches this function. Every callback it is given is one function for
 *  the life of the strip. */
const StripEntry = memo(function StripEntry({
  id, selected, dragging, over, dragActive, noteEditing, doingCount, firstDoing,
  onDragStart, onDragOverEntry, onDragLeaveEntry, onDropOn, onDragEnd, openNoteEditor, closeNoteEditor,
  onContextMenu, renameRequest, ticket
}: StripEntryProps) {
  const { t } = useTranslation();
  const rtl = useRtl();
  const agent = useAgent(id);
  const select = useStore(s => s.select);
  const openTaskDetail = useStore(s => s.openTaskDetail);
  const renameAgent = useStore(s => s.renameAgent);
  const setAgentNote = useStore(s => s.setAgentNote);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const last = useLastActivityOf(id);
  // Gone between the strip's render and this one (archived, removed): nothing
  // to draw, and the strip's next render drops the entry.
  if (!agent) return null;
  return (
    // Draggable wrapper: reorder the roster by dragging one card onto another.
    // Native HTML5 DnD (no dep). A plain click still selects — a drag only
    // starts on movement — so AgentCard's onClick is unaffected.
    <div
      ref={cardRef}
      data-strip-entry={id}
      draggable
      onDragStart={(e) => { onDragStart(id); e.dataTransfer.effectAllowed = 'move'; }}
      onDragOver={(e) => {
        if (!dragActive || dragging) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        onDragOverEntry(id);
      }}
      onDragLeave={() => onDragLeaveEntry(id)}
      onDrop={(e) => {
        e.preventDefault();
        onDropOn(id);
      }}
      onDragEnd={onDragEnd}
      style={{
        position: 'relative',
        flexShrink: 0,
        cursor: 'grab',
        opacity: dragging ? 0.4 : 1,
        // Insertion-line cue on the hovered drop target.
        boxShadow: over
          ? 'inset 3px 0 0 0 var(--cth-ink-900)'
          : 'none',
        transition: 'opacity 120ms ease'
      }}
    >
      <AgentCard
        draggable
        name={agent.name}
        character={agent.character}
        description={agent.description}
        accent={agent.accent}
        status={agent.status}
        ptyId={agent.ptyId}
        project={agent.project}
        action={agent.action}
        progress={agent.progress}
        contextTokens={agent.contextTokens}
        contextLimit={agent.contextLimit}
        selected={selected}
        isGod={agent.isGod}
        onClick={() => select(id)}
        onRename={(name) => renameAgent(id, name)}
        doingCount={doingCount}
        onTaskNoteClick={() => {
          if (firstDoing) openTaskDetail(firstDoing);
        }}
        note={agent.note}
        onEditNote={agent.isGod ? undefined : () => openNoteEditor(id)}
        provider={agent.provider}
        model={agent.model}
        ticketId={ticket?.id}
        ticketTitle={ticket?.title}
        lastTs={last?.ts ?? agent.recentTextTs}
        exit={agent.exit}
        onHold={agent.onHold}
        onContextMenu={(e) => onContextMenu(e, id)}
        editRequest={renameRequest}
      />
      {/* The note itself lives INSIDE the card (its own row above the gauge).
          This is the transient EDITOR: a fixed popover ABOVE the card —
          the compact card has no room for an inline box, and the strip
          clips overflow. ✎ opens it; Esc / ✕ / click-away closes. */}
      {noteEditing && !dragActive && (() => {
        const rect = cardRef.current?.getBoundingClientRect();
        if (!rect) return null;
        const width = 280;
        const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
        const bottom = Math.max(8, window.innerHeight - rect.top + 8);
        return (
          <>
            {/* click-away backdrop */}
            <div
              onClick={closeNoteEditor}
              style={{ position: 'fixed', inset: 0, zIndex: 349, background: 'transparent' }}
            />
            <div
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                position: 'fixed', left, bottom, width, zIndex: 350,
                padding: 10, boxSizing: 'border-box',
                background: 'var(--cth-paper-100)',
                boxShadow: 'inset 0 0 0 1px var(--cth-ink-300), 3px 3px 0 rgba(26,19,32,0.14)',
                display: 'flex', flexDirection: 'column', gap: 6
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{
                  fontFamily: 'var(--cth-font-display)', fontSize: 8, lineHeight: '12px',
                  color: 'var(--cth-ink-500)'
                }}>{t('agentStrip.privateNote', { name: agent.name.toUpperCase() })}</span>
                <button
                  onClick={closeNoteEditor}
                  title={t('agentStrip.done')}
                  aria-label={t('agentStrip.closeNoteEditor')}
                  style={{
                    flexShrink: 0, width: 18, height: 18, padding: 0, lineHeight: 1,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--cth-font-ui)', fontSize: 11,
                    color: 'var(--cth-ink-500)', background: 'transparent',
                    border: 'none', cursor: 'pointer'
                  }}
                >✕</button>
              </div>
              {/* A textarea, not an input: the note is a bullet list (one
                  line per bullet) and the fullscreen roster renders every
                  line — an <input> would silently eat the newlines. */}
              <textarea
                dir={rtl ? 'auto' : undefined}
                autoFocus
                rows={3}
                value={agent.note ?? ''}
                onChange={(e) => setAgentNote(id, e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Escape') closeNoteEditor(); }}
                placeholder={t('agentStrip.notePlaceholder')}
                aria-label={t('agentCard.noteAria', { name: agent.name })}
                style={{
                  width: '100%', padding: '6px 8px',
                  border: 'none', outline: 'none', resize: 'none', boxSizing: 'border-box',
                  background: 'var(--cth-cream-100)',
                  boxShadow: 'inset 0 0 0 1px var(--cth-ink-100)',
                  fontFamily: 'var(--cth-font-mono)', fontSize: 12,
                  lineHeight: '18px', color: 'var(--cth-ink-900)'
                }}
              />
              <span style={{ fontSize: 10, color: 'var(--cth-ink-500)' }}>
                {t('agentStrip.oneLineOneBullet')}
              </span>
            </div>
          </>
        );
      })()}
    </div>
  );
});

/** The DOING cards an agent holds: the note on its card counts them and the
 *  first one is what a click opens. */
function doingOf(tasks: HiveTask[] | null, id: string): HiveTask[] {
  return tasksOf(tasks, id).filter((t) => t.status === 'doing');
}
