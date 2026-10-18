/**
 * SCENARIO - COMPOSER-LAG-152 F1 (Jim's report). DOES TYPING IN THE DISPATCH BOX RE-RENDER
 * THE WHOLE FLOOR DASHBOARD?
 *
 * Mounts the PRODUCTION FloorTab with three agents and counts renders of its AGENTS section
 * through a getter on each agent's `command`: every AGENTS row reads it once per render
 * (inferAgentProvider), and the dispatch box never does. Then:
 *   A. types N keys into the dispatch textarea -> AGENTS reads (was 3 per key),
 *   B. one real roster change -> AGENTS reads > 0 (the probe is live),
 *   C. dispatch -> hiveSend got the typed body with the suggested owner, box cleared,
 *   D. a task-card seed fills the text and KEEPS the chosen owner,
 *   E. an issue "Assign" fills the text and resets the owner to "Michael decides".
 */
import { createRoot } from 'react-dom/client';
import { act, useState } from 'react';
import { FloorTab } from '../../../src/renderer/src/components/CommandCenterPanel';
import { useStore, type Agent } from '../../../src/renderer/src/store/store';

declare global {
  interface Window {
    __harnessRun: () => Promise<void>;
    harness: { report: (payload: unknown) => void };
  }
}
const sent: unknown[] = [];
const extra: Record<string, (...a: unknown[]) => unknown> = {
  getConfig: () => Promise.resolve({ registeredRepos: ['acme/repo'] }),
  githubIssues: () => Promise.resolve({ ok: true, issues: [{ number: 7, title: 'Fix the thing', body: 'details', url: 'https://x/7', labels: [], assignees: [] }] }),
  hiveSend: (msg: unknown) => { sent.push(msg); return Promise.resolve({ ok: true }); }
};
(window as unknown as { cth: unknown }).cth = new Proxy({}, {
  get: (_t, name: string) => extra[name] ?? (name.startsWith('on') ? () => () => {} : name.endsWith('Sync') ? () => null : () => Promise.resolve(undefined))
});

const N = 40;
let agentsReads = 0;
function agent(id: string, name: string, isGod = false): Agent {
  const a = { id, name, isGod, status: 'idle', action: '', progress: 0, provider: 'claude', character: 'jim', accent: 'mint', description: 'w', project: 'p', tmuxTarget: '' } as Record<string, unknown>;
  Object.defineProperty(a, 'command', { enumerable: true, get: () => { agentsReads += 1; return 'claude'; } });
  return a as unknown as Agent;
}

let setSeed: ((s: { text: string; seq: number }) => void) | null = null;
function Host() {
  const [seed, set] = useState({ text: '', seq: 0 });
  setSeed = set;
  return <FloorTab seed={seed} />;
}

const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 30)); });
function setValue(el: HTMLTextAreaElement | HTMLSelectElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLSelectElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, value);
  el.dispatchEvent(new Event(el instanceof HTMLTextAreaElement ? 'input' : 'change', { bubbles: true }));
}

window.__harnessRun = async () => {
  try {
    useStore.setState({ agents: [agent('god', 'Michael', true), agent('a1', 'Alice'), agent('a2', 'Bob')], selectedId: null } as never);
    const root = createRoot(document.getElementById('root')!);
    await act(async () => { root.render(<Host />); });
    await settle();
    const box = () => document.querySelector('textarea[placeholder^="Describe the task"]') as HTMLTextAreaElement;
    const owner = () => document.querySelector('select') as HTMLSelectElement;
    const rendersBefore = agentsReads;

    // A. typing
    let r0 = agentsReads;
    for (let i = 1; i <= N; i++) await act(async () => { setValue(box(), 'x'.repeat(i)); });
    await settle();
    const typingReads = agentsReads - r0;
    const typed = box().value;

    // B. a real roster change still renders the AGENTS section
    r0 = agentsReads;
    await act(async () => { useStore.getState().updateAgent('a1', { name: 'Alicia' }); });
    await settle();
    const realChangeReads = agentsReads - r0;

    // C. dispatch the typed text with a suggested owner
    await act(async () => { setValue(owner(), 'a2'); });
    await act(async () => { setValue(box(), 'ship the fix'); });
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'dispatch') as HTMLButtonElement;
    await act(async () => { btn.click(); });
    await settle();
    const sentBody = (sent[0] as { body?: string } | undefined)?.body ?? null;
    const boxAfterSend = box().value;

    // D. a task-card seed: text only, the chosen owner stays
    await act(async () => { setValue(owner(), 'a1'); });
    await act(async () => { setSeed!({ text: 'seeded task', seq: 1 }); });
    await settle();
    const seedText = box().value; const seedOwner = owner().value;

    // E. an issue assign: text AND owner reset
    const fetchBtn = [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Fetch issues') as HTMLButtonElement;
    await act(async () => { fetchBtn.click(); });
    await settle();
    const assignBtn = [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Assign') as HTMLButtonElement | undefined;
    await act(async () => { assignBtn?.click(); });
    await settle();
    const issueText = box().value; const issueOwner = owner().value;

    window.harness.report({ ok: true, N, mountedReads: rendersBefore, typingReads, typed, realChangeReads, sentBody, boxAfterSend,
      seedText, seedOwner, foundAssign: !!assignBtn, issueText, issueOwner });
  } catch (e) {
    window.harness.report({ ok: false, error: String((e as Error)?.stack ?? e) });
  }
};
