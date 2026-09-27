'use strict';

/**
 * RESTORE TEAM EXISTS IN EVERY SKIN.
 *
 * Founder, item 3 (4 Sep 2026): "Restoring team is not working on the PRO
 * screen." The whole restore flow (the boot auto restore and the manual
 * "restore team" run) lives in one hook, useRestoreTeam, and the hook only
 * runs where a component mounts it. Its two mount points were both Classic
 * surfaces: AgentStrip, which App gates to skin === 'office', and
 * FullscreenTerminal, which App never draws over PRO. Under the professional
 * skin nothing mounted the hook, so the restorable list filled at boot and
 * then sat there forever; last session's team never respawned and no button
 * offered to.
 *
 * The fix is a headless RestoreTeamDriver mounted by App for the professional
 * skin. These pins make the defect class fail here instead of in front of the
 * founder: a skin whose branch mounts no restore driver, or a driver that
 * renders but forgot the hook, breaks this file.
 *
 * Structural by necessity: the defect was WHERE the hook mounts, which is
 * JSX, so the guarantees are pinned against the source the same way
 * test/pro-nav.test.cjs and test/skin-default.test.cjs pin App's mounts. No
 * react, no .tsx is executed here.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const app = read('src/renderer/src/App.tsx');
const hook = read('src/renderer/src/hooks/useRestoreTeam.ts');
const strip = read('src/renderer/src/components/AgentStrip.tsx');
const fullscreen = read('src/renderer/src/components/FullscreenTerminal.tsx');

test('PRO mounts the restore driver, with the config the hook rebuilds commands from', () => {
  // The exact mount, gated to the professional skin, config passed through:
  // without the config an old restorable entry with no saved command can
  // never be rebuilt (useRestoreTeam's buildSpawnCommand fallback).
  assert.match(
    app,
    /\{skin === 'professional' && <RestoreTeamDriver config=\{config\} \/>\}/,
    'App.tsx no longer mounts RestoreTeamDriver for the professional skin — PRO loses restore entirely'
  );
});

test('the driver actually arms the hook and renders nothing', () => {
  // A driver that returns null but forgot the hook call would reopen the bug
  // while keeping the mount pin above green, so the body is pinned too.
  const m = app.match(/function RestoreTeamDriver\(\{ config \}: \{ config: HarnessConfig \| null \}\) \{([\s\S]*?)\n\}/);
  assert.ok(m, 'RestoreTeamDriver is gone from App.tsx');
  assert.match(m[1], /useRestoreTeam\(config\);/, 'RestoreTeamDriver no longer calls useRestoreTeam');
  assert.match(m[1], /return null;/, 'RestoreTeamDriver must stay headless: PRO surfaces are owned by ProShell');
});

test('Classic keeps its two mounts and all mounts share one latch', () => {
  // The Classic surfaces still own their mounts; the driver is an addition,
  // not a migration that would strip the strip of its button state.
  assert.match(app, /\{skin === 'office' && <AgentStrip config=\{config\} \/>\}/);
  assert.match(strip, /useRestoreTeam\(config\)/, 'AgentStrip no longer mounts the restore hook');
  assert.match(fullscreen, /useRestoreTeam\(config\)/, 'FullscreenTerminal no longer mounts the restore hook');
  // Three simultaneous mounts are safe only because the auto restore latch is
  // module level in the hook, not per component. Move it into the component
  // and every mount starts its own boot restore.
  assert.match(hook, /^let autoStarted = false;$/m, 'the module level auto restore latch is gone from useRestoreTeam');
  assert.match(hook, /^let restoring = false;$/m, 'the module level in-flight flag is gone from useRestoreTeam');
});

test('every skin the app can render has a restore mount pinned here', () => {
  // Enumerate the skin union from its source of truth, so a third skin added
  // to AppSkin without a restore driver fails HERE, the same day, rather than
  // shipping the PRO bug again under a new name.
  const skinSrc = read('src/renderer/src/design/skin.ts');
  const union = skinSrc.match(/export type AppSkin = ([^;]+);/);
  assert.ok(union, 'AppSkin union not found; the guard is disarmed');
  const skins = [...union[1].matchAll(/'([a-z-]+)'/g)].map((x) => x[1]);
  assert.ok(skins.length >= 2, 'parser found fewer than two skins; the guard is disarmed');
  const mountFor = {
    office: /\{skin === 'office' && <AgentStrip config=\{config\} \/>\}/,
    professional: /\{skin === 'professional' && <RestoreTeamDriver config=\{config\} \/>\}/
  };
  for (const s of skins) {
    assert.ok(mountFor[s], `skin '${s}' has no restore mount registered in this test — mount one in App.tsx and pin it here`);
    assert.match(app, mountFor[s], `App.tsx lost the restore mount for skin '${s}'`);
  }
});
