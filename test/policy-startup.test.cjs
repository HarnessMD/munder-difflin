'use strict';
/**
 * The guardrail as the hook server wires it. The rules load when the hook server
 * starts, "rules loaded: N" is a log row and a status object, a guardrail.json that
 * cannot be loaded reaches god as a message, and a `log` backstop never changes the
 * reply to the agent.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

/** The operator approved guardrail.json as it is now: what the Rules screen records
 *  after a save (guardrailEditor.ts). The approval check itself is tested in
 *  guardrail-editor.test.cjs. */
const approvedNow = (file) => {
  try { return require('node:crypto').createHash('sha256').update(fs.readFileSync(file, 'utf8')).digest('hex'); } catch { return undefined; }
};
const loadTs = require('./load-ts.cjs');

const electron = require.resolve('electron');
require.cache[electron] = {
  id: electron, filename: electron, loaded: true,
  exports: { Notification: class { show() {} static isSupported() { return false; } } },
};

const { HiveManager } = loadTs('src/main/hive.ts');
const { HookServer } = loadTs('src/core/hookServer.ts');

const EXAMPLE = () => fs.readFileSync(path.join(__dirname, '..', 'examples/policy/guardrail.example.json'), 'utf8');

/** A hive with two agents and, when `file` is given, that text as policy/guardrail.json. */
async function floor(t, file, cfg = {}) {
  const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'md-policy-start-')));
  const hive = new HiveManager(() => home);
  // The hive commits in the background; let that queue finish before the temp hive goes.
  t.after(async () => {
    await hive.waitCommitQueue(5000).catch(() => {});
    fs.rmSync(home, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  });
  await hive.ensureAgent({ id: 'god', name: 'God', provider: 'claude', cwd: home, isGod: true });
  await hive.ensureAgent({ id: 'jim-1', name: 'Jim', provider: 'claude', cwd: path.join(home, 'repo') });
  const dir = path.join(hive.root(), 'policy');
  fs.mkdirSync(dir, { recursive: true });
  if (file !== undefined) fs.writeFileSync(path.join(dir, 'guardrail.json'), file);
  const server = new HookServer(hive, () => null, () => ({ harnessHome: home, guardrail: true, guardrailApproved: approvedNow(path.join(dir, 'guardrail.json')), ...cfg }), undefined, undefined);
  const logRows = () => {
    const f = path.join(hive.root(), 'log.jsonl');
    return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
  };
  const godInbox = () => fs.readdirSync(path.join(hive.root(), 'agents', 'god', 'inbox')).filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(hive.root(), 'agents', 'god', 'inbox', f), 'utf8')));
  return { home, hive, server, logRows, godInbox };
}

test('a guardrail.json that cannot be loaded: 0 rules, a status row, and god is told', async (t) => {
  for (const body of ['{ not json', '{"version":1,"rev":0,"rules":[{"id":"x"}]}',
    '{"version":1,"rev":0,"rules":[{"id":"x","principle":"p","agents":"all","backstop":{"on":true,"does":"nuke","match":{"tool":"Bash"}}}]}']) {
    const { server, logRows, godInbox } = await floor(t, body);
    server.announcePolicy();
    const status = logRows().find((r) => r.kind === 'policy-status');
    assert.equal(status.rules_loaded, 0, body);
    assert.ok(status.error, `${body}: error must be set`);
    const msg = godInbox().find((m) => /Guardrail failed to load/.test(m.subject));
    assert.ok(msg, 'the failure must reach god, not only log.jsonl');
    assert.equal(msg.from, 'guardrail');
    assert.equal(msg.requires_reply, false);
    assert.equal(server.policyEngine().status.error, status.error, 'the status and the log say the same thing');
  }
});

test('the example guardrail.json: 3 rules loaded, no message to god', async (t) => {
  const { server, logRows, godInbox } = await floor(t, EXAMPLE());
  server.announcePolicy();
  const status = logRows().find((r) => r.kind === 'policy-status');
  assert.equal(status.rules_loaded, 3);
  assert.equal(status.error, null);
  assert.equal(logRows().filter((r) => r.kind === 'policy-load-failed').length, 0);
  assert.equal(godInbox().filter((m) => /Guardrail/.test(m.subject)).length, 0);
  assert.deepEqual(server.policyEngine().status.ruleIds, ['cross-agent-write', 'destructive-shared-state', 'remote-push']);
});

test('a valid guardrail.json with no backstops on loads 0 rules and is not a failure', async (t) => {
  const { server, logRows, godInbox } = await floor(t, JSON.stringify({ version: 1, rev: 3, rules: [] }));
  server.announcePolicy();
  const status = logRows().find((r) => r.kind === 'policy-status');
  assert.equal(status.rules_loaded, 0);
  assert.equal(status.error, null);
  assert.equal(godInbox().filter((m) => /Guardrail/.test(m.subject)).length, 0);
});

test('the ledger beside guardrail.json is kept out of the hive repo, like the cost ledger', async (t) => {
  const { hive } = await floor(t);
  const ignored = fs.readFileSync(path.join(hive.root(), '.gitignore'), 'utf8').split('\n');
  assert.ok(ignored.includes('policy/guardrail.jsonl'));
  assert.ok(ignored.includes('cost-ledger.jsonl'));
});

test('no guardrail.json: silent, as before', async (t) => {
  const { server, hive, logRows, godInbox } = await floor(t);
  fs.rmSync(path.join(hive.root(), 'policy'), { recursive: true, force: true });
  server.announcePolicy();
  assert.equal(logRows().filter((r) => /^policy-/.test(r.kind)).length, 0);
  assert.equal(godInbox().filter((m) => /Guardrail/.test(m.subject)).length, 0);
  assert.equal(server.policyEngine().status.configured, false);
});

// --- The operator turns the guardrail on in the app config, not in the hive -------

const writePolicy = (home, hive) => ({
  hook_event_name: 'PreToolUse', agent_id: 'jim-1', session_id: 's', tool_name: 'Write',
  tool_input: { file_path: path.join(hive.root(), 'policy', 'guardrail.json'), content: '{}' }, cwd: path.join(home, 'repo'),
});
const denied = (reply) => reply?.hookSpecificOutput?.permissionDecision === 'deny';

test('a guardrail.json the operator has not turned on is not loaded: one row, god told once, nothing enforced', async (t) => {
  for (const cfg of [{ guardrail: false }, { guardrail: undefined }]) {
    // An agent can write the hive, so the file alone proves nothing about who wrote it.
    const { home, hive, server, logRows, godInbox } = await floor(t, EXAMPLE(), cfg);
    server.announceOnce();
    server.announceOnce();
    const status = server.policyEngine().status;
    assert.equal(status.configured, false);
    assert.equal(status.rulesLoaded, 0);
    assert.equal(status.ignored, path.join(hive.root(), 'policy', 'guardrail.json'));
    assert.equal(logRows().filter((r) => r.kind === 'policy-ignored').length, 1);
    assert.equal(logRows().filter((r) => r.kind === 'policy-loaded' || r.kind === 'policy-status').length, 0);
    const told = godInbox().filter((m) => /not turned on/.test(m.subject));
    assert.equal(told.length, 1, 'god is told once');
    assert.equal(told[0].from, 'guardrail');
    assert.doesNotMatch(told[0].subject + told[0].body, /[\u2013\u2014]/);
    // Inert: no backstop, and no self-protection either.
    assert.equal(denied(await server.handle(writePolicy(home, hive))), false);
    assert.equal((await server.handle(pushPayload(home)))?.hookSpecificOutput, undefined);
  }
});

test('turned on, the same file loads and protects itself', async (t) => {
  const { home, hive, server, logRows, godInbox } = await floor(t, EXAMPLE(), { guardrail: true });
  server.announceOnce();
  assert.equal(server.policyEngine().status.rulesLoaded, 3);
  assert.equal(server.policyEngine().status.ignored, null);
  assert.equal(logRows().filter((r) => r.kind === 'policy-ignored').length, 0);
  assert.equal(godInbox().filter((m) => /not turned on/.test(m.subject)).length, 0);
  assert.equal(denied(await server.handle(writePolicy(home, hive))), true);
});

test('turned on with no file: silent, as before', async (t) => {
  const { server, hive, logRows, godInbox } = await floor(t, undefined, { guardrail: true });
  fs.rmSync(path.join(hive.root(), 'policy'), { recursive: true, force: true });
  server.announceOnce();
  assert.equal(logRows().filter((r) => /^policy-/.test(r.kind)).length, 0);
  assert.equal(godInbox().length, 0);
});

// --- A log backstop that fires changes nothing the agent sees -------------------

const pushPayload = (home, extra = {}) => ({
  hook_event_name: 'PreToolUse', agent_id: 'jim-1', session_id: 's', tool_name: 'Bash',
  tool_input: { command: 'git push origin main' }, cwd: path.join(home, 'repo'), ...extra,
});

test('a log backstop that fires is recorded, and the reply is exactly the reply without it', async (t) => {
  const on = await floor(t, EXAMPLE());
  const off = await floor(t);
  const withRule = await on.server.handle(pushPayload(on.home));
  const without = await off.server.handle(pushPayload(off.home));
  assert.deepEqual(withRule, without, 'the guardrail does not change the reply');
  assert.equal(JSON.stringify(withRule).includes('permissionDecision'), false);
  const row = on.logRows().find((r) => r.kind === 'policy-match');
  assert.ok(row, 'the match is logged');
  assert.equal(row.rule_id, 'remote-push');
  assert.equal(row.matched_on, 'command_matches');
  assert.equal(JSON.stringify(row).includes('git push'), false, 'a digest, never the command');
  assert.equal(off.logRows().filter((r) => /^policy-/.test(r.kind)).length, 0, 'no file: nothing evaluated, nothing logged');
});

test('on_error deny on a log backstop still only logs', async (t) => {
  const file = JSON.stringify({
    version: 1, rev: 0, rules: [{
      id: 'bad-regex-at-runtime', principle: 'p', agents: 'all',
      backstop: { on: true, does: 'log', on_error: 'deny', match: { tool: 'Bash', path_glob: '**/x/**' } },
    }],
  });
  const { server, home, logRows } = await floor(t, file);
  const engine = server.policyEngine();
  // Force an evaluation error: load checks every regex, so break the matcher by hand.
  engine.rules[0].match = { tool: 'Bash', command_matches: '(' };
  const reply = await server.handle(pushPayload(home));
  assert.equal(JSON.stringify(reply).includes('permissionDecision'), false);
  const row = logRows().find((r) => r.kind === 'policy-match');
  assert.equal(row.rule_id, 'bad-regex-at-runtime', 'fail closed counts it as a match');
  assert.equal(row.matched_on, 'error');
  assert.ok(logRows().some((r) => r.kind === 'policy-rule-error'));
});

// Upstream's hook token is one value per app run, shared by every agent: it keeps a
// program that does not hold it off the HTTP port. It does not stop one agent from
// posing as another, and hooks.sock is not token checked (a per agent token is a
// later roadmap item).
test('log only: an HTTP hook without the app\'s hook token never reaches the engine', async (t) => {
  const http = require('node:http');
  const { server, home, logRows } = await floor(t, EXAMPLE());
  const ep = await server.startHttp();
  t.after(() => server.stopHttp());
  assert.ok(ep, 'the loopback listener bound');
  const post = (auth) => new Promise((resolve, reject) => {
    const body = JSON.stringify(pushPayload(home));
    const req = http.request({ host: '127.0.0.1', port: ep.port, path: '/hook/jim-1', method: 'POST',
      headers: { 'content-type': 'application/json', ...(auth ? { authorization: auth } : {}) } }, (res) => {
      res.resume(); res.on('end', () => resolve(res.statusCode));
    });
    req.on('error', reject); req.end(body);
  });
  assert.equal(await post(null), 401);
  assert.equal(await post('Bearer forged'), 401);
  assert.equal(logRows().filter((r) => r.kind === 'policy-match').length, 0, 'no row for a rejected hook');
  assert.equal(await post(`Bearer ${ep.token}`), 200);
  assert.equal(logRows().filter((r) => r.kind === 'policy-match').length, 1, 'the same hook with the token is evaluated');
});

// --- Announced once, at start ------------------------------------------------------
//
// The socket binds asynchronously and may never succeed (no root yet, or a stranger
// owns the path). The status row and the message to god must not wait for a bind;
// they come from start(), once per app run, and a later re-bind does not repeat them.

test('start() announces the guardrail even when the socket never binds, and only once', async (t) => {
  const { hive, server, logRows, godInbox } = await floor(t, '{ not json');
  const blocker = path.join(hive.root(), 'not-a-dir'); // a path no socket can bind: its directory is a file
  fs.writeFileSync(blocker, 'x');
  hive.sockPath = () => path.join(blocker, 'hooks.sock');
  server.start();
  t.after(() => server.stop());
  assert.equal(logRows().filter((r) => r.kind === 'policy-status').length, 1, 'written at start, before any bind');
  assert.equal(godInbox().filter((m) => /Guardrail failed to load/.test(m.subject)).length, 1);
  await new Promise((r) => setTimeout(r, 50));
  server.start();
  assert.equal(logRows().filter((r) => r.kind === 'policy-status').length, 1, 'not repeated');
});

test('announceOnce never throws, even when the hive cannot answer', async (t) => {
  const { hive, server } = await floor(t, '{ not json');
  hive.root = () => { throw new Error('boom'); };
  hive.sockPath = () => null;
  assert.doesNotThrow(() => server.start());
  t.after(() => server.stop());
});
