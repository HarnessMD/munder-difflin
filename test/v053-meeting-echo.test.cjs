/**
 * THE OTHER SIDE MUST NOT COME BACK AS YOU (0.5.3, batch 2 result 9; founder
 * 24 Sep 2026: "when it's in high volume on laptop the output sound of "Them"
 * gets in the transcription ... and even what they say is added in You").
 *
 * The fixture is a real run: a two voice call made with macOS `say`, the
 * speaker to microphone path simulated at four volumes (and once with the two
 * tracks 0.8 s out of step), both tracks transcribed by md-whisper with
 * ggml-small.en-q5_1. Bench and numbers:
 * hive/shared/v053/evidence/meeting-echo/.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const { removeEcho, speakersAreBuiltIn, normWord, ECHO_DEFAULTS } = loadTs('src/shared/meetingEcho.ts');
const call = JSON.parse(read('test/fixtures/meeting-echo/call-small-en.json'));

const words = (s) => s.split(/\s+/).map(normWord).filter(Boolean);
const text = (lines) => lines.map((l) => l.text).join(' ');
/** Words on the You track that only the other side said. */
function leaked(lines) {
  const mine = new Set(words(call.ref.you));
  const theirs = new Set(words(call.ref.them));
  return words(text(lines)).filter((w) => theirs.has(w) && !mine.has(w)).length;
}
/** The person's own reference words missing from the You track. */
function lost(lines) {
  const got = words(text(lines));
  const bag = new Map();
  for (const w of got) bag.set(w, (bag.get(w) ?? 0) + 1);
  let n = 0;
  for (const w of words(call.ref.you)) { if (bag.get(w)) bag.set(w, bag.get(w) - 1); else n++; }
  return n;
}

test('with the speakers loud, their words fill the You track; the guard takes them all out and keeps yours', () => {
  for (const name of ['quiet', 'medium', 'loud', 'loud-skew']) {
    const you = call.scenarios[name].you;
    const before = leaked(you);
    assert.ok(before >= 40, `${name}: the fixture really leaks (${before})`);
    const after = removeEcho(you, call.them);
    assert.ok(leaked(after.lines) <= 1, `${name}: ${leaked(after.lines)} of their words left on You`);
    assert.ok(lost(after.lines) <= lost(call.scenarios.none.you) + 1, `${name}: the guard cut the person's own words (${lost(after.lines)})`);
  }
});

test('with no echo, nothing changes', () => {
  const you = call.scenarios.none.you;
  const r = removeEcho(you, call.them);
  assert.deepEqual(r.lines, you);
  assert.equal(r.words, 0);
});

test('words said inside an echoed line stay; a line of echo alone goes', () => {
  const them = [{ t0: 0, t1: 6, text: 'Can you give me a quick update on the desktop release and whether the installer is ready.' }];
  const you = [
    { t0: 0, t1: 4.5, text: 'can you give me a quick update on the desktop release and whether the' },
    { t0: 4.5, t1: 11, text: 'installer is ready yes the installer passed the gate last night' }
  ];
  const r = removeEcho(you, them);
  assert.equal(r.dropped, 1);
  assert.equal(r.trimmed, 1);
  assert.deepEqual(r.lines.map((l) => l.text), ['yes the installer passed the gate last night']);
});

test('a reply that repeats their words is kept: it comes after them, and a short one is never matched', () => {
  const them = [{ t0: 10, t1: 13, text: 'Can we ship it on Friday?' }];
  // Four words repeated, starting after they stopped.
  const later = removeEcho([{ t0: 13.5, t1: 16, text: 'Yes, ship it on Friday.' }], them);
  assert.equal(later.words, 0);
  // Three words repeated straight away: under the run length.
  const short = removeEcho([{ t0: 12, t1: 14, text: 'On Friday, yes.' }], [{ t0: 10, t1: 13, text: 'Let us talk again on Thursday at 10' }]);
  assert.equal(short.words, 0);
  // The echo used the run up, so the person's own repeat right after it stays.
  const both = removeEcho([{ t0: 50, t1: 57, text: 'perfect let us talk again on Thursday at 10 Thursday at 10 works for me' }], [{ t0: 50, t1: 54, text: 'Perfect, let us talk again on Thursday at 10.' }]);
  assert.equal(both.lines[0].text, 'Thursday at 10 works for me');
  assert.deepEqual(ECHO_DEFAULTS, { windowS: 2, minRun: 4 });
});

test('the transcript on disk is built through the guard; the raw lines are not touched', () => {
  const puck = read('src/main/puck.ts');
  const fn = puck.slice(puck.indexOf('function rebuildTranscript('), puck.indexOf('function meetingStart('));
  assert.match(fn, /const you = them\.length > 0 \? removeEcho\(seg\.lines, them\)\.lines : seg\.lines;/);
  assert.match(fn, /transcriptBlock\(you, them, seg\.startMs, \{ label: true \}\)/);
  assert.doesNotMatch(fn, /seg\.lines =/, 'seg.lines on disk keep every word');
});

test('the meeting microphone asks for Chromium voice processing by name', () => {
  const rec = read('src/renderer/src/puck/recorder.ts');
  assert.match(rec, /m\.kind === 'meeting'\s*\n\s*\? \{ audio: \{ echoCancellation: true, noiseSuppression: true, autoGainControl: true \} \}/);
});

test('the headphones hint: built in speakers yes, anything worn no, a Linux card name no', () => {
  for (const l of ['Default - MacBook Pro Speakers (Built-in)', 'MacBook Air Speakers', 'Built-in Output', 'Speakers (Realtek(R) Audio)', 'Default - Speakers (Realtek High Definition Audio)']) assert.equal(speakersAreBuiltIn(l), true, l);
  for (const l of ['External Headphones', 'AirPods Pro', 'Headphones (Realtek(R) Audio)', 'Headset Earphone (Jabra)', 'Built-in Audio Analog Stereo', 'LG HDR 4K', '']) assert.equal(speakersAreBuiltIn(l), false, l);
  const app = read('src/renderer/src/puck/PuckApp.tsx');
  assert.match(app, /const twoTrack = st\.recording\?\.kind === 'meeting' && st\.recording\.tracks === 2;/);
  assert.match(app, /setOnSpeakers\(!!out && speakersAreBuiltIn\(out\.label\)\)/);
  assert.match(app, /md\.addEventListener\('devicechange', read\)/);
  assert.match(app, /\{compose\.kind === 'meeting' && onSpeakers && \(\s*<div className="puck-hint" role="note" data-speakers-hint>\{t\('pro\.puck\.card\.headphones'\)\}<\/div>/);
  for (const l of ['en', 'zh-CN', 'ar']) {
    const s = JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`)).pro.puck.card.headphones;
    assert.ok(s, l);
    assert.doesNotMatch(s, /[–—]| - /, l);
  }
});
