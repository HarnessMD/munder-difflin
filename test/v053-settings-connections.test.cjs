'use strict';

/* 0.5.3 settings redesign, Connections and Integrations (founder, 24 Sep
 * 2026). Pinned here:
 *   - Slack in three fields: the tokens pick the way, the switch is a field,
 *     Save says what to do to the bridge (shared/slackSetup.ts).
 *   - Every inbound webhook reaches the agent picked for it: the endpoint's
 *     own, else the webhook default, else the orchestrator.
 *   - GitHub, Linear and Telegram prove themselves with their own signature,
 *     constant time, and a missing or bad one is refused; our own header
 *     keeps working. Driven through the real handler with stub requests: no
 *     network, no real service.
 *   - Telegram's setWebhook only for a Telegram endpoint, with a well formed
 *     token, never stored.
 *   - The sections stage into the page's one draft and never write config.
 *   - Settings' Add webhook bug (it read a {ok, secret} the preload never
 *     returns) cannot come back: Integrations mints through triggers/api.
 *   - Copy in three languages, no dashes. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHmac } = require('node:crypto');
const { EventEmitter } = require('node:events');
const loadTs = require('./load-ts.cjs');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const { slackModeFor, slackMissingFields, slackSaveAction, initialSlackWay } = loadTs('src/shared/slackSetup.ts');
const { resolveWebhookRecipient } = loadTs('src/shared/responder.ts');
const { inboundFromService, verifyServiceSignature, hasServiceSignature } = loadTs('src/main/serviceWebhooks.ts');
const { WebhookServer } = loadTs('src/main/webhook.ts');

/* ── Slack in three fields ──────────────────────────────────────────── */

const fields = (p) => ({ on: true, way: 'auto', botToken: 'xoxb-1', appToken: '', channelId: '', signingSecret: '', ...p });

test('the tokens pick the way: an app token is live, none polls; a chosen way stays chosen', () => {
  assert.equal(slackModeFor({ way: 'auto', appToken: 'xapp-1' }), 'socket');
  assert.equal(slackModeFor({ way: 'auto', appToken: '  ' }), 'polling');
  assert.equal(slackModeFor({ way: 'webhook', appToken: 'xapp-1' }), 'webhook');
  assert.equal(initialSlackWay({ mode: 'socket', appToken: 'xapp-1' }), 'auto');
  assert.equal(initialSlackWay({ mode: 'polling', appToken: 'xapp-1' }), 'polling', 'polling despite an app token was chosen on purpose');
  assert.equal(initialSlackWay({ mode: 'webhook', appToken: '' }), 'webhook');
});

test('what is missing, per way, mirrors main: polling needs a channel, the socket an app token', () => {
  assert.deepEqual(slackMissingFields(fields({})), ['channelId']);
  assert.deepEqual(slackMissingFields(fields({ channelId: 'C1' })), []);
  assert.deepEqual(slackMissingFields(fields({ appToken: 'xapp-1' })), [], 'the socket needs no channel');
  assert.deepEqual(slackMissingFields(fields({ botToken: '', appToken: 'xapp-1' })), ['botToken']);
  assert.deepEqual(slackMissingFields(fields({ way: 'webhook' })), ['signingSecret']);
});

test('Save: switch off stops, everything there starts, anything missing starts nothing', () => {
  assert.equal(slackSaveAction(fields({ on: false })), 'stop');
  assert.equal(slackSaveAction(fields({ channelId: 'C1' })), 'start');
  assert.equal(slackSaveAction(fields({})), 'none');
});

/* ── who takes a webhook call ───────────────────────────────────────── */

test('a webhook call goes to its own agent, else the default, else the orchestrator, never to a gone agent', () => {
  const active = ['god', 'a1', 'a2'];
  assert.equal(resolveWebhookRecipient('a1', 'a2', active, 'god'), 'a1');
  assert.equal(resolveWebhookRecipient('', 'a2', active, 'god'), 'a2');
  assert.equal(resolveWebhookRecipient(undefined, undefined, active, 'god'), 'god');
  assert.equal(resolveWebhookRecipient('gone', 'a2', active, 'god'), 'god', 'a named agent that is gone is not replaced by the default');
  assert.equal(resolveWebhookRecipient(undefined, 'gone', active, 'god'), 'god');
});

test('main sends webhook work to that agent, and the approved path carries the same endpoint agent', () => {
  const main = read('src/main/index.ts');
  const at = main.indexOf('function dispatchWebhookWork(');
  const body = main.slice(at, main.indexOf('\n}\n', at));
  assert.match(body, /const to = arg\.origin === 'webhook'\s*\? resolveWebhookRecipient\(arg\.to, readConfig\(\)\.webhookResponder, selectBroadcastTargets\(hive\.registry\(\)\.agents, ''\), 'god'\)\s*: 'god';/);
  assert.match(body, /hive\.send\(\{\s*to,/);
  assert.match(main, /guardrails: trigger\?\.guardrails, to: trigger\?\.to \}\)/);
  assert.match(main, /guardrails: held\?\.guardrails, to: held\?\.to \}\)/);
  // The stored shape: optional, bounded, falling back to what is stored.
  assert.match(main, /isWebhookSource\(r\.source\) \? \{ source: r\.source \}/);
  assert.match(main, /\/\^\[A-Za-z0-9\._-\]\{1,80\}\$\/\.test\(r\.to\.trim\(\)\)/);
  assert.match(main, /r\.description\.trim\(\)\.slice\(0, 200\)/);
  assert.match(main, /if \('webhookResponder' in patch\)/, 'the default is stored like the responder: empty is absent');
  assert.match(read('src/main/config.ts'), /webhookResponder\?: string;/);
});

/* ── service signatures, through the real handler ──────────────────── */

const SECRET = 'c'.repeat(64);
const hmac = (body, secret = SECRET) => createHmac('sha256', secret).update(body).digest('hex');

function makeServer() {
  const seen = [];
  const server = new WebhookServer({
    port: 0,
    endpoints: [
      { id: 'gh', name: 'GitHub', secret: SECRET, schema: '{}', source: 'github' },
      { id: 'ln', name: 'Linear', secret: SECRET, schema: '{}', source: 'linear' },
      { id: 'tg', name: 'Telegram', secret: SECRET, schema: '{}', source: 'telegram' },
      { id: 'own', name: 'Ours', secret: SECRET, schema: JSON.stringify({ type: 'object', required: ['message'] }) }
    ],
    onMessage: (msg, endpoint) => { seen.push({ msg, endpoint }); return { token: 't', taskId: `task-${endpoint.id}`, pending: false }; },
    lookupStatus: () => null
  });
  return { server, seen };
}

function request(server, { url, headers = {}, body }) {
  return new Promise((resolve) => {
    const req = new EventEmitter();
    req.method = 'POST';
    req.url = url;
    req.headers = headers;
    req.destroy = () => undefined;
    const res = {
      writeHead(status) { res._status = status; return res; },
      end(payload) {
        let parsed = null;
        try { parsed = payload ? JSON.parse(payload) : null; } catch { parsed = payload; }
        resolve({ status: res._status, body: parsed });
      }
    };
    server.handleRequest(req, res);
    if (body !== undefined) req.emit('data', Buffer.from(body));
    req.emit('end');
  });
}

const GH_BODY = JSON.stringify({ action: 'opened', repository: { full_name: 'acme/app' }, sender: { login: 'sam' }, pull_request: { title: 'Fix login', html_url: 'https://github.com/acme/app/pull/7', body: 'Please review' } });

test('GitHub: a good X-Hub-Signature-256 is accepted and the event reaches the agent as one message', async () => {
  const { server, seen } = makeServer();
  const r = await request(server, { url: '/gh', headers: { 'x-hub-signature-256': `sha256=${hmac(GH_BODY)}`, 'x-github-event': 'pull_request' }, body: GH_BODY });
  assert.equal(r.status, 200);
  assert.equal(seen.length, 1);
  assert.match(seen[0].msg.message, /^GitHub pull_request \(opened\) on acme\/app\nTitle: Fix login\nBy: sam\nLink: https:\/\/github\.com\/acme\/app\/pull\/7\n\nPlease review$/);
  assert.equal(seen[0].msg.from, 'sam');
});

test('GitHub: a wrong, missing or other secret signature is refused and reaches nothing', async () => {
  const { server, seen } = makeServer();
  const bad = await request(server, { url: '/gh', headers: { 'x-hub-signature-256': `sha256=${hmac(GH_BODY, 'd'.repeat(64))}`, 'x-github-event': 'pull_request' }, body: GH_BODY });
  const tampered = await request(server, { url: '/gh', headers: { 'x-hub-signature-256': `sha256=${hmac(GH_BODY)}`, 'x-github-event': 'pull_request' }, body: GH_BODY.replace('Fix', 'Pwn') });
  const missing = await request(server, { url: '/gh', headers: { 'x-github-event': 'pull_request' }, body: GH_BODY });
  const ours = await request(server, { url: '/gh', headers: { 'x-md-webhook-secret': SECRET }, body: JSON.stringify({ message: 'hi' }) });
  for (const r of [bad, tampered, missing, ours]) assert.equal(r.status, 401);
  assert.equal(seen.length, 0);
});

test('GitHub\'s ping is answered 200 and sent nowhere', async () => {
  const { server, seen } = makeServer();
  const body = JSON.stringify({ zen: 'Keep it logically awesome.' });
  const r = await request(server, { url: '/gh', headers: { 'x-hub-signature-256': `sha256=${hmac(body)}`, 'x-github-event': 'ping' }, body });
  assert.equal(r.status, 200);
  assert.equal(r.body.ignored, 'ping');
  assert.equal(seen.length, 0);
});

test('Linear: a good Linear-Signature is accepted, a bad or missing one refused', async () => {
  const { server, seen } = makeServer();
  const body = JSON.stringify({ type: 'Issue', action: 'create', actor: { name: 'Ana' }, url: 'https://linear.app/acme/issue/ENG-4', data: { identifier: 'ENG-4', title: 'Crash on save', description: 'Steps...' } });
  const ok = await request(server, { url: '/ln', headers: { 'linear-signature': hmac(body) }, body });
  assert.equal(ok.status, 200);
  assert.match(seen[0].msg.message, /^Linear Issue \(create\) ENG-4\nTitle: Crash on save\nBy: Ana\nLink: https:\/\/linear\.app\/acme\/issue\/ENG-4/);
  const bad = await request(server, { url: '/ln', headers: { 'linear-signature': hmac(body, 'e'.repeat(64)) }, body });
  const missing = await request(server, { url: '/ln', headers: {}, body });
  assert.equal(bad.status, 401);
  assert.equal(missing.status, 401);
  assert.equal(seen.length, 1);
});

test('Telegram: the secret token header must be the endpoint\'s secret; a message with no text goes nowhere', async () => {
  const { server, seen } = makeServer();
  const body = JSON.stringify({ update_id: 1, message: { text: 'Is the build green?', from: { username: 'kai' }, chat: { id: 42 } } });
  const ok = await request(server, { url: '/tg', headers: { 'x-telegram-bot-api-secret-token': SECRET }, body });
  assert.equal(ok.status, 200);
  assert.equal(seen[0].msg.message, 'Telegram message from @kai in chat 42:\nIs the build green?');
  const bad = await request(server, { url: '/tg', headers: { 'x-telegram-bot-api-secret-token': 'f'.repeat(64) }, body });
  const missing = await request(server, { url: '/tg', headers: {}, body });
  assert.equal(bad.status, 401);
  assert.equal(missing.status, 401);
  const sticker = JSON.stringify({ update_id: 2, message: { sticker: {}, from: { username: 'kai' }, chat: { id: 42 } } });
  const quiet = await request(server, { url: '/tg', headers: { 'x-telegram-bot-api-secret-token': SECRET }, body: sticker });
  assert.equal(quiet.status, 200);
  assert.equal(seen.length, 1);
});

test('our own header still opens a plain endpoint, and never a service one', async () => {
  const { server, seen } = makeServer();
  const ok = await request(server, { url: '/own', headers: { 'x-md-webhook-secret': SECRET }, body: JSON.stringify({ message: 'hello' }) });
  assert.equal(ok.status, 200);
  assert.equal(seen[0].endpoint.id, 'own');
  const ln = await request(server, { url: '/ln', headers: { 'x-md-webhook-secret': SECRET }, body: JSON.stringify({ message: 'hello' }) });
  assert.equal(ln.status, 401);
});

test('the checks are constant time and length guarded, and the header presence is read before the body', () => {
  const src = read('src/main/serviceWebhooks.ts');
  assert.match(src, /if \(x\.length !== y\.length\) return false;\s*return timingSafeEqual\(x, y\);/);
  assert.ok(!/===\s*secret|secret\s*===/.test(src), 'no plain comparison with the secret');
  const web = read('src/main/webhook.ts');
  assert.match(web, /if \(!hasServiceSignature\(source, req\.headers\)\) \{ json\(res, 401/);
  assert.ok(hasServiceSignature('telegram', { 'x-telegram-bot-api-secret-token': 'x' }));
  assert.ok(!verifyServiceSignature('github', { 'x-hub-signature-256': 'sha256=' }, Buffer.from('{}'), SECRET));
  assert.equal(inboundFromService('telegram', {}, { message: {} }).skip, true);
});

/* ── Telegram setWebhook ────────────────────────────────────────────── */

test('setWebhook: a Telegram endpoint only, a well formed token, its own address and secret, the token never stored', () => {
  const main = read('src/main/index.ts');
  const at = main.indexOf("ipcMain.handle('telegram:setWebhook'");
  const block = main.slice(at, main.indexOf('\n});', at));
  assert.match(block, /if \(!\/\^\\d\{5,16\}:\[A-Za-z0-9_-\]\{20,64\}\$\/\.test\(botToken\)\) return \{ ok: false, error: 'bad-token' \};/);
  assert.match(block, /\.find\(\(w\) => w\.id === a\.id && w\.source === 'telegram'\)/);
  assert.match(block, /JSON\.stringify\(\{ url, secret_token: t\.secret,/);
  assert.ok(!/writeConfig|botToken:/.test(block.replace(/const botToken/, '')), 'the token is not stored');
  assert.match(read('src/renderer/src/components/settings/InboundIntegrations.tsx'), /await window\.cth\.telegramSetWebhook\(id, token\)/, 'called from Save only');
});

/* ── the sections ───────────────────────────────────────────────────── */

const CONN = read('src/renderer/src/components/settings/ConnectionsSection.tsx');
const INTEG = read('src/renderer/src/components/settings/InboundIntegrations.tsx');

test('the sections stage into the one draft and never write config themselves', () => {
  for (const src of [CONN, INTEG]) assert.ok(!/updateConfig/.test(src));
  assert.match(CONN, /draft\.setTask\('slack:apply', applySlack\);/);
  assert.match(INTEG, /draft\?\.stage\(\{ webhookResponder: id \}\)/, 'the webhook default is a staged field');
  assert.match(INTEG, /const touch = \(\) => \{ draft\?\.setTask\(WEBHOOKS_TASK, save\);/);
  assert.match(INTEG, /if \(\(pending\.hooks \|\| Object\.keys\(pending\.tokens\)\.length\) && draft && !draft\.hasTask\(WEBHOOKS_TASK\)\) \{\s*pending\.hooks = null; pending\.tokens = \{\};/, 'Close without saving drops the held edits');
  // Batch 3: Integrations left the nav; its endpoints live in Connections.
  assert.ok(!/INTEGRATIONS_READY/.test(INTEG));
  assert.match(CONN, /<InboundIntegrationsCard config=\{config\} godName=\{godName\} \/>/);
});

test('Settings\' Add webhook bug is gone: endpoints are minted through triggers/api, which reads the plain string', () => {
  const modal = read('src/renderer/src/components/SettingsModal.tsx');
  assert.ok(!/res\.ok && res\.secret|generateWebhookSecret: \(\) => Promise<\{ ok: boolean; secret\?: string \}>/.test(modal), 'the wrong shape is back');
  assert.match(INTEG, /import \{ generateWebhookSecret, listWebhooks, newWebhook, saveWebhooks, webhooksStatus, type WebhooksStatus \} from '\.\.\/triggers\/api';/);
  assert.match(read('src/renderer/src/components/triggers/api.ts'), /const secret = await window\.cth\.generateWebhookSecret\(\);\s*if \(secret\) return secret;/);
});

test('each service card says replies do not go back yet, and the list says it is the Automations list', () => {
  assert.match(INTEG, /data-integ-inbound>\{t\(`settings\.integ\.\$\{s\}\.inboundOnly`\)\}/);
  assert.match(INTEG, /t\('settings\.integ\.list\.same'\)/);
  assert.match(INTEG, /nav\.go\('automations'\)/);
});

test('org settings, MCP servers and REST tokens are not part of the new sections', () => {
  for (const src of [CONN, INTEG]) assert.ok(!/McpDefaultsSettings|IntegrationsRegistry|orgTrigger|OrgTriggerKey/.test(src));
});

test('copy: the new strings exist in en, zh-CN and ar with the same keys, and the English has no dash', () => {
  const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v, `${p}${k}.`) : [[`${p}${k}`, v]]));
  const loc = (l) => new Map(flat(JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`)).settings).filter(([k]) => /^(conn|integ)\./.test(k)));
  const en = loc('en');
  assert.ok(en.size > 80);
  for (const l of ['zh-CN', 'ar']) assert.deepEqual([...loc(l).keys()].sort(), [...en.keys()].sort(), l);
  for (const [k, v] of en) assert.ok(!/[–—]|\s-\s/.test(v.replace(/x-md-webhook-secret|application\/json/g, '')), `${k} has a dash`);
});
