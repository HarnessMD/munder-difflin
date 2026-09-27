'use strict';

/* B23 point 5: the hook shims named by a user's GLOBAL CLI configs
 * (~/.gemini/config/hooks.json, ~/.gemini/antigravity-cli/hooks.json,
 * ~/.grok/hooks/munder-hive.json) used to live under <hive root>/bin/, one copy
 * per floor. Two floors wrote the same text to two paths and the last writer
 * owned the hook file, which then broke when that floor's hive moved or was
 * deleted, or when the floors ran different app versions.
 *
 * Now the shim (and the bundled node launcher it runs under, which carries the
 * app's execPath) is written ONCE per user, under a content hashed directory in
 * the shared bin, and the hook files name that copy. The per floor copy is still
 * written for one release so a floor on 0.5.2 keeps working. Red on 4cb8c840:
 * HiveManager has no setSharedBinDir. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { HiveManager, shimBundleHash } = loadTs('src/main/hive.ts');
const POSIX = process.platform !== 'win32';
const LAUNCHER = POSIX ? 'hive-node' : 'hive-node.cmd';

function isolated(t) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'md-shared-shim-'));
  const home = path.join(base, 'user');
  fs.mkdirSync(home, { recursive: true });
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const realHome = process.env.HOME;
  const realProfile = process.env.USERPROFILE;
  process.env.HOME = home;
  process.env.USERPROFILE = home;
  t.after(() => {
    if (realHome === undefined) delete process.env.HOME; else process.env.HOME = realHome;
    if (realProfile === undefined) delete process.env.USERPROFILE; else process.env.USERPROFILE = realProfile;
  });
  assert.equal(os.homedir(), home, 'home redirect failed, aborting before touching the real home');
  return { home, shared: path.join(base, 'appData', 'munder-difflin', 'shared', 'bin'), floorA: path.join(base, 'floor-a'), floorB: path.join(base, 'floor-b') };
}

const hookFiles = (home) => [
  path.join(home, '.gemini', 'config', 'hooks.json'),
  path.join(home, '.gemini', 'antigravity-cli', 'hooks.json'),
  path.join(home, '.grok', 'hooks', 'munder-hive.json')
];

/** Every "command" string in a hook json. */
function commandsIn(file) {
  const text = fs.readFileSync(file, 'utf8');
  return [...text.matchAll(/"command"\s*:\s*"((?:[^"\\]|\\.)*)"/g)].map((m) => JSON.parse(`"${m[1]}"`));
}

function installFrom(floor, shared) {
  const hive = new HiveManager(() => floor);
  hive.setSharedBinDir(shared);
  hive.installAgyHooks();
  hive.installGrokHooks();
  return hive;
}

test('two floors write one shared shim bundle and every hook file names it', (t) => {
  const { home, shared, floorA, floorB } = isolated(t);
  installFrom(floorA, shared);
  installFrom(floorB, shared);
  // Run the first writer again: idempotent, nothing new appears.
  installFrom(floorA, shared);

  const bundles = fs.readdirSync(shared);
  assert.equal(bundles.length, 1, `expected one content hashed bundle, got ${JSON.stringify(bundles)}`);
  const dir = path.join(shared, bundles[0]);
  assert.deepEqual(fs.readdirSync(dir).sort(), ['agy-hook.cjs', 'grok-hook.cjs', LAUNCHER].sort());
  if (POSIX) assert.ok(fs.statSync(path.join(dir, LAUNCHER)).mode & 0o111, 'launcher must be executable');

  for (const file of hookFiles(home)) {
    assert.ok(fs.existsSync(file), `${file} was not written`);
    const commands = commandsIn(file).filter((c) => /agy-hook\.cjs|grok-hook\.cjs/.test(c));
    assert.ok(commands.length > 0, `${file} names no shim`);
    for (const c of commands) {
      assert.ok(c.includes(dir), `${file}: hook command does not name the shared bundle: ${c}`);
      assert.ok(!c.includes(floorA) && !c.includes(floorB), `${file}: hook command still names a floor: ${c}`);
      assert.ok(c.includes(path.join(dir, LAUNCHER)), `${file}: hook command must run under the shared launcher: ${c}`);
    }
  }

  // The floor copies survive for one release, a 0.5.2 floor still points its hook file at them.
  for (const floor of [floorA, floorB]) {
    for (const shim of ['agy-hook.cjs', 'grok-hook.cjs']) {
      assert.ok(fs.existsSync(path.join(floor, 'hive', 'bin', shim)), `${floor} lost its legacy ${shim}`);
    }
  }
});

test('the bundle directory is the hash of its own text and changes when the text does', (t) => {
  const { shared, floorA } = isolated(t);
  installFrom(floorA, shared);
  const [name] = fs.readdirSync(shared);
  const dir = path.join(shared, name);
  const files = {};
  for (const f of fs.readdirSync(dir)) files[f] = fs.readFileSync(path.join(dir, f), 'utf8');
  assert.equal(name, shimBundleHash(files), 'the directory name is not the hash of the files inside it');
  const changed = shimBundleHash({ ...files, 'agy-hook.cjs': files['agy-hook.cjs'] + '\n// a newer app\n' });
  assert.notEqual(changed, name, 'a changed shim text must land in a new directory');
  const moved = shimBundleHash({ ...files, [LAUNCHER]: files[LAUNCHER].replace(process.execPath, '/Applications/Other.app/Contents/MacOS/Other') });
  assert.notEqual(moved, name, 'a moved or updated app (new execPath) must land in a new directory');
});

test('without a shared dir the installers keep the per floor paths (headless and 0.5.2 behaviour)', (t) => {
  const { home, floorA } = isolated(t);
  const hive = new HiveManager(() => floorA);
  hive.installAgyHooks();
  hive.installGrokHooks();
  for (const file of hookFiles(home)) {
    for (const c of commandsIn(file).filter((x) => /agy-hook\.cjs|grok-hook\.cjs/.test(x))) {
      assert.ok(c.includes(path.join(floorA, 'hive', 'bin')), `${file}: expected the floor path, got ${c}`);
    }
  }
});
