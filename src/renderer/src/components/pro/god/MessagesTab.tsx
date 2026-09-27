/**
 * Messages: the live stream between agents, as the orchestrator routed it.
 * The rows come from the Inbox's own reader (InboxScreen.useFloor, the
 * `hive:messages` door refreshed on every routed message), passed down by
 * the screen so the Routing tab reads the same list. Oldest at the top,
 * a day separator between days, the way a thread reads.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { FloorMessage } from '../InboxScreen';
import { Chip, Portrait, dayOf, fmtWhen, useAgentById, useNameFor, type ChipTone } from '../ui';
import { ProIcon } from '../icons';
import { useTechnical } from '../depth';
import { EmptyNote } from './pieces';

export const ACT_TONE: Record<FloorMessage['act'], ChipTone> = {
  request: 'accent', query: 'warn', done: 'ok', agree: 'ok', refuse: 'bad', inform: 'outline', propose: 'outline'
};

export function MessagesTab({ messages }: { messages: FloorMessage[] }) {
  const { t, i18n } = useTranslation();
  const technical = useTechnical();
  const nameFor = useNameFor();
  const agentById = useAgentById();
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }); }, [messages.length]);

  if (messages.length === 0) return <EmptyNote>{t('pro.god.messages.empty')}</EmptyNote>;

  // The door returns both copies of a message; a thread shows each once.
  const seen = new Set<string>();
  const ordered = [...messages]
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
    .filter((m) => { if (seen.has(m.id)) return false; seen.add(m.id); return true; });
  const items: ReactNode[] = [];
  let lastDay = '';
  for (const m of ordered) {
    const day = dayOf(m.created_at, i18n.language);
    const label = day.key === 'date' ? day.text : t(`pro.inbox.${day.key}`);
    if (label !== lastDay) {
      items.push(<div key={`d-${m.id}`} style={{ alignSelf: 'center', fontSize: 11, color: 'var(--cth-ink-500)', padding: '2px 10px', borderRadius: 10, background: 'var(--cth-cream-200)', margin: '4px 0' }}>{label}</div>);
      lastDay = label;
    }
    const me = m.from === 'human';
    const sender = agentById(m.from);
    const toLabel = m.to === 'broadcast' ? t('pro.inbox.everyone') : m.to === 'human' ? t('pro.you') : nameFor(m.to);
    items.push(
      <div key={m.id} style={{ display: 'flex', gap: 8, justifyContent: me ? 'flex-end' : 'flex-start', maxWidth: '100%' }}>
        {!me && (sender ? <Portrait agent={sender} size={28} /> : <span style={{ width: 28, height: 28, borderRadius: 7, display: 'grid', placeItems: 'center', background: 'var(--cth-cream-200)', color: 'var(--cth-ink-700)', flexShrink: 0 }}><ProIcon name="agents" size={14} /></span>)}
        <div
          title={technical ? `${m.id} · ${m.conversation}` : undefined}
          style={{ maxWidth: 'min(720px, 82%)', padding: '8px 12px', borderRadius: 12, background: me ? 'var(--cth-accent-soft)' : 'var(--cth-cream-100)', border: `1px solid ${me ? 'var(--cth-accent-line)' : 'var(--cth-ink-300)'}`, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--cth-ink-700)', fontWeight: 600, flexWrap: 'wrap' }}>
            <span>{me ? t('pro.you') : nameFor(m.from)}</span>
            <Chip tone={ACT_TONE[m.act] ?? 'outline'}>{t(`pro.god.act.${m.act}`)}</Chip>
            {toLabel && <span style={{ fontWeight: 400, color: 'var(--cth-ink-500)' }}>→ {toLabel}</span>}
            {m.requires_reply && !me && <Chip tone="warn">{t('pro.inbox.needsReply')}</Chip>}
          </div>
          {m.subject && <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--cth-ink-900)' }}>{m.subject}</div>}
          <div style={{ fontSize: 13, lineHeight: '19px', color: 'var(--cth-ink-900)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.body}</div>
          <div style={{ fontSize: 11, color: 'var(--cth-ink-500)', fontFamily: 'var(--cth-font-mono)', alignSelf: 'flex-end' }}>{fmtWhen(m.created_at, i18n.language)}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items}
      <div ref={bottom} />
    </div>
  );
}
