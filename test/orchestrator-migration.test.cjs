const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const loadTs = require('./load-ts.cjs');

const mig = loadTs('src/shared/orchestratorMigration.ts');
const ident = loadTs('src/shared/orchestratorIdentity.ts');

// The old spelling is built at runtime so this file stays out of the repo-wide
// guard below while still exercising real legacy data.
const OLD = ['g', 'o', 'd'].join('');
const cap = OLD[0].toUpperCase() + OLD.slice(1);

test('registry: legacy id, flag, role and agent key all move over', () => {
  const old = {
    [`${OLD}Id`]: OLD,
    agents: {
      [OLD]: { name: 'Boss', role: `orchestrator (${OLD})`, [`is${cap}`]: true },
      'dev-1': { name: 'Dev', role: 'agent' }
    }
  };
  assert.equal(mig.legacyOrchestratorIdIn(old), OLD);
  const out = mig.migrateRegistry(old);
  assert.equal(out.orchestratorId, 'orchestrator');
  assert.equal(out[`${OLD}Id`], undefined);
  assert.deepEqual(Object.keys(out.agents).sort(), ['dev-1', 'orchestrator']);
  assert.equal(out.agents.orchestrator.isOrchestrator, true);
  assert.equal(out.agents.orchestrator[`is${cap}`], undefined);
  assert.equal(out.agents.orchestrator.role, 'orchestrator');
  assert.equal(out.agents.orchestrator.name, 'Boss', 'custom display name survives');
  assert.deepEqual(out.agents['dev-1'], { name: 'Dev', role: 'agent' });
});

test('registry: already-migrated and empty registries are untouched', () => {
  const fresh = { orchestratorId: 'orchestrator', agents: { orchestrator: { isOrchestrator: true } } };
  assert.equal(mig.legacyOrchestratorIdIn(fresh), null);
  assert.deepEqual(mig.migrateRegistry(fresh), fresh);
  assert.deepEqual(mig.migrateRegistry({ orchestratorId: null, agents: {} }), { orchestratorId: null, agents: {} });
  assert.equal(mig.migrateRegistry(null), null);
});

test('config: provider/model keys move, a new value is never clobbered, missions retarget', () => {
  const out = mig.migrateConfig({
    [`${OLD}Provider`]: 'codex',
    [`${OLD}Model`]: 'gpt-5-codex',
    missions: [{ id: 'ops-standup', to: OLD }, { id: 'x', to: 'dev-1' }]
  });
  assert.equal(out.orchestratorProvider, 'codex');
  assert.equal(out.orchestratorModel, 'gpt-5-codex');
  assert.equal(out[`${OLD}Provider`], undefined);
  assert.deepEqual(out.missions.map((m) => m.to), ['orchestrator', 'dev-1']);

  const both = mig.migrateConfig({ [`${OLD}Model`]: 'old', orchestratorModel: 'new' });
  assert.equal(both.orchestratorModel, 'new');
  assert.equal(both[`${OLD}Model`], undefined);
});

test('router: legacy id and the human alias still address the orchestrator', () => {
  assert.equal(ident.isOrchestratorAddress(OLD, 'orchestrator'), true);
  assert.equal(ident.isOrchestratorAddress('human', 'orchestrator'), true);
  assert.equal(ident.isOrchestratorAddress('orchestrator', 'orchestrator'), true);
  assert.equal(ident.isOrchestratorAddress('dev-1', 'orchestrator'), false);
});

test('the old name is gone from source (only the migration + alias list may spell it)', () => {
  const r = spawnSync('git', ['grep', '-niwE', `${OLD}s?`, '--', 'src', 'resources', 'hive', 'scripts', 'landing-remotion/src', ':!src/shared/orchestratorMigration.ts', ':!src/shared/orchestratorIdentity.ts', ':!src/main/realtimeActions.ts'], { encoding: 'utf8' });
  // git grep exits 1 when nothing matches, which is the passing case.
  assert.ok(r.status === 0 || r.status === 1, r.stderr);
  assert.equal((r.stdout || '').trim(), '', r.stdout);
});
