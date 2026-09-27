'use strict';

/**
 * THE STAPLER'S MAIN SIDE, EXECUTED (0.5.2).
 *
 * `test/puck.test.cjs` reads this file as text. Text is how three controls
 * shipped dead in this release, so the Stapler's own rules are run here: the
 * real `src/main/puck.ts` is loaded with Electron stubbed and real
 * dependencies pointed at a temporary harness home, its IPC handlers are
 * captured and CALLED, and the assertions are made against the files that
 * actually land on disk.
 *
 * What it proves today:
 *   1. a meeting is refused outright when no transcription key is on file,
 *      and nothing is written (founder, 9 Sep 2026);
 *   2. with a key the meeting records, the segment lands, the transcript is
 *      appended and the meeting settles;
 *   3. a screenshot's path reaches the orchestrator through the hive.
 *
 * Everything here runs in a temp directory that is removed afterwards. No
 * Electron, no window, no network.
 *
 * HOW A SCHEDULED PATH IS RUN WITHOUT ELECTRON AND WITHOUT WAITING (test 22,
 * reusable anywhere main schedules work): the stub's `app.whenReady` returns a
 * THENABLE that pushes the callback into `readyCbs` instead of resolving, so
 * the start-up path is held rather than fired, and the test swaps
 * `globalThis.setInterval` for a recorder for the length of that call. The
 * test then calls the start-up callback and the exact function that was
 * scheduled, and asserts what they did to the files. That is the difference
 * between "it runs when you open the screen", which the handlers prove, and
 * "it runs on a machine nobody opens", which is the founder's actual ask.
 *
 * WHAT THESE TESTS DO NOT PROVE, and no amount of them will:
 *   - the 24 hours is never elapsed. Every clock here is a backdated stamp or
 *     a `now` passed in, so the arithmetic and the file operation are proven
 *     and a machine actually left running for a day is not;
 *   - the audio is four fake bytes through a stubbed transcriber, so the
 *     retention rule is proven and the RECORDER is not.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'puck-wiring-'));

/* ---- the Electron surface this module touches, and nothing more ---------- */
const handlers = new Map();
const trashed = [];
/* Everything registered with `app.whenReady().then(...)`. Held rather than
   resolved so a test can RUN the start-up path deliberately: that path is the
   founder's actual ask (deletion on a machine nobody is looking at) and until
   now it was only ever read as text. */
const readyCbs = [];
const electronStub = {
  app: { whenReady: () => ({ then: (cb) => { readyCbs.push(cb); return Promise.resolve(); } }), on() {}, getPath: () => HOME },
  BrowserWindow: class { static getAllWindows() { return []; } },
  desktopCapturer: { getSources: async () => [] },
  ipcMain: { handle: (channel, fn) => { handlers.set(channel, fn); } },
  nativeImage: { createFromPath: () => ({ resize: () => ({ toDataURL: () => 'data:image/png;base64,' }) }) },
  screen: { on() {}, getPrimaryDisplay: () => ({ workArea: { x: 0, y: 0, width: 1440, height: 900 } }), getDisplayNearestPoint: () => ({ workArea: { x: 0, y: 0, width: 1440, height: 900 } }) },
  shell: { openExternal() {}, showItemInFolder() {}, trashItem: async (p) => { trashed.push(p); fs.rmSync(p, { recursive: true, force: true }); } },
  systemPreferences: { getMediaAccessStatus: () => 'granted' }
};

/* ---- a loader for the real module, with that stub in front of 'electron' -- */
const cache = new Map();
function loadTs(filename) {
  const hit = cache.get(filename);
  if (hit) return hit.exports;
  const out = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename
  });
  const mod = { exports: {} };
  cache.set(filename, mod);
  const req = (r) => {
    if (r === 'electron') return electronStub;
    if (r.startsWith('.')) {
      const base = path.resolve(path.dirname(filename), r);
      for (const c of [base, `${base}.ts`, path.join(base, 'index.ts')]) {
        if (fs.existsSync(c) && fs.statSync(c).isFile()) return loadTs(c);
      }
      // A type-only import with no runtime file (config, hive, freeflow types).
      return {};
    }
    return Module.createRequire(filename)(r);
  };
  new Function('module', 'exports', 'require', '__filename', '__dirname', out.outputText)(mod, mod.exports, req, filename, path.dirname(filename));
  return mod.exports;
}

/* ---- real dependencies, pointed at the temp home ------------------------- */
let config = { harnessHome: HOME, groqApiKey: '', puck: { enabled: true } };
const sent = [];
let live = [];   // the agents main would say are running, at send time
const transcriptions = [];
let transcribeAnswer = { ok: true, text: 'the words that were said' };
const deps = {
  readConfig: () => config,
  writeConfig: (patch) => { config = { ...config, ...patch }; return config; },
  onConfigWritten: () => () => {},
  hiveEnabled: () => true,
  hiveSend: (partial, from) => { const msg = { id: `m-${sent.length + 1}`, from, ...partial }; sent.push(msg); return msg; },
  transcribe: async (opts) => { transcriptions.push(opts.filename); return transcribeAnswer; },
  broadcast: () => {},
  openSettings: () => {},
  agentIds: () => live,
  preload: '/preload.js',
  rendererUrl: null,
  rendererDir: '/renderer'
};

const { registerPuck } = loadTs(path.join(ROOT, 'src/main/puck.ts'));
registerPuck(deps);
const call = (channel, arg) => handlers.get(channel)({}, arg);
const meetingsDir = path.join(HOME, 'puck', 'meetings');
const shotsDir = path.join(HOME, 'puck', 'screenshots');

test.after(() => { fs.rmSync(HOME, { recursive: true, force: true }); });

test('1. every handler the Stapler screen and the puck call is registered', () => {
  for (const c of ['puck:meetingStart', 'puck:meetingSegment', 'puck:meetingStop', 'puck:meetings', 'puck:send', 'puck:screenshots', 'puck:screenshotDelete', 'puck:meetingDelete']) {
    assert.equal(typeof handlers.get(c), 'function', `${c} is not registered`);
  }
});

test('2. NO KEY, NO MEETING: the start is refused and nothing is written', async () => {
  config = { ...config, groqApiKey: '' };
  const before = fs.existsSync(meetingsDir) ? fs.readdirSync(meetingsDir) : [];
  const r = await call('puck:meetingStart');
  assert.equal(r.ok, false, 'a keyless meeting must be refused');
  // 0.5.3, F16: no engine at all (no local engine, no Groq key) is `no
  // transcription engine`, mapped to the noEngine flash that opens Dictation & Meetings.
  assert.equal(r.error, 'no transcription engine', 'the error the renderer maps to the noEngine flash');
  const after = fs.existsSync(meetingsDir) ? fs.readdirSync(meetingsDir) : [];
  assert.deepEqual(after, before, 'no meeting folder, no meta.json, no transcript: nothing was recorded');
  const state = await call('puck:state');
  assert.equal(state.recording, null, 'and the puck is not left thinking it is recording');
});

test('3. the refusal is the one the puck already knows how to explain', () => {
  const { puckProblem } = loadTs(path.join(ROOT, 'src/shared/puck.ts'));
  assert.equal(puckProblem('no transcription key'), 'noKey', 'the flash offers the door to Voice settings');
  assert.equal(puckProblem('no transcription engine'), 'noEngine', '0.5.3: no engine at all opens Dictation & Meetings');
  // The puck's own wiring: that reason draws the flash whose action opens Voice settings.
  const app = fs.readFileSync(path.join(ROOT, 'src/renderer/src/puck/PuckApp.tsx'), 'utf8');
  assert.match(app, /case 'noKey': return \{ text: t\('pro\.puck\.flash\.noKey'\), bad: true, action: openVoice \}/);
  assert.match(app, /case 'noEngine': return \{ text: t\('pro\.puck\.flash\.noEngine'\), bad: true, action: openDictation \}/);
  assert.match(app, /puckOpenSettings\('Dictation & Meetings'\)/, 'the noEngine door is the Dictation & Meetings section');
  assert.match(app, /const r = await window\.cth\.puckMeetingStart\(\);\s*\n\s*if \(!r\.ok\) \{ setBusy\(null\); showFlash\(problem\(r\.error\)\); return; \}/, 'a refused start is shown, not swallowed');
  assert.match(app, /\(slot\.action === 'message' \|\| slot\.action === 'meeting'\) && !st\.canTranscribe && !st\.recording/, 'and the button is disabled before it is pressed');
});

test('4. with a key: the meeting records, the segment lands, the transcript is written', async () => {
  config = { ...config, groqApiKey: 'gsk-test' };
  const r = await call('puck:meetingStart');
  assert.equal(r.ok, true, r.error);
  const id = r.meetingId;
  const dir = path.join(meetingsDir, id);
  assert.ok(fs.existsSync(path.join(dir, 'meta.json')), 'the meeting folder exists once a key is on file');

  const seg = await call('puck:meetingSegment', { meetingId: id, seq: 0, audio: new Uint8Array([1, 2, 3, 4]), mimeType: 'audio/webm', startMs: 0, durationMs: 1000 });
  assert.equal(seg.ok, true, seg.error);
  await call('puck:meetingStop', { meetingId: id });
  // The transcribe queue is a promise chain; let it drain.
  await new Promise((r2) => setImmediate(r2));
  await new Promise((r2) => setImmediate(r2));

  assert.equal(transcriptions.length, 1, 'the segment was sent to the transcriber exactly once');
  const transcript = fs.readFileSync(path.join(dir, 'transcript.md'), 'utf8');
  assert.match(transcript, /the words that were said/, 'the transcript carries what came back');
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
  assert.equal(meta.segments.length, 1);
  assert.equal(meta.segments[0].transcribed, true, 'the segment is marked done');
  const list = await call('puck:meetings');
  assert.equal(list.length, 1, 'and the screen would list it');
});

test('5. a screenshot reaches the orchestrator, by path, through the hive', async () => {
  fs.mkdirSync(shotsDir, { recursive: true });
  const shot = path.join(shotsDir, '2026-09-09_00-00-00.png');
  fs.writeFileSync(shot, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  fs.writeFileSync(shot.replace(/\.png$/, '.json'), JSON.stringify({ takenAt: new Date().toISOString(), width: 10, height: 10, note: null, sentAt: null }));
  const before = sent.length;
  const r = await call('puck:send', { note: 'look at this', screenshot: shot });
  assert.equal(r.ok, true, r.error);
  assert.equal(sent.length, before + 1, 'one hive message');
  const msg = sent[sent.length - 1];
  assert.equal(msg.to, 'god', 'today every capture goes to the orchestrator');
  assert.match(msg.body, /look at this/);
  assert.ok(msg.body.includes(shot), 'the message carries the absolute path of the image');
  const side = JSON.parse(fs.readFileSync(shot.replace(/\.png$/, '.json'), 'utf8'));
  assert.ok(side.sentAt, 'and the sidecar records that it was sent');
});

test('6. a path outside the puck folder is refused', async () => {
  const r = await call('puck:send', { note: '', screenshot: path.join(HOME, 'not-a-capture.png') });
  assert.equal(r.ok, false, 'only files we minted under the puck folder may be sent');
});

test('6b. several screenshots go in ONE message, in order, each path checked (I6)', async () => {
  fs.mkdirSync(shotsDir, { recursive: true });
  const shots = ['2026-09-23_00-00-01', '2026-09-23_00-00-02', '2026-09-23_00-00-03'].map((stamp) => {
    const p = path.join(shotsDir, `${stamp}.png`);
    fs.writeFileSync(p, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    fs.writeFileSync(p.replace(/\.png$/, '.json'), JSON.stringify({ takenAt: new Date().toISOString(), width: 10, height: 10, note: null, sentAt: null }));
    return p;
  });
  const outside = path.join(HOME, 'not-a-capture.png');
  const before = sent.length;
  const r = await call('puck:send', { note: 'three views', screenshots: [...shots, shots[0], outside] });
  assert.equal(r.ok, true, r.error);
  assert.equal(sent.length, before + 1, 'one hive message for all of them');
  const body = sent[sent.length - 1].body;
  shots.forEach((p, i) => assert.ok(body.includes(`Screenshot ${i + 1} of 3: ${p}`), `shot ${i + 1} named in order`));
  assert.ok(!body.includes(outside), 'a path outside the puck folder is dropped');
  assert.match(body, /The images are deleted automatically 24 hours after they were taken/);
  for (const p of shots) assert.ok(JSON.parse(fs.readFileSync(p.replace(/\.png$/, '.json'), 'utf8')).sentAt, 'every sidecar records the send');
  const none = await call('puck:send', { note: '', screenshots: [outside] });
  assert.equal(none.ok, false, 'nothing valid, nothing sent');
});

/* ---- the filter and the rename, over real files -------------------------- */

/** A finished meeting on disk, the shape main writes. `id` carries the clock,
 *  so the ids also fix the newest-first order. */
function seedMeeting(id, startedAt, title, transcript) {
  const dir = path.join(meetingsDir, id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({
    id, title, startedAt, endedAt: startedAt, status: 'done',
    segments: [{ seq: 0, file: 'seg-001.webm', startMs: 0, durationMs: 60000, transcribed: true, error: null }]
  }, null, 2));
  fs.writeFileSync(path.join(dir, 'transcript.md'), `# ${title}\n\nStarted ${startedAt}\n\n[00:00:01] ${transcript}\n\n`);
  return dir;
}
/** The local calendar day of an ISO stamp, the way main reads it. */
const day = (iso) => new Date(iso).toLocaleDateString('en-CA');

test('7. the filter matches on the NAME, on the transcript, and between two days', async () => {
  const a = '2026-09-01T10:00:00.000Z';
  const b = '2026-09-05T10:00:00.000Z';
  const c = '2026-09-09T10:00:00.000Z';
  seedMeeting('2026-09-01_10-00-00', a, 'Budget call', 'we agreed the hosting line comes down');
  seedMeeting('2026-09-05_10-00-00', b, 'Design review', 'the sidebar needs more room for a name');
  seedMeeting('2026-09-09_10-00-00', c, 'Standup', 'nothing to report on the relay today');

  const all = await call('puck:meetings', {});
  assert.ok(all.length >= 3, 'with no filter every meeting is listed');

  const byName = await call('puck:meetings', { q: 'budget' });
  assert.deepEqual(byName.map((m) => m.title), ['Budget call'], 'the name matches, case-insensitively');
  assert.equal(byName[0].hit, null, 'a name match needs no line from the transcript');

  const byWord = await call('puck:meetings', { q: 'sidebar' });
  assert.deepEqual(byWord.map((m) => m.title), ['Design review'], 'a word only the transcript carries still finds the meeting');
  assert.match(byWord[0].hit, /the sidebar needs more room/, 'and the line that carried it comes back to be shown');

  const range = await call('puck:meetings', { from: day(a), to: day(b) });
  const titles = range.map((m) => m.title);
  assert.ok(titles.includes('Budget call') && titles.includes('Design review'), 'both ends of the range are inclusive');
  assert.ok(!titles.includes('Standup'), 'and a meeting past the end is out');

  // Both at once. The meeting test 4 recorded also lands on today, so the word
  // has to be one only this transcript carries; that is the point of the pair.
  const both = await call('puck:meetings', { q: 'relay', from: day(c), to: day(c) });
  assert.deepEqual(both.map((m) => m.title), ['Standup'], 'the words and the days narrow together, not separately');
  const wrongDay = await call('puck:meetings', { q: 'relay', from: day(a), to: day(b) });
  assert.deepEqual(wrongDay, [], 'the same words outside the range find nothing');

  const none = await call('puck:meetings', { q: 'a word nobody said' });
  assert.deepEqual(none, [], 'no match is an empty list, not everything');
});

test('8. renaming writes the meta AND the transcript heading, and the new name is findable', async () => {
  const id = '2026-09-01_10-00-00';
  const r = await call('puck:meetingRename', { id, title: 'Quarterly budget call' });
  assert.equal(r.ok, true, r.error);
  const meta = JSON.parse(fs.readFileSync(path.join(meetingsDir, id, 'meta.json'), 'utf8'));
  assert.equal(meta.title, 'Quarterly budget call');
  const transcript = fs.readFileSync(path.join(meetingsDir, id, 'transcript.md'), 'utf8');
  assert.match(transcript, /^# Quarterly budget call$/m, 'the file a person opens carries the new name too');
  assert.doesNotMatch(transcript, /^# Budget call$/m);
  const found = await call('puck:meetings', { q: 'quarterly' });
  assert.deepEqual(found.map((m) => m.id), [id], 'and the name filter finds it by the new name');
  const empty = await call('puck:meetingRename', { id, title: '   ' });
  assert.equal(empty.ok, false, 'a meeting cannot be renamed to nothing');
  const unknown = await call('puck:meetingRename', { id: '1999-01-01_00-00-00', title: 'x' });
  assert.equal(unknown.ok, false, 'and an unknown meeting is refused');
});

/* ---- who a capture reaches ---------------------------------------------- */

test('9. a capture goes to the orchestrator until an agent is chosen, and to that agent after', async () => {
  const shot = path.join(shotsDir, '2026-09-09_01-00-00.png');
  fs.writeFileSync(shot, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  fs.writeFileSync(shot.replace(/\.png$/, '.json'), JSON.stringify({ takenAt: new Date().toISOString(), width: 4, height: 4, note: null, sentAt: null }));
  live = ['dwight', 'pam'];

  // Unset: the orchestrator, exactly as before this release.
  config = { ...config, puck: { ...config.puck, sendTo: '' } };
  await call('puck:send', { note: 'one', screenshot: shot });
  assert.equal(sent[sent.length - 1].to, 'god');

  // Chosen and running: that agent.
  config = { ...config, puck: { ...config.puck, sendTo: 'dwight' } };
  await call('puck:send', { note: 'two', screenshot: shot });
  assert.equal(sent[sent.length - 1].to, 'dwight', 'the capture reaches the chosen agent');

  // Chosen but NOT running: the orchestrator, never a hole.
  live = ['pam'];
  await call('puck:send', { note: 'three', screenshot: shot });
  assert.equal(sent[sent.length - 1].to, 'god', 'an agent that is not running does not swallow the capture');

  // An id nobody has ever had behaves the same way.
  config = { ...config, puck: { ...config.puck, sendTo: 'nobody-at-all' } };
  await call('puck:send', { note: 'four', screenshot: shot });
  assert.equal(sent[sent.length - 1].to, 'god');
});

test('10. the routing rule is the one the Slack responder already uses', () => {
  const main = fs.readFileSync(path.join(ROOT, 'src/main/puck.ts'), 'utf8');
  assert.match(main, /import \{ resolveResponder \} from '\.\.\/shared\/responder'/, 'one rule, not a second copy of it');
  assert.match(main, /return resolveResponder\(cfgOf\(\)\.sendTo, ids, 'god'\)/);
  assert.doesNotMatch(main, /hiveSend\(\{ to: 'god'/, 'nothing addresses the orchestrator by hand any more');
  const index = fs.readFileSync(path.join(ROOT, 'src/main/index.ts'), 'utf8');
  assert.match(index, /agentIds: \(\) => \{[\s\S]{0,400}!a\.archived && !!ptyForAgent\(id\)/, 'the list main offers is agents with a live terminal');
});

/* ---- the 24 hour rule, and the orphan it must not leave ------------------ */

const { PUCK_SHOT_TTL_MS } = loadTs(path.join(ROOT, 'src/shared/puck.ts'));

/** A capture on disk, taken `ageMs` ago, sent or not. */
function seedShot(stamp, ageMs, sentAt = null) {
  fs.mkdirSync(shotsDir, { recursive: true });
  const png = path.join(shotsDir, `${stamp}.png`);
  fs.writeFileSync(png, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  fs.writeFileSync(png.replace(/\.png$/, '.json'), JSON.stringify({
    takenAt: new Date(Date.now() - ageMs).toISOString(), region: { x: 0, y: 0, width: 4, height: 4 },
    displayId: '1', width: 4, height: 4, note: null, sentAt
  }, null, 2));
  return png;
}

test('11. an UNSENT capture older than a day is removed whole; a fresh one is untouched', async () => {
  const old = seedShot('2026-09-01_09-00-00', PUCK_SHOT_TTL_MS + 60_000);
  const fresh = seedShot('2026-09-09_09-00-00', 60_000);
  const list = await call('puck:screenshots');   // the list sweeps first
  assert.equal(fs.existsSync(old), false, 'the image is gone');
  assert.equal(fs.existsSync(old.replace(/\.png$/, '.json')), false, 'and so is its record: nothing referred to it');
  assert.equal(fs.existsSync(fresh), true, 'a capture inside the day is left alone');
  assert.ok(list.some((s) => s.path === fresh), 'and it is still listed');
  assert.ok(!list.some((s) => s.path === old), 'the deleted one is not');
});

test('12. a SENT capture older than a day loses its image and KEEPS its record', async () => {
  const sentAt = new Date(Date.now() - PUCK_SHOT_TTL_MS).toISOString();
  const shot = seedShot('2026-09-01_08-00-00', PUCK_SHOT_TTL_MS + 60_000, sentAt);
  const list = await call('puck:screenshots');
  assert.equal(fs.existsSync(shot), false, 'the image is deleted on the same clock as any other');
  const side = JSON.parse(fs.readFileSync(shot.replace(/\.png$/, '.json'), 'utf8'));
  assert.ok(side.deletedAt, 'the sidecar stays, stamped with when the image went');
  assert.equal(side.sentAt, sentAt, 'and still says it was sent');
  const row = list.find((s) => s.path === shot);
  assert.ok(row, 'the row is still on the screen rather than vanishing');
  assert.ok(row.deletedAt, 'marked as deleted');
  assert.equal(row.thumb, '', 'with no picture to draw');
});

test('13. the message that named a capture says when the image goes, at the moment it is written', async () => {
  const shot = seedShot('2026-09-09_09-30-00', 0);
  const before = sent.length;
  const r = await call('puck:send', { note: 'the sidebar', screenshot: shot });
  assert.equal(r.ok, true, r.error);
  assert.equal(sent.length, before + 1);
  const body = sent[sent.length - 1].body;
  assert.ok(body.includes(shot), 'the path is still there for an agent reading it now');
  assert.match(body, /deleted automatically 24 hours after it was taken/, 'and the expiry is IN the message, which outlives the file');
  assert.match(body, /\d{4}-\d{2}-\d{2}T/, 'with the actual instant, not a vague "soon"');
});

test('14. a tombstone can be dismissed, and no meeting is removed by any sweep', async () => {
  const shot = path.join(shotsDir, '2026-09-01_08-00-00.png');
  const gone = await call('puck:screenshotDelete', shot);
  assert.equal(gone.ok, true, 'the row a person dismisses is removable even with no image left');
  assert.equal(fs.existsSync(shot.replace(/\.png$/, '.json')), false, 'and the record goes with it');
  // The audio sweep takes audio FILES and nothing else: a meeting is never
  // removed, and neither is its transcript. Tests 16 to 20 hold that rule.
  assert.ok(fs.existsSync(meetingsDir), 'the meetings folder survives every sweep');
  assert.ok(fs.readdirSync(meetingsDir).length > 0, 'and so does every meeting in it');
});

test('15. the sweep unlinks, while a person’s own delete stays recoverable', () => {
  // WHEN it runs is no longer read here: test 22 executes the start-up callback
  // and the scheduled function and asserts what they removed. What is left in
  // this test is the one thing text is the right instrument for, the difference
  // between the two ways a file can go.
  const main = fs.readFileSync(path.join(ROOT, 'src/main/puck.ts'), 'utf8');
  assert.match(main, /rmSync\(png, \{ force: true \}\)/, 'the sweep unlinks: the Trash is still the disk');
  assert.match(main, /rmSync\(file, \{ force: true \}\)/, 'audio the same way');
  assert.match(main, /await shell\.trashItem\(abs\)/, 'while a person’s own delete stays recoverable');
});

/* ---- the audio, and the day it gets (founder, 9 Sep 2026) ---------------- */

const { PUCK_AUDIO_TTL_MS, PUCK_SWEEP_EVERY_MS } = loadTs(path.join(ROOT, 'src/shared/puck.ts'));

/** A finished meeting with one audio file on disk, in whatever state the test
 *  needs: `transcribedAt` null means it is still pending, and omitting it
 *  entirely is what a build before 0.5.2 wrote. */
function seedAudio(id, { transcribed, transcribedAt, mtimeAgeMs = 0, stampMissing = false }) {
  const dir = path.join(meetingsDir, id);
  fs.mkdirSync(dir, { recursive: true });
  const file = 'seg-001.webm';
  const audio = path.join(dir, file);
  fs.writeFileSync(audio, Buffer.from([1, 2, 3, 4]));
  if (mtimeAgeMs) {
    const when = new Date(Date.now() - mtimeAgeMs);
    fs.utimesSync(audio, when, when);
  }
  const seg = { seq: 0, file, startMs: 0, durationMs: 60000, transcribed, error: null, audioDeletedAt: null };
  if (!stampMissing) seg.transcribedAt = transcribedAt ?? null;
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({
    id, title: `Audio ${id}`, startedAt: '2026-09-01T10:00:00.000Z', endedAt: '2026-09-01T10:01:00.000Z',
    status: transcribed ? 'done' : 'pending', segments: [seg]
  }, null, 2));
  fs.writeFileSync(path.join(dir, 'transcript.md'), `# Audio ${id}\n\n[00:00] words that must survive the audio\n`);
  return { dir, audio };
}
const ago = (ms) => new Date(Date.now() - ms).toISOString();

test('16. transcribing stamps WHEN the words came back, which is what the clock reads', async () => {
  config = { ...config, groqApiKey: 'gsk-test' };
  const r = await call('puck:meetingStart');
  const id = r.meetingId;
  await call('puck:meetingSegment', { meetingId: id, seq: 0, audio: new Uint8Array([9, 9]), mimeType: 'audio/webm', startMs: 0, durationMs: 1000 });
  await call('puck:meetingStop', { meetingId: id });
  await new Promise((r2) => setImmediate(r2));
  await new Promise((r2) => setImmediate(r2));
  const meta = JSON.parse(fs.readFileSync(path.join(meetingsDir, id, 'meta.json'), 'utf8'));
  assert.equal(meta.segments[0].transcribed, true);
  assert.ok(meta.segments[0].transcribedAt, 'the stamp is written, not left for the sweep to guess');
  assert.ok(Date.now() - Date.parse(meta.segments[0].transcribedAt) < 60_000, 'and it is the moment it happened');
  assert.equal(meta.segments[0].audioDeletedAt, null, 'the audio is not touched on the way through');
  assert.ok(fs.existsSync(path.join(meetingsDir, id, meta.segments[0].file)), 'the file is still on disk for its day');
});

test('17. audio transcribed more than a day ago is deleted; the transcript and the meta stay', async () => {
  const { dir, audio } = seedAudio('2026-09-02_10-00-00', { transcribed: true, transcribedAt: ago(PUCK_AUDIO_TTL_MS + 60_000) });
  const list = await call('puck:meetings', {});   // the list sweeps first
  assert.equal(fs.existsSync(audio), false, 'the recording is gone');
  assert.ok(fs.existsSync(path.join(dir, 'transcript.md')), 'the transcript is NOT');
  assert.match(fs.readFileSync(path.join(dir, 'transcript.md'), 'utf8'), /words that must survive the audio/);
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
  assert.ok(meta.segments[0].audioDeletedAt, 'the segment records when its audio went');
  assert.equal(meta.segments[0].transcribed, true, 'and still says it was transcribed');
  const row = list.find((m) => m.id === '2026-09-02_10-00-00');
  assert.ok(row, 'the meeting is still listed: only the audio was on a clock');
  assert.ok(row.segments[0].audioDeletedAt, 'and the screen is told, so it can say so');
});

test('18. audio transcribed inside the day is left alone', async () => {
  const { audio } = seedAudio('2026-09-03_10-00-00', { transcribed: true, transcribedAt: ago(PUCK_AUDIO_TTL_MS - 60 * 60_000) });
  await call('puck:meetings', {});
  assert.equal(fs.existsSync(audio), true, 'an hour short of the day is still inside the day');
});

test('19. audio waiting for a key is NEVER swept, however old it is', async () => {
  const { audio, dir } = seedAudio('2026-09-04_10-00-00', { transcribed: false, transcribedAt: null, mtimeAgeMs: 30 * 24 * 60 * 60_000 });
  await call('puck:meetings', {});
  assert.equal(fs.existsSync(audio), true, 'a month-old pending recording keeps its audio: the clock starts at transcription');
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
  assert.equal(meta.segments[0].audioDeletedAt, null);
  // And the promise that makes that the right rule still holds: a key arrives,
  // the old recording transcribes.
  config = { ...config, groqApiKey: 'gsk-test' };
  const before = transcriptions.length;
  const q = await call('puck:meetingTranscribe', { id: '2026-09-04_10-00-00' });
  assert.equal(q.ok, true, q.error);
  await new Promise((r2) => setImmediate(r2));
  await new Promise((r2) => setImmediate(r2));
  assert.equal(transcriptions.length, before + 1, 'the audio that was kept is the audio that gets transcribed');
});

test('20. a segment transcribed by an older build falls back to the file mtime, not a fresh day', async () => {
  const old = seedAudio('2026-09-05_10-00-00', { transcribed: true, stampMissing: true, mtimeAgeMs: PUCK_AUDIO_TTL_MS + 60 * 60_000 });
  const recent = seedAudio('2026-09-06_10-00-00', { transcribed: true, stampMissing: true, mtimeAgeMs: 60 * 60_000 });
  const meta0 = JSON.parse(fs.readFileSync(path.join(old.dir, 'meta.json'), 'utf8'));
  assert.equal(meta0.segments[0].transcribedAt, undefined, 'the shape a build before 0.5.2 wrote: no stamp at all');
  await call('puck:meetings', {});
  assert.equal(fs.existsSync(old.audio), false, 'week-old audio is not given a fresh day by the upgrade');
  assert.equal(fs.existsSync(recent.audio), true, 'and audio recorded an hour ago still has its day');
});

test('21. the sweep is idempotent and never re-stamps what it already took', async () => {
  const dir = path.join(meetingsDir, '2026-09-02_10-00-00');
  const first = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8')).segments[0].audioDeletedAt;
  await call('puck:meetings', {});
  await call('puck:screenshots');
  const second = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8')).segments[0].audioDeletedAt;
  assert.equal(second, first, 'a second sweep leaves the stamp it wrote the first time');
  assert.ok(fs.existsSync(path.join(dir, 'transcript.md')), 'and still never touches the transcript');
});

test('22. the scheduled sweep is RUN, not read: start-up and the hourly timer both take audio and images', async () => {
  assert.ok(readyCbs.length > 0, 'registerPuck registered nothing with app.whenReady');

  // A machine that has been asleep: an old capture and an old recording, and
  // nobody opens the Stapler screen, so no list handler sweeps on the way past.
  const shot1 = seedShot('2026-08-01_00-00-00', PUCK_SHOT_TTL_MS + 60_000);
  const audio1 = seedAudio('2026-08-01_00-00-00', { transcribed: true, transcribedAt: ago(PUCK_AUDIO_TTL_MS + 60_000) });

  // Catch what start-up schedules instead of letting a real timer exist.
  const timers = [];
  let unrefs = 0;
  const realSetInterval = globalThis.setInterval;
  globalThis.setInterval = (fn, ms) => { timers.push({ fn, ms }); return { unref: () => { unrefs += 1; } }; };
  try { for (const cb of readyCbs) await cb(); } finally { globalThis.setInterval = realSetInterval; }

  assert.equal(fs.existsSync(shot1), false, 'start-up took the image with no screen open');
  assert.equal(fs.existsSync(audio1.audio), false, 'and the audio, which is the rule the founder actually asked for');
  assert.ok(fs.existsSync(path.join(audio1.dir, 'transcript.md')), 'and still not the transcript');

  const timer = timers.find((t) => t.ms === PUCK_SWEEP_EVERY_MS);
  assert.ok(timer, `nothing was scheduled at ${PUCK_SWEEP_EVERY_MS} ms`);
  assert.equal(unrefs, 1, 'the sweep timer is unref: it never holds the app open');

  // The hourly run, executed: the same machine, still nobody looking, an hour later.
  const shot2 = seedShot('2026-08-02_00-00-00', PUCK_SHOT_TTL_MS + 60_000);
  const audio2 = seedAudio('2026-08-02_00-00-00', { transcribed: true, transcribedAt: ago(PUCK_AUDIO_TTL_MS + 60_000) });
  timer.fn();
  assert.equal(fs.existsSync(shot2), false, 'the hourly run takes images too');
  assert.equal(fs.existsSync(audio2.audio), false, 'and audio: both rules are on the one timer');
  const meta = JSON.parse(fs.readFileSync(path.join(audio2.dir, 'meta.json'), 'utf8'));
  assert.ok(meta.segments[0].audioDeletedAt, 'stamped by the timer run, not by a person opening a tab');
});
