'use strict';
/**
 * 0.5.3, F16, PR 5: the Settings switch for the other side of calls and the
 * state under it. Pinned: the switch reaches the config through
 * transcribe:setConfig (it did not before this PR), the line under the
 * switch for every platform and reason, the exact Linux and Windows
 * sentences the hand tests T134 and T135 promise, the three locales carrying
 * every key, the macOS Allow and Open System Settings buttons, and the three
 * second refresh that lets a monitor or a grant show up without reopening.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const { systemAudioLine, systemAudioStateKey } = loadTs('src/shared/systemAudioLine.ts');
const { withTranscribeDefaults, DEFAULT_TRANSCRIBE } = loadTs('src/shared/transcribeConfig.ts');
const en = JSON.parse(read('src/renderer/src/i18n/locales/en.json')).settings.transcribe;
const t = (k, o) => { const v = en[k.replace('settings.transcribe.', '')]; assert.ok(v, `missing en key ${k}`); return o ? v.replace(/\{\{(\w+)\}\}/g, (_, n) => String(o[n])) : v; };

test('the line under the switch: every platform and reason, in the words the hand tests promise', () => {
  assert.equal(systemAudioLine(t, null), '');
  assert.equal(systemAudioLine(t, { platform: 'darwin', available: true, granted: true, source: 'helper' }), 'Screen Recording: granted');
  assert.equal(systemAudioLine(t, { platform: 'darwin', available: true, granted: false, source: null, reason: 'screen-not-granted' }), 'Screen Recording: not granted');
  assert.match(systemAudioLine(t, { platform: 'darwin', available: false, granted: false, source: null, reason: 'macos-too-old' }), /macOS 13/);
  assert.match(systemAudioLine(t, { platform: 'darwin', available: false, granted: false, source: null, reason: 'no-helper' }), /helper/);
  assert.equal(systemAudioLine(t, { platform: 'win32', available: true, granted: true, source: 'renderer' }), 'Ready: Windows hands the app what it plays, nothing to grant.');
  assert.equal(systemAudioLine(t, { platform: 'linux', available: true, granted: true, source: 'renderer', detail: 'Monitor of Built-in Audio Analog Stereo' }), 'Monitor found: Monitor of Built-in Audio Analog Stereo');
  assert.equal(systemAudioLine(t, { platform: 'linux', available: false, granted: true, source: null, reason: 'no-monitor' }), 'No system audio source on this machine: PulseAudio or PipeWire is not offering a monitor of the output. X11 or Wayland makes no difference.');
  assert.match(systemAudioLine(t, { platform: 'freebsd', available: false, granted: false, source: null, reason: 'not-yet' }), /Not available/);
  assert.equal(systemAudioStateKey({ platform: 'linux', available: true, granted: true, source: 'renderer' }), 'ready');
  assert.equal(systemAudioStateKey({ platform: 'linux', available: false, granted: true, source: null, reason: 'no-monitor' }), 'no-monitor');
  assert.equal(systemAudioStateKey({ platform: 'darwin', available: true, granted: false, source: null }), 'not-granted');
});

test('the switch reaches the config, defaults on, and survives a round trip', () => {
  assert.equal(DEFAULT_TRANSCRIBE.meetingSystemAudio, true, 'on by default: the founder\'s headline');
  assert.equal(withTranscribeDefaults({ meetingSystemAudio: false }).meetingSystemAudio, false);
  assert.equal(withTranscribeDefaults({ meetingSystemAudio: 'no' }).meetingSystemAudio, true, 'a non boolean falls back to the default');
  const main = read('src/main/index.ts');
  assert.match(main, /ipcMain\.handle\('transcribe:setConfig'[\s\S]*?\.\.\.\(p\.meetingSystemAudio !== undefined \? \{ meetingSystemAudio: p\.meetingSystemAudio \} : \{\}\)[\s\S]*?writeConfig\(\{ transcribe: next \}\);/, 'setConfig carries the switch to disk');
});

test('the Settings section: the switch, the state line, Allow and Open System Settings on the Mac only, a refresh every three seconds', () => {
  const src = read('src/renderer/src/components/TranscribeSettings.tsx');
  assert.match(src, /onClick=\{\(\) => save\(\{ meetingSystemAudio: !cfg\.meetingSystemAudio \}\)\} data-system-audio-switch>/);
  assert.match(src, /\{cfg\.meetingSystemAudio \? t\('common\.on'\) : t\('common\.off'\)\}/);
  assert.match(src, /<span data-system-audio-state=\{systemAudioStateKey\(sysAudio\)\}>\{systemAudioLine\(t, sysAudio\)\}<\/span>/);
  assert.match(src, /sysAudio\.platform === 'darwin' && sysAudio\.available && !sysAudio\.granted && \(/, 'the buttons only where a grant exists and is missing');
  assert.match(src, /window\.cth\.systemAudioRequest\(\)\.then\(refreshSysAudio\)/);
  assert.match(src, /window\.cth\.systemAudioOpenSettings\(\)/);
  assert.match(src, /setInterval\(\(\) => \{ void refreshSysAudio\(\); \}, 3000\)/);
  assert.match(src, /return \(\) => clearInterval\(id\);/);
  const pre = read('src/preload/index.ts');
  for (const door of ['systemAudioStatus', 'systemAudioRequest', 'systemAudioOpenSettings']) assert.match(pre, new RegExp(`  ${door}: `), door);
});

test('the three locales carry every key of the block', () => {
  const keys = ['meetingSystemAudio', 'meetingSystemAudioDesc', 'sysAudioScreen', 'sysAudioMacTooOld', 'sysAudioNoHelper', 'sysAudioWindowsReady', 'sysAudioMonitorFound', 'sysAudioNoMonitor', 'sysAudioUnavailable'];
  for (const loc of ['en', 'ar', 'zh-CN']) {
    const block = JSON.parse(read(`src/renderer/src/i18n/locales/${loc}.json`)).settings.transcribe;
    for (const k of keys) assert.ok(typeof block[k] === 'string' && block[k].length > 0, `${loc} ${k}`);
    assert.match(block.sysAudioMonitorFound, /\{\{name\}\}/, `${loc} names the monitor`);
    for (const k of keys) assert.doesNotMatch(block[k], /—/, `${loc} ${k} has no em dash`);
  }
});
