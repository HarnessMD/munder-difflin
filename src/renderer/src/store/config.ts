// Mirrors src/main/config.ts. Kept as a renderer-side type-only module
// so we don't have to reach into the preload package to type-check.
import type { TranscribeConfig } from '@shared/transcribeConfig';
import {
  AGENT_PROVIDER_PRESETS,
  providerPreset,
  inferAgentProvider,
  isClaudeProvider,
  type AgentProvider,
  type AgentProviderPreset
} from '@shared/agentProvider';
import type { CustomAvatar } from '@shared/avatars';
import type {
  ContextTriggerConfig,
  WebhookTrigger
} from '@shared/triggers';
import { isNewer } from '@shared/updateState';
import type { TaskHygieneConfig } from '@shared/taskHygiene';
import type { SlackMode, SlackTriage } from '@shared/slackMode';
import type { PuckConfig } from '@shared/puck';
import { modelLabel } from '@shared/engine';
import modelCatalog from '@shared/modelCatalog.json';
import type { CatalogModel, ModelCatalog } from '@shared/modelCatalogPayload';

export {
  AGENT_PROVIDER_PRESETS,
  providerPreset,
  inferAgentProvider,
  isClaudeProvider,
  type AgentProvider
};

/** A recurring auto-dispatched mission (mirrors src/main/config.ts). */
export interface ScheduledMission {
  id: string;
  label: string;
  intervalMs: number;
  to: string;
  body: string;
  enabled: boolean;
  autoCompact?: boolean;
  lastFiredAt?: number;
  kind?: 'dispatch' | 'heartbeat' | 'compact';
  quietThresholdMs?: number;
}

/** Circuit-breaker thresholds (mirrors src/main/config.ts CircuitBreakerConfig). */
export interface CircuitBreakerConfig {
  enabled?: boolean;
  hardStop?: boolean;
  repeatedToolLimit?: number;
  errorStormLimit?: number;
  tokenVelocityPerMin?: number;
}

/** Enterprise Knowledge Graph config (mirrors src/main/config.ts KnowledgeGraphConfig). */
export interface KnowledgeGraphConfig {
  enabled?: boolean;
  rootPath?: string;
}

export interface HarnessConfig {
  onboardingComplete: boolean;
  /** Self-identified audience from the first onboarding screen ('technical' vs
   *  'non-technical') — drives the copy register across onboarding. Mirrors
   *  src/main/config.ts. */
  audience?: 'technical' | 'non-technical';
  harnessHome: string | null;
  /** Recently-opened hive home folders (most-recent first) for the launch picker.
   *  Mirrors src/main/config.ts. */
  recentHives?: string[];
  registeredRepos: string[];
  autoMode: boolean;
  /** May the orchestrator ("Michael") spin up agents on its own? Default FALSE,
   *  so an absent value reads as off. Mirrors src/main/config.ts. */
  orchestratorMaySpawn?: boolean;
  defaultCommand: string;
  /** Default model for newly spawned agents (e.g. 'claude-sonnet-4-6[1m]'); unset = CLI default. */
  defaultModel?: string;
  /** Which provider+model powers the GOD orchestrator ("Michael"). Default
   *  'claude' / 'claude-opus-5-5'. Mirrors src/main/config.ts. */
  godProvider?: AgentProvider;
  godModel?: string;
  /** A hand edited orchestrator command (0.5.3 bug 20). Wins over the line
   *  derived from godProvider and godModel; see shared/godCommand.ts. */
  godCommand?: string;
  /** Per-server consent for the default MCP bundle, keyed by catalog id (mirrors
   *  src/main/config.ts; seeded from MCP_CATALOG). */
  mcpDefaults?: { [id: string]: { enabled: boolean } };
  semanticMemory: boolean;
  embeddingModel: 'minilm' | 'embeddinggemma';
  missions?: ScheduledMission[];
  opsStandupSeeded?: boolean;
  heartbeatSeeded?: boolean;
  notifications?: boolean;
  /** Opt-in "strong keep-alive": escalates the in-app power blocker to
   *  prevent-display-sleep so scheduled missions/terminals keep firing on time
   *  while away (battery cost; best on AC). Default off = survive + catch up on
   *  resume. Mirrors the main-process field (src/main/config.ts). */
  strongKeepalive?: boolean;
  /** Keep my agent order (0.5.3, founder 24 Sep): off by default. On, the
   *  sidebar draws `agentOrder` and rows can be dragged; off, it orders itself
   *  most recently used first and rows cannot move. Rules: shared/agentOrder.ts. */
  keepAgentOrder?: boolean;
  /** The sidebar's agent ids top to bottom, orchestrator excluded. Frozen from
   *  the screen the first time keepAgentOrder is on; kept when it goes off. */
  agentOrder?: string[];
  /** The project headings' order while keepAgentOrder is on (lower case keys). */
  projectOrder?: string[];
  /** Sidebar shows only agents and notes (0.5.3 rc.4, founder 25 Sep): off
   *  by default. On, the PRO sidebar's agent rows drop the Asked you strip, the
   *  task line and the Finished task strip; the name, status and note stay,
   *  and the bell still opens every question. */
  sidebarAgentsNotesOnly?: boolean;
  /** Auto-update from GitHub releases (default ON; Settings → General). */
  autoUpdate?: boolean;
  /** Anonymous product analytics (default ON, opt-out; see TELEMETRY.md).
   *  Mirrors the main-process field (src/main/config.ts). */
  telemetryEnabled?: boolean;
  slackEnabled?: boolean;
  slackSigningSecret?: string;
  slackBotToken?: string;
  slackChannelId?: string;
  slackPort?: number;
  /** Opt-in app/voice-initiated proactive Slack posting (default OFF). Mirrors
   *  src/main/config.ts; the Slack-origin done-reply round-trip is never gated. */
  slackProactivePosting?: boolean;
  /** How Slack reaches the office (0.4.11), the socket app token, the two
   *  frequency pickers and the temps folder. Mirrors src/main/config.ts; the
   *  names and ranges live in src/shared/slackMode.ts. */
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
  /** The view the office opens in (0.4.11), Classic 'office' or PRO
   *  'professional'; a PRO user's setting under General. Mirrors main. */
  defaultView?: 'office' | 'professional';
  /** Free Flow voice dictation (mirrors src/main/config.ts). */
  freeflowEnabled?: boolean;
  groqApiKey?: string;
  freeflowModel?: string;
  /** 0.5.3, F16: dictation and meetings; always complete when read. */
  transcribe?: TranscribeConfig;
  /** Realtime voice idle auto-disconnect (ms); default 180000 (3 min), 0 = never.
   *  Tuned in Settings → Realtime Michael; the cost cap stays the runaway guard. */
  realtimeIdleDisconnectMs?: number;
  costCapUsd?: number;
  /** Hard total-token ceiling across active agents (the user-facing budget). */
  costCapTokens?: number;
  /** Per-agent total-token ceiling, keyed by agent id. Overrides the floor budget
   *  for that agent's meter and trips the breaker for it alone. */
  agentTokenCaps?: Record<string, number>;
  /** Per-agent MCP overrides, agent id → catalog id → consent (shared/agentMcp.ts). */
  agentMcp?: Record<string, Record<string, { enabled: boolean }>>;
  autoDeliveryPausedAgents?: string[];
  maxTurns?: number;
  /** How many ephemeral workers (temps) may run at once. Default 4. Mirrors
   *  src/main/config.ts; edited on the orchestrator's Budget & breaker tab. */
  maxConcurrentWorkers?: number;
  circuitBreaker?: CircuitBreakerConfig;
  /** Enterprise Knowledge Graph (multimodal context for agents). Default OFF. */
  knowledgeGraph?: KnowledgeGraphConfig;
  /** Custom avatars from the sprite editor (mirrors src/main/config.ts). */
  avatars?: CustomAvatar[];
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
  /** Legacy single-webhook fields (mirrors src/main/config.ts, where they are
   *  deprecated in favour of `webhookTriggers` but still read until the server is
   *  rewired). Declared here so the surfaces that show them can stop widening this
   *  type locally.
   *  @deprecated Use `webhookTriggers`. */
  webhookEnabled?: boolean;
  /** @deprecated Use `webhookTriggers[].secret`. */
  webhookSecret?: string;
  /** @deprecated The port belongs to the shared server, not to any one trigger. */
  webhookPort?: number;
  /** Auto-compaction / auto-clearing of agent terminal context. Main deep-fills
   *  both halves on read, so the renderer can treat the sub-keys as present
   *  (mirrors src/main/config.ts). */
  contextTrigger?: ContextTriggerConfig;
  /** Inbound HTTP endpoints, one per caller — replaces the legacy trio above. */
  webhookTriggers?: WebhookTrigger[];
  /** One-time guard for the main-process triggers migration; read-only here. */
  triggersMigratedV1?: boolean;
  /** Thresholds of the hourly hygiene sweep (days before a done card archives,
   *  an untouched card is flagged then archived, an open question nags, and
   *  the board's token cap). Missing keys read as the defaults in
   *  shared/taskHygiene.ts. Mirrors src/main/config.ts. */
  taskHygiene?: Partial<TaskHygieneConfig>;
  /** 0.5.3: ticket key prefix (V53); see main config.ts. */
  ticketPrefix?: string;
  /** The standing house brief for HOW every agent answers (stick to the subject,
   *  factual, short and crisp, plain language). User editable in Settings; an
   *  absent or empty value reads as DEFAULT_RESPONSE_STYLE in
   *  shared/responseStyle.ts. Mirrors src/main/config.ts. */
  responseStyle?: string;
  /** Claude Code's own output style for the agents this app starts (0.5.3
   *  feature 19). Unset means Concise; 'default' turns it off. */
  claudeOutputStyle?: string;
  /** The floating puck (Pro). Read through normalizePuckConfig; a partial is
   *  accepted on write (main merges). Mirrors src/main/config.ts. */
  puck?: Partial<PuckConfig>;
}

/** The Sonnet model with the 1M-token context window — used for Michael's prep
 *  assistant (cheap, large-context context gathering). Mirrors ASSISTANT_MODEL
 *  in src/main/assistant.ts; keep the two in sync. */
export const ASSISTANT_MODEL = 'claude-sonnet-4-6[1m]';

export interface ModelOption {
  /** undefined = use the CLI default (no --model flag) */
  id?: string;
  label: string;
}

/** The catalog row + catalog types now live in shared/, because the MAIN
 *  process validates the remote copy against the same shape before it crosses
 *  the bridge. `minAppVersion` / `maxAppVersion` are INCLUSIVE app-version
 *  bounds: the model is offered while the running build sits inside them, and
 *  null (or an absent key) means unbounded in that direction. That is what lets
 *  a release introduce or retire a model without a code change.
 *
 *  PRERELEASES COUNT AS THEIR RELEASE. The comparison is major.minor.patch only
 *  (`isNewer` discards a `-rc.N` suffix), so `minAppVersion: '0.4.6'` IS offered
 *  on `0.4.6-rc.1`. That is deliberate and ruled on: an rc of a release should
 *  count as that release, it matches the update badge's own comparison, and the
 *  alternative would hide a new model from exactly the testers meant to
 *  exercise it. Bound a model to the release, not to its rc. */
export type { CatalogModel, ModelCatalog } from '@shared/modelCatalogPayload';

/** The model presets every provider picker offers.
 *
 *  These were a dozen hardcoded `ModelOption[]` arrays in this file, so shipping
 *  a model — one string — meant editing, type-checking and rebuilding renderer
 *  source. They now live in src/shared/modelCatalog.json, imported at BUILD time
 *  (no fs, no network, offline-safe) and filtered per running version, so adding
 *  a model is a one-line JSON edit and a model can name the releases it belongs
 *  to instead of appearing in builds whose CLI never shipped it.
 *
 *  What the arrays used to say — kept, because it explains why the entries look
 *  the way they do:
 *
 *  - claude: `[1m]` selects the 1M-token context-window variant. The list
 *    deliberately has NO "pass no --model flag" entry: every option names a real
 *    model, because the whole reason to open this picker is to know which model
 *    an agent is on, and a no-flag option resolves to whatever Claude Code
 *    happens to choose — which the UI cannot show and the user cannot predict.
 *    The harness default is marked ` · default` instead, and it names a real model.
 *  - The leading `CLI default` entry several providers carry means no `--model`
 *    flag at all — whatever the CLI itself defaults to. That is NOT the harness's
 *    `config.defaultModel`; the pickers mark that one separately, and labelling
 *    both "default" is what made the two impossible to tell apart.
 *  - codex: current OpenAI models offered by Codex. The command field stays
 *    editable and `codex --model <id>` is the source of truth.
 *  - antigravity: agy's `--model` takes the DISPLAY-NAME LABEL exactly as
 *    `agy models` prints it (verified: agy logs `Propagating selected model
 *    override … label="…"`), not a slug — so these ids ARE labels, spaces and
 *    parens included; buildSpawnCommand quotes them and the command tokenizer
 *    keeps them whole. `agy models` is the source of truth for the live list.
 *  - gemini: stable aliases accepted by the official Google Gemini CLI. They
 *    follow the CLI instead of pinning preview model ids that drift.
 *  - qwen: qwen-code (`qwen`), the proxy-bridge CLI driving an OpenAI-compatible
 *    endpoint. Starting suggestions only. // TODO-verify the live list.
 *  - opencode: `--model` takes a `provider/model` slug; curated BYOK suggestions
 *    (`opencode models` / models.dev is the source of truth). `CLI default` is the
 *    PRESELECTED entry, because a BYOK slug the user holds no key for fails
 *    silently — see the recommendedOrchestratorModel note in agentProvider.ts.
 *    // TODO-verify exact live slugs (they drift).
 *  - crush: `--model` takes a `provider/model-id` slug; free-text editable (Crush
 *    accepts arbitrary slugs). The local pick is an OpenAI-wire slug so traffic
 *    routes through the proxy (the harness overrides the `openai` provider's
 *    base_url → loopback → your configured Crush base-URL); an `ollama/*` slug
 *    would bypass the proxy. // TODO-verify exact live ids.
 *  - pi: `--model` takes a `provider/model` slug (thinking via a `:high` suffix).
 *    Curated BYOK suggestions; free-text editable. // TODO-verify exact live slugs.
 *  - copilot: `--model` takes a plain model id ('auto' lets Copilot pick); curated
 *    suggestions, editable command field. // TODO-verify exact live ids (the
 *    /model picker is the source of truth; they drift).
 *  - cursor: ids match `cursor-agent models` / `--model` (Cursor account catalog).
 *    Luna is the cheap, high-context default for Michael; the rest are curated
 *    quick-picks and the command field stays editable for any live slug.
 *  - grok: the models reported by the installed Grok CLI (`grok models`).
 *  - kimi: managed Kimi Code aliases accepted by `kimi --model <alias>`.
 *  - custom: no presets at all; the command field is the whole interface.
 */
const BAKED: ModelCatalog = modelCatalog;

/** The catalog the pickers actually read. Starts as the baked copy and is
 *  replaced, per provider, when the remote copy arrives from main. `let`, not
 *  `const`, is the whole mechanism: everything below reads it through a
 *  function call, so a refresh reaches the next render with no plumbing. */
let CATALOG: ModelCatalog = BAKED;

/** Merge a validated remote catalog over the baked one, PER MODEL.
 *
 *  It used to be per PROVIDER: a provider named in the remote copy replaced
 *  that provider's whole list. That made the pickers OLDER than the build they
 *  run in. The remote file lives on main and lags a release, so the day Opus
 *  5.5 shipped as the default (config.ts godModel and defaultModel) the remote
 *  claude list still ended at Opus 5, the merge dropped the entry this build
 *  ships, and the orchestrator's Config tab fell back to printing the raw id
 *  `claude-opus-5-5` beside friendly names like "Opus 5" (founder, 24 Sep).
 *
 *  So: the remote list leads and wins by id, giving it the order and the
 *  labels, and any baked model it does not mention is kept after it. The
 *  remote can still RETIRE a model, with the maxAppVersion field it already
 *  has and that `offeredAtVersion` already honours; silence is not retirement.
 *  A provider the remote does not mention keeps the built-in list, as before.
 *
 *  Returns whether anything actually changed, so the caller can skip a pointless
 *  event on the overwhelmingly common "nothing new" path. */
export function mergeCatalogModels(baked: CatalogModel[], remote: CatalogModel[]): CatalogModel[] {
  const key = (m: CatalogModel) => m.id ?? '';
  const named = new Set(remote.map(key));
  return [...remote, ...baked.filter((m) => !named.has(key(m)))];
}

export function applyRemoteModelCatalog(remote: ModelCatalog | null): boolean {
  const providers: Record<string, CatalogModel[]> = { ...BAKED.providers };
  if (remote) {
    for (const [name, list] of Object.entries(remote.providers)) {
      providers[name] = mergeCatalogModels(BAKED.providers[name] ?? [], list);
    }
  }
  const next: ModelCatalog = remote ? { version: BAKED.version, providers } : BAKED;
  if (JSON.stringify(next) === JSON.stringify(CATALOG)) return false;
  CATALOG = next;
  return true;
}

/** Fired on `window` after the catalog changes, so a surface holding a rendered
 *  list can re-read it. Pickers that call `modelsForProvider()` during render
 *  pick the change up on their next render either way. */
export const MODEL_CATALOG_EVENT = 'cth:model-catalog';

/** Ask main for the remote catalog and apply it. Safe to call repeatedly; the
 *  network hop is main's problem and it is cached there behind a TTL.
 *
 *  Called once when this module loads inside the app (below). Kept exported so a
 *  Settings action can force a refresh, and so the tests can drive it. */
export async function refreshModelCatalog(force = false): Promise<boolean> {
  try {
    const bridge = (globalThis as { cth?: { modelCatalog?: (force?: boolean) => Promise<{ catalog: ModelCatalog | null }> } }).cth;
    if (!bridge?.modelCatalog) return false;
    const { catalog } = await bridge.modelCatalog(force);
    const changed = applyRemoteModelCatalog(catalog);
    if (changed && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(MODEL_CATALOG_EVENT));
    }
    return changed;
  } catch {
    // The baked catalog is already rendering. A failed refresh is not an error
    // the user has any action for, so it is not one they get told about.
    return false;
  }
}

// Fire once on load. The pickers all call modelsForProvider() during render, so
// the usual case — main pre-warmed the cache at startup, this resolves in a few
// ms, no modal is open yet — needs no subscription at all. A catalog that lands
// while a picker is already open reaches it on that picker's next render.
if (typeof window !== 'undefined') void refreshModelCatalog();

declare const __APP_VERSION__: string | undefined;

/** The version of the running build. electron-vite replaces `__APP_VERSION__`
 *  with package.json's version at build time — the same value the update badge
 *  shows — so the renderer knows it synchronously, with no round trip to main.
 *  Outside a build (unit tests) the define is absent and there is no version to
 *  compare against; see the fail-open note on `offeredAtVersion`. */
export function runningAppVersion(): string {
  return typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '';
}

/** Whether a catalog entry belongs in a picker on this build. Both bounds are
 *  inclusive of the release they name. Anything unparseable — an absent bound, a
 *  malformed one, an unknown app version — is ignored rather than hiding the
 *  model: a picker that silently loses every model is far worse than one that
 *  offers a model this build's CLI cannot run (the command field is editable and
 *  the CLI reports the bad slug). */
function offeredAtVersion(model: CatalogModel, appVersion: string): boolean {
  if (model.minAppVersion && isNewer(model.minAppVersion, appVersion)) return false;
  if (model.maxAppVersion && isNewer(appVersion, model.maxAppVersion)) return false;
  return true;
}

/** The model preset list for a provider's picker, as of a given app version.
 *  `providers` is injectable so the version filter can be exercised against
 *  bounded entries — the shipped catalog is deliberately all-unbounded. */
export function modelsForProviderAtVersion(
  provider: AgentProvider,
  appVersion: string,
  providers: Record<string, CatalogModel[]> = CATALOG.providers
): ModelOption[] {
  // An unknown provider falls back to the Claude list, as the hardcoded dispatch
  // did. 'custom' is a real key holding an empty list, not a missing one.
  const entries = providers[provider] ?? providers.claude ?? [];
  return entries
    .filter((model) => offeredAtVersion(model, appVersion))
    .map((model) => (model.id === undefined ? { label: model.label } : { id: model.id, label: model.label }));
}

// tokenizeCommand moved to src/shared/commandLine.ts so main's spawn-request
// path splits command lines with the SAME rules as the renderer's spawn flows
// (they used to carry byte-identical copies). Re-exported here so existing
// importers keep their path.
export { tokenizeCommand } from '@shared/commandLine';

/** The live catalog's providers: the baked lists with any remote copy merged
 *  in. Everything that turns a model id into words reads THIS, so a model the
 *  remote added is named in the badges too, not only in the pickers. */
export function catalogProviders(): Record<string, CatalogModel[]> {
  return CATALOG.providers;
}

/** A model id in words, from the live catalog: "Opus 5.5", never
 *  `claude-opus-5-5`. Null only when there is no model at all and the catalog
 *  has no "CLI default" row to name it. An id the catalog does not know is
 *  tidied rather than dropped, so a hand typed slug still reads. */
export function modelWord(provider: AgentProvider | undefined, model: string | undefined): string | null {
  return modelLabel(provider, model, catalogProviders());
}

/** The model preset list for a given provider's picker, on this build. */
export function modelsForProvider(provider: AgentProvider): ModelOption[] {
  return modelsForProviderAtVersion(provider, runningAppVersion());
}

/** The Claude presets, for the surfaces that only ever offer Claude models.
 *  A FUNCTION, not a const array: a const would be captured at module load and
 *  would still be showing the baked list after a remote refresh landed. */
export function agentModels(): ModelOption[] {
  return modelsForProvider('claude');
}

/** Providers shown in the Command Center's cross-provider model picker.
 *  God must remain on a provider with a working inbox drain; otherwise switching
 *  to a terminal-only provider would silently disable orchestration. */
export function modelProvidersForAgent(isGod = false) {
  return AGENT_PROVIDER_PRESETS.filter((preset) =>
    preset.supportsModel && (!isGod || preset.canReceiveInbox)
  );
}

/** The onboarding engine step's two groups (issue #355). Hiding inbox-less
 *  engines there read as "Copilot isn't supported at all", when the truth is
 *  narrower: a print-mode / bridge-less CLI can be HIRED as a worker but cannot
 *  run Michael, because the orchestrator must drain hive mail. So the step now
 *  shows those engines too, as disabled workers-only rows — same god-eligible
 *  set as `modelProvidersForAgent(true)` for the selectable group, and every
 *  other preset except `custom` (bring-your-own command, not an engine) in the
 *  disabled group. */
export function onboardingEngineChoices(): {
  eligible: AgentProviderPreset[];
  workersOnly: AgentProviderPreset[];
} {
  const eligible = modelProvidersForAgent(true);
  const workersOnly = AGENT_PROVIDER_PRESETS.filter(
    (preset) => preset.id !== 'custom' && !eligible.includes(preset)
  );
  return { eligible, workersOnly };
}

/** Native <select> values must carry both provider and model because each
 *  provider has its own "default" option and model namespace. */
export function encodeProviderModel(provider: AgentProvider, model?: string): string {
  return `${provider}:${encodeURIComponent(model ?? '')}`;
}

export function decodeProviderModel(value: string): {
  provider: AgentProvider;
  model?: string;
} | null {
  const split = value.indexOf(':');
  if (split < 1) return null;
  const provider = value.slice(0, split);
  if (!AGENT_PROVIDER_PRESETS.some((preset) => preset.id === provider)) return null;
  try {
    const model = decodeURIComponent(value.slice(split + 1));
    return { provider: provider as AgentProvider, model: model || undefined };
  } catch {
    return null;
  }
}

/** Build the command line to feed into spawnPty, honoring the provider's flags,
 *  autoMode, and an optional per-agent model override. Claude keeps the user's
 *  configured `defaultCommand`; other providers use their preset binary so the
 *  app works without Claude installed. */
export function buildSpawnCommand(
  config: Pick<HarnessConfig, 'defaultCommand' | 'autoMode'>,
  model?: string,
  provider: AgentProvider = inferAgentProvider(config.defaultCommand)
): string {
  const preset = providerPreset(provider);
  // Claude keeps the user's configured defaultCommand; custom falls back to it
  // too; every other provider (codex, grok, kimi, agy) uses its preset binary so the app
  // works even without Claude installed.
  const base =
    provider === 'claude'
      ? config.defaultCommand || preset.defaultCommand
      : provider === 'custom'
        ? config.defaultCommand || ''
        : preset.defaultCommand;
  let cmd = base;
  if (preset.supportsModel && model && preset.modelFlag) {
    // Quote model values that contain whitespace (agy labels like
    // "Gemini 3.1 Pro (High)") so the command tokenizer keeps them one arg.
    const m = /\s/.test(model) ? `"${model}"` : model;
    cmd = `${cmd} ${preset.modelFlag} ${m}`;
  }
  // Auto (skip-permissions) mode appends each provider's own flag — Claude's
  // bypassPermissions, Codex's dangerous bypass, Grok's always-approve, Kimi's
  // auto, or agy's skip flag.
  if (config.autoMode && preset.autoFlag) cmd = `${cmd} ${preset.autoFlag}`;
  return cmd;
}
