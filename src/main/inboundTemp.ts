/**
 * An inbound message becomes a temp (0.5.6, founder 10 Oct 2026: "it's a go
 * for the temp change").
 *
 * A receiver setting may now be `temp` or `temp:<agent id>` (shared/responder).
 * When it is, the channel that took the message does not mail an agent: it
 * calls queueInboundTemp, which writes one spawn request into
 * HIVE_ROOT/spawn-requests, the queue the orchestrator uses when it hires a
 * temp, and the watcher (index.ts processSpawnRequest) does the rest. Two
 * channels come through here: a webhook call and a scheduled mission. Slack
 * keeps its own handler (slackInbound.ts), because a follow up in a live
 * thread goes to the temp that owns the thread.
 *
 * The temp's job is the subject and the body an agent would have been sent,
 * so whatever the body says about answering (the card to close, the address
 * to write to) reaches the temp word for word. The same two travel in the
 * request as `fallback`: what the orchestrator is sent when no temp slot frees
 * in time (shared/responder INBOUND_TEMP_WAIT_MS).
 *
 * Dependencies are injected: no electron import and no hive instance, so a
 * test can drive it on a temp directory.
 */
import { existsSync, mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export type InboundSource = 'slack' | 'webhook' | 'mission';

export interface InboundTempArgs {
  source: InboundSource;
  /** One id per message. It becomes the request id and the temp's id. */
  id: string;
  /** The subject an agent would have been sent. */
  title: string;
  /** The body an agent would have been sent. */
  message: string;
  /** The agent to clone, already resolved against the agents that may be
   *  cloned (shared/responder resolveReceiver). Absent: a plain temp. */
  cloneOf?: string;
  slack?: { channel: string; thread_ts: string };
  /** The card the channel made for this message, when it makes one. */
  taskId?: string;
}

export interface InboundTempDeps {
  /** HIVE_ROOT/spawn-requests; created when missing. Null when no hive. */
  spawnRequestsDir: () => string | null;
  /** The folder the temp opens: the source agent's for a clone. */
  tempCwd: (cloneOf?: string) => string;
  now?: () => number;
}

/** The spawn request written for an inbound message. `origin` lets the
 *  watcher run it while the orchestrator's own spawning is switched off: the
 *  person chose a temp as the receiver. */
export interface InboundSpawnRequest {
  id: string;
  origin: 'inbound';
  source: InboundSource;
  objective: string;
  cwd: string;
  /** The watcher names a clone after the agent it copies; this is the name
   *  when there is no clone, or the agent is gone by the time it starts. */
  name: string;
  cloneOf?: string;
  slack?: { channel: string; thread_ts: string };
  taskId?: string;
  /** What the orchestrator is sent when no temp slot frees in time. */
  fallback: { subject: string; body: string };
  isolate: true;
  queuedAt: string;
}

const WORKER_PREFIX = 'worker-';
const NAME_MAX = 28;
const ID_MAX = 64;

const LABEL: Record<InboundSource, string> = {
  slack: 'Slack',
  webhook: 'Webhook',
  mission: 'Mission'
};

/** 'webhook-3f9a…' for a webhook call. The watcher keeps only [A-Za-z0-9._-]
 *  in an id, so anything else is folded to a dash here as well and the temp's
 *  id is exactly `worker-` plus this. An id that already starts with its
 *  source (a webhook card id does) is not given the prefix twice. */
export function inboundRequestId(source: InboundSource, id: string): string {
  const safe = String(id ?? '').trim().replace(/[^A-Za-z0-9_-]/g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '');
  const full = safe.startsWith(`${source}-`) ? safe : `${source}-${safe || 'unknown'}`;
  return full.slice(0, ID_MAX).replace(/-$/, '');
}

export function inboundWorkerId(requestId: string): string {
  return `${WORKER_PREFIX}${requestId}`;
}

/** 'Webhook: first words', at most 28 characters, no trailing punctuation:
 *  the shape of a Slack temp's name (slackInbound.ts slackTempName). A [tag]
 *  at the front of the subject is dropped, the source already says it. */
export function inboundTempName(source: InboundSource, title: string): string {
  const label = LABEL[source];
  const words = String(title ?? '').replace(/^\s*\[[^\]]*\]\s*/, '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  let out = `${label}:`;
  for (const w of words) {
    if (`${out} ${w}`.length > NAME_MAX) break;
    out = `${out} ${w}`;
  }
  // The first word alone did not fit: cut it rather than answer a bare label.
  if (out === `${label}:` && words.length > 0) out = `${label}: ${words[0]}`.slice(0, NAME_MAX);
  return out.replace(/[\s.,;:!?…]+$/g, '');
}

/** The subject, a blank line, then the body: what an agent reads in a wake.
 *  A body that already opens with its subject is not given it twice. */
export function inboundJob(title: string, message: string): string {
  const subject = String(title ?? '').trim();
  const body = String(message ?? '').trim();
  if (!subject || body.startsWith(subject)) return body || subject;
  return body ? `${subject}\n\n${body}` : subject;
}

/** Queued, running or finished: the watcher archives a processed request
 *  under .done or .failed. */
function requestExists(dir: string, requestId: string): boolean {
  const file = `${requestId}.json`;
  return existsSync(join(dir, file)) || existsSync(join(dir, '.done', file)) || existsSync(join(dir, '.failed', file));
}

/**
 * Queue a temp for one inbound message. Throws when it cannot (no hive, an
 * id already used, nothing to hand over), and the caller then sends the
 * message to the orchestrator: an inbound message is never lost.
 */
export function queueInboundTemp(args: InboundTempArgs, deps: InboundTempDeps): { requestId: string; workerId: string } {
  const now = deps.now ?? (() => Date.now());
  const title = String(args.title ?? '').trim();
  const message = String(args.message ?? '').trim();
  const objective = inboundJob(title, message);
  if (!objective) throw new Error('nothing to hand a temp: the message has no subject and no body');

  const requestId = inboundRequestId(args.source, args.id);
  const workerId = inboundWorkerId(requestId);
  const dir = deps.spawnRequestsDir();
  if (!dir) throw new Error('no hive root: the temp has nowhere to be queued');
  mkdirSync(dir, { recursive: true });
  // Never over a request that is queued or was run: that would lose the first
  // message, or start a temp under the id of one that already ran.
  if (requestExists(dir, requestId)) throw new Error(`id already used: ${requestId}`);

  const cloneOf = typeof args.cloneOf === 'string' && args.cloneOf.trim() ? args.cloneOf.trim() : undefined;
  const request: InboundSpawnRequest = {
    id: requestId,
    origin: 'inbound',
    source: args.source,
    objective,
    cwd: deps.tempCwd(cloneOf),
    name: inboundTempName(args.source, title || message),
    ...(cloneOf ? { cloneOf } : {}),
    ...(args.slack ? { slack: { channel: args.slack.channel, thread_ts: args.slack.thread_ts } } : {}),
    ...(args.taskId ? { taskId: args.taskId } : {}),
    fallback: { subject: title, body: message },
    isolate: true,
    queuedAt: new Date(now()).toISOString()
  };
  // Temp name then rename, as Slack does: the watcher polls this directory
  // every 1.5 s and reads any `.json` it finds, so a half written file would
  // be a parse failure that archives the request as failed.
  const file = join(dir, `${requestId}.json`);
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(request, null, 2), 'utf8');
  renameSync(tmp, file);
  return { requestId, workerId };
}
