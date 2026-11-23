'use strict';

// Onboarding's picker starts in the system language. Chinese is matched by
// script: a Traditional Chinese system lands on zh-TW, a Simplified one on
// zh-CN, and neither is ever moved to the other script.

const test = require('node:test');
const assert = require('node:assert/strict');
const loadTs = require('./load-ts.cjs');

const { systemLanguageOf } = loadTs('src/renderer/src/i18n/systemLanguage.ts');

const ALL = ['en', 'de', 'es', 'fr', 'it', 'pt-BR', 'tr', 'ar', 'ja', 'ko', 'zh-CN', 'zh-TW'];
const NO_TW = ALL.filter((c) => c !== 'zh-TW');

test('Traditional Chinese systems pick zh-TW', () => {
  for (const tag of ['zh-TW', 'zh-tw', 'zh_TW', 'zh-Hant', 'zh-Hant-TW', 'zh-HK', 'zh-MO', 'zh-Hant-HK']) {
    assert.equal(systemLanguageOf([tag], ALL), 'zh-TW', tag);
  }
});

test('Simplified Chinese systems pick zh-CN', () => {
  for (const tag of ['zh', 'zh-CN', 'zh-SG', 'zh-Hans', 'zh-Hans-CN', 'zh-Hans-HK']) {
    assert.equal(systemLanguageOf([tag], ALL), 'zh-CN', tag);
  }
});

test('a Traditional Chinese system is never moved to Simplified', () => {
  assert.equal(systemLanguageOf(['zh-TW'], NO_TW), 'en');
  assert.equal(systemLanguageOf(['zh-HK', 'ja'], NO_TW), 'ja');
});

test('a Simplified Chinese system is never moved to Traditional', () => {
  const noCn = ALL.filter((c) => c !== 'zh-CN');
  assert.equal(systemLanguageOf(['zh-CN'], noCn), 'en');
  assert.equal(systemLanguageOf(['zh'], noCn), 'en');
});

test('other languages are unchanged', () => {
  assert.equal(systemLanguageOf(['pt'], ALL), 'pt-BR');
  assert.equal(systemLanguageOf(['de-AT'], ALL), 'de');
  assert.equal(systemLanguageOf(['xx'], ALL), 'en');
  assert.equal(systemLanguageOf([], ALL), 'en');
});
