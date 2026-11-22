/**
 * The guardrail's Approvals: what an "Ask me" backstop does.
 *
 * A hook cannot wait for a person: every shim gives up after a few seconds and the
 * call then runs. So an ask never holds the call. It is refused, and the refusal puts
 * a request on the Approvals card at the top of ASK ME. The operator's Approve makes
 * a grant for that one call, and the agent runs the same call again. Deny refuses it,
 * and the same call is refused at once for a while, with no new card.
 *
 * A request and its grant are keyed on the agent, the rule, the tool, the call's
 * input and its working folder. A grant covers exactly that call, once, for 60
 * minutes. A different agent, rule, input or folder is a new request.
 *
 * Kept in `<hive>/policy/approvals.json`, so open requests outlive a restart. Agents
 * cannot write that folder while the guardrail is on (the engine's self-protection).
 * A grant is never read back from the file, nor from tasks.json: it is made only by
 * `decide`, which only the app's own window reaches (IPC), and lives in this run.
 *
 * No electron import, so tests drive it directly with their own clock.
 */
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const APPROVALS_FILE = 'approvals.json';
/** How long a request waits for the operator before it is dropped. */
export const REQUEST_TTL_MS = 60 * 60 * 1000;
/** How long an approved call stays runnable. */
export const GRANT_TTL_MS = 60 * 60 * 1000;
/** After Deny, how long the same call is refused with no new card. */
export const DENY_HOLD_MS = 10 * 60 * 1000;
/** Open requests one agent may have at once, so a loop cannot fill the card. */
export const MAX_PENDING_PER_AGENT = 20;

/** Input keys that do not change what a call does: Claude Code's Bash
 *  `description` is reworded by the model on every try. */
const COSMETIC_KEYS = new Set(['description', 'timeout']);

export interface ApprovalCall {
  agentId: string;
  ruleId: string;
  /** The rule's principle or message, shown on the card. */
  reason?: string;
  tool: string;
  input: unknown;
  cwd?: string | null;
}

export type ApprovalState = 'pending' | 'approved' | 'denied';

export interface ApprovalEntry {
  id: string;
  key: string;
  agent_id: string;
  rule_id: string;
  reason: string;
  tool: string;
  /** What the operator approves, in full: the command for a shell call, else the input as JSON. */
  call: string;
  cwd: string | null;
  state: ApprovalState;
  asked_at: string;
  decided_at?: string;
  /** Pending: when the request is dropped. Approved: when the grant lapses.
   *  Denied: when the same call may be asked again. */
  expires_at: string;
}

export type ApprovalCheck =
  | { kind: 'granted'; entry: ApprovalEntry }
  | { kind: 'denied'; entry: ApprovalEntry }
  | { kind: 'pending'; entry: ApprovalEntry; fresh: boolean }
  | { kind: 'full' };

/** JSON with sorted keys, so the same input always gives the same key. */
function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.keys(v as Record<string, unknown>).sort()
      .map((k) => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`).join(',')}}`;
  }
  return JSON.stringify(v ?? null) ?? 'null';
}

function effectiveInput(input: unknown): unknown {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return input ?? null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) if (!COSMETIC_KEYS.has(k)) out[k] = v;
  return out;
}

/** The call as the operator reads it: the command for a shell call, else its input. */
export function callText(input: unknown): string {
  const eff = effectiveInput(input);
  if (eff && typeof eff === 'object' && !Array.isArray(eff)) {
    const o = eff as Record<string, unknown>;
    const keys = Object.keys(o);
    if (typeof o.command === 'string' && keys.length === 1) return o.command;
    if (Array.isArray(o.command) && keys.length === 1 && o.command.every((a) => typeof a === 'string')) return o.command.join(' ');
  }
  return canonical(eff);
}

/** The one key a request and its grant share. */
export function approvalKey(call: ApprovalCall): string {
  const body = canonical({ a: call.agentId, r: call.ruleId, t: call.tool, i: effectiveInput(call.input), c: call.cwd ?? null });
  return 'sha256:' + createHash('sha256').update(body).digest('hex');
}

const iso = (ms: number): string => new Date(ms).toISOString();
const at = (s: string): number => Date.parse(s);

function isEntry(e: unknown): e is ApprovalEntry {
  const x = e as ApprovalEntry;
  return !!x && typeof x === 'object' && typeof x.id === 'string' && typeof x.key === 'string'
    && typeof x.agent_id === 'string' && typeof x.rule_id === 'string' && typeof x.tool === 'string'
    && typeof x.call === 'string' && (x.state === 'pending' || x.state === 'approved' || x.state === 'denied')
    && typeof x.asked_at === 'string' && typeof x.expires_at === 'string' && Number.isFinite(at(x.expires_at));
}

export class Approvals {
  private entries: ApprovalEntry[] = [];

  private now: () => number;

  /** `dir` is `<hive>/policy`; null keeps everything in memory (no hive yet).
   *  `onExpired` hears every request that lapsed unanswered, so its agent is told. */
  constructor(private dir: string | null, private opts: {
    now?: () => number;
    onDamaged?: () => void;
    onExpired?: (expired: ApprovalEntry[]) => void;
  } = {}) {
    this.now = opts.now ?? Date.now;
    this.load();
  }

  private file(): string | null { return this.dir ? join(this.dir, APPROVALS_FILE) : null; }

  private load(): void {
    const f = this.file();
    if (!f || !existsSync(f)) return;
    try {
      const raw = JSON.parse(readFileSync(f, 'utf8')) as { entries?: unknown };
      const list = Array.isArray(raw?.entries) ? raw.entries : null;
      if (!list) throw new Error('no entries');
      // A row that is not well formed is dropped. So is every grant: only a click in
      // this run of the app makes one, and a file can be written by hand while the app
      // is closed. Open requests and Denies come back; a lost grant costs a new card.
      this.entries = list.filter(isEntry).filter((e) => e.state !== 'approved');
    } catch {
      this.entries = [];
      this.opts.onDamaged?.();
    }
  }

  private save(): void {
    const f = this.file();
    if (!f) return;
    try {
      const tmp = `${f}.${process.pid}.tmp`;
      writeFileSync(tmp, JSON.stringify({ version: 1, entries: this.entries }, null, 2) + '\n', { mode: 0o600 });
      renameSync(tmp, f);
    } catch { /* memory still holds the truth for this run */ }
  }

  /** Drop what has lapsed, and pass the requests that expired unanswered to
   *  `onExpired`. Returns them too. */
  sweep(): ApprovalEntry[] {
    const t = this.now();
    const lapsed = this.entries.filter((e) => at(e.expires_at) <= t);
    if (!lapsed.length) return [];
    this.entries = this.entries.filter((e) => at(e.expires_at) > t);
    this.save();
    const expired = lapsed.filter((e) => e.state === 'pending').map((e) => ({ ...e }));
    if (expired.length) { try { this.opts.onExpired?.(expired); } catch { /* telling is best effort */ } }
    return expired;
  }

  /**
   * An ask backstop matched this call. A grant for it is used up and the call may
   * run; a recent Deny refuses it; otherwise it waits on a request, new or the one
   * already open.
   */
  check(call: ApprovalCall): ApprovalCheck {
    this.sweep();
    const key = approvalKey(call);
    const hit = this.entries.find((e) => e.key === key);
    if (hit?.state === 'approved') {
      this.entries = this.entries.filter((e) => e !== hit);
      this.save();
      return { kind: 'granted', entry: hit };
    }
    if (hit?.state === 'denied') return { kind: 'denied', entry: hit };
    if (hit) return { kind: 'pending', entry: hit, fresh: false };
    if (this.entries.filter((e) => e.state === 'pending' && e.agent_id === call.agentId).length >= MAX_PENDING_PER_AGENT) {
      return { kind: 'full' };
    }
    const t = this.now();
    const entry: ApprovalEntry = {
      id: 'ap-' + randomBytes(6).toString('hex'),
      key,
      agent_id: call.agentId,
      rule_id: call.ruleId,
      reason: call.reason ?? '',
      tool: call.tool,
      call: callText(call.input),
      cwd: call.cwd ?? null,
      state: 'pending',
      asked_at: iso(t),
      expires_at: iso(t + REQUEST_TTL_MS),
    };
    this.entries.push(entry);
    this.save();
    return { kind: 'pending', entry, fresh: true };
  }

  /** The open requests, oldest first: the one that has waited longest comes first. */
  pending(): ApprovalEntry[] {
    return this.entries.filter((e) => e.state === 'pending' && at(e.expires_at) > this.now())
      .sort((a, b) => a.asked_at.localeCompare(b.asked_at)).map((e) => ({ ...e }));
  }

  /** The operator's Approve or Deny of an open request. Null for an id that is not
   *  an open request (unknown, made up, already decided or expired). */
  decide(id: unknown, approve: boolean): ApprovalEntry | null {
    if (typeof id !== 'string') return null;
    this.sweep();
    const e = this.entries.find((x) => x.id === id && x.state === 'pending');
    if (!e) return null;
    const t = this.now();
    e.state = approve === true ? 'approved' : 'denied';
    e.decided_at = iso(t);
    e.expires_at = iso(t + (e.state === 'approved' ? GRANT_TTL_MS : DENY_HOLD_MS));
    this.save();
    return { ...e };
  }
}
