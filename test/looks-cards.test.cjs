'use strict';

// A look per pack floor (Add Agent, Edit Agent) and the pack look on agent cards. A look is stored
// per theme beside the Office character, which it never replaces, and is saved with the roster.
// The card and the floor work an agent's look out the same way, so both show the same figure; on
// the Office, or when the pack cannot load, the card keeps the Office character, and while the pack
// loads the tile stays empty. An orchestrator with no look on a pack gets the pack's seed look once;
// its name is never touched.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const loadTs = require(path.join(ROOT, 'test/load-ts.cjs'));
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const TH = 'src/renderer/src/scene/themes/';
const C = 'src/renderer/src/components/';
const L = loadTs(TH + 'looks.ts');
const packs = loadTs(TH + 'packs.ts');

// Star Hike's portrait inputs, as themeCatalog builds them: the builder, the sprite spec and the
// sheet's columns (its width over a frame's).
function starHike() {
  const dir = path.join(ROOT, 'themes/starhike');
  const entries = {};
  const walk = (d, rel) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(path.join(d, e.name), r);
      else entries[r] = e.name.endsWith('.png') ? null : fs.readFileSync(path.join(d, e.name), 'utf8');
    }
  };
  walk(dir, '');
  const m = packs.readPack(packs.memoryFiles(entries)).value.manifest;
  const sheet = fs.readFileSync(path.join(dir, m.spriteRenderer.sheet));
  const width = sheet.readUInt32BE(16);
  return { manifest: m, pack: { themeId: m.id, builder: m.builder, sprite: m.spriteRenderer, columns: Math.max(1, Math.floor(width / m.spriteRenderer.frameWidth)) } };
}
const SH = starHike();
const SIZE = { w: 36, h: 56 };

test('a stored look: only its shape is read; a pack option it no longer has falls back without changing what is stored', () => {
  assert.equal(L.readLook(null), null);
  assert.equal(L.readLook([]), null);
  assert.equal(L.readLook({ bodyId: '' }), null);
  assert.equal(L.readLook({ bodyId: 'x'.repeat(41) }), null);
  const r = L.readLook({ bodyId: 'side-part', colors: { skin: '#fad6b8', shirt: 7 }, source: 'odd', presetId: 'rowan' });
  assert.deepEqual(r, { bodyId: 'side-part', colors: { skin: '#fad6b8', shirt: '', hair: '' }, presetId: 'rowan', source: 'custom', version: 1 });
  const b = SH.pack.builder;
  const stored = Object.freeze({ bodyId: 'gone-body', colors: Object.freeze({ skin: 'not a colour', shirt: '#2a8a87', hair: '#71413b' }), source: 'custom', version: 1 });
  const res = L.resolveLook(b, SH.pack.columns, stored, 'a1');
  assert.equal(res.exact, false);
  assert.equal(res.body.id, b.defaults.bodyId, 'an unknown body falls back to the pack default');
  assert.equal(stored.bodyId, 'gone-body', 'nothing stored is changed');
  // Store per theme, keeping every other theme's look
  const all = { other: { bodyId: 'x', colors: {}, source: 'custom', version: 1 } };
  const next = L.withLook(all, 'starhike', r);
  assert.deepEqual(Object.keys(next).sort(), ['other', 'starhike']);
  assert.strictEqual(next.other, all.other);
  assert.equal(Object.keys(all).length, 1, 'the old map is not changed');
});

test('one resolver: the card paints the figure the floor draws, for agents with and without a look', () => {
  const b = SH.pack.builder;
  const agents = [
    { id: 'kevin-1', character: 'kevin' },
    { id: 'pam-2', character: 'pam', appearanceByTheme: { starhike: { bodyId: b.bodies[1].id, colors: { skin: '#fad6b8', shirt: '#2a8a87', hair: '#71413b' }, source: 'custom', version: 1 } } },
    { id: 'dwight-3', character: 'dwight', appearanceByTheme: { office: { bodyId: 'x', colors: {}, source: 'custom', version: 1 } } },
    { id: 'jim-4', character: 'jim', appearanceByTheme: { starhike: { bodyId: 'nope', colors: {}, source: 'preset', presetId: 'rowan', version: 1 } } }
  ];
  const bodies = new Set();
  for (const a of agents) {
    const plan = L.portraitPlan('starhike', SH.pack, { agent: a }, SIZE);
    // what StationFloor's lookOf computes for the same agent
    const floor = L.resolveLook(b, SH.pack.columns, L.readLook(a.appearanceByTheme?.starhike), a.id);
    assert.equal(plan.kind, 'pack', a.id);
    assert.equal(plan.body.id, floor.body.id, a.id);
    assert.deepEqual(plan.colors, floor.colors, a.id);
    assert.equal(plan.sx, floor.body.column * SH.pack.sprite.frameWidth);
    bodies.add(plan.body.id);
  }
  const all = L.bodiesOf(b, SH.pack.columns);
  const picks = new Set();
  for (let i = 0; i < 24; i += 1) {
    const id = `agent-${i}`;
    const body = L.portraitPlan('starhike', SH.pack, { agent: { id, character: 'kevin' } }, SIZE).body.id;
    assert.equal(body, L.hashPick(id, all).id, `no look: a stable pick from the id (${id})`);
    assert.equal(L.portraitPlan('starhike', SH.pack, { agent: { id, character: 'pam' } }, SIZE).body.id, body, 'the same id, the same figure');
    picks.add(body);
  }
  assert.ok(picks.size > 2, `agents with no look are spread over the bodies, not all on one (${[...picks]})`);
  assert.equal(L.portraitPlan('starhike', SH.pack, { agent: agents[1] }, SIZE).body.id, b.bodies[1].id, 'a stored look is used');

  // the floor's own code calls the same resolver with the same arguments
  const floorSrc = read(TH + 'StationFloor.tsx');
  assert.match(floorSrc, /const cols = Math\.max\(1, Math\.floor\(sheetPx\.width \/ fw\)\);/);
  assert.match(floorSrc, /const r = resolveLook\(looks\.builder, cols, readLook\(a\.appearanceByTheme\?\.\[looks\.themeId\]\), a\.id\);/);
  assert.match(read(TH + 'themeCatalog.ts'), /columns: Math\.max\(1, Math\.floor\(sheet\.width \/ s\.spriteRenderer\.frameWidth\)\)/, 'the card\'s columns are counted the same way');
});

test('the Office, a pack that cannot load, another pack, and the Office cast pickers keep the Office character', () => {
  const a = { agent: { id: 'kevin-1', character: 'kevin' } };
  assert.deepEqual(L.portraitPlan('office', SH.pack, a, SIZE), { kind: 'office', character: 'kevin' });
  assert.deepEqual(L.portraitPlan('starhike', null, a, SIZE), { kind: 'office', character: 'kevin' }, 'the pack failed: null looks');
  assert.deepEqual(L.portraitPlan('other', SH.pack, a, SIZE), { kind: 'office', character: 'kevin' }, 'looks of another theme are never used');
  assert.deepEqual(L.portraitPlan('starhike', SH.pack, { character: 'pam' }, SIZE), { kind: 'office', character: 'pam' }, 'a character alone is the Office cast');

  const hook = read(TH + 'useThemeLooks.ts');
  assert.match(hook, /if \(themeId === OFFICE_THEME_ID\) return null;\s*\n\s*return state && state\.id === themeId \? state\.looks : undefined;/, 'office: null; loading: undefined');
  assert.match(hook, /\(\) => \{ if \(live\) setState\(\{ id: themeId, looks: null \}\); \}/, 'a pack that fails to load: null (Office art)');
  const portrait = read(C + 'SpritePortrait.tsx');
  assert.match(portrait, /const waiting = looks === undefined && plan\.kind === 'office' && \(!!props\.agent \|\| !!props\.draft \|\| !!props\.sample\);/);
  assert.match(portrait, /if \(waiting\) return; \/\/ the pack is still loading/);
  assert.match(portrait, /const activeTheme = useStore\(\(s\) => s\.officeTheme\);/, 'the card reads the same theme as the floor');
});

test('every portrait of an agent draws its look: the card, the detail header, the Command Center and focus mode; the strip passes the agent\'s id and looks', () => {
  const card = read(C + 'AgentCard.tsx');
  assert.match(card, /\{agentId !== undefined\s*\n\s*\? <SpritePortrait agent=\{\{ id: agentId, character, appearanceByTheme \}\} scale=\{2\} \/>\s*\n\s*: <SpritePortrait character=\{character\} scale=\{2\} \/>\}/);
  const strip = read(C + 'AgentStrip.tsx');
  assert.match(strip, /<AgentCard\s*\n\s*draggable\s*\n\s*agentId=\{a\.id\}\s*\n\s*appearanceByTheme=\{a\.appearanceByTheme\}/);
  // the card and the floor never disagree, wherever the agent is drawn: the detail header, the
  // Command Center header, its agent list and its archived list, and the focus mode sidebar row
  const subject = (v) => `<SpritePortrait agent=\\{\\{ id: ${v}\\.id, character: ${v}\\.character, appearanceByTheme: ${v}\\.appearanceByTheme \\}\\} scale=\\{`;
  const count = (src, re) => src.match(new RegExp(re, 'g'))?.length ?? 0;
  assert.equal(count(read(C + 'AgentDetailPanel.tsx'), subject('agent') + '1\\} \\/>'), 1, 'the detail header');
  const cc = read(C + 'CommandCenterPanel.tsx');
  assert.equal(count(cc, subject('agent') + '1\\} \\/>'), 1, 'the Command Center header');
  assert.equal(count(cc, subject('a') + '1\\} \\/>'), 2, 'its agent list and its archived list');
  assert.equal(count(read(C + 'FullscreenTerminal.tsx'), subject('agent') + 'scale\\.portraitScale\\} \\/>'), 1, 'the focus mode sidebar row');
  for (const f of ['AgentDetailPanel.tsx', 'CommandCenterPanel.tsx', 'FullscreenTerminal.tsx']) {
    for (const el of read(C + f).match(/<SpritePortrait[\s\S]*?\/>/g)) assert.match(el, /\bagent=\{/, `${f}: ${el.slice(0, 80)}`);
  }
  // Office cast pickers keep Office characters: every other SpritePortrait passes a character alone,
  // but for a new project's row, which shows the pack's seed look for its orchestrator
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : /\.tsx$/.test(e.name) ? [path.join(d, e.name)] : []);
  for (const f of walk(path.join(ROOT, 'src/renderer/src'))) {
    const rel = path.relative(ROOT, f);
    for (const m of fs.readFileSync(f, 'utf8').matchAll(/<SpritePortrait\b[^>]*\bagent=/g)) assert.ok(['AgentCard.tsx', 'AgentDetailPanel.tsx', 'CommandCenterPanel.tsx', 'FullscreenTerminal.tsx', 'ProjectThemeChoice.tsx'].map((x) => C + x).includes(rel), `${rel}: ${m[0]}`);
  }
});

test('the orchestrator\'s first look on a pack: the seed, once, as captain-default; a stored look is never replaced; no name', () => {
  const b = SH.pack.builder;
  const seed = SH.manifest.projectDefaults.orchestrator;
  assert.equal(seed.name, undefined, 'Star Hike\'s seed carries a look and no name');
  const look = L.orchestratorDefaultLook(b, undefined, seed.appearance);
  assert.deepEqual(look, { bodyId: 'side-part', colors: { skin: '#fad6b8', shirt: '#2a8a87', hair: '#71413b' }, presetId: 'rowan', source: 'captain-default', version: 1 });
  assert.equal(L.orchestratorDefaultLook(b, { bodyId: 'side-part', colors: {}, source: 'custom', version: 1 }, seed.appearance), null, 'a stored look stays');
  assert.equal(L.orchestratorDefaultLook(b, undefined, { bodyId: 'nope' }), null, 'an unusable seed gives nothing');
  assert.equal(L.orchestratorDefaultLook(undefined, undefined, seed.appearance), null, 'no builder, no look');

  const hook = read('src/renderer/src/hooks/useOrchestratorThemeLook.ts');
  assert.match(hook, /if \(!godId \|\| hasLook\) return;/);
  assert.match(hook, /useStore\.getState\(\)\.updateAgent\(godId, \{ appearanceByTheme: \{ \.\.\.\(god\.appearanceByTheme \?\? \{\}\), \[themeId\]: look \} \}\);/, 'only the look for this theme; other themes kept');
  assert.doesNotMatch(hook, /name\s*:/, 'the name is never written');
  assert.match(read('src/renderer/src/App.tsx'), /useHive\(hiveOpened \? config : null\);\s*\n\s*useOrchestratorThemeLook\(\);/);
});

test('looks are roster data: saved with the roster, kept across the orchestrator\'s respawn; Add and Edit store per theme', () => {
  const store = read('src/renderer/src/store/store.ts');
  const slim = store.slice(store.indexOf('function slimAgents('), store.indexOf('function persistAgents('));
  assert.match(slim, /\(\{ recentAssistantText, recentTextTs, blockReason, contextTokens, contextLimit, seedPrompt, \.\.\.rest \}\)/);
  assert.doesNotMatch(slim, /appearanceByTheme/, 'the roster keeps every look');
  assert.match(store, /appearanceByTheme\?: LooksByTheme;/);
  const hive = read('src/renderer/src/hooks/useHive.ts');
  assert.match(hive, /const godLooks = useStore\.getState\(\)\.agents\.find\(\(a\) => a\.id === GOD_ID\)\?\.appearanceByTheme;\s*\n\s*useStore\.getState\(\)\.removeAgent\(GOD_ID\);/, 'read before the stale entry goes');
  assert.match(hive, /\.\.\.\(godLooks \? \{ appearanceByTheme: godLooks \} : \{\}\),/);
  assert.match(read(C + 'AddAgentModal.tsx'), /\.\.\.\(looks && lookDraft \? \{ appearanceByTheme: \{ \[looks\.themeId\]: draftToLook\(lookDraft\) \} \} : \{\}\),/);
  assert.match(read(C + 'EditAgentModal.tsx'), /appearanceByTheme: withLook\(agent\.appearanceByTheme, looks\.themeId, draftToLook\(lookDraft/);
});

test('words and credit: the look builder\'s words in every language; the fork\'s files carry the MIT line', () => {
  const keys = ['title', 'sub', 'body', 'colours', 'skin', 'shirt', 'hair', 'custom', 'presets'];
  const loc = (l) => JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`));
  const en = loc('en');
  for (const l of ['en', 'ar', 'zh-CN']) {
    const j = loc(l);
    for (const k of keys) {
      assert.equal(typeof j.looks?.[k], 'string', `${l} looks.${k}`);
      assert.ok(j.looks[k].trim(), `${l} looks.${k} is not empty`);
      if (l !== 'en') assert.notEqual(j.looks[k], en.looks[k], `${l} looks.${k} is translated`);
    }
    assert.ok(j.addAgent.sections.identity.hintPack.trim(), `${l} hintPack`);
    for (const k of ['title', 'sub']) assert.match(j.looks[k], /\{\{theme\}\}/, `${l} looks.${k} names the theme`);
  }
  for (const f of [TH + 'useThemeLooks.ts', C + 'SpritePortrait.tsx', C + 'ThemeLookBuilder.tsx', 'src/renderer/src/hooks/useOrchestratorThemeLook.ts']) {
    assert.match(read(f).split('\n')[0], /^\/\/ Ported from Prozzta\/guppyos 02d0d50b \(MIT\)\.$/, f);
  }
});
