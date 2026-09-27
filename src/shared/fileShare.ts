/**
 * File sharing — every rule that can be decided without touching the disk,
 * the clock or a socket.
 *
 * A share is ONE local file, published on ONE URL, reachable by a teammate on
 * another machine, dead one hour after it was created. This module holds the
 * record shape, the TTL, the expiry arithmetic, the countdown copy, the URL
 * shape and the two sanitisers the server leans on. It imports nothing, so the
 * unit tests exercise the real rules rather than a paraphrase of them.
 *
 * WHY THE TOKEN IS NOT MINTED HERE: a token is the whole credential, so it has
 * to come from a CSPRNG. `crypto.randomBytes` lives in main; main mints it and
 * passes it in, and this file stays a pure module that a test can load with no
 * environment at all.
 *
 * WHY `tokenFromPath` IS A REGEX AND NOT A PARSER: the token is the only thing
 * a request may name, and it is never joined into a filesystem path anywhere in
 * the app. A request path either matches `/s/<64 hex>` exactly or it is not a
 * share request. Traversal, encoded traversal, a query string smuggled into the
 * segment and a nested route all fail the same way: no match, 404, no body.
 */

/** One hour, and it is not configurable from the renderer. The confirm copy
 *  promises an hour, so the constant and the promise move together. */
export const SHARE_TTL_MS = 60 * 60 * 1000;

/** Refuse anything larger. A share streams off the user's own disk through
 *  their own uplink; past this it is the wrong tool and the copy says so. */
export const MAX_SHARE_BYTES = 100 * 1024 * 1024;

/** 32 bytes = 256 bits of CSPRNG output, comfortably past the 128 bit floor.
 *  Hex rather than base64url so the URL carries no `-` and no `_`. */
export const SHARE_TOKEN_BYTES = 32;

/** Hex, so twice the byte count. */
export const SHARE_TOKEN_CHARS = SHARE_TOKEN_BYTES * 2;

/** How many shares one machine may hold open at once. Bounds the timers, the
 *  open descriptors, and the size of the thing a person has to reason about. */
export const MAX_ACTIVE_SHARES = 20;

/** The only route the share server answers on. */
export const SHARE_ROUTE_PREFIX = '/s/';

/** A share as MAIN holds it. The `path` and the `token` never leave main as a
 *  pair: the renderer gets a {@link FileShareView}, whose `url` carries the
 *  token because a link without it cannot be a link, and no path at all. */
export interface FileShare {
  /** Stable, loggable, useless to an attacker. This is the id that goes in a
   *  log line; the token never does. */
  id: string;
  /** Absolute, already resolved through any symlink, on THIS machine. */
  path: string;
  /** The name the download is offered under, already sanitised. */
  name: string;
  /** Bytes, as of the moment the share was created. */
  size: number;
  contentType: string;
  createdAt: number;
  expiresAt: number;
  /** 64 hex characters. The whole credential. Never logged, never in an error. */
  token: string;
}

/** What the renderer is allowed to see. No local path, no bare token. */
export interface FileShareView {
  id: string;
  name: string;
  size: number;
  contentType: string;
  createdAt: number;
  expiresAt: number;
  /** The public link, or '' when no tunnel is up. */
  url: string;
}

/** Why a share was refused. A CODE, not a sentence: the copy lives in the
 *  locale files, so every refusal is translated and none of them can leak a
 *  path or a token into a string the renderer renders. */
export type ShareRefusal =
  | 'notAbsolute'
  | 'notAFile'
  | 'unreadable'
  | 'tooBig'
  | 'tooMany'
  | 'noServer'
  | 'noTunnel';

/* ---- tokens and routes --------------------------------------------------- */

const TOKEN_RE = /^[0-9a-f]{64}$/;
const SHARE_PATH_RE = /^\/s\/([0-9a-f]{64})$/;

/** Is this the exact shape main mints? Nothing else is ever looked up. */
export function isValidShareToken(token: unknown): token is string {
  return typeof token === 'string' && TOKEN_RE.test(token);
}

/** The unguessable path a share is served on. */
export function sharePath(token: string): string {
  return `${SHARE_ROUTE_PREFIX}${token}`;
}

/** Join a tunnel root and a token into the link a person copies. */
export function shareUrl(base: string, token: string): string {
  return `${base.replace(/\/+$/, '')}${sharePath(token)}`;
}

/**
 * The token a request is asking for, or null.
 *
 * EXACT match on the whole pathname. `/s/<token>/x`, `/s/../../etc/passwd`,
 * `/s/%2e%2e%2f`, `/S/<token>` and a bare `/` all return null, and the caller
 * answers every null the same way: 404, no body. There is no branch here that
 * can produce a filesystem path, because the token is a Map key and never a
 * path segment.
 */
export function tokenFromPath(pathname: string): string | null {
  const m = SHARE_PATH_RE.exec(pathname);
  return m ? m[1] : null;
}

/* ---- expiry -------------------------------------------------------------- */

/** Has this share's hour run out? Inclusive of the instant it expires. */
export function isExpired(share: { expiresAt: number }, now: number): boolean {
  return now >= share.expiresAt;
}

/** Milliseconds left, clamped at zero so callers never format a negative. */
export function remainingMs(share: { expiresAt: number }, now: number): number {
  return Math.max(0, share.expiresAt - now);
}

/** The unit a countdown should be read in, and how many of it are left.
 *  `expired` always carries a count of 0. */
export interface ShareCountdown {
  unit: 'hours' | 'minutes' | 'seconds' | 'expired';
  count: number;
}

/**
 * Pick the unit and round it DOWN, never up.
 *
 * Rounding up would let the UI say "3 minutes left" with two minutes and one
 * second to go, which is a promise the server will break. Under a minute the
 * count floors to at least 1, so a live share never reads "0 seconds left"
 * while it is still serving.
 */
export function shareCountdown(share: { expiresAt: number }, now: number): ShareCountdown {
  const ms = remainingMs(share, now);
  if (ms <= 0) return { unit: 'expired', count: 0 };
  if (ms < 60_000) return { unit: 'seconds', count: Math.max(1, Math.floor(ms / 1000)) };
  if (ms < 3_600_000) return { unit: 'minutes', count: Math.floor(ms / 60_000) };
  return { unit: 'hours', count: Math.floor(ms / 3_600_000) };
}

/**
 * The countdown in words: "58 minutes left", "1 hour left", "Expired".
 *
 * English, and deliberately so: it is the fallback for a surface with no
 * translator in scope (a log line a person reads, a test) and the reference
 * the locale files are written against. The shipped UI translates
 * {@link shareCountdown} instead. No dashes, house rule.
 */
export function expiresIn(share: { expiresAt: number }, now: number): string {
  const { unit, count } = shareCountdown(share, now);
  if (unit === 'expired') return 'Expired';
  const noun = count === 1 ? unit.slice(0, -1) : unit;
  return `${count} ${noun} left`;
}

/* ---- naming and typing --------------------------------------------------- */

/**
 * A file name safe to put in a header and to hand a stranger's browser.
 *
 * Drops every directory component, every control character, the quote and the
 * backslash that would break out of the header's quoted string, and any name
 * that is nothing but dots. It NEVER reaches the filesystem: the bytes come
 * from the stored absolute path, and this is only what the download is called.
 */
export function safeFileName(name: string): string {
  const base = String(name ?? '').split(/[\\/]/).pop() ?? '';
  const cleaned = base
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/["\\]/g, '')
    .trim()
    .slice(0, 120);
  if (!cleaned || /^\.+$/.test(cleaned)) return 'download';
  return cleaned;
}

/**
 * The full `Content-Disposition` value.
 *
 * `attachment` always: a share is a download, never a page the recipient's
 * browser renders in the tunnel's origin. Both forms are sent, the ASCII one
 * for old clients and the RFC 5987 one so a non-Latin name survives.
 */
export function contentDisposition(name: string): string {
  const safe = safeFileName(name);
  // eslint-disable-next-line no-control-regex
  const ascii = safe.replace(/[^\u0020-\u007e]/g, '_').replace(/["\\;]/g, '') || 'download';
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(safe)}`;
}

/**
 * A content type for the extension, or `application/octet-stream`.
 *
 * An ALLOWLIST of inert types, and html, svg, xml and js are deliberately not
 * on it. They are served as octet-stream so that even a client that ignores
 * `Content-Disposition: attachment` cannot be talked into executing a shared
 * file inside the tunnel's origin.
 */
export function contentTypeFor(name: string): string {
  const ext = safeFileName(name).toLowerCase().split('.').pop() ?? '';
  return INERT_TYPES[ext] ?? 'application/octet-stream';
}

const INERT_TYPES: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
  webp: 'image/webp', avif: 'image/avif', bmp: 'image/bmp', heic: 'image/heic',
  pdf: 'application/pdf',
  txt: 'text/plain', md: 'text/plain', log: 'text/plain',
  csv: 'text/csv', json: 'application/json',
  zip: 'application/zip', gz: 'application/gzip', tar: 'application/x-tar',
  mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4', flac: 'audio/flac',
  mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm'
};

/** A size a person reads: "512 bytes", "980 KB", "12.4 MB". */
export function describeBytes(n: number): string {
  const bytes = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  if (bytes < 1024) return `${bytes} bytes`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

/* ---- projection ---------------------------------------------------------- */

/** What main sends the renderer. The path is dropped here and nowhere else,
 *  so there is exactly one place to check that it never crosses the bridge. */
export function toShareView(share: FileShare, base: string | null): FileShareView {
  return {
    id: share.id,
    name: share.name,
    size: share.size,
    contentType: share.contentType,
    createdAt: share.createdAt,
    expiresAt: share.expiresAt,
    url: base ? shareUrl(base, share.token) : ''
  };
}
