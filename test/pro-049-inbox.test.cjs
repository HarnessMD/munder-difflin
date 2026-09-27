// 0.4.9, founder 3 Sep 2026: the Inbox, rebuilt.
//
// His four complaints, and the four things that must not slip back:
//   "not full width"            no bubble is capped in pixels; the measure is
//                               in `ch` and the list column scales.
//   "I do not know what does
//    what"                      one row PER AGENT, each opening the SAME thread
//                               the agent's own screen shows.
//   "we do not know what an
//    agent gives as a final
//    answer or resolution"      a message that names a ticket draws the ticket,
//                               with whatever result is written on it.
//   "a message typed in the
//    queue ... vanishes"        the person's send is recorded when it is made
//                               and settled when it lands, so leaving the queue
//                               cannot take it off the screen.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const ROOT = path.join(__dirname, '..');
const PRO = 'src/renderer/src/components/pro';
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const inbox = strip(read(`${PRO}/InboxScreen.tsx`));
const thread = strip(read(`${PRO}/AgentInbox.tsx`));
const store = strip(read('src/renderer/src/store/store.ts'));
const hive = strip(read('src/renderer/src/hooks/useHive.ts'));

const T = loadTs(path.join(ROOT, 'src/shared/inboxThread.ts'));

/* ---- 1. the arithmetic ---------------------------------------------------- */

test('a delivered message keeps its row: the log outlives the queue', () => {
  const log = [{ id: 'q1', text: 'look at the relay', ts: 1000, status: 'queued' }];
  // The same send, after the drain settled it. Nothing about the row's identity
  // changed, which is the point: the thread redraws, it does not lose a line.
  const settled = [{ ...log[0], status: 'sent', settledAt: 4000 }];
  assert.deepEqual(T.mergeSent(settled, []), settled);
  assert.equal(T.mergeSent(log, []).length, 1);
});

test('a line the terminal echoed back is not drawn a second time', () => {
  const log = [{ id: 'q1', text: 'look at the relay', ts: 1000, status: 'sent' }];
  // The drain types the message INTO the terminal, so the history ledger often
  // carries it too, a few seconds later. One send, one bubble.
  const same = T.mergeSent(log, [{ ts: 6000, text: 'look at the relay' }]);
  assert.equal(same.length, 1, 'the echo of a send is the same send');
  // Far enough apart and it is a person saying the same thing twice, which is
  // two messages and must read as two.
  const twice = T.mergeSent(log, [{ ts: 90_000, text: 'look at the relay' }]);
  assert.equal(twice.length, 2);
  // A line typed straight into the terminal, which the composer never saw, is
  // still the person talking and still belongs in the thread.
  const typed = T.mergeSent([], [{ ts: 20, text: 'git status' }]);
  assert.deepEqual(typed.map((e) => [e.text, e.status]), [['git status', 'sent']]);
});

test('the merged side of the thread reads in time order', () => {
  const out = T.mergeSent(
    [{ id: 'a', text: 'second', ts: 200, status: 'sent' }],
    [{ ts: 100, text: 'first' }, { ts: 300, text: 'third' }]
  );
  assert.deepEqual(out.map((e) => e.text), ['first', 'second', 'third']);
});

test('a message stays on screen until the ledger has it, and a failure stays for good', () => {
  const p = [
    { key: 'p1', subject: 's', body: 'apply the moves', at: 1, status: 'sent' },
    { key: 'p2', subject: 's', body: 'and the second one', at: 2, status: 'sending' }
  ];
  assert.equal(T.stillPending(p, []).length, 2, 'an empty ledger drops nothing');
  assert.deepEqual(T.stillPending(p, ['apply the moves']).map((x) => x.key), ['p2']);
  // Identity, not a new array, when nothing landed: this feeds a setState in an
  // effect that runs on every ledger poll, and a fresh array every time is an
  // infinite render.
  assert.equal(T.stillPending(p, []), p);
  const failed = [{ key: 'p3', subject: 's', body: 'x', at: 3, status: 'failed' }];
  assert.equal(T.stillPending(failed, ['x']).length, 1, 'a failure is not cleared by a lookalike in the ledger');
});

test('a file a message names is found whole, and a URL is not a file', () => {
  const text = 'Wrote /Users/x/repo/src/main/relay.ts and /Users/x/notes.md (see https://example.com/a/b.json).';
  assert.deepEqual(T.filePathsIn(text), ['/Users/x/repo/src/main/relay.ts', '/Users/x/notes.md']);
  assert.deepEqual(T.filePathsIn('see /Users/x/repo/src for the rest'), [], 'a directory has nothing to open');
  assert.deepEqual(T.filePathsIn('`/tmp/a.log`, /tmp/a.log again'), ['/tmp/a.log'], 'named twice is one chip');
  assert.deepEqual(T.filePathsIn(''), []);
  assert.equal(T.fileLabel('/Users/x/repo/src/main/relay.ts'), 'relay.ts');
});

test('a ticket is drawn only for an id the ledger still has', () => {
  const known = ['razorpay-key-hygiene', 'build-teams-plan-v1', 'teams'];
  assert.deepEqual(T.taskIdsIn('done with build-teams-plan-v1, next razorpay-key-hygiene', known),
    ['build-teams-plan-v1', 'razorpay-key-hygiene'], 'in the order they are named');
  // Hive ids are free-form slugs, so there is no shape to match on and a bare
  // substring would draw a card for "teams" inside "build-teams-plan-v1".
  assert.deepEqual(T.taskIdsIn('build-teams-plan-v1 is done', known), ['build-teams-plan-v1']);
  assert.deepEqual(T.taskIdsIn('the teams work is done', known), ['teams']);
  assert.deepEqual(T.taskIdsIn('nothing here', known), []);
  assert.deepEqual(T.taskIdsIn('razorpay-key-hygiene', []), [], 'no ledger, no card');
});

/* ---- 2. the width he complained about ------------------------------------- */

test('nothing in the Inbox is capped in pixels: the pane is the width of the window', () => {
  for (const [name, src] of [['InboxScreen', inbox], ['AgentInbox', thread]]) {
    assert.ok(!/min\(640px/.test(src), `${name} still caps a bubble at 640px`);
    assert.match(src, /const BUBBLE = 'min\(74ch, 86%\)';/, `${name} measures a bubble in ch`);
  }
  assert.ok(!/width: 290/.test(inbox), 'the list column is fixed at 290px');
  assert.match(inbox, /width: 'clamp\(232px, 22%, 330px\)'/, 'the list column scales with the window');
  assert.equal((inbox.match(/maxWidth: BUBBLE/g) || []).length, 5, 'every bubble and the ask card use the one measure');
});

/* ---- 3. a row per agent, and one thread behind it -------------------------- */

test('the list has a row per agent, most recently used first, saying what each is doing', () => {
  assert.match(inbox, /\{ id: `agent:\$\{string\}`; kind: 'agent'; agent: Agent \}/);
  assert.match(inbox, /for \(const a of team\) out\.push\(\{ id: `agent:\$\{a\.id\}`, kind: 'agent', agent: a \}\)/);
  // Founder item 4 (0.4.11): recency order, through the ONE shared comparator
  // the sidebar reads too (@shared/agentRecency, unit tested in
  // test/agent-recency.test.cjs), fed by the same activity digest the rows
  // already show as their time. The orchestrator is pinned, not ranked.
  assert.match(inbox, /import \{ orderAgents \} from '@shared\/agentRecency';/);
  assert.match(inbox, /orderAgents\(agents, \(id\) => lastActivity\[id\]\?\.ts\)/, 'most recently used first, from the digest timestamps');
  // The row says what the agent is doing, from the same digest the agent card
  // reads, so the two surfaces can never disagree about it.
  assert.match(inbox, /const last = lastActivity\[c\.agent\.id\];/);
  // 0.4.10, founder 3 Sep 2026: a digest line can carry an agent's own words
  // verbatim (a notice, a sent subject), so the row previews it rather than
  // showing Markdown syntax as literal asterisks and brackets. The source is
  // still describeEntry; previewLine only wraps it for a one line row.
  assert.match(inbox, /sub = last \? previewLine\(describeEntry\(last, t, technical\)\)/);
  assert.match(inbox, /right = <StatusChip status=\{c\.agent\.status\} raw=\{c\.agent\.action\} \/>;/);
  // 0.4.11 pilot item 15: bare SpritePortrait at an integer sprite scale, not
  // the chip-backed Portrait (see test/pro-0411-avatars.test.cjs).
  assert.match(inbox, /icon = <SpritePortrait character=\{c\.agent\.character\} size=\{28\} \/>/, 'every agent, the orchestrator included, is a sprite, never initials');
  assert.match(inbox, /count = \(queues\[c\.agent\.id\] \?\? \[\]\)\.length;/, 'and what is still waiting to go to it');
});

test('an agent chat is the agent screen\'s own thread and composer, not a second one', () => {
  assert.match(inbox, /import \{ AgentInbox, Refs, SentStatus \} from '\.\/AgentInbox'/);
  assert.match(inbox, /import \{ Composer as AgentComposer \} from '\.\/Composer'/);
  assert.match(inbox, /<AgentInbox agent=\{agent\} \/>\s*<AgentComposer agent=\{agent\} \/>/);
  assert.match(inbox, /<AgentChat key=\{chat\.agent\.id\} agent=\{chat\.agent\}/, 'switching agents remounts, so one history never scrolls under another name');
  assert.match(inbox, /nav\.go\(`agent:\$\{agent\.id\}`\)/, 'and the full screen is one click away');
});

test('every section is named, and the orchestrator\'s own traffic is one of them', () => {
  for (const s of ['forYou', 'team', 'everyone', 'outside', 'people']) {
    assert.match(inbox, new RegExp(`t\\('pro\\.inbox\\.section\\.${s}'\\)`), `no ${s} section`);
  }
  // The channel that used to be the only agent row is still there, under a name
  // that says what it holds rather than repeating "Agents" beside the agents.
  // Item 8 (0.4.11): the orchestrator's card is pinned in FOR YOU, under the
  // Ask me card, and the team section holds ONLY the workers.
  assert.match(inbox, /c\.kind === 'askme' \|\| \(c\.kind === 'agent' && c\.agent\.isGod === true\)/, 'the orchestrator card sits under Ask me');
  assert.match(inbox, /chats\.filter\(\(c\) => c\.kind === 'agent' && c\.agent\.isGod !== true\)/, 'and he is out of the team list');
  assert.match(inbox, /chats\.filter\(\(c\) => c\.kind === 'floor'\)/);
  // His card carries NO border at all (founder, 5 Sep 2026: "does not need to
  // have a border, just the badge is good enough") — the orchestrator chip is
  // the only distinction, same rule the sidebar row settled earlier.
  assert.ok(!/isGodCard \? '1px solid/.test(inbox), 'the god card border died with the sidebar row\'s');
  assert.match(inbox, /\{isGodCard && <Chip tone="accent"[^\n]*\{t\('pro\.agents\.orchestrator'\)\}<\/Chip>\}/);
});

test('each list section folds from its header, and the fold is remembered', () => {
  assert.match(inbox, /const FOLDS_KEY = 'cth\.proInboxFolds';/);
  assert.match(inbox, /window\.localStorage\.setItem\(FOLDS_KEY, JSON\.stringify\(next\)\)/, 'a toggle persists');
  assert.match(inbox, /useState<Record<string, boolean>>\(readFolds\)/, 'and is read back on mount');
  assert.match(inbox, /data-section-fold=\{id\} aria-expanded=\{!folded\}/, 'the header is the control');
  assert.match(inbox, /const folded = !q && folds\[id\] === true;/, 'a search overrides a fold so results cannot hide');
  assert.match(inbox, /\{!folded && rows\}/);
});

/* ---- 4. the message that vanished ----------------------------------------- */

test('a message to the orchestrator appears before the door is touched, and says what happened', () => {
  assert.match(inbox, /setPending\(\(p\) => \[\.\.\.p, \{ key, subject: first, body, at: Date\.now\(\), status: 'sending' \}\]\);\s*setDraft\(''\);/,
    'on screen first, then the box empties');
  assert.match(inbox, /setPending\(\(p\) => p\.map\(\(x\) => \(x\.key === key \? \{ \.\.\.x, status: res\.ok \? 'sent' : 'failed', error \} : x\)\)\)/);
  assert.match(inbox, /setPending\(\(p\) => stillPending\(p, messages\.map\(\(m\) => m\.body\)\)\)/, 'and it steps aside once the ledger has it');
  assert.match(inbox, /<SentStatus sent=\{\{ id: p\.key/, 'with the same status words the agent thread uses');
});

test('the person\'s send is recorded when it is made and settled when it lands', () => {
  assert.match(store, /sentLog: Record<string, SentEntry\[\]>;/);
  assert.match(store, /if \(!meta\?\.fromHuman\) return \{ messageQueues \};/, 'only a person\'s send is drawn as one');
  assert.match(store, /const entry: SentEntry = \{ id: msg\.id, text: msg\.text, ts: msg\.ts, status: 'queued' \};/);
  assert.match(store, /persistSentLog\(sentLog\);/);
  // Settled BEFORE the queue drops the message. The other order leaves a beat
  // where the thread has neither, which is the flicker this replaced.
  assert.match(hive, /useStore\.getState\(\)\.settleHumanSend\(srcId, next\.id, 'sent'\);\s*removeQueuedMessage\(srcId, next\.id\);/);
  assert.match(hive, /useStore\.getState\(\)\.settleHumanSend\(srcId, next\.id, 'failed'\);/, 'giving up says so rather than deleting the row');
  // A row read back as queued whose message did not come back with the roster
  // has nobody left to deliver it. Waiting forever is the same lie as vanishing.
  assert.match(store, /e\.status === 'queued' && !live\.has\(e\.id\) \? \{ \.\.\.e, status: 'failed' as SendStatus \} : e/);
});

/* ---- 5. strings ------------------------------------------------------- */

test('every new Inbox string exists in the three locales, with no dash', () => {
  const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v, `${p}${k}.`) : [[`${p}${k}`, v]]));
  const locales = Object.fromEntries(['en', 'zh-CN', 'ar'].map((l) => [l, new Map(flat(JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`))))]));
  const keys = [
    'pro.inbox.routed', 'pro.inbox.routedSub', 'pro.inbox.godSub', 'pro.inbox.agentIdle',
    'pro.inbox.openAgent', 'pro.inbox.waitingCount', 'pro.inbox.noResultYet',
    'pro.inbox.collapseSection', 'pro.inbox.expandSection',
    'pro.inbox.section.team', 'pro.inbox.section.everyone', 'pro.inbox.section.people',
    'pro.room.waitingToSend',
    'pro.room.sendStatus.queued', 'pro.room.sendStatus.sent', 'pro.room.sendStatus.failed', 'pro.room.sendStatus.dropped'
  ];
  for (const k of keys) {
    for (const l of Object.keys(locales)) {
      assert.ok(locales[l].has(k), `${k} in ${l}`);
      const v = locales[l].get(k);
      assert.ok(!/[—–]/.test(v) && !/ - /.test(v), `${k} (${l}) carries a dash`);
    }
  }
  // The orchestrator is named from the roster in both places it appears here.
  for (const l of Object.keys(locales)) {
    assert.match(locales[l].get('pro.inbox.routedSub'), /\{\{god\}\}/, `${l} does not interpolate the orchestrator`);
  }
});
