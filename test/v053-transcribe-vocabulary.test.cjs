/**
 * 0.5.3, F16, founder 23 Sep 2026: 100 to 150 default words for dictation and
 * meetings (founders, startups, AI, agents, models, companies, tools), plus
 * the user's own. The list is data the engines read; this pins its shape.
 */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const loadTs = require('./load-ts.cjs');

const { DEFAULT_TRANSCRIBE_VOCABULARY, vocabularyFor, whisperPromptFor, WHISPER_PROMPT_MAX_CHARS } = loadTs('src/shared/transcribeVocabulary.ts');

test('the default list is 100 to 150 entries, no duplicates, no blanks, no dashes', () => {
  const n = DEFAULT_TRANSCRIBE_VOCABULARY.length;
  assert.ok(n >= 100 && n <= 150, `founder asked for 100 to 150, list has ${n}`);
  const lower = DEFAULT_TRANSCRIBE_VOCABULARY.map((w) => w.toLowerCase());
  assert.equal(new Set(lower).size, n, 'a duplicate ignoring case');
  for (const w of DEFAULT_TRANSCRIBE_VOCABULARY) {
    assert.equal(w, w.trim(), `untrimmed: ${JSON.stringify(w)}`);
    assert.ok(w.length > 0);
    assert.doesNotMatch(w, /[–—]/, `dash in ${w}`);
  }
});

test('the list covers what the founder named: labs, models, agent tools, SaaS, startup words', () => {
  const has = (w) => DEFAULT_TRANSCRIBE_VOCABULARY.some((x) => x.toLowerCase() === w.toLowerCase());
  for (const w of ['Anthropic', 'Claude', 'OpenAI', 'Gemini', 'Grok', 'Cursor', 'Kubernetes', 'Slack', 'Notion', 'ARR', 'SaaS', 'Y Combinator', 'Munder Difflin', 'Stapler']) {
    assert.ok(has(w), `missing ${w}`);
  }
});

test('the user words come after the defaults, deduplicated ignoring case, blanks dropped, and the defaults can be switched off', () => {
  const v = vocabularyFor(['  Acme Corp ', 'claude', '', 'Zed'], true);
  assert.equal(v[0], DEFAULT_TRANSCRIBE_VOCABULARY[0]);
  assert.ok(v.includes('Acme Corp') && v.includes('Zed'));
  assert.equal(v.filter((w) => w.toLowerCase() === 'claude').length, 1, 'the user typing a default again adds nothing');
  assert.deepEqual(vocabularyFor(['Acme Corp'], false), ['Acme Corp']);
  assert.deepEqual(vocabularyFor(undefined, false), []);
});

test('the whisper prompt is the comma list, capped without cutting a word in half', () => {
  const p = whisperPromptFor(vocabularyFor([], true));
  assert.ok(p.startsWith('Munder Difflin, Stapler'));
  assert.ok(p.length <= WHISPER_PROMPT_MAX_CHARS);
  const long = whisperPromptFor(Array.from({ length: 400 }, (_, i) => `Word${i}`));
  assert.ok(long.length <= WHISPER_PROMPT_MAX_CHARS);
  assert.doesNotMatch(long, /,\s*$/);
  assert.match(long, /Word\d+$/, 'ends on a whole word');
});
