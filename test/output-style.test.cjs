'use strict';

/* 0.5.3 feature 19: concise output by default, per provider, user can change it. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { normalizeClaudeOutputStyle, DEFAULT_CLAUDE_OUTPUT_STYLE, CLAUDE_OUTPUT_STYLES } = loadTs('src/shared/outputStyle.ts');
const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

test('concise is the default, for unset and for junk', () => {
  assert.equal(DEFAULT_CLAUDE_OUTPUT_STYLE, 'Concise');
  for (const v of [undefined, null, '', '   ', 7, {}, 'a\nb', '"; rm -rf', 'x'.repeat(61), '-leading']) {
    assert.equal(normalizeClaudeOutputStyle(v), 'Concise', JSON.stringify(v));
  }
});

test('the user can change it: a shipped style, off, or a style of their own', () => {
  for (const v of CLAUDE_OUTPUT_STYLES) assert.equal(normalizeClaudeOutputStyle(v), v);
  assert.equal(normalizeClaudeOutputStyle('default'), 'default', 'default is how it is turned off');
  assert.equal(normalizeClaudeOutputStyle('  My House Style  '), 'My House Style');
});

test('HAS IT RUN: the setting reaches the file Claude Code reads, from config, on every spawn', () => {
  const hive = read('src/main/hive.ts');
  assert.match(hive, /outputStyle: normalizeClaudeOutputStyle\(outputStyle\)/, 'the generated settings never carry outputStyle');
  assert.match(hive, /this\.hookSettings\(shim, meta\.cwd, opts\.mcpDefaults, opts\.theme, this\.sandboxWritableDirs\([^)]*\), opts\.outputStyle\)/, 'ensureAgent does not pass it through');
  const index = read('src/main/index.ts');
  assert.match(index, /outputStyle: readConfig\(\)\.claudeOutputStyle/, 'the spawn never reads the config');
  for (const f of ['src/main/config.ts', 'src/preload/index.ts', 'src/renderer/src/store/config.ts']) {
    assert.match(read(f), /claudeOutputStyle\?: string;/, `${f} does not declare it`);
  }
  const section = read('src/renderer/src/components/ResponseStyleSection.tsx');
  // 0.5.3, one Save: the pick is staged in the page's draft and the footer Save writes it.
  assert.match(section, /useConfigValue\(config, 'claudeOutputStyle', /, 'the user cannot change it');
  assert.match(section, /onChange=\{\(e\) => stageOutputStyle\(e\.target\.value\)\}/, 'the pick is not staged');
});

test('the brief still reaches the engines that have no such setting', () => {
  // Feature 19's other half already existed; pin it so it cannot quietly go.
  assert.match(read('src/main/hooks.ts'), /renderResponseStyle\(/);
  assert.match(read('src/renderer/src/hooks/useHive.ts'), /renderResponseStyle|responseStyle\.current/);
});

test('every string exists in all three locales without a dash', () => {
  for (const l of ['en', 'zh-CN', 'ar']) {
    const rs = JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`)).responseStyle;
    for (const k of ['claudeStyleLabel', 'claudeStyleDesc', 'claudeStyleOff', 'claudeStyleApplies']) {
      assert.ok(typeof rs[k] === 'string' && rs[k].length > 0, `${l} responseStyle.${k}`);
      assert.doesNotMatch(rs[k], /[–—]|\s-\s/, `${l} responseStyle.${k} carries a dash`);
    }
  }
});
