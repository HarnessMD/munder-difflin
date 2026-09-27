/**
 * The cross cutting pieces from UI-PLAN-teams.md section 6, drawn once.
 *
 * There is no character art here and there must not be. A person is a glyph
 * tile with a status dot, and it never appears without its name beside it.
 */
import { CSSProperties, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { ConnectionState, NetworkLevel, Presence } from './types';
import type { StopReason } from '@shared/teams';
import { presetOf, type TeamPolicy } from '@shared/teamPolicy';
import { LEVEL_KEY } from './types';

/* ---- status ---------------------------------------------------------------
   Three renderings and they are not interchangeable: a 14px ring leads a list
   row, a 6px dot sits on an avatar, a tinted pill marks a terminal state. A row
   carries a ring OR a pill, never both for the same fact. */

export type StatusHue =
  | 'idle' | 'thinking' | 'working' | 'waiting' | 'blocked' | 'success' | 'ghost';

const hue = (h: StatusHue) => `var(--cth-status-${h})`;

export function StatusDot({ status, size = 6 }: { status: StatusHue; size?: number }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: 'var(--cth-radius-pill, 999px)',
      background: hue(status), flex: 'none', display: 'inline-block'
    }} />
  );
}

/**
 * `ghost` may never be rendered as a tinted pill. It is a near ground neutral,
 * so the pill form gives roughly 1.3:1 label contrast in both modes and the
 * word is unreadable. Ring or dot only, which is why it is not accepted here.
 */
export function StatusPill(
  { status, children }: { status: Exclude<StatusHue, 'ghost'>; children: ReactNode }
) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      height: 20, padding: '0 8px',
      borderRadius: 'var(--cth-radius-pill, 999px)',
      background: `var(--cth-status-${status}-tint)`,
      color: hue(status),
      fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap'
    }}>
      <StatusDot status={status} />
      {children}
    </span>
  );
}

/* ---- glyph avatar ---------------------------------------------------------
   28px rounded square, 1px border, initials in mono, status dot bottom right.
   The dot's halo has to be the surface the avatar actually sits on, so callers
   that place one on an inset or an alternate row pass `surface`. */

export function GlyphAvatar(
  { name, presence, size = 28, surface = 'var(--cth-cream-100)' }:
  { name: string; presence: Presence; size?: number; surface?: string }
) {
  const initials = name === 'You'
    ? 'ME'
    : name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const dot = Math.max(6, Math.round(size * 0.22));
  return (
    <span style={{ position: 'relative', flex: 'none', display: 'inline-block' }}>
      <span style={{
        width: size, height: size,
        display: 'grid', placeItems: 'center',
        background: 'var(--cth-cream-200)',
        boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)',
        borderRadius: size >= 40 ? 'var(--cth-radius-lg, 10px)' : 'var(--cth-radius-md, 8px)',
        color: 'var(--cth-ink-700)',
        fontFamily: 'var(--cth-font-mono)',
        fontSize: Math.max(10, Math.round(size * 0.38)),
        fontWeight: 500
      }}>{initials}</span>
      <span style={{
        position: 'absolute', right: -2, bottom: -2,
        width: dot, height: dot, borderRadius: 'var(--cth-radius-pill, 999px)',
        background: presence === 'online' ? hue('success') : hue('idle'),
        boxShadow: `0 0 0 1.5px ${surface}`
      }} />
    </span>
  );
}

/* ---- permission pill ------------------------------------------------------
   Greyscale on purpose. A permission is not a status, and giving it a status
   hue would put two colour signals in one row that mean different things. */

/** @deprecated The one word level, for the Classic seam. PRO draws
 *  {@link PolicyChip}, which can say all four presets. */
export function PermissionPill({ level }: { level: NetworkLevel }) {
  const { t } = useTranslation();
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      height: 20, padding: '0 8px',
      borderRadius: 'var(--cth-radius-sm, 6px)',
      boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)',
      color: 'var(--cth-ink-700)',
      fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap'
    }}>{t(`team.level.${LEVEL_KEY[level]}.label`)}</span>
  );
}

/**
 * A POLICY, as one word: Off, Listen, Converse, Open, or Custom for a
 * combination the four words do not cover. The words are the `team.pick`
 * vocabulary, the same one the picker and the dropdown speak (0.4.11), so a
 * chip and a control can never call one setting two different things.
 *
 * Greyscale like the pill above, and for the same reason. Even 1px all round,
 * never a thicker edge: the state is in the word, not in a rail.
 */
export function PolicyChip(
  { policy, title }: { policy: TeamPolicy; title?: string }
) {
  const { t } = useTranslation();
  const preset = presetOf(policy);
  return (
    <span title={title} style={{
      display: 'inline-flex', alignItems: 'center',
      height: 20, padding: '0 8px',
      borderRadius: 'var(--cth-radius-sm, 6px)',
      boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)',
      color: 'var(--cth-ink-700)',
      fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap'
    }}>{t(`team.pick.${preset ?? 'custom'}.word`)}</span>
  );
}

/* ---- fingerprint ---------------------------------------------------------- */

export function Fingerprint(
  { value, compareTo, style }: { value: string; compareTo?: string; style?: CSSProperties }
) {
  const base: CSSProperties = {
    fontFamily: 'var(--cth-font-mono)', fontSize: 12, lineHeight: '20px',
    letterSpacing: '0.04em', wordSpacing: '0.35em', color: 'var(--cth-ink-900)',
    ...style
  };
  if (!compareTo) return <div style={base}>{value}</div>;

  const now = value.split(' ');
  const was = compareTo.split(' ');
  return (
    <div style={base}>
      {now.map((group, i) => (
        <span key={i} style={group !== was[i]
          ? { color: 'var(--cth-status-blocked)', fontWeight: 600 }
          : undefined}>
          {group}{i < now.length - 1 ? ' ' : ''}
        </span>
      ))}
    </div>
  );
}

/* ---- connection chip (D12) -------------------------------------------------
   All five states, one component. It lives in the app chrome. */

const CONNECTION_HUE: Record<ConnectionState, StatusHue> = {
  'connected': 'success',
  'connecting': 'waiting',
  'reconnecting': 'waiting',
  'offline': 'ghost',
  /* A local policy state the person chose. Red says something broke;
     greyscale says you turned it off (Pam, connection-chip.html). */
  'network-blocked': 'ghost',
  /* Placeholder: `stopped` takes the REASON's hue below. */
  'stopped': 'ghost'
};

/** `stopped` takes the revocation reason's word and hue, Paused, Removed,
 *  Plan ended, rather than a generic label: in Office there is no rail, so
 *  the takeover is unreachable and the chip is the entire story. */
const STOPPED_HUE: Record<StopReason, StatusHue> = {
  suspended: 'waiting',
  removed: 'blocked',
  entitlement: 'working',
  unknown: 'ghost'
};

export function ConnectionChip(
  { state, reason, attempt, onClick }:
  { state: ConnectionState; reason?: StopReason; attempt?: number; onClick?: () => void }
) {
  const { t } = useTranslation();
  const h = state === 'stopped' ? STOPPED_HUE[reason ?? 'unknown'] : CONNECTION_HUE[state];
  /* The attempt counter is a claim about a schedule (Pam): the word is true,
     the number is not. Kept for the boards; the seam never passes one. */
  const label = state === 'reconnecting' && attempt
    ? t('team.connection.reconnectingAttempt', { count: attempt })
    : state === 'stopped'
      ? t(`team.connection.stopped.${reason ?? 'unknown'}`)
      : t(`team.connection.${state === 'network-blocked' ? 'networkBlocked' : state}`);

  return (
    <button
      onClick={onClick}
      title={t(`team.connection.${state === 'network-blocked' ? 'networkBlockedHint' : 'hint'}`)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        height: 24, padding: '0 8px',
        border: 'none', cursor: onClick ? 'pointer' : 'default',
        borderRadius: 'var(--cth-radius-sm, 6px)',
        background: 'transparent',
        boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)',
        color: 'var(--cth-ink-700)', fontSize: 11, whiteSpace: 'nowrap'
      }}>
      {/* Ghost never takes the pill form, so the chip carries a plain dot. */}
      {state === 'connecting' || state === 'reconnecting'
        ? <SteppedDots />
        : <StatusDot status={h} />}
      {label}
    </button>
  );
}

/**
 * Stepped dots, never a spinning CSS ring. Loading in this product steps; it
 * does not spin and it does not shimmer.
 */
export function SteppedDots({ color }: { color?: string }) {
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }} aria-hidden>
      {[0, 1, 2].map(i => (
        <span key={i} className="cth-stepped-dot" style={{
          width: 4, height: 4,
          background: color ?? 'var(--cth-status-waiting)',
          animationDelay: `${i * 300}ms`
        }} />
      ))}
    </span>
  );
}
