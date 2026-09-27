'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const loadTs = require('./load-ts.cjs');

// hooks.ts imports Electron's Notification class. Node tests only exercise the
// hook return value, so provide the tiny surface needed to load the module.
const electron = require.resolve('electron');
require.cache[electron] = {
  id: electron,
  filename: electron,
  loaded: true,
  exports: { Notification: class { show() {} static isSupported() { return false; } } }
};

const { HookServer } = loadTs('src/main/hooks.ts');

function harness(initialGoal = 'Ship the release safely.') {
  let goal = initialGoal;
  const hive = {
    recordSession() {},
    isGod() { return false; }
  };
  const server = new HookServer(
    hive,
    () => null,
    () => ({ notifications: false }),
    undefined,
    undefined,
    () => goal
  );
  const fire = (event, sessionId = 'session-1', agentId = 'jim-1') => server.handle({
    agent_id: agentId,
    hook_event_name: event,
    session_id: sessionId
  });
  return { fire, setGoal: (next) => { goal = next; } };
}

const context = (res) => res?.hookSpecificOutput?.additionalContext ?? '';

// PRO carries one more thing in this block than public main does: hooks.ts also
// renders the response-style brief on every SessionStart and UserPromptSubmit,
// and an absent config value normalizes to the shipped default rather than to
// nothing. So the context here is never the empty string, and 'no goal was
// re-sent' has to be said a different way.
//
// It is said without giving anything up. additionalContext is
// [style, roster, goal, steer].filter(Boolean).join('\n\n'), so a context that
// is EXACTLY the style brief proves the same three absences the empty string
// proved upstream: no goal, no roster, no steer.
const { renderResponseStyle } = loadTs('src/shared/responseStyle.ts');
const STYLE_ONLY = renderResponseStyle(undefined);
const assertOnlyStyle = (res) => assert.equal(context(res), STYLE_ONLY);

test('an unchanged standing goal is injected once, not on every prompt', () => {
  const { fire } = harness();

  assert.match(context(fire('SessionStart')), /Ship the release safely/);
  assertOnlyStyle(fire('UserPromptSubmit'));
  assertOnlyStyle(fire('UserPromptSubmit'));
});

test('a goal edit is delivered on the next prompt and only once', () => {
  const { fire, setGoal } = harness();
  fire('SessionStart');

  setGoal('Prepare the customer handoff.');
  assert.match(context(fire('UserPromptSubmit')), /Prepare the customer handoff/);
  assertOnlyStyle(fire('UserPromptSubmit'));
});

test('a new session receives the standing goal even when its text is unchanged', () => {
  const { fire } = harness();
  fire('SessionStart', 'session-1');

  assert.match(context(fire('SessionStart', 'session-2')), /Ship the release safely/);
  assertOnlyStyle(fire('UserPromptSubmit', 'session-2'));
});

test('a prompt that arrives before SessionStart still receives the goal once', () => {
  const { fire } = harness();

  assert.match(context(fire('UserPromptSubmit')), /Ship the release safely/);
  assertOnlyStyle(fire('UserPromptSubmit'));
});

test('clearing a goal explicitly revokes the old briefing', () => {
  const { fire, setGoal } = harness();
  fire('SessionStart');

  setGoal(null);
  assert.match(context(fire('UserPromptSubmit')), /Cleared by the operator/);
  assertOnlyStyle(fire('UserPromptSubmit'));
});

test('goal delivery state is isolated per agent', () => {
  const { fire } = harness();
  fire('SessionStart', 'session-1', 'jim-1');

  assert.match(context(fire('UserPromptSubmit', 'session-1', 'pam-1')), /Ship the release safely/);
  assertOnlyStyle(fire('UserPromptSubmit', 'session-1', 'jim-1'));
});
