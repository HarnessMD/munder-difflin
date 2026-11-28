import type { IntegrationActivityItem, IntegrationActivityKey } from '../shared/integrationActivity';
import { contextBridge, ipcRenderer, webUtils, type IpcRendererEvent } from 'electron';
import type { AttachWant } from '../shared/attachDialog';
import type { AgentProvider } from '../shared/agentProvider';
import type { SubmitResult } from '../shared/providerAutomation';
import type { CliMissingState } from '../shared/cliMissing';
import type { CliSetupState } from '../shared/cliSetup';
import type { LoginEvent } from '../shared/cliLogin';
import type { HireManifest } from '../shared/hire';
import type { AvatarRecipe, CustomAvatar } from '../shared/avatars';
import type { FloorState } from '../shared/hivePicker';
export type { HireManifest } from '../shared/hire';
import type { IntegrationRecord, IntegrationTemplate } from '../shared/integrations';
export type { IntegrationRecord, IntegrationTemplate } from '../shared/integrations';
import type { UpdateStatus } from '../shared/updateState';
export type { UpdateStatus } from '../shared/updateState';
import type { ToolStatus } from '../shared/toolCatalog';
import type { WorktreeDeleteRefusal, WorktreeRow, WorktreeWork } from '../shared/worktreeList';
export type { ToolStatus } from '../shared/toolCatalog';
import type { HeroPayload } from '../shared/heroPayload';
export type { HeroPayload } from '../shared/heroPayload';
import type { ModelCatalog } from '../shared/modelCatalogPayload';
export type { ModelCatalog, CatalogModel } from '../shared/modelCatalogPayload';
import type { HookEvent } from '../shared/hookEvents';
export type { HookEvent } from '../shared/hookEvents';
import type { LocalSkill, CatalogSkill } from '../main/skills';
export type { LocalSkill, CatalogSkill } from '../main/skills';
import type {
  ContextRule, ContextTriggerConfig, TriggerHistoryEntry, WebhookTrigger
} from '../shared/triggers';
export type {
  ContextRule, ContextTriggerConfig, TriggerHistoryEntry, WebhookTrigger
} from '../shared/triggers';
import type { SlackHistoryEntry } from '../shared/slackHistory';
import type { SlackConfigPatch, SlackMode, SlackStatus, SlackTestDraft, SlackTestResult, SlackTriage } from '../shared/slackMode';
import type { WorkerHistoryEntry } from '../shared/workerHistory';
import type { TaskHygieneConfig } from '../shared/taskHygiene';
import type { GraphicsMode, GraphicsStatusView } from '../shared/graphicsMode';
import type { HistoryPage, HistoryRequest } from '../shared/history';
import type { CodexHeldState, CodexWaitingFolder } from '../shared/codexFolders';

/** Renderer-visible integration record: the secretRef handle is redacted to a
 *  presence boolean. Matches main `integrations.listRecordsRedacted()` — the
 *  write-only secret contract (spec §2): a secret value is NEVER returned over IPC. */
export type IntegrationRecordView = Omit<IntegrationRecord, 'secretRef'> & { hasSecret: boolean };

// Injected at build time from package.json (see electron.vite.config.ts).
declare const __APP_VERSION__: string;

/** The renderer's roster as mirrored to `<harnessHome>/roster.json`. The agent
 *  entries stay `unknown` here for the same reason main leaves them opaque: the
 *  store owns that shape, and repeating it in the bridge would mean editing two
 *  files every time an agent gains a field. */
export interface RosterSnapshot {
  version: 1;
  savedAt: string;
  agents: unknown[];
  archived: unknown[];
  restorable: unknown[];
  queues: Record<string, unknown[]>;
  selectedId: string | null;
}

export interface HiveAgentMeta {
  id: string;
  name: string;
  /** Which CLI this agent runs on (claude/codex/grok/antigravity/custom); defaults claude. */
  provider?: AgentProvider;
  role?: string;
  capabilities?: string[];
  cwd: string;
  isGod?: boolean;
  /** Michael's prep assistant — send-only; enriches prompts and forwards them. */
  isAssistant?: boolean;
}

export interface HiveMessage {
  id: string;
  conversation: string;
  in_reply_to: string | null;
  from: string;
  to: string;
  act: 'request' | 'inform' | 'propose' | 'query' | 'agree' | 'refuse' | 'done' | 'note';
  subject: string;
  body: string;
  hops: number;
  requires_reply: boolean;
  needs_human: boolean;
  created_at: string;
  /** The piece of work this belongs to (0.5.6), when its sender named one. */
  work?: string;
}

/** A hive message reshaped for the voice read-layer (`hive:messages`). `subject`
 *  and `body` are REDACTED in the main process before crossing this boundary —
 *  the renderer never receives a raw body or a secret. Mirror of `VoiceMessage`
 *  in src/main/hive.ts. */
export interface VoiceMessage {
  id: string;
  conversation: string;
  from: string;
  to: string;
  act: HiveMessage['act'];
  subject: string;
  body: string;
  requires_reply: boolean;
  direction: 'inbox' | 'outbox';
  owner: string;
  archived: boolean;
  created_at: string;
}

export interface HiveRegistry {
  godId: string | null;
  /** `archived` agents have had their terminal closed — retained + flagged, not
   *  deleted; only live-PTY agents are 'active'. */
  agents: Record<string, HiveAgentMeta & {
    status: string;
    lastSeen: number;
    archived?: boolean;
    sessionId?: string;
  }>;
}

/** One row of the consolidated voice read-layer directory (`hive:agentDirectory`):
 *  everything the office-floor sidebar + telemetry know for an agent, joined into
 *  one PII-free record. Includes archived agents. */
export interface AgentDirectoryEntry {
  id: string;
  name: string;
  role: string;
  provider: string;
  /** Live model id (normalized), if any usage has been recorded — else null. */
  model: string | null;
  status: string;
  cwd: string | null;
  /** Whether `cwd` is an absolute, existing directory (spawn-usable). */
  cwdValid: boolean | null;
  archived: boolean;
  /** No terminal and nobody chose that (0.5.8): restored at the next launch. */
  stopped: boolean;
  isGod: boolean;
  isAssistant: boolean;
  sessionId: string | null;
  /** Whether the agent has recorded non-trivial memory beyond the seed header. */
  hasMemory: boolean;
  inboxBacklog: number;
  breaker: string;
  tokens: number;
  /** Aggregate spend; carried for completeness — the voice layer speaks tokens. */
  usd: number;
  lastTool: string | null;
  lastActiveSecAgo: number | null;
  contextTokens: number | null;
  contextLimit: number | null;
  contextPct: number | null;
}

export interface AgentDirectory {
  godId: string | null;
  agents: AgentDirectoryEntry[];
}

/** One question→answer exchange with the human, recorded ON the task card. */
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

/** A card on the task kanban, persisted to hive/tasks.json. */
export interface HiveTask {
  id: string;
  title: string;
  description?: string;
  assignee?: string;
  status: 'todo' | 'doing' | 'blocked' | 'done';
  dependsOn: string[];
  priority: number;
  createdAt: string;
  /** First-class human feedback: god appends {q}, the harness UI fills {a};
   *  the full history stays on the card. */
  humanQA?: HumanQA[];
  /** Outcome summary used for the Slack done-notification. */
  result?: string;
  /** Origin thread for a Slack-sourced task (drives the done-summary reply). */
  slack?: { channel: string; thread_ts: string };
  /** SHA-256 of the capability token for a generic-webhook-sourced task (drives
   *  the GET status lookup; the raw token is never persisted). */
  webhook?: { tokenHash: string };
}

/** A message the router just delivered, with its resolved recipient ids. Drives
 *  the envelope-handoff animation on the office floor. `needsHuman` is set when
 *  the sender aimed at "human" (now routed to the god proxy) — cosmetic tint
 *  only; there is no approval queue. */
export interface HiveRouteEvent {
  id: string;
  from: string;
  to: string;
  act: 'request' | 'inform' | 'propose' | 'query' | 'agree' | 'refuse' | 'done' | 'note';
  subject: string;
  targets: string[];
  needsHuman: boolean;
}

/** A direct hive message addressed to a provider that cannot drain hive inbox.
 *  The renderer turns this into a queued terminal work order for that agent. */
export interface HiveTerminalHandoffEvent {
  id: string;
  from: string;
  to: string;
  act: 'request' | 'inform' | 'propose' | 'query' | 'agree' | 'refuse' | 'done' | 'note';
  subject: string;
  body: string;
  requiresReply: boolean;
  createdAt: string;
}

export interface SpawnPtyOptions {
  id: string;
  cwd: string;
  command: string;
  /** Which CLI to spawn; usually inferred from `command` in the main process. */
  provider?: AgentProvider;
  args?: string[];
  cols?: number;
  rows?: number;
  /** When present, the agent is provisioned in the hive at spawn. */
  hive?: HiveAgentMeta;
  /** When true (and cwd is a git repo), spawn the agent in its own git worktree. */
  isolate?: boolean;
  /** When true, continue the agent's prior CLI session if one was recorded
   *  (provider-aware: Claude/Grok `--resume`, Antigravity `--conversation`). For
   *  Claude the main process looks up the session id from the hive registry and
   *  seeds its transcript into the cwd's project dir (#1 — restore on restart). */
  resume?: boolean;
  /** Fail before spawning when a requested resume cannot be attached. */
  requireResume?: boolean;
  /** Explicit Claude session id to resume (#2 — Add Agent "resume session"). The
   *  main process seeds that session's `.jsonl` into the target cwd's project dir
   *  (copying it from wherever it lives) and launches `claude --resume <id>`. */
  resumeSessionId?: string;
}

export interface PtyExit { exitCode: number; signal?: number | undefined }

/** A recurring auto-dispatched mission fired on an interval by the scheduler. */
export interface ScheduledMission {
  id: string;
  label: string;
  intervalMs: number;
  to: string;
  body: string;
  enabled: boolean;
  autoCompact?: boolean;
  lastFiredAt?: number;
  /** Mission flavor; 'heartbeat' (Lane A #1) is a context-aware adaptive beat. */
  kind?: 'dispatch' | 'heartbeat' | 'compact';
  /** Heartbeat only: floor-quiet threshold in ms. */
  quietThresholdMs?: number;
  /** The agent that made it through a connections request (0.5.5). */
  createdBy?: string;
}

/** Circuit-breaker thresholds (Lane A #6.6b). Mirrors src/main/config.ts. */
export interface KnowledgeGraphConfig {
  enabled?: boolean;
  rootPath?: string;
}

export interface CircuitBreakerConfig {
  enabled?: boolean;
  hardStop?: boolean;
  repeatedToolLimit?: number;
  errorStormLimit?: number;
  tokenVelocityPerMin?: number;
}

export interface HarnessConfig {
  onboardingComplete: boolean;
  /** Onboarding audience ('technical' | 'non-technical'); drives onboarding copy.
   *  Mirrors src/main/config.ts. */
  audience?: 'technical' | 'non-technical';
  harnessHome: string | null;
  /** Recently-opened hive home folders (most-recent first). Mirrors src/main/config.ts. */
  recentHives?: string[];
  /** Skip the launch-time hive picker and reopen harnessHome (#595). Mirrors
   *  main + renderer HarnessConfig. */
  openLastHiveOnLaunch?: boolean;
  registeredRepos: string[];
  autoMode: boolean;
  /** May the orchestrator start agents on its own? Default false. Mirrors
   *  src/main/config.ts; written by Settings and the orchestrator's screen. */
  orchestratorMaySpawn?: boolean;
  /** How many ephemeral workers may run at once. Default 4. Mirrors
   *  src/main/config.ts; written by the orchestrator's Budget & breaker tab. */
  maxConcurrentWorkers?: number;
  maxTempsPerAgent?: number;
  defaultCommand: string;
  defaultModel?: string;
  /** Which provider+model powers the GOD orchestrator ("Michael"). Default
   *  'claude' / 'claude-opus-5-5'. Mirrors src/main/config.ts. */
  godProvider?: AgentProvider;
  godModel?: string;
  /** A hand edited orchestrator command (0.5.3 bug 20). Wins over the line
   *  derived from godProvider and godModel; see shared/godCommand.ts. */
  godCommand?: string;
  /** Per-server consent for the default MCP bundle, keyed by catalog id. Mirrors
   *  src/main/config.ts. */
  mcpDefaults?: { [id: string]: { enabled: boolean } };
  semanticMemory: boolean;
  embeddingModel: 'minilm' | 'embeddinggemma';
  missions?: ScheduledMission[];
  opsStandupSeeded?: boolean;
  heartbeatSeeded?: boolean;
  notifications?: boolean;
  /** Opt-in strong keep-alive (prevent-display-sleep). Mirrors main + renderer
   *  HarnessConfig so updateConfig({ strongKeepalive }) is typed across the bridge. */
  strongKeepalive?: boolean;
  /** Keep my agent order and the saved sidebar order. Mirrors src/main/config.ts. */
  keepAgentOrder?: boolean;
  agentOrder?: string[];
  projectOrder?: string[];
  /** Custom avatars from the sprite editor. Mirrors src/main/config.ts. */
  avatars?: CustomAvatar[];
  /** Update notice from GitHub releases (default ON; Settings → General). */
  autoUpdate?: boolean;
  /** Anonymous product analytics (default ON, opt-out; see TELEMETRY.md).
   *  Mirrors main + renderer HarnessConfig. */
  telemetryEnabled?: boolean;
  slackEnabled?: boolean;
  slackSigningSecret?: string;
  slackBotToken?: string;
  slackChannelId?: string;
  slackPort?: number;
  slackProactivePosting?: boolean;
  slackMode?: SlackMode;
  slackAppToken?: string;
  slackPollSeconds?: number;
  slackSocketCatchupSeconds?: number;
  slackTempCwd?: string;
  /** @deprecated 0.5.2: read by nothing; see `responder`. */
  slackTriage?: SlackTriage;
  /** 0.5.2: who answers an inbound message, an agent id; unset or '' is the
   *  orchestrator. Mirrors src/main/config.ts. */
  responder?: string;
  /** 0.5.3: the agent a webhook call goes to when its endpoint names none. */
  webhookResponder?: string;
  webhookEnabled?: boolean;
  webhookSecret?: string;
  webhookPort?: number;
  /** Realtime Michael voice loop — true ONLY while a session holds the mic
   *  (renderer session sets it at start()/stop()); the main mic permission gate
   *  reads it. Default off. */
  realtimeVoiceEnabled?: boolean;
  /** Realtime voice idle auto-disconnect (ms); default 180000 (3 min), 0 = never.
   *  Tuned in Settings → Realtime Michael; the cost cap stays the runaway guard. */
  realtimeIdleDisconnectMs?: number;
  costCapUsd?: number;
  /** 0.5.6: token limits per period (shared/tokenLimits). */
  tokenLimits?: import('../shared/tokenLimits').TokenLimits;
  /** Each agent's own token cap (agent id to work tokens); written only through `setAgentTokenCap`. */
  agentTokenCaps?: Record<string, number>;
  /** Per-agent MCP overrides (see shared/agentMcp.ts). */
  agentMcp?: Record<string, Record<string, { enabled: boolean }>>;
  /** Skills turned off per agent, agent id → skill folder names (shared/agentSkills.ts). */
  agentSkillsOff?: Record<string, string[]>;
  /** The Codex agents whose own memories are copied into search (shared/codexMemory.ts). */
  agentCodexMemoryOn?: string[];
  autoDeliveryPausedAgents?: string[];
  maxTurns?: number;
  circuitBreaker?: CircuitBreakerConfig;
  /** Enterprise Knowledge Graph (multimodal context for agents). Default OFF. */
  knowledgeGraph?: KnowledgeGraphConfig;
  /** Terminal theme, mirrored into each agent's per-session Claude settings. */
  terminalTheme?: 'light' | 'dark';
  /** The season the office is dressed for (0.5.5); unset means 'halloween'. */
  seasonalTheme?: 'halloween' | 'none';
  /** Settings, Graphics: 'auto' (absent), 'gpu' or 'cpu'; applies on the next start. */
  graphicsMode?: GraphicsMode;
  /** The project `.codex` folders a person allowed for hive Codex agents. */
  codexLayerOptIns?: string[];
  /** Per-CLI-provider local/self-hosted base URL (Ollama/LM Studio/vLLM, …) for the
   *  OpenCode/Crush/pi/qwen engines; applied at spawn. API KEYS are NOT stored here —
   *  they live write-only in the secret broker. */
  providerBaseUrls?: Partial<Record<AgentProvider, string>>;
  /** Per-CLI-provider default model slug, used to pre-fill the model picker. */
  providerDefaultModels?: Partial<Record<AgentProvider, string>>;
  /** Hygiene sweep thresholds (v0.4.9 W-A). Mirrors main + renderer
   *  HarnessConfig so updateConfig({ taskHygiene }) is typed across the bridge. */
  taskHygiene?: Partial<TaskHygieneConfig>;
  /** 0.5.3: ticket key prefix (V53); see main config.ts. */
  ticketPrefix?: string;
  /** The standing house response style brief (v0.4.10). Mirrors main + renderer
   *  HarnessConfig so updateConfig({ responseStyle }) is typed across the bridge. */
  responseStyle?: string;
  /** Claude Code's own output style for the agents this app starts (0.5.3
   *  feature 19). Unset means Concise; 'default' turns it off. */
  claudeOutputStyle?: string;
}

export interface MemoryStatus {
  available: boolean;
  enabled: boolean;
  active: boolean;
  initialized: boolean;
  palacePath: string | null;
  model: 'minilm' | 'embeddinggemma';
  bin: string | null;
}

/** Enterprise Knowledge Graph — corpus status, one document, and a search hit. */
export interface KnowledgeStatus {
  enabled: boolean;
  root: string;
  docCount: number;
  chunkCount: number;
  byModality: Record<string, number>;
}
export interface KnowledgeDoc {
  id: string;
  title: string;
  source: string;
  modality: string;
  mime: string | null;
  origExt: string;
  bytes: number;
  tags: string[];
  caption: string | null;
  chunkCount: number;
  addedAt: string;
  extractor: string;
  truncated: boolean;
}
export interface KnowledgeHit {
  docId: string;
  title: string;
  source: string;
  modality: string;
  chunkIdx: number;
  score: number;
  snippet: string;
}
export interface KnowledgeIngestResult {
  ok: boolean;
  results: Array<{ ok: boolean; srcPath: string; docId?: string; chunkCount?: number; error?: string }>;
  error?: string;
}

export interface DirEntry {
  name: string;
  isDir: boolean;
  size: number;
  mtime: number;
}

/** One match from a repo-wide search (0.4.9 phase 9). `line` and `col` are
 *  1-based so they can be handed straight to the editor, and `length` comes
 *  from the matcher so the renderer never re-runs the pattern and disagrees
 *  with main about what matched. */
export interface SearchHit {
  rel: string;
  line: number;
  col: number;
  text: string;
  length: number;
}

/** What a file operation answers with. `rel` is where the thing ended up,
 *  which is not always where it was asked to go (a rename normalises). */
export type FsOpResult = { ok: true; path: string; rel: string } | { ok: false; error: string };

export interface GitCommit {
  sha: string;
  shortSha: string;
  parents: string[];
  subject: string;
  author: string;
  time: number;
  refs: string[];
}
export interface GitStatusEntry { path: string; index: string; worktree: string }
export interface GitStatus { staged: GitStatusEntry[]; unstaged: GitStatusEntry[]; untracked: string[] }
/** A single file's two sides for a working-tree-vs-HEAD diff (see main git.getDiff). */
export interface GitDiff {
  ok: true;
  path: string;
  relPath: string;
  head: string;
  working: string;
  headExists: boolean;
  workingExists: boolean;
  isBinary: boolean;
}

/** v0.3.4 git visualization — mirrors src/main/git.ts GitCommit / GitCommitFile. */
export interface GitCommitRow {
  sha: string;
  shortSha: string;
  parents: string[];
  subject: string;
  author: string;
  time: number;
  refs: string[];
}
export interface GitFileChange {
  path: string;
  status: string;
  oldPath?: string;
}

/** Real token usage + estimated USD cost summed from an agent's Claude Code
 *  transcripts under ~/.claude/projects. Reconciler/fallback path — now priced
 *  PER MODEL (not Sonnet-for-everyone). The live path uses AgentUsageSample. */
export interface AgentUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  estimatedCostUsd: number;
  /** Most-recently-seen model id (normalized), if any priced record was found. */
  model?: string;
}

/** Live cumulative cost/token snapshot from the OTel collector (the locked
 *  cross-lane seam). PII-free by construction. Mirrors telemetry.ts. */
export interface AgentUsageSample {
  agentId: string;
  sessionId: string;
  ts: number;
  input: number;
  output: number;
  cacheRead: number;
  cacheCreation: number;
  model: string;
  usd: number;
}

/** One tool invocation for the per-agent span waterfall (#7B.2). Ephemeral. */
export interface ToolSpan {
  agentId: string;
  sessionId: string;
  ts: number;
  tool: string;
  success: boolean;
  durationMs: number;
  decision?: 'accept' | 'reject';
  error?: string;
}

/** Power-resume signal (mirrors the emitter in src/main). Fired after the Mac
 *  wakes from sleep / unlocks: `dead` lists PTY ids that were live before sleep
 *  but emitted nothing after resume (wedged terminals); `total` is how many were
 *  checked. The renderer auto-respawns exactly the `dead` ids. */
export interface PowerResumeEvent {
  reason: string;
  awayMs: number | null;
  dead: string[];
  total: number;
}

/** Per-agent operator-control state (#7C.1–7C.3). */
export interface AgentControlSnapshot {
  paused: boolean;
  halted: boolean;
  autoDeliveryPaused: boolean;
  gatedTools: string[];
  pendingSteers: number;
}

/** Circuit-breaker state (Lane A #6 → this lane's avatars/meter). */
export interface BreakerState {
  agentId: string;
  level: 'healthy' | 'steering' | 'constrained' | 'stopped';
  reason: string;
  ts: number;
}

/** Live telemetry push payload (channel `telemetry:event`). */
export type TelemetryEvent =
  | { kind: 'usage'; sample: AgentUsageSample }
  | { kind: 'tool_result'; span: ToolSpan }
  | { kind: 'api_error'; agentId: string; sessionId: string; ts: number; error: string };

/** Cold-start backfill from the collector. */
export interface TelemetrySnapshot {
  usage: AgentUsageSample[];
  spans: Record<string, ToolSpan[]>;
}

/** One captured user prompt from the SQLite command_history table. */
export interface CommandHistoryEntry {
  id: number;
  agentId: string;
  cwd: string | null;
  text: string;
  ts: number;
}

/** A GitHub issue, normalized for the renderer (labels/assignees flattened to names). */
export interface GHIssue {
  number: number;
  title: string;
  body: string;
  url: string;
  labels: string[];
  assignees: string[];
}

/** A CI (GitHub Actions) workflow run, normalized for the renderer. */
export interface CIRun {
  name: string;
  status: string;
  conclusion: string | null;
  url: string;
}

/** One live god-triggered ephemeral worker, as shown in the Workers tab. */
export interface WorkerSnapshot {
  job?: string;
  model?: string;
  effort?: string;
  workerId: string;
  reqId: string;
  name: string;
  baseBranch: string;
  spawnedAt: number;
  ageMs: number;
  idleMs: number | null;        // null = PTY already gone
  tokensUsed: number;
  tokenCap: number | null;      // effective cap; null = unlimited (the default)
  hasSlack: boolean;
  releasing: boolean;
  status: 'releasing' | 'working';
}
/** A worker worktree preserved at teardown, awaiting integration + GC. */
export interface PreservedWorktreeSnapshot {
  workerId: string;
  wtPath: string;
  baseBranch: string;
  preservedAt: number;
}

const api = {
  version: __APP_VERSION__,

  // ─── Analytics ───────────────────────────────────────────────────────────
  /** Count ONE human-sent message (TELEMETRY.md → `message_sent`). Carries a
   *  surface name and nothing else — no text, no length, no agent id — and main
   *  accepts only 'terminal' and 'composer' here (steer and hive are counted in
   *  main, at their own handlers). Never awaited by callers and never allowed to
   *  throw: a telemetry hiccup must not break sending a message. */
  trackMessageSent: (surface: 'terminal' | 'composer'): Promise<void> =>
    ipcRenderer.invoke('analytics:messageSent', surface).then(() => undefined, () => undefined),

  // ─── PTY ─────────────────────────────────────────────────────────────────
  /** `cwd` in the result is the TILDE-EXPANDED absolute path main actually spawned
   *  into — the renderer stores that, not the raw `~/…` the user typed. */
  /** `cliMissing` (I2, 0.5.3): the engine binary is not installed, nothing was
   *  spawned, and the terminal draws the card; the agent still exists. */
  /** `codexFolders`: a hive Codex start held, nothing spawned,
   *  until the person allows these project `.codex` folders (codexAllowFolder). */
  spawnPty: (opts: SpawnPtyOptions): Promise<{ ok: boolean; error?: string; cwd?: string; worktreePath?: string; resumeNotFound?: boolean; resumed?: boolean; seedPrompt?: string; cliMissing?: CliMissingState; codexFolders?: string[] }> =>
    ipcRenderer.invoke('pty:spawn', opts),
  /** Allow the folders this pty's held Codex start named, and start
   *  it. The result is the spawn's. */
  codexAllowFolder: (id: string): Promise<{ ok: boolean; error?: string; cwd?: string; worktreePath?: string; resumeNotFound?: boolean; resumed?: boolean; seedPrompt?: string; cliMissing?: CliMissingState; codexFolders?: string[] }> =>
    ipcRenderer.invoke('codex:allowFolder', id),
  /** This pty's Codex start is held for these folders (the card over
   *  the terminal), or null once it is allowed, stopped or no longer needed. */
  onCodexHeld: (id: string, cb: (state: CodexHeldState | null) => void): (() => void) => {
    const channel = `pty:codex-folders:${id}`;
    const listener = (_e: IpcRendererEvent, state: CodexHeldState | null) => cb(state);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
  /** The held card for a terminal opened after the push above. */
  codexHeldFolders: (id: string): Promise<CodexHeldState | null> =>
    ipcRenderer.invoke('codex:heldFolders', id),
  /** Settings, Agents & Models: the Codex folders allowed so far. */
  codexAllowedFolders: (): Promise<string[]> => ipcRenderer.invoke('codex:allowedFolders'),
  /** Withdraw one folder's OK (from each agent's next start); resolves to the list left. */
  codexWithdrawFolder: (folder: string): Promise<string[]> => ipcRenderer.invoke('codex:withdrawFolder', folder),
  /** Folders a start with no card (a temp, a voice hire) waits on,
   *  each with its OK key and what the card would show. */
  codexWaitingFolders: (): Promise<CodexWaitingFolder[]> => ipcRenderer.invoke('codex:waitingFolders'),
  /** Allow one waiting folder by its `folder` key; anything not on the list is
   *  'not-waiting'. Starts nothing: whoever asked starts the agent again. */
  codexAllowWaitingFolder: (folder: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('codex:allowWaitingFolder', folder),
  /** The card's button: run the install the card named in this terminal, or
   *  check again for a CLI installed by hand. The pty restarts alone. */
  installCli: (id: string): Promise<{ ok: boolean; error?: string; cliMissing?: CliMissingState }> =>
    ipcRenderer.invoke('pty:installCli', id),
  sleepScreen: (id: string): Promise<string> => ipcRenderer.invoke('pty:sleepScreen', id),
  writePty: (id: string, data: string, wake = true): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('pty:write', id, data, wake),
  resizePty: (id: string, cols: number, rows: number): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('pty:resize', id, cols, rows),
  redrawPty: (id: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('pty:redraw', id),
  /** `why` tells main who is ending it (0.5.3). Leave it out for a person
   *  stopping the agent. 'restart' and 'revive' keep the agent's worktree, since
   *  it is about to be started in it again; 'sweep' is a bulk teardown;
   *  'archive' is a person archiving the agent, which asks git so a work folder with
   *  uncommitted changes is kept. Main treats anything else as a person, so this
   *  can only make a kill safer. */
  killPty: (id: string, why?: 'restart' | 'revive' | 'sweep' | 'archive'): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('pty:kill', id, why),
  listPtys: (): Promise<Array<{
    id: string;
    cwd: string;
    command: string;
    pid: number;
    lastOutputAt: number;
    hasOutput: boolean;
    /** The process grid (autosend, 0.5.5). */
    cols?: number;
    rows?: number;
  }>> =>
    ipcRenderer.invoke('pty:list'),
  /** Type a message into an agent's terminal and submit it, through main's
   *  one serial submitter per terminal (autosend, 0.5.5). `ok: false` means the
   *  terminal is gone, never became ready, or a write failed. */
  submitToPty: (req: {
    ptyId: string;
    agentId?: string;
    provider: AgentProvider;
    text: string;
    source: 'queue' | 'seed' | 'god-boot' | 'remote-control';
    settleMs?: number;
    pressOnly?: boolean;
    idle?: boolean;
    /** A person's words (QueuedMessage.person), for main/founderTurn.ts. */
    person?: boolean;
    /** The queued message's id, which the cross on its row withdraws. */
    ref?: string;
  }): Promise<{ ok: boolean; error?: string; result?: SubmitResult; sent?: true }> =>
    ipcRenderer.invoke('pty:submit', req),
  /** The cross on a queued row: main never types or presses a send it already has for that message. */
  withdrawPtySubmit: (ref: string): Promise<boolean> => ipcRenderer.invoke('pty:withdraw', ref),
  /** Main asks about one terminal while it submits: its screen (only when the
   *  terminal's grid equals the process grid `cols` by `rows`) and whether a
   *  person's draft or menu holds it. The answer goes back with the same id. */
  onTerminalProbe: (cb: (req: { ptyId: string; cols: number; rows: number }) => { lines: string[] | null; safe: boolean; pooled: boolean }): (() => void) => {
    const listener = (_e: IpcRendererEvent, req: { id: number; ptyId: string; cols: number; rows: number }) => {
      let out: { lines: string[] | null; safe: boolean; pooled: boolean } | null = null;
      try { out = cb(req); } catch { out = null; }
      ipcRenderer.send('terminal:probe:reply', { id: req.id, ...(out ?? { lines: null, safe: false, pooled: true }) });
    };
    ipcRenderer.on('terminal:probe', listener);
    return () => ipcRenderer.removeListener('terminal:probe', listener);
  },
  /** Main typed the first byte of a submit into this terminal: the send has left the queue's wait. */
  onPtyBegan: (cb: (ptyId: string) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, v: { ptyId?: unknown } | undefined) => { if (typeof v?.ptyId === 'string') cb(v.ptyId); };
    ipcRenderer.on('pty:began', listener);
    return () => ipcRenderer.removeListener('pty:began', listener);
  },
  /** This window went off screen or came back (floor pause, 0.5.5): main sends
   *  it on minimize, restore, hide, show and focus, to this window only. */
  onWindowVisibility: (cb: (v: { hidden: boolean }) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, v: { hidden: boolean }) => cb(v);
    ipcRenderer.on('window:visibility', listener);
    return () => ipcRenderer.removeListener('window:visibility', listener);
  },
  /** The first read of this window's visibility. Subscribe first, then ask. */
  getWindowVisibility: (): Promise<{ hidden: boolean }> => ipcRenderer.invoke('window:getVisibility'),
  /** The last lines of one terminal for voice Michael (0.5.2). `rows` is what
   *  the renderer's terminal drew for this pty, or empty to let main read the
   *  pty's raw tail; main redacts and scrubs before answering. */
  voiceTerminal: (ptyId: string, rows: string[], lines?: number): Promise<{ ok: boolean; lines: string[]; source: 'screen' | 'stream' | 'none' }> =>
    ipcRenderer.invoke('voice:terminal', ptyId, rows, lines),
  /** Resolve a Claude session id to the cwd it originally ran in (Add Agent
   *  resume auto-fill), or null if the id is invalid/unknown. */
  resolveSessionCwd: (sessionId: string): Promise<string | null> =>
    ipcRenderer.invoke('session:resolveCwd', sessionId),
  onPtyData: (id: string, cb: (data: string) => void): (() => void) => {
    const channel = `pty:data:${id}`;
    const listener = (_e: IpcRendererEvent, data: string) => cb(data);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
  onPtyExit: (id: string, cb: (info: PtyExit) => void): (() => void) => {
    const channel = `pty:exit:${id}`;
    const listener = (_e: IpcRendererEvent, info: PtyExit) => cb(info);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
  /** Fires when an agent is auto restart-and-continued into this SAME pty after a
   *  first-time engine-CLI install. The terminal should re-arm in place (clear the
   *  "process exited" line + re-enable input) so the relaunched CLI paints clean.
   *  `startedFresh`: the CLI refused its resume and the agent starts again with
   *  no session (shared/resumeRetry.ts). */
  onPtyRelaunch: (id: string, cb: (info?: { startedFresh?: boolean }) => void): (() => void) => {
    const channel = `pty:relaunch:${id}`;
    const listener = (_e: IpcRendererEvent, info?: { startedFresh?: boolean }) => cb(info?.startedFresh === true ? { startedFresh: true } : undefined);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
  /** I2 part 2: the CLI in this pty printed its sign in prompt (a link, a
   *  code, a paste back, a key), or the sign in ended. */
  onPtyLogin: (id: string, cb: (e: LoginEvent) => void): (() => void) => {
    const channel = `pty:login:${id}`;
    const listener = (_e: IpcRendererEvent, e: LoginEvent) => cb(e);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
  /** The modal's buttons. open-link opens the link MAIN read from the CLI,
   *  never one the renderer hands over; paste writes a code into the pty;
   *  dismiss closes the modal for this ask. */
  loginAct: (id: string, action: 'open-link' | 'paste' | 'dismiss', text?: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('pty:loginAct', { id, action, text }),
  /** I2: this pty's engine CLI is not installed (or its install just failed);
   *  the terminal draws the card instead of a dead prompt. */
  onPtyCliMissing: (id: string, cb: (state: CliMissingState) => void): (() => void) => {
    const channel = `pty:cli-missing:${id}`;
    const listener = (_e: IpcRendererEvent, state: CliMissingState) => cb(state);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
  /** F3: the push above misses a terminal that was not listening yet (an agent
   *  respawned at app start, a screen opened later). The pool asks once at
   *  acquire whether this pty is paused at the card. */
  cliMissingState: (id: string): Promise<CliMissingState | null> =>
    ipcRenderer.invoke('pty:cliMissingState', id),
  /** Batch 2: installing, or signing in after the install. Null when setup is
   *  over (the agent started, the install failed back to the card). */
  onPtyCliSetup: (id: string, cb: (state: CliSetupState | null) => void): (() => void) => {
    const channel = `pty:cli-setup:${id}`;
    const listener = (_e: IpcRendererEvent, state: CliSetupState | null) => cb(state);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
  cliSetupState: (id: string): Promise<CliSetupState | null> =>
    ipcRenderer.invoke('pty:cliSetupState', id),
  /** "Setup complete, start agent": discards the login terminal and starts
   *  the agent fresh into the same pty. */
  cliSetupStart: (id: string, mode?: 'anyway'): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('pty:cliSetupStart', id, mode),
  /** "Sign in again" after a login that did not finish. */
  cliSetupLogin: (id: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('pty:cliSetupLogin', id),
  /** Batch 4: "Set up manually": a terminal with the agent's own environment
   *  and the provider's command in it (pty:cliSetupManual). */
  cliSetupManual: (id: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('pty:cliSetupManual', id),

  // ─── Dialog ──────────────────────────────────────────────────────────────
  chooseFolder: (): Promise<{ ok: true; path: string } | { ok: false; error: string }> =>
    ipcRenderer.invoke('dialog:chooseFolder'),

  // ─── Terminal.app ────────────────────────────────────────────────────────
  openTerminalAt: (cwd: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('terminal:openAtFolder', cwd),

  // ─── Clipboard ─────────────────────────────────────────────────────────────
  copyToClipboard: (text: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('app:copyToClipboard', text),
  /** Read the system clipboard as plain text ('' when empty/unreadable). */
  readClipboard: (): Promise<string> =>
    ipcRenderer.invoke('app:readClipboard'),
  /** Clipboard text, read SYNCHRONOUSLY. Only for the terminal's paste shortcut,
   *  where an async read loses a race against dictation tools that restore the
   *  previous clipboard right after sending the paste key.
   *
   *  TRADEOFF, stated plainly because sendSync blocks the renderer until main
   *  answers: this app has a history of main-thread stalls (iCloud-evicted files
   *  wedging a spawnSync git call), and during such a stall this call freezes the
   *  paste keystroke rather than merely delaying it. Accepted because a clipboard
   *  read is a memory lookup with no I/O, and because the async alternative is
   *  measurably WRONG — it pastes the user's previous clipboard. Do not reach for
   *  sendSync elsewhere on this reasoning; it is justified by the race, not by
   *  convenience. */
  readClipboardSync: (): string => {
    try { return ipcRenderer.sendSync('app:readClipboardSync') ?? ''; } catch { return ''; }
  },

  // ─── Config ──────────────────────────────────────────────────────────────
  /** Dev builds only: true when launched with `--no-god` / MD_NO_GOD=1, in
   *  which case useHive does not spawn the orchestrator. Always false packaged. */
  devNoGod: (): Promise<boolean> => ipcRenderer.invoke('dev:noGod'),
  getConfig: (): Promise<HarnessConfig> =>
    ipcRenderer.invoke('config:get'),
  /** Settings, agent list or board files that exist but do not read. Each is
   *  kept as it is, `copy` names the copy saved beside it, and writes to it are
   *  paused until it reads again. Empty when all is well. */
  integrityIssues: (): Promise<Array<{ file: string; copy: string | null; error: string }>> =>
    ipcRenderer.invoke('integrity:issues'),
  /** The banner's "show the file": select a listed damaged file (by its `file`
   *  name from integrityIssues) in the file manager. Any other name: not-listed. */
  revealDamagedFile: (file: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('integrity:reveal', file),
  /** Settings, Graphics: the mode in force this run, the saved one, and what
   *  Chromium is really doing. */
  graphicsStatus: (): Promise<GraphicsStatusView> => ipcRenderer.invoke('graphics:status'),
  /** Save the Graphics mode; it applies on the next start. Resolves to the new status. */
  setGraphicsMode: (mode: GraphicsMode): Promise<GraphicsStatusView> => ipcRenderer.invoke('graphics:setMode', mode),
  /** Restart the app so a new Graphics mode applies. Stops every agent terminal. */
  graphicsRestart: (): Promise<void> => ipcRenderer.invoke('graphics:restart'),
  updateConfig: (patch: Partial<HarnessConfig>): Promise<HarnessConfig> =>
    ipcRenderer.invoke('config:update', patch),
  /** Set or clear one agent's token cap against main's latest config. */
  setAgentTokenCap: (agentId: string, tokenCap?: number): Promise<HarnessConfig> =>
    ipcRenderer.invoke('config:setAgentTokenCap', agentId, tokenCap),
  /** Set or clear one per-agent token ceiling against main's latest config. */
  /** Create (no id) or update (id) one custom avatar. Main validates the
   *  recipe and merges against the config on disk; resolves to the full config. */
  saveAvatar: (input: { id?: string; name: string; recipe: AvatarRecipe }): Promise<HarnessConfig> =>
    ipcRenderer.invoke('config:saveAvatar', input),
  deleteAvatar: (id: string): Promise<HarnessConfig> =>
    ipcRenderer.invoke('config:deleteAvatar', id),
  /** Usage limits (limits-bar): each engine's 5 hour and weekly limits, as last read.
   *  `fresh` asks Codex and Antigravity again when their reading is old (at most once per 5 minutes). */
  usageLimits: (opts?: import('../shared/usageLimits').UsageLimitsReadOptions): Promise<import('../shared/usageLimits').UsageLimitsSnapshot> =>
    ipcRenderer.invoke('telemetry:usageLimits', opts ?? {}),
  /** Grant or revoke one MCP server for one agent, or clear the row (null) so
   *  the agent follows the floor-wide default again. */
  setAgentMcp: (agentId: string, mcpId: string, enabled: boolean | null): Promise<HarnessConfig> =>
    ipcRenderer.invoke('config:setAgentMcp', agentId, mcpId, enabled),
  /** Turn one skill off (`off` true) or back on for one agent. Applied the
   *  next time that agent starts; the skill folder is never touched. */
  setAgentSkillOff: (agentId: string, skill: string, off: boolean): Promise<HarnessConfig> =>
    ipcRenderer.invoke('config:setAgentSkillOff', agentId, skill, off),
  /** Copy one Codex agent's own memories into search, or stop and remove the copy. Codex agents only. */
  setAgentCodexMemory: (agentId: string, on: boolean): Promise<HarnessConfig> =>
    ipcRenderer.invoke('config:setAgentCodexMemory', agentId, on),
  /** The skill folders each agent was started with turned off, this run of the
   *  app, by agent id. A running agent whose row differs needs a restart. */
  skillsOffAtLaunch: (): Promise<Record<string, string[]>> =>
    ipcRenderer.invoke('config:skillsOffAtLaunch'),
  /** Tell main whether the floor is actually open or parked on the launch-time
   *  hive picker, so fleet.json / log.jsonl can say so (#595). Fire-and-forget. */
  reportFloorState: (state: FloorState): void =>
    ipcRenderer.send('floor:state', state),
  ensureHarnessHome: (path: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('config:ensureHome', path),
  /** Change the harness home folder. 'move' copies the existing hive + palace
   *  into the new folder (old kept as a safety net); 'fresh' just re-points and
   *  bootstraps an empty home. On success the app relaunches (never resolves);
   *  on failure (e.g. copy error) returns { ok: false, error }. */
  changeHome: (newHome: string, mode: 'move' | 'fresh'): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('config:changeHome', { newHome, mode }),
  /** Is there anything at `path`, and is it an empty folder
   *  (nothing but .DS_Store)? Null for a path that is not absolute after `~`
   *  is expanded. Read only. */
  folderState: (path: string): Promise<{ exists: boolean; empty: boolean } | null> =>
    ipcRenderer.invoke('folder:state', path),

  // ─── Filesystem (sandboxed to cwd) ───────────────────────────────────────
  listDir: (root: string, rel: string): Promise<
    { ok: true; entries: DirEntry[]; path: string } | { ok: false; error: string }
  > => ipcRenderer.invoke('fs:listDir', root, rel),
  readFile: (root: string, rel: string): Promise<
    { ok: true; content: string; path: string; size: number } | { ok: false; error: string }
  > => ipcRenderer.invoke('fs:readFile', root, rel),
  /** Raw bytes for files `readFile` refuses (images). The renderer has no way to
   *  load them off disk — the CSP allows no `file:` source and no file protocol
   *  is registered — so images travel as bytes and become a `blob:` URL in the
   *  renderer, which `img-src` already permits. Root-confined and size-capped in
   *  the main process; `mime` is derived from the extension. */
  readBinary: (root: string, rel: string): Promise<
    // `Uint8Array<ArrayBuffer>`, not the bare alias: structured clone always
    // hands the renderer a view over a plain ArrayBuffer, and saying so is what
    // lets the value go straight into `new Blob([...])` — the default
    // `ArrayBufferLike` admits SharedArrayBuffer, which BlobPart rejects.
    { ok: true; bytes: Uint8Array<ArrayBuffer>; mime: string; path: string; size: number }
    | { ok: false; error: string }
  > => ipcRenderer.invoke('fs:readBinary', root, rel),
  writeFile: (root: string, rel: string, content: string): Promise<
    { ok: true; path: string } | { ok: false; error: string }
  > => ipcRenderer.invoke('fs:writeFile', root, rel, content),
  /** v0.3.4: existence check for an absolute path (expands ~) — backs the
   *  terminal ⌘-click markdown flow. Metadata only, never contents. */
  statAbs: (p: string): Promise<{ exists: boolean; isFile: boolean; path: string }> =>
    ipcRenderer.invoke('fs:statAbs', p),
  /** Show a path in the OS file browser (Finder / Explorer / the Linux default).
   *  Backs ⌘-click on a terminal path we have no viewer for. Reveals only — main
   *  never launches a file's default application, because the path came from
   *  agent output. */
  revealPath: (p: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('fs:revealPath', p),

  /** Repo-wide text search (0.4.9 phase 9). Root-confined and bounded four
   *  ways in main; `truncated` says the answer is partial rather than letting
   *  a capped result read as the whole of it. */
  searchFiles: (root: string, query: string, opts?: {
    regex?: boolean; caseSensitive?: boolean; wholeWord?: boolean; maxHits?: number;
  }): Promise<
    { ok: true; hits: SearchHit[]; truncated: boolean; filesScanned: number }
    | { ok: false; error: string }
  > => ipcRenderer.invoke('fs:search', root, query, opts ?? {}),
  /** New folder. Fails rather than succeeding silently on one that exists. */
  makeDir: (root: string, rel: string): Promise<FsOpResult> =>
    ipcRenderer.invoke('fs:mkdir', root, rel),
  /** New empty file. Never truncates an existing one. */
  createFile: (root: string, rel: string): Promise<FsOpResult> =>
    ipcRenderer.invoke('fs:createFile', root, rel),
  /** Rename or move inside the root. Both ends are confined, and it refuses to
   *  clobber: POSIX rename would silently replace the destination. */
  renamePath: (root: string, from: string, to: string): Promise<FsOpResult> =>
    ipcRenderer.invoke('fs:rename', root, from, to),
  /** Delete to the OS bin, never permanently. Recoverable by the gesture the
   *  person already knows, because this is one row away from "open". */
  trashPath: (root: string, rel: string): Promise<{ ok: true; path: string } | { ok: false; error: string }> =>
    ipcRenderer.invoke('fs:trash', root, rel),

  // ─── Git ─────────────────────────────────────────────────────────────────
  gitIsRepo: (cwd: string): Promise<boolean> => ipcRenderer.invoke('git:isRepo', cwd),
  /** Absolute path of the MAIN working tree `cwd` belongs to — a linked worktree
   *  resolves to the original repo, not to itself. null when not a git repo. */
  gitMainRepo: (cwd: string): Promise<string | null> => ipcRenderer.invoke('git:mainRepo', cwd),
  gitBranch: (cwd: string) =>
    ipcRenderer.invoke('git:branch', cwd) as Promise<{ current: string | null; detached: boolean } | { error: string }>,
  gitStatus: (cwd: string) =>
    ipcRenderer.invoke('git:status', cwd) as Promise<GitStatus | { error: string }>,
  gitLog: (cwd: string, n?: number) =>
    ipcRenderer.invoke('git:log', cwd, n ?? 50) as Promise<GitCommit[] | { error: string }>,
  gitBranches: (cwd: string) =>
    ipcRenderer.invoke('git:branches', cwd) as Promise<{ local: string[]; remote: string[]; current: string | null } | { error: string }>,
  gitAheadBehind: (cwd: string) =>
    ipcRenderer.invoke('git:aheadBehind', cwd) as Promise<{ ahead: number; behind: number; upstream: string | null } | { error: string }>,
  /** Diff one repo-root-relative file: its HEAD content vs its working-tree content.
   *  Path-validated main-side against `cwd`; the renderer only ever gets the two
   *  text sides. Backs the IDE's git-diff (Monaco DiffEditor) view. */
  gitDiff: (cwd: string, relPath: string) =>
    ipcRenderer.invoke('git:diff', cwd, relPath) as Promise<GitDiff | { ok: false; error: string }>,
  // ── v0.3.4: history / compare / checkout (git visualization) ──
  gitLogGraph: (cwd: string, n: number, skip?: number) =>
    ipcRenderer.invoke('git:logGraph', cwd, n, skip ?? 0) as Promise<GitCommitRow[] | { error: string }>,
  gitCommitFiles: (cwd: string, sha: string) =>
    ipcRenderer.invoke('git:commitFiles', cwd, sha) as Promise<GitFileChange[] | { error: string }>,
  gitShowFile: (cwd: string, rev: string, relPath: string) =>
    ipcRenderer.invoke('git:showFile', cwd, rev, relPath) as Promise<
      { ok: true; exists: boolean; isBinary: boolean; content: string } | { ok: false; error: string }
    >,
  gitCompareRefs: (cwd: string, base: string, head: string, mode?: 'two' | 'three') =>
    ipcRenderer.invoke('git:compareRefs', cwd, base, head, mode ?? 'three') as Promise<
      { ahead: number; behind: number; mergeBase: string | null; files: GitFileChange[] } | { error: string }
    >,
  gitWorktrees: (cwd: string) =>
    ipcRenderer.invoke('git:worktrees', cwd) as Promise<
      Array<{ path: string; head: string; branch: string | null }> | { error: string }
    >,
  /** 0.5.3, feature 24: every folder under the app's worktrees roots, read from
   *  the disk with no git, so it is instant. What a row holds and how big it is
   *  are asked one row at a time, so neither holds up the list. */
  listOwnedWorktrees: () => ipcRenderer.invoke('worktrees:list') as Promise<WorktreeRow[]>,
  /** Uncommitted files and unmerged commits, or null for a folder that is not a worktree. */
  worktreeWork: (path: string) => ipcRenderer.invoke('worktrees:work', path) as Promise<WorktreeWork | null>,
  /** Bytes on disk, or null for a folder that is not in the list. */
  worktreeSize: (path: string) => ipcRenderer.invoke('worktrees:size', path) as Promise<number | null>,
  /** `confirmed` only answers "it holds work, delete anyway". Main asks
   *  everything else again and refuses a running agent's folder whatever is sent. */
  removeOwnedWorktree: (path: string, confirmed: boolean) =>
    ipcRenderer.invoke('worktrees:remove', path, confirmed) as Promise<
      { ok: true } | { ok: false; code: WorktreeDeleteRefusal; work?: WorktreeWork } | { ok: false; code: 'git-failed'; error: string }
    >,
  gitCheckout: (cwd: string, ref: string, detach?: boolean) =>
    ipcRenderer.invoke('git:checkout', cwd, ref, detach === true) as Promise<
      { ok: true; detached: boolean } | { ok: false; error: string }
    >,

  // ─── Hive (multi-agent coordination) ─────────────────────────────────────
  wakeAgent: (id: string): Promise<{ ok: boolean; error?: string }> => ipcRenderer.invoke('hive:wake', id),
  hiveRegistry: (): Promise<HiveRegistry> => ipcRenderer.invoke('hive:registry'),
  /** Persist a hire/job role to hive registry.json + identity.md (no respawn). */
  hivePatchAgentRole: (id: string, role: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('hive:patchAgentRole', id, role),
  /** Rename an agent's display name. Its id, hive directory, and PTY are unchanged. */
  hiveRenameAgent: (id: string, name: string): Promise<{ ok: boolean; name?: string; error?: string }> =>
    ipcRenderer.invoke('hive:renameAgent', id, name),
  /** Put an agent on hold (the human has them 1:1) or take it off. Held agents
   *  keep running; Michael is told to stop routing work to them. */
  hiveSetAgentHold: (id: string, hold: boolean): Promise<{ ok: boolean; onHold?: boolean; error?: string }> =>
    ipcRenderer.invoke('hive:setAgentHold', id, hold),
  hiveBoard: (): Promise<string> => ipcRenderer.invoke('hive:board'),

  hiveTasks: (): Promise<unknown> => ipcRenderer.invoke('hive:tasks'),
  /** The board only when it changed: the same stamp back, and no `tasks`, while it has not. */
  hiveTasksSince: (since: string): Promise<{ stamp: string; tasks?: unknown }> => ipcRenderer.invoke('hive:tasksSince', since),
  hiveTicketPrefix: (): Promise<string> => ipcRenderer.invoke('hive:ticketPrefix'),
  /** The archive ledger (hive/tasks-archive.json): cards the hourly hygiene
   *  sweep moved off the live ledger, newest first, each with archivedAt and
   *  archiveReason. Read only; the Archived chip on Tasks reads it. */
  hiveTasksArchive: (): Promise<unknown> => ipcRenderer.invoke('hive:tasksArchive'),
  hiveLog: (n?: number): Promise<unknown[]> => ipcRenderer.invoke('hive:log', n ?? 200),
  hiveMemory: (id: string): Promise<string> => ipcRenderer.invoke('hive:memory', id),
  hiveInbox: (id: string): Promise<HiveMessage[]> => ipcRenderer.invoke('hive:inbox', id),
  /** The agent's absolute inbox directory, named in the wake nudge (#559). */
  hiveInboxPath: (id: string): Promise<string | null> => ipcRenderer.invoke('hive:inboxPath', id),
  /** The inbox wake as it is to be typed right now (0.5.6): every pending
   *  message no earlier wake has carried. Null when there is none. */
  hiveWakeText: (id: string): Promise<string | null> => ipcRenderer.invoke('hive:wakeText', id),
  /** Mail a wake typed to this agent with no proof it was taken (trigger-prompt-058): its ids. Never typed again by itself. */
  hiveWakeUnconfirmed: (id: string): Promise<string[]> => ipcRenderer.invoke('hive:wakeUnconfirmed', id),
  /** The person's word on that mail: the next wake types it again, once. Returns the ids let go. */
  hiveWakeRetry: (id: string): Promise<string[]> => ipcRenderer.invoke('hive:wakeRetry', id),
  /** The clear on a switch of work (0.5.6): may the clear queued behind a hand
   *  off request be typed now? `hold` while a sub agent is open, `drop` when the
   *  switch has ended. */
  hiveSwitchClearGate: (id: string): Promise<'go' | 'hold' | 'drop'> => ipcRenderer.invoke('hive:switchClearGate', id),
  /** A Codex conversation file past 100 MB (0.5.6, shared/codexSizeClear.ts),
   *  or a clear the orchestrator asked for (shared/askedClear.ts): the hand off
   *  request to queue in front of the clear, or null when none may go now. */
  hiveCodexSizeClearText: (id: string): Promise<string | null> => ipcRenderer.invoke('hive:codexSizeClearText', id),
  /** Main found this Codex agent's conversation file past 100 MB, or (`asked`)
   *  the orchestrator asked to clear this agent. Sent to every window; the one
   *  that owns the agent queues the clear when it is idle. */
  onCodexSizeClear: (cb: (e: { agentId: string; asked?: boolean }) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, payload: { agentId: string; asked?: boolean }) => cb(payload);
    ipcRenderer.on('hive:codexSizeClear', listener);
    return () => ipcRenderer.removeListener('hive:codexSizeClear', listener);
  },
  /** An agent asked the app to compact this agent
   *  (shared/askedCompact.ts). Sent to every window each beat until the compact
   *  goes in; the one that owns the agent queues it when the agent is idle. */
  onCompactAsked: (cb: (e: { agentId: string }) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, payload: { agentId: string }) => cb(payload);
    ipcRenderer.on('hive:compactAsked', listener);
    return () => ipcRenderer.removeListener('hive:compactAsked', listener);
  },
  /** Voice read-layer: recent message CONTENT (inbox/outbox bodies), REDACTED in
   *  main. Pass { id } for one message, { agentId } to scope to one mailbox, or
   *  {} for the whole floor. Backs Realtime Michael's get_messages. The renderer
   *  never sees a raw body or a secret — stripping happens main-side. */
  hiveMessages: (opts?: { agentId?: string; id?: string; limit?: number; includeArchived?: boolean }): Promise<VoiceMessage[]> =>
    ipcRenderer.invoke('hive:messages', opts ?? {}),
  /** Consolidated per-agent directory (registry + telemetry + context), incl.
   *  archived agents. Backs Realtime Michael's get_agent_detail / list_agents. */
  hiveAgentDirectory: (): Promise<AgentDirectory> => ipcRenderer.invoke('hive:agentDirectory'),
  /** Agent ids a PERSON had archived when this launch began (0.5.8). The
   *  restore gate retires these. See src/shared/agentLive.ts. */
  hiveArchivedAtBoot: (): Promise<string[]> => ipcRenderer.invoke('hive:archivedAtBoot'),
  /** Stopped agents the automatic restore leaves alone, and why (0.5.8). */
  hiveHeldAtBoot: (): Promise<Array<{ id: string; why: 'crash-loop' | 'guardrail' }>> => ipcRenderer.invoke('hive:heldAtBoot'),
  /** Agents whose process ended on its own in this run of the app, and how
   * . A reloaded window keeps saying so. */
  hiveEndedAgents: (): Promise<Array<{ agentId: string; exitCode?: number; signal?: number; printMode?: boolean; at: number }>> => ipcRenderer.invoke('hive:endedAgents'),

  // ─── Ephemeral workers (P4 — Slack-triggered isolated workers) ───────────
  /** Live ephemeral workers + worktrees preserved awaiting integration/GC. */
  listWorkers: (): Promise<{ live: WorkerSnapshot[]; preserved: PreservedWorktreeSnapshot[]; maxWorkers: number }> =>
    ipcRenderer.invoke('workers:list'),
  /** Manually stop a live ephemeral worker (safety-gated teardown; work preserved). */
  stopWorker: (workerId: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('workers:stop', workerId),
  /** The Temps ledger, newest first: one row per worker teardown. */
  workersHistory: (): Promise<WorkerHistoryEntry[]> => ipcRenderer.invoke('workers:history'),
  onWorkersHistoryUpdated: (cb: () => void): (() => void) => {
    const listener = (): void => cb();
    ipcRenderer.on('workers:historyUpdated', listener);
    return () => ipcRenderer.removeListener('workers:historyUpdated', listener);
  },

  // ─── Semantic memory (MemPalace CLI) ─────────────────────────────────────
  memoryStatus: (): Promise<MemoryStatus> => ipcRenderer.invoke('hive:memoryStatus'),
  /** Which external tools (uv, mempalace, git, each agent engine) are actually
   *  present on this machine, with a platform-resolved install command each. */
  toolsStatus: (): Promise<ToolStatus[]> => ipcRenderer.invoke('tools:status'),
  /** Settings hero payload — plan + sponsor, fetched from the repo and cached. */
  heroPayload: (force?: boolean): Promise<{ hero: HeroPayload; fetchedAt: number; stale: boolean }> =>
    ipcRenderer.invoke('hero:payload', force),
  /** The remote model catalog — the agent model presets, fetched from the repo
   *  and cached, so a new model needs a JSON edit rather than a release. A null
   *  catalog means the renderer keeps the list compiled into the build. */
  modelCatalog: (force?: boolean): Promise<{
    catalog: ModelCatalog | null; fetchedAt: number; stale: boolean;
  }> => ipcRenderer.invoke('models:catalog', force),
  /** Skills already installed for the coding agents on this machine. */
  skillsLocal: (cwd?: string): Promise<LocalSkill[]> => ipcRenderer.invoke('skills:local', cwd),
  /** The browsable skills catalog (cached; `force` re-fetches). */
  skillsCatalog: (force?: boolean): Promise<{
    skills: CatalogSkill[]; fetchedAt: number; stale: boolean; error?: string;
  }> => ipcRenderer.invoke('skills:catalog', force),
  /** Install a catalog skill into ~/.claude/skills. `unsupported` distinguishes
   *  "there is no downloadable source" from "the download failed". */
  skillsInstall: (url: string, name: string): Promise<
    { ok: true; path: string } | { ok: false; error: string; unsupported?: boolean; code?: string; detail?: Record<string, string | number> }
  > => ipcRenderer.invoke('skills:install', url, name),
  /** Delete an installed skill. Main refuses any path outside a skills root. */
  skillsUninstall: (path: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('skills:uninstall', path),
  /** Show a skill's folder in the OS file manager. */
  skillsReveal: (path: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('skills:reveal', path),
  searchMemory: (query: string, wing?: string): Promise<{ ok: boolean; output: string; error?: string }> =>
    ipcRenderer.invoke('hive:searchMemory', query, wing),
  memoryWakeUp: (wing?: string): Promise<{ ok: boolean; output: string; error?: string }> =>
    ipcRenderer.invoke('hive:memoryWakeUp', wing),
  mineNow: (): Promise<{ ok: boolean }> => ipcRenderer.invoke('hive:mineNow'),
  /** Run the memory job (0.5.6: plain file work, no model): the oldest text of
   *  memory.md moves word for word to the raw archive. With an id, that agent on
   *  demand; without, a full threshold scan. Returns one outcome per step that
   *  ran ({ id, moved, what?, reason, oldBytes?, newBytes? }). */
  reflectNow: (id?: string): Promise<Array<{ id: string; moved: boolean; what?: 'summaries' | 'pinned' | 'sections'; reason: string; oldBytes?: number; newBytes?: number }>> =>
    ipcRenderer.invoke('memory:reflectNow', id),

  // ─── Enterprise Knowledge Graph (multimodal context for agents) ───────────
  kgStatus: (): Promise<KnowledgeStatus> => ipcRenderer.invoke('kg:status'),
  kgList: (): Promise<KnowledgeDoc[]> => ipcRenderer.invoke('kg:list'),
  kgSearch: (query: string, limit?: number): Promise<KnowledgeHit[]> =>
    ipcRenderer.invoke('kg:search', query, limit),
  kgGet: (id: string): Promise<{ meta: KnowledgeDoc; text: string } | null> =>
    ipcRenderer.invoke('kg:get', id),
  kgRemove: (id: string): Promise<{ ok: boolean }> => ipcRenderer.invoke('kg:remove', id),
  /** Open an OS file picker and ingest the chosen artifacts in one round-trip. */
  kgAddFiles: (): Promise<KnowledgeIngestResult> => ipcRenderer.invoke('kg:addFiles'),
  /** Ingest explicit file paths (e.g. drag-and-drop). */
  kgIngestFiles: (paths: string[], tags?: string[]): Promise<KnowledgeIngestResult> =>
    ipcRenderer.invoke('kg:ingestFiles', { paths, tags }),

  // ─── Composer attachments (images + files, sent to agents by PATH) ─────────
  attachFiles: (want?: AttachWant): Promise<
    { ok: true; files: { path: string; name: string }[] } | { ok: false; error: string }
  > => ipcRenderer.invoke('dialog:attachFiles', want ?? 'any'),
  /** Resolve a dropped File's absolute path (Electron 32 removed File.path). */
  pathForFile: (file: File): string => webUtils.getPathForFile(file),
  /** Write the current clipboard image to a temp PNG and return its path (paste-to-attach). */
  saveClipboardImage: (): Promise<
    { ok: true; file: { path: string; name: string } } | { ok: false; error: string }
  > => ipcRenderer.invoke('clipboard:saveImage'),
  /** Persist a dropped File that resolved to NO path — macOS file-promise
   *  sources (the Cmd Shift 5 screenshot thumbnail) can hand Chromium the
   *  bytes without a stable file on disk — so it can be attached by PATH. */
  saveDroppedFile: (name: string, bytes: Uint8Array): Promise<
    { ok: true; file: { path: string; name: string } } | { ok: false; error: string }
  > => ipcRenderer.invoke('drop:saveFile', name, bytes),

  // ─── Command history (SQLite — every prompt submitted to an agent) ─────────
  /** Record one submitted prompt. Fire-and-forget from the prompt-detection hook. */
  historyAdd: (entry: { agentId: string; cwd?: string; text: string }): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('history:add', entry),
  /** Most-recent-first history, optionally scoped to one agent. */
  historyList: (agentId?: string, limit?: number): Promise<CommandHistoryEntry[]> =>
    ipcRenderer.invoke('history:list', agentId, limit),
  /** Substring search over prompt text, most-recent-first. */
  historySearch: (query: string, limit?: number): Promise<CommandHistoryEntry[]> =>
    ipcRenderer.invoke('history:search', query, limit),
  hiveSend: (msg: Partial<HiveMessage>, from?: string): Promise<{ ok: boolean; error?: string; message?: HiveMessage }> =>
    ipcRenderer.invoke('hive:send', msg, from),

  onHiveHookEvent: (
    cb: (e: HookEvent) => void
  ): (() => void) => {
    const listener = (_e: IpcRendererEvent, payload: HookEvent) => cb(payload);
    ipcRenderer.on('hive:hookEvent', listener);
    return () => ipcRenderer.removeListener('hive:hookEvent', listener);
  },
  /** A steer reached the agent's CLI in a hook reply: its proof. The tail only, never the text. */
  onSteerLanded: (cb: (e: { agentId: string; tail: string }) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, payload: { agentId: string; tail: string }) => cb(payload);
    ipcRenderer.on('hive:steerLanded', listener);
    return () => ipcRenderer.removeListener('hive:steerLanded', listener);
  },
  /** Push-based context accounting from the status line: live tokens + the
   *  session's EXACT context-window size. Same pattern as onHiveHookEvent. */
  onHiveContextUpdate: (
    cb: (e: { agentId: string; tokens: number; limit: number }) => void
  ): (() => void) => {
    const listener = (_e: IpcRendererEvent, payload: { agentId: string; tokens: number; limit: number }) => cb(payload);
    ipcRenderer.on('hive:contextUpdate', listener);
    return () => ipcRenderer.removeListener('hive:contextUpdate', listener);
  },
  /** An agent's process ended on its own (0.5.3 feature 18). Floor wide, unlike
   *  `pty:exit:<id>`, which only a terminal that has been opened listens to. */
  onHiveAgentExited: (
    cb: (e: { agentId: string; exitCode?: number; signal?: number; printMode?: boolean }) => void
  ): (() => void) => {
    const listener = (_e: IpcRendererEvent, payload: { agentId: string; exitCode?: number; signal?: number; printMode?: boolean }) => cb(payload);
    ipcRenderer.on('hive:agentExited', listener);
    return () => ipcRenderer.removeListener('hive:agentExited', listener);
  },
  /** The CLI refused to reopen an agent's session and the same agent is starting
   *  again with no session. Floor wide, like `hive:agentExited`, which
   *  is NOT sent for it: it never crashed. */
  onHiveAgentStartedFresh: (cb: (e: { agentId: string }) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, payload: { agentId: string }) => cb(payload);
    ipcRenderer.on('hive:agentStartedFresh', listener);
    return () => ipcRenderer.removeListener('hive:agentStartedFresh', listener);
  },
  /** The model an agent is actually running, sent when it CHANGES (0.5.3 bug 2):
   *  read from Claude Code's status line and from Codex's hook payloads. */
  onHiveModelUpdate: (
    cb: (e: { agentId: string; model: string }) => void
  ): (() => void) => {
    const listener = (_e: IpcRendererEvent, payload: { agentId: string; model: string }) => cb(payload);
    ipcRenderer.on('hive:modelUpdate', listener);
    return () => ipcRenderer.removeListener('hive:modelUpdate', listener);
  },
  onHiveMessage: (cb: (e: HiveRouteEvent) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, payload: HiveRouteEvent) => cb(payload);
    ipcRenderer.on('hive:message', listener);
    return () => ipcRenderer.removeListener('hive:message', listener);
  },
  /** 0.5.8: the needs a fix notices no floor has shown yet; taking them clears them. */
  hiveTakeDegraded: (): Promise<Array<{ agentId: string; name: string; reason: string; message: string }>> =>
    ipcRenderer.invoke('hive:takeDegraded').then((v) => (Array.isArray(v) ? v : []), () => []),
  /** An agent started without something it needs: its hooks cannot run on this
   *  machine, or its proxy bridge never bound (plan F, gate of #190 W2). Shown
   *  in the app by default; the native toast stays gated on notifications. */
  onHiveDegraded: (cb: (e: { agentId: string; name: string; reason: string; message: string }) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, payload: { agentId: string; name: string; reason: string; message: string }) => cb(payload);
    ipcRenderer.on('hive:degraded', listener);
    return () => ipcRenderer.removeListener('hive:degraded', listener);
  },
  /** An agent's 1:1 hold changed, from any surface (0.5.3, F25). */
  onAgentHold: (cb: (e: { agentId: string; onHold: boolean }) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, payload: { agentId: string; onHold: boolean }) => cb(payload);
    ipcRenderer.on('hive:agentHold', listener);
    return () => ipcRenderer.removeListener('hive:agentHold', listener);
  },
  /** Register a listener for hive tasks routed to non-Claude agents (e.g.
   *  Codex). Main emits this instead of bouncing; the renderer enqueues the
   *  raw text so the drain effect types it into the agent's REPL when idle. */
  onHiveEnqueue: (cb: (e: { targetId: string; text: string }) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, payload: { targetId: string; text: string }) => cb(payload);
    ipcRenderer.on('hive:enqueueToAgent', listener);
    return () => ipcRenderer.removeListener('hive:enqueueToAgent', listener);
  },
  /** A MAIN-initiated agent spawn (e.g. a voice hire via rt-5) — the renderer adds
   *  the floor card from this descriptor since it didn't initiate the hire itself. */
  onHiveAgentSpawned: (
    cb: (rec: {
      id: string; ptyId?: string; name: string; provider?: string; cwd: string;
      command?: string; model?: string; role?: string; worktreePath?: string;
      character?: string; accent?: string;
    }) => void
  ): (() => void) => {
    const listener = (_e: IpcRendererEvent, payload: Parameters<typeof cb>[0]) => cb(payload);
    ipcRenderer.on('hive:agentSpawned', listener);
    return () => ipcRenderer.removeListener('hive:agentSpawned', listener);
  },
  /** A MAIN-initiated agent kill/archive (e.g. a voice kill via rt-5) — the renderer
   *  archives the floor card since it didn't initiate the kill itself. */
  onHiveAgentArchived: (cb: (e: { id: string }) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, payload: { id: string }) => cb(payload);
    ipcRenderer.on('hive:agentArchived', listener);
    return () => ipcRenderer.removeListener('hive:agentArchived', listener);
  },
  /** Register a listener for terminal work-order handoffs (#53) — hive mail to a
   *  hookless provider that can't drain an inbox; the renderer types it into the
   *  agent's REPL as a work order. */
  onHiveTerminalHandoff: (cb: (e: HiveTerminalHandoffEvent) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, payload: HiveTerminalHandoffEvent) => cb(payload);
    ipcRenderer.on('hive:terminalHandoff', listener);
    return () => ipcRenderer.removeListener('hive:terminalHandoff', listener);
  },

  // ─── Shareable hires (deep link / file import) ────────────────────────────
  /** Fired when a validated hire manifest arrives via the munderdifflin://
   *  deep link. The renderer opens the Add-Agent modal pre-filled — import
   *  never spawns anything by itself. */
  onHireImport: (cb: (manifest: HireManifest) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, manifest: HireManifest) => cb(manifest);
    ipcRenderer.on('hire:import', listener);
    return () => ipcRenderer.removeListener('hire:import', listener);
  },
  /** Fired when a deep-linked manifest failed validation/fetch. */
  onHireError: (cb: (info: { error: string }) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, info: { error: string }) => cb(info);
    ipcRenderer.on('hire:error', listener);
    return () => ipcRenderer.removeListener('hire:error', listener);
  },
  /** Signal readiness and pull any queued deep-linked manifests (cold-start
   *  links, links that arrived during load). Resolves the queued list. */
  drainPendingHires: (): Promise<HireManifest[]> =>
    ipcRenderer.invoke('hire:drainPending'),
  /** Open a multi-file picker and validate every selected hire manifest. */
  importHireFiles: (): Promise<{
    ok: boolean;
    manifests: HireManifest[];
    errors: string[];
    error?: string;
  }> =>
    ipcRenderer.invoke('hire:openFile'),

  // ─── Config changes ──────────────────────────────────────────────────────
  /** Fired whenever a setting is saved, with the full updated config. */
  onConfigChanged: (cb: (config: HarnessConfig) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, config: HarnessConfig) => cb(config);
    ipcRenderer.on('config:changed', listener);
    return () => ipcRenderer.removeListener('config:changed', listener);
  },

  // ─── Quit confirmation ───────────────────────────────────────────────────
  /** How many IDE files hold unsaved text, so quitting can say so. A count,
   *  never the text (review finding 15). */
  ideDirty: (unsaved: number): void => { ipcRenderer.send('ide:dirty', unsaved); },

  onCloseRequested: (cb: (info: { ptyCount: number }) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, info: { ptyCount: number }) => cb(info);
    ipcRenderer.on('app:closeRequested', listener);
    return () => ipcRenderer.removeListener('app:closeRequested', listener);
  },
  confirmClose: (): Promise<void> => ipcRenderer.invoke('app:confirmClose'),
  cancelClose: (): Promise<void> => ipcRenderer.invoke('app:cancelClose'),

  // ─── Power / wake (auto-revive wedged PTYs after sleep/lock) ────────────────
  /** Subscribe to the main-process power-resume signal; returns an unsubscribe
   *  fn. The main process catches up after a sleep/unlock and reports the PTY
   *  ids that wedged across it in `dead` — the renderer respawns ONLY those
   *  (empty `dead[]` = no-op). */
  onPowerResume: (cb: (e: PowerResumeEvent) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, payload: PowerResumeEvent) => cb(payload);
    ipcRenderer.on('power:resume', listener);
    return () => ipcRenderer.removeListener('power:resume', listener);
  },

  // ─── Multi-window floors ───────────────────────────────────────────────────
  /** New Floor (0.5.3, B21): asks main to open the picker in this window; the
   *  picker then calls floorOpen. Resolves { ok } once the ask is sent. */
  newFloor: (): Promise<{ ok: boolean }> => ipcRenderer.invoke('window:newFloor'),
  /** Main asks this window to show the New Floor picker (the File menu item,
   *  Cmd/Ctrl+Shift+N, or newFloor above). */
  onFloorPickerOpen: (cb: () => void): (() => void) => {
    const listener = () => cb();
    ipcRenderer.on('floor:pickerOpen', listener);
    return () => ipcRenderer.removeListener('floor:pickerOpen', listener);
  },
  /** One word per remembered folder: free, current (this floor), held (another
   *  live floor, with its lock) or missing. */
  floorProbe: (paths: string[]): Promise<Array<{ path: string; state: 'free' | 'current' | 'held' | 'missing'; lock?: { pid: number; userData: string; since: string; version?: string } }>> =>
    ipcRenderer.invoke('floor:probe', paths),
  /** Open a folder as a floor of its own. Refusals: current (this floor's own
   *  hive), held (another floor), same-data-dir, invalid, mkdir-failed,
   *  no-spawner (process per floor not in this build), spawn-failed. */
  floorOpen: (req: { harnessHome: string }): Promise<{ ok: true } | { ok: false; refusal: string; lock?: { pid: number; userData: string; since: string; version?: string }; detail?: string }> =>
    ipcRenderer.invoke('floor:open', req),

  // ─── Reset ─────────────────────────────────────────────────────────────────
  /** Wipe all hive data + the memory palace, reset config, and relaunch the app
   *  into onboarding. The process exits, so this promise never resolves. */
  resetAll: (): Promise<void> => ipcRenderer.invoke('app:resetAll'),

  // ─── Token telemetry (real usage + est. cost from CC transcripts) ──────────
  /** Sum input/output/cache tokens + estimated USD cost for an agent from its
   *  Claude Code transcripts (reconciler/fallback). Returns null for an invalid cwd. */
  agentUsage: (cwd: string): Promise<AgentUsage | null> =>
    ipcRenderer.invoke('hive:agentUsage', cwd),
  /** Current context size (tokens) of an agent's live session, read from the
   *  last assistant message of its transcript. Null until the agent's hooks
   *  have fired at least once (the transcript path is learned from them). */
  agentContext: (agentId: string): Promise<number | null> =>
    ipcRenderer.invoke('hive:agentContext', agentId),
  /** The window size (tokens) the agent's status line last reported, or null
   *  before its first one. Not kept in the window, so a reload asks again. */
  agentContextLimit: (agentId: string): Promise<number | null> =>
    ipcRenderer.invoke('hive:agentContextLimit', agentId),
  /** One bounded page of the agent's conversation from its CLI's own
   *  transcript, read only. Tail by default; `before` pages older, `after` follows
   *  growth (byte cursors). The agent is named by id, never by a path. */
  historyPage: (req: HistoryRequest): Promise<HistoryPage> =>
    ipcRenderer.invoke('hive:history', req),

  // ─── Live telemetry (OTel collector — the usage-provider seam + spans) ──────
  /** Live cumulative usage for an agent (OTel-preferred, transcript fallback). */
  telemetryUsage: (agentId: string): Promise<AgentUsageSample | null> =>
    ipcRenderer.invoke('telemetry:usage', agentId),
  /** Recent tool spans for an agent's waterfall (#7B.2). */
  telemetrySpans: (agentId: string): Promise<ToolSpan[]> =>
    ipcRenderer.invoke('telemetry:spans', agentId),
  /** Cold-start backfill of all agents' usage + recent spans. */
  telemetrySnapshot: (): Promise<TelemetrySnapshot> =>
    ipcRenderer.invoke('telemetry:snapshot'),
  /** Subscribe to live telemetry pushes; returns an unsubscribe fn. */
  onTelemetryEvent: (cb: (e: TelemetryEvent) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, payload: TelemetryEvent) => cb(payload);
    ipcRenderer.on('telemetry:event', listener);
    return () => ipcRenderer.removeListener('telemetry:event', listener);
  },

  // ─── Circuit breaker (Lane A #6 state → avatars/meter) ──────────────────────
  /** Subscribe to breaker-state changes; returns an unsubscribe fn. */
  onBreakerState: (cb: (s: BreakerState) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, payload: BreakerState) => cb(payload);
    ipcRenderer.on('control:breakerState', listener);
    return () => ipcRenderer.removeListener('control:breakerState', listener);
  },
  /** Push a breaker state to the renderer (Lane A's policy / interim glue calls this). */
  setBreakerState: (state: BreakerState): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('control:setBreakerState', state),

  // ─── Operator control over agents (#7C.1–7C.3) ──────────────────────────────
  /** Pause/unpause an agent — paused → its tool calls are denied at PreToolUse. */
  controlPause: (agentId: string, on: boolean): Promise<AgentControlSnapshot | null> =>
    ipcRenderer.invoke('control:pause', agentId, on),
  /** Pause/resume automatic inbox and queued-message delivery for one agent. */
  controlAutoDelivery: (agentId: string, paused: boolean): Promise<AgentControlSnapshot | null> =>
    ipcRenderer.invoke('control:autoDelivery', agentId, paused),
  /** Clear pause + halt so the agent can run again. */
  controlResume: (agentId: string): Promise<AgentControlSnapshot | null> =>
    ipcRenderer.invoke('control:resume', agentId),
  /** Gate/ungate a specific tool for an agent (denied at PreToolUse). */
  controlGateTool: (agentId: string, tool: string, on: boolean): Promise<AgentControlSnapshot | null> =>
    ipcRenderer.invoke('control:gateTool', agentId, tool, on),
  /** Queue a steer note — injected as context on the agent's next hook (#7C.2). */
  controlSteer: (agentId: string, text: string): Promise<AgentControlSnapshot | null> =>
    ipcRenderer.invoke('control:steer', agentId, text),
  /** Request a graceful stop at the next hook boundary (#7C.3). */
  controlHalt: (agentId: string): Promise<AgentControlSnapshot | null> =>
    ipcRenderer.invoke('control:halt', agentId),
  /** Cancel a pending stop-after-this-step (the #7C.3 halt is a toggle now).
   *  Clears ONLY the halt: a pause set alongside it stays set. */
  controlUnhalt: (agentId: string): Promise<AgentControlSnapshot | null> =>
    ipcRenderer.invoke('control:unhalt', agentId),
  /** Read an agent's current control snapshot. */
  controlSnapshot: (agentId: string): Promise<AgentControlSnapshot | null> =>
    ipcRenderer.invoke('control:snapshot', agentId),
  /** Subscribe to gate/deny events (a tool was blocked); returns unsubscribe fn. */
  onApprovalRequest: (cb: (e: { agentId: string; tool?: string; reason?: string }) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, payload: { agentId: string; tool?: string; reason?: string }) => cb(payload);
    ipcRenderer.on('control:approvalRequest', listener);
    return () => ipcRenderer.removeListener('control:approvalRequest', listener);
  },

  // ─── Task kanban (hive/tasks.json) ───────────────────────────────────────
  /** Atomically append one card against the latest main-process ledger. */
  hiveAddTask: (task: HiveTask): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('hive:addTask', task),
  /** Atomically patch one named card without replacing unrelated cards/fields. */
  hivePatchTask: (
    id: string,
    patch: Partial<Omit<HiveTask, 'id'>>
  ): Promise<{ ok: boolean; error?: string }> => ipcRenderer.invoke('hive:patchTask', id, patch),
  /** Patch many cards in one write and one commit; `applied` names the ones
   *  that were patched (a card that is gone is skipped). */
  hivePatchTasks: (
    patches: Array<{ id: string; patch: Partial<Omit<HiveTask, 'id'>> }>
  ): Promise<{ ok: boolean; applied: string[]; error?: string }> => ipcRenderer.invoke('hive:patchTasks', patches),
  /** Answer or dismiss ONE Ask Me entry on the on-disk card: the open
   *  entry with that q (and askedAt, else nth: how many earlier entries share
   *  the q). Only that entry changes. 'gone' when there is none, the card is
   *  done, or an answer's `labels` (the options the card showed) no longer
   *  match: keep the draft. 'invalid' for a bad change or `chosen` (RAW option
   *  positions, one unless the entry is multi). */
  hiveAnswerQuestion: (
    taskId: string,
    ref: { q: string; askedAt?: string; nth?: number; labels?: string[] },
    change: { a: string; answeredAt: string; chosen?: number[] } | { dismissedAt: string }
  ): Promise<{ ok: boolean; error?: string }> => ipcRenderer.invoke('hive:answerQuestion', taskId, ref, change),
  /** The batch form (Dismiss all): one read, one write, one commit; `applied` names the cards done. */
  hiveAnswerQuestions: (
    items: Array<{ taskId: string; ref: { q: string; askedAt?: string; nth?: number; labels?: string[] }; change: { a: string; answeredAt: string; chosen?: number[] } | { dismissedAt: string } }>
  ): Promise<{ ok: boolean; applied: string[]; error?: string }> => ipcRenderer.invoke('hive:answerQuestions', items),
  /** Atomically remove one named card from the latest main-process ledger. */
  hiveDeleteTask: (id: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('hive:deleteTask', id),

  // ─── Scheduled missions (recurring auto-dispatch) ──────────────────────────
  listMissions: (): Promise<ScheduledMission[]> => ipcRenderer.invoke('missions:list'),
  saveMissions: (missions: ScheduledMission[]): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('missions:save', missions),
  /** Fires when the scheduler stamps a mission's lastFiredAt (a beat/dispatch),
   *  so the SCHEDULES panel can refresh "last fired" without a reload. */
  onMissionsUpdated: (cb: () => void): (() => void) => {
    const listener = (): void => cb();
    ipcRenderer.on('missions:updated', listener);
    return () => ipcRenderer.removeListener('missions:updated', listener);
  },

  // ─── Full-text search across hive files (board, tasks, memory) ─────────────
  textSearch: (q: string): Promise<{ ok: boolean; results: Array<{ source: string; excerpt: string }> }> =>
    ipcRenderer.invoke('hive:textSearch', q),

  // ─── GitHub issue ingestion (gh CLI) ───────────────────────────────────────
  /** List up to 30 open issues in the repo at `cwd` via the `gh` CLI. Returns
   *  `{ ok: false, error }` if `gh` is missing/unauthenticated or `cwd` isn't a repo. */
  githubIssues: (cwd: string): Promise<{ ok: boolean; issues?: GHIssue[]; error?: string }> =>
    ipcRenderer.invoke('github:issues', cwd),

  // ─── GitHub CI status watcher (gh CLI) ─────────────────────────────────────
  /** List up to 5 recent CI (GitHub Actions) runs in the repo at `cwd` via the
   *  `gh` CLI. Returns `{ ok: false, error }` if `gh` is missing/unauthenticated,
   *  `cwd` isn't a repo, or the repo has no Actions. */
  githubCIRuns: (cwd: string): Promise<{ ok: boolean; runs?: CIRun[]; error?: string }> =>
    ipcRenderer.invoke('github:ciRuns', cwd),

  // ─── Desktop notifications ───────────────────────────────────────────────────
  /** Toggle native desktop notifications for agent lifecycle events. */
  setNotifications: (v: boolean): Promise<HarnessConfig> =>
    ipcRenderer.invoke('app:setNotifications', v),

  // ─── Reliability / OS integration (onboarding permissions step) ──────────────
  /** Open a System Settings deep-link (or https URL) in the OS handler. Main
   *  restricts the scheme; the renderer just points at the pane. */
  openExternal: (url: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('app:openExternal', url),
  /** Toggle macOS "Open at Login". Resolves to the resulting state (no prompt). */
  setLoginItem: (enabled: boolean): Promise<boolean> =>
    ipcRenderer.invoke('app:setLoginItem', enabled),

  // ─── Agent lifecycle (archival) ─────────────────────────────────────────────
  /** Archive/unarchive a hive agent in the registry. Closing a terminal tab
   *  archives it automatically via pty:kill; this is the explicit primitive. */
  hiveSetArchived: (id: string, archived: boolean): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('hive:setArchived', id, archived),

  // ─── Slack integration (Slack message → Michael's queue) ─────────────────────
  /** Register a listener for inbound Slack messages; returns an unsubscribe fn.
   *  The message carries the thread coordinates needed to reply in-thread. */
  onSlackMessage: (cb: (msg: { text: string; channel: string; ts: string; thread_ts: string; autonomyPreamble?: string; agentPreamble?: string; context?: string; responder?: string; files?: { path: string; name: string; mimetype: string }[] }) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, msg: { text: string; channel: string; ts: string; thread_ts: string; autonomyPreamble?: string; agentPreamble?: string; context?: string; files?: { path: string; name: string; mimetype: string }[] }) => cb(msg);
    ipcRenderer.on('slack:incomingMessage', listener);
    return () => ipcRenderer.removeListener('slack:incomingMessage', listener);
  },
  /** Start the Slack webhook server; returns the public tunnel URL to paste into
   *  the Slack app's Event Subscriptions → Request URL. */
  slackStart: (): Promise<{ ok: boolean; url?: string; error?: string }> =>
    ipcRenderer.invoke('slack:start'),
  /** Stop the Slack webhook server + tunnel. */
  slackStop: (): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('slack:stop'),
  /** Current connection state + last Request URL (so Settings can hydrate the
   *  "Connected" badge and re-show the persisted tunnel URL on reopen). */
  slackStatus: (): Promise<SlackStatus> =>
    ipcRenderer.invoke('slack:status'),
  /** Test the saved tokens without starting anything: `auth.test` with the bot
   *  token, and in socket mode `apps.connections.open` with the app token too.
   *
   *  `draft` is what the form has on screen, so a person can test the token they
   *  just pasted without saving it first. Tokens still only ever travel INTO
   *  main; nothing about one comes back, only the team, the bot's handle, the
   *  channels it is in, and what is still missing. */
  slackTest: (draft?: SlackTestDraft): Promise<SlackTestResult> =>
    ipcRenderer.invoke('slack:test', draft ?? {}),
  /** The Slack ledger, newest first: inbound thread messages and our posts. */
  slackHistory: (): Promise<SlackHistoryEntry[]> => ipcRenderer.invoke('slack:history'),
  onSlackHistoryUpdated: (cb: () => void): (() => void) => {
    const listener = (): void => cb();
    ipcRenderer.on('slack:historyUpdated', listener);
    return () => ipcRenderer.removeListener('slack:historyUpdated', listener);
  },
  /** Post a reply into a Slack thread (the bot token stays in main). Used for the
   *  renderer's immediate "queued" ack. */
  slackReply: (m: { channel: string; thread_ts: string; text: string }): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('slack:reply', m),
  /** Absolute path to the bundled reply helper, for the office worker's
   *  end-of-run "post your summary back to Slack" instruction. */
  slackReplyScriptPath: (): Promise<string> =>
    ipcRenderer.invoke('slack:replyScriptPath'),
  /** Persist Slack settings. Disabling, clearing the way's token, or changing
   *  the way (0.4.11: one at a time) stops whatever transport is running. */
  slackSetConfig: (patch: SlackConfigPatch): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('slack:setConfig', patch),

  // ─── Generic webhook + status API (POST → work, GET → status) ────────────────
  /** Start the generic webhook server; returns the public endpoint URL callers
   *  POST to (secret-gated) and GET a token's status from. */
  webhookStart: (): Promise<{ ok: boolean; url?: string; error?: string }> =>
    ipcRenderer.invoke('webhook:start'),
  /** Stop the generic webhook server + tunnel. */
  webhookStop: (): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('webhook:stop'),
  /** Current state + last endpoint URL (so Settings can hydrate the badge/URL). */
  webhookStatus: (): Promise<{ running: boolean; url?: string; port?: number; movedFrom?: number }> =>
    ipcRenderer.invoke('webhook:status'),
  /** Mint + persist a fresh secret and return it for the user to copy. */
  webhookGenerateSecret: (): Promise<{ ok: boolean; secret?: string }> =>
    ipcRenderer.invoke('webhook:generateSecret'),
  /** Persist webhook settings (and stop the server if disabled / secret cleared). */
  webhookSetConfig: (patch: {
    secret?: string; port?: number; enabled?: boolean;
  }): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('webhook:setConfig', patch),

  // ─── Triggers: context (auto-compact / auto-clear) ──────────────────────────
  /** The two context rules (cadence + pressure gate + message), deep-filled. */
  getContextTrigger: (): Promise<ContextTriggerConfig> =>
    ipcRenderer.invoke('triggers:getContext'),
  /** Persist both rules and RE-ARM main's timers; resolves to what was stored
   *  (main clamps the cadence/percentages, so the echo is authoritative). */
  setContextTrigger: (cfg: ContextTriggerConfig): Promise<ContextTriggerConfig> =>
    ipcRenderer.invoke('triggers:setContext', cfg),
  /** Fires when a context rule comes due. `rule` rides along because main owns
   *  only the CADENCE — the renderer applies the per-agent pressure gate and
   *  queues the command for each agent that qualifies. */
  onContextTrigger: (cb: (evt: { action: 'compact' | 'clear'; rule: ContextRule }) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, payload: { action: 'compact' | 'clear'; rule: ContextRule }) => cb(payload);
    ipcRenderer.on('trigger:context', listener);
    return () => ipcRenderer.removeListener('trigger:context', listener);
  },

  // ─── Triggers: webhook endpoints (many endpoints, one server + tunnel) ──────
  /** Every configured endpoint, enabled or not. */
  listWebhooks: (): Promise<WebhookTrigger[]> => ipcRenderer.invoke('webhooks:list'),
  /** Replace the whole list; main normalises each row (a blank secret keeps the
   *  stored one, an unknown mode keeps the stored one) and hot-swaps the running
   *  server's endpoints WITHOUT a restart, so no other caller's URL changes. */
  saveWebhooks: (list: WebhookTrigger[]): Promise<WebhookTrigger[]> =>
    ipcRenderer.invoke('webhooks:save', list),
  /** Revoke one endpoint; resolves to the remaining list. */
  deleteWebhook: (id: string): Promise<WebhookTrigger[]> =>
    ipcRenderer.invoke('webhooks:delete', id),
  /** Mint a 256-bit secret for the operator to paste into their caller. Not
   *  persisted until the endpoint carrying it is saved. */
  generateWebhookSecret: (): Promise<string> => ipcRenderer.invoke('webhooks:generateSecret'),
  /** 0.5.3 batch 3: an agent changed the webhook list (connection request). */
  onWebhooksChanged: (cb: () => void): (() => void) => {
    const listener = (): void => cb();
    ipcRenderer.on('webhooks:changed', listener);
    return () => ipcRenderer.removeListener('webhooks:changed', listener);
  },
  /** 0.5.3: register a Telegram bot's webhook on one Telegram endpoint. The
   *  token is used once and not stored. */
  telegramSetWebhook: (id: string, botToken: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('telegram:setWebhook', { id, botToken }),
  /** Server state, the tunnel root, and each endpoint's full public URL (`url` is
   *  '' until a tunnel has come up). */
  webhooksStatus: (): Promise<{ running: boolean; starting?: boolean; error?: string; url?: string; port?: number; movedFrom?: number; endpoints: { id: string; url: string }[] }> =>
    ipcRenderer.invoke('webhooks:status'),
  /** Start the webhook server again after a failed start (0.5.3). */
  webhooksRetry: (): Promise<{ ok: boolean; url?: string; error?: string }> => ipcRenderer.invoke('webhooks:retry'),

  // ─── Triggers: history ledger + approval gate ───────────────────────────────
  /** The whole ledger, newest first (both directions, both sources). */
  listTriggerHistory: (): Promise<TriggerHistoryEntry[]> =>
    ipcRenderer.invoke('triggerHistory:list'),
  /** Answer a held message. 'approved' RELEASES it to the hive (card + god
   *  request, the same path an auto-allowed message takes); 'rejected' only flips
   *  the verdict. Deciding an already-decided entry is a no-op, never a second
   *  dispatch. Resolves to the updated row, or null when the id is gone. */
  decideTriggerHistory: (arg: { id: string; decision: 'approved' | 'rejected' }): Promise<TriggerHistoryEntry | null> =>
    ipcRenderer.invoke('triggerHistory:decide', arg),
  /** Wipe the ledger, or just one source's half of it. */
  clearTriggerHistory: (source?: 'webhook' | 'org'): Promise<void> =>
    ipcRenderer.invoke('triggerHistory:clear', source),
  /** Fires whenever the ledger changes (an inbound arrived, a verdict landed, a
   *  reply was paired), so the history tab live-refreshes. */
  onTriggerHistoryUpdated: (cb: () => void): (() => void) => {
    const listener = (): void => cb();
    ipcRenderer.on('triggerHistory:updated', listener);
    return () => ipcRenderer.removeListener('triggerHistory:updated', listener);
  },

  // ─── Integrations registry (Phase 2 — labeled REST endpoints via the secret broker) ──
  // Bridges the §6 IPC surface for the Settings UI. WRITE-ONLY secret contract end to
  // end: `integrationsList` returns records with secretRef redacted to `hasSecret`;
  // `integrationsSetSecret` takes a secret ONE WAY (never echoed); NO method ever
  // returns a secret value to the renderer. Method names match registryClient's
  // feature-detection (camelCase ↔ colon-channel), so its real path activates as-is.
  // Custom secrets (Keys & Secrets): names out, values in, never a value out.
  customSecretList: (): Promise<string[]> => ipcRenderer.invoke('customSecret:list'),
  customSecretSet: (req: { name: string; value: string }): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('customSecret:set', req),
  customSecretRemove: (name: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('customSecret:remove', name),
  integrationsList: (): Promise<IntegrationRecordView[]> =>
    ipcRenderer.invoke('integrations:list'),
  integrationsTemplates: (): Promise<IntegrationTemplate[]> =>
    ipcRenderer.invoke('integrations:templates'),
  integrationsUpsert: (record: IntegrationRecord): Promise<{ ok: true; record: IntegrationRecord } | { ok: false; error: string }> =>
    ipcRenderer.invoke('integrations:upsert', record),
  /** Keys that wait for the person's yes (masked, never a value), and Done. */
  integrationsKeyCheck: (): Promise<{
    integrations: Array<{ ref: string; shown: string; name: string; url: string }>;
    keys: Array<{ ref: string; shown: string; name: string; provider: boolean; head: string; tail: string; length: number }>;
    lost: Array<{ ref: string; name: string; kind: 'integration' | 'key' }>;
    unchecked: boolean;
    uncheckedNames: Array<{ name: string; kind: 'integration' | 'key' }>;
    notInUse: boolean;
  }> => ipcRenderer.invoke('integrations:keyCheck'),
  integrationsKeyCheckAnswer: (req: { answers: Array<{ ref: string; shown: string; keep: boolean }>; lost?: string[]; unchecked?: boolean }): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('integrations:keyCheckAnswer', req),
  integrationsSetSecret: (req: { id: string; secret: string; baseUrl: string }): Promise<{ ok: boolean; error?: string; held?: boolean }> =>
    ipcRenderer.invoke('integrations:setSecret', req),
  /** The form's Save: the record, and its key when one was typed. One call, so both are saved or neither. */
  integrationsSave: (req: { record: IntegrationRecord; secret?: string }): Promise<{ ok: boolean; error?: string; code?: string }> =>
    ipcRenderer.invoke('integrations:save', req),
  integrationsRemove: (req: { id: string }): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('integrations:remove', req),
  integrationsTest: (req: { id: string; path?: string } | { draft: unknown; secret: string }): Promise<{ ok: boolean; status?: number; error?: string }> =>
    ipcRenderer.invoke('integrations:test', req),
  /** 0.5.6: the Integrations screen's Activity tab (shared/integrationActivity.ts). */
  integrationsActivity: (key: IntegrationActivityKey): Promise<IntegrationActivityItem[]> =>
    ipcRenderer.invoke('integrations:activity', key),
  // Per-CLI-provider BYOK keys — WRITE-ONLY. `providerKeySet` stores a backend key one
  // way (never echoed); `providerKeyHas` returns only a boolean; no method ever returns
  // the plaintext. Keys are materialized MAIN-ONLY at spawn.
  providerKeySet: (req: { backend: string; key: string }): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('providerKey:set', req),
  providerKeyHas: (backend: string): Promise<boolean> =>
    ipcRenderer.invoke('providerKey:has', backend),
  providerKeyClear: (backend: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('providerKey:clear', backend),
  // Realtime Michael (voice orchestrator) — MAIN mints a short-lived EPHEMERAL token
  // from the BYOK OpenAI key; the real key NEVER crosses IPC. `realtimeHasOpenAiKey`
  // is a presence boolean only (gates the voice toggle, like providerKeyHas).
  realtimeHasOpenAiKey: (): Promise<boolean> =>
    ipcRenderer.invoke('realtime:hasKey'),
  realtimeMintToken: (
    req?: { model?: string }
  ): Promise<
    | { ok: true; token: string; expiresAt: number | null; sessionConfig: { model: string } }
    | { ok: false; error: string; code?: string }
  > => ipcRenderer.invoke('realtime:mintToken', req ?? {}),
  // rt-5 voice ACTIONS — the renderer holds NO policy; main (realtimeActions.ts) owns
  // the tiering, two-step verbal confirm, hard allowlist, and michael-voice
  // attribution. These just forward {verb,...args} and speak back `spoken`.
  realtimeAction: (
    payload: { verb: string } & Record<string, unknown>
  ): Promise<{ ok: boolean; spoken: string; needsConfirm?: boolean }> =>
    ipcRenderer.invoke('realtime:action', payload),
  realtimeActionConfirm: (
    req: { phrase: string }
  ): Promise<{ ok: boolean; spoken: string; needsConfirm?: boolean }> =>
    ipcRenderer.invoke('realtime:action:confirm', req),
  realtimeActionCancel: (): Promise<{ ok: boolean; spoken: string; needsConfirm?: boolean }> =>
    ipcRenderer.invoke('realtime:action:cancel'),
  // rt-12 completion seam — a voice-dispatched task finished. `summary` is the
  // human-speakable line Michael relays; the rest is context for a toast/log.
  onRealtimeCompletion: (
    cb: (evt: { correlationId: string; kind: string; targetAgentId: string; taskId?: string; summary: string; completedAt: number; objective?: string }) => void
  ): (() => void) => {
    const listener = (_e: IpcRendererEvent, payload: Parameters<typeof cb>[0]) => cb(payload);
    ipcRenderer.on('realtime:completion', listener);
    return () => ipcRenderer.removeListener('realtime:completion', listener);
  },
  /** Tell main whether a live voice session is open (drives queue-vs-push for completions). */
  realtimeSetSessionLive: (live: boolean): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('realtime:setSessionLive', live),
  /** Drain completions that arrived while no session was open (warm-start catch-up). */
  realtimeDrainCompletions: (): Promise<
    { correlationId: string; kind: string; targetAgentId: string; taskId?: string; summary: string; completedAt: number; objective?: string }[]
  > => ipcRenderer.invoke('realtime:drainCompletions'),
  /** Block until a tracked task completes (or times out) — backs the wait_for tool. */
  realtimeWaitFor: (
    taskId: string,
    timeoutMs?: number
  ): Promise<{ summary: string; targetAgentId: string; taskId?: string } | { timedOut: true; taskId: string }> =>
    ipcRenderer.invoke('realtime:waitFor', taskId, timeoutMs),
  /** v0.3.4: coalesced floor deltas pushed while a voice session is live — the
   *  renderer injects them into the conversation as silent items. */
  onRealtimeFloorDelta: (cb: (evt: { text: string }) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, payload: { text: string }) => cb(payload);
    ipcRenderer.on('realtime:floorDelta', listener);
    return () => ipcRenderer.removeListener('realtime:floorDelta', listener);
  },
  /** v0.3.4: main-staged queue insertions (voice clear_context) — the renderer
   *  enqueues so delivery rides every existing safety gate. */
  onRealtimeEnqueue: (cb: (evt: { agentId: string; text: string }) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, payload: { agentId: string; text: string }) => cb(payload);
    ipcRenderer.on('realtime:enqueue', listener);
    return () => ipcRenderer.removeListener('realtime:enqueue', listener);
  },
  /** v0.3.4: app self-knowledge — version + newest changelog sections. */
  appInfo: (): Promise<{ version: string; changelog: string }> =>
    ipcRenderer.invoke('app:info'),
  // ─── Roster mirror (agents + notes + queues, shared dev ↔ packaged) ─────────
  /** Read the roster file beside the hive. SYNCHRONOUS on purpose: the zustand
   *  store is created at module load, so an async read would arrive after the
   *  first render and the floor would flash empty. One blocking round trip at
   *  boot. `null` = no file (or unreadable) — the caller then uses localStorage. */
  rosterReadSync: (): RosterSnapshot | null => {
    try { return ipcRenderer.sendSync('roster:readSync') ?? null; } catch { return null; }
  },
  /** Which hive is open, synchronously — same boot-time constraint as
   *  `rosterReadSync`, and read in the same breath: the store has to know which
   *  hive its localStorage keys belong to before it decides to trust them. */
  harnessHomeSync: (): string | null => {
    try { return ipcRenderer.sendSync('config:homeSync') ?? null; } catch { return null; }
  },
  /** Mirror the roster to disk. Debounced by the caller; main keeps the previous
   *  contents as a backup and refuses a first write that would empty a full file. */
  rosterWrite: (snap: RosterSnapshot): Promise<{ ok: boolean; skipped?: string; error?: string }> =>
    ipcRenderer.invoke('roster:write', snap),

  // ─── Update notice (releases are source only; nothing downloads) ──────────
  /** Push channel from main's updater: checking, the newer release it found,
   *  the release just updated to, or the error, so the toolbar badge, the toast
   *  and Settings all show the same thing. */
  onUpdateStatus: (cb: (status: UpdateStatus) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, payload: UpdateStatus) => cb(payload);
    ipcRenderer.on('update:status', listener);
    return () => ipcRenderer.removeListener('update:status', listener);
  },
  /** The last known status — a reloaded window subscribes AFTER main may have
   *  already emitted, so it pulls the current state instead of waiting 6h. */
  updateCurrent: (): Promise<UpdateStatus> => ipcRenderer.invoke('update:current'),
  // ─── The walkthrough ──────────────────────────────────────────────
  /** Manual re-check. */
  updateCheckNow: (): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('update:checkNow'),
  /** Open the page of the newer release, or the releases page without a URL. */
  updateOpenRelease: (url?: string): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('update:openRelease', url),
  /** Which OS this window runs on, for platform-specific copy. */
  platform: process.platform as string,
  /** Off the Mac, the app's bar is the window's top row (main windowFrame): the application menu opens under a
   *  point of it, and the system's window controls take the bar's colours (#rrggbb) and height. The Mac answers no. */
  windowChrome: {
    popupMenu: (x: number, y: number): Promise<{ ok: boolean }> => ipcRenderer.invoke('appMenu:popup', { x, y }),
    setControls: (c: { color: string; symbolColor: string; height: number }): Promise<{ ok: boolean }> => ipcRenderer.invoke('window:controls', c)
  },
  /** DEV ONLY: fabricate an update status so the notice can be inspected without
   *  cutting a release. Refused (`{ok:false}`) in a packaged build; see the
   *  handler in updater.ts. Call it from the devtools console:
   *    await window.cth.updateSimulate()                       // the corner notice with its digest
   *    await window.cth.updateSimulate({ drop: true })          // the centered release page
   *    await window.cth.updateSimulate({ notes: '<!-- drop -->…' }) // your own drop */
  updateSimulate: (opts?: {
    version?: string;
    notes?: string;
    /** Preview the centered release page using the default drop template. */
    drop?: boolean;
  }): Promise<{ ok: boolean; error?: string }> => ipcRenderer.invoke('update:simulate', opts),

};

contextBridge.exposeInMainWorld('cth', api);

export type CthApi = typeof api;
