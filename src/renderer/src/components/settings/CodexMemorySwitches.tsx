/**
 * Settings, Memory and Knowledge: a switch per Codex agent that copies what Codex remembers by itself into search.
 * Off for every agent until a person turns it on, because a Codex memory can hold a person's or a customer's
 * details. What is copied, from where, and why: shared/codexMemory.ts.
 *
 * Only Codex agents are listed, and nothing is drawn when there is none. The switch acts at once and is not part
 * of the page's Save: on, the next mine pass writes codex-memory.md; off, main removes it now.
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { HarnessConfig } from '@/store/config';
import { useStore } from '@/store/store';
import { codexMemoryOnList } from '@shared/codexMemory';
import { PixelButton } from '../PixelButton';

export function CodexMemorySwitches({ config }: { config: HarnessConfig }) {
  const { t } = useTranslation();
  const agents = useStore((s) => s.agents);
  const codex = useMemo(() => agents.filter((a) => a.provider === 'codex'), [agents]);
  const [on, setOn] = useState<string[]>(() => codexMemoryOnList(config.agentCodexMemoryOn));
  useEffect(() => { setOn(codexMemoryOnList(config.agentCodexMemoryOn)); }, [config.agentCodexMemoryOn]);
  const [busy, setBusy] = useState<string | null>(null);

  if (codex.length === 0) return null;

  const flip = (agentId: string, next: boolean) => {
    setBusy(agentId);
    Promise.resolve()
      .then(() => window.cth.setAgentCodexMemory(agentId, next))
      .then((c) => setOn(codexMemoryOnList(c?.agentCodexMemoryOn)), () => undefined)
      .finally(() => setBusy(null));
  };

  return (
    <div data-codex-memory style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 13, lineHeight: '20px', color: 'var(--cth-ink-900)' }}>{t('settings.memory.codex.title')}</span>
        <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>{t('settings.memory.codex.desc')}</span>
      </div>
      {codex.map((a) => {
        const isOn = on.includes(a.id);
        return (
          <div
            key={a.id}
            data-codex-memory-agent={a.id}
            data-on={isOn ? '1' : '0'}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '8px 10px',
              boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)', background: 'var(--cth-cream-100)',
            }}
          >
            <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--cth-ink-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
              <span style={{ fontSize: 11.5, color: 'var(--cth-ink-500)' }}>{isOn ? t('settings.memory.codex.on') : t('settings.memory.codex.off')}</span>
            </span>
            <span style={{ opacity: busy === a.id ? 0.5 : 1 }}>
              <PixelButton
                variant={isOn ? 'primary' : 'secondary'}
                size="sm"
                disabled={busy === a.id}
                onClick={() => flip(a.id, !isOn)}
                title={`${a.name}: ${isOn ? t('common.on') : t('common.off')}`}
              >
                {isOn ? t('common.on') : t('common.off')}
              </PixelButton>
            </span>
          </div>
        );
      })}
    </div>
  );
}
