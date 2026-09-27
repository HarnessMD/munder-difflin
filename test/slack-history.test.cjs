// The Slack ledger (shared/slackHistory.ts): what a row is, which rows survive
// a damaged file, and that an append caps the list. Pure ops only; the file
// handling in main mirrors triggerHistory.ts and is not re-proven here.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const L = loadTs('src/shared/slackHistory.ts');
const row = (i, extra = {}) => ({ id: `r${i}`, direction: 'outbound', channel: 'C1', thread_ts: `${i}.0`, text: `t${i}`, ok: true, at: i, ...extra });

test('a damaged file keeps its good rows and drops the rest', () => {
  const parsed = L.parseSlackHistory([row(1), null, 'x', { id: 'bad' }, row(2, { ok: 'yes' }), row(3, { direction: 'sideways' }), row(4)]);
  assert.deepEqual(parsed.map((r) => r.id), ['r1', 'r4']);
  assert.deepEqual(L.parseSlackHistory({ not: 'an array' }), []);
});

test('an append goes to the front, is built field by field, and caps at the limit', () => {
  const current = Array.from({ length: L.SLACK_HISTORY_LIMIT }, (_, i) => row(i));
  const { entry, next } = L.withSlackHistoryEntry(
    current,
    { direction: 'inbound', channel: 'C9', thread_ts: '9.9', text: 'hello', ok: true, botToken: 'xoxb-must-not-persist' },
    'fresh', 12345
  );
  assert.equal(next.length, L.SLACK_HISTORY_LIMIT, 'the cap holds');
  assert.equal(next[0], entry, 'newest first');
  assert.equal(entry.id, 'fresh');
  assert.equal(entry.at, 12345);
  assert.ok(!('botToken' in entry), 'a stray field on the input never reaches the ledger');
  assert.ok(!('error' in entry) && !('taskId' in entry), 'optional fields are absent, not undefined');
  assert.equal(next[next.length - 1].id, `r${L.SLACK_HISTORY_LIMIT - 2}`, 'the oldest row fell off');
});

test('re-appending an id replaces the old row instead of duplicating it', () => {
  const { next } = L.withSlackHistoryEntry([row(1), row(2)], { id: 'r2', direction: 'outbound', channel: 'C1', thread_ts: '2.0', text: 'again', ok: false, error: 'not_in_channel' }, 'x', 0);
  assert.deepEqual(next.map((r) => r.id), ['r2', 'r1']);
  assert.equal(next[0].error, 'not_in_channel');
});

test('every post path in main goes through the one sink', () => {
  const slack = fs.readFileSync(path.join(__dirname, '..', 'src/main/slack.ts'), 'utf8');
  const main = fs.readFileSync(path.join(__dirname, '..', 'src/main/index.ts'), 'utf8');
  assert.match(slack, /postSink\?\.\(\{ channel: opts\.channel/, 'postSlackReply must report to the sink');
  assert.match(main, /setSlackPostSink\(\(r\) => \{\s*appendSlackHistory\(\{ direction: 'outbound'/, 'main must install the ledger as the sink');
  assert.match(main, /appendSlackHistory\(\{ direction: 'inbound', channel: m\.channel/, 'an inbound thread message is recorded before it is emitted');
  assert.match(main, /ipcMain\.handle\('slack:history'/);
  // The token stays in main: nothing on the record carries it.
  const sinkLine = slack.slice(slack.indexOf('postSink?.('), slack.indexOf('\n', slack.indexOf('postSink?.(')));
  assert.ok(!/botToken/.test(sinkLine), 'the sink record must not carry the bot token');
});
