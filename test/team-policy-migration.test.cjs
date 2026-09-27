'use strict';

/**
 * 0.4.10 B1 — THE MIGRATION, THE STATUS, THE SCHEDULE, AND THE FILE GUARD.
 *
 * `NetworkLevel` was three words on one axis and it is now `TeamPolicy` on
 * three. There is no migration script, on purpose: every read goes through
 * `normalizePolicy`, so an install upgrading from 0.4.9 gets the right policy
 * on its first read and the right shape on its first write. That is only true
 * if it is actually true, which is what the first half of this file checks,
 * against a REAL trust.json written the way 0.4.9 wrote one.
 *
 * The second half is the file guard. A share publishes a file from the
 * person's disk to the public internet, so the rule that decides which files
 * an agent may publish is a security rule and is tested as one: a real symlink
 * on a real disk, pointing out of a real workspace, must not be shareable.
 *
 * Runs sandboxed: it touches only `os.tmpdir()` and never a socket.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

/* ---- one machine, one userData -------------------------------------------- */

const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'cth-policy-'));
const electronPath = require.resolve('electron');
require.cache[electronPath] = {
  id: electronPath, filename: electronPath, loaded: true,
  exports: { app: { getPath: () => userData } },
};

const pins = loadTs('src/main/teamPins.ts');
const policy = loadTs('src/shared/teamPolicy.ts');
const share = loadTs('src/shared/fileShareMessage.ts');

const trustFile = () => path.join(userData, 'teams', 'trust.json');
const writeTrust = (value) => {
  fs.mkdirSync(path.dirname(trustFile()), { recursive: true });
  fs.writeFileSync(trustFile(), JSON.stringify(value, null, 2));
};
const readTrust = () => JSON.parse(fs.readFileSync(trustFile(), 'utf8'));

const OFF = { receive: false, send: false, commands: false };
const LISTEN = { receive: true, send: false, commands: false };
const CONVERSE = { receive: true, send: true, commands: false };
const OPEN = { receive: true, send: true, commands: true };

test.beforeEach(() => { fs.rmSync(trustFile(), { force: true }); });

/* ---- the migration --------------------------------------------------------- */

test('a 0.4.9 trust file migrates on READ, with no migration script and no lost override', () => {
  // Exactly what 0.4.9 wrote: three words, one axis, and no policy anywhere.
  writeTrust({
    pins: {},
    youAllow: { mem_a: 'strict', mem_b: 'communication-only', mem_c: 'allow-all' },
    youAllowDefault: 'communication-only',
  });

  assert.deepEqual(pins.youPolicyFor('mem_a'), OFF);
  assert.deepEqual(pins.youPolicyFor('mem_b'), CONVERSE);
  assert.deepEqual(pins.youPolicyFor('mem_c'), OPEN);
  assert.deepEqual(pins.youPolicyDefault(), CONVERSE);
  // Absent is NOT off. It means "follow the default", and a reset control has
  // nothing to say if the two look the same.
  assert.equal(pins.youPolicyFor('mem_never_seen'), undefined);
});

test('an unrecognised stored value fails CLOSED, which is the classic bug in this area', () => {
  writeTrust({
    pins: {},
    youAllow: { mem_a: 'allow-everything', mem_b: 'ALLOW-ALL' },
    youAllowDefault: 'yes',
  });
  // Not one of the three words, so `presetFromLegacy` answers `off`. Anything
  // that read this as "unknown, therefore permitted" would be a silent grant.
  assert.deepEqual(pins.youPolicyFor('mem_a'), OFF);
  assert.deepEqual(pins.youPolicyFor('mem_b'), OFF, 'the match must be exact, not case folded');
  assert.deepEqual(pins.youPolicyDefault(), OFF);

  // A half written object cannot produce `undefined` in a boolean position.
  writeTrust({ pins: {}, youAllow: {}, youPolicy: { mem_x: { send: true } } });
  assert.deepEqual(pins.youPolicyFor('mem_x'), { receive: false, send: true, commands: false });
  // `commands` implies `receive`, repaired on read rather than at every caller.
  writeTrust({ pins: {}, youAllow: {}, youPolicy: { mem_x: { commands: true } } });
  assert.deepEqual(pins.youPolicyFor('mem_x'), { receive: true, send: false, commands: true });
});

test('a write records the new shape AND keeps the old word, so a downgrade to 0.4.9 still works', () => {
  writeTrust({ pins: {}, youAllow: {} });
  pins.setYouPolicy('mem_a', OPEN);
  assert.deepEqual(readTrust().youPolicy.mem_a, OPEN);
  assert.equal(readTrust().youAllow.mem_a, 'allow-all', '0.4.9 would lose this override');

  // `listen` has NO old word. It must project to the nearest CLOSED word, so
  // an older build can never show more permission than 0.4.10 enforces.
  pins.setYouPolicy('mem_b', LISTEN);
  assert.deepEqual(readTrust().youPolicy.mem_b, LISTEN);
  assert.equal(readTrust().youAllow.mem_b, 'strict', 'a legacy build would have been told it may send');

  // Clearing removes both, or the legacy word would resurrect the override.
  pins.setYouPolicy('mem_a', null);
  assert.equal(readTrust().youPolicy.mem_a, undefined);
  assert.equal(readTrust().youAllow.mem_a, undefined);
  assert.equal(pins.youPolicyFor('mem_a'), undefined);
});

test('the new value wins over the legacy one, so a 0.4.9 downgrade and re-upgrade cannot revert a change', () => {
  writeTrust({
    pins: {},
    youAllow: { mem_a: 'allow-all' },
    youPolicy: { mem_a: LISTEN },
  });
  assert.deepEqual(pins.youPolicyFor('mem_a'), LISTEN);
});

/* ---- the status ------------------------------------------------------------ */

test('an unset status is OPEN, because open is the identity for the AND', () => {
  writeTrust({ pins: {}, youAllow: {} });
  assert.deepEqual(pins.myStatus(), OPEN);
  // Which is what makes the upgrade a no-op: the per person policy alone still
  // decides, exactly as 0.4.9. Anything narrower would revoke a permission the
  // person had already granted, silently.
  assert.deepEqual(policy.effectivePolicy(pins.myStatus(), CONVERSE), CONVERSE);
  assert.deepEqual(policy.effectivePolicy(pins.myStatus(), OPEN), OPEN);
});

test('a STORED status that is garbage still fails closed', () => {
  writeTrust({ pins: {}, youAllow: {}, status: { receive: 'yes', send: 1 } });
  assert.deepEqual(pins.myStatus(), OFF);
});

test('the status narrows every per person policy and never widens one', () => {
  writeTrust({ pins: {}, youAllow: {} });
  pins.setMyStatus(LISTEN);
  assert.deepEqual(policy.effectivePolicy(pins.myStatus(), OPEN), LISTEN, 'the status must be a ceiling');
  assert.deepEqual(policy.effectivePolicy(pins.myStatus(), OFF), OFF, 'the status must not open a closed person');
  pins.setMyStatus(null);
  assert.deepEqual(pins.myStatus(), OPEN, 'clearing must return to no restriction');
});

/* ---- the schedule ---------------------------------------------------------- */

test('a disabled schedule leaves the status exactly where the person put it', () => {
  writeTrust({ pins: {}, youAllow: {} });
  pins.setMyStatus(CONVERSE);
  pins.setMyStatusSchedule({ enabled: false, windows: [{ days: [0, 1, 2, 3, 4, 5, 6], from: 0, to: 1440, preset: 'off' }], fallback: 'off' });
  assert.deepEqual(pins.statusNow(new Date()), CONVERSE);
  assert.equal(pins.applySchedule(new Date()), null);
  assert.equal(pins.scheduleDriving(new Date()), false);
});

test('a window that wraps midnight owns the small hours of the NEXT day', () => {
  writeTrust({ pins: {}, youAllow: {} });
  pins.setMyStatus(OPEN);
  // Monday 22:00 to 07:00. The day in `days` is the day it STARTS.
  pins.setMyStatusSchedule({ enabled: true, windows: [{ days: [1], from: 22 * 60, to: 7 * 60, preset: 'off' }], fallback: 'converse' });
  const mondayLate = new Date(2026, 0, 5, 23, 30);   // a Monday
  const tuesdayEarly = new Date(2026, 0, 6, 2, 0);   // the Tuesday it runs into
  const tuesdayNoon = new Date(2026, 0, 6, 12, 0);
  assert.equal(mondayLate.getDay(), 1);
  assert.deepEqual(pins.statusNow(mondayLate), OFF);
  assert.deepEqual(pins.statusNow(tuesdayEarly), OFF, 'the window stopped at midnight');
  assert.deepEqual(pins.statusNow(tuesdayNoon), CONVERSE, 'the fallback did not apply outside the window');
});

test('a schedule window is enforced by statusNow even when the timer never fired', () => {
  writeTrust({ pins: {}, youAllow: {} });
  pins.setMyStatus(OPEN);
  pins.setMyStatusSchedule({ enabled: true, windows: [{ days: [0, 1, 2, 3, 4, 5, 6], from: 0, to: 1440, preset: 'listen' }], fallback: 'open' });
  // Nothing has been written down: this is the laptop that slept through the
  // boundary. The message path must still enforce the window.
  assert.deepEqual(pins.myStatus(), OPEN, 'the stored status has not been touched yet');
  assert.deepEqual(pins.statusNow(new Date()), LISTEN);
  // And the timer's job is to make the stored value agree, so the one control
  // on screen is not showing a status nothing enforces.
  assert.deepEqual(pins.applySchedule(new Date()), LISTEN);
  assert.deepEqual(pins.myStatus(), LISTEN);
});

test('0.5.2: a status chosen while a window is driving HOLDS until that window instance ends', () => {
  // The control says "Changing it here holds until the next window starts".
  // Until 0.5.2 statusNow answered the schedule on every read and the timer
  // wrote the schedule's word back within a minute, so Off lasted under sixty
  // seconds and the message path ignored it from the first second.
  pins.setMyStatusSchedule({ enabled: true, windows: [{ days: [0, 1, 2, 3, 4, 5, 6], from: 0, to: 1440, preset: 'listen' }], fallback: 'open' });
  const monday10 = new Date(2026, 8, 7, 10, 0);
  const monday16 = new Date(2026, 8, 7, 16, 0);
  const tuesday10 = new Date(2026, 8, 8, 10, 0);
  assert.deepEqual(pins.statusNow(monday10), LISTEN, 'the window drives before anyone chooses');
  pins.setMyStatus(OFF, monday10);
  assert.deepEqual(pins.statusNow(monday10), OFF, 'the choice is ignored the moment it is made');
  assert.deepEqual(pins.statusNow(monday16), OFF, 'the choice is lost inside the same window');
  assert.equal(pins.applySchedule(monday16), null, 'the timer moved the status back');
  assert.deepEqual(pins.myStatus(), OFF, 'the stored status was overwritten');
  assert.equal(pins.scheduleDriving(monday16), false, 'the control still says the schedule is driving');
  assert.equal(pins.statusHeld(monday16), true);
  // Tomorrow the same window starts again: a new instance, the schedule decides.
  assert.deepEqual(pins.statusNow(tuesday10), LISTEN, 'the hold outlived the window');
  assert.deepEqual(pins.applySchedule(tuesday10), LISTEN);
  assert.deepEqual(pins.myStatus(), LISTEN);
  assert.equal(pins.statusHeld(tuesday10), false);
  assert.equal(readTrust().statusHold, undefined, 'a spent hold was left in the file');
});

test('0.5.2: a choice made between windows holds until ANY window starts', () => {
  pins.setMyStatusSchedule({ enabled: true, windows: [{ days: [1, 2, 3, 4, 5], from: 9 * 60, to: 17 * 60, preset: 'listen' }], fallback: 'converse' });
  const monday8 = new Date(2026, 8, 7, 8, 0);
  const monday830 = new Date(2026, 8, 7, 8, 30);
  const monday9 = new Date(2026, 8, 7, 9, 0);
  assert.deepEqual(pins.statusNow(monday8), CONVERSE, 'the fallback before the choice');
  pins.setMyStatus(OFF, monday8);
  assert.deepEqual(pins.statusNow(monday830), OFF);
  assert.equal(pins.applySchedule(monday830), null);
  assert.deepEqual(pins.statusNow(monday9), LISTEN, 'the window that started did not take over');
  assert.deepEqual(pins.applySchedule(monday9), LISTEN);
});

test('0.5.2: a window that wraps midnight is ONE instance, so a choice at 23:00 still holds at 01:00', () => {
  pins.setMyStatusSchedule({ enabled: true, windows: [{ days: [1], from: 22 * 60, to: 7 * 60, preset: 'off' }], fallback: 'converse' });
  const monday23 = new Date(2026, 8, 7, 23, 0);
  const tuesday1 = new Date(2026, 8, 8, 1, 0);
  const tuesday8 = new Date(2026, 8, 8, 8, 0);
  assert.deepEqual(pins.statusNow(monday23), OFF);
  pins.setMyStatus(OPEN, monday23);
  assert.deepEqual(pins.statusNow(tuesday1), OPEN, 'midnight ended the hold inside one window');
  assert.deepEqual(pins.statusNow(tuesday8), CONVERSE, 'the fallback after the window did not apply');
});

test('0.5.2: a choice made with the schedule off records no hold, and a new schedule forgets any hold', () => {
  pins.setMyStatus(OFF);
  assert.equal(readTrust().statusHold, undefined);
  pins.setMyStatusSchedule({ enabled: true, windows: [{ days: [0, 1, 2, 3, 4, 5, 6], from: 0, to: 1440, preset: 'listen' }], fallback: 'open' });
  const monday10 = new Date(2026, 8, 7, 10, 0);
  assert.deepEqual(pins.statusNow(monday10), LISTEN, 'a schedule enabled after the choice must drive at once');
  pins.setMyStatus(OFF, monday10);
  assert.deepEqual(pins.statusNow(monday10), OFF);
  pins.setMyStatusSchedule({ enabled: true, windows: [{ days: [0, 1, 2, 3, 4, 5, 6], from: 0, to: 1440, preset: 'converse' }], fallback: 'open' });
  assert.deepEqual(pins.statusNow(monday10), CONVERSE, 'a hold survived a rewritten schedule');
  assert.equal(readTrust().statusHold, undefined);
});

test('0.5.2: scheduleSlot names an instance, not a window: the same window tomorrow is a different key', () => {
  const sched = policy.normalizeSchedule({ enabled: true, windows: [{ days: [1, 2], from: 9 * 60, to: 17 * 60, preset: 'listen' }, { days: [1], from: 22 * 60, to: 7 * 60, preset: 'off' }], fallback: 'converse' });
  const a = policy.scheduleSlot(sched, new Date(2026, 8, 7, 10, 0));
  const b = policy.scheduleSlot(sched, new Date(2026, 8, 7, 16, 59));
  const c = policy.scheduleSlot(sched, new Date(2026, 8, 8, 10, 0));
  assert.equal(a, b, 'two moments in one window are one instance');
  assert.notEqual(a, c, 'the same window on the next day is a new instance');
  assert.equal(policy.scheduleSlot(sched, new Date(2026, 8, 7, 23, 0)), policy.scheduleSlot(sched, new Date(2026, 8, 8, 1, 0)), 'a wrapping window is one instance across midnight');
  assert.equal(policy.scheduleSlot(sched, new Date(2026, 8, 7, 8, 0)), 'fallback');
  assert.equal(policy.scheduleSlot({ ...sched, enabled: false }, new Date(2026, 8, 7, 10, 0)), null);
});

test('a hand edited schedule is discarded rather than clamped, so no window enforces a time nobody chose', () => {
  writeTrust({
    pins: {}, youAllow: {},
    statusSchedule: {
      enabled: true,
      windows: [
        { days: [9, 1, 1], from: 60, to: 120, preset: 'off' },      // 9 is not a day
        { days: [], from: 0, to: 60, preset: 'off' },                // no day, never matches
        { days: [3], from: 5000, to: 60, preset: 'off' },            // outside the day
        { days: [4], from: 60, to: 120, preset: 'whenever' },        // not a preset
      ],
      fallback: 'nonsense',
    },
  });
  const s = pins.myStatusSchedule();
  assert.deepEqual(s.windows.map((w) => w.days), [[1]], 'only the repairable window survived, deduped and sorted');
  assert.equal(s.fallback, 'converse', 'an unknown fallback falls back to the documented default');
});

/* ---- the file guard -------------------------------------------------------- */

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'cth-ws-'));
const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'cth-out-'));
const real = (p) => fs.realpathSync(p);

/** The probe main injects, exactly as `teamsBridge` builds it. */
const probe = (raw) => {
  try {
    const r = fs.realpathSync(raw);
    return { real: r, isFile: fs.statSync(r).isFile() };
  } catch { return null; }
};

test.before(() => {
  fs.writeFileSync(path.join(work, 'report.pdf'), 'pdf bytes');
  fs.mkdirSync(path.join(work, 'notes'), { recursive: true });
  fs.writeFileSync(path.join(outside, 'secret.txt'), 'private');
  // A link INSIDE the workspace pointing OUT of it. This is the whole reason
  // the probe resolves before the containment test.
  fs.symlinkSync(path.join(outside, 'secret.txt'), path.join(work, 'link-out.txt'));
});

test('prose that merely looks like a path is left alone, so an ordinary sentence is not mangled', () => {
  const body = 'Check the /roster route and the s/foo/bar rule, then read https://x.example/s/abc.';
  const found = share.scanBody(body, probe);
  assert.deepEqual(found.files, []);
  assert.deepEqual(found.notFiles, []);
});

test('a real file is found, with its trailing sentence punctuation trimmed off', () => {
  const p = path.join(work, 'report.pdf');
  const found = share.scanBody(`Please read ${p}.`, probe);
  assert.equal(found.files.length, 1);
  assert.equal(found.files[0].token, p);
  assert.equal(found.files[0].real, real(p));
  assert.equal(found.files[0].name, 'report.pdf');
});

test('a directory named a real thing and is still not shareable, so it is reported apart from prose', () => {
  const found = share.scanBody(`Take everything in ${path.join(work, 'notes')}`, probe);
  assert.deepEqual(found.files, []);
  assert.equal(found.notFiles.length, 1);
  assert.equal(found.notFiles[0].name, 'notes');
});

test('THE GUARD: a symlink inside the workspace pointing out of it is outside the workspace', () => {
  const link = path.join(work, 'link-out.txt');
  const found = share.scanBody(`Here it is: ${link}`, probe);
  assert.equal(found.files.length, 1, 'the link resolves to a regular file');
  // The token LOOKS contained: the directory it sits in IS the workspace. The
  // RESOLVED path is what is tested, and it is not. Testing the token instead
  // would publish anything the workspace happens to link to.
  assert.equal(share.isInsideWorkspace(real(work), real(path.dirname(link))), true);
  assert.equal(share.isInsideWorkspace(real(work), found.files[0].real), false);
  assert.equal(found.files[0].real, real(path.join(outside, 'secret.txt')));
});

test('containment is a path test, not a string prefix test', () => {
  assert.equal(share.isInsideWorkspace('/a/b', '/a/b/c.txt'), true);
  assert.equal(share.isInsideWorkspace('/a/b', '/a/b'), true);
  assert.equal(share.isInsideWorkspace('/a/b/', '/a/b/c.txt'), true, 'a trailing separator on the root');
  assert.equal(share.isInsideWorkspace('/a/b', '/a/bad/c.txt'), false, 'a sibling that shares a prefix');
  assert.equal(share.isInsideWorkspace('/a/b', '/a/bc'), false);
  assert.equal(share.isInsideWorkspace('/a/b', '/A/B/c.txt'), false, 'case must be exact after realpath');
  assert.equal(share.isInsideWorkspace('', '/a/b'), false);
  assert.equal(share.isInsideWorkspace('/a/b', ''), false);
});

test('a person typing a path chose that file; an agent has to stay inside its workspace', () => {
  assert.equal(share.personChose('you'), true);
  assert.equal(share.personChose('human'), true);
  assert.equal(share.personChose('  You '), true);
  assert.equal(share.personChose('kevin'), false);
  assert.equal(share.personChose('god'), false, 'the orchestrator is an agent and has a workspace');
  assert.equal(share.personChose(''), false);
});

test('the rewrite puts the name, the link and the expiry in, and takes the composer\'s duplicate out', () => {
  const p = path.join(work, 'report.pdf');
  // Exactly what pro/Composer.tsx:86-88 pastes today.
  const body = `Have a look.\n\nAttached files:\n- ${p} (report.pdf)`;
  const text = share.shareRef('report.pdf', 'https://x.tunnelmole.net/s/abc', '59 minutes left');
  const out = share.applyShares(body, [{ token: p, name: 'report.pdf', text }]);
  assert.equal(out, 'Have a look.\n\nAttached files:\n- report.pdf (https://x.tunnelmole.net/s/abc, 59 minutes left)');
  assert.ok(!out.includes(p), 'the local path survived the rewrite');
});

test('the same path twice is rewritten twice, and a name that is not the composer\'s suffix is left alone', () => {
  const p = '/tmp/a.txt';
  const out = share.applyShares(`${p} and again ${p} (other.txt)`, [{ token: p, name: 'a.txt', text: 'LINK' }]);
  assert.equal(out, 'LINK and again LINK (other.txt)');
});

test('every share refusal is an instruction, names the file, and carries no dash', () => {
  const codes = ['outside-workspace', 'no-workspace', 'unreadable', 'too-big', 'too-many', 'no-link'];
  for (const code of codes) {
    const block = share.shareBlock(code, 'report.pdf');
    assert.equal(block.code, code);
    assert.ok(block.fix.includes('report.pdf'), `${code} does not name the file`);
    // An agent told "too long" writes the same message again. It has to be told
    // what to DO, so every sentence ends in one, and says which file.
    assert.match(block.fix, /\.$/, `${code} is not a sentence`);
    assert.ok(!/[—–]/.test(block.fix) && !/ - /.test(block.fix), `${code} has a dash in it`);
    assert.ok(block.fix.length > 40, `${code} is too short to be an instruction`);
  }
});
