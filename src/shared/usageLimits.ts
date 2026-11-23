/**
 * USAGE LIMITS (founder ask, 26 Oct 2026; hive/shared/eng/limits-bar/DATA.md).
 *
 * Each engine's plan limits, as the engine itself reports them: Claude Code on
 * its status line, Codex in its session file and from `codex app-server`,
 * Antigravity from `agy -p "/usage"`, Grok Build in its own log. OpenCode
 * reports none. No engine's credential is ever read by the app: each engine
 * reads its own login in its own process, and only the fields below are kept.
 * Never an account id, an email or a token.
 *
 * No number is guessed: an engine that gave none is `no-reading`,
 * `not-available` or `not-installed`, and a window whose reset time has passed
 * since the reading keeps its old number for the screen to show as reset.
 *
 * Pure: no fs, no electron. Main and the office daemon parse with these.
 */

export type LimitEngine = 'claude' | 'codex' | 'antigravity' | 'grok' | 'opencode';

export const LIMIT_ENGINES: readonly LimitEngine[] = ['claude', 'codex', 'antigravity', 'grok', 'opencode'];

/** The 5 hour window, the weekly one, or one of any other length, drawn by its own `name`. */
export type LimitWindowKind = '5h' | 'weekly' | 'other';

export interface LimitWindow {
  kind: LimitWindowKind;
  /** Percent of the window used, as the engine gave it (0 to 100). */
  usedPercent: number;
  /** When the window resets, epoch ms, or null when the engine did not say. */
  resetsAt: number | null;
  /** Antigravity's model group ("Gemini Models"); absent for the others. */
  group?: string;
  /** A window of another length: what the vendor calls it ("30 day", "monthly"). Absent on the two named above. */
  name?: string;
}

/**
 *  - ok: windows read.
 *  - no-reading: installed, but nothing read since the app started (Claude Code before an agent's first reply).
 *  - not-available: the engine reports no limits (OpenCode; Claude Code or Codex signed in with an
 *    API key; a Grok Build log the app no longer recognises).
 *  - not-installed: the engine is not on this computer or in this office.
 */
export type EngineLimitsState = 'ok' | 'no-reading' | 'not-available' | 'not-installed';

export type LimitSource = 'status-line' | 'session-file' | 'codex-app-server' | 'agy-usage' | 'grok-log';

export interface EngineLimits {
  engine: LimitEngine;
  state: EngineLimitsState;
  windows: LimitWindow[];
  /** When the reading was taken, epoch ms; null without one. */
  asOf: number | null;
  /** The plan as the engine words it (Claude Code "max", Codex "plus", Grok Build "SuperGrok"), or null. */
  plan: string | null;
  /** The engine says this computer's or office's sign in is an API key, which has no plan. */
  apiKey: boolean;
  /** The agent whose run gave the reading, or null when the app asked the engine itself. With
   *  agents signed in to different accounts the newest reading wins; this says whose it is. */
  fromAgent: string | null;
  source: LimitSource | null;
  /** The app's last ask of this engine (a fresh read) came back with nothing it could use. Any older
   *  reading is still the one above, with its own time; the screen says the ask failed. */
  failed: boolean;
}

/** What `telemetry:usageLimits` answers. */
export interface UsageLimitsSnapshot {
  engines: EngineLimits[];
  /** When this answer was made, epoch ms. */
  readAt: number;
}

export interface UsageLimitsReadOptions {
  /** Ask Codex and Antigravity again when their reading is older than the cooldown. */
  fresh?: boolean;
}

/**
 * Windows no screen shows, whatever the engine reports. The one place: a row
 * comes out of the panel, the chip and md-limits with one line
 * here, and goes back by taking the line out. Empty: every window a vendor
 * sends is drawn.
 */
const HIDDEN_WINDOWS: ReadonlyArray<{ engine: LimitEngine; kind: LimitWindowKind }> = [];

/** An engine as every screen reads it: only the windows to draw. One left with none has nothing to say, so it says not available, never an empty row. */
export function engineView(e: EngineLimits, hidden: ReadonlyArray<{ engine: LimitEngine; kind: LimitWindowKind }> = HIDDEN_WINDOWS): EngineLimits {
  const windows = e.windows.filter((w) => !hidden.some((h) => h.engine === e.engine && h.kind === w.kind));
  return { ...e, windows, state: e.state === 'ok' && !windows.length ? 'not-available' : e.state };
}

/** The one view: md-limits, the roster's line, the chip and the panel all read a snapshot through this. */
export function limitsView(snap: UsageLimitsSnapshot): UsageLimitsSnapshot {
  return { ...snap, engines: snap.engines.map((e) => engineView(e)) };
}

/** A window's name in words, for those that read English (md-limits, the roster). */
export function limitWindowName(w: LimitWindow): string {
  return w.kind === '5h' ? '5 hour' : w.kind === 'weekly' ? 'weekly' : w.name ?? 'other';
}

/** The windows of an engine in reading order, Antigravity's by model group: 5 hour, weekly, then any other. */
export function windowGroups(e: EngineLimits): Array<{ group: string | null; windows: LimitWindow[] }> {
  const rank = (w: LimitWindow): number => (w.kind === '5h' ? 0 : w.kind === 'weekly' ? 1 : 2);
  const out: Array<{ group: string | null; windows: LimitWindow[] }> = [];
  for (const w of e.windows) {
    const g = w.group ?? null;
    const at = out.find((x) => x.group === g);
    if (at) at.windows.push(w); else out.push({ group: g, windows: [w] });
  }
  for (const g of out) g.windows.sort((a, b) => rank(a) - rank(b));
  return out;
}

/** A vendor's own word for a window, as text a screen can draw: nothing else is carried. */
const WINDOW_NAME = /^[A-Za-z0-9][A-Za-z0-9 _-]{0,31}$/;
function windowWord(value: unknown): string | null {
  return typeof value === 'string' && WINDOW_NAME.test(value) ? value.replace(/_/g, ' ') : null;
}

/** A length in minutes as a window's name: "30 day", "12 hour". */
function lengthName(minutes: number): string {
  if (minutes % 1440 === 0) return `${minutes / 1440} day`;
  if (minutes % 60 === 0) return `${minutes / 60} hour`;
  return `${minutes} minute`;
}

function percent(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

/** Epoch seconds to ms; null for anything that is not a time. */
function secondsToMs(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value * 1000) : null;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

/** Claude Code's status line `rate_limits`: five_hour and seven_day, each { used_percentage, resets_at } and each
 *  present only while its window is open; any other window it sends in that shape, by its own name. spend_limit is a gateway's budget, not a window. */
export function parseClaudeRateLimits(raw: unknown): LimitWindow[] {
  const r = record(raw);
  if (!r) return [];
  const out: LimitWindow[] = [];
  for (const [key, kind] of [['five_hour', '5h'], ['seven_day', 'weekly']] as const) {
    const w = record(r[key]);
    const used = percent(w?.used_percentage);
    if (!w || used === null) continue;
    out.push({ kind, usedPercent: used, resetsAt: secondsToMs(w.resets_at) });
  }
  for (const key of Object.keys(r)) {
    if (key === 'five_hour' || key === 'seven_day' || key === 'spend_limit') continue;
    const w = record(r[key]);
    const used = percent(w?.used_percentage);
    const name = windowWord(key);
    if (!w || used === null || !name) continue;
    out.push({ kind: 'other', name, usedPercent: used, resetsAt: secondsToMs(w.resets_at) });
  }
  return out;
}

const CODEX_WINDOW_KIND: Readonly<Record<number, LimitWindowKind>> = { 300: '5h', 10080: 'weekly' };

/** Codex's rate limits, in either spelling: the session file's (primary.used_percent,
 *  window_minutes, resets_at, plan_type) or app-server's (usedPercent,
 *  windowDurationMins, resetsAt, planType). Null when `raw` is not one. */
export function parseCodexRateLimits(raw: unknown): { windows: LimitWindow[]; plan: string | null } | null {
  const r = record(raw);
  if (!r) return null;
  const windows: LimitWindow[] = [];
  for (const key of ['primary', 'secondary']) {
    const w = record(r[key]);
    if (!w) continue;
    const used = percent(w.used_percent ?? w.usedPercent);
    const minutes = w.window_minutes ?? w.windowDurationMins;
    if (used === null || typeof minutes !== 'number' || !Number.isInteger(minutes) || minutes <= 0) continue;
    const kind = CODEX_WINDOW_KIND[minutes];
    windows.push({ kind: kind ?? 'other', ...(kind ? {} : { name: lengthName(minutes) }), usedPercent: used, resetsAt: secondsToMs(w.resets_at ?? w.resetsAt) });
  }
  const plan = r.plan_type ?? r.planType;
  return { windows, plan: typeof plan === 'string' && plan ? plan : null };
}

/** The newest token_count row's rate limits in a Codex session file's tail, with its time. */
export function parseCodexRateLimitsTail(text: string): { windows: LimitWindow[]; plan: string | null; ts: number } | null {
  const lines = text.split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    // A cheap test first: most rows are not token counts.
    if (!lines[i].includes('"rate_limits"')) continue;
    let row: unknown;
    try { row = JSON.parse(lines[i]); } catch { continue; }
    const event = record(row);
    const payload = record(event?.payload);
    if (event?.type !== 'event_msg' || payload?.type !== 'token_count') continue;
    const parsed = parseCodexRateLimits(payload.rate_limits);
    const ts = typeof event.timestamp === 'string' ? Date.parse(event.timestamp) : NaN;
    if (!parsed || !Number.isFinite(ts)) continue;
    return { ...parsed, ts };
  }
  return null;
}

/** The sign in an engine names: only these two facts are kept of what it printed. */
export interface LimitAccount {
  plan: string | null;
  apiKey: boolean;
}

/** `claude auth status --json`. It also prints the email and the organisation: never kept. Null when `text` is not that. */
export function parseClaudeAccount(text: string): LimitAccount | null {
  let doc: unknown;
  try { doc = JSON.parse(text); } catch { return null; }
  const d = record(doc);
  if (!d || typeof d.loggedIn !== 'boolean') return null;
  const plan = d.subscriptionType;
  return { plan: typeof plan === 'string' && plan ? plan : null, apiKey: d.authMethod === 'api_key' };
}

/** `codex app-server` account/read's `account`: { type: "apiKey" } or { type: "chatgpt", email, planType }. The email is never kept. */
export function parseCodexAccount(raw: unknown): LimitAccount | null {
  const a = record(raw);
  if (!a || typeof a.type !== 'string') return null;
  const plan = a.planType;
  return { plan: typeof plan === 'string' && plan ? plan : null, apiKey: a.type === 'apiKey' };
}

/** `opencode auth list`: a line per provider, ending in its kind ("OpenAI api"). An API key when every one is. Null with none listed. */
export function parseOpencodeAccount(text: string): LimitAccount | null {
  // The colours and the box it draws carry no meaning.
  const plain = text.replace(/\u001b\[[0-9;]*m/g, '');
  const kinds = plain.split(/\r?\n/).filter((l) => l.includes('\u25cf')).map((l) => l.trim().split(/\s+/).pop());
  return kinds.length ? { plan: null, apiKey: kinds.every((k) => k === 'api') } : null;
}

const GROK_CREDITS_ROW = 'billing: fetched credits config';

/** Grok Build's own log (~/.grok/logs/unified.jsonl), its newest credits row: one weekly credit percent, its
 *  period's end, and the tier by name. It is not a documented interface, so anything but that shape is
 *  'unrecognised', and the engine then shows as not available. A row with no percent yet (a period
 *  just begun) says nothing; an older row is looked for. Null when no such row is in `text`. */
export function parseGrokCreditsTail(text: string): { windows: LimitWindow[]; plan: string | null; ts: number } | 'unrecognised' | null {
  const lines = text.split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    // A cheap test first: most rows are not this one.
    if (!lines[i].includes(GROK_CREDITS_ROW)) continue;
    let row: unknown;
    try { row = JSON.parse(lines[i]); } catch { continue; }
    const event = record(row);
    if (event?.msg !== GROK_CREDITS_ROW) continue;
    const ctx = record(event.ctx);
    const config = record(ctx?.config);
    const period = record(config?.currentPeriod);
    const ts = typeof event.ts === 'string' ? Date.parse(event.ts) : NaN;
    const end = typeof period?.end === 'string' ? Date.parse(period.end) : NaN;
    const length = typeof period?.type === 'string' ? /^USAGE_PERIOD_TYPE_([A-Z_]{1,20})$/.exec(period.type)?.[1] : undefined;
    if (!length || !Number.isFinite(ts) || !Number.isFinite(end)) return 'unrecognised';
    if (config?.creditUsagePercent === undefined || config.creditUsagePercent === null) continue;
    const used = percent(config.creditUsagePercent);
    if (used === null) return 'unrecognised';
    const tier = ctx?.subscriptionTier;
    const shape = length === 'WEEKLY' ? { kind: 'weekly' as const } : { kind: 'other' as const, name: length.toLowerCase().replace(/_/g, ' ') };
    return { windows: [{ ...shape, usedPercent: used, resetsAt: end }], plan: typeof tier === 'string' && tier ? tier : null, ts };
  }
  return null;
}

/** Grok Build's ~/.grok/settings_cache.json: the tier's name, as Grok Build itself shows it. Nothing else of the file is kept. */
export function parseGrokSettingsTier(text: string): string | null {
  let tier: unknown;
  try {
    const doc = record(JSON.parse(text));
    tier = record(record(typeof doc?.payload === 'string' ? JSON.parse(doc.payload) : null)?.settings)?.subscription_tier_display;
  } catch { return null; }
  return typeof tier === 'string' && tier ? tier : null;
}

/** `agy -p "/usage" --output-format json`: command.data.groups[].buckets[] with
 *  window ("5h" or "weekly"), remaining_fraction and reset_time. Null when the
 *  answer is not that (an error, a sign in needed). */
export function parseAgyUsage(text: string): LimitWindow[] | null {
  let doc: unknown;
  try { doc = JSON.parse(text); } catch { return null; }
  const d = record(doc);
  if (!d || d.status !== 'SUCCESS') return null;
  const groups = record(record(d.command)?.data)?.groups;
  if (!Array.isArray(groups)) return null;
  const out: LimitWindow[] = [];
  for (const g of groups) {
    const group = record(g);
    if (!group || typeof group.name !== 'string' || !Array.isArray(group.buckets)) continue;
    for (const b of group.buckets) {
      const bucket = record(b);
      const kind = bucket?.window === '5h' ? '5h' : bucket?.window === 'weekly' ? 'weekly' : null;
      const name = kind ? null : windowWord(bucket?.window);
      const left = bucket?.remaining_fraction;
      if (!bucket || (!kind && !name) || typeof left !== 'number' || !Number.isFinite(left) || left < 0 || left > 1) continue;
      const reset = typeof bucket.reset_time === 'string' ? Date.parse(bucket.reset_time) : NaN;
      out.push({ kind: kind ?? 'other', ...(name ? { name } : {}), usedPercent: Math.round((1 - left) * 1000) / 10, resetsAt: Number.isFinite(reset) ? reset : null, group: group.name });
    }
  }
  return out;
}
