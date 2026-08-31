#!/usr/bin/env node
/**
 * md-slack-poller.cjs — PULL new Slack messages into the LOCAL Munder Difflin.
 *
 * Why polling (pull) instead of Slack's push (Events API + tunnel):
 *   A single Slack app delivers events to exactly ONE Request URL (or, in Socket
 *   Mode, load-balances across the app's WebSockets — which MISROUTES with many
 *   users on one app). So fanning ONE shared app's events out to N private
 *   laptops needs a central routing layer. Polling sidesteps that entirely:
 *   every laptop PULLS its own channel with its own token over OUTBOUND-only
 *   HTTPS, so it works behind corporate NAT with no inbound URL and no tunnel,
 *   and one security-approved Slack app is reused by everyone.
 *
 * How it forwards into MD WITHOUT changing MD:
 *   Munder Difflin already runs a local HTTP endpoint (SlackWebhookServer) that
 *   Slack would normally POST events to. This poller re-delivers each new
 *   message to that SAME endpoint on 127.0.0.1 as a synthetic `event_callback`,
 *   HMAC-signed with the app's signing secret exactly like a real Slack push.
 *   Everything downstream is therefore UNCHANGED — signature verification,
 *   the slack-trigger.cjs mention/thread filter, channel:ts dedup, file
 *   download, the IPC hand-off to the renderer, and reply-in-thread. The server
 *   remains the single source of truth for what actually triggers a run; this
 *   script only delivers candidate messages to it.
 *
 * State (survives restarts, no dupes):
 *   A small JSON state file tracks the last-seen message ts per channel (and per
 *   followed thread), so only genuinely NEW messages are forwarded. On the very
 *   first run for a channel it BASELINES to the newest ts and forwards nothing,
 *   so enabling the poller never replays history. Pass --backfill N to instead
 *   forward the last N messages once.
 *
 * Secrets: the bot token and signing secret are READ from MD's config.json and
 * used only in outbound Slack API auth headers / the local HMAC. They are NEVER
 * logged and NEVER written to the state file.
 *
 * Usage:
 *   node md-slack-poller.cjs                      # one poll pass, then exit (cron/launchd)
 *   node md-slack-poller.cjs --watch              # loop forever, default 5 min interval
 *   node md-slack-poller.cjs --watch --interval 10   # loop every 10 minutes
 *   node md-slack-poller.cjs --channel C0123      # override the channel to poll
 *   node md-slack-poller.cjs --backfill 5         # first run: forward last 5 msgs (default 0)
 *   node md-slack-poller.cjs --no-threads         # do not follow thread replies
 *   node md-slack-poller.cjs --verbose            # log each forwarded message id
 *
 *   --config /abs/config.json   override MD config.json location
 *   --state  /abs/state.json    override the poller state file location
 *   --port   3847               override the local webhook port (else config.slackPort)
 *
 * Config discovery order: --config, then MD_CONFIG env, then the platform
 * default Electron userData path for "munder-difflin".
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const https = require('node:https');
const http = require('node:http');
const { createHmac } = require('node:crypto');

// ─── arg parsing ─────────────────────────────────────────────────────────────
/** Parse `--key value`, `--key=value`, and boolean `--flag` from argv. */
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const eq = a.indexOf('=');
    if (eq !== -1) { out[a.slice(2, eq)] = a.slice(eq + 1); continue; }
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) { out[key] = next; i++; }
    else out[key] = true;
  }
  return out;
}

function log(msg) { process.stdout.write(`md-slack-poller: ${msg}\n`); }
function fail(msg) { process.stderr.write(`md-slack-poller: ${msg}\n`); process.exit(1); }

// ─── config + state discovery ────────────────────────────────────────────────
/** Platform default Electron `userData` dir for the "munder-difflin" app. */
function defaultUserDataDir() {
  const app = 'munder-difflin';
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', app);
  }
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), app);
  }
  // linux + others: XDG_CONFIG_HOME or ~/.config
  return path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), app);
}

/** Resolve the MD config.json path: --config, MD_CONFIG env, then platform default. */
function resolveConfigPath(args) {
  const p = args.config || process.env.MD_CONFIG;
  if (p && p !== true) return p;
  return path.join(defaultUserDataDir(), 'config.json');
}

/** Resolve the poller state path: --state, else alongside config.json. */
function resolveStatePath(args, configPath) {
  const p = args.state;
  if (p && p !== true) return p;
  return path.join(path.dirname(configPath), 'slack-poller-state.json');
}

/** Read + JSON-parse the poller state file, or an empty shape if absent/corrupt. */
function loadState(statePath) {
  try {
    const s = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    if (s && typeof s === 'object') {
      s.channels = (s.channels && typeof s.channels === 'object') ? s.channels : {};
      s.threads = (s.threads && typeof s.threads === 'object') ? s.threads : {};
      return s;
    }
  } catch { /* missing or corrupt → start clean */ }
  return { botUserId: null, channels: {}, threads: {} };
}

/** Persist state atomically-ish with 0600 perms (never contains any secret). */
function saveState(statePath, state) {
  const tmp = `${statePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, statePath);
}

// ─── pure helpers (exported for tests) ───────────────────────────────────────
/** Slack ts are decimal strings ("1700000000.000100"); compare numerically. */
function tsGreater(a, b) {
  if (!a) return false;
  if (!b) return true;
  return Number(a) > Number(b);
}
function maxTs(a, b) { return tsGreater(a, b) ? a : b; }

/**
 * From a raw conversations.history/replies `messages[]` array, return the ones
 * strictly newer than `lastTs`, in ASCENDING ts order (Slack returns newest
 * first). Optionally drop messages we should never forward as candidates:
 * anything authored by our own bot (bot_id set, or user === botUserId) — the
 * server would drop these anyway, but skipping them here avoids needless POSTs
 * and self-loops.
 */
function selectNewMessages(messages, lastTs, botUserId) {
  const arr = Array.isArray(messages) ? messages : [];
  const fresh = arr.filter((m) => {
    if (!m || typeof m.ts !== 'string') return false;
    if (!tsGreater(m.ts, lastTs)) return false;
    if (m.bot_id) return false;
    if (botUserId && m.user === botUserId) return false;
    return true;
  });
  fresh.sort((a, b) => Number(a.ts) - Number(b.ts));
  return fresh;
}

/** Cheap mention check mirroring slack-trigger's text path — used ONLY to decide
 *  which threads to FOLLOW for replies. The server's slack-trigger.cjs remains
 *  the authoritative trigger filter for every message we forward. */
function mentionsBot(text, botUserId) {
  return !!botUserId && typeof text === 'string' && text.includes(`<@${botUserId}>`);
}

/**
 * Build a synthetic Slack `event_callback` payload for one history message,
 * shaped exactly like a real push so SlackWebhookServer.handleBody accepts it.
 * Only the fields the server reads are populated; `authorizations[0].user_id`
 * seeds the bot's own id so <@BOT> mention detection works.
 */
function buildEventPayload(msg, opts) {
  const event = {
    type: 'message',
    channel: opts.channelId,
    user: typeof msg.user === 'string' ? msg.user : undefined,
    text: typeof msg.text === 'string' ? msg.text : '',
    ts: msg.ts,
  };
  if (typeof msg.thread_ts === 'string' && msg.thread_ts) event.thread_ts = msg.thread_ts;
  // Only 'file_share' is meaningful to the server's filter; pass it through so
  // uploads with a bot @-mention are handled (files downloaded by main).
  if (msg.subtype === 'file_share') event.subtype = 'file_share';
  if (Array.isArray(msg.files) && msg.files.length > 0) event.files = msg.files;
  return {
    type: 'event_callback',
    team_id: opts.teamId,
    authorizations: [{ user_id: opts.botUserId, is_bot: true }],
    event,
  };
}

/** Compute Slack's `v0=` request signature over `v0:<ts>:<rawBody>`. */
function computeSignature(signingSecret, tsSec, rawBody) {
  return 'v0=' + createHmac('sha256', signingSecret).update(`v0:${tsSec}:${rawBody}`).digest('hex');
}

// ─── Slack Web API (outbound HTTPS) ──────────────────────────────────────────
/** POST form-encoded to a Slack Web API method with a Bearer token. Resolves the
 *  parsed JSON. The token appears ONLY in the Authorization header, never logged. */
function slackApi(method, botToken, params) {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams(params || {}).toString();
    const req = https.request({
      method: 'POST',
      hostname: 'slack.com',
      path: `/api/${method}`,
      headers: {
        'content-type': 'application/x-www-form-urlencoded; charset=utf-8',
        'content-length': Buffer.byteLength(body),
        authorization: `Bearer ${botToken}`,
      },
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
        catch { reject(new Error(`bad JSON from ${method}`)); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/** POST a signed synthetic event to the LOCAL webhook endpoint. Resolves the
 *  HTTP status code (200 = the server accepted/dispatched it, as it does for a
 *  real Slack push). Rejects on connection error (endpoint down). */
function postLocalEvent(port, signingSecret, payload) {
  return new Promise((resolve, reject) => {
    const rawBody = JSON.stringify(payload);
    const tsSec = Math.floor(Date.now() / 1000).toString();
    const sig = computeSignature(signingSecret, tsSec, rawBody);
    const req = http.request({
      method: 'POST',
      hostname: '127.0.0.1',
      port,
      path: '/',
      headers: {
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(rawBody),
        'x-slack-request-timestamp': tsSec,
        'x-slack-signature': sig,
      },
    }, (res) => {
      res.on('data', () => { /* drain */ });
      res.on('end', () => resolve(res.statusCode || 0));
    });
    req.on('error', reject);
    req.write(rawBody);
    req.end();
  });
}

// ─── one poll pass ───────────────────────────────────────────────────────────
/**
 * Run a single poll cycle for one channel:
 *  - learn the bot user id (auth.test) once, cached in state,
 *  - baseline on first sight (forward nothing, or last N with --backfill),
 *  - fetch conversations.history since lastTs and forward new messages,
 *  - optionally follow activated threads via conversations.replies.
 * Mutates + persists `state`. Returns the count forwarded.
 */
async function pollOnce(ctx) {
  const { botToken, signingSecret, channelId, port, state, statePath, args, verbose } = ctx;

  // 1) Bot user id — needed to seed authorizations + decide thread-follow.
  if (!state.botUserId) {
    const auth = await slackApi('auth.test', botToken, {});
    if (!auth.ok) fail(`auth.test failed: ${auth.error || 'unknown'} (check the bot token / that it is installed)`);
    state.botUserId = auth.user_id;
    state.teamId = auth.team_id;
    saveState(statePath, state);
    if (verbose) log(`bot user id resolved (team ${auth.team_id || '?'})`);
  }

  const chState = state.channels[channelId] || (state.channels[channelId] = { lastTs: null });
  const opts = { channelId, botUserId: state.botUserId, teamId: state.teamId };
  let forwarded = 0;

  // 2) First run for this channel → baseline to newest ts, forwarding nothing
  //    (unless --backfill N asks to replay the last N).
  if (!chState.lastTs) {
    const backfill = Number(args.backfill) > 0 ? Math.min(Number(args.backfill), 15) : 0;
    const hist = await slackApi('conversations.history', botToken, { channel: channelId, limit: backfill || 1 });
    if (!hist.ok) fail(`conversations.history failed: ${hist.error || 'unknown'} (needs channels:history/groups:history and the bot must be in the channel)`);
    const msgs = Array.isArray(hist.messages) ? hist.messages : [];
    if (msgs.length === 0) { log(`channel ${channelId}: empty, nothing to baseline yet`); return 0; }
    // Newest ts across the page is our baseline.
    const newest = msgs.reduce((mx, m) => maxTs(mx, m.ts), null);
    if (backfill) {
      const fresh = selectNewMessages(msgs, null, state.botUserId).slice(-backfill);
      for (const m of fresh) { if (await forwardMessage(ctx, m, opts)) forwarded++; }
    } else {
      log(`channel ${channelId}: baselined at ${newest} (no history replay)`);
    }
    chState.lastTs = newest;
    saveState(statePath, state);
    return forwarded;
  }

  // 3) Fetch messages since lastTs (oldest excludes lastTs itself).
  const hist = await slackApi('conversations.history', botToken, {
    channel: channelId, oldest: chState.lastTs, inclusive: 'false', limit: 15,
  });
  if (!hist.ok) fail(`conversations.history failed: ${hist.error || 'unknown'}`);
  const fresh = selectNewMessages(hist.messages, chState.lastTs, state.botUserId);
  for (const m of fresh) {
    if (await forwardMessage(ctx, m, opts)) {
      forwarded++;
      chState.lastTs = maxTs(chState.lastTs, m.ts);
      saveState(statePath, state); // persist after each → a crash never re-forwards
      // Follow the thread this message roots if it @-mentions the bot.
      if (args.threads !== false && args['no-threads'] !== true && mentionsBot(m.text, state.botUserId)) {
        const root = (typeof m.thread_ts === 'string' && m.thread_ts) || m.ts;
        if (!state.threads[root]) state.threads[root] = { lastReplyTs: root };
      }
    } else {
      break; // delivery failed (endpoint down) → resume from here next pass
    }
  }

  // 4) Follow activated threads: pull new replies and forward them too. The
  //    server already activated these threads when we forwarded the mention, so
  //    it triggers on the replies exactly as in push mode.
  if (args.threads !== false && args['no-threads'] !== true) {
    forwarded += await pollThreads(ctx, opts);
  }

  return forwarded;
}

/** Poll conversations.replies for every followed thread; forward new replies. */
async function pollThreads(ctx, opts) {
  const { botToken, channelId, state, statePath, verbose } = ctx;
  let forwarded = 0;
  const roots = Object.keys(state.threads);
  // Bound work + prune very old threads (keep the 50 newest by root ts).
  if (roots.length > 50) {
    roots.sort((a, b) => Number(b) - Number(a));
    for (const old of roots.slice(50)) delete state.threads[old];
  }
  for (const root of Object.keys(state.threads)) {
    const th = state.threads[root];
    let rep;
    try {
      rep = await slackApi('conversations.replies', botToken, {
        channel: channelId, ts: root, oldest: th.lastReplyTs, inclusive: 'false', limit: 15,
      });
    } catch (e) { if (verbose) log(`thread ${root}: replies fetch error ${e.message}`); continue; }
    if (!rep || !rep.ok) continue;
    // messages[0] is the root itself; skip it and anything <= lastReplyTs.
    const fresh = selectNewMessages(rep.messages, th.lastReplyTs, state.botUserId)
      .filter((m) => m.ts !== root);
    for (const m of fresh) {
      if (await forwardMessage(ctx, m, opts)) {
        forwarded++;
        th.lastReplyTs = maxTs(th.lastReplyTs, m.ts);
        saveState(statePath, state);
      } else break;
    }
  }
  return forwarded;
}

/** Forward one message to the local endpoint. Returns true on accepted (2xx). */
async function forwardMessage(ctx, msg, opts) {
  const { port, signingSecret, verbose } = ctx;
  const payload = buildEventPayload(msg, opts);
  let status;
  try { status = await postLocalEvent(port, signingSecret, payload); }
  catch (e) {
    process.stderr.write(`md-slack-poller: local endpoint unreachable on 127.0.0.1:${port} (${e.message}). Is Munder Difflin running with Slack enabled?\n`);
    return false;
  }
  if (status >= 200 && status < 300) {
    if (verbose) log(`forwarded ${opts.channelId}:${msg.ts}`);
    return true;
  }
  process.stderr.write(`md-slack-poller: endpoint returned ${status} for ${opts.channelId}:${msg.ts} (403=signature mismatch → check slackSigningSecret)\n`);
  return false;
}

// ─── main ────────────────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const configPath = resolveConfigPath(args);
  let cfg;
  try { cfg = JSON.parse(fs.readFileSync(configPath, 'utf8')); }
  catch (e) { fail(`cannot read MD config at ${configPath}: ${e.message} (pass --config or set MD_CONFIG)`); }

  const botToken = cfg.slackBotToken;
  const signingSecret = cfg.slackSigningSecret;
  const channelId = (args.channel && args.channel !== true) ? args.channel : cfg.slackChannelId;
  const port = Number(args.port) > 0 ? Number(args.port) : (Number(cfg.slackPort) > 0 ? Number(cfg.slackPort) : 3847);

  if (!botToken) fail('config.slackBotToken is unset — install the shared Slack app to your workspace to get a bot token, then set it in Munder Difflin settings');
  if (!signingSecret) fail('config.slackSigningSecret is unset — required to sign the local delivery (same secret MD already uses)');
  if (!channelId) fail('no channel to poll — set slackChannelId in MD settings or pass --channel C0123');

  const statePath = resolveStatePath(args, configPath);
  const verbose = args.verbose === true;
  const ctx = { botToken, signingSecret, channelId, port, statePath, args, verbose,
    get state() { return this._state; }, set state(v) { this._state = v; } };
  ctx.state = loadState(statePath);

  const runPass = async () => {
    try {
      const n = await pollOnce(ctx);
      log(`poll complete — forwarded ${n} new message(s) from ${channelId}`);
    } catch (e) {
      process.stderr.write(`md-slack-poller: poll error: ${e.message}\n`);
    }
  };

  if (args.watch === true) {
    const minutes = Number(args.interval) > 0 ? Number(args.interval) : 5;
    log(`watch mode: polling ${channelId} every ${minutes} min → 127.0.0.1:${port}`);
    await runPass();
    setInterval(runPass, minutes * 60 * 1000);
  } else {
    await runPass();
  }
}

// Run only when invoked directly; exporting the pure helpers keeps them testable.
if (require.main === module) {
  main().catch((e) => fail(e && e.message ? e.message : String(e)));
}

module.exports = {
  parseArgs,
  defaultUserDataDir,
  resolveConfigPath,
  resolveStatePath,
  loadState,
  saveState,
  tsGreater,
  maxTs,
  selectNewMessages,
  mentionsBot,
  buildEventPayload,
  computeSignature,
};
