'use strict';
/**
 * 0.5.3, F16, PRs 3 and 4: the other side of a call on WINDOWS and LINUX.
 *
 * Windows (PR 3). No helper: the
 * puck window asks getDisplayMedia, main's setDisplayMediaRequestHandler
 * answers with the primary screen and `audio: 'loopback'`, the renderer
 * keeps the audio track and drops the video, and the recorder rolls it as
 * the second track (PR 1). Pinned here: the handler on the puck window's
 * session, the renderer's opener on a stub of the browser doors (the
 * request it makes, the video dropped, every refusal answered with null),
 * main's status and source answers for win32. The loopback itself is the
 * founder's hand test T134 on a Windows machine.
 *
 * Linux (PR 4). No helper either: PulseAudio and PipeWire list the monitor
 * of the output device as an audio input labelled "Monitor of ...", the
 * puck opens it with getUserMedia (voice processing off) as the second
 * track, and tells main whether one is listed so main can answer the
 * Settings row and decide two track at meeting start. Pinned here on the
 * same door stubs: the label match, the one time microphone open that
 * fills empty labels, the constraints, the report to main, the watch on
 * device changes, and main's linux answers. The monitor itself is the
 * founder's hand test T135 on a Linux machine.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const { openSystemStream, audioOnly, findMonitor, probeMonitor, watchMonitor } = loadTs('src/renderer/src/puck/systemAudio.ts');

const fakeStream = (audio, video) => {
  const tracks = [...audio.map((id) => ({ id, kind: 'audio', stopped: false, stop() { this.stopped = true; } })), ...video.map((id) => ({ id, kind: 'video', stopped: false, stop() { this.stopped = true; } }))];
  return {
    tracks,
    getAudioTracks: () => tracks.filter((t) => t.kind === 'audio'),
    getVideoTracks: () => tracks.filter((t) => t.kind === 'video'),
    removeTrack(t) { const i = tracks.indexOf(t); if (i >= 0) tracks.splice(i, 1); }
  };
};

test('Windows: the renderer asks for the display with audio, keeps the audio track, stops and drops the video', async () => {
  const asked = [];
  const stream = fakeStream(['loop'], ['screen']);
  const video = stream.getVideoTracks()[0];
  const got = await openSystemStream({ platform: 'win32', getDisplayMedia: async (c) => { asked.push(c); return stream; } });
  assert.deepEqual(asked, [{ video: true, audio: true }], 'both are asked for: Chromium refuses an audio only display request');
  assert.equal(got, stream);
  assert.equal(video.stopped, true, 'the video track is stopped');
  assert.deepEqual(got.tracks.map((t) => t.kind), ['audio'], 'and dropped');
});

test('every refusal is null and the meeting goes on with the microphone alone', async () => {
  assert.equal(await openSystemStream({ platform: 'win32', getDisplayMedia: async () => { throw new DOMException('no', 'NotAllowedError'); } }), null, 'refused');
  assert.equal(await openSystemStream({ platform: 'win32' }), null, 'no API');
  assert.equal(await openSystemStream({ platform: 'win32', getDisplayMedia: async () => fakeStream([], ['screen']) }), null, 'a display with no audio track');
  assert.equal(await openSystemStream({ platform: 'darwin', getDisplayMedia: async () => fakeStream(['x'], []) }), null, 'the Mac has a helper, the renderer opens nothing');
  assert.equal(await openSystemStream({ platform: 'linux', getDisplayMedia: async () => fakeStream(['x'], []) }), null, 'Linux never asks for the display, and with no getUserMedia there is nothing to open');
  assert.equal(await openSystemStream({ platform: 'linux', getUserMedia: async () => fakeStream(['x'], []), enumerateDevices: async () => [MIC] }), null, 'no monitor listed');
  assert.equal(await openSystemStream({ platform: 'linux', getUserMedia: async () => { throw new DOMException('no', 'NotReadableError'); }, enumerateDevices: async () => [MIC, MONITOR] }), null, 'the monitor refused to open');
  assert.equal(audioOnly(fakeStream([], [])), null);
});

const MIC = { kind: 'audioinput', label: 'Built-in Audio Analog Stereo', deviceId: 'mic1' };
const MONITOR = { kind: 'audioinput', label: 'Monitor of Built-in Audio Analog Stereo', deviceId: 'mon1' };
const CAM = { kind: 'videoinput', label: 'Monitor of nothing', deviceId: 'cam' };
const OUT = { kind: 'audiooutput', label: 'Built-in Audio Analog Stereo', deviceId: 'out1' };

test('Linux: the monitor is the audio input labelled Monitor of, opened by exact id with the voice processing off, and reported to main', async () => {
  assert.deepEqual(findMonitor([OUT, CAM, MIC, MONITOR]), { deviceId: 'mon1', label: 'Monitor of Built-in Audio Analog Stereo' });
  assert.equal(findMonitor([OUT, CAM, MIC]), null, 'a video input with that label is not it');
  assert.deepEqual(findMonitor([{ kind: 'audioinput', label: '  monitor of USB Audio ', deviceId: 'm2' }]), { deviceId: 'm2', label: 'monitor of USB Audio' }, 'case and edges do not matter');
  const asked = []; const reported = [];
  const stream = fakeStream(['far'], []);
  const got = await openSystemStream({ platform: 'linux', enumerateDevices: async () => [MIC, MONITOR], getUserMedia: async (c) => { asked.push(c); return stream; }, reportMonitor: (m) => reported.push(m) });
  assert.equal(got, stream);
  assert.deepEqual(asked, [{ audio: { deviceId: { exact: 'mon1' }, echoCancellation: false, noiseSuppression: false, autoGainControl: false } }]);
  assert.deepEqual(reported, [{ deviceId: 'mon1', label: 'Monitor of Built-in Audio Analog Stereo' }]);
});

test('Linux: empty labels mean no microphone was ever opened here, so one is opened and closed once and the list is read again; none found is reported as null', async () => {
  const blank = [{ kind: 'audioinput', label: '', deviceId: 'a' }, { kind: 'audioinput', label: '', deviceId: 'b' }];
  let calls = 0; const opened = []; const reported = [];
  const warm = fakeStream(['mic'], []);
  warm.getTracks = () => warm.tracks;
  const found = await probeMonitor({ platform: 'linux', enumerateDevices: async () => (++calls === 1 ? blank : [MIC, MONITOR]), getUserMedia: async (c) => { opened.push(c); return warm; }, reportMonitor: (m) => reported.push(m) });
  assert.deepEqual(opened, [{ audio: true }], 'one plain microphone open');
  assert.equal(warm.tracks[0].stopped, true, 'closed at once');
  assert.equal(calls, 2);
  assert.deepEqual(found, { deviceId: 'mon1', label: 'Monitor of Built-in Audio Analog Stereo' });
  assert.deepEqual(reported, [found]);
  const none = await probeMonitor({ platform: 'linux', enumerateDevices: async () => [MIC], reportMonitor: (m) => reported.push(m) });
  assert.equal(none, null);
  assert.equal(reported[1], null, 'main hears that there is none');
  assert.equal(await probeMonitor({ platform: 'win32', enumerateDevices: async () => [MIC, MONITOR] }), null, 'only Linux has monitors');
});

test('Linux: watchMonitor probes now and on every device change until disposed; a no-op elsewhere', async () => {
  const reported = []; let handler = null; let removed = 0;
  let list = [MIC];
  const off = watchMonitor({ platform: 'linux', enumerateDevices: async () => list, reportMonitor: (m) => reported.push(m), onDeviceChange: (fn) => { handler = fn; return () => { removed++; }; } });
  await new Promise((r) => setTimeout(r, 5));
  assert.deepEqual(reported, [null]);
  list = [MIC, MONITOR];
  handler();
  await new Promise((r) => setTimeout(r, 5));
  assert.deepEqual(reported[1], { deviceId: 'mon1', label: 'Monitor of Built-in Audio Analog Stereo' });
  off();
  assert.equal(removed, 1);
  let armed = 0;
  watchMonitor({ platform: 'darwin', enumerateDevices: async () => [MONITOR], reportMonitor: () => armed++, onDeviceChange: () => { armed++; return () => {}; } })();
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(armed, 0);
});

test('main: the puck window\'s session answers a display request with the primary screen and loopback audio on Windows; status and source say renderer there', () => {
  const puck = read('src/main/puck.ts');
  assert.match(puck, /function installLoopback\(w: BrowserWindow\): void \{[\s\S]*?if \(process\.platform !== 'win32'\) return;[\s\S]*?w\.webContents\.session\.setDisplayMediaRequestHandler\(/);
  assert.match(puck, /desktopCapturer\.getSources\(\{ types: \['screen'\], thumbnailSize: \{ width: 1, height: 1 \} \}\)/);
  assert.match(puck, /callback\(\{ video: source, audio: 'loopback' \}\)/);
  assert.match(puck, /installLoopback\(w\);/, 'installed when the puck window is created');
  const main = read('src/main/index.ts');
  assert.match(main, /systemAudioSource: \(\) => \(process\.platform === 'win32' \? 'renderer' : process\.platform === 'linux' \? \(linuxMonitor \? 'renderer' : null\) :/);
  assert.match(main, /ipcMain\.on\('systemAudio:monitor', /, 'main listens for what the puck found');
  assert.match(main, /\? \{ platform: 'linux', available: true, granted: true, source: 'renderer', detail: linuxMonitor\.label \}\s*: \{ platform: 'linux', available: false, granted: true, source: null, reason: 'no-monitor' \}/);
  const pre = read('src/preload/index.ts');
  assert.match(pre, /systemAudioMonitor: \(m: \{ deviceId: string; label: string \} \| null\): void => \{ ipcRenderer\.send\('systemAudio:monitor', m\); \}/);
  assert.match(main, /if \(process\.platform === 'win32'\) return \{ platform: 'win32', available: true, granted: true, source: 'renderer' \};/);
  const app = read('src/renderer/src/puck/PuckApp.tsx');
  assert.match(app, /const them = systemAudio === 'renderer' \? await openSystemStream\(\) : null;/);
  assert.match(app, /const offMonitor = watchMonitor\(\);[\s\S]*?offMonitor\(\);/, 'the watch runs with the puck and is disposed with it');
  const rec = read('src/renderer/src/puck/recorder.ts');
  assert.match(rec, /themStream = m\.kind === 'meeting' && opts\.them && opts\.them\.getAudioTracks\(\)\.length > 0 \? opts\.them : null;/);
});
