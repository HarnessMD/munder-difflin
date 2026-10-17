import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { HarnessConfig } from '@/store/config';
import { useStore } from '@/store/store';
import { PixelButton } from './PixelButton';
import type { ThemeId } from '@/scene/office/themeRegistry';
import { loadTheme } from '@/scene/office/themeLoader';
import { DEFAULT_THEME_ID, type PackSummary } from '@shared/themePack';

interface ThemeCardItem {
  id: ThemeId;
  label: string;
  blurb: string;
  built: boolean;
  swatch: string;
}

/** Settings "Office Theme" section: theme picker cards from window.cth.listThemes()
 *  with the live reskin flow, validation problems per pack, Rescan, an
 *  Open-folder button and an optional extra themes folder.
 *  Self-contained so it stays out of SettingsModal's bulk. */
export function OfficeThemePicker({ config }: { config: HarnessConfig }) {
  const { t } = useTranslation();
  const [current, setCurrent] = useState<ThemeId>((config.officeTheme as ThemeId) ?? DEFAULT_THEME_ID);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [themes, setThemes] = useState<ThemeCardItem[]>([]);
  const [packs, setPacks] = useState<PackSummary[]>([]);
  const [themesDir, setThemesDir] = useState(config.themesDir ?? '');

  const setOfficeTheme = useStore((s) => s.setOfficeTheme);

  const applyList = (list: PackSummary[]) => {
    setPacks(list);
    setThemes(list.map((p) => ({
      id: p.id,
      label: p.name || p.id,
      blurb: p.blurb || '',
      built: p.available,
      swatch: p.swatch || '#6b5a4a',
    })));
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (!window.cth?.listThemes) return;
        const list = await window.cth.listThemes();
        if (!cancelled) applyList(list);
      } catch { /* bridge unavailable */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const rescan = async () => {
    setNote('');
    try { applyList(await window.cth.rescanThemes()); } catch { /* keep the current list */ }
  };

  const saveThemesDir = async () => {
    if (themesDir === (config.themesDir ?? '')) return;
    try {
      await window.cth.updateConfig({ themesDir });
      await rescan();
    } catch { /* leave the field as typed */ }
  };

  const onSelect = (id: ThemeId) => {
    setNote('');
    if (busy || id === current || packs.find((p) => p.id === id)?.available === false) return;
    void applyTheme(id);
  };

  const applyTheme = async (id: ThemeId) => {
    setBusy(true);
    try {
      // Validate theme before proceeding if window.cth.validateTheme is present
      if (window.cth?.validateTheme) {
        const val = await window.cth.validateTheme(id);
        if (!val.valid) {
          const first = val.issues.find((i) => i.level === 'error');
          setNote(t('officeTheme.switchAborted', { error: first ? `[${first.code}] ${first.message}` : 'Theme validation failed' }));
          return;
        }
      }
      // On theme switch, theme defaults win: assign each agent's character
      // sprite and visual display name to match the new theme's roster, and set
      // the orchestrator's name to the theme's command default.
      const loadedTheme = await loadTheme(id);
      const newCast = loadedTheme.cast;
      const castNames = Object.keys(newCast.byName);
      const defaultCharacter = newCast.defaultCharacter;
      const workerCharacters = castNames.filter((name) => name !== defaultCharacter);
      const workerPool = workerCharacters.length > 0 ? workerCharacters : castNames;
      await window.cth.updateConfig({ officeTheme: id });
      setCurrent(id);
      setOfficeTheme(id); // → OfficeFloor rebuilds the scene on the new map/cast

      // Keep the order stable so repeated switches choose the same sprite/role for
      // each existing worker. A small cast safely repeats.
      const st = useStore.getState();
      let workerIndex = 0;
      for (const agent of st.agents) {
        const character = agent.isOrchestrator
          ? defaultCharacter
          : workerPool[workerIndex++ % workerPool.length] ?? defaultCharacter;
        const member = newCast.byName[character];
        const name = agent.isOrchestrator
          ? (loadedTheme.orchestratorName ?? member?.displayName ?? 'Orchestrator')
          : (member?.displayName ?? agent.name);
        st.updateAgent(agent.id, { character: character as any, name });
      }

      const meta = themes.find((item) => item.id === id);
      if (meta && !meta.built) setNote(t('officeTheme.notBuiltYet', { label: meta.label }));
    } catch (e) {
      setNote(t('officeTheme.switchAborted', { error: e instanceof Error ? e.message : String(e) }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div style={{
        fontFamily: 'var(--cth-font-display)', fontSize: 8, lineHeight: '12px',
        color: 'var(--cth-ink-500)', textTransform: 'uppercase', marginBottom: 10
      }}>
        {t('officeTheme.title')}
      </div>

      <div style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)', marginBottom: 8 }}>
        {t('officeTheme.desc')}
      </div>
      {/* Theme picker grid */}
      {(
        <div style={{
          marginTop: 4,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
          gap: 8,
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {themes.map((theme) => {
            const isCurrent = theme.id === current;
            return (
              <button
                key={theme.id}
                onClick={() => onSelect(theme.id)}
                disabled={busy || !theme.built}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left',
                  padding: 8, cursor: busy ? 'default' : 'pointer',
                  background: isCurrent ? 'var(--cth-paper-100)' : 'transparent',
                  border: 'none',
                  boxSizing: 'border-box',
                  width: '100%',
                  minWidth: 0,
                  boxShadow: isCurrent
                    ? 'inset 0 0 0 1.5px var(--cth-ink-500)'
                    : 'inset 0 0 0 1px var(--cth-ink-300)',
                  opacity: (busy || !theme.built) && !isCurrent ? 0.6 : 1,
                }}
              >
                <span style={{
                  width: 28, height: 28, flexShrink: 0, background: theme.swatch,
                  boxShadow: 'inset 0 0 0 1.5px var(--cth-ink-500)',
                }} />
                <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0, flex: 1 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {theme.label}
                    </span>
                    {isCurrent && (
                      <span style={{ fontFamily: 'var(--cth-font-display)', fontSize: 7, color: 'var(--cth-mint)', textTransform: 'uppercase', flexShrink: 0 }}>
                        {t('officeTheme.current')}
                      </span>
                    )}
                    {!theme.built && !isCurrent && (
                      <span style={{ fontFamily: 'var(--cth-font-display)', fontSize: 7, color: 'var(--cth-ink-500)', textTransform: 'uppercase', flexShrink: 0 }}>
                        {t('officeTheme.unavailable')}
                      </span>
                    )}
                  </span>
                  <span style={{ fontSize: 11, lineHeight: '14px', color: 'var(--cth-ink-500)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {theme.blurb}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}


      {themes.length === 0 && (
        <div style={{ fontSize: 12, color: 'var(--cth-ink-500)' }}>{t('officeTheme.noThemes')}</div>
      )}

      {/* Problems found while validating each pack (errors make it unavailable) */}
      {packs.filter((p) => p.issues.length > 0).map((p) => (
        <div key={p.id} style={{ marginTop: 8, fontSize: 11, lineHeight: '15px', color: 'var(--cth-ink-500)' }}>
          <div style={{ color: p.available ? 'var(--cth-ink-700)' : 'var(--cth-coral)' }}>
            {t('officeTheme.issues', { name: p.name || p.id })}
          </div>
          {p.issues.map((i, n) => (
            <div key={n} style={{ fontFamily: 'var(--cth-font-mono)' }}>
              {i.level === 'error' ? 'error' : 'warn'} [{i.code}] {i.path ? `${i.path}: ` : ''}{i.message}
            </div>
          ))}
        </div>
      ))}

      <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <PixelButton variant="secondary" size="sm" onClick={() => void rescan()}>{t('officeTheme.rescan')}</PixelButton>
        <PixelButton variant="secondary" size="sm" onClick={() => void window.cth.openThemesFolder()}>{t('officeTheme.openFolder')}</PixelButton>
      </div>

      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={{ fontSize: 12, color: 'var(--cth-ink-900)' }}>{t('officeTheme.themesDir')}</label>
        <input
          value={themesDir}
          onChange={(e) => setThemesDir(e.target.value)}
          onBlur={() => void saveThemesDir()}
          spellCheck={false}
          style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 12, padding: '4px 6px', boxSizing: 'border-box', width: '100%' }}
        />
        <span style={{ fontSize: 11, color: 'var(--cth-ink-500)' }}>{t('officeTheme.themesDirHint')}</span>
      </div>

      {note && (
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--cth-ink-500)' }}>{note}</div>
      )}

    </div>
  );
}
