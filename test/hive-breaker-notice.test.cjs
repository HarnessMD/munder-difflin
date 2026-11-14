'use strict';

/**
 * Breaker requests came from a sender with no inbox but inherited the normal
 * reply requirement. Keep the guardrail one-way without changing other mail.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ts = require('typescript');
const loadTs = require('./load-ts.cjs');

const { HiveManager } = loadTs('src/main/hive.ts');
const { BREAKER_SENDER, sendBreakerNotice } = loadTs('src/main/breakerNotice.ts');

const mainPath = path.join(__dirname, '..', 'src', 'main', 'index.ts');
const mainSource = ts.createSourceFile(mainPath, fs.readFileSync(mainPath, 'utf8'), ts.ScriptTarget.ES2022, true);
const breakerFunctions = ['runBreakerBeat', 'reportBreakerNoticeError'].map((name) => {
  const declaration = mainSource.statements.find((statement) =>
    ts.isFunctionDeclaration(statement) && statement.name?.text === name);
  assert.ok(declaration, `the production ${name} function must exist`);
  return declaration.getText(mainSource);
}).join('\n');
const beatSource = ts.transpileModule(breakerFunctions, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }
}).outputText;

function decision(action, agentId) {
  const levels = { none: 'healthy', steer: 'steering', constrain: 'constrained', stop: 'stopped' };
  return { action, state: { agentId, level: levels[action], reason: 'private reason', ts: 1 }, changed: action !== 'none' };
}

function breakerBeat(hive, decisions) {
  const errorLogs = [];
  const notifications = [];
  const stopped = [];
  const tornDown = [];
  const states = [];
  const dependencies = {
    console: { error: (...args) => errorLogs.push(args) },
    hive: {
      enabled: () => true,
      registry: () => ({ agents: Object.fromEntries(decisions.map(({ state }) =>
        [state.agentId, { name: state.agentId, provider: 'claude' }])) }),
      send: (...args) => hive.send(...args),
      appendLog: (...args) => hive.appendLog(...args)
    },
    breaker: { tick: () => decisions },
    usageProvider: { getAgentUsage: () => null },
    telemetry: { getSpans: () => [] },
    lastCoordinationAt: () => 0,
    lastWorkAt: () => 0,
    liveWebContents: () => ({ send: (channel, state) => states.push({ channel, state }) }),
    ptyForAgent: (agentId) => `pty-${agentId}`,
    ptyManager: { kill: (ptyId) => stopped.push(ptyId) },
    teardownPty: (ptyId) => tornDown.push(ptyId),
    breakerToast: (title, body) => notifications.push({ title, body }),
    sendBreakerNotice
  };
  const createBeat = new Function(...Object.keys(dependencies), `${beatSource}\nreturn runBreakerBeat;`);
  const run = createBeat(...Object.values(dependencies));
  return { run: () => run(300_000), errorLogs, notifications, stopped, tornDown, states };
}

async function floor(testContext, emit) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'md-breaker-notice-'));
  testContext.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const hive = new HiveManager(() => home, emit);
  await hive.ensureAgent({ id: 'god-1', name: 'Michael', provider: 'claude', cwd: home, isGod: true });
  await hive.ensureAgent({ id: 'jim-1', name: 'Jim', provider: 'claude', cwd: home });
  return hive;
}

for (const { action, subject, instruction } of [
  { action: 'steer', subject: 'Circuit breaker: steer', instruction: /Re-check your approach/ },
  { action: 'constrain', subject: 'Circuit breaker: constrain', instruction: /Stop active work now/ }
]) {
  test(`${action} reaches the worker as a one-way request`, async (testContext) => {
    const hive = await floor(testContext);
    const message = sendBreakerNotice(hive, action, 'jim-1', 'repeated tool calls');

    const [notice] = hive.inbox('jim-1');
    assert.ok(notice);
    assert.deepEqual(message, notice);
    assert.equal(hive.inbox('jim-1').length, 1);
    assert.equal(notice.from, BREAKER_SENDER);
    assert.equal(notice.to, 'jim-1');
    assert.equal(notice.act, 'request');
    assert.equal(notice.subject, subject);
    assert.equal(notice.requires_reply, false);
    assert.match(notice.body, /repeated tool calls/);
    assert.match(notice.body, instruction);
    assert.match(notice.body, /Do not reply to breaker; contact god directly/);
    assert.equal(hive.inbox('god-1').length, 0);
  });
}

test('terminal handoff keeps breaker requests one-way for a hookless provider', async (testContext) => {
  const handoffs = [];
  const hive = await floor(testContext, (channel, payload) => {
    if (channel === 'hive:terminalHandoff') handoffs.push(payload);
    return true;
  });
  await hive.ensureAgent({ id: 'creed-1', name: 'Creed', provider: 'custom', cwd: hive.root() });

  sendBreakerNotice(hive, 'steer', 'creed-1', 'repeated tool calls');
  hive.send({ to: 'creed-1', act: 'request', subject: 'Normal work' }, 'god-1');

  assert.equal(handoffs.length, 2);
  assert.equal(handoffs[0].from, BREAKER_SENDER);
  assert.equal(handoffs[0].to, 'creed-1');
  assert.equal(handoffs[0].act, 'request');
  assert.equal(handoffs[0].requiresReply, false);
  assert.equal(handoffs[1].requiresReply, true);
});

test('missing and non-string reasons have safe notice text', async (testContext) => {
  const hive = await floor(testContext);
  for (const reason of [undefined, null, '', '  ', { detail: 'unavailable' }]) {
    sendBreakerNotice(hive, 'steer', 'jim-1', reason);
  }

  const notices = hive.inbox('jim-1');
  assert.equal(notices.length, 5);
  for (const notice of notices) {
    assert.match(notice.body, /Automated guardrail: reason unavailable\./);
    assert.equal(notice.requires_reply, false);
  }
});

test('normal Hive reply defaults and explicit overrides remain intact', async (testContext) => {
  const hive = await floor(testContext);
  for (const act of ['request', 'query', 'propose']) {
    const message = hive.send({ to: 'jim-1', act, subject: act }, 'god-1');
    assert.equal(message.requires_reply, true, `${act} should request a reply`);
  }
  for (const act of ['inform', 'done', 'agree', 'refuse']) {
    const message = hive.send({ to: 'jim-1', act, subject: act }, 'god-1');
    assert.equal(message.requires_reply, false, `${act} should not request a reply`);
  }
  assert.equal(hive.send({ to: 'jim-1', act: 'request', requires_reply: false }, 'god-1').requires_reply, false);
  assert.equal(hive.send({ to: 'jim-1', act: 'inform', requires_reply: true }, 'god-1').requires_reply, true);
});

test('sendBreakerNotice preserves the Hive return value and thrown values without retrying', () => {
  const message = { id: 'notice-id' };
  assert.equal(sendBreakerNotice({ send: () => message }, 'steer', 'jim-1', ''), message);
  for (const cause of [new Error('write failed'), 'write failed', null, undefined, { code: 'EPERM' }]) {
    let attempts = 0;
    assert.throws(() => sendBreakerNotice({ send() { attempts++; throw cause; } }, 'steer', 'jim-1', ''),
      (error) => { assert.equal(error, cause); return true; });
    assert.equal(attempts, 1);
  }
});

test('the production beat sends both notices one-way and retains normal constrain and stop effects', async (testContext) => {
  const hive = await floor(testContext);
  const beat = breakerBeat(hive, [decision('steer', 'jim-1'), decision('constrain', 'jim-1'),
    decision('none', 'pam-1'), decision('stop', 'dwight-1')]);

  assert.doesNotThrow(beat.run);
  assert.deepEqual(beat.errorLogs, []);
  const notices = hive.inbox('jim-1');
  assert.deepEqual(notices.map((notice) => notice.subject), ['Circuit breaker: steer', 'Circuit breaker: constrain']);
  for (const notice of notices) {
    assert.equal(notice.from, BREAKER_SENDER);
    assert.equal(notice.requires_reply, false);
    assert.match(notice.body, /Do not reply to breaker/);
  }
  assert.deepEqual(beat.notifications.map((notice) => notice.title), ['jim-1 constrained', 'dwight-1 stopped by circuit breaker']);
  assert.deepEqual(beat.stopped, ['pty-dwight-1']);
  assert.deepEqual(beat.tornDown, beat.stopped);
  assert.equal(beat.states.length, 4);
});

test('the production beat logs each original failure once and continues later sends and stop', () => {
  const diskError = Object.assign(new Error('write failed', { cause: new Error('disk unavailable') }), { code: 'EPERM' });
  const thrownValue = { code: 'SEND_FAILED' };
  thrownValue.self = thrownValue;
  const failures = new Map([['jim-1', diskError], ['pam-1', thrownValue]]);
  const attempts = [];
  const failureEvents = [];
  const hive = {
    send(partial) {
      attempts.push(partial.to);
      if (failures.has(partial.to)) throw failures.get(partial.to);
      assert.equal(beat.errorLogs.length, 2, 'both failures must be reported before the next send');
    },
    appendLog(event) { failureEvents.push(event); }
  };
  const beat = breakerBeat(hive, [decision('steer', 'jim-1'), decision('constrain', 'pam-1'),
    decision('constrain', 'creed-1'), decision('stop', 'dwight-1')]);

  assert.doesNotThrow(beat.run);
  assert.equal(beat.errorLogs.length, 2);
  for (const [index, agentId] of ['jim-1', 'pam-1'].entries()) {
    const [prefix, context, error] = beat.errorLogs[index];
    assert.equal(prefix, '[breaker beat]');
    assert.deepEqual(context, { action: index === 0 ? 'steer' : 'constrain', agentId });
    assert.equal(error, failures.get(agentId));
    assert.doesNotMatch(JSON.stringify(context), /private reason/);
  }
  assert.equal(beat.errorLogs[0][2].stack, diskError.stack);
  assert.equal(beat.errorLogs[0][2].code, 'EPERM');
  assert.equal(beat.errorLogs[0][2].cause, diskError.cause);
  assert.deepEqual(beat.stopped, ['pty-dwight-1']);
  assert.deepEqual(beat.tornDown, beat.stopped);
  assert.deepEqual(attempts, ['jim-1', 'pam-1', 'creed-1']);
  assert.deepEqual(failureEvents, [
    { kind: 'breaker-notice-send-error', action: 'steer', agentId: 'jim-1' },
    { kind: 'breaker-notice-send-error', action: 'constrain', agentId: 'pam-1' }
  ]);
  assert.deepEqual(beat.notifications.map((notice) => notice.title), [
    'jim-1: circuit breaker notice send failed', 'pam-1: circuit breaker notice send failed',
    'creed-1 constrained', 'dwight-1 stopped by circuit breaker'
  ]);
  assert.match(beat.notifications[1].body, /constrain/);
  assert.match(beat.notifications[1].body, /Delivery is unconfirmed/);
  assert.doesNotMatch(JSON.stringify(beat.notifications.slice(0, 2)), /private reason/);
});

test('a log write failure cannot mask the send cause or interrupt a later stop', () => {
  const cause = new Error('write failed');
  const beat = breakerBeat({
    send() { throw cause; },
    appendLog() { throw new Error('log write failed'); }
  }, [decision('constrain', 'jim-1'), decision('stop', 'dwight-1')]);

  assert.doesNotThrow(beat.run);
  assert.equal(beat.errorLogs.length, 1);
  assert.equal(beat.errorLogs[0][2], cause);
  assert.deepEqual(beat.stopped, ['pty-dwight-1']);
  assert.match(beat.notifications[0].title, /send failed/);
});

test('a partially persisted send is not retried and leaves a structured failure event', async (testContext) => {
  const hive = await floor(testContext);
  const originalSend = hive.send.bind(hive);
  const cause = new Error('post-route failure');
  let attempts = 0;
  const beat = breakerBeat({
    send(...args) { attempts++; originalSend(...args); throw cause; },
    appendLog: hive.appendLog.bind(hive)
  }, [decision('constrain', 'jim-1')]);

  assert.doesNotThrow(beat.run);
  assert.equal(beat.errorLogs.length, 1);
  assert.equal(beat.errorLogs[0][2], cause);
  assert.equal(attempts, 1);
  assert.equal(hive.inbox('jim-1').length, 1);
  assert.equal(hive.inbox('jim-1')[0].requires_reply, false);
  const failureEvents = hive.logTail(20).filter((event) => event.kind === 'breaker-notice-send-error');
  assert.equal(failureEvents.length, 1);
  assert.equal(failureEvents[0].action, 'constrain');
  assert.equal(failureEvents[0].agentId, 'jim-1');
  assert.equal(JSON.stringify(failureEvents[0]).includes('private reason'), false);
  assert.match(beat.notifications[0].title, /send failed/);
});
