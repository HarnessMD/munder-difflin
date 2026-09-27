'use strict';

// Agent list ordering: MOST RECENTLY USED FIRST (founder item 4, 0.4.11).
//
// The Inbox's YOUR TEAM list sorted by name and the sidebar did not sort at
// all, so the agent the person talked to a minute ago could sit anywhere.
// The rule now lives in ONE React-free module (@shared/agentRecency) and both
// surfaces read it, so these tests assert the ordering rule itself and then
// pin that each surface actually calls it.
//
// The orchestrator is EXEMPT: he is pinned (first in the sidebar list, his
// own card under Ask me in the Inbox), never ranked by recency.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { orderAgents, compareByRecency, recencyMs } = loadTs('src/shared/agentRecency.ts');

const A = (id, name, isGod) => ({ id, name, ...(isGod ? { isGod: true } : {}) });
const by = (ts) => (id) => ts[id];

test('the agent used a minute ago outranks the one used yesterday', () => {
  const agents = [A('dwight', 'Dwight'), A('jim', 'Jim'), A('pam', 'Pam')];
  const ts = { dwight: 1_000, jim: 900_000, pam: 500_000 };
  assert.deepEqual(orderAgents(agents, by(ts)).map((a) => a.id), ['jim', 'pam', 'dwight']);
});

test('the orchestrator is pinned first however stale his own activity is', () => {
  const agents = [A('jim', 'Jim'), A('god', 'Michael', true), A('pam', 'Pam')];
  const ts = { god: 1, jim: 900_000, pam: 500_000 };
  assert.deepEqual(orderAgents(agents, by(ts)).map((a) => a.id), ['god', 'jim', 'pam'],
    'recency must never move him: he is pinned, not ranked');
});

test('an agent with no recency signal sorts last, never throws, never leads', () => {
  const agents = [A('fresh', 'Andy'), A('jim', 'Jim'), A('bad', 'Creed')];
  const ts = { jim: 5_000, bad: NaN };
  assert.deepEqual(orderAgents(agents, by(ts)).map((a) => a.id), ['jim', 'fresh', 'bad'],
    'missing and unusable signals both fall to the end, then order by name');
  assert.equal(recencyMs(undefined), null);
  assert.equal(recencyMs(null), null);
  assert.equal(recencyMs(NaN), null);
  assert.equal(recencyMs(7), 7);
});

test('two agents used at the same instant keep one deterministic order, by name', () => {
  const agents = [A('b', 'Stanley'), A('a', 'Angela')];
  const ts = { a: 100, b: 100 };
  assert.deepEqual(orderAgents(agents, by(ts)).map((a) => a.id), ['a', 'b']);
  assert.equal(compareByRecency(100, 100), 0);
  assert.equal(compareByRecency(null, null), 0);
  assert.equal(compareByRecency(null, 1), 1);
  assert.equal(compareByRecency(1, null), -1);
});

test('the input roster is never mutated', () => {
  const agents = [A('jim', 'Jim'), A('pam', 'Pam')];
  const before = agents.map((a) => a.id).join(' ');
  orderAgents(agents, by({ pam: 2, jim: 1 }));
  assert.equal(agents.map((a) => a.id).join(' '), before);
});

/* ── both surfaces read the one comparator ──────────────────────────────── */

const ROOT = path.join(__dirname, '..');
const PRO = 'src/renderer/src/components/pro';
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const inbox = strip(read(`${PRO}/InboxScreen.tsx`));
const sidebar = strip(read(`${PRO}/ProSidebar.tsx`));

test('the Inbox and the sidebar both order through @shared/agentRecency, fed by the digest', () => {
  for (const [name, src] of [['InboxScreen', inbox], ['ProSidebar', sidebar]]) {
    assert.match(src, /import \{ orderAgents \} from '@shared\/agentRecency';/, `${name} imports the comparator`);
    assert.match(src, /orderAgents\(agents, \(id\) => lastActivity\[id\]\?\.ts\)/, `${name} feeds it the digest timestamps`);
    assert.ok(!/isGod === b\.isGod/.test(src), `${name} keeps no agent comparator of its own`);
    assert.ok(!/\.sort\(\(a, b\) => \(?a\.name\.localeCompare/.test(src), `${name} does not fall back to name order for the list`);
  }
  // 0.5.3: the list is narrowed by search and split by project, and both
  // steps start from the ordered roster and keep its order (sidebarGroups).
  assert.match(sidebar, /orderedAgents\.filter\(\(a\) => matchesAgentSearch\(a, agentQuery\)\)/, 'the sidebar list is drawn from the ordered roster');
  assert.match(sidebar, /groupAgentsByProject\(shownAgents\)/, 'and the groups are cut from that same narrowed, ordered list');
});

/* ── item 13: the sidebar's orchestrator row and the add button ─────────── */

test("the sidebar's orchestrator row is distinct: accent hairline and the orchestrator chip", () => {
  assert.match(sidebar, /const isGodRow = agent\.isGod === true;/);
  // 5 Sep 2026: the chip is the row's only distinction; no border at all.
  assert.match(sidebar, /border: 'none', cursor: 'pointer'/, 'the god row carries no accent border, the chip is the highlight');
  assert.ok(!/isGodRow \? '1px solid/.test(sidebar), 'no conditional border returns');
  assert.match(sidebar, /\{isGodRow && <Chip tone="accent"[^\n]*\{t\('pro\.agents\.orchestrator'\)\}<\/Chip>\}/, 'the same chip the Inbox card and the grid carry');
});

test('the Agents section header has an add button that opens the one PRO agent sheet', () => {
  assert.match(sidebar, /import \{ openAgentSheet \} from '\.\/agentSheetStore';/);
  assert.match(sidebar, /data-add-agent/);
  assert.match(sidebar, /title=\{t\('rail\.addAgent'\)\} aria-label=\{t\('rail\.addAgent'\)\}/, 'named for a screen reader, from the key the grid already uses');
  assert.match(sidebar, /onClick=\{\(\) => openAgentSheet\(\{ mode: 'add' \}\)\}/, 'the existing store action, not a second door');
});
