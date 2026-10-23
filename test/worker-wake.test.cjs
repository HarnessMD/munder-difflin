const { test } = require('node:test');
const assert = require('node:assert/strict');
const loadTs = require('./load-ts.cjs');

const {
  WorkerWakeWatchdog,
  classifyHook,
  WORKER_WAKE_NUDGE,
  WORKER_WAKE_IDLE_MS,
  WORKER_WAKE_BOOT_GRACE_MS,
  WORKER_WAKE_COOLDOWN_MS,
  WORKER_WAKE_HITL_REARM_MS
} = loadTs('src/main/workerWake.ts');

/** A permissive fact; tests override the fields they care about. */
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

test('nudges an idle worker with undrained inbox mail', () => {
  const w = new WorkerWakeWatchdog();
  w.noteSpawn('pty-alice', 0);
  const now = 200_000;
  const out = w.decide([fact({ lastOutputAt: now - WORKER_WAKE_IDLE_MS - 1 })], now);
  assert.deepEqual(out, ['alice']);
});

test('never nudges god, archived agents, or agents without a live pty', () => {
  const w = new WorkerWakeWatchdog();
  w.noteSpawn('p1', 0);
  const now = 200_000;
  const out = w.decide([
    fact({ agentId: 'god', isGod: true, ptyId: 'p1' }),
    fact({ agentId: 'gone', archived: true, ptyId: undefined }),
    fact({ agentId: 'no-pty', ptyId: undefined })
  ], now);
  assert.deepEqual(out, []);
});

test('never nudges when there is no inbox mail', () => {
  const w = new WorkerWakeWatchdog();
  w.noteSpawn('pty-alice', 0);
  const now = 200_000;
  const out = w.decide([fact({ inboxIds: [] })], now);
  assert.deepEqual(out, []);
});

test('never nudges a mid-turn worker (recent PTY output)', () => {
  const w = new WorkerWakeWatchdog();
  w.noteSpawn('pty-alice', 0);
  const now = 200_000;
  const out = w.decide([fact({ lastOutputAt: now - 1 })], now);
  assert.deepEqual(out, []);
});

test('never nudges a worker that never produced output (still booting)', () => {
  const w = new WorkerWakeWatchdog();
  w.noteSpawn('pty-alice', 0);
  const now = 200_000;
  const out = w.decide([fact({ lastOutputAt: 0 })], now);
  assert.deepEqual(out, []);
});

test('respects the boot grace window', () => {
  const w = new WorkerWakeWatchdog();
  w.noteSpawn('pty-alice', 10_000);
  const now = 10_000 + WORKER_WAKE_BOOT_GRACE_MS - 1;
  assert.deepEqual(w.decide([fact({ lastOutputAt: 0 })], now), []);
  // past the grace (and idle long enough) → eligible
  const late = 10_000 + WORKER_WAKE_BOOT_GRACE_MS + WORKER_WAKE_IDLE_MS + 1;
  assert.deepEqual(w.decide([fact({ lastOutputAt: late - WORKER_WAKE_IDLE_MS - 1 })], late), ['alice']);
});

test('never nudges while delivery is paused, agent paused, or halted', () => {
  const w = new WorkerWakeWatchdog();
  w.noteSpawn('p1', 0);
  const now = 200_000;
  const out = w.decide([
    fact({ agentId: 'a1', ptyId: 'p1', autoDeliveryPaused: true }),
    fact({ agentId: 'a2', ptyId: 'p1', paused: true }),
    fact({ agentId: 'a3', ptyId: 'p1', halted: true })
  ], now);
  assert.deepEqual(out, []);
});

test('a recent permission/HITL notification blocks nudges', () => {
  const w = new WorkerWakeWatchdog();
  w.noteSpawn('pty-alice', 0);
  const now = 200_000;
  w.noteHook('alice', 'Notification', 'Claude needs your permission to use Bash.', now - 1_000);
  assert.deepEqual(w.decide([fact()], now), []);
  // after the rearm window the block expires
  const later = now + WORKER_WAKE_HITL_REARM_MS + 1;
  assert.deepEqual(w.decide([fact({ lastOutputAt: later - WORKER_WAKE_IDLE_MS - 1 })], later), ['alice']);
});

test('an idle-waiting notification does NOT count as a HITL hold', () => {
  const w = new WorkerWakeWatchdog();
  w.noteSpawn('pty-alice', 0);
  const now = 200_000;
  w.noteHook('alice', 'Notification', 'waiting for your input', now - 1_000);
  assert.deepEqual(w.decide([fact()], now), ['alice']);
});

test('the same inbox mail is not re-announced after the cooldown', () => {
  const w = new WorkerWakeWatchdog();
  w.noteSpawn('pty-alice', 0);
  const now = 200_000;
  assert.deepEqual(w.decide([fact()], now), ['alice']);
  assert.deepEqual(w.decide([fact()], now + WORKER_WAKE_COOLDOWN_MS - 1), []);
  assert.deepEqual(w.decide([fact({ lastOutputAt: now + WORKER_WAKE_COOLDOWN_MS + 1 - WORKER_WAKE_IDLE_MS - 1 })], now + WORKER_WAKE_COOLDOWN_MS + 1), []);
});

test('new mail is announced after the cooldown even while older mail remains', () => {
  const w = new WorkerWakeWatchdog();
  w.noteSpawn('pty-alice', 0);
  const now = 200_000;
  assert.deepEqual(w.decide([fact()], now), ['alice']);

  const duringCooldown = now + WORKER_WAKE_COOLDOWN_MS - 1;
  assert.deepEqual(w.decide([fact({
    inboxIds: ['mail-1', 'mail-2'],
    lastOutputAt: duringCooldown - WORKER_WAKE_IDLE_MS - 1
  })], duringCooldown), []);

  const afterCooldown = now + WORKER_WAKE_COOLDOWN_MS + 1;
  assert.deepEqual(w.decide([fact({
    inboxIds: ['mail-1', 'mail-2'],
    lastOutputAt: afterCooldown - WORKER_WAKE_IDLE_MS - 1
  })], afterCooldown), ['alice']);
});

test('filing one of several announced messages does not re-announce the remainder', () => {
  const w = new WorkerWakeWatchdog();
  w.noteSpawn('pty-alice', 0);
  const now = 200_000;
  assert.deepEqual(w.decide([fact({ inboxIds: ['mail-1', 'mail-2'] })], now), ['alice']);

  const later = now + WORKER_WAKE_COOLDOWN_MS + 1;
  assert.deepEqual(w.decide([fact({
    inboxIds: ['mail-2'],
    lastOutputAt: later - WORKER_WAKE_IDLE_MS - 1
  })], later), []);
});

test('draining the inbox resets announcement memory', () => {
  const w = new WorkerWakeWatchdog();
  w.noteSpawn('pty-alice', 0);
  const now = 200_000;
  assert.deepEqual(w.decide([fact()], now), ['alice']);
  assert.deepEqual(w.decide([fact({ inboxIds: [] })], now + 1), []);

  const later = now + WORKER_WAKE_COOLDOWN_MS + 1;
  assert.deepEqual(w.decide([fact({
    lastOutputAt: later - WORKER_WAKE_IDLE_MS - 1
  })], later), ['alice']);
});

test('forget clears cooldown + boot grace + HITL state', () => {
  const w = new WorkerWakeWatchdog();
  w.noteSpawn('pty-alice', Date.now());
  w.noteHook('alice', 'Notification', 'permission', Date.now());
  w.decide([fact()], Date.now());
  w.forget('alice', 'pty-alice');
  const now = 200_000;
  assert.deepEqual(w.decide([fact({ lastOutputAt: now - WORKER_WAKE_IDLE_MS - 1 })], now), ['alice']);
});

test('classifyHook: permission/approve/confirm shapes are needsHuman', () => {
  assert.equal(classifyHook('Notification', 'Claude needs your permission to use Bash.'), 'needsHuman');
  assert.equal(classifyHook('Notification', 'Approve tool use?'), 'needsHuman');
  assert.equal(classifyHook('Notification', 'confirm the change?'), 'needsHuman');
});

test('classifyHook: idle-waiting shapes are idle, other events are null', () => {
  assert.equal(classifyHook('Notification', 'waiting for your input'), 'idle');
  assert.equal(classifyHook('Notification', 'Claude is idle — waiting for input'), 'idle');
  assert.equal(classifyHook('Notification', ''), 'idle');
  assert.equal(classifyHook('Stop', 'some message'), null);
  assert.equal(classifyHook('UserPromptSubmit', undefined), null);
});

test('the nudge text matches the renderer guardrail exactly', () => {
  // WORKER_WAKE_NUDGE is now derived FROM inboxNudgeText (hiveNudge.ts), so the
  // two can never drift — this just pins that it's still a short, recognisable
  // nudge, not the long restated-protocol prose it used to be.
  assert.equal(WORKER_WAKE_NUDGE.length < 120, true, WORKER_WAKE_NUDGE);
  assert.match(WORKER_WAKE_NUDGE, /inbox message/i);
});

test('in-flight: a nudge currently being delivered holds a second nudge for the same agent', () => {
  const w = new WorkerWakeWatchdog();
  w.noteSpawn('pty-alice', 0);
  const now = 200_000;
  const f = fact({ lastOutputAt: now - WORKER_WAKE_IDLE_MS - 1 });
  // First beat: nothing in flight yet, alice is nudged.
  assert.deepEqual(w.decide([f], now), ['alice']);
  // Caller marks in-flight the moment delivery starts (before the async retry
  // loop even runs) -- simulate a second beat firing before that delivery
  // resolves, with NEW mail (a different id) on top of the old one. Without the
  // in-flight gate this is exactly the shape that retypes a second full nudge
  // over a first one still sitting unconfirmed in the input box.
  w.markNudging('alice');
  const laterFact = fact({ lastOutputAt: now - WORKER_WAKE_IDLE_MS - 1, inboxIds: ['mail-1', 'mail-2'] });
  assert.equal(w.explain(laterFact, now + 1000), 'in-flight');
  assert.deepEqual(w.decide([laterFact], now + 1000), []);
  // Delivery resolves (confirmed or gave-up) -- caller clears in-flight. The
  // ordinary per-worker cooldown from the FIRST nudge still applies (clearing
  // in-flight doesn't bypass it) -- the hold reason shifts from 'in-flight' to
  // 'cooldown', not straight to a second nudge.
  w.clearNudging('alice');
  assert.equal(w.explain(laterFact, now + 2000), 'cooldown');
  assert.deepEqual(w.decide([laterFact], now + 2000), []);
  // Once the cooldown elapses, the new mail (mail-2, never announced while
  // in-flight) is free to be nudged.
  assert.deepEqual(w.decide([laterFact], now + WORKER_WAKE_COOLDOWN_MS + 1), ['alice']);
});

test('3 agents nudged at once, one mid-task: only the idle two go out, and neither re-nudges while in flight', () => {
  const w = new WorkerWakeWatchdog();
  const now = 500_000;
  w.noteSpawn('pty-a', 0);
  w.noteSpawn('pty-b', 0);
  w.noteSpawn('pty-c', 0);
  const facts = [
    fact({ agentId: 'agent-a', ptyId: 'pty-a', lastOutputAt: now - WORKER_WAKE_IDLE_MS - 1 }),
    fact({ agentId: 'agent-b', ptyId: 'pty-b', lastOutputAt: now - WORKER_WAKE_IDLE_MS - 1 }),
    // agent-c is mid-task: PTY output a second ago, well inside the idle window.
    fact({ agentId: 'agent-c', ptyId: 'pty-c', lastOutputAt: now - 1000 })
  ];
  const nudged = w.decide(facts, now);
  assert.deepEqual(new Set(nudged), new Set(['agent-a', 'agent-b']));
  assert.equal(w.explain(facts[2], now), 'mid-turn');

  // Both idle agents' deliveries are marked in-flight (as the real beat would).
  w.markNudging('agent-a');
  w.markNudging('agent-b');
  // A beat firing moments later, mid-delivery, holds all three for different
  // reasons -- neither idle agent gets a second nudge stacked on its first.
  assert.deepEqual(w.decide(facts, now + 500), []);
  assert.equal(w.explain(facts[0], now + 500), 'in-flight');
  assert.equal(w.explain(facts[1], now + 500), 'in-flight');
  assert.equal(w.explain(facts[2], now + 500), 'mid-turn');
});
