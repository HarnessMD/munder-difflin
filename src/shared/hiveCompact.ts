import { GIT_CONFIG_ALLOW, parseConfigList, privateConfigText } from './gitConfigAllow';

/**
 * The reclaim half of the hive repo fix, shipped into `<hive>/bin`.
 *
 * shared/hiveRepo.ts stops the repo TAKING anything more. It cannot give back
 * what is already in history: untracking a file drops it from the index, and
 * every revision of it stays in the pack for ever. A hive that reached 200GB
 * before the fix stays 200GB after it, and git's own auto gc keeps trying to
 * repack the whole thing.
 *
 * Reclaiming means rewriting history, which is destructive in a way an app
 * should never do to a person's repo on its own. So it is a script the person
 * runs, with the app closed, after reading what it will drop. The app only
 * writes it out and says when it looks needed.
 *
 * WHAT IT DROPS, and why that is the safe rule: only the history of paths the
 * hive NO LONGER TRACKS. Everything in the current tree keeps every one of its
 * revisions, so the registry history a session repair reads, the board and the
 * task ledger are all untouched. What goes is exactly the dead weight the ignore
 * rules already decided did not belong: the Codex sqlite, the logs, the
 * node_modules trees, and (0.5.5) the old revisions of agent memory.md and the
 * condense backups, both of which stay on disk.
 */
export const HIVE_COMPACT_SCRIPT = `#!/usr/bin/env node
'use strict';

/* Reclaim the space the hive repo took before it learned not to.
 *
 * Usage, with Munder Difflin CLOSED:
 *   node <hive>/bin/hive-compact.cjs            report only, changes nothing
 *   node <hive>/bin/hive-compact.cjs --yes      do it
 *
 * It rewrites history, so every commit id in the hive repo changes. Nothing
 * outside the hive reads those ids. No file in the working tree is touched.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
// The hive's real path: a hive reached through a link is still the hive, and
// a git that sits inside it is never the one to run.
let REAL_ROOT = ROOT;
try { REAL_ROOT = fs.realpathSync(ROOT); } catch (e) { /* as named */ }
const GO = process.argv.includes('--yes');

// The hive's .git/config can be written by an agent. Git never reads it here:
// it runs on a private copy that holds only the keys on the allow list
// (the same list and the same code as the app's own git,
// src/shared/gitConfigAllow.ts and src/core/gitSafe.ts), with the fixed
// switches on top.
const GIT_CONFIG_ALLOW = ${JSON.stringify(GIT_CONFIG_ALLOW)};
const parseConfigList = ${parseConfigList.toString()};
const privateConfigText = ${privateConfigText.toString()};
const SAFE_GIT = [['core.fsmonitor', 'false'], ['core.hooksPath', process.platform === 'win32' ? path.join(os.tmpdir(), 'md-no-hooks-' + process.pid + '-' + Date.now()) : '/dev/null'],
  ['log.showSignature', 'false'], ['submodule.recurse', 'false'], ['diff.ignoreSubmodules', 'all'], ['safe.bareRepository', 'explicit'], ['maintenance.auto', 'false'], ['gc.autoDetach', 'false'],
  ['core.pager', 'cat'], ['core.askPass', ''], ['credential.helper', ''], ['core.attributesFile', os.devNull]];

/* git by its full path, from the absolute folders of PATH: never one that
 * sits in the hive (on Windows a bare name is looked for in the cwd first). */
function findGit() {
  const win = process.platform === 'win32';
  for (const dir of (process.env.PATH || process.env.Path || '').split(path.delimiter)) {
    if (!dir || !path.isAbsolute(dir)) continue;
    for (const ext of win ? ['.exe', '.com'] : ['']) {
      const p = path.join(dir, 'git' + ext);
      try {
        const st = fs.statSync(p);
        const real = fs.realpathSync(p);
        if (st.isFile() && (win || (st.mode & 0o111) !== 0) && !real.startsWith(REAL_ROOT + path.sep)) return p;
      } catch (e) { /* not here */ }
    }
  }
  return null;
}
const GIT = findGit();

/* Where this script keeps its private folder: beside the hive, in the home
 * folder that holds it, made for this user alone. Not inside the hive and
 * not the system temp folder, which an agent may write. */
let PRIVATE_ROOT = null;
function privateRoot() {
  if (PRIVATE_ROOT) return PRIVATE_ROOT;
  const dir = process.env.MD_GIT_PRIVATE_ROOT || path.resolve(ROOT, '..', '.md-git-private');
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  if (!fs.lstatSync(dir).isDirectory()) die('The private folder is not a folder: ' + dir);
  if (process.platform !== 'win32') fs.chmodSync(dir, 0o700);
  PRIVATE_ROOT = fs.mkdtempSync(path.join(fs.realpathSync(dir), 'md-git-'));
  process.on('exit', () => { try { fs.rmSync(PRIVATE_ROOT, { recursive: true, force: true }); } catch (e) { /* a temp folder */ } });
  return PRIVATE_ROOT;
}
function safeGitEnv(more) {
  const env = {};
  for (const k of Object.keys(process.env)) if (!/^GIT_/i.test(k)) env[k] = process.env[k];
  env.GIT_ALLOW_PROTOCOL = '';
  env.GIT_NO_LAZY_FETCH = '1';
  env.GIT_TERMINAL_PROMPT = '0';
  env.GIT_ASKPASS = '';
  env.GIT_LFS_SKIP_SMUDGE = '1';
  env.GIT_CONFIG_COUNT = String(SAFE_GIT.length);
  SAFE_GIT.forEach((kv, i) => { env['GIT_CONFIG_KEY_' + i] = kv[0]; env['GIT_CONFIG_VALUE_' + i] = kv[1]; });
  env.FILTER_BRANCH_SQUELCH_WARNING = '1';
  return Object.assign(env, more || {});
}

const REAL_GIT = path.join(ROOT, '.git');
let PRIVATE = null;
/* The private folder git runs on: the copy of the config, and links to the
 * real objects and refs. Made once, removed when the script ends. Refuses
 * when .git or its config is not a plain folder and a plain file. */
/* The repository's own exclude rules, read as git reads them: through a
 * link. Not there, or a link to nothing: no rules. An ordinary file: its
 * text. Anything else, one that cannot be opened, or one over 1 MB: the
 * script stops, since carried as empty the files it left out would be taken. */
function excludeRules(file) {
  const no = function () { die('The exclude file of this repository (info/exclude in its .git folder) could not be read, so nothing was run. Replace it with an ordinary file under 1 MB that you can open, then try again.'); };
  const MAX = 1024 * 1024;
  let fd;
  try { fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NONBLOCK || 0)); }
  catch (e) { if (e && e.code === 'ENOENT') return ''; no(); }
  try {
    const st = fs.fstatSync(fd);
    if (!st.isFile() || st.size > MAX) no();
    const buf = Buffer.alloc(MAX + 1);
    let got = 0;
    for (;;) {
      const n = fs.readSync(fd, buf, got, buf.length - got, null);
      if (n <= 0) break;
      got += n;
      if (got > MAX) no();
    }
    return buf.toString('utf8', 0, got);
  } catch (e) { no(); }
  finally { try { fs.closeSync(fd); } catch (e) { /* closed */ } }
}
function privateGitEnv() {
  if (PRIVATE) return PRIVATE.env;
  const plain = (p, what) => { try { const s = fs.lstatSync(p); return what === 'dir' ? s.isDirectory() : s.isFile(); } catch (e) { return false; } };
  const cfg = path.join(REAL_GIT, 'config');
  if (!plain(REAL_GIT, 'dir') || !plain(cfg, 'file') || fs.existsSync(path.join(REAL_GIT, 'commondir'))) die('The .git of this hive is not a plain repository. Nothing was run.');
  if (!GIT) die('git was not found on PATH. Nothing was run.');
  const base = privateRoot();
  const listed = spawnSync(GIT, ['config', '--file', cfg, '--no-includes', '-z', '--list'], { cwd: base, encoding: 'utf8', env: safeGitEnv() });
  if (listed.status !== 0) die('The settings of this repository could not be read. Nothing was run.');
  const common = path.join(base, '.git');
  const win = process.platform === 'win32';
  fs.mkdirSync(common, { mode: 0o700 });
  fs.writeFileSync(path.join(common, 'config'), privateConfigText(parseConfigList(listed.stdout || ''), GIT_CONFIG_ALLOW), { mode: 0o600 });
  for (const name of ['objects', 'refs', 'logs', 'worktrees', 'reftable', 'lfs']) fs.symlinkSync(path.join(REAL_GIT, name), path.join(common, name), 'junction');
  for (const name of ['packed-refs', 'shallow', 'HEAD']) {
    // Only a file that is NOT THERE is left out. One that is there and could not be copied is not "none":
    // git would write a new one in its place, and it would go back over the real file at the end.
    if (win) { try { fs.copyFileSync(path.join(REAL_GIT, name), path.join(common, name)); } catch (e) { if (!e || e.code !== 'ENOENT') die('A file of this repository (' + name + ') could not be copied. Nothing was run.'); } }
    else fs.symlinkSync(path.join(REAL_GIT, name), path.join(common, name), 'file');
  }
  fs.mkdirSync(path.join(common, 'info'));
  fs.writeFileSync(path.join(common, 'info', 'exclude'), excludeRules(path.join(REAL_GIT, 'info', 'exclude')), { mode: 0o600 });
  PRIVATE = { base, common, env: safeGitEnv({ GIT_DIR: REAL_GIT, GIT_COMMON_DIR: common, GIT_WORK_TREE: ROOT }) };
  process.on('exit', () => {
    // Windows: packed-refs was a copy. If git rewrote it, it goes back.
    if (win) { try { fs.copyFileSync(path.join(common, 'packed-refs'), path.join(REAL_GIT, 'packed-refs')); } catch (e) { /* none */ } }
  });
  return PRIVATE.env;
}

function git(args, opts) {
  const res = spawnSync(GIT, args, {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024,
    input: opts && opts.input, stdio: opts && opts.inherit ? 'inherit' : 'pipe',
    env: privateGitEnv()
  });
  return { ok: res.status === 0, out: res.stdout || '', err: res.stderr || '' };
}

function die(msg) { console.error(msg); process.exit(1); }

function human(bytes) {
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0, n = bytes;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return n.toFixed(n >= 10 || i === 0 ? 0 : 1) + ' ' + u[i];
}

function repoBytes() {
  const v = git(['count-objects', '-v']);
  let total = 0;
  for (const line of v.out.split('\\n')) {
    const m = /^(size|size-pack|size-garbage): (\\d+)$/.exec(line.trim());
    if (m) total += Number(m[2]) * 1024;
  }
  return total;
}

/* The app holds this socket open while it runs. A rewrite underneath a live
 * committer would race the index and could lose a commit, so this is a refusal
 * and not a warning. The file surviving a crash is why we connect instead of
 * checking that it exists. */
function appearsRunning() {
  // A hive too deep for a socket keeps it in the temp folder (core/hookSockPlace.ts).
  const name = 'md-hive-' + require('crypto').createHash('sha256').update(ROOT).digest('hex').slice(0, 16);
  return [path.join(ROOT, 'hooks.sock'), path.join(require('os').tmpdir(), name, 'hooks.sock'), path.join('/tmp', name, 'hooks.sock')].some(socketAnswers);
}

function socketAnswers(sock) {
  if (!fs.existsSync(sock)) return false;
  const probe = spawnSync(process.execPath, ['-e', [
    'const net=require("net");const s=net.connect(process.argv[1]);',
    's.on("connect",()=>{s.destroy();process.exit(7)});',
    's.on("error",()=>process.exit(0));',
    'setTimeout(()=>{s.destroy();process.exit(0)},1500);'
  ].join('')  , sock], { timeout: 4000 });
  return probe.status === 7;
}

if (!fs.existsSync(path.join(ROOT, '.git'))) die('No git repo at ' + ROOT);
if (appearsRunning()) die('Munder Difflin is running. Quit it first: this rewrites the hive history.');

const before = repoBytes();
console.log('hive: ' + ROOT);
console.log('repo: ' + human(before));

/* Every path that has ever had a blob, with what its blobs weigh in the pack. */
const rev = git(['rev-list', '--objects', '--all']);
if (!rev.ok) die('git rev-list failed: ' + rev.err);
const check = git(['cat-file', '--batch-check=%(objecttype) %(objectsize:disk) %(rest)'], { input: rev.out });
if (!check.ok) die('git cat-file failed: ' + check.err);

const weight = new Map();
for (const line of check.out.split('\\n')) {
  const sp = line.indexOf(' ');
  if (sp < 0 || line.slice(0, sp) !== 'blob') continue;
  const rest = line.slice(sp + 1);
  const sp2 = rest.indexOf(' ');
  if (sp2 < 0) continue;
  const size = Number(rest.slice(0, sp2));
  const file = rest.slice(sp2 + 1);
  if (!file) continue;
  weight.set(file, (weight.get(file) || 0) + size);
}

/* Anything the hive still tracks keeps all of its history. */
const live = new Set(git(['ls-files', '-z']).out.split('\\0').filter(Boolean));
const dead = [...weight.entries()].filter(([p]) => !live.has(p)).sort((a, b) => b[1] - a[1]);
const reclaim = dead.reduce((n, [, s]) => n + s, 0);

if (dead.length === 0) { console.log('Nothing to compact: every path in history is still tracked.'); process.exit(0); }

console.log('');
console.log(dead.length + ' path(s) no longer tracked, holding ' + human(reclaim) + ' of packed history:');
for (const [p, s] of dead.slice(0, 15)) console.log('  ' + human(s).padStart(8) + '  ' + p);
if (dead.length > 15) console.log('  ... and ' + (dead.length - 15) + ' more');
console.log('');
console.log('Their files stay on disk. Only their history goes.');

if (!GO) {
  console.log('');
  console.log('This was a report. Run again with --yes to rewrite.');
  process.exit(0);
}

const listFile = path.join(privateRoot(), 'compact.paths');
fs.writeFileSync(listFile, dead.map(([p]) => ':(literal)' + p).join('\\0') + '\\0');

console.log('');
console.log('Rewriting. This walks every commit and takes minutes on a large hive.');
const filter = 'git rm --cached -q --ignore-unmatch --pathspec-from-file=' + JSON.stringify(listFile) + ' --pathspec-file-nul';
const rewrite = git(['filter-branch', '-f', '--index-filter', filter, '--prune-empty', '--tag-name-filter', 'cat', '--', '--all'], { inherit: true });
fs.unlinkSync(listFile);
if (!rewrite.ok) die('filter-branch failed. The repo is unchanged apart from .git/refs/original, which you can delete.');

fs.rmSync(path.join(ROOT, '.git', 'refs', 'original'), { recursive: true, force: true });
git(['reflog', 'expire', '--expire=now', '--expire-unreachable=now', '--all']);
/* Bounded on purpose: an unbounded repack of a hive this size is what took
 * 22GB of RAM and swapped a machine. Slower here, and it finishes. */
git(['-c', 'pack.windowMemory=128m', '-c', 'pack.packSizeLimit=1g', '-c', 'pack.threads=1',
     'gc', '--prune=now'], { inherit: true });

const after = repoBytes();
console.log('');
console.log('repo: ' + human(before) + ' -> ' + human(after) + '  (' + human(Math.max(0, before - after)) + ' reclaimed)');
console.log('Every file in the hive is still on disk. Open the app again when ready.');
`;
