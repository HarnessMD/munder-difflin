'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');
const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'md-consent-config-'));
const configPath = path.join(userData, 'config.json');
const electron = require.resolve('electron');
require.cache[electron] = { id: electron, filename: electron, loaded: true,
  exports: { app: { getPath: () => userData }, Notification: class { show() {} static isSupported() { return false; } } } };
const config = loadTs('src/main/config.ts');
const { HiveManager } = loadTs('src/main/hive.ts');
const { resolveMcpEnablement, MCP_CATALOG } = loadTs('src/shared/mcpCatalog.ts');
const seed = (overrides = {}) => fs.writeFileSync(configPath, JSON.stringify({ triggersMigratedV1: true, ...overrides }));
const disk = () => JSON.parse(fs.readFileSync(configPath, 'utf8'));
test.after(() => fs.rmSync(userData, { recursive: true, force: true }));

test('generic patches cannot bypass consent, including undefined and null', () => {
  for (const mcpDefaults of [undefined, null, {}, { git: { enabled: true, consentRevision: 2 } }]) {
    seed();
    const before = fs.readFileSync(configPath);
    assert.throws(() => config.writeConfig({ mcpDefaults }), /setMcpServerEnabled/);
    assert.deepEqual(fs.readFileSync(configPath), before);
  }
  config.writeConfig({ notifications: true });
  assert.equal(disk().notifications, true);
});

test('single-server RMW validates inputs and preserves other windows and unrelated settings', () => {
  seed({ harnessHome: userData, slackBotToken: 'fixture-secret', webhookSecret: 'fixture-webhook',
    extensionField: { preserve: true }, mcpDefaults: { 'github-token': { enabled: true }, unknown: { keep: 'yes' }, git: { enabled: true } } });
  for (const [id, enabled] of [['', true], ['unknown', true], ['__proto__', true], [null, true], ['git', 'true'], ['git', null]]) {
    assert.throws(() => config.setMcpServerEnabled(id, enabled), /invalid/i);
  }
  config.setMcpServerEnabled('git', true);
  const staleWindow = disk();
  const next = config.setMcpServerEnabled('filesystem', true);
  assert.deepEqual(next.mcpDefaults.git, { enabled: true, consentRevision: 2 });
  config.setMcpServerEnabled('git', false);
  config.setMcpServerEnabled('filesystem', true);
  assert.deepEqual(disk().mcpDefaults.git, { enabled: false });
  assert.throws(() => config.writeConfig({ mcpDefaults: staleWindow.mcpDefaults }), /setMcpServerEnabled/);
  assert.equal(disk().slackBotToken, 'fixture-secret');
  assert.equal(disk().webhookSecret, 'fixture-webhook');
  assert.equal(disk().harnessHome, userData);
  assert.deepEqual(disk().extensionField, { preserve: true });
  assert.deepEqual(disk().mcpDefaults.unknown, { keep: 'yes' });
  assert.deepEqual(disk().mcpDefaults['github-token'], { enabled: true });
  assert.deepEqual(config.getMcpConsentState(), { ok: true, records: disk().mcpDefaults });
  assert.equal(JSON.stringify(config.getMcpConsentState()).includes('fixture-secret'), false);
});

test('legacy read is byte-preserving; malformed records can be replaced individually', () => {
  seed({ mcpDefaults: { filesystem: { enabled: true }, git: { enabled: true }, db: null } });
  const before = fs.readFileSync(configPath);
  const records = config.getMcpConsentState().records;
  for (const id of ['filesystem', 'git']) {
    assert.equal(resolveMcpEnablement(MCP_CATALOG.find((entry) => entry.id === id), records[id]), false);
  }
  config.readConfig();
  assert.deepEqual(fs.readFileSync(configPath), before);
  config.setMcpServerEnabled('db', true);
  assert.deepEqual(disk().mcpDefaults.db, { enabled: true, consentRevision: 1 });
  assert.deepEqual(disk().mcpDefaults.git, { enabled: true });
});

test('invalid JSON, UTF-8 and container shapes reject without writes or announcements', () => {
  const seen = [];
  const off = config.onConfigWritten((next) => seen.push(next));
  try {
    for (const raw of ['{"mcpDefaults":', 'null', '[]', 'true', '"text"',
      ...[null, [], true, 'true', 1].map((mcpDefaults) => JSON.stringify({ mcpDefaults })),
      Buffer.from([0x7b, 0x22, 0x78, 0x22, 0x3a, 0x22, 0xff, 0x22, 0x7d])]) {
      fs.writeFileSync(configPath, raw);
      const before = fs.readFileSync(configPath);
      const state = config.getMcpConsentState();
      assert.equal(state.ok, false);
      assert.match(state.error, /^Cannot load (config\.json|MCP consent):/, String(raw));
      assert.throws(() => config.setMcpServerEnabled('git', true), (error) => error.message === state.error);
      assert.deepEqual(fs.readFileSync(configPath), before);
    }
    assert.equal(seen.length, 0);
  } finally { off(); }
});

test('I/O and atomic-write failures propagate, keep disk bytes and emit no success', () => {
  seed({ mcpDefaults: { git: { enabled: false } } });
  const before = fs.readFileSync(configPath);
  const seen = [];
  const off = config.onConfigWritten((next) => seen.push(next));
  try {
    for (const method of ['readFileSync', 'writeFileSync', 'renameSync']) {
      const original = fs[method];
      fs[method] = (...args) => {
        if (String(args[0]).startsWith(configPath)) throw Object.assign(new Error(`injected ${method}`), { code: 'EACCES' });
        return original(...args);
      };
      try {
        assert.throws(() => config.setMcpServerEnabled('git', true), /injected/);
        if (method === 'readFileSync') {
          assert.deepEqual(config.getMcpConsentState(), { ok: false, error: 'injected readFileSync' });
        }
      } finally { fs[method] = original; }
      assert.deepEqual(fs.readFileSync(configPath), before);
      assert.equal(fs.readdirSync(userData).some((name) => name.includes('.tmp-')), false);
    }
    assert.equal(seen.length, 0);
  } finally { off(); }
});

test('first install, missing MCP map, reset and fresh default objects', () => {
  fs.unlinkSync(configPath);
  assert.equal(config.getMcpConsentState().ok, true);
  const next = config.setMcpServerEnabled('git', true);
  assert.deepEqual(next.mcpDefaults.git, { enabled: true, consentRevision: 2 });
  seed();
  config.setMcpServerEnabled('time', true);
  assert.deepEqual(disk().mcpDefaults.time, { enabled: true });
  config.resetConfig();
  assert.deepEqual(disk().mcpDefaults.git, { enabled: false });
  const first = config.readConfig();
  first.mcpDefaults.git.enabled = true;
  seed();
  assert.equal(config.readConfig().mcpDefaults.git.enabled, false);
});

test('non-UTF-8 bytes in an unrelated string: consent read is strict, ordinary writes keep every setting', () => {
  config.resetConfig();
  const records = { git: { enabled: true, consentRevision: 2 }, filesystem: { enabled: true }, 'github-token': { enabled: true } };
  // GBK "中文" as a Windows ANSI editor saves it into a hand-edited value.
  const raw = Buffer.concat([
    Buffer.from(JSON.stringify({ triggersMigratedV1: true, harnessHome: userData, slackBotToken: 'fixture-secret', mcpDefaults: records })
      .replace(/}$/, ',"godModel":"')),
    Buffer.from([0xd6, 0xd0, 0xce, 0xc4]), Buffer.from('"}')
  ]);
  fs.writeFileSync(configPath, raw);
  const consent = config.getMcpConsentState();
  assert.equal(consent.ok, false);
  assert.match(consent.error, /UTF-8/);
  assert.throws(() => config.setMcpServerEnabled('filesystem', true));
  assert.deepEqual(fs.readFileSync(configPath), raw);

  assert.equal(config.readConfig().harnessHome, userData);
  config.writeConfig({ notifications: true });
  const saved = disk();
  assert.equal(saved.notifications, true);
  assert.equal(saved.harnessHome, userData);
  assert.equal(saved.slackBotToken, 'fixture-secret');
  // Replacement characters stay inside the string: consent is carried over, never widened.
  assert.deepEqual(saved.mcpDefaults, records);
  const after = config.getMcpConsentState();
  assert.equal(after.ok, true);
  const on = (id) => resolveMcpEnablement(MCP_CATALOG.find((entry) => entry.id === id), after.records[id]);
  assert.deepEqual(['git', 'filesystem', 'github-token'].map(on), [true, false, true]);
});

test('a UTF-8 BOM (Windows editors) is accepted by both ordinary and consent reads', () => {
  config.resetConfig();
  fs.writeFileSync(configPath, '\uFEFF' + JSON.stringify({ triggersMigratedV1: true, harnessHome: userData,
    mcpDefaults: { git: { enabled: true, consentRevision: 2 } } }), 'utf8');
  assert.equal(config.readConfig().harnessHome, userData);
  assert.deepEqual(config.getMcpConsentState().records.git, { enabled: true, consentRevision: 2 });
});

test('strict consent reads skip migrations; existing trigger migration still runs exactly once', () => {
  config.resetConfig();
  const records = { git: { enabled: true }, 'github-token': { enabled: true } };
  seed({ triggersMigratedV1: false, webhookEnabled: true, webhookSecret: 'legacy-fixture', mcpDefaults: records });
  const before = fs.readFileSync(configPath);
  const seen = [];
  const off = config.onConfigWritten((next) => seen.push(next));
  try {
    assert.equal(config.getMcpConsentState().ok, true);
    assert.deepEqual(fs.readFileSync(configPath), before);
    assert.equal(seen.length, 0);
    const migrated = config.readConfig();
    assert.equal(migrated.triggersMigratedV1, true);
    assert.equal(migrated.webhookTriggers[0].secret, 'legacy-fixture');
    assert.deepEqual(migrated.mcpDefaults, records);
    assert.equal(seen.length, 1);
    config.readConfig();
    assert.equal(seen.length, 1);
  } finally { off(); }
});

test('persisted consent closes the loop through strict reads into new Session settings', async () => {
  const home = path.join(userData, 'office 空白');
  fs.mkdirSync(home);
  const hive = new HiveManager(() => home);
  seed({ mcpDefaults: { git: { enabled: true }, filesystem: { enabled: true } } });
  const settings = async (id) => {
    const state = config.getMcpConsentState();
    const injection = await hive.ensureAgent({ id, name: 'Consent', cwd: home, provider: 'claude' },
      { mcpDefaults: state.ok ? state.records : null });
    return JSON.parse(fs.readFileSync(injection.args[injection.args.indexOf('--settings') + 1], 'utf8'));
  };
  const before = await settings('legacy');
  assert.equal(before.mcpServers['munder-git'], undefined);
  const events = [];
  const off = config.onConfigWritten((next) => {
    assert.deepEqual(next.mcpDefaults, disk().mcpDefaults, 'announcement follows atomic persistence');
    events.push(next);
  });
  try {
    config.setMcpServerEnabled('git', true);
    const granted = await settings('granted');
    assert.ok(granted.mcpServers['munder-git']);
    assert.equal(granted.mcpServers['munder-filesystem'], undefined);
    assert.deepEqual(granted.hooks, before.hooks);
    config.setMcpServerEnabled('git', false);
    assert.equal((await settings('revoked')).mcpServers['munder-git'], undefined);
    assert.equal(events.length, 2);
    fs.writeFileSync(configPath, '{"mcpDefaults":');
    assert.equal((await settings('corrupt')).mcpServers, undefined);
    assert.equal(events.length, 2);
  } finally { off(); }
});
