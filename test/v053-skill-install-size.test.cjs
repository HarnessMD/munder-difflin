'use strict';

/**
 * 0.5.3, bug 9 (Jinbo, 13 Sep 2026): installing `canvas-design` was refused as
 * "larger than this installer will fetch". Measured on 20 Sep 2026 against
 * github.com/anthropics/skills: 83 files, 5.3 MB, 54 of them fonts. The caps
 * were 60 files and 2 MiB. Raising them alone would not have been a fix: every
 * file was read as UTF-8 text, so each font would have been written broken.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { planSkillInstall, installSkill, SKILL_INSTALL_LIMITS } = loadTs('src/main/skills.ts');
const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const file = (p, size) => ({ name: path.basename(p), path: p, type: 'file', size, download_url: `https://raw.example/${p}` });
const dir = (p) => ({ name: path.basename(p), path: p, type: 'dir' });
const lister = (dirs) => async (p) => {
  if (!(p in dirs)) throw new Error('Not Found (404)');
  return dirs[p];
};

/** canvas-design as it was on the day: SKILL.md, a licence, and a fonts folder
 *  of 81 files that add up to 5.3 MB. */
const BASE = 'skills/canvas-design';
const FONT_BYTES = 66_816;
const CANVAS = {
  [BASE]: [file(`${BASE}/SKILL.md`, 11_939), file(`${BASE}/LICENSE.txt`, 11_358), dir(`${BASE}/canvas-fonts`)],
  [`${BASE}/canvas-fonts`]: Array.from({ length: 81 }, (_, i) => file(`${BASE}/canvas-fonts/Face-${i}.ttf`, FONT_BYTES))
};
const OLD_LIMITS = { maxFiles: 60, maxTotalBytes: 2 * 1024 * 1024, maxFileBytes: Infinity, maxDepth: 5 };

test('the 0.5.2 caps refuse canvas-design, which is the report', async () => {
  const plan = await planSkillInstall(lister(CANVAS), BASE, OLD_LIMITS);
  assert.ok('error' in plan);
  assert.equal(plan.code, 'too-large');
});

test('the 0.5.3 caps take canvas-design whole, with paths relative to the skill folder', async () => {
  const plan = await planSkillInstall(lister(CANVAS), BASE);
  assert.ok(!('error' in plan), plan.error);
  assert.equal(plan.files.length, 83);
  assert.equal(plan.total, 11_939 + 11_358 + 81 * FONT_BYTES);
  assert.ok(plan.total > 5 * 1024 * 1024, 'the fixture is the size of the real thing');
  assert.deepEqual(plan.files.slice(0, 3).map((f) => f.path), ['SKILL.md', 'LICENSE.txt', 'canvas-fonts/Face-0.ttf']);
});

test('the caps are still caps, about three times the largest real skill, and each refusal carries its numbers', async () => {
  assert.ok(SKILL_INSTALL_LIMITS.maxTotalBytes >= 3 * 5.3 * 1024 * 1024 && SKILL_INSTALL_LIMITS.maxTotalBytes <= 32 * 1024 * 1024);
  assert.ok(SKILL_INSTALL_LIMITS.maxFiles >= 3 * 83 && SKILL_INSTALL_LIMITS.maxFiles <= 500);

  const many = { s: Array.from({ length: SKILL_INSTALL_LIMITS.maxFiles + 1 }, (_, i) => file(`s/f${i}.md`, 10)) };
  const tooMany = await planSkillInstall(lister(many), 's');
  assert.equal(tooMany.code, 'too-many-files');
  assert.deepEqual(tooMany.detail, { files: SKILL_INSTALL_LIMITS.maxFiles });

  const exactly = { s: many.s.slice(0, SKILL_INSTALL_LIMITS.maxFiles) };
  assert.ok(!('error' in await planSkillInstall(lister(exactly), 's')), 'the cap itself is allowed');

  const big = { s: Array.from({ length: 5 }, (_, i) => file(`s/f${i}.bin`, 3.9 * 1024 * 1024)) };
  const tooLarge = await planSkillInstall(lister(big), 's');
  assert.equal(tooLarge.code, 'too-large');
  assert.equal(tooLarge.detail.mb, '16.0');

  const oneHuge = await planSkillInstall(lister({ s: [file('s/video.mp4', 5 * 1024 * 1024)] }), 's');
  assert.equal(oneHuge.code, 'file-too-large');
  assert.equal(oneHuge.detail.name, 'video.mp4');
});

test('a symlink or a submodule entry is skipped and does not count against the file cap', async () => {
  const dirs = { s: [file('s/SKILL.md', 10), { name: 'link', path: 's/link', type: 'symlink', size: 0, download_url: null }] };
  const plan = await planSkillInstall(lister(dirs), 's');
  assert.equal(plan.files.length, 1);
});

test('an install writes the bytes it was given: a font survives, which UTF-8 decoding would break', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'md-skill-'));
  // Not valid UTF-8 anywhere: a text round trip turns each of these into EF BF BD.
  const font = Buffer.from([0x00, 0x01, 0x00, 0x00, 0xff, 0xfe, 0x80, 0xc3, 0x28, 0xf0, 0x90, 0x00]);
  const dirs = {
    [BASE]: [file(`${BASE}/SKILL.md`, 9), dir(`${BASE}/canvas-fonts`)],
    [`${BASE}/canvas-fonts`]: [file(`${BASE}/canvas-fonts/Face.ttf`, font.length)]
  };
  const asked = [];
  const res = await installSkill('https://github.com/anthropics/skills/tree/main/skills/canvas-design', 'canvas-design', {
    root,
    listDir: lister(dirs),
    fetchBytes: async (url, opts) => { asked.push([url, opts.maxBytes]); return url.endsWith('.ttf') ? font : Buffer.from('# canvas'); }
  });
  assert.deepEqual(res, { ok: true, path: path.join(root, 'canvas-design') });
  assert.deepEqual(fs.readFileSync(path.join(root, 'canvas-design', 'canvas-fonts', 'Face.ttf')), font);
  assert.notDeepEqual(Buffer.from(font.toString('utf8'), 'utf8'), font, 'the fixture really is one a text round trip breaks');
  assert.equal(asked.length, 2);
  assert.ok(asked.every(([, max]) => max === SKILL_INSTALL_LIMITS.maxFileBytes), 'each download is bounded by what arrives, not by what the listing said');
  fs.rmSync(root, { recursive: true, force: true });
});

test('a refusal leaves nothing behind and reaches the renderer with its code', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'md-skill-'));
  const res = await installSkill('https://github.com/x/y/tree/main/s', 's', {
    root, listDir: lister({ s: [file('s/video.mp4', 5 * 1024 * 1024)] }), fetchBytes: async () => { throw new Error('must not fetch'); }
  });
  assert.equal(res.ok, false);
  assert.equal(res.code, 'file-too-large');
  assert.deepEqual(fs.readdirSync(root), []);
  fs.rmSync(root, { recursive: true, force: true });
});

/* Two found at integration (Kevin, 20 Sep). Downloads run six at a time since
   this change, and both faults only exist because of that. */

test('one failed download leaves NOTHING behind, even though five others were still in flight', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'md-skill-'));
  const names = Array.from({ length: 12 }, (_, i) => `s/f${i}.md`);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const res = await installSkill('https://github.com/x/y/tree/main/s', 's', {
    root,
    listDir: lister({ s: names.map((n) => file(n, 4)) }),
    // The second file fails at once. Its neighbours are slow, so they land
    // AFTER the failure, which is when a cleanup that does not wait for them
    // deletes the folder and then watches them write it back.
    fetchBytes: async (url) => { if (url.endsWith('f1.md')) throw new Error('HTTP 503'); await wait(40); return Buffer.from('body'); }
  });
  assert.equal(res.ok, false);
  assert.match(res.error, /503/);
  await wait(200);   // anything still running has finished by now
  assert.deepEqual(fs.readdirSync(root), [], 'a half installed skill is on disk, and an agent would load it');
  fs.rmSync(root, { recursive: true, force: true });
});

test('the total cap holds against what ARRIVES, not only against sizes the listing declared', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'md-skill-'));
  // A listing that says every file is empty. Each file then arrives just under
  // the per file cap, so the per file check passes every time.
  const big = Buffer.alloc(SKILL_INSTALL_LIMITS.maxFileBytes - 1);
  const count = Math.ceil(SKILL_INSTALL_LIMITS.maxTotalBytes / big.length) + 2;
  const res = await installSkill('https://github.com/x/y/tree/main/s', 's', {
    root,
    listDir: lister({ s: Array.from({ length: count }, (_, i) => file(`s/f${i}.bin`, 0)) }),
    fetchBytes: async () => big
  });
  assert.equal(res.ok, false, `${count} files of ${big.length} bytes were installed under a ${SKILL_INSTALL_LIMITS.maxTotalBytes} byte cap`);
  assert.equal(res.code, 'too-large');
  assert.deepEqual(fs.readdirSync(root), []);
  fs.rmSync(root, { recursive: true, force: true });
});

test('the fetcher has a byte path, and text is that path decoded, not a second copy', () => {
  const src = read('src/main/fetchText.ts');
  assert.match(src, /export function getBytes\(/);
  assert.match(src, /return getBytes\(url, opts\)\.then\(\(b\) => b\.toString\('utf8'\)\);/);
  assert.equal([...src.matchAll(/setEncoding\('utf8'\)/g)].length, 0, 'nothing decodes on the socket any more');
  assert.match(read('src/main/skills.ts'), /const body = await fetchBytes\(files\[i\]\.url,/);
});

test('every refusal code has a sentence in every language, and all three screens use it', () => {
  const codes = ['too-many-files', 'too-large', 'file-too-large', 'too-deep'];
  for (const lng of ['en', 'zh-CN', 'ar']) {
    const refused = JSON.parse(read(`src/renderer/src/i18n/locales/${lng}.json`)).skillInstall.refused;
    assert.deepEqual(Object.keys(refused).sort(), [...codes].sort(), lng);
    assert.match(refused['too-large'], /\{\{mb\}\}/, `${lng} says the number`);
    assert.doesNotMatch(Object.values(refused).join(' '), /[–—]/, 'house style: no dashes');
  }
  for (const f of ['pro/SkillsSheet.tsx', 'pro/CapabilitiesScreen.tsx', 'SkillsTab.tsx']) {
    assert.match(read(`src/renderer/src/components/${f}`), /skillInstallError\(t, res, /, f);
  }
});
