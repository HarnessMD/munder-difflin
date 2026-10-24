'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const loadTs = require('./load-ts.cjs');

const { isFloorActivityQuiet } = loadTs('src/main/floorActivity.ts');

test('new in-memory append activity overrides an old log mtime', () => {
  assert.equal(isFloorActivityQuiet([100, 950], 100, 1_000), false);
});

test('new filesystem activity overrides an old in-memory timestamp', () => {
  assert.equal(isFloorActivityQuiet([950, 100], 100, 1_000), false);
});

test('old activity is quiet while missing activity fails safe', () => {
  assert.equal(isFloorActivityQuiet([100, 200], 100, 1_000), true);
  assert.equal(isFloorActivityQuiet([], 100, 1_000), false);
  assert.equal(isFloorActivityQuiet([0], 100, 1_000), false);
});
