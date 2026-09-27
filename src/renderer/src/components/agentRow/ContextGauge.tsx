/**
 * THE CLASSIC CONTEXT GAUGE, EIGHT PIXEL SEGMENTS (0.5.3, F25, Pam's Classic
 * cards: hive/shared/design/sidebar-free/final). The 0..8 gauge AgentCard has
 * drawn since v0.3.4, now as discrete segments with the V2 percent beside
 * it. Same escalation as the card: the agent's accent, lemon from six of
 * eight, coral from seven. Absent without a session: the caller draws
 * nothing rather than a confident empty gauge.
 */
import type { AccentColorName } from '@/design/tokens';

export const GAUGE_SEGMENTS = 8;

/** Whole segments lit for a context percentage (0..100 → 0..8). */
export function segmentsOf(pct: number): number {
  return Math.max(0, Math.min(GAUGE_SEGMENTS, Math.round((pct / 100) * GAUGE_SEGMENTS)));
}

/** The percent the row prints, or null with no live session (no limit, or
 *  no count yet), the same rule as Pro's row and AgentScreen's ctxPct. */
export function contextPercent(tokens: number | undefined, limit: number | undefined): number | null {
  return limit && tokens !== undefined ? Math.min(100, Math.round((tokens / limit) * 100)) : null;
}

export function segmentColor(segments: number, accent: AccentColorName): string {
  return segments >= 7 ? 'var(--cth-coral)' : segments >= 6 ? 'var(--cth-lemon)' : `var(--cth-${accent})`;
}

/** The percent's ink: quiet until the window is nearly full. */
export function percentColor(pct: number): string {
  return pct >= 88 ? 'var(--cth-coral)' : pct >= 75 ? 'var(--cth-lemon)' : 'var(--cth-ink-500)';
}

export function ContextGauge({ segments, accent, height = 5, title, style }: {
  segments: number; accent: AccentColorName; height?: number; title?: string; style?: React.CSSProperties;
}) {
  const on = segmentColor(segments, accent);
  return (
    <span data-context-gauge={segments} title={title} style={{ display: 'flex', gap: 2, flex: 1, minWidth: 0, ...style }}>
      {Array.from({ length: GAUGE_SEGMENTS }, (_, i) => (
        <i key={i} style={{ flex: 1, height, background: i < segments ? on : 'var(--cth-ink-100)' }} />
      ))}
    </span>
  );
}
