import { useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { HarnessConfig } from '@/store/config';
import { useStore } from '@/store/store';
import { PixelButton } from './PixelButton';
import { listThemes } from '@/scene/themes/themeCatalog';
import { floorSceneTheme, isPackProjectTheme, offeredProjectThemes, type ProjectThemeId } from '@shared/projectTheme';

// The TV-show maps with no content yet show a "soon" chip; their floor is the
// office until the content lands. A pack's card line and swatch: the catalogue
// gives a pack only its label.
const NOT_BUILT = new Set<ProjectThemeId>(['friends', 'siliconvalley', 'got', 'hogwarts']);
const PACK_CARD: Record<string, { blurb: string; swatch: string }> = {
  starhike: { blurb: 'The starship bridge', swatch: '#1f6b66' },
};

/** The project's folder name, for "The floor for {{project}}". */
function projectName(home: string | null | undefined): string {
  const parts = (home ?? '').replace(/[\\/]+$/, '').split(/[\\/]/);
  return parts[parts.length - 1] || (home ?? '');
}

export interface OfficeThemePickerProps {
  config: HarnessConfig;
  /** The project's theme in force: main's read back after the last Save. */
  current: ProjectThemeId;
  /** The card picked and waiting for Settings' Save, or null. */
  pick: ProjectThemeId | null;
  onPick: (id: ProjectThemeId | null) => void;
  /** The last Save could not store the pick (config.json damaged or busy). */
  notSaved: boolean;
}

/** Settings "Office Theme" section: this project's floor. The Office and the
 *  packs are always listed, the five TV-show floors while the experimental flag
 *  is on. A pick waits for Save like every other setting here, and a switch
 *  keeps every agent: only the look changes. */
export function OfficeThemePicker({ config, current, pick, onPick, notSaved }: OfficeThemePickerProps) {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(!!config.tvShowOffices);
  const setOfficeTheme = useStore((s) => s.setOfficeTheme);

  const credits = new Map(listThemes().filter((x) => !x.builtIn).map((x) => [x.id, x.credit]));
  // The Office first, then the packs, then the TV-show floors.
  const offered = offeredProjectThemes(enabled);
  const cards = [
    ...offered.filter((x) => x.id === 'office'),
    ...offered.filter((x) => isPackProjectTheme(x.id)),
    ...offered.filter((x) => x.id !== 'office' && !isPackProjectTheme(x.id)),
  ];
  // The floor actually drawn: a TV-show theme with the flag off shows the office.
  const shown = floorSceneTheme(current, enabled);
  const pickLabel = pick ? cards.find((x) => x.id === pick)?.label : undefined;

  const toggleFlag = async () => {
    const next = !enabled;
    setEnabled(next);
    // A TV-show floor picked but not saved leaves the list with the flag.
    if (!next && pick && pick !== 'office' && !isPackProjectTheme(pick)) onPick(null);
    try {
      await window.cth.updateConfig({ tvShowOffices: next });
      // Flag off: a TV-show theme shows the office; flag on: the project's theme again.
      setOfficeTheme(floorSceneTheme(current, next));
    } catch {
      setEnabled(!next); // revert optimistic toggle on failure
    }
  };

  // Picking the floor already shown takes back a waiting pick.
  const onSelect = (id: ProjectThemeId) => onPick(id === shown ? null : id);

  const chip = (color: string): CSSProperties => ({
    fontFamily: 'var(--cth-font-display)', fontSize: 7, color, textTransform: 'uppercase', whiteSpace: 'nowrap',
  });
  const noteStyle: CSSProperties = { marginTop: 10, fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-700)' };

  return (
    <div>
      <div style={{
        fontFamily: 'var(--cth-font-display)', fontSize: 8, lineHeight: '12px',
        color: 'var(--cth-ink-500)', textTransform: 'uppercase', marginBottom: 10
      }}>
        {t('officeTheme.title')}
      </div>
      <div style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>
        {t('officeTheme.forProject', { project: projectName(config.harnessHome) })}
      </div>

      <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
        {cards.map((theme) => {
          const isCurrent = theme.id === shown;
          const isPick = theme.id === pick;
          const built = !NOT_BUILT.has(theme.id);
          const blurb = PACK_CARD[theme.id]?.blurb ?? theme.blurb;
          const swatchColour = PACK_CARD[theme.id]?.swatch ?? theme.swatch;
          const credit = credits.get(theme.id);
          const card: CSSProperties = {
            display: 'flex', alignItems: 'center', gap: 8, textAlign: 'start',
            padding: 8, cursor: 'pointer', minWidth: 0, width: '100%',
            background: isCurrent || isPick ? 'var(--cth-paper-100)' : 'transparent',
            boxShadow: isCurrent || isPick
              ? 'inset 0 0 0 1.5px var(--cth-ink-500)'
              : 'inset 0 0 0 1px var(--cth-ink-300)',
          };
          const swatch = (
            <span style={{
              width: 28, height: 28, flexShrink: 0, background: swatchColour,
              boxShadow: 'inset 0 0 0 1.5px var(--cth-ink-500)',
            }} />
          );
          const text = (
            <>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {theme.label}
                </span>
                {isCurrent && <span style={chip('var(--cth-mint)')}>{t('officeTheme.current')}</span>}
                {isPick && <span style={chip('var(--cth-ink-700)')}>{t('officeTheme.onSave')}</span>}
                {!built && !isCurrent && !isPick && <span style={chip('var(--cth-ink-500)')}>{t('officeTheme.soon')}</span>}
              </span>
              <span dir="ltr" style={{ fontSize: 11, lineHeight: '14px', color: 'var(--cth-ink-500)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {blurb}
              </span>
            </>
          );
          if (!credit) {
            return (
              <button key={theme.id} onClick={() => onSelect(theme.id)} style={card}>
                {swatch}
                <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>{text}</span>
              </button>
            );
          }
          // A link cannot sit inside a button: this card is a box holding the pick button and the credit.
          return (
            <div key={theme.id} style={{ ...card, cursor: 'default' }} data-theme-card={theme.id}>
              {swatch}
              <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                <button
                  onClick={() => onSelect(theme.id)}
                  style={{ all: 'unset', display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0, cursor: 'pointer' }}
                >
                  {text}
                </button>
                <a
                  href={credit.url}
                  dir="ltr"
                  onClick={(e) => { e.preventDefault(); void window.cth.openExternal(credit.url); }}
                  style={{
                    fontSize: 11, lineHeight: '14px', color: 'var(--cth-ink-500)', textDecoration: 'underline',
                    textUnderlineOffset: 2, whiteSpace: 'nowrap', alignSelf: 'flex-start', cursor: 'pointer',
                  }}
                >
                  {credit.text}
                </a>
              </span>
            </div>
          );
        })}
      </div>

      {/* What Save will do; or why the last Save kept the old floor. */}
      {pick && pickLabel && <div style={noteStyle}>{t('officeTheme.keepsAgents', { label: pickLabel })}</div>}
      {!pick && notSaved && <div style={noteStyle} role="status">{t('officeTheme.notSaved')}</div>}

      {/* Experimental feature flag: adds the TV-show floors to the cards above */}
      <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 13, lineHeight: '20px', color: 'var(--cth-ink-900)' }}>
            {t('officeTheme.tvShow')} <span style={{ color: 'var(--cth-ink-500)' }}>({t('officeTheme.experimental')})</span>
          </span>
          <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>
            {t('officeTheme.desc')}
          </span>
        </div>
        <PixelButton variant={enabled ? 'primary' : 'secondary'} size="sm" onClick={toggleFlag}>
          {enabled ? t('common.on') : t('common.off')}
        </PixelButton>
      </div>
    </div>
  );
}
