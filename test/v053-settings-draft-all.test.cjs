'use strict';

// 0.5.3 Settings redesign, the last self-saving sections moved onto the one
// draft (founder 24 Sep 2026: "only one save button that saves the settings
// whatever changes are made, no turn on, no turn off, no save individually").
// The pending-patch and REST overlay logic runs for real inside the real draft
// store; the seven .tsx sections are read as source.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const C = 'src/renderer/src/components';
const { createSettingsDraft } = loadTs(`${C}/settings/draftStore.ts`);
const { mergePending, isEmptyPatch, pendingFor, setPendingFor, sameValue } = loadTs(`${C}/settings/pendingPatch.ts`);
const { overlayRows, restTaskId } = loadTs(`${C}/settings/restPending.ts`);

test('a pending patch keeps only what differs from live, whatever the key order', () => {
  const live = { engine: 'auto', anyApp: true, customWords: ['a'], nested: { x: 1, y: 2 } };
  let p = mergePending(live, {}, { engine: 'whisper' });
  assert.deepEqual(p, { engine: 'whisper' });
  p = mergePending(live, p, { anyApp: false });
  assert.deepEqual(p, { engine: 'whisper', anyApp: false });
  p = mergePending(live, p, { engine: 'auto' });
  assert.deepEqual(p, { anyApp: false }, 'set back to live, the field drops out');
  p = mergePending(live, p, { anyApp: true, nested: { y: 2, x: 1 } });
  assert.equal(isEmptyPatch(p), true, 'the same object in another key order is no change');
  assert.equal(sameValue({ a: 1, b: [1, { c: 2, d: 3 }] }, { b: [1, { d: 3, c: 2 }], a: 1 }), true);
  assert.equal(sameValue([1, 2], [2, 1]), false, 'array order still counts');
});

test('the patch lives with its draft: another tab and back still shows it; a new draft starts clean', () => {
  const d = createSettingsDraft();
  setPendingFor(d, 'transcribe', { engine: 'whisper' });
  assert.deepEqual(pendingFor(d, 'transcribe'), { engine: 'whisper' });
  assert.deepEqual(pendingFor(createSettingsDraft(), 'transcribe'), {});
  setPendingFor(d, 'transcribe', {});
  assert.deepEqual(pendingFor(d, 'transcribe'), {}, 'an empty patch is forgotten');
});

test('Save sends the patch once through the section\'s own setter; a failure keeps it for another Save', async () => {
  // The same wiring usePendingPatch builds, run against the real draft store.
  const d = createSettingsDraft();
  const live = { engine: 'auto', anyApp: true };
  const sent = [];
  let refuse = true;
  const change = (patch) => {
    const prev = d.hasTask('transcribe') ? pendingFor(d, 'transcribe') : {};
    const next = mergePending(live, prev, patch);
    setPendingFor(d, 'transcribe', next);
    d.setTask('transcribe', isEmptyPatch(next) ? null : async () => {
      sent.push(next);
      if (refuse) throw new Error('main said no');
      setPendingFor(d, 'transcribe', null);
    });
  };
  change({ engine: 'whisper' });
  change({ anyApp: false });
  assert.deepEqual(sent, [], 'a click reached main before Save');
  let r = await d.commit({}, async () => undefined);
  assert.equal(r.ok, false);
  assert.deepEqual(d.taskIds(), ['transcribe']);
  refuse = false;
  r = await d.commit({}, async () => undefined);
  assert.equal(r.ok, true);
  assert.deepEqual(sent, [{ engine: 'whisper', anyApp: false }, { engine: 'whisper', anyApp: false }]);
  assert.equal(d.dirty(), false);
  change({ engine: 'whisper' });
  change({ engine: 'auto' });
  assert.equal(d.dirty(), false, 'a change undone by hand leaves Save quiet');
});

test('REST tokens: the list is the stored rows with the waiting changes laid over them', () => {
  const stored = [{ id: 'gh', label: 'GitHub' }, { id: 'linear', label: 'Linear' }];
  const changes = {
    gh: { kind: 'save', view: { id: 'gh', label: 'GitHub work' } },
    linear: { kind: 'remove' },
    stripe: { kind: 'save', view: { id: 'stripe', label: 'Stripe' }, secret: 'sk' },
    stale: { kind: 'save', view: { id: 'stale', label: 'Saved already' } }
  };
  const waiting = (id) => id !== 'stale';
  assert.deepEqual(overlayRows(stored, changes, waiting), [
    { row: { id: 'gh', label: 'GitHub work' }, state: 'save' },
    { row: { id: 'linear', label: 'Linear' }, state: 'remove' },
    { row: { id: 'stripe', label: 'Stripe' }, state: 'save' }
  ]);
  assert.deepEqual(overlayRows(stored, changes, () => false).map((x) => x.state), ['stored', 'stored'], 'a closed page shows what is stored');
  assert.equal(restTaskId('gh'), 'rest:gh');
});

test('no section writes on its own any more: each stages into the draft', () => {
  const sections = ['ResponseStyleSection.tsx', 'AiEnginesSettings.tsx', 'OfficeThemePicker.tsx', 'IntegrationsRegistry.tsx', 'TranscribeSettings.tsx'];
  for (const f of sections) {
    const src = read(`${C}/${f}`);
    // Outside Settings (no draft) a section still applies at once, through the
    // shared helper, so no section keeps a write of its own.
    // The theme switch is the one exception, and it runs AS the Save task: it
    // writes officeTheme only after the agents are archived, so an aborted
    // switch never persists a theme half applied.
    const writes = src.match(/window\.cth\.updateConfig\([^)]*\)/g) ?? [];
    assert.deepEqual(writes, f === 'OfficeThemePicker.tsx' ? ['window.cth.updateConfig({ officeTheme: id })'] : [], `${f} writes config itself`);
    assert.match(src, /from '\.\/settings\/SettingsFrame'/, `${f} is not on the draft`);
  }
  assert.match(read(`${C}/ResponseStyleSection.tsx`), /useConfigValue\(config, 'responseStyle', saved\)/);
  assert.doesNotMatch(read(`${C}/ResponseStyleSection.tsx`), /t\('responseStyle\.save'\)/, 'the Save style button is back');
  assert.match(read(`${C}/AiEnginesSettings.tsx`), /useConfigValue\(config, 'providerBaseUrls', \{\}\)/);
  assert.match(read(`${C}/AiEnginesSettings.tsx`), /useConfigValue\(config, 'providerDefaultModels', \{\}\)/);
  const theme = read(`${C}/OfficeThemePicker.tsx`);
  assert.match(theme, /useConfigValue\(config, 'tvShowOffices', false\)/);
  assert.match(theme, /page\.setTask\('office:theme', \(\) => applyTheme\(id, true\)\)/, 'the theme switch runs at Save');
  assert.match(theme, /if \(strict\) throw e;/, 'a failed switch stays in the draft');
  const reg = read(`${C}/IntegrationsRegistry.tsx`);
  assert.match(reg, /page\.setTask\(restTaskId\(rec\.id\), async \(\) => \{\n\s+const res = await integrationsClient\.save\(rec, secret\);\n\s+if \(!res\.ok\) throw/);
  assert.match(reg, /page\.setTask\(restTaskId\(r\.id\), async \(\) => \{\n\s+await integrationsClient\.remove\(r\.id\);/);
  const tr = read(`${C}/TranscribeSettings.tsx`);
  assert.match(tr, /usePendingPatch<TranscribeConfig>\('transcribe', live, async \(patch\) => \{\n\s+const r = await window\.cth\.transcribeSetConfig\(patch\);/);
  assert.doesNotMatch(tr, /wordsTimer|setTimeout\(\(\) => \{ void save/, 'the words box saves itself again');
  const modal = read(`${C}/SettingsModal.tsx`);
  assert.doesNotMatch(modal, /onClick=\{\(\) => saveFreeflow\(\)\}/, 'Free Flow has its own Save again');
});

test('the shared helpers: a staged value set back to disk unstages; outside Settings it writes at once', () => {
  const f = read(`${C}/settings/SettingsFrame.tsx`);
  assert.match(f, /if \(sameValue\(v, onDisk\)\) draft\.unstage\(\[key as string\]\);\n\s+else draft\.stage\(\{ \[key\]: v \}\);/);
  assert.match(f, /if \(!draft\) \{ void window\.cth\.updateConfig\(\{ \[key\]: v \} as Partial<HarnessConfig>\); return; \}/);
  assert.match(f, /draft\.setTask\(id, isEmptyPatch\(next\) \? null : async \(\) => \{ await apply\(next\); setPendingFor\(draft, id, null\); \}\);/);
});

test('strings in every language, no dashes', () => {
  for (const l of ['en', 'ar', 'zh-CN']) {
    const j = JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`));
    for (const s of [j.settings.frame.onSave, j.settings.frame.done, j.officeTheme.onSave, j.officeTheme.deleteOnSave]) {
      assert.ok(s && s.trim(), `${l}: empty`);
      assert.doesNotMatch(s, /[–—]| - /, `${l}: ${s}`);
    }
    assert.match(j.officeTheme.deleteOnSave, /\{\{count\}\}/);
  }
});
