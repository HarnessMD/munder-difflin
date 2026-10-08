'use strict';

// Optional real-CLI experiment. Install Pi in a separate directory, then run:
// PI_RUNTIME_DIR=/path/to/that/directory node test/pi-session-resume.manual.cjs
// Uses offline RPC without any prompt/model request; no Pi dependency is added
// to the app. The printed temporary hive is retained for transcript inspection.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const cp = require('node:child_process');
const readline = require('node:readline');
const { pathToFileURL } = require('node:url');
const runtime = process.env.PI_RUNTIME_DIR;
if (!runtime) throw new Error('Set PI_RUNTIME_DIR to a separate npm prefix containing @earendil-works/pi-coding-agent');
const piPackage = path.join(runtime, 'node_modules', '@earendil-works', 'pi-coding-agent');
const version = JSON.parse(fs.readFileSync(path.join(piPackage, 'package.json'), 'utf8')).version;
const loadTs = require('./load-ts.cjs');
const { HiveManager } = loadTs('src/main/hive.ts');
const { providerPreset } = loadTs('src/shared/agentProvider.ts');
const electron = require.resolve('electron');
require.cache[electron] = { id: electron, filename: electron, loaded: true,
  exports: { Notification: class { static isSupported() { return false; } } } };
const { HookServer } = loadTs('src/main/hooks.ts');

(async () => {
  // process.cwd() resolves /var vs /private/var on macOS; the fixture header
  // must use that same real path or Pi detects a different project on resume.
  const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'md pi CLI resume ')));
  console.log('Experiment directory: ' + home);
  const realHome = os.homedir;
  const hive = new HiveManager(() => home);
  let injection;
  try {
    os.homedir = () => home;
    injection = await hive.ensureAgent({ id: 'pi-live', name: 'Pi live', provider: 'pi', cwd: home });
  } finally { os.homedir = realHome; }
  const hooks = new HookServer(hive, () => null, () => ({ notifications: false }));
  const children = [];
  try {
    hooks.start();
    for (let i = 0; i < 100 && !hooks.health().listening; i++) await new Promise(r => setTimeout(r, 20));
    assert.equal(hooks.health().listening, true);
    const piDir = injection.env.PI_CODING_AGENT_DIR;
    const sessionDir = path.join(piDir, 'sessions', 'fixture');
    const { SessionManager } = await import(pathToFileURL(path.join(piPackage, 'dist/index.js')).href);
    const fixture = SessionManager.create(home, sessionDir);
    fixture.appendMessage({ role: 'user', content: 'Remember fixture marker PI-RESUME-CONTEXT', timestamp: Date.now() });
    const originalId = fixture.getSessionId();
    const originalFile = fixture.getSessionFile();
    const bridge = path.join(piDir, 'extensions', 'hive-bridge.js');
    const cli = path.join(piPackage, 'dist/cli.js');
    function start(extra) {
      const child = cp.spawn(process.execPath, [cli, '--mode', 'rpc', '--offline', '--no-extensions', '-e', bridge,
        '--no-context-files', '--no-skills', '--no-prompt-templates', '--no-themes', '--no-approve',
        '--session-dir', sessionDir, ...extra], {
        cwd: home, env: { ...process.env, ...injection.env, PI_TELEMETRY: '0', PI_OFFLINE: '1' }, stdio: ['pipe', 'pipe', 'pipe']
      });
      let nextId = 0, stderr = '';
      const pending = new Map();
      child.stderr.on('data', data => { stderr += data; });
      const lines = readline.createInterface({ input: child.stdout });
      lines.on('line', line => {
        let message; try { message = JSON.parse(line); } catch { return; }
        if (message.type === 'response' && pending.has(message.id)) {
          const { resolve, reject, timer } = pending.get(message.id);
          pending.delete(message.id); clearTimeout(timer);
          if (message.success) resolve(message.data); else reject(new Error(message.error));
        }
      });
      child.on('exit', code => {
        for (const entry of pending.values()) { clearTimeout(entry.timer); entry.reject(new Error(`Pi exited ${code}: ${stderr.slice(-1200)}`)); }
        pending.clear();
      });
      const control = {
        request(type, fields = {}) {
          const id = String(++nextId);
          return new Promise((resolve, reject) => {
            const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Pi RPC timeout (${type}): ${stderr.slice(-1200)}`)); }, 12000);
            pending.set(id, { resolve, reject, timer });
            child.stdin.write(JSON.stringify({ id, type, ...fields }) + '\n');
          });
        },
        async stop() {
          if (child.exitCode !== null || child.signalCode !== null) return;
          await new Promise(resolve => {
            const timer = setTimeout(() => child.kill('SIGKILL'), 3000);
            child.once('exit', () => { clearTimeout(timer); resolve(); });
            child.kill('SIGTERM');
          });
          lines.close();
        }
      };
      children.push(control);
      return control;
    }
    async function recorded(id) {
      for (let i = 0; i < 100 && hive.lastSession('pi-live') !== id; i++) await new Promise(r => setTimeout(r, 20));
      assert.equal(hive.lastSession('pi-live'), id);
    }
    const first = start(['--session', originalFile]);
    const state = await first.request('get_state');
    assert.equal(state.sessionId, originalId);
    assert.equal(state.messageCount, 1);
    await recorded(originalId);
    console.log('PASS: real Pi session_start persisted its UUID through the real hook socket');
    await first.stop();

    const restarted = new HiveManager(() => home);
    const recordedId = restarted.lastSession('pi-live');
    assert.equal(recordedId, originalId);
    const second = start([providerPreset('pi').resumeFlag, recordedId]);
    const resumed = await second.request('get_state');
    assert.equal(resumed.sessionId, originalId);
    assert.equal(resumed.messageCount, 1);
    assert.equal(resumed.sessionFile, originalFile);
    console.log('PASS: --session <persisted UUID> reopened the same Pi transcript (1 fixture message)');
    await second.request('new_session');
    const fresh = await second.request('get_state');
    assert.notEqual(fresh.sessionId, originalId);
    await recorded(fresh.sessionId);
    console.log('PASS: real Pi new_session updated the saved resume identity');
    await second.request('switch_session', { sessionPath: originalFile });
    const switched = await second.request('get_state');
    assert.equal(switched.sessionId, originalId);
    await recorded(originalId);
    console.log('PASS: real Pi switch_session restored the selected conversation identity');
    await second.stop();
    console.log(`No prompt or model API request sent. Pi version: ${version}`);
  } finally {
    await Promise.all(children.map(child => child.stop()));
    hooks.stop();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
