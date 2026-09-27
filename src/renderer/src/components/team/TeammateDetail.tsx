/**
 * D8 — teammate detail, 560 wide.
 *
 * The asymmetry on this screen is the point and it should stay visible: what
 * THEY allow is read only, because only they can change it from their own
 * machine. What YOU allow them is editable, and it is a per person setting on
 * top of your status.
 *
 * 0.4.11, THE SIMPLIFICATION. The drawer used to open with three sentences
 * about what could cross, then their setting in a chip and two paragraphs,
 * then the full editor with four cards and three toggles. Same facts four
 * ways. Now:
 *
 *   THE HEADER SAYS THE ONE THING WORTH SAYING. When both directions are open
 *   it says nothing extra. When something is closed it shows the single
 *   tightest fact as one sentence, from `laneSummary` in `@shared/laneSummary`,
 *   so the drawer and the roster row cannot disagree.
 *
 *   YOUR SETTING FOR THIS PERSON IS ONE DROPDOWN. "Follow my status" is the
 *   default and means no setting of their own; the four words mean exactly
 *   what they mean everywhere else. A stored mix the words cannot say shows
 *   as Custom until a word replaces it. The raw switches are not here: a per
 *   person mix is set from the machine wide surface, and the words cover what
 *   a person actually asks for.
 *
 * TWO EDITORS, ONE COMPONENT, AND THAT IS DELIBERATE. PRO passes
 * `onChangePolicy` and gets the dropdown. The Classic seam (`TeamTab.tsx`)
 * still passes `onChangeYouAllow` and gets the three `LevelCard`s it has
 * always had. There is no lossy mapping between them: the old control cannot
 * produce `listen`, so it is never asked to render one.
 */
import { useTranslation } from 'react-i18next';
import {
  POLICY_PRESETS, canSendTo, effectivePolicy, policyOf, presetOf, sendBlock,
  type PolicyPreset, type TeamPolicy,
} from '@shared/teamPolicy';
import { laneSummary } from '@shared/laneSummary';
import { Fingerprint, GlyphAvatar, PolicyChip, StatusPill } from './primitives';
import type { NetworkLevel, Teammate } from './types';
import { LEVEL_KEY, NETWORK_LEVELS } from './types';
import { Btn, SelectBox } from '../pro/ui';

export interface TeammateDetailProps {
  mate: Teammate;
  onClose: () => void;
  /** What you allow this person, BEFORE your status is applied. Absent means
   *  the caller is the Classic seam and `mate.youAllow` stands in. */
  policy?: TeamPolicy;
  /** Your status, so the drawer computes what is actually in force. */
  status?: TeamPolicy;
  /** What they allow you, as the relay reports it. */
  theirs?: TeamPolicy;
  /** True when this person has their own setting rather than following your
   *  status. Drives which option the dropdown shows as chosen. */
  overridden?: boolean;
  /** PRO. `null` puts this person back on "Follow my status". */
  onChangePolicy?: (policy: TeamPolicy | null) => void;
  /** @deprecated The Classic seam's one word door (`TeamTab.tsx:167`). */
  onChangeYouAllow?: (level: NetworkLevel) => void;
  onVerify: () => void;
  /**
   * Open D11 with this teammate. This button used to have no handler at all,
   * which made the thread a screen that existed and could not be reached: the
   * only route to it is from here.
   */
  onMessage: () => void;
}

/** What the dropdown can say: follow the status, one of the four words, or
 *  the word for a stored mix the four do not cover. */
type YourSetting = 'follow' | PolicyPreset | 'custom';

export function TeammateDetail({
  mate, onClose, policy, status, theirs, overridden, onChangePolicy, onChangeYouAllow, onVerify, onMessage
}: TeammateDetailProps) {
  const { t } = useTranslation();

  const yours = policy ?? legacyPolicy(mate.youAllow);
  const myStatus = status ?? policyOf('open');
  const theirPolicy = theirs ?? legacyPolicy(mate.theyAllow);
  const mine = effectivePolicy(myStatus, yours);

  const iCanSend = canSendTo(mine, theirPolicy);
  const block = sendBlock(mine, theirPolicy);
  /* The one sentence about this lane, or null when both directions are open
     and there is nothing to say. Shared with the roster row. */
  const lane = laneSummary(mine, theirPolicy);
  /* The footer is about the Message button, so its reason is always the
     OUTBOUND fact, whichever lane the header sentence chose. */
  const outReason = block === 'they-not-receiving' ? t('team.lane.theyClosedOut') : t('team.lane.youClosedOut');

  const chosen: YourSetting = overridden === true ? (presetOf(yours) ?? 'custom') : 'follow';
  const settingOptions: { value: YourSetting; label: string }[] = [
    { value: 'follow', label: t('team.pick.follow.word') },
    ...POLICY_PRESETS.map((p) => ({ value: p as YourSetting, label: t(`team.pick.${p}.word`) })),
    ...(chosen === 'custom' ? [{ value: 'custom' as YourSetting, label: t('team.pick.custom.word') }] : [])
  ];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0, zIndex: 40,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', justifyContent: 'flex-end'
      }}>
      <aside
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          width: 560, maxWidth: '100%', height: '100%',
          background: 'var(--cth-cream-100)',
          boxShadow: 'inset 1px 0 0 var(--cth-ink-300), var(--cth-shadow-hard)',
          display: 'flex', flexDirection: 'column'
        }}>
        <header style={{
          display: 'flex', alignItems: 'flex-start', gap: 12, padding: 16,
          boxShadow: 'inset 0 -1px 0 var(--cth-ink-300)'
        }}>
          <GlyphAvatar name={mate.name} presence={mate.presence} size={48} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--cth-ink-900)' }}>{mate.name}</span>
            <span style={{ fontSize: 12, color: 'var(--cth-ink-500)' }}>{mate.machine}</span>
            {/* Nothing here while the lane is fully open: an open lane needs no
                caption. One sentence when something is closed. */}
            {lane && (
              <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>
                {t(`team.lane.${lane}`)}
              </span>
            )}
          </div>
          <Btn kind="ghost" size="sm" onClick={onClose}>{t('common.close')}</Btn>
        </header>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <Section label={t('team.detail.youAllow')}>
            {onChangePolicy ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <SelectBox<YourSetting>
                  value={chosen}
                  options={settingOptions}
                  ariaLabel={t('team.detail.youAllow')}
                  onChange={(v) => {
                    if (v === 'custom') return;
                    onChangePolicy(v === 'follow' ? null : policyOf(v));
                  }}
                />
                <p style={{ margin: 0, fontSize: 12, lineHeight: '17px', color: 'var(--cth-ink-500)' }}>
                  {t(`team.pick.${chosen}.line`)}
                </p>
              </div>
            ) : (
              <div role="radiogroup" aria-label={t('team.detail.youAllow')}
                style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {NETWORK_LEVELS.map(level => (
                  <LevelCard
                    key={level}
                    level={level}
                    selected={mate.youAllow === level}
                    onSelect={() => onChangeYouAllow?.(level)}
                  />
                ))}
              </div>
            )}
          </Section>

          <Section label={t('team.detail.theyAllow')}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <PolicyChip policy={theirPolicy} />
                <span style={{ fontSize: 12, color: 'var(--cth-ink-500)' }}>
                  {t(`team.presence.${mate.presence}`)}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>
                {t('team.detail.theirsToChange', { name: mate.name })}
              </p>
            </div>
          </Section>

          <Section label={t('team.detail.verify')}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Fingerprint value={mate.fingerprint} compareTo={mate.previousFingerprint} />
                </div>
                {mate.verified
                  ? <StatusPill status="success">{t('team.verified')}</StatusPill>
                  : <Btn size="sm" onClick={onVerify}>
                      {t('team.detail.markVerified')}
                    </Btn>}
              </div>
              <p style={{ margin: 0, fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>
                {t('team.detail.compareHint')}
              </p>
            </div>
          </Section>
        </div>

        <footer style={{
          padding: 12, boxShadow: 'inset 0 1px 0 var(--cth-ink-300)',
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          <Btn kind="ghost" disabled={!iCanSend} onClick={onMessage} title={iCanSend ? undefined : outReason}>
            {t('team.detail.messageTheirMichael')}
          </Btn>
          {!iCanSend && (
            <span style={{ fontSize: 12, color: 'var(--cth-ink-500)' }}>
              {outReason}
            </span>
          )}
        </footer>
      </aside>
    </div>
  );
}

/** A stored or wire value read as a policy. `normalizePolicy` lives in
 *  `@shared/teamPolicy` and takes the three old words through
 *  `presetFromLegacy`, so this is exact rather than a guess. */
function legacyPolicy(level: NetworkLevel): TeamPolicy {
  return level === 'allow-all' ? policyOf('open')
    : level === 'communication-only' ? policyOf('converse')
      : policyOf('off');
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section style={{ padding: 16, boxShadow: 'inset 0 -1px 0 var(--cth-ink-100)' }}>
      <div style={{
        fontFamily: 'var(--cth-font-mono)', fontSize: 11, fontWeight: 500,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        color: 'var(--cth-ink-500)', marginBottom: 10
      }}>{label}</div>
      {children}
    </section>
  );
}

/** The card shape the legacy editor draws. Kept for the Classic seam and for
 *  `onboarding/JoinedSummary.tsx`, which still choose between three words. */
function RadioCard(
  { selected, onSelect, label, blurb, note }:
  { selected: boolean; onSelect: () => void; label: string; blurb: string; note: string }
) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        width: '100%', textAlign: 'start', padding: 12, cursor: 'pointer',
        border: 'none',
        borderRadius: 'var(--cth-radius-lg, 10px)',
        background: selected
          ? 'var(--cth-control-base, var(--cth-cream-200))'
          : 'var(--cth-control-quiet, var(--cth-cream-100))',
        boxShadow: selected
          ? 'inset 0 0 0 1px var(--cth-ink-900)'
          : 'inset 0 0 0 1px var(--cth-ink-300)'
      }}>
      <span style={{
        width: 14, height: 14, marginTop: 2, flex: 'none',
        borderRadius: 'var(--cth-radius-pill, 999px)',
        boxShadow: `inset 0 0 0 1.5px ${selected ? 'var(--cth-ink-900)' : 'var(--cth-ink-500)'}`,
        display: 'grid', placeItems: 'center'
      }}>
        {selected && <span style={{
          width: 6, height: 6, borderRadius: 'var(--cth-radius-pill, 999px)',
          background: 'var(--cth-ink-900)'
        }} />}
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--cth-ink-900)' }}>{label}</span>
        <span style={{ fontSize: 13, lineHeight: '18px', color: 'var(--cth-ink-700)' }}>{blurb}</span>
        <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>{note}</span>
      </span>
    </button>
  );
}

/**
 * @deprecated The three old levels as cards. Still drawn by the Classic seam
 * and by `onboarding/JoinedSummary.tsx`, which is why it is still exported.
 * PRO draws the dropdown above.
 */
export function LevelCard(
  { level, selected, onSelect }:
  { level: NetworkLevel; selected: boolean; onSelect: () => void }
) {
  const { t } = useTranslation();
  const key = LEVEL_KEY[level];
  return (
    <RadioCard
      selected={selected}
      onSelect={onSelect}
      label={t(`team.level.${key}.label`)}
      blurb={t(`team.level.${key}.blurb`)}
      note={t(`team.level.${key}.consequence`)} />
  );
}
