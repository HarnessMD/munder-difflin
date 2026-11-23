/**
 * The start of the app's bar off the Mac, where the window has no title bar or
 * menu row of its own (design/windowChrome.ts; Pam's limits-bar preview,
 * section G): the 16px app mark, then one button that holds the application
 * menu (File, Edit, View, Window, item for item), opened under it and drawn
 * pressed while it is open. Draws nothing on the Mac.
 */
import { useState, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import brandLogo from '@brand/logo.png?url';
import { OWN_FRAME } from '../design/windowChrome';
import { Icon } from './Icon';

export function WindowMenuButton() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  if (!OWN_FRAME) return null;
  const label = t('pro.chrome.windowMenu');
  const pop = (e: MouseEvent<HTMLButtonElement>): void => {
    const r = e.currentTarget.getBoundingClientRect();
    setOpen(true);
    // Answers when the menu closes.
    void window.cth.windowChrome.popupMenu(r.left, r.bottom).finally(() => setOpen(false));
  };
  const pressed = open ? { background: 'var(--cth-cream-200)' } : {};
  return (
    <>
      <img src={brandLogo} alt="" style={{ width: 16, height: 16, display: 'block', imageRendering: 'pixelated', flexShrink: 0 }} />
      <button
        type="button"
        // The app's own tip, left anchored at the bar's left end, not a native title: a native tooltip stayed up
        // over the open menu and covered File (Windows runner, Kevin's gate of 674). No tip while the menu is open.
        className={open ? 'cth-titlebar-nodrag' : 'cth-titlebar-nodrag cth-tip cth-tip-left'}
        data-tip={label}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={pop}
        style={{ display: 'inline-grid', placeItems: 'center', width: 28, height: 28, padding: 0, flexShrink: 0, background: 'var(--cth-paper-100)', boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)', border: 'none', cursor: 'pointer', color: 'var(--cth-ink-900)', ...pressed }}
      >
        <Icon name="sidebar" />
      </button>
    </>
  );
}
