/**
 * MICHAEL TO MICHAEL (plan 4.6). The bridge between this machine's hive
 * router and the relay: outbound, a hive message addressed `member:<id>`
 * becomes one sealed envelope (or one approval request) to every machine that
 * person has; inbound, an envelope from the spool is opened against the key
 * this machine PINNED for the sender, checked against what this person allows
 * that teammate, and only then handed to the LOCAL god's inbox. A remote org
 * never addresses my workers directly; my Michael decides.
 *
 * THE CIPHERTEXT ON THE WIRE, and why it is not one sealed box per device.
 * The contract sends ONE ciphertext to N device ids (3.5) and fans ONE
 * request ciphertext out to every device of a person (3.8). A sealed box is
 * bound to one recipient key, so one box cannot serve N devices. The wire
 * ciphertext is therefore a small multi-recipient envelope:
 *
 *   base64url( JSON { v: 1, box: <secretbox of the plaintext, base64>,
 *                     keys: { <deviceId>: <sealTo(that device, the key)> } } )
 *
 * The plaintext is encrypted once with a random 32-byte key under the wire
 * `nonce` (24 bytes, which is exactly the shape 3.5 asks for); that key is
 * sealed to each device with the EXISTING `sealTo`, which also signs it with
 * this machine's key so the recipient's `openSealed` verifies the sender
 * against its pin. `senderSignature` is a detached Ed25519 signature over the
 * base64url ciphertext STRING exactly as sent, so the recipient can refuse
 * before decrypting anything. Two checks, both against the pinned key.
 *
 * WHO MAY SEND WHAT. 0.4.10 replaced the one word level with `TeamPolicy`
 * (`@shared/teamPolicy`): three axes, `receive`, `send` and `commands`, and a
 * STATUS that is ANDed with the per person policy. The old three words are
 * still on the wire (`RelayMember.theyAllow`), and every read of one goes
 * through `normalizePolicy`, which fails closed.
 *
 *   my policy     `effectivePolicy(statusNow(), youPolicyFor(them) ??
 *                 youPolicyDefault() ?? org.defaultPermission)`. The status is
 *                 read on EVERY send and receive rather than cached, because a
 *                 laptop asleep through a schedule boundary must not act on a
 *                 status the person scheduled themselves out of.
 *   sender side   `sendBlock(mine, theirs)` decides. `you-not-sending` is my
 *                 own door and the refusal tells the agent to ask its human;
 *                 `they-not-receiving` is theirs and the refusal says so.
 *                 Everything else is sent: an `inform`, `query`, `propose`,
 *                 `agree`, `refuse` or `done` as an envelope, a `request` as a
 *                 `run-task` approval request. (The plan asked for `allow-all`
 *                 before a request could be SENT; that would make D10's queue
 *                 unreachable, since the queue exists for the recipient who
 *                 takes messages but not commands. The recipient decides.)
 *   recipient     `mine.receive` false drops and logs, and the sender is told
 *                 nothing, on purpose. Otherwise an envelope is delivered; a
 *                 request is delivered when `mine.commands` and QUEUED for D10
 *                 when it is not.
 *
 * FILES. An outbound body that names a local file gets that path replaced with
 * a share link that dies in an hour (`shareLocalFiles` below). A path is
 * meaningless on another machine, which is what made the composer's "Attached
 * files" block a dead reference the moment it crossed. The guard is the
 * sender's workspace and it is argued in `@shared/fileShareMessage`.
 *
 * THE THREAD STORE holds the plaintext of what this machine sent and received,
 * `<userData>/teams/threads/<threadId>.json`, 0600. The relay never had it;
 * the machine did; that is the design.
 */
import { app, ipcMain } from 'electron';
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import _sodium from 'libsodium-wrappers';
import { fingerprintFor, initCrypto, openSealed, sealTo, signDetached } from './deviceIdentity';
import {
  b64url, fetchRoster, patchMe, postEnvelope, postRequest,
  type QueueEnvelope, type QueueRequest, type ReceivePublication, type RelayDevice, type RelayFailure,
  type RelayMember, type RelayRoster,
} from './relay';
import {
  applySchedule, myStatus, myStatusSchedule, onPolicyChange, scheduleDriving, setMyStatus,
  setMyStatusSchedule, setYouPolicy, setYouPolicyDefault, statusNow, trustFor,
  youPolicyDefault, youPolicyFor,
} from './teamPins';
import { readMembership } from './teamsMembership';
import { pinAgentName, agentNamesFor } from './teamNames';
import { bossNameKey } from '../shared/bossName';
import { resolveResponder } from '../shared/responder';
import {
  effectivePolicy, normalizePolicy, policyOf, presetOf, sendBlock,
  type PolicyPreset, type StatusSchedule, type TeamPolicy,
} from '../shared/teamPolicy';
import {
  ASK_THE_HUMAN, DEFAULT_TURN_BUDGET, checkRate, explainViolations, turnsUsed, validateMessage,
  type DraftMessage, type MessageAct as DraftAct, type RateState,
} from '../shared/teamMessage';
import { expiresIn, type FileShareView, type ShareRefusal } from '../shared/fileShare';
import {
  applyShares, baseName, isInsideWorkspace, personChose, scanBody, shareBlock, shareRef,
  type PathProbe, type ShareBlockCode,
} from '../shared/fileShareMessage';
import * as session from './teamsSession';
import * as teamsOrg from './teamsOrg';
import type { HiveMessage, MessageAct } from './hive';
import type {
  Delivery, PendingRequest, RequestDecision, RequestKind, ThreadEntry, ThreadView,
} from '../shared/teams';

/** What the bridge needs from the hive. Kept to three calls so a test, or the
 *  end-to-end driver, can stand in for the whole of hive.ts; the optional
 *  fourth (0.5.2) is a lookup, not a door. */
export interface HiveLike {
  send(partial: Partial<HiveMessage>, from?: string): HiveMessage;
  appendLog(event: Record<string, unknown>): void;
  godId(): string;
  /** The display name of an agent on this floor, or null when the id is not
   *  an agent here (the person's own send box sends as `you`). It travels
   *  inside the sealed message so the other machine can say WHICH of this
   *  person's agents wrote, without the relay ever holding the name. */
  agentName?(id: string): string | null;
  /** 0.5.2 (founder ruling, Option A): the configured responder, an agent id
   *  or nothing, and the ids that can take mail right now. The bridge never
   *  trusts the first without the second: `resolveResponder` falls back to
   *  god whenever the chosen agent is not among the active ones. */
  responder?(): string | undefined;
  activeAgentIds?(): string[];
}

const ACTS: readonly MessageAct[] = ['request', 'inform', 'propose', 'query', 'agree', 'refuse', 'done'];
const isAct = (v: unknown): v is MessageAct => typeof v === 'string' && (ACTS as readonly string[]).includes(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const SAFE_ID = /^[A-Za-z0-9_-]{1,80}$/;

/** Requests expire; the contract caps it at 24 h out. */
const REQUEST_TTL_MS = 24 * 3600 * 1000;
const ROSTER_TTL_MS = 60_000;

let hive: HiveLike | null = null;

export function attach(h: HiveLike | null): void {
  hive = h;
}

/**
 * The two things the bridge needs from OUTSIDE main's Teams slice to turn a
 * local path into a link: the share store, and where the sending agent works.
 *
 * Injected rather than imported so this module keeps no opinion about how a
 * file is published, and so `test/teams-bridge.test.cjs` can drive the whole
 * send path with no server, no tunnel and no disk publishing. When nothing is
 * attached, a message that names a local file is REFUSED rather than sent with
 * the path still in it.
 */
export interface ShareHost {
  create(path: string): Promise<{ ok: true; share: FileShareView } | { ok: false; error: ShareRefusal }>;
  /** The directory the agent with this id was hired into, or null when the id
   *  is not an agent on this floor. */
  workspaceFor(agentId: string): string | null;
}

let shareHost: ShareHost | null = null;

export function attachShares(host: ShareHost | null): void {
  shareHost = host;
}

/* ---- encodings ------------------------------------------------------------ */

const b64urlToB64 = (s: string): string => {
  const b = s.replace(/-/g, '+').replace(/_/g, '/');
  return b + '='.repeat((4 - (b.length % 4)) % 4);
};
const b64urlToBytes = (s: string): Uint8Array => new Uint8Array(Buffer.from(b64urlToB64(s), 'base64'));

/** `thr_` + the two member ids sorted, hashed. Under the relay's 64-char cap. */
export function threadIdFor(a: string, b: string): string {
  const h = createHash('sha256').update([a, b].sort().join(':')).digest('hex');
  return `thr_${h.slice(0, 40)}`;
}

/* ---- the roster, cached --------------------------------------------------- */

let roster: RelayRoster | null = null;
let rosterAt = 0;

async function rosterFresh(force = false): Promise<RelayRoster | null> {
  if (!force && roster && Date.now() - rosterAt < ROSTER_TTL_MS) return roster;
  const r = await fetchRoster();
  if (!r.ok) return roster;
  roster = r.data;
  rosterAt = Date.now();
  return roster;
}

/** A presence frame means the roster moved; the next read fetches. */
session.onPresence(() => { rosterAt = 0; });

/** Test seam: forget the cached roster. Nothing in the app calls this. */
export function _resetRosterForTests(): void {
  roster = null;
  rosterAt = 0;
}

/** The next read fetches. For a write this machine made that the cached copy
 *  cannot know about (the person's name, `teams:name:set`): a roster read a
 *  moment later would otherwise show the old row for up to a minute. */
export function rosterInvalidate(): void {
  rosterAt = 0;
}

function findMember(r: RelayRoster, memberId: string): RelayMember | null {
  return r.members.find((m) => m.memberId === memberId) ?? null;
}

function findDevice(r: RelayRoster, deviceId: string): { member: RelayMember; device: RelayDevice } | null {
  for (const member of r.members) {
    const device = member.devices.find((d) => d.deviceId === deviceId);
    if (device) return { member, device };
  }
  return null;
}

/** Look up, and if not found, look up again on a fresh roster: a teammate who
 *  enrolled a minute ago is not on a cached copy. */
async function memberOrRefresh(memberId: string): Promise<{ r: RelayRoster; m: RelayMember } | null> {
  let r = await rosterFresh();
  let m = r && findMember(r, memberId);
  if (!m) { r = await rosterFresh(true); m = r && findMember(r, memberId); }
  return r && m ? { r, m } : null;
}

async function deviceOrRefresh(deviceId: string): Promise<{ r: RelayRoster; member: RelayMember; device: RelayDevice } | null> {
  let r = await rosterFresh();
  let d = r && findDevice(r, deviceId);
  if (!d) { r = await rosterFresh(true); d = r && findDevice(r, deviceId); }
  return r && d ? { r, ...d } : null;
}

/**
 * The line god's roster carries when this machine is in a team. Ids beside
 * names, because bare names are collision addresses on this floor already and
 * are not accepted remotely either. Null until the roster has been read once;
 * asking for the line starts that read.
 */
export function teammatesLine(): string | null {
  if (!readMembership()) return null;
  if (!roster) { void rosterFresh(); return null; }
  const rows = roster.members
    .filter((m) => !m.isSelf && m.devices.length > 0)
    .map((m) => {
      const online = m.devices.some((d) => d.presence === 'online');
      // 0.4.9: the person, then their orchestrator's nickname when the seat has
      // one. A seat without a nickname is listed by the person's name alone.
      const who = m.bossName ? `${m.name ?? 'unnamed'}, orchestrator "${m.bossName}"` : (m.name ?? 'unnamed');
      // 0.4.10: the four words the policy model actually uses, not the three
      // wire words. `presetOf` answers null only for a combination the four
      // presets do not cover, which the relay cannot currently express.
      const theirs = normalizePolicy(m.theyAllow);
      // 0.5.2: what their agents have called themselves in messages that
      // reached this machine, so god can name the agent it is answering.
      // Nothing is listed until something has arrived.
      const agents = agentNamesFor(m.memberId);
      const seen = agents.length ? `, agents seen: ${agents.join(', ')}` : '';
      return `${who} (member:${m.memberId}, ${m.suspended ? 'suspended' : online ? 'online' : 'offline'}, allows you ${presetOf(theirs) ?? 'custom'}${seen})`;
    });
  if (!rows.length) return `[TEAMS] You are in ${roster.org.name}; no teammate has a machine enrolled yet.`;
  return `[TEAMS — teammates on OTHER machines, in ${roster.org.name}] ${rows.join('; ')}. `
    + 'Write to one by putting member:<id> in `to`, or the person\'s name, or their orchestrator\'s '
    + 'nickname, when it matches exactly one row; otherwise the message bounces. What they allow you '
    + 'decides what lands: off bounces, listen and converse deliver a message and put a `request` in '
    + 'their approval queue, open runs it. Your own status can close either direction at any time, and '
    + 'a refusal always says which side closed it. A local file you name in the body is published as a '
    + 'link that dies in an hour, but only when the file is inside your workspace; anything else is '
    + 'refused rather than sent with a path the other machine cannot open.';
}

/**
 * 0.4.9: a `to` that is a person's name or an orchestrator's nickname, looked
 * up on the cached roster (the router asks synchronously, so a roster that has
 * not been read yet answers null and starts the read). Same normalisation as
 * the relay's uniqueness key, so "scott", "Scott" and "SCOTT " are one name.
 * Never the self row, never a seat with no machine; `broadcast`, `god`,
 * `human` and `member:` addresses are the router's and are never resolved.
 * Exactly one row wins; two or more come back as `member:<id>` lines the
 * bounce can quote.
 */
export function resolveTeammate(name: string): { memberId: string } | { ambiguous: string[] } | null {
  const key = bossNameKey(name ?? '');
  if (!key || key === 'broadcast' || key === 'god' || key === 'human' || key.startsWith('member:')) return null;
  if (!readMembership()) return null;
  if (!roster) { void rosterFresh(); return null; }
  const hits = roster.members.filter((m) => !m.isSelf && m.devices.length > 0
    && ((m.name != null && bossNameKey(m.name) === key) || (m.bossName != null && bossNameKey(m.bossName) === key)));
  if (hits.length === 0) return null;
  if (hits.length === 1) return { memberId: hits[0].memberId };
  return {
    ambiguous: hits.map((m) => `member:${m.memberId} (${m.name ?? 'unnamed'}${m.bossName ? `, orchestrator "${m.bossName}"` : ''})`),
  };
}

/* ---- the thread store ----------------------------------------------------- */

const threadSubs = new Set<(memberId: string) => void>();
const requestSubs = new Set<() => void>();

export function onThread(fn: (memberId: string) => void): () => void {
  threadSubs.add(fn);
  return () => { threadSubs.delete(fn); };
}

export function onRequests(fn: () => void): () => void {
  requestSubs.add(fn);
  return () => { requestSubs.delete(fn); };
}

function threadsDir(): string {
  return join(app.getPath('userData'), 'teams', 'threads');
}

function writeJson(file: string, value: unknown): void {
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, JSON.stringify(value, null, 2), { encoding: 'utf8', mode: 0o600 });
  renameSync(tmp, file);
}

function readJson<T>(file: string): T | null {
  if (!existsSync(file)) return null;
  try { return JSON.parse(readFileSync(file, 'utf8')) as T; } catch { return null; }
}

export function threadFor(memberId: string): ThreadView {
  const me = readMembership();
  const threadId = me ? threadIdFor(me.memberId, memberId) : '';
  const stored = threadId ? readJson<ThreadView>(join(threadsDir(), `${threadId}.json`)) : null;
  return stored ?? { memberId, threadId, messages: [] };
}

function appendThread(memberId: string, entry: ThreadEntry): void {
  const t = threadFor(memberId);
  if (!t.threadId) return;
  // The same hive message can arrive twice (a drain after an ack the relay
  // did not see); the thread shows it once.
  if (t.messages.some((m) => m.id === entry.id)) return;
  t.messages.push(entry);
  writeJson(join(threadsDir(), `${t.threadId}.json`), t);
  threadSubs.forEach((fn) => fn(memberId));
}

function updateDelivery(memberId: string, id: string, delivery: Delivery): void {
  const t = threadFor(memberId);
  const m = t.messages.find((x) => x.id === id);
  if (!m || !t.threadId) return;
  m.delivery = delivery;
  writeJson(join(threadsDir(), `${t.threadId}.json`), t);
  threadSubs.forEach((fn) => fn(memberId));
}

/**
 * THE ESCAPE HATCH (0.4.11). One thread file per pair, forever, was the trap:
 * `threadIdFor` keys the pair, the store only appends, and nothing anywhere
 * created a fresh thread. Four entries in and the composer was dead, telling
 * the person at the keyboard to go and ask themselves.
 *
 * RENAMED, NEVER DELETED. The live file moves to `thr_<hash>.1.json` (then
 * `.2`, `.3` on later rotations), so the history is archived, not destroyed.
 * `threadFor` reads only the unnumbered file, so the pair's thread is empty
 * again and the whole budget with it. An inbound message from the peer after
 * the rotation derives the same `threadIdFor` hash and lands in the NEW file;
 * nothing holds a thread array in memory (`threadFor` reads the disk on every
 * call), so there is no stale copy to resurrect the old one.
 *
 * THE DOOR IS THE PERSON'S ALONE. It is reached over `teams:thread:new` from
 * D11's composer and is not addressable by an agent: agents cross the bridge
 * through `send`, whose refusals still say `ASK_THE_HUMAN`, and the brief in
 * `crossUserBrief` never mentions rotation. Rotating when there is nothing to
 * rotate still answers ok, because the state the caller asked for (an empty
 * thread) is the state there is.
 */
export function startNewThread(memberId: string): { ok: boolean } {
  const me = readMembership();
  if (!me || !memberId || memberId === me.memberId) return { ok: false };
  const threadId = threadIdFor(me.memberId, memberId);
  const live = join(threadsDir(), `${threadId}.json`);
  if (existsSync(live)) {
    let n = 1;
    while (existsSync(join(threadsDir(), `${threadId}.${n}.json`))) n++;
    renameSync(live, join(threadsDir(), `${threadId}.${n}.json`));
    hive?.appendLog({ kind: 'teams-thread-rotated', memberId, threadId, archived: `${threadId}.${n}.json` });
  }
  // The same push a new message makes, so the open thread view reloads and
  // the composer reopens without a second wire.
  threadSubs.forEach((fn) => fn(memberId));
  return { ok: true };
}

/* ---- outbound ------------------------------------------------------------- */

export type SendOutcome =
  | { ok: true; delivery: Delivery; via: 'envelope' | 'request' }
  | { ok: false; reason: string };

function bounce(msg: HiveMessage, reason: string): SendOutcome {
  hive?.appendLog({ kind: 'drop', reason: 'teams-refused', detail: reason, from: msg.from, to: msg.to, id: msg.id });
  // The same shape as the router's own bounces, so god reads it the same way.
  // Never bounce a message god itself wrote back to god's own inbox as new mail
  // from a stranger: it is marked, and it is from the system.
  hive?.send({
    to: hive.godId(),
    act: 'inform',
    conversation: msg.conversation,
    in_reply_to: msg.id,
    subject: `[refused — ${reason}] ${msg.subject}`,
    body: `Your message to ${msg.to} was not sent.\n\n${msg.body}`,
  }, 'system');
  return { ok: false, reason };
}

/* ---- the permission axis, both directions --------------------------------- */

/**
 * What THIS MACHINE permits with one teammate, right now.
 *
 * Three tiers for the per person half, most specific first: your override for
 * that person, then this machine's own default, then the org default the relay
 * reports. That half is then ANDed with your STATUS, so switching the machine
 * to `off` silences everybody without walking the roster, which is the whole
 * point of having a status.
 *
 * `statusNow` re-reads the schedule on every call rather than trusting the
 * minute timer in `start()`. A machine that slept through a window boundary
 * wakes with the timer still pending, and a send in that gap would otherwise
 * act on a status the person had scheduled themselves out of.
 */
function policyFor(memberId: string, org: RelayRoster['org']): TeamPolicy {
  const perPerson = youPolicyFor(memberId) ?? youPolicyDefault() ?? normalizePolicy(org.defaultPermission);
  return effectivePolicy(statusNow(), perPerson);
}

/* ---- files: a path in, a link out ----------------------------------------- */

/** Ask the disk about one candidate. Symlinks are resolved HERE, so the
 *  containment test in `isInsideWorkspace` sees the real target and a link
 *  inside the workspace cannot smuggle a file from outside it. */
const probePath: PathProbe = (raw) => {
  try {
    const real = realpathSync(raw);
    return { real, isFile: statSync(real).isFile() };
  } catch {
    return null;
  }
};

/** The store's refusal codes, mapped onto the sentence an agent can act on. */
const SHARE_REFUSAL: Record<ShareRefusal, ShareBlockCode> = {
  notAbsolute: 'unreadable',
  notAFile: 'unreadable',
  unreadable: 'unreadable',
  tooBig: 'too-big',
  tooMany: 'too-many',
  noServer: 'no-link',
  noTunnel: 'no-link',
};

/**
 * Replace every local path in an outbound body with a link that dies in an
 * hour, or refuse the message.
 *
 * REFUSE, never send anyway. A message that crosses with a raw path in it is
 * the defect: the reader's agent either finds nothing or finds a different
 * file at the same path. So a file that cannot be published stops the message,
 * and the sender is told which file and what to do about it.
 *
 * A candidate that is not on this disk at all is PROSE and is left alone; see
 * `scanBody`. That is what keeps an ordinary sentence with a slash in it from
 * being treated as an attachment.
 */
async function shareLocalFiles(msg: HiveMessage): Promise<{ message: HiveMessage } | { refused: string }> {
  const { files, notFiles } = scanBody(msg.body, probePath);
  if (!files.length && !notFiles.length) return { message: msg };

  // A directory, a device or a socket named a real thing and is still not
  // shareable. It is not prose, so it is refused rather than passed through.
  if (notFiles.length) return { refused: shareBlock('unreadable', notFiles[0].name).fix };
  if (!shareHost) return { refused: shareBlock('no-link', files[0].name).fix };

  // THE GUARD. A person typing a path into the send box chose that file. An
  // agent may only publish what is inside the workspace it was hired into,
  // which is the boundary the person already drew.
  let root: string | null = null;
  if (!personChose(msg.from)) {
    const workspace = shareHost.workspaceFor(msg.from);
    try {
      root = workspace ? realpathSync(workspace) : null;
    } catch {
      root = null;
    }
    if (!root) return { refused: shareBlock('no-workspace', files[0].name).fix };
  }

  const refs: { token: string; name: string; text: string }[] = [];
  for (const file of files) {
    if (root && !isInsideWorkspace(root, file.real)) {
      return { refused: shareBlock('outside-workspace', file.name).fix };
    }
    const made = await shareHost.create(file.real);
    if (!made.ok) return { refused: shareBlock(SHARE_REFUSAL[made.error], file.name).fix };
    if (!made.share.url) return { refused: shareBlock('no-link', file.name).fix };
    refs.push({
      token: file.token,
      name: baseName(file.token),
      text: shareRef(made.share.name, made.share.url, expiresIn(made.share, Date.now())),
    });
    hive?.appendLog({ kind: 'teams-share', id: made.share.id, to: msg.to, message: msg.id });
  }
  return { message: { ...msg, body: applyShares(msg.body, refs) } };
}

/** Build the wire ciphertext every listed device can open. */
async function sealFor(devices: RelayDevice[], plaintext: string): Promise<{ ciphertext: string; nonce: string; senderSignature: string }> {
  await initCrypto();
  await _sodium.ready;
  const s = _sodium;
  const key = s.randombytes_buf(s.crypto_secretbox_KEYBYTES);
  const nonce = s.randombytes_buf(s.crypto_secretbox_NONCEBYTES);
  const box = s.crypto_secretbox_easy(new Uint8Array(Buffer.from(plaintext, 'utf8')), nonce, key);
  const keys: Record<string, string> = {};
  const keyB64 = Buffer.from(key).toString('base64');
  for (const d of devices) {
    keys[d.deviceId] = (await sealTo(b64urlToB64(d.publicKey), keyB64)).ciphertext;
  }
  const ciphertext = b64url(new Uint8Array(Buffer.from(JSON.stringify({ v: 1, box: Buffer.from(box).toString('base64'), keys }), 'utf8')));
  const sig = await signDetached(ciphertext);
  if (!sig) throw new Error('no signing key on this machine');
  return { ciphertext, nonce: b64url(nonce), senderSignature: b64url(sig) };
}

/**
 * Send one hive message to a teammate on other machines. Called by the hive
 * router for `member:` addresses and by D11's send box.
 */
export async function send(msg: HiveMessage): Promise<SendOutcome> {
  const memberId = msg.to.startsWith('member:') ? msg.to.slice('member:'.length) : '';
  const me = readMembership();
  if (!me) return bounce(msg, 'this machine is not in a team');
  if (!memberId || memberId === me.memberId) return bounce(msg, `"${msg.to}" is not a teammate`);

  const found = await memberOrRefresh(memberId);
  if (!found) return bounce(msg, `no teammate member:${memberId} on the roster`);
  const { r: seen, m } = found;
  const name = m.name ?? `member:${memberId}`;
  if (m.suspended) return bounce(msg, `${name} is suspended`);

  // THE PERMISSION AXIS. Both sides are read here, and the refusal names the
  // side that is closed, because "you are set to receive only" and "they are
  // not accepting messages" need two different things done about them by two
  // different people. `mine` is recomputed on every send: the status may have
  // moved on the schedule since the last one.
  const mine = policyFor(memberId, seen.org);
  const theirs = normalizePolicy(m.theyAllow);
  const block = sendBlock(mine, theirs);
  // My own door. The only thing the agent can do is stop and ask its human,
  // which is the sentence `@shared/teamMessage` exists to hand it.
  if (block === 'you-not-sending') return bounce(msg, ASK_THE_HUMAN);
  // Their door. `theyAllow` is the only word the relay carries and `strict` is
  // the only one of the three that closes it, so this is the same refusal
  // 0.4.9 shipped, reached through the policy rather than a string compare.
  if (block === 'they-not-receiving') return bounce(msg, `${name} allows nothing from you (strict)`);
  // 0.5.2: the door THEY published (`receivePublication` on their machine,
  // read back as `receiving` on the roster row). `theyAllow` is the org's
  // word about them; this is their own machine's answer for THIS sender, and
  // when it says no the message would only have been dropped on arrival and
  // reported here as delivered. Absent on an older relay, and then nothing is
  // predicted beyond `theyAllow`.
  if (m.receiving === false) return bounce(msg, `${name} is not receiving messages from you right now`);
  if (m.devices.length === 0) return bounce(msg, `${name} has no machine enrolled`);
  // THE CONSEQUENCE OF `requireFingerprint` (plan Phase 3, Pam's S1). When the
  // org requires verification, nothing is sealed to a key this person has not
  // confirmed: every machine the message would go to must be verified, since
  // a message sealed to one unverified key is exactly what the policy forbids.
  const pol = teamsOrg.policy();
  if (pol?.requireFingerprint) {
    const unverified = m.devices.filter((d) => !trustFor(d.deviceId, fingerprintFor(b64urlToB64(d.publicKey))).verified);
    if (unverified.length) {
      return bounce(msg, `${me.orgName} requires you to verify ${name}'s key before messaging them; open their row in Team and compare the safety number for ${unverified.map((d) => d.name).join(', ')}`);
    }
  }

  // A local path is a dead reference on another machine. Done BEFORE the
  // thread entry so what this machine remembers sending is what it sent, and
  // before sealing so the link is inside the ciphertext rather than beside it.
  const shared = await shareLocalFiles(msg);
  if ('refused' in shared) return bounce(msg, shared.refused);
  msg = shared.message;

  // 0.5.2, Option D: the sending agent's name goes INSIDE the ciphertext,
  // beside its id, so the other machine can say "Michael A's Kevin" without
  // the relay ever holding an agent's name. `you` (the person's send box) and
  // an id the hive does not know both travel as null, and the reader shows
  // the person alone, as before.
  const agent = hive?.agentName?.(msg.from) ?? null;
  const entry: ThreadEntry = {
    id: msg.id, from: 'you', act: msg.act, subject: msg.subject, body: msg.body,
    at: msg.created_at, delivery: 'sending',
    ...(agent ? { agent } : {}),
  };
  appendThread(memberId, entry);

  let sealed;
  try {
    sealed = await sealFor(m.devices, JSON.stringify({
      v: 1, kind: 'hive-message', message: msg, sender: { agentId: msg.from, agent },
    }));
  } catch (e) {
    updateDelivery(memberId, msg.id, 'failed');
    return bounce(msg, `could not seal: ${e instanceof Error ? e.message : String(e)}`);
  }

  // 0.5.2: the relay refuses a message into a closed door with 403
  // `not_receiving` and stores nothing, so the entry is FAILED, never
  // "delivered" for mail nobody will read, and the bounce carries the relay's
  // own sentence. The cached roster row said otherwise a moment ago, so the
  // next read fetches rather than bouncing on a stale row for a minute.
  const refused = (r: RelayFailure): SendOutcome => {
    updateDelivery(memberId, msg.id, 'failed');
    if (r.error === 'not_receiving') {
      rosterAt = 0;
      return bounce(msg, r.detail ?? `${name} is not receiving messages from you right now`);
    }
    return bounce(msg, `the relay refused: ${r.detail ?? r.error}`);
  };

  if (msg.act === 'request') {
    const r = await postRequest({
      toMemberId: memberId, type: 'run-task', ...sealed,
      expiresAt: new Date(Date.now() + REQUEST_TTL_MS).toISOString(),
    });
    if (!r.ok) return refused(r);
    const delivery: Delivery = r.data.delivered.length ? 'delivered' : 'queued';
    updateDelivery(memberId, msg.id, delivery);
    hive?.appendLog({ kind: 'teams-sent', via: 'request', to: msg.to, id: msg.id, delivery });
    return { ok: true, delivery, via: 'request' };
  }

  const r = await postEnvelope({
    toDeviceIds: m.devices.map((d) => d.deviceId), ...sealed,
    threadId: threadIdFor(me.memberId, memberId), sentAt: msg.created_at,
  });
  if (!r.ok) return refused(r);
  const delivery: Delivery = r.data.delivered.length ? 'delivered' : 'queued';
  updateDelivery(memberId, msg.id, delivery);
  hive?.appendLog({ kind: 'teams-sent', via: 'envelope', to: msg.to, id: msg.id, delivery });
  return { ok: true, delivery, via: 'envelope' };
}

/* ---- the message contract, enforced on THIS side of the bridge ------------- */

/**
 * What a `DraftMessage` act means in hive vocabulary.
 *
 * `handoff` is the only one that becomes a `request`, because a request is the
 * act that can become WORK on the other machine and a handoff is the only one
 * of the four that is asking for work. An `ask` is a `query`: it wants an
 * answer, not a task. Getting this wrong in the other direction would route
 * every question into a teammate's approval queue.
 */
const HIVE_ACT: Record<DraftAct, MessageAct> = {
  ask: 'query',
  answer: 'inform',
  inform: 'inform',
  handoff: 'request',
};

/** Take whatever crossed the bridge and make a draft of it. Nothing here
 *  trusts the renderer: a missing field becomes an empty string, which
 *  `validateMessage` then refuses with the sentence that says how to fix it. */
function asDraft(value: unknown): DraftMessage {
  const raw = (value && typeof value === 'object' ? value : {}) as Partial<DraftMessage>;
  return {
    subject: typeof raw.subject === 'string' ? raw.subject.trim() : '',
    body: typeof raw.body === 'string' ? raw.body.trim() : '',
    // NEVER defaulted to `inform`. A missing or nonsense act comes through as
    // itself so `validateMessage` reports `act-unknown` and the caller is told
    // to set one, rather than having a message quietly relabelled for it.
    act: (typeof raw.act === 'string' ? raw.act : '') as DraftAct,
    expectsReply: raw.expectsReply === true,
  };
}

/**
 * THE COUNTS `checkRate` NEEDS, DERIVED FROM THE THREAD STORE.
 *
 * They come from the same files the thread pane reads, because a ceiling
 * counted anywhere else is a ceiling that disagrees with what the person can
 * see. `sentLastHour` walks this person's thread rather than a counter, so a
 * restart does not reset the hour.
 *
 * `openThreads` is 0 or 1 BY CONSTRUCTION and cannot reach the ceiling of 3:
 * `threadIdFor` keys one thread per PAIR, so two people have exactly one
 * thread between them however many subjects they discuss. It is derived
 * honestly rather than reported as 0, and the ceiling starts to bite the day
 * threads are keyed per subject. Recorded in the report, not hidden here.
 *
 * `threadEntries` is `turnsUsed`, not `messages.length` (0.4.11): a send of
 * YOURS that ended `failed` never reached anyone and buys no turn, so a run
 * of failures cannot spend the thread. The hourly ceiling still counts every
 * attempt including failed ones, because it meters tries against the relay
 * and a failed try was still a try.
 */
function rateStateFor(memberId: string, now = Date.now()): RateState {
  const messages = threadFor(memberId).messages;
  const hourAgo = now - 3600_000;
  const sentLastHour = messages.filter((m) => {
    if (m.from !== 'you') return false;
    const at = Date.parse(m.at);
    return Number.isFinite(at) && at >= hourAgo;
  }).length;
  const last = messages[messages.length - 1];
  const awaiting = !!last && last.from === 'you'
    && (last.act === 'request' || last.act === 'query' || last.act === 'propose');
  return { sentLastHour, openThreads: awaiting ? 1 : 0, threadEntries: turnsUsed(messages) };
}

/**
 * D11's send box, and the ONE main side gate on the message contract.
 *
 * THE SHAPE CROSSES WHOLE. It used to be `(memberId, body)` with the subject
 * folded into the first line, which is how one string ended up carrying two
 * things. A `DraftMessage` has a subject, a body, an act and whether a reply
 * is wanted, and all four survive the trip.
 *
 * THE CONTRACT IS CHECKED HERE AND NOT ONLY IN THE COMPOSER. The renderer's
 * checks are for the person typing; anything reaching this door over IPC must
 * meet the same contract, and a check that lives only in the UI is not a
 * contract. Both halves run: `validateMessage` on the text, which an agent can
 * fix by rewriting, and `checkRate` on the history, which it cannot.
 */
export async function sendFromPerson(memberId: string, draft: unknown): Promise<SendOutcome> {
  const d = asDraft(draft);
  // This door is D11's send box, so the sender IS the person: a refusal here
  // must say what THEY can do (start a new thread, widen the person in Team)
  // and never "ask your human", which is an agent being told to find them.
  // `checkRate` defaults to `agent` for every other caller.
  const violations = [...validateMessage(d), ...checkRate({ ...rateStateFor(memberId), sender: 'person' }, DEFAULT_TURN_BUDGET)];
  if (violations.length) return { ok: false, reason: explainViolations(violations) };

  const msg: HiveMessage = {
    id: `${Date.now().toString(36)}-${randomBytes(3).toString('hex')}`,
    conversation: `conv-${threadIdFor(readMembership()?.memberId ?? '', memberId).slice(4, 12)}`,
    in_reply_to: null,
    from: 'you',
    to: `member:${memberId}`,
    act: HIVE_ACT[d.act],
    subject: d.subject,
    body: d.body,
    hops: 0,
    requires_reply: d.expectsReply,
    needs_human: false,
    created_at: new Date().toISOString(),
  };
  return send(msg);
}

/* ---- inbound -------------------------------------------------------------- */

type Opened = {
  message: HiveMessage;
  member: RelayMember;
  device: RelayDevice;
  org: RelayRoster['org'];
  /** The sender's agent as the sealed payload named it (0.5.2), or null
   *  from the person's own send box or an older build. */
  senderAgent: string | null;
};

type OpenFailure = { drop: string } | { hold: string };

/**
 * Open one wire item against the pinned key of its sender. Every refusal
 * names why in the log and never renders; a changed key HOLDS the item for
 * D13 instead of dropping it, because the person may confirm the new key.
 */
async function open(item: { fromDeviceId: string; fromMemberId: string; ciphertext: string; nonce: string; senderSignature: string }): Promise<Opened | OpenFailure> {
  const me = readMembership();
  if (!me) return { drop: 'not in a team' };
  const found = await deviceOrRefresh(item.fromDeviceId);
  if (!found) return { drop: `unknown sender device ${item.fromDeviceId}` };
  const { r, member, device } = found;
  if (member.memberId !== item.fromMemberId) return { drop: 'sender device does not belong to the claimed member' };

  // THE PIN. The key we verify against is the one the roster shows for this
  // device, and trustFor pins its fingerprint on first sight. A fingerprint
  // that differs from the pin is D13: hold, do not open.
  const pkB64 = b64urlToB64(device.publicKey);
  const trust = trustFor(device.deviceId, fingerprintFor(pkB64));
  if (trust.previousFingerprint) return { hold: `key changed for ${device.deviceId}; awaiting D13` };

  await initCrypto();
  await _sodium.ready;
  const s = _sodium;
  const pk = new Uint8Array(Buffer.from(pkB64, 'base64'));
  let sigOk = false;
  try {
    sigOk = s.crypto_sign_verify_detached(b64urlToBytes(item.senderSignature), new Uint8Array(Buffer.from(item.ciphertext, 'utf8')), pk);
  } catch { sigOk = false; }
  if (!sigOk) return { drop: 'senderSignature does not verify against the pinned key' };

  let wire: { v?: unknown; box?: unknown; keys?: Record<string, unknown> };
  try { wire = JSON.parse(Buffer.from(b64urlToB64(item.ciphertext), 'base64').toString('utf8')); }
  catch { return { drop: 'ciphertext is not a multi-recipient envelope' }; }
  const sealedKey = wire?.keys?.[me.deviceId];
  if (wire?.v !== 1 || !isStr(wire.box) || !isStr(sealedKey)) return { drop: 'no key for this device in the envelope' };

  let plaintext: string;
  try {
    const keyB64 = await openSealed({ ciphertext: sealedKey, senderPublicKey: pkB64 }, pkB64);
    const opened = s.crypto_secretbox_open_easy(
      new Uint8Array(Buffer.from(wire.box, 'base64')), b64urlToBytes(item.nonce), new Uint8Array(Buffer.from(keyB64, 'base64')),
    );
    plaintext = Buffer.from(opened).toString('utf8');
  } catch (e) {
    return { drop: `could not open: ${e instanceof Error ? e.message : String(e)}` };
  }

  let payload: { v?: unknown; kind?: unknown; message?: Partial<HiveMessage>; sender?: unknown };
  try { payload = JSON.parse(plaintext); } catch { return { drop: 'plaintext is not JSON' }; }
  const m = payload?.message;
  if (payload?.v !== 1 || payload.kind !== 'hive-message' || !m || !isAct(m.act) || !isStr(m.subject) || !isStr(m.body)) {
    return { drop: 'not a hive message' };
  }
  // 0.5.2: which of THEIR agents wrote. Optional, because a 0.5.1 sender
  // seals no `sender` at all, and a message with none still opens. The name
  // is remembered per teammate per agent id (teamNames.ts) so the roster row
  // and god's roster line can list what their floor calls its agents. It is
  // decrypted from a verified sender, and it is still treated as input.
  const sender = payload.sender && typeof payload.sender === 'object' ? payload.sender as { agentId?: unknown; agent?: unknown } : null;
  const senderAgent = sender && isStr(sender.agent) && sender.agent.trim() ? sender.agent.trim().slice(0, 80) : null;
  if (senderAgent && isStr(sender?.agentId) && SAFE_ID.test(sender.agentId)) pinAgentName(member.memberId, sender.agentId, senderAgent);
  // ROUTING FIELDS ARE OURS, NOT THE WIRE'S. The sender is who the pin says,
  // the recipient is the local god, and hops start again on this floor.
  const message: HiveMessage = {
    id: isStr(m.id) && SAFE_ID.test(m.id) ? m.id : `${Date.now().toString(36)}-${randomBytes(3).toString('hex')}`,
    conversation: isStr(m.conversation) ? m.conversation.slice(0, 120) : `conv-${threadIdFor(me.memberId, member.memberId).slice(4, 12)}`,
    in_reply_to: isStr(m.in_reply_to) ? m.in_reply_to : null,
    from: `member:${member.memberId}`,
    to: 'god',
    act: m.act,
    subject: m.subject.slice(0, 500),
    body: m.body,
    hops: 0,
    requires_reply: m.act === 'request' || m.act === 'query' || m.act === 'propose',
    needs_human: false,
    created_at: isStr(m.created_at) ? m.created_at : new Date().toISOString(),
  };
  return { message, member, device, org: r.org, senderAgent };
}

/** The subject prefix god reads: the person, their agent when the message
 *  named one, and the machine. `[from Michael A's Kevin on a-laptop]`, or
 *  `[from Michael A on a-laptop]` from the person's send box or an older
 *  build, which is exactly the 0.5.1 prefix. */
function fromPrefix(name: string, agent: string | null | undefined, machine: string): string {
  return agent ? `[from ${name}'s ${agent} on ${machine}]` : `[from ${name} on ${machine}]`;
}

/**
 * Who takes an inbound teammate message on this floor (0.5.2, founder ruling,
 * Option A): the configured responder when it is active, else god. The same
 * rule the renderer applies to a Slack request, from the same shared module,
 * so the two channels cannot disagree. A hive with no opinion (the test
 * harness, an older attach) answers god, which is what 0.5.1 always did.
 */
function responderId(): string {
  const god = hive?.godId() ?? 'god';
  return resolveResponder(hive?.responder?.(), hive?.activeAgentIds?.() ?? [], god);
}

/** Hand an opened message to whoever answers on this floor, and show it in
 *  the thread. */
function deliverLocally(o: Opened, via: 'envelope' | 'request'): void {
  const name = o.member.name ?? o.member.memberId;
  const to = responderId();
  const sent = hive?.send({
    ...o.message,
    to,
    subject: `${fromPrefix(name, o.senderAgent, o.device.name)} ${o.message.subject}`,
  }, o.message.from);
  appendThread(o.member.memberId, {
    id: o.message.id, from: o.member.memberId, act: o.message.act, subject: o.message.subject,
    body: o.message.body, at: o.message.created_at, delivery: 'delivered',
    ...(o.senderAgent ? { agent: o.senderAgent } : {}),
  });
  hive?.appendLog({ kind: 'teams-received', via, from: o.message.from, id: o.message.id, to, delivered: !!sent });
}

/* ---- the request queue (D10) ---------------------------------------------- */

function requestsDir(): string {
  return join(app.getPath('userData'), 'teams', 'requests');
}

interface StoredRequest extends PendingRequest {
  /** Kept so a decision can deliver the message exactly as it was opened. */
  message: HiveMessage;
  deviceName: string;
  /** 0.5.2: the sender's agent, kept so the delivery after a decision reads
   *  the same as an immediate one. Absent in a file a 0.5.1 build wrote. */
  senderAgent?: string | null;
}

/**
 * WHAT THIS MACHINE HAS ALREADY TAKEN OFF THE RELAY, by the relay's own id
 * (0.5.2, card v052-teammate-message-notifications).
 *
 * The relay never learns that a request was handled: `/queue` lists every
 * request addressed to this device until seven days after it expires
 * (teams-backend store.mjs `listRequests`, `REQUEST_PURGE_MS`), decided ones
 * included, and the socket re-drains that list on every reconnect and every
 * fifteen minutes on a live socket. Before this file existed the bridge met
 * each re-listed request as new: with `commands` on it went to god again as
 * work; without, its file was written again and the approval toast came back,
 * including for a request the person had declined minutes earlier. That was
 * the "new message with no new message" the founder reported. An envelope
 * has an ack, so it comes back only when that one frame was lost; when it
 * does, the same rule applies.
 *
 * So an id is written here the moment its item is delivered, queued or
 * decided, and a re-listed id is dropped before it is even opened. On disk,
 * 0600, because the replay outlives a restart; pruned past the relay's own
 * purge window so the file cannot grow without bound.
 */
const HANDLED_KEEP_MS = 9 * 24 * 3600 * 1000;

function handledFile(): string {
  return join(app.getPath('userData'), 'teams', 'handled.json');
}

function readHandled(): Record<string, string> {
  const raw = readJson<Record<string, unknown>>(handledFile());
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [id, at] of Object.entries(raw)) if (SAFE_ID.test(id) && typeof at === 'string') out[id] = at;
  return out;
}

function isHandled(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(readHandled(), id);
}

function markHandled(id: string, now = Date.now()): void {
  if (!SAFE_ID.test(id)) return;
  const all = readHandled();
  all[id] = new Date(now).toISOString();
  for (const [id, at] of Object.entries(all)) {
    const t = Date.parse(at);
    if (!Number.isFinite(t) || now - t > HANDLED_KEEP_MS) delete all[id];
  }
  writeJson(handledFile(), all);
}

/** The ids already reported as repeats this process, so a drain every quarter
 *  hour does not write the same log line for eight days. */
const repeatLogged = new Set<string>();

export function pendingRequests(): PendingRequest[] {
  const dir = requestsDir();
  if (!existsSync(dir)) return [];
  const now = Date.now();
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => readJson<StoredRequest>(join(dir, f)))
    .filter((r): r is StoredRequest => !!r && typeof r.id === 'string')
    .map(({ message, deviceName, ...view }) => { void message; void deviceName; return { ...view, expired: Date.parse(view.expiresAt) < now }; })
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

export async function decide(id: string, decision: RequestDecision): Promise<{ ok: boolean }> {
  if (!SAFE_ID.test(id)) return { ok: false };
  const file = join(requestsDir(), `${id}.json`);
  const stored = readJson<StoredRequest>(file);
  if (!stored) return { ok: false };
  // Whatever the answer, the relay will list this request again; it must not
  // come back as a new one.
  markHandled(id);
  if (decision === 'decline') {
    rmSync(file, { force: true });
    hive?.appendLog({ kind: 'teams-request', id, decision });
    requestSubs.forEach((fn) => fn());
    return { ok: true };
  }
  // `always` is the person saying "let this one through from now on", which is
  // the `open` preset: messages both ways, and work. It is written as a policy
  // rather than the old word so the control that shows it cannot disagree.
  if (decision === 'always') setYouPolicy(stored.fromMemberId, policyOf('open'));
  const r = await rosterFresh();
  const member = r && findMember(r, stored.fromMemberId);
  const device = member?.devices.find((d) => d.name === stored.deviceName) ?? member?.devices[0];
  if (r && member && device) {
    deliverLocally({ message: stored.message, member, device, org: r.org, senderAgent: stored.senderAgent ?? null }, 'request');
  } else {
    // The sender left the org between the request and the decision. The
    // message was already opened against their key; deliver it as it was.
    hive?.send({ ...stored.message, to: responderId(), subject: `${fromPrefix(stored.fromName, stored.senderAgent, stored.fromMachine)} ${stored.message.subject}` }, stored.message.from);
  }
  rmSync(file, { force: true });
  hive?.appendLog({ kind: 'teams-request', id, decision });
  requestSubs.forEach((fn) => fn());
  return { ok: true };
}

/* ---- receive from the spool ----------------------------------------------- */

export type ReceiveOutcome = 'delivered' | 'queued' | 'held' | `dropped: ${string}`;

/**
 * THE INBOUND DOOR IS MINE ALONE.
 *
 * Only `mine` is checked here, never `canReceiveFrom`. Their half of that
 * question is whether they SEND, and an envelope that arrived is the proof
 * that they did; re-asking a roster that may be a minute stale would silence a
 * real teammate over a cached row. The roster's `theyAllow` is a PREDICTION,
 * which is what the Team screen draws it as, and never the gate on a message
 * already in hand.
 */
async function receiveEnvelope(item: QueueEnvelope): Promise<ReceiveOutcome> {
  // An envelope whose ack the relay never saw comes back on the next drain.
  // God has had it; the thread shows it.
  if (isHandled(item.envelopeId)) return 'dropped: already delivered';
  const o = await open(item);
  if ('drop' in o) return `dropped: ${o.drop}`;
  if ('hold' in o) return 'held';
  const mine = policyFor(o.member.memberId, o.org);
  if (!mine.receive) return `dropped: you are not receiving messages from ${o.member.name ?? o.member.memberId}`;
  deliverLocally(o, 'envelope');
  markHandled(item.envelopeId);
  return 'delivered';
}

async function receiveRequest(item: QueueRequest): Promise<ReceiveOutcome> {
  // A request this machine already delivered, queued or decided. The relay
  // re-lists it on every drain until its purge date; it is not new mail.
  if (isHandled(item.requestId)) {
    if (repeatLogged.has(item.requestId)) return 'dropped: already handled (repeat)';
    repeatLogged.add(item.requestId);
    return 'dropped: already handled';
  }
  // Expired on the relay before this machine ever saw it: the sender's ask is
  // over, and a toast for it now would announce old news as new. A request
  // that expires AFTER it was queued here keeps its file and shows as expired.
  if (item.expired === true || (typeof item.expiresAt === 'string' && Date.parse(item.expiresAt) < Date.now())) {
    markHandled(item.requestId);
    return 'dropped: expired before it arrived';
  }
  const o = await open(item);
  if ('drop' in o) return `dropped: ${o.drop}`;
  if ('hold' in o) return 'held';
  const mine = policyFor(o.member.memberId, o.org);
  if (!mine.receive) return `dropped: you are not receiving messages from ${o.member.name ?? o.member.memberId}`;
  // `commands` is the axis with teeth: a message from them may become work on
  // this machine. Without it the request still ARRIVES, it just waits for the
  // person, which is what the queue is for.
  if (mine.commands) {
    markHandled(item.requestId);
    deliverLocally(o, 'request');
    hive?.appendLog({ kind: 'teams-request', id: item.requestId, decision: 'auto-approved', because: 'commands' });
    return 'delivered';
  }
  const kind: RequestKind = item.type === 'share-context' || item.type === 'join-thread' ? item.type : 'run-task';
  const stored: StoredRequest = {
    id: item.requestId, fromMemberId: o.member.memberId, fromName: o.member.name ?? o.member.memberId,
    fromMachine: o.device.name, type: kind, subject: o.message.subject, body: o.message.body,
    at: item.at ?? o.message.created_at, expiresAt: item.expiresAt, expired: false,
    message: o.message, deviceName: o.device.name, senderAgent: o.senderAgent,
  };
  writeJson(join(requestsDir(), `${item.requestId}.json`), stored);
  markHandled(item.requestId);
  requestSubs.forEach((fn) => fn());
  return 'queued';
}

/**
 * One spool file, by the name the session wrote it under. Delivered, queued
 * and dropped items leave the spool; a held one moves aside for D13 and is
 * retried when the person answers.
 */
export async function receive(kind: 'envelopes' | 'requests', id: string): Promise<ReceiveOutcome> {
  if (!SAFE_ID.test(id)) return 'dropped: unsafe id';
  const file = join(session.spoolDir(kind), `${id}.json`);
  const raw = readJson<QueueEnvelope | QueueRequest>(file);
  if (!raw) return 'dropped: unreadable spool file';
  const outcome = kind === 'envelopes'
    ? await receiveEnvelope(raw as QueueEnvelope)
    : await receiveRequest(raw as QueueRequest);
  if (outcome === 'held') {
    const aside = join(session.spoolDir(kind), 'held', `${id}.json`);
    mkdirSync(dirname(aside), { recursive: true, mode: 0o700 });
    renameSync(file, aside);
  } else {
    rmSync(file, { force: true });
  }
  // The first time a handled request comes back it is logged; the quarter
  // hourly repeats after that are not, or the log would carry one line per
  // request per drain for a week.
  if (!outcome.endsWith('(repeat)')) hive?.appendLog({ kind: 'teams-spool', item: kind, id, outcome });
  return outcome;
}

/** After D13's answer: everything held is offered again. */
export async function retryHeld(): Promise<void> {
  for (const kind of ['envelopes', 'requests'] as const) {
    const dir = join(session.spoolDir(kind), 'held');
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
      renameSync(join(dir, f), join(session.spoolDir(kind), f));
      await receive(kind, f.slice(0, -5));
    }
  }
}

/** Anything in the spool when the app starts: a crash between write and
 *  receive, or a build that spooled before this bridge existed. */
export async function drainSpool(): Promise<void> {
  for (const kind of ['envelopes', 'requests'] as const) {
    const dir = session.spoolDir(kind);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
      await receive(kind, f.slice(0, -5));
    }
  }
}

/* ---- your status and what you allow, for the one control that sets it ------ */

/**
 * How often the stored status is brought in line with the schedule.
 *
 * A minute is the resolution `StatusWindow` measures in, so nothing finer can
 * be expressed and nothing coarser would honour what was expressed. This timer
 * is a CONVENIENCE, not the enforcement: every send and every receive calls
 * `statusNow`, which applies the schedule itself. The timer exists so the
 * control on screen shows the status the machine is actually on, rather than
 * yesterday's choice while the message path quietly enforces something else.
 */
const SCHEDULE_TICK_MS = 60_000;

export interface PolicyView {
  /** The status as stored, after the schedule has been applied to it. */
  status: TeamPolicy;
  schedule: StatusSchedule;
  /** True while a window is deciding, so the control says the schedule is
   *  driving rather than pretending the person just chose this. */
  scheduleDriving: boolean;
  /** What you allow a teammate with no override of their own. Null means you
   *  have set none and the org default the relay reports applies. */
  policyDefault: TeamPolicy | null;
  /** Per person overrides, keyed by memberId. Absent is not `off`: it means
   *  this person follows the default. */
  overrides: Record<string, TeamPolicy>;
}

export function policyView(memberIds: readonly string[] = []): PolicyView {
  applySchedule();
  const overrides: Record<string, TeamPolicy> = {};
  for (const id of memberIds) {
    const own = youPolicyFor(id);
    if (own) overrides[id] = own;
  }
  return {
    status: myStatus(),
    schedule: myStatusSchedule(),
    scheduleDriving: scheduleDriving(),
    policyDefault: youPolicyDefault() ?? null,
    overrides,
  };
}

/** The one control's four writes. Every value goes through `normalizePolicy`
 *  or `normalizeSchedule` inside `teamPins`, so a renderer that sends nonsense
 *  fails closed rather than open. */
export function setStatus(value: TeamPolicy | PolicyPreset | null): { ok: true } {
  setMyStatus(value);
  return { ok: true };
}

export function setSchedule(value: unknown): { ok: true } {
  setMyStatusSchedule(value);
  return { ok: true };
}

export function setPolicy(memberId: string, value: TeamPolicy | null): { ok: true } {
  setYouPolicy(memberId, value);
  return { ok: true };
}

export function setPolicyDefault(value: TeamPolicy | null): { ok: true } {
  setYouPolicyDefault(value);
  return { ok: true };
}

/** Re-exported from `teamPins` so `src/main/index.ts` needs no second import
 *  to push a change at the renderer. */
export function onPolicy(fn: () => void): () => void {
  return onPolicyChange(fn);
}

/**
 * The rotation's own IPC door, registered beside the store it rotates rather
 * than in `src/main/index.ts` with the other `teams:` handlers, so the escape
 * hatch and the trap it opens live in one file. Same validation as
 * `teams:thread`: the id is coerced to a string and is only ever hashed by
 * `threadIdFor`, never used in a path. Guarded because the test harness stubs
 * electron with no `ipcMain`; in the app it always exists.
 */
ipcMain?.handle('teams:thread:new', (_e, memberId: unknown) => startNewThread(String(memberId ?? '')));

/* ---- the inbound door, published to the relay (0.5.2) ---------------------- */

/**
 * WHY THE RELAY IS TOLD AT ALL. The inbound door is decided HERE, on every
 * envelope, from the status and the per person policy (`policyFor`), and
 * that stays the gate. But the sender could not see it: their roster row
 * carried the org's word about this seat (`theyAllow`), the relay accepted
 * the envelope, their thread said "delivered", and this machine dropped it on
 * arrival and told nobody. So the door is PUBLISHED, as one `default` for
 * everyone and the per person exceptions, and the relay refuses a sender
 * into a closed door with `not_receiving` before anything is stored. It is
 * a prediction for the sender's screen and a refusal at the relay; it is
 * never what this machine consults about mail already in hand.
 *
 * WHEN. Once at start, on every policy write (the schedule moving the status
 * goes through the same write and the same notification), and forced when
 * the socket connects, because a machine that was offline may have changed
 * its door meanwhile and an older relay may have been updated. Debounced,
 * since one control click writes the store more than once. A relay that
 * does not know the field (`invalid_body` naming `receive`, or `not_found`)
 * is remembered as unsupported until the next connect, and logged once.
 *
 * `receivePublication` reads exactly the tiers `policyFor` reads, so the
 * relay's refusal and this machine's drop can never disagree.
 */
const RECEIVE_DEBOUNCE_MS = 300;

let receiveTimer: ReturnType<typeof setTimeout> | null = null;
let receiveForce = false;
/** The last publication the relay accepted, as JSON; an unchanged door is
 *  not sent again unless forced. */
let receiveLast: string | null = null;
/** Publishes are serialised, so two triggers close together cannot race the
 *  relay with an older door after a newer one. */
let receiveQueue: Promise<void> = Promise.resolve();
let receiveUnsupported = false;
let receiveUnsupportedLogged = false;

export function receivePublication(org: RelayRoster['org'], r: RelayRoster): ReceivePublication {
  const fallback = effectivePolicy(statusNow(), youPolicyDefault() ?? normalizePolicy(org.defaultPermission)).receive;
  const members: Record<string, boolean> = {};
  for (const m of r.members) {
    if (m.isSelf) continue;
    const receive = policyFor(m.memberId, org).receive;
    if (receive !== fallback) members[m.memberId] = receive;
  }
  return { default: fallback, members };
}

async function publishReceiveOnce(force: boolean): Promise<void> {
  if (!readMembership() || receiveUnsupported) return;
  const r = await rosterFresh();
  if (!r) return;
  const publication = receivePublication(r.org, r);
  const json = JSON.stringify(publication);
  if (!force && json === receiveLast) return;
  const res = await patchMe({ receive: publication });
  if (res.ok) {
    receiveLast = json;
    hive?.appendLog({ kind: 'teams-receive-published', default: publication.default, exceptions: Object.keys(publication.members).length });
    return;
  }
  if (res.error === 'not_found' || (res.error === 'invalid_body' && (res.detail ?? '').includes('unknown field: receive'))) {
    receiveUnsupported = true;
    if (!receiveUnsupportedLogged) {
      receiveUnsupportedLogged = true;
      hive?.appendLog({ kind: 'teams-receive-unsupported', error: res.error, detail: res.detail });
    }
    return;
  }
  // Anything else (offline, a 5xx) is left for the next trigger: the door on
  // this machine is unchanged, and the next write or connect tries again.
  hive?.appendLog({ kind: 'teams-receive-publish-failed', error: res.error, detail: res.detail });
}

function publishReceiveNow(force: boolean): Promise<void> {
  const run = () => publishReceiveOnce(force);
  receiveQueue = receiveQueue.then(run, run);
  return receiveQueue;
}

export function publishReceive(force = false): void {
  receiveForce = receiveForce || force;
  if (receiveTimer) clearTimeout(receiveTimer);
  receiveTimer = setTimeout(() => {
    receiveTimer = null;
    const forced = receiveForce;
    receiveForce = false;
    void publishReceiveNow(forced);
  }, RECEIVE_DEBOUNCE_MS);
  // Unref'd, like the schedule clock: a pending publish must never be the
  // reason the app refuses to quit.
  if (typeof receiveTimer.unref === 'function') receiveTimer.unref();
}

/** The socket is live again: whatever the relay knew is stale, and a relay
 *  that lacked the field may have been updated since. */
function onConnected(): void {
  receiveUnsupported = false;
  receiveUnsupportedLogged = false;
  publishReceive(true);
}

onPolicyChange(() => publishReceive());
session.onChange((v) => { if (v.state === 'connected') onConnected(); });

/** Test seams. Nothing in the app calls these. */
export function _publishReceiveNowForTests(force = false): Promise<void> {
  return publishReceiveNow(force);
}
export function _connectedForTests(): void {
  onConnected();
}

/** Wire the session's spool to the bridge. Returns the unsubscribe. */
export function start(): () => void {
  const off = session.onInbox((kind, id) => { void receive(kind, id); });
  // Catch up first: the app may have been shut for the whole of a window.
  applySchedule();
  // 0.5.2: and tell the relay which door that left this machine on. Forced,
  // because the bridge starts when the gate turns live, which is the app
  // launching or a seat coming back, and either way what the relay holds
  // for this machine is not known to be current.
  publishReceive(true);
  const clock = setInterval(() => { applySchedule(); }, SCHEDULE_TICK_MS);
  // Unref'd: a status timer must never be the reason the app refuses to quit.
  if (typeof clock.unref === 'function') clock.unref();
  void drainSpool();
  return () => { off(); clearInterval(clock); };
}
