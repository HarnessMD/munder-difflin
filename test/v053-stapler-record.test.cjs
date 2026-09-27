'use strict';

// 0.5.3, founder 25 Sep 2026 (batch 2): "The stapler is stuck in the listening
// UI and can not come out of it the cancel button is not working." And the
// new Record message flow: Done or Cancel while listening, then the compose
// card with the words in it, in the PRO theme.
//
// The recorder runs for real here against a fake MediaRecorder and a fake
// microphone, so the two ways it got stuck are replayed: a stop landing while
// a part was being handed over, and a cancel while the microphone was still
// opening. The take's phases and watchdogs run for real (shared/puckTake.ts);
// the Stapler window is .tsx, so its wiring is read as source.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

// ---- a fake microphone and MediaRecorder --------------------------------------
const recorders = [];
class FakeRecorder {
  constructor(stream) { this.stream = stream; this.state = 'inactive'; this.mimeType = 'audio/webm'; recorders.push(this); }
  start() { this.state = 'recording'; }
  stop() {
    if (this.state !== 'recording') throw new Error('not recording');
    this.state = 'inactive';
    // A real recorder hands its data, then says it stopped, on later turns.
    setTimeout(() => { this.ondataavailable?.({ data: new Blob([new Uint8Array([1, 2, 3])]) }); setTimeout(() => this.onstop?.(), 0); }, 0);
  }
}
FakeRecorder.isTypeSupported = () => false;
let micGate = null;
const tracks = [];
function fakeStream() { const t = { stopped: false, stop() { this.stopped = true; } }; tracks.push(t); return { getTracks: () => [t], getAudioTracks: () => [t] }; }
globalThis.MediaRecorder = FakeRecorder;
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: { mediaDevices: { getUserMedia: () => (micGate ? micGate.promise : Promise.resolve(fakeStream())) } }
});
const rec = loadTs('src/renderer/src/puck/recorder.ts');
const tick = (ms = 5) => new Promise((r) => setTimeout(r, ms));
const lastRecorder = () => recorders[recorders.length - 1];

test('a stop that lands while a part is being handed over still ends the take: final once, microphone let go', async () => {
  const calls = [];
  const started = await rec.start({ kind: 'message' }, async (clip, final) => { calls.push({ bytes: clip.audio.byteLength, final }); });
  assert.deepEqual(started, { ok: true });
  // A pause rolls the part: the recorder stops, and its hand over is async.
  lastRecorder().stop();
  await tick(1);
  // Done, right inside that hand over. Before the fix this tore down under
  // it: the handler never heard `final`, main never heard the end, and the
  // Stapler stayed in "listening" with Cancel doing nothing.
  await rec.stop();
  assert.equal(calls.filter((c) => c.final).length, 1, `final once: ${JSON.stringify(calls)}`);
  assert.equal(rec.isRecording(), false);
  assert.ok(tracks[tracks.length - 1].stopped, 'the microphone was not let go');
});

test('a pause starts the next part at once, so words said while the last one is written down are kept, in order (25 Sep)', async () => {
  // Words said during a part's transcription were lost: the next part only
  // started once the transcription was back.
  const calls = [];
  let release;
  const writing = new Promise((r) => { release = r; });
  await rec.start({ kind: 'message' }, async (clip, final) => {
    calls.push({ bytes: clip.audio.byteLength, final });
    if (!final) await writing; // the first part is being transcribed
  });
  const before = recorders.length;
  // A pause rolls the part.
  lastRecorder().stop();
  for (let i = 0; i < 200 && calls.length === 0; i++) await tick(5);
  assert.equal(calls.length, 1, 'the part reached the handler');
  assert.equal(recorders.length, before + 1, 'no part is recording while the last one is written down: those words are lost');
  assert.equal(lastRecorder().state, 'recording');
  // Stop, while the first part is still being written down (founder: the mic
  // must stop at the click, and nothing said after it may be added).
  const stopped = rec.stop();
  assert.ok(tracks[tracks.length - 1].stopped, 'the microphone kept running after the click');
  await tick(20);
  assert.equal(calls.length, 1, 'the last part overtook the one before it');
  release();
  await stopped;
  assert.equal(recorders.length, before + 1, 'a part started after Stop and recorded past the click');
  assert.deepEqual(calls, [{ bytes: 3, final: false }, { bytes: 3, final: true }], 'both parts, in the order said, the end heard once');
  assert.equal(rec.isRecording(), false);
});

test('Stop mid sentence: the microphone goes at the click, and what came before it is still delivered as the last part', async () => {
  const calls = [];
  await rec.start({ kind: 'message' }, async (clip, final) => { calls.push({ bytes: clip.audio.byteLength, final }); await tick(5); });
  const stopped = rec.stop();
  assert.ok(tracks[tracks.length - 1].stopped, 'the microphone waited for the transcription');
  await stopped;
  assert.deepEqual(calls, [{ bytes: 3, final: true }]);
});

test('the card\'s mic shows stopped from the click', () => {
  assert.match(APP, /if \(dictating\) \{ if \(busy === null\) setBusy\('stopping'\); void rec\.stop\(\); return; \}/);
  assert.match(APP, /const listening = dictating && busy !== 'stopping' && busy !== 'transcribe';/);
  assert.match(APP, /<Glyph name=\{listening \? 'stop' : 'mic'\} size=\{15\} \/>/);
});

test('a stop with no running part still tells the handler the take is over', async () => {
  const calls = [];
  await rec.start({ kind: 'message' }, async (clip, final) => { calls.push({ bytes: clip.audio.byteLength, final }); });
  // The running part is already gone (it failed, or rolled and did not restart).
  lastRecorder().state = 'inactive';
  await rec.stop();
  assert.deepEqual(calls, [{ bytes: 0, final: true }], 'the handler must hear the end, with no audio');
  assert.equal(rec.isRecording(), false);
});

test('Cancel while the microphone is still opening: the take is dropped and the microphone given straight back', async () => {
  let open;
  micGate = { promise: new Promise((r) => { open = r; }) };
  const calls = [];
  const pending = rec.start({ kind: 'message' }, async (clip, final) => { calls.push(final); });
  await tick(1);
  assert.equal(rec.isRecording(), true, 'the take is claimed while the prompt is up');
  rec.cancel();
  assert.equal(rec.isRecording(), false);
  open(fakeStream());
  micGate = null;
  assert.deepEqual(await pending, { ok: false, error: 'cancelled' });
  assert.ok(tracks[tracks.length - 1].stopped, 'the late microphone was kept open');
  assert.deepEqual(calls, []);
  // And the next take starts normally.
  assert.deepEqual(await rec.start({ kind: 'message' }, async () => {}), { ok: true });
  rec.cancel();
});

test('Cancel while listening: nothing goes anywhere, the microphone is let go, and it is safe to call twice', async () => {
  const calls = [];
  await rec.start({ kind: 'message' }, async (clip, final) => { calls.push(final); });
  rec.cancel();
  rec.cancel();
  await tick(10);
  assert.deepEqual(calls, [], 'a cancelled take delivered audio');
  assert.equal(rec.isRecording(), false);
  assert.ok(tracks[tracks.length - 1].stopped);
  assert.equal(rec.level(), 0);
});

test('a second stop waits for the same end and never delivers twice', async () => {
  const calls = [];
  await rec.start({ kind: 'message' }, async (clip, final) => { calls.push(final); await tick(5); });
  await Promise.all([rec.stop(), rec.stop()]);
  assert.equal(calls.filter(Boolean).length, 1);
  assert.equal(rec.isRecording(), false);
});

// ---- the take's phases and watchdogs --------------------------------------------
const { takePhase, takeExpired, dictationExpired, messageOverdue, TAKE_WATCHDOG_MS } = loadTs('src/shared/puckTake.ts');

test('a take from the ring: starting, listening, transcribing, then the card', () => {
  const base = { ringTake: true, recording: false, busy: null, card: true };
  assert.equal(takePhase({ ...base, busy: 'starting' }), 'starting');
  assert.equal(takePhase({ ...base, recording: true }), 'listening');
  assert.equal(takePhase({ ...base, busy: 'transcribe' }), 'transcribing');
  assert.equal(takePhase({ ...base, ringTake: false }), 'card', 'after Done the card opens');
  assert.equal(takePhase({ ...base, ringTake: false, card: false }), 'idle', 'after Cancel, idle');
  assert.equal(takePhase({ ringTake: false, recording: true, busy: null, card: true }), 'card', 'dictating into an open card is the card');
});

test('the watchdog drops a take with no sign of life for a minute, and nothing else', () => {
  assert.equal(TAKE_WATCHDOG_MS, 60_000);
  for (const p of ['starting', 'listening', 'transcribing']) {
    assert.equal(takeExpired(p, 0, 59_999), false, p);
    assert.equal(takeExpired(p, 0, 60_000), true, p);
  }
  for (const p of ['idle', 'card']) assert.equal(takeExpired(p, 0, 10 * 60_000), false, p);
  assert.equal(dictationExpired('listening', 0, 60_000), true, 'an Option hold view main went quiet on');
  assert.equal(dictationExpired('error', 0, 60_000), false);
  assert.equal(messageOverdue(0, 300_000 + 59_999, 300), false);
  assert.equal(messageOverdue(0, 300_000 + 60_000, 300), true, 'main clears a message past its cap and a minute');
});

// ---- the Stapler's wiring ---------------------------------------------------------
const APP = read('src/renderer/src/puck/PuckApp.tsx');
const fn = (name) => { const i = APP.indexOf(`const ${name} = `); return APP.slice(i, APP.indexOf('\n  };', i)); };

test('Cancel always works: it drops the audio, tells main, and clears the card, from any phase', () => {
  const c = fn('cancelTake');
  assert.match(c, /rec\.cancel\(\);/);
  assert.match(c, /window\.cth\.puckMessageStop\(\{ audio: new ArrayBuffer\(0\), mimeType: 'audio\/webm' \}\)/, 'main must hear the end even with no clip');
  assert.match(c, /setRingTake\(false\);/);
  assert.match(c, /setCompose\(null\);/);
  assert.match(c, /setBusy\(null\);/, 'a stuck busy would disable Done and Send');
  // Closing the card mid dictation goes the same way, not through a stop that can wait forever.
  assert.match(fn('closeCard'), /rec\.cancel\(\);[\s\S]*puckMessageStop/);
  // Esc, and the watchdog, both land on cancelTake.
  assert.match(APP, /if \(e\.key === 'Escape'\) \{ e\.preventDefault\(\); cancelTake\(\); \}/);
  assert.match(APP, /if \(takeExpired\(phase, Math\.max\(rec\.lastActive\(\), takeMark\.current\), now\)\) \{\n\s+cancelTake\(\);/);
  assert.match(APP, /if \(dictationExpired\(dictView\.current\.phase, lastDictAt\.current, now\)\) \{ dictView\.current = IDLE_VIEW; setDict\(IDLE_VIEW\); \}/);
});

test('while listening: the eyes, the level, exactly Done and Cancel; a click on the disc does nothing', () => {
  assert.match(APP, /if \(st\.capturing \|\| ringTake\) return;/, 'a click on the disc during a take opens something again');
  assert.match(APP, /\{one\('done', 0\)\}\n\s+\{one\('cancel', 1\)\}/);
  assert.match(APP, /onClick=\{kind === 'done' \? doneTake : cancelTake\}/);
  assert.match(APP, /disabled=\{kind === 'done' && phase !== 'listening'\}/, 'Done only while listening; Cancel always');
  assert.match(APP, /ringTake && phase !== 'card' && phase !== 'idle'\) \? \{ \.\.\.cfg, expression: 'thinking' \}/, 'the eyes take the last pose');
  assert.match(APP, /setTakeLevels\(\(l\) => \[\.\.\.l, levelOf\(rec\.level\(\)\)\]\.slice\(-METER_BARS\)\)/, 'a live level');
  assert.match(APP, /const cardVisible = compose !== null && !ringTake &&/, 'the card waits for Done');
  assert.match(APP, /const pillTop = labelTop > pair\.y \? cy - size \/ 2 - 10 - DICTATE_PILL_H : labelTop - 26 - DICTATE_PILL_H;/, 'the level is never drawn off screen at the bottom');
});

test('Done: stop, the last part is written down, then the card opens with the words in its box', () => {
  const d = fn('doneTake');
  assert.match(d, /if \(busy === 'starting' \|\| !rec\.isRecording\(\)\) \{ cancelTake\(\); return; \}/, 'Done before the microphone opened is a cancel');
  assert.match(d, /void rec\.stop\(\);/);
  assert.match(APP, /if \(final\) \{ setBusy\(null\); setRingTake\(false\); setQuiet\(false\); \}/);
  assert.match(APP, /setNote\(\(n\) => join\(n, out\.text\)\)/, 'the words go into the card');
  // The card: text box, mic (dictate more), add screenshot, recipient, Send.
  for (const a of ['data-dictate', 'data-shot', 'data-recipient']) assert.ok(APP.includes(a), a);
});

test('main clears a message that never ended, whatever the Stapler window did', () => {
  const main = read('src/main/puck.ts');
  assert.match(main, /messageWatch = setTimeout\(\(\) => \{[\s\S]*?setState\(\{ recording: null \}\);[\s\S]*?\}, PUCK_MESSAGE_MAX_SECONDS \* 1000 \+ TAKE_WATCHDOG_MS\);/);
  assert.match(main, /async function messageStop[\s\S]{0,120}if \(messageWatch\) \{ clearTimeout\(messageWatch\); messageWatch = null; \}/);
});

test('the compose card in the PRO kit: tokens only, even 1px borders, light and dark from the tokens', () => {
  const css = read('src/renderer/src/puck/puck.css');
  const block = css.slice(css.indexOf('/* THE COMPOSE CARD IN THE PRO KIT'));
  assert.ok(block.length > 200, 'the kit block is gone');
  assert.doesNotMatch(block, /#[0-9a-fA-F]{3,8}\b/, 'a hard coded colour in the card');
  assert.doesNotMatch(block, /border-(top|right|bottom|left)\s*:/, 'one edge drawn differently');
  assert.doesNotMatch(block, /border:\s*[2-9]px/);
  for (const k of ['--cth-cream-50', '--cth-ink-300', '--cth-accent', '--cth-accent-ink', '--cth-status-blocked']) assert.ok(block.includes(k), k);
  assert.match(APP, /document\.documentElement\.dataset\.cthSkin = 'professional';/, 'the window never gets the PRO tokens');
});

test('strings in every language, no dashes', () => {
  for (const l of ['en', 'ar', 'zh-CN']) {
    const k = JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`)).pro.puck.take;
    for (const s of [k.done, k.cancel, k.expired]) { assert.ok(s && s.trim(), l); assert.doesNotMatch(s, /[–—]| - /, `${l}: ${s}`); }
  }
});
