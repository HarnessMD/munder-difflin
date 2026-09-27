/**
 * WHAT A MEMORY SEARCH HIT HAS TO DO WITH THE WORK, as arithmetic
 * (v0.4.9 phase 5, founder 3 Sep 2026).
 *
 * He searched memory, got a list of bare excerpts, and could not tell what any
 * of them had to do with anything: "a hit should show the tickets that
 * involved it, the agents on those tickets, and the god and human messages".
 *
 * So the joining lives HERE, free of React and free of any door, and the
 * screen is only the drawing of it. Three rules run the whole module:
 *
 *   1. A LINK IS EVIDENCE, NEVER A GUESS. A ticket is attached to a hit
 *      because the note names its id, or because the ticket's own text
 *      carries the words that were searched for. Nothing else counts, and
 *      every link says which of the two it was, so the screen can print the
 *      reason next to the card rather than asserting a relationship.
 *
 *   2. IDS ARE MATCHED AGAINST THE LEDGER, NOT A PATTERN. Task ids in this
 *      app are free-form slugs ("razorpay-key-hygiene"), so there is nothing
 *      to recognise by shape. `taskIdsIn` (inboxThread.ts) already matches
 *      against the ids that exist, longest first, on word boundaries. It is
 *      reused rather than rewritten: two copies of that rule is two answers
 *      to "does this text name a ticket".
 *
 *   3. NOTHING JOINED IS A RESULT. A hit that touches no ticket and no
 *      message returns empty lists and says so. An invented connection is
 *      worse than a blank, and a blank box explains nothing.
 *
 * The types below are the SMALLEST shape each fact needs, the way
 * boardMoves.ts takes three fields off a card. The renderer's HiveTask,
 * FloorMessage and Agent all satisfy them without conversion.
 */
import { taskIdsIn } from './inboxThread';

/* ---- the shapes ---------------------------------------------------------- */

/** One row from the substring scan over every memory.md. `source` is the
 *  agent's id followed by the file, e.g. `angela/memory.md`. */
export interface MemoryHit {
  source: string;
  excerpt: string;
}

/** A ledger card, reduced to what a link needs. */
export interface SearchTask {
  id: string;
  title: string;
  description?: string;
  assignee?: string;
  status: string;
  result?: string;
}

/** A routed message, reduced to what a link needs. */
export interface SearchMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  created_at: string;
}

/** A roster member, reduced to what a name match needs. */
export interface SearchAgent {
  id: string;
  name: string;
  isGod?: boolean;
}

/** The person, as the message ledger addresses them. */
export const HUMAN_PARTY = 'human';

/** The orchestrator's id before anyone renames the agent. Only ever a
 *  fallback: `godPartyOf` prefers the roster, because a rename changes the
 *  NAME and not the id, and a roster with no orchestrator in it yet is a real
 *  state during boot. */
export const DEFAULT_GOD_PARTY = 'god';

/** Why a ticket or a message is attached to a hit. Printed, never hidden. */
export type LinkVia = 'named' | 'words';

export interface TaskLink {
  task: SearchTask;
  via: LinkVia;
}

export interface MessageLink {
  message: SearchMessage;
  via: LinkVia;
}

/** Everything one hit turned out to be connected to. */
export interface HitJoin {
  /** Whose memory the hit came from, when that agent is on the roster. */
  agentId: string | null;
  /** Tickets that name it, then tickets whose own text carries the words. */
  tasks: TaskLink[];
  /** The hit's own agent first, then the assignees of those tickets. */
  agentIds: string[];
  /** Messages with the orchestrator or the person at one end, newest first. */
  messages: MessageLink[];
  /** Nothing joined. The screen says so rather than drawing an empty box. */
  empty: boolean;
}

/* ---- small parts --------------------------------------------------------- */

/** The orchestrator's id: the roster's, or the default while the roster is
 *  still filling. */
export function godPartyOf(roster: SearchAgent[]): string {
  return roster.find((a) => a.isGod)?.id ?? DEFAULT_GOD_PARTY;
}

/** True when the orchestrator or the person is at one end of the message.
 *  Agent to agent traffic is real, but it is not what he asked to see. */
export function isDeskMessage(message: SearchMessage, godParty: string): boolean {
  for (const party of [message.from, message.to]) {
    if (party === HUMAN_PARTY || party === godParty) return true;
  }
  return false;
}

/** Whose memory a hit came from. The scan reports `agentId/file`, so the
 *  first segment is the id; a source with no segment is not an agent's. */
export function hitAgentId(hit: MemoryHit): string | null {
  const first = hit.source.replace(/^[\\/]+/, '').split(/[\\/]/)[0]?.trim();
  return first ? first : null;
}

/**
 * A stable identity for a hit, so a selection survives a re-poll.
 *
 * The scan returns no id of its own and the same file can hold two matches,
 * so the identity has to be the file plus the text. Whitespace is folded
 * because the excerpt is re-cut on every scan and a re-wrapped line is the
 * same hit.
 */
export function hitKey(hit: MemoryHit): string {
  return `${hit.source}::${hit.excerpt.replace(/\s+/g, ' ').trim().slice(0, 160)}`;
}

/** Everything on a card a search phrase could honestly match. */
function taskText(task: SearchTask): string {
  return `${task.id}\n${task.title}\n${task.description ?? ''}\n${task.result ?? ''}`;
}

/** Case-insensitive containment of the whole trimmed phrase. Deliberately not
 *  a per-word match: "auth key" matching a card that says "author" and
 *  "keyboard" somewhere is the invented connection rule 1 forbids. */
function carries(text: string, needle: string): boolean {
  const q = needle.trim().toLowerCase();
  return q.length > 0 && text.toLowerCase().includes(q);
}

/* ---- the join ------------------------------------------------------------ */

/**
 * What one hit is connected to.
 *
 * Order is the argument. Tickets the note NAMES come first, in the order the
 * note names them, because an id written into a memory file is the strongest
 * statement of relevance the workspace has. Tickets that merely carry the
 * searched words follow, in ledger order. Messages are newest first: they are
 * evidence, not a thread to read forwards.
 */
export function joinHit(input: {
  hit: MemoryHit;
  query: string;
  tasks: SearchTask[];
  messages: SearchMessage[];
  roster: SearchAgent[];
}): HitJoin {
  const { hit, query, tasks, messages, roster } = input;
  const owner = hitAgentId(hit);
  const agentId = owner && roster.some((a) => a.id === owner) ? owner : null;

  const byId = new Map(tasks.map((x) => [x.id, x]));
  const namedIds = taskIdsIn(`${hit.source}\n${hit.excerpt}`, tasks.map((x) => x.id));
  const named: TaskLink[] = [];
  for (const id of namedIds) {
    const task = byId.get(id);
    if (task) named.push({ task, via: 'named' });
  }
  const claimed = new Set(named.map((l) => l.task.id));
  const byWords: TaskLink[] = tasks
    .filter((x) => !claimed.has(x.id) && carries(taskText(x), query))
    .map((task) => ({ task, via: 'words' as const }));
  const taskLinks = [...named, ...byWords];

  // The hit's own agent is on this first: it is the one relationship the scan
  // itself proved. Assignees follow, deduplicated, roster members only.
  const agentIds: string[] = [];
  const push = (id: string | undefined | null) => {
    if (!id || agentIds.includes(id) || !roster.some((a) => a.id === id)) return;
    agentIds.push(id);
  };
  push(agentId);
  for (const link of taskLinks) push(link.task.assignee);

  const godParty = godPartyOf(roster);
  const linkedIds = taskLinks.map((l) => l.task.id);
  const messageLinks: MessageLink[] = [];
  for (const message of messages) {
    if (!isDeskMessage(message, godParty)) continue;
    const text = `${message.subject}\n${message.body}`;
    const names = linkedIds.length > 0 && taskIdsIn(text, linkedIds).length > 0;
    if (names) messageLinks.push({ message, via: 'named' });
    else if (carries(text, query)) messageLinks.push({ message, via: 'words' });
  }
  messageLinks.sort((a, b) => String(b.message.created_at).localeCompare(String(a.message.created_at)));

  return {
    agentId,
    tasks: taskLinks,
    agentIds,
    messages: messageLinks,
    empty: taskLinks.length === 0 && messageLinks.length === 0
  };
}

/* ---- "is this query an agent's name" ------------------------------------- */

/** Below this a name is too short to match inside a sentence without
 *  accidents, so only an exact query counts for it. */
const NAME_MIN = 3;

/**
 * The agent a query names, or null.
 *
 * Two doors, both deliberate:
 *
 *   - the whole query IS the name or the id, whatever its length. Typing "jo"
 *     when an agent is called Jo is not an accident.
 *   - the name or id appears in a longer query on WORD BOUNDARIES, longest
 *     candidate first. "what did angela decide" names Angela; "angelic" does
 *     not, and neither does "ang".
 *
 * A substring match would have made every one-syllable roster name a false
 * positive, which is the difference between 5.3 being a feature and being a
 * coincidence.
 */
export function agentNamed(query: string, roster: SearchAgent[]): SearchAgent | null {
  const q = query.trim().toLowerCase();
  if (!q || roster.length === 0) return null;
  for (const a of roster) {
    if (a.name.trim().toLowerCase() === q || a.id.trim().toLowerCase() === q) return a;
  }
  const boundary = (c: string) => c === '' || !/[\p{L}\p{N}_-]/u.test(c);
  const candidates: { agent: SearchAgent; token: string }[] = [];
  for (const a of roster) {
    for (const token of [a.name, a.id]) {
      const clean = token.trim().toLowerCase();
      if (clean.length >= NAME_MIN) candidates.push({ agent: a, token: clean });
    }
  }
  candidates.sort((x, y) => y.token.length - x.token.length);
  for (const { agent, token } of candidates) {
    let from = 0;
    for (;;) {
      const at = q.indexOf(token, from);
      if (at < 0) break;
      from = at + token.length;
      const before = at > 0 ? q[at - 1] : '';
      const after = at + token.length < q.length ? q[at + token.length] : '';
      if (boundary(before) && boundary(after)) return agent;
    }
  }
  return null;
}

/** What the workspace holds about one agent: the tickets it is on and the
 *  messages it sent or received. Newest first in both cases. */
export interface AgentDossier {
  agentId: string;
  tasks: SearchTask[];
  messages: SearchMessage[];
}

export function agentDossier(agentId: string, tasks: SearchTask[], messages: SearchMessage[]): AgentDossier {
  return {
    agentId,
    tasks: tasks.filter((x) => x.assignee === agentId),
    messages: messages
      .filter((m) => m.from === agentId || m.to === agentId)
      .slice()
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
  };
}

/* ---- handing a selection to an agent ------------------------------------- */

/**
 * The message the person sends with the results they picked.
 *
 * Their own words go FIRST. Everything after them is quoted evidence from
 * memory files, which is to say text an agent wrote, and an instruction that
 * arrives after the material it is about has already been talked over. The
 * same rule the webhook briefing follows, for the same reason.
 *
 * Each result is its file and its text, verbatim apart from folded
 * whitespace. Nothing is summarised: the person picked these lines because of
 * what they say.
 */
export function selectionMessage(hits: MemoryHit[], query: string, prompt: string): string {
  const lines: string[] = [];
  const head = prompt.trim();
  if (head) lines.push(head, '');
  const q = query.trim();
  lines.push(q
    ? `Here is what I picked out of a memory search for "${q}". Each entry is the memory file it came from and what that file says.`
    : 'Here is what I picked out of a memory search. Each entry is the memory file it came from and what that file says.');
  lines.push('');
  hits.forEach((hit, i) => {
    lines.push(`${i + 1}. ${hit.source}`);
    lines.push(`   ${hit.excerpt.replace(/\s+/g, ' ').trim()}`);
  });
  return lines.join('\n');
}
