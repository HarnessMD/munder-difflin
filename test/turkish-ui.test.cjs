'use strict';

// The Turkish (tr) locale. Structural checks only, the same ones the Arabic
// locale is held to: tr is registered, left-to-right, carries exactly en's key
// tree, keeps every {{variable}} and inline tag, and leaves no English behind.
//
// Turkish CORRECTNESS is not what a green run here means. These tests are about
// coverage and shape, never about whether the Turkish reads well.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const locale = (code) =>
  JSON.parse(read(`src/renderer/src/i18n/locales/${code}.json`));

/** Every leaf path in a locale tree, arrays included by index. */
function leaves(node, prefix = '') {
  if (Array.isArray(node)) return node.flatMap((v, i) => leaves(v, `${prefix}.${i}`));
  if (node && typeof node === 'object') {
    return Object.entries(node).flatMap(([k, v]) => leaves(v, prefix ? `${prefix}.${k}` : k));
  }
  return [[prefix, node]];
}
const pathsOf = (o) => new Map(leaves(o));

const en = locale('en');
const tr = locale('tr');

test('tr is registered everywhere a language has to be registered', () => {
  const src = read('src/renderer/src/i18n/index.ts');
  assert.match(src, /import tr from '\.\/locales\/tr\.json'/, 'tr.json is not imported');
  assert.match(src, /tr: \{ translation: tr \}/, 'tr is missing from resources');
  assert.match(src, /supportedLngs: \[[^\]]*'tr'[^\]]*\]/, 'tr is missing from supportedLngs');
  assert.match(src, /code: 'tr'[^}]*dir: 'ltr'/, 'tr is not marked left-to-right');
});

test('tr has exactly the same key tree as en', () => {
  const e = pathsOf(en), t = pathsOf(tr);
  const missing = [...e.keys()].filter((k) => !t.has(k));
  const extra = [...t.keys()].filter((k) => !e.has(k));
  assert.deepEqual(missing, [], 'tr is missing keys — they would silently fall back');
  assert.deepEqual(extra, [], 'tr has keys en does not — dead strings');
  assert.ok(e.size > 1000, `sanity: only ${e.size} keys found`);
});

test('no Turkish string is left as its English source', () => {
  // Strings that are IDENTICAL ON PURPOSE: product names, literal paths, pure
  // format strings. Translating them would make the UI wrong, not more Turkish.
  const SAME_ON_PURPOSE = new Set([
    'commandBar.skill',                      // "/skill" — a slash command
    'sidebar.terminal',                      // "terminal" is the Turkish word too
    'commandCenter.tabs.terminal',
    'settings.voice.model',                  // "Model" is the Turkish word too
    'addAgent.model',
    'onboarding.orchestrator.model',
    'fullscreenTerminal.modelTitle',         // "Model: {{model}}" — same
    'settings.connections.slack',            // product name
    'onboarding.providerBlurb.claude',       // product names
    'onboarding.providerBlurb.codex',
    'onboarding.providerBlurb.antigravity',
    'onboarding.providerBlurb.gemini',
    'addAgent.projectPlaceholder',           // filesystem paths
    'onboarding.home.placeholder',
    'commandCenter.logMessage',              // pure interpolation
    'mcpDefaults.toggleNote',
    'webhooksSection.summary'
  ]);
  const e = pathsOf(en), t = pathsOf(tr);
  const untranslated = [];
  for (const [k, v] of e) {
    if (typeof v !== 'string' || !/[A-Za-z]{4}/.test(v)) continue; // symbols, ids, brands
    if (t.get(k) === v && !SAME_ON_PURPOSE.has(k)) untranslated.push(k);
  }
  assert.deepEqual(untranslated, [], `${untranslated.length} Turkish strings are still English`);
  const stale = [...SAME_ON_PURPOSE].filter((k) => t.get(k) !== e.get(k));
  assert.deepEqual(stale, [], 'allowlisted keys that ARE translated — drop them from the list');
});

test('every interpolation variable survives translation', () => {
  const e = pathsOf(en), t = pathsOf(tr);
  const vars = (s) => [...String(s).matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1]).sort().join(',');
  const bad = [];
  for (const [k, v] of e) {
    if (vars(v) !== vars(t.get(k))) bad.push(`${k}: [${vars(v)}] -> [${vars(t.get(k))}]`);
  }
  assert.deepEqual(bad, []);
});

test('inline markup and array shapes are preserved', () => {
  const e = pathsOf(en), t = pathsOf(tr);
  const tags = (s) => [...String(s).matchAll(/<\/?([a-z]+)>/g)].map((m) => m[1]).sort().join(',');
  for (const [k, v] of e) {
    assert.equal(tags(t.get(k)), tags(v), `markup changed in ${k}`);
  }
  const at = (o, p) => p.split('.').reduce((n, s) => n?.[s], o);
  for (const p of ['office.errand.smoke', 'office.suckUp', 'office.gossip', 'office.cheer']) {
    assert.equal(at(tr, p).length, at(en, p).length, `${p} changed length`);
  }
});
