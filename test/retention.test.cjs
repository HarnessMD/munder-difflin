'use strict';

/**
 * The retention sweep: the pure planner exhaustively, and every destructive
 * path against a real temp directory.
 *
 * The destructive half is the point of this file. Deleting a user's data is the
 * most dangerous thing this app does, so "a trim keeps the newest", "a reap
 * never leaves zero", "a path outside the root is refused" and "a symlink is
 * not followed" are each proved against real files rather than argued about.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const {
  RETENTION_POLICIES, COMMAND_HISTORY_LIMIT, CARRY_SESSION_ID,
  planTrim, planReap, planCostLedgerCarry, costLedgerKeyOf, CostCarryFold,
  formatBytes, retentionLine, retentionSummary
} = loadTs('src/shared/retention.ts');

const {
  withinRoot, reapFiles, reapDirs, reapRosterBackups, trimLedger, trimBoardArchive,
  capTasksArchive, runRetention, RETENTION_INTERVAL_MS, RETENTION_FIRST_DELAY_MS
} = loadTs('src/main/retention.ts');

const { lifetimeUsdFromLedger } = loadTs('src/main/costLifetime.ts');

const DAY = 86_400_000;

function tmp(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `md-${prefix}-`));
}

/** A harness home with a hive inside it, the shape runRetention verifies. */
function tmpHome() {
  const home = tmp('retention');
  fs.mkdirSync(path.join(home, 'hive'), { recursive: true });
  return home;
}

function bytesPolicy(max) {
  return { id: 'test', label: 'Test', kind: 'bytes', max, why: 'test' };
}

function countPolicy(max, extra = {}) {
  return { id: 'test', label: 'Test', kind: 'count', max, why: 'test', ...extra };
}

function lines(n, text) {
  return Array.from({ length: n }, (_, i) => `${text}${i}`);
}

function touch(p, mtimeMs) {
  const s = mtimeMs / 1000;
  fs.utimesSync(p, s, s);
}

// ─── the policy table ────────────────────────────────────────────────────────

test('every policy carries a bound, a label and the sentence that defends it', () => {
  const ids = Object.keys(RETENTION_POLICIES);
  assert.ok(ids.length >= 8, 'the survey found eight stores; the table must cover them');
  for (const id of ids) {
    const p = RETENTION_POLICIES[id];
    assert.equal(p.id, id, `${id} is keyed by its own id`);
    assert.ok(p.label.length > 0, `${id} has a label`);
    assert.ok(['bytes', 'count'].includes(p.kind), `${id} is bounded by count or bytes, never by age`);
    assert.ok(p.max > 1, `${id} has a bound above one, so a store can never end up empty`);
    // A bound nobody can defend is a bound the next person doubles.
    assert.ok(p.why.length > 60, `${id} explains its number`);
    assert.ok(/[.]$/.test(p.why), `${id}'s reason is a sentence`);
  }
});

test('no user visible copy contains a dash', () => {
  const copy = [];
  for (const id of Object.keys(RETENTION_POLICIES)) {
    copy.push(RETENTION_POLICIES[id].label, RETENTION_POLICIES[id].why);
  }
  copy.push(
    retentionSummary([]),
    retentionSummary([{ id: 'a', label: 'Cost ledger', removed: 3, freedBytes: 2048 }]),
    retentionLine({ id: 'a', label: 'Cost ledger', removed: 0, freedBytes: 0 }),
    retentionLine({ id: 'a', label: 'Cost ledger', removed: 0, freedBytes: 4096 }),
    retentionLine({ id: 'a', label: 'Cost ledger', removed: 2, freedBytes: 4096 }),
    retentionLine({ id: 'a', label: 'Cost ledger', removed: 0, freedBytes: 0, refused: 'the file is outside its root' })
  );
  for (const s of copy) {
    assert.ok(!s.includes('—') && !s.includes('–') && !s.includes(' - '), `no dashes in: ${s}`);
  }
});

test('the command history cap is the policy table value', () => {
  assert.equal(COMMAND_HISTORY_LIMIT, RETENTION_POLICIES.commandHistory.max);
  // Deeper than the deepest page listHistory will serve (clampLimit caps at 1000).
  assert.ok(COMMAND_HISTORY_LIMIT >= 1000);
});

test('the cost ledger cap stays under costLifetime.ts per pass read cap', () => {
  // 8 MB is MAX_BYTES_PER_PASS in costLifetime.ts. A trimmed ledger under that
  // is always smaller than any offset the incremental folder can be holding, so
  // the fold resets and re-reads instead of reading shifted bytes.
  assert.ok(RETENTION_POLICIES.costLedger.max < 8 * 1024 * 1024);
});

// ─── planTrim ────────────────────────────────────────────────────────────────

test('planTrim on an empty file does nothing', () => {
  const plan = planTrim([], bytesPolicy(100));
  assert.deepEqual(plan, { drop: 0, keep: 0, keepFromByte: 0, bytesDropped: 0, bytesKept: 0 });
});

test('planTrim keeps everything already inside the bound', () => {
  const ls = [{ bytes: 10 }, { bytes: 10 }, { bytes: 10 }];
  assert.equal(planTrim(ls, bytesPolicy(100)).drop, 0);
  assert.equal(planTrim(ls, countPolicy(10)).drop, 0);
});

test('planTrim by bytes keeps the NEWEST lines that fit', () => {
  const ls = [{ bytes: 10 }, { bytes: 10 }, { bytes: 10 }, { bytes: 10 }];
  const plan = planTrim(ls, bytesPolicy(25));
  assert.equal(plan.keep, 2, 'two 10 byte lines fit in 25, a third does not');
  assert.equal(plan.drop, 2);
  assert.equal(plan.bytesDropped, 20);
  assert.equal(plan.bytesKept, 20);
  assert.equal(plan.keepFromByte, 20, 'the offset of the first kept line');
});

test('planTrim by count keeps the newest N', () => {
  const ls = lines(10, '').map(() => ({ bytes: 7 }));
  const plan = planTrim(ls, countPolicy(3));
  assert.equal(plan.keep, 3);
  assert.equal(plan.drop, 7);
  assert.equal(plan.keepFromByte, 49);
});

test('planTrim never empties a non empty file, even for one oversized line', () => {
  const plan = planTrim([{ bytes: 5 }, { bytes: 5_000 }], bytesPolicy(10));
  assert.equal(plan.keep, 1, 'the newest line survives whatever its size');
  assert.equal(plan.drop, 1);
  assert.equal(planTrim([{ bytes: 9 }], countPolicy(0)).keep, 1);
});

test('planTrim ignores a negative or absurd line size rather than trusting it', () => {
  const plan = planTrim([{ bytes: -50 }, { bytes: 10 }], bytesPolicy(10));
  assert.equal(plan.bytesDropped, 0);
  assert.equal(plan.keep, 2);
});

// ─── planReap ────────────────────────────────────────────────────────────────

const NOW = Date.UTC(2026, 8, 4, 12, 0, 0);

function candidates(n, stepMs = 1000, from = NOW) {
  return Array.from({ length: n }, (_, i) => ({ name: `f${i}`, mtimeMs: from - i * stepMs }));
}

test('planReap keeps the newest max and drops the rest', () => {
  const plan = planReap(candidates(10), countPolicy(3), NOW + DAY);
  assert.deepEqual(plan.keep, ['f0', 'f1', 'f2']);
  assert.equal(plan.drop.length, 7);
});

test('planReap on an empty directory plans nothing', () => {
  assert.deepEqual(planReap([], countPolicy(3), NOW), { keep: [], drop: [] });
});

test('planReap never leaves zero entries', () => {
  for (const max of [0, 1, 5]) {
    const plan = planReap(candidates(4), countPolicy(max), NOW + DAY);
    assert.ok(plan.keep.length >= 1, `max ${max} still keeps something`);
  }
});

test('planReap keeps anything younger than the safety floor whatever the count says', () => {
  const fresh = candidates(10, 1000);
  const plan = planReap(fresh, countPolicy(2, { minAgeMs: 60_000 }), NOW);
  assert.equal(plan.drop.length, 0, 'ten files written in the last ten seconds are all fresh');
});

test('planReap keeps one per day beyond the flat count', () => {
  // Four files today, then one a day for a week.
  const today = candidates(4, 1000, NOW);
  const daily = Array.from({ length: 7 }, (_, i) => ({ name: `d${i}`, mtimeMs: NOW - (i + 1) * DAY }));
  const plan = planReap([...today, ...daily], countPolicy(2, { keepDailyDays: 3 }), NOW + 1);
  assert.deepEqual(plan.keep.slice(0, 2), ['f0', 'f1'], 'the flat tier is the newest two');
  assert.deepEqual(plan.keep.slice(2), ['d0', 'd1', 'd2'], 'then one per day for three days');
  assert.equal(plan.keep.length, 5);
  assert.ok(plan.drop.includes('d6'), 'and nothing older survives');
});

test('planReap spends its daily budget on days, not on files from the same day', () => {
  const sameDay = Array.from({ length: 6 }, (_, i) => ({ name: `s${i}`, mtimeMs: NOW - i * 60_000 }));
  const plan = planReap(sameDay, countPolicy(1, { keepDailyDays: 4 }), NOW + DAY);
  assert.equal(plan.keep.length, 1, 'the flat tier already covered today');
  assert.equal(plan.drop.length, 5);
});

test('planReap ties break on name so the plan never depends on readdir order', () => {
  const same = [{ name: 'a', mtimeMs: NOW }, { name: 'b', mtimeMs: NOW }, { name: 'c', mtimeMs: NOW }];
  const forward = planReap(same, countPolicy(1), NOW + DAY);
  const reversed = planReap([...same].reverse(), countPolicy(1), NOW + DAY);
  assert.deepEqual(forward, reversed);
  assert.deepEqual(forward.keep, ['c']);
});

// ─── the cost ledger's carry ─────────────────────────────────────────────────

function row(agent, session, usd, ts = 1) {
  return JSON.stringify({
    agent_id: agent, session_id: session, ts,
    input: 1, output: 1, cache_read: 0, cache_creation: 0, model: 'm', usd
  });
}

test('costLedgerKeyOf reads the key and refuses everything else', () => {
  assert.equal(costLedgerKeyOf(row('a', 's1', 1)), 'a\ts1');
  assert.equal(costLedgerKeyOf('{"agent_id":"a"}'), 'a\t');
  assert.equal(costLedgerKeyOf('not json'), null);
  assert.equal(costLedgerKeyOf(''), null);
  assert.equal(costLedgerKeyOf('{"usd":1}'), null);
});

test('a fully dropped session folds into the carry with no line of its own', () => {
  const dropped = [row('a', 's1', 1), row('a', 's1', 3), row('a', 's1', 7)];
  const plan = planCostLedgerCarry(dropped, 99, []);
  assert.equal(plan.survivors.length, 0);
  assert.equal(plan.carry.length, 1);
  const c = JSON.parse(plan.carry[0]);
  assert.equal(c.agent_id, 'a');
  assert.equal(c.session_id, CARRY_SESSION_ID);
  assert.equal(c.usd, 7, 'the peak of the segment that ended in the dropped region');
});

test('a straddling session leaves its last line so the kept rows fold on from it', () => {
  const dropped = [row('a', 's1', 1), row('a', 's1', 4)];
  const kept = [row('a', 's1', 9)];
  const plan = planCostLedgerCarry(dropped, 99, kept);
  assert.equal(plan.survivors.length, 1);
  assert.equal(JSON.parse(plan.survivors[0]).usd, 4);
  assert.equal(plan.carry.length, 0, 'nothing closed, so there is nothing to carry');
});

test('a restart inside the dropped region is carried as a closed segment', () => {
  // 1, 5, then 0 (the app restarted), then 2. Lifetime is 5 + 2.
  const dropped = [row('a', 's1', 1), row('a', 's1', 5), row('a', 's1', 0), row('a', 's1', 2)];
  const plan = planCostLedgerCarry(dropped, 99, []);
  assert.equal(JSON.parse(plan.carry[0]).usd, 7);
});

test('a previous carry line folds into the next one instead of accumulating', () => {
  const fold = new CostCarryFold();
  fold.add(JSON.stringify({ agent_id: 'a', session_id: CARRY_SESSION_ID, usd: 12 }));
  fold.add(row('a', 's9', 3));
  const plan = fold.finish(1, new Set());
  assert.equal(plan.carry.length, 1, 'one carry line per agent, never two');
  assert.equal(JSON.parse(plan.carry[0]).usd, 15);
  assert.equal(plan.survivors.length, 0);
});

test('the fold skips a half written or shapeless line rather than the file', () => {
  const plan = planCostLedgerCarry(['{"agent_id":"a","usd":', 'nonsense', row('a', 's1', 4)], 1, []);
  assert.equal(JSON.parse(plan.carry[0]).usd, 4);
});

// ─── formatBytes and the copy ────────────────────────────────────────────────

test('formatBytes reads like a size a person would say', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(512), '512 B');
  assert.equal(formatBytes(1024), '1 KB');
  assert.equal(formatBytes(1536), '1.5 KB');
  assert.equal(formatBytes(4 * 1024 * 1024), '4 MB');
  assert.equal(formatBytes(15.4 * 1024 * 1024), '15 MB');
  assert.equal(formatBytes(3 * 1024 * 1024 * 1024), '3 GB');
  assert.equal(formatBytes(-1), '0 B');
  assert.equal(formatBytes(NaN), '0 B');
});

test('the summary says what happened, or says nothing happened', () => {
  assert.equal(retentionSummary([]), 'Every store on disk is already inside its limit.');
  assert.equal(
    retentionSummary([{ id: 'a', label: 'A', removed: 0, freedBytes: 0, refused: 'outside' }]),
    'Every store on disk is already inside its limit.'
  );
  assert.equal(
    retentionSummary([{ id: 'a', label: 'A', removed: 2, freedBytes: 2048 }]),
    'Trimmed 1 store and freed 2 KB.'
  );
  assert.equal(
    retentionSummary([
      { id: 'a', label: 'A', removed: 2, freedBytes: 1024 },
      { id: 'b', label: 'B', removed: 0, freedBytes: 1024 }
    ]),
    'Trimmed 2 stores and freed 2 KB.'
  );
});

// ─── the destructive paths ───────────────────────────────────────────────────

test('withinRoot accepts the root and its children and nothing else', () => {
  assert.equal(withinRoot('/a/b', '/a/b'), true);
  assert.equal(withinRoot('/a/b', '/a/b/c'), true);
  assert.equal(withinRoot('/a/b', '/a/bc'), false, 'a name that merely starts the same is outside');
  assert.equal(withinRoot('/a/b', '/a'), false);
  assert.equal(withinRoot('/a/b', '/a/b/../../c'), false, 'traversal resolves before it is judged');
});

test('a trim keeps the newest lines and rewrites the file in place', async () => {
  const home = tmpHome();
  const p = path.join(home, 'log.jsonl');
  const body = lines(200, 'line-').map((l) => `${l}\n`).join('');
  fs.writeFileSync(p, body, 'utf8');

  const before = fs.statSync(p);
  const r = await trimLedger(home, p, bytesPolicy(400));
  assert.equal(r.refused, undefined);
  assert.ok(r.freedBytes > 0);

  const after = fs.readFileSync(p, 'utf8').trim().split('\n');
  assert.ok(after.length < 200, 'something was dropped');
  assert.equal(after[after.length - 1], 'line-199', 'the newest line survived');
  assert.ok(after.every((l) => /^line-\d+$/.test(l)), 'no line was cut in half');
  // Contiguous: the kept lines are the tail of the original, not a sample.
  const firstKept = Number(after[0].slice('line-'.length));
  after.forEach((l, i) => assert.equal(l, `line-${firstKept + i}`));
  assert.ok(fs.statSync(p).size <= 400 + 64);
  assert.equal(
    Math.round(fs.statSync(p).mtimeMs), Math.round(before.mtimeMs),
    'the mtime is restored, so the heartbeat quiet check is not fooled by a sweep'
  );
});

test('a file already inside its bound is not touched at all', async () => {
  const home = tmpHome();
  const p = path.join(home, 'log.jsonl');
  fs.writeFileSync(p, 'a\nb\nc\n', 'utf8');
  const r = await trimLedger(home, p, bytesPolicy(1000));
  assert.deepEqual({ removed: r.removed, freedBytes: r.freedBytes }, { removed: 0, freedBytes: 0 });
  assert.equal(fs.readFileSync(p, 'utf8'), 'a\nb\nc\n');
});

test('a trim keeps a final line that has no trailing newline', async () => {
  const home = tmpHome();
  const p = path.join(home, 'log.jsonl');
  fs.writeFileSync(p, `${lines(100, 'x-').join('\n')}\nLAST`, 'utf8');
  await trimLedger(home, p, bytesPolicy(120));
  assert.ok(fs.readFileSync(p, 'utf8').endsWith('LAST'), 'the newest line is never the one dropped');
});

test('the cost ledger trim preserves lifetime spend EXACTLY', async () => {
  const home = tmpHome();
  const p = path.join(home, 'cost-ledger.jsonl');

  // Two agents, several sessions each, with restarts (a usd that goes DOWN) so
  // there are closed segments to lose, and two sessions still live at the cut.
  const rows = [];
  for (let s = 0; s < 6; s++) {
    for (let i = 1; i <= 40; i++) rows.push(row('dwight', `s${s}`, i * 0.11, s * 100 + i));
    for (let i = 1; i <= 40; i++) rows.push(row('jim', `j${s}`, i * 0.07, s * 100 + i));
  }
  // The live sessions straddle the cut: they keep appending at the end.
  for (let i = 41; i <= 90; i++) rows.push(row('dwight', 's5', i * 0.11, 1000 + i));
  for (let i = 41; i <= 90; i++) rows.push(row('jim', 'j5', i * 0.07, 1000 + i));
  const original = `${rows.join('\n')}\n`;
  fs.writeFileSync(p, original, 'utf8');

  const beforeTotals = lifetimeUsdFromLedger(original);
  assert.ok(beforeTotals.get('dwight') > 0 && beforeTotals.get('jim') > 0);

  const r = await trimLedger(home, p, bytesPolicy(4000), { carry: true, now: 12345 });
  assert.equal(r.refused, undefined);
  const trimmed = fs.readFileSync(p, 'utf8');
  assert.ok(trimmed.length < original.length, 'the ledger really did shrink');

  const afterTotals = lifetimeUsdFromLedger(trimmed);
  for (const agent of ['dwight', 'jim']) {
    assert.ok(
      Math.abs(afterTotals.get(agent) - beforeTotals.get(agent)) < 1e-6,
      `${agent}: ${afterTotals.get(agent)} should still be ${beforeTotals.get(agent)}`
    );
  }
  // And it is stable: trimming again does not drift the number either.
  const r2 = await trimLedger(home, p, bytesPolicy(2000), { carry: true, now: 12346 });
  assert.equal(r2.refused, undefined);
  const twice = lifetimeUsdFromLedger(fs.readFileSync(p, 'utf8'));
  for (const agent of ['dwight', 'jim']) {
    assert.ok(Math.abs(twice.get(agent) - beforeTotals.get(agent)) < 1e-6, `${agent} survives a second trim`);
  }
  // The head stays small: one carry line per agent plus one per LIVE session.
  const head = fs.readFileSync(p, 'utf8').split('\n').filter((l) => l.includes(CARRY_SESSION_ID));
  assert.equal(head.length, 2, 'two agents, two carry lines, never one per session ever seen');
});

test('a reap deletes the oldest and never leaves zero backups', () => {
  const home = tmpHome();
  const dir = path.join(home, 'roster-backups');
  fs.mkdirSync(dir);
  const names = [];
  for (let i = 0; i < 300; i++) {
    const n = `roster-2026-09-04T12-30-00-${String(i % 1000).padStart(3, '0')}Z-${i}-write.json`;
    fs.writeFileSync(path.join(dir, n), `{"i":${i}}`, 'utf8');
    touch(path.join(dir, n), NOW - (300 - i) * 1000);
    names.push(n);
  }
  const r = reapRosterBackups(home, NOW + DAY);
  assert.equal(r.refused, undefined);
  const left = fs.readdirSync(dir);
  assert.ok(left.length > 0, 'a reap never leaves zero backups');
  assert.equal(left.length, RETENTION_POLICIES.rosterBackups.max, 'all 300 landed on one day, so the flat tier is the whole answer');
  assert.ok(left.includes(names[299]), 'the newest backup survived');
  assert.ok(!left.includes(names[0]), 'the oldest did not');
  assert.equal(r.removed, 300 - left.length);
  assert.ok(r.freedBytes > 0);
});

test('a reap keeps a file whose name is not the writer own format', () => {
  const home = tmpHome();
  const dir = path.join(home, 'roster-backups');
  fs.mkdirSync(dir);
  for (let i = 0; i < 120; i++) {
    const n = `roster-2026-09-04T12-30-00-${String(i).padStart(3, '0')}Z-${i}-write.json`;
    fs.writeFileSync(path.join(dir, n), '{}', 'utf8');
    touch(path.join(dir, n), NOW - (120 - i) * 1000);
  }
  const keepers = ['notes.txt', 'roster.json', 'roster-hand-copied.json', '.DS_Store'];
  for (const n of keepers) {
    fs.writeFileSync(path.join(dir, n), 'mine', 'utf8');
    touch(path.join(dir, n), NOW - 10 * DAY);
  }
  reapRosterBackups(home, NOW + DAY);
  for (const n of keepers) {
    assert.ok(fs.existsSync(path.join(dir, n)), `${n} was not written by us, so it is not ours to delete`);
  }
});

test('a path outside the root is refused', async () => {
  const home = tmpHome();
  const elsewhere = tmp('elsewhere');
  const victim = path.join(elsewhere, 'important.json');
  fs.writeFileSync(victim, 'do not delete me', 'utf8');
  const ledger = path.join(elsewhere, 'log.jsonl');
  fs.writeFileSync(ledger, `${lines(500, 'y-').join('\n')}\n`, 'utf8');

  const reaped = reapFiles(home, elsewhere, /.*/, countPolicy(1), NOW);
  assert.match(reaped.refused, /outside its root/);
  assert.equal(reaped.removed, 0);

  const dirs = reapDirs(home, elsewhere, /.*/, countPolicy(1), NOW);
  assert.match(dirs.refused, /outside its root/);

  const trimmed = await trimLedger(home, ledger, bytesPolicy(10));
  assert.match(trimmed.refused, /outside its root/);

  assert.equal(fs.readFileSync(victim, 'utf8'), 'do not delete me');
  assert.equal(fs.readFileSync(ledger, 'utf8').split('\n').length, 501);
});

test('a traversal out of the root is refused', () => {
  const home = tmpHome();
  const outside = path.join(home, 'hive', '..', '..');
  assert.match(reapFiles(path.join(home, 'hive'), outside, /.*/, countPolicy(1), NOW).refused, /outside its root/);
});

test('a symlink is never followed and never deleted', () => {
  const home = tmpHome();
  const dir = path.join(home, 'roster-backups');
  fs.mkdirSync(dir);
  const outside = tmp('link-target');
  const target = path.join(outside, 'precious.json');
  fs.writeFileSync(target, 'precious', 'utf8');

  // A hundred real backups, all older than the link, so a reap that ignored the
  // link gate would certainly reach it.
  for (let i = 0; i < 100; i++) {
    const n = `roster-2026-09-04T12-30-00-${String(i).padStart(3, '0')}Z-${i}-write.json`;
    fs.writeFileSync(path.join(dir, n), '{}', 'utf8');
    touch(path.join(dir, n), NOW - (100 - i) * 1000);
  }
  // A link wearing exactly the writer's filename, and older than everything.
  const linkName = 'roster-2026-09-04T12-30-00-999Z-999-write.json';
  fs.symlinkSync(target, path.join(dir, linkName));
  try { touch(path.join(dir, linkName), NOW - 10 * DAY); } catch { /* lutimes only on some platforms */ }

  reapRosterBackups(home, NOW + DAY);

  assert.ok(fs.existsSync(target), 'the file the link pointed at is untouched');
  assert.equal(fs.readFileSync(target, 'utf8'), 'precious');
  assert.ok(fs.lstatSync(path.join(dir, linkName)).isSymbolicLink(), 'and the link itself was left alone');
});

test('a store folder that is itself a symlink is refused', () => {
  const home = tmpHome();
  const outside = tmp('linked-store');
  fs.writeFileSync(path.join(outside, 'roster-2026-09-04T12-30-00-000Z-1-write.json'), '{}', 'utf8');
  fs.symlinkSync(outside, path.join(home, 'roster-backups'));
  const r = reapRosterBackups(home, NOW + DAY);
  assert.match(r.refused, /not a plain directory/);
  assert.equal(fs.readdirSync(outside).length, 1);
});

test('a ledger that is a symlink is refused rather than rewritten', async () => {
  const home = tmpHome();
  const outside = tmp('linked-ledger');
  const real = path.join(outside, 'real.jsonl');
  fs.writeFileSync(real, `${lines(500, 'z-').join('\n')}\n`, 'utf8');
  fs.symlinkSync(real, path.join(home, 'log.jsonl'));
  const r = await trimLedger(home, path.join(home, 'log.jsonl'), bytesPolicy(50));
  assert.match(r.refused, /not a plain file/);
  assert.equal(fs.readFileSync(real, 'utf8').split('\n').length, 501);
});

test('reapDirs removes whole condense backups, oldest first', () => {
  const home = tmpHome();
  const backups = path.join(home, 'hive', 'backups');
  fs.mkdirSync(backups, { recursive: true });
  const stamps = [];
  for (let i = 0; i < 12; i++) {
    // reflect.ts:424 stamps a condense as `20260904T120000Z`.
    const s = `2026090${(i % 9) + 1}T1200${String(i).padStart(2, '0')}Z`;
    const d = path.join(backups, s, 'dwight');
    fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, 'memory.md'), 'x'.repeat(1000), 'utf8');
    touch(path.join(backups, s), NOW - (12 - i) * DAY);
    stamps.push(s);
  }
  const r = reapDirs(path.join(home, 'hive'), backups, /^\d{8}T\d{6}Z$/, countPolicy(4), NOW + DAY);
  assert.equal(r.refused, undefined);
  const left = fs.readdirSync(backups);
  assert.equal(left.length, 4);
  assert.ok(left.includes(stamps[11]), 'the newest condense backup survived');
  assert.ok(!left.includes(stamps[0]));
  assert.ok(r.freedBytes >= 8000, 'the bytes it freed are the files it actually removed');
});

test('the board archive is cut on an entry heading, never mid copy', async () => {
  const home = tmpHome();
  const p = path.join(home, 'hive', 'board-archive.md');
  const header = '# Board archive\n\n_Every full copy of board.md._\n';
  let body = '';
  for (let i = 0; i < 40; i++) {
    body += `\n\n## Archived 2026-09-0${(i % 9) + 1} (about ${i} tokens)\n\n${'body '.repeat(60)}entry${i}\n`;
  }
  fs.writeFileSync(p, header + body, 'utf8');

  const r = await trimBoardArchive(path.join(home, 'hive'), p, bytesPolicy(2000));
  assert.equal(r.refused, undefined);
  const out = fs.readFileSync(p, 'utf8');
  assert.ok(out.startsWith('# Board archive'), 'the file own header is preserved verbatim');
  assert.ok(out.includes('entry39'), 'the newest copy survived');
  assert.ok(!out.includes('entry0\n'), 'the oldest did not');
  // Whatever is left after the header starts on a heading, not mid paragraph.
  const afterHeader = out.slice(out.indexOf('## Archived'));
  assert.ok(afterHeader.startsWith('## Archived '));
  assert.ok(out.includes('retention sweep'), 'and the file says why it is shorter than it was');
});

test('the archived card ledger is capped newest first', () => {
  const home = tmpHome();
  const p = path.join(home, 'hive', 'tasks-archive.json');
  const tasks = Array.from({ length: 50 }, (_, i) => ({ id: `t${i}`, title: 'x'.repeat(200) }));
  fs.writeFileSync(p, JSON.stringify({ tasks, extra: 'kept' }), 'utf8');

  const r = capTasksArchive(path.join(home, 'hive'), p, countPolicy(10));
  assert.equal(r.refused, undefined);
  assert.equal(r.removed, 40);
  const doc = JSON.parse(fs.readFileSync(p, 'utf8'));
  assert.equal(doc.tasks.length, 10);
  assert.equal(doc.tasks[0].id, 't0', 'the writer keeps this list newest first');
  assert.equal(doc.extra, 'kept', 'a field we do not model survives the cap');
});

test('an unparseable card ledger is left exactly as it is', () => {
  const home = tmpHome();
  const p = path.join(home, 'hive', 'tasks-archive.json');
  fs.writeFileSync(p, '{ not json', 'utf8');
  const r = capTasksArchive(path.join(home, 'hive'), p, countPolicy(1));
  assert.match(r.refused, /could not be parsed/);
  assert.equal(fs.readFileSync(p, 'utf8'), '{ not json');
});

// ─── the whole sweep ─────────────────────────────────────────────────────────

test('the sweep refuses to run when the roots do not check out', async () => {
  const bogus = tmp('bogus');
  for (const roots of [
    { hiveRoot: null, harnessHome: null },
    { hiveRoot: path.join(bogus, 'hive'), harnessHome: null },
    { hiveRoot: bogus, harnessHome: bogus },                       // not named hive
    { hiveRoot: path.join(bogus, 'hive'), harnessHome: bogus },    // does not exist
    { hiveRoot: '/tmp/somewhere/hive', harnessHome: bogus }        // not inside the home
  ]) {
    const out = await runRetention(roots, NOW);
    assert.equal(out.length, 1);
    assert.match(out[0].refused, /could not be verified/);
  }
});

test('one sweep bounds every store it is given and touches nothing else', async () => {
  const home = tmpHome();
  const hive = path.join(home, 'hive');
  fs.mkdirSync(path.join(hive, 'agents', 'dwight', 'inbox', '.done'), { recursive: true });
  fs.mkdirSync(path.join(hive, 'agents', 'dwight', 'outbox', '.sent'), { recursive: true });
  fs.mkdirSync(path.join(hive, 'spawn-requests', '.done'), { recursive: true });

  for (let i = 0; i < 40; i++) {
    const n = `2026-09-04T12-30-00-${String(i).padStart(3, '0')}Z-abc${i}.json`;
    for (const d of [
      path.join(hive, 'agents', 'dwight', 'inbox', '.done'),
      path.join(hive, 'agents', 'dwight', 'outbox', '.sent'),
      path.join(hive, 'spawn-requests', '.done')
    ]) {
      fs.writeFileSync(path.join(d, n), '{}', 'utf8');
      touch(path.join(d, n), NOW - (40 - i) * 60_000);
    }
  }
  // A live inbox message, which is NOT an archive and must survive untouched.
  const live = path.join(hive, 'agents', 'dwight', 'inbox', 'live.json');
  fs.writeFileSync(live, '{"id":"live"}', 'utf8');

  const out = await runRetention({ hiveRoot: hive, harnessHome: home }, NOW + DAY);
  const byId = Object.fromEntries(out.map((o) => [o.id, o]));
  assert.ok(Object.keys(byId).length >= 8, 'every store in the table is reported on');
  for (const o of out) assert.equal(o.refused, undefined, `${o.id}: ${o.refused}`);

  // Nothing here is over its real bound yet, so the sweep is a no op, which is
  // itself the thing to prove: a sweep that deletes on a small floor is a bug.
  assert.equal(byId.messageArchive.removed, 0);
  assert.equal(byId.spawnRequests.removed, 0);
  assert.equal(fs.readdirSync(path.join(hive, 'agents', 'dwight', 'inbox', '.done')).length, 40);
  assert.equal(fs.readFileSync(live, 'utf8'), '{"id":"live"}');
});

test('the sweep bounds the archives once they are actually over', async () => {
  const home = tmpHome();
  const hive = path.join(home, 'hive');
  const done = path.join(hive, 'agents', 'dwight', 'inbox', '.done');
  fs.mkdirSync(done, { recursive: true });
  const over = RETENTION_POLICIES.messageArchive.max + 25;
  for (let i = 0; i < over; i++) {
    const n = `2026-09-04T12-30-00-000Z-m${i}.json`;
    fs.writeFileSync(path.join(done, n), '{}', 'utf8');
    touch(path.join(done, n), NOW - (over - i) * 60_000);
  }
  const out = await runRetention({ hiveRoot: hive, harnessHome: home }, NOW + DAY);
  const archive = out.find((o) => o.id === 'messageArchive');
  assert.equal(archive.refused, undefined);
  assert.equal(archive.removed, 25);
  const left = fs.readdirSync(done);
  assert.equal(left.length, RETENTION_POLICIES.messageArchive.max);
  assert.ok(left.includes(`2026-09-04T12-30-00-000Z-m${over - 1}.json`), 'the newest handled message survived');
});

test('the sweep cadence is hourly and its first pass waits for the cost fold', () => {
  assert.equal(RETENTION_INTERVAL_MS, 3_600_000);
  assert.ok(RETENTION_FIRST_DELAY_MS >= 60_000, 'boot must not race the incremental cost ledger fold');
});
