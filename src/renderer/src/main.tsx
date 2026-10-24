import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import brandLogo from '@brand/logo.png?url';
import './design/global.css';
import './i18n';

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

const root = document.getElementById('root');
if (!root) throw new Error('No root element');

if (typeof window !== 'undefined' && !window.cth) {
  root.innerHTML = `
    <div style="position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#FFF8E7;color:#1A1320;font-family:sans-serif;padding:24px;text-align:center;">
      <h2 style="color:#6E1423;font-family:monospace;margin-bottom:12px;">MUNDER DIFFLIN</h2>
      <p style="max-width:540px;line-height:1.6;color:#555;font-size:15px;">
        You opened the local Vite dev URL (<code>http://localhost:5173</code>) in a web browser.
      </p>
      <p style="max-width:540px;line-height:1.6;color:#1A1320;font-size:15px;font-weight:600;margin-top:8px;">
        Munder Difflin is a desktop application powered by Electron (which coordinates real CLI processes and PTYs).
        Please switch to the <strong>Munder Difflin desktop window</strong> on your taskbar.
      </p>
    </div>
  `;
} else {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
