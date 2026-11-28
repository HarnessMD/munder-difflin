'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const loadTs = require('./load-ts.cjs');
const { codexScreenVerdict, codexStillPending } = loadTs('src/shared/codexScreen.ts');

test('Codex U+00BB empty composer is ready to receive queued text', () => {
  const screen = ['» Ask Codex to do anything', '', 'GPT ready'];
  assert.deepEqual(codexScreenVerdict(screen, 'type'), { ok: true, reason: 'empty prompt' });
});

// Exercise both the legacy prompt and the U+00BB prompt observed in Codex 0.163.0.
for (const mark of ['›', '»']) {
  const empty = `${mark} Ask Codex to do anything`;
  const payload = 'Handle the existing task only';
  const check = (name, lines, mode, expected, text = '') =>
    test(`${mark} ${name}`, () => assert.equal(codexScreenVerdict(lines, mode, text).ok, expected));

  check('empty prompt accepted', [empty], 'type', true);
  check('trailing whitespace accepted', [empty + '   ', '', 'GPT ready'], 'type', true);
  check('draft is never overwritten', [`${mark} personal unsent draft`], 'type', false);
  check('multiline draft below placeholder is preserved', [empty, 'personal unsent draft', '', 'GPT ready'], 'type', false);
  check('Enter accepted on matching owned message', [`${mark} ${payload}`, '', 'GPT ready'], 'press', true, payload);
  check('Enter rejected on other message', [`${mark} do not submit personal draft`, '', 'GPT ready'], 'press', false, payload);
  check('numeric choice is not a composer', [`${mark} 1. Trust this folder`], 'type', false);
  check('numeric choice is never submitted', [`${mark} 1. Trust this folder`], 'press', false, '1. Trust this folder');
  check('checkbox choice is never submitted', [`${mark} [x] Hooks`], 'press', false, '[x] Hooks');
  check('empty checkbox is never submitted', [`${mark} [ ] Hooks`], 'press', false, '[ ] Hooks');
  check('startup loading holds', ['│ >_ OpenAI Codex (v0.163.0)', '│ model: loading', '╰────────', empty], 'type', false);
  check('resume overlay holds', ['│ >_ OpenAI Codex (v0.163.0)', '│ model: gpt-test', '╰────────', '  Resuming session…', empty], 'type', false);
  check('fork overlay holds', ['│ >_ OpenAI Codex (v0.163.0)', '│ model: gpt-test', '╰────────', '  Forking session…', empty], 'type', false);
  check('popup key hint holds', [empty, '', 'Press Enter to select or Esc to cancel'], 'type', false);
  check('list navigation hint holds', [empty, '', 'up to move, enter to select, c to customize'], 'type', false);
  check('quit key mode holds', [empty, '', 'Press again to quit'], 'type', false);
  check('history edit key mode holds', [empty, '', 'up to edit previous message'], 'type', false);
  check('quoted key-mode words do not block owned message', [`${mark} The text says again to quit`, '', 'GPT ready'], 'press', true, 'The text says again to quit');
  check('message text keeps double-angle punctuation', [`${mark} Quote » ordinary punctuation`, '', 'GPT ready'], 'press', true, 'Quote » ordinary punctuation');
  test(`${mark} pending owned input detected`, () => assert.equal(codexStillPending([`${mark} ${payload}`], payload), true));
  test(`${mark} pending popup stays unknown`, () => assert.equal(codexStillPending([`${mark} 1. Trust this folder`], 'Trust this folder'), null));
}

for (const mark of ['>', '❯', '→']) {
  test(`unknown mark ${mark} fails closed`, () => assert.equal(codexScreenVerdict([`${mark} Ask Codex to do anything`], 'type').ok, false));
}
test('missing prompt fails closed', () => assert.equal(codexScreenVerdict(['No input on this screen'], 'type').ok, false));
