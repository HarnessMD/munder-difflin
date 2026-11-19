'use strict';

/**
 * Regression coverage for #811: the router tick walked every agent folder's
 * outbox on the main thread, archived agents included. With over a thousand
 * folders that walk took ~70 ms every 1.5 s and froze the cursor. The router
 * now skips archived agents on ordinary ticks and still drains their outboxes
 * on a full sweep (registry change, or every ROUTER_FULL_SWEEP_EVERY ticks).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { HiveManager } = loadTs('src/main/hive.ts');

const ARCHIVED = 12;

async function floor(t) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'md-router walk-'));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));

  const hive = new HiveManager(() => home);
  await hive.ensureAgent({ id: 'god-1', name: 'Michael', provider: 'claude', cwd: home, isGod: true });
  await hive.ensureAgent({ id: 'worker-1', name: 'Creed', provider: 'claude', cwd: home });
  for (let i = 0; i < ARCHIVED; i++) {
    await hive.ensureAgent({ id: `temp-${i}`, name: `Temp ${i}`, provider: 'claude', cwd: home });
    hive.setArchived(`temp-${i}`, true);
  }
  const outboxOf = (id) => path.join(home, 'hive', 'agents', id, 'outbox');
  return { hive, outboxOf };
}

/** Count the outbox folders one routeOnce() looks at. */
function outboxesVisited(hive) {
  const original = fs.existsSync;
  let visits = 0;
  fs.existsSync = (p) => {
    if (typeof p === 'string' && path.basename(p) === 'outbox') visits++;
    return original(p);
  };
  try { hive.routeOnce(); } finally { fs.existsSync = original; }
  return visits;
}

function post(outbox, name, body) {
  fs.writeFileSync(path.join(outbox, name), JSON.stringify({ to: 'god', act: 'inform', subject: 's', body }), 'utf8');
}

test('an ordinary router tick skips archived agents\' outboxes', async (t) => {
  const { hive } = await floor(t);
  hive.routeOnce(); // first tick is a full sweep
  assert.equal(outboxesVisited(hive), 2, 'only god-1 and worker-1 are live');
});

test('a message left by an agent that was then archived is still routed on the next tick', async (t) => {
  const { hive, outboxOf } = await floor(t);
  hive.routeOnce();
  post(outboxOf('worker-1'), 'last-words.json', 'sent just before my tab closed');
  hive.setArchived('worker-1', true); // registry.json changes -> full sweep

  assert.equal(hive.routeOnce(), 1);
  assert.equal(hive.inbox('god-1').at(-1).body, 'sent just before my tab closed');
});

test('a late write into an archived outbox is routed by the periodic full sweep', async (t) => {
  const saved = HiveManager.ROUTER_FULL_SWEEP_EVERY;
  HiveManager.ROUTER_FULL_SWEEP_EVERY = 4;
  t.after(() => { HiveManager.ROUTER_FULL_SWEEP_EVERY = saved; });

  const { hive, outboxOf } = await floor(t);
  hive.routeOnce();
  post(outboxOf('temp-3'), 'late.json', 'written after archive');

  let routed = 0;
  for (let i = 0; i < HiveManager.ROUTER_FULL_SWEEP_EVERY; i++) routed += hive.routeOnce();
  assert.equal(routed, 1);
  assert.equal(hive.inbox('god-1').at(-1).body, 'written after archive');
  assert.equal(fs.existsSync(path.join(outboxOf('temp-3'), '.sent', 'late.json')), true);
});
