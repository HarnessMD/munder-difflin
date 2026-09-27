'use strict';

/* 0.5.3 bug 20: the orchestrator's restart command could only be copied. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { effectiveGodCommand, godCommandToStore } = loadTs('src/shared/godCommand.ts');
const RESOLVED = 'claude --model claude-opus-5 --permission-mode bypassPermissions';

test('no hand edit: the derived command runs, as before', () => {
  for (const o of [undefined, null, '', '   ']) assert.equal(effectiveGodCommand(o, RESOLVED, 'claude'), RESOLVED);
});

test('a hand edit wins', () => {
  const edited = `${RESOLVED} --verbose`;
  assert.equal(effectiveGodCommand(edited, RESOLVED, 'claude'), edited);
});

test('a stale edit for ANOTHER known engine is ignored, not obeyed', () => {
  const codexResolved = 'codex --model gpt-5.6-sol';
  assert.equal(effectiveGodCommand(`${RESOLVED} --verbose`, codexResolved, 'codex'), codexResolved);
});

test('a person\'s own wrapper binary is trusted', () => {
  assert.equal(effectiveGodCommand('my-claude-wrapper --fast', RESOLVED, 'claude'), 'my-claude-wrapper --fast');
});

test('a draft equal to the derived line stores nothing, so it keeps following the picks', () => {
  assert.equal(godCommandToStore(RESOLVED, RESOLVED), undefined);
  assert.equal(godCommandToStore(`  ${RESOLVED}  `, RESOLVED), undefined);
  assert.equal(godCommandToStore('', RESOLVED), undefined);
  assert.equal(godCommandToStore(`${RESOLVED} --verbose`, RESOLVED), `${RESOLVED} --verbose`);
});

test('HAS IT RUN: boot, restart and the settings tab all use it; one shared field, used by the sheet too', () => {
  const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
  const useHive = read('src/renderer/src/hooks/useHive.ts');
  assert.match(useHive, /effectiveGodCommand\(config\.godCommand, buildSpawnCommand\(config, godModel, godProvider\), godProvider\)/, 'boot ignores the hand edit');
  const tab = read('src/renderer/src/components/pro/god/ConfigTab.tsx');
  assert.match(tab, /effectiveGodCommand\(cfg\.godCommand, buildSpawnCommand\(cfg, cfg\.godModel, nextProvider\), nextProvider\)/, 'restart ignores the hand edit');
  assert.match(tab, /<CommandField/, 'the settings tab still only shows the command');
  assert.doesNotMatch(tab, /<code data-restart-command/, 'the copy only control is still there');
  assert.match(tab, /godCommand: godCommandToStore\(/);
  assert.match(read('src/renderer/src/components/pro/AgentSheet.tsx'), /<CommandField/, 'the agent sheet has its own copy of the control');
  for (const f of ['src/main/config.ts', 'src/preload/index.ts', 'src/renderer/src/store/config.ts']) {
    assert.match(read(f), /godCommand\?: string;/, `${f} does not declare godCommand`);
  }
});
