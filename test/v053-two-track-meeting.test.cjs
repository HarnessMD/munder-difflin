'use strict';
/**
 * 0.5.3, F16: TWO TRACK MEETINGS in main (src/main/puck.ts), driven with the
 * same Electron stub test/puck-main-wiring uses and a transcriber that
 * answers timed lines per file. Proven here: a helper's chunks are cut to
 * each microphone segment's seconds and written beside it; a renderer's
 * `them` clip lands whether it arrives before or after its microphone clip;
 * both tracks transcribe and the transcript is You: and Them: in time order
 * however the tracks finish; a meeting with no source, or with the switch
 * off, writes byte for byte the one track transcript it always did; the
 * sweep takes both files; Transcribe pending re-queues the other side too.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'puck-two-track-'));

const handlers = new Map();
const electronStub = {
  app: { whenReady: () => ({ then: () => Promise.resolve() }), on() {}, getPath: () => HOME },
  BrowserWindow: class { static getAllWindows() { return []; } },
  desktopCapturer: { getSources: async () => [] },
  ipcMain: { handle: (channel, fn) => { handlers.set(channel, fn); } },
  nativeImage: { createFromPath: () => ({ resize: () => ({ toDataURL: () => 'data:image/png;base64,' }) }) },
  screen: { on() {}, getPrimaryDisplay: () => ({ workArea: { x: 0, y: 0, width: 1440, height: 900 } }), getDisplayNearestPoint: () => ({ workArea: { x: 0, y: 0, width: 1440, height: 900 } }) },
  shell: { openExternal() {}, showItemInFolder() {}, trashItem: async (p) => { fs.rmSync(p, { recursive: true, force: true }); } },
  systemPreferences: { getMediaAccessStatus: () => 'granted' }
};
const cache = new Map();
function loadTs(filename) {
  const hit = cache.get(filename);
  if (hit) return hit.exports;
  const out = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }, fileName: filename });
  const mod = { exports: {} };
  cache.set(filename, mod);
  const req = (r) => {
    if (r === 'electron') return electronStub;
    if (r.startsWith('.')) {
      const base = path.resolve(path.dirname(filename), r);
      for (const c of [base, `${base}.ts`, path.join(base, 'index.ts')]) if (fs.existsSync(c) && fs.statSync(c).isFile()) return loadTs(c);
      return {};
    }
    return Module.createRequire(filename)(r);
  };
  new Function('module', 'exports', 'require', '__filename', '__dirname', out.outputText)(mod, mod.exports, req, filename, path.dirname(filename));
  return mod.exports;
}

/* The transcriber: timed lines per file name, so the merge has something to
   order, and a record of what it was asked. */
const asked = [];
const answers = {
  'seg-001.wav': { ok: true, text: 'Right, the release. And the web half is frozen.', segments: [{ t0: 0.4, t1: 2.1, text: 'Right, the release.' }, { t0: 9.0, t1: 12.5, text: 'And the web half is frozen.' }] },
  'seg-001-them.wav': { ok: true, text: 'Creed has the desktop half at c08. Top to bottom?', segments: [{ t0: 2.5, t1: 8.8, text: 'Creed has the desktop half at c08.' }, { t0: 14.2, t1: 16.0, text: 'Top to bottom?' }] },
  'seg-002.wav': { ok: true, text: 'Second segment, mine.' },
  'seg-002-them.wav': { ok: true, text: 'Second segment, theirs.' }
};
let config = { harnessHome: HOME, groqApiKey: 'gsk_test', puck: { enabled: true }, transcribe: { meetingSystemAudio: true } };
const deps = {
  readConfig: () => config,
  writeConfig: (patch) => { config = { ...config, ...patch }; return config; },
  onConfigWritten: () => () => {},
  hiveEnabled: () => true,
  hiveSend: (partial, from) => ({ id: 'm', from, ...partial }),
  transcribe: async (opts) => { asked.push({ file: opts.filename, timestamps: !!opts.timestamps, bytes: opts.audio.byteLength }); return answers[opts.filename] ?? { ok: true, text: `words of ${opts.filename}` }; },
  broadcast: () => {},
  openSettings: () => {},
  agentIds: () => [],
  agentName: (id) => id,
  preload: '/preload.js', rendererUrl: null, rendererDir: '/renderer'
};
const puck = loadTs(path.join(ROOT, 'src/main/puck.ts'));
puck.registerPuck(deps);
const { setSystemAudioSource, meetingSystemAudio } = puck;
const call = (channel, arg) => handlers.get(channel)({}, arg);
const meetingsDir = path.join(HOME, 'puck', 'meetings');
const settle = (ms = 60) => new Promise((r) => setTimeout(r, ms));
const wav = (samples) => { const b = Buffer.alloc(44 + samples * 2); b.write('RIFF', 0); b.write('WAVE', 8); return b; };
const readMeta = (id) => JSON.parse(fs.readFileSync(path.join(meetingsDir, id, 'meta.json'), 'utf8'));
const readTranscript = (id) => fs.readFileSync(path.join(meetingsDir, id, 'transcript.md'), 'utf8');
/** Wait until every track of every segment has an answer. */
async function drained(id, segs) {
  for (let i = 0; i < 100; i++) {
    const m = readMeta(id);
    if (m.segments.length >= segs && m.segments.every((s) => s.transcribed && (!s.them || s.them.transcribed || s.them.error))) return m;
    await settle(20);
  }
  throw new Error(`meeting ${id} never drained: ${JSON.stringify(readMeta(id).segments)}`);
}

test.after(() => { fs.rmSync(HOME, { recursive: true, force: true }); });

test('a helper source: the ring is cut to each microphone segment\'s seconds, written beside it, both tracks transcribed, the transcript is You and Them in time order', async () => {
  setSystemAudioSource('helper');
  const started = call('puck:meetingStart');
  assert.equal(started.ok, true);
  assert.equal(started.systemAudio, 'helper');
  const id = started.meetingId;
  assert.equal(readMeta(id).twoTrack, true);
  assert.equal(meetingSystemAudio.active(), true, 'the ring opened with the meeting');
  const t0 = Date.parse(readMeta(id).startedAt);
  // The helper's chunks: 100 ms each, a constant value per chunk so the cut
  // can be read back. Chunk k covers [k*100, k*100+100) ms from the start.
  for (let k = 0; k < 40; k++) {
    const pcm = new Int16Array(1600).fill(k + 1);
    meetingSystemAudio.push(pcm, t0 + k * 100);
  }
  // Two microphone segments: 0 to 2 s and 2 to 4 s.
  await call('puck:meetingSegment', { meetingId: id, seq: 0, audio: wav(32000), mimeType: 'audio/wav', startMs: 0, durationMs: 2000 });
  await call('puck:meetingSegment', { meetingId: id, seq: 1, audio: wav(32000), mimeType: 'audio/wav', startMs: 2000, durationMs: 2000 });
  const dir = path.join(meetingsDir, id);
  for (const f of ['seg-001.wav', 'seg-001-them.wav', 'seg-002.wav', 'seg-002-them.wav']) assert.ok(fs.existsSync(path.join(dir, f)), `${f} on disk`);
  const them1 = fs.readFileSync(path.join(dir, 'seg-001-them.wav'));
  assert.equal(them1.length, 44 + 32000 * 2, 'two seconds of 16 kHz int16 with a wav header');
  assert.equal(them1.readInt16LE(44), 1, 'the first sample is chunk 1');
  assert.equal(them1.readInt16LE(44 + 1600 * 2 * 7), 8, 'sample 11200 is chunk 8');
  const them2 = fs.readFileSync(path.join(dir, 'seg-002-them.wav'));
  assert.equal(them2.readInt16LE(44), 21, 'the second segment starts where the first ended');
  const meta = await drained(id, 2);
  assert.deepEqual(asked.filter((a) => a.timestamps).map((a) => a.file).sort(), ['seg-001-them.wav', 'seg-001.wav', 'seg-002-them.wav', 'seg-002.wav'], 'every track asked for its lines with times');
  assert.equal(meta.segments[0].them.transcribed, true);
  assert.deepEqual(meta.segments[0].lines.map((l) => l.text), ['Right, the release.', 'And the web half is frozen.']);
  const text = readTranscript(id);
  assert.equal(text, [
    `# ${meta.title}\n\nStarted ${meta.startedAt}\n\n`,
    '[00:00] You: Right, the release.\n\n',
    '[00:02] Them: Creed has the desktop half at c08.\n\n',
    '[00:09] You: And the web half is frozen.\n\n',
    '[00:14] Them: Top to bottom?\n\n',
    '[00:02] You: Second segment, mine.\n\n',
    '[00:02] Them: Second segment, theirs.\n\n'
  ].join(''));
  call('puck:meetingStop', { meetingId: id });
  await settle();
  assert.equal(meetingSystemAudio.active(), false, 'the ring closed with the meeting');
  assert.equal(readMeta(id).status, 'done');
});

test('a renderer source: the them clip lands before or after its microphone clip and is transcribed either way; a them clip for a one track meeting is refused', async () => {
  setSystemAudioSource('renderer');
  const started = call('puck:meetingStart');
  assert.equal(started.systemAudio, 'renderer');
  const id = started.meetingId;
  assert.equal(meetingSystemAudio.active(), false, 'no ring for a renderer source');
  // seq 0: them first, then you.
  await call('puck:meetingSegment', { meetingId: id, seq: 0, audio: wav(16000), mimeType: 'audio/wav', track: 'them' });
  assert.equal(readMeta(id).segments.length, 0, 'held until the microphone clip');
  await call('puck:meetingSegment', { meetingId: id, seq: 0, audio: wav(16000), mimeType: 'audio/wav', startMs: 0, durationMs: 1000 });
  // seq 1: you first, then them.
  await call('puck:meetingSegment', { meetingId: id, seq: 1, audio: wav(16000), mimeType: 'audio/wav', startMs: 1000, durationMs: 1000 });
  await call('puck:meetingSegment', { meetingId: id, seq: 1, audio: wav(16000), mimeType: 'audio/wav', track: 'them' });
  const meta = await drained(id, 2);
  assert.ok(meta.segments.every((s) => s.them && s.them.transcribed), JSON.stringify(meta.segments));
  const text = readTranscript(id);
  assert.match(text, /\[00:00\] You: Right, the release\./);
  assert.match(text, /\[00:02\] Them: Creed has the desktop half/);
  assert.match(text, /\[00:01\] You: Second segment, mine\.\n\n\[00:01\] Them: Second segment, theirs\./);
  call('puck:meetingStop', { meetingId: id });
  // The switch off: a source exists and the meeting is the microphone alone.
  config = { ...config, transcribe: { meetingSystemAudio: false } };
  const one = call('puck:meetingStart');
  assert.equal(one.systemAudio, null);
  assert.equal(readMeta(one.meetingId).twoTrack, undefined);
  const refused = await call('puck:meetingSegment', { meetingId: one.meetingId, seq: 0, audio: wav(16000), mimeType: 'audio/wav', track: 'them' });
  assert.deepEqual(refused, { ok: false, error: 'not a two track meeting' });
  call('puck:meetingStop', { meetingId: one.meetingId });
  config = { ...config, transcribe: { meetingSystemAudio: true } };
});

test('no source: the meeting is the microphone alone and the transcript is byte for byte the one track shape it always was', async () => {
  setSystemAudioSource(null);
  const started = call('puck:meetingStart');
  assert.equal(started.ok, true, JSON.stringify(started));
  assert.equal(started.systemAudio, null);
  const id = started.meetingId;
  await call('puck:meetingSegment', { meetingId: id, seq: 0, audio: wav(16000), mimeType: 'audio/wav', startMs: 0, durationMs: 1000 });
  await call('puck:meetingSegment', { meetingId: id, seq: 1, audio: wav(16000), mimeType: 'audio/wav', startMs: 61_000, durationMs: 1000 });
  const meta = await drained(id, 2);
  assert.equal(meta.twoTrack, undefined);
  assert.equal(meta.segments[0].them, undefined);
  assert.equal(meta.segments[0].lines, undefined, 'a one track meeting keeps no lines on the meta');
  assert.equal(asked.filter((a) => a.file === 'seg-001.wav').at(-1).timestamps, false, 'and asks for no times');
  assert.equal(readTranscript(id), `# ${meta.title}\n\nStarted ${meta.startedAt}\n\n[00:00] Right, the release. And the web half is frozen.\n\n[01:01] Second segment, mine.\n\n`);
  call('puck:meetingStop', { meetingId: id });
});

test('the other side failing keeps the microphone\'s words; Transcribe pending re-queues it; the sweep takes both files on the same clock', async () => {
  setSystemAudioSource('renderer');
  const st = call('puck:meetingStart');
  assert.equal(st.ok, true, JSON.stringify(st));
  const id = st.meetingId;
  answers['seg-001-them.wav'] = { ok: false, error: 'engine down' };
  await call('puck:meetingSegment', { meetingId: id, seq: 0, audio: wav(16000), mimeType: 'audio/wav', startMs: 0, durationMs: 1000 });
  await call('puck:meetingSegment', { meetingId: id, seq: 0, audio: wav(16000), mimeType: 'audio/wav', track: 'them' });
  let meta = await drained(id, 1);
  assert.equal(meta.segments[0].them.error, 'engine down');
  assert.match(readTranscript(id), /\[00:00\] You: Right, the release\./, 'yours still read');
  call('puck:meetingStop', { meetingId: id });
  await settle();
  assert.equal(readMeta(id).status, 'failed');
  // Transcribe pending: only the failed track goes back in the queue.
  answers['seg-001-them.wav'] = { ok: true, text: 'Back.', segments: [{ t0: 0.5, t1: 1, text: 'Back.' }] };
  const before = asked.length;
  const q = call('puck:meetingTranscribe', { id });
  assert.equal(q.queued, 1);
  meta = await drained(id, 1);
  assert.equal(asked.length - before, 1);
  assert.equal(meta.segments[0].them.transcribed, true);
  assert.match(readTranscript(id), /\[00:00\] Them: Back\./);
  for (let i = 0; i < 50 && readMeta(id).status !== 'done'; i++) await settle(20);
  assert.equal(readMeta(id).status, 'done');
  // The sweep, a day later: both files go, both stamps are written.
  const dir = path.join(meetingsDir, id);
  const stale = readMeta(id);
  stale.segments[0].transcribedAt = '2026-09-20T00:00:00.000Z';
  stale.segments[0].them.transcribedAt = '2026-09-20T00:00:00.000Z';
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(stale));
  call('puck:meetings', {});
  const swept = readMeta(id);
  assert.equal(fs.existsSync(path.join(dir, 'seg-001.wav')), false);
  assert.equal(fs.existsSync(path.join(dir, 'seg-001-them.wav')), false);
  assert.ok(swept.segments[0].audioDeletedAt && swept.segments[0].them.audioDeletedAt, 'both stamped');
  assert.match(readTranscript(id), /Them: Back\./, 'the words outlive the audio');
});

test('the router hands the lines through only when asked, and Groq is asked for verbose_json only then', () => {
  const router = fs.readFileSync(path.join(ROOT, 'src/main/transcribe/router.ts'), 'utf8');
  assert.match(router, /return call\.timestamps && segments\?\.length \? \{ ok: true, text, segments \} : \{ ok: true, text \};/);
  const groq = fs.readFileSync(path.join(ROOT, 'src/main/freeflow.ts'), 'utf8');
  assert.match(groq, /form\.append\('response_format', opts\.timestamps \? 'verbose_json' : 'json'\);/);
  const rec = fs.readFileSync(path.join(ROOT, 'src/renderer/src/puck/recorder.ts'), 'utf8');
  assert.match(rec, /if \(themDone\) \{ await themDone; themDone = null; \}/, 'the other side\'s clip lands before the microphone\'s, for the same seq');
  assert.match(rec, /themStream = m\.kind === 'meeting' && opts\.them/, 'a spoken message never has a second track');
  const app = fs.readFileSync(path.join(ROOT, 'src/renderer/src/puck/PuckApp.tsx'), 'utf8');
  assert.match(app, /const them = systemAudio === 'renderer' \? await openSystemStream\(\) : null;/);
  assert.match(app, /if \(final && track === 'you'\) await window\.cth\.puckMeetingStop/);
});
