'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { HiveManager } = loadTs('src/main/hive.ts');
const { modelForHiveSpawn } = loadTs('src/main/config.ts');

const cfg = { defaultModel: 'claude-fable-5', orchestratorProvider: 'claude', orchestratorModel: 'claude-opus-4-8' };

test('a status-line model is retained in the registry through an agent respawn', async (t) => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'md-model-persist-'));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const hive = new HiveManager(() => home);
  await hive.ensureAgent({ id: 'worker-1', name: 'Worker', provider: 'claude', cwd: home });
  hive.recordModel('worker-1', 'claude-opus-5-5[1m]', 'claude-fable-5');
  await hive.ensureAgent({ id: 'worker-1', name: 'Worker', provider: 'claude', cwd: home });
  assert.equal(hive.lastModel('worker-1'), 'claude-opus-5-5[1m]');
  const reg = JSON.parse(fs.readFileSync(path.join(home, 'hive', 'registry.json'), 'utf8'));
  assert.equal(reg.agents['worker-1'].model, 'claude-opus-5-5[1m]');
});

test('per-agent model wins over worker and orchestrator defaults, while an empty saved value falls back', () => {
  assert.equal(modelForHiveSpawn({ id: 'worker', name: 'Worker' }, cfg, 'claude-sonnet-5'), 'claude-sonnet-5');
  assert.equal(modelForHiveSpawn({ id: 'orchestrator', name: 'Orchestrator', isOrchestrator: true }, cfg, 'claude-opus-5-5'), 'claude-opus-5-5');
  assert.equal(modelForHiveSpawn({ id: 'worker', name: 'Worker' }, cfg, '  '), 'claude-fable-5');
  assert.equal(modelForHiveSpawn({ id: 'orchestrator', name: 'Orchestrator', isOrchestrator: true }, cfg), 'claude-opus-4-8');
});

test('the 1M suffix is a deliberate orchestrator-model pin and a later plain report clears it', async (t) => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'md-model-1m-'));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const hive = new HiveManager(() => home);
  const orchestrator = { id: 'orchestrator-1', name: 'Orchestrator', provider: 'claude', cwd: home, isOrchestrator: true };
  await hive.ensureAgent(orchestrator);

  hive.recordModel('orchestrator-1', 'claude-opus-4-8[1m]', 'claude-opus-4-8');
  assert.equal(hive.lastModel('orchestrator-1'), 'claude-opus-4-8[1m]');
  await hive.ensureAgent(orchestrator);
  assert.equal(
    modelForHiveSpawn(hive.registry().agents['orchestrator-1'], cfg, hive.lastModel('orchestrator-1')),
    'claude-opus-4-8[1m]',
    'respawn must retain the distinct 1M selection'
  );

  hive.recordModel('orchestrator-1', 'claude-opus-4-8', 'claude-opus-4-8');
  assert.equal(hive.lastModel('orchestrator-1'), undefined);
});
