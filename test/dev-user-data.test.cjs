/**
 * MD_USER_DATA — the dev only userData override (founder, 5 Sep 2026: run a
 * fresh dev instance beside the packaged app to test a release locally).
 *
 * Three guarantees, all structural because the override runs in Electron's
 * main process which node:test cannot boot:
 *   1. It exists and reads MD_USER_DATA.
 *   2. It is gated on !app.isPackaged, so the packaged app can NEVER be moved
 *      off its real data by a stray environment variable.
 *   3. It runs BEFORE requestSingleInstanceLock, because the lock scopes to
 *      the userData path; an override after the lock would take the packaged
 *      app's lock and then write somewhere else.
 */
const test = require('node:test');
const assert = require('node:assert');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const src = readFileSync(join(__dirname, '..', 'src', 'main', 'index.ts'), 'utf8');

test('the override exists, dev gated, reading MD_USER_DATA', () => {
  assert.match(src, /if \(!app\.isPackaged && process\.env\.MD_USER_DATA\) \{\s*app\.setPath\('userData', process\.env\.MD_USER_DATA\);\s*\}/);
});

test('the override precedes the single instance lock', () => {
  const override = src.indexOf("app.setPath('userData', process.env.MD_USER_DATA)");
  const lock = src.indexOf('app.requestSingleInstanceLock()');
  assert.ok(override !== -1 && lock !== -1, 'both sites exist');
  assert.ok(override < lock, 'the lock must be taken on the overridden path, not before it');
});
