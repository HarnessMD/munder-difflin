'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const loadTs = require('./load-ts.cjs');

const { tokensAgainstWorkerCap } = loadTs('src/main/workerTokens.ts');

// worker-da-carryover-build-1791101700, counted once per message id.
// The reaper killed it at 3,070,099 > 3,000,000. 2,932,412 of that was cache reads.
const CARRYOVER_BUILD = {
  input: 62,
  output: 17783,
  cacheCreation: 119842,
  cacheRead: 2932412
};

test('cache reads do not count toward the worker cap', () => {
  assert.equal(tokensAgainstWorkerCap(CARRYOVER_BUILD), 137687);
  assert.ok(tokensAgainstWorkerCap(CARRYOVER_BUILD) < 3_000_000);
});

test('output and cache writes still count', () => {
  assert.equal(tokensAgainstWorkerCap({ input: 10, output: 3_000_001, cacheCreation: 0 }), 3_000_011);
});
