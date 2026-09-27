/**
 * D1 (founder, 3 Sep 2026): every PRO screen has two renderings, technical
 * and simple, and the switch is the answer the person already gave at
 * onboarding (`config.audience`, the same fact that sets the register of the
 * agents' system prompts). There is no second toggle: Settings → General owns
 * the one that exists, and a screen never asks the config directly. ProShell
 * feeds this store from its config prop, so anything under it can ask
 * `useDepth()` without the config threaded down through props.
 *
 * Unset audience reads as technical, the same rule main/config.ts applies to
 * incidental copy, so an install that predates the question shows every id
 * rather than hiding some.
 */
import { useSyncExternalStore } from 'react';

export type Depth = 'simple' | 'technical';
export type Audience = 'technical' | 'non-technical' | undefined;

let depth: Depth = 'technical';
const subs = new Set<() => void>();

export function depthOf(audience: Audience): Depth {
  return audience === 'non-technical' ? 'simple' : 'technical';
}

export function setAudience(audience: Audience): void {
  const next = depthOf(audience);
  if (next === depth) return;
  depth = next;
  subs.forEach((f) => f());
}

function subscribe(cb: () => void): () => void {
  subs.add(cb);
  return () => { subs.delete(cb); };
}
const read = () => depth;

export function useDepth(): Depth {
  return useSyncExternalStore(subscribe, read, read);
}

/** True when ids, raw paths, model ids and engine states are shown inline. */
export function useTechnical(): boolean {
  return useDepth() === 'technical';
}
