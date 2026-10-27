'use strict';

// A config.json, registry.json or tasks.json that does not parse is kept as it is, copied aside
// once per spell, and writes to it pause; a file that cannot be read just now is no damage (no
// copy, this run's last good value, at start up a short patient re-read). The window sees names
// only, never a path.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const loadTs = require(path.join(ROOT, 'test/load-ts.cjs'));
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const D = loadTs('src/main/damagedFile.ts');

function tmp(t, tag) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), `md-damaged-${tag}-`)));
  t.after(() => {
    const open = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) open(p); else if (!e.isSymbolicLink()) fs.chmodSync(p, 0o644); } };
    try { open(dir); } catch { /* gone */ }
    fs.rmSync(dir, { recursive: true, force: true });
  });
  return dir;
}
const copies = (dir, name) => fs.readdirSync(dir).filter((f) => f.startsWith(`${name}.damaged-`)).sort();

test('damaged: kept as it is, its text copied aside once per spell, named for the banner by name only; a new spell, a new copy', (t) => {
  const dir = tmp(t, 'spell');
  const p = path.join(dir, 'config.json');
  fs.writeFileSync(p, '{"harnessHome": "/h"');
  const r1 = D.readJsonFile(p);
  assert.equal(r1.kind, 'damaged');
  assert.match(r1.copy, /^config\.json\.damaged-\d{4}-\d{2}-\d{2}-\d{4}$/);
  assert.equal(fs.readFileSync(p, 'utf8'), '{"harnessHome": "/h"', 'kept as it is');
  assert.equal(fs.readFileSync(path.join(dir, r1.copy), 'utf8'), '{"harnessHome": "/h"');
  assert.equal(D.readJsonFile(p).copy, r1.copy);
  assert.deepEqual(copies(dir, 'config.json'), [r1.copy], 'once per spell');
  const issue = D.integrityIssues().find((i) => i.file === 'config.json');
  assert.deepEqual(Object.keys(issue).sort(), ['copy', 'error', 'file']);
  assert.equal(issue.copy, r1.copy);
  assert.equal(D.integrityPath('config.json'), p);
  assert.equal(D.integrityPath(r1.copy), path.join(dir, r1.copy));
  assert.equal(D.integrityPath(p), null, 'a path is never accepted');
  assert.equal(D.integrityPath('registry.json'), null);

  fs.writeFileSync(p, '{"ok": true}');
  assert.deepEqual(D.readJsonFile(p), { kind: 'ok', value: { ok: true } });
  assert.equal(D.integrityIssues().some((i) => i.file === 'config.json' && D.integrityPath('config.json') === p), false, 'reads again: off the list');
  fs.writeFileSync(p, '[1, 2]');
  const r2 = D.readJsonFile(p);
  assert.deepEqual([r2.kind, r2.error], ['damaged', 'not a JSON object']);
  assert.equal(copies(dir, 'config.json').length, 2, 'a new spell copies again');
  assert.notEqual(r2.copy, r1.copy);
  assert.equal(fs.readFileSync(path.join(dir, r1.copy), 'utf8'), '{"harnessHome": "/h"', 'a copy is never overwritten');
  assert.equal(D.readJsonFile(path.join(dir, 'none.json')).kind, 'missing');
});

test('not readable just now: no damage, no copy; a patient caller reads 3 more times 50 ms apart, once per spell', (t) => {
  if (process.getuid && process.getuid() === 0) { t.skip('root reads anything'); return; }
  const dir = tmp(t, 'busy');
  const p = path.join(dir, 'tasks.json');
  fs.writeFileSync(p, '{"tasks": []}');
  fs.chmodSync(p, 0o000);
  let at = Date.now();
  assert.equal(D.readJsonFile(p).kind, 'unreadable');
  assert.ok(Date.now() - at < 40, 'an impatient read does not wait');
  at = Date.now();
  assert.equal(D.readJsonFile(p, true).kind, 'unreadable');
  assert.ok(Date.now() - at >= 140, 'three waits of 50 ms');
  at = Date.now();
  D.readJsonFile(p, true);
  assert.ok(Date.now() - at < 40, 'once per spell');
  assert.deepEqual(copies(dir, 'tasks.json'), []);
  assert.equal(D.integrityIssues().some((i) => i.file === 'tasks.json'), false);
  const w = D.writeRefusal(p);
  assert.deepEqual([w.why, w.copy, w.logged], ['read error', null, true]);
  assert.equal(D.writeRefusal(p).logged, false, 'a skipped write is logged once per spell');
  fs.chmodSync(p, 0o644);
  assert.equal(D.writeRefusal(p), null);
  fs.chmodSync(p, 0o000);
  at = Date.now();
  D.readJsonFile(p, true);
  assert.ok(Date.now() - at >= 140, 'a new spell waits again');
  assert.equal(D.writeRefusal(p).logged, true);
  fs.chmodSync(p, 0o644);
});

function inChild(userData, body) {
  return JSON.parse(execFileSync(process.execPath, ['-e', `
    const electron = require.resolve('electron');
    require.cache[electron] = { id: electron, filename: electron, loaded: true, exports: { app: { getPath: () => ${JSON.stringify(userData)} } } };
    const fs = require('node:fs'), p = require('node:path').join(${JSON.stringify(userData)}, 'config.json');
    const C = require(${JSON.stringify(path.join(ROOT, 'test/load-ts.cjs'))})('src/main/config.ts');
    const out = {};
    ${body}
    process.stdout.write(JSON.stringify(out));`], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
}

test('config.json damaged: the run keeps its last good settings (a copy), a write is skipped and the file kept; at start up, defaults and no write', (t) => {
  const userData = tmp(t, 'config');
  const r = inChild(userData, `
    C.writeConfig({ harnessHome: '/h/kept' });
    out.first = C.readConfig().harnessHome;
    fs.writeFileSync(p, '{"harnessHome": "/h/kept", "oops');
    const got = C.readConfig();
    out.kept = got.harnessHome;
    got.harnessHome = '/h/changed-by-caller';
    out.notShared = C.readConfig().harnessHome;
    out.writeReturned = C.writeConfig({ harnessHome: '/h/new' }).harnessHome;
    out.fileKept = fs.readFileSync(p, 'utf8') === '{"harnessHome": "/h/kept", "oops';
    out.copies = fs.readdirSync(${JSON.stringify(userData)}).filter((f) => f.startsWith('config.json.damaged-')).length;`);
  assert.deepEqual(r, { first: '/h/kept', kept: '/h/kept', notShared: '/h/kept', writeReturned: '/h/kept', fileKept: true, copies: 1 });
  const fresh = tmp(t, 'config-start');
  fs.writeFileSync(path.join(fresh, 'config.json'), '{"harnessHome": "/h/x"');
  const s = inChild(fresh, `
    out.home = C.readConfig().harnessHome ?? null;
    C.writeConfig({ harnessHome: '/h/new' });
    out.fileKept = fs.readFileSync(p, 'utf8') === '{"harnessHome": "/h/x"';`);
  assert.notEqual(s.home, '/h/x');
  assert.equal(s.fileKept, true, 'the defaults never go over the person\'s file');
});

test('registry.json and tasks.json damaged: last good read (a copy), an agent list write skipped and logged once, a board write refused with what to do', async (t) => {
  const { HiveManager } = loadTs('src/main/hive.ts');
  const home = tmp(t, 'hive');
  const hive = new HiveManager(() => home);
  await hive.ensureAgent({ id: 'a1', name: 'A', provider: 'claude', cwd: home });
  assert.equal(hive.addTask({ id: 't1', title: 't1', status: 'todo', dependsOn: [], priority: 3, createdAt: '2026-10-19T00:00:00.000Z' }), true);
  const root = hive.root();
  const reg = path.join(root, 'registry.json');
  const tasks = path.join(root, 'tasks.json');
  const regText = '{"godId": null, "agents": {';
  fs.writeFileSync(reg, regText);
  const seen = hive.registry();
  assert.ok(seen.agents.a1, 'the last good agent list');
  seen.agents.a1.name = 'changed by a caller';
  assert.equal(hive.registry().agents.a1.name, 'A', 'a copy');
  hive.setArchived('a1', true);
  hive.setArchived('a1', false);
  assert.equal(fs.readFileSync(reg, 'utf8'), regText, 'never written over');
  const log = () => fs.readFileSync(path.join(root, 'log.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  assert.equal(log().filter((e) => e.kind === 'write-skipped' && e.file === 'registry.json').length, 1, 'logged once per spell');

  assert.deepEqual(hive.tasks().tasks.map((x) => x.id), ['t1'], 'read whole once this run');
  const taskText = '{"tasks": [';
  fs.writeFileSync(tasks, taskText);
  assert.deepEqual(hive.tasks().tasks.map((x) => x.id), ['t1'], 'the last good board');
  assert.throws(() => hive.addTask({ id: 't2', title: 't2', status: 'todo', dependsOn: [], priority: 3, createdAt: '2026-10-19T00:00:00.000Z' }), /tasks\.json is damaged, so it is kept as it is \(copy: tasks\.json\.damaged-[^)]+\) and nothing was written\. Repair it, then try again/);
  assert.equal(fs.readFileSync(tasks, 'utf8'), taskText);
  if (!(process.getuid && process.getuid() === 0)) {
    fs.writeFileSync(tasks, '{"tasks": []}');
    hive.tasks();
    fs.chmodSync(tasks, 0o000);
    assert.throws(() => hive.addTask({ id: 't3', title: 't3', status: 'todo', dependsOn: [], priority: 3, createdAt: '2026-10-19T00:00:00.000Z' }), /tasks\.json could not be read just now \([^)]*\); nothing was written\. Try again in a moment/);
    fs.chmodSync(tasks, 0o644);
  }
});

test('wiring: task IPC returns a refusal instead of throwing; the banner reads names and reveals only a listed file; board writes are atomic', () => {
  const main = read('src/main/index.ts');
  for (const call of ['hive.addTask(task as HiveTask)', "hive.patchTask(id, patch as Partial<Omit<HiveTask, 'id'>>)", 'hive.deleteTask(id)']) {
    assert.ok(main.includes(`return taskWrite(() => ${call});`), call);
  }
  assert.match(main, /function taskWrite\(write: \(\) => boolean\): \{ ok: boolean; error\?: string \} \{\s*try \{ return \{ ok: write\(\) \}; \} catch \(e\) \{ return \{ ok: false, error: e instanceof Error \? e\.message : String\(e\) \}; \}/);
  assert.match(main, /ipcMain\.handle\('integrity:reveal', \(_evt, name: unknown\) => \{\s*const p = typeof name === 'string' \? integrityPath\(name\) : null;\s*if \(!p\) return \{ ok: false, error: 'not a listed file' \};\s*shell\.showItemInFolder\(p\);/);
  assert.match(main, /ipcMain\.handle\('integrity:issues', \(\) => \{\s*readConfig\(\);\s*if \(hive\.enabled\(\)\) \{ hive\.registry\(\); hive\.tasks\(\); \}\s*return integrityIssues\(\);/);
  const preload = read('src/preload/index.ts');
  assert.match(preload, /integrityIssues: \(\)[^=]*=>\s*ipcRenderer\.invoke\('integrity:issues'\)/);
  assert.match(preload, /integrityReveal: \(name: string\)[^=]*=>\s*ipcRenderer\.invoke\('integrity:reveal', name\)/);
  assert.match(read('src/main/hive.ts'), /const merged = mergeTaskLedger\(current\?\.tasks, tasks\);\s*this\.atomicWriteJson\(path, \{ tasks: merged \}\);/);
});
