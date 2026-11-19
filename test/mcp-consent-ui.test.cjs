'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const loadTs = require('./load-ts.cjs');
const catalog = loadTs('src/shared/mcpCatalog.ts');

// Execute the real component with a small hook host, no DOM/Electron GUI.
// State transitions and IPC ordering are exercised; this is not visual QA.
function mount(api) {
  const slots = [];
  let cursor = 0;
  let effects = [];
  const cleanups = [];
  const t = (key, values) => values ? `${key}:${values.id}:${values.state}` : key;
  const equal = (left, right) => left && right && left.length === right.length && left.every((value, index) => Object.is(value, right[index]));
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], (value) => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
    },
    useRef(initial) {
      const index = cursor++;
      return slots[index] ?? (slots[index] = { current: initial });
    },
    useCallback(callback, deps) {
      const index = cursor++;
      if (!slots[index] || !equal(slots[index].deps, deps)) slots[index] = { callback, deps };
      return slots[index].callback;
    },
    useEffect(effect, deps) {
      const index = cursor++;
      if (!slots[index] || !equal(slots[index], deps)) {
        slots[index] = deps;
        effects.push(() => { cleanups[index]?.(); cleanups[index] = effect(); });
      }
    }
  };
  const source = fs.readFileSync('src/renderer/src/components/McpDefaultsSettings.tsx', 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const mod = { exports: {} };
  new Function('module', 'exports', 'require', js)(mod, mod.exports, (id) => {
    if (id === 'react') return react;
    if (id === 'react-i18next') return { useTranslation: () => ({ t }) };
    if (id === '@shared/mcpCatalog') return catalog;
    return require(id);
  });
  global.window = { cth: api };
  const render = () => {
    cursor = 0;
    // No props: consent state comes only from main's strict read, never a config snapshot.
    const tree = mod.exports.McpDefaultsSettings({});
    const pendingEffects = effects;
    effects = [];
    pendingEffects.forEach((effect) => effect());
    return tree;
  };
  return { render, unmount: () => { cleanups.forEach((cleanup) => cleanup?.()); delete global.window; } };
}

function all(tree, predicate) {
  if (Array.isArray(tree)) return tree.flatMap((node) => all(node, predicate));
  if (!tree || typeof tree !== 'object') return [];
  return [...(predicate(tree) ? [tree] : []), ...all(tree.props?.children, predicate)];
}
function buttons(tree) { return all(tree, (node) => node.type === 'button'); }
function serverButton(tree, id) {
  const row = all(tree, (node) => node.key === id && node.type === 'div')[0];
  assert.ok(row, id);
  return buttons(row)[0];
}
function alert(tree) { return all(tree, (node) => node.props?.role === 'alert')[0]?.props.children; }
function status(tree) { return all(tree, (node) => node.props?.role === 'status')[0]?.props.children; }
const flush = () => new Promise((resolve) => setImmediate(resolve));
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
function fixture(overrides = {}) {
  let records = { git: { enabled: true }, filesystem: { enabled: true }, 'github-token': { enabled: true } };
  let changed;
  const calls = [];
  const api = {
    getMcpConsentState: async () => ({ ok: true, records }),
    setMcpServerEnabled: async (id, enabled) => {
      calls.push([id, enabled]);
      const entry = catalog.MCP_CATALOG.find((entry) => entry.id === id);
      records = { ...records, [id]: enabled ? { enabled, consentRevision: entry.consentRevision ?? 1 } : { enabled } };
      changed?.({ mcpDefaults: records });
      return { mcpDefaults: records };
    },
    onConfigChanged: (listener) => { changed = listener; return () => { changed = undefined; }; },
    updateConfig: () => { throw new Error('must not use snapshot patch'); },
    ...overrides
  };
  return { api, calls, broadcast(next) { records = next; changed?.({ mcpDefaults: next }); }, subscribed: () => !!changed };
}

test('UI resolves legacy grants OFF, confirms per-server save and follows cross-window revocation', async () => {
  const host = fixture();
  const ui = mount(host.api);
  try {
    assert.ok(serverButton(ui.render(), 'git').props.disabled);
    await flush();
    let tree = ui.render();
    assert.equal(serverButton(tree, 'git').props.children, 'common.off');
    assert.equal(serverButton(tree, 'github-token').props.children, 'common.on');
    serverButton(tree, 'git').props.onClick();
    tree = ui.render();
    assert.equal(serverButton(tree, 'git').props.disabled, true);
    await flush();
    tree = ui.render();
    assert.deepEqual(host.calls, [['git', true]]);
    assert.equal(serverButton(tree, 'git').props.children, 'common.on');
    assert.equal(status(tree), 'mcpDefaults.toggleNote:git:common.on');
    host.broadcast({ git: { enabled: false } });
    await flush();
    assert.equal(serverButton(ui.render(), 'git').props.children, 'common.off');
  } finally { ui.unmount(); }
  assert.equal(host.subscribed(), false);
});

test('read rejection, invalid result and unavailable IPC leave unknown state and visible error', async () => {
  for (const read of [undefined, () => { throw new Error('invoke failed'); },
    async () => ({ ok: false, error: 'bad JSON' }), async () => ({ ok: true, records: null }),
    async () => ({ ok: true, records: [] })]) {
    const host = fixture({ getMcpConsentState: read });
    const ui = mount(host.api);
    try {
      ui.render();
      await flush();
      const tree = ui.render();
      assert.equal(alert(tree), 'mcpDefaults.couldNotLoad');
      assert.equal(serverButton(tree, 'git').props.children, 'mcpDefaults.unavailable');
      assert.equal(serverButton(tree, 'git').props.disabled, true);
      assert.equal(status(tree), undefined);
    } finally { ui.unmount(); }
  }
});

test('a failed change subscription is visible and cannot authorize', async () => {
  const host = fixture({ onConfigChanged: () => { throw new Error('subscription failed'); } });
  const ui = mount(host.api);
  try {
    ui.render();
    const tree = ui.render();
    assert.equal(alert(tree), 'mcpDefaults.couldNotLoad');
    assert.equal(serverButton(tree, 'git').props.disabled, true);
    assert.equal(status(tree), undefined);
  } finally { ui.unmount(); }
});

test('failed saves and failed readback never report success; refresh can recover', async () => {
  for (const save of [undefined, () => { throw new Error('sync invocation failed'); },
    async () => { throw new Error('disk failure'); }, async () => undefined]) {
    const host = fixture({ setMcpServerEnabled: save });
    const ui = mount(host.api);
    try {
      ui.render(); await flush();
      serverButton(ui.render(), 'git').props.onClick();
      await flush();
      const tree = ui.render();
      assert.equal(alert(tree), 'mcpDefaults.couldNotSave');
      assert.equal(status(tree), undefined);
      assert.equal(serverButton(tree, 'git').props.children, 'common.off');
    } finally { ui.unmount(); }
  }
  const host = fixture();
  const ui = mount(host.api);
  try {
    ui.render(); await flush();
    host.api.setMcpServerEnabled = async () => {
      host.api.getMcpConsentState = async () => { throw new Error('readback failed'); };
      return { mcpDefaults: { git: { enabled: true, consentRevision: 2 } } };
    };
    serverButton(ui.render(), 'git').props.onClick();
    await flush();
    let tree = ui.render();
    assert.equal(alert(tree), 'mcpDefaults.couldNotLoad');
    assert.equal(status(tree), undefined);
    assert.equal(serverButton(tree, 'git').props.disabled, true);
    host.api.getMcpConsentState = async () => ({ ok: true, records: {} });
    buttons(tree).at(-1).props.onClick();
    await flush();
    tree = ui.render();
    assert.equal(alert(tree), undefined);
    assert.equal(serverButton(tree, 'git').props.disabled, false);
  } finally { ui.unmount(); }
});

test('newer cross-window read wins over an older pending read and duplicate clicks are blocked', async () => {
  const oldRead = deferred();
  const save = deferred();
  const host = fixture({ getMcpConsentState: () => oldRead.promise,
    setMcpServerEnabled: (...args) => { host.calls.push(args); return save.promise; } });
  const ui = mount(host.api);
  try {
    ui.render();
    host.api.getMcpConsentState = async () => ({ ok: true, records: { git: { enabled: false } } });
    host.broadcast({ git: { enabled: false } });
    await flush();
    oldRead.resolve({ ok: true, records: { git: { enabled: true, consentRevision: 2 } } });
    await flush();
    const button = serverButton(ui.render(), 'git');
    assert.equal(button.props.children, 'common.off');
    button.props.onClick(); button.props.onClick();
    assert.equal(host.calls.length, 1);
    save.reject(new Error('rejected'));
    await flush();
    assert.equal(alert(ui.render()), 'mcpDefaults.couldNotSave');
  } finally { ui.unmount(); }
});

test('preload forwards only server id and enabled and propagates invoke rejection', async () => {
  let api;
  const calls = [];
  const electron = require.resolve('electron');
  require.cache[electron] = { id: electron, filename: electron, loaded: true, exports: {
    contextBridge: { exposeInMainWorld: (_name, exposed) => { api = exposed; } },
    ipcRenderer: { invoke: async (...args) => { calls.push(args); throw new Error('invoke rejected'); } }
  } };
  global.__APP_VERSION__ = 'test';
  try { loadTs('src/preload/index.ts'); }
  finally { delete global.__APP_VERSION__; }
  await assert.rejects(api.setMcpServerEnabled('git', true), /invoke rejected/);
  await assert.rejects(api.getMcpConsentState(), /invoke rejected/);
  assert.deepEqual(calls, [['config:setMcpServerEnabled', 'git', true], ['config:getMcpConsentState']]);
  const main = fs.readFileSync('src/main/index.ts', 'utf8');
  assert.match(main, /ipcMain\.handle\('config:setMcpServerEnabled',[\s\S]*?setMcpServerEnabled\(catalogId, enabled\)/);
  assert.match(main, /ipcMain\.handle\('config:getMcpConsentState', \(\) => getMcpConsentState\(\)\)/);
  assert.match(main, /mcpDefaults: mcpDefaultsForSpawn\(\),/);
  // The panel reads consent only from main; no stale config prop is threaded in.
  const settings = fs.readFileSync('src/renderer/src/components/SettingsModal.tsx', 'utf8');
  assert.match(settings, /<McpDefaultsSettings \/>/);
  const spawnConsent = main.match(/function mcpDefaultsForSpawn\(\)[\s\S]*?\r?\n}\r?\n/)?.[0] ?? '';
  assert.match(spawnConsent, /const consent = getMcpConsentState\(\)/);
  assert.match(spawnConsent, /return consent\.records/);
  assert.match(spawnConsent, /console\.warn\([^)]*consent\.error\)/);
  assert.match(spawnConsent, /breakerToast\(/);
  assert.match(spawnConsent, /return null;/);
});

test('background config broadcasts keep records and save errors; a good read clears load errors', async () => {
  const host = fixture();
  const ui = mount(host.api);
  try {
    ui.render(); await flush();
    const failedSave = host.api.setMcpServerEnabled;
    host.api.setMcpServerEnabled = async () => { throw new Error('disk failure'); };
    serverButton(ui.render(), 'git').props.onClick();
    await flush();
    assert.equal(alert(ui.render()), 'mcpDefaults.couldNotSave');

    // An unrelated write elsewhere (mission tick, theme) broadcasts the whole config.
    const slowRead = deferred();
    host.api.getMcpConsentState = () => slowRead.promise;
    host.broadcast({ git: { enabled: false } });
    let tree = ui.render();
    assert.equal(serverButton(tree, 'git').props.disabled, false, 'no loading flash');
    assert.equal(serverButton(tree, 'git').props.children, 'common.off');
    assert.equal(alert(tree), 'mcpDefaults.couldNotSave');
    slowRead.resolve({ ok: true, records: { git: { enabled: false } } });
    await flush();
    assert.equal(alert(ui.render()), 'mcpDefaults.couldNotSave', 'save failure stays until the user acts');

    host.api.getMcpConsentState = async () => ({ ok: false, error: 'bad JSON' });
    host.broadcast({});
    await flush();
    tree = ui.render();
    assert.equal(alert(tree), 'mcpDefaults.couldNotLoad');
    assert.equal(serverButton(tree, 'git').props.children, 'mcpDefaults.unavailable');
    assert.equal(serverButton(tree, 'git').props.disabled, true);

    host.api.getMcpConsentState = async () => ({ ok: true, records: { git: { enabled: true, consentRevision: 2 } } });
    host.api.setMcpServerEnabled = failedSave;
    host.broadcast({});
    await flush();
    tree = ui.render();
    assert.equal(alert(tree), undefined);
    assert.equal(serverButton(tree, 'git').props.children, 'common.on');
    assert.equal(serverButton(tree, 'git').props.disabled, false);
  } finally { ui.unmount(); }
});
