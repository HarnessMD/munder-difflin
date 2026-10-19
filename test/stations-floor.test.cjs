'use strict';

// The second floor: a theme pack is data only (theme.json, a Tiled map, tilesets, a crew sheet,
// crew lines) bundled from themes/<id> and drawn by the stations floor. OfficeFloor dispatches: a
// usable stations pack draws StationFloor, anything else draws the office as before, and a pack
// that cannot load shows the office with one line over it (reasons to the console). No colour
// override block, no liveness feed yet, and the art carries its credit everywhere it ships.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const ROOT = path.join(__dirname, '..');
const loadTs = require(path.join(ROOT, 'test/load-ts.cjs'));
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const TH = 'src/renderer/src/scene/themes/';
const PACK = path.join(ROOT, 'themes/starhike');
const packs = loadTs(TH + 'packs.ts');
const manifest = loadTs(TH + 'manifest.ts');
const tiled = loadTs(TH + 'tiled.ts');
const framing = loadTs(TH + 'framing.ts');
const bubble = loadTs(TH + 'bubbleModel.ts');
const seats = loadTs(TH + 'seatAllocator.ts');
const crewMod = loadTs(TH + 'crew.ts');
const activity = loadTs('src/shared/activityView.ts');

// The pack's own files, as the bundler hands them over: text for text, null for a picture.
function packEntries(dir = PACK) {
  const out = {};
  const walk = (d, rel) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(path.join(d, e.name), r);
      else out[r] = e.name.endsWith('.png') ? null : fs.readFileSync(path.join(d, e.name), 'utf8');
    }
  };
  walk(dir, '');
  return out;
}

// A plain PNG reader (8 bit RGBA, not interlaced: what the pack ships), standing in for the
// browser's image decode.
function decodePng(file) {
  const b = fs.readFileSync(file);
  let p = 8, w = 0, h = 0;
  const idat = [];
  while (p < b.length) {
    const len = b.readUInt32BE(p), type = b.toString('ascii', p + 4, p + 8), body = b.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') {
      w = body.readUInt32BE(0); h = body.readUInt32BE(4);
      assert.deepEqual([body[8], body[9], body[12]], [8, 6, 0], `${path.basename(file)} is 8 bit RGBA, not interlaced`);
    } else if (type === 'IDAT') idat.push(body);
    p += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const out = new Uint8ClampedArray(w * h * 4), stride = w * 4;
  for (let y = 0; y < h; y += 1) {
    const f = raw[y * (stride + 1)], row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x += 1) {
      const a = x >= 4 ? out[y * stride + x - 4] : 0, up = y ? out[(y - 1) * stride + x] : 0, c = x >= 4 && y ? out[(y - 1) * stride + x - 4] : 0;
      const pa = Math.abs(up - c), pb = Math.abs(a - c), pc = Math.abs(a + up - 2 * c);
      const pred = [0, a, up, (a + up) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? up : c][f];
      out[y * stride + x] = (row[x] + pred) & 255;
    }
  }
  return { width: w, height: h, data: out };
}

function loadStarHike(entries = packEntries(), dropPicture = null) {
  const r = packs.readPack(packs.memoryFiles(entries));
  if (!r.value) return { read: r, done: null };
  const store = new Map();
  for (const p of r.value.images) if (p !== dropPicture) store.set(p, decodePng(path.join(PACK, p)));
  return { read: r, done: packs.finishPack(r.value, store, r.diagnostics) };
}

const errors = (d) => d.filter((x) => x.level === 'error');

// ─── the pack ───────────────────────────────────────────────────────────────

test('Star Hike loads end to end: manifest, map, pictures, sheet and a scene with seats; no error, no warning', () => {
  const { read: r, done } = loadStarHike();
  assert.deepEqual(r.diagnostics.filter((d) => d.level !== 'info'), [], 'reading the pack says nothing is wrong');
  assert.ok(done && done.value, 'the pack is usable: ' + JSON.stringify(done && errors(done.diagnostics)));
  const P = done.value;
  assert.equal(P.manifest.id, 'starhike');
  assert.equal(P.manifest.label, 'Star Hike');
  assert.equal(P.manifest.sceneKind, 'stations');
  assert.deepEqual([P.map.width, P.map.height, P.map.tw, P.map.th], [30, 20, 32, 32]);
  assert.deepEqual(P.images.slice().sort(), ['art/bridge-decor.png', 'art/bridge-floor.png', 'art/bridge-walls.png', 'art/crew.png']);
  assert.equal(P.sheet, 'art/crew.png');
  assert.ok(P.scene.seatOrder.length >= 6, `seats: ${P.scene.seatOrder.length}`);
  assert.deepEqual(errors(P.diagnostics), []);
  assert.ok(P.lines && Object.keys(P.lines).length > 0, 'the crew lines are read');
  assert.equal('uiTokens' in P.manifest, false);
});

test('the catalogue offers Star Hike with its credit; a second pack with the same id or the office id is refused', () => {
  const files = packs.memoryFiles(packEntries());
  const res = packs.catalogue([{ dir: 'starhike', files }]);
  assert.deepEqual(res.rejected, []);
  assert.equal(res.packs.length, 1);
  const s = res.packs[0];
  assert.deepEqual([s.id, s.label, s.sceneKind, s.dir], ['starhike', 'Star Hike', 'stations', 'starhike']);
  assert.deepEqual(s.credit, { text: 'Artwork by Prozzta', url: 'https://github.com/Prozzta/guppyos' });
  assert.equal('uiTokens' in s, false, 'no colour override block reaches the picker');

  const twin = packs.catalogue([{ dir: 'b-copy', files }, { dir: 'starhike', files }]);
  assert.deepEqual(twin.packs.map((p) => p.dir), ['b-copy'], 'folders in name order, the first id wins');
  assert.deepEqual(twin.rejected.map((r) => r.dir), ['starhike']);
  assert.match(twin.rejected[0].diagnostics[0].message, /already used/);

  const asOffice = packEntries();
  asOffice['theme.json'] = JSON.stringify({ ...JSON.parse(asOffice['theme.json']), id: 'office' });
  const o = packs.catalogue([{ dir: 'x', files: packs.memoryFiles(asOffice) }]);
  assert.deepEqual([o.packs.length, o.rejected.length], [0, 1], 'a pack cannot replace the built-in office');
  assert.equal(packs.readPack(packs.memoryFiles(asOffice)).value, null);
});

test('a colour override block in a pack is an unknown key: ignored with a warning, the pack still loads', () => {
  const raw = JSON.parse(read('themes/starhike/theme.json'));
  const v = manifest.validateManifest({ ...raw, uiTokens: { light: { accent: '#ff0000' }, dark: {} } }, 'starhike');
  assert.ok(v.manifest, 'still usable');
  assert.equal('uiTokens' in v.manifest, false);
  assert.deepEqual(v.diagnostics.map((d) => [d.level, d.message]), [['warn', 'starhike/theme.json: unknown key "uiTokens" is ignored']]);
  const src = read(TH + 'manifest.ts');
  assert.doesNotMatch(src, /uiTokens|UiToken/, 'the manifest knows no colour overrides');
});

test('a pack that cannot be used is a list of reasons, never a throw', () => {
  const entries = packEntries();
  const missing = loadStarHike(entries, 'art/bridge-floor.png').done;
  assert.equal(missing.value, null);
  assert.ok(errors(missing.diagnostics).some((d) => d.message === 'The picture "art/bridge-floor.png" could not be decoded.'));

  const bad = { ...entries, 'theme.json': '{ "schema": 1,' };
  const r = packs.readPack(packs.memoryFiles(bad));
  assert.equal(r.value, null);
  assert.match(r.diagnostics[0].message, /^theme\.json is not valid JSON/);

  const noMap = { ...entries };
  delete noMap['map/star-hike-bridge.tmx'];
  assert.ok(errors(packs.readPack(packs.memoryFiles(noMap)).diagnostics).some((d) => /The map "map\/star-hike-bridge\.tmx" is not in the pack/.test(d.message)));

  const climb = { ...entries, 'theme.json': JSON.stringify({ ...JSON.parse(entries['theme.json']), map: '../other/map.tmx' }) };
  assert.equal(packs.readPack(packs.memoryFiles(climb)).value, null, 'a map outside the pack is refused');
  const climbM = manifest.validateManifest(JSON.parse(climb['theme.json']));
  assert.equal(climbM.manifest, null, 'the manifest itself refuses a path that climbs out');
  assert.ok(climbM.diagnostics.some((d) => d.level === 'error' && /"map"/.test(d.message)));

  const brokenMap = { ...entries, 'map/star-hike-bridge.tmx': '<map' };
  const m = packs.readPack(packs.memoryFiles(brokenMap));
  assert.equal(m.value, null);
  assert.ok(errors(m.diagnostics).length > 0);

  assert.deepEqual(packs.readPack(packs.memoryFiles({})).diagnostics, [{ level: 'error', message: 'The pack has no theme.json.' }]);
});

test('the credit must be words and an https link, else it is dropped with a warning', () => {
  const raw = JSON.parse(read('themes/starhike/theme.json'));
  for (const credit of [{ text: 'Artwork by Prozzta', url: 'http://github.com/Prozzta/guppyos' }, { text: '', url: 'https://x.y' }, 'Artwork by Prozzta', { text: 'a', url: 'https://a b' }]) {
    const v = manifest.validateManifest({ ...raw, credit });
    assert.ok(v.manifest, JSON.stringify(credit));
    assert.equal(v.manifest.credit, undefined, JSON.stringify(credit));
    assert.ok(v.diagnostics.some((d) => d.level === 'warn' && /"credit"/.test(d.message)));
  }
});

test('the framing knows Star Hike by its id; an unknown pack gets the whole map', () => {
  const f = framing.packFrame('starhike');
  assert.ok(f);
  assert.equal(framing.packFrame('tes'), null, 'the old name is gone');
  assert.equal(framing.packFrame(null), null);
  const whole = framing.floorFrame('nope', 960, 640);
  assert.ok(whole);
  assert.ok(framing.frameAspect(framing.floorFrame('starhike', 960, 640)) > 0);
});

// ─── the crew: fed no liveness yet ──────────────────────────────────────────

test('with no liveness feed, each agent shows its own status; a cloud only for statuses that have one', () => {
  for (const s of ['working', 'thinking', 'idle', 'blocked', 'waiting', 'success', 'error']) {
    assert.equal(activity.activityStatus(s, undefined, null), s, s);
  }
  const working = bubble.activityThought({ id: 'a', status: 'working', action: 'Reading a.ts' }, undefined, null);
  assert.equal(working.status, 'working');
  assert.equal(bubble.activityThought({ id: 'a', status: 'blocked' }, undefined, null).status, 'blocked');
  assert.equal(bubble.activityThought({ id: 'a', status: 'success' }, undefined, null), null);

  const src = read(TH + 'StationFloor.tsx');
  assert.match(src, /const NO_LIVENESS: Readonly<Record<string, LivenessV1 \| undefined>> = \{\};/);
  assert.match(src, /crew\.sync\(crewAgents\(pack, agents, NO_LIVENESS, null\)\)/);
  assert.match(src, /bubbleThoughts\(agents, NO_LIVENESS, null\)/);
  assert.match(src, /if \(s\.agents !== prev\.agents\) sync\(\);/);
  assert.doesNotMatch(src, /s\.liveness|s\.heavyLock|\{ agents, liveness/);
});

test('the crew seats every agent from the real pack, the orchestrator first, and frees a seat when one leaves', () => {
  const P = loadStarHike().done.value;
  let r = 1;
  const rand = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
  const crew = new crewMod.Crew(P.scene, seats.seatRulesFrom(P.manifest), rand);
  const agents = [{ id: 'god', status: 'idle', orchestrator: true }, ...Array.from({ length: 4 }, (_, i) => ({ id: `w${i}`, status: 'working', orchestrator: false }))];
  crew.sync(agents);
  for (let i = 0; i < 200; i += 1) crew.tick(50);
  const seated = agents.map((a) => crew.seats.seat(a.id));
  assert.ok(seated.slice(1).every(Boolean), 'every working agent has a seat: ' + JSON.stringify(seated));
  assert.equal(new Set(seated.filter(Boolean)).size, seated.filter(Boolean).length, 'no seat is shared');
  assert.equal(crew.walkers().length, agents.length, 'everyone is on the floor');
  crew.sync(agents.slice(0, 3));
  assert.equal(crew.walkers().length, 3);
  assert.equal(crew.seats.seat('w3'), null, 'a removed agent holds no seat');
});

test('a seat that frees goes to the next who waits; the orchestrator gets the captain\'s chair', () => {
  const P = loadStarHike().done.value;
  const rules = seats.seatRulesFrom(P.manifest);
  assert.ok(rules.order.length >= 2);
  const A = new seats.SeatAllocator(rules);
  const n = rules.order.length - (rules.captain ? 1 : 0);
  if (rules.captain) {
    A.join({ id: 'god', orchestrator: true });
    assert.equal(A.seat('god'), rules.captain);
  }
  for (let i = 0; i < n + 2; i += 1) A.join({ id: `w${i}`, orchestrator: false });
  assert.equal(A.seat(`w${n}`), null, 'more agents than chairs: the rest wait');
  const freed = A.seat('w0');
  assert.ok(freed);
  const changes = A.leave('w0');
  assert.equal(A.seat('w0'), null);
  assert.equal(A.seat(`w${n}`), freed, 'the first who waited takes the freed chair');
  assert.equal(A.seat(`w${n + 1}`), null);
  assert.deepEqual(changes.map((c) => c.agentId), ['w0', `w${n}`]);
  assert.equal(Object.values(A.snapshot()).filter((id) => id === 'w0').length, 0);
});

// ─── the dispatch ───────────────────────────────────────────────────────────

test('OfficeFloor dispatches: a usable stations pack draws StationFloor; anything else the office as before, a failed pack with one line', () => {
  const src = read('src/renderer/src/scene/office/OfficeFloor.tsx');
  assert.match(src, /export function OfficeFloor\(/);
  assert.match(src, /\nfunction OfficeScene\(\)/, 'the office body kept, unexported');
  assert.equal((src.match(/export function /g) || []).length, 1, 'OfficeFloor is the only export');
  assert.match(src, /const wantsPack = isStationPack\(officeTheme\);/);
  assert.match(src, /if \(state\?\.pack\) return <StationFloor pack=\{state\.pack\} \/>;/);
  assert.match(src, /<OfficeScene \/>\s*\{state\?\.failed && \(/);
  assert.match(src, /role="status"/);
  assert.match(src, /t\('stationFloor\.packFailed', \{ name: /);
  assert.match(src, /pointerEvents: 'none'/, 'the line never blocks the floor');
  assert.match(src, /insetInlineStart: 10, insetInlineEnd: 10/, 'placed by reading direction');
  // The reasons are for the console, never the screen.
  assert.match(src, /console\.warn\(`\[OfficeFloor\] theme "\$\{officeTheme\}" cannot be used; showing the office:\\n` \+ errors\.map/);
  assert.match(src, /\(e\) => \{\s*if \(!live\) return;\s*console\.warn\(/, 'a load that throws is a failure too');
  assert.match(src, /return \(\) => \{ live = false; \};/, 'a stale load never lands after the theme changed');
  assert.match(src, /if \(wantsPack && \(!state \|\| state\.id !== officeTheme\)\) return/, 'nothing stale drawn while the new pack loads');
});

test('a theme id reaches only the registry\'s own themes; a pack id is a theme id', () => {
  const src = read('src/renderer/src/scene/office/themeRegistry.ts');
  assert.match(src, /export type ThemeId = BuiltinThemeId \| \(string & \{\}\);/);
  assert.match(src, /return \(Object\.hasOwn\(THEMES, id\) \? THEMES\[id\] : undefined\) \?\? OFFICE_THEME;/);
  assert.doesNotMatch(src, /THEMES\[id\] \?\?/);
  const picker = read('src/renderer/src/components/OfficeThemePicker.tsx');
  assert.doesNotMatch(picker, /\bThemeId\b/, 'the picker lists built ins until main knows a pack id');
});

test('the pack glob reads every themes/<id> folder at the repo root, text inlined, pictures as assets', () => {
  const src = read(TH + 'packSources.ts');
  const globs = [...src.matchAll(/import\.meta\.glob\('([^']+)'/g)].map((m) => m[1]);
  assert.equal(globs.length, 2);
  for (const g of globs) {
    assert.equal(path.resolve(ROOT, TH, g.split('/*')[0]), path.join(ROOT, 'themes'), g);
  }
  assert.match(src, /\{ query: '\?raw', import: 'default', eager: true \}/);
  assert.match(src, /\{ query: '\?url', import: 'default', eager: true \}/);
  assert.match(src, /if \('theme\.json' in entries\)/, 'a folder without theme.json is no pack');
});

// ─── cuts, credits, words ───────────────────────────────────────────────────

test('left out: the colour overrides; the office cloud is its own', () => {
  const walk = (d) => fs.readdirSync(path.join(ROOT, d), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : /\.tsx?$/.test(e.name) ? [path.join(d, e.name)] : []));
  const renderer = walk('src/renderer/src');
  for (const f of renderer) {
    const s = read(f);
    assert.doesNotMatch(s, /uiTokens|UiTokenOverrides|themeUiTokens|applyThemeUiTokens/, f);
  }
  assert.equal(fs.existsSync(path.join(ROOT, 'src/renderer/src/design/uiTokens.ts')), false);
  assert.equal(fs.existsSync(path.join(ROOT, 'src/renderer/src/design/uiTheme.ts')), false);
  const office = renderer.filter((f) => f.includes('/scene/office/'));
  for (const f of office) assert.doesNotMatch(read(f), /stationBubble/, `${f} keeps the office's own cloud`);
  assert.match(read(TH + 'BubbleLayer.ts'), /from '\.\/stationBubble'/);
  assert.doesNotMatch(read(TH + 'BubbleLayer.ts'), /\.\.\/office\/ThoughtBubble/);
});

test('the art is credited everywhere it ships, its licence kept as written; nothing extra in the pack', () => {
  const credit = 'Artwork by Prozzta';
  const link = 'https://github.com/Prozzta/guppyos';
  for (const f of ['README.md', 'LICENSE-ASSETS', 'src/renderer/src/assets/ATTRIBUTION.md']) {
    const s = read(f);
    assert.ok(s.includes(credit) && s.includes(link), f);
  }
  const theme = JSON.parse(read('themes/starhike/theme.json'));
  assert.deepEqual(theme.credit, { text: credit, url: link });
  assert.equal('uiTokens' in theme, false);
  const lic = read('themes/starhike/LICENSE-ARTWORK.md');
  assert.match(lic, /^ARTWORK LICENSE\n/);
  assert.match(lic, /Prozzta/);
  assert.deepEqual(fs.readdirSync(PACK).sort(), ['LICENSE-ARTWORK.md', 'art', 'lines.json', 'map', 'theme.json'], 'no SOURCES.json, no tool folders');
  const all = Object.keys(packEntries());
  assert.ok(!all.some((p) => /(^|\/)\.|SOURCES|speck/i.test(p)), all.join(', '));
  assert.ok(!fs.readdirSync(path.join(ROOT, 'themes')).includes('tes'), 'the old folder name is gone');
});

test('every ported file opens with its MIT line', () => {
  const ported = [
    ...fs.readdirSync(path.join(ROOT, TH)).filter((n) => /\.tsx?$/.test(n)).map((n) => TH + n),
    'src/shared/activityView.ts', 'src/shared/livenessV1.ts', 'src/shared/livenessView.ts',
    'src/renderer/src/scene/office/floorFrameBudget.ts', 'src/renderer/src/scene/office/Camera.ts'
  ];
  assert.ok(ported.length >= 34, String(ported.length));
  for (const f of ported) assert.equal(read(f).split('\n')[0], '// Ported from Prozzta/guppyos 02d0d50b (MIT).', f);
});

test('the failure line is in all three languages, with the floor\'s name, as written', () => {
  const words = {};
  for (const l of ['en', 'ar', 'zh-CN']) words[l] = JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`)).stationFloor.packFailed;
  assert.equal(words.en, '{{name}} could not load, so The Office is showing instead. Every agent is still here.');
  for (const l of ['ar', 'zh-CN']) {
    assert.ok(words[l].includes('{{name}}'), l);
    assert.notEqual(words[l], words.en, `${l} is translated`);
  }
  assert.match(words.ar, /[؀-ۿ]/);
  assert.match(words['zh-CN'], /[一-鿿]/);
});
