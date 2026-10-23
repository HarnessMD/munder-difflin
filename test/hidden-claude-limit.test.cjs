'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const pty = require('node-pty');
const loadTs = require('./load-ts.cjs');
const shell = loadTs('src/main/shellEnv.ts');
const { runHiddenClaude } = loadTs('src/main/hiddenClaude.ts');

for (const captureLimits of [true, false]) {
  test(`hidden Claude quota without a transcript is preserved only when opted in (${captureLimits})`, async t => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'md hidden limit '));
    t.after(() => fs.rmSync(home, { recursive: true, force: true }));
    t.mock.method(os, 'homedir', () => home);
    t.mock.method(shell, 'resolveCommand', value => value);
    t.mock.method(shell, 'userShellPath', () => process.env.PATH);
    let onData, killed = 0;
    t.mock.method(pty, 'spawn', (file, args) => {
      assert.equal(file, '/a path/claude'); assert.equal(args[1], 'test-model');
      return { pid: undefined, kill() { killed++; }, write() {}, onData(cb) { onData = cb; }, onExit(cb) {
        setImmediate(() => { onData("\x1b[31mYou've hit your weekly limit · resets Sep 25, 6am (UTC)\x1b[0m"); cb(); });
      } };
    });
    const result = await runHiddenClaude('text transform', { cwd: home, command: '"/a path/claude"', model: 'test-model', captureLimits });
    assert.equal(result.ok, false); assert.equal(killed, 1);
    assert.match(result.error, captureLimits ? /weekly limit.*resets Sep 25/ : /no assistant response/);
  });
}
