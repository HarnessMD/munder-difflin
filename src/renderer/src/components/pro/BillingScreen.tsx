/**
 * SUBSCRIPTION & BILLING (PRO phase 5). Admin only, twice: the drop-up draws
 * the row for `can(standing, 'billing.view')`, and main answers
 * `billing:summary` only when the relay-verified `/me` says this seat is an
 * admin. A member who somehow reaches this screen sees the refusal, not a
 * page of dashes.
 *
 * WHAT IS HERE: the plan state with its one date, seats and what they cost,
 * the card on file, the invoices with their receipts. Every figure is the
 * relay's; nothing is computed from a price list in the app (the org's own
 * rate is on the wire, and it is not the website's).
 *
 * WHAT IS NOT HERE, on purpose: changing seats, changing the card, paying.
 * Those are console routes with money behind them (C5) and the button for
 * each opens the console page where it happens, labelled so. A desktop
 * control that pretended to charge would be the false-claim defect.
 */
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { BillingSummary, BillingWire } from '@shared/billing';
import { fmtMoney, keyDateFor, monthlyTotalMinor, stateTone } from '@shared/billing';
import { consoleUrl } from '@shared/consoleLinks';
import { can } from '@shared/permissions';
import { useStanding } from '../team/teamsMode';
import { Bar, Btn, Chip, Kv, SectionH } from './ui';
import { ProIcon } from './icons';

type Load = { state: 'loading' } | { state: 'ready'; view: BillingWire; at: number } | { state: 'failed'; summary: Exclude<BillingSummary, { ok: true }> };

function useBilling(enabled: boolean): { load: Load; refresh: () => void } {
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const refresh = useCallback(() => {
    if (!enabled) { setLoad({ state: 'failed', summary: { ok: false, reason: 'refused' } }); return; }
    setLoad({ state: 'loading' });
    window.cth.billingSummary().then((s) => {
      setLoad(s.ok ? { state: 'ready', view: s.view, at: Date.now() } : { state: 'failed', summary: s });
    }).catch(() => setLoad({ state: 'failed', summary: { ok: false, reason: 'offline' } }));
  }, [enabled]);
  useEffect(() => { refresh(); }, [refresh]);
  return { load, refresh };
}

export function BillingScreen() {
  const { t, i18n } = useTranslation();
  const standing = useStanding();
  const allowed = can(standing, 'billing.view');
  const { load, refresh } = useBilling(allowed);
  const openConsole = () => { void window.open?.(consoleUrl('billing'), '_blank'); };
  const when = (iso: string | null) => iso ? new Date(iso).toLocaleDateString(i18n.language, { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', fontFamily: 'var(--cth-font-ui)', color: 'var(--cth-ink-900)' }}>
      <Bar title={t('pro.billing.title')} sub={load.state === 'ready' ? t('pro.billing.asOf', { when: new Date(load.at).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' }) }) : undefined}>
        <Btn kind="ghost" onClick={refresh} disabled={load.state === 'loading'}>{t('pro.billing.refresh')}</Btn>
        <Btn kind="primary" onClick={openConsole} title={t('pro.team.opensConsole')}>{t('pro.billing.manage')}<ProIcon name="external" size={12} /></Btn>
      </Bar>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 18px 32px' }}>
        {/* Full content width (pilot feedback item 18): the cards fill the
            screen like every other full page; no half-width column. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {load.state === 'loading' && <Note>{t('pro.billing.loading')}</Note>}
          {load.state === 'failed' && <Note tone={load.summary.reason === 'refused' ? 'bad' : 'warn'}>{t(`pro.billing.fail.${load.summary.reason}`)}</Note>}
          {load.state === 'ready' && <Ready view={load.view} when={when} onConsole={openConsole} />}
        </div>
      </div>
    </div>
  );
}

function Ready({ view, when, onConsole }: { view: BillingWire; when: (iso: string | null) => string; onConsole: () => void }) {
  const { t, i18n } = useTranslation();
  const money = (minor: number) => fmtMoney(minor, view.currency, i18n.language);
  const keyDate = keyDateFor(view);
  return (
    <>
      {/* Plan */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SectionH>{t('pro.billing.plan')}</SectionH>
          <Chip tone={stateTone(view.state)}>{t(`pro.billing.state.${view.state}`)}</Chip>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--cth-ink-700)', lineHeight: 1.5 }}>
          {t(`pro.billing.stateBlurb.${view.state}`, { when: when(keyDate) })}
        </p>
        <Kv rows={[
          { k: t('pro.billing.seats'), v: t('team.seats', { used: view.seatsUsed, total: view.seatsPaid }) },
          { k: t('pro.billing.perSeat'), v: t('pro.billing.perSeatValue', { amount: money(view.pricePerSeatMinor) }) },
          { k: t('pro.billing.monthly'), v: t('pro.billing.monthlyValue', { amount: money(monthlyTotalMinor(view)), seats: view.seatsPaid }) },
          ...(view.renewalAt ? [{ k: t('pro.billing.renews'), v: when(view.renewalAt) }] : [])
        ]} />
        <div><Btn size="sm" onClick={onConsole}>{t('pro.team.manageSeats')} · {t('pro.team.inConsole')}<ProIcon name="external" size={11} /></Btn></div>
      </Card>

      {/* Payment method */}
      <Card>
        <SectionH>{t('pro.billing.paymentMethod')}</SectionH>
        {view.card ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 13 }}>{view.card.brand.toUpperCase()} •••• {view.card.last4}</span>
            <span style={{ fontSize: 12, color: 'var(--cth-ink-500)' }}>{t('pro.billing.expires', { month: String(view.card.expiryMonth).padStart(2, '0'), year: view.card.expiryYear })}</span>
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: 12.5, color: 'var(--cth-ink-500)' }}>{t('pro.billing.noCard')}</p>
        )}
        <div><Btn size="sm" onClick={onConsole}>{t('pro.billing.changeCard')} · {t('pro.team.inConsole')}<ProIcon name="external" size={11} /></Btn></div>
      </Card>

      {/* Invoices */}
      <Card>
        <SectionH right={<span style={{ fontSize: 11, color: 'var(--cth-ink-500)' }}>{t('pro.billing.invoiceCount', { n: view.invoices.length })}</span>}>{t('pro.billing.invoices')}</SectionH>
        {view.invoices.length === 0 ? (
          <p style={{ margin: 0, fontSize: 12.5, color: 'var(--cth-ink-500)' }}>{t('pro.billing.noInvoices')}</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ fontSize: 11, color: 'var(--cth-ink-500)', textAlign: 'left' }}>
                {(['date', 'amount', 'status', 'receipt'] as const).map((h) => (
                  <th key={h} style={{ fontWeight: 600, padding: '6px 8px', borderBottom: '1px solid var(--cth-ink-300)', textTransform: 'uppercase', letterSpacing: 0.2 }}>{t(`pro.billing.col.${h}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {view.invoices.map((i) => (
                <tr key={i.invoiceId}>
                  <td style={cell}>{when(i.at)}</td>
                  <td style={{ ...cell, fontFamily: 'var(--cth-font-mono)' }}>{fmtMoney(i.amountMinor, i.currency, i18n.language)}</td>
                  <td style={cell}><Chip tone={i.status === 'paid' ? 'ok' : i.status === 'failed' ? 'bad' : 'muted'}>{t(`pro.billing.invoiceStatus.${i.status}`)}</Chip></td>
                  <td style={cell}>{i.receiptUrl ? <a href={i.receiptUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--cth-accent-text)' }}>{t('pro.billing.receipt')}</a> : <span style={{ color: 'var(--cth-ink-500)' }}>—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p style={{ margin: 0, fontSize: 11.5, color: 'var(--cth-ink-500)', lineHeight: 1.45 }}>{t('pro.billing.invoicesNote')}</p>
      </Card>
    </>
  );
}

const cell = { padding: '8px', borderBottom: '1px solid var(--cth-ink-100)', verticalAlign: 'middle' } as const;

function Card({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, border: '1px solid var(--cth-ink-300)', borderRadius: 12, background: 'var(--cth-cream-100)' }}>{children}</div>;
}

function Note({ children, tone = 'muted' }: { children: React.ReactNode; tone?: 'muted' | 'warn' | 'bad' }) {
  const color = tone === 'bad' ? 'var(--cth-status-blocked)' : tone === 'warn' ? 'var(--cth-status-waiting)' : 'var(--cth-ink-500)';
  return <div style={{ padding: '14px 16px', border: '1px solid var(--cth-ink-300)', borderRadius: 10, fontSize: 12.5, color, background: 'var(--cth-cream-100)' }}>{children}</div>;
}
