/**
 * USAGE LIMITS, what the chip and the panel draw (limits-bar; Pam's preview
 * hive/shared/eng/limits-bar/previews/limits-bar-v2.html, the founder's go of
 * 30 Oct 2026). Pure: the figures come from `telemetry:usageLimits`
 * (shared/usageLimits.ts) and nothing here makes one up.
 */
import { LIMIT_ENGINES, windowGroups, type EngineLimits, type LimitEngine, type LimitWindow } from '@shared/usageLimits';

/** Amber from here. Never red: a full window is waiting for its reset, not broken. */
export const LIMIT_HOT = 80;

/** The figures of one meter, or of one engine on the chip. */
export interface Meter { usedPercent: number; resetsAt: number | null }

/** One window's meter, and what to call it: `name` only on a window of another length. */
export interface WindowMeter extends Meter { kind: LimitWindow['kind']; name: string | null }

/** One block of an engine's row: Antigravity has one per model group, the others one with no name. Only the windows the vendor reports: a missing one is not a meter. */
export interface MeterGroup { name: string | null; meters: WindowMeter[] }

/** A window whose reset has passed since the reading says nothing true about now. */
export function live(w: LimitWindow, now: number): boolean {
  return w.resetsAt === null || w.resetsAt > now;
}

export function groupsOf(e: EngineLimits): MeterGroup[] {
  return windowGroups(e).map((g) => ({
    name: g.group,
    meters: g.windows.map((w) => ({ kind: w.kind, name: w.name ?? null, usedPercent: w.usedPercent, resetsAt: w.resetsAt }))
  }));
}

/** The window that stops this engine first: the fullest live one; on a tie, the one that resets soonest. */
export function fullestWindow(e: EngineLimits, now: number): LimitWindow | null {
  if (e.state !== 'ok') return null;
  const soon = (w: LimitWindow) => w.resetsAt ?? Infinity;
  return [...e.windows].filter((w) => live(w, now)).sort((a, b) => b.usedPercent - a.usedPercent || soon(a) - soon(b))[0] ?? null;
}

/** The engine closest to a limit, with that window. An engine whose last ask failed is left out: its figure is old. */
export function closestEngine(list: EngineLimits[], now: number): { e: EngineLimits; w: LimitWindow } | null {
  let best: { e: EngineLimits; w: LimitWindow } | null = null;
  for (const e of list) {
    const w = e.failed ? null : fullestWindow(e, now);
    if (w && (!best || w.usedPercent > best.w.usedPercent || (w.usedPercent === best.w.usedPercent && (w.resetsAt ?? Infinity) < (best.w.resetsAt ?? Infinity)))) best = { e, w };
  }
  return best;
}

/** The status chip on an engine's row: the limit reached at 100, near it from 80, else none. */
export function statusOf(e: EngineLimits, now: number): 'reached' | 'near' | null {
  const ws = e.windows.filter((w) => live(w, now));
  if (ws.some((w) => wholePct(w.usedPercent) >= 100)) return 'reached';
  if (ws.some((w) => isHot(w.usedPercent))) return 'near';
  return null;
}

/** Whole minutes from `from` to `to`, at least 1. */
export function minutesBetween(from: number, to: number): number {
  return Math.max(1, Math.round((to - from) / 60_000));
}

/** Percent as the screen counts it: whole. Above 0 never reads 0 and under 100 never reads 100,
 *  so a little use still shows and a window reads full only when the engine says it is. */
export function wholePct(n: number): number {
  if (n > 0 && n < 1) return 1;
  if (n > 99 && n < 100) return 99;
  return Math.round(n);
}

/** Percent as the screen writes it: whole, and "<1" for a use above 0 and under 1. */
export function pctText(n: number): string {
  return n > 0 && n < 1 ? '<1' : String(wholePct(n));
}

/** What is left of a window, the small figure under the Codex and Antigravity bars. Arithmetic on the used figure, never a figure of its own. */
export function leftPercent(used: number): number {
  return Math.max(0, 100 - used);
}

/** Codex's bar is this many blocks long. */
export const CODEX_BLOCKS = 20;

/** Codex's filled blocks, of what is used, like every other bar (founder, 3 Nov 2026): any use fills at least one,
 *  and a window short of full never fills them all. */
export function blocksUsed(used: number): number {
  if (used <= 0) return 0;
  if (wholePct(used) >= 100) return CODEX_BLOCKS;
  return Math.min(CODEX_BLOCKS - 1, Math.max(1, Math.round(used / (100 / CODEX_BLOCKS))));
}

/** From this many engines on the chip, the reset time goes after the last of them, not beside its own engine
 *  (founder, 3 Nov 2026: in mid row it reads as the next engine's). */
export const TIME_AT_END_FROM = 4;

export function timeAtEnd(cells: number): boolean {
  return cells >= TIME_AT_END_FROM;
}

/** Amber by the figure the screen shows, so 79.6 drawn as 80 is amber too. */
export function isHot(n: number): boolean {
  return wholePct(n) >= LIMIT_HOT;
}

/** A plan as the panel names it: "Claude Max" and "ChatGPT Plus" from the engine's max and plus, Grok Build's tier as given. */
export function planName(e: EngineLimits): string | null {
  if (!e.plan) return null;
  const word = e.plan.charAt(0).toUpperCase() + e.plan.slice(1);
  if (e.engine === 'claude') return `Claude ${word}`;
  if (e.engine === 'codex') return `ChatGPT ${word}`;
  return e.plan;
}

/** The panel's order, closest first, set when it opens: engines already placed stay put, so a fresh read never moves a row under the pointer; one that gains figures joins below them. */
export function keepOrder(kept: readonly LimitEngine[], list: EngineLimits[], now: number): LimitEngine[] {
  const rank = (e: EngineLimits) => fullestWindow(e, now)?.usedPercent ?? -1;
  const fresh = list.filter((e) => e.state === 'ok' && !kept.includes(e.engine)).sort((a, b) => rank(b) - rank(a));
  return [...kept, ...fresh.map((e) => e.engine)];
}

/** Grok Build is read from its log: seen only while it runs, one weekly credit figure and no 5 hour window. */
export function readWhileRunning(e: EngineLimits): boolean {
  return e.source === 'grok-log';
}

/** A figure older than this says so on its own row. */
export const AGE_TAG_MINUTES = 15;

/** The panel's one freshness line: the age of the oldest figure, leaving out the rows that carry their own age. `most` when any were left out. */
export function freshness(list: EngineLimits[], now: number): { minutes: number; most: boolean } | null {
  const ok = list.filter((e) => e.state === 'ok');
  const ages = ok
    .filter((e) => !e.failed && !readWhileRunning(e) && e.asOf !== null && minutesBetween(e.asOf, now) <= AGE_TAG_MINUTES)
    .map((e) => minutesBetween(e.asOf as number, now));
  return ages.length ? { minutes: Math.max(...ages), most: ages.length < ok.length } : null;
}

/** A bar's fill. Any use above 0 shows at least 2 px, so 1% is not an empty track. */
export function fillWidth(p: number): string {
  return p > 0 ? `max(2px,${Math.min(100, p)}%)` : '0';
}

/* ---- What the person picked (this window's browser storage; per viewer) ---------------------- */

export type LimitsLook = 'all' | 'closest' | 'icon';

export interface LimitsPrefs {
  engines: LimitEngine[];
  look: LimitsLook;
}

export const DEFAULT_LIMITS_PREFS: LimitsPrefs = { engines: ['claude', 'codex', 'antigravity', 'grok'], look: 'all' };

const PREFS_KEY = 'cth.limits.prefs';

export function readLimitsPrefs(): LimitsPrefs {
  try {
    const raw = JSON.parse(window.localStorage.getItem(PREFS_KEY) ?? 'null') as (Partial<Omit<LimitsPrefs, 'look'>> & { look?: unknown }) | null;
    if (!raw || typeof raw !== 'object') return DEFAULT_LIMITS_PREFS;
    // A save from the first version's looks ("meters", "percent") opens as All engines, and it was made before Grok Build could be picked.
    const older = raw.look === 'meters' || raw.look === 'percent';
    const picked = Array.isArray(raw.engines) ? raw.engines : DEFAULT_LIMITS_PREFS.engines;
    const engines = LIMIT_ENGINES.filter((e) => picked.includes(e) || (older && e === 'grok'));
    const look = raw.look === 'closest' || raw.look === 'icon' ? raw.look : 'all';
    return { engines, look };
  } catch {
    return DEFAULT_LIMITS_PREFS;
  }
}

export function writeLimitsPrefs(p: LimitsPrefs): void {
  try { window.localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch { /* private mode: kept for this window only */ }
}
