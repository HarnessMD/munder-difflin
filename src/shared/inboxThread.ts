/**
 * THE INBOX THREAD, as arithmetic (v0.4.9 phase 3, founder 3 Sep 2026).
 *
 * His complaint was not that the Inbox was ugly. It was that he could not tell
 * what any of it was: "I do not know what does what", "we do not know what an
 * agent gives as a final answer", and a message he typed that "is not visible
 * in the inbox immediately and vanishes".
 *
 * Three of those four are one problem: a thread that shows some of the traffic
 * some of the time. So the merging, the status of a sent message, the files a
 * message names and the tickets it names all live HERE, free of React, and the
 * screen is only the drawing of them.
 *
 * Nothing in this module reaches a door. It takes rows and returns rows.
 */

/* ---- what the person sent ------------------------------------------------ */

/**
 * Where a message the person sent has got to.
 *
 *   queued   parked for the agent, waiting for it to be free
 *   sent     typed into the agent's session
 *   failed   the session would not take it, after every retry
 *   dropped  the person took it back out of the queue before it went
 *
 * `failed` and `dropped` are kept and SHOWN. A message that quietly disappears
 * is the defect being fixed; a message that says "you withdrew this" is not.
 */
/** `sent`: it left, nothing has said it arrived. `delivered`: the agent's own CLI reported it, or the agent answered after it left. */
export type SendStatus = 'queued' | 'sent' | 'delivered' | 'failed' | 'dropped';

/** One thing the person sent an agent, from the moment they pressed Send. */
export interface SentEntry {
  /** The queued message's id, so the drain can settle exactly this one. */
  id: string;
  text: string;
  /** epoch ms it was sent from the composer */
  ts: number;
  status: SendStatus;
  /** epoch ms it left for the session, on 'sent', or was proved there, on 'delivered'. */
  settledAt?: number;
  /** epoch ms it was typed into the session. Kept when a later proof settles it again: an answer has to come after this. */
  leftAt?: number;
}

/** A row of the command-history ledger: what was typed straight into the
 *  terminal, which the composer never saw. */
export interface HistoryLine {
  ts: number;
  text: string;
}

/** Two sends are the same send if they carry the same text within this window.
 *  A person who genuinely sends the same line twice does it slower than this. */
const SAME_SEND_MS = 15_000;

/**
 * The person's side of the thread: everything the composer sent, plus anything
 * typed directly into the terminal that the composer did not already record.
 *
 * The overlap is real. A queued message is eventually typed into the session,
 * and a provider that echoes it back into the history ledger would otherwise
 * draw the same sentence twice, once with a status and once without.
 */
export function mergeSent(log: SentEntry[], history: HistoryLine[]): SentEntry[] {
  const out = [...log];
  for (const h of history) {
    const text = h.text.trim();
    if (!text) continue;
    const twin = log.some((e) => e.text.trim() === text && Math.abs(e.ts - h.ts) <= SAME_SEND_MS);
    if (twin) continue;
    out.push({ id: `typed:${h.ts}:${text.length}`, text: h.text, ts: h.ts, status: 'delivered' });
  }
  return out.sort((a, b) => a.ts - b.ts);
}

/**
 * The sends an answer proves. An agent that answered after a send had it, even
 * when its CLI's hook never reported the prompt (a timeout on a busy machine, an
 * engine with no hook). A status of working does not count: the app sets that itself.
 */
export function sendsAnswered(log: ReadonlyArray<SentEntry>, answeredAt: number): string[] {
  return log.filter((e) => e.status === 'sent' && !isSteer(e.id) && answeredAt >= (e.leftAt ?? e.ts)).map((e) => e.id);
}

/** A steer waits in main for the agent's next hook, so an answer after it can be the end of the turn it came into
 * . Only its hook proves it. */
export const isSteer = (id: string): boolean => id.startsWith('steer-');

/* ---- a message that has not landed yet ----------------------------------- */

/**
 * A message sent to the orchestrator that the ledger has not returned yet.
 *
 * `hive:send` writes a file into a mailbox and `hive:messages` reads mailboxes
 * back, so there is a gap of up to one poll between pressing Send and seeing
 * the message. The old thread cleared the draft into that gap, which is why he
 * watched his own message disappear.
 */
export interface PendingSend {
  key: string;
  subject: string;
  body: string;
  /** epoch ms */
  at: number;
  status: 'sending' | 'sent' | 'failed';
  error?: string;
}

/**
 * Drop the pending rows the ledger has caught up with. Matching is on the
 * body: the ledger assigns its own id and its own timestamp, so the body is
 * the only thing both sides agree on.
 */
export function stillPending(pending: PendingSend[], ledgerBodies: string[]): PendingSend[] {
  if (pending.length === 0) return pending;
  const landed = new Set(ledgerBodies.map((b) => b.trim()));
  const kept = pending.filter((p) => p.status === 'failed' || !landed.has(p.body.trim()));
  return kept.length === pending.length ? pending : kept;
}

/* ---- who a message is from ----------------------------------------------- */

/** The person's address in the office: `human`. */
export function isPersonAddress(from: unknown): boolean {
  return from === 'human';
}

