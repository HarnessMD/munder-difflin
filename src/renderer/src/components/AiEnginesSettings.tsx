import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { HarnessConfig, AgentProvider } from '@/store/config';
import { ProviderLogo } from './ProviderLogo';
import { OSS_BLOG_LINKS } from '@shared/ossModels';
import { inputStyle } from './pro/ui';
import { useConfigValue } from './settings/SettingsFrame';

/**
 * AiEnginesSettings — the v0.3.1 per-provider config surface for the BYOK CLI
 * engines (OpenCode · Crush · pi.dev · Qwen): local base-URL + default model →
 * HarnessConfig (`providerBaseUrls` / `providerDefaultModels`), keyed by CLI
 * provider. Non-secret; staged in the Settings page's draft, written by the
 * footer Save (0.5.3, "only one save button").
 * Their API keys moved to Settings > Keys & Secrets in 0.5.3
 * (settings/KeysSecretsSection.tsx), where they save with the page's one Save.
 * See hive/shared/cli-agents/settings-ui-schema.md.
 */

/** CLI engines that take a per-provider local base-URL + default model. `hint`
 *  values are technical endpoint descriptions — kept English (technical data). */
const CLIS: Array<{ id: AgentProvider; label: string; hint: string }> = [
  { id: 'opencode', label: 'OpenCode', hint: 'http://localhost:11434/v1 (Ollama) — injected as a local provider' },
  { id: 'crush', label: 'Crush', hint: 'OpenAI-compatible endpoint — used as the proxy upstream' },
  { id: 'pi', label: 'Pi', hint: 'local models are file-based (models.json); base-URL reserved' },
  { id: 'qwen', label: 'Qwen', hint: 'OpenAI-compatible endpoint — used as the proxy upstream' }
];

const labelStyle: CSSProperties = {
  fontFamily: 'var(--cth-font-display)',
  fontSize: 8,
  lineHeight: '12px',
  color: 'var(--cth-ink-700)',
  textTransform: 'uppercase'
};
const headStyle: CSSProperties = {
  fontFamily: 'var(--cth-font-display)', fontSize: 8, lineHeight: '12px',
  color: 'var(--cth-ink-500)', textTransform: 'uppercase', marginBottom: 2
};
const linkStyle: CSSProperties = { color: 'var(--cth-ink-900)', textDecoration: 'underline', cursor: 'pointer' };

export function AiEnginesSettings({ config }: { config: HarnessConfig }) {
  const { t } = useTranslation();
  // Base-URL + default model, as the page shows them (staged, else on disk).
  const [baseUrls, stageBaseUrls] = useConfigValue(config, 'providerBaseUrls', {});
  const [models, stageModels] = useConfigValue(config, 'providerDefaultModels', {});
  // An emptied field drops its key, so clearing a value you typed is no change.
  const put = <T extends Partial<Record<AgentProvider, string>>>(o: T, id: AgentProvider, value: string): T => {
    const next = { ...o };
    if (value.trim()) next[id] = value; else delete next[id];
    return next;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={headStyle}>{t('aiEngines.providers')}</div>
        <div style={{ fontSize: 12, color: 'var(--cth-ink-700)', lineHeight: '18px' }}>
          {t('aiEngines.providersDesc')}
        </div>
      </div>

      {/* Per-CLI local endpoint + default model */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={headStyle}>{t('aiEngines.localEndpoint')}</div>
        {CLIS.map((c) => (
          <div key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ProviderLogo provider={c.id} size={12} /> {c.label}
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                placeholder={`base-URL — ${c.hint}`}
                value={baseUrls[c.id] ?? ''}
                onChange={(e) => stageBaseUrls(put(baseUrls, c.id, e.target.value))}
                onBlur={(e) => { if (e.target.value !== e.target.value.trim()) stageBaseUrls(put(baseUrls, c.id, e.target.value.trim())); }}
                style={inputStyle}
              />
              <input
                placeholder={t('aiEngines.defaultModelPlaceholder')}
                value={models[c.id] ?? ''}
                onChange={(e) => stageModels(put(models, c.id, e.target.value))}
                onBlur={(e) => { if (e.target.value !== e.target.value.trim()) stageModels(put(models, c.id, e.target.value.trim())); }}
                style={{ ...inputStyle, maxWidth: 220 }}
              />
            </div>
          </div>
        ))}
        {/* Local-setup guides (ondev-c part-3) — link the two how-to blogs. */}
        <div style={{ fontSize: 12, color: 'var(--cth-ink-700)', lineHeight: '17px' }}>
          {t('aiEngines.runningOpenModels')}{' '}
          <a
            href={OSS_BLOG_LINKS.openModels}
            onClick={(e) => { e.preventDefault(); void window.cth.openExternal(OSS_BLOG_LINKS.openModels); }}
            style={linkStyle}
          >{t('aiEngines.runOnOpenModels')}</a>
          {' '}·{' '}
          <a
            href={OSS_BLOG_LINKS.macMini}
            onClick={(e) => { e.preventDefault(); void window.cth.openExternal(OSS_BLOG_LINKS.macMini); }}
            style={linkStyle}
          >{t('aiEngines.setUpMacMini')}</a>.
        </div>
      </div>

      {/* Unsandboxed-in-auto caveat (Pam guardrail #6) */}
      <div style={{
        fontSize: 12, color: 'var(--cth-ink-700)', lineHeight: '17px',
        padding: 8, boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)', background: 'var(--cth-paper-100)'
      }}>
        {t('aiEngines.autoModeCaveat')}
      </div>
    </div>
  );
}
