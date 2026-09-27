/**
 * Task times (0.5.3, founder on rc.4: "a date wise filter with today, this
 * week, this month and all time"). Main stamps the times on the same write
 * as the ticket keys, so there is something reliable to filter on:
 *   startedAt   the first move to doing, never overwritten
 *   doneAt      the move to done, never overwritten (a reopen keeps it)
 *   reopenedAt  a move out of done
 *   updatedAt   every write that changed the card
 * Old hand written spellings (completedAt, created_at) are read as fallbacks.
 * The window maths for the Tasks screen's date control lives here too.
 */

type Card = Record<string, unknown>;

const DOING = new Set(['doing', 'in-progress', 'in_progress', 'inprogress', 'active', 'wip']);
const DONE = new Set(['done', 'complete', 'completed', 'closed']);

const statusOf = (c: Card): string => (typeof c.status === 'string' ? c.status.trim().toLowerCase() : '');
const str = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined);
const isCard = (c: unknown): c is Card => !!c && typeof c === 'object' && !Array.isArray(c);

/** The fields that are not stamps: a change to any of these is a real edit. */
function body(c: Card): string {
  const { updatedAt: _u, updated_at: _uu, ...rest } = c;
  return JSON.stringify(rest);
}

/**
 * Stamp `next` against the cards as they were on disk (`prev`, matched by id
 * or alias). A card with no previous copy is new: it gets createdAt if it has
 * none, and the stamp for the status it was born in. Cards that did not change
 * are returned as the same object, so `changed` is exact.
 */
export function stampTaskTimes(prev: readonly unknown[] | undefined, next: readonly unknown[], now: string): { tasks: unknown[]; changed: boolean } {
  const before = new Map<string, Card>();
  for (const c of prev ?? []) {
    if (!isCard(c)) continue;
    if (str(c.id)) before.set(c.id as string, c);
    if (str(c.alias) && !before.has(c.alias as string)) before.set(c.alias as string, c);
  }
  let changed = false;
  const tasks = next.map((c) => {
    if (!isCard(c)) return c;
    const was = (str(c.id) && before.get(c.id as string)) || (str(c.alias) && before.get(c.alias as string)) || undefined;
    const out: Card = { ...c };
    const status = statusOf(c);
    const wasStatus = was ? statusOf(was) : '';
    // Fallbacks first: an old spelling becomes the stamp, never "now".
    if (!str(out.createdAt) && str(out.created_at)) out.createdAt = out.created_at;
    if (DONE.has(status) && !str(out.doneAt) && str(out.completedAt)) out.doneAt = out.completedAt;
    // Stamps written once are kept even when a writer dropped them.
    if (was) for (const k of ['createdAt', 'startedAt', 'doneAt'] as const) if (!str(out[k]) && str(was[k])) out[k] = was[k];
    if (!was && !str(out.createdAt)) out.createdAt = now;
    if (status !== wasStatus || !was) {
      if (DOING.has(status) && !str(out.startedAt)) out.startedAt = now;
      if (DONE.has(status) && !str(out.doneAt)) out.doneAt = now;
      if (was && DONE.has(wasStatus) && !DONE.has(status)) out.reopenedAt = now;
    }
    if (!was || body(out) !== body(was)) out.updatedAt = now;
    if (body(out) === body(c) && out.updatedAt === c.updatedAt) return c;
    changed = true;
    return out;
  });
  return { tasks, changed };
}

// — the Tasks screen's date window —

export type DateWindow = 'today' | 'week' | 'month' | 'all';
export const DATE_WINDOWS: readonly DateWindow[] = ['today', 'week', 'month', 'all'];

/** The local time the window opens at: midnight today, Monday of this week,
 *  the 1st of this month. Null for all time. */
export function windowStart(window: DateWindow, now: Date = new Date()): Date | null {
  if (window === 'all') return null;
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (window === 'week') d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  if (window === 'month') d.setDate(1);
  return d;
}

/** When a card last counted: its doneAt when done, else its latest activity. */
export function taskActivityAt(task: { status?: unknown; doneAt?: string; completedAt?: string; updatedAt?: string; createdAt?: string; created_at?: string }): string | undefined {
  const done = DONE.has(typeof task.status === 'string' ? task.status.trim().toLowerCase() : '');
  return (done ? task.doneAt || task.completedAt : undefined) || task.updatedAt || task.createdAt || task.created_at || undefined;
}

export function inDateWindow(task: Parameters<typeof taskActivityAt>[0], window: DateWindow, now: Date = new Date()): boolean {
  const start = windowStart(window, now);
  if (!start) return true;
  const at = taskActivityAt(task);
  const t = at ? Date.parse(at) : NaN;
  return Number.isFinite(t) && t >= start.getTime();
}
