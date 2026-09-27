'use strict';

/**
 * THE PAYWALL'S TEN TILES, RENDERED, IN ALL THREE LANGUAGES (0.5.2).
 *
 * The list went from eight to ten on the founder's word (9 Sep 2026) against
 * Pam's audited copy. `test/free-tier.test.cjs` pins the ids, their order and
 * the presence of every locale key; that is text, and text has shipped a dead
 * control three times in this release.
 *
 * So this file MOUNTS the real Paywall with a real i18next carrying the real
 * locale files, once per language, and reads what was drawn. A missing key
 * would render as `paywall.features.rooms.name`, a glyph that does not resolve
 * would draw an empty path, and either is a failure here rather than a screen
 * a buyer meets.
 *
 * WHAT IT DOES NOT PROVE: that the words are good, that the Arabic and Chinese
 * read well (they were written by an agent, not reviewed by a native reader),
 * or how the cards look at any particular window width. It proves they are
 * there, in order, in every language, with a glyph each.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const RENDERER = path.join(ROOT, 'src/renderer/src');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

/** The ten, in the order the copy was written to be read in. */
const TILES = ['orchestrator', 'agents', 'rooms', 'tasks', 'inbox', 'automations', 'memory', 'capabilities', 'stapler', 'temps'];

/* ---- a fake DOM, the same one the Stapler screen is mounted on ----------- */
const el = (tag) => ({
  nodeType: 1, tagName: tag, nodeName: tag, namespaceURI: 'http://www.w3.org/1999/xhtml', childNodes: [], style: {}, attrs: {},
  options: [], value: '', multiple: false, selectedIndex: -1, defaultValue: '',
  addEventListener() {}, removeEventListener() {}, appendChild(c) { this.childNodes.push(c); return c; },
  removeChild(c) { this.childNodes = this.childNodes.filter((x) => x !== c); },
  insertBefore(c) { this.childNodes.push(c); return c; }, setAttribute(k, v) { this.attrs[k] = v; }, removeAttribute(k) { delete this.attrs[k]; },
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }, contains() { return false; }, get ownerDocument() { return document; },
  setAttributeNS() {}, removeAttributeNS() {}, focus() {}, blur() {}
});
const document = {
  nodeType: 9, body: el('BODY'), documentElement: el('HTML'), createElement: (t) => el(t.toUpperCase()),
  createTextNode: (t) => ({ nodeType: 3, nodeValue: t }), createEvent: () => ({ initEvent() {} }),
  createElementNS: (_ns, t) => el(String(t).toUpperCase()),
  addEventListener() {}, removeEventListener() {}, get activeElement() { return this.body; }, implementation: { hasFeature: () => false }
};
globalThis.document = document;
const cth = new Proxy({
  // The store reads the roster synchronously at module load.
  rosterReadSync: () => ({ version: 1, savedAt: 'x', agents: [], archived: [], restorable: [], queues: {}, selectedId: null }),
  harnessHomeSync: () => '/h',
  getConfig: () => Promise.resolve({})
}, {
  get(target, name) {
    if (name in target) return target[name];
    if (typeof name === 'string' && name.startsWith('on')) return () => () => {};
    return () => Promise.resolve({ ok: true });
  }
});
globalThis.window = {
  document, localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  cth, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; }, setTimeout, clearTimeout,
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), location: { href: 'http://x/' }
};
globalThis.localStorage = window.localStorage;
if (!('navigator' in globalThis)) Object.defineProperty(globalThis, 'navigator', { value: { language: 'en', userAgent: 'node' }, configurable: true });

/* ---- the loader ---------------------------------------------------------- */
const cache = new Map();
function resolveTs(fromDir, req) {
  const base = req.startsWith('@shared/') ? path.join(ROOT, 'src/shared', req.slice(8))
    : req.startsWith('@/') ? path.join(RENDERER, req.slice(2))
    : path.resolve(fromDir, req);
  for (const c of [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')]) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}
function loadFile(filename) {
  const hit = cache.get(filename);
  if (hit) return hit.exports;
  if (filename.endsWith('.json')) { const m = { exports: JSON.parse(fs.readFileSync(filename, 'utf8')) }; cache.set(filename, m); return m.exports; }
  const out = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.React },
    fileName: filename
  });
  const mod = { exports: {} };
  cache.set(filename, mod);
  const req = (r) => {
    if (r.endsWith('.css')) return {};
    if (r.startsWith('@brand/')) return { default: 'logo.png' };
    if (r.startsWith('.') || r.startsWith('@shared/') || r.startsWith('@/')) {
      const x = resolveTs(path.dirname(filename), r.replace(/\?url$/, ''));
      if (x) return loadFile(x);
    }
    return require(r);
  };
  new Function('module', 'exports', 'require', '__filename', '__dirname', out.outputText)(mod, mod.exports, req, filename, path.dirname(filename));
  return mod.exports;
}

const React = require('react');
globalThis.React = React;
/* Every string the tree draws, and every SVG path it asks for. With a REAL
   i18next behind it a key in `texts` means that key had no translation. */
const texts = [];
const paths = [];
const realCreate = React.createElement;
React.createElement = function patched(type, props, ...kids) {
  for (const k of (kids.flat ? kids.flat(3) : kids)) if (typeof k === 'string') texts.push(k);
  if (props && typeof props === 'object') {
    if (typeof props.children === 'string') texts.push(props.children);
    if (typeof props.d === 'string') paths.push(props.d);
  }
  return realCreate.call(this, type, props, ...kids);
};

/* ---- a real i18next, with the real locale files -------------------------- */
const i18next = require('i18next');
const { initReactI18next } = require('react-i18next');
const resources = {
  en: { translation: JSON.parse(read('src/renderer/src/i18n/locales/en.json')) },
  'zh-CN': { translation: JSON.parse(read('src/renderer/src/i18n/locales/zh-CN.json')) },
  ar: { translation: JSON.parse(read('src/renderer/src/i18n/locales/ar.json')) }
};
i18next.use(initReactI18next).init({
  resources, lng: 'en', fallbackLng: false, supportedLngs: ['en', 'zh-CN', 'ar'],
  react: { useSuspense: false },
  interpolation: { escapeValue: false, defaultVariables: { godName: 'Michael' } },
  returnNull: false
});

const { renderToStaticMarkup } = require('react-dom/server');
const { Paywall } = loadFile(path.join(RENDERER, 'components/team/onboarding/Paywall.tsx'));

/** Draw the wall in one language and return what it drew. Rendered rather than
 *  mounted: the wall is a list, nothing here clicks anything, and a server
 *  render runs the component itself without its analytics effect firing. */
async function drawIn(lng) {
  texts.length = 0;
  paths.length = 0;
  await i18next.changeLanguage(lng);
  const html = renderToStaticMarkup(React.createElement(Paywall, { onFree: () => {} }));
  return { drawn: [...texts], glyphs: [...paths], html };
}

test('1. all ten tiles are drawn, in order, in every language, with nothing falling back to a key', async () => {
  for (const lng of ['en', 'zh-CN', 'ar']) {
    const { drawn, html } = await drawIn(lng);
    assert.ok(html.length > 500, `${lng}: the wall rendered almost nothing`);
    const dict = resources[lng].translation.paywall.features;
    const at = [];
    for (const id of TILES) {
      const { name, desc } = dict[id];
      assert.ok(drawn.includes(name), `${lng}: the ${id} tile's name was not drawn`);
      assert.ok(drawn.includes(desc), `${lng}: the ${id} tile's description was not drawn`);
      at.push(drawn.indexOf(name));
      // A key rendered as text is the failure this file exists to catch.
      assert.ok(!drawn.includes(`paywall.features.${id}.name`), `${lng}: ${id} rendered its KEY, so the locale is missing it`);
      assert.ok(!drawn.includes(`paywall.features.${id}.desc`), `${lng}: ${id}'s description rendered its KEY`);
    }
    assert.deepEqual([...at].sort((a, b) => a - b), at, `${lng}: the tiles were drawn out of order`);
  }
});

test('2. every tile draws a glyph that resolves to a path', async () => {
  const { glyphs } = await drawIn('en');
  const icons = read('src/renderer/src/components/pro/icons.tsx');
  for (const icon of ['sparkle', 'agents', 'panel', 'tasks', 'inbox', 'automations', 'memory', 'capabilities', 'puck', 'temps']) {
    assert.match(icons, new RegExp(`\\n  ${icon}: '`), `the ${icon} glyph is not in the icon set`);
  }
  // The ten tiles plus whatever else the wall draws; every one a real path,
  // never the empty string an unknown name would leave.
  assert.ok(glyphs.length >= TILES.length, `only ${glyphs.length} glyph paths were drawn`);
  for (const d of glyphs) assert.ok(d.trim().length > 0, 'a glyph drew an empty path');
});

test('3. the wall sells no screen a solo licence will never be shown', async () => {
  const { drawn } = await drawIn('en');
  const wall = drawn.join(' ').toLowerCase();
  // A solo licence has companyRows: [] (src/shared/soloPro.ts), so a tile
  // about teammates would sell a screen the buyer never meets. This is the
  // boundary Pam established and it is worth failing over, not just noting.
  for (const word of ['teammate', 'invite', 'seat for', 'shared brain']) {
    assert.ok(!wall.includes(word), `the paywall's feature list says "${word}", which a solo licence does not get`);
  }
  // The premise, EXECUTED rather than quoted: soloPro is React free and window
  // free by design, so the rule itself can be asked.
  const { navFor } = loadFile(path.join(ROOT, 'src/shared/soloPro.ts'));
  const solo = navFor('solo');
  assert.deepEqual(solo.companyRows, [], 'a solo licence now gets company rows, so this boundary must be revisited');
  assert.equal(solo.teamKnowledge, false, 'and it now gets team knowledge');
});
