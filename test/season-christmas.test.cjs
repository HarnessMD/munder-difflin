'use strict';

/**
 * The Christmas season: a third pick beside Halloween and none. It goes
 * through Halloween's paths (design/season.ts, portraitArt's costumes,
 * seasonPlan.ts on the floor, the window layer), so these hold the rules
 * those paths promise: the stored values, who wears what, the face left
 * alone, where the floor props stand, and a snowfall that stays gentle.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const loadTs = require('./load-ts.cjs');

const { normalizeSeason, SEASONS, DEFAULT_SEASON } = loadTs('src/renderer/src/design/season.ts');
const art = loadTs('src/renderer/src/scene/office/portraitArt.ts');
const xmas = loadTs('src/renderer/src/scene/office/christmasCostumes.ts');
const halloween = loadTs('src/renderer/src/scene/office/costumes.ts');
const plan = loadTs('src/renderer/src/scene/office/seasonPlan.ts');
const snow = loadTs('src/renderer/src/components/season/snowPlan.ts');

const CAST = Object.keys(halloween.CAST_COSTUMES);

test('christmas is a season of its own; the default and a stored halloween are unchanged', () => {
  assert.deepEqual([...SEASONS], ['halloween', 'christmas', 'none']);
  assert.equal(DEFAULT_SEASON, 'none');
  assert.equal(normalizeSeason('christmas'), 'christmas');
  assert.equal(normalizeSeason('halloween'), 'halloween');
  assert.equal(normalizeSeason('none'), 'none');
  assert.equal(normalizeSeason(undefined), 'none');
  assert.equal(normalizeSeason('Christmas'), 'none', 'only the exact stored word');
  assert.equal(normalizeSeason('easter'), 'none');
});

test('every member of the cast has a Christmas costume, from the list', () => {
  for (const name of CAST) {
    const c = xmas.CAST_CHRISTMAS[name];
    assert.ok(c, `${name} has a Christmas costume`);
    assert.ok(xmas.CHRISTMAS_COSTUMES.includes(c), `${name}: ${c} is a known costume`);
  }
  const kinds = new Set(Object.values(xmas.CAST_CHRISTMAS));
  assert.ok(kinds.size >= 10, 'the cast is dressed in many costumes, not a few');
  for (const c of xmas.CHRISTMAS_POOL) assert.ok(xmas.CHRISTMAS_COSTUMES.includes(c));
});

test('the two seasons share no costume name, so the name alone picks the painter', () => {
  for (const c of xmas.CHRISTMAS_COSTUMES) assert.ok(!halloween.COSTUMES.includes(c), c);
  for (const c of halloween.COSTUMES) assert.equal(xmas.isChristmasCostume(c), false, c);
});

test('the season picks the wardrobe: christmas, halloween (true, as before) or none', () => {
  const r = art.resolveRecipe('michael');
  try {
    art.setCostumeOverride('christmas');
    assert.equal(art.costumeOf(r), 'santa');
    art.setCostumeOverride(true);
    assert.equal(art.costumeOf(r), 'vampire');
    art.setCostumeOverride('halloween');
    assert.equal(art.costumeOf(r), 'vampire');
    art.setCostumeOverride(false);
    assert.equal(art.costumeOf(r), null);
  } finally {
    art.setCostumeOverride(null);
  }
  assert.equal(art.costumeOf(r), null, 'no page, no override: the plain cast');
});

test('a custom recipe always draws the same Christmas costume from the pool', () => {
  const r = { ...art.resolveRecipe('jim'), c1: [10, 20, 30] };
  const a = xmas.christmasForRecipe(r);
  assert.equal(xmas.christmasForRecipe({ ...r }), a);
  assert.ok(xmas.CHRISTMAS_POOL.includes(a));
});

test('Christmas costumes leave the face alone (only the reindeer nose is on it)', () => {
  // Face: skin columns 4..13, brows to mouth, rows 6..16 (christmasCostumes.ts).
  const W = 18;
  const face = (buf) => {
    const out = [];
    for (let y = 6; y <= 16; y++) for (let x = 4; x <= 13; x++) {
      const i = (y * W + x) * 4;
      out.push(`${x},${y}:${buf[i]},${buf[i + 1]},${buf[i + 2]},${buf[i + 3]}`);
    }
    return out;
  };
  try {
    for (const name of CAST) {
      art.setCostumeOverride(false);
      const plain = face(art.portraitBuf(name));
      art.setCostumeOverride('christmas');
      const dressed = face(art.portraitBuf(name));
      const changed = dressed.filter((p, i) => p !== plain[i]).map((p) => p.split(':')[0]);
      const allowed = xmas.CAST_CHRISTMAS[name] === 'reindeer' ? ['8,12', '9,12'] : [];
      for (const px of changed) assert.ok(allowed.includes(px), `${name} (${xmas.CAST_CHRISTMAS[name]}) paints ${px} on the face`);
    }
  } finally {
    art.setCostumeOverride(null);
  }
});

test('every costume draws on the bust and on both sides of the walking figure', () => {
  try {
    art.setCostumeOverride('christmas');
    for (const name of CAST) {
      const bust = art.portraitBuf(name);
      assert.equal(bust.length, 18 * 28 * 4);
      const frames = art.sceneFrameBufs(name);
      assert.equal(frames.front.length, 3);
      assert.equal(frames.back.length, 3);
    }
  } finally {
    art.setCostumeOverride(null);
  }
});

// A small office: walls round the edge (two tiles deep at the top), one inner
// wall, a window on the top wall, two desks and a counter.
function office() {
  const width = 16, height = 10;
  const wall = (x, y) => x < 0 || y < 0 || x >= width || y >= height || y <= 1 || x === 0 || x === width - 1 || y === height - 1 || (x === 8 && y >= 5);
  return {
    width, height, tileSize: 32,
    wallAt: (x, y) => (wall(x, y) ? 7 : 0),
    isWalkable: (x, y) => !wall(x, y),
    desks: [{ x: 2, y: 3 }, { x: 4, y: 3 }, { x: 10, y: 3 }, { x: 12, y: 3 }],
    machineStand: { x: 11, y: 7 },
    sinkTile: { x: 13, y: 7 },
    avoid: [{ x: 2, y: 5 }],
    decorAt: (x, y) => y === 1 && x >= 5 && x <= 6,
  };
}

test('the floor plan: trees in room corners, gifts, lights along the walls, cocoa', () => {
  const input = office();
  const p = plan.planChristmas(input);
  assert.ok(p.trees.length >= 1 && p.trees.length <= plan.MAX_TREES);
  assert.ok(p.gifts.length >= 1 && p.gifts.length <= plan.MAX_DESK_GIFTS + plan.MAX_FLOOR_GIFTS);
  assert.ok(p.strands.length >= 1 && p.strands.length <= plan.MAX_STRANDS);
  const ts = input.tileSize;
  for (const t of p.trees) {
    const tx = Math.floor(t.x / ts), ty = Math.floor(t.y / ts);
    assert.ok(input.isWalkable(tx, ty), 'a tree stands on the floor');
    assert.equal(input.isWalkable(tx, ty + 1), false, 'against a wall below');
    for (const g of p.gifts) assert.ok(Math.floor(g.x / ts) !== tx || Math.floor(g.y / ts) !== ty, 'never a gift pile on a tree');
  }
  for (const s of p.strands) {
    assert.ok(s.x1 - s.x0 >= plan.MIN_STRAND_TILES * ts - 4, 'a strand spans at least two tiles');
    const y = Math.floor(s.y / ts);
    for (let x = Math.floor(s.x0 / ts); x <= Math.floor((s.x1 - 1) / ts); x++) {
      assert.notEqual(input.wallAt(x, y), 0, 'a strand hangs on a wall');
      assert.equal(input.wallAt(x, y + 1), 0, 'on the face right above the floor');
      assert.equal(input.decorAt(x, y), false, 'never across a window');
    }
  }
  assert.equal(Math.floor(p.cocoa.x / ts), 12, 'the cocoa sits where the candy bowl sits');
});

test('the floor plan is the same every time', () => {
  assert.deepEqual(plan.planChristmas(office()), plan.planChristmas(office()));
});

test('the snowfall is gentle, spread out and the same every launch', () => {
  const flakes = snow.planSnow();
  assert.equal(flakes.length, snow.FLAKE_COUNT);
  assert.ok(snow.FLAKE_COUNT <= 40, 'a few flakes, never a blizzard');
  for (const f of flakes) {
    assert.ok(f.left >= 0 && f.left <= 100);
    assert.ok(f.size >= snow.MIN_SIZE && f.size <= snow.MAX_SIZE);
    assert.ok(f.fall >= snow.MIN_FALL_S && f.fall <= snow.MAX_FALL_S, 'slow');
    assert.ok(f.opacity > 0 && f.opacity < 1);
    assert.ok(f.delay >= 0 && f.delay <= f.fall);
  }
  const halves = [flakes.filter((f) => f.left < 50).length, flakes.filter((f) => f.left >= 50).length];
  assert.ok(Math.abs(halves[0] - halves[1]) <= 2, 'both sides of the window get snow');
  assert.deepEqual(snow.planSnow(), flakes);
});
