/**
 * THE ASK ME MODAL (0.5.3, the Pro rail V2 founder requirements 1 and 2).
 * "Clicking an Ask me item opens the Ask me modal so the user can answer right
 * there, without leaving the screen. Same modal as the bell, prefilled with
 * that question."
 *
 * One sheet, two doors: the bell on an agent's screen opens it on the whole
 * list, and a row of the Ask me section on an agent's Inbox thread opens it on
 * that row's question, which is drawn first with the caret in its answer box.
 * The list is the Inbox's Ask Me chat list (waitsOnHuman, newest ask first),
 * and every card answers through askMeActions, so the modal cannot become a
 * fourth protocol. Answering the last question closes the sheet.
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store/store';
import { openQuestion, waitsOnHuman } from '../TasksKanban';
import { compareByNewestAsk } from '../askMeOrder';
import { AskMeCard, DISMISS_ALL, useAskMeAct } from './AskMeCard';
import { closeAskMe, useAskMe } from './askMeModalStore';
import { useTaskLedger } from './taskData';
import { Btn, CloseX, Sheet } from './ui';
import { ProIcon } from './icons';

/** Mounted once in ProShell. Draws nothing until somebody calls openAskMe. */
export function AskMeModalHost() {
  const target = useAskMe();
  if (!target) return null;
  return <AskMeModal focusId={target.taskId} />;
}

function AskMeModal({ focusId }: { focusId?: string }) {
  const { t } = useTranslation();
  const openTaskDetail = useStore((s) => s.openTaskDetail);
  const { tasks, refresh } = useTaskLedger(5000);
  const { busy, act, dismissAll, gone } = useAskMeAct(refresh);
  // Dismiss all asks once, inline, never through a browser dialog.
  const [confirming, setConfirming] = useState(false);
  const waiting = useMemo(() => {
    // `gone`: Dismiss all clears the list at once, before the ledger re-reads.
    const list = (tasks ?? []).filter((x) => waitsOnHuman(x) && !gone.has(x.id)).sort((a, b) => compareByNewestAsk(openQuestion(a), openQuestion(b)));
    // The question the modal was opened on leads; the rest keep their order.
    const i = focusId ? list.findIndex((x) => x.id === focusId) : -1;
    return i > 0 ? [list[i], ...list.slice(0, i), ...list.slice(i + 1)] : list;
  }, [tasks, focusId, gone]);
  // Answered or dismissed everything that was waiting: the job is done, so
  // the sheet goes rather than sitting open on an empty list. Only once the
  // ledger has loaded, or an opening modal would close itself on its first
  // frame.
  const loaded = tasks !== null;
  useEffect(() => { if (loaded && waiting.length === 0 && busy === null) closeAskMe(); }, [loaded, waiting.length, busy]);
  return (
    <Sheet onClose={closeAskMe} width={620}>
      <div data-ask-me-modal style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px 12px 18px', borderBottom: '1px solid var(--cth-ink-300)' }}>
        <span style={{ width: 28, height: 28, borderRadius: 8, display: 'grid', placeItems: 'center', flexShrink: 0, background: 'var(--cth-status-waiting-tint)', color: 'var(--cth-status-waiting)' }}>
          <ProIcon name="ask" size={15} />
        </span>
        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--cth-ink-900)' }}>{t('pro.inbox.askme')}</h2>
          <span style={{ fontSize: 12, color: 'var(--cth-ink-500)' }}>{t('pro.inbox.askmeCount', { count: waiting.length })}</span>
        </span>
        {/* Founder, 24 Sep: "The ask me modal should have a dismiss all
            button if there are more than one." Two or more, then a confirm
            that names the count; then every question goes at once, in one
            call (dismissAllOpenQuestions, founder on rc.4). */}
        {waiting.length > 1 && !confirming && (
          <Btn kind="ghost" size="sm" disabled={busy !== null} dataAttrs={{ 'data-ask-me-dismiss-all': '' }} onClick={() => setConfirming(true)}>{t('pro.askMe.dismissAll')}</Btn>
        )}
        <CloseX onClick={closeAskMe} title={t('common.close')} />
      </div>
      {confirming && waiting.length > 1 && (
        <div data-ask-me-dismiss-confirm role="alertdialog" aria-label={t('pro.askMe.dismissAllConfirm', { count: waiting.length })} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px 10px 18px', borderBottom: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-100)' }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: 'var(--cth-ink-900)' }}>{t('pro.askMe.dismissAllConfirm', { count: waiting.length })}</span>
          <Btn kind="danger" size="sm" disabled={busy !== null} dataAttrs={{ 'data-ask-me-dismiss-all-yes': '' }} onClick={() => { void dismissAll(waiting).finally(() => setConfirming(false)); }}>{busy === DISMISS_ALL ? t('pro.askMe.dismissing') : t('pro.askMe.dismissAll')}</Btn>
          <Btn kind="ghost" size="sm" disabled={busy !== null} onClick={() => setConfirming(false)}>{t('pro.askMe.cancel')}</Btn>
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--cth-paper-100)' }}>
        {!loaded && <div style={{ color: 'var(--cth-ink-500)', fontSize: 13, textAlign: 'center', padding: 16 }}>{t('pro.askMe.loading')}</div>}
        {waiting.map((task, i) => (
          <AskMeCard
            key={task.id} task={task} busy={busy}
            focus={focusId ? task.id === focusId : i === 0}
            onAct={(x, what) => void act(x, what)}
            onOpenTask={(id) => { closeAskMe(); openTaskDetail(id); }}
          />
        ))}
      </div>
    </Sheet>
  );
}
