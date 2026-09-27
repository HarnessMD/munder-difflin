/**
 * AUTOMATIONS CAN SET WHO ANSWERS A WEBHOOK (0.5.3, after #108; Kevin 24 Sep:
 * "add the 'Answered by' (to) picker to the Automations webhook editor so
 * both screens can set it").
 *
 * Settings > Integrations and Automations edit the same WebhookTrigger list,
 * so they must write the same field the same way:
 *   - the picker is the shared AgentPicker, bound to `hook.to`;
 *   - clearing it sends '' (main keeps the stored `to` when the field is
 *     absent, so undefined would silently keep the old agent);
 *   - main resolves '' to the webhook default, then the orchestrator.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const { resolveWebhookRecipient } = loadTs('src/shared/responder.ts');

const auto = read('src/renderer/src/components/pro/AutomationsScreen.tsx');
const editor = auto.slice(auto.indexOf('function WebhookEditor('), auto.indexOf('function OrgEditor('));

test('the Automations webhook editor has the Answered by picker, bound to the endpoint agent', () => {
  assert.match(auto, /import \{ AgentPicker \} from '\.\.\/settings\/primitives';/);
  assert.match(editor, /<AgentPicker value=\{hook\.to \?\? ''\} onChange=\{\(to\) => onPatch\(\{ to \}\)\}/);
  assert.match(editor, /t\('settings\.conn\.answeredBy'\)/, 'same label as Settings > Integrations');
});

test('clearing the picker sends an empty string, never undefined, so main drops the stored agent', () => {
  assert.doesNotMatch(editor, /to: to \|\| undefined/);
  const idx = read('src/main/index.ts');
  // Main: a string is taken (or dropped if not a valid id); an absent field keeps the prior one.
  assert.match(idx, /typeof r\.to === 'string' \? \(\/\^\[A-Za-z0-9\._-\]\{1,80\}\$\/\.test\(r\.to\.trim\(\)\) \? \{ to: r\.to\.trim\(\) \} : \{\}\) : \(prior\?\.to \? \{ to: prior\.to \} : \{\}\)/);
});

test('an empty choice falls to the webhook default, then the orchestrator', () => {
  assert.equal(resolveWebhookRecipient('', 'jim', ['jim', 'pam'], 'god'), 'jim');
  assert.equal(resolveWebhookRecipient('', '', ['jim'], 'god'), 'god');
  assert.equal(resolveWebhookRecipient('pam', 'jim', ['jim', 'pam'], 'god'), 'pam');
});

test('the hint is in every language, names the orchestrator, and has no dashes', () => {
  for (const l of ['en', 'zh-CN', 'ar']) {
    const j = JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`));
    const s = j.pro.autos.hookAnsweredByHint;
    assert.ok(s, `${l} has pro.autos.hookAnsweredByHint`);
    assert.match(s, /\{\{godName\}\}/, l);
    assert.doesNotMatch(s, /[\u2013\u2014]| - /, `${l} has no dashes`);
  }
  assert.match(editor, /t\('pro\.autos\.hookAnsweredByHint', \{ godName \}\)/);
});

test('Classic (TriggersTab WebhooksSection) has the same picker, so both skins match', () => {
  const classic = read('src/renderer/src/components/triggers/WebhooksSection.tsx');
  assert.match(classic, /import \{ AgentPicker \} from '\.\.\/settings\/primitives';/);
  assert.match(classic, /<AgentPicker value=\{hook\.to \?\? ''\} onChange=\{\(to\) => onPatch\(\{ to \}\)\} label=\{t\('settings\.conn\.answeredBy'\)\} godName=\{godName\} style=\{inputStyle\} \/>/);
  assert.match(classic, /t\('pro\.autos\.hookAnsweredByHint', \{ godName \}\)/);
  assert.doesNotMatch(classic, /to: to \|\| undefined/);
  const prim = read('src/renderer/src/components/settings/primitives.tsx');
  assert.match(prim, /style=\{style \?\? \{ \.\.\.inputStyle, maxWidth: 320 \}\}/, 'PRO keeps its look when no style is passed');
});
