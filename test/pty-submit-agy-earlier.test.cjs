'use strict';
// #875: an Antigravity agent whose terminal tab was never opened (the renderer
// answers the probe with lines: null) held every send after one unconfirmed
// send, "held / earlier-in-box", for good. Antigravity sends no
// UserPromptSubmit; its PreInvocation is the prompt-taken event
// (PROMPT_TAKEN_EVENTS), and it now lets the earlier send go.

const test = require('node:test');
const assert = require('node:assert/strict');
const loadTs = require('./load-ts.cjs');

const { PtySubmitter } = loadTs('src/main/ptySubmit.ts');
const { HookProofRecord } = loadTs('src/main/hookProof.ts');

const RULE = '─'.repeat(80);
/** An agy screen with its input box drawn between two rules, holding `text`. */
const boxWith = (text) => ['some transcript', RULE, text ? `> ${text}` : '>', RULE, '  status'];

function rig(opts = {}) {
  const screen = { lines: null, reply: 'answer' };
  let onSleep = null;
  let t = 1_000_000;
  const now = () => t;
  const proof = new HookProofRecord(now);
  const logs = [];
  const writes = [];
  const sub = new PtySubmitter({
    write: (_id, data) => { writes.push(data); return { ok: true }; },
    info: () => ({ pid: 42, cols: 100, rows: 30, hasOutput: true, startedAt: 0 }),
    // A tab never opened: there is a window, but this terminal's screen cannot be read.
    probe: async () => {
      if (screen.reply === 'timeout') return null;            // TerminalProbes.request on its 300 ms timeout
      if (screen.reply === 'throw') throw new Error('probe failed');
      return { lines: screen.lines, safe: true, pooled: true };
    },
    proof,
    claudeVersion: async () => null,
    log: (e) => logs.push(e),
    now,
    sleep: async (ms) => { t += ms; if (onSleep) onSleep(); }
  });
  const send = (text, extra = {}) => sub.submit({ ptyId: 'p1', agentId: 'agy1', provider: opts.provider ?? 'antigravity', source: 'queue', text, ...extra });
  return { sub, proof, logs, writes, send, screen, advance: (ms) => { t += ms; }, setOnSleep: (f) => { onSleep = f; } };
}

test('#875 baseline: an unconfirmed send on an unreadable screen holds the next one', async () => {
  const r = rig();
  const first = await r.send('first wake message for the agent');
  assert.equal(first.outcome, 'unconfirmed');
  const second = await r.send('second message');
  assert.equal(second.outcome, 'held');
  assert.ok(r.logs.some((e) => e.outcome === 'held' && e.reason === 'earlier-in-box'));
});

test('#875: a PreInvocation after the earlier send lets the next one go', async () => {
  const r = rig();
  const first = await r.send('first wake message for the agent');
  assert.equal(first.outcome, 'unconfirmed');
  // agy took the prompt late (cold or resumed session), ran the turn and stopped.
  r.advance(60_000);
  r.proof.note('agy1', 'PreInvocation');
  r.proof.note('agy1', 'PreToolUse', undefined, { tool: 'Read' });
  r.proof.note('agy1', 'Stop');
  r.advance(60_000);
  const before = r.writes.length;
  const second = await r.send('second message');
  assert.notEqual(second.outcome, 'held');
  assert.ok(r.writes.slice(before).some((w) => w.includes('second message')), 'the second message was typed');
});

test('#875: a tool or a Stop alone is not proof the earlier send went', async () => {
  const r = rig();
  await r.send('first wake message for the agent');
  r.advance(60_000);
  // A turn already running, or a dialog the Enter answered (trigger-prompt-058): no prompt was taken.
  r.proof.note('agy1', 'PreToolUse', undefined, { tool: 'Read' });
  r.proof.note('agy1', 'Stop');
  r.advance(60_000);
  const second = await r.send('second message');
  assert.equal(second.outcome, 'held');
});

test('#875 review (Yeman): a PreInvocation never types onto the earlier text still seen in the box', async () => {
  const r = rig();
  const first = await r.send('first wake message for the agent');
  assert.equal(first.outcome, 'unconfirmed');
  // The tab is opened: the box is readable and our first text is still in it. PreInvocation is every model step,
  // so it proves nothing about the box.
  r.screen.lines = boxWith('first wake message for the agent');
  r.advance(60_000);
  r.proof.note('agy1', 'PreInvocation');
  const before = r.writes.length;
  const second = await r.send('second message');
  assert.equal(second.outcome, 'held');
  assert.ok(!r.writes.slice(before).some((w) => w.includes('second message')), 'never typed onto the first text');
});

test('#875 review: a readable empty box after the earlier send lets the next one go, as before', async () => {
  const r = rig();
  await r.send('first wake message for the agent');
  r.screen.lines = boxWith('');
  r.advance(60_000);
  const before = r.writes.length;
  const second = await r.send('second message');
  assert.notEqual(second.outcome, 'held');
  assert.ok(r.writes.slice(before).some((w) => w.includes('second message')));
});

// Dwight's review of a597eaea: each of these must keep the old hold.
async function laterSend(r, firstExtra = {}) {
  const first = await r.send('first wake message for the agent', firstExtra);
  r.advance(60_000);
  r.proof.note('agy1', 'PreInvocation');
  r.advance(60_000);
  const before = r.writes.length;
  const second = await r.send('second message');
  return { first, second, typedSecond: r.writes.slice(before).some((w) => w.includes('second message')) };
}

test('#875 review (Dwight): with a turn running before it was typed, an unread send is never left unproved (it ends stuck)', async () => {
  const r = rig();
  // A step of a running turn since the process started: the hook channel works.
  r.proof.note('agy1', 'PreInvocation');
  r.advance(1_000);
  const first = await r.send('first wake message for the agent');
  // The release only acts on an unconfirmed send; this one ends another way (stuck), the 0.6.0 behaviour.
  assert.notEqual(first.outcome, 'unconfirmed');
});

test('#875 review: Send now (idle false) as the earlier send keeps the hold', async () => {
  const r = rig();
  const { first, second, typedSecond } = await laterSend(r, { idle: false });
  assert.equal(first.outcome, 'unconfirmed');
  assert.equal(second.outcome, 'held');
  assert.equal(typedSecond, false);
});

test('#875 review: a crossed-out earlier send keeps the hold', async () => {
  const r = rig();
  const first = await r.send('first wake message for the agent', { ref: 'q1' });
  assert.equal(first.outcome, 'unconfirmed');
  assert.equal(r.sub.withdraw('q1'), true);
  r.advance(60_000);
  r.proof.note('agy1', 'PreInvocation');
  r.advance(60_000);
  const before = r.writes.length;
  const second = await r.send('second message');
  assert.equal(second.outcome, 'held');
  assert.ok(!r.writes.slice(before).some((w) => w.includes('second message')));
});

test('#875 review: another provider is unchanged by a PreInvocation', async () => {
  const r = rig({ provider: 'gemini' });
  const { first, second, typedSecond } = await laterSend(r);
  assert.equal(first.outcome, 'unconfirmed');
  assert.equal(second.outcome, 'held');
  assert.equal(typedSecond, false);
});

// Round 3 (Dwight and Yeman on f19e3bc3).
test('#875 round 3 (Dwight): a send that moved (a tool after our Enter, no prompt taken) is never released by a later step', async () => {
  const r = rig();
  let noted = false;
  r.setOnSleep(() => { if (!noted && r.writes.includes('\r')) { noted = true; r.proof.note('agy1', 'PreToolUse', undefined, { tool: 'Read' }); } });
  const first = await r.send('first wake message for the agent');
  r.setOnSleep(null);
  assert.equal(first.outcome, 'unconfirmed');
  assert.equal(first.moved, true);
  r.advance(5_000);
  r.proof.note('agy1', 'PreInvocation');   // the running turn's next model step
  const before = r.writes.length;
  const second = await r.send('second message');
  assert.equal(second.outcome, 'held');
  assert.ok(!r.writes.slice(before).some((w) => w.includes('second message')));
});

for (const reply of ['timeout', 'throw']) {
  test(`#875 round 3 (Yeman): a probe that ${reply === 'timeout' ? 'timed out' : 'threw'} keeps the hold, so a later read of the box still decides`, async () => {
    const r = rig();
    const first = await r.send('first wake message for the agent');
    assert.equal(first.outcome, 'unconfirmed');
    r.advance(60_000);
    r.proof.note('agy1', 'PreInvocation');
    r.screen.reply = reply;
    const before = r.writes.length;
    const second = await r.send('second message');
    assert.equal(second.outcome, 'held');
    // The renderer answers again and the first text is still in the box: never typed onto it.
    r.screen.reply = 'answer';
    r.screen.lines = boxWith('first wake message for the agent');
    r.advance(60_000);
    const third = await r.send('third message');
    assert.equal(third.outcome, 'held');
    assert.ok(!r.writes.slice(before).some((w) => w.includes('second message') || w.includes('third message')));
  });
}
