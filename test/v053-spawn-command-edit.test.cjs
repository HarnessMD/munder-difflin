'use strict';

/* 0.5.3, founder 24 Sep: "the agent sidebar should have the input area that
 * shows the cli command used to spawn this agent and user should be able to edit
 * it and restart button should always be visible ... the configuration section in
 * orchestrator's screen shows the input area with cli command used to spawn it
 * but the users can not edit it and restart with that command."
 *
 * Before: the agent panel had no command box, its Restart showed only after a
 * provider or model pick, and Restart rebuilt the line from the picks, so a
 * hand edit saved from the agent sheet was dropped. The orchestrator's box
 * restarted on the derived line, without a word, whenever the typed line named
 * another engine. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { planAgentRestart } = loadTs('src/shared/agentRestart.ts');
const { commandEngineConflict, effectiveGodCommand } = loadTs('src/shared/godCommand.ts');
const { modelInCommand, commandWithModel } = loadTs('src/shared/liveModel.ts');

const src = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
const RESOLVED = 'claude --model claude-opus-5-5 --permission-mode bypassPermissions';

test('the panel restarts on the line in the box, not a rebuild from the picks', () => {
  const plan = planAgentRestart(`${RESOLVED} --verbose`, RESOLVED, 'claude', 'claude-opus-5-5');
  assert.equal(plan.command, `${RESOLVED} --verbose`);
  assert.equal(plan.conflict, null);
  assert.equal(plan.model, 'claude-opus-5-5');
});

test('an empty box restarts on the resolved line', () => {
  assert.equal(planAgentRestart('   ', RESOLVED, 'claude', undefined).command, RESOLVED);
});

test('a typed --model becomes the stored model, so the restore at app start keeps the edit', () => {
  const line = 'claude --model claude-fable-5 --permission-mode bypassPermissions';
  const plan = planAgentRestart(line, RESOLVED, 'claude', 'claude-opus-5-5');
  assert.equal(plan.model, 'claude-fable-5');
  // useRestoreTeam spawns commandWithModel(a.command, a.model): the same line.
  assert.equal(commandWithModel(plan.command, plan.model, 'claude'), line);
  assert.equal(modelInCommand('claude --model=claude-fable-5', 'claude'), 'claude-fable-5');
  assert.equal(modelInCommand('codex -m gpt-5.5 --full-auto', 'codex'), 'gpt-5.5');
  assert.equal(modelInCommand('claude --verbose', 'claude'), undefined);
  assert.equal(modelInCommand('claude -- --model x', 'claude'), undefined, 'after -- it is a positional');
});

test('a line for another engine is refused, with the engine named, never run', () => {
  const plan = planAgentRestart('codex --full-auto', RESOLVED, 'claude', undefined);
  assert.equal(plan.conflict, 'codex');
  assert.equal(commandEngineConflict('grok --model grok-4.6', 'claude'), 'grok');
  assert.equal(commandEngineConflict('/opt/bin/claude --verbose', 'claude'), null, 'an absolute path to the same engine is fine');
  assert.equal(commandEngineConflict('my-claude-wrapper --x', 'claude'), null, 'an unknown wrapper is trusted');
  assert.equal(commandEngineConflict('codex --full-auto', 'custom'), null, 'a custom agent runs what it is given');
  assert.equal(commandEngineConflict('', 'claude'), null);
});

test('T85 still holds at boot: a saved edit for one engine never starts another', () => {
  assert.equal(effectiveGodCommand('claude --verbose', 'codex --full-auto', 'codex'), 'codex --full-auto');
  assert.equal(effectiveGodCommand('claude --verbose', RESOLVED, 'claude'), 'claude --verbose');
  assert.equal(effectiveGodCommand('my-wrapper --x', RESOLVED, 'claude'), 'my-wrapper --x');
});

test('source: the agent panel has the box, an always visible Restart, and restarts on the plan', () => {
  const s = src('src/renderer/src/components/pro/AgentScreen.tsx');
  const editor = s.slice(s.indexOf('function EngineEditor'));
  assert.match(editor, /<CommandField [^>]*testId="agent"[^>]*error=\{conflictText\}/);
  assert.match(editor, /<div data-agent-restart/);
  assert.doesNotMatch(editor, /\{changed && \(\s*<div/, 'Restart is no longer behind a pick');
  const restart = editor.slice(editor.indexOf('const restart = async'), editor.indexOf('return ('));
  assert.match(restart, /const command = plan\.command;/);
  assert.doesNotMatch(restart, /buildSpawnCommand\(cfg/, 'no rebuild from the picks at restart');
  assert.match(restart, /updateAgent\(agent\.id, \{ command, model: plan\.model \}\)/, 'stored before the spawn');
});

test('source: the orchestrator box says a conflict and keeps Restart and Apply off', () => {
  const s = src('src/renderer/src/components/pro/god/ConfigTab.tsx');
  assert.match(s, /const conflict = commandEngineConflict\(commandDraft, provider\)/);
  assert.match(s, /testId="god" error=\{conflictText\}/);
  assert.match(s, /disabled=\{!agent\.ptyId \|\| restarting \|\| !commandDraft\.trim\(\) \|\| !!conflict\}/);
  assert.match(s, /disabled=\{\(!engineDirty && !commandDirty\) \|\| !!conflict\}/);
});

test('source: a restart that finds its CLI clears the old not-installed card, in both processes', () => {
  const pool = src('src/renderer/src/components/terminalPool.ts');
  const reset = pool.slice(pool.indexOf('export function resetTerminal'));
  assert.match(reset.slice(0, 1400), /setCliMissing\(entry, null\);/);
  const main = src('src/main/index.ts');
  assert.match(main, /if \(!bin \|\| opts\.noAutoInstall \|\| ptyManager\.isCommandAvailable\(bin\)\) pendingCliMissing\.delete\(opts\.id\);\n\s*if \(bin && !opts\.noAutoInstall && !ptyManager\.isCommandAvailable\(bin\)\) \{/);
});

test('the command box wraps, so the panel never squeezes it to a sliver', () => {
  const s = src('src/renderer/src/components/pro/CommandField.tsx');
  assert.match(s, /flexWrap: 'wrap'/);
  assert.match(s, /flex: '1 1 240px'/);
});
