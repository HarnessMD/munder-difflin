/**
 * THE TASK SHEET (PRO). One card in full: the contract, the open ask with a
 * place to answer it, what it waits on, what it unblocks, its history, and
 * the controls. Prototype of record: hive/shared/design/app-v2/prototype.html
 * (the `sheet`). Opened the way every other surface opens a card, through
 * store.openTaskDetail(id); TaskSheetHost below is mounted INSIDE ProShell's
 * PaneNavProvider so "Open Jim" and "Ask Michael" can navigate, which the
 * app-wide Classic overlay cannot.
 *
 * WRITES, each through the door the Classic detail already uses:
 *   move       hive:patchTask { status }            one field, latest ledger
 *   answer     askMeActions.answerOpenQuestion       patch + notice to the god
 *   dismiss    askMeActions.dismissOpenQuestion      patch only
 *   delete     hive:deleteTask                       after a second click
 *   assign     the dispatch box on the god's screen  the human never writes a
 *   ask Michael                                      worker's inbox directly
 *
 * HISTORY IS ONLY WHAT THE CARD CARRIES (taskData.taskHistory): created,
 * asked, answered, dismissed. The ledger keeps no event trail and this sheet
 * does not pretend it does.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store/store';
import { MarkdownPreview } from '@/markdown/MarkdownPreview';
import { openQuestion, type HiveTask } from '../TasksKanban';
import { answerOpenQuestion, dismissOpenQuestion } from '../askMeActions';
import { usePaneNav } from '../professional/paneNav';
import { Btn, Chip, CloseX, Portrait, Sheet, fmtWhen, useAgentById, useNameFor } from './ui';
import { Priority, STATUS_TONE } from './TasksScreen';
import { taskHistory, unblocks, useTaskHygiene, useTaskLedger, waitsOn } from './taskData';
import { askNagDays } from '@shared/taskHygiene';

type Status = HiveTask['status'];
const STATUSES: Status[] = ['todo', 'doing', 'blocked', 'done'];

/** Mounted inside ProShell. Polls the ledger while a card is open so the sheet
 *  follows the god's edits, same cadence as the Classic overlay. */
export function TaskSheetHost() {
  const id = useStore((s) => s.taskDetailId);
  const close = useStore((s) => s.closeTaskDetail);
  const { tasks, refresh } = useTaskLedger(5000);
  if (!id || !tasks) return null;
  const task = tasks.find((x) => x.id === id);
  if (!task) return null;
  return <TaskSheet task={task} all={tasks} onClose={close} refresh={refresh} />;
}

export function TaskSheet({ task, all, onClose, refresh }: { task: HiveTask; all: HiveTask[]; onClose: () => void; refresh: () => Promise<void> }) {
  const { t, i18n } = useTranslation();
  const nav = usePaneNav();
  const nameFor = useNameFor();
  const agentById = useAgentById();
  const drafts = useStore((s) => s.answerDrafts);
  const setAnswerDraft = useStore((s) => s.setAnswerDraft);
  const [busy, setBusy] = useState<null | 'answer' | 'dismiss' | 'move' | 'delete'>(null);
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setArmed(false); setError(null); }, [task.id]);

  const assignee = agentById(task.assignee);
  const god = useStore((s) => s.agents.find((a) => a.isGod));
  const ask = openQuestion(task);
  const hygiene = useTaskHygiene();
  // W-A: how long the open question has waited, once past the nag threshold.
  const nag = askNagDays(task, hygiene, Date.now());
  const earlier = (task.humanQA ?? []).filter((e) => e !== ask);
  const deps = waitsOn(task, all);
  const dependents = unblocks(task, all);
  const history = taskHistory(task);
  const draft = drafts[task.id] ?? '';

  const move = async (status: Status) => {
    setBusy('move');
    try {
      const r = await window.cth.hivePatchTask(task.id, { status });
      if (!r.ok) setError(r.error ?? t('pro.sheet.failed'));
    } catch (e) { setError(String(e)); }
    await refresh();
    setBusy(null);
  };
  const answer = async () => {
    if (!draft.trim()) return;
    setBusy('answer');
    const ok = await answerOpenQuestion(task, draft).catch(() => false);
    if (ok) setAnswerDraft(task.id, ''); else setError(t('pro.sheet.failed'));
    await refresh();
    setBusy(null);
  };
  const dismiss = async () => {
    setBusy('dismiss');
    const ok = await dismissOpenQuestion(task).catch(() => false);
    if (!ok) setError(t('pro.sheet.failed'));
    await refresh();
    setBusy(null);
  };
  const remove = async () => {
    if (!armed) { setArmed(true); return; }
    setBusy('delete');
    try {
      const r = await window.cth.hiveDeleteTask(task.id);
      if (r.ok) { onClose(); return; }
      setError(r.error ?? t('pro.sheet.failed'));
    } catch (e) { setError(String(e)); }
    setBusy(null);
  };
  /** Both routes go through the god's dispatch box: the human never writes a
   *  worker's inbox (TaskDetailOverlay.assign has the same shape). */
  const seedGod = (text: string) => {
    if (!god) return;
    const st = useStore.getState();
    st.select(god.id);
    st.requestDispatchSeed(text);
    st.requestCommandCenterTab('floor');
    nav.go(`agent:${god.id}`);
    onClose();
  };
  const assign = () => seedGod(`Task: ${task.title}\nContext: ${task.description?.trim() || '(no description)'}\n`);
  const askMichael = () => seedGod(`About task ${task.id} ("${task.title}"):\n`);
  const openAgent = () => {
    const target = assignee ?? god;
    if (!target) return;
    nav.go(`agent:${target.id}`);
    onClose();
  };

  return (
    <Sheet onClose={onClose} width={820}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid var(--cth-ink-300)' }}>
        <span title={task.id} style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 12, color: 'var(--cth-ink-500)', maxWidth: '40%', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.id}</span>
        <Chip tone={STATUS_TONE[task.status]}>{t(`pro.tasks.status.${task.status}`)}</Chip>
        <h2 style={{ margin: 0, flex: 1, minWidth: 0, fontSize: 15, fontWeight: 600, color: 'var(--cth-ink-900)', lineHeight: '20px', wordBreak: 'break-word' }}>{task.title}</h2>
        <CloseX onClick={onClose} title={t('pro.sheet.close')} />
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 220px', gap: 24, padding: 18 }}>
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Section title={t('pro.sheet.description')}>
            {task.description?.trim()
              ? <div style={{ fontSize: 13, lineHeight: '19px', color: 'var(--cth-ink-900)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'var(--cth-font-mono)', padding: 12, background: 'var(--cth-cream-100)', border: '1px solid var(--cth-ink-100)', borderRadius: 8 }}>{task.description.trim()}</div>
              : <Muted>{t('pro.sheet.noDescription')}</Muted>}
          </Section>

          {ask && (
            <Section title={t('pro.sheet.asksYou')}>
              <div style={{ padding: 12, background: 'var(--cth-status-waiting-tint)', border: '1px solid var(--cth-accent-line)', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {nag !== null && <Chip tone="warn" style={{ alignSelf: 'flex-start' }}>{t('pro.tasks.askOpenDays', { count: nag })}</Chip>}
                <div style={{ fontSize: 13, color: 'var(--cth-ink-900)' }}><MarkdownPreview source={ask.q} variant="card" /></div>
                <textarea
                  value={draft}
                  onChange={(e) => setAnswerDraft(task.id, e.target.value)}
                  placeholder={t('pro.sheet.answerPlaceholder')}
                  rows={3}
                  style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', font: 'inherit', fontSize: 13, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-50)', color: 'var(--cth-ink-900)', outline: 'none' }}
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <Btn kind="primary" size="sm" onClick={() => void answer()} disabled={busy !== null || !draft.trim()}>{t('pro.sheet.answer')}</Btn>
                  <Btn kind="ghost" size="sm" onClick={() => void dismiss()} disabled={busy !== null}>{t('pro.sheet.dismiss')}</Btn>
                </div>
              </div>
            </Section>
          )}

          {earlier.length > 0 && (
            <Section title={t('pro.sheet.earlierAsks')}>
              {earlier.map((e, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
                  <div style={{ display: 'flex', gap: 8 }}><b style={{ color: 'var(--cth-ink-500)', flexShrink: 0 }}>Q</b><div style={{ minWidth: 0 }}><MarkdownPreview source={e.q} variant="card" /></div></div>
                  {e.a
                    ? <div style={{ display: 'flex', gap: 8 }}><b style={{ color: 'var(--cth-status-working)', flexShrink: 0 }}>A</b><div style={{ minWidth: 0 }}><MarkdownPreview source={e.a} variant="card" /></div></div>
                    : <Muted>{t('pro.sheet.dismissedAsk')}</Muted>}
                </div>
              ))}
            </Section>
          )}

          {deps.length > 0 && (
            <Section title={t('pro.sheet.waitsOn')}>
              {deps.map((d) => <DepRow key={d.id} task={d} trailing={<Chip tone={STATUS_TONE[d.status]}>{t(`pro.tasks.status.${d.status}`)}</Chip>} />)}
            </Section>
          )}
          {dependents.length > 0 && (
            <Section title={t('pro.sheet.unblocks')}>
              {dependents.map((d) => {
                const a = agentById(d.assignee);
                return <DepRow key={d.id} task={d} trailing={a ? <Portrait agent={a} size={20} /> : null} />;
              })}
            </Section>
          )}

          <Section title={t('pro.sheet.history')}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {history.map((h, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, fontSize: 12.5, color: 'var(--cth-ink-700)' }}>
                  <span style={{ fontFamily: 'var(--cth-font-mono)', color: 'var(--cth-ink-500)', flexShrink: 0, width: 64 }}>{fmtWhen(h.at, i18n.language)}</span>
                  <span>{t(`pro.sheet.event.${h.kind}`)}</span>
                </div>
              ))}
            </div>
          </Section>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Section title={t('pro.sheet.assignee')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {assignee
                ? <><Portrait agent={assignee} size={28} /><span style={{ fontSize: 13, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{assignee.name}</span></>
                : task.assignee
                  ? <span title={nameFor(task.assignee)} style={{ fontSize: 13, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nameFor(task.assignee)}</span>
                  : <Chip>{t('pro.tasks.unassigned')}</Chip>}
            </div>
            {god && <Btn size="sm" kind="ghost" onClick={assign} style={{ alignSelf: 'flex-start' }}>{t('pro.sheet.assignVia', { name: god.name })}</Btn>}
          </Section>
          <Section title={t('pro.sheet.priority')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}><Priority level={task.priority} />{t('pro.tasks.priority', { level: Math.max(1, Math.min(5, task.priority)) })}</div>
          </Section>
          <Section title={t('pro.sheet.created')}>
            <span style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 12.5 }}>{new Date(task.createdAt).toLocaleString(i18n.language)}</span>
          </Section>
          <Section title={t('pro.sheet.moveTo')}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {STATUSES.filter((s) => s !== task.status).map((s) => (
                <Btn key={s} size="sm" onClick={() => void move(s)} disabled={busy !== null} style={{ justifyContent: 'flex-start' }}>{t(`pro.tasks.status.${s}`)}</Btn>
              ))}
            </div>
          </Section>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 18px', borderTop: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-100)' }}>
        {god && <Btn size="sm" onClick={askMichael}>{t('pro.sheet.askGod', { name: god.name })}</Btn>}
        {(assignee ?? god) && <Btn size="sm" kind="ghost" onClick={openAgent}>{t('pro.sheet.open', { name: (assignee ?? god)!.name })}</Btn>}
        {error && <span style={{ fontSize: 12, color: 'var(--cth-status-blocked)', marginLeft: 8 }}>{error}</span>}
        <span style={{ flex: 1 }} />
        <Btn size="sm" kind="danger" onClick={() => void remove()} disabled={busy !== null}>{armed ? t('pro.sheet.deleteConfirm') : t('pro.sheet.delete')}</Btn>
        <Btn size="sm" kind="primary" onClick={onClose}>{t('pro.sheet.done')}</Btn>
      </div>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <h4 style={{ margin: 0, fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--cth-ink-500)' }}>{title}</h4>
      {children}
    </section>
  );
}
function Muted({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 13, color: 'var(--cth-ink-500)' }}>{children}</span>;
}
function DepRow({ task, trailing }: { task: HiveTask; trailing: React.ReactNode }) {
  const openTaskDetail = useStore((s) => s.openTaskDetail);
  return (
    <button type="button" onClick={() => openTaskDetail(task.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', font: 'inherit', textAlign: 'left', cursor: 'pointer', background: 'var(--cth-cream-100)', border: '1px solid var(--cth-ink-100)', borderRadius: 8, color: 'var(--cth-ink-900)', width: '100%' }}>
      <span title={task.id} style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 11, color: 'var(--cth-ink-500)', maxWidth: '45%', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.id}</span>
      <span style={{ flex: 1, minWidth: 0, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</span>
      {trailing}
    </button>
  );
}
