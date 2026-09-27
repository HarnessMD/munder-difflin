/**
 * D4 — the payoff. Confirms they are in and shows the team immediately, because
 * "you joined" without seeing who you joined is not a confirmation of anything.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton } from '../../PixelButton';
import { PixelPanel } from '../../PixelPanel';
import { GlyphAvatar } from '../primitives';
import { LevelCard } from '../TeammateDetail';
import { useRoster } from '../useRoster';
import { NETWORK_LEVELS, type NetworkLevel } from '../types';
import { Centred } from './EnterInviteCode';

export interface JoinedSummaryProps {
  /** From the relay's enrol answer: what the org calls itself. */
  orgName: string;
  onOpen: (level: NetworkLevel) => void;
}

export function JoinedSummary({ orgName, onOpen }: JoinedSummaryProps) {
  const { t } = useTranslation();
  /* The first signed read this machine ever makes, with the device id the
     relay just minted. "Checking who's on your team" on D3 was the promise;
     this is the check. In the harness it is the fixture. */
  const roster = useRoster();
  const [level, setLevel] = useState<NetworkLevel | null>(null);
  const chosen = level ?? roster.defaultPermission;
  const everyone = roster.self ? [roster.self, ...roster.teammates] : roster.teammates;

  return (
    <Centred>
      <PixelPanel variant="dialog" noPadding style={{ width: 560, maxWidth: '100%' }}>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--cth-ink-900)' }}>
              {t('firstRun.joined.title')}
            </span>
            <span style={{ fontSize: 13, color: 'var(--cth-ink-700)' }}>
              {t('firstRun.joined.sub', { org: orgName })}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {everyone.map(m => (
              <div key={m.id} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'flex-start', gap: 4, width: 64
              }}>
                <GlyphAvatar name={m.name} presence={m.presence} size={40}
                  surface="var(--cth-cream-50)" />
                <span style={{
                  fontSize: 11, color: 'var(--cth-ink-700)', textAlign: 'center',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 64
                }}>{m.isSelf ? t('team.you') : m.name.split(' ')[0]}</span>
                {/* The badge slot is rendered for everyone and left empty for
                    the rest, so one badge does not make its column taller than
                    the row it sits in. */}
                <span style={{ height: 16, display: 'inline-flex', alignItems: 'center' }}>
                  {m.isSelf && (
                    <span style={{
                      height: 16, padding: '0 5px', display: 'inline-flex', alignItems: 'center',
                      borderRadius: 'var(--cth-radius-sm, 6px)',
                      background: 'var(--cth-cream-300)',
                      fontFamily: 'var(--cth-font-mono)', fontSize: 9, color: 'var(--cth-ink-700)'
                    }}>{t('team.youBadge')}</span>
                  )}
                </span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{
              fontFamily: 'var(--cth-font-mono)', fontSize: 11, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'var(--cth-ink-500)'
            }}>{t('firstRun.joined.yourLevel')}</span>
            <div role="radiogroup" aria-label={t('firstRun.joined.yourLevel')}
              style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {NETWORK_LEVELS.map(l => (
                <LevelCard key={l} level={l} selected={chosen === l} onSelect={() => setLevel(l)} />
              ))}
            </div>
          </div>

          <PixelButton variant="primary" size="lg" fullWidth onClick={() => onOpen(chosen)}>
            {t('firstRun.joined.open')}
          </PixelButton>
        </div>
      </PixelPanel>
    </Centred>
  );
}
