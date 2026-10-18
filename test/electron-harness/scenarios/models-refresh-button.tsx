/**
 * SCENARIO - REFRESH-MODELS (1.1.73): the Settings button flow, on the PRODUCTION panel and store.
 *
 * Mounts ModelsRefreshPanel next to a probe that renders modelsForProvider('antigravity') the way a
 * picker does. The bridge is a stub:
 * - modelCatalog() answers null (no file yet);
 * - refreshModels() answers after a delay with rows and a new file, and pushes the file through
 *   onModelCatalogChanged, as main does.
 * Checks:
 *   A. before: the picker shows the FLOOR (3.8 Flash, no retired 3.5), "Not refreshed yet", no lookup
 *      at mount (refreshModels never called by mounting);
 *   B. click: the button says "Refreshing…" and is disabled; a second click is ignored (one call);
 *   C. after: one row per provider (listed / no list / not installed / failed + kept list), the
 *      picker shows the refreshed list (a new model appears), and "Last refreshed" is shown.
 */
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { ModelsRefreshPanel } from '../../../src/renderer/src/components/ModelsRefreshPanel';
import { loadModelCatalog, modelsForProvider, useModelCatalogVersion } from '../../../src/renderer/src/store/config';

declare global {
  interface Window {
    __harnessRun: () => Promise<void>;
    harness: { report: (payload: unknown) => void };
  }
}

const calls = { modelCatalog: 0, refreshModels: 0 };
let push: ((f: unknown) => void) | null = null;
const FILE = {
  version: 1, refreshedAt: Date.parse('2026-09-28T09:00:00Z'),
  providers: {
    antigravity: { status: 'ok', source: 'agy models', fetchedAt: 1, models: [
      { id: 'Gemini 3.9 Flash (High)', label: 'Gemini 3.9 Flash · High' },
      { id: 'Gemini 3.8 Flash (High)', label: 'Gemini 3.8 Flash · High' }] },
    claude: { status: 'unsupported', reason: 'no list command (no Anthropic API key stored; built-in list kept)' },
    opencode: { status: 'not-installed', reason: 'opencode not found' },
    codex: { status: 'failed', reason: 'timeout', models: [{ id: 'gpt-6-astra', label: 'GPT-6 Astra' }] }
  }
};
const ROWS = [
  { provider: 'antigravity', status: 'ok', count: 2, added: ['Gemini 3.9 Flash (High)'], removed: ['Gemini 3.5 Flash (Medium)'], ms: 1800 },
  { provider: 'claude', status: 'unsupported', count: 0, added: [], removed: [], reason: 'no list command (no Anthropic API key stored; built-in list kept)', ms: 1 },
  { provider: 'opencode', status: 'not-installed', count: 0, added: [], removed: [], reason: 'opencode not found', ms: 40 },
  { provider: 'codex', status: 'failed', count: 1, added: [], removed: [], reason: 'timeout', keptLast: true, ms: 20000 }
];
(window as unknown as { cth: unknown }).cth = {
  modelCatalog: () => { calls.modelCatalog += 1; return Promise.resolve(null); },
  onModelCatalogChanged: (cb: (f: unknown) => void) => { push = cb; return () => { push = null; }; },
  refreshModels: () => {
    calls.refreshModels += 1;
    return new Promise((resolve) => setTimeout(() => { push?.(FILE); resolve({ file: FILE, rows: ROWS }); }, 150));
  }
};

function PickerProbe() {
  useModelCatalogVersion();
  return <ul id="agy-picker">{modelsForProvider('antigravity').map((m) => <li key={m.label}>{m.label}</li>)}</ul>;
}

const settle = (ms = 30) => act(async () => { await new Promise((r) => setTimeout(r, ms)); });
const text = (sel: string) => (document.querySelector(sel)?.textContent ?? '');

window.__harnessRun = async () => {
  try {
    await loadModelCatalog();
    const root = createRoot(document.getElementById('root')!);
    await act(async () => { root.render(<><ModelsRefreshPanel /><PickerProbe /></>); });
    await settle();
    const before = { picker: [...document.querySelectorAll('#agy-picker li')].map((l) => l.textContent), panel: document.body.textContent ?? '', refreshCalls: calls.refreshModels };
    const button = [...document.querySelectorAll('button')].find((b) => /Refresh models/.test(b.textContent ?? '')) as HTMLButtonElement;
    await act(async () => { button.click(); });
    const during = { label: button.textContent, disabled: button.disabled };
    await act(async () => { button.click(); }); // ignored while busy
    await settle(300);
    const rows = [...document.querySelectorAll('[data-testid="models-refresh-rows"] tr')].map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent));
    const after = { picker: [...document.querySelectorAll('#agy-picker li')].map((l) => l.textContent), panel: document.body.textContent ?? '', rows, button: button.textContent, disabled: button.disabled };
    window.harness.report({ ok: true, calls, before, during, after, lastRefreshed: /Last refreshed/.test(text('body')) });
  } catch (e) {
    window.harness.report({ ok: false, error: String((e as Error)?.stack ?? e) });
  }
};
