'use strict';

/* F16: the vocabulary prompt whisper gets as its initial prompt. The decoder
 * keeps only the LAST 224 tokens of a long prompt, so the user's own words go
 * last and trimming happens at the TAIL of the default list, which is in
 * priority order (Kevin, 23 Sep 2026). Red on the base:
 * src/main/transcribe/prompt.ts does not exist. */

const test = require('node:test');
const assert = require('node:assert/strict');
const loadTs = require('./load-ts.cjs');

const { buildWhisperPrompt, WHISPER_PROMPT_MAX_CHARS, WHISPER_PROMPT_MAX_TOKENS } = loadTs('src/main/transcribe/prompt.ts');

test('defaults first, custom words last, one comma separated line', () => {
  const p = buildWhisperPrompt({ defaultWords: ['Anthropic', 'Claude Code', 'OpenAI'], customWords: ['Munder Difflin', 'Stapler'] });
  assert.equal(p, 'Anthropic, Claude Code, OpenAI, Munder Difflin, Stapler');
});

test('duplicates collapse case insensitively and a custom word wins over the default copy', () => {
  const p = buildWhisperPrompt({ defaultWords: ['GitHub', 'github', 'Vercel'], customWords: ['GITHUB', 'Vercel '] });
  assert.equal(p, 'GITHUB, Vercel');
});

test('blank, comma bearing and whitespace only entries are dropped or cleaned', () => {
  const p = buildWhisperPrompt({ defaultWords: ['', '  ', 'a, b', 'x\ty'], customWords: [null, undefined, 'ok'] });
  assert.equal(p, 'a  b, x y, ok');
});

test('over budget, the tail of the default list is trimmed and every custom word survives', () => {
  const defaults = Array.from({ length: 50 }, (_, i) => `default${i}`);
  const custom = ['userword1', 'userword2'];
  const p = buildWhisperPrompt({ defaultWords: defaults, customWords: custom, maxChars: 120 });
  assert.ok(p.length <= 120, `prompt is ${p.length} chars`);
  assert.ok(p.endsWith('userword1, userword2'), p);
  assert.ok(p.startsWith('default0,'), 'the head of the default list is the part that stays');
  assert.ok(!p.includes('default49'), 'the tail of the default list is the part that goes');
});

test('nothing to say gives an empty string, not an empty list', () => {
  assert.equal(buildWhisperPrompt({}), '');
  assert.equal(buildWhisperPrompt({ defaultWords: [], customWords: ['', ' '] }), '');
});

test('the default budget matches the whisper.cpp limit of 224 prompt tokens', () => {
  assert.equal(WHISPER_PROMPT_MAX_TOKENS, 224);
  // About four characters per token for comma separated product names; the
  // measured 150 word list is 1,1xx chars and ~280 tokens, so the budget must
  // sit under that or the head of the list is silently dropped by the decoder.
  assert.ok(WHISPER_PROMPT_MAX_CHARS >= 600 && WHISPER_PROMPT_MAX_CHARS <= 1000, String(WHISPER_PROMPT_MAX_CHARS));
});
