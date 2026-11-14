import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { tokenizeCommand } from '../shared/commandLine';
import { inferAgentProvider, providerPreset, type AgentProvider } from '../shared/agentProvider';
import { resolveCommand, userShellPath } from './shellEnv';
import { parseNpmCmdShim } from './pty';
import { hardKillTree } from './procKill';
import { runHiddenClaude } from './hiddenClaude';

export interface ReflectAgent { provider?: AgentProvider; command?: string; model?: string }
export interface ReflectLaunch { provider: AgentProvider; command: string; model?: string }

function commandProvider(command: string): AgentProvider {
  // inferAgentProvider itself splits on whitespace. Pass only the executable's
  // leaf so a quoted path with spaces is not split a second time.
  const binary = tokenizeCommand(command)[0] ?? '';
  return inferAgentProvider(binary.split(/[\\/]/).pop() ?? binary);
}

export function resolveReflectLaunch(
  settings: ReflectAgent, agent: ReflectAgent, defaultCommand: string
): ReflectLaunch {
  const agentProvider = agent.provider ?? commandProvider(agent.command ?? defaultCommand);
  const provider = settings.provider ?? (settings.command ? commandProvider(settings.command) : agentProvider);
  const sameProvider = agentProvider === provider;
  const recordedCommandProvider = agent.command ? commandProvider(agent.command) : undefined;
  const compatibleCommand = !recordedCommandProvider || recordedCommandProvider === provider || recordedCommandProvider === 'custom';
  const recipe = settings.command ?? (sameProvider && compatibleCommand ? agent.command : undefined)
    ?? (provider === commandProvider(defaultCommand) ? defaultCommand : providerPreset(provider).defaultCommand);
  const command = tokenizeCommand(recipe)[0] ?? providerPreset(provider).defaultCommand;
  return {
    provider, command,
    model: settings.model ?? (provider === 'claude' ? 'claude-haiku-4-5' : sameProvider ? agent.model : undefined)
  };
}

/** OpenCode emits NDJSON events, not Claude transcript records. Errors take
 *  precedence over earlier text so a partial/failed session cannot rewrite memory. */
export function parseOpenCodeOutput(stdout: string): { text?: string; error?: string } {
  const text: string[] = [];
  for (const line of stdout.split(/\r?\n/)) {
    let event: { type?: string; part?: { text?: string }; error?: unknown };
    try { event = JSON.parse(line); } catch { continue; }
    if (!event || typeof event !== 'object') continue;
    if (event.type === 'error') return { error: JSON.stringify(event.error ?? event) };
    if (event.type === 'text' && typeof event.part?.text === 'string') text.push(event.part.text);
  }
  return text.length ? { text: text.join('\n') } : { error: 'OpenCode returned no text events' };
}

/** Decode npm's Windows shim and launch its interpreter directly. Prompt travels
 *  on stdin, never through cmd.exe or a shell-escaped command string. */
export function reflectExecutable(exe: string, platform: NodeJS.Platform = process.platform): { command: string; args: string[] } {
  if (platform === 'win32' && /\.cmd$/i.test(exe)) {
    const shim = parseNpmCmdShim(exe, readFileSync(exe, 'utf8'));
    if (!shim) throw new Error('Unsupported OpenCode command shim; choose a native executable or npm CLI');
    if (!shim.interpreter) return { command: shim.scriptPath, args: [] };
    return { command: resolveCommand(shim.interpreter) ?? shim.interpreter, args: [shim.scriptPath] };
  }
  return { command: exe, args: [] };
}

export interface ReflectSessionOptions extends ReflectLaunch {
  cwd: string;
  env?: Record<string, string>;
  timeoutMs?: number;
}
export interface ReflectSessionResult { ok: boolean; text?: string; error?: string; reason?: string }

export async function runReflectSession(prompt: string, opts: ReflectSessionOptions): Promise<ReflectSessionResult> {
  if (opts.provider === 'claude') {
    return runHiddenClaude(prompt, {
      cwd: opts.cwd, command: `"${opts.command}"`, model: opts.model ?? 'claude-haiku-4-5',
      disallowedTools: ['*'], env: opts.env, timeoutMs: opts.timeoutMs, captureLimits: true
    });
  }
  if (opts.provider !== 'opencode') {
    return { ok: false, reason: 'unsupported-provider', error: `No safe reflection runner for ${opts.provider}; set reflectProvider/reflectCommand to a supported CLI (claude or opencode).` };
  }
  let executable: { command: string; args: string[] };
  try {
    const exe = resolveCommand(opts.command);
    if (!exe) return { ok: false, error: `Reflection CLI is not installed: ${opts.command}` };
    executable = reflectExecutable(exe);
  }
  catch (e) { return { ok: false, error: String(e) }; }
  // An explicit title avoids OpenCode's separate automatic title-model request.
  const args = [...executable.args, 'run', '--format', 'json', '--pure', '--agent', 'munder-reflect', '--title', 'Memory reflection'];
  if (opts.model) args.push(providerPreset('opencode').modelFlag ?? '--model', opts.model);
  let config: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(opts.env?.OPENCODE_CONFIG_CONTENT ?? process.env.OPENCODE_CONFIG_CONTENT ?? '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ok: false, error: 'Invalid OpenCode inline config' };
    config = parsed as Record<string, unknown>;
  }
  catch { return { ok: false, error: 'Invalid OpenCode inline config' }; }
  config = {
    ...config, autoupdate: false, share: 'disabled', permission: 'deny',
    agent: { 'munder-reflect': { description: 'Pure memory summarization, without tools', mode: 'primary', permission: 'deny', tools: { '*': false } } }
  };
  return new Promise(resolve => {
    let settled = false, stdout = '', stderr = '', bytes = 0;
    let timer: NodeJS.Timeout;
    let child: ChildProcessWithoutNullStreams;
    const finish = (result: ReflectSessionResult, kill = false) => {
      if (settled) return;
      settled = true; clearTimeout(timer);
      if (kill && child.pid) hardKillTree(child.pid);
      resolve(result);
    };
    try { child = spawn(executable.command, args, {
      cwd: opts.cwd, windowsHide: true, detached: process.platform !== 'win32',
      env: { ...process.env, PATH: userShellPath(), ...opts.env, OPENCODE_CONFIG_CONTENT: JSON.stringify(config) },
      stdio: ['pipe', 'pipe', 'pipe']
    }); } catch (e) { resolve({ ok: false, error: String(e) }); return; }
    timer = setTimeout(() => finish({ ok: false, error: 'Reflection session timed out' }, true), opts.timeoutMs ?? 180_000);
    child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
    const append = (value: string, err: boolean) => {
      if (settled) return;
      bytes += Buffer.byteLength(value);
      if (bytes > 1_048_576) { finish({ ok: false, error: 'Reflection output exceeded 1 MB' }, true); return; }
      if (err) stderr += value; else stdout += value;
    };
    child.stdout.on('data', value => append(value, false)); child.stderr.on('data', value => append(value, true));
    child.on('error', e => finish({ ok: false, error: e.message }));
    child.on('close', code => {
      const parsed = parseOpenCodeOutput(stdout);
      if (code !== 0 || parsed.error) finish({ ok: false, error: [parsed.error, stderr.trim(), code !== 0 ? `OpenCode exited ${code}` : ''].filter(Boolean).join('\n') });
      else finish({ ok: true, text: parsed.text });
    });
    child.stdin.on('error', e => { if ((e as NodeJS.ErrnoException).code !== 'EPIPE') finish({ ok: false, error: e.message }, true); });
    child.stdin.end(prompt);
  });
}
