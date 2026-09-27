/**
 * The Hive — the on-disk multi-agent coordination layer.
 *
 * Lives under `<harnessHome>/hive/` as a single git repo that ONLY this main
 * process commits to (agents never call git — they just write files). See
 * HIVE.md for the full design. Responsibilities:
 *   - per-agent workspace (identity.md, memory.md, inbox/, outbox/, cursor.json)
 *   - hive identity (registry.json: id/role/cwd/session — what agents read),
 *     separate from the UI floor roster (`<harnessHome>/roster.json`)
 *   - shared blackboard (board.md), task ledger, and an append-only event log (log.jsonl)
 *   - a router that drains each agent's outbox into recipients' inboxes
 *
 * Human-in-the-loop is native to each agent's Claude Code session: permission
 * prompts surface in the agent's own terminal (and can be approved remotely via
 * `/remote-control`). The hive keeps no separate approval queue — a message aimed
 * at "human" is routed to the god/orchestrator, the human's proxy on the floor.
 *   - single-committer git with retry/backoff + stale-lock recovery
 *
 * Everything here runs in the Electron main process.
 */
import {
  existsSync, mkdirSync, readFileSync, writeFileSync, renameSync,
  readdirSync, statSync, lstatSync, realpathSync, rmSync, appendFileSync,
  symlinkSync, unlinkSync, copyFileSync, cpSync, chmodSync
} from 'node:fs';
import { join, dirname, basename, isAbsolute, relative } from 'node:path';
import { homedir } from 'node:os';
import { grokThemeEnv } from '../shared/grokTheme';
import { spawnSync, spawn, type ChildProcess } from 'node:child_process';
import { randomBytes, createHash } from 'node:crypto';
import type { AgentUsageSample } from './usage';
import type { MemoryIndexRow } from './memoryIndex';
import { COMMAND_GROUPS } from '../shared/claudeCommands';
import { pushSessionHistory } from '../shared/resumeKey';
import { normalizeClaudeOutputStyle } from '../shared/outputStyle';
import {
  isClaudeProvider,
  isHiveAwareProvider,
  canReceiveInbox,
  providerPreset,
  bridgeOf,
  type AgentProvider
} from '../shared/agentProvider';
import { MCP_CATALOG } from '../shared/mcpCatalog';
import { selectBroadcastTargets } from '../shared/broadcast';
import { preferredAgentRole } from '../shared/agentRole';
import { applyTaskPatches, mergeTaskLedger } from '../shared/taskLedger';
import { assignTicketKeys, isTicketPrefix, readTicketMeta, resolveTask, type TicketMeta } from '../shared/ticketKeys';
import { stampTaskTimes } from '../shared/taskTimes';
import { entryForMessage, type ActivityEntry } from '../shared/activity';
import { expandTilde } from './fs';
import { resolveGodName } from '../shared/godIdentity';
import {
  AGENT_IGNORE_LINES, HIVE_IGNORE_LINES, REPO_SIZE_WARN_BYTES, boundGcMemory, ignoreOversized,
  mergeIgnoreLines, packedBytes, untrackIgnored, type GitRun, type RepoFs
} from '../shared/hiveRepo';
import { HIVE_COMPACT_SCRIPT } from '../shared/hiveCompact';

/** The subset of HarnessConfig the hive consumes for the default-MCP merge.
 *  Kept as a local shape so hive.ts never imports the foundation-owned config
 *  module just for a type. */
type McpDefaultsMap = { [id: string]: { enabled: boolean } } | undefined;

// ─── Types ──────────────────────────────────────────────────────────────────

export type MessageAct = 'request' | 'inform' | 'propose' | 'query' | 'agree' | 'refuse' | 'done';

export interface HiveMessage {
  id: string;
  conversation: string;
  in_reply_to: string | null;
  from: string;
  to: string;                 // an agentId, 'god', or 'broadcast'
  act: MessageAct;
  subject: string;
  body: string;
  hops: number;
  requires_reply: boolean;
  needs_human: boolean;
  created_at: string;
}

/** What the Pro rail's badge needs about one agent's mail to the person:
 *  how many since the person last opened that agent, when the newest came,
 *  and the first three, short (0.5.3, F25). */
export interface HumanMailSummary {
  count: number;
  latest: string;
  texts: { id: string; at: string; subject: string; body: string }[];
}

/** One hive message reshaped for the voice read-layer (`hive:messages`): the
 *  operator-briefing view of an inbox/outbox message. `subject` and `body` are
 *  REDACTED main-side (see {@link redactSecrets}) before this ever leaves the
 *  main process — the renderer/voice layer never sees a raw body, and never a
 *  secret. PII-free + secret-free by construction. */
export interface VoiceMessage {
  id: string;
  conversation: string;
  from: string;
  to: string;
  act: MessageAct;
  /** REDACTED subject line. */
  subject: string;
  /** REDACTED message body. */
  body: string;
  requires_reply: boolean;
  /** Which mailbox folder this copy was read from, relative to `owner`. */
  direction: 'inbox' | 'outbox';
  /** The agent whose mailbox this copy lives in. */
  owner: string;
  /** True when read from an archived/handled subfolder (inbox/.done, outbox/.sent). */
  archived: boolean;
  created_at: string;
}

/** One question→answer exchange with the human, recorded ON the task card so
 *  the decision trail stays with the work it unblocked. */
export interface HumanQA {
  q: string;
  a?: string;
  askedAt?: string;
  answeredAt?: string;
  dismissedAt?: string;
  /** The agent whose question this is (0.5.3); scopes it to that agent's tab. */
  from?: string;
}

export interface HiveTask {
  /** The ticket key the harness assigns (V53-299), or an older card's own id. */
  id: string;
  /** The id a writer gave the card before the harness keyed it (0.5.3). A
   *  dependsOn, blockedBy or humanQA naming it still resolves (resolveTask). */
  alias?: string;
  title: string;
  description?: string;
  assignee?: string;
  status: 'todo' | 'doing' | 'blocked' | 'done';
  dependsOn: string[];
  priority: number;
  createdAt: string;
  /** First-class human feedback: the god appends {q} when a card can only
   *  proceed with the human's input (status goes blocked); the harness UI
   *  fills in {a}. The full history stays on the card forever. */
  humanQA?: HumanQA[];
  /** Outcome summary, surfaced by the Slack done-notifier when this card reaches
   *  'done'. Optional; the notifier falls back to description/title. */
  result?: string;
  /** Set when this task originated from a Slack message — the thread the
   *  done-summary reply is posted back into. Consumed OUTBOUND only; populating
   *  it is the inbound/kanban side's job and does not affect routing. */
  slack?: { channel: string; thread_ts: string };
  /** Set when this task originated from a generic webhook POST. Stores the SHA-256
   *  of the capability token (never the raw token — that's returned to the caller
   *  once and never persisted), so a GET status lookup can match by hashing the
   *  presented token. Read-only capability: it never widens routing or exposure. */
  webhook?: { tokenHash: string };
}

export interface AgentMeta {
  id: string;
  name: string;
  /** Which CLI this agent runs on. Defaults to 'claude' when unset (legacy). */
  provider?: AgentProvider;
  role?: string;
  capabilities?: string[];
  cwd: string;
  isGod?: boolean;
  /** Michael's prep assistant — enriches prompts and forwards them to Michael.
   *  Send-only: excluded from broadcast fan-out so it never drains an inbox. */
  isAssistant?: boolean;
}

export interface RegistryAgent extends AgentMeta {
  status: 'idle' | 'working' | 'blocked' | 'gone';
  lastSeen: number;
  /** True once the agent's terminal/PTY tab is closed. The record is retained
   *  (not deleted) so its history/memory survive; only agents with a live PTY
   *  are 'active'. Broadcast fan-out + roster reads skip archived agents. */
  archived?: boolean;
  /** The human has this agent 1:1 and Michael must leave it alone until they
   *  flip it back. Held agents stay ACTIVE and keep their terminal — this is
   *  "do not dispatch to them", not "they are gone", which is why it is its own
   *  flag rather than a reuse of `archived` or a breaker level. */
  onHold?: boolean;
  /** Most recent Claude Code session_id seen for this agent (Lane A #6.6a),
   *  captured from hook payloads. Doubles as the `--resume` key (idempotent
   *  resume after a crash/restart) AND the cost accounting/dedup key on every
   *  AgentUsageSample / cost-ledger row. */
  sessionId?: string;
  /** The keys `sessionId` displaced, most recent first, bounded (0.5.3 bug 1).
   *  The current key is not always the agent's conversation: see
   *  shared/resumeKey.ts. A restart walks these when the current key has no
   *  transcript, so the real session is still findable. */
  sessionHistory?: string[];
  /** Whether `cwd` is actually usable for a (re)spawn — i.e. an ABSOLUTE path
   *  that exists as a directory. Computed + persisted at spawn so the roster
   *  reliably exposes each worker's environment validity. A non-absolute fragment
   *  (e.g. "ClaudeTerminalHarness") spawns into a nonexistent dir and fails; this
   *  flag makes that visible instead of letting it slip through silently. */
  cwdValid?: boolean;
}

export interface Registry {
  godId: string | null;
  agents: Record<string, RegistryAgent>;
}

/** Build env + extra spawn args that make an agent process hive-aware. */
export interface SpawnInjection {
  args: string[];
  env: Record<string, string>;
  /** The hive-protocol seed to TYPE into the TUI after boot rather than pass on
   *  argv — set only for `seedDelivery:'type-into-tui'` providers (Crush), whose
   *  bare TUI rejects a positional seed. The renderer types it through the same
   *  per-pty write-chain as the inbox-wake nudge. (ondev-b) */
  seedPrompt?: string;
  /** Set when the agent spawned in a DEGRADED posture the user should know about
   *  (today: the proxy-bridge sidecar never bound after retries, so a proxy-tier
   *  agent such as Crush runs without hive events). Human-readable, one line. */
  degraded?: string;
}

const HOP_CAP = 12;

function sleepSync(ms: number): void {
  const sab = new SharedArrayBuffer(4);
  Atomics.wait(new Int32Array(sab), 0, 0, ms);
}

/** Filesystem- and sort-safe timestamp, e.g. 2026-05-30T14-03-11-123Z. */
function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function shortRand(): string {
  return randomBytes(3).toString('hex');
}

/** Non-memory files `mempalace mine` must not ingest (Claude Code hooks config,
 *  cursor, raw inbox/outbox JSON). `mempalace mine` honors .gitignore, so we drop
 *  one in each agent dir; written on birth here and refreshed by the mine loop.
 *
 *  `.codex/` is here for a second reason as well, and it is the load-bearing one:
 *  a Codex worker's CODEX_HOME lives INSIDE its agent dir (see installCodexHooks —
 *  Codex can only be given hooks through a config.toml in its own home, so it
 *  cannot share the user's ~/.codex). Codex then fills that folder with full
 *  session transcripts, an 80MB+ logs sqlite and a plugin cache, and the hive's
 *  git repo was faithfully versioning every revision of all of it. Twenty Codex
 *  agents took the hive's .git to 7.5GB, at which point git's own auto-gc tried to
 *  repack it and took 22GB of RAM doing so — the machine swapped, the app stopped
 *  responding. None of it was ever wanted in history: it is Codex's private
 *  scratch state, and it stays on disk (so resume still works) either way. */
/** Proxy-bridge sidecar bind attempts per spawn, and the pause before each retry. */
const PROXY_BIND_ATTEMPTS = 3;
const PROXY_BIND_BACKOFF_MS = [250, 750];

/** Idempotently ensure `<agentDir>/.gitignore` excludes the non-memory files.
 *  Append-only: writes only the missing lines, leaving any existing entries.
 *  The list lives in shared/hiveRepo.ts beside the hive root's, because the
 *  untrack pass reads whatever these files say rather than a path list. */
function ensureMineIgnore(agentDir: string): void {
  const path = join(agentDir, '.gitignore');
  let existing = '';
  try { if (existsSync(path)) existing = readFileSync(path, 'utf8'); } catch { return; }
  const merged = mergeIgnoreLines(existing, AGENT_IGNORE_LINES);
  if (merged === null) return;
  try { writeFileSync(path, merged, 'utf8'); } catch { /* best-effort */ }
}

/**
 * Strip secret-shaped substrings out of free text before it leaves the main
 * process toward the voice / renderer layer. This is the MAIN-SIDE privacy gate
 * for the voice read-layer's message-content path (`hive:messages`): a message
 * body can quote a key, paste a token, or echo a credential, so every body and
 * subject is run through this before it crosses IPC. The renderer holds ZERO
 * redaction policy — it only ever receives the already-cleaned string.
 *
 * Deliberately CONSERVATIVE: it matches known credential SHAPES (provider key
 * prefixes, JWTs, PEM private keys, bearer tokens) and sensitive key=value /
 * key: value assignments, then replaces the secret with `[redacted]`. It does
 * NOT blanket-redact on entropy, so operator-meaningful content the briefing
 * needs — git SHAs, agent ids, file paths, ordinary prose — survives intact.
 * Over-redaction (e.g. a non-secret `apikey:openai` ref) is acceptable; leaking
 * a real secret is not.
 *
 * LOCKSTEP: the regex battery below is mirrored character-identically in
 * test/voice-messages.test.cjs (a .cjs test cannot import this TS module). If
 * you change a pattern here, mirror it there — the test is what PROVES a
 * secret-shaped value is stripped.
 */
export function redactSecrets(text: unknown): string {
  if (typeof text !== 'string' || !text) return typeof text === 'string' ? text : '';
  let s = text;
  // 1. PEM private-key blocks (RSA/EC/OPENSSH/PGP — header through footer).
  s = s.replace(/-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]*PRIVATE KEY-----/g, '[redacted]');
  // 2. JSON Web Tokens — three base64url segments separated by dots.
  s = s.replace(/\beyJ[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}/g, '[redacted]');
  // 3. Known credential prefixes: OpenAI/Anthropic (sk-, sk-ant-), Slack
  //    (xoxb/xoxp/xoxa/xoxr/xoxs-, xapp-), GitHub (ghp_/gho_/ghu_/ghs_/ghr_,
  //    github_pat_), AWS access-key ids (AKIA…), Google API keys (AIza…).
  s = s.replace(
    /(?:sk-(?:ant-)?[A-Za-z0-9_-]{16,}|xox[bpaors]-[A-Za-z0-9-]{10,}|xapp-[A-Za-z0-9-]{10,}|gh[posru]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|AIza[A-Za-z0-9_-]{20,})/g,
    '[redacted]'
  );
  // 4. Bearer tokens — keep the label, drop the credential.
  s = s.replace(/\b(bearer)\s+[A-Za-z0-9._~+/=-]{8,}/gi, '$1 [redacted]');
  // 5. Sensitive key = value / key: value — keep the key name, drop the value.
  //    An optional namespace prefix (aws_, gcp_, …) is folded into the captured
  //    key so a LABELED secret survives the \b boundary: `aws_secret_access_key`
  //    is all word chars, so a bare `\b(secret)\b` never sees it. Listing
  //    secret_access_key / private_key alone is not enough — the prefix run is
  //    what lets `aws_secret_access_key=…` (no AKIA shape on the value) redact.
  s = s.replace(
    /\b((?:[a-z0-9]+[_-])*(?:api[_-]?key|secret[_-]?access[_-]?key|secret|token|password|passwd|pwd|access[_-]?token|refresh[_-]?token|client[_-]?secret|signing[_-]?secret|webhook[_-]?secret|auth[_-]?token|bot[_-]?token|private[_-]?key))(\s*[:=]\s*)(["']?)[^\s"',}]{6,}\3/gi,
    (_m, k) => `${k}=[redacted]`
  );
  return s;
}

// ─── HiveManager ────────────────────────────────────────────────────────────

/**
 * The Teams bridge, as the router sees it (plan 4.6, extended by 0.4.9's
 * nickname). hive.ts never imports the bridge, so a solo build has an empty
 * object here and every branch that needs it falls through to a bounce.
 *
 * `resolve` answers a `to` that is neither an agent on this floor nor a
 * `member:` address: a teammate's own name, or the nickname their orchestrator
 * goes by. It is synchronous because routing is, so a roster that has not been
 * read yet answers null and starts the read rather than blocking the message.
 */
export interface RemoteBridge {
  send?: (msg: HiveMessage) => void;
  rosterLine?: () => string | null;
  resolve?: (name: string) => { memberId: string } | { ambiguous: string[] } | null;
}

/**
 * Repair only literal CR/LF characters that occur inside JSON strings.
 *
 * Agents normally publish outbox messages through JSON.stringify, but a manual
 * shell write can put real line-break bytes in a multi-line body. JSON rejects
 * those bytes inside a string even though the intended value is unambiguous.
 * Keep this lexical and deliberately narrow: JSON.parse remains the acceptance
 * gate, and every other malformed shape is left for quarantine.
 */
function repairLiteralLineBreaksInJsonStrings(raw: string): { text: string; changed: boolean } {
  let text = '';
  let inString = false;
  let escaped = false;
  let changed = false;

  for (const ch of raw) {
    if (!inString) {
      text += ch;
      if (ch === '"') inString = true;
      continue;
    }

    if (escaped) {
      text += ch;
      escaped = false;
      continue;
    }

    if (ch === '\\') {
      text += ch;
      escaped = true;
      continue;
    }

    if (ch === '"') {
      text += ch;
      inString = false;
      continue;
    }

    if (ch === '\n') {
      text += '\\n';
      changed = true;
      continue;
    }

    if (ch === '\r') {
      text += '\\r';
      changed = true;
      continue;
    }

    text += ch;
  }

  return { text, changed };
}

/** The person's Grok config, read and never written. Missing is normal. */
function readGrokConfigToml(): string | null {
  try { return readFileSync(join(process.env.GROK_HOME || join(homedir(), '.grok'), 'config.toml'), 'utf8'); } catch { return null; }
}

/** The name of the per user shim bundle: a short hash over every file in it
 *  (name and text), so two app versions whose shim or launcher text differ get
 *  two bundles side by side and an older floor is never handed a newer shim.
 *  Pure, so a test can predict the directory from the texts on disk. */
export function shimBundleHash(files: Record<string, string>): string {
  const h = createHash('sha256');
  for (const name of Object.keys(files).sort()) h.update(name).update('\0').update(files[name]).update('\0');
  return h.digest('hex').slice(0, 16);
}

export class HiveManager {
  /**
   * @param getHome  Lazily resolve harnessHome so the hive follows config changes.
   * @param emit     Optional sink for renderer-facing events (set by the main
   *                 process to `webContents.send`). Used to animate routed
   *                 messages on the office floor; a no-op in tests/headless.
   */
  constructor(
    private getHome: () => string | null,
    private emit?: (channel: string, payload: unknown) => boolean | void
  ) {}

  private routerTimer: NodeJS.Timeout | null = null;

  /** A nickname claimed on the relay before this machine had a workspace. Held
   *  until `ensureHive` has somewhere to write it. See `presetGodName`. */
  private pendingGodName: string | null = null;

  /** The embedded OTLP collector's loopback URL, set by the main process once the
   *  collector is bound (telemetry.ts). null = telemetry off → no OTel env is
   *  injected at spawn (the transcript reconciler remains the cost source). */
  private _otelEndpoint: string | null = null;
  /** Point newly-spawned agents at the live telemetry collector. Call after the
   *  collector starts; only affects spawns made afterwards. */
  setOtelEndpoint(url: string | null): void {
    this._otelEndpoint = url;
  }
  /** The collector URL agents are pointed at, or null when telemetry is off. */
  otelEndpoint(): string | null {
    return this._otelEndpoint;
  }

  /** What the app running this hive actually IS: its version, and whether it is a
   *  packaged build or a local dev run.
   *
   *  Agents could not see this before, and it cost real time. A multi-agent
   *  investigation into anomalous file modes ran for hours before the explanation
   *  turned out to be that the operator had quit a downloaded build and started a
   *  local one, which inherits the launching shell's umask instead of Finder's
   *  022. No agent could observe that, several published conclusions had to be
   *  withdrawn, and log.jsonl carried no app-start marker to notice the switch
   *  from either. */
  private _runtime: { version: string; packaged: boolean; appPath?: string } | null = null;
  setRuntimeInfo(info: { version: string; packaged: boolean; appPath?: string } | null): void {
    this._runtime = info;
  }
  runtimeInfo(): { version: string; packaged: boolean; appPath?: string } | null {
    return this._runtime;
  }

  /** Whether config.orchestratorMaySpawn is on, mirrored here so the prompt
   *  builder can decide whether to tell god the spawn queue is available. Set at
   *  bootstrap and on every config write; hive.ts deliberately does not import
   *  the config module. */
  private _maySpawn = true;
  setOrchestratorMaySpawn(on: boolean): void {
    this._maySpawn = on;
  }
  orchestratorMaySpawn(): boolean {
    return this._maySpawn;
  }

  /** Settings > Tasks: the ticket key prefix the person chose, mirrored here
   *  from config like orchestratorMaySpawn. null = the one in tasks.json, else
   *  derived from the workspace folder name. */
  private _ticketPrefix: string | null = null;
  setTicketPrefix(prefix: string | null | undefined): void {
    this._ticketPrefix = isTicketPrefix(prefix) ? prefix : null;
  }
  /** The ticket meta for a tasks.json object: its own, the chosen prefix over it. */
  ticketMeta(file: unknown): TicketMeta {
    const meta = readTicketMeta(file, basename(this.getHome() ?? ''));
    return this._ticketPrefix ? { ...meta, prefix: this._ticketPrefix } : meta;
  }
  /** The archived cards, so a key number is never handed out twice. */
  private archivedTasks(): unknown[] {
    const root = this.root();
    if (!root) return [];
    const a = this.readJson<{ tasks?: unknown }>(join(root, 'tasks-archive.json'), { tasks: [] });
    return Array.isArray(a?.tasks) ? a.tasks : [];
  }
  /** Write the live ledger with its ticket meta, keeping any other top level
   *  field an agent put in the file. Every card that needs a key gets one here,
   *  in the same atomic write as the counter, and every status change is
   *  stamped against the cards on disk (startedAt, doneAt, reopenedAt,
   *  updatedAt; 0.5.3 date filter). */
  private writeLedger(path: string, current: unknown, cards: unknown[]): unknown[] {
    const keyed = assignTicketKeys(cards, this.ticketMeta(current), this.archivedTasks());
    const base = current && typeof current === 'object' && !Array.isArray(current) ? current as Record<string, unknown> : {};
    const prev = Array.isArray(base.tasks) ? base.tasks as unknown[] : [];
    const { tasks } = stampTaskTimes(prev, keyed.tasks, new Date().toISOString());
    this.writeJson(path, { ...base, tasks, ticket: keyed.meta });
    if (path === this.livePath()) this.tasksSeen = tasks;
    return tasks;
  }
  private livePath(): string | null {
    const root = this.root();
    return root ? join(root, 'tasks.json') : null;
  }

  /** Agents edit tasks.json by hand. On each router tick, when the file has
   *  changed since we last saw it, key any card an agent wrote without one
   *  (0.5.3 ticket keys), and stamp the status changes the agent made against
   *  the board as we last saw it (0.5.3 task times). The first look after a
   *  start only remembers the board: with nothing to compare against, a stamp
   *  would put every card in Today. Returns how many cards were keyed. */
  private tasksSeenMtime = 0;
  private tasksSeen: unknown[] | undefined;
  keyAgentTasks(): number {
    const root = this.root();
    if (!root) return 0;
    const path = join(root, 'tasks.json');
    let mtime = 0;
    try { mtime = statSync(path).mtimeMs; } catch { return 0; }
    if (mtime === this.tasksSeenMtime) return 0;
    let current: unknown;
    try { current = JSON.parse(readFileSync(path, 'utf8')); } catch { return 0; } // mid write or hand broken: next tick
    const cards = current && typeof current === 'object' && Array.isArray((current as { tasks?: unknown }).tasks) ? (current as { tasks: unknown[] }).tasks : null;
    if (!cards) { this.tasksSeenMtime = mtime; return 0; }
    const keyed = assignTicketKeys(cards, this.ticketMeta(current), this.archivedTasks());
    const hasMeta = !!(current as { ticket?: unknown }).ticket;
    const stamped = this.tasksSeen ? stampTaskTimes(this.tasksSeen, keyed.tasks, new Date().toISOString()) : { tasks: keyed.tasks, changed: false };
    this.tasksSeen = stamped.tasks;
    if (!keyed.changed && !stamped.changed && hasMeta) { this.tasksSeenMtime = mtime; return 0; }
    const before = cards.filter((c, i) => c !== keyed.tasks[i]).length;
    this.writeJson(path, { ...(current as Record<string, unknown>), tasks: stamped.tasks, ticket: keyed.meta });
    try { this.tasksSeenMtime = statSync(path).mtimeMs; } catch { /* next tick */ }
    if (before) {
      this.appendLog({ kind: 'tasks-keyed', count: before });
      this.commit(`hive: keyed ${before} task(s)`);
    }
    return before;
  }

  // — paths —
  root(): string | null {
    const home = this.getHome();
    return home ? join(home, 'hive') : null;
  }
  enabled(): boolean {
    return this.root() !== null;
  }
  private agentDir(id: string): string {
    return join(this.root()!, 'agents', id);
  }
  /** IPC endpoint the cth-hook shim talks to (Phase 1 autonomy).
   *  On POSIX this is a Unix-domain socket file under the hive root. On Windows,
   *  Node's `net` IPC uses named pipes (a flat `\\.\pipe\` namespace, not the
   *  filesystem), so a raw file path fails to bind with EACCES — derive a stable,
   *  per-root pipe name instead. Both the server (`listen`) and the shim
   *  (`createConnection`) read this same value, so they stay in sync. */
  sockPath(): string | null {
    const root = this.root();
    if (!root) return null;
    if (process.platform === 'win32') {
      const id = createHash('sha1').update(root).digest('hex').slice(0, 12);
      return `\\\\.\\pipe\\munder-difflin-${id}`;
    }
    return join(root, 'hooks.sock');
  }
  private shimPath(): string | null {
    const root = this.root();
    return root ? join(root, 'bin', 'cth-hook.cjs') : null;
  }
  /** The proxy-bridge sidecar (qwen). Pure-Node loopback reverse-proxy that
   *  observes a hookless CLI's LLM traffic and synthesizes the same HIVE_SOCK
   *  payloads the hook shims emit. Written in ensureHive alongside cth-hook.cjs. */
  private proxyShimPath(): string | null {
    const root = this.root();
    return root ? join(root, 'bin', 'hive-proxy.cjs') : null;
  }

  /**
   * The BUNDLED-NODE launcher: `<root>/bin/hive-node` (POSIX) / `hive-node.cmd`
   * (Windows). Every `.cjs` shim in the hive is executed through it.
   *
   * Why it exists: hooks are run by the agent CLI through a plain
   * `/bin/sh -c` with a bare `PATH=/usr/bin:/bin:/usr/sbin:/sbin`. A user whose
   * node comes from nvm (PATH set only by an interactive login shell) has NO node
   * there, so a hook written as `node "<shim>"` exits **127 — command not found**
   * and every payload is silently lost: no live status, no Stop→inbox drain, no
   * session ids. Electron's own binary IS a full Node runtime under
   * `ELECTRON_RUN_AS_NODE=1`, and it is guaranteed present (it is us).
   *
   * A wrapper SCRIPT rather than an inline `ELECTRON_RUN_AS_NODE=1 "<exe>" …`
   * prefix because that prefix is POSIX-sh syntax — it is a hard error under
   * cmd.exe, which is what runs hook commands on Windows. The wrapper also gives
   * agents a `$HIVE_NODE` they can invoke directly (running the Electron binary
   * WITHOUT the env var would launch a second app window, not a script).
   *
   * Rewritten on every bootstrap, so an app update/move re-bakes execPath.
   */
  private nodeLauncherPath(): string | null {
    const root = this.root();
    if (!root) return null;
    return join(root, 'bin', process.platform === 'win32' ? 'hive-node.cmd' : 'hive-node');
  }

  /** Write the launcher described above. Best-effort: on failure callers fall
   *  back to bare `node`, i.e. exactly the pre-fix behavior. */
  private writeNodeLauncher(): void {
    const p = this.nodeLauncherPath();
    if (!p) return;
    try {
      if (process.platform === 'win32') {
        writeFileSync(p, `@echo off\r\nset ELECTRON_RUN_AS_NODE=1\r\n"${process.execPath}" %*\r\n`, 'utf8');
      } else {
        writeFileSync(p, `#!/bin/sh\nELECTRON_RUN_AS_NODE=1 exec "${process.execPath}" "$@"\n`, 'utf8');
        chmodSync(p, 0o755);
      }
    } catch (e) {
      console.error('[hive] writeNodeLauncher failed:', e);
    }
  }

  /** The launcher path if it is actually on disk, else null (→ callers fall back
   *  to bare `node`, i.e. exactly the pre-fix behavior — never worse than before). */
  private nodeLauncher(): string | null {
    const p = this.nodeLauncherPath();
    return p && existsSync(p) ? p : null;
  }

  /** The ABSOLUTE bundled-node command to BAKE into any text an agent is expected
   *  to run (`<launcher> <script> …`), falling back to bare `node`.
   *
   *  Exactly the value of the agent's `HIVE_NODE` env var — but agent-facing text
   *  must never spell it as `$HIVE_NODE`: that is POSIX shell syntax. A Windows
   *  agent runs its commands through cmd.exe/PowerShell, where `$HIVE_NODE`
   *  expands to NOTHING (cmd) or to an undefined variable (PowerShell), so every
   *  such instruction is dead on arrival there. The absolute path is correct on
   *  every platform and needs no expansion at all. */
  nodeCommand(): string {
    return this.nodeLauncher() ?? 'node';
  }

  /**
   * `<root>/bin/runtime` — the same bundled-node trick as `hive-node`, but the
   * wrapper is NAMED `node`, so anything that resolves `node` off PATH finds one.
   *
   * `hive-node` only covers commands WE generate. It does nothing for node that
   * the agent's own work needs at runtime: an MCP server declared as
   * `node ./server.js`, a provider CLI that shells out to node, a `.cjs` helper an
   * agent wrote itself. On a machine with no system node those all die with 127
   * exactly like the hooks did.
   *
   * This dir is APPENDED to the agent's PATH (see pty.spawn), never prepended: a
   * user who has their own node keeps their own version — we are strictly the
   * fallback. Prepending would silently swap every agent's node for Electron's
   * (20.18.1 as of Electron 32.3.3) underneath the user's own projects.
   *
   * NOTE: `node` only — deliberately no `npm`/`npx`. Electron bundles the Node
   * RUNTIME, not the npm CLI (which is ~12MB of JS we do not ship), so an `npm`
   * wrapper here could only be a stub that fails confusingly. A missing `npm` is
   * the honest signal; the install ladder (main/cliInstall.ts) detects it and
   * installs a REAL system Node — which brings npm with it. This shim is only the
   * last resort for when that install could not run (offline, or a platform with
   * no official installer).
   */
  runtimeBinDir(): string | null {
    const root = this.root();
    return root ? join(root, 'bin', 'runtime') : null;
  }

  /** Write the `node` shim described above. Best-effort: on failure the dir is
   *  simply absent from PATH and behavior is exactly as before. */
  private writeRuntimeShims(): void {
    const dir = this.runtimeBinDir();
    if (!dir) return;
    try {
      mkdirSync(dir, { recursive: true });
      if (process.platform === 'win32') {
        writeFileSync(
          join(dir, 'node.cmd'),
          `@echo off\r\nset ELECTRON_RUN_AS_NODE=1\r\n"${process.execPath}" %*\r\n`,
          'utf8'
        );
      } else {
        const p = join(dir, 'node');
        writeFileSync(p, `#!/bin/sh\nELECTRON_RUN_AS_NODE=1 exec "${process.execPath}" "$@"\n`, 'utf8');
        chmodSync(p, 0o755);
      }
    } catch (e) {
      console.error('[hive] writeRuntimeShims failed:', e);
    }
  }

  /** Build a hook command string that runs `script` under the guaranteed node,
   *  DOUBLE-QUOTED (safe for paths with spaces). */
  private nodeRun(script: string, ...args: string[]): string {
    const launcher = this.nodeLauncher();
    return [launcher ? `"${launcher}"` : 'node', `"${script}"`, ...args].join(' ');
  }

  /** Same, but UNQUOTED — only for configs or platforms that cannot preserve
   *  embedded quotes. POSIX JSON hook configs must use nodeRun() because the
   *  user-selected hive path may legitimately contain spaces. */
  private nodeRunUnquoted(script: string, ...args: string[]): string {
    return [this.nodeLauncher() ?? 'node', script, ...args].join(' ');
  }

  /**
   * The FLOOR INDEPENDENT home of the hook shims that live in a user's GLOBAL
   * CLI config (agy's `~/.gemini/…/hooks.json`, Grok's `~/.grok/hooks/`). Set by
   * the main process to `app.getPath('appData')/munder-difflin/shared/bin`;
   * hive.ts deliberately does not import electron. null (tests, headless) keeps
   * the legacy per floor path.
   *
   * Why: those hook files are one per USER, but the shim they named lived under
   * `<hive root>/bin/`, one per FLOOR. Two floors wrote the same text to two
   * paths and the last writer won the hook file; the hook then broke the moment
   * that floor's hive was moved or deleted, or when the two floors ran different
   * app versions (B23 point 5). The shim reads the socket from the agent's own
   * HIVE_SOCK env, never from the file, so one shared copy serves every floor.
   */
  private _sharedBinDir: string | null = null;
  setSharedBinDir(dir: string | null): void {
    this._sharedBinDir = dir;
  }
  sharedBinDir(): string | null {
    return this._sharedBinDir;
  }

  /** The launcher text `writeNodeLauncher` bakes: it carries process.execPath,
   *  so it is part of the bundle hash (a moved or updated app gets a new bundle
   *  rather than overwriting the one a still running floor is using). */
  private nodeLauncherText(): string {
    return process.platform === 'win32'
      ? `@echo off\r\nset ELECTRON_RUN_AS_NODE=1\r\n"${process.execPath}" %*\r\n`
      : `#!/bin/sh\nELECTRON_RUN_AS_NODE=1 exec "${process.execPath}" "$@"\n`;
  }

  /**
   * Write the shared shim bundle (both global config shims plus the bundled
   * node launcher they run under) into the shared bin under ONE content hashed
   * directory and return the paths a hook command for `name` should name.
   * Idempotent: an identical bundle is left untouched, a different text lands
   * in a new directory, nothing is ever deleted. null when no shared dir is
   * configured or the write failed, and the caller stays on the legacy per
   * floor paths (exactly the pre fix behaviour).
   */
  private installSharedShim(name: 'agy-hook.cjs' | 'grok-hook.cjs'): { shim: string; launcher: string } | null {
    const base = this._sharedBinDir;
    if (!base) return null;
    try {
      const launcherName = process.platform === 'win32' ? 'hive-node.cmd' : 'hive-node';
      const files: Record<string, string> = {
        [launcherName]: this.nodeLauncherText(),
        'agy-hook.cjs': AGY_HOOK_SHIM,
        'grok-hook.cjs': GROK_HOOK_SHIM
      };
      const dir = join(base, shimBundleHash(files));
      mkdirSync(dir, { recursive: true });
      for (const [file, body] of Object.entries(files)) {
        const p = join(dir, file);
        let current: string | null = null;
        if (existsSync(p)) { try { current = readFileSync(p, 'utf8'); } catch { current = null; } }
        if (current !== body) writeFileSync(p, body, 'utf8');
        if (file === launcherName && process.platform !== 'win32') chmodSync(p, 0o755);
      }
      return { shim: join(dir, name), launcher: join(dir, launcherName) };
    } catch (e) {
      console.error('[hive] installSharedShim failed:', e);
      return null;
    }
  }

  /** One proxy sidecar per live proxy-tier agent, keyed by agentId. Spawned in
   *  ensureAgent, killed on PTY exit / removeAgent / app quit (index.ts) — so a
   *  dead agent never leaks an orphan loopback listener. */
  private proxyChildren = new Map<string, ChildProcess>();

  // — bootstrap —

  /** Create the hive skeleton + git repo if missing. Idempotent. */
  ensureHive(): void {
    const root = this.root();
    if (!root) return;
    mkdirSync(join(root, 'agents'), { recursive: true });

    // Refreshed each bootstrap, like COMMANDS.md just below. It used to be
    // written only when absent, which meant a hive created once never saw a
    // protocol change again: this repo's own hive still carried the file from
    // the day it was initialised, so every protocol addition since had reached
    // new hives only. The file is generated, not user-authored, and agents are
    // pointed at it as the authority, so a stale copy is worse than a rewrite.
    writeFileSync(join(root, 'PROTOCOL.md'), PROTOCOL_MD, 'utf8');

    const registry = join(root, 'registry.json');
    if (!existsSync(registry)) {
      this.writeJson(registry, { godId: null, agents: {} } as Registry);
    }
    const userCodexHome = join(homedir(), '.codex');
    for (const [id, agent] of Object.entries(this.registry().agents)) {
      const codexHome = join(root, 'agents', id, '.codex');
      if (agent.provider === 'codex' && existsSync(codexHome)) {
        this.exposeCodexDataDirs(codexHome, userCodexHome, id);
      }
    }
    const board = join(root, 'board.md');
    if (!existsSync(board)) {
      writeFileSync(board, '# Hive board\n\n_Shared plans live here. The god agent is the scribe._\n', 'utf8');
    }
    const tasks = join(root, 'tasks.json');
    if (!existsSync(tasks)) this.writeJson(tasks, { tasks: [] });
    const log = join(root, 'log.jsonl');
    if (!existsSync(log)) writeFileSync(log, '', 'utf8');

    // The Claude Code command reference Michael consults (refreshed each bootstrap
    // so it tracks the bundled list).
    writeFileSync(join(root, 'COMMANDS.md'), COMMANDS_MD, 'utf8');

    // Keep the churny/ephemeral live files, and every machine generated tree,
    // out of the hive git repo. The list and the reasoning are in
    // shared/hiveRepo.ts; `repoHygiene` below drops whatever is already in the
    // index, because an ignore line alone does not stop git tracking a file it
    // already tracks.
    const gitignore = join(root, '.gitignore');
    // log.jsonl joined this list in 0.4.10 for exactly the reason the cost
    // ledger is on it: it takes a line per routed message, and `commit()` does
    // `git add -A` on every hive mutation, so the repo was storing a fresh copy
    // of the whole event log constantly.
    // `crashes/` holds raw PTY output from abnormal agent exits. It is
    // DELIBERATELY ignored: that output is whatever the provider printed, which
    // can include tokens, paths and prompt fragments, and the hive repo is
    // committed on every change — a secret written there would be permanent.
    // log.jsonl gets the structured, non-sensitive fields; the dump stays local.
    let existingIgnore = '';
    if (existsSync(gitignore)) { try { existingIgnore = readFileSync(gitignore, 'utf8'); } catch { existingIgnore = ''; } }
    const mergedIgnore = mergeIgnoreLines(existingIgnore, HIVE_IGNORE_LINES);
    if (mergedIgnore !== null) writeFileSync(gitignore, mergedIgnore, 'utf8');

    // The hook shim: a dumb pipe between a `claude` hook and our UDS. Refreshed
    // on every bootstrap so it tracks code changes.
    mkdirSync(join(root, 'bin'), { recursive: true });
    writeFileSync(this.shimPath()!, HOOK_SHIM, 'utf8');
    // The proxy-bridge sidecar for hookless CLIs (qwen). Same refresh policy.
    writeFileSync(this.proxyShimPath()!, PROXY_BRIDGE_SHIM, 'utf8');
    // The one thing the app will not do to a person's repo by itself: give back
    // the space a pre-fix history is still holding. Shipped here so a hive that
    // grew huge has the tool next to it, and named in the warning below.
    try {
      writeFileSync(join(root, 'bin', 'hive-compact.cjs'), HIVE_COMPACT_SCRIPT, 'utf8');
      chmodSync(join(root, 'bin', 'hive-compact.cjs'), 0o755);
    } catch { /* best-effort */ }
    // The bundled-node launcher every shim above is invoked through — MUST be
    // written before any hook installer runs (they probe for it).
    this.writeNodeLauncher();
    // …and the PATH-visible `node` fallback for the agent's OWN subprocesses.
    this.writeRuntimeShims();

    if (!existsSync(join(root, '.git'))) {
      this.git(['init', '-q'], root);
      this.commit('hive: init');
    }

    // A name taken before there was anywhere to put it (see `presetGodName`):
    // onboarding claims the orchestrator's nickname on step 3 and the workspace
    // is not chosen until step 4, so the claim lands here instead. Cleared
    // FIRST, which is what stops `presetGodName` calling back into this.
    const deferred = this.pendingGodName;
    if (deferred) {
      this.pendingGodName = null;
      this.presetGodName(deferred);
    }
  }

  /** Validate an agent's cwd the way a spawn does — it must be an ABSOLUTE path
   *  that exists as a directory. Surfaced as `cwdValid` on the registry entry so
   *  the roster reliably exposes whether a worker's working directory is usable.
   *  Best-effort; never throws (a stat error degrades to invalid). */
  private cwdValidity(cwd: string | undefined): { valid: boolean; issue: string | null } {
    if (!cwd || typeof cwd !== 'string') return { valid: false, issue: 'missing' };
    // Defense-in-depth: a `~/…` cwd from an older registry entry (written before
    // ingestion-time expansion) would read as 'not-absolute' forever. Expand first
    // so the roster reports the truth about the directory the spawn would use.
    cwd = expandTilde(cwd);
    if (!isAbsolute(cwd)) return { valid: false, issue: 'not-absolute' };
    try {
      return statSync(cwd).isDirectory()
        ? { valid: true, issue: null }
        : { valid: false, issue: 'not-a-directory' };
    } catch {
      return { valid: false, issue: 'missing-dir' };
    }
  }

  /**
   * Ensure an agent's workspace + registry entry, returning the spawn injection
   * (provider-specific args + env) that makes the process hive-aware.
   */
  async ensureAgent(
    meta: AgentMeta,
    opts: {
      semanticMemory?: boolean;
      knowledgeGraph?: boolean;
      /** ABSOLUTE path to the Knowledge-Graph CLI (`knowledge.env().KG_CLI`), baked
       *  into the agent's prompt instead of a `$KG_CLI` shell reference — `$VAR` is
       *  POSIX-only and expands to nothing under cmd.exe/PowerShell, so the KG
       *  instructions were unusable on Windows. Optional: undefined degrades to the
       *  old env-var spelling. */
      kgCliPath?: string;
      theme?: 'light' | 'dark';
      /** Claude Code's own output style for this agent (0.5.3 feature 19), from
       *  config.claudeOutputStyle. Undefined falls back to Concise. */
      outputStyle?: string;
      /** Consent state for the default-MCP bundle (W3). Threaded from the live
       *  HarnessConfig by the caller; undefined → catalog defaults apply. */
      mcpDefaults?: { [id: string]: { enabled: boolean } };
      /** App-resources `skills/` source dir (W3). The bundled read-only skills are
       *  copied into the agent's `.claude/skills/` per spawn; undefined or missing
       *  is a no-op (tolerated until Kevin populates the resource dir). */
      skillsDir?: string;
      /** Extra directories the agent's sandbox may write (e.g. the shared
       *  MemPalace dir, which `mempalace` mutates). Absolute paths; ignored
       *  for providers without a sandbox. */
      extraWritableDirs?: string[];
    } = {}
  ): Promise<SpawnInjection> {
    const root = this.root();
    if (!root) return { args: [], env: {} };
    this.ensureHive();

    const dir = this.agentDir(meta.id);
    mkdirSync(join(dir, 'inbox', '.done'), { recursive: true });
    mkdirSync(join(dir, 'outbox', '.sent'), { recursive: true });

    // Resolve role BEFORE writing identity.md. A restart passes the floor
    // roster's `description`, which can be a status caption ("on standby").
    // identity.md and registry.role are the durable job from the hire.
    const reg = this.registry();
    const prev = reg.agents[meta.id];
    if (meta.cwd) meta = { ...meta, cwd: expandTilde(meta.cwd) };
    const role = preferredAgentRole(meta.role, prev?.role, !!meta.isGod);
    meta = { ...meta, role };

    const identity = join(dir, 'identity.md');
    writeFileSync(identity, this.identityText(meta), 'utf8'); // refresh on each spawn

    // W3 — bundled read-only skills: refresh the agent's .claude/skills/ from the
    // app-resources skills/ dir on every spawn (same policy as identity.md), so an
    // agent always rides with the shipped safe skill set. Tolerant: a missing or
    // partial source dir is a no-op (Kevin populates the resource dir in lp-manifest).
    if (opts.skillsDir) this.copyBundledSkills(opts.skillsDir, join(dir, '.claude', 'skills'));

    const memory = join(dir, 'memory.md');
    if (!existsSync(memory)) {
      writeFileSync(memory, `# Memory — ${meta.name} (${meta.id})\n\n_Append durable facts, decisions, and context below._\n`, 'utf8');
    }
    ensureMineIgnore(dir); // keep settings.json / cursor / messages out of mempalace's index
    const cursor = join(dir, 'cursor.json');
    if (!existsSync(cursor)) this.writeJson(cursor, { lastProcessed: null });

    // upsert registry — spread the PRIOR entry first so a respawn preserves
    // fields the spawn `meta` doesn't carry, above all `sessionId`. Without this,
    // ensureAgent (which runs before the resume lookup in the pty:spawn handler)
    // would wipe the recorded session id, so `lastSession()` returns undefined and
    // `--resume` is never attached — i.e. every restart starts a fresh thread.
    // Validate the working directory at the source so a bad value is visible on
    // the roster (cwdValid) rather than silently spawning into a nonexistent dir.
    // Store the EXPANDED cwd, never the raw `~/…` the user typed — the registry is
    // read by hooks, the roster and the worker watcher, none of which run a shell.
    const cwd = this.cwdValidity(meta.cwd);
    reg.agents[meta.id] = {
      ...prev,
      ...meta,
      capabilities: meta.capabilities ?? prev?.capabilities ?? [],
      role,
      status: 'idle',
      cwdValid: cwd.valid,
      // A (re)spawn always means a live terminal — clear any prior archived flag.
      archived: false,
      lastSeen: Date.now()
    };
    if (meta.isGod) reg.godId = meta.id;
    this.atomicWriteJson(join(root, 'registry.json'), reg);

    this.appendLog({ kind: 'spawn', agentId: meta.id, name: meta.name, isGod: !!meta.isGod });
    // Only logs on an invalid cwd (rare) — not a per-spawn line, so no log spam.
    if (!cwd.valid) {
      this.appendLog({ kind: 'cwd_invalid', agentId: meta.id, cwd: meta.cwd, issue: cwd.issue });
    }
    this.commit(`hive: register ${meta.id}`);

    const env: Record<string, string> = {
      AGENT_ID: meta.id,
      AGENT_NAME: meta.name,
      HIVE_ROOT: root,
      AGENT_DIR: dir
    };
    // The bundled-node launcher, so an agent can run the hive's .cjs helpers (KG
    // CLI, Slack reply helper) even when `node` is not on its PATH. Invoking the
    // Electron binary directly would open a second app window, so this must stay
    // the wrapper path and never process.execPath.
    //
    // Kept as an env var for agent CONVENIENCE and for anything that reads it
    // programmatically — but agent-facing TEXT no longer references it by name:
    // `$HIVE_NODE` is POSIX-only syntax and expands to nothing under cmd.exe /
    // PowerShell, so every such instruction was dead on a Windows floor. Commands
    // we write for an agent to run bake `nodeCommand()`'s absolute path instead.
    env.HIVE_NODE = this.nodeCommand();
    // Generic light/dark hint for TUIs that paint their own background. The app
    // defaults to light but every agent CLI assumed a dark terminal, so Crush and
    // OpenCode looked pasted into a light window. COLORFGBG is the classic
    // "fg;bg" convention (rxvt/konsole) that lipgloss/termenv fall back to when
    // an OSC 11 query gets no answer. Claude Code gets the same hint through its
    // per-session settings.json (hookSettings); Crush and OpenCode through their
    // per-agent config dirs below. A running TUI does not re-read this: new
    // agents pick up the current theme, running ones keep the one they started with.
    if (opts.theme) env.COLORFGBG = opts.theme === 'dark' ? '15;0' : '0;15';
    // 0.5.3, bug 18. Grok never reads COLORFGBG on a desktop: it starts in its
    // dark default, or follows the OPERATING SYSTEM when set to auto. It does
    // take GROK_THEME, so a Grok agent is told the app's theme that way, unless
    // the person already picked a theme of their own (@shared/grokTheme).
    if ((meta.provider ?? 'claude') === 'grok') {
      const grokTheme = grokThemeEnv(opts.theme, readGrokConfigToml(), process.env.GROK_THEME ?? process.env.LC_GROK_THEME);
      if (grokTheme) env.GROK_THEME = grokTheme;
      // Measured 24 Sep on Grok 1.0.41: GROK_THEME=grokday alone paints a white
      // background, but with COLORFGBG=0;15 beside it the same Grok paints black
      // again. Grok does not need the generic hint on a desktop, so it gets none.
      delete env.COLORFGBG;
    }

    const claudeProvider = isClaudeProvider(meta.provider ?? 'claude');

    // Non-hive-aware providers (Antigravity's `agy`, OpenAI's `codex`, xAI's
    // `grok`) don't
    // understand Claude Code's flags (no `--append-system-prompt`, no telemetry,
    // no `--settings`). Instead: (1) the hive identity+protocol rides in as the
    // session's INITIAL prompt — the closest thing to `--append-system-prompt`
    // these CLIs offer (after the first turn the session continues normally); and
    // (2) lifecycle hooks are wired via the preset's `hookBridge` below. Together
    // that makes a Gemini/Codex worker a full hive citizen — live status +
    // Stop→inbox-drain — without Claude installed at all.
    //
    // How the prompt rides in differs by CLI:
    //  - agy takes it under a flag (`agy -i "<prompt>"`) → push [flag, prompt].
    //  - codex/grok take it POSITIONALLY (`codex|grok "<prompt>"`) → push the
    //    bare prompt as a trailing arg (node-pty passes argv literally, so it
    //    arrives as one positional argument after codex's own flags).
    if (!isHiveAwareProvider(meta.provider)) {
      const preset = providerPreset(meta.provider ?? 'claude');
      const flag = preset.initialPromptFlag;
      const prompt = this.injectedPrompt(meta, dir, root, opts.semanticMemory ?? false, opts.knowledgeGraph ?? false, opts.kgCliPath);
      // agy, codex, and grok expose a Claude-style lifecycle-hook surface, so each
      // gets the SAME live status + Stop→inbox-drain Claude does — selected by the
      // preset's `hookBridge`. agy needs a translating shim (its hook stdin/stdout
      // shape differs from Claude's); codex reuses the Claude `cth-hook` shim
      // verbatim (its hook payload + response contract are already Claude-shaped)
      // and is isolated to a per-agent CODEX_HOME so the user's global Codex
      // configuration is never mutated. Both share the HIVE_SOCK wiring below.
      const preArgs: string[] = [];
      let degraded: string | undefined;
      // Dispatch on the structured bridge descriptor (the foundation's `bridgeOf`
      // derives {kind:'hooks'} from the legacy `hookBridge` for agy/codex, and
      // returns the explicit {kind:'proxy'} for qwen). Two ways a hookless CLI
      // becomes a hive citizen:
      //   - 'hooks' → install a config-file hook shim (agy translator / codex verbatim).
      //   - 'proxy' → spawn a loopback reverse-proxy sidecar that observes the CLI's
      //               LLM traffic and SYNTHESIZES the same HIVE_SOCK payloads.
      const desc = bridgeOf(meta.provider);
      const sock = this.sockPath();
      if (desc && sock) {
        env.HIVE_SOCK = sock;
        try {
          if (desc.kind === 'hooks') {
            if (desc.shim === 'agy') this.installAgyHooks();
            else if (desc.shim === 'codex') {
              env.CODEX_HOME = this.installCodexHooks(dir, meta.id);
              // Codex refuses to run hooks from a config dir without persisted
              // "hook trust" (normally an interactive gate). Our hooks.json is
              // hive-authored inside an isolated CODEX_HOME, so we bypass that gate
              // for this automated spawn — the flag's documented use ("automation
              // that already vets hook sources"). Without it the hooks silently
              // never fire. Must precede the positional prompt.
              preArgs.push('--dangerously-bypass-hook-trust');
              // Auto mode keeps codex's OS sandbox (`-a never -s workspace-write`,
              // agentProvider.ts). workspace-write only covers cwd, so the agent
              // folder (inbox/.done, memory.md, outbox) and the shared hive root
              // (research deliverables, the board for god) are added as extra
              // writable roots. Harmless outside auto mode.
              for (const d of this.sandboxWritableDirs(meta, dir, root, opts.extraWritableDirs)) preArgs.push('--add-dir', d);
            }
            else if (desc.shim === 'pi') {
              // Pi (earendil-works) has a rich pi.on(event) lifecycle. We drop a
              // bundled extension into a PER-AGENT PI_CODING_AGENT_DIR (so the user's
              // global ~/.pi is never touched) that posts cth-hook-shaped payloads to
              // HIVE_SOCK on tool_call/agent_end and auto-approves tools when the floor
              // is in auto mode. HIVE_AUTO_APPROVE (set in spawnAgentCore from
              // config.autoMode) gates the auto-allow — Pam guardrail #5.
              // LIVE-UNVERIFIED: the exact extension API surface needs BYOK keys to
              // prove; the renderer idle inbox-wake nudge is the guaranteed drain.
              env.PI_CODING_AGENT_DIR = this.installPiHooks(dir);
            }
            else if (desc.shim === 'opencode') {
              // OpenCode (anomalyco/opencode) has no Claude-shaped Stop hook, but its
              // plugin API exposes a real session.idle event (god Decision 1). We drop
              // a bundled plugin into a PER-AGENT OPENCODE config dir that posts
              // HIVE_SOCK payloads on tool.execute.before/after + session.idle — the
              // same Stop→drain semantics, provider-agnostic, no traffic interception.
              // LIVE-UNVERIFIED (plugin auto-load + session.idle firing); the renderer
              // idle inbox-wake nudge is the guaranteed drain fallback.
              env.OPENCODE_CONFIG_DIR = this.installOpenCodePlugin(dir, opts.theme);
            }
            else if (desc.shim === 'gemini') {
              // Point only this worker at a per-agent system settings file so
              // the bridge is trusted and ~/.gemini/settings.json stays untouched.
              env.GEMINI_CLI_SYSTEM_SETTINGS_PATH = this.installGeminiHooks(dir);
            }
            else if (desc.shim === 'grok') this.installGrokHooks();
          } else if (desc.kind === 'proxy') {
            // Stable per-spawn session id, stamped on every synthesized payload so
            // recordSession (registry resume key) and the cost ledger persist.
            const spawnTs = String(Date.now());
            const sessionId = `proxy-${meta.id}-${createHash('sha1').update(root + meta.id + spawnTs).digest('hex').slice(0, 12)}`;
            env.HIVE_PROXY_SESSION = sessionId;
            // The CLI normally reads its upstream base URL from `baseUrlEnv`; capture
            // the user's configured value as the sidecar's UPSTREAM, then point the
            // CLI at the loopback proxy instead. Fall back to the cloud default if
            // the user hasn't set one.
            const upstream = process.env[desc.baseUrlEnv]
              || (desc.api === 'anthropic' ? 'https://api.anthropic.com' : 'https://api.openai.com/v1');
            // A loopback bind on port 0 fails only transiently (a busy moment, a
            // slow sidecar start past the 4s ceiling), so try a few times before
            // giving up: without this ONE bad moment at spawn cost the agent its
            // hive events for the whole session.
            const port = await this.startProxyBridgeWithRetry(meta.id, { sock, sessionId, api: desc.api, upstream });
            // Only redirect the CLI through the proxy if the sidecar actually bound a
            // port. On failure leave routing untouched → the CLI talks to its real
            // upstream directly (degraded: no synthesized hive events, but it still
            // runs). Deliberate degradation is fine; SILENT degradation is not, so
            // the failure goes to log.jsonl, the renderer and the spawn result.
            if (port > 0) {
              const loopback = `http://127.0.0.1:${port}`;
              if (meta.provider === 'crush') {
                // Crush has NO base-URL env override, so the generic env-rewrite is a
                // no-op for it. Route it instead via a per-agent CRUSH_GLOBAL_CONFIG
                // whose chosen provider's base_url points at the loopback proxy
                // (installCrushConfig — sibling of installCodexHooks). `upstream`
                // (captured above from the inert sentinel env or cloud default) is the
                // proxy's real target. Per-agent CRUSH_GLOBAL_DATA isolates session
                // state from the user's global ~/.config/crush.
                const crush = this.installCrushConfig(dir, loopback, desc.api, opts.theme);
                env.CRUSH_GLOBAL_CONFIG = dir;
                env.CRUSH_GLOBAL_DATA = crush.data;
              } else {
                env[desc.baseUrlEnv] = loopback;
              }
            }
            else {
              degraded = `${meta.name} is running without hive events: its proxy bridge did not bind after ${PROXY_BIND_ATTEMPTS} attempts. Live status, cost and inbox wake will not work for this session. Respawn the agent to try again.`;
              console.error(`[hive] proxy bridge for ${meta.id} did not bind — spawning without hive events`);
              this.appendLog({ kind: 'proxy-degraded', agentId: meta.id, name: meta.name, provider: meta.provider, attempts: PROXY_BIND_ATTEMPTS });
              this.emit?.('hive:degraded', { agentId: meta.id, name: meta.name, reason: 'proxy-bind', message: degraded });
            }
          }
        } catch (e) { console.error(`[hive] install ${desc.kind} bridge failed:`, e); }
      }
      // Inject the protocol text whichever way the CLI accepts it.
      // type-into-tui (Crush): the bare TUI reads a positional as a Cobra subcommand
      // → `Unknown command`. So DROP the positional and hand the protocol back as
      // seedPrompt; the renderer types it into the TUI after boot (ondev-b).
      const deg = degraded ? { degraded } : {};
      if (preset.seedDelivery === 'type-into-tui') return { args: [...preArgs], env, seedPrompt: prompt, ...deg };
      // If a provider somehow exposes neither a flag nor a positional prompt, spawn bare.
      if (flag) return { args: [...preArgs, flag, prompt], env, ...deg };
      if (preset.positionalInitialPrompt) return { args: [...preArgs, prompt], env, ...deg };
      return { args: preArgs, env, ...deg };
    }

    // Stage 7A — first-party Claude Code telemetry → the embedded loopback OTLP
    // collector (telemetry.ts). Pure env, no --settings change. Only injected
    // for Claude Code once the collector is up (otelEndpoint set), so telemetry-
    // off installs and non-Claude providers spawn exactly as before.
    if (claudeProvider && this._otelEndpoint) {
      env.CLAUDE_CODE_ENABLE_TELEMETRY = '1';
      env.OTEL_METRICS_EXPORTER = 'otlp';
      env.OTEL_LOGS_EXPORTER = 'otlp';
      env.OTEL_EXPORTER_OTLP_PROTOCOL = 'http/json';
      env.OTEL_EXPORTER_OTLP_ENDPOINT = this._otelEndpoint;
      env.OTEL_METRIC_EXPORT_INTERVAL = '5000'; // 5s — near-live without spamming
      env.OTEL_LOGS_EXPORT_INTERVAL = '2000';
      env.OTEL_RESOURCE_ATTRIBUTES = `agent.id=${meta.id},agent.name=${meta.name}`;
    }
    const args: string[] = [];
    if (!claudeProvider) return { args, env };

    args.push('--append-system-prompt', this.injectedPrompt(meta, dir, root, opts.semanticMemory ?? false, opts.knowledgeGraph ?? false, opts.kgCliPath));

    // Phase 1 — autonomy: attach lifecycle hooks via --settings (no edits to the
    // user's repo) so the agent reports activity and drains its inbox on Stop.
    const sock = this.sockPath();
    const shim = this.shimPath();
    if (sock && shim) {
      env.HIVE_SOCK = sock;
      const settingsPath = join(dir, 'settings.json');
      this.writeJson(settingsPath, this.hookSettings(shim, meta.cwd, opts.mcpDefaults, opts.theme, this.sandboxWritableDirs(meta, dir, root, opts.extraWritableDirs), opts.outputStyle));
      args.push('--settings', settingsPath);
    }
    return { args, env };
  }

  /** Update the durable job string (hire role) without respawning. Refreshes
   *  registry.json + identity.md so the floor editor and the hive stay aligned. */
  patchAgentRole(id: string, role: string): { ok: boolean; error?: string } {
    const root = this.root();
    if (!root) return { ok: false, error: 'hive disabled' };
    const next = role.trim();
    if (!next) return { ok: false, error: 'empty role' };
    try {
      const reg = this.registry();
      const agent = reg.agents[id];
      if (!agent) return { ok: false, error: 'unknown agent' };
      if (agent.role === next) return { ok: true };
      agent.role = next;
      agent.lastSeen = Date.now();
      this.writeJson(join(root, 'registry.json'), reg);
      writeFileSync(join(this.agentDir(id), 'identity.md'), this.identityText(agent), 'utf8');
      this.appendLog({ kind: 'role', agentId: id, role: next });
      this.commit(`hive: role ${id}`);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  /**
   * Flip an agent's archived flag and persist the registry. Closing a terminal
   * tab archives the agent (retained + flagged, NOT deleted); a (re)spawn clears
   * it. No-op if the agent isn't registered or the flag is already set the way
   * asked. Best-effort — never throws, so a dying PTY/kill handler can't crash.
   */
  setArchived(id: string, archived: boolean): void {
    const root = this.root();
    if (!root) return;
    try {
      const reg = this.registry();
      const agent = reg.agents[id];
      if (!agent || agent.archived === archived) return;
      agent.archived = archived;
      agent.lastSeen = Date.now();
      this.atomicWriteJson(join(root, 'registry.json'), reg);
      this.appendLog({ kind: 'archive', agentId: id, archived });
      this.commit(`hive: ${archived ? 'archive' : 'unarchive'} ${id}`);
    } catch { /* best-effort — never crash a lifecycle handler */ }
  }

  /**
   * Change an agent's display name without changing its durable identity.
   * The registry key, agent directory, session id, and every mailbox path remain
   * keyed by `id`; only the human-facing name is updated.
   *
   * `fleet.json` is patched in the same operation so god's next prompt receives
   * the new name immediately rather than waiting for the periodic fleet refresh.
   */
  /**
   * Put an agent on hold, or take it off, and tell Michael immediately.
   *
   * `fleet.json` is patched in the same operation for the same reason
   * `renameAgent` does it: god's roster is injected from that file on its next
   * prompt, and waiting up to 8s for the periodic refresh means one more
   * dispatch can still land on someone the human has just claimed.
   */
  setAgentHold(id: string, hold: boolean): { ok: boolean; onHold?: boolean; error?: string } {
    const root = this.root();
    if (!root) return { ok: false, error: 'hive disabled (no harnessHome)' };
    try {
      const reg = this.registry();
      const agent = reg.agents[id];
      if (!agent) return { ok: false, error: 'Agent not found' };
      if (!!agent.onHold === hold) return { ok: true, onHold: hold };

      agent.onHold = hold;
      this.writeJson(join(root, 'registry.json'), reg);
      // The rail draws the 1:1 chip from the store's copy; a hold set from the
      // agent screen, the menu or a teammate's machine reaches every surface
      // through this push, not only the screen that is open (Pam's audit 4).
      this.emit?.('hive:agentHold', { agentId: id, onHold: hold });

      const fleetPath = join(root, 'fleet.json');
      if (existsSync(fleetPath)) {
        try {
          const fleet = this.readJson<{ agents?: Array<{ id?: string; onHold?: boolean }> }>(fleetPath, {});
          if (Array.isArray(fleet.agents)) {
            const row = fleet.agents.find((candidate) => candidate.id === id);
            if (row) { row.onHold = hold; this.writeJson(fleetPath, fleet); }
          }
        } catch { /* fleet is a cache — the registry above is the record */ }
      }
      this.appendLog({ kind: 'agent-hold', id, onHold: hold });
      return { ok: true, onHold: hold };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  renameAgent(id: string, name: string): { ok: boolean; name?: string; error?: string } {
    const root = this.root();
    if (!root) return { ok: false, error: 'hive disabled (no harnessHome)' };

    const nextName = name.trim();
    if (!nextName) return { ok: false, error: 'Name is required' };

    try {
      const reg = this.registry();
      const agent = reg.agents[id];
      if (!agent) return { ok: false, error: 'Agent not found' };
      if (agent.name === nextName) return { ok: true, name: nextName };

      const previousName = agent.name;
      agent.name = nextName;
      this.writeJson(join(root, 'registry.json'), reg);

      // fleet.json is ephemeral and may not exist yet. When it does, keep its
      // display name in lockstep with the registry so rosterContext() is fresh.
      const fleetPath = join(root, 'fleet.json');
      if (existsSync(fleetPath)) {
        try {
          const fleet = this.readJson<{ agents?: Array<{ id?: string; name?: string }> }>(fleetPath, {});
          if (Array.isArray(fleet.agents)) {
            const row = fleet.agents.find((candidate) => candidate.id === id);
            if (row) {
              row.name = nextName;
              this.writeJson(fleetPath, fleet);
            }
          }
        } catch { /* periodic snapshot will repair a malformed/stale fleet file */ }
      }

      this.appendLog({ kind: 'rename', agentId: id, previousName, name: nextName });
      this.commit(`hive: rename ${id}`);
      return { ok: true, name: nextName };
    } catch {
      return { ok: false, error: 'Could not rename agent' };
    }
  }

  /**
   * 0.4.9 nickname: name the orchestrator whether or not it has spawned yet.
   * Registered, this is `renameAgent`. Not yet registered (a fresh workspace,
   * onboarding just wrote the config), the registry gets the god's row with
   * this name and nothing else, which is exactly what the renderer's spawn
   * effect reads back (`resolveGodName(reg.agents.god.name)`) before its first
   * `ensureAgent`; that call then fills the row in. Without this the claim the
   * relay accepted would sign as "Michael" on this machine until a restart.
   */
  presetGodName(name: string): { ok: boolean; name?: string; error?: string; deferred?: boolean } {
    const nextName = name.trim();
    if (!nextName) return { ok: false, error: 'Name is required' };
    const root = this.root();
    // NO WORKSPACE YET IS NOT A FAILURE. Onboarding names the orchestrator on
    // "Meet your team", one step BEFORE the workspace is created, so there is
    // no registry to write into at the moment the name is chosen. The relay has
    // already taken the word by this point, which is the half that matters and
    // the half that cannot be redone, so refusing here would report a failure
    // for a claim that succeeded and leave the person stuck on the step. Hold
    // it instead; `ensureHive` writes it the moment there is a hive.
    if (!root) {
      this.pendingGodName = nextName;
      return { ok: true, name: nextName, deferred: true };
    }
    const reg = this.registry();
    const godId = reg.godId ?? 'god';
    if (reg.agents[godId]) return this.renameAgent(godId, nextName);
    try {
      this.ensureHive();
      reg.godId = godId;
      reg.agents[godId] = { id: godId, name: nextName, cwd: this.getHome() ?? '', isGod: true, status: 'idle', lastSeen: Date.now() };
      this.writeJson(join(root, 'registry.json'), reg);
      this.appendLog({ kind: 'rename', agentId: godId, previousName: null, name: nextName });
      return { ok: true, name: nextName };
    } catch {
      return { ok: false, error: 'Could not name the orchestrator' };
    }
  }

  /**
   * Persist the agent's Claude Code session_id (Lane A #6.6a). Captured from hook
   * payloads; written only when it actually changes (a new session), so this is a
   * no-op on the vast majority of hook events. The id is the `--resume` key for
   * idempotent resume after a crash/restart AND the accounting/dedup key for cost
   * samples. Best-effort — never throws into a hook handler.
   */
  recordSession(agentId: string, sessionId: string): void {
    const root = this.root();
    if (!root || !sessionId) return;
    try {
      const reg = this.registry();
      const agent = reg.agents[agentId];
      if (!agent || agent.sessionId === sessionId) return; // unknown agent or unchanged → no write
      agent.sessionHistory = pushSessionHistory(agent.sessionHistory, agent.sessionId);
      agent.sessionId = sessionId;
      agent.lastSeen = Date.now();
      this.atomicWriteJson(join(root, 'registry.json'), reg);
      this.appendLog({ kind: 'session', agentId, sessionId });
      this.commit(`hive: session ${agentId}`);
    } catch { /* best-effort — never crash a hook handler */ }
  }

  /** The last known session_id for an agent, or undefined. Used to build a
   *  `claude --resume <id>` spawn so a restarted agent resumes its thread. */
  lastSession(agentId: string): string | undefined {
    return this.registry().agents[agentId]?.sessionId;
  }

  /** Every session a restart may try, the current key first and then the keys
   *  it displaced. The caller resumes the first one whose transcript exists. */
  resumeCandidates(agentId: string): string[] {
    const agent = this.registry().agents[agentId];
    if (!agent) return [];
    return pushSessionHistory(agent.sessionHistory, agent.sessionId);
  }

  /** Claude Code settings that route every relevant hook through the shim, plus
   *  (W3) the default MCP bundle merged into this PER-SESSION settings file. cwd
   *  scopes the filesystem/git servers; cfg (the consent map) gates which servers
   *  are written. Claude-only — this is invoked solely on the Claude spawn path. */
  /**
   * Directories a sandboxed agent may write BESIDES its cwd: its own agent
   * folder (hive housekeeping) and the hive root (research deliverables; the
   * board and tasks.json for god; outbox delivery is done by main, not the agent).
   * This is what lets auto mode keep the OS sandbox on — the old full-bypass
   * posture existed only because these paths sit outside the project cwd.
   */
  private sandboxWritableDirs(meta: AgentMeta, dir: string, root: string, extra?: string[]): string[] {
    const out = [dir, root, ...(extra ?? [])].filter((d) => typeof d === 'string' && d.length > 0);
    return Array.from(new Set(out));
  }

  private hookSettings(shim: string, cwd: string, cfg: McpDefaultsMap, theme?: 'light' | 'dark', writableDirs: string[] = [], outputStyle?: string): unknown {
    // Bundled node, NOT bare `node` — see nodeLauncherPath(). Claude runs each of
    // these through `sh -c` with a stripped PATH, where `node` is often absent.
    const cmd = this.nodeRun(shim);
    const entry = (matcher?: string) => ({
      ...(matcher ? { matcher } : {}),
      hooks: [{ type: 'command', command: cmd }]
    });
    const mcpServers = this.buildDefaultMcpServers(cwd, cfg);
    return {
      // Match the TUI's truecolor palette to the harness terminal theme —
      // PER SESSION, so the user's global Claude theme (their own terminals
      // outside the app) is never touched.
      //
      // 'auto', not the literal light/dark. Pinning the value matched the theme at
      // SPAWN and then ignored every change: Claude Code supports DEC 2031 theme
      // notifications, but a pinned theme has nothing to reconsider, so flipping
      // the app left a running agent painting its message blocks in the old
      // palette (black highlight on a cream terminal). 'auto' is the value that
      // listens. The terminal reports the current theme the moment the CLI enables
      // 2031, so startup still matches without pinning anything.
      ...(theme ? { theme: 'auto' } : {}),
      // 0.5.3 feature 19: Claude Code's own output style, Concise unless the user
      // chose another (shared/outputStyle.ts). Per session settings only, so a
      // person's own `claude` outside the app keeps whatever style they set.
      outputStyle: normalizeClaudeOutputStyle(outputStyle),
      // W3 — default skills/MCP bundle. Written into the PER-SESSION settings file
      // only (never ~/.claude), so the user's own MCP servers are never clobbered;
      // Claude merges this additively. Omitted entirely when empty so a settings
      // file with no enabled servers is unchanged from before.
      ...(Object.keys(mcpServers).length ? { mcpServers } : {}),
      // The status line gets the session status JSON after every response —
      // including context_window.{total_input_tokens,context_window_size},
      // the only clean programmatic source for the session's REAL context
      // window. The shim prints a compact in-terminal gauge and forwards the
      // payload to the harness (agent-card context gauge, exact limit).
      statusLine: { type: 'command', command: `${cmd} --status`, padding: 0 },
      // Native OS sandbox for Bash subprocesses (macOS Seatbelt / Linux bubblewrap).
      // Auto mode spawns with `--permission-mode bypassPermissions`, which only
      // silences PROMPTS; the sandbox is a separate, opt-in layer that was never
      // switched on. Verified live (claude 2.1.239): with this block, bypass mode
      // still writes cwd and the listed dirs but `touch $HOME/x` fails with
      // "Operation not permitted". Two layers are needed: `sandbox.filesystem`
      // governs Bash children, `permissions.additionalDirectories` governs the
      // Edit/Write tools; with only one the agent deadlocks on its own inbox.
      // failIfUnavailable stays false: a platform without a sandbox (Windows)
      // runs as before rather than refusing to spawn.
      ...(writableDirs.length
        ? {
            sandbox: { enabled: true, filesystem: { allowWrite: writableDirs } },
            permissions: { additionalDirectories: writableDirs }
          }
        : {}),
      hooks: {
        Stop: [entry()],
        SubagentStop: [entry()],
        PreToolUse: [entry('*')],
        PostToolUse: [entry('*')],
        UserPromptSubmit: [entry()],
        Notification: [entry()],
        SessionStart: [entry()],
        // #5C: surface mid-`/compact` so an agent boxing up its context reads as
        // 'compacting' on the floor instead of looking frozen.
        PreCompact: [entry()],
        PostCompact: [entry()]
      }
    };
  }

  /**
   * W3 — build the per-agent `mcpServers` map from the default catalog. Includes a
   * server only when it's enabled (catalog ∩ consent), scopes filesystem/git to the
   * agent cwd (never whole-disk), and namespaces every id `munder-<id>` so a server
   * of the same name in the user's own ~/.claude is never clobbered. A write/secret
   * server is included ONLY on an explicit `enabled:true` consent — never via a
   * default — so a malformed/partial config can't silently arm a keyed server.
   */
  private buildDefaultMcpServers(
    cwd: string,
    cfg: McpDefaultsMap
  ): Record<string, { command: string; args: string[]; env?: Record<string, string> }> {
    const out: Record<string, { command: string; args: string[]; env?: Record<string, string> }> = {};
    for (const e of MCP_CATALOG) {
      const consented = cfg?.[e.id]?.enabled;
      const enabled = consented ?? e.defaultEnabled;
      if (!enabled) continue;
      // Defense-in-depth: a write/secret server requires an EXPLICIT opt-in; it can
      // never ride in on a default (the catalog already ships these OFF, but this
      // guards a hand-edited/partial mcpDefaults map too).
      if (e.tier !== 'safe-readonly' && consented !== true) continue;
      // Replace the `<cwd>` placeholder (filesystem/git) with the agent cwd at merge
      // time so these stay strictly workspace-scoped.
      const args = e.spec.args.map((a) => (a === '<cwd>' ? cwd : a));
      out[`munder-${e.id}`] = {
        command: e.spec.command,
        args,
        ...(e.spec.env ? { env: e.spec.env } : {})
      };
    }
    return out;
  }

  /**
   * W3 — refresh an agent's bundled skills from the app-resources `skills/` dir.
   * Mirrors `identity.md`: overwritten every spawn so the shipped safe set tracks
   * the app. Best-effort and fully tolerant — a missing/empty source dir is a no-op
   * (Kevin populates the resource dir in lp-manifest), and any IO error is swallowed
   * so skill provisioning can never block a spawn.
   */
  private copyBundledSkills(srcDir: string, destDir: string): void {
    try {
      if (!existsSync(srcDir)) return;
      const copyTree = (from: string, to: string): void => {
        const entries = readdirSync(from, { withFileTypes: true });
        if (!entries.length) return;
        mkdirSync(to, { recursive: true });
        for (const ent of entries) {
          const s = join(from, ent.name);
          const d = join(to, ent.name);
          if (ent.isDirectory()) copyTree(s, d);
          else if (ent.isFile()) copyFileSync(s, d);
        }
      };
      copyTree(srcDir, destDir);
    } catch (e) { console.error('[hive] copyBundledSkills failed:', e); }
  }

  /**
   * W1 — start a proxy-bridge sidecar for a hookless proxy-tier agent (qwen).
   * Spawns `<root>/bin/hive-proxy.cjs` under Node, which binds a loopback port and
   * reports it back as a one-line `{"port":N}` on stdout. Resolves the bound port
   * (or 0 on failure, so the caller degrades gracefully without redirecting the
   * CLI). Idempotent: any prior sidecar for the agent is killed first, so a respawn
   * never leaks a listener. Tracked in `proxyChildren` for teardown.
   */
  /** startProxyBridge with a short retry ladder. Every attempt kills the previous
   *  sidecar first (startProxyBridge is idempotent), so a retry never leaks a
   *  listener. Resolves the bound port, or 0 once every attempt has failed. */
  private async startProxyBridgeWithRetry(
    agentId: string,
    cfg: { sock: string; sessionId: string; api: 'openai' | 'anthropic'; upstream: string }
  ): Promise<number> {
    for (let attempt = 1; attempt <= PROXY_BIND_ATTEMPTS; attempt++) {
      const port = await this.startProxyBridge(agentId, cfg);
      if (port > 0) return port;
      if (attempt < PROXY_BIND_ATTEMPTS) {
        console.warn(`[hive] proxy bridge for ${agentId} did not bind (attempt ${attempt}/${PROXY_BIND_ATTEMPTS}), retrying`);
        await new Promise((r) => setTimeout(r, PROXY_BIND_BACKOFF_MS[attempt - 1] ?? 1000));
      }
    }
    return 0;
  }

  private startProxyBridge(
    agentId: string,
    cfg: { sock: string; sessionId: string; api: 'openai' | 'anthropic'; upstream: string }
  ): Promise<number> {
    this.stopProxyBridge(agentId);
    const script = this.proxyShimPath();
    if (!script) return Promise.resolve(0);
    return new Promise<number>((resolve) => {
      let settled = false;
      const settle = (port: number): void => { if (!settled) { settled = true; resolve(port); } };
      let child: ChildProcess;
      try {
        child = spawn(process.execPath, [script], {
          env: {
            ...process.env,
            // Run the .cjs under Electron's bundled Node, not as a second app window.
            ELECTRON_RUN_AS_NODE: '1',
            HIVE_SOCK: cfg.sock,
            AGENT_ID: agentId,
            UPSTREAM_BASE_URL: cfg.upstream,
            HIVE_PROXY_SESSION: cfg.sessionId,
            HIVE_PROXY_API: cfg.api
          },
          // Read the port line from stdout; never inherit stdio (the sidecar must
          // never write into the agent's terminal or leak request bodies to a log).
          stdio: ['ignore', 'pipe', 'ignore']
        });
      } catch (e) {
        console.error(`[hive] startProxyBridge spawn failed for ${agentId}:`, e);
        return settle(0);
      }
      this.proxyChildren.set(agentId, child);
      let buf = '';
      child.stdout?.setEncoding('utf8');
      child.stdout?.on('data', (d: string) => {
        if (settled) return;
        buf += d;
        const nl = buf.indexOf('\n');
        if (nl === -1) return;
        try {
          const msg = JSON.parse(buf.slice(0, nl));
          if (typeof msg.port === 'number' && msg.port > 0) settle(msg.port);
          else settle(0);
        } catch { settle(0); }
      });
      child.on('error', () => settle(0));
      child.on('exit', () => {
        if (this.proxyChildren.get(agentId) === child) this.proxyChildren.delete(agentId);
        settle(0); // never hang the spawn if the sidecar dies before reporting
      });
      // Hard ceiling: if the sidecar never reports a port, degrade rather than hang.
      setTimeout(() => settle(0), 4000).unref?.();
    });
  }

  /** Kill the proxy sidecar for an agent, if any. Idempotent; never throws. */
  stopProxyBridge(agentId: string): void {
    const child = this.proxyChildren.get(agentId);
    if (!child) return;
    this.proxyChildren.delete(agentId);
    try { child.kill(); } catch { /* already gone */ }
  }

  /** Kill every live proxy sidecar (app quit). Best-effort. */
  stopAllProxyBridges(): void {
    for (const id of [...this.proxyChildren.keys()]) this.stopProxyBridge(id);
  }

  /**
   * Drain an agent's inbox for the Stop hook. Returns whether to block-to-continue
   * and the message text to feed back. Uses the per-agent cursor so a message is
   * surfaced exactly once (no infinite loop).
   */
  drainForStop(agentId: string): { block: boolean; reason?: string } {
    const dir = this.agentDir(agentId);
    if (!existsSync(dir)) return { block: false };
    const cursorPath = join(dir, 'cursor.json');
    const cursor = this.readJson<{ lastProcessed: string | null }>(cursorPath, { lastProcessed: null });
    const fresh = this.inbox(agentId)
      .filter((m) => !cursor.lastProcessed || m.id > cursor.lastProcessed)
      .sort((a, b) => (a.id < b.id ? -1 : 1));
    if (fresh.length === 0) return { block: false };

    cursor.lastProcessed = fresh[fresh.length - 1].id;
    this.atomicWriteJson(cursorPath, cursor);
    this.appendLog({ kind: 'drain', agentId, count: fresh.length });

    const lines = fresh.map((m) => `- [from ${m.from}, ${m.act}] ${m.subject}: ${m.body}`).join('\n');
    const reason = [
      `You have ${fresh.length} new hive message(s) in your inbox. Address them before finishing:`,
      lines,
      // Native separators (join, not string-concatenated `/`) so a Windows agent is
      // handed a path its own shell/tools accept, not `C:\…\agents\god/inbox/`.
      `Open the files in ${join(dir, 'inbox')} for full detail, act on each, then move handled ones to ${join(dir, 'inbox', '.done')}. Reply via your outbox if a message requires it.`
    ].join('\n');
    return { block: true, reason };
  }

  // — agent-facing text —

  private identityText(meta: AgentMeta): string {
    const caps = (meta.capabilities ?? []).join(', ') || '—';
    return [
      `# ${meta.name} (${meta.id})`,
      '',
      `- Role: ${meta.role ?? (meta.isGod ? 'orchestrator (god)' : 'agent')}`,
      `- Capabilities: ${caps}`,
      `- Working directory: ${meta.cwd}`,
      meta.isGod ? '- You are the **god / orchestrator**. You run the floor — keep awareness of the whole team, delegate execution, and personally own only the important calls (decomposition, sign-offs, conflicts, integration), not the grunt work.' : '',
      meta.isGod ? '- Monitor the team with `fleet.json` (live per-agent status/tokens/cost/breaker) and `registry.json`; full command reference in `COMMANDS.md`. `claude agents` does NOT list your hive siblings.' : '',
      ''
    ].filter(Boolean).join('\n');
  }

  /**
   * The system-prompt prefix injected into every spawn via --append-system-prompt.
   *
   * 🔒 PROMPT-CACHE INVARIANT — keep this prefix VOLATILE-FREE. It interpolates
   * only values stable for an agent's whole lifetime (name, id, dir, root,
   * semanticMemory). Do NOT add dates, UUIDs, counters, board/registry state, or
   * any `Date.now()`-derived text here: a prefix that changes per spawn defeats
   * Anthropic's prompt cache (re-priming the whole system prompt every turn).
   * Volatile context belongs on the live channels — the inbox (hive messages) and
   * the PTY — never baked into this prefix. (Lane A #6.1.)
   *
   * 🪟 NO SHELL SYNTAX. Every path and command here is written the way the AGENT
   * will actually type it, on the platform it is running on. That rules out two
   * habits that were silently Windows-only breakage:
   *  - `$VAR` — POSIX-only. Under cmd.exe `$HIVE_NODE`/`$KG_CLI` expand to nothing
   *    and under PowerShell to an undefined variable, so those instructions were
   *    dead on every Windows floor. Bake the ABSOLUTE resolved path instead: it is
   *    platform-independent, needs no expansion, and stays prompt-cache-stable.
   *  - `'…' + '/inbox/'` — string-concatenating separators told a Windows agent to
   *    read `C:\Users\x\hive\agents\god/inbox/`. Use join() so the agent's own
   *    tooling gets a path it can pass straight to its shell.
   */
  private injectedPrompt(
    meta: AgentMeta,
    dir: string,
    root: string,
    semanticMemory: boolean,
    knowledgeGraph: boolean,
    kgCliPath?: string
  ): string {
    // Native-separator path helpers — see the 🪟 note above.
    const inDir = (...parts: string[]): string => join(dir, ...parts);
    const inRoot = (...parts: string[]): string => join(root, ...parts);
    // Resolved ONCE here, at THIS agent's own spawn (prompt-cache-stable, like
    // name/id/dir/root). Only the PREP ASSISTANT persona names god in prose.
    const godRegistry = meta.isAssistant ? this.registry() : null;
    const godNameForPrompt = godRegistry
      ? resolveGodName(godRegistry.agents[godRegistry.godId ?? 'god']?.name)
      : '';
    const hiveNode = this.nodeCommand();
    const kgCli = kgCliPath || (process.platform === 'win32' ? '%KG_CLI%' : '$KG_CLI');
    const rt = this.runtimeInfo();

    // 0.4.11 (founder, 6 Sep 2026): "we should say temps everywhere not
    // workers", and the prompts "written cleanly, in short". One vocabulary for
    // prompts and screens, defined once, then short numbered rules. Every rule
    // the long form carried is still here; only the prose is gone.
    const wordsLine = 'WORDS: an "agent" is a member of this office with a lasting session. A "temp" is a short lived agent the orchestrator starts for one job; it does the job, reports done, and is torn down. The orchestrator\'s address is "god".';

    const guardrailsLine = 'GUARDRAILS: a circuit breaker watches the floor. A "Circuit breaker: steer" or "constrain" message means you are looping or overspending: stop repeating, summarize what you tried, and follow it. Be token frugal; a floor wide or per agent budget can pause you. The shared plan has two parts: board.md (freeform; god is its only writer) and tasks.json (a kanban: todo, doing, blocked, done).';

    const memoryLine = semanticMemory
      // The palace location is named, not spelled as `$MEMPALACE_PALACE_PATH`:
      // `mempalace` reads that env var itself, and the POSIX `$` form was noise
      // (or an empty expansion) for a Windows agent that tried to use it literally.
      ? 'SEMANTIC MEMORY: the office shares a searchable MemPalace at the path in your MEMPALACE_PALACE_PATH environment variable. Run `mempalace wake-up` at the start of a task for a digest and `mempalace search "<query>"` to recall what the team knows. Your memory.md is mined into it automatically, so write durable facts there.'
      : '';
    // 0.4.11: "temporary agents should be able to fetch context from any agent's
    // memories". The index is written by main when a temp starts; every agent is
    // told, because the same reading pays whenever a task touches another agent's work.
    const sharedMemoryLine = `Shared memory: every agent that has been on this floor keeps its durable notes at ${inRoot('agents')}/<id>/memory.md, and ${inRoot('memory-index.md')} (written by the harness when a temp starts) lists them with path, size and last update. Read any of them when a task names another agent or touches their work. Write only your own memory.md.`;
    // Enterprise Knowledge Graph (opt-in). Volatile-free: the bundled-node launcher
    // and the KG CLI are both fixed absolute paths for an install.
    const knowledgeLine = knowledgeGraph
      ? `ENTERPRISE KNOWLEDGE: this organisation keeps a private Knowledge Graph of its documents, policies and business context. When a task needs company facts, house style or an internal process, query it instead of guessing: \`"${hiveNode}" "${kgCli}" search "<query>"\` for ranked passages, \`"${hiveNode}" "${kgCli}" list\` for what exists, \`"${hiveNode}" "${kgCli}" get <id>\` for a full document. That first path is the harness's bundled Node; use it, not bare \`node\`.`
      : '';
    // Every agent gets the skills folder at spawn (copyBundledSkills), but only
    // the temp dispatch used to say so. Said once here for everyone, with the one
    // difference stated: the integrations broker is a temp's, by its env.
    const capabilitiesLine = `CAPABILITIES: your skills are in ${inDir('.claude', 'skills')}. Read ${inDir('.claude', 'skills', 'capabilities', 'SKILL.md')} once (or run /capabilities): it lists what you can do and how to call it. The date skills (/today, /lastWeek, /last30Days, /lastQuarter and more) resolve any time window; use them for time scoped work instead of computing dates by hand. Integrations go through the loopback broker and are available only when MD_BROKER_URL is set in your environment (a temp's); without it, ask god.`;
    // Item 13: state the build, so anything that differs between a packaged app
    // and a local dev run (umask being the one that bit us) is visible.
    const runtimeLine = rt
      ? `RUNNING BUILD: Munder Difflin v${rt.version}, ${rt.packaged ? 'packaged app' : 'local dev build'}${rt.appPath ? `, from ${rt.appPath}` : ''}. Say this version when asked which one is running; do not assume behaviour from an older one. A local dev build inherits the launching shell's environment (umask included) and a packaged app does not, so file modes and env can differ. log.jsonl records an app-start event on every launch; that is how you spot a restart or a build switch.`
      : '';

    // The orchestrator's brief: numbered, one rule per line.
    const godLines = meta.isGod ? [
      'YOU ARE THE ORCHESTRATOR (address "god"). You run the office; you do not do the work yourself.',
      '1. KNOW THE FLOOR. Keep an accurate picture of every agent (active, idle, archived), the board, and all work in flight. Drain your inbox continually and answer other agents\' questions so nobody waits.',
      `2. DELEGATE. Decompose work, hand each piece to an owner through its inbox, and do not take on implementation. Before starting anyone new, check the live roster (${inRoot('registry.json')} for who exists, ${inRoot('fleet.json')} for their state) and prefer an agent already on the floor, above all the one a request names ("ask Pam to..."). Start a temp only when nobody fits, and say that you checked. One capable owner beats a duplicate.`,
      '3. OWN ONLY THE IMPORTANT: decomposition, dispatch, sign offs, conflicts, branch integration, final QA. You are the only writer of board.md.',
      '4. NO APPROVAL QUEUE. You are autonomous. For the genuinely critical (destructive actions, real money, scope changes, conflicts you cannot settle) ask the human in your own session; the tool permission prompt gates the action, and the human can approve from their phone with /remote-control. Keep the team unblocked.',
      '5. DISPATCH AS A CONTRACT with four parts: OBJECTIVE (the goal), OUTPUT (the deliverable and its format), TOOLS (what to use or avoid, and what to read instead of re deriving), BOUNDARIES (scope and the definition of done). Pass references (paths, message ids, board sections), never pasted content. Keep it short.',
      `6. MONITOR with ${inRoot('fleet.json')} (per agent tokens, cost, status, last tool, breaker level, inbox backlog) and ${inRoot('registry.json')}. \`claude agents\` does not list this office. The command reference is ${inRoot('COMMANDS.md')}: slash commands act on your own session only; CLI commands run in your shell. On every Heartbeat standup, review each agent, re engage anyone stalled, over budget or breaker armed, and keep board.md and tasks.json accurate.`,
      '7. TASKS.JSON: set "assignee" to the agent id the moment you dispatch and never clear it; a done card must say who did the work. Leave "id" out of a new card; the harness assigns the ticket key (e.g. V53-299). Refer to cards by that key.',
      '8. ASKING THE HUMAN: when a card can move only with the human (a question, or an action only they can do: create an account, approve a spend, hand over credentials, test on their device), set the card "blocked" and push {"q":"...","askedAt":"<iso>","from":"<agent id>"} onto its "humanQA" array, where "from" is the agent whose question it is (leave it out for your own, floor wide question); keep every past entry. Write the ask short, in markdown, under about 700 characters: one **bold** sentence saying what you need, `backticks` for paths and values, one "-" bullet or "1." line per option, a blank line between paragraphs. Rewrite an agent\'s report into that shape; never paste it. The ask shows on the ASK ME board; the answer lands in the same entry as "a" and reaches your inbox: act on it and unblock the card. Never park questions in files and never sit waiting for a reply.',
      '9. STEWARD THE TOKEN BUDGET.'
    ] : [];
    // Item 11, redone for 0.4.11: the spawn mechanism is ALWAYS stated to god,
    // switch or not, because the switch is read at his spawn and a later flip
    // never reached a running prompt. The switch itself is explained instead.
    const spawnLines = meta.isGod ? [
      `STARTING A TEMP: write ONE JSON file into ${inRoot('spawn-requests')}/<id>.json with "objective" (the job) and "cwd" (the repo it runs in). Optional: "name", "command", "provider", "model", "isolate" (default true: its own git worktree), "tokenCap", "slack" ({channel, thread_ts}: its replies and failures go to that thread), "character" and "accent" (its look on the floor). The harness starts the temp with id worker-<id>, files the request under spawn-requests/.done/ when it starts or .failed/ with a reason, briefs it with the objective, the memory index and its capabilities, and tears it down when it reports done. This is the only way you can start anyone; a hire manifest under research/hires/ needs the human to confirm it in the UI.`,
      'THE SWITCH: the human allows temps under Settings, Autonomy & Budgets (on by default; they can turn it off) and caps how many run at once. While it is off your request is neither failed nor deleted: it waits in spawn-requests/ and runs when the switch is turned on. A request that has not moved means the switch is off; raise it with the human instead of retrying.',
      'WHEN THE HUMAN ASKS FOR TEMPS OR WORKERS ("use temps", "spin up workers", "get two workers on this"), that is the request: start them with STARTING A TEMP above, one request per temp, and tell the human which you started. Do not do the work yourself instead, and do not start them any other way.',
      'LIVE ROSTER: you receive the live roster on every turn. Each row carries ctx NN%, that agent\'s context window occupancy. Prefer a low ctx agent for a big task; treat a near full one as busy even if its token count looks small.'
    ] : [];
    const roleLine = meta.isGod
      ? ''
      : meta.isAssistant
        ? `You are ${godNameForPrompt}'s PREP ASSISTANT. You receive short, possibly vague instructions, each starting with "ENRICH TASK:". For each: (1) work out which project it concerns and cd into that repo (you start in ${godNameForPrompt}'s home directory); (2) gather concrete context READ ONLY (exact paths, current state, relevant code, conventions, active branch, gotchas); never modify, create or delete files; (3) rewrite the instruction into ONE clear, self contained prompt ${godNameForPrompt} can run autonomously, keeping the original intent and inventing no scope. Deliver it as ONE outbox message with "to":"god", "act":"request", a short subject, and the prompt as the body. Do not do the task yourself.`
        : meta.role === 'temp'
          ? 'YOU ARE A TEMP: one job, then done. Your dispatch from god carries the job, the memory index and your reply rules. When finished send god ONE outbox message with "act":"done" and a short result; that releases you. Do not push to any remote; god integrates.'
          : 'For anything ambiguous, cross cutting, or needing sign off, message "god".';
    const slackLine = meta.isGod
      ? 'SLACK: requests can arrive from Slack. Settings, Connections sets the triage. Default: each request comes to you first; hand it to the right agent or start a temp. Alternative: a temp takes each request at once (the harness starts it, switch or not) and you receive one inform per request; do not redo that work, step in only when it fails. A Slack reply, and the "result" of a Slack origin kanban card (posted to the thread verbatim when the card is done), must answer what was asked with the specifics, in Slack mrkdwn: a short *bold* headline, bullets for several items, `backticks` for code and paths, no walls of text, never a bare "done".'
      : `SLACK: when god dispatches you a task that came from Slack, the dispatch includes an exact reply command ("${hiveNode}" "<helper>" --channel ... --thread ... --text "..."). When you finish, run it verbatim to post your result to that thread: a short *bold* headline plus the outcome, specifics and links, never a bare "done".`;
    return [
      `You are "${meta.name}" (${meta.id}), an autonomous agent in a collaborating office of AI agents.`,
      `Your private workspace is ${dir}. The shared hive is ${root}. Full protocol: ${inRoot('PROTOCOL.md')}.`,
      wordsLine,
      'HIVE PROTOCOL, follow it every task:',
      `1. At the START of a task, read ${inDir('memory.md')} and EVERY file in ${inDir('inbox')} (messages other agents sent you). After handling an inbox message, move its file into ${inDir('inbox', '.done')}.`,
      `2. Record durable facts, decisions, and context by appending to ${inDir('memory.md')}.`,
      `3. To ask another agent for something or share information, write ONE message JSON into ${inDir('outbox')} (schema in PROTOCOL.md). NEVER write into another agent's folder; the harness delivers your outbox.`,
      '4. At the END of a task, append what you learned to memory.md so future you remembers.',
      guardrailsLine,
      memoryLine,
      sharedMemoryLine,
      knowledgeLine,
      capabilitiesLine,
      ...godLines,
      ...spawnLines,
      roleLine,
      runtimeLine,
      slackLine,
      `CONNECTIONS: to add or change an inbound webhook, Slack or the default agents yourself, write a request file as ${inRoot('connections', 'README.md')} explains; never edit config files.`,
      `Env vars available to you: AGENT_ID, AGENT_NAME, HIVE_ROOT, AGENT_DIR.`
    ].filter(Boolean).join('\n');
  }

  // — messaging —

  /** Normalize a partial message into a full HiveMessage. */
  private normalize(partial: Partial<HiveMessage>, from: string): HiveMessage {
    const act = (partial.act ?? 'inform') as MessageAct;
    return {
      id: partial.id ?? `${stamp()}-${shortRand()}`,
      conversation: partial.conversation ?? `conv-${shortRand()}`,
      in_reply_to: partial.in_reply_to ?? null,
      from: partial.from ?? from,
      to: partial.to ?? 'god',
      act,
      subject: partial.subject ?? '',
      body: partial.body ?? '',
      hops: typeof partial.hops === 'number' ? partial.hops : 0,
      requires_reply: partial.requires_reply ?? ['request', 'query', 'propose'].includes(act),
      needs_human: partial.needs_human ?? false,
      created_at: partial.created_at ?? new Date().toISOString()
    };
  }

  /** Atomically deliver a message into a recipient agent's inbox.
   *  Returns false when the recipient has no inbox, so the caller can bounce and
   *  log the drop rather than let the message vanish. */
  private deliver(msg: HiveMessage, toId: string): boolean {
    const inbox = join(this.agentDir(toId), 'inbox');
    if (!existsSync(inbox)) return false; // unknown recipient — the caller reports it
    this.atomicWriteJson(join(inbox, `${msg.id}.json`), msg);
    return true;
  }

  /** Inject a message directly (used by the orchestrator / UI / tests). */
  send(partial: Partial<HiveMessage>, from = 'system'): HiveMessage {
    const msg = this.normalize(partial, from);
    this.routeMessage(msg);
    this.commit(`hive: msg ${msg.from}→${msg.to} (${msg.act})`);
    return msg;
  }

  /**
   * Teams (plan 4.6). The bridge to other machines registers here; hive.ts
   * itself never imports it, so a solo build's router is the upstream one
   * plus this one branch. `send` takes a message addressed `member:<id>`;
   * `rosterLine` adds the teammates on other machines to god's roster.
   */
  private remote: RemoteBridge = {};

  setRemote(remote: RemoteBridge): void {
    this.remote = remote;
  }

  private routeMessage(msg: HiveMessage): void {
    if (msg.hops > HOP_CAP) {
      // loop guard — drop a runaway message rather than let agents ping-pong.
      // There's no human queue to fall back on; the god agent owns conflicts.
      this.appendLog({ kind: 'drop', reason: 'hop-cap', from: msg.from, to: msg.to, id: msg.id });
      return;
    }
    const reg = this.registry();
    const godId = reg.godId ?? 'god';
    // A teammate on another machine, BEFORE the registry lookup: `member:` is
    // not an agent id and never will be. The bridge seals, sends and records
    // the delivery; without a bridge (a solo build, or a machine that is not
    // in a team) the message bounces to god with the reason, like every other
    // undeliverable address.
    if (msg.to.startsWith('member:')) {
      if (this.remote.send) {
        this.remote.send(msg);
        this.appendLog({ kind: 'route', via: 'teams', from: msg.from, to: msg.to, id: msg.id, act: msg.act });
        this.noteOutbox(msg, reg);
      } else {
        this.appendLog({ kind: 'drop', reason: 'no-teams', from: msg.from, to: msg.to, id: msg.id });
        this.deliver({
          ...msg,
          to: godId,
          subject: `[undeliverable — "${msg.to}" is a teammate on another machine and this machine is not in a team] ${msg.subject}`
        }, godId);
      }
      return;
    }
    // The hive has no separate human-approval queue — approvals are native to
    // each agent's Claude Code session (and approvable remotely). A message aimed
    // at "human" is handled by the god/orchestrator, the human's proxy here.
    const resolveTo = (to: string): string => (to === 'human' || to === 'god' ? godId : to);
    const targets = msg.to === 'broadcast'
      // The roster for fan-out is the ACTIVE registry: skip the send-only prep
      // assistant and any archived agent (closed tab). Hookless providers are
      // NOT skipped — the per-target path below already serves them a terminal
      // work order, so excluding them here only made a broadcast invisible to an
      // agent that direct mail reaches fine. See selectBroadcastTargets.
      ? selectBroadcastTargets(reg.agents, msg.from)
      // Never deliver to self — guards a god → "human" message looping back to god.
      : [resolveTo(msg.to)].filter((t) => t !== msg.from);
    // Targets that actually took delivery. The log below reports these instead of
    // intent, so a bounced or dropped message can never read as delivered.
    const delivered: string[] = [];
    for (const t of targets) {
      // The send-only prep assistant must never be a delivery target: it doesn't
      // drain an inbox, so direct mail to it would rot unread (observed live: a
      // task brief plus the follow-up reprimand about the unread inbox, both
      // unread for hours). Bounce such mail to god instead, so the sender's intent
      // surfaces immediately and nothing is silently lost.
      if (reg.agents[t]?.isAssistant) {
        this.deliver({
          ...msg,
          to: godId,
          subject: `[bounced — "${t}" is the send-only prep assistant; route work to a real agent] ${msg.subject}`
        }, godId);
        continue;
      }
      // A provider without safe-idle lifecycle state (a hookless custom command)
      // would let direct mail rot unread. Claude and bridged Antigravity/Codex
      // receive directly into inbox/ for guarded renderer delivery. Otherwise try
      // a terminal work-order handoff to its REPL (#53);
      // if the renderer is unavailable, bounce to god to relay. God is exempt
      // (the bounce target).
      if (t !== godId && !canReceiveInbox(reg.agents[t]?.provider)) {
        if (!this.emitTerminalHandoff(msg, t)) {
          this.deliver({
            ...msg,
            to: godId,
            subject: `[undeliverable — "${t}" runs ${reg.agents[t]?.provider ?? 'a hookless CLI'} and the terminal handoff failed (renderer unavailable); relay this to it] ${msg.subject}`
          }, godId);
        } else delivered.push(t);
        continue;
      }
      // 1d — proxy-tier providers (qwen) CAN receive inbox, but only via a
      // SYNTHESIZED Stop, which just advances the cursor — the sidecar observes the
      // CLI's stream and can't inject a drain reason back into its turn. So the real
      // mail rides the terminal work-order path verbatim, exactly like a hookless
      // provider; the synthesized Stop→drain keeps the cursor in step.
      const proxyDesc = bridgeOf(reg.agents[t]?.provider);
      if (t !== godId && proxyDesc?.kind === 'proxy' && proxyDesc.inboxDelivery === 'terminal') {
        if (!this.emitTerminalHandoff(msg, t)) {
          this.deliver({
            ...msg,
            to: godId,
            subject: `[undeliverable — "${t}" runs ${reg.agents[t]?.provider ?? 'a proxy-tier CLI'} and the terminal handoff failed (renderer unavailable); relay this to it] ${msg.subject}`
          }, godId);
        } else delivered.push(t);
        continue;
      }
      if (this.deliver(msg, t)) { delivered.push(t); continue; }
      // 0.4.9: not an agent on this floor, so maybe a TEAMMATE by name. The
      // bridge answers from its cached roster: a person's name or an
      // orchestrator's nickname that matches exactly one row rewrites the
      // address to member:<id> and rides the Teams path above; two or more
      // matches bounce to god naming them; no match falls through to the
      // undeliverable bounce below. God and broadcast never reach here.
      if (t !== godId && !reg.agents[t] && this.remote.resolve) {
        const found = this.remote.resolve(t);
        if (found && 'memberId' in found && this.remote.send) {
          const to = `member:${found.memberId}`;
          this.remote.send({ ...msg, to });
          this.appendLog({ kind: 'route', via: 'teams', from: msg.from, to, id: msg.id, act: msg.act, name: t });
          delivered.push(to);
          continue;
        }
        if (found && 'ambiguous' in found) {
          this.appendLog({ kind: 'drop', reason: 'ambiguous-name', from: msg.from, to: t, id: msg.id });
          this.deliver({
            ...msg,
            to: godId,
            subject: `[undeliverable — "${t}" matches more than one teammate: ${found.ambiguous.join('; ')}; write to one by member:<id>] ${msg.subject}`
          }, godId);
          continue;
        }
      }
      // No agents/<t>/inbox — an id that isn't on the floor. This was the one
      // delivery failure with neither bounce nor log, so the sender saw a routed
      // message and the mail simply ceased to exist. Record the drop beside the
      // hop-cap one and bounce to god, mirroring the undeliverable bounces above.
      this.appendLog({ kind: 'drop', reason: 'no-inbox', from: msg.from, to: t, id: msg.id });
      if (t !== godId) {
        this.deliver({
          ...msg,
          to: godId,
          subject: `[undeliverable — no agent "${t}" on this floor; check the id against the roster] ${msg.subject}`
        }, godId);
      }
    }
    this.appendLog({ kind: 'message', from: msg.from, to: msg.to, act: msg.act, subject: msg.subject, id: msg.id, delivered });
    this.noteOutbox(msg, reg);
    this.emitMessage(msg, targets);
    // Main-process observer seam for features that react to hive traffic.
    // Best-effort, never breaks routing. No caller wires it today.
    try { this.routedObserver?.(msg, targets); } catch { /* observer error */ }
  }

  /** Observer invoked for EVERY routed message with its resolved targets.
   *  A seam for main-process features that react to hive traffic. */
  private routedObserver: ((msg: HiveMessage, targets: string[]) => void) | null = null;
  setRoutedObserver(cb: ((msg: HiveMessage, targets: string[]) => void) | null): void {
    this.routedObserver = cb;
  }

  /** v0.4.9 phase 2 (D4): where a routed message lands in its SENDER's activity
   *  digest (main/activityDigest.ts). Set by the main process; a no-op in tests
   *  and headless runs. */
  private activitySink: ((agentId: string, entry: ActivityEntry) => void) | null = null;
  setActivitySink(cb: ((agentId: string, entry: ActivityEntry) => void) | null): void {
    this.activitySink = cb;
  }

  /** The sender's outbox line. Only an agent on the floor has a digest: a
   *  person's dispatch ('human'), system mail and an id that is not in the
   *  registry have no card to show it on. Best-effort, never breaks routing. */
  private noteOutbox(msg: HiveMessage, reg: Registry): void {
    if (!this.activitySink) return;
    if (msg.from === 'human' || msg.from === 'system' || !reg.agents[msg.from]) return;
    const created = Date.parse(msg.created_at);
    const entry = entryForMessage(msg.subject, Number.isFinite(created) ? created : Date.now());
    if (!entry) return;
    try { this.activitySink(msg.from, entry); } catch { /* the digest is a mirror, never a gate */ }
  }

  /** Tell the renderer a message was routed, with its resolved recipients, so
   *  the floor can fly an envelope from the sender to each one. Best-effort. */
  private emitMessage(msg: HiveMessage, targets: string[]): void {
    this.emit?.('hive:message', {
      id: msg.id,
      from: msg.from,
      to: msg.to,
      act: msg.act,
      subject: msg.subject,
      targets,
      // Coral-tints the floor envelope for a message the agent flagged for the
      // human (now routed to the god proxy). Cosmetic only — no queue behind it.
      needsHuman: msg.to === 'human'
    });
  }

  /** Non-Claude providers cannot drain hive inbox; hand direct mail to the
   *  renderer so it can queue a terminal work order for the target PTY. */
  private emitTerminalHandoff(msg: HiveMessage, targetId: string): boolean {
    const delivered = this.emit?.('hive:terminalHandoff', {
      id: msg.id,
      from: msg.from,
      to: targetId,
      act: msg.act,
      subject: msg.subject,
      body: msg.body,
      requiresReply: msg.requires_reply,
      createdAt: msg.created_at
    }) === true;
    this.appendLog({
      kind: 'terminal-handoff',
      from: msg.from,
      to: targetId,
      act: msg.act,
      subject: msg.subject,
      id: msg.id,
      delivered
    });
    return delivered;
  }

  // — router: drain outboxes → inboxes —

  /** Poll-based router. Cheap and robust vs fs.watch quirks on macOS. */
  startRouter(intervalMs = 1500): void {
    if (this.routerTimer || !this.enabled()) return;
    this.routerTimer = setInterval(() => {
      try { this.routeOnce(); } catch { /* keep the loop alive */ }
    }, intervalMs);
  }
  stopRouter(): void {
    if (this.routerTimer) { clearInterval(this.routerTimer); this.routerTimer = null; }
  }

  routeOnce(): number {
    const root = this.root();
    if (!root) return 0;
    try { this.keyAgentTasks(); } catch { /* keying is best effort; routing must go on */ }
    const agentsDir = join(root, 'agents');
    if (!existsSync(agentsDir)) return 0;
    let routed = 0;
    for (const id of readdirSync(agentsDir)) {
      const outbox = join(agentsDir, id, 'outbox');
      if (!existsSync(outbox)) continue;
      for (const f of readdirSync(outbox)) {
        if (!f.endsWith('.json')) continue;
        const full = join(outbox, f);
        try {
          const raw = readFileSync(full, 'utf8');
          let partial: Partial<HiveMessage>;
          try {
            partial = JSON.parse(raw) as Partial<HiveMessage>;
          } catch {
            const repaired = repairLiteralLineBreaksInJsonStrings(raw);
            if (!repaired.changed) {
              this.appendLog({ kind: 'drop', reason: 'malformed-json', from: id, file: f });
              try { renameSync(full, join(outbox, '.sent', `bad-${f}`)); } catch { /* noop */ }
              continue;
            }
            try {
              partial = JSON.parse(repaired.text) as Partial<HiveMessage>;
            } catch {
              this.appendLog({ kind: 'drop', reason: 'malformed-json', from: id, file: f });
              try { renameSync(full, join(outbox, '.sent', `bad-${f}`)); } catch { /* noop */ }
              continue;
            }
            this.appendLog({
              kind: 'outbox-repair',
              from: id,
              file: f,
              repair: 'literal-line-break'
            });
          }
          const msg = this.normalize(partial, id);
          msg.from = id; // sender is authoritative — the owning directory
          this.routeMessage(msg);
          renameSync(full, join(outbox, '.sent', f)); // archive, don't reprocess
          routed++;
        } catch {
          // malformed file — quarantine so we don't spin on it
          try { renameSync(full, join(outbox, '.sent', `bad-${f}`)); } catch { /* noop */ }
        }
      }
    }
    if (routed > 0) this.commit(`hive: routed ${routed} message(s)`);
    return routed;
  }

  // — read helpers (for IPC / UI) —

  registry(): Registry {
    const root = this.root();
    if (!root) return { godId: null, agents: {} };
    return this.readJson<Registry>(join(root, 'registry.json'), { godId: null, agents: {} });
  }
  board(): string {
    const root = this.root();
    return root && existsSync(join(root, 'board.md')) ? readFileSync(join(root, 'board.md'), 'utf8') : '';
  }
  tasks(): unknown {
    const root = this.root();
    return root ? this.readJson(join(root, 'tasks.json'), { tasks: [] }) : { tasks: [] };
  }

  // — hygiene (v0.4.9 W-A): the archive ledger, the board archive, the latch —

  /** The archive ledger beside the live one: `<root>/tasks-archive.json`, the
   *  same shape plus `archivedAt`, `archiveReason` and `archiveNote` on each
   *  card, newest first. Read by `hive:tasksArchive` for the Archived chip. */
  tasksArchive(): unknown {
    const root = this.root();
    return root ? this.readJson(join(root, 'tasks-archive.json'), { tasks: [] }) : { tasks: [] };
  }

  /** The sweep's one write to the two ledgers. `live` is the raw list the
   *  caller just read (so the plan and the write see the same cards); `apply`
   *  is the pure shared/taskHygiene.applySweepPlan bound to that plan. Raw
   *  cards go back to disk as they came, so a field the god hand-wrote and the
   *  app never modelled survives the move. One commit for both files. */
  applyTaskHygiene(
    live: unknown[],
    apply: (archive: unknown[]) => { live: unknown[]; archive: unknown[]; archived: number; stamped: number }
  ): { archived: number; stamped: number } {
    const root = this.root();
    if (!root) return { archived: 0, stamped: 0 };
    this.ensureHive();
    const archivePath = join(root, 'tasks-archive.json');
    const current = this.readJson<{ tasks?: unknown }>(archivePath, { tasks: [] });
    const archive = Array.isArray(current?.tasks) ? current.tasks : [];
    const next = apply(archive);
    if (!next.archived && !next.stamped) return { archived: 0, stamped: 0 };
    if (next.archived) this.writeJson(archivePath, { tasks: next.archive });
    const livePath = join(root, 'tasks.json');
    this.writeLedger(livePath, this.readJson<unknown>(livePath, { tasks: [] }), next.live);
    this.appendLog({ kind: 'tasks-hygiene', archived: next.archived, stamped: next.stamped, live: live.length - next.archived });
    this.commit(`hive: archived ${next.archived} task(s), stamped ${next.stamped}`);
    return { archived: next.archived, stamped: next.stamped };
  }

  /** Append one dated block to `<root>/board-archive.md` and return its path.
   *  Append only: this file is the record of every board the god was asked to
   *  condense, and nothing ever rewrites it. */
  appendBoardArchive(entry: string): string {
    const root = this.root()!;
    const p = join(root, 'board-archive.md');
    if (!existsSync(p)) {
      writeFileSync(p, '# Board archive\n\n_Every full copy of board.md taken before it was condensed. Append only; the god condenses board.md, never this file._\n', 'utf8');
    }
    appendFileSync(p, entry, 'utf8');
    return p;
  }

  /** The board latch, in `<root>/hygiene.json`: when the outstanding "condense
   *  the board" ask was sent, or null when none is outstanding. On disk so a
   *  restart does not ask again while the same crossing is still open. */
  hygieneState(): { boardAskedAt: number | null } {
    const root = this.root();
    if (!root) return { boardAskedAt: null };
    const s = this.readJson<{ boardAskedAt?: unknown }>(join(root, 'hygiene.json'), {});
    return { boardAskedAt: typeof s?.boardAskedAt === 'number' ? s.boardAskedAt : null };
  }
  setHygieneState(state: { boardAskedAt: number | null }): void {
    const root = this.root();
    if (!root) return;
    this.writeJson(join(root, 'hygiene.json'), state);
    this.commit('hive: hygiene state');
  }

  /** Persist the task ledger to hive/tasks.json and commit it. Mirrors the
   *  board/message persist pattern: write JSON, log the change, single-commit.
   *
   *  MERGES by card id instead of clobbering. Callers hold PARTIAL models of a
   *  card — the renderer's kanban parser knows nine fields, the god writes as
   *  many as the work needs (`result`, the verbatim Slack reply posted back to
   *  the user; `repo`; `scope`; `origin`; `commit`; …). A wholesale write meant
   *  one small edit through the UI deleted every unmodelled field on EVERY card
   *  on the board. Now an unmentioned field keeps its on-disk value.
   *
   *  Deleting a card still works: the incoming list IS the membership, so a card
   *  dropped from it (TasksKanban dismiss, the voice delete_task action) is
   *  gone. Merging protects fields, never card membership. */
  writeTasks(tasks: HiveTask[]): void {
    const root = this.root();
    if (!root) return;
    this.ensureHive();
    const path = join(root, 'tasks.json');
    const current = this.readJson<{ tasks?: unknown }>(path, { tasks: [] });
    // A writer holding a copy from before the harness keyed a card (the UI
    // between polls, Slack, a webhook) still names it by its old id: map that
    // to the key first, or the merge would treat it as a new card and drop the
    // fields only the disk has.
    const onDisk = Array.isArray(current?.tasks) ? current.tasks as HiveTask[] : [];
    const incoming = (Array.isArray(tasks) ? tasks : []).map((c) => {
      const hit = c && typeof c.id === 'string' ? resolveTask(onDisk, c.id) : undefined;
      return hit && hit.id !== c.id ? { ...c, id: hit.id } : c;
    });
    const merged = this.writeLedger(path, current, mergeTaskLedger(current?.tasks, incoming));
    this.appendLog({ kind: 'tasks', count: merged.length });
    this.commit(`hive: tasks (${merged.length})`);
  }

  /** Append one card against the latest on-disk ledger. Renderer callers must
   *  use this instead of re-writing a collection they read before another
   *  source (webhook, Slack, god, voice) added work. Idempotent by task id. */
  addTask(task: HiveTask): boolean {
    const ledger = this.tasks() as { tasks?: HiveTask[] };
    const tasks = Array.isArray(ledger?.tasks) ? ledger.tasks : [];
    if (task.id && resolveTask(tasks, task.id)) return false;
    this.writeTasks([...tasks, task]);
    return true;
  }

  /** Patch one card against the latest on-disk ledger, preserving unrelated
   *  cards and fields (notably webhook.tokenHash and Slack thread metadata). */
  patchTask(id: string, patch: Partial<Omit<HiveTask, 'id'>>): boolean {
    const ledger = this.tasks() as { tasks?: HiveTask[] };
    const tasks = Array.isArray(ledger?.tasks) ? ledger.tasks : [];
    // By key, or by the id the writer gave it before it was keyed (Slack and
    // webhooks patch the card they made by the id they made it with).
    const hit = resolveTask(tasks, id);
    const index = hit ? tasks.indexOf(hit) : -1;
    if (index < 0) return false;
    const next = tasks.slice();
    next[index] = { ...tasks[index], ...patch, id: tasks[index].id };
    this.writeTasks(next);
    return true;
  }

  /** Patch many cards in ONE read, ONE write and ONE commit (0.5.3, founder on
   *  rc.4: Dismiss all "is doing it one by one and then stopping midway").
   *  patchTask per card meant a full rewrite and a git commit per question,
   *  in series, so a long list crawled and one failed commit ended the run.
   *  A card that is gone is skipped, never an error for the rest. Returns the
   *  ids that were patched. */
  patchTasks(patches: ReadonlyArray<{ id: string; patch: Partial<Omit<HiveTask, 'id'>> }>): string[] {
    const ledger = this.tasks() as { tasks?: HiveTask[] };
    const tasks = Array.isArray(ledger?.tasks) ? ledger.tasks : [];
    // A patch may name a card by its pre-key id (alias); apply it to the key.
    const keyOf = new Map<string, string>();
    const keyed = patches.map(({ id, patch }) => {
      const key = resolveTask(tasks, id)?.id ?? id;
      if (!keyOf.has(key)) keyOf.set(key, id);
      return { id: key, patch };
    });
    const { next, applied } = applyTaskPatches(tasks, keyed);
    if (applied.length) this.writeTasks(next);
    return applied.map((key) => keyOf.get(key) ?? key);
  }

  /** Delete only the named card from the latest on-disk ledger. */
  deleteTask(id: string): boolean {
    const ledger = this.tasks() as { tasks?: HiveTask[] };
    const tasks = Array.isArray(ledger?.tasks) ? ledger.tasks : [];
    const hit = resolveTask(tasks, id);
    const next = tasks.filter((task) => task !== hit);
    if (!hit || next.length === tasks.length) return false;
    this.writeTasks(next);
    return true;
  }
  memory(id: string): string {
    const p = join(this.agentDir(id), 'memory.md');
    return existsSync(p) ? readFileSync(p, 'utf8') : '';
  }
  /** Whether an agent has recorded NON-TRIVIAL memory — i.e. has appended real
   *  notes beyond the boilerplate header ensureAgent seeds. Lets the voice
   *  read-layer answer "what has the team remembered" and enumerate who has
   *  anything worth reading (every registered agent technically has a memory.md,
   *  but most of the floor's history lives in a handful of them). Cheap: reads a
   *  small markdown file; never throws. Works for ANY id, active OR archived. */
  hasMemory(id: string): boolean {
    const p = join(this.agentDir(id), 'memory.md');
    if (!existsSync(p)) return false;
    try {
      // A fresh seed is ~90 chars (one header line + the prompt). Anything
      // meaningfully longer means the agent appended durable facts.
      return readFileSync(p, 'utf8').trim().length > 200;
    } catch { return false; }
  }
  /** One row per registered agent, active and archived alike, for the memory
   *  index a temp reads at spawn (0.4.11, memoryIndex.ts). `empty` is the
   *  existing hasMemory() judgement; size and time come from a stat so a file
   *  that was never written still gets a row with its would be path. Never
   *  throws: a stat failure reads as never written. */
  memoryIndexRows(): MemoryIndexRow[] {
    const root = this.root();
    if (!root) return [];
    const reg = this.registry();
    const rows: MemoryIndexRow[] = [];
    for (const [id, agent] of Object.entries(reg.agents ?? {})) {
      const path = join(this.agentDir(id), 'memory.md');
      let bytes = 0;
      let updatedAt: string | undefined;
      try {
        const st = statSync(path);
        bytes = st.size;
        updatedAt = st.mtime.toISOString();
      } catch { /* never written */ }
      rows.push({
        id,
        name: agent?.name || id,
        role: agent?.role,
        cwd: agent?.cwd,
        path,
        bytes,
        updatedAt,
        empty: !this.hasMemory(id),
        archived: !!agent?.archived
      });
    }
    return rows;
  }
  inbox(id: string): HiveMessage[] {
    return this.listMessages(join(this.agentDir(id), 'inbox'));
  }
  /** Read an agent's OUTBOX (messages it has authored/sent). Symmetric with
   *  inbox(); the router drains live outbox files into recipients' inboxes and
   *  archives the original under outbox/.sent, so a sent message survives there. */
  outbox(id: string): HiveMessage[] {
    return this.listMessages(join(this.agentDir(id), 'outbox'));
  }

  /**
   * Voice read-layer: recent message CONTENT (inbox + outbox bodies) for the
   * operator briefing, REDACTED main-side. This is the message-content half of
   * the voice query surface (the activity half is logTail()).
   *
   * Modes:
   *   - { id }                → the single message with that id, wherever it lives.
   *   - { agentId }           → recent messages in that agent's mailbox only.
   *   - {}                    → recent messages across the whole floor, newest first.
   * `limit` caps the list (default 12, max 200; the voice layer asks for 12, PRO's Inbox for the full 200); `includeArchived` (default true)
   * also reads the handled subfolders (inbox/.done, outbox/.sent).
   *
   * SECURITY: every subject + body is passed through redactSecrets() here, in
   * main, so no secret and no raw body ever crosses IPC. Delivered messages exist
   * in both the sender's outbox/.sent and the recipient's inbox/.done; we dedup
   * by message id so each appears once.
   */
  voiceMessages(opts: { agentId?: string; id?: string; limit?: number; includeArchived?: boolean } = {}): VoiceMessage[] {
    const root = this.root();
    if (!root) return [];
    const agentsDir = join(root, 'agents');
    if (!existsSync(agentsDir)) return [];

    const wantId = typeof opts.id === 'string' ? opts.id.trim() : '';
    const onlyAgent = typeof opts.agentId === 'string' ? opts.agentId.trim() : '';
    const includeArchived = opts.includeArchived !== false; // default true

    let owners: string[];
    try {
      owners = onlyAgent
        ? [onlyAgent]
        : readdirSync(agentsDir).filter((id) => !id.startsWith('.') && existsSync(this.agentDir(id)));
    } catch {
      return [];
    }

    const seen = new Set<string>();
    const out: VoiceMessage[] = [];
    for (const owner of owners) {
      const base = this.agentDir(owner);
      const folders: Array<{ dir: string; direction: 'inbox' | 'outbox'; archived: boolean }> = [
        { dir: join(base, 'inbox'), direction: 'inbox', archived: false },
        { dir: join(base, 'outbox'), direction: 'outbox', archived: false }
      ];
      if (includeArchived) {
        folders.push({ dir: join(base, 'inbox', '.done'), direction: 'inbox', archived: true });
        folders.push({ dir: join(base, 'outbox', '.sent'), direction: 'outbox', archived: true });
      }
      for (const f of folders) {
        for (const m of this.listMessages(f.dir)) {
          if (!m || typeof m.id !== 'string' || seen.has(m.id)) continue;
          seen.add(m.id);
          if (wantId && m.id !== wantId) continue;
          out.push({
            id: m.id,
            conversation: m.conversation,
            from: m.from,
            to: m.to,
            act: m.act,
            subject: redactSecrets(m.subject),
            body: redactSecrets(m.body),
            requires_reply: !!m.requires_reply,
            direction: f.direction,
            owner,
            archived: f.archived,
            created_at: m.created_at
          });
        }
      }
    }

    // Newest first by ISO created_at (lexicographic == chronological for ISO-8601).
    out.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
    if (wantId) return out.slice(0, 1);
    const lim = typeof opts.limit === 'number' && isFinite(opts.limit)
      ? Math.max(1, Math.min(200, Math.round(opts.limit)))
      : 12;
    return out.slice(0, lim);
  }
  /** Count undrained inbox messages for an agent (cheap — for the fleet snapshot). */
  inboxBacklog(id: string): number {
    const dir = join(this.agentDir(id), 'inbox');
    if (!existsSync(dir)) return 0;
    try { return readdirSync(dir).filter((f) => f.endsWith('.json')).length; } catch { return 0; }
  }
  /** Install the Antigravity (`agy`) lifecycle-hook bridge: write the normalizer
   *  shim and merge a `munder-hive` hook group into agy's global hooks.json so a
   *  Gemini worker reports PreToolUse/PostToolUse/Stop/PreInvocation/PostInvocation
   *  to this HookServer (live status + guarded idle delivery), reusing the Claude pipeline.
   *
   *  Two agy-isms handled: (1) antigravity-cli#49 — agy LOADS hooks from
   *  `~/.gemini/antigravity-cli/hooks.json` but TRIGGERS from `~/.gemini/config/
   *  hooks.json`, so we write BOTH; (2) on Windows commands go to cmd.exe and
   *  agy mangles embedded quotes, so that platform retains the legacy form.
   *  Runtime-scoped by AGENT_ID (the shim no-ops for non-hive agy sessions), so
   *  this global config never disturbs the user's own `agy` usage. Best-effort,
   *  idempotent (only our own group is overwritten). */
  private installAgyHooks(): void {
    const root = this.root();
    if (!root) return;
    // The per floor copy is still written for one release: a floor on 0.5.2
    // rewrites the hook file to name THIS path, and must find a shim there.
    const legacy = join(root, 'bin', 'agy-hook.cjs');
    mkdirSync(join(root, 'bin'), { recursive: true });
    writeFileSync(legacy, AGY_HOOK_SHIM, 'utf8');
    // The hook file itself names the per user, floor independent copy.
    const shared = this.installSharedShim('agy-hook.cjs');
    const shim = shared?.shim ?? legacy;
    // Bundled node, not bare `node` — agy's hooks run with a stripped PATH too.
    const command = (event: string) => process.platform === 'win32'
      ? (shared ? [shared.launcher, shim, event].join(' ') : this.nodeRunUnquoted(shim, event))
      : (shared ? [`"${shared.launcher}"`, `"${shim}"`, event].join(' ') : this.nodeRun(shim, event));
    const tool = (event: string) => ({
      matcher: '*',
      hooks: [{ type: 'command', command: command(event), timeout: 0 }]
    });
    const plain = (event: string) => ({
      hooks: [{ type: 'command', command: command(event), timeout: 0 }]
    });
    const group = {
      PreToolUse: [tool('PreToolUse')],
      PostToolUse: [tool('PostToolUse')],
      PreInvocation: [plain('PreInvocation')],
      PostInvocation: [plain('PostInvocation')],
      Stop: [plain('Stop')]
    };
    const gem = join(homedir(), '.gemini');
    for (const p of [join(gem, 'config', 'hooks.json'), join(gem, 'antigravity-cli', 'hooks.json')]) {
      try {
        mkdirSync(dirname(p), { recursive: true });
        let existing: Record<string, unknown> = {};
        if (existsSync(p)) {
          try { existing = JSON.parse(readFileSync(p, 'utf8')) as Record<string, unknown>; } catch { existing = {}; }
        }
        existing['munder-hive'] = group;
        writeFileSync(p, JSON.stringify(existing, null, 2), 'utf8');
      } catch { /* best-effort per file */ }
    }
  }

  /** Official Google Gemini CLI lifecycle bridge. Gemini's hook payload is
   *  already snake_case; the shim maps event names into HookServer's common
   *  vocabulary and translates deny/steering replies back to Gemini.
   *
   *  The system settings path is per agent. Gemini merges object and array
   *  settings across layers, so auth and user settings remain in their normal
   *  GEMINI_CLI_HOME while this trusted bridge stays isolated. */
  private installGeminiHooks(dir: string): string {
    const home = join(dir, '.gemini-hive');
    const settingsPath = join(home, 'system-settings.json');
    try {
      mkdirSync(home, { recursive: true });
      const shim = join(home, 'gemini-hook.cjs');
      writeFileSync(shim, GEMINI_HOOK_SHIM, 'utf8');
      const hook = (name: string, matcher?: string) => ({
        ...(matcher ? { matcher } : {}),
        sequential: true,
        hooks: [{
          name: `munder-hive-${name}`,
          type: 'command',
          command: process.platform === 'win32'
            ? this.nodeRunUnquoted(shim)
            : this.nodeRun(shim),
          timeout: 30000
        }]
      });
      const settings = {
        hooksConfig: { enabled: true, notifications: false },
        hooks: {
          SessionStart: [hook('session-start')],
          BeforeAgent: [hook('before-agent')],
          BeforeTool: [hook('before-tool', '.*')],
          AfterTool: [hook('after-tool', '.*')],
          AfterAgent: [hook('after-agent')]
        }
      };
      writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    } catch (e) { console.error('[hive] installGeminiHooks failed:', e); }
    return settingsPath;
  }

  /** Codex lifecycle-hook bridge → full hive parity for a `codex` worker (live
   *  status + Stop→inbox-drain), the codex counterpart of installAgyHooks().
   *
   *  Codex's hook contract is already Claude-shaped: snake_case stdin
   *  (hook_event_name/tool_name/tool_input/session_id/cwd) and a matching response
   *  contract, where `Stop` honoring {decision:'block',reason} means "continue,
   *  using reason as the next prompt" — exactly what drainForStop() returns. So we
   *  reuse the Claude `cth-hook` shim VERBATIM (no translator, unlike agy) and let
   *  HookServer handle everything unchanged.
   *
   *  ISOLATION: rather than mutate the user's global Codex configuration (which
   *  also holds their login), we point this worker at a PER-AGENT CODEX_HOME
   *  (`<dir>/.codex`, alongside Claude's settings.json) holding our own config.toml
   *  with `[hooks]` tables — so the hooks fire ONLY for hive workers and a personal
   *  `codex` run is untouched. Rollout directories are linked into that isolated
   *  home from namespaced paths under the standard global scan roots. The user's
   *  ~/.codex/auth.json is linked in and their config.toml is copied + extended
   *  (login + model/provider/trust settings still apply).
   *  Returns the CODEX_HOME path for the caller to put in the worker's env. */
  private installCodexHooks(dir: string, agentId: string): string {
    const home = join(dir, '.codex');
    try {
      mkdirSync(home, { recursive: true });
      const userHome = join(homedir(), '.codex');
      // Symlink the user's login so the isolated home authenticates as them.
      // (config.toml is NOT symlinked — we write our own below, seeded from theirs,
      // because it must carry our [hooks] tables.) Fall back to copy where symlinks
      // need privilege (Windows). Idempotent — skip if already linked.
      const authSrc = join(userHome, 'auth.json');
      const authDest = join(home, 'auth.json');
      if (existsSync(authSrc) && !existsSync(authDest)) {
        try { symlinkSync(authSrc, authDest); }
        catch { try { copyFileSync(authSrc, authDest); } catch { /* best-effort */ } }
      }
      // The managed app-server daemon used by Codex Remote Control is launched
      // from the standalone install rooted at $CODEX_HOME/packages. Share the
      // user's installed binaries without duplicating them into every agent.
      const packagesSrc = join(userHome, 'packages');
      const packagesDest = join(home, 'packages');
      if (existsSync(packagesSrc) && !existsSync(packagesDest)) {
        try {
          symlinkSync(packagesSrc, packagesDest, process.platform === 'win32' ? 'junction' : 'dir');
        } catch { /* remote integration falls back to a local TUI if unavailable */ }
      }
      // Wire lifecycle hooks via config.toml `[hooks]` tables — the user-layer
      // discovery surface Codex actually scans. (A bare $CODEX_HOME/hooks.json is
      // plugin-scoped — referenced FROM a plugin manifest — and is NOT discovered
      // for a plain config dir; verified empirically that it never fires.) We seed
      // this config.toml from the user's (their model/provider/trust settings carry
      // over) and append a `[[hooks.<Event>]]` group per event, each pointing at the
      // SAME cth-hook shim — reused verbatim (Codex's hook payload + response are
      // already Claude-shaped, so HookServer/drainForStop run unchanged). Regenerated
      // each spawn (idempotent). Serialize the generated command as a TOML basic
      // string; JSON string escaping is compatible here and, on POSIX, preserves
      // the embedded quotes required when a user-selected hive path has spaces.
      // NOTE: hooks fire in INTERACTIVE codex sessions (how hive workers run),
      // not in headless `codex exec`.
      //
      // `timeout` IS SECONDS HERE — do NOT copy Claude's `timeout: 0` sentinel into
      // this file. Codex parses the key as `timeout_sec` and normalizes it with
      // `timeout_sec.unwrap_or(600).max(1)`, so 0 does not mean "no timeout": it is
      // floored to ONE SECOND, the shortest budget there is. That shipped through
      // v0.3.7 and made every codex worker log `SessionStart hook (failed) — hook
      // timed out after 1s` (same for UserPromptSubmit), because each hook cold-starts
      // the Electron binary via hive-node and then waits on hooks.sock — measured
      // 0.08-0.16s idle but 0.6-0.7s under 8 concurrent spawns, which is exactly what
      // session start and prompt dispatch look like. 30s clears that by two orders of
      // magnitude while still capping a wedged shim well before its own 5s internal
      // cap stops mattering; bare omission (600s) would leave a hang looking like a
      // freeze. Verify any change with codex's own resolver, no model spend:
      // `codex app-server` → initialize → `hooks/list` reports the normalized
      // timeoutSec per event.
      const shim = this.shimPath();
      let config = existsSync(join(userHome, 'config.toml'))
        ? readFileSync(join(userHome, 'config.toml'), 'utf8') : '';
      if (shim) {
        const events = ['PreToolUse', 'PostToolUse', 'Stop', 'SubagentStop',
          'SessionStart', 'UserPromptSubmit', 'PreCompact', 'PostCompact'];
        // Preserve the existing Windows .cmd shape: nested command quotes pass
        // through a different shell stack there (#350). The reported Codex bug
        // is POSIX, where ordinary shell quoting is both necessary and verified.
        const command = process.platform === 'win32'
          ? this.nodeRunUnquoted(shim)
          : this.nodeRun(shim);
        config += '\n# --- munder-hive lifecycle hooks (auto-generated; do not edit) ---\n';
        for (const ev of events) {
          config += `\n[[hooks.${ev}]]\n[[hooks.${ev}.hooks]]\ntype = "command"\ncommand = ${JSON.stringify(command)}\ntimeout = 30\n`;
        }
      }
      writeFileSync(join(home, 'config.toml'), config, 'utf8');

      // Keep each worker's CODEX_HOME isolated while putting its rollout data
      // below Codex's standard scan roots. External usage tools can then discover
      // the sessions without understanding the hive's private directory layout.
      this.exposeCodexDataDirs(home, userHome, agentId);
    } catch (e) { console.error('[hive] installCodexHooks failed:', e); }
    return home;
  }

  private exposeCodexDataDirs(home: string, userHome: string, agentId: string): void {
    for (const kind of ['sessions', 'archived_sessions'] as const) {
      try { this.exposeCodexDataDir(home, userHome, agentId, kind); }
      catch (e) { console.error(`[hive] exposeCodexDataDir(${kind}) failed:`, e); }
    }
  }

  private moveCodexDataDir(from: string, to: string): void {
    try {
      renameSync(from, to);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'EXDEV') throw e;
      cpSync(from, to, { recursive: true, force: false, errorOnExist: true });
      rmSync(from, { recursive: true, force: true });
    }
  }

  private exposeCodexDataDir(
    home: string,
    userHome: string,
    agentId: string,
    kind: 'sessions' | 'archived_sessions'
  ): void {
    const root = this.root();
    if (!root) return;
    if (!agentId || basename(agentId) !== agentId || agentId === '.' || agentId === '..') {
      throw new Error(`invalid agent id: ${agentId}`);
    }
    const source = join(home, kind);
    const scanRoot = join(userHome, kind, 'munder-difflin');
    const hiveId = createHash('sha1').update(root).digest('hex').slice(0, 12);
    const target = join(scanRoot, hiveId, agentId);

    let sourceStat: ReturnType<typeof lstatSync> | null = null;
    try { sourceStat = lstatSync(source); }
    catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }

    if (sourceStat?.isSymbolicLink()) {
      let current: string | null = null;
      try { current = realpathSync(source); }
      catch (e) {
        if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
        unlinkSync(source);
        sourceStat = null;
      }
      if (current) {
        const rel = relative(realpathSync(scanRoot), current);
        const scope = dirname(rel);
        if (rel && !rel.startsWith('..') && !isAbsolute(rel)
          && dirname(scope) === '.' && basename(rel) === agentId) return;
        throw new Error(`${source} points outside ${scanRoot}`);
      }
    }
    if (sourceStat && !sourceStat.isDirectory()) throw new Error(`${source} is not a directory`);

    mkdirSync(dirname(target), { recursive: true });
    if (sourceStat) {
      if (existsSync(target)) {
        if (readdirSync(target).length > 0) throw new Error(`${source} and ${target} both contain data`);
        rmSync(target, { recursive: true, force: true });
      }
      this.moveCodexDataDir(source, target);
    } else if (!existsSync(target)) {
      mkdirSync(target, { recursive: true });
    }

    try {
      symlinkSync(target, source, process.platform === 'win32' ? 'junction' : 'dir');
    } catch (e) {
      if (!existsSync(source) && existsSync(target)) {
        try { this.moveCodexDataDir(target, source); } catch { /* data remains at target */ }
      }
      throw e;
    }
  }

  /** Remove rollout directories moved under the user's standard Codex scan
   *  roots before a full hive reset removes the isolated CODEX_HOME links. */
  removeExposedCodexData(): void {
    const root = this.root();
    if (!root) return;
    const agents = join(root, 'agents');
    if (!existsSync(agents)) return;
    const userHome = join(homedir(), '.codex');

    for (const entry of readdirSync(agents, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      for (const kind of ['sessions', 'archived_sessions'] as const) {
        const source = join(agents, entry.name, '.codex', kind);
        try {
          if (!lstatSync(source).isSymbolicLink()) continue;
          const target = realpathSync(source);
          const scanRoot = realpathSync(join(userHome, kind, 'munder-difflin'));
          const rel = relative(scanRoot, target);
          const scope = dirname(rel);
          if (!rel || rel.startsWith('..') || isAbsolute(rel)
            || dirname(scope) !== '.' || basename(rel) !== entry.name) continue;
          rmSync(target, { recursive: true, force: true });
        } catch (e) {
          if ((e as NodeJS.ErrnoException).code !== 'ENOENT') {
            console.error('[hive] removeExposedCodexData failed:', e);
          }
        }
      }
    }
  }

  /** Pi (earendil-works) bridge. Pi has a rich `pi.on(event, …)` lifecycle but no
   *  Claude-shaped hook file; instead we drop a bundled EXTENSION into a PER-AGENT
   *  PI_CODING_AGENT_DIR (so the user's global ~/.pi is never mutated) that, when Pi
   *  loads it, posts cth-hook-shaped payloads to HIVE_SOCK on tool_call/agent_end and
   *  auto-approves tool calls when the floor is in auto mode (HIVE_AUTO_APPROVE).
   *  Emitting an `agent_end`→`Stop` keeps the harness status in step (→ idle), which
   *  lets the renderer idle inbox-wake nudge deliver mail. Returns the per-agent dir
   *  for PI_CODING_AGENT_DIR.
   *
   *  LIVE-UNVERIFIED: Pi's exact extension-discovery path + event API need BYOK keys
   *  to confirm; this is written best-effort and wrapped so a wrong guess can never
   *  break the spawn. The renderer nudge is the guaranteed drain regardless. */
  private installPiHooks(dir: string): string {
    const home = join(dir, '.pi-agent');
    try {
      // Pi discovers extensions under its agent dir; we write to the documented
      // `extensions/` location (and keep it isolated per agent).
      const extDir = join(home, 'extensions');
      mkdirSync(extDir, { recursive: true });
      writeFileSync(join(extDir, 'hive-bridge.js'), PI_EXTENSION, 'utf8');
      // A manifest so Pi auto-loads the extension on start (best-effort; harmless if
      // Pi ignores it). Kept minimal and hive-authored.
      const manifest = { name: 'munder-hive-bridge', version: '0.3.1', main: 'extensions/hive-bridge.js', auto: true };
      writeFileSync(join(home, 'extensions.json'), JSON.stringify(manifest, null, 2), 'utf8');

      const userPiDir = join(homedir(), '.pi', 'agent');
      for (const fileName of ['models.json', 'models-store.json'] as const) {
        try {
          const data = readFileSync(join(userPiDir, fileName), 'utf8');
          writeFileSync(join(home, fileName), data, 'utf8');
        } catch (e) {
          if ((e as NodeJS.ErrnoException).code !== 'ENOENT') console.error(`[hive] installPiHooks copy ${fileName} failed:`, e);
        }
      }
    } catch (e) { console.error('[hive] installPiHooks failed:', e); }
    return home;
  }

  /** OpenCode (anomalyco/opencode) bridge — god Decision 1 (native plugin, not proxy).
   *  OpenCode has no Claude-shaped Stop hook, but its plugin API exposes a real
   *  `session.idle` lifecycle event. We drop a bundled PLUGIN into a PER-AGENT config
   *  dir's `plugin/` folder (OpenCode auto-loads `*.js` plugins from there) that posts
   *  HIVE_SOCK payloads on tool.execute.before/after + session.idle — the same
   *  Stop→drain semantics as codex's hooks, provider-agnostic, no traffic interception.
   *  Returns the config dir for OPENCODE_CONFIG_DIR (isolates from ~/.config/opencode).
   *
   *  LIVE-UNVERIFIED: plugin auto-load + session.idle firing + the inject path need
   *  BYOK keys to confirm; written best-effort, wrapped so it can't break the spawn.
   *  The renderer idle inbox-wake nudge is the guaranteed drain fallback. */
  private installOpenCodePlugin(dir: string, theme?: 'light' | 'dark'): string {
    const home = join(dir, '.opencode');
    try {
      // Theme: OpenCode's `system` theme keeps the terminal's own fg/bg (xterm's,
      // which already follows the app theme) and builds its greys from the
      // detected background, so it reads right on light AND dark. Written to
      // tui.json (current builds) and opencode.json (older builds read `theme`
      // there and migrate it; the migration skips when tui.json already exists).
      // Per-agent dir only, the user's ~/.config/opencode is never touched.
      if (theme) {
        mkdirSync(home, { recursive: true });
        const choice = { theme: 'system' };
        writeFileSync(join(home, 'tui.json'), JSON.stringify({ $schema: 'https://opencode.ai/tui.json', ...choice }, null, 2), 'utf8');
        writeFileSync(join(home, 'opencode.json'), JSON.stringify({ $schema: 'https://opencode.ai/config.json', ...choice }, null, 2), 'utf8');
      }
      // BOTH `plugin/` and `plugins/`. OpenCode's current docs specify `plugins/`
      // (plural); older builds — and the shape this bridge was originally written
      // against — auto-load from `plugin/` (singular). Since the whole bridge is
      // LIVE-UNVERIFIED (no BYOK keys to prove which the installed version reads),
      // guessing one of them is a coin flip whose losing side is silent: the plugin
      // simply never loads and the agent's only inbox drain becomes the renderer
      // nudge. Writing the same ~2KB file twice costs nothing, is idempotent, and
      // is correct whichever directory the installed OpenCode actually scans.
      for (const name of ['plugin', 'plugins']) {
        const pluginDir = join(home, name);
        mkdirSync(pluginDir, { recursive: true });
        writeFileSync(join(pluginDir, 'hive-bridge.js'), OPENCODE_PLUGIN, 'utf8');
      }
    } catch (e) { console.error('[hive] installOpenCodePlugin failed:', e); }
    return home;
  }

  /** Crush (charmbracelet/crush) proxy routing. Crush has NO base-URL env override, so
   *  the generic proxy env-rewrite is a no-op for it; instead we write a per-agent
   *  CRUSH_GLOBAL_CONFIG whose standard providers' `base_url` all point at the loopback
   *  proxy (so whatever model the worker picks, its LLM traffic routes through the
   *  sidecar → synthesized Status/Stop/cost → status goes idle → the terminal
   *  work-order + renderer nudge deliver mail). A per-agent CRUSH_GLOBAL_DATA isolates
   *  session state from the user's global ~/.config/crush. Keys ride BYOK env vars
   *  (Crush reads ANTHROPIC_API_KEY/OPENAI_API_KEY/… directly), so none are written
   *  here. `api` follows the proxy's wire shape (advisory). Returns the config + data
   *  paths for the spawn env.
   *
   *  LIVE-UNVERIFIED: the single-upstream proxy serves one provider/endpoint shape at a
   *  time — for full synthesized events pick a model whose provider matches the
   *  configured upstream (or a local OpenAI-compatible endpoint). Cross-provider mixing
   *  is humanQA; the renderer nudge still delivers mail regardless. */
  private installCrushConfig(dir: string, loopbackUrl: string, api: 'openai' | 'anthropic', theme?: 'light' | 'dark'): { config: string; data: string } {
    const config = join(dir, 'crush.json');
    const data = join(dir, '.crush-data');
    try {
      mkdirSync(data, { recursive: true });
      // Override base_url → loopback for ONLY the provider whose wire-shape matches
      // the proxy (`api`): the single-upstream sidecar forwards bytes unchanged, so
      // routing a different-wire/host provider (e.g. anthropic when api='openai', or
      // openrouter/groq which are openai-wire but different hosts) through it would
      // hit the wrong endpoint and the call would fail. Those are left to their real
      // upstreams (working calls, un-proxied — no synthesized events, but mail still
      // drains via the renderer nudge + the pty-quiescence idle fallback). For the
      // default god (openai-wire) and a local OpenAI-compatible endpoint this routes
      // through the proxy cleanly. Cross-provider Crush-via-proxy is on-device
      // live-verify (Dwight verify-crush MF1; the default god model is openai-wire to
      // match). Literal loopback (Dwight's b1 — no ${VAR} expansion edge cases);
      // Crush merges config so only base_url is rewritten.
      const wireProvider = api === 'anthropic' ? 'anthropic' : 'openai';
      const providers: Record<string, { base_url: string }> = { [wireProvider]: { base_url: loopbackUrl } };
      // Theme: Crush ships one (dark) palette and no light theme, but
      // `options.tui.transparent` stops it painting its own background, so it
      // sits on xterm's, which follows the app theme. Set whenever the app
      // passes a theme, dark included, so both modes look the same way.
      const options = theme ? { tui: { transparent: true } } : undefined;
      writeFileSync(config, JSON.stringify(options ? { providers, options } : { providers }, null, 2), 'utf8');
    } catch (e) { console.error('[hive] installCrushConfig failed:', e); }
    return { config, data };
  }

  /** Grok lifecycle-hook bridge → live hive status, session capture, guarded
   *  inbox delivery, and operator gates for `grok` workers.
   *
   *  Grok supports the same hook events and decision vocabulary as Claude Code,
   *  but its stdin payload uses camelCase keys. A small adapter normalizes those
   *  keys to HookServer's Claude-shaped contract. The hook is installed in the
   *  user's global Grok hook directory because global hooks are trusted and
   *  Grok sessions/resume stay in the user's normal GROK_HOME. The adapter is
   *  strictly scoped by AGENT_ID, so ordinary Grok sessions exit without doing
   *  anything. Best-effort and idempotent. */
  private installGrokHooks(): void {
    const root = this.root();
    if (!root) return;
    try {
      // Per floor copy kept for one release (a 0.5.2 floor names it), the hook
      // file names the shared per user copy. See installSharedShim.
      const legacy = join(root, 'bin', 'grok-hook.cjs');
      mkdirSync(join(root, 'bin'), { recursive: true });
      writeFileSync(legacy, GROK_HOOK_SHIM, 'utf8');
      const shared = this.installSharedShim('grok-hook.cjs');
      const shim = shared?.shim ?? legacy;
      const command = shared ? [`"${shared.launcher}"`, `"${shim}"`].join(' ') : this.nodeRun(shim);
      const tool = (matcher?: string) => ({
        ...(matcher ? { matcher } : {}),
        // Let Grok apply its event-aware defaults (5s normally, 600s for Stop).
        // Grok is a HOOK bridge (not a proxy sidecar), so it is hit by the same
        // `node: command not found` 127 — bundled node here too.
        hooks: [{ type: 'command', command }]
      });
      const hooks = {
        PreToolUse: [tool('.*')],
        PostToolUse: [tool('.*')],
        Stop: [tool()],
        SubagentStop: [tool('.*')],
        SessionStart: [tool('.*')],
        UserPromptSubmit: [tool()],
        PreCompact: [tool('.*')],
        PostCompact: [tool('.*')]
      };
      const hookDir = join(homedir(), '.grok', 'hooks');
      mkdirSync(hookDir, { recursive: true });
      writeFileSync(
        join(hookDir, 'munder-hive.json'),
        JSON.stringify({ hooks }, null, 2),
        'utf8'
      );
    } catch (e) { console.error('[hive] installGrokHooks failed:', e); }
  }

  /** Write the live fleet snapshot Michael reads (`fleet.json`, gitignored).
   *  Best-effort — called from a timer, must never throw. */
  writeFleetSnapshot(snapshot: unknown): void {
    const root = this.root();
    if (!root) return;
    try { writeFileSync(join(root, 'fleet.json'), JSON.stringify(snapshot, null, 2), 'utf8'); } catch { /* noop */ }
  }

  /** Is this agent the hive's god/orchestrator? */
  isGod(agentId: string): boolean {
    try {
      const reg = this.registry();
      return reg.godId === agentId || !!reg.agents[agentId]?.isGod;
    } catch { return false; }
  }

  /**
   * A compact, one-shot LIVE ROSTER line built from `fleet.json` — injected into
   * god's context as `additionalContext` on SessionStart and every
   * UserPromptSubmit (see HookServer).
   *
   * Why: fleet.json/registry.json are always fresh on disk (8s snapshot +
   * archiveOrphanedAgents on boot + PTY-exit archiving), but god's CONTEXT is not.
   * After an app restart god resumes a session whose transcript still describes
   * the OLD floor, and it will happily message agents that no longer exist. It is
   * told to read fleet.json, but "told to" is not "always knows" — so we push the
   * truth in on every turn instead. One line, so the cost is negligible.
   *
   * `ctxOf` (optional, supplied by HookServer) lets the caller layer the LIVE
   * context-window occupancy on top of the disk snapshot — each agent gets a
   * `ctx NN%` so god can see at a glance whose context is nearly full when it
   * routes work. fleet.json only carries cumulative `tokens`, which is a spend
   * figure, not how full the CURRENT window is; the real occupancy lives in
   * HookServer.contextById (from the statusLine shim). Omitted when the callback
   * is absent or an agent has no Status tick yet.
   *
   * Returns null when there is nothing to say (no hive, no snapshot, no agents),
   * so the hook stays a no-op rather than injecting noise.
   */
  rosterContext(
    ctxOf?: (agentId: string) => { tokens: number; limit: number } | undefined
  ): string | null {
    const root = this.root();
    if (!root) return null;
    try {
      const raw = readFileSync(join(root, 'fleet.json'), 'utf8');
      const snap = JSON.parse(raw) as {
        ts?: number;
        agents?: Array<{
          id: string; name?: string; role?: string; isGod?: boolean;
          breaker?: string; tokens?: number; usd?: number;
          lastTool?: string | null; lastActiveSecAgo?: number | null; inboxBacklog?: number;
          onHold?: boolean;
        }>;
      };
      const agents = Array.isArray(snap.agents) ? snap.agents : [];
      if (!agents.length) return null;

      const ago = (s: number | null | undefined): string =>
        typeof s !== 'number' ? 'unknown'
          : s < 90 ? `${s}s ago`
            : s < 5400 ? `${Math.round(s / 60)}m ago`
              : `${Math.round(s / 3600)}h ago`;

      // Cap the list so a big floor can't crowd out the actual prompt. The
      // remainder is still counted, and fleet.json is one Read away.
      const MAX = 24;
      const shown = agents.slice(0, MAX);
      let anyCtx = false;
      let anyHold = false;
      const rows = shown.map((a) => {
        const bits = [a.role ?? 'agent',
          typeof a.lastActiveSecAgo === 'number' ? `active ${ago(a.lastActiveSecAgo)}` : 'no activity yet'];
        if (a.tokens) bits.push(`${Math.round(a.tokens / 1000)}k tok`);
        if (a.usd) bits.push(`$${a.usd.toFixed(2)}`);
        if (a.inboxBacklog) bits.push(`inbox ${a.inboxBacklog}`);
        if (a.breaker && a.breaker !== 'ok' && a.breaker !== 'none') bits.push(`breaker ${a.breaker}`);
        if (a.isGod) bits.push('you');
        // First in the row after the role would be louder, but this reads in
        // the same scan as `breaker` and `inbox`, and god already treats those
        // as routing signals.
        if (a.onHold) { bits.push('ON HOLD — 1:1 with the human'); anyHold = true; }
        // Live context-window occupancy from the statusLine shim — lets god see
        // which agents are near-full when routing, instead of guessing from the
        // cumulative token count. Clamp to 0-100; a fresh meter can briefly
        // report more than 100% before a window rotation.
        const cw = ctxOf?.(a.id);
        if (cw && cw.limit > 0) {
          const pct = Math.max(0, Math.min(100, Math.round((cw.tokens / cw.limit) * 100)));
          bits.push(`ctx ${pct}%`);
          anyCtx = true;
        }
        return `${a.id}${a.name ? ` "${a.name}"` : ''} (${bits.join(', ')})`;
      });
      const more = agents.length > shown.length ? ` +${agents.length - shown.length} more` : '';
      const age = typeof snap.ts === 'number' ? ago(Math.round((Date.now() - snap.ts) / 1000)) : 'unknown';

      return `[LIVE ROSTER — auto-injected from ${join(root, 'fleet.json')}, snapshot ${age}] `
        + `${agents.length} ACTIVE agent(s): ${rows.join('; ')}.${more} `
        + 'This is the CURRENT floor and it SUPERSEDES any roster earlier in this conversation — '
        + 'agents you remember that are absent here have been archived or killed, so do not message them. '
        + (anyCtx
          ? '`ctx NN%` = live window occupancy; absent = not yet reported (unknown, not empty). '
          : '')
        + (anyHold
          ? 'An agent marked `ON HOLD — 1:1 with the human` is UNAVAILABLE: the human is working '
            + 'with them directly. Do NOT message them, do NOT dispatch to them, and do NOT count '
            + 'them when picking an owner. Route to someone else, or say the work is waiting. They '
            + 'are still running and their terminal is alive, so this is not a reason to archive '
            + 'them or spawn a replacement. The human flips it off when they are done. '
          : '')
        + 'Route work to someone on this list before spawning anyone new.'
        // Teammates on OTHER machines (Teams, plan 4.6), addressed member:<id>.
        // One line, only when this machine is in a team and the roster is known.
        + (this.remote.rosterLine?.() ? ` ${this.remote.rosterLine?.()}` : '');
    } catch { return null; }
  }
  logTail(n = 200): unknown[] {
    const root = this.root();
    if (!root || !existsSync(join(root, 'log.jsonl'))) return [];
    const lines = readFileSync(join(root, 'log.jsonl'), 'utf8').trim().split('\n').filter(Boolean);
    return lines.slice(-n).map((l) => { try { return JSON.parse(l); } catch { return { raw: l }; } });
  }

  /**
   * UNREAD MAIL TO THE PERSON, PER AGENT (0.5.3, F25, the Pro rail's badge;
   * Pam's audit item 2). A message an agent addressed to "human" is routed to
   * the orchestrator as the person's proxy, and the sender's own copy is
   * archived under its outbox/.sent: that archive is the one durable record
   * per sender, so it is what is counted here. `since` is the renderer's
   * per agent last-opened stamp (ISO); a sender with no stamp counts every
   * message it ever sent the person. Only the count, the stamps and the
   * first three texts (newest first, subject and a short head of the body)
   * travel, never whole threads: AgentInbox's 200 message load per agent is
   * exactly what this door exists to avoid.
   */
  humanMailSince(since: Record<string, string> = {}): Record<string, HumanMailSummary> {
    const root = this.root();
    if (!root) return {};
    const agentsDir = join(root, 'agents');
    if (!existsSync(agentsDir)) return {};
    let owners: string[];
    try { owners = readdirSync(agentsDir).filter((id) => !id.startsWith('.')); } catch { return {}; }
    const out: Record<string, HumanMailSummary> = {};
    for (const owner of owners) {
      const base = join(agentsDir, owner, 'outbox');
      const stampRaw = since[owner];
      const stamp = typeof stampRaw === 'string' ? Date.parse(stampRaw) : NaN;
      const floor = Number.isFinite(stamp) ? stamp : -Infinity;
      const hits: { at: number; msg: HiveMessage }[] = [];
      for (const dir of [base, join(base, '.sent')]) {
        for (const m of this.listMessages(dir)) {
          if (m.from !== owner) continue;
          if (m.to !== 'human' && m.needs_human !== true) continue;
          const at = Date.parse(m.created_at);
          if (!Number.isFinite(at) || at <= floor) continue;
          hits.push({ at, msg: m });
        }
      }
      if (hits.length === 0) continue;
      hits.sort((a, b) => b.at - a.at);
      out[owner] = {
        count: hits.length,
        latest: new Date(hits[0].at).toISOString(),
        texts: hits.slice(0, 3).map(({ at, msg }) => ({
          id: msg.id,
          at: new Date(at).toISOString(),
          subject: redactSecrets(msg.subject).slice(0, 200),
          body: redactSecrets(msg.body).replace(/\s+/g, ' ').trim().slice(0, 240)
        }))
      };
    }
    return out;
  }

  private listMessages(dir: string): HiveMessage[] {
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .sort()
      .map((f) => { try { return JSON.parse(readFileSync(join(dir, f), 'utf8')) as HiveMessage; } catch { return null; } })
      .filter((m): m is HiveMessage => m !== null);
  }

  /**
   * Record an agent's process exit so a death has a durable cause.
   *
   * Before this, an agent killed by its provider crashing was archived with
   * `{kind:'archive', agentId, archived:true}` and NOTHING else — no exit code,
   * no signal, no output. A two-second SIGILL death and a completed agent were
   * indistinguishable in the only record the hive keeps, and the crash banner
   * lived solely in a UI terminal pane. Observed live 2026-08-24: Michael's
   * `claude` CLI panicked 923ms into startup and left no trace on disk.
   *
   * Split by design:
   *   - log.jsonl  gets structured, non-sensitive fields (code, signal, path).
   *   - crashes/   gets the raw tail, and is gitignored — see ensureHive.
   * A normal exit writes nothing at all; this is a diagnostic, not an audit log.
   */
  recordAgentExit(
    agentId: string,
    info: { exitCode?: number; signal?: number; tail?: string; command?: string }
  ): void {
    const root = this.root();
    if (!root) return;
    const { exitCode, signal, tail, command } = info;
    // A signal means killed (SIGILL/SIGSEGV/SIGKILL); node-pty reports exitCode 0
    // in that case, so signal must be checked independently of the code.
    const abnormal = (typeof signal === 'number' && signal !== 0) || (typeof exitCode === 'number' && exitCode !== 0);
    if (!abnormal) return;

    let tailPath: string | null = null;
    if (tail && tail.length) {
      try {
        const dir = join(root, 'crashes');
        mkdirSync(dir, { recursive: true });
        // Colons are illegal in filenames on Windows and awkward everywhere.
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        const safeId = agentId.replace(/[^A-Za-z0-9._-]/g, '_');
        const p = join(dir, `${stamp}-${safeId}.log`);
        const header = [
          `agent:    ${agentId}`,
          `exitCode: ${String(exitCode)}`,
          `signal:   ${String(signal)}`,
          command ? `command:  ${command}` : null,
          `captured: ${new Date().toISOString()}`,
          `--- last ${tail.length} bytes of pty output ---`,
          ''
        ].filter(Boolean).join('\n');
        writeFileSync(p, header + tail, 'utf8');
        tailPath = p;
      } catch { /* a diagnostic must never break teardown */ }
    }

    this.appendLog({
      kind: 'agent-exit',
      agentId,
      exitCode: exitCode ?? null,
      signal: signal ?? null,
      abnormal: true,
      tailPath
    });
  }

  // — log —
  appendLog(event: Record<string, unknown>): void {
    const root = this.root();
    if (!root) return;
    const line = JSON.stringify({ ts: Date.now(), ...event }) + '\n';
    try { appendFileSync(join(root, 'log.jsonl'), line, 'utf8'); } catch { /* noop */ }
  }

  /**
   * Append one cost sample to the durable, append-only ledger at
   * `<root>/cost-ledger.jsonl` (Lane A #6.6d). This is the SOLE durable cost
   * store; its row is exactly the shape Kevin (#4) reserves for the cost_ledger
   * SQLite table, so migration is a mechanical INSERT…SELECT.
   *
   * 🔒 PII: persist ONLY the allowlisted AgentUsageSample — NEVER a raw OTel
   * record (those carry user.email / account / org / hashed-user-id). The sample
   * is PII-free by construction upstream (the provider's normalize step), so we
   * add no redaction here; we just must not widen what we write. The file lives
   * at the hive ROOT, so `mempalace mine` (which only scans per-agent dirs) never
   * ingests it — no palace noise, no MINE_IGNORE entry needed.
   *
   * Like appendLog: append to disk now (durable immediately), let it ride the
   * next natural commit. Best-effort — never throws into the beat.
   */
  appendCostLedger(sample: AgentUsageSample): void {
    const root = this.root();
    if (!root) return;
    // Fully snake_case so the row maps 1:1 onto Kevin's (#4) cost_ledger SQLite
    // columns (agent_id, session_id, ts, input, output, cache_read,
    // cache_creation, model, usd) — migration is a straight INSERT…SELECT.
    const row = {
      agent_id: sample.agentId,
      session_id: sample.sessionId,
      ts: sample.ts,
      input: sample.input,
      output: sample.output,
      cache_read: sample.cacheRead,
      cache_creation: sample.cacheCreation,
      model: sample.model,
      usd: sample.usd
    };
    try { appendFileSync(join(root, 'cost-ledger.jsonl'), JSON.stringify(row) + '\n', 'utf8'); } catch { /* noop */ }
  }

  // — json + atomic io —
  private readJson<T>(p: string, fallback: T): T {
    try { return JSON.parse(readFileSync(p, 'utf8')) as T; } catch { return fallback; }
  }
  // Every JSON write is temp file then rename (public #529, UsryAce): a crash
  // mid write left registry.json or tasks.json torn, and readJson reads a torn
  // file as empty, so the roster or the board vanished without an error.
  private writeJson(p: string, data: unknown): void {
    this.atomicWriteJson(p, data);
  }
  private atomicWriteJson(p: string, data: unknown): void {
    const tmp = `${p}.tmp-${shortRand()}`;
    try {
      writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
      renameSync(tmp, p);
    } catch (e) {
      try { rmSync(tmp, { force: true }); } catch { /* the temp file is disposable */ }
      throw e;
    }
  }

  // — git (single committer, retry + stale-lock recovery) —
  //
  // `gc.autoDetach=false` is what makes this call actually synchronous.
  //
  // A commit runs `gc --auto`, and git detaches that into a BACKGROUND process
  // by default. `spawnSync` returns when `git commit` exits, so the caller
  // believes the hive is quiescent while a gc it cannot see is still writing
  // into `.git/objects/`. Anything that touches the hive directory right after
  // a commit races that process: removing a hive home throws ENOTEMPTY, and a
  // read can catch a half-written pack.
  //
  // It reproduces on its own — create a HiveManager on a fresh temp home, call
  // ensureAgent, then remove the home: ~3.5% of iterations throw ENOTEMPTY,
  // and the leftover is always `.git/objects/`, sometimes still holding a
  // `bitmap-ref-tips_*` temp file that vanishes a fraction of a second later.
  // With this flag, gc runs inline and 200 iterations pass clean.
  //
  // The gc still happens — this only stops it from outliving the command that
  // triggered it, which is what "single committer" was supposed to mean.
  //
  // `opts.timeoutMs` exists for the one time index rewrite: dropping tens of
  // thousands of paths does not finish in eight seconds, and a timeout there
  // would leave the repo half fixed and report success. `opts.input` is how
  // those paths are handed over, since an argv cannot hold them.
  private git(
    args: string[],
    cwd: string,
    opts?: { timeoutMs?: number; input?: string }
  ): { ok: boolean; out: string; err: string } {
    const res = spawnSync('git', ['-c', 'commit.gpgsign=false', '-c', 'gc.autoDetach=false', '-c', 'user.name=Hive', '-c', 'user.email=hive@local', ...args], {
      cwd, encoding: 'utf8', timeout: opts?.timeoutMs ?? 8000, input: opts?.input,
      maxBuffer: 64 * 1024 * 1024
    });
    return { ok: res.status === 0, out: res.stdout ?? '', err: res.stderr ?? '' };
  }

  /** The hive root's git, as the runner shared/hiveRepo.ts takes. */
  private gitRunner(root: string): GitRun {
    return (args, opts) => this.git(args, root, opts);
  }

  /** Real filesystem for the hygiene pass. Every call swallows its error: a
   *  hygiene pass must never be the reason a hive commit fails. */
  private static readonly repoFs: RepoFs = {
    read(p: string): string | null {
      try { return existsSync(p) ? readFileSync(p, 'utf8') : ''; } catch { return null; }
    },
    write(p: string, body: string): void {
      try { writeFileSync(p, body, 'utf8'); } catch { /* best-effort */ }
    },
    sizeOf(p: string): number | null {
      try { const st = statSync(p); return st.isFile() ? st.size : null; } catch { return null; }
    }
  };

  /** Has the one-time index repair run in this process yet? */
  private repoHygieneDone = false;

  /**
   * Stop the hive repo versioning what it should never have taken.
   *
   * Runs once per process, from the first commit. Two halves:
   *
   *   1. Refresh every agent's .gitignore. An agent that is not running never
   *      passes through spawn, and the mine loop only reaches it when mempalace
   *      is installed, so without this pass a dormant agent's Codex home keeps
   *      its ignore file from whenever it was last awake.
   *   2. Drop from the index every tracked file the ignore rules now cover.
   *      git goes on recording a file it already tracks however many .gitignore
   *      lines name it, so the ignore line alone reads as a fix while the repo
   *      keeps growing. That is not hypothetical: on the hive this was written
   *      from, `log.jsonl` had been ignored since 0.4.10 and was still tracked,
   *      190MB of packed history and counting, and the Codex homes an earlier
   *      pass claimed to have untracked were all still in the index.
   *
   * The question asked in step 2 is "what does git track that git ignores",
   * not a list of paths, so it cannot drift out of step with the rules and
   * there is no pathspec to get wrong. Nothing leaves the disk: `rm --cached`
   * only touches the index, so `codex --resume`, the cost history and the logs
   * are all unaffected.
   */
  private repoHygiene(root: string): void {
    if (this.repoHygieneDone) return;
    this.repoHygieneDone = true;
    const run = this.gitRunner(root);
    boundGcMemory(run);
    const agentsDir = join(root, 'agents');
    if (existsSync(agentsDir)) {
      try {
        for (const id of readdirSync(agentsDir)) ensureMineIgnore(join(agentsDir, id));
      } catch { /* best-effort */ }
    }
    const { paths, ok } = untrackIgnored(run);
    if (!ok) {
      console.warn('[hive] could not untrack ignored files from the index');
    } else if (paths.length > 0) {
      console.warn(`[hive] untracked ${paths.length} ignored file(s) from the hive repo; they stay on disk`);
      this.appendLog({ kind: 'hive-repo-untracked', count: paths.length, sample: paths.slice(0, 10) });
    }
    // Keeping files OUT cannot shrink what is already in. Say so, once, with
    // the command that can, rather than leaving a person to find a 200GB .git
    // on their own.
    const bytes = packedBytes(run);
    if (bytes !== null && bytes > REPO_SIZE_WARN_BYTES) {
      const gb = (bytes / (1024 * 1024 * 1024)).toFixed(1);
      const tool = join(root, 'bin', 'hive-compact.cjs');
      console.warn(`[hive] the hive repo is ${gb}GB of history. With the app closed: node "${tool}"`);
      this.appendLog({ kind: 'hive-repo-large', bytes, compact: tool });
    }
  }

  /** Commit all hive changes. No-op if there is nothing staged. */
  commit(message: string): void {
    const root = this.root();
    if (!root || !existsSync(join(root, '.git'))) return;
    this.repoHygiene(root);
    // Before `add -A` can take it. A name list always lags the next tool that
    // writes something enormous into the hive, so anything UNTRACKED over the
    // cap gets its own anchored ignore line instead of a place in history.
    // Untracked only: a file already in the repo keeps its history, so a long
    // memory.md is never dropped by the size rule.
    const oversized = ignoreOversized(this.gitRunner(root), HiveManager.repoFs, root, join);
    if (oversized.length) {
      console.warn(`[hive] too big for the hive repo, ignored (left on disk): ${oversized.join(', ')}`);
    }
    for (let attempt = 0; attempt < 5; attempt++) {
      this.clearStaleLock(root);
      const add = this.git(['add', '-A'], root);
      const commit = this.git(['commit', '-q', '-m', message], root);
      if (commit.ok) return;
      if (/nothing to commit/i.test(commit.out + commit.err)) return;
      if (!add.ok || /index\.lock/i.test(commit.err)) { sleepSync(50 * (attempt + 1)); continue; }
      console.warn(`[hive] commit gave up after ${attempt + 1} attempts:`, commit.err || commit.out);
      return;
    }
    console.warn('[hive] commit gave up after 5 attempts');
  }

  private clearStaleLock(root: string): void {
    const STALE_THRESHOLD_MS = 10_000;
    try {
      for (const lock of ['index.lock', 'HEAD.lock']) {
        const path = join(root, '.git', lock);
        if (existsSync(path) && Date.now() - statSync(path).mtimeMs > STALE_THRESHOLD_MS) rmSync(path);
      }
    } catch { /* noop */ }
  }
}

// ─── PROTOCOL.md (written into the hive, readable by every agent) ────────────

/** The Claude Code command reference written to <hive>/COMMANDS.md, rendered from
 *  the SAME source as the UI "commands" tab so they never drift. Leads with the
 *  orchestrator note: slash = own session only, cli = shell/fleet; monitor
 *  siblings via fleet.json (claude agents does NOT see them). */
function renderCommandsMd(): string {
  const lines: string[] = [
    '# Claude Code commands',
    '',
    'Reference of the Claude Code commands available to you. Two kinds:',
    '- **slash** commands act ONLY on your own session — you CANNOT run them on another agent\'s terminal.',
    '- **cli** commands run in your shell (Bash) and can target the fleet, spawn, or query.',
    '',
    'To MONITOR the other agents in this hive, read `fleet.json` in the hive root (live per-agent tokens, cost, status, last tool, breaker level, inbox backlog) plus `registry.json` — `claude agents` does NOT list your hive siblings. Use `claude -p "..." --output-format json` for a one-off headless query.',
    ''
  ];
  for (const g of COMMAND_GROUPS) {
    lines.push(`## ${g.title}`, '');
    for (const it of g.items) {
      lines.push(`- \`${it.cmd.trim()}\` _(${it.kind})_ — ${it.desc}${it.usage ? ` e.g. \`${it.usage}\`` : ''}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}
const COMMANDS_MD = renderCommandsMd();

const PROTOCOL_MD = `# Hive protocol

You are one of several Claude agents sharing this hive. Coordination is entirely
file-based; the harness (main process) is the only thing that runs git and the
only thing that moves messages between agents.

**Words.** An *agent* is a member of this office with a lasting session. A *temp* is a short lived agent
the orchestrator starts for one job; it does the job, reports done, and is torn down. The orchestrator's
address is \`god\`.

## Your workspace — \`agents/<your-id>/\`
- \`identity.md\`  — who you are (read-only; the harness writes it).
- \`memory.md\`    — your long-term memory. Read at the start of a task; append to it as you learn.
- \`inbox/\`       — messages addressed to you. Read them at the start of a task.
- \`inbox/.done/\` — move a message here once you've handled it.
- \`outbox/\`      — drop messages here to send them. The harness delivers them.

**Never write into another agent's folder.** Write to your own \`outbox/\`; the
orchestrator routes it. This keeps every file single-writer.

## Sending a message
Write one JSON file into \`outbox/\` (any filename ending in \`.json\`):

\`\`\`json
{
  "to": "<agent-id> | god | broadcast | member:<memberId> (a teammate on another machine; Teams only, ids come from the roster line)",
  "act": "request | inform | propose | query | agree | refuse | done",
  "subject": "one-line summary",
  "body": "the details",
  "conversation": "carry this across a thread (optional)",
  "in_reply_to": "<message id you're replying to> (optional)"
}
\`\`\`

The harness fills in \`id\`, \`from\`, \`hops\`, and timestamps.

## Rules of the road
- Only \`request\`, \`query\`, and \`propose\` expect a reply. \`inform\` and \`done\` are terminal —
  don't reply to them, or two agents will loop forever.
- For anything ambiguous, cross-cutting, or needing sign-off, message \`god\` — the
  god agent clarifies answers for you so you rarely need the human directly.
- There is NO separate human-approval queue. Human-in-the-loop is native to Claude
  Code: a tool you run that needs permission prompts in your own session (the human
  can approve it remotely from their phone via \`/remote-control\`). If you genuinely
  need a human decision, raise it with \`god\` (a message \`"to": "human"\` is routed to
  the god/orchestrator, the human's proxy on the floor).
- \`board.md\` is the shared plan. Don't edit it directly — \`propose\` changes to \`god\`,
  who is its sole scribe.
- Re-reading a message you already moved to \`.done/\` is a no-op. Don't reprocess.

## The work: board.md vs tasks.json
There are two shared surfaces, both in the hive root:
- \`board.md\` — the freeform narrative plan. The god agent is its sole scribe; others \`propose\` edits.
- \`tasks.json\` — the structured task ledger (a kanban: \`todo / doing / blocked / done\`, with title,
  assignee, priority, deps). Keep the task you're working reflected in its status.
  Leave \`id\` out; the harness assigns the ticket key (e.g. V53-299). Refer to cards by that key.

## Asking the human (the ASK ME card)
When a card can only move with the human — a question to answer, or an action only they can do
(create an account, approve a spend, hand over credentials, test on their device) — the god sets the
card \`"status": "blocked"\` and appends the ask to its \`humanQA\` array:

\`\`\`json
{ "q": "the ask, in markdown", "askedAt": "<iso timestamp>", "from": "<agent id>" }
\`\`\`

\`"from"\` is the agent whose question it is: the ask shows on that agent's own tab. Leave it out for a
floor wide question; that one shows on the orchestrator's tab.

The harness shows the open ask on the ASK ME board and in the ASK ME tab, and the human's reply lands
in the same entry as \`"a"\` plus an inbox message to god. Every past entry stays on the card — that
trail is the decision history.

**Write the ask short, and in markdown.** The card renders it, so plain-text asterisks and backticks
show up literally, and a card is not a terminal — an ask longer than a short paragraph plus its
options (roughly 700 characters) is a report, not a question. Cut the narrative and keep the decision:
- open with ONE **bold** sentence saying exactly what you need from them;
- \`backticks\` for paths, commands, values, and identifiers;
- \`-\` bullets or \`1.\` numbering for every option or step;
- a blank line between paragraphs; a single newline is rendered as a line break, so each option
  stays on its own line.

When the ask originates in another agent's report, REWRITE it into that shape. Never paste the report
body in as the question, and never make the human read the investigation to find the decision. Do NOT park human questions in separate files (no \`HumanQuestion.md\`),
and never sit idle waiting for a reply — move on to other work and pick the answer up when it arrives.

## Guardrails: circuit breaker & token budgets
A circuit breaker watches every agent for runaway behavior (looping on the same tool, error storms,
overspending). It escalates gently: \`steer\` → \`constrain\` → \`stop\`. If a \`Circuit breaker: steer\`
or \`Circuit breaker: constrain\` message lands in your inbox, you ARE the problem it caught — stop
repeating, summarize what you've tried, and do exactly what the message says (constrain = go read-only
and get god's sign-off before more tool calls). Be **token-frugal**: the floor has a token budget and
each agent can have its own token limit; crossing it trips the breaker. Prefer references over pasted
content, and \`/compact\` your own session when context gets heavy.

## Fleet monitoring (orchestrator)
You (god) are responsible for situational awareness. To see the live state of every agent, read
\`fleet.json\` in the hive root — it is refreshed continuously with each agent's tokens, cost, status,
breaker level, last tool, last-active time, and inbox backlog. Pair it with \`registry.json\` (the roster)
and \`log.jsonl\` (the event feed). IMPORTANT: \`claude agents\` will NOT show your hive's sibling
sessions (they're spawned independently) — \`fleet.json\` is your source of truth for them. For a deeper
look at one agent, read its \`agents/<id>/memory.md\` and \`inbox/\`, or send it a \`query\`. A full
Claude Code command reference (slash = your own session only; CLI = your shell, can target the fleet)
is in \`COMMANDS.md\` in the hive root.

## Starting a temp (orchestrator)
You can start a temp yourself. Write ONE JSON file into \`spawn-requests/<id>.json\` in the hive root:

\`\`\`json
{
  "objective": "the job (required)",
  "cwd": "/absolute/path/to/the/repo (required)",
  "name": "display name (optional)",
  "command": "engine CLI (optional; defaults to the configured one)",
  "provider": "claude | codex | cursor | antigravity | … (optional)",
  "model": "model override (optional)",
  "isolate": true,
  "tokenCap": 0,
  "slack": { "channel": "C…", "thread_ts": "…" },
  "character": "meredith",
  "accent": "coral"
}
\`\`\`

The harness polls that directory, starts the temp with id \`worker-<id>\`, briefs it with the objective,
the memory index and its capabilities, and moves the request to \`spawn-requests/.done/\` once it starts
or to \`spawn-requests/.failed/\` with a reason. \`isolate\` defaults to true, giving the temp its own git
worktree. \`slack\` sends its replies and failures to that thread. \`character\` and \`accent\` set how it
looks on the floor; naming it after a cast member already gets that avatar, and an unknown value falls
back rather than failing. This is the only way you can start anyone: a hire manifest under
\`research/hires/\` needs the human to confirm it in the UI.

**The switch.** The human allows temps under Settings, Autonomy & Budgets. It is ON by default (0.5.3); the
human can turn it off, and it caps how many run at once. While it is off your request
is neither failed nor deleted: it waits in \`spawn-requests/\` and runs when the switch is turned on. A
request that has not moved means the switch is off; raise it with the human instead of retrying. When
Slack triage is set to temps, the harness starts those temps itself, switch or not. Route work to an
agent already on the floor first either way.

## Capabilities
Your skills are copied into \`agents/<your-id>/.claude/skills/\` when you start. Read
\`capabilities/SKILL.md\` there once (or run \`/capabilities\`): it lists the date skills (\`/today\`,
\`/lastWeek\`, \`/last30Days\`, \`/lastQuarter\` and more), which resolve any time window so you never
compute dates by hand, and the integrations reached through the loopback broker. The broker is a temp's:
it is available only when \`MD_BROKER_URL\` is set in your environment. Without it, ask \`god\`.

## Semantic memory (optional — when \`mempalace\` is installed)
When \`MEMPALACE_PALACE_PATH\` is set in your environment, the hive shares a
searchable MemPalace and you have the \`mempalace\` CLI:
- \`mempalace search "<query>"\` — recall relevant past knowledge across the whole
  team by meaning (not just keywords). Add \`--wing <agent-id>\` to scope to one
  agent, \`--results N\` to widen.
- \`mempalace wake-up\` — a short digest of what matters, good at the start of a task.

Your \`memory.md\` is mined into the palace automatically, so the durable facts you
write there become searchable by every agent. You don't run \`mine\` yourself.
`;

// ─── cth-hook shim (written to <hive>/bin/cth-hook.cjs) ──────────────────────
// A minimal pipe: read the hook payload on stdin, tag it with this agent's id,
// forward it to the hive's UDS, and relay the response back to `claude`. All the
// real logic lives in the main process (HookServer). Never blocks a stop on error.
const HOOK_SHIM = `#!/usr/bin/env node
'use strict';
const net = require('net');
const isStatus = process.argv.includes('--status');
let data = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (d) => { data += d; });
process.stdin.on('end', () => {
  let payload = {};
  try { payload = JSON.parse(data || '{}'); } catch (_) {}
  if (!payload.agent_id) payload.agent_id = process.env.AGENT_ID || null;
  const sock = process.env.HIVE_SOCK;
  if (isStatus) {
    // Status-line mode: Claude Code pipes the session status JSON (incl.
    // context_window.total_input_tokens / .context_window_size) after every
    // response. Print the in-terminal gauge IMMEDIATELY (the TUI is waiting),
    // then forward the payload to the harness fire-and-forget so the agent
    // card's context gauge updates push-based, with the EXACT window size.
    payload.hook_event_name = 'Status';
    const cw = payload.context_window || {};
    const used = cw.total_input_tokens, size = cw.context_window_size;
    if (typeof used === 'number' && typeof size === 'number' && size > 0) {
      const pct = Math.round((used / size) * 100);
      process.stdout.write('ctx ' + Math.round(used / 1000) + 'k/' + Math.round(size / 1000) + 'k (' + pct + '%)');
    }
    if (sock) {
      try {
        const c = net.createConnection(sock, () => { c.end(JSON.stringify(payload) + '\\n'); });
        c.on('error', () => {});
        c.on('close', () => process.exit(0));
      } catch (_) { process.exit(0); }
    } else {
      process.exit(0);
    }
    setTimeout(() => process.exit(0), 1500).unref();
    return;
  }
  if (!sock) { process.exit(0); }
  let resp = '';
  const done = (code) => { if (resp) process.stdout.write(resp); process.exit(code); };
  const c = net.createConnection(sock, () => c.write(JSON.stringify(payload) + '\\n'));
  c.setEncoding('utf8');
  c.on('data', (d) => { resp += d; });
  c.on('end', () => done(0));
  c.on('error', () => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
});
`;

// ─── agy-hook shim (written to <hive>/bin/agy-hook.cjs) ──────────────────────
// Antigravity's `agy` CLI fires lifecycle hooks (PreToolUse/PostToolUse/Stop/
// PreInvocation/PostInvocation) but with a DIFFERENT stdin shape than Claude
// (conversationId / toolCall{name,args} / workspacePaths, and no hook_event_name
// — the event arrives as argv from the hooks.json command). This shim normalizes
// that into the same HookPayload the HookServer already consumes, so status,
// inbox-drain-on-Stop, and tool gating are reused UNCHANGED, then translates the
// server's Claude-shaped response back into agy's stdout contract (decision:
// allow|deny|block + a message). Scoped by AGENT_ID: a personal agy session
// (no AGENT_ID in env) is a no-op, so the global hooks.json never disturbs the
// user's own agy usage — only hive workers (spawned with AGENT_ID set) bridge.
// NOTE (agy bug, antigravity-cli#49): the loader reads ~/.gemini/antigravity-cli/
// hooks.json but the trigger reads ~/.gemini/config/hooks.json — we write BOTH.
const AGY_HOOK_SHIM = `#!/usr/bin/env node
'use strict';
const net = require('net');
const event = process.argv[2] || 'Unknown';
const agentId = process.env.AGENT_ID || null;
let data = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (d) => { data += d; });
process.stdin.on('end', () => {
  const sock = process.env.HIVE_SOCK;
  if (!agentId || !sock) { process.exit(0); } // not a hive worker → ignore
  let agy = {};
  try { agy = JSON.parse(data || '{}'); } catch (_) {}
  const tc = agy.toolCall || {};
  const payload = {
    hook_event_name: event,
    agent_id: agentId,
    session_id: agy.conversationId,
    transcript_path: agy.transcriptPath,
    cwd: Array.isArray(agy.workspacePaths) ? agy.workspacePaths[0] : undefined,
    tool_name: tc.name,
    tool_input: tc.args
  };
  let resp = '';
  const done = () => {
    // Translate the HookServer's Claude-shaped reply into agy's contract. CRITICAL:
    // agy treats ANY object written to stdout as a decision and FAIL-CLOSES (an
    // empty/decision-less object = DENY). So emit JSON ONLY when there's a real
    // directive (deny/block/steer); otherwise write NOTHING — no output = allow.
    let out = null;
    try {
      const r = JSON.parse(resp || '{}');
      if (r.decision === 'block') out = { decision: 'block', reason: r.reason, stopReason: r.reason, systemMessage: r.reason };
      else if (r.hookSpecificOutput && r.hookSpecificOutput.permissionDecision === 'deny') out = { decision: 'deny', reason: r.hookSpecificOutput.permissionDecisionReason };
      else if (r.continue === false) out = { decision: 'block', stopReason: r.stopReason };
      else if (r.hookSpecificOutput && r.hookSpecificOutput.additionalContext) out = { systemMessage: r.hookSpecificOutput.additionalContext };
    } catch (_) {}
    if (out) { try { process.stdout.write(JSON.stringify(out)); } catch (_) {} }
    process.exit(0);
  };
  try {
    const c = net.createConnection(sock, () => c.write(JSON.stringify(payload) + '\\n'));
    c.setEncoding('utf8');
    c.on('data', (d) => { resp += d; });
    c.on('end', done);
    c.on('error', () => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  } catch (_) { process.exit(0); }
});
`;

// ─── pi bridge extension (written to <agentDir>/.pi-agent/extensions/) ───────
// A bundled extension for Pi (earendil-works). Pi exposes a pi.on(event,…)
// lifecycle; this posts cth-hook-shaped payloads to HIVE_SOCK on tool_call /
// tool_result / agent_end and AUTO-APPROVES tool calls when the floor is in auto
// mode (HIVE_AUTO_APPROVE, gated by config.autoMode — Pam guardrail #5). The
// agent_end→Stop keeps the harness status in step (→ idle) so the renderer idle
// inbox-wake nudge can deliver mail. Fully wrapped so a wrong API guess can never
// break the spawn. LIVE-UNVERIFIED (Pi's exact extension surface needs BYOK keys).
const PI_EXTENSION = `'use strict';
var net = require('node:net');
var SOCK = process.env.HIVE_SOCK;
var AGENT = process.env.AGENT_ID || null;
var AUTO = process.env.HIVE_AUTO_APPROVE === '1';
function post(payload) {
  try {
    if (!SOCK) return;
    payload.agent_id = payload.agent_id || AGENT;
    var c = net.createConnection(SOCK, function () { try { c.end(JSON.stringify(payload) + '\\n'); } catch (e) {} });
    c.on('error', function () {});
  } catch (e) {}
}
function register(pi) {
  if (!pi || typeof pi.on !== 'function') return false;
  try {
    pi.on('tool_call', function (ev) {
      post({ hook_event_name: 'PreToolUse', tool_name: ev && (ev.name || (ev.tool && ev.tool.name)), tool_input: ev && (ev.args || ev.input) });
      if (AUTO) { try { if (ev && typeof ev.approve === 'function') ev.approve(); } catch (e) {} return { approve: true }; }
      return undefined;
    });
    pi.on('tool_result', function (ev) { post({ hook_event_name: 'PostToolUse', tool_name: ev && (ev.name || (ev.tool && ev.tool.name)) }); });
    pi.on('agent_end', function () { post({ hook_event_name: 'Stop' }); });
    return true;
  } catch (e) { return false; }
}
try { if (typeof globalThis !== 'undefined' && globalThis.pi) register(globalThis.pi); } catch (e) {}
module.exports = function (pi) { return register(pi); };
module.exports.activate = function (pi) { return register(pi); };
module.exports.default = module.exports;
`;

// ─── opencode bridge plugin (written to <agentDir>/.opencode/plugin/) ────────
// A bundled plugin for OpenCode (anomalyco/opencode) — god Decision 1. OpenCode
// has no Claude-shaped Stop hook but its plugin API exposes a real session.idle
// event; this posts cth-hook-shaped payloads to HIVE_SOCK on tool.execute.before/
// after + session.idle. The session.idle→Stop keeps status in step (→ idle) so the
// renderer idle inbox-wake nudge delivers mail. ESM (OpenCode runs on Bun). Fully
// wrapped. LIVE-UNVERIFIED (plugin auto-load + session.idle firing need BYOK keys).
const OPENCODE_PLUGIN = `import { createConnection } from 'node:net';
const SOCK = process.env.HIVE_SOCK;
const AGENT = process.env.AGENT_ID || null;
function post(payload) {
  try {
    if (!SOCK) return;
    payload.agent_id = payload.agent_id || AGENT;
    const c = createConnection(SOCK, () => { try { c.end(JSON.stringify(payload) + '\\n'); } catch (e) {} });
    c.on('error', () => {});
  } catch (e) {}
}
export const HiveBridge = async () => {
  return {
    event: async (input) => {
      try { if (input && input.event && input.event.type === 'session.idle') post({ hook_event_name: 'Stop' }); } catch (e) {}
    },
    'tool.execute.before': async (input) => {
      try { post({ hook_event_name: 'PreToolUse', tool_name: input && (input.tool || input.name) }); } catch (e) {}
    },
    'tool.execute.after': async (input) => {
      try { post({ hook_event_name: 'PostToolUse', tool_name: input && (input.tool || input.name) }); } catch (e) {}
    }
  };
};
export default HiveBridge;
`;

// ─── proxy-bridge sidecar (written to <hive>/bin/hive-proxy.cjs) ─────────────
// One per proxy-tier agent (qwen). A dependency-free, loopback-only reverse
// proxy: the agent's CLI is pointed at this (via ANTHROPIC_BASE_URL/OPENAI_BASE_URL),
// and it forwards every request to the user's real upstream UNCHANGED (headers,
// body, streaming). It TEES each response to synthesize the same HIVE_SOCK payloads
// the hook shims emit — Status (context gauge), PostToolUse (breaker), Stop (idle
// drain), and the new CostSample (cost ledger) — so a hookless CLI becomes a hive
// citizen. NEVER logs bodies or keys; the captured body is parsed in-memory and
// dropped. Idle is heuristic: a turn that ends with no tool call and no new request
// within an ~800ms debounce → Stop (a new request cancels it).
const PROXY_BRIDGE_SHIM = `#!/usr/bin/env node
'use strict';
const http = require('http');
const https = require('https');
const net = require('net');
const { URL } = require('url');

const SOCK = process.env.HIVE_SOCK;
const AGENT_ID = process.env.AGENT_ID || null;
const UPSTREAM = process.env.UPSTREAM_BASE_URL || '';
const SESSION = process.env.HIVE_PROXY_SESSION || null;
const API = process.env.HIVE_PROXY_API === 'anthropic' ? 'anthropic' : 'openai';

function trimSlash(s) { while (s.length && s.charAt(s.length - 1) === '/') s = s.slice(0, -1); return s; }

// Per-model context-window size for the Status gauge; fallback 200k.
function ctxSize(model) {
  const m = String(model || '').toLowerCase();
  if (m.indexOf('[1m]') !== -1 || m.indexOf('-1m') !== -1) return 1000000;
  if (m.indexOf('claude') !== -1) return 200000;
  if (m.indexOf('gpt-4o') !== -1 || m.indexOf('gpt-4.1') !== -1 || m.indexOf('o1') !== -1 || m.indexOf('o3') !== -1) return 128000;
  if (m.indexOf('qwen') !== -1) return 262144;
  return 200000;
}

// Fire-and-forget emit of a shim-shaped payload to the hive socket. Never throws.
function emit(payload) {
  if (!SOCK) return;
  try {
    const c = net.createConnection(SOCK, function () { c.end(JSON.stringify(payload) + '\\n'); });
    c.on('error', function () {});
  } catch (e) {}
}

let stopTimer = null;
function armStop() {
  if (stopTimer) clearTimeout(stopTimer);
  stopTimer = setTimeout(function () {
    stopTimer = null;
    emit({ hook_event_name: 'Stop', agent_id: AGENT_ID, session_id: SESSION });
  }, 800);
  if (stopTimer.unref) stopTimer.unref();
}
function cancelStop() { if (stopTimer) { clearTimeout(stopTimer); stopTimer = null; } }

function safeArgs(s) {
  if (s == null) return {};
  if (typeof s === 'object') return s;
  try { return JSON.parse(s); } catch (e) { return { _raw: String(s).slice(0, 500) }; }
}

// Parse a completed response (single JSON or an SSE stream) and synthesize events.
function parseAndEmit(bodyStr, isSse) {
  const objs = [];
  if (isSse) {
    const lines = bodyStr.split('\\n');
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      const idx = ln.indexOf('data:');
      if (idx === -1) continue;
      const data = ln.slice(idx + 5).trim();
      if (!data || data === '[DONE]') continue;
      try { objs.push(JSON.parse(data)); } catch (e) {}
    }
  } else {
    try { objs.push(JSON.parse(bodyStr)); } catch (e) {}
  }
  if (!objs.length) { armStop(); return; }

  let model = null, input = 0, output = 0, cacheRead = 0, cacheCreation = 0, sawUsage = false;
  const toolCalls = [];
  const oaiTools = {}; // accumulate streaming openai tool_calls by index

  for (let i = 0; i < objs.length; i++) {
    const o = objs[i];
    if (!o || typeof o !== 'object') continue;
    if (o.model) model = o.model;
    if (API === 'anthropic') {
      if (o.type === 'message_start' && o.message) {
        if (o.message.model) model = o.message.model;
        const u = o.message.usage || {};
        input += u.input_tokens || 0;
        cacheRead += u.cache_read_input_tokens || 0;
        cacheCreation += u.cache_creation_input_tokens || 0;
        sawUsage = true;
      } else if (o.type === 'message_delta' && o.usage) {
        output += o.usage.output_tokens || 0;
        sawUsage = true;
      } else if (o.type === 'content_block_start' && o.content_block && o.content_block.type === 'tool_use') {
        toolCalls.push({ name: o.content_block.name, input: o.content_block.input || {} });
      } else if (o.usage && !o.type) {
        // non-streaming full message body
        const u = o.usage;
        input += u.input_tokens || 0;
        output += u.output_tokens || 0;
        cacheRead += u.cache_read_input_tokens || 0;
        cacheCreation += u.cache_creation_input_tokens || 0;
        sawUsage = true;
      }
      if (Array.isArray(o.content)) {
        for (let j = 0; j < o.content.length; j++) {
          const blk = o.content[j];
          if (blk && blk.type === 'tool_use') toolCalls.push({ name: blk.name, input: blk.input || {} });
        }
      }
    } else {
      if (o.usage) {
        const u = o.usage;
        input += u.prompt_tokens || 0;
        output += u.completion_tokens || 0;
        if (u.prompt_tokens_details && u.prompt_tokens_details.cached_tokens) cacheRead += u.prompt_tokens_details.cached_tokens;
        sawUsage = true;
      }
      const choices = o.choices || [];
      for (let c = 0; c < choices.length; c++) {
        const ch = choices[c];
        if (!ch) continue;
        if (ch.message && Array.isArray(ch.message.tool_calls)) {
          for (let t = 0; t < ch.message.tool_calls.length; t++) {
            const tc = ch.message.tool_calls[t];
            if (tc && tc.function) toolCalls.push({ name: tc.function.name, input: safeArgs(tc.function.arguments) });
          }
        }
        if (ch.delta && Array.isArray(ch.delta.tool_calls)) {
          for (let t = 0; t < ch.delta.tool_calls.length; t++) {
            const tc = ch.delta.tool_calls[t];
            if (!tc) continue;
            const k = (tc.index != null ? tc.index : t);
            if (!oaiTools[k]) oaiTools[k] = { name: null, args: '' };
            if (tc.function) {
              if (tc.function.name) oaiTools[k].name = tc.function.name;
              if (tc.function.arguments) oaiTools[k].args += tc.function.arguments;
            }
          }
        }
      }
    }
  }
  const keys = Object.keys(oaiTools);
  for (let i = 0; i < keys.length; i++) {
    const t = oaiTools[keys[i]];
    if (t.name) toolCalls.push({ name: t.name, input: safeArgs(t.args) });
  }

  if (sawUsage) {
    emit({ hook_event_name: 'Status', agent_id: AGENT_ID, context_window: { total_input_tokens: input + cacheRead + cacheCreation, context_window_size: ctxSize(model) } });
    emit({ hook_event_name: 'CostSample', agent_id: AGENT_ID, session_id: SESSION, model: model, input: input, output: output, cache_read: cacheRead, cache_creation: cacheCreation });
  }
  if (toolCalls.length) {
    cancelStop(); // a tool call means the turn continues
    for (let i = 0; i < toolCalls.length; i++) {
      emit({ hook_event_name: 'PostToolUse', agent_id: AGENT_ID, session_id: SESSION, tool_name: toolCalls[i].name, tool_input: toolCalls[i].input });
    }
  } else {
    armStop();
  }
}

let upstreamUrl = null;
try { upstreamUrl = new URL(UPSTREAM); } catch (e) {}

const server = http.createServer(function (req, res) {
  cancelStop(); // a new request means the turn is still going
  if (!upstreamUrl) { res.statusCode = 502; res.end('proxy: no upstream'); return; }
  let target;
  try { target = new URL(trimSlash(UPSTREAM) + req.url); } catch (e) { res.statusCode = 502; res.end('proxy: bad url'); return; }
  const isHttps = target.protocol === 'https:';
  const lib = isHttps ? https : http;
  const headers = Object.assign({}, req.headers);
  headers.host = target.host;
  // Ask upstream for plaintext so the tee can parse SSE/JSON reliably; the client
  // gets uncompressed bytes (loopback — negligible) and no content-encoding to undo.
  delete headers['accept-encoding'];
  const opts = {
    protocol: target.protocol,
    hostname: target.hostname,
    port: target.port || (isHttps ? 443 : 80),
    method: req.method,
    path: target.pathname + target.search,
    headers: headers
  };
  const upReq = lib.request(opts, function (upRes) {
    res.writeHead(upRes.statusCode || 502, upRes.headers);
    const ct = String((upRes.headers['content-type'] || ''));
    const wantParse = ct.indexOf('json') !== -1 || ct.indexOf('event-stream') !== -1;
    const isSse = ct.indexOf('event-stream') !== -1;
    const chunks = [];
    let total = 0;
    upRes.on('data', function (chunk) {
      res.write(chunk); // stream straight through to the CLI
      if (wantParse && total < 4194304) { chunks.push(chunk); total += chunk.length; }
    });
    upRes.on('end', function () {
      res.end();
      if (wantParse && chunks.length) {
        try { parseAndEmit(Buffer.concat(chunks).toString('utf8'), isSse); } catch (e) {}
      }
    });
    upRes.on('error', function () { try { res.end(); } catch (e) {} });
  });
  upReq.on('error', function () { try { res.statusCode = 502; res.end('proxy: upstream error'); } catch (e) {} });
  req.pipe(upReq);
});

server.on('error', function () {
  try { process.stdout.write(JSON.stringify({ port: 0 }) + '\\n'); } catch (e) {}
  process.exit(0);
});
server.listen(0, '127.0.0.1', function () {
  const addr = server.address();
  const port = (addr && typeof addr === 'object') ? addr.port : 0;
  try { process.stdout.write(JSON.stringify({ port: port }) + '\\n'); } catch (e) {}
});
`;

// Official Gemini CLI bridge. Gemini already sends snake_case payload fields;
// normalize its event names, then translate HookServer decisions back into
// Gemini's documented hook output contract.
const GEMINI_HOOK_SHIM = `#!/usr/bin/env node
'use strict';
const net = require('net');
const agentId = process.env.AGENT_ID || null;
let data = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (d) => { data += d; });
process.stdin.on('end', () => {
  const sock = process.env.HIVE_SOCK;
  if (!agentId || !sock) { process.exit(0); }
  let gemini = {};
  try { gemini = JSON.parse(data || '{}'); } catch (_) {}
  const names = {
    SessionStart: 'SessionStart',
    BeforeAgent: 'UserPromptSubmit',
    BeforeTool: 'PreToolUse',
    AfterTool: 'PostToolUse',
    AfterAgent: 'Stop'
  };
  const payload = {
    ...gemini,
    hook_event_name: names[gemini.hook_event_name] || gemini.hook_event_name || 'Unknown',
    agent_id: agentId
  };
  let resp = '';
  const done = () => {
    let out = null;
    try {
      const r = JSON.parse(resp || '{}');
      if (r.continue === false) out = { continue: false, stopReason: r.stopReason };
      else if (r.decision === 'block') out = { decision: 'deny', reason: r.reason };
      else if (r.hookSpecificOutput && r.hookSpecificOutput.permissionDecision === 'deny') {
        out = { decision: 'deny', reason: r.hookSpecificOutput.permissionDecisionReason };
      } else if (r.hookSpecificOutput && r.hookSpecificOutput.additionalContext) {
        out = { hookSpecificOutput: { additionalContext: r.hookSpecificOutput.additionalContext } };
      }
    } catch (_) {}
    if (out) { try { process.stdout.write(JSON.stringify(out)); } catch (_) {} }
    process.exit(0);
  };
  try {
    const c = net.createConnection(sock, () => c.write(JSON.stringify(payload) + '\\n'));
    c.setEncoding('utf8');
    c.on('data', (d) => { resp += d; });
    c.on('end', done);
    c.on('error', () => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  } catch (_) { process.exit(0); }
});
`;

// ─── grok-hook shim (written to <hive>/bin/grok-hook.cjs) ───────────────────
// Grok's lifecycle events and decisions are Claude-compatible, but the wire
// payload is camelCase and uses snake_case event values. Normalize the input for
// HookServer and translate its Claude-style permission denial into Grok's direct
// decision form. Scoped by AGENT_ID so the trusted global hook is inert outside
// Munder-spawned workers.
const GROK_HOOK_SHIM = `#!/usr/bin/env node
'use strict';
const net = require('net');
const agentId = process.env.AGENT_ID || null;
let data = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (d) => { data += d; });
process.stdin.on('end', () => {
  const sock = process.env.HIVE_SOCK;
  if (!agentId || !sock) { process.exit(0); }
  let grok = {};
  try { grok = JSON.parse(data || '{}'); } catch (_) {}
  const names = {
    pre_tool_use: 'PreToolUse',
    post_tool_use: 'PostToolUse',
    post_tool_use_failure: 'PostToolUseFailure',
    permission_denied: 'PermissionDenied',
    stop: 'Stop',
    stop_failure: 'StopFailure',
    session_start: 'SessionStart',
    session_end: 'SessionEnd',
    user_prompt_submit: 'UserPromptSubmit',
    notification: 'Notification',
    subagent_start: 'SubagentStart',
    subagent_stop: 'SubagentStop',
    pre_compact: 'PreCompact',
    post_compact: 'PostCompact'
  };
  const payload = {
    hook_event_name: names[grok.hookEventName] || grok.hookEventName || 'Unknown',
    agent_id: agentId,
    session_id: grok.sessionId,
    cwd: grok.cwd || grok.workspaceRoot,
    tool_name: grok.toolName,
    tool_input: grok.toolInput,
    stop_hook_active: grok.stopHookActive,
    prompt: grok.prompt,
    source: grok.source,
    notification_type: grok.notificationType,
    message: grok.message
  };
  let resp = '';
  const done = () => {
    let out = null;
    try {
      const r = JSON.parse(resp || '{}');
      if (r.continue === false) out = { continue: false, stopReason: r.stopReason };
      else if (r.decision === 'block') out = { decision: 'block', reason: r.reason };
      else if (r.hookSpecificOutput && r.hookSpecificOutput.permissionDecision === 'deny') {
        out = { decision: 'deny', reason: r.hookSpecificOutput.permissionDecisionReason };
      } else if (r.hookSpecificOutput && r.hookSpecificOutput.additionalContext) {
        out = r;
      }
    } catch (_) {}
    if (out) { try { process.stdout.write(JSON.stringify(out)); } catch (_) {} }
    process.exit(0);
  };
  try {
    const c = net.createConnection(sock, () => c.write(JSON.stringify(payload) + '\\n'));
    c.setEncoding('utf8');
    c.on('data', (d) => { resp += d; });
    c.on('end', done);
    c.on('error', () => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  } catch (_) { process.exit(0); }
});
`;
