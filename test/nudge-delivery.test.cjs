'use strict';

/**
 * deliverNudge — the text-then-Enter sequence with echo-aware timing and
 * Enter-only retries (see nudgeDelivery.ts for the bug this replaces: a
 * swallowed Enter used to leave the text sitting unsubmitted, and the next
 * nudge retyped the whole message on top of it).
 *
 * The fake PTY below has no real clock and no real timers: `sleep` is an
 * injected function that advances a local `elapsed` counter by the requested
 * ms and applies any scheduled "reaction" (a simulated burst of PTY output)
 * whose time has come. A reaction is just an elapsed-ms mark at which
 * `lastOutputAt` jumps to that mark — standing in for "the TUI printed
 * something" (an echoed keystroke, a redrawn prompt, a tool call starting).
 * The whole suite therefore runs in real time measured in microseconds, while
 * exercising the real 400-600ms / 500ms / 300-600-1200ms constants.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const loadTs = require('./load-ts.cjs');

const { deliverNudge, NUDGE_ENTER_MAX_RETRIES } = loadTs('src/main/nudgeDelivery.ts');

/** `reactionsAt`: elapsed-ms marks (any order) at which the fake PTY produces
 *  new output. Each only ever fires once, when cumulative sleep crosses it. */
function fakePty(reactionsAt = []) {
  const reactions = [...reactionsAt].sort((a, b) => a - b);
  let elapsed = 0;
  let lastOutputAt = 0;
  const writes = [];
  const log = [];
  return {
    writes,
    log,
    deps: {
      write: (_ptyId, data) => { writes.push(data); return { ok: true }; },
      lastOutputAt: () => lastOutputAt,
      log: (event) => log.push(event),
      sleep: async (ms) => {
        elapsed += ms;
        while (reactions.length && reactions[0] <= elapsed) { lastOutputAt = reactions.shift(); }
      }
    }
  };
}

test('happy path: echo seen, Enter confirmed on the first attempt -- text written exactly once', async () => {
  // Echo at 450ms (inside the 400-600ms echo window); a second reaction at
  // 950ms confirms Enter (sent at 450ms, confirm window is [450, 950]).
  const { deps, writes, log } = fakePty([450, 950]);

  const result = await deliverNudge('pty-1', 'agent-1', 'the full nudge text', deps);

  assert.equal(result, 'confirmed');
  assert.deepEqual(writes.filter((w) => w !== '\r'), ['the full nudge text']);
  assert.equal(writes.filter((w) => w === '\r').length, 1, 'Enter sent exactly once when the first attempt is confirmed');
  assert.deepEqual(log.map((e) => e.phase), ['typed', 'enter-sent', 'confirmed']);
});

test('no echo at all: still sends Enter once the 600ms cap is reached, and can confirm on the first attempt', async () => {
  // No reaction before Enter is sent (it is sent at elapsed=600 regardless,
  // once the echo wait's hard cap is reached); a reaction at 650ms confirms it.
  const { deps, writes, log } = fakePty([650]);

  const result = await deliverNudge('pty-1', 'agent-1', 'the full nudge text', deps);

  assert.equal(result, 'confirmed');
  assert.equal(writes.filter((w) => w === '\r').length, 1);
  assert.deepEqual(log.map((e) => e.phase), ['typed', 'enter-sent', 'confirmed']);
});

test('swallowed Enter: retried as Enter ONLY, never the text, and recovers on the 1st retry', async () => {
  // No echo. Enter is sent at elapsed=600. The first confirm window [600,1100]
  // gets no reaction (swallowed); the retry (after the 300ms backoff) opens a
  // second window at [1400,1900], where a reaction at 1500 confirms it.
  const { deps, writes, log } = fakePty([1500]);

  const result = await deliverNudge('pty-1', 'agent-1', 'the full nudge text', deps);

  assert.equal(result, 'confirmed');
  assert.deepEqual(writes.filter((w) => w !== '\r'), ['the full nudge text'], 'text written exactly once, even after a swallowed Enter');
  assert.equal(writes.filter((w) => w === '\r').length, 2, 'the original Enter plus exactly one retry');
  assert.deepEqual(log.map((e) => e.phase), ['typed', 'enter-sent', 'stuck', 'enter-retry', 'confirmed']);
});

test('Enter never confirmed after every retry: gives up, still never retypes the text', async () => {
  const { deps, writes, log } = fakePty([]); // the PTY never reacts, no matter what

  const result = await deliverNudge('pty-1', 'agent-1', 'the full nudge text', deps);

  assert.equal(result, 'stuck');
  assert.deepEqual(writes.filter((w) => w !== '\r'), ['the full nudge text'], 'the text is NEVER retyped, no matter how many Enter retries happen');
  assert.equal(writes.filter((w) => w === '\r').length, 1 + NUDGE_ENTER_MAX_RETRIES, 'one initial Enter plus every retry, and no more');
  assert.deepEqual(
    log.map((e) => e.phase),
    ['typed', 'enter-sent', 'stuck', 'enter-retry', 'stuck', 'enter-retry', 'stuck', 'enter-retry', 'gave-up']
  );
});

test('a dead PTY (write fails) is reported immediately, no waiting, no retries', async () => {
  const log = [];
  const deps = {
    write: () => ({ ok: false, error: 'no pty: pty-1' }),
    lastOutputAt: () => 0,
    log: (event) => log.push(event),
    sleep: async () => { throw new Error('must not sleep when the write itself failed'); }
  };

  const result = await deliverNudge('pty-1', 'agent-1', 'the full nudge text', deps);

  assert.equal(result, 'write-failed');
  assert.deepEqual(log.map((e) => e.phase), ['typed-failed']);
  assert.equal(log[0].error, 'no pty: pty-1');
});

test('3 agents nudged at once -- one confirms immediately, one after a retry, one after two -- all independent, each writes its own text exactly once', async () => {
  // This exercises delivery itself under concurrency; WHETHER a mid-task
  // agent's delivery starts at all is WorkerWakeWatchdog's job, covered in
  // worker-wake.test.cjs's "3 agents nudged at once, one mid-task" test. Here,
  // all three deliveries are already underway (as they would be for the two
  // idle agents the watchdog actually picked), and must not interfere with
  // each other -- separate ptyIds, separate fake clocks, run concurrently.
  const a = fakePty([650]);    // confirms on the first attempt
  const b = fakePty([1500]);   // confirms after one retry
  const c = fakePty([2550]);   // confirms after two retries

  const [ra, rb, rc] = await Promise.all([
    deliverNudge('pty-a', 'agent-a', 'nudge A', a.deps),
    deliverNudge('pty-b', 'agent-b', 'nudge B', b.deps),
    deliverNudge('pty-c', 'agent-c', 'nudge C', c.deps)
  ]);

  assert.equal(ra, 'confirmed');
  assert.equal(rb, 'confirmed');
  assert.equal(rc, 'confirmed');
  assert.deepEqual(a.writes.filter((w) => w !== '\r'), ['nudge A']);
  assert.deepEqual(b.writes.filter((w) => w !== '\r'), ['nudge B']);
  assert.deepEqual(c.writes.filter((w) => w !== '\r'), ['nudge C']);
  assert.equal(a.writes.filter((w) => w === '\r').length, 1);
  assert.equal(b.writes.filter((w) => w === '\r').length, 2);
  assert.equal(c.writes.filter((w) => w === '\r').length, 3);
});
