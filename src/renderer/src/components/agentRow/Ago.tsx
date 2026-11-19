/**
 * THE AGE ON A ROW, TICKING ON ITS OWN (0.5.3, F25; Pam's audit: "Ago
 * strings need a 30 s ticker that touches only the time text").
 *
 * One interval for every mounted Ago, and the tick re-renders these spans
 * and nothing above them: a row that is memoised stays skipped while its
 * age moves from 9m to 10m.
 */
import { useSyncExternalStore } from 'react';
import { formatAgo } from '@shared/ago';

const TICK_MS = 30_000;
let now = Date.now();
const subs = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(cb: () => void): () => void {
  subs.add(cb);
  if (subs.size === 1 && timer === null) {
    timer = setInterval(() => { now = Date.now(); subs.forEach((f) => f()); }, TICK_MS);
  }
  return () => {
    subs.delete(cb);
    if (subs.size === 0 && timer !== null) { clearInterval(timer); timer = null; }
  };
}
const read = (): number => now;

/** The clock every Ago reads; a fresh mount reads the real time once. */
export function useAgoClock(): number {
  const tick = useSyncExternalStore(subscribe, read, read);
  return Math.max(tick, now);
}

export function Ago({ ts, style }: { ts: number | undefined | null; style?: React.CSSProperties }) {
  const clock = useAgoClock();
  const text = formatAgo(ts, Math.max(clock, Date.now()));
  if (!text) return null;
  return (
    <span
      data-agent-ago
      title={typeof ts === 'number' ? new Date(ts).toLocaleString() : undefined}
      style={{ flexShrink: 0, fontVariantNumeric: 'tabular-nums', ...style }}
    >{text}</span>
  );
}
