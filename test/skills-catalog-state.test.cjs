'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const loadTs = require('./load-ts.cjs');

const skill = (name, folder = name, provider = 'claude') => ({
  id: name, name, description: '', provider, scope: 'user', path: folder
});
const catalogSkill = (name, source = `skills/${name}`) => ({
  name, description: '', owner: 'example', category: 'Tools',
  url: `https://github.com/example/skills/tree/main/${source}`
});

// Render the production component with a loaded IPC snapshot. No Electron,
// network, disk mutation, or additional test dependency is needed. The state
// order deliberately mirrors SkillsTab; an extra state fails this fixture.
function renderCatalog(local, catalog, action = {}) {
  const states = ['browse', '', local, catalog, null, 'all', 'all', false, action, null];
  let state = 0;
  const hooks = {
    ...React,
    useState: () => {
      assert.ok(state < states.length, 'unexpected SkillsTab state');
      return [states[state++], () => {}];
    },
    useEffect: () => {}, useMemo: (fn) => fn(), useCallback: (fn) => fn
  };
  const t = (key) => key;
  const filename = path.join(__dirname, '../src/renderer/src/components/SkillsTab.tsx');
  const js = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }
  }).outputText;
  const mod = { exports: {} };
  const localRequire = (id) => {
    if (id === 'react') return hooks;
    if (id === 'react-i18next') return { useTranslation: () => ({ t }) };
    if (id === './PixelButton') return { PixelButton: ({ children }) => React.createElement('button', null, children) };
    if (id.startsWith('../../../shared/')) return loadTs(`src/shared/${id.split('/').pop()}.ts`);
    return require(id);
  };
  new Function('require', 'module', 'exports', js)(localRequire, mod, mod.exports);
  const html = renderToStaticMarkup(React.createElement(mod.exports.SkillsTab));
  assert.equal(state, states.length, 'fixture matches SkillsTab state');
  return html;
}

function actionButton(html) {
  const buttons = [...html.matchAll(/<button([^>]*)>([^<]*)<\/button>/g)];
  const button = buttons.find(([, , text]) => /^skillsTab\.(install|installed|installing)$/.test(text));
  assert.ok(button, 'catalog action button exists');
  return { label: button[2], disabled: /\bdisabled=/.test(button[1]), style: button[1] };
}

const docx = catalogSkill('Word Documents', 'skills/docx');

test('Browse marks an already-installed tree skill as Installed, not Install', () => {
  const button = actionButton(renderCatalog([skill('Document tools', '/home/New Contributor/.claude/skills/docx')], [docx]));
  console.log(`docx catalog action: ${button.label}, disabled=${button.disabled}`);
  assert.equal(button.label, 'skillsTab.installed');
  assert.equal(button.disabled, true);
  assert.ok(button.style.includes('--cth-cream-200'), 'existing quiet style');
});

test('an empty local snapshot offers Install', () => {
  const button = actionButton(renderCatalog([], [docx]));
  assert.equal(button.label, 'skillsTab.install');
  assert.equal(button.disabled, false);
});

test('a same-named OpenCode plugin does not disable a Claude catalog install', () => {
  const button = actionButton(renderCatalog([skill('docx', '/home/me/.config/opencode/plugin/docx', 'opencode')], [docx]));
  assert.equal(button.label, 'skillsTab.install');
  assert.equal(button.disabled, false);
});

test('an unrelated source folder is installable even when its display name matches', () => {
  const button = actionButton(renderCatalog([skill('docx', '/home/me/.claude/skills/docx')], [catalogSkill('docx', 'word-tools')]));
  assert.equal(button.label, 'skillsTab.install');
  assert.equal(button.disabled, false);
});

test('an in-flight install keeps its existing busy state', () => {
  const button = actionButton(renderCatalog([], [docx], { [docx.url]: { busy: true } }));
  assert.equal(button.label, 'skillsTab.installing');
  assert.equal(button.disabled, true);
});

test('a Claude frontmatter alias does not hide an unrelated destination', () => {
  const button = actionButton(renderCatalog([skill('docx', '/home/me/.claude/skills/company-documents')], [docx]));
  assert.equal(button.label, 'skillsTab.install');
  assert.equal(button.disabled, false);
});
