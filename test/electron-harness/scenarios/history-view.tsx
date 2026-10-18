/**
 * SCENARIO - HISTORY-VIEW-169. Mounts the PRODUCTION HistoryView against an in-memory
 * transcript (historyPage stubbed with the real byte-cursor contract) in a hidden window,
 * and reports what a real layout does:
 *  - it opens at the bottom, with only a slice of the rows mounted (virtualised);
 *  - a new turn is followed while at the bottom;
 *  - scrolled up, a new turn does NOT move the view, and "Jump to latest" is offered;
 *  - "Load older" prepends without moving what is on screen;
 *  - "Jump to latest" returns to the bottom.
 * A hidden window renders no frames, so a USER scroll is simulated by setting scrollTop and
 * dispatching the scroll event; the component's own scrolls must not depend on that event.
 */
import { createRoot } from 'react-dom/client';
import { HistoryView } from '../../../src/renderer/src/components/HistoryView';
import type { HistoryItem, HistoryPage, HistoryRequest } from '../../../src/shared/history';

declare global { interface Window { __harnessRun: () => Promise<void>; harness: { report: (p: unknown) => void } } }
const sleep = (ms: number) => new Promise<void>((r) => { setTimeout(r, ms); });

// The "file": one item per 100-byte line.
const LINE = 100;
const file: HistoryItem[] = [];
const add = (n: number, label: string) => {
  for (let k = 0; k < n; k += 1) {
    const i = file.length;
    const kind = i % 3 === 0 ? 'user' : i % 3 === 1 ? 'assistant' : 'tool';
    file.push({ id: `${i * LINE}.0`, kind, at: Date.UTC(2026, 0, 1, 10, 0, i % 60), offset: i * LINE,
      text: kind === 'tool' ? `Bash: step ${i}` : `${label} ${i}${i % 7 === 0 ? '\nsecond line\nthird line' : ''}` });
  }
};
add(1000, 'turn');
const calls: string[] = [];

const historyPage = async (req: HistoryRequest): Promise<HistoryPage> => {
  const head = { ok: true as const, provider: 'codex' as const, fileId: 'f1', fileName: 'rollout.jsonl', size: file.length * LINE };
  const limit = req.limit ?? 150;
  if (typeof req.after === 'number') {
    calls.push('after');
    const from = req.after / LINE;
    return { ...head, items: file.slice(from), start: req.after, end: file.length * LINE, atStart: req.after === 0 };
  }
  const endIdx = typeof req.before === 'number' ? req.before / LINE : file.length;
  calls.push(typeof req.before === 'number' ? 'before' : 'tail');
  const startIdx = Math.max(0, endIdx - limit);
  return { ...head, items: file.slice(startIdx, endIdx), start: startIdx * LINE, end: endIdx * LINE, atStart: startIdx === 0 };
};
(window as unknown as { cth: unknown }).cth = { historyPage };

window.__harnessRun = async () => {
  const out: Record<string, unknown> = {};
  try {
    createRoot(document.getElementById('root')!).render(
      <div style={{ width: 420, height: 600, display: 'flex' }}><HistoryView agentId="a1" /></div>
    );
    await sleep(900);
    const sc = document.querySelector('[data-history-view]') as HTMLElement;
    const gap = () => Math.round(sc.scrollHeight - sc.scrollTop - sc.clientHeight);
    const mounted = () => document.querySelectorAll('[data-hid]').length;
    const lastText = () => { const rows = document.querySelectorAll('[data-hid]'); return rows[rows.length - 1]?.textContent ?? ''; };
    const hasJump = () => [...document.querySelectorAll('button')].some((b) => /Jump to latest/.test(b.textContent ?? ''));
    out.initialGap = gap();
    out.initialMounted = mounted();
    out.initialLast = lastText();

    add(3, 'fresh');
    await sleep(2600);   // one follow poll
    out.followGap = gap();
    out.followLast = lastText();

    sc.scrollTop = 200;
    sc.dispatchEvent(new Event('scroll'));
    await sleep(150);
    add(2, 'unseen');
    await sleep(2600);
    out.heldTop = sc.scrollTop;
    out.jumpOffered = hasJump();

    // Load older: the first row on screen must stay on screen.
    sc.scrollTop = 0;
    sc.dispatchEvent(new Event('scroll'));
    await sleep(150);
    const firstVisible = [...document.querySelectorAll('[data-hid]')].find((r) => r.getBoundingClientRect().bottom > sc.getBoundingClientRect().top);
    const anchorId = firstVisible?.getAttribute('data-hid');
    const anchorTopBefore = firstVisible ? Math.round(firstVisible.getBoundingClientRect().top) : null;
    const older = [...document.querySelectorAll('button')].find((b) => /Load older/.test(b.textContent ?? ''));
    out.olderOffered = !!older;
    older?.click();
    await sleep(900);
    const again = anchorId ? document.querySelector(`[data-hid="${anchorId}"]`) : null;
    out.anchorStillMounted = !!again;
    out.anchorShift = again && anchorTopBefore !== null ? Math.round(again.getBoundingClientRect().top) - anchorTopBefore : null;
    out.mountedAfterOlder = mounted();

    const jump = [...document.querySelectorAll('button')].find((b) => /Jump to latest/.test(b.textContent ?? ''));
    jump?.click();
    await sleep(900);
    out.jumpGap = gap();
    out.jumpLast = lastText();
    out.calls = calls;
    window.harness.report({ ok: true, ...out });
  } catch (e) {
    window.harness.report({ ok: false, error: String((e as Error)?.stack ?? e), ...out });
  }
};
