'use strict';

/* Review finding 5: two installs of ONE skill at the same time, and the one
 * that failed deletes the one that succeeded.
 *
 * Two screens can start an install (the classic Skills tab and the Pro sheet),
 * and main had no guard. `existsSync(dest)` was checked BEFORE the network walk,
 * so both passed it, both wrote into the same folder, and the failure path ran
 * `rmSync(dest)`, which is somebody else's finished install. The person is told
 * the skill is installed and it is not on disk. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { installSkill } = loadTs('src/main/skills.ts');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const file = (p, size = 4) => ({ name: p.split('/').pop(), path: p, type: 'file', size, download_url: `https://x/${p}` });
const URL_ = 'https://github.com/o/r/tree/main/skills/foo';
const listing = { 'skills/foo': [file('skills/foo/SKILL.md'), file('skills/foo/a.md'), file('skills/foo/b.md')] };
const listDir = async (p) => listing[p] ?? [];
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'md-skill-race-'));
/** Everything under root, as relative paths, files only. */
const tree = (root) => fs.readdirSync(root, { recursive: true }).map(String).filter((p) => fs.statSync(path.join(root, p)).isFile()).sort();

test('A succeeds, B fails later: A\'s finished install is still on disk', async () => {
  const root = tmp();
  const A = installSkill(URL_, 'foo', { root, listDir, fetchBytes: async () => Buffer.from('ok') });
  const B = installSkill(URL_, 'foo', { root, listDir, fetchBytes: async (u) => { await wait(50); if (u.endsWith('b.md')) throw new Error('HTTP 503'); return Buffer.from('ok'); } });
  const [a, b] = await Promise.all([A, B]);
  assert.equal(a.ok, true);
  assert.equal(b.ok, false);
  assert.deepEqual(tree(root), ['foo/SKILL.md', 'foo/a.md', 'foo/b.md'], 'the install that SUCCEEDED was deleted by the one that failed');
  fs.rmSync(root, { recursive: true, force: true });
});

test('B fails FIRST while A is still writing: A ends whole, never partial', async () => {
  const root = tmp();
  const A = installSkill(URL_, 'foo', { root, listDir, fetchBytes: async () => { await wait(80); return Buffer.from('ok'); } });
  const B = installSkill(URL_, 'foo', { root, listDir, fetchBytes: async (u) => { await wait(10); if (u.endsWith('a.md')) throw new Error('HTTP 503'); return Buffer.from('ok'); } });
  const [a, b] = await Promise.all([A, B]);
  assert.equal(a.ok, true);
  assert.equal(b.ok, false);
  assert.deepEqual(tree(root), ['foo/SKILL.md', 'foo/a.md', 'foo/b.md']);
  fs.rmSync(root, { recursive: true, force: true });
});

test('both succeed: one installs, the other is told it is already there, and the folder is whole', async () => {
  const root = tmp();
  const go = () => installSkill(URL_, 'foo', { root, listDir, fetchBytes: async () => { await wait(20); return Buffer.from('ok'); } });
  const results = await Promise.all([go(), go()]);
  assert.equal(results.filter((r) => r.ok).length, 1, JSON.stringify(results));
  assert.match(results.find((r) => !r.ok).error, /already install/i);
  assert.deepEqual(tree(root), ['foo/SKILL.md', 'foo/a.md', 'foo/b.md']);
  fs.rmSync(root, { recursive: true, force: true });
});

test('while it downloads, NOTHING an agent would load exists under the skill\'s own name', async () => {
  // A half written skill under its real name is a skill an agent loads. Nothing
  // may appear there until every file has arrived.
  const root = tmp();
  let seenPartial = false;
  const A = installSkill(URL_, 'foo', { root, listDir, fetchBytes: async () => { await wait(30); if (fs.existsSync(path.join(root, 'foo'))) seenPartial = true; return Buffer.from('ok'); } });
  assert.equal((await A).ok, true);
  assert.equal(seenPartial, false, 'the real folder existed while files were still arriving');
  fs.rmSync(root, { recursive: true, force: true });
});

test('a failure leaves no staging folder behind either', async () => {
  const root = tmp();
  const r = await installSkill(URL_, 'foo', { root, listDir, fetchBytes: async (u) => { if (u.endsWith('b.md')) throw new Error('HTTP 503'); return Buffer.from('ok'); } });
  assert.equal(r.ok, false);
  await wait(50);
  assert.deepEqual(tree(root), [], `left behind: ${JSON.stringify(fs.readdirSync(root, { recursive: true }))}`);
  fs.rmSync(root, { recursive: true, force: true });
});
