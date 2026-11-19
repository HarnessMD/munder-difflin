/** The single definition of "this card is waiting on the human" (public #454).
 *
 *  An ask is OPEN when a `humanQA` entry has a question but no answer and was
 *  not dismissed. That alone makes the card wait on the human; the card's
 *  `status` is not part of the test. ASK ME (the tab, the modal, the bell, the
 *  kanban badge and the floor board) used to require `status === 'blocked'`
 *  too, so an ask the god appended to a card it had left in `doing` was in the
 *  ledger and shown nowhere: the god told the human "see ASK ME" and ASK ME was
 *  empty. The rule now lives here, where an agent cannot forget it.
 *
 *  The one status that DOES matter is `done`. A finished card's unanswered
 *  question is history, not a pending ask: existing hives carry old `humanQA`
 *  entries on cards closed long ago, and reading them as open would fill ASK ME
 *  with every one of them the first time the upgraded app reads the ledger. */

export interface HumanAskLike {
  q?: unknown;
  a?: unknown;
  askedAt?: unknown;
  answeredAt?: unknown;
  dismissedAt?: unknown;
}

/** A finished card: nothing on it can still be waiting on anyone. */
export function isDoneCard(card: { status?: unknown } | null | undefined): boolean {
  return card?.status === 'done';
}

/** An ask is closed by an answer or a dismissal written as text, the way the
 *  window reads the ledger (TasksKanban drops any other value). A hand written
 *  `"dismissedAt": true` closes nothing, so main and every view agree it is
 *  still open and an answer to it lands. */
export function askClosed(e: HumanAskLike): boolean {
  return (typeof e.a === 'string' && e.a !== '') || (typeof e.dismissedAt === 'string' && e.dismissedAt !== '');
}

/** The newest open ask on a card, or undefined. Scans from the end so the
 *  entry the human sees is the latest question, not the first ever asked. A
 *  `done` card has no open ask whatever its `humanQA` holds. */
export function openQuestion<E extends HumanAskLike>(
  card: { humanQA?: readonly E[] | unknown; status?: unknown } | null | undefined
): E | undefined {
  if (isDoneCard(card)) return undefined;
  const qa = card?.humanQA;
  if (!Array.isArray(qa)) return undefined;
  for (let i = qa.length - 1; i >= 0; i--) {
    const e = qa[i] as E | undefined;
    if (e && typeof e.q === 'string' && !askClosed(e)) return e;
  }
  return undefined;
}

/** True when the card has an open ask, whatever its kanban status except done. */
export function waitsOnHuman(card: { humanQA?: unknown; status?: unknown } | null | undefined): boolean {
  return !!openQuestion<HumanAskLike>(card);
}
