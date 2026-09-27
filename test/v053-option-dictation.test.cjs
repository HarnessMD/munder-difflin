'use strict';

// 0.5.3, founder 24 Sep 2026: hold Option (300 ms, alone) to dictate anywhere,
// on by default, with the Stapler's eyes, a live level and start and stop
// sounds. The hold rules run in the real helper (holdInput feeds them without
// pressing a real key), the defaults and the Stapler view run for real, and
// the wiring through main and the Stapler window is read as source.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const loadTs = require('./load-ts.cjs');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const { isHoldKey, hotkeyProblem, defaultPushToTalkKey } = loadTs('src/shared/hotkeyName.ts');
const { chordPresets, chordLabel, chordWords, presetFor } = loadTs('src/shared/hotkeyPresets.ts');
const { withTranscribeDefaults, DEFAULT_TRANSCRIBE } = loadTs('src/shared/transcribeConfig.ts');
const { dictationStep, IDLE_VIEW, METER_BARS, levelOf, DICTATION_SOUNDS, DICTATION_SOUND_GAIN } = loadTs('src/shared/dictationFeedback.ts');
const { AnyAppDictation } = loadTs('src/main/transcribe/anyApp.ts');
const { LineHelper } = loadTs('src/main/transcribe/lineHelper.ts');
const HELPER = path.join(ROOT, 'resources/transcribe/darwin-universal/md-hotkey');

test('Option alone is a hold on the Mac, the default there, and first in its list', () => {
  for (const n of ['Option', 'Alt', 'opt', ' option ']) assert.equal(isHoldKey(n), true, n);
  for (const n of ['Control+Option', 'Option+Space', 'O']) assert.equal(isHoldKey(n), false, n);
  assert.equal(hotkeyProblem('Option', 'darwin'), null);
  assert.equal(hotkeyProblem('Option'), null);
  assert.equal(hotkeyProblem('Option', 'win32'), 'bare-modifier', 'no Windows helper takes a hold in this build');
  assert.equal(defaultPushToTalkKey('darwin'), 'Option');
  assert.equal(defaultPushToTalkKey('win32'), 'Control+Alt+Space');
  assert.equal(chordPresets('pushToTalk', 'darwin')[0], 'Option');
  assert.equal(presetFor('pushToTalk', 'darwin', 'Option'), 'Option');
  assert.equal(chordLabel('Option', 'darwin'), '⌥');
  assert.equal(chordWords('Option', 'darwin'), 'Option');
  assert.ok(!chordPresets('pushToTalk', 'win32').includes('Option'));
});

test('on by default, and the new defaults reach users who never chose the old ones', () => {
  assert.equal(DEFAULT_TRANSCRIBE.anyApp, true);
  assert.equal(DEFAULT_TRANSCRIBE.pushToTalkKey, 'Option');
  assert.equal(DEFAULT_TRANSCRIBE.dictationSounds, true);
  // What main wrote to disk before 0.5.3's defaults, on any dictation save.
  const written = withTranscribeDefaults({ anyApp: false, pushToTalkKey: 'Control+Alt+Space', engine: 'whisper' });
  assert.equal(written.anyApp, true, 'an old default false is not a choice');
  assert.equal(written.pushToTalkKey, 'Option', 'the old default chord is not a choice');
  // A person who chose.
  const chose = withTranscribeDefaults({ anyApp: false, pushToTalkKey: 'Control+Alt+Space', chosen: ['anyApp', 'pushToTalkKey'] });
  assert.equal(chose.anyApp, false);
  assert.equal(chose.pushToTalkKey, 'Control+Alt+Space');
  // A chord that was never a default is always a choice.
  assert.equal(withTranscribeDefaults({ pushToTalkKey: 'Control+Alt+D' }).pushToTalkKey, 'Control+Alt+D');
  assert.equal(withTranscribeDefaults({ dictationSounds: false }).dictationSounds, false);
  assert.deepEqual(withTranscribeDefaults({ chosen: ['anyApp', 'anyApp', 'nonsense'] }).chosen, ['anyApp']);
  // main records the choice when Settings sends the field.
  const main = read('src/main/index.ts');
  assert.match(main, /chosen: \[\.\.\.cur\.chosen, \.\.\.\(p\.anyApp !== undefined \? \['anyApp' as const\] : \[\]\), \.\.\.\(p\.pushToTalkKey !== undefined \? \['pushToTalkKey' as const\] : \[\]\)\]/);
});

const ev = (type, extra = {}) => ({ type, sounds: true, ...extra });
const run = (events) => {
  let v = IDLE_VIEW; const sounds = [];
  for (const e of events) { const r = dictationStep(v, e); v = r.view; if (r.sound) sounds.push(r.sound); }
  return { v, sounds };
};

test('the Stapler view: listening, a live meter, transcribing, back to normal, with one start and one stop', () => {
  let r = run([ev('keydown'), ev('level', { rms: 0.05 }), ev('level', { rms: 0.2 })]);
  assert.equal(r.v.phase, 'listening');
  assert.deepEqual(r.v.levels, [levelOf(0.05), 1]);
  assert.deepEqual(r.sounds, ['start']);
  r = run([ev('keydown'), ev('keyup'), ev('transcribing'), ev('injected', { text: 'hi' })]);
  assert.equal(r.v.phase, 'idle');
  assert.deepEqual(r.sounds, ['start', 'stop']);
  const many = run([ev('keydown'), ...Array.from({ length: 40 }, () => ev('level', { rms: 0.1 }))]);
  assert.equal(many.v.levels.length, METER_BARS, 'the meter keeps its last bars only');
  assert.equal(run([ev('level', { rms: 0.1 })]).v.levels.length, 0, 'no meter while not listening');
  assert.deepEqual(run([ev('keydown'), ev('cancelled', { why: 'key' })]).sounds, ['start', 'stop']);
  assert.equal(run([ev('keydown'), ev('cancelled')]).v.phase, 'idle');
  assert.deepEqual(run([ev('keydown', { sounds: false }), ev('keyup', { sounds: false })]).sounds, [], 'the switch silences both');
  const err = run([ev('error', { error: 'permission', detail: 'accessibility', sounds: false })]).v;
  assert.deepEqual([err.phase, err.error, err.detail], ['error', 'permission', 'accessibility']);
  assert.equal(levelOf(0), 0); assert.equal(levelOf(-1), 0); assert.equal(levelOf(9), 1);
  // Short and quiet: every nudge under 200 ms.
  for (const k of ['start', 'stop']) {
    const end = Math.max(...DICTATION_SOUNDS[k].map((n) => n.at + n.dur));
    assert.ok(end < 0.2, `${k} lasts ${end}s`);
  }
  assert.ok(DICTATION_SOUND_GAIN <= 0.08);
});

// A fake md-hotkey for the loop: arm, then test ops that fire hold events.
const FAKE = path.join(os.tmpdir(), `fake-md-hotkey-hold-${process.pid}.cjs`);
fs.writeFileSync(FAKE, `
const rl = require('node:readline').createInterface({ input: process.stdin });
const out = (o) => process.stdout.write(JSON.stringify(o) + '\\n');
out({ ready: true });
const injected = [];
rl.on('line', (line) => {
  const r = JSON.parse(line);
  if (r.op === 'arm') return out({ id: r.id, ok: true, key: r.key, keyCode: -1, stream: false, hold: true });
  if (r.op === 'inject') { injected.push(r.text); return out({ id: r.id, ok: true, posted: true }); }
  if (r.op === 'injected') return out({ id: r.id, ok: true, list: injected });
  if (r.op === 'take') {
    out({ event: 'keydown' });
    out({ event: 'level', rms: 0.1, peak: 0.3 });
    if (r.cancel) { out({ event: 'cancel', why: 'key', heldMs: 400 }); return out({ id: r.id, ok: true }); }
    out({ event: 'keyup', heldMs: 900 });
    out({ event: 'audio', pcm16: Buffer.alloc(32000).toString('base64'), sampleRate: 16000, seconds: 1 });
    return out({ id: r.id, ok: true });
  }
  if (r.op === 'disarm' || r.op === 'shutdown') { out({ id: r.id, ok: true }); if (r.op === 'shutdown') process.exit(0); }
});
`);
const node = process.execPath;
const wrap = path.join(os.tmpdir(), `fake-md-hotkey-hold-${process.pid}.sh`);
fs.writeFileSync(wrap, `#!/bin/sh\nexec "${node}" "${FAKE}"\n`, { mode: 0o755 });
test.after(() => { for (const f of [FAKE, wrap]) try { fs.unlinkSync(f); } catch { /* gone */ } });

test('the loop: levels reach the Stapler, a cancelled take types nothing, an ignored take leaves no trace', async (t) => {
  const events = [];
  let ignore = false;
  const loop = new AnyAppDictation({
    helperPath: wrap, key: 'Option',
    transcriber: { transcribe: async () => ({ text: 'hello there' }) },
    onEvent: (e) => events.push(e),
    ignore: () => ignore
  });
  const armed = await loop.start();
  // A failed assertion must not leave the fake helper holding the run open.
  t.after(() => loop.stop());
  assert.equal(armed.key, 'Option');
  const helper = loop['helper'];
  await helper.request({ op: 'take' });
  await new Promise((r) => setTimeout(r, 150));
  assert.deepEqual(events.map((e) => e.type), ['keydown', 'level', 'keyup', 'transcribing', 'injected']);
  assert.equal(events[1].rms, 0.1);

  events.length = 0;
  await helper.request({ op: 'take', cancel: true });
  await new Promise((r) => setTimeout(r, 100));
  assert.deepEqual(events.map((e) => e.type), ['keydown', 'level', 'cancelled']);

  events.length = 0;
  ignore = true;
  await helper.request({ op: 'take' });
  await new Promise((r) => setTimeout(r, 150));
  assert.deepEqual(events, [], 'an ignored take says nothing and pastes nothing');
  const { list } = await helper.request({ op: 'injected' });
  assert.deepEqual(list, ['hello there'], 'only the first take was typed');
});

const liveHelper = process.platform === 'darwin' && fs.existsSync(HELPER);
test(`live: the real md-hotkey holds Option by the rules, with no key pressed on this machine${liveHelper ? '' : ' (SKIPPED: needs the Mac helper)'}`, { skip: !liveHelper, timeout: 30000 }, async (t) => {
  const events = [];
  const h = new LineHelper(HELPER, { onEvent: (e) => events.push(e) });
  // A broken helper must fail the test, never hang the suite.
  t.after(() => h.stop().catch(() => undefined));
  const ping = await h.request({ op: 'ping' });
  assert.equal(ping.hold, true); assert.equal(ping.level, true);
  // monitor: false, so someone typing on this Mac cannot change the answers.
  const armed = await h.request({ op: 'arm', key: 'Option', record: false, monitor: false });
  assert.equal(armed.hold, true); assert.equal(armed.holdMs, 300);
  const feed = (input) => h.request({ op: 'holdInput', input });
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const take = async (steps) => { events.length = 0; for (const s of steps) { if (typeof s === 'number') await wait(s); else await feed(s); } await wait(80); return events.map((e) => e.event); };
  assert.deepEqual(await take(['option', 450, 'release']), ['keydown', 'keyup'], 'held alone past 300 ms: a take');
  assert.deepEqual(await take(['option', 120, 'release']), [], 'a short press: nothing');
  assert.deepEqual(await take(['option', 60, 'key', 400, 'release']), [], 'Option+E: nothing');
  assert.deepEqual(await take(['option', 60, 'click', 400, 'release']), [], 'Option+click: nothing');
  assert.deepEqual(await take(['option', 400, 'key', 'release']), ['keydown', 'cancel'], 'a key during the take ends it without text');
  assert.deepEqual(await take(['modifier', 'option', 400, 'release']), [], 'Option+Shift, then Shift up: still nothing');
  assert.deepEqual(await take(['key', 'option', 400, 'release']), ['keydown', 'keyup'], 'typing before Option spoils nothing');
  await h.request({ op: 'shutdown' }).catch(() => undefined);
});

test('a helper that stops reading makes the next write fail as a rejection, never an uncaught EPIPE', async () => {
  // Closes its stdin at once and stays up a moment: the classic EPIPE window.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'epipe-'));
  const script = path.join(dir, 'h.cjs');
  fs.writeFileSync(script, `process.stdout.write('{"ready":true}\\n'); process.stdin.destroy(); setTimeout(() => process.exit(0), 400);`);
  const sh = path.join(dir, 'h.sh');
  fs.writeFileSync(sh, `#!/bin/sh\nexec "${process.execPath}" "${script}"\n`, { mode: 0o755 });
  let uncaught = null;
  const onUncaught = (e) => { uncaught = e; };
  process.on('uncaughtException', onUncaught);
  try {
    const h = new LineHelper(sh);
    const big = 'x'.repeat(256 * 1024); // more than a pipe holds, so the write meets the closed end
    const results = await Promise.allSettled([h.request({ op: 'a', pad: big }), h.request({ op: 'b', pad: big })]);
    await new Promise((r) => setTimeout(r, 500));
    assert.ok(results.every((r) => r.status === 'rejected'), 'both requests reject');
    assert.equal(uncaught, null, `uncaught: ${uncaught && uncaught.message}`);
  } finally {
    process.off('uncaughtException', onUncaught);
    fs.rmSync(dir, { recursive: true, force: true });
  }
  for (const f of ['lineHelper', 'mdSpeech', 'whisperHelper']) {
    assert.match(read(`src/main/transcribe/${f}.ts`), /\.stdin\.on\('error', \(\) => \{ \/\* reported by the write callback \*\/ \}\);/, `${f} listens for stdin errors`);
  }
});

test('wiring: main feeds the Stapler, drops a take Free Flow owns, asks for permissions; the Stapler shows and sounds it', () => {
  const main = read('src/main/index.ts');
  assert.match(main, /puckDictationEvent\(e, withTranscribeDefaults\(readConfig\(\)\.transcribe\)\.dictationSounds\);\n  if \(e\.type === 'level'\) return;/);
  assert.match(main, /ignore: anyAppIgnoresTake/);
  // 25 Sep 2026: in our window Free Flow owns the composer and the terminal; a text field is this take's (v053-option-any-field).
  assert.match(main, /focused !== mainWindow\) return false;\n(\s+\/\/[^\n]*\n)*\s+return anyAppStandsAside\(true, mainDictationFocus\);/);
  assert.match(main, /await askAnyAppPermissionsOnce\(\);/);
  assert.match(main, /puckDictationEvent\(\{ type: 'error', error: 'permission', detail: missing \}, false\)/);
  const puck = read('src/main/puck.ts');
  assert.match(puck, /w\.webContents\.send\('puck:dictation', \{ \.\.\.e, sounds \}\)/);
  assert.match(puck, /autoplayPolicy: 'no-user-gesture-required'/);
  assert.match(read('src/preload/index.ts'), /onPuckDictation: \(cb: \(e: PuckDictationEvent\) => void\)/);
  const app = read('src/renderer/src/puck/PuckApp.tsx');
  assert.match(app, /dict\.phase === 'listening' \|\| dict\.phase === 'transcribing' \|\| \(ringTake && phase !== 'card' && phase !== 'idle'\) \? \{ \.\.\.cfg, expression: 'thinking' \} : cfg/, 'the eyes take the last pose while it listens');
  assert.match(app, /className="puck-meter"/);
  assert.match(app, /className="puck-dictate"[^>]*top: placeFlash\(space, \{ cx, cy, size \}, DICTATE_PILL_H, 10\)\.top/, 'the meter moves above the disc at the bottom of the screen, never cut off');
  assert.match(app, /if \(sound\) playNudge\(sound\);/);
  assert.match(app, /window\.cth\.anyAppOpenSettings\(pane\)/, 'the permission notice has its one fix button');
  // thinking is the last pose in the Stapler's list, the one the founder named.
  assert.match(read('src/shared/puck.ts'), /'sick', 'thinking'\] as const;/);
  const settings = read('src/renderer/src/components/TranscribeSettings.tsx');
  assert.match(settings, /save\(\{ dictationSounds: !cfg\.dictationSounds \}\)/);
  for (const l of ['en', 'ar', 'zh-CN']) {
    const j = JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`));
    for (const k of ['chordHold', 'dictationSounds', 'dictationSoundsDesc']) assert.ok(j.settings.transcribe[k], `${l} ${k}`);
    for (const k of ['listening', 'failed', 'fix']) assert.ok(j.pro.puck.dictation[k], `${l} ${k}`);
    assert.ok(j.pro.puck.dictation.needs.microphone && j.pro.puck.dictation.needs.accessibility);
  }
});
