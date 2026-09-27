'use strict';
// 0.5.3 (founder, 23 Sep 2026): "Michael cannot spawn temps by default, which
// should not be the case."
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

test('the default is on, and every reader treats unset as on', () => {
  assert.match(read('src/main/config.ts'), /\n  orchestratorMaySpawn: true,/);
  const main = read('src/main/index.ts');
  assert.match(main, /const maySpawn = readConfig\(\)\.orchestratorMaySpawn !== false;/);
  assert.match(main, /hive\.setOrchestratorMaySpawn\(readConfig\(\)\.orchestratorMaySpawn !== false\)/);
  assert.match(read('src/main/hive.ts'), /private _maySpawn = true;/);
  assert.match(read('src/renderer/src/components/SettingsModal.tsx'), /cfgX\.orchestratorMaySpawn !== false/);
  assert.match(read('src/renderer/src/components/pro/god/ConfigTab.tsx'), /config\?\.orchestratorMaySpawn !== false/);
});

test('an install with the old saved false is flipped once, and a later Off sticks', () => {
  const src = read('src/main/config.ts');
  const fn = src.slice(src.indexOf('function migrateTempsOnV053'), src.indexOf('function migrateTriggersV1'));
  assert.match(fn, /if \(cfg\.tempsOnMigratedV053 \|\| tempsMigrationRan\) return cfg;/);
  assert.match(fn, /orchestratorMaySpawn: true, tempsOnMigratedV053: true/);
  assert.match(fn, /persistConfig\(next\)/);
  assert.match(src, /migrateTempsOnV053\(migrateTriggersV1\(/);
});
