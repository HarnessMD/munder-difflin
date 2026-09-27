// v0.4.10 W6: the Memory screen's three result types, the three node kinds on
// the stage, the one card that draws any of them, and the rail you can drag.
//
// The founder, 4 Sep 2026: "The memory section search result should be list and
// card view, for three different types of memories: tickets, agents, memories.
// The graph view should also have the three nodes and items interconnected with
// each other, agent has a node image, similarly design ticket image for ticket
// related nodes, and similarly for memories. When clicked on a particular item
// in the graph it should open that in the right sidebar, the content of card
// need to be structured and responsive and readable (make the right sidebar
// drag to resize horizontally)."
//
// Every rule worth testing lives in shared/memoryGraphModel.ts, which is React
// free, so most of this file is behaviour and not structure. The structural
// half pins what the founder can SEE: both layouts exist, one card component
// serves the grid and the rail, the excerpt is clamped in the source, the rail
// is a splitter rather than a fixed column, and the stage draws a mark per kind.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const ROOT = path.join(__dirname, '..');
const PRO = 'src/renderer/src/components/pro';
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const G = loadTs('src/shared/memoryGraphModel.ts');
const S = loadTs('src/shared/memorySearch.ts');
const ml = loadTs(`${PRO}/memoryLayout.ts`);

const screen = strip(read(`${PRO}/MemoryScreen.tsx`));
const splitter = strip(read(`${PRO}/Splitter.tsx`));
const graphSrc = read('src/renderer/src/components/memoryGraph/buildGraph.ts');

const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v, `${p}${k}.`) : [[`${p}${k}`, v]]));
const locale = (l) => new Map(flat(JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`))));

/* ---- fixtures, shaped like the real ledgers ------------------------------- */

const ROSTER = [
  { id: 'god', name: 'Nova', isGod: true },
  { id: 'angela', name: 'Angela' },
  { id: 'jim', name: 'Jim' }
];

const TASKS = [
  { id: 'razorpay-key-hygiene', title: 'Rotate the payment keys', description: 'The old key is in two repos.', assignee: 'angela', status: 'doing' },
  { id: 'invoice-pdf', title: 'Invoice PDF footer', description: 'Legal wants the address on it.', assignee: 'jim', status: 'todo' },
  { id: 'orphan-card', title: 'Nobody is on this', description: 'No assignee, nothing names it.', status: 'todo' },
  { id: 'closed-card', title: 'Already finished', assignee: 'jim', status: 'done', result: 'Shipped on Tuesday.' }
];

const TOPICS = [
  { id: 'topic:pinned:keys', label: 'Key rotation', text: 'razorpay-key-hygiene is the card that tracks the rotation.', agentIds: ['angela'] },
  { id: 'topic:recent:legal', label: 'Legal review', text: 'Legal signed off on the footer wording.', agentIds: ['jim', 'angela'] },
  { id: 'topic:pinned:lonely', label: 'Nothing names this', text: 'A note with no ticket in it.', agentIds: [] }
];

const HIT_A = { source: 'angela/memory.md', excerpt: 'razorpay-key-hygiene is the card that tracks the rotation. It is not done.' };
const HIT_B = { source: 'jim/memory.md', excerpt: 'Legal signed off on the footer wording.' };
const HIT_NONE = { source: 'jim/memory.md', excerpt: 'A stray thought about nothing at all.' };

const joinOf = (hit, query) => ({ hit, join: S.joinHit({ hit, query, tasks: TASKS, messages: [], roster: ROSTER }) });

/* ---- 1. the three types are one axis, decided in one place ---------------- */

test('the three result types are tickets, agents and memories, in that order', () => {
  assert.deepEqual([...G.MEMORY_RESULT_TYPES], ['ticket', 'agent', 'memory'], "the founder's own order");
});

test('classifyResults turns per hit joins into typed records, tickets first', () => {
  const joins = [joinOf(HIT_A, 'razorpay-key-hygiene'), joinOf(HIT_B, 'footer')];
  const out = G.classifyResults({ joins, tasks: TASKS, roster: ROSTER, notes: {} });
  const kinds = [...new Set(out.map((r) => r.type))];
  assert.deepEqual(kinds, ['ticket', 'agent', 'memory'], 'each type is a contiguous run, in the founder’s order');

  const counts = G.countResults(out);
  assert.equal(counts.memory, 2, 'one memory result per scan hit');
  assert.ok(counts.ticket >= 1 && counts.agent >= 1, 'the search reached at least one ticket and one agent');

  const grouped = G.groupResults(out);
  assert.deepEqual(grouped.memory.map((r) => r.ref), [S.hitKey(HIT_A), S.hitKey(HIT_B)], 'a memory keeps the hit key, so a pick survives a re-poll');
  for (const r of out) assert.ok(r.id && r.title !== undefined && r.subtitle !== undefined, `${r.type} has an id, a title and a subtitle`);
});

test('a ticket appears once however many notes reached it, and carries all of them', () => {
  const twice = [joinOf(HIT_A, 'razorpay-key-hygiene'), joinOf({ source: 'jim/memory.md', excerpt: 'razorpay-key-hygiene again from another desk.' }, 'razorpay-key-hygiene')];
  const out = G.classifyResults({ joins: twice, tasks: TASKS, roster: ROSTER });
  const tickets = G.filterByType(out, 'ticket').filter((r) => r.ref === 'razorpay-key-hygiene');
  assert.equal(tickets.length, 1, 'one record per ledger id, never one per mention');
  assert.equal(tickets[0].counts.memory, 2, 'and it carries both notes');
  assert.equal(tickets[0].status, 'doing', 'the status rides on the record, for a chip and never a border');
  assert.ok(tickets[0].links.some((l) => l.type === 'agent' && l.id === 'angela'), 'plus the agent the ledger put on it');
});

test('an agent carries the tickets it holds and the memories it owns', () => {
  const out = G.classifyResults({ joins: [joinOf(HIT_A, 'razorpay-key-hygiene')], tasks: TASKS, roster: ROSTER, notes: { angela: '# Memory — Angela\n_seeded_\n\nAngela keeps the payment keys.' } });
  const angela = G.filterByType(out, 'agent').find((r) => r.ref === 'angela');
  assert.ok(angela, 'the hit came out of her file, so she is a result');
  assert.equal(angela.title, 'Angela');
  assert.ok(angela.links.some((l) => l.type === 'ticket' && l.id === 'task:razorpay-key-hygiene'));
  assert.ok(angela.links.some((l) => l.type === 'memory'));
  assert.ok(/keeps the payment keys/.test(angela.excerpt), 'the card shows her own words');
  assert.ok(!/Memory —|seeded/.test(angela.excerpt), 'and not the header the janitor wrote into every file');
});

test('a hit joined to nothing invents no ticket, and a topic joined to nothing says so', () => {
  const out = G.classifyResults({ joins: [joinOf(HIT_NONE, 'nothing at all')], tasks: TASKS, roster: ROSTER });
  const memories = G.filterByType(out, 'memory');
  assert.equal(memories.length, 1);
  assert.equal(G.countResults(out).ticket, 0, 'no ticket is conjured out of a miss');
  assert.deepEqual(memories[0].links, [{ type: 'agent', id: 'jim', label: 'Jim' }],
    'the one link left is the desk the note came off, which the scan itself proved');
  assert.equal(memories[0].counts.ticket, 0);
  // The empty state the card draws in words is reachable: a note nobody owns
  // and no ticket names.
  const lonely = G.topicResult(TOPICS[2], ROSTER, TASKS);
  assert.deepEqual(lonely.links, [], 'an invented connection is worse than a blank');
  assert.deepEqual(lonely.counts, { ticket: 0, agent: 0, memory: 0 });
});

test('the type filter lands on a type that has something in it', () => {
  assert.equal(G.firstFilledType({ ticket: 0, agent: 0, memory: 3 }), 'memory');
  assert.equal(G.firstFilledType({ ticket: 2, agent: 9, memory: 3 }), 'ticket');
  assert.equal(G.firstFilledType({ ticket: 0, agent: 0, memory: 0 }), 'memory', 'an empty set falls back rather than throwing');
});

/* ---- 2. one namespace for the three kinds of node ------------------------- */

test('a node id says which of the three it is, and the two pseudo nodes say neither', () => {
  assert.equal(G.taskNodeId('invoice-pdf'), 'task:invoice-pdf');
  assert.equal(G.taskIdOf('task:invoice-pdf'), 'invoice-pdf');
  assert.equal(G.taskIdOf('angela'), null);
  assert.equal(G.nodeTypeOf('task:invoice-pdf', ROSTER), 'ticket');
  assert.equal(G.nodeTypeOf('topic:pinned:keys', ROSTER), 'memory');
  assert.equal(G.nodeTypeOf('angela', ROSTER), 'agent');
  assert.equal(G.nodeTypeOf('human', ROSTER), null, 'the person is not an agent card');
  assert.equal(G.nodeTypeOf('broadcast', ROSTER), null);
  assert.equal(G.nodeTypeOf('ghost', ROSTER), null, 'an id off the roster opens nothing');
});

/* ---- 3. the ticket layer ties the three kinds into one graph -------------- */

test('the stage draws only tickets that are joined to something, and says why each edge exists', () => {
  const layer = G.taskLayer({ tasks: TASKS, topics: TOPICS, roster: ROSTER });
  const ids = layer.nodes.map((n) => n.taskId);
  assert.ok(!ids.includes('orphan-card'), 'a ticket with no agent and no note is a dot that explains nothing');
  assert.ok(ids.includes('razorpay-key-hygiene') && ids.includes('invoice-pdf'));

  const assign = layer.edges.filter((e) => e.kind === 'task');
  assert.ok(assign.some((e) => e.source === 'angela' && e.target === 'task:razorpay-key-hygiene'), 'an agent reaches the tickets it works');
  const mention = layer.edges.filter((e) => e.kind === 'mention');
  assert.deepEqual(mention.map((e) => [e.source, e.target]), [['task:razorpay-key-hygiene', 'topic:pinned:keys']],
    'a ticket reaches a memory only when the note NAMES its id');
  for (const e of layer.edges) assert.ok(e.source !== e.target && e.id, 'every edge has two ends and an id');
});

test('the ticket layer is deterministic and capped, so the layout does not jump on a poll', () => {
  const a = G.taskLayer({ tasks: TASKS, topics: TOPICS, roster: ROSTER });
  const b = G.taskLayer({ tasks: [...TASKS].reverse(), topics: TOPICS, roster: ROSTER });
  assert.deepEqual(a.nodes.map((n) => n.id), b.nodes.map((n) => n.id), 'ledger order must not move the stage');
  assert.deepEqual(a.edges.map((e) => e.id), b.edges.map((e) => e.id));

  const many = Array.from({ length: 40 }, (_, i) => ({ id: `card-${String(i).padStart(2, '0')}`, title: `Card ${i}`, assignee: 'jim', status: 'todo' }));
  const capped = G.taskLayer({ tasks: many, topics: [], roster: ROSTER, cap: 5 });
  assert.equal(capped.nodes.length, 5);
  assert.equal(capped.shown, 5);
  assert.equal(capped.total, 40, 'the total is what the notice counts against');
  assert.ok(G.GRAPH_TASK_CAP >= 6 && G.GRAPH_TASK_CAP <= 30, 'a readable default cap');
});

test('open work reads before closed work when the cap has to choose', () => {
  const layer = G.taskLayer({ tasks: TASKS, topics: TOPICS, roster: ROSTER, cap: 2 });
  assert.ok(!layer.nodes.some((n) => n.taskId === 'closed-card'), 'a done card yields to a card someone is on');
});

/* ---- 4. the card's own text rules ----------------------------------------- */

test('a note title is the first sentence, cut on a word boundary and never mid word', () => {
  assert.equal(G.noteTitle('Rotate the keys. Then tell legal.'), 'Rotate the keys');
  assert.equal(G.noteTitle('**bold** and `code` and a [link](http://x)'), 'bold and code and a link', 'markdown ornament is not a title');
  const long = G.noteTitle('a'.repeat(10) + ' ' + 'b'.repeat(200), 40);
  assert.ok(long.endsWith('…') && long.length <= 41);
  assert.ok(!/\s$/.test(long.slice(0, -1)), 'no trailing space before the ellipsis');
  assert.equal(G.noteTitle(''), '', 'nothing in, nothing out, never a placeholder');
});

test('an agent summary drops the seed header and keeps three lines of what it knows', () => {
  const text = '# Memory — Jim\n_written by the janitor_\n\n- Jim owns invoicing.\n- Legal reviewed the footer.\n- The PDF ships Friday.\n- A fourth line nobody sees.';
  const s = G.noteSummary(text);
  assert.ok(s.startsWith('Jim owns invoicing.'));
  assert.ok(!/Memory|janitor/.test(s));
  assert.ok(!/fourth line/.test(s), 'three lines, then it stops');
});

/* ---- 5. the rail width is arithmetic, shared by the drag and the keys ----- */

test('the rail clamps, rounds, and widens when the handle goes left', () => {
  assert.ok(G.RAIL_MIN < G.RAIL_DEFAULT && G.RAIL_DEFAULT < G.RAIL_MAX);
  assert.equal(G.clampRail(10), G.RAIL_MIN, 'a drag past the floor stops at the floor');
  assert.equal(G.clampRail(99999), G.RAIL_MAX, 'and never eats the stage');
  assert.equal(G.clampRail(340.6), 341, 'a width is whole pixels');
  assert.equal(G.clampRail(Number.NaN), G.RAIL_DEFAULT, 'a corrupt stored value falls back rather than collapsing the rail');
  // Left is positive, because left is the direction that widens a right rail.
  assert.equal(G.railWidthFrom(400, 60), 460);
  assert.equal(G.railWidthFrom(400, -60), 340);
  assert.equal(G.railWidthFrom(400, -9999), G.RAIL_MIN);
  assert.ok(G.RAIL_STEP > 0, 'an arrow key moves it a visible amount');
});

/* ---- 6. the layout places all three kinds --------------------------------- */

const STAGE = {
  nodes: [
    { kind: 'agent', id: 'god', label: 'Nova', accent: 'peach', status: 'working', isGod: true, degree: 3 },
    { kind: 'agent', id: 'jim', label: 'Jim', accent: 'sky', status: 'idle', isGod: false, degree: 1 },
    { kind: 'pseudo', id: 'human', label: 'human' },
    { kind: 'topic', id: 'topic:relay', label: 'relay', weight: 2 },
    { kind: 'task', id: 'task:invoice-pdf', taskId: 'invoice-pdf', label: 'Invoice PDF footer', status: 'todo', weight: 2 }
  ],
  edges: [
    { id: 'm1', kind: 'message', source: 'god', target: 'jim', weight: 2 },
    { id: 't1', kind: 'topic', source: 'jim', target: 'topic:relay', weight: 1 },
    { id: 'k1', kind: 'task', source: 'jim', target: 'task:invoice-pdf', weight: 1 },
    { id: 'x1', kind: 'mention', source: 'task:invoice-pdf', target: 'topic:relay', weight: 1 }
  ],
  topicShown: 1, topicTotal: 1, taskShown: 1, taskTotal: 1
};

test('a ticket node is placed on its own ring, deterministically, and does not drift', () => {
  const a = ml.layout3d(STAGE), b = ml.layout3d(STAGE);
  assert.deepEqual([...a.entries()], [...b.entries()], 'the same graph lands in the same place every poll');
  for (const n of STAGE.nodes) assert.ok(a.has(n.id), `${n.id} placed`);
  const seed = ml.layout3d(STAGE, { iterations: 0 });
  assert.deepEqual(a.get('task:invoice-pdf'), seed.get('task:invoice-pdf'), 'only memories move during relaxation');
  const k = a.get('task:invoice-pdf'), j = a.get('jim');
  assert.ok(Math.hypot(k.x, k.y) > Math.hypot(j.x, j.y), 'the ticket ring sits outside the agent ring');
  assert.ok(ml.TASK_REACH > ml.AGENT_REACH, 'and the stage knows to pull back for it');
});

test('a memory settles between the people who hold it and the ticket that named it', () => {
  const near = ml.layout3d(STAGE).get('topic:relay');
  const far = ml.layout3d({ ...STAGE, edges: STAGE.edges.filter((e) => e.kind !== 'mention') }).get('topic:relay');
  const k = ml.layout3d(STAGE).get('task:invoice-pdf');
  const d = (p, q) => Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);
  assert.ok(d(near, k) < d(far, k), 'the mention edge pulls it toward the work');
});

test('a ticket node is big enough to read its mark, and the stage zooms out for the outer ring', () => {
  const ticket = STAGE.nodes.find((n) => n.kind === 'task');
  const topic = STAGE.nodes.find((n) => n.kind === 'topic');
  assert.ok(ml.baseRadius(ticket) >= 11, 'a glyph inside a 5px dot is a smudge');
  assert.ok(ml.baseRadius(topic) >= 9);
  assert.ok(ml.zoomFor(900, 700, ml.TASK_REACH) < ml.zoomFor(900, 700, ml.AGENT_REACH), 'tickets on the stage means a wider world');
  assert.equal(ml.zoomFor(900, 700), ml.zoomFor(900, 700, ml.AGENT_REACH), 'a stage with no tickets is framed exactly as it shipped');
});

test('"whose memory" keeps that agent\'s tickets and the memories those tickets name', () => {
  const keep = ml.keepFor(STAGE, 'jim');
  assert.ok(keep.has('task:invoice-pdf'), 'a filter that dropped the person’s own tickets answers a narrower question than the chip asks');
  assert.ok(keep.has('topic:relay'));
  assert.equal(ml.keepFor(STAGE, null), null, 'everyone still means no filter');
});

/* ---- 7. the union carries the third kind honestly ------------------------- */

test('buildGraph declares the ticket node and the two edge kinds that tie the graph together', () => {
  assert.match(graphSrc, /export type GraphNode = AgentNode \| TopicNode \| TaskNode \| PseudoNode;/);
  assert.match(graphSrc, /export interface TaskNode \{[\s\S]*?kind: 'task';[\s\S]*?taskId: string;[\s\S]*?status: string;/);
  assert.match(graphSrc, /kind: 'message' \| 'topic' \| 'task' \| 'mention';/);
  assert.match(graphSrc, /taskShown\?: number;/);
});

/* ---- 8. what the founder can see ----------------------------------------- */

test('the result set has a type filter over all three, drawn from the module that declares them', () => {
  assert.match(screen, /MEMORY_RESULT_TYPES\.map\(\(k\) => \(/, 'the chips are the union, so a fourth type cannot appear without a string');
  assert.match(screen, /t\(`pro\.memory\.type\.\$\{k\}`\)/);
  assert.match(screen, /role="radiogroup" aria-label=\{t\('pro\.memory\.typeLabel'\)\}/);
  assert.match(screen, /\{counts\[k\]\}<\/span>/, 'each chip carries its own count, so an empty type is visible before it is picked');
  assert.match(screen, /const counts = useMemo\(\(\) => countResults\(results\), \[results\]\);/);
  assert.match(screen, /classifyResults\(\{ joins, tasks: ledger \?\? \[\], roster: agents, notes: memories \}\)/,
    'the screen classifies through the shared module and decides nothing itself');
  assert.ok(!screen.includes('taskIdsIn('), 'the screen re-implements the join instead of drawing it');
});

test('list and cards are both real, and the card grid is the Tasks grid verbatim', () => {
  assert.match(screen, /options=\{\[\{ value: 'list', label: t\('pro\.memory\.list'\) \}, \{ value: 'cards', label: t\('pro\.memory\.cards'\) \}\]\}/);
  // 0.5.3, bug 10: the grid is one shared constant now, which holds "verbatim"
  // by construction. Its value is pinned in v053-memory-cards-clip.
  assert.match(screen, /gridTemplateColumns: CARD_GRID_COLUMNS/, 'one card size across the product');
  assert.match(read(`${PRO}/TasksScreen.tsx`), /gridTemplateColumns: CARD_GRID_COLUMNS/, 'and it is still what Tasks uses');
  assert.match(screen, /const \[pane, setPane\] = useState<LayoutPick>\(\(\) => readStored<LayoutPick>\(LAYOUT_KEY, \['list', 'cards'\], 'list'\)\);/);
  assert.match(screen, /useEffect\(\(\) => \{ store\(LAYOUT_KEY, pane\); \}, \[pane\]\);/, 'the choice is remembered');
  assert.match(screen, /useEffect\(\(\) => \{ store\(TYPE_KEY, rtype\); \}, \[rtype\]\);/);
});

test('one card component serves the grid, the list and the rail, so they cannot disagree', () => {
  const uses = [...screen.matchAll(/<ResultCard\b/g)].length;
  assert.ok(uses >= 4, `ResultCard draws the grid and all three rail branches (found ${uses})`);
  const rail = screen.slice(screen.indexOf('{selTopic && ('), screen.indexOf('{q.trim() && ('));
  for (const branch of ['selTopic', 'selTask', 'selAgent']) {
    assert.ok(rail.includes(branch), `the rail answers a ${branch} selection`);
  }
  assert.match(rail, /result=\{topicResult\(selTopic, agents, ledger \?\? \[\]\)\}/);
  assert.match(rail, /result=\{ticketResult\(selTask, agents\)\}/, 'the ticket branch the graph click needed');
  assert.match(rail, /result=\{agentResult\(/);
  assert.match(screen, /const selTask = selTaskId \? \(ledger \?\? \[\]\)\.find\(\(x\) => x\.id === selTaskId\) \?\? null : null;/);
  assert.match(screen, /const selKind = sel \? nodeTypeOf\(sel, agents\) : null;/, 'which of the three is a lookup, not a guess');
});

test('the card is structured, readable and cannot be overflowed by one long token', () => {
  const card = screen.slice(screen.indexOf('function ResultCard('), screen.indexOf('function HitCard('));
  assert.match(card, /clampLines\(result\.excerpt, dense \? \{ maxLines: 6, maxChars: 420 \} : \{ maxLines: 3, maxChars: 200 \}\)/,
    'the excerpt is cut in the SOURCE, so a four hundred line note costs four lines of DOM');
  assert.match(card, /t\('pro\.memory\.moreLines', \{ count: cut\.hiddenLines \}\)/, 'and the card says how much it is holding back');
  assert.match(card, /<Chip tone=\{TYPE_TONE\[result\.type\]\}>\{t\(`pro\.memory\.type\.\$\{result\.type\}`\)\}<\/Chip>/, 'what it is, as a chip');
  assert.match(card, /\{result\.status && <Chip tone="muted">/, 'a ticket status is a chip, never a coloured edge');
  assert.match(card, /overflowWrap: 'anywhere'/);
  assert.match(card, /t\('pro\.memory\.noConnections'\)/, 'a result joined to nothing says so in words');
  assert.match(card, /result\.links\.length > LINK_CAP/, 'and a result joined to forty things defers to a count');
  for (const edge of ['borderLeft', 'borderRight', 'borderTop', 'borderBottom']) {
    assert.ok(!card.includes(edge), `the card has a thicker ${edge}`);
  }
  assert.ok(!/#[0-9a-fA-F]{3,6}\b/.test(card.replace(/'#[^']*'/g, '')), 'no literal colour');
  assert.ok(!/borderRadius: \d/.test(card), 'corners come from the radius tokens');
});

test('every clamped block in the screen carries a break rule, the two 0.4.9 defects included', () => {
  for (const line of screen.split('\n')) {
    if (!/WebkitLineClamp/.test(line)) continue;
    assert.match(line, /overflowWrap: 'anywhere'/, `a clamp with no break rule overflows on one long token: ${line.trim().slice(0, 90)}`);
  }
});

/* ---- 9. the rail drags ---------------------------------------------------- */

test('the right rail is a resizable column, not a fixed 320px one', () => {
  assert.ok(!screen.includes("'minmax(0, 1fr) 320px'"), 'the fixed column is gone');
  assert.match(screen, /gridTemplateColumns: `minmax\(0, 1fr\) 8px \$\{railW\}px`/);
  assert.match(screen, /<Splitter\s+width=\{railW\} onChange=\{setRailW\} reset=\{RAIL_DEFAULT\}/);
  assert.match(screen, /const \[railW, setRailW\] = useState<number>\(readRail\);/);
  assert.match(screen, /useEffect\(\(\) => \{ store\(RAIL_KEY, String\(railW\)\); \}, \[railW\]\);/, 'the width survives a restart');
});

test('the splitter drags, answers the keyboard, and starts no second animation loop', () => {
  assert.ok(!/requestAnimationFrame/.test(splitter), 'MemoryScreen stays the one frame loop in PRO');
  assert.match(splitter, /window\.addEventListener\('mousemove', onMove\);/);
  assert.match(splitter, /window\.addEventListener\('mouseup', onUp\);/);
  assert.match(splitter, /window\.removeEventListener\('mousemove', onMove\);/, 'and it lets go');
  assert.match(splitter, /cursor: 'ew-resize'/);
  assert.match(splitter, /role="separator"/);
  assert.match(splitter, /aria-valuenow=\{Math\.round\(width\)\}/);
  assert.match(splitter, /tabIndex=\{0\}/, 'a handle only a mouse can reach is a control half the users do not have');
  assert.match(splitter, /e\.key === 'ArrowLeft'/);
  assert.match(splitter, /e\.key === 'ArrowRight'/);
  const proposals = [...splitter.matchAll(/onChange\(/g)].length;
  const clamped = [...splitter.matchAll(/onChange\(railWidthFrom\(|onChange\(clampRail\(/g)].length;
  assert.equal(clamped, proposals, 'every width the handle proposes goes through the shared clamp');
  assert.match(splitter, /window\.innerWidth - NEIGHBOUR_FLOOR/, 'and a drag can never squeeze the graph to nothing');
  assert.ok(!/#[0-9a-fA-F]{3,6}\b/.test(splitter.replace(/'#[^']*'/g, '')), 'no literal colour');
  assert.ok(!/borderRadius: \d/.test(splitter), 'corners come from the radius tokens');
});

/* ---- 10. the stage draws a mark per kind --------------------------------- */

test('a ticket and a memory node wear a drawn mark in the kit colours, never a letter', () => {
  assert.match(screen, /function paintGlyph\(ctx: CanvasRenderingContext2D, name: GlyphName, ink: string, fill: string\)/);
  assert.match(screen, /new Path2D\('M4 8h16v3a1\.6 1\.6 0 000 3\.2V18H4v-3\.8a1\.6 1\.6 0 000-3\.2z'\)/, 'the ticket stub, with its notches');
  assert.match(screen, /new Path2D\('M6 4h8\.5L19 8\.5V20H6z'\)/, 'the note page, with its folded corner');
  assert.match(screen, /ctx\.drawImage\(mark, p\.sx - side \/ 2, p\.sy - side \/ 2, side, side\)/);
  const paint = screen.slice(screen.indexOf('function paintGlyph('), screen.indexOf('interface StageProps'));
  assert.ok(!/fillText|strokeText/.test(paint), 'a letter in a circle is not a design for a node');
  assert.match(screen, /col\('--cth-ink-900'\) \|\| col\('--cth-ink-700'\)/, 'the marks are painted from the tokens, so both skins work');
  assert.match(screen, /col\(`--cth-\$\{tone\}-light`\) \|\| col\('--cth-cream-200'\)/);
  // The three kinds are tied by four edge kinds, each with its own reading.
  assert.match(screen, /e\.kind === 'task' \? col\('--cth-mint'\)/);
  assert.match(screen, /e\.kind === 'mention' \? col\('--cth-lemon'\)/);
  assert.match(screen, /<Legend swatch="var\(--cth-mint\)">\{t\('pro\.memory\.legendTicket'\)\}<\/Legend>/);
});

test('clicking a node still opens it in the rail, and a chip on a card walks the graph', () => {
  // 0.4.11 (pilot item 9) rewired the press: a still press on a node is a
  // click and selects; a moved one drags the node. The guarantee this test
  // held (a click opens the node in the rail, a second click clears) survives
  // in the new wiring, and the background click now clears explicitly.
  assert.match(screen, /if \(nd && !nd\.moved\) onSelect\(nd\.id !== sel \? nd\.id : null\);/, 'a still click on a node selects it; a second click clears');
  assert.match(screen, /else if \(pd && !pd\.moved\) onSelect\(null\);/, 'a click on the background clears the selection');
  assert.match(screen, /const openLink = useCallback\(\(link: ResultLink\) => \{/);
  assert.match(screen, /setSel\(link\.id\);/, 'a chip selects the node it names');
  assert.match(screen, /if \(link\.type === 'memory' && link\.id\.startsWith\('hit:'\)\) return;/, 'a raw scan hit has no node, so its chip does nothing rather than selecting nothing');
  assert.match(screen, /onOpen=\{r\.type === 'ticket' \? \(\) => onOpenTicket\(r\.ref\) : r\.id\.startsWith\('hit:'\) \? undefined : \(\) => onSelect\(r\.id\)\}/,
    'a ticket card opens the ticket sheet, a node opens in the rail, and a raw hit offers no door it cannot honour');
  assert.match(screen, /\{onOpen \? \(/, 'a card with no door draws a title, not a dead button');
});

/* ---- 11. strings ---------------------------------------------------------- */

test('every string this workstream added exists in the three locales, translated, with no dash', () => {
  const keys = [
    'pro.memory.type.ticket', 'pro.memory.type.agent', 'pro.memory.type.memory',
    'pro.memory.typeLabel', 'pro.memory.layout', 'pro.memory.cards', 'pro.memory.noneOfType',
    'pro.memory.openResult', 'pro.memory.moreLines', 'pro.memory.noConnections',
    'pro.memory.connected', 'pro.memory.moreConnected',
    'pro.memory.railLabel', 'pro.memory.railHint', 'pro.memory.legendTicket', 'pro.memory.ticketsShown'
  ];
  const dicts = Object.fromEntries(['en', 'zh-CN', 'ar'].map((l) => [l, locale(l)]));
  for (const k of keys) {
    for (const l of Object.keys(dicts)) assert.ok(dicts[l].has(k), `${k} in ${l}`);
    assert.ok(!/—|–| - /.test(dicts.en.get(k)), `${k} carries a dash: ${dicts.en.get(k)}`);
    for (const l of ['zh-CN', 'ar']) assert.notEqual(dicts[l].get(k), dicts.en.get(k), `${l}: ${k} is untranslated`);
  }
  // Every key the two new files reach for, and the ticket status chip the card
  // borrows from Tasks.
  for (const src of [screen, splitter]) {
    for (const m of src.matchAll(/\bt\('([^']+)'/g)) for (const l of Object.keys(dicts)) assert.ok(dicts[l].has(m[1]), `${m[1]} in ${l}`);
  }
  for (const s of ['todo', 'doing', 'blocked', 'done']) for (const l of Object.keys(dicts)) assert.ok(dicts[l].has(`pro.tasks.status.${s}`), `pro.tasks.status.${s} in ${l}`);
});
