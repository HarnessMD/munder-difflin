import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Push translated native-menu labels to main over menu:setLabels.
 *
 * Main owns no i18n (no locale files outside the renderer bundle), so the
 * renderer — the single source of truth — pushes all 13 nativeMenu.* labels
 * on mount and on every language switch, and main rebuilds the app menu.
 * English until the first push. Role-generated submenus (View/Window) stay
 * in Electron's default language by design (see installAppMenu).
 *
 * Mounted once, near the root, next to the other sync hooks.
 */
export function useMenuLabelsSync(): void {
  const { t, i18n } = useTranslation();
  useEffect(() => {
    const push = (): void => {
      try {
        const labels: Record<string, string> = {
          file: t('nativeMenu.file'),
          edit: t('nativeMenu.edit'),
          view: t('nativeMenu.view'),
          window: t('nativeMenu.window'),
          newFloor: t('nativeMenu.newFloor'),
          undo: t('nativeMenu.undo'),
          redo: t('nativeMenu.redo'),
          cut: t('nativeMenu.cut'),
          copy: t('nativeMenu.copy'),
          paste: t('nativeMenu.paste'),
          selectAll: t('nativeMenu.selectAll'),
          quit: t('nativeMenu.quit'),
          close: t('nativeMenu.close')
        };
        void window.cth.setMenuLabels(labels).catch(() => { /* menu keeps old labels */ });
      } catch { /* preload bridge absent (tests) — menu stays English */ }
    };
    push();
    i18n.on('languageChanged', push);
    return () => { i18n.off('languageChanged', push); };
  }, [i18n, t]);
}
