/**
 * THE SETTINGS FORM'S CHROME, DERIVED FROM WHICH SKIN IS DRAWING IT.
 *
 * SettingsModal is one component in two skins: Classic renders it as a modal
 * (`chrome="modal"`), PRO renders the same body as a page (`chrome="inline"`,
 * pro/SettingsScreen). Until 0.4.10 only the overlay and the dialog frame
 * differed, so everything under the PRO Bar — the left nav, the headings, the
 * inputs, the footer — was still the Classic pixel form: an 8px display face,
 * square corners, borderless inputs on an inset shadow, a 2px right edge on the
 * nav and a 2px top edge on the footer.
 *
 * The fix is NOT a PRO fork of the form. Forking 2218 lines of working save
 * logic is how the two skins start disagreeing about what a setting does, and
 * test/pro-049-sweep.test.cjs refuses a `pro/SettingsModal.tsx` for exactly
 * that reason. So the MARKUP stays one copy and only the STYLE is chosen here,
 * once, from the chrome the caller asked for.
 *
 * Why a React-free `.ts` and not a `.tsx` of components: test/load-ts.cjs can
 * load this and assert the values (it cannot load `.tsx` and cannot resolve
 * `react`), so the rules below — 1px everywhere, radius tokens, no hex — are
 * checked as data rather than grepped as text. The `import type` is erased at
 * transpile, so nothing here actually reaches for React at run time.
 *
 * RULES THIS FILE HOLDS, and they are the reason it exists:
 *   - Every colour, radius and font is a `var(--cth-*)` token. No hex.
 *   - Every border is 1px on all four edges. A selection marker is an inset
 *     shadow, never a thicker edge, which is how pro/ui.tsx's Tabs does it.
 *   - The radius scale is only declared under the professional skin, so it is
 *     read with its fallback (tokens.css: "always read them with a fallback").
 */
import type { CSSProperties } from 'react';

export type SettingsChromeKind = 'modal' | 'inline';

/** The declared corner scale, read the way tokens.css says to read it. */
export const RADIUS = {
  sm: 'var(--cth-radius-sm, 6px)',
  md: 'var(--cth-radius-md, 8px)',
  lg: 'var(--cth-radius-lg, 10px)',
  xl: 'var(--cth-radius-xl, 12px)'
} as const;

export interface SettingsChrome {
  /** The small heading that opens a section. */
  sectionHead: CSSProperties;
  /** Same heading, tight under a section that supplies its own spacing. */
  sectionHeadTight: CSSProperties;
  /** Same heading with no bottom margin at all. */
  sectionHeadFlush: CSSProperties;
  /** The rule drawn between two sections. */
  rule: CSSProperties;
  /** Text inputs and selects. */
  input: CSSProperties;
  /** The label above a field. */
  label: CSSProperties;
  /** The left nav column. */
  navColumn: CSSProperties;
  /** One nav row. `active` is the section being shown. */
  navRow: (active: boolean) => CSSProperties;
  /** The scrolling content pane beside the nav. */
  pane: CSSProperties;
  /** The footer that carries Close and Save. */
  footer: CSSProperties;
  /** A bordered sub surface inside a section (the voice key box). */
  panel: CSSProperties;
  /** A card in a list (a webhook). `selected` here means enabled. */
  card: (selected: boolean) => CSSProperties;
  /** One of a small set of mutually exclusive choices (move or start fresh). */
  optionCard: (selected: boolean) => CSSProperties;
  /** A small selectable chip (the default model picker). */
  chip: (selected: boolean) => CSSProperties;
  /** The round i button that opens a help block. */
  infoBtn: (open: boolean) => CSSProperties;
  /** A preformatted help block. */
  codeBox: CSSProperties;
  /** The small mark beside a line that reports on or off. */
  statusDot: (on: boolean) => CSSProperties;
  /** The icon tile in front of a warning that is hard to undo. */
  warnTile: CSSProperties;
  /** The Danger Zone heading. */
  dangerHead: CSSProperties;
  /** Text that reports something went wrong. */
  errorText: CSSProperties;
}

/* ── Classic ──────────────────────────────────────────────────────────────
 * The pixel form, unchanged from what shipped in 0.4.9, with two exceptions
 * the founder ruled on for 0.4.10 and which apply to BOTH skins:
 *   - the nav's right edge and the footer's top edge are 1px, not 2px;
 *   - the danger red is `--cth-status-blocked`, not the hex #6E1423, which
 *     was theme blind and stayed a light-mode red on the dark skin.
 * The active nav marker keeps its 3px lemon bar, drawn as an INSET SHADOW so
 * no edge is thicker than the others (pro/ui.tsx Tabs sets that precedent).
 * `paddingLeft` carries the 3px the border used to occupy, so the rows sit
 * exactly where they always did.
 */
const CLASSIC_HEAD: CSSProperties = {
  fontFamily: 'var(--cth-font-display)', fontSize: 8, lineHeight: '12px',
  color: 'var(--cth-ink-500)', textTransform: 'uppercase', marginBottom: 10
};

const classic: SettingsChrome = {
  sectionHead: CLASSIC_HEAD,
  sectionHeadTight: { ...CLASSIC_HEAD, marginBottom: 2 },
  sectionHeadFlush: { ...CLASSIC_HEAD, marginBottom: 0 },
  rule: { height: 2, background: 'var(--cth-ink-300)' },
  input: {
    width: '100%',
    padding: '6px 8px 4px',
    background: 'var(--cth-paper-100)',
    border: 'none',
    boxShadow: 'inset 0 0 0 1px var(--cth-ink-100)',
    fontFamily: 'var(--cth-font-ui)',
    fontSize: 13,
    color: 'var(--cth-ink-900)',
    outline: 'none'
  },
  label: {
    fontFamily: 'var(--cth-font-display)',
    fontSize: 8,
    lineHeight: '12px',
    color: 'var(--cth-ink-700)',
    textTransform: 'uppercase'
  },
  navColumn: {
    width: 160, flexShrink: 0,
    display: 'flex', flexDirection: 'column',
    borderRight: '1px solid var(--cth-ink-300)',
    paddingTop: 8, paddingBottom: 8,
    background: 'var(--cth-cream-200)'
  },
  navRow: (active) => ({
    display: 'block', width: '100%', textAlign: 'left',
    padding: '10px 16px 8px 19px',
    border: 'none',
    boxShadow: active ? 'inset 3px 0 0 var(--cth-lemon)' : 'none',
    background: active ? 'var(--cth-ink-900)' : 'transparent',
    color: active ? 'var(--cth-cream-50)' : 'var(--cth-ink-700)',
    fontFamily: 'var(--cth-font-display)',
    fontSize: 8,
    lineHeight: '12px',
    cursor: 'pointer',
    letterSpacing: 0
  }),
  pane: {
    flex: 1, minWidth: 0, overflowY: 'auto', overflowX: 'hidden',
    padding: '20px 24px',
    display: 'flex', flexDirection: 'column', gap: 20
  },
  footer: {
    borderTop: '1px solid var(--cth-ink-300)',
    padding: '10px 16px',
    display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8,
    background: 'var(--cth-cream-50)'
  },
  panel: {
    display: 'flex', flexDirection: 'column', gap: 8,
    padding: 10,
    background: 'var(--cth-paper-100)',
    boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)'
  },
  card: (selected) => ({
    display: 'flex', flexDirection: 'column', gap: 8,
    padding: '10px 12px',
    background: 'var(--cth-cream-100)',
    boxShadow: `inset 0 0 0 1px ${selected ? 'var(--cth-ink-500)' : 'var(--cth-ink-100)'}`
  }),
  optionCard: (selected) => ({
    display: 'flex', flexDirection: 'column', gap: 3,
    textAlign: 'left',
    padding: '10px 12px',
    background: 'var(--cth-paper-100)', border: 'none',
    boxShadow: `inset 0 0 0 1px ${selected ? 'var(--cth-ink-900)' : 'var(--cth-ink-300)'}`
  }),
  chip: (selected) => ({
    padding: '3px 8px 1px', border: 'none', cursor: 'pointer',
    fontFamily: 'var(--cth-font-ui)', fontSize: 12, color: 'var(--cth-ink-900)',
    background: selected ? 'var(--cth-sky-light)' : 'var(--cth-cream-100)',
    boxShadow: `inset 0 0 0 1px ${selected ? 'var(--cth-ink-500)' : 'var(--cth-ink-100)'}`
  }),
  infoBtn: (open) => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 16, height: 16, padding: 0, cursor: 'pointer',
    border: 'none', borderRadius: 'var(--cth-radius-pill, 999px)',
    background: open ? 'var(--cth-ink-700)' : 'var(--cth-ink-300)',
    color: open ? 'var(--cth-paper-100)' : 'var(--cth-ink-900)',
    fontFamily: 'var(--cth-font-display)', fontSize: 10, lineHeight: '16px'
  }),
  codeBox: {
    margin: 0, padding: 10, whiteSpace: 'pre-wrap',
    background: 'var(--cth-paper-100)',
    boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)',
    fontFamily: 'var(--cth-font-mono)', fontSize: 11, lineHeight: '16px',
    color: 'var(--cth-ink-700)'
  },
  statusDot: (on) => ({
    width: 8, height: 8, flexShrink: 0,
    background: on ? 'var(--cth-mint)' : 'var(--cth-ink-300)',
    boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)'
  }),
  warnTile: {
    width: 32, height: 32,
    background: 'var(--cth-coral-light)',
    boxShadow: 'inset 0 0 0 1px var(--cth-ink-500)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0
  },
  dangerHead: {
    fontFamily: 'var(--cth-font-display)', fontSize: 10, lineHeight: '14px',
    color: 'var(--cth-status-blocked)'
  },
  errorText: { fontSize: 12, lineHeight: '18px', color: 'var(--cth-status-blocked)' }
};

/* ── PRO ──────────────────────────────────────────────────────────────────
 * The same form wearing the kit: pro/ui.tsx's input (32 tall, 1px border, an
 * 8px corner, the cream-100 ground), its SectionH (11px / 600 / 0.3 tracking
 * / uppercase / ink-500, no display face), and ProSidebar's nav row (a filled
 * row on --cth-surface-active, never an inverted one, no coloured rail). The
 * two-pane split is InboxScreen's: a 1px right edge on a cream-50 rail.
 */
const SECTION_H: CSSProperties = {
  fontSize: 11, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase',
  color: 'var(--cth-ink-500)', marginBottom: 10
};

/**
 * Half the fields in the form sit inside a `<label>` that spreads the label
 * style, and `font-weight`, `letter-spacing` and `text-transform` all inherit.
 * PRO's label is 600 / 0.3 / uppercase, so without these three resets the
 * budget and archiving fields would type in bold small caps. They are stated
 * rather than left to `font: inherit`, which inherits the very thing that is
 * wrong here.
 */
const proInput: CSSProperties = {
  width: '100%', boxSizing: 'border-box', height: 32, padding: '0 10px',
  borderRadius: RADIUS.md,
  border: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-100)',
  fontFamily: 'var(--cth-font-ui)', fontSize: 12.5, fontWeight: 400,
  letterSpacing: 'normal', textTransform: 'none',
  color: 'var(--cth-ink-900)', outline: 'none'
};

const pro: SettingsChrome = {
  sectionHead: SECTION_H,
  sectionHeadTight: { ...SECTION_H, marginBottom: 2 },
  sectionHeadFlush: { ...SECTION_H, marginBottom: 0 },
  rule: { height: 1, background: 'var(--cth-ink-300)' },
  input: proInput,
  label: {
    fontFamily: 'var(--cth-font-ui)',
    fontSize: 11, fontWeight: 600, letterSpacing: 0.3, lineHeight: '16px',
    color: 'var(--cth-ink-500)', textTransform: 'uppercase'
  },
  navColumn: {
    width: 200, flexShrink: 0,
    display: 'flex', flexDirection: 'column', gap: 2,
    borderRight: '1px solid var(--cth-ink-300)',
    padding: 10,
    background: 'var(--cth-cream-50)',
    overflowY: 'auto'
  },
  navRow: (active) => ({
    display: 'block', width: '100%', textAlign: 'left',
    padding: '7px 10px',
    border: '1px solid transparent',
    borderRadius: RADIUS.md,
    background: active ? 'var(--cth-surface-active)' : 'transparent',
    color: active ? 'var(--cth-ink-900)' : 'var(--cth-ink-700)',
    fontFamily: 'var(--cth-font-ui)',
    fontSize: 12.5,
    fontWeight: active ? 600 : 400,
    lineHeight: '18px',
    cursor: 'pointer',
    letterSpacing: 0
  }),
  pane: {
    flex: 1, minWidth: 0, overflowY: 'auto', overflowX: 'hidden',
    padding: '20px 24px',
    display: 'flex', flexDirection: 'column', gap: 20
  },
  footer: {
    borderTop: '1px solid var(--cth-ink-300)',
    padding: '12px 18px',
    display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8,
    background: 'var(--cth-cream-50)'
  },
  panel: {
    display: 'flex', flexDirection: 'column', gap: 8,
    padding: 14,
    borderRadius: RADIUS.xl,
    border: '1px solid var(--cth-ink-300)',
    background: 'var(--cth-cream-100)'
  },
  card: (selected) => ({
    display: 'flex', flexDirection: 'column', gap: 8,
    padding: '10px 12px',
    borderRadius: RADIUS.lg,
    border: `1px solid ${selected ? 'var(--cth-accent)' : 'var(--cth-ink-300)'}`,
    background: 'var(--cth-cream-50)'
  }),
  optionCard: (selected) => ({
    display: 'flex', flexDirection: 'column', gap: 3,
    textAlign: 'left',
    padding: '10px 12px',
    borderRadius: RADIUS.lg,
    border: `1px solid ${selected ? 'var(--cth-accent)' : 'var(--cth-ink-300)'}`,
    background: selected ? 'var(--cth-accent-soft)' : 'var(--cth-cream-50)'
  }),
  chip: (selected) => ({
    height: 26, padding: '0 10px', cursor: 'pointer',
    borderRadius: RADIUS.md,
    border: `1px solid ${selected ? 'var(--cth-accent)' : 'var(--cth-ink-300)'}`,
    background: selected ? 'var(--cth-accent-soft)' : 'var(--cth-cream-100)',
    color: selected ? 'var(--cth-accent-text)' : 'var(--cth-ink-900)',
    fontFamily: 'var(--cth-font-ui)', fontSize: 12, fontWeight: 500
  }),
  infoBtn: (open) => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 16, height: 16, padding: 0, cursor: 'pointer',
    borderRadius: 'var(--cth-radius-pill, 999px)',
    border: `1px solid ${open ? 'var(--cth-accent)' : 'var(--cth-ink-300)'}`,
    background: open ? 'var(--cth-accent-soft)' : 'transparent',
    color: open ? 'var(--cth-accent-text)' : 'var(--cth-ink-500)',
    fontFamily: 'var(--cth-font-ui)', fontSize: 10, fontWeight: 600, lineHeight: '14px'
  }),
  codeBox: {
    margin: 0, padding: 10, whiteSpace: 'pre-wrap',
    borderRadius: RADIUS.md,
    border: '1px solid var(--cth-ink-300)',
    background: 'var(--cth-cream-200)',
    fontFamily: 'var(--cth-font-mono)', fontSize: 11.5, lineHeight: '17px',
    color: 'var(--cth-ink-700)'
  },
  statusDot: (on) => ({
    width: 7, height: 7, flexShrink: 0,
    borderRadius: 'var(--cth-radius-pill, 999px)',
    background: on ? 'var(--cth-status-success)' : 'var(--cth-ink-300)'
  }),
  warnTile: {
    width: 36, height: 36,
    borderRadius: RADIUS.md,
    border: '1px solid var(--cth-ink-300)',
    background: 'var(--cth-status-blocked-tint)',
    color: 'var(--cth-status-blocked)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0
  },
  dangerHead: {
    fontSize: 11, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase',
    color: 'var(--cth-status-blocked)'
  },
  errorText: { fontSize: 12, lineHeight: '18px', color: 'var(--cth-status-blocked)' }
};

/** The style set the Settings form draws itself with, for one chrome. */
export function settingsChrome(kind: SettingsChromeKind): SettingsChrome {
  return kind === 'inline' ? pro : classic;
}
