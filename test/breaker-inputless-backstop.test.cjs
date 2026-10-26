'use strict';

/**
 * Blind-bridge backstop (ported onto current upstream main, with jim's review
 * fixes folded in).
 *
 * The breaker's loop arm keys on (tool name + tool_input). A bridge that does
 * not forward tool_input collapses every consecutive same-NAME call onto one
 * key, so a normal multi-step turn (several bash calls) reads as a runaway loop
 * ??? the false positives that steered and constrained the floor all night.
 * Treating an inputless call as distinct fixes the false positive, but leaves
 * the loop arm BLIND for exactly those bridges, so a genuine runaway would be
 * invisible. This adds a high-threshold backstop with the reset semantics jim
 * asked for: a sighted call, a human prompt, compaction, a turn boundary or a
 * quiet interval with output growth resets it — but output growth alone never
 * clears a run that contains NEW blind calls (a real loop emits output too), a
 * warn is labelled ONCE before the hard stop, and the counter state is in the
 * reason.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const loadTs = require('./load-ts.cjs');

const { CircuitBreaker } = loadTs('src/main/breaker.ts');

const T0 = 1_000_000_000_000;
const BEAT = 30_000;

function makeBreaker(over = {}) {
  return new CircuitBreaker(() => ({
    enabled: true, hardStop: false, repeatedToolLimit: 8, errorStormLimit: 5,
    tokenVelocityPerMin: 60000, ...over
  }));
}

function sample(ts, output, input = 1000) {
  return { agentId: 'a', sessionId: 's1', ts, input, output, cacheRead: 0, cacheCreation: 0, model: 'm', usd: 0 };
}

function beat(b, s, progressing, now) {
  return b.tick([{ agentId: 'a', sample: s, progressing }], now)[0];
}

const blind = (b, n) => { for (let i = 0; i < n; i++) b.recordToolUse('a', 'Bash', undefined); };
const sighted = (b, n, fn = (i) => ({ cmd: `command-${i}` })) => {
  for (let i = 0; i < n; i++) b.recordToolUse('a', 'Bash', fn(i));
};

test('distinct commands with inputs do not accumulate a loop under the old false positive', () => {
  const b = makeBreaker();
  sighted(b, 7);
  const d = beat(b, null, true, T0);
  assert.equal(d.state.level, 'healthy');
});

test('a warning is labelled at 30 blind calls, before the hard stop at 60', () => {
  const b = makeBreaker();
  blind(b, 30);
  const warn = beat(b, null, false, T0);
  assert.equal(warn.state.level, 'steering');
  assert.match(warn.state.reason, /warning/);
  assert.match(warn.state.reason, /no tool_input/);
  assert.match(warn.state.reason, /30/);
  assert.match(warn.state.reason, /hard limit 60/);
});

test('the warning is emitted ONCE, not re-sent every other beat', () => {
  const b = makeBreaker();
  blind(b, 30);
  const d1 = beat(b, null, false, T0);
  assert.equal(d1.state.level, 'steering');
  assert.equal(d1.action, 'steer');
  const d2 = beat(b, null, false, T0 + BEAT);
  assert.equal(d2.state.level, 'healthy', 'no second trip while the run is unchanged');
  const d3 = beat(b, null, false, T0 + 2 * BEAT);
  assert.equal(d3.state.level, 'healthy', `reason: ${d3.state.reason}`);
  assert.equal(d3.action, 'none');
});

test('60 blind calls trip the hard backstop and the reason carries the counter state', () => {

  const b = makeBreaker();
  blind(b, 60);
  const d = beat(b, null, false, T0);
  assert.equal(d.state.level, 'steering');
  assert.match(d.state.reason, /looping/);
  assert.match(d.state.reason, /60/);
  assert.match(d.state.reason, /no tool_input/);
});

test('a human prompt resets the blind-call counter', () => {
  const b = makeBreaker();
  blind(b, 40);
  b.recordUserPrompt('a', T0);
  blind(b, 10);
  const d = beat(b, null, false, T0);

  assert.equal(d.state.level, 'healthy', `reason: ${d.state.reason}`);
});

test('a blind loop that ALSO grows output still trips the hard backstop', () => {
  const b = makeBreaker();
  beat(b, sample(T0, 0), true, T0); // baseline sample
  blind(b, 60);
  // The loop grows output between the beats too. That growth must NOT clear a
  // run that contains new blind calls — otherwise a real loop is invisible.
  const d = beat(b, sample(T0 + BEAT, 500), false, T0 + BEAT);
  assert.match(d.state.reason, /no tool_input/, `reason: ${d.state.reason}`);
  assert.notEqual(d.state.level, 'healthy');
});

test('reasoning output alone (no blind calls) never contributes a blind-call trip', () => {
  const b = makeBreaker();
  // A long thinking turn: output grows on every beat, no tool calls at all.
  // Other arms (e.g. no-progress) are out of scope here; what matters is that
  // the blind-call counter never accumulates without an inputless call.
  for (let i = 0; i < 6; i++) {
    const d = beat(b, sample(T0 + i * BEAT, i * 500), false, T0 + i * BEAT);
    assert.doesNotMatch(d.state.reason, /no tool_input/, `beat ${i} reason: ${d.state.reason}`);
  }
});


test('a turn boundary resets the counter and the repeat streak', () => {
  const b = makeBreaker();
  blind(b, 40);
  b.recordTurnEnd('a');
  blind(b, 10);
  const d = beat(b, null, false, T0);

  assert.equal(d.state.level, 'healthy', `reason: ${d.state.reason}`);
});

test('a compaction resets the counter', () => {
  const b = makeBreaker();
  blind(b, 40);
  b.recordCompactStart('a', T0);
  blind(b, 10);
  const d = beat(b, null, false, T0);

  assert.equal(d.state.level, 'healthy', `reason: ${d.state.reason}`);
});

test('one sighted call resets the blind-call counter', () => {
  const b = makeBreaker();
  blind(b, 29);
  sighted(b, 1);
  blind(b, 29);
  const d = beat(b, null, false, T0);

  assert.equal(d.state.level, 'healthy', `reason: ${d.state.reason}`);
});

test('an inputless call does NOT clear a real error storm (no double-blind bridge)', () => {
  const b = makeBreaker();
  for (let i = 0; i < 5; i++) b.recordError('a');
  b.recordToolUse('a', 'Bash', undefined);
  const d = beat(b, null, true, T0);
  assert.match(d.state.reason, /error storm/);
});

test('a historic loop test still passes: identical input calls trip', () => {
  const b = makeBreaker();
  for (let i = 0; i < 8; i++) b.recordToolUse('a', 'Bash', { cmd: 'same' });
  const d = beat(b, null, true, T0);
  assert.match(d.state.reason, /looping/);
});

