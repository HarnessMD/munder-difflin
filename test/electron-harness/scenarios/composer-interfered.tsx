/**
 * SCENARIO - L0-FUSION stage 5.4d. THE COMPOSER, RENDERED: a held queue says why, and
 * "resolved" is a real button that a real click - and nothing else - acts on.
 *
 * The PRODUCTION `MessageQueueComposer` is mounted with React into a real page, against
 * the production store. The only double is the preload bridge (composer-bridge-stub.ts):
 * `controlSnapshot` answers what main would answer, and `resolveInterference` records
 * that it was called. Clicks are TRUSTED input events sent through Chromium at the
 * button's rendered coordinates (harness `click`), so a button that is covered, off-screen
 * or not rendered cannot be "clicked" the way `element.click()` would click it.
 *
 * It proves what is on the page and what a click does. It does not prove main's side of
 * the IPC (test/delivery-hold.test.cjs pins the handler; the fused scenario runs the owner).
 */
import { bridge } from './composer-bridge-stub';
import { createRoot } from 'react-dom/client';
import { MessageQueueComposer } from '../../../src/renderer/src/components/MessageQueueComposer';
import { useStore, type Agent } from '../../../src/renderer/src/store/store';

declare global {
  interface Window {
    __harnessRun: () => Promise<void>;
    harness: { report: (payload: unknown) => void; click: (x: number, y: number) => Promise<boolean>; axTree: () => Promise<unknown> };
  }
}

const sleep = (ms: number) => new Promise<void>((r) => { setTimeout(r, ms); });
async function until(what: () => boolean, ms: number): Promise<boolean> {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (what()) return true; await sleep(25); }
  return what();
}
const buttons = (label: string) => [...document.querySelectorAll('button')].filter((b) => b.textContent?.trim() === label);
const pageText = () => document.body.innerText;
const titleOfHint = () => [...document.querySelectorAll('span[title]')].map((s) => s.getAttribute('title') ?? '').find((t) => t.includes('Alice')) ?? null;
const rows = () => useStore.getState().messageQueues.a1?.map((m) => ({ id: m.id, manual: !!m.manual })) ?? [];

let trusted: boolean[] = [];
async function realClick(el: Element): Promise<{ x: number; y: number; hit: boolean }> {
  const r = el.getBoundingClientRect();
  const x = r.left + r.width / 2; const y = r.top + r.height / 2;
  // What is ACTUALLY rendered at that point. A covered button is not this element.
  const hit = document.elementFromPoint(x, y) === el;
  await window.harness.click(x, y);
  return { x, y, hit };
}

window.__harnessRun = async () => {
  const result: Record<string, unknown> = {};
  try {
    document.addEventListener('click', (e) => { trusted.push(e.isTrusted); }, true);
    const agent = { id: 'a1', name: 'Alice', status: 'idle' } as unknown as Agent;
    useStore.setState({ messageQueues: { a1: [
      { id: 'm1', text: 'the message that was typed over', ts: 1 },
      { id: 'm2', text: 'a later message', ts: 2 },
      { id: 'm3', text: 'a third message', ts: 3 }
    ] } } as never);
    bridge.snapshot = { autoDeliveryPaused: false, capacityHold: true, capacityEvidence: 'LIMITED_NO_KNOWN_RESET',
      interfered: { requestId: 'queue:a1:m1', reason: 'HUMAN_INPUT_AFTER_STAGE', at: 1 } };
    // Mounted as the app mounts it: at the foot of a column, under the terminal it serves
    // (AgentDetailPanel / CommandCenterPanel / FullscreenTerminal). Since LAG-150 the pending
    // list is an overlay rising over that terminal, so a composer mounted alone at the very
    // top of the page would push its own list above the viewport, a layout no user has.
    createRoot(document.getElementById('root')!).render(
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div data-stand-in="terminal" style={{ flex: 1, minHeight: 0 }} />
        <MessageQueueComposer agent={agent} />
      </div>
    );

    const SEND = 'send queued message'; const DROP = 'already handled — drop';
    const heldTags = () => (pageText().match(/held — typed over, not submitted/g) ?? []).length;
    const calls = () => bridge.resolveCalls.map((c) => [c.agentId, c.how]);
    const hold = (requestId: string) => { bridge.snapshot = { ...bridge.snapshot, interfered: { requestId, reason: 'HUMAN_INPUT_AFTER_STAGE', at: 1 } }; };

    // ── STEP 1: INTERFERED is on the page, as TWO actions. ─────────────────────────────
    const shown = await until(() => buttons(SEND).length === 1 && buttons(DROP).length === 1, 4_000);
    const ax = await window.harness.axTree();
    const axNames = Array.isArray(ax) ? ax.filter((n: { role: string; ignored: boolean }) => n.role === 'button' && !n.ignored).map((n: { name: string }) => n.name) : [];
    result.interfered = {
      shown, text: pageText(), title: titleOfHint(),
      sendTitle: buttons(SEND)[0]?.getAttribute('title'), dropTitle: buttons(DROP)[0]?.getAttribute('title'),
      resolvedButtons: buttons('resolved').length, sendNowButtons: buttons('send now').length, heldTags: heldTags(),
      axSend: axNames.filter((n: string) => n === SEND).length, axDrop: axNames.filter((n: string) => n === DROP).length
    };

    // ── STEP 2: NOTHING BUT A CLICK RESOLVES IT. Two full poll cycles, no click. ────
    await sleep(4_500);
    result.unattended = { resolveCalls: bridge.resolveCalls.length, snapshotReads: bridge.snapshotReads, stillShown: buttons(DROP).length === 1 };

    // ── STEP 3a: main REFUSES the resolution -> nothing is dropped. ─────────────────────
    bridge.refuse = true;
    await realClick(buttons(DROP)[0]);
    await sleep(300);
    result.refused = { rows: rows(), calls: calls(), stillShown: buttons(DROP).length === 1 };
    bridge.refuse = false; bridge.resolveCalls.length = 0;

    // ── STEP 3b: a REAL click on "already handled - drop": THAT row goes, no other. ─
    trusted = [];
    const dropClick = await realClick(buttons(DROP)[0]);
    const dropGone = await until(() => buttons(DROP).length === 0, 4_000);
    result.dropped = { click: dropClick, trusted: trusted.slice(), calls: calls(), gone: dropGone, rows: rows() };

    // ── STEP 3c: the NEXT message is interfered with; "send queued message" keeps it. ─
    bridge.resolveCalls.length = 0;
    hold('queue:a1:m2');
    await until(() => buttons(SEND).length === 1, 4_000);
    const heldTagsOnM2 = heldTags();
    trusted = [];
    const sendClick = await realClick(buttons(SEND)[0]);
    const sendGone = await until(() => buttons(SEND).length === 0, 4_000);
    result.sentAgain = { click: sendClick, trusted: trusted.slice(), calls: calls(), gone: sendGone, rows: rows(), heldTagsOnM2 };

    // ── STEP 3d: a held WAKE (not a queue item): other words, and no row is touched. ─
    bridge.resolveCalls.length = 0;
    hold('wake:a1:9');
    await until(() => buttons('let it retry').length === 1, 4_000);
    result.wake = { labels: ['let it retry', 'already handled', SEND, DROP].map((l) => buttons(l).length), heldTags: heldTags(),
      retryTitle: buttons('let it retry')[0]?.getAttribute('title') };
    await realClick(buttons('already handled')[0]);
    await until(() => buttons('already handled').length === 0, 4_000);
    result.wakeResolved = { calls: calls(), rows: rows() };

    // ── STEP 4: what remains is the ENDLESS capacity hold, and "send now" is the way out. ─
    bridge.resolveCalls.length = 0;
    const offered = await until(() => buttons('send now').length === 2, 4_000);
    result.capacity = { offered, text: pageText(), title: titleOfHint(), sendNowButtons: buttons('send now').length,
      heldTags: (pageText().match(/held — typed over, not submitted/g) ?? []).length };
    trusted = [];
    const click2 = await realClick(buttons('send now')[1]);
    await until(() => rows()[0]?.id === 'm3', 2_000);
    result.released = { click: click2, trusted: trusted.slice(), rows: rows(), resolveCalls: bridge.resolveCalls.length };

    // ── STEP 4b: the spent post-reset probe - usually ends by itself, cannot be promised to. ─
    bridge.snapshot = { autoDeliveryPaused: false, capacityHold: true, capacityEvidence: 'POST_RESET_PROBE_SPENT', interfered: null };
    useStore.setState({ messageQueues: { a1: [{ id: 'm9', text: 'waiting on a probe', ts: 9 }] } } as never);
    const probeShown = await until(() => /waiting for a new capacity reading/.test(pageText()), 4_000);
    result.spentProbe = { shown: probeShown, text: pageText(), title: titleOfHint(), sendNowButtons: buttons('send now').length };

    // ── STEP 5: no pool. The queue moves, and it is NOT called available. ───────────
    useStore.setState({ messageQueues: { a1: [{ id: 'm3', text: 'moving', ts: 3 }] } } as never);
    bridge.snapshot = { autoDeliveryPaused: false, capacityHold: false, capacityEvidence: 'NO_POOL', interfered: null };
    const noted = await until(() => /outside capacity gating/.test(pageText()), 4_000);
    result.noPool = { noted, text: pageText(), sendNowButtons: buttons('send now').length };

    window.harness.report({ ok: true, ...result });
  } catch (e) {
    window.harness.report({ ok: false, error: String((e as Error)?.stack || e), partial: result });
  }
};
