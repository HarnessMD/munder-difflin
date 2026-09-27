'use strict';

/**
 * THE SPENT THREAD GETS A DOOR (0.4.11).
 *
 * The trap, proved on 0.4.10: `threadIdFor` keys ONE thread file per pair,
 * forever; the store only appends; `DEFAULT_TURN_BUDGET` counts EVERY stored
 * entry including the peer's replies and your own failed sends. At zero the
 * composer disabled its fields and told the person at the keyboard
 * ASK_THE_HUMAN, which sent them to status presets that were never an input
 * to the composer's disabled state. A dead end with a sign pointing at itself.
 *
 * The fix, pinned here and driven for real in `test/teams-bridge.test.cjs`
 * (which needs loopback and runs unsandboxed; this file needs neither):
 *
 *   ROTATION   `startNewThread` renames `thr_<hash>.json` to `.1`, `.2`, ...
 *              so history is archived, never destroyed, and `threadFor`
 *              answers empty with the whole budget.
 *   COUNTING   your own entries marked `failed` buy no turn. The rule, exact:
 *              an entry is free when `from === 'you' && delivery === 'failed'`
 *              and counts otherwise, both sides, in flight included.
 *   THE SEAT   the person's refusals say CHANGE_IT_YOURSELF and the composer
 *              draws the door; the agent seat is UNCHANGED: agents still get
 *              ASK_THE_HUMAN and are handed no way to rotate.
 *
 * React free: the bridge is loaded through `load-ts.cjs` against a stubbed
 * electron, and the two .tsx files are pinned as source, since .tsx cannot be
 * loaded here.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/* ---- one machine, the same electron stub the bridge test uses -------------- */

const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'cth-rotate-'));
const ME = 'mem_' + 'P'.repeat(22);
const PEER = 'mem_' + 'Q'.repeat(22);

const electronPath = require.resolve('electron');
require.cache[electronPath] = {
  id: electronPath, filename: electronPath, loaded: true,
  exports: {
    app: { getPath: () => userData },
    safeStorage: {
      isEncryptionAvailable: () => true,
      getSelectedStorageBackend: () => 'gnome_libsecret',
      encryptString: (s) => Buffer.from('SEALED:' + s, 'utf8'),
      decryptString: (b) => Buffer.from(b).toString('utf8').slice(7),
    },
    // No ipcMain on purpose: the bridge's guarded registration must load
    // anyway, which is the property that lets this file exist at all.
  },
};
delete process.env.MD_RELAY_URL;

const membership = loadTs('src/main/teamsMembership.ts');
const bridge = loadTs('src/main/teamsBridge.ts');
const M = loadTs('src/shared/teamMessage.ts');

const threadsDir = path.join(userData, 'teams', 'threads');
const threadId = () => bridge.threadIdFor(ME, PEER);
const liveFile = () => path.join(threadsDir, `${threadId()}.json`);

const entry = (i, from, delivery) => ({
  id: `e-${i}`, from, act: 'inform', subject: `turn ${i}`, body: `body ${i}`,
  at: new Date().toISOString(), delivery,
});

function writeThread(messages) {
  fs.mkdirSync(threadsDir, { recursive: true });
  fs.writeFileSync(liveFile(), JSON.stringify({ memberId: PEER, threadId: threadId(), messages }));
}

test.before(() => {
  const now = new Date().toISOString();
  membership.writeMembership({
    orgId: 'org_1', memberId: ME, deviceId: 'dev_' + 'P'.repeat(22), orgName: 'Dunder Mifflin',
    relayUrl: 'ws://127.0.0.1:1/connect', enrolledAt: now, lastVerifiedAt: now, lastVerifiedLocalAt: now,
    leaseSeconds: membership.LEASE_SECONDS,
  });
});

/* ---- rotation: archive, reset, and the event the thread view listens to --- */

test('rotation renames the pair\'s file aside, whole, and threadFor answers empty again', () => {
  const spent = [entry(1, 'you', 'delivered'), entry(2, PEER, 'delivered'), entry(3, 'you', 'delivered'), entry(4, PEER, 'delivered')];
  writeThread(spent);
  assert.equal(bridge.threadFor(PEER).messages.length, 4);

  const seen = [];
  const off = bridge.onThread((memberId) => seen.push(memberId));
  assert.deepEqual(bridge.startNewThread(PEER), { ok: true });
  off();

  // Archived byte-comparable, at .1, and the live file is gone.
  const archived = JSON.parse(fs.readFileSync(path.join(threadsDir, `${threadId()}.1.json`), 'utf8'));
  assert.deepEqual(archived.messages, spent, 'the history crossed the rename damaged or short');
  assert.equal(fs.existsSync(liveFile()), false);

  // Empty thread, same threadId: the pair hash is how inbound mail finds the
  // NEW thread with no code change on the receive path.
  const fresh = bridge.threadFor(PEER);
  assert.deepEqual(fresh, { memberId: PEER, threadId: threadId(), messages: [] });
  assert.equal(M.turnsLeft(M.turnsUsed(fresh.messages)), M.DEFAULT_TURN_BUDGET, 'the budget is whole again');

  // The same push a new message makes, so useThread reloads and the composer
  // reopens. Without it the person stares at a spent thread that is not.
  assert.deepEqual(seen, [PEER], 'the thread view was not told');
});

test('a second rotation numbers upward, and rotating an empty pair is ok and archives nothing', () => {
  writeThread([entry(9, 'you', 'delivered')]);
  assert.deepEqual(bridge.startNewThread(PEER), { ok: true });
  assert.ok(fs.existsSync(path.join(threadsDir, `${threadId()}.1.json`)), 'the first archive was clobbered');
  assert.ok(fs.existsSync(path.join(threadsDir, `${threadId()}.2.json`)), 'the second rotation lost the thread');

  // Nothing live to rotate: still ok (the asked-for state is the state), and
  // no third archive is minted for an empty thread.
  assert.deepEqual(bridge.startNewThread(PEER), { ok: true });
  assert.equal(fs.existsSync(path.join(threadsDir, `${threadId()}.3.json`)), false);
});

test('the door refuses yourself, an empty id, and a machine outside any team', () => {
  assert.deepEqual(bridge.startNewThread(ME), { ok: false });
  assert.deepEqual(bridge.startNewThread(''), { ok: false });
  const saved = fs.readFileSync(path.join(userData, 'teams', 'membership.json'));
  membership.forgetMembership();
  assert.deepEqual(bridge.startNewThread(PEER), { ok: false });
  fs.writeFileSync(path.join(userData, 'teams', 'membership.json'), saved);
});

test('nothing caches the old thread in memory: threadFor reads the disk on every call', () => {
  // After the rotations above the pair is empty. A file appearing at the live
  // path (what an inbound append does) is visible on the very next read; a
  // module level cache would still answer the array it read before.
  assert.equal(bridge.threadFor(PEER).messages.length, 0);
  writeThread([entry(21, PEER, 'delivered')]);
  assert.equal(bridge.threadFor(PEER).messages.length, 1);
  fs.rmSync(liveFile(), { force: true });
  assert.equal(bridge.threadFor(PEER).messages.length, 0);
});

/* ---- the counting rule, exact --------------------------------------------- */

test('a failed send of your own buys no turn; everything else, both sides, still counts', () => {
  const you = (d) => ({ from: 'you', delivery: d });
  const them = (d) => ({ from: PEER, delivery: d });
  assert.equal(M.turnsUsed([you('failed'), you('failed'), you('failed'), you('failed')]), 0,
    'a relay outage spent the whole thread');
  assert.equal(M.turnsUsed([you('delivered'), you('sending'), you('queued'), them('delivered')]), 4,
    'in flight and queued sends are on their way and count');
  assert.equal(M.turnsUsed([them('failed')]), 1, 'the rule is yours-and-failed, not failed');
  assert.equal(M.countsTowardBudget({ from: 'you' }), true, 'a fixture row with no delivery state counts');
  assert.equal(M.turnsUsed([]), 0);
  // The pair the composer actually computes: four real turns close it, four
  // failures do not.
  assert.equal(M.turnsLeft(M.turnsUsed([you('failed'), you('delivered'), them('delivered'), you('failed')])), M.DEFAULT_TURN_BUDGET - 2);
});

/* ---- the two seats: the person gets a door, the agent gets the human ------- */

test('checkRate hands the person seat CHANGE_IT_YOURSELF and the agent seat ASK_THE_HUMAN', () => {
  const spent = { sentLastHour: 0, openThreads: 0, threadEntries: M.DEFAULT_TURN_BUDGET };
  const person = M.checkRate({ ...spent, sender: 'person' });
  assert.equal(person.length, 1);
  assert.ok(person[0].fix.includes(M.CHANGE_IT_YOURSELF), 'the person is not told the thread can be restarted');
  assert.ok(!/ask your human/.test(person[0].fix), 'the person is told to ask themselves');
  // The default stays `agent`: it is the stricter reading, the common case,
  // and the guarantee that no existing agent path changed under this fix.
  for (const state of [spent, { ...spent, sender: 'agent' }]) {
    const agent = M.checkRate(state);
    assert.ok(agent[0].fix.includes(M.ASK_THE_HUMAN), 'the agent seat moved');
  }
});

test('sendFromPerson is the person seat: it passes sender person into checkRate', () => {
  const bridgeSrc = strip(read('src/main/teamsBridge.ts'));
  assert.match(bridgeSrc, /checkRate\(\{ \.\.\.rateStateFor\(memberId\), sender: 'person' \}, DEFAULT_TURN_BUDGET\)/);
  // And the derived counts go through the one rule, not a raw length.
  assert.match(bridgeSrc, /threadEntries: turnsUsed\(messages\)/);
  assert.ok(!/threadEntries: messages\.length/.test(bridgeSrc), 'the raw count came back');
});

test('the agent seat is unchanged: ASK_THE_HUMAN on the closed door, in the brief, and no rotation offered', () => {
  const bridgeSrc = strip(read('src/main/teamsBridge.ts'));
  assert.match(bridgeSrc, /if \(block === 'you-not-sending'\) return bounce\(msg, ASK_THE_HUMAN\);/);
  assert.ok(M.crossUserBrief().includes(M.ASK_THE_HUMAN), 'the brief lost the agents\' instruction');
  assert.ok(!M.crossUserBrief().includes('Start a new thread'), 'the brief advertises the person\'s door to agents');
  assert.ok(!/startNewThread/.test(M.crossUserBrief()), 'the brief names the bridge function');
  // The door is IPC only: `send` and `sendFromPerson` never rotate, so an
  // agent spending a thread cannot buy it back. The slice runs from send()
  // to the inbound section's first type, covering sendFromPerson too.
  const sendBlock = bridgeSrc.slice(bridgeSrc.indexOf('export async function send('), bridgeSrc.indexOf('type Opened'));
  assert.ok(sendBlock.length > 0, 'the send slice is not armed');
  assert.ok(!/startNewThread/.test(sendBlock), 'the send path rotates threads');
});

/* ---- the seams: IPC, preload, and the two screens -------------------------- */

test('the bridge registers teams:thread:new itself, with the same coercion teams:thread uses', () => {
  const bridgeSrc = read('src/main/teamsBridge.ts');
  assert.match(bridgeSrc, /ipcMain\?\.handle\('teams:thread:new', \(_e, memberId: unknown\) => startNewThread\(String\(memberId \?\? ''\)\)\);/);
  // The id is only ever hashed, never a path segment: the file the rotation
  // touches is named by `threadIdFor`, which is `thr_` + 40 hex characters.
  assert.match(bridgeSrc, /const live = join\(threadsDir\(\), `\$\{threadId\}\.json`\);/);
  assert.match(bridgeSrc, /renameSync\(live, join\(threadsDir\(\), `\$\{threadId\}\.\$\{n\}\.json`\)\);/);
  const stripped = strip(bridgeSrc);
  const rotation = stripped.slice(stripped.indexOf('export function startNewThread'), stripped.indexOf('export type SendOutcome'));
  assert.ok(rotation.length > 0, 'the rotation slice is not armed');
  assert.ok(!/rmSync|unlink/.test(rotation), 'the rotation deletes instead of archiving');
});

test('preload exposes the door beside teamsSend, on the same invoke channel', () => {
  const preload = read('src/preload/index.ts');
  assert.match(preload, /teamsThreadNew: \(memberId: string\): Promise<\{ ok: boolean \}> =>\s*\n\s*ipcRenderer\.invoke\('teams:thread:new', memberId\),/);
});

test('the thread screen wires the door and counts through the one rule', () => {
  const thread = strip(read('src/renderer/src/components/team/CrossNodeThread.tsx'));
  assert.match(thread, /const used = turnsUsed\(messages\);/);
  assert.match(thread, /const left = turnsLeft\(used\);/);
  assert.match(thread, /threadEntries=\{used\}/);
  assert.match(thread, /const r = await api\.teamsThreadNew\(mate\.id\);/);
  assert.match(thread, /onStartNewThread=\{api\?\.teamsThreadNew \? startNewThread : undefined\}/,
    'the boards and the harness must simply not get a door');
});

test('the composer\'s spent state is the person\'s: the rule sentence verbatim, and the kit button', () => {
  const composer = strip(read('src/renderer/src/components/team/DraftComposer.tsx'));
  assert.match(composer, /\? CHANGE_IT_YOURSELF/);
  assert.ok(!composer.includes('ASK_THE_HUMAN'), 'the agents\' sentence is back in the person\'s composer');
  // Verbatim and untranslated, like every rule string: the sentence is the
  // constant itself, never wrapped in t().
  assert.ok(!/t\(\s*CHANGE_IT_YOURSELF/.test(composer), 'the rule string went through the translator');
  assert.match(composer, /\{spent && onStartNewThread && \(/);
  assert.match(composer, /<Btn size="sm" onClick=\{startNew\} disabled=\{rotating\}>/);
  assert.match(composer, /\{t\('team\.thread\.startNew'\)\}/, 'the label, unlike the rule string, ships translated');
  assert.match(composer, /subjectRef\.current\?\.focus\(\);/, 'the reopened composer must be ready to type into');
});
