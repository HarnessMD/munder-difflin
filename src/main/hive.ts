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
import { officePaths } from '../core/paths';
import { agentIdentity, HIVE_IDENTITY_FILE, writeCursorIdentity } from '../core/agentIdentity';
import { hookSockTooLong, shortHookSockPath } from '../core/hookSockPlace';
import { PendingNotices, type DegradedNotice } from './degradedPending';
import {
  existsSync, mkdirSync, readFileSync, writeFileSync, renameSync,
  readdirSync, statSync, lstatSync, realpathSync, rmSync, appendFileSync,
  symlinkSync, unlinkSync, copyFileSync, cpSync, chmodSync
} from 'node:fs';
import { join, dirname, basename, isAbsolute, relative, resolve, sep } from 'node:path';
import { homedir } from 'node:os';
import { grokThemeEnv } from '../shared/grokTheme';
import { redactSecrets } from '../shared/redactSecrets';
import { integrationsBriefLine, type IntegrationListEntry } from '../shared/integrationList';
import { tailLines } from './tailLines';
import { spawnSync, spawn, type ChildProcess } from 'node:child_process';
import { joinCommandLine } from '../shared/commandLine';
import { findNodeOnPath, nodeLauncherBodies } from './nodeLauncher';
import { writeMemoryGate } from './memoryGate';
import { shellPathGeneration, userShellPath } from './shellEnv';
import { detectNodeVersion, nodeIsUsable } from './nodeInstall';
import { randomBytes, createHash } from 'node:crypto';
import type { AgentUsageSample } from './usage';
import type { MemoryIndexRow } from './memoryIndex';
import { COMMAND_GROUPS } from '../shared/claudeCommands';
import { askLabels, validRawChosen } from '../shared/askOptions';
import { askClosed, isDoneCard } from '../shared/humanAsk';
import { pushRefusedSession, pushSessionHistory, resumableCandidates } from '../shared/resumeKey';
import { sessionIdFits } from '../shared/resumeStore';
import { normalizeClaudeOutputStyle } from '../shared/outputStyle';
import { isTempAgentId } from '../shared/tempAgent';
import {
  isClaudeProvider,
  isHiveAwareProvider,
  canReceiveInbox,
  providerPreset,
  bridgeOf,
  type AgentProvider
} from '../shared/agentProvider';
import { MCP_CATALOG } from '../shared/mcpCatalog';
import { cleanCustomMcp, customMcpKey, customMcpSpec, type AgentCustomMcpServer } from '../shared/agentMcp';
import { skillsOffSettings } from '../shared/agentSkills';
import { selectBroadcastTargets, heldBroadcastSkips } from '../shared/broadcast';
import { preferredAgentRole } from '../shared/agentRole';
import { applyTaskPatches, mergeTaskLedger } from '../shared/taskLedger';
import { assignTicketKeys, isTicketPrefix, readTicketMeta, resolveTask, type TicketMeta } from '../shared/ticketKeys';
import { stampTaskTimes } from '../shared/taskTimes';
import { expandTilde } from './fs';
import { DamagedFiles, fileIdentity, type DamagedFile } from './damagedFile';
import { isDeepStrictEqual } from 'node:util';
import { codexTrustEntry } from '../shared/codexTrust';
import { codexAgentConfig } from '../shared/codexAgentConfig';
import { codexNetworkToml, codexWritableRootsToml } from '../shared/codexRemote';
import { codexWindowsSandboxToml } from '../shared/codexWindowsSandbox';
import { resolveGodName } from '../shared/godIdentity';
import {
  AGENT_IGNORE_LINES, HIVE_IGNORE_LINES, REPO_SIZE_WARN_BYTES, boundGcMemory, ignoreOversized,
  mergeIgnoreLines, packedBytes, setUntrackedCache, untrackIgnored, type GitRun, type RepoFs
} from '../shared/hiveRepo';
import { HiveCommitQueue, spawnHiveGit, type RootGit } from './hiveCommitQueue';
import { gitInitSync } from '../core/gitSafe';
import { archiveFileName, PINNED_NOTES_CAP_BYTES, RAW_ARCHIVE_BASE, RULES_CAP_BYTES, RULES_HEADING, noticeDue, pinnedNeedsSort, rulesOverLimit } from '../shared/memoryShape';
import { sectionsNeedSort } from './reflect';
import { HANDOFF_FILE, HANDOFF_MAX_SECTIONS, handoffSeed } from '../shared/handoff';
import { HIVE_COMPACT_SCRIPT } from '../shared/hiveCompact';
import { MD_LIMITS_SCRIPT, MD_MODELS_SCRIPT } from '../shared/mdLimitsScript';
import { limitsSummary } from '../shared/limitsText';
import type { UsageLimitsSnapshot } from '../shared/usageLimits';
import { cleanWorkId } from '../shared/workId';
import { HOOK_TOKEN_ENV, PROMPT_HOOK_TIMEOUT_S, httpHookEntry, httpHookHost, withLoopbackNoProxy, type HookTransport } from './hookTransport';
import type { OfficeHost } from '../core/host';
import { holdsRestore, isLive, nextQuickExits, sweptByOldStartup, type RestoreHold } from '../shared/agentLive';

/** The subset of HarnessConfig the hive consumes for the default-MCP merge.
 *  Kept as a local shape so hive.ts never imports the foundation-owned config
 *  module just for a type. */
type McpDefaultsMap = { [id: string]: { enabled: boolean } } | undefined;

// ─── Types ──────────────────────────────────────────────────────────────────

/** `note` (0.5.6) is an `inform` that needs no reply. Since 26 Oct 2026 it
 *  wakes its receiver like any message; only the app's own notes about a temp
 *  wait for the next wake, 30 minutes at most (shared/hiveNudge.ts wakesReceiver). */
export type MessageAct = 'request' | 'inform' | 'propose' | 'query' | 'agree' | 'refuse' | 'done' | 'note';

/** What `settleInbox` did to a released worker's mailbox. */
export interface SettledInbox {
  /** Unread messages filed under inbox/.done. */
  moved: number;
  /** Unread messages left pending because they arrived after the cut-off. */
  kept: number;
  /** The filed messages that asked for something — their sender never gets
   *  an answer, and deserves to hear so instead of waiting on a dead worker.
   *  `conversation` lets the caller tell the worker's own work order (which
   *  it just completed) from a genuinely unanswered request. */
  unanswered: Array<{ id: string; act: MessageAct; from: string; subject: string; conversation: string }>;
}

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
  /** The piece of work this belongs to (0.5.6): a card id, a pull request, a
   *  short name. Optional; read through workIdOf (shared/workId.ts), which
   *  falls back to `conversation`. */
  work?: string;
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
  /** A choice (optional; an entry without these works as before): the options shown, the
   *  index of the advised one, whether several may be picked, and the indexes the human
   *  picked (written by the app with `a`, which still carries the answer as text). Indexes
   *  count from 0; renderer/src/components/humanQuestion.ts validates them. */
  options?: Array<{ label: string; detail?: string }>;
  recommended?: number;
  multi?: boolean;
  chosen?: number[];
}

/** Which Ask Me entry an answer is for: its question, its askedAt
 *  when the window had one, else `nth` (how many earlier entries share that
 *  q), and the option labels the card showed (answerQuestions). */
export interface HumanQARef { q: string; askedAt?: string; nth?: number; labels?: string[] }
/** What an answer writes on that entry: an answer (`chosen` as RAW option
 *  positions), or a dismissal. */
export type HumanQAChange = { a: string; answeredAt: string; chosen?: number[] } | { dismissedAt: string };

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
  webhook?: { tokenHash: string; endpointId?: string };
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
  sleeping?: boolean;
  lastSeen: number;
  /** A PERSON archived or stopped it (0.5.8; src/shared/agentLive.ts). The
   *  record is retained (not deleted) so its history/memory survive. It is not
   *  started at the next launch; Reopen brings it back. */
  archived?: boolean;
  /** No terminal right now and nobody chose that: it exited, crashed, was killed
   *  from outside, the breaker stopped it, or the app quit (0.5.8). Restored at
   *  the next launch. Every reader skips it as it skips an archived agent, via
   *  `isLive` in src/shared/agentLive.ts. */
  stopped?: boolean;
  /** Runs in a row that ended on their own within QUICK_EXIT_MS of starting.
   *  Kept across spawns on purpose: each restart is a spawn. */
  quickExits?: number;
  /** Why the automatic restore leaves this stopped agent alone. A spawn clears it. */
  restoreHold?: RestoreHold;
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
  /** Sessions the CLI refused to reopen, most recent first, bounded (0.5.8). A
   *  restart never tries one of these again: see shared/resumeRetry.ts. */
  refusedSessions?: string[];
  /** Whether `cwd` is actually usable for a (re)spawn — i.e. an ABSOLUTE path
   *  that exists as a directory. Computed + persisted at spawn so the roster
   *  reliably exposes each worker's environment validity. A non-absolute fragment
   *  (e.g. "ClaudeTerminalHarness") spawns into a nonexistent dir and fails; this
   *  flag makes that visible instead of letting it slip through silently. */
  cwdValid?: boolean;
  /** Its standing goal. This computer keeps its agents' goals in the window's store. */
  goal?: string;
  /** Its portrait, the cast member and the accent. This computer keeps its agents' in the window's store. */
  character?: string;
  accent?: string;
}

export interface Registry {
  godId: string | null;
  agents: Record<string, RegistryAgent>;
  /** 'person' once the 0.5.7 archived flags were moved to the 0.5.8 meaning
   *  (migrateArchivedMeaning). Absent on a registry 0.5.8 has not opened yet. */
  archivedMeaning?: 'person';
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
/** F27. A row this fresh is a start under way, not an agent with no session. */
const NO_SESSION_GRACE_MS = 60_000;

/** tasks.json is read in full at least this often, whatever its identity says: the safety net for a change
 *  its identity missed (a coarse clock, a copy that kept the times). */
export const TASKS_REREAD_MS = 3 * 60_000;

/** Frozen all the way down: the ledger's parse is every reader's until the file changes (HiveManager.tasks). */
function freezeDeep<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value)) freezeDeep(v);
  }
  return value;
}

/** Filesystem- and sort-safe timestamp, e.g. 2026-05-30T14-03-11-123Z. */
function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function shortRand(): string {
  return randomBytes(3).toString('hex');
}

/** A message id becomes an inbox filename (`<id>.json`), so it may only be a
 *  plain name: letters, digits, dot, dash and underscore, never starting with
 *  a dot (so never `.` or `..`) and never holding a separator (public #566). */
const SAFE_MESSAGE_ID = /^[A-Za-z0-9_-][A-Za-z0-9._-]{0,127}$/;
export function isSafeMessageId(id: unknown): id is string {
  return typeof id === 'string' && SAFE_MESSAGE_ID.test(id);
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

export { redactSecrets };

// ─── HiveManager ────────────────────────────────────────────────────────────

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
/** Plan F, gate of #190 W4: a path the Windows hook wrapper can carry. A .cmd
 *  file is read in the console's code page, not UTF-8, so a letter outside plain
 *  ASCII can come out as another path and the hook fails with nothing said.
 *  Such a path gets no wrapper: the quoted line and the notice instead. `%` is
 *  allowed, because hookWrapperBody doubles it. */
export function hookWrapperSafe(p: string): boolean {
  return /^[\x20-\x7e]+$/.test(p);
}

/** The wrapper's one line: both paths quoted, `%` doubled (cmd would otherwise
 *  expand `D:\100% done` as a variable), the hook's own arguments passed on. */
export function hookWrapperBody(launcher: string, script: string): string {
  const q = (p: string) => `"${p.replace(/%/g, '%%')}"`;
  return `@${q(launcher)} ${q(script)} %*\r\n`;
}

/** The two paths a wrapper runs, or null for a file of any other shape. */
export function hookWrapperTargets(body: string): [string, string] | null {
  const m = body.match(/^@"([^"]*)" "([^"]*)" %\*\r?\n?$/);
  return m ? [m[1].replace(/%%/g, '%'), m[2].replace(/%%/g, '%')] : null;
}

export function shimBundleHash(files: Record<string, string>): string {
  const h = createHash('sha256');
  for (const name of Object.keys(files).sort()) h.update(name).update('\0').update(files[name]).update('\0');
  return h.digest('hex').slice(0, 16);
}

/** Keep the crash directory bounded (public #458). One file per abnormal exit
 *  is fine until the failure being diagnosed is a crash loop: a provider that
 *  dies at startup and is relaunched writes a file per attempt. Filenames start
 *  with an ISO stamp, so a plain sort is chronological. Best effort: a
 *  diagnostic that breaks teardown is worse than a few extra files. */
export const MAX_CRASH_LOGS = 50;

function pruneCrashLogs(dir: string): void {
  try {
    const logs = readdirSync(dir).filter((f) => f.endsWith('.log')).sort();
    for (const stale of logs.slice(0, Math.max(0, logs.length - MAX_CRASH_LOGS))) {
      try { unlinkSync(join(dir, stale)); } catch { /* already gone, or not ours */ }
    }
  } catch { /* an unreadable directory is not worth failing an exit path over */ }
}

export interface VoiceMessagesOptions { agentId?: string; id?: string; limit?: number; includeArchived?: boolean }

/** How long a background mailbox scan works before it gives the app a turn.
 *  By time, not by file count: 200 files took about 53 ms on a busy Mac. */
export const MAIL_SLICE_MS = 8;

/** Run steps to their end in one go: the synchronous doors. */
function runToEnd<T>(steps: Generator<void, T>): T {
  for (;;) {
    const r = steps.next();
    if (r.done) return r.value;
  }
}

/** Run the same steps in slices of MAIL_SLICE_MS, with the app given a turn
 *  between them. `stats` takes the slice count and the longest slice. */
export async function runInSlices<T>(steps: Generator<void, T>, stats?: { slices: number; longestMs: number }): Promise<T> {
  let slices = 1;
  let longest = 0;
  let started = performance.now();
  const close = (): void => {
    longest = Math.max(longest, performance.now() - started);
    if (stats) { stats.slices = slices; stats.longestMs = longest; }
  };
  for (;;) {
    const r = steps.next();
    if (r.done) { close(); return r.value; }
    if (performance.now() - started < MAIL_SLICE_MS) continue;
    close();
    await new Promise<void>((resolve) => setImmediate(resolve));
    slices++;
    started = performance.now();
  }
}

/** The work tree's own git folder (`<store>/.git/worktrees/<name>`) and the shared one, real paths. */
function gitDirsOf(folder: string | undefined): { own: string; common: string } | null {
  if (!folder) return null;
  try {
    const dotGit = join(folder, '.git');
    if (!lstatSync(dotGit).isFile()) return null;
    const m = /^gitdir:\s*(.+?)\s*$/m.exec(readFileSync(dotGit, 'utf8'));
    if (!m) return null;
    const gitDir = isAbsolute(m[1]) ? m[1] : join(folder, m[1]);
    let common = gitDir;
    try {
      const c = readFileSync(join(gitDir, 'commondir'), 'utf8').trim();
      if (c) common = isAbsolute(c) ? c : join(gitDir, c);
    } catch { /* no commondir: a submodule's own git folder, kept as it is */ }
    const real = realpathSync(common);
    return statSync(real).isDirectory() ? { own: realpathSync(gitDir), common: real } : null;
  } catch {
    return null;
  }
}

/**
 * What a sandboxed agent in a git work tree may write of the shared git folder:
 * only what fetch and commit write, its
 * own `worktrees/<name>` (index, HEAD, FETCH_HEAD) and the shared `objects`,
 * `refs` and `logs`. Never the folder whole: its `hooks/` and `config` run
 * with no sandbox the next time the person, or an agent without one, runs git
 * there (a hook, core.hooksPath, core.fsmonitor). Codex's writable roots have
 * no deny, so the same short list serves both engines. What it does not open:
 * `packed-refs` (written when a branch is deleted or refs are packed) and the
 * config, so those stay the person's. Empty for anything that is not a work tree,
 * and for a git folder with no `commondir` (a submodule's, or one made with
 * --separate-git-dir): there the own folder IS the whole git folder, hooks and
 * config included.
 */
export function gitWorkTreeWritableDirs(folder: string | undefined): string[] {
  const d = gitDirsOf(folder);
  if (!d || d.own === d.common) return [];
  const want = [d.own, join(d.common, 'objects'), join(d.common, 'refs'), join(d.common, 'logs')];
  return want.filter((p) => { try { return statSync(p).isDirectory(); } catch { return false; } });
}

/**
 * Is this folder in a git work tree? A `.git` file or
 * folder in it or in a folder above it, as git itself looks, but never the
 * home folder or above: a home folder that is itself a repo (dotfiles) would
 * otherwise give every Codex agent the network. Read only, no git
 * run. A Codex agent gets the network in its sandbox only when this is true.
 */
export function inGitWorkTree(folder: string | undefined, home: string = homedir()): boolean {
  if (!folder) return false;
  let dir = resolve(folder);
  const stop = resolve(home);
  for (let i = 0; i < 64; i++) {
    if (dir === stop) return false;
    if (existsSync(join(dir, '.git'))) return true;
    const up = dirname(dir);
    if (up === dir) return false;
    dir = up;
  }
  return false;
}

/** The deny rule for the app's own data folder (userData), which holds config.json with the switch that lets the
 *  orchestrator add agents unasked, and the secrets. `Edit(//<abs path>/**)` holds for Write and Edit alike. When a folder the agent must write sits inside
 *  it (a hive put there by hand), by its path or through a link, only the app's own files there are denied by
 *  name (USER_DATA_KEPT). None on Windows, where the rule's path form differs, or before a host has set its paths. */
function userDataDeny(writable: string[]): string[] {
  if (process.platform === 'win32') return [];
  let dir: string;
  try { dir = officePaths().userData(); } catch { return []; }
  const real = (p: string): string => { try { return realpathSync(p); } catch { return resolve(p); } };
  const under = (base: string, d: string): boolean => {
    const r = relative(base, d);
    return r === '' || (r !== '..' && !r.startsWith(`..${sep}`) && !isAbsolute(r));
  };
  const holds = writable.some((d) => under(dir, resolve(d)) || under(real(dir), real(d)));
  return holds ? USER_DATA_KEPT.map((f) => `Edit(/${join(dir, f)})`) : [`Edit(/${dir}/**)`];
}

/** The app's own files in userData that an agent's Write and Edit tools may never touch, named one by one for the
 *  case where the folder as a whole cannot be denied: the config with the add switch, the keys and git's private
 *  folder. */
const USER_DATA_KEPT = ['config.json', 'integration-secrets.json', join('git-private', '**'), 'harness.db*'];

/** God's roster asks the host for new usage limits at most this often (the snapshot is in memory; no engine is asked). */
const LIMITS_ROSTER_MAX_AGE_MS = 20_000;

/** An ISO time for a value that reads as one, else null. Only strings: a
 *  number or an object in created_at is not a time an agent meant. */
export function isoTimeOrNull(v: unknown): string | null {
  if (typeof v !== 'string' || !v.trim()) return null;
  const t = Date.parse(v);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

export class HiveManager {
  /** Lazily resolves harnessHome so the hive follows config changes. */
  private getHome: () => string | null;
  /** Optional sink for renderer-facing events (the host's `emit`: the
   *  window's `webContents.send` in the app). Used to animate routed messages
   *  on the office floor; a no-op in tests/headless. */
  private emit?: (channel: string, payload: unknown) => boolean | void;
  /** Needs a fix notices no floor has shown yet (0.5.8, degradedPending.ts). */
  private readonly pendingDegraded = new PendingNotices();

  /**
   * @param host  The office host (src/core/host.ts): the app passes its
   *              ElectronHost, the daemon its own. A bare home resolver and
   *              emit sink are still taken, as the tests pass them.
   * @param emit  The event sink when `host` is a bare resolver.
   */
  constructor(
    host: OfficeHost | (() => string | null),
    emit?: (channel: string, payload: unknown) => boolean | void
  ) {
    if (typeof host === 'function') {
      this.getHome = host;
      this.emit = emit;
    } else {
      this.getHome = () => host.harnessHome();
      this.emit = (channel, payload) => host.emit(channel, payload);
    }
  }

  /** This run's last good registry, for a read that fails just now. */
  private lastGoodRegistry: { path: string; value: Registry } | null = null;
  /** This run's last good tasks.json: the parse, the file's identity when it was read (damagedFile.fileIdentity), the
   *  stamp `tasksSince` hands out for it, and when it was last read in full. A file still at that identity is not read
   *  again until TASKS_REREAD_MS has passed. */
  private lastGoodTasks: { path: string; value: unknown; id: string | null; stamp: string; readAt: number } | null = null;
  /** Stamps that are not a bare identity: a read with none, or a board that changed under the same identity. */
  private tasksRestamped = 0;

  /** registry.json or tasks.json that exists but does not read: kept as it is,
   *  a copy beside it, our writes to it paused until it reads again. */
  private readonly damage = new DamagedFiles((_p, issue) => {
    this.appendLog({ kind: 'hive-file-damaged', file: issue.file, copy: issue.copy, error: issue.error });
  });

  /** The damaged hive files, for the window's banner. Reads them again first. */
  integrityIssues(): DamagedFile[] {
    this.registry();
    this.tasks();
    return this.damage.list();
  }

  /** The path of a damaged hive file listed now, by its name; null otherwise. */
  damagedPath(name: string): string | null {
    this.integrityIssues();
    return this.damage.pathOf(name);
  }

  private routerTimer: NodeJS.Timeout | null = null;

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
  /** Tell the windows an agent needs a fix (the needs-a-fix notice). `reason` picks the renderer's words where it has
   *  them (`telemetry-off`, 0.5.8); `message` is the English fallback. */
  emitDegraded(agentId: string, name: string, reason: string, message: string): void {
    this.degraded({ agentId, name, reason, message });
  }

  /** Every needs a fix notice: kept until a floor takes it (degradedPending.ts), then pushed to the window. */
  private degraded(n: DegradedNotice): void {
    this.pendingDegraded.add(n);
    this.emit?.('hive:degraded', n);
  }

  /** The notices no floor has shown yet; none wait after (`hive:takeDegraded`). */
  takeDegraded(): DegradedNotice[] {
    return this.pendingDegraded.take();
  }

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

  /** A copy of config.orchestratorMaySpawn, set by the app at bootstrap and on
   *  every config write. NOTHING READS IT: the prompt builder does not, and the
   *  rule itself is applied where the app handles a request to add an agent,
   *  from the config. An office does not set it. hive.ts deliberately does not
   *  import the config module. */
  private _maySpawn = true;
  setOrchestratorMaySpawn(on: boolean): void {
    this._maySpawn = on;
  }
  orchestratorMaySpawn(): boolean {
    return this._maySpawn;
  }

  /**
   * 0.5.8 (founder, 9 Nov 2026): what one agent can reach now, in words
   * (shared/integrationList.ts): its own broker grants and the webhooks that
   * bring messages in. Set once by main at start; the prompt builder names it
   * in the agent's start brief. Unset: no line.
   */
  private _integrationsNow: ((agentId: string) => IntegrationListEntry[]) | null = null;
  setIntegrationsNow(fn: ((agentId: string) => IntegrationListEntry[]) | null): void {
    this._integrationsNow = fn;
  }
  /** Usage limits (limits-bar): how to read each engine's limits as the host keeps them (main/usageLimits.ts),
   *  for the one line god's live roster carries. The roster is built synchronously, so it shows the last
   *  snapshot and asks for a new one when that is older than LIMITS_ROSTER_MAX_AGE_MS. Unset: no line. */
  private _limitsRead: (() => Promise<UsageLimitsSnapshot>) | null = null;
  private _limitsSnap: UsageLimitsSnapshot | null = null;
  private _limitsAsked = 0;
  setUsageLimits(read: (() => Promise<UsageLimitsSnapshot>) | null): void {
    this._limitsRead = read;
    this._limitsSnap = null;
    if (read) this.limitsLine();
  }
  private limitsLine(): string | null {
    const read = this._limitsRead;
    if (!read) return null;
    const now = Date.now();
    if (now - this._limitsAsked > LIMITS_ROSTER_MAX_AGE_MS) {
      this._limitsAsked = now;
      read().then((snap) => { this._limitsSnap = snap; }, () => undefined);
    }
    return this._limitsSnap ? limitsSummary(this._limitsSnap, now) : null;
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
  /** Absolute, native separator inbox path, for agent facing text such as the
   *  wake nudge (public #559). Null with no hive, or for an id that is not a
   *  plain name. */
  inboxPath(id: string): string | null {
    const root = this.root();
    if (!root || !/^[A-Za-z0-9_-][A-Za-z0-9._-]*$/.test(id)) return null;
    return join(root, 'agents', id, 'inbox');
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
    // Too deep for a socket (F13): every bind would fail and every hook be allowed.
    const own = join(root, 'hooks.sock');
    return hookSockTooLong(own) ? shortHookSockPath(root) : own;
  }
  private hookBinDir(root: string): string {
    return join(root, 'bin');
  }
  private shimPath(): string | null {
    const root = this.root();
    return root ? join(this.hookBinDir(root), 'cth-hook.cjs') : null;
  }
  /** The proxy-bridge sidecar (qwen). Pure-Node loopback reverse-proxy that
   *  observes a hookless CLI's LLM traffic and synthesizes the same HIVE_SOCK
   *  payloads the hook shims emit. Written in ensureHive alongside cth-hook.cjs. */
  private proxyShimPath(): string | null {
    const root = this.root();
    return root ? join(this.hookBinDir(root), 'hive-proxy.cjs') : null;
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
   * cmd.exe and PowerShell, which host the codex/agy/pi/gemini hooks on Windows.
   * (Claude Code is the exception: it hosts hooks in Git Bash on every platform,
   * so its Windows hook takes the POSIX launcher; see nodeRunSh.) The wrapper
   * also gives agents a `$HIVE_NODE` they can invoke directly (running the
   * Electron binary WITHOUT the env var would launch a second app window, not a
   * script).
   *
   * A real system node is PREFERRED when one is installed and new enough (see
   * systemNode, #493): it starts far faster than the Electron binary, and this
   * launcher runs once per hook and once per hive CLI call. The script checks
   * that node is still there on every run and falls back to Electron as node
   * when it is not, so removing or switching node never breaks a hook.
   *
   * Rewritten on every bootstrap, so an app update/move re-bakes execPath.
   */
  private nodeLauncherPath(): string | null {
    const root = this.root();
    if (!root) return null;
    return join(this.hookBinDir(root), process.platform === 'win32' ? 'hive-node.cmd' : 'hive-node');
  }

  /** The POSIX launcher's path, on every platform. On POSIX it IS
   *  nodeLauncherPath(); on Windows it is written ALONGSIDE the .cmd, for the
   *  one hook host there that is a POSIX shell (Claude Code's Git Bash, see
   *  nodeRunSh). */
  private posixLauncherPath(): string | null {
    const root = this.root();
    return root ? join(this.hookBinDir(root), 'hive-node') : null;
  }

  /** Memoised systemNode(): null means probed and found nothing, undefined
   *  means not probed yet. The probe runs `node --version` and bootstrap runs
   *  every time a hive opens. */
  private systemNodeCache: string | null | undefined;
  /** The shell PATH generation systemNodeCache was probed on, and the node
   *  that PATH held (usable or not), so the same node is not probed twice. */
  private systemNodeGen = -1;
  private systemNodeSeen: string | null = null;

  /** An absolute path to a real, new enough system node, or null (then the
   *  launcher is Electron only, as before). The PATH is the user's shell PATH
   *  that every agent spawn already resolves and caches, scanned as plain
   *  directories: no extra login shell on the main thread. */
  private systemNode(): string | null {
    const gen = shellPathGeneration();
    if (this.systemNodeCache !== undefined && this.systemNodeGen === gen) return this.systemNodeCache;
    let found: string | null = null;
    try {
      // Never a blocking shell: before the login shell has answered this is
      // the fallback PATH, and refreshNodeLauncher() looks again once it has.
      const pathValue = process.platform === 'win32' ? (process.env.PATH || '') : userShellPath();
      const node = findNodeOnPath(pathValue);
      if (this.systemNodeCache !== undefined && node === this.systemNodeSeen) {
        this.systemNodeGen = gen;
        return this.systemNodeCache;
      }
      this.systemNodeSeen = node;
      if (node && nodeIsUsable(detectNodeVersion(node))) found = node;
    } catch { /* any probe failure means we cannot vouch for it: Electron */ }
    this.systemNodeCache = found;
    this.systemNodeGen = gen;
    return found;
  }

  /** Write the node launcher again for the PATH in use now. The launch writes
   *  it before the login shell has answered (0.5.5, Plan G: the PATH is read
   *  in the background), so index.ts calls this when the PATH lands and lets
   *  no agent start before it. Same path, same content rules. */
  refreshNodeLauncher(): void {
    if (!this.root()) return;
    this.writeNodeLauncher();
  }

  /** Write the launcher described above. Best-effort: on failure callers fall
   *  back to bare `node`, i.e. exactly the pre-fix behavior. */
  private writeNodeLauncher(): void {
    const p = this.nodeLauncherPath();
    if (!p) return;
    try {
      const bodies = nodeLauncherBodies(process.execPath, this.systemNode());
      const posixBody = bodies.posix;
      if (process.platform === 'win32') {
        writeFileSync(p, bodies.main, 'utf8');
        // No chmod: Git Bash runs a shebang script off NTFS regardless of mode
        // bits, and chmodSync is a no-op there anyway.
        const posix = this.posixLauncherPath();
        if (posix) writeFileSync(posix, posixBody, 'utf8');
      } else {
        writeFileSync(p, posixBody, 'utf8');
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
  /**
   * `md-limits` and `md-models` (shared/mdLimitsScript.ts): each a script in
   * `<hive>/bin` and a launcher of that name in the runtime folder, which is on
   * every agent's PATH (pty.ts withHiveRuntimeFallback), run with this
   * process's node as the `node` shim beside it is. Each file is rewritten only
   * when it changes. Both ask the broker the agent already has.
   */
  private writeBrokerTools(root: string): void {
    const dir = this.runtimeBinDir();
    if (!dir) return;
    const win = process.platform === 'win32';
    const put = (p: string, text: string): void => {
      if (existsSync(p) && readFileSync(p, 'utf8') === text) return;
      writeFileSync(p, text, 'utf8');
      if (!win) chmodSync(p, 0o755);
    };
    for (const [name, text] of [['md-limits', MD_LIMITS_SCRIPT], ['md-models', MD_MODELS_SCRIPT]] as const) {
      const script = join(root, 'bin', `${name}.cjs`);
      const launcher = join(dir, win ? `${name}.cmd` : name);
      const body = win
        ? `@echo off\r\nset ELECTRON_RUN_AS_NODE=1\r\n"${process.execPath}" "${script}" %*\r\n`
        : `#!/bin/sh\nELECTRON_RUN_AS_NODE=1 exec "${process.execPath}" "${script}" "$@"\n`;
      try {
        mkdirSync(dir, { recursive: true });
        put(script, text);
        put(launcher, body);
      } catch (e) {
        console.error(`[hive] writing ${name} failed:`, e);
      }
    }
  }

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

  /**
   * 0.5.5: a `mempalace` shim beside the `node` one. The memory
   * subsystem finds the CLI through a login shell or the usual uv/pip spots
   * (memory.ts bin()), but an agent's PATH is the app's, which on a packaged
   * launch has none of those (~/.local/bin above all). Every agent was told to
   * run `mempalace wake-up` and got "command not found". This dir is already
   * on every agent's PATH (pty.ts withHiveRuntimeFallback), so a shim that
   * execs the resolved binary is enough. Rewritten only when the target moves.
   */
  writeMempalaceShim(bin: string | null | undefined): void {
    const dir = this.runtimeBinDir();
    if (!dir || !bin || !isAbsolute(bin) || !existsSync(bin)) return;
    const win = process.platform === 'win32';
    const p = join(dir, win ? 'mempalace.cmd' : 'mempalace');
    const body = win ? `@echo off\r\n"${bin}" %*\r\n` : `#!/bin/sh\nexec "${bin}" "$@"\n`;
    try {
      if (existsSync(p) && readFileSync(p, 'utf8') === body) return;
      mkdirSync(dir, { recursive: true });
      writeFileSync(p, body, 'utf8');
      if (!win) chmodSync(p, 0o755);
    } catch (e) {
      console.error('[hive] writeMempalaceShim failed:', e);
    }
  }

  /**
   * 0.5.6: `md-memory`, the command agents are taught for search, beside the
   * `mempalace` shim. It runs the real mempalace under a machine wide lock so
   * only one MemPalace process loads at a time (memoryGate.ts). A new name,
   * because this dir is LAST on an agent's PATH and a user's ~/.local/bin
   * comes first, so `mempalace` itself never reaches a shim here. Each file is
   * rewritten only when its content changes.
   */
  writeMemoryGateShim(bin: string | null | undefined): void {
    const dir = this.runtimeBinDir();
    if (!dir || !bin || !isAbsolute(bin) || !existsSync(bin)) return;
    try {
      writeMemoryGate(dir, bin);
    } catch (e) {
      console.error('[hive] writeMemoryGateShim failed:', e);
    }
  }

  /** Build a hook command string that runs `script` under the guaranteed node,
   *  DOUBLE-QUOTED (safe for paths with spaces). */
  private nodeRun(script: string, ...args: string[]): string {
    const launcher = this.nodeLauncher();
    return [launcher ? `"${launcher}"` : 'node', `"${script}"`, ...args].join(' ');
  }

  /** nodeRun for a hook that a POSIX shell runs ON WINDOWS — Claude Code hosts
   *  its hooks in Git Bash there. Same shape as POSIX nodeRun (the sh launcher,
   *  double-quoted, so a space stays inside one argument) with two Windows
   *  adjustments: forward slashes, because bash treats a backslash outside
   *  quotes as an escape and Windows accepts either separator; and the POSIX
   *  launcher rather than the .cmd one, because bash runs a .cmd by handing the
   *  whole line to cmd.exe, whose `/c "A" "B"` quote stripping is exactly the
   *  failure this avoids. Wrong for cmd.exe or PowerShell-hosted hooks — those
   *  keep nodeRunWindowsHook below. Falls back to the launcher's own body inline
   *  (also bash-correct) if the script is somehow missing. */
  private nodeRunSh(script: string, ...args: string[]): string {
    const fwd = (p: string) => p.replace(/\\/g, '/');
    const posix = this.posixLauncherPath();
    const launcher = posix && existsSync(posix)
      ? `"${fwd(posix)}"`
      : `ELECTRON_RUN_AS_NODE=1 "${fwd(process.execPath)}"`;
    return [launcher, `"${fwd(script)}"`, ...args].join(' ');
  }

  /** A provider's hook line on Windows: UNQUOTED, for shells that cannot keep
   *  embedded quotes (cmd and PowerShell as the providers drive them). POSIX
   *  JSON hook configs must use nodeRun(), because the user chosen hive path may
   *  legitimately contain spaces.
   *
   *  On Windows the paths are first reduced to their 8.3 SHORT form, because
   *  unquoted is only safe while nothing contains a space, and the DEFAULT
   *  harness home does: `Documents\Munder Difflin`. Codex/agy/grok therefore
   *  shipped a hook line that the shell split at the space, so every hook of every
   *  non-Claude agent died with `'C:\Users\...\Documents\Munder' is not
   *  recognized` (exit 1) and took live status, cost and the Stop-driven inbox
   *  drain with it. A short path has no space, so it needs no quotes and keeps
   *  the .cmd shape #350 asked for. With no short name, windowsHookLine picks
   *  the PATH wrapper or reports the line (plan F). */
  private nodeRunWindowsHook(provider: string, pathProven: boolean, script: string, ...args: string[]): string {
    return this.windowsHookLine(provider, this.nodeLauncher() ?? 'node', script, args, pathProven);
  }

  /** Windows 8.3 short form of `p`, or `p` unchanged when it needs no shortening
   *  (no space), is not Windows, or the volume has 8.3 names disabled. Memoized:
   *  every resolution costs a `cmd` spawn and the same handful of paths are asked
   *  for on each agent spawn.
   *
   *  THE QUOTES COME FROM THE ENVIRONMENT, not from the command line, and that is
   *  the whole trick. `for %I in (<set>)` splits its set on spaces, so the path
   *  has to be quoted — but a `"` inside a spawn argument never reaches cmd.exe
   *  intact: Node escapes it as `\"` (MSVCRT convention) and cmd, which has no
   *  backslash escape, reads the line as garbage. Measured on the default hive
   *  home, the as-written call returned
   *    C:\"C:\Users\fardi\Documents\Munder Difflin\hive\bin\hive-node.cmd\"
   *  which has a space, fails the guard below, and falls back to the long path —
   *  so the lookup could NEVER succeed in the only case it is called for (a path
   *  with a space). Expanding `%HIVE_SHORT_SRC%` inside cmd sidesteps Node's
   *  argument escaping entirely: the command line we pass contains no quote at
   *  all, and cmd substitutes one already-quoted token before `for` parses it. */
  private shortPathCache = new Map<string, string>();
  /** Test seam: stands in for the cmd lookup below (tests have no cmd.exe). */
  private shortNameLookup?: (p: string) => string | null;
  private shortenForShell(p: string): string {
    if (process.platform !== 'win32' || !p.includes(' ')) return p;
    const hit = this.shortPathCache.get(p);
    if (hit !== undefined) return hit;
    let out = p;
    try {
      const res = this.shortNameLookup ? { stdout: this.shortNameLookup(p) ?? '' } : spawnSync('cmd', ['/d', '/c', 'for %I in (%HIVE_SHORT_SRC%) do @echo %~sI'], {
        encoding: 'utf8',
        env: { ...process.env, HIVE_SHORT_SRC: `"${p}"` }
      });
      const short = (res.stdout ?? '').trim();
      if (short && !short.includes(' ') && (this.shortNameLookup || existsSync(short))) out = short;
    } catch { /* fall through to the original path */ }
    // No short name (8.3 is off on this volume): windowsHookLine decides what to
    // do instead and reports it once.
    this.shortPathCache.set(p, out);
    return out;
  }

  /** The hook command line for a provider whose hooks run under cmd or
   *  PowerShell on Windows (plan F, T1 to T3). The line must have no quote and
   *  no space: PowerShell `-Command` parses a line that starts with a quoted
   *  string as an expression, and fails every hook with exit 1.
   *   1. Short (8.3) names for both paths: the tested shape, used whenever it works.
   *   2. No short name, and the provider's hooks provably see the agent's PATH:
   *      a small `md-hook-<hash>.cmd` in `<hive root>\bin\runtime` (already on
   *      every agent's PATH, pty.ts withHiveRuntimeFallback) that runs the quoted
   *      paths itself. The hook line is then its bare name.
   *      Proven for codex (hooks get the process environment captured at session
   *      start, codex-rs/hooks/src/registry.rs Hooks::new, replayed in
   *      engine/command_runner.rs build_command; PATH is not scrubbed) and gemini
   *      (packages/core/src/hooks/hookRunner.ts, PATH and PATHEXT always kept by
   *      services/environmentSanitization.ts). Not for agy: its hook
   *      environment cannot be read, and is known to strip PATH.
   *   3. Otherwise the quoted line stays and the person is told once per launch,
   *      with the path and the fix. It is not a working line: PowerShell rejects
   *      it, and `cmd /c` strips its outer quotes (windows-hook-shortpath). It is
   *      only the least wrong thing to write. */
  private windowsHookLine(provider: string, launcher: string, script: string, args: string[], pathProven: boolean): string {
    const l = this.shortenForShell(launcher);
    const s = this.shortenForShell(script);
    if (!/\s/.test(l) && !/\s/.test(s)) return joinCommandLine([l, s, ...args]);
    const spaced = /\s/.test(l) ? launcher : script;
    const wrapper = pathProven && hookWrapperSafe(launcher) && hookWrapperSafe(script)
      ? this.writeHookWrapper(launcher, script) : null;
    if (wrapper) {
      this.reportHookLine('hook-command-wrapper', provider, spaced);
      return joinCommandLine([wrapper, ...args]);
    }
    this.reportHookLine('hook-command-unrunnable', provider, spaced);
    return joinCommandLine([l, s, ...args]);
  }

  /** Write `<runtime>\md-hook-<hash>.cmd`, which runs `launcher script %*`.
   *  Quotes are safe INSIDE a .cmd file: cmd parses its own file, no shell stack
   *  in between. `%` is doubled, or cmd would expand `100% done` as a variable.
   *  Only called for paths hookWrapperSafe accepts. Named by a hash of both
   *  paths, so each target gets one stable file and nothing another floor wrote
   *  is overwritten. Returns the bare name, or null when it cannot be written
   *  (the caller then reports). */
  private writeHookWrapper(launcher: string, script: string): string | null {
    const dir = this.runtimeBinDir();
    if (!dir) return null;
    try {
      const name = `md-hook-${createHash('sha256').update(`${launcher}\0${script}`).digest('hex').slice(0, 8)}`;
      const file = join(dir, `${name}.cmd`);
      const body = hookWrapperBody(launcher, script);
      mkdirSync(dir, { recursive: true });
      if (!existsSync(file) || readFileSync(file, 'utf8') !== body) writeFileSync(file, body, 'utf8');
      return name;
    } catch (e) {
      console.error('[hive] writeHookWrapper failed:', e);
      return null;
    }
  }

  /** Hook command problems already reported this launch (kind|provider|path). */
  private hookLineReported = new Set<string>();
  /** provider → path → the notice that provider's next spawn carries
   *  (ensureAgent `degraded`). By path too, so a second path is not lost. */
  private hookLineNotices = new Map<string, Map<string, string>>();
  /** When each memory.md notice (`<id>:rules`, `<id>:sort`) last rode in a
   *  spawn prompt: each at most once a day per agent. In memory only, so an
   *  app restart may give one again sooner. */
  private memoryNoticeAt = new Map<string, number>();
  private reportHookLine(kind: 'hook-command-wrapper' | 'hook-command-unrunnable', provider: string, path: string): void {
    const key = `${kind}|${provider}|${path}`;
    if (this.hookLineReported.has(key)) return;
    this.hookLineReported.add(key);
    this.appendLog({ kind, provider, path });
    if (kind === 'hook-command-wrapper') {
      console.warn(`[hive] no 8.3 short name for ${path}; ${provider} hooks run through a PATH wrapper`);
      return;
    }
    console.error(`[hive] no 8.3 short name for ${path}; ${provider} hooks cannot run`);
    if (!this.hookLineNotices.has(provider)) this.hookLineNotices.set(provider, new Map());
    this.hookLineNotices.get(provider)!.set(path, `${provider} hooks cannot run on this computer: the path ${path} has a space and Windows has no short name for it. `
      + `Live status, cost and the inbox wake will not work for ${provider} agents. `
      + (/[^\x20-\x7e]/.test(path)
        ? 'Fix: move the hive home to a folder whose path has only plain English letters and no space, in Settings.'
        : 'Fix: move the hive home to a folder with no space in Settings, or turn on short (8.3) names for that drive.'));
  }

  /** The notices for a provider's hooks, once: the first spawn after they were found. */
  private takeHookLineNotice(provider: string): string | undefined {
    const notices = this.hookLineNotices.get(provider);
    if (!notices || notices.size === 0) return undefined;
    this.hookLineNotices.delete(provider);
    return [...notices.values()].join(' ');
  }

  /** Remove hook wrappers whose launcher or script is gone (gate of #190, W5).
   *  One is written per target, and Gemini's target is per agent, so without
   *  this every retired Gemini agent and temp would leave one for good. Run
   *  once per launch; a wrapper still in use is rewritten on the next spawn
   *  anyway. Reads only files named md-hook-*.cmd, and only its own shape. */
  sweepHookWrappers(): void {
    const dir = this.runtimeBinDir();
    if (!dir || !existsSync(dir)) return;
    let names: string[] = [];
    try { names = readdirSync(dir); } catch { return; }
    for (const name of names) {
      if (!/^md-hook-[0-9a-f]{8}\.cmd$/.test(name)) continue;
      const file = join(dir, name);
      try {
        const targets = hookWrapperTargets(readFileSync(file, 'utf8'));
        if (!targets || targets.every((t) => existsSync(t))) continue;
        unlinkSync(file);
      } catch { /* in use or already gone: the next launch tries again */ }
    }
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

  /** 0.5.6: the bundled `md-secret.cjs`, absolute, set by main at boot. The
   *  CAPABILITIES line names it after the bundled Node, so an agent uses a key
   *  saved after it started, with no restart. Unset: that sentence is left out. */
  private _secretHelperPath: string | null = null;
  setSecretHelperPath(p: string | null): void {
    this._secretHelperPath = p;
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

  /** Replace the generated hive docs with the bundled versions. Called once per
   *  app start by bootstrapHiveServices. It used to happen only when absent,
   *  which meant a hive created once never saw a protocol change again; the
   *  files are generated and agents treat them as the authority, so a stale
   *  copy is worse than a rewrite. */
  refreshGeneratedDocs(): void {
    const root = this.root();
    if (!root) return;
    for (const { filename, contents } of GENERATED_HIVE_DOCS) {
      writeFileSync(join(root, filename), contents, 'utf8');
    }
  }

  /** Create the hive skeleton + git repo if missing. Idempotent. */
  ensureHive(): void {
    const root = this.root();
    if (!root) return;
    mkdirSync(join(root, 'agents'), { recursive: true });

    // PROTOCOL.md and COMMANDS.md are only CREATED here when missing (public
    // #474). ensureHive also runs on every task write, archive and agent spawn,
    // and rewriting both files each time was churn. The refresh that keeps an
    // old hive on the current protocol is refreshGeneratedDocs(), which
    // bootstrapHiveServices calls once per start, right after ensureHive.
    for (const { filename, contents } of GENERATED_HIVE_DOCS) {
      const path = join(root, filename);
      if (!existsSync(path)) writeFileSync(path, contents, 'utf8');
    }

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

    // Keep the churny/ephemeral live files, and every machine generated tree,
    // out of the hive git repo. The list and the reasoning are in
    // shared/hiveRepo.ts; `prepareRepo` (in the commit queue) drops whatever is already in the
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
    // `md-limits`, every engine's usage limits for any agent (limits-bar), and `md-models`, the engines and
    // their models, which are installed and signed in (hire-defaults-058).
    this.writeBrokerTools(root);
    // The bundled-node launcher every shim above is invoked through — MUST be
    // written before any hook installer runs (they probe for it).
    this.writeNodeLauncher();
    // …and the PATH-visible `node` fallback for the agent's OWN subprocesses.
    this.writeRuntimeShims();

    // `gitInitSync` makes a repository only where nothing named `.git` is,
    // a dangling link included (src/core/gitSafe.ts).
    if (!existsSync(join(root, '.git'))) {
      this.gitInitSync(root);
      this.commit('hive: init');
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
      /** The resolved mempalace CLI (memory.bin()); shimmed onto the agent's PATH. */
      mempalaceBin?: string | null;
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
      /** This agent's custom MCP servers (0.5.6, the agent file), from
       *  config.agentCustomMcp. Only one a person switched on is written. */
      customMcp?: AgentCustomMcpServer[];
      /** The skill names turned off for this agent (0.5.6, config.agentSkillsOff
       *  through shared/agentSkills.ts skillOffNames). Claude Code only: written
       *  into this agent's own settings file as deny rules and overrides. */
      skillsOff?: string[];
      /** App-resources `skills/` source dir (W3). The bundled read-only skills are
       *  copied into the agent's `.claude/skills/` per spawn; undefined or missing
       *  is a no-op (tolerated until Kevin populates the resource dir). */
      skillsDir?: string;
      /** Extra directories the agent's sandbox may write (e.g. the shared
       *  MemPalace dir, which `mempalace` mutates). Absolute paths; ignored
       *  for providers without a sandbox. */
      extraWritableDirs?: string[];
      /** 0.5.5 perf, item 6: how this Claude agent's hooks reach the HookServer,
       *  decided by the caller (hookTransport.ts chooseHookTransport). Undefined
       *  means nobody decided, so the command hooks are written as before. */
      hookTransport?: HookTransport;
    } = {}
  ): Promise<SpawnInjection> {
    const root = this.root();
    if (!root) return { args: [], env: {} };
    this.ensureHive();

    const dir = this.agentDir(meta.id);
    if (opts.semanticMemory) this.writeMempalaceShim(opts.mempalaceBin);
    if (opts.semanticMemory) this.writeMemoryGateShim(opts.mempalaceBin);
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
    // 0.5.6: the handoff file sits beside memory.md. Seeded only when missing;
    // the agent writes it and the handoff job trims it.
    const handoff = join(dir, HANDOFF_FILE);
    if (!existsSync(handoff)) writeFileSync(handoff, handoffSeed(meta.name), 'utf8');
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
      // A (re)spawn always means a live terminal: clear any prior archived or
      // stopped flag, and a restore hold. `quickExits` stays (agentLive.ts).
      archived: false,
      stopped: false,
      sleeping: false,
      restoreHold: undefined,
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

    // Non-hive-aware providers (for example Antigravity, Codex, Grok and Pi) don't
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
    //  - codex/grok/pi take it POSITIONALLY (`codex|grok|pi "<prompt>"`) → push the
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
      // The initial message is cleared with the transcript. These private files
      // are engine instructions, so they survive both app and manual clears.
      const identity = this.sessionIdentity(meta.id);
      if (identity) {
        writeFileSync(join(dir, HIVE_IDENTITY_FILE), identity, 'utf8');
        if (meta.provider === 'cursor') preArgs.push('--plugin-dir', writeCursorIdentity(dir, identity));
      }
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
              // Auto mode keeps codex's OS sandbox (`-a never -s workspace-write`,
              // agentProvider.ts). workspace-write only covers cwd, so the agent
              // folder (inbox/.done, memory.md, outbox) and the shared hive root
              // (research deliverables, the board for god) must be extra writable
              // roots. They go into this agent's own config.toml as
              // `sandbox_workspace_write.writable_roots` (#625), NOT as --add-dir:
              // Codex exits at launch on "Ignoring --add-dir" when the sandbox is
              // read-only (auto mode off), and refuses --add-dir next to --remote.
              // The config key applies whenever the sandbox is workspace-write, from
              // a flag, a trusted project or the user's own sandbox_mode, and is
              // ignored otherwise, so no argv sniffing is needed.
              const codexRoots = this.sandboxWritableDirs(meta, dir, root, opts.extraWritableDirs ?? []);
              const codex = this.installCodexHooks(dir, meta.id, meta.cwd, codexRoots);
              env.CODEX_HOME = codex.home;
              // Codex refuses to run hooks from a config dir without persisted
              // "hook trust" (normally an interactive gate). Our hooks.json is
              // hive-authored inside an isolated CODEX_HOME, so we bypass that gate
              // for this automated spawn — the flag's documented use ("automation
              // that already vets hook sources"). Without it the hooks silently
              // never fire. Must precede the positional prompt.
              preArgs.push('--dangerously-bypass-hook-trust');
              // Only when the user's config.toml sets writable_roots itself (so
              // ours could not be written) does the old --add-dir path remain:
              // merging someone's own list is not ours to guess.
              if (!codex.rootsInConfig) for (const d of codexRoots) preArgs.push('--add-dir', d);
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
            else if (desc.shim === 'grok') {
              this.installGrokHooks();
            }
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
              this.degraded({ agentId: meta.id, name: meta.name, reason: 'proxy-bind', message: degraded });
            }
          }
        } catch (e) { console.error(`[hive] install ${desc.kind} bridge failed:`, e); }
      }
      // Inject the protocol text whichever way the CLI accepts it.
      // type-into-tui (Crush): the bare TUI reads a positional as a Cobra subcommand
      // → `Unknown command`. So DROP the positional and hand the protocol back as
      // seedPrompt; the renderer types it into the TUI after boot (ondev-b).
      // Plan F T2: a hook line that cannot run on this machine is told once, on
      // the first spawn of that provider after it was found.
      const hookNotice = meta.provider ? this.takeHookLineNotice(meta.provider) : undefined;
      if (hookNotice) {
        degraded = degraded ? `${degraded} ${hookNotice}` : hookNotice;
        this.degraded({ agentId: meta.id, name: meta.name, reason: 'hook-command', message: hookNotice });
      }
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
      // Claude Code routes an http hook through HTTP_PROXY / HTTPS_PROXY like any
      // other request, token header included. Loopback always bypasses the proxy;
      // the user's own NO_PROXY entries are kept.
      const noProxy = withLoopbackNoProxy(process.env.NO_PROXY ?? process.env.no_proxy);
      env.NO_PROXY = noProxy;
      env.no_proxy = noProxy;
      const transport = opts.hookTransport;
      const httpHook = transport?.path === 'http' ? httpHookEntry(transport.port, meta.id) : undefined;
      if (transport?.path === 'http') env[HOOK_TOKEN_ENV] = transport.token;
      // One line per spawn that fell back, so a slow floor can be explained later.
      if (transport?.path === 'command') {
        this.appendLog({ kind: 'hook-transport', agentId: meta.id, path: 'command', reason: transport.reason });
      }
      const settingsPath = join(dir, 'settings.json');
      const settings = this.hookSettings(shim, meta.cwd, opts.mcpDefaults, opts.theme, this.sandboxWritableDirs(meta, dir, root, opts.extraWritableDirs ?? []), opts.outputStyle, httpHook, opts.customMcp, opts.skillsOff);
      this.writeJson(settingsPath, settings);
      args.push('--settings', settingsPath);
      // Claude Code starts no MCP server named in a --settings file (F10, read from a running session's own list);
      // the same file given to --mcp-config does. With `=`: the spaced form also takes the words after it as files.
      if ((settings as { mcpServers?: unknown }).mcpServers) args.push(`--mcp-config=${settingsPath}`);
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
  /** Sleep keeps identity, conversation and workspace; it is never an archive. */
  setSleeping(id: string, sleeping: boolean): void {
    const root = this.root();
    if (!root) return;
    const reg = this.registry();
    const a = reg.agents[id];
    if (!a || a.sleeping === sleeping) return;
    a.sleeping = sleeping;
    if (sleeping) { a.stopped = false; a.status = 'idle'; }
    this.atomicWriteJson(join(root, 'registry.json'), reg);
    this.appendLog({ kind: 'agent-sleep', agentId: id, sleeping });
  }
  private demandWake: ((id: string) => void) | null = null;
  setDemandWake(wake: (id: string) => void): void { this.demandWake = wake; }

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
   * Mark an agent stopped (no terminal, nobody chose it) or not, and optionally
   * hold it back from the next automatic restore. Same contract as setArchived:
   * best effort, never throws. See src/shared/agentLive.ts.
   */
  setStopped(id: string, stopped: boolean, hold?: RestoreHold): void {
    const root = this.root();
    if (!root) return;
    try {
      const reg = this.registry();
      const agent = reg.agents[id];
      if (!agent) return;
      if (!!agent.stopped === stopped && (hold === undefined || agent.restoreHold === hold)) return;
      agent.stopped = stopped;
      if (hold !== undefined) agent.restoreHold = hold;
      agent.lastSeen = Date.now();
      this.atomicWriteJson(join(root, 'registry.json'), reg);
      this.appendLog({ kind: 'stopped', agentId: id, stopped, ...(hold ? { hold } : {}) });
      this.commit(`hive: ${stopped ? 'stopped' : 'unstopped'} ${id}`);
    } catch { /* best-effort — never crash a lifecycle handler */ }
  }

  /**
   * Count a run that ended on its own, and hold the agent back from the next
   * automatic restore once QUICK_EXITS_TO_HOLD short runs come in a row (a
   * crash loop). `null` clears the count (a person's Stop, or a run that has
   * lasted). Returns whether the agent is now held.
   */
  noteEndedOnItsOwn(id: string, ranMs: number | null): boolean {
    const root = this.root();
    if (!root) return false;
    try {
      const reg = this.registry();
      const agent = reg.agents[id];
      if (!agent) return false;
      const next = ranMs === null ? 0 : nextQuickExits(agent.quickExits, ranMs);
      const hold = holdsRestore(next);
      if ((agent.quickExits ?? 0) === next && (!hold || agent.restoreHold === 'crash-loop')) return hold;
      agent.quickExits = next;
      if (hold) agent.restoreHold = 'crash-loop';
      this.atomicWriteJson(join(root, 'registry.json'), reg);
      if (hold) this.appendLog({ kind: 'restore-hold', agentId: id, hold: 'crash-loop', quickExits: next });
      return hold;
    } catch { return false; }
  }

  /**
   * The one time move of 0.5.7 archived flags to the 0.5.8 meaning (see
   * sweptByOldStartup). `endedIn057` is what 0.5.7's restore-gate.json held;
   * `onFloor` is the cards on the floor in roster.json (floorCardIds).
   * Runs once per registry, before the startup marks stopped agents. Returns how
   * many agents moved; 0 on a registry already moved.
   */
  migrateArchivedMeaning(endedIn057: readonly string[], onFloor: readonly string[] = []): number {
    const root = this.root();
    if (!root) return 0;
    try {
      const reg = this.registry();
      if (reg.archivedMeaning === 'person') return 0;
      const ids = sweptByOldStartup(reg.agents, reg.godId, endedIn057, onFloor);
      for (const id of ids) { reg.agents[id].archived = false; reg.agents[id].stopped = true; }
      reg.archivedMeaning = 'person';
      this.atomicWriteJson(join(root, 'registry.json'), reg);
      this.appendLog({ kind: 'archived-meaning-migrated', stopped: ids.length });
      this.commit(`hive: ${ids.length} swept agent(s) marked stopped, not archived (0.5.8)`);
      return ids.length;
    } catch { return 0; }
  }

  /**
   * Move every unread message in an agent's inbox to inbox/.done — the agent has
   * finished with the whole mailbox (an ephemeral worker that signaled done), so
   * nothing left in it is pending any more. Workers rarely file their own work
   * order before signaling done, and a worker id is reused on every re-hire of
   * the same name (`worker-<request name>`), so without this each new incarnation
   * boots into its predecessors' stale orders: it is told to "work everything
   * still pending", spends its first turns re-triaging tasks its memory says are
   * finished, and the inbox-wake watchdog reads the oldest of those as mail that
   * has been unanswered for days.
   *
   * Only mail that was already there when the worker signaled done is finished
   * with: `before` is that signal's timestamp, and a message created after it
   * (a follow-up question from god that crossed the worker's done) is left in
   * place, still pending, for whoever picks the mailbox up next. Without the
   * cut-off such a message was filed as read and nobody ever saw it. Messages
   * whose `created_at` is unreadable fall back to the file's mtime.
   *
   * Returns what happened — how many were filed, how many were kept, and the
   * filed messages that asked for something (`request` / `query`), so the
   * caller can tell their sender that no answer is coming. Best-effort — never
   * throws, so the release path that calls it can't be crashed by a
   * half-written file.
   *
   * `only` (0.5.6) narrows it to the named message ids: the app files the
   * mail a wake printed in full when that turn ends (main/wakeFiling.ts), and
   * everything else in the inbox is left where it is.
   */
  settleInbox(id: string, before = Number.POSITIVE_INFINITY, only?: ReadonlySet<string>): SettledInbox {
    const out: SettledInbox = { moved: 0, kept: 0, unanswered: [] };
    const root = this.root();
    if (!root) return out;
    const inbox = join(root, 'agents', id, 'inbox');
    if (!existsSync(inbox)) return out;
    let files: string[];
    try { files = readdirSync(inbox).filter((f) => f.endsWith('.json')); } catch { return out; }
    if (files.length === 0) return out;
    const done = join(inbox, '.done');
    try { mkdirSync(done, { recursive: true }); } catch { return out; }
    for (const f of files) {
      // An inbox file is `<message id>.json` (deliver).
      if (only && !only.has(f.slice(0, -'.json'.length))) continue;
      const fp = join(inbox, f);
      let msg: Partial<HiveMessage> = {};
      try { msg = JSON.parse(readFileSync(fp, 'utf8')) as Partial<HiveMessage>; } catch { /* half-written: file it by mtime */ }
      let at = Date.parse(msg.created_at ?? '');
      if (!Number.isFinite(at)) { try { at = statSync(fp).mtimeMs; } catch { at = 0; } }
      if (at > before) { out.kept++; continue; }
      // A rename that fails (EPERM on a file another process holds) leaves the
      // message where it was — still pending, exactly the pre-settle state.
      try { renameSync(fp, join(done, f)); out.moved++; } catch { continue; }
      if (msg.act === 'request' || msg.act === 'query') {
        out.unanswered.push({
          id: msg.id ?? f, act: msg.act, from: msg.from ?? 'unknown', subject: msg.subject ?? '',
          conversation: msg.conversation ?? ''
        });
      }
    }
    if (out.moved > 0) {
      try {
        this.appendLog({ kind: 'inbox-settled', agentId: id, count: out.moved, ...(only ? { why: 'turn-end' } : {}) });
        this.commit(only ? `hive: file ${out.moved} message(s) of ${id} at its turn end` : `hive: settle inbox of ${id} (${out.moved} unread)`);
      } catch { /* best-effort */ }
    }
    return out;
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
      // agent screen or the menu reaches every surface
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
      // Own entries only: the id comes from a hook payload, and '__proto__' must not reach Object.prototype.
      const agent = Object.hasOwn(reg.agents, agentId) ? reg.agents[agentId] : undefined;
      if (!agent || agent.sessionId === sessionId) return; // unknown agent or unchanged → no write
      // Never a key the agent's engine refuses on sight (a Claude child's hook under an OpenCode agent).
      if (!sessionIdFits(agent.provider, sessionId)) return;
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
    return resumableCandidates(pushSessionHistory(agent.sessionHistory, agent.sessionId), agent.refusedSessions);
  }

  /** Whether the CLI already refused to reopen this session for this agent. */
  isRefusedSession(agentId: string, sessionId: string): boolean {
    return !!sessionId && (this.registry().agents[agentId]?.refusedSessions ?? []).includes(sessionId);
  }

  /**
   * The CLI refused to reopen this session (shared/resumeRetry.ts): never offer
   * it to a restart again, so the next wake, restart or restore starts fresh or
   * resumes a session that still opens, instead of the same refusal. Best
   * effort, never throws.
   */
  refuseSession(agentId: string, sessionId: string): void {
    const root = this.root();
    if (!root || !sessionId) return;
    try {
      const reg = this.registry();
      const agent = Object.hasOwn(reg.agents, agentId) ? reg.agents[agentId] : undefined;
      if (!agent || agent.refusedSessions?.[0] === sessionId) return;
      agent.refusedSessions = pushRefusedSession(agent.refusedSessions, sessionId);
      this.atomicWriteJson(join(root, 'registry.json'), reg);
      this.appendLog({ kind: 'session-refused', agentId, sessionId });
    } catch { /* best-effort */ }
  }

  /** Claude Code settings that route every relevant hook through the shim, plus
   *  (W3) the default MCP bundle merged into this PER-SESSION settings file. cwd
   *  scopes the filesystem/git servers; cfg (the consent map) gates which servers
   *  are written. Claude-only — this is invoked solely on the Claude spawn path. */
  /**
   * Directories a sandboxed agent may write: its assigned project cwd first
   * (#449: once `sandbox.filesystem.allowWrite` is present it is the whole
   * answer, so leaving cwd out made git, builds and rm inside the project fail
   * with EPERM), then its own agent folder (hive housekeeping) and the hive root
   * (research deliverables; the board and tasks.json for god; outbox delivery is
   * done by main, not the agent). This is what lets auto mode keep the OS
   * sandbox on: the old full-bypass posture existed only because these paths
   * sit outside the project cwd.
   */
  private sandboxWritableDirs(meta: AgentMeta, dir: string, root: string, extra?: string[]): string[] {
    // A git work tree keeps its index, HEAD and FETCH_HEAD under <store>/.git/worktrees/<name>, and the
    // objects and refs under <store>/.git, outside its own folder: without them a sandboxed agent can
    // neither fetch nor commit. Only those, never hooks/ or config.
    const out = [meta.cwd, ...gitWorkTreeWritableDirs(meta.cwd), dir, root, ...(extra ?? [])].filter((d): d is string => typeof d === 'string' && d.length > 0);
    return Array.from(new Set(out));
  }

  private hookSettings(shim: string, cwd: string, cfg: McpDefaultsMap, theme?: 'light' | 'dark', writableDirs: string[] = [], outputStyle?: string, httpHook?: Record<string, unknown>, customMcp?: AgentCustomMcpServer[], skillsOff?: string[]): unknown {
    // Bundled node, NOT bare `node` — see nodeLauncherPath(). Claude runs each of
    // these through `sh -c` with a stripped PATH, where `node` is often absent.
    //
    // Claude Code on Windows runs command hooks through Git Bash, not cmd.exe, so
    // neither Windows shape the other providers use works here: the unquoted
    // short path loses every backslash to bash, and the quoted hive-node.cmd
    // form makes bash hop through cmd.exe, whose /c "A" "B" quote stripping
    // splits at the space in "Munder Difflin". A bash hosted hook gets a bash
    // shaped command (nodeRunSh): the POSIX launcher, forward slashes, double
    // quotes. Since 0.5.5 (#175) most events go over HTTP, but SessionStart and
    // statusLine still run this command.
    const cmd = process.platform === 'win32' ? this.nodeRunSh(shim) : this.nodeRun(shim);
    // 0.5.5 perf, item 6: with an http entry every event that allows one POSTs to
    // the HookServer with no process start. `commandOnly` is for the events Claude
    // Code runs only as commands (SessionStart; statusLine is built below).
    const entry = (matcher?: string, commandOnly = false) => ({
      ...(matcher ? { matcher } : {}),
      hooks: [httpHook && !commandOnly ? httpHook : { type: 'command', command: cmd }]
    });
    const mcpServers = this.buildDefaultMcpServers(cwd, cfg, customMcp);
    const hookHost = httpHookHost(httpHook);
    // 0.5.6: skills a person turned off for THIS agent (shared/agentSkills.ts).
    // Deny rules hold in every permission mode and add to the person's own
    // rules; the overrides keep the skill out of the agent's list. Nothing at
    // all is written when no skill is off.
    const off = skillsOffSettings(skillsOff ?? []);
    // The app's data folder: config.json with the add switch, the secrets and the person's add log,
    // out of reach of the agent's own Write and Edit tools in every mode, bypass included, as the sandbox keeps
    // it out of reach of its shell (Creed's reads of 23841c0a and 97943d00).
    const deny = [...off.deny, ...userDataDeny([cwd, ...writableDirs])];
    const permissions = {
      ...(writableDirs.length ? { additionalDirectories: writableDirs } : {}),
      ...(deny.length ? { deny } : {})
    };
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
      // `network.allowedDomains` (0.5.6, #674): in Claude Code's own `auto`
      // permission mode the sandbox proxy also carries the http hooks, and it
      // answers 403 for a host that is not listed, so every hook failed. Only
      // the hook listener's host and port are listed, and only on the http path.
      // `allowLocalBinding` (F11, F26): on this computer a shell reaches the app's own ports directly, the
      // broker, the gateway, md-limits and the Slack helper. Listing a port does not do it, tried on 2.1.316:
      // curl and node skip the proxy for 127.0.0.1 and the sandbox refuses them.
      ...(writableDirs.length
        ? {
            sandbox: {
              enabled: true,
              filesystem: { allowWrite: writableDirs },
              network: { allowLocalBinding: true, ...(hookHost ? { allowedDomains: [hookHost] } : {}) }
            }
          }
        : {}),
      ...(Object.keys(permissions).length ? { permissions } : {}),
      ...(off.deny.length ? { skillOverrides: off.skillOverrides } : {}),
      hooks: {
        Stop: [entry()],
        SubagentStop: [entry()],
        PreToolUse: [entry('*')],
        PostToolUse: [entry('*')],
        UserPromptSubmit: [httpHook ? { hooks: [{ ...httpHook, timeout: PROMPT_HOOK_TIMEOUT_S }] } : entry()],
        Notification: [entry()],
        SessionStart: [entry(undefined, true)],
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
    cfg: McpDefaultsMap,
    custom?: AgentCustomMcpServer[]
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
      // No `env`. The catalog's env block is the NAMES of the secrets a
      // server reads, each with an empty value; written here it would hand
      // the server an empty key over the one the agent's own environment
      // holds. The server reads the agent's environment, as a custom one does.
      out[`munder-${e.id}`] = { command: e.spec.command, args };
    }
    // 0.5.6, the agent file: this agent's own servers from outside the catalog.
    // Each came in a file and runs a command here, so the bar is the one a
    // write or secret server has: the literal `enabled: true`, never a default.
    // Checked again on the way in (a hand edited config), and written under a
    // key no catalog server can have. No `env`: the server reads the agent's.
    for (const raw of custom ?? []) {
      const server = cleanCustomMcp(raw);
      if (!server || server.enabled !== true) continue;
      out[customMcpKey(server.name)] = customMcpSpec(server, cwd);
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

  // — agent-facing text —

  /** True, and stamped, when this memory.md notice has not been given in the
   *  last day. */
  private memoryNoticeDue(key: string): boolean {
    const now = Date.now();
    if (!noticeDue(this.memoryNoticeAt.get(key), now)) return false;
    this.memoryNoticeAt.set(key, now);
    return true;
  }

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

  /** Stable identity for reply-bearing engine hooks. */
  sessionIdentity(agentId: string): string | null {
    const root = this.root();
    const meta = this.registry().agents[agentId];
    if (!root || !meta || isHiveAwareProvider(meta.provider) || meta.provider === 'custom') return null;
    return agentIdentity(meta, this.agentDir(agentId), root);
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
    const wordsLine = 'WORDS: an "agent" is a member of this office with a lasting session. A "temp" is a short lived agent the orchestrator or an agent starts for one job; it does the job, reports done, and is torn down. The orchestrator\'s address is "god".';

    const guardrailsLine = 'GUARDRAILS: a circuit breaker watches the floor. A "Circuit breaker: steer" or "constrain" message means you are looping or overspending: stop repeating, summarize what you tried, and follow it. Be token frugal; a floor wide or per agent budget can pause you. The shared plan has two parts: board.md (freeform; god is its only writer) and tasks.json (a kanban: todo, doing, blocked, done).';

    const memoryLine = semanticMemory
      // The palace location is named, not spelled as `$MEMPALACE_PALACE_PATH`:
      // `mempalace` reads that env var itself, and the POSIX `$` form was noise
      // (or an empty expansion) for a Windows agent that tried to use it literally.
      // 0.5.6: `md-memory`, not `mempalace`: it runs one MemPalace at a time on
      // the machine (memoryGate.ts), so a burst of searches cannot fill memory.
      ? 'SEMANTIC MEMORY: the office shares a searchable MemPalace at the path in your MEMPALACE_PALACE_PATH environment variable. Run `md-memory search "<query>"` when you need to recall what the team knows; not as a routine at the start of every task. It runs one search at a time on this machine, so use it rather than `mempalace` itself; if it says MemPalace is busy, carry on without it. Your memory.md is mined into it automatically, so write durable facts there.'
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
    // 0.5.6 (founder, 16 Oct 2026): env is fixed at start, so a key saved in
    // Settings later reaches a running agent only through md-secret.cjs.
    const secretCmd = this._secretHelperPath ? `"${hiveNode}" "${this._secretHelperPath}"` : '';
    const secretsSentence = secretCmd
      ? ` A key or secret saved in Settings works at once, with no restart: \`${secretCmd} list\` names them, and \`${secretCmd} run NAME -- <command>\` runs the command with NAME set in its environment. Never print a key.`
      : '';
    const capabilitiesLine = `CAPABILITIES: your skills are in ${inDir('.claude', 'skills')}. Read ${inDir('.claude', 'skills', 'capabilities', 'SKILL.md')} once (or run /capabilities): it lists what you can do and how to call it. The date skills (/today, /lastWeek, /last30Days, /lastQuarter and more) resolve any time window; use them for time scoped work instead of computing dates by hand. \`md-models\` lists the engines and their models, and which are installed and signed in here; run it before you name a provider or a model. Integrations go through the loopback broker: MD_BROKER_URL and MD_BROKER_TOKEN are in your environment; the port changes when the app restarts, so if a call is refused load the current url and token from $AGENT_DIR/.broker into variables, never printing them: what a command prints stays in your transcript. Without either, ask god.${secretsSentence}`;
    // 0.5.8: what is live for this agent at its start, never a key (shared/integrationList.ts).
    let integrationsLine = '';
    if (this._integrationsNow) {
      try { integrationsLine = integrationsBriefLine(this._integrationsNow(meta.id)); } catch { integrationsLine = ''; }
    }
    const automationsLine = 'AUTOMATIONS: "scheduled mission", "schedule", "automation", "cron job", "recurring task" and similar words all mean the app\'s Triggers section. Schedules and webhooks live there, never in a system cron or a CLI scheduler, and each one starts the moment it is saved and switched on, with no restart.';
    // Item 13: state the build, so anything that differs between a packaged app
    // and a local dev run (umask being the one that bit us) is visible.
    const runtimeLine = rt
      ? `RUNNING BUILD: Munder Difflin v${rt.version}, ${rt.packaged ? 'packaged app' : 'local dev build'}${rt.appPath ? `, from ${rt.appPath}` : ''}. Say this version when asked which one is running; do not assume behaviour from an older one. A local dev build inherits the launching shell's environment (umask included) and a packaged app does not, so file modes and env can differ. log.jsonl records an app-start event on every launch; that is how you spot a restart or a build switch. What this version changed for you: ${inDir('.claude', 'skills', 'whats-new', 'SKILL.md')}; read it when asked what is new or when something seems unfamiliar.`
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
      '8. ASKING THE HUMAN: when a card can move only with the human (a question, or an action only they can do: create an account, approve a spend, hand over credentials, test on their device), set the card "blocked" and push {"q":"...","askedAt":"<iso>","from":"<agent id>"} onto its "humanQA" array, where "from" is the agent whose question it is (leave it out for your own, floor wide question); keep every past entry. Write the ask short, in markdown, under about 700 characters: one **bold** sentence saying what you need, `backticks` for paths and values, one "-" bullet or "1." line per option, a blank line between paragraphs. When the ask is a choice, put the choices in "options": [{"label":"...","detail":"..."}] (at most 8; "detail" optional) instead of bullets in "q", add "recommended": <the index, counting from 0, of the one you advise> and "multi": true only if several may be picked; the answer still arrives as text in "a", and "chosen" lists the indexes picked, counting from 0. Rewrite an agent\'s report into that shape; never paste it. The ask shows on the ASK ME board; the answer lands in the same entry as "a" and goes to the agent the ask belongs to ("from", else the card\'s assignee), which acts on it and unblocks the card; it reaches your inbox for your own floor wide question, or when that agent is no longer on the floor: then act on it and unblock the card. Never park questions in files and never sit waiting for a reply.',
      '9. STEWARD THE TOKEN BUDGET.'
    ] : [];
    // Item 11, redone for 0.4.11: the spawn mechanism is ALWAYS stated to god,
    // switch or not, because the switch is read at his spawn and a later flip
    // never reached a running prompt. The switch itself is explained instead.
    // A new install has no project folder, and the orchestrator's
    // first prompt stopped there. It makes one in the hive.
    const projectsLine = meta.isGod
      ? `PROJECT FOLDERS: a new install has no project folder, and that never stops you. When the work has no folder yet, make one under ${inRoot('projects')}: \`mkdir -p ${inRoot('projects')}/<short-name>\`, then name that folder in the "cwd" of the temp or the lasting agent you start for it. Any folder under ${inRoot('projects')} is accepted, and made when it is not there. Do not ask the human to add a project first.`
      : '';
    const tempCwdWords = `; on this computer a folder under ${inRoot('projects')} is made for it when it is not there, and a temp that names none while this computer has no project folder works in ${inRoot('projects')}/<its id>`;
    const spawnLines = meta.isGod ? [
      ...(projectsLine ? [projectsLine] : []),
      `STARTING A TEMP: write ONE JSON file into ${inRoot('spawn-requests')}/<id>.json with "objective" (the job) and "cwd" (the repo it runs in${tempCwdWords}). Optional: "cloneOf" (an agent id: the temp is a copy of that agent, on its branch, with its engine, skills and connections, and it reads that agent's Rules; you cannot be cloned), "name", "command" (overrides the provider default), "provider" (picks its CLI when "command" is omitted), "model", "isolate" (default true: its own git worktree), "tokenCap", "slack" ({channel, thread_ts}: its replies and failures go to that thread), "character" and "accent" (its look on the floor). The harness starts the temp with id worker-<id>, files the request under spawn-requests/.done/ when it starts or .failed/ with a reason, briefs it with the objective, the memory index and its capabilities, and tears it down when it reports done. A temp is for one job.`,
      'THE SWITCH: the human allows temps under Settings, Autonomy & Budgets (on by default; they can turn it off) and caps how many run at once. While it is off your request is neither failed nor deleted: it waits in spawn-requests/ and runs when the switch is turned on. A request that has not moved means the switch is off; raise it with the human instead of retrying.',
      'WHEN THE HUMAN ASKS FOR TEMPS OR WORKERS ("use temps", "spin up workers", "get two workers on this"), that is the request: start them with STARTING A TEMP above, one request per temp, and tell the human which you started. Do not do the work yourself instead, and do not start them any other way.',
      'LIVE ROSTER: you receive the live roster on every turn. Each row carries ctx NN%, that agent\'s context window occupancy. Prefer a low ctx agent for a big task; treat a near full one as busy even if its token count looks small.',
      'USAGE LIMITS: the live roster ends with a [LIMITS] line, each engine\'s use of the windows it reports, as last seen. Run `md-limits` for the resets and detail before a big dispatch and before starting temps; it reads what the app keeps and costs nothing. When an agent\'s engine is NEAR LIMIT, give the work to an agent on another engine or hold it until the reset, and start no temp on that engine.',
      `COMPACTING AN AGENT: when an agent's ctx is 30% or more, write ONE JSON file ${inRoot('compact-requests')}/<agent id>.json with "agent" (its id) and "reason". The app types that agent's own compact at its next idle prompt; nothing is wiped. Yourself included, at most once per agent in 10 minutes. An accepted request moves to compact-requests/.done/, a refused one to compact-requests/.failed/ with an "error" saying why. Clearing, below, is for when compacting has not helped.`,
      `CLEARING AN AGENT, your last resort: when an agent's ctx stays near full after it has compacted and its work suffers, or the human asks you to, write ONE JSON file ${inRoot('clear-requests')}/<agent id>.json with "agent" (its id) and "reason". The app asks that agent to hand off, clears its context at its next idle moment, and keeps what it knew in last-session.md in its folder. Never for yourself, at most once per agent in 30 minutes. An accepted request moves to clear-requests/.done/, a refused one to clear-requests/.failed/ with an "error" saying why.`
    ] : [];
    const roleLine = meta.isGod
      ? ''
      : meta.isAssistant
        ? `You are ${godNameForPrompt}'s PREP ASSISTANT. You receive short, possibly vague instructions, each starting with "ENRICH TASK:". For each: (1) work out which project it concerns and cd into that repo (you start in ${godNameForPrompt}'s home directory); (2) gather concrete context READ ONLY (exact paths, current state, relevant code, conventions, active branch, gotchas); never modify, create or delete files; (3) rewrite the instruction into ONE clear, self contained prompt ${godNameForPrompt} can run autonomously, keeping the original intent and inventing no scope. Deliver it as ONE outbox message with "to":"god", "act":"request", a short subject, and the prompt as the body. Do not do the task yourself.`
        : meta.role === 'temp'
          ? 'YOU ARE A TEMP: one job, then done. Your dispatch carries the job, the memory index and your reply rules. When finished send ONE outbox message with "act":"done" and a short result to whoever sent the dispatch (god unless it names another); that releases you. Do not push to any remote; the sender merges your branch.'
          : 'For anything ambiguous, cross cutting, or needing sign off, message "god".';
    // 0.5.6: any lasting agent may start a temp from its own folder. One line,
    // because every agent pays for it in every session. Not the orchestrator
    // (STARTING A TEMP above is its own), not the prep assistant (it creates
    // no files) and never a temp: a temp cannot start a temp.
    const ownTempLine = meta.isGod || meta.isAssistant || meta.role === 'temp'
      ? ''
      : `TEMPS: for a side job you may start a temp: write ONE JSON file into ${inDir('spawn-requests')}/<id>.json with "objective" and "cwd" (the repo); optional "cloneOf" (an agent id; your own id makes a copy of you). It gets its own git worktree, reports done to you and leaves its work on a branch the report names; you merge it. The human caps how many you run at once; extra requests wait.`;
    const slackLine = meta.isGod
      ? 'SLACK: requests can arrive from Slack. Integrations, Slack sets who answers. Default: each request comes to you first; hand it to the right agent or start a temp. The human can instead choose an agent, or a temp (plain, or a clone of an agent): then a temp takes each request at once (the harness starts it, switch or not) and you receive one inform per request; do not redo that work, step in only when it fails. If no temp slot frees in 2 minutes the request comes to you. A Slack reply, and the "result" of a Slack origin kanban card (posted to the thread verbatim when the card is done), must answer what was asked with the specifics, in Slack mrkdwn: a short *bold* headline, bullets for several items, `backticks` for code and paths, no walls of text, never a bare "done".'
      : `SLACK: when god dispatches you a task that came from Slack, the dispatch includes an exact reply command ("${hiveNode}" "<helper>" --channel ... --thread ... --text "..."). When you finish, run it verbatim to post your result to that thread: a short *bold* headline plus the outcome, specifics and links, never a bare "done". A message that opens with [SLACK MESSAGE FOR YOU] was sent to you, not to god: do it yourself and answer with the command it carries. The same helper with --user <Slack user id> --text "..." in place of the channel and the thread sends one person a direct message.`;
    // 0.5.5, Plan D Part 3: the Rules region and the two archive files. Two
    // notices, each at most once a day: the Rules list is over its limit, or
    // the pinned notes are over theirs in a file with no Rules heading (ruling
    // 3.11: nothing moves until the agent sorts its rules out of them; this
    // notice is the one time sorting).
    // 0.5.6: rule 5 of the protocol. The archive file is an index now, not a
    // summary, and the line says so because agents learned the old shape.
    const memoryShapeLine = `5. Durable facts go to memory.md, rules under "${RULES_HEADING}". When notes pass the cap the oldest move word for word to ${RAW_ARCHIVE_BASE}*.md; ${archiveFileName()} indexes what moved.`;
    let memoryText = '';
    try { memoryText = readFileSync(inDir('memory.md'), 'utf8'); } catch { memoryText = ''; }
    const rulesTooLong = rulesOverLimit(memoryText) && this.memoryNoticeDue(`${meta.id}:rules`);
    const needsSort = pinnedNeedsSort(memoryText) && this.memoryNoticeDue(`${meta.id}:sort`);
    const needsSortLine = `SORT YOUR PINNED NOTES: the pinned notes in your memory.md are over ${Math.round(PINNED_NOTES_CAP_BYTES / 1024)} KB, and none of them moves to the archive until the file has a "${RULES_HEADING}" heading. This task, add that heading above your pinned notes and move every rule under it, word for word. A line is a rule when it says what to do or never do, and breaking it causes harm that is hard to undo or goes against the person's word; in doubt it is a rule. Leave everything else as pinned notes; the oldest of those then move to the archive.`;
    // 0.5.6: the whole sections of a file with no Rules heading wait as the
    // pinned notes do (reflect.ts, sectionsNeedSort). When they are what
    // waits, the same notice is given in their words, on the same daily key.
    const sectionsWait = !pinnedNeedsSort(memoryText) && sectionsNeedSort(memoryText) && this.memoryNoticeDue(`${meta.id}:sort`);
    const sectionsWaitLine = `SORT YOUR PINNED NOTES: the sections of your memory.md are over their limit, and no whole section moves to the archive until the file has a "${RULES_HEADING}" heading. This task, add that heading above your first section and move every rule under it, word for word. A line is a rule when it says what to do or never do, and breaking it causes harm that is hard to undo or goes against the person's word; in doubt it is a rule. Leave everything else where it is; the oldest sections then move to the archive.`;
    const rulesTooLongLine = `YOUR RULES LIST IS TOO LONG: the "${RULES_HEADING}" part of your memory.md is over ${Math.round(RULES_CAP_BYTES / 1024)} KB. Trim it this task: keep only what you must always or never do, and move the rest into your pinned notes.`;
    return [
      `You are "${meta.name}" (${meta.id}), an autonomous agent in a collaborating office of AI agents.`,
      `Your private workspace is ${dir}. The shared hive is ${root}. Full protocol: ${inRoot('PROTOCOL.md')}.`,
      wordsLine,
      'HIVE PROTOCOL, follow it every task:',
      // 0.5.6: five rules in the space of the old four and the MEMORY SHAPE
      // line (a test holds the length). The start reads the handoff file and
      // Rules, never the whole memory.md; the wake carries the mail; a message
      // carries a work id; a note is information only.
      `1. START of a session and after a clear: read your ${HANDOFF_FILE} and the Rules part of your memory.md (no Rules heading yet: read memory.md once and move its rules under one). Search the rest with \`md-memory search\` or open the one section you need. Never read all of memory.md.`,
      '2. The wake prints your new messages and the app files them when your turn ends. Open an inbox file only when the wake gives a path.',
      `3. To message an agent, write ONE JSON file into ${inDir('outbox')} (schema in PROTOCOL.md), NEVER into another agent's folder. Put the work id (card, pull request or name) in "work". "act":"note" is information only, never a person's request. Never send a message that only acknowledges or thanks.`,
      `4. ${HANDOFF_FILE}: a section per piece of work: \`## <work id> | <title>\`, a \`_touched: <ISO time>_\` line, then State, Next, Files, Open. Update the section for your current work before you stop and when the app asks you to hand off. The app keeps the newest ${HANDOFF_MAX_SECTIONS}.`,
      memoryShapeLine,
      ...(rulesTooLong ? [rulesTooLongLine] : []),
      ...(needsSort ? [needsSortLine] : []),
      ...(sectionsWait ? [sectionsWaitLine] : []),
      guardrailsLine,
      memoryLine,
      sharedMemoryLine,
      knowledgeLine,
      capabilitiesLine,
      integrationsLine,
      automationsLine,
      ...godLines,
      ...spawnLines,
      roleLine,
      ownTempLine,
      runtimeLine,
      'CONTACTING THE USER: email, Slack direct messages, Telegram and other external channels are opt in. Contact the user there only if they explicitly chose that channel in onboarding or asked you to use it. A connected integration, saved credential, account email or known address is not consent. Without an explicit choice or request, keep updates and questions in the app. Reply to an incoming request in its originating channel and thread; that request does not authorize unrelated messages, another channel or recurring updates. Carry these limits into every task you delegate.',
      slackLine,
      `CONNECTIONS: to add or change an inbound webhook, a scheduled mission (Automations), Slack or the default agents yourself, write a request file as ${inRoot('connections', 'README.md')} explains; never edit config files.`,
      `Env vars available to you: AGENT_ID, AGENT_NAME, HIVE_ROOT, AGENT_DIR.`
    ].filter(Boolean).join('\n');
  }

  // — messaging —

  /** Normalize a partial message into a full HiveMessage.
   *
   *  The id becomes the inbox filename. On the agent outbox path the harness
   *  OWNS it (`harnessId`, public #566): outbox JSON is agent authored, and a
   *  sender id used to flow straight into deliver(), so a duplicate id
   *  overwrote earlier mail, a path like id quarantined it unlogged, and `../`
   *  wrote outside the hive. Other callers (the UI) keep their id when it is a plain name; an unsafe
   *  one is replaced, never used as a path. */
  private normalize(partial: Partial<HiveMessage>, from: string, opts: { harnessId?: boolean } = {}): HiveMessage {
    const act = (partial.act ?? 'inform') as MessageAct;
    return {
      id: !opts.harnessId && isSafeMessageId(partial.id) ? partial.id : `${stamp()}-${shortRand()}`,
      conversation: partial.conversation ?? `conv-${shortRand()}`,
      in_reply_to: partial.in_reply_to ?? null,
      from: partial.from ?? from,
      to: partial.to ?? 'god',
      act,
      subject: partial.subject ?? '',
      body: partial.body ?? '',
      // hops is harness owned (public #563). An agent written value is only a
      // carried count: clamp it to 0..HOP_CAP so an echoed relay keeps
      // climbing toward the cap while a copied forward `hops: 13` cannot read
      // as a runaway loop. Only a harness bounce moves it (bounceToGod).
      hops: Math.max(0, Math.min(typeof partial.hops === 'number' && Number.isFinite(partial.hops) ? Math.floor(partial.hops) : 0, HOP_CAP)),
      // A note (0.5.6) never asks for a reply, whatever its sender wrote.
      requires_reply: act === 'note' ? false : partial.requires_reply ?? ['request', 'query', 'propose'].includes(act),
      needs_human: partial.needs_human ?? false,
      // Kept only when it reads as a time, and written back as ISO so the
      // floor's newest first sort (string order) holds. An agent that writes
      // "", "now" or a local time string gets the routing time instead: a bad
      // created_at blanked the orchestrator screen (PR 856).
      created_at: isoTimeOrNull(partial.created_at) ?? new Date().toISOString(),
      // The optional work id (0.5.6), kept as one short line or not at all.
      ...(cleanWorkId(partial.work) ? { work: cleanWorkId(partial.work) } : {})
    };
  }

  /** Atomically deliver a message into a recipient agent's inbox.
   *  Returns false when the recipient has no inbox, so the caller can bounce and
   *  log the drop rather than let the message vanish. */
  private deliver(msg: HiveMessage, toId: string): boolean {
    const inbox = join(this.agentDir(toId), 'inbox');
    if (!existsSync(inbox)) {
      if (!this.demandWake || !this.registry().agents[toId]) return false;
      mkdirSync(inbox, { recursive: true });
    }
    // normalize() guarantees this; the check keeps any future caller from
    // turning an id into a path.
    if (!isSafeMessageId(msg.id)) throw new Error(`hive: refusing an unsafe message id ${JSON.stringify(msg.id)}`);
    this.atomicWriteJson(join(inbox, `${msg.id}.json`), msg);
    try { if (!isTempAgentId(toId) && this.registry().agents[toId]?.role !== 'temp') this.demandWake?.(toId); } catch { /* mail is durable; the demand beat retries */ }
    return true;
  }

  /** One harness bounce of `msg` to god: bump the hop counter, rewrite the
   *  subject, and drop with a hop-cap log once the counter passes HOP_CAP.
   *  Agents cannot move hops past the cap (normalize clamps what they wrote),
   *  so this fuse fires only on a real relay loop, a bounced mail that keeps
   *  coming back undeliverable (public #563). */
  private bounceToGod(msg: HiveMessage, godId: string, subject: string): void {
    const hops = msg.hops + 1;
    if (hops > HOP_CAP) {
      // loop guard — drop a runaway message rather than let agents ping-pong.
      // There's no human queue to fall back on; the god agent owns conflicts.
      this.appendLog({ kind: 'drop', reason: 'hop-cap', from: msg.from, to: msg.to, id: msg.id });
      return;
    }
    this.deliver({ ...msg, hops, to: godId, subject }, godId);
  }

  /** Inject a message directly (used by the orchestrator / UI / tests). */
  send(partial: Partial<HiveMessage>, from = 'system'): HiveMessage {
    const msg = this.normalize(partial, from);
    this.routeMessage(msg);
    this.commit(`hive: msg ${msg.from}→${msg.to} (${msg.act})`);
    return msg;
  }

  private routeMessage(msg: HiveMessage): void {
    const reg = this.registry();
    const godId = reg.godId ?? 'god';
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
    if (msg.to === 'broadcast') {
      const skipped = heldBroadcastSkips(reg.agents, msg.from);
      if (skipped.length) this.appendLog({ kind: 'broadcast-skip-held', id: msg.id, skipped });
    }
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
        this.bounceToGod(msg, godId, `[bounced — "${t}" is the send-only prep assistant; route work to a real agent] ${msg.subject}`);
        continue;
      }
      // An ARCHIVED recipient (its terminal is gone) still has an inbox, so the
      // mail lands there, reads as delivered and stays unread. Filing it is
      // right: a worker re-hired under the same id reads it on its first turn.
      // But the sender learned nothing, so god kept mailing dead agents for
      // hours. Mail that expects an answer is now filed AND its sender told at
      // once that no one is there; inform only mail is filed quietly. Before
      // the provider branches on purpose: with no terminal there is nothing to
      // hand a work order to. The notice is ROUTED, so a hookless sender gets
      // it the way it gets any mail; it never asks for a reply, so no loop
      // (public #512).
      // A stopped agent (0.5.8, shared/agentLive.ts) has no terminal either.
      const target = reg.agents[t];
      const demandDelivery = !!this.demandWake && !!target && !isTempAgentId(t) && target.role !== 'temp';
      // F27: so does a row that reads live with no terminal. Its mail waited
      // and its sender, seeing a live row, waited for an answer.
      const noSession = t !== godId && !!target && isLive(target) && this.hasNoSession(t, target);
      if (!demandDelivery && t !== godId && target && (!isLive(target) || noSession)) {
        const gone = target.archived ? 'archived' : 'stopped';
        if (this.deliver(msg, t)) delivered.push(t);
        this.appendLog({ kind: 'archived-recipient', from: msg.from, to: t, id: msg.id, act: msg.act, ...(noSession ? { noSession: true } : target.archived ? {} : { stopped: true }) });
        const sender = reg.agents[msg.from];
        if (msg.requires_reply && sender && isLive(sender)) {
          this.routeMessage(this.normalize({
            to: msg.from,
            act: 'inform',
            in_reply_to: msg.id,
            conversation: msg.conversation,
            work: msg.work,
            hops: msg.hops + 1,
            requires_reply: false,
            subject: noSession
              ? `[no one is there to answer: "${t}" has no session] ${msg.subject}`
              : `[no one is there to answer — "${t}" is ${gone}] ${msg.subject}`,
            body: (noSession
              ? `Your ${msg.act} to ${t} was filed in its inbox, but ${t} has no running session, so nothing reads it until ${t} is started. `
              : `Your ${msg.act} to ${t} was filed in its inbox, but ${t} has no live terminal (${gone}), `
                + `so it will only be read if ${t} is restored or re-hired under the same id. `)
              + 'If you need this done now, route it to an agent on the live roster or hire one.'
          }, 'system'));
        }
        continue;
      }
      // A provider without safe-idle lifecycle state (a hookless custom command)
      // would let direct mail rot unread. Claude and bridged Antigravity/Codex
      // receive directly into inbox/ for guarded renderer delivery. Otherwise try
      // a terminal work-order handoff to its REPL (#53);
      // if the renderer is unavailable, bounce to god to relay. God is exempt
      // (the bounce target).
      if (!demandDelivery && t !== godId && !canReceiveInbox(reg.agents[t]?.provider)) {
        if (!this.emitTerminalHandoff(msg, t)) {
          this.bounceToGod(msg, godId, `[undeliverable — "${t}" runs ${reg.agents[t]?.provider ?? 'a hookless CLI'} and the terminal handoff failed (renderer unavailable); relay this to it] ${msg.subject}`);
        } else delivered.push(t);
        continue;
      }
      // 1d — proxy-tier providers (qwen) CAN receive inbox, but only via a
      // SYNTHESIZED Stop, which just advances the cursor — the sidecar observes the
      // CLI's stream and can't inject a drain reason back into its turn. So the real
      // mail rides the terminal work-order path verbatim, exactly like a hookless
      // provider; the synthesized Stop→drain keeps the cursor in step.
      const proxyDesc = bridgeOf(reg.agents[t]?.provider);
      if (!demandDelivery && t !== godId && proxyDesc?.kind === 'proxy' && proxyDesc.inboxDelivery === 'terminal') {
        if (!this.emitTerminalHandoff(msg, t)) {
          this.bounceToGod(msg, godId, `[undeliverable — "${t}" runs ${reg.agents[t]?.provider ?? 'a proxy-tier CLI'} and the terminal handoff failed (renderer unavailable); relay this to it] ${msg.subject}`);
        } else delivered.push(t);
        continue;
      }
      // 0.5.6: a `done` god has nothing to do with reaches it as a note
      // (setQuietDone). The sender's own copy stays `done`.
      const quiet = t === godId && msg.act === 'done' && this.isQuietDone(msg.from);
      if (this.deliver(quiet ? { ...msg, act: 'note', requires_reply: false } : msg, t)) { delivered.push(t); continue; }
      // No agents/<t>/inbox — an id that isn't on the floor. This was the one
      // delivery failure with neither bounce nor log, so the sender saw a routed
      // message and the mail simply ceased to exist. Record the drop beside the
      // hop-cap one and bounce to god, mirroring the undeliverable bounces above.
      this.appendLog({ kind: 'drop', reason: 'no-inbox', from: msg.from, to: t, id: msg.id });
      if (t !== godId) {
        this.bounceToGod(msg, godId, `[undeliverable — no agent "${t}" on this floor; check the id against the roster] ${msg.subject}`);
      }
    }
    this.appendLog({ kind: 'message', from: msg.from, to: msg.to, act: msg.act, subject: msg.subject, id: msg.id, delivered });
    this.emitMessage(msg, targets);
  }

  /** 0.5.6 (founder, 16 Oct 2026: "a note would have been fine"). A temp the
   *  app started for a person's message (Slack, a webhook, a mission) sends
   *  its `done` to god, whose name is on its dispatch, and
   *  that woke god for nothing. For a sender this answers true for, a `done`
   *  to god is filed as a note: read at god's next wake, no wake of its own.
   *  Set by the main process; nothing is quiet without it. */
  private quietDone: ((from: string) => boolean) | null = null;
  setQuietDone(cb: ((from: string) => boolean) | null): void {
    this.quietDone = cb;
  }
  private isQuietDone(from: string): boolean {
    try { return this.quietDone?.(from) === true; } catch { return false; }
  }

  /** Did this agent's current turn begin with a person's words (26 Oct 2026)?
   *  Its notes are then delivered as informs, as a temp's are. Set by the main
   *  process (founderTurn.ts); without it no turn is the person's. */
  private founderTurn: ((agentId: string) => boolean) | null = null;
  setFounderTurn(cb: ((agentId: string) => boolean) | null): void {
    this.founderTurn = cb;
  }
  private isFounderTurn(agentId: string): boolean {
    try { return this.founderTurn?.(agentId) === true; } catch { return false; }
  }

  /** F27. Has this agent a terminal right now? Set by the app, which holds the
   *  terminals; without it no row counts as having no session. */
  private terminalUp: ((agentId: string) => boolean) | null = null;
  setTerminalUp(cb: ((agentId: string) => boolean) | null): void {
    this.terminalUp = cb;
  }
  /** A row written moments ago is a start under way (ensureAgent runs before its terminal is up). */
  private hasNoSession(agentId: string, row: { lastSeen?: number }): boolean {
    if (!this.terminalUp || Date.now() - (row.lastSeen ?? 0) < NO_SESSION_GRACE_MS) return false;
    try { return !this.terminalUp(agentId); } catch { return false; }
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
    const event = {
      id: msg.id,
      from: msg.from,
      to: targetId,
      act: msg.act,
      subject: msg.subject,
      body: msg.body,
      requiresReply: msg.requires_reply,
      createdAt: msg.created_at
    };
    const delivered = this.emit?.('hive:terminalHandoff', event) === true;
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
          const msg = this.normalize(partial, id, { harnessId: true });
          msg.from = id; // sender is authoritative — the owning directory
          // 0.5.6 (founder, 17 Oct 2026): a temp works on one person's errand,
          // from Slack or from the app, so what it sends an agent is read now:
          // its note is delivered as an inform, which wakes. Notes the app
          // itself writes ("a temp cloned from you is done") stay notes.
          // 26 Oct 2026 (founder): so is an agent's note sent in a turn that
          // began with a person's words: chat, Slack, an ASK ME answer
          // (setFounderTurn).
          if (msg.act === 'note' && (isTempAgentId(id) || this.isFounderTurn(id))) msg.act = 'inform';
          this.routeMessage(msg);
          const sent = join(outbox, '.sent', f);
          renameSync(full, sent); // archive, don't reprocess
          // The archive holds the message as routed, not the agent's draft: the
          // harness id (#566) is what the recipient's copy carries, so the
          // floor scan's dedup by id still sees one message, and from and
          // created_at are filled for the per sender mail count. Best effort.
          try { this.atomicWriteJson(sent, msg); } catch { /* the raw draft stays archived */ }
          routed++;
        } catch {
          // A file we could not read or a delivery that threw. Quarantine so we
          // don't spin on it, and log the drop like the malformed json paths
          // above so the loss is observable (public #566). No error payload.
          this.appendLog({ kind: 'drop', reason: 'delivery-failed', from: id, file: f });
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
    // A damaged list reads as empty here, as before, but is never written over
    // from that empty read: atomicWriteJson refuses while it is damaged. One
    // that cannot be read just now keeps this run's last good list,
    // or with none yet is read a few more times first. The list kept is a copy:
    // callers change what they get before writing it, and an unsaved change
    // must not become the last good list.
    const p = join(root, 'registry.json');
    const r = this.lastGoodRegistry?.path === p ? this.damage.read(p, 'registry') : this.damage.readPatiently(p, 'registry');
    if (r.ok) { this.lastGoodRegistry = { path: p, value: structuredClone(r.value as Registry) }; return r.value as Registry; }
    if (r.why === 'unreadable' && this.lastGoodRegistry?.path === p) return structuredClone(this.lastGoodRegistry.value);
    return { godId: null, agents: {} };
  }
  board(): string {
    const root = this.root();
    return root && existsSync(join(root, 'board.md')) ? readFileSync(join(root, 'board.md'), 'utf8') : '';
  }
  /** The board. One that cannot be read just now keeps this run's last good
   *  board, as registry() does, so a passing error does not show it empty.
   *
   *  Read and parsed only when the file changed (a board can be 764 KB, and the window asked for it every
   *  15 s), and in full at least every TASKS_REREAD_MS: a file at the identity it was last read at answers that read,
   *  the same object, frozen all the way down.
   *  Every writer here copies before it changes a card (writeTasks, patchTask, patchTasks, the answers, the sweep); a
   *  reader that changed it in place would change every reader's board, so it throws instead. */
  tasks(): unknown {
    return this.ledgerNow().value;
  }

  /** The board for a reader that holds a copy already: `since` is the stamp that copy came with. The same stamp means
   *  the same board, and the answer leaves the board out; anything else answers it whole, with its stamp. The window's
   *  shared ledger (renderer store/taskLedger.ts) asks this, so an unchanged board neither crosses nor is compared. */
  tasksSince(since: string): { stamp: string; tasks?: unknown } {
    const now = this.ledgerNow();
    return since !== '' && since === now.stamp ? { stamp: now.stamp } : { stamp: now.stamp, tasks: now.value };
  }

  private ledgerNow(): { stamp: string; value: unknown } {
    const root = this.root();
    if (!root) return { stamp: 'empty', value: { tasks: [] } };
    const p = join(root, 'tasks.json');
    // Taken before the read: a write between the two leaves the parse newer than the identity, so it is read again
    // next time. Taken after, it could pair a new identity with the old text and never read the new one.
    const id = fileIdentity(p);
    const now = Date.now();
    const good = this.lastGoodTasks?.path === p ? this.lastGoodTasks : null;
    const sameFile = good !== null && id !== null && good.id === id;
    if (sameFile && now - good.readAt < TASKS_REREAD_MS) return { stamp: good.stamp, value: good.value };
    const r = good ? this.damage.read(p, 'tasks') : this.damage.readPatiently(p, 'tasks');
    if (r.ok) {
      // The safety net's read of an unchanged board keeps its parse and its stamp, so no reader takes it again.
      if (sameFile && isDeepStrictEqual(r.value, good.value)) { good.readAt = now; return { stamp: good.stamp, value: good.value }; }
      const stamp = id === null || sameFile ? `${id ?? 'unstamped'}#${++this.tasksRestamped}` : id;
      this.lastGoodTasks = { path: p, value: freezeDeep(r.value), id, stamp, readAt: now };
      return { stamp, value: r.value };
    }
    if (r.why === 'unreadable' && good) return { stamp: good.stamp, value: good.value };
    return { stamp: 'empty', value: { tasks: [] } };
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
    // Read the live ledger before touching the archive: an unreadable one
    // throws here, and nothing has been written yet.
    const livePath = join(root, 'tasks.json');
    const liveNow = this.readLedgerForWrite(livePath);
    if (next.archived) this.writeJson(archivePath, { tasks: next.archive });
    this.writeLedger(livePath, liveNow, next.live);
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
   *  gone. Merging protects fields, never card membership.
   *
   *  THROWS instead of writing when tasks.json exists but cannot be parsed
   *  (public #562): a merge can only protect cards it can see. */
  writeTasks(tasks: HiveTask[]): void {
    const root = this.root();
    if (!root) return;
    this.ensureHive();
    const path = join(root, 'tasks.json');
    const current = this.readLedgerForWrite(path) as { tasks?: unknown };
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

  /** The ledger as a writer must see it. A missing file is an empty board. A
   *  file that exists but will not parse is an agent's hand edit caught half
   *  way, or hand corruption: reading it as empty would let the merge replace
   *  every card it could not see with the caller's partial list, so one webhook
   *  addTask wiped the board. Refuse instead; the bytes stay for recovery and
   *  the last good copy is in the prior hive commit (public #562). */
  private readLedgerForWrite(path: string): unknown {
    const r = this.damage.read(path, 'tasks');
    if (r.ok) return r.value;
    if (r.why === 'missing') return { tasks: [] };
    const issue = this.damage.list().find((i) => i.file === basename(path));
    // A passing read error (EMFILE, EBUSY) is not damage: say so, and to retry.
    if (r.why === 'unreadable') {
      this.appendLog({ kind: 'tasks-write-refused', reason: 'read error', error: issue?.error ?? 'unreadable', copy: null });
      throw new Error(`hive: tasks.json could not be read just now (${issue?.error ?? 'read error'}); nothing was written. Try again in a moment`);
    }
    this.appendLog({ kind: 'tasks-write-refused', reason: 'unreadable ledger', error: issue?.error ?? 'damaged', copy: issue?.copy ?? null });
    throw new Error(`hive: tasks.json is unreadable (torn write or corruption); refusing to overwrite it.${issue?.copy ? ` A copy was saved as ${issue.copy}.` : ''} Fix it by hand or restore it from the hive git history, then retry`);
  }

  /** Append one card against the latest on-disk ledger. Renderer callers must
   *  use this instead of re-writing a collection they read before another
   *  source (webhook, Slack, god, voice) added work. Idempotent by task id;
   *  throws without writing if the ledger is unreadable (see writeTasks). */
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

  /**
   * Answer or dismiss ONE Ask Me entry on the latest on-disk card, in
   * one read, one write and one commit for all of `items` (Dismiss all). Each
   * item names its card, the entry (`q`, and `askedAt` when the window had one,
   * else `nth`) and the change. The entry is the open one the window showed:
   * with askedAt, the newest open one with that q and askedAt; with nth, the
   * nth entry with that q, still open; with neither, the newest open one with
   * that q. Open is shared/humanAsk's rule (askClosed). Only its fields change,
   * and every other entry and card stays exactly as on disk. No such entry, a
   * done card, or an answer to options since rewritten (`labels` differ):
   * 'gone'. `chosen` must be RAW positions of options that entry shows, one
   * unless it is multi (askOptions.validRawChosen): else 'invalid'. Nothing
   * refused is written.
   */
  answerQuestions(items: ReadonlyArray<{ taskId: string; ref: HumanQARef; change: HumanQAChange }>): Array<{ taskId: string; ok: boolean; error?: 'gone' | 'invalid' }> {
    const ledger = this.tasks() as { tasks?: HiveTask[] };
    const next = Array.isArray(ledger?.tasks) ? ledger.tasks.slice() : [];
    const out = items.map(({ taskId, ref, change }) => {
      const hit = resolveTask(next, taskId);
      const index = hit ? next.indexOf(hit) : -1;
      if (index < 0 || !hit || isDoneCard(hit)) return { taskId, ok: false, error: 'gone' as const };
      const qa = Array.isArray(hit.humanQA) ? hit.humanQA : [];
      const sameQ = (e: unknown): e is HumanQA => !!e && typeof e === 'object' && (e as { q?: unknown }).q === ref.q;
      let at = -1;
      if (ref.askedAt === undefined && ref.nth !== undefined) {
        // No askedAt to tell repeats of a question apart: the window counted
        // the entries with this q before the one it showed.
        let seen = 0;
        for (let i = 0; i < qa.length && at < 0; i++) if (sameQ(qa[i]) && seen++ === ref.nth) at = i;
        if (at >= 0 && askClosed(qa[at])) at = -1;
      } else {
        for (let i = qa.length - 1; i >= 0; i--) {
          const e = qa[i];
          if (!sameQ(e) || askClosed(e)) continue;
          if (ref.askedAt !== undefined && e.askedAt !== ref.askedAt) continue;
          at = i;
          break;
        }
      }
      if (at < 0) return { taskId, ok: false, error: 'gone' as const };
      const entry = qa[at];
      let changed: HumanQA;
      if ('dismissedAt' in change) {
        changed = { ...entry, dismissedAt: change.dismissedAt };
      } else {
        // An answer is to the options the card showed: rewritten in place since,
        // `chosen` would name other labels than `a` does.
        if (ref.labels !== undefined && JSON.stringify(askLabels(entry.options)) !== JSON.stringify(ref.labels)) return { taskId, ok: false, error: 'gone' as const };
        if (change.chosen !== undefined && !validRawChosen(entry.options, change.chosen, entry.multi)) return { taskId, ok: false, error: 'invalid' as const };
        const chosen = change.chosen?.length ? [...change.chosen].sort((x, y) => x - y) : undefined;
        changed = { ...entry, a: change.a, answeredAt: change.answeredAt, ...(chosen ? { chosen } : {}) };
      }
      const nextQa = qa.slice();
      nextQa[at] = changed;
      next[index] = { ...hit, humanQA: nextQa };
      return { taskId, ok: true };
    });
    if (out.some((r) => r.ok)) this.writeTasks(next);
    return out;
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
  /**
   * Voice read-layer: recent message CONTENT (inbox + outbox bodies) for the
   * operator briefing, REDACTED main-side. This is the message-content half of
   * the voice query surface (the activity half is logTail()).
   *
   * Modes:
   *   - { id }                → the single message with that id, wherever it lives.
   *   - { agentId }           → recent messages in that agent's mailbox only.
   *   - {}                    → recent messages across the whole floor, newest first.
   * `limit` caps the list (default 12, max 200; the voice layer asks for 12, the Inbox for the full 200); `includeArchived` (default true)
   * also reads the handled subfolders (inbox/.done, outbox/.sent).
   *
   * SECURITY: every subject + body is passed through redactSecrets() here, in
   * main, so no secret and no raw body ever crosses IPC. Delivered messages exist
   * in both the sender's outbox/.sent and the recipient's inbox/.done; we dedup
   * by message id so each appears once.
   */
  voiceMessages(opts: VoiceMessagesOptions = {}): VoiceMessage[] {
    return runToEnd(this.voiceMessagesSteps(opts));
  }

  /** Read every mailbox once, in the background, so the first screen that
   *  asks finds the parsed files ready. Started right after the window. */
  warmMailboxes(): Promise<void> {
    return this.mailScan('warm', () => this.voiceMessagesSteps({ limit: 1 })).then(() => undefined, () => undefined);
  }

  private *voiceMessagesSteps(opts: VoiceMessagesOptions): Generator<void, VoiceMessage[]> {
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
        for (const m of yield* this.listMessagesSteps(f.dir)) {
          if (!m || typeof m.id !== 'string' || seen.has(m.id)) continue;
          seen.add(m.id);
          if (wantId && m.id !== wantId) continue;
          // Raw here, redacted below once the list is cut: redacting all
          // 5,790 floor messages to return 200 was most of this call's cost.
          out.push({
            id: m.id,
            conversation: m.conversation,
            from: m.from,
            to: m.to,
            act: m.act,
            subject: m.subject,
            body: m.body,
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
    const lim = wantId ? 1 : typeof opts.limit === 'number' && isFinite(opts.limit)
      ? Math.max(1, Math.min(200, Math.round(opts.limit)))
      : 12;
    const cut = out.slice(0, lim);
    // The screens' read of the whole floor (the voice layer asks for far fewer): on a busy floor the newest 200 of all
    // mail is minutes old, and the person's own messages scrolled out of their thread. Theirs stay, as many again.
    if (!onlyAgent && !wantId && lim >= 200) cut.push(...out.slice(lim).filter((m) => m.from === 'human' || m.to === 'human').slice(0, lim));
    // SECURITY: every row that leaves this function is redacted, main-side.
    return cut.map((m) => ({ ...m, subject: redactSecrets(m.subject), body: redactSecrets(m.body) }));
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
      // The shared bin sits under %APPDATA%, which carries the user name, and a
      // user name may have a space: same 8.3 treatment as nodeRunWindowsHook.
      // agy's hook environment cannot be proven to keep PATH: no wrapper (plan F).
      ? (shared ? this.windowsHookLine('antigravity', shared.launcher, shim, [event], false) : this.nodeRunWindowsHook('antigravity', false, shim, event))
      : (shared ? [`"${shared.launcher}"`, `"${shim}"`, event].join(' ') : this.nodeRun(shim, event));
    // agy's own hooks guide (in the 1.4.4 binary): only PreToolUse and
    // PostToolUse are grouped with a matcher; PreInvocation, PostInvocation and
    // Stop are a flat list of handlers. `timeout` is in seconds, default 30, so
    // the 0 we wrote before was no time at all. The shim gives up
    // after 5 s on its own.
    const handler = (event: string) => ({ type: 'command', command: command(event), timeout: AGY_HOOK_TIMEOUT_S });
    const tool = (event: string) => ({ matcher: '*', hooks: [handler(event)] });
    const plain = handler;
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

  /** Once per start: an agy hooks file that already holds our
   *  `munder-hive` group is written again in the shape agy reads. 0.5.7 and
   *  earlier wrote PreInvocation, PostInvocation and Stop grouped, which agy
   *  rejects, and only an agy spawn rewrote the file. A person who never ran an
   *  agy agent has no group there and nothing is written. */
  repairAgyHooks(): void {
    const gem = join(homedir(), '.gemini');
    const ours = [join(gem, 'config', 'hooks.json'), join(gem, 'antigravity-cli', 'hooks.json')].some((p) => {
      try { return Object.prototype.hasOwnProperty.call(JSON.parse(readFileSync(p, 'utf8')), 'munder-hive'); } catch { return false; }
    });
    if (ours) this.installAgyHooks();
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
            ? this.nodeRunWindowsHook('gemini', true, shim)
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
   *  using reason as the next prompt". So we
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
  private installCodexHooks(
    dir: string, agentId: string, cwd?: string, writableRoots: string[] = []
  ): { home: string; rootsInConfig: boolean } {
    const home = join(dir, '.codex');
    let rootsInConfig = false;
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
      // already Claude-shaped, so HookServer runs unchanged). Regenerated
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
      // The person's config, with every plugin off and each tool output capped
      // for the model (codexAgentConfig.ts): both cut what every request sends.
      let config = codexAgentConfig(existsSync(join(userHome, 'config.toml'))
        ? readFileSync(join(userHome, 'config.toml'), 'utf8') : '');
      if (shim) {
        const events = ['PreToolUse', 'PostToolUse', 'Stop', 'SubagentStop',
          'SessionStart', 'UserPromptSubmit', 'PreCompact', 'PostCompact'];
        // Preserve the existing Windows .cmd shape: nested command quotes pass
        // through a different shell stack there (#350). The reported Codex bug
        // is POSIX, where ordinary shell quoting is both necessary and verified.
        const command = process.platform === 'win32'
          ? this.nodeRunWindowsHook('codex', true, shim)
          : this.nodeRun(shim);
        config += '\n# --- munder-hive lifecycle hooks (auto-generated; do not edit) ---\n';
        for (const ev of events) {
          config += `\n[[hooks.${ev}]]\n[[hooks.${ev}.hooks]]\ntype = "command"\ncommand = ${JSON.stringify(command)}\ntimeout = 30\n`;
        }
      }
      // Directory trust (#338). A fresh config dir has never answered Codex's
      // "do you trust this directory?" prompt, so an agent launched into one
      // stops on it before its first turn and, with nobody at the keyboard,
      // never resumes. Pressing Yes persists exactly this table, and seeding it
      // is the only suppression there is. Canonical (realpath) spelling, because
      // Codex resolves the directory before looking it up. When the copied user
      // config already has a table for this dir it is left alone: a second
      // `[projects."<dir>"]` header is invalid TOML and Codex would refuse it.
      if (cwd) {
        let trusted = cwd;
        try { trusted = realpathSync(cwd); } catch { /* not on disk yet: best spelling we have */ }
        config += codexTrustEntry(trusted, config);
      }
      // Extra writable roots (#625): the config twin of --add-dir, see the
      // spawn path. null = the user's config sets writable_roots already.
      let rootsWritten = false;
      if (writableRoots.length > 0) {
        const withRoots = codexWritableRootsToml(config, writableRoots);
        if (withRoots !== null) { config = withRoots; rootsWritten = true; }
      }
      // The network inside workspace-write, for git fetch, push and gh, and only for an agent
      // whose folder is a git work tree. Never over the person's own setting. The sandbox itself stays:
      // writes are still held to the writable roots.
      if (inGitWorkTree(cwd)) config = codexNetworkToml(config);
      // Windows (plan F, T5, founder's ruling): Codex runs workspace-write as
      // READ ONLY unless its Windows sandbox is on, so auto mode's `-a never`
      // agent could neither write nor ask. Turn it on in THIS agent's copy only,
      // and only when the person chose nothing (codexWindowsSandbox.ts).
      // A config it cannot read for sure is left as is and logged: a Codex config
      // that does not parse stops the agent outright (gate of #190, W3).
      if (process.platform === 'win32') {
        const sandbox = codexWindowsSandboxToml(config);
        if (sandbox.toml !== null) config = sandbox.toml;
        else if (sandbox.why === 'doubt') this.appendLog({ kind: 'codex-windows-sandbox-skipped', agent: agentId, detail: sandbox.detail });
      }
      writeFileSync(join(home, 'config.toml'), config, 'utf8');
      rootsInConfig = rootsWritten;

      // Keep each worker's CODEX_HOME isolated while putting its rollout data
      // below Codex's standard scan roots. External usage tools can then discover
      // the sessions without understanding the hive's private directory layout.
      this.exposeCodexDataDirs(home, userHome, agentId);
    } catch (e) { console.error('[hive] installCodexHooks failed:', e); }
    return { home, rootsInConfig };
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
      const manifest = { name: 'munder-hive-bridge', version: '0.3.2', main: 'extensions/hive-bridge.js', auto: true };
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
      }
      // Absolute instruction path: OpenCode reloads this for every session;
      // its event plugin is fire-and-forget and cannot return hook context.
      mkdirSync(home, { recursive: true });
      const configPath = join(home, 'opencode.json');
      const existing = existsSync(configPath) ? JSON.parse(readFileSync(configPath, 'utf8')) : {};
      const identityFile = join(dir, HIVE_IDENTITY_FILE);
      const instructions = Array.isArray(existing.instructions) ? existing.instructions : [];
      writeFileSync(configPath, JSON.stringify({ ...existing, ...(theme ? { theme: 'system' } : {}), instructions: [...new Set([...instructions, identityFile])] }, null, 2), 'utf8');
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
          onHold?: boolean; sleeping?: boolean;
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
        if (a.sleeping) bits.push('Sleeping');
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
        // Each engine's usage limits (limits-bar), one line, when the host keeps them.
        + ((limits) => (limits ? ` ${limits}` : ''))(this.limitsLine());
    } catch { return null; }
  }
  logTail(n = 200): unknown[] {
    const root = this.root();
    if (!root || !existsSync(join(root, 'log.jsonl'))) return [];
    // From the end of the file (tailLines): the log only grows, the ask is 200.
    return tailLines(join(root, 'log.jsonl'), n).map((l) => { try { return JSON.parse(l); } catch { return { raw: l }; } });
  }

  /** Parsed message files per mailbox dir, keyed by file name and checked by
   *  size + mtime. The floor scan (voiceMessages, every 10 s from the Inbox,
   *  God and Memory screens) walks every inbox, outbox, .done and .sent folder: 5,790 files and
   *  15.7 MB on the founder's floor, re-read and re-parsed on every call.
   *  Archived messages never change, so a repeat call is readdir + stat. */
  private messageCache = new Map<string, Map<string, { size: number; mtimeMs: number; msg: HiveMessage | null }>>();

  private listMessages(dir: string): HiveMessage[] {
    return runToEnd(this.listMessagesSteps(dir));
  }

  /** The scans in flight, by what was asked: callers at the same time that
   *  ask the same thing share one scan. */
  private mailScans = new Map<string, Promise<unknown>>();
  /** One background scan at a time: the second finds the first one's files
   *  already parsed instead of reading them beside it. */
  private mailScanTail: Promise<unknown> = Promise.resolve();
  /** The last background scan: how many slices it ran in and the longest one. */
  private mailScanLast = { slices: 0, longestMs: 0 };

  private mailScan<T>(key: string, steps: () => Generator<void, T>): Promise<T> {
    const running = this.mailScans.get(key) as Promise<T> | undefined;
    if (running) return running;
    const run = this.mailScanTail.then(() => runInSlices(steps(), this.mailScanLast));
    this.mailScanTail = run.catch(() => undefined);
    this.mailScans.set(key, run);
    const done = (): void => { if (this.mailScans.get(key) === run) this.mailScans.delete(key); };
    run.then(done, done);
    return run;
  }

  /** listMessages() as steps: one step per file, so a background scan can
   *  give the app a turn in the middle of a folder of 500. */
  private *listMessagesSteps(dir: string): Generator<void, HiveMessage[]> {
    if (!existsSync(dir)) { this.messageCache.delete(dir); return []; }
    let files: string[];
    try { files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort(); } catch { return []; }
    const prev = this.messageCache.get(dir);
    // Rebuilt from the current listing, so a moved or deleted file drops out.
    const next = new Map<string, { size: number; mtimeMs: number; msg: HiveMessage | null }>();
    const out: HiveMessage[] = [];
    for (const f of files) {
      const full = join(dir, f);
      let st: { size: number; mtimeMs: number };
      try { st = statSync(full); } catch { continue; }
      let hit = prev?.get(f);
      if (!hit || hit.size !== st.size || hit.mtimeMs !== st.mtimeMs) {
        let msg: HiveMessage | null = null;
        try { msg = JSON.parse(readFileSync(full, 'utf8')) as HiveMessage; } catch { /* torn or not JSON: skipped, retried when it changes */ }
        // A raw draft (a quarantined bad-* file, or one whose archive rewrite
        // failed) keeps whatever time its agent wrote, or none: the file's own
        // time stands in, so no reader gets a created_at that is not a date.
        if (msg && typeof msg === 'object' && !isoTimeOrNull(msg.created_at)) msg = { ...msg, created_at: new Date(st.mtimeMs).toISOString() };
        hit = { size: st.size, mtimeMs: st.mtimeMs, msg };
      }
      next.set(f, hit);
      // A shallow copy, so a caller that edits a message cannot edit the cache.
      if (hit.msg !== null) out.push({ ...hit.msg });
      yield;
    }
    this.messageCache.set(dir, next);
    return out;
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
   * The tail file is written 0600 and crashes/ is capped at MAX_CRASH_LOGS
   * files, oldest dropped first (public #458).
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
        // 0600 explicitly: the tail holds paths, prompt fragments and whatever
        // a provider printed as it died, and the default umask leaves it
        // world readable. A packaged app does not inherit the shell's umask.
        writeFileSync(p, header + tail, { encoding: 'utf8', mode: 0o600 });
        tailPath = p;
        pruneCrashLogs(dir);
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
  /** The shape `p` must keep when it is the agent list or the board, else null. */
  private authorityShape(p: string): 'registry' | 'tasks' | null {
    const root = this.root();
    if (!root) return null;
    if (p === join(root, 'registry.json')) return 'registry';
    if (p === join(root, 'tasks.json')) return 'tasks';
    return null;
  }
  private atomicWriteJson(p: string, data: unknown): void {
    // The agent list and the board are never written over while damaged: what
    // was read from them is empty, so a write would erase them. Skipped, not
    // thrown, so a spawn or a timer carries on; the banner names the file.
    const shape = this.authorityShape(p);
    if (shape && this.damage.damaged(p, shape)) {
      console.error(`[hive] ${basename(p)} is damaged: this write was not made`);
      return;
    }
    const tmp = `${p}.tmp-${shortRand()}`;
    try {
      writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
      renameSync(tmp, p);
      if (shape) this.damage.wrote(p);
    } catch (e) {
      try { rmSync(tmp, { force: true }); } catch { /* the temp file is disposable */ }
      throw e;
    }
  }

  // — git (single committer, in a background queue, 0.5.5) —
  //
  // `commit()` only marks the hive as changed. The git work runs in
  // HiveCommitQueue (hiveCommitQueue.ts): one job at a time, with `spawn`, at
  // most one scan per 5 minute window, so the main thread never waits for git.
  //
  // `gc.autoDetach=false` stays in every call. A commit runs `gc --auto`, and
  // git detaches that into a BACKGROUND process by default, which outlives the
  // job that started it and races anything that touches the hive next
  // (removing a hive home threw ENOTEMPTY in ~3.5% of runs, the leftover always
  // `.git/objects/`). The queue now runs the commit with gc.auto=0 and the
  // clean up as its own step with a long limit, and this flag keeps that step
  // in the foreground, so a finished job means git is done. (A flush, a drop
  // or quit that runs out of time stops the whole git tree and waits for it.)
  private static readonly GIT_BASE_ARGS = ['-c', 'commit.gpgsign=false', '-c', 'gc.autoDetach=false', '-c', 'user.name=Hive', '-c', 'user.email=hive@local'];

  /** Synchronous git, for `git init` of a new hive only (once in its life,
   *  before anything else can use the repo). Everything else goes through
   *  the queue. */
  private gitInitSync(cwd: string): void {
    gitInitSync(cwd, HiveManager.GIT_BASE_ARGS);
  }

  private readonly commits = new HiveCommitQueue({
    git: spawnHiveGit(HiveManager.GIT_BASE_ARGS),
    hasRepo: (root) => existsSync(join(root, '.git')),
    clearStaleLock: (root) => this.clearStaleLock(root),
    prepare: (root, git) => this.prepareRepo(root, git),
    afterFirstScan: async (_root, git) => {
      // Plan E rule 6: on for this repo only when git's own disk test passes,
      // off when it fails. Never the person's global settings.
      const cache = await setUntrackedCache(git);
      if (cache === null) console.warn('[hive] could not set core.untrackedCache for the hive repo');
    },
    sizeGuard: async (root, git) => {
      // Before `add -A` can take it. A name list always lags the next tool that
      // writes something enormous into the hive, so anything UNTRACKED over the
      // cap gets its own anchored ignore line instead of a place in history.
      // Untracked only: a file already in the repo keeps its history, so a long
      // board.md is never dropped by the size rule.
      const oversized = await ignoreOversized(git, HiveManager.repoFs, root, join);
      if (oversized.length) {
        console.warn(`[hive] too big for the hive repo, ignored (left on disk): ${oversized.join(', ')}`);
      }
    }
  });

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

  /**
   * Once per launch, in the queue before the first scan of a root.
   *
   * The hygiene stops the hive repo versioning what it should never have
   * taken. Two halves:
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
  private async prepareRepo(root: string, git: RootGit): Promise<void> {
    const run: GitRun = git;
    // git's untracked cache disk test works in a `mtime-test-XXXXXX` folder in
    // the hive root; one it was stopped in the middle of is left behind.
    try {
      for (const name of readdirSync(root)) {
        if (/^mtime-test-[A-Za-z0-9]{6}$/.test(name)) rmSync(join(root, name), { recursive: true, force: true });
      }
    } catch { /* best-effort; the ignore line keeps it out of history anyway */ }
    await boundGcMemory(run);
    const agentsDir = join(root, 'agents');
    if (existsSync(agentsDir)) {
      try {
        for (const id of readdirSync(agentsDir)) ensureMineIgnore(join(agentsDir, id));
      } catch { /* best-effort */ }
    }
    const { paths, ok } = await untrackIgnored(run);
    if (!ok) {
      console.warn('[hive] could not untrack ignored files from the index');
    } else if (paths.length > 0) {
      console.warn(`[hive] untracked ${paths.length} ignored file(s) from the hive repo; they stay on disk`);
      this.appendLog({ kind: 'hive-repo-untracked', count: paths.length, sample: paths.slice(0, 10) });
    }
    // Keeping files OUT cannot shrink what is already in. Say so, once, with
    // the command that can, rather than leaving a person to find a 200GB .git
    // on their own.
    const bytes = await packedBytes(run);
    if (bytes !== null && bytes > REPO_SIZE_WARN_BYTES) {
      const gb = (bytes / (1024 * 1024 * 1024)).toFixed(1);
      const tool = join(root, 'bin', 'hive-compact.cjs');
      console.warn(`[hive] the hive repo is ${gb}GB of history. With the app closed: node "${tool}"`);
      this.appendLog({ kind: 'hive-repo-large', bytes, compact: tool });
    }
  }

  /** Mark the hive as changed. Returns at once; the commit queue commits
   *  within the batching window (at once after a quiet time). Callers that
   *  need the commit finished await `flushCommits()`. */
  commit(message: string): void {
    const root = this.root();
    if (!root || !existsSync(join(root, '.git'))) return;
    this.commits.mark(root, message);
  }

  /** Commit what is marked now and wait for the queue's git, at most `ms`
   *  (gc is stopped, not waited for). When the time runs out the running git
   *  is stopped as a tree and waited for, so either way no git of ours is
   *  writing into the hive when this resolves. True when it finished on its
   *  own. */
  flushCommits(ms?: number): Promise<boolean> {
    return this.commits.flush(ms);
  }

  /** Wait for the jobs on the commit queue, at most `ms`; true when they ended.
   *  After a flush that ran out of time, a caller about to copy the hive waits for it. */
  async waitCommitQueue(ms: number): Promise<boolean> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const done = await Promise.race([
      this.commits.whenIdle().then(() => true),
      new Promise<boolean>((r) => { timer = setTimeout(() => r(false), ms); })
    ]);
    clearTimeout(timer);
    return done;
  }

  /** The whole scan at app start (untracked cache off). Does not wait. */
  scanCommitsAtStart(): void {
    const root = this.root();
    if (!root || !existsSync(join(root, '.git'))) return;
    void this.commits.scanAtStart(root);
  }

  /** Quit: a last whole scan (untracked cache off), waiting at most `ms`.
   *  True when the queue drained in time. */
  drainCommitsForQuit(ms?: number): Promise<boolean> {
    const root = this.root();
    return this.commits.drainForQuit(root && existsSync(join(root, '.git')) ? root : null, ms);
  }

  /** The hive is about to be erased (reset): forget the queue and wait for a
   *  running job, briefly. */
  dropCommits(ms?: number): Promise<void> {
    return this.commits.drop(ms);
  }

  private clearStaleLock(root: string): void {
    // Never the lock of a git step the queue is running right now: a long
    // `add -A` on a big hive can hold index.lock past the threshold.
    if (this.commits.isGitRunning()) return;
    const STALE_THRESHOLD_MS = 10_000;
    try {
      for (const lock of ['index.lock', 'HEAD.lock']) {
        const path = join(root, '.git', lock);
        if (existsSync(path) && Date.now() - statSync(path).mtimeMs > STALE_THRESHOLD_MS) rmSync(path);
      }
    } catch { /* noop */ }
  }
}

// ─── Generated hive docs (written into the hive, readable by every agent) ────

const GENERATED_DOC_NOTICE =
  '<!-- Generated and managed by Munder Difflin. Local edits are replaced when the app starts. -->';

/** The Claude Code command reference written to <hive>/COMMANDS.md, rendered from
 *  the SAME source as the UI "commands" tab so they never drift. Leads with the
 *  orchestrator note: slash = own session only, cli = shell/fleet; monitor
 *  siblings via fleet.json (claude agents does NOT see them). */
function renderCommandsMd(): string {
  const lines: string[] = [
    GENERATED_DOC_NOTICE,
    '',
    '# Claude Code commands',
    '',
    'Reference of the Claude Code commands available to you. Two kinds:',
    '- **slash** commands act ONLY on your own session — you CANNOT run them on another agent\'s terminal.',
    '- **cli** commands run in your shell (Bash) and can target the fleet, spawn, or query.',
    '',
    'To MONITOR the other agents in this hive, read `fleet.json` in the hive root (live per-agent tokens, cost, status, last tool, breaker level, inbox backlog, context fill `contextPct`) plus `registry.json` — `claude agents` does NOT list your hive siblings. Use `claude -p "..." --output-format json` for a one-off headless query.',
    '',
    'To COMPACT an agent, yourself included, write ONE JSON file `compact-requests/<agent id>.json` in the hive root with `"agent"` (its id) and `"reason"`. The app types that agent\'s own compact at its next idle prompt. At most once per agent in 10 minutes; an accepted file moves to `compact-requests/.done/`, a refused one to `compact-requests/.failed/` with an `"error"` saying why.',
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

const PROTOCOL_MD = `${GENERATED_DOC_NOTICE}

# Hive protocol

You are one of several Claude agents sharing this hive. Coordination is entirely
file-based; the harness (main process) is the only thing that runs git and the
only thing that moves messages between agents.

**Words.** An *agent* is a member of this office with a lasting session. A *temp* is a short lived agent
the orchestrator or an agent starts for one job; it does the job, reports done, and is torn down. The orchestrator's
address is \`god\`.

## Your workspace — \`agents/<your-id>/\`
- \`identity.md\`: who you are (read-only; the harness writes it).
- \`memory.md\`: your long-term memory. Durable facts go here, rules under \`## 📏 Rules (never moved)\`.
  At the start of a session and after a clear read only the Rules part. Find anything else with
  \`md-memory search\`, or open the one section you need. Do not read it all.
- \`handoff.md\`: one section per piece of work: \`## <work id> | <title>\`, a \`_touched: <ISO time>_\` line,
  then State, Next, Files, Open. Read it at the start of a session and after a clear. Update the section
  for the work you are on before you stop and whenever the app asks you to hand off. The app keeps the newest ${HANDOFF_MAX_SECTIONS}.
- \`memory-archive.md\` (\`memory-archive-laptop.md\` on a floor that kept its older names): an index of what moved out (dates and headings). There are no summaries any more.
- \`memory-archive-raw*.md\`: what moved out of memory.md and handoff.md, word for word. Search them.
- \`inbox/\`: your messages. The wake prints them in full and the app files them when your turn ends.
- \`inbox/.done/\`: handled messages. Open or move an inbox file only when the wake gives its path.
- \`outbox/\`: drop messages here to send them. The harness delivers them.

**Never write into another agent's folder.** Write to your own \`outbox/\`; the
orchestrator routes it. This keeps every file single-writer.

## Sending a message
Write one JSON file into \`outbox/\` (any filename ending in \`.json\`):

\`\`\`json
{
  "to": "<agent-id> | god | broadcast",
  "act": "request | inform | note | propose | query | agree | refuse | done",
  "subject": "one-line summary",
  "body": "the details",
  "work": "the work id: a card, a pull request or a name (optional)",
  "conversation": "carry this across a thread (optional)",
  "in_reply_to": "<message id you're replying to> (optional)"
}
\`\`\`

The harness fills in \`id\`, \`from\`, \`hops\`, and timestamps.

## Rules of the road
- Only \`request\`, \`query\`, and \`propose\` expect a reply. \`inform\`, \`note\` and \`done\` are terminal:
  don't reply to them, or two agents will loop forever. Never send a message that only acknowledges or thanks.
- \`note\` is for information that needs no action. It wakes an idle receiver at once, like \`inform\`; a
  busy one reads it when its turn ends. A person's request, or their words you pass on, is never a note.
  A note sent in a turn that began with a person's words (chat, Slack, an ASK ME answer) is delivered as
  \`inform\`, and so is a temp's: a temp works on a person's errand.
- Before you send, ask: will they do anything differently because of this? Yes: request or inform. No: note.
- For anything ambiguous, cross-cutting, or needing sign-off, message \`god\` — the
  god agent clarifies answers for you so you rarely need the human directly.
- There is NO separate human-approval queue. Human-in-the-loop is native to Claude
  Code: a tool you run that needs permission prompts in your own session (the human
  can approve it remotely from their phone via \`/remote-control\`). If you genuinely
  need a human decision, raise it with \`god\` (a message \`"to": "human"\` is routed to
  the god/orchestrator, the human's proxy on the floor).
- \`board.md\` is the shared plan. Don't edit it directly — \`propose\` changes to \`god\`,
  who is its sole scribe.
- Re-reading a message already in \`.done/\` is a no-op. Don't reprocess.

## The work: board.md vs tasks.json
There are two shared surfaces, both in the hive root:
- \`board.md\` — the freeform narrative plan. The god agent is its sole scribe; others \`propose\` edits.
- \`tasks.json\` — the structured task ledger (a kanban: \`todo / doing / blocked / done\`, with title,
  assignee, priority, deps). Keep the task you're working reflected in its status.
  Leave \`id\` out; the harness assigns the ticket key (e.g. V53-299). Refer to cards by that key.

## Compacting an agent
\`fleet.json\` carries each agent's context fill as \`contextPct\`. To have the app compact an agent,
yourself included, write ONE JSON file \`compact-requests/<agent id>.json\` in the hive root with
\`"agent"\` (its id) and \`"reason"\`. The app types that agent's own compact at its next idle prompt;
nothing is wiped. At most once per agent in 10 minutes. An accepted file moves to
\`compact-requests/.done/\`, a refused one to \`compact-requests/.failed/\` with an \`"error"\`.

## Asking the human (the ASK ME card)
When a card can only move with the human — a question to answer, or an action only they can do
(create an account, approve a spend, hand over credentials, test on their device) — the god sets the
card \`"status": "blocked"\` and appends the ask to its \`humanQA\` array:

\`\`\`json
{ "q": "the ask, in markdown", "askedAt": "<iso timestamp>", "from": "<agent id>" }
\`\`\`

\`"from"\` is the agent whose question it is: the ask shows on that agent's own tab. Leave it out for a
floor wide question; that one shows on the orchestrator's tab.

For a choice, the entry may also carry \`"options": [{ "label": "...", "detail": "..." }]\`
(at most 8, \`"detail"\` optional), \`"recommended": <option index, from 0>\` and \`"multi": true\` when
several may be picked; the harness shows them as choices, writes the answer as text in \`"a"\` and
the picked indexes, from 0, in \`"chosen"\`.

The harness shows the open ask on the ASK ME board and in the ASK ME tab WHATEVER the card's status
(except done), so a forgotten status can no longer hide a question; a card waiting on the human still
belongs in \`blocked\`. The human's reply lands in the same entry as \`"a"\` plus an inbox message to
the agent the ask belongs to (\`"from"\`, else the card's assignee), which acts on it and unblocks the card.
A floor wide ask, or one whose agent is no longer on the floor, goes to god. Every past entry stays on
the card — that trail is the decision history.

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
  "cwd": "/absolute/path/to/the/repo (required; your brief says where a new one goes)",
  "cloneOf": "agent id (optional; the temp is a copy of that agent)",
  "name": "display name (optional)",
  "command": "engine CLI (optional; overrides the provider default)",
  "provider": "claude | codex | cursor | antigravity | … (optional; picks its CLI when command is omitted)",
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
back rather than failing. A temp is for one job.

**A clone.** \`cloneOf\` makes the temp a copy of that agent: its worktree is cut from that agent's current
branch (uncommitted changes are not carried), it runs on that agent's engine with its skills and
connections, and it reads the Rules part of that agent's memory.md first. It never writes that agent's
memory, inbox or folder. The orchestrator cannot be cloned.

**The switch.** The human allows temps under Settings, Autonomy & Budgets. It is ON by default (0.5.3); the
human can turn it off, and it caps how many run at once. While it is off your request
is neither failed nor deleted: it waits in \`spawn-requests/\` and runs when the switch is turned on. A
request that has not moved means the switch is off; raise it with the human instead of retrying. When
the human sets a temp as the receiver of an inbound (Slack, a webhook, a scheduled mission), the
harness starts those temps itself, switch or not; when no temp slot frees in
2 minutes the message comes to you instead. Route work to an agent already on the floor first either way.

## Starting a temp (any agent)
Any lasting agent may start a temp for a side job. Write ONE JSON file into
\`agents/<your-id>/spawn-requests/<id>.json\` with the same fields as above; \`objective\` and \`cwd\` are
required. \`cloneOf\` with your own id makes a copy of you. Use a new id each time. The request moves to
\`.done/\` in that folder once the temp starts, or to \`.failed/\` with a reason.

The temp gets its own git worktree and sends its \`done\` to you. When it ends the app removes its
folder: anything it had not committed is committed to its branch first, the branch is kept when it holds
work, and files git ignores are gone with the folder. The report to you names the branch; you merge it.

The human sets how many temps one agent may run at once (Temps per agent, 2 unless changed; 0 means
agents cannot start temps). A request over a limit, or made while the switch above is off, waits in the
folder. A temp cannot start a temp.

## Capabilities
Your skills are copied into \`agents/<your-id>/.claude/skills/\` when you start. Read
\`capabilities/SKILL.md\` there once (or run \`/capabilities\`): it lists the date skills (\`/today\`,
\`/lastWeek\`, \`/last30Days\`, \`/lastQuarter\` and more), which resolve any time window so you never
compute dates by hand, and the integrations reached through the loopback broker. Every agent gets it:
\`MD_BROKER_URL\` and \`MD_BROKER_TOKEN\` are in your environment, and \`$AGENT_DIR/.broker\` holds the
current pair after an app restart: load it into variables, never print it. Without either, ask \`god\`. \`GET $MD_BROKER_URL/i\` with your token
answers \`{"ids":[...]}\`, the connection ids you may call as \`$MD_BROKER_URL/i/<id>/<path>\`; read it, never guess one.

## Engines and models: \`md-models\`
\`md-models\` lists every engine with its models, and which engines are installed and signed in on this computer;
\`md-models --json\` gives every model as JSON. Run it before you name a
"provider" or a "model" in a hire request or a temp's spawn request, and pick an engine that is installed and signed in.

## Usage limits: \`md-limits\`
\`md-limits\` prints each engine's usage limits, only the windows it reports (Claude Code, Codex, Antigravity, OpenCode):
percent used, when the window resets, and how old the reading is; \`md-limits --json\` gives the same as JSON.
It reads what the app keeps, asks no engine and costs nothing. Run it before a big piece of work, before
starting temps, and when a call fails on a rate limit. At 80% or more a window is NEAR LIMIT: tell \`god\`
rather than start work that would stop half way. "no reading yet" is not zero.

## Semantic memory (optional — when \`mempalace\` is installed)
When \`MEMPALACE_PALACE_PATH\` is set in your environment, the hive shares a
searchable MemPalace and you have the \`md-memory\` command:
- \`md-memory search "<query>"\`: recall relevant past knowledge across the whole
  team by meaning (not just keywords). Add \`--wing <agent-id>\` to scope to one
  agent, \`--results N\` to widen. Run it when a task needs it, not at the start
  of every task: each run loads the search model, and many at once fill memory.
- \`md-memory\` runs \`mempalace\` with the same arguments, one at a time on this
  machine. Use it rather than \`mempalace\` itself. If it says MemPalace is busy,
  carry on without it or try again in a minute.

Your \`memory.md\` is mined into the palace automatically, so the durable facts you
write there become searchable by every agent. You don't run \`mine\` yourself.
`;

const GENERATED_HIVE_DOCS = [
  { filename: 'PROTOCOL.md', contents: PROTOCOL_MD },
  { filename: 'COMMANDS.md', contents: COMMANDS_MD }
] as const;

// ─── cth-hook shim (written to <hive>/bin/cth-hook.cjs) ──────────────────────
// A minimal pipe: read the hook payload on stdin, tag it with this agent's id,
// forward it to the hive's UDS, and relay the response back to `claude`. All the
// real logic lives in the main process (HookServer). Never blocks a stop on error.
export const HOOK_SHIM = `#!/usr/bin/env node
'use strict';
const net = require('net');
const isStatus = process.argv.includes('--status');
// Under the listener's 256 KB frame limit (core/hookServer.ts MAX_HOOK_FRAME_BYTES).
const HOOK_FRAME_ROOM = 200 * 1024;
let data = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (d) => { data += d; });
process.stdin.on('end', () => {
  let payload = {};
  try { payload = JSON.parse(data || '{}'); } catch (_) {}
  if (!payload.agent_id) payload.agent_id = process.env.AGENT_ID || null;
  // What a tool gave back is never read by the app, and an image or a PDF read made the frame 310 to 327 KB,
  // over the listener's 256 KB, so the whole event was refused. It goes nowhere now. A payload still too large (a
  // very long prompt, a tool asked to write a large file) keeps the prompt's end, which proves it was taken, and
  // drops what the tool was asked: the event itself always arrives.
  if (payload && typeof payload === 'object') {
    delete payload.tool_response;
    if (Buffer.byteLength(JSON.stringify(payload)) > HOOK_FRAME_ROOM) {
      delete payload.tool_input;
      if (typeof payload.prompt === 'string') payload.prompt = payload.prompt.slice(-4096);
      if (typeof payload.last_assistant_message === 'string') payload.last_assistant_message = payload.last_assistant_message.slice(-4096);
    }
  }
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

// ─── the frame fit every other engine's script carries ─────────────
// The same rule as HOOK_SHIM's, set into the Gemini, Antigravity, Grok, Pi and proxy scripts: what a tool
// gave back is never read by the app and goes nowhere; a payload still over HOOK_FRAME_ROOM drops what the tool was
// asked and keeps the last 4096 characters of the prompt, the reply and the message; one still over it keeps only
// the fields the listener reads (core/hookServer.ts HookPayload), each string at most its last 4096 characters. So
// the event itself always arrives, under the listener's 256 KB (MAX_HOOK_FRAME_BYTES), with room for the office
// token added after it. In place: the caller's payload object is the one sent. No backticks or dollar braces here,
// it is set into template strings.
export const HOOK_FRAME_FIT = `// Under the listener's 256 KB frame limit (core/hookServer.ts MAX_HOOK_FRAME_BYTES), with room for the office token.
const HOOK_FRAME_ROOM = 200 * 1024;
const HOOK_FRAME_KEEP = ['ping', 'hive_launch_agent', 'hive_hook_token', 'hook_event_name', 'agent_id', 'session_id', 'transcript_path', 'context_window', 'rate_limits', 'cwd', 'tool_name', 'stop_hook_active', 'prompt', 'source', 'notification_type', 'message', 'model', 'agent_type', 'input', 'output', 'cache_read', 'cache_creation'];
// UTF-8 bytes of the frame; counted by hand where a host gives no Buffer (an extension run in a bare context). A
// payload that cannot be written as JSON counts 0: it is left as it is, and its sender drops it as before.
function hookFrameBytes(p) {
  let s;
  try { s = JSON.stringify(p); } catch (e) { return 0; }
  if (typeof s !== 'string') return 0;
  if (typeof Buffer !== 'undefined') return Buffer.byteLength(s);
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x80) n += 1;
    else if (c < 0x800) n += 2;
    else if (c >= 0xd800 && c < 0xdc00) { n += 4; i++; }
    else n += 3;
  }
  return n;
}
function fitFrame(p) {
  if (!p || typeof p !== 'object') return p;
  delete p.tool_response;
  if (hookFrameBytes(p) <= HOOK_FRAME_ROOM) return p;
  delete p.tool_input;
  ['prompt', 'prompt_response', 'last_assistant_message', 'message'].forEach(function (k) {
    if (typeof p[k] === 'string') p[k] = p[k].slice(-4096);
  });
  if (hookFrameBytes(p) <= HOOK_FRAME_ROOM) return p;
  Object.keys(p).forEach(function (k) {
    if (HOOK_FRAME_KEEP.indexOf(k) === -1) delete p[k];
    else if (typeof p[k] === 'string') p[k] = p[k].slice(-4096);
  });
  return p;
}`;

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
/** Seconds agy gives each hook (its default). The shim itself gives up at 5 s. */
const AGY_HOOK_TIMEOUT_S = 30;
export const AGY_HOOK_SHIM = `#!/usr/bin/env node
'use strict';
const net = require('net');
${HOOK_FRAME_FIT}
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
    tool_input: tc.args,
    model: typeof agy.modelName === 'string' ? agy.modelName : undefined
  };
  fitFrame(payload);
  let resp = '';
  const done = () => {
    // Translate the HookServer's Claude-shaped reply into agy's contract. CRITICAL:
    // agy treats ANY object written to stdout as a decision and FAIL-CLOSES (an
    // empty/decision-less object = DENY). So emit JSON ONLY when there's a real
    // directive (deny/block/steer); otherwise write NOTHING — no output = allow.
    // Each event answers in its own words (agy's hooks guide): a tool
    // is refused by "deny" and context goes in as an injected step; "block" is
    // no word of agy's. A Stop writes nothing: the HookServer never keeps an
    // agent going at Stop (its mail waits for the idle delivery).
    let out = null;
    try {
      const r = JSON.parse(resp || '{}');
      const h = r.hookSpecificOutput || {};
      const reason = r.reason || r.stopReason || h.permissionDecisionReason || undefined;
      if (event === 'PreToolUse') {
        if (r.decision === 'block' || h.permissionDecision === 'deny' || r.continue === false) out = { decision: 'deny', reason: reason };
      } else if (event === 'PreInvocation' || event === 'PostInvocation' || event === 'SessionStart') {
        const steps = h.additionalContext ? [{ ephemeralMessage: h.additionalContext }] : [];
        if (event === 'PostInvocation' && r.continue === false) out = { injectSteps: steps, terminationBehavior: 'terminate' };
        else if (steps.length) out = { injectSteps: steps };
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

// ─── pi bridge extension (written to <agentDir>/.pi-agent/extensions/) ───────
// A bundled extension for Pi (earendil-works). Pi exposes a pi.on(event,…)
// lifecycle; this posts cth-hook-shaped payloads to HIVE_SOCK on tool_call /
// tool_result / agent_end and AUTO-APPROVES tool calls when the floor is in auto
// mode (HIVE_AUTO_APPROVE, gated by config.autoMode — Pam guardrail #5). The
// agent_end→Stop keeps the harness status in step (→ idle) so the renderer idle
// inbox-wake nudge can deliver mail. Fully wrapped so a wrong API guess can never
// break the spawn. LIVE-UNVERIFIED (Pi's exact extension surface needs BYOK keys).
export const PI_EXTENSION = `'use strict';
var net = require('node:net');
${HOOK_FRAME_FIT}
var SOCK = process.env.HIVE_SOCK;
var AGENT = process.env.AGENT_ID || null;
var AUTO = process.env.HIVE_AUTO_APPROVE === '1';
function post(payload) {
  try {
    if (!SOCK) return;
    payload.agent_id = payload.agent_id || AGENT;
    fitFrame(payload);
    var c = net.createConnection(SOCK, function () { try { c.end(JSON.stringify(payload) + '\\n'); } catch (e) {} });
    c.on('error', function () {});
  } catch (e) {}
}
function firstDefined(primary, fallback) {
  return primary !== undefined && primary !== null ? primary : fallback;
}
function piField(ev, key) {
  try { return ev == null ? undefined : ev[key]; } catch (e) { return undefined; }
}
function piToolName(ev) {
  var tool = piField(ev, 'tool');
  return firstDefined(piField(ev, 'toolName'), firstDefined(piField(ev, 'name'), piField(tool, 'name')));
}
function piToolInput(ev) {
  return firstDefined(piField(ev, 'input'), piField(ev, 'args'));
}
function piToolPayload(hookEventName, ev) {
  return {
    hook_event_name: hookEventName,
    tool_name: piToolName(ev),
    tool_input: piToolInput(ev)
  };
}
function register(pi) {
  if (!pi || typeof pi.on !== 'function') return false;
  try {
    pi.on('tool_call', function (ev) {
      post(piToolPayload('PreToolUse', ev));
      if (AUTO) { try { if (ev && typeof ev.approve === 'function') ev.approve(); } catch (e) {} return { approve: true }; }
      return undefined;
    });
    pi.on('tool_result', function (ev) { post(piToolPayload('PostToolUse', ev)); });
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
// after + session.idle, and chat.message as UserPromptSubmit (the proof a
// typed line was sent). The session.idle→Stop keeps status in step (→ idle) so the
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
    },
    // The line OpenCode took, said as Claude's UserPromptSubmit says it. Without it nothing proved a line
    // typed into OpenCode was sent: the queue row stayed, and mail typed after it was held. The words typed (its text parts), not what OpenCode adds of its own (synthetic).
    // Only the end is sent: the app reads a prompt's last words, and a long paste stays under the frame limit.
    'chat.message': async (input, output) => {
      try {
        const parts = output && Array.isArray(output.parts) ? output.parts : [];
        const text = parts.filter((p) => p && p.type === 'text' && typeof p.text === 'string' && !p.synthetic && !p.ignored).map((p) => p.text).join('\\n');
        if (text) post({ hook_event_name: 'UserPromptSubmit', prompt: text.slice(-4096) });
      } catch (e) {}
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
export const PROXY_BRIDGE_SHIM = `#!/usr/bin/env node
'use strict';
const http = require('http');
const https = require('https');
const net = require('net');
const { URL } = require('url');
${HOOK_FRAME_FIT}

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
  fitFrame(payload);
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
export const GEMINI_HOOK_SHIM = `#!/usr/bin/env node
'use strict';
const net = require('net');
${HOOK_FRAME_FIT}
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
  // AfterTool carries the whole tool result (an image or PDF read is its base64): never read here, so never sent.
  fitFrame(payload);
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
export const GROK_HOOK_SHIM = `#!/usr/bin/env node
'use strict';
const net = require('net');
${HOOK_FRAME_FIT}
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
  fitFrame(payload);
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
