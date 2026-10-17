import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AgentCard } from './AgentCard';
import { PixelButton } from './PixelButton';
import { Icon } from './Icon';
import { SpritePortrait } from './SpritePortrait';
import { EditAgentModal } from './EditAgentModal';
import { useStore, type Agent } from '@/store/store';
import { type HarnessConfig } from '@/store/config';
import { useRestoreTeam } from '@/hooks/useRestoreTeam';
import { useRtl } from '@/i18n/useDirection';

export interface AgentStripProps {
  /** Needed to rebuild a spawn command when a restorable agent predates the
   *  persisted `command` field. Optional so the strip renders without config. */
  config?: HarnessConfig | null;
}

const STATUS_DOT_COLORS: Record<string, string> = {
  idle: 'var(--cth-status-idle)',
  thinking: 'var(--cth-status-thinking)',
  working: 'var(--cth-status-working)',
  waiting: 'var(--cth-status-waiting)',
  blocked: 'var(--cth-status-blocked)',
  success: 'var(--cth-status-success)',
  ghost: 'var(--cth-status-ghost)',
  compacting: 'var(--cth-status-compacting)',
  looping: 'var(--cth-status-looping)',
  typing: 'var(--cth-status-typing)'
};

export function AgentStrip({ config }: AgentStripProps) {
  const { t } = useTranslation();
  const rtl = useRtl();
  const agents = useStore(s => s.agents);
  const restorableAgents = useStore(s => s.restorableAgents);
  const selectedId = useStore(s => s.selectedId);
  const select = useStore(s => s.select);
  const setAddAgentOpen = useStore(s => s.setAddAgentOpen);
  const openTaskDetail = useStore(s => s.openTaskDetail);
  const reorderAgents = useStore(s => s.reorderAgents);
  const renameAgent = useStore(s => s.renameAgent);
  const setAgentNote = useStore(s => s.setAgentNote);

  // Resize and compact mode states
  const [stripHeight, setStripHeight] = useState<number>(() => {
    const saved = localStorage.getItem('cth-strip-height');
    return saved ? Math.max(78, Math.min(220, Number(saved))) : 112;
  });
  const [compact, setCompact] = useState<boolean>(() => {
    return localStorage.getItem('cth-strip-compact') === 'true';
  });

  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  // Resizing drag tracking
  const [isResizing, setIsResizing] = useState(false);
  const startYRef = useRef(0);
  const startHRef = useRef(112);

  const onResizeHandleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startYRef.current = e.clientY;
    startHRef.current = stripHeight;

    const onMouseMove = (ev: MouseEvent) => {
      // Dragging upward (clientY decreases) increases height
      const delta = startYRef.current - ev.clientY;
      const nextH = Math.max(78, Math.min(220, startHRef.current + delta));
      setStripHeight(nextH);
    };

    const onMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      setStripHeight((cur) => {
        localStorage.setItem('cth-strip-height', String(cur));
        return cur;
      });
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const toggleCompact = () => {
    setCompact((prev) => {
      const next = !prev;
      localStorage.setItem('cth-strip-compact', String(next));
      return next;
    });
  };

  // Shared with the fullscreen roster so both show one restore in progress.
  const { restoring, autoRestoring, restoreTeam } = useRestoreTeam(config);
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

  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [noteEditId, setNoteEditId] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [doingByAgent, setDoingByAgent] = useState<Record<string, string[]>>({});

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const raw = await window.cth.hiveTasks() as { tasks?: Array<{ id?: string; status?: string; assignee?: string }> } | null;
        if (cancelled) return;
        const map: Record<string, string[]> = {};
        for (const t of (raw && Array.isArray(raw.tasks)) ? raw.tasks : []) {
          if (t?.status === 'doing' && typeof t.assignee === 'string' && t.assignee && typeof t.id === 'string') {
            (map[t.assignee] = map[t.assignee] ?? []).push(t.id);
          }
        }
        setDoingByAgent(map);
      } catch { /* keep last good */ }
    };
    void poll();
    const iv = setInterval(() => { void poll(); }, 5000);
    return () => { cancelled = true; clearInterval(iv); };
  }, []);

  const effectiveHeight = compact ? 52 : stripHeight;

  return (
    <div style={{
      position: 'relative',
      height: effectiveHeight,
      minHeight: effectiveHeight,
      maxHeight: effectiveHeight,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--cth-cream-200)',
      borderTop: '1px solid var(--cth-ink-300)',
      boxSizing: 'border-box'
    }}>
      {/* Top resize handle */}
      {!compact && (
        <div
          onMouseDown={onResizeHandleMouseDown}
          title="Drag to resize bar"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            cursor: 'ns-resize',
            zIndex: 10,
            background: isResizing ? 'var(--cth-sky)' : 'transparent'
          }}
        />
      )}

      <div style={{
        flex: 1,
        display: 'flex',
        gap: compact ? 8 : 12,
        padding: compact ? '6px 12px' : '12px 16px',
        overflowX: 'auto',
        overflowY: 'hidden',
        alignItems: 'center',
        boxSizing: 'border-box'
      }}>
        {agents.map(a => (
          <div
            key={a.id}
            ref={(el) => { cardRefs.current[a.id] = el; }}
            draggable
            onDragStart={(e) => { setDragId(a.id); e.dataTransfer.effectAllowed = 'move'; }}
            onDragOver={(e) => {
              if (!dragId || dragId === a.id) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              if (overId !== a.id) setOverId(a.id);
            }}
            onDragLeave={() => { if (overId === a.id) setOverId(null); }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragId && dragId !== a.id) reorderAgents(dragId, a.id);
              setDragId(null);
              setOverId(null);
            }}
            onDragEnd={() => { setDragId(null); setOverId(null); }}
            style={{
              position: 'relative',
              flexShrink: 0,
              cursor: 'grab',
              opacity: dragId === a.id ? 0.4 : 1,
              boxShadow: overId === a.id && dragId && dragId !== a.id
                ? 'inset 3px 0 0 0 var(--cth-ink-900)'
                : 'none',
              transition: 'opacity 120ms ease'
            }}
          >
            {compact ? (
              /* Compact Pill representation */
              <div
                role="button"
                tabIndex={0}
                onClick={() => select(a.id)}
                style={{
                  height: 38,
                  minWidth: 120,
                  maxWidth: 160,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '2px 8px 2px 4px',
                  background: a.id === selectedId
                    ? `var(--cth-${a.accent}-light)`
                    : 'var(--cth-paper-100)',
                  boxShadow: a.id === selectedId
                    ? `inset 0 0 0 1.5px var(--cth-${a.accent}), 0 0 0 1px var(--cth-ink-900)`
                    : 'inset 0 0 0 1px var(--cth-ink-200)',
                  cursor: 'pointer'
                }}
              >
                {/* Clickable Portrait Icon */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingAgent(a);
                  }}
                  title={t('agentCard.editPortrait', { defaultValue: 'Edit character portrait' })}
                  style={{
                    width: 26,
                    height: 32,
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    flexShrink: 0,
                    cursor: 'pointer',
                    background: `var(--cth-${a.accent}-light)`,
                    boxShadow: 'inset 0 0 0 1px var(--cth-ink-100)'
                  }}
                >
                  <SpritePortrait character={a.character} scale={1.2} />
                </div>

                {/* Status Dot */}
                <div
                  title={a.status}
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: STATUS_DOT_COLORS[a.status] ?? 'var(--cth-status-idle)',
                    flexShrink: 0
                  }}
                />

                {/* Agent Name */}
                <span
                  title={a.name}
                  style={{
                    fontFamily: 'var(--cth-font-display)',
                    fontSize: '11px',
                    color: 'var(--cth-ink-900)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    flex: 1
                  }}
                >
                  {a.name.toUpperCase()}
                </span>
              </div>
            ) : (
              /* Full Card representation */
              <>
                <AgentCard
                  draggable
                  name={a.name}
                  character={a.character}
                  accent={a.accent}
                  status={a.status}
                  ptyId={a.ptyId}
                  project={a.project}
                  action={a.action}
                  progress={a.progress}
                  contextTokens={a.contextTokens}
                  contextLimit={a.contextLimit}
                  selected={a.id === selectedId}
                  isOrchestrator={a.isOrchestrator}
                  onClick={() => select(a.id)}
                  onRename={(name) => renameAgent(a.id, name)}
                  doingCount={doingByAgent[a.id]?.length ?? 0}
                  onTaskNoteClick={() => {
                    const first = doingByAgent[a.id]?.[0];
                    if (first) openTaskDetail(first);
                  }}
                  note={a.note}
                  onEditNote={a.isOrchestrator ? undefined : () => setNoteEditId(a.id)}
                  onEditPortrait={() => setEditingAgent(a)}
                />
                {noteEditId === a.id && !dragId && (() => {
                  const rect = cardRefs.current[a.id]?.getBoundingClientRect();
                  if (!rect) return null;
                  const width = 280;
                  const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
                  const bottom = Math.max(8, window.innerHeight - rect.top + 8);
                  return (
                    <>
                      <div
                        onClick={() => setNoteEditId(null)}
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
                          }}>{t('agentStrip.privateNote', { name: a.name.toUpperCase() })}</span>
                          <button
                            onClick={() => setNoteEditId(null)}
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
                        <textarea
                          dir={rtl ? 'auto' : undefined}
                          autoFocus
                          rows={3}
                          value={a.note ?? ''}
                          onChange={(e) => setAgentNote(a.id, e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Escape') setNoteEditId(null); }}
                          placeholder={t('agentStrip.notePlaceholder')}
                          aria-label={t('agentCard.noteAria', { name: a.name })}
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
              </>
            )}
          </div>
        ))}

        <PixelButton
          variant="secondary"
          size={compact ? 'sm' : 'lg'}
          style={{ alignSelf: 'center', flexShrink: 0 }}
          onClick={() => setAddAgentOpen(true)}
        >
          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', whiteSpace: 'nowrap' }}>
            <Icon name="plus" /> {!compact && t('agentStrip.addAgent')}
          </span>
        </PixelButton>

        {/* Restore control */}
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
              size={compact ? 'sm' : 'lg'}
              disabled={restoreBusy}
              onClick={() => toggleRestoreMenu(restoreBtnRef.current)}
            >
              <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', whiteSpace: 'nowrap' }}>
                <Icon name="play" />
                {!compact && (restoreBusy ? t('agentStrip.restoringTeam') : t('agentStrip.restoreTeam', { count: restorableAgents.length }))}
              </span>
            </PixelButton>
          </span>
        )}

        {/* Compact Mode Toggle Button */}
        <span style={{ alignSelf: 'center', flexShrink: 0, marginLeft: (restorableAgents.length > 0 || restoreBusy) ? 4 : 'auto' }}>
          <PixelButton
            variant="ghost"
            size={compact ? 'sm' : 'md'}
            onClick={toggleCompact}
            title={compact ? 'Expand bottom bar' : 'Compact view'}
          >
            <Icon name={compact ? 'expand' : 'minimize'} />
          </PixelButton>
        </span>

        {restoreMenuOpen && restoreMenuPos && restorableAgents.length > 0 && (
          <>
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

      {/* Edit Agent Modal when clicking agent portrait */}
      {editingAgent && (
        <EditAgentModal
          agent={editingAgent}
          onClose={() => setEditingAgent(null)}
        />
      )}
    </div>
  );
}
