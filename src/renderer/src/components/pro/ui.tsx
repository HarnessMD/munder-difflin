/**
 * The small pieces every PRO screen is built from: a portrait that is ALWAYS
 * the character sprite (founder, 2 Sep: avatars, never initials, for agents),
 * chips, the accent button, the screen header bar, a search field, a
 * segmented control, and the sheet overlay. Kit v2 tokens only; nothing here
 * carries a literal colour.
 */
import type { CSSProperties, ReactNode, RefObject } from 'react';
import { Fragment, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore, type Agent } from '@/store/store';
import type { StatusKind } from '../PixelBadge';
import type { OfficeCharacterName } from '@/scene/office/castRoster';
import { SpritePortrait } from '../SpritePortrait';
import { ProIcon, type ProIconName } from './icons';
import { isEditable } from './proKeys';
import { useTechnical } from './depth';
import { statusDotPaint } from '@shared/statusDot';

/** A character's sprite in the PRO tile, for a cast member that is not (yet)
 *  an agent in the store: onboarding's "Meet your team" (phase 1) draws the
 *  orchestrator and the first hire before either has a PTY. */
export function CastPortrait({ character, size, description, isGod }: { character: OfficeCharacterName; size: number; description?: string; isGod?: boolean }) {
  return (
    <span style={{ width: size, height: size, borderRadius: Math.round(size / 4), overflow: 'hidden', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cth-cream-200)' }}>
      <SpritePortrait character={character} scale={size >= 48 ? 1 : 0.7} description={description} isGod={isGod} forceSprite />
    </span>
  );
}

/** The bare sprite for an agent, everywhere a row or a sheet names one: no
 *  chip, no background, the pixel art itself (pilot item 15; the 5 Sep 2026
 *  sweep caught the callers this wrapper had kept on the old chip). */
export function Portrait({ agent, size }: { agent: Agent; size: number }) {
  return <SpritePortrait character={agent.character} size={size} />;
}

export type ChipTone = 'outline' | 'accent' | 'ok' | 'warn' | 'bad' | 'muted' | 'think' | 'info';

/** `chip` tone: outline (default), accent, ok, warn, bad, muted, think, info.
 *  With `onClick` the chip is a button (the titlebar's connection and update
 *  chips, phase 6 of 0.4.9): same pixels, the keyboard reaches it. */
export function Chip({ children, tone = 'outline', style, title, onClick, ariaLabel }: {
  children: ReactNode; tone?: ChipTone; style?: CSSProperties; title?: string; onClick?: () => void; ariaLabel?: string;
}) {
  const tones: Record<ChipTone, CSSProperties> = {
    outline: { border: '1px solid var(--cth-ink-300)', color: 'var(--cth-ink-500)' },
    muted: { background: 'var(--cth-cream-200)', color: 'var(--cth-ink-500)' },
    accent: { background: 'var(--cth-accent-soft)', color: 'var(--cth-accent-text)' },
    ok: { background: 'var(--cth-status-working-tint)', color: 'var(--cth-status-working)' },
    warn: { background: 'var(--cth-status-waiting-tint)', color: 'var(--cth-status-waiting)' },
    bad: { background: 'var(--cth-status-blocked-tint)', color: 'var(--cth-status-blocked)' },
    think: { background: 'var(--cth-status-thinking-tint)', color: 'var(--cth-status-thinking)' },
    info: { background: 'var(--cth-status-compacting-tint)', color: 'var(--cth-status-compacting)' }
  };
  const base: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 4, height: 20, padding: '0 7px', borderRadius: 6, fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap', ...tones[tone], ...style };
  if (onClick) {
    return (
      <button type="button" title={title} aria-label={ariaLabel} onClick={onClick} style={{ border: 'none', background: 'transparent', font: 'inherit', cursor: 'pointer', ...base }}>
        {children}
      </button>
    );
  }
  return (
    <span title={title} style={base}>
      {children}
    </span>
  );
}

/* ───────────────────────────── status ───────────────────────────────────
 * One place turns an agent's raw state into the words a PRO user sees. The
 * raw kind ('awaiting', 'starting up', the parser's own vocabulary) never
 * reaches a card; in the technical rendering it survives as the tooltip.
 */
export const STATUS_TONE: Record<StatusKind, ChipTone> = {
  // The words and colours follow MEANING, not key names (Pam, 23 Sep 2026,
  // status words ruling). The store's truth is usePtyParser.ts and useHive.ts:
  // 'blocked' is the orchestrator waiting on YOU (so it says Needs you and
  // wears the warm tone), 'waiting' is a worker parked on the orchestrator
  // (routine, so it is calm like idle). Pink is for real failure only.
  working: 'ok', success: 'ok', waiting: 'muted', blocked: 'warn', looping: 'bad',
  thinking: 'think', typing: 'think', compacting: 'info', idle: 'muted', ghost: 'muted'
};

/** The dot's paint for the two states whose colour must follow meaning too:
 *  Needs you wears the warm waiting token, a parked worker the idle grey. The
 *  shared tokens keep their key names because the Classic skin reads them. */
const MEANING_PAINT: Partial<Record<StatusKind, { background: string }>> = {
  blocked: { background: 'var(--cth-status-waiting)' },
  waiting: { background: 'var(--cth-status-idle)' }
};

/** The colour a state's WORD and dot wear, by meaning (the rail's status
 *  word, its strips): the same map the dot paints from, so the two cannot
 *  disagree. */
export function statusColor(status: StatusKind): string {
  return MEANING_PAINT[status]?.background ?? `var(--cth-status-${status})`;
}
/** The tint behind a strip in that state's colour (professional tokens). */
export function statusTint(status: StatusKind): string {
  const key = status === 'blocked' ? 'waiting' : status === 'waiting' ? 'idle' : status;
  return `var(--cth-status-${key}-tint)`;
}

/**
 * THE DOT HAS A RING NOW (founder, 6 Sep 2026, item 8: "the green does not
 * read").
 *
 * The colour was never the bug: it has always been `--cth-status-<kind>`, a
 * theme token defined in all four blocks of tokens.css (office light, office
 * dark, professional light, professional dark), so it was already the theme's
 * colour and not a raw green. What it lacked was SEPARATION. A 7px mid-green
 * disc sitting straight on a cream or charcoal ground has too little contrast
 * at that size to catch the eye, and the darker greens the office skins use
 * (#5CA97A light, #6FB88B dark) are the worst case of it.
 *
 * The ring is drawn from the ink, mixed down, so it darkens the dot's edge on
 * a light ground and lightens it on a dark one without either skin needing to
 * declare anything. That is what makes one rule work in every skin, Office
 * dark included, rather than four hand-tuned outlines that drift apart.
 *
 * 0.5.3, bug 16: idle is a hollow ring, so resting and working differ in
 * shape and not only in hue. The rule is pure, in @shared/statusDot.
 */
export function StatusDot({ status, size = 7 }: { status: StatusKind; size?: number }) {
  return (
    <i
      aria-hidden
      style={{
        display: 'inline-block', width: size, height: size, borderRadius: size,
        flexShrink: 0, ...statusDotPaint(status, size), ...MEANING_PAINT[status]
      }}
    />
  );
}

/** The status chip every PRO surface uses: plain words, a dot in the state's
 *  colour, and (technical rendering only) the raw state as the tooltip. */
export function StatusChip({ status, raw, style }: { status: StatusKind; raw?: string; style?: CSSProperties }) {
  const { t } = useTranslation();
  const technical = useTechnical();
  return (
    <Chip tone={STATUS_TONE[status]} title={technical && raw ? raw : undefined} style={style}>
      <StatusDot status={status} />
      {t(`pro.status.${status}`)}
    </Chip>
  );
}

export function Meter({ pct }: { pct: number }) {
  const fill = pct >= 90 ? 'var(--cth-status-blocked)' : pct >= 75 ? 'var(--cth-status-waiting)' : 'var(--cth-status-thinking)';
  return (
    <div style={{ height: 5, background: 'var(--cth-cream-200)', borderRadius: 3, overflow: 'hidden' }}>
      <i style={{ display: 'block', height: '100%', width: `${pct}%`, background: fill, borderRadius: 3 }} />
    </div>
  );
}

export const primaryBtn = {
  height: 32, padding: '0 12px', borderRadius: 8, border: '1px solid var(--cth-accent)',
  background: 'var(--cth-accent)', color: 'var(--cth-accent-ink)', fontSize: 12.5, fontWeight: 500,
  cursor: 'pointer', font: 'inherit'
} as const;

/**
 * The kit's button.
 *
 * REST, HOVER AND PRESS ARE THREE FILLS, not one (0.4.9 phase 5). Until the
 * Classic sweep this button was only ever used on screens PRO built from
 * scratch, and it had a single flat fill: nothing under the pointer changed,
 * which reads as a picture of a button rather than a control. The Classic
 * primitive it now replaces on the swept surfaces (PixelButton) has had a
 * three-rung ladder since the Professional skin landed, so swapping to a flat
 * button would have been a downgrade on every screen the sweep touched.
 *
 * The ladder is prominence, not state: one kind's rest is the next one's
 * hover, so the four kinds stay ordered however you are interacting with them.
 * `lg` exists only because the sweep inherited a handful of large Classic
 * buttons; new PRO code should use sm or md.
 */
export function Btn({ children, onClick, kind = 'default', size = 'md', title, disabled, style, type = 'button', fullWidth, dataAttrs }: {
  children: ReactNode; onClick?: () => void; kind?: 'default' | 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg'; title?: string; disabled?: boolean; style?: CSSProperties; type?: 'button' | 'submit';
  /** Fills its row. The Classic sweep needs it; most PRO rows do not. */
  fullWidth?: boolean;
  /** `data-*` attributes on the button, the same contract as Card's: a test
   *  or a driver finds the control by them; nothing else is passed through. */
  dataAttrs?: Record<`data-${string}`, string | undefined>;
}) {
  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false);
  /** rest → hover → press, picked once so every kind reads the same way. */
  const step = (rest: string, over: string, down: string) => (disabled ? rest : pressed ? down : hover ? over : rest);
  const kinds: Record<string, CSSProperties> = {
    default: {
      border: '1px solid var(--cth-ink-300)', color: 'var(--cth-ink-900)',
      background: step('var(--cth-cream-100)', 'var(--cth-cream-200)', 'var(--cth-cream-300)')
    },
    primary: {
      border: '1px solid var(--cth-accent)', color: 'var(--cth-accent-ink)',
      background: step('var(--cth-accent)', 'var(--cth-accent-hover)', 'var(--cth-accent-hover)'),
      // Press has no darker accent token to fall back on, so it shifts by a
      // hair of inset shading instead of inventing a colour.
      boxShadow: pressed && !disabled ? 'inset 0 2px 4px rgba(0,0,0,0.18)' : undefined
    },
    ghost: {
      border: '1px solid transparent', color: 'var(--cth-ink-700)',
      background: step('transparent', 'var(--cth-cream-200)', 'var(--cth-cream-300)')
    },
    danger: {
      border: '1px solid var(--cth-status-blocked)', color: 'var(--cth-status-blocked)',
      background: step('transparent', 'var(--cth-status-blocked-tint)', 'var(--cth-status-blocked-tint)')
    }
  };
  const height = size === 'sm' ? 26 : size === 'lg' ? 40 : 32;
  return (
    <button type={type} title={title} disabled={disabled} onClick={onClick} {...dataAttrs}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        height, padding: size === 'sm' ? '0 9px' : size === 'lg' ? '0 16px' : '0 12px', borderRadius: 8,
        fontSize: size === 'sm' ? 12 : 12.5, fontWeight: 500, cursor: disabled ? 'default' : 'pointer', font: 'inherit',
        opacity: disabled ? 0.5 : 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        whiteSpace: 'nowrap', width: fullWidth ? '100%' : undefined,
        ...kinds[kind], ...style
      }}>
      {children}
    </button>
  );
}

/** The header every screen opens with: a title, a sub line, then whatever
 *  controls the screen owns pushed to the right. */
/**
 * The card grid the Tasks and Memory screens share. 0.5.3, bug 10 (Jinbo, 13
 * Sep 2026): the floor used to be a bare 230px, so a pane narrower than one
 * card (the Memory results pane beside a wide rail, or a small window) pushed
 * every card past its right edge and the pane cut it off. `min(230px, 100%)`
 * keeps the 230px rhythm and lets a lone column shrink with its pane.
 */
export const CARD_GRID_COLUMNS = 'repeat(auto-fill, minmax(min(230px, 100%), 1fr))';

export function Bar({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 52, padding: '0 18px', borderBottom: '1px solid var(--cth-ink-300)', flexShrink: 0, background: 'var(--cth-cream-50)' }}>
      <h1 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--cth-ink-900)', whiteSpace: 'nowrap' }}>{title}</h1>
      {sub && <span style={{ fontSize: 12, color: 'var(--cth-ink-500)', whiteSpace: 'nowrap', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</span>}
      <span style={{ flex: 1 }} />
      {children}
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder, style }: { value: string; onChange: (v: string) => void; placeholder: string; style?: CSSProperties }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, height: 30, padding: '0 9px', borderRadius: 8, border: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-100)', color: 'var(--cth-ink-500)', minWidth: 180, ...style }}>
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden><circle cx={11} cy={11} r={7} /><path d="M20 20l-3.5-3.5" /></svg>
      <input
        value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', outline: 'none', font: 'inherit', fontSize: 12.5, color: 'var(--cth-ink-900)' }}
      />
    </label>
  );
}

export function Seg<T extends string>({ value, options, onChange, ariaLabel }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; ariaLabel: string }) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} style={{ display: 'inline-flex', padding: 2, borderRadius: 8, background: 'var(--cth-cream-200)', border: '1px solid var(--cth-ink-300)' }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.value)} style={{
            height: 24, padding: '0 10px', borderRadius: 6, border: 'none', cursor: 'pointer', font: 'inherit', fontSize: 12, fontWeight: 500,
            background: on ? 'var(--cth-cream-50)' : 'transparent', color: on ? 'var(--cth-ink-900)' : 'var(--cth-ink-500)',
            boxShadow: on ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'
          }}>{o.label}</button>
        );
      })}
    </div>
  );
}

export function FilterChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} style={{
      height: 24, padding: '0 9px', borderRadius: 12, cursor: 'pointer', font: 'inherit', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
      border: `1px solid ${on ? 'var(--cth-accent)' : 'var(--cth-ink-300)'}`,
      background: on ? 'var(--cth-accent-soft)' : 'transparent', color: on ? 'var(--cth-accent-text)' : 'var(--cth-ink-700)'
    }}>{children}</button>
  );
}

/**
 * Esc closes the surface this is mounted in (phase 6: every sheet and drawer
 * in PRO answers Esc, not only the modal sheet). One rule about text fields:
 * when the key lands while a field INSIDE the surface has focus, Esc leaves
 * the field and keeps the surface, so a half-typed answer in a drawer is not
 * thrown away by the key people press to stop typing; the next Esc closes.
 * A field elsewhere (the terminal under a modal sheet) is not the surface's
 * business and does not hold it open.
 *
 * `capture` is for modal sheets: they take the key before anything below
 * them, so a sheet over a drawer closes the sheet alone. Drawers listen in
 * the bubble phase and see nothing while a sheet is up.
 */
export function useEscapeToClose(onClose: () => void, within: RefObject<HTMLElement | null>, capture = false): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      const active = document.activeElement;
      if (isEditable(active) && within.current?.contains(active)) {
        (active as HTMLElement).blur();
        e.preventDefault();
        if (capture) e.stopPropagation();
        return;
      }
      e.preventDefault();
      if (capture) e.stopPropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, capture);
    return () => window.removeEventListener('keydown', onKey, capture);
  }, [onClose, within, capture]);
}

/** A modal sheet: backdrop closes, Esc closes, the sheet itself stops clicks.
 *  `zIndex` is for the two app level dialogs (a key change, the quit warning)
 *  that must paint over the overlay layer and the toasts; a screen's own sheet
 *  keeps the default. */
export function Sheet({ onClose, width = 760, zIndex = 280, children }: { onClose: () => void; width?: number; zIndex?: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEscapeToClose(onClose, ref, true);
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex, background: 'rgba(23, 21, 14, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div ref={ref} role="dialog" aria-modal onClick={(e) => e.stopPropagation()} style={{
        width, maxWidth: '94vw', maxHeight: '88vh', display: 'flex', flexDirection: 'column', minHeight: 0,
        background: 'var(--cth-cream-50)', border: '1px solid var(--cth-ink-300)', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden'
      }}>
        {children}
      </div>
    </div>
  );
}

export function CloseX({ onClick, title }: { onClick: () => void; title: string }) {
  return (
    <button type="button" onClick={onClick} title={title} aria-label={title} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: 'transparent', color: 'var(--cth-ink-500)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
      <ProIcon name="close" size={16} />
    </button>
  );
}

/** Resolve an agent id to its display name: live roster, then the restorable
 *  roster (a done card keeps its author after the terminal is gone), then the
 *  id itself. `god` and `human` are the two ids that are not agents. */
export function useNameFor(): (id?: string | null) => string | undefined {
  const agents = useStore((s) => s.agents);
  const restorable = useStore((s) => s.restorableAgents);
  return (id) => {
    if (!id) return undefined;
    if (id === 'god') return agents.find((a) => a.isGod)?.name ?? id;
    return agents.find((a) => a.id === id)?.name ?? restorable.find((a) => a.id === id)?.name ?? id;
  };
}

export function useAgentById(): (id?: string | null) => Agent | undefined {
  const agents = useStore((s) => s.agents);
  return (id) => {
    if (!id) return undefined;
    if (id === 'god') return agents.find((a) => a.isGod);
    return agents.find((a) => a.id === id);
  };
}

export function fmtK(n: number): string {
  return n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(n);
}
export function usd(n: number): string {
  return `$${n.toFixed(n >= 100 ? 0 : 2)}`;
}
/** HH:MM for today, weekday for this week, else a short date. Locale aware. */
export function fmtWhen(iso: string | number | undefined, locale: string): string {
  if (iso === undefined) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  if (now.getTime() - d.getTime() < 6 * 86_400_000) return d.toLocaleDateString(locale, { weekday: 'short' });
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}
/** Which day separator a timestamp belongs under: the caller translates
 *  'today' and 'yesterday'; anything older is already a formatted date. */
export function dayOf(iso: string | number, locale: string): { key: 'today' | 'yesterday' | 'date'; text: string } {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { key: 'date', text: '' };
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return { key: 'today', text: '' };
  const y = new Date(now); y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return { key: 'yesterday', text: '' };
  return { key: 'date', text: d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' }) };
}

/* ───────────────────────────── form primitives ───────────────────────────
 * Phase 3 added editors (the Automations drawer, the Capabilities grants).
 * One input look for all of PRO: 1px even border, 8px radius, the cream-100
 * fill. Text fields COMMIT ON BLUR (or Enter) through `Draft`, so a keystroke
 * never becomes a config write and a half-typed label never reaches disk.
 */
export const inputStyle: CSSProperties = {
  width: '100%', boxSizing: 'border-box', height: 32, padding: '0 10px', borderRadius: 8,
  border: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-100)',
  font: 'inherit', fontSize: 12.5, color: 'var(--cth-ink-900)', outline: 'none'
};
export const monoInputStyle: CSSProperties = { ...inputStyle, fontFamily: 'var(--cth-font-mono)', fontSize: 12 };
export const textareaStyle: CSSProperties = { ...inputStyle, height: 'auto', minHeight: 84, padding: '8px 10px', resize: 'vertical', lineHeight: 1.45 };

/** A text control whose value is committed on blur or Enter, never per key. */
export function Draft({ value, onCommit, multiline, mono, placeholder, ariaLabel, style }: {
  value: string; onCommit: (v: string) => void; multiline?: boolean; mono?: boolean; placeholder?: string; ariaLabel: string; style?: CSSProperties;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value]);
  const commit = () => { if (draft !== value) onCommit(draft); };
  const base = multiline ? textareaStyle : mono ? monoInputStyle : inputStyle;
  if (multiline) {
    return <textarea aria-label={ariaLabel} value={draft} placeholder={placeholder} onChange={(e) => setDraft(e.target.value)} onBlur={commit} style={{ ...base, ...style }} />;
  }
  return (
    <input aria-label={ariaLabel} value={draft} placeholder={placeholder} onChange={(e) => setDraft(e.target.value)} onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} style={{ ...base, ...style }} />
  );
}

export function SelectBox<T extends string>({ value, options, onChange, ariaLabel, style, disabled }: {
  value: T; options: { value: T; label: string; disabled?: boolean }[]; onChange: (v: T) => void; ariaLabel: string; style?: CSSProperties; disabled?: boolean;
}) {
  return (
    <select aria-label={ariaLabel} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value as T)} style={{ ...inputStyle, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1, ...style }}>
      {options.map((o) => <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>)}
    </select>
  );
}

/** The on/off pill. `role=switch` so a screen reader says what it is. */
export function Switch({ on, onChange, label }: { on: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} title={label}
      onClick={(e) => { e.stopPropagation(); onChange(!on); }}
      style={{ width: 30, height: 18, borderRadius: 9, padding: 0, cursor: 'pointer', position: 'relative', flexShrink: 0,
        border: '1px solid ' + (on ? 'var(--cth-accent)' : 'var(--cth-ink-300)'), background: on ? 'var(--cth-accent)' : 'var(--cth-cream-200)', transition: 'background 120ms' }}>
      <span style={{ position: 'absolute', top: 2, left: on ? 13 : 2, width: 12, height: 12, borderRadius: 6, background: on ? 'var(--cth-accent-ink)' : 'var(--cth-ink-500)', transition: 'left 120ms' }} />
    </button>
  );
}

/** A titled group, NOT a <label>: a control row inside (Seg, FilterChips, a
 *  Switch) must not receive a label's forwarded click. Every input inside
 *  carries its own aria-label. */
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
      <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase', color: 'var(--cth-ink-500)' }}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: 11.5, color: 'var(--cth-ink-500)', lineHeight: 1.4 }}>{hint}</span>}
    </div>
  );
}

/** A small heading inside a drawer or side panel. */
export function SectionH({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase', color: 'var(--cth-ink-500)', flex: 1 }}>{children}</span>
      {right}
    </div>
  );
}

/** Code or a payload, in the mono face, scrolling inside its own box. */
export function CodeBox({ children, style, dataAttrs }: { children: ReactNode; style?: CSSProperties; dataAttrs?: Record<`data-${string}`, string | undefined> }) {
  return (
    <pre {...dataAttrs} style={{ margin: 0, padding: 10, borderRadius: 8, border: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-200)', fontFamily: 'var(--cth-font-mono)', fontSize: 11.5, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflow: 'auto', maxHeight: 220, color: 'var(--cth-ink-700)', ...style }}>
      {children}
    </pre>
  );
}

/* ───────────────────────────── surfaces (0.4.9 kit) ──────────────────────
 * The primitives the Classic sweep replaces PixelPanel / PixelButton / the
 * pixel Icon with (plan Part 2, phase 0). Borders are 1px all round, always
 * (founder, 2 Sep 2026): state lives in a chip, never in a thicker edge.
 */

/** A bordered surface. `onClick` makes it a button (the keyboard reaches it;
 *  nothing interactive may sit inside). `onOpen` makes it a div with the
 *  button role instead, for a card that holds its own buttons (a ticket, a
 *  Prompt): those stop propagation and the rest of the card opens. */
export function Card({ children, onClick, onOpen, selected, style, ariaLabel, className, dataAttrs }: {
  children: ReactNode; onClick?: () => void; onOpen?: () => void; selected?: boolean; style?: CSSProperties; ariaLabel?: string; className?: string;
  /** `data-*` attributes on the element (the message pulse finds an agent's
   *  card by `data-agent`); nothing else is passed through. */
  dataAttrs?: Record<`data-${string}`, string | undefined>;
}) {
  const base: CSSProperties = {
    display: 'flex', flexDirection: 'column', minWidth: 0, textAlign: 'start',
    border: `1px solid ${selected ? 'var(--cth-accent)' : 'var(--cth-ink-300)'}`, borderRadius: 12,
    background: 'var(--cth-cream-50)', color: 'var(--cth-ink-900)', ...style
  };
  if (onOpen) {
    return (
      <div role="button" tabIndex={0} aria-label={ariaLabel} className={className} onClick={onOpen} {...dataAttrs}
        onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) onOpen(); }}
        style={{ ...base, cursor: 'pointer' }}>
        {children}
      </div>
    );
  }
  if (!onClick) return <div className={className} style={base} {...dataAttrs}>{children}</div>;
  // `padding: 0` FIRST, so it is the default a caller can override and not a
  // rule that silently wins. It used to sit after the spread, which meant a
  // clickable card asking for `padding: '10px 12px'` was drawn with its text
  // flush against all four borders (founder, 3 Sep 2026: the two depth cards
  // in onboarding and every role bundle card).
  return (
    <button type="button" aria-label={ariaLabel} className={className} onClick={onClick} {...dataAttrs} style={{ padding: 0, ...base, width: '100%', font: 'inherit', cursor: 'pointer' }}>
      {children}
    </button>
  );
}

/**
 * A TITLED SURFACE: the kit's answer to PixelPanel (0.4.9 phase 5).
 *
 * Card is a surface with no name on it. Half of what the Classic sweep found
 * was a panel that DOES carry one — a dialog frame, a warning, an approval
 * queue — and those titles are load bearing: they say what the box is before
 * you read the box. The title sits in its own row separated by a hairline,
 * never by a heavier top edge, because the even-border rule (founder, 2 Sep)
 * holds here exactly as it does on Card and Tabs.
 */
export function Panel({ title, right, children, noPadding, style, ariaLabel }: {
  title?: string; right?: ReactNode; children: ReactNode; noPadding?: boolean; style?: CSSProperties; ariaLabel?: string;
}) {
  return (
    <div aria-label={ariaLabel} style={{
      display: 'flex', flexDirection: 'column', minWidth: 0,
      border: '1px solid var(--cth-ink-300)', borderRadius: 12,
      background: 'var(--cth-cream-50)', color: 'var(--cth-ink-900)', overflow: 'hidden', ...style
    }}>
      {title && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', flexShrink: 0,
          boxShadow: 'inset 0 -1px 0 var(--cth-ink-300)', background: 'var(--cth-cream-100)'
        }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, flex: 1, minWidth: 0 }}>{title}</span>
          {right}
        </div>
      )}
      {/* `noPadding` means the caller owns the inside completely: it lays out
          its own header, scroller and footer against the frame's height. An
          extra wrapper would sit between them and that height, so there
          isn't one. With padding, the wrapper is the padding. */}
      {noPadding ? children : (
        <div style={{ padding: 14, minWidth: 0, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          {children}
        </div>
      )}
    </div>
  );
}

/** Tabs across the top of a screen or panel. The active tab is marked with an
 *  inset shadow line rather than a border, so no edge is ever thicker than
 *  the others. */
export function Tabs<T extends string>({ value, tabs, onChange, ariaLabel, right, style }: {
  value: T; tabs: { value: T; label: string; count?: number }[]; onChange: (v: T) => void; ariaLabel: string; right?: ReactNode; style?: CSSProperties;
}) {
  return (
    <div role="tablist" aria-label={ariaLabel} style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '0 18px', boxShadow: 'inset 0 -1px 0 var(--cth-ink-300)', background: 'var(--cth-cream-50)', flexShrink: 0, ...style }}>
      {tabs.map((tb) => {
        const on = tb.value === value;
        return (
          <button key={tb.value} type="button" role="tab" aria-selected={on} onClick={() => onChange(tb.value)} style={{
            padding: '9px 10px', border: 'none', background: 'transparent', font: 'inherit', fontSize: 12.5,
            fontWeight: on ? 500 : 400, color: on ? 'var(--cth-ink-900)' : 'var(--cth-ink-500)', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: on ? 'inset 0 -2px 0 var(--cth-ink-900)' : 'none'
          }}>
            {tb.label}
            {tb.count !== undefined && tb.count > 0 && (
              <span style={{ fontSize: 11, lineHeight: '16px', padding: '0 6px', borderRadius: 8, background: 'var(--cth-cream-200)', color: 'var(--cth-ink-700)' }}>{tb.count}</span>
            )}
          </button>
        );
      })}
      {right && <><span style={{ flex: 1 }} />{right}</>}
    </div>
  );
}

/** One row of a list: a leading slot, a title with an optional second line,
 *  and a trailing slot. A row with `onClick` is a button (full width, so its
 *  flex children get a width to fill). */
export function Row({ icon, title, sub, right, onClick, selected, style }: {
  icon?: ReactNode; title: ReactNode; sub?: ReactNode; right?: ReactNode; onClick?: () => void; selected?: boolean; style?: CSSProperties;
}) {
  const inner = (
    <>
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</span>}
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 12.5, color: 'var(--cth-ink-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
        {sub && <span style={{ fontSize: 11.5, color: 'var(--cth-ink-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</span>}
      </span>
      {right && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>{right}</span>}
    </>
  );
  const base: CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, minWidth: 0,
    background: selected ? 'var(--cth-cream-200)' : 'transparent', textAlign: 'start', ...style
  };
  if (!onClick) return <div style={base}>{inner}</div>;
  return (
    <button type="button" onClick={onClick} aria-current={selected || undefined} style={{ ...base, width: '100%', border: 'none', font: 'inherit', cursor: 'pointer', color: 'inherit' }}>
      {inner}
    </button>
  );
}

/** A square icon-only button (the copy, close and expand controls). */
export function IconBtn({ name, title, onClick, size = 28, active, disabled, style }: {
  name: ProIconName; title: string; onClick?: () => void; size?: number; active?: boolean; disabled?: boolean; style?: CSSProperties;
}) {
  return (
    <button type="button" title={title} aria-label={title} aria-pressed={active} disabled={disabled} onClick={onClick} style={{
      width: size, height: size, borderRadius: 7, padding: 0, display: 'inline-grid', placeItems: 'center', flexShrink: 0,
      border: `1px solid ${active ? 'var(--cth-accent)' : 'transparent'}`, background: active ? 'var(--cth-accent-soft)' : 'transparent',
      color: active ? 'var(--cth-accent-text)' : 'var(--cth-ink-500)', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1, ...style
    }}>
      <ProIcon name={name} size={Math.round(size * 0.57)} />
    </button>
  );
}

/** A yes / no question before something that is hard to undo. Esc and the
 *  backdrop answer no. */
export function ConfirmDialog({ title, body, confirmLabel, danger, onConfirm, onClose }: {
  title: string; body: ReactNode; confirmLabel?: string; danger?: boolean; onConfirm: () => void; onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Sheet onClose={onClose} width={440}>
      <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--cth-ink-900)' }}>{title}</h2>
        <div style={{ fontSize: 12.5, color: 'var(--cth-ink-700)', lineHeight: 1.5 }}>{body}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <Btn onClick={onClose}>{t('pro.dialog.cancel')}</Btn>
          <Btn kind={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel ?? t('pro.dialog.confirm')}</Btn>
        </div>
      </div>
    </Sheet>
  );
}

/* ───────────────────────────── toasts ────────────────────────────────────
 * PRO's own transient line, replacing the Classic toasts under the PRO skin.
 * A module store so any handler can raise one (`proToast('Copied')`) without
 * a context; ProShell mounts the host once.
 */
export interface ProToast { id: number; text: string; tone: 'neutral' | 'ok' | 'bad'; action?: { label: string; run: () => void } }

let toastList: ProToast[] = [];
const toastSubs = new Set<() => void>();
let toastSeq = 0;
function emitToasts(next: ProToast[]): void {
  toastList = next;
  toastSubs.forEach((f) => f());
}
/** `ms: 0` means the toast waits until it is answered or dismissed (an update
 *  offer, a teammate's request): the Classic transients it replaces did too. */
export function proToast(text: string, opts: { tone?: ProToast['tone']; action?: ProToast['action']; ms?: number } = {}): number {
  const id = ++toastSeq;
  emitToasts([...toastList, { id, text, tone: opts.tone ?? 'neutral', action: opts.action }]);
  const ms = opts.ms ?? 4000;
  if (ms > 0) window.setTimeout(() => dismissToast(id), ms);
  return id;
}
export function toastShowing(id: number): boolean { return toastList.some((x) => x.id === id); }
export function dismissToast(id: number): void {
  if (toastList.some((x) => x.id === id)) emitToasts(toastList.filter((x) => x.id !== id));
}
export function readToasts(): ProToast[] { return toastList; }
function subscribeToasts(cb: () => void): () => void {
  toastSubs.add(cb);
  return () => { toastSubs.delete(cb); };
}

/**
 * NOT SET UP YET: a mark, a sentence, the steps, and the button that starts
 * them (v0.4.9 phase 4, founder 3 Sep 2026: "show an empty state that says not
 * configured and shows steps to configure them, with some minimal icon").
 *
 * The mark is one of the app's own inline icons on a tinted tile. Nothing is
 * fetched and nothing is generated: an illustration that has to be downloaded
 * is the one thing an offline first-run screen cannot show, and this screen
 * exists precisely for a person who has not connected anything yet.
 *
 * The steps are NUMBERED because they are a sequence someone performs in
 * order. That is the only reason: a list that is not a sequence gets bullets.
 */
export function SetupEmpty({ icon, title, lead, steps, action }: {
  icon: ProIconName;
  title: string;
  lead: string;
  steps: string[];
  action?: { label: string; run: () => void };
}) {
  return (
    <div style={{ margin: 'auto', maxWidth: 400, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
      <span style={{ width: 44, height: 44, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'var(--cth-cream-200)', color: 'var(--cth-ink-700)' }}>
        <ProIcon name={icon} size={22} />
      </span>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--cth-ink-900)' }}>{title}</div>
      <div style={{ fontSize: 12.5, color: 'var(--cth-ink-500)', lineHeight: 1.5 }}>{lead}</div>
      <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'start', alignSelf: 'stretch' }}>
        {steps.map((s, i) => (
          <li key={s} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 12.5, color: 'var(--cth-ink-900)', lineHeight: 1.5 }}>
            <span style={{
              flexShrink: 0, width: 20, height: 20, borderRadius: 10, display: 'grid', placeItems: 'center',
              border: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-100)', color: 'var(--cth-ink-500)',
              fontSize: 10.5, fontFamily: 'var(--cth-font-mono)'
            }}>{i + 1}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
      {action && <Btn kind="primary" size="sm" onClick={action.run}>{action.label}</Btn>}
    </div>
  );
}

export function ProToastHost() {
  const list = useSyncExternalStore(subscribeToasts, readToasts, readToasts);
  const { t } = useTranslation();
  if (list.length === 0) return null;
  const dot: Record<ProToast['tone'], string | undefined> = { neutral: undefined, ok: 'var(--cth-status-success)', bad: 'var(--cth-status-blocked)' };
  return (
    <div role="status" aria-live="polite" style={{ position: 'fixed', bottom: 18, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, zIndex: 300, pointerEvents: 'none' }}>
      {list.map((x) => (
        <div key={x.id} style={{
          pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 10, padding: '7px 8px 7px 14px', borderRadius: 8,
          background: 'var(--cth-ink-900)', color: 'var(--cth-cream-50)', fontSize: 12.5, boxShadow: '0 8px 24px rgba(0,0,0,0.25)', maxWidth: '70vw'
        }}>
          {dot[x.tone] && <i aria-hidden style={{ width: 7, height: 7, borderRadius: 7, background: dot[x.tone], flexShrink: 0 }} />}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.text}</span>
          {x.action && (
            <button type="button" onClick={() => { x.action?.run(); dismissToast(x.id); }} style={{ border: 'none', background: 'transparent', color: 'var(--cth-accent)', font: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: '0 4px' }}>
              {x.action.label}
            </button>
          )}
          <button type="button" onClick={() => dismissToast(x.id)} aria-label={t('pro.toast.dismiss')} title={t('pro.toast.dismiss')} style={{ width: 22, height: 22, borderRadius: 6, border: 'none', background: 'transparent', color: 'inherit', opacity: 0.7, cursor: 'pointer', display: 'grid', placeItems: 'center', padding: 0 }}>
            <ProIcon name="close" size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}

/** A label / value pair list (the drawer's facts). */
export function Kv({ rows }: { rows: { k: string; v: ReactNode; mono?: boolean }[] }) {
  return (
    <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 12, rowGap: 6, fontSize: 12.5 }}>
      {rows.map((r) => (
        <Fragment key={r.k}>
          <dt style={{ color: 'var(--cth-ink-500)', whiteSpace: 'nowrap' }}>{r.k}</dt>
          <dd style={{ margin: 0, color: 'var(--cth-ink-900)', minWidth: 0, overflowWrap: 'anywhere', fontFamily: r.mono ? 'var(--cth-font-mono)' : undefined, fontSize: r.mono ? 12 : undefined }}>{r.v}</dd>
        </Fragment>
      ))}
    </dl>
  );
}
