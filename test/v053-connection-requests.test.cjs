/**
 * 0.5.3 batch 3 #6: agents add and edit connections themselves, through a
 * request file in their own folder (main/connectionRequests.ts). Kevin's
 * conditions (25 Sep): a strict shape (unknown op or field is an error and
 * nothing is applied), a result with a secret is 0600 and gone after 24 h,
 * state.json holds no secret or token, the requester's id is in the log and
 * the result, and a hostile request is refused.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const { processConnectionRequests, validateRequest, REQUEST_MAX_BYTES, RESULT_TTL_MS } = loadTs('src/main/connectionRequests.ts');

const AGENT = 'kelly-abc123';
const SECRET_RE = /[0-9a-f]{64}/;

function floor() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'md-conn-'));
  const reqDir = path.join(root, 'agents', AGENT, 'connections', 'requests');
  const resDir = path.join(root, 'agents', AGENT, 'connections', 'results');
  fs.mkdirSync(reqDir, { recursive: true });
  let hooks = [];
  let n = 0;
  const calls = { save: 0, slack: [], defaults: [], changed: 0 };
  const logs = [];
  let now = Date.parse('2026-09-25T10:00:00Z');
  const deps = {
    hiveRoot: () => root,
    listWebhooks: () => hooks,
    saveWebhooks: (list) => { calls.save++; hooks = list.map((w) => ({ schema: '{}', ...w })); return hooks; },
    mintSecret: () => (++n).toString(16).padStart(64, 'a'),
    newWebhookId: () => `wh-test-${n}`,
    endpointUrl: (id) => `https://t.example/${id}`,
    applySlack: (p) => calls.slack.push(p),
    setDefaults: (d) => calls.defaults.push(d),
    snapshot: () => ({ webhooks: hooks.map((w) => ({ id: w.id, name: w.name, to: w.to ?? '' })), slack: { botTokenSet: calls.slack.some((p) => p.botToken) } }),
    log: (e) => logs.push(e),
    now: () => now,
    onChanged: () => { calls.changed++; }
  };
  const put = (name, body) => fs.writeFileSync(path.join(reqDir, name), typeof body === 'string' ? body : JSON.stringify(body));
  const result = (id) => JSON.parse(fs.readFileSync(path.join(resDir, `${id}.json`), 'utf8'));
  const run = () => processConnectionRequests(deps);
  return { root, reqDir, resDir, deps, put, result, run, calls, logs, get hooks() { return hooks; }, set now(v) { now = v; } };
}

test('add: the webhook is stored, the result has its id, address and secret (0600), and names the agent', () => {
  const f = floor();
  f.put('a.json', { id: 'r1', op: 'webhook.add', webhook: { name: 'Support desk', to: 'kevin-1', prompt: 'Draft a reply.', auth: 'bearer' } });
  assert.equal(f.run(), 1);
  assert.equal(f.hooks.length, 1);
  const w = f.hooks[0];
  assert.equal(w.name, 'Support desk');
  assert.equal(w.auth, 'bearer');
  assert.equal(w.enabled, true);
  assert.equal(w.guardrails, true, 'a new endpoint keeps the guardrails');
  const r = f.result('r1');
  assert.deepEqual({ ok: r.ok, from: r.from, webhookId: r.webhookId, url: r.url, sends: r.sends }, { ok: true, from: AGENT, webhookId: w.id, url: `https://t.example/${w.id}`, sends: 'Authorization: Bearer <secret>' });
  assert.equal(r.secret, w.secret);
  if (process.platform !== 'win32') assert.equal(fs.statSync(path.join(f.resDir, 'r1.json')).mode & 0o777, 0o600);
  assert.ok(!fs.existsSync(path.join(f.reqDir, 'a.json')), 'the request is removed once read');
  assert.equal(f.logs[0].from, AGENT);
  assert.equal(f.logs[0].ok, true);
  assert.ok(!SECRET_RE.test(JSON.stringify(f.logs)), 'no secret in the log');
  assert.equal(f.calls.changed, 1);
});

test('state.json and the README are published, and state.json never holds a secret or a token', () => {
  const f = floor();
  f.put('a.json', { id: 'r1', op: 'webhook.add', webhook: { name: 'X' } });
  f.put('b.json', { id: 'r2', op: 'slack.set', slack: { enabled: true, botToken: 'xoxb-111-222-secretvalue', channelId: 'C1' } });
  f.run();
  const state = fs.readFileSync(path.join(f.root, 'connections', 'state.json'), 'utf8');
  assert.ok(!SECRET_RE.test(state) && !/xoxb-/.test(state), 'a secret reached state.json');
  assert.match(fs.readFileSync(path.join(f.root, 'connections', 'README.md'), 'utf8'), /\$AGENT_DIR\/connections\/requests/);
  assert.deepEqual(f.calls.slack, [{ enabled: true, botToken: 'xoxb-111-222-secretvalue', channelId: 'C1' }]);
  const r = f.result('r2');
  assert.equal(r.ok, true);
  assert.ok(!/xoxb-/.test(JSON.stringify(r)), 'a Slack token is never echoed back');
});

test('an unknown op or field is an error result, and nothing is applied', () => {
  const f = floor();
  f.put('1.json', { id: 'u1', op: 'webhook.drop', webhookId: 'x' });
  f.put('2.json', { id: 'u2', op: 'webhook.add', webhook: { name: 'X', secret: 'mine' } });
  f.put('3.json', { id: 'u3', op: 'webhook.add', webhook: { name: 'X' }, extra: 1 });
  f.put('4.json', { id: 'u4', op: 'slack.set', slack: { botToken: 'x', port: 80 } });
  f.put('5.json', { id: 'u5', op: 'webhook.add', webhook: { name: 'X', schema: '{' } });
  f.put('6.json', { id: 'u6', op: 'webhook.add', webhook: { description: 'no name' } });
  f.put('7.json', { id: 'u7', op: 'defaults.set', defaults: { webhookResponder: '../god' } });
  f.run();
  assert.equal(f.calls.save, 0);
  assert.deepEqual(f.calls.slack, []);
  assert.deepEqual(f.calls.defaults, []);
  assert.match(f.result('u1').error, /unknown op/);
  assert.match(f.result('u2').error, /unknown field webhook\.secret/);
  assert.match(f.result('u3').error, /unknown field extra/);
  assert.match(f.result('u4').error, /unknown field slack\.port/);
  assert.match(f.result('u5').error, /bad value for webhook\.schema/);
  assert.match(f.result('u6').error, /needs webhook\.name/);
  assert.match(f.result('u7').error, /bad value for defaults\.webhookResponder/);
  for (const id of ['u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7']) assert.equal(f.result(id).from, AGENT);
  assert.ok(f.logs.every((l) => l.ok === false && l.from === AGENT));
  assert.equal(fs.readdirSync(f.reqDir).length, 0);
});

test('hostile: path traversal in the id, an oversized file, a symlink and bad JSON are refused', () => {
  const f = floor();
  const outside = path.join(f.root, 'outside.txt');
  fs.writeFileSync(outside, 'do not touch');
  f.put('trav.json', { id: '../../outside', op: 'webhook.add', webhook: { name: 'X' } });
  f.put('big.json', JSON.stringify({ id: 'big', op: 'webhook.add', webhook: { name: 'X', prompt: 'y'.repeat(REQUEST_MAX_BYTES) } }));
  fs.symlinkSync(outside, path.join(f.reqDir, 'link.json'));
  f.put('bad.json', '{"id":"bad",');
  f.put('../../escape.json'.replace(/\.\.\//g, ''), { id: 'fine-name', op: 'webhook.remove', webhookId: 'wh-none' });
  f.run();
  assert.equal(f.calls.save, 0);
  assert.equal(fs.readFileSync(outside, 'utf8'), 'do not touch', 'the symlink target is untouched');
  const results = fs.readdirSync(f.resDir);
  assert.ok(results.every((n) => /^[A-Za-z0-9._-]+\.json$/.test(n) && !n.includes('..')), results.join(','));
  assert.ok(!fs.existsSync(path.join(f.root, 'outside.json')), 'a result escaped its folder');
  assert.match(f.result('trav').error, /id must match/);
  assert.match(f.result('big').error, /larger than/);
  assert.match(f.result('link').error, /not a plain file/);
  assert.match(f.result('bad').error, /not valid JSON/);
  assert.match(f.result('fine-name').error, /no webhook wh-none/);
  assert.equal(fs.readdirSync(f.reqDir).length, 0, 'every request, hostile or not, is removed');
  assert.ok(fs.existsSync(outside), 'removing the symlink did not remove its target');
});

test('edit, rotate and remove act on the named webhook only; a secret is taken for Linear alone', () => {
  const f = floor();
  f.put('a.json', { id: 'a1', op: 'webhook.add', webhook: { name: 'One' } });
  f.put('b.json', { id: 'a2', op: 'webhook.add', webhook: { name: 'Two', source: 'linear' } });
  f.run();
  const [one, two] = f.hooks;
  const oldSecret = one.secret;
  f.put('c.json', { id: 'e1', op: 'webhook.edit', webhookId: one.id, webhook: { to: 'jim-1', enabled: false } });
  f.put('d.json', { id: 'e2', op: 'webhook.edit', webhookId: one.id, webhook: { secret: 'x'.repeat(32) } });
  f.put('e.json', { id: 'e3', op: 'webhook.edit', webhookId: two.id, webhook: { secret: 'lin_wh_' + 'z'.repeat(30) } });
  f.run();
  assert.equal(f.hooks[0].to, 'jim-1');
  assert.equal(f.hooks[0].enabled, false);
  assert.equal(f.hooks[0].secret, oldSecret, 'an edit keeps the secret');
  assert.match(f.result('e2').error, /only a Linear webhook takes a secret/);
  assert.equal(f.hooks[1].secret, 'lin_wh_' + 'z'.repeat(30));
  f.put('f.json', { id: 'k1', op: 'webhook.rotateSecret', webhookId: one.id });
  f.run();
  assert.notEqual(f.hooks[0].secret, oldSecret);
  assert.equal(f.result('k1').secret, f.hooks[0].secret);
  f.put('g.json', { id: 'x1', op: 'webhook.remove', webhookId: one.id });
  f.run();
  assert.deepEqual(f.hooks.map((w) => w.id), [two.id]);
  assert.equal(f.result('x1').secret, undefined);
});

test('defaults.set writes the default agents; results older than a day are removed', () => {
  const f = floor();
  f.put('a.json', { id: 'd1', op: 'defaults.set', defaults: { webhookResponder: 'kevin-1', responder: '' } });
  f.run();
  assert.deepEqual(f.calls.defaults, [{ webhookResponder: 'kevin-1', responder: '' }]);
  const file = path.join(f.resDir, 'd1.json');
  const old = new Date(Date.parse('2026-09-25T10:00:00Z') - RESULT_TTL_MS - 60_000);
  fs.utimesSync(file, old, old);
  f.run();
  assert.ok(!fs.existsSync(file), 'a day old result was kept');
});

test('the requester is the folder, never a field the request claims', () => {
  assert.equal(validateRequest({ id: 'r', op: 'webhook.remove', webhookId: 'w', from: 'god' }).ok, false);
  const f = floor();
  f.put('a.json', { id: 'r9', op: 'webhook.add', webhook: { name: 'X' } });
  f.run();
  assert.equal(f.result('r9').from, AGENT);
});

test('main wiring: the same doors as Settings, started with the hive router, windows told', () => {
  const main = read('src/main/index.ts');
  assert.match(main, /ipcMain\.handle\('webhooks:save', \(_evt, arg: unknown\) => storeWebhooks\(Array\.isArray\(arg\) \? arg : \[\]\)\);/);
  assert.match(main, /ipcMain\.handle\('slack:setConfig', \(_evt, patch: unknown\) => writeSlackConfig\(patch\)\);/);
  assert.match(main, /saveWebhooks: \(list\) => storeWebhooks\(list\),/);
  assert.match(main, /hive\.startRouter\(\);\n  startConnectionRequests\(\);/);
  assert.match(main, /log: \(e\) => hive\.appendLog\(e\),/);
  assert.match(main, /onChanged: \(\) => \{ try \{ liveWebContents\(\)\?\.send\('webhooks:changed'\); \}/);
  const snap = main.slice(main.indexOf('function connectionSnapshot'), main.indexOf('let connectionTimer'));
  assert.ok(!/\.secret\b|slackBotToken\b(?!\s*,)|Token:\s*c\./.test(snap.replace(/botTokenSet: !!c\.slackBotToken|appTokenSet: !!c\.slackAppToken|signingSecretSet: !!c\.slackSigningSecret/g, '')), 'the snapshot reads a secret');
  assert.match(read('src/preload/index.ts'), /ipcRenderer\.on\('webhooks:changed', listener\);/);
  assert.match(read('src/renderer/src/components/settings/InboundIntegrations.tsx'), /return window\.cth\.onWebhooksChanged\?\.\(\(\) => \{/);
});

test('agents are told where the README is, in their standing prompt', () => {
  const hive = read('src/main/hive.ts');
  assert.match(hive, /`CONNECTIONS: to add or change an inbound webhook, Slack or the default agents yourself, write a request file as \$\{inRoot\('connections', 'README\.md'\)\} explains; never edit config files\.`,/);
  assert.ok(hive.indexOf('CONNECTIONS:') > hive.indexOf('      slackLine,'), 'after the Slack line, before the env line');
});

test('Settings never saves its copy over a list an agent changed; it says so and offers Reload', () => {
  const src = read('src/renderer/src/components/settings/InboundIntegrations.tsx');
  assert.match(src, /if \(pending\.hooks\) \{ pending\.stale = true; bump\(\(v\) => v \+ 1\); \}/, 'webhooks:changed marks an edited copy stale');
  assert.match(src, /if \(pending\.hooks && pending\.stale\) throw new Error\(t\('settings\.conn\.inbound\.changedByAgent'\)\);\s*if \(pending\.hooks\) \{/, 'Save refuses before writing');
  assert.match(src, /const reload = \(\) => \{\s*pending\.hooks = null; pending\.stale = false;/);
  for (const l of ['en', 'ar', 'zh-CN']) {
    const ib = JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`)).settings.conn.inbound;
    assert.ok(ib.changedByAgent && ib.reload, l);
  }
  assert.match(JSON.parse(read('src/renderer/src/i18n/locales/en.json')).settings.conn.inbound.changedByAgent, /^Changed by an agent, reload\./);
});
