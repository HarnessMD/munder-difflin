'use strict';

/* 0.5.3, F16 (Creed, 23 Sep 2026): the md-hotkey helper of THIS platform,
 * driven over its protocol. On macOS that is the Swift helper checked in
 * under darwin-universal/ (its deeper live test is in
 * v053-any-app-dictation.test.cjs); on Windows and Linux the C helpers from
 * tools/md-hotkey-native, built by tools/build-transcribe-helpers.mjs, which
 * is why this runs in helpers-ci.yml on the matching runner. What a runner
 * allows: ping, permissions, arm a good key, refuse a bare letter and a made
 * up modifier, disarm, a dry run paste that puts the clipboard back, and a
 * recording on a machine with no microphone answering capture-failed. The key
 * pressed for real and the microphone are hand tests T127 to T129.
 *
 * Also the pure parts of the platform split in anyApp.ts: the helper path
 * per platform and the reasons the switch stays off (no helper, Wayland). */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { mdHotkeyPath, mdHotkeyAvailable, anyAppUnavailableReason, isWaylandSession } = loadTs('src/main/transcribe/anyApp.ts');
const { LineHelper, HelperError } = loadTs('src/main/transcribe/lineHelper.ts');

const ROOT = path.join(__dirname, '..');
const RESOURCES = path.join(ROOT, 'resources');

test('the helper path follows the platform, and the reasons the switch stays off are the right words', () => {
  assert.equal(mdHotkeyPath('/r', 'darwin'), path.join('/r', 'transcribe', 'darwin-universal', 'md-hotkey'));
  assert.equal(mdHotkeyPath('/r', 'win32'), path.join('/r', 'transcribe', 'win32-x64', 'md-hotkey.exe'));
  assert.equal(mdHotkeyPath('/r', 'linux'), path.join('/r', 'transcribe', 'linux-x64', 'md-hotkey'));
  assert.equal(mdHotkeyAvailable('/nowhere', 'linux'), false);
  assert.equal(anyAppUnavailableReason('/nowhere', 'win32', {}), 'no-helper');
  // A Linux with the helper on disk: X11 is fine, a Wayland session is not.
  const fake = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'md-hotkey-res-'));
  fs.mkdirSync(path.join(fake, 'transcribe', 'linux-x64'), { recursive: true });
  fs.writeFileSync(path.join(fake, 'transcribe', 'linux-x64', 'md-hotkey'), '');
  assert.equal(anyAppUnavailableReason(fake, 'linux', { DISPLAY: ':0', XDG_SESSION_TYPE: 'x11' }), null);
  assert.equal(anyAppUnavailableReason(fake, 'linux', { XDG_SESSION_TYPE: 'wayland', DISPLAY: ':0' }), 'wayland', 'XWayland does not make a global grab work');
  assert.equal(anyAppUnavailableReason(fake, 'linux', { WAYLAND_DISPLAY: 'wayland-0' }), 'wayland');
  assert.equal(anyAppUnavailableReason(fake, 'darwin', { XDG_SESSION_TYPE: 'wayland' }), 'no-helper', 'the darwin helper is a different file');
  assert.equal(isWaylandSession({ XDG_SESSION_TYPE: 'x11', WAYLAND_DISPLAY: 'wayland-0', DISPLAY: ':1' }), false, 'an X11 session with a Wayland socket around is X11');
  // A floor (B23): the key is machine wide, the main floor owns it, so the
  // floor's Settings says so before the helper is even looked for.
  assert.equal(anyAppUnavailableReason(fake, 'linux', { DISPLAY: ':0', XDG_SESSION_TYPE: 'x11' }, { floor: true }), 'floor');
  assert.equal(anyAppUnavailableReason('/nowhere', 'win32', {}, { floor: true }), 'floor', 'floor wins over no-helper');
  assert.equal(anyAppUnavailableReason(fake, 'linux', { XDG_SESSION_TYPE: 'wayland' }, { floor: true }), 'floor', 'floor wins over wayland');
  assert.equal(anyAppUnavailableReason(fake, 'linux', { DISPLAY: ':0', XDG_SESSION_TYPE: 'x11' }, { floor: false }), null);
  fs.rmSync(fake, { recursive: true, force: true });
});

// MD_HOTKEY_BIN points the live test at another build of a helper: the Linux
// helper compiled on a Mac against Homebrew's X11 and PulseAudio and driven
// under Xvfb, when the runners are not available. MD_HOTKEY_PLATFORM says
// which helper that is (win32, linux); it defaults to this process's.
const BIN = process.env.MD_HOTKEY_BIN || mdHotkeyPath(RESOURCES);
const HELPER_PLATFORM = process.env.MD_HOTKEY_PLATFORM || process.platform;
const built = fs.existsSync(BIN);
const skip = built ? false : `no md-hotkey for ${process.platform} at ${BIN} (node tools/build-transcribe-helpers.mjs)`;
const wayland = HELPER_PLATFORM === 'linux' && isWaylandSession();

// The F key the live test grabs. F19 on Windows and the Mac; on Linux, F12,
// because many X keymaps (Ubuntu 24.04's Xvfb among them) give F19 no key
// code at all, which the helper answers with register-failed, no-keycode.
const FK = HELPER_PLATFORM === 'linux' ? 'F12' : 'F19';

test(`live: this platform's md-hotkey answers, arms and refuses keys, pastes dry, and says what it cannot do${skip ? ` (SKIPPED: ${skip})` : ''}`, { skip, timeout: 60_000 }, async () => {
  const events = [];
  const h = new LineHelper(BIN, { onEvent: (e) => events.push(e) });
  // Hard limits (CI 25 Sep: a Windows reply that never came held the runner
  // 35 minutes): every request answers within 15 s or the helper is killed and
  // the test fails naming the op; and the helper never outlives 50 s, so a
  // stuck child cannot keep node, and the job, alive after the test's timeout.
  const watchdog = setTimeout(() => h.killForTests(), 50_000);
  const req = (r, ...rest) => {
    let timer;
    const late = new Promise((_, reject) => { timer = setTimeout(() => { h.killForTests(); reject(new Error(`md-hotkey did not answer ${r.op} within 15 s`)); }, 15_000); });
    return Promise.race([h.request(r, ...rest), late]).finally(() => clearTimeout(timer));
  };
  try {
    const ping = await req({ op: 'ping' });
    assert.equal(ping.helper, 'md-hotkey');
    assert.equal(ping.stream, true, 'every helper streams while the key is held');
    if (HELPER_PLATFORM !== 'darwin') assert.ok(['win32', 'linux'].includes(ping.platform), String(ping.platform));

    const perms = await req({ op: 'permissions' }, undefined, (l) => 'mic' in l || 'error' in l);
    assert.ok(['authorized', 'denied', 'notDetermined', 'restricted'].includes(perms.mic), String(perms.mic));
    assert.equal(typeof perms.accessibility, 'boolean');
    assert.equal(typeof perms.postEvent, 'boolean');

    if (wayland) {
      // The whole point on Wayland: said plainly, nothing armed.
      assert.equal(ping.unsupported, 'wayland');
      await assert.rejects(req({ op: 'arm', key: `Control+Alt+${FK}` }), (e) => e instanceof HelperError && e.code === 'wayland-unsupported');
      await assert.rejects(req({ op: 'inject', text: 'x', dryRun: true }), (e) => e.code === 'wayland-unsupported');
      return;
    }

    // Arming: a modifier plus a key, or an F key alone; never a bare letter,
    // never a modifier nobody has.
    let armed;
    try {
      armed = await req({ op: 'arm', key: `Control+Alt+${FK}`, record: false });
    } catch (e) {
      // macOS inside a seatbelt sandbox cannot register hot keys (Carbon -9868).
      if (HELPER_PLATFORM === 'darwin' && e instanceof HelperError && e.code === 'register-failed') return;
      throw e;
    }
    assert.equal(armed.ok, true);
    assert.ok(Number(armed.keyCode) > 0, `a key code: ${armed.keyCode}`);
    assert.equal(armed.modifiers, 4096 + 2048, 'control plus option in the Carbon numbering every helper uses');
    assert.equal(armed.record, false);
    await assert.rejects(req({ op: 'arm', key: 'a' }), (e) => e.code === 'bad-key');
    await assert.rejects(req({ op: 'arm', key: 'Hyper+Q' }), (e) => e.code === 'bad-key');
    await assert.rejects(req({ op: 'arm', key: '' }), (e) => e.code === 'bad-key');
    const fOnly = await req({ op: 'arm', key: FK });
    assert.equal(fOnly.modifiers, 0, 'an F key alone is allowed');
    const again = await req({ op: 'arm', key: 'Control+Shift+Space', record: true, stream: true });
    assert.equal(again.stream, true);
    await req({ op: 'disarm' });

    // The tap slot (Stanley's meeting chord): its own key, one event per
    // press, separate from arm. A helper without the op has no "tap" on its
    // ping; the Windows and Linux helpers always have it.
    if (HELPER_PLATFORM !== 'darwin') assert.equal(ping.tap, true, 'the native helpers carry the tap op');
    if (ping.tap === true) {
      const tp = await req({ op: 'tap', key: `Control+Shift+${FK}` });
      assert.equal(tp.ok, true);
      assert.equal(tp.key, `Control+Shift+${FK}`);
      assert.ok(Number(tp.keyCode) > 0, `a key code: ${tp.keyCode}`);
      assert.equal(tp.modifiers, 4096 + 512, 'control plus shift, the Carbon numbering');
      await assert.rejects(req({ op: 'tap', key: 'b' }), (e) => e.code === 'bad-key', 'the same parser, the same refusals');
      await assert.rejects(req({ op: 'tap', key: 'Shift' }), (e) => e.code === 'bad-key');
      // The two slots never share a chord, in either order.
      const both = await req({ op: 'arm', key: `Control+Alt+${FK}`, record: false });
      assert.equal(both.ok, true, 'arm beside a tap');
      await assert.rejects(req({ op: 'tap', key: `Control+Alt+${FK}` }), (e) => e.code === 'register-failed' && e.detail?.detail === 'in-use-by-arm');
      await assert.rejects(req({ op: 'arm', key: `Control+Shift+${FK}` }), (e) => e.code === 'register-failed' && e.detail?.detail === 'in-use-by-tap');
      // disarm leaves the tap alone: the chord is still taken by the tap slot.
      await req({ op: 'disarm' });
      await assert.rejects(req({ op: 'arm', key: `Control+Shift+${FK}` }), (e) => e.code === 'register-failed' && e.detail?.detail === 'in-use-by-tap');
      // The capture chord (founder, 23 Sep): Control+Shift+PrintScreen on
      // Windows (VK_SNAPSHOT) and Linux (XK_Print); 'PrintScreen' is the name
      // main sends, 'Print' and 'PrtSc' are accepted too. Bare, it is refused
      // like any key that is not an F key.
      if (HELPER_PLATFORM !== 'darwin') {
        await req({ op: 'untap' });
        const ps = await req({ op: 'tap', key: 'Control+Shift+PrintScreen' });
        assert.equal(ps.ok, true, 'PrintScreen with modifiers is a chord');
        assert.equal(ps.modifiers, 4096 + 512);
        assert.ok(Number(ps.keyCode) > 0, `PrintScreen has a key code here: ${ps.keyCode}`);
        if (HELPER_PLATFORM === 'win32') assert.equal(ps.keyCode, 44, 'VK_SNAPSHOT');
        await assert.rejects(req({ op: 'tap', key: 'PrintScreen' }), (e) => e.code === 'bad-key', 'bare PrintScreen is refused');
        const alias = await req({ op: 'tap', key: 'Control+Shift+Print' });
        assert.equal(alias.keyCode, ps.keyCode, 'Print is the same key');
        await req({ op: 'untap' });
        await req({ op: 'tap', key: `Control+Shift+${FK}` });
      }
      // untap frees it, and a second untap is nothing.
      const ut = await req({ op: 'untap' });
      assert.equal(ut.ok, true);
      assert.equal((await req({ op: 'untap' })).ok, true);
      const freed = await req({ op: 'arm', key: `Control+Shift+${FK}`, record: false });
      assert.equal(freed.ok, true, 'the chord is free after untap');
      await req({ op: 'disarm' });
    }

    // A dry run paste: the clipboard is written and put back, no keystroke.
    const dry = await req({ op: 'inject', text: 'md-hotkey test é "quoted"', dryRun: true, restoreMs: 60 });
    assert.equal(dry.posted, false);
    assert.equal(dry.restored, true);
    assert.equal(dry.dryRun, true);
    await assert.rejects(req({ op: 'inject', dryRun: true }), (e) => e.code === 'bad-request', 'no text is refused');

    // A recording. A runner has no microphone: the helper says capture-failed
    // (an error event and the request's error) rather than hanging. A machine
    // with one gives the audio event with 16 kHz PCM, like the Mac helper.
    if (HELPER_PLATFORM !== 'darwin') {
      let audio = null;
      const before = events.length;
      try {
        const rec = await req({ op: 'record', seconds: 0.4 }, undefined, (l) => 'ok' in l || 'error' in l);
        assert.equal(rec.ok, true);
        audio = events.slice(before).find((e) => e.event === 'audio');
        assert.ok(audio, 'an audio event came before the reply');
        assert.equal(audio.sampleRate, 16000);
        assert.equal(audio.source, 'mic');
        assert.ok(Math.abs(Buffer.from(audio.pcm16, 'base64').length - audio.seconds * 32000) < 2 * 640, 'the bytes match the seconds to a chunk');
      } catch (e) {
        if (!(e instanceof HelperError && e.code === 'capture-failed')) throw e;
        const err = events.slice(before).find((x) => x.event === 'error');
        assert.ok(err && err.error === 'capture-failed', 'the error event names the same failure');
      }
    }

    await assert.rejects(req({ op: 'nope' }), (e) => e.code === 'unknown-op');
    const bye = await req({ op: 'shutdown' });
    assert.equal(bye.ok, true);
  } finally {
    clearTimeout(watchdog);
    await h.stop().catch(() => undefined);
  }
});

test('the push to talk default is per platform: the Option hold on the Mac (#110 unchanged), Control+Alt+Space on Windows and Linux', () => {
  const { withTranscribeDefaults, defaultPushToTalkKeyFor } = loadTs('src/shared/transcribeConfig.ts');
  assert.equal(defaultPushToTalkKeyFor('darwin'), 'Option');
  assert.equal(defaultPushToTalkKeyFor('win32'), 'Control+Alt+Space');
  assert.equal(defaultPushToTalkKeyFor('linux'), 'Control+Alt+Space');
  // The Mac, exactly as #110 made it: a new install and an unchosen old default get Option; a chosen key stays.
  assert.equal(withTranscribeDefaults({}, 'darwin').pushToTalkKey, 'Option');
  assert.equal(withTranscribeDefaults({ pushToTalkKey: 'Control+Alt+Space' }, 'darwin').pushToTalkKey, 'Option');
  assert.equal(withTranscribeDefaults({ pushToTalkKey: 'Control+Alt+Space', chosen: ['pushToTalkKey'] }, 'darwin').pushToTalkKey, 'Control+Alt+Space');
  assert.equal(withTranscribeDefaults({ pushToTalkKey: 'F13' }, 'darwin').pushToTalkKey, 'F13');
  // Windows and Linux: the helpers take chords; a bare Option can never be armed there.
  for (const p of ['win32', 'linux']) {
    assert.equal(withTranscribeDefaults({}, p).pushToTalkKey, 'Control+Alt+Space', p);
    assert.equal(withTranscribeDefaults({ pushToTalkKey: 'Control+Alt+Space' }, p).pushToTalkKey, 'Control+Alt+Space', `${p}: the old default is this platform's default`);
    assert.equal(withTranscribeDefaults({ pushToTalkKey: 'Option' }, p).pushToTalkKey, 'Control+Alt+Space', `${p}: a bare Option written by an earlier 0.5.3 goes back`);
    assert.equal(withTranscribeDefaults({ pushToTalkKey: 'Option', chosen: ['pushToTalkKey'] }, p).pushToTalkKey, 'Control+Alt+Space', `${p}: even chosen, a bare Option cannot arm`);
    assert.equal(withTranscribeDefaults({ pushToTalkKey: 'Control+Shift+D', chosen: ['pushToTalkKey'] }, p).pushToTalkKey, 'Control+Shift+D');
  }
  // main arms with the platform's key when none is given.
  const main = fs.readFileSync(path.join(__dirname, '..', 'src/main/index.ts'), 'utf8');
  assert.ok(!/DEFAULT_PUSH_TO_TALK_KEY/.test(main), 'main never falls back to the Mac key on every platform');
  assert.match(main, /return startAnyApp\(typeof key === 'string' && key \? key : defaultPushToTalkKeyFor\(process\.platform\)/);
});
