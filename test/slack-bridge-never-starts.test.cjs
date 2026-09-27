'use strict';

// Card slack-bridge-never-starts, 6 Sep 2026. The founder enabled Slack with
// both tokens correct and never got a message through, and NOTHING said why.
//
// Root cause, confirmed against his config.json (field presence only): no
// slackChannelId was ever saved. slackReadiness refuses polling and socket
// without a channel, startSlackIngestion returned that refusal before any
// network call, and the boot caller dropped it into console.error, which a
// packaged app sends nowhere. log.jsonl carried zero slack lines EVER because
// no Slack path wrote to it at all.
//
// Pinned here:
//   1. Auto-start at boot IS the design: slackEnabled true starts the bridge
//      with no button press.
//   2. Every start attempt, refusal, transport failure, success and stop
//      writes one line to hive/log.jsonl (kind 'slack') AND the console.
//   3. The transports' own failure lines land in log.jsonl too.
//   4. An idle status names what the config still lacks (configError), so an
//      enabled-but-unstartable install can never again draw the same screen
//      as a healthy quiet one.
//   5. A token never reaches a log line: the detail carries mode/error/line,
//      and the readiness errors are fixed strings.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const main = read('src/main/index.ts');

test('1. boot auto-starts the bridge whenever slackEnabled is true', () => {
  assert.match(main, /const slackCfg = readConfig\(\);\s*\n\s*if \(slackCfg\.slackEnabled\) \{\s*\n\s*void startSlackIngestion\(\)/);
});

test('2. the readiness gate names what is missing, and only asks for what the way reads', () => {
  const fn = main.slice(main.indexOf('function slackReadiness'), main.indexOf('function slackLog'));
  assert.match(fn, /return \{ mode, error: 'missing bot token' \}/);
  assert.match(fn, /if \(!cfg\.slackChannelId\?\.trim\(\)\) return \{ mode, error: 'missing channel' \}/);
  assert.match(fn, /if \(mode === 'socket'\) return cfg\.slackAppToken \? \{ mode \} : \{ mode, error: 'missing app token' \}/);
  // 7 Sep 2026. The original card was "it refused over a field nobody had
  // filled in and said nothing". Half of that refusal turned out to be over a
  // field the transport never READS: socket events carry their own channel.
  // Naming a missing thing is only an improvement while the thing is actually
  // needed, so the socket returns before the channel is demanded.
  assert.ok(
    fn.indexOf("if (mode === 'socket')") < fn.indexOf('!cfg.slackChannelId'),
    'the socket must return BEFORE the channel check, or it refuses over an id it ignores'
  );
});

test('3. every attempt, refusal, failure, success and stop writes to hive log AND console', () => {
  const logFn = main.slice(main.indexOf('function slackLog'), main.indexOf('async function startSlackIngestion'));
  assert.match(logFn, /console\.log\(`\[slack\] \$\{event\}`/);
  assert.match(logFn, /hive\.appendLog\(\{ kind: 'slack', event, \.\.\.detail \}\)/);

  const start = main.slice(main.indexOf('async function startSlackIngestion'), main.indexOf('function stopSlackIngestion'));
  assert.match(start, /slackLog\('start-attempt', \{ mode: ready\.mode \}\)/);
  assert.match(start, /slackLog\('refused', \{ mode: ready\.mode, error: ready\.error \}\)/, 'the silent path that cost the morning now speaks');
  assert.match(start, /slackLog\(r\.ok \? 'started' : 'failed', \{ mode: ready\.mode/, 'the webhook branch logs both outcomes');
  assert.equal((start.match(/slackLog\('failed'/g) ?? []).length, 2, 'polling and socket failures each log');
  assert.equal((start.match(/slackLog\('started'/g) ?? []).length, 1, 'the live ways log success once, after the reply server is up');
  assert.match(start, /log: \(line: string\) => slackLog\('transport', \{ line \}\)/, 'transport failures reach log.jsonl');

  const stop = main.slice(main.indexOf('function stopSlackIngestion'), main.indexOf('function slackStatusNow'));
  assert.match(stop, /if \(wasRunning\) slackLog\('stopped'\)/);
});

test('4. an idle status says why it cannot start', () => {
  const status = main.slice(main.indexOf('function slackStatusNow'), main.indexOf('async function slackTestNow'));
  assert.match(status, /configError: slackReadiness\(cfg\)\.error/);
  const shared = read('src/shared/slackMode.ts');
  assert.match(shared, /configError\?: string;/);
});

test('6. the Settings form names whatever is missing, instead of a silent disable and a happy Saved', () => {
  // Ruled by god 6 Sep 2026 as two copy changes about the channel. Generalised
  // 7 Sep 2026, because the channel stopped being the only field that can be
  // the gap and stopped being asked for at all in the common case. The
  // GUARANTEE is unchanged and now covers every way: a control that cannot be
  // pressed says why, and Save never reports success on a config that cannot
  // start.
  // 0.5.3 (settings redesign): the Slack card in components/settings. The
  // switch is on and a field is missing: the card's state says what, and the
  // page's Save reports it instead of Saved (the task throws with the fields).
  const conn = read('src/renderer/src/components/settings/ConnectionsSection.tsx');
  const rules = read('src/shared/slackSetup.ts');
  assert.match(rules, /export function slackMissingFields\(/);
  assert.match(rules, /if \(!f\.on\) return 'stop';\n\s*return slackMissingFields\(f\)\.length === 0 \? 'start' : 'none';/);
  assert.match(conn, /on && missing\.length \? t\('settings\.conn\.state\.needs', \{ fields: missing\.map\(fieldName\)\.join\(', '\) \}\)/, 'the state names what is missing');
  assert.match(conn, /if \(action === 'none'\) \{[\s\S]*?throw new Error\(`Slack: \$\{i18n\.t\('settings\.connections\.diag\.missing', \{ fields: missing\.join\(', '\) \}\)\}`\);/, 'Save names the fix, not the failure');

  // And the diagnostic itself is now reachable on exactly the config that used
  // to disable it. This is the founder's 7 Sep complaint in one assertion.
  assert.match(conn, /onClick=\{\(\) => \{ void test\(\); \}\} disabled=\{testing\}/, 'Test connection is never gated on readiness');

  const DASH = /[–—]|\s-\s/;
  const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v, `${p}${k}.`) : [[`${p}${k}`, v]]));
  const locales = Object.fromEntries(['en', 'zh-CN', 'ar'].map((l) =>
    [l, new Map(flat(JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`))))]));
  for (const key of ['settings.connections.diag.missing', 'settings.connections.diag.noToken', 'settings.connections.channelPick.none']) {
    for (const l of Object.keys(locales)) {
      const v = locales[l].get(key);
      assert.ok(typeof v === 'string' && v.length > 0, `${key} in ${l}`);
      assert.ok(!DASH.test(v), `${key} (${l}) carries a dash`);
    }
    assert.notEqual(locales['zh-CN'].get(key), locales.en.get(key));
    assert.notEqual(locales.ar.get(key), locales.en.get(key));
  }
  // The missing-field line has to interpolate the list, or it is the silent
  // disable again with extra words.
  assert.match(locales.en.get('settings.connections.diag.missing'), /\{\{fields\}\}/);
  // The retired sentences are gone from every locale, not merely unused in one.
  for (const l of Object.keys(locales)) {
    for (const k of ['needsChannel', 'savedNeedsChannel', 'channel', 'channelHint']) {
      assert.equal(locales[l].get(`settings.connections.slackWay.${k}`), undefined, `retired slackWay.${k} still in ${l}`);
    }
  }
});

test('5. no log line can carry a token', () => {
  const region = main.slice(main.indexOf('function slackLog'), main.indexOf('function slackStatusNow'));
  for (const call of region.match(/slackLog\([^)]*\)/g) ?? []) {
    assert.doesNotMatch(call, /token/i, `a token-shaped value reaches a log call: ${call}`);
  }
});
