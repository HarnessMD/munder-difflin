'use strict';

// 0.5.3, founder batch 3 (25 Sep 2026), Settings:
//   #2  Desktop notifications autosaved and never lit Save.
//   #6  Keys & Secrets: MCP servers go (they live in Capabilities); "REST
//       tokens" becomes "Add custom secret": a name and a value, stored
//       encrypted on this machine, read by every agent as the env var of that
//       name. Name ^[A-Z0-9_]+$, checked inline, applied on Save.
//   Voice: only the OpenAI key stays; the section is "Orchestrator's voice".
//   #15 Organisation keys do not exist: the setting is gone everywhere.
//
// The name rule, the spawn env and the Save task run for real (the task inside
// the real draft store, against a fake store); the .tsx wiring is read as source.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const S = loadTs('src/shared/customSecrets.ts');
const { createSettingsDraft } = loadTs('src/renderer/src/components/settings/draftStore.ts');
const MODAL = read('src/renderer/src/components/SettingsModal.tsx');
const KEYS = read('src/renderer/src/components/settings/KeysSecretsSection.tsx');
const MAIN = read('src/main/index.ts');

test('#2 Desktop notifications are staged on the draft: Save lights, nothing is written on click', () => {
  assert.doesNotMatch(MODAL, /setNotifications\(/, 'the switch still writes through its own IPC');
  assert.match(MODAL, /const notifications = draft\.value<boolean>\('notifications', notificationsSaved\);/);
  assert.match(MODAL, /else draft\.stage\(\{ notifications: next \}\);/);
  // The draft is what `dirty` reads, so staging it lights Save.
  const d = createSettingsDraft();
  assert.equal(d.dirty(), false);
  d.stage({ notifications: true });
  assert.equal(d.dirty(), true, 'a staged switch does not light Save');
  assert.equal(d.value('notifications', false), true);
  d.unstage(['notifications']);
  assert.equal(d.dirty(), false, 'switching back does not put Save out');
});

test('#6 a secret name is capitals, digits and underscores; the harness\'s own names are refused', () => {
  for (const ok of ['GITHUB_TOKEN', 'A', '_X', 'STRIPE_KEY_2', '9LIVES']) assert.equal(S.secretNameProblem(ok), null, ok);
  for (const bad of ['github_token', 'My-Token', 'A B', 'TOKÉN', 'X.Y', 'A$']) assert.equal(S.secretNameProblem(bad), 'shape', bad);
  assert.equal(S.secretNameProblem(''), 'empty');
  assert.equal(S.secretNameProblem('A'.repeat(65)), 'long');
  for (const r of ['PATH', 'HOME', 'AGENT_ID', 'HIVE_ROOT', 'OPENAI_API_KEY']) assert.equal(S.secretNameProblem(r), 'reserved', r);
  assert.equal(String(S.SECRET_NAME_RE), '/^[A-Z0-9_]+$/');
});

test('#6 every agent gets each secret as an env var, never over a var the harness set', () => {
  const store = { 'env:GITHUB_TOKEN': 'ghp_1', 'env:STRIPE_KEY': 'sk_2', 'env:AGENT_ID': 'evil', 'apikey:openai': 'sk-x', 'int:foo': 'y' };
  const names = S.customSecretNames(Object.keys(store));
  assert.deepEqual(names, ['GITHUB_TOKEN', 'STRIPE_KEY'], 'names come from env: refs, reserved ones never listed');
  const env = S.customSecretEnv(names, (ref) => store[ref], { STRIPE_KEY: 'set by the harness' });
  assert.deepEqual(env, { GITHUB_TOKEN: 'ghp_1' });
  // Main: listed from the store, read main only, merged at spawn for every hive agent.
  assert.match(MAIN, /if \(opts\.hive\) \{\n\s+const custom = customSecretEnv\(customSecretNames\(integrations\.listSecretRefs\(\)\), integrations\.getSecret, opts\.env \?\? \{\}\);\n\s+if \(Object\.keys\(custom\)\.length > 0\) opts\.env = \{ \.\.\.\(opts\.env \?\? \{\}\), \.\.\.custom \};/);
  assert.match(read('src/main/integrations.ts'), /export function listSecretRefs\(\): string\[\] \{\n\s+return Object\.keys\(readSecretBlob\(\)\);/);
});

test('#6 main checks the name again, stores the value encrypted, and never hands one back', () => {
  assert.match(MAIN, /ipcMain\.handle\('customSecret:list', \(\) => customSecretNames\(integrations\.listSecretRefs\(\)\)\);/);
  const set = MAIN.slice(MAIN.indexOf("ipcMain.handle('customSecret:set'"), MAIN.indexOf("ipcMain.handle('customSecret:remove'"));
  assert.match(set, /const problem = secretNameProblem\(p\.name\);\n\s+if \(problem\) return \{ ok: false/);
  assert.match(set, /return integrations\.setSecret\(customSecretRef\(p\.name\), p\.value\);/);
  assert.doesNotMatch(MAIN, /customSecret:get|getSecret\(customSecretRef/, 'a value can be read back over IPC');
  const pre = read('src/preload/index.ts');
  assert.match(pre, /customSecretList: \(\): Promise<string\[\]>/);
});

test('#6 add and remove wait for Save; a refusal stays in the draft with its reason', async () => {
  const calls = [];
  const store = {
    set: async (n, v) => { calls.push(['set', n, v]); return n === 'BAD' ? { ok: false, error: 'BAD refused' } : { ok: true }; },
    remove: async (n) => { calls.push(['remove', n]); return { ok: true }; }
  };
  const d = createSettingsDraft();
  const done = [];
  d.setTask(S.secretTaskId('GITHUB_TOKEN'), S.secretTask('GITHUB_TOKEN', { kind: 'set', value: 'ghp_1' }, store, () => done.push('GITHUB_TOKEN')));
  d.setTask(S.secretTaskId('OLD'), S.secretTask('OLD', { kind: 'remove' }, store, () => done.push('OLD')));
  d.setTask(S.secretTaskId('BAD'), S.secretTask('BAD', { kind: 'set', value: 'x' }, store, () => done.push('BAD')));
  assert.deepEqual(calls, [], 'something was stored before Save');
  assert.equal(d.dirty(), true);
  const r = await d.commit({}, async () => undefined);
  assert.deepEqual(calls, [['set', 'GITHUB_TOKEN', 'ghp_1'], ['remove', 'OLD'], ['set', 'BAD', 'x']]);
  assert.deepEqual(done, ['GITHUB_TOKEN', 'OLD']);
  assert.equal(r.ok, false);
  assert.match(r.errors[0].message, /BAD refused/);
  assert.equal(d.hasTask(S.secretTaskId('BAD')), true, 'the refused secret was dropped');
});

test('#6 the section: provider keys and Add custom secret, name checked inline, value masked', () => {
  assert.doesNotMatch(KEYS, /McpDefaultsSettings|IntegrationsRegistry|keys-mcp|keys-rest/, 'MCP servers or REST tokens are back');
  assert.match(KEYS, /<CollapsibleSection\n\s+id="keys-custom"\n\s+title=\{t\('settings\.keys\.custom\.title'\)\}/);
  assert.match(KEYS, /const problem = name \? secretNameProblem\(name\) : null;/);
  assert.match(KEYS, /const canAdd = !!name && !problem && !!value;/);
  assert.match(KEYS, /<span role="alert"[^>]*data-secret-problem=\{problem\}>\{problemText\}<\/span>/);
  assert.match(KEYS, /aria-invalid=\{!!problem\}/);
  assert.match(KEYS, /type="password"\n\s+autoComplete="off"\n\s+aria-label=\{t\('settings\.keys\.custom\.value'\)\}/);
  assert.match(KEYS, /draft\?\.setTask\(secretTaskId\(n\), secretTask\(n, \{ kind: 'set', value \}/, 'Add stores at once instead of on Save');
  assert.match(KEYS, /draft\?\.setTask\(secretTaskId\(n\), secretTask\(n, \{ kind: 'remove' \}/);
  assert.doesNotMatch(KEYS, /window\.cth\.customSecretSet\(\{ name, value \}\)\.then|await window\.cth\.customSecret/, 'a direct write outside the draft');
});

test('Orchestrator\'s voice: only the OpenAI key, staged for Save', () => {
  const i = MODAL.indexOf("{activeSection === 'Voice' && (");
  const block = MODAL.slice(i, MODAL.indexOf('{/* 0.5.3, feature 24:', i));
  assert.equal((block.match(/<input/g) || []).length, 1, 'more than the key in the section');
  assert.match(block, /t\('settings\.voice\.title'\)/);
  assert.match(block, /type="password"/);
  assert.doesNotMatch(block, /RealtimeDevicePicker|CostHud|idleDisconnect|freeflow|groq|<select|<Btn/i, 'something other than the key is back');
  assert.doesNotMatch(MODAL, /saveOpenAiVoiceKey|RealtimeDevicePicker|CostHud/, 'the removed controls still save');
  for (const [l, want] of [['en', "Orchestrator's voice"], ['zh-CN', '调度者的语音'], ['ar', 'صوت المنسّق']]) {
    const j = JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`));
    assert.equal(j.settings.nav.voice, want, `${l} nav`);
    assert.equal(j.settings.voice.title, want, `${l} heading`);
  }
});

test('Groq API for Dictation: key and model directly under the engine list, only while Groq is picked; no "Free Flow" wording', () => {
  const TS = read('src/renderer/src/components/TranscribeSettings.tsx');
  // Directly under the engine dropdown's label, and only for Groq (the view is saved + pending).
  assert.match(TS, /<span style=\{hintStyle\}>\{t\('settings\.transcribe\.engineHint'\)\}<\/span>\n\s+<\/label>\n\s+\{cfg\.engine === 'groq' && groqFields\}/, 'the Groq fields are not right under the engine list');
  const i = MODAL.indexOf("{activeSection === 'Dictation & Meetings' && (");
  const block = MODAL.slice(i, MODAL.indexOf("{activeSection === 'Memory & Knowledge'", i));
  assert.match(block, /<TranscribeSettings\n\s+config=\{config\}\n\s+groqFields=\{/);
  assert.match(block, /data-groq-dictation/);
  assert.match(block, /t\('settings\.transcribe\.groqTitle'\)/);
  assert.match(block, /value=\{groqKey\}/);
  assert.match(block, /value=\{freeflowModel\}/);
  assert.doesNotMatch(block, /settings\.voice\.freeFlow'|Free Flow/, 'Free Flow wording is back in the section');
  assert.doesNotMatch(MODAL, /toggleFreeflow|freeflowEnabled/, 'a Free Flow switch is back');
  // Groq can be picked without a key: picking it is what shows the key field.
  assert.match(TS, /<option value="groq">\{t\('settings\.transcribe\.engineGroq'\)\}/);
  assert.match(MODAL, /await window\.cth\.freeflowSetConfig\(\{ apiKey, model \}\);/);
  for (const [l, want] of [['en', 'GROQ API for Dictation'], ['zh-CN', '用于听写的 GROQ API'], ['ar', 'GROQ API للإملاء']]) {
    const j = JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`));
    assert.equal(j.settings.transcribe.groqTitle, want, l);
    for (const k of ['freeFlow', 'freeFlowTitle', 'freeFlowDesc']) assert.equal(j.settings.voice[k], undefined, `${l}: settings.voice.${k}`);
  }
});

test('Free Flow is always on: the composer mic, the Option hold and main never read a switch; an old false is ignored', () => {
  for (const f of ['src/renderer/src/components/pro/Composer.tsx', 'src/renderer/src/components/MessageQueueComposer.tsx', 'src/renderer/src/components/pro/AgentsScreen.tsx', 'src/renderer/src/freeflow/holdOption.ts', 'src/renderer/src/store/store.ts', 'src/renderer/src/App.tsx', 'src/main/realtimeActions.ts']) {
    assert.doesNotMatch(read(f), /freeflowEnabled/, f);
  }
  assert.doesNotMatch(MAIN.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ''), /freeflowEnabled/, 'main still reads the switch');
  assert.match(MAIN, /return anyAppStandsAside\(true, mainDictationFocus\);/);
  // The mic gate: an app window may always dictate; the puck's page only while it records.
  assert.match(MAIN, /const micFeatureLive = \(wc: Electron\.WebContents \| null\): boolean => \{\n\s+if \(!isPuckContents\(wc\)\) return true;\n\s+const cfg = readConfig\(\);\n\s+return cfg\.realtimeVoiceEnabled === true \|\| puckMicLive\(\);/);
  assert.match(read('src/main/puck.ts'), /export function isPuckContents\(wc: Electron\.WebContents \| null \| undefined\): boolean \{\n\s+return !!wc && !!win && !win\.isDestroyed\(\) && win\.webContents === wc;/);
});

test('#15 the Trigger History Organization section and the Inbox Organisation peers thread are gone, with their strings', () => {
  const hist = read('src/renderer/src/components/triggers/TriggerHistoryTab.tsx');
  assert.doesNotMatch(hist, /sectionOrg|emptyOrg|key: 'org'/);
  assert.match(hist, /type Source = 'webhook';/);
  const inbox = read('src/renderer/src/components/pro/InboxScreen.tsx');
  assert.doesNotMatch(inbox, /pro\.inbox\.peers|source: 'org'|source === 'org'/);
  for (const l of ['en', 'ar', 'zh-CN']) {
    const j = JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`));
    for (const k of ['sectionOrg', 'sectionOrgBlurb', 'emptyOrgTitle', 'emptyOrgBody']) assert.equal(j.triggerHistory[k], undefined, `${l}: triggerHistory.${k}`);
    for (const k of ['peers', 'peersSub']) assert.equal(j.pro.inbox[k], undefined, `${l}: pro.inbox.${k}`);
    assert.equal(j.orgSection, undefined, `${l}: orgSection`);
    assert.doesNotMatch(j.pro.autos.historyHint, /organisation|组织|المؤسسة/i, `${l}: the Automations hint still names organisation messages`);
  }
});

test('#15 the organisation trigger is gone everywhere: Automations, the Classic Triggers tab, the store, preload, main', () => {
  const A = loadTs('src/renderer/src/components/pro/autoData.ts');
  assert.deepEqual(A.AUTO_KINDS, ['schedule', 'context', 'webhook']);
  const rows = A.projectRows({ missions: [], context: null, webhooks: [], org: { apiKey: 'k', enabled: true, mode: 'strict' }, history: [] });
  assert.deepEqual(rows, [], 'an org row is still projected');
  const files = ['src/renderer/src/components/pro/AutomationsScreen.tsx', 'src/renderer/src/components/triggers/TriggersTab.tsx', 'src/renderer/src/components/triggers/api.ts', 'src/renderer/src/store/store.ts', 'src/renderer/src/App.tsx', 'src/preload/index.ts', 'src/main/index.ts', 'src/main/config.ts', 'src/shared/triggers.ts', 'src/shared/permissions.ts'];
  for (const f of files) assert.doesNotMatch(read(f), /OrgTrigger|orgTrigger|org:getTrigger|org:setTrigger|OrgEditor|OrgSection|org\.trigger\.key|CLONE_NODE_BLURB/, f);
  assert.ok(!fs.existsSync(path.join(root, 'src/renderer/src/components/triggers/OrgSection.tsx')));
});

test('#15 no organisation key anywhere in Settings or the Team window', () => {
  assert.ok(!fs.existsSync(path.join(root, 'src/renderer/src/components/team/OrgTriggerKey.tsx')));
  for (const f of ['src/renderer/src/components/SettingsModal.tsx', 'src/renderer/src/components/team/OrgPanel.tsx', 'src/renderer/src/components/team/TeamWindow.tsx', 'src/renderer/src/components/settings/ConnectionsSection.tsx']) {
    assert.doesNotMatch(read(f).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ''), /OrgTriggerKey|orgKey|settings\.connections\.organisation/, f);
  }
});

test('no MCP servers UI anywhere in Settings (founder: "MCP section needs to be removed entirely"); Capabilities keeps its own', () => {
  assert.ok(!fs.existsSync(path.join(root, 'src/renderer/src/components/McpDefaultsSettings.tsx')), 'the Settings MCP section is back');
  const settingsFiles = ['src/renderer/src/components/SettingsModal.tsx', ...fs.readdirSync(path.join(root, 'src/renderer/src/components/settings'), { withFileTypes: true }).filter((e) => e.isFile()).map((e) => `src/renderer/src/components/settings/${e.name}`)];
  const code = (f) => read(f).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
  for (const f of settingsFiles) assert.doesNotMatch(code(f), /mcp/i, `${f} still draws MCP`);
  for (const l of ['en', 'ar', 'zh-CN']) assert.equal(JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`)).mcpDefaults, undefined, `${l}: the Settings MCP strings are back`);
  assert.match(read('src/renderer/src/components/pro/CapabilitiesScreen.tsx'), /mcpDefaults/, 'Capabilities lost its MCP listing');
});

test('strings in every language, no dashes', () => {
  for (const l of ['en', 'ar', 'zh-CN']) {
    const c = JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`)).settings.keys.custom;
    const all = [c.title, c.info, c.summary, c.name, c.value, c.add, c.willReplace, c.problem.shape, c.problem.long, c.problem.reserved, c.problem.empty];
    for (const s of all) { assert.ok(s && s.trim(), `${l}: empty`); assert.doesNotMatch(s, /[–—]| - /, `${l}: ${s}`); }
    assert.match(c.summary, /\{\{count\}\}/);
  }
});
