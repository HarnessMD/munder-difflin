'use strict';

/**
 * REFRESH-MODELS (1.1.73; the Human's call via god c6e41f / df3983). ONE models file,
 * userData/models.json, filled ONLY by the Settings button, read by every picker; the hard-coded
 * lists are the floor. Plan and measurements: C:/Dunder/hive/agents/jim-mtujpe28/REFRESH-MODELS-PLAN.md.
 *
 * Adapters are tested on CAPTURED real output: `agy models` (agy 1.2.12) and `codex debug models`
 * (codex 0.157.1, trimmed to the fields used: test/fixtures/codex-debug-models-0.157.1.json).
 * opencode and the Anthropic Models API use their documented shapes (neither is available here).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');
const { readSource: read, codeOnly } = require('./read-source.cjs');
const { runScenario } = require('./electron-harness/run.cjs');

const P = loadTs('src/main/providerModels.ts');
const C = loadTs('src/renderer/src/store/config.ts');

const AGY_STDOUT = [
  'gemini-3.8-flash-high\tGemini 3.8 Flash (High)', 'gemini-3.8-flash-medium\tGemini 3.8 Flash (Medium)', 'gemini-3.8-flash-low\tGemini 3.8 Flash (Low)',
  'gemini-3.7-flash-high\tGemini 3.7 Flash (High)', 'gemini-3.7-flash-medium\tGemini 3.7 Flash (Medium)', 'gemini-3.7-flash-low\tGemini 3.7 Flash (Low)',
  'gemini-3.6-flash-high\tGemini 3.6 Flash (High)', 'gemini-3.6-flash-medium\tGemini 3.6 Flash (Medium)', 'gemini-3.6-flash-low\tGemini 3.6 Flash (Low)',
  'gemini-3.1-pro-high\tGemini 3.1 Pro (High)', 'gemini-3.1-pro-low\tGemini 3.1 Pro (Low)',
  'claude-sonnet-4-6\tClaude Sonnet 4.6 (Thinking)', 'claude-opus-4-6-thinking\tClaude Opus 4.6 (Thinking)', 'gpt-oss-120b-medium\tGPT-OSS 120B (Medium)', ''
].join('\n');
// codex prints its catalog on stdout (one JSON line); the harness saw a stderr warning after it.
const CODEX_STDOUT = fs.readFileSync(path.join(__dirname, 'fixtures', 'codex-debug-models-0.157.1.json'), 'utf8');

// ── parsers ─────────────────────────────────────────────────────────────────────────────

test('agy: 14 models from the real output; id = the LABEL (--model takes it), display "· Med"', () => {
  const m = P.parseAgyModels(AGY_STDOUT);
  assert.equal(m.length, 14);
  assert.deepEqual(m[1], { id: 'Gemini 3.8 Flash (Medium)', label: 'Gemini 3.8 Flash · Med' });
  assert.deepEqual(m[12], { id: 'Claude Opus 4.6 (Thinking)', label: 'Claude Opus 4.6' });
  assert.equal(P.parseAgyModels('Fetching available models...\nError: offline'), null);
});

test('codex: only visibility "list", in priority order, from the real 0.157.1 catalog', () => {
  const m = P.parseCodexModels(CODEX_STDOUT);
  assert.deepEqual(m.map((x) => x.id), ['gpt-6-astra', 'gpt-6-sol', 'gpt-6-luna', 'gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.6-luna', 'gpt-5.5']);
  assert.deepEqual(m[0], { id: 'gpt-6-astra', label: 'GPT-6 Astra' });
  assert.deepEqual(m[6], { id: 'gpt-5.5', label: 'GPT-5.5' });
  assert.equal(P.parseCodexModels('not json'), null);
});

test('opencode (provider/model lines) and the Anthropic Models API (data[].id / display_name)', () => {
  assert.deepEqual(P.parseOpencodeModels('anthropic/claude-sonnet-4-5\nopenai/gpt-5\nnoise line\n'), [{ id: 'anthropic/claude-sonnet-4-5', label: 'anthropic/claude-sonnet-4-5' }, { id: 'openai/gpt-5', label: 'openai/gpt-5' }]);
  assert.deepEqual(P.parseAnthropicModels({ data: [{ type: 'model', id: 'claude-opus-5-5', display_name: 'Claude Opus 5.5' }, { id: 'bad"id' }] }), [{ id: 'claude-opus-5-5', label: 'Claude Opus 5.5' }]);
  assert.equal(P.parseAnthropicModels({ error: {} }), null);
});

test('ids that could not be a safe --model argument never pass (quotes, cmd/shell metacharacters)', () => {
  assert.deepEqual(P.cleanModels([{ id: 'ok-1', label: 'OK' }, { id: 'a"b', label: 'x' }, { id: 'a&b', label: 'x' }, { id: 'a;rm', label: 'x' }, { id: '$(x)', label: 'x' }, { id: 'ok-1', label: 'dup' }, { id: 'claude-opus-5-5[1m]', label: '1M' }]).map((m) => m.id),
    ['ok-1', 'claude-opus-5-5[1m]']);
});

// ── the file ────────────────────────────────────────────────────────────────────────────

test('the file is re-validated on read: a hand edit cannot inject an id; bad entries are dropped', () => {
  const f = P.validModelsFile({ version: 1, refreshedAt: 5, providers: {
    antigravity: { status: 'ok', models: [{ id: 'Gemini X (High)', label: 'Gemini X · High' }, { id: 'Gemini "evil"', label: 'x' }] },
    codex: { status: 'ok', models: [{ id: 'a|b', label: 'x' }] },
    claude: { status: 'weird' },
    'BAD ID': { status: 'ok', models: [{ id: 'x', label: 'x' }] }
  } });
  assert.deepEqual(Object.keys(f.providers), ['antigravity'], '"ok" with nothing usable is not ok; unknown status and bad ids dropped');
  assert.equal(f.providers.antigravity.models.length, 1);
  assert.equal(P.validModelsFile({ version: 2, refreshedAt: 1, providers: {} }), null);
});

test('the store re-validates the file it READS (a hand-edited models.json never reaches a picker unchecked)', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'models-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const p = path.join(dir, 'models.json');
  fs.writeFileSync(p, JSON.stringify({ version: 1, refreshedAt: 1, providers: { codex: { status: 'ok', models: [{ id: 'gpt-x" && calc', label: 'evil' }, { id: 'gpt-5.5', label: 'GPT-5.5' }] } } }));
  const f = new P.ProviderModelStore({ path: p, now: () => 1 }).read();
  assert.deepEqual(f.providers.codex.models, [{ id: 'gpt-5.5', label: 'GPT-5.5' }]);
});

// ── adapters (fake exec: no real CLI runs here) ─────────────────────────────────────────

function fakeExec(answers) {
  const calls = [];
  const exec = (file, args, opts, cb) => {
    calls.push({ file, args, opts });
    const a = answers[file] ? answers[file](args, opts) : { err: Object.assign(new Error('spawn ENOENT'), { code: 'ENOENT' }) };
    setImmediate(() => (a.err ? cb(a.err, '') : cb(null, a.stdout)));
  };
  return { exec, calls };
}
const winEnv = { LOCALAPPDATA: 'C:\\L', APPDATA: 'C:\\R', ComSpec: 'C:\\W\\cmd.exe' };

test('cli adapter: resolved ASYNC via where, run hidden + time-boxed; codex gets a large buffer', async () => {
  const f = fakeExec({ where: (a) => ({ stdout: a[0] === 'codex' ? 'C:\\n\\codex\r\nC:\\n\\codex.cmd\r\n' : '' }), 'C:\\W\\cmd.exe': () => ({ stdout: CODEX_STDOUT }) });
  const d = { platform: 'win32', env: winEnv, exec: f.exec, exists: (p) => p === 'C:\\n\\codex.cmd' || p === 'C:\\n\\codex' };
  const r = await P.cliAdapter(d, 'codex', ['debug', 'models'], P.parseCodexModels, 4 * 1024 * 1024)();
  assert.equal(r.status, 'ok'); assert.equal(r.models.length, 7);
  const run = f.calls.at(-1);
  assert.equal(run.file, 'C:\\W\\cmd.exe', 'the .cmd shim is preferred over the extensionless one and runs through cmd.exe');
  assert.deepEqual(run.args, ['/d', '/s', '/c', '""C:\\n\\codex.cmd" debug models"']);
  assert.equal(run.opts.windowsVerbatimArguments, true);
  assert.equal(run.opts.windowsHide, true); assert.equal(run.opts.maxBuffer, 4 * 1024 * 1024);
  assert.equal(run.opts.timeout, 0, 'on Windows the run is timed by the caller (so the TREE can be killed), not by execFile');
});

test('cli adapter: not installed / failed (timeout, exit N) / unparsable, each with its reason', async () => {
  const none = fakeExec({ where: () => ({ err: Object.assign(new Error('x'), { code: 1 }) }) });
  assert.deepEqual(await P.cliAdapter({ platform: 'win32', env: winEnv, exec: none.exec, exists: () => false }, 'agy', ['models'], P.parseAgyModels)(), { status: 'not-installed', reason: 'agy not found', source: 'agy models' });
  for (const [answer, reason] of [[{ err: Object.assign(new Error('t'), { killed: true }) }, 'timeout'], [{ err: Object.assign(new Error('e'), { code: 3 }) }, 'exit 3'], [{ stdout: 'garbage' }, 'unparsable output']]) {
    const f = fakeExec({ where: () => ({ stdout: 'C:\\L\\agy\\bin\\agy.exe' }), 'C:\\L\\agy\\bin\\agy.exe': () => answer });
    const r = await P.cliAdapter({ platform: 'win32', env: winEnv, exec: f.exec, exists: () => true }, 'agy', ['models'], P.parseAgyModels)();
    assert.deepEqual([r.status, r.reason], ['failed', reason]);
  }
  const bad = fakeExec({ where: () => ({ stdout: 'C:\\a&b\\agy.cmd' }) });
  const r = await P.cliAdapter({ platform: 'win32', env: winEnv, exec: bad.exec, exists: () => true }, 'agy', ['models'], P.parseAgyModels)();
  assert.deepEqual([r.status, r.reason], ['failed', 'unsafe-path']);
  assert.equal(bad.calls.filter((c) => c.file === 'C:\\W\\cmd.exe').length, 0, 'a metacharacter path never reaches cmd.exe');
});

test('claude: the Models API ONLY with a stored Anthropic key; without one nothing is requested', async () => {
  let fetched = 0; let headers = null;
  const fetchJson = async (url, h) => { fetched++; headers = h; return { status: 200, body: { data: [{ id: 'claude-opus-5-5', display_name: 'Claude Opus 5.5' }] } }; };
  assert.deepEqual(await P.anthropicAdapter(() => undefined, fetchJson)(), { status: 'unsupported', reason: 'no list command (no Anthropic API key stored; built-in list kept)' });
  assert.equal(fetched, 0);
  const ok = await P.anthropicAdapter(() => 'sk-ant-test', fetchJson)();
  assert.deepEqual([ok.status, ok.models], ['ok', [{ id: 'claude-opus-5-5', label: 'Claude Opus 5.5' }]]);
  assert.deepEqual(headers, { 'x-api-key': 'sk-ant-test', 'anthropic-version': '2023-06-01' });
  const denied = await P.anthropicAdapter(() => 'k', async () => ({ status: 401, body: {} }))();
  assert.deepEqual([denied.status, denied.reason], ['failed', 'HTTP 401']);
});

test('defaultAdapters covers every provider except custom; codex/agy/opencode list, claude via the API, the rest report', () => {
  const ids = Object.keys(P.defaultAdapters({ platform: 'win32', env: {}, exec: () => {}, exists: () => false }, () => undefined, async () => ({ status: 0, body: null })));
  assert.deepEqual(ids.sort(), ['antigravity', 'claude', 'codex', 'copilot', 'crush', 'cursor', 'gemini', 'grok', 'kimi', 'opencode', 'pi', 'qwen']);
});

// ── the store: merge, keep-last, one at a time, atomic write, log ───────────────────────

test('store: merges results, a failed provider keeps its last good list, added/removed per provider, one row logged', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'models-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const logs = []; let now = 1000;
  const store = new P.ProviderModelStore({ path: path.join(dir, 'models.json'), now: () => now, log: (r) => logs.push(r) });
  assert.equal(store.read(), null, 'no file yet: pickers use the floor');
  const agy1 = [{ id: 'Gemini 3.5 Flash (Medium)', label: 'old' }, { id: 'Gemini 3.8 Flash (High)', label: 'new' }];
  await store.refresh({ antigravity: async () => ({ status: 'ok', models: agy1, source: 'agy models' }), codex: async () => ({ status: 'ok', models: [{ id: 'gpt-5.5', label: 'GPT-5.5' }], source: 'codex debug models' }), opencode: async () => ({ status: 'not-installed', reason: 'opencode not found' }) });
  now = 2000;
  const { file, rows } = await store.refresh({
    antigravity: async () => ({ status: 'ok', models: [agy1[1], { id: 'Gemini 3.9 Flash (High)', label: '3.9' }], source: 'agy models' }),
    codex: async () => ({ status: 'failed', reason: 'timeout', source: 'codex debug models' }),
    opencode: async () => ({ status: 'not-installed', reason: 'opencode not found' })
  });
  const byId = Object.fromEntries(rows.map((r) => [r.provider, r]));
  assert.deepEqual([byId.antigravity.added, byId.antigravity.removed], [['Gemini 3.9 Flash (High)'], ['Gemini 3.5 Flash (Medium)']]);
  assert.deepEqual([byId.codex.status, byId.codex.keptLast, byId.codex.count, file.providers.codex.models], ['failed', true, 1, [{ id: 'gpt-5.5', label: 'GPT-5.5' }]]);
  assert.equal(file.providers.opencode.status, 'not-installed');
  assert.equal(file.refreshedAt, 2000);
  assert.deepEqual(logs.at(-1).providers.antigravity, { status: 'ok', count: 2, added: 1, removed: 1 });
  const again = new P.ProviderModelStore({ path: path.join(dir, 'models.json'), now: () => now });
  assert.deepEqual(again.read(), file, 'the file on disk is what the next start reads');
  assert.ok(!fs.existsSync(path.join(dir, 'models.json.tmp')), 'written atomically (temp + rename)');
});

test('store: one refresh at a time (a second click joins the running one)', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'models-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  let runs = 0; let release;
  const store = new P.ProviderModelStore({ path: path.join(dir, 'm.json'), now: () => 1 });
  const adapters = { antigravity: () => { runs++; return new Promise((r) => { release = () => r({ status: 'ok', models: [{ id: 'A (High)', label: 'A' }], source: 's' }); }); } };
  const a = store.refresh(adapters); const b = store.refresh(adapters);
  assert.equal(store.isRefreshing(), true);
  release();
  assert.equal(await a, await b); assert.equal(runs, 1); assert.equal(store.isRefreshing(), false);
});

// ── the pickers ─────────────────────────────────────────────────────────────────────────

test('pickers: the floor until a refresh; then each provider\'s own list; a failed refresh keeps its last list; saved ids no longer offered are marked', () => {
  assert.equal(C.currentModelCatalog(), null);
  const agyFloor = C.modelsForProvider('antigravity').map((m) => m.id).filter(Boolean);
  assert.ok(agyFloor.includes('Gemini 3.8 Flash (High)'), 'the AGY floor is today\'s list');
  assert.deepEqual(C.modelsForProvider('codex').map((m) => m.id), [undefined, 'gpt-6-astra', 'gpt-6-sol', 'gpt-5.6-sol', 'gpt-6-terra', 'gpt-5.6-terra', 'gpt-6-luna', 'gpt-5.6-luna'], 'the Codex floor is today\'s list');
  assert.equal(C.unknownModelSuffix('antigravity', '(current)'), '(current)');
  C.setModelCatalog({ version: 1, refreshedAt: 1, providers: {
    antigravity: { status: 'ok', models: [{ id: 'Gemini 3.9 Flash (High)', label: 'Gemini 3.9 Flash · High' }] },
    codex: { status: 'failed', reason: 'timeout', models: [{ id: 'gpt-6-astra', label: 'GPT-6 Astra' }] },
    claude: { status: 'ok', models: [{ id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' }] },
    gemini: { status: 'unsupported', reason: 'no list command' }
  } });
  try {
    assert.deepEqual(C.modelsForProvider('antigravity').map((m) => m.id), [undefined, 'Gemini 3.9 Flash (High)']);
    assert.deepEqual(C.modelsForProvider('codex').map((m) => m.id), [undefined, 'gpt-6-astra'], 'failed + kept list: the last good list');
    assert.deepEqual(C.modelsForProvider('claude').map((m) => m.id), [undefined, 'claude-sonnet-4-6', 'claude-sonnet-4-6[1m]'], 'Claude keeps the curated 1M variant of a listed model');
    assert.deepEqual(C.modelsForProvider('gemini').map((m) => m.id), [undefined, 'auto', 'gemini-4-argon', 'pro', 'flash', 'flash-lite'], 'no list -> the floor');
    assert.equal(C.unknownModelSuffix('antigravity', '(current)'), '· not in the refreshed list');
    assert.equal(C.unknownModelSuffix('gemini', '(current)'), '(current)');
  } finally {
    C.setModelCatalog(null);
  }
});

// ── wiring: button-only, async-only ─────────────────────────────────────────────────────

test('WIRING: nothing is looked up at startup or picker open; only models:refresh refreshes; async only', () => {
  const idx = codeOnly(read('src/main/index.ts'));
  assert.equal((idx.match(/providerModels\.refresh\(/g) || []).length, 1, 'refresh() is called in exactly one place');
  assert.match(idx, /ipcMain\.handle\('models:refresh', async \(\) => \{[\s\S]{0,1400}providerModels\.refresh\(defaultAdapters\(/);
  assert.match(idx, /ipcMain\.handle\('models:catalog', \(\) => providerModels\.read\(\)\);/, 'the catalog IPC is a file read');
  assert.doesNotMatch(idx, /models:agy/, 'the automatic AGY lookup is gone');
  assert.match(idx, /integrations\.getSecret\(providerKeyRef\('anthropic'\)\)/, 'Claude: only the stored BYOK key');
  assert.doesNotMatch(codeOnly(read('src/main/providerModels.ts')), /spawnSync|execSync|execFileSync|readFileSync\([^)]*credentials/, 'no sync child process; no subscription credentials');
  const pre = read('src/preload/index.ts');
  assert.match(pre, /modelCatalog: \(\): Promise<ModelsCatalog \| null> => ipcRenderer\.invoke\('models:catalog'\)/);
  assert.match(pre, /refreshModels: \(\)[^\n]*ipcRenderer\.invoke\('models:refresh'\)/);
  assert.match(read('src/renderer/src/App.tsx'), /useEffect\(\(\) => \{ void loadModelCatalog\(\); \}, \[\]\);/);
  assert.match(read('src/renderer/src/components/SettingsModal.tsx'), /<ModelsRefreshPanel \/>/);
  for (const f of ['AddAgentModal', 'EditAgentModal']) assert.match(read(`src/renderer/src/components/${f}.tsx`), /unknownModelSuffix\(provider, /);
});

// ── the button, rendered (hidden harness) ───────────────────────────────────────────────

test('RENDERED: the Settings button - floor before, one refresh per click burst, per-provider rows, pickers updated', { timeout: 150_000 }, async () => {
  const r = await runScenario(path.join(__dirname, 'electron-harness', 'scenarios', 'models-refresh-button.tsx'), { timeoutMs: 120_000 });
  assert.equal(r.ok, true, r.error);
  assert.equal(r.before.refreshCalls, 0, 'mounting looks nothing up');
  assert.ok(r.before.picker.includes('Gemini 3.8 Flash · High'), `floor: ${r.before.picker}`);
  assert.match(r.before.panel, /Not refreshed yet/);
  assert.deepEqual(r.during, { label: 'Refreshing…', disabled: true });
  assert.equal(r.calls.refreshModels, 1, 'a second click while busy does nothing');
  assert.deepEqual(r.after.rows, [
    ['antigravity', 'listed', '2 models · +1 new · −1 removed: Gemini 3.5 Flash (Medium)'],
    ['claude', 'no list', 'no list command (no Anthropic API key stored; built-in list kept)'],
    ['opencode', 'not installed', 'opencode not found'],
    ['codex', 'failed', 'timeout · kept the last list (1)']
  ]);
  assert.deepEqual(r.after.picker, ['CLI default', 'Gemini 3.9 Flash · High', 'Gemini 3.8 Flash · High'], 'the picker follows the pushed file');
  assert.equal(r.lastRefreshed, true);
  assert.deepEqual([r.after.button, r.after.disabled], ['Refresh models', false]);
});

// ── MODELS-173-AUDIT (Dwight): the time box ends the whole Windows process TREE ─────────

test('win32 timeout: the still-live child TREE is killed (taskkill /T /F on its pid), then "timeout"', async () => {
  const calls = [];
  const exec = (file, args, opts, cb) => {
    calls.push({ file, args, opts });
    if (file === 'taskkill') { setImmediate(() => cb(null, 'SUCCESS')); return { pid: 1 }; }
    return { pid: 4242 }; // cmd.exe that never finishes (its codex child hangs)
  };
  const r = await P.runCli({ platform: 'win32', env: winEnv, exec, exists: () => true }, 'C:\\n\\codex.cmd', ['debug', 'models'], 1024, 40);
  assert.deepEqual(r, { reason: 'timeout' });
  const kill = calls.find((c) => c.file === 'taskkill');
  assert.deepEqual(kill.args, ['/PID', '4242', '/T', '/F']);
  assert.equal(calls[0].opts.timeout, 0);
});

test('win32 timeout: a failing or hanging taskkill, and a late exit, are tolerated (still one "timeout")', async () => {
  let late = null;
  const exec = (file, args, opts, cb) => {
    if (file === 'taskkill') { setImmediate(() => cb(Object.assign(new Error('not found'), { code: 128 }), '')); return {}; }
    late = cb; return { pid: 7 };
  };
  const r = await P.runCli({ platform: 'win32', env: winEnv, exec, exists: () => true }, 'C:\\a\\agy.exe', ['models'], 1024, 30);
  assert.deepEqual(r, { reason: 'timeout' });
  late(null, 'gemini-x\tGemini X (High)'); // the process exits after all: ignored
  const quick = await P.runCli({ platform: 'win32', env: winEnv, exec: (f, a, o, cb) => { setImmediate(() => cb(null, 'ok')); return { pid: 9 }; }, exists: () => true }, 'C:\\a\\agy.exe', ['models'], 1024, 5000);
  assert.deepEqual(quick, { stdout: 'ok' }, 'a run that finishes in time is untouched');
});

test('POSIX keeps execFile\'s own timeout', async () => {
  let seen = null;
  await P.runCli({ platform: 'linux', env: {}, exec: (f, a, o, cb) => { seen = o; setImmediate(() => cb(null, 'x')); }, exists: () => true }, '/usr/bin/agy', ['models'], 1024, 1234);
  assert.equal(seen.timeout, 1234);
});

test('REAL (Windows): a .cmd shim whose node grandchild hangs is killed WITH its tree at the time box', { skip: process.platform !== 'win32' }, async (t) => {
  const cp = require('node:child_process');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'treekill-'));
  t.after(() => { try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); } catch { /* best effort */ } });
  const pidFile = path.join(dir, 'grandchild.pid');
  const shim = path.join(dir, 'hang.cmd');
  fs.writeFileSync(shim, `@"${process.execPath}" -e "require('fs').writeFileSync(process.argv[1], String(process.pid)); setInterval(() => {}, 1000)" "${pidFile}"\r\n`);
  const d = { platform: 'win32', env: process.env, exists: fs.existsSync, exec: (file, args, opts, cb) => cp.execFile(file, args, opts, (err, stdout) => cb(err, String(stdout ?? ''))) };
  const t0 = Date.now();
  const r = await P.runCli(d, shim, ['models'], 1024, 2500);
  assert.deepEqual(r, { reason: 'timeout' });
  assert.ok(Date.now() - t0 < 15_000, 'bounded');
  const pid = Number(fs.readFileSync(pidFile, 'utf8'));
  assert.ok(pid > 0, 'the grandchild ran');
  let alive = true;
  for (let i = 0; i < 40 && alive; i++) {
    try { process.kill(pid, 0); await new Promise((res) => setTimeout(res, 100)); } catch { alive = false; }
  }
  if (alive) { try { process.kill(pid); } catch { /* */ } }
  assert.equal(alive, false, 'the node GRANDCHILD of the .cmd shim is gone (no orphaned tree)');
});

// ── The Human's rule (god 34c5a5): NO model lookup at launch or on picker open - button only ────

test('NO LOOKUP AT LAUNCH (main): building the adapters, creating the store and reading the file run ZERO child processes', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'models-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  let execs = 0; let fetches = 0;
  const cli = { platform: 'win32', env: winEnv, exists: () => true, exec: () => { execs++; return { pid: 1 }; } };
  const adapters = P.defaultAdapters(cli, () => 'sk-ant-key', async () => { fetches++; return { status: 200, body: { data: [] } }; });
  fs.writeFileSync(path.join(dir, 'models.json'), JSON.stringify({ version: 1, refreshedAt: 1, providers: { codex: { status: 'ok', models: [{ id: 'gpt-5.5', label: 'GPT-5.5' }] } } }));
  const store = new P.ProviderModelStore({ path: path.join(dir, 'models.json'), now: () => 1 });
  for (let i = 0; i < 5; i++) store.read();
  assert.ok(Object.keys(adapters).length >= 12);
  assert.deepEqual([execs, fetches, store.isRefreshing()], [0, 0, false], 'nothing is looked up until refresh() is called');
});

test('NO LOOKUP AT LAUNCH (index.ts): the adapters are built and run ONLY inside the models:refresh handler', () => {
  const idx = codeOnly(read('src/main/index.ts'));
  const handler = idx.slice(idx.indexOf("ipcMain.handle('models:refresh'"), idx.indexOf("ipcMain.handle('tools:status'"));
  assert.ok(handler.length > 0);
  for (const call of ['defaultAdapters(', 'providerModels.refresh(']) {
    assert.equal(idx.split(call).length - 1, 1, `${call} appears exactly once`);
    assert.ok(handler.includes(call), `${call} is inside the button handler`);
  }
  assert.equal((idx.match(/execFile\(/g) || []).length, 1, 'the only execFile call in index.ts is the adapters\' exec (inside the handler)');
  assert.ok(handler.includes('execFile('));
});

test('NO LOOKUP AT LAUNCH (renderer): loading the catalog and opening every picker never asks for a refresh', async () => {
  const saved = global.window;
  let refreshes = 0; let reads = 0;
  global.window = { cth: { modelCatalog: async () => { reads++; return null; }, refreshModels: async () => { refreshes++; return { rows: [] }; }, onModelCatalogChanged: () => () => {} } };
  try {
    await C.loadModelCatalog();
    for (const provider of ['claude', 'codex', 'grok', 'kimi', 'gemini', 'antigravity', 'qwen', 'opencode', 'crush', 'pi', 'copilot', 'cursor', 'custom']) C.modelsForProvider(provider);
    assert.equal(refreshes, 0, 'launch + every picker: zero refreshes');
    assert.ok(reads <= 1, 'at most one file read');
  } finally {
    global.window = saved;
  }
});
