/**
 * WHAT RIDES IN FRONT OF A SLACK MESSAGE (0.5.6, founder 12 Oct 2026: "The
 * slack prompt that gets sent should not have Route Fast section and delegate,
 * if it's not sent to orchestrator ... Create a new Prompt for both, the cases
 * it should tell the Agent on how to behave for each message, as a message can
 * be in a thread, in dm, in group with reference to any chat message/media").
 *
 * Three readers, one text each:
 *
 *   god    the orchestrator. It routes: find the agent, hand the message over
 *          with the reply command, do not sit on it.
 *   agent  an agent the person chose to receive Slack. The message is its own
 *          work: no routing, no handing over, it answers in Slack itself.
 *   temp   a temp the harness started for this message. One job, then done.
 *
 * Until now there was one text for god and one for a temp, and an agent the
 * person had chosen was told to "ROUTE FAST" and "DELEGATE", which is the one
 * thing choosing it was meant to stop.
 *
 * Every text also says WHERE the message was written (a channel, a group
 * direct message, a direct message, top level or inside a thread) and what
 * came with it (the thread so far, the messages it points to, files), because
 * the right answer differs: a reply in a thread answers the newest message,
 * a direct message is private, a group is read by everyone in it.
 *
 * Pure: main builds the text per message and a test pins it.
 */

export type SlackPlace = 'channel' | 'group' | 'dm';
export type SlackReader = 'god' | 'agent' | 'temp';

export interface SlackBriefArgs {
  reader: SlackReader;
  channel: string;
  threadTs: string;
  /** The bundled Node and the reply helper, each quoted for this machine:
   *  `"<node>" "<md-slack-reply.cjs>"`. */
  helper: string;
  /** Absent reads as a channel, top level: what every message was before 0.5.6. */
  place?: SlackPlace;
  /** The message is a reply inside a thread. */
  inThread?: boolean;
  /** The Slack user id of the person who wrote it. */
  user?: string;
  /** An "Attached files" block follows the message. */
  hasFiles?: boolean;
  /** A "Thread so far" block follows the message. */
  hasThread?: boolean;
  /** An "Earlier in this direct message" block follows the message. */
  hasEarlier?: boolean;
  /** A "Messages it points to" block follows the message. */
  hasRefs?: boolean;
}

const VERBATIM = '(that first path is the harness\'s bundled Node, already resolved for this machine; pass it verbatim)';
const PAUSE = 'Pause only for a high severity action: pushing to main or any remote, buying or provisioning anything paid, deleting a repo, file or folder you did not create.';
const MRKDWN = 'A reply is Slack mrkdwn with substance: a short *bold* headline plus the outcome, specifics and links, never a bare "done".';

/** The command that answers where the message was written. */
export function slackReplyCommand(a: Pick<SlackBriefArgs, 'helper' | 'channel' | 'threadTs'>, text = '<your reply>'): string {
  return `${a.helper} --channel ${a.channel} --thread ${a.threadTs} --text "${text}"`;
}

/** The command that writes to one person in private. */
export function slackDmCommand(helper: string, user = '<Slack user id>'): string {
  return `${helper} --user ${user} --text "<your message>"`;
}

/** One sentence: where the message was written and by whom. */
export function slackWhere(a: Pick<SlackBriefArgs, 'place' | 'inThread' | 'user' | 'channel'>): string {
  const who = a.user ? ` from <@${a.user}>` : '';
  const place = a.place ?? 'channel';
  if (place === 'dm') {
    return a.inThread
      ? `a reply in a thread inside a direct message${who}. Nobody else can read it.`
      : `a direct message${who}. Nobody else can read it.`;
  }
  if (place === 'group') {
    return a.inThread
      ? `a reply${who} in a thread inside a group direct message (${a.channel}). Everyone in that group can read the thread.`
      : `a message${who} in a group direct message (${a.channel}) that mentions the office. Everyone in that group can read it.`;
  }
  return a.inThread
    ? `a reply${who} in a thread in channel ${a.channel} that the office is part of. Everyone in the channel can read the thread.`
    : `a new message${who} in channel ${a.channel} that mentions the office. Everyone in the channel can read it.`;
}

/** Where the answer lands, in the reader's terms. */
function whereReplyGoes(a: Pick<SlackBriefArgs, 'place' | 'inThread'>): string {
  const place = a.place ?? 'channel';
  if (place === 'dm') return 'It lands in that direct message, in the thread under the message, so each request keeps its own thread.';
  if (place === 'group') return 'It lands in the thread under the message, where the whole group reads it, never at the top of the group.';
  return a.inThread
    ? 'It lands in that same thread, never at the top of the channel.'
    : 'It opens a thread under the message, never a new message at the top of the channel.';
}

/** What to read before answering, one sentence per thing that came with it. */
function contextLines(a: SlackBriefArgs): string[] {
  const out: string[] = [];
  if (a.hasThread) out.push('It continues a conversation: the "Thread so far" block under the message is that thread, oldest first. Read it, then answer the newest message, not the whole thread again.');
  if (a.hasEarlier) out.push('The "Earlier in this direct message" block under the message is what was said just before. Use it to work out what a short message ("yes", "do it", "that one") points to.');
  if (a.hasRefs) out.push('It points to other Slack messages: the "Messages it points to" block under the message has their text. Treat them as what the person is asking about.');
  if (a.hasFiles) out.push('Files came with it: the "Attached files" block under the message lists where each was saved on this machine. Open every one before you answer.');
  return out;
}

/** How to write to one person in private, and when. */
function dmLine(a: SlackBriefArgs): string {
  const sender = a.user ? ` The person who wrote this is ${a.user}.` : '';
  return `To write to ONE PERSON in private, send a direct message with: ${slackDmCommand(a.helper)} (a Slack user id starts with U or W; a mention <@U123> carries it).${sender} Do it only when the message asks for it, or when the answer must not be read by everyone in the channel.`;
}

/**
 * The text that rides in front of a Slack message. It ends with a label and
 * a space, so the message reads on naturally after it.
 */
export function buildSlackBrief(a: SlackBriefArgs): string {
  const reply = slackReplyCommand(a);
  const where = `WHERE: ${slackWhere(a)}`;
  const goes = whereReplyGoes(a);
  const context = contextLines(a);
  const decision = `post the question with numbered options with that command and record {q, options, askedAt (ISO), thread_ts ${a.threadTs}}`;

  if (a.reader === 'temp') {
    return `[SLACK JOB] You are a temp. This job arrived from Slack and no human is watching in the app.
${where}
1. Do it autonomously; no interactive questions. ${PAUSE}
2. ${context.length > 0 ? `READ FIRST. ${context.join(' ')}` : 'READ FIRST. Read the whole job before you start.'}
3. When done, post your result to the thread yourself with exactly: ${reply} ${VERBATIM}. ${goes} ${MRKDWN}
4. Then send god ONE outbox message with "act":"done" and a short summary; that releases you.
5. If you need a decision, ${decision}; god picks up the human's threaded reply.
6. ${dmLine(a)}
The job: `;
  }

  if (a.reader === 'agent') {
    return `[SLACK MESSAGE FOR YOU] This arrived from Slack, and Slack messages in this office are sent to you. No human is watching in the app.
${where}
1. IT IS YOURS. Do the work yourself. Do not hand it to the orchestrator or to another agent, and do not start a temp for it. You may ask a teammate for a fact you need; the answer in Slack is still yours to write.
2. ${context.length > 0 ? `READ FIRST. ${context.join(' ')}` : 'READ FIRST. Read the whole message before you start.'}
3. NO INTERACTIVE QUESTIONS. ${PAUSE}
4. ANSWER IN SLACK YOURSELF, with exactly: ${reply} ${VERBATIM}. ${goes}
5. ${MRKDWN}
6. If you need a decision, do not block: ${decision}. The person's answer comes back to you as a new Slack message.
7. ${dmLine(a)}
The message: `;
  }

  return `[SLACK REQUEST] This arrived from Slack and no human is watching in the app.
${where}
1. ROUTE FAST. Check the live roster (registry.json, fleet.json) and hand it to the one agent that fits, above all the one it names ("ask Pam..."); start a temp only if nobody fits. Split it only if it truly needs several people. Do not sit on it.
2. DELEGATE WITH THE REPLY COMMAND. Hand that agent everything under "The message", the blocks below it included, tell it to do the work autonomously and to post its own result with exactly: ${reply} ${VERBATIM}. ${goes}
3. NO INTERACTIVE QUESTIONS. ${PAUSE}
4. ${MRKDWN}
5. The agent reports back to you when done.
6. If a decision is needed, do not block: ${decision} so the human's threaded reply resumes it.
7. ${context.length > 0 ? `CONTEXT. ${context.join(' ')}` : 'CONTEXT. Nothing came with it but the message.'}
8. ${dmLine(a)}
The message: `;
}

// ─── What came with the message ──────────────────────────────────────────────

export interface SlackRow { user?: string; text: string; ts: string; /** Written by the office's own bot. */ bot?: boolean; /** Replies under it, when Slack said. */ replies?: number }
export interface SlackRef { text: string; author?: string; url?: string }
export interface SlackMessageLink { url: string; channel: string; ts: string }

/** Rows kept and the most text kept of each, so a long thread typed into an
 *  agent's terminal stays a few screens, not a few hundred. */
export const SLACK_ROWS_MAX = 12;
export const SLACK_ROW_TEXT_MAX = 300;
export const SLACK_REFS_MAX = 3;

/** Slack markup out of a line: mentions kept as ids, links reduced to their
 *  label or address, whitespace folded. */
function plain(text: string): string {
  return String(text ?? '')
    .replace(/<#[^|>]+\|([^>]*)>/g, '#$1')
    .replace(/<(https?:[^|>]+)\|([^>]*)>/g, '$2 ($1)')
    .replace(/<(https?:[^>]+)>/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function cut(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** '<title>:' then one line per message, oldest first, the newest rows kept. */
export function slackRowsBlock(title: string, rows: readonly SlackRow[]): string {
  const kept = rows.slice(-SLACK_ROWS_MAX);
  if (kept.length === 0) return '';
  const lines = kept.map((r) => `[${r.ts}] ${r.bot ? 'the office' : r.user ? `<@${r.user}>` : 'someone'}: ${cut(plain(r.text), SLACK_ROW_TEXT_MAX)}`);
  return `${title}:\n${lines.join('\n')}`;
}

/** The messages a message points to: shared into it, or linked from it. */
export function slackRefsBlock(refs: readonly SlackRef[]): string {
  const kept = refs.slice(0, SLACK_REFS_MAX);
  if (kept.length === 0) return '';
  const lines = kept.map((r) => `${r.author ? `${r.author}: ` : ''}${cut(plain(r.text), 500)}${r.url ? ` (${r.url})` : ''}`);
  return `Messages it points to:\n${lines.join('\n')}`;
}

/**
 * The Slack message links in a text: `https://<workspace>.slack.com/archives/
 * <channel>/p<16 digits>`. The 16 digits are the message's ts without its dot.
 * A link to a reply carries `?thread_ts=…`, which is not needed to read it.
 */
export function slackMessageLinks(text: string, max = SLACK_REFS_MAX): SlackMessageLink[] {
  const out: SlackMessageLink[] = [];
  const re = /https?:\/\/[a-z0-9.-]+\.slack\.com\/archives\/([A-Z0-9]+)\/p(\d{10})(\d{6})/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(String(text ?? ''))) !== null && out.length < max) {
    const ts = `${m[2]}.${m[3]}`;
    if (out.some((l) => l.channel === m![1] && l.ts === ts)) continue;
    out.push({ url: m[0], channel: m[1], ts });
  }
  return out;
}

/** A Slack user id, the only thing a direct message may be addressed to. */
export function isSlackUserId(v: unknown): v is string {
  return typeof v === 'string' && /^[UW][A-Z0-9]{5,}$/.test(v.trim());
}
