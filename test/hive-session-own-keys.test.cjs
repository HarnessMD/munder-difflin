'use strict';

/**
 * A hook payload names the agent whose session id is being recorded. That name
 * is used as a key into the registry's plain `agents` object, so the word
 * `__proto__` used to reach `Object.prototype`: `reg.agents['__proto__']` is the
 * prototype itself, truthy, with no `sessionId`, so recordSession walked on and
 * assigned `sessionHistory`, `sessionId` and `lastSeen` ONTO EVERY OBJECT IN THE
 * MAIN PROCESS. refuseSession had the same hole with `refusedSessions`. CodeQL
 * flagged it (prototype-polluting assignment); 468b6214 reads own entries only
 * (`Object.hasOwn`).
 *
 * These tests pin both halves of that fix:
 *   1. an id of `__proto__` (or `constructor`) leaves the prototype alone,
 *      writes nothing for that id, and does not throw into the hook handler;
 *   2. the guard does not break the normal path — a real agent's session is
 *      still recorded, and a refusal is still remembered.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { HiveManager } = loadTs('src/main/hive.ts');

// A Claude Code session id: the shape sessionIdFits accepts for a `claude`
// agent (every id fits there; only opencode pins a `ses_…` form), so the
// normal path below really does reach the write.
const SID = '11111111-2222-4333-8444-555555555555';
const POISON = 'de3cf0f7-0a51-4b0a-9e3e-9c0dd1ea9f55';

/** The fields the hole used to write onto Object.prototype. */
const POLLUTED_KEYS = ['sessionId', 'lastSeen', 'sessionHistory', 'refusedSessions'];

function readLog(home) {
  const p = path.join(home, 'hive', 'log.jsonl');
  if (!fs.existsSync(p)) return [];
  return fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

function readRegistry(home) {
  return fs.readFileSync(path.join(home, 'hive', 'registry.json'), 'utf8');
}

async function freshHive(t) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'md-own-keys-'));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  // A regression here pollutes every object in this process, which would then
  // break unrelated tests in the same run. Clean up whatever leaked, after the
  // assertions have already seen it.
  t.after(() => { for (const k of POLLUTED_KEYS) delete Object.prototype[k]; });
  const hive = new HiveManager(() => home);
  await hive.ensureAgent({ id: 'a1', name: 'A', provider: 'claude', cwd: home });
  return { home, hive };
}

/** Nothing has been added to the prototype every plain object inherits from. */
function assertPrototypeClean(where) {
  const plain = {};
  for (const k of POLLUTED_KEYS) {
    assert.equal(Object.hasOwn(Object.prototype, k), false, `${where}: Object.prototype.${k} must not exist`);
    assert.equal(k in plain, false, `${where}: {} must not inherit ${k}`);
    assert.equal(plain[k], undefined, `${where}: {}.${k} must be undefined`);
  }
}

test("recordSession('__proto__') leaves Object.prototype alone and writes nothing", async (t) => {
  const { home, hive } = await freshHive(t);
  const before = readRegistry(home);

  // Exactly what a hook payload can carry. Best-effort by contract: it must not
  // throw into the hook handler either.
  assert.doesNotThrow(() => hive.recordSession('__proto__', POISON));

  assertPrototypeClean('recordSession');

  const after = readRegistry(home);
  assert.equal(after, before, 'the registry must not be rewritten for an unknown id');
  const reg = JSON.parse(after);
  assert.equal(Object.hasOwn(reg.agents, '__proto__'), false, 'no agent entry may be created for __proto__');
  assert.equal(after.includes(POISON), false, 'the id must not be stored anywhere');
  assert.equal(readLog(home).some((r) => r.agentId === '__proto__'), false, 'and nothing may be logged for it');
});

test("refuseSession('__proto__') leaves Object.prototype alone and writes nothing", async (t) => {
  const { home, hive } = await freshHive(t);
  const before = readRegistry(home);

  assert.doesNotThrow(() => hive.refuseSession('__proto__', POISON));

  assertPrototypeClean('refuseSession');

  const after = readRegistry(home);
  assert.equal(after, before, 'the registry must not be rewritten for an unknown id');
  assert.equal(Object.hasOwn(JSON.parse(after).agents, '__proto__'), false);
  assert.equal(after.includes(POISON), false);
  assert.equal(readLog(home).some((r) => r.kind === 'session-refused'), false, 'no refusal may be recorded');
});

test("'constructor' is not an agent either", async (t) => {
  const { home, hive } = await freshHive(t);

  assert.doesNotThrow(() => hive.recordSession('constructor', POISON));
  assert.doesNotThrow(() => hive.refuseSession('constructor', POISON));

  // The same lookup reaches the Object constructor rather than the prototype;
  // the own-entry guard covers both, so nothing is written on it.
  for (const k of POLLUTED_KEYS) {
    assert.equal(Object.hasOwn(Object, k), false, `Object.${k} must not exist`);
  }
  assertPrototypeClean('constructor');
  assert.equal(readRegistry(home).includes(POISON), false);
});

test('the guard does not break the normal path: a real agent still records its session', async (t) => {
  const { home, hive } = await freshHive(t);

  hive.recordSession('a1', SID);

  const reg = JSON.parse(readRegistry(home));
  assert.equal(reg.agents.a1.sessionId, SID, 'the session id must be persisted for the agent');
  assert.ok(reg.agents.a1.lastSeen > 0, 'and lastSeen stamped');
  const rows = readLog(home).filter((r) => r.kind === 'session');
  assert.equal(rows.length, 1, 'the write must be logged once');
  assert.deepEqual({ agentId: rows[0].agentId, sessionId: rows[0].sessionId }, { agentId: 'a1', sessionId: SID });

  // And a refusal for that same agent is still remembered.
  hive.refuseSession('a1', SID);
  assert.deepEqual(JSON.parse(readRegistry(home)).agents.a1.refusedSessions, [SID]);
});
