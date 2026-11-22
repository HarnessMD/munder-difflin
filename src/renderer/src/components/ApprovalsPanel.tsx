import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton } from './PixelButton';
import { PixelBadge } from './PixelBadge';
import { approvalsToShow, type ApprovalView } from '@shared/approvalView';

/**
 * The guardrail's Approvals, at the top of ASK ME. An "Ask me" rule refuses the
 * call and puts it here; Approve lets that exact call run once, within 60 minutes,
 * and the agent is told to run it again. Deny refuses it, and the agent is told.
 *
 * Everything shown is main's own copy of the request, never tasks.json. Approve and
 * Deny go to main over IPC, the only way a grant is made. Renders nothing while no
 * request is open.
 */
export function ApprovalsPanel({ onCount }: { onCount?: (n: number) => void }) {
  const { t: translate } = useTranslation();
  const [open, setOpen] = useState<ApprovalView[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const list = approvalsToShow(await window.cth.guardrailApprovals());
      setOpen(list);
      onCount?.(list.length);
    } catch { /* keep what is shown */ }
  }, [onCount]);

  useEffect(() => {
    void refresh();
    const off = window.cth.onGuardrailApprovalsChanged(() => { void refresh(); });
    // Expiry happens in main without a click: look again now and then.
    const timer = setInterval(() => { void refresh(); }, 60_000);
    return () => { off(); clearInterval(timer); };
  }, [refresh]);

  if (open.length === 0) return null;

  const decide = async (id: string, approve: boolean) => {
    setBusy(id);
    setError(null);
    try {
      const r = await window.cth.guardrailDecide(id, approve);
      if (!r.ok) setError(translate(r.error === 'gone' ? 'askMe.approvals.gone' : 'askMe.approvals.failed'));
    } catch {
      setError(translate('askMe.approvals.failed'));
    } finally {
      setBusy(null);
      void refresh();
    }
  };

  const time = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 12, color: 'var(--cth-ink-500)' }}>{translate('askMe.approvals.title', { count: open.length })}</div>
      {error && <div role="alert" style={{ fontSize: 11, color: 'var(--cth-coral)' }}>{error}</div>}
      {open.map((a) => (
        <div key={a.id} style={{ background: 'var(--cth-paper-100)', boxShadow: 'inset 0 0 0 1px var(--cth-ink-100)', display: 'flex', flexDirection: 'column' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '6px 9px',
            background: 'var(--cth-lilac-light, #ece2f5)', boxShadow: 'inset 0 -1px 0 var(--cth-ink-700)'
          }}>
            <span style={{ flex: 1, minWidth: 0, fontSize: 15, color: 'var(--cth-ink-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {translate('askMe.approvals.cardTitle', { tool: a.tool })}
            </span>
            <PixelBadge status="blocked" label={a.agent_name || a.agent_id} />
          </div>
          <div style={{ padding: '8px 9px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <pre dir="ltr" style={{
              margin: 0, padding: '6px 8px', background: 'var(--cth-paper-200)', boxShadow: 'inset 0 0 0 1px var(--cth-ink-100)',
              fontFamily: 'var(--cth-font-mono)', fontSize: 13, color: 'var(--cth-ink-900)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'
            }}>{a.call}</pre>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 8, rowGap: 2, fontSize: 12 }}>
              {a.cwd && (<><span style={{ color: 'var(--cth-ink-500)' }}>{translate('askMe.approvals.folder')}</span><span dir="ltr" style={{ overflowWrap: 'anywhere' }}>{a.cwd}</span></>)}
              <span style={{ color: 'var(--cth-ink-500)' }}>{translate('askMe.approvals.rule')}</span>
              <span style={{ overflowWrap: 'anywhere' }}>{a.reason || a.rule_id}</span>
              <span style={{ color: 'var(--cth-ink-500)' }}>{translate('askMe.approvals.waiting')}</span>
              <span>{translate('askMe.approvals.until', { time: time(a.expires_at) })}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--cth-ink-500)' }}>{translate('askMe.approvals.once')}</div>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
              <PixelButton variant="secondary" size="sm" disabled={busy === a.id} onClick={() => void decide(a.id, false)}>
                {translate('askMe.approvals.deny')}
              </PixelButton>
              <PixelButton variant="primary" size="sm" disabled={busy === a.id} onClick={() => void decide(a.id, true)}>
                {translate('askMe.approvals.approve')}
              </PixelButton>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
