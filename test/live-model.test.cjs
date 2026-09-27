'use strict';

/* 0.5.3 bug 2: model changes are lost. (a) `/model` inside the CLI never
 * reaches the sidebar. (b) After an app restart agents do not come back on the
 * model they were last running. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { liveModelOf, commandWithModel } = loadTs('src/shared/liveModel.ts');

test('(b) the lead, confirmed: an old --model in the saved command loses to the model last seen', () => {
  assert.equal(
    commandWithModel('claude --model claude-sonnet-5 --permission-mode bypassPermissions', 'claude-opus-5', 'claude'),
    'claude --model claude-opus-5 --permission-mode bypassPermissions'
  );
});

test('(b) a saved command with no --model is pinned to the model last seen, not to today\'s default', () => {
  assert.equal(commandWithModel('claude --permission-mode bypassPermissions', 'claude-opus-5', 'claude'),
    'claude --permission-mode bypassPermissions --model claude-opus-5');
});

test('the = form is replaced too, and a model with spaces stays one token', () => {
  assert.equal(commandWithModel('codex --model=gpt-5.5 -a never', 'gpt-5.6-sol', 'codex'), 'codex --model gpt-5.6-sol -a never');
  assert.equal(commandWithModel('agy --model "Gemini 3.1 Pro (High)"', 'Gemini 3.1 Flash', 'antigravity'), 'agy --model "Gemini 3.1 Flash"');
});

test('a dangling --model does not eat the next flag', () => {
  assert.equal(commandWithModel('claude --model --verbose', 'claude-opus-5', 'claude'), 'claude --model claude-opus-5 --verbose');
});

test('nothing to write leaves the command exactly as it was', () => {
  assert.equal(commandWithModel('claude --model claude-sonnet-5', undefined, 'claude'), 'claude --model claude-sonnet-5');
  assert.equal(commandWithModel('claude --model claude-sonnet-5', '  ', 'claude'), 'claude --model claude-sonnet-5');
  assert.equal(commandWithModel('', 'claude-opus-5', 'claude'), '');
  assert.equal(commandWithModel('my-wrapper --fast', 'x', 'custom'), 'my-wrapper --fast');
});

test('(a) the live model is read from a Claude status line and from a Codex hook payload', () => {
  assert.equal(liveModelOf({ model: { id: 'claude-opus-5', display_name: 'Opus 5' } }), 'claude-opus-5');
  assert.equal(liveModelOf({ model: 'gpt-5.6-sol' }), 'gpt-5.6-sol');
});

test('(a) a sub agent\'s model is not the agent\'s model', () => {
  assert.equal(liveModelOf({ model: 'gpt-5.5-mini', agent_type: 'explorer' }), undefined);
});

test('(a) no model, an empty one, or a wrong shape is undefined', () => {
  for (const p of [null, undefined, {}, { model: '' }, { model: '  ' }, { model: 7 }, { model: { id: 9 } }, { model: {} }]) {
    assert.equal(liveModelOf(p), undefined, JSON.stringify(p));
  }
});

test('HAS IT RUN: the wiring, end to end', () => {
  const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
  const hooks = read('src/main/hooks.ts');
  assert.match(hooks, /liveModelOf\(p\)/, 'the hook server never reads the live model');
  assert.match(hooks, /send\('hive:modelUpdate'/, 'the live model never leaves main');
  // Before the Status early return, or a Claude agent's model is never seen:
  // the status line is the ONLY Claude payload that carries it.
  assert.ok(hooks.indexOf('liveModelOf(p)') < hooks.indexOf("if (event === 'Status') {"), 'read after the status line returns');
  assert.match(read('src/preload/index.ts'), /onHiveModelUpdate:/);
  const useHive = read('src/renderer/src/hooks/useHive.ts');
  assert.match(useHive, /window\.cth\.onHiveModelUpdate\(/);
  assert.match(useHive, /commandWithModel\(a\.command, a\.model, provider\)/, 'the post sleep revive replays the old command');
  const sheet = read('src/renderer/src/components/pro/AgentSheet.tsx');
  assert.doesNotMatch(sheet, /const nextCommand = customEngine \? command\.trim\(\) : buildSpawnCommand\(/, 'saving the sheet still throws a hand edited command away');
  assert.match(sheet, /const nextCommand = command\.trim\(\) \|\| /);
  assert.match(read('src/renderer/src/hooks/useRestoreTeam.ts'), /commandWithModel\(a\.command, a\.model, provider\)/, 'the restore replays the old command');
});

/* Found at integration (Kevin, 20 Sep). commandWithModel splits the saved line
   into words and glues it back, and since this change that result is SAVED on
   every model change. The splitter drops quotes and the glue only puts double
   quotes back around a word with a space in it, so some lines do not survive
   the trip. A line we cannot rewrite faithfully must be left exactly as it is
   wherever that is possible, and never saved in a broken form. */
const { tokenizeCommand } = loadTs('src/shared/commandLine.ts');

test('10. a command the rewrite cannot reproduce word for word is never damaged', () => {
  const tricky = [
    `claude --append-system-prompt 'say "hi" to them' --permission-mode plan`,
    `claude --append-system-prompt 'say "hi" to them' --model claude-sonnet-5`,
    `mycli --flag "" --other x`,
    `claude --note "it's fine" --model old`
  ];
  for (const line of tricky) {
    const before = tokenizeCommand(line);
    const out = commandWithModel(line, 'claude-opus-5', 'claude');
    const after = tokenizeCommand(out);
    // Every word that is not the model survives, in order, exactly.
    const strip = (toks) => toks.filter((t, i) => t !== '--model' && toks[i - 1] !== '--model');
    assert.deepEqual(strip(after), strip(before), `damaged: ${line}\n     became: ${out}`);
  }
});

test('11. and the ordinary line still gets its model, replaced in place or appended', () => {
  assert.equal(commandWithModel('claude --model claude-sonnet-5 --permission-mode plan', 'claude-opus-5', 'claude'), 'claude --model claude-opus-5 --permission-mode plan');
  assert.equal(commandWithModel('claude --permission-mode plan', 'claude-opus-5', 'claude'), 'claude --permission-mode plan --model claude-opus-5');
  // A line we cannot rebuild but that has no model yet is appended to AS TEXT.
  assert.equal(commandWithModel(`claude --append-system-prompt 'say "hi" to them'`, 'claude-opus-5', 'claude'), `claude --append-system-prompt 'say "hi" to them' --model claude-opus-5`);
});
