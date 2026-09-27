'use strict';

/* KEVIN, AFTER THE FIX: these were written RED by Creed and are now the covering
 * tests for the correction (shared/worktreeFate.ts has the history). Two edits of
 * mine, both stated: the reason a person's Stop carries is now called 'person'
 * (there is no 'kill' and no default any more), and test 3 looks 3200 characters
 * past the kill instead of 1600, because the command center's respawn sits
 * further down its function than the agent screen's does. The titles keep his
 * words, RED included, so the record of what he found is not rewritten.
 *
 * REVIEW of 24688d52 "an agent that crashes keeps its uncommitted work", by Creed
 * at Kevin's request. These tests are RED ON PURPOSE. They fix nothing.
 *
 * The commit says: "Exactly one caller of teardownPty is the process ending on
 * its own, the PTY exit handler, and it now says so. Every other caller is a
 * person." The rule it adds is right. That sentence is not true, and the default
 * argument `reason = 'kill'` is what hides it: every caller that was not looked
 * at silently became "a person chose this".
 *
 * Three callers are NOT a person choosing to discard work, and all three still
 * force remove a DIRTY worktree. Test 1 shows, against a real repository, that
 * the 'kill' reason does delete uncommitted work, so the rest is not cosmetic. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const loadTs = require('./load-ts.cjs');

const { finalizeAgentWorktree } = loadTs('src/main/agentWorktree.ts');
const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const git = (cwd, ...args) => execFileSync('git', args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] }).toString();

function repoWithWorktree() {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'md-review-')));
  git(base, 'init', '-q', '-b', 'main');
  git(base, 'config', 'user.email', 't@t'); git(base, 'config', 'user.name', 't');
  fs.writeFileSync(path.join(base, 'a.txt'), 'one\n');
  git(base, 'add', '.'); git(base, 'commit', '-q', '-m', 'init');
  const wt = path.join(base, '..', path.basename(base) + '-wt');
  git(base, 'worktree', 'add', '-q', wt, '-b', 'agent/x', 'main');
  return { base, wt: fs.realpathSync(wt) };
}

test('0. GREEN, the premise: under the reason a person\'s Stop carries, a dirty worktree and its uncommitted file are deleted', async () => {
  const { base, wt } = repoWithWorktree();
  fs.writeFileSync(path.join(wt, 'half-written.ts'), 'the edit nobody committed\n');
  const out = await finalizeAgentWorktree(wt, base, 'main', 'person');
  assert.equal(out.fate, 'removed');
  assert.equal(fs.existsSync(path.join(wt, 'half-written.ts')), false, 'the uncommitted file is gone');
});

test('1. RED: the circuit breaker stopping an agent is not a person, and must not say "kill"', () => {
  // src/main/index.ts, the breaker tick: `d.action === 'stop'` kills the PTY and
  // calls teardownPty(ptyId) with the DEFAULT reason. An agent the breaker stops
  // is looping or over budget, i.e. mid work, the likeliest of all to be dirty.
  const index = read('src/main/index.ts');
  const stop = index.slice(index.indexOf("d.action === 'stop'"), index.indexOf("stopped by circuit breaker"));
  assert.ok(stop.length > 0, 'breaker stop site not found');
  assert.doesNotMatch(stop, /teardownPty\(ptyId\);/, 'the breaker tears down with the default reason "kill": a dirty worktree is force removed by a guardrail');
});

test('2. RED: the automatic revive after sleep is not a person, and it goes through pty:kill', () => {
  // useHive.ts effect 7. Main reports PTYs whose process is GONE but whose exit
  // event never fired (the documented macOS sleep wedge): the process ended on
  // its own and the exit handler, the ONE caller that says 'exit', never ran. The
  // renderer then calls killPty(deadId) -> ipc 'pty:kill' -> teardownPty(id) with
  // the default reason. Nobody is at the keyboard. The dirty worktree is removed,
  // and the very next line respawns INTO that path (cwd = a.worktreePath).
  const useHive = read('src/renderer/src/hooks/useHive.ts');
  const revive = useHive.slice(useHive.indexOf('const revive = async (deadId: string)'), useHive.indexOf('return window.cth.onPowerResume'));
  assert.ok(revive.length > 0, 'revive not found');
  assert.doesNotMatch(revive, /await window\.cth\.killPty\(deadId\);/, 'the automatic revive kills through the person route, so main removes the worktree it is about to respawn into');
  const index = read('src/main/index.ts');
  const ipc = index.slice(index.indexOf("ipcMain.handle('pty:kill'"), index.indexOf("ipcMain.handle('pty:kill'") + 700);
  assert.doesNotMatch(ipc, /teardownPty\(id\);/, "'pty:kill' cannot tell a person's Stop from an automatic revive or a Restart: it has one reason for all of them");
});

test('3. RED: a Restart is a person choosing to RESTART, not to discard the worktree', () => {
  // pro/AgentScreen.tsx restart and CommandCenterPanel "Restart & Continue" both
  // killPty() then spawnPty({ cwd: agent.cwd }). For an isolated agent agent.cwd is
  // the BASE repo (useHive.ts says so: "a.cwd is the base repo"). So Restart force
  // removes the dirty worktree AND brings the agent back un-isolated in the base
  // repo, with worktreePath still set in the store. The commit message's own
  // words: "the routes that do it are the ones that ask first". These do not ask.
  for (const f of ['src/renderer/src/components/pro/AgentScreen.tsx', 'src/renderer/src/components/CommandCenterPanel.tsx']) {
    const code = read(f);
    const kill = code.indexOf('const killed = await window.cth.killPty(');
    assert.ok(kill > 0, `${f}: restart kill not found`);
    const after = code.slice(kill, kill + 3200);
    assert.match(after, /worktreePath/, `${f}: restart kills (worktree force removed) and respawns with cwd: the base repo, never re entering or preserving the worktree`);
  }
});

test('4. RED: the sleep health check reads ANY throw from kill(pid, 0) as "process gone"', () => {
  // src/main/index.ts healthCheckPtys: `try { process.kill(p.pid, 0) } catch { dead.push(p.id) }`.
  // The floor hazard of 17 Sep in our own code: exit 1 conflates ESRCH (gone) with
  // EPERM (ALIVE, not yours to signal). A bare catch makes a LIVE agent "dead", and
  // test 2's revive then KILLS it and removes its worktree. The dangerous direction
  // must need proof: only err.code === 'ESRCH' may mean dead.
  const index = read('src/main/index.ts');
  const hc = index.slice(index.indexOf('function healthCheckPtys('), index.indexOf('function healthCheckPtys(') + 900);
  assert.match(hc, /ESRCH/, 'no errno check: EPERM (alive) is pushed to dead[] exactly like ESRCH (gone)');
  assert.doesNotMatch(hc, /catch \{ dead\.push\(p\.id\); \}/);
});
