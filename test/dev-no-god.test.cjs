// `--no-god`: the dev switch that keeps a UI check from booting a paid
// orchestrator (hive card dev-launch-spawns-a-real-paid-agent). Three facts:
// it is a dev-only flag, main answers it over one door, and the renderer's
// god bootstrap asks before it spawns.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

test('the switch is dead in a packaged app', () => {
  const main = read('src/main/index.ts');
  assert.match(main, /const DEV_NO_GOD = !app\.isPackaged && \(process\.argv\.includes\('--no-god'\) \|\| process\.env\.MD_NO_GOD === '1'\)/);
  assert.match(main, /ipcMain\.handle\('dev:noGod', \(\): boolean => DEV_NO_GOD\)/);
});

test('the renderer asks before it spawns, after the live-PTY check, before spawnPty', () => {
  const hive = read('src/renderer/src/hooks/useHive.ts');
  // The live check is now `godRunning(listing, GOD_PTY)` (shared/godBoot.ts): a
  // listing that failed is no longer read as an empty floor. The order is the same.
  const live = hive.indexOf("godRunning(listing, GOD_PTY) === 'yes'");
  const ask = hive.indexOf('window.cth.devNoGod?.()');
  const spawn = hive.indexOf('window.cth.spawnPty({\n        id: GOD_PTY');
  assert.ok(live > 0 && ask > live && spawn > ask, 'the no-god check must sit between the live check and the spawn');
  assert.match(hive, /devNoGod\?\.\(\)\.catch\(\(\) => false\)/, 'an old preload without the door must mean "spawn as before"');
  assert.match(read('src/preload/index.ts'), /devNoGod: \(\): Promise<boolean> => ipcRenderer\.invoke\('dev:noGod'\)/);
});
