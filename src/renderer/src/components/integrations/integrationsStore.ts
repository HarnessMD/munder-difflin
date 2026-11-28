/**
 * WHAT THE INTEGRATIONS SCREEN REMEMBERS OUTSIDE REACT: the last Test of each
 * service connection, since the app started. The registry keeps no verdict,
 * so "Key failed its test" lives here, read by the list and the pane alike.
 */
import { useSyncExternalStore } from 'react';
import type { TestResult } from '@/integrations/registryClient';

type Listener = () => void;
const listeners = new Set<Listener>();
let tests: Readonly<Record<string, TestResult>> = {};
const emit = () => { for (const fn of [...listeners]) fn(); };
const subscribe = (fn: Listener) => { listeners.add(fn); return () => { listeners.delete(fn); }; };

/** Remember a Test's verdict for this connection (never its key). */
export function recordConnTest(id: string, r: TestResult | null): void {
  const next = { ...tests };
  if (r) next[id] = { ok: r.ok, status: r.status, error: r.error }; else delete next[id];
  tests = next;
  emit();
}

export function useConnTests(): Readonly<Record<string, TestResult>> {
  return useSyncExternalStore(subscribe, () => tests);
}
