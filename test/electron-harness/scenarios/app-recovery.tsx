/**
 * SCENARIO - RR-164 (Jim finding 1), on the REAL App: a view that main brought back after a
 * renderer crash (preload `recovering` = true) must open on the live floor with the "restored"
 * notice, NOT on the launch-time HivePicker (whose switch path would tear down live agents).
 * The control mount (recovering = false, a normal launch) still shows the picker.
 */
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { App } from '../../../src/renderer/src/App';

declare global {
  interface Window {
    __harnessRun: () => Promise<void>;
    harness: { report: (payload: unknown) => void };
  }
}

(globalThis as unknown as { __APP_VERSION__: string }).__APP_VERSION__ = '1.1.63';
let recovering = false;
const notice = { at: Date.now(), action: 'reload', reason: 'crashed', streak: 1 };
const config = { onboardingComplete: true, harnessHome: 'C:/harness-test-home', recentHomes: [] };
const cthCalls: string[] = [];
(window as unknown as { cth: unknown }).cth = new Proxy({}, {
  get: (_t, name: string) => {
    if (name === 'recovering') return recovering;
    if (name === 'platform') return 'win32';
    if (name === 'arch') return 'x64';
    cthCalls.push(name);
    if (name === 'getConfig') return () => Promise.resolve({ ...config });
    if (name === 'takeRecoveryNotice') return () => Promise.resolve(recovering ? notice : null);
    if (name === 'listPtys') return () => Promise.resolve([]);
    if (name.startsWith('on')) return () => () => {};
    if (name.endsWith('Sync')) return () => null;
    return () => Promise.resolve(undefined);
  }
});

const settle = (ms = 300) => act(async () => { await new Promise((r) => setTimeout(r, ms)); });

async function mount(flag: boolean) {
  recovering = flag;
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => { root.render(<App />); });
  await settle(600);
  const text = host.textContent ?? '';
  const res = {
    picker: text.includes('Open the one you were working in'),
    notice: !!host.querySelector('[data-testid="recovery-notice"]'),
    noticeText: host.querySelector('[data-testid="recovery-notice"]')?.textContent ?? null
  };
  await act(async () => { root.unmount(); });
  host.remove();
  return res;
}

window.__harnessRun = async () => {
  try {
    const recovered = await mount(true);
    const normal = await mount(false);
    window.harness.report({ ok: true, recovered, normal, askedForNotice: cthCalls.includes('takeRecoveryNotice') });
  } catch (e) {
    window.harness.report({ ok: false, error: e instanceof Error ? `${e.message}\n${e.stack}` : String(e) });
  }
};
