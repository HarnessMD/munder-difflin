import type { TranscribeConfig } from '../shared/transcribeConfig';
import type { RouterStatus as TranscribeStatus } from '../main/transcribe/router';
import { contextBridge, ipcRenderer, webUtils, type IpcRendererEvent } from 'electron';
import type { AttachWant } from '../shared/attachDialog';
import type { AgentProvider } from '../shared/agentProvider';
import type { CliMissingState } from '../shared/cliMissing';
import type { CliSetupState } from '../shared/cliSetup';
import type { LoginEvent } from '../shared/cliLogin';
import type { HireManifest } from '../shared/hire';
import type { AvatarRecipe, CustomAvatar } from '../shared/avatars';
export type { HireManifest } from '../shared/hire';
import type { PuckDictationEvent } from '../shared/dictationFeedback';
import type {
  TeamsMode, MembershipView, EnrolResult, EnrolProgress, ConnectionView, LockInfo,
  ThreadView, PendingRequest, RequestDecision, Delivery, OrgView,
} from '../shared/teams';
export type {
  TeamsMode, MembershipView, EnrolResult, EnrolProgress, CodeError, ConnectionView, LockInfo,
  ThreadView, PendingRequest, RequestDecision, Delivery, OrgView,
} from '../shared/teams';
import type { IntegrationRecord, IntegrationTemplate } from '../shared/integrations';
export type { IntegrationRecord, IntegrationTemplate } from '../shared/integrations';
import type { UpdateStatus } from '../shared/updateState';
import type { MeetingMeta, PuckConfig, PuckMeeting, PuckMeetingFilter, PuckRect, PuckScreenshot, PuckState } from '../shared/puck';
export type { UpdateStatus } from '../shared/updateState';
import type { ToolStatus } from '../shared/toolCatalog';
import type { WorktreeDeleteRefusal, WorktreeRow, WorktreeWork } from '../shared/worktreeList';
export type { ToolStatus } from '../shared/toolCatalog';
import type { HeroPayload } from '../shared/heroPayload';
export type { HeroPayload } from '../shared/heroPayload';
import type { ModelCatalog } from '../shared/modelCatalogPayload';
export type { ModelCatalog, CatalogModel } from '../shared/modelCatalogPayload';
import type { HookEvent } from '../shared/hookEvents';
import type { ActivityEntry, ActivityPush } from '../shared/activity';
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
import type { BillingSummary } from '../shared/billing';

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
  act: 'request' | 'inform' | 'propose' | 'query' | 'agree' | 'refuse' | 'done';
  subject: string;
  body: string;
  hops: number;
  requires_reply: boolean;
  needs_human: boolean;
  created_at: string;
}

/** A hive message reshaped for the voice read-layer (`hive:messages`). `subject`
 *  and `body` are REDACTED in the main process before crossing this boundary —
 *  the renderer never receives a raw body or a secret. Mirror of `VoiceMessage`
 *  in src/main/hive.ts. */
/** Mirror of main's HumanMailSummary (hive.ts): the Pro rail's badge data. */
export interface HumanMailSummary {
  count: number;
  latest: string;
  texts: { id: string; at: string; subject: string; body: string }[];
}

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
  act: 'request' | 'inform' | 'propose' | 'query' | 'agree' | 'refuse' | 'done';
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
  act: 'request' | 'inform' | 'propose' | 'query' | 'agree' | 'refuse' | 'done';
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
  registeredRepos: string[];
  autoMode: boolean;
  /** May the orchestrator start agents on its own? Default false. Mirrors
   *  src/main/config.ts; written by Settings and the orchestrator's screen. */
  orchestratorMaySpawn?: boolean;
  /** How many ephemeral workers may run at once. Default 4. Mirrors
   *  src/main/config.ts; written by the orchestrator's Budget & breaker tab. */
  maxConcurrentWorkers?: number;
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
  /** Sidebar shows only agents and notes. Mirrors src/main/config.ts. */
  sidebarAgentsNotesOnly?: boolean;
  /** Custom avatars from the sprite editor. Mirrors src/main/config.ts. */
  avatars?: CustomAvatar[];
  /** Auto-update from GitHub releases (default ON; Settings → General). */
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
  /** Free Flow voice dictation — master flag (default off), user Groq key, model.
   *  Entry point B (hold-Option-to-talk) is handled in the renderer, no hotkey. */
  freeflowEnabled?: boolean;
  groqApiKey?: string;
  freeflowModel?: string;
  /** 0.5.3, F16: dictation and meetings. Always complete when read. */
  transcribe?: TranscribeConfig;
  /** Realtime Michael voice loop — true ONLY while a session holds the mic
   *  (renderer session sets it at start()/stop()); the main mic permission gate
   *  reads it. Default off. */
  realtimeVoiceEnabled?: boolean;
  /** Realtime voice idle auto-disconnect (ms); default 180000 (3 min), 0 = never.
   *  Tuned in Settings → Realtime Michael; the cost cap stays the runaway guard. */
  realtimeIdleDisconnectMs?: number;
  costCapUsd?: number;
  costCapTokens?: number;
  agentTokenCaps?: Record<string, number>;
  /** Per-agent MCP overrides (see shared/agentMcp.ts). */
  agentMcp?: Record<string, Record<string, { enabled: boolean }>>;
  autoDeliveryPausedAgents?: string[];
  maxTurns?: number;
  circuitBreaker?: CircuitBreakerConfig;
  /** Enterprise Knowledge Graph (multimodal context for agents). Default OFF. */
  knowledgeGraph?: KnowledgeGraphConfig;
  /** Terminal theme, mirrored into each agent's per-session Claude settings. */
  terminalTheme?: 'light' | 'dark';
  /** The view the office opens in (0.4.11), Classic 'office' or PRO 'professional'. */
  defaultView?: 'office' | 'professional';
  /** TV-show office themes feature flag (Settings picker + switch flow). Default OFF. */
  tvShowOffices?: boolean;
  /** Active office map/cast theme (honored only when tvShowOffices is on). */
  officeTheme?: 'office' | 'friends' | 'brooklyn99' | 'siliconvalley' | 'got' | 'hogwarts';
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
  /** The floating puck (Pro). A PARTIAL is accepted on the way in: main merges
   *  it onto the saved object and normalises (shared/puck.ts). Mirrors main +
   *  renderer HarnessConfig. */
  puck?: Partial<PuckConfig>;
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

  /** The two money-funnel events only the renderer can see: a purchase surface
   *  was drawn (`paywall_shown`) or a dead end was (`access_blocked`). See
   *  TELEMETRY.md for both. Every value is a closed enum re-checked in main,
   *  which drops the whole event rather than send an unrecognised one, so this
   *  bridge cannot widen the contract. Same never-throw rule as above: a
   *  telemetry hiccup must not break drawing the paywall. */
  trackFunnel: (
    /** `checkout_opened` crosses for TEAMS only — the PRO checkout is opened
     *  and reported in main. Main refuses any other plan on this channel, so
     *  this cannot double-count it. */
    event: 'paywall_shown' | 'access_blocked' | 'checkout_opened',
    props: Record<string, string>
  ): Promise<void> =>
    ipcRenderer.invoke('analytics:funnel', event, props).then(() => undefined, () => undefined),

  // ─── PTY ─────────────────────────────────────────────────────────────────
  /** `cwd` in the result is the TILDE-EXPANDED absolute path main actually spawned
   *  into — the renderer stores that, not the raw `~/…` the user typed. */
  /** `cliMissing` (I2, 0.5.3): the engine binary is not installed, nothing was
   *  spawned, and the terminal draws the card; the agent still exists. */
  spawnPty: (opts: SpawnPtyOptions): Promise<{ ok: boolean; error?: string; cwd?: string; worktreePath?: string; resumeNotFound?: boolean; resumed?: boolean; seedPrompt?: string; cliMissing?: CliMissingState }> =>
    ipcRenderer.invoke('pty:spawn', opts),
  /** The card's button: run the install the card named in this terminal, or
   *  check again for a CLI installed by hand. The pty restarts alone. */
  installCli: (id: string): Promise<{ ok: boolean; error?: string; cliMissing?: CliMissingState }> =>
    ipcRenderer.invoke('pty:installCli', id),
  writePty: (id: string, data: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('pty:write', id, data),
  resizePty: (id: string, cols: number, rows: number): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('pty:resize', id, cols, rows),
  redrawPty: (id: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('pty:redraw', id),
  /** `why` tells main who is ending it (0.5.3). Leave it out for a person
   *  stopping the agent. 'restart' and 'revive' keep the agent's worktree, since
   *  it is about to be started in it again; 'sweep' is a bulk teardown. Main
   *  treats anything else as a person, so this can only make a kill safer. */
  killPty: (id: string, why?: 'restart' | 'revive' | 'sweep'): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('pty:kill', id, why),
  listPtys: (): Promise<Array<{
    id: string;
    cwd: string;
    command: string;
    pid: number;
    lastOutputAt: number;
    hasOutput: boolean;
  }>> =>
    ipcRenderer.invoke('pty:list'),
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
   *  "process exited" line + re-enable input) so the relaunched CLI paints clean. */
  onPtyRelaunch: (id: string, cb: () => void): (() => void) => {
    const channel = `pty:relaunch:${id}`;
    const listener = () => cb();
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
  updateConfig: (patch: Partial<HarnessConfig>): Promise<HarnessConfig> =>
    ipcRenderer.invoke('config:update', patch),
  /** Set or clear one per-agent token ceiling against main's latest config. */
  /** Create (no id) or update (id) one custom avatar. Main validates the
   *  recipe and merges against the config on disk; resolves to the full config. */
  saveAvatar: (input: { id?: string; name: string; recipe: AvatarRecipe }): Promise<HarnessConfig> =>
    ipcRenderer.invoke('config:saveAvatar', input),
  deleteAvatar: (id: string): Promise<HarnessConfig> =>
    ipcRenderer.invoke('config:deleteAvatar', id),
  setAgentTokenCap: (agentId: string, tokenCap?: number): Promise<HarnessConfig> =>
    ipcRenderer.invoke('config:setAgentTokenCap', agentId, tokenCap),
  /** Grant or revoke one MCP server for one agent, or clear the row (null) so
   *  the agent follows the floor-wide default again. */
  setAgentMcp: (agentId: string, mcpId: string, enabled: boolean | null): Promise<HarnessConfig> =>
    ipcRenderer.invoke('config:setAgentMcp', agentId, mcpId, enabled),
  ensureHarnessHome: (path: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('config:ensureHome', path),
  /** Change the harness home folder. 'move' copies the existing hive + palace
   *  into the new folder (old kept as a safety net); 'fresh' just re-points and
   *  bootstraps an empty home. On success the app relaunches (never resolves);
   *  on failure (e.g. copy error) returns { ok: false, error }. */
  changeHome: (newHome: string, mode: 'move' | 'fresh'): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('config:changeHome', { newHome, mode }),

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

  // ─── Dictate into any app (0.5.3, F16, macOS) ───────────────────────────
  /** What has focus in this window, for who takes a held Option (shared/dictationFocus). */
  dictationFocus: (focus: 'composer' | 'field' | 'password' | 'other'): void => { ipcRenderer.send('dictation:focus', focus); },
  /** F16, every platform from 23 Sep: `reason` says why the switch is off
   *  (no-helper, wayland, floor); `transcriber` is the engine the loop would use. */
  anyAppStatus: (): Promise<{ available: boolean; reason: 'no-helper' | 'wayland' | 'floor' | null; platform: string; armed: string | null; transcriber: 'apple' | 'whisper' | 'groq' | null; permissions: { mic: string; accessibility: boolean; postEvent: boolean } | null }> =>
    ipcRenderer.invoke('anyApp:status'),
  anyAppStart: (key: string, words: string[]): Promise<{ ok: boolean; key?: string; keyCode?: number; error?: string; detail?: string }> =>
    ipcRenderer.invoke('anyApp:start', key, words),
  anyAppStop: (): Promise<{ ok: boolean }> => ipcRenderer.invoke('anyApp:stop'),
  anyAppRequestMic: (): Promise<{ ok: boolean; mic?: string; error?: string }> => ipcRenderer.invoke('anyApp:requestMic'),
  anyAppRequestAccessibility: (): Promise<{ ok: boolean; accessibility?: boolean; error?: string }> => ipcRenderer.invoke('anyApp:requestAccessibility'),
  anyAppOpenSettings: (pane: 'accessibility' | 'microphone'): Promise<{ ok: boolean; error?: string }> => ipcRenderer.invoke('anyApp:openSettings', pane),
  anyAppTestPaste: (text?: string): Promise<{ ok: boolean; posted?: boolean; error?: string }> => ipcRenderer.invoke('anyApp:testPaste', text),
  onAnyAppEvent: (cb: (e: { type: string; [k: string]: unknown }) => void): (() => void) => {
    const listener = (_e: Electron.IpcRendererEvent, ev: { type: string; [k: string]: unknown }) => cb(ev);
    ipcRenderer.on('anyApp:event', listener);
    return () => ipcRenderer.removeListener('anyApp:event', listener);
  },
  hiveTasks: (): Promise<unknown> => ipcRenderer.invoke('hive:tasks'),
  hiveTicketPrefix: (): Promise<string> => ipcRenderer.invoke('hive:ticketPrefix'),
  /** The archive ledger (hive/tasks-archive.json): cards the hourly hygiene
   *  sweep moved off the live ledger, newest first, each with archivedAt and
   *  archiveReason. Read only; the Archived chip on Tasks reads it. */
  hiveTasksArchive: (): Promise<unknown> => ipcRenderer.invoke('hive:tasksArchive'),
  hiveLog: (n?: number): Promise<unknown[]> => ipcRenderer.invoke('hive:log', n ?? 200),
  hiveMemory: (id: string): Promise<string> => ipcRenderer.invoke('hive:memory', id),
  hiveInbox: (id: string): Promise<HiveMessage[]> => ipcRenderer.invoke('hive:inbox', id),
  /** Voice read-layer: recent message CONTENT (inbox/outbox bodies), REDACTED in
   *  main. Pass { id } for one message, { agentId } to scope to one mailbox, or
   *  {} for the whole floor. Backs Realtime Michael's get_messages. The renderer
   *  never sees a raw body or a secret — stripping happens main-side. */
  hiveMessages: (opts?: { agentId?: string; id?: string; limit?: number; includeArchived?: boolean }): Promise<VoiceMessage[]> =>
    ipcRenderer.invoke('hive:messages', opts ?? {}),
  /** 0.5.3, F25, the Pro rail's badge: per agent, the mail it sent the person
   *  after the stamp given for it (ISO), as a count, the newest stamp and the
   *  first three texts. No stamp for an agent counts all of its mail. */
  hiveHumanMailSince: (since: Record<string, string>): Promise<Record<string, HumanMailSummary>> =>
    ipcRenderer.invoke('hive:humanMailSince', since),
  /** The other side of the call (0.5.3, F16): whether this machine can record
   *  it, whether the grant is there, and where it would come from. The
   *  Settings row draws these; `systemAudioRequest` asks for the grant. */
  systemAudioStatus: (): Promise<{ platform: NodeJS.Platform; available: boolean; granted: boolean; source: 'helper' | 'renderer' | null; reason?: string; detail?: string }> =>
    ipcRenderer.invoke('systemAudio:status'),
  /** Linux (PR 4): the puck tells main which monitor of the output PulseAudio
   *  or PipeWire lists, or null when none is; main answers status and the
   *  meeting's source from it. */
  systemAudioMonitor: (m: { deviceId: string; label: string } | null): void => { ipcRenderer.send('systemAudio:monitor', m); },
  /** The meeting chord (0.5.3, F16): the chord in force, the platform's
   *  default, whether it is armed, and if not why (floor, not-available,
   *  no-tap, bad-key, register-failed, start-failed). */
  captureHotkeyStatus: (): Promise<{ platform: NodeJS.Platform; key: string; defaultKey: string; armed: string | null; reason: string | null; detail?: string }> =>
    ipcRenderer.invoke('captureHotkey:status'),
  meetingHotkeyStatus: (): Promise<{ platform: NodeJS.Platform; key: string; defaultKey: string; armed: string | null; reason: string | null; detail?: string }> =>
    ipcRenderer.invoke('meetingHotkey:status'),
  systemAudioRequest: (): Promise<{ ok: boolean; granted?: boolean; error?: string }> => ipcRenderer.invoke('systemAudio:request'),
  systemAudioOpenSettings: (): Promise<{ ok: boolean; error?: string }> => ipcRenderer.invoke('systemAudio:openSettings'),
  /** Consolidated per-agent directory (registry + telemetry + context), incl.
   *  archived agents. Backs Realtime Michael's get_agent_detail / list_agents. */
  hiveAgentDirectory: (): Promise<AgentDirectory> => ipcRenderer.invoke('hive:agentDirectory'),

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
  /** Condense agent memory.md files (the janitor's missing half). With an id,
   *  condense that agent on demand; without, run a full threshold scan. Returns
   *  the per-agent outcomes ({ id, condensed, reason, oldBytes?, newBytes? }). */
  reflectNow: (id?: string): Promise<Array<{ id: string; condensed: boolean; reason: string; oldBytes?: number; newBytes?: number }>> =>
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
  /** Open an OS picker for files and folders (0.5.3, I8); returns chosen
   *  absolute paths + names, a folder's name ending in "/". `want` picks the
   *  kind on Windows and Linux, which cannot mix them in one picker. */
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

  // ─── File share (one local file, one public link, dead in an hour) ─────────
  // The cross MACHINE path for a file. `attachFiles` above hands an agent a
  // LOCAL PATH, which only works when it shares a filesystem with the sender;
  // this publishes the file on a tunnel link a teammate on another machine can
  // fetch, and the link expires one hour after it was made.
  //
  // The path travels ONE WAY and is a request, not a fact: main re-validates it
  // (absolute, a regular file, under the size cap) before anything is bound.
  // Nothing here ever returns a local path or a bare token; the token exists
  // only inside the URL, because a link without it cannot be a link.
  /** Publish one file for an hour. Refusals come back as a CODE the UI
   *  translates, never a sentence that could carry a path. */
  fileShareCreate: (filePath: string): Promise<
    | { ok: true; share: import('../shared/fileShare').FileShareView }
    | { ok: false; error: import('../shared/fileShare').ShareRefusal }
  > => ipcRenderer.invoke('fileShare:create', filePath),
  /** Live shares, newest first. Already swept, so an expired one is never in it. */
  fileShareList: (): Promise<import('../shared/fileShare').FileShareView[]> =>
    ipcRenderer.invoke('fileShare:list'),
  /** Kill one link early. Deletes NOTHING on disk: a share is a link, not a copy. */
  fileShareRevoke: (id: string): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('fileShare:revoke', id),

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
  /** v0.4.9 phase 2: the per agent activity digest main keeps from hook
   *  events (shared/activity.ts). Oldest first, at most `limit` entries. */
  agentActivity: (agentId: string, limit?: number): Promise<ActivityEntry[]> =>
    ipcRenderer.invoke('hive:agentActivity', agentId, limit ?? 200),
  onAgentActivity: (cb: (e: ActivityPush) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, payload: ActivityPush) => cb(payload);
    ipcRenderer.on('hive:agentActivity', listener);
    return () => ipcRenderer.removeListener('hive:agentActivity', listener);
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
      id: string; name: string; provider?: string; cwd: string;
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
  /** Another window (the puck) asked for Settings; App answers with the
   *  same `cth:open-settings` event the titlebar gear dispatches. */
  onOpenSettings: (cb: (arg: { section?: string }) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, arg: { section?: string }) => cb(arg ?? {});
    ipcRenderer.on('settings:open', listener);
    return () => ipcRenderer.removeListener('settings:open', listener);
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
  /** Fires when an autoCompact mission ticks — the renderer queues a /compact
   *  per agent (deduped) and delivers it when each agent is idle. */
  onAutoCompact: (cb: () => void): (() => void) => {
    const listener = (): void => cb();
    ipcRenderer.on('mission:autoCompact', listener);
    return () => ipcRenderer.removeListener('mission:autoCompact', listener);
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
  onSlackMessage: (cb: (msg: { text: string; channel: string; ts: string; thread_ts: string; autonomyPreamble?: string; responder?: string; files?: { path: string; name: string; mimetype: string }[] }) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, msg: { text: string; channel: string; ts: string; thread_ts: string; autonomyPreamble?: string; files?: { path: string; name: string; mimetype: string }[] }) => cb(msg);
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

  // ─── Free Flow (voice dictation → message queue) ─────────────────────────────
  /** Persist Free Flow settings (flag / Groq key / model). The Groq key is stored
   *  in main config; entry point B (hold-Option) is renderer-side, no hotkey here. */
  freeflowSetConfig: (patch: {
    enabled?: boolean; apiKey?: string; model?: string;
  }): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('freeflow:setConfig', patch),
  /** Transcribe one captured audio clip via Groq (the key stays in main; only the
   *  audio bytes go in and the transcript comes back). Gated on the flag + a key. */
  freeflowTranscribe: (arg: {
    audio: ArrayBuffer | Uint8Array; mimeType?: string; filename?: string; language?: string;
  }): Promise<{ ok: boolean; text?: string; error?: string }> =>
    ipcRenderer.invoke('freeflow:transcribe', arg),

  // ─── Dictation and meetings (0.5.3, F16): the local engines and their settings ──
  /** What can transcribe on this machine, which engine each mode gets, the
   *  whisper models on disk, and how many words reach each engine. */
  transcribeStatus: (): Promise<TranscribeStatus> => ipcRenderer.invoke('transcribe:status'),
  /** Save part of the dictation block; main re-arms or disarms the any app key at once. */
  transcribeSetConfig: (patch: Partial<TranscribeConfig>): Promise<{ ok: boolean; config: TranscribeConfig; status: TranscribeStatus }> =>
    ipcRenderer.invoke('transcribe:setConfig', patch),
  /** Fetch the optional small model (190 MB) into userData; progress arrives on onTranscribeDownloadProgress. */
  transcribeDownloadModel: (id: 'small'): Promise<{ ok: true; path: string } | { ok: false; error: string }> =>
    ipcRenderer.invoke('transcribe:downloadModel', id),
  onTranscribeDownloadProgress: (cb: (p: { id: string; received: number; total: number | null }) => void): (() => void) => {
    const listener = (_e: Electron.IpcRendererEvent, p: { id: string; received: number; total: number | null }) => cb(p);
    ipcRenderer.on('transcribe:downloadProgress', listener);
    return () => ipcRenderer.removeListener('transcribe:downloadProgress', listener);
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
  integrationsSetSecret: (req: { id: string; secret: string }): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('integrations:setSecret', req),
  integrationsRemove: (req: { id: string }): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('integrations:remove', req),
  integrationsTest: (req: { id: string; path?: string }): Promise<{ ok: boolean; status?: number; error?: string }> =>
    ipcRenderer.invoke('integrations:test', req),
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

  // ─── Auto-update (v0.3.4; full state model v0.3.7) ──────────────────────────
  /** Push channel from main's updater — every stage of the pipeline, so the
   *  toolbar badge can show "checking", download progress, and the staged
   *  "restart to update" rather than only the terminal states. */
  onUpdateStatus: (cb: (status: UpdateStatus) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, payload: UpdateStatus) => cb(payload);
    ipcRenderer.on('update:status', listener);
    return () => ipcRenderer.removeListener('update:status', listener);
  },
  /** The last known status — a reloaded window subscribes AFTER main may have
   *  already emitted, so it pulls the current state instead of waiting 6h. */
  updateCurrent: (): Promise<UpdateStatus> => ipcRenderer.invoke('update:current'),
  /** Quit and install the downloaded update — only ever called from an explicit
   *  "restart to update" click. */
  updateRestartAndInstall: (): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('update:restartAndInstall'),
  /** Manual re-check. */
  updateCheckNow: (): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('update:checkNow'),
  /** Start the download for an already-detected update (autoDownload normally
   *  beats the user to it; this is the explicit one-click path). */
  updateDownload: (): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('update:download'),
  /** Open the project's releases page for a notify-only update. */
  updateOpenRelease: (url?: string): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('update:openRelease', url),
  /** Which OS this window runs on, for platform-specific copy. */
  platform: process.platform as string,
  arch: process.arch as string,
  /** DEV ONLY — fabricate an update status so the toast can be inspected without
   *  cutting a release. Refused (`{ok:false}`) in a packaged build; see the
   *  handler in updater.ts. Call it from the devtools console:
   *    await window.cth.updateSimulate()                       // notify-only digest toast
   *    await window.cth.updateSimulate({ state: 'downloaded' }) // restart-to-update toast
   *    await window.cth.updateSimulate({ drop: true })          // the centered release page
   *    await window.cth.updateSimulate({ notes: '<!-- drop -->…' }) // your own drop */
  updateSimulate: (opts?: {
    state?: 'downloaded' | 'available-manual';
    version?: string;
    notes?: string;
    /** Preview the centered release page using the default drop template. */
    drop?: boolean;
  }): Promise<{ ok: boolean; error?: string }> => ipcRenderer.invoke('update:simulate', opts),

  // ─── Teams: device identity ──────────────────────────────────────────────
  /* Only the PUBLIC half of the identity ever crosses this bridge. The Ed25519
     secret key stays in main, encrypted at rest, and there is deliberately no
     channel that returns it. Sealing and opening happen in main for the same
     reason. */

  /** Whether this machine has enrolled. Safe on the solo path: it reads the
   *  filesystem and does not generate anything. */
  teamsHasIdentity: (): Promise<boolean> => ipcRenderer.invoke('teams:identity:has'),

  /** Forget this machine's identity AND its membership (D14, or signing out).
   *  The next enrolment gets a new key and a new fingerprint, which is what
   *  D13 explains. */
  teamsForgetIdentity: (): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('teams:identity:forget'),
  /** Item 5, team back to individual. Guarded in main: allowed only when the
   *  relay says the org has exactly one member. `has-teammates` carries how
   *  many others there are so the screen can say why rather than just no;
   *  `unreachable` means the check could not be made, never that nobody is
   *  there. */
  /** Item 2: the paywall hand-off. Mints a state in main and opens the
   *  console's solo checkout in the real browser, where the person's session
   *  from step one already lives. */
  proCheckoutBegin: (): Promise<{ ok: true; url: string }> =>
    ipcRenderer.invoke('pro:checkout:begin'),
  /**
   * The return link's OUTCOME. Main checks the state, spends the grant and
   * redeems the key before this fires, so the renderer never handles either
   * credential; it is told what happened, not what was used.
   *
   * `recoverable` is the one field to branch on when `ok` is false. Kevin's
   * rule: `unauthorized` is what a SECOND deep link looks like once the grant
   * is spent, so a recoverable refusal must read as "finish with your licence
   * key", never as a failure shown to somebody who has just paid. It is also
   * how the not-yet-built endpoint (`unavailable`, a 404 today) degrades to
   * exactly the paste path the paywall already offers.
   */
  onProCheckoutReturn: (
    fn: (r:
      | { ok: true }
      | { ok: false; reason: string; recoverable?: boolean }
    ) => void
  ): (() => void) => {
    const listener = (_e: unknown, r: Parameters<typeof fn>[0]) => fn(r);
    ipcRenderer.on('pro:checkout:return', listener);
    return () => ipcRenderer.removeListener('pro:checkout:return', listener);
  },
  teamsLeave: (): Promise<
    | { ok: true; alreadySolo: boolean }
    | { ok: false; reason: 'has-teammates'; teammates: number }
    | { ok: false; reason: 'unreachable'; detail: string | null }
  > => ipcRenderer.invoke('teams:leave'),

  // ─── Teams: the gate and the join ────────────────────────────────────────
  /* There is no `ensureIdentity` any more. A key exists only because a relay
     accepted it: `teamsEnrol` below is the one path, and it writes nothing
     until the relay has said yes and the fingerprint checks out. */

  /** The gate's answer (plan section 5). Read once at mount, then subscribe. */
  teamsMode: (): Promise<TeamsMode> => ipcRenderer.invoke('teams:mode'),
  onTeamsMode: (cb: (mode: TeamsMode) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, mode: TeamsMode) => cb(mode);
    ipcRenderer.on('teams:mode', listener);
    return () => ipcRenderer.removeListener('teams:mode', listener);
  },

  /** Org and ids for the screens. Never key material. */
  teamsMembership: (): Promise<MembershipView | null> => ipcRenderer.invoke('teams:membership'),

  /* ---- the solo licence bridge (SoloProBridge in @shared/soloPro) --------
     Main owns the record and the redemption round trip; these are the three
     doors the licence step reads defensively off window.cth. */
  soloLicense: (): Promise<import('../shared/licenseKey').LicenseView | null> =>
    ipcRenderer.invoke('solo:license'),
  soloRedeemLicense: (key: string): Promise<import('../shared/soloPro').LicenseRedeemResult> =>
    ipcRenderer.invoke('solo:license:redeem', key),
  onSoloLicense: (cb: (view: import('../shared/licenseKey').LicenseView | null) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, view: import('../shared/licenseKey').LicenseView | null) => cb(view);
    ipcRenderer.on('solo:license', listener);
    return () => ipcRenderer.removeListener('solo:license', listener);
  },

  /* ---- the free door (5 Sep 2026, shared/freeTier.ts) --------------------
     Same shape as the solo licence bridge: main owns free.json and the
     sign-in round trip, the renderer reads the record and hears changes. */
  freeAccount: (): Promise<import('../shared/freeTier').FreeAccountView | null> =>
    ipcRenderer.invoke('free:account'),
  onFreeAccount: (cb: (view: import('../shared/freeTier').FreeAccountView | null) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, view: import('../shared/freeTier').FreeAccountView | null) => cb(view);
    ipcRenderer.on('free:account', listener);
    return () => ipcRenderer.removeListener('free:account', listener);
  },
  freeSignInBegin: (): Promise<{ ok: true; url: string; expiresAt: string }> =>
    ipcRenderer.invoke('free:signin:begin'),
  freeSignInPaste: (pasted: string): Promise<{ ok: true } | { ok: false; error: 'signin'; detail: string }> =>
    ipcRenderer.invoke('free:signin:paste', pasted),
  freeSignInCancel: (): Promise<{ ok: true }> => ipcRenderer.invoke('free:signin:cancel'),
  onFreeGrant: (cb: () => void): (() => void) => {
    const listener = () => cb();
    ipcRenderer.on('free:signin:grant', listener);
    return () => ipcRenderer.removeListener('free:signin:grant', listener);
  },
  freeRegister: (): Promise<import('../shared/freeTier').FreeRegisterResult> =>
    ipcRenderer.invoke('free:register'),
  /** Sign out: forget the account and any licence on this machine. */
  freeSignOut: (): Promise<{ ok: true }> => ipcRenderer.invoke('free:signout'),

  /**
   * 0.4.9: name this machine's orchestrator. The word is claimed on the relay
   * first, because uniqueness belongs to the org, and only an accepted claim
   * renames the agent here. `conflict` means someone else holds it and nothing
   * was renamed; `unsupported` and `offline` mean the machine kept the name
   * but the org has not been told yet.
   */
  teamsSetBossName: (name: string): Promise<
    | { ok: true; name: string; unsupported?: boolean; offline?: boolean }
    | { ok: false; error: 'conflict' | 'invalid'; detail: string | null }
  > => ipcRenderer.invoke('teams:bossName:set', name),

  /**
   * 0.5.2: the PERSON's display name, the one teammates see beside messages
   * and on their roster. Lives on the relay only, so there is no local half:
   * `unsupported` is a relay without the field, `offline` a relay that could
   * not be reached, and neither saved anything. `null` or '' clears it.
   */
  teamsSetName: (name: string | null): Promise<
    | { ok: true; name: string | null }
    | { ok: false; error: 'invalid' | 'solo' | 'unsupported' | 'offline'; detail?: string | null }
  > => ipcRenderer.invoke('teams:name:set', name),

  /** The socket's state (plan 4.3). Main is the only writer: read once, then subscribe. */
  teamsConnection: (): Promise<ConnectionView> => ipcRenderer.invoke('teams:connection'),
  onTeamsConnection: (cb: (v: ConnectionView) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, v: ConnectionView) => cb(v);
    ipcRenderer.on('teams:connection', listener);
    return () => ipcRenderer.removeListener('teams:connection', listener);
  },
  /** A presence frame arrived. The roster re-reads itself; the payload is not
   *  forwarded, so nothing in the renderer can draw a dot the relay did not. */
  onTeamsPresence: (cb: () => void): (() => void) => {
    const listener = () => cb();
    ipcRenderer.on('teams:presence', listener);
    return () => ipcRenderer.removeListener('teams:presence', listener);
  },
  /** Why the gate says `locked` (plan 4.5, 5). Null whenever it does not. */
  teamsLockInfo: (): Promise<LockInfo | null> => ipcRenderer.invoke('teams:lock'),
  /** The takeover's Reconnect. Tries now, from a fresh nonce. */
  teamsReconnect: (): Promise<{ ok: true }> => ipcRenderer.invoke('teams:reconnect'),

  /** D11: the thread with one teammate, from this machine's own store. */
  teamsThread: (memberId: string): Promise<ThreadView> => ipcRenderer.invoke('teams:thread', memberId),
  onTeamsThread: (cb: (memberId: string) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, memberId: string) => cb(memberId);
    ipcRenderer.on('teams:thread', listener);
    return () => ipcRenderer.removeListener('teams:thread', listener);
  },
  /**
   * D11's send box. Resolves once the relay has answered.
   *
   * 0.4.10: the WHOLE DRAFT crosses, not a flattened string. It used to be
   * `(memberId, body)` with the subject folded into the first line, which is
   * how one string ended up carrying two things. Main re-checks the draft
   * against `@shared/teamMessage` (shape, length, turn budget, hourly rate)
   * before anything leaves the machine, so this door carries no contract of its
   * own: a check that lives only in the UI is not a contract.
   */
  teamsSend: (memberId: string, draft: import('../shared/teamMessage').DraftMessage): Promise<
    { ok: true; delivery: Delivery; via: 'envelope' | 'request' } | { ok: false; reason: string }
  > => ipcRenderer.invoke('teams:send', memberId, draft),
  /**
   * 0.4.11: start a fresh thread with one teammate. The spent thread's file is
   * archived (renamed aside, never deleted) and the turn budget is whole
   * again. Main pushes `teams:thread` after the rotation, so the open thread
   * view reloads itself. This is the PERSON'S door out of a spent thread;
   * agents are never handed it and still get `ASK_THE_HUMAN`.
   */
  teamsThreadNew: (memberId: string): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('teams:thread:new', memberId),

  /* ---- 0.4.10: your status, and what your clones allow -------------------
     One read for the whole policy store and one push when it moves. It is
     SEPARATE from `teamsRoster` on purpose: the roster is a relay round trip
     and the policy is a local file, so joining them would hide a status change
     behind the network. `memberIds` asks for the overrides that matter to the
     screen doing the asking; main never sends the whole map unasked. */
  teamsPolicy: (memberIds: string[]): Promise<{
    status: import('../shared/teamPolicy').TeamPolicy;
    schedule: import('../shared/teamPolicy').StatusSchedule;
    scheduleDriving: boolean;
    policyDefault: import('../shared/teamPolicy').TeamPolicy | null;
    overrides: Record<string, import('../shared/teamPolicy').TeamPolicy>;
  }> => ipcRenderer.invoke('teams:policy', memberIds),
  onTeamsPolicy: (cb: () => void): (() => void) => {
    const listener = () => cb();
    ipcRenderer.on('teams:policy', listener);
    return () => ipcRenderer.removeListener('teams:policy', listener);
  },
  /** Your status. The one control that writes this lives in the right sidebar
   *  of Team and nowhere else. */
  teamsSetStatus: (policy: import('../shared/teamPolicy').TeamPolicy): Promise<{ ok: true }> =>
    ipcRenderer.invoke('teams:setStatus', policy),
  /** When to be on what status. Main normalises it and applies it on a timer
   *  AND on every send, so a machine asleep through a boundary cannot act on a
   *  stale status. */
  teamsSetSchedule: (schedule: import('../shared/teamPolicy').StatusSchedule): Promise<{ ok: true }> =>
    ipcRenderer.invoke('teams:setSchedule', schedule),
  /** What you allow ONE teammate. `null` puts them back on your default, which
   *  is a different thing from setting them to off. */
  teamsSetPolicy: (memberId: string, policy: import('../shared/teamPolicy').TeamPolicy | null): Promise<{ ok: true }> =>
    ipcRenderer.invoke('teams:setPolicy', memberId, policy),
  /** What you allow a teammate with no setting of their own. `null` follows the
   *  org default the relay reports again. */
  teamsSetPolicyDefault: (policy: import('../shared/teamPolicy').TeamPolicy | null): Promise<{ ok: true }> =>
    ipcRenderer.invoke('teams:setPolicyDefault', policy),
  /** D10: what is waiting for this person's decision. */
  teamsRequests: (): Promise<PendingRequest[]> => ipcRenderer.invoke('teams:requests'),
  onTeamsRequests: (cb: () => void): (() => void) => {
    const listener = () => cb();
    ipcRenderer.on('teams:requests', listener);
    return () => ipcRenderer.removeListener('teams:requests', listener);
  },
  teamsRequestDecide: (id: string, decision: RequestDecision): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('teams:request:decide', id, decision),

  /** S1: what the org has told this machine (plan 4.4). Read once, then subscribe. */
  teamsOrg: (): Promise<OrgView> => ipcRenderer.invoke('teams:org'),
  onTeamsOrg: (cb: (v: OrgView) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, v: OrgView) => cb(v);
    ipcRenderer.on('teams:org', listener);
    return () => ipcRenderer.removeListener('teams:org', listener);
  },
  /** S1's Verify: a person read the six groups to their admin. The only path to true. */
  teamsOrgVerify: (): Promise<{ ok: boolean }> => ipcRenderer.invoke('teams:org:verify'),
  /** The admin's billing view (PRO phase 5). Main refuses a non-admin before
   *  the network; the relay refuses again. Never cached here. */
  billingSummary: (): Promise<BillingSummary> => ipcRenderer.invoke('billing:summary'),
  teamsOrgRefresh: (): Promise<'updated' | 'unavailable' | 'refused' | 'offline'> =>
    ipcRenderer.invoke('teams:org:refresh'),

  /** D2's Continue: opens the system browser at the sign-in page with a fresh
   *  `state`. `skipped` is true only under the dev switch, when no page exists
   *  to open and the enrol goes without a grant. */
  teamsSignInBegin: (): Promise<
    | { ok: true; url: string | null; skipped: boolean; expiresAt: string }
    | { ok: false; error: 'refused'; detail: string; reason: 'keyring_unavailable' | 'keyring_not_encrypting' }
  > => ipcRenderer.invoke('teams:signin:begin'),
  /** The paste fallback beside the "waiting for your browser" state. */
  teamsSignInPaste: (pasted: string): Promise<{ ok: true } | { ok: false; error: 'signin'; detail: string }> =>
    ipcRenderer.invoke('teams:signin:paste', pasted),
  teamsSignInCancel: (): Promise<{ ok: boolean }> => ipcRenderer.invoke('teams:signin:cancel'),
  /** Fires when the grant arrived by either route; the screen moves to D3. */
  onTeamsGrant: (cb: () => void): (() => void) => {
    const listener = () => cb();
    ipcRenderer.on('teams:signin:grant', listener);
    return () => ipcRenderer.removeListener('teams:signin:grant', listener);
  },

  /** D3. Main generates the key, registers it, verifies the fingerprint, and
   *  writes the key and membership only then. Every refusal is a VALUE with a
   *  `CodeError` to branch on and the relay's sentence to show. */
  teamsEnrol: (input: { code: string }): Promise<EnrolResult> =>
    ipcRenderer.invoke('teams:enrol', input),
  /** D3's three rows, as each starts. */
  onTeamsEnrolProgress: (cb: (step: EnrolProgress) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, step: EnrolProgress) => cb(step);
    ipcRenderer.on('teams:enrol:progress', listener);
    return () => ipcRenderer.removeListener('teams:enrol:progress', listener);
  },

  /** The roster for D7/D8/D9, already joined with this machine's trust pins and
   *  personal overrides. Failures come back as VALUES so the screen can render
   *  the reason instead of a blank pane. */
  teamsRoster: (): Promise<
    | { ok: true; data: { org: unknown; teammates: unknown[]; self: unknown } }
    | { ok: false; error: string; detail: string | null }
  > => ipcRenderer.invoke('teams:roster'),

  /** D13's accept. The ONLY way a key becomes verified, and it is a human
   *  saying so out of band — never anything the relay told us. */
  teamsVerifyDevice: (deviceId: string, fingerprint: string): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('teams:verify', deviceId, fingerprint),

  /** D9's per-person override. Stays on this machine, per contract 0.3. */
  teamsSetYouAllow: (memberId: string, level: string | null): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('teams:setYouAllow', memberId, level),

  /** D8/D9's default for everyone without an override (the self row's select
   *  and the Network section's top card). Null follows the org default. */
  teamsSetYouAllowDefault: (level: string | null): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('teams:setYouAllowDefault', level),

  // ─── The puck (Pro, 7 Sep 2026; src/main/puck.ts) ─────────────────────────
  // Two callers share these: the puck's own window (src/renderer/src/puck) and
  // the Puck screen in the Pro shell. Main is the only holder of state; both
  // read it with puckState and follow it with onPuckState.
  /** The Pro shell says whether it is on screen. No shell, no puck. */
  puckAdmit: (on: boolean): Promise<PuckState> => ipcRenderer.invoke('puck:admit', on),
  puckState: (): Promise<PuckState> => ipcRenderer.invoke('puck:state'),
  puckConfig: (): Promise<PuckConfig> => ipcRenderer.invoke('puck:config'),
  onPuckState: (cb: (s: PuckState) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, s: PuckState) => cb(s);
    ipcRenderer.on('puck:state', listener);
    return () => ipcRenderer.removeListener('puck:state', listener);
  },
  /** The meeting chord was pressed (0.5.3, F16): the puck starts a meeting
   *  as a click would, or stops the one running. */
  onPuckMeetingToggle: (cb: (p: { at: number }) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, p: { at: number }) => cb(p);
    ipcRenderer.on('puck:meetingToggle', listener);
    return () => ipcRenderer.removeListener('puck:meetingToggle', listener);
  },
  /** Dictation from anywhere (0.5.3): main's any app events for the
   *  Stapler's eyes, live level and sounds. `sounds` is the Settings switch. */
  onPuckDictation: (cb: (e: PuckDictationEvent) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, e: PuckDictationEvent) => cb(e);
    ipcRenderer.on('puck:dictation', listener);
    return () => ipcRenderer.removeListener('puck:dictation', listener);
  },
  onPuckConfig: (cb: (c: PuckConfig) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, c: PuckConfig) => cb(c);
    ipcRenderer.on('puck:config', listener);
    return () => ipcRenderer.removeListener('puck:config', listener);
  },
  /** A drag begins: where on the disc it was grabbed, px from its centre.
   *  Main moves the window under the system pointer from here to dragEnd. */
  puckDragStart: (at: { x: number; y: number }): Promise<PuckState> => ipcRenderer.invoke('puck:dragStart', at),
  /** The pointer moved during a drag: its own motion (movementX/Y) since the
   *  last call. A sign of life, and the drive where the pointer is unreadable. */
  puckDrag: (delta: { dx: number; dy: number }): Promise<PuckState> => ipcRenderer.invoke('puck:drag', delta),
  /** The hand let go: snap if configured, save the position. */
  puckDragEnd: (): Promise<PuckState> => ipcRenderer.invoke('puck:dragEnd'),
  puckResetPosition: (): Promise<PuckState> => ipcRenderer.invoke('puck:resetPosition'),
  puckMenu: (open: boolean): Promise<PuckState> => ipcRenderer.invoke('puck:menu', open),
  /** Click through the transparent part of the window, or not. */
  puckIgnoreMouse: (ignore: boolean): Promise<boolean> => ipcRenderer.invoke('puck:ignoreMouse', ignore),
  /** Content protection by hand: hidden from every screen share and capture. */
  puckInvisible: (on: boolean): Promise<PuckState> => ipcRenderer.invoke('puck:invisible', on),
  puckCaptureStart: (): Promise<{ ok: true } | { ok: false; error: string }> => ipcRenderer.invoke('puck:captureStart'),
  puckCaptureConfirm: (rect: PuckRect): Promise<{ ok: true; path: string; preview: string; width: number; height: number } | { ok: false; error: string }> =>
    ipcRenderer.invoke('puck:captureConfirm', rect),
  puckCaptureCancel: (): Promise<PuckState> => ipcRenderer.invoke('puck:captureCancel'),
  /** The Stapler's Capture button (0.5.2): main relays it to the overlay,
   *  which confirms with the box it holds. */
  puckCaptureRequest: (): Promise<{ ok: true } | { ok: false; error: string }> => ipcRenderer.invoke('puck:captureRequest'),
  onPuckCaptureRequest: (cb: () => void): (() => void) => {
    const listener = (): void => cb();
    ipcRenderer.on('puck:captureRequest', listener);
    return () => ipcRenderer.removeListener('puck:captureRequest', listener);
  },
  onPuckCaptureInit: (cb: (init: { region: PuckRect; width: number; height: number }) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, init: { region: PuckRect; width: number; height: number }) => cb(init);
    ipcRenderer.on('puck:captureInit', listener);
    return () => ipcRenderer.removeListener('puck:captureInit', listener);
  },
  /** The puck window hears about a capture the overlay confirmed. */
  onPuckCaptured: (cb: (shot: { path: string; preview: string; width: number; height: number }) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, shot: { path: string; preview: string; width: number; height: number }) => cb(shot);
    ipcRenderer.on('puck:captured', listener);
    return () => ipcRenderer.removeListener('puck:captured', listener);
  },
  /** ...and about one that failed: the overlay that asked is gone by then. */
  onPuckCaptureFailed: (cb: (e: { error: string }) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, e: { error: string }) => cb(e);
    ipcRenderer.on('puck:captureFailed', listener);
    return () => ipcRenderer.removeListener('puck:captureFailed', listener);
  },
  puckOpenScreenAccess: (): Promise<boolean> => ipcRenderer.invoke('puck:openScreenAccess'),
  /** To the orchestrator, through the hive's own door (a human request). A
   *  screenshot or transcript travels as its PATH, never as bytes. */
  puckSend: (arg: { note: string; screenshot?: string; screenshots?: string[]; transcript?: string }): Promise<{ ok: true; id: string; to: string } | { ok: false; error: string }> =>
    ipcRenderer.invoke('puck:send', arg),
  /** The send card's picker (0.5.3, I5): who captures go to from now on. */
  puckSendTo: (id: string): Promise<PuckState> => ipcRenderer.invoke('puck:sendTo', id),
  /** `systemAudio` says where the other side of the call comes from on this
   *  machine for this meeting: a helper feeding main, a stream the renderer
   *  opens, or null for the microphone alone (0.5.3, F16). */
  puckMeetingStart: (): Promise<{ ok: true; meetingId: string; segmentMinutes: number; systemAudio: 'helper' | 'renderer' | null } | { ok: false; error: string }> =>
    ipcRenderer.invoke('puck:meetingStart'),
  puckMeetingSegment: (arg: { meetingId: string; seq: number; audio: ArrayBuffer; mimeType: string; startMs: number; durationMs: number; track?: 'you' | 'them' }): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('puck:meetingSegment', arg),
  puckMeetingStop: (arg: { meetingId: string }): Promise<{ ok: boolean; error?: string }> => ipcRenderer.invoke('puck:meetingStop', arg),
  puckMeetings: (filter?: PuckMeetingFilter): Promise<PuckMeeting[]> => ipcRenderer.invoke('puck:meetings', filter ?? {}),
  puckMeetingRename: (arg: { id: string; title: string }): Promise<{ ok: boolean; error?: string }> => ipcRenderer.invoke('puck:meetingRename', arg),
  puckMeetingTranscript: (arg: { id: string }): Promise<{ ok: true; text: string; meta: MeetingMeta } | { ok: false; error: string }> =>
    ipcRenderer.invoke('puck:meetingTranscript', arg),
  puckMeetingSave: (arg: { id: string; title?: string; description?: string; text?: string }): Promise<{ ok: boolean; error?: string }> => ipcRenderer.invoke('puck:meetingSave', arg),
  puckMeetingSendTo: (arg: { id: string; to: string[] }): Promise<{ ok: boolean; sent: string[]; failed: Array<{ id: string; error: string }>; inline?: boolean; error?: string }> =>
    ipcRenderer.invoke('puck:meetingSendTo', arg),
  puckMeetingTranscribe: (arg: { id: string }): Promise<{ ok: boolean; queued: number; error?: string }> => ipcRenderer.invoke('puck:meetingTranscribe', arg),
  puckMeetingDelete: (arg: { id: string }): Promise<{ ok: boolean; error?: string }> => ipcRenderer.invoke('puck:meetingDelete', arg),
  onPuckMeetingsChanged: (cb: (e: { id: string }) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, e: { id: string }) => cb(e);
    ipcRenderer.on('puck:meetingsChanged', listener);
    return () => ipcRenderer.removeListener('puck:meetingsChanged', listener);
  },
  puckMessageStart: (): Promise<{ ok: boolean; error?: string }> => ipcRenderer.invoke('puck:messageStart'),
  /** The app's window forward, on a Settings section when named ('Voice' for the Groq key). */
  puckOpenSettings: (section?: string): Promise<boolean> => ipcRenderer.invoke('puck:openSettings', section),
  /** macOS: the Microphone pane of System Settings. */
  puckOpenMicAccess: (): Promise<boolean> => ipcRenderer.invoke('puck:openMicAccess'),
  /** A part of a message still being spoken: its words, and the recording goes on. */
  puckMessageSegment: (arg: { audio: ArrayBuffer; mimeType: string }): Promise<{ ok: true; text: string } | { ok: false; error: string }> =>
    ipcRenderer.invoke('puck:messageSegment', arg),
  puckMessageStop: (arg: { audio: ArrayBuffer; mimeType: string }): Promise<{ ok: true; text: string } | { ok: false; error: string }> =>
    ipcRenderer.invoke('puck:messageStop', arg),
  puckScreenshots: (): Promise<PuckScreenshot[]> => ipcRenderer.invoke('puck:screenshots'),
  puckScreenshotDelete: (path: string): Promise<{ ok: boolean; error?: string }> => ipcRenderer.invoke('puck:screenshotDelete', path),
  puckReveal: (path: string): Promise<{ ok: boolean; error?: string; name?: string }> => ipcRenderer.invoke('puck:reveal', path)
};

contextBridge.exposeInMainWorld('cth', api);

export type CthApi = typeof api;
