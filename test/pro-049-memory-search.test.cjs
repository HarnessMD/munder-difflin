// 0.4.9 phase 5, founder 3 Sep 2026: the memory search pass. He searched
// memory, got a list of bare hits, and could not tell what any hit had to do
// with the work.
//
// Four asks, and the traps under each:
//
//   "a hit should show the tickets      A join is one wrong guess away from a
//    that involved it, the agents on    lie. Task ids here are FREE FORM SLUGS
//    those tickets, and the god and     (razorpay-key-hygiene), so there is no
//    human messages"                    shape to recognise and no pattern to
//                                       trust: the only honest match is against
//                                       the ids the ledger actually holds,
//                                       longest first, on word boundaries. And
//                                       an id that contains a shorter id must
//                                       not report both. `taskIdsIn` already
//                                       does exactly this, so it is REUSED; a
//                                       second copy is a second answer to the
//                                       same question. A hit that joins to
//                                       nothing has to say so in words, because
//                                       an empty box explains nothing and an
//                                       invented connection is worse than both.
//
//   "the result view should let me      A hint delivered as a toast is gone
//    edit the query, and say            before the person types, and a hint in a
//    somewhere that more detail         modal is a thing to dismiss. It belongs
//    filters better"                    under the field it is about, in the same
//                                       view as the results it changes.
//
//   "searching an agent's name          A substring match makes every short
//    should show its tickets and        roster name a false positive: "angelic"
//    its messages"                      would name Angela and "jimmy" would name
//                                       Jim. The match is the whole query, or a
//                                       roster name on word boundaries inside a
//                                       longer one, and nothing else.
//
//   "results should be selectable       Phase 3 shipped the rule: only a send
//    and go to any agent with a         carrying `{ fromHuman: true }` is
//    prompt"                            recorded in the durable sent log, so
//                                       only that send appears in the agent's
//                                       thread with a delivery status. Without
//                                       the flag the person sends from memory
//                                       and sees nothing, anywhere, which is the
//                                       defect phase 3 existed to fix. The
//                                       selection also needs a visible count and
//                                       a way out of itself, or it is a state
//                                       the person cannot leave.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const ROOT = path.join(__dirname, '..');
const PRO = 'src/renderer/src/components/pro';
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const screen = strip(read(`${PRO}/MemoryScreen.tsx`));
const module_ = read('src/shared/memorySearch.ts');

const MS = loadTs('src/shared/memorySearch.ts');

const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v, `${p}${k}.`) : [[`${p}${k}`, v]]));
const locale = (l) => new Map(flat(JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`))));

/* ---- the fixtures, shaped like the real ledgers --------------------------- */

const ROSTER = [
  { id: 'god', name: 'Michael', isGod: true },
  { id: 'angela', name: 'Angela' },
  { id: 'jim', name: 'Jim' }
];

// `razorpay-key` is a PREFIX of `razorpay-key-hygiene`. A note that names the
// long one must not be reported as naming both.
const TASKS = [
  { id: 'razorpay-key-hygiene', title: 'Rotate the Razorpay key', description: 'The relay auth path still trusts the old key.', assignee: 'angela', status: 'doing' },
  { id: 'razorpay-key', title: 'The older card', description: 'Closed last month.', assignee: 'jim', status: 'done' },
  { id: 'relay-auth-org-filter', title: 'Add the org filter', description: 'resolveActor lacks an org filter in both copies.', assignee: 'jim', status: 'todo' }
];

const MESSAGES = [
  { id: 'm1', from: 'human', to: 'god', subject: 'Rotate it', body: 'Please pick up razorpay-key-hygiene today.', created_at: '2026-09-02T10:00:00Z' },
  { id: 'm2', from: 'god', to: 'angela', subject: 'Work order', body: 'The relay auth path is the risk here.', created_at: '2026-09-01T09:00:00Z' },
  { id: 'm3', from: 'jim', to: 'angela', subject: 'Between us', body: 'razorpay-key-hygiene is mine now, relay auth and all.', created_at: '2026-09-03T08:00:00Z' }
];

const HIT = { source: 'angela/memory.md', excerpt: '- **Relay auth:** device-signed requests; tracked as razorpay-key-hygiene.' };

const join = (query, over = {}) => MS.joinHit({ hit: HIT, query, tasks: TASKS, messages: MESSAGES, roster: ROSTER, ...over });

/* ---- 1. what a hit turned out to be about --------------------------------- */

test('the ticket a note NAMES is joined, and the shorter id inside it is not', () => {
  const j = join('relay auth');
  assert.deepEqual(j.tasks.map((l) => l.task.id), ['razorpay-key-hygiene']);
  assert.equal(j.tasks[0].via, 'named', 'the card is here because the note wrote its id, and the card says so');
  // The join is the ledger's ids, never a pattern. A slug that is not on the
  // board is not a ticket, however much it looks like one.
  const none = MS.joinHit({ hit: { source: 'angela/memory.md', excerpt: 'see also some-card-that-never-existed' }, query: 'zzz', tasks: TASKS, messages: MESSAGES, roster: ROSTER });
  assert.deepEqual(none.tasks, []);
});

test('a ticket whose own text carries the words is joined too, after the named ones, and labelled differently', () => {
  const j = join('org filter');
  assert.deepEqual(j.tasks.map((l) => l.task.id), ['razorpay-key-hygiene', 'relay-auth-org-filter']);
  assert.deepEqual(j.tasks.map((l) => l.via), ['named', 'words'], 'named first, and the reason rides with each row');
  // Whole phrase, not per word: "auth key" must not match a card that says
  // "author" in one line and "keyboard" in another.
  const loose = MS.joinHit({ hit: HIT, query: 'filter org', tasks: TASKS, messages: MESSAGES, roster: ROSTER });
  assert.deepEqual(loose.tasks.map((l) => l.task.id), ['razorpay-key-hygiene'], 'a reordered phrase is not the phrase');
});

test('the agents are the note\'s own agent first, then the assignees, and only roster members', () => {
  assert.deepEqual(join('relay auth').agentIds, ['angela'], 'the scan proved the owner, so the owner leads');
  assert.deepEqual(join('org filter').agentIds, ['angela', 'jim']);
  // An assignee who has left the roster is dropped, not drawn as a stranger.
  const thin = MS.joinHit({ hit: HIT, query: 'org filter', tasks: TASKS, messages: MESSAGES, roster: [{ id: 'angela', name: 'Angela' }] });
  assert.deepEqual(thin.agentIds, ['angela']);
});

test('the messages are the ones with the orchestrator or the person at an end, newest first, agent to agent excluded', () => {
  const j = join('relay auth');
  assert.deepEqual(j.messages.map((l) => l.message.id), ['m1', 'm2'], 'm3 is jim to angela: real traffic, not what he asked to see');
  assert.deepEqual(j.messages.map((l) => l.via), ['named', 'words']);
  assert.equal(MS.isDeskMessage(MESSAGES[2], 'god'), false);
  // The orchestrator is read off the ROSTER, because a rename changes the name
  // and a differently seeded workspace changes the id.
  const renamed = [{ id: 'boss', name: 'Dwight', isGod: true }, { id: 'jim', name: 'Jim' }];
  assert.equal(MS.godPartyOf(renamed), 'boss');
  assert.equal(MS.godPartyOf([]), MS.DEFAULT_GOD_PARTY);
  assert.equal(MS.isDeskMessage({ id: 'x', from: 'boss', to: 'jim', subject: '', body: '', created_at: '' }, MS.godPartyOf(renamed)), true);
});

test('a hit that joins to nothing returns nothing and SAYS it is nothing', () => {
  const j = MS.joinHit({ hit: { source: 'jim/memory.md', excerpt: 'The coffee machine is broken again.' }, query: 'coffee machine', tasks: TASKS, messages: MESSAGES, roster: ROSTER });
  assert.deepEqual(j.tasks, []);
  assert.deepEqual(j.messages, []);
  assert.equal(j.empty, true, 'empty is a value the screen can draw a sentence from');
  assert.equal(j.agentId, 'jim', 'whose memory it was is still known');
  assert.equal(join('relay auth').empty, false);
});

test('the owner of a hit is its source path, and only when that agent is on the roster', () => {
  assert.equal(MS.hitAgentId({ source: 'angela/memory.md', excerpt: '' }), 'angela');
  assert.equal(MS.hitAgentId({ source: '/angela/notes/memory.md', excerpt: '' }), 'angela');
  assert.equal(MS.hitAgentId({ source: '', excerpt: '' }), null);
  const gone = MS.joinHit({ hit: { source: 'creed/memory.md', excerpt: 'x' }, query: 'x', tasks: [], messages: [], roster: ROSTER });
  assert.equal(gone.agentId, null, 'a hit from an agent who is gone is not drawn with a sprite that is not there');
});

test('the id matcher is the one the inbox already uses, not a second copy', () => {
  assert.match(module_, /import \{ taskIdsIn \} from '\.\/inboxThread';/);
  assert.ok(!/new RegExp\(|\[A-Za-z0-9_-\]\{/.test(module_.replace(/\/\*[\s\S]*?\*\//g, '')),
    'memorySearch grew its own id pattern, so there are now two answers to "does this text name a ticket"');
});

/* ---- 2. the selection is stable across a re-poll -------------------------- */

test('a hit keeps one identity when the scan re-cuts its excerpt', () => {
  const a = MS.hitKey({ source: 'angela/memory.md', excerpt: 'Relay auth: device-signed requests' });
  const b = MS.hitKey({ source: 'angela/memory.md', excerpt: '  Relay auth:   device-signed\n  requests  ' });
  assert.equal(a, b, 'a re-wrapped line is the same hit, or a selection empties itself every five seconds');
  assert.notEqual(a, MS.hitKey({ source: 'jim/memory.md', excerpt: 'Relay auth: device-signed requests' }));
});

/* ---- 3. is the query an agent's name -------------------------------------- */

test('a roster name is matched whole, never as a substring accident', () => {
  assert.equal(MS.agentNamed('Angela', ROSTER).id, 'angela', 'the whole query is the name');
  assert.equal(MS.agentNamed('angela', ROSTER).id, 'angela');
  assert.equal(MS.agentNamed('jim', ROSTER).id, 'jim');
  assert.equal(MS.agentNamed('what did angela decide about auth', ROSTER).id, 'angela', 'on word boundaries inside a sentence');
  assert.equal(MS.agentNamed('angelic', ROSTER), null, 'a substring is not a name');
  assert.equal(MS.agentNamed('jimmy', ROSTER), null);
  assert.equal(MS.agentNamed('relay auth', ROSTER), null);
  assert.equal(MS.agentNamed('', ROSTER), null);
  assert.equal(MS.agentNamed('angela', []), null);
  // The id answers as well as the display name, and the longer candidate wins
  // when one roster name sits inside another.
  const overlap = [{ id: 'ann', name: 'Ann' }, { id: 'anna-b', name: 'Anna B' }];
  assert.equal(MS.agentNamed('ask anna b about it', overlap).id, 'anna-b');
});

test('an agent\'s own tickets and messages, newest first', () => {
  const d = MS.agentDossier('jim', TASKS, MESSAGES);
  assert.deepEqual(d.tasks.map((x) => x.id), ['razorpay-key', 'relay-auth-org-filter'], 'assigned to them, not merely mentioning them');
  assert.deepEqual(d.messages.map((m) => m.id), ['m3'], 'sent or received by them');
  const michael = MS.agentDossier('god', TASKS, MESSAGES);
  assert.deepEqual(michael.messages.map((m) => m.id), ['m1', 'm2'], 'newest first');
  assert.deepEqual(MS.agentDossier('nobody', TASKS, MESSAGES), { agentId: 'nobody', tasks: [], messages: [] });
});

/* ---- 4. what the agent is actually sent ----------------------------------- */

test('the person\'s words come first, then the results verbatim, one entry each', () => {
  const body = MS.selectionMessage(
    [HIT, { source: 'jim/memory.md', excerpt: 'resolveActor  lacks\n an org filter.' }],
    'relay auth',
    'Check whether this is still true.'
  );
  const words = body.indexOf('Check whether this is still true.');
  const framing = body.indexOf('Here is what I picked');
  const first = body.indexOf('angela/memory.md');
  assert.ok(words === 0 && framing > words && first > framing,
    'an instruction that arrives after the material it is about has already been talked over');
  assert.match(body, /memory search for "relay auth"/, 'the agent is told what was searched for');
  assert.match(body, /1\. angela\/memory\.md/);
  assert.match(body, /2\. jim\/memory\.md/);
  assert.match(body, /resolveActor lacks an org filter\./, 'the excerpt rides verbatim, whitespace folded');
  assert.ok(!/[—–]/.test(body), 'a dash in the message');
  // No prompt is still a legible message, not a bare paste.
  const bare = MS.selectionMessage([HIT], '', '');
  assert.ok(bare.startsWith('Here is what I picked out of a memory search.'));
});

/* ---- 5. the screen draws exactly that ------------------------------------- */

test('the screen joins through the shared module and feeds it the real ledgers', () => {
  assert.match(screen, /import \{\s*\n?\s*agentDossier, agentNamed, hitKey, joinHit, selectionMessage,/);
  assert.match(screen, /from '@shared\/memorySearch'/);
  assert.match(screen, /const \{ tasks: ledger \} = useTaskLedger\(15_000\);/, 'the kanban ledger, through the hook every task surface uses');
  assert.match(screen, /const floor = useFloor\(\);/, 'the message rows, through the reader the Inbox owns');
  assert.match(screen, /joinHit\(\{ hit: h, query: q, tasks: ledger \?\? \[\], messages: floor, roster: agents \}\)/);
  assert.match(screen, /const named = useMemo\(\(\) => agentNamed\(q, agents\), \[q, agents\]\);/);
  assert.match(screen, /agentDossier\(named\.id, ledger \?\? \[\], floor\)/);
  // Nothing in the screen decides what a connection is.
  assert.ok(!screen.includes('taskIdsIn('), 'the screen re-implements the join instead of drawing it');
});

test('the ticket join renders, with the reason next to each card and a door into the card', () => {
  assert.match(screen, /<span style=\{subHead\}>\{t\('pro\.memory\.tickets'\)\}<\/span>/);
  assert.match(screen, /join\.tasks\.slice\(0, JOIN_CAP\)\.map\(\(link\) => <TicketRow key=\{link\.task\.id\} link=\{link\} \/>\)/);
  assert.match(screen, /t\(via === 'named' \? 'pro\.memory\.viaNamed' : 'pro\.memory\.viaWords'\)/, 'the card says WHY it is here');
  assert.match(screen, /onClick=\{\(\) => openTaskDetail\(task\.id\)\}/, 'a ticket opens the same sheet every other PRO surface opens');
  assert.match(screen, /<span style=\{subHead\}>\{t\('pro\.memory\.onTickets'\)\}<\/span>/);
  assert.match(screen, /<span style=\{subHead\}>\{t\('pro\.memory\.desk', \{ god: godName \}\)\}<\/span>/);
  assert.match(screen, /const godName = useResolvedGodName\(\);/, 'the orchestrator is named from the roster, never in the copy');
  assert.match(screen, /join\.messages\.slice\(0, JOIN_CAP\)\.map\(\(link\) => <MessageRow key=\{link\.message\.id\} link=\{link\} \/>\)/);
});

test('a hit that joined to nothing draws a sentence, and a half join says which half is missing', () => {
  assert.match(screen, /\{join\.empty \? \(/);
  assert.match(screen, /\{t\('pro\.memory\.noJoin'\)\}/);
  assert.match(screen, /\{t\('pro\.memory\.noTicketYet'\)\}/);
  assert.match(screen, /\{t\('pro\.memory\.noDeskYet', \{ god: godName \}\)\}/);
});

test('the result view carries its own query field with the hint under it, not a toast and not a sheet', () => {
  const pane = screen.slice(screen.indexOf('function ResultsPane('), screen.indexOf('function HitCard('));
  assert.match(pane, /<SectionH>\{t\('pro\.memory\.editQuery'\)\}<\/SectionH>/);
  assert.match(pane, /<SearchBox value=\{q\} onChange=\{onQuery\} placeholder=\{t\('pro\.memory\.search'\)\} style=\{\{ width: '100%' \}\} \/>/);
  assert.match(pane, /\{t\('pro\.memory\.detailHint'\)\}<\/span>/, 'the hint is a line of text under the field it is about');
  const hint = pane.indexOf("pro.memory.detailHint");
  const box = pane.indexOf('<SearchBox');
  assert.ok(box >= 0 && hint > box, 'the hint sits under the field, not above it');
  for (const wrong of ['proToast(t(\'pro.memory.detailHint', 'ConfirmDialog', 'alert(']) {
    assert.ok(!pane.includes(wrong), `the hint is delivered as ${wrong}`);
  }
  assert.match(screen, /\{ value: 'results', label: t\('pro\.memory\.resultsView'\) \}/, 'Results is a view the person can pick and leave');
  assert.match(screen, /\{view !== 'results' && \(/, 'the side panel stops repeating the hit list once the result view owns it');
});

test('the selection has a visible count, a way out, and sends with fromHuman so it lands in the thread', () => {
  // The count is what would actually SEND, not the raw pick list: a pick the
  // Whose filter has hidden is not in the message, and a chip that says
  // otherwise promises one thing and does another.
  assert.match(screen, /count=\{pickedHits\.length\}/);
  assert.match(screen, /\{count > 0 && \(/);
  assert.match(screen, /<Chip tone="accent">\{t\('pro\.memory\.selected', \{ count \}\)\}<\/Chip>/);
  assert.match(screen, /onClick=\{onClearPicked\}>\{t\('pro\.memory\.clearPicked'\)\}/);
  assert.match(screen, /<input type="checkbox" checked=\{on\} onChange=\{onPick\} aria-label=\{t\('pro\.memory\.pick'\)\}/);
  assert.match(screen, /useStore\.getState\(\)\.enqueueMessage\(to\.id, selectionMessage\(pickedHits, q, prompt\), \{ fromHuman: true \}\);/,
    'without fromHuman the send is never recorded, and the person sees nothing anywhere');
  assert.match(screen, /void window\.cth\.trackMessageSent\?\.\('composer'\);/);
  assert.match(screen, /proToast\(t\('pro\.memory\.sentTo', \{ count: pickedHits\.length, name: to\.name \}\), \{ tone: 'ok' \}\);/,
    'after sending it says where it went');
  // The target list is the live roster, so there is no way to address an agent
  // that is not there, and Send is dead until one is picked.
  const sheet = screen.slice(screen.indexOf('function SendSheet('));
  assert.match(sheet, /\{agents\.map\(\(a\) => \(/);
  assert.match(sheet, /<Btn kind="primary" disabled=\{!target \|\| count === 0\}/);
  assert.match(sheet, /placeholder=\{t\('pro\.memory\.sendPromptPlaceholder'\)\} style=\{textareaStyle\}/, 'the prompt box');
});

test('agents in the result view are sprites, and every card has one even border', () => {
  const block = screen.slice(screen.indexOf('function ResultsPane('), screen.indexOf('function NoteSheet('));
  // 0.4.11 pilot item 15: bare SpritePortrait boxes. 28 is one native sprite
  // frame; 18 and 16 are the two inline chip slots that stay sub native and
  // take SpritePortrait's smooth downsample path instead (see
  // test/pro-0411-avatars.test.cjs).
  assert.match(block, /<SpritePortrait character=\{owner\.character\} size=\{28\} \/>/);
  assert.match(block, /<SpritePortrait character=\{a\.character\} size=\{18\} \/>/);
  assert.match(block, /<SpritePortrait character=\{a\.character\} size=\{16\} \/>/);
  assert.ok(!/charAt\(0\)|slice\(0, 1\)\.toUpperCase|\.toUpperCase\(\)\[0\]/.test(block), 'an initial in a circle instead of the character');
  assert.match(screen, /const cardStyle = \{[\s\S]*?border: '1px solid var\(--cth-ink-300\)'/);
  // Every CARD, 1px all round. The sheet's own header and footer rules are
  // chrome, not a card edge, and NoteSheet has drawn them since phase 4, so
  // the sweep stops where SendSheet begins.
  const cards = screen.slice(screen.indexOf('function ResultsPane('), screen.indexOf('function SendSheet('));
  for (const edge of ['borderLeft', 'borderRight', 'borderTop', 'borderBottom']) {
    assert.ok(!cards.includes(edge), `a card in the result view has a thicker ${edge}`);
  }
  assert.ok(!/#[0-9a-fA-F]{3,6}\b/.test(block.replace(/'#[^']*'/g, '')), 'no literal colour');
});

/* ---- 6. strings ----------------------------------------------------------- */

test('every new memory search string exists in the three locales, translated, with no dash', () => {
  const keys = [
    'pro.memory.resultsView', 'pro.memory.editQuery', 'pro.memory.detailHint',
    'pro.memory.tickets', 'pro.memory.viaNamed', 'pro.memory.viaWords', 'pro.memory.onTickets', 'pro.memory.desk',
    'pro.memory.noJoin', 'pro.memory.noTicketYet', 'pro.memory.noDeskYet',
    'pro.memory.moreTickets', 'pro.memory.moreMessages', 'pro.memory.openTicket', 'pro.memory.pick',
    'pro.memory.selected', 'pro.memory.clearPicked', 'pro.memory.sendPicked', 'pro.memory.sendTitle',
    'pro.memory.sendTo', 'pro.memory.sendPrompt', 'pro.memory.sendPromptPlaceholder', 'pro.memory.sendNow', 'pro.memory.sentTo',
    'pro.memory.agentMatch', 'pro.memory.agentTickets', 'pro.memory.agentMessages',
    'pro.memory.agentNoTickets', 'pro.memory.agentNoMessages'
  ];
  const en = locale('en');
  for (const l of ['en', 'zh-CN', 'ar']) {
    const dict = locale(l);
    for (const k of keys) {
      assert.ok(dict.has(k), `${k} missing from ${l}`);
      const v = dict.get(k);
      assert.ok(!/[—–]/.test(v) && !/ - /.test(v), `${k} (${l}) carries a dash: ${v}`);
      if (l !== 'en') assert.notEqual(v, en.get(k), `${l}: ${k} is English in a ${l} key`);
    }
  }
  // Placeholders are part of the string. A locale that drops {{god}} renames
  // the orchestrator to nothing.
  for (const [k, vars] of [['pro.memory.desk', ['god']], ['pro.memory.noDeskYet', ['god']], ['pro.memory.sentTo', ['count', 'name']], ['pro.memory.agentMatch', ['name']], ['pro.memory.sendTitle', ['count']], ['pro.memory.selected', ['count']]]) {
    for (const l of ['en', 'zh-CN', 'ar']) for (const v of vars) assert.ok(locale(l).get(k).includes(`{{${v}}}`), `${k} (${l}) lost {{${v}}}`);
  }
  // The vocabulary sweep judges key names as well as values.
  const banned = /\b(harness config|hive|floor|spawn|spawned|spawns|palace|awaiting|starting up|block tools|semantic memory|pty)\b/i;
  for (const k of keys) {
    assert.ok(!banned.test(k), `${k} is a banned word in a key name`);
    for (const l of ['en', 'zh-CN', 'ar']) assert.ok(!banned.test(locale(l).get(k)), `${k} (${l}) says a banned word`);
  }
});
