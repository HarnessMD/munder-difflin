'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const {
  APPEND_DIAGNOSTIC_REPEAT_MS,
  HIVE_COST_LEDGER_FILE_NAME,
  HIVE_LOG_FILE_NAME,
  HiveManager
} = loadTs('src/main/hive.ts');

function setup(t, appendOptions) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'md-jsonl-append-'));
  const root = path.join(home, 'hive');
  fs.mkdirSync(root);
  const hive = new HiveManager(() => home, undefined, appendOptions);
  t.after(() => {
    hive.closeAppendFiles();
    fs.rmSync(home, { recursive: true, force: true });
  });
  return { home, root, hive };
}

function observeFs() {
  const pathsByDescriptor = new Map();
  const observed = {
    openCalls: [], closeCalls: [], writeCalls: [],
    failOpenPath: null, failNextWritePath: null
  };
  observed.fsOps = {
    openSync(filePath, flags) {
      if (filePath === observed.failOpenPath) {
        throw Object.assign(new Error('open denied'), { code: 'EACCES' });
      }
      const descriptor = fs.openSync(filePath, flags);
      pathsByDescriptor.set(descriptor, filePath);
      observed.openCalls.push({ descriptor, filePath });
      return descriptor;
    },
    writeSync(descriptor, buffer, offset, length, position) {
      const filePath = pathsByDescriptor.get(descriptor);
      observed.writeCalls.push({ descriptor, filePath });
      if (filePath === observed.failNextWritePath) {
        observed.failNextWritePath = null;
        throw Object.assign(new Error('write denied'), { code: 'EACCES' });
      }
      return fs.writeSync(descriptor, buffer, offset, length, position);
    },
    closeSync(descriptor) {
      observed.closeCalls.push({ descriptor, filePath: pathsByDescriptor.get(descriptor) });
      try { fs.closeSync(descriptor); }
      finally { pathsByDescriptor.delete(descriptor); }
    },
    fstatSync: (descriptor, options) => fs.fstatSync(descriptor, options),
    statSync: (filePath, options) => fs.statSync(filePath, options)
  };
  return observed;
}

function sample(usd) {
  return {
    agentId: 'agent-1', sessionId: 'session-1', ts: 123,
    input: 1, output: 2, cacheRead: 3, cacheCreation: 4,
    model: 'model-1', usd
  };
}

test('Hive log and ledger preserve their schemas across close and reopen', (t) => {
  const { root, hive } = setup(t);
  hive.appendLog({ kind: 'first' });
  hive.appendLog({ kind: 'second' });
  hive.appendCostLedger(sample(1));
  hive.appendCostLedger(sample(2));

  assert.ok(hive.lastLogAppendAt() > 0);
  hive.closeAppendFiles();
  hive.appendLog({ kind: 'third' });

  const logs = fs.readFileSync(path.join(root, HIVE_LOG_FILE_NAME), 'utf8')
    .trim().split('\n').map(JSON.parse);
  assert.deepEqual(logs.map((row) => row.kind), ['first', 'second', 'third']);
  assert.equal(logs.every((row) => typeof row.ts === 'number'), true);

  const ledger = fs.readFileSync(path.join(root, HIVE_COST_LEDGER_FILE_NAME), 'utf8')
    .trim().split('\n').map(JSON.parse);
  assert.deepEqual(ledger.map((row) => row.usd), [1, 2]);
  assert.deepEqual(Object.keys(ledger[0]), [
    'agent_id', 'session_id', 'ts', 'input', 'output',
    'cache_read', 'cache_creation', 'model', 'usd'
  ]);
});

test('Hive reuses independent log and ledger descriptors and closes both', (t) => {
  const observed = observeFs();
  const { root, hive } = setup(t, { fsOps: observed.fsOps });
  const logPath = path.join(root, HIVE_LOG_FILE_NAME);
  const ledgerPath = path.join(root, HIVE_COST_LEDGER_FILE_NAME);

  hive.appendLog({ kind: 'first' });
  hive.appendCostLedger(sample(1));
  hive.appendLog({ kind: 'second' });
  hive.appendCostLedger(sample(2));

  assert.deepEqual(observed.openCalls.map((call) => call.filePath), [logPath, ledgerPath]);
  const [logDescriptor, ledgerDescriptor] = observed.openCalls.map((call) => call.descriptor);
  assert.notEqual(logDescriptor, ledgerDescriptor);
  assert.deepEqual(observed.writeCalls.map((call) => call.descriptor), [
    logDescriptor, ledgerDescriptor, logDescriptor, ledgerDescriptor
  ]);

  hive.closeAppendFiles();
  hive.closeAppendFiles();
  assert.deepEqual(observed.closeCalls.map((call) => call.descriptor), [logDescriptor, ledgerDescriptor]);
  fs.rmSync(root, { recursive: true, force: true });
  assert.equal(fs.existsSync(root), false, 'both descriptors must be released before root removal');
});

test('failed Hive writes do not claim activity and diagnostics are bounded and path-free', (t) => {
  const observed = observeFs();
  const diagnostics = [];
  let diagnosticNow = 0;
  const { root, hive } = setup(t, {
    fsOps: observed.fsOps,
    onDiagnostic: (message) => diagnostics.push(message),
    diagnosticNow: () => diagnosticNow
  });
  const logPath = path.join(root, HIVE_LOG_FILE_NAME);
  const ledgerPath = path.join(root, HIVE_COST_LEDGER_FILE_NAME);
  observed.failOpenPath = logPath;

  hive.appendLog({ kind: 'failed-open' });
  hive.appendLog({ kind: 'failed-open-again' });
  assert.equal(hive.lastLogAppendAt(), 0);
  assert.equal(diagnostics.length, 1, 'repeated identical failures must not flood diagnostics');
  assert.match(diagnostics[0], /log\.jsonl open failed \(EACCES\)/);
  assert.equal(diagnostics[0].includes(root), false, 'diagnostics must not expose the home path');

  observed.failOpenPath = ledgerPath;
  hive.appendCostLedger(sample(1));
  assert.equal(diagnostics.length, 2, 'each append file reports its own failure');
  assert.match(diagnostics[1], /cost-ledger\.jsonl open failed \(EACCES\)/);
  assert.equal(fs.existsSync(ledgerPath), false);

  observed.failOpenPath = null;
  observed.failNextWritePath = logPath;
  hive.appendLog({ kind: 'failed-write' });
  assert.equal(hive.lastLogAppendAt(), 0);
  assert.equal(diagnostics.length, 2, 'alternating failures for one file still obey one rate limit');

  diagnosticNow += APPEND_DIAGNOSTIC_REPEAT_MS;
  observed.failNextWritePath = logPath;
  hive.appendLog({ kind: 'failed-write-after-window' });
  assert.equal(diagnostics.length, 3);
  assert.match(diagnostics.at(-1), /log\.jsonl append failed \(EACCES\); 2 suppressed/);

  hive.appendLog({ kind: 'recovered' });
  assert.ok(hive.lastLogAppendAt() > 0);
  assert.deepEqual(fs.readFileSync(logPath, 'utf8').trim().split('\n').map(JSON.parse)
    .map((row) => row.kind), ['recovered']);

  observed.failNextWritePath = ledgerPath;
  hive.appendCostLedger(sample(2));
  assert.equal(fs.readFileSync(ledgerPath, 'utf8'), '');
  hive.appendCostLedger(sample(3));
  assert.deepEqual(fs.readFileSync(ledgerPath, 'utf8').trim().split('\n').map(JSON.parse)
    .map((row) => row.usd), [3], 'a failed ledger row must not be replayed');
});

test('serialization failures are contained and do not claim log activity', (t) => {
  const diagnostics = [];
  const { root, hive } = setup(t, { onDiagnostic: (message) => diagnostics.push(message) });
  const cyclic = {};
  cyclic.self = cyclic;

  assert.doesNotThrow(() => hive.appendLog(cyclic));
  assert.equal(hive.lastLogAppendAt(), 0);
  assert.equal(fs.existsSync(path.join(root, HIVE_LOG_FILE_NAME)), false);
  assert.match(diagnostics[0], /log\.jsonl serialize or resolve failed \(UNKNOWN\)/);

  assert.doesNotThrow(() => hive.appendCostLedger(sample(1n)));
  assert.equal(fs.existsSync(path.join(root, HIVE_COST_LEDGER_FILE_NAME)), false);
  assert.match(diagnostics[1], /cost-ledger\.jsonl serialize or resolve failed \(UNKNOWN\)/);
});

test('custom toJSON cannot turn an event into a non-object JSONL row', (t) => {
  const diagnostics = [];
  const { root, hive } = setup(t, { onDiagnostic: (message) => diagnostics.push(message) });
  hive.appendLog({ kind: 'invalid', toJSON: () => undefined });

  assert.equal(hive.lastLogAppendAt(), 0);
  assert.equal(fs.existsSync(path.join(root, HIVE_LOG_FILE_NAME)), false);
  assert.match(diagnostics[0], /log\.jsonl serialize or resolve failed \(UNKNOWN\)/);
});

test('a failing diagnostic sink cannot interrupt Hive append recovery', (t) => {
  const observed = observeFs();
  const { root, hive } = setup(t, {
    fsOps: observed.fsOps,
    onDiagnostic: () => { throw new Error('diagnostic sink failed'); }
  });
  observed.failOpenPath = path.join(root, HIVE_LOG_FILE_NAME);
  assert.doesNotThrow(() => hive.appendLog({ kind: 'failed' }));
  assert.equal(hive.lastLogAppendAt(), 0);
  observed.failOpenPath = null;
  hive.appendLog({ kind: 'recovered' });
  assert.ok(hive.lastLogAppendAt() > 0);
});

test('root resolution failure is reported without opening either append file', () => {
  const diagnostics = [];
  const observed = observeFs();
  const hive = new HiveManager(
    () => { throw new Error('config unavailable'); },
    undefined,
    { fsOps: observed.fsOps, onDiagnostic: (message) => diagnostics.push(message) }
  );
  assert.doesNotThrow(() => hive.appendLog({ kind: 'unavailable' }));
  assert.doesNotThrow(() => hive.appendCostLedger(sample(1)));
  assert.equal(hive.lastLogAppendAt(), 0);
  assert.deepEqual(observed.openCalls, []);
  assert.equal(diagnostics.length, 2);
  assert.ok(diagnostics.every((message) => message.includes('serialize or resolve failed')));
  hive.closeAppendFiles();
});

test('append never recreates a removed Hive root', (t) => {
  const diagnostics = [];
  const { root, hive } = setup(t, { onDiagnostic: (message) => diagnostics.push(message) });
  hive.appendLog({ kind: 'before-remove' });
  hive.closeAppendFiles();
  fs.rmSync(root, { recursive: true, force: true });

  assert.doesNotThrow(() => hive.appendLog({ kind: 'after-remove' }));
  assert.doesNotThrow(() => hive.appendCostLedger(sample(1)));
  assert.equal(fs.existsSync(root), false);
  assert.deepEqual(diagnostics, [], 'intentional root removal remains a quiet best-effort failure');
});

test('malformed and NUL-terminated historical tails are never rewritten', (t) => {
  const { root, hive } = setup(t);
  const file = path.join(root, HIVE_LOG_FILE_NAME);
  const tail = Buffer.from('{"unfinished":\u0000', 'utf8');
  fs.writeFileSync(file, tail);

  assert.doesNotThrow(() => hive.appendLog({ kind: 'after-tail' }));
  hive.closeAppendFiles();

  const content = fs.readFileSync(file);
  assert.deepEqual(content.subarray(0, tail.length), tail);
  assert.ok(content.subarray(tail.length).includes(Buffer.from('"kind":"after-tail"')));
});
