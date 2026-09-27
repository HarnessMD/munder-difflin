/**
 * free.json: what a FREE machine knows about the account that admits it.
 *
 * `<userData>/teams/free.json`, beside license.json and membership.json, 0600
 * like both, written only by main. The third and last of the small local
 * records the gate reads: a seat is a membership, PRO is a licence, free is an
 * identity. See shared/freeTier.ts for why it never expires and never
 * rechecks: after registration this file is the whole story and the machine
 * makes no further network calls about it.
 *
 * THE ROUND TRIP is teamsEnrol.ts's sign-in with a different intent and a
 * lighter ending. Same console page, same `state` bargain, same five minutes,
 * same paste fallback; but no keyring check (free stores no credential), no
 * device keypair, no enrolment. The grant is spent at `/api/free/register`,
 * the server answers with who it named, and that answer is written here.
 *
 * Deliberately its own module and its own `pending`, NOT a flag on the teams
 * flow: a free sign-in must never flip `teamsMode` to `enrolling` or touch the
 * enrol gate, and a crafted teams link must never land in the free flow (the
 * deep link ROUTE carries the intent, shared/freeTier.ts).
 */
import { app, shell } from 'electron';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { hostname } from 'node:os';
import {
  FREE_REGISTER_ROUTE, freeAdmits, parseFreeDeepLink,
  type FreeAccountView, type FreeRegisterResult
} from '../shared/freeTier';
import { SIGNIN_URL, SIGNIN_TTL_MS } from './teamsEnrol';
import { LICENSE_ORIGIN } from './soloLicense';

/* ---- the record ------------------------------------------------------------ */

function filePath(): string {
  return join(app.getPath('userData'), 'teams', 'free.json');
}

export function readFreeAccount(): FreeAccountView | null {
  try {
    const p = filePath();
    if (!existsSync(p)) return null;
    const parsed = JSON.parse(readFileSync(p, 'utf8')) as FreeAccountView;
    return freeAdmits(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeFreeAccount(view: FreeAccountView): void {
  const p = filePath();
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(view, null, 2), { encoding: 'utf8', mode: 0o600 });
  notify();
}

export function clearFreeAccount(): void {
  try { rmSync(filePath(), { force: true }); } catch { /* already gone */ }
  notify();
}

/* ---- change notifications -------------------------------------------------- */

type FreeSubscriber = (view: FreeAccountView | null) => void;
const subscribers = new Set<FreeSubscriber>();

export function onFreeAccountChange(cb: FreeSubscriber): () => void {
  subscribers.add(cb);
  return () => { subscribers.delete(cb); };
}

function notify(): void {
  const v = readFreeAccount();
  subscribers.forEach((fn) => { try { fn(v); } catch { /* subscriber error */ } });
}

/* ---- the browser round trip ------------------------------------------------ */

interface Pending {
  state: string;
  grant: string | null;
  expiresAt: number;
}

let pending: Pending | null = null;

const grantListeners = new Set<() => void>();

/** Fires when a grant has arrived, by either route. The renderer moves on. */
export function onFreeGrant(fn: () => void): () => void {
  grantListeners.add(fn);
  return () => { grantListeners.delete(fn); };
}

export interface FreeSignInBegun {
  ok: true;
  url: string;
  expiresAt: string;
}

/**
 * Mint a fresh `state` and open the browser at the console's desktop sign-in
 * with the free intent. Calling it again replaces the pending state, exactly
 * as the teams flow does and for the same reason.
 */
export async function beginFreeSignIn(
  open: (url: string) => Promise<void> = (u) => shell.openExternal(u),
): Promise<FreeSignInBegun> {
  const state = randomBytes(32).toString('hex');
  const expiresAt = Date.now() + SIGNIN_TTL_MS;
  pending = { state, grant: null, expiresAt };
  const url = `${SIGNIN_URL}?state=${state}&intent=free`;
  await open(url);
  return { ok: true, url, expiresAt: new Date(expiresAt).toISOString() };
}

export function cancelFreeSignIn(): void {
  pending = null;
}

export type FreeGrantRefusal = { ok: false; error: 'signin'; detail: string };

/**
 * The grant arrives, by deep link or paste. The checks are teamsEnrol's,
 * argument for argument: a link must carry the `state` this machine minted
 * (and a mismatch must not cancel the real sign-in), a paste needs a sign-in
 * in progress and may be the whole link out of an address bar.
 */
export function receiveFreeGrant(
  input: { grant: string; state?: string },
  via: 'link' | 'paste',
): { ok: true } | FreeGrantRefusal {
  if (!pending) return { ok: false, error: 'signin', detail: 'No sign-in is in progress on this machine.' };
  if (Date.now() > pending.expiresAt) {
    pending = null;
    return { ok: false, error: 'signin', detail: 'That sign-in took longer than five minutes.' };
  }

  let grant = input.grant.trim().toLowerCase();
  let state = input.state?.trim().toLowerCase();
  if (via === 'paste') {
    const asLink = parseFreeDeepLink(grant);
    if (asLink) { grant = asLink.grant; state = asLink.state; }
  }
  if (!/^[0-9a-f]{64}$/.test(grant)) {
    return { ok: false, error: 'signin', detail: 'That is not the code the browser showed.' };
  }
  if (via === 'link' || state !== undefined) {
    if (state !== pending.state) {
      return { ok: false, error: 'signin', detail: 'That link was not the one this machine asked for.' };
    }
  }

  pending.grant = grant;
  grantListeners.forEach((fn) => fn());
  return { ok: true };
}

/* ---- the registration ------------------------------------------------------ */

/**
 * Spend the held grant at the server and write what it answers. The grant is
 * single use and the server deletes it before it decides, so any failure here
 * discards the pending sign-in and the retry is a fresh one: the same rule
 * `enrol` follows, for the same reason.
 *
 * On success free.json is written and every gate subscriber hears it, which is
 * what admits the machine. On refusal nothing is written.
 */
export async function registerFree(): Promise<FreeRegisterResult> {
  const held = pending;
  pending = null;
  if (!held?.grant) {
    return { ok: false, error: 'refused', detail: 'No sign-in grant is held. Start the sign-in again.' };
  }
  let res: Response;
  try {
    res = await fetch(`${LICENSE_ORIGIN}${FREE_REGISTER_ROUTE}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ grant: held.grant, device: { name: hostname() } }),
      // A gate action must fail visibly, never hang (v050-forced-signup, R6):
      // this call runs right after the browser round trip, in front of the
      // way-in screen, and a slow box would otherwise spin it forever. The
      // catch below already reads an abort as `offline`, which the screen
      // shows with a retry, and the retry is a fresh sign-in by design.
      signal: AbortSignal.timeout(15_000)
    });
  } catch {
    return { ok: false, error: 'offline', detail: null };
  }
  let body: { ok?: unknown; email?: unknown; personId?: unknown; error?: unknown; detail?: unknown };
  try {
    body = await res.json();
  } catch {
    return { ok: false, error: 'refused', detail: `The server answered ${res.status} without a body.` };
  }
  if (!res.ok || body.ok !== true || typeof body.email !== 'string' || typeof body.personId !== 'string') {
    const detail = typeof body.detail === 'string' && body.detail.trim() !== '' ? body.detail : null;
    const error = body.error === 'invalid_grant' ? 'invalid_grant' as const : 'refused' as const;
    return { ok: false, error, detail };
  }
  const view: FreeAccountView = {
    email: body.email,
    personId: body.personId,
    registeredAt: new Date().toISOString()
  };
  writeFreeAccount(view);
  console.log(`[free] this machine registered as a free install (person …${view.personId.slice(-4)})`);
  return { ok: true, email: view.email, personId: view.personId };
}
