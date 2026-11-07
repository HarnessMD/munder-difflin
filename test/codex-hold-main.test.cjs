'use strict';

// A hive Codex start waits for the person's OK when a project `.codex` folder it would load
// carries anything that can run: config.toml keys other than sandbox_mode and approval_policy,
// hooks, rules, agent files, hook files, or a file the app cannot read. Every `.codex` from the
// agent's folder up to the root counts, and in a linked worktree the main checkout's hooks too.
// One OK is kept per project folder, spelled as in its main checkout, so it covers the
// project's worktrees.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const LOADER = path.join(ROOT, 'test/load-ts.cjs');
const loadTs = require(LOADER);
const ts = require(path.join(ROOT, 'node_modules/typescript'));
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const L = loadTs('src/main/codexProjectLayers.ts');

const tmp = (t, name) => {
  const d = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`)));
  t.after(() => fs.rmSync(d, { recursive: true, force: true }));
  return d;
};
const put = (file, text) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); };
const git = (cwd, ...a) => execFileSync('git', ['-c', 'user.email=t@example.invalid', '-c', 'user.name=t', '-c', 'init.defaultBranch=main', ...a], { cwd, stdio: 'ignore' });
const scan = (cwd, extra = {}) => L.codexProjectLayers({ cwd, codexHome: '/nowhere/agent/.codex', userCodexHome: '/nowhere/me/.codex', ...extra });
const whats = (layer) => layer.items.map((it) => `${it.what}:${path.relative(layer.dotCodex, it.file) || '.'}${it.detail ? `=${it.detail}` : ''}${it.more ? `+${it.more}` : ''}`);

test('the TOML reader: the four string forms, dotted keys, inline tables, arrays of tables; a key or table defined twice is an error', () => {
  const t = L.parseToml([
    'a = "x\\ty"', "b = 'c:\\\\raw'", 'c = """', 'one', 'two"""', "d = '''lit", "eral'''",
    'mcp_servers.hand.command = "true"', 'e = { f = 1, g = [1, 2] }', '[[h]]', 'i = 1', '[[h]]', 'i = 2', '[j.k]', 'l = true # note',
  ].join('\n'));
  assert.equal(t.a, 'x\ty');
  assert.equal(t.b, 'c:\\\\raw');
  assert.equal(t.c, 'one\ntwo');
  assert.equal(t.d, 'lit\neral');
  assert.deepEqual(t.mcp_servers, { hand: { command: 'true' } });
  assert.deepEqual(t.e, { f: '1', g: ['1', '2'] });
  assert.deepEqual(t.h, [{ i: '1' }, { i: '2' }]);
  assert.deepEqual(t.j, { k: { l: true } });
  for (const bad of ['a = 1\na = 2', '[x]\n[x]', 'a = "open', 'a = { b = 1 }\n[a]', '= 1', 'a = 1 b']) {
    assert.throws(() => L.parseToml(bad), L.TomlError, bad);
  }
});

test('a project .codex: each MCP server, hook, rule, agent file and hook file is named; sandbox_mode and approval_policy are only confinement', (t) => {
  const d = tmp(t, 'cx-layer');
  const proj = path.join(d, 'proj');
  const dc = path.join(proj, '.codex');
  put(path.join(dc, 'config.toml'), 'sandbox_mode = "workspace-write"\napproval_policy = "never"\nnotify = ["x"]\n[mcp_servers.hand]\ncommand = "true"\n[mcp_servers.two]\ncommand = "y"\n[hooks.Stop]\n');
  put(path.join(dc, 'hooks.json'), JSON.stringify({ hooks: { SessionStart: [{}], Stop: [] } }));
  put(path.join(dc, 'rules', 'hand.rules'), 'x');
  put(path.join(dc, 'rules', 'readme.txt'), 'not a rule');
  put(path.join(dc, 'agents', 'a.toml'), 'x');
  for (let i = 0; i < 25; i++) put(path.join(dc, 'hooks', `h${String(i).padStart(2, '0')}.sh`), 'x');
  const sub = path.join(proj, 'deep', 'er');
  fs.mkdirSync(sub, { recursive: true });
  const r = scan(sub);
  assert.equal(r.projectFolder, sub, 'a plain folder is its own project');
  assert.deepEqual(r.unknown, []);
  assert.equal(r.layers.length, 1);
  const w = whats(r.layers[0]);
  assert.deepEqual(w.slice(0, 6), [
    'confinement:config.toml=sandbox_mode', 'confinement:config.toml=approval_policy', 'setting:config.toml=notify',
    'mcp-servers:config.toml=hand, two', 'rules:rules/hand.rules', 'agents:agents/a.toml',
  ]);
  assert.ok(w.includes('hooks:config.toml=Stop') && w.includes('hooks:hooks.json=SessionStart, Stop'));
  const hookFiles = w.filter((x) => x.startsWith('hooks:hooks/'));
  assert.equal(hookFiles.length, 20, 'twenty hook files by name');
  assert.ok(w.includes('hooks:hooks+5'), 'the rest counted on the folder');
  assert.equal(L.CODEX_FOLDER_LIST_MAX, 20);
  const hold = L.codexHold(r, []);
  assert.equal(hold.folderKey, L.codexFolderKey(sub));
  assert.ok(hold.layers[0].items.every((it) => it.what !== 'confinement'), 'confinement never reaches the card');
});

test('what does not hold: only sandbox_mode and approval_policy, an empty hooks.json, hooks with no entries, an empty folder, the agent\'s own and the person\'s own .codex', (t) => {
  const d = tmp(t, 'cx-quiet');
  const proj = path.join(d, 'p');
  put(path.join(proj, '.codex', 'config.toml'), 'sandbox_mode = "read-only"\napproval_policy = "on-request"\n');
  put(path.join(proj, '.codex', 'hooks.json'), '{}');
  assert.equal(L.codexHold(scan(proj), []), null);
  put(path.join(proj, '.codex', 'hooks.json'), JSON.stringify({ hooks: { Stop: [] } }));
  fs.mkdirSync(path.join(proj, '.codex', 'agents'));
  assert.equal(L.codexHold(scan(proj), []), null);
  put(path.join(proj, '.codex', 'config.toml'), '[mcp_servers.x]\ncommand = "y"\n');
  assert.ok(L.codexHold(scan(proj), []));
  assert.equal(L.codexHold(scan(proj, { codexHome: path.join(proj, '.codex') }), []), null, 'the agent\'s own CODEX_HOME');
  assert.equal(L.codexHold(scan(proj, { userCodexHome: path.join(proj, '.codex') }), []), null, 'the person\'s own ~/.codex');
});

test('every .codex up to the root counts, the outer folder first', (t) => {
  const d = tmp(t, 'cx-up');
  put(path.join(d, '.codex', 'rules', 'outer.rules'), 'x');
  const inner = path.join(d, 'a', 'b');
  put(path.join(inner, '.codex', 'rules', 'inner.rules'), 'x');
  const r = scan(inner);
  assert.deepEqual(r.layers.map((l) => l.dotCodex), [path.join(d, '.codex'), path.join(inner, '.codex')]);
});

test('what cannot be read or parsed holds, named as such', (t) => {
  const d = tmp(t, 'cx-bad');
  const dc = path.join(d, 'p', '.codex');
  put(path.join(dc, 'config.toml'), 'a = "open');
  put(path.join(dc, 'hooks.json'), '{ not json');
  let r = scan(path.join(d, 'p'));
  assert.deepEqual(r.layers[0].items.map((it) => `${it.what}:${path.basename(it.file)}`), ['does-not-parse:config.toml', 'does-not-parse:hooks.json']);
  assert.ok(L.codexHold(r, []));
  put(path.join(dc, 'config.toml'), 'model = "x"\n');
  fs.chmodSync(path.join(dc, 'config.toml'), 0o000);
  try {
    r = scan(path.join(d, 'p'));
    const it = r.layers[0].items.find((x) => x.file.endsWith('config.toml'));
    assert.equal(it.what, 'unreadable');
    assert.ok(it.detail, 'the error as given');
  } finally { fs.chmodSync(path.join(dc, 'config.toml'), 0o644); }
  // a .codex folder that cannot be opened: each place in it counts as unreadable
  fs.chmodSync(dc, 0o000);
  try {
    r = scan(path.join(d, 'p'));
    const got = r.layers[0].items.map((x) => `${x.what}:${path.relative(dc, x.file)}`);
    for (const f of ['config.toml', 'rules', 'agents', 'hooks.json', 'hooks']) assert.ok(got.includes(`unreadable:${f}`), `${f} in ${got}`);
  } finally { fs.chmodSync(dc, 0o755); }
});

test('a linked worktree: hooks also come from the main checkout, and the OK is keyed by the main checkout\'s folder', (t) => {
  const d = tmp(t, 'cx-wt');
  const main = path.join(d, 'main');
  fs.mkdirSync(main);
  git(main, 'init', '-q');
  put(path.join(main, 'README'), 'x');
  git(main, 'add', 'README');
  git(main, 'commit', '-q', '-m', 'one');
  const wt = path.join(d, 'wt');
  git(main, 'worktree', 'add', '-q', wt);
  put(path.join(main, '.codex', 'hooks.json'), JSON.stringify({ hooks: { Stop: [{}] } }));
  put(path.join(wt, '.codex', 'rules', 'w.rules'), 'x');
  const r = scan(wt);
  assert.deepEqual(r.unknown, []);
  assert.equal(r.projectFolder, main);
  assert.equal(r.layers.length, 1);
  assert.equal(r.layers[0].dotCodex, path.join(wt, '.codex'));
  assert.equal(r.layers[0].hooksFrom, path.join(main, '.codex'));
  assert.deepEqual(r.layers[0].items.map((it) => `${it.what}:${it.file}`), [`rules:${path.join(wt, '.codex', 'rules', 'w.rules')}`, `hooks:${path.join(main, '.codex', 'hooks.json')}`]);
  const sub = path.join(wt, 'src');
  fs.mkdirSync(sub);
  assert.equal(scan(sub).projectFolder, path.join(main, 'src'), 'a folder inside the worktree keys as the same folder in the main checkout');
  const hold = L.codexHold(r, []);
  assert.equal(hold.folderKey, main);
  assert.equal(L.codexHold(r, [main]), null, 'the main checkout\'s OK covers the worktree');
  assert.equal(L.codexHold(r, [`${main}/`]), null, 'spelled with a trailing slash too');
});

test('a worktree that cannot be resolved to its main checkout holds, saying why', (t) => {
  const d = tmp(t, 'cx-wt-bad');
  const wt = path.join(d, 'wt');
  put(path.join(wt, '.git'), 'gitdir: /nowhere/.git/worktrees/wt\n');
  const r = scan(wt);
  assert.equal(r.unknown.length, 1);
  assert.match(r.unknown[0], /could not be resolved to its main checkout/);
  const hold = L.codexHold(r, []);
  assert.ok(hold, 'nothing found, but it could not be checked');
  assert.equal(hold.folder, wt);
  assert.deepEqual(hold.layers, []);
});

test('the folder key: resolved; on Windows lower-cased, with the \\\\?\\ prefix dropped', () => {
  assert.equal(L.codexFolderKey('/a/b/../c/', 'darwin'), '/a/c');
  assert.equal(L.codexFolderKey('/A/B', 'linux'), '/A/B');
  assert.equal(L.codexFolderKey('C:\\Users\\Ann\\Proj\\', 'win32'), 'c:\\users\\ann\\proj');
  assert.equal(L.codexFolderKey('\\\\?\\C:\\Users\\Ann', 'win32'), 'c:\\users\\ann');
  assert.ok(L.isCodexFolderOk('c:\\USERS\\ann', ['C:\\Users\\Ann'], 'win32'));
  assert.ok(!L.isCodexFolderOk('/A', ['/a'], 'darwin'));
  assert.ok(!L.isCodexFolderOk('/a', [null, 3, '/b'], 'darwin'));
});

// ── the OK in config.json ────────────────────────────────────────────────────

function inChild(userData, body) {
  return JSON.parse(execFileSync(process.execPath, ['-e', `
    const electron = require.resolve('electron');
    require.cache[electron] = { id: electron, filename: electron, loaded: true, exports: { app: { getPath: () => ${JSON.stringify(userData)} } } };
    const fs = require('node:fs'), p = require('node:path').join(${JSON.stringify(userData)}, 'config.json');
    const C = require(${JSON.stringify(LOADER)})('src/main/config.ts');
    const disk = () => JSON.parse(fs.readFileSync(p, 'utf8'));
    const out = {};
    ${body}
    process.stdout.write(JSON.stringify(out));`], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
}

test('an OK is merged into the latest config.json, once per folder, and read back; withdraw takes it out; a damaged config.json is not saved', (t) => {
  const ud = tmp(t, 'cx-cfg');
  fs.writeFileSync(path.join(ud, 'config.json'), JSON.stringify({ codexLayerOptIns: ['/x/keep', 7], other: 1 }));
  const out = inChild(ud, `
    out.a = C.setCodexFolderOk('/x/proj/', true);
    out.b = C.setCodexFolderOk('/x/proj', true);
    out.disk1 = disk();
    out.c = C.setCodexFolderOk('/x/proj', false);
    out.disk2 = disk();
    fs.writeFileSync(p, '{ damaged');
    out.d = C.setCodexFolderOk('/x/other', true);
    out.raw = fs.readFileSync(p, 'utf8');`);
  assert.equal(out.a.saved, true);
  assert.equal(out.b.saved, true);
  assert.deepEqual(out.disk1.codexLayerOptIns, ['/x/keep', '/x/proj'], 'once, by its key; garbage dropped; the rest kept');
  assert.equal(out.disk1.other, 1);
  assert.equal(out.c.saved, true);
  assert.deepEqual(out.disk2.codexLayerOptIns, ['/x/keep']);
  assert.equal(out.d.saved, false, 'not saved, so the window says so');
  assert.equal(out.raw, '{ damaged', 'the damaged file is kept as it is');
});

// ── main: the hold, the list, Allow, not now, withdraw ───────────────────────

const INDEX = read('src/main/index.ts');
const sliceOf = (from, to) => {
  const a = INDEX.indexOf(from);
  const b = INDEX.indexOf(to, a);
  assert.ok(a >= 0 && b > a, `slice ${from}`);
  return INDEX.slice(a, b);
};
const HOLD_SRC = sliceOf('// ── R3: hold a hive Codex start', 'async function spawnAgentCore(');

function mainHolds({ oks = [], saved = true, check } = {}) {
  const handlers = new Map();
  const sent = [];
  const logs = [];
  const config = { codexLayerOptIns: oks.slice() };
  const deps = {
    ipcMain: { handle: (ch, fn) => handlers.set(ch, fn) },
    allWindows: [{ isDestroyed: () => false, webContents: { isDestroyed: () => false, send: (ch, v) => sent.push([ch, v]) } }],
    hive: { codexHomeOf: () => '/nowhere/agent/.codex', root: () => '/nowhere', appendLog: (e) => logs.push(e) },
    join: path.join,
    readConfig: () => config,
    setCodexFolderOk: (k, allow) => {
      if (!saved) return { saved: false, oks: config.codexLayerOptIns };
      config.codexLayerOptIns = config.codexLayerOptIns.filter((x) => x !== k).concat(allow ? [k] : []);
      return { saved: true, oks: config.codexLayerOptIns };
    },
    codexProjectLayers: check ?? (() => { throw new Error('unused'); }),
    codexHold: L.codexHold,
    codexFolderKey: L.codexFolderKey,
  };
  const js = ts.transpileModule(`${HOLD_SRC}\nreturn { codexStartCheck, codexStartHeld, codexHolds };`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const api = new Function(...Object.keys(deps), js)(...Object.values(deps));
  const call = (ch, ...a) => handlers.get(ch)({}, ...a);
  return { ...api, call, sent, logs, config, handlers };
}
const holdFor = (folder) => ({ folderKey: folder, folder, layers: [{ dotCodex: `${folder}/.codex`, items: [{ file: `${folder}/.codex/hooks.json`, what: 'hooks', detail: 'Stop' }] }], unknown: [] });

test('main: a held start answers with the card\'s hold, pushes it to every window and logs it; one per agent and folder, the newest last, at most 20', () => {
  const m = mainHolds();
  const r = m.codexStartHeld('a1', holdFor('/p'));
  assert.equal(r.ok, false);
  assert.match(r.error, /Codex start held: \/p/);
  assert.equal(r.codexHold.agentId, 'a1');
  assert.equal(typeof r.codexHold.at, 'number');
  assert.deepEqual(m.sent.at(-1)[0], 'codexHold:push');
  assert.deepEqual(m.logs.at(-1), { kind: 'codex-hold', agent: 'a1', folder: '/p', files: ['/p/.codex/hooks.json'], unknown: [] });
  m.codexStartHeld('a2', holdFor('/p'));
  m.codexStartHeld('a1', holdFor('/p'));
  assert.deepEqual(m.call('codexHold:list').map((h) => h.agentId), ['a2', 'a1'], 'the same agent and folder again replaces its entry');
  for (let i = 0; i < 30; i++) m.codexStartHeld(`t${i}`, holdFor(`/q${i}`));
  const list = m.call('codexHold:list');
  assert.equal(list.length, 20);
  assert.equal(list.at(-1).agentId, 't29');
});

test('main: Allow records only a folder held now, clears every hold of it and pushes; not saved answers "not-saved" and keeps the holds', () => {
  const m = mainHolds();
  m.codexStartHeld('a1', holdFor('/p'));
  m.codexStartHeld('a2', holdFor('/p'));
  m.codexStartHeld('a3', holdFor('/r'));
  assert.deepEqual(m.call('codexHold:allow', '/elsewhere'), { ok: false, error: 'that folder is not held' });
  assert.deepEqual(m.call('codexHold:allow', 42), { ok: false, error: 'that folder is not held' });
  assert.deepEqual(m.config.codexLayerOptIns, []);
  const pushes = m.sent.length;
  assert.deepEqual(m.call('codexHold:allow', '/p'), { ok: true });
  assert.deepEqual(m.config.codexLayerOptIns, ['/p']);
  assert.deepEqual(m.call('codexHold:list').map((h) => h.agentId), ['a3']);
  assert.equal(m.sent.length, pushes + 1);
  assert.deepEqual(m.logs.at(-1), { kind: 'codex-folder-allowed', folder: '/p' });
  assert.deepEqual(m.call('codexHold:allowed'), ['/p']);

  const n = mainHolds({ saved: false });
  n.codexStartHeld('a1', holdFor('/p'));
  assert.deepEqual(n.call('codexHold:allow', '/p'), { ok: false, error: 'not-saved' });
  assert.equal(n.call('codexHold:list').length, 1);
});

test('main: not now drops that one hold; withdraw takes an OK out; neither starts anything', () => {
  const m = mainHolds({ oks: ['/p'] });
  const a = m.codexStartHeld('a1', holdFor('/r')).codexHold;
  m.codexStartHeld('a2', holdFor('/r'));
  assert.deepEqual(m.call('codexHold:dismiss', a.at - 1), { ok: true });
  assert.equal(m.call('codexHold:list').length, 2, 'an unknown time drops nothing');
  m.call('codexHold:dismiss', a.at);
  assert.equal(m.call('codexHold:list').length, 1);
  assert.deepEqual(m.call('codexHold:withdraw', ' '), { ok: false, error: 'invalid folder' });
  assert.deepEqual(m.call('codexHold:withdraw', '/p'), { ok: true });
  assert.deepEqual(m.config.codexLayerOptIns, []);
  assert.deepEqual(m.logs.at(-1), { kind: 'codex-folder-withdrawn', folder: '/p' });
  assert.deepEqual([...m.handlers.keys()].sort(), ['codexHold:allow', 'codexHold:allowed', 'codexHold:dismiss', 'codexHold:list', 'codexHold:withdraw']);
});

test('main: the check keys a made worktree by the folder the person started in; a check that throws holds', () => {
  const seen = [];
  const m = mainHolds({
    check: ({ cwd }) => {
      seen.push(cwd);
      if (cwd === '/boom') throw new Error('disk');
      return { layers: holdFor(cwd).layers, unknown: [], projectFolder: cwd };
    },
  });
  const h = m.codexStartCheck('a1', '/home/wt/a1', '/home/proj');
  assert.equal(h.folderKey, '/home/proj');
  assert.deepEqual(seen, ['/home/wt/a1', '/home/proj']);
  m.config.codexLayerOptIns = ['/home/proj'];
  assert.equal(m.codexStartCheck('a1', '/home/wt/a1', '/home/proj'), null, 'allowed: it starts');
  const b = m.codexStartCheck('a1', '/boom');
  assert.equal(b.folderKey, '/boom');
  assert.match(b.unknown[0], /the check failed \(disk\)/);
});

test('main: every hive Codex start is checked before a worktree is made, and a made worktree once more, taken back before the card', () => {
  const at = INDEX.indexOf('async function spawnAgentCore(');
  const core = INDEX.slice(at, INDEX.indexOf('\n}\n', at));
  const first = core.indexOf("const codexHive = !!(opts.hive && hive.enabled() && provider === 'codex');");
  const wt = core.indexOf('const wt = await addWorktree(origCwd, wtPath, baseBranch);');
  assert.ok(first > 0 && wt > first, 'the check comes before the worktree');
  assert.match(core.slice(first, wt), /if \(codexHive\) \{\s*const held = codexStartCheck\(opts\.hive!\.id, opts\.cwd\);\s*if \(held\) return codexStartHeld\(opts\.hive!\.id, held\);/);
  const after = core.slice(wt, wt + 1400);
  assert.match(after, /const held = wt\.ok && codexHive \? codexStartCheck\(opts\.hive!\.id, wtPath, origCwd\) : null;/);
  const take = after.indexOf('removeWorktree(origCwd, wtPath)');
  const drop = after.indexOf('dropHeldAgentBranch(origCwd, wtPath');
  const card = after.indexOf('return codexStartHeld(opts.hive!.id, held);');
  assert.ok(take > 0 && drop > take && card > drop, 'take back, then the branch, then the card');
  assert.ok(after.indexOf('opts.cwd = wtPath;') > card, 'a held start never moves into the worktree');
});

test('the preload: the hold on the spawn answer, the list and its push, Allow, not now, the allowed folders and withdraw', () => {
  const pre = read('src/preload/index.ts');
  assert.match(pre, /spawnPty: \(opts: SpawnPtyOptions\): Promise<\{ ok: boolean; error\?: string; codexHold\?: CodexHoldView;/);
  for (const [fn, ch] of [['codexHolds', 'codexHold:list'], ['codexHoldAllow', 'codexHold:allow'], ['codexHoldDismiss', 'codexHold:dismiss'], ['codexAllowedFolders', 'codexHold:allowed'], ['codexWithdrawFolder', 'codexHold:withdraw']]) {
    assert.match(pre, new RegExp(`${fn}: \\([^)]*\\)[^=]*=> ipcRenderer\\.invoke\\('${ch}'`), fn);
  }
  assert.match(pre, /ipcRenderer\.on\('codexHold:push', listener\);\s*return \(\) => ipcRenderer\.removeListener\('codexHold:push', listener\);/);
});
