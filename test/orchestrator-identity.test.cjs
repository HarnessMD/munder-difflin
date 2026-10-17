'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const loadTs = require('./load-ts.cjs');

const { DEFAULT_ORCHESTRATOR_NAME, resolveOrchestratorName } = loadTs('src/shared/orchestratorIdentity.ts');

test('a persisted rename wins over the default', () => {
  assert.equal(resolveOrchestratorName('Savvas'), 'Savvas');
  assert.equal(resolveOrchestratorName('  Savvas  '), 'Savvas'); // trimmed, like renameAgent() trims on write
});

test('nothing persisted yet falls back to the default', () => {
  assert.equal(resolveOrchestratorName(undefined), DEFAULT_ORCHESTRATOR_NAME);
  assert.equal(resolveOrchestratorName(null), DEFAULT_ORCHESTRATOR_NAME);
  assert.equal(resolveOrchestratorName(''), DEFAULT_ORCHESTRATOR_NAME);
  assert.equal(resolveOrchestratorName('   '), DEFAULT_ORCHESTRATOR_NAME); // whitespace-only is not a real name
});
