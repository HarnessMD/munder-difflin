/**
 * `md-limits`, the command every agent is taught for the engines' usage limits.
 * Written to `<hive>/bin/md-limits.cjs` at each bootstrap, with an `md-limits`
 * launcher in the runtime folder already on every agent's PATH
 * (HiveManager.writeBrokerTools).
 *
 * It asks the loopback broker the agent already has (`GET /limits`), which
 * answers from what the app keeps in memory (main/usageLimits.ts). It asks no
 * engine itself and reads no credential: the broker token only says which
 * agent is asking. Inside a Claude Code sandbox on Linux the call goes through
 * the sandbox's proxy, as md-secret's does.
 *
 *   md-limits          the table: the used percent of each window an engine reports,
 *                      the reset time, and how old the reading is
 *   md-limits --json   the same as JSON (shared/usageLimits.ts UsageLimitsSnapshot)
 *
 * Plain JS with no template literal inside, so it sits in String.raw as is.
 *
 * `md-models` (hire-defaults-058) is the same script asking `GET /models`: the engines, which are installed and
 * signed in here, and their models (core/engineModels.ts). Both answers carry `engines`, `readAt`, `where` and
 * `text`, so one script reads either. Each part below is put into the script as written, backslashes and all.
 */
interface BrokerReadTool {
  name: string;
  route: string;
  about: string;
  table: string;
  help: string;
  tooOld: string;
}

function brokerReadScript(t: BrokerReadTool): string {
  return String.raw`#!/usr/bin/env node
'use strict';
/* ${t.name}: ${t.about}
 *   ${t.name}          ${t.table}
 *   ${t.name} --json   the same as JSON
 * Written by the app; rewritten at each start. */
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const REQUEST_TIMEOUT_MS = 15000;

function fail(msg) {
  process.stderr.write('${t.name}: ' + msg + '\n');
  process.exit(1);
}

/** Only a loopback broker is ever sent the token. */
function cleanUrl(raw) {
  try {
    const u = new URL(String(raw || ''));
    if (u.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(u.hostname) || !u.port) return null;
    return 'http://' + u.hostname + ':' + u.port;
  } catch {
    return null;
  }
}

function fromEnv() {
  const url = cleanUrl(process.env.MD_BROKER_URL);
  const token = process.env.MD_BROKER_TOKEN;
  return url && typeof token === 'string' && token ? { url, token, from: 'env' } : null;
}

function fromFile() {
  const dir = process.env.AGENT_DIR;
  if (!dir) return null;
  try {
    const j = JSON.parse(fs.readFileSync(path.join(dir, '.broker'), 'utf8'));
    const url = cleanUrl(j && j.url);
    return url && typeof j.token === 'string' && j.token ? { url, token: j.token, from: 'file' } : null;
  } catch {
    return null;
  }
}

/** Inside a Claude Code sandbox on Linux the sandbox has a network of its own: go through its proxy. */
function viaSandboxProxy(opts) {
  const raw = process.env.HTTP_PROXY || process.env.http_proxy;
  if (process.platform !== 'linux' || process.env.SANDBOX_RUNTIME !== '1' || !raw) return opts;
  let proxy;
  try { proxy = new URL(raw); } catch { return opts; }
  const target = opts.host.includes(':') ? '[' + opts.host + ']:' + opts.port : opts.host + ':' + opts.port;
  const headers = Object.assign({}, opts.headers, { host: target });
  if (proxy.username) {
    const pair = decodeURIComponent(proxy.username) + ':' + decodeURIComponent(proxy.password);
    headers['proxy-authorization'] = 'Basic ' + Buffer.from(pair).toString('base64');
  }
  return Object.assign({}, opts, { host: proxy.hostname.replace(/^\[|\]$/g, ''), port: Number(proxy.port) || 80, path: 'http://' + target + opts.path, headers });
}

function get(creds) {
  return new Promise((resolve) => {
    const u = new URL(creds.url);
    const req = http.request(viaSandboxProxy({
      method: 'GET',
      host: u.hostname.replace(/^\[|\]$/g, ''),
      port: Number(u.port),
      path: '${t.route}',
      headers: { 'x-md-broker-token': creds.token },
      timeout: REQUEST_TIMEOUT_MS
    }), (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { /* not JSON */ }
        resolve({ status: res.statusCode, json });
      });
      res.on('error', (e) => resolve({ netError: e }));
    });
    req.on('timeout', () => { req.destroy(Object.assign(new Error('timed out'), { code: 'ETIMEDOUT' })); });
    req.on('error', (e) => resolve({ netError: e }));
    req.end();
  });
}

/** A dead or refused connection, or a token the broker no longer knows: the app restarted. */
function stale(r) {
  if (r.netError) return ['ECONNREFUSED', 'ECONNRESET', 'EPIPE', 'EHOSTUNREACH', 'ENOTFOUND', 'EADDRNOTAVAIL'].includes(r.netError.code);
  return r.status === 401 || r.status === 502;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('-h') || args.includes('--help')) {
    process.stdout.write('usage: ${t.name} [--json]\n${t.help}\n');
    return;
  }
  const unknown = args.filter((a) => a !== '--json');
  if (unknown.length) fail('unknown option ' + unknown[0] + '; usage: ${t.name} [--json]');
  let creds = fromEnv() || fromFile();
  if (!creds) fail('cannot reach the app: MD_BROKER_URL and MD_BROKER_TOKEN are not set and $AGENT_DIR/.broker cannot be read. Run this from an agent the app started.');
  let r = await get(creds);
  if (stale(r)) {
    const again = fromFile();
    if (again && !(creds.from === 'file' && again.url === creds.url && again.token === creds.token)) {
      creds = again;
      r = await get(creds);
    }
  }
  if (r.netError) fail('cannot reach the app at ' + creds.url + ' (' + (r.netError.code || 'no answer') + '). Is it still running?');
  if (r.status === 404) fail('${t.tooOld}');
  const body = r.json;
  if (r.status !== 200 || !body || !Array.isArray(body.engines)) fail((body && typeof body.error === 'string' && body.error) || 'the app answered HTTP ' + r.status);
  if (args.includes('--json')) {
    process.stdout.write(JSON.stringify({ engines: body.engines, readAt: body.readAt, where: body.where }, null, 2) + '\n');
    return;
  }
  process.stdout.write(String(body.text || '') + '\n');
}

main().catch((e) => fail(e && e.message ? e.message : String(e)));
`;
}

export const MD_LIMITS_SCRIPT = brokerReadScript({
  name: 'md-limits',
  route: '/limits',
  about: "each engine's usage limits, as Munder Difflin last saw them.",
  table: 'a table: used percent of each window an engine reports, reset time, how old the reading is',
  help: String.raw`Each engine\'s usage limits, the windows it reports, as Munder Difflin last saw them.`,
  tooOld: 'this app or office does not report usage limits yet (it needs 0.5.9 or later).'
});

/** `md-models`: the engines and their models, which are installed and signed in here (core/engineModels.ts). */
export const MD_MODELS_SCRIPT = brokerReadScript({
  name: 'md-models',
  route: '/models',
  about: 'the engines and their models, which are installed and signed in here.',
  table: 'the engines that can run here with their models, then the ones not installed',
  help: 'The engines and their models: which are installed and signed in here, and the ids a hire request names.',
  tooOld: 'this app or office does not list its engines and models yet (it needs 0.5.8 or later).'
});
