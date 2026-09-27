'use strict';

/* 0.5.3, founder 25 Sep 2026: "Send now" on a queued message sends it
 * straight into the agent's own CLI at once and submits it, even mid-turn, so
 * the CLI's own queue holds it (Claude Code queues input typed mid-turn). It
 * jumps the other app-queued messages and leaves the app queue once
 * delivered, through the one typing door (typeAndSubmit, #97). Engines whose
 * CLI is not known to take input mid-turn keep the old rule. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const Q = loadTs('src/renderer/src/hooks/queueDelivery.ts');
const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

test('which CLIs take a Send now mid-turn: Claude Code only, and never over a prompt', () => {
  assert.deepEqual([...Q.MID_TURN_INPUT_PROVIDERS], ['claude']);
  for (const s of ['idle', 'working', 'thinking', 'looping']) assert.equal(Q.canSendNowMidTurn(s, 'claude'), true, s);
  // A prompt on screen: the Return would answer it.
  for (const s of ['waiting', 'blocked', 'offline', 'crashed']) assert.equal(Q.canSendNowMidTurn(s, 'claude'), false, s);
  assert.equal(Q.canSendNowMidTurn('working', 'claude', true), false, 'an open question holds it');
  for (const p of ['codex', 'gemini', 'grok', 'kimi', 'qwen', 'opencode', 'crush', 'pi', 'copilot', 'cursor', 'antigravity', 'custom']) {
    assert.equal(Q.canSendNowMidTurn('working', p), false, `${p} keeps the old rule`);
  }
});

test('the store marks the row: front, released, and `now`', () => {
  const store = read('src/renderer/src/store/store.ts');
  assert.match(store, /releaseQueuedMessage: \(agentId: string, messageId: string, now\?: boolean\) => void;/);
  assert.match(store, /\{ \.\.\.target, manual: true, \.\.\.\(now \? \{ now: true \} : \{\}\) \},\n\s+\.\.\.current\.filter\(\(m\) => m\.id !== messageId\)/);
});

test('the drain: a `now` head skips the idle gate and the cooldown, nothing else, and types through typeAndSubmit', () => {
  const hive = read('src/renderer/src/hooks/useHive.ts');
  assert.match(hive, /const jump = next\.now === true && canSendNowMidTurn\(target\.status, inferAgentProvider\(target\.command, target\.provider\), openQuestions\.isOpen\(target\.id\)\);/);
  assert.match(hive, /if \(!jump && !canDeliverToAgent\(target\.status/);
  assert.match(hive, /if \(!jump && now - \(lastFlush\.current\[target\.id\] \?\? 0\) < FLUSH_COOLDOWN_MS\) return \{ sent: false \};/);
  // Still held: an open editor, the boot grace, a person's draft or menu, a stale precondition.
  const d = hive.slice(hive.indexOf('const dispatch = async ('), hive.indexOf('const ensureSlackCard'));
  for (const gate of ['if (next.editing) return { sent: false };', 'bootGraceUntil.current[target.id]', 'if (!isTerminalAutomationSafe(target.ptyId, now)) return { sent: false };', "=== 'drop'"]) {
    assert.ok(d.includes(gate), gate);
    assert.doesNotMatch(d.slice(d.indexOf(gate) - 12, d.indexOf(gate)), /!jump/, `${gate} is not bypassed`);
  }
  assert.match(d, /\(\) => submitToPty\(/, 'the one typing door: waits for the echo, then Return, retries only when the box changed');
  assert.match(hive, /const result = await typeAndSubmit\(\{/);
  // Delivered: it leaves the app queue (removeQueuedMessage in the acknowledgement).
  assert.match(d, /useStore\.getState\(\)\.settleHumanSend\(srcId, next\.id, 'sent'\);\n\s+removeQueuedMessage\(srcId, next\.id\);/);
  // The flush pre-filter lets a `now` head through for a busy agent.
  assert.match(hive, /const jump = messageQueues\[a\.id\]\[0\]\.now === true && canSendNowMidTurn\(a\.status, inferAgentProvider\(a\.command, a\.provider\), openQuestions\.isOpen\(a\.id\)\);/);
  assert.match(hive, /if \(!a\.ptyId \|\| \(!jump && !canDeliverToAgent\(/);
});

test('the words: said as going into the terminal, no dashes, every locale', () => {
  for (const l of ['en', 'ar', 'zh-CN']) {
    const room = JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`)).pro.room;
    for (const k of ['sendNowCli', 'sendNowCliTitle', 'sendNowSending']) {
      assert.equal(typeof room[k], 'string', `${l} ${k}`);
      assert.doesNotMatch(room[k], /—|–/);
    }
    assert.match(room.sendNowCli, /\{\{name\}\}/);
    assert.match(room.sendNowCliTitle, /\{\{name\}\}/);
  }
});
