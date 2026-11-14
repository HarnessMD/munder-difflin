/**
 * Validation for the god-writable `HIVE_ROOT/agent-ops/` queue.
 *
 * The orchestrator runs lifecycle ops (kill/reset/restore/create) by writing
 * ONE JSON file per op; main validates, executes, and archives it. This module
 * is PURE (no fs, no config, no catalog): every context it needs — live and
 * archived ids, the fleet count, known providers — arrives as arguments, so it
 * is unit-testable without Electron. IO and catalog membership live in the
 * main-side handler (Task 2/3), never here.
 *
 * Why so strict for our own orchestrator: a request file is reachable by
 * anything that can write the hive dir (a compromised worker, a bad paste),
 * and three of the four ops destroy or spend. Validation is the same posture
 * as `processSpawnRequest`: fail closed, with a reason, never a throw.
 */

/** Lifecycle ops god may request. `create` builds a full agent; the rest act
 *  on an existing id. Workers keep using `spawn-requests/` (unchanged). */
export type AgentOpKind = 'kill' | 'reset' | 'restore' | 'create';

export interface AgentOpSpec {
  role: string;
  cwd: string;
  provider: string;
  model: string;
  tokenCap: number;
  name?: string;
}

export interface AgentOpRequest {
  op: AgentOpKind;
  /** Target agent id (kill/reset/restore). Sanitized, matched exactly. */
  id: string | null;
  /** Full spec (create only). Presence-checked here, catalog-checked in main. */
  params: AgentOpSpec | null;
  /** Why — mandatory. Whoever spends must justify; the human audits the log. */
  reason: string;
}

export interface AgentOpContext {
  /** The god's own id: killing it is always refused. */
  godId: string | null;
  /** Live agent ids (floor). */
  liveIds: string[];
  /** Archived agent ids (restorable). */
  archivedIds: string[];
  /** Live NON-worker agents (fleet cap denominator for create). */
  liveNonWorkers: number;
  /** Max live non-worker agents the create op tolerates. */
  maxLiveNonWorkers: number;
}

/** Fleet cap for god-created full agents (human-approved default). */
export const MAX_LIVE_NON_WORKERS = 6;

const ID_RULE = /^[A-Za-z0-9._-]{1,128}$/;

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

/** An id is usable only verbatim: unlike worker reqIds we never rewrite it,
 *  because a rewritten id would restore/kill/reset the WRONG agent. */
export function sanitizeAgentId(id: unknown): string | null {
  if (typeof id !== 'string') return null;
  const t = id.trim();
  return ID_RULE.test(t) ? t : null;
}

function nonEmptyString(v: unknown, maxLen: number): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!t || t.length > maxLen) return null;
  return t;
}

export type AgentOpValidation =
  | { ok: true; value: AgentOpRequest }
  | { ok: false; error: string };

/**
 * Validate one raw request file body against the ops contract.
 * Pure: context (live/archived/cap) arrives via `ctx`, never globals.
 */
export function validateAgentOp(raw: unknown, ctx: AgentOpContext): AgentOpValidation {
  if (!isRecord(raw)) return { ok: false, error: 'request must be a JSON object' };
  const op = raw.op;
  if (op !== 'kill' && op !== 'reset' && op !== 'restore' && op !== 'create') {
    return { ok: false, error: 'unknown "op" (want kill|reset|restore|create)' };
  }
  const reason = nonEmptyString(raw.reason, 500);
  if (!reason) return { ok: false, error: 'missing "reason" (whoever spends must justify)' };

  if (op === 'create') {
    if (!isRecord(raw.params)) return { ok: false, error: 'create needs "params" {role,cwd,provider,model,tokenCap}' };
    const p = raw.params;
    const role = nonEmptyString(p.role, 2000);
    const cwd = nonEmptyString(p.cwd, 1024);
    const provider = nonEmptyString(p.provider, 64);
    const model = nonEmptyString(p.model, 256);
    if (!role || !cwd || !provider || !model) {
      return { ok: false, error: 'create params need non-empty role/cwd/provider/model' };
    }
    const tokenCap = p.tokenCap;
    // Integer: main persists it via setAgentTokenCap, which throws otherwise.
    if (typeof tokenCap !== 'number' || !Number.isInteger(tokenCap) || tokenCap <= 0) {
      return { ok: false, error: 'create needs a positive integer tokenCap (the fleet cap is mandatory)' };
    }
    if (ctx.liveNonWorkers >= ctx.maxLiveNonWorkers) {
      return { ok: false, error: `fleet cap reached (${ctx.liveNonWorkers}/${ctx.maxLiveNonWorkers} live non-workers)` };
    }
    const name = p.name === undefined ? undefined : nonEmptyString(p.name, 64);
    if (p.name !== undefined && !name) return { ok: false, error: '"name" must be a non-empty string when given' };
    return { ok: true, value: { op, id: null, params: { role, cwd, provider, model, tokenCap, ...(name ? { name } : {}) }, reason } };
  }

  const id = sanitizeAgentId(raw.id);
  if (!id) return { ok: false, error: 'missing or invalid "id" (verbatim match only, never rewritten)' };
  if (op === 'kill' && ctx.godId && id === ctx.godId) {
    return { ok: false, error: 'refusing to kill the god agent' };
  }
  if (op === 'restore' && !ctx.archivedIds.includes(id)) {
    return { ok: false, error: `"${id}" is not archived (nothing to restore)` };
  }
  if ((op === 'kill' || op === 'reset') && !ctx.liveIds.includes(id)) {
    return { ok: false, error: `"${id}" is not live (nothing to ${op})` };
  }
  return { ok: true, value: { op, id, params: null, reason } };
}
