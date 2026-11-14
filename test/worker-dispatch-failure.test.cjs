'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ts = require('typescript');
const loadTs = require('./load-ts.cjs');
const { HiveManager } = loadTs('src/main/hive.ts');
const { buildWorkerLaunch } = loadTs('src/main/workerLaunch.ts');

const source = ts.createSourceFile('index.ts', fs.readFileSync(path.join(__dirname, '../src/main/index.ts'), 'utf8'), ts.ScriptTarget.Latest, true);
const functions = ['spawnRequestsDir', 'archiveRequest', 'informGod', 'teardownPty', 'processSpawnRequest'].map(name => {
  const node = source.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  assert.ok(node, `production function ${name} must exist`);
  return node.getText(source);
}).join('\n');
const output = ts.transpileModule(functions, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

async function floor(t, { isolate = false, killResult = { ok: true }, killThrows = false,
  disappearsOnKill = false, cleanupThrows = false, revokeThrows = false } = {}) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'md dispatch failure '));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  t.mock.method(os, 'homedir', () => home);
  const events = [], kills = [], revoked = [], finalized = [];
  const hive = new HiveManager(() => home);
  await hive.ensureAgent({ id: 'god-1', name: 'Michael', provider: 'claude', cwd: home, isGod: true });
  const queue = path.join(hive.root(), 'spawn-requests');
  fs.mkdirSync(queue, { recursive: true });
  const liveWorkers = new Map(), sessions = new Set(), ptyToAgent = new Map();
  const worktreePaths = new Map(), worktreeOrigins = new Map();
  const deps = {
    ...fs, join: path.join, basename: path.basename, isAbsolute: path.isAbsolute,
    liveWorkers, ptyToAgent, worktreePaths, worktreeOrigins, hive,
    buildWorkerLaunch,
    expandTilde: p => p.trim(),
    isSafeCommandName: () => true,
    readConfig: () => ({ defaultCommand: 'claude', autoMode: false }),
    ptyManager: {
      isCommandAvailable: () => true,
      kill: id => {
        kills.push(id);
        if (killThrows) throw new Error('stop threw');
        if (killResult.ok || disappearsOnKill) sessions.delete(id);
        return killResult;
      },
      list: () => [...sessions].map(id => ({ id }))
    },
    integrationBroker: {
      running: () => true, grant: () => 'test-capability', url: () => 'http://127.0.0.1',
      revoke: id => { revoked.push(id); if (revokeThrows) throw new Error('broker unavailable'); }
    },
    integrations: { enabledIds: () => [] },
    getBranch: async () => ({ current: 'main' }),
    spawnAgentCore: async opts => {
      await hive.ensureAgent(opts.hive);
      sessions.add(opts.id);
      ptyToAgent.set(opts.id, opts.id);
      if (isolate) {
        const wt = path.join(home, 'isolated worktree');
        fs.mkdirSync(wt, { recursive: true });
        worktreePaths.set(opts.id, wt);
        worktreeOrigins.set(opts.id, home);
        return { ok: true, worktreePath: wt };
      }
      return { ok: true };
    },
    liveWebContents: () => ({ send: (channel, value) => events.push({ channel, value }) }),
    finalizeWorkerWorktree: async (...args) => finalized.push(args),
    removeWorktree: async () => { throw new Error('must use the worker safety gate'); },
    workerWake: { forget: () => {} }, breaker: { forget: () => {} }, telemetry: { forgetAgent: () => {} }, grokLedgerGate: { forget: () => {} },
    syncKeepAwake: () => { if (cleanupThrows) throw new Error('power API unavailable'); },
    buildAutonomousRequestProtocol: () => 'Slack task: ',
    slackReplyScriptPath: () => 'reply.js',
    console: { log: () => {}, error: () => {} }
  };
  const intake = new Function(...Object.keys(deps), `${output}\nreturn processSpawnRequest;`)(...Object.values(deps));
  const workerInbox = path.join(hive.root(), 'agents', 'worker-demo', 'inbox');
  const originalRename = fs.renameSync;
  let dispatchFails = false, allInboxesFail = false;
  t.mock.method(fs, 'renameSync', (...args) => {
    const target = args[1];
    if (dispatchFails && (path.dirname(target) === workerInbox || (allInboxesFail && target.includes(`${path.sep}inbox${path.sep}`)))) {
      throw Object.assign(new Error('simulated inbox disk failure'), { code: 'EACCES' });
    }
    return originalRename(...args);
  });
  async function submit({ failDispatch = false, failNotice = false } = {}) {
    dispatchFails = failDispatch; allInboxesFail = failNotice;
    const file = path.join(queue, 'demo.json');
    fs.writeFileSync(file, JSON.stringify({ objective: 'Review this project', cwd: home, isolate, slack: { channel: 'C123', thread_ts: '123.456' } }));
    await intake(file);
  }
  return { home, hive, queue, submit, liveWorkers, sessions, kills, revoked, events, finalized };
}

test('an inbox disk error fails the request, stops the spawned worker, and informs god', async t => {
  const h = await floor(t);
  await h.submit({ failDispatch: true });
  assert.equal(fs.existsSync(path.join(h.queue, '.failed', 'demo.json')), true);
  assert.equal(fs.existsSync(path.join(h.queue, '.done', 'demo.json')), false);
  assert.deepEqual(h.kills, ['worker-demo']);
  assert.equal(h.sessions.size, 0);
  assert.equal(h.liveWorkers.size, 0);
  assert.deepEqual(h.revoked, ['worker-demo']);
  assert.equal(h.hive.registry().agents['worker-demo'].archived, true);
  assert.ok(h.events.some(e => e.channel === 'hive:agentArchived' && e.value.id === 'worker-demo'));
  assert.equal(h.hive.inbox('worker-demo').length, 0);
  const notice = h.hive.inbox('god-1')[0];
  assert.match(notice.subject, /task dispatch failed/);
  assert.match(notice.body, /C123.*123\.456/);
});

test('failed dispatch uses the safety-gated worker worktree cleanup', async t => {
  const h = await floor(t, { isolate: true });
  await h.submit({ failDispatch: true });
  assert.equal(h.finalized.length, 1);
  assert.equal(h.finalized[0][2].workerId, 'worker-demo');
  assert.equal(h.finalized[0][2].baseBranch, 'main');
  assert.equal(h.liveWorkers.size, 0);
  assert.equal(fs.existsSync(h.finalized[0][0]), true, 'test finalizer models retained work; no direct deletion');
});

test('a corrected retry can reuse the worker id once failed dispatch is cleaned up', async t => {
  const h = await floor(t);
  await h.submit({ failDispatch: true });
  await h.submit();
  assert.equal(h.sessions.size, 1);
  assert.equal(h.liveWorkers.size, 1);
  assert.equal(fs.existsSync(path.join(h.queue, '.done', 'demo.json')), true);
  assert.equal(h.hive.registry().agents['worker-demo'].archived, false);
  assert.match(h.hive.inbox('worker-demo')[0].body, /Review this project/);
  assert.equal(h.kills.length, 1);
});

test('failure to write the god notice still archives the request and cleans up', async t => {
  const h = await floor(t);
  await h.submit({ failDispatch: true, failNotice: true });
  assert.equal(fs.existsSync(path.join(h.queue, '.failed', 'demo.json')), true);
  assert.equal(h.liveWorkers.size, 0);
  assert.equal(h.sessions.size, 0);
});

test('a failed stop stays tracked and is reported rather than orphaning the live process', async t => {
  const h = await floor(t, { killResult: { ok: false, error: 'stop failed' } });
  await h.submit({ failDispatch: true });
  assert.deepEqual(h.kills, ['worker-demo']);
  assert.equal(h.sessions.size, 1);
  assert.equal(h.liveWorkers.size, 1);
  assert.equal(h.liveWorkers.get('worker-demo').releasing, undefined, 'must remain eligible for later stop/reap');
  assert.equal(h.hive.registry().agents['worker-demo'].archived, false);
  assert.equal(fs.existsSync(path.join(h.queue, '.failed', 'demo.json')), true);
  assert.match(h.hive.inbox('god-1')[0].body, /could not be stopped/);
  assert.deepEqual(h.revoked, ['worker-demo']);
});

test('an exception during stop follows the same visible failure path and keeps tracking', async t => {
  const h = await floor(t, { killThrows: true });
  await h.submit({ failDispatch: true });
  assert.equal(h.liveWorkers.size, 1);
  assert.equal(h.sessions.size, 1);
  assert.equal(fs.existsSync(path.join(h.queue, '.failed', 'demo.json')), true);
  assert.match(h.hive.inbox('god-1')[0].body, /could not be stopped/);
  assert.deepEqual(h.revoked, ['worker-demo']);
});

test('a worker already gone when kill returns failure still gets its bookkeeping cleaned up', async t => {
  const h = await floor(t, { killResult: { ok: false, error: 'no pty' }, disappearsOnKill: true });
  await h.submit({ failDispatch: true });
  assert.equal(h.sessions.size, 0);
  assert.equal(h.liveWorkers.size, 0);
  assert.equal(h.hive.registry().agents['worker-demo'].archived, true);
});

test('a post-delivery exception warns about partial delivery and does not automatically resend', async t => {
  const h = await floor(t);
  const original = h.hive.send.bind(h.hive);
  t.mock.method(h.hive, 'send', (partial, from) => {
    const result = original(partial, from);
    if (partial.to === 'worker-demo') throw new Error('post-delivery failure');
    return result;
  });
  await h.submit();
  assert.equal(h.hive.inbox('worker-demo').length, 1, 'delivered task remains available for inspection');
  assert.equal(h.liveWorkers.size, 0);
  assert.equal(fs.existsSync(path.join(h.queue, '.failed', 'demo.json')), true);
  assert.match(h.hive.inbox('god-1')[0].body, /check for partial delivery or work/);
});

test('a secondary teardown error does not leave the failed request pending', async t => {
  const h = await floor(t, { cleanupThrows: true });
  await h.submit({ failDispatch: true });
  assert.equal(h.sessions.size, 0);
  assert.equal(h.liveWorkers.size, 0);
  assert.equal(fs.existsSync(path.join(h.queue, '.failed', 'demo.json')), true);
  assert.match(h.hive.inbox('god-1')[0].subject, /task dispatch failed/);
});

test('a secondary revoke error still reports a failed stop and archives the request', async t => {
  const h = await floor(t, { killResult: { ok: false, error: 'stop failed' }, revokeThrows: true });
  await h.submit({ failDispatch: true });
  assert.equal(h.sessions.size, 1);
  assert.equal(h.liveWorkers.size, 1);
  assert.equal(fs.existsSync(path.join(h.queue, '.failed', 'demo.json')), true);
  assert.match(h.hive.inbox('god-1')[0].body, /could not be stopped/);
});

test('successful dispatch keeps the worker alive, briefed and archived as done', async t => {
  const h = await floor(t);
  await h.submit();
  assert.equal(h.liveWorkers.size, 1);
  assert.equal(h.sessions.size, 1);
  assert.equal(fs.existsSync(path.join(h.queue, '.done', 'demo.json')), true);
  assert.equal(fs.existsSync(path.join(h.queue, '.failed', 'demo.json')), false);
  assert.equal(h.kills.length, 0);
  assert.equal(h.revoked.length, 0);
  assert.match(h.hive.inbox('worker-demo')[0].body, /Review this project/);
  assert.equal(h.hive.inbox('god-1').length, 0);
});
