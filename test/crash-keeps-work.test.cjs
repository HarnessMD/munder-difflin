/**
 * A crashed agent keeps its uncommitted work (0.5.3; found by Creed building
 * the crashed agent row, confirmed in src/main/index.ts teardownPty).
 *
 * A temp's worktree was checked before removal. A normal agent's was removed
 * with `git worktree remove --force` on every route, a crash included, so an
 * agent that died halfway through an edit lost the edit. With the new Restart
 * button a person would restart it and find the folder gone.
 *
 * Tests 2 to 5 use a REAL repository and real git, because this is a rule about
 * deleting somebody's work and it should have run before it ships.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const loadTs = require('./load-ts.cjs');

const { normalAgentWorktreeFate, reasonFromRenderer } = loadTs('src/shared/worktreeFate.ts');
const { finalizeAgentWorktree } = loadTs('src/main/agentWorktree.ts');

const git = (cwd, ...args) => execFileSync('git', args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] }).toString();
function repoWithWorktree() {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'md-crash-')));
  const repo = path.join(base, 'repo');
  fs.mkdirSync(repo);
  git(repo, 'init', '-q', '-b', 'main');
  git(repo, 'config', 'user.email', 't@example.com'); git(repo, 'config', 'user.name', 'T');
  fs.writeFileSync(path.join(repo, 'a.txt'), 'one\n');
  fs.mkdirSync(path.join(repo, 'node_modules')); fs.writeFileSync(path.join(repo, 'node_modules', 'x.js'), '');
  fs.writeFileSync(path.join(repo, '.gitignore'), '');
  git(repo, 'add', 'a.txt', '.gitignore'); git(repo, 'commit', '-q', '-m', 'first');
  const wt = path.join(base, 'worktrees', 'agent-1');
  git(repo, 'worktree', 'add', '-q', '-b', 'agent-1', wt, 'main');
  fs.symlinkSync(path.join(repo, 'node_modules'), path.join(wt, 'node_modules'));
  return { base, repo, wt, done: () => fs.rmSync(base, { recursive: true, force: true }) };
}

test('1. the rule, every reason: only a person stopping THIS agent removes a dirty tree', () => {
  const dirty = { dirty: true, known: true }, clean = { dirty: false, known: true }, unknown = { dirty: false, known: false };
  assert.equal(normalAgentWorktreeFate('person', dirty), 'remove');
  for (const r of ['restart', 'revive']) {
    assert.equal(normalAgentWorktreeFate(r, dirty), 'keep');
    assert.equal(normalAgentWorktreeFate(r, clean), 'keep', `${r}: the agent is about to be started IN this folder, clean or not`);
  }
  for (const r of ['exit', 'guardrail', 'sweep']) {
    assert.equal(normalAgentWorktreeFate(r, dirty), 'keep', `${r} deleted uncommitted work nobody chose to discard`);
    assert.equal(normalAgentWorktreeFate(r, clean), 'remove', `${r}: a clean tree is removed, or disks fill`);
    assert.equal(normalAgentWorktreeFate(r, unknown), 'keep', `${r}: an unknown is not a no`);
  }
  assert.equal(normalAgentWorktreeFate('worker', clean), 'keep', 'never reached, and fails safe if it ever is');
  // The renderer can only make a kill SAFER. Anything it invents is a person.
  assert.deepEqual(['restart', 'revive', 'sweep', 'exit', 'guardrail', 'worker', 'kill', '', null, 7].map(reasonFromRenderer),
    ['restart', 'revive', 'sweep', 'person', 'person', 'person', 'person', 'person', 'person', 'person']);
});

test('2. CRASH with an uncommitted edit: the folder and the edit are still there, and so are its dependencies', async () => {
  const r = repoWithWorktree();
  try {
    fs.writeFileSync(path.join(r.wt, 'a.txt'), 'one\nhalf an edit\n');
    const out = await finalizeAgentWorktree(r.wt, r.repo, 'main', 'exit');
    assert.equal(out.fate, 'kept');
    assert.equal(fs.readFileSync(path.join(r.wt, 'a.txt'), 'utf8'), 'one\nhalf an edit\n');
    assert.ok(fs.lstatSync(path.join(r.wt, 'node_modules')).isSymbolicLink(), 'a restart in this folder would have no dependencies');
  } finally { r.done(); }
});

test('3. CRASH with a brand new untracked file: kept too, that is work as well', async () => {
  const r = repoWithWorktree();
  try {
    fs.writeFileSync(path.join(r.wt, 'new.ts'), 'export {};\n');
    assert.equal((await finalizeAgentWorktree(r.wt, r.repo, 'main', 'exit')).fate, 'kept');
    assert.ok(fs.existsSync(path.join(r.wt, 'new.ts')));
  } finally { r.done(); }
});

test('4. CRASH with everything committed: removed, and the commit is safe on the branch, so disks do not fill', async () => {
  const r = repoWithWorktree();
  try {
    fs.writeFileSync(path.join(r.wt, 'a.txt'), 'one\ntwo\n');
    git(r.wt, 'commit', '-q', '-am', 'second');
    const out = await finalizeAgentWorktree(r.wt, r.repo, 'main', 'exit');
    assert.equal(out.fate, 'removed', 'our own node_modules link must not count as the agent being dirty');
    assert.equal(fs.existsSync(r.wt), false);
    assert.match(git(r.repo, 'log', '--oneline', 'agent-1'), /second/);
  } finally { r.done(); }
});

test('5. A PERSON ends it: removed as before, dirty or not. This change is about what nobody chose', async () => {
  const r = repoWithWorktree();
  try {
    fs.writeFileSync(path.join(r.wt, 'a.txt'), 'one\nhalf an edit\n');
    assert.equal((await finalizeAgentWorktree(r.wt, r.repo, 'main', 'person')).fate, 'removed');
    assert.equal(fs.existsSync(r.wt), false);
  } finally { r.done(); }
});

test('6. RESTART and REVIVE: the folder is kept untouched, dirty or clean, dependencies and all', async () => {
  for (const reason of ['restart', 'revive']) {
    const r = repoWithWorktree();
    try {
      fs.writeFileSync(path.join(r.wt, 'a.txt'), 'one\nhalf an edit\n');
      assert.equal((await finalizeAgentWorktree(r.wt, r.repo, 'main', reason)).fate, 'kept');
      assert.equal(fs.readFileSync(path.join(r.wt, 'a.txt'), 'utf8'), 'one\nhalf an edit\n');
      assert.ok(fs.lstatSync(path.join(r.wt, 'node_modules')).isSymbolicLink(), 'the agent is starting in here: its dependencies must never have left');
    } finally { r.done(); }
  }
});

test('7. THE BREAKER and A THEME SWITCH keep a dirty tree, exactly as a crash does', async () => {
  for (const reason of ['guardrail', 'sweep']) {
    const r = repoWithWorktree();
    try {
      fs.writeFileSync(path.join(r.wt, 'new.ts'), 'export {};\n');
      assert.equal((await finalizeAgentWorktree(r.wt, r.repo, 'main', reason)).fate, 'kept', reason);
    } finally { r.done(); }
  }
});

test('8. the wiring: NO DEFAULT REASON, and every caller of teardownPty says who ended it', () => {
  const main = fs.readFileSync(path.join(__dirname, '..', 'src/main/index.ts'), 'utf8');
  assert.match(main, /function teardownPty\(id: string, reason: TeardownReason\): void \{/, 'a default reason is how three callers went on deleting work after the first fix');
  const calls = [...main.matchAll(/teardownPty\(([^)]*)\)/g)].map((m) => m[1]).filter((a) => !a.includes(': string'));
  assert.ok(calls.length >= 8, `only found ${calls.length} callers, the pattern is wrong`);
  // Batch 2 (0.5.3): the exit handler says 'revive' for ONE case, a run that
  // ended signed out and is about to start again in the same folder from the
  // sign in panel (v053-copilot-signin), so its worktree is kept and tracked.
  for (const c of calls) assert.ok(/,\s*('(person|exit|guardrail|worker)'|reason)$/.test(c) || c === "id, 'revive'", `teardownPty(${c}) does not say who ended the agent`);
  assert.equal(calls.filter((c) => /'revive'/.test(c)).length, 1, 'only the sign in offer revives from main');
  assert.match(main, /if \(signInOffer\) teardownPty\(id, 'revive'\);\n  else teardownPty\(id, 'exit'\);/);
  assert.equal(calls.filter((c) => /'exit'/.test(c)).length, 1, 'the PTY exit handler');
  assert.equal(calls.filter((c) => /'guardrail'/.test(c)).length, 1, 'the circuit breaker');
  assert.match(main, /const reason = reasonFromRenderer\(why\);/, "'pty:kill' carries a person's Stop, a Restart, a revive and a theme switch: it must be told which");
  // A kept folder stays tracked across a restart, or a later Stop can never remove it.
  assert.match(main, /const respawning = RESPAWNING\.includes\(reason\);\s*\n\s*if \(!respawning\) \{\s*\n\s*worktreePaths\.delete\(id\);/);
  // And a Restart pressed while a teardown is still deciding waits for it.
  assert.match(main, /for \(const \[wt, pending\] of worktreeFinalizing\)/);
});
