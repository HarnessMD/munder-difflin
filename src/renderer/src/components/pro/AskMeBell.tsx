/**
 * The Ask Me badge on an agent's screen (0.5.3, feature 5). Absent when no
 * question waits: a dead icon in the bar is the thing people learn to ignore.
 * It fills with the accent when THIS agent is the one asking. One click opens
 * the Ask me modal (0.5.3, Pro rail V2), the same sheet the Ask me section on
 * every agent's Inbox thread opens, so the question is answered without
 * leaving the screen.
 */
import { useTranslation } from 'react-i18next';
import { askMeBadge } from '@shared/askMeBadge';
import { waitsOnHuman } from '../TasksKanban';
import { ProIcon } from './icons';
import { openAskMe } from './askMeModalStore';
import { useTaskLedger } from './taskData';
import type { Agent } from '@/store/store';

export function AskMeBell({ agent }: { agent: Agent }) {
  const { t } = useTranslation();
  const { tasks } = useTaskLedger(10_000);
  const badge = askMeBadge((tasks ?? []).filter(waitsOnHuman), agent.id, agent.name, agent.isGod === true);
  if (badge.total === 0) return null;
  const hot = badge.mine > 0;
  // No plural keys: this app has none, and Arabic has six plural forms that a
  // one/other pair would leave holes in. One sentence for one, one for more.
  const title = hot
    ? (badge.mine === 1 ? t('pro.agent.askWaitingMineOne', { name: agent.name }) : t('pro.agent.askWaitingMineMany', { name: agent.name, count: badge.mine }))
    : (badge.total === 1 ? t('pro.agent.askWaitingOne') : t('pro.agent.askWaitingMany', { count: badge.total }));
  return (
    <button
      type="button" data-ask-me-bell data-hot={hot ? '1' : '0'} title={title} aria-label={title}
      onClick={() => openAskMe()}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, height: 28, padding: '0 8px', borderRadius: 7, flexShrink: 0,
        border: '1px solid var(--cth-accent)', cursor: 'pointer', font: 'inherit', fontSize: 12, fontWeight: 600,
        background: hot ? 'var(--cth-accent)' : 'var(--cth-accent-soft)',
        color: hot ? 'var(--cth-accent-ink)' : 'var(--cth-accent-text)'
      }}
    >
      <ProIcon name="ask" size={15} />
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{badge.total}</span>
    </button>
  );
}
