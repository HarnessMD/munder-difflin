/**
 * 0.5.5 perf, item 6: how a Claude agent's hooks reach the HookServer.
 *
 * Every hook used to run `hive-node cth-hook.cjs`, which starts the whole
 * Electron binary (about 80 ms alone, 0.6 s or more when eight start at once),
 * twice per tool call. Claude Code 2.1.63 and later can POST a hook straight to
 * a URL, so the HookServer also listens on loopback HTTP and the settings file
 * points every event that allows it there. SessionStart and statusLine are
 * command only in Claude Code, so they keep the shim.
 *
 * This module holds the pure decisions (which path, and why) so they can be
 * tested without Electron. The HTTP path is chosen only when all of these hold:
 *   - the listener is bound (a spawn racing the boot gets the shim),
 *   - the claude binary reports 2.1.63 or later,
 *   - no settings scope Claude reads sets allowedHttpHookUrls or
 *     httpHookAllowedEnvVars. Either key can make Claude skip our hook with no
 *     error at all (seen live on 2.1.284), and a skipped PreToolUse is a pause
 *     gate that silently stops working. We only look for the key; the values are
 *     never read out or logged.
 */
import { execFile } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/** The first Claude Code release with `"type": "http"` hooks. */
export const MIN_HTTP_HOOK_VERSION: readonly [number, number, number] = [2, 1, 63];

/** The environment variable that carries the listener's token into the agent.
 *  Claude Code expands it into the Authorization header only because the hook
 *  lists it in allowedEnvVars, so the token itself is never written to disk. */
export const HOOK_TOKEN_ENV = 'HIVE_HOOK_TOKEN';

export interface HookHttpEndpoint { port: number; token: string }

export type HookTransport =
  | { path: 'http'; port: number; token: string }
  | { path: 'command'; reason: string };

/** "2.1.284 (Claude Code)" to [2, 1, 284]; null when there is no version in it. */
export function parseClaudeVersion(text: string | null | undefined): [number, number, number] | null {
  const m = /(\d+)\.(\d+)\.(\d+)/.exec(text ?? '');
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

export function versionAtLeast(v: readonly number[], min: readonly number[]): boolean {
  for (let i = 0; i < min.length; i++) {
    if ((v[i] ?? 0) !== min[i]) return (v[i] ?? 0) > min[i];
  }
  return true;
}

const ALLOWLIST_KEYS = ['allowedHttpHookUrls', 'httpHookAllowedEnvVars'] as const;

/** Where Claude Code keeps managed (organisation) settings on each platform. */
export function managedSettingsPath(platform: NodeJS.Platform = process.platform): string {
  if (platform === 'darwin') return '/Library/Application Support/ClaudeCode/managed-settings.json';
  if (platform === 'win32') return 'C:\\Program Files\\ClaudeCode\\managed-settings.json';
  return '/etc/claude-code/managed-settings.json';
}

/** Every settings file Claude Code reads for an agent in `cwd`, with its scope. */
export function settingsScopes(
  cwd: string,
  opts: { home?: string; configDir?: string; managedPath?: string } = {}
): Array<{ scope: string; file: string }> {
  const userDir = opts.configDir || join(opts.home ?? homedir(), '.claude');
  const managed = opts.managedPath ?? managedSettingsPath();
  const out = [
    { scope: 'user', file: join(userDir, 'settings.json') },
    { scope: 'project', file: join(cwd, '.claude', 'settings.json') },
    { scope: 'local', file: join(cwd, '.claude', 'settings.local.json') },
    { scope: 'managed', file: managed }
  ];
  // Drop-in folder beside the managed file (managed-settings.d/*.json).
  const dropIn = managed.replace(/\.json$/, '.d');
  try {
    for (const name of readdirSync(dropIn).sort()) {
      if (name.endsWith('.json')) out.push({ scope: 'managed', file: join(dropIn, name) });
    }
  } catch { /* no drop-in folder */ }
  return out;
}

/** The first allow list key found in any settings scope, as a log-safe reason
 *  ("allowedHttpHookUrls in user settings"), or null when none sets one. Text
 *  search on purpose: a file Claude can read but JSON.parse cannot is still one
 *  we must not gamble on. */
export function httpHookAllowlistReason(
  cwd: string,
  opts: { home?: string; configDir?: string; managedPath?: string } = {}
): string | null {
  for (const { scope, file } of settingsScopes(cwd, opts)) {
    let text: string;
    try {
      if (!existsSync(file)) continue;
      text = readFileSync(file, 'utf8');
    } catch { continue; }
    for (const key of ALLOWLIST_KEYS) {
      if (text.includes(`"${key}"`)) return `${key} in ${scope} settings`;
    }
  }
  return null;
}

/** Pick the hook path for one Claude agent spawn. */
export function chooseHookTransport(input: {
  endpoint: HookHttpEndpoint | null;
  version: readonly number[] | null;
  allowlistReason: string | null;
}): HookTransport {
  if (!input.endpoint) return { path: 'command', reason: 'hook listener not bound yet' };
  if (!input.version) return { path: 'command', reason: 'claude version unknown' };
  if (!versionAtLeast(input.version, MIN_HTTP_HOOK_VERSION)) {
    return { path: 'command', reason: `claude ${input.version.join('.')} is older than ${MIN_HTTP_HOOK_VERSION.join('.')}` };
  }
  if (input.allowlistReason) return { path: 'command', reason: input.allowlistReason };
  return { path: 'http', port: input.endpoint.port, token: input.endpoint.token };
}

/** Append the loopback names to a NO_PROXY value, keeping whatever the user had.
 *  Claude Code sends http hooks through HTTP_PROXY / HTTPS_PROXY like any other
 *  request (seen live), which would hand the token to the proxy in plain text and,
 *  behind a proxy that cannot reach this machine's loopback, fail every hook open. */
export function withLoopbackNoProxy(existing: string | undefined): string {
  const parts = (existing ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  for (const host of ['127.0.0.1', 'localhost']) {
    if (!parts.includes(host)) parts.push(host);
  }
  return parts.join(',');
}

/** How long the CLI waits for the prompt's hook, in seconds; every other event waits 5. The clock runs in the
 *  CLI, so a CLI that stalls can use it up before the request has left, and the app never hears of the prompt
 * . A healthy app answers in milliseconds, so this only bounds a wedged one. */
export const PROMPT_HOOK_TIMEOUT_S = 20;

/** The hook entry Claude Code gets for one event on the http path. */
export function httpHookEntry(port: number, agentId: string): Record<string, unknown> {
  return {
    type: 'http',
    url: `http://127.0.0.1:${port}/hook/${encodeURIComponent(agentId)}`,
    headers: { Authorization: `Bearer $${HOOK_TOKEN_ENV}` },
    allowedEnvVars: [HOOK_TOKEN_ENV],
    timeout: 5
  };
}

/** One `claude --version` per binary per app launch. The promise is cached, so
 *  concurrent spawns (a team restore) share one probe; a failed or slow probe
 *  resolves null and that binary's agents keep the command hooks. */
const versionProbes = new Map<string, Promise<[number, number, number] | null>>();

export function claudeVersionOnce(
  binPath: string,
  env: NodeJS.ProcessEnv,
  timeoutMs = 5000
): Promise<[number, number, number] | null> {
  let probe = versionProbes.get(binPath);
  if (!probe) {
    probe = new Promise((resolve) => {
      // An npm shim on Windows (claude.cmd) cannot be run without a shell.
      const viaShell = process.platform === 'win32' && /\.(cmd|bat)$/i.test(binPath);
      try {
        execFile(viaShell ? `"${binPath}"` : binPath, ['--version'], { env, timeout: timeoutMs, windowsHide: true, encoding: 'utf8', shell: viaShell }, (err, stdout) => {
          resolve(err ? null : parseClaudeVersion(stdout));
        });
      } catch { resolve(null); }
    });
    versionProbes.set(binPath, probe);
  }
  return probe;
}

/** The `host:port` of an http hook entry, as the agent's sandbox must allow it
 *  (0.5.6, #674). Undefined on the command path, or for an entry with no url. */
export function httpHookHost(entry: Record<string, unknown> | undefined): string | undefined {
  if (!entry || typeof entry.url !== 'string') return undefined;
  try { return new URL(entry.url).host || undefined; } catch { return undefined; }
}
