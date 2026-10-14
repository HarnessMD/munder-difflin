// opencode data-dir isolation (fork fix for the desktop-2.x global-db skew).
//
// Desktop OpenCode 2.x migrates ~/.local/share/opencode to a schema the
// bundled CLI 1.x cannot open, hanging every harness opencode spawn at
// startup with a blank terminal. The spawn path must point XDG_DATA_HOME at
// a hive-scoped dir (opencode-only; auth and other CLIs untouched).
// Text-based like the other contract tests: what matters is the spawn env.
'use strict';

const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { test } = require('node:test');

const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'src', 'main', 'index.ts'), 'utf8');

test('opencode spawns get a hive-scoped XDG_DATA_HOME', () => {
  const assigns = src.match(/extra\.XDG_DATA_HOME\s*=/g) ?? [];
  assert.equal(assigns.length, 1, `exactly one XDG_DATA_HOME assignment, found ${assigns.length}`);
  assert.match(src, /extra\.XDG_DATA_HOME = join\(home, '\.opencode-data'\)/,
    'the dir must be home-anchored and dot-prefixed (out of git and mining paths)');
});

test('the isolation lives in the opencode-only branch', () => {
  const start = src.indexOf("if (provider === 'opencode') {");
  assert.ok(start >= 0, 'opencode-only branch missing');
  const end = src.indexOf('opts.env = { ...(opts.env', start);
  assert.ok(end > start, 'opencode branch end missing');
  const block = src.slice(start, end);
  assert.ok(block.includes('extra.XDG_DATA_HOME'), 'XDG_DATA_HOME must be set inside the opencode branch');
  assert.ok(block.includes('OPENCODE_CONFIG_CONTENT'), 'config injection must stay alongside');
});

test('no other provider inherits the override', () => {
  // crush/pi/qwen share the outer BYOK branch but must keep their own XDG paths.
  const outer = src.slice(
    src.indexOf("provider === 'opencode' || provider === 'crush'"),
    src.indexOf('extra.OPENCODE_CONFIG_CONTENT')
  );
  assert.ok(!outer.includes('XDG_DATA_HOME'), 'the shared BYOK section must not set it');
});
