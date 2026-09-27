'use strict';

/**
 * THE STAPLER SCREEN: ONE SAVE, AND MEETINGS YOU CAN EDIT AND SEND (0.5.3,
 * founder batch 2 #8 and #12, 25 Sep 2026).
 *
 *   #8  "The meeting notes ... should be editable and scrollable ... a section
 *       at the top after meeting title and ID 'Add a description or a prompt
 *       you want to keep along with the meeting' ... select available agents
 *       to send the meeting transcriptions to."
 *   #12 "Add a save button in stapler screen ... 'Unsaved changes' ... Save
 *       should only happen when clicked on save. Add the vocabulary section in
 *       the Stapler settings screen aswell."
 *
 * The main side is EXECUTED: the real src/main/puck.ts is loaded with
 * Electron stubbed and a temp harness home, and its handlers are called. The
 * message rule is run as is. The screen is read as text for the parts a
 * mount would only repeat (test/pro-052-stapler-meetings mounts it and drives
 * Save).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'stapler-save-'));
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const handlers = new Map();
const electronStub = {
  app: { whenReady: () => ({ then: () => Promise.resolve() }), on() {}, getPath: () => HOME },
  BrowserWindow: class { static getAllWindows() { return []; } },
  desktopCapturer: { getSources: async () => [] },
  ipcMain: { handle: (channel, fn) => { handlers.set(channel, fn); } },
  nativeImage: { createFromPath: () => ({ resize: () => ({ toDataURL: () => '' }) }) },
  screen: { on() {}, getPrimaryDisplay: () => ({ workArea: { x: 0, y: 0, width: 1440, height: 900 } }), getDisplayNearestPoint: () => ({ workArea: { x: 0, y: 0, width: 1440, height: 900 } }) },
  shell: { openExternal() {}, showItemInFolder() {}, trashItem: async () => {} },
  systemPreferences: { getMediaAccessStatus: () => 'granted' }
};
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
      return {};
    }
    return Module.createRequire(filename)(r);
  };
  new Function('module', 'exports', 'require', '__filename', '__dirname', out.outputText)(mod, mod.exports, req, filename, path.dirname(filename));
  return mod.exports;
}

const sent = [];
const deps = {
  readConfig: () => ({ harnessHome: HOME, groqApiKey: 'gsk-x', puck: { enabled: true } }),
  writeConfig: (p) => p,
  onConfigWritten: () => () => {},
  hiveEnabled: () => true,
  hiveSend: (partial, from) => { const msg = { id: `m-${sent.length + 1}`, from, ...partial }; sent.push(msg); return msg; },
  transcribe: async () => ({ ok: true, text: 'late words' }),
  broadcast: () => {},
  openSettings: () => {},
  agentIds: () => ['pam', 'dwight'],
  agentName: (id) => ({ god: 'Michael', pam: 'Pam', dwight: 'Dwight' }[id] || id),
  preload: '/preload.js', rendererUrl: null, rendererDir: '/renderer'
};
loadTs(path.join(ROOT, 'src/main/puck.ts')).registerPuck(deps);
const shared = loadTs(path.join(ROOT, 'src/shared/puck.ts'));
const call = (channel, arg) => handlers.get(channel)({}, arg);

const ID = '2026-09-25_09-00-00';
const DIR = path.join(HOME, 'puck', 'meetings', ID);
const TP = path.join(DIR, 'transcript.md');
function makeMeeting(extra = {}) {
  fs.mkdirSync(DIR, { recursive: true });
  const meta = {
    id: ID, title: 'Standup', startedAt: '2026-09-25T09:00:00.000Z', endedAt: '2026-09-25T09:10:00.000Z', status: 'done',
    segments: [{ seq: 0, file: 'seg-001.webm', startMs: 0, durationMs: 60000, transcribed: true, error: null, transcribedAt: 'x', audioDeletedAt: null }],
    ...extra
  };
  fs.writeFileSync(path.join(DIR, 'meta.json'), JSON.stringify(meta));
  fs.writeFileSync(path.join(DIR, 'seg-001.webm'), 'AUDIO');
  fs.writeFileSync(TP, '# Standup\n\nStarted x\n\n[00:00] what the engine heard\n\n');
}
const meta = () => JSON.parse(fs.readFileSync(path.join(DIR, 'meta.json'), 'utf8'));
test.after(() => fs.rmSync(HOME, { recursive: true, force: true }));

/* ---- #8: saving a meeting's edits ---------------------------------------- */

test('1. Save writes the edited transcript and the description; the audio is untouched', () => {
  makeMeeting();
  const r = call('puck:meetingSave', { id: ID, text: '# Standup\n\nfixed words\n', description: '  Ship the release notes.  ' });
  assert.deepEqual(r, { ok: true });
  assert.equal(fs.readFileSync(TP, 'utf8'), '# Standup\n\nfixed words\n');
  assert.equal(meta().description, 'Ship the release notes.');
  assert.ok(meta().editedAt, 'the file is marked as the person\'s');
  assert.equal(fs.readFileSync(path.join(DIR, 'seg-001.webm'), 'utf8'), 'AUDIO', 'the recording is still the recording');
  assert.equal(meta().segments.length, 1);
});

test('2. a name change goes through the rename rule (meta and the transcript heading)', () => {
  makeMeeting();
  assert.deepEqual(call('puck:meetingSave', { id: ID, title: 'Daily standup' }), { ok: true });
  assert.equal(meta().title, 'Daily standup');
  assert.match(fs.readFileSync(TP, 'utf8'), /^# Daily standup$/m);
  assert.equal(call('puck:meetingSave', { id: ID, title: '   ' }).ok, false, 'a meeting still needs a name');
});

test('3. the transcript is not editable while words are still landing', () => {
  makeMeeting({ endedAt: null, status: 'recording' });
  assert.equal(call('puck:meetingSave', { id: ID, text: 'x' }).ok, false);
  makeMeeting({ status: 'transcribing' });
  assert.equal(call('puck:meetingSave', { id: ID, text: 'x' }).ok, false);
  assert.equal(call('puck:meetingSave', { id: ID, description: 'a note is fine' }).ok, true, 'the description can be kept at any time');
  assert.equal(shared.meetingEditable('done'), true);
  assert.equal(shared.meetingEditable('failed'), true);
  assert.equal(shared.meetingEditable('recording'), false);
  assert.equal(shared.meetingEditable('transcribing'), false);
});

test('4. the description is capped, and an unknown meeting is refused', () => {
  makeMeeting();
  call('puck:meetingSave', { id: ID, description: 'x'.repeat(shared.PUCK_MEETING_DESCRIPTION_MAX + 50) });
  assert.equal(meta().description.length, shared.PUCK_MEETING_DESCRIPTION_MAX);
  assert.equal(call('puck:meetingSave', { id: '../etc', text: 'x' }).ok, false);
});

test('5. once edited, machine words that land later go to transcript.auto.md, never over the person\'s file', () => {
  const src = read('src/main/puck.ts');
  assert.match(src, /return meta\.editedAt \? 'transcript\.auto\.md' : 'transcript\.md';/);
  assert.match(src, /writeFileSync\(join\(dir, transcriptFileFor\(meta\)\), head \+ blocks\.join\(''\)\);/, 'the two track rebuild');
  assert.match(src, /const file = join\(dir, transcriptFileFor\(fresh\)\);/, 'the one track append');
});

/* ---- #8: sending to the agents the person picked ------------------------- */

test('6. Send reaches every picked running agent through the hive, one message each', () => {
  makeMeeting({ description: 'Pull the action items.' });
  sent.length = 0;
  const r = call('puck:meetingSendTo', { id: ID, to: ['pam', 'god', 'pam'] });
  assert.equal(r.ok, true);
  assert.deepEqual(r.sent, ['Pam', 'Michael'], 'a repeat counts once, and the answer names who it reached');
  assert.deepEqual(sent.map((m) => m.to), ['pam', 'god']);
  for (const m of sent) {
    assert.equal(m.from, 'human');
    assert.equal(m.act, 'request');
    assert.equal(m.subject, 'Meeting: Standup');
    assert.match(m.body, /Pull the action items\./, 'the description or prompt travels with it');
    assert.match(m.body, /what the engine heard/, 'a short transcript is pasted');
  }
});

test('7. an agent that is not running is refused by name, and the rest still go', () => {
  makeMeeting();
  sent.length = 0;
  const r = call('puck:meetingSendTo', { id: ID, to: ['oscar', 'dwight'] });
  assert.equal(r.ok, false);
  assert.deepEqual(r.sent, ['Dwight']);
  assert.deepEqual(r.failed, [{ id: 'oscar', error: 'not running' }]);
  assert.equal(call('puck:meetingSendTo', { id: ID, to: [] }).ok, false, 'nobody picked, nothing sent');
  makeMeeting({ endedAt: null });
  assert.equal(call('puck:meetingSendTo', { id: ID, to: ['pam'] }).error, 'still recording');
});

test('8. how it is sized: pasted up to PUCK_MEETING_INLINE_MAX characters, the path past it', () => {
  const base = { id: ID, title: 'T', startedAt: 's', transcriptPath: '/h/t.md' };
  const short = shared.meetingMessage({ ...base, text: 'hello' });
  assert.equal(short.inline, true);
  assert.match(short.body, /Transcript \(also at \/h\/t\.md\):\n\nhello$/);
  const edge = shared.meetingMessage({ ...base, text: 'a'.repeat(shared.PUCK_MEETING_INLINE_MAX) });
  assert.equal(edge.inline, true, 'the limit itself is still pasted');
  const long = shared.meetingMessage({ ...base, text: 'a'.repeat(shared.PUCK_MEETING_INLINE_MAX + 1) });
  assert.equal(long.inline, false);
  assert.match(long.body, /Transcript: \/h\/t\.md\nIt is 12001 characters, too long to paste here\. Read it at that path\./);
  assert.doesNotMatch(long.body, /aaaa/, 'nothing of a long transcript is pasted');
  const empty = shared.meetingMessage({ ...base, text: '  ', description: 'why' });
  assert.match(empty.body, /Description or prompt from the person:\nwhy/);
  assert.match(empty.body, /The transcript is empty so far/);
  assert.equal(shared.PUCK_MEETING_INLINE_MAX, 12000);
});

/* ---- #12: the screen waits for Save -------------------------------------- */

const screen = read('src/renderer/src/components/pro/PuckScreen.tsx');
const kit = read('src/renderer/src/components/pro/puck/staplerKit.tsx');

test('9. nothing on the screen writes config on change; the only writers are the Save tasks', () => {
  const writes = screen.match(/window\.cth\.updateConfig\(/g) ?? [];
  assert.equal(writes.length, 2, 'the puck task and the footer\'s field write, nothing else');
  assert.match(screen, /usePendingPatch<PuckConfig>\('puck', liveCfg, async \(patch\) => \{\s*await window\.cth\.updateConfig\(\{ puck: patch \}\);/);
  assert.match(kit, /usePendingPatch<TranscribeConfig>\('transcribe', live,/);
  assert.doesNotMatch(kit, /proToast|updateConfig/, 'the kit never writes on its own');
  assert.match(screen, /const \[draft\] = useState\(createSettingsDraft\);/, 'Settings\' own draft store, one per visit');
  assert.match(screen, /<SettingsFrameProvider draft=\{draft\} chrome="inline">/);
});

test('10. the footer reads like Settings: "unsaved changes", Save, and a way back', () => {
  const footer = screen.slice(screen.indexOf('function SaveFooter('), screen.indexOf('/* ---- the settings tab'));
  assert.match(footer, /if \(!dirty && !note\) return null;/, 'it appears when something changes');
  assert.match(footer, /t\('settings\.unsavedChanges'\)/, 'the same words as Settings');
  assert.match(footer, /t\('common\.save'\)/);
  assert.match(footer, /t\('settings\.frame\.partlySaved', \{ error: r\.errors\[0\]\.message \}\)/, 'a failed part is named and stays staged');
  assert.match(footer, /draft\.reset\(\)/, 'Discard');
  assert.match(screen, /<SaveFooter draft=\{draft\} \/>/);
});

test('11. the vocabulary is in the Dictation group, the same two fields Settings writes', () => {
  assert.match(screen, /<VocabularyLines shared=\{shared\} \/>/);
  const v = screen.slice(screen.indexOf('function VocabularyLines('));
  assert.match(v, /save\(\{ defaultVocabulary: next \}\)/);
  assert.match(v, /save\(\{ customWords: cleanCustomWords\(e\.target\.value\) \}\)/);
  assert.match(read('src/renderer/src/components/TranscribeSettings.tsx'), /save\(\{ customWords: cleanCustomWords\(text\) \}\)/, 'Settings writes the same field the same way');
});

test('12. the meeting view: name, ID, the description section, a scrolling editable transcript, Send to', () => {
  const ed = screen.slice(screen.indexOf('function MeetingEditor('));
  const at = (s) => { const i = ed.indexOf(s); assert.ok(i >= 0, s); return i; };
  assert.ok(at('pro.puck.meetings.renameLabel') < at('data-meeting-id'), 'the ID sits under the name');
  assert.ok(at('data-meeting-id') < at('pro.puck.meetings.descriptionHead'), 'and the description section after both');
  assert.ok(at('pro.puck.meetings.descriptionHead') < at('data-meeting-transcript'));
  assert.match(ed, /usePendingPatch<MeetingEdit>\(`meeting:\$\{meeting\.id\}`, live,/, 'edits wait for the one Save');
  assert.match(ed, /readOnly=\{!editable\}/);
  assert.match(ed, /overflow: 'auto'/);
  assert.match(ed, /disabled=\{sending \|\| unsaved \|\| reachable\.length === 0/, 'Send waits for Save so agents get the edits');
  assert.match(ed, /window\.cth\.puckMeetingSendTo\(\{ id: meeting\.id, to: reachable \}\)/);
  const en = JSON.parse(read('src/renderer/src/i18n/locales/en.json'));
  assert.equal(en.pro.puck.meetings.descriptionHead, 'Add a description or a prompt you want to keep along with the meeting', 'the founder\'s words');
});

test('13. every new string is in all three locales, with no dashes in the English', () => {
  const keys = ['discard', 'keyWaiting', 'customWordsInfo', 'meetings.idLine', 'meetings.descriptionHead', 'meetings.descriptionPlaceholder', 'meetings.transcriptHead', 'meetings.stillWriting', 'meetings.sendToHead', 'meetings.sendN', 'meetings.sendHint', 'meetings.saveFirst', 'meetings.sentTo', 'meetings.sendFailed'];
  for (const loc of ['en', 'ar', 'zh-CN']) {
    const j = JSON.parse(read(`src/renderer/src/i18n/locales/${loc}.json`));
    for (const k of keys) {
      const v = k.split('.').reduce((a, b) => a?.[b], j.pro.puck);
      assert.ok(typeof v === 'string' && v.length > 0, `${loc}: pro.puck.${k}`);
      if (loc === 'en') assert.doesNotMatch(v, /[–—]/, `en: pro.puck.${k}`);
    }
  }
});
