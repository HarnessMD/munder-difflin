/**
 * WHAT A MESSAGE BETWEEN TWO PEOPLE'S AGENTS IS ALLOWED TO BE.
 *
 * Until 0.4.10 the only door was `teams:send(memberId, body)`: one string, no
 * shape, no limit, no cost. Two agents given a free channel will use it the
 * way two agents always do, which is a long chatty back and forth that nobody
 * reads and that bills both machines for the privilege. The pilot saw exactly
 * that in its first week.
 *
 * So the channel gets a contract, enforced here and nowhere else:
 *
 *   SHAPE      a subject, a body, an act, and whether a reply is wanted.
 *              Not a blob of prose with the question buried in paragraph four.
 *   FORMAT     the body is Markdown, and it is rendered as Markdown at both
 *              ends. Not plain text with asterisks in it.
 *   LENGTH     hard caps, checked before it leaves the machine, because a cap
 *              the receiver applies is a cap that already cost the bandwidth.
 *   TURNS      a thread has a budget. Cross machine messaging is for handing
 *              over a question and getting an answer back, not for holding a
 *              conversation. When the budget is gone the agent is told to ask
 *              its human to change the response mode rather than to keep going.
 *   RATE       a per person hourly ceiling, so "sparingly" is a number and not
 *              a hope.
 *
 * Every refusal below carries an INSTRUCTION, not just a reason. An agent that
 * is told "too long" writes the same message again; an agent that is told
 * "cut it to 1200 characters and put the ask in the subject" fixes it.
 *
 * Pure and import-free so `test/load-ts.cjs` can take it directly.
 */

/**
 * What the message is FOR. Four, because a fifth always turns out to be one of
 * these four with a different mood, and because the receiving side routes on
 * it: an `ask` may become work, an `inform` never does.
 */
export type MessageAct = 'ask' | 'answer' | 'inform' | 'handoff';
export const MESSAGE_ACTS: readonly MessageAct[] = ['ask', 'answer', 'inform', 'handoff'];

export interface DraftMessage {
  /** One line. What this is about, readable in a list without opening it. */
  subject: string;
  /** Markdown. Rendered as Markdown at both ends. */
  body: string;
  act: MessageAct;
  /** True only when the sender genuinely cannot proceed without an answer.
   *  An `inform` that wants a reply is an `ask` that is embarrassed about it. */
  expectsReply: boolean;
}

/**
 * The caps. Deliberately tight.
 *
 * 1200 characters is about 200 words, which is a paragraph and a code block,
 * and it is enough for every real cross machine message we have seen. An agent
 * that cannot say it in 1200 characters is sending a document, and a document
 * belongs behind a file share link, not in a message body.
 */
export const MESSAGE_LIMITS = {
  subject: 80,
  subjectMin: 3,
  body: 1200,
  bodyMin: 1,
  bodyLines: 24,
  codeBlocks: 2
} as const;

/**
 * TURN BUDGET. Four entries in a thread: the ask, the answer, one round of
 * clarification. The fifth is where a conversation starts, and a conversation
 * is the thing this budget exists to prevent.
 */
export const DEFAULT_TURN_BUDGET = 4;

/** Messages one of my agents may send to ONE other person per hour, and open
 *  threads it may hold with them at once. Both are per person, not global: a
 *  team of eight should not have its eighth conversation refused because the
 *  first seven were busy. */
export const MESSAGE_RATE = { perHour: 6, openThreads: 3 } as const;

export type ViolationCode =
  | 'subject-missing'
  | 'subject-long'
  | 'body-missing'
  | 'body-long'
  | 'body-lines'
  | 'body-code-blocks'
  | 'act-unknown'
  | 'turn-budget'
  | 'rate-hour'
  | 'open-threads'
  | 'they-not-receiving'
  | 'you-not-sending';

export interface Violation {
  code: ViolationCode;
  /** What the agent must DO about it. One sentence, imperative, no dashes. */
  fix: string;
}

/**
 * The sentence an agent is given when the channel is closed to it for a reason
 * the agent cannot fix by rewriting. It names the one action that actually
 * unblocks the work, which is asking the person sitting at the machine.
 */
export const ASK_THE_HUMAN =
  'Stop messaging and ask your human to change the response mode for this person in Team, right sidebar.';

/**
 * The same dead end, said to the person who is sitting at the machine.
 *
 * `ASK_THE_HUMAN` tells an agent to go and find its human. At the composer the
 * human IS the sender, and telling them to ask themselves reads as a bug. So
 * the caller says which one it is and gets the sentence that fits.
 */
export const CHANGE_IT_YOURSELF =
  'This thread is finished. Start a new one with a new subject, or widen this person in Team, right sidebar.';

export type Sender = 'agent' | 'person';

function budgetAdvice(sender: Sender): string {
  return sender === 'person' ? CHANGE_IT_YOURSELF : ASK_THE_HUMAN;
}

/**
 * The two policy refusals, in the same shape as everything else, so a caller
 * never has to write refusal copy of its own.
 *
 * These exist because the alternative was `teamsBridge` inventing sentences at
 * the point of refusal, and the sentence it had been shipping leaked the word
 * "strict" at agents, which is this app's own jargon for a setting that no
 * longer exists.
 */
export function policyBlock(kind: 'they-not-receiving' | 'you-not-sending', who: string): Violation {
  if (kind === 'you-not-sending') {
    return {
      code: 'you-not-sending',
      fix: `You are set to receive only, so nothing you write to ${who} will leave this machine. Ask your human to allow sending in Team, right sidebar.`
    };
  }
  return {
    code: 'they-not-receiving',
    fix: `${who} is not accepting messages right now. Do not retry. Carry on without them, or ask your human to reach them another way.`
  };
}

function countLines(body: string): number {
  return body.replace(/\r\n?/g, '\n').split('\n').length;
}

function countCodeBlocks(body: string): number {
  const fences = body.match(/^\s{0,3}(?:`{3,}|~{3,})/gm);
  return fences ? Math.floor(fences.length / 2) + (fences.length % 2) : 0;
}

/**
 * Everything wrong with a draft, in one pass, so an agent fixing a message is
 * told all of it at once rather than discovering the next problem after each
 * rewrite. Empty array means it may be sent.
 */
export function validateMessage(draft: DraftMessage): Violation[] {
  const out: Violation[] = [];
  const subject = (draft.subject ?? '').trim();
  const body = (draft.body ?? '').trim();

  if (subject.length < MESSAGE_LIMITS.subjectMin) {
    out.push({ code: 'subject-missing', fix: 'Give the message a subject that says what it is about in a few words.' });
  } else if (subject.length > MESSAGE_LIMITS.subject) {
    out.push({ code: 'subject-long', fix: `Cut the subject to ${MESSAGE_LIMITS.subject} characters. Move the detail into the body.` });
  }

  if (body.length < MESSAGE_LIMITS.bodyMin) {
    out.push({ code: 'body-missing', fix: 'Write a body. A subject on its own is not a message.' });
  } else {
    if (body.length > MESSAGE_LIMITS.body) {
      out.push({ code: 'body-long', fix: `Cut the body to ${MESSAGE_LIMITS.body} characters. Lead with the ask, drop the background, and share a file link instead of pasting the file.` });
    }
    if (countLines(body) > MESSAGE_LIMITS.bodyLines) {
      out.push({ code: 'body-lines', fix: `Cut the body to ${MESSAGE_LIMITS.bodyLines} lines. Use a short list, not a report.` });
    }
    if (countCodeBlocks(body) > MESSAGE_LIMITS.codeBlocks) {
      out.push({ code: 'body-code-blocks', fix: `Send at most ${MESSAGE_LIMITS.codeBlocks} code blocks. Share a file link for anything longer.` });
    }
  }

  if (!MESSAGE_ACTS.includes(draft.act)) {
    out.push({ code: 'act-unknown', fix: `Set act to one of ${MESSAGE_ACTS.join(', ')}.` });
  }

  return out;
}

/** The one line a UI or an agent shows for a refusal. Joined rather than
 *  numbered, because the list is short by construction. */
export function explainViolations(violations: readonly Violation[]): string {
  return violations.map((v) => v.fix).join(' ');
}

/**
 * A thread's remaining turns. `entries` is the local thread record, in order.
 *
 * Counted over the WHOLE thread, both sides, because the budget is on the
 * conversation and not on either party. A thread reopened after a week is
 * still the same thread and still spent its turns; if the work is genuinely
 * new it deserves a new subject, which is a new thread.
 */
export function turnsLeft(entryCount: number, budget = DEFAULT_TURN_BUDGET): number {
  return Math.max(0, budget - entryCount);
}

/**
 * WHAT COUNTS AS A TURN (0.4.11). Every entry, both sides, EXCEPT your own
 * sends marked `failed`.
 *
 * A failed send never left this machine: the other person read nothing, so no
 * part of a conversation was bought. Counting it meant a relay outage could
 * spend the whole thread on messages nobody received, and the composer then
 * closed over turns that were never taken. The rule is exactly
 * `from === 'you' && delivery === 'failed'`: an entry still `sending` or
 * `queued` is on its way and counts, and the peer's entries always count,
 * because an entry from them exists here only if it was delivered here.
 *
 * The shape is the two fields the rule reads, so the thread store's entries
 * and the renderer's rows both fit it without either importing the other.
 */
export interface BudgetEntry {
  /** `you` for this machine's own sends; the teammate's id for theirs. */
  from: string;
  /** The store's delivery state. Absent on fixture rows, which then count. */
  delivery?: string;
}

export function countsTowardBudget(entry: BudgetEntry): boolean {
  return !(entry.from === 'you' && entry.delivery === 'failed');
}

/** The entry count `turnsLeft` and `checkRate` are fed for a real thread.
 *  Kept beside the rule it applies so a caller cannot count another way. */
export function turnsUsed(entries: readonly BudgetEntry[]): number {
  return entries.filter(countsTowardBudget).length;
}

export interface RateState {
  /** Messages already sent to this person in the last hour. */
  sentLastHour: number;
  /** Threads with this person that are still expecting a reply. */
  openThreads: number;
  /** Entries already in the thread this draft would join. Zero for a new one. */
  threadEntries: number;
  /** Who is sending. The caps are the same for both; only the advice differs,
   *  because a person cannot go and ask their human. Defaults to `agent`,
   *  which is the stricter reading and the common case. */
  sender?: Sender;
}

/**
 * The checks that depend on history rather than on the text. Separate from
 * `validateMessage` because an agent can fix a long body and cannot fix a
 * spent budget, and the two deserve different advice: the first says rewrite,
 * the second says stop and ask the human.
 */
export function checkRate(state: RateState, budget = DEFAULT_TURN_BUDGET): Violation[] {
  const out: Violation[] = [];
  const advice = budgetAdvice(state.sender ?? 'agent');
  if (state.threadEntries >= budget) {
    out.push({ code: 'turn-budget', fix: `This thread has used its ${budget} turns. ${advice}` });
  }
  if (state.sentLastHour >= MESSAGE_RATE.perHour) {
    out.push({ code: 'rate-hour', fix: `You have sent ${MESSAGE_RATE.perHour} messages to this person in the last hour. Wait, or ${advice.charAt(0).toLowerCase()}${advice.slice(1)}` });
  }
  if (state.openThreads >= MESSAGE_RATE.openThreads) {
    out.push({ code: 'open-threads', fix: `You already have ${MESSAGE_RATE.openThreads} threads open with this person. Close one before starting another.` });
  }
  return out;
}

/**
 * THE BRIEF AN AGENT IS GIVEN about this channel. Injected wherever an agent
 * learns it can reach another person, so the rules arrive with the capability
 * rather than as a refusal after the fact.
 *
 * Kept here, beside the numbers it quotes, so the two can never disagree.
 */
export function crossUserBrief(): string {
  return [
    'MESSAGING ANOTHER PERSON ON THIS TEAM',
    '',
    'Use it sparingly. Prefer one message that stands on its own over a conversation.',
    `Every message needs a subject of at most ${MESSAGE_LIMITS.subject} characters and a Markdown body of at most ${MESSAGE_LIMITS.body} characters over at most ${MESSAGE_LIMITS.bodyLines} lines.`,
    'Lead with the ask or the answer. Put context after it, only if it changes what they do.',
    `Set act to one of ${MESSAGE_ACTS.join(', ')}. Set expectsReply only when you genuinely cannot continue without their answer.`,
    `A thread gets ${DEFAULT_TURN_BUDGET} turns in total, both sides counted. Do not spend them on acknowledgements.`,
    `You may send at most ${MESSAGE_RATE.perHour} messages an hour to one person.`,
    'To share a file, create a share link. Never paste a file into a message.',
    ASK_THE_HUMAN
  ].join('\n');
}
