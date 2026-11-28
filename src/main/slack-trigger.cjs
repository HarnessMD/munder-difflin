'use strict';

// Pure trigger-decision logic for the Slack mention filter.
// Extracted as plain CommonJS so test/slack.test.cjs can require() it directly
// without a TypeScript compile step — same pattern as compact-gate.cjs.
//
// Responsibilities:
//   - isMention: ev.type==='app_mention' OR text includes <@botUserId>
//   - activatedThreads: bounded FIFO set of thread roots where the bot was mentioned
//   - shouldTrigger: combines channel filter, self-loop safety, mention/thread check

/** Maximum number of thread roots to remember. FIFO eviction above this limit
 *  prevents unbounded memory growth in long-running bots. */
const ACTIVATED_THREADS_MAX = 500;
/** Per-message file cap — any extras beyond this are silently dropped. */
const MAX_FILES_PER_MESSAGE = 10;
/** Maximum number of recently-seen message identities to remember for dedup.
 *  FIFO eviction above this caps memory in long-running bots. */
const SEEN_EVENTS_MAX = 500;

/**
 * Bounded FIFO set of thread timestamps where the bot was @-mentioned.
 * Once the bot is mentioned in a thread, all subsequent replies in that
 * thread trigger onMessage — until the entry is FIFO-evicted.
 */
class ActivatedThreads {
  constructor(maxSize = ACTIVATED_THREADS_MAX) {
    this.maxSize = maxSize;
    this._set = new Set();
    this._order = []; // FIFO eviction queue — parallel to _set
  }

  add(threadTs) {
    if (this._set.has(threadTs)) return; // already tracked
    if (this._set.size >= this.maxSize) {
      const oldest = this._order.shift();
      if (oldest !== undefined) this._set.delete(oldest);
    }
    this._set.add(threadTs);
    this._order.push(threadTs);
  }

  has(threadTs) { return this._set.has(threadTs); }
  get size()    { return this._set.size; }
}

/**
 * Bounded FIFO set used as an idempotency cache. Remembers recently-processed
 * message identities so the SAME logical Slack message — delivered twice because
 * the app subscribes to BOTH `app_mention` AND `message.*` (an @-mention in a
 * channel fires both), or re-delivered by Slack's retry of an un-acked event —
 * only fires onMessage (and therefore the ack reply) once.
 */
class SeenEvents {
  constructor(maxSize = SEEN_EVENTS_MAX) {
    this.maxSize = maxSize;
    this._set = new Set();
    this._order = []; // FIFO eviction queue — parallel to _set
  }

  /**
   * Record `key` and report whether it was ALREADY present.
   * @returns {boolean} true if `key` was seen before (caller should skip as a
   *          duplicate); false if it is new (now recorded — caller should process).
   *          Empty/falsy keys are never deduped: they always return false and are
   *          not stored (so a malformed event can't poison or fill the cache).
   */
  seen(key) {
    if (!key) return false;
    if (this._set.has(key)) return true;
    if (this._set.size >= this.maxSize) {
      const oldest = this._order.shift();
      if (oldest !== undefined) this._set.delete(oldest);
    }
    this._set.add(key);
    this._order.push(key);
    return false;
  }

  get size() { return this._set.size; }
}

/**
 * Stable identity for a Slack message, shared across the event types that can
 * carry it. The SAME user message arrives as BOTH an `app_mention` and a
 * `message.*` event when the app subscribes to both — two SEPARATE
 * event_callback deliveries. Those two deliveries share `channel` + `ts` (the
 * message timestamp) but each gets its OWN outer `event_id`, and `client_msg_id`
 * is not guaranteed on `app_mention`. So the only reliable cross-type key is
 * `channel:ts` — using event_id or client_msg_id here would let the duplicate
 * through. `channel:ts` also matches Slack's retry of an un-acked event.
 *
 * @returns {string} `"<channel>:<ts>"`, or '' when either is missing (uncacheable).
 */
function dedupKey(ev) {
  if (!ev) return '';
  const channel = typeof ev.channel === 'string' ? ev.channel : '';
  const ts = typeof ev.ts === 'string' ? ev.ts : '';
  return channel && ts ? `${channel}:${ts}` : '';
}

/** Shared messages kept per message, and the most text kept of each. */
const MAX_SHARES_PER_MESSAGE = 3;
const SHARE_TEXT_MAX = 500;

/**
 * Where a message was written (0.5.6): 'dm' for a direct message to the bot,
 * 'group' for a group direct message, else 'channel'. Slack says it in
 * `channel_type` on a message event; history rows and `app_mention` carry no
 * type, so a `D…` id reads as a direct message and anything else as a channel.
 */
function slackPlace(ev) {
  if (!ev) return 'channel';
  if (ev.channel_type === 'im') return 'dm';
  if (ev.channel_type === 'mpim') return 'group';
  if (!ev.channel_type && typeof ev.channel === 'string' && ev.channel.startsWith('D')) return 'dm';
  return 'channel';
}

/** The channel filter as a list: one id, several, or none (any channel). */
function channelList(channelId) {
  const raw = Array.isArray(channelId) ? channelId : (typeof channelId === 'string' ? channelId.split(',') : []);
  return raw.map((c) => (typeof c === 'string' ? c.trim() : '')).filter(Boolean);
}

/** Messages shared or quoted into this one (Slack sends them as attachments):
 *  who wrote it, its text and its link. Anything else in `attachments` (a link
 *  preview, a bot card) is left out. */
function sharedMessages(ev) {
  return (Array.isArray(ev && ev.attachments) ? ev.attachments : [])
    .filter((a) => a && (a.is_share === true || a.is_msg_unfurl === true))
    .map((a) => {
      const text = typeof a.text === 'string' && a.text ? a.text : (typeof a.fallback === 'string' ? a.fallback : '');
      return {
        text: text.length > SHARE_TEXT_MAX ? `${text.slice(0, SHARE_TEXT_MAX)}…` : text,
        author: typeof a.author_name === 'string' && a.author_name ? a.author_name : (typeof a.author_id === 'string' ? a.author_id : undefined),
        url: typeof a.from_url === 'string' && a.from_url ? a.from_url : undefined
      };
    })
    .filter((a) => a.text)
    .slice(0, MAX_SHARES_PER_MESSAGE);
}

const NO_TRIGGER = { trigger: false, text: '', files: [], place: 'channel', shares: [] };

/**
 * Decide whether a Slack event should trigger onMessage.
 *
 * @param ev              - The `payload.event` object (any shape, may be partial)
 * @param botUserId       - Cached bot user id (string) or null if not yet known
 * @param channelId       - Channel filter: one id, a list of ids, or null/undefined/empty
 *                          for any channel. A direct message and a group direct message
 *                          are never filtered: the filter names channels (0.5.6).
 * @param activatedThreads - Mutable ActivatedThreads instance (mutated on mention)
 * @returns {{ trigger: boolean, text: string, files: object[], place: string, shares: object[] }}
 *          trigger: whether to fire onMessage; text: the raw ev.text string (stripping is
 *          done in the caller); files: raw Slack file metadata extracted from ev.files[]
 *          (empty when none); place: 'channel', 'group' or 'dm'; shares: messages shared
 *          into this one.
 */
function shouldTrigger(ev, botUserId, channelId, activatedThreads) {
  if (!ev) return NO_TRIGGER;

  const place = slackPlace(ev);

  // Channel filter
  const allowed = channelList(channelId);
  const channelOk = place !== 'channel' || allowed.length === 0 || allowed.includes(ev.channel);
  if (!channelOk) return NO_TRIGGER;

  // Self-loop + subtype safety: never trigger on bot posts, edits, joins, etc.
  // file_share IS allowed through — a file upload is eligible if it @-mentions the
  // bot or lands in an activated thread. All other subtypes remain blocked.
  if (ev.bot_id || (ev.subtype && ev.subtype !== 'file_share')) {
    return NO_TRIGGER;
  }

  const text = typeof ev.text === 'string' ? ev.text : '';

  // Is this an @-mention of the bot?
  const isMention =
    ev.type === 'app_mention' ||
    (ev.type === 'message' && botUserId != null && text.includes(`<@${botUserId}>`)) ||
    (ev.subtype === 'file_share' && botUserId != null && text.includes(`<@${botUserId}>`));

  // Is this a reply inside a thread where the bot was already mentioned?
  const isActivatedThread = !!(ev.thread_ts && activatedThreads.has(ev.thread_ts));

  // A direct message is written to the bot: every one of them is for it, with
  // no mention. A group direct message follows the channel rule.
  const isDirect = place === 'dm';

  if (!isMention && !isActivatedThread && !isDirect) return NO_TRIGGER;

  // On mention: activate the thread so future replies in it also trigger.
  // Use thread_ts if the mention is itself a reply, else the message's own ts.
  if (isMention || isDirect) {
    const threadRoot = ev.thread_ts || ev.ts;
    if (threadRoot) activatedThreads.add(threadRoot);
  }

  // Extract file metadata from the event (file_share events carry ev.files[]).
  // Cap at MAX_FILES_PER_MESSAGE; only include entries that have a downloadable URL.
  const files = (Array.isArray(ev.files) ? ev.files : [])
    .filter((f) => f && typeof f.url_private === 'string' && f.url_private)
    .slice(0, MAX_FILES_PER_MESSAGE)
    .map((f) => ({
      id: f.id,
      url_private: f.url_private,
      // Preferred fetch URL: forces a file download (Content-Disposition) and is
      // less likely to bounce through an auth redirect than url_private.
      url_private_download: typeof f.url_private_download === 'string' ? f.url_private_download : undefined,
      name: typeof f.name === 'string' ? f.name : undefined,
      mimetype: typeof f.mimetype === 'string' ? f.mimetype : undefined,
      size: typeof f.size === 'number' ? f.size : undefined,
    }));

  return { trigger: true, text, files, place, shares: sharedMessages(ev) };
}

// ─── Slack file download helpers (pure; used by index.ts downloadSlackFile) ───
// Kept here so they are unit testable without importing electron.

/** The URL to fetch for a Slack file: prefer `url_private_download` (forces an
 *  attachment download and is less likely to bounce through an auth redirect),
 *  falling back to `url_private`. Undefined when neither is present. */
function slackFileUrl(file) {
  if (!file) return undefined;
  const dl = typeof file.url_private_download === 'string' && file.url_private_download ? file.url_private_download : null;
  const pv = typeof file.url_private === 'string' && file.url_private ? file.url_private : null;
  return dl || pv || undefined;
}

/** True only for Slack's own hosts. The bot token is sent ONLY to a Slack host,
 *  on the first request and on every redirect, so it never leaks to a foreign
 *  or CDN host (a signed redirect target is fetched WITHOUT Authorization). */
function isSlackHost(host) {
  if (typeof host !== 'string' || !host) return false;
  const h = host.toLowerCase();
  return h === 'slack.com' || h.endsWith('.slack.com');
}

/**
 * Detect an auth redirect or login HTML stub so it is NEVER saved as the file.
 * Slack answers a files-pri URL fetched without valid auth with a redirect to a
 * login page (body: `<a href="…redir=…">Found</a>`); writing that body was a
 * silent data loss bug.
 * @param {string|undefined} contentType response content-type header
 * @param {Buffer|string} head the first bytes of the body
 */
function looksLikeHtmlStub(contentType, head) {
  if (typeof contentType === 'string' && /text\/html/i.test(contentType)) return true;
  const s = (Buffer.isBuffer(head) ? head.subarray(0, 512).toString('utf8') : String(head || ''))
    .trimStart().toLowerCase();
  return s.startsWith('<!doctype html') || s.startsWith('<html') ||
         s.startsWith('<head') || s.startsWith('<a href') || s.startsWith('<body');
}

/** Max redirects to follow before giving up (guards against redirect loops). */
const SLACK_FILE_MAX_REDIRECTS = 5;

module.exports = {
  shouldTrigger,
  slackPlace,
  channelList,
  sharedMessages,
  ActivatedThreads,
  SeenEvents,
  dedupKey,
  ACTIVATED_THREADS_MAX,
  SEEN_EVENTS_MAX,
  MAX_FILES_PER_MESSAGE,
  slackFileUrl,
  isSlackHost,
  looksLikeHtmlStub,
  SLACK_FILE_MAX_REDIRECTS,
};
