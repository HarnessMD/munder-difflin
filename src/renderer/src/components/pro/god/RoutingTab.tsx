/**
 * Routing: what the orchestrator routed where. One line per message, newest
 * first: the time, the act, then from → to and the subject. Same rows as the
 * Messages tab (the Inbox's `hive:messages` reader), reduced to a log by
 * routingRows, which names a message once whichever copies the door sent.
 */
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import type { FloorMessage } from '../InboxScreen';
import { Chip, fmtWhen, useNameFor } from '../ui';
import { useTechnical } from '../depth';
import { countToday, routingRows } from './godData';
import { ACT_TONE } from './MessagesTab';
import { CardH, GodCard, GodGrid, Muted } from './pieces';

export function RoutingTab({ messages }: { messages: FloorMessage[] }) {
  const { t, i18n } = useTranslation();
  const technical = useTechnical();
  const nameFor = useNameFor();
  const rows = routingRows(messages);
  const today = countToday(rows);
  const who = (id: string) => id === 'broadcast' ? t('pro.inbox.everyone') : id === 'human' ? t('pro.you') : (nameFor(id) ?? id);

  return (
    <GodGrid columns={1}>
      <GodCard>
        <CardH right={<Chip tone="muted">{t('pro.god.routing.today', { count: today })}</Chip>}>{t('pro.god.routing.title')}</CardH>
        {rows.length === 0 && <Muted>{t('pro.god.routing.empty')}</Muted>}
        {rows.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'auto auto minmax(0, 1fr)', gap: '4px 10px', alignItems: 'center', fontSize: 12 }}>
            {rows.map((m) => (
              <Fragment key={m.id}>
                <time style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 11, color: 'var(--cth-ink-500)', whiteSpace: 'nowrap' }} title={technical ? new Date(m.created_at).toISOString() : undefined}>{fmtWhen(m.created_at, i18n.language)}</time>
                <Chip tone={ACT_TONE[m.act] ?? 'outline'}>{t(`pro.god.act.${m.act}`)}</Chip>
                <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--cth-ink-900)' }} title={technical ? `${m.id} · ${m.conversation}` : m.subject}>
                  <b style={{ fontWeight: 600 }}>{who(m.from)}</b>
                  <span style={{ color: 'var(--cth-ink-500)' }}> → </span>
                  <b style={{ fontWeight: 600 }}>{who(m.to)}</b>
                  {m.subject && <span style={{ color: 'var(--cth-ink-700)' }}> · {m.subject}</span>}
                  {m.requires_reply && <Chip tone="warn" style={{ marginLeft: 6 }}>{t('pro.inbox.needsReply')}</Chip>}
                </span>
              </Fragment>
            ))}
          </div>
        )}
      </GodCard>
    </GodGrid>
  );
}
