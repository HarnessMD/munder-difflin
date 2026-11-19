/**
 * USAGE LIMITS IN THE TOP BAR (founder ask, 26 Oct 2026; second design from
 * Pam, the founder's go of 30 Oct): hive/shared/eng/limits-bar/previews/limits-bar-v2.html.
 * Each vendor's own logo and style: hive/shared/eng/task-force-058/design/m30-248-limits.html.
 *
 *   The chip     sits in the title bar, before the theme button. One
 *                cell per engine the person picked: its mark and its fullest
 *                window, percent used, above that figure's own bar.
 *                Fixed order, so a mark never moves. Only the closest engine,
 *                and only from 80 percent, adds its reset time. Amber from 80,
 *                never red. All engines, Closest only or Icon only, and it
 *                steps down by the room left in the bar.
 *   The panel    one click drops it from under the chip; Esc, a click outside
 *                or the chip again closes it. One block per engine, closest
 *                first, the order set when it opens, drawing only the windows
 *                in its data, in the style that vendor uses. One freshness line
 *                says the oldest figure's age. A click on a row says where its
 *                figures came from. An engine with no figures sits below and
 *                says why.
 *   Settings     "Show in the top bar", folded, at the foot of the panel: the
 *                look and the engines.
 *
 * The figures come from `telemetry:usageLimits` (main/usageLimits.ts). Nothing
 * here makes a figure up, and no credential reaches this side: only the plan's
 * name does.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { LIMIT_ENGINES, limitsView, type EngineLimits, type LimitEngine, type LimitWindow, type UsageLimitsSnapshot } from '@shared/usageLimits';
import { ENGINE_NAME } from '@shared/engine';
import { ClaudeCodeLogo, LimitsMark } from './LimitsLogo';
import { Icon } from '../Icon';
import { PixelButton } from '../PixelButton';
import {
  AGE_TAG_MINUTES, CODEX_BLOCKS, blocksUsed, closestEngine, fillWidth, freshness, fullestWindow, groupsOf, isHot, keepOrder, leftPercent, minutesBetween, pctText,
  planName, readLimitsPrefs, readWhileRunning, statusOf, timeAtEnd, wholePct, writeLimitsPrefs,
  type LimitsLook, type LimitsPrefs, type WindowMeter
} from './limitsView';

/** The chip reads what is kept every minute (no engine is asked); its first read, and opening the panel, ask again. */
const POLL_MS = 60_000;
/** Check now turns at least this long: inside the 5 minute cooldown the answer is instant, and the click must still show. */
const MIN_TURN_MS = 500;
const PANEL_WIDTH = 430;
/** The gap a panel keeps from the window's edge. */
const EDGE_GAP = 8;
/** First read: every engine that can have figures holds its place. OpenCode never has any. */
const LOADING_ENGINES = LIMIT_ENGINES.filter((e) => e !== 'opencode');

const engineName = (e: LimitEngine): string => (e === 'grok' ? 'Grok Build' : ENGINE_NAME[e]);

/* ---- The figures ---------------------------------------------------------------------------- */

type Side = UsageLimitsSnapshot | 'not-read' | null;

function useLimits() {
  const [own, setOwn] = useState<Side>(null);
  const [checking, setChecking] = useState(false);
  // The fresh reads still out: the minute's read of what is kept must not end a check that is running.
  const fresh = useRef(0);

  /** `start`: the first read asks the engines too, quietly (no "Checking"), so the panel's first open has them. */
  const read = useCallback(async (isFresh: boolean, start = false) => {
    if (isFresh) { fresh.current += 1; setChecking(true); }
    // A failed read keeps the figures already here; with none, it says so.
    await window.cth.usageLimits({ fresh: isFresh || start }).then((s) => setOwn(s), () => setOwn((was) => was ?? 'not-read'));
    if (isFresh) { fresh.current -= 1; if (fresh.current === 0) setChecking(false); }
  }, []);

  // At app start the chip shows what is kept at once, then asks its engines once (main asks each engine at most
  // once in 5 minutes, however many windows ask). After that the minute reads only what is kept.
  useEffect(() => {
    void read(false).then(() => read(false, true));
    const id = window.setInterval(() => { void read(false); }, POLL_MS);
    return () => window.clearInterval(id);
  }, [read]);

  return { own, checking, read };
}

/** The agent's name, from the registry. Null when it is not there: the row then leaves the line out, never an id. */
function useAgentName(id: string | null): string | null {
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    setName(null);
    if (!id) return;
    let alive = true;
    window.cth.hiveRegistry().then((r) => { if (alive) setName(r.agents[id]?.name ?? null); }, () => { /* unread: the line stays out */ });
    return () => { alive = false; };
  }, [id]);
  return name;
}

const listOf = (s: Side): EngineLimits[] => (s && s !== 'not-read' ? limitsView(s).engines : []);

/* ---- Words ---------------------------------------------------------------------------------- */

function clock(ms: number, lang: string): string {
  return new Date(ms).toLocaleTimeString(lang, { hour: 'numeric', minute: '2-digit' });
}

function weekday(ms: number, lang: string): string {
  return new Date(ms).toLocaleDateString(lang, { weekday: 'short' });
}

function span(t: TFunction, mins: number): string {
  if (mins < 60) return t('pro.limits.minutes', { m: mins });
  return t('pro.limits.hours', { h: Math.floor(mins / 60), m: String(mins % 60).padStart(2, '0') });
}

/** Under a day the time left, else the day and time: what fits beside a figure. */
function resetShort(t: TFunction, lang: string, at: number | null, now: number): string {
  if (at === null) return '';
  const mins = minutesBetween(now, at);
  return mins < 24 * 60 ? span(t, mins) : t('pro.limits.resetShortOn', { day: weekday(at, lang), time: clock(at, lang) });
}

function resetFull(t: TFunction, lang: string, at: number | null, now: number): string {
  if (at === null) return '';
  const mins = minutesBetween(now, at);
  if (mins < 60) return t('pro.limits.resetsInMin', { m: mins });
  if (mins < 24 * 60) return t('pro.limits.resetsIn', { h: Math.floor(mins / 60), m: String(mins % 60).padStart(2, '0') });
  return t('pro.limits.resetsOn', { day: weekday(at, lang), time: clock(at, lang) });
}

function planWord(t: TFunction, e: EngineLimits): string | null {
  return e.apiKey ? t('pro.limits.planApiKey') : planName(e);
}

/** Why an engine has no meters, in plain words. */
function whyNone(t: TFunction, e: EngineLimits): string {
  const engine = engineName(e.engine);
  if (e.state === 'not-installed') return t('pro.limits.notInstalledHere', { engine });
  if (e.engine === 'opencode') return t('pro.limits.whyOpencode');
  if (e.state === 'not-available') {
    if (e.apiKey) return t('pro.limits.apiKeyNoLimits', { engine });
    return e.engine === 'grok' ? t('pro.limits.grokNotRead') : t('pro.limits.noLimits', { engine });
  }
  if (e.failed) return `${t('pro.limits.failedNone', { engine })} ${t('pro.limits.failedRetry')}`;
  if (e.engine === 'claude') return t('pro.limits.claudeNone');
  if (e.engine === 'grok') return t('pro.limits.grokNone');
  return t('pro.limits.notReadYet', { engine });
}

/* ---- Pieces --------------------------------------------------------------------------------- */

/** An engine on the chip: its mark and figure above the figure's own bar. */
function Cell({ e, w, withTime, now }: { e: EngineLimits; w: LimitWindow; withTime?: boolean; now: number }) {
  const { t, i18n } = useTranslation();
  const hot = isHot(w.usedPercent);
  const tip = t('pro.limits.cellTip', {
    engine: engineName(e.engine), window: windowWord(t, w),
    pct: wholePct(w.usedPercent), reset: resetFull(t, i18n.language, w.resetsAt, now)
  });
  return (
    <>
      <span className={`cth-lim-cell${hot && !e.failed ? ' hot' : ''}${e.failed ? ' stale' : ''}`} title={tip}>
        <span className="cth-lim-top"><LimitsMark engine={e.engine} size={13} /><span className="cth-lim-num"><bdi dir="ltr">{pctText(w.usedPercent)}%</bdi></span></span>
        <span className="cth-lim-bar"><b style={{ '--p': fillWidth(w.usedPercent) } as CSSProperties} /></span>
      </span>
      {withTime && <ResetTime w={w} hot={hot} now={now} />}
    </>
  );
}

/** The chip's reset time for one window: beside its engine, or after the last engine when the row is long. A day
 *  and a time take two lines (founder, 14 Nov 2026, for 0.5.10): the day on top, as large as the % beside the logo,
 *  and the time just below it, smaller, where the bar is. Under a day it stays the one line of time left. */
function ResetTime({ w, hot, now }: { w: LimitWindow; hot: boolean; now: number }) {
  const { t, i18n } = useTranslation();
  const cls = `cth-lim-time${hot ? '' : ' calm'}`;
  if (w.resetsAt !== null && minutesBetween(now, w.resetsAt) >= 24 * 60) {
    return (
      <span className={`${cls} two`} data-reset-two>
        <span className="cth-lim-day">{weekday(w.resetsAt, i18n.language)}</span>
        <span className="cth-lim-clock">{clock(w.resetsAt, i18n.language)}</span>
      </span>
    );
  }
  return <span className={cls}>{resetShort(t, i18n.language, w.resetsAt, now)}</span>;
}

/** A window's name on the screen: the two the app words itself, any other as the vendor calls it. */
function windowWord(t: TFunction, w: { kind: LimitWindow['kind']; name?: string | null }): string {
  return w.kind === '5h' ? t('pro.limits.h5') : w.kind === 'weekly' ? t('pro.limits.weekly') : w.name ?? t('pro.limits.notAvailable');
}

/** What a window is called in this vendor's row: Codex and Grok Build have their own words. */
function meterLabel(t: TFunction, engine: LimitEngine, w: { kind: LimitWindow['kind']; name?: string | null }): string {
  if (engine === 'codex' && w.kind === '5h') return t('pro.limits.h5Limit');
  if (engine === 'codex' && w.kind === 'weekly') return t('pro.limits.weeklyLimit');
  if (engine === 'grok' && w.kind === 'weekly') return t('pro.limits.weeklyCredits');
  return windowWord(t, w);
}

/** Stands for the figure while the sentence is read, so the figure can be set apart from it. */
const FIGURE = '\u2063';

/** "4% used": only the percent is kept left to right, or Arabic flips its sign. */
function PctWords({ which, pct }: { which: 'used' | 'left'; pct: string }) {
  const { t } = useTranslation();
  const words = which === 'used' ? t('pro.limits.used', { pct: FIGURE }) : t('pro.limits.left', { pct: FIGURE });
  const [before, after = ''] = words.split(`${FIGURE}%`);
  return <>{before}<bdi dir="ltr">{pct}%</bdi>{after}</>;
}

/** One window in its vendor's style. Every bar fills with what is used and its figure says used, like the chip (founder, 3 Nov 2026); Codex and Antigravity add what is left, small below. */
function VendorMeter({ engine, m, stale, now }: { engine: LimitEngine; m: WindowMeter; stale: boolean; now: number }) {
  const { t, i18n } = useTranslation();
  const label = meterLabel(t, engine, m);
  // A window whose reset has passed drops its number and its bar: the old one is no longer true.
  if (m.resetsAt !== null && m.resetsAt <= now) return <span className="cth-lim-m past"><span className="cth-lim-pl">{label}</span>{t('pro.limits.resetPassed', { time: clock(m.resetsAt, i18n.language) })}</span>;
  const hot = isHot(m.usedPercent) && !stale;
  const cls = `cth-lim-m v-${engine}${hot ? ' hot' : ''}${stale ? ' stale' : ''}`;
  const meter = { role: 'meter', 'aria-label': label, 'aria-valuenow': wholePct(m.usedPercent), 'aria-valuemin': 0, 'aria-valuemax': 100 } as const;
  const lb = <span className="cth-lim-lb">{label}</span>;
  const used = <PctWords which="used" pct={pctText(m.usedPercent)} />;
  const left = <PctWords which="left" pct={pctText(leftPercent(m.usedPercent))} />;
  const reset = <span>{resetFull(t, i18n.language, m.resetsAt, now)}</span>;
  if (engine === 'codex') {
    const filled = blocksUsed(m.usedPercent);
    return (
      <span className={cls}>
        <span className="cth-lim-ln">
          {lb}
          <span className="cth-lim-blocks" {...meter}>{Array.from({ length: CODEX_BLOCKS }, (_, i) => <i key={i} className={i < filled ? 'fl' : ''} />)}</span>
          <span className="cth-lim-fg">{used}</span>
        </span>
        <span className="cth-lim-sb">{reset}<span>{left}</span></span>
      </span>
    );
  }
  if (engine === 'antigravity') {
    return (
      <span className={cls}>
        <span className="cth-lim-ln">{lb}<span className="cth-lim-fg">{used}</span></span>
        <span className="cth-lim-mbar" {...meter} style={{ '--p': fillWidth(m.usedPercent) } as CSSProperties}><b /></span>
        <span className="cth-lim-sb">{reset}<span>{left}</span></span>
      </span>
    );
  }
  return (
    <span className={cls}>
      <span className="cth-lim-ln">
        {lb}
        <span className="cth-lim-mbar" {...meter} style={{ '--p': fillWidth(m.usedPercent) } as CSSProperties}><b /></span>
        <span className="cth-lim-fg">{used}</span>
      </span>
      <span className="cth-lim-sb">{reset}</span>
    </span>
  );
}

/** A row's first line: the vendor's logo, its name unless the logo says it, the plan, and anything that chips in at the end. */
function RowHead({ engine, plan, tag }: { engine: LimitEngine; plan: string | null; tag?: ReactNode }) {
  return (
    <span className="cth-lim-rh">
      {engine === 'claude'
        ? <ClaudeCodeLogo height={14} />
        : <><LimitsMark engine={engine} size={18} /><span className={`cth-lim-rn${engine === 'codex' ? ' mono' : ''}`}>{engineName(engine)}</span></>}
      {plan && <span className="cth-lim-plan">{plan}</span>}
      {tag && <span className="cth-lim-rs">{tag}</span>}
    </span>
  );
}

function StatusTag({ e, now }: { e: EngineLimits; now: number }) {
  const { t } = useTranslation();
  if (e.failed) return <span className="cth-lim-tag warn">{t('pro.limits.notUpdated')}</span>;
  const st = statusOf(e, now);
  if (st) return <span className="cth-lim-tag warn">{st === 'reached' ? t('pro.limits.reached') : t('pro.limits.near')}</span>;
  if (e.asOf !== null && (readWhileRunning(e) || minutesBetween(e.asOf, now) > AGE_TAG_MINUTES)) {
    return <span className="cth-lim-tag muted">{t('pro.limits.ageTag', { time: span(t, minutesBetween(e.asOf, now)) })}</span>;
  }
  return null;
}

/** Where a row's figures came from, the part a click opens. */
function RowDetail({ e, now }: { e: EngineLimits; now: number }) {
  const { t } = useTranslation();
  const engine = engineName(e.engine);
  const agent = useAgentName(e.fromAgent);
  return (
    <span className="cth-lim-det">
      {e.asOf !== null && <span>{t('pro.limits.asOf', { time: span(t, minutesBetween(e.asOf, now)) })}</span>}
      {agent && <span>{t('pro.limits.fromAgent', { agent })}</span>}
      {readWhileRunning(e) && <span>{t('pro.limits.creditNote')}</span>}
      {readWhileRunning(e) && <span>{t('pro.limits.lastSeenRunning', { engine })}</span>}
      {e.engine === 'claude' && e.plan && <span>{t('pro.limits.planNoteHere')}</span>}
      {(e.source === 'codex-app-server' || e.source === 'agy-usage') && <span>{t('pro.limits.askedEngine', { engine })}</span>}
    </span>
  );
}

function EngineRow({ e, selected, onToggle, now }: {
  e: EngineLimits; selected: boolean; onToggle: () => void; now: number;
}) {
  const { t } = useTranslation();
  const groups = groupsOf(e);
  const named = groups.some((g) => g.name);
  return (
    <button type="button" data-row className={`cth-lim-row${e.failed ? ' stale' : ''}`} aria-expanded={selected} onClick={onToggle}>
      <span className="cth-lim-in">
        <RowHead engine={e.engine} plan={planWord(t, e)} tag={<StatusTag e={e} now={now} />} />
        <span className="cth-lim-rb">
          {groups.map((g) => (
            <span className="cth-lim-gr" key={g.name ?? ''}>
              {g.name && <span className="cth-lim-gn" dir="auto">{g.name}</span>}
              <span className={named ? 'cth-lim-g2' : 'cth-lim-gs'}>
                {g.meters.map((m) => <VendorMeter key={m.name ?? m.kind} engine={e.engine} m={m} stale={e.failed} now={now} />)}
              </span>
            </span>
          ))}
        </span>
        {e.failed && e.asOf !== null && (
          <span className="cth-lim-why">
            {t('pro.limits.failedOld', { engine: engineName(e.engine), time: span(t, minutesBetween(e.asOf, now)) })} {t('pro.limits.failedRetry')}
          </span>
        )}
        {readWhileRunning(e) && !selected && <span className="cth-lim-why small">{t('pro.limits.lastSeenRunning', { engine: engineName(e.engine) })}</span>}
        {selected && <RowDetail e={e} now={now} />}
      </span>
    </button>
  );
}

/** An engine still being read: its logo and a grey meter, no number and no window's name, because the windows are not known yet. */
function LoadingRow({ engine }: { engine: LimitEngine }) {
  return (
    <div className="cth-lim-row" style={{ cursor: 'default' }} data-loading={engine}>
      <span className="cth-lim-in">
        <RowHead engine={engine} plan={null} />
        <span className="cth-lim-rb"><span className="cth-lim-sk cth-lim-skl" /></span>
      </span>
    </div>
  );
}

/** An engine with no meters: its logo, its plan if it has one, what state it is in, and why. */
function QuietRow({ e }: { e: EngineLimits }) {
  const { t } = useTranslation();
  const why = whyNone(t, e);
  const failed = e.state === 'no-reading' && e.failed;
  const word = failed ? t('pro.limits.notUpdated')
    : e.state === 'not-installed' ? t('pro.limits.notInstalled')
        : e.state === 'no-reading' ? t('pro.limits.noReading')
          : t('pro.limits.notAvailable');
  return (
    <div className="cth-lim-quiet">
      <RowHead engine={e.engine} plan={planWord(t, e)} tag={<span className={`cth-lim-tag ${failed ? 'warn' : 'muted'}`}>{word}</span>} />
      <span className="cth-lim-why">{why}</span>
    </div>
  );
}

/** A whole read that came back with nothing: what to do. */
function ReadFailed({ name, why }: { name: string; why: string }) {
  const { t } = useTranslation();
  return (
    <div className="cth-lim-quiet first">
      <span className="cth-lim-rh">
        <span className="cth-lim-mk"><Icon name="info" /></span>
        <span className="cth-lim-rn">{name}</span>
        <span className="cth-lim-rs"><span className="cth-lim-tag warn">{t('pro.limits.notUpdated')}</span></span>
      </span>
      <span className="cth-lim-why">{why}</span>
    </div>
  );
}

function Seg<T extends string>({ options, value, onPick }: { options: Array<[T, string]>; value: T; onPick: (v: T) => void }) {
  return (
    <span className="cth-lim-seg" role="radiogroup">
      {options.map(([v, label]) => (
        <button key={v} type="button" role="radio" aria-checked={v === value} className={v === value ? 'on' : ''} onClick={() => onPick(v)}>{label}</button>
      ))}
    </span>
  );
}

function Fold({ prefs, setPrefs }: { prefs: LimitsPrefs; setPrefs: (p: LimitsPrefs) => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const looks: Array<[LimitsLook, string]> = [['all', t('pro.limits.lookAll')], ['closest', t('pro.limits.lookClosest')], ['icon', t('pro.limits.lookIcon')]];
  const toggle = (e: LimitEngine) => {
    const on = prefs.engines.includes(e);
    setPrefs({ ...prefs, engines: on ? prefs.engines.filter((x) => x !== e) : LIMIT_ENGINES.filter((x) => x === e || prefs.engines.includes(x)) });
  };
  return (
    <div className="cth-lim-fold">
      <button type="button" className="cth-lim-fb" aria-expanded={open} onClick={() => setOpen(!open)}>
        {t('pro.limits.showInBar')}
        <span className="v">{looks.find(([v]) => v === prefs.look)?.[1]}</span>
        <span aria-hidden>{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div className="cth-lim-fs">
          <div className="cth-lim-frow">
            <span>{t('pro.limits.show')}</span>
            <Seg<LimitsLook> value={prefs.look} onPick={(look) => setPrefs({ ...prefs, look })} options={looks} />
          </div>
          <div className="cth-lim-frow">
            <span>{t('pro.limits.engines')}</span>
            <span className="cth-lim-pills">
              {LIMIT_ENGINES.map((e) => {
                const on = prefs.engines.includes(e);
                const none = e === 'opencode';
                return (
                  <button key={e} type="button" role="checkbox" aria-checked={on} disabled={none} title={none ? t('pro.limits.whyOpencode') : undefined} className={`cth-lim-pill${on ? ' on' : ''}`} onClick={() => toggle(e)}>
                    {on && <Icon name="check" />}
                    <LimitsMark engine={e} size={13} />
                    {engineName(e)}
                  </button>
                );
              })}
            </span>
          </div>
        </div>
      )}
      <div className="cth-lim-unit">{t('pro.limits.chipUnit')}</div>
    </div>
  );
}

/* ---- The chip and its panel ----------------------------------------------------------------- */

/** The room the title bar has left beside what it already holds, in px. An empty flex spacer holds nothing. */
function freeInBar(from: HTMLElement): number | null {
  let bar = from.parentElement;
  while (bar && bar.getBoundingClientRect().width < window.innerWidth - 1) bar = bar.parentElement;
  if (!bar) return null;
  const css = getComputedStyle(bar);
  const kids = [...bar.children].filter((k) => getComputedStyle(k).position !== 'absolute');
  const gaps = (parseFloat(css.columnGap) || 0) * Math.max(0, kids.length - 1);
  const held = kids.reduce((sum, k) => sum + (k.childNodes.length ? k.getBoundingClientRect().width : 0), 0);
  return bar.clientWidth - (parseFloat(css.paddingLeft) || 0) - (parseFloat(css.paddingRight) || 0) - gaps - held;
}

export function LimitsChip() {
  const { t, i18n } = useTranslation();
  const [prefs, setPrefsState] = useState<LimitsPrefs>(() => readLimitsPrefs());
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<LimitEngine | null>(null);
  const [turning, setTurning] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [fit, setFit] = useState<LimitsLook>(prefs.look);
  const root = useRef<HTMLSpanElement>(null);
  const chip = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const measureAll = useRef<HTMLSpanElement>(null);
  const measureClosest = useRef<HTMLSpanElement>(null);
  // The order the rows took when the panel opened.
  const order = useRef<LimitEngine[]>([]);
  const focusFirst = useRef(false);
  const turnTimer = useRef<number | undefined>(undefined);
  const { own, checking, read } = useLimits();
  const busy = checking || turning;

  const setPrefs = (p: LimitsPrefs) => { setPrefsState(p); writeLimitsPrefs(p); };
  // Another window changed them.
  useEffect(() => {
    const on = (ev: StorageEvent) => { if (ev.key === 'cth.limits.prefs') setPrefsState(readLimitsPrefs()); };
    window.addEventListener('storage', on);
    return () => window.removeEventListener('storage', on);
  }, []);
  // Ages and "Resets in" move on with the clock.
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [own]);
  // Opening asks the engines again (at most once in 5 minutes each, main decides).
  useEffect(() => { if (open) void read(true); }, [open, read]);
  useEffect(() => () => window.clearTimeout(turnTimer.current), []);

  const toggleOpen = () => {
    if (!open) { order.current = []; setSelected(null); }
    setOpen(!open);
  };
  const checkNow = () => {
    if (busy) return;
    setTurning(true);
    turnTimer.current = window.setTimeout(() => setTurning(false), MIN_TURN_MS);
    void read(true);
  };

  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); chip.current?.focus(); } };
    const down = (e: MouseEvent) => { if (root.current && !root.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('keydown', key);
    window.addEventListener('mousedown', down);
    return () => { window.removeEventListener('keydown', key); window.removeEventListener('mousedown', down); };
  }, [open]);

  // Opened by the keyboard: focus goes to the first row, or Check now while there are no rows yet.
  useLayoutEffect(() => {
    if (!open || !focusFirst.current) return;
    focusFirst.current = false;
    (panel.current?.querySelector<HTMLElement>('[data-row]') ?? panel.current?.querySelector<HTMLElement>('[data-check-now]'))?.focus();
  }, [open]);

  // The chip's look: the one picked, or the next that fits in the room the bar has left.
  const fitNow = useCallback(() => {
    const free = root.current && chip.current ? freeInBar(root.current) : null;
    if (free === null || !chip.current) return;
    const room = free + chip.current.getBoundingClientRect().width;
    const fits = (el: HTMLElement | null) => !!el && el.getBoundingClientRect().width <= room;
    const want = prefs.look;
    setFit(want === 'all' && fits(measureAll.current) ? 'all' : want !== 'icon' && fits(measureClosest.current) ? 'closest' : 'icon');
  }, [prefs.look]);
  useLayoutEffect(fitNow);
  useEffect(() => {
    window.addEventListener('resize', fitNow);
    return () => window.removeEventListener('resize', fitNow);
  }, [fitNow]);

  // The panel: never wider than the window, and pulled back so it stays inside its edge.
  useLayoutEffect(() => {
    const place = () => {
      const w = root.current;
      const p = panel.current;
      if (!w || !p) return;
      const width = Math.min(PANEL_WIDTH, window.innerWidth - EDGE_GAP * 2);
      const at = w.getBoundingClientRect();
      const over = getComputedStyle(w).direction === 'rtl' ? at.left + width - (window.innerWidth - EDGE_GAP) : EDGE_GAP - (at.right - width);
      p.style.setProperty('--pw', `${width}px`);
      p.style.setProperty('--shift', over > 0 ? `${-over}px` : '0px');
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  });

  /* The chip. */
  const shown = listOf(own).filter((e) => prefs.engines.includes(e.engine));
  const closest = closestEngine(shown, now);
  const chipLoading = (own === null || (checking && !closest)) && prefs.engines.length > 0;
  const gauge = (hot = false) => <span className={`cth-lim-gauge${hot ? ' hot' : ''}`}><Icon name="clock" /></span>;

  const chipBody = (look: LimitsLook): ReactNode => {
    if (look === 'icon') {
      const hot = !!closest && isHot(closest.w.usedPercent);
      return <>{gauge(hot)}{hot && closest && <Cell e={closest.e} w={closest.w} now={now} />}</>;
    }
    if (chipLoading) {
      return (look === 'all' ? prefs.engines : prefs.engines.slice(0, 1)).map((e) => (
        <span className="cth-lim-cell" key={e}>
          <span className="cth-lim-top"><LimitsMark engine={e} size={13} /><span className="cth-lim-sk cth-lim-sk-n" /></span>
          <span className="cth-lim-bar cth-lim-sk" />
        </span>
      ));
    }
    if (!closest) return <>{gauge()}<span className="cth-lim-word">{t('pro.limits.chipNone')}</span></>;
    if (look === 'closest') return <Cell e={closest.e} w={closest.w} withTime now={now} />;
    // Fixed order, so a mark never moves. Only the closest engine, and only when hot, adds its reset time:
    // beside it, or after the last engine once the row holds TIME_AT_END_FROM of them.
    const cells = prefs.engines.flatMap((n) => {
      const e = shown.find((x) => x.engine === n);
      const w = e && fullestWindow(e, now);
      return e && w ? [{ n, e, w }] : [];
    });
    const timed = cells.find((c) => c.e === closest.e && isHot(c.w.usedPercent)) ?? null;
    const atEnd = timeAtEnd(cells.length);
    return (
      <>
        {cells.map((c) => <Cell key={c.n} e={c.e} w={c.w} withTime={c === timed && !atEnd} now={now} />)}
        {timed && atEnd && <ResetTime w={timed.w} hot now={now} />}
      </>
    );
  };
  const chipEnd = (
    <span className="cth-lim-end" aria-hidden>
      {busy ? '…' : open ? '▴' : '▾'}
    </span>
  );
  const chipLabel = closest
    ? t('pro.limits.chipAria', {
      engine: engineName(closest.e.engine), window: windowWord(t, closest.w),
      pct: wholePct(closest.w.usedPercent), reset: resetFull(t, i18n.language, closest.w.resetsAt, now)
    })
    : t('pro.limits.title');

  /* The panel. */
  const list = listOf(own).filter((e) => (LIMIT_ENGINES as readonly LimitEngine[]).includes(e.engine));
  const placed = keepOrder(order.current, list, now);
  if (open) order.current = placed;
  const active = placed.map((n) => list.find((e) => e.engine === n && e.state === 'ok')).filter((e): e is EngineLimits => !!e);
  const rest = LIMIT_ENGINES.map((n) => list.find((e) => e.engine === n && e.state !== 'ok')).filter((e): e is EngineLimits => !!e);
  // Nothing back yet, or nothing has figures and those without are being asked now. "Not available" is said only after that.
  const asking = (e: EngineLimits) => checking && e.state === 'no-reading';
  const loading = own === null || (active.length === 0 && list.some(asking));
  const fresh = freshness(list, now);
  const panelBusy = busy || loading;

  const onRowsKey = (ev: ReactKeyboardEvent) => {
    const rows = [...(panel.current?.querySelectorAll<HTMLElement>('[data-row]') ?? [])];
    const at = rows.indexOf(document.activeElement as HTMLElement);
    if (at < 0) return;
    const to = ev.key === 'ArrowDown' ? at + 1 : ev.key === 'ArrowUp' ? at - 1 : ev.key === 'Home' ? 0 : ev.key === 'End' ? rows.length - 1 : -1;
    if (to >= 0 && rows[to]) { rows[to].focus(); ev.preventDefault(); }
  };

  return (
    <span ref={root} className="cth-titlebar-nodrag cth-lim-wrap" data-limits-chip>
      <button
        ref={chip}
        type="button"
        className={`cth-lim-chip${open ? ' open' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={chipLabel}
        onClick={toggleOpen}
        onKeyDown={(ev) => {
          if (ev.key !== 'Enter' && ev.key !== ' ') return;
          ev.preventDefault();
          focusFirst.current = !open;
          toggleOpen();
        }}
      >
        {chipBody(fit)}
        {chipEnd}
      </button>
      {/* The other looks, never seen: their widths say which one fits. */}
      {prefs.look === 'all' && <span ref={measureAll} className="cth-lim-chip cth-lim-measure" aria-hidden>{chipBody('all')}{chipEnd}</span>}
      {prefs.look !== 'icon' && <span ref={measureClosest} className="cth-lim-chip cth-lim-measure" aria-hidden>{chipBody('closest')}{chipEnd}</span>}
      {open && (
        <div ref={panel} className="cth-lim-panel" role="dialog" aria-label={t('pro.limits.title')}>
          <div className="cth-lim-head">
            <h4>{t('pro.limits.title')}</h4>
            <span className="cth-lim-fresh">
              {panelBusy ? t('pro.limits.checking') : fresh && own !== 'not-read' ? t(fresh.most ? 'pro.limits.upToAgeMost' : 'pro.limits.upToAge', { time: span(t, fresh.minutes) }) : ''}
            </span>
            <PixelButton variant="ghost" size="sm" title={t('pro.limits.checkNowTip')} disabled={panelBusy} onClick={checkNow} dataAttrs={{ 'data-check-now': '' }}>
              {t('pro.limits.checkNow')}
            </PixelButton>
            {panelBusy && <span className="cth-lim-scan" />}
          </div>
          <div className="cth-lim-scroll" onKeyDown={onRowsKey}>
            {loading && <div className="cth-lim-note" role="status">{t('pro.limits.loading')}</div>}
            {own === 'not-read' && <ReadFailed name={t('pro.limits.title')} why={`${t('pro.limits.readFailed')} ${t('pro.limits.failedRetry')}`} />}
            {own === null && LOADING_ENGINES.map((e) => <LoadingRow key={e} engine={e} />)}
            {active.map((e) => (
              <EngineRow key={e.engine} e={e} selected={selected === e.engine} onToggle={() => setSelected(selected === e.engine ? null : e.engine)} now={now} />
            ))}
            {rest.map((e) => (asking(e) ? <LoadingRow key={e.engine} engine={e.engine} /> : <QuietRow key={e.engine} e={e} />))}
            {list.length > 0 && active.length === 0 && !loading && <div className="cth-lim-foot">{t('pro.limits.foot')}</div>}
          </div>
          <Fold prefs={prefs} setPrefs={setPrefs} />
        </div>
      )}
    </span>
  );
}

/* ---- Styles, injected once. Only the app's tokens; lemon from 80; never red. */

const LIMITS_CSS = `
.cth-lim-wrap{position:relative;display:inline-flex;align-items:center;flex:none;margin-inline-start:auto}
.cth-lim-chip{display:inline-flex;align-items:center;gap:8px;height:28px;padding-block:0;padding-inline:6px 0;border:1px solid var(--cth-ink-300);background:var(--cth-paper-100);color:var(--cth-ink-900);font-family:var(--cth-font-ui);cursor:pointer;overflow:hidden}
.cth-lim-chip:hover{border-color:var(--cth-ink-500)}
.cth-lim-chip:focus-visible{outline:2px solid var(--cth-ink-900);outline-offset:1px}
/* Open is the border and the chevron. The ground stays: a tint would sit behind the bars. */
.cth-lim-chip.open{border-color:var(--cth-ink-500)}
.cth-lim-measure{position:absolute;top:0;inset-inline-end:0;visibility:hidden;pointer-events:none}
.cth-lim-cell{display:inline-grid;row-gap:2px;width:44px;flex:none}
.cth-lim-top{display:inline-flex;align-items:center;gap:3px;min-width:0;height:13px}
.cth-lim-cell.stale{opacity:.6}
.cth-lim-num{font:600 10.5px/1 var(--cth-font-mono);font-variant-numeric:tabular-nums;color:var(--cth-ink-900);white-space:nowrap}
.cth-lim-cell.hot .cth-lim-num{color:var(--cth-ink-900);font-weight:700}
.cth-lim-bar{display:block;height:5px;overflow:hidden;background:color-mix(in srgb,var(--cth-ink-500) 18%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--cth-ink-500) 50%,transparent)}
.cth-lim-bar b{display:block;height:100%;width:var(--p);background:var(--cth-ink-700)}
.cth-lim-cell.hot .cth-lim-bar b{background:var(--cth-lemon);box-shadow:inset 0 0 0 1px var(--cth-ink-900)}
.cth-lim-time{display:inline-flex;align-items:center;gap:3px;margin-inline-start:-2px;font-size:10.5px;font-weight:600;color:var(--cth-ink-900);white-space:nowrap;flex:none}
.cth-lim-time.calm{color:var(--cth-ink-500);font-weight:500}
.cth-lim-time.two{display:inline-grid;row-gap:1px;justify-items:start;align-content:center}
.cth-lim-day{display:block;height:13px;font-size:10.5px;line-height:13px}
.cth-lim-clock{display:block;font-size:9px;line-height:10px;font-weight:500}
.cth-lim-end{display:inline-grid;place-items:center;align-self:stretch;width:15px;margin-inline-start:-2px;color:var(--cth-ink-500);flex:none;border-inline-start:1px solid var(--cth-ink-100)}
.cth-lim-gauge{display:inline-grid;place-items:center;width:16px;color:var(--cth-ink-700);flex:none}
.cth-lim-gauge.hot{color:var(--cth-ink-900)}
.cth-lim-word{display:inline-flex;align-items:center;margin-inline-start:-3px;font-size:11px;color:var(--cth-ink-500);white-space:nowrap}
.cth-lim-sk{background:color-mix(in srgb,var(--cth-ink-500) 22%,transparent);animation:cthLimPulse 1.2s ease-in-out infinite}
.cth-lim-sk-n{width:22px;height:8px}
.cth-lim-bar.cth-lim-sk{box-shadow:none}
@keyframes cthLimPulse{50%{opacity:.45}}
.cth-lim-mk{display:inline-grid;place-items:center;flex:none;color:var(--cth-ink-900)}
.cth-lim-mk img,.cth-lim-rh>img{display:block;flex:none}
.cth-lim-raw{display:block}
.cth-lim-raw svg{display:block;width:100%;height:100%}
img.cth-lim-lgD{display:none}
:root[data-cth-theme='dark'] img.cth-lim-lgL{display:none}
:root[data-cth-theme='dark'] img.cth-lim-lgD{display:block}

.cth-lim-panel{position:absolute;top:calc(100% + 6px);inset-inline-end:var(--shift,0px);z-index:1000;width:var(--pw,${PANEL_WIDTH}px);max-height:calc(100vh - 60px);display:flex;flex-direction:column;background:var(--cth-paper-100);border:1px solid var(--cth-ink-300);box-shadow:var(--cth-shadow-hard);overflow:hidden;text-align:start;cursor:default;color:var(--cth-ink-900);font-family:var(--cth-font-ui);animation:cthLimDrop .16s cubic-bezier(.2,.7,.3,1) both}
@keyframes cthLimDrop{from{transform:translateY(-5px);opacity:.4}to{transform:none;opacity:1}}
.cth-lim-head{position:relative;display:flex;align-items:center;gap:8px;padding-block:8px;padding-inline:14px 8px;flex:none}
.cth-lim-head h4{margin:0;font-size:13px;font-weight:600;white-space:nowrap;color:var(--cth-ink-900)}
.cth-lim-fresh{margin-inline-start:auto;font-size:11px;color:var(--cth-ink-500);text-align:end;min-width:0}
.cth-lim-scan{position:absolute;inset-inline:0;bottom:-1px;height:2px;overflow:hidden;z-index:1}
.cth-lim-scan:after{content:"";position:absolute;inset-block:0;width:34%;background:var(--cth-lemon);animation:cthLimScan 1.1s ease-in-out infinite}
@keyframes cthLimScan{from{inset-inline-start:-34%}to{inset-inline-start:100%}}
.cth-lim-scroll{overflow-y:auto;overflow-x:hidden;min-height:0}
.cth-lim-row{display:block;width:100%;padding:0;border:0;border-top:1px solid var(--cth-ink-100);background:transparent;text-align:start;color:inherit;font:inherit;cursor:pointer}
.cth-lim-in{display:block;padding:10px 14px}
button.cth-lim-row:hover{background:color-mix(in srgb,var(--cth-ink-500) 9%,transparent)}
.cth-lim-row:focus-visible{outline:2px solid var(--cth-ink-900);outline-offset:-2px}
.cth-lim-row[aria-expanded=true]{background:color-mix(in srgb,var(--cth-ink-500) 15%,transparent);box-shadow:inset 0 0 0 1px var(--cth-ink-300)}
.cth-lim-rh{display:flex;flex-wrap:wrap;align-items:center;gap:7px;min-height:20px}
.cth-lim-rn{font-size:13px;font-weight:600}
.cth-lim-rn.mono{font-family:var(--cth-font-mono)}
.cth-lim-plan{font-size:11px;color:var(--cth-ink-500)}
.cth-lim-rs{margin-inline-start:auto;display:inline-flex;flex-wrap:wrap;gap:4px}
.cth-lim-rb{display:grid;gap:7px;margin-top:7px}
.cth-lim-gr{display:block}
.cth-lim-gn{display:block;margin-bottom:3px;font-size:11.5px;font-weight:600;color:var(--cth-ink-700)}
.cth-lim-gs{display:grid;gap:7px}
.cth-lim-g2{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
.cth-lim-m{display:block;min-width:0}
.cth-lim-m.past{font-size:12px;line-height:17px;color:var(--cth-ink-700)}
.cth-lim-pl{font-weight:600;margin-inline-end:6px}
.cth-lim-ln{display:flex;align-items:center;gap:8px}
.cth-lim-lb{flex:none;min-width:48px;font-size:11.5px;color:var(--cth-ink-700)}
.cth-lim-fg{font-size:12px;font-weight:600;white-space:nowrap;font-variant-numeric:tabular-nums}
.cth-lim-m.hot .cth-lim-fg{color:var(--cth-ink-900)}
.cth-lim-m.stale .cth-lim-fg{color:var(--cth-ink-500)}
.cth-lim-sb{display:flex;flex-wrap:wrap;justify-content:space-between;gap:0 10px;margin-top:2px;font-size:11px;line-height:15px;color:var(--cth-ink-500)}
.cth-lim-mbar{display:block;height:6px;overflow:hidden;background:color-mix(in srgb,var(--cth-ink-500) 20%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--cth-ink-500) 30%,transparent)}
.cth-lim-mbar b{display:block;height:100%;width:var(--p);background:var(--cth-ink-700)}
.cth-lim-ln .cth-lim-mbar,.cth-lim-blocks{flex:1;min-width:40px}
/* Claude Code: a soft bar in Claude's terracotta. */
.v-claude .cth-lim-mbar b{background:#D97757}
/* Codex: monospace, blocks of what is left. */
.v-codex .cth-lim-lb,.v-codex .cth-lim-fg,.v-codex .cth-lim-sb{font-family:var(--cth-font-mono)}
.v-codex .cth-lim-lb{min-width:88px;font-size:11px}
.v-codex .cth-lim-sb{font-size:10.5px}
.cth-lim-blocks{display:flex;gap:1px}
.cth-lim-blocks i{flex:1;min-width:0;height:9px;background:color-mix(in srgb,var(--cth-ink-500) 20%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--cth-ink-500) 30%,transparent)}
.cth-lim-blocks i.fl{background:var(--cth-ink-900);box-shadow:none}
/* Antigravity: rounded meters of what is left, in Google's blue. */
.cth-lim-panel{--cth-lim-blue:#4285F4}
:root[data-cth-theme='dark'] .cth-lim-panel{--cth-lim-blue:#8AB4F8}
.v-antigravity .cth-lim-ln{justify-content:space-between}
.v-antigravity .cth-lim-lb{min-width:0}
.v-antigravity .cth-lim-mbar{margin-top:3px}
.v-antigravity .cth-lim-mbar b{background:var(--cth-lim-blue)}
/* Grok Build: a thin line. */
.v-grok .cth-lim-mbar{height:3px;box-shadow:none}
.v-grok .cth-lim-mbar b{background:var(--cth-ink-900)}
/* Near the limit is amber in every vendor's style, a figure old from a failed ask is grey. */
.cth-lim-m.hot .cth-lim-mbar b,.cth-lim-m.hot .cth-lim-blocks i.fl{background:var(--cth-lemon);box-shadow:inset 0 0 0 1px var(--cth-ink-900)}
.cth-lim-m.stale .cth-lim-mbar b,.cth-lim-m.stale .cth-lim-blocks i.fl{background:var(--cth-ink-500)}
.cth-lim-skl{display:block;height:9px}
.cth-lim-note{padding:0 14px 8px;font-size:11.5px;line-height:1.4;color:var(--cth-ink-700)}
.cth-lim-why{display:block;margin-top:4px;font-size:12px;line-height:17px;color:var(--cth-ink-700)}
.cth-lim-why.small{font-size:11px;color:var(--cth-ink-500)}
.cth-lim-det{display:flex;flex-wrap:wrap;gap:2px 12px;margin-top:7px;padding-top:7px;border-top:1px solid var(--cth-ink-100);font-size:11.5px;line-height:17px;color:var(--cth-ink-700)}
.cth-lim-tag{display:inline-flex;align-items:center;height:18px;padding:0 6px;font-size:10.5px;font-weight:500;white-space:nowrap}
.cth-lim-tag.muted{background:var(--cth-cream-200);color:var(--cth-ink-500)}
.cth-lim-row[aria-expanded=true] .cth-lim-tag.muted{background:var(--cth-paper-100)}
.cth-lim-tag.warn{background:var(--cth-lemon-light);color:var(--cth-ink-900);box-shadow:inset 0 0 0 1px var(--cth-lemon)}
.cth-lim-quiet{display:block;padding:10px 14px;border-top:1px solid var(--cth-ink-100)}
.cth-lim-quiet.first{border-top:0}
.cth-lim-quiet.first .cth-lim-mk{color:var(--cth-ink-500)}
.cth-lim-foot{padding:8px 14px;font-size:11px;line-height:1.45;color:var(--cth-ink-500);border-top:1px solid var(--cth-ink-100)}
.cth-lim-fold{border-top:1px solid var(--cth-ink-300);background:var(--cth-cream-50);flex:none}
.cth-lim-fb{display:flex;align-items:center;gap:8px;width:100%;height:36px;padding:0 14px;border:0;background:transparent;font:600 11.5px var(--cth-font-ui);color:var(--cth-ink-700);cursor:pointer;text-align:start}
.cth-lim-fb:focus-visible{outline:2px solid var(--cth-ink-900);outline-offset:-2px}
.cth-lim-fb .v{margin-inline-start:auto;font-weight:500;color:var(--cth-ink-500)}
.cth-lim-fs{display:grid;gap:8px;padding:0 14px 12px}
.cth-lim-frow{display:grid;grid-template-columns:62px minmax(0,1fr);align-items:center;gap:8px;font-size:11.5px;color:var(--cth-ink-500)}
.cth-lim-seg{display:inline-flex;flex-wrap:wrap;gap:2px;padding:2px;background:var(--cth-cream-200);width:max-content;max-width:100%}
.cth-lim-seg button{height:26px;padding:0 9px;border:0;background:transparent;font:11px var(--cth-font-ui);color:var(--cth-ink-500);cursor:pointer}
.cth-lim-seg button.on{background:var(--cth-paper-100);color:var(--cth-ink-900);font-weight:600;box-shadow:inset 0 0 0 1px var(--cth-ink-300)}
.cth-lim-pills{display:flex;flex-wrap:wrap;gap:4px}
.cth-lim-pill{display:inline-flex;align-items:center;gap:5px;height:28px;padding:0 8px;border:1px solid var(--cth-ink-300);background:transparent;font:11px var(--cth-font-ui);color:var(--cth-ink-500);cursor:pointer}
.cth-lim-pill.on{background:var(--cth-paper-100);color:var(--cth-ink-900);border-color:var(--cth-ink-500);font-weight:500}
.cth-lim-pill:disabled{opacity:.5;cursor:default}
.cth-lim-unit{padding:0 14px 8px;font-size:11px;line-height:15px;color:var(--cth-ink-500)}
@media (prefers-reduced-motion:reduce){.cth-lim-panel,.cth-lim-sk,.cth-lim-scan:after{animation:none}.cth-lim-scan{display:none}}
`;

if (typeof document !== 'undefined' && !document.getElementById('cth-limits-style')) {
  const style = document.createElement('style');
  style.id = 'cth-limits-style';
  style.textContent = LIMITS_CSS;
  document.head.appendChild(style);
}
