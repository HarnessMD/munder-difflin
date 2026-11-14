// agent-ops validation contract (fork: orchestrator lifecycle ops).
// Pure module — no Electron, no fs. Follows the repo's text-test style but
// drives the real parser via load-ts like workerLaunch/model-catalog do.
'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const loadTs = require('./load-ts.cjs');

const {
  validateAgentOp,
  sanitizeAgentId,
  MAX_LIVE_NON_WORKERS
} = loadTs('src/main/agentOps.ts');
const fs = require('node:fs');
const path = require('node:path');
const MAIN = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'index.ts'), 'utf8');

const CTX = {
  godId: 'god',
  liveIds: ['god', 'andy-mv7wi8j7'],
  archivedIds: ['andy-old'],
  liveNonWorkers: 2,
  maxLiveNonWorkers: MAX_LIVE_NON_WORKERS
};

test('fleet cap default is the approved 6', () => {
  assert.equal(MAX_LIVE_NON_WORKERS, 6);
});

test('non-objects and unknown ops fail closed', () => {
  for (const raw of [null, [], 'kill', 42, {}, { op: 'nuke', id: 'x', reason: 'y' }]) {
    const r = validateAgentOp(raw, CTX);
    assert.equal(r.ok, false, `must refuse ${JSON.stringify(raw)}`);
  }
});

test('reason is mandatory on every op', () => {
  const r = validateAgentOp({ op: 'kill', id: 'andy-mv7wi8j7' }, CTX);
  assert.equal(r.ok, false);
  assert.match(r.error, /reason/);
});

test('god auto-kill is refused', () => {
  const r = validateAgentOp({ op: 'kill', id: 'god', reason: 'scale down' }, CTX);
  assert.equal(r.ok, false);
  assert.match(r.error, /god/);
});

test('ids match verbatim, never rewritten', () => {
  assert.equal(sanitizeAgentId('andy-mv7wi8j7'), 'andy-mv7wi8j7');
  for (const bad of ['../x', 'a/b', '', 'x'.repeat(129), 7, null]) {
    assert.equal(sanitizeAgentId(bad), null, `must reject ${JSON.stringify(bad)}`);
  }
  const r = validateAgentOp({ op: 'kill', id: 'andy-missing', reason: 'stale' }, CTX);
  assert.equal(r.ok, false);
  assert.match(r.error, /not live/);
});

test('restore needs an archived id', () => {
  const ok = validateAgentOp({ op: 'restore', id: 'andy-old', reason: 'recovered' }, CTX);
  assert.equal(ok.ok, true);
  const bad = validateAgentOp({ op: 'restore', id: 'andy-mv7wi8j7', reason: 'oops' }, CTX);
  assert.equal(bad.ok, false);
  assert.match(bad.error, /not archived/);
});

test('reset needs a live id', () => {
  const ok = validateAgentOp({ op: 'reset', id: 'andy-mv7wi8j7', reason: 'stuck loop' }, CTX);
  assert.equal(ok.ok, true);
  assert.equal(validateAgentOp({ op: 'reset', id: 'andy-old', reason: 'x' }, CTX).ok, false);
});

test('create needs full spec plus tokenCap, and honors the fleet cap', () => {
  const spec = { role: 'SRE', cwd: 'Z:\\proj', provider: 'opencode', model: 'openrouter/free', tokenCap: 100000 };
  const ok = validateAgentOp({ op: 'create', params: spec, reason: 'cover nights' }, CTX);
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.value.params, spec);
  const noCap = validateAgentOp(
    { op: 'create', params: { ...spec, tokenCap: undefined }, reason: 'x' }, CTX);
  assert.equal(noCap.ok, false);
  assert.match(noCap.error, /tokenCap/);
  const fracCap = validateAgentOp(
    { op: 'create', params: { ...spec, tokenCap: 150000.5 }, reason: 'x' }, CTX);
  assert.equal(fracCap.ok, false);
  assert.match(fracCap.error, /tokenCap/);
  const full = validateAgentOp({ op: 'create', params: spec, reason: 'x' },
    { ...CTX, liveNonWorkers: MAX_LIVE_NON_WORKERS });
  assert.equal(full.ok, false);
  assert.match(full.error, /fleet cap/);
});

test('main wires the agent-ops watcher like the worker one', () => {
  for (const needle of [
    'startAgentOpsWatcher(); // poll HIVE_ROOT/agent-ops',
    'async function processAgentOpRequest',
    'validateAgentOp(raw,',
    'archiveAgentOpRequest(filePath',
    'stopAgentOpsWatcher()'
  ]) assert.ok(MAIN.includes(needle), 'missing: ' + needle);
  for (const op of ['kill', 'reset', 'restore', 'create']) {
    assert.ok(MAIN.includes("req.op === '" + op + "'"), 'missing op branch: ' + op);
  }
});

test('every refusal is visible to the human, not only to god', () => {
  // god gets the inbox message; the operator gets the activity feed. Both
  // paths must exist, or a refusal is invisible to whoever has to re-ask.
  assert.ok(MAIN.includes("kind: 'agent-op-failed'"), 'refusal never reaches the activity feed');
  assert.ok(MAIN.includes("archiveAgentOpRequest(filePath, '.failed')"), 'refusal never clears the queue');
  // The spawning ops must respect the same operator switch as workers.
  assert.ok(
    MAIN.includes("!maySpawn && (req.op === 'restore' || req.op === 'create')"),
    'create/restore ignore the orchestratorMaySpawn gate'
  );
});
