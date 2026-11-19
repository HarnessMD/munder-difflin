// Ported from Prozzta/guppyos 02d0d50b (MIT).
/**
 * After main reloaded a crashed or hung window, say so once, in the
 * bottom corner until OK. crashReload.ts tells a crash reload from an ordinary
 * one; nothing here asks main. Its own root in main.tsx, so it shows over the
 * hive picker as well as over the app.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton } from './PixelButton';
import { crashReloadAtBoot } from './crashReload';

export function RecoveryNotice() {
  const { t, i18n } = useTranslation();
  const [crash, setCrash] = useState(() => crashReloadAtBoot());
  if (!crash) return null;
  const time = new Date(crash.at).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });
  return (
    <div
      role="status"
      data-recovery-notice
      style={{
        position: 'fixed', insetInlineStart: 16, bottom: 16, zIndex: 1000, maxWidth: 360,
        padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6,
        fontFamily: 'var(--cth-font-ui)', fontSize: 'var(--cth-text-body-sm)', lineHeight: 'var(--cth-lh-body-sm)',
        background: 'var(--cth-paper-100)', color: 'var(--cth-ink-900)',
        boxShadow: 'inset 0 0 0 1px var(--cth-ink-500), var(--cth-shadow-hard)',
      }}
    >
      <b style={{ fontWeight: 700 }}>{t('recovery.title', { time })}</b>
      <span>{t('recovery.body')}</span>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <PixelButton variant="secondary" size="sm" onClick={() => setCrash(null)}>{t('recovery.ok')}</PixelButton>
      </div>
    </div>
  );
}
