/**
 * GOD-STARTUP-TOKENS R1 (1.1.79, Jim; diagnosis hive/agents/jim-mtujpe28/GOD-STARTUP-1M-TOKENS-045.md).
 *
 * At launch god is RESUMED (`--resume <its last session>`), so its first request re-sends its
 * whole previous conversation, and every step after it re-sends that again. Measured on this
 * machine: 77-510K tokens per request, the first one a full cache WRITE (1.25x) whenever the
 * cache had expired. The cache is lost when god's last request is older than the cache lifetime
 * (1 h), when Claude Code updated itself in between, or when the model is different; a big
 * context then costs its full size again on the first request.
 *
 * So an AUTOMATIC god resume (restore on restart; never a typed id or a person's "Restart &
 * Continue") starts FRESH, with a short handoff in context (godHandoffContext), when ANY of:
 *   - context-over-limit   the last request carried more than GOD_RESUME_MAX_CONTEXT tokens;
 *   - cache-expired        the last request is older than GOD_RESUME_CACHE_MS;
 *   - cli-version-changed  the transcript's Claude Code version differs from the installed one;
 *   - model-changed        the transcript's model differs from the model this spawn runs.
 * A fact that cannot be read is never a reason (the resume then goes ahead as before).
 */
import { closeSync, existsSync, fstatSync, openSync, readFileSync, readSync, realpathSync } from 'node:fs';
import { dirname, join, sep } from 'node:path';

/** R1: above this many tokens of context, a resume costs more than a fresh start with a handoff. */
export const GOD_RESUME_MAX_CONTEXT = 150_000;
/** R1: the prompt-cache lifetime; a resume after it re-writes the whole context. */
export const GOD_RESUME_CACHE_MS = 60 * 60 * 1000;
/** How much of the transcript's end is read for the last request (a request line is small). */
export const GOD_TRANSCRIPT_TAIL_BYTES = 512 * 1024;

export type GodFreshReason = 'context-over-limit' | 'cache-expired' | 'cli-version-changed' | 'model-changed';

/** What god's last session says about its last request. Every field may be unknown (null). */
export interface GodSessionFacts {
  /** Tokens the last request carried (input + cache read + cache write) plus its output. */
  contextTokens: number | null;
  /** When the last request was answered (ms). */
  lastRequestAt: number | null;
  /** The Claude Code version that wrote it. */
  cliVersion: string | null;
  /** The model that answered it. */
  model: string | null;
}

/** The facts of the LAST assistant request in a Claude transcript's tail (JSONL), or all null. */
export function godSessionFactsFromTail(tail: string): GodSessionFacts {
  const none: GodSessionFacts = { contextTokens: null, lastRequestAt: null, cliVersion: null, model: null };
  const lines = tail.split('\n');
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i].trim();
    if (!line.includes('"assistant"') || !line.includes('"usage"')) continue;
    let rec: Record<string, unknown>;
    try { rec = JSON.parse(line) as Record<string, unknown>; } catch { continue; }
    if (rec.type !== 'assistant' || rec.isSidechain === true || typeof rec.message !== 'object' || rec.message === null) continue;
    const msg = rec.message as Record<string, unknown>;
    const u = (typeof msg.usage === 'object' && msg.usage !== null ? msg.usage : null) as Record<string, unknown> | null;
    if (!u) continue;
    const n = (k: string): number => (typeof u[k] === 'number' && Number.isFinite(u[k] as number) ? u[k] as number : 0);
    const ts = typeof rec.timestamp === 'string' ? Date.parse(rec.timestamp) : NaN;
    return {
      contextTokens: n('input_tokens') + n('cache_read_input_tokens') + n('cache_creation_input_tokens') + n('output_tokens'),
      lastRequestAt: Number.isFinite(ts) ? ts : null,
      cliVersion: typeof rec.version === 'string' && rec.version.trim() ? rec.version.trim() : null,
      model: typeof msg.model === 'string' && msg.model.trim() ? msg.model.trim() : null
    };
  }
  return none;
}

/** The facts of a transcript file (its last GOD_TRANSCRIPT_TAIL_BYTES), or all null. */
export function readGodSessionFacts(file: string | null): GodSessionFacts {
  const none: GodSessionFacts = { contextTokens: null, lastRequestAt: null, cliVersion: null, model: null };
  if (!file) return none;
  let fd: number | null = null;
  try {
    fd = openSync(file, 'r');
    const size = fstatSync(fd).size;
    const len = Math.min(size, GOD_TRANSCRIPT_TAIL_BYTES);
    const buf = Buffer.alloc(len);
    readSync(fd, buf, 0, len, size - len);
    return godSessionFactsFromTail(buf.toString('utf8'));
  } catch {
    return none;
  } finally {
    if (fd !== null) try { closeSync(fd); } catch { /* closed */ }
  }
}

/** A Claude model id as the cache sees it: lower case, no `[1m]` context suffix. An alias the
 *  CLI resolves itself (`opus`, `sonnet`, `default`) is not comparable: null. */
export function cacheModelKey(model: string | null | undefined): string | null {
  const m = (model ?? '').trim().toLowerCase().replace(/\[1m\]$/, '');
  return m.startsWith('claude-') ? m : null;
}

/** The R1 decision. `now` and `current` (the installed CLI version, the model this spawn runs)
 *  come from the caller. Pure. */
export function godResumeDecision(
  facts: GodSessionFacts,
  now: number,
  current: { cliVersion: string | null; model: string | null },
  limits: { maxContext: number; cacheMs: number } = { maxContext: GOD_RESUME_MAX_CONTEXT, cacheMs: GOD_RESUME_CACHE_MS }
): { fresh: boolean; reasons: GodFreshReason[] } {
  const reasons: GodFreshReason[] = [];
  if (facts.contextTokens !== null && facts.contextTokens > limits.maxContext) reasons.push('context-over-limit');
  if (facts.lastRequestAt !== null && now - facts.lastRequestAt > limits.cacheMs) reasons.push('cache-expired');
  if (facts.cliVersion && current.cliVersion && facts.cliVersion !== current.cliVersion) reasons.push('cli-version-changed');
  const was = cacheModelKey(facts.model);
  const will = cacheModelKey(current.model);
  if (was && will && was !== will) reasons.push('model-changed');
  return { fresh: reasons.length > 0, reasons };
}

/**
 * R1, one candidate session of an AUTOMATIC god resume: read its transcript, decide, log the
 * decision (`god-startup-fresh` / `god-startup-resume`), and on a fresh start retire the session
 * and arm the handoff. Returns the reasons (fresh) or null (resume as before). No transcript =
 * null without a row: the resume-miss path decides that case, as before.
 */
export function godFreshStart(
  sessionId: string,
  deps: {
    agentId: string;
    current: { cliVersion: string | null; model: string | null };
    transcriptPath(sessionId: string): string | null;
    now(): number;
    log(row: Record<string, unknown>): void;
    retire(sessionId: string): void;
    arm(h: { reasons: string[]; previousSession: string | null; contextTokens: number | null }): void;
    readFacts?: (file: string) => GodSessionFacts;
  }
): GodFreshReason[] | null {
  const file = deps.transcriptPath(sessionId);
  if (!file) return null;
  const facts = (deps.readFacts ?? readGodSessionFacts)(file);
  const now = deps.now();
  const d = godResumeDecision(facts, now, deps.current);
  deps.log({
    kind: d.fresh ? 'god-startup-fresh' : 'god-startup-resume', agentId: deps.agentId, sessionId, reasons: d.reasons,
    contextTokens: facts.contextTokens, ageMs: facts.lastRequestAt !== null ? now - facts.lastRequestAt : null,
    cliVersion: { was: facts.cliVersion, now: deps.current.cliVersion }, model: { was: facts.model, now: deps.current.model }
  });
  if (!d.fresh) return null;
  deps.retire(sessionId);
  deps.arm({ reasons: d.reasons, previousSession: sessionId, contextTokens: facts.contextTokens });
  return d.reasons;
}

/** The installed Claude Code version (`x.y.z`) of the `claude` at `commandPath`, from its npm
 *  package.json (no process is started), or null (a native install, or unreadable). */
export function readClaudeVersion(commandPath: string | null | undefined): string | null {
  if (!commandPath) return null;
  const PKG = join('@anthropic-ai', 'claude-code', 'package.json');
  const dir = dirname(commandPath);
  const candidates = [join(dir, 'node_modules', PKG), join(dir, '..', 'lib', 'node_modules', PKG)];
  try {
    const real = realpathSync(commandPath);
    const marker = `${sep}@anthropic-ai${sep}claude-code${sep}`;
    const i = real.indexOf(marker);
    if (i >= 0) candidates.unshift(join(real.slice(0, i + marker.length), 'package.json'));
  } catch { /* not resolvable: the candidates above */ }
  for (const p of candidates) {
    try {
      if (!existsSync(p)) continue;
      const pkg = JSON.parse(readFileSync(p, 'utf8')) as { name?: unknown; version?: unknown };
      if (pkg.name === '@anthropic-ai/claude-code' && typeof pkg.version === 'string' && /^\d+\.\d+\.\d+/.test(pkg.version)) return pkg.version;
    } catch { /* the next */ }
  }
  return null;
}

/** Bounds of the handoff pieces (characters). The whole block stays under GOD_HANDOFF_MAX, so it
 *  fits one hook's additionalContext (the joined budget is MAIL_JOINED_BUDGET, 9,500) with room
 *  to spare; a longer file is cut with a pointer to it. */
export const GOD_HANDOFF_LESSONS_MAX = 3_000;
export const GOD_HANDOFF_FILE_MAX = 2_500;
export const GOD_HANDOFF_MAX = 9_000;

/** The `## How I work (standing lessons)` section of a memory.md (up to the next `## `), or ''. */
export function standingLessons(memory: string): string {
  const lines = memory.split(/\r?\n/);
  const start = lines.findIndex((l) => /^## How I work/.test(l));
  if (start < 0) return '';
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) if (/^## /.test(lines[i])) { end = i; break; }
  return lines.slice(start, end).join('\n').trim();
}

const bounded = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max)}\n[... cut at ${max} characters; read the file for the rest]` : s);

/**
 * R1: the handoff a FRESH god gets in context (its first SessionStart / UserPromptSubmit hook):
 * why it started fresh, its standing lessons, the floor digest and the board status, each
 * bounded. Pending mail is not copied here: it stays in the ledger and arrives through the
 * normal <hive-mail> injection (an open surfacing epoch of the old process was already put back
 * to delivered by the restart recovery), and open obligations are listed there as before.
 */
export interface GodHandoffInput {
  reasons: readonly string[];
  previousSession: string | null;
  contextTokens: number | null;
  memory: string | null;
  floorDigest: string | null;
  boardStatus: string | null;
}

export function godHandoffContext(input: GodHandoffInput): string {
  return godHandoffFit(input, GOD_HANDOFF_MAX).text;
}

/**
 * Creed B1: the handoff shares ONE hook additionalContext with the roster, goal and steer, and
 * Claude Code shows only a 2,000-character preview of one over 10,000. So it is built to a
 * `budget` (the caller: MAIL_JOINED_BUDGET minus the other joined parts). Over budget, the pieces
 * are cut from the end: board-status first, then the floor digest, then the lessons, each with a
 * pointer to its file; the header is cut last. `cut` names what was shortened.
 */
export function godHandoffFit(input: GodHandoffInput, budget: number): { text: string; cut: string[] } {
  const why = input.reasons.join(', ');
  const size = input.contextTokens !== null ? ` (its last request carried ${Math.round(input.contextTokens / 1000)}K tokens)` : '';
  const head = `<god-handoff>\n\nYou started FRESH instead of resuming your previous session${input.previousSession ? ` ${input.previousSession}` : ''}${size}, because: ${why}. Resuming it would have re-sent the whole old conversation at every step. Everything you need to carry on is below or on disk: your memory.md, the board, and your hive mail, which arrives in context as usual.`;
  const tail = '\n\n</god-handoff>';
  const lessons = input.memory ? standingLessons(input.memory) : '';
  const pieces: Array<{ name: string; label: string; body: string }> = [];
  if (lessons) pieces.push({ name: 'lessons', label: 'Your standing lessons (memory.md):', body: bounded(lessons, GOD_HANDOFF_LESSONS_MAX) });
  if (input.floorDigest?.trim()) pieces.push({ name: 'floor-digest', label: 'floor-digest.md:', body: bounded(input.floorDigest.trim(), GOD_HANDOFF_FILE_MAX) });
  if (input.boardStatus?.trim()) pieces.push({ name: 'board-status', label: 'board-status.md:', body: bounded(input.boardStatus.trim(), GOD_HANDOFF_FILE_MAX) });
  const max = Math.max(0, Math.min(budget, GOD_HANDOFF_MAX));
  const render = (): string => head + pieces.map((p) => `\n\n${p.label}\n${p.body}`).join('') + tail;
  const cut: string[] = [];
  const POINTER = '[cut to fit the hook; read the file]';
  for (let i = pieces.length - 1; i >= 0 && render().length > max; i -= 1) {
    const over = render().length - max;
    const p = pieces[i];
    const keep = Math.max(0, p.body.length - over - POINTER.length - 1);
    p.body = keep > 0 ? `${p.body.slice(0, keep)}\n${POINTER}` : POINTER;
    cut.push(p.name);
    if (render().length > max && keep > 0) { p.body = POINTER; }
  }
  let text = render();
  if (text.length > max) {
    // Even the pointers do not fit: keep the header (cut) and the closing tag.
    cut.push('header');
    text = max > tail.length ? `${(head + pieces.map((p) => `\n\n${p.label} ${POINTER}`).join('')).slice(0, max - tail.length)}${tail}` : '';
  }
  return { text, cut };
}
