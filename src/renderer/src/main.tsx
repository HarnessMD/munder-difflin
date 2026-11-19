import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { HalloweenLayer } from './components/HalloweenLayer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { pixelAction } from './components/classicAction';
import { RecoveryNotice } from './components/RecoveryNotice';
import { IntegrityBanner } from './components/IntegrityBanner';
import { crashReloadAtBoot } from './components/crashReload';
import { holdBootSplash } from './components/bootSplash';
import brandLogo from '@brand/logo.png?url';
import './design/global.css';
import './i18n';
// Stamps data-cth-season on <html> before the first paint, so the painter
// dresses the cast from the very first portrait.
import './design/season';
import { startWindowControls } from './design/windowChrome';
import { WindowDragStrip } from './components/WindowDragStrip';

const favicon = document.createElement('link');
favicon.rel = 'icon';
favicon.type = 'image/png';
favicon.href = brandLogo;
document.head.appendChild(favicon);

const splashMark = document.querySelector('#cth-splash .mk');
if (splashMark) {
  const img = document.createElement('img');
  img.src = brandLogo;
  img.alt = 'Munder Difflin';
  img.style.cssText = 'height:56px;width:auto;display:block';
  splashMark.replaceWith(img);
}

// The loader stays over the window until the app has its first data (components/bootSplash.ts).
// Out of #root before the first render, which would otherwise replace it at once.
holdBootSplash();

const root = document.getElementById('root');
if (!root) throw new Error('No root element');

// Before anything marks this page: did the last one end in a crash that main reloaded?
crashReloadAtBoot();

// The root boundary: an error nothing else caught draws a box with "Reload the window"
// instead of a blank window. The agents keep running in main either way.
function RootBoundary({ children }: { children: ReactNode }) {
  return <ErrorBoundary recover="reload" button={pixelAction}>{children}</ErrorBoundary>;
}

// Off the Mac our bar is the window's top row; the system's controls follow its colours.
startWindowControls();

createRoot(root).render(
  <StrictMode>
    {/* First in the page: off the Mac, the window's drag band while no app bar is up. */}
    <WindowDragStrip />
    <RootBoundary>
      <App />
    </RootBoundary>
  </StrictMode>
);

// The "window was reloaded" notice and the damaged file banner get their own root, over the
// picker and the app.
const noticeRoot = document.createElement('div');
noticeRoot.id = 'cth-recovery';
document.body.appendChild(noticeRoot);
createRoot(noticeRoot).render(<><RecoveryNotice /><IntegrityBanner /></>);

// The season's decorations get their own root, so they sit over every screen without the app tree knowing about them.
const seasonRoot = document.createElement('div');
seasonRoot.id = 'cth-season';
document.body.appendChild(seasonRoot);
createRoot(seasonRoot).render(<HalloweenLayer />);
