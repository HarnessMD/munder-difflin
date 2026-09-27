'use strict';
/**
 * 0.5.3, F16: the Apple speech helper (tools/md-speech/main.swift) and its
 * main process client (src/main/transcribe/mdSpeech.ts), driven for real.
 *
 * The helper is a Swift program built by tools/build-md-speech.sh into
 * resources/transcribe/darwin-universal/md-speech. It needs macOS 26 (the
 * SpeechAnalyzer API) and the on device English model, which the test reserves
 * through the helper's own install request. On any other platform, or when
 * the binary is missing, the live tests skip and say why; the protocol and
 * packaging pins below still run everywhere.
 *
 * Fixture: LibriSpeech test-clean utterance 4446-2275-0024 ("she pressed his
 * hand gently in gratitude"), CC BY 4.0 (test/fixtures/speech/LICENCE.md).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const FIX = path.join(ROOT, 'test/fixtures/speech/librispeech-4446-2275-0024.wav');
const FIX48 = path.join(ROOT, 'test/fixtures/speech/librispeech-4446-2275-0024-48k.wav');
const EXPECT = 'she pressed his hand gently in gratitude';
const norm = (s) => s.toLowerCase().replace(/[^a-z' ]+/g, ' ').trim().replace(/\s+/g, ' ');

function loadTs(rel) {
  const out = ts.transpileModule(read(rel), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } });
  const m = { exports: {} };
  new Function('module', 'exports', 'require', out.outputText)(m, m.exports, require);
  return m.exports;
}
const { MdSpeech, MdSpeechError, mdSpeechPath, mdSpeechAvailable } = loadTs('src/main/transcribe/mdSpeech.ts');

const macMajor = process.platform === 'darwin' ? Number(os.release().split('.')[0]) : 0; // Darwin 25 = macOS 26
const BIN = mdSpeechPath(path.join(ROOT, 'resources'));
const live = process.platform === 'darwin' && macMajor >= 25 && fs.existsSync(BIN);
const why = process.platform !== 'darwin' ? 'not macOS' : macMajor < 25 ? `macOS too old (Darwin ${macMajor})` : `no helper at ${BIN}`;

test('the packaging: one universal helper ships, the plist declares the mic and speech strings, the entitlement is there', () => {
  const yml = read('electron-builder.yml');
  // Since PR #44 the helpers ship per platform beside md-whisper, and both are
  // named under mac.binaries so the signer cannot skip them.
  assert.match(yml, /from: resources\/transcribe\/darwin-universal\/md-speech\n\s+to: transcribe\/darwin-universal\/md-speech/, 'the mac block ships md-speech beside md-whisper');
  assert.match(yml, /binaries:\n(?:\s+- .*\n)*\s+- Contents\/Resources\/transcribe\/darwin-universal\/md-speech/, 'md-speech is signed with the app');
  assert.match(yml, /NSSpeechRecognitionUsageDescription/, 'the speech usage string is declared');
  assert.match(yml, /NSMicrophoneUsageDescription/, 'the microphone usage string is declared');
  assert.match(read('build/entitlements.mac.plist'), /com\.apple\.security\.device\.audio-input/, 'mic capture under the hardened runtime');
  const p = path.join(ROOT, 'resources/transcribe/darwin-universal/md-speech');
  assert.ok(fs.existsSync(p), `${p} is committed`);
  assert.ok(fs.statSync(p).mode & 0o111, `${p} is executable`);
  // A fat (universal) Mach-O starts with the FAT_MAGIC 0xcafebabe and names two slices.
  const head = fs.readFileSync(p).subarray(0, 8);
  assert.equal(head.readUInt32BE(0), 0xcafebabe, `${p} is a universal Mach-O`);
  assert.equal(head.readUInt32BE(4), 2, `${p} carries arm64 and x86_64`);
  assert.equal(mdSpeechPath('/R'), path.join('/R', 'transcribe', 'darwin-universal', 'md-speech'));
  assert.equal(mdSpeechAvailable('/nowhere'), false);
});

test('the protocol: one JSON line per request, the id comes back, custom words ride as contextual strings', () => {
  const src = read('tools/md-speech/main.swift');
  assert.match(src, /readLine\(strippingNewline: true\)/, 'stdin is read line by line');
  assert.match(src, /contextualStrings = \[\.general: words\]/, 'words become AnalysisContext contextual strings');
  assert.match(src, /"partial": sofar/, 'partials are {id, partial}');
  assert.match(src, /\["id": id, "text": text, "segments": segments, "ms": Int\(nowMs\(\) - t0\)/, 'the final line is {id, text, segments, ms}');
  assert.match(src, /"engine"\] as\? String\) \?\? "transcriber"/, 'SpeechTranscriber, the measured module, is the default');
  assert.match(src, /@available\(macOS 26, \*\)/, 'guarded for macOS 26');
  assert.match(src, /emit\(\["ready": true, "helper": "md-speech"/, 'the first line is the ready line, like md-whisper');
  // The streamed session for push to talk (23 Sep): chunks while the key is
  // held, the final a moment after end; unknown-op elsewhere is the fallback.
  assert.match(src, /case "stream":\n\s+await openStream\(req, id: id\)/, 'a stream op opens a session');
  assert.match(src, /case "chunk":\n\s+streamChunk\(req\)/, 'chunks feed it');
  assert.match(src, /case "end":\n\s+endStream\(req\)/, 'end finishes it');
  assert.match(src, /case "cancel":\n\s+cancelStream\(req\)/, 'cancel drops it');
  assert.match(src, /"ms": Int\(nowMs\(\) - tEnd\), "totalMs"/, 'ms on a stream is end to final');
  assert.match(src, /if reservedHere\.contains\(locale\.identifier\)/, 'a second install in one helper answers at once');
  assert.match(src, /AssetInventory\.reserve\(locale: locale\)/, 'an installed asset is reserved, not requested again');
});

test(`live: ping, status, install, dictation with partials, meeting, pcm at 16 and 48 kHz, errors, shutdown${live ? '' : ` (SKIPPED: ${why})`}`, { skip: !live }, async (t) => {
  const h = new MdSpeech(BIN);
  try {
    const ping = await h.ping();
    assert.match(ping.version, /^\d+\.\d+\.\d+$/);
    // Reserving the asset talks to Apple's assistant daemon over XPC. A
    // seatbelt sandbox (this repo's agent sessions run in one) refuses that
    // with kAFAssistantErrorDomain 1101; that is the environment, not the
    // helper, so the live test says so and stops rather than failing.
    try {
      await h.install('en_US', () => {});
    } catch (e) {
      if (e instanceof MdSpeechError && e.code === 'asset-install-failed' && /1101/.test(String(e.detail?.detail))) {
        t.skip('the speech asset daemon is unreachable from this sandbox (kAFAssistantErrorDomain 1101); run outside the sandbox');
        return;
      }
      throw e;
    }
    const st = await h.status('en_US');
    assert.equal(st.status, 'installed', `both module assets present: ${JSON.stringify(st)}`);
    // Installed and reserved: the next install is a lookup, not a request
    // (the request took 3 s a call with nothing to fetch, T117 step 4).
    const again = await h.install('en_US');
    assert.ok(again.ms < 500, `a second install answers at once: ${again.ms} ms`);

    // The streamed session, at microphone pace: 100 ms chunks, then end.
    const warm = await h.warm('en_US');
    assert.ok(warm.ms >= 0);
    const pcmAll = fs.readFileSync(FIX).subarray(44);
    const heard = [];
    const s = await h.openStream({ sampleRate: 16000, mode: 'dictation', words: ['gratitude'] }, (p) => heard.push(p));
    for (let i = 0; i < pcmAll.length; i += 3200) { s.push(pcmAll.subarray(i, i + 3200)); await new Promise((r) => setTimeout(r, 100)); }
    const tEnd = Date.now();
    const fin = await s.end();
    const wall = Date.now() - tEnd;
    assert.equal(norm(fin.text), EXPECT, `streamed text: ${fin.text}`);
    assert.ok(heard.length >= 2, `partials while streaming (${heard.length})`);
    assert.equal(fin.chunks, Math.ceil(pcmAll.length / 3200));
    assert.ok(Math.abs(fin.seconds - pcmAll.length / 32000) < 0.01, `seconds ${fin.seconds}`);
    t.diagnostic(`stream end to final: helper ${fin.ms} ms, wall ${wall} ms (load ${os.loadavg().map((n) => n.toFixed(1)).join(' ')})`);
    // Kevin's criterion (T117 step 4, 23 Sep): within 1.5 s at system load
    // under 5. Above that the number is written down, not held: at load 11
    // the same clip took 1749 ms on a Mac shared with other sessions.
    if (os.loadavg()[0] < 5) assert.ok(fin.ms < 1500, `final within 1.5 s of end once warm: ${fin.ms} ms`);
    else t.diagnostic(`load over 5: the 1.5 s bound is not held, ${fin.ms} ms is informational`);
    // A tap: cancelled, no final.
    const c = await h.openStream({ sampleRate: 16000 });
    c.push(pcmAll.subarray(0, 3200));
    c.cancel();
    await assert.rejects(c.end(), (e) => e instanceof MdSpeechError && e.code === 'cancelled');

    const partials = [];
    const d = await h.transcribe({ audioPath: FIX, mode: 'dictation', words: ['gratitude'] }, (p) => partials.push(p));
    assert.equal(norm(d.text), EXPECT, `dictation text: ${d.text}`);
    assert.ok(partials.length >= 2, `partials streamed (${partials.length})`);
    assert.ok(d.segments.length >= 1 && d.segments[0].t1 > 0 && d.segments[0].t0 >= 0, 'segments carry t0 and t1 in seconds, like md-whisper');
    assert.ok(d.ms > 0 && d.ms < 60_000, 'ms is a wall clock');

    const m = await h.transcribe({ audioPath: FIX, mode: 'meeting' });
    assert.equal(norm(m.text), EXPECT, `meeting text: ${m.text}`);
    // md-whisper's vocabulary field is accepted as well.
    const viaPrompt = await h['send']({ audioPath: FIX, mode: 'dictation', stream: false, prompt: 'gratitude, Munder Difflin' });
    assert.equal(norm(String(viaPrompt.text)), EXPECT, 'prompt works like words');

    // Raw PCM, the path the renderer takes (WebAudio decode, no ffmpeg): the
    // wav's data chunk at its native 16 kHz and a 48 kHz copy the helper resamples.
    const pcm16 = fs.readFileSync(FIX).subarray(44);
    const p1 = await h.transcribe({ pcm16, sampleRate: 16000, mode: 'dictation', stream: false });
    assert.equal(norm(p1.text), EXPECT, `pcm 16k: ${p1.text}`);
    const pcm48 = fs.readFileSync(FIX48).subarray(44);
    const p2 = await h.transcribe({ pcm16: pcm48, sampleRate: 48000, mode: 'dictation', stream: false });
    assert.equal(norm(p2.text), EXPECT, `pcm 48k: ${p2.text}`);

    await assert.rejects(h.transcribe({ audioPath: '/nowhere/none.wav', mode: 'dictation' }), (e) => e instanceof MdSpeechError && e.code === 'transcription-failed');
    await assert.rejects(h.transcribe({ mode: 'dictation' }), (e) => e instanceof MdSpeechError && e.code === 'transcription-failed');
    // The helper answered everything from one process.
    assert.equal(h.running, true);
  } finally {
    await h.stop();
  }
  assert.equal(h.running, false, 'stop() ends the helper');
});

test(`live: a helper that dies rejects what was pending and the next call starts a new one${live ? '' : ` (SKIPPED: ${why})`}`, { skip: !live }, async () => {
  const h = new MdSpeech(BIN);
  try {
    await h.ping();
    const pend = h.transcribe({ audioPath: FIX, mode: 'meeting' });
    // Kill it under the request's feet.
    h['proc'].kill('SIGKILL');
    await assert.rejects(pend, (e) => e instanceof MdSpeechError && e.code === 'helper-exited');
    const again = await h.ping();
    assert.match(again.version, /^\d+\.\d+\.\d+$/, 'a fresh helper answers');
  } finally {
    await h.stop();
  }
});
