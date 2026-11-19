/**
 * Pure normalisers from each provider's transcript record to the History tab's
 * items. No fs, no Electron: one parsed JSON record in, 0..n items out.
 * Ported from Prozzta/guppyos 02d0d50b (MIT).
 *
 * WHAT IS KEPT. User and assistant text, and each tool CALL as a single line (the tool's
 * name and its key argument). WHAT IS NOT: tool output, thinking/reasoning, token counts,
 * snapshots, injected context. The History tab is for reading what happened, and a raw
 * output dump is exactly the noise the terminal already has too much of.
 *
 * Every text is capped here (HISTORY_TEXT_MAX / HISTORY_TOOL_MAX), so nothing downstream
 * can be handed an unbounded string.
 */
import {
  HISTORY_TEXT_MAX,
  HISTORY_TOOL_MAX,
  type HistoryItem,
  type HistoryItemKind,
  type HistoryProvider
} from '../shared/history';

type Rec = Record<string, unknown>;

const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');

function toMs(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v > 1e12 ? v : v * 1000;
  if (typeof v !== 'string' || !v) return null;
  const t = Date.parse(v);
  return Number.isFinite(t) ? t : null;
}

/** Cap a message's text. Trims surrounding blank space; keeps inner newlines. */
export function capText(s: string, max = HISTORY_TEXT_MAX): { text: string; truncated: boolean } {
  const t = s.trim();
  if (t.length <= max) return { text: t, truncated: false };
  return { text: t.slice(0, max).trimEnd() + ' …', truncated: true };
}

/** One line: whitespace collapsed, capped. */
export function oneLine(s: string, max = HISTORY_TOOL_MAX): { text: string; truncated: boolean } {
  const t = s.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return { text: t, truncated: false };
  return { text: t.slice(0, max - 1).trimEnd() + '…', truncated: true };
}

class Out {
  readonly items: HistoryItem[] = [];
  constructor(private readonly offset: number, private readonly at: number | null) {}
  push(kind: HistoryItemKind, raw: string, tool = false): void {
    const { text, truncated } = tool ? oneLine(raw) : capText(raw);
    if (!text) return;
    const item: HistoryItem = { id: `${this.offset}.${this.items.length}`, kind, at: this.at, text, offset: this.offset };
    if (truncated) item.truncated = true;
    this.items.push(item);
  }
}

/** Argument keys that name what a tool call is ABOUT, most telling first. */
const KEY_ARGS = [
  'command', 'cmd', 'CommandLine', 'file_path', 'filePath', 'AbsolutePath', 'TargetFile', 'path',
  'notebook_path', 'pattern', 'Query', 'query', 'SearchPath', 'url', 'Url', 'skill', 'description',
  'prompt', 'subject', 'to', 'toolSummary'
];

/** A tool call's one-line summary: `name: key argument`. Arguments may arrive as an object,
 *  as a JSON string (Codex function_call), or with JSON-encoded string values (AGY). */
export function toolSummary(name: string, args: unknown): string {
  let a: unknown = args;
  if (typeof a === 'string') {
    try { a = JSON.parse(a); } catch { return a ? `${name}: ${a}` : name; }
  }
  if (!isRec(a)) return name;
  const val = (v: unknown): string => {
    if (typeof v === 'string') {
      // AGY encodes each argument value as JSON text ("\"C:\\\\x\""): unwrap one level.
      if (v.length > 1 && v.startsWith('"') && v.endsWith('"')) {
        try { const p = JSON.parse(v); if (typeof p === 'string') return p; } catch { /* keep as is */ }
      }
      return v;
    }
    if (Array.isArray(v) && v.every((x) => typeof x === 'string')) return v.join(' ');
    return '';
  };
  for (const k of KEY_ARGS) {
    const v = val(a[k]);
    if (v) return `${name}: ${v}`;
  }
  let json = '';
  try { json = JSON.stringify(a); } catch { /* circular: impossible from JSON.parse */ }
  return json && json !== '{}' ? `${name}: ${json}` : name;
}

// ─── Claude Code ─────────────────────────────────────────────────────────────

/** Injected context, never something the user typed. */
function stripClaudeInjected(s: string): string {
  return s.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '').trim();
}

export function normalizeClaude(rec: unknown, offset: number): HistoryItem[] {
  if (!isRec(rec)) return [];
  const out = new Out(offset, toMs(rec.timestamp));
  const type = rec.type;
  if (type === 'system') {
    if (rec.subtype === 'compact_boundary') out.push('system', 'Conversation compacted');
    return out.items;
  }
  if (type !== 'user' && type !== 'assistant') return [];
  // Subagent (sidechain) turns and the compaction summary are not the visible conversation.
  if (rec.isSidechain === true || rec.isMeta === true || rec.isCompactSummary === true) return [];
  const msg = isRec(rec.message) ? rec.message : null;
  if (!msg) return [];
  const content = msg.content;
  if (type === 'user') {
    const texts: string[] = [];
    if (typeof content === 'string') texts.push(content);
    else if (Array.isArray(content)) {
      for (const b of content) if (isRec(b) && b.type === 'text') texts.push(str(b.text));
      // tool_result blocks are tool OUTPUT: never shown.
    }
    for (const raw of texts) {
      const t = stripClaudeInjected(raw);
      if (!t) continue;
      const cmd = /^<command-name>([^<]*)<\/command-name>/.exec(t);
      if (cmd) { out.push('system', cmd[1].trim()); continue; }
      if (t.startsWith('<local-command-')) continue;   // a slash command's own output
      out.push('user', t);
    }
    return out.items;
  }
  if (!Array.isArray(content)) {
    if (typeof content === 'string') out.push('assistant', content);
    return out.items;
  }
  for (const b of content) {
    if (!isRec(b)) continue;
    if (b.type === 'text') out.push('assistant', str(b.text));
    else if (b.type === 'tool_use') out.push('tool', toolSummary(str(b.name) || 'tool', b.input), true);
    // thinking / redacted_thinking: never shown.
  }
  return out.items;
}

// ─── Codex ───────────────────────────────────────────────────────────────────

function joinContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.map((c) => (isRec(c) ? str(c.text) : '')).filter(Boolean).join('\n');
}

export function normalizeCodex(rec: unknown, offset: number): HistoryItem[] {
  if (!isRec(rec)) return [];
  const p = isRec(rec.payload) ? rec.payload : null;
  if (!p) return [];
  const out = new Out(offset, toMs(rec.timestamp));
  if (rec.type === 'event_msg') {
    if (p.type === 'item_completed' && isRec(p.item)) {
      const it = p.item;
      switch (it.type) {
        case 'UserMessage': out.push('user', joinContent(it.content)); break;
        case 'AgentMessage': out.push('assistant', joinContent(it.content)); break;
        case 'CommandExecution': {
          const parsed = Array.isArray(it.parsed_cmd)
            ? it.parsed_cmd.map((c) => (isRec(c) ? str(c.cmd) : '')).filter(Boolean).join(' ; ')
            : '';
          const argv = Array.isArray(it.command) ? it.command.filter((x): x is string => typeof x === 'string') : [];
          const cmd = parsed || argv[argv.length - 1] || str(it.command);
          const code = typeof it.exit_code === 'number' && it.exit_code !== 0 ? ` (exit ${it.exit_code})` : '';
          out.push('tool', `shell: ${cmd}${code}`, true);
          break;
        }
        case 'FileChange': {
          const files = isRec(it.changes) ? Object.keys(it.changes) : [];
          out.push('tool', `edit: ${files.join(', ') || '(files)'}`, true);
          break;
        }
        case 'McpToolCall': {
          const name = [str(it.server), str(it.tool)].filter(Boolean).join('.') || 'mcp';
          out.push('tool', toolSummary(name, it.arguments), true);
          break;
        }
        case 'Extension': {
          if (it.kind === 'web.search') out.push('tool', `web search: ${str(it.query)}`, true);
          else out.push('tool', str(it.kind) || 'extension', true);
          break;
        }
        case 'ContextCompaction': out.push('system', 'Context compacted'); break;
        // Reasoning, and anything unknown: not shown.
      }
      return out.items;
    }
    // Legacy rollouts (older Codex) wrote the conversation as these.
    if (p.type === 'user_message') out.push('user', str(p.message));
    else if (p.type === 'agent_message') out.push('assistant', str(p.message));
    return out.items;
  }
  if (rec.type === 'response_item') {
    // `message` items duplicate item_completed and carry injected developer/environment
    // context, so they are skipped. Legacy tool calls are kept as one line.
    if (p.type === 'function_call') out.push('tool', toolSummary(str(p.name) || 'tool', p.arguments), true);
    else if (p.type === 'local_shell_call') {
      const action = isRec(p.action) ? p.action : {};
      const argv = Array.isArray(action.command) ? action.command.filter((x): x is string => typeof x === 'string') : [];
      out.push('tool', `shell: ${argv.join(' ')}`, true);
    }
    return out.items;
  }
  return [];
}

// ─── Antigravity ─────────────────────────────────────────────────────────────

function agyUserText(s: string): string {
  const req = /<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/.exec(s);
  if (req) return req[1];
  return s
    .replace(/<ADDITIONAL_METADATA>[\s\S]*?<\/ADDITIONAL_METADATA>/g, '')
    .replace(/<USER_SETTINGS_CHANGE>[\s\S]*?<\/USER_SETTINGS_CHANGE>/g, '');
}

export function normalizeAgy(rec: unknown, offset: number): HistoryItem[] {
  if (!isRec(rec)) return [];
  const out = new Out(offset, toMs(rec.created_at));
  switch (rec.type) {
    case 'USER_INPUT': out.push('user', agyUserText(str(rec.content))); break;
    case 'PLANNER_RESPONSE': {
      if (typeof rec.content === 'string') out.push('assistant', stripClaudeInjected(rec.content));
      if (Array.isArray(rec.tool_calls)) {
        for (const tc of rec.tool_calls) {
          if (!isRec(tc)) continue;
          out.push('tool', toolSummary(str(tc.name) || 'tool', tc.args), true);
        }
      }
      break;
    }
    case 'CHECKPOINT': out.push('system', 'Context checkpoint'); break;
    // GENERIC (tool output) and SYSTEM_MESSAGE: not shown.
  }
  return out.items;
}

const BY_PROVIDER: Record<HistoryProvider, (rec: unknown, offset: number) => HistoryItem[]> = {
  claude: normalizeClaude,
  codex: normalizeCodex,
  antigravity: normalizeAgy
};

/** Parse and normalise one transcript line. A malformed line yields nothing. */
export function normalizeLine(provider: HistoryProvider, line: string, offset: number): HistoryItem[] {
  if (!line) return [];
  let rec: unknown;
  try { rec = JSON.parse(line); } catch { return []; }
  return BY_PROVIDER[provider](rec, offset);
}
