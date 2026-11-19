'use strict';

// Pure core of the Slack polling transport (0.4.11, founder 6 Sep 2026:
// "instead of relying on webhooks they can just rely on polling every minute").
// Plain CommonJS with no I/O, like slack-trigger.cjs, so test/slack-poll.test.cjs
// can require() it directly. slackPoller.ts and slackSocket.ts do the network
// and the timers; everything they decide is decided here:
//
//   1. the saved state (channel, cursor, hot threads, bot user id) and its
//     (de)serialisation, with a channel change resetting the cursor,
//   2. cursor advance: Slack returns newest first, the office processes oldest
//     first and remembers the newest ts it has seen,
//   3. hot thread selection: threads the bot was mentioned in with activity in
//     the last 24 hours, at most `budget` per tick, oldest checked first so no
//     thread starves,
//   4. 429 backoff: honour Retry-After, halve the thread budget to a floor of 1,
//     double the interval for that cycle up to 10 minutes, ten clean ticks
//     restore both,
//   5. terminal errors that stop the loop rather than retry,
//   6. the Socket Mode frame parser (hello, disconnect, events_api envelope).

/** A thread is hot for this long after its last activity. Older threads go
 *  cold and need a fresh mention; polling every cold thread forever would
 *  spend the whole rate budget on silence. */
const HOT_THREAD_MS = 24 * 60 * 60 * 1000;
/** Thread replies calls per tick before backoff. Internal apps get 50 or more
 *  calls a minute, so 10 plus one history call sits far under it. */
const DEFAULT_BUDGET = 10;
/** The interval never doubles past this. */
const MAX_INTERVAL_MS = 10 * 60 * 1000;
/** Clean ticks in a row before the budget and the interval are restored. */
const CLEAN_TICKS_TO_RESTORE = 10;
/** Messages asked for per history call. Slack's default is 100, the cap 999;
 *  200 covers a busy hour without paging. */
const HISTORY_LIMIT = 200;
/** Replies asked for per thread call. */
const REPLIES_LIMIT = 100;
/** Slack errors that will not go away by retrying: the person has to fix the
 *  app, the token or the channel. The loop stops and shows the error verbatim. */
const TERMINAL_ERRORS = new Set([
  'invalid_auth', 'not_in_channel', 'missing_scope', 'channel_not_found',
  'account_inactive', 'token_revoked', 'token_expired', 'not_authed', 'no_permission'
]);
const STATE_VERSION = 1;

/** Slack ts strings ("1700000000.000100") compared without going through a
 *  double: sixteen significant digits is past what a double keeps exactly,
 *  so two replies a microsecond apart could otherwise compare equal. */
function compareTs(a, b) {
  const [ai, af = ''] = String(a).split('.');
  const [bi, bf = ''] = String(b).split('.');
  if (ai.length !== bi.length) return ai.length < bi.length ? -1 : 1;
  if (ai !== bi) return ai < bi ? -1 : 1;
  const width = Math.max(af.length, bf.length);
  const ap = af.padEnd(width, '0');
  const bp = bf.padEnd(width, '0');
  if (ap === bp) return 0;
  return ap < bp ? -1 : 1;
}

/** Epoch milliseconds to a Slack ts string. */
function tsFromMs(ms) {
  const s = Math.floor(ms / 1000);
  const micros = Math.floor((ms - s * 1000) * 1000);
  return `${s}.${String(micros).padStart(6, '0')}`;
}

/** A Slack ts string to epoch milliseconds (for the hot window only; the
 *  cursor itself never goes through this). */
function msFromTs(ts) {
  const n = Number(ts);
  return Number.isFinite(n) ? Math.floor(n * 1000) : 0;
}

/** A fresh state: the cursor is now, so a first run never replays history. */
function createState(channel, nowMs) {
  return { version: STATE_VERSION, channel, cursor: tsFromMs(nowMs), threads: {}, botUserId: null };
}

/** Parse a saved state (string or object). Anything unusable, or a state for
 *  another channel, reads as a fresh state: changing the channel resets the
 *  cursor on purpose, and a corrupt file must never replay or crash. */
function loadState(raw, channel, nowMs) {
  let obj = raw;
  if (typeof raw === 'string') {
    try { obj = JSON.parse(raw); } catch { obj = null; }
  }
  if (!obj || typeof obj !== 'object' || obj.channel !== channel || typeof obj.cursor !== 'string') {
    return createState(channel, nowMs);
  }
  const state = createState(channel, nowMs);
  state.cursor = obj.cursor;
  state.botUserId = typeof obj.botUserId === 'string' ? obj.botUserId : null;
  const threads = obj.threads && typeof obj.threads === 'object' ? obj.threads : {};
  for (const [thread, t] of Object.entries(threads)) {
    if (!t || typeof t !== 'object' || typeof t.lastReplyTs !== 'string') continue;
    state.threads[thread] = {
      lastReplyTs: t.lastReplyTs,
      activatedAt: Number.isFinite(t.activatedAt) ? t.activatedAt : nowMs,
      lastActivityAt: Number.isFinite(t.lastActivityAt) ? t.lastActivityAt : nowMs,
      lastCheckedAt: Number.isFinite(t.lastCheckedAt) ? t.lastCheckedAt : 0
    };
  }
  return state;
}

function serializeState(state) {
  return JSON.stringify({
    version: STATE_VERSION, channel: state.channel, cursor: state.cursor,
    threads: state.threads, botUserId: state.botUserId
  }, null, 2);
}

/** Slack answers newest first; the office delivers oldest first so a thread
 *  of asks lands in the order the person wrote them. Messages without a ts
 *  are dropped: nothing can be keyed or cursored on them. */
function sortOldestFirst(messages) {
  return (Array.isArray(messages) ? messages : [])
    .filter((m) => m && typeof m.ts === 'string' && m.ts)
    .slice()
    .sort((a, b) => compareTs(a.ts, b.ts));
}

/** Move the cursor to the newest ts among `messages`; never backwards. */
function advanceCursor(state, messages) {
  for (const m of sortOldestFirst(messages)) {
    if (compareTs(m.ts, state.cursor) > 0) state.cursor = m.ts;
  }
  return state.cursor;
}

/** Only messages strictly after the cursor count. Slack's `oldest` is meant
 *  to be exclusive, but a message at exactly the cursor has been seen. */
function afterCursor(state, messages) {
  return sortOldestFirst(messages).filter((m) => compareTs(m.ts, state.cursor) > 0);
}

/** Record activity in a thread. `mentioned` marks the thread as one the bot
 *  answers in (its parent was a mention). `ts` is the newest message seen in
 *  it, so the next replies call asks only for what came after. */
function noteThreadActivity(state, threadTs, ts, nowMs, opts = {}) {
  if (!threadTs) return;
  const t = state.threads[threadTs] || { lastReplyTs: threadTs, activatedAt: 0, lastActivityAt: 0, lastCheckedAt: 0 };
  if (opts.mentioned && !t.activatedAt) t.activatedAt = nowMs;
  if (ts && compareTs(ts, t.lastReplyTs) > 0) t.lastReplyTs = ts;
  const at = ts ? Math.max(msFromTs(ts), t.lastActivityAt) : t.lastActivityAt;
  t.lastActivityAt = Math.max(at, opts.mentioned ? nowMs : 0, t.lastActivityAt);
  state.threads[threadTs] = t;
}

function noteThreadChecked(state, threadTs, nowMs) {
  const t = state.threads[threadTs];
  if (t) t.lastCheckedAt = nowMs;
}

/** The threads to ask about this tick: mentioned, active in the last 24 h,
 *  the least recently checked first, at most `budget`. */
function hotThreads(state, nowMs, budget = DEFAULT_BUDGET) {
  return Object.entries(state.threads)
    .filter(([, t]) => t.activatedAt > 0 && nowMs - t.lastActivityAt <= HOT_THREAD_MS)
    .sort((a, b) => a[1].lastCheckedAt - b[1].lastCheckedAt || compareTs(a[0], b[0]))
    .slice(0, Math.max(0, budget))
    .map(([thread]) => thread);
}

/** Forget threads cold for a week; the state file must not grow forever. */
function pruneThreads(state, nowMs) {
  for (const [thread, t] of Object.entries(state.threads)) {
    if (nowMs - t.lastActivityAt > 7 * HOT_THREAD_MS) delete state.threads[thread];
  }
}

/** The threads that are currently hot, for the status line. */
function hotThreadCount(state, nowMs) {
  return hotThreads(state, nowMs, Number.MAX_SAFE_INTEGER).length;
}

// ─── Backoff ──────────────────────────────────────────────────────────────────

function createBackoff() {
  return { budget: DEFAULT_BUDGET, factor: 1, cleanTicks: 0, retryAfterMs: 0 };
}

/** A 429: the next tick waits at least Retry-After, the thread budget halves
 *  (floor 1) and the interval doubles for the coming cycle. */
function onRateLimited(b, retryAfterMs) {
  b.budget = Math.max(1, Math.floor(b.budget / 2));
  b.factor = b.factor * 2;
  b.cleanTicks = 0;
  b.retryAfterMs = Number.isFinite(retryAfterMs) && retryAfterMs > 0 ? retryAfterMs : 0;
  return b;
}

/** A tick with no 429. Ten in a row restore the budget and the interval. */
function onCleanTick(b) {
  b.retryAfterMs = 0;
  b.cleanTicks += 1;
  if (b.cleanTicks >= CLEAN_TICKS_TO_RESTORE) {
    b.budget = DEFAULT_BUDGET;
    b.factor = 1;
    b.cleanTicks = 0;
  }
  return b;
}

/** How long to wait before the next tick: the doubled interval capped at 10
 *  minutes, and never less than Slack's Retry-After. */
function nextDelayMs(b, baseIntervalMs) {
  const doubled = Math.min(baseIntervalMs * b.factor, MAX_INTERVAL_MS);
  return Math.max(doubled, b.retryAfterMs || 0);
}

function isTerminalError(error) {
  return typeof error === 'string' && TERMINAL_ERRORS.has(error);
}

/** Retry-After is seconds; a missing or bad header reads as one minute. */
function retryAfterFromHeader(value) {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return Number.isFinite(n) && n > 0 ? Math.ceil(n * 1000) : 60_000;
}

// ─── Socket Mode frames ────────────────────────────────────────────────────────

/** Classify one Socket Mode frame. Returns `{ kind: 'invalid' }` for anything
 *  that is not JSON or not an object, so a bad frame is ignored, never thrown. */
function parseSocketFrame(raw) {
  let obj;
  try {
    obj = typeof raw === 'string' ? JSON.parse(raw) : JSON.parse(String(raw));
  } catch { return { kind: 'invalid' }; }
  if (!obj || typeof obj !== 'object') return { kind: 'invalid' };
  if (obj.type === 'hello') {
    const secs = obj.debug_info && Number(obj.debug_info.approximate_connection_time);
    return { kind: 'hello', approxLifetimeMs: Number.isFinite(secs) && secs > 0 ? secs * 1000 : undefined };
  }
  if (obj.type === 'disconnect') {
    return { kind: 'disconnect', reason: typeof obj.reason === 'string' ? obj.reason : 'unknown' };
  }
  if (typeof obj.envelope_id === 'string' && obj.envelope_id) {
    const payload = obj.payload && typeof obj.payload === 'object' ? obj.payload : {};
    return {
      kind: obj.type === 'events_api' ? 'event' : 'other',
      envelopeId: obj.envelope_id,
      retryAttempt: Number.isFinite(obj.retry_attempt) ? obj.retry_attempt : 0,
      payloadType: typeof payload.type === 'string' ? payload.type : undefined,
      event: payload.event && typeof payload.event === 'object' ? payload.event : undefined,
      authorizations: Array.isArray(payload.authorizations) ? payload.authorizations : undefined
    };
  }
  return { kind: 'other' };
}

/** History and replies messages come without `channel`; the trigger filter
 *  and the dedup key need it. Never mutates Slack's object. */
function withChannel(message, channel) {
  return message && typeof message === 'object' && !message.channel ? { ...message, channel } : message;
}

/** A mention of the bot, the way slack-trigger.cjs sees it. */
function mentionsBot(ev, botUserId) {
  if (!ev) return false;
  if (ev.type === 'app_mention') return true;
  return !!botUserId && typeof ev.text === 'string' && ev.text.includes(`<@${botUserId}>`);
}

module.exports = {
  HOT_THREAD_MS, DEFAULT_BUDGET, MAX_INTERVAL_MS, CLEAN_TICKS_TO_RESTORE, HISTORY_LIMIT, REPLIES_LIMIT, TERMINAL_ERRORS, STATE_VERSION,
  compareTs, tsFromMs, msFromTs,
  createState, loadState, serializeState,
  sortOldestFirst, advanceCursor, afterCursor,
  noteThreadActivity, noteThreadChecked, hotThreads, hotThreadCount, pruneThreads,
  createBackoff, onRateLimited, onCleanTick, nextDelayMs, isTerminalError, retryAfterFromHeader,
  parseSocketFrame, withChannel, mentionsBot
};
