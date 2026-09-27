'use strict';

/* 0.5.3, founder 24 Sep, on #99: "you added the restart button and command on
 * the left hand side screen i wanted the right side sidebar where we already
 * have the restart button and change model listed when that agent's window is
 * open".
 *
 * That sidebar is the Command Center's monitor tab (Classic): each agent row
 * has its model picker and restart & continue. Before this, the row had no
 * command box, restart & continue showed only for engines that can resume, and
 * every restart there rebuilt the line from the model pick, so a hand edit to
 * the agent's command was dropped. The row now runs the same rule as the PRO
 * details panel (planAgentRestart), not a copy of it. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const src = fs.readFileSync(path.join(__dirname, '..', 'src/renderer/src/components/CommandCenterPanel.tsx'), 'utf8');
const restartFn = src.slice(src.indexOf('const restartWithModel = async'), src.indexOf('// ALL human dispatch flows through the god'));
const row = src.slice(src.indexOf('const currentModelKnown = modelsForProvider(agentProvider)'), src.indexOf('{restartErrors[a.id] && ('));

test('the right panel reuses the shared control and the shared restart rule', () => {
  assert.match(src, /import \{ CommandField \} from '\.\/pro\/CommandField';/);
  assert.match(src, /import \{ planAgentRestart \} from '@shared\/agentRestart';/);
  assert.match(row, /planAgentRestart\(draftLine, resolvedLine, agentProvider, a\.model\)/);
  assert.match(row, /<CommandField[\s\S]*?testId="floor"[\s\S]*?error=\{conflictText\}/);
});

test('a restart from the box runs the box, stored before the spawn', () => {
  assert.match(restartFn, /const command = opts\.command \?\? buildSpawnCommand\(cfg, model, provider\);/);
  const store = restartFn.indexOf('if (opts.command) updateAgent(a.id, { command: command.trim(), model });');
  assert.ok(store > 0, 'the box line is not stored');
  assert.ok(store < restartFn.indexOf('window.cth.spawnPty('), 'stored after the spawn');
});

test('the box restart is always shown, for every engine, and refuses another engine', () => {
  const box = row.slice(row.indexOf('data-floor-command'));
  // Not inside the resume-capable gate that hides restart & continue.
  assert.ok(row.indexOf('data-floor-command') > row.lastIndexOf('agentPreset.resumeSubcommand'));
  assert.match(box, /disabled=\{runBlocked\}[\s\S]*?command: plan\.command \}\)/);
  assert.match(row, /const runBlocked = restarting === a\.id \|\| !a\.ptyId \|\| !!plan\.conflict \|\| !plan\.command;/);
});

test('restart & continue runs the box too, so no restart in the row drops an edit', () => {
  assert.match(row, /restartWithModel\(a, plan\.model, \{ resume: true, resumeOptional: draftDirty, command: plan\.command \}\)/);
  assert.doesNotMatch(row, /restartWithModel\(a, a\.model, \{ resume: true \}\)/);
});

test('a model pick drops an unsaved edit, since the pick rewrites the line', () => {
  assert.match(row, /if \(!choice\) return;\s*\/\/[^\n]*\n\s*dropDraft\(a\.id\);/);
});

test('the new words exist in every locale', () => {
  for (const loc of ['en', 'ar', 'zh-CN']) {
    const j = JSON.parse(fs.readFileSync(path.join(__dirname, '..', `src/renderer/src/i18n/locales/${loc}.json`), 'utf8'));
    assert.ok(j.commandCenter.restartOnLine, `${loc} restartOnLine`);
    assert.ok(j.commandCenter.commandLineHint, `${loc} commandLineHint`);
  }
});
