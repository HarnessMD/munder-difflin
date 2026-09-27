/**
 * THE ENGINE, DRAWN. Founder, 5 Sep 2026: every agent in the sidebar and on
 * the Agents grid shows which provider runs it (the logo) and which model.
 *
 *   EngineBadge     a small square, 1:1, the provider's brand mark in ink on
 *                   the cream ground, sat just left of the status dot in the
 *                   sidebar and at the head of the engine line on a card. A
 *                   provider with no mark of its own (Grok, Kimi, OpenCode,
 *                   Crush, Pi, Cursor) shows its two letter monogram rather
 *                   than the same terminal glyph six times over; Custom keeps
 *                   the terminal glyph, because that is what it is.
 *   EngineLine      the badge and the model's short name in one muted line
 *                   that ellipsises from the end, so a narrow column loses
 *                   the tail of the text and never overflows (the founder's
 *                   rule: "only the first few characters if the space is not
 *                   enough"). `after` is what follows the model on the same
 *                   line (a card's role sentence, the orchestrator's context
 *                   figure), and it is the part that goes first.
 *   useEngineWords  the words both share: the model's label, and the tooltip
 *                   that names provider and model in full, with the raw id
 *                   in the technical rendering. One hook, so the badge, the
 *                   line and the sidebar row never disagree.
 */
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { AgentProvider } from '@shared/agentProvider';
import { ENGINE_MONOGRAM, ENGINE_NAME } from '@shared/engine';
import { modelWord } from '@/store/config';
import { ProviderLogo, hasBrandMark } from '../ProviderLogo';
import { useTechnical } from './depth';

export interface EngineWords {
  /** The provider's short name: "Claude Code". */
  provider: string;
  /** The model's short name: "Sonnet 4.6 · 1M", or the CLI default said as such. */
  model: string;
  /** Provider and model in full, the raw id too in the technical rendering. */
  title: string;
}

export function useEngineWords(provider: AgentProvider | undefined, model: string | undefined): EngineWords {
  const { t } = useTranslation();
  const technical = useTechnical();
  const p: AgentProvider = provider ?? 'claude';
  const name = ENGINE_NAME[p];
  const label = modelWord(p, model);
  const word = label ?? t('pro.agents.cliDefault');
  const raw = (model ?? '').trim();
  const title = technical && raw && raw !== word ? `${name} · ${word} · ${raw}` : `${name} · ${word}`;
  return { provider: name, model: word, title };
}

export function EngineBadge({ provider, size = 14, title, style }: {
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
        width: size, height: size, borderRadius: Math.round(size * 0.29), flexShrink: 0,
        display: 'inline-grid', placeItems: 'center',
        background: 'var(--cth-cream-200)', color: 'var(--cth-ink-700)',
        boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)',
        ...style
      }}
    >
      {drawn
        ? <ProviderLogo provider={p} size={Math.round(size * 0.64)} />
        : <span style={{ fontFamily: 'var(--cth-font-ui)', fontSize: Math.round(size * 0.5), fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em' }}>{ENGINE_MONOGRAM[p]}</span>}
    </span>
  );
}

export function EngineLine({ provider, model, after, size = 14, style }: {
  provider: AgentProvider | undefined; model: string | undefined;
  /** Follows the model on the same line, after a middle dot; empty draws nothing. */
  after?: string; size?: number; style?: CSSProperties;
}) {
  const w = useEngineWords(provider, model);
  return (
    <span data-engine-line title={w.title} style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0, fontSize: 11, color: 'var(--cth-ink-500)', ...style }}>
      <EngineBadge provider={provider} size={size} />
      <span style={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{after ? `${w.model} · ${after}` : w.model}</span>
    </span>
  );
}
