'use strict';

// The sprite editor grew the avatar recipe (src/shared/avatars.ts) and the
// painter that draws it (portraitArt.ts). The one thing that must not move is
// the shipped cast: fifteen characters people already recognise on their
// floor. The fixture holds SHA-256 hashes of every cast buffer as v0.4.8 drew
// them (the bust and the six walking frames), captured from the painter at
// pro/main de55c913 before this work touched it. If a drawing function
// changes a pixel of a cast member, this is the test that goes red.

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const loadTs = require('./load-ts.cjs');
const fixture = require('./fixtures/avatar-hashes-v0.4.8.json');

const P = loadTs('src/renderer/src/scene/office/portraitArt.ts');
const A = loadTs('src/shared/avatars.ts');
const R = loadTs('src/renderer/src/scene/office/castRoster.ts');
const REG = loadTs('src/renderer/src/scene/office/avatarRegistry.ts');

const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b.buffer, b.byteOffset, b.byteLength)).digest('hex');
const CAST = Object.keys(fixture.hashes);

test('the fixture covers the whole shipped cast, and nothing else', () => {
  assert.deepEqual(CAST.sort(), R.OFFICE_CAST.map((c) => c.name).sort());
  assert.deepEqual(Object.keys(P.CAST_RECIPES).sort(), CAST.sort());
});

test('every cast member renders byte for byte as v0.4.8 drew it: bust, three front frames, three back frames', () => {
  for (const name of CAST) {
    const pinned = fixture.hashes[name];
    assert.equal(sha(P.portraitBuf(name)), pinned.portrait, `${name}: portrait changed`);
    const frames = P.sceneFrameBufs(name);
    frames.front.forEach((b, i) => assert.equal(sha(b), pinned.front[i], `${name}: front frame ${i} changed`));
    frames.back.forEach((b, i) => assert.equal(sha(b), pinned.back[i], `${name}: back frame ${i} changed`));
  }
});

test('the pin can fail: one changed field changes the pixels', () => {
  const jim = P.CAST_RECIPES.jim;
  assert.notEqual(sha(P.portraitBufFor({ ...jim, nose: 'long' })), fixture.hashes.jim.portrait);
  assert.notEqual(sha(P.portraitBufFor({ ...jim, skin: 'deep' })), fixture.hashes.jim.portrait);
  assert.notEqual(sha(P.sceneFrameBufsFor({ ...jim, cloth: 'hoodie' }).front[0]), fixture.hashes.jim.front[0]);
});

test('every option the editor offers draws, front and back, without throwing and without an empty sprite', () => {
  const base = A.presetRecipe(0);
  const opaque = (b) => { let n = 0; for (let i = 3; i < b.length; i += 4) if (b[i] === 255) n++; return n; };
  let drawn = 0;
  const check = (r) => {
    assert.ok(opaque(P.portraitBufFor(r)) > 150, `sparse portrait for ${JSON.stringify(r)}`);
    const f = P.sceneFrameBufsFor(r);
    for (const b of [...f.front, ...f.back]) assert.ok(opaque(b) > 150, `sparse frame for ${JSON.stringify(r)}`);
    drawn++;
  };
  for (const skin of A.SKINS) check({ ...base, skin });
  for (const hair of A.HAIR_STYLES) check({ ...base, hair });
  for (const cloth of A.CLOTHS) check({ ...base, cloth, c2: [200, 200, 200], tie: [100, 20, 20] });
  for (const face of A.FACES) check({ ...base, face });
  for (const eyes of A.EYES) check({ ...base, eyes, eyec: [60, 90, 140] });
  for (const brow of A.BROWS) check({ ...base, brow });
  for (const nose of A.NOSES) check({ ...base, nose });
  for (const mouth of A.MOUTHS) check({ ...base, mouth, mouthc: [190, 40, 60] });
  for (const facial of A.FACIALS) check({ ...base, facial, glasses: true, blush: true });
  for (let i = 0; i < A.PRESET_COUNT; i++) check(A.presetRecipe(i));
  assert.ok(drawn >= 90);
});

test('presets come from seeds: the same index always gives the same recipe, and the wardrobes alternate', () => {
  for (let i = 0; i < A.PRESET_COUNT; i++) {
    assert.deepEqual(A.presetRecipe(i), A.presetRecipe(i));
    assert.equal(A.wardrobeOf(A.presetRecipe(i).cloth) === 'women' || A.GARMENTS_MEN.includes(A.presetRecipe(i).cloth), true);
  }
  assert.notDeepEqual(A.presetRecipe(0), A.presetRecipe(1));
  assert.equal(A.presetIndexOf('preset:3'), 3);
  assert.equal(A.presetIndexOf('preset:99'), null);
  assert.equal(A.presetIndexOf('preset:x'), null);
  assert.equal(A.presetIndexOf('michael'), null);
});

test('migrateRecipe fills the defaults, folds the legacy flags both ways, and is idempotent', () => {
  const heavyLashed = A.migrateRecipe({ skin: 'light', hair: 'styleBun', hairc: [1, 2, 3], cloth: 'blouse', c1: [4, 5, 6], heavy: true, lashes: true });
  assert.equal(heavyLashed.face, 'heavy');
  assert.equal(heavyLashed.eyes, 'lashed');
  const plain = A.migrateRecipe({ skin: 'light', hair: 'styleBun', hairc: [1, 2, 3], cloth: 'blouse', c1: [4, 5, 6], face: 'round', eyes: 'dot' });
  assert.equal(plain.heavy, false);
  assert.equal(plain.lashes, false);
  assert.equal(plain.brow, 'flat');
  assert.equal(plain.nose, 'normal');
  assert.equal(plain.mouth, 'neutral');
  assert.deepEqual(A.migrateRecipe(plain), plain);
});

test('recipeKey is content: field order and legacy spelling do not matter, a value does', () => {
  const a = { skin: 'tan', hair: 'styleShort', hairc: [1, 2, 3], cloth: 'suit', c1: [9, 9, 9], heavy: true };
  const b = { c1: [9, 9, 9], cloth: 'suit', face: 'heavy', hairc: [1, 2, 3], hair: 'styleShort', skin: 'tan' };
  assert.equal(A.recipeKey(a), A.recipeKey(b));
  assert.notEqual(A.recipeKey(a), A.recipeKey({ ...a, c1: [9, 9, 10] }));
});

test('normalizeRecipe rejects a recipe missing a load bearing field and drops unknown optional values', () => {
  assert.equal(A.normalizeRecipe(null), null);
  assert.equal(A.normalizeRecipe({ skin: 'light', hair: 'styleShort', cloth: 'suit' }), null); // no colours
  assert.equal(A.normalizeRecipe({ skin: 'green', hair: 'styleShort', hairc: [1, 1, 1], cloth: 'suit', c1: [1, 1, 1] }), null);
  assert.equal(A.normalizeRecipe({ skin: 'light', hair: 'styleShort', hairc: [1, 300, 1], cloth: 'suit', c1: [1, 1, 1] }), null, 'out of range is rejected, not clamped');
  const r = A.normalizeRecipe({
    skin: 'light', hair: 'styleShort', hairc: [1.4, 254.6, 0], cloth: 'suit', c1: [1, 1, 1],
    face: 'triangle', eyes: 'wide', brow: 42, mouth: 'smile', tie: 'red', glasses: 'yes', blush: true,
    hairargs: { part: 'X', length: 99, vol: 7, recede: 1 }
  });
  assert.ok(r);
  assert.deepEqual(r.hairc, [1, 255, 0]);
  assert.equal(r.face, 'oval');
  assert.equal(r.eyes, 'wide');
  assert.equal(r.brow, 'flat');
  assert.equal(r.tie, undefined);
  assert.equal(r.glasses, undefined);
  assert.equal(r.blush, true);
  assert.deepEqual(r.hairargs, { length: 31, vol: 3, recede: 1 });
});

test('normalizeCustomAvatar: a bad id or an empty name is rejected, timestamps are repaired, names are trimmed', () => {
  const recipe = A.presetRecipe(2);
  assert.equal(A.normalizeCustomAvatar({ id: 'has space', name: 'x', recipe }), null);
  assert.equal(A.normalizeCustomAvatar({ id: 'abcd1234', name: '   ', recipe }), null);
  const a = A.normalizeCustomAvatar({ id: 'abcd1234', name: '  Holly   Flax  ', recipe, createdAt: 'not a date' }, '2026-09-03T00:00:00.000Z');
  assert.ok(a);
  assert.equal(a.name, 'Holly Flax');
  assert.equal(a.createdAt, '2026-09-03T00:00:00.000Z');
  assert.equal(a.updatedAt, '2026-09-03T00:00:00.000Z');
  assert.equal(A.sanitizeAvatarName('x'.repeat(40)).length, A.MAX_AVATAR_NAME);
  assert.match(A.newCustomAvatarId(), /^[a-z0-9]{4,40}$/);
});

test('a custom character resolves through the registry; a deleted one falls back to Jim, like any unknown name', () => {
  const recipe = A.presetRecipe(5);
  REG.setCustomAvatars([{ id: 'abcd1234', name: 'Holly', recipe, createdAt: 'x', updatedAt: 'x' }, { id: 'bad id', name: 'Nope', recipe }]);
  assert.equal(REG.customAvatars().length, 1, 'the unusable entry is dropped, not fatal');
  assert.equal(sha(P.portraitBuf('custom:abcd1234')), sha(P.portraitBufFor(recipe)));
  assert.equal(R.castMemberFor('custom:abcd1234').displayName, 'Holly');
  assert.equal(R.castMemberFor('custom:abcd1234').shirt, A.rgbToHex(recipe.c1));
  assert.equal(R.castMemberFor('preset:4').displayName, 'Preset 5');
  assert.equal(R.castMemberFor('michael').displayName, 'Michael');
  assert.equal(sha(P.portraitBuf('preset:4')), sha(P.portraitBufFor(A.presetRecipe(4))));
  REG.setCustomAvatars([]);
  assert.equal(R.castMemberFor('custom:abcd1234'), undefined);
  assert.equal(sha(P.portraitBuf('custom:abcd1234')), fixture.hashes.jim.portrait);
  assert.equal(sha(P.portraitBuf('nobody')), fixture.hashes.jim.portrait);
});
