/**
 * THE AGENT'S TASKS TAB (0.5.3, founder on rc.4): every card this agent holds,
 * what it is and when, newest activity first, with search, a status filter and
 * a time window. The rules are agentTaskRules.ts; a row opens the task sheet.
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore, type Agent } from '@/store/store';
import type { HiveTask } from '../TasksKanban';
import { Chip, FilterChip, SearchBox, Seg } from './ui';
import { STATUS_TONE } from './TasksScreen';
import { STATUS_FILTERS, TIME_WINDOWS, agoText, filterAgentTasks, stampText, whenLine, type StatusFilter, type TimeWindow } from './agentTaskRules';

export function AgentTasks({ agent, tasks }: { agent: Agent; tasks: HiveTask[] | null }) {
  const { t, i18n } = useTranslation();
  const openTaskDetail = useStore((s) => s.openTaskDetail);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [win, setWin] = useState<TimeWindow>('all');
  const mine = tasks ?? [];
  const now = Date.now();
  const shown = useMemo(() => filterAgentTasks(mine, { status, window: win, query, now }), [mine, status, win, query]); // eslint-disable-line react-hooks/exhaustive-deps

  const when = (x: HiveTask): string => {
    const w = whenLine(x);
    if (!w) return '';
    const text = w.kind === 'started' || w.kind === 'added' ? stampText(w.at, i18n.language) : agoText(w.at, now, i18n.language);
    return t(`pro.agentTasks.when.${w.kind}`, { when: text });
  };

  return (
    <div data-agent-tasks style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: 'var(--cth-cream-50)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '10px 18px', borderBottom: '1px solid var(--cth-ink-300)', flexShrink: 0 }}>
        <SearchBox value={query} onChange={setQuery} placeholder={t('pro.agentTasks.search')} style={{ flex: '1 1 200px', maxWidth: 320 }} />
        <div role="group" aria-label={t('pro.agentTasks.statusLabel')} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {STATUS_FILTERS.map((s) => (
            <FilterChip key={s} on={status === s} onClick={() => setStatus(s)}>
              {s === 'all' ? t('pro.tasks.filter.all') : t(`pro.tasks.status.${s}`)}
            </FilterChip>
          ))}
        </div>
        <span style={{ flex: 1 }} />
        <Seg value={win} onChange={setWin} ariaLabel={t('pro.agentTasks.windowLabel')}
          options={TIME_WINDOWS.map((w) => ({ value: w, label: t(`pro.agentTasks.window.${w}`) }))} />
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '8px 18px 18px' }}>
        {tasks === null ? (
          <Empty>{t('pro.tasks.loading')}</Empty>
        ) : mine.length === 0 ? (
          <Empty>{t('pro.agentTasks.empty', { name: agent.name })}</Empty>
        ) : shown.length === 0 ? (
          <Empty>{t('pro.tasks.nothingMatches')}</Empty>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
            {shown.map((x) => (
              <li key={x.id}>
                <button type="button" data-agent-task={x.id} onClick={() => openTaskDetail(x.id)} style={{
                  width: '100%', display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) auto', alignItems: 'center', columnGap: 12, rowGap: 2,
                  padding: '10px 4px', border: 'none', borderBottom: '1px solid var(--cth-ink-100)', background: 'transparent',
                  font: 'inherit', textAlign: 'start', cursor: 'pointer', color: 'var(--cth-ink-900)'
                }}>
                  <span style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 11.5, color: 'var(--cth-ink-500)', whiteSpace: 'nowrap' }}>{x.id}</span>
                  <span style={{ fontSize: 13, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.title}</span>
                  <Chip tone={STATUS_TONE[x.status]}>{t(`pro.tasks.status.${x.status}`)}</Chip>
                  <span />
                  <span data-agent-task-when style={{ fontSize: 11.5, color: 'var(--cth-ink-500)' }}>{when(x)}</span>
                  <span />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Empty({ children }: { children: string }) {
  return <div style={{ padding: 32, textAlign: 'center', fontSize: 13, color: 'var(--cth-ink-500)' }}>{children}</div>;
}
