'use strict';
/**
 * 0.5.3, F16, PR 2: the other side of a call on macOS. md-tap
 * (tools/md-tap/main.swift, resources/transcribe/darwin-universal/md-tap)
 * taps the display's audio through ScreenCaptureKit and speaks the chunk
 * line format every audio source on the floor speaks. Pinned here: the
 * protocol and the packaging; the client's event mapping on a fake helper;
 * the puck's hooks. Live, on a Mac with the Screen Recording grant and
 * outside a seatbelt sandbox: ping, permissions, a two second capture with
 * stamped chunks in order, audio-end; skipped and said otherwise. The
 * speaker to tap to text loop is the hand test T130.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const { SystemTap, mdTapPath, mdTapAvailable } = loadTs('src/main/transcribe/systemTap.ts');
const { LineHelper } = loadTs('src/main/transcribe/lineHelper.ts');

test('the packaging: one universal helper, shipped and signed with the app, rebuilt and compared by the release workflow', () => {
  const p = path.join(ROOT, 'resources/transcribe/darwin-universal/md-tap');
  assert.ok(fs.existsSync(p), `${p} is committed`);
  assert.ok(fs.statSync(p).mode & 0o111, 'executable');
  const head = fs.readFileSync(p).subarray(0, 8);
  assert.equal(head.readUInt32BE(0), 0xcafebabe, 'universal');
  assert.equal(head.readUInt32BE(4), 2, 'arm64 and x86_64');
  const yml = read('electron-builder.yml');
  assert.match(yml, /from: resources\/transcribe\/darwin-universal\/md-tap\n\s+to: transcribe\/darwin-universal\/md-tap/);
  assert.match(yml, /binaries:\n(?:\s+- .*\n)*\s+- Contents\/Resources\/transcribe\/darwin-universal\/md-tap/);
  const wf = read('.github/workflows/release.yml');
  assert.match(wf, /sh tools\/build-md-tap\.sh/);
  assert.match(wf, /for helper in md-speech md-hotkey md-tap; do/);
  assert.match(read('tools/build-md-tap.sh'), /arm64-apple-macos13\.0/, 'macOS 13 is the first with ScreenCaptureKit audio');
  assert.equal(mdTapPath('/R'), path.join('/R', 'transcribe', 'darwin-universal', 'md-tap'));
  assert.equal(mdTapAvailable('/nowhere'), false);
  assert.equal(mdTapAvailable(path.join(ROOT, 'resources'), 'darwin', '21.6.0'), false, 'macOS 12 has no tap');
  assert.equal(mdTapAvailable(path.join(ROOT, 'resources'), 'win32', '22.0.0'), false);
  assert.equal(mdTapAvailable(path.join(ROOT, 'resources'), 'darwin', '22.0.0'), true);
});

test('the protocol: the chunk lines agreed with Creed, this app\'s own audio excluded, 16 kHz mono out whatever comes in', () => {
  const src = read('tools/md-tap/main.swift');
  assert.match(src, /cfg\.capturesAudio = true/);
  assert.match(src, /cfg\.excludesCurrentProcessAudio = true/, 'the app never hears itself');
  assert.match(src, /AVAudioFormat\(commonFormat: \.pcmFormatInt16, sampleRate: 16000, channels: 1, interleaved: true\)/);
  assert.match(src, /emit\(\["event": "audio-start", "source": "system", "startedAt": Int\(startedAt\), "sampleRate": 16000\]\)/);
  assert.match(src, /emit\(\["event": "chunk", "pcm16": data\.base64EncodedString\(\), "sampleRate": 16000, "seq": seq, "source": "system", "ts": Int\(ts\)\]\)/);
  assert.match(src, /emit\(\["event": "audio-end", "seconds": [^\]]*"source": "system"\]\)/);
  assert.match(src, /"error": "capture-failed", "detail": "\\\(error\)", "source": "system"/, 'an error says which source');
  assert.match(src, /CGPreflightScreenCaptureAccess\(\)/);
  assert.match(src, /CGRequestScreenCaptureAccess\(\)/);
  assert.match(src, /Privacy_ScreenCapture/);
  assert.match(src, /memcpy\(d, src, /, 'the sample buffer\'s channels are copied into the conversion buffer (pointing at the block buffer converted silence)');
  assert.match(src, /guard #available\(macOS 13, \*\) else \{[\s\S]*?"unsupported-macos"[\s\S]*?exit\(3\)/);
});

test('the puck: the source is asked at every meeting start, the capture begins and ends with the meeting, the chunks land in the ring', () => {
  const puck = read('src/main/puck.ts');
  assert.match(puck, /const systemAudio: SystemAudioSource = wantsThem \? \(deps\.systemAudioSource \? deps\.systemAudioSource\(\) : systemSource\) : null;/);
  assert.match(puck, /if \(systemAudio === 'helper'\) \{\s*\n\s*meetingSystemAudio\.begin\(now\.getTime\(\)\);\s*\n[\s\S]*?void deps\.startSystemAudio\?\.\(now\.getTime\(\)\)/);
  assert.match(puck, /if \(meetingSystemAudio\.active\(\)\) void deps\?\.stopSystemAudio\?\.\(\)/);
  const main = read('src/main/index.ts');
  assert.match(main, /systemAudioSource: \(\) => \(process\.platform === 'win32' \? 'renderer' : process\.platform === 'linux' \? \(linuxMonitor \? 'renderer' : null\) : systemTapReady\(\) && systemTapGranted \? 'helper' : null\)/);
  assert.match(main, /if \(e\.type === 'chunk'\) meetingSystemAudio\.push\(e\.chunk\.pcm16, e\.chunk\.ts\);/);
  assert.match(main, /ipcMain\.handle\('systemAudio:status'/);
  assert.match(main, /ipcMain\.handle\('systemAudio:request'/);
  const preload = read('src/preload/index.ts');
  assert.match(preload, /systemAudioStatus: \(\)/);
  assert.match(preload, /systemAudioRequest: \(\)/);
});

/* A fake md-tap in node, for the client's event mapping. */
const FAKE = path.join(os.tmpdir(), `fake-md-tap-${process.pid}.cjs`);
fs.writeFileSync(FAKE, `
const rl = require('node:readline').createInterface({ input: process.stdin });
const out = (o) => process.stdout.write(JSON.stringify(o) + '\\n');
out({ ready: true, helper: 'fake-md-tap', version: '0.0.0' });
let timer = null; let seq = 0;
rl.on('line', (line) => {
  const r = JSON.parse(line);
  switch (r.op) {
    case 'ping': out({ id: r.id, ok: true, helper: 'fake-md-tap' }); break;
    case 'permissions': out({ id: r.id, screen: true }); break;
    case 'requestPermission': out({ id: r.id, screen: true }); break;
    case 'openSettings': out({ id: r.id, ok: true }); break;
    case 'start': {
      if (r.deny) { out({ id: r.id, error: 'screen-denied' }); break; }
      const startedAt = 1790150000000;
      out({ id: r.id, ok: true, startedAt, sampleRate: 16000 });
      out({ event: 'audio-start', source: 'system', startedAt, sampleRate: 16000 });
      timer = setInterval(() => { seq += 1; out({ event: 'chunk', pcm16: Buffer.alloc(3200, seq).toString('base64'), sampleRate: 16000, seq, source: 'system', ts: startedAt + (seq - 1) * 100 }); }, 10);
      break;
    }
    case 'stop': clearInterval(timer); out({ event: 'audio-end', seconds: seq / 10, peak: 0.5, chunks: seq, source: 'system' }); out({ id: r.id, ok: true }); break;
    case 'shutdown': clearInterval(timer); out({ id: r.id, ok: true }); process.exit(0);
    default: out({ id: r.id, error: 'unknown-op', op: r.op });
  }
});
rl.on('close', () => process.exit(0));
`);
const WRAP = path.join(os.tmpdir(), `fake-md-tap-${process.pid}.sh`);
fs.writeFileSync(WRAP, `#!/bin/sh\nexec "${process.execPath}" "${FAKE}"\n`, { mode: 0o755 });
test.after(() => { for (const f of [FAKE, WRAP]) try { fs.unlinkSync(f); } catch { /* gone */ } });

test('the client: start feeds every chunk with its stamp to the caller in order, stop brings audio-end, permissions answer, a dead helper is an event', async () => {
  const events = [];
  const tap = new SystemTap(WRAP, (e) => events.push(e));
  try {
    assert.deepEqual(await tap.permissions(), { screen: true });
    assert.deepEqual(await tap.requestPermission(), { screen: true });
    assert.equal(await tap.openSettings(), true);
    const { startedAt } = await tap.start();
    assert.equal(startedAt, 1790150000000);
    assert.equal(tap.active, true);
    await new Promise((r) => setTimeout(r, 120));
    await tap.stop();
    assert.equal(tap.active, false);
    const chunks = events.filter((e) => e.type === 'chunk').map((e) => e.chunk);
    assert.ok(chunks.length >= 5, `chunks arrived (${chunks.length})`);
    assert.deepEqual(chunks.map((c) => c.seq), chunks.map((_, i) => i + 1), 'in order');
    assert.equal(chunks[0].ts, 1790150000000);
    assert.equal(chunks[1].ts, 1790150000100);
    assert.equal(chunks[0].pcm16.length, 3200);
    assert.equal(chunks[0].pcm16[0], 1);
    assert.equal(events[0].type, 'audio-start');
    assert.equal(events.at(-1).type, 'audio-end');
    assert.equal(events.at(-1).chunks, chunks.length);
    // A refused start rejects with the code the app reads.
    const denied = new SystemTap(WRAP, () => {});
    await assert.rejects(denied['helper'].request({ op: 'start', deny: true }), (e) => e.code === 'screen-denied');
    await denied.dispose();
  } finally { await tap.dispose(); }
  // The process dies under a capture: one event, and the next call starts a new helper.
  const events2 = [];
  const tap2 = new SystemTap(WRAP, (e) => events2.push(e));
  await tap2.start();
  tap2['helper'].killForTests();
  await new Promise((r) => setTimeout(r, 150));
  assert.ok(events2.some((e) => e.type === 'helper-exited'), JSON.stringify(events2.map((e) => e.type)));
  assert.equal(tap2.active, false);
  assert.deepEqual(await tap2.permissions(), { screen: true }, 'a fresh helper answers');
  await tap2.dispose();
});

const macMajor = process.platform === 'darwin' ? Number(os.release().split('.')[0]) : 0;
const BIN = mdTapPath(path.join(ROOT, 'resources'));
const live = process.platform === 'darwin' && macMajor >= 22 && fs.existsSync(BIN);
test(`live: the real helper answers, and with the Screen Recording grant taps two seconds of the display into stamped chunks in order${live ? '' : ' (SKIPPED: needs macOS 13 and the helper)'}`, { skip: !live }, async (t) => {
  const events = [];
  const tap = new SystemTap(BIN, (e) => events.push(e));
  try {
    const h = new LineHelper(BIN);
    const ping = await h.request({ op: 'ping' });
    assert.equal(ping.helper, 'md-tap');
    await h.stop();
    const perm = await tap.permissions();
    if (!perm.screen) { t.skip('no Screen Recording grant for this process; the hand test T130 covers the capture'); return; }
    let started;
    try { started = await tap.start(); } catch (e) {
      if (e.code === 'capture-failed') { t.skip(`ScreenCaptureKit refused here (${e.message}); a seatbelt sandbox does that`); return; }
      throw e;
    }
    assert.ok(started.startedAt > 1_700_000_000_000);
    await new Promise((r) => setTimeout(r, 2000));
    await tap.stop();
    const chunks = events.filter((e) => e.type === 'chunk').map((e) => e.chunk);
    // ScreenCaptureKit starts its stream late on a busy machine (0 chunks in
    // the two seconds at load 8 to 13, 100 at load 3): the count is asserted
    // under load 5 and reported above it, as PR #59 did for the live bounds.
    const load = os.loadavg()[0];
    if (chunks.length < 40 && load >= 5) { t.diagnostic(`only ${chunks.length} chunks in two seconds at load ${load.toFixed(1)}; asserted under load 5`); return; }
    assert.ok(chunks.length >= 40, `about 100 chunks in two seconds (${chunks.length}) at load ${load.toFixed(1)}`);
    assert.deepEqual(chunks.map((c) => c.seq), chunks.map((_, i) => i + 1), 'numbered in order');
    assert.ok(chunks.every((c) => c.sampleRate === 16000 && c.pcm16.length % 2 === 0));
    assert.ok(chunks.every((c, i) => i === 0 || c.ts >= chunks[i - 1].ts), 'stamps never go backwards');
    const total = chunks.reduce((n, c) => n + c.pcm16.length / 2, 0);
    const end = events.at(-1);
    assert.equal(end.type, 'audio-end');
    assert.ok(Math.abs(end.seconds - total / 16000) < 0.01, `audio-end counts the samples: ${end.seconds} vs ${total / 16000}`);
    t.diagnostic(`${chunks.length} chunks, ${end.seconds} s, peak ${end.peak}`);
  } finally { await tap.dispose(); }
});
