'use strict';
/**
 * Temp-worker token-cap reap decision. The reaper must test a worker's WORK
 * tokens (input + output + cacheCreation) against its cap, the same figure the
 * per-agent breaker budget uses (#189), not the all-kinds total: cacheRead
 * grows with the request count against a large fixed context, not with what
 * the worker does. Evidence: three temps reaped with 74–93% cache reads, and
 * one at a 3M cap with 94%.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const loadTs = require('./load-ts.cjs');

const { workerCapVerdict } = loadTs('src/main/workerCap.ts');

const sample = (input, output, cacheRead, cacheCreation) =>
  ({ input, output, cacheRead, cacheCreation });

test('a worker mostly reading cache is not reaped', () => {
  // 3.2M total, 94% cache reads — over a 3M cap only if cacheRead counts.
  const s = sample(100_000, 20_000, 3_000_000, 80_000);
  const v = workerCapVerdict(s, 3_000_000);
  assert.equal(v.reap, false);
  assert.equal(v.work, 200_000);
  assert.equal(v.total, 3_200_000);
});

test('a worker over its cap in work tokens is reaped', () => {
  const s = sample(2_000_000, 600_000, 500_000, 500_000);
  const v = workerCapVerdict(s, 3_000_000);
  assert.equal(v.reap, true);
  assert.equal(v.work, 3_100_000);
  assert.equal(v.total, 3_600_000);
});

test('the cap is strict: work equal to the cap is not reaped', () => {
  const v = workerCapVerdict(sample(1_000, 0, 0, 0), 1_000);
  assert.equal(v.reap, false);
});

test('unknown usage reads as zero and is never reaped', () => {
  const v = workerCapVerdict(null, 1);
  assert.deepEqual(v, { reap: false, work: 0, total: 0 });
});

test('a cap of 0 or less means no cap', () => {
  const s = sample(9_000_000, 9_000_000, 0, 0);
  assert.equal(workerCapVerdict(s, 0).reap, false);
  assert.equal(workerCapVerdict(s, -1).reap, false);
});
