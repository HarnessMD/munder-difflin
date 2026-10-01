'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { CostLedgerTotals, lifetimeUsdFromLedger, lifetimeTokensFromLedger } = loadTs('src/main/costLifetime.ts');

/** One ledger row in the exact shape appendCostLedger writes. `tok` spreads over the
 *  four token fields; a number puts it all in `input`, which is enough for the fold. */
function row(agent, session, usd, tok = 0) {
  const t = typeof tok === 'number' ? { input: tok } : tok;
  return JSON.stringify({
    agent_id: agent, session_id: session, ts: 0,
    input: 0, output: 0, cache_read: 0, cache_creation: 0, ...t, model: '', usd
  });
}

function ledgerWith(lines) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'md-cost-'));
  const p = path.join(dir, 'cost-ledger.jsonl');
  fs.writeFileSync(p, lines.length ? `${lines.join('\n')}\n` : '');
  return p;
}

async function totalsFor(lines) {
  const t = new CostLedgerTotals();
  await t.refreshFully(ledgerWith(lines));
  return t;
}

test('no reset: lifetime is simply the last cumulative value', async () => {
  const t = await totalsFor([row('a', 's1', 1), row('a', 's1', 5), row('a', 's1', 9.25)]);
  assert.equal(t.usdFor('a'), 9.25);
});

test('one reset: the pre-reset peak is added to the open segment', async () => {
  // climbs to 20, restarts at 0, climbs to 3  ->  23, not 3
  const t = await totalsFor([
    row('a', 's1', 8), row('a', 's1', 20),
    row('a', 's1', 0), row('a', 's1', 3)
  ]);
  assert.equal(t.usdFor('a'), 23);
});

test('several resets in one session all accumulate', async () => {
  const t = await totalsFor([
    row('a', 's1', 10), row('a', 's1', 0),
    row('a', 's1', 7), row('a', 's1', 0),
    row('a', 's1', 2)
  ]);
  assert.equal(t.usdFor('a'), 19);
});

test('a sub-dollar reset still counts (a $1 threshold would miss this)', async () => {
  // Both of these occur in the live ledger: 0.92 -> 0.00 and 0.73 -> 0.00.
  const t = await totalsFor([
    row('a', 's1', 0.92), row('a', 's1', 0), row('a', 's1', 0.4)
  ]);
  assert.equal(Number(t.usdFor('a').toFixed(4)), 1.32);
});

test('the reset keeps the SAME session_id, which is the whole bug', async () => {
  const t = await totalsFor([row('a', 'same', 30), row('a', 'same', 0), row('a', 'same', 1)]);
  assert.equal(t.usdFor('a'), 31);
});

test('separate sessions for one agent sum together', async () => {
  const t = await totalsFor([row('a', 's1', 4), row('a', 's2', 6)]);
  assert.equal(t.usdFor('a'), 10);
});

test('agents are kept apart, and floorTotal sums the floor', async () => {
  const t = await totalsFor([
    row('a', 's1', 10), row('a', 's1', 0), row('a', 's1', 1),
    row('b', 's2', 5)
  ]);
  assert.equal(t.usdFor('a'), 11);
  assert.equal(t.usdFor('b'), 5);
  assert.equal(t.floorTotal(), 16);
});

test('an unknown agent is 0 once warm, and null before any fold', async () => {
  const cold = new CostLedgerTotals();
  assert.equal(cold.usdFor('nobody'), null, 'cold must not claim $0 as fact');
  assert.equal(cold.ready, false);
  const t = await totalsFor([row('a', 's1', 1)]);
  assert.equal(t.ready, true);
  assert.equal(t.usdFor('nobody'), 0);
});

test('INCREMENTAL: folding in two passes equals folding in one', async () => {
  const first = [row('a', 's1', 8), row('a', 's1', 20)];
  const rest = [row('a', 's1', 0), row('a', 's1', 3)];

  const p = ledgerWith(first);
  const t = new CostLedgerTotals();
  await t.refreshFully(p);
  assert.equal(t.usdFor('a'), 20);

  fs.appendFileSync(p, `${rest.join('\n')}\n`);
  await t.refreshFully(p);
  assert.equal(t.usdFor('a'), 23, 'appended lines must fold onto existing state');

  const oneShot = await totalsFor([...first, ...rest]);
  assert.equal(t.usdFor('a'), oneShot.usdFor('a'));
});

test('INCREMENTAL: a half-written trailing line is not lost or double counted', async () => {
  const p = ledgerWith([row('a', 's1', 5)]);
  const partial = row('a', 's1', 11);
  fs.appendFileSync(p, partial.slice(0, 20)); // torn mid-write, no newline

  const t = new CostLedgerTotals();
  await t.refreshFully(p);
  assert.equal(t.usdFor('a'), 5, 'the torn line must not be parsed');

  fs.appendFileSync(p, `${partial.slice(20)}\n`); // writer finishes the line
  await t.refreshFully(p);
  assert.equal(t.usdFor('a'), 11, 'the completed line must be folded exactly once');
});

test('re-reading an unchanged ledger does not double count', async () => {
  const p = ledgerWith([row('a', 's1', 10), row('a', 's1', 0), row('a', 's1', 4)]);
  const t = new CostLedgerTotals();
  await t.refreshFully(p);
  await t.refreshFully(p);
  await t.refreshFully(p);
  assert.equal(t.usdFor('a'), 14);
});

test('truncation or rotation rebuilds from scratch instead of going negative', async () => {
  const p = ledgerWith([row('a', 's1', 10), row('a', 's1', 25)]);
  const t = new CostLedgerTotals();
  await t.refreshFully(p);
  assert.equal(t.usdFor('a'), 25);

  fs.writeFileSync(p, `${row('a', 's1', 2)}\n`); // rotated: smaller than the offset
  await t.refreshFully(p);
  assert.equal(t.usdFor('a'), 2, 'stale offset must not survive a truncation');
});

test('malformed and empty lines are skipped, not fatal', async () => {
  const p = ledgerWith([row('a', 's1', 3)]);
  fs.appendFileSync(p, '\nnot json at all\n{"agent_id":null}\n');
  fs.appendFileSync(p, `${row('a', 's1', 7)}\n`);
  const t = new CostLedgerTotals();
  await t.refreshFully(p);
  assert.equal(t.usdFor('a'), 7);
});

test('a missing ledger leaves the last good totals in place', async () => {
  const p = ledgerWith([row('a', 's1', 9)]);
  const t = new CostLedgerTotals();
  await t.refreshFully(p);
  await t.refresh(path.join(path.dirname(p), 'does-not-exist.jsonl'));
  assert.equal(t.usdFor('a'), 9);
});

test('a non-numeric usd is treated as 0 rather than NaN-poisoning the total', async () => {
  const p = ledgerWith([row('a', 's1', 5)]);
  fs.appendFileSync(p, `${JSON.stringify({ agent_id: 'a', session_id: 's1', usd: 'lots' })}\n`);
  const t = new CostLedgerTotals();
  await t.refreshFully(p);
  assert.equal(Number.isFinite(t.usdFor('a')), true);
  assert.equal(t.usdFor('a'), 5);
});

// --- tokens: the same counter, the same resets (fleet.json showed 0 for grok) -----
//
// `usd` and the four token fields are written by the SAME cumulative-since-process-start
// accumulator, so they reset together and need the same peak-and-reset fold. Before this,
// only `usd` was folded, so fleet.json's `tokens` had to fall back to the live telemetry
// sample — which is 0 for any agent whose usage reaches the ledger by another path (grok),
// and a 10x understatement for one that has been through app restarts.

test('tokens: no reset means the last cumulative value, summed across all four fields', async () => {
  const t = await totalsFor([
    row('a', 's1', 1, { input: 10, output: 2, cache_read: 5, cache_creation: 1 }),
    row('a', 's1', 5, { input: 30, output: 4, cache_read: 9, cache_creation: 1 })
  ]);
  assert.equal(t.tokensFor('a'), 44);
  assert.equal(t.usdFor('a'), 5, 'usd is unchanged by any of this');
});

test('tokens: a reset adds the pre-reset peak, exactly as usd does', async () => {
  // climbs to 900, restarts at 0, climbs to 40  ->  940, not 40
  const t = await totalsFor([
    row('a', 's1', 20, 500), row('a', 's1', 30, 900),
    row('a', 's1', 0, 0), row('a', 's1', 3, 40)
  ]);
  assert.equal(t.tokensFor('a'), 940);
  assert.equal(t.usdFor('a'), 33, 'and the two folds agree about where the reset was');
});

test('tokens: each session and each agent folds on its own', async () => {
  const t = await totalsFor([
    row('a', 's1', 4, 100), row('a', 's2', 7, 250), row('b', 's1', 5, 60)
  ]);
  assert.equal(t.tokensFor('a'), 350);
  assert.equal(t.tokensFor('b'), 60);
});

test('tokens: a usd reset with no token reset, and the reverse, are folded independently', async () => {
  // The two are never expected to diverge, but folding them off one shared reset flag
  // would make a single odd row corrupt BOTH totals instead of neither.
  const t = await totalsFor([
    row('a', 's1', 9, 500),
    row('a', 's1', 0, 700),   // usd reset, tokens kept climbing
    row('a', 's1', 2, 100)    // tokens reset, usd kept climbing
  ]);
  assert.equal(t.usdFor('a'), 11, '9 committed + 2 open');
  assert.equal(t.tokensFor('a'), 800, '700 committed + 100 open');
});

test('tokens: cold reports null, not a confident zero', async () => {
  const cold = new CostLedgerTotals();
  assert.equal(cold.tokensFor('nobody'), null, 'so a caller can tell "not read" from "none"');
  const t = await totalsFor([row('a', 's1', 1, 10)]);
  assert.equal(t.tokensFor('nobody'), 0, 'warm and absent really is zero');
});

test('tokens: missing or non-numeric fields count as 0 instead of poisoning the total', async () => {
  const p = ledgerWith([row('a', 's1', 1, { input: 10, output: 5 })]);
  fs.appendFileSync(p, `${JSON.stringify({ agent_id: 'a', session_id: 's1', usd: 2 })}\n`);
  fs.appendFileSync(p, `${JSON.stringify({ agent_id: 'a', session_id: 's1', usd: 3, input: 'lots', output: null })}\n`);
  const t = new CostLedgerTotals();
  await t.refreshFully(p);
  assert.equal(Number.isFinite(t.tokensFor('a')), true);
  assert.equal(t.tokensFor('a'), 15, 'the rows with no readable tokens neither add nor reset');
});

test('tokens: an overflowed number in the ledger is dropped, not carried as Infinity', async () => {
  // `1e999` is valid JSON and parses to Infinity, which would make this agent's total —
  // and, once fleet.json is written, the floor's — permanently Infinity with no way back.
  // That is what the isFinite guard is for, and a plain typeof check would not catch it.
  const p = ledgerWith([row('a', 's1', 1, { input: 10, output: 5 })]);
  fs.appendFileSync(p, '{"agent_id":"a","session_id":"s1","usd":2,"input":1e999}\n');
  const t = new CostLedgerTotals();
  await t.refreshFully(p);
  assert.equal(Number.isFinite(t.tokensFor('a')), true);
  assert.equal(t.tokensFor('a'), 15);
});

test('tokens: the incremental fold and the one-shot fold agree', async () => {
  const lines = [row('a', 's1', 20, 900), row('a', 's1', 0, 0), row('a', 's1', 3, 40)];
  const t = await totalsFor(lines);
  const text = `${lines.join('\n')}\n`;
  assert.equal(lifetimeTokensFromLedger(text).get('a'), t.tokensFor('a'));
  assert.equal(lifetimeUsdFromLedger(text).get('a'), t.usdFor('a'));
});

test('tokens: a grok row is folded like any other — the model field decides nothing', async () => {
  // The live symptom: cost-ledger.jsonl had real counts for a grok agent and fleet.json
  // still said 0. Nothing in this fold has ever looked at `model`, and a test says so.
  const grok = JSON.stringify({
    agent_id: 'ryan', session_id: 's1', ts: 0,
    input: 5517798, output: 65940, cache_read: 3966336, cache_creation: 0,
    model: 'grok-4.7-build', usd: 1.87378888
  });
  const t = new CostLedgerTotals();
  await t.refreshFully(ledgerWith([grok]));
  assert.equal(t.tokensFor('ryan'), 9550074);
  assert.equal(Number(t.usdFor('ryan').toFixed(4)), 1.8738);
});

test('the fleet snapshot prefers the ledger for tokens, and only falls back when cold', () => {
  // writeFleetSnapshot lives in index.ts, which cannot be loaded here (electron), so the
  // wiring is pinned where it is written. `usd` on the same row has read the ledger since
  // the lifetime fold landed; `tokens` was the one field still reading the session sample.
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'index.ts'), 'utf8');
  const fn = src.slice(src.indexOf('function writeFleetSnapshot('));
  const body = fn.slice(0, fn.indexOf('\n}\n'));
  assert.match(body, /costTotals\.tokensFor\(id\)/, 'the snapshot asks the ledger for tokens');
  assert.match(body, /lifetimeTokens === null \? sessionTokens : lifetimeTokens/,
    'cold ledger falls back to the session sample rather than publishing 0');
  assert.doesNotMatch(body, /tokens = u \?/, 'the old session-only sum is gone, not just shadowed');
});
