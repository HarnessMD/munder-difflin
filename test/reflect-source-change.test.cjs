'use strict';

// Drives the real MemoryReflector.reflectNow() path against temp files. The one
// non-deterministic step — the headless summarizer — is replaced by a gated mock
// so a test can write to memory.md while the LLM call is still in flight.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const hiddenClaude = loadTs('src/main/hiddenClaude.ts');
const { MemoryReflector } = loadTs('src/main/reflect.ts');

const AGENT_ID = 'agent-under-test';
const EVICTABLE_SECTION_COUNT = 8;
const RECENT_KEEP = 2;
const SECTION_FILLER = 'Routine standup detail that the condenser may summarize. '.repeat(8);

const REFLECT_SETTINGS = {
  enabled: true,
  intervalMs: 1_800_000,
  byteTriggerPct: 50,
  sectionTrigger: 50,
  recentKeep: RECENT_KEEP,
  minBytes: 0
};

function framedSummary(condensed) {
  return ['<<<CONDENSED>>>', condensed, '<<<HOIST>>>', '<<<END>>>'].join('\n');
}

const VALID_SUMMARY = { ok: true, text: framedSummary('Condensed: earlier standups shipped the parser fix.') };

function memoryFixture() {
  const sections = [];
  for (let index = 1; index <= EVICTABLE_SECTION_COUNT + RECENT_KEEP; index++) {
    sections.push(`## 2026-10-${String(index).padStart(2, '0')} standup\n${SECTION_FILLER}`);
  }
  return ['# Memory — agent-under-test', ...sections].join('\n\n') + '\n';
}

function makeHive(t) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'reflect-source-change-'));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const agentDir = path.join(home, 'hive', 'agents', AGENT_ID);
  fs.mkdirSync(agentDir, { recursive: true });
  const memoryPath = path.join(agentDir, 'memory.md');
  fs.writeFileSync(memoryPath, memoryFixture(), 'utf8');

  const logEvents = [];
  const reflector = new MemoryReflector(
    () => home,
    () => 'claude',
    () => ({}),
    () => REFLECT_SETTINGS,
    (event) => { logEvents.push(event); }
  );
  return { agentDir, memoryPath, logEvents, reflector };
}

function deferred() {
  let resolve;
  const promise = new Promise((settle) => { resolve = settle; });
  return { promise, resolve };
}

/** Hold the summarizer open: `started` settles once condense() is awaiting the
 *  LLM, and nothing returns until `release()` — no timing guesses. */
function gateSummarizer(t, response) {
  const started = deferred();
  const released = deferred();
  t.mock.method(hiddenClaude, 'runHiddenClaude', async () => {
    started.resolve();
    await released.promise;
    return response;
  });
  return { started: started.promise, release: () => released.resolve() };
}

/** Start a manual reflect, run `mutate` while the LLM call is pending, then let
 *  the summarizer answer and return the single per-agent outcome. */
async function reflectWhilePending(t, hive, mutate, response = VALID_SUMMARY) {
  const gate = gateSummarizer(t, response);
  const run = hive.reflector.reflectNow(AGENT_ID);
  await gate.started;
  mutate();
  gate.release();
  const results = await run;
  assert.equal(results.length, 1);
  return results[0];
}

function leftoverTempFiles(agentDir) {
  return fs.readdirSync(agentDir).filter((name) => name.startsWith('memory.md.tmp-'));
}

function abortReasons(logEvents) {
  return logEvents.filter((event) => event.kind === 'condense-abort').map((event) => event.reason);
}

test('unchanged source condenses normally (baseline contract)', async (t) => {
  const hive = makeHive(t);
  const original = fs.readFileSync(hive.memoryPath);

  const result = await reflectWhilePending(t, hive, () => {});

  assert.equal(result.condensed, true);
  assert.equal(result.reason, 'condensed');
  assert.equal(result.oldBytes, original.length);
  const rewritten = fs.readFileSync(hive.memoryPath, 'utf8');
  assert.ok(rewritten.length < original.length * 0.95);
  assert.match(rewritten, /## 🗜 Condensed history\n\nCondensed: earlier standups shipped the parser fix\./);
  assert.match(rewritten, /## 2026-10-10 standup/);
  assert.doesNotMatch(rewritten, /## 2026-10-01 standup/);
  assert.deepEqual(leftoverTempFiles(hive.agentDir), []);
});

function condenseEvent(logEvents) {
  return logEvents.filter((event) => event.kind === 'condense').at(-1);
}

/** Run `effect(n)` after the n-th fsync (1-based) of the swap's temp file — i.e.
 *  inside the synchronous swap, between the temp write and the re-check. */
function duringSwap(t, effect) {
  const realFsync = fs.fsyncSync;
  let calls = 0;
  t.mock.method(fs, 'fsyncSync', (fd) => { realFsync(fd); effect(++calls); });
}

const NEW_RULE = '\n## 2026-10-23 durable rule\nNever force-push the release branch.\n';

test('a write appended while the summarizer is pending is carried onto the condensed file', async (t) => {
  const hive = makeHive(t);

  const result = await reflectWhilePending(t, hive, () => {
    fs.appendFileSync(hive.memoryPath, NEW_RULE, 'utf8');
  });

  assert.equal(result.condensed, true);
  assert.equal(result.reason, 'condensed');
  const rewritten = fs.readFileSync(hive.memoryPath, 'utf8');
  assert.match(rewritten, /## 🗜 Condensed history/);
  assert.doesNotMatch(rewritten, /## 2026-10-01 standup/);
  assert.ok(rewritten.endsWith(NEW_RULE), 'the concurrent append must survive, verbatim and last');
  assert.equal(condenseEvent(hive.logEvents).carriedBytes, Buffer.byteLength(NEW_RULE));
  assert.deepEqual(abortReasons(hive.logEvents), []);
  assert.deepEqual(leftoverTempFiles(hive.agentDir), []);
});

test('an unchanged source logs no carriedBytes', async (t) => {
  const hive = makeHive(t);

  const result = await reflectWhilePending(t, hive, () => {});

  assert.equal(result.reason, 'condensed');
  assert.equal(fs.statSync(hive.memoryPath).size, result.newBytes);
  assert.equal(condenseEvent(hive.logEvents).carriedBytes, undefined);
});

test('a carried tail is not summarized in its own pass and stays as the newest section on the next', async (t) => {
  const hive = makeHive(t);
  const first = await reflectWhilePending(t, hive, () => {
    fs.appendFileSync(hive.memoryPath, NEW_RULE, 'utf8');
  });
  const prompt = hiddenClaude.runHiddenClaude.mock.calls[0].arguments.map(String).join('\n');
  assert.equal(first.reason, 'condensed');
  assert.match(prompt, /2026-10-01 standup/, 'sanity: the captured prompt holds the evicted text');
  assert.doesNotMatch(prompt, /Never force-push/, 'the tail arrived after the snapshot, so the LLM never saw it');
  hiddenClaude.runHiddenClaude.mock.restore();

  // Not gated: if the tail had been lost there would be nothing left to evict and
  // no LLM call, so a gate would never open.
  t.mock.method(hiddenClaude, 'runHiddenClaude', async () => VALID_SUMMARY);
  const [second] = await hive.reflector.reflectNow(AGENT_ID);

  assert.equal(second.reason, 'condensed');
  assert.ok(fs.readFileSync(hive.memoryPath, 'utf8').endsWith(NEW_RULE.slice(1)), 'kept verbatim as the newest recent section');
});

test('a multi-byte character split across the snapshot boundary is reassembled, not mangled', async (t) => {
  const hive = makeHive(t);
  const char = Buffer.from('記', 'utf8'); // 3 bytes
  assert.equal(char.length, 3);
  // The snapshot is taken before the agent's write; the write itself lands in
  // two pieces, the second one only once the swap is already underway.
  duringSwap(t, (n) => { if (n === 1) fs.appendFileSync(hive.memoryPath, Buffer.concat([char.subarray(2), Buffer.from('\n')])); });

  const result = await reflectWhilePending(t, hive, () => {
    fs.appendFileSync(hive.memoryPath, Buffer.concat([Buffer.from('note '), char.subarray(0, 2)]));
  });

  assert.equal(result.reason, 'condensed');
  const after = fs.readFileSync(hive.memoryPath);
  assert.ok(Buffer.from(after.toString('utf8'), 'utf8').equals(after), 'result is valid UTF-8');
  assert.ok(after.toString('utf8').endsWith('note 記\n'));
});

test('an append that continues the last line (no trailing newline) is carried byte-for-byte', async (t) => {
  const hive = makeHive(t);
  fs.writeFileSync(hive.memoryPath, memoryFixture().trimEnd(), 'utf8');
  const tail = ' (continued after the snapshot)\n';

  const result = await reflectWhilePending(t, hive, () => {
    fs.appendFileSync(hive.memoryPath, tail, 'utf8');
  });

  assert.equal(result.reason, 'condensed');
  assert.ok(fs.readFileSync(hive.memoryPath, 'utf8').endsWith(tail));
  assert.equal(condenseEvent(hive.logEvents).carriedBytes, Buffer.byteLength(tail));
});

test('appends that land inside the swap are carried too', async (t) => {
  const hive = makeHive(t);
  const first = '\n## late 1\nwritten after the temp file\n';
  const second = '\n## late 2\nwritten after the first carry\n';
  duringSwap(t, (n) => {
    if (n === 1) fs.appendFileSync(hive.memoryPath, first, 'utf8');
    if (n === 2) fs.appendFileSync(hive.memoryPath, second, 'utf8');
  });

  const result = await reflectWhilePending(t, hive, () => {});

  assert.equal(result.reason, 'condensed');
  assert.ok(fs.readFileSync(hive.memoryPath, 'utf8').endsWith(first + second));
  assert.equal(condenseEvent(hive.logEvents).carriedBytes, Buffer.byteLength(first + second));
  assert.deepEqual(leftoverTempFiles(hive.agentDir), []);
});

test('a source that never stops growing aborts after bounded rounds and keeps every append', async (t) => {
  const hive = makeHive(t);
  duringSwap(t, (n) => { fs.appendFileSync(hive.memoryPath, `\nappend ${n}\n`, 'utf8'); });

  const result = await reflectWhilePending(t, hive, () => {});

  assert.equal(result.condensed, false);
  assert.equal(result.reason, 'source-changed');
  const after = fs.readFileSync(hive.memoryPath, 'utf8');
  assert.match(after, /## 2026-10-01 standup/, 'the original is left in place');
  assert.match(after, /append 1\n[\s\S]*append 4\n$/);
  assert.deepEqual(leftoverTempFiles(hive.agentDir), []);
});

test('a carried tail that is rewritten before the rename aborts the swap', async (t) => {
  const hive = makeHive(t);
  const snapshot = fs.readFileSync(hive.memoryPath);
  let expected;
  duringSwap(t, (n) => {
    if (n === 1) fs.appendFileSync(hive.memoryPath, 'tail-AAAA\n', 'utf8');
    if (n === 2) {
      fs.writeFileSync(hive.memoryPath, Buffer.concat([snapshot, Buffer.from('tail-BBBB\n')]));
      expected = fs.readFileSync(hive.memoryPath);
    }
  });

  const result = await reflectWhilePending(t, hive, () => {});

  assert.equal(result.reason, 'source-changed');
  assert.ok(fs.readFileSync(hive.memoryPath).equals(expected));
  assert.deepEqual(leftoverTempFiles(hive.agentDir), []);
});

test('an in-place edit while the summarizer is pending aborts and keeps the edit', async (t) => {
  const hive = makeHive(t);
  let expected;

  const result = await reflectWhilePending(t, hive, () => {
    const text = fs.readFileSync(hive.memoryPath, 'utf8');
    fs.writeFileSync(hive.memoryPath, text.replace('## 2026-10-05 standup', '## 2026-10-05 standup (edited)'), 'utf8');
    expected = fs.readFileSync(hive.memoryPath);
  });

  assert.equal(result.condensed, false);
  assert.equal(result.reason, 'source-changed');
  assert.ok(fs.readFileSync(hive.memoryPath).equals(expected), 'memory.md must keep the concurrent edit');
  assert.deepEqual(abortReasons(hive.logEvents), ['source-changed']);
  assert.deepEqual(leftoverTempFiles(hive.agentDir), []);
});

test('an equal-length edit with the mtime restored is still detected', async (t) => {
  const hive = makeHive(t);
  const before = fs.statSync(hive.memoryPath);
  let expected;

  const result = await reflectWhilePending(t, hive, () => {
    const text = fs.readFileSync(hive.memoryPath, 'utf8');
    const edited = text.replace('## 2026-10-01 standup', '## 2026-10-01 STANDUP');
    assert.equal(Buffer.byteLength(edited), Buffer.byteLength(text));
    fs.writeFileSync(hive.memoryPath, edited, 'utf8');
    fs.utimesSync(hive.memoryPath, before.atime, before.mtime);
    expected = fs.readFileSync(hive.memoryPath);
  });

  assert.equal(result.reason, 'source-changed');
  assert.ok(fs.readFileSync(hive.memoryPath).equals(expected));
});

test('a source deleted while pending is not resurrected from the stale snapshot', async (t) => {
  const hive = makeHive(t);

  const result = await reflectWhilePending(t, hive, () => { fs.rmSync(hive.memoryPath); });

  assert.equal(result.condensed, false);
  assert.equal(result.reason, 'source-check-failed');
  assert.equal(fs.existsSync(hive.memoryPath), false);
  assert.deepEqual(abortReasons(hive.logEvents), ['source-check-failed']);
  assert.deepEqual(leftoverTempFiles(hive.agentDir), []);
});

test('an unreadable source fails closed without renaming', async (t) => {
  const hive = makeHive(t);
  const renameSpy = t.mock.method(fs, 'renameSync');

  // Replacing the file with a directory makes the re-read throw (EISDIR) on
  // every platform, without mocking the read itself.
  const result = await reflectWhilePending(t, hive, () => {
    fs.rmSync(hive.memoryPath);
    fs.mkdirSync(hive.memoryPath);
  });

  assert.equal(result.reason, 'source-check-failed');
  assert.equal(renameSpy.mock.callCount(), 0);
  assert.ok(fs.statSync(hive.memoryPath).isDirectory());
  assert.deepEqual(leftoverTempFiles(hive.agentDir), []);
});

test('a failed rename reports swap-failed, keeps the original, and removes the temp file', async (t) => {
  const hive = makeHive(t);
  const original = fs.readFileSync(hive.memoryPath);
  t.mock.method(fs, 'renameSync', () => {
    throw Object.assign(new Error('EPERM: operation not permitted, rename'), { code: 'EPERM' });
  });

  const result = await reflectWhilePending(t, hive, () => {});

  assert.equal(result.condensed, false);
  assert.equal(result.reason, 'swap-failed');
  assert.ok(fs.readFileSync(hive.memoryPath).equals(original));
  assert.deepEqual(abortReasons(hive.logEvents), ['swap-failed']);
  assert.deepEqual(leftoverTempFiles(hive.agentDir), []);
});

test('summarizer failures leave the source byte-for-byte untouched', async (t) => {
  const failures = [
    { ok: false, error: 'hidden claude: timed out after 180000ms' },
    { ok: true, text: '<<<CONDENSED>>>\nhalf a summary\n<<<HOIST>>>' },
    { ok: true, text: '{"condensed": "unterminated' }
  ];
  for (const response of failures) {
    const hive = makeHive(t);
    const original = fs.readFileSync(hive.memoryPath);

    const result = await reflectWhilePending(t, hive, () => {}, response);

    assert.equal(result.reason, 'summarize-failed');
    assert.ok(fs.readFileSync(hive.memoryPath).equals(original));
    hiddenClaude.runHiddenClaude.mock.restore();
  }
});

test('the next pass after a source-changed abort reads the new source and condenses', async (t) => {
  const hive = makeHive(t);

  // An in-place edit of the newest (kept) section — not an append, so the pass aborts.
  const aborted = await reflectWhilePending(t, hive, () => {
    const text = fs.readFileSync(hive.memoryPath, 'utf8');
    fs.writeFileSync(hive.memoryPath, text.replace('## 2026-10-10 standup\n', '## 2026-10-10 standup\nNever force-push the release branch.\n'), 'utf8');
  });
  assert.equal(aborted.reason, 'source-changed');
  hiddenClaude.runHiddenClaude.mock.restore();

  const retried = await reflectWhilePending(t, hive, () => {});

  assert.equal(retried.reason, 'condensed');
  assert.match(fs.readFileSync(hive.memoryPath, 'utf8'), /Never force-push the release branch\./);
});

test('a source that is not valid UTF-8 is not rewritten through a lossy decode', async (t) => {
  const hive = makeHive(t);
  const invalidUtf8 = Buffer.concat([fs.readFileSync(hive.memoryPath), Buffer.from([0xff, 0xfe, 0x0a])]);
  fs.writeFileSync(hive.memoryPath, invalidUtf8);
  const summarizer = t.mock.method(hiddenClaude, 'runHiddenClaude', async () => VALID_SUMMARY);

  const [result] = await hive.reflector.reflectNow(AGENT_ID);

  assert.equal(result.condensed, false);
  assert.equal(result.reason, 'source-encoding-invalid');
  assert.equal(summarizer.mock.callCount(), 0, 'no LLM call is spent on a file that cannot be rewritten');
  assert.ok(fs.readFileSync(hive.memoryPath).equals(invalidUtf8));
});
