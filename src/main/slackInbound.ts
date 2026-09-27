/**
 * A Slack message becomes a temp (0.4.11, founder 6 Sep 2026: "Make sure that
 * we use our workers or temps for the slack integration").
 *
 * Until this release every accepted Slack message went into Michael's queue
 * and waited for him to triage it. Now the handler here writes a spawn request
 * straight into HIVE_ROOT/spawn-requests, the same queue Michael uses when he
 * hires a temp, and the existing watcher (index.ts processSpawnRequest) does
 * the rest: worktree, concurrency cap, idle reap, the Temps screen, the in
 * thread reply through the bundled helper. Michael is informed, not asked.
 *
 * Every transport (polling, socket, webhook) hands its verified, de mentioned,
 * downloaded message to handleInboundSlack, so the three cannot differ in what
 * happens next. Dependencies are injected: no electron import, no direct hive
 * instance, so test/slack-inbound.test.cjs drives it on a temp directory.
 */
import { existsSync, mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { MessageAct } from './hive';

export interface SlackInbound {
  text: string;
  channel: string;
  ts: string;
  thread_ts: string;
  /** LOCAL paths, already downloaded by main. */
  files?: { path: string; name: string; mimetype: string }[];
}

export interface SlackThreadRow { user?: string; text: string; ts: string }

export interface SlackInboundDeps {
  /** HIVE_ROOT/spawn-requests; created when missing. Null when no hive. */
  spawnRequestsDir: () => string | null;
  /** The live temp that owns this thread (its worker id), if any. */
  liveThreadOwner: (thread_ts: string) => string | undefined;
  /** The thread's messages so far, oldest first. May resolve []. */
  threadSoFar: (channel: string, thread_ts: string) => Promise<SlackThreadRow[]>;
  /** The folder the temp opens, already resolved. */
  tempCwd: () => string;
  /** The exact helper command line a temp runs to answer in this thread. */
  replyCommand: (channel: string, thread_ts: string) => string;
  hive: {
    // `act` is the hive's own union so the real HiveManager.send satisfies this
    // shape without a cast (the unit tests pass a plain recorder).
    send(msg: { to: string; act: MessageAct; subject: string; body: string; conversation?: string; requires_reply?: boolean }, from: string): void;
    addTask(t: unknown): boolean;
    patchTask(id: string, patch: unknown): boolean;
  };
  /** The "received" post into the thread. The caller gates it; absent = no post. */
  ack?: (m: SlackInbound) => Promise<void>;
  informGod: (subject: string, body: string, slack?: { channel: string; thread_ts: string }) => void;
  now?: () => number;
}

export interface SlackInboundOutcome {
  action: 'spawned' | 'forwarded';
  workerId: string;
  requestId?: string;
  taskId: string;
}

/** The spawn request written for a Slack message. `origin` is what lets the
 *  watcher run it even while Michael's own spawning is switched off: turning
 *  Slack on is the person's consent for this spend. */
export interface SlackSpawnRequest {
  id: string;
  origin: 'slack';
  objective: string;
  cwd: string;
  name: string;
  slack: { channel: string; thread_ts: string };
  isolate: true;
}

const WORKER_PREFIX = 'worker-';
const REQUEST_PREFIX = 'slack-';
const NAME_MAX = 28;
const TITLE_MAX = 80;
const THREAD_ROWS_MAX = 30;
const THREAD_TEXT_MAX = 500;

/** '1700000000.000100' becomes 'slack-1700000000-000100'. The watcher keeps
 *  only [A-Za-z0-9._-] in an id, so anything else is folded to a dash here as
 *  well and the worker id is exactly `worker-` plus this. */
export function slackRequestId(ts: string): string {
  const safe = String(ts ?? '').trim().replace(/\./g, '-').replace(/[^A-Za-z0-9_-]/g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '');
  return `${REQUEST_PREFIX}${safe || 'unknown'}`;
}

export function slackWorkerId(requestId: string): string {
  return `${WORKER_PREFIX}${requestId}`;
}

/** The kanban card for a request. Derivable from the worker id alone, which is
 *  all the watcher has when a temp finishes or is reaped. */
export function slackTaskId(requestId: string): string {
  return `task-${requestId}`;
}

/** The request id behind a Slack temp's worker id, or null for any other agent. */
export function slackRequestIdOfWorker(workerId: string): string | null {
  const prefix = `${WORKER_PREFIX}${REQUEST_PREFIX}`;
  return workerId.startsWith(prefix) ? workerId.slice(WORKER_PREFIX.length) : null;
}

/** Slack markup out of a line: user and channel mentions dropped, links
 *  reduced to their label or address. */
function plainText(text: string): string {
  return String(text ?? '')
    .replace(/<@[^>]+>/g, '')
    .replace(/<#[^|>]+\|([^>]*)>/g, '#$1')
    .replace(/<#[^>]+>/g, '')
    .replace(/<([^|>]+)\|([^>]*)>/g, '$2')
    .replace(/<([^>]+)>/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 'Slack: first words', at most 28 characters, no trailing punctuation. The
 *  name is what the sidebar and the Temps screen show, so it says what the
 *  temp is for rather than which message it came from. */
export function slackTempName(text: string): string {
  const words = plainText(text).split(' ').filter(Boolean);
  if (words.length === 0) return 'Slack: attachment';
  let out = 'Slack:';
  for (const w of words) {
    if (`${out} ${w}`.length > NAME_MAX) break;
    out = `${out} ${w}`;
  }
  // The first word alone did not fit: cut it rather than answer a bare label.
  if (out === 'Slack:') out = `Slack: ${words[0]}`.slice(0, NAME_MAX);
  const trimmed = out.replace(/[\s.,;:!?…]+$/g, '');
  return trimmed === 'Slack' ? 'Slack: attachment' : trimmed;
}

function firstLine(text: string): string {
  const line = plainText(text.split('\n')[0] ?? '');
  return line.length > TITLE_MAX ? `${line.slice(0, TITLE_MAX - 1).trimEnd()}…` : line;
}

function attachmentLines(files: SlackInbound['files']): string {
  if (!files || files.length === 0) return '';
  return `Attached files:\n${files.map((f) => `${f.path} (${f.name})`).join('\n')}`;
}

/** The "Thread so far:" block a follow up temp reads when the temp that first
 *  handled the thread is gone. Oldest first, the last 30 rows, each text cut
 *  at 500 characters so one long paste cannot crowd out the request. */
export function threadSoFarLines(rows: SlackThreadRow[]): string {
  const kept = rows.slice(-THREAD_ROWS_MAX);
  if (kept.length === 0) return '';
  const lines = kept.map((r) => {
    const who = r.user ? `user ${r.user}` : 'someone';
    const text = plainText(r.text);
    const cut = text.length > THREAD_TEXT_MAX ? `${text.slice(0, THREAD_TEXT_MAX)}…` : text;
    return `[${r.ts}] ${who}: ${cut}`;
  });
  return `Thread so far:\n${lines.join('\n')}`;
}

/** Already queued, running or finished: the watcher archives a processed
 *  request under .done or .failed, and a resend of the same message (Slack
 *  retries, a mode switch) must not start a second temp. */
function requestExists(dir: string, requestId: string): boolean {
  const file = `${requestId}.json`;
  return existsSync(join(dir, file)) || existsSync(join(dir, '.done', file)) || existsSync(join(dir, '.failed', file));
}

export async function handleInboundSlack(m: SlackInbound, deps: SlackInboundDeps): Promise<SlackInboundOutcome> {
  const now = deps.now ?? (() => Date.now());
  const slack = { channel: m.channel, thread_ts: m.thread_ts };
  const text = String(m.text ?? '').trim();
  const files = attachmentLines(m.files);
  const reply = deps.replyCommand(m.channel, m.thread_ts);

  // A follow up in a thread whose temp is still alive goes to that temp's
  // inbox: it has the context, and a second temp on the same thread would
  // answer twice. The inbox wake watchdog nudges it if it is idle.
  const owner = deps.liveThreadOwner(m.thread_ts);
  if (owner) {
    const body = [
      text,
      files,
      `This is a follow up in the Slack thread you are handling. When you have the answer, post it into the thread with exactly:\n${reply}`
    ].filter(Boolean).join('\n\n');
    deps.hive.send({ to: owner, act: 'request', conversation: owner, subject: 'Slack follow up', body, requires_reply: false }, 'slack');
    if (deps.ack) { try { await deps.ack(m); } catch { /* the post is best effort */ } }
    const requestId = slackRequestIdOfWorker(owner) ?? owner;
    return { action: 'forwarded', workerId: owner, taskId: slackTaskId(requestId) };
  }

  const requestId = slackRequestId(m.ts);
  const workerId = slackWorkerId(requestId);
  const taskId = slackTaskId(requestId);
  const dir = deps.spawnRequestsDir();
  if (!dir) throw new Error('no hive root: the Slack temp has nowhere to be queued');
  mkdirSync(dir, { recursive: true });
  if (requestExists(dir, requestId)) return { action: 'spawned', workerId, requestId, taskId };

  // A follow up whose temp is gone starts a new temp with the thread so far,
  // minus the message that is the request itself. A top level message has no
  // earlier rows, so Slack is not asked.
  let earlier: SlackThreadRow[] = [];
  if (m.thread_ts && m.thread_ts !== m.ts) {
    try { earlier = (await deps.threadSoFar(m.channel, m.thread_ts)).filter((r) => r.ts !== m.ts); }
    catch { earlier = []; }
  }
  const objective = [text, files, threadSoFarLines(earlier)].filter(Boolean).join('\n\n');
  const request: SlackSpawnRequest = {
    id: requestId,
    origin: 'slack',
    objective,
    cwd: deps.tempCwd(),
    name: slackTempName(text),
    slack,
    isolate: true
  };
  // Temp name then rename: the watcher polls this directory every 1.5 s and
  // reads any `.json` it finds, so a half written file would be a parse
  // failure that informs god and archives the request as failed.
  const file = join(dir, `${requestId}.json`);
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(request, null, 2), 'utf8');
  renameSync(tmp, file);

  const createdAt = new Date(now()).toISOString();
  const title = firstLine(text) || request.name;
  try {
    deps.hive.addTask({
      id: taskId,
      title,
      description: objective,
      assignee: workerId,
      status: 'doing',
      dependsOn: [],
      priority: 1,
      createdAt,
      slack
    });
  } catch { /* the card is bookkeeping; the temp still runs */ }

  if (deps.ack) { try { await deps.ack(m); } catch { /* the post is best effort */ } }

  deps.informGod(
    `[slack] temp ${workerId} is handling thread ${m.thread_ts}`,
    `A Slack message in ${m.channel} (thread ${m.thread_ts}) was handed to the temp ${workerId}; card ${taskId} tracks it. You are informed, not asked: the temp reads the memory index and the matching memories itself, replies in the thread itself, and reports to you when done. Step in through its inbox only if you must.\n\nThe request: ${title}`,
    slack
  );
  return { action: 'spawned', workerId, requestId, taskId };
}

/** The card follows the temp: done with its summary as the result the done
 *  poster may relay, or blocked with the reason when it was reaped or failed.
 *  False when the worker is not a Slack temp or the card is gone. */
export function onTempFinished(
  workerId: string,
  outcome: { ok: true; body: string } | { ok: false; reason: string },
  deps: Pick<SlackInboundDeps, 'hive' | 'now'>
): boolean {
  const requestId = slackRequestIdOfWorker(workerId);
  if (!requestId) return false;
  const taskId = slackTaskId(requestId);
  const at = new Date((deps.now ?? (() => Date.now()))()).toISOString();
  const patch = outcome.ok
    ? { status: 'done', result: outcome.body.trim() || undefined, doneAt: at, updatedAt: at }
    : { status: 'blocked', result: `The temp ended before it finished: ${outcome.reason.trim() || 'no reason given'}`, updatedAt: at };
  try { return deps.hive.patchTask(taskId, patch); }
  catch { return false; }
}
