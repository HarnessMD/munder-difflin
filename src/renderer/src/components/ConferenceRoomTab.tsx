import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton } from './PixelButton';
import { SpritePortrait } from './SpritePortrait';
import { useStore, type Agent } from '@/store/store';

const MIN_SEATS = 2;
const MAX_SEATS = 4;

/**
 * CONFERENCE ROOM — pull 2–4 clones into a debate until they agree on a plan.
 * Michael chairs: he routes the mail, writes the tickets, and parks a deadlock
 * on Ask Me instead of inventing a compromise. No new IPC; one hiveSend.
 */
export function ConferenceRoomTab() {
  const { t } = useTranslation();
  const agents = useStore((s) => s.agents);
  const godName = agents.find((a) => a.isGod)?.name ?? 'the orchestrator';
  const candidates = useMemo(
    () => agents.filter((a) => !a.isGod && !a.isAssistant && !a.id.startsWith('worker-')),
    [agents]
  );

  const [topic, setTopic] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [noteBad, setNoteBad] = useState(false);

  const toggle = (id: string) => {
    setPicked((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_SEATS) return prev;
      return [...prev, id];
    });
  };

  const start = async () => {
    const body = topic.trim();
    if (!body || busy) return;
    if (picked.length < MIN_SEATS || picked.length > MAX_SEATS) {
      setNoteBad(true);
      setNote(t('conferenceRoom.needSeats', { min: MIN_SEATS, max: MAX_SEATS }));
      return;
    }
    const seated = picked
      .map((id) => candidates.find((a) => a.id === id))
      .filter((a): a is Agent => Boolean(a));
    if (seated.length < MIN_SEATS) {
      setNoteBad(true);
      setNote(t('conferenceRoom.needSeats', { min: MIN_SEATS, max: MAX_SEATS }));
      return;
    }

    const roster = seated
      .map((a) => `- ${a.name} (${a.id})`)
      .join('\n');
    const brief = [
      t('conferenceRoom.briefTitle'),
      '',
      t('conferenceRoom.briefTopic', { topic: body }),
      '',
      t('conferenceRoom.briefParticipants'),
      roster,
      '',
      t('conferenceRoom.briefRules', { godName })
    ].join('\n');

    setBusy(true);
    setNote(null);
    try {
      const res = await window.cth.hiveSend(
        {
          to: 'god',
          act: 'request',
          subject: t('conferenceRoom.mailSubject', { topic: body.slice(0, 72) }),
          body: brief
        },
        'human'
      );
      if (!res.ok) {
        setNoteBad(true);
        setNote(t('conferenceRoom.failed', { error: res.error ?? '?' }));
      } else {
        setNoteBad(false);
        setNote(t('conferenceRoom.started', { godName, count: seated.length }));
        setTopic('');
        setPicked([]);
        // Jump to Michael's terminal so the human sees the chair wake up —
        // otherwise "call the meeting" feels like a no-op while mail sits in inbox.
        const st = useStore.getState();
        const god = st.agents.find((a) => a.isGod);
        if (god) st.select(god.id);
        st.requestCommandCenterTab('terminal');
      }
    } catch (e) {
      setNoteBad(true);
      setNote(t('conferenceRoom.failed', { error: e instanceof Error ? e.message : String(e) }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      padding: '10px 12px 16px',
      overflow: 'auto',
      height: '100%',
      boxSizing: 'border-box'
    }}>
      <div>
        <div style={{
          fontFamily: 'var(--cth-font-ui)',
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--cth-ink-900)'
        }}>{t('conferenceRoom.title')}</div>
        <p style={{
          margin: '4px 0 0',
          fontFamily: 'var(--cth-font-ui)',
          fontSize: 12,
          color: 'var(--cth-ink-700)',
          lineHeight: 1.45,
          maxWidth: 520
        }}>{t('conferenceRoom.lead', { godName })}</p>
      </div>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{
          fontFamily: 'var(--cth-font-ui)',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.04,
          color: 'var(--cth-ink-700)',
          textTransform: 'uppercase'
        }}>{t('conferenceRoom.topicLabel')}</span>
        <textarea
          value={topic}
          rows={3}
          aria-label={t('conferenceRoom.topicLabel')}
          placeholder={t('conferenceRoom.topicPlaceholder')}
          onChange={(e) => setTopic(e.target.value)}
          style={{
            resize: 'vertical',
            width: '100%',
            boxSizing: 'border-box',
            fontFamily: 'var(--cth-font-mono)',
            fontSize: 12,
            color: 'var(--cth-ink-900)',
            background: 'var(--cth-paper-100)',
            border: '1px solid var(--cth-ink-300)',
            padding: '6px 8px'
          }}
        />
      </label>

      <div>
        <div style={{
          fontFamily: 'var(--cth-font-ui)',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.04,
          color: 'var(--cth-ink-700)',
          textTransform: 'uppercase',
          marginBottom: 6
        }}>{t('conferenceRoom.seatsLabel', { count: picked.length, max: MAX_SEATS })}</div>
        {candidates.length < MIN_SEATS ? (
          <p style={{
            margin: 0,
            fontFamily: 'var(--cth-font-ui)',
            fontSize: 12,
            color: 'var(--cth-ink-700)'
          }}>{t('conferenceRoom.needMoreAgents', { min: MIN_SEATS })}</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 6 }}>
            {candidates.map((a) => {
              const on = picked.includes(a.id);
              const full = !on && picked.length >= MAX_SEATS;
              return (
                <button
                  key={a.id}
                  type="button"
                  disabled={full}
                  onClick={() => toggle(a.id)}
                  aria-pressed={on}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    textAlign: 'left',
                    padding: '6px 8px',
                    cursor: full ? 'not-allowed' : 'pointer',
                    opacity: full ? 0.45 : 1,
                    background: on ? 'var(--cth-cream-200)' : 'var(--cth-paper-100)',
                    border: 'none',
                    boxShadow: on
                      ? 'inset 0 0 0 2px var(--cth-ink-900)'
                      : 'inset 0 0 0 1px var(--cth-ink-100)',
                    color: 'var(--cth-ink-900)',
                    fontFamily: 'var(--cth-font-ui)',
                    fontSize: 12
                  }}
                >
                  <SpritePortrait character={a.character} scale={1} />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.name}
                    </span>
                    <span style={{
                      fontFamily: 'var(--cth-font-mono)',
                      fontSize: 10,
                      color: 'var(--cth-ink-700)'
                    }}>{a.provider ?? 'cli'}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <PixelButton
          onClick={start}
          disabled={busy || !topic.trim() || picked.length < MIN_SEATS}
        >{busy ? t('conferenceRoom.starting') : t('conferenceRoom.start')}</PixelButton>
        <span style={{
          fontFamily: 'var(--cth-font-ui)',
          fontSize: 12,
          color: 'var(--cth-ink-700)'
        }}>{t('conferenceRoom.hint', { godName })}</span>
      </div>

      {note && (
        <p style={{
          margin: 0,
          fontFamily: 'var(--cth-font-ui)',
          fontSize: 12,
          color: noteBad ? 'var(--cth-coral)' : 'var(--cth-ink-900)'
        }}>{note}</p>
      )}
    </div>
  );
}
