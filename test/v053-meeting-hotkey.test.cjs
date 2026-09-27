'use strict';
/**
 * 0.5.3, F16, the founder's meeting chord (23 Sep 2026): Shift+Command+Space
 * on the Mac, Control+Shift+Space on Windows and Linux, one press starts a
 * Stapler meeting and a second stops it, from anywhere on the machine.
 * Pinned here: the chord names parse and the platform defaults hold; the
 * MeetingHotkey loop on a FAKE md-hotkey (ping with tap, tap, untap, presses
 * as events): a press toggles once, an old helper is no-tap, a taken chord
 * is register-failed; main arms it at launch and after setConfig and NEVER
 * on a floor; the toggle runs the puck's own start and stop; the Settings
 * row and its line; the three locales. Last, the real helper on this Mac:
 * tap and untap of the founder's chord.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const { hotkeyProblem, validHotkey, defaultMeetingKey, meetingKeyFor, sameChord } = loadTs('src/shared/hotkeyName.ts');
const { meetingHotkeyLine } = loadTs('src/shared/meetingHotkeyLine.ts');
const { withTranscribeDefaults, DEFAULT_TRANSCRIBE } = loadTs('src/shared/transcribeConfig.ts');
const { MeetingHotkey } = loadTs('src/main/transcribe/meetingHotkey.ts');
const { HelperError } = loadTs('src/main/transcribe/lineHelper.ts');
const en = JSON.parse(read('src/renderer/src/i18n/locales/en.json')).settings.transcribe;
const t = (k, o) => { const v = en[k.replace('settings.transcribe.', '')]; assert.ok(v, `missing en key ${k}`); return o ? v.replace(/\{\{(\w+)\}\}/g, (_, n) => String(o[n])) : v; };

test('the chord names: the founder\'s two parse on every platform, the defaults follow the platform, bare keys and bare modifiers are refused', () => {
  for (const k of ['Shift+Command+Space', 'Control+Shift+Space', 'Control+Alt+Space', 'F9', 'Command+Semicolon', 'ctrl+shift+f19']) assert.equal(hotkeyProblem(k), null, k);
  assert.equal(hotkeyProblem('a'), 'bare-key');
  assert.equal(hotkeyProblem('Space'), 'bare-key');
  assert.equal(hotkeyProblem('Command'), 'bare-modifier');
  assert.equal(hotkeyProblem('Shift+Command'), 'bare-modifier');
  assert.equal(hotkeyProblem('Hyper+Space'), 'bad-modifier');
  assert.equal(hotkeyProblem('Command+Fn'), 'bad-key');
  assert.equal(hotkeyProblem(''), 'empty');
  assert.equal(validHotkey('Shift+Command+Space'), true);
  assert.equal(defaultMeetingKey('darwin'), 'Shift+Command+Space');
  assert.equal(defaultMeetingKey('win32'), 'Control+Shift+Space');
  assert.equal(defaultMeetingKey('linux'), 'Control+Shift+Space', 'Linux follows Windows');
  assert.equal(meetingKeyFor('', 'darwin'), 'Shift+Command+Space', 'empty means the default');
  assert.equal(meetingKeyFor(' F9 ', 'linux'), 'F9');
  assert.equal(sameChord('Shift+Cmd+Space', 'Command+Shift+space'), true);
  assert.equal(sameChord('Control+Alt+Space', 'Control+Shift+Space'), false);
  assert.equal(DEFAULT_TRANSCRIBE.meetingKey, '');
  assert.equal(withTranscribeDefaults({ meetingKey: ' F9 ' }).meetingKey, 'F9');
  assert.equal(withTranscribeDefaults({ meetingKey: 7 }).meetingKey, '');
});

// A fake md-hotkey that speaks the 0.3.0 protocol: tap, untap, ping with tap.
const FAKE = path.join(os.tmpdir(), `fake-md-hotkey-tap-${process.pid}.cjs`);
fs.writeFileSync(FAKE, `
const rl = require('node:readline').createInterface({ input: process.stdin });
const out = (o) => process.stdout.write(JSON.stringify(o) + '\\n');
const OLD = process.env.FAKE_OLD === '1';
const TAKEN = process.env.FAKE_TAKEN || '';
out({ ready: true, helper: 'fake-md-hotkey', version: OLD ? '0.2.0' : '0.3.0' });
let tapped = null; let armed = 'Control+Alt+Space';
rl.on('line', (line) => {
  const r = JSON.parse(line);
  switch (r.op) {
    case 'ping': out(OLD ? { id: r.id, ok: true, helper: 'fake-md-hotkey', version: '0.2.0', stream: true } : { id: r.id, ok: true, helper: 'fake-md-hotkey', version: '0.3.0', stream: true, tap: true }); break;
    case 'tap':
      if (OLD) { out({ id: r.id, error: 'unknown-op', op: 'tap' }); break; }
      if (!/\\+|^F\\d+$/.test(r.key)) { out({ id: r.id, error: 'bad-key', key: r.key }); break; }
      if (r.key === armed) { out({ id: r.id, error: 'register-failed', status: 0, key: r.key, detail: 'in-use-by-arm' }); break; }
      if (r.key === TAKEN) { out({ id: r.id, error: 'register-failed', status: -9878, key: r.key }); break; }
      tapped = r.key; out({ id: r.id, ok: true, key: r.key, keyCode: 49, modifiers: 768 }); break;
    case 'untap': tapped = null; out({ id: r.id, ok: true }); break;
    case 'fake-press': { const n = r.times || 1; for (let i = 0; i < n; i++) out({ event: 'tap', key: tapped, at: (r.at || Date.now()) + i * (r.gapMs || 0) }); out({ id: r.id, ok: true, tapped }); break; }
    case 'shutdown': out({ id: r.id, ok: true }); process.exit(0);
    default: out({ id: r.id, error: 'unknown-op', op: r.op });
  }
});
rl.on('close', () => process.exit(0));
`);
const WRAP = path.join(os.tmpdir(), `fake-md-hotkey-tap-${process.pid}.sh`);
fs.writeFileSync(WRAP, `#!/bin/sh\nexec "${process.execPath}" "${FAKE}"\n`, { mode: 0o755 });
test.after(() => { for (const f of [FAKE, WRAP]) try { fs.unlinkSync(f); } catch { /* gone */ } });

test('the loop: tap on start, one toggle per press (a repeat inside 250 ms is the same press), untap on stop', async () => {
  const toggles = [];
  const loop = new MeetingHotkey({ helperPath: WRAP, key: 'Shift+Command+Space', onToggle: (at) => toggles.push(at) });
  const r = await loop.start();
  assert.deepEqual(r, { key: 'Shift+Command+Space', keyCode: 49 });
  assert.equal(loop.armed, 'Shift+Command+Space');
  const p1 = await loop.lineHelper.request({ op: 'fake-press', at: 1_790_000_000_000 });
  assert.equal(p1.tapped, 'Shift+Command+Space');
  await loop.lineHelper.request({ op: 'fake-press', times: 3, at: 1_790_000_001_000, gapMs: 50 });
  await loop.lineHelper.request({ op: 'fake-press', at: 1_790_000_002_000 });
  assert.deepEqual(toggles, [1_790_000_000_000, 1_790_000_001_000, 1_790_000_002_000], 'three presses, three toggles; the burst of three is one');
  await loop.stop();
  assert.equal(loop.armed, null);
  assert.equal(loop.lineHelper.running, false, 'the helper is gone with the loop');
});

test('the loop: an old helper is no-tap, a bad chord is bad-key, the push to talk chord is register-failed in-use-by-arm, a taken chord is register-failed; each leaves no helper behind', async () => {
  const old = new MeetingHotkey({ helperPath: WRAP, key: 'Shift+Command+Space', onToggle: () => {}, env: { ...process.env, FAKE_OLD: '1' } });
  await assert.rejects(old.start(), (e) => e instanceof HelperError && e.code === 'no-tap');
  assert.equal(old.lineHelper.running, false);
  const bad = new MeetingHotkey({ helperPath: WRAP, key: 'q', onToggle: () => {} });
  await assert.rejects(bad.start(), (e) => e instanceof HelperError && e.code === 'bad-key');
  const same = new MeetingHotkey({ helperPath: WRAP, key: 'Control+Alt+Space', onToggle: () => {} });
  await assert.rejects(same.start(), (e) => e instanceof HelperError && e.code === 'register-failed' && e.detail?.detail === 'in-use-by-arm');
  const taken = new MeetingHotkey({ helperPath: WRAP, key: 'F9', onToggle: () => {}, env: { ...process.env, FAKE_TAKEN: 'F9' } });
  await assert.rejects(taken.start(), (e) => e instanceof HelperError && e.code === 'register-failed');
  assert.equal(taken.lineHelper.running, false);
});

test('main: armed at launch and after setConfig, never on a floor, one chord one meaning; the toggle runs the puck\'s own start and stop', () => {
  const main = read('src/main/index.ts');
  assert.match(main, /function meetingHotkeyReason\(\): string \| null \{[\s\S]*?const r = anyAppReason\(\);\s*return r === 'no-helper' \? 'not-available' : r;/, 'one answer with push to talk: a floor never arms it, Wayland never spawns the helper, no helper is said');
  assert.match(main, /const anyAppReason = \(\) => anyAppUnavailableReason\(anyAppResources\(\), process\.platform, process\.env, \{ floor: isFloorProcess\(\) \}\);/);
  assert.match(main, /async function syncMeetingHotkeyToConfig\([\s\S]*?if \(meetingHotkeyReason\(\)\) return;/);
  assert.match(main, /if \(sameChord\(key, t\.pushToTalkKey\)\) \{ meetingHotkeyError = \{ reason: 'register-failed', detail: 'in-use-by-arm' \};/);
  assert.match(main, /onToggle: \(\) => \{ const r = toggleMeetingByKey\(\);/);
  assert.match(main, /\.\.\.\(p\.meetingKey !== undefined \? \{ meetingKey: p\.meetingKey \} : \{\}\)/, 'setConfig carries the chord');
  assert.match(main, /await syncAnyAppToConfig\(next\);\s*await syncMeetingHotkeyToConfig\(next\);/, 're-armed after every setConfig');
  assert.match(main, /void syncMeetingHotkeyToConfig\(\)\.catch/, 'armed at launch');
  assert.match(main, /ipcMain\.handle\('meetingHotkey:status'/);
  const puck = read('src/main/puck.ts');
  assert.match(puck, /export function toggleMeetingByKey\(\)[\s\S]*?if \(state\.recording\?\.kind === 'message'\) return \{ ok: false, error: 'message-recording' \};[\s\S]*?if \(!cfg\.enabled\) return \{ ok: false, error: 'puck-off' \};[\s\S]*?if \(!w\.isVisible\(\)\) w\.showInactive\(\);[\s\S]*?w\.webContents\.send\('puck:meetingToggle', \{ at: Date\.now\(\) \}\)/);
  const app = read('src/renderer/src/puck/PuckApp.tsx');
  assert.match(app, /toggleRef\.current = \(\) => \{\s*if \(busy\) return;\s*if \(st\.recording\?\.kind === 'meeting'\) \{ void stopRecording\(\); return; \}\s*if \(!st\.recording\) void startMeeting\(\);\s*\};/, 'the same start and stop a click runs');
  assert.match(app, /window\.cth\.onPuckMeetingToggle\(\(\) => toggleRef\.current\?\.\(\)\)/);
  const pre = read('src/preload/index.ts');
  assert.match(pre, /ipcRenderer\.on\('puck:meetingToggle', listener\)/);
  assert.match(pre, /meetingHotkeyStatus: \(\)[\s\S]*?ipcRenderer\.invoke\('meetingHotkey:status'\)/);
  const swift = read('tools/md-hotkey/main.swift');
  assert.match(swift, /case "tap":[\s\S]*?case "untap":/);
  assert.match(swift, /"in-use-by-arm"/);
  assert.match(swift, /let VERSION = "0\.4\.0"/);
});

test('the Settings row and its line: armed, floor, no helper, old helper, bad chord, refused, the push to talk chord, failed', () => {
  const src = read('src/renderer/src/components/TranscribeSettings.tsx');
  assert.match(src, /data-meeting-key\b/);
  // 24 Sep (founder): a preset list, not typed; v053-chord-presets pins it.
  assert.match(src, /onPick=\{\(v, isDefault\) => \{ const stored = isDefault \? '' : v; if \(stored !== cfg\.meetingKey\)/, 'the default is stored as empty so the platform decides');
  assert.match(src, /save\(\{ meetingKey: stored \}\)/);
  assert.match(src, /color: line\.bad \? 'var\(--cth-status-blocked\)' : hintStyle\.color/, 'red when the OS refuses or the chord is not one');
  const base = { platform: 'darwin', key: 'Shift+Command+Space', defaultKey: 'Shift+Command+Space', armed: null, reason: null };
  assert.deepEqual(meetingHotkeyLine(t, { ...base, armed: 'Shift+Command+Space' }), { text: 'Armed: Shift+Command+Space', bad: false });
  assert.deepEqual(meetingHotkeyLine(t, { ...base, reason: 'floor' }), { text: 'Armed by the main floor.', bad: false });
  assert.equal(meetingHotkeyLine(t, { ...base, reason: 'not-available' }).bad, false);
  assert.equal(meetingHotkeyLine(t, { ...base, reason: 'no-tap' }).bad, false);
  assert.deepEqual(meetingHotkeyLine(t, { ...base, reason: 'bad-key' }), { text: 'Not a chord: a modifier plus a key, or an F key on its own.', bad: true });
  assert.deepEqual(meetingHotkeyLine(t, { ...base, reason: 'register-failed' }), { text: 'macOS refused Shift+Command+Space: another app holds that chord. Pick another.', bad: true });
  assert.deepEqual(meetingHotkeyLine(t, { ...base, platform: 'win32', key: 'Control+Shift+Space', reason: 'register-failed', detail: 'in-use-by-arm' }), { text: 'Control+Shift+Space is the push to talk key. Pick another.', bad: true });
  assert.equal(meetingHotkeyLine(t, { ...base, reason: 'start-failed', detail: 'boom' }).text, 'The key helper did not start: boom');
  assert.deepEqual(meetingHotkeyLine(t, null), { text: '', bad: false });
  const wayland = 'Global keys need X11 on Linux in this release. This is a Wayland session, so the chord does nothing; a click on the puck still starts a meeting.';
  assert.deepEqual(meetingHotkeyLine(t, { ...base, platform: 'linux', reason: 'wayland' }), { text: wayland, bad: false }, 'known from the environment, the helper never asked');
  assert.deepEqual(meetingHotkeyLine(t, { ...base, platform: 'linux', reason: 'wayland-unsupported', detail: 'any app dictation needs an X11 session on Linux in this release' }), { text: wayland, bad: false }, 'the helper\'s own answer (linux.c) reads the same');
  assert.deepEqual(meetingHotkeyLine(t, { ...base, platform: 'linux', reason: 'capture-failed', detail: 'boom' }), { text: 'The key helper did not start: capture-failed: boom', bad: true }, 'a refusal main does not know is shown red, not swallowed');
  assert.match(read('src/main/transcribe/anyApp.ts'), /if \(platform === 'linux' && isWaylandSession\(env\)\) return 'wayland';\s*if \(!mdHotkeyAvailable\(resourcesPath, platform\)\) return 'no-helper';/, 'a Wayland session never spawns the helper, and outranks a missing helper');
  const keys = ['meetingKey', 'meetingKeyHint', 'meetingKeyArmed', 'meetingKeyFloor', 'meetingKeyWayland', 'meetingKeyNoHelper', 'meetingKeyOldHelper', 'meetingKeyBad', 'meetingKeyRefused', 'meetingKeySame', 'meetingKeyFailed'];
  for (const loc of ['en', 'ar', 'zh-CN']) {
    const block = JSON.parse(read(`src/renderer/src/i18n/locales/${loc}.json`)).settings.transcribe;
    for (const k of keys) { assert.ok(typeof block[k] === 'string' && block[k].length > 0, `${loc} ${k}`); assert.doesNotMatch(block[k], /—/, `${loc} ${k} em dash`); }
    assert.match(block.meetingKeyRefused, /\{\{os\}\}[\s\S]*\{\{key\}\}/, `${loc} names the OS and the chord`);
  }
  assert.equal(en.pushToTalkKey, 'Push to talk key', 'the any app row is untouched');
  // 0.5.3 (founder 24 Sep): the default became holding Option alone.
  assert.equal(DEFAULT_TRANSCRIBE.pushToTalkKey, 'Option', 'and its default');
});

const BIN = path.join(ROOT, 'resources/transcribe/darwin-universal/md-hotkey');
const live = process.platform === 'darwin' && fs.existsSync(BIN);
test(`live: the real md-hotkey answers tap, registers and releases Shift+Command+Space${live ? '' : ' (SKIPPED: needs the Mac helper)'}`, { skip: !live }, async (t) => {
  const loop = new MeetingHotkey({ helperPath: BIN, key: 'Shift+Command+Space', onToggle: () => {} });
  try {
    const r = await loop.start();
    assert.equal(r.keyCode, 49, 'space');
    assert.equal(loop.armed, 'Shift+Command+Space');
  } catch (e) {
    if (e instanceof HelperError && e.code === 'register-failed') { t.skip(`the chord is held by another process here (${JSON.stringify(e.detail)})`); return; }
    throw e;
  } finally { await loop.stop(); }
  assert.equal(loop.lineHelper.running, false);
});
