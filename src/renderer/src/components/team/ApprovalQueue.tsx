/**
 * D10 — approval for work arriving from another node.
 *
 * Two surfaces for one concept. The toast interrupts once, for the request in
 * front of you. The queue is where everything that was not answered lives, so
 * a request that arrives while you are heads down is never silently lost.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GlyphAvatar, StatusPill } from './primitives';
import type { IncomingRequest } from './types';
import { Btn, Panel } from '../pro/ui';

/* ---- toast, bottom right, 380 wide ---------------------------------------- */

export interface ApprovalToastProps {
  request: IncomingRequest;
  onAllowOnce: () => void;
  onDismiss: () => void;
  onAlwaysAllow: () => void;
}

export function ApprovalToast({ request, onAllowOnce, onDismiss, onAlwaysAllow }: ApprovalToastProps) {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div style={{
      // Position is NOT set here. Three toasts anchored themselves to this
      // same corner and covered each other; AppOverlaySlot owns it now.
      width: 380,
      background: 'var(--cth-cream-100)',
      borderRadius: 'var(--cth-radius-xl, 12px)',
      boxShadow: 'inset 0 0 0 1px var(--cth-ink-300), var(--cth-shadow-hard)',
      padding: 12,
      display: 'flex', flexDirection: 'column', gap: 10
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <GlyphAvatar name={request.fromName} presence="online" />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontSize: 13, lineHeight: '18px', color: 'var(--cth-ink-900)' }}>
            {t('team.approval.wantsToSend', {
              name: request.fromName, machine: request.fromMachine
            })}
          </span>
          <span style={{
            fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
          }}>{request.preview}</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Btn kind="primary" size="sm" onClick={onAllowOnce}>
          {t('team.approval.allowOnce')}
        </Btn>
        <Btn kind="ghost" size="sm" onClick={onDismiss}>
          {t('team.approval.notNow')}
        </Btn>
        <span style={{ flex: 1 }} />
        <div style={{ position: 'relative' }}>
          <Btn kind="ghost" size="sm" onClick={() => setMenuOpen(v => !v)} title={t('team.approval.more')}>…</Btn>
          {menuOpen && (
            <div style={{
              position: 'absolute', insetInlineEnd: 0, bottom: 'calc(100% + 4px)',
              minWidth: 200, padding: 4,
              background: 'var(--cth-cream-100)',
              borderRadius: 'var(--cth-radius-md, 8px)',
              boxShadow: 'inset 0 0 0 1px var(--cth-ink-300), var(--cth-shadow-hard)'
            }}>
              <button
                onClick={() => { setMenuOpen(false); onAlwaysAllow(); }}
                style={{
                  display: 'block', width: '100%', textAlign: 'start',
                  padding: '6px 8px', border: 'none', cursor: 'pointer',
                  background: 'transparent', borderRadius: 'var(--cth-radius-sm, 6px)',
                  fontSize: 13, color: 'var(--cth-ink-900)'
                }}>
                {t('team.approval.alwaysAllow', { name: request.fromName.split(' ')[0] })}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---- queue, inside the Messages tab ---------------------------------------- */

export type ApprovalDecision = 'allow-once' | 'always' | 'decline';

/**
 * `onDecide` is the consequence. In the app it reaches main, which delivers
 * the request to the local god (allow) or drops it (decline); the row leaves
 * the list at once and main's next push confirms. The boards pass nothing
 * and the list simply shrinks.
 */
export function ApprovalQueue(
  { requests, onDecide }: { requests: IncomingRequest[]; onDecide?: (id: string, decision: ApprovalDecision) => void }
) {
  const { t } = useTranslation();
  const [items, setItems] = useState(requests);
  const [expanded, setExpanded] = useState<string | null>(null);
  // Main pushes a fresh list whenever the queue changes; follow it.
  useEffect(() => { setItems(requests); }, [requests]);

  const pending = items.filter(r => !r.expired);

  const resolve = (id: string, decision: ApprovalDecision) => {
    onDecide?.(id, decision);
    setItems(list => list.filter(r => r.id !== id));
  };
  const resolveAll = (decision: ApprovalDecision) => {
    for (const r of pending) onDecide?.(r.id, decision);
    setItems(list => list.filter(r => r.expired));
  };

  if (items.length === 0) {
    return (
      <Panel style={{ padding: 24, textAlign: 'center' }}>
        <span style={{ fontSize: 13, color: 'var(--cth-ink-700)' }}>{t('team.approval.empty')}</span>
      </Panel>
    );
  }

  return (
    <Panel noPadding style={{ display: 'flex', flexDirection: 'column' }}>
      <header style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
        boxShadow: 'inset 0 -1px 0 var(--cth-ink-300)'
      }}>
        <span style={{ flex: 1, fontSize: 13, color: 'var(--cth-ink-900)' }}>
          {t('team.approval.waiting', { count: pending.length })}
        </span>
        <Btn size="sm" disabled={pending.length === 0} onClick={() => resolveAll('allow-once')}>
          {t('team.approval.allowAll')}
        </Btn>
        <Btn kind="ghost" size="sm" disabled={pending.length === 0} onClick={() => resolveAll('decline')}>
          {t('team.approval.declineAll')}
        </Btn>
      </header>

      <div>
        {items.map((r, i) => {
          const open = expanded === r.id;
          return (
            <div key={r.id} style={{
              background: i % 2 ? 'var(--cth-cream-200)' : 'var(--cth-cream-100)',
              boxShadow: 'inset 0 -1px 0 var(--cth-ink-100)',
              opacity: r.expired ? 0.5 : 1
            }}>
              <div
                onClick={() => setExpanded(open ? null : r.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', cursor: 'pointer'
                }}>
                <GlyphAvatar name={r.fromName} presence="online"
                  surface={i % 2 ? 'var(--cth-cream-200)' : 'var(--cth-cream-100)'} />
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{
                    fontSize: 13, color: 'var(--cth-ink-900)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}>{r.preview}</span>
                  <span style={{ fontSize: 12, color: 'var(--cth-ink-500)' }}>
                    {r.fromName} · {r.fromMachine}
                  </span>
                </div>
                {r.expired
                  ? <span style={{
                      fontFamily: 'var(--cth-font-mono)', fontSize: 11, color: 'var(--cth-ink-500)'
                    }}>{t('team.approval.expiredAt', { at: r.at })}</span>
                  : <span style={{
                      fontFamily: 'var(--cth-font-mono)', fontSize: 11, color: 'var(--cth-ink-500)'
                    }}>{r.at}</span>}
              </div>

              {open && (
                <div style={{ padding: '0 12px 12px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <p style={{
                    margin: 0, padding: 10,
                    background: 'var(--cth-cream-300)',
                    borderRadius: 'var(--cth-radius-md, 8px)',
                    fontSize: 13, lineHeight: '20px', color: 'var(--cth-ink-900)'
                  }}>{r.detail}</p>
                  {r.expired ? (
                    <StatusPill status="idle">{t('team.approval.expired')}</StatusPill>
                  ) : (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Btn kind="primary" size="sm" onClick={() => resolve(r.id, 'allow-once')}>
                        {t('team.approval.allowOnce')}
                      </Btn>
                      <Btn kind="ghost" size="sm" onClick={() => resolve(r.id, 'decline')}>
                        {t('team.approval.decline')}
                      </Btn>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
