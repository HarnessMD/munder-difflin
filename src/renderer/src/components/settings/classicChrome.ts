/**
 * The Settings form's chrome: the section heading, the rule between sections,
 * the inputs, the nav and the footer, defined once so every section looks
 * like its neighbours. Every colour and font is a `var(--cth-*)` token, and
 * every border is 1px on all four edges.
 */
import type { CSSProperties } from 'react';

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

/* The pixel form: the nav's right edge and the footer's top edge are 1px;
 * the danger red is `--cth-status-blocked`, which follows the theme. The
 * active nav marker is a 3px lemon bar drawn as an INSET SHADOW, so no edge
 * is thicker than the others. `paddingLeft` carries the 3px the border used
 * to occupy, so the rows sit exactly where they always did.
 */
const CLASSIC_HEAD: CSSProperties = {
  fontFamily: 'var(--cth-font-display)', fontSize: 8, lineHeight: '12px',
  color: 'var(--cth-ink-500)', textTransform: 'uppercase', marginBottom: 10
};

export const settingsKit: SettingsChrome = {
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
