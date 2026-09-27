/**
 * THE SETTINGS FRAME'S SHARED PIECES (0.5.3 redesign). Every section file under
 * components/settings/ builds from these, so the page has one way to save, one
 * way to fold a group away and one way to explain a field:
 *
 *   - useSettingsDraft(): the page's one draft (draftStore.ts). Stage a config
 *     field or a task; the footer Save commits all of it. Never call
 *     window.cth.updateConfig from a section.
 *   - <CollapsibleSection>: a titled group that folds, remembered per id.
 *   - <InfoTip>: an (i) that shows a short explanation on hover, focus or
 *     click, in place of a paragraph under the field.
 *
 * Styles come from pro/settings/chrome.ts through the chrome the page was
 * opened with, so Classic and PRO stay one markup.
 */
import { createContext, useContext, useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { settingsChrome, RADIUS, type SettingsChromeKind } from '../pro/settings/chrome';
import { COLLAPSE_STORE_PREFIX, type SettingsDraft } from './draftStore';
import { isEmptyPatch, mergePending, pendingFor, sameValue, setPendingFor } from './pendingPatch';
import type { HarnessConfig } from '@/store/config';

interface FrameValue { draft: SettingsDraft; chrome: SettingsChromeKind }
const FrameContext = createContext<FrameValue | null>(null);

export function SettingsFrameProvider({ draft, chrome, children }: FrameValue & { children: ReactNode }) {
  return <FrameContext.Provider value={{ draft, chrome }}>{children}</FrameContext.Provider>;
}

const noopSubscribe = (): (() => void) => () => undefined;
const zero = (): number => 0;

/** The page's draft, re-rendering the caller on every change to it. Null when
 *  the section is drawn outside Settings (a sheet that reuses it). */
export function useSettingsDraft(): SettingsDraft | null {
  const frame = useContext(FrameContext);
  useSyncExternalStore(frame ? frame.draft.subscribe : noopSubscribe, frame ? frame.draft.version : zero);
  return frame?.draft ?? null;
}

/** One config field as the page shows it (staged, else on disk) and a setter
 *  that stages it. Set back to the value on disk, it unstages, so Save goes
 *  quiet again. Drawn outside Settings (no draft), the setter writes at once. */
export function useConfigValue<K extends keyof HarnessConfig>(config: HarnessConfig, key: K, fallback: NonNullable<HarnessConfig[K]>): [NonNullable<HarnessConfig[K]>, (v: NonNullable<HarnessConfig[K]>) => void] {
  const draft = useSettingsDraft();
  const onDisk = (config[key] ?? fallback) as NonNullable<HarnessConfig[K]>;
  const value = draft ? draft.value(key as string, onDisk) : onDisk;
  const set = (v: NonNullable<HarnessConfig[K]>): void => {
    if (!draft) { void window.cth.updateConfig({ [key]: v } as Partial<HarnessConfig>); return; }
    if (sameValue(v, onDisk)) draft.unstage([key as string]);
    else draft.stage({ [key]: v });
  };
  return [value, set];
}

/** A live object with the person's changes over it (pendingPatch.ts), for a
 *  section whose write goes through a setter of its own in main. The page
 *  shows live + pending; Save runs `apply(pending)` as the task `id`. Drawn
 *  outside Settings, a change is applied at once. */
export function usePendingPatch<T extends object>(id: string, live: T, apply: (patch: Partial<T>) => Promise<void>): { view: T; pending: Partial<T>; change: (p: Partial<T>) => void } {
  const draft = useSettingsDraft();
  const pending: Partial<T> = draft && draft.hasTask(id) ? pendingFor<T>(draft, id) : {};
  const change = (p: Partial<T>): void => {
    if (!draft) { void apply(p); return; }
    const prev: Partial<T> = draft.hasTask(id) ? pendingFor<T>(draft, id) : {};
    const next = mergePending(live, prev, p);
    setPendingFor(draft, id, next);
    draft.setTask(id, isEmptyPatch(next) ? null : async () => { await apply(next); setPendingFor(draft, id, null); });
  };
  return { view: { ...live, ...pending }, pending, change };
}

/** The chrome the page was opened with ('inline' is PRO, 'modal' Classic). */
export function useSettingsChrome(): SettingsChromeKind {
  return useContext(FrameContext)?.chrome ?? 'inline';
}

function readOpen(id: string, fallback: boolean): boolean {
  try {
    const v = window.localStorage.getItem(COLLAPSE_STORE_PREFIX + id);
    return v === '1' ? true : v === '0' ? false : fallback;
  } catch { return fallback; }
}
function writeOpen(id: string, open: boolean): void {
  try { window.localStorage.setItem(COLLAPSE_STORE_PREFIX + id, open ? '1' : '0'); } catch { /* private window */ }
}

export interface CollapsibleSectionProps {
  /** Stable id: remembers open or closed across visits. */
  id: string;
  title: string;
  /** Short explanation behind an (i) next to the title. */
  info?: string;
  /** One short state line on the closed header ("2 of 5 set"). */
  summary?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}

/** A group that folds. The header is one button (title, optional (i), summary,
 *  chevron); the body is only mounted while open. */
export function CollapsibleSection({ id, title, info, summary, defaultOpen = false, children }: CollapsibleSectionProps) {
  const kind = useSettingsChrome();
  const { sectionHeadFlush } = settingsChrome(kind);
  const [open, setOpen] = useState(() => readOpen(id, defaultOpen));
  const bodyId = `settings-sec-${useId()}`;
  const toggle = (): void => { setOpen((o) => { writeOpen(id, !o); return !o; }); };

  const box: CSSProperties = {
    border: '1px solid var(--cth-ink-300)',
    borderRadius: kind === 'inline' ? RADIUS.lg : 0,
    background: 'var(--cth-cream-50)'
  };
  const head: CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
    padding: '10px 12px', background: 'transparent', border: 'none',
    cursor: 'pointer', textAlign: 'left', color: 'var(--cth-ink-900)'
  };
  return (
    <section style={box} data-settings-section={id}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button type="button" onClick={toggle} aria-expanded={open} aria-controls={bodyId} style={head}>
          <span aria-hidden style={{
            display: 'inline-block', width: 10, fontSize: 10, color: 'var(--cth-ink-500)',
            transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 120ms ease'
          }}>▸</span>
          <span style={{ ...sectionHeadFlush, flex: '0 1 auto' }}>{title}</span>
          <span style={{ flex: 1 }} />
          {summary != null && !open && (
            <span style={{ fontSize: 12, color: 'var(--cth-ink-500)', whiteSpace: 'nowrap' }}>{summary}</span>
          )}
        </button>
        {info && <span style={{ paddingRight: 12 }}><InfoTip text={info} label={title} /></span>}
      </div>
      {open && (
        <div id={bodyId} style={{ padding: '2px 12px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {children}
        </div>
      )}
    </section>
  );
}

/** An (i) that explains a field. Shows on hover and on keyboard focus, stays
 *  put after a click, and Escape or a click elsewhere puts it away. Drawn
 *  fixed to the window so the scrolling pane can never clip it. */
export function InfoTip({ text, label }: { text: string; label?: string }) {
  const { t } = useTranslation();
  const { infoBtn } = settingsChrome(useSettingsChrome());
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const tipId = `settings-tip-${useId()}`;
  const open = hover || pinned;

  useLayoutEffect(() => {
    if (!open || !btn.current) { setPos(null); return; }
    const r = btn.current.getBoundingClientRect();
    const width = 260;
    const left = Math.max(8, Math.min(r.left + r.width / 2 - width / 2, window.innerWidth - width - 8));
    setPos({ left, top: r.bottom + 6 });
  }, [open]);

  useEffect(() => {
    if (!pinned) return;
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') { setPinned(false); setHover(false); } };
    const onDown = (e: MouseEvent): void => { if (!btn.current?.contains(e.target as Node)) setPinned(false); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('mousedown', onDown); };
  }, [pinned]);

  return (
    <>
      <button
        ref={btn}
        type="button"
        aria-label={label ? t('settings.frame.aboutField', { name: label }) : t('settings.frame.about')}
        aria-describedby={open ? tipId : undefined}
        aria-expanded={pinned}
        onClick={(e) => { e.stopPropagation(); setPinned((p) => !p); }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocus={() => setHover(true)}
        onBlur={() => { setHover(false); }}
        onKeyDown={(e) => { if (e.key === 'Escape') { setPinned(false); setHover(false); } }}
        style={infoBtn(open)}
      >i</button>
      {open && pos && (
        <span
          id={tipId}
          role="tooltip"
          style={{
            position: 'fixed', left: pos.left, top: pos.top, zIndex: 400, width: 260, boxSizing: 'border-box',
            padding: '8px 10px', borderRadius: RADIUS.md,
            border: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-50)',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.12)',
            fontFamily: 'var(--cth-font-ui)', fontSize: 12, fontWeight: 400, lineHeight: '17px',
            letterSpacing: 'normal', textTransform: 'none', color: 'var(--cth-ink-700)',
            whiteSpace: 'normal', pointerEvents: 'none'
          }}
        >{text}</span>
      )}
    </>
  );
}
