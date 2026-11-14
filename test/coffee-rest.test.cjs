'use strict';

// After a coffee break an agent rests three to five minutes before the cafe may take it again,
// so a lone idle agent no longer walks to coffee and back without end. Errands are unchanged.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const loadTs = require(path.join(ROOT, 'test/load-ts.cjs'));
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const C = loadTs('src/renderer/src/scene/office/coffeeGap.ts');

const rt = (extra = {}, sitting = false) => ({ character: { isSitting: () => sitting }, ...extra });
const idle = { status: 'idle' };

test('free for a break: idle or done, not the orchestrator, on no other trip, not seated', () => {
  assert.equal(C.breakEligible(idle, rt()), true);
  assert.equal(C.breakEligible({ status: 'success' }, rt()), true);
  assert.equal(C.breakEligible({ status: 'working' }, rt()), false);
  assert.equal(C.breakEligible({ status: 'idle', isGod: true }, rt()), false);
  for (const k of ['brk', 'err', 'run', 'cupCarryHome']) assert.equal(C.breakEligible(idle, rt({ [k]: true })), false, k);
  assert.equal(C.breakEligible(idle, rt({}, true)), false, 'already at a desk');
});

test('the rest: 180 to 300 seconds, counted down each frame, never below zero; the cafe waits for it', () => {
  assert.deepEqual([...C.COFFEE_GAP_S], [180, 300]);
  const r = rt();
  C.startCoffeeRest(r, () => 0);
  assert.equal(r.coffeeRest, 180);
  C.startCoffeeRest(r, () => 0.5);
  assert.equal(r.coffeeRest, 240);
  C.startCoffeeRest(r, () => 0.999);
  assert.ok(r.coffeeRest < 300 && r.coffeeRest > 299);
  const before = r.coffeeRest;
  C.tickCoffeeRest(r, 99.5);
  assert.ok(Math.abs(r.coffeeRest - (before - 99.5)) < 1e-9);
  C.tickCoffeeRest(r, 1000);
  assert.equal(r.coffeeRest, 0);
  const none = rt();
  C.tickCoffeeRest(none, 5);
  assert.equal(none.coffeeRest, undefined);

  const lone = rt();
  C.startCoffeeRest(lone, () => 0);
  let s = 0;
  while (!C.cafeEligible(idle, lone)) { C.tickCoffeeRest(lone, 1); s++; assert.equal(C.breakEligible(idle, lone), true, 'errands may still take it'); }
  assert.equal(s, 180, 'a lone idle agent goes back for coffee only after its rest');
  assert.equal(C.cafeEligible(idle, rt({ coffeeRest: 0 })), true);
  assert.equal(C.cafeEligible({ status: 'working' }, rt()), false);
});

test('wiring: a break that ends or is cut short starts the rest; every agent rests down each frame; the cafe picks by cafeEligible', () => {
  const floor = read('src/renderer/src/scene/office/OfficeFloor.tsx');
  assert.match(floor, /import \{ breakEligible, cafeEligible, startCoffeeRest, tickCoffeeRest \} from '\.\/coffeeGap';/);
  assert.match(floor, /const releaseBreak = \(rt: Runtime\): void => \{\s*if \(!rt\.brk\) return;\s*startCoffeeRest\(rt\);/);
  assert.match(floor, /for \(const \[id, rt\] of runtimes\) \{\s*tickCoffeeRest\(rt, dt\);\s*const b = rt\.brk;\s*if \(!b\) continue;/, 'ticked before the no-break skip, so every agent rests down');
  assert.match(floor, /if \(rt && cafeEligible\(agent, rt\)\) candidates\.push\(\[agent, rt\]\);/);
  assert.match(floor, /if \(r && breakEligible\(a, r\)\) candidates\.push\(\[a, r\]\);/, 'errands keep the plain rule');
  assert.doesNotMatch(floor, /const breakEligible = /, 'one rule, in coffeeGap.ts');
});
