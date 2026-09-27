// 0.4.11, founder 5 Sep 2026: "The configuration section in Michael's agent
// view needs to have a restart Michael button and above that button it should
// show the command that will run when they click on restart."
//
// The contract pinned here:
//   1. The command on screen and the command that runs come from ONE function
//      (buildSpawnCommand) fed by the same picks, so they cannot disagree.
//      A pending provider or model pick is applied first, then the config is
//      read back and the command built from it.
//   2. The command is drawn ABOVE the button, in source order.
//   3. The restart is the agent screen's door: kill his pty, reset the xterm
//      in place, spawn into the SAME pty id with isGod metadata, resume only
//      when the provider is unchanged, and the button is disabled without a
//      pty or while a restart is in flight.
//   4. Every string exists in all three locales without a dash, variables intact.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const tab = read('src/renderer/src/components/pro/god/ConfigTab.tsx');
const code = tab.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const DASH = /[–—]|\s-\s/;

test('1. one function builds the shown command and the run command, from the same picks', () => {
  assert.match(tab, /import \{ buildSpawnCommand, [^}]*tokenizeCommand[^}]*\} from '@\/store\/config';/);
  assert.match(code, /const restartCommand = config \? buildSpawnCommand\(config, model, provider\) : '';/, 'the shown command is built from the picks on screen');
  // 0.5.3 bug 20: the line is editable. A pending pick OR a pending hand edit is
  // applied first, the run command is still built from the config read back (a
  // hand edit wins through effectiveGodCommand), and the copy only <code> is gone.
  assert.match(code, /if \(engineDirty \|\| commandDirty\) await window\.cth\.updateConfig\(\{ godProvider: provider, godModel: model, godCommand: godCommandToStore\(commandDraft, restartCommand\) \}\);/, 'a pending pick or hand edit is applied first');
  assert.match(code, /const cfg = await window\.cth\.getConfig\(\);\s*const nextProvider = \(cfg\.godProvider \?\? 'claude'\) as AgentProvider;\s*const command = effectiveGodCommand\(cfg\.godCommand, buildSpawnCommand\(cfg, cfg\.godModel, nextProvider\), nextProvider\);/, 'the run command is built from the config read back');
  assert.match(code, /<CommandField ariaLabel=\{t\('pro\.god\.config\.restartCommand'\)\} value=\{commandDraft\} resolved=\{restartCommand\}/);
  assert.doesNotMatch(code, /<code data-restart-command/);
});

test('2. the command is drawn above the button', () => {
  const cmd = tab.indexOf('data-restart-command');
  const btn = tab.indexOf("t('pro.god.config.restart', { name: agent.name })");
  assert.ok(cmd > 0 && btn > cmd, `command (${cmd}) before button (${btn})`);
});

test('3. the restart is the agent screen\'s door, against HIS pty, resume only when the provider holds', () => {
  assert.match(tab, /import \{ acquireTerminal, resetTerminal \} from '\.\.\/\.\.\/terminalPool';/);
  assert.match(tab, /import \{ roleForHiveSpawn \} from '@shared\/agentRole';/);
  const fn = code.slice(code.indexOf('const restart = async () => {'), code.indexOf('const providers = '));
  // 0.5.3 (founder, 24 Sep): a typed line for another engine is refused too.
  assert.match(fn, /if \(!agent\.ptyId \|\| restarting \|\| !config \|\| conflict\) return;/);
  assert.match(fn, /const resume = nextProvider === \(\(agent\.provider \?\? 'claude'\) as AgentProvider\);/, 'resume only when the provider is unchanged');
  // 0.5.3 bug 1: the renderer no longer checks the ONE recorded session id and
  // quietly turns the resume off. Main walks every session on record, and a
  // fresh start is said out loud. A moved transcript still starts fresh
  // instead of failing: the spawn carries no requireResume.
  assert.doesNotMatch(fn, /resumeSessionId|resolveSessionCwd|requireResume/, 'main decides what is resumable, not the renderer');
  assert.match(fn, /if \(res\.resumeNotFound\) proToast\(t\('pro\.room\.restartedFresh', \{ name: agent\.name \}\), \{ tone: 'bad' \}\);/, 'a fresh start is said out loud');
  // 0.5.3: the kill says it is a RESTART, so main keeps the folder the agent is
  // about to be started in again (shared/worktreeFate.ts).
  const kill = fn.indexOf("window.cth.killPty(agent.ptyId, 'restart')");
  const reset = fn.indexOf('resetTerminal(agent.ptyId, { preserveScrollback: resume })');
  const spawn = fn.indexOf('window.cth.spawnPty({');
  assert.ok(kill > 0 && reset > kill && spawn > reset, `kill (${kill}) then reset (${reset}) then spawn (${spawn})`);
  assert.match(fn, /id: agent\.ptyId,/, 'the same pty id');
  assert.match(fn, /hive: \{ id: agent\.id, name: agent\.name, cwd: agent\.cwd, provider: nextProvider, isGod: true, role: roleForHiveSpawn\(agent\) \}/);
  assert.match(fn, /const \[exe, \.\.\.args\] = tokenizeCommand\(command\.trim\(\)\);/);
  assert.match(fn, /updateAgent\(agent\.id, \{ provider: nextProvider, model: cfg\.godModel, command: command\.trim\(\)/, 'the store row learns what he now runs on');
  assert.match(fn, /proToast\(t\('pro\.room\.restartFailed'\), \{ tone: 'bad' \}\);/);
  assert.match(code, /disabled=\{!agent\.ptyId \|\| restarting \|\| !commandDraft\.trim\(\) \|\| !!conflict\}/);
});

test('4. every string exists in all three locales without a dash, variables intact', () => {
  const keys = ['restartCommand', 'restartCommandHint', 'copyCommand', 'restart', 'restarting', 'restartHint', 'restartApplies'];
  const locales = Object.fromEntries(['en', 'zh-CN', 'ar'].map((l) => [l, JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`))]));
  for (const k of keys) {
    assert.match(tab, new RegExp(`t\\('pro\\.god\\.config\\.${k}'`), `the tab uses ${k}`);
    const en = locales.en.pro.god.config[k];
    assert.ok(typeof en === 'string' && en.length > 0, `en ${k}`);
    const vars = (en.match(/\{\{\w+\}\}/g) || []).sort();
    for (const l of ['en', 'zh-CN', 'ar']) {
      const s = locales[l].pro.god.config[k];
      assert.ok(typeof s === 'string' && s.length > 0, `${l} ${k}`);
      assert.ok(!DASH.test(s), `${l} ${k}: no dash`);
      assert.deepEqual((s.match(/\{\{\w+\}\}/g) || []).sort(), vars, `${l} ${k}: same variables`);
    }
  }
  assert.strictEqual(locales.en.pro.god.config.restart, 'Restart {{name}}');
});
