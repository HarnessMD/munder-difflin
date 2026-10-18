'use strict';
/**
 * HookServer's Notification/Stop branches are what tell the harness an agent is
 * idle and safe to deliver queued mail to. Both branches call notify() but
 * neither had test coverage:
 *   - Stop/SubagentStop always notifies "finished — idle" (unless stop_hook_active)
 *   - Notification only notifies when notification_type === 'idle' OR the message
 *     text contains "waiting for your input" (case-insensitive) — this string
 *     fallback exists for CLI versions/locales that don't send the structured
 *     notification_type field, so both paths need to be proven independently.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const electron = require.resolve('electron');
const notifications = [];
require.cache[electron] = {
  id: electron,
  filename: electron,
  loaded: true,
  exports: {
    Notification: class {
      constructor(opts) { this.opts = opts; }
      show() { notifications.push(this.opts); }
      static isSupported() { return true; }
    }
  }
};

const { HiveManager } = loadTs('src/main/hive.ts');
const { HookServer } = loadTs('src/main/hooks.ts');
const { modelForHiveSpawn } = loadTs('src/main/config.ts');
const CONFIG = { notifications: true };

function tmpHome() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'md-hooks-notif-'));
}

async function floor(t, getConfig = () => CONFIG) {
  const home = tmpHome();
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const hive = new HiveManager(() => home);
  await hive.ensureAgent({ id: 'jim-1', name: 'Jim', provider: 'claude', cwd: home });
  const server = new HookServer(hive, () => null, getConfig, undefined, undefined);
  const fire = (payload) => server.handle({ agent_id: 'jim-1', session_id: 's1', ...payload });
  notifications.length = 0;
  return { home, hive, server, fire };
}

test('Notification with notification_type "idle" fires a toast', async (t) => {
  const { fire } = await floor(t);
  await fire({ hook_event_name: 'Notification', notification_type: 'idle', message: 'anything' });
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].title, 'jim-1');
});

test('Notification with message "waiting for your input" fires a toast (string fallback)', async (t) => {
  const { fire } = await floor(t);
  await fire({ hook_event_name: 'Notification', message: 'Claude is Waiting For Your Input' });
  assert.equal(notifications.length, 1, 'must be case-insensitive');
});

test('Notification for a permission request does NOT fire the idle toast', async (t) => {
  const { fire } = await floor(t);
  await fire({
    hook_event_name: 'Notification',
    notification_type: 'permission',
    message: 'Claude wants to run a command'
  });
  assert.equal(notifications.length, 0,
    'a permission request is surfaced natively in the CLI session, not as a desktop toast');
});

test('Notification with neither field set does NOT fire', async (t) => {
  const { fire } = await floor(t);
  await fire({ hook_event_name: 'Notification' });
  assert.equal(notifications.length, 0);
});

test('Stop fires "finished — idle"', async (t) => {
  const { fire } = await floor(t);
  await fire({ hook_event_name: 'Stop' });
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].body, 'finished — idle');
});

test('Stop with stop_hook_active does NOT re-notify', async (t) => {
  const { fire } = await floor(t);
  await fire({ hook_event_name: 'Stop', stop_hook_active: true });
  assert.equal(notifications.length, 0,
    'an already-re-entered Stop boundary must not spam another toast');
});

test('SubagentStop behaves the same as Stop', async (t) => {
  const { fire } = await floor(t);
  await fire({ hook_event_name: 'SubagentStop' });
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].body, 'finished — idle');
});

test('notifications setting off suppresses the OS toast but the hook still resolves', async (t) => {
  const home = tmpHome();
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const hive = new HiveManager(() => home);
  await hive.ensureAgent({ id: 'jim-1', name: 'Jim', provider: 'claude', cwd: home });
  const server = new HookServer(hive, () => null, () => ({ notifications: false }), undefined, undefined);
  notifications.length = 0;
  const res = await server.handle({ agent_id: 'jim-1', session_id: 's1', hook_event_name: 'Stop' });
  assert.equal(notifications.length, 0, 'notifications:false must suppress the OS toast');
  assert.deepEqual(res, {}, 'the hook itself still resolves normally');
});

test('Status captures Claude model.id as the agent\'s restart-safe model', async (t) => {
  const { hive, fire } = await floor(t);
  await fire({ hook_event_name: 'Status', model: { id: 'claude-opus-5-5[1m]' } });
  assert.equal(hive.lastModel('jim-1'), 'claude-opus-5-5[1m]');
});

test('a Status report at the app default leaves no pin, so a later Settings default reaches respawn', async (t) => {
  let config = { notifications: true, defaultModel: 'claude-opus-5-5', godProvider: 'claude', godModel: 'claude-opus-4-8' };
  const { hive, fire } = await floor(t, () => config);

  // Case and surrounding whitespace are status spelling only; neither may create a pin.
  await fire({ hook_event_name: 'Status', model: { id: '  CLAUDE-OPUS-5-5  ' } });
  assert.equal(hive.lastModel('jim-1'), undefined);

  config = { ...config, defaultModel: 'claude-fable-5-1' };
  const agent = hive.registry().agents['jim-1'];
  assert.equal(modelForHiveSpawn(agent, config, hive.lastModel('jim-1')), 'claude-fable-5-1');
});

test('a /model change pins only the divergence and returning to default clears it', async (t) => {
  const config = { notifications: true, defaultModel: 'claude-fable-5-1', godProvider: 'claude', godModel: 'claude-opus-4-8' };
  const { hive, fire } = await floor(t, () => config);

  await fire({ hook_event_name: 'Status', model: { id: 'claude-opus-5-5[1m]' } });
  assert.equal(hive.lastModel('jim-1'), 'claude-opus-5-5[1m]');

  await fire({ hook_event_name: 'Status', model: { id: 'claude-fable-5-1' } });
  assert.equal(hive.lastModel('jim-1'), undefined);
});

test('recordModel refuses a non-Claude registry provider', async (t) => {
  const home = tmpHome();
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const hive = new HiveManager(() => home);
  // Keep this synthetic: spawning agy would install its global hook bridge.
  await hive.ensureAgent({ id: 'agy-1', name: 'Agy', provider: 'claude', cwd: home });
  const registryPath = path.join(hive.root(), 'registry.json');
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  registry.agents['agy-1'].provider = 'agy';
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));

  hive.recordModel('agy-1', 'Gemini 3.8 Flash (High)', 'claude-fable-5-1');
  assert.equal(hive.lastModel('agy-1'), undefined);
});
