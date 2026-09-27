/**
 * 0.5.3, F16, founder 23 Sep 2026: one router picks the engine for dictation
 * and meetings (Apple on device on macOS 26, whisper.cpp elsewhere and for
 * meetings, Groq only as the opted in fallback), the dictation block of the
 * config is always complete, and the wav the renderer hands over is what the
 * helpers read. Pure parts tested here; the helpers have their own live tests.
 */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { chooseEngine, appleUsable } = loadTs('src/main/transcribe/engineChoice.ts');
const { withTranscribeDefaults, cleanCustomWords, DEFAULT_TRANSCRIBE, MAX_CUSTOM_WORDS } = loadTs('src/shared/transcribeConfig.ts');
const { encodeWav, readWavHeader, floatToInt16, resampleLinear, mixToMono } = loadTs('src/shared/wav.ts');
const { buildWhisperPrompt } = loadTs('src/main/transcribe/prompt.ts');
const { DEFAULT_TRANSCRIBE_VOCABULARY } = loadTs('src/shared/transcribeVocabulary.ts');

const mac26 = { platform: 'darwin', darwinMajor: 25, appleAvailable: true, whisperAvailable: true, groqKey: true };

// Founder, 24 Sep 2026: "the stapler's default transcription model should be
// the bundled one we provide". Auto is Whisper first for both modes; Apple is
// the first fallback on macOS 26 and stays selectable; Groq is last.
test('auto: bundled Whisper first for dictation and meetings, Apple then Groq as fallbacks', () => {
  assert.equal(chooseEngine('auto', 'dictation', mac26), 'whisper');
  assert.equal(chooseEngine('auto', 'dictation', { ...mac26, whisperAvailable: false }), 'apple', 'no Whisper on disk: Apple');
  assert.equal(chooseEngine('auto', 'meeting', { ...mac26, whisperAvailable: false }), 'apple');
  assert.equal(chooseEngine('auto', 'dictation', { ...mac26, whisperAvailable: false, appleAvailable: false }), 'groq');
  assert.equal(chooseEngine('auto', 'meeting', mac26), 'whisper');
  const mac15 = { ...mac26, darwinMajor: 24 };
  assert.equal(appleUsable(mac15), false, 'macOS 15 has no SpeechAnalyzer');
  assert.equal(chooseEngine('auto', 'dictation', mac15), 'whisper');
  const win = { platform: 'win32', darwinMajor: 0, appleAvailable: false, whisperAvailable: true, groqKey: false };
  assert.equal(chooseEngine('auto', 'dictation', win), 'whisper');
  assert.equal(chooseEngine('auto', 'meeting', { ...win, whisperAvailable: false, groqKey: true }), 'groq');
  assert.equal(chooseEngine('auto', 'meeting', { ...win, whisperAvailable: false }), null, 'nothing can transcribe');
});

test('a chosen engine is honoured when present and falls through the same order when missing', () => {
  assert.equal(chooseEngine('whisper', 'dictation', mac26), 'whisper');
  assert.equal(chooseEngine('groq', 'dictation', mac26), 'groq');
  assert.equal(chooseEngine('apple', 'meeting', mac26), 'apple');
  assert.equal(chooseEngine('groq', 'dictation', { ...mac26, groqKey: false }), 'whisper', 'no key: the auto order');
  assert.equal(chooseEngine('apple', 'dictation', mac26), 'apple', 'Apple stays selectable');
  assert.equal(chooseEngine('apple', 'dictation', { ...mac26, darwinMajor: 24 }), 'whisper');
});

test('the dictation block is always complete: defaults for a missing file, one field at a time for a bad value', () => {
  assert.deepEqual(withTranscribeDefaults(undefined), DEFAULT_TRANSCRIBE);
  const c = withTranscribeDefaults({ engine: 'cloud-of-tomorrow', model: 'small', customWords: ['Acme', ' acme ', '', 'Zed'], defaultVocabulary: false, pushToTalkKey: ' F5 ', anyApp: 'yes' });
  assert.equal(c.engine, 'auto', 'an unknown engine falls back alone');
  assert.equal(c.model, 'small');
  assert.deepEqual(c.customWords, ['Acme', 'Zed']);
  assert.equal(c.defaultVocabulary, false);
  assert.equal(c.pushToTalkKey, 'F5');
  assert.equal(c.anyApp, DEFAULT_TRANSCRIBE.anyApp, 'a string is not a switch: the default stands');
  assert.equal(cleanCustomWords('one\ntwo, three\n\n').length, 3, 'the box splits on lines and commas');
  assert.equal(cleanCustomWords(Array.from({ length: 900 }, (_, i) => `w${i}`)).length, MAX_CUSTOM_WORDS);
});

test('the wav the helpers read: 16 kHz, mono, 16 bit, header and data agree', () => {
  const pcm = floatToInt16(new Float32Array([0, 0.5, -0.5, 1, -1]));
  assert.deepEqual(Array.from(pcm), [0, 16384, -16384, 32767, -32768]);
  const wav = encodeWav(pcm, 16000);
  assert.equal(wav.byteLength, 44 + 10);
  assert.deepEqual(readWavHeader(wav), { channels: 1, sampleRate: 16000, bits: 16, dataBytes: 10 });
  assert.equal(readWavHeader(new ArrayBuffer(10)), null);
  const down = resampleLinear(new Float32Array(48000), 48000, 16000);
  assert.equal(down.length, 16000);
  assert.deepEqual(Array.from(mixToMono([new Float32Array([1, 1]), new Float32Array([0, -1])])), [0.5, 0]);
});

test('the shipped vocabulary reaches whisper head first and every user word survives the 224 token cap', () => {
  const p = buildWhisperPrompt({ defaultWords: DEFAULT_TRANSCRIBE_VOCABULARY, customWords: ['Acme Corp', 'Zed'] });
  assert.ok(p.startsWith('Munder Difflin, Stapler'), 'the product and the labs come first');
  assert.ok(p.endsWith('Acme Corp, Zed'), 'the user words are last, the part whisper keeps');
  assert.ok(p.length <= 680, `prompt is ${p.length} chars`);
  const kept = p.split(', ').length;
  assert.ok(kept >= 60 && kept < DEFAULT_TRANSCRIBE_VOCABULARY.length, `whisper gets about 75 names, got ${kept}`);
});

test('the router: no engine says so plainly; a webm clip with no key is refused; Groq gets the call when it is the engine', async () => {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'md-router-'));
  const electron = require.resolve('electron');
  require.cache[electron] = { id: electron, filename: electron, loaded: true, exports: { app: { getPath: () => userData, isPackaged: false } } };
  const { TranscribeRouter } = loadTs('src/main/transcribe/router.ts');
  const calls = [];
  const groq = async (opts) => { calls.push(opts); return { ok: true, text: 'from groq' }; };
  let cfg = { transcribe: withTranscribeDefaults({ engine: 'auto' }), groqApiKey: undefined };
  const r = new TranscribeRouter({ resourcesPath: path.join(userData, 'no-resources'), userDataPath: userData, readConfig: () => cfg, platform: 'linux', darwinMajor: 0, groq });
  const s = r.status();
  assert.deepEqual(s.engines, { apple: false, whisper: false, groq: false });
  assert.equal(s.chosen.dictation, null);
  assert.equal(r.canTranscribe('meeting'), false);
  const none = await r.transcribe({ audio: new Uint8Array([1, 2, 3]), mimeType: 'audio/wav', mode: 'dictation' });
  assert.equal(none.ok, false);
  assert.match(none.error, /no transcription engine/);
  cfg = { ...cfg, groqApiKey: 'gsk_test' };
  assert.equal(r.status().chosen.meeting, 'groq');
  const viaGroq = await r.transcribe({ audio: new Uint8Array([1, 2, 3]), mimeType: 'audio/webm', mode: 'meeting', filename: 'seg.webm' });
  assert.deepEqual(viaGroq, { ok: true, text: 'from groq' });
  assert.equal(calls[0].apiKey, 'gsk_test');
  assert.equal(calls[0].filename, 'seg.webm', 'the clip goes to Groq exactly as it came');
  assert.equal(s.words.total, DEFAULT_TRANSCRIBE_VOCABULARY.length);
  r.stop();
});

test('transcribePcm16: the any app loop\'s raw PCM becomes a 16 kHz wav through the same engine choice, and a failure throws', async () => {
  // F16, Windows and Linux (23 Sep): off the Mac the loop hands the router
  // raw int16 samples; the router wraps them in a wav the engines read and
  // runs the ordinary choice. Groq stands in for the engine here.
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'md-router-pcm-'));
  const electron = require.resolve('electron');
  require.cache[electron] = { id: electron, filename: electron, loaded: true, exports: { app: { getPath: () => userData, isPackaged: false } } };
  const { TranscribeRouter } = loadTs('src/main/transcribe/router.ts');
  const calls = [];
  let answer = { ok: true, text: 'from groq' };
  const groq = async (opts) => { calls.push(opts); return answer; };
  const cfg = { transcribe: withTranscribeDefaults({ engine: 'auto' }), groqApiKey: 'gsk_test' };
  const r = new TranscribeRouter({ resourcesPath: path.join(userData, 'no-resources'), userDataPath: userData, readConfig: () => cfg, platform: 'linux', darwinMajor: 0, groq });
  // A pooled Buffer with an odd byteOffset: the router must not read it as a misaligned Int16Array.
  const pool = Buffer.alloc(9);
  const samples = new Int16Array([1000, -1000, 32767, -32768]);
  pool.set(Buffer.from(samples.buffer), 1);
  const pcm16 = pool.subarray(1, 9);
  const out = await r.transcribePcm16({ pcm16, sampleRate: 16000, mode: 'dictation' });
  assert.deepEqual(out, { text: 'from groq' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].mimeType, 'audio/wav');
  assert.equal(calls[0].filename, 'anyapp.wav');
  const header = readWavHeader(calls[0].audio.buffer.slice(calls[0].audio.byteOffset, calls[0].audio.byteOffset + calls[0].audio.byteLength));
  assert.deepEqual(header, { channels: 1, sampleRate: 16000, bits: 16, dataBytes: 8 });
  assert.deepEqual(Array.from(new Int16Array(calls[0].audio.buffer.slice(calls[0].audio.byteOffset + 44, calls[0].audio.byteOffset + 52))), [1000, -1000, 32767, -32768], 'the samples arrive unchanged');
  answer = { ok: false, error: 'engine down' };
  await assert.rejects(r.transcribePcm16({ pcm16, sampleRate: 16000 }), /engine down/);
  r.stop();
});

test('a local failure walks the whole order: whisper, then Apple, then Groq', { skip: process.platform !== 'darwin' && 'the Apple leg needs darwin' }, async () => {
  // Both helpers are on disk and both die at once; the founder's order says
  // the call still reaches Groq when a key exists. Red on 3908cedc: the chain
  // stopped after one hop and returned the two failures as an error.
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'md-router-fb-'));
  const resources = path.join(userData, 'resources');
  const helpers = path.join(resources, 'transcribe', 'darwin-universal');
  fs.mkdirSync(helpers, { recursive: true });
  fs.mkdirSync(path.join(resources, 'transcribe', 'models'), { recursive: true });
  for (const h of ['md-speech', 'md-whisper']) fs.writeFileSync(path.join(helpers, h), '#!/bin/sh\nexit 1\n', { mode: 0o755 });
  fs.writeFileSync(path.join(resources, 'transcribe', 'models', 'ggml-base.en-q5_1.bin'), 'not a model');
  const electron = require.resolve('electron');
  require.cache[electron] = { id: electron, filename: electron, loaded: true, exports: { app: { getPath: () => userData, isPackaged: false } } };
  const { TranscribeRouter } = loadTs('src/main/transcribe/router.ts');
  const calls = [];
  const groq = async (opts) => { calls.push(opts); return { ok: true, text: 'from groq' }; };
  const log = [];
  const cfg = { transcribe: withTranscribeDefaults({ engine: 'auto' }), groqApiKey: 'gsk_test' };
  const r = new TranscribeRouter({ resourcesPath: resources, userDataPath: userData, readConfig: () => cfg, platform: 'darwin', darwinMajor: 25, groq, log: (l) => log.push(l) });
  assert.deepEqual(r.status().engines, { apple: true, whisper: true, groq: true });
  assert.equal(r.status().chosen.dictation, 'whisper');
  const wav = Buffer.from(encodeWav(new Int16Array(16000)));
  // The router writes its temp wav to os.tmpdir(), which reads TMPDIR on every
  // call: point it at a folder of this test's own, so the "gone afterwards"
  // check cannot see another test process's wav in flight (the flake Kevin saw
  // when this file ran beside the helper protocol test).
  const tmp = path.join(userData, 'tmp');
  fs.mkdirSync(tmp);
  const savedTmpdir = process.env.TMPDIR;
  process.env.TMPDIR = tmp;
  try {
    const out = await r.transcribe({ audio: wav, mimeType: 'audio/wav', mode: 'dictation' });
    assert.deepEqual(out, { ok: true, text: 'from groq' });
    assert.equal(calls.length, 1, 'Groq was reached once');
    assert.ok(log.some((l) => /apple dictation failed/.test(l)) && log.some((l) => /whisper dictation failed/.test(l)), log.join('\n'));
    assert.deepEqual(fs.readdirSync(tmp), [], 'the temp wav is gone');
    // Without a key the same two failures come back as one plain error.
    cfg.groqApiKey = undefined;
    const none = await r.transcribe({ audio: wav, mimeType: 'audio/wav', mode: 'dictation' });
    assert.equal(none.ok, false);
    assert.match(none.error, /^whisper: .*; apple: /);
    assert.equal(calls.length, 1, 'Groq is never called without a key');
    assert.deepEqual(fs.readdirSync(tmp), [], 'the temp wav is gone after a failure too');
  } finally {
    if (savedTmpdir === undefined) delete process.env.TMPDIR; else process.env.TMPDIR = savedTmpdir;
    r.stop();
  }
});

test('a selected small model that is not on disk falls back to the bundled base instead of taking whisper out', async () => {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'md-router-base-'));
  const resources = path.join(userData, 'resources');
  const { TranscribeRouter } = loadTs('src/main/transcribe/router.ts');
  const { helperPaths } = loadTs('src/main/transcribe/whisperHelper.ts');
  const paths = helperPaths(resources, 'linux');
  fs.mkdirSync(path.dirname(paths.binary), { recursive: true });
  fs.mkdirSync(paths.modelsDir, { recursive: true });
  fs.writeFileSync(paths.binary, '#!/bin/sh\nexit 1\n', { mode: 0o755 });
  fs.writeFileSync(path.join(paths.modelsDir, 'ggml-base.en-q5_1.bin'), 'x');
  const cfg = { transcribe: withTranscribeDefaults({ engine: 'auto', model: 'small' }), groqApiKey: undefined };
  const r = new TranscribeRouter({ resourcesPath: resources, userDataPath: userData, readConfig: () => cfg, platform: 'linux', darwinMajor: 0, groq: async () => ({ ok: false, error: 'unused' }) });
  const s = r.status();
  assert.equal(s.model.selected, 'small');
  assert.equal(s.model.inUse, 'base', 'the file is not there, base carries on');
  assert.equal(s.engines.whisper, true);
  assert.equal(s.chosen.meeting, 'whisper');
  r.stop();
});

test('the puck tells the router which job a clip is: a voice message is dictation, a segment is a meeting', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'src/main/puck.ts'), 'utf8');
  assert.match(src, /filename: part\.file, language: cfg\.language \|\| undefined, mode: 'meeting', timestamps: !!meta\.twoTrack/);
  assert.match(src, /language: cfgOf\(\)\.language \|\| undefined, mode: 'dictation'/);
  assert.doesNotMatch(src, /no transcription key/, 'the refusal names the engine, not a key');
  const idx = fs.readFileSync(path.join(__dirname, '..', 'src/main/index.ts'), 'utf8');
  assert.match(idx, /mode: opts\.mode \?\? 'meeting'/);
});


test('launch: with Apple as the dictation engine the router spawns md-speech and runs install then warm once; a helper that fails is logged, not thrown', { skip: process.platform !== 'darwin' && 'the Apple leg needs darwin' }, async () => {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'md-router-warm-'));
  const resources = path.join(userData, 'resources');
  const helpers = path.join(resources, 'transcribe', 'darwin-universal');
  fs.mkdirSync(helpers, { recursive: true });
  fs.mkdirSync(path.join(resources, 'transcribe', 'models'), { recursive: true });
  fs.writeFileSync(path.join(resources, 'transcribe', 'models', 'ggml-base.en-q5_1.bin'), 'not a model');
  fs.writeFileSync(path.join(helpers, 'md-whisper'), '#!/bin/sh\nexit 1\n', { mode: 0o755 });
  // A fake md-speech in node: answers the protocol and writes every op it saw.
  const seen = path.join(userData, 'ops.txt');
  const fake = path.join(userData, 'fake-md-speech.cjs');
  fs.writeFileSync(fake, `
const fs = require('node:fs');
const rl = require('node:readline').createInterface({ input: process.stdin });
const out = (o) => process.stdout.write(JSON.stringify(o) + '\\n');
out({ ready: true, helper: 'fake-md-speech', version: '0.2.0', stream: true });
rl.on('line', (line) => {
  const r = JSON.parse(line);
  fs.appendFileSync(${JSON.stringify(seen)}, (r.op || 'transcribe') + '\\n');
  if (r.op === 'install') { out({ id: r.id, event: 'asset', state: 'installed', ms: 12, locale: 'en_US', reserved: true }); return; }
  if (r.op === 'warm') { out({ id: r.id, ok: true, ms: 850, locale: 'en_US' }); return; }
  if (r.op === 'shutdown') { out({ id: r.id, ok: true }); process.exit(0); }
  out({ id: r.id, error: 'unknown-op', op: r.op });
});
`);
  fs.writeFileSync(path.join(helpers, 'md-speech'), `#!/bin/sh\nexec "${process.execPath}" "${fake}"\n`, { mode: 0o755 });
  const electron = require.resolve('electron');
  require.cache[electron] = { id: electron, filename: electron, loaded: true, exports: { app: { getPath: () => userData, isPackaged: false } } };
  const { TranscribeRouter } = loadTs('src/main/transcribe/router.ts');
  const log = [];
  // Apple is chosen by name since 24 Sep: auto is Whisper first now.
  const cfg = { transcribe: withTranscribeDefaults({ engine: 'apple' }) };
  const r = new TranscribeRouter({ resourcesPath: resources, userDataPath: userData, readConfig: () => cfg, platform: 'darwin', darwinMajor: 25, log: (l) => log.push(l) });
  const settle = (ms) => new Promise((res) => setTimeout(res, ms));
  // A node fake takes a moment to start under load: wait for the log line.
  const until = async (pred) => { const t = Date.now() + 8000; while (Date.now() < t && !pred()) await settle(25); };
  try {
    r.warmUp();
    await until(() => log.some((l) => /md-speech warm/.test(l)));
    assert.deepEqual(fs.readFileSync(seen, 'utf8').trim().split('\n'), ['install', 'warm'], 'install, then warm, right after the spawn');
    assert.ok(log.some((l) => /md-speech warm in 850 ms/.test(l)), log.join('\n'));
    r.warmUp();
    r['speechHelper']();
    await settle(200);
    assert.deepEqual(fs.readFileSync(seen, 'utf8').trim().split('\n'), ['install', 'warm'], 'once per helper, not per call');
  } finally { r.stop(); }
  // stop() sends the fake a shutdown, which it writes down too; let it go.
  await until(() => /shutdown/.test(fs.readFileSync(seen, 'utf8')));

  // macOS 15: Apple is not the dictation engine, so nothing spawns.
  fs.unlinkSync(seen);
  const r15 = new TranscribeRouter({ resourcesPath: resources, userDataPath: userData, readConfig: () => cfg, platform: 'darwin', darwinMajor: 24, log: (l) => log.push(l) });
  try {
    r15.warmUp();
    await settle(200);
    assert.equal(fs.existsSync(seen), false, 'no md-speech spawned when whisper is the dictation engine');
  } finally { r15.stop(); }

  // A helper that dies: logged, and nothing thrown to the caller.
  fs.writeFileSync(path.join(helpers, 'md-speech'), '#!/bin/sh\nexit 1\n', { mode: 0o755 });
  log.length = 0;
  const rDead = new TranscribeRouter({ resourcesPath: resources, userDataPath: userData, readConfig: () => cfg, platform: 'darwin', darwinMajor: 25, log: (l) => log.push(l) });
  try {
    rDead.warmUp();
    await until(() => log.some((l) => /md-speech warm failed/.test(l)));
    assert.ok(log.some((l) => /md-speech warm failed: helper-exited/.test(l)), log.join('\n'));
  } finally { rDead.stop(); }
});
