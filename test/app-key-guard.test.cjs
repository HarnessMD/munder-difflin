'use strict';

/**
 * THE APP KEY GUARD in the secrets move (commit 11faccc7, "put the app key
 * guard back in the secrets move").
 *
 * Classic shares its data folder with other builds of the app, and each of
 * those keeps its own key there. When the move seals an older version's saved
 * values, a value that is one of those keys — or shares a 16 character run
 * with one — must be dropped, never sealed and never handed to an agent.
 *
 * Three pieces are pinned here:
 *   1. `sharesRun` (src/core/sealedSecrets.ts): the 16 character overlap test
 *      itself — the run length is exact, and a text shorter than the run never
 *      matches, so a short value can never be mistaken for a key.
 *   2. `decideMove` (src/core/sealedSecrets.ts): the guard runs BEFORE the sink
 *      is consulted, so an app key dropped with reason 'app-key' stays dropped
 *      even when its name would otherwise put it in an agent's environment —
 *      the one place a leaked app key would do the most harm. A value that
 *      shares no run is still sealed exactly as before.
 *   3. `appKeyFilesIn` (src/main/sealedStore.ts): the key files are found by
 *      their shape, not by name — a JSON file of at most 64 KB, at the top of
 *      the data folder or one folder down, whose `sk` is a string. A JSON file
 *      that is there and cannot be read is listed too, so the move stops
 *      instead of guessing. Links are not followed.
 *
 * Both modules import only node builtins (node:crypto, node:fs, node:path), so
 * they transpile and load standalone through test/load-ts.cjs — no stub and no
 * extraction was needed for sealedStore.ts.
 *
 * Run: node --test test/app-key-guard.test.cjs
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { sharesRun, decideMove } = loadTs('src/core/sealedSecrets.ts');
const { appKeyFilesIn } = loadTs('src/main/sealedStore.ts');

/** 16 printable characters: one full run. */
const RUN16 = 'ABCDEFGHJKLMNPQR';
/** The same run one character short. */
const RUN15 = RUN16.slice(0, 15);

// ─── sharesRun ───────────────────────────────────────────────────────────────

test('sharesRun: a shared run of exactly 16 characters matches', () => {
  assert.equal(sharesRun(`head-${RUN16}-tail`, `other-${RUN16}-text`), true);
  // The run itself against a text that contains it, and against itself.
  assert.equal(sharesRun(RUN16, `sk-live-${RUN16}`), true);
  assert.equal(sharesRun(RUN16, RUN16), true);
});

test('sharesRun: a shared run of 15 characters does not match', () => {
  // Both texts are long enough, and the characters either side of the shared
  // 15 differ, so the longest run the two share is exactly 15. (Flanking a
  // shared run with the SAME character either side makes a 16 run of it.)
  assert.equal(sharesRun(`aaa${RUN15}bbb`, `ccc${RUN15}ddd`), false);
});

test('sharesRun: a text shorter than the run never matches', () => {
  assert.equal(sharesRun(RUN15, `padding-${RUN16}-padding`), false);
  assert.equal(sharesRun(`padding-${RUN16}-padding`, RUN15), false);
  assert.equal(sharesRun('', `padding-${RUN16}-padding`), false);
  // Even when the short text is a prefix of the other.
  assert.equal(sharesRun(RUN15, RUN16), false);
});

test('sharesRun: unrelated texts do not match', () => {
  assert.equal(sharesRun('abcdefghijklmnopqrstuvwxyz', '0123456789012345678901'), false);
});

// ─── decideMove ──────────────────────────────────────────────────────────────

const APP_KEY = `sk-app-${RUN16}-0123456789`;

/** Facts whose every name would otherwise go to an agent's environment. */
function envFacts(appKeys) {
  return { appKeys, sinkOf: () => ({ kind: 'env' }) };
}

test("decideMove: a value that IS an app key is dropped 'app-key', even bound for an agent's env", () => {
  assert.deepEqual(
    decideMove('apikey:ANTHROPIC', APP_KEY, envFacts([APP_KEY])),
    { ref: 'apikey:ANTHROPIC', action: 'drop', reason: 'app-key' }
  );
});

test("decideMove: a value that CONTAINS an app key is dropped 'app-key'", () => {
  assert.deepEqual(
    decideMove('apikey:ANTHROPIC', `Bearer ${APP_KEY} (copied)`, envFacts([APP_KEY])),
    { ref: 'apikey:ANTHROPIC', action: 'drop', reason: 'app-key' }
  );
});

test("decideMove: a value sharing a 16 character run with an app key is dropped 'app-key'", () => {
  assert.deepEqual(
    decideMove('custom:MY_KEY', `prefix-${RUN16}-suffix`, envFacts([APP_KEY])),
    { ref: 'custom:MY_KEY', action: 'drop', reason: 'app-key' }
  );
});

test("decideMove: the guard is checked against every app key, not just the first", () => {
  const other = `sk-other-${RUN16}-zz`;
  assert.deepEqual(
    decideMove('custom:MY_KEY', other, envFacts(['sk-unrelated-0000000000000000', other])),
    { ref: 'custom:MY_KEY', action: 'drop', reason: 'app-key' }
  );
});

test('decideMove: a value sharing no run is sealed as before', () => {
  // Agent key → the agent environment.
  assert.deepEqual(
    decideMove('apikey:ANTHROPIC', 'sk-mine-9999999999999999-aaaa', envFacts([APP_KEY])),
    { ref: 'apikey:ANTHROPIC', action: 'seal', use: { kind: 'env' } }
  );
  // A 15 character overlap is not a run, so it is sealed too.
  assert.deepEqual(
    decideMove('apikey:ANTHROPIC', `aaa${RUN15}bbb`, envFacts([`ccc${RUN15}ddd1234567890`])),
    { ref: 'apikey:ANTHROPIC', action: 'seal', use: { kind: 'env' } }
  );
  // With no app keys at all nothing is dropped by the guard.
  assert.deepEqual(
    decideMove('apikey:ANTHROPIC', APP_KEY, envFacts([])),
    { ref: 'apikey:ANTHROPIC', action: 'seal', use: { kind: 'env' } }
  );
  // The other sinks keep their decisions: the app's own, and an integration
  // tied to its record's address (scheme, host, port and path, no query).
  assert.deepEqual(
    decideMove('app:self', 'sk-mine-9999999999999999-aaaa', { appKeys: [APP_KEY], sinkOf: () => ({ kind: 'app' }) }),
    { ref: 'app:self', action: 'seal', use: { kind: 'app' } }
  );
  assert.deepEqual(
    decideMove('int:loops', 'sk-mine-9999999999999999-aaaa', {
      appKeys: [APP_KEY], sinkOf: () => ({ kind: 'http', recordUrl: 'https://app.loops.so/api/v1/x?q=1' })
    }),
    { ref: 'int:loops', action: 'seal', use: { kind: 'http', url: 'https://app.loops.so/api/v1/x' } }
  );
});

test('decideMove: the earlier drops still come first', () => {
  // An unreadable value is never compared with an app key.
  assert.deepEqual(
    decideMove('apikey:ANTHROPIC', undefined, envFacts([APP_KEY])),
    { ref: 'apikey:ANTHROPIC', action: 'drop', reason: 'unreadable' }
  );
  // A value with a byte below 0x20 is not movable, whatever it shares.
  assert.deepEqual(
    decideMove('apikey:ANTHROPIC', `${APP_KEY}\n`, envFacts([APP_KEY])),
    { ref: 'apikey:ANTHROPIC', action: 'drop', reason: 'not-printable' }
  );
});

// ─── appKeyFilesIn ───────────────────────────────────────────────────────────

/** A key file's shape: JSON whose `sk` is a string (the keychain ciphertext). */
const KEY_JSON = JSON.stringify({ sk: Buffer.from('ciphertext-stand-in').toString('base64') });

/**
 * A throwaway data folder holding one of every case. Nothing outside this temp
 * directory is touched, and no real key is written — `sk` is a stand-in string.
 */
function makeDataDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'app-key-guard-'));
  fs.mkdirSync(path.join(dir, 'one-down'));
  fs.mkdirSync(path.join(dir, 'one-down', 'two-down'), { recursive: true });

  // Listed: at the top of the folder, and one folder down.
  fs.writeFileSync(path.join(dir, 'top.json'), KEY_JSON);
  fs.writeFileSync(path.join(dir, 'one-down', 'nested.json'), KEY_JSON);

  // Skipped: two folders down — out of reach.
  fs.writeFileSync(path.join(dir, 'one-down', 'two-down', 'deep.json'), KEY_JSON);
  // Skipped: JSON, but no string `sk`.
  fs.writeFileSync(path.join(dir, 'no-sk.json'), JSON.stringify({ other: 'x', sk: 7 }));
  // Skipped: not JSON at all (neither the name nor the contents).
  fs.writeFileSync(path.join(dir, 'notes.txt'), KEY_JSON);
  // Skipped: the right shape but over 64 KB, so it is never read.
  fs.writeFileSync(path.join(dir, 'huge.json'), JSON.stringify({ sk: 'k', pad: 'p'.repeat(64 * 1024) }));
  // Skipped: a link is not followed, even to a real key file.
  fs.symlinkSync(path.join(dir, 'top.json'), path.join(dir, 'link.json'));

  return dir;
}

test('appKeyFilesIn: lists the key files by shape and skips the rest', () => {
  const dir = makeDataDir();
  const found = appKeyFilesIn(dir).sort();
  assert.deepEqual(found, [path.join(dir, 'one-down', 'nested.json'), path.join(dir, 'top.json')].sort());
  fs.rmSync(dir, { recursive: true, force: true });
});

test('appKeyFilesIn: a JSON file that cannot be read is listed, so the move stops', (t) => {
  if (typeof process.getuid === 'function' && process.getuid() === 0) {
    t.skip('running as root: a mode 000 file is still readable');
    return;
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'app-key-guard-unreadable-'));
  const locked = path.join(dir, 'locked.json');
  fs.writeFileSync(locked, KEY_JSON);
  fs.chmodSync(locked, 0o000);
  try {
    assert.deepEqual(appKeyFilesIn(dir), [locked]);
  } finally {
    fs.chmodSync(locked, 0o600);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('appKeyFilesIn: a folder that is not there lists nothing', () => {
  assert.deepEqual(appKeyFilesIn(path.join(os.tmpdir(), 'app-key-guard-absent-dir-xyz')), []);
});
