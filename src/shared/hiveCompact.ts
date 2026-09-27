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
 * revisions, so the registry history a session repair reads, the memory files,
 * the board and the task ledger are all untouched. What goes is exactly the
 * dead weight the ignore rules already decided did not belong: the Codex
 * sqlite, the logs, the node_modules trees.
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
const GO = process.argv.includes('--yes');

function git(args, opts) {
  const res = spawnSync('git', args, {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024,
    input: opts && opts.input, stdio: opts && opts.inherit ? 'inherit' : 'pipe',
    env: Object.assign({}, process.env, { FILTER_BRANCH_SQUELCH_WARNING: '1' })
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
  const sock = path.join(ROOT, 'hooks.sock');
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

const listFile = path.join(os.tmpdir(), 'hive-compact-' + process.pid + '.paths');
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
