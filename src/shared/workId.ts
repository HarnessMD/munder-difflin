/**
 * The work id of a hive message (0.5.6): which piece of work it belongs to.
 *
 * A sender may name it in the optional `work` field: a card id, a pull request,
 * a short name. A message without one belongs to its thread, so the app uses
 * the `conversation` id, and the message's own id when there is no thread.
 * The wake prints it (shared/hiveNudge.ts) so an agent can tell a new piece of
 * work from more of the same.
 */

/** The longest `work` value the app keeps. */
export const WORK_ID_MAX = 64;

/** A `work` field as the app keeps it: one line, trimmed, WORK_ID_MAX
 *  characters at most. Empty when the value is not a usable string. `\s`
 *  covers every line break, so a value written over two lines becomes one. */
export function cleanWorkId(work: unknown): string {
  if (typeof work !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  return work.replace(/[\x00-\x1f\x7f-\x9f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, WORK_ID_MAX).trim();
}

/** The message's `work` field, else its `conversation`, else its `id`. */
export function workIdOf(msg: { work?: unknown; conversation?: unknown; id?: unknown }): string {
  const work = cleanWorkId(msg.work);
  if (work) return work;
  const conversation = typeof msg.conversation === 'string' ? msg.conversation.trim() : '';
  if (conversation) return conversation;
  return typeof msg.id === 'string' ? msg.id.trim() : '';
}
