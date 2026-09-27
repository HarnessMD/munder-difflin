// 0.4.11, founder 6 Sep 2026: "instead of relying on webhooks they can just
// rely on polling every minute", then Socket Mode as a second way, webhooks
// kept as the third, "they can only connect one at a time", a frequency picker
// on both the polling and the socket way, and "make sure that we use our
// workers or temps for the slack integration".
//
// The contract pinned here is the main process wiring (the transports and the
// temps handler have their own unit tests):
//   1. The shared mode rules: polling is the default, an install that already
//      ran the webhook keeps it, and a picker value outside its range reads as
//      the default.
//   2. One start picks ONE way by resolveSlackMode, one stop stops all three,
//      and every way lands on the same door (onSlackTransportMessage), which
//      hands the request to a temp and no longer to Michael's queue.
//   3. Changing the way, disabling, or losing the way's token stops the
//      running transport (one at a time).
//   4. A Slack request runs even while Michael's own spawning is off, every
//      temp's brief carries the memory block ahead of the objective, and the
//      temp's done body closes the Slack card.
//   5. Power resume reconnects the socket and sweeps the poller; the boot
//      start is mode aware; the pure polling core ships next to the trigger
//      core; ws is a real dependency; the renderer no longer enqueues Slack
//      text to Michael.
//   6. The new strings exist in all three locales without a dash.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const main = read('src/main/index.ts');
const code = strip(main);
const M = loadTs('src/shared/slackMode.ts');
const DASH = /[–—]|\s-\s/;

test('1. polling is the default, a webhook install keeps its way, out of range pickers read as the default', () => {
  assert.deepEqual(M.SLACK_MODES, ['polling', 'socket', 'webhook']);
  assert.equal(M.resolveSlackMode(undefined), 'polling');
  assert.equal(M.resolveSlackMode({}), 'polling');
  assert.equal(M.resolveSlackMode({ slackEnabled: true, slackSigningSecret: 'abc' }), 'webhook', 'an install that already ran the webhook keeps it');
  assert.equal(M.resolveSlackMode({ slackEnabled: false, slackSigningSecret: 'abc' }), 'polling', 'a secret alone, with Slack off, is not a running webhook');
  assert.equal(M.resolveSlackMode({ slackMode: 'socket', slackEnabled: true, slackSigningSecret: 'abc' }), 'socket', 'a saved way wins');
  assert.equal(M.resolvePollSeconds(undefined), 60);
  assert.equal(M.resolvePollSeconds(30), 30);
  assert.equal(M.resolvePollSeconds(5), 60, 'under the floor reads as the default');
  assert.equal(M.resolvePollSeconds(9999), 60);
  assert.equal(M.resolveCatchupSeconds(undefined), 300);
  assert.equal(M.resolveCatchupSeconds(0), 0, 'off is a real choice');
  assert.equal(M.resolveCatchupSeconds(30), 300, 'under the floor reads as the default');
  assert.deepEqual(M.SLACK_POLL_CHOICES, [30, 60, 120, 300]);
  assert.deepEqual(M.SLACK_CATCHUP_CHOICES, [0, 60, 300, 900, 3600]);
});

test('2. one start picks one way, one stop stops all three, every way lands on the same door, and the door hires a temp', () => {
  const start = code.slice(code.indexOf('async function startSlackIngestion('), code.indexOf('function stopSlackIngestion('));
  assert.match(start, /const ready = slackReadiness\(cfg\);/);
  assert.match(start, /stopSlackIngestion\(\);/, 'whatever was running stops first');
  // 6 Sep 2026, card slack-bridge-never-starts: the webhook branch gained a
  // log line on both outcomes, so the one-liner became a block. The guarantee
  // pinned is unchanged: the webhook way starts its own server and returns.
  assert.match(start, /if \(ready\.mode === 'webhook'\) \{\s*const r = await startSlackServer\(\);/);
  assert.match(start, /slackPoller = new SlackPoller\(\{ \.\.\.common, intervalMs: resolvePollSeconds\(cfg\.slackPollSeconds\) \* 1000 \}\);/);
  assert.match(start, /slackSocket = new SlackSocketClient\(\{ \.\.\.common, appToken: cfg\.slackAppToken as string, catchupMs: resolveCatchupSeconds\(cfg\.slackSocketCatchupSeconds\) \* 1000 \}\);/);
  assert.match(start, /onMessage: onSlackTransportMessage,/, 'polling and socket land on the door');
  assert.match(start, /await startSlackReplyServer\(\);\s*startSlackDoneObserver\(\);/, 'the reply endpoint and the done poller run in every way');
  const stop = code.slice(code.indexOf('function stopSlackIngestion('), code.indexOf('function slackStatusNow('));
  assert.match(stop, /slackPoller\?\.stop\(\)/);
  assert.match(stop, /slackSocket\?\.stop\(\)/);
  assert.match(stop, /stopSlackServer\(\);/);
  const webhook = code.slice(code.indexOf('async function startSlackServer('), code.indexOf('async function startSlackReplyServer('));
  assert.match(webhook, /onMessage: \(m\) => onSlackTransportMessage\(m\)/, 'the webhook lands on the door too');
  const door = code.slice(code.indexOf('async function onSlackTransportMessage('), code.indexOf('function resolveSlackTempCwd('));
  // ONE route behind the door (0.5.2, founder ruling, Option A). The 0.4.11
  // triage radio chose between his queue and a temp at once; now every
  // message takes the renderer queue and carries the responder setting, and
  // the renderer resolves who answers against the running agents
  // (@shared/responder, test/responder.test.cjs). slackInbound.ts stays for a
  // later ruling; nothing here chooses it.
  assert.doesNotMatch(door, /resolveSlackTriage\(/, 'the old triage no longer chooses a route');
  assert.doesNotMatch(door, /handleInboundSlack\(/, 'the door hires no temp');
  assert.match(door, /responder: cfg\.responder \?\? '',/, 'the responder rides with the message');
  assert.match(door, /autonomyPreamble: buildAutonomousRequestProtocol\(m\.channel, m\.thread_ts, slackReplyScriptPath\(\)\)/, 'the route carries the protocol');
  assert.match(door, /liveWebContents\(\)\?\.send\('slack:incomingMessage', ipcMsg\)/, 'the route is the renderer queue');
  assert.match(door, /text: SLACK_RECEIVED_TEXT/, 'the received post is main\'s');
  assert.match(code, /ipcMain\.handle\('slack:start', \(\) => startSlackIngestion\(\)\);/);
  // One stop still stops all three ways. It now also persists slackEnabled:false
  // first, because boot re-arms from that flag and Stop has to survive a restart.
  assert.match(code, /ipcMain\.handle\('slack:stop', \(\) => \{\s*writeConfig\(\{ slackEnabled: false \}\);\s*stopSlackIngestion\(\);\s*return \{ ok: true \};\s*\}\);/);
  assert.match(code, /ipcMain\.handle\('slack:status', \(\): SlackStatus => slackStatusNow\(\)\);/);
  // 7 Sep 2026: slack:test now takes the DRAFT credentials from the form, so it
  // can answer about a token that has not been saved. What is pinned is that it
  // still goes straight to slackTestNow and starts nothing.
  assert.match(code, /ipcMain\.handle\('slack:test', \(_evt, draft: unknown\) => \{/);
  assert.match(code, /return slackTestNow\(\{/);
});

test('3. one at a time: changing the way, disabling, or losing the way\'s token stops the running transport', () => {
  const set = code.slice(code.indexOf("ipcMain.handle('slack:setConfig'"), code.indexOf("ipcMain.handle('triggers:getContext'"));
  assert.match(set, /const before = slackReadiness\(readConfig\(\)\);/);
  assert.match(set, /next\.slackMode = p\.mode as SlackMode;/);
  assert.match(set, /next\.slackAppToken = p\.appToken\.trim\(\) \|\| undefined;/);
  assert.match(set, /next\.slackPollSeconds = resolvePollSeconds\(p\.pollSeconds\);/);
  assert.match(set, /next\.slackSocketCatchupSeconds = resolveCatchupSeconds\(p\.catchupSeconds\);/);
  assert.match(set, /next\.slackTempCwd = p\.tempCwd\.trim\(\) \|\| undefined;/);
  assert.match(set, /if \(after\.error \|\| after\.mode !== before\.mode\) stopSlackIngestion\(\);/);
  const ready = code.slice(code.indexOf('function slackReadiness('), code.indexOf('async function startSlackIngestion('));
  assert.match(ready, /if \(!cfg\.slackEnabled\) return \{ mode, error: 'slack disabled' \};/);
  assert.match(ready, /if \(mode === 'webhook'\) return cfg\.slackSigningSecret \? \{ mode \} : \{ mode, error: 'missing signing secret' \};/);
  assert.match(ready, /if \(!cfg\.slackBotToken\) return \{ mode, error: 'missing bot token' \};/);
  assert.match(ready, /if \(mode === 'socket'\) return cfg\.slackAppToken \? \{ mode \} : \{ mode, error: 'missing app token' \};/);
  // 7 Sep 2026: ONLY POLLING NEEDS A CHANNEL. The socket returns above this
  // line, so the channel check can never reach it: socket events carry their
  // own channel, so an id here was a field the transport never read and a
  // refusal to start over an answer it was going to ignore. Ordering is the
  // guarantee, so pin the order and not just the presence.
  assert.ok(
    ready.indexOf("if (mode === 'socket')") < ready.indexOf('!cfg.slackChannelId'),
    'the socket must return BEFORE the channel is demanded'
  );
  assert.match(ready, /if \(!cfg\.slackChannelId\?\.trim\(\)\) return \{ mode, error: 'missing channel' \};/);
});

test('4. a Slack request runs with Michael\'s spawning off, every temp reads the floor\'s memory first, and the done body closes the card', () => {
  assert.match(code, /origin\?: 'slack' \| 'god';/);
  assert.match(code, /if \(!maySpawn && spawnRequestOrigin\(fp\) !== 'slack'\) continue;/, 'the gate bypass is scoped to Slack requests');
  const spawn = code.slice(code.indexOf('async function processSpawnRequest('), code.indexOf('function workerTokensUsed('));
  assert.match(spawn, /const indexPath = writeMemoryIndex\(root, hive\.memoryIndexRows\(\)\);/);
  assert.match(spawn, /context = memoryContextBlock\(root, indexPath, memory\.active\(\), kg\)/);
  assert.match(spawn, /body: `\$\{prefix\}\$\{context\}\$\{objective\}\$\{suffix\}`/, 'policy, then the memory block, then the objective');
  assert.match(spawn, /onTempFinished\(workerId, \{ ok: false, reason \}, \{ hive \}\)/, 'a rejected request closes its card as blocked');
  const tick = code.slice(code.indexOf('async function ephemeralWorkerTick('), code.indexOf('function startEphemeralWorkerWatcher('));
  assert.match(tick, /const doneBody = workerSignaledDone\(workerId, rec\.spawnedAt\);\s*if \(doneBody !== null\) \{/);
  assert.match(tick, /onTempFinished\(workerId, \{ ok: true, body: doneBody \}, \{ hive \}\)/);
  assert.match(tick, /onTempFinished\(workerId, \{ ok: false, reason: `over its token cap/);
  assert.match(tick, /onTempFinished\(workerId, \{ ok: false, reason: `idle for/);
  assert.match(code, /function liveSlackThreadOwner\(thread_ts: string\)/, 'a follow up finds the temp that owns its thread');
  const deps = code.slice(code.indexOf('function slackInboundDeps('), code.indexOf('function slackReadiness('));
  assert.match(deps, /liveThreadOwner: liveSlackThreadOwner,/);
  assert.match(deps, /fetchThread\(token, channel, thread_ts\)/);
  assert.match(deps, /tempCwd: resolveSlackTempCwd,/);
  assert.match(deps, /ack: readConfig\(\)\.slackProactivePosting/, 'the received post stays behind the opt in gate');
  assert.match(deps, /text: SLACK_RECEIVED_TEXT/);
  const ackText = code.match(/const SLACK_RECEIVED_TEXT = '([^']+)';/);
  assert.ok(ackText && !DASH.test(ackText[1]), 'the received post carries no dash');
});

test('5. resume reconnects, the boot start is mode aware, the polling core ships beside the trigger core, ws is a dependency, the renderer no longer enqueues Slack to Michael', () => {
  const resume = code.slice(code.indexOf('function onSystemResume('), code.indexOf('function onSystemResume(') + 4000);
  assert.match(resume, /slackSocket\?\.reconnectNow\(\); void slackPoller\?\.sweepNow\(\);/);
  assert.match(code, /if \(slackCfg\.slackEnabled\) \{\s*void startSlackIngestion\(\)/, 'boot starts whichever way is chosen');
  const starts = code.match(/(?<!function )startSlackServer\(\)/g) || [];
  assert.equal(starts.length, 1, `startSlackServer is called only from startSlackIngestion (found ${starts.length})`);
  assert.match(read('electron.vite.config.ts'), /\['src\/main\/slack-poll\.cjs', 'out\/main\/slack-poll\.cjs'\]/);
  assert.ok(fs.existsSync(path.join(ROOT, 'src/main/slack-poll.cjs')));
  const pkg = JSON.parse(read('package.json'));
  assert.ok(pkg.dependencies && pkg.dependencies.ws, 'ws is a runtime dependency for the socket way');
  const hook = strip(read('src/renderer/src/hooks/useHive.ts'));
  assert.match(hook, /window\.cth\.onSlackMessage\(/, 'the renderer listens for every Slack message');
  // 0.5.2: the queue it lands in is the responder's, resolved against the
  // running agents, Michael's when nothing else is chosen or running.
  assert.match(hook, /enqueueMessage\(resolveResponder\(msg\.responder, active, GOD_ID\), text, \{ slack, instruction \}\)/, 'and lands the text in the responder\'s queue with the thread');
  assert.doesNotMatch(hook, /slackReply\(/, 'the received post is main\'s, not the renderer\'s');
  // 0.5.3: the Slack card in components/settings. The way is a staged field;
  // Save's task stops the running way, writes the new one and starts it.
  const settings = read('src/renderer/src/components/settings/ConnectionsSection.tsx');
  assert.match(settings, /\['auto', \.\.\.SLACK_MODES\]/, 'the three ways are drawn from the shared list');
  assert.match(settings, /const setWay = \(w: SlackWay\) => stage\(\{ slackMode: w === 'auto' \? autoMode : w \}\);/);
  assert.match(settings, /if \(running \|\| !f\.on\) await window\.cth\.slackStop\(\)[\s\S]*?await window\.cth\.slackSetConfig\(\{\s*enabled: f\.on,\s*mode: resolveSlackMode\(c\),/, 'choosing another way, then Save, stops the running one and saves the new');
});

test('6. the new strings exist in all three locales without a dash, variables intact', () => {
  const keys = [
    'settings.connections.slackWay.heading', 'settings.connections.slackWay.laptop',
    'settings.connections.slackWay.polling.label', 'settings.connections.slackWay.polling.hint',
    'settings.connections.slackWay.socket.label', 'settings.connections.slackWay.socket.hint',
    'settings.connections.slackWay.webhook.label', 'settings.connections.slackWay.webhook.hint',
    'settings.connections.slackWay.help.polling', 'settings.connections.slackWay.help.socket', 'settings.connections.slackWay.help.webhook',
    'settings.connections.slackWay.appToken', 'settings.connections.slackWay.checkEvery', 'settings.connections.slackWay.catchupEvery',
    // slackWay.test retired 7 Sep 2026; Test connection is diag.test now, and
    // it is a different control: never disabled, and it finds the channels.
    'settings.connections.slackWay.tempCwd', 'settings.connections.diag.test', 'settings.connections.slackWay.turnOn',
    'settings.connections.slackWay.status.polling', 'settings.connections.slackWay.status.socket', 'settings.connections.slackWay.status.reconnecting',
    'pro.inbox.slackPolling', 'pro.inbox.slackSocketOn', 'pro.inbox.slackSocketReconnecting',
    'pro.inbox.slackSetup.s1', 'pro.inbox.slackSetup.s2', 'pro.inbox.slackSetup.s3',
    'pro.god.config.slackOn', 'pro.god.config.slackOnAny'
  ];
  const locales = Object.fromEntries(['en', 'zh-CN', 'ar'].map((l) => [l, JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`))]));
  const get = (o, k) => k.split('.').reduce((a, p) => (a == null ? undefined : a[p]), o);
  for (const k of keys) {
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
  assert.equal(locales.en.settings.connections.slackWay.laptop, 'One at a time. Every way needs the office open and the laptop awake.');
  assert.equal(locales.en.settings.connections.slackWay.polling.label, 'Check for messages');
  assert.equal(locales.en.settings.connections.slackWay.socket.label, 'Stay connected');
  assert.equal(locales.en.settings.connections.slackWay.webhook.label, 'Let Slack call the office');
});

// Founder, later on 6 Sep 2026: "The slack plan is fine but Michael needs to
// triage the slack requests give it as a configuration option make it default."
// Then 0.5.2 (founder ruling, Option A): the two way radio became ONE setting
// for every inbound channel, "who answers inbound messages", an agent id with
// the orchestrator as the default and the fallback (@shared/responder). The
// old vocabulary survives only so an older config.json still parses.
test('7. who answers is one setting for every inbound channel; a saved triage of temps reads as the orchestrator; the radio is gone and the select exists', () => {
  const { resolveResponder } = loadTs('src/shared/responder.ts');
  // The old words still parse, and a saved 'temps' is the default now.
  assert.deepEqual(M.SLACK_TRIAGES, ['michael', 'temps']);
  assert.equal(M.resolveSlackTriage({ slackTriage: 'temps' }), 'temps', 'the resolver still reads the file');
  assert.equal(resolveResponder(undefined, ['dwight'], 'god'), 'god', 'unset is the orchestrator');
  assert.equal(resolveResponder('temps', ['dwight'], 'god'), 'god', 'and so is anything that is not an active agent');
  assert.match(read('src/main/config.ts'), /@deprecated 0\.5\.2[\s\S]*?slackTriage\?: SlackTriage;/, 'kept, deprecated, so old files parse');
  assert.match(read('src/main/config.ts'), /responder\?: string;/);
  assert.match(read('src/preload/index.ts'), /responder\?: string;/);
  assert.match(read('src/renderer/src/store/config.ts'), /responder\?: string;/);
  const set = code.slice(code.indexOf("ipcMain.handle('slack:setConfig'"), code.indexOf("ipcMain.handle('triggers:getContext'"));
  assert.doesNotMatch(set, /next\.slackTriage/, 'slack:setConfig accepts triage and ignores it');
  assert.match(set, /void p\.triage;/);
  const settings = read('src/renderer/src/components/SettingsModal.tsx') + read('src/renderer/src/components/settings/ConnectionsSection.tsx');
  assert.ok(!settings.includes('data-slack-triage') && !settings.includes('SLACK_TRIAGES.map'), 'the radio is gone');
  assert.ok(settings.includes('data-agent-picker') || settings.includes('<AgentPicker value={get(\'responder\''), 'the select exists');
  assert.match(settings, /draft\?\.stage\(\{ responder: id \}\)/, 'staged and saved with the page; nothing stops or restarts');
  assert.ok(!/slackTriage === 'temps'/.test(settings), 'the temps folder row went with the route');
  const keys = ['settings.connections.responder.heading', 'settings.connections.responder.hint', 'settings.connections.responder.orchestrator', 'settings.connections.slackDesc'];
  const locales = Object.fromEntries(['en', 'zh-CN', 'ar'].map((l) => [l, JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`))]));
  const get = (o, k) => k.split('.').reduce((a, p) => (a == null ? undefined : a[p]), o);
  for (const k of keys) {
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
  for (const l of ['en', 'zh-CN', 'ar']) assert.equal(locales[l].settings.connections.slackTriage, undefined, `${l}: the old strings are gone`);
  assert.equal(locales.en.settings.connections.responder.heading, 'Who answers inbound messages');
});
