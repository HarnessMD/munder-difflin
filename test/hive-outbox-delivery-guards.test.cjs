'use strict';

/**
 * Delivery guards for the outbox router (ported onto current upstream main).
 *
 * The bug class: the router JSON.parsed the raw file, so a leading UTF-8 BOM
 * (PowerShell's `Set-Content -Encoding UTF8`) made the parse throw; the file was
 * renamed `bad-*` and moved aside with NO error and NO notice to the sender.
 * Floor-wide, 71 files were quarantined this way. A silent drop is a dead
 * dispatch: the sender believes it was heard and waits forever.
 *
 * These tests cover the delivery half of the port:
 *   - a BOM'd but valid message is DELIVERED (the BOM is an encoding artefact);
 *   - an unparseable file is REJECTED BACK to its sender, through the normal
 *     inbox path, as a terminal `inform` (never `request` — replying to
 *     from='harness' bounces);
 *   - envelope guards: size (configurable), UTF-16 (with or without a BOM),
 *     invalid UTF-8;
 *   - payload guards: non-string body (the PSObject-wrapper trap), bad `to`;
 *   - a rejection notice is per-sender rate-limited, but every rejection is
 *     still logged;
 *   - the stuck-rejection memory is a bounded LRU and a rewritten file is
 *     still delivered;
 *   - a quarantined `bad-*` file can never re-enter routing;
 *   - a non-regular `*.json` entry is logged, not silently skipped;
 *   - a non-object JSON document is rejected, not delivered as a blank inform;
 *   - an archive failure after delivery is logged, not misreported as a drop;
 *   - quarantine never overwrites an earlier `bad-<file>`, and the notice does
 *     not claim a quarantine that did not happen.
 *
 * Upstream's own test/hive-malformed-outbox.test.cjs (the #430 literal-line-
 * break repair) is intentionally left untouched; this file is the addition.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { HiveManager } = loadTs('src/main/hive.ts');

const ENV_CAP = 'HIVE_OUTBOX_MAX_BYTES';

async function floor(t) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'md-outbox-guards-'));
  t.after(() => {
    delete process.env[ENV_CAP];
    fs.rmSync(home, { recursive: true, force: true });
  });
  const hive = new HiveManager(() => home);
  await hive.ensureAgent({ id: 'god-1', name: 'Michael', provider: 'claude', cwd: home, isGod: true });
  await hive.ensureAgent({ id: 'worker-1', name: 'Creed', provider: 'claude', cwd: home });
  const outbox = path.join(home, 'hive', 'agents', 'worker-1', 'outbox');
  return { hive, outbox };
}

function writeOutbox(outbox, filename, raw) {
  const file = path.join(outbox, filename);
  fs.writeFileSync(file, raw, 'utf8');
  return file;
}

const validMessage = (over = {}) => JSON.stringify({
  to: 'god',
  act: 'done',
  subject: 'done',
  body: 'all done',
  requires_reply: false,
  ...over
});

const notices = (hive) => hive.inbox('worker-1')
  .filter((m) => m.from === 'harness' && m.subject.startsWith('Outbox message NOT delivered'));

const drops = (hive, reason) =>
  hive.logTail(5000).filter((e) => e.kind === 'drop' && e.reason === reason && e.rejected === true);

test('a UTF-8 BOM is an encoding artefact: the message is delivered, not quarantined', async (t) => {
  const { hive, outbox } = await floor(t);
  writeOutbox(outbox, 'bom.json', '\uFEFF' + validMessage({ subject: 'from a BOM file' }));

  assert.equal(hive.routeOnce(), 1);
  assert.equal(hive.inbox('god-1').length, 1);
  assert.equal(hive.inbox('god-1')[0].subject, 'from a BOM file');
  // Archived as a DELIVERED file, not as a rejected one.
  assert.equal(fs.existsSync(path.join(outbox, '.sent', 'bom.json')), true);
  assert.equal(fs.existsSync(path.join(outbox, '.sent', 'bad-bom.json')), false);
  assert.deepEqual(notices(hive), []);
});

test('unparseable JSON is rejected back to the sender as a terminal inform', async (t) => {
  const { hive, outbox } = await floor(t);
  writeOutbox(outbox, 'broken.json', '{"to":"god","body":');

  assert.equal(hive.routeOnce(), 0);
  const [notice] = notices(hive);
  assert.ok(notice, 'the sender must be told the file was not delivered');
  assert.equal(notice.act, 'inform');
  assert.equal(notice.requires_reply, false, 'a rejection must never invite a reply');
  assert.match(notice.subject, /broken\.json/);
  assert.match(notice.body, /NOT delivered/);
  assert.match(notice.body, /malformed-json/);

  assert.equal(drops(hive, 'malformed-json').length, 1);
  assert.equal(fs.existsSync(path.join(outbox, '.sent', 'bad-broken.json')), true);
  assert.equal(fs.existsSync(path.join(outbox, 'broken.json')), false);
});

test('a quarantined bad-* file can never re-enter routing', async (t) => {
  const { hive, outbox } = await floor(t);
  writeOutbox(outbox, 'broken.json', 'not json at all');

  hive.routeOnce();
  const inboxAfterFirst = hive.inbox('god-1').length;
  // Nothing is left in the outbox root, and .sent is never scanned as input:
  // a second tick is a no-op and cannot re-deliver or re-reject.
  assert.equal(hive.routeOnce(), 0);
  assert.equal(hive.inbox('god-1').length, inboxAfterFirst);
  assert.equal(drops(hive, 'malformed-json').length, 1);
});

test('a body that is not a string is rejected (the PSObject-wrapper trap)', async (t) => {
  const { hive, outbox } = await floor(t);
  writeOutbox(outbox, 'wrapper.json', validMessage({ body: { Length: 1024, graph: { a: 1 } } }));

  assert.equal(hive.routeOnce(), 0);
  const [notice] = notices(hive);
  assert.ok(notice);
  assert.match(notice.body, /body-not-string/);
  assert.equal(hive.inbox('god-1').length, 0, 'the poison message must not be delivered');
});

test('a `to` that is not a non-empty string is rejected', async (t) => {
  const { hive, outbox } = await floor(t);
  writeOutbox(outbox, 'no-recipient.json', validMessage({ to: 42 }));

  assert.equal(hive.routeOnce(), 0);
  const [notice] = notices(hive);
  assert.ok(notice);
  assert.match(notice.body, /bad-recipient/);
});

test('a UTF-16 file is rejected as wrong-encoding', async (t) => {
  const { hive, outbox } = await floor(t);
  fs.writeFileSync(path.join(outbox, 'utf16.json'), Buffer.from('\uFEFF' + validMessage(), 'utf16le'));

  assert.equal(hive.routeOnce(), 0);
  const [notice] = notices(hive);
  assert.match(notice.body, /wrong-encoding/);
  assert.equal(drops(hive, 'wrong-encoding').length, 1);
});

test('BOM-less UTF-16LE is wrong-encoding, not malformed-json', async (t) => {
  const { hive, outbox } = await floor(t);
  fs.writeFileSync(path.join(outbox, 'utf16-nobom.json'), Buffer.from(validMessage(), 'utf16le'));

  assert.equal(hive.routeOnce(), 0);
  const [notice] = notices(hive);
  assert.ok(notice, 'the sender must be told');
  assert.match(notice.body, /wrong-encoding/);
  assert.match(notice.body, /UTF-16LE without a BOM/);
  assert.equal(drops(hive, 'wrong-encoding').length, 1);
  assert.equal(drops(hive, 'malformed-json').length, 0, 'it is an encoding problem, not bad JSON');
  assert.equal(hive.inbox('god-1').length, 0);
  assert.equal(fs.existsSync(path.join(outbox, '.sent', 'bad-utf16-nobom.json')), true);
});

test('invalid UTF-8 is rejected instead of delivered as U+FFFD noise', async (t) => {
  const { hive, outbox } = await floor(t);
  // 0xC3 0x28 is an invalid two-byte sequence.
  fs.writeFileSync(path.join(outbox, 'bad-bytes.json'), Buffer.from([0x7b, 0xc3, 0x28, 0x7d]));

  assert.equal(hive.routeOnce(), 0);
  const [notice] = notices(hive);
  assert.match(notice.body, /wrong-encoding/);
  assert.equal(hive.inbox('god-1').length, 0);
});

test('the outbox size cap is configurable and the rejection names the limit', async (t) => {
  const { hive, outbox } = await floor(t);
  process.env[ENV_CAP] = '120';
  writeOutbox(outbox, 'long.json', validMessage({ body: 'x'.repeat(400) }));

  assert.equal(hive.routeOnce(), 0);
  const [notice] = notices(hive);
  assert.ok(notice);
  assert.match(notice.body, /body-too-large/);
  assert.match(notice.body, /140 bytes|more than 120|cap 120/);
  assert.match(notice.body, new RegExp(ENV_CAP));
  assert.equal(hive.inbox('god-1').length, 0);
});

test('rejection notices are rate-limited per sender, but every rejection is logged', async (t) => {
  const { hive, outbox } = await floor(t);
  for (let i = 0; i < 6; i++) writeOutbox(outbox, `broken-${i}.json`, '{ nope');

  hive.routeOnce();
  assert.equal(notices(hive).length, 3, 'the burst must not put one notice per file in the inbox');
  assert.equal(drops(hive, 'malformed-json').length, 6, 'every rejection is still in the log');
  const suppressed = hive.logTail(5000)
    .filter((e) => e.reason === 'rejection-notice-suppressed');
  assert.equal(suppressed.length, 3);
  assert.equal(suppressed[0].noticesThisWindow, 3);
});

test('a stuck file is remembered by a bounded fingerprint, and a rewrite is still delivered', async (t) => {
  const { hive, outbox } = await floor(t);
  // Make quarantine impossible: .sent is a file, so every rename into it fails.
  fs.rmSync(path.join(outbox, '.sent'), { recursive: true, force: true });
  fs.writeFileSync(path.join(outbox, '.sent'), 'blocker');
  const file = writeOutbox(outbox, 'locked.json', '{ broken');

  hive.routeOnce();
  assert.equal(drops(hive, 'malformed-json').length, 1);
  assert.equal(hive.stuckRejections.size, 1);
  const [key] = hive.stuckRejections.keys();
  assert.equal(key, 'worker-1/locked.json');
  assert.match(hive.stuckRejections.get(key), /^\d+:[0-9a-f]{64}$/);

  // Same bytes on the next tick: skipped, not re-reported.
  hive.routeOnce();
  assert.equal(drops(hive, 'malformed-json').length, 1);
  assert.equal(notices(hive).length, 1);

  // Rewritten file: a different fingerprint, so it is processed again — and
  // delivered. (Restore the .sent directory so the archive step can succeed.)
  fs.rmSync(path.join(outbox, '.sent'), { force: true });
  fs.mkdirSync(path.join(outbox, '.sent'));
  fs.writeFileSync(file, validMessage({ subject: 'fixed' }), 'utf8');
  assert.equal(hive.routeOnce(), 1);
  assert.equal(hive.inbox('god-1').length, 1);
  assert.equal(hive.inbox('god-1')[0].subject, 'fixed');
  assert.equal(hive.stuckRejections.size, 0, 'a delivered file is forgotten');
});

test('the stuck-rejection map is bounded (an unquarantinable storm cannot leak)', async (t) => {
  const { hive, outbox } = await floor(t);
  fs.rmSync(path.join(outbox, '.sent'), { recursive: true, force: true });
  fs.writeFileSync(path.join(outbox, '.sent'), 'blocker');
  for (let i = 0; i < 520; i++) writeOutbox(outbox, `stuck-${i}.json`, '{ broken');

  hive.routeOnce();
  assert.equal(hive.stuckRejections.size, 512, 'the LRU cap must bite');
  assert.equal(drops(hive, 'malformed-json').length, 520, 'logging is not rate-limited');
});

test('a non-regular entry named *.json is logged once, never silently skipped', async (t) => {
  const { hive, outbox } = await floor(t);
  fs.mkdirSync(path.join(outbox, 'dir.json'));
  const skips = () => hive.logTail(5000).filter((e) => e.kind === 'drop' && e.reason === 'not-a-regular-file');

  assert.equal(hive.routeOnce(), 0);
  assert.equal(skips().length, 1, 'a silent skip is a dead dispatch: it must be observable');
  assert.equal(skips()[0].file, 'dir.json');
  assert.equal(hive.inbox('god-1').length, 0);

  hive.routeOnce();
  assert.equal(skips().length, 1, 'the same skip is not re-logged every tick');
});

test('a JSON document that is not an object is rejected, not delivered as a blank inform', async (t) => {
  const { hive, outbox } = await floor(t);
  writeOutbox(outbox, 'array.json', '[]');

  assert.equal(hive.routeOnce(), 0);
  const [notice] = notices(hive);
  assert.ok(notice, 'the sender must be told');
  assert.match(notice.body, /not-an-object/);
  assert.equal(hive.inbox('god-1').length, 0, 'no phantom message reaches anyone');
  assert.equal(drops(hive, 'not-an-object').length, 1);
  assert.equal(fs.existsSync(path.join(outbox, '.sent', 'bad-array.json')), true);
});

test('an archive failure AFTER delivery is logged, never reported as NOT delivered', async (t) => {
  const { hive, outbox } = await floor(t);
  // Delivery succeeds; archiving cannot. .sent being a file makes the rename fail.
  fs.rmSync(path.join(outbox, '.sent'), { recursive: true, force: true });
  fs.writeFileSync(path.join(outbox, '.sent'), 'blocker');
  writeOutbox(outbox, 'delivered.json', validMessage({ subject: 'delivered anyway' }));

  assert.equal(hive.routeOnce(), 1);
  assert.equal(hive.inbox('god-1').length, 1, 'the mail IS delivered');
  assert.equal(hive.inbox('god-1')[0].subject, 'delivered anyway');
  assert.deepEqual(notices(hive), [], 'delivered mail must not get a NOT-delivered notice');
  const archiveFailures = hive.logTail(5000).filter((e) => e.kind === 'archive-failed');
  assert.equal(archiveFailures.length, 1);
  assert.equal(fs.existsSync(path.join(outbox, 'delivered.json')), true, 'it stays in the outbox');

  // And the next tick must not deliver it a second time.
  assert.equal(hive.routeOnce(), 0);
  assert.equal(hive.inbox('god-1').length, 1);
  assert.equal(hive.logTail(5000).filter((e) => e.kind === 'archive-failed').length, 1);
});

test('quarantine never overwrites an earlier bad-<file>', async (t) => {
  const { hive, outbox } = await floor(t);
  writeOutbox(outbox, 'broken.json', '{ first');
  hive.routeOnce();
  const first = fs.readFileSync(path.join(outbox, '.sent', 'bad-broken.json'), 'utf8');

  writeOutbox(outbox, 'broken.json', '{ second');
  hive.routeOnce();
  assert.equal(fs.readFileSync(path.join(outbox, '.sent', 'bad-broken.json'), 'utf8'), first, 'the first rejection is evidence and must survive');
  const later = fs.readdirSync(path.join(outbox, '.sent')).filter((n) => n.startsWith('bad-broken.json-'));
  assert.equal(later.length, 1, 'the second rejection gets a unique name');
  assert.equal(fs.readFileSync(path.join(outbox, '.sent', later[0]), 'utf8'), '{ second');
});

test('a rejection that could not be quarantined says so instead of claiming a bad- file', async (t) => {
  const { hive, outbox } = await floor(t);
  fs.rmSync(path.join(outbox, '.sent'), { recursive: true, force: true });
  fs.writeFileSync(path.join(outbox, '.sent'), 'blocker');
  writeOutbox(outbox, 'stuck.json', '{ broken');

  hive.routeOnce();
  const [notice] = notices(hive);
  assert.ok(notice);
  assert.match(notice.body, /could not be moved/);
  assert.doesNotMatch(notice.body, /has been quarantined/);
});
