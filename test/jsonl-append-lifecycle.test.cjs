'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'src/main/index.ts'), 'utf8')
  .replace(/\r\n/g, '\n');

function section(start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  assert.ok(from >= 0, `missing section start: ${start}`);
  assert.ok(to > from, `missing section end: ${end}`);
  return source.slice(from, to);
}

function assertOrder(text, labels) {
  let previous = -1;
  for (const label of labels) {
    const at = text.indexOf(label);
    assert.ok(at > previous, `${label} must appear after the previous lifecycle step`);
    previous = at;
  }
}

test('home changes close append files after services stop and before copying', () => {
  const changeHome = section("ipcMain.handle('config:changeHome'", "ipcMain.handle('fs:listDir'");
  assertOrder(changeHome, ['hive.stopRouter()', 'hive.closeAppendFiles()', 'cpSync(']);
});

test('full reset closes append files before deleting the Hive root', () => {
  const reset = section("ipcMain.handle('app:resetAll'", "ipcMain.handle('hive:agentUsage'");
  assertOrder(reset, ['hive.removeExposedCodexData()', 'hive.closeAppendFiles()', 'rmSync(']);
});

test('hard and direct quit paths both close append files', () => {
  const hardQuit = section('function teardownAndQuit()', "ipcMain.handle('app:confirmClose'");
  assertOrder(hardQuit, ['ptyManager.killAll()', 'hive.closeAppendFiles()', 'app.quit()']);

  const directQuit = section("app.on('will-quit'", 'analytics.endSession()');
  assert.match(directQuit, /hive\.closeAppendFiles\(\)/);
});
