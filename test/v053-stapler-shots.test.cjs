'use strict';
/**
 * I6 (founder, 23 Sep 2026): the Stapler takes several screenshots per send,
 * not one. The card lays them out (shared/puck shotsLayout), the card lets a
 * picture be added and removed, and main sends them in one message (that half
 * is puck-main-wiring 6b, over the real IPC).
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');
const P = loadTs('src/shared/puck.ts');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('1. one picture keeps its own proportion; several become a grid that fits the card', () => {
  const side = P.ringFootprint(80);
  const one = P.shotsLayout([{ width: 2872, height: 1792 }], side);
  assert.deepEqual(one.boxes[0], P.shotBox({ width: 2872, height: 1792 }, side), 'one shot is the old box');
  assert.equal(one.height, one.boxes[0].height);
  const rowW = P.CARD.w - 2 * P.CARD.pad;
  for (const n of [2, 3, 5, P.PUCK_MAX_SHOTS]) {
    const shots = Array.from({ length: n }, (_, i) => (i % 2 ? { width: 600, height: 4000 } : { width: 2872, height: 1792 }));
    const g = P.shotsLayout(shots, side);
    assert.equal(g.boxes.length, n);
    for (const b of g.boxes) {
      assert.ok(b.width >= 1 && b.height >= 1, 'never a zero side');
      assert.ok(b.width <= (rowW - P.THUMB.gap) / 2, 'never wider than half a row, so two share one');
    }
    assert.ok(P.cardHeight(g) + 16 <= side, `${n} shots: the card still fits the window`);
  }
  assert.deepEqual(P.shotsLayout([], side), { height: 0, boxes: [] });
  const tiny = P.shotsLayout(Array.from({ length: 8 }, () => ({ width: 100, height: 1000 })), 300);
  assert.ok(P.cardHeight(tiny) <= 300, 'a small window shrinks the grid instead of pushing Send out');
  // I3 (#77): near a screen edge the card lives in the part of the window on
  // screen; the grid fits that space, not the bare square.
  const cut = P.cardSpace(side, { x0: 0, y0: 0, x1: side, y1: 420 });
  const inCut = P.shotsLayout(Array.from({ length: 8 }, () => ({ width: 2872, height: 1792 })), cut);
  assert.ok(P.cardHeight(inCut) <= cut.y1 - cut.y0, 'the grid fits the on screen part');
});

test('2. the card adds, removes and sends several, up to the cap', () => {
  const app = read('src/renderer/src/puck/PuckApp.tsx');
  assert.equal(P.PUCK_MAX_SHOTS, 8);
  assert.match(app, /shots: \[\.\.\.had, shot\]\.slice\(0, PUCK_MAX_SHOTS\)/, 'a capture joins the pictures already on the card');
  assert.match(app, /disabled=\{busy !== null \|\| st\.capturing \|\| shotsFull\}/, 'the add button stops at the cap');
  assert.match(app, /data-drop-shot[\s\S]*onClick=\{\(\) => dropShot\(s\.path\)\}/, 'each thumbnail can be removed');
  assert.match(app, /screenshots: compose\.shots\.map\(\(s\) => s\.path\)/, 'send carries every path');
  for (const loc of ['en', 'ar', 'zh-CN']) {
    const card = JSON.parse(read(`src/renderer/src/i18n/locales/${loc}.json`)).pro.puck.card;
    for (const k of ['shots', 'shotsFull', 'dropShot']) assert.ok(card[k], `${loc}: pro.puck.card.${k}`);
    assert.match(card.shots, /\{\{count\}\}/);
    assert.match(card.dropShot, /\{\{n\}\}/);
  }
});

test('3. the capture chord: the founder\'s keys armed by default, the meeting chord\'s checks', () => {
  const C = loadTs('src/shared/transcribeConfig.ts');
  assert.equal(C.DEFAULT_TRANSCRIBE.captureKey, '', 'stored empty = the platform default');
  assert.equal(C.withTranscribeDefaults({ captureKey: ' Control+Shift+6 ' }).captureKey, 'Control+Shift+6');
  const H = loadTs('src/shared/hotkeyName.ts');
  assert.equal(H.defaultCaptureKey('darwin'), 'Control+Shift+5');
  assert.equal(H.defaultCaptureKey('win32'), 'Control+Shift+PrintScreen');
  assert.equal(H.defaultCaptureKey('linux'), 'Control+Shift+PrintScreen');
  assert.equal(H.captureKeyFor('', 'darwin'), 'Control+Shift+5');
  assert.equal(H.captureKeyFor('F8', 'linux'), 'F8');
  for (const p of ['win32', 'linux']) assert.equal(H.hotkeyProblem('Control+Shift+PrintScreen', p), null, `${p} parses PrintScreen`);
  assert.equal(H.hotkeyProblem('Control+Shift+PrintScreen', 'darwin'), 'bad-key', 'the Mac never offers PrintScreen');
  assert.equal(H.hotkeyProblem('PrintScreen', 'win32'), 'bare-key', 'not on its own: the system owns it');
  assert.equal(H.hotkeyProblem('Control+Shift+5', 'darwin'), null);
  assert.ok(H.sameChord('Shift+Ctrl+printscreen', 'Control+Shift+PrintScreen'));
  for (const alias of ['Print', 'PrtSc']) {
    assert.equal(H.hotkeyProblem(`Control+Shift+${alias}`, 'win32'), null, `${alias} is an alias (Creed's helpers take it)`);
    assert.equal(H.hotkeyProblem(`Control+Shift+${alias}`, 'darwin'), 'bad-key');
    assert.ok(H.sameChord(`Control+Shift+${alias}`, 'Control+Shift+PrintScreen'));
    assert.ok(H.needsNewHelperKey(`Control+Shift+${alias}`));
  }
  assert.ok(!H.sameChord(H.defaultCaptureKey('darwin'), H.defaultMeetingKey('darwin')));
  assert.ok(!H.sameChord(H.defaultCaptureKey('win32'), H.defaultMeetingKey('win32')));
  assert.ok(H.needsNewHelperKey('Control+Shift+PrintScreen') && !H.needsNewHelperKey('Control+Shift+5'));
  const main = read('src/main/index.ts');
  const sync = main.slice(main.indexOf('async function syncCaptureHotkeyToConfig'), main.indexOf("ipcMain.handle('captureHotkey:status'"));
  assert.match(sync, /if \(meetingHotkeyReason\(\)\) return;/, 'never on a floor, on Wayland, or without the helper');
  assert.match(sync, /const key = captureKeyFor\(t\.captureKey, process\.platform\);/, 'armed by default');
  assert.match(sync, /hotkeyProblem\(key, process\.platform\)/);
  assert.match(sync, /sameChord\(key, t\.pushToTalkKey\)[\s\S]*'in-use-by-arm'/);
  assert.match(sync, /sameChord\(key, meetingKeyFor\(t\.meetingKey, process\.platform\)\)[\s\S]*'in-use-by-meeting'/);
  assert.match(sync, /reason === 'bad-key' && needsNewHelperKey\(key\)\) captureHotkeyError = \{ reason: 'needs-helper' \}/, 'an old helper is a build to wait for');
  assert.match(sync, /onToggle: \(\) => \{ void captureByKey\(\)/);
  assert.match(main, /defaultKey: defaultCaptureKey\(process\.platform\)/);
  assert.match(main, /\.\.\.\(p\.captureKey !== undefined \? \{ captureKey: p\.captureKey \} : \{\}\)/, 'setConfig carries the key');
  assert.match(main, /await syncMeetingHotkeyToConfig\(next\);\s*await syncCaptureHotkeyToConfig\(next\);/, 'rearmed after every setConfig');
  assert.match(main, /void syncCaptureHotkeyToConfig\(\)\.catch/, 'and at launch');
  const puck = read('src/main/puck.ts');
  const byKey = puck.slice(puck.indexOf('export async function captureByKey'), puck.indexOf('export function toggleMeetingByKey'));
  assert.match(byKey, /if \(overlay && !overlay\.isDestroyed\(\)\) \{\s*const r = requestCapture\(\);/, 'a press while the box is up takes the picture');
  assert.match(byKey, /showInactive\(\)[\s\S]*await openOverlay\(\)/, 'else the puck comes up and the box opens');
  const settings = read('src/renderer/src/components/TranscribeSettings.tsx');
  assert.match(settings, /data-capture-key\b/);
  assert.match(settings, /captureHotkeyLine\(t, capture\)/);
  // 24 Sep (founder): the field is a preset list, not typed; the default is
  // still stored as empty. v053-chord-presets pins the picker.
  assert.match(settings, /onPick=\{\(v, isDefault\) => \{ const stored = isDefault \? '' : v; if \(stored !== cfg\.captureKey\)/, 'the default is stored as empty');
});

test('4. the capture chord\'s line under its field', () => {
  const L = loadTs('src/shared/meetingHotkeyLine.ts');
  const t = (k, o) => (o ? `${k} ${JSON.stringify(o)}` : k);
  const base = { platform: 'win32', key: 'Control+Shift+PrintScreen', defaultKey: 'Control+Shift+PrintScreen', armed: null, reason: null };
  assert.match(L.captureHotkeyLine(t, { ...base, armed: base.key }).text, /meetingKeyArmed/);
  for (const reason of ['needs-helper', 'not-available']) {
    const l = L.captureHotkeyLine(t, { ...base, reason });
    assert.match(l.text, /captureKeyNeedsHelper/, `${reason}: the next helper build`);
    assert.equal(l.bad, false, 'not red');
  }
  assert.match(L.captureHotkeyLine(t, { ...base, key: 'F8', reason: 'not-available' }).text, /meetingKeyNoHelper/);
  assert.equal(L.captureHotkeyLine(t, { ...base, reason: 'register-failed', detail: 'in-use-by-meeting' }).bad, true);
  assert.match(L.captureHotkeyLine(t, { ...base, reason: 'register-failed', detail: 'in-use-by-meeting' }).text, /captureKeyMeeting/);
  assert.match(L.captureHotkeyLine(t, { ...base, reason: 'register-failed', detail: 'in-use-by-arm' }).text, /meetingKeySame/);
  assert.match(L.captureHotkeyLine(t, { ...base, reason: 'wayland' }).text, /captureKeyWayland/);
  assert.equal(L.captureHotkeyLine(t, { ...base, reason: 'bad-key' }).bad, true);
  assert.match(L.meetingHotkeyLine(t, { ...base, reason: 'wayland' }).text, /meetingKeyWayland/, 'the meeting line is unchanged');
  for (const loc of ['en', 'ar', 'zh-CN']) {
    const tr = JSON.parse(read(`src/renderer/src/i18n/locales/${loc}.json`)).settings.transcribe;
    for (const k of ['captureKey', 'captureKeyHint', 'captureKeyNeedsHelper', 'captureKeyMeeting', 'captureKeyWayland']) assert.ok(tr[k], `${loc}: ${k}`);
    assert.match(tr.captureKeyMeeting, /\{\{key\}\}/);
    assert.match(tr.captureKeyNeedsHelper, /\{\{key\}\}/);
  }
});
