'use strict';

/**
 * 0.5.3, founder 24 Sep 2026: "the stapler's default transcription model
 * should be the bundled one we provide, inhouse apple seems like it's not
 * working, check what needs fixing."
 *
 *   DEFAULT  auto is the bundled Whisper first for dictation and meetings
 *            (pinned in v053-transcribe-router).
 *   HEARD NOTHING  a local engine that answers dictation with no words is not
 *            believed at once: the other local engine gets the same clip. An
 *            empty answer is what "Apple is not working" looks like to the
 *            person, and it never reached the fallback before. Silence is
 *            never sent to Groq.
 *   ANY APP  dictation into any app follows the chosen engine. It used
 *            md-speech whatever Settings said.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { withTranscribeDefaults } = loadTs('src/shared/transcribeConfig.ts');
const { encodeWav, readWavHeader } = loadTs('src/shared/wav.ts');
const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

/** Both helpers as node fakes: md-speech answers every transcribe with
 *  `appleText`, md-whisper with `whisperText`. */
function fakeFloor(appleText, whisperText) {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'md-heard-'));
  const resources = path.join(userData, 'resources');
  const helpers = path.join(resources, 'transcribe', 'darwin-universal');
  fs.mkdirSync(helpers, { recursive: true });
  fs.mkdirSync(path.join(resources, 'transcribe', 'models'), { recursive: true });
  fs.writeFileSync(path.join(resources, 'transcribe', 'models', 'ggml-base.en-q5_1.bin'), 'not a model');
  const speech = path.join(userData, 'speech.cjs');
  fs.writeFileSync(speech, `
const rl = require('node:readline').createInterface({ input: process.stdin });
const out = (o) => process.stdout.write(JSON.stringify(o) + '\\n');
out({ ready: true, helper: 'fake-md-speech', version: '0.2.0', stream: true });
rl.on('line', (line) => {
  const r = JSON.parse(line);
  if (r.op === 'install') return out({ id: r.id, event: 'asset', state: 'installed', ms: 1, locale: 'en_US', reserved: true });
  if (r.op === 'warm') return out({ id: r.id, ok: true, ms: 1, locale: 'en_US' });
  if (r.op === 'shutdown') { out({ id: r.id, ok: true }); process.exit(0); }
  out({ id: r.id, text: ${JSON.stringify(appleText)}, segments: [], ms: 1, engine: 'transcriber', locale: 'en_US' });
});
`);
  const whisper = path.join(userData, 'whisper.cjs');
  fs.writeFileSync(whisper, whisperText === null ? 'process.exit(1);\n' : `
require('node:fs').appendFileSync(${JSON.stringify(path.join(userData, 'whisper-spawns.txt'))}, 'spawn\\n');
const rl = require('node:readline').createInterface({ input: process.stdin });
const out = (o) => process.stdout.write(JSON.stringify(o) + '\\n');
out({ ready: true, model: 'base', gpu: false, threads: 1, whisper: 'fake' });
rl.on('line', (line) => { const r = JSON.parse(line); out({ id: r.id, text: ${JSON.stringify(whisperText)}, segments: [], ms: 1, seconds: 1 }); });
`);
  fs.writeFileSync(path.join(helpers, 'md-speech'), `#!/bin/sh\nexec "${process.execPath}" "${speech}"\n`, { mode: 0o755 });
  fs.writeFileSync(path.join(helpers, 'md-whisper'), `#!/bin/sh\nexec "${process.execPath}" "${whisper}" "$@"\n`, { mode: 0o755 });
  const electron = require.resolve('electron');
  require.cache[electron] = { id: electron, filename: electron, loaded: true, exports: { app: { getPath: () => userData, isPackaged: false } } };
  return { userData, resources };
}

async function run(engine, mode, appleText, whisperText) {
  const { userData, resources } = fakeFloor(appleText, whisperText);
  const { TranscribeRouter } = loadTs('src/main/transcribe/router.ts');
  const log = [];
  const groq = [];
  const cfg = { transcribe: withTranscribeDefaults({ engine }), groqApiKey: 'gsk_test' };
  const r = new TranscribeRouter({ resourcesPath: resources, userDataPath: userData, readConfig: () => cfg, platform: 'darwin', darwinMajor: 25, groq: async (o) => { groq.push(o); return { ok: true, text: 'from groq' }; }, log: (l) => log.push(l) });
  try {
    const out = await r.transcribe({ audio: Buffer.from(encodeWav(new Int16Array(16000), 16000)), mimeType: 'audio/wav', mode });
    return { out, log, groq };
  } finally { r.stop(); }
}

const mac = { skip: process.platform !== 'darwin' && 'the Apple leg needs darwin' };

test('heard nothing: Apple\'s empty dictation goes to Whisper before it is believed', mac, async () => {
  const { out, log, groq } = await run('apple', 'dictation', '', 'from whisper');
  assert.deepEqual(out, { ok: true, text: 'from whisper' });
  assert.ok(log.some((l) => /apple dictation heard nothing; trying whisper/.test(l)), log.join('\n'));
  assert.equal(groq.length, 0);
});

test('heard nothing, the other way: an empty Whisper answer goes to Apple', mac, async () => {
  const { out } = await run('whisper', 'dictation', 'from apple', '');
  assert.deepEqual(out, { ok: true, text: 'from apple' });
});

test('both heard nothing: that is silence, an empty success, and Groq is never sent it', mac, async () => {
  const { out, groq } = await run('auto', 'dictation', '', '');
  assert.deepEqual(out, { ok: true, text: '' });
  assert.equal(groq.length, 0, 'silence never goes to the cloud');
});

test('heard nothing, then the other engine crashes: still silence, and still not sent to Groq', mac, async () => {
  const { out, groq, log } = await run('apple', 'dictation', '', null);
  assert.deepEqual(out, { ok: true, text: '' });
  assert.equal(groq.length, 0);
  assert.ok(log.some((l) => /whisper dictation failed/.test(l)), log.join('\n'));
});

test('a meeting track that said nothing stays nothing: no second engine', mac, async () => {
  const { out, log } = await run('whisper', 'meeting', 'from apple', '');
  assert.deepEqual(out, { ok: true, text: '' });
  assert.ok(!log.some((l) => /heard nothing/.test(l)));
});

test('words from the first engine are never second guessed', mac, async () => {
  const { out, log } = await run('auto', 'dictation', 'from apple', 'from whisper');
  assert.deepEqual(out, { ok: true, text: 'from whisper' }, 'auto is Whisper first');
  assert.ok(!log.some((l) => /heard nothing/.test(l)));
});

test('any app via the router: the held audio becomes one 16 bit wav at the helper\'s rate; a failure throws', async () => {
  const { anyAppViaRouter } = loadTs('src/main/transcribe/anyAppEngine.ts');
  const seen = [];
  const t = anyAppViaRouter(async (wav) => { seen.push(wav); return { ok: true, text: '  hello there ' }; });
  assert.equal(t.openStream, undefined, 'file mode: the loop streams only through md-speech');
  // An odd offset and an odd length: the copy must not throw.
  const pcm = Buffer.alloc(3201).subarray(1);
  assert.deepEqual(await t.transcribe({ pcm16: pcm, sampleRate: 16000, mode: 'dictation' }), { text: 'hello there' });
  const h = readWavHeader(new Uint8Array(seen[0]).slice().buffer);
  assert.equal(h.sampleRate, 16000);
  assert.equal(h.channels, 1);
  assert.equal(h.bits, 16);
  assert.equal(h.dataBytes, 3200);
  const bad = anyAppViaRouter(async () => ({ ok: false, error: 'whisper: boom' }));
  await assert.rejects(bad.transcribe({ pcm16: Buffer.alloc(4), sampleRate: 16000, mode: 'dictation' }), /whisper: boom/);
});

test('any app wiring: the chosen engine decides; Apple keeps md-speech and its stream; a new engine re-arms the loop', () => {
  const main = read('src/main/index.ts');
  const fn = main.slice(main.indexOf('function anyAppTranscriber()'), main.indexOf('let anyAppWarmed'));
  assert.match(fn, /const engine = router\.status\(\)\.chosen\.dictation;\n\s*if \(engine !== 'apple'\) \{\n\s*if \(!engine\) return null;\n\s*return anyAppViaRouter\(\(wav\) => router\.transcribe\(\{ audio: wav, mimeType: 'audio\/wav', mode: 'dictation' \}\)\);/);
  assert.match(fn, /openStream: \(req, onPartial\) => speech\.openStream\(req, onPartial\)/, 'Apple still streams');
  assert.match(main, /if \(next\.engine !== cur\.engine && anyAppLoop\) \{ await anyAppLoop\.stop\(\); anyAppLoop = null; \}/);
  assert.match(main, /if \(getTranscribeRouter\(\)\.status\(\)\.chosen\.dictation === 'apple'\) warmAnyAppSpeech\(\);/, 'md-speech is not loaded for nothing');
});

test('launch warms the default engine: md-whisper starts at launch, once, and the first dictation uses that one', mac, async () => {
  const { userData, resources } = fakeFloor('from apple', 'from whisper');
  const { TranscribeRouter } = loadTs('src/main/transcribe/router.ts');
  const log = [];
  const cfg = { transcribe: withTranscribeDefaults({ engine: 'auto' }) };
  const r = new TranscribeRouter({ resourcesPath: resources, userDataPath: userData, readConfig: () => cfg, platform: 'darwin', darwinMajor: 25, log: (l) => log.push(l) });
  try {
    r.warmUp();
    const out = await r.transcribe({ audio: Buffer.from(encodeWav(new Int16Array(16000), 16000)), mimeType: 'audio/wav', mode: 'dictation' });
    assert.deepEqual(out, { ok: true, text: 'from whisper' });
    const until = Date.now() + 5000;
    while (Date.now() < until && !log.some((l) => /md-whisper warm in/.test(l))) await new Promise((res) => setTimeout(res, 25));
    assert.ok(log.some((l) => /md-whisper warm in \d+ ms/.test(l)), log.join('\n'));
    assert.equal(fs.readFileSync(path.join(userData, 'whisper-spawns.txt'), 'utf8').trim().split('\n').length, 1, 'one md-whisper, not two');
    assert.ok(!log.some((l) => /md-speech warm/.test(l)), 'Apple is not loaded for nothing');
  } finally { r.stop(); }
});
