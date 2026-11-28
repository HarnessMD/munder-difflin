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
const fs = require('node:fs');
const path = require('node:path');
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
    commonAreas: [{ x: 1, y: 4, width: 7, height: 5 }, { x: 9, y: 4, width: 6, height: 5 }],
    decorAt: (x, y) => y === 1 && x >= 5 && x <= 6,
  };
}

test('the floor plan: trees in the common areas, gifts, lights along the walls, cocoa', () => {
  const input = office();
  const p = plan.planChristmas(input);
  assert.ok(p.trees.length >= 1 && p.trees.length <= plan.MAX_TREES);
  assert.ok(p.gifts.length >= 1 && p.gifts.length <= plan.MAX_DESK_GIFTS + plan.MAX_FLOOR_GIFTS);
  assert.ok(p.strands.length >= 1 && p.strands.length <= plan.MAX_STRANDS);
  const ts = input.tileSize;
  for (const t of p.trees) {
    const tx = Math.floor(t.x / ts), ty = Math.floor(t.y / ts);
    assert.ok(input.isWalkable(tx, ty), 'a tree stands on the floor');
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

// The real office map and theme, read the way OfficeFloor.tsx reads them.
function realOffice() {
  const read = (p) => fs.readFileSync(path.join(__dirname, '../src/renderer/src', p), 'utf8');
  const map = JSON.parse(read('assets/maps/office.tmj'));
  const ts = map.tilewidth;
  const layer = (n) => map.layers.find((l) => l.name === n);
  const gid = (n, x, y) => (x < 0 || y < 0 || x >= map.width || y >= map.height ? 0 : layer(n).data[y * map.width + x] & 0x1fffffff);
  const tile = (o) => ({ x: Math.floor(o.x / ts), y: Math.floor(o.y / ts) });
  const spawns = new Map(layer('spawn-points').objects.map((o) => [o.name, tile(o)]));
  const seats = new Set([...spawns].filter(([n]) => /^(desk-|pc-|warroom-|entrance)/.test(n)).map(([, t]) => `${t.x},${t.y}`));
  const theme = read('scene/office/themeRegistry.ts');
  const stands = [...theme.matchAll(/(?:stand|trayStand|machineStand|sinkStand): \{ x: (\d+), y: (\d+) \}/gi)]
    .map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));
  const hall = theme.match(/\{ x: (\d+), y: (\d+), width: (\d+), height: (\d+) \},\s*\/\/ open floor/).slice(1).map(Number);
  const cafe = layer('zones').objects.find((o) => o.name === 'cafeteria');
  return {
    width: map.width, height: map.height, tileSize: ts,
    wallAt: (x, y) => gid('walls', x, y),
    isWalkable: (x, y) => x >= 0 && y >= 0 && x < map.width && y < map.height && (!gid('collision', x, y) || seats.has(`${x},${y}`)),
    decorAt: (x, y) => gid('furniture-below', x, y) !== 0 || gid('furniture-above', x, y) !== 0,
    desks: [],
    machineStand: { x: 26, y: 20 }, sinkTile: { x: 28, y: 18 },
    avoid: [...spawns.values(), ...stands],
    commonAreas: [
      { ...tile(cafe), width: cafe.width / ts, height: cafe.height / ts },
      { x: hall[0], y: hall[1], width: hall[2], height: hall[3] },
    ],
    bossOffice: (([, x, y, width, height]) => ({ x: +x, y: +y, width: +width, height: +height }))(
      theme.match(/bossOffice: \{ x: (\d+), y: (\d+), width: (\d+), height: (\d+) \}/)),
    bossSeat: spawns.get('desk-ceo'),
  };
}

test("on the office map: a tree in each common area and one in Michael's office, off the walkways and the pumpkin spots", () => {
  const input = realOffice();
  const ts = input.tileSize;
  assert.ok(input.avoid.length > 30, 'seats and stands were read');
  const trees = plan.planChristmas(input).trees.map((t) => ({ x: Math.floor(t.x / ts), y: Math.floor(t.y / ts) }));
  const areas = [...input.commonAreas, input.bossOffice];
  assert.equal(trees.length, areas.length);
  const inside = (t, a) => t.x >= a.x && t.x < a.x + a.width && t.y >= a.y && t.y < a.y + a.height;
  assert.ok(inside(input.bossSeat, input.bossOffice), "the office is the one with Michael's desk");
  assert.equal(trees.filter((t) => inside(t, input.bossOffice)).length, 1, "one tree in Michael's office");
  const walked = plan.walkedTiles(input);
  const pumpkins = plan.planHalloween(input).pumpkins.filter((p) => p.size === 'floor')
    .map((p) => `${Math.floor(p.x / ts)},${Math.floor((p.y - 1) / ts)}`);
  trees.forEach((t, i) => {
    const k = `${t.x},${t.y}`;
    assert.ok(inside(t, areas[i]), `${k} is in its area`);
    assert.ok(input.isWalkable(t.x, t.y) && !input.decorAt(t.x, t.y), `${k} is bare floor`);
    assert.ok(!walked.has(k), `${k} is on nobody's path`);
    assert.ok(!pumpkins.includes(k), `${k} is not a pumpkin spot`);
  });
  console.log('trees at', JSON.stringify(trees));
});

test('the floor plan is the same every time', () => {
  assert.deepEqual(plan.planChristmas(office()), plan.planChristmas(office()));
});

// Wall art for the office above, in map pixels: its walls filled solid.
function wallArt(input) {
  const ts = input.tileSize;
  const width = input.width * ts, height = input.height * ts;
  const pixels = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (input.wallAt(Math.floor(x / ts), Math.floor(y / ts))) pixels[(y * width + x) * 4 + 3] = 255;
  }
  return { pixels, width, height };
}

test('settled snow: on the wall tops and the back wall roof edge, planned for Christmas only', () => {
  const input = office();
  const ts = input.tileSize;
  let reads = 0;
  const art = wallArt(input);
  input.wallArt = () => { reads++; return art; };

  assert.equal('snow' in plan.planHalloween(input), false);
  assert.equal(reads, 0, 'Halloween never reads the wall art');

  const ledges = plan.planChristmas(input).snow;
  const has = (x0, x1, y) => ledges.some((l) => l.x0 === x0 && l.x1 === x1 && l.y === y);
  assert.ok(has(ts, 15 * ts, ts), "the back wall's roof edge, between the side walls");
  assert.ok(has(8 * ts, 9 * ts, 5 * ts), 'the top of the inner wall');
  assert.ok(has(ts, 8 * ts, 9 * ts), 'the top of the front wall');
  assert.equal(ledges.length, 4);
  assert.deepEqual(plan.planChristmas(office()).snow, [], 'no wall art, no snow line');
});

test('settled snow shows only while the season is Christmas', () => {
  const { Container } = require('pixi.js');
  const { ChristmasDecor } = loadTs('src/renderer/src/scene/office/ChristmasDecor.ts');
  const input = office();
  input.wallArt = () => wallArt(input);
  const root = new Container(), charLayer = new Container();
  root.addChild(charLayer);
  const snowLine = () => charLayer.children.find((c) => c.label === 'season-snow');

  // Off and Halloween build no Christmas decor (OfficeFloor.tsx dressForSeason).
  assert.equal(snowLine(), undefined);
  const floor = fs.readFileSync(path.join(__dirname, '..', 'src/renderer/src/scene/office/OfficeFloor.tsx'), 'utf8');
  assert.match(floor, /season === 'christmas' && !xmas\) xmas = new ChristmasDecor/);
  assert.match(floor, /xmas\?\.setOn\(season === 'christmas'\)/);

  const decor = new ChristmasDecor({
    plan: plan.planChristmas(input), mapWidth: 16 * 32, mapHeight: 10 * 32, charLayer, root, reducedMotion: false,
  });
  decor.setOn(true);
  assert.equal(snowLine().visible, true);
  assert.ok(snowLine().getLocalBounds().width > 0, 'something is drawn');
  decor.setOn(false); // the season turned to Off or Halloween
  assert.equal(snowLine().visible, false);
  decor.destroy();
  assert.equal(snowLine(), undefined);
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

const sleigh = loadTs('src/renderer/src/components/season/sleighPlan.ts');

test("santa's sleigh: three reindeer, Rudolph's red nose in front, as tall as a bat", () => {
  const team = sleigh.composeTeam();
  for (const g of [team.body, team.legsA, team.legsB]) {
    assert.equal(g.length, team.height);
    for (const row of g) assert.equal(row.length, team.width, 'every row the same width');
  }
  assert.ok(team.height * sleigh.PIXEL <= 24, 'the bat scale: about 22 px high');
  const all = [...team.body, ...team.legsA, ...team.legsB].join('');
  for (const ch of new Set(all.replace(/\./g, ''))) assert.ok(sleigh.PALETTE[ch], `${ch} has a colour`);
  const noses = team.body.flatMap((row, y) => [...row].map((c, x) => ({ c, x, y }))).filter((p) => p.c === 'n' || p.c === 'N');
  assert.equal(noses.length, sleigh.DEER_COUNT);
  assert.equal(sleigh.DEER_COUNT, 3);
  const front = noses.reduce((a, b) => (b.x > a.x ? b : a));
  assert.equal(front.c, 'N', 'the front nose is the red one');
  assert.equal(noses.filter((p) => p.c === 'N').length, 1, 'only Rudolph glows');
  assert.equal(sleigh.PALETTE.N, 'var(--cth-season-red)');
  assert.notDeepEqual(team.legsA, team.legsB, 'two leg frames to gallop');
  assert.ok(team.body.some((r) => r.includes('s')), 'Santa rides');
});

test("santa's sleigh flies now and then, along the top, never with reduced motion or a hidden window", () => {
  assert.ok(sleigh.SLEIGH_CROSS_SHARE <= 0.2, 'mostly quiet: it crosses, then is gone');
  assert.ok(sleigh.SLEIGH_LOOP_S * sleigh.SLEIGH_CROSS_SHARE >= 4, 'slow enough to see');
  const css = fs.readFileSync(path.join(__dirname, '..', 'src/renderer/src/components/christmas.css'), 'utf8');
  const fly = css.slice(css.indexOf('@keyframes cth-xm-sleigh-fly'));
  const block = fly.slice(0, fly.indexOf('\n}'));
  const ys = [...block.matchAll(/,\s*(\d+)px\)/g)].map((m) => Number(m[1]));
  assert.ok(ys.length >= 5);
  for (const y of ys) assert.ok(y >= 36 && y <= 48, `top ${y}px: under the top bar, above the panels' buttons`);
  assert.match(css, new RegExp(`cth-xm-sleigh-fly ${sleigh.SLEIGH_LOOP_S}s linear ${sleigh.SLEIGH_FIRST_S}s infinite`));
  assert.match(css, /data-cth-window='hidden'\] \.cth-xm \* \{ animation-play-state: paused/);
  assert.match(css, /prefers-reduced-motion: reduce\)\s*\{\s*\.cth-xm \{ display: none; \}/);
  assert.match(css, /\.cth-xm \{[^}]*pointer-events: none/);
  const layer = fs.readFileSync(path.join(__dirname, '..', 'src/renderer/src/components/ChristmasLayer.tsx'), 'utf8');
  assert.match(layer, /<Sleigh className="cth-xm-sleigh" \/>/);
});
