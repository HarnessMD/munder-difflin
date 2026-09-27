// The Temps ledger (shared/workerHistory.ts, plan 4.8): append, cap at 500,
// survives a malformed line. Plus the wiring that makes it a ledger and not a
// module: main writes one row per teardown from the one funnel every worker
// death passes, every kill site stamps its reason, and the renderer has a
// door and a poke.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const L = loadTs('src/shared/workerHistory.ts');
const src = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const input = (i, extra = {}) => ({
  workerId: `worker-${i}`, reqId: `${i}`, name: `w${i}`, job: `job ${i}`, baseBranch: 'main',
  hasSlack: false, spawnedAt: i, tokensUsed: i * 10, tokenCap: null, result: 'done', ...extra
});
const row = (i, extra = {}) => L.withWorkerHistoryEntry([], input(i, extra), `r${i}`, i + 1).entry;

test('append goes to the front, derives ok from result, and caps at 500', () => {
  assert.equal(L.WORKER_HISTORY_LIMIT, 500);
  const current = Array.from({ length: L.WORKER_HISTORY_LIMIT }, (_, i) => row(i));
  const { entry, next } = L.withWorkerHistoryEntry(current, input(999, { result: 'idle', slack: { channel: 'C', thread_ts: '1' }, tokenCap: 0 }), 'fresh', 777);
  assert.equal(next.length, L.WORKER_HISTORY_LIMIT, 'the cap holds');
  assert.equal(next[0], entry, 'newest first');
  assert.equal(entry.id, 'fresh');
  assert.equal(entry.endedAt, 777, 'endedAt is stamped when absent');
  assert.equal(entry.ok, false, 'only done is ok');
  assert.equal(entry.tokenCap, null, 'a zero cap is uncapped');
  assert.equal(entry.worktree, null, 'the worktree fate is unknown at teardown');
  assert.ok(!('slack' in entry), 'a stray field on the input never reaches the ledger');
  assert.equal(next[next.length - 1].id, `r${L.WORKER_HISTORY_LIMIT - 2}`, 'the oldest row fell off');
  assert.equal(row(1).ok, true);
  for (const r of L.WORKER_RESULTS) assert.equal(row(1, { result: r }).ok, r === 'done', r);
});

test('a long objective is cut, never stored whole', () => {
  const e = row(1, { job: 'x'.repeat(2000) });
  assert.ok(e.job.length <= L.JOB_MAX);
  assert.ok(e.job.endsWith('…'));
});

test('a malformed line loses that line, not the ledger', () => {
  const good = [row(1), row(2), row(3)];
  const text = [
    JSON.stringify(good[0]),
    '{"id":"half-written","workerId":"w"',
    'not json at all',
    JSON.stringify({ ...good[1], result: 'vanished' }),
    JSON.stringify(good[2]),
    ''
  ].join('\n');
  const parsed = L.parseWorkerHistory(text);
  assert.deepEqual(parsed.map((r) => r.id), ['r1', 'r3']);
  assert.deepEqual(L.parseWorkerHistory(''), []);
  assert.deepEqual(L.parseWorkerHistory(L.serializeWorkerHistory(good)), good, 'round trip');
});

test('the worktree fate lands on the newest row for that worker and nothing else', () => {
  const rows = [row(3, { workerId: 'worker-a' }), row(2), row(1, { workerId: 'worker-a' })];
  const next = L.withWorktreeFate(rows, 'worker-a', 'preserved');
  assert.equal(next[0].worktree, 'preserved');
  assert.equal(next[2].worktree, null, 'the older row for the same worker is untouched');
  assert.equal(next[1].worktree, null);
  assert.equal(L.withWorktreeFate(rows, 'nobody', 'removed'), rows, 'an unknown worker changes nothing');
  assert.ok(!L.isWorkerHistoryEntry({ ...row(1), worktree: 'kept' }), 'an unknown fate is not a row');
});

test('main writes the row from the one funnel, and every kill site stamps its reason', () => {
  const main = src('src/main/index.ts');
  const teardown = main.slice(main.indexOf('function teardownPty('), main.indexOf('function recordWorkerTeardown('));
  const recordAt = teardown.indexOf('recordWorkerTeardown(workerRec)');
  assert.ok(recordAt > 0, 'teardownPty records the row');
  assert.ok(recordAt < teardown.indexOf('telemetry.forgetAgent'), 'the row is written before the token counter is forgotten');
  assert.ok(recordAt < teardown.indexOf('liveWorkers.delete'), 'the row is written before the record is dropped');
  for (const r of ['done', 'token-cap', 'idle', 'stopped']) {
    assert.ok(main.includes(`rec.result = '${r}';`), `a kill site stamps '${r}'`);
  }
  assert.ok(main.includes("result: rec.result ?? 'exited'"), 'no stamp means the PTY ended on its own');
  assert.ok(main.includes("job: objective"), 'the objective rides the record into the ledger');
  assert.ok(main.includes("setWorkerHistoryWorktree(worker.workerId, 'preserved')") && main.includes("setWorkerHistoryWorktree(worker.workerId, 'removed')"), 'both worktree fates are recorded');
  assert.ok(main.includes("ipcMain.handle('workers:history', () => listWorkerHistory())"));
  assert.ok(main.includes("send('workers:historyUpdated')"));
  const preload = src('src/preload/index.ts');
  assert.ok(preload.includes("workersHistory: (): Promise<WorkerHistoryEntry[]> => ipcRenderer.invoke('workers:history')"));
  assert.ok(preload.includes("ipcRenderer.on('workers:historyUpdated', listener)"));
  const ledger = src('src/main/workerHistory.ts');
  assert.ok(ledger.includes("app.getPath('userData')") && ledger.includes("'worker-history.jsonl'"), 'the ledger lives in userData like the other two');
});
