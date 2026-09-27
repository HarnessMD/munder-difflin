/**
 * The small layout pieces the orchestrator's tabs share: the prototype's
 * `.godv` grid of cards, a card heading with a right slot, a stat, a muted
 * line, and the copy control the technical rendering puts behind an id or a
 * path. Kit tokens only; every colour is a `--cth-*` variable.
 */
import type { CSSProperties, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, IconBtn, proToast } from '../ui';

/** The tab body: a scrolling grid of cards, two columns unless told one. */
export function GodGrid({ columns = 2, children }: { columns?: 1 | 2; children: ReactNode }) {
  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 18, display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 14, alignContent: 'start' }}>
      {children}
    </div>
  );
}

export function GodCard({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <Card style={{ padding: 14, gap: 10, ...style }}>{children}</Card>;
}

export function CardH({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
      <h3 style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: 'var(--cth-ink-900)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{children}</h3>
      {right}
    </div>
  );
}

export function Muted({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <p style={{ margin: 0, fontSize: 11.5, color: 'var(--cth-ink-500)', lineHeight: 1.45, ...style }}>{children}</p>;
}

/** A headline figure: a small upper case label over a large value. */
export function Stat({ label, value, small }: { label: string; value: ReactNode; small?: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--cth-ink-500)' }}>{label}</span>
      <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--cth-accent-text)', fontFamily: 'var(--cth-font-mono)', display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
        {value}
        {small && <small style={{ fontSize: 12, fontWeight: 500, color: 'var(--cth-ink-500)', fontFamily: 'var(--cth-font-ui)' }}>{small}</small>}
      </span>
    </div>
  );
}

/** The copy control behind an id or a path in the technical rendering. */
export function CopyBtn({ value, title, size = 24 }: { value: string; title: string; size?: number }) {
  const { t } = useTranslation();
  return (
    <IconBtn
      name="copy" size={size} title={title}
      onClick={() => {
        window.cth.copyToClipboard(value)
          .then((r) => proToast(r.ok ? t('pro.god.copied') : t('pro.god.copyFailed'), { tone: r.ok ? 'ok' : 'bad' }))
          .catch(() => proToast(t('pro.god.copyFailed'), { tone: 'bad' }));
      }}
    />
  );
}

/** A centred note for a tab with nothing to show yet. */
export function EmptyNote({ children }: { children: ReactNode }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24, textAlign: 'center', color: 'var(--cth-ink-500)', fontSize: 13, maxWidth: 420, margin: '0 auto' }}>
      {children}
    </div>
  );
}

export const monoText: CSSProperties = { fontFamily: 'var(--cth-font-mono)', fontSize: 12, color: 'var(--cth-ink-900)', overflowWrap: 'anywhere' };
