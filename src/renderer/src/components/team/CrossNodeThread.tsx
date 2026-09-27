/**
 * D11 — your orchestrator talking to a teammate's orchestrator.
 *
 * No chat bubbles. Each message is a plain block, because this is a work
 * record and not a messaging app.
 *
 * The strip under a message showing which of YOUR agents picked it up is the
 * thing that makes the product feel alive, and it is also the honest boundary:
 * you can see what arrived on your own floor and never what happened on theirs.
 *
 * 0.4.10, THE THREE THINGS THIS THREAD WAS MISSING:
 *
 *   MARKDOWN AT BOTH ENDS. Every agent in this app writes Markdown, and this
 *   thread rendered it as plain text, so the person on the other machine read
 *   asterisks. The body now goes through the same `ClampedMarkdown` the agent
 *   thread uses, imported from it rather than copied, so the two surfaces
 *   cannot drift into expanding a long message in two different ways.
 *
 *   A SHAPE. A message is a subject, a body, an act and whether a reply is
 *   wanted (`@shared/teamMessage`), composed in `DraftComposer` and sent whole.
 *   The subject is drawn as a subject rather than folded into the first line of
 *   the body, which is what the old thread did to make one string carry two.
 *
 *   A BUDGET, SHOWN BEFORE IT BITES. `turnsLeft` counts the whole thread, both
 *   sides, through `turnsUsed`: a send of YOURS that ended `failed` never
 *   reached anyone and buys no turn (0.4.11). It is a chip in the header from
 *   the first message, not a refusal that arrives at the fourth. And a spent
 *   thread has a door now: the composer's Start a new thread asks main to
 *   archive the pair's thread file, the store pushes, and this view reloads
 *   itself empty with the budget whole.
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GlyphAvatar, SteppedDots, StatusDot } from './primitives';
import { MOCK_SELF, MOCK_THREAD } from './mockTeam';
import { useThread } from './teamsThreads';
import { useRoster } from './useRoster';
import { DraftComposer } from './DraftComposer';
import { ClampedMarkdown } from '../pro/AgentInbox';
import {
  MESSAGE_ACTS, crossUserBrief, turnsLeft, turnsUsed,
  type DraftMessage, type MessageAct
} from '@shared/teamMessage';
import type { ThreadEntry } from '@shared/teams';
import type { Teammate, ThreadMessage } from './types';
import { Btn, Chip, CodeBox, Panel } from '../pro/ui';

export interface CrossNodeThreadProps {
  mate: Teammate;
  /* The thread is injectable so a caller can supply real messages. Until the
     relay lands the default is the fixture, which is what every existing call
     site already got. It is also the only way to show a delivery state the
     fixture does not happen to contain: `queued` and `failed` were unreachable
     while this was hardcoded, so the preview frame labelled "queued" was in
     fact rendering "sending". */
  thread?: ThreadMessage[];
}

/**
 * A row as this thread draws it. `ThreadMessage` is the shape the boards and
 * the fixtures pass in and is not widened here; the two fields the message
 * contract added ride alongside it and are simply absent on a fixture row.
 */
type ThreadItem = ThreadMessage & { subject?: string; act?: string; agent?: string };

/** The bridge's thread line, as D11 draws it. The subject stays a subject:
 *  folding it onto the first line of the body was how one string was made to
 *  carry two, and carrying two is what the message contract removed. */
function toMessage(e: ThreadEntry): ThreadItem {
  const at = new Date(e.at);
  return {
    id: e.id, from: e.from, body: e.body, delivery: e.delivery,
    subject: e.subject || undefined,
    act: e.act || undefined,
    agent: e.agent || undefined,
    at: Number.isFinite(at.getTime()) ? at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : e.at,
  };
}

export function CrossNodeThread({ mate, thread }: CrossNodeThreadProps) {
  const { t } = useTranslation();
  /* Three sources, in order: a caller-supplied thread (the boards), main's
     thread store (the app), the fixture (the harness, where no bridge exists). */
  const live = useThread(mate.id);
  const roster = useRoster();
  const messages: ThreadItem[] = thread
    ?? (live.thread ? live.thread.messages.map(toMessage) : (roster.isFixture ? MOCK_THREAD : []));
  const selfName = roster.self?.name ?? MOCK_SELF.name;
  const [sending, setSending] = useState(false);
  const [rules, setRules] = useState(false);
  /* A long message clamps to a handful of source lines; expanding it is kept
     per message id for as long as the thread stays mounted, which is exactly
     what the agent thread does with the same control. */
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const toggleExpanded = (id: string) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const api = typeof window === 'undefined' ? undefined : window.cth;
  const canSend = !!api?.teamsSend;
  /* The chip and the composer count the SAME entries the same way: through
     `turnsUsed`, so a failed send of your own spends nothing on either. */
  const used = turnsUsed(messages);
  const left = turnsLeft(used);

  /* The whole draft crosses the bridge. Flattening it back into one string to
     fit the old door would put the subject on the first line of the body,
     which is the shapelessness this release removes. */
  const send = async (draft: DraftMessage): Promise<boolean> => {
    if (!api?.teamsSend || sending) return false;
    setSending(true);
    try {
      // The bridge appends the message as `sending` and pushes, then updates
      // the delivery from the relay's 202; nothing here guesses either.
      await api.teamsSend(mate.id, draft);
      return true;
    } catch {
      return false;
    } finally {
      setSending(false);
    }
  };

  /* The composer's door out of a spent thread. Main archives the pair's
     thread file (renamed aside, history kept) and pushes `teams:thread`;
     `useThread` reloads, `messages` empties, and the composer reopens with
     the whole budget. Only passed when the bridge exists: on the boards and
     in the harness there is no door, and none is drawn. */
  const startNewThread = async (): Promise<boolean> => {
    if (!api?.teamsThreadNew) return false;
    try {
      const r = await api.teamsThreadNew(mate.id);
      return !!r.ok;
    } catch {
      return false;
    }
  };

  const theyAreOffline = mate.presence === 'offline';

  /* Newest at the bottom, and the bottom is where the list opens and stays:
     a message arriving while you read should land in view, not below the
     fold. The list scrolls itself rather than calling scrollIntoView, which
     would also drag whatever page this thread is embedded in. */
  const listRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, mate.id]);

  return (
    <Panel noPadding style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
        boxShadow: 'inset 0 -1px 0 var(--cth-ink-300)'
      }}>
        {/* Your own dot reads from the roster like everyone else's. It was
            hard coded to online here, which meant the app drew a liveness
            claim it had not checked; the Team screen and the profile were
            fixed in the same pass and this was the last of the three. */}
        <GlyphAvatar name={selfName} presence={roster.self?.presence ?? 'offline'} size={24} />
        <GlyphAvatar name={mate.name} presence={mate.presence} size={24} />
        <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--cth-ink-900)' }}>
          {/* THEIR ORCHESTRATOR IS THEIRS (founder, 6 Sep 2026, item 10). The
              string used {{godName}} twice, and `godName` is a GLOBAL default
              injected by i18n (i18n/useGodNameSync.ts), so the second slot
              could only ever render a copy of yours: the title claimed the
              teammate's agent was called what yours is called. `bossName` was
              already on the wire (relay.ts RelayMember) and already on
              `Teammate`; nothing was fetching it here. An older relay omits
              it, and then the honest word is the generic one, not yours. */}
          {t('team.thread.between', {
            name: mate.name,
            theirGodName: mate.bossName?.trim() || t('team.thread.theirOrchestrator')
          })}
        </span>
        <Chip tone={left === 0 ? 'bad' : 'muted'} title={t('team.thread.turnsTitle')}>
          {t('team.thread.turnsLeft', { count: left })}
        </Chip>
        <Btn size="sm" kind="ghost" onClick={() => setRules((v) => !v)}>
          {rules ? t('team.thread.rulesHide') : t('team.thread.rules')}
        </Btn>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          height: 20, padding: '0 8px',
          borderRadius: 'var(--cth-radius-sm, 6px)',
          boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)',
          fontSize: 11, color: 'var(--cth-ink-700)'
        }}>
          <LockGlyph /> {t('team.thread.encrypted')}
        </span>
      </header>

      {/* The brief verbatim, because it is the text the agents themselves are
          given. A paraphrase would let the two say different things. */}
      {rules && (
        <div style={{ padding: '12px 16px 0' }}>
          <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--cth-ink-500)', lineHeight: 1.45 }}>
            {t('team.thread.rulesLead')}
          </p>
          <CodeBox>{crossUserBrief()}</CodeBox>
        </div>
      )}

      <div ref={listRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {messages.map(m => (
          <Message
            key={m.id} message={m} mate={mate}
            expanded={expanded.has(m.id)} onToggle={() => toggleExpanded(m.id)} />
        ))}

        {theyAreOffline && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 10px',
            borderRadius: 'var(--cth-radius-md, 8px)',
            background: 'var(--cth-cream-200)',
            fontSize: 12, color: 'var(--cth-ink-700)'
          }}>
            <ClockGlyph />
            {t('team.thread.offlineQueue', { name: mate.name.split(' ')[0] })}
          </div>
        )}
      </div>

      <DraftComposer
        mateName={mate.name.split(' ')[0]}
        mateGodName={mate.bossName?.trim() || t('team.thread.theirOrchestrator')}
        threadEntries={used}
        sending={sending}
        canSend={canSend}
        onSend={send}
        onStartNewThread={api?.teamsThreadNew ? startNewThread : undefined} />
    </Panel>
  );
}

function Message(
  { message, mate, expanded, onToggle }:
  { message: ThreadItem; mate: Teammate; expanded: boolean; onToggle: () => void }
) {
  const { t } = useTranslation();
  const mine = message.from === 'you';
  const who = mine ? t('team.you') : mate.name;
  /* An act the contract knows gets a chip. Anything else came from an older
     sender and is left undrawn rather than shown as a raw token. */
  const act = MESSAGE_ACTS.includes(message.act as MessageAct) ? message.act as MessageAct : null;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 6,
      alignItems: mine ? 'flex-end' : 'flex-start'
    }}>
      <div style={{
        maxWidth: '78%', minWidth: 0,
        padding: 12,
        borderRadius: 'var(--cth-radius-lg, 10px)',
        background: mine ? 'var(--cth-cream-100)' : 'var(--cth-cream-200)',
        boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)',
        display: 'flex', flexDirection: 'column', gap: 6,
        fontSize: 13, lineHeight: '20px', color: 'var(--cth-ink-900)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <GlyphAvatar
            name={who} presence={mine ? 'online' : mate.presence} size={20}
            surface={mine ? 'var(--cth-cream-100)' : 'var(--cth-cream-200)'} />
          <span style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 6, fontSize: 13, fontWeight: 500, color: 'var(--cth-ink-900)' }}>
            <span>{who}</span>
            {/* 0.5.2: which agent wrote, when the message named one. Theirs
                came inside the sealed message; yours is the local agent. */}
            {message.agent && (
              <span style={{ fontWeight: 400, color: 'var(--cth-ink-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>· {message.agent}</span>
            )}
          </span>
          {act && <Chip tone="outline">{t(`team.thread.acts.${act}`)}</Chip>}
          <span style={{
            fontFamily: 'var(--cth-font-mono)', fontSize: 11, color: 'var(--cth-ink-500)'
          }}>{message.at}</span>
        </div>

        {message.subject && (
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--cth-ink-900)' }}>{message.subject}</div>
        )}

        {/* The same clamp and the same control as the agent thread, imported
            from it. An agent writes Markdown at one end and it is read as
            Markdown at the other, which is the whole point of the format rule. */}
        <ClampedMarkdown source={message.body} expanded={expanded} onToggle={onToggle} />

        {message.delivery !== 'delivered' && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 12,
            color: message.delivery === 'failed'
              ? 'var(--cth-status-blocked)' : 'var(--cth-ink-500)'
          }}>
            {message.delivery === 'sending' && <><SteppedDots color="var(--cth-ink-500)" />{t('team.thread.sending')}</>}
            {message.delivery === 'queued' && <><ClockGlyph />{t('team.thread.queued')}</>}
            {message.delivery === 'failed' && t('team.thread.failed')}
          </span>
        )}
      </div>

      {/* Only your own agents, and only on messages that caused local work. */}
      {message.pickedUpBy && message.pickedUpBy.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '4px 8px',
          borderRadius: 'var(--cth-radius-sm, 6px)',
          background: 'var(--cth-cream-200)'
        }}>
          <span style={{ fontSize: 11, color: 'var(--cth-ink-500)' }}>
            {t('team.thread.pickedUp')}
          </span>
          {message.pickedUpBy.map(a => (
            <span key={a.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <StatusDot status={a.status === 'success' ? 'success' : a.status} />
              <span style={{ fontSize: 11, color: 'var(--cth-ink-700)' }}>{a.name}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

const stroke = {
  fill: 'none', stroke: 'currentColor', strokeWidth: 1.25,
  strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const
};

function LockGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 20 20" {...stroke} aria-hidden>
      <rect x="4.5" y="8.5" width="11" height="8" rx="1.5" />
      <path d="M7 8.5V6a3 3 0 0 1 6 0v2.5" />
    </svg>
  );
}

function ClockGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 20 20" {...stroke} aria-hidden>
      <circle cx="10" cy="10" r="6.5" />
      <path d="M10 6.5V10l2.5 1.5" />
    </svg>
  );
}
