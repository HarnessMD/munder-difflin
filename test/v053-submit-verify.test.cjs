'use strict';

// A queued message could sit in the agent's own input box, typed but never
// submitted: the Return landed before a loaded TUI had taken the text in. The
// fixed 240ms gap was headroom; this is the fix: read the screen back after the
// Return and press it again while the message is still in the box.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { submitStillPending } = loadTs('src/shared/providerAutomation.ts');

const RULE = '─'.repeat(80);
const MSG = 'we changed earlier some delay or offset when we add messages to the queue and that goes to the input section';

// Claude Code: transcript, rule, input box, rule, status lines.
function claudeScreen(boxLines, transcript = ['❯ earlier message', '  answer text']) {
  return [...transcript, '', RULE, ...boxLines, RULE, '  ctx 86k/1000k (9%)', '  ⏵⏵ bypass permissions on (shift+tab to cycle)'];
}

test('the founder\'s screenshot: the message wrapped in the input box is still pending', () => {
  const wrapped = ['❯ we changed earlier some delay or offset when we add messages to the', '  queue and that goes to the input section'];
  assert.equal(submitStillPending(claudeScreen(wrapped), MSG), true);
});

test('submitted: the transcript echoes the message but the box is empty, so no retry', () => {
  const screen = claudeScreen(['❯ '], ['❯ ' + MSG, '', '✻ Thinking…']);
  assert.equal(submitStillPending(screen, MSG), false);
});

test('a collapsed paste in the box counts as the message', () => {
  const multi = 'line one\nline two\nline three';
  assert.equal(submitStillPending(claudeScreen(['❯ [Pasted text #1 +3 lines]']), multi), true);
});

test('a long box that scrolled still shows the tail, which is enough', () => {
  const long = 'x'.repeat(500) + ' and the very end of it';
  assert.equal(submitStillPending(claudeScreen(['❯ xxxxxxxx', '  xxxx and the very end of it']), long), true);
});

test('Gemini\'s rounded box reads the same way', () => {
  const top = '╭' + '─'.repeat(60) + '╮';
  const bot = '╰' + '─'.repeat(60) + '╯';
  assert.equal(submitStillPending([top, '│ > hello there │', bot], 'hello there'), true);
  assert.equal(submitStillPending([top, '│ >  Type your message │', bot], 'hello there'), false);
});

test('a screen with no input box is no evidence: null, and the caller stops', () => {
  assert.equal(submitStillPending(['$ codex', '> hello there'], 'hello there'), null);
  assert.equal(submitStillPending([], 'hello there'), null);
});

test('a short rule inside the transcript is not taken for the box', () => {
  const screen = ['───', 'hello there', ...claudeScreen(['❯ '])];
  assert.equal(submitStillPending(screen, 'hello there'), false);
});

test('submitToPty hands the typing and the Return to typeAndSubmit, reading the pool\'s screen', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'src/renderer/src/hooks/useHive.ts'), 'utf8');
  assert.match(src, /await typeAndSubmit\(\{/);
  assert.match(src, /screen: \(\) => terminalScreenLines\(ptyId\)/);
  const pool = fs.readFileSync(path.join(__dirname, '..', 'src/renderer/src/components/terminalPool.ts'), 'utf8');
  assert.match(pool, /export function terminalScreenLines\(ptyId: string\): string\[\] \| null/);
});
