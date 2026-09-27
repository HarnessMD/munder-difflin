'use strict';

// F2 (founder, 24 Sep 2026): "this happens when computer is using a lot of
// resources and things get slow and hence the action that's taken inside the
// native cli agent's input area results in a new line instead of sending it."
//
// A model of the TUI the founder described: busy, it reads its input only
// every `busyMs`, and it takes everything waiting in one read. A read longer
// than one byte is a paste, and a Return inside a paste is a newline. A lone
// Return submits the box. The test drives the real typeAndSubmit on a fake
// clock, and replays #81's clock-timed sequence to show the bug it left.

const test = require('node:test');
const assert = require('node:assert/strict');
const loadTs = require('./load-ts.cjs');
const { typeAndSubmit, PTY_SUBMIT_DELAY_MS } = loadTs('src/shared/providerAutomation.ts');

const RULE = '─'.repeat(80);
const MSG = 'please review the checkout flow and report back';

function slowTui(busyMs) {
  let now = 0;
  let nextRead = busyMs;
  let pending = '';
  let box = '';
  const submitted = [];
  const readNow = () => {
    if (!pending) return;
    const chunk = pending; pending = '';
    if (chunk === '\r') { if (box.trim()) { submitted.push(box); box = ''; } return; }
    box += chunk.replace(/\r/g, '\n'); // a paste: every Return is a newline
  };
  const advance = (ms) => {
    const until = now + ms;
    while (nextRead <= until) { now = nextRead; readNow(); nextRead += busyMs; }
    now = until;
  };
  const screen = () => ['❯ earlier', '', RULE, ...box.split('\n').map((l, i) => (i ? '  ' : '❯ ') + l), RULE, '  status'];
  const io = {
    write: async (d) => { pending += d; },
    screen,
    sleep: async (ms) => advance(ms)
  };
  return { io, submitted, get box() { return box; }, get now() { return now; } };
}

// #81 as merged: text, 240ms, Return, then Returns 400, 800 and 1600ms later
// while the text still shows (it did not wait for the text to show first).
async function clockRetries(io, text) {
  await io.write(text);
  await io.sleep(PTY_SUBMIT_DELAY_MS);
  await io.write('\r');
  for (const wait of [400, 800, 1600]) {
    await io.sleep(wait);
    const s = io.screen().join('');
    if (!s.includes(text.slice(-24))) break;
    await io.write('\r');
  }
}

test('a quick TUI: one Return, submitted once', async () => {
  const t = slowTui(50);
  const r = await typeAndSubmit(t.io, MSG, MSG);
  assert.equal(r.submitted, true);
  assert.deepEqual(t.submitted, [MSG]);
  assert.equal(r.returns, 1);
});

test('the founder\'s bug, reproduced: on a TUI busy for 4s the clock timed Returns all become newlines', async () => {
  const t = slowTui(4000);
  await clockRetries(t.io, MSG);
  await t.io.sleep(20_000);
  assert.deepEqual(t.submitted, [], 'nothing was sent');
  assert.match(t.box, /\n/, 'the Returns sit in the box as newlines');
});

for (const busy of [1000, 4000, 9000]) {
  test(`a TUI busy for ${busy}ms: the message is sent, exactly once`, async () => {
    const t = slowTui(busy);
    const r = await typeAndSubmit(t.io, MSG, MSG);
    assert.equal(r.echoed, true, 'waited for the text to show');
    assert.equal(r.submitted, true);
    assert.deepEqual(t.submitted, [MSG]);
    assert.equal(t.box, '');
  });
}

test('a Return that became a newline anyway is followed by one more, and the message still goes', async () => {
  // Busy 3s, and the text arrives so late that our Return joins its read.
  const t = slowTui(3000);
  // Force the merge: the text and a Return both wait for the same late read.
  await t.io.write(MSG); await t.io.write('\r');
  await t.io.sleep(3000);
  assert.match(t.box, /\n$/, 'the Return became a newline');
  // typeAndSubmit then runs with the text already typed (its own text write is dropped).
  const r = await typeAndSubmit({ ...t.io, write: async (d) => { if (d !== MSG) await t.io.write(d); } }, MSG, MSG);
  assert.equal(r.submitted, true);
  assert.equal(t.submitted.length, 1);
});

test('no Return is added while the TUI has not read the last one', async () => {
  const writes = [];
  const t = slowTui(9000);
  const io = { ...t.io, write: async (d) => { writes.push([t.now, d]); await t.io.write(d); } };
  await typeAndSubmit(io, MSG, MSG);
  const returns = writes.filter(([, d]) => d === '\r');
  assert.equal(returns.length, 1, 'one Return, read alone, is all it took');
});

test('a screen with no input box keeps the old behaviour: the gap and one Return', async () => {
  const writes = [];
  const io = { write: async (d) => { writes.push(d); }, screen: () => ['plain output'], sleep: async () => {} };
  const r = await typeAndSubmit(io, MSG, MSG);
  assert.equal(r.echoed, null);
  assert.deepEqual(writes, [MSG, '\r']);
});
