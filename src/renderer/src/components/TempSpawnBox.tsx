import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton } from './PixelButton';
import type { Agent } from '@/store/store';

/**
 * File one spawn-request for a short-lived worker. The watcher already caps
 * how many run at once and tears the worker down when the job is done.
 * A human click is allowed even when the orchestrator is not allowed to hire.
 */
export function TempSpawnBox({ agent, prominent = false }: { agent: Agent | null; prominent?: boolean }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(prominent);
  const [objective, setObjective] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [noteBad, setNoteBad] = useState(false);

  if (!agent) {
    return (
      <p style={{
        margin: 0,
        fontFamily: 'var(--cth-font-ui)',
        fontSize: 12,
        color: 'var(--cth-ink-700)'
      }}>{t('workersTab.tempNeedAgent')}</p>
    );
  }
  if (agent.id.startsWith('worker-')) {
    if (!prominent) return null;
    return (
      <p style={{
        margin: 0,
        fontFamily: 'var(--cth-font-ui)',
        fontSize: 12,
        color: 'var(--cth-ink-700)'
      }}>{t('workersTab.tempNeedAgent')}</p>
    );
  }

  const submit = async () => {
    const text = objective.trim();
    if (!text || busy) return;
    setBusy(true);
    setNote(null);
    try {
      const result = await window.cth.enqueueWorker({
        objective: text,
        cwd: agent.cwd,
        command: agent.command,
        provider: agent.provider,
        model: agent.model,
        fromAgentId: agent.id,
        fromAgentName: agent.name
      });
      if (!result.ok) {
        setNoteBad(true);
        setNote(result.error || t('workersTab.tempFailed'));
      } else {
        setNoteBad(false);
        setObjective('');
        setOpen(false);
        setNote(result.waiting ? t('workersTab.tempQueued') : t('workersTab.tempStarted'));
      }
    } catch {
      setNoteBad(true);
      setNote(t('workersTab.tempFailed'));
    }
    setBusy(false);
  };

  return (
    <div style={{
      flexShrink: 0,
      padding: prominent ? 0 : '6px 10px 0',
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }}>
      {!open ? (
        <button
          type="button"
          onClick={() => { setNote(null); setOpen(true); }}
          style={{
            alignSelf: 'flex-start',
            border: 'none',
            background: 'transparent',
            padding: 0,
            cursor: 'pointer',
            fontFamily: 'var(--cth-font-ui)',
            fontSize: 12,
            color: 'var(--cth-ink-700)'
          }}
        >{t('workersTab.startTemp', { name: agent.name })}</button>
      ) : (
        <>
          <div style={{
            fontFamily: 'var(--cth-font-ui)',
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--cth-ink-900)'
          }}>{t('workersTab.tempFor', { name: agent.name })}</div>
          <textarea
            value={objective}
            rows={3}
            aria-label={t('workersTab.tempObjective')}
            placeholder={t('workersTab.tempObjective')}
            onChange={(e) => setObjective(e.target.value)}
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
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <PixelButton size="sm" disabled={busy || !objective.trim()} onClick={() => { void submit(); }}>
              {busy ? t('workersTab.tempStarting') : t('workersTab.tempStart')}
            </PixelButton>
            {!prominent && (
              <PixelButton size="sm" variant="ghost" disabled={busy} onClick={() => setOpen(false)}>
                {t('workersTab.tempCancel')}
              </PixelButton>
            )}
          </div>
          <p style={{
            margin: 0,
            fontFamily: 'var(--cth-font-ui)',
            fontSize: 11,
            color: 'var(--cth-ink-500)',
            lineHeight: 1.35
          }}>{t('workersTab.tempHint')}</p>
        </>
      )}
      {note && (
        <div style={{
          fontFamily: 'var(--cth-font-mono)',
          fontSize: 11,
          color: noteBad ? 'var(--cth-coral)' : 'var(--cth-ink-700)'
        }}>{note}</div>
      )}
    </div>
  );
}
