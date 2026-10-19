'use strict';

// A render error stays in its own place: a boundary draws what failed and a way back instead of a
// blank window. The root boundary reloads the window back onto the open project; a panel boundary
// draws its children again. The words are in English, Arabic and Chinese.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

const ROOT = path.join(__dirname, '..');
const req = createRequire(path.join(ROOT, 'package.json'));
const ts = req('typescript');
const React = req('react');
const { renderToStaticMarkup } = req('react-dom/server');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const h = React.createElement;

function loadTsx(rel) {
  const file = path.join(ROOT, rel);
  const out = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.React },
    fileName: file
  });
  const mod = { exports: {} };
  const stubs = {
    react: React,
    'react-i18next': { useTranslation: () => ({ t: (k, o) => (o ? `${k} ${JSON.stringify(o)}` : k) }) },
    './PixelButton': { PixelButton: ({ children, variant, size }) => h('i', { 'data-px': variant, 'data-size': size }, children) }
  };
  new Function('module', 'exports', 'require', 'React', out.outputText)(mod, mod.exports, (r) => (r in stubs ? stubs[r] : req(r)), React);
  return mod.exports;
}
const { ErrorBoundary } = loadTsx('src/renderer/src/components/ErrorBoundary.tsx');

function drawn(props, error) {
  const b = new ErrorBoundary(props);
  b.state = { error };
  return { b, html: renderToStaticMarkup(h('div', null, b.render())) };
}

test('the root: the box fills the window, says the agents keep running, and offers "Reload the window" as the main button', () => {
  const { html } = drawn({ recover: 'reload', children: 'app' }, new Error('boom'));
  for (const k of ['role="alert"', 'data-error-boundary="app"', 'error.tag', 'error.app', 'boom', 'data-px="primary"', 'data-size="sm"', 'error.reload', 'position:fixed']) assert.ok(html.includes(k), k);
  assert.ok(!html.includes('error.tryAgain'));
  assert.match(html, /<code dir="ltr"/, 'the error text stays left to right');
});

test('a panel: its name in the line, "Try again" as a secondary button; with no error the children draw as they are', () => {
  const { html } = drawn({ recover: 'remount', where: 'History', children: 'x' }, new Error(''));
  for (const k of ['data-error-boundary="History"', 'error.panel {&quot;where&quot;:&quot;History&quot;}', 'data-px="secondary"', 'error.tryAgain', 'Error']) assert.ok(html.includes(k), k);
  assert.ok(!html.includes('position:fixed'), 'a panel box stays in its panel');
  const b = new ErrorBoundary({ recover: 'remount', children: h('b', null, 'kids') });
  assert.equal(renderToStaticMarkup(b.render()), '<b>kids</b>');
  const e = new Error('e');
  assert.deepEqual(ErrorBoundary.getDerivedStateFromError(e), { error: e });
});

test('the way back: Try again clears the error; Reload sets the one shot flag that skips the project picker, then reloads', (t) => {
  const { b } = drawn({ recover: 'remount', where: 'History', children: 'x' }, new Error('e'));
  let next;
  b.setState = (s) => { next = s; };
  b.recover();
  assert.deepEqual(next, { error: null });

  const calls = [];
  let throwOnSet = false;
  global.window = {
    localStorage: { setItem: (k, v) => { if (throwOnSet) throw new Error('blocked'); calls.push([k, v]); } },
    location: { reload: () => calls.push('reload') }
  };
  t.after(() => { delete global.window; });
  const root = drawn({ recover: 'reload', children: 'app' }, new Error('e')).b;
  root.recover();
  assert.deepEqual(calls, [['cth.skipHivePickerOnce', '1'], 'reload']);
  throwOnSet = true;
  root.recover();
  assert.deepEqual(calls.at(-1), 'reload', 'storage refused: it still reloads (the picker shows first)');
  const app = read('src/renderer/src/App.tsx');
  assert.match(app, /if \(window\.localStorage\.getItem\('cth\.skipHivePickerOnce'\)\) \{\s*window\.localStorage\.removeItem\('cth\.skipHivePickerOnce'\);/, 'the flag App reads at start, and clears');
});

test('wiring and words: the whole app sits in the root boundary; the History tab is the one panel with its own; five keys in three languages', () => {
  assert.match(read('src/renderer/src/main.tsx'), /<StrictMode>\s*<ErrorBoundary recover="reload">\s*<App \/>\s*<\/ErrorBoundary>\s*<\/StrictMode>/);
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : /\.tsx?$/.test(e.name) ? [path.join(d, e.name)] : []);
  const users = walk(path.join(ROOT, 'src/renderer/src')).filter((f) => /<ErrorBoundary\b/.test(fs.readFileSync(f, 'utf8'))).map((f) => path.relative(ROOT, f)).sort();
  assert.deepEqual(users, ['src/renderer/src/components/AgentDetailPanel.tsx', 'src/renderer/src/main.tsx'], 'a boundary on a panel is drawn first');
  assert.equal(read('src/renderer/src/components/AgentDetailPanel.tsx').match(/<ErrorBoundary\b/g).length, 1, 'History only');
  for (const lng of ['en', 'ar', 'zh-CN']) {
    const e = JSON.parse(read(`src/renderer/src/i18n/locales/${lng}.json`)).error;
    for (const k of ['tag', 'app', 'panel', 'tryAgain', 'reload']) assert.ok(typeof e?.[k] === 'string' && e[k].trim(), `${lng} error.${k}`);
    assert.ok(e.panel.includes('{{where}}'), `${lng} error.panel names the panel`);
  }
  const en = JSON.parse(read('src/renderer/src/i18n/locales/en.json')).error;
  assert.deepEqual(en, { tag: 'error', app: 'The app hit an error and stopped drawing. Your agents keep running.', panel: '{{where}} could not be shown. The rest of the app is fine.', tryAgain: 'Try again', reload: 'Reload the window' });
});
