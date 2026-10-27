'use strict';

// Removing a worktree never deletes through a link: every link inside goes first, as a link,
// and what it points to stays. A path that is not a linked worktree of the repository, or a link
// that cannot be removed, refuses the removal with nothing deleted. A refusal is logged once.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const loadTs = require(path.join(ROOT, 'test/load-ts.cjs'));
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const G = loadTs('src/main/git.ts');

const git = (cwd, ...a) => execFileSync('git', a, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
function repo(t) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'md-wt-links-')));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const main = path.join(dir, 'main');
  fs.mkdirSync(main);
  git(main, 'init', '-q');
  git(main, 'config', 'user.email', 't@example.com');
  git(main, 'config', 'user.name', 'T');
  fs.writeFileSync(path.join(main, 'a.txt'), 'a');
  git(main, 'add', 'a.txt');
  git(main, 'commit', '-qm', 'a');
  const shared = path.join(dir, 'shared');
  fs.mkdirSync(shared);
  fs.writeFileSync(path.join(shared, 'keep.txt'), 'keep');
  const add = (name) => { const wt = path.join(dir, name); git(main, 'worktree', 'add', '-q', '-b', name, wt); return wt; };
  return { dir, main, shared, add, listed: () => git(main, 'worktree', 'list', '--porcelain') };
}

test('a worktree with links inside is removed; each link goes as a link and what it points to stays', async (t) => {
  const r = repo(t);
  const wt = r.add('w1');
  fs.symlinkSync(r.shared, path.join(wt, 'node_modules'), 'dir');
  fs.mkdirSync(path.join(wt, 'deep', 'er'), { recursive: true });
  fs.symlinkSync(path.join(r.shared, 'keep.txt'), path.join(wt, 'deep', 'er', 'file-link'));
  fs.symlinkSync(path.join(r.dir, 'nowhere'), path.join(wt, 'dangling'));
  const out = await G.removeWorktree(r.main, wt);
  assert.deepEqual(out, { ok: true, linksRemoved: 3 });
  assert.equal(fs.existsSync(wt), false);
  assert.equal(fs.readFileSync(path.join(r.shared, 'keep.txt'), 'utf8'), 'keep', 'the linked folder and its file stay');
  assert.ok(!r.listed().includes(wt));
});

test('refused, nothing touched: the main checkout, a plain folder, a file, a path that is itself a link', async (t) => {
  const r = repo(t);
  const wt = r.add('w2');
  const plain = path.join(r.dir, 'plain');
  fs.mkdirSync(plain);
  fs.writeFileSync(path.join(plain, 'x.txt'), 'x');
  const link = path.join(r.dir, 'link-to-w2');
  fs.symlinkSync(wt, link, 'dir');
  const cases = [[r.main, /git does not list it as a linked worktree/], [plain, /git does not list it as a linked worktree/], [path.join(plain, 'x.txt'), /it is not a folder/], [link, /it is itself a link/]];
  for (const [p, why] of cases) {
    const out = await G.removeWorktree(r.main, p);
    assert.equal(out.ok, false, p);
    assert.equal(out.refused, true, p);
    assert.equal(out.linksRemoved, 0);
    assert.match(out.error, why, p);
    assert.match(out.error, /nothing was touched$/);
  }
  assert.ok(fs.existsSync(path.join(r.main, 'a.txt')));
  assert.ok(fs.existsSync(path.join(plain, 'x.txt')));
  assert.ok(fs.existsSync(path.join(wt, 'a.txt')), 'the worktree behind the link stays');
  assert.ok(r.listed().includes(wt));
});

test('a link that cannot be removed refuses the removal: the count of links removed, no file deleted, git never run', async (t) => {
  const r = repo(t);
  const wt = r.add('w3');
  fs.symlinkSync(r.shared, path.join(wt, 'l1'), 'dir');
  fs.symlinkSync(r.shared, path.join(wt, 'l2'), 'dir');
  let n = 0;
  const ops = {
    unlink: async (p) => { if (n++ === 0) return fs.promises.unlink(p); throw Object.assign(new Error('EPERM: busy'), { code: 'EPERM' }); },
    rmdir: async () => { throw Object.assign(new Error('EPERM: busy'), { code: 'EPERM' }); }
  };
  const out = await G.removeWorktree(r.main, wt, ops);
  assert.equal(out.ok, false);
  assert.equal(out.refused, true);
  assert.equal(out.linksRemoved, 1);
  assert.match(out.error, /^refused: 1 link\(s\) removed as links, but 1 link\(s\) or folder\(s\) inside could not be removed or read/);
  assert.match(out.error, /no file or folder was deleted$/);
  assert.ok(fs.existsSync(path.join(wt, 'a.txt')), 'the worktree is still there');
  assert.ok(r.listed().includes(wt), 'git was not asked to remove it');
  assert.ok(fs.existsSync(path.join(r.shared, 'keep.txt')));
});

test('unlinkLinksUnder: a link unlink refuses goes by a plain rmdir (a junction); an unreadable folder is a failure, a vanished one is not', async (t) => {
  const r = repo(t);
  const root = path.join(r.dir, 'tree');
  fs.mkdirSync(path.join(root, 'sub'), { recursive: true });
  fs.symlinkSync(r.shared, path.join(root, 'j1'), 'dir');
  fs.symlinkSync(r.shared, path.join(root, 'sub', 'j2'), 'dir');
  const viaRmdir = await G.unlinkLinksUnder(root, {
    unlink: async () => { throw Object.assign(new Error('EPERM'), { code: 'EPERM' }); },
    rmdir: async (p) => fs.promises.unlink(p)
  });
  assert.deepEqual(viaRmdir, { removed: 2, failed: [] });
  assert.ok(fs.existsSync(path.join(r.shared, 'keep.txt')));
  const ops = { unlink: async () => {}, rmdir: async () => {} };
  const blocked = await G.unlinkLinksUnder(root, { ...ops, readdir: async (p) => { if (p.endsWith('sub')) throw Object.assign(new Error('EACCES: no'), { code: 'EACCES' }); return fs.promises.readdir(p); } });
  assert.deepEqual(blocked.failed.map((f) => path.basename(f.path)), ['sub']);
  const vanished = await G.unlinkLinksUnder(root, { ...ops, readdir: async (p) => { if (p.endsWith('sub')) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' }); return fs.promises.readdir(p); } });
  assert.deepEqual(vanished.failed, []);
});

test('a path already gone is left to git, as before; wiring: a refusal is logged once and the cleanup does not retry it', async (t) => {
  const r = repo(t);
  const out = await G.removeWorktree(r.main, path.join(r.dir, 'never-there'));
  assert.equal(out.refused, undefined);
  assert.equal(out.ok, false);
  const main = read('src/main/index.ts');
  assert.match(main, /if \(refusedWorktrees\.has\(wtPath\)\) return;\s*refusedWorktrees\.add\(wtPath\);\s*try \{ hive\.appendLog\(\{ kind: 'worktree-removal-refused', path: wtPath, error \}\); \}/);
  assert.match(main, /if \(refusedWorktrees\.has\(e\.wtPath\)\) continue;/);
  const calls = (main.match(/removeWorktree\(/g) ?? []).length;
  const noted = (main.match(/if \(r\.refused\) noteRemovalRefused\(/g) ?? []).length;
  assert.ok(calls >= 3);
  assert.equal(noted, calls, 'every removal the cleanup makes notes a refusal');
});
