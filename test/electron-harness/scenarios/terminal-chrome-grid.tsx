/**
 * SCENARIO - CODEX-REDRAW-151. THE TERMINAL'S BOX, RENDERED, WHILE THE CHROME AROUND IT
 * CHANGES STATE.
 *
 * Codex (0.154) answers ANY change of rows or cols by replaying its whole transcript
 * (measured: 191 KB for ~200 rows of history, linear). The terminal fills whatever its flex
 * column leaves over, so any sibling that changes height with STATE is a replay trigger.
 * Measured on the shipped 1.1.50: every AgentControlStrip click flashed a confirmation
 * line that wrapped onto 2-3 lines in the sidebar for 1.8 s, 17 -> 14 -> 17 rows, two
 * replays per click.
 *
 * This mounts the PRODUCTION AgentControlStrip and MessageQueueComposer around a stand-in
 * for the terminal, in a column as wide as the default sidebar (420 px) and laid out as
 * AgentDetailPanel lays it out, drives each state through the real components (trusted
 * clicks through Chromium, bridge answers as main would), and reports the stand-in's
 * rendered height after every step. The terminal's grid is a pure function of that height,
 * so an unchanged height IS an unchanged grid.
 */
import { bridge } from './composer-bridge-stub';
import { createRoot } from 'react-dom/client';
import { AgentControlStrip } from '../../../src/renderer/src/components/AgentControlStrip';
import { MessageQueueComposer } from '../../../src/renderer/src/components/MessageQueueComposer';
import { useStore, type Agent } from '../../../src/renderer/src/store/store';

declare global {
  interface Window {
    __harnessRun: () => Promise<void>;
    harness: { report: (payload: unknown) => void; click: (x: number, y: number) => Promise<boolean>; axTree: () => Promise<unknown> };
  }
}

const sleep = (ms: number) => new Promise<void>((r) => { setTimeout(r, ms); });
const SNAP = { paused: false, halted: false, autoDeliveryPaused: false, gatedTools: [] as string[], pendingSteers: 0 };
let snap = { ...SNAP };
const cth = (window as unknown as { cth: Record<string, unknown> }).cth;
// What main answers for the operator controls: the updated snapshot.
const controls: Record<string, (...a: unknown[]) => Promise<unknown>> = {
  controlSnapshot: () => Promise.resolve({ ...snap }),
  controlPause: () => { snap = { ...snap, paused: true }; return Promise.resolve({ ...snap }); },
  controlResume: () => { snap = { ...snap, paused: false }; return Promise.resolve({ ...snap }); },
  controlHalt: () => { snap = { ...snap, halted: true }; return Promise.resolve({ ...snap }); },
  controlSteer: () => { snap = { ...snap, pendingSteers: snap.pendingSteers + 1 }; return Promise.resolve({ ...snap }); }
};
(window as unknown as { cth: unknown }).cth = new Proxy(cth, {
  get: (target, name: string) => controls[name] ?? (target as Record<string, unknown>)[name]
});

const standIn = () => document.querySelector('[data-stand-in="terminal"]') as HTMLElement;
const height = () => Math.round(standIn().getBoundingClientRect().height * 100) / 100;
const button = (label: string) => [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === label) ?? null;
async function realClick(el: Element | null): Promise<boolean> {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return window.harness.click(r.left + r.width / 2, r.top + r.height / 2);
}

window.__harnessRun = async () => {
  const steps: Array<{ step: string; height: number }> = [];
  const at = (step: string) => steps.push({ step, height: height() });
  try {
    const agent = { id: 'a1', name: 'Alice', status: 'working', ptyId: 'pty-a1', provider: 'codex' } as unknown as Agent;
    useStore.setState({ messageQueues: { a1: [] } } as never);
    bridge.snapshot = { autoDeliveryPaused: false, capacityHold: false, capacityEvidence: null, interfered: null };
    createRoot(document.getElementById('root')!).render(
      // AgentDetailPanel's column: the control strip, then the terminal area (terminal +
      // composer), at the default sidebar width.
      <div style={{ width: 420, height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <AgentControlStrip agentId="a1" />
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div data-stand-in="terminal" style={{ flex: 1, minHeight: 0 }} />
          <MessageQueueComposer agent={agent} />
        </div>
      </div>
    );
    await sleep(600);
    at('baseline');

    await realClick(button('block tools')); await sleep(250);
    at('block tools: flash showing');
    await sleep(2000);
    at('block tools: flash gone');

    await realClick(button('allow tools')); await sleep(250);
    at('allow tools: flash showing');
    await sleep(2000);

    await realClick(button('stop after this step')); await sleep(250);
    at('halt: flash + "stopping after this step" span');
    await sleep(2000);
    at('halt: span only');

    const input = [...document.querySelectorAll('input')].find((i) => i.placeholder?.startsWith('send this agent a note')) as HTMLInputElement;
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    set.call(input, 'a note'); input.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(100);
    await realClick([...document.querySelectorAll('button')].filter((b) => b.textContent?.trim() === 'send')[0]);
    await sleep(250);
    at('steer: flash + "1 note waiting"');
    await sleep(2000);
    at('steer: "1 note waiting" only');

    // The composer header: a queued message (count badge) under a hold with choices.
    useStore.setState({ messageQueues: { a1: [{ id: 'm1', text: 'queued while busy', ts: 1 }] } } as never);
    bridge.snapshot = { autoDeliveryPaused: false, capacityHold: false, capacityEvidence: null,
      interfered: { requestId: 'queue:a1:m1', reason: 'HUMAN_INPUT_AFTER_STAGE', at: 1 } };
    await sleep(1500);
    at('composer: queued + interfered choices');

    window.harness.report({ ok: true, steps });
  } catch (e) {
    window.harness.report({ ok: false, error: String((e as Error)?.stack ?? e), steps });
  }
};
