/**
 * 0.5.3 batch 3, Connections (founder 25 Sep 2026):
 *   #9      Slack: no Advanced fold; the connection type at the top level and
 *           only the fields that type needs.
 *   #10-14  no Integrations tab; Connections > "Inbound integrations" holds the
 *           samples, an "Add new inbound webhook" form (type, the request it
 *           accepts, authentication, agent, prompt) and every endpoint.
 *   #12     Add webhook never says "could not generate a secret".
 *   #14     the Automations webhook editor has Answered by.
 * The authentication choice is real: a blank endpoint can take a header
 * secret, a bearer token or an HMAC signed body, and the server checks it.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHmac } = require('node:crypto');
const { EventEmitter } = require('node:events');
const loadTs = require('./load-ts.cjs');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const { slackFieldsShown } = loadTs('src/shared/slackSetup.ts');
const { blankInboundForm, inboundFormProblem, webhookFromForm, authHeaderExample } = loadTs('src/shared/inboundWebhook.ts');
const { DEFAULT_WEBHOOK_SCHEMA, isWebhookAuth } = loadTs('src/shared/triggers.ts');
const { WebhookServer, bearerToken, verifyCustomSignature } = loadTs('src/main/webhook.ts');

const CONN = read('src/renderer/src/components/settings/ConnectionsSection.tsx');
const INBOUND = read('src/renderer/src/components/settings/InboundIntegrations.tsx');
const MODAL = read('src/renderer/src/components/SettingsModal.tsx');
const AUTOS = read('src/renderer/src/components/pro/AutomationsScreen.tsx');

/* ── #9 Slack ───────────────────────────────────────────────────────── */

test('#9 each connection type shows only its own fields', () => {
  assert.deepEqual(slackFieldsShown('auto', 'polling'), ['botToken', 'appToken', 'channelId'], 'automatic needs the app token field: it is what picks live');
  assert.deepEqual(slackFieldsShown('socket', 'socket'), ['botToken', 'appToken', 'channelId']);
  assert.deepEqual(slackFieldsShown('polling', 'polling'), ['botToken', 'channelId']);
  assert.deepEqual(slackFieldsShown('webhook', 'webhook'), ['signingSecret', 'botToken']);
});

test('#9 the Slack card has no Advanced fold, and every token field is drawn from that list', () => {
  assert.ok(!/settings\.conn\.advanced|slack-advanced/.test(CONN), 'the Advanced fold is back');
  assert.match(CONN, /const shown = slackFieldsShown\(way, mode\);/);
  for (const f of ['botToken', 'appToken', 'signingSecret', 'channelId']) assert.match(CONN, new RegExp(`\\{shown\\.includes\\('${f}'\\) && \\(`), f);
  // The type picker sits above the fields, and the per type extras follow the mode.
  assert.ok(CONN.indexOf('data-slack-way') < CONN.indexOf('data-slack-fields'));
  assert.match(CONN, /\{mode === 'polling' && \(\s*<FieldRow label=\{t\('settings\.connections\.slackWay\.checkEvery'\)\}/);
  assert.match(CONN, /\{mode === 'socket' && \(\s*<FieldRow label=\{t\('settings\.connections\.slackWay\.catchupEvery'\)\}/);
  assert.match(CONN, /\{mode === 'webhook' && live\?\.url && \(/);
});

/* ── #10 to #14 Inbound integrations ────────────────────────────────── */

test('#10 Integrations is gone from the Settings menu, and Connections holds Inbound integrations', () => {
  assert.ok(!MODAL.includes("'Integrations'"), 'Integrations is still a Settings section');
  assert.ok(!fs.existsSync(path.join(ROOT, 'src/renderer/src/components/settings/IntegrationsSection.tsx')));
  assert.match(CONN, /<SlackCard config=\{config\} godName=\{godName\} \/>\s*<InboundIntegrationsCard config=\{config\} godName=\{godName\} \/>/);
  const en = JSON.parse(read('src/renderer/src/i18n/locales/en.json')).settings.conn.inbound;
  assert.equal(en.title, 'Inbound integrations');
  assert.equal(en.lead, 'Get a public, authenticated webhook that tools on the internet can hit.');
  assert.match(INBOUND, /title=\{t\('settings\.conn\.inbound\.title'\)\}/);
});

test('#11 the samples live in Inbound integrations and open the form on their type', () => {
  assert.match(INBOUND, /\(\['github', 'linear', 'telegram', 'custom'\] as const\)\.map\(\(s\) => \(/);
  assert.match(INBOUND, /onClick=\{\(\) => openForm\(s\)\} dataAttrs=\{\{ 'data-inbound-sample': s \}\}/);
  assert.match(INBOUND, /onClick=\{\(\) => openForm\('custom'\)\} dataAttrs=\{\{ 'data-inbound-add': 'true' \}\}>\{t\('settings\.conn\.inbound\.add'\)\}/);
  assert.equal(JSON.parse(read('src/renderer/src/i18n/locales/en.json')).settings.conn.inbound.add, 'Add new inbound webhook');
});

test('#13 the form asks for the type, the request, the authentication, the agent and the prompt', () => {
  const at = INBOUND.indexOf('function AddInboundSheet');
  const sheet = INBOUND.slice(at, INBOUND.indexOf('\nfunction EndpointEditor', at));
  for (const k of ['type', 'accepts', 'auth', 'goesTo', 'prompt']) assert.match(sheet, new RegExp(`t\\('settings\\.conn\\.inbound\\.form\\.${k}'\\)`), k);
  assert.match(sheet, /<JsonEditor value=\{f\.schema\}/, 'a blank webhook edits the schema it accepts');
  assert.match(sheet, /WEBHOOK_AUTHS\.map/);
  assert.match(sheet, /<AgentPicker value=\{f\.to\}/);
  assert.match(sheet, /<Sheet onClose=\{onClose\} width=\{600\} zIndex=\{320\}>/, 'above the Classic settings modal (300)');
  assert.match(sheet, /disabled=\{problem !== null\}/);
});

test('#13 the form makes the endpoint it describes', () => {
  const base = { id: 'wh-1', name: 'inbound', secret: 's'.repeat(64), enabled: false, mode: 'strict', schema: DEFAULT_WEBHOOK_SCHEMA, createdAt: 1, guardrails: true };
  const blank = { ...blankInboundForm('custom'), name: ' Support desk ', description: ' tickets ', auth: 'bearer', to: 'kevin-1', prompt: ' draft a reply ', schema: '{"type":"object"}' };
  assert.deepEqual(webhookFromForm(blank, base), { ...base, name: 'Support desk', enabled: true, schema: '{"type":"object"}', auth: 'bearer', description: 'tickets', prompt: 'draft a reply', to: 'kevin-1' });
  const gh = webhookFromForm({ ...blankInboundForm('github', 'GitHub'), auth: 'hmac', schema: 'not json' }, base);
  assert.equal(gh.source, 'github');
  assert.equal(gh.auth, undefined, 'a service signs its own way');
  assert.equal(gh.schema, DEFAULT_WEBHOOK_SCHEMA);
  assert.equal(gh.guardrails, true, 'the guardrails stay on for a new endpoint');
  assert.equal(webhookFromForm({ ...blankInboundForm('custom'), name: 'x' }, base).auth, undefined, 'header is the default and not stored');
  assert.equal(inboundFormProblem(blankInboundForm('custom')), 'name');
  assert.equal(inboundFormProblem({ ...blankInboundForm('custom'), name: 'x', schema: '{' }), 'schema');
  assert.equal(inboundFormProblem({ ...blankInboundForm('linear', 'Linear'), schema: '{' }), null, 'a service has no schema to get wrong');
  assert.equal(authHeaderExample('bearer'), 'Authorization: Bearer <secret>');
});

test('#12 Add webhook cannot say "could not generate a secret"', () => {
  for (const f of [MODAL, INBOUND, CONN, AUTOS]) assert.ok(!/could not generate a secret/.test(f));
  // The only mint the page uses falls back to a local 256 bit secret.
  const api = read('src/renderer/src/components/triggers/api.ts');
  assert.match(api, /const secret = await window\.cth\.generateWebhookSecret\(\);\s*if \(secret\) return secret;\s*\} catch \{ \/\* fall through to a local mint \*\/ \}\s*return localSecret\(\);/);
  assert.match(INBOUND, /const secret = await generateWebhookSecret\(\);\s*const w = webhookFromForm\(f, newWebhook\(secret, hooks\.length\)\);/);
});

test('#14 the Automations webhook editor has Answered by, and the same authentication choice', () => {
  const at = AUTOS.indexOf('function WebhookEditor');
  const ed = AUTOS.slice(at, AUTOS.indexOf('\nfunction OrgEditor', at));
  assert.match(ed, /<AgentPicker value=\{hook\.to \?\? ''\} onChange=\{\(to\) => onPatch\(\{ to \}\)\}/);
  assert.match(ed, /\{\(hook\.source \?\? 'custom'\) === 'custom' && \(/);
  assert.match(ed, /onChange=\{\(auth\) => onPatch\(\{ auth \}\)\}/);
});

test('the list in Connections is every webhook automation, with its editor', () => {
  assert.match(INBOUND, /hooks\.map\(\(w\) => \{/);
  assert.match(INBOUND, /<EndpointEditor\s+hook=\{w\}/);
  assert.match(INBOUND, /nav\.go\('automations'\)/);
});

/* ── authentication, end to end through the server ──────────────────── */

const SECRET = 'a'.repeat(64);
const BODY = JSON.stringify({ message: 'hello' });
const sign = (body, secret = SECRET) => `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;

function makeServer() {
  const seen = [];
  const schema = JSON.stringify({ type: 'object', required: ['message'] });
  const server = new WebhookServer({
    port: 0,
    endpoints: [
      { id: 'hdr', name: 'Header', secret: SECRET, schema },
      { id: 'bear', name: 'Bearer', secret: SECRET, schema, auth: 'bearer' },
      { id: 'sig', name: 'Signed', secret: SECRET, schema, auth: 'hmac' }
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

test('bearer: Authorization: Bearer <secret> gets in; the header secret or a wrong token does not', async () => {
  const { server, seen } = makeServer();
  assert.equal((await request(server, { url: '/bear', headers: { authorization: `Bearer ${SECRET}` }, body: BODY })).status, 200);
  assert.equal((await request(server, { url: '/bear', headers: { authorization: `Bearer ${'b'.repeat(64)}` }, body: BODY })).status, 401);
  assert.equal((await request(server, { url: '/bear', headers: { 'x-md-webhook-secret': SECRET }, body: BODY })).status, 401);
  assert.equal(seen.length, 1);
  assert.equal(bearerToken('bearer  abc '), 'abc');
  assert.equal(bearerToken('Basic abc'), null);
});

test('hmac: a body signed with the secret gets in; a tampered body, another key or no signature does not', async () => {
  const { server, seen } = makeServer();
  assert.equal((await request(server, { url: '/sig', headers: { 'x-md-signature': sign(BODY) }, body: BODY })).status, 200);
  assert.equal((await request(server, { url: '/sig', headers: { 'x-md-signature': sign(BODY) }, body: BODY.replace('hello', 'hellO') })).status, 401);
  assert.equal((await request(server, { url: '/sig', headers: { 'x-md-signature': sign(BODY, 'c'.repeat(64)) }, body: BODY })).status, 401);
  assert.equal((await request(server, { url: '/sig', headers: { 'x-md-webhook-secret': SECRET }, body: BODY })).status, 401, 'the plain secret does not open a signed endpoint');
  assert.equal(seen.length, 1);
  assert.ok(!verifyCustomSignature({ 'x-md-signature': 'sha256=' }, Buffer.from(BODY), SECRET));
});

test('header: the original contract is unchanged, and a bearer token does not open it', async () => {
  const { server, seen } = makeServer();
  assert.equal((await request(server, { url: '/hdr', headers: { 'x-md-webhook-secret': SECRET }, body: BODY })).status, 200);
  assert.equal((await request(server, { url: '/hdr', headers: { authorization: `Bearer ${SECRET}` }, body: BODY })).status, 401);
  assert.equal((await request(server, { url: '/nope', headers: { 'x-md-signature': sign(BODY) }, body: BODY })).status, 401, 'an unknown id is still a 401');
  assert.equal(seen.length, 1);
});

test('main keeps the auth choice: stored when not the default, kept when the field is absent', () => {
  const main = read('src/main/index.ts');
  assert.match(main, /\.\.\.\(isWebhookAuth\(r\.auth\) \? \(r\.auth === 'header' \? \{\} : \{ auth: r\.auth \}\) : \(prior\?\.auth \? \{ auth: prior\.auth \} : \{\}\)\)/);
  assert.ok(isWebhookAuth('hmac') && !isWebhookAuth('basic'));
  const web = read('src/main/webhook.ts');
  assert.match(web, /have\.length === want\.length && timingSafeEqual\(have, want\)/, 'the signature compare is constant time and length guarded');
});

/* ── copy ───────────────────────────────────────────────────────────── */

test('copy: the new strings exist in all three languages, and the English has no dash', () => {
  const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v, `${p}${k}.`) : [[`${p}${k}`, v]]));
  const loc = (l) => new Map(flat(JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`)).settings.conn.inbound));
  const en = loc('en');
  assert.ok(en.size > 30);
  for (const l of ['zh-CN', 'ar']) assert.deepEqual([...loc(l).keys()].sort(), [...en.keys()].sort(), l);
  for (const [k, v] of en) assert.ok(!/[–—]|\s-\s/.test(v), `${k} has a dash`);
  for (const l of ['en', 'ar', 'zh-CN']) {
    const s = JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`)).settings;
    assert.ok(s.conn.slack.signingSecretInfo, `${l} lacks the signing secret tip`);
    assert.ok(!('integrations' in s.nav), `${l} still names the Integrations tab`);
  }
});
