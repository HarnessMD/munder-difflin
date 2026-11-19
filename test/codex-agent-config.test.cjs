'use strict';

// Each hive Codex agent's own config.toml (a copy of the person's) turns every enabled plugin
// off and caps each tool output the model sees at 4000 tokens. Line based, so the person's
// comments and other keys stay; their own file is only read.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const loadTs = require(path.join(ROOT, 'test/load-ts.cjs'));
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const K = loadTs('src/main/codexAgentConfig.ts');

const SEED = [
  '# my settings',
  'model = "gpt-5"',
  'tool_output_token_limit = 99999',
  '',
  '[plugins.browser]',
  'enabled = true # I like it',
  '',
  '[plugins."office docs"]',
  'note = "x"',
  '',
  '[plugins.done]',
  'enabled = false',
  '',
  '[plugins.browser.settings]',
  'enabled = true',
  '',
  '[mcp_servers.git]',
  'enabled = true',
  'tool_output_token_limit = 5'
].join('\n');

test('every enabled plugin is off; a plugin table with no enabled key gets one; nothing else changes', () => {
  const { text, disabled } = K.disableCodexPlugins(SEED);
  const lines = text.split('\n');
  assert.ok(disabled >= 2);
  assert.equal(lines[lines.indexOf('[plugins.browser]') + 1], 'enabled = false # munder-hive: plugins are off for hive agents');
  const docs = lines.indexOf('[plugins."office docs"]');
  assert.deepEqual(lines.slice(docs, docs + 4), ['[plugins."office docs"]', 'note = "x"', 'enabled = false # munder-hive: plugins are off for hive agents', ''], 'before the blank separator');
  assert.equal(lines[lines.indexOf('[plugins.done]') + 1], 'enabled = false', 'already off: as written, not counted');
  assert.equal(lines[lines.indexOf('[mcp_servers.git]') + 1], 'enabled = true', 'an MCP server is not a plugin');
  assert.ok(text.startsWith('# my settings\nmodel = "gpt-5"'), 'the person\'s comments and keys stay');
  assert.deepEqual(K.disableCodexPlugins('model = "x"'), { text: 'model = "x"', disabled: 0 });
});

test('a plugin\'s sub-table is not a plugin: its keys are left as written', () => {
  const { text, disabled } = K.disableCodexPlugins(SEED);
  const lines = text.split('\n');
  assert.equal(lines[lines.indexOf('[plugins.browser.settings]') + 1], 'enabled = true');
  assert.equal(disabled, 2, 'browser and office docs only');
  const sub = K.disableCodexPlugins('[plugins.tools.limits]\nmax = 3').text;
  assert.equal(sub, '[plugins.tools.limits]\nmax = 3', 'nothing added to a sub-table');
});

test('the cap: 4000, first in the file; the seed\'s own top level value replaced, never doubled; a key inside a table untouched', () => {
  assert.equal(K.CODEX_TOOL_OUTPUT_TOKEN_LIMIT, 4000);
  const out = K.codexAgentConfig(SEED);
  const top = out.slice(0, out.indexOf('[plugins.browser]'));
  assert.equal((top.match(/^tool_output_token_limit = /gm) ?? []).length, 1);
  assert.match(out, /^# --- munder-hive: per-agent limits \(auto-generated; do not edit\) ---\ntool_output_token_limit = 4000\n\n# my settings\n/);
  assert.ok(!out.includes('99999'));
  assert.match(out, /\[mcp_servers\.git\]\nenabled = true\ntool_output_token_limit = 5$/);
  assert.match(K.codexAgentConfig(''), /^# --- munder-hive[^\n]*\ntool_output_token_limit = 4000\n/);
  assert.equal(K.setCodexTopLevelKeys('"x" = 1\ny = 2', { x: null }), 'y = 2', 'a quoted key matches; null only removes');
});

test('wiring: our copy is made from the person\'s file, which is only read', () => {
  const hive = read('src/main/hive.ts');
  assert.match(hive, /let config = codexAgentConfig\(existsSync\(join\(userHome, 'config\.toml'\)\)\s*\? readFileSync\(join\(userHome, 'config\.toml'\), 'utf8'\) : ''\);/);
  assert.doesNotMatch(hive, /writeFileSync\(join\(userHome, 'config\.toml'\)/);
});
