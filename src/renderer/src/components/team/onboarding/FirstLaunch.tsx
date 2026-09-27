/**
 * D1: the very first screen after install, and the screen an install with no
 * membership sees on every launch (founder ruling, 3 Sep 2026,
 * `REQUIRE_MEMBERSHIP`). Amended twice on 5 Sep 2026, and the second word
 * stands: the split is FOR INDIVIDUALS and FOR TEAMS, just those two. The
 * individual path onboards first and meets the paywall AFTER (Paywall.tsx),
 * where buying and skipping to free are both real; there is no "use it free"
 * card here, because free is the paywall's skip, not a plan you pick at the
 * door. Teams is the join it always was.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface FirstLaunchProps {
  onIndividuals: () => void;
  onJoinTeam: () => void;
}

export function FirstLaunch({ onIndividuals, onJoinTeam }: FirstLaunchProps) {
  const { t } = useTranslation();
  return (
    <div style={{
      width: '100%', height: '100%', minHeight: 480, background: 'var(--cth-cream-50)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 32, padding: 24
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <span style={{
          fontFamily: 'var(--cth-font-display)', fontSize: 20, lineHeight: '28px',
          fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--cth-ink-900)'
        }}>Munder Difflin</span>
        <span style={{ fontSize: 13, lineHeight: '20px', color: 'var(--cth-ink-700)', maxWidth: '44ch', textAlign: 'center' }}>
          {t('firstRun.subtitle')}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        <PathCard
          title={t('firstRun.individuals.title')}
          sub={t('firstRun.individuals.sub')}
          art={<OneOffice />}
          onSelect={onIndividuals}
        />
        <PathCard
          title={t('firstRun.teams.title')}
          sub={t('firstRun.teams.sub')}
          art={<TwoOffices />}
          onSelect={onJoinTeam}
        />
      </div>
    </div>
  );
}

function PathCard(
  { title, sub, art, onSelect }:
  { title: string; sub: string; art: React.ReactNode; onSelect: () => void }
) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 380, height: 320,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 16,
        padding: 24, cursor: 'pointer', textAlign: 'center',
        border: 'none',
        borderRadius: 'var(--cth-radius-xl, 12px)',
        background: hover
          ? 'var(--cth-control-base, var(--cth-cream-200))'
          : 'var(--cth-control-quiet, var(--cth-cream-100))',
        boxShadow: `inset 0 0 0 1px ${hover ? 'var(--cth-ink-900)' : 'var(--cth-ink-300)'}`
      }}>
      <span style={{ color: 'var(--cth-ink-500)' }}>{art}</span>
      <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--cth-ink-900)' }}>{title}</span>
      <span style={{ fontSize: 13, lineHeight: '20px', color: 'var(--cth-ink-700)', maxWidth: '30ch' }}>
        {sub}
      </span>
    </button>
  );
}

const stroke = {
  fill: 'none', stroke: 'currentColor', strokeWidth: 1.25,
  strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const
};

/** One office, whole on its own. Same geometry family as TwoOffices. */
function OneOffice() {
  return (
    <svg width="96" height="56" viewBox="0 0 96 56" {...stroke} aria-hidden>
      <rect x="28" y="10" width="40" height="34" rx="4" />
      <circle cx="40" cy="22" r="3.5" />
      <path d="M34 33h28M34 38h18" />
      <path d="M48 10V4M42 4h12" strokeDasharray="3 3" />
    </svg>
  );
}

/** Two node graphs joined by a channel. Geometric, never character art. */
function TwoOffices() {
  return (
    <svg width="96" height="56" viewBox="0 0 96 56" {...stroke} aria-hidden>
      <rect x="2" y="14" width="34" height="28" rx="4" />
      <rect x="60" y="14" width="34" height="28" rx="4" />
      <circle cx="12" cy="24" r="3" /><circle cx="70" cy="24" r="3" />
      <path d="M8 33h22M66 33h22M8 37h14M66 37h14" />
      <path d="M12 21V8h72v13" strokeDasharray="3 3" />
      <rect x="42" y="2" width="12" height="10" rx="2" />
    </svg>
  );
}
