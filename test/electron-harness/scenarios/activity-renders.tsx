/**
 * SCENARIO - ACTIVITY-LAG-151. HOW MANY RENDERS DOES "NOTHING CHANGED" COST?
 *
 * Measured by Jim on 1.1.50: every output chunk of the agent you watch, and every hook or
 * statusline tick of every agent, re-rendered the WHOLE app, because `updateAgent` built a
 * new `agents` array even for a patch that changed nothing (300 whole-App renders for 300
 * chunks, ~1.2-1.9 ms each on the renderer's only thread).
 *
 * This mounts, with the PRODUCTION store and the PRODUCTION `usePtyParser`, a component
 * that subscribes to `agents` exactly as App does, and counts its renders:
 *   A. N no-op `updateAgent` patches (what a hook or statusline tick repeats) -> renders.
 *   B. N running-turn chunks through the real parser for an agent ALREADY working ->
 *      renders, and how many `updateAgent` calls the parser made at all.
 *   C. one real change -> exactly one render (the probe is live).
 *   D. the parser on an IDLE agent -> exactly one transition write.
 */
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { useStore, type Agent } from '../../../src/renderer/src/store/store';
import { usePtyParser } from '../../../src/renderer/src/hooks/usePtyParser';

declare global {
  interface Window {
    __harnessRun: () => Promise<void>;
    harness: { report: (payload: unknown) => void };
  }
}
(window as unknown as { cth: unknown }).cth = new Proxy({}, {
  get: (_t, name: string) => (name.startsWith('on') ? () => () => {} : name.endsWith('Sync') ? () => null : () => Promise.resolve(undefined))
});

const N = 50;
let renders = 0;
let parse: ((chunk: string) => void) | null = null;
function Probe() { useStore((s) => s.agents); renders += 1; return null; }
function Parser() { parse = usePtyParser('a1'); return null; }

window.__harnessRun = async () => {
  try {
    // Count every updateAgent call (the parser reads it from the store at render).
    const real = useStore.getState().updateAgent;
    let updateCalls = 0;
    useStore.setState({ updateAgent: (id: string, patch: Partial<Agent>) => { updateCalls += 1; real(id, patch); } } as never);
    useStore.setState({ agents: [{ id: 'a1', name: 'Alice', status: 'working', action: 'reading', progress: 0 } as unknown as Agent] } as never);

    const root = createRoot(document.getElementById('root')!);
    await act(async () => { root.render(<><Probe /><Parser /></>); });
    const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 30)); });

    // A. no-op patches
    let r0 = renders;
    await act(async () => { for (let i = 0; i < N; i++) useStore.getState().updateAgent('a1', { status: 'working' }); });
    await settle();
    const noOpRenders = renders - r0;

    // B. running chunks for an agent already working
    r0 = renders; const c0 = updateCalls;
    await act(async () => { for (let i = 0; i < N; i++) parse!(`✶ Thinking… (${i}s · esc to interrupt)\r\n`); });
    await settle();
    const parserRenders = renders - r0; const parserWrites = updateCalls - c0;

    // C. a real change is still rendered, exactly once
    r0 = renders;
    await act(async () => { useStore.getState().updateAgent('a1', { action: 'writing' }); });
    await settle();
    const realChangeRenders = renders - r0;

    // D. an idle agent starting a turn: exactly one transition write
    await act(async () => { useStore.getState().updateAgent('a1', { status: 'idle' }); });
    const c1 = updateCalls;
    await act(async () => { for (let i = 0; i < N; i++) parse!(`✶ Thinking… (${i}s · esc to interrupt)\r\n`); });
    await settle();
    const transitionWrites = updateCalls - c1;
    const statusAfter = useStore.getState().agents.find((a) => a.id === 'a1')?.status;

    window.harness.report({ ok: true, N, noOpRenders, parserRenders, parserWrites, realChangeRenders, transitionWrites, statusAfter });
  } catch (e) {
    window.harness.report({ ok: false, error: String((e as Error)?.stack ?? e) });
  }
};
