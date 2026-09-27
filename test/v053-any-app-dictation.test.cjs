'use strict';
/**
 * 0.5.3, F16: dictation into any app on macOS.
 *
 * Two halves. The loop in src/main/transcribe/anyApp.ts is driven here
 * against a FAKE helper (a node script that speaks md-hotkey's protocol and
 * fires key and audio events on demand), so the order of things, the tap
 * rule, the injection and the error paths are checked on every platform
 * with no microphone and no permission prompt. Both ways the audio can
 * travel are driven: streamed (chunks while the key is held, the session
 * ends on key up) and file mode (the whole clip on key up), plus the fall
 * back from one to the other when a transcriber refuses streams. The real helper
 * (tools/md-hotkey/main.swift, resources/transcribe/darwin-universal/
 * md-hotkey) is then driven for what a sandbox allows: ping, permissions,
 * arming a key, refusing a bare letter, a dry run paste that puts the
 * pasteboard back. Pressing the key for real and the microphone are hand
 * tests T119 and T120.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const cache = new Map();
function loadTs(rel) {
  if (cache.has(rel)) return cache.get(rel);
  const out = ts.transpileModule(read(rel), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } });
  const m = { exports: {} };
  const req = (r) => (r.startsWith('./') ? loadTs(path.posix.join(path.posix.dirname(rel), r) + '.ts') : require(r));
  new Function('module', 'exports', 'require', out.outputText)(m, m.exports, req);
  cache.set(rel, m.exports);
  return m.exports;
}
const { AnyAppDictation, DEFAULT_PUSH_TO_TALK_KEY, mdHotkeyPath, mdHotkeyAvailable } = loadTs('src/main/transcribe/anyApp.ts');
const { LineHelper, HelperError } = loadTs('src/main/transcribe/lineHelper.ts');
const { MdSpeech, MdSpeechError, mdSpeechPath } = loadTs('src/main/transcribe/mdSpeech.ts');
const FIX = path.join(ROOT, 'test/fixtures/speech/librispeech-4446-2275-0024.wav');

/* The fake helper: node, speaks the protocol, and takes test-only ops that
   fire the events a real key press would. */
const FAKE = path.join(os.tmpdir(), `fake-md-hotkey-${process.pid}.cjs`);
fs.writeFileSync(FAKE, `
const rl = require('node:readline').createInterface({ input: process.stdin });
const out = (o) => process.stdout.write(JSON.stringify(o) + '\\n');
out({ ready: true, helper: 'fake-md-hotkey', version: '0.0.0' });
let armed = null; let streamMode = false; const injected = [];
rl.on('line', (line) => {
  const r = JSON.parse(line);
  switch (r.op) {
    case 'ping': out({ id: r.id, ok: true, helper: 'fake-md-hotkey', version: '0.0.0', stream: true }); break;
    case 'permissions': out({ id: r.id, mic: 'authorized', accessibility: true, postEvent: true }); break;
    case 'arm': if (!/\\+|^F\\d+$|^Option$/.test(r.key)) { out({ id: r.id, error: 'bad-key', key: r.key }); break; } armed = r.key; streamMode = r.record !== false && r.stream === true; out({ id: r.id, ok: true, key: r.key, keyCode: 49, modifiers: 6144, record: r.record !== false, stream: streamMode }); break;
    case 'disarm': armed = null; out({ id: r.id, ok: true }); break;
    case 'inject': if (r.text === 'FAIL') { out({ id: r.id, error: 'post-event-denied' }); break; } injected.push(r.text); out({ id: r.id, ok: true, posted: !r.dryRun, restored: true, dryRun: !!r.dryRun }); break;
    case 'shutdown': out({ id: r.id, ok: true }); process.exit(0);
    // test-only: a press of the armed key with N seconds of "audio". In
    // stream mode the audio leaves in 100 ms chunks like the real helper's,
    // at microphone pace when "paced", then keyup and audio-end.
    case 'fake-press': {
      const seconds = r.seconds; const held = Math.round(seconds * 1000);
      const pcm = r.wav ? require('node:fs').readFileSync(r.wav).subarray(44) : Buffer.alloc(Math.round(seconds * 16000) * 2, r.byte ?? 1);
      const secs = r.wav ? pcm.length / 32000 : seconds;
      out({ event: 'keydown' });
      if (!streamMode) {
        out({ event: 'keyup', heldMs: held });
        out({ event: 'audio', pcm16: pcm.toString('base64'), sampleRate: 16000, seconds: secs });
        out({ id: r.id, ok: true }); break;
      }
      let seq = 0;
      const step = 3200;
      const tick = () => {
        if (seq * step < pcm.length) {
          out({ event: 'chunk', pcm16: pcm.subarray(seq * step, (seq + 1) * step).toString('base64'), sampleRate: 16000, seq: ++seq });
          if (r.paced) setTimeout(tick, 100); else tick();
          return;
        }
        out({ event: 'keyup', heldMs: held });
        out({ event: 'audio-end', seconds: secs, peak: 0.5, chunks: seq });
        out({ id: r.id, ok: true });
      };
      tick();
      break;
    }
    case 'fake-error': out({ event: 'error', error: r.error, detail: 'from the fake' }); out({ id: r.id, ok: true }); break;
    case 'crash': process.exit(9);
    default: out({ id: r.id, error: 'unknown-op', op: r.op });
  }
});
rl.on('close', () => process.exit(0));
`);
const FAKE_BIN = process.execPath; // node itself runs the fake through env NODE_OPTIONS? No: spawn node with the script as argv is not what LineHelper does, so wrap it.
const WRAP = path.join(os.tmpdir(), `fake-md-hotkey-${process.pid}.sh`);
fs.writeFileSync(WRAP, `#!/bin/sh\nexec "${process.execPath}" "${FAKE}"\n`, { mode: 0o755 });
test.after(() => { for (const f of [FAKE, WRAP]) try { fs.unlinkSync(f); } catch { /* gone */ } });

const events = [];
const transcripts = [];
const streams = [];
// The fake audio's byte says what to "hear": 1 = words, 2 = silence, 3 = a
// failure, 4 = a paste the helper refuses, 5 = a stream that fails at end.
const hear = (pcm16, words, tag) => {
  const b = pcm16[0];
  if (b === 3) throw new Error('engine down');
  return b === 2 ? '  ' : b === 4 ? 'FAIL' : `heard ${pcm16.length / 32000}s with ${words.length} words${tag}`;
};
const fileTranscriber = {
  async transcribe(req, onPartial) {
    transcripts.push(req);
    onPartial?.('so');
    onPartial?.('so far');
    return { text: hear(req.pcm16, req.words, '') };
  }
};
/** Takes chunks like md-speech does; `refuse` makes it a helper without the op. */
const streamTranscriber = (refuse = false) => ({
  ...fileTranscriber,
  async openStream(req, onPartial) {
    if (refuse) throw new HelperError('unknown-op', { op: 'stream' });
    const s = { req, parts: [], cancelled: false, ended: false };
    streams.push(s);
    return {
      push: (b) => { s.parts.push(b); onPartial?.(`heard ${s.parts.length} chunks`); },
      end: async () => {
        s.ended = true;
        const pcm16 = Buffer.concat(s.parts);
        if (pcm16[0] === 5) throw new Error('session lost');
        return { text: hear(pcm16, req.words, ' (streamed)'), ms: 42 };
      },
      cancel: () => { s.cancelled = true; }
    };
  }
});
function makeLoop(extra = {}) {
  events.length = 0;
  return new AnyAppDictation({
    helperPath: WRAP,
    key: DEFAULT_PUSH_TO_TALK_KEY,
    words: () => ['Munder Difflin', 'Stapler'],
    transcriber: fileTranscriber,
    onEvent: (e) => events.push(e),
    ...extra
  });
}
const fakePress = (loop, seconds, byte = 1, extra = {}) => loop['helper'].request({ op: 'fake-press', seconds, byte, ...extra });
const settle = (ms = 60) => new Promise((r) => setTimeout(r, ms));
const types = () => events.map((e) => e.type);
const lastInjected = () => events.filter((e) => e.type === 'injected').at(-1);

test('the loop: hold the key, the audio is transcribed with the vocabulary and pasted; a tap is ignored; silence is not pasted', async () => {
  const loop = makeLoop();
  try {
    const armed = await loop.start();
    assert.equal(armed.key, 'Option', 'the 0.5.3 default: hold Option alone');
    assert.equal(armed.stream, false, 'a transcriber without openStream gets the whole clip on key up');
    assert.equal(loop.streaming, false);
    assert.equal(loop.armed, 'Option');
    await fakePress(loop, 1.5); await settle();
    assert.deepEqual(types(), ['keydown', 'keyup', 'transcribing', 'partial', 'partial', 'injected'], JSON.stringify(events));
    assert.equal(events.at(-1).text, 'heard 1.5s with 2 words');
    assert.equal(events.at(-1).streamed, false);
    assert.deepEqual(transcripts.at(-1).words, ['Munder Difflin', 'Stapler']);
    assert.equal(transcripts.at(-1).mode, 'dictation');
    assert.equal(transcripts.at(-1).sampleRate, 16000);

    events.length = 0;
    await fakePress(loop, 0.1); await settle();
    assert.deepEqual(events.map((e) => e.type), ['keydown', 'keyup', 'tap'], 'a 100 ms hold is a tap, nothing transcribed');

    events.length = 0;
    await fakePress(loop, 1, 2); await settle();
    assert.deepEqual(events.map((e) => e.type), ['keydown', 'keyup', 'transcribing', 'partial', 'partial', 'empty'], 'silence pastes nothing');

    const perms = await loop.permissions();
    assert.deepEqual(perms, { mic: 'authorized', accessibility: true, postEvent: true });
    const dry = await loop.inject('try it', true);
    assert.equal(dry.posted, false, 'a dry run posts no keystroke');
  } finally {
    await loop.stop();
  }
  assert.equal(loop.armed, null);
});

test('the loop, streamed: chunks go to the session while the key is held, the final lands after key up; a tap cancels; silence pastes nothing', async () => {
  streams.length = 0; transcripts.length = 0;
  const loop = makeLoop({ transcriber: streamTranscriber() });
  try {
    const armed = await loop.start();
    assert.equal(armed.stream, true, 'the helper was asked for chunks');
    assert.equal(loop.streaming, true);
    await fakePress(loop, 1.5); await settle();
    const t = types();
    assert.equal(t[0], 'keydown');
    assert.ok(t.includes('keyup') && t.includes('transcribing') && t.at(-1) === 'injected', JSON.stringify(t));
    assert.ok(t.filter((x) => x === 'partial').length >= 15, `a partial per chunk (${t.filter((x) => x === 'partial').length})`);
    assert.equal(lastInjected().text, 'heard 1.5s with 2 words (streamed)');
    assert.equal(lastInjected().streamed, true);
    assert.ok(lastInjected().ms >= 0 && lastInjected().ms < 1000, `ms is key up to pasted: ${lastInjected().ms}`);
    assert.equal(streams.length, 1);
    assert.equal(streams[0].ended, true);
    assert.equal(Buffer.concat(streams[0].parts).length, 1.5 * 32000, 'every chunk reached the session');
    assert.deepEqual(streams[0].req, { sampleRate: 16000, mode: 'dictation', words: ['Munder Difflin', 'Stapler'] });
    assert.equal(transcripts.filter((r) => r.pcm16.length === 1.5 * 32000).length, 0, 'file mode was not used');
    assert.equal(events.find((e) => e.type === 'transcribing').streamed, true);

    events.length = 0;
    await fakePress(loop, 0.1); await settle();
    assert.ok(types().includes('tap') && !types().includes('injected'), `a tap: ${JSON.stringify(types())}`);
    assert.equal(streams.at(-1).cancelled, true, 'the session was cancelled, not ended');
    assert.equal(streams.at(-1).ended, false);

    events.length = 0;
    await fakePress(loop, 1, 2); await settle();
    assert.ok(types().includes('empty') && !types().includes('injected'), 'silence pastes nothing');
    assert.equal(loop.streamRefused, false);
  } finally { await loop.stop(); }
});

test('the loop, streamed: a transcriber that refuses streams gets the whole clip, now and for every later press', async () => {
  streams.length = 0; transcripts.length = 0;
  const loop = makeLoop({ transcriber: streamTranscriber(true) });
  try {
    const armed = await loop.start();
    assert.equal(armed.stream, true, 'the loop asked for chunks; the refusal comes from the transcriber');
    await fakePress(loop, 1.5); await settle();
    assert.ok(types().includes('stream-off'), `the refusal is an event: ${JSON.stringify(types())}`);
    assert.equal(lastInjected().text, 'heard 1.5s with 2 words', 'file mode on the chunks the loop kept');
    assert.equal(lastInjected().streamed, false);
    assert.equal(transcripts.at(-1).pcm16.length, 1.5 * 32000, 'the whole clip, from the chunks');
    assert.equal(loop.streamRefused, true);

    events.length = 0;
    await fakePress(loop, 0.5); await settle();
    assert.equal(lastInjected().text, 'heard 0.5s with 2 words');
    assert.equal(types().filter((x) => x === 'stream-off').length, 0, 'no second attempt, no second refusal');
    assert.equal(streams.length, 0, 'openStream was never asked again after the refusal');
  } finally { await loop.stop(); }
});

test('the loop, streamed: a session that fails at the end falls back to file mode for that utterance and keeps streaming', async () => {
  streams.length = 0; transcripts.length = 0;
  const loop = makeLoop({ transcriber: streamTranscriber() });
  try {
    await loop.start();
    await fakePress(loop, 1, 5); await settle();
    assert.equal(lastInjected().text, 'heard 1s with 2 words', 'file mode carried it');
    assert.equal(lastInjected().streamed, false);
    assert.equal(transcripts.at(-1).pcm16.length, 32000);
    assert.equal(loop.streamRefused, false, 'a failure is not a refusal');
    events.length = 0;
    await fakePress(loop, 0.5); await settle();
    assert.equal(lastInjected().text, 'heard 0.5s with 2 words (streamed)', 'the next press streams again');
    assert.equal(streams.length, 2);
  } finally { await loop.stop(); }
});

test('the loop, streamed: stream: false keeps file mode even when the transcriber could stream', async () => {
  streams.length = 0;
  const loop = makeLoop({ transcriber: streamTranscriber(), stream: false });
  try {
    const armed = await loop.start();
    assert.equal(armed.stream, false);
    await fakePress(loop, 0.5); await settle();
    assert.equal(lastInjected().text, 'heard 0.5s with 2 words');
    assert.equal(streams.length, 0);
  } finally { await loop.stop(); }
});

test('the loop: two presses in a row are handled in order, one at a time', async () => {
  const loop = makeLoop();
  try {
    await loop.start();
    await fakePress(loop, 0.5); await fakePress(loop, 0.75); await settle();
    const injected = events.filter((e) => e.type === 'injected').map((e) => e.text);
    assert.deepEqual(injected, ['heard 0.5s with 2 words', 'heard 0.75s with 2 words']);
  } finally { await loop.stop(); }
});

test('the loop: a transcriber failure, a refused paste and a helper error are events, not crashes', async () => {
  const loop = makeLoop();
  try {
    await loop.start();
    await fakePress(loop, 1, 3); await settle();
    assert.ok(events.some((e) => e.type === 'error' && e.error === 'transcription-failed' && /engine down/.test(e.detail)), JSON.stringify(events));
    events.length = 0;
    await fakePress(loop, 1, 4); await settle();
    assert.ok(events.some((e) => e.type === 'error' && e.error === 'post-event-denied'), 'the paste refusal comes through with its code');
    events.length = 0;
    await loop['helper'].request({ op: 'fake-error', error: 'mic-denied' }); await settle();
    assert.deepEqual(events, [{ type: 'error', error: 'mic-denied', detail: 'from the fake' }]);
  } finally { await loop.stop(); }
});

test('the loop: a dead helper is reported, and start() brings a new one', async () => {
  const loop = makeLoop();
  try {
    await loop.start();
    loop['helper'].request({ op: 'crash' }).catch(() => {});
    await new Promise((r) => setTimeout(r, 150));
    assert.ok(events.some((e) => e.type === 'helper-exited'), JSON.stringify(events));
    assert.equal(loop.armed, null);
    const again = await loop.start();
    assert.equal(again.key, 'Option');
  } finally { await loop.stop(); }
});

test('the line helper: a request that never gets its closing line rejects when the process dies', async () => {
  const h = new LineHelper(WRAP);
  const p = h.request({ op: 'ping' });
  assert.equal((await p).ok, true);
  const hang = h.request({ op: 'fake-press', seconds: 0 }, undefined, () => false); // never final
  h.killForTests();
  await assert.rejects(hang, (e) => e instanceof HelperError && e.code === 'helper-exited');
  assert.equal(h.running, false);
});

const macMajor = process.platform === 'darwin' ? Number(os.release().split('.')[0]) : 0;
const BIN = mdHotkeyPath(path.join(ROOT, 'resources'));
const live = process.platform === 'darwin' && fs.existsSync(BIN);
const why = process.platform !== 'darwin' ? 'not macOS' : `no helper at ${BIN}`;

test('the packaging: the helper is a universal Mach-O next to md-speech', () => {
  assert.ok(fs.existsSync(BIN), `${BIN} is committed`);
  assert.ok(fs.statSync(BIN).mode & 0o111, 'executable');
  const head = fs.readFileSync(BIN).subarray(0, 8);
  assert.equal(head.readUInt32BE(0), 0xcafebabe, 'universal');
  assert.equal(head.readUInt32BE(4), 2, 'arm64 and x86_64');
  assert.equal(mdHotkeyAvailable('/nowhere'), false);
  const src = read('tools/md-hotkey/main.swift');
  assert.match(src, /RegisterEventHotKey\(spec\.code, spec\.modifiers/, 'a Carbon hot key');
  assert.match(src, /kEventHotKeyReleased/, 'with key up');
  assert.match(src, /"event": "chunk", "pcm16": chunk\.base64EncodedString\(\)/, 'a held key streams chunks');
  assert.match(src, /chunkQueue\.async \{ emit\(\["event": "audio-end"/, 'audio-end follows the last chunk on the same queue');
  assert.match(src, /"stream": streamOnHold/, 'the arm reply says whether chunks will come');
  assert.match(src, /if mods == 0 && !isFunctionKey \{ return nil \}/, 'a bare letter is never taken from every app');
  assert.match(src, /restorePasteboard\(saved\)/, 'the pasteboard goes back');
  assert.match(src, /CGPreflightPostEventAccess\(\)/, 'the paste keystroke checks its grant first');
  assert.match(src, /setActivationPolicy\(\.prohibited\)/, 'no Dock icon, no menu bar');
  const yml = read('electron-builder.yml');
  assert.match(yml, /from: resources\/transcribe\/darwin-universal\/md-hotkey\n\s+to: transcribe\/darwin-universal\/md-hotkey/, 'ships with the app, per platform since PR #44');
  assert.match(yml, /binaries:\n(?:\s+- .*\n)*\s+- Contents\/Resources\/transcribe\/darwin-universal\/md-hotkey/, 'signed with the app');
});

test(`live: the real helper answers, arms a key, refuses a bare letter, and a dry run paste puts the pasteboard back${live ? '' : ` (SKIPPED: ${why})`}`, { skip: !live }, async (t) => {
  const h = new LineHelper(BIN);
  try {
    const ping = await h.request({ op: 'ping' });
    assert.equal(ping.helper, 'md-hotkey');
    const perms = await h.request({ op: 'permissions' }, undefined, (l) => 'mic' in l);
    assert.ok(['authorized', 'denied', 'notDetermined', 'restricted'].includes(perms.mic), String(perms.mic));
    assert.equal(typeof perms.accessibility, 'boolean');
    assert.equal(typeof perms.postEvent, 'boolean');
    // Carbon refuses to register a hot key inside a seatbelt sandbox (status
    // -9868); that is the environment, so the live test says so and stops.
    let armed;
    try {
      armed = await h.request({ op: 'arm', key: 'Control+Alt+F19', record: false });
    } catch (e) {
      if (e instanceof HelperError && e.code === 'register-failed' && e.detail?.status === -9868) {
        t.skip('hot keys cannot be registered from this sandbox (Carbon -9868); run outside the sandbox');
        return;
      }
      throw e;
    }
    assert.equal(armed.keyCode, 80);
    await assert.rejects(h.request({ op: 'arm', key: 'a' }), (e) => e.code === 'bad-key');
    await assert.rejects(h.request({ op: 'arm', key: 'Hyper+Q' }), (e) => e.code === 'bad-key');
    const armed2 = await h.request({ op: 'arm', key: 'F19' });
    assert.equal(armed2.modifiers, 0, 'an F key alone is allowed');
    // The microphone, when this process already holds the grant (a fresh
    // machine would prompt, which a test must not do): half a second in,
    // 16 kHz PCM out, with a peak level for a meter.
    if (perms.mic === 'authorized') {
      let audio = null;
      const onEvent = (e) => { if (e.event === 'audio') audio = e; };
      h['opts'].onEvent = onEvent;
      const rec = await h.request({ op: 'record', seconds: 0.5 });
      assert.equal(rec.ok, true);
      assert.ok(audio, 'an audio event came before the reply');
      // The streamed shape: chunks, then audio-end after the last of them.
      const chunks = []; let end = null;
      h['opts'].onEvent = (e) => { if (e.event === 'chunk') chunks.push(e); if (e.event === 'audio-end') end = e; };
      await new Promise((r) => setTimeout(r, 400));
      await h.request({ op: 'record', seconds: 0.5, stream: true });
      await new Promise((r) => setTimeout(r, 300));
      assert.ok(end, 'audio-end came');
      assert.ok(chunks.length >= 3 && chunks.length <= 8, `about five 100 ms chunks (${chunks.length})`);
      assert.equal(end.chunks, chunks.length, 'audio-end counts them, and came after the last');
      assert.deepEqual(chunks.map((c) => c.seq), chunks.map((_, i) => i + 1), 'numbered in order');
      const total = chunks.reduce((n, c) => n + Buffer.from(c.pcm16, 'base64').length, 0);
      assert.ok(Math.abs(total - end.seconds * 32000) < 64, `the chunks add up to the seconds: ${total} vs ${end.seconds * 32000}`);
      h['opts'].onEvent = onEvent;
      assert.equal(audio.sampleRate, 16000);
      assert.ok(audio.seconds >= 0.3 && audio.seconds <= 0.7, `about half a second of audio: ${audio.seconds}`);
      assert.ok(Math.abs(Buffer.from(audio.pcm16, 'base64').length - audio.seconds * 32000) < 64, 'the bytes match the seconds (seconds is rounded to a millisecond)');
      assert.ok(typeof audio.peak === 'number' && audio.peak >= 0 && audio.peak <= 1, 'a peak level');
      await assert.rejects(Promise.all([h.request({ op: 'record', seconds: 0.3 }), h.request({ op: 'record', seconds: 0.3 })]), (e) => e.code === 'busy', 'two at once: the second is refused');
      await new Promise((r) => setTimeout(r, 400));
    }
    const dry = await h.request({ op: 'inject', text: 'md-hotkey test', dryRun: true, restoreMs: 60 });
    assert.equal(dry.posted, false);
    assert.equal(dry.restored, true);
    await h.request({ op: 'disarm' });
  } finally {
    await h.stop();
  }
  assert.equal(h.running, false);
});

// The loop end to end on the REAL recogniser: the fake key streams the
// fixture at microphone pace into md-speech and the final text is what the
// clip says. Skips where md-speech cannot run (not macOS 26, no binary, or a
// sandbox that keeps the asset daemon away).
const SPEECH = mdSpeechPath(path.join(ROOT, 'resources'));
const speechLive = process.platform === 'darwin' && macMajor >= 25 && fs.existsSync(SPEECH);
test(`live: a held key streamed into the real md-speech pastes the clip's words within 1.5 s of key up${speechLive ? '' : ' (SKIPPED: needs macOS 26 and md-speech)'}`, { skip: !speechLive }, async (t) => {
  const speech = new MdSpeech(SPEECH);
  try {
    try { await speech.install('en_US'); } catch (e) {
      if (e instanceof MdSpeechError && e.code === 'asset-install-failed' && /1101/.test(String(e.detail?.detail))) { t.skip('the speech asset daemon is unreachable from this sandbox (kAFAssistantErrorDomain 1101)'); return; }
      throw e;
    }
    const warm = await speech.warm('en_US');
    assert.ok(warm.ms >= 0, 'warm answers');
    const loop = makeLoop({ transcriber: { transcribe: (req, p) => speech.transcribe({ ...req, autoInstall: true }, p), openStream: (req, p) => speech.openStream(req, p) } });
    try {
      const armed = await loop.start();
      assert.equal(armed.stream, true);
      await fakePress(loop, 0, 1, { wav: FIX, paced: true });
      const until = Date.now() + 15000;
      while (Date.now() < until && !events.some((e) => e.type === 'injected' || e.type === 'error' || e.type === 'empty')) await settle(20);
      const inj = lastInjected();
      assert.ok(inj, `pasted: ${JSON.stringify(events.filter((e) => e.type !== 'partial'))}`);
      assert.equal(inj.streamed, true, 'streamed, not the fallback');
      assert.equal(inj.text.toLowerCase().replace(/[^a-z' ]+/g, ' ').trim(), 'she pressed his hand gently in gratitude');
      assert.ok(events.filter((e) => e.type === 'partial').length >= 2, 'partials arrived while the key was held');
      t.diagnostic(`key up to pasted: ${inj.ms} ms (load ${os.loadavg().map((n) => n.toFixed(1)).join(' ')})`);
      // The same load rule as the md-speech suite (T117 step 4): held under 5.
      if (os.loadavg()[0] < 5) assert.ok(inj.ms < 1500, `within 1.5 s of key up: ${inj.ms} ms`);
      else t.diagnostic(`load over 5: the 1.5 s bound is not held, ${inj.ms} ms is informational`);
    } finally { await loop.stop(); }
  } finally { await speech.stop(); }
});
