/**
 * A sleeping agent's terminal shows its saved last screen (terminalPool's
 * sleepScreen). This small box over it says the agent is sleeping and offers
 * Wake, which starts it again in the same session (`window.cth.wakeAgent`).
 * While it wakes there is nothing to press. The orchestrator never sleeps.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store/store';
import { PixelButton } from './PixelButton';

const setWaking = (agentId: string, waking: boolean): void =>
  useStore.setState((s) => ({ agents: s.agents.map((a) => (a.id === agentId && (waking ? a.sleeping : a.waking) ? { ...a, waking } : a)) }));

export function SleepOverlay({ ptyId }: { ptyId: string }) {
  const { t } = useTranslation();
  const agent = useStore((s) => s.agents.find((a) => a.ptyId === ptyId));
  const [failed, setFailed] = useState(false);
  if (!agent || agent.isGod || !(agent.sleeping || agent.waking)) return null;
  const waking = agent.waking === true;
  const wake = async (): Promise<void> => {
    setFailed(false);
    setWaking(agent.id, true);
    const r = await window.cth.wakeAgent(agent.id).catch(() => null);
    if (r?.ok === true) return;
    // Not started: it says Sleeping again, and the registry's next read agrees.
    setWaking(agent.id, false);
    setFailed(true);
  };
  return (
    <div
      role="status"
      data-agent-sleep={waking ? 'waking' : 'sleeping'}
      style={{
        position: 'absolute', top: 12, insetInlineEnd: 12, zIndex: 3, maxWidth: 300,
        display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 12px',
        background: 'var(--cth-paper-100)', color: 'var(--cth-ink-700)',
        boxShadow: 'inset 0 0 0 1px var(--cth-ink-500), var(--cth-shadow-hard)'
      }}
    >
      <span style={{ fontFamily: 'var(--cth-font-display)', fontSize: 8, lineHeight: '12px', textTransform: 'uppercase', color: 'var(--cth-ink-900)' }}>
        {waking ? t('pro.agentSleep.waking', 'Waking up') : t('pro.status.sleeping', 'Sleeping')}
      </span>
      <span style={{ fontSize: 12, lineHeight: '16px' }}>
        {waking
          ? t('pro.agentSleep.wakingDetail', 'Resuming this agent’s session. Your message stays queued until it is ready.')
          : t('pro.agentSleep.detail', 'This agent is resting to save resources. Send a message to wake it and continue the same conversation.')}
      </span>
      {failed && (
        <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-status-blocked)' }}>
          {t('pro.agentSleep.wakeFailed', { name: agent.name, defaultValue: 'Could not wake {{name}}.' })}
        </span>
      )}
      {!waking && (
        <PixelButton
          variant="primary"
          size="sm"
          onClick={() => { void wake(); }}
          title={t('pro.agentSleep.wakeTitle', { name: agent.name, defaultValue: 'Wake {{name}}' })}
          dataAttrs={{ 'data-agent-wake': '' }}
          style={{ alignSelf: 'flex-start' }}
        >
          {t('pro.agentSleep.wake', 'Wake')}
        </PixelButton>
      )}
    </div>
  );
}
