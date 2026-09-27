'use strict';

/* 0.5.3, B23 part 2 (Kevin, 23 Sep 2026): a floor is a process. New Floor
 * spawns the same binary with its own data folder and the main install's
 * folder as the shared one, where the solo licence and the solo device key
 * live. The pure part (flags, folder per hive, spawn plan, env) is tested as
 * plain node; the wiring in index.ts and soloLicense.ts is pinned by text.
 * Red on b0694d72: src/main/floorArgs.ts does not exist and floor:open
 * answers no-spawner. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const {
  FLOOR_DATA_FLAG, FLOOR_SHARED_FLAG, FLOOR_HOME_FLAG, FLOORS_DIR,
  parseFloorArgs, floorDataDirFor, floorSpawnPlan, floorSpawnEnv, seedFloorConfig, FLOOR_CONFIG_STRIP
} = loadTs('src/main/floorArgs.ts');

const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const main = path.resolve('/tmp/md-main');
const floor = path.resolve('/tmp/md-main/floors/abc');
const home = path.resolve('/tmp/hives/two');

test('the main install has no floor args; a floor has both folders and the home', () => {
  assert.equal(parseFloorArgs(['/bin/app']), null);
  assert.equal(parseFloorArgs(['/bin/app', `${FLOOR_DATA_FLAG}${floor}`]), null, 'a data folder alone is not a floor');
  assert.equal(parseFloorArgs(['/bin/app', `${FLOOR_SHARED_FLAG}${main}`]), null, 'a shared folder alone is not a floor');
  const a = parseFloorArgs(['/bin/app', `${FLOOR_DATA_FLAG}${floor}`, `${FLOOR_SHARED_FLAG}${main}`, `${FLOOR_HOME_FLAG}${home}`]);
  assert.deepEqual(a, { dataDir: floor, sharedDir: main, home });
  const noHome = parseFloorArgs(['/bin/app', `${FLOOR_DATA_FLAG}${floor}`, `${FLOOR_SHARED_FLAG}${main}`]);
  assert.equal(noHome.home, null, 'a floor relaunched later carries no home; its config already has one');
});

test('the env forms work for the test runner and the flags win over them', () => {
  const e = parseFloorArgs([], { MD_FLOOR_DATA: floor, MD_FLOOR_SHARED: main, MD_FLOOR_HOME: home });
  assert.deepEqual(e, { dataDir: floor, sharedDir: main, home });
  const both = parseFloorArgs([`${FLOOR_DATA_FLAG}${floor}2`], { MD_FLOOR_DATA: floor, MD_FLOOR_SHARED: main });
  assert.equal(both.dataDir, `${floor}2`);
});

test('a floor on the main data folder, or on a relative one, is refused', () => {
  assert.equal(parseFloorArgs([`${FLOOR_DATA_FLAG}${main}`, `${FLOOR_SHARED_FLAG}${main}`]), null, 'same folder: it would share the main lock');
  assert.equal(parseFloorArgs([`${FLOOR_DATA_FLAG}floors/abc`, `${FLOOR_SHARED_FLAG}${main}`]), null);
  assert.equal(parseFloorArgs([`${FLOOR_DATA_FLAG}${floor}`, `${FLOOR_SHARED_FLAG}${main}`, `${FLOOR_HOME_FLAG}hives/two`]).home, null, 'a relative home is dropped, not trusted');
});

test('one data folder per hive under floors/, stable across launches, never the path itself', () => {
  const a = floorDataDirFor(main, home);
  assert.equal(path.dirname(a), path.join(main, FLOORS_DIR));
  assert.equal(a, floorDataDirFor(main, home), 'stable');
  assert.equal(a, floorDataDirFor(main, `${home}${path.sep}..${path.sep}two`), 'resolved before hashing');
  assert.notEqual(a, floorDataDirFor(main, path.resolve('/tmp/hives/three')));
  assert.match(path.basename(a), /^[0-9a-f]{12}$/);
});

test('the spawn plan: packaged runs the executable with the flags; dev hands electron the app folder first', () => {
  const p = floorSpawnPlan({ execPath: '/Applications/MD.app/Contents/MacOS/MD', appPath: '/x', packaged: true, dataDir: floor, sharedDir: main, home });
  assert.equal(p.command, '/Applications/MD.app/Contents/MacOS/MD');
  assert.deepEqual(p.args, [`${FLOOR_DATA_FLAG}${floor}`, `${FLOOR_SHARED_FLAG}${main}`, `${FLOOR_HOME_FLAG}${home}`]);
  const d = floorSpawnPlan({ execPath: '/repo/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron', appPath: '/repo/out/main', packaged: false, dataDir: floor, sharedDir: main, home });
  assert.equal(d.args[0], '/repo/out/main');
  assert.equal(d.args.length, 4);
  assert.deepEqual(parseFloorArgs(['electron', ...d.args]), { dataDir: floor, sharedDir: main, home }, 'the plan parses back to itself');
});

test('the child env drops the dev override and the floor env forms, keeps the rest', () => {
  const e = floorSpawnEnv({ PATH: '/bin', MD_USER_DATA: '/dev-data', MD_FLOOR_DATA: floor, MD_FLOOR_SHARED: main, MD_FLOOR_HOME: home, ELECTRON_RENDERER_URL: 'http://localhost:5173' });
  assert.deepEqual(e, { PATH: '/bin', ELECTRON_RENDERER_URL: 'http://localhost:5173' });
});

test('a floor\'s first config is the main install\'s minus what is per hive or per listener, on the picker\'s folder', () => {
  const mainCfg = {
    onboardingComplete: true, audience: 'technical', groqApiKey: 'gsk_x', defaultModel: 'claude-opus-5-5', transcribe: { anyApp: true },
    harnessHome: '/Users/me/hive-one', recentHives: ['/Users/me/hive-one', '/Users/me/old'], registeredRepos: ['/r'],
    missions: [{ id: 'standup' }], opsStandupSeeded: true, heartbeatSeeded: true, compactMaintenanceSeeded: true,
    agentTokenCaps: { god: 1 }, agentMcp: { god: {} }, autoDeliveryPausedAgents: ['x'], avatars: { god: 'a.png' },
    slackEnabled: true, slackBotToken: 'xoxb', slackSigningSecret: 's', slackChannelId: 'C1', slackPort: 3847, slackMode: 'socket', slackProactivePosting: true,
    webhookEnabled: true, webhookSecret: 'w', webhookPort: 3849, webhookTriggers: [{ id: 't' }]
  };
  const f = seedFloorConfig(mainCfg, home);
  assert.equal(f.onboardingComplete, true, 'the wizard never shows in a floor');
  assert.equal(f.groqApiKey, 'gsk_x', 'the key comes along: same person, same machine');
  assert.equal(f.defaultModel, 'claude-opus-5-5');
  assert.deepEqual(f.transcribe, { anyApp: true });
  assert.equal(f.harnessHome, home);
  assert.deepEqual(f.recentHives, [home]);
  assert.equal(f.slackEnabled, false);
  assert.equal(f.webhookEnabled, false);
  for (const k of FLOOR_CONFIG_STRIP) if (!['harnessHome', 'recentHives', 'slackEnabled', 'webhookEnabled'].includes(k)) assert.equal(k in f, false, `${k} is per hive or per listener`);
  assert.deepEqual(seedFloorConfig({}, home), { harnessHome: home, recentHives: [home], slackEnabled: false, webhookEnabled: false }, 'a main install with no config yet seeds the folder alone');
});

test('main: the flags are read before the single instance lock, the spawner is registered, and a floor keeps the updater, deep links and the any app hotkey off', () => {
  const src = read('src/main/index.ts');
  const at = (re) => { const m = src.search(re); assert.ok(m >= 0, `missing ${re}`); return m; };
  const flags = at(/const floorArgs = parseFloorArgs\(process\.argv, process\.env\);/);
  assert.ok(flags < at(/const gotInstanceLock = app\.requestSingleInstanceLock\(\);/), 'the data folder moves before the lock is taken');
  assert.match(src, /if \(floorArgs\) \{\s*\n\s*app\.setPath\('userData', floorArgs\.dataDir\);\s*\n\s*setSharedDataDir\(floorArgs\.sharedDir\);/);
  assert.match(src, /if \(floorArgs\.home && !existsSync\(floorConfig\)\) \{/, 'the seed is written once, on the first boot only');
  assert.match(src, /JSON\.parse\(readFileSync\(join\(floorArgs\.sharedDir, 'config\.json'\), 'utf8'\)\)/, 'seeded from the main install');
  assert.match(src, /writeFileSync\(floorConfig, JSON\.stringify\(seedFloorConfig\(seed, floorArgs\.home\), null, 2\), 'utf8'\);/);
  assert.match(src, /setFloorSpawner\(\(\{ harnessHome \}\) => \{/);
  assert.match(src, /const dataDir = floorDataDirFor\(sharedDir, harnessHome\);/);
  assert.match(src, /spawn\(plan\.command, plan\.args, \{ detached: true, stdio: 'ignore', env: floorSpawnEnv\(process\.env\) \}\)/);
  assert.match(src, /child\.once\('spawn', \(\) => \{ child\.unref\(\);/);
  assert.match(src, /child\.once\('error', \(e\) => done\(\{ ok: false, error: e\.message \}\)\)/);
  assert.match(src, /if \(!isFloorProcess\(\)\) initAutoUpdater\(\(\) => liveWebContents\(\)\);/);
  assert.match(src, /if \(isFloorProcess\(\)\) \{\s*\n\s*\/\* the main install owns munderdifflin:\/\/ \*\/\s*\n\s*\} else if \(process\.defaultApp\)/);
  assert.match(src, /if \(isFloorProcess\(\)\) return \{ ok: false, error: 'main-floor-only'/);
  // F16 Windows and Linux (#60): one function answers why the key is off, and
  // a floor is its first answer (anyAppReason passes { floor: isFloorProcess() }).
  assert.match(src, /if \(anyAppReason\(\)\) return;\s*\n\s*if \(!t\.anyApp\)/);
  assert.match(src, /const anyAppReason = \(\) => anyAppUnavailableReason\(anyAppResources\(\), process\.platform, process\.env, \{ floor: isFloorProcess\(\) \}\);/);
});

test('the solo licence and the solo device key are read from the shared folder, so a floor is the same licensed machine', () => {
  const lic = read('src/main/soloLicense.ts');
  assert.match(lic, /import \{ sharedDataDir \} from '\.\/sharedData';/);
  assert.match(lic, /function filePath\(\): string \{\s*\n\s*return join\(sharedDataDir\(\), 'teams', 'license\.json'\);/);
  assert.match(lic, /function deviceKeyPath\(\): string \{\s*\n\s*return join\(sharedDataDir\(\), 'teams', 'solo-device\.json'\);/);
  assert.doesNotMatch(lic, /join\(app\.getPath\('userData'\)/, 'nothing in the licence module is per floor any more');
  const shared = read('src/main/sharedData.ts');
  assert.match(shared, /export function sharedDataDir\(\): string \{ return shared \?\? app\.getPath\('userData'\); \}/, 'the main install is its own shared folder: nothing moves for a machine without floors');
});
