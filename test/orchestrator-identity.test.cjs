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

const id = loadTs('src/shared/orchestratorIdentity.ts');

test('display name precedence: the user\'s rename, then the theme\'s suggestion, then the default', () => {
  id.setThemeOrchestratorName(null);
  assert.equal(id.resolveOrchestratorName(undefined), id.DEFAULT_ORCHESTRATOR_NAME);
  id.setThemeOrchestratorName('Captain');
  assert.equal(id.resolveOrchestratorName(undefined), 'Captain');
  assert.equal(id.resolveOrchestratorName('   '), 'Captain', 'a blank rename does not hide the theme name');
  assert.equal(id.resolveOrchestratorName('Boss'), 'Boss', 'the user\'s own rename wins');
  id.setThemeOrchestratorName(null);
});

test('theme-supplied names are sanitised', () => {
  for (const bad of ['', '  ', 'x'.repeat(41), 'a\u0000b', 'a\nb', 7, null, undefined]) {
    assert.equal(id.sanitizeDisplayName(bad), null, JSON.stringify(bad));
  }
  assert.equal(id.sanitizeDisplayName('  Number One '), 'Number One');
  id.setThemeOrchestratorName('a\nb');
  assert.equal(id.getThemeOrchestratorName(), null);
});
