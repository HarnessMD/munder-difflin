import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@/design/tokens.css';
import '@/design/fonts.css';
import '@/design/global.css';
/* AFTER global.css on purpose — it un-clips the page. See harness.css. */
import './harness.css';
import '@/i18n';
import { setAppSkin, appSkin, useAppSkin } from '@/design/skin';
import { setAppTheme, appTheme, useAppTheme } from '@/design/theme';
import { Boards } from './boards';

type Skin = 'office' | 'professional';
type Theme = 'light' | 'dark';

/**
 * Both axes are switchable here because both ship, and a screen that was only
 * ever looked at in one combination is a screen with three untested ones.
 */
function Harness() {
  const [skin, setSkin] = useState<Skin>(appSkin());
  const [theme, setTheme] = useState<Theme>(appTheme());

  /**
   * THE SKIN HAS TWO HALVES AND SETTING THE ATTRIBUTE ONLY MOVES ONE.
   *
   * CSS reads `data-cth-skin` off the root, but components read `useAppSkin()`,
   * which is a module store seeded from localStorage and defaulting to 'office'.
   * This function used to set the attribute alone, so every "professional"
   * frame in this harness was a HYBRID the app cannot produce: Office component
   * logic under Professional tokens. That is what painted white primary buttons
   * in a pass I nearly filed as an app bug — Office fills a primary with
   * ink-900, which is #FFFFFF in Professional dark.
   *
   * `setAppSkin` is the real setter: module state, localStorage, the attribute,
   * and the subscriber notification that re-renders. Go through it.
   *
   * THEME IS THE SAME SHAPE AND HAS THE SAME TWO HALVES. `theme.ts` defaults to
   * 'light' and components read `useAppTheme()`, so setting `data-cth-theme`
   * alone produced the identical hybrid on the other axis: light component
   * logic under dark tokens. It did not bite yet only because nothing in
   * boards.tsx reads the theme in JS — the terminal, the editor and
   * surfaceTheme's ANSI and Monaco derivations all do, and would have. Fixing
   * one axis and leaving its twin on the next line is how a tool defect
   * survives the commit that documents it.
   */
  const apply = (s: Skin, t: Theme) => {
    setAppSkin(s);
    setAppTheme(t);
    setSkin(s); setTheme(t);
  };

  return (
    <div style={{ background: 'var(--cth-cream-50)', minHeight: '100vh' }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 24px',
        background: 'var(--cth-paper-100)',
        boxShadow: 'inset 0 -1px 0 var(--cth-ink-300)'
      }}>
        <span style={{
          fontFamily: 'var(--cth-font-mono)', fontSize: 11, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: 'var(--cth-ink-500)', flex: 1
        }}>preview harness · not the app</span>
        <Switch options={['professional', 'office'] as Skin[]} value={skin}
          onChange={v => apply(v, theme)} />
        <Switch options={['dark', 'light'] as Theme[]} value={theme}
          onChange={v => apply(skin, v)} />
      </div>
      <SplitBrainGuard />
      <div style={{ padding: 24 }}><Boards /></div>
    </div>
  );
}

/**
 * THE TOOL HAS TO SAY WHEN IT CANNOT BE TRUSTED.
 *
 * Both skin and theme have two halves — a root attribute the CSS reads, and a
 * module store the components read. Setting one without the other produces a
 * hybrid the app cannot render, and it looks completely normal: the frames draw,
 * the error boundaries stay quiet, and every DOM assertion still passes. That
 * cost a whole review pass once and was one line from costing another.
 *
 * So the harness now checks its own halves agree and says so loudly when they
 * do not. A review tool that can silently lie about what it is showing is worse
 * than no review tool, because its output gets believed.
 */
function SplitBrainGuard() {
  const skinStore = useAppSkin();
  const themeStore = useAppTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const root = document.documentElement;
  const bad: string[] = [];
  if (root.dataset.cthSkin !== skinStore) {
    bad.push(`skin: CSS says "${root.dataset.cthSkin}", components say "${skinStore}"`);
  }
  if (root.dataset.cthTheme !== themeStore) {
    bad.push(`theme: CSS says "${root.dataset.cthTheme}", components say "${themeStore}"`);
  }
  if (bad.length === 0) return null;

  return (
    <div style={{
      margin: '0 24px', padding: '10px 12px',
      background: 'var(--cth-status-blocked-tint)',
      boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)',
      borderRadius: 'var(--cth-radius-md, 8px)',
      color: 'var(--cth-status-blocked)',
      fontFamily: 'var(--cth-font-mono)', fontSize: 12, lineHeight: '18px'
    }}>
      <strong>Do not trust these frames.</strong> The stylesheet and the components
      are in different states, so this is a rendering the app cannot produce.
      {bad.map(b => <div key={b}>{b}</div>)}
    </div>
  );
}

function Switch<T extends string>(
  { options, value, onChange }: { options: T[]; value: T; onChange: (v: T) => void }
) {
  return (
    <div style={{
      display: 'inline-flex', borderRadius: 'var(--cth-radius-md, 8px)',
      boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)', overflow: 'hidden'
    }}>
      {options.map(o => (
        <button key={o} onClick={() => onChange(o)} style={{
          height: 26, padding: '0 10px', border: 'none', cursor: 'pointer',
          background: value === o
            ? 'var(--cth-control-base, var(--cth-cream-200))' : 'transparent',
          color: value === o ? 'var(--cth-ink-900)' : 'var(--cth-ink-500)',
          fontFamily: 'var(--cth-font-mono)', fontSize: 11,
          letterSpacing: '0.08em', textTransform: 'uppercase'
        }}>{o}</button>
      ))}
    </div>
  );
}

/* ?skin= and ?theme= pick the pair before the first paint, through the real
   setters, so one frame can hold a pane per pair in an iframe. ?only=...-pane
   draws the board alone, without the harness toolbar. */
{
  const q = new URLSearchParams(window.location.search);
  const s = q.get('skin'); const th = q.get('theme');
  if (s === 'office' || s === 'professional') setAppSkin(s);
  if (th === 'light' || th === 'dark') setAppTheme(th);
}
const bare = (new URLSearchParams(window.location.search).get('only') ?? '').endsWith('-pane');

createRoot(document.getElementById('root')!).render(
  bare ? <div style={{ background: 'var(--cth-cream-50)', minHeight: '100vh' }}><Boards /></div> : <Harness />
);
