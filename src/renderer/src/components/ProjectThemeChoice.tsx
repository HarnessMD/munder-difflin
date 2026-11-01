import type { CSSProperties, KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { SpritePortrait } from './SpritePortrait';
import { listThemes, themeBuilder, themeProjectDefaults } from '@/scene/themes/themeCatalog';
import { orchestratorDefaultLook } from '@/scene/themes/looks';
import { offeredProjectThemes, type ProjectThemeId } from '@shared/projectTheme';
import { resolveGodName } from '@shared/godIdentity';

/** A new project's orchestrator: a fresh hive has no saved name, so its first start
 *  shows what resolveGodName gives for none. The pack never names it (only its look
 *  comes from the pack). */
const NEW_GOD_NAME = resolveGodName(null);

export interface ProjectThemeChoiceProps {
  pick: ProjectThemeId;
  onPick: (id: ProjectThemeId) => void;
  disabled?: boolean;
}

/** The floors a new project can start on (Pam's P2): The Office and every pack.
 *  The TV-show floors stay a Settings choice. A pack's row shows the look its
 *  orchestrator starts with, and the pack's art credit. */
export function ProjectThemeChoice({ pick, onPick, disabled }: ProjectThemeChoiceProps) {
  const { t } = useTranslation();
  const credits = new Map(listThemes().filter((x) => !x.builtIn).map((x) => [x.id, x.credit]));
  const themes = offeredProjectThemes(false);

  const line: CSSProperties = { fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' };
  return (
    <div role="radiogroup" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {themes.map((theme) => {
        const selected = theme.id === pick;
        const isOffice = theme.id === 'office';
        const credit = credits.get(theme.id);
        const seed = isOffice ? undefined : themeProjectDefaults(theme.id)?.orchestrator;
        const look = seed ? orchestratorDefaultLook(themeBuilder(theme.id) ?? undefined, undefined, seed.appearance) : null;
        const choose = () => { if (!disabled) onPick(theme.id); };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(); } };
        return (
          <div
            key={theme.id}
            role="radio"
            aria-checked={selected}
            tabIndex={disabled ? -1 : 0}
            onClick={choose}
            onKeyDown={onKey}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: 10, textAlign: 'start',
              cursor: disabled ? 'default' : 'pointer',
              background: selected ? 'var(--cth-paper-100)' : 'transparent',
              boxShadow: selected ? 'inset 0 0 0 1.5px var(--cth-ink-500)' : 'inset 0 0 0 1px var(--cth-ink-300)',
            }}
          >
            {isOffice ? (
              <span style={{ width: 28, height: 28, flexShrink: 0, background: theme.swatch, boxShadow: 'inset 0 0 0 1.5px var(--cth-ink-500)' }} />
            ) : (
              <span style={{ width: 36, height: 56, flexShrink: 0, overflow: 'hidden' }}>
                <SpritePortrait
                  agent={{ id: 'god', character: 'michael', ...(look ? { appearanceByTheme: { [theme.id]: look } } : {}) }}
                  themeId={theme.id}
                  scale={2}
                />
              </span>
            )}
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <span dir="ltr" style={{ fontSize: 13, lineHeight: '18px', fontWeight: 700, color: 'var(--cth-ink-900)', alignSelf: 'flex-start' }}>
                {theme.label}
              </span>
              <span style={line}>
                {isOffice ? t('projectTheme.office') : theme.id === 'starhike' ? t('projectTheme.starhike') : theme.label}
              </span>
              <span style={line}>
                {theme.id === 'starhike' ? t('projectTheme.captain', { god: NEW_GOD_NAME }) : t('projectTheme.starts', { god: NEW_GOD_NAME })}
              </span>
              {credit && (
                <a
                  href={credit.url}
                  dir="ltr"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); void window.cth.openExternal(credit.url); }}
                  style={{ fontSize: 11, lineHeight: '14px', color: 'var(--cth-ink-500)', textDecoration: 'underline', textUnderlineOffset: 2, alignSelf: 'flex-start', cursor: 'pointer' }}
                >
                  {credit.text}
                </a>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Why a new project's folder was refused (Pam's P2): a tag and one line, no red.
 *  `error` is main's id from changeHome; other errors are not this row's. */
export function ProjectFolderError({ error }: { error: 'not-empty' | 'unreadable' }) {
  const { t } = useTranslation();
  return (
    <div role="status" style={{
      padding: '6px 10px', fontSize: 13, background: 'var(--cth-cream-200)',
      boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)', color: 'var(--cth-ink-900)',
      display: 'flex', gap: 8, alignItems: 'baseline',
    }}>
      <span style={{
        fontFamily: 'var(--cth-font-display)', fontSize: 8, lineHeight: '14px', padding: '0 5px',
        color: 'var(--cth-ink-900)', background: 'var(--cth-peach-light)', boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)',
        whiteSpace: 'nowrap', display: 'inline-block',
      }}>
        {t('projectTheme.errTag')}
      </span>
      <span>{t(error === 'not-empty' ? 'projectTheme.notEmpty' : 'projectTheme.unreadable')}</span>
    </div>
  );
}

/** Main's id for a refused new-project folder, or null for any other answer. */
export function projectFolderError(error: string | undefined): 'not-empty' | 'unreadable' | null {
  return error === 'not-empty' || error === 'unreadable' ? error : null;
}
