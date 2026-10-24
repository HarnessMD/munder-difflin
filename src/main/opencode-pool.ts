/**
 * "Pull de chaves" — OpenCode free-tier account rotation.
 *
 * The OpenCode desktop CLI stores every account we've ever logged into in its
 * credential store (`~/.local/share/opencode/opencode.db`, table `credential`,
 * integration_id='opencode'). Exactly ONE row carries active=1 — the account
 * every request is billed against. When that account's free tier runs out the
 * CLI prints "Free usage limit reached" and refuses to continue; the fix users
 * are pushed toward is paying. But the store usually already holds SEVERAL
 * accounts (the user logged in more than once) — this module picks the next
 * usable one, flips it active through the CLI's own `auth switch` command (not
 * raw SQL — the CLI owns locking/migrations), and reports who we switched to.
 *
 * Deliberately dependency-light for testability: the picker is a pure function;
 * better-sqlite3 is loaded lazily inside the rotate call so unit tests can
 * import this file without the native binding.
 */
import { exec, execFile } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type BetterSqlite3 from 'better-sqlite3';

/** How long an account stays benched after it reported the free-tier limit.
 *  The limit is a running window, not a monthly bucket, but 4h keeps us from
 *  ping-ponging between two exhausted accounts within one work session. */
export const COOLDOWN_MS = 4 * 60 * 60 * 1000;

export interface PooledCredential {
  id: string;
  /** Stable account identity — the JWT's email (or the row label as fallback). */
  account: string;
  /** Epoch ms when the access token expires (higher = fresher login). */
  expires: number;
  active: boolean;
}

interface CredentialRow {
  id: string;
  label: string;
  active: number;
  value: string;
}

/** Decode a JWT payload without verification — used ONLY to read the account's
 *  email and expiry out of a token this machine already owns. Never validates. */
export function decodeJwtEmail(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const json = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    const parsed = JSON.parse(json) as { email?: string };
    return typeof parsed.email === 'string' && parsed.email.includes('@') ? parsed.email : null;
  } catch {
    return null;
  }
}

/** Map raw `credential` rows to pooled credentials (one per ROW — several rows
 *  may share an account: repeated logins refresh the same account). */
export function pooledCredentials(rows: CredentialRow[]): PooledCredential[] {
  const out: PooledCredential[] = [];
  for (const row of rows) {
    let value: { access?: string; expires?: number; metadata?: { email?: string } } = {};
    try {
      value = JSON.parse(row.value);
    } catch {
      continue;
    }
    const account = (typeof value.access === 'string' ? decodeJwtEmail(value.access) : null)
      ?? (typeof value.metadata?.email === 'string' ? value.metadata.email : null)
      ?? row.label;
    const expires = typeof value.expires === 'number' ? value.expires : 0;
    out.push({ id: row.id, account, expires, active: row.active === 1 });
  }
  return out;
}

export interface PickOptions {
  /** Epoch ms "now" (injectable for tests). */
  now: number;
  /** credId → cooldown-until (epoch ms). */
  cooldown: Record<string, number>;
}

export interface PickResult {
  pick: PooledCredential | null;
  current: PooledCredential | null;
  /** Which of the pool's accounts are benched (for a "pool exhausted" message). */
  benchedAccounts: string[];
  /** When the next account leaves cooldown (epoch ms) — undefined if none. */
  nextAvailableAt?: number;
}

/**
 * Choose the next account to switch to.
 *
 * Rules, in order:
 *   1. Never re-pick the account that just failed (the `active` one).
 *   2. One row per ACCOUNT — prefer the freshest login of it (max expires).
 *   3. Skip accounts currently benched; among candidates prefer the freshest.
 *   4. If every other account is benched, pick nothing (return the earliest
 *      cooldown release so the caller can say "volta às HH:MM").
 */
export function pickNextAccount(creds: PooledCredential[], opts: PickOptions): PickResult {
  const current = creds.find((c) => c.active) ?? null;
  const byAccount = new Map<string, PooledCredential>();
  for (const c of creds) {
    const seen = byAccount.get(c.account);
    if (!seen || c.expires > seen.expires) byAccount.set(c.account, c);
  }
  const benched: string[] = [];
  const candidates: PooledCredential[] = [];
  let nextAvailableAt: number | undefined;
  for (const [account, freshest] of byAccount) {
    if (current && account === current.account) continue; // rule 1
    const until = opts.cooldown[freshest.id] ?? 0;
    if (until > opts.now) {
      benched.push(account);
      nextAvailableAt = nextAvailableAt === undefined ? until : Math.min(nextAvailableAt, until);
      continue;
    }
    candidates.push(freshest);
  }
  candidates.sort((a, b) => b.expires - a.expires); // rule 3 (freshest first)
  return { pick: candidates[0] ?? null, current, benchedAccounts: benched, nextAvailableAt };
}

export interface RotateResult {
  ok: boolean;
  /** Account email we switched TO (present when ok). */
  account?: string;
  /** Account email we switched FROM. */
  previous?: string;
  /** Human-readable reason when ok === false. */
  reason?: string;
}

interface RotationState {
  /** credId (of the account's freshest credential) → cooldown-until epoch ms. */
  cooldown: Record<string, number>;
}

function readState(file: string): RotationState {
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as RotationState;
    if (parsed && typeof parsed.cooldown === 'object' && parsed.cooldown) return parsed;
  } catch { /* first run / corrupt — start clean */ }
  return { cooldown: {} };
}

function writeState(file: string, state: RotationState): void {
  try {
    writeFileSync(file, JSON.stringify(state, null, 2), 'utf8');
  } catch { /* best-effort: state is a convenience, not correctness */ }
}

/** Run the CLI's native account switch (owns DB locks + token refresh).
 *
 *  On Windows the engine may be reached through an npm shim (`opencode.cmd`) or
 *  a bare PATH name (`opencode`) rather than a real `.exe`. `execFile` cannot
 *  execute those (ENOENT/EINVAL), so route them through cmd.exe — which also
 *  applies PATHEXT while resolving a bare name. */
function runAuthSwitch(exe: string, credentialId: string): Promise<void> {
  // Defense in depth: an id may only look like `cred_…` before it reaches a shell.
  if (!/^[A-Za-z0-9_-]+$/.test(credentialId)) {
    return Promise.reject(new Error('credential id inválido'));
  }
  if (/["\r\n]/.test(exe)) {
    return Promise.reject(new Error('caminho do executável inválido'));
  }
  const viaShell = process.platform === 'win32' && !/\.exe$/i.test(exe);
  const options = {
    timeout: 25_000,
    windowsHide: true,
    env: { ...process.env, NO_COLOR: '1' }
  };
  return new Promise((resolve, reject) => {
    const done = (err: Error | null): void => (err ? reject(err) : resolve());
    if (viaShell) {
      // `exec` hands cmd.exe the raw command line, so OUR quotes survive (a
      // quoted exe path with spaces works). `execFile` would backslash-escape
      // the inner quotes, which cmd.exe does not understand.
      exec(`"${exe}" auth switch opencode ${credentialId}`, options, done);
    } else {
      execFile(exe, ['auth', 'switch', 'opencode', credentialId], options, done);
    }
  });
}

export interface RotateOptions {
  /** The engine executable to drive (`opencode-cli.exe`). */
  exe: string;
  /** Where to keep our cooldown record (app userData dir). */
  stateDir: string;
  /** Override the credential DB path (tests / odd installs). */
  dbPath?: string;
  now?: number;
  cooldownMs?: number;
}

/** Default credential store the OpenCode CLI writes on this OS. */
export function defaultCredentialDbPath(): string {
  return join(homedir(), '.local', 'share', 'opencode', 'opencode.db');
}

/**
 * Switch the ACTIVE OpenCode account to the next usable one. Never throws —
 * callers get `{ ok:false, reason }` so the renderer can surface it in the feed.
 */
export async function rotateOpencodeCredential(opts: RotateOptions): Promise<RotateResult> {
  const now = opts.now ?? Date.now();
  const stateFile = join(opts.stateDir, 'opencode-rotation.json');
  const state = readState(stateFile);
  // Forget cooldowns that already expired — keeps the file honest.
  for (const [id, until] of Object.entries(state.cooldown)) {
    if (until <= now) delete state.cooldown[id];
  }

  const dbPath = opts.dbPath ?? defaultCredentialDbPath();
  if (!existsSync(dbPath)) {
    return { ok: false, reason: `store de credenciais não encontrado (${dbPath})` };
  }

  let rows: CredentialRow[];
  try {
    // Lazy require: unit tests import this module without the native binding.
    const Database = require('better-sqlite3') as typeof BetterSqlite3;
    const db = new Database(dbPath, { readonly: true, fileMustExist: true });
    try {
      rows = db.prepare(
        "SELECT id, label, active, value FROM credential WHERE integration_id = 'opencode'"
      ).all() as CredentialRow[];
    } finally {
      db.close();
    }
  } catch (err) {
    return { ok: false, reason: `não consegui ler o store (${err instanceof Error ? err.message : String(err)})` };
  }

  const creds = pooledCredentials(rows);
  if (creds.length === 0) return { ok: false, reason: 'nenhuma conta OpenCode armazenada' };

  const { pick, current, benchedAccounts, nextAvailableAt } = pickNextAccount(creds, {
    now,
    cooldown: state.cooldown
  });
  if (!pick) {
    const when = nextAvailableAt ? ` — próxima conta libera ${new Date(nextAvailableAt).toLocaleTimeString()}` : '';
    return {
      ok: false,
      reason: benchedAccounts.length
        ? `todas as contas no cooldown${when}`
        : 'nenhuma outra conta além da atual'
    };
  }

  try {
    await runAuthSwitch(opts.exe, pick.id);
  } catch (err) {
    return { ok: false, reason: `auth switch falhou (${err instanceof Error ? err.message : String(err)})` };
  }

  // Verify the CLI actually flipped the flag (a stale service could no-op).
  let activeId: string | null = null;
  try {
    const Database = require('better-sqlite3') as typeof BetterSqlite3;
    const db = new Database(dbPath, { readonly: true, fileMustExist: true });
    try {
      const row = db.prepare(
        "SELECT id FROM credential WHERE integration_id = 'opencode' AND active = 1 LIMIT 1"
      ).get() as { id: string } | undefined;
      activeId = row?.id ?? null;
    } finally {
      db.close();
    }
  } catch { /* fall through to the explicit failure below */ }
  if (activeId !== pick.id) {
    return { ok: false, reason: 'auth switch não persistiu (o CLI continua na conta anterior)' };
  }

  // Bench the account that just failed, so the next rotation doesn't come back
  // to it within COOLDOWN_MS. Keyed by its freshest credential row.
  const failed = current ?? null;
  if (failed) {
    const freshest = creds
      .filter((c) => c.account === failed.account)
      .sort((a, b) => b.expires - a.expires)[0];
    if (freshest) state.cooldown[freshest.id] = now + (opts.cooldownMs ?? COOLDOWN_MS);
  }
  writeState(stateFile, state);

  return { ok: true, account: pick.account, previous: current?.account };
}
