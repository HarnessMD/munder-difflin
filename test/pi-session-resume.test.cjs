'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const loadTs = require('./load-ts.cjs');

const electron = require.resolve('electron');
require.cache[electron] = { id: electron, filename: electron, loaded: true,
  exports: { Notification: class { static isSupported() { return false; } } } };
const { HiveManager } = loadTs('src/main/hive.ts');
const { HookServer } = loadTs('src/main/hooks.ts');
const { providerPreset } = loadTs('src/shared/agentProvider.ts');

// Run the production non-Claude resume branch rather than rebuilding its argv
// logic in this test. The full main module would also boot Electron services.
const main = ts.createSourceFile('index.ts', fs.readFileSync(path.join(__dirname, '../src/main/index.ts'), 'utf8'), ts.ScriptTarget.Latest, true);
const spawn = main.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'spawnAgentCore');
const resume = spawn.body.statements.find(n => ts.isIfStatement(n) && n.expression.getText(main) === 'opts.hive && !claudeProvider');
assert.ok(resume, 'production provider-aware resume path must exist');
const resumeJs = ts.transpileModule(resume.getText(main), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const applyResume = new Function('opts', 'hive', 'providerPreset', 'provider', 'claudeProvider',
  `let didResume = false;\n${resumeJs}\nreturn didResume;`);

async function floor(t) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'md pi resume '));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  t.mock.method(os, 'homedir', () => home);
  const hive = new HiveManager(() => home);
  const injection = await hive.ensureAgent({ id: 'pi-1', name: 'Pi', provider: 'pi', cwd: home });
  const source = fs.readFileSync(path.join(injection.env.PI_CODING_AGENT_DIR, 'extensions', 'hive-bridge.js'), 'utf8');
  const server = new HookServer(hive, () => null, () => ({ notifications: false }));
  const handlers = new Map(), frames = [];
  const mod = { exports: {} };
  vm.runInNewContext(source, {
    module: mod, exports: mod.exports,
    require: name => {
      assert.equal(name, 'node:net');
      return { createConnection(_sock, connected) {
        process.nextTick(connected);
        return { on() {}, end(data) {
          const payload = JSON.parse(String(data).trim());
          frames.push(payload);
          server.handle(payload);
        } };
      } };
    },
    process: { env: { AGENT_ID: 'pi-1', HIVE_SOCK: 'mock-socket', HIVE_AUTO_APPROVE: '1' } }
  });
  assert.equal(mod.exports({ on: (event, handler) => handlers.set(event, handler) }), true);
  return { home, hive, frames, handlers,
    flush: () => new Promise(resolve => setImmediate(resolve)) };
}

const context = id => ({ sessionManager: { getSessionId() { return id; } } });

test('Pi startup captures the real session before any tool call, and survives a hive restart', async t => {
  const h = await floor(t);
  const start = h.handlers.get('session_start');
  assert.equal(typeof start, 'function', 'generated extension must subscribe to Pi session_start');
  start({ type: 'session_start', reason: 'startup' }, context('pi-session-original'));
  await h.flush();
  assert.equal(h.hive.lastSession('pi-1'), 'pi-session-original');
  assert.equal(h.frames[0].hook_event_name, 'SessionStart');
  assert.equal(h.frames[0].agent_id, 'pi-1');

  const restarted = new HiveManager(() => h.home);
  await restarted.ensureAgent({ id: 'pi-1', name: 'Pi', provider: 'pi', cwd: h.home });
  const session = restarted.lastSession('pi-1');
  assert.equal(session, 'pi-session-original');
  const opts = { hive: { id: 'pi-1' }, resume: true, args: [] };
  assert.equal(applyResume(opts, restarted, providerPreset, 'pi', false), true);
  assert.deepEqual(opts.args, ['--session', 'pi-session-original']);
});

for (const reason of ['resume', 'new', 'fork', 'reload']) {
  test(`Pi session_start on ${reason} records the currently active conversation`, async t => {
    const h = await floor(t);
    h.hive.recordSession('pi-1', 'old-session');
    const start = h.handlers.get('session_start');
    assert.equal(typeof start, 'function');
    start({ type: 'session_start', reason, previousSessionFile: 'old-session.jsonl', session_id: 'not-authoritative' }, context(`current-${reason}`));
    await h.flush();
    assert.equal(h.hive.lastSession('pi-1'), `current-${reason}`);
  });
}

test('tool and agent-end hooks carry the current context session, not a cached or event-provided id', async t => {
  const h = await floor(t);
  const event = { toolName: 'read', input: { path: 'a.txt' }, session_id: 'fake-event-id' };
  h.handlers.get('tool_call')(event, context('session-a'));
  h.handlers.get('tool_result')(event, context('session-b'));
  h.handlers.get('agent_end')({}, context('session-c'));
  await h.flush();
  assert.deepEqual(h.frames.map(f => f.session_id), ['session-a', 'session-b', 'session-c']);
  assert.equal(h.hive.lastSession('pi-1'), 'session-c');
  assert.equal(h.frames[0].tool_name, 'read');
  assert.deepEqual(h.frames[1].tool_input, { path: 'a.txt' });
});

test('unavailable or malformed session APIs stay fail-open without replacing a valid saved id', async t => {
  const h = await floor(t);
  h.hive.recordSession('pi-1', 'valid-parent');
  const broken = { sessionManager: { getSessionId() { throw new Error('API unavailable'); } } };
  const hostile = {};
  Object.defineProperty(hostile, 'sessionManager', { get() { throw new Error('getter failed'); } });
  for (const ctx of [undefined, null, {}, { sessionManager: {} }, broken, hostile, context(''), context(42)]) {
    assert.doesNotThrow(() => h.handlers.get('tool_result')({ toolName: 'read', input: {} }, ctx));
    assert.doesNotThrow(() => h.handlers.get('agent_end')({}, ctx));
    assert.equal(h.handlers.get('tool_call')({ toolName: 'read', input: {} }, ctx).approve, true);
  }
  await h.flush();
  assert.equal(h.hive.lastSession('pi-1'), 'valid-parent');
  assert.ok(h.frames.every(f => !Object.hasOwn(f, 'session_id')));
});
