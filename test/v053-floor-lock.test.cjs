'use strict';

/* 0.5.3, B23 part 2 (Creed, 23 Sep 2026): one floor per hive. The lock file
 * under <hive>/.floor-lock names the holder's pid and userData; a live other
 * floor is refused, a dead one is cleared, our own is replaced, and the New
 * Floor picker's checks (B21) refuse this floor's own hive, a held hive and
 * this floor's own data folder. Pure node: the pid check is injected, so a
 * "live" and a "dead" holder are whatever the test says they are. Red on
 * aabd05fe: src/main/floorLock.ts does not exist. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const {
  FLOOR_LOCK_FILE, floorLockPath, readFloorLock, checkFloorLock, acquireFloorLock, releaseFloorLock,
  describeFloorLock, validateFloorRequest, probeFloor, pidAlive, normaliseHome, samePath
} = loadTs('src/main/floorLock.ts');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'md-floor-lock-'));
test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));

const home = (name) => { const h = path.join(tmp, name); fs.mkdirSync(h, { recursive: true }); return h; };
const hiveOf = (h) => path.join(h, 'hive');
const alive = new Set();
const isAlive = (pid) => alive.has(pid);
const me = { pid: 4242, userData: path.join(tmp, 'data-me'), version: '0.5.3' };
const other = { pid: 9999, userData: path.join(tmp, 'data-other'), version: '0.5.3' };

test('a free hive is taken, the file names the holder, and the holder reads it back as its own', () => {
  const hive = hiveOf(home('a'));
  const r = acquireFloorLock(hive, me, { isAlive });
  assert.equal(r.ok, true);
  assert.equal(fs.existsSync(path.join(hive, FLOOR_LOCK_FILE)), true, 'the hive folder is made if needed');
  const on = readFloorLock(hive);
  assert.equal(on.pid, 4242);
  assert.equal(on.userData, normaliseHome(me.userData));
  assert.match(on.since, /^\d{4}-\d{2}-\d{2}T/);
  assert.deepEqual(checkFloorLock(hive, me, { isAlive }).state, 'mine');
  // Taking it again (a relaunch of this install) replaces it, no refusal.
  const again = acquireFloorLock(hive, { ...me, pid: 4343 }, { isAlive });
  assert.equal(again.ok, true);
  assert.equal(readFloorLock(hive).pid, 4343);
  assert.match(describeFloorLock(readFloorLock(hive)), /pid 4343, app 0\.5\.3, data /);
});

test('a live other floor holds the hive: refused, the file untouched; a dead one is stale and cleared', () => {
  const hive = hiveOf(home('b'));
  alive.add(other.pid);
  assert.equal(acquireFloorLock(hive, other, { isAlive }).ok, true);
  const r = acquireFloorLock(hive, me, { isAlive });
  assert.equal(r.ok, false);
  assert.equal(r.error, 'held');
  assert.equal(r.lock.pid, other.pid);
  assert.equal(readFloorLock(hive).pid, other.pid, 'the holder\'s file is left alone');
  assert.equal(checkFloorLock(hive, me, { isAlive }).state, 'held');
  // The other floor dies without cleaning up.
  alive.delete(other.pid);
  assert.equal(checkFloorLock(hive, me, { isAlive }).state, 'stale');
  const taken = acquireFloorLock(hive, me, { isAlive });
  assert.equal(taken.ok, true);
  assert.equal(taken.cleared.pid, other.pid, 'the stale lock is reported for the log');
  assert.equal(readFloorLock(hive).pid, me.pid);
});

test('the userData is the identity: our own lock with a live pid that is not ours is still ours', () => {
  // app.exit() fires no quit event, so a relaunch of this install finds its
  // previous lock, sometimes with the old process still winding down.
  const hive = hiveOf(home('c'));
  alive.add(777);
  fs.mkdirSync(hive, { recursive: true });
  fs.writeFileSync(floorLockPath(hive), JSON.stringify({ pid: 777, userData: me.userData, since: 'x' }));
  assert.equal(checkFloorLock(hive, { pid: 778, userData: me.userData }, { isAlive }).state, 'mine');
  assert.equal(acquireFloorLock(hive, { pid: 778, userData: me.userData }, { isAlive }).ok, true);
  assert.equal(readFloorLock(hive).pid, 778);
});

test('an unreadable lock file is replaced, not a refusal', () => {
  const hive = hiveOf(home('d'));
  fs.mkdirSync(hive, { recursive: true });
  fs.writeFileSync(floorLockPath(hive), '{not json');
  assert.equal(checkFloorLock(hive, me, { isAlive }).state, 'unreadable');
  assert.equal(acquireFloorLock(hive, me, { isAlive }).ok, true);
  fs.writeFileSync(floorLockPath(hive), JSON.stringify({ pid: 'x' }));
  assert.equal(checkFloorLock(hive, me, { isAlive }).state, 'unreadable');
});

test('release removes our lock only; another floor\'s lock is never touched', () => {
  const hive = hiveOf(home('e'));
  acquireFloorLock(hive, me, { isAlive });
  assert.equal(releaseFloorLock(hive, me), true);
  assert.equal(fs.existsSync(floorLockPath(hive)), false);
  assert.equal(releaseFloorLock(hive, me), false, 'nothing to release');
  alive.add(other.pid);
  acquireFloorLock(hive, other, { isAlive });
  assert.equal(releaseFloorLock(hive, me), false);
  assert.equal(readFloorLock(hive).pid, other.pid);
  alive.delete(other.pid);
});

test('two floors racing for one free hive: exactly one wins, the other is told who holds it', () => {
  // The file is created with wx (exclusive): the second create fails with
  // EEXIST and reads the winner. Simulated by a lock that appears between the
  // loser's check and its create.
  const hive = hiveOf(home('f'));
  fs.mkdirSync(hive, { recursive: true });
  alive.add(other.pid);
  let landed = 0;
  // `me` reads a free hive; in the gap before its exclusive create the other floor lands its file.
  const onFree = () => { landed++; fs.writeFileSync(floorLockPath(hive), JSON.stringify({ pid: other.pid, userData: other.userData, since: 'now' })); };
  const r = acquireFloorLock(hive, me, { isAlive, onFree });
  assert.equal(landed, 1);
  assert.equal(r.ok, false);
  assert.equal(r.error, 'held');
  assert.equal(r.lock.pid, other.pid);
  assert.equal(readFloorLock(hive).pid, other.pid, 'the winner\'s file stands');
  // The same gap with a floor that dies at once: cleared on the retry, and `me` wins.
  fs.unlinkSync(floorLockPath(hive));
  const r2 = acquireFloorLock(hive, me, { isAlive, onFree: () => fs.writeFileSync(floorLockPath(hive), JSON.stringify({ pid: 31337, userData: other.userData, since: 'now' })) });
  assert.equal(r2.ok, true);
  assert.equal(r2.cleared.pid, 31337);
  alive.delete(other.pid);
});

test('the picker\'s checks: this floor\'s own hive, a held hive, and this floor\'s own data folder are refused; a free or stale one passes', () => {
  const current = home('g-current');
  const free = home('g-free');
  const held = home('g-held');
  const stale = home('g-stale');
  alive.add(other.pid);
  acquireFloorLock(hiveOf(held), other, { isAlive });
  acquireFloorLock(hiveOf(stale), { ...other, pid: 31337 }, { isAlive }); // 31337 is not alive
  const ctx = { currentHome: current, userData: me.userData, hiveRootOf: hiveOf };
  assert.deepEqual(validateFloorRequest({ harnessHome: current }, ctx, { isAlive }), { ok: false, refusal: 'current' });
  assert.deepEqual(validateFloorRequest({ harnessHome: current + path.sep }, ctx, { isAlive }), { ok: false, refusal: 'current' }, 'a trailing separator is the same folder');
  const h = validateFloorRequest({ harnessHome: held }, ctx, { isAlive });
  assert.equal(h.ok, false);
  assert.equal(h.refusal, 'held');
  assert.equal(h.lock.pid, other.pid);
  assert.deepEqual(validateFloorRequest({ harnessHome: free, dataDir: me.userData }, ctx, { isAlive }), { ok: false, refusal: 'same-data-dir' });
  assert.equal(validateFloorRequest({ harnessHome: free, dataDir: path.dirname(me.userData) }, ctx, { isAlive }).refusal, 'same-data-dir', 'a data folder that contains this floor\'s own');
  assert.equal(validateFloorRequest({ harnessHome: free, dataDir: path.join(me.userData, 'floors', 'x') }, ctx, { isAlive }).ok, true, 'floors/<id>/ under the parent is the design');
  assert.deepEqual(validateFloorRequest({ harnessHome: '' }, ctx, { isAlive }), { ok: false, refusal: 'invalid', detail: 'no folder' });
  assert.deepEqual(validateFloorRequest({ harnessHome: free }, ctx, { isAlive }), { ok: true, harnessHome: normaliseHome(free) });
  assert.equal(validateFloorRequest({ harnessHome: stale }, ctx, { isAlive }).ok, true, 'a dead holder is not a refusal; the new floor clears it');
  // A folder whose lock names OUR userData is ours, so it is "current" too.
  const mine = home('g-mine');
  acquireFloorLock(hiveOf(mine), me, { isAlive });
  assert.equal(validateFloorRequest({ harnessHome: mine }, ctx, { isAlive }).refusal, 'current');
  // Before onboarding there is no current home, and nothing is refused for it.
  assert.equal(validateFloorRequest({ harnessHome: current }, { ...ctx, currentHome: null }, { isAlive }).ok, true);
  // The list the picker draws.
  assert.equal(probeFloor(current, ctx, { isAlive }).state, 'current');
  assert.equal(probeFloor(held, ctx, { isAlive }).state, 'held');
  assert.equal(probeFloor(free, ctx, { isAlive }).state, 'free');
  assert.equal(probeFloor(stale, ctx, { isAlive }).state, 'free');
  assert.equal(probeFloor(path.join(tmp, 'never-made'), ctx, { isAlive }).state, 'missing');
  alive.delete(other.pid);
});

test('paths: tilde and trailing separators compare equal; the real pid check says this process is alive and a dead pid is not', () => {
  assert.equal(normaliseHome('~/x'), path.join(os.homedir(), 'x'));
  assert.equal(samePath('/a/b/', '/a/b'), true);
  assert.equal(pidAlive(process.pid), true);
  assert.equal(pidAlive(0), false);
  assert.equal(pidAlive(-1), false);
  // A pid no process can have on this OS. pid_max is 99998 on macOS and
  // 4194304 at most on Linux; 2147483646 is above both.
  assert.equal(pidAlive(2147483646), false);
});
