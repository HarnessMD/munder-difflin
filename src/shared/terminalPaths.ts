/**
 * What a ⌘-clicked path token in terminal output should DO.
 *
 * v0.3.4 shipped this for markdown only: `*.md` in agent output became a link
 * that opened the rendered preview. Everything else in the same line stayed
 * dead text, so a printed `src/main/updater.ts` was something you had to
 * retype into the file tree by hand.
 *
 * Three outcomes, and the split is about what we can HONESTLY do with the file:
 *
 *   preview → markdown. There is a renderer for it, and reading is the point.
 *   edit    → source and config we can put in Monaco without lying about it.
 *   reveal  → everything else: images, archives, binaries, PDFs, unknown
 *             extensions, directories. We open the OS file browser at the
 *             file's parent instead of pretending to understand the bytes.
 *
 * WHY REVEAL RATHER THAN OPEN. The token comes from AGENT OUTPUT, which is
 * hostile input. Handing an arbitrary path to the OS "open with default app"
 * call would let a line of terminal text become an execution: a printed
 * `installer.dmg`, `payload.app`, or `.desktop` file is one ⌘-click from
 * running. Revealing only ever opens a file browser, so the worst an agent can
 * do by printing a path is show you a folder you could already reach yourself.
 * That is why this module never returns an "open" verdict for an unknown type.
 *
 * MATCHING IS THE HARD PART, not classifying. Anchoring on a known extension
 * (what the markdown version did) cannot see `report.pdf` — and `report.pdf` is
 * exactly the case that needs reveal. Opening the match up to ANY extension
 * instead drags in every version string and decimal on the line: `v0.4.5`,
 * `1.5`, `electron 43.0`. The rule that separates them is below.
 */

import { isImagePath } from './imageTypes';

/** Extensions that open in the markdown preview. */
const PREVIEW_EXTS = new Set(['md', 'markdown']);

/**
 * Extensions we are willing to put in the editor. Deliberately a list rather
 * than "anything that isn't binary": a wrong guess here opens a font or a
 * sqlite file as mojibake, and the reveal fallback is a strictly better answer
 * for anything we are not sure about.
 */
const EDIT_EXTS = new Set([
  // source
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'mts', 'cts',
  'py', 'rb', 'go', 'rs', 'java', 'kt', 'kts', 'swift', 'c', 'h', 'cc', 'cpp',
  'hpp', 'cs', 'php', 'lua', 'pl', 'r', 'scala', 'clj', 'ex', 'exs', 'erl',
  'dart', 'zig', 'hs', 'ml', 'vue', 'svelte', 'astro',
  // shell
  'sh', 'bash', 'zsh', 'fish', 'ps1', 'bat', 'cmd',
  // markup and style
  'html', 'htm', 'css', 'scss', 'sass', 'less', 'xml', 'xsl',
  // data and config
  'json', 'jsonc', 'json5', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf',
  'env', 'properties', 'lock', 'gradle', 'tf', 'tfvars', 'graphql', 'gql',
  'proto', 'sql', 'csv', 'tsv',
  // plain text
  'txt', 'text', 'log', 'diff', 'patch', 'gitignore', 'dockerignore',
  'editorconfig', 'npmrc', 'nvmrc'
]);

export type PathAction = 'preview' | 'edit' | 'reveal';

/**
 * Lower-cased extension of the last path segment, or '' when there is none.
 * Local rather than imported from imageTypes so a `?query` suffix cannot reach
 * a filesystem call: terminal tokens are filesystem paths, and a literal `?` in
 * a filename is legal on every platform we ship.
 */
function extOf(token: string): string {
  const base = token.split(/[/\\]/).pop() ?? '';
  const dot = base.lastIndexOf('.');
  if (dot <= 0 || dot === base.length - 1) return '';
  return base.slice(dot + 1).toLowerCase();
}

/**
 * Candidate path tokens in one line of terminal output.
 *
 * The extension starts with a letter; Unicode names, bracket/group folders and
 * long extensions are allowed. Numeric version suffixes remain excluded. That
 * single constraint is what keeps `v0.4.5`, `1.5`, and `0.92` out: their
 * "extension" is digits. `node_modules/.bin` has no extension and is caught by
 * the separator rule in `isPathToken` instead.
 *
 * The leading `X:\` group exists because `:` cannot be in the body class (it
 * would swallow the `:line` suffix). Without the group the match on
 * `C:\Users\x\a.ts` starts at the backslash, and a drive-less `\Users\x\a.ts`
 * then looks RELATIVE and gets joined onto the agent's cwd.
 */
const PATH_TOKEN_RE = /(?:[A-Za-z]:[\\/])?[\p{L}\p{N}_@.~/\\+()[\]-]*[\p{L}\p{N}_@~/\\+()[\]-]\.[\p{L}][\p{L}\p{N}_-]*(?::\d+(?::\d+)?)?(?:#L\d+(?:C\d+)?)?/gu;

/** A fresh matcher. The regex is stateful (`g`), so callers must never share one. */
export function pathTokenMatcher(): RegExp {
  return new RegExp(PATH_TOKEN_RE.source, 'gu');
}

/**
 * URL tokens in terminal output.
 *
 * `https` only, deliberately. The main-process opener (`app:openExternal`)
 * accepts nothing else, so underlining an `http://` would hand back a link that
 * cannot open — which is the complaint in #281, not a fix for it.
 *
 * A matched URL is offered as-is. Punycode homographs and embedded credentials
 * (`https://user:pass@evil.com@good.com/x`) therefore reach the opener intact —
 * the same as every terminal linkifier, with the browser as the mitigation.
 * Filtering here would only give a false sense that the string was vetted.
 *
 * These must be matched BEFORE path tokens, and their spans skipped there. The
 * path matcher's Windows-drive branch reads the `s:/` inside `https://` as
 * drive `s:`, so a URL currently matches as an absolute path on a drive nobody
 * has, resolves to nothing, and silently does nothing on click.
 */
const URL_TOKEN_RE = /https:\/\/[^\s<>"'`{}|\\^]+/gi;

/** A fresh matcher. The regex is stateful (`g`), so callers must never share one. */
export function urlTokenMatcher(): RegExp {
  return new RegExp(URL_TOKEN_RE.source, 'gi');
}

const URL_TRAILING_PROSE = /["'`>,.;:!?]+$/;

/**
 * Strip the prose a URL picked up from a sentence: `(see https://x.com/a).`
 *
 * A closing bracket is only prose when the URL does not open it — Wikipedia and
 * MSDN links carry balanced ones (`/wiki/Foo_(bar)`), and eating that character
 * lands the user on a 404 with nothing to show why.
 *
 * The scheme is lowercased because the main-process opener matches `^https://`
 * case-sensitively; a terminal that printed `HTTPS://` would otherwise be
 * refused after we had already underlined it.
 */
export function stripUrlToken(raw: string): string {
  let out = raw.replace(URL_TRAILING_PROSE, '');
  const unbalanced = (open: string, close: string): boolean =>
    (out.split(open).length - 1) < (out.split(close).length - 1);
  let trimmed = true;
  while (trimmed) {
    trimmed = false;
    if (out.endsWith(')') && unbalanced('(', ')')) { out = out.slice(0, -1); trimmed = true; }
    if (out.endsWith(']') && unbalanced('[', ']')) { out = out.slice(0, -1); trimmed = true; }
    const next = out.replace(URL_TRAILING_PROSE, '');
    if (next !== out) { out = next; trimmed = true; }
  }
  return out.replace(/^https:\/\//i, 'https://');
}

/** One underlinable token on a line, with its 0-based half-open span. */
export interface TerminalLinkSpan {
  kind: 'url' | 'path';
  /** The cleaned token: the URL, or the path with wrapping and `:line` stripped. */
  token: string;
  /** Raw matched text, so a caller can size the underline. */
  raw: string;
  start: number;
  end: number;
  line?: number;
  column?: number;
}

/**
 * Every token on one line of terminal output that is worth underlining.
 *
 * URLs are resolved FIRST and win any overlap, because the path matcher's
 * Windows-drive branch reads the `s:/` inside `https://` as drive `s:` — so
 * without this ordering a URL is offered as an absolute path on a drive nobody
 * has, resolves to nothing, and the click silently does nothing (issue #281).
 *
 * Path tokens are returned unfiltered by `isPathToken`; the caller still decides
 * whether a path is worth offering, since only it can resolve a relative one.
 */
export function terminalLinkSpans(text: string): TerminalLinkSpan[] {
  const out: TerminalLinkSpan[] = [];
  const occupied: Array<[number, number]> = [];
  const overlaps = (a: number, b: number) => occupied.some(([x, y]) => a < y && b > x);
  const addPath = (raw: string, start: number, target = raw) => {
    const ref = terminalPathReference(target);
    if (!ref || !isPathToken(ref.path)) return;
    out.push({ kind: 'path', raw, start, end: start + raw.length, token: ref.path, ...(ref.line ? { line: ref.line, column: ref.column } : {}) });
    occupied.push([start, start + raw.length]);
  };
  // A displayed Markdown label need not itself be a path. Keep its destination,
  // including balanced parentheses such as app/(group)/page.ts.
  const markdown = /\[[^\]\r\n]+\]\(/g;
  let m: RegExpExecArray | null;
  while ((m = markdown.exec(text))) {
    let depth = 1, end = markdown.lastIndex;
    for (; end < text.length && depth; end++) {
      if (text[end] === '(') depth++;
      if (text[end] === ')') depth--;
    }
    if (depth) continue;
    const raw = text.slice(m.index, end), target = text.slice(markdown.lastIndex, end - 1).trim();
    if (/^https:\/\//i.test(target)) {
      const token = stripUrlToken(target);
      out.push({ kind: 'url', raw, token, start: m.index, end });
      occupied.push([m.index, end]);
    } else addPath(raw, m.index, target);
    markdown.lastIndex = end;
  }
  // Codex's TUI renders Markdown as Label(path:line), sometimes with no gap.
  // Match the balanced destination before a broad filename regex can swallow
  // the label. Parentheses inside group-directory names remain part of it.
  const parens = /\(/g;
  while ((m = parens.exec(text))) {
    if (overlaps(m.index, m.index + 1)) continue;
    let depth = 1, end = parens.lastIndex;
    for (; end < text.length && depth; end++) {
      if (text[end] === '(') depth++;
      if (text[end] === ')') depth--;
    }
    if (!depth) {
      const target = text.slice(parens.lastIndex, end - 1);
      addPath(target, parens.lastIndex);
      parens.lastIndex = end;
    }
  }
  // URL ranges win over filename substrings. Unsupported schemes are reserved,
  // never mistaken for a local path (including remote file:// hosts).
  const uri = /\b[A-Za-z][A-Za-z0-9+.-]*:\/\/[^\s<>"'`]*/g;
  while ((m = uri.exec(text))) {
    const start = m.index, end = start + m[0].length;
    if (overlaps(start, end)) continue;
    if (/^https:\/\//i.test(m[0])) {
      const token = stripUrlToken(m[0]);
      if (/^https:\/\/./.test(token)) out.push({ kind: 'url', raw: token, token, start, end: start + token.length });
    } else if (/^file:/i.test(m[0])) addPath(m[0], start);
    occupied.push([start, end]);
  }
  const quoted = /([`'"])([^`'"\r\n]+)\1/g;
  while ((m = quoted.exec(text))) {
    if (!overlaps(m.index, m.index + m[0].length)) addPath(m[2], m.index + 1);
  }
  const pre = pathTokenMatcher();
  while ((m = pre.exec(text))) {
    if (!overlaps(m.index, m.index + m[0].length)) addPath(m[0], m.index);
  }
  // Directories and extensionless relative/absolute paths do not need a fake
  // extension. Unqualified ordinary prose remains unlinked.
  const paths = /(?:~\/|\/(?!\/)|[A-Za-z]:[\\/]|\.{1,2}[\\/])[\p{L}\p{N}_@.~\/\\+()[\]-]+(?::\d+(?::\d+)?)?(?:#L\d+(?:C\d+)?)?/gu;
  while ((m = paths.exec(text))) {
    if (!overlaps(m.index, m.index + m[0].length)) addPath(m[0], m.index);
  }
  const names = /(?:^|(?<=[\s`'"(]))(?:README|Makefile|Dockerfile|LICENSE|\.[A-Za-z][A-Za-z0-9_.-]*)(?::\d+(?::\d+)?)?(?:#L\d+(?:C\d+)?)?(?=$|[\s`'"),;])/g;
  while ((m = names.exec(text))) {
    if (!overlaps(m.index, m.index + m[0].length)) addPath(m[0], m.index);
  }
  return out.sort((a, b) => a.start - b.start);
}

/**
 * An absolute path with a space in it, as one line printed it (founder bug, 3 Nov 2026:
 * `/…/dist/mac-arm64/Munder Difflin.app` in backticks). The token matcher above stops at a
 * space, so it only ever saw `Difflin.app` and the click found nothing.
 *
 * A space split path is a GUESS until the disk says otherwise: `candidates` are the ways the
 * line can be read, longest first, and the caller makes a link only of one it has confirmed
 * exists whole (`confirmSpacedPath`). The first word alone is never a candidate: that is the
 * plain token's business, and taking it here would link the wrong file.
 */
export interface SpacedPathSpan {
  /** 0-based start of the path on the line (inside any quote). */
  start: number;
  /** Each a path that holds a space, longest first. Each starts at `start` on the line. */
  candidates: string[];
}

/** Where an absolute path starts: `/`, `~/` or a drive. */
const ABS_AT = /^(?:~\/|\/(?!\/)|[A-Za-z]:[\\/])/;
/** Inside one pair of backticks or quotes, an absolute path with at least one space. */
const QUOTED_SPACED_RE = /([`'"])((?:~\/|\/|[A-Za-z]:[\\/])[^`'"\n]* [^`'"\n]*?)\1/g;
/** The most words after the first a bare path is read to: each one costs a stat. */
const SPACED_MAX_WORDS = 8;
/** Prose a bare path can end with, and a `:line` suffix. */
const spacedTail = (s: string): string => s.replace(/["'`)\]>,;:!?]+$/, '').replace(/\.+$/, '').replace(/\s+$/, '');

export function spacedPathSpans(text: string): SpacedPathSpan[] {
  const out: SpacedPathSpan[] = [];
  const taken: Array<[number, number]> = [];
  const qre = new RegExp(QUOTED_SPACED_RE.source, 'g');
  let qm: RegExpExecArray | null;
  while ((qm = qre.exec(text)) !== null) {
    const start = qm.index + 1, path = qm[2].replace(/\s+$/, '');
    taken.push([qm.index, qm.index + qm[0].length]);
    if (path.includes(' ')) out.push({ start, candidates: [path] });
  }
  // Bare: a path that starts a word, read to the end of the line, a quote, a pipe or a wide gap.
  for (let i = 0; i < text.length; i++) {
    if (i > 0 && !/[\s(=]/.test(text[i - 1])) continue;
    if ((!ABS_AT.test(text.slice(i, i + 3)) && !/^(?:\.{1,2}[\\/]|[\p{L}\p{N}_.-]+[\\/])/u.test(text.slice(i))) || taken.some(([a, b]) => i >= a && i < b)) continue;
    const rest = text.slice(i).split(/["'`|]| {2,}|\t/)[0];
    const words = rest.split(' ');
    const candidates: string[] = [];
    for (let n = Math.min(words.length, SPACED_MAX_WORDS + 1); n >= 2; n--) {
      const c = spacedTail(words.slice(0, n).join(' '));
      if (c.includes(' ') && !candidates.includes(c)) candidates.push(c);
    }
    if (candidates.length) { out.push({ start: i, candidates }); taken.push([i, i + rest.length]); i += rest.length; }
  }
  return out.sort((a, b) => a.start - b.start);
}

/** The longest reading of `span` that exists whole, or null: no reading is guessed. */
export async function confirmSpacedPath(span: SpacedPathSpan, exists: (path: string) => Promise<boolean>): Promise<{ path: string; start: number; end: number; line?: number; column?: number } | null> {
  for (const c of span.candidates) {
    const ref = terminalPathReference(c);
    if (ref && await exists(ref.path).catch(() => false)) return { ...ref, start: span.start, end: span.start + c.length };
  }
  return null;
}

/** The location is metadata, never part of the path sent to stat/read IPC. */
export interface TerminalPathReference { path: string; line?: number; column?: number }
function unwrapPath(raw: string): string {
  let out = raw.trim().replace(/[,.;]+$/, '');
  for (const [a, b] of [['`', '`'], ['"', '"'], ["'", "'"], ['<', '>'], ['(', ')'], ['[', ']']]) {
    if (out.startsWith(a) && out.endsWith(b)) out = out.slice(1, -1);
  }
  out = out.replace(/[,.;]+$/, '');
  for (const [a, b] of [['(', ')'], ['[', ']']]) {
    while (out.endsWith(b) && out.split(b).length > out.split(a).length) out = out.slice(0, -1);
    while (out.startsWith(a) && out.split(a).length > out.split(b).length) out = out.slice(1);
  }
  return out;
}

/** Recognise only filesystem references; file:// on another host is never a local path. */
export function terminalPathReference(raw: string): TerminalPathReference | null {
  let path = unwrapPath(raw), fileUri = false;
  if (!path || /[\x00-\x1f\x7f]/.test(path)) return null;
  if (/^file:/i.test(path)) {
    try {
      const url = new URL(path);
      if (url.protocol !== 'file:' || (url.hostname && url.hostname.toLowerCase() !== 'localhost') || url.search) return null;
      if (url.hash && !/^#L[1-9]\d*(?:C[1-9]\d*)?$/.test(url.hash)) return null;
      // Split literal location syntax BEFORE decoding: %23L2 or %3A2 may be
      // actual filename characters, not a line reference.
      path = url.pathname + url.hash;
      fileUri = true;
    } catch { return null; }
  } else {
    const scheme = /^([A-Za-z][A-Za-z0-9+.-]*):(.*)$/.exec(path);
    if (scheme && !/^[A-Za-z]:[\\/]/.test(path)) {
      // README.md:12 and Dockerfile:4:2 are locations, not URI schemes.
      if (!/^[1-9]\d*(?::[1-9]\d*)?$/.test(scheme[2]) || !isPathToken(scheme[1])) return null;
    }
  }
  const at = /(?::([1-9]\d*)(?::([1-9]\d*))?|#L([1-9]\d*)(?:C([1-9]\d*))?)$/.exec(path);
  const line = at ? Number(at[1] ?? at[3]) : undefined, column = at ? Number(at[2] ?? at[4] ?? 1) : undefined;
  if (at) {
    if (!Number.isSafeInteger(line) || !Number.isSafeInteger(column) || line! > 1_000_000_000 || column! > 1_000_000_000) return null;
    path = path.slice(0, at.index);
  }
  if (fileUri) {
    try { path = decodeURIComponent(path); } catch { return null; }
    if (/^\/[A-Za-z]:\//.test(path)) path = path.slice(1);
  }
  if (!path || /[\x00-\x1f\x7f]/.test(path)) return null;
  return { path, ...(line ? { line, column } : {}) };
}

export function stripPathToken(raw: string): string {
  return terminalPathReference(raw)?.path ?? '';
}

/**
 * Is this token worth underlining at all?
 *
 * A token qualifies when it carries an extension we KNOW, or when it contains a
 * path separator. The separator clause is what lets `docs/report.pdf` and
 * `/tmp/dump.bin` reach the reveal branch while a bare `electron.43` on a prose
 * line stays dead text. It is a heuristic and it is meant to be: the cost of a
 * false positive is one underline that stats to nothing and does nothing.
 */
export function isPathToken(token: string): boolean {
  const ext = extOf(token);
  if (!ext) return /[/\\]/.test(token) || /^(?:README|Makefile|Dockerfile|LICENSE|\.[A-Za-z][A-Za-z0-9_.-]*)$/.test(token);
  if (PREVIEW_EXTS.has(ext) || EDIT_EXTS.has(ext) || isImagePath(token)) return true;
  return /[/\\]/.test(token);
}

/**
 * What ⌘-click should do with `token`.
 *
 * Images resolve to `reveal` on purpose. The app HAS an image viewer (the IDE
 * routes there), but a terminal click is a navigation gesture: you clicked a
 * path because you want to get to the file, and Finder is where you can then
 * drag, rename, or open it with the tool you actually wanted. Change this to
 * 'preview' if that reading turns out to be wrong; the classifier is the only
 * place that decides.
 */
export function classifyPathToken(token: string): PathAction {
  const ext = extOf(token);
  if (PREVIEW_EXTS.has(ext)) return 'preview';
  if (isImagePath(token)) return 'reveal';
  if (EDIT_EXTS.has(ext)) return 'edit';
  return 'reveal';
}
