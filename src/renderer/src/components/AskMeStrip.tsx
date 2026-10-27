import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton } from './PixelButton';
import { useStore, type Agent } from '@/store/store';
import { type HiveTask, openQuestion, waitsOnHuman } from './TasksKanban';
import { compareByNewestAsk } from './askMeOrder';
import { answerOpenQuestion, dismissOpenQuestion } from './askMeActions';
import { isComposingKey } from '@shared/imeGuard';

const POLL_MS = 5000;

function parse(raw: unknown): HiveTask[] {
  const list = (raw && typeof raw === 'object' && Array.isArray((raw as { tasks?: unknown }).tasks))
    ? (raw as { tasks: HiveTask[] }).tasks
    : [];
  return list.filter((t) => !!t && typeof t === 'object');
}

/**
 * The open human questions for this desk, sitting on the composer instead of
 * only inside the Command Center Ask Me tab. Michael sees every unanswered
 * card. Anyone else sees the cards assigned to them.
 */
export function AskMeStrip({ agent }: { agent: Agent }) {
  const { t } = useTranslation();
  const drafts = useStore((s) => s.answerDrafts);
  const setAnswerDraft = useStore((s) => s.setAnswerDraft);
  const openTaskDetail = useStore((s) => s.openTaskDetail);
  const [tasks, setTasks] = useState<HiveTask[]>([]);
  const [sending, setSending] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try { setTasks(parse(await window.cth.hiveTasks())); } catch { /* keep last good */ }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => { void refresh(); }, POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const waiting = tasks
    .filter(waitsOnHuman)
    .filter((task) => agent.isGod || task.assignee === agent.id)
    .sort((a, b) => compareByNewestAsk(openQuestion(a), openQuestion(b)));

  if (waiting.length === 0) return null;

  const send = async (task: HiveTask) => {
    const text = (drafts[task.id] ?? '').trim();
    if (!text || sending) return;
    setSending(task.id);
    const result = await answerOpenQuestion(task.id, text);
    if (result.ok) {
      setAnswerDraft(task.id, '');
      await refresh();
    }
    setSending(null);
  };

  const dismiss = async (task: HiveTask) => {
    if (sending) return;
    setSending(task.id);
    const result = await dismissOpenQuestion(task.id);
    if (result.ok) await refresh();
    setSending(null);
  };

  return (
    <div style={{
      flexShrink: 0,
      borderTop: '1px solid var(--cth-ink-700)',
      background: 'var(--cth-paper-200)',
      padding: '8px 10px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      maxHeight: 220
    }}>
      <div style={{
        fontFamily: 'var(--cth-font-ui)',
        fontSize: 11,
        fontWeight: 700,
        color: 'var(--cth-ink-900)'
      }}>{t('askMe.inboxTitle', { count: waiting.length })}</div>
      <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
        {waiting.map((task) => {
          const open = openQuestion(task);
          if (!open) return null;
          const draft = drafts[task.id] ?? '';
          const busy = sending === task.id;
          return (
            <div key={task.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button
                type="button"
                onClick={() => openTaskDetail(task.id)}
                style={{
                  alignSelf: 'flex-start',
                  border: 'none',
                  background: 'transparent',
                  padding: 0,
                  cursor: 'pointer',
                  fontFamily: 'var(--cth-font-mono)',
                  fontSize: 11,
                  color: 'var(--cth-ink-900)',
                  textAlign: 'start'
                }}
              >{task.title || task.id}</button>
              <div style={{
                fontFamily: 'var(--cth-font-mono)',
                fontSize: 12,
                lineHeight: 1.35,
                color: 'var(--cth-ink-700)',
                whiteSpace: 'pre-wrap'
              }}>{open.q}</div>
              <textarea
                value={draft}
                aria-label={t('askMe.answerPlaceholder')}
                placeholder={t('askMe.answerPlaceholder')}
                onChange={(e) => setAnswerDraft(task.id, e.target.value)}
                onKeyDown={(e) => {
                  if (isComposingKey(e)) return;
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    void send(task);
                  }
                }}
                rows={2}
                style={{
                  resize: 'vertical',
                  width: '100%',
                  boxSizing: 'border-box',
                  fontFamily: 'var(--cth-font-mono)',
                  fontSize: 12,
                  color: 'var(--cth-ink-900)',
                  background: 'var(--cth-paper-100)',
                  border: '1px solid var(--cth-ink-300)',
                  padding: '4px 6px'
                }}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <PixelButton size="sm" disabled={busy || !draft.trim()} onClick={() => { void send(task); }}>
                  {busy ? t('askMe.sending') : t('askMe.respond')}
                </PixelButton>
                <PixelButton size="sm" variant="ghost" disabled={busy} title={t('askMe.dismissTitle')} onClick={() => { void dismiss(task); }}>
                  {t('askMe.dismissAria')}
                </PixelButton>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
