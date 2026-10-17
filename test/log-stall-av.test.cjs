'use strict';

/**
 * LOG-STALL-AV (Jim, MAIL-AV-152; 1.1.53). The mail/Write/Read antivirus pain was synchronous
 * appendFileSync on Electron main into a 74 MB log.jsonl and a 21 MB cost-ledger.jsonl, never
 * rotated, rescanned on every open/close (~390-460 ms and ~0.9 scanner CPU-s per row, ~30 rows
 * per message).
 *  F1  the app keeps both files OPEN (one open, then writeSync per row: 0.01-0.06 ms).
 *  F2  both rotate at 8 MB; log keeps 8 rotated, the ledger keeps all; a pre-existing oversize
 *      file becomes a never-deleted legacy file; logTail and the lifetime-cost fold read across.
 *  F3  event-path wake rows are logged on edges only (< 5 per message), the rest counted.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const JAIL = fs.mkdtempSync(path.join(os.tmpdir(), 'logstall-'));
const realEnv = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE };
process.env.HOME = JAIL; process.env.USERPROFILE = JAIL;
test.after(() => { for (const [k, v] of Object.entries(realEnv)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; } try { fs.rmSync(JAIL, { recursive: true, force: true }); } catch { /* on Windows HiveManager.ensureAgent leaves the HOME dir busy (same on the unmodified tree); a temp dir */ } });

const { AppendFile, rotatedFiles, filesInOrder, APPEND_ROTATE_BYTES, LOG_KEEP_ROTATED } = loadTs('src/main/appendLog.ts');
const { CostLedgerTotals } = loadTs('src/main/costLifetime.ts');
const { HiveManager } = loadTs('src/main/hive.ts');
const dir = () => fs.mkdtempSync(path.join(JAIL, 'd-'));
const rows = (p) => fs.readFileSync(p, 'utf8').split('\n').filter(Boolean);

// ── F1 ────────────────────────────────────────────────────────────────────

test('F1: keepOpen = ONE open for many rows; every row is on disk the moment append returns, in order', () => {
  const p = path.join(dir(), 'log.jsonl');
  let opens = 0;
  const f = new AppendFile(p, { keepOpen: true, onOpen: () => { opens += 1; } });
  for (let i = 0; i < 50; i++) {
    f.append(JSON.stringify({ i }) + '\n');
    assert.equal(rows(p).length, i + 1, 'visible immediately (no buffer to flush)');
  }
  assert.equal(opens, 1, 'one open for 50 rows (each open is an antivirus rescan)');
  assert.equal(f.isOpen, true);
  assert.deepEqual(rows(p).map((l) => JSON.parse(l).i), [...Array(50).keys()]);
  f.close();
  assert.equal(f.isOpen, false);
  f.append('{"after":1}\n');
  assert.equal(opens, 2, 'reopens after a close');
  f.close();
});

test('F1: the default (tests, library callers) holds no descriptor between rows', () => {
  const d = dir(); const p = path.join(d, 'log.jsonl');
  let opens = 0;
  const f = new AppendFile(p, { onOpen: () => { opens += 1; } });
  for (let i = 0; i < 3; i++) f.append('{}\n');
  assert.equal(opens, 3); assert.equal(f.isOpen, false);
  fs.rmSync(d, { recursive: true, force: true });   // deletable: nothing held
});

test('F1 wiring: the app turns keep-open ON at startup and closes on quit; the hive switch closes and reopens', async () => {
  const idx = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'index.ts'), 'utf8');
  assert.match(idx, /hive\.keepAppendFilesOpen\(true\);/);
  assert.match(idx, /const finish = \(\): void => \{ try \{ hive\.closeAppendFiles\(\); \}/);
  const home = dir();
  const hive = new HiveManager(() => home);
  await hive.ensureAgent({ id: 'a1', name: 'A', provider: 'claude', cwd: home });
  hive.keepAppendFilesOpen(true);
  hive.appendLog({ kind: 'x' });
  hive.appendLog({ kind: 'y' });
  const kinds = rows(path.join(home, 'hive', 'log.jsonl')).map((l) => JSON.parse(l).kind);
  assert.deepEqual(kinds.slice(-2), ['x', 'y']);
  assert.match(idx, /\[reset\] hive\.closeAppendFiles/);
  assert.match(idx, /\[changeHome\] hive\.closeAppendFiles/);
  hive.keepAppendFilesOpen(false);   // closes, and a late background row cannot re-hold the file
});

test('F1 GATE (Jim\'s probe): with a large pre-existing log, an app append is sub-millisecond (it was ~390-460 ms)', async () => {
  const home = dir();
  const hive = new HiveManager(() => home);
  await hive.ensureAgent({ id: 'a1', name: 'A', provider: 'claude', cwd: home });
  const log = path.join(home, 'hive', 'log.jsonl');
  const big = Buffer.alloc(20 * 1024 * 1024, 0x20); big[big.length - 1] = 0x0a;
  fs.writeFileSync(log, big);
  hive.keepAppendFilesOpen(true);
  const ms = [];
  for (let i = 0; i < 40; i++) { const t0 = process.hrtime.bigint(); hive.appendLog({ kind: 'probe', i }); ms.push(Number(process.hrtime.bigint() - t0) / 1e6); }
  hive.keepAppendFilesOpen(false);   // closes, and a late background row cannot re-hold the file
  ms.sort((a, b) => a - b);
  assert.ok(ms[20] < 2, `p50 ${ms[20].toFixed(3)} ms`);
  const legacy = rotatedFiles(log).filter((r) => r.legacy);
  assert.equal(legacy.length, 1, 'the 20 MB file went to a legacy file');
  assert.equal(fs.statSync(legacy[0].path).size, big.length, 'every byte of it kept');
});

// ── F2 ────────────────────────────────────────────────────────────────────

test('F2: rotation at the cap; the live file stays under it; rotated names sort in write order; log retention keeps N; legacy is never pruned', () => {
  const d = dir(); const p = path.join(d, 'log.jsonl');
  fs.writeFileSync(p, 'L'.repeat(2000) + '\n');   // pre-existing, over the test cap
  let t = 1000;
  const f = new AppendFile(p, { capBytes: 1000, keep: 3, keepOpen: true, now: () => ++t });
  for (let i = 0; i < 120; i++) f.append(JSON.stringify({ i, pad: 'x'.repeat(40) }) + '\n');
  f.close();
  const rot = rotatedFiles(p);
  assert.equal(rot.filter((r) => r.legacy).length, 1, 'the legacy file is kept');
  assert.equal(fs.readFileSync(rot.find((r) => r.legacy).path, 'utf8'), 'L'.repeat(2000) + '\n', 'byte-identical');
  assert.equal(rot.filter((r) => !r.legacy).length, 3, 'retention: 3 rotated');
  assert.ok(fs.statSync(p).size < 1000);
  for (const r of rot) assert.match(path.basename(r.path), /^log\.(legacy-)?\d+\.jsonl$/);
  const order = filesInOrder(p);
  assert.equal(order.at(-1), p, 'the live file is last');
  const seq = order.filter((x) => !/legacy/.test(x)).flatMap(rows).map((l) => JSON.parse(l).i);
  for (let k = 1; k < seq.length; k++) assert.equal(seq[k], seq[k - 1] + 1, 'contiguous, in order, no row lost or duplicated in what is kept');
  assert.equal(seq.at(-1), 119);
});

test('F2: the cost ledger keeps EVERY rotated file (Infinity)', () => {
  const d = dir(); const p = path.join(d, 'cost-ledger.jsonl');
  let t = 0;
  const f = new AppendFile(p, { capBytes: 300, keep: Infinity, keepOpen: true, now: () => ++t });
  for (let i = 0; i < 100; i++) f.append(JSON.stringify({ agent_id: 'a', session_id: 's', usd: i }) + '\n');
  f.close();
  const all = filesInOrder(p).filter((x) => fs.existsSync(x)).flatMap(rows).map((l) => JSON.parse(l).usd);
  assert.deepEqual(all, [...Array(100).keys()], 'nothing pruned');
});

test('F2: logTail across rotation returns exactly the naive tail of the concatenated log', async () => {
  const home = dir();
  const hive = new HiveManager(() => home);
  await hive.ensureAgent({ id: 'a1', name: 'A', provider: 'claude', cwd: home });
  const live = path.join(home, 'hive', 'log.jsonl');
  // Two rotated files + the live one, as the app writes them.
  fs.writeFileSync(path.join(home, 'hive', 'log.1000.jsonl'), [1, 2, 3].map((i) => JSON.stringify({ i })).join('\n') + '\n');
  fs.writeFileSync(path.join(home, 'hive', 'log.2000.jsonl'), [4, 5].map((i) => JSON.stringify({ i })).join('\n') + '\n');
  fs.writeFileSync(live, [6, 7].map((i) => JSON.stringify({ i })).join('\n') + '\n');
  assert.deepEqual(hive.logTail(4).map((r) => r.i), [4, 5, 6, 7]);
  assert.deepEqual(hive.logTail(100).map((r) => r.i), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(hive.logTail(2).map((r) => r.i), [6, 7]);
});

test('F2: the lifetime cost folded across rotations, INCLUDING a rotation mid-fold, equals the fold of one file', async () => {
  const d = dir(); const p = path.join(d, 'cost-ledger.jsonl');
  // A realistic stream: cumulative per-session samples with a restart (the counter drops).
  const stream = [];
  for (let i = 1; i <= 60; i++) stream.push({ agent_id: 'a', session_id: 's1', usd: i * 0.1 });
  for (let i = 1; i <= 30; i++) stream.push({ agent_id: 'a', session_id: 's1', usd: i * 0.05 });   // reset
  for (let i = 1; i <= 40; i++) stream.push({ agent_id: 'b', session_id: 's2', usd: i * 0.2 });
  const one = path.join(d, 'one.jsonl');
  fs.writeFileSync(one, stream.map((r) => JSON.stringify(r)).join('\n') + '\n');
  const ref = new CostLedgerTotals(); await ref.refreshFully(one);

  let t = 0;
  const f = new AppendFile(p, { capBytes: 700, keep: Infinity, keepOpen: true, now: () => ++t });
  const got = new CostLedgerTotals();
  for (let i = 0; i < stream.length; i++) {
    f.append(JSON.stringify(stream[i]) + '\n');
    if (i % 17 === 0) await got.refresh(p);   // fold while it grows and rotates
  }
  f.close();
  await got.refreshFully(p);
  assert.ok(rotatedFiles(p).length >= 5, 'it really rotated');
  assert.equal(got.ready, true);
  assert.ok(Math.abs(got.floorTotal() - ref.floorTotal()) < 1e-9, `${got.floorTotal()} vs ${ref.floorTotal()}`);
  assert.ok(Math.abs(got.usdFor('a') - ref.usdFor('a')) < 1e-9);
  assert.ok(Math.abs(got.usdFor('b') - ref.usdFor('b')) < 1e-9);
  // Incremental, not a re-read: every rotated file is remembered as done, and a refresh with
  // nothing new reads nothing (a re-read of the whole rotated ledger every beat would be the
  // very cost this change removes).
  assert.equal(got.doneIds.size, rotatedFiles(p).length, 'each rotated file folded once and remembered');
  const before = got.floorTotal();
  const realConsume = got.consume.bind(got); let consumed = 0;
  got.consume = (b) => { consumed += b.length; return realConsume(b); };
  await got.refresh(p); await got.refresh(p);
  assert.equal(consumed, 0, 'nothing re-read');
  assert.equal(got.floorTotal(), before);
});

test('RESIDUAL (Jim PERF-153-FINAL): a live log DELETED under a kept-open file is noticed within a second and recreated; no rows go to the ghost after that', () => {
  const { APPEND_LINK_CHECK_MS } = loadTs('src/main/appendLog.ts');
  const d = dir(); const p = path.join(d, 'log.jsonl');
  let t = 1_000_000;
  const f = new AppendFile(p, { now: () => t, keepOpen: true });
  f.append('{"a":1}\n');
  fs.rmSync(p);                                   // someone deletes the live log
  t += APPEND_LINK_CHECK_MS;
  f.append('{"a":2}\n');
  assert.ok(fs.existsSync(p), 'recreated by path');
  assert.deepEqual(rows(p).map((l) => JSON.parse(l).a), [2], 'the row landed in the new file, not the ghost');
  // Throttled: within the interval no fstat is made (and nothing is lost when nothing was deleted).
  const real = fs.fstatSync; let fstats = 0;
  fs.fstatSync = (...a) => { fstats += 1; return real(...a); };
  try { for (let i = 0; i < 20; i++) f.append('{"a":3}\n'); } finally { fs.fstatSync = real; }
  assert.equal(fstats, 0, 'at most one check a second');
  f.close();
  assert.equal(rows(p).length, 21);
});
