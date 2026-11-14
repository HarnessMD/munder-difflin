'use strict';

// Settings, Graphics: Auto, GPU or CPU only. The mode is read once before the app is ready (a
// missing or damaged config.json is Auto); CPU only turns hardware acceleration off for the run;
// a change applies after a restart. The indicator shows what is really in use, as a kind for
// keyed words.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const loadTs = require(path.join(ROOT, 'test/load-ts.cjs'));
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const M = loadTs('src/shared/graphicsMode.ts');

test('the mode: exact values only; anything missing, damaged or unknown is Auto', () => {
  assert.deepEqual([...M.GRAPHICS_MODES], ['auto', 'gpu', 'cpu']);
  for (const v of ['auto', 'gpu', 'cpu']) assert.equal(M.parseGraphicsMode(v), v);
  for (const v of ['GPU', ' cpu', '', null, 1]) assert.equal(M.parseGraphicsMode(v), null, String(v));
  assert.equal(M.graphicsModeOf({ graphicsMode: 'cpu' }), 'cpu');
  assert.equal(M.graphicsModeOf({ graphicsMode: 'fast' }), 'auto');
  assert.equal(M.graphicsModeOf(null), 'auto');
  assert.equal(M.graphicsModeFromConfigText('{"graphicsMode":"gpu"}'), 'gpu');
  for (const text of ['{"graphicsMode":"gpu"', '["cpu"]', 'null', '', null, undefined]) assert.equal(M.graphicsModeFromConfigText(text), 'auto', String(text));
  assert.equal(M.powerPreferenceFor('gpu'), 'high-performance');
  assert.equal(M.powerPreferenceFor('auto'), undefined);
  assert.equal(M.powerPreferenceFor('cpu'), undefined);
});

test('what is in use: software renderers, GPU names from Windows and macOS strings, Chromium\'s compositing', () => {
  for (const s of ['Google SwiftShader', 'llvmpipe (LLVM 15)', 'Microsoft Basic Render Driver', 'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device), SwiftShader driver)']) assert.equal(M.isSoftwareRenderer(s), true, s);
  assert.equal(M.isSoftwareRenderer('Apple M2 Pro'), false);
  assert.equal(M.isSoftwareRenderer(null), false);
  assert.equal(M.gpuNameOf('ANGLE (NVIDIA, NVIDIA GeForce RTX 4080 SUPER (0x00002702) Direct3D11 vs_5_0 ps_5_0, D3D11)'), 'NVIDIA GeForce RTX 4080 SUPER');
  assert.equal(M.gpuNameOf('ANGLE (Apple, ANGLE Metal Renderer: Apple M2 Pro, Unspecified Version)'), 'Apple M2 Pro');
  assert.equal(M.gpuNameOf('  Mesa Intel(R) UHD 620  '), 'Mesa Intel(R) UHD 620');
  assert.equal(M.hardwareCompositing({ gpu_compositing: 'enabled_on' }), true);
  assert.equal(M.hardwareCompositing({ gpu_compositing: 'disabled_software' }), false);
  assert.equal(M.hardwareCompositing({}), null);
});

test('the indicator: GPU with its name, CPU when chosen, a fallback under Auto or GPU, or unknown; a fresh software status wins', () => {
  const st = (applied, hardwareCompositing, hardwareDisabled = applied === 'cpu') => ({ applied, hardwareCompositing, hardwareDisabled });
  const metal = 'ANGLE (Apple, ANGLE Metal Renderer: Apple M2 Pro, Unspecified Version)';
  assert.deepEqual(M.renderingState(metal, st('auto', true)), { kind: 'gpu', name: 'Apple M2 Pro' });
  assert.deepEqual(M.renderingState(null, st('gpu', true)), { kind: 'gpu', name: null }, 'before any floor has drawn');
  assert.deepEqual(M.renderingState(null, st('auto', null)), { kind: 'unknown' });
  assert.deepEqual(M.renderingState(null, st('cpu', false)), { kind: 'cpu' });
  assert.deepEqual(M.renderingState('Google SwiftShader', st('gpu', true)), { kind: 'fallback', mode: 'gpu' });
  assert.deepEqual(M.renderingState(metal, st('auto', false)), { kind: 'fallback', mode: 'auto' }, 'a GPU process fallback mid run shows');
});

function inChild(body) {
  return JSON.parse(execFileSync(process.execPath, ['-e', `
    const G = require(${JSON.stringify(path.join(ROOT, 'test/load-ts.cjs'))})('src/main/graphics.ts');
    const out = {};
    const fakeApp = (ready, text) => ({ calls: 0, isReady: () => ready, getPath: () => '/u', disableHardwareAcceleration() { this.calls++; } });
    ${body}
    process.stdout.write(JSON.stringify(out));`], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
}

test('main: CPU only turns acceleration off before ready, once; after ready nothing is applied; a damaged config is Auto', () => {
  const cpu = inChild(`
    const app = fakeApp(false);
    out.first = G.applyGraphicsModeAtStartup(app, () => '{"graphicsMode":"cpu"}');
    out.again = G.applyGraphicsModeAtStartup(app, () => '{"graphicsMode":"gpu"}');
    out.calls = app.calls;
    out.status = G.graphicsStatus({ graphicsMode: 'gpu' }, { gpu_compositing: 'enabled_on' });`);
  assert.deepEqual(cpu.first, { mode: 'cpu', applied: true });
  assert.deepEqual(cpu.again, { mode: 'cpu', applied: true }, 'read once');
  assert.equal(cpu.calls, 1);
  assert.deepEqual(cpu.status, { applied: 'cpu', stored: 'gpu', hardwareDisabled: true, hardwareCompositing: false });
  const late = inChild(`
    const app = fakeApp(true);
    out.r = G.applyGraphicsModeAtStartup(app, () => '{"graphicsMode":"cpu"}');
    out.calls = app.calls;
    out.applied = G.appliedGraphicsMode();`);
  assert.deepEqual(late, { r: { mode: 'cpu', applied: false }, calls: 0, applied: 'auto' });
  const damaged = inChild(`
    out.a = G.readStartupGraphicsMode('/u', () => '{"graphicsMode":"cpu"');
    out.b = G.readStartupGraphicsMode('/u', () => { throw new Error('ENOENT'); });`);
  assert.deepEqual(damaged, { a: 'auto', b: 'auto' });
});

test('main: the start up log row waits until Chromium knows; CPU only is known at once; no report by the timeout is unknown, never software', () => {
  const r = inChild(`
    const events = {};
    const row = (status) => ({ getGPUFeatureStatus: () => status, on: (e, f) => { (events[e] ??= []).push(f); }, once: (e, f) => { (events[e] ??= []).push(f); }, removeListener: (e, f) => { events[e] = (events[e] ?? []).filter((x) => x !== f); } });
    const rows = [];
    let fire;
    const app = row({ gpu_compositing: 'disabled_software' });
    G.logGraphicsWhenKnown(app, { mode: 'auto', applied: true }, (x) => rows.push(x), { setTimer: (f) => { fire = f; return 1; }, clearTimer: () => {} });
    out.before = rows.length;
    app.getGPUFeatureStatus = () => ({ gpu_compositing: 'enabled_on' });
    events['gpu-info-update'].forEach((f) => f());
    out.reported = rows.slice();
    const slow = row({ gpu_compositing: 'disabled_software' });
    const rows2 = [];
    G.logGraphicsWhenKnown(slow, { mode: 'gpu', applied: true }, (x) => rows2.push(x), { setTimer: (f) => { fire = f; return 2; }, clearTimer: () => {} });
    fire();
    out.timedOut = rows2;
    out.timeout = G.GRAPHICS_ROW_TIMEOUT_MS;`);
  assert.equal(r.before, 0, 'not written at ready, when the status reads software in every mode');
  assert.deepEqual(r.reported, [{ kind: 'graphics', mode: 'auto', applied: true, hardwareCompositing: true, gpuCompositing: 'enabled_on' }]);
  assert.deepEqual(r.timedOut, [{ kind: 'graphics', mode: 'gpu', applied: true, hardwareCompositing: null, gpuCompositing: 'disabled_software' }]);
  assert.equal(r.timeout, 10000);
});

test('wiring: applied at main\'s module load before ready; the mode saves exactly; status, save and restart reach the window', () => {
  const main = read('src/main/index.ts');
  const at = main.indexOf('const graphicsAtStartup = applyGraphicsModeAtStartup(app);');
  assert.ok(at > 0);
  assert.ok(at < main.indexOf('app.whenReady('), 'before the app is ready');
  assert.ok(main.indexOf('watchGpuReports(app);') > at && main.indexOf('watchGpuReports(app);') < main.indexOf('app.whenReady('));
  assert.match(main, /ipcMain\.handle\('graphics:restart', \(\) => \{\s*app\.relaunch\(\);\s*teardownAndQuit\(\);/, 'the normal teardown');
  assert.match(main, /logGraphicsWhenKnown\(app, graphicsAtStartup, \(row\) => hive\.appendLog\(row\)\);/);
  assert.match(read('src/main/config.ts'), /const mode = parseGraphicsMode\(value\);\s*if \(mode === null\) throw new Error\('invalid graphics mode'\);/);
  const preload = read('src/preload/index.ts');
  for (const ch of ["'graphics:status'", "'graphics:setMode', mode", "'graphics:restart'"]) assert.ok(preload.includes(`ipcRenderer.invoke(${ch})`), ch);
});
