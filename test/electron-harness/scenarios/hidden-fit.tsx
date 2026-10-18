/**
 * SCENARIO - MEMSPIKE-168: a PtyTerminalView mounted inside a display:none wrapper (an inactive
 * tab) must not resize its pty to a phantom grid, neither on mount nor on a font-size change.
 * Once revealed, the ResizeObserver fits it to the real host and resizes the pty exactly then.
 */
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { PtyTerminalView } from '../../../src/renderer/src/components/PtyTerminalView';
import { setTerminalFontSize } from '../../../src/renderer/src/components/terminalFontSize';

declare global {
  interface Window {
    __harnessRun: () => Promise<void>;
    harness: { report: (payload: unknown) => void };
  }
}

const resizes: Array<{ id: string; cols: number; rows: number }> = [];
(window as unknown as { cth: unknown }).cth = new Proxy({}, {
  get: (_t, name: string) => {
    if (name === 'platform') return 'win32';
    if (name === 'recovering') return false;
    if (name === 'resizePty') return (id: string, cols: number, rows: number) => { resizes.push({ id, cols, rows }); return Promise.resolve({ ok: true }); };
    if (name === 'onPtyData' || name === 'onPtyExit' || name.startsWith('on')) return () => () => {};
    if (name.endsWith('Sync')) return () => null;
    return () => Promise.resolve({ ok: true });
  }
});

const wait = (ms: number) => act(async () => { await new Promise((r) => setTimeout(r, ms)); });

window.__harnessRun = async () => {
  try {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:none;width:600px;height:400px';
    document.body.appendChild(wrap);
    const root = createRoot(wrap);
    await act(async () => { root.render(<div style={{ width: '100%', height: '100%', display: 'flex' }}><PtyTerminalView ptyId="pty-hidden" embedded /></div>); });
    await wait(600);
    const afterMount = resizes.length;
    await act(async () => { setTerminalFontSize(15); });
    await wait(600);
    const afterFontChange = resizes.length;
    wrap.style.display = 'block';
    await wait(900);
    const shown = resizes.slice(afterFontChange);
    window.harness.report({ ok: true, afterMount, afterFontChange, shown });
  } catch (e) {
    window.harness.report({ ok: false, error: e instanceof Error ? `${e.message}\n${e.stack}` : String(e) });
  }
};
