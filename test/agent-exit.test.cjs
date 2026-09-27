'use strict';

/* 0.5.3 feature 18: when an agent crashes or dies the sidebar says so, and
 * offers Restart with the command prefilled and editable. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { exitVerdict, agentExitOf } = loadTs('src/shared/agentExit.ts');
const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

test('a signal is a crash even though node-pty reports exit code 0 with it', () => {
  assert.equal(exitVerdict(0, 4), 'crashed');   // SIGILL, seen live 24 Aug
  assert.equal(exitVerdict(0, 9), 'crashed');
});

test('a non zero code is a crash', () => {
  assert.equal(exitVerdict(1, undefined), 'crashed');
  assert.equal(exitVerdict(127, 0), 'crashed');
});

test('a clean exit is stopped, not crashed', () => {
  assert.equal(exitVerdict(0, undefined), 'stopped');
  assert.equal(exitVerdict(0, 0), 'stopped');
  assert.equal(exitVerdict(undefined, undefined), 'stopped');
});

test('the record keeps what happened and when', () => {
  assert.deepEqual(agentExitOf(1, undefined, 42), { verdict: 'crashed', exitCode: 1, signal: undefined, at: 42 });
});

test('it agrees with the rule main already logs by', () => {
  const hive = read('src/main/hive.ts');
  assert.match(hive, /const abnormal = \(typeof signal === 'number' && signal !== 0\) \|\| \(typeof exitCode === 'number' && exitCode !== 0\);/);
});

test('HAS IT RUN: main tells the floor, the floor keeps it, the row draws it above the note', () => {
  const index = read('src/main/index.ts');
  const handler = index.slice(index.indexOf('ptyManager.setExitHandler('), index.indexOf('/** Keep the system from suspending'));
  // Batch 2 (0.5.3): the payload also says when the run was a print mode one
  // (Copilot -p), whose clean exit is a finished task (v053-copilot-signin).
  assert.match(handler, /send\('hive:agentExited', \{ agentId: [a-zA-Z]+, exitCode, signal: info\?\.signal(, \.\.\.\(run\?\.printMode \? \{ printMode: true \} : \{\}\))? \}\)/, 'main never tells the renderer an agent died');
  // Not for the installer PTY that is about to relaunch: that is not a death.
  assert.ok(handler.indexOf("'hive:agentExited'") > handler.indexOf('return; // an install PTY has no agent/worktree to tear down'), 'an install relaunch would be reported as a death');
  assert.ok(handler.indexOf("'hive:agentExited'") < handler.lastIndexOf("teardownPty(id, 'exit');"), 'sent after teardown dropped the pty to agent mapping');
  assert.match(read('src/preload/index.ts'), /onHiveAgentExited:/);
  const store = read('src/renderer/src/store/store.ts');
  assert.match(store, /exit\?: AgentExit;/);
  assert.match(store, /'contextTokens', 'contextLimit', 'lastPrompt', 'exit'/, 'a dead process is run state, not something to persist');
  const useHive = read('src/renderer/src/hooks/useHive.ts');
  assert.match(useHive, /window\.cth\.onHiveAgentExited\?\.\(/);
  assert.match(useHive, /if \(self\.exit\) updateAgent\(e\.agentId, \{ exit: undefined \}\);/, 'a hook event is proof of life and must clear the banner');
  // Founder, 24 Sep: the rail names the death, and nothing more. The command
  // box and Restart live in the agent's details panel on the right.
  const bar = read('src/renderer/src/components/pro/ProSidebar.tsx');
  assert.match(bar, /<Strip\s+kind="crash"/, 'the rail no longer says the agent stopped');
  assert.doesNotMatch(bar, /CrashedBlock|<CommandField/, 'the rail must not carry a command box or Restart');
  assert.ok(!fs.existsSync(path.join(__dirname, '..', 'src/renderer/src/components/pro/CrashedBlock.tsx')), 'CrashedBlock has no user left');
  const screen = read('src/renderer/src/components/pro/AgentScreen.tsx');
  const editor = screen.slice(screen.indexOf('function EngineEditor('), screen.indexOf('/* ---- pieces'));
  assert.match(editor, /const blocked = \(!agent\.ptyId && !down\)/, 'a stopped agent with no pty must still be restartable');
  assert.match(editor, /isolate: false/, 'a restart must re enter the worktree, never cut a new one');
  assert.match(editor, /resume: true/);
  assert.match(editor, /exit: undefined, ptyId, command/, 'a revive clears the stopped state');
  assert.match(editor, /data-agent-down=\{down\.verdict\}/, 'the panel says it stopped, next to Restart');
  assert.match(screen, /if \(agent\.exit\) setConfigOpen\(true\);/, 'opening a stopped agent shows the panel that restarts it');
});

test('every string exists in all three locales, without a dash, variables intact', () => {
  const keys = ['crashed', 'stopped', 'crashedFailed'];
  for (const l of ['en', 'zh-CN', 'ar']) {
    const agents = JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`)).pro.agents;
    for (const k of keys) {
      assert.ok(typeof agents[k] === 'string' && agents[k].length > 0, `${l} pro.agents.${k}`);
      assert.doesNotMatch(agents[k], /[–—]|\s-\s/, `${l} pro.agents.${k} carries a dash`);
    }
    assert.match(agents.crashedFailed, /\{\{error\}\}/, `${l} crashedFailed lost its variable`);
  }
});
