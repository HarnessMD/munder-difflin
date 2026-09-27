// 0.4.11, founder 6 Sep 2026: "figure out a way where we can just ask user to
// add their slack api keys … rely on polling every minute", then "add another
// socket mode", then "the UI should mention that they need to keep their laptop
// running … they can only connect one at a time … they should be able to
// decide the frequency of polling in socket and the polling method".
//
// The renderer side, pinned here:
//   1. Three ways in the plan's order, polling first, drawn from the shared list.
//   2. The laptop line sits under the heading, once, and not under one choice.
//   3. Choosing another way saves the mode (main stops the running transport),
//      and Turn on starts only the chosen one.
//   4. Both frequency pickers exist, each from its shared choice list.
//   5. Test connection is wired; the status line and the last error are drawn.
//   6. Slack no longer lands in Michael's queue from the renderer.
//   7. The Inbox and Michael's Reach card say which way is live.
//   8. Every new key is used by the screens that own it.
//   9. (waits for the locale apply) every key exists in all three locales, no dash.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
const MODAL = read('src/renderer/src/components/SettingsModal.tsx');
const modal = strip(MODAL);
const INBOX = read('src/renderer/src/components/pro/InboxScreen.tsx');
const CONFIG_TAB = read('src/renderer/src/components/pro/god/ConfigTab.tsx');
const HIVE = strip(read('src/renderer/src/hooks/useHive.ts'));
const SHARED = read('src/shared/slackMode.ts');
const MAIN = read('src/main/slackPoller.ts');
const DASH = /[–—]|\s-\s/;

// 0.5.3 (settings redesign, founder 24 Sep 2026: "simplify the slack
// configuration ... they just add the keys and channel ID and it should start
// working"; "no turn on, no turn off, no save individually"). The Slack form
// is the Slack card in components/settings/ConnectionsSection.tsx; the pins
// below keep each promise above, re-pointed at it.
const CARD = read('src/renderer/src/components/settings/ConnectionsSection.tsx');
const card = strip(CARD);
const SETUP = read('src/shared/slackSetup.ts');

test('1. three ways, drawn from the shared list, polling the default; the tokens pick the way', () => {
  assert.match(SHARED, /export const SLACK_MODES: readonly SlackMode\[\] = \['polling', 'socket', 'webhook'\];/);
  assert.match(SHARED, /return 'polling';\s*\}/, 'polling is the default when nothing is saved');
  assert.match(card, /\['auto', \.\.\.SLACK_MODES\]/, 'the Advanced picker comes from the shared list');
  assert.match(SETUP, /return f\.appToken\.trim\(\) \? 'socket' : 'polling';/, 'an app token makes it live, no app token polls');
});

test('2. the way is explained once, behind the (i) of its picker', () => {
  assert.equal((card.match(/settings\.conn\.slack\.wayInfo/g) || []).length, 1);
  assert.match(card, /t\(`settings\.conn\.slack\.way\.\$\{mode\}`\)/, 'one short line names the way in use');
});

test('3. choosing another way is a staged field; Save stops the running way and starts the chosen one', () => {
  assert.match(card, /const setWay = \(w: SlackWay\) => stage\(\{ slackMode: w === 'auto' \? autoMode : w \}\);/);
  assert.match(card, /draft\.setTask\('slack:apply', applySlack\);/, 'every Slack change makes Save apply it');
  assert.match(card, /if \(running \|\| !f\.on\) await window\.cth\.slackStop\(\)/, 'the running way stops first');
  assert.match(card, /if \(action === 'start'\) \{\s*const r = await window\.cth\.slackStart\(\);/, 'then the saved way starts');
  assert.ok(!/turnOn|turnOff|saveBtn/.test(card), 'no Turn on, Turn off or Slack Save button');
});

test('4. both frequency pickers exist, each from its shared choice list', () => {
  assert.match(card, /SLACK_POLL_CHOICES\.map\(\(s\) =>/);
  assert.match(card, /SLACK_CATCHUP_CHOICES\.map\(\(s\) =>/);
  assert.match(card, /stage\(\{ slackPollSeconds: Number\(e\.target\.value\) \}\)/);
  assert.match(card, /stage\(\{ slackSocketCatchupSeconds: Number\(e\.target\.value\) \}\)/);
});

test('5. Test connection is wired; the state and the last error are drawn', () => {
  assert.match(card, /await window\.cth\.slackTest\(\{ mode, botToken, appToken, signingSecret \}\)/);
  assert.match(card, /\{live\?\.lastError && <span[^>]*data-slack-error>\{live\.lastError\}<\/span>\}/);
  assert.match(card, /data-slack-state=\{running \? 'on' : 'off'\}/);
});

test('5b. one press finds the channels, so the form stops asking for an id', () => {
  assert.match(card, /if \(r\.channels\) \{\s*setChannels\(r\.channels\);\s*if \(r\.channels\.length === 1 && !channelId\.trim\(\)\) stage\(\{ slackChannelId: r\.channels\[0\]\.id \}\);/);
  assert.match(card, /channels\.length > 1 \? \(/, 'more than one: a picker');
});

test('5c. the switch is a field: off, then Save, stops Slack and keeps it off', () => {
  assert.match(card, /<Switch on=\{on\} onChange=\{\(v\) => stage\(\{ slackEnabled: v \}\)\}/);
  assert.match(SETUP, /if \(!f\.on\) return 'stop';/);
  assert.match(card, /await window\.cth\.slackSetConfig\(\{\s*enabled: f\.on,/, 'the saved flag is what boot reads');
});

test('5d. the proactive switch names what it does', () => {
  assert.match(card, /<Switch on=\{get\('slackProactivePosting', false\)\} onChange=\{\(v\) => stage\(\{ slackProactivePosting: v \}\)\} label=\{t\('settings\.connections\.proactive\.label'\)\} \/>/);
  assert.match(card, /t\('settings\.conn\.slack\.proactiveShort'\)/);
});

test('5e. the scopes are on the screen, in the steps, from the shared list', () => {
  assert.match(card, /t\('settings\.conn\.slack\.steps', \{ scopes: SLACK_BOT_SCOPES\.socket\.join\(', '\) \}\)/);
});

test('5f. one press says which scope is MISSING', () => {
  assert.match(card, /if \(r\.missingScopes\?\.length\) parts\.push\(t\('settings\.connections\.scopes\.missing', \{ scopes: r\.missingScopes\.join\(', '\) \}\)\);/);
});

test('5g. Slack leads the Connections section', () => {
  assert.ok(card.indexOf('<SlackCard') > 0 && card.indexOf('<SlackCard') < card.indexOf('<InboundIntegrationsCard'));
  const at = modal.indexOf("activeSection === 'Connections'");
  assert.match(modal.slice(at, at + 120), /<ConnectionsSection config=\{config\} \/>/, 'the section file is the first thing on the tab');
});

test('6. Slack lands in the responder\'s queue from the renderer, Michael\'s unless another agent is chosen and running', () => {
  // Rewritten 6 Sep 2026: the founder then ruled "Michael needs to triage the
  // slack requests, give it as a configuration option, make it default". The
  // renderer listens again and enqueues to Michael. Rewritten again for 0.5.2
  // (founder ruling, Option A): one responder for every inbound channel, so
  // main emits the event for every message with the configured id, and the
  // renderer resolves it against the running agents (@shared/responder).
  assert.match(HIVE, /window\.cth\.onSlackMessage\(/, 'the renderer listens for inbound Slack');
  assert.match(HIVE, /enqueueMessage\(resolveResponder\(msg\.responder, active, GOD_ID\), text, \{ slack, instruction \}\)/, 'Slack text lands in the responder\'s queue with the thread and the protocol');
  assert.doesNotMatch(HIVE, /slackReply\(/, 'the received post is main\'s, not the renderer\'s');
  assert.doesNotMatch(HIVE, /slackReply\(/, 'the received acknowledgement moved to main');
});

test('7. the Inbox and Michael\'s Reach card say which way is live', () => {
  assert.match(INBOX, /function slackSubtitle\(s: SlackLiveStatus/);
  assert.match(INBOX, /if \(s\.mode === 'polling'\)[\s\S]*?t\('pro\.inbox\.slackPolling', \{ every \}\)/);
  assert.match(INBOX, /s\.socketConnectedAt \? t\('pro\.inbox\.slackSocketOn'\) : t\('pro\.inbox\.slackSocketReconnecting'\)/);
  assert.match(INBOX, /return t\('pro\.inbox\.slackOn'\);/, 'the webhook keeps its listening line');
  assert.match(INBOX, /icon="slack" title=\{t\('pro\.inbox\.slackSetup\.title'\)\}/, 'the setup empty state stays');
  assert.match(CONFIG_TAB, /t\('pro\.god\.config\.slackOn', \{ channel: config\.slackChannelId, way: t\(`settings\.connections\.slackWay\.\$\{resolveSlackMode\(config\)\}\.label`\) \}\)/);
  assert.match(CONFIG_TAB, /t\('pro\.god\.config\.slackOnAny', \{ way:/);
});

/** Every key this build added, and who uses it. */
const NEW_KEYS = {
  // 0.5.3: the Slack card keeps these; the rest of the 0.4.11 set left with
  // the old form and stays in the locales for the Inbox and Reach card, which
  // still read some, and for a later ruling.
  'src/renderer/src/components/settings/ConnectionsSection.tsx': [
    'settings.connections.slackWay.checkEvery', 'settings.connections.slackWay.catchupEvery', 'settings.connections.slackWay.catchupEveryHint',
    'settings.connections.slackWay.startFailed',
    'settings.connections.slackWay.off', 'settings.connections.slackWay.everySeconds', 'settings.connections.slackWay.everyMinute', 'settings.connections.slackWay.everyMinutes', 'settings.connections.slackWay.everyHour',
    'settings.connections.diag.test', 'settings.connections.diag.testing', 'settings.connections.diag.noToken',
    'settings.connections.diag.missing', 'settings.connections.diag.authFail', 'settings.connections.diag.ok',
    'settings.connections.diag.socketOk', 'settings.connections.diag.socketFail',
    'settings.connections.proactive.label', 'settings.connections.scopes.missing'
  ],
  'src/renderer/src/components/pro/InboxScreen.tsx': [
    'pro.inbox.slackPolling', 'pro.inbox.slackSocketOn', 'pro.inbox.slackSocketReconnecting',
    'pro.inbox.everySeconds', 'pro.inbox.everyMinute', 'pro.inbox.everyMinutes'
  ],
  'src/renderer/src/components/pro/god/ConfigTab.tsx': ['pro.god.config.slackOnAny']
};

/** A key built with a template (`slackWay.${m}.label`) is used through its
 *  template; the pin resolves the template for each way. */
function usesKey(src, key) {
  if (src.includes(`'${key}'`)) return true;
  const m = key.match(/^settings\.connections\.slackWay\.(polling|socket|webhook)\.(label|hint|foot)$/);
  if (m) return src.includes(`\`settings.connections.slackWay.\${m}.${m[2]}\``) || src.includes(`\`settings.connections.slackWay.\${slackMode}.${m[2]}\``) || src.includes(`\`settings.connections.slackWay.\${resolveSlackMode(config)}.${m[2]}\``);
  const h = key.match(/^settings\.connections\.slackWay\.help\.(polling|socket|webhook)$/);
  if (h) return src.includes('`settings.connections.slackWay.help.${slackMode}`');
  return false;
}

test('8. every new key is used by the screen that owns it', () => {
  for (const [file, keys] of Object.entries(NEW_KEYS)) {
    const src = read(file);
    for (const k of keys) assert.ok(usesKey(src, k), `${file} uses ${k}`);
  }
});

test('9. (waits for the locale apply) every key exists in all three locales without a dash, variables intact', () => {
  const locales = Object.fromEntries(['en', 'zh-CN', 'ar'].map((l) => [l, JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`))]));
  const get = (obj, dotted) => dotted.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj);
  const all = Object.values(NEW_KEYS).flat().concat(['pro.god.config.slackOn', 'pro.inbox.slackSetup.s1', 'pro.inbox.slackSetup.s2', 'pro.inbox.slackSetup.s3', 'settings.connections.slackDesc']);
  for (const k of all) {
    const en = get(locales.en, k);
    assert.ok(typeof en === 'string' && en.length > 0, `en ${k}`);
    const vars = (en.match(/\{\{\w+\}\}/g) || []).sort();
    for (const l of ['en', 'zh-CN', 'ar']) {
      const s = get(locales[l], k);
      assert.ok(typeof s === 'string' && s.length > 0, `${l} ${k}`);
      assert.ok(!DASH.test(s), `${l} ${k}: no dash`);
      assert.deepEqual((s.match(/\{\{\w+\}\}/g) || []).sort(), vars, `${l} ${k}: same variables`);
    }
  }
  assert.match(locales.en.pro.god.config.slackOn, /\{\{way\}\}/, 'the Reach card names the way');
  assert.match(locales.en.settings.connections.slackDesc, /\{\{godName\}\}/, 'the description still names the orchestrator');
});
