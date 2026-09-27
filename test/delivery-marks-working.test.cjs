'use strict';

/* 0.5.3 bug 7, the grey dot (Jinbo, 14 Sep). The orchestrator handed a worker a
 * task, the task card read "doing", and the worker's row in the left agent list
 * stayed grey while the header counted "1 active".
 *
 * The dot and the count read one field, the agent's status, and only two things
 * ever set it to `working`: a hook event from the agent's own CLI, or the
 * terminal parser, which runs only while that agent's terminal is open. When the
 * app itself types a task into an agent and presses Return it KNOWS a turn has
 * started, and it said nothing. An engine with no hook bridge (kimi, cursor,
 * copilot, custom) therefore never reads as working unless someone is looking at
 * its terminal, and a hooked engine reads idle until its first event lands. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { statusAfterDelivery } = loadTs('src/renderer/src/hooks/queueDelivery.ts');

test('a delivered task marks the agent working', () => {
  assert.deepEqual(statusAfterDelivery('Fix the login page', false), { status: 'working', action: 'reading a new message' });
});

test('the inbox nudge is a turn too', () => {
  assert.equal(statusAfterDelivery('You have new hive inbox message(s)', false)?.status, 'working');
});

test('a slash command is not a turn: /clear and /model start no work', () => {
  for (const text of ['/clear', '/compact keep the plan', '  /model', '/context']) {
    assert.equal(statusAfterDelivery(text, false), null, text);
  }
});

test('the breaker pin is not overwritten', () => {
  assert.equal(statusAfterDelivery('Stop and write a plan', true), null);
});

test('nothing typed, nothing claimed', () => {
  assert.equal(statusAfterDelivery('', false), null);
  assert.equal(statusAfterDelivery('   ', false), null);
});

test('HAS IT RUN: the drain calls it on a successful send, and only then', () => {
  const useHive = fs.readFileSync(path.join(__dirname, '..', 'src/renderer/src/hooks/useHive.ts'), 'utf8');
  const sent = useHive.indexOf('        if (sent) {');
  const call = useHive.indexOf('statusAfterDelivery(', sent);
  const ret = useHive.indexOf('return { sent: true, message: next };', sent);
  assert.ok(sent > 0 && call > sent && call < ret, 'the working mark is not inside the successful send branch');
  // Silence must still be able to take it back, for every engine, or a hookless
  // agent would read working for ever: the quiescence fallback flips `working`.
  assert.match(useHive, /if \(!a\.ptyId \|\| a\.status !== 'working'\) continue;/);
  // Kevin's B19 follow up: a terminal that exits takes its open question with it.
  assert.match(useHive, /openQuestions\.forget\(/);
});
