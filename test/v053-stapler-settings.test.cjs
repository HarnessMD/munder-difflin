'use strict';

/* 0.5.3 settings redesign, the Stapler panel (founder, 24 Sep 2026): "Always
 * on top and snap to edges should be a default. The items on the actions
 * section can be put in general section ... compact and minimal without
 * compromising the details. The Meeting transcription, dictation, screenshots
 * and all other configuration about stapler should be there in the stapler
 * section ... and common details should in sync with the settings available
 * in the settings section like in voice and dictation." */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
const P = loadTs('src/shared/puck.ts');
const screen = read('src/renderer/src/components/pro/PuckScreen.tsx');
const kit = read('src/renderer/src/components/pro/puck/staplerKit.tsx');

test('always on top and snap to edges are on for a new install', () => {
  assert.equal(P.DEFAULT_PUCK_CONFIG.alwaysOnTop, true);
  assert.equal(P.DEFAULT_PUCK_CONFIG.snapToEdges, true);
  const fresh = P.normalizePuckConfig(undefined);
  assert.equal(fresh.alwaysOnTop, true);
  assert.equal(fresh.snapToEdges, true);
});

test('a choice already stored is kept', () => {
  assert.equal(P.normalizePuckConfig({ snapToEdges: false }).snapToEdges, false);
  assert.equal(P.normalizePuckConfig({ alwaysOnTop: false }).alwaysOnTop, false);
  assert.equal(P.normalizePuckConfig({ snapToEdges: true }).snapToEdges, true);
});

test('three tabs; the settings tab is four collapsible groups, Actions folded into General', () => {
  assert.match(screen, /type Tab = 'settings' \| 'meetings' \| 'screenshots';/);
  const settings = screen.slice(screen.indexOf('function SettingsTab('), screen.indexOf('function PuckTab('));
  const order = ['<Group id="general" defaultOpen', '<ActionsTab ', '<Group id="dictation"', '<Group id="meetings"', '<Group id="screenshots"'].map((k) => settings.indexOf(k));
  for (let i = 0; i < order.length; i++) assert.ok(order[i] > 0 && (i === 0 || order[i] > order[i - 1]), `group order ${order.join(', ')}`);
  // The old tab ids still open the screen, on settings.
  assert.match(screen, /initialTab === 'puck' \|\| initialTab === 'actions' \? 'settings' : initialTab/);
});

test('explanations are (i) tooltips, not paragraphs under every field', () => {
  const general = screen.slice(screen.indexOf('function PuckTab('), screen.indexOf('function DictationGroup('));
  assert.doesNotMatch(general, /<Field /, 'General uses one line settings');
  assert.ok((general.match(/info=\{[`t]|<Info text=/g) ?? []).length >= 10, 'each setting carries its words in an (i)');
  assert.match(kit, /role="img" aria-label=\{text\} title=\{text\}/, 'the (i) is a tooltip a screen reader also reads');
  assert.match(kit, /aria-expanded=\{open\}/, 'a group says whether it is open');
});

test('dictation, meeting and capture values are the Settings keys, through the Settings door', () => {
  // Read from the live config (every write is pushed as config:changed), with
  // this screen's unsaved changes over it (batch 2 #12: nothing before Save) ...
  assert.match(kit, /const live: TranscribeConfig = config\?\.transcribe \?\? DEFAULT_TRANSCRIBE;/);
  assert.match(kit, /const \{ view: cfg, change: save \} = usePendingPatch<TranscribeConfig>\('transcribe', live,/);
  // ... and written on Save through the one IPC Settings, Dictation & Meetings uses.
  assert.match(kit, /await window\.cth\.transcribeSetConfig\(patch\)/);
  assert.match(read('src/renderer/src/components/TranscribeSettings.tsx'), /window\.cth\.transcribeSetConfig\(patch\)/);
  // 0.5.3, one Save: Settings shows the LIVE config with only the waiting edits over it.
  assert.match(read('src/renderer/src/components/TranscribeSettings.tsx'), /const live = config\.transcribe \?\? DEFAULT_TRANSCRIBE;\n  const \{ view: cfg, pending, change: save \} = usePendingPatch<TranscribeConfig>\('transcribe', live,/, 'Settings follows a change made on the Stapler screen');
  for (const k of ['engine: v', 'anyApp: next', 'pushToTalkKey: v', 'meetingSystemAudio: next', 'meetingKey: stored', 'captureKey: stored']) {
    assert.ok(screen.includes(k), `the Stapler writes ${k.split(':')[0]}`);
  }
  // The same chord lists and default marking as Settings.
  assert.match(kit, /import \{ chordLabel, chordPresets, chordWords, presetFor, type ChordField \} from '@shared\/hotkeyPresets';/);
  // The Groq key stays the one door it was.
  assert.match(screen, /<GroqKeyField hasGroqKey=\{hasGroqKey\} \/>/);
  const main = read('src/main/index.ts');
  assert.match(main, /onConfigWritten\(\(config\) => \{[\s\S]{0,200}webContents\.send\('config:changed', config\)/, 'every write reaches every window');
});

test('group open state is a viewer convenience, guarded', () => {
  assert.match(kit, /try \{ const v = window\.localStorage\.getItem\(LS_PREFIX \+ id\);/);
  assert.match(kit, /try \{ window\.localStorage\.setItem\(LS_PREFIX \+ id, next \? '1' : '0'\); \} catch/);
});

test('every border in the new parts is 1px', () => {
  for (const src of [screen, kit]) {
    for (const m of src.matchAll(/border(Left|Right|Top|Bottom)?\s*:\s*[`'"]([^`'"]+)[`'"]/g)) {
      if (m[2] === 'none') continue;
      assert.match(m[2], /^1px /, `border "${m[2]}"`);
    }
  }
});
