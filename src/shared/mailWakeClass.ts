/**
 * READS-QUIET-NOREPLY (1.1.81): which delivered mail may wait for the agent's next real turn
 * instead of starting one.
 *
 * Every wake re-sends the agent's whole conversation (god: up to ~290k per turn), and on
 * 2026-10-02 176 of 348 mail wakes carried only FYI mail (quiet-time on/off, status relays).
 * For an `inject` agent (Claude, Codex, AGY) the mail BODIES never ride the wake: the hooks
 * surface every delivered id on the next UserPromptSubmit / PostToolUse, woken for or not. So a
 * quiet message only has to stay out of the wake coordinator's pending set; it reaches the agent
 * on its next real turn, or after QUIET_MAIL_HOLD_MIN_DEFAULT minutes at most, when the whole
 * held batch is released as one ordinary wake.
 *
 * QUIET = ALL of:
 *   - the recipient's mail mode is `inject` (the others read mail BECAUSE of the wake prompt);
 *   - act `inform` or `agree` (done is how results come back: it always wakes, god c95516);
 *   - no reply required;
 *   - a sender that is not the Human, the breaker, the floor digest or a harness sender;
 *   - the sender did not ask for `"wake": "now"`;
 *   - it does not ANSWER the recipient's own ask (Jim B1): an agree or inform whose in_reply_to is a
 *     message the recipient sent as a request/query/propose or with requires_reply. That is the go
 *     signal an idle agent is waiting for (god's "approved" to Jim was an agree).
 * Everything else wakes exactly as before. Pure: no clock, no I/O.
 */

export const QUIET_MAIL_HOLD_MIN_DEFAULT = 30;

/** The acts that may be held. */
export const QUIET_ACTS: ReadonlySet<string> = new Set(['inform', 'agree']);

/** Senders whose mail always wakes: the Human, Floor decisions, the circuit breaker, webhooks,
 *  and every harness sender (mailReaders SYSTEM_SENDERS). */
export const ALWAYS_WAKE_SENDERS: ReadonlySet<string> = new Set([
  'human', 'digest', 'breaker', 'webhook', 'system', 'heartbeat', 'scheduler',
  // Jim B2: the Human's spoken message to an agent ("Voice ping from Michael", realtimeActions
  // VOICE_ACTOR) and a worker's terminal failure to god with its Slack reply command (index
  // informGod). test/reads-quiet-181 keeps a census of every harness sender against this set.
  'michael-voice', 'ephemeral-worker',
  // CLAIM-LEDGER W1: a claims-chain-broken or claims-key-missing alert to god (a ledger went read-only).
  'claims'
]);

/** The acts that ask the recipient for an answer (hive.normalize's requires_reply default). */
const ASKING_ACTS: ReadonlySet<string> = new Set(['request', 'query', 'propose']);

/** The ledger fields the class reads (MailEntry has them all). */
export interface MailWakeFacts {
  id: string;
  from: string;
  act?: string;
  requiresReply: boolean;
  /** The sender asked for `"wake": "now"`. */
  wakeNow?: boolean;
  deliveredAt: number;
  /** The id this message answers (MailEntry.inReplyTo). */
  inReplyTo?: string | null;
}

/** The message an answer points at, as the replier's ledger holds it. */
export interface AskedMessage { from: string; act?: string; requiresReply: boolean }

/**
 * Jim B1: does `e` answer an ask the RECIPIENT made? `lookup(e.from, id)` finds the original in
 * the ledger of the agent that received it, which is the one now answering. Unknown = no.
 */
export function answersOwnAsk(e: MailWakeFacts, recipientId: string, lookup: (holder: string, id: string) => AskedMessage | undefined): boolean {
  if (!e.inReplyTo) return false;
  let orig: AskedMessage | undefined;
  try { orig = lookup(e.from, e.inReplyTo); } catch { orig = undefined; }
  return !!orig && orig.from === recipientId && (orig.requiresReply || ASKING_ACTS.has(String(orig.act ?? '')));
}

export type MailWakeClass = 'wake' | 'quiet';

/** `isAnswer` (main: answersOwnAsk over the ledgers) is asked only for an otherwise quiet message. */
export function mailWakeClass(e: MailWakeFacts, mailMode: string, isAnswer?: (e: MailWakeFacts) => boolean): MailWakeClass {
  if (mailMode !== 'inject') return 'wake';
  if (!QUIET_ACTS.has(String(e.act ?? ''))) return 'wake';
  if (e.requiresReply) return 'wake';
  if (ALWAYS_WAKE_SENDERS.has(e.from)) return 'wake';
  if (e.wakeNow === true) return 'wake';
  if (isAnswer) {
    let answer = true;   // a lookup that throws fails open: it wakes
    try { answer = isAnswer(e); } catch { answer = true; }
    if (answer) return 'wake';
  }
  return 'quiet';
}

/** The config value (minutes) as milliseconds: a finite number >= 0, else the default; 0 = off. */
export function quietMailHoldMs(configMin: unknown): number {
  const n = typeof configMin === 'number' && Number.isFinite(configMin) && configMin >= 0 ? configMin : QUIET_MAIL_HOLD_MIN_DEFAULT;
  return Math.round(n * 60_000);
}

/**
 * The quiet ids among `entries` that may still wait at `now`, each with the time its hold ends
 * (deliveredAt + holdMs, so a restart never extends it). An id past its hold, or any id when the
 * hold is off, is absent: it wakes.
 */
export function quietHolds(entries: readonly MailWakeFacts[], mailMode: string, holdMs: number, now: number, isAnswer?: (e: MailWakeFacts) => boolean): Map<string, number> {
  const out = new Map<string, number>();
  if (!(holdMs > 0)) return out;
  for (const e of entries) {
    if (mailWakeClass(e, mailMode, isAnswer) !== 'quiet') continue;
    const until = e.deliveredAt + holdMs;
    if (until > now) out.set(e.id, until);
  }
  return out;
}

/** A sender's `wake` field: only the exact string "now" counts. */
export function normalizeWakeField(v: unknown): { wake?: 'now' } {
  return v === 'now' ? { wake: 'now' } : {};
}
