'use strict';

/**
 * 0.5.3, bug 12 (Cryt, 10 Sep 2026, Windows): he deleted a harness config's
 * folder and it was still listed at launch. Nothing compared the remembered
 * list with the disk, on any platform. The rule is pure (@shared/hivePaths);
 * the launch prune is run here against a real temp disk, with Electron pointed
 * at a throwaway userData the way config-write-notify does it.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'md-bug12-userdata-'));
const electron = require.resolve('electron');
require.cache[electron] = { id: electron, filename: electron, loaded: true, exports: { app: { getPath: () => userData } } };

const { pruneDeletedHives, hiveFolderName } = loadTs('src/shared/hivePaths.ts');
const { writeConfig, readConfig, pruneRecentHivesOnDisk, probeHive } = loadTs('src/main/config.ts');
const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

test('only a folder a person deleted leaves the list', () => {
  const disk = { '/a': 'present', '/b': 'deleted', '/mnt/usb/c': 'unreachable', '/d': 'deleted' };
  const kept = pruneDeletedHives(['/a', '/b', '/mnt/usb/c', '/d'], '/a', (p) => disk[p]);
  assert.deepEqual(kept, ['/a', '/mnt/usb/c'], 'an unplugged drive is not evidence of anything');
});

test('the current home is never dropped, even when its folder is not there yet', () => {
  assert.deepEqual(pruneDeletedHives(['/new', '/old'], '/new', () => 'deleted'), ['/new'], 'a first run opens a folder that does not exist yet');
});

test('a Windows path gives its last folder as the row title, not the whole path', () => {
  assert.equal(hiveFolderName('C:\\Users\\cryt\\HarnessAgents'), 'HarnessAgents');
  assert.equal(hiveFolderName('C:\\Users\\cryt\\HarnessAgents\\'), 'HarnessAgents');
  assert.equal(hiveFolderName('/Users/you/HarnessAgents/'), 'HarnessAgents');
  assert.equal(hiveFolderName('C:/Users/cryt/mixed\\office'), 'office');
  assert.equal(hiveFolderName('solo'), 'solo');
});

test('on a real disk: delete a config folder, launch, and it is gone from the list and NOT made again', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'md-bug12-homes-'));
  const current = path.join(base, 'current');
  const kept = path.join(base, 'kept');
  const doomed = path.join(base, 'doomed');
  const offline = path.join(base, 'unplugged-drive', 'office');
  for (const d of [current, kept, doomed]) fs.mkdirSync(d, { recursive: true });
  // Remember all four, newest first, the way opening each in turn does.
  for (const h of [offline, doomed, kept, current]) writeConfig({ harnessHome: h });
  assert.deepEqual(readConfig().recentHives, [current, kept, doomed, offline]);

  assert.deepEqual(pruneRecentHivesOnDisk(), [], 'nothing deleted yet, nothing dropped, and the unplugged one stays');
  fs.rmSync(doomed, { recursive: true, force: true });
  assert.equal(probeHive(doomed), 'deleted');
  assert.equal(probeHive(offline), 'unreachable');

  assert.deepEqual(pruneRecentHivesOnDisk(), [doomed]);
  assert.deepEqual(readConfig().recentHives, [current, kept, offline]);
  assert.equal(readConfig().harnessHome, current, 'pruning the list does not move the home');
  assert.equal(fs.existsSync(doomed), false, 'and nothing made the folder again');
  assert.deepEqual(pruneRecentHivesOnDisk(), [], 'a second launch has nothing left to do and writes nothing');
  fs.rmSync(base, { recursive: true, force: true });
});

test('the prune runs once at launch, before any window asks for the list, and both pickers share the name rule', () => {
  const main = read('src/main/index.ts');
  const ready = main.slice(main.lastIndexOf('app.whenReady().then(() => {'));
  assert.match(ready.slice(0, 2500), /const gone = pruneRecentHivesOnDisk\(\);/);
  const cfg = read('src/main/config.ts');
  const readFn = cfg.slice(cfg.indexOf('export function readConfig()'), cfg.indexOf('function normalizeStoredHomes'));
  assert.doesNotMatch(readFn, /probeHive|existsSync\(h\)/, 'readConfig is hot: it must not probe the disk per call');
  for (const f of ['src/renderer/src/components/HivePicker.tsx', 'src/renderer/src/components/pro/onboarding/WorkspacePicker.tsx']) {
    assert.match(read(f), /const folderName = hiveFolderName;/, f);
    assert.doesNotMatch(read(f), /path\.split\('\/'\)/, f);
  }
});
