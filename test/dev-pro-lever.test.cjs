'use strict';
/**
 * MD_DEV_PRO=1: the dev-only PRO lever (0.5.2, 9 Sep 2026).
 *
 * A second instance run beside a live office for testing needs PRO to test
 * PRO things, and both honest doors were ruled out for a throwaway profile:
 * enrolling on the live org writes production member rows, and redeeming a
 * real key binds it to a device that is deleted an hour later. The lever
 * answers the gate with a synthetic live licence in a DEV run only. These pins
 * hold the three properties that make it safe: it is dead when packaged, it
 * never sends anything to the licence server, and it lives behind one door.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const ROOT = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const src = read('src/main/soloLicense.ts');

test('1. the lever is read once, and only in a dev build', () => {
  assert.match(src, /const DEV_PRO = !app\.isPackaged && process\.env\.MD_DEV_PRO === '1';/);
  assert.equal((src.match(/MD_DEV_PRO/g) || []).length, 3, 'named in the constant, the comment and the device label, nowhere else in the file');
});

test('2. readLicense answers the synthetic licence before it touches the disk', () => {
  const body = src.slice(src.indexOf('export function readLicense()'));
  const first = body.indexOf('if (DEV_PRO) return devProLicense();');
  const disk = body.indexOf('existsSync(p)');
  assert.ok(first > 0 && first < disk, 'the lever answers before the file is looked at');
  // The synthetic view is live, labelled as the lever, and fresh on every read
  // so the staleness cap can never close it mid-test.
  assert.match(src, /state: 'healthy', renewsAt: null, deviceLabel: 'MD_DEV_PRO \(dev run\)', checkedAt: new Date\(\)\.toISOString\(\)/);
});

test('3. the synthetic key passes the key check and is one no console issues', () => {
  const { licenseFrom, checkLicense } = loadTs('src/shared/licenseKey.ts');
  const key = licenseFrom('0'.repeat(14));
  assert.equal(checkLicense(key).problem, null, 'a reader that validates the key must not refuse the view');
  assert.match(src, /const DEV_PRO_KEY = licenseFrom\('0'\.repeat\(14\)\);/);
});

test('4. the renewal question is never asked under the lever', () => {
  const body = src.slice(src.indexOf('export async function recheckLicense()'));
  const gate = body.indexOf("if (DEV_PRO) return 'confirmed';");
  const net = body.indexOf('fetch(');
  assert.ok(gate > 0 && gate < net, 'the early return sits before the fetch');
});

test('5. one door: no other source file reads the variable, and the changelog names it', () => {
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(e.name) ? [p] : [];
  });
  const readers = walk(path.join(ROOT, 'src')).filter((f) => read(path.relative(ROOT, f)).includes('MD_DEV_PRO'));
  assert.deepEqual(readers.map((f) => path.relative(ROOT, f)), ['src/main/soloLicense.ts']);
  assert.match(read('CHANGELOG.md'), /`MD_DEV_PRO=1`.*dev-only lever/);
});
