'use strict';

/* F16: the JSON line protocol between main and the real md-whisper helper.
 * Runs the built binary from resources/transcribe/<target>/ with the bundled
 * model against test/fixtures/jfk.wav (whisper.cpp's public domain sample).
 * Skipped when the helper or the model is not built on this machine
 * (`node tools/build-transcribe-helpers.mjs`). Red on the base:
 * src/main/transcribe/whisperHelper.ts does not exist. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { WhisperHelper, helperPaths, helperAvailable, helperTarget } = loadTs('src/main/transcribe/whisperHelper.ts');
const { WHISPER_MODELS } = loadTs('src/main/transcribe/models.ts');

const RESOURCES = path.join(__dirname, '..', 'resources');
const { binary, modelsDir } = helperPaths(RESOURCES);
const MODEL = path.join(modelsDir, WHISPER_MODELS.base.file);
const JFK = path.join(__dirname, 'fixtures', 'jfk.wav');
const built = helperAvailable(RESOURCES) && fs.existsSync(MODEL);
const skip = built ? false : `helper not built (${binary}) or model missing (${MODEL})`;

test('helper paths follow the platform target', () => {
  assert.equal(helperTarget('darwin'), 'darwin-universal');
  assert.equal(helperTarget('win32'), 'win32-x64');
  assert.equal(helperTarget('linux'), 'linux-x64');
  assert.equal(helperPaths('/r', 'win32').binary, path.join('/r', 'transcribe', 'win32-x64', 'md-whisper.exe'));
  assert.equal(helperPaths('/r', 'darwin').modelsDir, path.join('/r', 'transcribe', 'models'));
});

test('a missing binary is reported as unavailable, not as a crash', () => {
  assert.equal(helperAvailable(path.join(__dirname, 'nope')), false);
});

/** The int16 samples of a 16 kHz mono PCM wav, for the pcm16 path. */
function wavSamples(file) {
  const buf = fs.readFileSync(file);
  let off = 12;
  while (off < buf.length) {
    const id = buf.toString('ascii', off, off + 4);
    const size = buf.readUInt32LE(off + 4);
    if (id === 'data') return buf.subarray(off + 8, off + 8 + size);
    off += 8 + size + (size & 1);
  }
  throw new Error('no data chunk');
}

test('round trip against the real helper: ready, two requests, an error, a swap refusal, pcm16, tokenize', { skip, timeout: 120_000 }, async (t) => {
  const logs = [];
  const helper = new WhisperHelper({ binary, model: MODEL, onLog: (l) => logs.push(l) });
  t.after(() => helper.stop());
  const ready = await helper.start();
  assert.equal(ready.model, MODEL);
  assert.equal(ready.threads > 0, true);
  assert.match(ready.whisper, /^[0-9a-f]{40}$/, 'the ready line carries the pinned whisper.cpp commit');

  const a = await helper.transcribe({ audioPath: JFK, mode: 'dictation' });
  assert.match(a.text.toLowerCase(), /ask not what your country can do for you/);
  assert.ok(a.segments.length >= 1 && a.segments[0].t0 === 0, JSON.stringify(a.segments));
  assert.ok(a.ms > 0 && a.ms < 30_000, `decode took ${a.ms} ms`);
  assert.ok(Math.abs(a.seconds - 11) < 0.5, `audio seen as ${a.seconds} s`);

  // The prompt goes through and does not break the decode.
  const b = await helper.transcribe({ audioPath: JFK, mode: 'meeting', prompt: 'Munder Difflin, Stapler, Anthropic, Claude Code' });
  assert.match(b.text.toLowerCase(), /ask what you can do for your country/);

  // A bad path is an error reply for that id, with the shared code vocabulary,
  // and the helper keeps serving.
  await assert.rejects(helper.transcribe({ audioPath: path.join(__dirname, 'fixtures', 'missing.wav') }), (e) => e.code === 'audio-unreadable' && /cannot read audio/.test(e.message));
  // A model that does not exist is refused and the loaded one stays.
  await assert.rejects(helper.transcribe({ audioPath: JFK, model: path.join(__dirname, 'fixtures', 'no-such-model.bin') }), (e) => e.code === 'model-load-failed');
  assert.equal(helper.running, true);

  // Raw PCM: the same audio as int16 at 16 kHz, and a short clip that whisper
  // would otherwise refuse (padded inside the helper).
  const pcm = wavSamples(JFK);
  const c = await helper.transcribe({ pcm16: pcm, sampleRate: 16000 });
  assert.match(c.text.toLowerCase(), /fellow americans/);
  const d = await helper.transcribe({ pcm16: pcm.subarray(0, 16000), sampleRate: 16000 });
  assert.equal(typeof d.text, 'string');

  // Requests are answered in order even when queued at once.
  const [e, f] = await Promise.all([helper.transcribe({ audioPath: JFK }), helper.transcribe({ audioPath: JFK, prompt: 'x' })]);
  assert.equal(e.text, a.text);
  assert.ok(f.text.length > 0);
  assert.ok(logs.length > 0, 'whisper logging reaches onLog through stderr, never stdout');
});

test('every request starts from an empty context: a prompt sent once does not shape the next request', { skip, timeout: 120_000 }, async (t) => {
  // Kevin, 23 Sep 2026: each request is one segment or one clip; the previous
  // meeting's tokens must not seed the next, a hallucination must not carry.
  // The clip has a name whisper base.en spells "Tapany" on its own and follows
  // the prompt on when told "Tuppenny". Red on 9fee543e: the resident helper's
  // rolling context (prompt included) survived between requests, so the
  // second, prompt-less request still wrote the prompted spelling.
  const CLIP = path.join(__dirname, 'fixtures', 'speech', 'librispeech-7176-92135-0035.wav');
  const helper = new WhisperHelper({ binary, model: MODEL });
  t.after(() => helper.stop());
  await helper.start();
  const plain = await helper.transcribe({ audioPath: CLIP, mode: 'meeting' });
  // How base.en spells the name alone differs by CPU ("Tapany" on Apple
  // silicon, "Tuppany" on the x86 runners); what matters is that it is not the
  // prompted spelling.
  assert.doesNotMatch(plain.text, /Tuppen/, `fresh helper, no prompt: ${plain.text}`);
  const primed = await helper.transcribe({ audioPath: CLIP, mode: 'meeting', prompt: 'Tuppenny' });
  assert.match(primed.text, /Tuppen/, `with the prompt: ${primed.text}`);
  const next = await helper.transcribe({ audioPath: CLIP, mode: 'meeting' });
  assert.doesNotMatch(next.text, /Tuppen/, `the prompt leaked into the next request: ${next.text}`);
  assert.equal(next.text, plain.text, 'the second prompt-less request reads exactly like the first');
  // The same holds for the swap from a meeting to a dictation and back.
  const dictation = await helper.transcribe({ audioPath: CLIP, mode: 'dictation' });
  assert.equal(dictation.text, plain.text);
});

test('stop ends the helper and rejects what was in flight', { skip, timeout: 60_000 }, async () => {
  const helper = new WhisperHelper({ binary, model: MODEL });
  await helper.start();
  const inflight = helper.transcribe({ audioPath: JFK });
  helper.stop();
  await assert.rejects(inflight, /stopped|exited/);
  assert.equal(helper.running, false);
  await assert.rejects(helper.transcribe({ audioPath: JFK }), /not running|stopped|exited/);
});
