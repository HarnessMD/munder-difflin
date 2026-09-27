'use strict';

/* 0.5.3 bug 19: an incoming inbox message answered a multiple choice question
 * while nobody was at the keyboard.
 *
 * The sequence, as the app sees it: the agent calls AskUserQuestion, so a
 * PreToolUse arrives and the agent reads as `working`. The menu then waits for a
 * person, the terminal goes silent, and twelve seconds of silence is exactly the
 * evidence both delivery paths trust to mean "the turn is over". The nudge is
 * typed, Return follows it, and Return picks the highlighted option.
 *
 * These tests drive that sequence through the real decision code of BOTH
 * writers: the main process watchdog and the renderer's delivery gate. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { WorkerWakeWatchdog, WORKER_WAKE_IDLE_MS } = loadTs('src/main/workerWake.ts');
const { canDeliverToAgent } = loadTs('src/renderer/src/hooks/queueDelivery.ts');
const { OpenQuestionTracker, isHumanQuestionTool, questionEffect } = loadTs('src/shared/openQuestion.ts');

const QUIESCE_MS = 12_000;

function fact(overrides = {}) {
  return {
    agentId: 'alice',
    ptyId: 'pty-alice',
    lastOutputAt: 100_000,
    inboxIds: ['mail-1'],
    autoDeliveryPaused: false,
    paused: false,
    halted: false,
    ...overrides
  };
}

test('the watchdog does not type into a worker that has a question open', () => {
  const w = new WorkerWakeWatchdog();
  w.noteSpawn('pty-alice', 0);
  const asked = 200_000;
  w.noteHook('alice', 'PreToolUse', undefined, asked, 'AskUserQuestion');
  // The menu is up and silent. An hour of silence is still not an idle prompt.
  for (const quiet of [WORKER_WAKE_IDLE_MS + 1, 60_000, 3_600_000]) {
    const now = asked + quiet;
    assert.deepEqual(w.decide([fact({ lastOutputAt: asked })], now), [], `typed after ${quiet} ms of silence`);
  }
});

test('the idle Notification that follows a silent menu does not release the hold', () => {
  const w = new WorkerWakeWatchdog();
  w.noteSpawn('pty-alice', 0);
  const asked = 200_000;
  w.noteHook('alice', 'PreToolUse', undefined, asked, 'AskUserQuestion');
  w.noteHook('alice', 'Notification', 'Claude is waiting for your input', asked + 60_000);
  assert.deepEqual(w.decide([fact({ lastOutputAt: asked })], asked + 90_000), []);
});

test('answering the question releases the hold and the mail is announced', () => {
  const w = new WorkerWakeWatchdog();
  w.noteSpawn('pty-alice', 0);
  const asked = 200_000;
  w.noteHook('alice', 'PreToolUse', undefined, asked, 'AskUserQuestion');
  const answered = asked + 300_000;
  w.noteHook('alice', 'PostToolUse', undefined, answered, 'AskUserQuestion');
  const now = answered + WORKER_WAKE_IDLE_MS + 1;
  assert.deepEqual(w.decide([fact({ lastOutputAt: answered })], now), ['alice']);
});

test('a sub agent finishing a tool does not close its parent\'s question', () => {
  const t = new OpenQuestionTracker();
  t.note('alice', 'PreToolUse', 'AskUserQuestion');
  t.note('alice', 'PostToolUse', 'Read');
  t.note('alice', 'SubagentStop', undefined);
  assert.equal(t.isOpen('alice'), true);
});

test('a finished turn, a new prompt and a fresh session each close the question', () => {
  for (const event of ['Stop', 'UserPromptSubmit', 'SessionStart']) {
    const t = new OpenQuestionTracker();
    t.note('alice', 'PreToolUse', 'AskUserQuestion');
    t.note('alice', event, undefined);
    assert.equal(t.isOpen('alice'), false, event);
  }
});

test('forgetting an agent drops its open question', () => {
  const t = new OpenQuestionTracker();
  t.note('alice', 'PreToolUse', 'AskUserQuestion');
  t.forget('alice');
  assert.equal(t.isOpen('alice'), false);
});

test('only tools that put a menu in front of a person count', () => {
  assert.equal(isHumanQuestionTool('AskUserQuestion'), true);
  assert.equal(isHumanQuestionTool('ExitPlanMode'), true);
  for (const tool of ['Read', 'Bash', 'Task', '', undefined]) assert.equal(isHumanQuestionTool(tool), false, String(tool));
  assert.equal(questionEffect('PreToolUse', 'Bash'), null);
  assert.equal(questionEffect('PostToolUse', 'AskUserQuestion'), 'close');
});

test('the renderer gate refuses every status while a question is open', () => {
  // `idle` is the case that bit: the quiescence fallback and the idle
  // Notification both land an asking agent on `idle`.
  assert.equal(canDeliverToAgent('idle', 60_000, QUIESCE_MS, true), false);
  assert.equal(canDeliverToAgent('looping', 60_000, QUIESCE_MS, true), false);
  // No question open: the gate is unchanged.
  assert.equal(canDeliverToAgent('idle', 60_000, QUIESCE_MS, false), true);
  assert.equal(canDeliverToAgent('idle', 60_000, QUIESCE_MS), true);
});

test('HAS IT RUN: every place that types into a terminal asks the tracker', () => {
  // A gate nobody calls looks exactly like a gate that works. Pin the wiring.
  const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
  const useHive = read('src/renderer/src/hooks/useHive.ts');
  const calls = useHive.match(/canDeliverToAgent\(/g) ?? [];
  const guarded = useHive.match(/canDeliverToAgent\([^;]*openQuestions\.isOpen\(/g) ?? [];
  assert.ok(calls.length >= 3, 'expected the three known delivery gates');
  assert.equal(guarded.length, calls.length, 'a delivery gate does not consult the open question tracker');
  assert.match(useHive, /openQuestions\.note\(e\.agentId, e\.event, e\.tool\)/);
  const index = read('src/main/index.ts');
  assert.match(index, /workerWake\.noteHook\(agentId, event, message, undefined, tool\)/);
  const hooks = read('src/main/hooks.ts');
  assert.match(hooks, /this\.onEvent\?\.\(agentId, event, p\.message, p\.tool_name\)/);
});

test('10. a terminal listing that FAILED drops no hold: only a listing that answered may', () => {
  // Found at integration (Kevin, 20 Sep). The exited terminal clean up read a
  // failed listPtys() as an empty floor, because the catch returns []. One
  // failed poll while a menu was open then forgot the hold, the idle
  // Notification set the agent idle, and the next delivery pressed Return.
  //
  // REWRITTEN after Creed's review: this test was two regexes over the source
  // and passed whether or not the guard did anything. It now RUNS the rule.
  const { forgetExitedTerminals } = loadTs('src/shared/openQuestion.ts');
  const agents = [{ id: 'pam', ptyId: 'pty-pam' }, { id: 'jim', ptyId: 'pty-jim' }];
  const menuUp = () => { const t = new OpenQuestionTracker(); t.note('pam', 'PreToolUse', 'AskUserQuestion'); t.note('jim', 'PreToolUse', 'AskUserQuestion'); return t; };

  // The listing FAILED. It looks exactly like an empty floor. Nothing is dropped.
  let t = menuUp();
  assert.deepEqual(forgetExitedTerminals(t, agents, { listed: false, liveIds: new Set() }), []);
  assert.ok(t.isOpen('pam') && t.isOpen('jim'), 'a failed poll dropped a hold: the next delivery would press Return into the menu');

  // The listing ANSWERED and pam's terminal is really gone. Only pam is dropped.
  t = menuUp();
  assert.deepEqual(forgetExitedTerminals(t, agents, { listed: true, liveIds: new Set(['pty-jim']) }), ['pam']);
  assert.ok(!t.isOpen('pam') && t.isOpen('jim'));

  // And the effect calls it with the flag the catch sets, not with a constant.
  const hive = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'src/renderer/src/hooks/useHive.ts'), 'utf8');
  assert.match(hive, /let listed = true;\s*\n\s*const ptys = await window\.cth\.listPtys\(\)\.catch\(\(\) => \{ listed = false; return \[\]; \}\);/);
  assert.match(hive, /forgetExitedTerminals\(openQuestions, useStore\.getState\(\)\.agents, \{ listed, liveIds:/);
});
