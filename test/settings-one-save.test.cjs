'use strict';

// A1: one Save button. Settings used to persist three different ways — toggles
// wrote on click, some sections had their own Save, a couple of fields saved on
// blur — and nothing told the user which kind they were looking at.
//
// SettingsModal is a 2000-line TSX with a wide import graph, so these read the
// source rather than mounting it. That is the existing house pattern for this
// file, and it holds the RULE, which is what actually regressed.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const MODAL = read('src/renderer/src/components/SettingsModal.tsx');

test('there is exactly one writer of config in the whole modal', () => {
  const calls = MODAL.match(/window\.cth\.updateConfig\(/g) ?? [];
  assert.equal(calls.length, 1,
    `${calls.length} updateConfig calls — every setting must go through saveAll`);
});

test('the one writer is saveAll, and it sends a single merged patch', () => {
  const i = MODAL.indexOf('const saveAll');
  assert.ok(i > 0, 'saveAll is gone');
  const body = MODAL.slice(i, MODAL.indexOf('\n  };', i));
  assert.match(body, /window\.cth\.updateConfig\(patch\)/,
    'saveAll must write one patch, not several calls');
  for (const part of ['maxTurnsPatch()', 'budgetPatch()', '...pending']) {
    assert.ok(body.includes(part), `saveAll does not include ${part}`);
  }
});

test('toggles stage their change instead of writing it', () => {
  // The specific toggles that used to persist the instant you clicked them.
  for (const key of ['strongKeepalive', 'autoMode', 'orchestratorMaySpawn',
                     'semanticMemory', 'autoUpdate', 'telemetryEnabled']) {
    const re = new RegExp(`stage\\(\\{ ${key}:`);
    assert.match(MODAL, re, `${key} is not staged`);
  }
});

test('closing with staged changes asks first, instead of dropping them', () => {
  assert.match(MODAL, /const requestClose/, 'no close guard');
  const i = MODAL.indexOf('const requestClose');
  const body = MODAL.slice(i, i + 300);
  assert.match(body, /dirty/, 'the guard does not check for staged changes');
  assert.match(body, /window\.confirm/, 'the guard does not actually ask');
  // And the footer button must use it, not raw onClose.
  assert.match(MODAL, /onClick=\{requestClose\}/, 'the footer Close bypasses the guard');
});

test('the footer offers Save, and it is the only Save left in the modal', () => {
  assert.match(MODAL, /onClick=\{\(\) => void saveAll\(\)\}/, 'no footer Save');
  // The per-section Save buttons this replaced are gone.
  assert.doesNotMatch(MODAL, /onClick=\{saveBudget\}/, 'the budget Save button is back');
  assert.doesNotMatch(MODAL, /onBlur=\{\(\) => void saveMaxTurns\(\)\}/, 'maxTurns saves on blur again');
});

// --- the two deliberate exceptions ------------------------------------------

test('API keys save with the page: a typed key is a draft task the footer Save runs', () => {
  // The broker is write-only, so a key is never read back to diff it; since
  // 0.5.3 (Keys & Secrets) it is staged as a task instead of saved on the spot.
  const keys = read('src/renderer/src/components/settings/KeysSecretsSection.tsx');
  assert.match(keys, /draft\?\.setTask\(keyTaskId\(backend\), edit \? keyTask\(/, 'a typed key is no longer a draft task');
  assert.doesNotMatch(read('src/renderer/src/components/AiEnginesSettings.tsx'), /providerKeySet|saveKey\(/, 'a second, immediate key save came back');
  // Orchestrator's voice (batch 3): the OpenAI key there is the same task.
  assert.match(MODAL, /draft\.setTask\(keyTaskId\('openai'\), edit \? keyTask\('openai'/, 'the voice key saves on its own again');
  assert.doesNotMatch(MODAL, /saveOpenAiVoiceKey|<Btn size="sm" onClick=\{\(\) => void save/, 'a per field Save came back on the voice key');
});

test('Free Flow\'s Groq key and model wait for Save too; there is no switch any more', () => {
  // 0.5.3 (founder: "no turn on, no turn off, no save individually"): the key
  // and model are one draft task. Batch 3: Free Flow has no on/off; they show
  // only while Groq is the dictation engine.
  assert.match(MODAL, /draft\.setTask\('freeflow', key === freeflowBase\.current \? null : async \(\) => \{\n\s+await window\.cth\.freeflowSetConfig\(\{ apiKey, model \}\);\n\s+freeflowBase\.current = key;/);
  assert.doesNotMatch(MODAL, /toggleFreeflow|setFreeflowEnabled/, 'the switch is back');
});

test('Desktop notifications wait for Save: staged on the draft, never written on click', () => {
  // Founder batch 3 #2: the switch wrote at once and never lit Save.
  assert.doesNotMatch(MODAL, /window\.cth\.setNotifications\(/, 'the switch writes on click again');
  assert.match(MODAL, /const notifications = draft\.value<boolean>\('notifications', notificationsSaved\);/);
  assert.match(MODAL, /if \(next === notificationsSaved\) draft\.unstage\(\['notifications'\]\);\n\s+else draft\.stage\(\{ notifications: next \}\);/);
});

// --- A2: Connections tidying -------------------------------------------------

// 0.4.10 MOVED THESE DEFINITIONS, IT DID NOT LOOSEN THEM.
//
// The heading and the rule used to be two consts at the top of SettingsModal.
// PRO embeds the same body as a page, and until 0.4.10 that page drew the
// Classic pixel form under a kit Bar, so each of them needed a SECOND answer.
// They now live in pro/settings/chrome.ts, which returns one style set per
// chrome, and SettingsModal destructures it.
//
// The rule these two tests held — defined once, never written out inline — is
// unchanged. What "once" means is now "once per skin, in the one module", so
// both skins' values are pinned here as well: a PRO shape leaking into Classic
// (or the reverse) is exactly the regression the split exists to prevent, and
// only asserting "it is defined somewhere" would not catch it.
const CHROME = read('src/renderer/src/components/pro/settings/chrome.ts');

test('the section heading is defined once per skin, in the chrome module, never inline', () => {
  assert.doesNotMatch(MODAL, /const sectionHead\w* = /, 'the form defines a heading of its own again');
  assert.match(CHROME, /sectionHead: CLASSIC_HEAD,/, "Classic's heading is gone from the chrome module");
  assert.match(CHROME, /sectionHead: SECTION_H,/, "PRO's heading is gone from the chrome module");
  const display = CHROME.match(/fontFamily: 'var\(--cth-font-display\)', fontSize: 8, lineHeight: '12px',/g) ?? [];
  assert.equal(display.length, 1, `${display.length} copies of the pixel heading — only CLASSIC_HEAD should carry it`);
  const inModal = MODAL.match(/var\(--cth-font-display\)/g) ?? [];
  assert.equal(inModal.length, 0, `${inModal.length} pixel faces remain inline in the form`);
});

test('the divider between Connections sections is defined once per skin too', () => {
  assert.doesNotMatch(MODAL, /const sectionRule = /, 'the form defines a rule of its own again');
  assert.match(CHROME, /rule: \{ height: 2, background: 'var\(--cth-ink-300\)' \}/, "Classic's 2px rule moved or changed");
  assert.match(CHROME, /rule: \{ height: 1, background: 'var\(--cth-ink-300\)' \}/, "PRO's rule is not a hairline");
  const inline = MODAL.match(/\{\{ height: 2, background: 'var\(--cth-ink-300\)' \}\}/g) ?? [];
  assert.equal(inline.length, 0, 'an inline divider survived the extraction');
});

test('no integration was removed from Connections', () => {
  // The founder was explicit: nothing is deleted from this tab. Since 0.5.3
  // the tab draws from components/settings: Slack and the webhook default in
  // ConnectionsSection, the webhook endpoints in IntegrationsSection.
  const conn = fs.readFileSync(path.join(__dirname, '..', 'src/renderer/src/components/settings/ConnectionsSection.tsx'), 'utf8');
  const integ = fs.readFileSync(path.join(__dirname, '..', 'src/renderer/src/components/settings/InboundIntegrations.tsx'), 'utf8');
  assert.match(MODAL, /<ConnectionsSection config=\{config\} \/>/);
  assert.match(conn, /settings\.conn\.slack\.title/, 'Slack vanished from Connections');
  assert.match(conn, /slackStart|slackStop/, 'the Slack lifecycle is gone');
  assert.match(integ, /saveWebhooks\(pending\.hooks\.filter\(/, 'the webhook endpoints are gone');
});
