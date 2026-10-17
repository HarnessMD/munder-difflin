'use strict';

/**
 * Condensation end to end: the reflector, the injected hidden runner, and memory.md.
 *
 * The v1.1.46 path could accept free-form text scraped from an unrelated transcript and
 * write it into an agent's memory. These drive `reflectNow()` against a real fixture home
 * and assert the two halves that matter: a VALID structured payload condenses the file,
 * and every capture failure leaves `memory.md` BYTE-IDENTICAL with one `condense-abort`.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { MemoryReflector } = loadTs('src/main/reflect.ts');

const PINNED_HEADING = '## 📌 Durable facts (pinned — never condensed)';
const CONDENSED_HEADING = '## 🗜 Condensed history';
const RECENT_HEADING = '## Recent';

/** A memory.md well over the trigger, with pinned lines and many recent sections. */
function fixtureMemory() {
  const recent = [];
  for (let i = 0; i < 40; i++) {
    recent.push(`## day ${i}`);
    recent.push(`work item ${i}: ${'detail '.repeat(200)}`);
    recent.push('');
  }
  return [
    '# Andy memory',
    '',
    PINNED_HEADING,
    '- pinned: never lose this line',
    '',
    CONDENSED_HEADING,
    `previously condensed history ${'blah '.repeat(500)}`,
    '',
    RECENT_HEADING,
    ...recent
  ].join('\n');
}

/** A fixture harness home with one agent, plus a reflector wired to a stub runner. */
function fixture(runHidden) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'reflect-'));
  const agentDir = path.join(home, 'hive', 'agents', 'andy');
  fs.mkdirSync(agentDir, { recursive: true });
  const mem = path.join(agentDir, 'memory.md');
  fs.writeFileSync(mem, fixtureMemory());
  const logs = [];
  const reflector = new MemoryReflector(
    () => home,
    () => 'claude',
    () => ({}),
    () => ({ enabled: true, intervalMs: 60_000, byteTriggerPct: 50, sectionTrigger: 10, recentKeep: 5, minBytes: 1 }),
    (e) => logs.push(e),
    runHidden
  );
  return { home, mem, logs, reflector, cleanup: () => fs.rmSync(home, { recursive: true, force: true }) };
}

const framed = (condensed, hoist = []) =>
  ['<<<CONDENSED>>>', condensed, '<<<HOIST>>>', ...hoist.map((h) => `- ${h}`), '<<<END>>>'].join('\n');
const okResult = (text = framed('a much shorter history', ['pinned: a new durable fact'])) =>
  async () => ({ ok: true, sessionId: '11111111-1111-4111-8111-111111111111', result: text });

test('a valid framed result condenses the file and hoists the new pinned line', async () => {
  const f = fixture(okResult());
  const before = fs.readFileSync(f.mem, 'utf8');
  const [r] = await f.reflector.reflectNow('andy');
  assert.equal(r.condensed, true, r.reason);
  const after = fs.readFileSync(f.mem, 'utf8');
  assert.ok(after.length < before.length);
  assert.ok(after.includes('a much shorter history'));
  assert.ok(after.includes('- pinned: never lose this line'));
  assert.ok(f.logs.some((e) => e.kind === 'condense'));
  f.cleanup();
});

for (const [name, runHidden] of [
  ['a capture failure', async () => ({ ok: false, error: 'stdout was not JSON' })],
  ['a session id mismatch', async () => ({ ok: false, error: 'session id mismatch' })],
  ['a nonzero exit', async () => ({ ok: false, error: 'claude exited 3' })],
  ['a timeout', async () => ({ ok: false, error: 'hidden session timed out' })],
  ['an oversized capture', async () => ({ ok: false, error: 'stdout exceeded 1048576 bytes' })],
  ['an empty result', async () => ({ ok: true, result: undefined })],
  ['prose without the frame', async () => ({ ok: true, result: 'Sure! Here is your condensed memory.' })]
]) {
  test(`FAIL CLOSED: ${name} leaves memory.md byte-identical`, async () => {
    const f = fixture(runHidden);
    const before = fs.readFileSync(f.mem);
    const [r] = await f.reflector.reflectNow('andy');
    assert.equal(r.condensed, false);
    assert.deepEqual(fs.readFileSync(f.mem), before);
    const aborts = f.logs.filter((e) => e.kind === 'condense-abort');
    assert.equal(aborts.length, 1);
    assert.equal(aborts[0].reason, 'summarize-failed');
    f.cleanup();
  });
}

test('SAFETY UNCHANGED: a valid summary that is not smaller is still refused', async () => {
  const f = fixture(async () => ({ ok: true, result: framed('x'.repeat(400_000)) }));
  const before = fs.readFileSync(f.mem);
  const [r] = await f.reflector.reflectNow('andy');
  assert.equal(r.condensed, false);
  assert.deepEqual(fs.readFileSync(f.mem), before);
  assert.ok(f.logs.some((e) => e.kind === 'condense-abort' && e.reason === 'not-smaller'));
  f.cleanup();
});

test('the reflector runs a pure text transform: no shell, no edits', async () => {
  let seen = null;
  const f = fixture(async (_prompt, opts) => { seen = opts; return okResult()(); });
  await f.reflector.reflectNow('andy');
  assert.ok(seen.disallowedTools.includes('Bash'));
  assert.ok(seen.disallowedTools.includes('Write'));
  f.cleanup();
});
