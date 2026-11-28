#!/usr/bin/env node
/**
 * md-secret.cjs: use a key or a secret saved in Integrations, Keys and secrets, from
 * an agent that is already running (0.5.6). An agent's env vars are fixed when
 * it starts; this asks the Munder Difflin app for the value saved right now,
 * so a key added after the agent started works at once, with no restart.
 *
 * Usage:
 *   md-secret list [--json]
 *       The names you may use: AI provider keys by the env var their tools
 *       read (ANTHROPIC_API_KEY and the like), then custom secrets.
 *   md-secret run NAME [NAME ...] -- <command> [args...]
 *       Runs the command with each NAME set in its environment to the value
 *       saved now. Its output and exit code are its own; no value is printed.
 *       This is the way to use a key.
 *   md-secret get NAME [--yes]
 *       Prints one value, for a tool that can only read it from stdin or a
 *       pipe. Refused when stdout is a terminal, so a key is not shown on a
 *       screen by accident, unless --yes.
 *
 * Exit: 2 for a bad argument, 1 for a refusal (an unknown name, the app not
 * reachable, a terminal without --yes), one `md-secret: <reason>` line on
 * stderr. A command that cannot start: 127 (not found) or 126.
 *
 * The app knows which agent is asking from the broker token (MD_BROKER_URL
 * and MD_BROKER_TOKEN, set on every agent) and logs each read by agent and
 * name, never the value. When the app restarted since this agent started,
 * those are stale; the helper then reads $AGENT_DIR/.broker, which the app
 * rewrites, and tries once more. The token only ever goes to a loopback URL.
 *
 * No dependencies: plain Node, like md-slack-reply.cjs.
 */
'use strict';

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { spawn } = require('node:child_process');

/** The rule Settings keeps for a name (shared/customSecrets.ts). */
const NAME_RE = /^[A-Z0-9_]+$/;
const NAME_MAX = 64;
const REQUEST_TIMEOUT_MS = 30_000;

const USAGE = 'usage: md-secret list [--json] | run NAME [NAME ...] -- <command> [args...] | get NAME [--yes]';

function fail(msg, code = 1) {
  process.stderr.write(`md-secret: ${String(msg).replace(/\s+/g, ' ').trim()}\n`);
  process.exit(code);
}

const isName = (s) => typeof s === 'string' && s.length > 0 && s.length <= NAME_MAX && NAME_RE.test(s);
/** Never echoes what was given: it may be a value pasted by mistake. */
const BAD_NAME = `a NAME is capital letters, digits and underscores, at most ${NAME_MAX}, as md-secret list shows it`;
/** An option is named back only when it looks like one. */
function unknownOption(a) {
  const key = a.split('=')[0];
  return /^--?[a-z][a-z-]{0,20}$/.test(key) ? `unknown option ${key}` : 'unknown option';
}

/** What was asked, or an error. Exported for tests. */
function parseArgs(argv) {
  const [cmd, ...rest] = argv;
  if (cmd === undefined) return { error: 'say list, run or get' };
  if (cmd === '--help' || cmd === '-h' || cmd === 'help') return { help: true };
  if (cmd === 'list') {
    let json = false;
    for (const a of rest) {
      if (a === '--json') json = true;
      else if (a.startsWith('-')) return { error: unknownOption(a) };
      else return { error: 'list takes no NAME' };
    }
    return { cmd, json };
  }
  if (cmd === 'get') {
    let yes = false;
    const words = [];
    for (const a of rest) {
      if (a === '--yes') yes = true;
      else if (a.startsWith('-')) return { error: unknownOption(a) };
      else words.push(a);
    }
    if (words.length !== 1) return { error: 'get takes one NAME' };
    if (!isName(words[0])) return { error: BAD_NAME };
    return { cmd, names: words, yes };
  }
  if (cmd === 'run') {
    const sep = rest.indexOf('--');
    if (sep === -1) return { error: 'run needs -- between the names and the command' };
    const before = rest.slice(0, sep);
    const command = rest.slice(sep + 1);
    for (const a of before) {
      if (a.startsWith('-')) return { error: unknownOption(a) };
      if (!isName(a)) return { error: BAD_NAME };
    }
    if (!before.length) return { error: 'run takes at least one NAME before --' };
    if (!command.length || !command[0]) return { error: 'run needs a command after --' };
    return { cmd, names: [...new Set(before)], command: command[0], args: command.slice(1) };
  }
  // The word is not echoed: it may be a value given in the wrong place.
  return { error: 'unknown command, say list, run or get' };
}

/** `get` prints a value only off a terminal, or when told --yes. Exported for tests. */
function mayPrint({ isTTY, yes }) {
  return !isTTY || yes === true;
}

/* ---- reaching the broker ------------------------------------------------- */

/** Only a loopback broker is ever sent the token. Exported for tests. */
function cleanUrl(raw) {
  try {
    const u = new URL(String(raw || ''));
    if (u.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(u.hostname) || !u.port) return null;
    return `http://${u.hostname}:${u.port}`;
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

/** On Linux inside a Claude Code sandbox (an office agent's shell) the sandbox has a network of its own, so a call
 *  to 127.0.0.1 does not reach the broker; the sandbox's proxy does (its allowed hosts list 127.0.0.1). The
 *  request goes to the proxy in absolute form, with the proxy's own credentials. Elsewhere it goes direct. */
function viaSandboxProxy(opts) {
  const raw = process.env.HTTP_PROXY || process.env.http_proxy;
  if (process.platform !== 'linux' || process.env.SANDBOX_RUNTIME !== '1' || !raw) return opts;
  let proxy;
  try { proxy = new URL(raw); } catch { return opts; }
  const target = opts.host.includes(':') ? `[${opts.host}]:${opts.port}` : `${opts.host}:${opts.port}`;
  const headers = { ...opts.headers, host: target };
  if (proxy.username) {
    const pair = `${decodeURIComponent(proxy.username)}:${decodeURIComponent(proxy.password)}`;
    headers['proxy-authorization'] = `Basic ${Buffer.from(pair).toString('base64')}`;
  }
  return { ...opts, host: proxy.hostname.replace(/^\[|\]$/g, ''), port: Number(proxy.port) || 80, path: `http://${target}${opts.path}`, headers };
}

/** One request. The raw answer is never printed: it may hold a value. */
function send(creds, method, route, body) {
  return new Promise((resolve) => {
    const data = body === undefined ? '' : JSON.stringify(body);
    const u = new URL(creds.url);
    const headers = { 'x-md-broker-token': creds.token };
    if (data) { headers['content-type'] = 'application/json'; headers['content-length'] = Buffer.byteLength(data); }
    const req = http.request(viaSandboxProxy({
      method,
      host: u.hostname.replace(/^\[|\]$/g, ''),
      port: Number(u.port),
      path: route,
      headers,
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
    if (data) req.write(data);
    req.end();
  });
}

/** A dead or refused connection, or a token the broker no longer knows: the
 *  app restarted, and the .broker file has the new address. */
function stale(r) {
  if (r.netError) return ['ECONNREFUSED', 'ECONNRESET', 'EPIPE', 'EHOSTUNREACH', 'ENOTFOUND', 'EADDRNOTAVAIL'].includes(r.netError.code);
  // 502 is the sandbox's proxy finding nothing on the old port (viaSandboxProxy).
  return r.status === 401 || r.status === 502;
}

async function call(method, route, body) {
  let creds = fromEnv() || fromFile();
  if (!creds) fail('cannot reach the app: MD_BROKER_URL and MD_BROKER_TOKEN are not set and $AGENT_DIR/.broker cannot be read. Run this from an agent the app started.');
  let r = await send(creds, method, route, body);
  if (stale(r)) {
    const again = fromFile();
    if (again && !(creds.from === 'file' && again.url === creds.url && again.token === creds.token)) {
      creds = again;
      r = await send(creds, method, route, body);
    }
  }
  if (r.netError) fail(`cannot reach the app at ${creds.url} (${r.netError.code || 'no answer'}). Is it still running?`);
  return r;
}

/** The value saved for NAME now, or a refusal. */
async function readValue(name) {
  const r = await call('POST', '/secrets/read', { name });
  const body = r.json;
  if (r.status === 404) fail(`no key or secret named ${name} is saved in Integrations, Keys and secrets. Run md-secret list for the names.`);
  if (!body || r.status !== 200 || body.ok !== true || typeof body.value !== 'string' || !body.value) {
    fail((body && typeof body.error === 'string' && body.error) || `the app answered HTTP ${r.status}`);
  }
  return body.value;
}

/* ---- what is printed ----------------------------------------------------- */

/** The lines for `list`. Exported for tests. */
function listLines(secrets) {
  if (!secrets.length) return ['No keys or secrets are saved in Integrations, Keys and secrets.'];
  const width = Math.max(...secrets.map((s) => s.name.length));
  return secrets.map((s) => `${s.name.padEnd(width)}  ${s.kind === 'provider' ? 'AI provider key' : 'custom secret'}`);
}

/* ---- run ----------------------------------------------------------------- */

/** cmd.exe needs a quoted argument that holds a space. */
const winArg = (a) => (/[\s"]/.test(a) ? `"${a.replace(/"/g, '""')}"` : a);

function runCommand(command, args, extra) {
  const win = process.platform === 'win32';
  const child = spawn(win ? winArg(command) : command, win ? args.map(winArg) : args, {
    stdio: 'inherit',
    env: { ...process.env, ...extra },
    // A .cmd on Windows (npx, gh) starts only through the shell.
    shell: win
  });
  // A stop sent to this helper alone reaches the command too. Ctrl+C from a
  // terminal already reaches both, so SIGINT is only held, never doubled.
  const forward = { SIGTERM: () => child.kill('SIGTERM'), SIGHUP: () => child.kill('SIGHUP'), SIGINT: () => {} };
  for (const [sig, fn] of Object.entries(forward)) process.on(sig, fn);
  const release = () => { for (const [sig, fn] of Object.entries(forward)) process.off(sig, fn); };
  child.on('error', (e) => {
    release();
    fail(`cannot start ${path.basename(command)} (${e.code || 'error'})`, e.code === 'ENOENT' ? 127 : 126);
  });
  child.on('exit', (code, signal) => {
    release();
    if (signal) { process.kill(process.pid, signal); return; }
    process.exit(code === null ? 1 : code);
  });
}

async function main() {
  const req = parseArgs(process.argv.slice(2));
  if (req.help) { process.stdout.write(`${USAGE}\n`); return; }
  if (req.error) fail(`${req.error}. ${USAGE}`, 2);

  if (req.cmd === 'list') {
    const r = await call('GET', '/secrets');
    const body = r.json;
    if (!body || r.status !== 200 || body.ok !== true || !Array.isArray(body.secrets)) {
      fail((body && typeof body.error === 'string' && body.error) || `the app answered HTTP ${r.status}`);
    }
    const secrets = body.secrets.filter((s) => s && isName(s.name)).map((s) => ({ name: s.name, kind: s.kind === 'provider' ? 'provider' : 'custom' }));
    process.stdout.write(req.json ? `${JSON.stringify({ secrets })}\n` : `${listLines(secrets).join('\n')}\n`);
    return;
  }

  if (req.cmd === 'get') {
    const isTTY = !!process.stdout.isTTY;
    if (!mayPrint({ isTTY, yes: req.yes })) {
      fail(`will not print ${req.names[0]} on a terminal. Use md-secret run ${req.names[0]} -- <command>, pipe it into the tool, or add --yes`);
    }
    const value = await readValue(req.names[0]);
    process.stdout.write(isTTY ? `${value}\n` : value);
    return;
  }

  const extra = {};
  for (const name of req.names) extra[name] = await readValue(name);
  runCommand(req.command, req.args, extra);
}

if (require.main === module) {
  main().catch((e) => fail(e && e.code ? `failed (${e.code})` : 'failed'));
} else {
  module.exports = { parseArgs, mayPrint, cleanUrl, listLines, USAGE };
}
