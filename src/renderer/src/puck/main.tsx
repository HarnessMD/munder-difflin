/**
 * The puck's own page. Boots without the app's store or floor: it reads its
 * config and state from main over the bridge and nothing else. Shares the
 * app's i18n (same localStorage origin, so the person's language follows)
 * and its font files; not its global.css, whose cream body would paint over
 * a window that must stay transparent.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../design/fonts.css';
import '../design/tokens.css';
import './puck.css';
import '../i18n';
import { PuckApp } from './PuckApp';

const root = document.getElementById('root');
if (!root) throw new Error('No root element');

createRoot(root).render(
  <StrictMode>
    <PuckApp />
  </StrictMode>
);
