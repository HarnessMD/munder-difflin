'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');
const hidden = loadTs('src/main/hiddenClaude.ts');
const runner = fs.existsSync(path.join(__dirname, '../src/main/reflectSession.ts')) ? loadTs('src/main/reflectSession.ts') : null;
const { MemoryReflector } = loadTs('src/main/reflect.ts');
const settings = { enabled: true, intervalMs: 60_000, byteTriggerPct: 0, sectionTrigger: 0, recentKeep: 1, minBytes: 0 };
const summary = '<<<CONDENSED>>>\nKeep the original decisions, paths and protocol.\n<<<HOIST>>>\n- durable new fact\n<<<END>>>';
const memory = '# Memory — Jim\n\n## 📌 Durable facts (pinned — never condensed)\n- never lose this\n\n## Old\n' + 'Archived decision and protocol. '.repeat(200) + '\n\n## Latest\n' + 'Recent exact content. '.repeat(5) + '\n';

function fixture(t, agent = { provider: 'opencode', model: 'local/model' }, extra = {}) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'md reflect provider '));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const mem = path.join(home, 'hive', 'agents', 'jim', 'memory.md');
  fs.mkdirSync(path.dirname(mem), { recursive: true }); fs.writeFileSync(mem, memory);
  const calls = [], events = [];
  let result = { ok: true, text: summary };
  const record = async (prompt, opts) => { calls.push({ prompt, ...opts }); return result; };
  t.mock.method(hidden, 'runHiddenClaude', record);
  if (runner) t.mock.method(runner, 'runReflectSession', record);
  const reflector = new MemoryReflector(() => home, () => 'claude', () => ({ MEMPALACE_PALACE_PATH: '/local palace' }), () => ({ ...settings, ...extra }), event => events.push(event), () => agent);
  return { home, mem, calls, events, reflector, reply(value) { result = value; } };
}

test('an OpenCode worker reflects with its own provider/model, not the global Claude command', async t => {
  const f = fixture(t); const [outcome] = await f.reflector.reflectNow('jim');
  assert.equal(outcome.condensed, true);
  assert.equal(f.calls[0].provider, 'opencode'); assert.equal(f.calls[0].model, 'local/model');
  assert.equal(f.calls[0].command, 'opencode');
  const written = fs.readFileSync(f.mem, 'utf8');
  assert.match(written, /never lose this/); assert.ok(written.includes('Recent exact content. '.repeat(5).trim()));
  const backup = f.events.find(e => e.kind === 'condense').backup;
  assert.equal(fs.readFileSync(backup, 'utf8'), memory);
});

test('explicit reflect provider/model/command overrides the worker selection', async t => {
  const f = fixture(t, { provider: 'claude' }, { provider: 'opencode', model: 'local/cheap', command: '"/a path/opencode"' });
  await f.reflector.reflectNow('jim');
  assert.equal(f.calls[0].provider, 'opencode'); assert.equal(f.calls[0].model, 'local/cheap');
  assert.equal(f.calls[0].command, '/a path/opencode');
});

test('legacy Claude agents retain the cheap default unless reflectModel is set', async t => {
  const f = fixture(t, { provider: 'claude' }); await f.reflector.reflectNow('jim');
  assert.equal(f.calls[0].provider, 'claude'); assert.equal(f.calls[0].model, 'claude-haiku-4-5');
});

test('quota text is classified separately, preserves memory, and prevents repeated calls', async t => {
  let now = Date.UTC(2026, 8, 24); t.mock.method(Date, 'now', () => now);
  const f = fixture(t);
  f.reply({ ok: true, text: "You've hit your weekly limit · resets Sep 25, 6am (UTC)" });
  const [first] = await f.reflector.reflectNow('jim');
  assert.equal(first.reason, 'rate-limited'); assert.equal(first.retryAt, Date.UTC(2026, 8, 25, 6));
  assert.equal(fs.readFileSync(f.mem, 'utf8'), memory);
  assert.equal(f.events.at(-1).reason, 'rate-limited'); assert.equal(f.events.at(-1).provider, 'opencode');
  await f.reflector.reflectNow(); await f.reflector.reflectNow('jim');
  assert.equal(f.calls.length, 1, 'even manual calls honor the known reset');
  now = first.retryAt + 1; f.reply({ ok: true, text: summary });
  assert.equal((await f.reflector.reflectNow('jim'))[0].condensed, true);
  assert.equal(f.calls.length, 2);
});

test('unknown-reset quotas use increasing bounded backoff', async t => {
  let now = 1_000_000; t.mock.method(Date, 'now', () => now);
  const f = fixture(t, { provider: 'opencode' }, { retryBackoffMs: 60_000 });
  f.reply({ ok: false, error: 'HTTP 429: quota exceeded' });
  const first = (await f.reflector.reflectNow('jim'))[0]; assert.equal(first.retryAt, now + 60_000);
  await f.reflector.reflectNow('jim'); assert.equal(f.calls.length, 1);
  now = first.retryAt + 1;
  const second = (await f.reflector.reflectNow('jim'))[0]; assert.equal(second.retryAt, now + 120_000);
  assert.equal(fs.readFileSync(f.mem, 'utf8'), memory);
});

test('workers sharing the same reflect account/model do not each retry its exhausted quota', async t => {
  const f = fixture(t); const other = path.join(f.home, 'hive', 'agents', 'dwight', 'memory.md');
  fs.mkdirSync(path.dirname(other), { recursive: true }); fs.writeFileSync(other, memory);
  f.reply({ ok: false, error: 'rate limited: retry after 2 hours' });
  const results = await f.reflector.reflectNow();
  assert.equal(results.length, 2); assert.equal(f.calls.length, 1);
  assert.equal(results[0].reason, 'rate-limited'); assert.equal(results[1].retryAt, results[0].retryAt);
  assert.equal(fs.readFileSync(other, 'utf8'), memory);
});

test('invalid backoff config cannot turn cooldown into a NaN and cause blind retries', async t => {
  const f = fixture(t, { provider: 'opencode' }, { retryBackoffMs: NaN });
  f.reply({ ok: false, error: 'quota exceeded' });
  const first = (await f.reflector.reflectNow('jim'))[0];
  assert.ok(Number.isFinite(first.retryAt)); assert.ok(first.retryAt > Date.now());
  await f.reflector.reflectNow('jim'); assert.equal(f.calls.length, 1);
});

test('malformed model output remains a parse failure, not a quota failure, and cannot rewrite memory', async t => {
  const f = fixture(t); f.reply({ ok: true, text: 'not a framed summary' });
  const [result] = await f.reflector.reflectNow('jim');
  assert.equal(result.reason, 'summarize-failed'); assert.equal(fs.readFileSync(f.mem, 'utf8'), memory);
});

test('a valid summary mentioning quotas is not mistaken for a provider limit', async t => {
  const f = fixture(t); f.reply({ ok: true, text: summary.replace('Keep the original decisions, paths and protocol.', 'The old task failed with HTTP 429 quota exceeded; use a local model.') });
  assert.equal((await f.reflector.reflectNow('jim'))[0].condensed, true);
});
