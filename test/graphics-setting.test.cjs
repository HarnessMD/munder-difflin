'use strict';

// Settings, General, Environment: the Graphics row. Auto, GPU or CPU only, staged like every
// row there and kept by Save, which reads the mode back. A line names what draws the app now.
// A saved change waits for a restart: the row offers one, and asks first only when agents are
// running, counted when the button is pressed. The floors ask for the faster graphics card
// under GPU and note the card they got, for that line.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const loadTs = require(path.join(ROOT, 'test/load-ts.cjs'));
const ts = require(path.join(ROOT, 'node_modules/typescript'));
const i18next = require(path.join(ROOT, 'node_modules/i18next'));
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const C = 'src/renderer/src/components';
const GM = loadTs('src/shared/graphicsMode.ts');
const LOC = (l) => JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`));
const en = LOC('en');
const get = (o, k) => k.split('.').reduce((v, p) => (v == null ? v : v[p]), o);

// React stood in: each mounted component keeps its own state; an effect runs after a render
// when its deps change (cleanup first). JSX is plain { type, props } to read and press.
let current = null;
const React = {
  useState: (init) => {
    const c = current;
    const i = c.hook++;
    if (!(i in c.states)) c.states[i] = typeof init === 'function' ? init() : init;
    return [c.states[i], (v) => { c.states[i] = typeof v === 'function' ? v(c.states[i]) : v; }];
  },
  useEffect: (fn, deps) => {
    const c = current;
    const i = c.hook++;
    const prev = c.deps.get(i);
    if (prev && deps && deps.length === prev.length && deps.every((d, k) => Object.is(d, prev[k]))) return;
    c.deps.set(i, deps);
    c.pending.push(() => { c.cleanups.get(i)?.(); const u = fn(); c.cleanups.set(i, typeof u === 'function' ? u : undefined); });
  },
};
const jsx = (type, p) => ({ type, props: p ?? {} });
const kids = (n) => [n?.props?.children].flat(Infinity).filter((c) => c != null && c !== false && c !== true);
const text = (n) => (typeof n === 'string' || typeof n === 'number' ? String(n) : kids(n).map(text).join(''));
function findAll(n, pred, out = []) {
  if (n && typeof n === 'object') { if (pred(n)) out.push(n); for (const c of kids(n)) findAll(c, pred, out); }
  return out;
}
function mount(fn, props) {
  const c = { states: [], hook: 0, deps: new Map(), cleanups: new Map(), pending: [] };
  c.render = () => {
    const prev = current; current = c; c.hook = 0;
    let out;
    try { out = fn(typeof props === 'function' ? props() : props); } finally { current = prev; }
    for (const e of c.pending.splice(0)) e();
    return out;
  };
  c.unmount = () => { for (const u of c.cleanups.values()) u?.(); };
  return c;
}
const settle = async () => { for (let i = 0; i < 4; i++) await new Promise((r) => setImmediate(r)); };
/** The English words, filled in as i18next does (the one form when count is 1). */
const t = (k, o = {}) => {
  const v = (o.count === 1 && get(en, `${k}_one`)) || get(en, k);
  return typeof v === 'string' ? v.replace(/\{\{(\w+)\}\}/g, (_, n) => String(o[n])) : k;
};
/** A module run as written with its imports and globals stood in (an unknown import throws). */
function run(file, mods, globals = {}) {
  const js = ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const all = { react: React, 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' }, 'react-i18next': { useTranslation: () => ({ t }) }, ...mods };
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', ...Object.keys(globals), js)((m) => { if (!(m in all)) throw new Error(`unexpected import ${m} in ${file}`); return all[m]; }, mod, mod.exports, ...Object.values(globals));
  return mod.exports;
}
const status = (over = {}) => ({ applied: 'auto', stored: 'auto', hardwareDisabled: false, hardwareCompositing: true, runningAgents: 0, ...over });
const METAL = 'ANGLE (Apple, ANGLE Metal Renderer: Apple M2 Pro, Unspecified Version)';

// ── the floors' half ─────────────────────────────────────────────────────────

/** graphicsProbe.ts fresh (its asked-once status and recorded renderer start empty). */
function probeOf(cth, canvasGl) {
  const made = [];
  const document = { createElement: (tag) => { const c = { tag, getContext: (kind) => (canvasGl ? canvasGl(kind) : null) }; made.push(c); return c; } };
  const P = run('src/renderer/src/scene/graphicsProbe.ts', { '@shared/graphicsMode': GM }, { window: { cth }, document });
  return { P, made };
}
function gl({ unmasked, plain, throws } = {}) {
  const g = { lost: false, getExtension: (n) => {
    if (n === 'WEBGL_debug_renderer_info') return unmasked === undefined ? null : { UNMASKED_RENDERER_WEBGL: 'U' };
    if (n === 'WEBGL_lose_context') return { loseContext: () => { g.lost = true; } };
    return null;
  }, RENDERER: 'R', getParameter: (p) => { if (throws) throw new Error('lost'); return p === 'U' ? unmasked : plain; } };
  return g;
}

test('the floors ask main once for the mode this run started with: GPU asks for the faster card, Auto and CPU only ask nothing', async () => {
  let asked = 0;
  const { P } = probeOf({ graphicsStatus: async () => { asked++; return status({ applied: 'gpu', stored: 'cpu' }); } });
  assert.deepEqual(await P.floorPowerPreference(), { powerPreference: 'high-performance' }, 'the mode in force, not the saved one');
  assert.deepEqual(await P.floorPowerPreference(), { powerPreference: 'high-performance' });
  assert.equal(asked, 1, 'asked once per window');
  for (const applied of ['auto', 'cpu']) {
    assert.deepEqual(await probeOf({ graphicsStatus: async () => status({ applied }) }).P.floorPowerPreference(), {});
  }
  assert.deepEqual(await probeOf({ graphicsStatus: async () => { throw new Error('no main'); } }).P.floorPowerPreference(), {}, 'a failed read draws as Auto');
  assert.deepEqual(await probeOf(undefined).P.floorPowerPreference(), {}, 'no bridge draws as Auto');
});

test('the card a floor got is noted for the line; before any floor, a throwaway canvas is asked and let go; nothing here throws into a floor', () => {
  assert.equal(probeOf().P.webglRendererName(gl({ unmasked: METAL })), METAL);
  assert.equal(probeOf().P.webglRendererName(gl({ plain: 'WebKit WebGL' })), 'WebKit WebGL', 'no debug extension: the plain renderer');
  for (const g of [gl({ unmasked: '' }), gl({ unmasked: 7 }), gl({ unmasked: METAL, throws: true }), null, {}]) {
    assert.equal(probeOf().P.webglRendererName(g), null);
  }

  const canvas = gl({ unmasked: 'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)' });
  const kinds = [];
  const { P, made } = probeOf({}, (kind) => { kinds.push(kind); return canvas; });
  assert.equal(P.currentRendererName(), 'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)');
  assert.deepEqual(kinds, ['webgl2']);
  assert.equal(made.length, 1);
  assert.equal(canvas.lost, true, 'the probe context is released');
  P.recordFloorRenderer({ renderer: { gl: gl({ unmasked: METAL }) } });
  assert.equal(P.currentRendererName(), METAL, 'the floor\'s card wins');
  assert.equal(made.length, 1, 'no new canvas once a floor has drawn');
  P.recordFloorRenderer({ renderer: { gl: gl({ unmasked: METAL, throws: true }) } });
  P.recordFloorRenderer(null);
  P.recordFloorRenderer({ get renderer() { throw new Error('torn down'); } });
  assert.equal(P.currentRendererName(), METAL, 'a later floor with no answer keeps the card');

  const webgl1 = [];
  assert.equal(probeOf({}, (kind) => { webgl1.push(kind); return kind === 'webgl' ? gl({ plain: 'R1' }) : null; }).P.probeWebglRenderer(), 'R1');
  assert.deepEqual(webgl1, ['webgl2', 'webgl']);
  assert.equal(probeOf({}, () => null).P.currentRendererName(), null);
  assert.equal(probeOf({}, () => { throw new Error('blocked'); }).P.currentRendererName(), null);
});

test('both floors ask before they start drawing and note the card once they are the live mount', () => {
  for (const f of ['src/renderer/src/scene/office/OfficeFloor.tsx', 'src/renderer/src/scene/themes/StationFloor.tsx']) {
    const src = read(f);
    assert.match(src, /import \{ floorPowerPreference, recordFloorRenderer \} from '\.\.\/graphicsProbe';/, f);
    assert.match(src, /const gfx = await floorPowerPreference\(\);\s*await app\.init\(\{\s*\.\.\.gfx,/, f);
    assert.match(src, /if \(mountIdRef\.current !== mountId\) \{ safeDestroy\(app\); return; \}\s*recordFloorRenderer\(app\);/, f);
    assert.equal(src.match(/recordFloorRenderer\(/g).length, 1, f);
  }
});

// ── the row ──────────────────────────────────────────────────────────────────

function rowOf(props, { renderer = METAL, cth = {} } = {}) {
  const calls = { restart: 0, picks: [], reads: 0 };
  global.window = { cth: { restartForGraphics: async () => { calls.restart++; }, ...cth } };
  const G = run(`${C}/GraphicsSetting.tsx`, {
    './PixelButton': { PixelButton: 'PixelButton' }, '@shared/graphicsMode': GM,
    '../scene/graphicsProbe': { currentRendererName: () => { calls.reads++; return renderer; } },
  });
  const state = { pick: null, notSaved: false, ...props };
  const row = mount(G.GraphicsSetting, () => ({ status: state.status, pick: state.pick, notSaved: state.notSaved, onPick: (m) => calls.picks.push(m) }));
  return { G, row, calls, state };
}
const buttons = (tree) => findAll(tree, (n) => n.type === 'PixelButton');
const press = (tree, label) => { const b = buttons(tree).find((x) => text(x) === label); assert.ok(b, `no ${label}`); return b.props.onClick(); };
const line = (tree, attr) => findAll(tree, (n) => n.props && attr in n.props)[0];

test('the row: three modes with the saved one lit, a pick waits for Save, picking the saved one again drops the pick', () => {
  const { row, calls, state } = rowOf({ status: status({ stored: 'gpu', applied: 'gpu' }) });
  let tree = row.render();
  assert.equal(findAll(tree, (n) => n.props.role === 'radiogroup')[0].props['aria-label'], 'Graphics');
  assert.deepEqual(buttons(tree).map((b) => [text(b), b.props.variant]), [['Auto', 'secondary'], ['GPU', 'primary'], ['CPU only', 'secondary']]);
  press(tree, 'CPU only'); press(tree, 'GPU'); press(tree, 'Auto');
  assert.deepEqual(calls.picks, ['cpu', null, 'auto']);
  state.pick = 'cpu';
  tree = row.render();
  assert.deepEqual(buttons(tree).map((b) => b.props.variant), ['secondary', 'secondary', 'primary'], 'the staged pick is lit');
  assert.equal(line(tree, 'data-graphics-restart'), undefined, 'a pick alone says nothing about a restart');
  row.render();
  assert.equal(calls.reads, 1, 'the card is read once, as Settings opens');

  const none = rowOf({ status: null }).row.render();
  assert.equal(line(none, 'data-graphics-indicator'), undefined, 'no line before main answers');
  assert.equal(buttons(none).find((b) => b.props.variant === 'primary') && text(buttons(none).find((b) => b.props.variant === 'primary')), 'Auto', 'Auto until main says');
});

test('the line names what really draws: the card by name, the card with no name yet, the processor by choice, or the processor because no card worked', () => {
  const say = (s, renderer) => {
    const l = line(rowOf({ status: s }, { renderer }).row.render(), 'data-graphics-indicator');
    return l && text(l);
  };
  assert.equal(say(status(), METAL), 'Drawing with: Apple M2 Pro (GPU)');
  const named = findAll(line(rowOf({ status: status() }).row.render(), 'data-graphics-indicator'), (n) => n.type === 'span')[0];
  assert.equal(named.props.dir, 'ltr', 'the card name reads left to right in an Arabic window');
  assert.equal(say(status(), null), 'Drawing with: the graphics card (GPU); its name is not known yet');
  assert.equal(say(status({ applied: 'cpu', stored: 'cpu', hardwareDisabled: true }), null), 'Drawing with: the processor (CPU)');
  assert.equal(say(status({ applied: 'gpu', stored: 'gpu' }), 'Google SwiftShader'), 'Drawing with: the processor (CPU), because no graphics card worked');
  assert.equal(say(status({ hardwareCompositing: false }), METAL), 'Drawing with: the processor (CPU), because no graphics card worked', 'main\'s fresh word wins over the card a floor noted');
  assert.equal(say(status({ hardwareCompositing: null }), null), 'Drawing with: not known; the system has not said');
});

test('a saved change waits for a restart: with none running it restarts at once; with agents running it asks, counted when pressed', async () => {
  // Nothing running when pressed: no question.
  let fresh = status({ applied: 'auto', stored: 'cpu', runningAgents: 0 });
  let r = rowOf({ status: status({ applied: 'auto', stored: 'cpu', runningAgents: 3 }) }, { cth: { graphicsStatus: async () => fresh } });
  let tree = r.row.render();
  assert.equal(text(line(tree, 'data-graphics-restart')), 'Saved. CPU only takes effect after a restart.restart now');
  press(tree, 'restart now'); await settle();
  assert.equal(r.calls.restart, 1, 'the count is read fresh: 0 now, though 3 when Settings last read');
  assert.match(text(r.row.render()), /takes effect after a restart/, 'no question was asked');

  // Two running when pressed: asks, later goes back, restart restarts.
  fresh = status({ applied: 'auto', stored: 'cpu', runningAgents: 2 });
  r = rowOf({ status: status({ applied: 'auto', stored: 'cpu', runningAgents: 0 }) }, { cth: { graphicsStatus: async () => fresh } });
  press(r.row.render(), 'restart now'); await settle();
  assert.equal(r.calls.restart, 0);
  tree = r.row.render();
  assert.equal(text(line(tree, 'data-graphics-restart')), 'Restarting stops 2 running agents. Restart now?restartlater');
  press(tree, 'later');
  tree = r.row.render();
  assert.match(text(line(tree, 'data-graphics-restart')), /^Saved\./);
  press(tree, 'restart now'); await settle();
  press(r.row.render(), 'restart');
  assert.equal(r.calls.restart, 1);

  // A failed read keeps the last count; one agent is said in the one form.
  r = rowOf({ status: status({ applied: 'gpu', stored: 'auto', runningAgents: 1 }) }, { cth: { graphicsStatus: async () => { throw new Error('busy'); } } });
  press(r.row.render(), 'restart now'); await settle();
  assert.equal(r.calls.restart, 0);
  tree = r.row.render();
  assert.equal(text(line(tree, 'data-graphics-restart')), 'Restarting stops 1 running agent. Restart now?restartlater');
  press(tree, 'GPU');
  assert.match(text(line(r.row.render(), 'data-graphics-restart')), /^Saved\. Auto takes effect/, 'picking a mode drops the question');

  assert.equal(line(rowOf({ status: status({ applied: 'gpu', stored: 'gpu' }) }).row.render(), 'data-graphics-restart'), undefined, 'nothing waits');
  assert.equal(rowOf({}).G.restartPending(null), false);
});

test('not saved: the row says nothing changed, in its tag, with no red', () => {
  const tree = rowOf({ status: status(), notSaved: true }).row.render();
  const st = findAll(tree, (n) => n.props.role === 'status')[0];
  assert.equal(text(st), 'GraphicsThe Graphics setting could not be saved. Nothing changed.');
  const src = read(`${C}/GraphicsSetting.tsx`);
  const used = [...new Set(src.match(/var\(--cth-[a-z0-9-]+\)/g))];
  assert.deepEqual(used.filter((v) => /coral|red|status-blocked/.test(v)), []);
  const tokens = read('src/renderer/src/design/tokens.css');
  for (const v of used) assert.match(tokens, new RegExp(`${v.slice(4, -1)}\\s*:`), `${v} is declared`);
  assert.equal(rowOf({ status: status() }).row.render().props.children.filter(Boolean).some((n) => n && n.props && n.props.role === 'status'), false);
});

test('while Settings is open the status is read again every 10 s; a failed read keeps the line; closing stops it', async () => {
  const timers = [];
  let answer = status({ runningAgents: 1 });
  global.window = {
    cth: { graphicsStatus: async () => { if (answer instanceof Error) throw answer; return answer; } },
    setInterval: (fn, ms) => { timers.push([fn, ms]); return 7; },
    clearInterval: (id) => timers.push(['cleared', id]),
  };
  const G = run(`${C}/GraphicsSetting.tsx`, { './PixelButton': { PixelButton: 'PixelButton' }, '@shared/graphicsMode': GM, '../scene/graphicsProbe': { currentRendererName: () => null } });
  assert.equal(G.GRAPHICS_REFRESH_MS, 10000);
  const h = mount(() => G.useGraphicsStatus());
  assert.equal(h.render()[0], null);
  await settle();
  assert.equal(h.render()[0].runningAgents, 1);
  assert.equal(timers[0][1], 10000);
  answer = status({ runningAgents: 4, hardwareCompositing: false });
  timers[0][0](); await settle();
  assert.equal(h.render()[0].runningAgents, 4, 'a fallback in the middle of a run shows');
  answer = new Error('busy');
  timers[0][0](); await settle();
  assert.equal(h.render()[0].runningAgents, 4, 'a failed read keeps the line');
  const [, set] = h.render();
  set(status({ stored: 'cpu' }));
  assert.equal(h.render()[0].stored, 'cpu', 'Save\'s answer goes in');
  h.unmount();
  assert.deepEqual(timers.at(-1), ['cleared', 7]);
});

// ── Settings' Save ───────────────────────────────────────────────────────────

/** SettingsModal's saveAll, cut from the source and run with its state stood in. */
function saveOf({ graphicsPick = null, themePick = null, answer, themeOk = true }) {
  const src = read(`${C}/SettingsModal.tsx`);
  const body = src.slice(src.indexOf('const saveAll = async'), src.indexOf('/** Closing with staged changes'));
  const js = ts.transpile(`${body}\nreturn saveAll;`, { target: ts.ScriptTarget.ES2022 });
  const log = [];
  const set = (name) => (v) => log.push([name, v]);
  const scope = {
    setSaveBusy: set('busy'), setSaveNote: set('note'), maxTurnsPatch: () => ({}), budgetPatch: () => ({}), pending: {}, autoCompactPending: null,
    setPending: () => {}, setAutoCompactPending: () => {}, themePick, setProjectThemeNow: () => {}, setThemePick: () => {}, setThemeNotSaved: () => {},
    useStore: { getState: () => ({ setOfficeTheme: () => {} }) }, floorSceneTheme: () => 'office',
    graphicsPick, setGraphics: set('graphics'), setGraphicsNotSaved: set('notSaved'), setGraphicsPick: set('pick'),
    t: (k) => k, setTimeout: () => 0,
    window: { cth: {
      updateConfig: async (p) => { log.push(['config', p]); },
      getConfig: async () => ({}),
      setProjectTheme: async (th) => ({ ok: themeOk, theme: th }),
      setGraphicsMode: async (m) => { log.push(['setMode', m]); if (answer instanceof Error) throw answer; return answer; },
    } },
  };
  const fn = new Function('scope', `with (scope) { ${js} }`)(scope);
  return { save: fn, log };
}

test('Save writes the picked mode and reads it back: kept, it says saved; read back as another mode, or failed, it says not saved and keeps main\'s answer', async () => {
  let s = saveOf({ graphicsPick: 'cpu', answer: status({ stored: 'cpu' }) });
  await s.save();
  assert.deepEqual(s.log.filter(([k]) => ['setMode', 'graphics', 'notSaved', 'pick'].includes(k)), [['setMode', 'cpu'], ['graphics', status({ stored: 'cpu' })], ['notSaved', false], ['pick', null]]);
  assert.deepEqual(s.log.filter(([k]) => k === 'note').map(([, v]) => v), ['', 'settings.saved']);

  s = saveOf({ graphicsPick: 'gpu', answer: status({ stored: 'auto' }) });
  await s.save();
  assert.deepEqual(s.log.filter(([k]) => ['graphics', 'notSaved', 'pick'].includes(k)), [['graphics', status({ stored: 'auto' })], ['notSaved', true], ['pick', null]]);
  assert.deepEqual(s.log.filter(([k]) => k === 'note').map(([, v]) => v), [''], 'no "saved" when it was not');

  s = saveOf({ graphicsPick: 'gpu', answer: new Error('no main') });
  await s.save();
  assert.deepEqual(s.log.filter(([k]) => ['graphics', 'notSaved', 'pick'].includes(k)), [['notSaved', true], ['pick', null]], 'the line keeps the status it had');
  assert.deepEqual(s.log.filter(([k]) => k === 'note').map(([, v]) => v), ['']);

  s = saveOf({ answer: status() });
  await s.save();
  assert.equal(s.log.some(([k]) => k === 'setMode'), false, 'no pick, no write');
  assert.deepEqual(s.log.filter(([k]) => k === 'note').map(([, v]) => v), ['', 'settings.saved']);

  s = saveOf({ graphicsPick: 'cpu', themePick: 'starhike', themeOk: false, answer: status({ stored: 'cpu' }) });
  await s.save();
  assert.deepEqual(s.log.filter(([k]) => k === 'note').map(([, v]) => v), [''], 'a theme not saved is not "saved" either');

  const src = read(`${C}/SettingsModal.tsx`);
  assert.match(src, /const dirty = [^;]*\|\| graphicsPick !== null;/, 'closing with a pick asks first');
  assert.match(src, /<GraphicsSetting\s+status=\{graphics\}\s+pick=\{graphicsPick\}\s+onPick=\{\(mode\) => \{ setGraphicsPick\(mode\); setGraphicsNotSaved\(false\); \}\}\s+notSaved=\{graphicsNotSaved\}\s+\/>/);
  const env = src.slice(src.lastIndexOf('arabicTerminal ?', src.indexOf('<GraphicsSetting')), src.indexOf('<GraphicsSetting'));
  assert.ok(env.length < 400, 'the row sits under the Arabic terminal row in Environment');
  assert.match(read('src/preload/index.ts'), /graphicsStatus: \(\): Promise<GraphicsStatusView> => ipcRenderer\.invoke\('graphics:status'\)[^]*setGraphicsMode: \(mode: GraphicsMode\)[^]*ipcRenderer\.invoke\('graphics:setMode', mode\)[^]*restartForGraphics: \(\): Promise<void> => ipcRenderer\.invoke\('graphics:restart'\)/);
});

test('words: every Graphics key in English, Arabic and Chinese, translated, same placeholders; the one form where the language has it', async () => {
  const keys = ['settings.general.graphics', 'settings.general.graphicsDesc', ...Object.keys(en.graphics).map((k) => `graphics.${k}`)];
  assert.equal(keys.length, 17);
  for (const l of ['ar', 'zh-CN']) {
    const j = LOC(l);
    for (const k of keys) {
      const v = get(j, k);
      assert.equal(typeof v, 'string', `${l} ${k}`);
      assert.deepEqual((v.match(/\{\{\w+\}\}/g) ?? []).sort(), (get(en, k).match(/\{\{\w+\}\}/g) ?? []).sort(), `${l} ${k} placeholders`);
      if (!['graphics.gpu'].includes(k)) assert.notEqual(v, get(en, k), `${l} ${k} is translated`);
    }
  }
  // The one form names the one agent with no number to fill in, in every language, as codexLayer.more_one
  // does; Chinese keeps the key (same tree in all three) though i18next never asks it.
  for (const l of ['en', 'ar', 'zh-CN']) assert.doesNotMatch(LOC(l).graphics.confirm_one, /\{\{/, `${l} one form`);
  const i = i18next.createInstance();
  await i.init({ lng: 'en', resources: { en: { translation: en }, ar: { translation: LOC('ar') }, 'zh-CN': { translation: LOC('zh-CN') } }, interpolation: { escapeValue: false } });
  assert.equal(i.t('graphics.confirm', { count: 1 }), 'Restarting stops 1 running agent. Restart now?');
  assert.equal(i.t('graphics.confirm', { count: 3 }), 'Restarting stops 3 running agents. Restart now?');
  assert.equal(i.t('graphics.confirm', { count: 1, lng: 'ar' }), LOC('ar').graphics.confirm_one.replace('{{count}}', '1'));
  for (const n of [0, 2, 3, 11, 100]) assert.equal(i.t('graphics.confirm', { count: n, lng: 'ar' }), LOC('ar').graphics.confirm.replace('{{count}}', String(n)), `ar ${n}`);
  assert.equal(i.t('graphics.confirm', { count: 1, lng: 'zh-CN' }), LOC('zh-CN').graphics.confirm.replace('{{count}}', '1'));
  for (const l of ['en', 'ar', 'zh-CN']) {
    const d = i.t('graphics.drawing', { what: '\u0001', lng: l });
    assert.equal(d.split('\u0001').length, 2, `${l}: one place for what draws`);
  }
});
