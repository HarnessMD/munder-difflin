/**
 * SETTINGS (phase 4, plan 4.10): SettingsModal embedded as a page. The modal
 * is 2000 lines of working form and it stays one component; `chrome="inline"`
 * drops its overlay and dialog frame and nothing else, so PRO and Classic
 * cannot drift on what a setting does. Close goes home. ⌘, and every
 * `cth:open-settings` deep link land here in PRO (see ProShell).
 *
 * 0.4.10: `chrome="inline"` now also picks the form's LOOK, not only its frame
 * (pro/settings/chrome.ts). Until this release everything under the Bar — the
 * left nav, the headings, the inputs, the footer — was still the Classic pixel
 * form, so the page read as two designs stacked. The markup did not fork; only
 * the style set the form reads did.
 *
 * THE WORKSPACE (0.4.9 phase 1): under PRO the launch picker is gone, so the
 * bar carries the one door to switching or starting another workspace, a
 * sheet with the current folder, the recent ones, Open another and Create
 * new (pro/onboarding/WorkspacePicker, the HivePicker's data and doors).
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { HarnessConfig } from '@/store/config';
import { SettingsModal, type Section } from '../SettingsModal';
import { usePaneNav } from '../professional/paneNav';
import { ProIcon } from './icons';
import { Bar, Btn, Sheet } from './ui';
import { PRO_HOME } from './proNav';
import { WorkspacePicker, folderName } from './onboarding/WorkspacePicker';

/** `section` is the tab a deep link asked for (ProShell holds it). The form
 *  reads its opening tab once, on mount, so a new section remounts it: a deep
 *  link is a person clicking "set it now" and expecting to land on that tab. */
export function SettingsScreen({ config, section }: { config: HarnessConfig | null; section?: Section }) {
  const { t } = useTranslation();
  const nav = usePaneNav();
  const [workspace, setWorkspace] = useState(false);
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', fontFamily: 'var(--cth-font-ui)', color: 'var(--cth-ink-900)', background: 'var(--cth-cream-100)' }}>
      <Bar title={t('pro.menu.settings')}>
        {config && (
          <Btn onClick={() => setWorkspace(true)} title={config.harnessHome ?? undefined}>
            <ProIcon name="folder" size={14} />
            {t('pro.workspace.title')}
            {config.harnessHome && <span style={{ color: 'var(--cth-ink-500)', fontWeight: 400 }}>{folderName(config.harnessHome)}</span>}
          </Btn>
        )}
      </Bar>
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {config && <SettingsModal key={section ?? ''} config={config} initialSection={section} onClose={() => nav.go(PRO_HOME)} chrome="inline" />}
      </div>
      {workspace && config && (
        <Sheet onClose={() => setWorkspace(false)} width={560}>
          <WorkspacePicker config={config} onClose={() => setWorkspace(false)} />
        </Sheet>
      )}
    </div>
  );
}
