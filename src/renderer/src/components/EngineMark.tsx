/**
 * The small square that says which engine an agent runs on: the engine's own
 * mark where there is one, else two letters. Square corners and a 1px inset
 * edge, like every Classic chip.
 */
import type { CSSProperties } from 'react';
import type { AgentProvider } from '@shared/agentProvider';
import { ENGINE_MONOGRAM } from '@shared/engine';
import { ProviderLogo, hasBrandMark } from './ProviderLogo';

export function EngineMark({ provider, size = 14, title, style }: {
  provider: AgentProvider | undefined; size?: number; title?: string; style?: CSSProperties;
}) {
  const p: AgentProvider = provider ?? 'claude';
  const drawn = hasBrandMark(p) || p === 'custom';
  return (
    <span
      data-engine={p}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      title={title}
      style={{
        width: size, height: size, flexShrink: 0,
        display: 'inline-grid', placeItems: 'center',
        background: 'var(--cth-cream-200)', color: 'var(--cth-ink-700)',
        boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)',
        ...style
      }}
    >
      {drawn
        ? <ProviderLogo provider={p} size={Math.round(size * 0.64)} />
        : <span style={{ fontFamily: 'var(--cth-font-ui)', fontSize: Math.round(size * 0.5), fontWeight: 700, lineHeight: 1 }}>{ENGINE_MONOGRAM[p]}</span>}
    </span>
  );
}
