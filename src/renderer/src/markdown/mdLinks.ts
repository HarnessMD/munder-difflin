/**
 * Pure link/path logic for the markdown preview.
 *
 * Extracted from MarkdownPreview.tsx so it can be unit-tested: these are the
 * functions that decide what a rendered document is allowed to REACH, and a
 * `.tsx` file cannot be loaded by the `node --test` harness. The component keeps
 * only the rendering.
 */
import { imageMimeForFileName } from '@shared/imageTypes';

/** Why a markdown URL path could not be turned into disk names. */
export type HrefRejectReason =
  /** A `%` escape that does not decode (`%zz`, a lone `%FF`, a cut-off UTF-8 sequence). */
  | 'malformed-encoding'
  /** A segment whose decoded form would change the path's SHAPE (`%2F`, `%5C`, `%2e%2e`, NUL). */
  | 'unsafe-segment';

/** Why a markdown `<img src>` is not loaded from the workspace. */
export type LocalImageRejectReason =
  | 'empty'
  /** Any URI scheme — http(s):, data:, file:, javascript: — none of them is a workspace path. */
  | 'remote'
  | 'not-image'
  | HrefRejectReason;

export type DecodedHrefPath =
  | { ok: true; rooted: boolean; segments: string[] }
  | { ok: false; reason: HrefRejectReason };

export type LocalImageSource =
  | { ok: true; rel: string }
  | { ok: false; reason: LocalImageRejectReason };

/** Resolve `href` against the directory of `baseRel` ('' when unknown).
 *
 *  Note that `..` can only ever pop segments that this function itself pushed —
 *  once `parts` is empty a `..` is dropped — so the result is always a path
 *  UNDER the workspace root, never a sibling of it. That is a convenience, not
 *  the security boundary: the real containment check is `safeResolve` in the main
 *  process, which every read goes through. */
export function resolveRel(baseRel: string | undefined, href: string): string {
  const baseDir = (baseRel ?? '').split('/').slice(0, -1);
  const parts = [...baseDir];
  for (const seg of href.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') { parts.pop(); continue; }
    parts.push(seg);
  }
  return parts.join('/');
}

export function isExternal(href: string): boolean {
  return /^(https?:|mailto:)/i.test(href);
}

/** True when `href` carries any URI scheme (http:, data:, file:, javascript:…). */
function hasScheme(href: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(href);
}

export function isRelativeMd(href: string): boolean {
  return !hasScheme(href) && /\.(md|markdown)(#.*)?$/i.test(href);
}

/** Raw path STRUCTURE — handed to `resolveRel` as-is, never decoded. */
function isStructuralSegment(encodedSegment: string): boolean {
  return encodedSegment === '' || encodedSegment === '.' || encodedSegment === '..';
}

/** True when a decoded segment would change the path's shape instead of naming a file. */
function isUnsafeDecodedSegment(decodedSegment: string): boolean {
  return decodedSegment === '.' || decodedSegment === '..' || /[/\\\0]/.test(decodedSegment);
}

/**
 * Split a markdown URL path into the DISK names it refers to, decoding each
 * segment exactly once.
 *
 * WHY: react-markdown never hands over what the author typed — it hands over
 * the URL after `normalizeUri`, which percent-encodes spaces, backslashes and
 * every non-ASCII character. `![QA](<QA Shot.png>)` arrives as `QA%20Shot.png`,
 * and passing that to the filesystem opened a file literally named
 * `QA%20Shot.png` (or, worse, a DIFFERENT file by that name).
 *
 * The rules, in order:
 *  - the URL suffix goes first: everything from the first LITERAL `?` or `#`.
 *    An encoded `%23` is still file-name data at this point.
 *  - raw `''`, `.` and `..` are structure and are left for `resolveRel`.
 *  - every other segment is decoded once (`%2520` → `%20`, never a space); `+`
 *    stays a plus — this is a path, not a form body.
 *  - a decoded segment that is `.`/`..` or contains a separator or NUL is
 *    refused: encoding must not be a way to smuggle in path structure. The rule
 *    is applied to EVERY segment, encoded or not, so `img\shot.png` and
 *    `img%5Cshot.png` get the same answer on every OS. `:` is deliberately
 *    allowed — it is a legal name on macOS/Linux, and on Windows the
 *    containment of drive/stream forms is `safeResolve`'s job in main.
 *
 * Never falls back to the raw string on failure: with both `QA Shot.png` and
 * `QA%20Shot.png` on disk, a fallback is exactly how the wrong image gets read.
 */
export function decodeHrefPath(href: string): DecodedHrefPath {
  const suffixAt = href.search(/[?#]/);
  const sourcePath = suffixAt < 0 ? href : href.slice(0, suffixAt);
  const segments: string[] = [];
  for (const encodedSegment of sourcePath.split('/')) {
    if (isStructuralSegment(encodedSegment)) { segments.push(encodedSegment); continue; }
    let decodedSegment: string;
    try {
      decodedSegment = decodeURIComponent(encodedSegment);
    } catch (e) {
      if (e instanceof URIError) return { ok: false, reason: 'malformed-encoding' };
      throw e;
    }
    if (isUnsafeDecodedSegment(decodedSegment)) return { ok: false, reason: 'unsafe-segment' };
    segments.push(decodedSegment);
  }
  return { ok: true, rooted: sourcePath.startsWith('/'), segments };
}

/** Workspace-relative path for already-decoded segments. Safe to re-join on `/`:
 *  `decodeHrefPath` has refused every segment that contains one. A leading `/`
 *  means the WORKSPACE root (see `resolveLocalImageSource`). */
function resolveDecodedRel(baseRel: string | undefined, decoded: { rooted: boolean; segments: string[] }): string {
  return resolveRel(decoded.rooted ? undefined : baseRel, decoded.segments.join('/'));
}

/**
 * Workspace-relative path for a relative markdown link, or null when it is not
 * one the host should open. Decodes exactly like images do, so
 * `[x](<my notes.md>)` opens `my notes.md` rather than a literal
 * `my%20notes.md`.
 */
export function resolveMdLinkRel(baseRel: string | undefined, href: string): string | null {
  if (!isRelativeMd(href)) return null;
  const decoded = decodeHrefPath(href);
  if (!decoded.ok) return null;
  return resolveDecodedRel(baseRel, decoded) || null;
}

/**
 * Workspace-relative path for a markdown `<img src>`, or the reason it is not a
 * local image we may load. The reason exists so the preview can tell "you wrote
 * this path wrong" apart from "this is a remote URL" instead of showing the
 * same silent chip for both.
 *
 * WHY THIS EXISTS: the preview used to replace EVERY image with a placeholder
 * chip, so an agent-written report containing screenshots rendered as a row of
 * "🖼 screenshot" pills — the report's evidence was invisible everywhere in the
 * app. Local images can now be resolved and read through the same root-confined
 * IPC as everything else.
 *
 * What is refused, and why:
 *  - anything with a SCHEME (http:, https:, data:, file:, javascript:). Remote
 *    URLs are already dead under the CSP (`img-src 'self' data: blob:`), and
 *    silently proxying them through the main process would turn a rendered
 *    document into a network beacon that leaks "this user opened this file" to
 *    whoever authored the markdown. Agent-generated markdown is untrusted.
 *  - anything whose extension is not a known image type — there is no reason for
 *    an <img> to pull an arbitrary file's bytes into the renderer. Judged on the
 *    DECODED file name, so the answer is about the file that would be opened.
 *  - malformed or shape-changing percent-encoding (see `decodeHrefPath`).
 *
 * A leading `/` is read as workspace-root-relative rather than as a filesystem
 * absolute path; the leading slashes are stripped and the rest resolves from the
 * root, so `/etc/passwd` becomes the (harmless, nonexistent) `etc/passwd` inside
 * the workspace instead of escaping to the real one.
 */
export function resolveLocalImageSource(baseRel: string | undefined, src: string | undefined): LocalImageSource {
  if (typeof src !== 'string') return { ok: false, reason: 'empty' };
  const sourcePath = src.trim();
  if (!sourcePath) return { ok: false, reason: 'empty' };
  if (hasScheme(sourcePath)) return { ok: false, reason: 'remote' };
  const decoded = decodeHrefPath(sourcePath);
  if (!decoded.ok) return decoded;
  const fileName = decoded.segments[decoded.segments.length - 1] ?? '';
  if (!imageMimeForFileName(fileName)) return { ok: false, reason: 'not-image' };
  const resolvedRel = resolveDecodedRel(baseRel, decoded);
  return resolvedRel ? { ok: true, rel: resolvedRel } : { ok: false, reason: 'empty' };
}

/** `resolveLocalImageSource` for callers that only need the path: null when refused. */
export function resolveLocalImageRel(baseRel: string | undefined, src: string | undefined): string | null {
  const source = resolveLocalImageSource(baseRel, src);
  return source.ok ? source.rel : null;
}
