'use strict';

/**
 * 0.5.3, founder 24 Sep 2026: "for shortcut changing input sections just show
 * a list of 10-12 alternatives to choose from, typing the key stroke names is
 * an antipattern." Every chord field in Settings (push to talk, meeting,
 * capture) is a list of presets now; the lists are pure and tested here.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { chordPresets, presetFor, chordLabel, chordWords, SYSTEM_CHORDS } = loadTs('src/shared/hotkeyPresets.ts');
const { hotkeyProblem, sameChord, defaultMeetingKey, defaultCaptureKey, defaultPushToTalkKey } = loadTs('src/shared/hotkeyName.ts');
const { DEFAULT_TRANSCRIBE } = loadTs('src/shared/transcribeConfig.ts');
const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const FIELDS = ['pushToTalk', 'meeting', 'capture'];
const PLATFORMS = ['darwin', 'win32', 'linux'];
const defaultOf = (field, platform) => field === 'pushToTalk' ? defaultPushToTalkKey(platform) : field === 'meeting' ? defaultMeetingKey(platform) : defaultCaptureKey(platform);

test('10 to 12 presets per field and platform, the default first, every one a chord the helpers take', () => {
  for (const p of PLATFORMS) for (const f of FIELDS) {
    const list = chordPresets(f, p);
    assert.ok(list.length >= 10 && list.length <= 12, `${p} ${f}: ${list.length}`);
    assert.ok(sameChord(list[0], defaultOf(f, p)), `${p} ${f} leads with its default`);
    for (const c of list) assert.equal(hotkeyProblem(c, p), null, `${p} ${f} ${c}`);
    assert.equal(new Set(list.map((c) => c.toLowerCase())).size, list.length, `${p} ${f} has no repeat`);
  }
});

test('no chord is in two fields: one pick can never take another field\'s key', () => {
  for (const p of PLATFORMS) {
    const all = FIELDS.flatMap((f) => chordPresets(f, p).map((c) => [f, c]));
    for (const [fa, a] of all) for (const [fb, b] of all) {
      if (fa !== fb) assert.ok(!sameChord(a, b), `${p}: ${a} is in ${fa} and ${fb}`);
    }
  }
});

test('no preset is a chord the OS or everyday apps own', () => {
  for (const p of PLATFORMS) {
    const sys = SYSTEM_CHORDS[p === 'darwin' ? 'mac' : 'other'];
    for (const f of FIELDS) for (const c of chordPresets(f, p)) {
      assert.ok(!sys.some((s) => sameChord(s, c)), `${p} ${f}: ${c} is a system chord`);
    }
  }
  // The ones people actually hit, named, so the list cannot quietly shrink.
  for (const c of ['Command+Space', 'Control+Space', 'Shift+Command+4', 'Control+Command+Space']) assert.ok(SYSTEM_CHORDS.mac.some((s) => sameChord(s, c)), c);
  for (const c of ['Control+Shift+Escape', 'Alt+Shift+PrintScreen', 'Control+Alt+T', 'Control+Shift+S']) assert.ok(SYSTEM_CHORDS.other.some((s) => sameChord(s, c)), c);
});

test('a stored chord maps to its preset however it was written; anything else is custom', () => {
  assert.equal(presetFor('meeting', 'darwin', 'Cmd+Shift+Space'), 'Shift+Command+Space');
  assert.equal(presetFor('pushToTalk', 'darwin', ' ctrl+option+space '), 'Control+Alt+Space');
  assert.equal(presetFor('pushToTalk', 'darwin', 'F19'), null, 'custom');
  assert.equal(presetFor('capture', 'darwin', ''), null);
});

test('labels: Mac symbols in Apple\'s order, words elsewhere, and plain names', () => {
  assert.equal(chordLabel('Control+Alt+Space', 'darwin'), '⌃⌥Space');
  assert.equal(chordLabel('Shift+Command+Space', 'darwin'), '⇧⌘Space');
  assert.equal(chordLabel('Command+Shift+Control+s', 'darwin'), '⌃⇧⌘S', 'sorted ⌃ ⌥ ⇧ ⌘ whatever the stored order');
  assert.equal(chordLabel('Control+Alt+Slash', 'darwin'), '⌃⌥/');
  assert.equal(chordLabel('Control+Shift+PrintScreen', 'win32'), 'Ctrl + Shift + PrintScreen');
  assert.equal(chordWords('Control+Alt+Space', 'darwin'), 'Control Option Space');
  assert.equal(chordWords('Control+Alt+Slash', 'linux'), 'Ctrl Alt Slash');
  assert.equal(chordWords('F9', 'win32'), 'F9');
});

test('Settings draws every chord field as a picker; nothing is typed', () => {
  const s = read('src/renderer/src/components/TranscribeSettings.tsx');
  for (const [field, attr] of [['meeting', 'data-meeting-key'], ['capture', 'data-capture-key'], ['pushToTalk', 'data-transcribe-key']]) {
    assert.match(s, new RegExp(`<ChordSelect\\n\\s*field="${field}"[\\s\\S]*?data="${attr}"`), field);
  }
  assert.doesNotMatch(s, /keyText|captureText|onChange=\{\(e\) => setCfg\(\(c\) => \(\{ \.\.\.c, pushToTalkKey/, 'no typed chord left');
  assert.equal((s.match(/<input\b/g) ?? []).length, 0, 'no text input left in the section');
  const sel = s.slice(s.indexOf('function ChordSelect('));
  assert.match(sel, /\{custom && <option value=\{`custom:\$\{custom\}`\}>\{t\('settings\.transcribe\.chordCustom', \{ chord: chordLabel\(custom, platform\) \}\)\}<\/option>\}/, 'a stored custom chord stays readable');
  assert.match(sel, /if \(v\.startsWith\('custom:'\)\) return;/, 'picking the custom row changes nothing');
  assert.match(sel, /\$\{t\('settings\.transcribe\.chordDefault'\)\}/, 'the default is marked');
  // Meeting and capture store '' for their default, as before.
  assert.match(s, /onPick=\{\(v, isDefault\) => \{ const stored = isDefault \? '' : v; if \(stored !== cfg\.meetingKey\)/);
  assert.match(s, /onPick=\{\(v, isDefault\) => \{ const stored = isDefault \? '' : v; if \(stored !== cfg\.captureKey\)/);
});

test('the picker words in every language, no dashes', () => {
  for (const lng of ['en', 'zh-CN', 'ar']) {
    const tr = JSON.parse(read(`src/renderer/src/i18n/locales/${lng}.json`)).settings.transcribe;
    for (const k of ['chordDefault', 'chordCustom', 'pushToTalkHint', 'meetingKeyHint', 'captureKeyHint']) {
      assert.ok(tr[k] && tr[k].trim(), `${lng} ${k}`);
      assert.doesNotMatch(tr[k], /[–—]| - /, `${lng} ${k}`);
    }
    assert.match(tr.chordCustom, /\{\{chord\}\}/);
    assert.doesNotMatch(tr.pushToTalkHint + tr.meetingKeyHint + tr.captureKeyHint, /Control\+Alt|Shift\+Command|F key|Clear the field/, `${lng}: no typing instructions left`);
  }
});
