/**
 * The worktree list and its delete (0.5.3, feature 24, the founder's request).
 *
 * Worktrees quietly eat disk, and until now the only way to remove one was a raw
 * git command mailed to the orchestrator. Tests 1 to 3 are the pure rule. Tests
 * 4 to 10 use a REAL repository, real git and a real disk, because this is a
 * delete button over somebody's work.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const loadTs = require('./load-ts.cjs');

const rule = loadTs('src/shared/worktreeList.ts');
const admin = loadTs('src/main/worktreeAdmin.ts');

const git = (cwd, ...args) => execFileSync('git', args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] }).toString();
function floor() {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'md-wt-')));
  const repo = path.join(base, 'repo');
  fs.mkdirSync(repo);
  git(repo, 'init', '-q', '-b', 'main');
  git(repo, 'config', 'user.email', 't@example.com'); git(repo, 'config', 'user.name', 'T');
  fs.writeFileSync(path.join(repo, 'a.txt'), 'one\n');
  fs.writeFileSync(path.join(repo, '.gitignore'), 'node_modules/\n');
  fs.mkdirSync(path.join(repo, 'node_modules')); fs.writeFileSync(path.join(repo, 'node_modules', 'x.js'), Buffer.alloc(5 * 1024 * 1024));
  git(repo, 'add', 'a.txt', '.gitignore'); git(repo, 'commit', '-q', '-m', 'first');
  const root = path.join(base, 'home', 'worktrees');
  fs.mkdirSync(root, { recursive: true });
  const add = (name) => {
    const wt = path.join(root, name);
    git(repo, 'worktree', 'add', '-q', '-b', `agent/${name}`, wt, 'main');
    fs.symlinkSync(path.join(repo, 'node_modules'), path.join(wt, 'node_modules'));
    return wt;
  };
  return { base, repo, root, add, ctx: (liveCwds = []) => ({ roots: [root], liveCwds }), done: () => fs.rmSync(base, { recursive: true, force: true }) };
}
const clean = { base: null, known: true, uncommitted: 0, unmerged: 0 };

test('1. the rule, in order: where it is, who is in it, what is in it', () => {
  const ok = { underRoot: true, live: false, isWorktree: true, work: clean };
  assert.deepEqual(rule.worktreeDeleteVerdict(ok, false), { ok: true });
  assert.equal(rule.worktreeDeleteVerdict({ ...ok, underRoot: false }, true).code, 'outside');
  assert.equal(rule.worktreeDeleteVerdict({ ...ok, live: true }, true).code, 'live', 'a yes from the person must never remove a running agent\'s folder');
  assert.equal(rule.worktreeDeleteVerdict({ ...ok, isWorktree: false }, true).code, 'not-a-worktree');
  for (const work of [{ ...clean, uncommitted: 1 }, { ...clean, unmerged: 2 }, { ...clean, known: false }]) {
    assert.equal(rule.worktreeDeleteVerdict({ ...ok, work }, false).code, 'needs-confirm');
    assert.deepEqual(rule.worktreeDeleteVerdict({ ...ok, work }, true), { ok: true });
  }
});

test('2. a folder is inside itself and its children, never inside a sibling with the same prefix', () => {
  assert.equal(rule.isSameOrInside('/w/agent-1', '/w/agent-1', '/'), true);
  assert.equal(rule.isSameOrInside('/w/agent-1', '/w/agent-1/src', '/'), true);
  assert.equal(rule.isSameOrInside('/w/agent-1', '/w/agent-10', '/'), false);
  assert.equal(rule.isSameOrInside('', '/w', '/'), false);
});

test('3. sizes read as a person says them, ages are whole days, removable rows come first', () => {
  assert.equal(rule.worktreeSizeLabel(812), '812 B');
  assert.equal(rule.worktreeSizeLabel(1.4 * 1024 ** 3), '1.4 GB');
  assert.equal(rule.worktreeSizeLabel(240 * 1024 ** 2), '240 MB');
  assert.equal(rule.worktreeSizeLabel(-1), '');
  assert.equal(rule.worktreeAgeDays(1000, 1000 + 3 * 86_400_000 + 5), 3);
  assert.equal(rule.worktreeAgeDays(0, 5), null);
  const row = (name, o) => ({ path: name, name, projectRoot: '/r', branch: 'b', createdAt: 5, live: false, ...o });
  const names = rule.sortWorktreeRows([row('live', { live: true, createdAt: 1 }), row('new', {}), row('old', { createdAt: 2 })]).map(r => r.name);
  assert.deepEqual(names, ['old', 'new', 'live']);
});

test('4. LIST reads the disk only: project, branch and age for every folder, and no git process was needed', async () => {
  const f = floor();
  const PATH = process.env.PATH;
  try {
    const a = f.add('clean-one'); f.add('other');
    git(a, 'checkout', '-q', '--detach');
    process.env.PATH = ''; // the list must not need git: 46 real worktrees took over two minutes when it did
    const rows = await admin.listOwnedWorktrees(f.ctx());
    process.env.PATH = PATH;
    const by = Object.fromEntries(rows.map(r => [r.name, r]));
    assert.deepEqual(Object.keys(by).sort(), ['clean-one', 'other']);
    assert.equal(by.other.projectRoot, f.repo);
    assert.equal(by.other.branch, 'agent/other');
    assert.equal(by['clean-one'].branch, null, 'detached');
    assert.ok(by.other.createdAt > 0);
    assert.equal(by.other.live, false);
  } finally { process.env.PATH = PATH; f.done(); }
});

test('4b. WORK, per row: the two kinds counted apart, our own dependency link is not work, and no base is guessed', async () => {
  const f = floor();
  try {
    const a = f.add('clean-one'); const b = f.add('dirty-one'); const c = f.add('ahead-one'); const d = f.add('pushed-one');
    fs.writeFileSync(path.join(b, 'a.txt'), 'one\nedit\n'); fs.writeFileSync(path.join(b, 'new.txt'), 'n');
    for (const w of [c, d]) { fs.writeFileSync(path.join(w, 'c.txt'), w); git(w, 'add', 'c.txt'); git(w, 'commit', '-q', '-m', 'work'); }
    git(f.repo, 'branch', 'somewhere-else', 'agent/pushed-one');
    // The project moves to a branch far from where the agents started. A guessed
    // base ("whatever is checked out now") read every real row as hundreds unmerged.
    git(f.repo, 'checkout', '-q', '--orphan', 'docs'); git(f.repo, 'commit', '-q', '--allow-empty', '-m', 'docs');
    // One broken ref name (a Finder duplicate) must not make every row unknown.
    fs.copyFileSync(path.join(f.repo, '.git', 'refs', 'heads', 'docs'), path.join(f.repo, '.git', 'refs', 'heads', 'docs 2'));
    const work = async (p, ctx = f.ctx()) => { const w = await admin.worktreeWork(p, ctx); return [w.base, w.known, w.uncommitted, w.unmerged]; };
    assert.deepEqual(await work(a), [null, true, 0, 0]);
    assert.deepEqual(await work(b), [null, true, 2, 0]);
    assert.deepEqual(await work(c), [null, true, 0, 1], 'one commit that is on no other branch');
    assert.deepEqual(await work(d), [null, true, 0, 0], 'the same commit is on another branch, so nothing is only here');
    assert.deepEqual(await work(d, { ...f.ctx(), baseFor: () => 'main' }), ['main', true, 0, 1], 'a remembered base is used as is');
    assert.ok(fs.lstatSync(path.join(a, 'node_modules')).isSymbolicLink(), 'asking must not unlink a folder\'s dependencies');
    assert.equal(await admin.worktreeWork(f.repo, f.ctx()), null, 'not in the list');
  } finally { f.done(); }
});

test('5. DELETE a clean one: folder gone, git registration gone, the project untouched', async () => {
  const f = floor();
  try {
    const wt = f.add('clean-one');
    assert.deepEqual(await admin.removeOwnedWorktree(wt, false, f.ctx()), { ok: true });
    assert.equal(fs.existsSync(wt), false);
    assert.ok(!git(f.repo, 'worktree', 'list').includes('clean-one'));
    assert.ok(fs.existsSync(path.join(f.repo, 'node_modules', 'x.js')), 'removing the link must not remove the project\'s dependencies');
  } finally { f.done(); }
});

test('6. DELETE one holding work: refused until confirmed, and the refusal leaves everything in place', async () => {
  const f = floor();
  try {
    const wt = f.add('dirty-one');
    fs.writeFileSync(path.join(wt, 'new.txt'), 'half an edit');
    const no = await admin.removeOwnedWorktree(wt, false, f.ctx());
    assert.equal(no.ok, false); assert.equal(no.code, 'needs-confirm'); assert.equal(no.work.uncommitted, 1);
    assert.equal(fs.readFileSync(path.join(wt, 'new.txt'), 'utf8'), 'half an edit');
    assert.ok(fs.lstatSync(path.join(wt, 'node_modules')).isSymbolicLink());
    assert.deepEqual(await admin.removeOwnedWorktree(wt, true, f.ctx()), { ok: true });
    assert.equal(fs.existsSync(wt), false);
  } finally { f.done(); }
});

test('7. unmerged commits are warned about, and they SURVIVE the delete on their branch', async () => {
  const f = floor();
  try {
    const wt = f.add('ahead-one');
    fs.writeFileSync(path.join(wt, 'c.txt'), 'c'); git(wt, 'add', 'c.txt'); git(wt, 'commit', '-q', '-m', 'work');
    assert.equal((await admin.removeOwnedWorktree(wt, false, f.ctx())).code, 'needs-confirm');
    assert.deepEqual(await admin.removeOwnedWorktree(wt, true, f.ctx()), { ok: true });
    assert.equal(git(f.repo, 'log', '--format=%s', '-1', 'agent/ahead-one').trim(), 'work');
  } finally { f.done(); }
});

test('8. a LIVE agent\'s folder cannot be removed, confirmed or not, from its root or from inside it', async () => {
  const f = floor();
  try {
    const wt = f.add('busy-one');
    fs.mkdirSync(path.join(wt, 'src'));
    for (const cwd of [wt, path.join(wt, 'src')]) {
      const rows = await admin.listOwnedWorktrees(f.ctx([cwd]));
      assert.equal(rows[0].live, true);
      const r = await admin.removeOwnedWorktree(wt, true, f.ctx([cwd]));
      assert.equal(r.code, 'live');
      assert.ok(fs.existsSync(path.join(wt, 'a.txt')));
    }
    // A neighbour whose name starts the same is not this folder.
    assert.equal((await admin.listOwnedWorktrees(f.ctx([wt + '0'])))[0].live, false);
  } finally { f.done(); }
});

test('9. nothing outside the roots: not the project, not a hand made worktree, not a path that climbs out', async () => {
  const f = floor();
  try {
    f.add('in-root'); fs.mkdirSync(path.join(f.root, '.claude')); // a tool's folder is not a row
    const mine = path.join(f.base, 'my-own-worktree');
    git(f.repo, 'worktree', 'add', '-q', '-b', 'mine', mine, 'main');
    for (const p of [f.repo, mine, path.join(f.root, '..', '..', 'repo'), f.root, path.join(f.root, 'in-root', 'src')]) {
      const r = await admin.removeOwnedWorktree(p, true, f.ctx());
      assert.equal(r.code, 'outside', p);
      assert.equal(await admin.worktreeSize(p, [f.root]), null, p);
    }
    assert.ok(fs.existsSync(path.join(mine, 'a.txt'))); assert.ok(fs.existsSync(path.join(f.repo, 'a.txt')));
    assert.deepEqual((await admin.listOwnedWorktrees(f.ctx())).map(r => r.name), ['in-root']);
  } finally { f.done(); }
});

test('10. a folder git does not know is LISTED and never deletable; size counts the link, not what it points at', async () => {
  const f = floor();
  try {
    const stray = path.join(f.root, 'stray'); fs.mkdirSync(stray); fs.writeFileSync(path.join(stray, 'big.bin'), Buffer.alloc(3 * 1024 * 1024, 1));
    const wt = f.add('sized');
    const row = (await admin.listOwnedWorktrees(f.ctx())).find(r => r.name === 'stray');
    assert.equal(row.projectRoot, null);
    assert.equal(await admin.worktreeWork(stray, f.ctx()), null);
    assert.equal((await admin.removeOwnedWorktree(stray, true, f.ctx())).code, 'not-a-worktree');
    assert.ok(fs.existsSync(path.join(stray, 'big.bin')));
    const MB = 1024 * 1024;
    const straySize = await admin.worktreeSize(stray, [f.root]);
    assert.ok(straySize >= 3 * MB && straySize < 4 * MB, `got ${straySize}`);
    const size = await admin.worktreeSize(wt, [f.root]);
    assert.ok(size > 0 && size < MB, `the project's 5 MB node_modules is not this folder's to free, got ${size}`);
  } finally { f.done(); }
});

test('11. what a row says: the sentence is chosen by count, a remembered base is named, unknown is a risk', () => {
  const keys = (w) => rule.worktreeWorkLines({ base: null, known: true, uncommitted: 0, unmerged: 0, ...w }).map(l => l.key);
  assert.deepEqual(keys({}), ['clean']);
  assert.deepEqual(keys({ uncommitted: 1 }), ['uncommittedOne']);
  assert.deepEqual(keys({ uncommitted: 2, unmerged: 1 }), ['uncommittedMany', 'onlyHereOne']);
  assert.deepEqual(keys({ unmerged: 4, base: 'main' }), ['notInBaseMany']);
  assert.deepEqual(keys({ known: false, uncommitted: 9 }), ['unknown']);
  assert.equal(rule.worktreeWorkLines({ base: null, known: false, uncommitted: 0, unmerged: 0 })[0].risky, true);
  assert.deepEqual(rule.worktreeAgeLine(1000, 1000 + 86_400_000), { key: 'ageOne', count: 1 });
  assert.equal(rule.worktreeAgeLine(1000, 2000).key, 'ageToday');
});

test('12. the wiring: one panel in the one Settings form, the delete cannot be clicked for a running agent, and every sentence exists in all three languages', () => {
  const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
  const settings = read('src/renderer/src/components/SettingsModal.tsx');
  assert.match(settings, /activeSection === 'General' && \(\s*<>\s*<WorktreesPanel chrome=\{chrome\} \/>/);
  const panel = read('src/renderer/src/components/WorktreesPanel.tsx');
  assert.match(panel, /disabled=\{row\.live \|\| notWorktree \|\|/);
  // `confirmed` is true only when the warning on screen named work that will be lost.
  assert.match(panel, /onClick=\{\(\) => void remove\(row, risky\)\}/);
  assert.doesNotMatch(panel, /removeOwnedWorktree\([^)]*true\)/);
  const main = read('src/main/index.ts');
  assert.match(main, /liveCwds: \[\.\.\.ptyManager\.list\(\)\.map\(t => t\.cwd\), \.\.\.worktreePaths\.values\(\)\]/);
  assert.match(main, /removeOwnedWorktree\(wtPath, confirmed === true, worktreeAdminContext\(\)\)/);
  const used = new Set([...panel.matchAll(/'settings\.worktrees\.([A-Za-z.]+)'/g)].map(m => m[1]));
  for (const k of ['clean', 'unknown', 'uncommittedOne', 'uncommittedMany', 'notInBaseOne', 'notInBaseMany', 'onlyHereOne', 'onlyHereMany', 'ageToday', 'ageOne', 'ageMany']) used.add(k);
  assert.ok(used.size > 30);
  const en = JSON.parse(read('src/renderer/src/i18n/locales/en.json')).settings.worktrees;
  for (const lang of ['en', 'zh-CN', 'ar']) {
    const loc = JSON.parse(read(`src/renderer/src/i18n/locales/${lang}.json`)).settings.worktrees;
    for (const k of used) {
      const v = k.split('.').reduce((o, p) => o && o[p], loc);
      assert.equal(typeof v, 'string', `${lang} is missing settings.worktrees.${k}`);
      assert.doesNotMatch(v, /[‒-―]| - /, `${lang} ${k} has a dash`);
      const vars = (x) => [...x.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]).sort().join();
      assert.equal(vars(v), vars(k.split('.').reduce((o, p) => o[p], en)), `${lang} ${k} names different values`);
    }
    assert.ok(!Object.keys(loc).some(k => /_one$|_other$/.test(k)), 'no plural keys, the sentence is chosen in code');
  }
});
