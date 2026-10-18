/**
 * SCENARIO - COMPOSER-LAG-152 F2 (Jim's report). HOW OFTEN DOES TYPING A PRIVATE NOTE WRITE
 * THE ROSTER?
 *
 * Mounts the PRODUCTION PrivateNoteTextarea wired to the PRODUCTION store's setAgentNote,
 * exactly as the focus-mode roster does, and counts `agents` changes and roster persistence
 * writes (localStorage 'cth.agents'):
 *   A. N keys typed fast -> writes during typing (was N), then one after the pause,
 *   B. type, then blur -> committed at once (no waiting for the debounce),
 *   C. type, then close (unmount) -> committed at once,
 *   D. type, then beforeunload -> committed, AND the store's own last roster flush (which
 *      also runs on beforeunload) already carries it,
 *   E. reopen -> the editor shows the saved note.
 */
import { createRoot } from 'react-dom/client';
import { act, useState } from 'react';
import { PrivateNoteTextarea } from '../../../src/renderer/src/components/PrivateNoteTextarea';
import { useStore, type Agent } from '../../../src/renderer/src/store/store';

declare global {
  interface Window {
    __harnessRun: () => Promise<void>;
    harness: { report: (payload: unknown) => void };
  }
}
const rosterWrites: Array<{ agents: Array<{ id: string; note?: string }> }> = [];
const extra: Record<string, (...a: unknown[]) => unknown> = {
  rosterWrite: (snap: unknown) => { rosterWrites.push(snap as never); return Promise.resolve(undefined); }
};
(window as unknown as { cth: unknown }).cth = new Proxy({}, {
  get: (_t, name: string) => extra[name] ?? (name.startsWith('on') ? () => () => {} : name.endsWith('Sync') ? () => null : () => Promise.resolve(undefined))
});

let persists = 0;
const realSetItem = Storage.prototype.setItem;
Storage.prototype.setItem = function (key: string, value: string) {
  if (key === 'cth.agents') persists += 1;
  return realSetItem.call(this, key, value);
};

const N = 40;
let agentsChanges = 0;
let setOpen: ((open: boolean) => void) | null = null;
function Host() {
  const [open, set] = useState(true);
  setOpen = set;
  const note = useStore((s) => s.agents.find((a) => a.id === 'a1')?.note ?? '');
  return open
    ? <PrivateNoteTextarea note={note} onCommit={(n) => useStore.getState().setAgentNote('a1', n)} onEscape={() => set(false)} ariaLabel="Note for Alice" style={{}} />
    : null;
}

const sleep = (ms: number) => act(async () => { await new Promise((r) => setTimeout(r, ms)); });
const area = () => document.querySelector('textarea[aria-label="Note for Alice"]') as HTMLTextAreaElement | null;
function setValue(el: HTMLTextAreaElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}
const noteNow = () => useStore.getState().agents.find((a) => a.id === 'a1')?.note ?? '';
async function typeRun(prefix: string) {
  for (let i = 1; i <= N; i++) await act(async () => { setValue(area()!, prefix + 'k'.repeat(i)); });
  return prefix + 'k'.repeat(N);
}
const counts = () => ({ persists, agentsChanges });
const delta = (a: { persists: number; agentsChanges: number }) => ({ persists: persists - a.persists, agentsChanges: agentsChanges - a.agentsChanges });

window.__harnessRun = async () => {
  try {
    useStore.setState({ agents: [{ id: 'a1', name: 'Alice', status: 'idle', note: 'old' } as unknown as Agent], selectedId: 'a1' } as never);
    useStore.subscribe((s, p) => { if (s.agents !== p.agents) agentsChanges += 1; });
    const root = createRoot(document.getElementById('root')!);
    await act(async () => { root.render(<Host />); });
    const initialValue = area()?.value;

    // A. fast typing, then the pause
    let c0 = counts();
    const a = await typeRun('A');
    const duringTyping = delta(c0);
    const noteDuringTyping = noteNow();
    await sleep(700);
    const afterPause = delta(c0);
    const noteAfterPause = noteNow();

    // B. blur commits at once
    c0 = counts();
    const b = await typeRun('B');
    // The harness window is never focused, so blur() fires no event; send React's focusout.
    await act(async () => { area()!.dispatchEvent(new FocusEvent('focusout', { bubbles: true })); });
    const afterBlur = delta(c0);
    const noteAfterBlur = noteNow();
    await sleep(700);
    const afterBlurPause = delta(c0);

    // C. closing commits at once
    await act(async () => { area()!.focus(); });
    c0 = counts();
    const cText = await typeRun('C');
    await act(async () => { setOpen!(false); });
    const afterClose = delta(c0);
    const noteAfterClose = noteNow();

    // E (first half). reopen shows the saved note
    await act(async () => { setOpen!(true); });
    const reopenedValue = area()?.value;

    // D. quit: beforeunload
    const d = await typeRun('D');
    rosterWrites.length = 0;
    window.dispatchEvent(new Event('beforeunload'));
    const noteAfterUnload = noteNow();
    const lastFlushNote = rosterWrites.length ? rosterWrites[rosterWrites.length - 1].agents.find((x) => x.id === 'a1')?.note ?? null : null;

    // F. C3 (Jim's pin): SLOW typing, a key every 100 ms for over 2 s. The debounce must
    // restart on EVERY key: nothing is committed while typing, one commit after the pause.
    c0 = counts();
    let slow = '';
    for (let i = 0; i < 22; i++) { slow += 's'; const v = slow; await act(async () => { setValue(area()!, v); }); await sleep(100); }
    const slowDuring = delta(c0);
    await sleep(700);
    const slowAfter = delta(c0);
    const noteAfterSlow = noteNow();

    window.harness.report({ ok: true, N, slow, slowDuring, slowAfter, noteAfterSlow, initialValue, a, duringTyping, noteDuringTyping, afterPause, noteAfterPause,
      b, afterBlur, noteAfterBlur, afterBlurPause, cText, afterClose, noteAfterClose, reopenedValue,
      d, noteAfterUnload, rosterFlushesOnUnload: rosterWrites.length, lastFlushNote });
  } catch (e) {
    window.harness.report({ ok: false, error: String((e as Error)?.stack ?? e) });
  }
};
