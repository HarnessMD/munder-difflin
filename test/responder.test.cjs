'use strict';

/**
 * WHO ANSWERS AN INBOUND MESSAGE (0.5.2, founder ruling, Option A): one
 * setting for a Slack request and a teammate's message alike. The value is
 * an agent id; unset means the orchestrator; and THE FALLBACK IS NOT
 * OPTIONAL: an agent that is not active takes nothing, the orchestrator does.
 *
 * The rule is pinned where it lives (src/shared/responder.ts), then each of
 * the two channels is pinned to consult it: main's teams bridge for a
 * teammate's message (the delivery itself is proved in
 * test/teams-bridge.test.cjs), and the renderer's Slack effect. The Settings
 * control that writes it is pinned last, together with the radio it replaced
 * being gone.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const { resolveResponder, RESPONDER_ORCHESTRATOR } = loadTs('src/shared/responder.ts');

test('the configured agent answers when it is active', () => {
  assert.equal(resolveResponder('dwight', ['dwight', 'pam'], 'god'), 'dwight');
  assert.equal(resolveResponder(' dwight ', ['dwight'], 'god'), 'dwight', 'whitespace around the id is not a different agent');
  assert.equal(resolveResponder('god', ['god', 'dwight'], 'god'), 'god', 'pointing it at the orchestrator is allowed and changes nothing');
});

test('an agent that is not active takes nothing: the orchestrator does', () => {
  assert.equal(resolveResponder('dwight', ['pam'], 'god'), 'god', 'archived, gone, or never existed');
  assert.equal(resolveResponder('dwight', [], 'god'), 'god', 'nobody is running');
});

test('unset, empty and nonsense all mean the orchestrator', () => {
  assert.equal(RESPONDER_ORCHESTRATOR, '');
  for (const v of [undefined, null, '', '   ', 42, {}, ['dwight'], true]) {
    assert.equal(resolveResponder(v, ['dwight'], 'god'), 'god', JSON.stringify(v));
  }
});

test('both channels consult the one rule, and main feeds the bridge the same predicate as broadcast fan-out', () => {
  const bridge = strip(read('src/main/teamsBridge.ts'));
  assert.match(bridge, /import \{ resolveResponder \} from '\.\.\/shared\/responder';/);
  assert.match(bridge, /return resolveResponder\(hive\?\.responder\?\.\(\), hive\?\.activeAgentIds\?\.\(\) \?\? \[\], god\);/);
  const deliver = bridge.slice(bridge.indexOf('function deliverLocally('), bridge.indexOf('function requestsDir('));
  assert.match(deliver, /const to = responderId\(\);/);
  assert.match(deliver, /\.\.\.o\.message,\s*to,/, 'the delivery goes to the responder, not to the wire\'s "god"');
  assert.match(deliver, /kind: 'teams-received'[^}]*\bto\b/, 'the log says who took it');

  const main = strip(read('src/main/index.ts'));
  assert.match(main, /responder: \(\) => readConfig\(\)\.responder,/);
  assert.match(main, /activeAgentIds: \(\) => selectBroadcastTargets\(hive\.registry\(\)\.agents, ''\),/, 'the same predicate broadcast uses: not archived, not the assistant');
  assert.match(main, /responder: cfg\.responder \?\? '',/, 'the Slack message carries the configured id');
  assert.doesNotMatch(main, /resolveSlackTriage\(/, 'nothing in main chooses a route by the old triage');

  const hive = strip(read('src/renderer/src/hooks/useHive.ts'));
  assert.match(hive, /const active = useStore\.getState\(\)\.agents\.filter\(\(a\) => !a\.archived && !a\.isAssistant\)\.map\(\(a\) => a\.id\);/);
  assert.match(hive, /enqueueMessage\(resolveResponder\(msg\.responder, active, GOD_ID\), text, \{ slack, instruction \}\)/);
});

test('an empty responder is stored as absent, so a cleared field and an old file read the same', () => {
  const main = strip(read('src/main/index.ts'));
  const door = main.slice(main.indexOf("ipcMain.handle('config:update'"), main.indexOf("ipcMain.handle('config:setAgentTokenCap'"));
  assert.match(door, /patch\.responder = typeof patch\.responder === 'string' && patch\.responder\.trim\(\) \? patch\.responder\.trim\(\) : undefined;/);
  assert.match(read('src/main/config.ts'), /responder\?: string;/);
  assert.match(read('src/main/config.ts'), /responder: undefined,/);
  assert.match(read('src/preload/index.ts'), /responder\?: string;/);
  assert.match(read('src/renderer/src/store/config.ts'), /responder\?: string;/);
});

test('Settings has one select at the top of Connections, the orchestrator first, and the triage radio is gone', () => {
  const settings = strip(read('src/renderer/src/components/SettingsModal.tsx'));
  assert.ok(!settings.includes('data-slack-triage'), 'the Slack triage radio is gone');
  assert.ok(!settings.includes('SLACK_TRIAGES'), 'and so is the list it was drawn from');
  assert.ok(!settings.includes("slackWay.tempCwd'"), 'the temps folder row went with it');
  // 0.5.3 (settings redesign): the select is the Slack card's "Answered by",
  // at the top of Connections, drawn by components/settings (the shared
  // AgentPicker) and staged in the page's one draft.
  const conn = strip(read('src/renderer/src/components/settings/ConnectionsSection.tsx'));
  const picker = strip(read('src/renderer/src/components/settings/primitives.tsx'));
  assert.match(settings, /\{activeSection === 'Connections' && <ConnectionsSection config=\{config\} \/>\}/);
  assert.ok(conn.indexOf('<SlackCard') < conn.indexOf('<InboundIntegrationsCard'), 'Slack leads the tab');
  assert.match(conn, /<AgentPicker value=\{get\('responder', ''\)\} onChange=\{\(id\) => draft\?\.stage\(\{ responder: id \}\)\}/, 'staged with the page and written by Save');
  assert.match(picker, /<option value="">\{t\('settings\.connections\.responder\.orchestrator', \{ godName \}\)\}<\/option>/);
  assert.match(picker, /const choices = agents\.filter\(\(a\) => !a\.isGod && !a\.archived && !a\.isAssistant\);/);
  assert.match(picker, /const shown = choices\.some\(\(a\) => a\.id === value\) \? value : '';/, 'an id no longer active shows as the orchestrator');
  assert.ok(!/updateConfig/.test(conn), 'a section never writes config itself');
  assert.equal((settings.match(/window\.cth\.updateConfig\(/g) || []).length, 1, 'the modal still has exactly one writer of config');
  // Both skins reach it: PRO embeds the same modal as a page.
  assert.match(read('src/renderer/src/components/pro/SettingsScreen.tsx'), /<SettingsModal key=\{section \?\? ''\} config=\{config\} initialSection=\{section\}/);
  assert.ok(!/PixelButton|PixelPanel|PixelBadge/.test(settings), 'kit only');

  const locales = Object.fromEntries(['en', 'zh-CN', 'ar'].map((l) => [l, JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`))]));
  for (const l of ['en', 'zh-CN', 'ar']) {
    const r = locales[l].settings.connections.responder;
    for (const k of ['heading', 'hint', 'orchestrator']) assert.ok(typeof r[k] === 'string' && r[k].length > 0, `${l} ${k}`);
    assert.ok(r.hint.includes('{{godName}}') && r.orchestrator.includes('{{godName}}'), `${l}: the orchestrator is named, not hard coded`);
    assert.equal(locales[l].settings.connections.slackTriage, undefined, `${l}: the old strings are gone`);
    for (const k of ['heading', 'hint', 'orchestrator']) assert.ok(!/[\u2013\u2014]| - /.test(r[k]), `${l} ${k}: no dash`);
  }
  assert.equal(locales.en.settings.connections.responder.heading, 'Who answers inbound messages');
});
