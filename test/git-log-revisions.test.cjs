'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const loadTs = require('./load-ts.cjs');
const { getLog, getLogGraph, getCommitFiles, getFileAtRev, isSafeRev } = loadTs('src/main/git.ts');
const { layoutGraph } = loadTs('src/renderer/src/components/git/graph.ts');

function repository(t) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'md git log '));
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
  const hooks = path.join(cwd, 'empty-hooks');
  fs.mkdirSync(hooks);
  const git = (...args) => execFileSync('git', [
    '-c', 'user.name=Fixture Author', '-c', 'user.email=fixture@example.invalid',
    '-c', 'commit.gpgsign=false', '-c', `core.hooksPath=${hooks}`, ...args
  ], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git('init', '-b', 'main');
  const revisions = [];
  for (let i = 0; i < 3; i++) {
    fs.writeFileSync(path.join(cwd, 'read me.txt'), `version ${i}\n`);
    git('add', '--', 'read me.txt');
    git('commit', '-m', `revision ${i}`);
    revisions.push(git('rev-parse', 'HEAD'));
  }
  return { cwd, git, revisions };
}

test('every getLog row has the canonical full and short revision ids from real Git', async t => {
  const { cwd, revisions } = repository(t);
  const commits = await getLog(cwd, 10);
  assert.ok(Array.isArray(commits));
  assert.deepEqual(commits.map(c => c.sha), revisions.slice().reverse());
  assert.deepEqual(commits.map(c => c.shortSha), revisions.slice().reverse().map(sha => sha.slice(0, 7)));
  assert.deepEqual(commits.map(c => c.subject), ['revision 2', 'revision 1', 'revision 0']);
  assert.ok(commits.every(c => c.author === 'Fixture Author'));
});

test('getLog parent ids match returned rows so the agent Git graph can connect them', async t => {
  const { cwd } = repository(t);
  const commits = await getLog(cwd, 10);
  assert.ok(Array.isArray(commits));
  assert.deepEqual(commits[0].parents, [commits[1].sha]);
  assert.deepEqual(commits[1].parents, [commits[2].sha]);
  assert.deepEqual(commits[2].parents, []);
});

test('a real linear getLog result stays in one lane in the agent Git graph', async t => {
  const { cwd } = repository(t);
  const commits = await getLog(cwd, 10);
  assert.ok(Array.isArray(commits));
  const graph = layoutGraph(commits);
  assert.deepEqual(graph.rows.map(row => row.lane), [0, 0, 0]);
  assert.equal(graph.maxLane, 0);
});

test('every getLog revision is usable by the commit file API, including non-first rows', async t => {
  const { cwd } = repository(t);
  const commits = await getLog(cwd, 10);
  assert.ok(Array.isArray(commits));
  for (const commit of commits) {
    assert.equal(isSafeRev(commit.sha), true, `invalid revision: ${JSON.stringify(commit.sha)}`);
    const files = await getCommitFiles(cwd, commit.sha);
    assert.ok(Array.isArray(files), `${JSON.stringify(commit.sha)}: ${JSON.stringify(files)}`);
    assert.deepEqual(files.map(f => f.path), ['read me.txt']);
  }
});

test('every getLog revision opens its exact historical file content', async t => {
  const { cwd } = repository(t);
  const commits = await getLog(cwd, 10);
  assert.ok(Array.isArray(commits));
  for (const [i, commit] of commits.entries()) {
    const file = await getFileAtRev(cwd, commit.sha, 'read me.txt');
    assert.equal(file.ok, true, JSON.stringify(file));
    assert.equal(file.exists, true);
    assert.equal(file.content, `version ${2 - i}\n`);
  }
});

test('linear getLog and getLogGraph agree on complete commit metadata', async t => {
  const { cwd } = repository(t);
  assert.deepEqual(await getLog(cwd, 10), await getLogGraph(cwd, 10));
});

test('multi-branch merge history keeps canonical ids, parents and decorations', async t => {
  const { cwd, git, revisions } = repository(t);
  git('checkout', '-b', 'feature');
  fs.writeFileSync(path.join(cwd, 'side.txt'), 'side branch\n');
  git('add', '--', 'side.txt'); git('commit', '-m', 'side branch');
  const side = git('rev-parse', 'HEAD');
  git('tag', 'side-tag');
  git('checkout', 'main');
  fs.writeFileSync(path.join(cwd, 'main.txt'), 'main branch\n');
  git('add', '--', 'main.txt'); git('commit', '-m', 'main branch');
  const main = git('rev-parse', 'HEAD');
  git('merge', '--no-ff', 'feature', '-m', 'merge feature');
  const merge = git('rev-parse', 'HEAD');
  const commits = await getLog(cwd, 20);
  assert.ok(Array.isArray(commits));
  assert.deepEqual(new Set(commits.map(c => c.sha)), new Set([...revisions, side, main, merge]));
  assert.deepEqual(commits.find(c => c.sha === merge).parents, [main, side]);
  assert.ok(commits.find(c => c.sha === side).refs.includes('tag: side-tag'));
  assert.ok(commits.find(c => c.sha === merge).refs.includes('HEAD -> main'));
});

test('limited and empty log results do not add rows or corrupt hashes', async t => {
  const { cwd, revisions } = repository(t);
  const one = await getLog(cwd, 1);
  assert.ok(Array.isArray(one));
  assert.equal(one.length, 1);
  assert.equal(one[0].sha, revisions[2]);
  const two = await getLog(cwd, 2);
  assert.deepEqual(two.map(c => c.sha), [revisions[2], revisions[1]]);
  assert.deepEqual(await getLog(cwd, 0), []);
});
