/**
 * The screenshot overlay: a transparent page the size of one display, with
 * one box on it. Main tells it where the box starts (the remembered region,
 * shared/puck initialRegion); the person moves or resizes it; Enter or the
 * button captures, Escape cancels. Nothing here touches a pixel of the
 * screen: main captures after this window is gone.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../design/fonts.css';
import '../design/tokens.css';
import '../i18n';
import { CaptureApp } from './CaptureApp';

const root = document.getElementById('root');
if (!root) throw new Error('No root element');

createRoot(root).render(
  <StrictMode>
    <CaptureApp />
  </StrictMode>
);
