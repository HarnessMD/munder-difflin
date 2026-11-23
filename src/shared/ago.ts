/**
 * "AGO" IN ONE SHORT WORD (0.5.3, F25). The Classic row's live line ends
 * with how long ago the agent last did something: `now`, `12s`, `9m`, `1h`,
 * `2d`. Short because the column is narrow and the number is a glance, not
 * a timestamp; the full time is on hover. A future stamp is `now`, a
 * missing one is the empty string, never "NaNs".
 */
export function formatAgo(ts: number | undefined | null, now = Date.now()): string {
  if (typeof ts !== 'number' || !Number.isFinite(ts)) return '';
  const s = Math.max(0, Math.floor((now - ts) / 1000));
  if (s < 10) return 'now';
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
