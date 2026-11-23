/**
 * A queued message that was typed into the agent's terminal and is still
 * sitting in its input box (autosend, 0.5.5: main pressed the submit key four
 * times and never saw the CLI take it). The queue holds behind it, so the row
 * says so and offers the two ways out:
 *  - Press Return: the key once more, alone. What is in the box is sent as is.
 *  - Type again: the whole message, for when the person cleared the box.
 * When the agent restarted first (boxGone, F30) there is no box to press in, and
 * the message may have gone in: only Type again is offered, and the row says so.
 * So when the agent moved after the Enter with no prompt taken (moved,
 * trigger-prompt-058): the Enter may have answered something on its screen.
 *
 * A notice in the waiting colour with an even 1px border, not a failure: the
 * app did nothing wrong that the person must fix, it cannot see the proof.
 */
import { useTranslation } from 'react-i18next';
import { useStore, type QueuedMessage } from '@/store/store';

export function StuckQueueNotice({ agentId, agentName, message }: { agentId: string; agentName: string; message: QueuedMessage }) {
  const { t } = useTranslation();
  const setStuck = useStore((s) => s.setQueuedMessageStuck);
  const stuck = message.stuck;
  if (!stuck) return null;
  const word = stuck.moved ? 'moved' : stuck.boxGone ? 'boxGone' : 'stuck';
  const action = {
    border: 'none', background: 'transparent', cursor: 'pointer', padding: 0,
    fontFamily: 'var(--cth-font-ui)', fontSize: 12, lineHeight: '16px',
    color: 'var(--cth-ink-900)', textDecoration: 'underline'
  } as const;
  return (
    <div data-testid="queue-stuck" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <span
        title={t(`queueComposer.${word}Title`, { name: agentName })}
        style={{
          display: 'inline-flex', alignItems: 'center', padding: '0 6px',
          fontFamily: 'var(--cth-font-ui)', fontSize: 11, lineHeight: '16px',
          color: 'var(--cth-ink-900)',
          background: 'var(--cth-status-waiting-tint, transparent)',
          boxShadow: 'inset 0 0 0 1px var(--cth-status-waiting)'
        }}
      >{t(`queueComposer.${word}Chip`)}</span>
      {word === 'stuck' && <button
        type="button"
        data-stuck-press={message.id}
        onClick={() => setStuck(agentId, message.id, { ...stuck, pressNow: true })}
        title={t('queueComposer.pressReturnTitle')}
        style={action}
      >{t('queueComposer.pressReturn')}</button>}
      <button
        type="button"
        data-stuck-retype={message.id}
        onClick={() => setStuck(agentId, message.id, null)}
        title={t('queueComposer.typeAgainTitle')}
        style={action}
      >{t('queueComposer.typeAgain')}</button>
    </div>
  );
}
