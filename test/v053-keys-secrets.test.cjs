'use strict';

// 0.5.3 Settings redesign, Keys & Secrets (founder 24 Sep 2026: "All the mcp
// and api tokens etc addition section should not be in integrations"; "only
// one save button"). The provider key tasks run for real against a fake
// broker inside the real draft store; the .tsx wiring is read as source.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const { createSettingsDraft } = loadTs('src/renderer/src/components/settings/draftStore.ts');
const { PROVIDER_KEY_BACKENDS, editFor, keyTask, keyTaskId } = loadTs('src/renderer/src/components/settings/providerKeys.ts');
const KEYS = read('src/renderer/src/components/settings/KeysSecretsSection.tsx');
const MODAL = read('src/renderer/src/components/SettingsModal.tsx');
const ENGINES = read('src/renderer/src/components/AiEnginesSettings.tsx');

function fakeBroker(refuse = new Set()) {
  const calls = [];
  return {
    calls,
    set: async (b, key) => { calls.push(['set', b, key]); return refuse.has(b) ? { ok: false, error: `${b} said no` } : { ok: true }; },
    clear: async (b) => { calls.push(['clear', b]); return { ok: true }; }
  };
}

test('the providers are the five main materialises, by the env var each CLI reads', () => {
  assert.deepEqual(PROVIDER_KEY_BACKENDS.map((b) => b.id), ['anthropic', 'openai', 'google', 'openrouter', 'groq']);
  const main = read('src/main/index.ts');
  for (const b of PROVIDER_KEY_BACKENDS) assert.match(main, new RegExp(`${b.id}: '${b.envVar}'`), `${b.id} is not ${b.envVar} in main`);
});

test('typing a key stores nothing until Save; Save stores it once and reports set', async () => {
  const d = createSettingsDraft();
  const broker = fakeBroker();
  const heard = [];
  const edit = editFor('  sk-live-123  ');
  assert.deepEqual(edit, { kind: 'set', key: 'sk-live-123' });
  d.setTask(keyTaskId('openai'), keyTask('openai', edit, broker, (has) => heard.push(has)));
  assert.deepEqual(broker.calls, [], 'a keystroke reached the broker');
  assert.equal(d.dirty(), true, 'a typed key must light Save');
  const r = await d.commit({}, async () => undefined);
  assert.deepEqual(r, { ok: true, errors: [] });
  assert.deepEqual(broker.calls, [['set', 'openai', 'sk-live-123']]);
  assert.deepEqual(heard, [true]);
  assert.equal(d.dirty(), false);
});

test('an emptied field is no edit, so the task is dropped and Save goes quiet', () => {
  assert.equal(editFor('   '), null);
  const d = createSettingsDraft();
  d.setTask(keyTaskId('groq'), keyTask('groq', editFor('gsk'), fakeBroker(), () => {}));
  d.setTask(keyTaskId('groq'), null);
  assert.equal(d.dirty(), false);
});

test('a refused key stays in the draft with its reason; the others still save', async () => {
  const d = createSettingsDraft();
  const broker = fakeBroker(new Set(['google']));
  const heard = {};
  for (const b of ['google', 'anthropic']) d.setTask(keyTaskId(b), keyTask(b, { kind: 'set', key: `k-${b}` }, broker, (has) => { heard[b] = has; }));
  const r = await d.commit({}, async () => undefined);
  assert.equal(r.ok, false);
  assert.deepEqual(r.errors, [{ id: 'key:google', message: 'google said no' }]);
  assert.deepEqual(d.taskIds(), ['key:google'], 'the refused key must survive for another Save');
  assert.deepEqual(heard, { anthropic: true }, 'a refused key must never read as set');
});

test('Remove is a task too: nothing is cleared until Save', async () => {
  const d = createSettingsDraft();
  const broker = fakeBroker();
  let has = true;
  d.setTask(keyTaskId('openrouter'), keyTask('openrouter', { kind: 'clear' }, broker, (h) => { has = h; }));
  assert.deepEqual(broker.calls, []);
  await d.commit({}, async () => undefined);
  assert.deepEqual(broker.calls, [['clear', 'openrouter']]);
  assert.equal(has, false);
});

test('the section: provider keys and custom secrets, each a folding group; the tab is on', () => {
  assert.match(KEYS, /export const KEYS_READY = true;/);
  for (const id of ['keys-providers', 'keys-custom']) assert.match(KEYS, new RegExp(`<CollapsibleSection[\\s\\S]*?id="${id}"`), id);
  // Batch 3 #6: MCP servers live in Capabilities; REST tokens became custom secrets.
  assert.doesNotMatch(KEYS, /McpDefaultsSettings|IntegrationsRegistry|keys-mcp|keys-rest/);
  assert.match(KEYS, /type="password"/, 'a key field must never show what is typed');
  assert.doesNotMatch(KEYS, /providerKeyGet|window\.cth\.updateConfig\(/, 'keys are write only and the section stages, never writes config');
  assert.match(KEYS, /draft\?\.setTask\(keyTaskId\(backend\), keyTask\(backend, \{ kind: 'clear' \}/, 'Remove waits for Save');
  assert.match(KEYS, /if \(backend === 'openai'\) setHasOpenAiKey\(has\);/, 'the Talk gate follows the OpenAI key');
});

test('moved, not copied: Agents & Models has no key field, Connections no MCP or REST block', () => {
  assert.doesNotMatch(ENGINES, /providerKeySet|providerKeyClear|type="password"/);
  assert.doesNotMatch(MODAL, /<McpDefaultsSettings|<IntegrationsRegistry/, 'a second copy is still drawn in the modal');
  assert.doesNotMatch(MODAL, /!KEYS_READY/);
  // Creed's Connections file must not draw them either.
  const conn = read('src/renderer/src/components/settings/ConnectionsSection.tsx');
  assert.doesNotMatch(conn, /<McpDefaultsSettings|<IntegrationsRegistry/);
});

test('the footer shows a failed or partial save in the error colour, never the success one', () => {
  assert.match(MODAL, /color: saveBad \? 'var\(--cth-coral\)' : 'var\(--cth-mint\)'/);
  assert.match(MODAL, /if \(!result\.ok\) \{ setSaveBad\(true\); setSaveNote\(t\('settings\.frame\.partlySaved'/);
  assert.match(MODAL, /setSaveBusy\(true\); setSaveNote\(''\); setSaveBad\(false\);/);
});

test('strings in every language, no dashes', () => {
  for (const l of ['en', 'ar', 'zh-CN']) {
    const j = JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`));
    const k = j.settings.keys;
    const all = [k.providers.title, k.providers.info, k.providers.summary, k.envVar, k.willSave, k.willRemove, k.remove, k.undo, j.aiEngines.providersDesc];
    for (const s of all) { assert.ok(s && s.trim(), `${l}: empty`); assert.doesNotMatch(s, /[–—]| - /, `${l}: ${s}`); }
    assert.match(k.providers.summary, /\{\{n\}\}[\s\S]*\{\{total\}\}|\{\{total\}\}[\s\S]*\{\{n\}\}/);
    assert.match(k.envVar, /\{\{name\}\}/);
  }
});
