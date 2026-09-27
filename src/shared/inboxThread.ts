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
export type SendStatus = 'queued' | 'sent' | 'failed' | 'dropped';

/** One thing the person sent an agent, from the moment they pressed Send. */
export interface SentEntry {
  /** The queued message's id, so the drain can settle exactly this one. */
  id: string;
  text: string;
  /** epoch ms it was sent from the composer */
  ts: number;
  status: SendStatus;
  /** epoch ms it reached the session, on 'sent'. */
  settledAt?: number;
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
    out.push({ id: `typed:${h.ts}:${text.length}`, text: h.text, ts: h.ts, status: 'sent' });
  }
  return out.sort((a, b) => a.ts - b.ts);
}

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
 * Drop the pending rows the ledger has caught up with. Matching is on the body
 * alone: the ledger assigns its own id and its own timestamp, so the body is
 * the only thing both sides agree on.
 */
export function stillPending(pending: PendingSend[], ledgerBodies: string[]): PendingSend[] {
  if (pending.length === 0) return pending;
  const landed = new Set(ledgerBodies.map((b) => b.trim()));
  const kept = pending.filter((p) => p.status === 'failed' || !landed.has(p.body.trim()));
  return kept.length === pending.length ? pending : kept;
}

/* ---- what a message names ------------------------------------------------ */

/**
 * Absolute paths named in a message body, in the order they appear.
 *
 * An extension is required. Without one this matches every directory an agent
 * mentions in passing, and a chip that opens a folder is not the thing he
 * asked for ("clicking a file should open it"). A path inside a URL is
 * skipped: the character before it tells them apart.
 */
export function filePathsIn(text: string): string[] {
  if (!text) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  const re = /(?:\/[A-Za-z0-9._~@%+][A-Za-z0-9._~@%+-]*)+\.[A-Za-z0-9]{1,8}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const before = m.index > 0 ? text[m.index - 1] : '';
    // "https://host/a/b.json" and "//host/x.png" are not files on this disk.
    if (before === '/' || before === ':') continue;
    const path = m[0].replace(/[.,;:)\]}'"`]+$/, '');
    if (path.length < 4 || seen.has(path)) continue;
    seen.add(path);
    out.push(path);
  }
  return out;
}

/**
 * The ledger ids a message names, in the order they appear.
 *
 * Matched against the ids that actually exist rather than a pattern: hive task
 * ids are free-form slugs ("razorpay-key-hygiene"), so there is no shape to
 * recognise, and a card drawn for an id that no longer exists is worse than no
 * card. Longest first, so an id that contains another one wins.
 */
export function taskIdsIn(text: string, known: string[]): string[] {
  if (!text || known.length === 0) return [];
  const boundary = (c: string) => c === '' || !/[A-Za-z0-9_-]/.test(c);
  const hits: { id: string; at: number }[] = [];
  for (const id of [...known].sort((a, b) => b.length - a.length)) {
    if (!id) continue;
    let from = 0;
    for (;;) {
      const at = text.indexOf(id, from);
      if (at < 0) break;
      from = at + id.length;
      const before = at > 0 ? text[at - 1] : '';
      const after = at + id.length < text.length ? text[at + id.length] : '';
      if (!boundary(before) || !boundary(after)) continue;
      // An id inside a longer id already claimed this stretch of text.
      if (hits.some((h) => at >= h.at && at < h.at + h.id.length)) continue;
      hits.push({ id, at });
      break;
    }
  }
  return hits.sort((a, b) => a.at - b.at).map((h) => h.id);
}

/** The last segment of a path, for a chip narrow enough to sit in a bubble. */
export function fileLabel(path: string): string {
  const parts = path.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? path;
}
