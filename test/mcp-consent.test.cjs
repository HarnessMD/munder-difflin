'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');
const electron = require.resolve('electron');
require.cache[electron] = { id: electron, filename: electron, loaded: true,
  exports: { Notification: class { show() {} static isSupported() { return false; } } } };
const {
  MCP_CATALOG, MCP_TIERS, isMcpTier, mcpCatalogEntry, mcpConsentRecord,
  mcpConsentGrant, requiredConsentRevision, defaultMcpDefaults, resolveMcpEnablement
} = loadTs('src/shared/mcpCatalog.ts');
const { HiveManager } = loadTs('src/main/hive.ts');
const targets = ['filesystem', 'git'];

test('catalog classifies write-capable servers and seeds closed consent', () => {
  assert.equal(new Set(MCP_CATALOG.map((entry) => entry.id)).size, MCP_CATALOG.length);
  for (const entry of MCP_CATALOG) {
    assert.ok(Number.isSafeInteger(entry.consentRevision ?? 1));
    assert.ok((entry.consentRevision ?? 1) >= 1);
    if (entry.tier !== 'safe-readonly') assert.equal(entry.defaultEnabled, false);
    assert.equal(defaultMcpDefaults()[entry.id].enabled, entry.defaultEnabled);
    if (targets.includes(entry.id)) {
      assert.equal(entry.tier, 'write');
      assert.equal(entry.defaultEnabled, false);
      assert.equal(entry.consentRevision, 2);
    }
  }
});

test('tiers come from one list that the catalog and resolver both honour', () => {
  assert.deepEqual([...MCP_TIERS], ['safe-readonly', 'write', 'secret']);
  for (const entry of MCP_CATALOG) assert.equal(isMcpTier(entry.tier), true, entry.id);
  for (const value of ['', 'readonly', 'WRITE', null, undefined, 1, ['write']]) assert.equal(isMcpTier(value), false);
  const safe = MCP_CATALOG.find((entry) => entry.tier === 'safe-readonly' && entry.defaultEnabled);
  assert.equal(resolveMcpEnablement({ ...safe, tier: 'admin' }, undefined), false);
  assert.equal(resolveMcpEnablement({ ...safe, tier: 'admin' }, { enabled: true }), false);
});

test('one revision rule drives both the stored grant and the resolver', () => {
  const byId = (id) => MCP_CATALOG.find((entry) => entry.id === id);
  const db = byId('db');
  assert.equal(requiredConsentRevision(db), 1);
  assert.equal(requiredConsentRevision({ ...db, consentRevision: undefined }), 1, 'explicit undefined is the legacy revision');
  assert.equal(requiredConsentRevision(byId('git')), 2);
  for (const consentRevision of [0, -1, 1.5, NaN, Infinity, '2', null]) {
    assert.equal(requiredConsentRevision({ ...db, consentRevision }), undefined, String(consentRevision));
    assert.equal(mcpConsentGrant({ ...db, consentRevision }), undefined);
  }
  assert.deepEqual(mcpConsentGrant(byId('git')), { enabled: true, consentRevision: 2 });
  assert.deepEqual(mcpConsentGrant(db), { enabled: true, consentRevision: 1 });
  assert.deepEqual(mcpConsentGrant(byId('time')), { enabled: true });
  assert.deepEqual(mcpConsentGrant({ ...byId('time'), consentRevision: 3 }), { enabled: true, consentRevision: 3 });
  assert.deepEqual(mcpConsentGrant({ ...db, consentRevision: undefined }), { enabled: true, consentRevision: 1 });
  assert.equal(mcpConsentGrant({ ...db, defaultEnabled: true }), undefined, 'invalid catalog policy grants nothing');
  for (const entry of MCP_CATALOG) assert.equal(resolveMcpEnablement(entry, mcpConsentGrant(entry)), true, entry.id);
});

test('resolver rejects legacy, malformed, stale and future grants', () => {
  for (const id of targets) {
    const entry = MCP_CATALOG.find((entry) => entry.id === id);
    for (const record of [undefined, null, [], true, 'true', 1, {}, { enabled: 'true' },
      { enabled: 1 }, { enabled: null }, { enabled: true }, Object.create({ enabled: true, consentRevision: 2 }),
      ...[undefined, null, 0, -1, 1, 3, 1.5, '2', NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1]
        .map((consentRevision) => ({ enabled: true, consentRevision })),
      { enabled: false, consentRevision: 2 }]) {
      assert.equal(resolveMcpEnablement(entry, record), false, `${id}: ${String(record)}`);
    }
    assert.equal(resolveMcpEnablement(entry, { enabled: true, consentRevision: 2 }), true);
    const throwing = new Proxy({}, { getPrototypeOf() { throw new Error('untrusted'); } });
    assert.equal(resolveMcpEnablement(entry, throwing), false);
    assert.equal(resolveMcpEnablement(entry, { get enabled() { throw new Error('untrusted'); } }), false);
    for (const consentRevision of [null, NaN, Infinity, 0, '2']) {
      assert.equal(resolveMcpEnablement({ ...entry, consentRevision }, { enabled: true, consentRevision: 2 }), false);
    }
    assert.equal(resolveMcpEnablement({ ...entry, defaultEnabled: true }, { enabled: true, consentRevision: 2 }), false);
  }
});

test('other MCP legacy consent and readonly defaults remain compatible', () => {
  for (const entry of MCP_CATALOG.filter((entry) => !targets.includes(entry.id))) {
    assert.equal(resolveMcpEnablement(entry, undefined), entry.defaultEnabled);
    assert.equal(resolveMcpEnablement(entry, { enabled: true }), true);
    assert.equal(resolveMcpEnablement(entry, { enabled: true, consentRevision: 1 }), true);
    assert.equal(resolveMcpEnablement(entry, { enabled: true, consentRevision: 2 }), false);
    assert.equal(resolveMcpEnablement(entry, { enabled: false }), false);
    assert.equal(resolveMcpEnablement(entry, { enabled: true, consentRevision: NaN }), false);
  }
});

test('catalog lookups and seeds do not expose mutable shared grants or specs', () => {
  const entry = mcpCatalogEntry('github-token');
  entry.consentRevision = 99;
  entry.spec.args.push('injected');
  entry.spec.env.GITHUB_PERSONAL_ACCESS_TOKEN = 'injected';
  assert.equal(mcpCatalogEntry('github-token').consentRevision, undefined);
  assert.equal(mcpCatalogEntry('github-token').spec.args.includes('injected'), false);
  assert.equal(mcpCatalogEntry('github-token').spec.env.GITHUB_PERSONAL_ACCESS_TOKEN, '');
  const seed = defaultMcpDefaults();
  seed.git.enabled = true;
  assert.equal(defaultMcpDefaults().git.enabled, false);
  assert.equal(mcpConsentRecord(new Proxy({}, { getOwnPropertyDescriptor() { throw new Error('trap'); } }), 'git'), null);
  assert.equal(mcpConsentRecord(Object.create({ git: { enabled: true, consentRevision: 2 } }), 'git'), null);
});

test('real generated Claude settings use the same effective consent as the UI resolver', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'md-consent-'));
  try {
    const cwd = path.join(home, 'workspace 空白');
    fs.mkdirSync(cwd);
    const hive = new HiveManager(() => home);
    // The provider bridge exports sessions to the user's global Codex home.
    // This test only verifies settings injection; keep that unrelated side effect isolated.
    hive.exposeCodexDataDirs = () => {};
    hive.installCodexHooks = (dir) => path.join(dir, '.codex');
    for (const [index, records] of [undefined, { filesystem: { enabled: true }, git: { enabled: true } },
      { filesystem: { enabled: true, consentRevision: 2 }, git: { enabled: true, consentRevision: 2 },
        'github-token': { enabled: true }, fetch: { enabled: false } },
      { filesystem: { enabled: true, consentRevision: 3 }, git: { enabled: 'true', consentRevision: 2 } },
      null, [], true, 'true'].entries()) {
      const injection = await hive.ensureAgent({ id: `consent-${index}`, name: 'Consent', provider: 'claude', cwd }, { mcpDefaults: records });
      const settingsIndex = injection.args.indexOf('--settings');
      assert.ok(settingsIndex >= 0);
      const settings = JSON.parse(fs.readFileSync(injection.args[settingsIndex + 1], 'utf8'));
      const servers = settings.mcpServers ?? {};
      // Keep an assertion independent of the new helper to prove the old runtime bug in Red.
      if (index < 2 || index >= 3) {
        for (const id of targets) assert.equal(servers[`munder-${id}`], undefined);
      }
      for (const entry of MCP_CATALOG) {
        const record = records && !Array.isArray(records) && typeof records === 'object' ? records[entry.id] : undefined;
        const expected = records !== undefined && (records === null || typeof records !== 'object' || Array.isArray(records))
          ? false : resolveMcpEnablement(entry, record);
        assert.equal(Object.hasOwn(servers, `munder-${entry.id}`), expected, entry.id);
        if (expected) assert.deepEqual(servers[`munder-${entry.id}`], {
          command: entry.spec.command, args: entry.spec.args.map((arg) => arg === '<cwd>' ? cwd : arg),
          ...(entry.spec.env ? { env: entry.spec.env } : {})
        });
      }
      assert.ok(settings.hooks.SessionStart);
      assert.equal(settings.sandbox.enabled, true);
    }
    for (const provider of ['codex', 'opencode', 'copilot', 'custom']) {
      const injection = await hive.ensureAgent({ id: `provider-${provider}`, name: 'Provider', provider, cwd },
        { mcpDefaults: { filesystem: { enabled: true, consentRevision: 2 } } });
      assert.equal(injection.args.includes('--settings'), false, provider);
      assert.equal(fs.existsSync(path.join(home, 'hive', 'agents', `provider-${provider}`, 'settings.json')), false);
    }
  } finally { fs.rmSync(home, { recursive: true, force: true }); }
});
