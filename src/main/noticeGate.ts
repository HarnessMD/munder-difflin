/**
 * NoticeGate: the four delivery rules for HARNESS-GENERATED notices (T-796).
 *
 * A notice is a message the app itself writes into an agent's inbox: the god
 * heartbeat, a circuit-breaker steer or constrain, a worker reaped / preserved /
 * reclaimed report, a rejected spawn request. Agent-authored mail (outbox to
 * inbox, ASK-ME answers, spawn objectives) never passes through here: it is
 * delivered exactly once and unchanged by HiveManager.routeMessage.
 *
 *  1. Dedup by signature, persisted: a notice whose signature is already on the
 *     ledger for that recipient is dropped, across app restarts.
 *  2. Re-arm on clear: a signature leaves the ledger only when the caller says
 *     the condition behind it is gone (rearm), never on a timer.
 *  3. Defer while waiting: a non-urgent notice to an agent that is waiting on
 *     the human (permission prompt or an open question) is held and released
 *     once the wait ends. Urgent notices still go (the inbox file is written;
 *     the typed wake nudge keeps its own HITL guard and never types into an
 *     open prompt).
 *  4. Nothing to the dead: a notice to an agent that is missing from the
 *     registry or archived is dropped, and so is a held notice whose recipient
 *     died while it waited.
 *
 * State lives in one JSON file under the hive root (notice-ledger.json), never
 * in renderer state. No electron import, so it is unit-testable.
 */

import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export type NoticeKind = 'heartbeat' | 'breaker' | 'worker' | 'spawn-rejected';

export interface Notice {
  kind: NoticeKind;
  /** Kind-specific identity; the signature is `${kind}:${key}`. */
  key: string;
  /** Urgent notices skip rule 3 (they are delivered while the agent waits). */
  urgent?: boolean;
  /** The facts the condition is about (inbox ids, a worker id), kept on the
   *  ledger so a later rearm predicate can test whether the condition cleared. */
  ctx?: string[];
}

export interface NoticeFacts {
  /** Recipient missing from the registry or archived (god is never dead). */
  dead: boolean;
  /** Recipient is waiting on the human: permission prompt or open question. */
  waiting: boolean;
}

export type NoticeVerdict = 'deliver' | 'duplicate' | 'defer' | 'dead';

export interface LedgerEntry { at: string; ctx?: string[] }

/** A held notice: everything needed to send it later, unchanged. */
export interface DeferredNotice<P = unknown> {
  to: string;
  sig: string;
  notice: Notice;
  payload: P;
  from: string;
  at: string;
}

interface LedgerFile<P> {
  version: 1;
  delivered: Record<string, Record<string, LedgerEntry>>;
  deferred: DeferredNotice<P>[];
}

/** Entries older than this are pruned on load (bounds the file). A condition
 *  that is still live after 30 days has long stopped being news. */
export const NOTICE_LEDGER_TTL_MS = 30 * 24 * 60 * 60_000;
/** At most this many held notices per recipient; the oldest goes first. */
export const NOTICE_DEFER_CAP = 50;

export const signatureOf = (n: Pick<Notice, 'kind' | 'key'>): string => `${n.kind}:${n.key}`;

/** The breaker reason without its figures, so "looping: 7x" and "looping: 9x"
 *  are one finding: the text before the first colon, digits stripped. */
export function breakerReasonClass(reason: string): string {
  const head = (reason.split(':')[0] ?? '').replace(/[0-9.,$]+/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  return head || 'unspecified';
}

export class NoticeGate<P = unknown> {
  private state: LedgerFile<P>;

  constructor(private file: string, private now: () => number = Date.now) {
    this.state = this.load();
  }

  private load(): LedgerFile<P> {
    const empty: LedgerFile<P> = { version: 1, delivered: {}, deferred: [] };
    if (!existsSync(this.file)) return empty;
    try {
      const raw = JSON.parse(readFileSync(this.file, 'utf8')) as Partial<LedgerFile<P>>;
      const delivered: LedgerFile<P>['delivered'] = {};
      const cutoff = this.now() - NOTICE_LEDGER_TTL_MS;
      for (const [to, sigs] of Object.entries(raw.delivered ?? {})) {
        for (const [sig, e] of Object.entries(sigs ?? {})) {
          const t = Date.parse(e?.at ?? '');
          if (!Number.isFinite(t) || t < cutoff) continue;
          (delivered[to] ??= {})[sig] = e;
        }
      }
      const deferred = Array.isArray(raw.deferred) ? raw.deferred.filter((d) => d && typeof d.to === 'string' && typeof d.sig === 'string') : [];
      return { version: 1, delivered, deferred };
    } catch {
      // A corrupt ledger must never block delivery: start empty (worst case one
      // repeat of a notice, never a lost agent message).
      return empty;
    }
  }

  private save(): void {
    try {
      mkdirSync(dirname(this.file), { recursive: true });
      const tmp = `${this.file}.tmp`;
      writeFileSync(tmp, JSON.stringify(this.state, null, 2));
      renameSync(tmp, this.file);
    } catch { /* best-effort: an unwritable ledger degrades to in-memory dedup */ }
  }

  /** The verdict for one notice. Pure: records nothing. */
  decide(to: string, notice: Notice, facts: NoticeFacts): NoticeVerdict {
    if (facts.dead) return 'dead';
    const sig = signatureOf(notice);
    if (this.state.delivered[to]?.[sig]) return 'duplicate';
    if (this.state.deferred.some((d) => d.to === to && d.sig === sig)) return 'duplicate';
    if (facts.waiting && !notice.urgent) return 'defer';
    return 'deliver';
  }

  /** Record a delivered notice, so the same signature is a duplicate from now on. */
  markDelivered(to: string, notice: Notice): void {
    (this.state.delivered[to] ??= {})[signatureOf(notice)] = {
      at: new Date(this.now()).toISOString(),
      ...(notice.ctx?.length ? { ctx: [...notice.ctx] } : {})
    };
    this.save();
  }

  /** Hold a notice until its recipient stops waiting. Returns the notices the
   *  cap pushed out (oldest first), so the caller can log them. */
  hold(to: string, notice: Notice, payload: P, from: string): DeferredNotice<P>[] {
    this.state.deferred.push({ to, sig: signatureOf(notice), notice, payload, from, at: new Date(this.now()).toISOString() });
    const mine = this.state.deferred.filter((d) => d.to === to);
    const evicted = mine.slice(0, Math.max(0, mine.length - NOTICE_DEFER_CAP));
    if (evicted.length) this.state.deferred = this.state.deferred.filter((d) => !evicted.includes(d));
    this.save();
    return evicted;
  }

  /** Take every held notice that may go now. A notice whose recipient is dead
   *  is returned in `dead` (to be logged, never sent); one whose recipient still
   *  waits stays held. */
  release(factsFor: (to: string) => NoticeFacts): { send: DeferredNotice<P>[]; dead: DeferredNotice<P>[] } {
    const send: DeferredNotice<P>[] = [];
    const dead: DeferredNotice<P>[] = [];
    const keep: DeferredNotice<P>[] = [];
    for (const d of this.state.deferred) {
      const f = factsFor(d.to);
      if (f.dead) dead.push(d);
      else if (f.waiting) keep.push(d);
      else send.push(d);
    }
    if (send.length || dead.length) {
      this.state.deferred = keep;
      this.save();
    }
    return { send, dead };
  }

  /** Rule 2: drop the recorded signatures of `kind` for `to` whose condition
   *  has cleared (`cleared(entryKey, ctx)` returns true). Returns how many. */
  rearm(to: string, kind: NoticeKind, cleared: (key: string, ctx: string[] | undefined) => boolean): number {
    const sigs = this.state.delivered[to];
    if (!sigs) return 0;
    const prefix = `${kind}:`;
    let n = 0;
    for (const [sig, e] of Object.entries(sigs)) {
      if (!sig.startsWith(prefix)) continue;
      if (!cleared(sig.slice(prefix.length), e.ctx)) continue;
      delete sigs[sig];
      n++;
    }
    if (n) {
      if (!Object.keys(sigs).length) delete this.state.delivered[to];
      this.save();
    }
    return n;
  }

  /** Read-only views for tests and diagnostics. */
  delivered(to: string): string[] { return Object.keys(this.state.delivered[to] ?? {}); }
  held(): readonly DeferredNotice<P>[] { return this.state.deferred; }
}

/**
 * WaitTracker: "is this agent waiting on the human?" from the hook events the
 * main process already receives (HookServer.onEvent).
 *
 *  - set by a permission Notification (classifyHook 'needsHuman') or by
 *    PreToolUse of AskUserQuestion (an open question to the human);
 *  - cleared by the next boundary that proves the agent moved on: PostToolUse,
 *    UserPromptSubmit, Stop, SubagentStop, SessionStart, PreCompact, or any
 *    PreToolUse of another tool; and by forget() when the PTY closes.
 *
 * The idle prompt ("waiting for your input" after a finished turn) is NOT a
 * wait: that agent is free and its mail should go.
 */
export const QUESTION_TOOLS = new Set(['AskUserQuestion']);

const CLEARING_EVENTS = new Set(['PostToolUse', 'PostToolUseFailure', 'UserPromptSubmit', 'Stop', 'SubagentStop', 'SessionStart', 'PreCompact']);

export class WaitTracker {
  private waiting = new Map<string, { since: number; why: 'permission' | 'question' }>();

  note(
    agentId: string | undefined,
    event: string | undefined,
    hookClass: 'needsHuman' | 'idle' | null,
    toolName?: string,
    at = Date.now()
  ): void {
    if (!agentId || !event) return;
    if (event === 'Notification') {
      if (hookClass === 'needsHuman') this.waiting.set(agentId, { since: at, why: 'permission' });
      return;
    }
    if (event === 'PreToolUse') {
      if (toolName && QUESTION_TOOLS.has(toolName)) this.waiting.set(agentId, { since: at, why: 'question' });
      else this.waiting.delete(agentId);
      return;
    }
    if (CLEARING_EVENTS.has(event)) this.waiting.delete(agentId);
  }

  isWaiting(agentId: string): boolean { return this.waiting.has(agentId); }
  why(agentId: string): 'permission' | 'question' | null { return this.waiting.get(agentId)?.why ?? null; }
  forget(agentId: string): void { this.waiting.delete(agentId); }
}
