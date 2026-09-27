'use strict';

// 0.5.3 Settings redesign, the frame (founder 24 Sep 2026: "only one save
// button that saves the settings whatever changes are made, no turn on, no
// turn off, no save individually"). The draft store is run for real; the modal
// and the frame components are .tsx, so their wiring is read as source.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const { createSettingsDraft } = loadTs('src/renderer/src/components/settings/draftStore.ts');
const MODAL = read('src/renderer/src/components/SettingsModal.tsx');
const FRAME = read('src/renderer/src/components/settings/SettingsFrame.tsx');

test('staging makes the draft dirty; a later stage of a key wins', () => {
  const d = createSettingsDraft();
  assert.equal(d.dirty(), false);
  d.stage({ autoMode: false });
  d.stage({ autoMode: true, maxTurns: 40 });
  assert.equal(d.dirty(), true);
  assert.deepEqual(d.patch(), { autoMode: true, maxTurns: 40 });
  assert.equal(d.value('maxTurns', 0), 40);
  assert.equal(d.value('missing', 'fallback'), 'fallback');
  d.unstage(['autoMode', 'maxTurns']);
  assert.equal(d.dirty(), false);
});

test('a task alone makes the draft dirty, and null drops it', () => {
  const d = createSettingsDraft();
  d.setTask('key:openai', async () => undefined);
  assert.equal(d.dirty(), true);
  d.setTask('key:openai', null);
  assert.equal(d.dirty(), false);
});

test('Save is ONE config write: the form base with staged fields on top, then tasks in order', async () => {
  const d = createSettingsDraft();
  const calls = [];
  d.stage({ autoMode: false, maxTurns: 9 });
  d.setTask('b', async () => { calls.push('task b'); });
  d.setTask('a', async () => { calls.push('task a'); });
  const r = await d.commit({ maxTurns: 5, costCapTokens: 100 }, async (patch) => { calls.push(['write', patch]); });
  assert.deepEqual(calls, [['write', { maxTurns: 9, costCapTokens: 100, autoMode: false }], 'task b', 'task a']);
  assert.deepEqual(r, { ok: true, errors: [] });
  assert.equal(d.dirty(), false, 'a clean save leaves nothing staged');
});

test('a failed config write keeps everything and runs no task', async () => {
  const d = createSettingsDraft();
  let ran = false;
  d.stage({ autoMode: false });
  d.setTask('k', async () => { ran = true; });
  const r = await d.commit({}, async () => { throw new Error('disk full'); });
  assert.deepEqual(r, { ok: false, errors: [{ id: 'config', message: 'disk full' }] });
  assert.equal(ran, false);
  assert.deepEqual(d.patch(), { autoMode: false });
  assert.deepEqual(d.taskIds(), ['k']);
});

test('a failed task stays in the draft so Save can be pressed again', async () => {
  const d = createSettingsDraft();
  d.setTask('ok', async () => undefined);
  d.setTask('bad', async () => { throw new Error('broker refused'); });
  const r = await d.commit({}, async () => undefined);
  assert.equal(r.ok, false);
  assert.deepEqual(r.errors, [{ id: 'bad', message: 'broker refused' }]);
  assert.deepEqual(d.taskIds(), ['bad']);
});

test('a change made while Save is in flight survives the save', async () => {
  const d = createSettingsDraft();
  d.stage({ autoMode: false });
  let release;
  const p = d.commit({}, () => new Promise((res) => { release = res; }));
  d.stage({ autoMode: true });
  release();
  await p;
  assert.deepEqual(d.patch(), { autoMode: true }, 'the newer value was dropped by an older save');
});

test('subscribers hear every change; reset forgets the draft', () => {
  const d = createSettingsDraft();
  let n = 0;
  const off = d.subscribe(() => { n += 1; });
  d.stage({ a: 1 });
  d.setTask('t', async () => undefined);
  d.reset();
  assert.equal(n, 3);
  assert.equal(d.dirty(), false);
  off();
  d.stage({ a: 2 });
  assert.equal(n, 3);
});

test('the nav runs in the agreed order, and the new tabs join only when their file is ready', () => {
  const order = ['General', 'Prerequisites', 'Agents & Models', 'Autonomy & Budgets', 'Connections', 'Keys & Secrets', 'Voice', 'Dictation & Meetings', 'Memory & Knowledge'];
  const line = MODAL.slice(MODAL.indexOf('const NAV_SECTIONS'), MODAL.indexOf('\n\n', MODAL.indexOf('const NAV_SECTIONS')));
  assert.ok(line.includes(order.map((s) => `'${s}'`).join(', ')), 'nav order changed');
  // Integrations left the nav in batch 3 (founder 25 Sep): its endpoints are
  // Connections > Inbound integrations.
  assert.ok(!line.includes('Integrations'), 'Integrations is back in the nav');
  assert.match(line, /s !== 'Keys & Secrets' \|\| KEYS_READY/);
  for (const k of ['keysSecrets']) {
    for (const l of ['en', 'ar', 'zh-CN']) {
      const j = JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`));
      assert.ok(j.settings.nav[k], `${l} lacks settings.nav.${k}`);
      for (const f of ['about', 'aboutField', 'partlySaved']) assert.ok(j.settings.frame[f], `${l} lacks settings.frame.${f}`);
    }
  }
});

test('each redesigned section renders from its own file inside the one draft', () => {
  assert.match(MODAL, /<SettingsFrameProvider draft=\{draft\} chrome=\{chrome\}>/);
  assert.match(MODAL, /activeSection === 'Connections' && <ConnectionsSection config=\{config\} \/>/);
  assert.ok(!MODAL.includes('IntegrationsSection'), 'the Integrations tab is gone');
  assert.match(MODAL, /activeSection === 'Keys & Secrets' && <KeysSecretsSection config=\{config\} \/>/);
  for (const f of ['ConnectionsSection', 'InboundIntegrations', 'KeysSecretsSection']) {
    const src = read(`src/renderer/src/components/settings/${f}.tsx`);
    assert.doesNotMatch(src, /window\.cth\.updateConfig\(/, `${f} writes config itself; stage into the draft`);
  }
});

test('Save commits the draft, and is enabled only when something changed', () => {
  const i = MODAL.indexOf('const saveAll');
  const body = MODAL.slice(i, MODAL.indexOf('\n  };', i));
  assert.match(body, /draft\.commit\(base, \(patch\) => window\.cth\.updateConfig\(patch\)\)/);
  assert.match(MODAL, /const dirty = stagedDirty \|\| draft\.dirty\(\) \|\| formPatchKey !== formBase\.current;/);
  assert.match(MODAL, /disabled=\{saveBusy \|\| !dirty\}/);
  // Close without saving throws the draft away.
  const c = MODAL.indexOf('const requestClose');
  assert.match(MODAL.slice(c, c + 300), /draft\.reset\(\);/);
});

test('the frame primitives: a folding section and an (i) that never becomes a paragraph', () => {
  assert.match(FRAME, /export function CollapsibleSection/);
  assert.match(FRAME, /aria-expanded=\{open\}/);
  assert.match(FRAME, /export function InfoTip/);
  assert.match(FRAME, /role="tooltip"/);
  assert.match(FRAME, /position: 'fixed'/, 'the tip must not be clipped by the scrolling pane');
  // Even 1px borders only, tokens only.
  assert.doesNotMatch(FRAME, /border(Top|Left|Right|Bottom)?: '[2-9]px/);
  assert.doesNotMatch(FRAME, /#[0-9a-fA-F]{3,6}\b/);
});
