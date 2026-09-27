'use strict';
// 0.5.3 (founder, 24 Sep 2026): "the default model for claude should be opus 5.5
// in the Munder Difflin app for users."
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

test('every Claude default is Opus 5.5: agents, the orchestrator, the tier fallback, the preset, the picker', () => {
  const cfg = read('src/main/config.ts');
  assert.match(cfg, /\n  defaultModel: 'claude-opus-5-5',/);
  assert.match(cfg, /\n  godModel: 'claude-opus-5-5',/);
  assert.match(cfg, /const MODEL_GOD = 'claude-opus-5-5';/);
  assert.match(read('src/shared/agentProvider.ts'), /recommendedOrchestratorModel: 'claude-opus-5-5',/);
  assert.match(read('src/renderer/src/components/SettingsModal.tsx'), /cfgX\.defaultModel \?\? 'claude-opus-5-5'/);
  const catalog = JSON.parse(read('src/shared/modelCatalog.json'));
  assert.ok(catalog.providers.claude.some((m) => m.id === 'claude-opus-5-5'), 'Opus 5.5 is in the picker');
});

test('an install still on the OLD defaults moves to Opus 5.5 once; a model someone picked is left alone', () => {
  const src = read('src/main/config.ts');
  const fn = src.slice(src.indexOf('export function withOpus55Default'), src.indexOf('function migrateOpus55Default'));
  assert.match(src, /PRE_OPUS55_DEFAULT_MODEL = 'claude-fable-5'/);
  assert.match(src, /PRE_OPUS55_GOD_MODEL = 'claude-opus-4-8'/);
  assert.match(fn, /if \(cfg\.defaultModel === PRE_OPUS55_DEFAULT_MODEL\) next\.defaultModel = 'claude-opus-5-5';/);
  assert.match(fn, /if \(cfg\.godModel === PRE_OPUS55_GOD_MODEL\) next\.godModel = 'claude-opus-5-5';/);
  assert.match(fn, /opus55DefaultMigrated: true/);
  const mig = src.slice(src.indexOf('function migrateOpus55Default'), src.indexOf('function migrateTempsOnV053'));
  assert.match(mig, /if \(cfg\.opus55DefaultMigrated \|\| opus55MigrationRan\) return cfg;/);
  assert.match(mig, /persistConfig\(next\)/);
  assert.match(src, /normalizeStoredHomes\(migrateOpus55Default\(migrateTempsOnV053\(/);
});
