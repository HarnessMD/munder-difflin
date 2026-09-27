/**
 * THE THREE THINGS A MEMORY SEARCH CAN RETURN, as arithmetic
 * (v0.4.10, founder 4 Sep 2026).
 *
 * "The memory section search result should be: list and card view, for three
 * different types of memories: tickets, agents, memories. The graph view
 * should also have the three nodes and items interconnected with each other."
 *
 * Phase 5 answered "what is this hit connected to" (shared/memorySearch.ts).
 * It answered it one hit at a time, so the screen could only ever draw a list
 * of memory notes with evidence hanging off each one. The founder wants the
 * other two axes as first class results: the TICKETS the search reached and
 * the AGENTS the search reached, each drawn the same way, each clickable, each
 * a node on the graph.
 *
 * So this module turns the phase 5 joins inside out. It is pure, React free
 * and copy free: every string it returns came out of the data (a ticket title,
 * an agent name, a note's own words), never out of the product's voice, so a
 * locale never has to reach in here. Counts come back as numbers and the
 * screen writes the sentence.
 *
 * FOUR RULES, and the first three are phase 5's, unchanged:
 *
 *   1. A LINK IS EVIDENCE, NEVER A GUESS. A ticket reaches a memory because
 *      the note names its id or the ticket carries the searched words, which
 *      is joinHit's answer and not a second one. A ticket reaches an agent
 *      because it is assigned to them.
 *   2. IDS ARE MATCHED AGAINST THE LEDGER. `taskIdsIn` is reused for the
 *      graph's ticket to memory edges, for the same reason phase 5 reused it:
 *      two copies of that rule is two answers to "does this text name a
 *      ticket".
 *   3. NOTHING JOINED IS A RESULT. A result with no links says so with an
 *      empty `links` array and a zero count, and the screen prints a sentence.
 *   4. AN ID IS A GRAPH NODE ID. Agents are already their own id and memory
 *      topics are already `topic:…`, so tickets take the one new namespace,
 *      `task:…`. That is what makes "click the node, open the card" a lookup
 *      rather than a second model.
 *
 * Everything here is deterministic: the graph layout is memoised on the node
 * and edge ids, so an unstable order would make the whole stage jump on every
 * five second poll.
 */
import { taskIdsIn } from './inboxThread';
import { hitKey, type HitJoin, type MemoryHit, type SearchAgent, type SearchTask } from './memorySearch';

/* ---- the three types ----------------------------------------------------- */

export type MemoryResultType = 'ticket' | 'agent' | 'memory';

/** The founder's order, and the order the filter draws them in. */
export const MEMORY_RESULT_TYPES: readonly MemoryResultType[] = ['ticket', 'agent', 'memory'];

/** The graph node id namespace for a ticket. */
export const TASK_NODE_PREFIX = 'task:';
/** The graph node id namespace a memory topic already uses (memoryTopics.ts). */
export const TOPIC_NODE_PREFIX = 'topic:';

export function taskNodeId(taskId: string): string {
  return TASK_NODE_PREFIX + taskId;
}

/** The ledger id behind a ticket node, or null when the id is not one. */
export function taskIdOf(nodeId: string): string | null {
  return nodeId.startsWith(TASK_NODE_PREFIX) ? nodeId.slice(TASK_NODE_PREFIX.length) : null;
}

/**
 * Which of the three a graph node is. The two prefixes decide it outright; an
 * unprefixed id is an agent only when the roster actually holds it, so the two
 * pseudo nodes (broadcast, the person) come back null and the rail draws
 * nothing rather than an empty agent card.
 */
export function nodeTypeOf(nodeId: string, roster: SearchAgent[]): MemoryResultType | null {
  if (!nodeId) return null;
  if (nodeId.startsWith(TASK_NODE_PREFIX)) return 'ticket';
  if (nodeId.startsWith(TOPIC_NODE_PREFIX)) return 'memory';
  return roster.some((a) => a.id === nodeId) ? 'agent' : null;
}

/** One thing a result is connected to, already named and already addressable. */
export interface ResultLink {
  type: MemoryResultType;
  /** The graph node id, so a chip can select the node it names. */
  id: string;
  label: string;
}

/**
 * One row in the result list, one card in the card grid, and the body of the
 * right rail. The same shape in all three places is the point: the rail and
 * the card cannot disagree about what a thing is if they read one record.
 */
export interface MemoryResult {
  type: MemoryResultType;
  /** The graph node id, or `hit:<key>` for a raw scan hit, which has no node. */
  id: string;
  /** What a click opens: a ledger id, an agent id, a topic id, a hit key. */
  ref: string;
  title: string;
  /** One line of provenance: the ledger id, the agent id, the memory file. */
  subtitle: string;
  /** The thing's own words. Clamped by the screen, never by this module. */
  excerpt: string;
  /** Ticket status, when the thing has one. Drawn as a chip, never a border. */
  status?: string;
  links: ResultLink[];
  counts: Record<MemoryResultType, number>;
}

/** The smallest shape a memory topic needs to be. memoryTopics.MemoryTopic
 *  satisfies it without conversion, the way SearchTask takes three fields off
 *  a ledger card. */
export interface ModelTopic {
  id: string;
  label: string;
  text: string;
  agentIds: string[];
}

/* ---- small parts --------------------------------------------------------- */

const zero = (): Record<MemoryResultType, number> => ({ ticket: 0, agent: 0, memory: 0 });

function tally(links: ResultLink[]): Record<MemoryResultType, number> {
  const counts = zero();
  for (const l of links) counts[l.type] += 1;
  return counts;
}

/** Markdown ornament off, one space, so a title is words and not syntax. */
function plain(s: string): string {
  return (s ?? '')
    .replace(/```+/g, ' ')
    .replace(/^\s*(?:[-*+•]|\d+[.)])\s+/gm, '')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__|`)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * A title for a note, which has none of its own.
 *
 * The first sentence when there is one, otherwise the opening cut at a word
 * boundary. Deliberately not the first `maxChars` characters: a title that
 * ends mid word reads as a rendering fault rather than as a summary.
 */
export function noteTitle(text: string, maxChars = 64): string {
  const words = plain(text);
  if (!words) return '';
  const stop = words.match(/^(.+?)(?:[.;!?]\s|$)/);
  let head = (stop ? stop[1] : words).trim();
  if (head.length < 3) head = words;
  if (head.length <= maxChars) return head;
  const cut = head.slice(0, maxChars).replace(/\s+\S*$/, '');
  return (cut.length >= 12 ? cut : head.slice(0, maxChars)) + '…';
}

function agentLink(agent: SearchAgent): ResultLink {
  return { type: 'agent', id: agent.id, label: agent.name };
}

function ticketLink(task: SearchTask): ResultLink {
  return { type: 'ticket', id: taskNodeId(task.id), label: task.title || task.id };
}

function memoryLink(id: string, label: string): ResultLink {
  return { type: 'memory', id, label };
}

/** Deduplicate by node id, keeping the first mention: evidence order is the
 *  argument phase 5 makes, and re ordering it would lose that. */
function uniq(links: ResultLink[]): ResultLink[] {
  const seen = new Set<string>();
  const out: ResultLink[] = [];
  for (const l of links) {
    if (seen.has(l.id)) continue;
    seen.add(l.id);
    out.push(l);
  }
  return out;
}

function finish(base: Omit<MemoryResult, 'counts' | 'links'>, links: ResultLink[]): MemoryResult {
  const clean = uniq(links);
  return { ...base, links: clean, counts: tally(clean) };
}

/* ---- one result of each type --------------------------------------------- */

/** A ticket, with the agent it is on and the memories that reach it. */
export function ticketResult(task: SearchTask, roster: SearchAgent[], memories: ResultLink[] = []): MemoryResult {
  const owner = roster.find((a) => a.id === task.assignee);
  return finish({
    type: 'ticket',
    id: taskNodeId(task.id),
    ref: task.id,
    title: task.title || task.id,
    subtitle: task.id,
    excerpt: plain(task.result || task.description || ''),
    status: task.status
  }, [...(owner ? [agentLink(owner)] : []), ...memories]);
}

/**
 * The opening of an agent's memory.md, without the parts the janitor wrote.
 *
 * The seed header (`# Memory — Angela`), the italic subtitle under it and the
 * bullet markers are template, not something the agent knows, so a card that
 * led with them would show every agent saying the same thing.
 */
export function noteSummary(text: string, maxChars = 220): string {
  const lines = (text ?? '')
    .split('\n')
    .map((l) => l.replace(/^[#>\-*\s]+/, '').trim())
    .filter((l) => l && !/^_.*_$/.test(l) && !/^memory\s+[—–]/i.test(l));
  const s = lines.slice(0, 3).join(' ');
  return s.length > maxChars ? s.slice(0, maxChars - 1) + '…' : s;
}

/** An agent, with the tickets it holds and the memories it owns. */
export function agentResult(agent: SearchAgent, tickets: ResultLink[] = [], memories: ResultLink[] = [], note = ''): MemoryResult {
  return finish({
    type: 'agent',
    id: agent.id,
    ref: agent.id,
    title: agent.name,
    subtitle: agent.id,
    excerpt: noteSummary(note)
  }, [...tickets, ...memories]);
}

/** One row of the substring scan, as a result. */
export function memoryResult(hit: MemoryHit, join: HitJoin, roster: SearchAgent[]): MemoryResult {
  const key = hitKey(hit);
  const tickets = join.tasks.map((l) => ticketLink(l.task));
  const people = join.agentIds
    .map((id) => roster.find((a) => a.id === id))
    .filter((a): a is SearchAgent => !!a)
    .map(agentLink);
  return finish({
    type: 'memory',
    id: `hit:${key}`,
    ref: key,
    title: noteTitle(hit.excerpt),
    subtitle: hit.source,
    excerpt: hit.excerpt
  }, [...tickets, ...people]);
}

/** A memory topic, as the graph and the rail see it. */
export function topicResult(topic: ModelTopic, roster: SearchAgent[], tasks: SearchTask[] = []): MemoryResult {
  const people = topic.agentIds
    .map((id) => roster.find((a) => a.id === id))
    .filter((a): a is SearchAgent => !!a)
    .map(agentLink);
  const named = taskIdsIn(`${topic.label}\n${topic.text}`, tasks.map((x) => x.id));
  const tickets = named
    .map((id) => tasks.find((x) => x.id === id))
    .filter((x): x is SearchTask => !!x)
    .map(ticketLink);
  return finish({
    type: 'memory',
    id: topic.id,
    ref: topic.id,
    title: topic.label,
    subtitle: topic.text === topic.label ? '' : topic.text,
    excerpt: topic.text
  }, [...tickets, ...people]);
}

/* ---- the whole result set ------------------------------------------------ */

export interface ClassifyInput {
  /** Phase 5's joins, in the order the scan returned them. */
  joins: { hit: MemoryHit; join: HitJoin }[];
  tasks: SearchTask[];
  roster: SearchAgent[];
  /** Each agent's memory.md, for the agent card's own words. Optional: the
   *  card is honest with an empty excerpt and says nothing rather than filler. */
  notes?: Record<string, string>;
}

/**
 * Every result the search produced, in the founder's order: tickets, then
 * agents, then memories.
 *
 * A ticket appears once however many notes reached it, and carries all of
 * them. An agent appears once however many tickets and notes reached it. A
 * memory is one scan hit. Order inside each type is first reached first,
 * which is the scan's order, which is the order the person's eye already has.
 */
export function classifyResults(input: ClassifyInput): MemoryResult[] {
  const { joins, tasks, roster, notes = {} } = input;
  // The join carries the ledger card it matched, but the ledger polls every
  // fifteen seconds and a join can be a poll behind. The live card wins, so a
  // ticket that moved to done between two frames says done here too.
  const ledger = new Map(tasks.map((x) => [x.id, x]));

  const tickets = new Map<string, { task: SearchTask; memories: ResultLink[] }>();
  const people = new Map<string, { agent: SearchAgent; tickets: ResultLink[]; memories: ResultLink[] }>();
  const memories: MemoryResult[] = [];

  for (const { hit, join } of joins) {
    const card = memoryResult(hit, join, roster);
    memories.push(card);
    const self = memoryLink(card.id, card.title || card.subtitle);

    for (const link of join.tasks) {
      const acc = tickets.get(link.task.id) ?? { task: ledger.get(link.task.id) ?? link.task, memories: [] };
      acc.memories.push(self);
      tickets.set(link.task.id, acc);
    }
    for (const id of join.agentIds) {
      const agent = roster.find((a) => a.id === id);
      if (!agent) continue;
      const acc = people.get(id) ?? { agent, tickets: [], memories: [] };
      acc.memories.push(self);
      people.set(id, acc);
    }
  }

  // An agent holds a ticket because the ledger says so, not because the search
  // did. Walked after the joins so the ticket order is the joins' order.
  for (const [, acc] of tickets) {
    const owner = acc.task.assignee;
    if (!owner) continue;
    const person = people.get(owner);
    if (person) person.tickets.push(ticketLink(acc.task));
  }

  const out: MemoryResult[] = [];
  for (const [, acc] of tickets) out.push(ticketResult(acc.task, roster, acc.memories));
  for (const [, acc] of people) out.push(agentResult(acc.agent, acc.tickets, acc.memories, notes[acc.agent.id] ?? ''));
  out.push(...memories);
  return out;
}

export function filterByType(results: MemoryResult[], type: MemoryResultType): MemoryResult[] {
  return results.filter((r) => r.type === type);
}

export function groupResults(results: MemoryResult[]): Record<MemoryResultType, MemoryResult[]> {
  return { ticket: filterByType(results, 'ticket'), agent: filterByType(results, 'agent'), memory: filterByType(results, 'memory') };
}

export function countResults(results: MemoryResult[]): Record<MemoryResultType, number> {
  const counts = zero();
  for (const r of results) counts[r.type] += 1;
  return counts;
}

/** The type to open on, which is the first one that has anything in it. A
 *  filter that lands on an empty tab makes the person prove the search worked. */
export function firstFilledType(counts: Record<MemoryResultType, number>): MemoryResultType {
  return MEMORY_RESULT_TYPES.find((k) => counts[k] > 0) ?? 'memory';
}

/* ---- the ticket layer of the graph --------------------------------------- */

/** How many tickets the stage draws. The topic cap is 24 (memoryTopics.ts) and
 *  a stage carrying both plus the roster stops being readable past this. */
export const GRAPH_TASK_CAP = 18;

export interface TaskLayerNode {
  /** `task:<ledger id>` */
  id: string;
  taskId: string;
  label: string;
  status: string;
  /** Edges touching it, so the stage can size it the way it sizes an agent. */
  weight: number;
}

export interface TaskLayerEdge {
  id: string;
  /** `task`: an agent to a ticket it works. `mention`: a ticket to a memory
   *  whose note names its id. */
  kind: 'task' | 'mention';
  source: string;
  target: string;
  weight: number;
}

export interface TaskLayer {
  nodes: TaskLayerNode[];
  edges: TaskLayerEdge[];
  shown: number;
  total: number;
}

/** Open work reads before closed work when the cap has to choose. */
const STATUS_RANK: Record<string, number> = { doing: 0, blocked: 1, todo: 2, done: 3 };

/**
 * The tickets the stage draws, and the two edge kinds that tie the three node
 * kinds into one graph.
 *
 * WHICH TICKETS. Connected ones first, because an unconnected ticket on a
 * memory graph is a dot that explains nothing: a ticket with an agent on the
 * roster and a ticket a note names both count as connected. Then open before
 * closed, then the ledger id, which makes the whole thing deterministic and
 * keeps the layout still across a poll.
 */
export function taskLayer(input: {
  tasks: SearchTask[];
  topics: ModelTopic[];
  roster: SearchAgent[];
  cap?: number;
}): TaskLayer {
  const { tasks, topics, roster, cap = GRAPH_TASK_CAP } = input;
  const ids = tasks.map((x) => x.id);
  const onRoster = new Set(roster.map((a) => a.id));

  // ticket id to the topics that name it, and the reverse, both from one pass
  // over the notes, using the ledger's own ids as the dictionary.
  const mentions = new Map<string, string[]>();
  for (const topic of topics) {
    for (const id of taskIdsIn(`${topic.label}\n${topic.text}`, ids)) {
      const arr = mentions.get(id) ?? [];
      arr.push(topic.id);
      mentions.set(id, arr);
    }
  }

  const rank = (task: SearchTask): number => {
    const linked = (task.assignee && onRoster.has(task.assignee) ? 1 : 0) + (mentions.get(task.id)?.length ?? 0);
    return linked > 0 ? 0 : 1;
  };
  const ordered = [...tasks].sort((a, b) =>
    rank(a) - rank(b)
    || (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9)
    || a.id.localeCompare(b.id));

  const kept = ordered.filter((x) => rank(x) === 0).slice(0, cap);
  const topicIds = new Set(topics.map((x) => x.id));

  const nodes: TaskLayerNode[] = [];
  const edges: TaskLayerEdge[] = [];
  for (const task of kept) {
    const node = taskNodeId(task.id);
    let weight = 0;
    if (task.assignee && onRoster.has(task.assignee)) {
      edges.push({ id: `task:${task.assignee}\u0000${node}`, kind: 'task', source: task.assignee, target: node, weight: 1 });
      weight += 1;
    }
    for (const topicId of mentions.get(task.id) ?? []) {
      if (!topicIds.has(topicId)) continue;
      edges.push({ id: `mention:${node}\u0000${topicId}`, kind: 'mention', source: node, target: topicId, weight: 1 });
      weight += 1;
    }
    nodes.push({ id: node, taskId: task.id, label: task.title || task.id, status: task.status, weight: Math.max(1, weight) });
  }

  return { nodes, edges, shown: nodes.length, total: ordered.filter((x) => rank(x) === 0).length };
}

/* ---- the resizable rail -------------------------------------------------- */

/**
 * The right rail's width, in pixels.
 *
 * The floor is the narrowest a ticket title and a status chip can sit on one
 * line without the chip wrapping under it. The ceiling stops a drag from
 * eating the stage: the graph needs room or it is a pile of dots.
 */
export const RAIL_MIN = 280;
export const RAIL_MAX = 720;
export const RAIL_DEFAULT = 340;
/** One arrow key press. Coarse enough to cross the range in a few seconds,
 *  fine enough to land on a width the person meant. */
export const RAIL_STEP = 24;

export function clampRail(px: number, min: number = RAIL_MIN, max: number = RAIL_MAX): number {
  if (!Number.isFinite(px)) return RAIL_DEFAULT;
  return Math.round(Math.min(Math.max(px, min), Math.max(min, max)));
}

/** What a drag or an arrow key asks for, given where it started. `delta` is
 *  positive when the handle moved LEFT, because that is the direction that
 *  makes the rail wider. */
export function railWidthFrom(startWidth: number, delta: number, min: number = RAIL_MIN, max: number = RAIL_MAX): number {
  return clampRail(startWidth + delta, min, max);
}
