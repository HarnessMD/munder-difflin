/**
 * Tasks, Ask me and the board stop growing forever (v0.4.9 W-A): the pure
 * decisions. main/taskHygiene.ts runs them on boot and then hourly; the PRO
 * Tasks screen, the Inbox and the task sheet run the same rules to draw the
 * Stale chip and the "still open" reminder, so the screen and the sweep can
 * never disagree about a card. Every rule takes `now` so a test can pin each
 * threshold at its boundary.
 *
 * What the rules are for: the ledger and the board are SHARED files that every
 * agent reads on wake, so their size is paid dozens of times a day. The session
 * auto compact at 35% is untouched; these caps only make that trip later.
 *
 *   - A done card archives `doneArchiveDays` after it was done. The ledger
 *     carries no done timestamp of its own (the god writes cards by hand), so
 *     the sweep honours `doneAt` or `completedAt` when either exists and
 *     otherwise stamps `doneAt` the first time it sees the card done; the
 *     clock starts at that sighting, never earlier.
 *   - An untouched todo or blocked card is stale at `staleFlagDays` and
 *     archives at `staleArchiveDays` with a note saying why. "Touched" is the
 *     newest timestamp the card carries: created, updated, completed, and
 *     every ask, answer and dismissal on it.
 *   - A card with an OPEN question is never stale and never archived: the
 *     human owes it an answer, and past `askNagDays` it nags instead.
 *   - A doing card is live work and is left alone.
 *   - The board summarises past `boardTokenCap` tokens. Tokens are estimated
 *     as characters divided by four (see estimateTokens). The ask fires ONCE
 *     per crossing: not again until the board is back under the cap and
 *     crosses it again.
 */

export interface TaskHygieneConfig {
  /** Days a done card stays on the live ledger before it archives. */
  doneArchiveDays: number;
  /** Days without a touch before a todo or blocked card shows Stale. */
  staleFlagDays: number;
  /** Days without a touch before a todo or blocked card archives. */
  staleArchiveDays: number;
  /** Days an unanswered question waits before the card says so. */
  askNagDays: number;
  /** Estimated tokens past which the board is condensed. */
  boardTokenCap: number;
}

export type TaskHygieneKey = keyof TaskHygieneConfig;

export const TASK_HYGIENE_KEYS: readonly TaskHygieneKey[] = [
  'doneArchiveDays', 'staleFlagDays', 'staleArchiveDays', 'askNagDays', 'boardTokenCap'
];

/** The founder's defaults (plan Part 6 W-A). Every one is a Settings row.
 *  boardTokenCap was 6000 until 0.4.11; the founder raised it on 6 Sep 2026
 *  ("6000 is too low, make it 50000"): a board that condenses every few
 *  days loses the thread of the work. */
export const TASK_HYGIENE_DEFAULTS: Readonly<TaskHygieneConfig> = Object.freeze({
  doneArchiveDays: 2,
  staleFlagDays: 14,
  staleArchiveDays: 21,
  askNagDays: 7,
  boardTokenCap: 50000
});

export const DAY_MS = 86_400_000;

/** Every threshold filled from the defaults. A missing, non-numeric, zero or
 *  negative value reads as the default: the sweep must never run with a
 *  threshold of NaN, and a person typing 0 has not asked to archive everything. */
export function resolveTaskHygiene(partial?: Partial<TaskHygieneConfig> | null): TaskHygieneConfig {
  const out: TaskHygieneConfig = { ...TASK_HYGIENE_DEFAULTS };
  if (!partial || typeof partial !== 'object') return out;
  for (const key of TASK_HYGIENE_KEYS) {
    const v = partial[key];
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) out[key] = v;
  }
  return out;
}

// ─── Cards ──────────────────────────────────────────────────────────────────

/** The fields the rules read. Structural and every one `unknown`, so a raw
 *  hand-written ledger entry in main and the renderer's parsed HiveTask both
 *  fit without a cast. The god also writes snake_case stamps on some cards
 *  (`created_at`, `updated_at`); both spellings count as a touch. */
export interface HygieneCard {
  id?: unknown;
  status?: unknown;
  createdAt?: unknown;
  created_at?: unknown;
  updatedAt?: unknown;
  updated_at?: unknown;
  completedAt?: unknown;
  doneAt?: unknown;
  humanQA?: unknown;
}

export interface HygieneAsk {
  q: string;
  a?: string;
  askedAt?: string;
  answeredAt?: string;
  dismissedAt?: string;
}

export type ArchiveReason = 'done' | 'stale';

export function isHygieneCard(v: unknown): v is HygieneCard {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

export function cardId(card: HygieneCard): string | null {
  return typeof card.id === 'string' && card.id ? card.id : null;
}

/** An ISO string or an epoch in ms → ms, else null. Nothing is invented. */
export function toMs(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string' || !v) return null;
  const t = Date.parse(v);
  return Number.isFinite(t) ? t : null;
}

function asks(card: HygieneCard): HygieneAsk[] {
  if (!Array.isArray(card.humanQA)) return [];
  return card.humanQA.filter((e): e is HygieneAsk => !!e && typeof e === 'object' && typeof (e as { q?: unknown }).q === 'string');
}

/** The card's open question: the newest entry with no answer and no
 *  dismissal. The same rule as the renderer's openQuestion (TasksKanban). */
export function openAsk(card: HygieneCard): HygieneAsk | null {
  const list = asks(card);
  for (let i = list.length - 1; i >= 0; i--) {
    const e = list[i];
    if (!e.a && !e.dismissedAt) return e;
  }
  return null;
}

/** The newest timestamp the card carries, or null when it carries none (a
 *  card with no dates cannot be judged and is left alone). */
export function lastTouchedAt(card: HygieneCard): number | null {
  const stamps: (number | null)[] = [
    toMs(card.createdAt), toMs(card.created_at),
    toMs(card.updatedAt), toMs(card.updated_at),
    toMs(card.completedAt), toMs(card.doneAt)
  ];
  for (const e of asks(card)) stamps.push(toMs(e.askedAt), toMs(e.answeredAt), toMs(e.dismissedAt));
  const known = stamps.filter((t): t is number => t !== null);
  return known.length ? Math.max(...known) : null;
}

/** When the card was done, as the ledger records it: the sweep's own stamp
 *  first, then a completedAt the god wrote. Null means the clock has not
 *  started and the sweep should stamp it. */
export function doneAt(card: HygieneCard): number | null {
  return toMs(card.doneAt) ?? toMs(card.completedAt);
}

/** Whole days between a stamp and now, never negative. */
export function ageDays(sinceMs: number, now: number): number {
  return Math.max(0, Math.floor((now - sinceMs) / DAY_MS));
}

function isLive(card: HygieneCard): boolean {
  return card.status === 'todo' || card.status === 'blocked';
}

/** Days a live card has gone untouched, or null when it is not stale: not a
 *  todo or blocked card, touched within `staleFlagDays`, undated, or waiting
 *  on the human (an open ask nags instead). */
export function staleDays(card: HygieneCard, cfg: TaskHygieneConfig, now: number): number | null {
  if (!isLive(card) || openAsk(card)) return null;
  const touched = lastTouchedAt(card);
  if (touched === null) return null;
  return now - touched >= cfg.staleFlagDays * DAY_MS ? ageDays(touched, now) : null;
}

export function isStale(card: HygieneCard, cfg: TaskHygieneConfig, now: number): boolean {
  return staleDays(card, cfg, now) !== null;
}

/** Days an open question has waited once it is past `askNagDays`, else null.
 *  An undated ask cannot nag: there is nothing honest to say about it. */
export function askNagDays(card: HygieneCard, cfg: TaskHygieneConfig, now: number): number | null {
  const ask = openAsk(card);
  if (!ask) return null;
  const at = toMs(ask.askedAt);
  if (at === null) return null;
  return now - at >= cfg.askNagDays * DAY_MS ? ageDays(at, now) : null;
}

/** Why the card is due to leave the live ledger now, or null to keep it. */
export function archiveReasonFor(card: HygieneCard, cfg: TaskHygieneConfig, now: number): ArchiveReason | null {
  if (card.status === 'done') {
    const at = doneAt(card);
    return at !== null && now - at >= cfg.doneArchiveDays * DAY_MS ? 'done' : null;
  }
  if (!isLive(card) || openAsk(card)) return null;
  const touched = lastTouchedAt(card);
  return touched !== null && now - touched >= cfg.staleArchiveDays * DAY_MS ? 'stale' : null;
}

/** The note written on the archived card so anyone reading the file, the god
 *  included, sees why it left. Plain English on disk; the screen renders the
 *  reason through i18n and does not show this string. */
export function archiveNote(reason: ArchiveReason, days: number): string {
  return reason === 'done'
    ? `Done for ${days} day${days === 1 ? '' : 's'}, archived by the hourly sweep.`
    : `Untouched for ${days} day${days === 1 ? '' : 's'}, archived by the hourly sweep.`;
}

export interface SweepPlan {
  /** Cards leaving the live ledger, with why. */
  archive: { id: string; reason: ArchiveReason; note: string }[];
  /** Done cards with no done timestamp: stamp `doneAt` now so the clock starts. */
  stampDone: string[];
  /** Live cards past the stale flag (not archived yet). */
  stale: string[];
  /** Open questions past the nag threshold, with how long they have waited. */
  nags: { id: string; days: number }[];
}

/** One pass over the live ledger. Pure and idempotent: the same cards at the
 *  same `now` give the same plan, and a card without an id is left where it
 *  is because there is no key to move it by. */
export function planSweep(cards: HygieneCard[], cfg: TaskHygieneConfig, now: number): SweepPlan {
  const plan: SweepPlan = { archive: [], stampDone: [], stale: [], nags: [] };
  for (const card of cards) {
    const id = cardId(card);
    if (!id) continue;
    const reason = archiveReasonFor(card, cfg, now);
    if (reason) {
      const since = reason === 'done' ? doneAt(card)! : lastTouchedAt(card)!;
      plan.archive.push({ id, reason, note: archiveNote(reason, ageDays(since, now)) });
      continue;
    }
    if (card.status === 'done' && doneAt(card) === null) plan.stampDone.push(id);
    if (isStale(card, cfg, now)) plan.stale.push(id);
    const nag = askNagDays(card, cfg, now);
    if (nag !== null) plan.nags.push({ id, days: nag });
  }
  return plan;
}

/** Apply a plan to the two ledgers as raw arrays: the live one loses the
 *  archived cards and gains `doneAt` stamps, the archive gains the moved cards
 *  (newest first, de-duplicated by id, so a re-run can neither double a card
 *  nor drop one). Every other field on every card passes through untouched:
 *  the god writes fields the app never modelled, and this must not lose them. */
export function applySweepPlan(
  live: unknown[],
  archive: unknown[],
  plan: Pick<SweepPlan, 'archive' | 'stampDone'>,
  nowIso: string
): { live: unknown[]; archive: unknown[]; archived: number; stamped: number } {
  const reasons = new Map(plan.archive.map((a) => [a.id, a]));
  const stamps = new Set(plan.stampDone);
  const keep: unknown[] = [];
  const moved: Record<string, unknown>[] = [];
  let stamped = 0;
  for (const card of live) {
    const id = isHygieneCard(card) ? cardId(card) : null;
    const due = id ? reasons.get(id) : undefined;
    if (due) {
      moved.push({ ...(card as Record<string, unknown>), archivedAt: nowIso, archiveReason: due.reason, archiveNote: due.note });
      continue;
    }
    if (id && stamps.has(id)) {
      keep.push({ ...(card as Record<string, unknown>), doneAt: nowIso });
      stamped++;
      continue;
    }
    keep.push(card);
  }
  const movedIds = new Set(moved.map((c) => cardId(c)));
  const rest = archive.filter((c) => !(isHygieneCard(c) && movedIds.has(cardId(c))));
  return { live: keep, archive: [...moved, ...rest], archived: moved.length, stamped };
}

// ─── Board ──────────────────────────────────────────────────────────────────

/** Tokens are ESTIMATED as characters divided by four, rounded up. That is the
 *  usual English prose ratio for these tokenizers and it errs high on markdown
 *  (paths and punctuation tokenize denser), so the cap trips a little early
 *  rather than late. No tokenizer is loaded for a file main reads hourly. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** The latch: whether an ask is outstanding for the current crossing. */
export interface BoardAskState {
  asked: boolean;
}

export interface BoardDecision {
  tokens: number;
  /** Past the cap right now. */
  over: boolean;
  /** Send the one message this pass. */
  ask: boolean;
  /** The latch to persist: set while over, cleared the moment it is under. */
  next: BoardAskState;
}

/** Ask once per crossing. Over the cap with no ask outstanding: ask, and
 *  latch. Still over: stay quiet. Back under: clear the latch, so the next
 *  crossing asks again. */
export function boardDecision(text: string, cfg: TaskHygieneConfig, state: BoardAskState): BoardDecision {
  const tokens = estimateTokens(text);
  const over = tokens > cfg.boardTokenCap;
  return { tokens, over, ask: over && !state.asked, next: { asked: over } };
}

/** The block appended to board-archive.md before the god is asked: a dated
 *  heading and the board's full text, so whatever he does next, nothing is
 *  lost. */
export function boardArchiveEntry(text: string, now: number, tokens: number): string {
  const when = new Date(now).toISOString();
  return `\n\n## Archived ${when} (about ${tokens} tokens)\n\n${text.trim()}\n`;
}

/** The one inbox message. It says where the full copy went and what to keep. */
export function boardAskMessage(tokens: number, cap: number, archivePath: string): { subject: string; body: string } {
  return {
    subject: `Board over its size cap: condense board.md (about ${tokens} tokens, cap ${cap})`,
    body: [
      `The shared board is about ${tokens} tokens against a cap of ${cap}. Every agent reads it on wake, so its size is paid on every session.`,
      `Its full text as it stands right now was appended to ${archivePath} under a dated heading, so nothing is lost whatever you do next.`,
      'Please condense the history in board.md: fold finished threads into short summaries, drop superseded plans, and keep the Decisions section verbatim.',
      'This is sent once per crossing. It will not repeat until the board is back under the cap and grows past it again.'
    ].join('\n')
  };
}
