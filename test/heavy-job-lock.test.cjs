'use strict';
/**
 * HEAVY-JOB-SERIALIZE (1.1.55; god andyheavy + andyheavycfg, the Human's "Heavy jobs at once").
 * "One heavy job at a time" was a prose rule, broken twice on 2026-09-26 (and the Human's PC froze
 * earlier with several heavy jobs at once). The app now enforces it at PreToolUse with a counting
 * semaphore of N slots (Settings: Off or N, default 1, applied live).
 * HOME is jailed and asserted before any hive is built.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const electron = require.resolve('electron');
require.cache[electron] = { id: electron, filename: electron, loaded: true, exports: { Notification: class { show() {} static isSupported() { return false; } } } };

const { classifyCommand, classifyHeavy, isBackground, heavyLimit, HeavyJobLock, HEAVY_TTL_MS, HEAVY_SCAN_MISSES } = loadTs('src/main/heavyJob.ts');
const { HiveManager } = loadTs('src/main/hive.ts');
const { HookServer } = loadTs('src/main/hooks.ts');
const REPO = path.resolve(__dirname, '..');

// ── the classifier corpus ────────────────────────────────────────────────────────────────

const HEAVY = [
  ['npm ci', 'install'], ['env -u NoDefaultCurrentDirectoryInExePath npm ci > ../x.log 2>&1', 'install'], ['npm install', 'install'], ['npm i', 'install'],
  ['pnpm install', 'install'], ['yarn', 'install'], ['npm rebuild', 'install'], ['npx electron-rebuild -f', 'install'], ['node-gyp rebuild', 'install'],
  ['npm run build', 'build'], ['npm run -s build > ../b.log 2>&1', 'build'], ['npm run dist:win', 'build'], ['electron-vite build', 'build'], ['npx electron-builder --win', 'build'],
  ['npm test', 'suite'], ['node --test test/*.test.cjs', 'suite'], ['node --test', 'suite'], ['node --test test', 'suite'], ['timeout 600 node --test test/*.test.cjs', 'suite'],
  ['vitest run', 'suite'], ['cd /c/x && npm run -s typecheck && node --test test/*.test.cjs', 'suite'],
  [`node --test ${Array.from({ length: 20 }, (_, i) => `test/t${i}.test.cjs`).join(' ')}`, 'suite'],
  ['node _work/speed-driver.cjs --exe x', 'bench'], ['node scripts/native-memory-parity.cjs', 'bench'], ['node test/tools/inbox-wake-mutants.cjs', 'bench'],
  ['node C:/Dunder/_work/andy-mem154-measure/parity-embed.cjs', 'bench'], ['"Munder Difflin.exe" --native-memory-bench=C:/t', 'bench'],
  ['bash -c "npm ci"', 'install'], ['cmd //c "npm run build"', 'build'], ['powershell -NoProfile -Command "npm test"', 'suite'],
  ['node --test test/*.test.cjs &', 'suite']
];
const LIGHT = [
  'node --test test/one.test.cjs', 'node --test test/a.test.cjs test/b.test.cjs', 'node --test --test-name-pattern "x y" test/a.test.cjs',
  'echo npm ci', 'grep "npm ci" README.md', 'git commit -m "run npm ci then npm run build"', 'cat package.json', 'npm run -s typecheck',
  'npx tsc --noEmit -p tsconfig.node.json', 'vitest run src/a.test.ts', 'node scripts/release-markers.cjs node_modules resources/models',
  'git log --oneline -3', 'ls node_modules', 'node -e "console.log(1)"', 'npm view electron version', ''
];

test('CLASSIFIER: every heavy command in the corpus is heavy, with its kind', () => {
  for (const [cmd, kind] of HEAVY) {
    const c = classifyCommand(cmd);
    assert.equal(c.heavy, true, cmd);
    assert.equal(c.kind, kind, cmd);
  }
});

test('CLASSIFIER: the FALSE POSITIVES stay light (single test files, echo/grep/commit text, typecheck, tsc, one vitest file)', () => {
  for (const cmd of LIGHT) assert.equal(classifyCommand(cmd).heavy, false, cmd);
});

test('CLASSIFIER: tool input shapes (Claude Bash {command}, Codex argv arrays, non-command tools) and background detection', () => {
  assert.equal(classifyHeavy('Bash', { command: 'npm ci' }).heavy, true);
  assert.equal(classifyHeavy('shell', { command: ['npm', 'run', 'build'] }).heavy, true);
  assert.equal(classifyHeavy('Read', { file_path: 'npm ci' }).heavy, false);
  assert.equal(classifyHeavy('Edit', 'x').heavy, false);
  assert.equal(isBackground({ command: 'node --test test/*.test.cjs', run_in_background: true }), true);
  assert.equal(isBackground({ command: 'npm run build &' }), true);
  assert.equal(isBackground({ command: 'npm run build' }), false);
  assert.equal(isBackground({ command: 'a && b' }), false);
});

test('heavyLimit: Off / N (1..16) / default 1', () => {
  assert.equal(heavyLimit('off'), 'off');
  assert.equal(heavyLimit(0), 'off');
  assert.equal(heavyLimit(undefined), 1);
  assert.equal(heavyLimit(2), 2);
  assert.equal(heavyLimit('3'), 3);
  assert.equal(heavyLimit(99), 16);
  assert.equal(heavyLimit(-1), 1);
});

// ── the lock ─────────────────────────────────────────────────────────────────────────────

function lock(limit, extra = {}) {
  let now = 1_000_000; let lim = limit; const logs = []; const timers = [];
  const l = new HeavyJobLock({ limit: () => lim, now: () => now, setTimer: (fn, ms) => { const t = { fn, ms }; timers.push(t); return t; }, clearTimer: () => {}, log: (r) => logs.push(r), ...extra });
  return { l, logs, timers, tick: (ms) => { now += ms; }, setLimit: (v) => { lim = v; } };
}
const H = { heavy: true, kind: 'suite' };

test('N=1: the first heavy job takes the slot; another agent is DENIED naming the holder; the holder re-enters; its foreground PostToolUse frees it', () => {
  const x = lock(1);
  assert.deepEqual(x.l.acquire('andy', H, 'node --test test/*.test.cjs', 'c1', false), { allow: true, acquired: true });
  const d = x.l.acquire('jim', H, 'npm ci', 'j1', false);
  assert.equal(d.allow, false);
  assert.match(d.reason, /^Denied by HEAVY-JOB-LOCK: the machine allows 1 heavy job at once and it is held by andy \(suite: node --test test\/\*\.test\.cjs, since \d\d:\d\d:\d\dZ\)/);
  assert.match(d.reason, /Light work \(single test files, reads, edits\) is not limited/);
  assert.deepEqual(x.l.acquire('andy', H, 'npm run build', 'c2', false), { allow: true, acquired: false }, 're-entrant');
  x.l.callDone('andy', 'c1');
  assert.equal(x.l.snapshot().length, 1, 'still one call running');
  x.l.callDone('andy', 'c2');
  assert.equal(x.l.snapshot().length, 0, 'freed');
  assert.equal(x.l.acquire('jim', H, 'npm ci', 'j2', false).allow, true);
  assert.deepEqual(x.logs.map((r) => r.action), ['acquire', 'deny', 'reenter', 'release', 'acquire']);
  assert.equal(x.logs.find((r) => r.action === 'release').reason, 'posttool');
});

test('N=2: two agents hold; the THIRD is denied naming BOTH', () => {
  const x = lock(2);
  assert.equal(x.l.acquire('a', H, 'npm ci', '1', false).allow, true);
  assert.equal(x.l.acquire('b', H, 'npm run build', '2', false).allow, true);
  const d = x.l.acquire('c', H, 'npm test', '3', false);
  assert.equal(d.allow, false);
  assert.match(d.reason, /allows 2 heavy jobs at once and they are held by a \(.*\); b \(/);
});

test('OFF: never denies and holds nothing; a LIVE change applies at the next acquire (1 -> 2 -> off)', () => {
  const x = lock('off');
  for (const a of ['a', 'b', 'c']) assert.deepEqual(x.l.acquire(a, H, 'npm ci', a, false), { allow: true, acquired: false });
  assert.equal(x.l.snapshot().length, 0);
  const y = lock(1);
  y.l.acquire('a', H, 'npm ci', '1', false);
  assert.equal(y.l.acquire('b', H, 'npm ci', '2', false).allow, false);
  y.setLimit(2);
  assert.equal(y.l.acquire('b', H, 'npm ci', '2', false).allow, true, 'raised live');
  assert.equal(y.l.acquire('c', H, 'npm ci', '3', false).allow, false);
  y.setLimit('off');
  assert.equal(y.l.acquire('c', H, 'npm ci', '3', false).allow, true, 'off live');
});

test('BACKGROUND: its PostToolUse does NOT free the slot; the process check does, after 2 scans with no heavy process under the holder\'s PTY', async () => {
  let procs = [{ pid: 10, parentPid: 1, commandLine: 'bash' }, { pid: 11, parentPid: 10, commandLine: 'node --test test/*.test.cjs' }, { pid: 20, parentPid: 2, commandLine: 'npm ci' }];
  let probes = 0;
  const x = lock(1, { roots: () => [{ agentId: 'andy', pid: 10 }, { agentId: 'jim', pid: 2 }], probe: async () => { probes++; return procs; } });
  x.l.acquire('andy', H, 'node --test test/*.test.cjs', 'bg', true);
  x.l.callDone('andy', 'bg');
  assert.equal(x.l.snapshot().length, 1, 'backgrounded: still held after the call returned');
  await x.l.scan();
  assert.equal(x.l.snapshot().length, 1, 'its test run is still a descendant of its PTY');
  procs = procs.filter((p) => p.pid !== 11);   // the run finished (jim's npm ci is NOT andy's)
  for (let i = 0; i < HEAVY_SCAN_MISSES - 1; i++) { await x.l.scan(); assert.equal(x.l.snapshot().length, 1, 'one miss is not enough'); }
  await x.l.scan();
  assert.equal(x.l.snapshot().length, 0, 'freed');
  assert.equal(x.logs.at(-1).reason, 'process-exit');
  assert.ok(probes >= HEAVY_SCAN_MISSES + 1);
});

test('the process check runs ONLY while a slot is held, and only probes when a holder is backgrounded', async () => {
  let probes = 0;
  const x = lock(1, { roots: () => [], probe: async () => { probes++; return []; } });
  assert.equal(x.timers.length, 0, 'nothing held: no timer');
  x.l.acquire('a', H, 'npm ci', '1', false);
  assert.equal(x.timers.length, 1, 'armed while held');
  await x.l.scan();
  assert.equal(probes, 0, 'a foreground holder needs no process listing');
});

test('PTY EXIT and the TTL free a slot', () => {
  const x = lock(1);
  x.l.acquire('a', H, 'npm ci', '1', true);
  x.l.agentGone('a');
  assert.equal(x.l.snapshot().length, 0);
  assert.equal(x.logs.at(-1).reason, 'pty-exit');
  x.l.acquire('b', H, 'npm ci', '2', true);
  x.tick(HEAVY_TTL_MS);
  assert.equal(x.l.acquire('c', H, 'npm ci', '3', false).allow, true, 'b expired');
  assert.ok(x.logs.some((r) => r.action === 'release' && r.agentId === 'b' && r.reason === 'ttl'));
});

// ── the hook boundary ────────────────────────────────────────────────────────────────────

async function server(t, limit) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'md-heavy-'));
  const ph = process.env.HOME; const pu = process.env.USERPROFILE;
  process.env.HOME = home; process.env.USERPROFILE = home;
  assert.equal(os.homedir(), home, 'HOME jailed before any hive');
  t.after(() => { if (ph === undefined) delete process.env.HOME; else process.env.HOME = ph; if (pu === undefined) delete process.env.USERPROFILE; else process.env.USERPROFILE = pu; hive.closeAppendFiles(); try { fs.rmSync(home, { recursive: true, force: true }); } catch { /* Windows: ensureAgent leaves the jailed HOME busy (also on the unmodified tree) */ } });
  const hive = new HiveManager(() => home);
  for (const id of ['a1', 'a2']) await hive.ensureAgent({ id, name: id, provider: 'claude', cwd: home });
  const control = { takeSteer: () => null, shouldHalt: () => false, toolDecision: () => ({ deny: false }) };
  const s = new HookServer(hive, () => null, () => ({ notifications: false }), control, undefined);
  const l = new HeavyJobLock({ limit: () => limit, setTimer: () => ({}), clearTimer: () => {} });
  s.setHeavyLock(l);
  return { s, l };
}

test('HOOK: a heavy PreToolUse beyond the limit is DENIED with the Claude-shaped deny (every transport: http, mcp, the AGY pipe shim), a light one is untouched, and PostToolUse frees the slot', async (t) => {
  const { s, l } = await server(t, 1);
  const fire = (agent_id, hook_event_name, command, extra = {}) => s.handle({ agent_id, hook_event_name, session_id: 's', tool_name: 'Bash', tool_input: { command }, ...extra });
  assert.equal(fire('a1', 'PreToolUse', 'npm ci', { transport: 'http', tool_use_id: 'u1' }).hookSpecificOutput?.permissionDecision, undefined, 'a1 takes the slot');
  for (const transport of ['http', 'mcp', 'pipe']) {
    const r = fire('a2', 'PreToolUse', 'npm run build', { transport });
    assert.equal(r.hookSpecificOutput.permissionDecision, 'deny', transport);
    assert.match(r.hookSpecificOutput.permissionDecisionReason, /HEAVY-JOB-LOCK: .* held by a1 \(install: npm ci/);
  }
  assert.equal(fire('a2', 'PreToolUse', 'node --test test/one.test.cjs', { transport: 'http' }).hookSpecificOutput?.permissionDecision, undefined, 'light: never gated');
  fire('a1', 'PostToolUse', 'npm ci', { transport: 'http', tool_use_id: 'u1' });
  assert.equal(l.snapshot().length, 0, 'freed by the same call\'s PostToolUse');
  assert.equal(fire('a2', 'PreToolUse', 'npm run build', { transport: 'http' }).hookSpecificOutput?.permissionDecision, undefined);
});

test('HOOK: without the id, Pre/Post pair by the command; with no lock wired nothing changes', async (t) => {
  const { s, l } = await server(t, 1);
  s.handle({ agent_id: 'a1', hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'npm ci' } });
  assert.equal(l.snapshot().length, 1);
  s.handle({ agent_id: 'a1', hook_event_name: 'PostToolUse', tool_name: 'Bash', tool_input: { command: 'npm ci' } });
  assert.equal(l.snapshot().length, 0);
  s.setHeavyLock(null);
  for (const a of ['a1', 'a2']) assert.equal(s.handle({ agent_id: a, hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'npm ci' } }).hookSpecificOutput?.permissionDecision, undefined);
});

// ── wiring, config, UI ───────────────────────────────────────────────────────────────────

test('WIRING: index.ts builds the lock from the LIVE setting, hands it to the HookServer, frees an agent\'s slot at PTY teardown, and puts the holders in fleet.json', () => {
  const idx = fs.readFileSync(path.join(REPO, 'src', 'main', 'index.ts'), 'utf8');
  assert.match(idx, /const heavyLock = new HeavyJobLock\(\{\s*limit: \(\) => heavyLimit\(readConfig\(\)\.heavyJobsAtOnce\),/);
  assert.match(idx, /probe: probeProcesses,/);
  assert.match(idx, /hookServer\.setHeavyLock\(heavyLock\);/);
  assert.match(idx, /if \(!\[\.\.\.ptyToAgent\.values\(\)\]\.includes\(agentId\)\) \{ try \{ heavyLock\.agentGone\(agentId\); \}/);
  assert.match(idx, /heavyLock: \{ limit: heavyLimit\(readConfig\(\)\.heavyJobsAtOnce\), holders: heavyLock\.snapshot\(\) \}/);
});

test('CONFIG + SETTINGS: default 1; the Autonomy & Budgets section offers Off and N, saved through updateConfig', () => {
  const cfg = fs.readFileSync(path.join(REPO, 'src', 'main', 'config.ts'), 'utf8');
  assert.match(cfg, /heavyJobsAtOnce\?: number \| 'off';/);
  assert.match(cfg, /heavyJobsAtOnce: 1,/);
  const ui = fs.readFileSync(path.join(REPO, 'src', 'renderer', 'src', 'components', 'SettingsModal.tsx'), 'utf8');
  assert.match(ui, /Heavy jobs at once/);
  assert.match(ui, /<option value="off">Off<\/option>/);
  assert.match(ui, /updateConfig\(\{ heavyJobsAtOnce: next \}/);
});

test('HOOK: a heavy PreToolUse the HITL/control layer denies never holds a slot (no PostToolUse would free it)', async (t) => {
  const { s, l } = await server(t, 1);
  s.control = { takeSteer: () => null, shouldHalt: () => false, toolDecision: (id) => (id === 'a1' ? { deny: true, reason: 'paused' } : { deny: false }) };
  const r = s.handle({ agent_id: 'a1', hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'npm ci' }, tool_use_id: 'u9' });
  assert.equal(r.hookSpecificOutput.permissionDecision, 'deny');
  assert.equal(r.hookSpecificOutput.permissionDecisionReason, 'paused');
  assert.equal(l.snapshot().length, 0, 'the denied call holds nothing');
  assert.equal(s.handle({ agent_id: 'a2', hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'npm ci' } }).hookSpecificOutput?.permissionDecision, undefined, 'another agent can take the only slot');
});
