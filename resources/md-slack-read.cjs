#!/usr/bin/env node
/**
 * md-slack-read.cjs — READ-ONLY ad hoc peek at Munder Difflin's own Slack app.
 *
 * Why this exists: the hive's general-purpose Slack MCP tool (via the mux
 * gateway) is bound to a DIFFERENT Slack workspace/identity (the user's
 * everyday Coinbase corp Slack). MD's channel (default C0BTJ8REX5Z) lives in
 * a separate, dedicated Slack app/workspace that only MD's own bot token can
 * see — so the gateway tool will always fail on it (channel_not_found /
 * not_in_channel), no matter what scopes the corp Slack app has. This script
 * reuses MD's own config.json bot token (same discovery + auth as
 * md-slack-poller.cjs / md-slack-reply.cjs) to read it directly.
 *
 * READ-ONLY: no state file writes, no forwarding into MD, no posting. Safe to
 * run any time as a diagnostic, independent of whether the poller/app is up.
 *
 * Usage:
 *   node md-slack-read.cjs                          # last 10 channel messages
 *   node md-slack-read.cjs --limit 20                # last 20 channel messages
 *   node md-slack-read.cjs --channel C0123           # override channel
 *   node md-slack-read.cjs --thread 1789591373.177399  # a thread + its replies
 *   node md-slack-read.cjs --config /abs/config.json # override config path
 *
 * Config discovery: --config, then MD_CONFIG env, then the platform default
 * Electron userData path for "munder-difflin" (same as the poller).
 */
'use strict';

const fs = require('node:fs');
const https = require('node:https');
const { resolveConfigPath } = require('./md-slack-poller.cjs');

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

function fail(msg) { process.stderr.write(`md-slack-read: ${msg}\n`); process.exit(1); }

function slackApi(method, botToken, params) {
  return new Promise((resolve, reject) => {
    const qs = new URLSearchParams(params).toString();
    const req = https.request({
      hostname: 'slack.com',
      path: `/api/${method}${qs ? `?${qs}` : ''}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${botToken}` },
    }, (res) => {
      let body = '';
      res.on('data', (d) => { body += d; });
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(new Error(`bad JSON from Slack ${method}: ${e.message}`)); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function fmt(ts) {
  return new Date(Number(ts) * 1000).toLocaleString();
}

function printMessages(messages, botUserId) {
  for (const m of messages) {
    const who = m.bot_id || m.user === botUserId ? 'BOT' : (m.user || '?');
    const text = (m.text || '').replace(/\s+/g, ' ').slice(0, 200);
    process.stdout.write(`${fmt(m.ts)}  [${m.ts}]  ${who}: ${text}\n`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const configPath = resolveConfigPath(args);
  let cfg;
  try { cfg = JSON.parse(fs.readFileSync(configPath, 'utf8')); }
  catch (e) { fail(`cannot read MD config at ${configPath}: ${e.message} (pass --config or set MD_CONFIG)`); }

  const botToken = cfg.slackBotToken;
  if (!botToken) fail(`no slackBotToken in ${configPath} — MD Slack is not configured`);
  const channelId = (args.channel && args.channel !== true) ? args.channel : cfg.slackChannelId;
  if (!channelId) fail('no channel: pass --channel or set slackChannelId in config');
  const limit = String((args.limit && args.limit !== true) ? args.limit : 10);

  const auth = await slackApi('auth.test', botToken, {});
  if (!auth.ok) fail(`auth.test failed: ${auth.error} — bot token is invalid/revoked`);

  if (args.thread && args.thread !== true) {
    const rep = await slackApi('conversations.replies', botToken, { channel: channelId, ts: args.thread, limit });
    if (!rep.ok) fail(`conversations.replies failed: ${rep.error} (needs channels:history/groups:history and the bot must be in the channel)`);
    process.stdout.write(`-- thread ${args.thread} in ${channelId} (as bot ${auth.user_id}, team ${auth.team_id}) --\n`);
    printMessages(rep.messages || [], auth.user_id);
    return;
  }

  const hist = await slackApi('conversations.history', botToken, { channel: channelId, limit });
  if (!hist.ok) fail(`conversations.history failed: ${hist.error} (needs channels:history/groups:history and the bot must be in the channel)`);
  process.stdout.write(`-- last ${limit} top-level message(s) in ${channelId} (as bot ${auth.user_id}, team ${auth.team_id}) --\n`);
  printMessages((hist.messages || []).slice().reverse(), auth.user_id);
}

if (require.main === module) {
  main().catch((e) => fail(e && e.message ? e.message : String(e)));
}

module.exports = { parseArgs, slackApi, printMessages };
