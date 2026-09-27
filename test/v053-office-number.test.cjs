'use strict';

/* 0.5.3 (founder, 25 Sep 2026): every floor is the same app, so the Dock shows
 * the same icon and name for each office. The main install is 1, a floor takes
 * the lowest free number from 2, and with more than one office open each one is
 * "Munder Difflin N" with N as its Dock badge. One office alone is unchanged.
 * The pure part is tested as plain node; the wiring in index.ts by text. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const {
  FLOOR_NUMBERS_FILE, readFloorNumbers, liveFloorNumbers, pickFloorNumber,
  claimFloorNumber, releaseFloorNumber, liveOfficeCount, officeLabel
} = loadTs('src/main/floorNumber.ts');

const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'md-office-'));

test('one office alone keeps the plain name and no badge', () => {
  assert.deepEqual(officeLabel(1, 1), { title: 'Munder Difflin', badge: '' });
  assert.deepEqual(officeLabel(1, 0), { title: 'Munder Difflin', badge: '' });
});

test('with two or more offices each one is numbered, the main install too', () => {
  assert.deepEqual(officeLabel(1, 2), { title: 'Munder Difflin 1', badge: '1' });
  assert.deepEqual(officeLabel(2, 2), { title: 'Munder Difflin 2', badge: '2' });
  assert.deepEqual(officeLabel(3, 3), { title: 'Munder Difflin 3', badge: '3' });
  assert.deepEqual(officeLabel(2, 1), { title: 'Munder Difflin 2', badge: '2' }, 'a floor is numbered even if the main install quit');
});

test('the main install is always 1; a floor takes the lowest free number from 2', () => {
  assert.equal(pickFloorNumber({}, { floor: false, dataDir: '/m' }), 1);
  assert.equal(pickFloorNumber({ 1: { pid: 1, dataDir: '/m' } }, { floor: true, dataDir: '/f/a' }), 2);
  const live = { 1: { pid: 1, dataDir: '/m' }, 2: { pid: 2, dataDir: '/f/a' }, 4: { pid: 4, dataDir: '/f/c' } };
  assert.equal(pickFloorNumber(live, { floor: true, dataDir: '/f/b' }), 3, 'a gap is reused');
  assert.equal(pickFloorNumber(live, { floor: true, dataDir: '/f/c' }), 4, 'a floor keeps the number it already holds');
});

test('a number whose process is gone is free again', () => {
  const alive = (pid) => pid !== 2;
  const live = liveFloorNumbers({ 1: { pid: 1, dataDir: '/m' }, 2: { pid: 2, dataDir: '/f/a' } }, alive);
  assert.deepEqual(Object.keys(live), ['1']);
  assert.equal(pickFloorNumber(live, { floor: true, dataDir: '/f/b' }), 2);
});

test('claim, count and release through the shared file', () => {
  const dir = tmp();
  const alive = () => true;
  assert.equal(claimFloorNumber(dir, { floor: false, dataDir: dir, pid: 100 }, alive), 1);
  assert.equal(liveOfficeCount(dir, alive), 1);
  assert.equal(claimFloorNumber(dir, { floor: true, dataDir: path.join(dir, 'floors/a'), pid: 200 }, alive), 2);
  assert.equal(claimFloorNumber(dir, { floor: true, dataDir: path.join(dir, 'floors/b'), pid: 300 }, alive), 3);
  assert.equal(liveOfficeCount(dir, alive), 3);
  releaseFloorNumber(dir, 200);
  assert.deepEqual(Object.keys(readFloorNumbers(dir)).sort(), ['1', '3']);
  assert.equal(claimFloorNumber(dir, { floor: true, dataDir: path.join(dir, 'floors/c'), pid: 400 }, alive), 2, 'the released number is reused');
  assert.ok(fs.existsSync(path.join(dir, FLOOR_NUMBERS_FILE)));
});

test('a torn or foreign file reads as empty and never throws', () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, FLOOR_NUMBERS_FILE), '{not json');
  assert.deepEqual(readFloorNumbers(dir), {});
  fs.writeFileSync(path.join(dir, FLOOR_NUMBERS_FILE), JSON.stringify({ x: 1, 2: { pid: 'no' }, 3: { pid: 9, dataDir: '/f' } }));
  assert.deepEqual(readFloorNumbers(dir), { 3: { pid: 9, dataDir: '/f' } });
  assert.equal(claimFloorNumber(path.join(dir, 'missing', 'deeper'), { floor: false, dataDir: '/m', pid: 1 }, () => true), 1, 'an unwritable folder still gets a number');
});

test('main labels every window and the Dock, keeps the page title off, and releases on quit', () => {
  const idx = read('src/main/index.ts');
  assert.match(idx, /claimFloorNumber\(sharedDataDir\(\), \{ floor: isFloorProcess\(\)/);
  assert.match(idx, /title: officeTitle\(\),/);
  assert.doesNotMatch(idx, /Munder Difflin — Floor/);
  assert.match(idx, /app\.dock\.setBadge\(badge\)/);
  assert.match(idx, /win\.on\('page-title-updated', \(e\) => \{ e\.preventDefault\(\); \}\)/);
  assert.match(idx, /releaseFloorNumber\(sharedDataDir\(\), process\.pid\)/);
  assert.match(idx, /if \(gotInstanceLock\) \{\n  app\.whenReady\(\)\.then\(\(\) => \{\n    officeNumber = claimFloorNumber/, 'a second launch that loses the instance lock never claims a number');
});
