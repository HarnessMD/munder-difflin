'use strict';

/* 0.5.3 bug 1: an agent comes back blank after a restart, its last session's
 * context gone.
 *
 * Replicated from a live floor's log, not from a guess. The registry keeps ONE
 * session id per agent as the resume key, and two sources write it: the hook
 * payload and the live telemetry sample. The telemetry source takes the most
 * recent live session under the agent's id, and a child process that inherits
 * the agent's telemetry environment is a live session under that id. On the
 * floor this was measured on, every busy agent's key flipped A, B, A again and
 * again (25 flips for one agent). For one agent the key pointed for two days at
 * a session with zero tokens and no transcript anywhere on disk. A restart in
 * that window asks Claude Code to resume a session that does not exist, the app
 * quietly drops the flag, and the agent starts empty while the restore reports
 * success. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { pickResumableSession, pushSessionHistory, sampleProvesConversation, SESSION_HISTORY_CAP } =
  loadTs('src/shared/resumeKey.ts');

const REAL = '1ec51a58-cc74-4313-b40b-e3a879b7bd5c';
const GHOST = '45f4a5c8-0c5e-4ffe-8981-e0e24daeb374';

test('the measured case: the key is a ghost, the real session is one step back', () => {
  const onDisk = new Set([REAL]);
  assert.equal(pickResumableSession([GHOST, REAL], (sid) => onDisk.has(sid)), REAL);
});

test('the current key wins when its transcript exists', () => {
  assert.equal(pickResumableSession([REAL, GHOST], () => true), REAL);
});

test('nothing resumable is undefined, never a guess', () => {
  assert.equal(pickResumableSession([GHOST, undefined, ''], () => false), undefined);
  assert.equal(pickResumableSession([], () => true), undefined);
});

test('history keeps the displaced key, most recent first, without duplicates', () => {
  let h = pushSessionHistory(undefined, REAL);
  assert.deepEqual(h, [REAL]);
  h = pushSessionHistory(h, GHOST);
  assert.deepEqual(h, [GHOST, REAL]);
  // The A, B, A flip must not grow the list.
  h = pushSessionHistory(h, REAL);
  assert.deepEqual(h, [REAL, GHOST]);
  assert.deepEqual(pushSessionHistory(h, undefined), h);
});

test('history is bounded', () => {
  let h;
  for (let i = 0; i < SESSION_HISTORY_CAP + 5; i++) h = pushSessionHistory(h, `s-${i}`);
  assert.equal(h.length, SESSION_HISTORY_CAP);
  assert.equal(h[0], `s-${SESSION_HISTORY_CAP + 4}`);
});

test('a telemetry sample with no tokens proves no conversation', () => {
  // The ghost's ledger rows, verbatim shape: every counter zero, model empty.
  assert.equal(sampleProvesConversation({ input: 0, output: 0, cacheRead: 0, cacheCreation: 0 }), false);
  assert.equal(sampleProvesConversation({ input: 12, output: 0, cacheRead: 0, cacheCreation: 0 }), true);
  assert.equal(sampleProvesConversation({ input: 0, output: 0, cacheRead: 900, cacheCreation: 0 }), true);
  assert.equal(sampleProvesConversation(null), false);
});

test('HAS IT RUN: the wiring', () => {
  const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
  const index = read('src/main/index.ts');
  assert.match(index, /if \(sample\?\.sessionId && sampleProvesConversation\(sample\)\) hive\.recordSession\(/,
    'the telemetry source still records a session that proves nothing');
  assert.doesNotMatch(index, /if \(sample\?\.sessionId\) hive\.recordSession\(/);
  assert.match(index, /const candidates = \[explicitSid \|\| undefined, \.\.\.\(opts\.resume === true \? hive\.resumeCandidates\(opts\.hive\.id\) : \[\]\)\];/,
    'the Claude resume does not walk the history');
  assert.match(index, /pickResumableSession\(candidates, \(s\) => seedSessionTranscript\(cwd, s\)\)/);
  const hive = read('src/main/hive.ts');
  assert.match(hive, /agent\.sessionHistory = pushSessionHistory\(agent\.sessionHistory, agent\.sessionId\)/);
  const restore = read('src/renderer/src/hooks/useRestoreTeam.ts');
  assert.match(restore, /res\.resumeNotFound/, 'the restore still ignores a fresh start');
  for (const f of ['src/renderer/src/components/pro/AgentScreen.tsx', 'src/renderer/src/components/pro/god/ConfigTab.tsx']) {
    const code = read(f);
    assert.doesNotMatch(code, /resolveSessionCwd\(resumeSessionId\)/, `${f} still cancels the resume on one id`);
    assert.match(code, /res\.resumeNotFound/, `${f} restarts over an empty agent without saying so`);
  }
  for (const l of ['en', 'zh-CN', 'ar']) {
    const text = JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`)).pro.room.restartedFresh;
    assert.ok(text && text.includes('{{name}}'), `${l} restartedFresh`);
    assert.doesNotMatch(text, /[\u2013\u2014-]/, `${l} restartedFresh carries a dash`);
  }
});
