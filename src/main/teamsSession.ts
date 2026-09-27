/**
 * THE SOCKET (plan 4.3). One instance per process, and THE ONLY WRITER of the
 * connection state the chip renders. Before this file the chip was a literal.
 *
 *   connecting    → open → ready { queued } → drain /queue if queued → connected
 *   connected     → ping every 20 s; pong resets; three unanswered → reconnecting
 *   reconnecting  → jittered exponential backoff, 1 s .. 60 s; a NEW nonce each try
 *   close 1000    → offline   (the relay said normal; come back at the cap, not the floor)
 *   close 1008    → stopped   (a `revoked` frame named the reason, or nobody did)
 *   close 1011/13 → reconnecting
 *   HTTP 401      → once more with a fresh nonce; twice in a row → stopped, reason unknown
 *   HTTP 402      → stopped, reason entitlement
 *
 * THE UPGRADE IS A SIGNED GET. The same three headers as every other request,
 * over the canonical string for `GET /connect` with this device's id
 * (contract 3.1 says the desktop app can; the relay refuses a query string).
 * `fetch` cannot make an upgrade, which is why `ws` is here and nowhere else.
 *
 * ACKNOWLEDGEMENT (contract 3.6): an envelope is acked ONLY after it has been
 * written to disk. Write, fsync, rename, then the `ack` frame or `?ack=` on the
 * next drain. A crash between receipt and write leaves it on the relay, which
 * is the property the contract asks for. Phase 1 puts envelopes and requests
 * in a spool; Phase 2 reads it.
 *
 * WHAT `stopped` DOES NOT DO. It does not give up. Without the `/me` route
 * (server item S2) there is nothing to ask, so the session comes back every
 * fifteen minutes, the cadence the plan gives the `/me` poll, and an
 * unsuspended seat reconnects on its own. That retry is the seam where the
 * poll goes when S2 lands.
 *
 * PROOF OF MEMBERSHIP ON THE SOCKET. `ready.serverTime` and `pong.at` arrive
 * on a connection the relay authenticated, so each is a proof that moves the
 * lease (plan 2.3), rate-limited to one disk write per few minutes.
 */
import { app } from 'electron';
import WebSocket from 'ws';
import { closeSync, fsyncSync, mkdirSync, openSync, renameSync, writeSync } from 'node:fs';
import { join } from 'node:path';
import { initCrypto, signDetached } from './deviceIdentity';
import {
  b64url, canonicalString, drainQueue, getNonce, relayHttpUrl,
  type QueueEnvelope, type QueueRequest,
} from './relay';
import { readMembership, touchVerified } from './teamsMembership';
import * as gate from './teamsGate';
import type { ConnectionView, RevokeReason, StopReason } from '../shared/teams';

/** Every interval the machine runs on, in one place so a test can shorten
 *  them without rewriting the machine. The values are the contract's. */
export const TUNING = {
  pingMs: 20_000,
  /** Unanswered pings before the socket is declared dead. */
  missLimit: 3,
  backoffBaseMs: 1_000,
  backoffCapMs: 60_000,
  /** After a 1000. The relay chose to close; do not hammer it. */
  offlineRetryMs: 60_000,
  /** After `stopped`. The `/me` cadence from plan 4.4, until S2 exists. */
  stoppedRetryMs: 15 * 60_000,
  /**
   * On a LIVE socket. Today's relay refuses a suspended member's next upgrade
   * but does not close the socket they already hold (S3 is not built), so a
   * seat suspended mid-session would stay up until the socket dropped on its
   * own. A signed read every quarter hour is the poll plan 4.4 gives `/me`;
   * until `/me` exists it is `/queue`, which is cheap, refused for a suspended
   * member at the same place `/me` would be, and drains anything the socket
   * missed as a side effect.
   */
  membershipCheckMs: 15 * 60_000,
  handshakeTimeoutMs: 10_000,
  /** Open but no `ready`: the relay is up and not answering, treat as a fault. */
  readyTimeoutMs: 10_000,
  /** How often a pong is allowed to write membership.json. */
  touchEveryMs: 5 * 60_000,
};

/**
 * Jittered exponential backoff (contract 3.4). `attempt` 0 is the first retry.
 * The window is [exp, 2·exp] with exp doubling from the base, pulled under
 * the cap FROM BOTH ENDS: once the exponential passes the cap the window is
 * [cap/2, cap], so a fleet at the cap still spreads across thirty seconds
 * instead of piling onto the sixtieth. (The first cut clamped a ±50 % jitter
 * to the cap, and five machines at attempt three picked the cap four times.)
 * Five machines reconnecting after the same relay restart must not pick the
 * same second, which is why the jitter exists and why the test mutates it.
 */
export function backoffDelay(attempt: number, rand: () => number = Math.random): number {
  const { backoffBaseMs: base, backoffCapMs: cap } = TUNING;
  const exp = base * 2 ** Math.max(0, Math.min(attempt, 30));
  const lo = Math.min(cap / 2, exp);
  const hi = Math.min(cap, 2 * exp);
  return Math.round(lo + rand() * (hi - lo));
}

/** The socket goes to the same relay as every signed request. One answer. */
export function socketUrl(): string {
  return `${relayHttpUrl().replace(/^http/, 'ws')}/connect`;
}

/* ---- observers ---------------------------------------------------------- */

export interface PresenceFrame {
  memberId: string;
  deviceId: string;
  presence: 'online' | 'offline';
  at: string;
}

type SpoolKind = 'envelopes' | 'requests';

let view: ConnectionView = { state: 'offline' };
const viewSubs = new Set<(v: ConnectionView) => void>();
const presenceSubs = new Set<(p: PresenceFrame) => void>();
const inboxSubs = new Set<(kind: SpoolKind, id: string) => void>();

export function current(): ConnectionView {
  return view;
}

export function onChange(fn: (v: ConnectionView) => void): () => void {
  viewSubs.add(fn);
  return () => { viewSubs.delete(fn); };
}

/** A `presence` frame. The roster re-reads itself; nothing here decides what a row shows. */
export function onPresence(fn: (p: PresenceFrame) => void): () => void {
  presenceSubs.add(fn);
  return () => { presenceSubs.delete(fn); };
}

/** Something landed in the spool. Phase 2's bridge listens here. */
export function onInbox(fn: (kind: SpoolKind, id: string) => void): () => void {
  inboxSubs.add(fn);
  return () => { inboxSubs.delete(fn); };
}

function set(next: ConnectionView): void {
  if (next.state === view.state && next.reason === view.reason) return;
  view = next;
  viewSubs.forEach((fn) => fn(view));
}

/* ---- the machine -------------------------------------------------------- */

let running = false;
let ws: WebSocket | null = null;
/** Bumped whenever the current socket is abandoned, so its late events are ignored. */
let generation = 0;
/** Consecutive failed attempts; reset by `ready`. Never rendered (Pam). */
let attempt = 0;
let unauthorized = 0;
let everConnected = false;
let revokeFrame: RevokeReason | null = null;
let retry: ReturnType<typeof setTimeout> | null = null;
let pinger: ReturnType<typeof setInterval> | null = null;
let checker: ReturnType<typeof setInterval> | null = null;
let readyTimer: ReturnType<typeof setTimeout> | null = null;
let misses = 0;
let lastTouch = 0;

export function start(): void {
  if (running) return;
  running = true;
  everConnected = false;
  attempt = 0;
  unauthorized = 0;
  void connect();
}

export function stop(): void {
  running = false;
  clearRetry();
  dropSocket(1000);
  set({ state: 'offline' });
}

/** Wake from sleep, network back, the takeover's Reconnect: try now, from zero. */
export function reconnectNow(): void {
  if (!running) { start(); return; }
  clearRetry();
  attempt = 0;
  unauthorized = 0;
  dropSocket(1000);
  void connect();
}

function clearRetry(): void {
  if (retry) clearTimeout(retry);
  retry = null;
}

function schedule(ms: number): void {
  clearRetry();
  retry = setTimeout(() => { retry = null; void connect(); }, ms);
}

function stopPinger(): void {
  if (pinger) clearInterval(pinger);
  pinger = null;
  if (checker) clearInterval(checker);
  checker = null;
  if (readyTimer) clearTimeout(readyTimer);
  readyTimer = null;
}

/** The quarter-hour membership check on a live socket. See TUNING. */
function startChecker(): void {
  if (checker) clearInterval(checker);
  checker = setInterval(() => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    void drain().then((refusedWith) => {
      if (refusedWith === 401 && ws && ws.readyState === WebSocket.OPEN) {
        // The seat is gone while the socket is up. Re-upgrade: the relay
        // refuses that too, twice, and the machine lands in `stopped`
        // through the one path every refusal takes.
        reconnectNow();
      }
    });
  }, TUNING.membershipCheckMs);
}

/** Abandon the current socket. Its handlers see a stale generation and do nothing. */
function dropSocket(code: number): void {
  const s = ws;
  ws = null;
  stopPinger();
  if (!s) return;
  generation++;
  try {
    if (s.readyState === WebSocket.OPEN) {
      s.close(code);
      const t = setTimeout(() => { try { s.terminate(); } catch { /* gone */ } }, 1_000);
      t.unref?.();
    } else {
      s.terminate();
    }
  } catch { /* already gone */ }
}

function send(frame: unknown): boolean {
  if (!ws || ws.readyState !== WebSocket.OPEN) return false;
  try { ws.send(JSON.stringify(frame)); return true; } catch { return false; }
}

async function connect(): Promise<void> {
  if (!running || ws) return;
  const m = readMembership();
  if (!m) { set({ state: 'offline' }); return; }
  set({ state: everConnected || attempt > 0 ? 'reconnecting' : 'connecting' });

  const gen = ++generation;
  await initCrypto();
  // EVERY ATTEMPT A NEW NONCE. They are single use; a retry with the old one is
  // a replay and the relay refuses it as `unauthorized`, which is exactly the
  // failure this machine must never confuse with a lost seat.
  const nonce = await getNonce(m.deviceId);
  if (gen !== generation || !running) return;
  if (!nonce.ok) { refused(nonce.status); return; }

  const canonical = canonicalString({ method: 'GET', path: '/connect', nonce: nonce.data, deviceId: m.deviceId });
  const signature = await signDetached(canonical);
  if (gen !== generation || !running) return;
  if (!signature) { set({ state: 'offline' }); return; }

  const s = new WebSocket(socketUrl(), {
    headers: {
      'x-md-nonce': nonce.data,
      'x-md-signature': b64url(signature),
      'x-md-device': m.deviceId,
    },
    handshakeTimeout: TUNING.handshakeTimeoutMs,
  });
  ws = s;

  s.on('unexpected-response', (req, res) => {
    res.resume();
    req.destroy();
    if (gen !== generation) return;
    generation++;
    ws = null;
    refused(res.statusCode ?? 0);
  });
  s.on('open', () => {
    if (gen !== generation) return;
    readyTimer = setTimeout(() => {
      if (gen !== generation) return;
      dropSocket(1002);
      set({ state: 'reconnecting' });
      schedule(backoffDelay(attempt++));
    }, TUNING.readyTimeoutMs);
  });
  s.on('message', (data) => {
    if (gen !== generation) return;
    void onFrame(String(data));
  });
  s.on('error', () => { /* a close follows; the close code decides */ });
  s.on('close', (code) => {
    if (gen !== generation) return;
    ws = null;
    onClose(code);
  });
}

/** The upgrade did not happen. `status` 0 is a transport failure. */
function refused(status: number): void {
  if (status === 401) {
    unauthorized++;
    if (unauthorized >= 2) { stopped('unknown'); return; }
    // Once more, at once, with a fresh nonce (plan 4.5): a nonce a late retry
    // spent, or a transient auth fault, is not a lost seat.
    set({ state: 'reconnecting' });
    schedule(0);
    return;
  }
  if (status === 402) { stopped('entitlement'); return; }
  // 5xx and 429 mean the relay is there and busy; 0 means it is not there.
  set({ state: status > 0 ? 'reconnecting' : 'offline' });
  schedule(backoffDelay(attempt++));
}

function onClose(code: number): void {
  stopPinger();
  if (!running) return;
  if (code === 1008) {
    const reason: StopReason = revokeFrame ?? 'unknown';
    revokeFrame = null;
    stopped(reason);
    return;
  }
  if (code === 1000) {
    set({ state: 'offline' });
    schedule(TUNING.offlineRetryMs);
    return;
  }
  // 1011, 1013, and 1006 (the network went away under an open socket).
  set({ state: 'reconnecting' });
  schedule(backoffDelay(attempt++));
}

function stopped(reason: StopReason): void {
  attempt = 0;
  set({ state: 'stopped', reason });
  gate.setRevoked(reason);
  schedule(TUNING.stoppedRetryMs);
}

const isRevokeReason = (v: unknown): v is RevokeReason =>
  v === 'removed' || v === 'suspended' || v === 'entitlement';

function startPinger(): void {
  stopPinger();
  misses = 0;
  pinger = setInterval(() => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (misses >= TUNING.missLimit) {
      // Three pings, no pong. The socket is open as far as the kernel knows
      // and dead as far as the relay is concerned; reconnect rather than wait
      // for the relay to notice the same thing and close 1000.
      dropSocket(1001);
      set({ state: 'reconnecting' });
      schedule(backoffDelay(attempt++));
      return;
    }
    misses++;
    send({ t: 'ping' });
  }, TUNING.pingMs);
}

/** A relay clock reading on an authenticated socket is a proof of membership. */
function proof(serverTime: unknown, force: boolean): void {
  const now = Date.now();
  if (!force && now - lastTouch < TUNING.touchEveryMs) return;
  lastTouch = now;
  touchVerified(typeof serverTime === 'string' ? serverTime : null);
}

async function onFrame(raw: string): Promise<void> {
  let f: { t?: unknown } & Record<string, unknown>;
  try { f = JSON.parse(raw); } catch { return; }
  if (!f || typeof f.t !== 'string') return;

  switch (f.t) {
    case 'ready': {
      if (readyTimer) clearTimeout(readyTimer);
      readyTimer = null;
      everConnected = true;
      attempt = 0;
      unauthorized = 0;
      proof(f.serverTime, true);
      // The relay let this seat in: whatever `stopped` said is over, and a
      // lease that had run out is running again. Either way the gate re-reads,
      // and pushes only if its answer moved.
      if (gate.revokedReason()) gate.setRevoked(null); else gate.refresh();
      startPinger();
      startChecker();
      if (typeof f.queued === 'number' && f.queued > 0) await drain();
      set({ state: 'connected' });
      return;
    }
    case 'pong':
      misses = 0;
      proof(f.at, false);
      return;
    case 'envelope': {
      const id = spool('envelopes', f.envelopeId, f);
      if (id) send({ t: 'ack', envelopeIds: [id] });
      return;
    }
    case 'request': {
      // Acked like an envelope (0.5.2). Today's relay reads only `envelopeIds`
      // off an ack frame and re-lists every request until its purge date, so
      // the bridge keeps its own memory of handled ids; this frame is the seam
      // for the relay to stop listing what was taken, once it learns the field.
      const id = spool('requests', f.requestId, f);
      if (id) send({ t: 'ack', requestIds: [id] });
      return;
    }
    case 'presence': {
      const p = f as unknown as PresenceFrame;
      if (typeof p.memberId === 'string' && (p.presence === 'online' || p.presence === 'offline')) {
        presenceSubs.forEach((fn) => fn(p));
      }
      return;
    }
    case 'revoked':
      // The close that follows carries 1008; the reason is kept for it.
      if (isRevokeReason(f.reason)) revokeFrame = f.reason;
      return;
    default:
      return;
  }
}

/**
 * Drain `/queue`. Each round acks what the PREVIOUS round put on disk, so an
 * envelope is never deleted from the relay before it exists here. The last
 * ack goes over the socket. Bounded, because a relay that keeps saying
 * `nextCursor` is a relay we do not trust to end the loop. Resolves to the
 * HTTP status of a refusal, or 0 when nothing was refused.
 */
async function drain(): Promise<number> {
  let ack: string[] = [];
  const requestAck: string[] = [];
  for (let round = 0; round < 20; round++) {
    const r = await drainQueue(ack);
    if (!r.ok) return r.status;
    ack = [];
    for (const item of r.data.items) {
      const id = spool('envelopes', item.envelopeId, item);
      if (id) ack.push(id);
    }
    for (const req of r.data.requests ?? []) {
      const id = spool('requests', req.requestId, req);
      if (id) requestAck.push(id);
    }
    if (!r.data.nextCursor || r.data.items.length === 0) break;
  }
  if (ack.length) send({ t: 'ack', envelopeIds: ack });
  if (requestAck.length) send({ t: 'ack', requestIds: requestAck });
  return 0;
}

/* ---- the spool ---------------------------------------------------------- */

/** A relay-chosen id becomes a filename. Anything but this shape is refused. */
const SAFE_ID = /^[A-Za-z0-9_-]{1,80}$/;

export function spoolDir(kind: SpoolKind): string {
  return join(app.getPath('userData'), 'teams', 'spool', kind);
}

/**
 * Write, fsync, rename. Returns the id ONLY once the file is durably in
 * place, and the id is the only thing an ack may carry. Idempotent: the same
 * envelope arriving twice (a drain after an ack the relay did not see)
 * overwrites the same file with the same bytes.
 */
function spool(kind: SpoolKind, id: unknown, body: QueueEnvelope | QueueRequest | Record<string, unknown>): string | null {
  if (typeof id !== 'string' || !SAFE_ID.test(id)) return null;
  const dir = spoolDir(kind);
  const final = join(dir, `${id}.json`);
  const tmp = `${final}.tmp`;
  try {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    const fd = openSync(tmp, 'w', 0o600);
    try {
      writeSync(fd, JSON.stringify(body));
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    renameSync(tmp, final);
  } catch {
    return null;
  }
  inboxSubs.forEach((fn) => fn(kind, id));
  return id;
}

/** Test seam. Nothing in the app reads this. */
export function _stateForTests(): { running: boolean; attempt: number; unauthorized: number; generation: number } {
  return { running, attempt, unauthorized, generation };
}
