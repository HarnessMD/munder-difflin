'use strict';

// Custom avatars live in config.json under `avatars` and are written only
// through saveAvatar / deleteAvatar in main: the renderer holds a snapshot,
// and two windows may each save one, so every write is a read-modify-write
// against the file, never a replace-the-list from a stale copy.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'md-config-avatars-'));
const electron = require.resolve('electron');
require.cache[electron] = {
  id: electron,
  filename: electron,
  loaded: true,
  exports: { app: { getPath: () => userData } }
};

const { writeConfig, readConfig, onConfigWritten, saveAvatar, deleteAvatar } = loadTs('src/main/config.ts');
const { presetRecipe, MAX_CUSTOM_AVATARS, MAX_AVATAR_NAME } = loadTs('src/shared/avatars.ts');

test.after(() => fs.rmSync(userData, { recursive: true, force: true }));

writeConfig({});
readConfig();

test('saveAvatar without an id creates one: generated id, trimmed name, normalized recipe, both timestamps', () => {
  const cfg = saveAvatar({ name: '  Holly  Flax ', recipe: { ...presetRecipe(1), face: 'not-a-face' } });
  assert.equal(cfg.avatars.length, 1);
  const a = cfg.avatars[0];
  assert.match(a.id, /^[a-z0-9]{4,40}$/);
  assert.equal(a.name, 'Holly Flax');
  assert.equal(a.recipe.face, 'oval');
  assert.equal(a.createdAt, a.updatedAt);
  assert.deepEqual(readConfig().avatars, cfg.avatars, 'it is on disk, not just returned');
});

test('saveAvatar with an id updates that one in place and keeps its createdAt', () => {
  const before = readConfig().avatars[0];
  const cfg = saveAvatar({ id: before.id, name: 'Holly', recipe: { ...before.recipe, hair: 'styleAfro' } });
  assert.equal(cfg.avatars.length, 1);
  assert.equal(cfg.avatars[0].id, before.id);
  assert.equal(cfg.avatars[0].name, 'Holly');
  assert.equal(cfg.avatars[0].recipe.hair, 'styleAfro');
  assert.equal(cfg.avatars[0].createdAt, before.createdAt);
});

test('an unknown id, an undrawable recipe and a non-object are refused, and nothing is written', () => {
  const snapshot = JSON.stringify(readConfig().avatars);
  assert.throws(() => saveAvatar({ id: 'nope1234', name: 'x', recipe: presetRecipe(0) }), /unknown avatar/);
  assert.throws(() => saveAvatar({ name: 'x', recipe: { skin: 'light' } }), /invalid avatar/);
  assert.throws(() => saveAvatar('avatar'), /invalid avatar/);
  assert.equal(JSON.stringify(readConfig().avatars), snapshot);
});

test('an empty name becomes "Avatar"; a long one is cut to the limit', () => {
  const cfg = saveAvatar({ name: '', recipe: presetRecipe(2) });
  assert.equal(cfg.avatars.at(-1).name, 'Avatar');
  const cfg2 = saveAvatar({ name: 'y'.repeat(100), recipe: presetRecipe(3) });
  assert.equal(cfg2.avatars.at(-1).name.length, MAX_AVATAR_NAME);
});

test('deleteAvatar removes one and is idempotent; other avatars are untouched', () => {
  const list = readConfig().avatars;
  const victim = list[1].id;
  const cfg = deleteAvatar(victim);
  assert.equal(cfg.avatars.length, list.length - 1);
  assert.ok(!cfg.avatars.some((a) => a.id === victim));
  assert.equal(deleteAvatar(victim).avatars.length, list.length - 1);
  assert.throws(() => deleteAvatar(42), /invalid avatar id/);
});

test('the cap holds: the next create past MAX_CUSTOM_AVATARS is refused', () => {
  let n = readConfig().avatars.length;
  while (n < MAX_CUSTOM_AVATARS) { saveAvatar({ name: `n${n}`, recipe: presetRecipe(n % 24) }); n++; }
  assert.equal(readConfig().avatars.length, MAX_CUSTOM_AVATARS);
  assert.throws(() => saveAvatar({ name: 'one too many', recipe: presetRecipe(0) }), /avatar limit/);
  // an update is still allowed at the cap
  const first = readConfig().avatars[0];
  assert.equal(saveAvatar({ id: first.id, name: 'still fine', recipe: first.recipe }).avatars[0].name, 'still fine');
});

test('a save notifies config subscribers with the persisted config, so every window repaints', () => {
  const seen = [];
  const off = onConfigWritten((next) => seen.push(next));
  const cfg = deleteAvatar(readConfig().avatars[0].id);
  assert.ok(seen.length >= 1);
  assert.deepEqual(seen.at(-1).avatars, cfg.avatars);
  off();
});

test('a broken entry already on disk is dropped on the next write, never fatal', () => {
  const current = readConfig();
  fs.writeFileSync(path.join(userData, 'config.json'), JSON.stringify({ ...current, avatars: [{ id: 'bad id', name: 'x', recipe: {} }, ...current.avatars] }, null, 2));
  const cfg = saveAvatar({ id: current.avatars[0].id, name: 'kept', recipe: current.avatars[0].recipe });
  assert.ok(!cfg.avatars.some((a) => a.id === 'bad id'));
  assert.equal(cfg.avatars[0].name, 'kept');
});
