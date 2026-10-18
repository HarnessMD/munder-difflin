/**
 * SCENARIO - UPDATER-ALL-VERSIONS. On 1.1.59 with 1.1.60, 1.1.61 and 1.1.62 published,
 * do the PRODUCTION title-bar badge and Settings -> Updates offer all three, latest
 * preselected, with each version's own notes, and download the one picked?
 *
 *   A. badge: one click opens the picker (not a download); 3 options, latest selected,
 *      latest's notes shown; picking 1.1.60 swaps the notes; download opens 1.1.60's
 *      installer URL, nothing else.
 *   B. Settings, native 'available': latest selected -> primary button is the native
 *      "Download v1.1.62" (updateDownload); picking 1.1.61 turns it into a manual
 *      "Download v1.1.61 installer" that opens 1.1.61's installer and never calls
 *      updateDownload.
 *   C. a single newer version keeps the old one-click badge download (no picker).
 */
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { UpdateBadge } from '../../../src/renderer/src/components/UpdateBadge';
import { UpdatesSection } from '../../../src/renderer/src/components/UpdatesSection';

declare global {
  interface Window {
    __harnessRun: () => Promise<void>;
    harness: { report: (payload: unknown) => void };
  }
}
(globalThis as unknown as { __APP_VERSION__: string }).__APP_VERSION__ = '1.1.59';

const REPO = 'Prozzta/hornham-wegg';
const exe = (v: string) => `https://github.com/${REPO}/releases/download/v${v}/Munder-Difflin-${v}-win-x64-setup.exe`;
const opt = (v: string) => ({ version: v, url: `https://github.com/${REPO}/releases/tag/v${v}`, downloadUrl: exe(v), notes: `## What's new in ${v}\n\n- only in ${v}` });

let current: unknown = null;
const opened: string[] = [];
let downloads = 0;
(window as unknown as { cth: unknown }).cth = new Proxy({}, {
  get: (_t, name: string) => {
    if (name === 'platform') return 'win32';
    if (name === 'arch') return 'x64';
    if (name === 'updateCurrent') return () => Promise.resolve(current);
    if (name === 'updateOpenRelease') return (u: string) => { opened.push(u); return Promise.resolve({ ok: true }); };
    if (name === 'updateDownload') return () => { downloads += 1; return Promise.resolve({ ok: true }); };
    if (name.startsWith('on')) return () => () => {};
    return () => Promise.resolve(undefined);
  }
});

const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 30)); });
const text = (el: Element | null) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
function choose(sel: HTMLSelectElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!.call(sel, value);
  sel.dispatchEvent(new Event('change', { bubbles: true }));
}
const buttonNamed = (host: Element, re: RegExp) =>
  Array.from(host.querySelectorAll('button')).find((b) => re.test(text(b))) as HTMLButtonElement | undefined;

async function mount(el: JSX.Element) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => { root.render(el); });
  await settle();
  return { host, unmount: () => act(async () => { root.unmount(); host.remove(); }) };
}

window.__harnessRun = async () => {
  try {
    const three = [opt('1.1.62'), opt('1.1.61'), opt('1.1.60')];

    // A. badge (manual path)
    current = { state: 'available-manual', version: '1.1.62', url: three[0].url, downloadUrl: exe('1.1.62'), notes: three[0].notes, versions: three };
    const a = await mount(<UpdateBadge />);
    const chip = a.host.querySelector('button')!;
    const chipLabel = text(chip);
    await act(async () => { chip.click(); });
    await settle();
    const openedAfterChipClick = opened.length;
    const sel = a.host.querySelector('select') as HTMLSelectElement | null;
    const options = sel ? Array.from(sel.options).map((o) => text(o)) : [];
    const preselected = sel?.value ?? null;
    const notesLatest = text(a.host.querySelector('[role="dialog"] ul'));
    if (sel) await act(async () => { choose(sel, '1.1.60'); });
    await settle();
    const notesPicked = text(a.host.querySelector('[role="dialog"] ul'));
    const dl = buttonNamed(a.host, /^download v/);
    const dlLabel = text(dl ?? null);
    await act(async () => { dl?.click(); });
    await settle();
    const badgeOpened = opened.slice(openedAfterChipClick);
    await a.unmount();

    // B. Settings (native path)
    opened.length = 0;
    current = { state: 'available', version: '1.1.62', notes: three[0].notes, versions: three.map(({ downloadUrl: _d, ...r }) => r) };
    const b = await mount(<UpdatesSection />);
    const bSel = b.host.querySelector('select') as HTMLSelectElement | null;
    const nativeBtn = text(buttonNamed(b.host, /^Download v1\.1\.62$/) ?? null);
    await act(async () => { buttonNamed(b.host, /^Download v1\.1\.62$/)?.click(); });
    await settle();
    const downloadsAfterNative = downloads;
    if (bSel) await act(async () => { choose(bSel, '1.1.61'); });
    await settle();
    const olderBtn = buttonNamed(b.host, /installer$/);
    const olderLabel = text(olderBtn ?? null);
    const settingsNotes = text(b.host.querySelector('ul'));
    await act(async () => { olderBtn?.click(); });
    await settle();
    const settingsOpened = opened.slice();
    const downloadsAfterOlder = downloads;
    await b.unmount();

    // C. one newer version: the old one-click download
    opened.length = 0;
    current = { state: 'available-manual', version: '1.1.60', url: three[2].url, downloadUrl: exe('1.1.60'), notes: three[2].notes };
    const c = await mount(<UpdateBadge />);
    await act(async () => { c.host.querySelector('button')!.click(); });
    await settle();
    const singleHasSelect = !!c.host.querySelector('select');
    const singleOpened = opened.slice();
    await c.unmount();

    window.harness.report({
      ok: true,
      badge: { chipLabel, openedAfterChipClick, options, preselected, notesLatest, notesPicked, dlLabel, opened: badgeOpened },
      settings: { hasSelect: !!bSel, nativeBtn, downloadsAfterNative, olderLabel, settingsNotes, opened: settingsOpened, downloadsAfterOlder },
      single: { hasSelect: singleHasSelect, opened: singleOpened }
    });
  } catch (e) {
    window.harness.report({ ok: false, error: e instanceof Error ? `${e.message}\n${e.stack}` : String(e) });
  }
};
