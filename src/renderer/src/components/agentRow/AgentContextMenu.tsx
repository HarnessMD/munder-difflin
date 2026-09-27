/**
 * RIGHT CLICK ON AN AGENT, CLASSIC (0.5.3, F25, Pam's Classic cards). One
 * menu for the roster row and the strip card: Open, Message, Pause or
 * Resume tools, Hold or Release 1:1, Rename, Add or Edit note, Archive.
 * The same doors the Pro agent screen's controls take (controlPause,
 * controlResume, hiveSetAgentHold) and the same store actions the Classic
 * surfaces already call; nothing here is a new capability, only a shorter
 * way to the ones that existed.
 *
 * The menu reads its agent through `useAgent`, so the label it draws (Hold
 * or Release, Add or Edit) is the record's, not a copy the row passed.
 * Pause or Resume asks the control snapshot when the menu opens, because
 * the store does not hold that flag; until it answers the row says Pause.
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store/store';
import { useAgent } from '@/store/useAgent';
import { disposeTerminal } from '../terminalPool';

type AgentControlSnapshot = NonNullable<Awaited<ReturnType<typeof window.cth.controlSnapshot>>>;

export interface AgentMenuHandlers {
  onOpen: (id: string) => void;
  onMessage: (id: string) => void;
  onRename: (id: string) => void;
  /** Absent for a surface with no note editor (the orchestrator has none). */
  onEditNote?: (id: string) => void;
}

interface Target { id: string; x: number; y: number }

/** Wire a surface: `open` goes on each row's onContextMenu, `element` is
 *  drawn once by the surface (a portal, so a clipped strip cannot cut it). */
export function useAgentMenu(handlers: AgentMenuHandlers): { open: (e: React.MouseEvent, id: string) => void; element: ReactNode } {
  const [target, setTarget] = useState<Target | null>(null);
  const open = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setTarget({ id, x: e.clientX, y: e.clientY });
  }, []);
  const close = useCallback(() => setTarget(null), []);
  const element = target ? <AgentMenu target={target} handlers={handlers} onClose={close} /> : null;
  return { open, element };
}

const MENU_W = 200;

function AgentMenu({ target, handlers, onClose }: { target: Target; handlers: AgentMenuHandlers; onClose: () => void }) {
  const { t } = useTranslation();
  const agent = useAgent(target.id);
  const archiveAgent = useStore((s) => s.archiveAgent);
  const updateAgent = useStore((s) => s.updateAgent);
  const [snap, setSnap] = useState<AgentControlSnapshot | null>(null);

  useEffect(() => {
    let alive = true;
    window.cth.controlSnapshot?.(target.id).then((s) => { if (alive && s) setSnap(s); }).catch(() => { /* no snapshot: the row says Pause */ });
    return () => { alive = false; };
  }, [target.id]);

  // Outside click, Escape, or the agent leaving the floor all close it.
  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (!(e.target instanceof Element) || !e.target.closest('[data-agent-menu]')) onClose(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey); };
  }, [onClose]);
  useEffect(() => { if (!agent) onClose(); }, [agent, onClose]);
  if (!agent) return null;

  const held = !!agent.onHold;
  const paused = !!snap?.paused;
  const run = (fn: () => void | Promise<unknown>) => { onClose(); void fn(); };
  const pause = async () => {
    const s = paused ? await window.cth.controlResume(agent.id) : await window.cth.controlPause(agent.id, true);
    if (s) setSnap(s);
  };
  const hold = async () => {
    const res = await window.cth.hiveSetAgentHold(agent.id, !held).catch(() => ({ ok: false as const }));
    if (res.ok) updateAgent(agent.id, { onHold: !held });
  };
  // Kill + archive, the same steps as AgentDetailPanel and the fullscreen
  // header: confirmed, because it ends a running process. Not offered for the
  // orchestrator, whom the floor would respawn at once.
  const archive = async () => {
    if (agent.ptyId) {
      if (!window.confirm(t('agentDetail.killConfirm', { name: agent.name }))) return;
      await window.cth.killPty(agent.ptyId);
      disposeTerminal(agent.ptyId);
    }
    archiveAgent(agent.id);
  };

  // Keep the menu on screen near the right and bottom edges.
  const left = Math.max(8, Math.min(target.x, window.innerWidth - MENU_W - 8));
  const top = Math.max(8, Math.min(target.y, window.innerHeight - 8 * 34));

  return createPortal(
    <div
      role="menu" data-agent-menu={agent.id} aria-label={agent.name}
      onMouseDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        position: 'fixed', left, top, zIndex: 460, width: MENU_W, padding: 4,
        background: 'var(--cth-paper-100)', color: 'var(--cth-ink-900)',
        boxShadow: 'inset 0 0 0 1px var(--cth-ink-500), 3px 3px 0 rgba(26,19,32,0.14)',
        display: 'flex', flexDirection: 'column',
        fontFamily: 'var(--cth-font-ui)', fontSize: 12
      }}
    >
      <Item label={t('agentMenu.open')} onClick={() => run(() => handlers.onOpen(agent.id))} />
      <Item label={t('agentMenu.message')} onClick={() => run(() => handlers.onMessage(agent.id))} />
      <Rule />
      <Item data="pause" label={paused ? t('agentMenu.resumeTools') : t('agentMenu.pauseTools')} onClick={() => run(pause)} />
      <Item data="hold" label={held ? t('agentMenu.release') : t('agentMenu.hold')} onClick={() => run(hold)} />
      <Rule />
      <Item label={t('agentMenu.rename')} onClick={() => run(() => handlers.onRename(agent.id))} />
      {handlers.onEditNote && !agent.isGod && (
        <Item data="note" label={agent.note ? t('agentMenu.editNote') : t('agentMenu.addNote')} onClick={() => run(() => handlers.onEditNote!(agent.id))} />
      )}
      {!agent.isGod && <Rule />}
      {!agent.isGod && <Item data="archive" danger label={t('agentMenu.archive')} onClick={() => run(archive)} />}
    </div>,
    document.body
  );
}

function Rule() {
  return <div style={{ height: 1, background: 'var(--cth-ink-100)', margin: '3px 2px' }} />;
}

function Item({ label, onClick, danger, data }: { label: string; onClick: () => void; danger?: boolean; data?: string }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button" role="menuitem" data-menu-item={data ?? label}
      onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        padding: '6px 8px', border: 'none', textAlign: 'start', font: 'inherit', cursor: 'pointer',
        background: hover ? 'var(--cth-cream-200)' : 'transparent',
        color: danger ? 'var(--cth-coral)' : 'inherit'
      }}
    >{label}</button>
  );
}
