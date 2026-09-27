/**
 * THE WORKSPACE PICKER, PRO (v0.4.9 phase 1). Under PRO the launch picker is
 * gone: an install with a current workspace opens it, and this is where a
 * person with several workspaces switches or starts another. Reached from
 * Settings (SettingsScreen's bar), drawn in a sheet.
 *
 * Same data and the same doors as the Classic HivePicker: `harnessHome` and
 * `recentHives` from the config, `chooseFolder` to browse, and
 * `changeHome(path, 'fresh')`, which re-points the app at the folder and
 * relaunches it (bootstrapping an empty one, or reusing what is there).
 * Success never returns; a return is an error and is shown.
 */
import { useState } from 'react';
import { hiveFolderName } from '@shared/hivePaths';
import { useTranslation } from 'react-i18next';
import type { HarnessConfig } from '@/store/config';
import { ProIcon } from '../icons';
import { Btn, Chip, CloseX, Row, SectionH } from '../ui';
import { ErrorLine, Note } from './OnboardFrame';

/** Set right before a switch so Classic's launch picker (which App.tsx reads
 *  and clears on mount) does not come back for the folder just chosen when
 *  the relaunch lands in that skin. */
const SKIP_KEY = 'cth.skipHivePickerOnce';

export // 0.5.3, bug 12: both separators, or a Windows row shows its whole path as
// its name. The rule is shared with the other picker (@shared/hivePaths).
const folderName = hiveFolderName;

export function WorkspacePicker({ config, onClose }: { config: HarnessConfig; onClose: () => void }) {
  const { t } = useTranslation();
  const current = config.harnessHome;
  const recents = (config.recentHives ?? []).filter((h) => h && h !== current);
  const [busy, setBusy] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();

  const open = async (path: string) => {
    if (!path) return;
    if (current && path === current) { onClose(); return; }
    setError(undefined);
    setBusy(path);
    try {
      window.localStorage.setItem(SKIP_KEY, '1');
      const res = await window.cth.changeHome(path, 'fresh');
      if (!res.ok) {
        window.localStorage.removeItem(SKIP_KEY);
        setError(res.error ?? t('pro.workspace.errOpen'));
        setBusy(undefined);
      }
    } catch (e) {
      window.localStorage.removeItem(SKIP_KEY);
      setError(e instanceof Error ? e.message : String(e));
      setBusy(undefined);
    }
  };

  const browse = async () => {
    setError(undefined);
    const res = await window.cth.chooseFolder();
    if (res.ok) void open(res.path);
    else if (res.error !== 'cancelled') setError(res.error);
  };

  const mono = { fontFamily: 'var(--cth-font-mono)', fontSize: 11.5 } as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px 0 20px' }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, flex: 1 }}>{t('pro.workspace.title')}</h2>
        <CloseX onClick={onClose} title={t('pro.workspace.close')} />
      </div>
      <div style={{ padding: '8px 20px 20px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
        <Note>{t('pro.workspace.lead')}</Note>

        {current && (
          <div>
            <SectionH>{t('pro.workspace.current')}</SectionH>
            <Row
              icon={<ProIcon name="folder" size={16} />}
              title={folderName(current)}
              sub={<span style={mono} title={current}>{current}</span>}
              right={<Chip tone="accent">{t('pro.workspace.current')}</Chip>}
              style={{ padding: '8px 4px' }}
            />
          </div>
        )}

        {recents.length > 0 && (
          <div>
            <SectionH>{t('pro.workspace.recent')}</SectionH>
            <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 240, overflowY: 'auto' }}>
              {recents.map((h) => (
                <Row
                  key={h}
                  icon={<ProIcon name="folder" size={16} />}
                  title={folderName(h)}
                  sub={<span style={mono} title={h}>{h}</span>}
                  right={<Btn size="sm" disabled={!!busy} onClick={() => { void open(h); }}>{busy === h ? t('pro.onboarding.team.opening') : t('pro.workspace.switch')}</Btn>}
                  style={{ padding: '8px 4px', opacity: busy && busy !== h ? 0.5 : 1 }}
                />
              ))}
            </div>
          </div>
        )}

        {error && <ErrorLine>{error}</ErrorLine>}
        {busy && <Note>{t('pro.workspace.opening', { name: folderName(busy) })}</Note>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: 4 }}>
          <Btn disabled={!!busy} onClick={() => { void browse(); }}><ProIcon name="folder" size={14} />{t('pro.workspace.openAnother')}</Btn>
          <Btn disabled={!!busy} onClick={() => { void browse(); }}><ProIcon name="plus" size={14} />{t('pro.workspace.createNew')}</Btn>
        </div>
        <Note>{t('pro.workspace.note')}</Note>
      </div>
    </div>
  );
}
