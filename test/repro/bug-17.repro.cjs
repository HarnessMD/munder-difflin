'use strict';

// Repro for: persistConfig writes config.json non-atomically; a crash mid-write
// truncates it, and readConfig silently resets the entire config to defaults.
//
// src/main/config.ts:639-654 — persistConfig flushes every settings save with a
// bare `writeFileSync(p, JSON.stringify(next, null, 2), 'utf8')` DIRECTLY over
// the live config.json. No temp file, no rename, no fsync — truncate-then-write.
// Every other durable store in the repo treats exactly this hazard as worth
// preventing, and says so:
//   - roster.ts:158-162: "Temp + rename: `rename` is atomic within a filesystem,
//     so a crash leaves either the old file or the new one, never half of either."
//   - hive.ts:2657 atomicWriteJson (tmp + renameSync), db.ts WAL + transactional
//     migrations, reflect.ts atomic writes.
// Meanwhile readConfig (config.ts:594-600) wraps the parse in a bare catch:
//
//     } catch {
//       return withTriggerDefaults({ ...DEFAULTS });
//     }
//
// — any JSON.parse failure is treated as "no file yet", so a truncated
// config.json silently becomes factory defaults: no log, no backup, no
// recovery. The file is the ONLY copy of harnessHome/recentHives,
// slackSigningSecret/slackBotToken, groqApiKey, webhookTriggers (incl. secrets),
// agentTokenCaps, costCapTokens, missions, integrations metadata.
// migrateTriggersV1's one-shot save (config.ts:579) shares persistConfig.
//
// FAILURE SCENARIO, reproduced end-to-end against the REAL config.ts (loaded
// via test/load-ts.cjs; Electron's app.getPath is stubbed at the module
// boundary exactly like test/config-write-notify.test.cjs — no Electron, no
// display, no network):
//
//   1. A real install is seeded through the public API (writeConfig /
//      setAgentTokenCap): home, recents, Slack + Groq + webhook secrets, token
//      caps, missions — all on disk, all reading back.
//   2. An ordinary settings save (writeConfig({ notifications: true })) hits
//      persistConfig, and the process "loses power" mid-write. The crash is
//      modelled deterministically at the fs boundary: the first writeFileSync
//      persistConfig performs puts a PREFIX of the new payload on the target
//      path (the O_TRUNC truncate has already happened — that is inherent to
//      truncate-then-write) and then throws, standing in for the power loss.
//      The control test shows this same crash model is survivable under the
//      repo's own temp+rename policy, so the model is not what destroys
//      the file.
//   3. The live config.json is left a truncated, unparseable prefix.
//   4. "Next launch": readConfig() parses nothing, logs nothing, throws
//      nothing, and hands back pure defaults. A recursive scan of the whole
//      userData tree finds no backup anywhere — the old config is gone for
//      good.
//   5. The one-shot triggers migration (config.ts:548-586) is shown to be
//      exposed through the same persistConfig, with the same next-launch wipe.
//
// FAILS on current code (the crash destroys config.json; readConfig resets).
// PASSES after a correct fix (write temp + atomic rename, as roster.ts/hive.ts
// already do): the crash then lands on the temp file before any rename, the
// live file keeps the old complete config, and every preservation assertion
// holds. Run: node test/repro/bug-17.repro.cjs

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const loadTs = require(path.join(__dirname, '..', 'load-ts.cjs'));

// config.ts resolves its file through Electron's app.getPath('userData'). Point
// that one dependency at a throwaway root (same trick the repo's own
// config-write-notify.test.cjs uses) so this repro never touches a real config.
const ROOTS = { userData: fs.mkdtempSync(path.join(os.tmpdir(), 'md-bug17-userdata-')) };
const electron = require.resolve('electron');
require.cache[electron] = {
  id: electron,
  filename: electron,
  loaded: true,
  exports: { app: { getPath: () => ROOTS.userData } }
};

const { readConfig, writeConfig, setAgentTokenCap, resetConfig } = loadTs('src/main/config.ts');

const CONFIG_PATH = () => path.join(ROOTS.userData, 'config.json');

// How much of the new payload reaches disk before the "power loss". The claim's
// artifact — '{"harnessHome": "/Users/x/H' — is exactly such a prefix.
const PREFIX_BYTES = 40;

// The hive home an established install points at (a real directory, as the app
// creates one), and the secrets only config.json holds.
const HIVE_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'md-bug17-hive-'));
const SLACK_SIGNING_SECRET = 'whsec-slack-signing-bug17-0f3a9c';
const SLACK_BOT_TOKEN = 'xoxb-1701-bug17-bot-token';
const GROQ_API_KEY = 'gsk_bug17_groq_key_9d2f';
const WEBHOOK_TRIGGER_SECRET = 'whsec-endpoint-bug17-4471';
const LEGACY_WEBHOOK_SECRET = 'whsec-legacy-pre-triggers-install';

test.after(() => {
  fs.rmSync(ROOTS.userData, { recursive: true, force: true });
  fs.rmSync(HIVE_HOME, { recursive: true, force: true });
});

/** Seed one established install's config through the real public API. */
function seedEstablishedInstall() {
  writeConfig({
    onboardingComplete: true,
    harnessHome: HIVE_HOME,
    autoMode: false,
    costCapTokens: 5_000_000,
    slackEnabled: true,
    slackSigningSecret: SLACK_SIGNING_SECRET,
    slackBotToken: SLACK_BOT_TOKEN,
    groqApiKey: GROQ_API_KEY,
    webhookTriggers: [{
      id: 'endpoint-1',
      name: 'CI',
      secret: WEBHOOK_TRIGGER_SECRET,
      enabled: true,
      mode: 'strict',
      schema: '{}',
      createdAt: 1_700_000_000_000
    }],
    missions: [{
      id: 'nightly-report',
      label: 'Nightly report',
      intervalMs: 86_400_000,
      to: 'god',
      body: 'report',
      enabled: true
    }]
  });
  setAgentTokenCap('worker-9', 123456);
  return readConfig();
}

/**
 * Crash hook: while installed, the FIRST writeFileSync persistConfig performs
 * completes only partially — the truncate has already happened (that is what
 * truncate-then-write means) and a prefix of the new payload is on disk at the
 * target path — then it throws, standing in for the power loss / hard crash
 * mid-write. Everything else passes through untouched.
 */
function installMidWriteCrash(state) {
  const realWriteFileSync = fs.writeFileSync;
  state.fired = false;
  state.target = null;
  state.intended = null;
  state.onDiskAfterCrash = null;
  fs.writeFileSync = function patchedWriteFileSync(p, data, opts) {
    if (!state.fired) {
      state.fired = true;
      state.target = path.resolve(String(p));
      const full = typeof data === 'string' ? data : Buffer.from(data).toString('utf8');
      state.intended = full;
      realWriteFileSync.call(fs, p, full.slice(0, PREFIX_BYTES), opts);
      state.onDiskAfterCrash = fs.readFileSync(state.target, 'utf8');
      throw new Error('SIMULATED CRASH: power lost while persistConfig was mid-write');
    }
    return realWriteFileSync.call(fs, p, data, opts);
  };
  return () => { fs.writeFileSync = realWriteFileSync; };
}

/** True when config.json on disk no longer parses. */
function liveFileCorrupt() {
  try {
    JSON.parse(fs.readFileSync(CONFIG_PATH(), 'utf8'));
    return false;
  } catch {
    return true;
  }
}

/** Every file under `root` whose text contains any of `needles`. */
function filesContaining(root, needles) {
  const hits = [];
  let names = [];
  try { names = fs.readdirSync(root, { recursive: true }); } catch { return hits; }
  for (const rel of names) {
    const p = path.join(root, String(rel));
    let st;
    try { st = fs.statSync(p); } catch { continue; }
    if (!st.isFile()) continue;
    let text = '';
    try { text = fs.readFileSync(p, 'utf8'); } catch { continue; }
    if (needles.some((needle) => text.includes(needle))) hits.push(p);
  }
  return hits;
}

/** A save crashed mid-write: the user's config must still be on disk and readable. */
function assertUserConfigSurvived() {
  let parsed = null;
  let parseError = null;
  try {
    parsed = JSON.parse(fs.readFileSync(CONFIG_PATH(), 'utf8'));
  } catch (e) {
    parseError = e;
  }
  assert.ok(
    parsed,
    'config.json did not survive a crash mid-save. It must, because ' +
      'persistConfig (config.ts:642) must not write over the live file. What is ' +
      `on disk instead: ${JSON.stringify(fs.readFileSync(CONFIG_PATH(), 'utf8'))} ` +
      `(parse error: ${parseError ? parseError.message : 'none'})`
  );
  const after = readConfig();
  assert.equal(after.harnessHome, HIVE_HOME, 'harnessHome lost after the crash');
  assert.deepEqual(after.recentHives, [HIVE_HOME], 'recent hives lost after the crash');
  assert.equal(after.slackSigningSecret, SLACK_SIGNING_SECRET, 'Slack signing secret lost');
  assert.equal(after.slackBotToken, SLACK_BOT_TOKEN, 'Slack bot token lost');
  assert.equal(after.groqApiKey, GROQ_API_KEY, 'Groq API key lost');
  assert.equal(after.agentTokenCaps?.['worker-9'], 123456, 'per-agent token cap lost');
  assert.equal(after.costCapTokens, 5_000_000, 'breaker cost cap lost');
  assert.equal(after.webhookTriggers[0]?.secret, WEBHOOK_TRIGGER_SECRET, 'webhook trigger + secret lost');
  assert.ok(after.missions.some((m) => m.id === 'nightly-report'), 'custom mission lost');
  assert.equal(after.onboardingComplete, true, 'booted back into onboarding');
  return after;
}

// --- 0. Precondition: the seeding really persists everything -----------------

test('precondition: an established install keeps its config on disk and reads it back', () => {
  const cfg = seedEstablishedInstall();
  assert.equal(cfg.onboardingComplete, true);
  assert.equal(cfg.harnessHome, HIVE_HOME);
  assert.deepEqual(cfg.recentHives, [HIVE_HOME]);
  assert.equal(cfg.slackSigningSecret, SLACK_SIGNING_SECRET);
  assert.equal(cfg.slackBotToken, SLACK_BOT_TOKEN);
  assert.equal(cfg.groqApiKey, GROQ_API_KEY);
  assert.equal(cfg.agentTokenCaps['worker-9'], 123456);
  assert.equal(cfg.costCapTokens, 5_000_000);
  assert.equal(cfg.webhookTriggers[0].secret, WEBHOOK_TRIGGER_SECRET);
  assert.ok(cfg.missions.some((m) => m.id === 'nightly-report'));
  // ...and it is all in the one file that holds it:
  const parsed = JSON.parse(fs.readFileSync(CONFIG_PATH(), 'utf8'));
  assert.equal(parsed.slackSigningSecret, SLACK_SIGNING_SECRET);
});

// --- 1. Control: the repo's own temp+rename policy survives this crash -------

test('control: the same simulated crash under temp+rename (roster.ts:158 policy) keeps the old file', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'md-bug17-atomic-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const live = path.join(dir, 'config.json');
  const body = JSON.stringify(
    { harnessHome: HIVE_HOME, slackSigningSecret: SLACK_SIGNING_SECRET },
    null,
    2
  );
  fs.writeFileSync(live, body, 'utf8');

  // The exact discipline roster.ts:158-162 / hive.ts atomicWriteJson use. A
  // crash during the temp write (or even between the temp write and the
  // rename) can never touch the live file.
  const writeAtomicallyThenLosePower = () => {
    const tmp = `${live}.tmp-repro`;
    fs.writeFileSync(tmp, body.slice(0, PREFIX_BYTES), 'utf8'); // truncated temp file
    throw new Error('SIMULATED CRASH: power lost mid-write');   // rename never runs
  };
  assert.throws(writeAtomicallyThenLosePower, /SIMULATED CRASH/);

  // The live file still holds the complete OLD config — nothing was lost.
  const after = JSON.parse(fs.readFileSync(live, 'utf8'));
  assert.equal(after.harnessHome, HIVE_HOME);
  assert.equal(after.slackSigningSecret, SLACK_SIGNING_SECRET);
});

// --- 2. The bug: persistConfig overwrites the live file in place -------------

test('BUG: a crash mid-save destroys config.json — writeFileSync goes straight over the live file', () => {
  const before = seedEstablishedInstall();
  assert.equal(before.slackSigningSecret, SLACK_SIGNING_SECRET, 'seeding precondition');

  const state = {};
  const restore = installMidWriteCrash(state);
  let crash = null;
  try {
    // An ordinary settings save: config.ts:656 writeConfig -> config.ts:639
    // persistConfig -> config.ts:642 writeFileSync straight over config.json.
    writeConfig({ notifications: true });
  } catch (e) {
    crash = e;
  } finally {
    restore();
  }

  assert.ok(crash, 'the simulated mid-write crash fired inside persistConfig');
  assert.ok(state.fired);

  if (liveFileCorrupt()) {
    // Mechanism, observed: the write went at the LIVE file (no temp path), and
    // what is on disk is a bare prefix of the new payload.
    assert.equal(
      state.target, CONFIG_PATH(),
      'persistConfig wrote DIRECTLY to the live config.json — no temp file, no rename (config.ts:642)'
    );
    assert.equal(
      state.onDiskAfterCrash, state.intended.slice(0, PREFIX_BYTES),
      'the live file now holds a truncated PREFIX of the new payload'
    );
  }

  // THE BUG: after a mid-write crash the live config.json must still hold a
  // complete config (old or new). On current code it holds an unparseable
  // fragment instead, and every setting below is gone.
  assertUserConfigSurvived();
});

// --- 3. The silent, unrecoverable reset --------------------------------------

test('BUG: the next launch silently resets to defaults — no error, no log, no backup anywhere', () => {
  // Fresh established install, then the same mid-write crash during an
  // ordinary settings save.
  seedEstablishedInstall();
  const state = {};
  const restore = installMidWriteCrash(state);
  try {
    try { writeConfig({ notifications: true }); } catch { /* the crash itself */ }
  } finally {
    restore();
  }

  const raw = fs.readFileSync(CONFIG_PATH(), 'utf8');
  const corrupt = liveFileCorrupt();

  // "Next launch": watch both channels readConfig could use to surface the
  // corruption it is about to throw away.
  const logs = [];
  const origError = console.error;
  const origWarn = console.warn;
  console.error = (...a) => logs.push(a.join(' '));
  console.warn = (...a) => logs.push(a.join(' '));
  let threw = null;
  let cfg = null;
  try { cfg = readConfig(); } catch (e) { threw = e; }
  console.error = origError;
  console.warn = origWarn;

  // readConfig neither throws nor logs on current code (config.ts:594-600):
  // it returns, silently, with factory defaults for the file it just failed to
  // parse. Whether a fix chooses to log, throw, or recover is its own call —
  // the contract this repro pins is below: the user's config must SURVIVE.
  assert.deepEqual(
    logs, [],
    'readConfig logs NOTHING when it discards the file (config.ts:598-600) — ' +
      'the reset below is completely silent'
  );

  if (corrupt) {
    // Observed on current code — documented, not asserted as the contract:
    // cfg now holds factory defaults. The contract assertion is below.
    const resetToDefaults =
      cfg.harnessHome === null
      && cfg.slackSigningSecret === undefined
      && cfg.onboardingComplete === false;
    assert.ok(
      resetToDefaults,
      'observed: readConfig handed back factory defaults for a truncated file'
    );
    // Unrecoverable: the old contents exist nowhere in userData — no .bak, no
    // .tmp with the previous file, nothing.
    assert.deepEqual(
      filesContaining(ROOTS.userData, [
        SLACK_SIGNING_SECRET, SLACK_BOT_TOKEN, GROQ_API_KEY, WEBHOOK_TRIGGER_SECRET
      ]),
      [],
      'observed: the destroyed config exists nowhere else — no backup was kept'
    );
    assert.ok(!raw.includes(SLACK_SIGNING_SECRET), 'observed: the live file no longer holds the old secrets');
  }

  // THE CONTRACT the fix must satisfy: the user's config survives the crash —
  // on current code readConfig has already reset it to defaults.
  assert.equal(cfg.harnessHome, HIVE_HOME, 'next launch lost the harness home');
  assert.equal(cfg.slackSigningSecret, SLACK_SIGNING_SECRET, 'next launch lost the Slack signing secret');
  assert.equal(cfg.slackBotToken, SLACK_BOT_TOKEN, 'next launch lost the Slack bot token');
  assert.equal(cfg.groqApiKey, GROQ_API_KEY, 'next launch lost the Groq API key');
  assert.equal(cfg.agentTokenCaps?.['worker-9'], 123456, 'next launch lost the per-agent token cap');
  assert.equal(cfg.onboardingComplete, true, 'next launch booted back into onboarding');
});

// --- 4. The one-shot migration write is exposed the same way -----------------

test('BUG: the migrateTriggersV1 save (config.ts:579) goes through the same non-atomic write', () => {
  // Back to first-run defaults on disk, and clear the in-process migration
  // latch (resetConfig does exactly that — config.ts:726) so the migration
  // will run on the next read.
  resetConfig();

  // A pre-Triggers install's config.json, as an older build left it:
  fs.writeFileSync(CONFIG_PATH(), JSON.stringify({
    onboardingComplete: true,
    harnessHome: HIVE_HOME,
    webhookSecret: LEGACY_WEBHOOK_SECRET,
    defaultModel: 'claude-fable-5'
  }, null, 2), 'utf8');

  const state = {};
  const restore = installMidWriteCrash(state);
  let threw = null;
  let thisLaunch = null;
  try {
    thisLaunch = readConfig(); // first read in the process -> migrateTriggersV1 -> persistConfig
  } catch (e) {
    threw = e;
  } finally {
    restore();
  }

  assert.ok(state.fired, 'the migration attempted its one-shot save and crashed mid-write');
  assert.equal(threw, null, 'migrateTriggersV1 catches the crash (config.ts:581) — the save just vanished');
  assert.equal(
    thisLaunch.harnessHome, HIVE_HOME,
    'THIS launch keeps the legacy config in memory after the migration save failed'
  );

  if (liveFileCorrupt()) {
    // Observed on current code: the migration write destroyed the legacy file
    // it was supposed to replace.
    assert.equal(state.target, CONFIG_PATH(), 'the migration write went directly at the live config.json');
    assert.equal(state.onDiskAfterCrash, state.intended.slice(0, PREFIX_BYTES), 'legacy file left truncated');
    assert.deepEqual(
      filesContaining(ROOTS.userData, [LEGACY_WEBHOOK_SECRET]),
      [],
      'observed: the legacy webhook secret is unrecoverable'
    );
  }

  // THE CONTRACT: the next launch must still see the legacy install's config —
  // the migration is idempotent from disk (triggersMigratedV1 may or may not
  // have landed; the legacy fields are preserved either way).
  const nextLaunch = readConfig();
  assert.equal(nextLaunch.harnessHome, HIVE_HOME, 'next launch lost the harness home');
  assert.equal(nextLaunch.webhookSecret, LEGACY_WEBHOOK_SECRET, 'next launch lost the legacy webhook secret');
  assert.equal(nextLaunch.onboardingComplete, true, 'next launch booted back into onboarding');
});
