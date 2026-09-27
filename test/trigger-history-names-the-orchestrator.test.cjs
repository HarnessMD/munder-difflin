/**
 * The Trigger History tab says "{{godName}} has this one" and "Approve and
 * {{godName}} reads this". Are those words true?
 *
 * They are, and this file is here because in September they were written up as
 * wrong. The Stapler had exactly this fault (a string naming the orchestrator
 * for work the RESPONDER got), and the same reading was applied to this tab:
 * teammate messages go to the resolved responder, so a string naming the
 * orchestrator must be wrong. The reading skipped one step. Teammate messages
 * never reach this tab. Its ledger has one family of writers, the webhook
 * path, and webhook work is addressed to the orchestrator by a literal.
 *
 * So the strings are right BECAUSE of two facts in another file, and nothing
 * tied them together. Whoever points webhook work at the configured responder,
 * or starts writing teammate traffic into this ledger, makes three sentences
 * false without touching them. This goes red first and says which three.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const SENTENCES = 'triggerHistory.tailNoReply, triggerHistory.pendingDesc, triggerHistory.pendingDirectiveDesc and triggerHistory.approveTitle';

// 0.5.3 (settings redesign): webhook work now goes to the endpoint's own agent,
// else the webhook default, else the orchestrator. The warning above came true
// on purpose, so the three sentences are handed the REAL recipient, resolved
// by the same shared function main sends the work with.
test('webhook work and the tab resolve the recipient with one shared function', () => {
  const main = read('src/main/index.ts');
  const at = main.indexOf('function dispatchWebhookWork(');
  assert.ok(at > 0, 'dispatchWebhookWork moved; find where webhook work is sent and re-point this test');
  const body = main.slice(at, main.indexOf('\n}\n', at));
  assert.match(body, /resolveWebhookRecipient\(arg\.to, readConfig\(\)\.webhookResponder,/, `webhook work no longer resolves its recipient the shared way. Then ${SENTENCES} may name the wrong agent.`);
  assert.match(body, /hive\.send\(\{\s*to,/);
  const tab = read('src/renderer/src/components/triggers/TriggerHistoryTab.tsx');
  assert.match(tab, /resolveWebhookRecipient\(hooks\.find\(\(h\) => h\.id === head\.sourceId\)\?\.to, webhookDefault,/, 'the tab no longer names the agent main sent it to');
});

test('only the webhook path writes this ledger, so no teammate traffic can sit under those words', () => {
  const dir = path.join(ROOT, 'src/main');
  const writers = fs.readdirSync(dir).filter((f) => f.endsWith('.ts') && f !== 'triggerHistory.ts')
    .filter((f) => /appendTriggerHistory\(/.test(fs.readFileSync(path.join(dir, f), 'utf8')));
  assert.deepEqual(writers, ['index.ts'], `a new writer to the trigger ledger: ${writers.join(', ')}. If it records work that goes to the responder, ${SENTENCES} are wrong for those rows.`);
  assert.doesNotMatch(read('src/main/teamsBridge.ts'), /appendTriggerHistory|triggerHistory/, 'teammate messages now reach the Trigger History tab');
});

test('the tab hands those sentences the live name of the agent that has it', () => {
  const tab = read('src/renderer/src/components/triggers/TriggerHistoryTab.tsx');
  assert.match(tab, /const godName = agents\.find\(\(a\) => a\.id === recipientId\)\?\.name \?\? god\?\.name \?\? 'the orchestrator';/);
  for (const key of ['tailNoReply', 'pendingDesc', 'pendingDirectiveDesc', 'approveTitle']) {
    assert.match(tab, new RegExp(`t\\('triggerHistory\\.${key}', \\{ godName \\}\\)`), `${key} is not handed the name`);
  }
});
