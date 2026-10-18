/**
 * SCENARIO - IMPACT-LOOP-171, on the REAL App (a recovered view: the live floor with agent cards).
 *
 * The runaway of 2026-09-27/28: an agent card whose impact is NON-NULL (a capacity hold at 100%,
 * or the floor-wide auto-delivery pause) made useAgentImpact re-subscribe and re-read
 * control:snapshot on every render, thousands of times a second, until the renderer was killed.
 *
 * `window.cth` is a fake whose controlSnapshot answers ASYNCHRONOUSLY (a macrotask, as a real IPC
 * reply is) and counts every call. The scenario samples, once a second for DURATION_S, the
 * control:snapshot calls, the JS heap and the renderer process's private memory (read by main).
 * A loop stops the run early (CALL_CAP) so a regression fails fast instead of eating memory.
 */
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { App } from '../../../src/renderer/src/App';
import { useStore } from '../../../src/renderer/src/store/store';

declare global {
  interface Window {
    __harnessRun: () => Promise<void>;
    harness: { report: (payload: unknown) => void; metrics: () => Promise<{ privateMb: number; workingSetMb: number } | null> };
  }
}

export type ImpactMode = 'hold' | 'pause';

const DURATION_S = 20;
const CALL_CAP = 20_000;
const sleep = (ms: number) => new Promise<void>((r) => { setTimeout(r, ms); });

const agents = [
  { id: 'god', name: 'Michael', character: 'michael', accent: 'gold', isGod: true, ptyId: 'pty-god', provider: 'claude', command: 'claude' },
  { id: 'dwight', name: 'Dwight', character: 'dwight', accent: 'mint', ptyId: 'pty-dwight', provider: 'codex', command: 'codex' },
  { id: 'jim', name: 'Jim', character: 'jim', accent: 'sky', ptyId: 'pty-jim', provider: 'claude', command: 'claude' },
  { id: 'andy', name: 'Andy', character: 'andy', accent: 'coral', ptyId: 'pty-andy', provider: 'claude', command: 'claude' }
].map((a) => ({ description: '', project: 'Harness', tmuxTarget: '', cwd: 'C:/harness-test-home', status: 'idle', action: 'awaiting', progress: 0, ...a }));

const HOLD = { kind: 'CAPACITY_RESERVE_ONLY', verb: 'paused', text: 'paused · Codex reserve only' };
const FLOOR_PAUSE = { kind: 'DELIVERY_PAUSED', verb: 'paused', text: 'paused · auto-delivery off (floor)' };

export function installScenario(mode: ImpactMode): void {
  const impactOf = (agentId: string) => (mode === 'pause' ? FLOOR_PAUSE : agentId === 'dwight' ? HOLD : null);
  let snapshotCalls = 0;
  const asked = new Set<string>();
  let mountedAt = 0;
  let reported = false;
  const samples: Array<Record<string, unknown>> = [];
  const report = (payload: Record<string, unknown>) => { if (reported) return; reported = true; window.harness.report(payload); };
  const config = { onboardingComplete: true, harnessHome: 'C:/harness-test-home', recentHomes: [] };
  (window as unknown as { cth: unknown }).cth = new Proxy({}, {
    get: (_t, name: string) => {
      if (name === 'recovering') return true;
      if (name === 'platform') return 'win32';
      if (name === 'arch') return 'x64';
      if (name === 'getConfig') return () => Promise.resolve({ ...config });
      if (name === 'takeRecoveryNotice') return () => Promise.resolve(null);
      if (name === 'listPtys') return () => Promise.resolve(agents.map((a) => ({ id: a.ptyId, cwd: a.cwd, command: a.command, pid: 1, lastOutputAt: 0, hasOutput: true })));
      if (name === 'controlSnapshot') {
        return (agentId: string) => {
          snapshotCalls += 1;
          asked.add(agentId);
          // A loop starves the page's own timers, so the cap reports from inside the call.
          if (snapshotCalls === CALL_CAP) {
            report({ ok: true, mode, shown: asked.has('dwight'), asked: [...asked], stoppedEarly: true, totalCalls: snapshotCalls,
              msToCap: Math.round(performance.now() - mountedAt), samples });
          }
          const impact = impactOf(agentId);
          const snap = { paused: false, halted: false, autoDeliveryPaused: mode === 'pause', gatedTools: [], pendingSteers: 0,
            capacityHold: mode === 'hold' && agentId === 'dwight', capacityEvidence: null, interfered: null, impact };
          return new Promise((res) => { setTimeout(() => res(snap), 0); });
        };
      }
      if (name.startsWith('on')) return () => () => {};
      if (name.endsWith('Sync')) return () => null;
      if (/^(list|get)/.test(name)) return () => Promise.resolve([]);
      return () => Promise.resolve(undefined);
    }
  });

  window.__harnessRun = async () => {
    const perf = performance as unknown as { memory?: { usedJSHeapSize: number } };
    try {
      const host = document.createElement('div');
      host.style.cssText = 'position:absolute;inset:0';
      document.body.appendChild(host);
      const root = createRoot(host);
      mountedAt = performance.now();
      await act(async () => { root.render(<App />); });
      await act(async () => { await sleep(800); });
      await act(async () => { useStore.setState({ agents, messageQueues: {} } as never); });
      await act(async () => { await sleep(500); });
      // The floor's agent cards each asked main for their impact once (the mount-time read).
      const shown = asked.has('dwight');
      let last = snapshotCalls;
      let stoppedEarly = false;
      for (let s = 1; s <= DURATION_S; s++) {
        await sleep(1000);
        const m = await window.harness.metrics();
        samples.push({ t: s, calls: snapshotCalls - last, totalCalls: snapshotCalls, heapMb: Math.round((perf.memory?.usedJSHeapSize ?? 0) / 1048576), privateMb: m?.privateMb ?? null });
        last = snapshotCalls;
        if (snapshotCalls > CALL_CAP) { stoppedEarly = true; break; }
      }
      report({ ok: true, mode, shown, asked: [...asked], stoppedEarly, totalCalls: snapshotCalls, samples });
    } catch (e) {
      report({ ok: false, error: e instanceof Error ? `${e.message}\n${e.stack}` : String(e), samples, totalCalls: snapshotCalls });
    }
  };
}
