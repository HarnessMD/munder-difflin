/**
 * The inbox wake: the text typed into an agent that has unread hive mail, and
 * the predicate the message queue uses to keep only one of them pending.
 *
 * 0.5.6: the wake carries the messages themselves. Before it, a wake named ids
 * and the agent spent a turn opening its inbox, reading each file and moving
 * it to `inbox/.done/`. Now the id, sender, type, work id, subject and body
 * are typed with the wake, and the app files the mail when the turn that read
 * it ends (main/wakeFiling.ts). A message too long to type is named by its
 * file path, and that one stays the agent's to read and file.
 *
 * The wake is QUEUED the moment fresh mail is seen but TYPED only once the
 * agent is idle and off cooldown, and it survives a renderer reload in the
 * persisted queue. So the text that is typed is written again at that moment,
 * from the mail pending then (main's `hive:wakeText`), and the queued copy is
 * only what the queue shows meanwhile.
 */
import { workIdOf } from './workId';
import { isTempAgentId } from './tempAgent';
import { isPersonAddress } from './inboxThread';

/** The fixed head of every wake; what follows differs per wake. */
const NUDGE_HEAD = 'You have new hive inbox message(s)';

/** A body longer than this is not typed: the wake names its file instead. */
export const WAKE_BODY_MAX = 4_000;
/** No body is typed past this many characters of wake in all. */
export const WAKE_TOTAL_MAX = 12_000;
/** The longest one of the app's own notes about a temp (heldNote) waits for
 *  another wake before it gets one of its own. */
export const NOTE_HOLD_MS = 30 * 60_000;

/** The closing lines. They sit at the very end of the wake, after every
 *  body, and `wakeIds` reads them from the end backwards, so nothing a sender
 *  writes in a subject or a body can add an id to either list. */
const FILED_LEAD = 'These messages are filed for you when your turn ends: ';
const FILED_TAIL = '. Do not open or move the inbox files for them.';
const YOURS_LEAD = 'Yours to file: ';
const YOURS_TAIL = '. Move each of those files from your inbox to inbox/.done/ when handled.';
const WAKE_END = 'Open a file only where a path is given. Do not send a reply that only acknowledges. Act autonomously; only message god if you genuinely need a decision.';

/** Under a message from the person. They read the agent's screen, so the
 *  answer goes on the screen and by mail both, and the Inbox thread keeps it.
 *  Mail between agents gets no such line. */
export const PERSON_LINE = 'who: the person, who reads your screen. Write your answer to them in full here on your screen, and send it to them by mail as well.';

/** A message id is an inbox file name (main/hive.ts SAFE_MESSAGE_ID). */
const SAFE_ID = /^[A-Za-z0-9_-][A-Za-z0-9._-]{0,127}$/;

/** The fields of a hive message the wake reads. Structural, so main's
 *  HiveMessage and the renderer's copy of it both fit. */
export interface WakeMessage {
  id: string;
  from?: string;
  act?: string;
  subject?: string;
  body?: string;
  work?: string;
  conversation?: string;
  requires_reply?: boolean;
  created_at?: string;
}

export interface InboxWake {
  text: string;
  /** Printed in full: the app files these when the turn ends. */
  filed: string[];
  /** The agent files these itself: the ones named by path only, and every
   *  one of them for an engine whose turn end the app cannot hear. */
  yours: string[];
}

/** How a wake is written for one engine (providerAutomation.wakeOptionsFor). */
export interface WakeOptions {
  /** The whole wake on one line: the engine is typed raw. */
  oneLine?: boolean;
  /** The agent files its own mail: the engine reports no turn end to the app. */
  selfFile?: boolean;
}

/** CRLF, a lone CR and the two Unicode line separators, each one line break. */
const LINE_BREAKS = new RegExp(`\\r\\n?|[${String.fromCharCode(0x2028, 0x2029)}]`, 'g');

/**
 * Text that is safe to type into a terminal. A message body is written by
 * another agent, and the terminal reads control characters as keys: an escape
 * starts a key sequence (or ends our own bracketed paste), a tab asks for a
 * completion, a carriage return is the submit key. Every line break becomes a
 * plain line feed, a tab becomes two spaces, and every other control character
 * (C0, DEL, C1) is taken out.
 */
export function typeable(text: unknown): string {
  if (typeof text !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  return text.replace(LINE_BREAKS, '\n').replace(/\t/g, '  ').replace(/[\x00-\x09\x0b-\x1f\x7f-\x9f]/g, '');
}

function oneLine(text: unknown, max: number): string {
  return typeable(text).replace(/\s+/g, ' ').trim().slice(0, max);
}

/** Where a message's file is, for a body the wake does not print. */
function fileOf(inboxPath: string | null | undefined, id: string): string {
  if (!inboxPath) return `inbox/${id}.json in your agent folder`;
  const sep = inboxPath.includes('\\') && !inboxPath.includes('/') ? '\\' : '/';
  return `${inboxPath}${inboxPath.endsWith(sep) ? '' : sep}${id}.json`;
}

/** The app's own notes about a temp, all of them to god: the harness speaking
 *  for one ("temps": a Slack thread handed to a temp) and a temp's done that
 *  god files as a note (HiveManager.setQuietDone). They tell, they ask
 *  nothing, and they would wake god once per temp. A clone that finished tells
 *  its source by inform, so that one wakes. */
function heldNote(msg: { act?: unknown; from?: unknown }): boolean {
  return msg.act === 'note' && typeof msg.from === 'string' && (msg.from === 'temps' || isTempAgentId(msg.from));
}

/**
 * Does this message wake its receiver now? Every message does, a note too
 * (founder, 26 Oct 2026: a note god sent Andy waited and was never read). The
 * wake is typed only at an idle prompt, so a busy agent reads it when its turn
 * ends, never mid turn. The one exception is heldNote: it waits in the inbox
 * and rides the next wake, and one that has waited NOTE_HOLD_MS with no wake
 * gets a wake of its own. One whose `created_at` cannot be read counts as due,
 * so it is never stranded.
 */
export function wakesReceiver(msg: { act?: unknown; from?: unknown; created_at?: unknown }, now = Date.now()): boolean {
  if (!heldNote(msg)) return true;
  const at = typeof msg.created_at === 'string' ? Date.parse(msg.created_at) : NaN;
  return !Number.isFinite(at) || now - at >= NOTE_HOLD_MS;
}

/**
 * Build the wake for these messages, oldest first as given.
 *
 * Each message is printed as id, from, type, work id, subject and body, and
 * one from the person gets PERSON_LINE after its subject. A
 * body over WAKE_BODY_MAX characters, or one that would take the wake past
 * WAKE_TOTAL_MAX in all, is not printed: its line gives the absolute file
 * path, and its id goes in the "yours to file" list.
 *
 * LINE BREAKS. A body keeps its line breaks, each line behind `> ` so no line
 * of a body can read as a line of the wake. That is safe where the text is
 * typed as a bracketed paste (Claude, and every engine given one paste for a
 * text with line breaks). `oneLine` is for an engine typed raw (Antigravity
 * prints the paste markers as text), where a line break could submit half the
 * wake: the whole wake is then one line, and a message whose body has a line
 * break is named by its path instead of being flattened.
 *
 * WHO FILES. The app files what it printed in full, when the agent's turn
 * ends, and it learns of a turn end from the engine's hooks. `selfFile` is for
 * an engine with none (Cursor): the bodies are still printed, and every id
 * goes in the "yours to file" list, with the inbox directory named.
 *
 * `inboxPath` is the agent's absolute inbox directory (public #559).
 */
export function buildInboxWake(
  messages: readonly WakeMessage[],
  inboxPath?: string | null,
  opts: WakeOptions = {}
): InboxWake {
  const filed: string[] = [];
  const yours: string[] = [];
  const blocks: string[] = [];
  const join = opts.oneLine ? ' | ' : '\n';
  const head = `${NUDGE_HEAD}: ${messages.length}${messages.length ? ', printed below' : ''}.`;
  // What the wake comes to so far: the head and the closing lines now, then
  // each block with its separator and its id in a closing list.
  let used = head.length + FILED_LEAD.length + FILED_TAIL.length + YOURS_LEAD.length + YOURS_TAIL.length + WAKE_END.length
    + (inboxPath ? inboxPath.length : 0) + 24;
  messages.forEach((m, i) => {
    const id = typeof m.id === 'string' ? m.id : '';
    const safe = SAFE_ID.test(id);
    const work = oneLine(workIdOf(m), 128);
    const thread = oneLine(m.conversation, 128);
    const lines = [
      `[${i + 1} of ${messages.length}]`,
      `id: ${safe ? id : oneLine(id, 128) || '(none)'}`,
      `from: ${oneLine(m.from, 128) || 'unknown'}`,
      `type: ${oneLine(m.act, 32) || 'inform'}${m.requires_reply === true ? ' (reply expected)' : ''}`,
      `work: ${work}`,
      // The thread id, where a `work` field took its place above: a reply
      // still needs it to stay in the thread.
      ...(thread && thread !== work ? [`thread: ${thread}`] : []),
      `subject: ${oneLine(m.subject, 300) || '(none)'}`,
      ...(isPersonAddress(m.from) ? [PERSON_LINE] : [])
    ];
    const body = typeable(m.body).trim();
    const printed = opts.oneLine
      ? [`body: ${body || '(empty)'}`]
      : body ? ['body:', ...body.split('\n').map((l) => `> ${l}`.trimEnd())] : ['body: (empty)'];
    const full = [...lines, ...printed].join(join);
    let why = '';
    if (!safe) why = 'its file name is not known';
    else if (body.length > WAKE_BODY_MAX) why = `it is over ${WAKE_BODY_MAX.toLocaleString('en-US')} characters`;
    else if (opts.oneLine && body.includes('\n')) why = 'it has line breaks this terminal cannot take';
    else if (used + full.length + id.length + 6 > WAKE_TOTAL_MAX) why = 'this wake is full';
    const block = !why ? full : [
      ...lines,
      safe
        ? `body: not printed, ${why}. Read ${fileOf(inboxPath, id)}`
        : `body: not printed, ${why}. Find it in ${inboxPath || 'your inbox'} and move it to inbox/.done/ when handled.`
    ].join(join);
    if (safe) (why || opts.selfFile ? yours : filed).push(id);
    blocks.push(block);
    used += block.length + id.length + 6;
  });
  const closing = [
    ...(opts.selfFile && inboxPath && yours.length ? [`Your inbox is ${inboxPath}.`] : []),
    ...(filed.length ? [`${FILED_LEAD}${filed.join(', ')}${FILED_TAIL}`] : []),
    ...(yours.length ? [`${YOURS_LEAD}${yours.join(', ')}${YOURS_TAIL}`] : []),
    WAKE_END
  ].join(' ');
  const text = [head, ...blocks, closing].join(opts.oneLine ? ' || ' : '\n\n');
  return { text, filed, yours };
}

/** The wake text alone (see buildInboxWake). Both wake sites call this. */
export function inboxNudgeText(
  messages: readonly WakeMessage[],
  inboxPath?: string | null,
  opts: WakeOptions = {}
): string {
  return buildInboxWake(messages, inboxPath, opts).text;
}

/**
 * The ids a typed wake named, read back from its closing lines: the ones the
 * app files (printed in full) and the ones the agent files. Read from the text that was TYPED, so the filing can never
 * cover a message the agent was not shown. Both lists are empty for a text
 * that is not a whole wake (a person edited it in the queue, say). The wake
 * may have text in front of it (an engine with no hooks gets its standing
 * goal typed first); it is the end that is read.
 */
export function wakeIds(text: string): { filed: string[]; yours: string[] } {
  let rest = text.trimEnd();
  if (!rest.includes(NUDGE_HEAD) || !rest.endsWith(WAKE_END)) return { filed: [], yours: [] };
  rest = rest.slice(0, rest.length - WAKE_END.length).trimEnd();
  const take = (lead: string, tail: string): string[] => {
    if (!rest.endsWith(tail)) return [];
    const at = rest.lastIndexOf(lead);
    if (at < 0) return [];
    const ids = rest.slice(at + lead.length, rest.length - tail.length).split(', ');
    if (!ids.every((id) => SAFE_ID.test(id))) return [];
    rest = rest.slice(0, at).trimEnd();
    return ids;
  };
  const yours = take(YOURS_LEAD, YOURS_TAIL);
  const filed = take(FILED_LEAD, FILED_TAIL);
  return { filed, yours };
}

/**
 * Is this queued text an inbox wake?
 *
 * Matches the fixed head only, since every wake carries different mail: the
 * point is to recognise the COMMAND, not one instance of it. Mirrors
 * `isCompactionCommand`, and the queue's one pending rule leans on it the same way.
 */
export function isInboxNudge(text: string): boolean {
  return text.trim().startsWith(NUDGE_HEAD);
}
