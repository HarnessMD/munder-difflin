'use strict';

/**
 * THE MEETINGS TAB, MOUNTED (0.5.2, the founder's "searchable and filterable
 * by name and date range").
 *
 * The matching itself runs in main and is executed in
 * test/puck-main-wiring.test.cjs against real files. What this file proves is
 * the half that has shipped dead three times in this release: the WIRING.
 * The real `PuckScreen` is mounted on its meetings tab through react-dom's
 * client on a fake container, so its effects run, and the real search box and
 * the real Rename button are driven. Then it reads what the preload surface
 * was actually asked.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const RENDERER = path.join(ROOT, 'src/renderer/src');

/* ---- a fake DOM: enough for react-dom's client to mount ------------------- */
const el = (tag) => ({
  // `options`, `value` and `multiple` are what react-dom reads back off a
  // <select> after it mounts one; without them the commit throws.
  nodeType: 1, tagName: tag, nodeName: tag, namespaceURI: 'http://www.w3.org/1999/xhtml', childNodes: [], style: { setProperty(k, v) { this[k] = v; }, removeProperty(k) { delete this[k]; } }, attrs: {},
  options: [], value: '', multiple: false, selectedIndex: -1, defaultValue: '',
  addEventListener() {}, removeEventListener() {}, appendChild(c) { this.childNodes.push(c); return c; },
  removeChild(c) { this.childNodes = this.childNodes.filter((x) => x !== c); },
  insertBefore(c) { this.childNodes.push(c); return c; }, setAttribute(k, v) { this.attrs[k] = v; }, removeAttribute(k) { delete this.attrs[k]; },
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }, contains() { return false; }, get ownerDocument() { return document; },
  setAttributeNS() {}, removeAttributeNS() {}, focus() {}, blur() {}
});
const document = {
  nodeType: 9, body: el('BODY'), documentElement: el('HTML'), createElement: (t) => el(t.toUpperCase()),
  createTextNode: (t) => ({ nodeType: 3, nodeValue: t }), createEvent: () => ({ initEvent() {} }),
  // The Stapler screen draws SVG glyphs, so the tree needs the namespaced door too.
  createElementNS: (_ns, t) => el(String(t).toUpperCase()),
  addEventListener() {}, removeEventListener() {}, get activeElement() { return this.body; }, implementation: { hasFeature: () => false }
};
globalThis.document = document;

/* ---- what main would answer --------------------------------------------- */
const asked = [];       // every puckMeetings filter, in order
const renames = [];
const meetingSaves = [];
const configWrites = [];
const agentRow = (id, name, extra = {}) => ({ id, name, character: id, accent: 'mint', description: '', project: 'p', tmuxTarget: '', cwd: '/r', status: 'idle', action: '', progress: 0, ptyId: `pty-${id}`, command: 'claude', provider: 'claude', ...extra });
const ROSTER = [agentRow('god', 'Michael', { isGod: true }), agentRow('dwight', 'Dwight'), agentRow('pam', 'Pam')];
/** One live capture and one tombstone: an image the sweep removed whose record
 *  stays because the message that named it is still in an agent's inbox. */
const SHOTS = [
  { path: '/h/puck/screenshots/2026-09-09_09-00-00.png', takenAt: '2026-09-09T09:00:00.000Z', note: null, sentAt: null, width: 10, height: 10, thumb: 'data:image/png;base64,x', deletedAt: null },
  { path: '/h/puck/screenshots/2026-09-01_08-00-00.png', takenAt: '2026-09-01T08:00:00.000Z', note: 'the sidebar', sentAt: '2026-09-01T08:05:00.000Z', width: 10, height: 10, thumb: '', deletedAt: '2026-09-02T08:00:00.000Z' }
];
const MEETINGS = [{
  id: '2026-09-09_00-30-00', title: 'Budget call', startedAt: '2026-09-09T00:30:00.000Z', endedAt: '2026-09-09T01:00:00.000Z',
  status: 'done', segments: [{ seq: 0, file: 'seg-001.webm', startMs: 0, durationMs: 60000, transcribed: true, error: null, transcribedAt: '2026-09-09T01:01:00.000Z', audioDeletedAt: null }],
  dir: '/h/puck/meetings/2026-09-09_00-30-00', transcriptPath: '/h/puck/meetings/2026-09-09_00-30-00/transcript.md',
  durationMs: 60000, hit: null
}];
const cth = new Proxy({
  // The store loads the roster at module load, synchronously.
  rosterReadSync: () => ({ version: 1, savedAt: 'x', agents: ROSTER, archived: [], restorable: [], queues: {}, selectedId: null }),
  harnessHomeSync: () => '/h',
  rosterWrite: () => Promise.resolve({ ok: true }),
  puckMeetings: (filter) => { asked.push(filter); return Promise.resolve(MEETINGS); },
  puckMeetingRename: (arg) => { renames.push(arg); return Promise.resolve({ ok: true }); },
  puckMeetingSave: (arg) => { meetingSaves.push(arg); return Promise.resolve({ ok: true }); },
  updateConfig: (patch) => { configWrites.push(patch); return Promise.resolve({ ok: true }); },
  puckMeetingTranscript: () => Promise.resolve({ ok: true, text: 'the words', meta: MEETINGS[0] }),
  puckScreenshots: () => Promise.resolve(SHOTS),
  puckState: () => Promise.resolve({ shown: false, recording: null, canTranscribe: true, invisible: false, menuOpen: false, screenAccess: 'granted' }),
  puckConfig: () => Promise.resolve({ enabled: true, actions: {} }),
  getConfig: () => Promise.resolve({ groqApiKey: 'gsk-x' })
}, {
  get(target, name) {
    if (name in target) return target[name];
    if (typeof name === 'string' && name.startsWith('on')) return () => () => {};
    return () => Promise.resolve({ ok: true });
  }
});
globalThis.window = {
  document, localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  cth, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; }, setTimeout, clearTimeout,
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), location: { href: 'http://x/' },
  HTMLIFrameElement: function HTMLIFrameElement() {}
};
globalThis.localStorage = window.localStorage;
if (!('navigator' in globalThis)) Object.defineProperty(globalThis, 'navigator', { value: { language: 'en', userAgent: 'node' }, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/* ---- the loader ---------------------------------------------------------- */
const cache = new Map();
function resolveTs(fromDir, req) {
  const base = req.startsWith('@shared/') ? path.join(ROOT, 'src/shared', req.slice(8))
    : req.startsWith('@/') ? path.join(RENDERER, req.slice(2))
    : path.resolve(fromDir, req);
  for (const c of [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')]) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}
function loadFile(filename) {
  const hit = cache.get(filename);
  if (hit) return hit.exports;
  if (filename.endsWith('.json')) { const m = { exports: JSON.parse(fs.readFileSync(filename, 'utf8')) }; cache.set(filename, m); return m.exports; }
  const out = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.React },
    fileName: filename
  });
  const mod = { exports: {} };
  cache.set(filename, mod);
  const req = (r) => {
    if (r.endsWith('.css')) return {};
    if (r.startsWith('@brand/')) return { default: 'logo.png' };
    if (r.startsWith('.') || r.startsWith('@shared/') || r.startsWith('@/')) {
      const x = resolveTs(path.dirname(filename), r.replace(/\?url$/, ''));
      if (x) return loadFile(x);
    }
    return require(r);
  };
  new Function('module', 'exports', 'require', '__filename', '__dirname', out.outputText)(mod, mod.exports, req, filename, path.dirname(filename));
  return mod.exports;
}

const React = require('react');
globalThis.React = React;
/* Every element with an aria-label, so the real inputs and buttons can be
   driven by the name a person would read. */
const found = new Map();
/* Every string the tree renders. Without an initialised i18n `t('a.b')`
   returns 'a.b', so a key in here is that line actually drawn, which is the
   difference between a string that exists and a string a person sees. */
const texts = [];
const realCreate = React.createElement;
React.createElement = function patched(type, props, ...kids) {
  for (const k of kids.flat ? kids.flat(3) : kids) if (typeof k === 'string') texts.push(k);
  if (props && typeof props === 'object') {
    if (typeof props.children === 'string') texts.push(props.children);
    if (props['aria-label']) found.set(props['aria-label'], props);
    // The kit's own SelectBox, which carries the options a person can pick.
    if (props.ariaLabel) found.set(`box:${props.ariaLabel}`, props);
    if (typeof props.title === 'string' && typeof props.onClick === 'function') found.set(`row:${props.title}`, props);
    if (typeof type === 'function' && props.children && typeof props.children === 'string') found.set(`btn:${props.children}`, props);
    // A kit button whose one child is its label, as JSX passes it.
    if (typeof type === 'function' && kids.length === 1 && typeof kids[0] === 'string') found.set(`btn:${kids[0]}`, props);
  }
  return realCreate.call(this, type, props, ...kids);
};
const { createRoot } = require('react-dom/client');
const { act } = React;
const { PuckScreen } = loadFile(path.join(RENDERER, 'components/pro/PuckScreen.tsx'));

let root;
test.before(async () => {
  root = createRoot(el('DIV'));
  await act(async () => { root.render(React.createElement(PuckScreen, { config: { harnessHome: '/h', groqApiKey: 'gsk-x' }, initialTab: 'meetings' })); });
});
test.after(async () => { await act(async () => { root.unmount(); }); });

const type = async (label, value) => {
  const props = found.get(label);
  assert.ok(props, `no control labelled ${label} was drawn`);
  await act(async () => { props.onChange({ target: { value } }); });
};

test('1. the tab asks main for every meeting on mount, with an empty filter', () => {
  assert.ok(asked.length >= 1, 'puckMeetings was called');
  assert.deepEqual(asked[0], { q: '', from: '', to: '' }, 'no filter means everything');
});

test('2. typing in the search box asks main with those words', async () => {
  const before = asked.length;
  await type('pro.puck.meetings.searchLabel', 'budget');
  assert.ok(asked.length > before, 'the search box triggered a reload');
  assert.equal(asked[asked.length - 1].q, 'budget', 'and carried the words to main');
});

test('3. the two date boxes carry a range, keeping the words', async () => {
  await type('pro.puck.meetings.fromLabel', '2026-09-01');
  await type('pro.puck.meetings.toLabel', '2026-09-09');
  const last = asked[asked.length - 1];
  assert.equal(last.from, '2026-09-01');
  assert.equal(last.to, '2026-09-09');
  assert.equal(last.q, 'budget', 'a date range does not drop the search words');
});

test('4. the rename control saves the new name through the real preload call, on Save only', async () => {
  // A meeting has to be open for its name to be on screen: click its row, the
  // way a person does.
  const row = found.get(`row:${MEETINGS[0].title}`);
  assert.ok(row, 'the meeting is listed as a row');
  await act(async () => { row.onClick(); });
  const props = found.get('pro.puck.meetings.renameLabel');
  assert.ok(props, 'the meeting name is editable');
  await act(async () => { props.onChange({ target: { value: 'Quarterly budget call' } }); });
  // 0.5.3, batch 2 #12: nothing is written until the screen's Save.
  assert.equal(meetingSaves.length, 0, 'typing a name saved nothing');
  const save = found.get('btn:common.save');
  assert.ok(save, 'a change brought up the Save button');
  await act(async () => { await save.onClick(); });
  assert.equal(meetingSaves.length, 1, 'Save wrote the meeting');
  assert.deepEqual(meetingSaves[0], { id: MEETINGS[0].id, title: 'Quarterly budget call' }, 'exactly the one field that changed');
});

test('5. the search box survives an empty result, so a person can always get back', () => {
  const screen = fs.readFileSync(path.join(RENDERER, 'components/pro/PuckScreen.tsx'), 'utf8');
  assert.match(screen, /if \(list\.length === 0 && !filtering\)/, 'the empty state is only for a floor with no meetings at all');
  assert.match(screen, /if \(list\.length === 0\) \{\s*\n\s*return <div>\{retention\}\{bar\}/, 'a filter that matches nothing still draws the bar, under the rule that governs the meetings it is not finding');
});

/* ---- where captures go: the picker, mounted ------------------------------ */

test('6. the settings tab (General) offers the running agents and saves the choice', async () => {
  const root2 = createRoot(el('DIV'));
  await act(async () => {
    root2.render(React.createElement(PuckScreen, { config: { harnessHome: '/h', groqApiKey: 'gsk-x', puck: { enabled: true, sendTo: '' } }, initialTab: 'settings' }));
  });
  const select = found.get('box:pro.puck.sendTo');
  assert.ok(select, 'the Stapler section itself carries the control, not Settings somewhere else');
  const labels = select.options.map((o) => o.label);
  assert.equal(select.options[0].value, '', 'the orchestrator is the first choice and the default');
  assert.ok(labels.includes('Dwight') && labels.includes('Pam'), `the running agents are offered (saw ${labels.join(', ')})`);
  assert.ok(!labels.includes('Michael'), 'the orchestrator is not listed twice');

  const before = configWrites.length;
  await act(async () => { select.onChange('dwight'); });
  assert.equal(configWrites.length, before, 'choosing an agent waits for Save');
  await act(async () => { await found.get('btn:common.save').onClick(); });
  assert.equal(configWrites.length, before + 1, 'Save wrote the choice');
  assert.deepEqual(configWrites[configWrites.length - 1], { puck: { sendTo: 'dwight' } }, 'and saved exactly the choice');
  await act(async () => { root2.unmount(); });
});

test('7. a chosen agent that is no longer running is kept, and the screen says where captures go', async () => {
  const root3 = createRoot(el('DIV'));
  await act(async () => {
    root3.render(React.createElement(PuckScreen, { config: { harnessHome: '/h', groqApiKey: 'gsk-x', puck: { enabled: true, sendTo: 'oscar' } }, initialTab: 'settings' }));
  });
  const select = found.get('box:pro.puck.sendTo');
  assert.equal(select.value, 'oscar', 'the stored choice is not silently rewritten');
  assert.ok(select.options.some((o) => o.value === 'oscar'), 'it stays in the list so the box is not blank');
  const screen = fs.readFileSync(path.join(RENDERER, 'components/pro/PuckScreen.tsx'), 'utf8');
  assert.match(screen, /orphaned \? t\('pro\.puck\.sendToGone', \{ name: goneName \}\)/, 'and the hint says captures go to the orchestrator until it is back');
  await act(async () => { root3.unmount(); });
});

/* ---- the screenshots tab: the rule said, the tombstone drawn ------------- */

test('8. the screenshots tab states the 24 hour rule and draws a tombstone without offering to send it', async () => {
  found.clear();
  const root4 = createRoot(el('DIV'));
  await act(async () => {
    root4.render(React.createElement(PuckScreen, { config: { harnessHome: '/h', groqApiKey: 'gsk-x', puck: { enabled: true } }, initialTab: 'screenshots' }));
  });
  const screen = fs.readFileSync(path.join(RENDERER, 'components/pro/PuckScreen.tsx'), 'utf8');
  assert.match(screen, /t\('pro\.puck\.screenshots\.retention'\)/, 'the rule is stated where the captures are');
  assert.match(screen, /\{!s\.deletedAt && <Btn size="sm" kind="primary"/, 'a deleted image cannot be sent');
  assert.match(screen, /s\.deletedAt \? t\('pro\.puck\.screenshots\.forget'\)/, 'and its button says forget, not delete');
  assert.match(screen, /t\('pro\.puck\.screenshots\.deletedWhen', \{ when: fmtWhen\(s\.deletedAt, locale\) \}\)/, 'the row says when the image went');
  // The note box belongs to a capture that still exists.
  const noteBoxes = [...found.keys()].filter((k) => k === 'pro.puck.screenshots.noteLabel');
  assert.equal(noteBoxes.length, 1, 'one note box, for the one live capture');
  await act(async () => { root4.unmount(); });
});

/* ---- the audio rule, on the screen (founder, 9 Sep 2026) ----------------- */

/** Mount the meetings tab on its own root and open the one meeting, so the
 *  panel that carries the audio line is actually drawn. */
async function openMeetingsTab() {
  found.clear();
  texts.length = 0;
  const r = createRoot(el('DIV'));
  await act(async () => {
    r.render(React.createElement(PuckScreen, { config: { harnessHome: '/h', groqApiKey: 'gsk-x', puck: { enabled: true } }, initialTab: 'meetings' }));
  });
  const row = found.get('row:Budget call');
  assert.ok(row, 'the meeting row was not drawn');
  await act(async () => { row.onClick(); });
  return r;
}

test('9. the meetings tab states the audio rule, on the screen, not only in the code', async () => {
  const r = await openMeetingsTab();
  assert.ok(texts.includes('pro.puck.meetings.retention'), 'the 24 hour rule is drawn where the meetings are');
  await act(async () => { r.unmount(); });
});

test('10. a meeting whose audio the sweep took says so, and one that still has it does not', async () => {
  const seg = MEETINGS[0].segments[0];

  seg.audioDeletedAt = null;
  const before = await openMeetingsTab();
  assert.ok(!texts.includes('pro.puck.meetings.audioDeleted'), 'audio still on disk: no line, because nothing has gone');
  await act(async () => { before.unmount(); });

  seg.audioDeletedAt = '2026-09-10T01:01:00.000Z';
  const after = await openMeetingsTab();
  assert.ok(texts.includes('pro.puck.meetings.audioDeleted'), 'once it is gone the meeting says it, beside Show folder, which now opens a folder with no recordings in it');
  await act(async () => { after.unmount(); });

  seg.audioDeletedAt = null;
});

test('11. the line is fed by the segments, so all three locales must carry it', () => {
  const screen = fs.readFileSync(path.join(RENDERER, 'components/pro/PuckScreen.tsx'), 'utf8');
  assert.match(screen, /function audioGoneAt\(m: PuckMeeting\): string \| null/, 'computed from what main already sends: no new field on the wire');
  for (const loc of ['en', 'ar', 'zh-CN']) {
    const dict = JSON.parse(fs.readFileSync(path.join(RENDERER, 'i18n/locales', `${loc}.json`), 'utf8'));
    const m = dict.pro.puck.meetings;
    assert.ok(m.retention && m.audioDeleted, `${loc} is missing the audio strings`);
    assert.match(m.audioDeleted, /\{\{when\}\}/, `${loc} must interpolate the instant it went`);
  }
});
