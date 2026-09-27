/**
 * A LOCAL PATH IN A CROSS MACHINE MESSAGE IS A DEAD REFERENCE. This module is
 * the rule set that turns one into a link.
 *
 * THE DEFECT. `pro/Composer.tsx:86-88` pastes "Attached files:\n- <path>
 * (<name>)" into the body. That works only because a LOCAL agent shares a
 * filesystem with the sender. The moment the same body crosses to another
 * person's machine the path names nothing, and the receiving agent either
 * reports a missing file or, worse, opens whatever happens to sit at that path
 * over there. `src/main/fileShare.ts` already publishes one file on one link
 * that dies in an hour; nothing wired it to the message path. This is that
 * wiring, minus everything that needs a disk or a socket.
 *
 * THE GUARD, and why it is the workspace.
 *
 * A share publishes a file from the person's own disk to the public internet.
 * An agent must not be able to do that silently for a file the person never
 * chose. Two guards were possible:
 *
 *   confirm every one   correct, and it makes the feature useless. The whole
 *                       point is an agent handing a teammate's agent a file
 *                       while nobody is watching the screen; a modal per file
 *                       means the work stops until a human comes back, which
 *                       is the deadlock this release exists to remove.
 *   the workspace       the person already chose it. Hiring an agent into a
 *                       directory IS the act of scoping what it may touch, it
 *                       is the same boundary the sandbox writes under
 *                       (`hive.ts` sandboxWritableDirs), and it is a boundary
 *                       the person can see and change.
 *
 * So: a file INSIDE the sender's workspace may be shared without asking. A file
 * outside it is REFUSED, with a sentence that says how to proceed. Refusing is
 * the right failure: sending the message with the raw path in it is exactly the
 * defect, and silently dropping the reference would hand the reader a message
 * whose subject is a file they never get.
 *
 * Symlinks are resolved BEFORE the containment test (the probe returns a real
 * path), so a link inside the workspace pointing at `~/.ssh/id_rsa` is outside
 * the workspace and is refused. Only regular files pass: never a directory,
 * never a device, never a socket.
 *
 * A PERSON typing a path in the send box is not an agent, and the guard does
 * not apply to them: they chose the file by typing it. See `personChose`.
 *
 * Pure and free of `node:fs`, so `test/load-ts.cjs` takes it directly and the
 * rules are tested rather than a paraphrase of them. Main injects the probe.
 */

/** What the caller's filesystem says about one candidate. `null` means nothing
 *  is there at all, which is the normal answer for prose that merely looks like
 *  a path. */
export interface ProbedPath {
  /** Absolute, with every symlink already resolved. */
  real: string;
  /** A REGULAR file. A directory, a device and a socket are all false. */
  isFile: boolean;
}

export type PathProbe = (raw: string) => ProbedPath | null;

/** One reference found in a body, already probed and already judged. */
export interface FileRef {
  /** The exact substring in the body, so the rewrite replaces what it found. */
  token: string;
  /** The resolved path main will publish. */
  real: string;
  /** The download name, which is the last segment of `real`. */
  name: string;
}

export type ShareBlockCode =
  | 'outside-workspace'
  | 'no-workspace'
  | 'unreadable'
  | 'too-big'
  | 'too-many'
  | 'no-link';

/**
 * A refusal an agent can act on.
 *
 * Shaped like `Violation` in `@shared/teamMessage` on purpose: same `{ code,
 * fix }` pair, same rule that `fix` is one imperative sentence with no dashes.
 * These six sentences are NEW and belong in that module's vocabulary once it
 * grows codes for them; they live here so the bridge never carries refusal
 * copy of its own.
 */
export interface ShareBlock {
  code: ShareBlockCode;
  fix: string;
}

export function shareBlock(code: ShareBlockCode, name: string): ShareBlock {
  return { code, fix: FIXES[code](name) };
}

const FIXES: Record<ShareBlockCode, (name: string) => string> = {
  'outside-workspace': (name) =>
    `${name} is outside the workspace you are working in, so it cannot be published. Copy it into your workspace and send the message again, or ask your human to send the file.`,
  'no-workspace': (name) =>
    `${name} is a local file and there is no workspace to check it against, so it cannot be published. Ask your human to send the file.`,
  'unreadable': (name) =>
    `${name} is not a regular file this machine can read, so it cannot be published. Name one readable file, or send the message without it.`,
  'too-big': (name) =>
    `${name} is too large to publish on a link. Send a smaller file, or put it somewhere they can already reach and send that address instead.`,
  'too-many': (name) =>
    `This machine is already holding the most file links it can keep open at once, so ${name} cannot be published. Wait for one to expire and send the message again.`,
  'no-link': (name) =>
    `No public link could be opened for ${name}, so it cannot reach another machine. Send the message again in a moment, or ask your human to send the file.`,
};

/* ---- finding the references ------------------------------------------------ */

/**
 * Absolute paths, POSIX and Windows. Deliberately greedy about what a path may
 * contain and deliberately narrow about where one may start: a run beginning
 * after `:` or `/` is part of a URL, not a path, so `https://host/s/abc` is
 * left alone.
 */
const CANDIDATE = /(?:[A-Za-z]:)?[/\\][^\s"'`<>|*?]+/g;

/** Punctuation a sentence puts after a path and a path almost never ends in.
 *  Trimmed one at a time and re-probed, so `see /tmp/a.txt.` finds the file
 *  and `weird.name.` is still tried in full first. */
const TRAILING = '.,;:!?)]}>\'"';

/**
 * Every local file this body actually names, in order, deduplicated.
 *
 * A candidate that does not resolve to something on this disk is PROSE and is
 * left exactly as it is: `/usr/bin/env` in a sentence on a machine without it,
 * a route like `/roster`, a regex. That is what keeps this from mangling
 * ordinary English, and it is why the probe is the filter rather than the
 * pattern.
 *
 * A candidate that resolves to a directory, a device or a socket is reported
 * separately by {@link scanBody}: it named something real and it is not
 * shareable, which is not the same as prose.
 */
export function scanBody(body: string, probe: PathProbe): { files: FileRef[]; notFiles: FileRef[] } {
  const files: FileRef[] = [];
  const notFiles: FileRef[] = [];
  const seen = new Set<string>();
  const text = String(body ?? '');

  CANDIDATE.lastIndex = 0;
  for (let m = CANDIDATE.exec(text); m; m = CANDIDATE.exec(text)) {
    const start = m.index;
    const before = start > 0 ? text[start - 1] : '';
    // Inside a URL, or the tail of a longer token. Never a path.
    if (before === ':' || before === '/' || before === '\\') continue;
    if (m[0].includes('://')) continue;

    for (let token = m[0]; token.length > 1; token = token.slice(0, -1)) {
      const probed = probe(token);
      if (!probed) {
        if (!TRAILING.includes(token[token.length - 1])) break;
        continue;
      }
      if (seen.has(token)) break;
      seen.add(token);
      const ref: FileRef = { token, real: probed.real, name: baseName(probed.real) };
      (probed.isFile ? files : notFiles).push(ref);
      break;
    }
  }
  return { files, notFiles };
}

/** The last segment of a path, either separator. Never reaches a filesystem. */
export function baseName(p: string): string {
  const parts = String(p ?? '').split(/[/\\]/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : String(p ?? '');
}

/* ---- the guard ------------------------------------------------------------- */

/**
 * Is `real` inside `root`?
 *
 * Both must already be REAL paths, resolved through every symlink by the
 * caller, or this check is decorative: a link inside the workspace would carry
 * the workspace's prefix while pointing anywhere on the disk.
 *
 * Case SENSITIVE, on every platform. `realpath` returns the casing the
 * filesystem actually stores, so two real paths that name the same file always
 * agree; loosening it here would let a crafted `/WORKSPACE/../etc` style string
 * that never went through `realpath` slip past.
 */
export function isInsideWorkspace(root: string, real: string): boolean {
  const r = trimSep(String(root ?? ''));
  const f = trimSep(String(real ?? ''));
  if (!r || !f) return false;
  if (f === r) return true;
  return f.startsWith(r + '/') || f.startsWith(r + '\\');
}

function trimSep(p: string): string {
  return p.length > 1 ? p.replace(/[/\\]+$/, '') : p;
}

/**
 * The senders whose file choices are their own. A person typing a path into the
 * send box picked that file; the workspace guard exists to stop an AGENT
 * publishing one the person never scoped it to.
 *
 * `you` and `human` are the router's words for the person at this machine.
 */
export function personChose(from: string): boolean {
  const who = String(from ?? '').trim().toLowerCase();
  return who === 'you' || who === 'human';
}

/* ---- the rewrite ----------------------------------------------------------- */

/**
 * How a share reads in the body: the NAME first, because that is what the
 * reader is being handed, then the link, then how long they have.
 *
 * English, like `crossUserBrief()` in `@shared/teamMessage` and `expiresIn()`
 * in `@shared/fileShare`: this is wire text between two agents, not UI copy,
 * and it is not translated at either end.
 */
export function shareRef(name: string, url: string, expires: string): string {
  return `${name} (${url}, ${expires})`;
}

/**
 * Put the links in, take the paths out.
 *
 * The composer writes `- <path> (<name>)`, so a bare replacement would leave
 * the name twice. When the text straight after a replaced path is ` (<name>)`
 * for that same file, it is consumed: the reference reads once.
 */
export function applyShares(body: string, refs: readonly { token: string; name: string; text: string }[]): string {
  let out = String(body ?? '');
  for (const ref of refs) {
    let from = out.indexOf(ref.token);
    while (from !== -1) {
      let end = from + ref.token.length;
      const suffix = ` (${ref.name})`;
      if (out.startsWith(suffix, end)) end += suffix.length;
      out = out.slice(0, from) + ref.text + out.slice(end);
      from = out.indexOf(ref.token, from + ref.text.length);
    }
  }
  return out;
}
