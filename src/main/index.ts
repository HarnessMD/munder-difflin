// First, for its side effect: the office's data folder is registered before any
// other module here is evaluated (src/core/paths.ts).
import './electronPaths';
import { AgentDemand } from '../core/agentDemand';
import { localDemandAllowed } from '../shared/localDemand';
import { joinCommandLine, tokenizeCommand } from '../shared/commandLine';
import { commandWithModel } from '../shared/liveModel';
import { officePaths } from '../core/paths';
import { app, BrowserWindow, clipboard, dialog, ipcMain, Menu, net, powerMonitor, powerSaveBlocker, screen, shell, Notification } from 'electron';
import { spawn } from 'node:child_process';
import { rmSync, existsSync, readFileSync, readdirSync, statSync, cpSync, writeFileSync, unlinkSync, mkdirSync, renameSync, lstatSync, readlinkSync, symlinkSync, realpathSync } from 'node:fs';
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { join, resolve, sep, basename, dirname, isAbsolute } from 'node:path';
import { homedir } from 'node:os';
import { fileBackedMessage } from './submitMessageFile';
import { PtyManager, type SpawnOptions } from './pty';
import { createSpawnAgent, type AgentRun, type AgentSpawnOptions, type SpawnResult } from '../core/spawnAgent';
import { draftForTest } from '../core/integrationTest';
import { setGitPrivateRoot } from '../core/gitSafe';
import { writeFleet } from '../core/fleet';
import { createElectronHost } from './electronHost';
import { installWindowHealth, installProcessHealth, logQuitPromptDecision } from './rendererHealth';
import { AgentLedger, sweepStaleAgents, takePreviousLedger } from './staleAgents';
import { CodexDaemons } from './codexDaemons';
import { resolveCommand as resolveCliCommand, isSafeCommandName, shellPathGeneration, shellPathReady } from './shellEnv';
import { initUpdateNotice } from './updater';
import { RealtimeFloorWatcher } from './realtimeFloorWatcher';
import { readConfig, writeConfig, setAgentMcp, setAgentSkillOff, setAgentCodexMemory, saveAvatar, deleteAvatar, resetConfig, onConfigWritten, configFileStamp, ensureHarnessHome, ensureClaudePermissionsAccepted, configIntegrityIssues, configDamagedPath, setGraphicsMode, allowCodexLayerFolders, withdrawCodexLayerFolder, modelForRole, HEARTBEAT_MISSION, COMPACT_MAINTENANCE_MISSION, type HarnessConfig, type ScheduledMission, pruneRecentHivesOnDisk } from './config';
import { asAttachWant, attachDialogOptions, attachName } from '../shared/attachDialog';
import { listDir, readFileText, readFileBinary, writeFileText, statAbs, expandTilde, folderState, searchInRoot, makeDirIn, createFileIn, renameIn, safeResolve, type SearchOptions } from './fs';
import { readToolsStatus } from './toolsStatus';
import type { UsageLimitsReadOptions } from '../shared/usageLimits';
import { createContextTriggerTimer } from '../core/contextTriggerTimer';
import { applyGraphicsModeAtStartup, appliedGraphicsMode, graphicsStatus, logGraphicsWhenKnown, watchGpuReports } from './graphics';
import { codexFolderListing, codexFoldersNeedingOk, codexLayerLoads, codexLayers, setsProjectRootMarkers } from './codexLayers';
import { HistoryService } from './historyService';
import { sessionTurnRead } from './sessionTurn';
import { installSkill, listLocalSkills, loadCatalog, uninstallSkill, type LocalSkill } from './skills';
import type { CodexHeldState, CodexWaitingFolder } from '../shared/codexFolders';
import type { GraphicsStatusView } from '../shared/graphicsMode';
import { createMissionScheduler, mergeSavedMissions, startArmingWatch, type ArmingWatch } from './automationArming';
import { getBranch, getStatus, getLog, getBranches, getAheadBehind, isRepo, getDiff, mainRepoRoot, removeWorktree, worktreeHasUnintegratedWork, worktreeIsGcSafe, finalizeTempWorktree, getLogGraph, getCommitFiles, getFileAtRev, compareRefs, listWorktrees, checkoutRef } from './git';
import { unlinkWorktreeDeps } from './worktreeDeps';
import { HiveManager, redactSecrets, type AgentMeta, type HiveMessage, type HiveTask, type HumanQAChange, type HumanQARef } from './hive';
import { HookServer } from '../core/hookServer';
import { findCodexHomeForSession } from '../core/codexHome';
import { fanOutHookSink } from './hookSink';
import { chooseHookTransport, claudeVersionOnce, httpHookAllowlistReason, type HookTransport } from './hookTransport';
import { removeTreeFully } from './removeTree';
import { PtySubmitter, TerminalProbes, nextNudgeAction, type NudgeState, type SubmitSource } from './ptySubmit';
import { initialWindowVisibility, nextWindowVisibility, windowHidden, type WindowVisibility, type WindowVisibilityEvent } from './windowVisibility';
import { acquireFloorAtBoot, openFloorPicker, registerFloorIpc, setFloorSpawner, type FloorGateDeps } from './floorGate';
import { parseFloorArgs, floorDataDirFor, floorSpawnPlan, floorSpawnEnv, seedFloorConfig } from './floorArgs';
import { setSharedDataDir, sharedDataDir, isFloorProcess } from './sharedData';
import { claimFloorNumber, releaseFloorNumber, liveOfficeCount, officeLabel, windowTitle } from './floorNumber';
import { pidAlive } from './floorLock';
import { CircuitBreaker, type BreakerInput } from './breaker';
import { CumulativeSampleGate, type AgentUsageSample, type UsageProvider } from './usage';
import { MemoryManager } from './memory';
import Database from 'better-sqlite3';
import { removeCodexMemory } from './codexMemory';
import { codexMemoryOnFor } from '../shared/codexMemory';
import { KnowledgeManager } from './knowledge';
import { MemoryReflector, type ReflectSettings } from './reflect';
import { HandoffJob } from './handoffJob';
import { PersistStore } from './db';
import { readAgentUsage, readContextTokens, resolveSessionCwd } from './transcript';
import { listIssues, listCIRuns } from './github';
import { SlackWebhookServer, SlackReplyServer, postSlackReply, setSlackPostSink, type SlackInboundMessage } from './slack';
import { downloadSlackFiles } from '../core/slackFiles';
import { appendSlackHistory, listSlackHistory } from './slackHistory';
import { handleInboundSlack, onTempFinished, type SlackInbound } from './slackInbound';
import { inboundRequestId, inboundWorkerId, queueInboundTemp } from './inboundTemp';
import { SlackPollerSet, fetchMessage, fetchRecent, fetchThread, slackAuthTest, slackListChannels } from './slackPoller';
import { SLACK_REFS_MAX, buildSlackBrief, slackMessageLinks, slackRefsBlock, slackRowsBlock, type SlackBriefArgs, type SlackReader, type SlackRef, type SlackRow } from '../shared/slackBrief';
import { SlackSocketClient, slackConnectionsOpenTest } from './slackSocket';
import { SlackStartRetry, slackStartFailedText } from './slackStartRetry';
import { SLACK_BOT_SCOPES, SLACK_LINE_OFF_REASON, SLACK_MODES, SLACK_PROACTIVE_OFF_REASON, resolveCatchupSeconds, resolvePollSeconds, resolveSlackChannels, resolveSlackMode, type SlackMode, type SlackStatus, type SlackTestDraft, type SlackTestResult } from '../shared/slackMode';
import { selectBroadcastTargets } from '../shared/broadcast';
import { memoryContextBlock, writeMemoryIndex } from './memoryIndex';
import { appendWorkerHistory, listWorkerHistory, setWorkerHistoryWorktree } from './workerHistory';
import { startTaskHygiene, stopTaskHygiene } from './taskHygiene';
import { startRetention } from './retention';
import { registryKeep, startCodexSessionPrune, stopCodexSessionPrune } from './codexSessionPrune';
import type { WorkerResult } from '../shared/workerHistory';
import {
  WebhookServer, WEBHOOK_REPLAY_WINDOW_MS,
  type WebhookDispatch, type WebhookEndpointRef, type WebhookInbound, type WebhookTaskStatus
} from './webhook';
import { sanitizeWebhookTrigger } from '../shared/webhookTrigger';
import { setTunnelLog } from './tunnel';
import { missionSummary, processConnectionRequests, type ConnDeps } from './connectionRequests';
import {
  classifyInboundKind, isAutoAllowed, webhookBriefing,
  CONTEXT_MESSAGE_TOO_LONG, contextMessageOverCap, DEFAULT_CONTEXT_TRIGGER, DEFAULT_TRIGGER_MODE, DEFAULT_WEBHOOK_SCHEMA,
  type ContextRule, type ContextTriggerConfig, type InboundKind,
  type TriggerHistoryEntry, type TriggerMode, type WebhookTrigger
} from '../shared/triggers';
import { cloneableIdsOf, isTempReceiver, resolveReceiver, resolveWebhookReceiver, type Receiver } from '../shared/responder';
import {
  appendTriggerHistory, clearTriggerHistory, listTriggerHistory, updateTriggerHistory
} from './triggerHistory';
import { registerRealtimeIpc } from './realtime';
import { registerRealtimeActionIpc } from './realtimeActionIpc';
import { adoptArchiveSide } from '../core/archiveSide';
import { initCompletionWatcher } from './realtimeCompletionWatcher';
import type { TaskCard, InboxMessage } from './realtimeCompletionWatcher';
import { TelemetryCollector } from './telemetry';
import { CodexUsageScheduler } from './codexUsage';
import { AgyUsageScheduler } from './agyUsage';
import { UsageLimits, engineEnv } from './usageLimits';
import { limitsAnswer } from '../shared/limitsText';
import { CostLedgerTotals } from './costLifetime';
import { analytics, isRendererMessageSurface } from './analytics';
import type { SpawnFailReason } from './analytics';
import { IntegrationBroker } from './integrationBroker';
import { integrationList, type WebhookListInput } from '../shared/integrationList';
import { integrationActivity, refusalGate } from './integrationActivity';
import { BrokerGrants } from './brokerAccess';
import { agentSecretsRoute } from './agentSecrets';
import * as integrations from './integrations';
import { appKeyFilesIn } from './sealedStore';
import { CUSTOM_SECRET_PREFIX, customSecretNames, customSecretRef, secretNameProblem } from '../shared/customSecrets';
import { validateBaseUrl, buildAuthRequest, resolveUpstreamUrl, probePathFor, probeQueryFor, INTEGRATION_TEMPLATES } from '../shared/integrations';
import { guardNavigation } from './navigationGuard';
import { debugSwitch, devRendererUrl, floorFoldersAllowed, floorRefusedWords, FLOOR_REFUSED_TITLE } from './packagedRoads';
import { RosterStore } from './roster';
import { buildWorkerLaunch, cloneBrief, cloneEngine, savedCardOf } from './workerLaunch';
import { INBOUND_TEMP_WAIT_MS, resolveMaxTempsPerAgent } from '../shared/responder';
import type { InboundSource } from './inboundTemp';
import { ControlRegistry } from './control';
import { WorkerWakeWatchdog, WORKER_WAKE_REPORT_MS, WORKER_WAKE_STALL_MS, activityEvidenceAt, type WorkerWakeFacts } from './workerWake';
import { finalizeAgentWorktree } from './agentWorktree';
import { listOwnedWorktrees, removeOwnedWorktree, worktreeSize, worktreeWork, type WorktreeAdminContext } from './worktreeAdmin';
import { readWorktreeBase } from '../core/worktreeBase';
import { PERSON_ENDS, RESPAWNING, reasonFromRenderer, type TeardownReason } from '../shared/worktreeFate';
import { floorCardIds, isLive, QUICK_EXIT_MS, type RestoreHold } from '../shared/agentLive';
import { effortFromArgs, modelFromArgs, spawnedCard } from '../shared/spawnedCard';
import { TEMP_ID_PREFIX } from '../shared/tempAgent';
import { IdeDirtyLedger, ideQuitWarning } from '../shared/ideBuffers';
import { integrationHandlers } from './integrationIpc';
import { keyCheckHandlers } from './keyCheck';
import { sampleProvesConversation } from '../shared/resumeKey';
import { inboxNudgeText, wakesReceiver } from '../shared/hiveNudge';
import { compactionCommandForProvider, isCompactionCommand, switchClearCommand, wakeOptionsFor } from '../shared/providerAutomation';
import { WakeFiling } from './wakeFiling';
import { FounderTurns, PERSON_SENDERS, wakeCarriesPersonMail } from './founderTurn';
import { DEFAULT_SWITCH_CLEAR, SwitchClear, askedHandoffRequestText, handoffReason, handoffRequestText, oldestWakingWork, sanitizeSwitchClear, sizeHandoffRequestText, typedKind, withClearedLead, type WakeFacts } from '../shared/switchClear';
import { CodexSizeClear } from '../shared/codexSizeClear';
import { AskedClear, CLEAR_REQUESTS_DIR, CLEAR_REQUEST_MAX_BYTES, parseClearRequest } from '../shared/askedClear';
import { AskedCompact, COMPACT_REQUESTS_DIR } from '../shared/askedCompact';
import { ClearHistory, type PendingSave } from '../shared/lastSession';
import { handoffPathOf, lastSessionPathOf, saveLastSessionAt } from '../core/lastSessionSave';
import { stat as statFile } from 'node:fs/promises';
import { resolveGodName } from '../shared/godIdentity';
import { fetchHireManifest, readHireManifestFiles } from './hire';
import { parseHireDeepLink, type HireManifest } from '../shared/hire';
import {
  commandForExplicitProvider,
  inferAgentProvider,
  installInfoForProvider,
  isClaudeProvider,
  providerPreset,
  type AgentProvider
} from '../shared/agentProvider';
import { createEngineModels } from '../core/engineModels';
import { defaultHiveProjectFolder, inHiveProjects, makeHiveProjectFolder } from '../core/hiveProjects';
import { buildLoginScript, buildManualSetupScript } from './cliInstall';
import { installerTail, type CliMissingState } from '../shared/cliMissing';
import { installEndStillWanted, loginCommandLine, offerSignInAfterExit, providerLoginArgs, setupCanGoManual, setupCanStart, setupCanStartAnyway, type CliSetupState } from '../shared/cliSetup';
import { checkSignedIn, hasSignInCheck } from './cliReadiness';
import { CliLoginWatcher, WORK_EVENTS } from './cliLoginWatcher';
import { loginLinkToOpen, type LoginEvent } from '../shared/cliLogin';
import { isFloorState, type FloorState } from '../shared/hivePicker';
import { freshAfterFailedResume, freshOrSignIn, resumeRefusal, withoutResume } from '../shared/resumeRetry';
import { loadHero } from './hero';
import { loadModelCatalog } from './modelCatalog';
import {
  CODEX_REMOTE_SOCKET_RELATIVE,
  codexRemoteAliasPath,
  codexRemoteEndpoint,
  codexRemoteSocketFits,
  codexWritableRootsToml,
  isCodexResumeArgs,
  splitCodexAddDirs,
  withCodexRemoteArgs,
  withoutCodexDaemon
} from '../shared/codexRemote';

// A packaged app does not start with a debug switch. One line, and out, before anything else runs.
const startedWithDebug = app.isPackaged ? debugSwitch({ argv: process.argv, execArgv: process.execArgv, env: process.env, hasSwitch: (name) => app.commandLine.hasSwitch(name) }) : null;
if (startedWithDebug) {
  console.error(`[main] a packaged app does not start with ${startedWithDebug}: quitting`);
  process.exit(1);
}

// The dev renderer address is used only by a build that is not packaged (packagedRoads.ts).
const rendererUrl = devRendererUrl(app.isPackaged, process.env);

// DEV ONLY, AND FIRST: a dev instance pointed at its own userData can run
// beside the packaged app without sharing its state or its single instance
// lock (the lock scopes to userData). Must precede every userData read and
// requestSingleInstanceLock below. The packaged app never honors it, so a
// stray env var can never move real data.
if (!app.isPackaged && process.env.MD_USER_DATA) {
  app.setPath('userData', process.env.MD_USER_DATA);
}

// 0.5.3, B23 PART 2: A FLOOR IS A PROCESS. New Floor spawns this same binary
// with `--floor-data=<dir>`, its own userData (so its own single instance
// lock, config, windows, hook server and hive), and `--floor-shared=<dir>`,
// the main install's userData, where every floor finds the records the floors
// share (the floor numbers, each floor's own folder) and its first config.
// Honoured in packaged builds, which is exactly where New Floor runs, and
// before every userData read. The picker's folder arrives as `--floor-home`
// and goes into this floor's config on its first boot, so the floor opens on
// that hive and never sees the onboarding wizard.
const floorArgs = parseFloorArgs(process.argv, process.env);
// Where git's private folders are made (src/core/gitSafe.ts): under this
// app's (this floor's) data folder, which no agent sandbox mounts. Read when
// first used, so after the floor's own userData is set just below.
setGitPrivateRoot(() => join(app.getPath('userData'), 'git-private'));
// A packaged app opens a floor only on the folders it would have made itself. Asked before the
// data folder is moved, so `userData` here is still this install's own.
const floorCheck = floorArgs && app.isPackaged ? floorFoldersAllowed(floorArgs, app.getPath('userData'), (p) => realpathSync(p)) : null;
if (floorCheck && !floorCheck.ok) {
  console.error(`[floor] refused: ${floorCheck.why}`);
  dialog.showErrorBox(FLOOR_REFUSED_TITLE, floorRefusedWords(floorCheck.why));
  process.exit(1);
}
if (floorArgs) {
  app.setPath('userData', floorArgs.dataDir);
  setSharedDataDir(floorArgs.sharedDir);
  // First boot of this floor: its config is the main install's, seeded once
  // (onboarding done, models, keys), minus the per hive and per
  // listener keys, on the picker's folder. Later boots keep the floor's own.
  const floorConfig = join(floorArgs.dataDir, 'config.json');
  if (floorArgs.home && !existsSync(floorConfig)) {
    let seed: Record<string, unknown> = {};
    try { seed = JSON.parse(readFileSync(join(floorArgs.sharedDir, 'config.json'), 'utf8')) as Record<string, unknown>; } catch { /* a main install with no config yet: defaults */ }
    mkdirSync(floorArgs.dataDir, { recursive: true });
    writeFileSync(floorConfig, JSON.stringify(seedFloorConfig(seed, floorArgs.home), null, 2), 'utf8');
  }
}

// Settings, Graphics: applied HERE, after the user data folder is final (the
// mode is in its config.json) and before app ready (disableHardwareAcceleration
// works only then). The GPU process's first report is watched from now on, so
// the startup 'graphics' log row can wait for Chromium to know.
const graphicsAtStartup = applyGraphicsModeAtStartup(app);
watchGpuReports(app);

// Keep the main process alive on an unexpected throw/rejection. The harness is a
// multi-agent supervisor — a single stray throw (e.g. node-pty's ConPTY console
// helper choking when a fast-exiting agent CLI's console is already gone) must
// NOT take the whole app and every running agent down with it. Log and continue
// rather than letting the default handler exit the process.
// (Restored during the #71 merge — the PR's rebase dropped these handlers.)
process.on('uncaughtException', (err) => {
  console.error('[main] uncaughtException (kept alive):', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[main] unhandledRejection (kept alive):', reason);
});

// The app quit with exit code 1 twelve hours after it started, and
// log.jsonl had no line to say why (hive/shared/eng/crash-1027/REPORT.md). Every
// process.exit now writes its code and its caller's stack first, and the exit
// itself one more line. Both synchronous: appendLog is appendFileSync. Before
// the hive exists (`hive` below) there is nowhere to write, so nothing is.
const exitThrough = process.exit.bind(process);
process.exit = ((code?: number | string | null) => {
  try { hive.appendLog({ kind: 'app-exit-call', code: code ?? null, stack: new Error('process.exit').stack ?? '' }); } catch { /* no hive yet */ }
  return exitThrough(code);
}) as typeof process.exit;
process.on('exit', (code) => {
  try { hive.appendLog({ kind: 'app-exit', code }); } catch { /* no hive yet */ }
});
// The public tunnels (main/tunnel.ts) say when they open, close and reopen.
setTunnelLog((e) => { try { hive.appendLog(e); } catch { /* no hive yet */ } });

const ptyManager = new PtyManager();
// 0.5.5, Plan G: the person's login shell is asked for its PATH ONCE, in the
// background, from the moment the app starts. It used to be asked on the main
// thread (1.5 to 3.5 s with the window frozen), and once more per command.
void shellPathReady();
/** The PATH generation the node launcher was last written for. */
let launcherGeneration = -1;
/** Wait for the login shell's PATH (at most its 10 s limit), then bring what
 *  was set up before it landed in line with it. Everything that starts an
 *  agent waits here first, so no agent starts with a short PATH or with a
 *  launcher written for one. Answers at once when the PATH is known. */
async function launchEnvReady(): Promise<void> {
  await shellPathReady();
  const gen = shellPathGeneration();
  if (launcherGeneration === gen) return;
  launcherGeneration = gen;
  try { hive.refreshNodeLauncher(); } catch (e) { console.error('[hive] node launcher refresh failed:', e); }
}
/** I2 part 2: a fresh CLI's sign in prompt, read from its output and shown
 *  to the terminal that owns the pty as a modal. The watcher is told which
 *  pty runs which provider at spawn and forgets it at teardown. */
const ptyOwners = new Map<string, Electron.WebContents | null>();
const loginWatcher = new CliLoginWatcher((id, e) => {
  const owner = ptyOwners.get(id);
  const wc = (owner && !owner.isDestroyed()) ? owner : liveWebContents();
  try { wc?.send(`pty:login:${id}`, e); } catch { /* window gone */ }
});
ptyManager.setDataHook((id, data) => loginWatcher.observe(id, data));

function runCodexDaemonCommand(
  executable: string,
  args: string[],
  env: NodeJS.ProcessEnv,
  timeoutMs = 20_000
): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolveResult) => {
    let settled = false;
    let stderr = '';
    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(executable, args, {
        env,
        stdio: ['ignore', 'ignore', 'pipe'],
        windowsHide: true
      });
    } catch (e) {
      resolveResult({ ok: false, error: e instanceof Error ? e.message : String(e) });
      return;
    }
    let timer: NodeJS.Timeout;
    const finish = (result: { ok: boolean; error?: string }): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolveResult(result);
    };
    child.stderr?.on('data', (chunk) => {
      if (stderr.length < 8_000) stderr += String(chunk);
    });
    child.once('error', (e) => finish({ ok: false, error: e.message }));
    child.once('exit', (code) => {
      finish(code === 0
        ? { ok: true }
        : { ok: false, error: stderr.trim() || `Codex exited with code ${code ?? 'unknown'}` });
    });
    timer = setTimeout(() => {
      try { child.kill(); } catch { /* already exited */ }
      finish({ ok: false, error: `Codex daemon command timed out after ${timeoutMs}ms` });
    }, timeoutMs);
  });
}

/** The daemons started below, stopped when their agent ends, at quit
 *  and, for an earlier run's, at launch (codexDaemons.ts). */
const codexDaemons = new CodexDaemons({ run: runCodexDaemonCommand, log: (m, d) => console.log(m, d ?? '') });

/** Start/enable one managed remote-control daemon for this isolated Codex home,
 * then point the TUI at its app-server socket. Failure is non-fatal: the worker
 * still starts as a normal local Codex session. */
async function enableCodexRemoteForSpawn(
  opts: SpawnOptions & { hive?: AgentMeta },
  agentId: string
): Promise<boolean> {
  if (process.platform === 'win32') return false;
  const realHome = opts.env?.CODEX_HOME;
  if (!realHome) return false;
  // A resume stays on the LOCAL TUI. Under --remote, `codex resume` refuses the
  // permission flags outright (exit 1) and silently drops
  // --dangerously-bypass-hook-trust, which parks the worker on "Hooks need
  // review. 8 hooks are new or changed" with nobody to answer it. The local TUI
  // takes all of them, so the restart comes back with the hooks and permissions
  // of its first start. The cost is named, not silent: a resumed session is not
  // visible in ChatGPT mobile until it is started fresh.
  if (isCodexResumeArgs(opts.args ?? [])) {
    console.log('[codex-remote] a resume cannot carry the permission flags on a remote app-server; starting the local TUI for', agentId);
    // Taking --remote off the command line is not the whole job. A restart KEEPS
    // this agent's daemon alive on purpose, so the agent coming straight back
    // reuses it (teardownPty), and `codex resume` joins "the shared
    // background server ... even if it is already running" (0.164.0). The local
    // resume would then be a remote task by adoption and be refused all over
    // again — the crash loop of 8 Nov 2026 (three agents, a model change on a
    // live floor). So stop that server and tell this one invocation to run alone.
    // Both, and only when a control socket is really there: that is the one
    // situation this can happen in, and the one that proves the installed CLI
    // knows the flag. The daemon is not the session — the rollout is on disk in
    // CODEX_HOME, so nothing is lost and the next fresh start brings one back.
    try {
      // The launch sweep may be stopping an earlier run's daemon right now; a
      // resume must read the socket after it, not through it.
      await codexDaemons.settled(15_000);
      // The socket lives in the real home; the alias is only a short name for it
      // and can be gone (a cleared /tmp) while a daemon or its socket file stays.
      // The real home is also the one the resume runs with, an owner home included.
      const alias = codexRemoteAliasPath(realHome, agentId);
      if (existsSync(join(realHome, CODEX_REMOTE_SOCKET_RELATIVE)) || existsSync(join(alias, CODEX_REMOTE_SOCKET_RELATIVE))) {
        await codexDaemons.stop(agentId);
        opts.args = withoutCodexDaemon(opts.args ?? []);
        console.log('[codex-remote] the resume runs off the shared app-server (--no-daemon) for', agentId);
      }
    } catch (e) {
      console.warn('[codex-remote] could not take the resume off the shared app-server:',
        e instanceof Error ? e.message : e);
    }
    return false;
  }
  // The launch sweep may be stopping this agent's old daemon right now.
  await codexDaemons.settled(15_000);
  try {
    const alias = codexRemoteAliasPath(realHome, agentId);
    // Bail before touching the filesystem if even the short alias would exceed
    // sun_path — the daemon would start and then die on bind, and the warning
    // below names the real reason instead of a generic readiness timeout.
    if (!codexRemoteSocketFits(alias)) {
      console.warn('[codex-remote] socket path exceeds sun_path; starting local TUI:', alias);
      return false;
    }
    const aliasRoot = dirname(alias);
    mkdirSync(aliasRoot, { recursive: true });
    if (existsSync(alias)) {
      const st = lstatSync(alias);
      if (!st.isSymbolicLink() || resolve(dirname(alias), readlinkSync(alias)) !== resolve(realHome)) {
        console.warn('[codex-remote] short home alias is occupied; starting local TUI:', alias);
        return false;
      }
    } else {
      symlinkSync(realHome, alias, 'dir');
    }

    // --add-dir is refused next to --remote, so the writable roots move into
    // this worker's own config.toml before the daemon reads it.
    const { dirs } = splitCodexAddDirs(opts.args ?? []);
    if (dirs.length > 0) {
      const configPath = join(realHome, 'config.toml');
      const toml = existsSync(configPath) ? readFileSync(configPath, 'utf8') : '';
      const next = codexWritableRootsToml(toml, dirs);
      if (next === null) {
        console.warn('[codex-remote] config.toml sets writable_roots itself; starting local TUI');
        return false;
      }
      writeFileSync(configPath, next, 'utf8');
    }

    const socket = join(alias, CODEX_REMOTE_SOCKET_RELATIVE);
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      ...(opts.env ?? {}),
      CODEX_HOME: alias
    };
    // shellEnv's resolver mirrors PtyManager's (which is private + returns
    // {path, found}); the daemon just needs the best executable path.
    const executable = resolveCliCommand(opts.command);
    const started = await runCodexDaemonCommand(
      executable,
      ['app-server', 'daemon', 'start'],
      env
    );
    if (!started.ok) {
      console.warn('[codex-remote] daemon start failed; starting local TUI:', started.error);
      return false;
    }
    const enabled = await runCodexDaemonCommand(
      executable,
      ['app-server', 'daemon', 'enable-remote-control'],
      env
    );
    if (!enabled.ok) {
      console.warn('[codex-remote] enable failed; starting local TUI:', enabled.error);
      return false;
    }
    codexDaemons.remember(agentId, { home: alias, executable, env });
    if (!existsSync(socket)) {
      console.warn('[codex-remote] daemon returned without a control socket; starting local TUI');
      return false;
    }
    opts.env = { ...(opts.env ?? {}), CODEX_HOME: alias };
    opts.args = withCodexRemoteArgs(opts.args ?? [], codexRemoteEndpoint(alias));
    return true;
  } catch (e) {
    console.warn('[codex-remote] setup failed; starting local TUI:',
      e instanceof Error ? e.message : e);
    return false;
  }
}
/** Live PTY id → its hive agent id, recorded at spawn. The pty:kill handler only
 *  gets the PTY id, so this lets a closed tab archive the right registry agent. */
const ptyToAgent = new Map<string, string>();
/** Agents whose process ended on its own in this run of the app, and
 *  how. A window that reloads reads it (`hive:endedAgents`), so Crashed is still
 *  said after a reload instead of the agent being started again. Kept until the
 *  agent runs again or a person ends it (teardownPty). */
const endedAgents = new Map<string, { exitCode?: number; signal?: number; printMode?: boolean; at: number }>();
/** PTY id → the spawn it should auto restart-and-continue into once a first-time
 *  CLI install finishes. The missing-CLI short-circuit runs the engine's installer
 *  in this PTY; when it exits cleanly the exit handler re-runs the SAME spawn (with
 *  install disabled) so the freshly-installed CLI launches in the SAME pty/window —
 *  no user click. Cleared the moment it's consumed, so it can never loop installs. */
const pendingInstallRelaunch = new Map<string, { opts: AgentSpawnOptions; owner: Electron.WebContents | null; bin: string; rung: string }>();
/** I2 (0.5.3): a spawn that found no binary and stopped at the card. The
 *  Install button (pty:installCli) re-runs the same spawn with `installNow`,
 *  which is the only way the installer starts. Kept after a failed install so
 *  Try again works; dropped once the CLI is running. */
const pendingCliMissing = new Map<string, { opts: AgentSpawnOptions; owner: Electron.WebContents | null; state: CliMissingState }>();
/** Tell the terminal that owns this pty to draw the card (or to draw it again
 *  with the failure). */
function sendCliMissing(id: string, owner: Electron.WebContents | null, state: CliMissingState): void {
  const wc = (owner && !owner.isDestroyed()) ? owner : liveWebContents();
  try { wc?.send(`pty:cli-missing:${id}`, state); } catch { /* window gone */ }
}
/** Batch 2 (0.5.3): an agent between "Install pressed" and "started". While
 *  installing, and while the provider's login runs after a clean install, the
 *  terminal belongs to that program: the composer and the queue hold, and the
 *  panel above the composer says why. "Setup complete, start agent"
 *  (pty:cliSetupStart) discards the terminal and starts the agent fresh. */
const pendingCliSetup = new Map<string, { opts: AgentSpawnOptions; owner: Electron.WebContents | null; state: CliSetupState; poll?: ReturnType<typeof setInterval> }>();
/** Batch 2 (founder, 24 Sep 2026: an installed Copilot that was not signed in
 *  got no setup panel). Each agent run that started, with the spawn as it was
 *  asked for, so the exit handler can offer the sign in panel for a run that
 *  ended the way a signed out CLI ends, and "Setup complete, start agent" can
 *  start the same agent again. `printMode` marks a run that answers once and
 *  exits (Copilot -p), whose clean exit is a finished task. */
const agentRuns = new Map<string, AgentRun<Electron.WebContents>>();
/** A hive Codex start held because the project's own `.codex`
 *  folders are not allowed yet (codexLayers.ts), with the spawn to run and the
 *  folders main found. `codex:allowFolder` records them and runs it; a Stop
 *  drops it. */
const pendingCodexFolders = new Map<string, { opts: AgentSpawnOptions; owner: Electron.WebContents | null; folders: string[]; state: CodexHeldState }>();
/** The folders allowed in this run, kept here as well as in config: a damaged
 *  config.json skips writes (R2), and the OK must still hold until a restart. */
const codexFoldersAllowedThisRun = new Set<string>();
/** Every folder allowed: config's codexLayerOptIns, then this run's. */
function codexAllowedFolders(): string[] {
  const saved = readConfig().codexLayerOptIns;
  const kept = (Array.isArray(saved) ? saved : []).filter((f): f is string => typeof f === 'string');
  return [...kept, ...[...codexFoldersAllowedThisRun].filter((f) => !kept.includes(f))];
}
/** Tell the terminal that owns this pty to draw the folder card, or (null) to drop it. */
function sendCodexHeld(id: string, owner: Electron.WebContents | null, state: CodexHeldState | null): void {
  const wc = (owner && !owner.isDestroyed()) ? owner : liveWebContents();
  try { wc?.send(`pty:codex-folders:${id}`, state); } catch { /* window gone */ }
}
/** Drop a held start (allowed, stopped, or no longer needed) and its card. */
function endCodexHold(id: string): { opts: AgentSpawnOptions; owner: Electron.WebContents | null; folders: string[]; state: CodexHeldState } | undefined {
  const held = pendingCodexFolders.get(id);
  if (!held) return undefined;
  pendingCodexFolders.delete(id);
  sendCodexHeld(id, held.owner, null);
  return held;
}
/** Folders a start with no card was held on (a
 *  temp, a voice hire), keyed by the OK key, for Settings to allow. Allowing
 *  one starts nothing: whoever asked starts the agent again. */
const codexWaitingFolders = new Map<string, CodexWaitingFolder>();
/** The waiting folders still not allowed. */
function codexWaitingList(): CodexWaitingFolder[] {
  const open = new Set(codexFoldersNeedingOk([...codexWaitingFolders.keys()], codexAllowedFolders()));
  for (const k of [...codexWaitingFolders.keys()]) if (!open.has(k)) codexWaitingFolders.delete(k);
  return [...codexWaitingFolders.values()];
}
/** Hold this hive Codex start when a `.codex` folder it would load is not
 *  allowed: null to go on, else the refusal to return. `held` is the spawn
 *  `codex:allowFolder` runs. With no card to draw (`card` false) nothing is
 *  kept to run: the folders wait in Settings and the refusal says so. */
function holdForCodexFolders(opts: AgentSpawnOptions, held: AgentSpawnOptions, owner: Electron.WebContents | null, card: boolean): { ok: false; error: string; codexFolders: string[] } | null {
  const probe = probeCodexFolders(opts);
  if (!probe) { endCodexHold(opts.id); return null; }
  return commitCodexHold(opts.id, probe, held, owner, card);
}
/** The folders this start would load that are not allowed yet, each with what
 *  the card shows, read now (a worktree about to be taken back is still there);
 *  null when none. Logs the hold. Nothing is shown or kept to run. */
function probeCodexFolders(opts: AgentSpawnOptions): CodexWaitingFolder[] | null {
  const root = hive.root();
  let userConfig: string | null = null;
  try { userConfig = readFileSync(join(homedir(), '.codex', 'config.toml'), 'utf8'); } catch { /* none */ }
  const layers = codexLayers(opts.cwd, {
    exclude: root && opts.hive ? [join(root, 'agents', opts.hive.id, '.codex')] : [],
    walkToTop: setsProjectRootMarkers(userConfig)
  });
  const folders = codexFoldersNeedingOk(layers.map((l) => l.key), codexAllowedFolders());
  if (folders.length === 0) return null;
  hive.appendLog({ kind: 'codex-folders-held', agent: opts.hive?.id ?? null, folders });
  return folders.map((folder) => {
    const layer = layers.find((l) => l.key === folder);
    return { folder, loads: layer ? codexLayerLoads(layer) : [{ folder, ...codexFolderListing(folder) }] };
  });
}
/** Put a probed hold up: the card with `held` to run on an Allow, or with no
 *  card the waiting list in Settings. The refusal to return. */
function commitCodexHold(id: string, probe: CodexWaitingFolder[], held: AgentSpawnOptions, owner: Electron.WebContents | null, card: boolean): { ok: false; error: string; codexFolders: string[] } {
  const folders = probe.map((p) => p.folder);
  if (!card) {
    endCodexHold(id);
    for (const p of probe) codexWaitingFolders.set(p.folder, p);
    return {
      ok: false,
      error: `Codex would load this project's own settings (hooks, MCP servers or command rules) from ${folders.join(', ')}. `
        + `${folders.length === 1 ? 'It waits' : 'They wait'} for the person's OK in Settings, Codex folders; start the agent again after that.`,
      codexFolders: folders
    };
  }
  const state: CodexHeldState = { folders: probe.flatMap((p) => p.loads) };
  pendingCodexFolders.set(id, { opts: held, owner, folders, state });
  sendCodexHeld(id, owner, state);
  const which = folders.length === 1 ? 'this folder' : 'these folders';
  return {
    ok: false,
    error: `Codex would load this project's own settings (hooks, MCP servers or command rules) from ${folders.join(', ')}. Allow ${which} to start the agent.`,
    codexFolders: folders
  };
}
/** Batch 2 (e): while the sign in panel is up, ask the CLI's own status
 *  command every few seconds (claude, codex, cursor only), with the agent's
 *  spawn environment, one check at a time. A yes lights the panel; nothing
 *  else changes it. Stops the moment the setup ends. */
const SIGNIN_POLL_MS = 3000;
function watchSignIn(id: string, provider: AgentProvider, binPath: string, env: Record<string, string>, cwd: string): void {
  const entry = pendingCliSetup.get(id);
  if (!entry || !hasSignInCheck(provider)) return;
  let running = false;
  entry.poll = setInterval(() => {
    const cur = pendingCliSetup.get(id);
    if (cur !== entry || cur.state.phase !== 'signin' || cur.state.signedIn) { clearInterval(entry.poll); return; }
    if (running) return;
    running = true;
    void checkSignedIn(provider, binPath, env, cwd).then((st) => {
      running = false;
      if (st !== 'signed-in' || pendingCliSetup.get(id) !== entry) return;
      entry.state = { ...entry.state, signedIn: true };
      sendCliSetup(id, entry.owner, entry.state);
      clearInterval(entry.poll);
    });
  }, SIGNIN_POLL_MS);
}
function endCliSetup(id: string): { opts: AgentSpawnOptions; owner: Electron.WebContents | null; state: CliSetupState } | undefined {
  const entry = pendingCliSetup.get(id);
  if (!entry) return undefined;
  if (entry.poll) clearInterval(entry.poll);
  pendingCliSetup.delete(id);
  return entry;
}
/** Run the provider's login in the agent's pty, through spawnAgentCore so it
 *  gets the agent's own env. A CLI with no login command still gets the (e)
 *  check there; one that turns out to be signed in already starts at once. */
function runLoginStep(id: string): void {
  const entry = pendingCliSetup.get(id);
  if (!entry) return;
  const bin = entry.opts.command.trim().split(/\s+/)[0] || entry.opts.command;
  const binPath = ptyManager.commandPath(bin) ?? bin;
  const loginArgs = providerLoginArgs(entry.state.provider);
  // Marked running BEFORE the spawn: a login that exits at once must still
  // land in the exit handler's sign in branch, not in the agent teardown.
  if (loginArgs) {
    entry.state = { ...entry.state, login: 'running' };
    sendCliSetup(id, entry.owner, entry.state);
  }
  void spawnAgentCore({
    ...entry.opts,
    noAutoInstall: true,
    isolate: false,
    resume: false,
    loginScript: loginArgs ? buildLoginScript(binPath, loginArgs, entry.state.label, process.platform) : ''
  }, entry.owner).then((r) => {
    if (r.signedIn) { void startAgentAfterSetup(id); return; }
    const cur = pendingCliSetup.get(id);
    if (cur !== entry || !loginArgs || r.ok) return;
    cur.state = { ...cur.state, login: 'failed' };
    sendCliSetup(id, cur.owner, cur.state);
  });
}
/** Discard the setup terminal and start the agent fresh into the same pty:
 *  the button, and a CLI that turned out to be signed in already. */
function startAgentAfterSetup(id: string): Promise<Awaited<ReturnType<typeof spawnAgentCore>>> | { ok: false; error: string } {
  const setup = endCliSetup(id);
  if (!setup) return { ok: false, error: 'nothing-to-start' };
  loginWatcher.forget(id);
  ptyManager.kill(id); // a login that already ended answers not-found; harmless
  if (setup.state.login === 'running') closeLoginModal(id, setup.owner, 'failure');
  sendCliSetup(id, setup.owner, null);
  const wc = (setup.owner && !setup.owner.isDestroyed()) ? setup.owner : liveWebContents();
  try { wc?.send(`pty:relaunch:${id}`); } catch { /* window gone */ }
  const { installNow: _i, guidedSetup: _g, loginScript: _l, manualSetup: _m, ...opts } = setup.opts;
  if (setup.state.phase === 'manual') {
    // Batch 4: the person installed or signed in by hand, so the CLI may be
    // somewhere the startup lookup never saw (a native installer's own bin
    // folder, a PATH line it added to the rc files). Look again from scratch,
    // and let a CLI that is still missing bring the card back rather than
    // die as "process exited (code 1)".
    ptyManager.forgetLookups();
    return spawnAgentCore({ ...opts, noAutoInstall: false }, setup.owner);
  }
  return spawnAgentCore({ ...opts, noAutoInstall: true }, setup.owner);
}
/** Batch 4 (founder, 24 Sep 2026): "Set up manually". The install failed, or
 *  the sign in failed or cannot be seen, so the app hands the person a
 *  terminal: the agent's own pty and environment, with the install command
 *  (install failed) or the CLI itself (sign in) running in it, then their own
 *  shell. "Setup complete, start agent" is live from the start; it discards
 *  this terminal and starts the agent. */
function openManualSetup(id: string): { ok: boolean; error?: string } {
  const setup = pendingCliSetup.get(id);
  const missing = pendingCliMissing.get(id);
  let opts: AgentSpawnOptions;
  let owner: Electron.WebContents | null;
  let state: CliSetupState;
  if (setup && setupCanGoManual(setup.state)) {
    const bin = setup.opts.command.trim().split(/\s+/)[0] || setup.opts.command;
    const binPath = ptyManager.commandPath(bin) ?? bin;
    const binName = bin.split('/').pop() || bin;
    endCliSetup(id);
    ({ opts, owner } = setup);
    state = { phase: 'manual', provider: setup.state.provider, label: setup.state.label, loginCommand: null, manual: { reason: 'signin', command: binName } };
    opts = { ...opts, loginScript: buildManualSetupScript({ reason: 'signin', label: state.label, binName, shown: binName, exec: binPath }, process.platform) };
  } else if (missing && !pendingCliSetup.has(id) && missing.state.provider !== 'custom' && (missing.state.command ?? missing.state.manualCommand)) {
    const command = (missing.state.command ?? missing.state.manualCommand) as string;
    pendingCliMissing.delete(id);
    ({ opts, owner } = missing);
    state = { phase: 'manual', provider: missing.state.provider, label: missing.state.label, loginCommand: null, manual: { reason: 'install', command } };
    opts = { ...opts, loginScript: buildManualSetupScript({ reason: 'install', label: state.label, binName: missing.state.bin, shown: command, exec: command }, process.platform) };
  } else {
    return { ok: false, error: 'nothing-to-set-up' };
  }
  loginWatcher.forget(id);
  ptyManager.kill(id); // a login still running; an ended one answers not-found
  pendingInstallRelaunch.delete(id);
  // The killed login's modal goes with it (founder drill, 24 Sep: its dead
  // code sat over the manual terminal).
  if (setup?.state.login === 'running') closeLoginModal(id, owner, 'failure');
  const wc = (owner && !owner.isDestroyed()) ? owner : liveWebContents();
  // A clean grid for the manual terminal, then the panel (the reset clears
  // any panel, so the order matters; one channel keeps it).
  try { wc?.send(`pty:relaunch:${id}`); } catch { /* window gone */ }
  pendingCliSetup.set(id, { opts: { ...opts, manualSetup: true }, owner, state });
  sendCliSetup(id, owner, state);
  void spawnAgentCore({ ...opts, manualSetup: true, noAutoInstall: true, isolate: false, resume: false }, owner).then((r) => {
    if (!r.ok) console.error('[cli-setup] manual terminal did not start:', r.error);
  });
  return { ok: true };
}
/** Close the sign in modal a login step raised: the same "done" event the
 *  watcher sends. A killed login never reaches the exit handler (its exit is
 *  stale once the id is reused), so the paths that kill it close it here. */
function closeLoginModal(id: string, owner: Electron.WebContents | null, outcome: 'success' | 'failure'): void {
  const wc = (owner && !owner.isDestroyed()) ? owner : liveWebContents();
  const done: LoginEvent = { done: { outcome, line: '' } };
  try { wc?.send(`pty:login:${id}`, done); } catch { /* window gone */ }
}
function sendCliSetup(id: string, owner: Electron.WebContents | null, state: CliSetupState | null): void {
  const wc = (owner && !owner.isDestroyed()) ? owner : liveWebContents();
  try { wc?.send(`pty:cli-setup:${id}`, state); } catch { /* window gone */ }
}
// The office core's view of this process (src/core/host.ts): the harness home
// and config, a sink for floor events (the live window), a toast: the same
// values main handed the hive before, through one object.
const officeHost = createElectronHost({ liveWebContents, notify: breakerToast });
const hive = new HiveManager(officeHost);
// #7C — operator control state (pause/gate/steer/halt), read by the HookServer
// when deciding hook returns.
const control = new ControlRegistry();
// Stage 7A — the live observability tap. Receives Claude Code's first-party OTel
// over loopback OTLP/JSON and exposes the locked usage-provider seam. resolveCwd
// lets the transcript fallback find an agent's cwd from the hive registry.
const telemetry = new TelemetryCollector({
  emit: (channel, payload) => { try { liveWebContents()?.send(channel, payload); } catch { /* window tore down */ } },
  resolveCwd: (agentId) => hive.registry().agents[agentId]?.cwd ?? null,
  // D11: scopes the transcript fallback to this agent's own session instead of
  // summing every transcript in a (routinely shared) cwd.
  resolveSessionId: (agentId) => hive.lastSession(agentId)
});
// Usage provider (Seam 1) — the INTEGRATION swap: Oscar's telemetry collector (#7)
// IS the provider, replacing Lane A's interim StubUsageProvider. Same
// getAgentUsage(agentId) pull seam, so the breaker + cost ledger consumers are
// untouched; telemetry has a transcript fallback built in, so it works before any
// live OTel arrives. Codex and Antigravity export no OTel and keep no Claude
// transcript: their newest sample, read from their own session files
// (codexUsage.ts, agyUsage.ts), waits in engineUsage and answers when telemetry
// has nothing for that agent.
const engineUsage = new Map<string, AgentUsageSample>();
const usageProvider: UsageProvider = {
  getAgentUsage: (agentId) => telemetry.getAgentUsage(agentId) ?? engineUsage.get(agentId) ?? null
};
// Every provider's sample is cumulative, so an idle agent hands the beat the
// same totals every 30 s. The liveness gate below only asks "is there a live
// session"; this one asks "would the row differ from the last one", and the
// ledger gets a row only when it would (0.5.5: 20,056 rows, 688 distinct).
// Grok ignores ts (see CumulativeSampleGate); everyone else keeps it.
const ledgerGate = new CumulativeSampleGate();
// Circuit breaker (Lane A #6.6b) — the REAL policy (replaces Lane C's interim
// glue). POLICY only; the heartbeat beat feeds it signals (via usageProvider) +
// enforces its decisions. Config read live so a settings change applies next beat.
const breaker = new CircuitBreaker(() => {
  const c = readConfig();
  return { ...(c.circuitBreaker ?? {}), costCapUsd: c.costCapUsd, agentTokenCaps: c.agentTokenCaps };
});
// 0.5.6: tokens per agent by quarter hour, for the token limits per period
// (shared/tokenLimits). Fed by the breaker beat below, kept in the hive.
/** Agents run only while their tokens are counted (0.5.8, liveCount.ts): a Claude agent whose live count never
 *  arrives after its first turn is stopped. */
const liveCount = new LiveCountGuard();
const tokenUsage = new TokenUsage(() => { const root = hive.root(); return root ? join(root, 'token-usage.json') : null; });
// Always-on beats (decoupled from the optional heartbeat): the live fleet snapshot
// Michael reads + the breaker beat, so guardrails + monitoring work even when the
// heartbeat mission is disabled (it ships off).
let fleetTimer: ReturnType<typeof setInterval> | null = null;
let breakerBeatTimer: ReturnType<typeof setInterval> | null = null;
// Feed the breaker's api_error-storm trip from Oscar's OTel api_error spans —
// Jim's one breaker input with no on-branch source (telemetry.onApiError seam).
telemetry.onApiError((agentId) => breaker.recordError(agentId));
// Shared roster on disk — created early so HookServer can re-read standing goals
// on every UserPromptSubmit (Edit Agent saves land here via persistAgents).
const roster = new RosterStore(() => readConfig().harnessHome);
function standingGoalFromRoster(agentId: string): string | null {
  const snap = roster.read();
  if (!snap || !Array.isArray(snap.agents)) return null;
  for (const entry of snap.agents) {
    if (!entry || typeof entry !== 'object') continue;
    const a = entry as { id?: unknown; goal?: unknown };
    if (a.id !== agentId) continue;
    return typeof a.goal === 'string' && a.goal.trim() ? a.goal.trim() : null;
  }
  return null;
}
// Worker inbox-wake watchdog (#151): finds idle workers with undrained inbox mail
// and types the same guarded nudge the renderer would have (so a throttled
// background window can't leave a worker parked on an unread inbox forever).
// HookServer feeds it the hook stream so a permission/HITL prompt blocks nudges.
const workerWake = new WorkerWakeWatchdog();
// Usage limits (limits-bar, DATA.md): each engine's 5 hour and weekly limits, kept in memory. Claude
// Code's from its status line, Codex's from its session file as agents run; Codex and Antigravity asked
// themselves on a fresh read, with this person's environment and no agent's own home.
const usageLimits = new UsageLimits({
  commandPath: (command) => ptyManager.commandPath(command),
  env: () => engineEnv(ptyManager.childEnv()),
  cwd: () => homedir(),
  ready: () => launchEnvReady()
});
// #629: Codex token usage from its own rollout JSONL. A Codex agent pushes no
// OTel, so it read as zero tokens to the breaker and the cost ledger. Read on
// the hook boundaries that end a unit of work (PostToolUse, Stop, PostCompact),
// debounced 2 s per agent, async, and never polled: no timer runs unless a hook
// just fired (CodexUsageScheduler). The sample lands in telemetry; the breaker
// beat writes the ledger row through ledgerGate, exactly as for every other
// provider.
const codexUsage = new CodexUsageScheduler({
  codexHomeFor: (agentId) => {
    const root = hive.root();
    if (!root || hive.registry().agents[agentId]?.provider !== 'codex') return null;
    return join(root, 'agents', agentId, '.codex');
  },
  ingest: (sample) => { engineUsage.set(sample.agentId, sample); },
  limits: (agentId, tail) => usageLimits.noteCodexSession(agentId, tail)
});
// An agy agent's tokens, from its conversation's transcript_full.jsonl
// under ~/.gemini/antigravity-cli/brain, keyed by the hook's session_id. Read
// on the same hooks as Codex, the same way (AgyUsageScheduler).
const agyUsage = new AgyUsageScheduler({
  isAgy: (agentId) => hive.registry().agents[agentId]?.provider === 'antigravity',
  ingest: (sample) => { engineUsage.set(sample.agentId, sample); }
});
// HookServer needs BOTH: Oscar's control registry (HITL pause/gate/steer/halt via
// hook returns) AND Jim's breaker (feed recordToolUse on each PostToolUse).
const hookServer = new HookServer(
  hive,
  // Hook events fan out to EVERY floor window (#463): each floor keeps its own
  // agents, statuses and queue, so an unfocused floor that only heard the
  // focused window's copy never saw its own agents' hooks. Approval requests
  // still go to the live window alone.
  () => fanOutHookSink(allLiveWebContents, liveWebContents),
  () => readConfig(),
  control,
  breaker,
  standingGoalFromRoster,
  // I2 part 2: a hook event means the CLI is working, past any sign in, so
  // the watcher stops reading that agent's pty first (loginPastOnHook is
  // always true).
  // 0.5.6: the same stream tells wakeFiling when a turn ends (Stop), which is
  // when the mail that turn's wake printed is filed.
  (agentId, event, message, tool, source) => { loginPastOnHook(agentId, event); if (agentId && event !== 'Status') agentDemand.touch(agentId); workerWake.noteHook(agentId, event, message, undefined, tool); wakeFiling.noteHook(agentId, event, source); }
);
// The toast itself is Electron's; the hook server decides when.
hookServer.setNotifier((title, body) => {
  if (!Notification.isSupported()) return;
  new Notification({ title, body }).show();
});
// 0.5.6: the wake carries the mail, and the app files it when the turn that
// read it ends (wakeFiling.ts). Every typed wake is reported here by the two
// submit sites below (pty:submit and nudgeWorker); the mover is settleInbox,
// narrowed to the ids that wake printed in full.
const wakeFiling = new WakeFiling({
  file: (agentId, ids) => { hive.settleInbox(agentId, Number.POSITIVE_INFINITY, new Set(ids)); },
  promptSeen: (agentId, sinceMs, tail) => hookServer.proof.promptSeen(agentId, sinceMs, tail)
});
// 0.5.6: the clear on a switch of work (shared/switchClear.ts). The work each
// agent is on, when its session started, where its switch is, and its open sub
// agents, all in memory here: a window reload keeps them, an app restart does
// not (every agent is spawned again then, on no work, with a new session).
const switchClear = new SwitchClear();
hookServer.setFactsObserver((facts) => switchClear.noteHook(facts));
/** The agent's handoff.md, absolute. */
function handoffPathFor(agentId: string): string {
  return handoffPathOf(hive.inboxPath(agentId));
}
/** What the switch rule is told about a wake for this mail (oldest first). */
function switchFactsFor(agentId: string, mail: readonly HiveMessage[]): WakeFacts {
  const provider = inferAgentProvider(undefined, hive.registry().agents[agentId]?.provider);
  return {
    rule: readConfig().contextTrigger?.switchClear ?? DEFAULT_SWITCH_CLEAR,
    wakeWork: oldestWakingWork(mail),
    canClear: switchClearCommand(provider) !== null
  };
}
/** Does the worker watchdog leave this wake to the window? A wake that would
 *  start a switch, for WORKER_WAKE_STALL_MS from the mail's arrival, and a
 *  clear held on an open sub agent, with no ceiling (SwitchClear.leftToWindow). */
function switchLeftToWindow(agentId: string, mail: readonly HiveMessage[]): boolean {
  const times = mail.map((m) => Date.parse(m.created_at ?? '')).filter((t) => Number.isFinite(t));
  return switchClear.leftToWindow(agentId, switchFactsFor(agentId, mail), times.length ? Math.min(...times) : 0, WORKER_WAKE_STALL_MS);
}
/** The wake for one agent, written when it is typed: every pending message no
 *  earlier wake has carried, notes included. Null when there is none.
 *  0.5.6: when the wake is for other work than the agent is on, and its
 *  session is old enough, the hand off request is returned in its place; the
 *  first wake after the clear opens with one line saying so. */
function inboxWakeFor(agentId: string): string | null {
  const mail = wakeFiling.pending(agentId, hive.inbox(agentId));
  if (!mail.length) return null;
  const provider = inferAgentProvider(undefined, hive.registry().agents[agentId]?.provider);
  const step = switchClear.wakeStep(agentId, switchFactsFor(agentId, mail));
  if (step.kind === 'handoff') return handoffRequestText(step.work, handoffPathFor(agentId));
  if (step.cleared) return withClearedLead(inboxNudgeText(mail, hive.inboxPath(agentId), wakeOptionsFor(provider)), handoffPathFor(agentId), wakeOptionsFor(provider).oneLine, lastSessionKept(agentId));
  return inboxNudgeText(mail, hive.inboxPath(agentId), wakeOptionsFor(provider));
}
hookServer.setUsageObserver(({ agentId, transcriptPath, sessionId, model }) => {
  codexUsage.schedule(agentId, transcriptPath, sessionId, model);
  agyUsage.schedule(agentId, sessionId, model);
});
hookServer.setRateLimitsObserver((agentId, raw) => usageLimits.noteClaudeStatus(agentId, raw));
// God's live roster carries them in one line; `md-limits` reads them through the broker (below).
hive.setUsageLimits(() => usageLimits.read());
/** 0.5.10 (founder on RC13): a hook that says the agent is at work (WORK_EVENTS) also closes a sign in sheet still
 *  up for it: an agent that works is signed in, whatever its terminal printed before (a token it refreshed by
 *  itself prints no word the outcome reads). Any other hook only ends the reading, as before. */
function loginPastOnHook(agentId: string | undefined, event?: string): true {
  const working = typeof event === 'string' && WORK_EVENTS.has(event);
  if (agentId) for (const [pty, a] of ptyToAgent) if (a === agentId) { if (working) loginWatcher.agentWorking(pty); else loginWatcher.pastLogin(pty); }
  return true;
}
// 0.5.6: a Codex agent's conversation file past 100 MB is cleared at its next
// idle moment, by the same hand off and clear as a switch of work, whether or
// not that rule is on (shared/codexSizeClear.ts). A beat over the live agents
// stats each Codex rollout, once a minute per agent at most, and tells every
// window of one that is too large. The window that owns the agent queues the
// hand off when it is idle with nothing queued; the clear behind it asks
// hive:switchClearGate like any other. The pty:submit door marks the file done.
const codexSize = new CodexSizeClear();
const CODEX_SIZE_BEAT_MS = 15_000;
let codexSizeTimer: ReturnType<typeof setInterval> | null = null;
/** The hand off request for a Codex agent whose file is too large, when main
 *  may hand it out now: no hand off already out, no sub agent open. Else null. */
function codexSizeHandoffFor(agentId: string): string | null {
  const provider = inferAgentProvider(undefined, hive.registry().agents[agentId]?.provider);
  if (provider !== 'codex') return null;
  const ok = codexSize.handoffDue(agentId, {
    phase: switchClear.phase(agentId),
    openBackground: switchClear.background.open(agentId),
    canClear: switchClearCommand(provider) !== null
  });
  return ok ? sizeHandoffRequestText(switchClear.state(agentId)?.onWork, handoffPathFor(agentId)) : null;
}
/** One pass over the live agents. Stat only, never a read of the file. */
function runCodexSizeBeat(): void {
  if (!hive.enabled()) return;
  let agents: ReturnType<typeof hive.registry>['agents'] | undefined;
  for (const agentId of new Set(ptyToAgent.values())) {
    void codexSize.check(
      agentId,
      hookServer.transcriptPath(agentId),
      // Read once per beat, and only when some agent is due a look.
      () => inferAgentProvider(undefined, (agents ??= hive.registry().agents)[agentId]?.provider),
      async (path) => (await statFile(path)).size
    ).then((due) => {
      if (!due) return;
      for (const wc of allLiveWebContents()) {
        try { wc.send('hive:codexSizeClear', { agentId }); } catch { /* window gone */ }
      }
    }).catch(() => { /* a size check never affects anything else */ });
  }
}
// 0.5.6: the orchestrator clears an agent, its last resort (shared/askedClear.ts).
// It writes one JSON file into HIVE_ROOT/clear-requests/. The beat below files
// each under .done/ or .failed/ (with the reason) and tells every window of an
// accepted one; from there it takes the road of a Codex file too large.
const askedClear = new AskedClear();
/** HIVE_ROOT/clear-requests, or null with no hive. */
function clearRequestsDir(): string | null {
  const root = hive.root();
  return root ? join(root, CLEAR_REQUESTS_DIR) : null;
}
/** The hand off request for an agent the orchestrator asked to clear, when
 *  main may hand it out now: no hand off already out, no sub agent open. */
function askedHandoffFor(agentId: string): string | null {
  const provider = inferAgentProvider(undefined, hive.registry().agents[agentId]?.provider);
  const ok = askedClear.handoffDue(agentId, {
    phase: switchClear.phase(agentId),
    openBackground: switchClear.background.open(agentId),
    canClear: switchClearCommand(provider) !== null
  });
  return ok ? askedHandoffRequestText(switchClear.state(agentId)?.onWork, handoffPathFor(agentId)) : null;
}
/** One pass over the requests, then a word to the windows for each ask still
 *  waiting (a window that was reloading misses a send; each keeps one per agent). */
function runClearRequests(): void {
  if (!hive.enabled()) return;
  const dir = clearRequestsDir();
  if (!dir) return;
  let names: string[] = [];
  try { names = readdirSync(dir).filter((n) => n.endsWith('.json')); } catch { names = []; }
  if (names.length) {
    const reg = hive.registry();
    const live = new Set(ptyToAgent.values());
    for (const name of names) {
      const path = join(dir, name);
      let raw: unknown = null;
      let error: string | null = null;
      try {
        const st = statSync(path);
        // A file still being written is read on the next beat.
        if (Date.now() - st.mtimeMs < 1_000) continue;
        if (st.size > CLEAR_REQUEST_MAX_BYTES) error = 'The file is too large.';
        else raw = JSON.parse(readFileSync(path, 'utf8'));
      } catch { error = error ?? 'The file is not valid JSON.'; }
      const parsed = error ? { ok: false as const, error } : parseClearRequest(raw, name);
      let refusal: string | null = parsed.ok ? null : parsed.error;
      if (parsed.ok && reg.agents[parsed.agent]?.sleeping) refusal = 'agent is sleeping; its context is already released';
      if (parsed.ok && !refusal && localDemandAllowed(parsed.agent, reg.agents[parsed.agent], roster.read(), reg.godId) && !live.has(parsed.agent)) {
        wakeDemand(parsed.agent);
        continue;
      }
      if (parsed.ok && !refusal) {
        const a = reg.agents[parsed.agent];
        refusal = askedClear.refusal(parsed.agent, {
          isGod: parsed.agent === reg.godId || !!a?.isGod,
          known: isLive(a),
          live: live.has(parsed.agent),
          canClear: switchClearCommand(inferAgentProvider(undefined, a?.provider)) !== null
        });
      }
      const kept = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
      const body = refusal ? { ...kept, error: refusal } : { ...kept, acceptedAt: new Date().toISOString() };
      try {
        const to = join(dir, refusal ? '.failed' : '.done');
        mkdirSync(to, { recursive: true });
        writeFileSync(join(to, `${Date.now()}-${name}`), JSON.stringify(body, null, 2));
        unlinkSync(path);
      } catch { continue; }
      if (refusal || !parsed.ok) {
        try { hive.appendLog({ kind: 'clear-request-refused', agentId: parsed.ok ? parsed.agent : undefined, error: refusal }); } catch { /* best-effort */ }
        continue;
      }
      askedClear.ask(parsed.agent);
      try { hive.appendLog({ kind: 'clear-requested', agentId: parsed.agent, reason: parsed.reason }); } catch { /* best-effort */ }
    }
  }
  for (const agentId of askedClear.waiting()) {
    for (const wc of allLiveWebContents()) {
      try { wc.send('hive:codexSizeClear', { agentId, asked: true }); } catch { /* window gone */ }
    }
  }
}
// Any agent asks the app to compact an agent (shared/askedCompact.ts).
// It writes one JSON file into HIVE_ROOT/compact-requests/, read on the same
// beat as clear-requests/ and filed the same way. Each ask still waiting goes
// to the windows every beat until the engine's compact is typed.
const askedCompact = new AskedCompact();
/** HIVE_ROOT/compact-requests, or null with no hive. */
function compactRequestsDir(): string | null {
  const root = hive.root();
  return root ? join(root, COMPACT_REQUESTS_DIR) : null;
}
function runCompactRequests(): void {
  if (!hive.enabled()) return;
  const dir = compactRequestsDir();
  if (!dir) return;
  let names: string[] = [];
  try { names = readdirSync(dir).filter((n) => n.endsWith('.json')); } catch { names = []; }
  if (names.length) {
    const reg = hive.registry();
    const live = new Set(ptyToAgent.values());
    for (const name of names) {
      const path = join(dir, name);
      let raw: unknown = null;
      let error: string | null = null;
      try {
        const st = statSync(path);
        // A file still being written is read on the next beat.
        if (Date.now() - st.mtimeMs < 1_000) continue;
        if (st.size > CLEAR_REQUEST_MAX_BYTES) error = 'The file is too large.';
        else raw = JSON.parse(readFileSync(path, 'utf8'));
      } catch { error = error ?? 'The file is not valid JSON.'; }
      const parsed = error ? { ok: false as const, error } : parseClearRequest(raw, name);
      let refusal: string | null = parsed.ok ? null : parsed.error;
      if (parsed.ok && reg.agents[parsed.agent]?.sleeping) refusal = 'agent is sleeping; nothing to compact';
      if (parsed.ok && !refusal && localDemandAllowed(parsed.agent, reg.agents[parsed.agent], roster.read(), reg.godId) && !live.has(parsed.agent)) {
        wakeDemand(parsed.agent);
        continue;
      }
      if (parsed.ok && !refusal) {
        const a = reg.agents[parsed.agent];
        refusal = askedCompact.refusal(parsed.agent, {
          known: isLive(a),
          live: live.has(parsed.agent),
          canCompact: compactionCommandForProvider(inferAgentProvider(undefined, a?.provider)) !== null
        });
      }
      const kept = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
      const body = refusal ? { ...kept, error: refusal } : { ...kept, acceptedAt: new Date().toISOString() };
      try {
        const to = join(dir, refusal ? '.failed' : '.done');
        mkdirSync(to, { recursive: true });
        writeFileSync(join(to, `${Date.now()}-${name}`), JSON.stringify(body, null, 2));
        unlinkSync(path);
      } catch { continue; }
      if (refusal || !parsed.ok) {
        try { hive.appendLog({ kind: 'compact-request-refused', agentId: parsed.ok ? parsed.agent : undefined, error: refusal }); } catch { /* best-effort */ }
        continue;
      }
      askedCompact.ask(parsed.agent);
      try { hive.appendLog({ kind: 'compact-requested', agentId: parsed.agent, reason: parsed.reason }); } catch { /* best-effort */ }
    }
  }
  for (const agentId of askedCompact.waiting()) {
    for (const wc of allLiveWebContents()) {
      try { wc.send('hive:compactAsked', { agentId }); } catch { /* window gone */ }
    }
  }
}
// 0.5.6: what an agent knew before the app cleared it (shared/lastSession.ts).
// The transcript is named when the hand off request is typed; when the clear
// behind it is typed, its latest summary and its path go to last-session.md.
const clearHistory = new ClearHistory();
/** Agents whose last-session.md was written, or is being written, this run. */
const lastSessionSaved = new Set<string>();
/** The agent's last-session.md, absolute. */
function lastSessionPathFor(agentId: string): string {
  return lastSessionPathOf(hive.inboxPath(agentId));
}
/** The path for the first wake after a clear to name, when the file is there. */
function lastSessionKept(agentId: string): string | undefined {
  const path = lastSessionPathFor(agentId);
  return isAbsolute(path) && (lastSessionSaved.has(agentId) || existsSync(path)) ? path : undefined;
}
/** Write last-session.md (core/lastSessionSave.ts). Never throws. */
async function saveLastSession(agentId: string, save: PendingSave): Promise<void> {
  const target = lastSessionPathFor(agentId);
  if (!isAbsolute(target)) return;
  lastSessionSaved.add(agentId);
  try {
    const saved = await saveLastSessionAt(target, save);
    if (saved) hive.appendLog({ kind: 'last-session-saved', agentId, reason: saved.reason, summary: saved.summary });
  } catch (e) {
    console.error('[last-session]', e);
  }
}
/** A Codex agent whose own switch is on. Its engine is asked now, so an agent moved off Codex stops being
 *  copied (and its copy is removed) even though the switch for it is no longer drawn. */
function codexMemoryOn(agentId: string): boolean {
  if (!codexMemoryOnFor(readConfig().agentCodexMemoryOn, agentId)) return false;
  try { return hive.registry().agents[agentId]?.provider === 'codex'; } catch { return false; }
}
const memory = new MemoryManager(
  () => readConfig().harnessHome,
  () => { const c = readConfig(); return { enabled: c.semanticMemory !== false, model: c.embeddingModel ?? 'minilm' }; },
  // A private copy of Codex's database is opened (main/codexMemory.ts), never the file Codex writes.
  { on: codexMemoryOn, open: (path) => new Database(path, { fileMustExist: true }) }
);
// Enterprise Knowledge Graph — file-backed store + agent CLI (default OFF).
const knowledge = new KnowledgeManager();
/** Reads the reflect tunables from config each tick (defaults baked in here so a
 *  pre-existing config.json without the keys still gets sane values). */
function reflectSettings(): ReflectSettings {
  const c = readConfig();
  return {
    enabled: c.reflectEnabled !== false,
    intervalMs: c.reflectIntervalMs ?? 1_800_000,
    byteTriggerPct: c.reflectByteTriggerPct ?? 50,
    sectionTrigger: c.reflectSectionTrigger ?? 50,
    recentKeep: c.reflectRecentKeep ?? 12,
    minBytes: c.reflectMinBytes ?? 16_384
  };
}
// Bounds each agent's memory.md so it never grows unbounded. 0.5.6: plain file
// work, no model. The oldest text moves word for word to the raw archive
// (backup, read back, verify, atomic swap) and memory-archive.md indexes it.
const reflector = new MemoryReflector(
  () => readConfig().harnessHome,
  reflectSettings,
  (event) => { try { hive.appendLog(event); } catch { /* best-effort */ } }
);
// 0.5.6: keeps each agent's handoff.md to its newest 12 sections and 200,000
// bytes; older sections move word for word to the raw archive. No AI call.
const handoffJob = new HandoffJob(
  () => readConfig().harnessHome,
  (event) => { try { hive.appendLog(event); } catch { /* best-effort */ } }
);
// Durable harness state (SQLite, main process). Phase A: window bounds (kv) +
// net-new command history. Opened in whenReady, closed in the teardown blocks.
const persist = new PersistStore();
/** The PRIMARY window — the one running the hive/god orchestration and the sink
 *  for process-global timer events (missions, breaker, Slack ingestion). It is
 *  the most-recently-focused live window, so global events follow the user.
 *  Additional "floor" windows are tracked in `allWindows` below. */
let mainWindow: BrowserWindow | null = null;
/** Every open window (primary + floors). A registry, not a single handle, so
 *  multi-window lifecycle (focus tracking, quit fan-out) is correct. */
const allWindows = new Set<BrowserWindow>();
/** Is each window on screen (the floor pause, 0.5.5)? Kept per window from its
 *  own events, because document.hidden never turns true with
 *  backgroundThrottling false. See windowVisibility.ts. */
const windowVisibility = new WeakMap<BrowserWindow, WindowVisibility>();
/** Monotonic floor counter → a stable, unique session partition per floor so
 *  each floor's renderer state (localStorage: agents, queues, selection) is
 *  isolated from every other window's. */
let floorSeq = 0;
/**
 * MD_RESTORE_SLOW_MS, DEV BUILDS ONLY (0.5.2, card
 * v052-restore-loading-test-command): how many agent spawns this run has
 * made, so each one waits longer than the last and the boot restore can be
 * watched slowly on purpose. Counts every spawn, not only restores, because
 * the gate has no way to tell them apart and neither does a person watching
 * it. Dead in a packaged app, like MD_NO_GOD: `slowSpawnDelayMs` answers 0
 * there whatever the environment says.
 */
let restoreSlowSeq = 0;

/** When true, skip the quit interceptor (user already confirmed). */
let allowQuit = false;
/** Unsaved IDE files per window, told to us by the renderer as a COUNT, never
 *  the text (review finding 15). The quit warning used to fire only for live
 *  terminals, so Command Q with a dirty IDE and no agents simply quit, and the
 *  red button on macOS closed the window, unmounted the panel and dropped every
 *  unsaved edit without a word. */
const ideDirtyByWindow = new IdeDirtyLedger();
/** When a person last said "lose them", so one quit asks once: before-quit is
 *  followed by each window's own close, and both come through here. */
let ideLossAcceptedAt = 0;
ipcMain.on('ide:dirty', (evt, n: unknown) => {
  // The edits changed, so an earlier answer no longer covers them.
  if (ideDirtyByWindow.report(evt.sender.id, n)) ideLossAcceptedAt = 0;
});
/** True when it is fine to go on: nothing unsaved, or the person said so. */
function confirmLosingIdeEdits(win: BrowserWindow | null, unsaved: number): boolean {
  if (unsaved <= 0) return true;
  if (Date.now() - ideLossAcceptedAt < 10_000) return true;
  const text = ideQuitWarning(unsaved);
  const opts = { type: 'warning' as const, buttons: text.buttons, defaultId: 0, cancelId: 0, message: text.message, detail: text.detail };
  const choice = win && !win.isDestroyed() ? dialog.showMessageBoxSync(win, opts) : dialog.showMessageBoxSync(opts);
  if (choice !== 1) return false;
  ideLossAcceptedAt = Date.now();
  return true;
}

/** Agents spawned with `isolate: true` get a dedicated git worktree; this maps
 *  the agent/pty id → the worktree path so we can tear it down on kill. */
const worktreePaths = new Map<string, string>();
/** id → the original repo cwd the worktree was created from (needed to run
 *  `git worktree remove` from the parent tree, not the worktree itself). */
const worktreeOrigins = new Map<string, string>();
/** 0.5.6: temp id → the empty folder a clone was given because its source's
 *  folder is not a git repository (no worktree can be cut from it). Removed at
 *  teardown when it is still empty, kept when the temp left files in it. */
const plainCloneFolders = new Map<string, string>();

/** A live god-triggered ephemeral worker, tracked from spawn to teardown. */
interface WorkerRec {
  workerId: string;       // == the PTY id == hive agent id (`worker-<reqId>`)
  reqId: string;          // the spawn-request id
  name?: string;          // display name (for the worker tab)
  slack?: { channel: string; thread_ts: string };
  baseBranch: string;     // the branch its worktree was cut from (for ahead-of-base)
  spawnedAt: number;      // epoch ms
  releasing?: boolean;    // kill issued; awaiting teardownPty (skip re-processing)
  /** Per-worker TOTAL-token cap from the spawn-request (overrides the config
   *  default). 0/undefined = no per-request cap. P4 plumbing — unlimited today. */
  tokenCap?: number;
  /** The objective as dispatched, kept for the ledger row teardownPty writes. */
  job: string;
  model?: string;
  provider?: string;
  effort?: string;
  /** Why this worker is being torn down, set by the kill site right before it
   *  calls teardownPty. Unset means the PTY ended on its own (`exited`). */
  result?: WorkerResult;
  /** Who asked for this temp (0.5.6), taken from the folder its request was in
   *  and never from the file: ORCHESTRATOR_ASKER for the orchestrator's queue,
   *  where Slack and inbound requests also land, else the id of the agent whose
   *  own folder held it. Every report about the temp goes here. */
  from: string;
  /** The lasting agent this temp was cloned from, if any (0.5.6). */
  cloneOf?: string;
  /** The temp's own done summary, kept for the note to a clone's source. */
  summary?: string;
  /** The request it was started from (0.5.6), kept for a temp that ends by
   *  itself: an inbound one's message then goes on to the orchestrator. */
  request?: SpawnRequest;
}
/** `from` of a temp the orchestrator's queue started. The hive router reads
 *  this address as the orchestrator, whatever its real id is. */
const ORCHESTRATOR_ASKER = 'god';
/** Live ephemeral workers by id. Populated by the spawn-request watcher; consulted
 *  by teardownPty so a finished/crashed/reaped worker's worktree is PRESERVED (not
 *  force-removed) when it holds unintegrated work — god is the sole integrator. */
const liveWorkers = new Map<string, WorkerRec>();
/** 0.5.6: temps started for a person's message (`origin: 'inbound'` in the
 *  orchestrator's queue). Their `done` reaches god as a note (hive.ts
 *  setQuietDone). Kept after teardown: the done is often routed after it.
 *  0.5.7 (founder, 17 Oct 2026): a Slack temp (`origin: 'slack'`) is one too;
 *  its done woke god for an answer already posted in the thread. */
const inboundTemps = new Set<string>();
hive.setQuietDone((from) => inboundTemps.has(from));

/** 26 Oct 2026 (founder): a note an agent sends in a turn that began with a
 *  person's words is delivered as an inform (founderTurn.ts). The submit door
 *  notes what it types; the hook proof keeps the prompt each turn began with. */
const founderTurns = new FounderTurns();
hive.setTerminalUp((agentId) => !!ptyForAgent(agentId));
hive.setFounderTurn((agentId) => founderTurns.isFounderTurn(agentId, hookServer.proof.lastPrompt(agentId)));
/** 0.5.8: this computer's inbound webhooks as an agent's list reads them
 *  (shared/integrationList.ts), field by field: never the secret. Who takes
 *  an endpoint's messages is its own choice, else the webhook default. */
const webhookListNow = (): WebhookListInput[] => {
  const cfg = readConfig();
  return (cfg.webhookTriggers ?? []).map((t) => ({ id: t.id, name: t.name, enabled: t.enabled, source: t.source, to: t.to ?? cfg.webhookResponder, description: t.description }));
};
/** `md-models` (hire-defaults-058, core/engineModels.ts): the engines and their models on this computer. An engine
 *  is installed when its command resolves as a start's does; signed in is its own status command, run with the
 *  environment a start gets and no agent's own home, at most once in five minutes. */
const engineModels = createEngineModels({
  where: 'this computer',
  appVersion: app.getVersion(),
  remote: async () => (await loadModelCatalog(MODEL_CATALOG_CACHE())).catalog,
  command: (provider) => commandForExplicitProvider(provider, readConfig().defaultCommand),
  installed: (program) => ptyManager.commandPath(program) !== null,
  signedIn: (provider, program) => (hasSignInCheck(provider)
    ? checkSignedIn(provider, ptyManager.commandPath(program) ?? program, ptyManager.childEnv(), homedir())
    : Promise.resolve('unknown'))
});
const integrationBroker = new IntegrationBroker({
  getRecord: integrations.getRecord,
  // 0.5.8: GET /integrations names the webhooks that bring messages in.
  webhooks: webhookListNow,
  getSecret: (ref, baseUrl) => integrations.getSecret(ref, { kind: 'http', url: baseUrl }),
  // 0.5.6: md-secret.cjs. A key saved in Settings reaches a running agent.
  secrets: (workerId, route, body) => agentSecretsRequest(workerId, route, body),
  // 0.5.9 (limits-bar): md-limits. Each engine's usage limits as last read here; no engine is asked for it.
  limits: async () => limitsAnswer(await usageLimits.read(), 'this computer', (id) => hive.registry().agents[id]?.name),
  // 0.5.8 (hire-defaults-058): md-models. The engines, which are installed and signed in here, and their models.
  models: () => engineModels.read(),
  // 0.5.6: one line per call to an integration, for the Integrations Activity tab.
  log: (event) => { try { hive.appendLog({ ...event, agentId: ptyToAgent.get(event.agentId) ?? event.agentId }); } catch { /* hive not bootstrapped yet */ } }
});
/** Every running agent may reach every enabled integration. */
const brokerGrants = new BrokerGrants(integrationBroker, () => integrations.enabledIds());

/** BYOK backend model-providers whose API keys the non-Claude CLI engines
 *  (OpenCode/Crush/pi/qwen) read from standard env vars. Keys are stored
 *  WRITE-ONLY in the same encrypted secret broker as integrations, under
 *  `apikey:<backend>`, and materialized MAIN-ONLY at spawn (never over IPC). */
const BACKEND_KEY_ENV: Record<string, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  google: 'GEMINI_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  groq: 'GROQ_API_KEY'
};
const providerKeyRef = (backend: string): string => `apikey:${backend}`;

/** 0.5.6 (founder, 16 Oct 2026): an agent's `md-secret.cjs`, through the
 *  integration broker. The token's pty id maps to the agent, as for a share;
 *  the store is read at this moment, so a key saved after the agent started
 *  is there and a removed one is gone. Each read goes to log.jsonl as the
 *  agent, the name and the outcome; never the value (./agentSecrets.ts). */
function agentSecretsRequest(workerId: string, route: 'list' | 'read', body: unknown): { status: number; body: unknown } {
  return agentSecretsRoute(ptyToAgent.get(workerId) ?? workerId, route, body, {
    providers: Object.entries(BACKEND_KEY_ENV).map(([backend, envVar]) => ({ envVar, ref: providerKeyRef(backend) })),
    listRefs: () => integrations.listSecretRefs(),
    // A late copy of the agent's environment, so only a key sealed for that use opens: one
    // sealed for a connection's address is never handed to an agent (core/sealedSecrets.ts).
    getSecret: (ref) => integrations.getSecret(ref, { kind: 'env' }),
    log: (event) => hive.appendLog({ ...event })
  });
}

/** A worker worktree that teardown PRESERVED because it held unintegrated work.
 *  Tracked so the GC sweep can reclaim it (+ its scratch dir) once the work lands
 *  in base or the worktree is removed by hand — see gcPreservedWorktrees(). */
interface PreservedWorktree {
  workerId: string;
  wtPath: string;
  origCwd: string;        // the parent repo to run `git worktree remove` from
  baseBranch: string;     // re-checked against this for "integrated yet?"
  scratchDir: string | null; // HIVE_ROOT/agents/<workerId> — removed alongside the worktree
  slack?: { channel: string; thread_ts: string };
  preservedAt: number;    // epoch ms
  from: string;           // who asked for the temp: the reclaim report goes there (0.5.6)
}
/** Preserved worker worktrees awaiting integration, keyed by worktree path. The GC
 *  sweep drains this: an entry is removed (worktree + scratch GC'd) only when the
 *  work is provably integrated, or when the worktree is already gone from disk. */
const preservedWorktrees = new Map<string, PreservedWorktree>();
/** pty id to the branch a NORMAL agent's worktree was cut from (0.5.3). */
const worktreeBases = new Map<string, string>();

/**
 * Tear down everything tied to a PTY id: archive its hive agent, remove its
 * isolated git worktree, and drop the bookkeeping-map entries. Runs on BOTH an
 * explicit `pty:kill` AND a natural PTY exit (the child finished, crashed, or
 * was killed externally) — without this the agent stays "active" (broadcasts
 * keep mailing a dead inbox), the worktree orphans (plus a dangling `git
 * worktree` registration in the user's real repo), and the maps leak an entry
 * per dead PTY.
 *
 * Idempotent: guarded on map presence and the already-idempotent
 * `hive.setArchived`, so a double call is a harmless no-op. NOTE: an explicit
 * `ptyManager.kill()` does NOT reach here via onExit — kill() deletes the
 * session synchronously, so node-pty's later async exit callback fails the
 * session-identity guard and is swallowed. Every kill site must therefore call
 * teardownPty itself right after the kill (all of them do). Best-effort — every
 * step is wrapped so a teardown error can never crash the caller (an IPC
 * handler or node-pty's onExit).
 */
/** wtPath to the teardown still deciding its fate. A Restart pressed in that
 *  window used to respawn the agent into a folder `git worktree remove` then
 *  took from under it; spawnAgentCore waits on this first. */
const worktreeFinalizing = new Map<string, Promise<unknown>>();

// NO DEFAULT REASON, ON PURPOSE (shared/worktreeFate.ts has the history). A
// default of "a person ended it" is what let three callers that are not a
// person keep force removing uncommitted work after the fix that was meant to
// stop it. Leaving the reason out is a compile error.
function teardownPty(id: string, reason: TeardownReason): void {
  loginWatcher.forget(id); ptyOwners.delete(id); // I2 part 2: nothing to read from a dead pty
  // Ephemeral-worker flag, read BEFORE the cleanup below deletes the entry. All
  // worker deaths (done-release, idle/token reap, manual stop, crash) funnel
  // through here, so this is the one place their floor card gets archived
  // (workers card via the hive:agentSpawned broadcast in processSpawnRequest).
  // pty id == worker id == agent id for workers.
  const wasWorker = liveWorkers.has(id);
  // The Temps ledger row (workerHistory.ts), written HERE because this is the
  // one funnel every worker death passes, and written FIRST because step 1
  // below forgets the telemetry counter the token figure comes from. The kill
  // site stamped `result`; no stamp means the PTY ended on its own.
  const workerRec = liveWorkers.get(id);
  if (workerRec) recordWorkerTeardown(workerRec);
  // 0) Revoke this id's broker capability (if any) and remove its .broker file.
  //    Idempotent + harmless for a PTY with no grant; a dead agent's token can
  //    never reach an integration.
  try { brokerGrants.release(id); } catch { /* best-effort */ }
  // 1) Archive the agent — retained + flagged; only live-PTY agents are active.
  const agentId = ptyToAgent.get(id);
  if (agentId) {
    ptyToAgent.delete(id);
    // Only an ending of its own is kept for a reload; any other ending is a person's or a restart.
    if (reason !== 'exit') endedAgents.delete(agentId);
    // Its Codex daemon goes with it, unless the same agent comes
    // straight back (a restart reuses it) or another terminal still runs it.
    if (!RESPAWNING.includes(reason) && ![...ptyToAgent.values()].includes(agentId)) void codexDaemons.stop(agentId);
    // Drop watchdog state so a dead agent can't get nudged or leak its grace.
    try { workerWake.forget(agentId, id); } catch { /* best-effort */ }
    // A wake this terminal never finished a turn on files nothing (0.5.6).
    try { wakeFiling.forget(agentId); } catch { /* best-effort */ }
    // Its work, its session clock and its open sub agents go with it (0.5.6).
    try { switchClear.forget(agentId); } catch { /* best-effort */ }
    // And what is known of its Codex conversation file's size (0.5.6).
    try { codexSize.forget(agentId); } catch { /* best-effort */ }
    // And a clear the orchestrator asked for that has not gone in (0.5.6).
    try { askedClear.forget(agentId); } catch { /* best-effort */ }
    // And a compact an agent asked for that has not gone in.
    try { askedCompact.forget(agentId); } catch { /* best-effort */ }
    try { clearHistory.forget(agentId); } catch { /* best-effort */ }
    // Drop breaker state so a dead agent can't leak/zombie a tripped level.
    try { breaker.forget(agentId); } catch { /* best-effort */ }
    // A replacement using this id needs a new usage counter, not the dead PTY's.
    try { telemetry.forgetAgent(agentId); } catch { /* best-effort */ }
    engineUsage.delete(agentId);
    try { codexUsage.forget(agentId); } catch { /* best-effort */ }
    try { agyUsage.forget(agentId); } catch { /* best-effort */ }
    // And the live count guard: the next run of this id starts fresh (liveCount.ts).
    try { liveCount.forget(agentId); } catch { /* best-effort */ }
    // Same reason, for the ledger gate: a respawned agent's first sample
    // must be admitted rather than matched against the dead one's last row.
    try { ledgerGate.forget(agentId); } catch { /* best-effort */ }
    // W1 — kill this agent's proxy-bridge sidecar (qwen), if any, so a dead
    // PTY never leaves an orphan loopback listener. No-op for non-proxy agents.
    try { hive.stopProxyBridge(agentId); } catch (e) { console.error('[hive] stopProxyBridge failed:', e); }
    if (hive.enabled()) {
      // 0.5.8 (src/shared/agentLive.ts): only a PERSON archives. Their Stop,
      // Archive or a floor close, and a temp's end, set `archived`, which holds
      // the agent back at the next launch. Anything else (it exited, crashed,
      // the breaker stopped it, a restart or revive on the way) leaves it
      // `stopped`: skipped like an archived agent, and restored at the next
      // launch. The breaker's stop is held back from the automatic restore, so
      // a looping agent is not started again on its own.
      try {
        if (wasWorker || reason === 'worker' || PERSON_ENDS.includes(reason)) {
          hive.setArchived(agentId, true);
          hive.noteEndedOnItsOwn(agentId, null);
        } else if (reason === 'sleep') {
          hive.setSleeping(agentId, true);
        } else {
          hive.setStopped(agentId, true, reason === 'guardrail' ? 'guardrail' : undefined);
        }
      } catch (e) { console.error('[hive] archive or stop failed:', e); }
    }
  }
  // 2) Remove the isolated worktree, if any. Non-blocking; errors are logged.
  const wtPath = worktreePaths.get(id);
  if (wtPath) {
    const origCwd = worktreeOrigins.get(id) ?? wtPath;
    // A restart or a revive respawns under the SAME pty id with isolate off, so
    // nothing would ever track this folder again. Forgetting it here is what
    // made a kept folder unremovable: a person's later Stop found no path. Keep
    // the three entries and the folder stays this agent's.
    const respawning = RESPAWNING.includes(reason);
    if (!respawning) {
      worktreePaths.delete(id);
      worktreeOrigins.delete(id);
    }
    // Ephemeral workers get a SAFETY-GATED teardown: never auto-remove a worktree
    // that holds unintegrated work. This sits INSIDE teardownPty so it covers ALL
    // teardown routes — a worker that finished (controller kill), crashed, or was
    // idle-reaped all land here. Normal agents keep the immediate force-remove.
    const worker = liveWorkers.get(id);
    if (worker) {
      liveWorkers.delete(id);
      void finalizeWorkerWorktree(wtPath, origCwd, worker);
    } else {
      // 0.5.3: a normal agent's tree used to be force removed on EVERY route, a
      // crash included, which deleted whatever it had not committed. Since 0.5.5
      // no route removes a dirty tree: a person's Stop (founder's ruling, 29 Sep
      // 2026), Archive, a crash, the breaker and a floor sweep all ask git, and
      // keep the folder when it holds uncommitted work (shared/worktreeFate.ts,
      // main/agentWorktree.ts).
      const base = worktreeBases.get(id) ?? 'main';
      if (!respawning) worktreeBases.delete(id);
      const finalizing = finalizeAgentWorktree(wtPath, origCwd, base, reason)
        .then((out) => {
          if (out.fate === 'remove-failed') {
            console.error('[worktree] removeWorktree failed:', out.detail);
            if (out.refused) hive.appendLog({ kind: 'worktree-removal-refused', path: wtPath, error: out.detail });
            return;
          }
          if (out.fate !== 'kept' || respawning) return;
          console.warn(`[worktree] KEPT with uncommitted work inside (${reason}): ${wtPath} (${out.detail})`);
          informGod(
            `[agent worktree kept] ${agentId ?? id}`,
            `Agent ${agentId ?? id} ${reason === 'person' ? 'was stopped by a person' : reason === 'archive' ? 'was archived' : reason === 'guardrail' ? 'was stopped by the circuit breaker' : reason === 'sweep' ? 'was closed with the rest of the floor' : 'ended on its own (crashed, was killed from outside, or quit)'} with UNCOMMITTED work in its worktree, so the folder was NOT removed.\n`
            + `Worktree: ${wtPath}\nBranch: ${out.branch ?? '(unknown)'}\nState: ${out.detail}\n`
            + `Restarting the agent brings it back in that folder. To discard it instead: git -C "${origCwd}" worktree remove --force "${wtPath}"`
          );
        })
        .catch(e => console.error('[worktree] finalizeAgentWorktree threw (worktree left in place):', e))
        .finally(() => { if (worktreeFinalizing.get(wtPath) === finalizing) worktreeFinalizing.delete(wtPath); });
      worktreeFinalizing.set(wtPath, finalizing);
    }
  }
  // 0.5.6: a clone's own plain folder (its source's is not a git repository).
  // Empty: removed. Holding files: kept, and the one who should know is told.
  const plainDir = plainCloneFolders.get(id);
  if (plainDir && !RESPAWNING.includes(reason)) {
    plainCloneFolders.delete(id);
    const worker = liveWorkers.get(id);
    let left: string[] = [];
    try { left = readdirSync(plainDir); } catch { /* already gone */ }
    if (!left.length) {
      try { rmSync(plainDir, { recursive: true, force: true }); } catch (e) { console.error('[worker] clone folder not removed:', e); }
      if (worker) noteCloneSource(worker, 'It worked in an empty folder of its own, now removed.');
    } else if (worker) {
      const where = `It worked in a folder of its own, kept because it holds files: ${plainDir}. It is not a git repository; delete the folder when nothing in it is needed.`;
      if (worker.result === 'done') noteCloneSource(worker, where);
      else informTempAsker(worker.from, `[temp folder kept] ${id}`, where, worker.slack);
    }
  }
  // A worker whose isolation failed (non-repo cwd) has no worktree to gate above —
  // still clear its tracking entry so the controller stops watching a dead PTY.
  if (liveWorkers.has(id)) liveWorkers.delete(id);
  // Archive the dead worker's floor card (mirrors killAgent's voice-kill path;
  // the renderer's archiveAgent is a no-op if the card is already gone). NOT
  // done for regular agents: their kill flows already manage their own card.
  if (wasWorker) {
    try { liveWebContents()?.send('hive:agentArchived', { id }); } catch { /* window torn down */ }
  }
  syncKeepAwake();
}

/** One ledger row per worker teardown, then a poke so the Temps screen
 *  re-reads. Best-effort: the ledger must never fail the teardown. */
function recordWorkerTeardown(rec: WorkerRec): void {
  try {
    const cfg = readConfig();
    const defaultCap = typeof cfg.defaultWorkerTokenCap === 'number' && cfg.defaultWorkerTokenCap > 0 ? cfg.defaultWorkerTokenCap : 0;
    const effCap = (rec.tokenCap && rec.tokenCap > 0) ? rec.tokenCap : defaultCap;
    appendWorkerHistory({
      workerId: rec.workerId, reqId: rec.reqId, name: rec.name ?? rec.workerId, job: rec.job,
      firstPrompt: rec.job, finalResponse: rec.summary, model: rec.model, provider: rec.provider, effort: rec.effort,
      baseBranch: rec.baseBranch, hasSlack: !!rec.slack, spawnedAt: rec.spawnedAt,
      tokensUsed: workerTokensUsed(rec.workerId), tokenCap: effCap > 0 ? effCap : null,
      result: rec.result ?? 'exited'
    });
  } catch (e) { console.error('[worker] history append failed:', e); }
  notifyWorkerHistoryUpdated();
}
function notifyWorkerHistoryUpdated(): void {
  try { liveWebContents()?.send('workers:historyUpdated'); } catch { /* window gone */ }
}

/** Send an inform to the god agent (the human's proxy). The temp controller uses
 *  this to surface every terminal failure AND to carry the Slack {channel,thread_ts}
 *  so god can post a 'couldn't complete' reply, closing the Slack loop (the success
 *  path is the temp replying in the thread itself). The sender is "temps": the
 *  harness speaking for a temp, never the temp's own id. */
function informGod(subject: string, body: string, slack?: { channel: string; thread_ts: string }, act: 'inform' | 'note' = 'inform'): void {
  try {
    const slackLine = slack
      // The bundled-node launcher, spelled as an ABSOLUTE PATH — NOT bare `node`
      // (absent from the PATH of any machine whose node comes from nvm) and NOT
      // `$HIVE_NODE` (POSIX-only: cmd.exe/PowerShell expand it to nothing, so the
      // whole reply command was dead on Windows).
      ? `\n\n[SLACK] Close the loop — post a reply to channel ${slack.channel} thread ${slack.thread_ts} via:\n  "${hive.nodeCommand()}" "${slackReplyScriptPath()}" --channel ${slack.channel} --thread ${slack.thread_ts} --text "<your message>"\n  Add --file <path> to share a file or folder as a password protected link.`
      : '';
    hive.send({ to: 'god', act, subject, body: body + slackLine }, 'temps');
  } catch (e) {
    console.error('[worker] informGod failed:', e);
  }
}

/** A report about a temp goes to whoever asked for it (0.5.6): the orchestrator
 *  for its own queue, where Slack and inbound requests also land, else the
 *  agent whose folder the request was in. Same sender as informGod. */
function informTempAsker(from: string, subject: string, body: string, slack?: { channel: string; thread_ts: string }): void {
  if (from === ORCHESTRATOR_ASKER) { informGod(subject, body, slack); return; }
  try {
    const slackLine = slack
      ? `\n\n[SLACK] This temp was answering channel ${slack.channel} thread ${slack.thread_ts}. To reply there:\n  "${hive.nodeCommand()}" "${slackReplyScriptPath()}" --channel ${slack.channel} --thread ${slack.thread_ts} --text "<your message>"\n  Add --file <path> to share a file or folder as a password protected link.`
      : '';
    hive.send({ to: from, act: 'inform', subject, body: body + slackLine }, 'temps');
  } catch (e) {
    console.error('[worker] informTempAsker failed:', e);
  }
}

/** A clone that finished tells its source what it did and where the work is
 *  (0.5.6). An inform since 26 Oct 2026 (founder): the source is waiting on the
 *  clone's result, so it wakes at once. Only for a temp that reported done; a
 *  reaped one has no summary to pass on. */
function noteCloneSource(worker: WorkerRec, where: string): void {
  if (!worker.cloneOf || worker.result !== 'done') return;
  try {
    const asker = worker.from === ORCHESTRATOR_ASKER ? 'the orchestrator' : worker.from;
    hive.send({
      to: worker.cloneOf, act: 'inform',
      subject: `A temp cloned from you is done: ${worker.workerId}`,
      body: `The temp ${worker.workerId} was cloned from you for a job ${asker} gave it, and it reported done.\n\n`
        + `Its summary: ${worker.summary?.trim() || '(none given)'}\n\n${where}`
    }, 'temps');
  } catch (e) {
    console.error('[worker] noteCloneSource failed:', e);
  }
}

/** Teardown of a temp's worktree. Since 0.5.6 the folder goes by default
 *  (founder, 10 Oct 2026: "worktree destruction must happen by default"): what
 *  the temp left uncommitted is committed to its branch, the folder is removed,
 *  and the branch is kept when it holds commits its base lacks and deleted when
 *  it holds none (git.ts finalizeTempWorktree). The folder is kept, and flagged
 *  as before, only when the commit or the removal fails. Whoever asked for the
 *  temp hears which. A lasting agent's folder never comes here: it keeps the
 *  29 September rule (agentWorktree.ts). Async + best-effort; a throw leaves
 *  the worktree in place. */
async function finalizeWorkerWorktree(wtPath: string, origCwd: string, worker: WorkerRec): Promise<void> {
  try {
    const deps = await unlinkWorktreeDeps(origCwd, wtPath);
    if (!deps.ok) console.error('[worktree] dependency unlink failed:', deps.error);
    const work = await worktreeHasUnintegratedWork(wtPath, worker.baseBranch);
    // A link left in place would be committed as a file, and git refuses to
    // remove the folder around it, so nothing is tried then.
    const fate = deps.ok
      ? await finalizeTempWorktree(origCwd, wtPath, worker.baseBranch, worker.workerId, work)
      : { removed: false as const, why: `its dependency link could not be removed: ${deps.error}` };
    if (!fate.removed) {
      const refused = 'refused' in fate && fate.refused === true;
      console.warn(`[worker] PRESERVING worktree ${refused ? '(removal refused)' : 'with unintegrated work'}: ${wtPath} (${work.detail}; ${fate.why})`);
      // Track it so the GC sweep can reclaim it (+ scratch dir) once integrated —
      // the worker is gone from liveWorkers by now, so its identity lives here.
      // A path refused before is asked again: this is a new preserve.
      gcRefusedWorktrees.delete(wtPath);
      preservedWorktrees.set(wtPath, {
        workerId: worker.workerId, wtPath, origCwd, baseBranch: worker.baseBranch,
        scratchDir: workerScratchDir(worker.workerId), slack: worker.slack, preservedAt: Date.now(), from: worker.from
      });
      try { setWorkerHistoryWorktree(worker.workerId, 'preserved'); notifyWorkerHistoryUpdated(); } catch { /* ledger is best-effort */ }
      // A refused removal is not unintegrated work, and the plain
      // removal command is what the refusal exists to stop: neither is offered.
      informTempAsker(
        worker.from,
        `[worker worktree preserved] ${worker.workerId}`,
        refused
          ? `Ephemeral worker ${worker.workerId} ended and its worktree was kept because the removal was refused: ${fate.why}\n`
            + `Worktree: ${wtPath}\nBranch: ${work.branch}\nState: ${work.detail}\n`
            + 'No file or folder in it was deleted. Look at the folder before anything else removes it; the Worktrees screen lists it.'
          : `Ephemeral worker ${worker.workerId} ended but its worktree holds unintegrated work, so it was NOT auto-removed (you are the sole integrator).\n`
            + `Worktree: ${wtPath}\nBranch: ${work.branch}\nState: ${work.detail}\nWhy it was kept: ${fate.why}\n`
            + `Review/merge it — it will be auto-reclaimed once its work lands in ${worker.baseBranch}, or remove it now with: git -C "${origCwd}" worktree remove "${wtPath}"`,
        worker.slack
      );
      noteCloneSource(worker, `Its folder was kept, on branch ${work.branch}: ${wtPath}`);
      return;
    }
    try { setWorkerHistoryWorktree(worker.workerId, 'removed'); notifyWorkerHistoryUpdated(); } catch { /* ledger is best-effort */ }
    // The branch outlives the folder when it holds work: whoever asked merges it.
    // No Slack thread here: this is not a failure the thread is waiting on.
    const kept = fate.branch !== null && !fate.branchDeleted && fate.ahead !== 0;
    const count = fate.ahead === null ? 'commits git could not count' : `${fate.ahead} commit${fate.ahead === 1 ? '' : 's'}`;
    // A temp that ended on another branch may have left commits on the one the
    // app made for it as well (git.ts `made`): that branch is named too. When
    // it alone holds commits it is `fate.branch`, so "no commits" is never said
    // over it.
    const made = fate.made
      ? ` The branch the app made for it, ${fate.made.branch}, holds ${fate.made.ahead === null ? 'commits git could not count' : `${fate.made.ahead} commit${fate.made.ahead === 1 ? '' : 's'}`} that ${worker.baseBranch} does not have too.`
      : '';
    if (kept) {
      informTempAsker(
        worker.from,
        `[temp branch kept] ${worker.workerId}`,
        `The temp ${worker.workerId} ended and its folder was removed. Its branch ${fate.branch} holds ${count} that ${worker.baseBranch} does not have`
        + `${fate.committed ? ', the last one being the files it left uncommitted' : ''}.${made}\n`
        + `The branch is in the repo at ${origCwd}. Merge it where the work belongs. To drop it instead: git -C "${origCwd}" branch -D ${fate.branch}`
      );
    }
    noteCloneSource(worker, kept
      ? `Its work is on branch ${fate.branch}: ${count} that ${worker.baseBranch} does not have. Its folder was removed.` + made
      : 'It left no commits. Its folder was removed.');
    // Worktree is gone (clean/integrated at teardown), but DEFER its scratch-dir
    // cleanup to the throttled GC sweep rather than deleting it synchronously here:
    // HIVE_ROOT/agents/<id> holds the worker's memory.md and the MemPalace miner
    // ingests it asynchronously, so an immediate delete can beat the miner and
    // permanently lose the worker's durable notes from the shared palace. Register
    // it (its worktree path is now absent) so the sweep's path-gone branch reclaims
    // the scratch after a window — same throttled path the preserved case uses.
    gcRefusedWorktrees.delete(wtPath);
    preservedWorktrees.set(wtPath, {
      workerId: worker.workerId, wtPath, origCwd, baseBranch: worker.baseBranch,
      scratchDir: workerScratchDir(worker.workerId), slack: worker.slack, preservedAt: Date.now(), from: worker.from
    });
  } catch (e) {
    console.error('[worker] finalizeWorkerWorktree threw (worktree left in place):', e);
  }
}

/** The hive scratch dir for a worker (its inbox/outbox/memory): HIVE_ROOT/agents/<id>.
 *  Null when there's no hive root. */
function workerScratchDir(workerId: string): string | null {
  const root = hive.root();
  return root ? join(root, 'agents', workerId) : null;
}

/** Best-effort removal of a worker's scratch (hive agent) dir. Guarded to ONLY ever
 *  delete a path that resolves to exactly HIVE_ROOT/agents/<workerId> and never a
 *  still-live worker — so a crafted/mismatched id can't escape the agents root. */
function removeWorkerScratch(workerId: string): void {
  if (liveWorkers.has(workerId)) return; // never wipe a live worker's mailbox
  const dir = workerScratchDir(workerId);
  const root = hive.root();
  if (!dir || !root) return;
  const agentsRoot = join(root, 'agents');
  // Path-safety: the resolved dir must sit directly under agents/ with basename == id.
  if (resolve(dir) !== join(resolve(agentsRoot), basename(dir)) || basename(dir) !== workerId) return;
  try { rmSync(dir, { recursive: true, force: true }); }
  catch (e) { console.error('[worker] removeWorkerScratch failed:', e); }
}

/** A temp whose engine ended by itself before it reported done (0.5.6): not
 *  signed in, a bad flag, a crash. Nobody chose that, so nobody was told. Its
 *  Slack card is closed as blocked with the reason, and an inbound message goes
 *  on to the orchestrator with its text, as when the temp could not start; any
 *  other temp's asker is told instead. Once per temp: only the exit handler
 *  calls this, before teardown drops the record, and a reap or a person's stop
 *  ends the terminal first and never reaches that handler (`releasing` covers a
 *  kill that lost that race). A temp that sent its done and then exited did
 *  finish, and is not reported. */
function reportTempEndedByItself(rec: WorkerRec, exitCode: number | undefined, signal: number | undefined): void {
  if (rec.releasing || workerSignaledDone(rec.workerId, rec.spawnedAt) !== null) return;
  const how = typeof signal === 'number' && signal !== 0 ? `signal ${signal}` : `exit code ${exitCode ?? 'unknown'}`;
  const handed = rec.from === ORCHESTRATOR_ASKER && !!rec.request
    && sendInboundFallback(rec.request, `the temp ended by itself before it reported done (${how})`);
  if (!handed) {
    informTempAsker(
      rec.from,
      `[temp ended by itself] ${rec.workerId}`,
      `The temp ${rec.workerId} ended by itself before it reported done (${how}): its engine quit or crashed, or it was not signed in. Its job may not be finished. Anything it left is kept, and a message after this one says where.`,
      rec.slack
    );
  }
  try { onTempFinished(rec.workerId, { ok: false, reason: `its engine ended by itself before it reported done (${how})` }, { hive }); } catch { /* card only */ }
}

// A natural PTY exit must run the same teardown as an explicit kill — EXCEPT when
// the PTY was the missing-CLI installer: a clean exit there means the engine CLI was
// just installed, so auto restart-and-continue by re-running the SAME spawn into the
// SAME pty/window (no user click). Provider-agnostic. Idempotent by construction: the
// relaunch carries `noAutoInstall`, so the installer can never fire (let alone loop) a
// second time — a binary that's somehow still missing just spawns and exits normally.
ptyManager.setExitHandler((id, exitCode, info) => {
  // Record an ABNORMAL death before teardown — teardownPty drops the
  // pty->agent mapping, so after it runs we can no longer say WHOSE process
  // died. Only abnormal exits are recorded (recordAgentExit returns early on a
  // clean one), so this adds no noise to a normal archive.
  try {
    const dyingAgent = ptyToAgent.get(id);
    if (dyingAgent) {
      hive.recordAgentExit(dyingAgent, {
        exitCode,
        signal: info?.signal,
        tail: info?.tail,
        command: info?.command
      });
    }
  } catch (e) { console.error('[pty] recordAgentExit failed:', e); }

  // Batch 2: the login step's own process ended. Exit 0 means the sign in
  // finished and Start may be pressed; anything else offers Sign in again.
  // Not an agent, so nothing below (archive, teardown, run ended) applies.
  const inSetup = pendingCliSetup.get(id);
  // Batch 4: the manual terminal's shell ended (the person typed exit). The
  // panel stays: they may still press Start, which is what they came for.
  if (inSetup && inSetup.state.phase === 'manual') return;
  if (inSetup && inSetup.state.phase === 'signin' && inSetup.state.login === 'running') {
    inSetup.state = { ...inSetup.state, login: exitCode === 0 ? 'done' : 'failed' };
    sendCliSetup(id, inSetup.owner, inSetup.state);
    loginWatcher.forget(id);
    // The sign in modal must not outlive the login it came from: its link is
    // dead once the process is gone.
    closeLoginModal(id, inSetup.owner, exitCode === 0 ? 'success' : 'failure');
    return;
  }
  const pending = pendingInstallRelaunch.get(id);
  if (pending) {
    void (async (): Promise<void> => {
      // Activation funnel: did the auto-installer actually complete? A non-zero exit
      // is the Linux-installer-cannot-finish-unattended signal that used to be silent.
      const provider = pending.opts.provider ?? inferAgentProvider(pending.opts.command, undefined);
      // A zero exit is only half the proof: the binary must now resolve too (an
      // install into a prefix that is not on PATH, or a Windows installer whose
      // script cannot carry its exit code, both end at 0 with no CLI).
      // A native installer (kimi, grok) puts its binary in its own folder and
      // adds that to the rc files, which the PATH read at app start never saw:
      // look again from scratch before deciding (batch 4).
      // The fresh look is a login shell in the background (0.5.5, Plan G): wait
      // for its PATH here, so the check below sees what the installer added.
      if (exitCode === 0) { ptyManager.forgetLookups(); await launchEnvReady(); }
      // The person may have pressed Stop or Restart, or gone to manual setup,
      // during that wait. Each of those disarms the install: nothing starts.
      if (!installEndStillWanted({
        armed: pending,
        armedNow: pendingInstallRelaunch.get(id),
        guided: !!pending.opts.guidedSetup,
        setupPhase: pendingCliSetup.get(id)?.state.phase
      })) return;
      // Consumed here, so it can never loop installs.
      pendingInstallRelaunch.delete(id);
      if (exitCode === 0 && ptyManager.isCommandAvailable(pending.bin)) {
        analytics.track('agent_install_finished', { provider, rung: pending.rung, outcome: 'agent_launched' });
        pendingCliMissing.delete(id); // the card's job is done (I2)
        if (!pending.opts.guidedSetup) {
          // Nobody pressed Install (a god dispatched worker, a voice hire), so
          // nobody is there to sign in or press start: re-arm the grid and start
          // the agent at once, as before batch 2.
          const wc = (pending.owner && !pending.owner.isDestroyed()) ? pending.owner : liveWebContents();
          try { wc?.send(`pty:relaunch:${id}`); } catch { /* window gone */ }
          void spawnAgentCore({ ...pending.opts, noAutoInstall: true }, pending.owner);
          return;
        }
        // Batch 2 (founder, 24 Sep 2026): no automatic start. The install output
        // stays on the grid, the provider's own login runs under it in this same
        // terminal, and the agent starts only when the person presses "Setup
        // complete, start agent". The old relaunch cleared the installer's output
        // the moment it ended, and a CLI that was not signed in then failed or,
        // in Copilot's silent print mode, showed nothing at all.
        const state: CliSetupState = { phase: 'signin', provider, label: installInfoForProvider(provider).label, loginCommand: loginCommandLine(pending.bin, provider) };
        pendingCliSetup.set(id, { opts: pending.opts, owner: pending.owner, state });
        sendCliSetup(id, pending.owner, state);
        runLoginStep(id);
        return; // an install PTY has no agent/worktree to tear down
      }
      // Non-zero exit = install failed. The installer's own last lines stay on the
      // grid, and the card comes back over them with Try again (I2): the spawn is
      // kept so the button re-runs the same install, nothing is typed by hand.
      analytics.track('agent_install_finished', { provider, rung: pending.rung, outcome: 'install_failed' });
      endCliSetup(id);
      sendCliSetup(id, pending.owner, null);
      const paused = pendingCliMissing.get(id);
      if (paused) {
        paused.state = { ...paused.state, failed: { exitCode: exitCode || 1, tail: installerTail(info?.tail) } };
        sendCliMissing(id, pending.owner, paused.state);
      }
      return;
    })().catch((e) => console.error('[pty] install end failed:', e));
    return;
  }
  /* `agent_run_ended` (0.5.1, Ryan's spec). Read BEFORE teardownPty drops the
     pty->agent mapping, and only for an agent PTY: an installer PTY (above)
     never maps to an agent, so an install exit is agent_install_finished and
     not a run. From `info`, ONLY `signal` and `startedAt` are read. `tail` is
     raw terminal output, `command` a command line and `cwd` a path, and none
     of them may reach telemetry (TELEMETRY.md); the duration is a coarse
     bucket, never raw ms. `provider` is the registry's, the same value
     agent_spawned carried. */
  // 0.5.3 feature 18: tell the floor. Until now a death reached the renderer only
  // as a per terminal `pty:exit:<id>` event, which nothing hears unless that
  // agent's terminal has been opened, so a worker nobody was looking at died in
  // silence. AFTER the installer branch above (a relaunch is not a death) and
  // BEFORE teardownPty drops the pty to agent mapping. A deliberate kill never
  // reaches this handler, so everything sent here ended on its own.
  // Batch 2: was this an installed CLI that could not sign in? Read before the
  // teardown (which drops the mapping). Only for a person's agent: a god
  // dispatched worker has nobody to press Sign in, and the orchestrator has
  // its own restart. Nothing is restarted here; the panel waits for a person.
  const run = agentRuns.get(id);
  agentRuns.delete(id);
  let signInOffer: { line: string | null } | null = null;
  if (run && ptyToAgent.has(id) && !run.opts.hive?.isGod && !liveWorkers.has(id)) {
    const o = offerSignInAfterExit({ provider: run.provider, exitCode: exitCode ?? 0, signal: info?.signal, ranMs: Date.now() - run.startedAt, tail: info?.tail ?? '' });
    if (o.offer) signInOffer = { line: o.line };
  }
  // This run attached a resume and exited with a code within the
  // launch window, or on the CLI's own refusal line however long a popup held it
  // open (0.5.8 blocker, 8 Nov 2026), so it never resumed anything. Start the
  // SAME agent again with no resume rather than leave it dead or count it toward
  // the crash loop hold. Every engine (founder 12 Nov 2026: an OpenCode
  // agent looped on "Invalid session ID" at every Restart). Cannot loop: the
  // fresh spawn carries `resume: false` and an argv with no resume in it, and
  // the refused id is never offered to a restart again. A temp is left to its
  // own report: it never resumes, and its asker is told it ended.
  // Before the sign in panel, which any non zero exit in the first
  // minute is offered and a refused resume always is (RC2, the founder's Angela:
  // "Invalid session ID", exit 1 after 20 s and 12 s, left on the panel). The
  // panel stays first only for a named sign in failure (freshOrSignIn).
  const resumeFailed = !!run && ptyToAgent.has(id) && !liveWorkers.has(id)
    && freshAfterFailedResume({ resumed: run.resumed === true, exitCode, ranMs: Date.now() - run.startedAt, tail: info?.tail });
  const freshResume = freshOrSignIn({ resumeFailed, signIn: signInOffer, tail: info?.tail }) === 'fresh';
  if (freshResume) signInOffer = null;
  try {
    const goneAgent = ptyToAgent.get(id);
    // printMode: a clean exit of a print mode run is "Finished its task".
    // A refused resume is not a death: the same agent starts again below, and
    // the floor is told that instead (`hive:agentStartedFresh`), never Crashed.
    if (goneAgent && !freshResume) {
      // A temp is torn down for good; only a person's agent waits on the floor for Restart.
      if (!liveWorkers.has(id)) endedAgents.set(goneAgent, { exitCode, signal: info?.signal, ...(run?.printMode ? { printMode: true } : {}), at: Date.now() });
      liveWebContents()?.send('hive:agentExited', { agentId: goneAgent, exitCode, signal: info?.signal, ...(run?.printMode ? { printMode: true } : {}) });
    }
  } catch { /* window torn down */ }
  // 0.5.6: a temp that ended by itself tells whoever is waiting on it. Before
  // the teardown, which drops its record; a throw here must not cost that.
  try {
    const endedTemp = liveWorkers.get(id);
    if (endedTemp) reportTempEndedByItself(endedTemp, exitCode, info?.signal);
  } catch (e) { console.error('[worker] report of a temp that ended by itself failed:', e); }
  // The ONE caller where nobody chose this: the process ended on its own. A
  // run offered the sign in panel is about to start again in the same folder,
  // so its worktree is kept and still tracked, as for a revive.
  // Read before the teardown, which forgets both.
  const endedOnItsOwn = liveWorkers.has(id) ? undefined : ptyToAgent.get(id);
  if (signInOffer || freshResume) teardownPty(id, 'revive');
  else teardownPty(id, 'exit');
  // 0.5.8: a run that ended on its own soon after starting counts toward the
  // crash loop guard (src/shared/agentLive.ts). Not for a temp or a revive.
  if (!signInOffer && !freshResume && endedOnItsOwn && run && hive.enabled()) {
    try { hive.noteEndedOnItsOwn(endedOnItsOwn, Date.now() - run.startedAt); } catch (e) { console.error('[hive] quick exit count failed:', e); }
  }
  if (freshResume && run) {
    const refusal = resumeRefusal(info?.tail);
    console.warn(`[resume] ${id}: the ${run.provider} resume was refused (code ${exitCode ?? 'unknown'}${refusal ? `, ${refusal}` : ''}); starting a fresh session in the same folder`);
    const agentId = run.opts.hive?.id;
    if (agentId && run.resumedSession) {
      try { hive.refuseSession(agentId, run.resumedSession); } catch (e) { console.error('[resume] could not mark the refused session:', e); }
    }
    const wc = (run.owner && !run.owner.isDestroyed()) ? run.owner : liveWebContents();
    // The terminal clears the refusal and says, in one quiet line, that it started fresh.
    try { wc?.send(`pty:relaunch:${id}`, { startedFresh: true }); } catch { /* window gone */ }
    if (agentId) { try { liveWebContents()?.send('hive:agentStartedFresh', { agentId }); } catch { /* window gone */ } }
    void spawnAgentCore({ ...run.opts, args: withoutResume(run.opts.args ?? [], providerPreset(run.provider)), resume: false, requireResume: false, resumeSessionId: undefined }, run.owner)
      .catch((e) => console.error('[resume] the fresh start after a refused resume failed:', e));
  }
  if (signInOffer && run) {
    const bin = run.opts.command.trim().split(/\s+/)[0] || run.opts.command;
    const state: CliSetupState = {
      phase: 'signin', provider: run.provider, label: installInfoForProvider(run.provider).label,
      loginCommand: loginCommandLine(bin, run.provider), cause: 'exit',
      ...(signInOffer.line ? { authLine: signInOffer.line } : {})
    };
    pendingCliSetup.set(id, { opts: run.opts, owner: run.owner, state });
    sendCliSetup(id, run.owner, state);
  }
});

/** Keep the system from suspending the harness while agents are running.
 *  Windows Modern Standby suspends desktop apps (and their child `claude`
 *  processes!) shortly after the display sleeps/locks — the whole hive froze
 *  mid-turn until unlock. `prevent-app-suspension` blocks exactly that while
 *  still letting the display turn off and the session lock. Held only while at
 *  least one PTY is alive, so an idle harness doesn't pin a laptop awake.
 *
 *  Opt-in `config.strongKeepalive` escalates to `prevent-display-sleep`, which on
 *  macOS ALSO blocks true system sleep (lid-close/idle) so timers & PTYs keep
 *  firing on time while away — at a battery cost. The default ('prevent-app-
 *  suspension') still lets the Mac truly sleep; we survive that and catch up once
 *  on resume (see onSystemResume). Re-evaluated on every call so toggling the
 *  flag while agents run swaps the blocker mode live. */
type KeepAwakeMode = 'prevent-app-suspension' | 'prevent-display-sleep';
let keepAwakeId: number | null = null;
let keepAwakeMode: KeepAwakeMode | null = null;
function syncKeepAwake(): void {
  const live = ptyManager.list().length > 0;
  const desired: KeepAwakeMode | null = live
    ? (readConfig().strongKeepalive ? 'prevent-display-sleep' : 'prevent-app-suspension')
    : null;
  if (desired === keepAwakeMode) return; // no change — avoid stop/start churn + log spam
  // Tear down the current blocker (mode change, or going idle with no agents).
  if (keepAwakeId !== null) {
    try { if (powerSaveBlocker.isStarted(keepAwakeId)) powerSaveBlocker.stop(keepAwakeId); } catch { /* noop */ }
    keepAwakeId = null;
  }
  keepAwakeMode = desired;
  if (desired) {
    keepAwakeId = powerSaveBlocker.start(desired);
    console.log(`[power] keep-awake ON (${desired}) — agents running`);
  } else {
    console.log('[power] keep-awake off — no agents');
  }
}

/** The mission scheduler itself lives in automationArming.ts, so a test can run
 *  it without Electron (automations arm on save). What stays here is
 *  what one fire does, because that part talks to the hive and the renderer. */
const missionScheduler = createMissionScheduler({
  readMissions: () => readConfig().missions ?? [],
  fire: fireMission,
  armHeartbeat
});

/** Active scheduler timers keyed by mission id. The heartbeat registers into the
 *  same map, so clearMissionTimers() tears it down with the rest. */
const missionTimers = missionScheduler.timers;

/** Clear and forget every armed mission timer (both the setTimeout and the
 *  setInterval handle). Safe to call from syncMissions and from shutdown
 *  teardown so a tick never fires into half-torn-down services. */
function clearMissionTimers(): void {
  missionScheduler.clear();
}

/** Rebuild the scheduler from persisted config: clear every existing timer,
 *  then arm each enabled mission honoring its lastFiredAt — a setTimeout for the
 *  time remaining until its next due fire, which then settles into a steady
 *  interval. Called on boot (after the router starts) and on power resume; the
 *  arming watch below calls it whenever what is saved stops matching what is
 *  armed, whichever door saved it. */
function syncMissions(): void {
  missionScheduler.sync();
}

/** A mission whose `to` is a temp (0.5.6): queue a new temp for this fire.
 *  False when `to` is an agent, or when the temp could not be queued. The id
 *  opens with the time of the fire, so every fire is a temp of its own. */
function queueMissionTemp(m: ScheduledMission): boolean {
  const receiver = resolveReceiver(m.to, [], cloneableAgentIds(), 'god');
  if (receiver.kind !== 'temp') return false;
  try {
    queueTempFor({ source: 'mission', id: `${Date.now().toString(36)}-${m.id}`, title: m.label, message: m.body, cloneOf: receiver.cloneOf });
    return true;
  } catch (e) {
    console.error('[scheduler] could not queue a temp for mission', m.id, e instanceof Error ? e.message : e);
    return false;
  }
}

/** One due mission: dispatch it to its target agent and stamp lastFiredAt back
 *  into config. The stamp does not re-arm anything: the arming key leaves
 *  lastFiredAt out. */
function fireMission(m: ScheduledMission): void {
  try {
    // A 'compact' maintenance mission (maint-1) is compaction-ONLY: it carries
    // no dispatch body/target, so skip the hive.send and just fire auto-compact.
    // Gate on `kind!=='compact'` ALONE — that already excludes the compact mission;
    // we deliberately do NOT add `&& m.body`, so other (dispatch) missions keep
    // their prior behaviour, including the historical empty-body send (Pam N1).
    if (m.kind !== 'compact' && hive.enabled()) {
      // 0.5.6: `to` may be a temp (`temp`, or `temp:<agent id>` for a clone).
      // Then each fire is a new temp's job, with the label and the body an
      // agent would have been sent. When the temp cannot be queued the
      // orchestrator takes it: a temp value is not an agent's id.
      if (!queueMissionTemp(m)) {
        hive.send({ to: isTempReceiver(m.to) ? 'god' : m.to, act: 'request', subject: m.label, body: m.body }, 'scheduler');
      }
    }
    // Auto-compact: do NOT jam /compact into busy terminals. Hand it to the
    // renderer, which queues a /compact per agent (deduped — never two at
    // once) and delivers it only when that agent goes idle (its drain loop),
    // so a working agent compacts between steps, never mid-step.
    //
    // The CADENCE now belongs to the context trigger, not to a mission — but
    // the legacy per-mission `autoCompact` flag keeps working, routed through
    // the same emit so there is exactly ONE path from main to the renderer.
    // It carries the context trigger's current rule so a mission-driven
    // compaction obeys the same pressure thresholds as a trigger-driven one.
    if (m.autoCompact || m.kind === 'compact') {
      emitContextTrigger('compact', contextRule('compact'));
    }
    const current = readConfig().missions ?? [];
    const next = current.map((x) =>
      x.id === m.id ? { ...x, lastFiredAt: Date.now() } : x
    );
    writeConfig({ missions: next });
    // Let the SCHEDULES panel refresh its "last fired" without a reload (#2.3).
    try { liveWebContents()?.send('missions:updated'); } catch { /* window gone */ }
  } catch (e) {
    console.error('[scheduler] mission', m.id, e);
  }
}

/** Keeps the scheduler and the webhook server in line with what is saved, from
 *  every door: the screens, the voice actions, an agent's mission request
 *  (connectionRequests.ts) and a hand edit of config.json (see
 *  automationArming.ts). Started once the hive is up, stopped before any
 *  teardown clears the timers, so a write during quit or reset arms nothing. */
let automationArming: ArmingWatch | null = null;

function startAutomationArming(): void {
  automationArming?.stop();
  automationArming = startArmingWatch({
    readConfig,
    configStamp: configFileStamp,
    missions: missionScheduler,
    reconcileWebhooks: reconcileWebhookServer,
    onMissionsRearmed: () => { try { liveWebContents()?.send('missions:updated'); } catch { /* window gone */ } },
    subscribe: (listener) => onConfigWritten(() => listener())
  });
}

function stopAutomationArming(): void {
  automationArming?.stop();
  automationArming = null;
}

// ─── Context trigger (auto-compact / auto-clear own their own timers) ────────
// Compaction used to ride on a mission (`compact-maintenance`), which meant the
// operator had TWO competing controls for one behaviour — a schedule with an
// interval and a trigger with a cadence. The mission is retired (see the
// retirement migration in ensureDefaultMissions); these timers are the single
// remaining source of scheduled context maintenance.
//
// Main owns only the CADENCE. The pressure gate (`minContextPct`) needs each
// agent's live context usage, which only the renderer has, so the whole rule
// rides along in the event and the renderer decides which agents actually get
// the command. That split is why the payload carries the rule rather than a bare
// "go" signal.
//
// 0.5.6: for compact this timer is the fallback. An agent that reports a token
// count is compacted by the renderer when its turn ends at or over its bar in
// tokens (shared/contextBar.ts), and the renderer skips it on this event. The
// timer still reaches an agent whose engine reports no count.

/** The last run times of the two halves live in the durable kv store (a
 *  rule has no time of its own). The clock itself is src/core/contextTriggerTimer.ts. */
const CONTEXT_LAST_RUN_KV_KEY = 'triggers.context.lastRun';

/** The live rule for one half, deep-filled. `readConfig` already fills both
 *  halves, so the default is only a belt-and-braces fallback. */
function contextRule(action: 'compact' | 'clear'): ContextRule {
  return readConfig().contextTrigger?.[action] ?? DEFAULT_CONTEXT_TRIGGER[action];
}

/** Ask the renderer to run one half of the context trigger.
 *
 *  Both callers funnel through here — a compact mission and the context
 *  trigger's own timer — so there is exactly one path from main to the renderer
 *  for each action, and it always carries the person's own rule.
 *
 *  The old parameterless `mission:autoCompact` event is gone. It was sent next
 *  to this one on every compact, and the renderer ran it with the DEFAULT rule,
 *  so an agent under the person's bar but over the default one was compacted
 *  anyway, and without the person's focus text. */
function emitContextTrigger(action: 'compact' | 'clear', rule: ContextRule): void {
  try { liveWebContents()?.send('trigger:context', { action, rule }); } catch { /* window gone */ }
}

const contextTriggerTimer = createContextTriggerTimer({
  rule: contextRule,
  readLastRun: () => persist.getKv<Record<string, number>>(CONTEXT_LAST_RUN_KV_KEY),
  writeLastRun: (map) => { persist.setKv(CONTEXT_LAST_RUN_KV_KEY, map); },
  fire: emitContextTrigger,
  onError: (action, e) => console.error('[triggers] context', action, e)
});

/** Clear and forget both context timers. */
function clearContextTimers(): void {
  contextTriggerTimer.clear();
}

/** (Re)arm both context timers from persisted config. Clear-then-arm, so calling
 *  it after a settings change, on boot, or on wake from sleep can never stack
 *  duplicates. */
function syncContextTriggers(): void {
  contextTriggerTimer.sync();
}

/** What the registry said at THIS launch, before anything here changed it
 *  (0.5.8, src/shared/agentLive.ts). The renderer's restore asks once per window
 *  (`hive:archivedAtBoot`, `hive:heldAtBoot`): this session's own Stops must not
 *  retire agents at a launch that has already happened. Read once per home,
 *  because bootstrapHiveServices runs again after onboarding or a home move. */
const bootGate = {
  captured: false,
  home: null as string | null,
  archived: [] as string[],
  held: [] as Array<{ id: string; why: RestoreHold }>,
  /** Agents a PERSON archived: the restore retires them to the archived list. */
  snapshot(): string[] { return this.archived; },
  /** Stopped agents the automatic restore leaves alone, and why. */
  heldAtBoot(): Array<{ id: string; why: RestoreHold }> { return this.held; }
};

/** Read this launch's restore answer. Must run BEFORE markStoppedAtBoot. First,
 *  once per registry, the 0.5.7 archived flags move to the 0.5.8 meaning, with
 *  the cards still on the floor in roster.json telling a person's ending from
 *  the startup sweep and a crash. */
function captureBootGate(): void {
  if (!hive.enabled()) return;
  try {
    const home = readConfig().harnessHome ?? null;
    if (bootGate.captured && bootGate.home === home) return;
    const moved = hive.migrateArchivedMeaning([], floorCardIds(roster.read()));
    if (moved) console.log('[restore] 0.5.7 swept agents marked stopped, not archived:', moved);
    const reg = hive.registry();
    const rows = Object.entries(reg.agents).filter(([id]) => id !== reg.godId);
    bootGate.captured = true;
    bootGate.home = home;
    bootGate.archived = rows.filter(([, a]) => a.archived).map(([id]) => id);
    bootGate.held = rows.filter(([, a]) => !a.archived && a.restoreHold).map(([id, a]) => ({ id, why: a.restoreHold as RestoreHold }));
    console.log('[restore] archived by a person:', bootGate.archived.length, 'held from the automatic restore:', bootGate.held.length);
  } catch (e) {
    console.error('[restore] captureBootGate failed:', e);
  }
}

/** Startup (#57/#58, changed in 0.5.8): mark every agent with no live PTY
 *  STOPPED. Until 0.5.8 this ARCHIVED them, about 20 ms after each launch, and
 *  a person's Archive could no longer be told from it. This runs in
 *  bootstrapHiveServices, BEFORE the renderer can respawn anything, so no agent
 *  owns a PTY yet: every entry that is neither archived nor stopped is a carry
 *  over from a session that quit or crashed. Left live with no terminal, the
 *  breaker beat would steer it and the steer bounce to GOD as a requires_reply
 *  GOD can't clear, an inbox flood. Stopped, every reader skips it (`isLive`),
 *  and the restore starts it again, which clears the flag. God is never stopped. */
function markStoppedAtBoot(): void {
  if (!hive.enabled()) return;
  try {
    const reg = hive.registry();
    for (const [id, a] of Object.entries(reg.agents)) {
      if (a.archived || a.role === 'temp') continue;
      if (id === reg.godId) continue;        // god is never stopped
      if (ptyForAgent(id)) continue;         // has a live PTY → genuinely active
      hive.setSleeping(id, true);
      console.log('[startup] marked stopped (no live PTY):', id);
    }
  } catch (e) {
    console.error('[startup] markStoppedAtBoot failed:', e);
  }
}

/** The built in missions an install is given once, and the retirements of the
 *  ones that are gone.
 *
 *  THE HOURLY OPS STANDUP IS NO LONGER SEEDED (0.5.6, founder, 14 Oct 2026). A
 *  new install has no standup in Automations. An install that already has one
 *  keeps it untouched, and `opsStandupSeeded` in its config is simply not read
 *  any more. */
function ensureDefaultMissions(): void {
  // Seed the built-in heartbeat (Lane A #1) once. Shipped DISABLED, so it just
  // appears in the SCHEDULES panel for the user to turn on; lastFiredAt = now so
  // it doesn't fire on the very first launch after a user enables it.
  const cfg2 = readConfig();
  if (!cfg2.heartbeatSeeded) {
    const missions = cfg2.missions ?? [];
    const has = missions.some((m) => m.id === HEARTBEAT_MISSION.id);
    writeConfig({
      missions: has ? missions : [...missions, { ...HEARTBEAT_MISSION, lastFiredAt: Date.now() }],
      heartbeatSeeded: true
    });
  }

  // maint-1 RETIREMENT: `compact-maintenance` is no longer a mission. Scheduled
  // compaction is now the CONTEXT TRIGGER's job, so the operator has exactly one
  // control (a cadence + a pressure gate + an editable message) instead of two
  // that could disagree — a mission saying "hourly" while the trigger said "2h"
  // was a real, unresolvable conflict.
  //
  // The carry-over preserves the operator's decisions: whether compaction was ON
  // and how often. It runs at most once per install, and its guard is the
  // mission's own ABSENCE — nothing seeds `compact-maintenance` any more, so once
  // this has removed it there is nothing left to carry and a later hand-edit of
  // the trigger can never be clobbered. That keeps the `*Seeded` convention's
  // promise (exactly once, ever) without a config flag that would only ever be
  // read here; `compactMaintenanceSeeded` is left set so nothing re-seeds it.
  const cfg3 = readConfig();
  const missions3 = cfg3.missions ?? [];
  const retiring = missions3.find((m) => m.id === COMPACT_MAINTENANCE_MISSION.id);
  if (retiring) {
    const current = cfg3.contextTrigger ?? DEFAULT_CONTEXT_TRIGGER;
    writeConfig({
      missions: missions3.filter((m) => m.id !== COMPACT_MAINTENANCE_MISSION.id),
      contextTrigger: {
        ...current,
        compact: {
          ...current.compact,
          enabled: retiring.enabled,
          // A hand-tuned interval is a decision; only a missing/absurd one falls
          // back to whatever the trigger already carries.
          everyMs: retiring.intervalMs > 0 ? retiring.intervalMs : current.compact.everyMs
        }
      },
      compactMaintenanceSeeded: true
    });
    // …and its elapsed time, so retiring the mission mid-cycle doesn't restart a
    // 2h cadence from zero (the timers honour last-run exactly as arming did).
    if (typeof retiring.lastFiredAt === 'number' && retiring.lastFiredAt > 0) {
      contextTriggerTimer.setLastRun('compact', retiring.lastFiredAt);
    }
    console.log('[triggers] retired the compact-maintenance mission into contextTrigger.compact',
      `(enabled: ${retiring.enabled}, everyMs: ${retiring.intervalMs})`);
  }

  // autoCompact RETIREMENT: the flag above was only ever half-removed. Retiring
  // `compact-maintenance` left `autoCompact: true` sitting on the ops standup, so
  // a default install still asked for compaction on TWO cadences — hourly from the
  // standup, 2-hourly from the trigger — which is precisely the disagreement that
  // retirement claims to have ended. (config.ts even documented a migration that
  // strips this; it did not exist.)
  //
  // Strip it wherever it survives. This is a pure de-duplication, not a behaviour
  // change: contextTrigger.compact still runs, still on the user's own cadence and
  // pressure gate, and it is what actually performed every one of these
  // compactions already — both paths have called emitContextTrigger since Triggers
  // landed. Idempotent, so it costs one no-op scan per boot once clean.
  const cfg4 = readConfig();
  const missions4 = cfg4.missions ?? [];
  if (missions4.some((m) => m.autoCompact)) {
    writeConfig({
      missions: missions4.map(({ autoCompact, ...rest }) => {
        void autoCompact;
        return rest;
      })
    });
    console.log('[triggers] dropped the legacy per-mission autoCompact flag —',
      'contextTrigger.compact is now the only schedule that compacts');
  }
}

// ─── Heartbeat (Lane A #1) + circuit-breaker beat (#6.6b) ────────────────────

/** Is the floor quiet? Derived ONLY from signals the main process owns or can
 *  stat — log.jsonl mtime (the master signal: every routed msg/drain/spawn/task
 *  append touches it), each agent's inbox + outbox/.sent mtimes, and every live
 *  PTY's lastOutputAt (an agent printing/thinking counts as activity). Crucially
 *  NOT registry.status, which is written 'idle' once at spawn and never
 *  transitions in main — reading it would see the floor quiet forever. */
function isFloorQuiet(thresholdMs: number): boolean {
  const root = hive.root();
  if (!root) return false;
  const times: number[] = [];
  const pushMtime = (p: string): void => { try { times.push(statSync(p).mtimeMs); } catch { /* missing */ } };
  pushMtime(join(root, 'log.jsonl'));
  const agentsDir = join(root, 'agents');
  if (existsSync(agentsDir)) {
    for (const id of readdirSync(agentsDir)) {
      pushMtime(join(agentsDir, id, 'inbox'));
      pushMtime(join(agentsDir, id, 'outbox', '.sent'));
    }
  }
  for (const t of ptyManager.list()) times.push(t.lastOutputAt);
  if (times.length === 0) return false; // nothing to judge → don't fire
  return Date.now() - Math.max(...times) > thresholdMs;
}

/** Newest coordination-file mtime for one agent (inbox + inbox/.done, outbox +
 *  outbox/.sent, memory.md) — FILES only, deliberately excluding PTY output, so
 *  "no-progress" means "not coordinating" even while the agent is busy printing
 *  tokens. inbox/.done and the outbox dir count because handling mail (moving a
 *  message to .done, drafting an outbox message) IS coordination — without them
 *  an inbox-ack turn reads as no-progress (issue #109's second trigger). */
function lastCoordinationAt(agentId: string): number {
  const root = hive.root();
  if (!root) return 0;
  const times: number[] = [0];
  const pushMtime = (p: string): void => { try { times.push(statSync(p).mtimeMs); } catch { /* missing */ } };
  const dir = join(root, 'agents', agentId);
  pushMtime(join(dir, 'inbox'));
  pushMtime(join(dir, 'inbox', '.done'));
  pushMtime(join(dir, 'outbox'));
  pushMtime(join(dir, 'outbox', '.sent'));
  pushMtime(join(dir, 'memory.md'));
  return Math.max(...times);
}

/** Newest mtime of the agent's OWN WORKING DIRECTORY — the work
 *  `lastCoordinationAt` cannot see. 0 when there is nothing to read.
 *
 *  Provider neutral by construction: `cwd` is the agent's registry entry, the
 *  same field every supported CLI is spawned into, and none of the paths below
 *  is specific to any one of them. An agent whose `cwd` is not a git checkout
 *  simply falls back to the directory's own mtime; an agent with no `cwd` at
 *  all returns 0 and behaves exactly as it does today.
 *
 *  Cheap by construction: a handful of `stat` calls on fixed paths, never a
 *  directory walk. This runs for every agent on every beat, and a working
 *  directory can hold hundreds of thousands of files. Git is what makes it
 *  affordable — each of these is rewritten by ordinary work:
 *
 *    cwd                  a file or directory added or removed at the top level
 *    .git/index           any `git add`, `git status`, `git checkout`
 *    .git/logs/HEAD       the reflog: commit, checkout, reset, merge, rebase
 *    .git/FETCH_HEAD      fetch and pull
 *    .git/packed-refs     and `.git/refs/remotes`: a push updating a tracking ref
 *
 *  Its honest limit: editing a file deep in the tree while running no git
 *  command moves none of these. That case is already covered by the breaker's
 *  own distinct-tool clock, so the two signals are complementary rather than
 *  redundant — this one exists for the window where tool events do not reach
 *  the breaker but the work is unmistakably real.
 */
function lastWorkAt(agentId: string): number {
  const cwd = hive.registry().agents[agentId]?.cwd;
  if (!cwd) return 0;
  const times: number[] = [0];
  const pushMtime = (p: string): void => { try { times.push(statSync(p).mtimeMs); } catch { /* missing */ } };
  pushMtime(cwd);
  const git = join(cwd, '.git');
  pushMtime(join(git, 'index'));
  pushMtime(join(git, 'logs', 'HEAD'));
  pushMtime(join(git, 'FETCH_HEAD'));
  pushMtime(join(git, 'refs', 'remotes'));
  pushMtime(join(git, 'packed-refs'));
  return Math.max(...times);
}

/** PTY id owning a given agent id, or undefined. */
function ptyForAgent(agentId: string): string | undefined {
  for (const [ptyId, a] of ptyToAgent) if (a === agentId) return ptyId;
  return undefined;
}

/** "Stuck" = some worker's PTY is actively printing (recent output) while its
 *  coordination files have gone stale — working-but-not-coordinating. Tightens
 *  the heartbeat cadence so we notice a wedged agent sooner. */
function looksStuck(windowMs: number): boolean {
  const reg = hive.registry();
  const now = Date.now();
  for (const [id, a] of Object.entries(reg.agents)) {
    if (!isLive(a) || id === reg.godId) continue;
    const ptyId = ptyForAgent(id);
    if (!ptyId) continue;
    const idle = ptyManager.idleFor(ptyId) ?? Infinity;
    if (idle < 15_000 && now - lastCoordinationAt(id) > windowMs) return true;
  }
  return false;
}

/** Bounded digest for god — paths + counts, never full files (reference-passing,
 *  #6.2). A few hundred tokens at most. */
function buildHeartbeatDigest(quietMs: number, actionable = 0): string {
  const reg = hive.registry();
  const active = Object.entries(reg.agents).filter(([id, a]) => isLive(a) && id !== reg.godId);
  const names = active.map(([, a]) => a.name).join(', ') || '—';
  const boardHead = hive.board().split('\n').slice(0, 10).join('\n').trim();
  const log = hive.logTail(8).map((e) => { try { return JSON.stringify(e); } catch { return ''; } }).filter(Boolean).join('\n');
  const withInbox = active.filter(([id]) => hive.inbox(id).length > 0).map(([, a]) => a.name);
  // When real agent/human mail is waiting, lead with an explicit call-to-action
  // instead of the "quiet" line — this beat fired BECAUSE of unread actionable
  // inbox, not because the floor went quiet, and god must read it now.
  const header = actionable > 0
    ? `Floor heartbeat — ${actionable} actionable inbox message(s) awaiting you (worker/human mail). Drain your inbox NOW and act on them.`
    : `Floor heartbeat — quiet ~${Math.round(quietMs / 60000)}m.`;
  return [
    header,
    `Active agents (${active.length}): ${names}.`,
    withInbox.length ? `Undrained inbox: ${withInbox.join(', ')}.` : 'No undrained inboxes.',
    '',
    'Board (head):',
    boardHead || '(empty)',
    '',
    'Recent log:',
    log || '(none)',
    '',
    'Re-engage anyone stalled or blocked and keep the board accurate — or rest if the work is genuinely done.'
  ].join('\n');
}

/** Senders whose mail is the scheduler's OWN noise (heartbeat beats, ops-standup
 *  via 'scheduler', breaker steers, generic 'system') — never a reason to wake
 *  god. Everything else (a worker agent id, 'webhook', a human reply) is real
 *  mail god must act on. Kept narrow so any future real sender counts by default. */
const SYSTEM_SENDERS = new Set(['heartbeat', 'scheduler', 'breaker', 'system']);

/** Count of UNREAD actionable messages in god's inbox — real agent/human mail,
 *  excluding the scheduler's own beats. Drives an inbox-aware re-engage so a
 *  worker's reply (or a human answer) doesn't sit unread while the floor is busy:
 *  the floor-quiet gate alone misses that case — any active agent keeps the floor
 *  "loud", so god was never re-engaged until everything else went idle. */
function godActionableInboxCount(): number {
  try {
    const godId = hive.registry().godId;
    if (!godId) return 0;
    // 0.5.6: not a note that is still waiting for a wake (a note never wakes),
    // and not mail a wake has already carried and the turn end will file.
    return wakeFiling.pending(godId, hive.inbox(godId)).filter((m) => !SYSTEM_SENDERS.has(m.from) && wakesReceiver(m)).length;
  } catch { return 0; }
}

/** Re-engage a quiet floor: drop a durable digest into god's inbox. We never
 *  type directly into god's PTY here — if he's busy that would jam mid-step. The
 *  inbox message is delivered by the renderer's busy-aware inbox-wake (it nudges
 *  god to read his inbox only once he's idle), so the heartbeat defers around a
 *  working god instead of interrupting him. */
function reengageGod(digest: string): void {
  if (!hive.enabled()) return;
  hive.send({ to: 'god', act: 'request', subject: 'Heartbeat', body: digest }, 'heartbeat');
}

/** A native toast for breaker constrain/stop, gated on the notifications setting. */
function breakerToast(title: string, body: string): void {
  if (!readConfig().notifications) return;
  try { if (Notification.isSupported()) new Notification({ title, body }).show(); }
  catch { /* unsupported platform */ }
}

/** An agent whose token count never arrived: stopped like a guardrail stop, and the person told how to fix it (the
 *  window's needs-a-fix notice, words in the renderer, and the native toast). */
function stopUncounted(agentId: string, name: string): void {
  const ptyId = ptyForAgent(agentId);
  if (ptyId) { try { ptyManager.kill(ptyId); } catch { /* already gone */ } teardownPty(ptyId, 'guardrail'); }
  const message = 'Its token count is switched off. Remove CLAUDE_CODE_ENABLE_TELEMETRY and any OTEL_ settings from the env block of ~/.claude/settings.json and from the command that starts it, then start it again. If your organization manages your Claude Code settings, ask your administrator.';
  try { hive.emitDegraded(agentId, name, 'telemetry-off', message); } catch { /* the toast below still says it */ }
  breakerToast(`${name} stopped`, message);
}

function runBreakerBeat(progressWindowMs: number): void {
  if (!hive.enabled()) return;
  const reg = hive.registry();
  const now = Date.now();
  const inputs: BreakerInput[] = [];
  for (const [id, a] of Object.entries(reg.agents)) {
    if (!isLive(a)) continue;
    // #57/#58: skip assistant + orphaned shells. The breaker must only evaluate
    // live, real agents. An assistant entry (e.g. the pre-acc13a3 headless
    // 'Dwight') or any orphaned entry left archived:false with NO live PTY would
    // otherwise be steered, and that steer bounces to GOD as a requires_reply GOD
    // can't clear → inbox flood. ptyForAgent(id) === undefined means no live PTY.
    // God is exempt from this orphan check (it keeps its own flow + the godId skip
    // below) so its ledger row is unaffected. Live real agents always own a PTY
    // (ptyToAgent is set at spawn), so their breaker behavior is unchanged.
    if (a.isAssistant) continue;
    if (id !== reg.godId && !ptyForAgent(id)) continue;
    const sample = usageProvider.getAgentUsage(id);
    // #56: only append a ledger row for a LIVE session sample. A dead/orphaned
    // agent with a frozen transcript still yields a sample via the transcript
    // fallback, but with an EMPTY sessionId (aggregateLive returns null → no live
    // OTel session). Appending it every ~30s rewrote the identical row forever
    // (2,417 dupes observed). A truthy sessionId is set only by a live session
    // (aggregateLive picks the most-recent live session id), so this gates on
    // "is there a live session" without changing any live-agent behavior.
    if (sample?.sessionId) {
      tokenUsage.record(sample, now);
      // A live session still repeats itself: an idle agent's cumulative sample
      // is identical beat after beat. Write the row only when it would differ.
      // Grok's ts is the file's write time, so it alone compares without it.
      const moved = ledgerGate.admits(sample, { ignoreTs: a.provider === 'grok' });
      if (moved) hive.appendCostLedger(sample); // ledger covers everyone incl. god
    }
    // Second source for the resume key. recordSession() is otherwise reachable
    // ONLY from the hook shim, so any window where hooks don't land leaves the
    // registry with no sessionId and "Restart & Continue" refuses to continue —
    // while this very sample proves the app knew the live session id all along
    // (it was already being written to the cost ledger one line above). Same id,
    // same liveness gate; recordSession writes only on change, so this is a
    // no-op once the hooks are flowing.
    // 0.5.3 bug 1: but NOT a sample that proves no conversation. The "most recent
    // live session" under an agent's id is also any child process that inherited
    // its telemetry environment, and one of those, zero tokens and no transcript
    // on disk, sat in a live registry as the resume key for two days.
    if (sample?.sessionId && sampleProvesConversation(sample)) hive.recordSession(id, sample.sessionId);
    // USAGE DATA IS REQUIRED (0.5.8, liveCount.ts): a Claude agent whose live count never arrives after its first turn
    // is stopped.
    if (isClaudeProvider(a.provider)) {
      const v = liveCount.observe(id, {
        now,
        live: !!sample?.sessionId,
        turnAt: workerWake.turnHookAt(id)
      });
      // Only when the app's collector is up: a collector that failed to bind is the app's fault, not the person's.
      if (v.stop && hive.otelEndpoint()) stopUncounted(id, a.name ?? id);
    }
    if (id === reg.godId) continue;            // breaker skips god
    // Progress = fresh coordination files OR a recent OTel tool span. The span
    // leg closes the background-work blind spot: subagent/Workflow tool calls
    // never reach the parent session's PostToolUse hook (so the breaker's own
    // distinct-tool clock stays stale) but their spans DO flow through the
    // collector under this agent's id — an idle parent supervising a hard-
    // working background fleet is progressing, not wedged. Observed live: the
    // one residual no-progress false positive after the #109 fixes.
    const spans = telemetry.getSpans(id);
    const lastSpanAt = spans.length ? spans[spans.length - 1].ts : 0;
    inputs.push({
      agentId: id,
      sample,
      progressing: now - lastCoordinationAt(id) < progressWindowMs || now - lastSpanAt < progressWindowMs,
      // Work, as distinct from coordination. The breaker decides what to do
      // with it; the beat only reports it.
      lastWorkAt: lastWorkAt(id)
    });
  }
  // 0.5.6: who is over a token limit for its period. The office counts the
  // orchestrator's tokens too; only an agent the breaker manages is named.
  const limits = readConfig().tokenLimits;
  if (limits) {
    const over = overLimits({
      limits,
      managed: inputs.map((i) => i.agentId),
      counted: Object.keys(reg.agents),
      used: (id, period) => tokenUsage.usedSince(id, periodStart(period, now)),
    });
    for (const i of inputs) { const why = over.get(i.agentId); if (why) i.limitReason = why; }
  }
  tokenUsage.flush(now);
  for (const d of breaker.tick(inputs, now)) {
    try { liveWebContents()?.send('control:breakerState', d.state); } catch { /* window gone */ }
    if (d.action === 'none') continue;
    const name = reg.agents[d.state.agentId]?.name ?? d.state.agentId;
    const reason = d.state.reason;
    if (d.action === 'steer') {
      hive.send({ to: d.state.agentId, act: 'request', subject: 'Circuit breaker: steer',
        body: `Automated guardrail: ${reason}. Re-check your approach — if you're looping or stuck, STOP repeating, summarize what you've tried, and ask god for direction.` }, 'breaker');
    } else if (d.action === 'constrain') {
      hive.send({ to: d.state.agentId, act: 'request', subject: 'Circuit breaker: constrain',
        body: `Automated guardrail escalated: ${reason}. Stop active work now: switch to read-only/plan, write a short plan of your next step, and send it to god for sign-off BEFORE running more tools.` }, 'breaker');
      breakerToast(`${name} constrained`, reason);
    } else if (d.action === 'stop') {
      const ptyId = ptyForAgent(d.state.agentId);
      // A guardrail, not a person: nobody is at the keyboard, and an agent that is
      // looping or over budget is the likeliest of all to be halfway through an edit.
      if (ptyId) { try { ptyManager.kill(ptyId); } catch { /* already gone */ } teardownPty(ptyId, 'guardrail'); }
      breakerToast(`${name} stopped by circuit breaker`, reason);
    }
  }
}

/** Lifetime spend, folded from cost-ledger.jsonl. `telemetry`'s usd counter is
 *  cumulative-since-process-start and restarts at ~0 on every app restart, so
 *  it cannot answer "what has this agent cost us". See costLifetime.ts. */
const costTotals = new CostLedgerTotals();

/** Whether the renderer has actually let the floor start (#595). Hive services,
 *  the scheduler and the fleet snapshot all run from boot, before the launch-time
 *  harness-config picker is dismissed — so a fresh fleet.json timestamp and a
 *  growing log.jsonl look exactly like a live floor while nothing can spawn. The
 *  renderer reports this, and it is published in fleet.json and log.jsonl so the
 *  dead-but-healthy state is visible from outside the window (e.g. headless). */
let floorState: FloorState | 'starting' = 'starting';

ipcMain.on('floor:state', (_evt, state: unknown) => {
  if (!isFloorState(state)) return;
  if (state === floorState) return;
  floorState = state;
  if (hive.enabled()) {
    hive.appendLog(state === 'open'
      ? { kind: 'floor-open' }
      : {
          kind: 'floor-waiting',
          reason: 'harness-config picker is showing; no agents will spawn until a config is opened '
            + '(set openLastHiveOnLaunch in config.json to skip it on unattended hosts)'
        });
  }
  writeFleetSnapshot();
});

/** Build + write the live fleet snapshot Michael reads (`<hive>/fleet.json`).
 *  Always-on (independent of the heartbeat) since `claude agents` can't see the
 *  hive's sibling sessions. PII-free; never throws (called from a timer). */
function writeFleetSnapshot(): void {
  // The body lives in src/core/fleet.ts; the window's
  // one contribution is the floor state.
  writeFleet({ hive, telemetry, costTotals, breaker, hookHealth: () => hookServer.health(), contextFor: (id) => hookServer.contextFor(id), floor: () => floorState });
}

/** Arm the heartbeat with an adaptive, self-rescheduling cadence (recursive
 *  setTimeout instead of a fixed setInterval). Each beat runs the cost/breaker
 *  pass, re-engages a quiet floor, stamps lastFiredAt, then re-arms: ~base on a
 *  normal beat, base/4 (min 30s) when an agent looks stuck, base*2.5 right after
 *  a re-engage. Registered into missionTimers so shutdown tears it down. */
function armHeartbeat(m: ScheduledMission): void {
  const base = m.intervalMs;
  const quiet = m.quietThresholdMs ?? 300_000;
  const beat = (): void => {
    let next = base;
    try {
      // (the breaker beat + cost ledger now run on their own always-on timer)
      // Re-engage god when the floor is quiet OR when real agent/human mail is
      // waiting in god's inbox — the latter is independent of floor-quiet so a
      // worker's reply doesn't sit unread while other agents keep the floor busy.
      const actionable = godActionableInboxCount();
      if (isFloorQuiet(quiet) || actionable > 0) {
        reengageGod(buildHeartbeatDigest(quiet, actionable));
        next = Math.round(base * 2.5);            // back off after re-engaging
      } else if (looksStuck(quiet)) {
        next = Math.max(30_000, Math.round(base / 4)); // tighten when an agent is wedged
      }
      const cur = readConfig().missions ?? [];
      writeConfig({ missions: cur.map((x) => (x.id === m.id ? { ...x, lastFiredAt: Date.now() } : x)) });
      try { liveWebContents()?.send('missions:updated'); } catch { /* window gone */ }
    } catch (e) {
      console.error('[heartbeat]', e);
    }
    const entry = missionTimers.get(m.id) ?? {};
    entry.timeout = setTimeout(beat, next);
    missionTimers.set(m.id, entry);
  };
  const remaining = Math.max(0, base - (Date.now() - (m.lastFiredAt ?? 0)));
  missionTimers.set(m.id, { timeout: setTimeout(beat, remaining) });
}

/** The live renderer webContents, or null if the window is gone/destroyed.
 *  Anything that emits to the renderer from a timer/socket/child callback must
 *  route through here — during quit the window can be destroyed while those
 *  callbacks are still in flight, and `.send()` on a destroyed webContents
 *  throws "Object has been destroyed" (the main-process crash dialog). */
function liveWebContents(): Electron.WebContents | null {
  const wc = mainWindow?.webContents;
  if (wc && !wc.isDestroyed()) return wc;
  // Primary gone (closed/destroyed): fall back to any other live window so a
  // global event still reaches a renderer instead of being silently dropped.
  for (const w of allWindows) {
    if (!w.isDestroyed() && !w.webContents.isDestroyed()) return w.webContents;
  }
  return null;
}

/** Every live window's webContents (main and floors alike), for events that
 *  describe shared state and must reach each renderer, not just the focused
 *  one. Every window goes through createWindow, which registers it here. */
function allLiveWebContents(): Electron.WebContents[] {
  const out: Electron.WebContents[] = [];
  for (const w of allWindows) {
    if (!w.isDestroyed() && !w.webContents.isDestroyed()) out.push(w.webContents);
  }
  return out;
}

// ─── Slack webhook server (Slack message → Michael's queue) ──────────────────
/** The running Slack ingestion server, or null when disabled/stopped. */
let slackServer: SlackWebhookServer | null = null;
/** The loopback-only reply endpoint (lets the bundled helper post back to Slack
 *  without ever seeing the bot token). Lifecycle is tied to `slackServer`. */
let slackReplyServer: SlackReplyServer | null = null;
/** Last public tunnel URL handed out — persisted so Settings can re-show the
 *  Request URL after a reopen (Slack reuses it until the server is stopped). */
let lastSlackUrl: string | undefined;
/** 0.4.11: the other two ways Slack reaches the office. One at a time, so at
 *  most one of `slackServer`, `slackPoller`, `slackSocket` is ever set. */
let slackPoller: SlackPollerSet | null = null;
let slackSocket: SlackSocketClient | null = null;
/** Starts in flight right now. More than one can overlap (launch, Save). */
let slackStartsInFlight = 0;
/** 0.5.6: a start that failed is tried again for as long as the
 *  switch is on (slackStartRetry.ts). Before this, an app opened before the
 *  network was up left Slack dead with the switch still reading on. */
const slackRetry = new SlackStartRetry({
  start: () => { void startSlackIngestion().catch((e) => console.error('[slack] retry threw:', e)); },
  wanted: () => !slackReadiness(readConfig()).error,
  busy: () => slackStartsInFlight > 0,
  online: () => net.isOnline()
});

/** AUTONOMOUS REQUEST PROTOCOL — built PER MESSAGE (not a static const) so it can
 *  embed the request's concrete `channel`, `thread_ts`, and the resolved helper
 *  path. Prepended (server-side, authoritatively) to the working instruction god
 *  reads for any Slack-origin request: there is no interactive human at the
 *  keyboard, so god must route fast, delegate WITH the exact reply command (so the
 *  worker posts its real result back into THIS thread itself), stay autonomous,
 *  and only block on enumerated high-severity actions. Prepended to god's PROMPT
 *  only — the human-facing kanban card TITLE stays the user's raw text (the
 *  renderer keeps them split). Trailing space is intentional so the user's message
 *  reads naturally after it. */
/** The autonomy rules that ride in front of a Slack request. Two readers: god,
 *  who triages it (the renderer queue), and a temp the harness started for it
 *  (the dispatch prefix). 0.4.11: one short numbered text per reader. The old
 *  single text told a temp that "the agent then tells you (Michael)". */
/** What a brief says about one message: where it was written, by whom and
 *  what came with it (shared/slackBrief). */
type SlackAbout = Partial<Pick<SlackBriefArgs, 'place' | 'inThread' | 'user' | 'hasFiles' | 'hasThread' | 'hasEarlier' | 'hasRefs'>>;

/** 0.5.6 (founder, 12 Oct 2026): three readers. `agent` is an agent the person
 *  chose to receive Slack; its text has no routing and no handing over. The
 *  words live in shared/slackBrief, pinned by test/v056-slack-brief.test.cjs;
 *  this adds the two paths only main knows. A caller that knows nothing about
 *  the message still gets the place right for a direct message, from its id. */
function buildAutonomousRequestProtocol(channel: string, threadTs: string, helperPath: string, reader: SlackReader = 'god', about: SlackAbout = {}): string {
  // The bundled Node, spelled as an absolute path: bare "node" is not on the
  // hook or agent PATH on many machines, and $VAR forms are dead on Windows.
  return buildSlackBrief({
    reader, channel, threadTs,
    helper: `"${hive.nodeCommand()}" "${helperPath}"`,
    ...about,
    place: about.place ?? (channel.startsWith('D') ? 'dm' : 'channel')
  });
}

// ─── Slack done-notifier (Slack-origin task → done → one summary reply) ───────
/** Polls the shared kanban (hive/tasks.json) for Slack-origin tasks that reach
 *  'done' and posts ONE summary reply into the originating thread. Lifecycle is
 *  tied to `slackServer`. OUTBOUND-only: it never touches inbound queue/lanes. */
let slackDoneTimer: ReturnType<typeof setInterval> | null = null;
/** Re-entrancy guard so a slow post can't overlap the next tick. */
let slackDonePolling = false;
/** Task ids already notified — exactly-once across re-reads AND restarts. Lazily
 *  loaded from / persisted to `slackDoneNotifiedPath()`. */
let slackDoneNotified: Set<string> | null = null;
/** Ids already 'done' when the observer started — baselined (never notified) so a
 *  summary only ever fires on a live …→done transition, not on pre-existing dones. */
let slackDoneBaseline: Set<string> | null = null;
/** thread_ts values an agent has ALREADY answered directly via the loopback
 *  `/reply` endpoint. The done-summary poller skips these — the agent's own
 *  substantive reply already landed in-thread, so the poller is a fallback, not a
 *  duplicator (this is what stops the bare/duplicate `:white_check_mark:` posts). */
const directlyRepliedThreads = new Set<string>();

/** Absolute path to the bundled `md-slack-reply.cjs` helper. Packaged: under
 *  `process.resourcesPath` (electron-builder extraResources). Dev: the repo's
 *  `resources/` dir, resolved from the app path. */
function slackReplyScriptPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'md-slack-reply.cjs')
    : join(app.getAppPath(), 'resources', 'md-slack-reply.cjs');
}

/** 0.5.6: the bundled `md-secret.cjs` (a key or secret saved in Settings,
 *  used by a running agent through the integration broker). Same resolution.
 *  The hive names it in every agent's CAPABILITIES line, after the bundled
 *  Node. */
function secretScriptPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'md-secret.cjs')
    : join(app.getAppPath(), 'resources', 'md-secret.cjs');
}

/** W3 — the bundled read-only `skills/` source dir copied into each agent's
 *  `.claude/skills/` at spawn. Same packaged/dev resolution as the helpers above.
 *  Tolerated-missing until lp-manifest (Kevin) populates it (the hive copy is a
 *  no-op on an absent dir). */
function skillsResourceDir(): string {
  return officePaths().bundled('skills');
}

/** Where the helper discovers `{ port, token }` for the loopback endpoint. Kept
 *  under userData (NOT the git repo, NOT mined into MemPalace). */
function slackReplyConfigPath(): string {
  return join(app.getPath('userData'), 'slack-reply.json');
}

/** Ledger of task ids whose done-summary has already been posted. Ids ONLY — no
 *  secret ever lands here. Under userData (out of the repo, out of MemPalace). */
function slackDoneNotifiedPath(): string {
  return join(app.getPath('userData'), 'slack-done-notified.json');
}

/** Directory where downloaded Slack attachments are saved (out of repo, out of MemPalace). */
function slackFilesDir(): string {
  return join(app.getPath('userData'), 'slack-files');
}

function loadSlackDoneNotified(): Set<string> {
  try {
    const arr = JSON.parse(readFileSync(slackDoneNotifiedPath(), 'utf8'));
    if (Array.isArray(arr)) return new Set(arr.filter((x): x is string => typeof x === 'string'));
  } catch { /* missing/corrupt → start empty */ }
  return new Set();
}

function persistSlackDoneNotified(set: Set<string>): void {
  try { writeFileSync(slackDoneNotifiedPath(), JSON.stringify([...set])); }
  catch (e) { console.error('[slack] could not persist done-notify ledger:', e); }
}

/** Slack `chat.postMessage` errors that are permanent for this config — retrying
 *  can never make them succeed, so a failed post with one of these is recorded
 *  (not retried) to avoid flooding the log every 5s. Anything else is treated as
 *  transient and left to retry. */
const TERMINAL_SLACK_ERRORS = new Set<string>([
  'missing_scope', 'invalid_auth', 'not_authed', 'account_inactive',
  'token_revoked', 'token_expired', 'no_permission', 'channel_not_found',
  'not_in_channel', 'is_archived', 'restricted_action', 'org_login_required',
]);

/** The single in-thread summary for a finished task. Sourced from the task's
 *  result/description (falling back to the title), trimmed Slack-friendly. */
function slackDoneSummary(task: HiveTask): string {
  const body = (task.result ?? task.description ?? '').trim();
  const head = `:white_check_mark: *${/^[A-Z][A-Z0-9]{2}-\d+$/.test(task.id) ? `${task.id} ` : ''}${task.title}*`;
  const text = body ? `${head}\n\n${body}` : head;
  return text.length > 2800 ? `${text.slice(0, 2799)}…` : text;
}

/** One observation pass over the kanban. Posts a summary for any Slack-origin
 *  task that has newly reached 'done'. Best-effort and self-guarding — it must
 *  never throw into the timer, and the bot token never leaves this function. */
async function pollSlackDoneTasks(): Promise<void> {
  if (slackDonePolling) return;
  const botToken = readConfig().slackBotToken;
  if (!botToken) return; // can't post without the token — nothing to do
  let tasks: HiveTask[];
  try {
    const ledger = hive.tasks() as { tasks?: HiveTask[] };
    tasks = Array.isArray(ledger?.tasks) ? ledger.tasks : [];
  } catch { return; } // unreadable/missing tasks.json → skip this tick

  const notified = slackDoneNotified ?? (slackDoneNotified = loadSlackDoneNotified());

  // First tick seeds the baseline (ids already done) and posts nothing — so we
  // only ever fire on a transition observed live this session.
  if (slackDoneBaseline === null) {
    slackDoneBaseline = new Set(tasks.filter((t) => t.status === 'done').map((t) => t.id));
    return;
  }
  const baseline = slackDoneBaseline;

  slackDonePolling = true;
  try {
    for (const t of tasks) {
      if (t.status !== 'done') continue;
      if (baseline.has(t.id) || notified.has(t.id)) continue; // already handled
      const slack = t.slack;
      if (!slack || !slack.channel || !slack.thread_ts) continue; // non-Slack-origin → leave alone
      // FALLBACK-ONLY: if the agent already posted a DIRECT reply into this thread
      // (loopback /reply), the human has its substantive answer — don't double-post.
      if (directlyRepliedThreads.has(slack.thread_ts)) { notified.add(t.id); persistSlackDoneNotified(notified); continue; }
      // Never post a bare `:white_check_mark: *title*` with no substance: if the card
      // carries neither a result nor a description, there is nothing meaningful to
      // deliver — skip it (still under the FALLBACK contract).
      if (!(t.result ?? t.description ?? '').trim()) { notified.add(t.id); persistSlackDoneNotified(notified); continue; }
      const res = await postSlackReply({
        botToken, channel: slack.channel, thread_ts: slack.thread_ts, text: slackDoneSummary(t)
      });
      if (res.ok) {
        notified.add(t.id);
        persistSlackDoneNotified(notified); // mark-on-success → exactly one delivered reply
      } else if (res.error && TERMINAL_SLACK_ERRORS.has(res.error)) {
        // A permanent config/auth error (e.g. the bot token lacks `chat:write`)
        // will NEVER succeed — record the id so we stop hammering every tick, and
        // log the reason once. Never log the token or message body.
        notified.add(t.id);
        persistSlackDoneNotified(notified);
        console.error('[slack] done-summary post for task', t.id,
          '— giving up (terminal error:', res.error + '). Fix the Slack bot scope/permissions; later tasks post once resolved.');
      } else {
        // Transient (network / rate-limit / unknown) → leave unmarked so a later
        // tick retries. Log the id + error only; never the token or message body.
        console.error('[slack] done-summary post failed for task', t.id, '-', res.error, '(will retry)');
      }
    }
  } finally {
    slackDonePolling = false;
  }
}

/** Begin watching the kanban for Slack-origin done-transitions (idempotent). */
function startSlackDoneObserver(): void {
  if (slackDoneTimer) return;
  slackDoneNotified = loadSlackDoneNotified();
  slackDoneBaseline = null; // re-seed on the first tick of this session
  slackDoneTimer = setInterval(() => { void pollSlackDoneTasks(); }, 5000);
}

/** Stop watching the kanban. Safe to call when not running. */
function stopSlackDoneObserver(): void {
  if (slackDoneTimer) { clearInterval(slackDoneTimer); slackDoneTimer = null; }
  slackDoneBaseline = null;
}

/** Build a SlackWebhookServer from the current config and start it, replacing
 *  any running instance, and return the start result (incl. the public tunnel
 *  URL the user pastes into Slack). No-op + error result when the integration is
 *  disabled or the signing secret is unset. */
async function startSlackServer(): Promise<{ ok: boolean; url?: string; error?: string }> {
  const cfg = readConfig();
  if (!cfg.slackEnabled || !cfg.slackSigningSecret) {
    return { ok: false, error: 'slack disabled or missing signing secret' };
  }
  slackServer?.stop();
  slackServer = new SlackWebhookServer({
    port: cfg.slackPort && cfg.slackPort > 0 ? cfg.slackPort : 3847,
    signingSecret: cfg.slackSigningSecret,
    channelId: resolveSlackChannels(cfg),
    // Fires from the HTTP server's event loop (not the IPC thread); route through
    // liveWebContents() so a message arriving during window teardown can't throw.
    // Downloads any file attachments (bot token stays in main; local paths go to IPC).
    // 0.4.11: the webhook is one of three ways in, and all three land on the
    // same door, which hands the request to a temp instead of Michael's queue.
    onMessage: (m) => onSlackTransportMessage(m),
    // Reopened at a new address; Slack's Request URL must be set to it by hand.
    onTunnelUrl: (url) => {
      lastSlackUrl = url;
      console.warn(`[slack] tunnel reopened at ${url}; set it as the Slack app's Request URL`);
    }
  });
  const res = await slackServer.start();
  // 0.5.3, bug 11: a taken port is no longer fatal, the server moves to a free
  // one and the tunnel follows. Say so once, so a log explains a port nobody set.
  if (res.movedFrom !== undefined) console.warn(`[slack] port ${res.movedFrom} was in use (an older Munder Difflin may still be running); listening on ${res.port} instead`);
  // A SECOND WAY TO THE SAME ERROR, found reading this for bug 11. start() also
  // answers ok:false when the port bound fine and only the TUNNEL failed
  // (offline, tunnelmole down). This line used to drop the instance without
  // stopping it, so the server nobody held any more kept the port, and every
  // later Turn on in this session failed with EADDRINUSE until the app was
  // restarted. Stop it before letting go of it.
  if (!res.ok) { slackServer.stop(); slackServer = null; return res; }
  if (res.url) lastSlackUrl = res.url;
  // Bring up the loopback reply endpoint (token-gated, never tunneled) and drop
  // the discovery file for the bundled helper. Best-effort: reply path being
  // unavailable must not sink ingestion.
  await startSlackReplyServer();
  // Begin watching the kanban for Slack-origin tasks that reach 'done', to post
  // their one summary reply in-thread. OUTBOUND-only; never touches ingestion.
  startSlackDoneObserver();
  analytics.trackFeature('slack_trigger');
  return res;
}

/** Start the loopback reply endpoint and write its `{ port, token }` to userData
 *  so `md-slack-reply.cjs` can reach it. The bot token is read lazily from config
 *  at reply time and never written to this file. */
async function startSlackReplyServer(): Promise<void> {
  slackReplyServer?.stop();
  const token = randomBytes(24).toString('hex');
  slackReplyServer = new SlackReplyServer({
    token,
    getBotToken: () => readConfig().slackBotToken,
    // An agent posted a DIRECT substantive reply into this thread → record it so the
    // done-summary poller skips it (the poller is a fallback, not a duplicator).
    onReplied: (thread_ts) => { directlyRepliedThreads.add(thread_ts); },
  });
  const r = await slackReplyServer.start();
  if (!r.ok || r.port === undefined) {
    console.error('[slack] reply endpoint failed to start:', r.error);
    slackReplyServer = null;
    return;
  }
  try {
    writeFileSync(slackReplyConfigPath(), JSON.stringify({ port: r.port, token }), { mode: 0o600 });
  } catch (e) {
    console.error('[slack] could not write reply config:', e);
  }
}

/** Stop and forget the Slack server (+ reply endpoint). Best-effort; safe to call
 *  when not running. The last tunnel URL is retained so Settings keeps showing it. */
function stopSlackServer(): void {
  try { slackServer?.stop(); } catch (e) { console.error('[slack] stop failed:', e); }
  slackServer = null;
  try { slackReplyServer?.stop(); } catch (e) { console.error('[slack] reply stop failed:', e); }
  slackReplyServer = null;
  stopSlackDoneObserver();
  try { if (existsSync(slackReplyConfigPath())) unlinkSync(slackReplyConfigPath()); } catch { /* noop */ }
}

// ─── Slack, the three ways (0.4.11) ──────────────────────────────────────────
// Founder, 6 Sep 2026: "instead of relying on webhooks they can just rely on
// polling", then Socket Mode as a second way, webhooks kept as the third, one
// at a time. Every way lands on the same door, onSlackTransportMessage. Who
// answers is the ONE responder setting (0.5.2, founder ruling, Option A,
// config.responder, @shared/responder): the orchestrator unless the person
// pointed it at an agent that is running. The
// 0.4.11 temps route (a temp hired per request, slackInbound.ts) had no branch
// choosing it from 0.5.2. 0.5.6 (founder, 10 Oct 2026): the setting may be a
// temp (`temp`, or `temp:<agent id>` for a clone), and then that route runs.

/** Where the poller keeps its cursor and hot threads. Under userData, never in
 *  the hive repo, never a token. Shared by the polling and the socket way. */
function slackPollStatePath(): string {
  return join(app.getPath('userData'), 'slack-poll.json');
}

/** The gated "received" post, the same words on both routes. */
const SLACK_RECEIVED_TEXT = ':hourglass_flowing_sand: *Received.* The office is on it and will reply here when done.';

/** The one door: attachments down, ledger row, then whoever handles it. */
async function onSlackTransportMessage(m: SlackInboundMessage): Promise<void> {
  const localFiles = await downloadSlackFiles(m._rawFiles ?? [], readConfig().slackBotToken, slackFilesDir());
  appendSlackHistory({ direction: 'inbound', channel: m.channel, thread_ts: m.thread_ts, text: m.text, ok: true });
  notifySlackHistoryUpdated();
  // 0.5.6: the Integrations Activity tab. Where and who, by id; never the text.
  slackLog('message-in', { channel: m.channel, place: m.place ?? 'channel', ...(m.user ? { user: m.user } : {}) });
  // ONE route (0.5.2, founder ruling, Option A). The text lands in the
  // renderer's queue with the autonomous request protocol ahead of it and the
  // card gets the thread, exactly as the orchestrator's route always did. WHO
  // takes it is the responder setting, sent along as the configured id: the
  // renderer resolves it against the agents that are actually running and
  // falls back to the orchestrator (@shared/responder). The gated "received" post
  // is main's.
  const cfg = readConfig();
  // 0.5.6: what came with the message, read once for whoever takes it.
  const inThread = !!m.thread_ts && m.thread_ts !== m.ts;
  const side = await slackSideContext(m, cfg.slackBotToken);
  // A TEMP AS THE RECEIVER (0.5.6). The setting is `temp` or `temp:<agent id>`:
  // the message is a new temp's job (slackInbound.ts) and nothing goes to the
  // renderer's queue. The temp replies in the thread itself; a follow up in a
  // thread whose temp is still alive goes to that temp. An empty message is
  // left to the route below, which drops it. When the temp cannot be queued
  // the route below takes the message, and there a temp value reads as the
  // orchestrator. No running agents are passed: only a temp is decided here,
  // an agent is still the renderer's to resolve.
  const receiver = resolveReceiver(cfg.responder, [], cloneableAgentIds(), 'god');
  if (receiver.kind === 'temp' && (m.text.trim() || localFiles.length > 0)) {
    const inbound: SlackInbound = { text: m.text, channel: m.channel, ts: m.ts, thread_ts: m.thread_ts };
    if (localFiles.length > 0) inbound.files = localFiles;
    if (receiver.cloneOf) inbound.cloneOf = receiver.cloneOf;
    if (m.place) inbound.place = m.place;
    if (m.user) inbound.user = m.user;
    const context = [side.earlier, side.refs].filter(Boolean).join('\n\n');
    if (context) inbound.context = context;
    try {
      await handleInboundSlack(inbound, slackInboundDeps());
      return;
    } catch (e) {
      slackLog('temp-not-queued', { error: e instanceof Error ? e.message : String(e) });
    }
  }
  // An agent or the orchestrator reads the thread it is answering in. A temp's
  // request reads its own (slackInbound.ts), so it is asked for only here.
  let thread = '';
  if (inThread && cfg.slackBotToken) {
    try { thread = slackRowsBlock('Thread so far', (await fetchThread(cfg.slackBotToken, m.channel, m.thread_ts)).filter((r) => r.ts !== m.ts)); }
    catch { thread = ''; }
  }
  const about: SlackAbout = {
    place: m.place, inThread, user: m.user, hasFiles: localFiles.length > 0,
    hasThread: !!thread, hasEarlier: !!side.earlier, hasRefs: !!side.refs
  };
  const context = [thread, side.earlier, side.refs].filter(Boolean).join('\n\n');
  // TWO TEXTS, because who takes it is the renderer's to resolve: the
  // orchestrator's when it lands on the orchestrator (the setting is unset, or
  // the chosen agent is not running), the agent's when it lands on that agent.
  const ipcMsg: { text: string; channel: string; ts: string; thread_ts: string; responder: string; autonomyPreamble: string; agentPreamble: string; context?: string; files?: typeof localFiles } = {
    text: m.text, channel: m.channel, ts: m.ts, thread_ts: m.thread_ts,
    responder: cfg.responder ?? '',
    autonomyPreamble: buildAutonomousRequestProtocol(m.channel, m.thread_ts, slackReplyScriptPath(), 'god', about),
    agentPreamble: buildAutonomousRequestProtocol(m.channel, m.thread_ts, slackReplyScriptPath(), 'agent', about)
  };
  if (context) ipcMsg.context = context;
  if (localFiles.length > 0) ipcMsg.files = localFiles;
  try { liveWebContents()?.send('slack:incomingMessage', ipcMsg); } catch { /* window torn down */ }
  if (cfg.slackProactivePosting && cfg.slackBotToken) {
    void postSlackReply({ botToken: cfg.slackBotToken, channel: m.channel, thread_ts: m.thread_ts, text: SLACK_RECEIVED_TEXT });
  }
}

/**
 * What a Slack message points to, read for whoever answers it (0.5.6, founder
 * 12 Oct 2026: "with reference to any chat message/media"). Two blocks, each
 * empty when there is nothing: the messages shared into it or linked from it,
 * and, for a top level direct message, what was said just before, because a
 * direct message is a conversation and "yes, do it" means nothing alone. Every
 * call is best effort: a message the bot cannot read is said to be unreadable,
 * and a failure never costs the message itself.
 */
async function slackSideContext(m: SlackInboundMessage, botToken: string | undefined): Promise<{ earlier: string; refs: string }> {
  const refs: SlackRef[] = [...(m._shares ?? [])];
  let earlier = '';
  if (botToken) {
    for (const link of slackMessageLinks(m.text)) {
      if (refs.length >= SLACK_REFS_MAX) break;
      if (refs.some((r) => r.url?.startsWith(link.url))) continue;
      try {
        const got = await fetchMessage(botToken, link.channel, link.ts);
        refs.push(got
          ? { text: got.text, author: got.user ? `<@${got.user}>` : undefined, url: link.url }
          : { text: 'The office could not read this message: the bot is not in that conversation.', url: link.url });
      } catch { /* the link stays in the text */ }
    }
    if ((m.place ?? 'channel') === 'dm' && m.thread_ts === m.ts) {
      try {
        const rows: SlackRow[] = await fetchRecent(botToken, m.channel, m.ts);
        // The office answers in a thread under each message, and history has
        // top level rows only: add the answers under the newest row that has any.
        const last = [...rows].reverse().find((r) => (r.replies ?? 0) > 0);
        if (last) {
          const replies = (await fetchThread(botToken, m.channel, last.ts)).filter((r) => r.ts !== last.ts).slice(-4);
          rows.splice(rows.indexOf(last) + 1, 0, ...replies);
        }
        earlier = slackRowsBlock('Earlier in this direct message', rows);
      } catch { earlier = ''; }
    }
  }
  return { earlier, refs: slackRefsBlock(refs) };
}

/** The folder a Slack temp opens: the saved one, else the newest agent's, else
 *  the workspace. A temp needs a real folder; a git repo also gets a worktree. */
function resolveSlackTempCwd(): string {
  const cfg = readConfig();
  const saved = typeof cfg.slackTempCwd === 'string' && cfg.slackTempCwd.trim() ? expandTilde(cfg.slackTempCwd.trim()) : '';
  if (saved && existsSync(saved)) return saved;
  try {
    // The registry is keyed by id in registration order, so the last entry is
    // the newest hire.
    const agents = Object.values(hive.registry().agents);
    for (let i = agents.length - 1; i >= 0; i -= 1) {
      const a = agents[i];
      if (a.isGod || !isLive(a) || !a.cwd || !existsSync(a.cwd)) continue;
      return a.cwd;
    }
  } catch { /* no registry yet */ }
  return cfg.harnessHome && existsSync(cfg.harnessHome) ? cfg.harnessHome : app.getPath('home');
}

// ─── A temp as the receiver (0.5.6) ──────────────────────────────────────────
// A receiver setting may be `temp` or `temp:<agent id>` (@shared/responder).
// Every inbound channel resolves it and, for a temp, queues a spawn request in
// place of mailing an agent: Slack through slackInbound.ts, a webhook call and
// a scheduled mission through inboundTemp.ts. The watcher below runs the
// request like any other.

/** The agents a temp may be cloned from, read from the registry at the moment
 *  a message lands (@shared/responder cloneableIdsOf): registered, not
 *  archived, not the orchestrator, not the assistant, not a temp. The agent
 *  need not be running. The orchestrator is also left out by its id, for a
 *  registry record that names it only there. */
function cloneableAgentIds(): string[] {
  try {
    const reg = hive.registry();
    return cloneableIdsOf(Object.values(reg.agents)).filter((id) => id !== reg.godId);
  } catch { return []; }
}

/** The folder an inbound temp opens: the source agent's for a clone, so its
 *  worktree is cut from that agent's branch; else the folder a Slack temp
 *  opens. A clone whose folder is gone opens that one too. */
function inboundTempCwd(cloneOf?: string): string {
  if (cloneOf) {
    try {
      const cwd = hive.registry().agents[cloneOf]?.cwd;
      if (cwd && existsSync(cwd)) return cwd;
    } catch { /* no registry yet */ }
  }
  return resolveSlackTempCwd();
}

/** Queue a temp for one inbound message that is not from Slack. Throws when
 *  it cannot; every caller then sends the message to the orchestrator. */
function queueTempFor(args: Parameters<typeof queueInboundTemp>[0]): ReturnType<typeof queueInboundTemp> {
  return queueInboundTemp(args, { spawnRequestsDir, tempCwd: inboundTempCwd });
}

function slackInboundDeps(): Parameters<typeof handleInboundSlack>[1] {
  return {
    spawnRequestsDir: () => {
      const dir = spawnRequestsDir();
      if (dir) { try { mkdirSync(dir, { recursive: true }); } catch { /* the watcher makes it too */ } }
      return dir;
    },
    liveThreadOwner: liveSlackThreadOwner,
    threadSoFar: async (channel, thread_ts) => {
      const token = readConfig().slackBotToken;
      if (!token) return [];
      try { return await fetchThread(token, channel, thread_ts); } catch { return []; }
    },
    tempCwd: inboundTempCwd,
    replyCommand: (channel, thread_ts) =>
      `"${hive.nodeCommand()}" "${slackReplyScriptPath()}" --channel ${channel} --thread ${thread_ts} --text "<substantive result>"`,
    // What the orchestrator's own route puts ahead of the text, for the
    // fallback it is sent when no temp slot frees in time.
    orchestratorBrief: (channel, thread_ts) => buildAutonomousRequestProtocol(channel, thread_ts, slackReplyScriptPath()),
    hive,
    // The "received" post stays behind the gate the renderer's post used to be
    // behind (CLAUSE-3, "stop posting into Slack by default"): off unless opted in.
    ack: readConfig().slackProactivePosting
      ? async (m) => {
        const token = readConfig().slackBotToken;
        if (!token) return;
        await postSlackReply({ botToken: token, channel: m.channel, thread_ts: m.thread_ts, text: SLACK_RECEIVED_TEXT });
      }
      : undefined,
    informGod
  };
}

/**
 * Which way is chosen and what it still lacks, before anything starts.
 *
 * ONLY POLLING NEEDS A CHANNEL (7 Sep 2026). Polling asks Slack for one named
 * channel's history on a timer, so without an id it has nothing to ask about.
 * The socket is pushed every event the app is subscribed to and each one CARRIES
 * its channel, so a channel id here was a field the transport never read: it
 * refused to start over an answer it was going to ignore. The webhook was
 * already exempt for the same reason.
 */
function slackReadiness(cfg: HarnessConfig): { mode: SlackMode; error?: string } {
  const mode = resolveSlackMode(cfg);
  if (!cfg.slackEnabled) return { mode, error: 'slack disabled' };
  if (mode === 'webhook') return cfg.slackSigningSecret ? { mode } : { mode, error: 'missing signing secret' };
  if (!cfg.slackBotToken) return { mode, error: 'missing bot token' };
  if (mode === 'socket') return cfg.slackAppToken ? { mode } : { mode, error: 'missing app token' };
  // 0.5.6: polling needs no channel either. With none named it reads every
  // channel the bot is in, and says so itself when the token cannot list them.
  return { mode };
}

/** One Slack line to BOTH console and hive/log.jsonl, best effort.
 *
 *  6 Sep 2026, card slack-bridge-never-starts: the founder's correctly-enabled
 *  install refused to start over a missing channel and left NO trace anywhere
 *  a person can look. Every console.log in a packaged app goes to a stderr
 *  nobody reads, and nothing on the Slack path wrote to log.jsonl, so an hour
 *  went into proving a negative. Every start attempt, refusal, failure and
 *  stop now lands in the log a person (and god) actually reads. */
function slackLog(event: string, detail?: Record<string, unknown>): void {
  console.log(`[slack] ${event}`, detail ? JSON.stringify(detail) : '');
  try { hive.appendLog({ kind: 'slack', event, ...detail }); } catch { /* hive not bootstrapped yet */ }
}

/** Start the chosen way, and only it. Whatever was running stops first.
 *
 *  0.5.6: every start, whoever asked for it, tells the retry how it ended. A
 *  failure is owed another try while the switch is on. A refusal over a
 *  missing field is not: nothing changes until the person fills it in. */
async function startSlackIngestion(): Promise<{ ok: boolean; url?: string; error?: string }> {
  slackStartsInFlight += 1;
  try {
    const r = await startSlackWay();
    if (r.ok) slackRetry.succeeded();
    else if (slackReadiness(readConfig()).error) slackRetry.cancel();
    else slackRetry.failed(r.error ?? 'unknown');
    return r;
  } finally {
    slackStartsInFlight -= 1;
  }
}

async function startSlackWay(): Promise<{ ok: boolean; url?: string; error?: string }> {
  const cfg = readConfig();
  const ready = slackReadiness(cfg);
  slackLog('start-attempt', { mode: ready.mode });
  if (ready.error) {
    // The silent path that cost the founder his morning: enabled, tokens
    // saved, and the one missing field refused here without a word.
    slackLog('refused', { mode: ready.mode, error: ready.error });
    return { ok: false, error: ready.error };
  }
  stopSlackWays();
  if (ready.mode === 'webhook') {
    const r = await startSlackServer();
    slackLog(r.ok ? 'started' : 'failed', { mode: ready.mode, ...(r.ok ? {} : { error: r.error ?? 'unknown' }) });
    return r;
  }
  // 0.5.6: the channels named in Settings, one or several. None named means
  // every channel the bot is in; a direct message is taken either way.
  const channels = resolveSlackChannels(cfg);
  const common = {
    botToken: cfg.slackBotToken as string,
    stateFile: slackPollStatePath(),
    onMessage: onSlackTransportMessage,
    // The transports speak on failures, stops and rate limits, not per poll,
    // so mirroring them into log.jsonl is cheap and makes a dying bridge
    // visible after the fact.
    log: (line: string) => slackLog('transport', { line })
  };
  let res: { ok: boolean; error?: string };
  if (ready.mode === 'polling') {
    slackPoller = new SlackPollerSet({ ...common, channelIds: channels, intervalMs: resolvePollSeconds(cfg.slackPollSeconds) * 1000 });
    res = await slackPoller.start();
    if (!res.ok) { slackPoller.stop(); slackPoller = null; slackLog('failed', { mode: ready.mode, error: res.error ?? 'unknown' }); return res; }
  } else {
    slackSocket = new SlackSocketClient({ ...common, channelId: channels, appToken: cfg.slackAppToken as string, catchupMs: resolveCatchupSeconds(cfg.slackSocketCatchupSeconds) * 1000 });
    res = await slackSocket.start();
    if (!res.ok) { slackSocket.stop(); slackSocket = null; slackLog('failed', { mode: ready.mode, error: res.error ?? 'unknown' }); return res; }
  }
  // The reply endpoint for the temps' helper and the done poller run in every
  // way; the webhook branch above starts them inside startSlackServer.
  await startSlackReplyServer();
  startSlackDoneObserver();
  analytics.trackFeature('slack_trigger');
  slackLog('started', { mode: ready.mode });
  return res;
}

/** Stop every way, and drop a retry that was owed. Safe when nothing runs. */
function stopSlackIngestion(): void {
  slackRetry.cancel();
  stopSlackWays();
}

/** The stop a start does first. It leaves the retry alone: the start that
 *  called it reports its own outcome. */
function stopSlackWays(): void {
  const wasRunning = slackPoller != null || slackSocket != null || slackServer != null;
  try { slackPoller?.stop(); } catch (e) { console.error('[slack] poller stop failed:', e); }
  slackPoller = null;
  try { slackSocket?.stop(); } catch (e) { console.error('[slack] socket stop failed:', e); }
  slackSocket = null;
  stopSlackServer();
  if (wasRunning) slackLog('stopped');
}

/** What Settings and the Inbox draw. Fields a way does not have are absent. */
function slackStatusNow(): SlackStatus {
  const cfg = readConfig();
  const mode = resolveSlackMode(cfg);
  const tempsLive = [...liveWorkers.values()].filter((w) => !!w.slack).length;
  if (slackPoller) {
    const s = slackPoller.status();
    return { running: s.running, mode, team: s.team, botName: s.botName, lastPollAt: s.lastPollAt, nextPollAt: s.nextPollAt, lastError: s.lastError, hotThreads: s.hotThreads, tempsLive };
  }
  if (slackSocket) {
    const s = slackSocket.status();
    return {
      running: s.running, mode, team: s.team, botName: s.botName, socketConnectedAt: s.connected ? s.connectedAt : undefined, lastCatchupAt: s.lastCatchupAt, lastError: s.lastError, hotThreads: s.hotThreads, tempsLive,
      ...(s.liveMissing ? { liveMissing: s.liveMissing } : {}),
      ...(s.catchupError ? { catchupError: s.catchupError } : {})
    };
  }
  // Nothing runs: say WHY it cannot start, so a surface drawing this status
  // can name the missing field instead of a silent Off (the founder's morning,
  // 6 Sep 2026: enabled with no channel looked exactly like healthy-but-quiet).
  // 0.5.6: a start that failed says so here, with when it is tried again.
  const retry = slackRetry.state();
  const failedStart = retry.error !== undefined ? { lastError: slackStartFailedText(retry.error), retryAt: retry.retryAt } : {};
  return { running: slackServer != null, mode, url: lastSlackUrl, ...(slackServer?.boundPort() ?? {}), tempsLive, configError: slackReadiness(cfg).error, ...failedStart };
}

/**
 * Test the connection, starting nothing and saving nothing.
 *
 * This is the ONE control that is allowed to run on an incomplete config,
 * because it exists to say what is incomplete. It is deliberately not gated on
 * `slackReadiness`: gating the diagnostic on the fault it diagnoses left the
 * founder on a screen that said Not connected and offered nothing to press
 * (7 Sep 2026). Whatever it can check it checks, and it names what it could not
 * reach rather than refusing at the door.
 *
 * `draft` is what is on screen. Testing the field you just pasted, rather than
 * whatever was last written to disk, is the difference between a diagnostic and
 * a save with extra steps.
 *
 * It also fetches the channel list, so the same press that proves the token
 * works is the one that removes the channel question entirely.
 */
async function slackTestNow(draft?: SlackTestDraft): Promise<SlackTestResult> {
  const cfg = readConfig();
  const mode = draft?.mode ?? resolveSlackMode(cfg);
  const botToken = (draft?.botToken ?? cfg.slackBotToken ?? '').trim();
  const appToken = (draft?.appToken ?? cfg.slackAppToken ?? '').trim();
  const signingSecret = (draft?.signingSecret ?? cfg.slackSigningSecret ?? '').trim();

  // What the chosen way still lacks, in the form's own words and its own order.
  // Filled in first so an early return still carries it.
  const missing: string[] = [];
  if (mode === 'webhook' && !signingSecret) missing.push('signing secret');
  if (mode !== 'webhook' && !botToken) missing.push('bot token');
  if (mode === 'socket' && !appToken) missing.push('app token');

  const out: SlackTestResult = { ok: false, ...(missing.length ? { missing } : {}) };

  if (!botToken) {
    // The webhook can be configured with no bot token at all (it only needs the
    // secret to receive), so this is not always a failure of the way itself.
    out.error = 'no bot token to test yet';
    out.ok = mode === 'webhook' && missing.length === 0;
    return out;
  }

  const auth = await slackAuthTest(botToken);
  // Scopes first: they arrive on the response header, so a token that is real
  // but under-scoped can still say which permission it lacks. Naming the one
  // thing left to grant beats printing a correct list to diff by eye.
  if (auth.scopes) {
    out.grantedScopes = auth.scopes;
    out.missingScopes = SLACK_BOT_SCOPES[mode].filter((s) => !auth.scopes?.includes(s));
  }
  if (!auth.ok) { out.error = auth.error ?? 'auth.test failed'; return out; }
  out.team = auth.team;
  out.botName = auth.botName;
  out.ok = missing.length === 0;

  // The channel list, best effort. A workspace that will not grant the read
  // scopes still works; it just goes back to being asked for an id.
  const chans = await slackListChannels(botToken);
  if (chans.ok) out.channels = chans.channels;
  else if (chans.needsScope) out.channelsNeedScope = true;
  else out.channelsError = chans.error;

  if (mode === 'socket') {
    if (!appToken) { out.socket = { ok: false, error: 'missing app token' }; out.ok = false; return out; }
    const sock = await slackConnectionsOpenTest(appToken);
    out.socket = sock;
    if (!sock.ok) out.ok = false;
  }
  return out;
}

// ─── Generic inbound webhook + status API (multi-endpoint) ───────────────────
/** The running generic-webhook server, or null when disabled/stopped. A PUBLIC
 *  (tunnel-forwarded) surface — secret-gated, unlike the loopback /reply. ONE
 *  server and ONE tunnel serve EVERY configured endpoint; the id in the request
 *  path picks which. Adding a webhook therefore costs no port and no tunnel, and
 *  never disturbs a caller already pointed at another endpoint's URL. */
let webhookServer: WebhookServer | null = null;
/** Last public tunnel URL handed out — retained so Settings can re-show the
 *  endpoint after a reopen (the tunnel rotates it per restart). */
let lastWebhookUrl: string | undefined;
/** 0.5.3 (founder retest 25 Sep, "the address takes a while"): Settings shows
 *  "Creating address" while a start is under way, and the reason in red when
 *  the last start failed (a port, the tunnel), with a retry. */
let webhookStarting = false;
let lastWebhookError: string | undefined;

/** Local port the shared server binds to. The port is a property of the SERVER,
 *  not of any one trigger — `webhookPort` stays the (legacy) override. */
const WEBHOOK_DEFAULT_PORT = 3849;

/** The endpoints the operator has switched on. A disabled webhook is not merely
 *  rejected at the door — it is never handed to the server, so its id does not
 *  exist on the wire and its secret is not in memory on the request path. */
function enabledWebhookEndpoints(): WebhookTrigger[] {
  return (readConfig().webhookTriggers ?? []).filter((t) => t.enabled && !!t.secret);
}

/** SHA-256 hex of a capability token. The raw token is returned to the caller
 *  exactly once (the POST response) and never persisted; only this digest lands
 *  on the kanban card, so a GET can match without the raw token ever resting. */
function hashWebhookToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** tokenHash → id of the `pending` history entry it belongs to.
 *
 *  A message the mode gate held has NO kanban card (the card is what approval
 *  creates), so this map is the only way its caller's GET can be answered — and
 *  answered HONESTLY, as "awaiting-approval" rather than a lie about queued work.
 *  It stores the token's DIGEST, never the token, exactly like the card stamp,
 *  and it is mirrored into the durable kv store so a restart doesn't 404 every
 *  caller that is still politely waiting on the operator. */
let heldWebhookTokens: Map<string, string> | null = null;
const HELD_TOKENS_KV_KEY = 'triggers.webhook.heldTokens';

function heldTokens(): Map<string, string> {
  if (heldWebhookTokens) return heldWebhookTokens;
  let stored: Record<string, string> | undefined;
  try { stored = persist.getKv<Record<string, string>>(HELD_TOKENS_KV_KEY); }
  catch { stored = undefined; }
  const entries = stored && typeof stored === 'object' ? Object.entries(stored) : [];
  heldWebhookTokens = new Map(entries.filter((e): e is [string, string] => typeof e[1] === 'string'));
  return heldWebhookTokens;
}

function persistHeldTokens(): void {
  try { persist.setKv(HELD_TOKENS_KV_KEY, Object.fromEntries(heldTokens())); }
  catch (e) { console.error('[webhook] could not persist held-token map:', e); }
}

/** Drop mappings whose history entry has aged out of the (capped) ledger — the
 *  operator can no longer decide them, so their tokens are dead weight. */
function pruneHeldTokens(): void {
  const map = heldTokens();
  if (map.size === 0) return;
  const live = new Set(listTriggerHistory().map((e) => e.id));
  let changed = false;
  for (const [hash, entryId] of [...map]) {
    if (!live.has(entryId)) { map.delete(hash); changed = true; }
  }
  if (changed) persistHeldTokens();
}

/** The token digest a held history entry was accepted under, if we still have it. */
function heldTokenHashFor(entryId: string): string | undefined {
  for (const [hash, id] of heldTokens()) if (id === entryId) return hash;
  return undefined;
}

/** Tell the Triggers tab its ledger moved, so history live-refreshes instead of
 *  waiting for the operator to re-open the tab. */
function notifyTriggerHistoryUpdated(): void {
  try { liveWebContents()?.send('triggerHistory:updated'); } catch { /* window gone */ }
}

/**
 * Create the stamped kanban card for an inbound message and route it to god.
 *
 * Split out of `handleWebhookMessage` because the APPROVAL path takes exactly
 * this route later — an operator saying yes must produce the same card and the
 * same god request an auto-allowed message would have, or the two paths drift
 * and "approved" quietly means something weaker than "allowed".
 *
 * Returns false only when the card — the thing the caller polls — could not be
 * written. The god routing is best-effort: the card already exists and is
 * pollable even if the send hiccups.
 */
function dispatchWebhookWork(arg: {
  taskId: string;
  title: string;
  message: string;
  /** Stamped onto the card so a GET can match the caller's token. */
  tokenHash?: string;
  /** 'webhook' | 'org' — only for the subject line and the god-facing note. */
  origin: 'webhook' | 'org';
  /** The endpoint's standing instruction and guardrails switch (0.4.9 phase 4).
   *  Passed in rather than looked up here, because BOTH callers already hold the
   *  endpoint and only one of them can still find it: by the time an operator
   *  approves a held message the endpoint may have been renamed or deleted. */
  prompt?: string;
  guardrails?: boolean;
  /** The endpoint's own answering agent (0.5.3); absent is the webhook
   *  default, `webhookResponder`, and that absent is the orchestrator. */
  to?: string;
}): boolean {
  // Who gets it (0.5.3, founder 24 Sep: "the message will be sent to that
  // particular agent which is set"). Resolved against the agents that can take
  // mail now, so a gone or archived choice falls back to the orchestrator and
  // the message is never lost. The org origin has no picker: always god.
  // 0.5.6: the choice may be a temp (`temp`, or `temp:<agent id>` for a clone).
  // Then the same card and the same briefing go to a new temp, not an inbox.
  const receiver: Receiver = arg.origin === 'webhook'
    ? resolveWebhookReceiver(arg.to, readConfig().webhookResponder, selectBroadcastTargets(hive.registry().agents, ''), cloneableAgentIds(), 'god')
    : { kind: 'agent', id: 'god' };
  const to = receiver.kind === 'agent' ? receiver.id : 'god';
  // A temp's id comes from the card id, so the card is its from the start.
  const tempId = receiver.kind === 'temp' ? inboundWorkerId(inboundRequestId('webhook', arg.taskId)) : undefined;
  try {
    const card: HiveTask = {
      id: arg.taskId,
      title: arg.title,
      description: arg.message,
      ...(tempId ? { assignee: tempId } : {}),
      status: 'todo',
      dependsOn: [],
      priority: 1,
      createdAt: new Date().toISOString(),
      ...(arg.tokenHash ? { webhook: { tokenHash: arg.tokenHash } } : {})
    };
    // addTask appends against the latest on-disk ledger and is idempotent by task
    // id, so a concurrent card writer (Slack, god, voice, another webhook) can't
    // have its card lost to our stale whole-ledger overwrite. (writeTasks(...existing)
    // recreated exactly that race.) A fresh taskId never collides, so this always adds.
    hive.addTask(card);
  } catch (e) {
    console.error('[webhook] could not create task card:', e instanceof Error ? e.message : e);
    return false;
  }
  // Body carries the endpoint's guardrails, its standing instruction, the
  // sender's message and the card id (so whoever finishes it updates that
  // card's status/result for the caller's GET) — never the secret, never the
  // raw token. Built by webhookBriefing so the auto-allowed and the approved
  // path cannot say different things.
  const mail = {
    subject: `[${arg.origin}] ${arg.title}`,
    body: webhookBriefing({ message: arg.message, taskId: arg.taskId, origin: arg.origin, prompt: arg.prompt, guardrails: arg.guardrails })
  };
  // 0.5.6: who has it, for the caller's Activity line (logWebhookTaken): the
  // temp, unless it cannot be queued; then the agent mailed below.
  webhookTaker = tempId ? { taskId: arg.taskId, agentId: tempId, temp: true } : null;
  // A temp as the receiver (0.5.6): its job is that subject and that body, so
  // it is told the same card to close and the caller's status check reads the
  // same. When the temp cannot be queued the orchestrator takes the mail
  // below, and the card is nobody's again.
  if (receiver.kind === 'temp') {
    try {
      queueTempFor({ source: 'webhook', id: arg.taskId, title: mail.subject, message: mail.body, cloneOf: receiver.cloneOf, taskId: arg.taskId });
      return true;
    } catch (e) {
      console.error('[webhook] could not queue a temp:', e instanceof Error ? e.message : e);
      try { hive.patchTask(arg.taskId, { assignee: undefined }); } catch { /* the card is bookkeeping */ }
    }
  }
  try {
    hive.send({
      to,
      act: 'request',
      ...mail,
      requires_reply: false
    }, 'webhook');
  } catch (e) {
    console.error('[webhook] could not route to god:', e instanceof Error ? e.message : e);
  }
  webhookTaker = { taskId: arg.taskId, agentId: to, temp: false };
  return true;
}

/** Who dispatchWebhookWork last gave a call to. It runs synchronously and its
 *  caller reads this straight after (logWebhookTaken), so it is that call's. */
let webhookTaker: { taskId: string; agentId: string; temp: boolean } | null = null;

/** One `webhook-call` line in the hive log, for the webhook's Activity tab
 *  (0.5.6): which webhook, what became of the call, who got it. Never the
 *  body, a header or the secret. A call from no webhook writes nothing. */
function logWebhookCall(webhookId: string | undefined, outcome: 'sent' | 'approved' | 'held' | 'declined' | 'done' | 'refused', more: Record<string, unknown> = {}): void {
  if (!webhookId) return;
  try { hive.appendLog({ kind: 'webhook-call', webhookId, outcome, ...more }); } catch { /* hive not bootstrapped yet */ }
}
/** The line for a call dispatchWebhookWork just took: the temp or the agent
 *  that has it. */
function logWebhookTaken(webhookId: string | undefined, taskId: string, outcome: 'sent' | 'approved'): void {
  const t = webhookTaker?.taskId === taskId ? webhookTaker : null;
  webhookTaker = null;
  if (t) logWebhookCall(webhookId, outcome, t.temp ? { agentId: t.agentId, temp: true } : { agentId: t.agentId });
}
/** A caller with a wrong secret writes one refused line per status in ten
 *  seconds, not one per request. */
const webhookRefusalGate = refusalGate();

/**
 * A verified POST, run through the endpoint's TriggerMode.
 *
 * `isAutoAllowed(mode, kind)` is the whole gate. When it says yes this behaves
 * exactly as the single-endpoint server always did — card, god request, capability
 * token. When it says no NOTHING reaches the hive: the message is written to the
 * ledger as `pending` and sits there until the operator decides, and the caller
 * is handed its token plus a 202 so it can watch the hold rather than believe
 * work started.
 *
 * Either way an `inbound` history row is recorded. The secret never reaches here
 * (the server hands over `{id,name}` only) and no credential is ever written to
 * the ledger.
 */
function handleWebhookMessage(msg: WebhookInbound, endpoint: WebhookEndpointRef): WebhookDispatch | null {
  // 192-bit unguessable token, returned once; only its hash is stored.
  const token = randomBytes(24).toString('hex');
  const tokenHash = hashWebhookToken(token);
  const full = msg.title ?? msg.message;
  const title = full.length > 80 ? `${full.slice(0, 79)}…` : full;

  const trigger = (readConfig().webhookTriggers ?? []).find((t) => t.id === endpoint.id);
  // An endpoint that vanished between the request and this lookup falls back to
  // the STRICTEST mode, never the most permissive one.
  const mode: TriggerMode = trigger?.mode ?? DEFAULT_TRIGGER_MODE;
  // The caller's own declaration wins; `classifyInboundKind` is the conservative
  // guess for callers that don't declare (it leans 'directive' on purpose).
  const kind: InboundKind = msg.kind ?? classifyInboundKind(msg.message);
  const peer = msg.from?.trim() || endpoint.name || endpoint.id;
  // Minted here, not derived from the task id, because a HELD message has no task
  // id yet and must still be pairable with the reply it eventually earns.
  const correlationId = randomBytes(8).toString('hex');

  const base = {
    source: 'webhook' as const,
    sourceId: endpoint.id,
    sourceName: endpoint.name,
    direction: 'inbound' as const,
    peer,
    title,
    body: msg.message,
    kind,
    correlationId
  };

  if (!isAutoAllowed(mode, kind)) {
    const entry = appendTriggerHistory({ ...base, decision: 'pending' });
    heldTokens().set(tokenHash, entry.id);
    persistHeldTokens();
    notifyTriggerHistoryUpdated();
    logWebhookCall(endpoint.id, 'held');
    return { token, pending: true };
  }

  const taskId = `webhook-${randomBytes(8).toString('hex')}`;
  if (!dispatchWebhookWork({ taskId, title, message: msg.message, tokenHash, origin: 'webhook', prompt: trigger?.prompt, guardrails: trigger?.guardrails, to: trigger?.to })) return null;
  logWebhookTaken(endpoint.id, taskId, 'sent');
  appendTriggerHistory({ ...base, decision: 'auto-allowed', taskId });
  notifyTriggerHistoryUpdated();
  return { token, taskId, pending: false };
}

/** Resolve a capability token to its task's public status — scoped to the ONE
 *  card (or the ONE held message) whose stored hash matches; never lists or leaks
 *  any other task. Returns null for any non-match (the server answers 404 either
 *  way, so a probe can't tell "unknown" from "malformed"). */
function lookupWebhookStatus(token: string): WebhookTaskStatus | null {
  const hash = hashWebhookToken(token);

  // Held messages first — they have no card, and the O(1) hit keeps the common
  // "still waiting" poll off the task scan entirely.
  const heldEntryId = heldTokens().get(hash);
  if (heldEntryId) {
    const entry = listTriggerHistory().find((e) => e.id === heldEntryId);
    if (!entry) { heldTokens().delete(hash); persistHeldTokens(); return null; }
    if (entry.decision === 'pending') {
      return { status: 'awaiting-approval', title: entry.title ?? '' };
    }
    if (entry.decision === 'rejected') {
      return { status: 'rejected', title: entry.title ?? '' };
    }
    // Approved: the release stamped this hash onto a real card, so fall through.
  }

  const wanted = Buffer.from(hash);
  let tasks: HiveTask[];
  try {
    const ledger = hive.tasks() as { tasks?: HiveTask[] };
    tasks = Array.isArray(ledger?.tasks) ? ledger.tasks : [];
  } catch { return null; }
  for (const t of tasks) {
    const h = t.webhook?.tokenHash;
    if (!h) continue;
    const have = Buffer.from(h);
    // Both are fixed-length sha-256 hex; compare in constant time defensively.
    if (have.length === wanted.length && timingSafeEqual(have, wanted)) {
      return { status: t.status, title: t.title, result: t.result };
    }
  }
  return null;
}

// ─── Webhook done-observer (the OUTBOUND half of the trigger ledger) ─────────
// Mirrors `pollSlackDoneTasks`: watch the kanban for webhook-origin cards that
// reach 'done' and write the reply side of the conversation, tagged with the
// inbound row's correlationId so the UI can pair request ↔ response.
//
// Unlike the Slack poller there is no "baseline" of already-done ids: the LEDGER
// is the record of what we've already paired, so a card that finished while the
// app was closed still gets its outbound row on the next boot, and re-seeding
// from the ledger makes a duplicate impossible.
let webhookDoneTimer: ReturnType<typeof setInterval> | null = null;
let webhookOutboundRecorded: Set<string> | null = null;

function seedWebhookOutbound(): Set<string> {
  const seen = new Set<string>();
  try {
    for (const e of listTriggerHistory()) {
      if (e.direction === 'outbound' && e.taskId) seen.add(e.taskId);
    }
  } catch { /* unreadable ledger → treat as empty; appends are still deduped by taskId */ }
  return seen;
}

function pollWebhookDoneTasks(): void {
  let tasks: HiveTask[];
  try {
    const ledger = hive.tasks() as { tasks?: HiveTask[] };
    tasks = Array.isArray(ledger?.tasks) ? ledger.tasks : [];
  } catch { return; } // unreadable/missing tasks.json → skip this tick
  const done = tasks.filter((t) =>
    t.status === 'done' && (t.webhook != null || t.id.startsWith('webhook-')));
  if (done.length === 0) return;
  const recorded = webhookOutboundRecorded ?? (webhookOutboundRecorded = seedWebhookOutbound());
  const fresh = done.filter((t) => !recorded.has(t.id));
  if (fresh.length === 0) return;

  const history = listTriggerHistory();
  let wrote = false;
  for (const t of fresh) {
    const inbound = history.find((e) => e.direction === 'inbound' && e.taskId === t.id);
    // No inbound row = a card from before the ledger existed. Nothing to pair it
    // with, so mark it handled rather than writing a half of a conversation.
    if (!inbound) { recorded.add(t.id); continue; }
    appendTriggerHistory({
      source: inbound.source,
      sourceId: inbound.sourceId,
      sourceName: inbound.sourceName,
      direction: 'outbound',
      peer: inbound.peer,
      title: t.title,
      body: (t.result ?? '').trim() || '(finished with no result recorded)',
      kind: inbound.kind,
      correlationId: inbound.correlationId,
      taskId: t.id
    });
    if (inbound.source === 'webhook') logWebhookCall(inbound.sourceId, 'done');
    recorded.add(t.id);
    wrote = true;
  }
  if (wrote) notifyTriggerHistoryUpdated();
}

/** Begin watching the kanban for webhook-origin done-transitions (idempotent). */
function startWebhookDoneObserver(): void {
  if (webhookDoneTimer) return;
  webhookOutboundRecorded = seedWebhookOutbound();
  webhookDoneTimer = setInterval(() => {
    try { pollWebhookDoneTasks(); } catch (e) { console.error('[webhook] done-observer:', e); }
  }, 5000);
}

/** Stop watching the kanban. Safe to call when not running. */
function stopWebhookDoneObserver(): void {
  if (webhookDoneTimer) { clearInterval(webhookDoneTimer); webhookDoneTimer = null; }
  webhookOutboundRecorded = null;
}

/** Build the shared WebhookServer from the enabled endpoints and start it. A
 *  server that is already up is RE-POINTED rather than restarted (see
 *  `reconcileWebhookServer`): restarting would mint a fresh tunnel URL and break
 *  every other endpoint's caller. The public tunnel is opened only here — never
 *  on a default; a webhook reaches the wire only once the operator enables it. */
async function startWebhookServer(): Promise<{ ok: boolean; url?: string; error?: string }> {
  const endpoints = enabledWebhookEndpoints();
  if (endpoints.length === 0) return { ok: false, error: 'no enabled webhook endpoints' };
  if (webhookServer) {
    webhookServer.setEndpoints(endpoints);
    return { ok: true, url: webhookServer.publicUrl() ?? lastWebhookUrl };
  }
  pruneHeldTokens();
  const cfg = readConfig();
  const server = new WebhookServer({
    port: cfg.webhookPort && cfg.webhookPort > 0 ? cfg.webhookPort : WEBHOOK_DEFAULT_PORT,
    endpoints,
    onMessage: handleWebhookMessage,
    lookupStatus: lookupWebhookStatus,
    // A service's retry of a delivery already taken (Telegram's update_id,
    // GitHub's x-github-delivery) answers 200 "duplicate delivery" and makes no
    // second card or temp.
    replayWindowMs: WEBHOOK_REPLAY_WINDOW_MS,
    onRefused: (id, status) => { if (webhookRefusalGate(id, status)) logWebhookCall(id, 'refused', { status }); },
    // The tunnel was reopened at a new random address. Settings, the
    // Automations screen and connections/state.json read lastWebhookUrl. A
    // caller outside (a Telegram bot, Discord, GitHub) still holds the old one.
    onTunnelUrl: (url) => {
      if (webhookServer !== server) return;
      lastWebhookUrl = url;
      console.warn(`[webhook] tunnel reopened at ${url}; outside callers need the new address`);
      try { liveWebContents()?.send('webhooks:changed'); } catch { /* window gone */ }
    }
  });
  webhookServer = server;
  webhookStarting = true;
  lastWebhookError = undefined;
  let res: Awaited<ReturnType<WebhookServer['start']>>;
  try { res = await server.start(); } finally { webhookStarting = false; }
  if (!res.ok) lastWebhookError = res.error ?? 'could not start';
  // ok:false covers BOTH "never bound the port" (fatal → drop the instance) and
  // "bound fine, tunnel unavailable" (the security boundary is live and must stay
  // reachable/stoppable — dropping it there would leak an unstoppable listener).
  if (!res.ok && !server.listening()) { webhookServer = null; return res; }
  // 0.5.3, the rest of bug 11: a taken port moves the server instead of leaving
  // every webhook off. Tunnel callers are unaffected; a LOCAL caller pointed at
  // the configured port is, so say it here and in Settings (webhooks:status).
  // Bug 11's second cause (the instance dropped without being stopped) does not
  // exist here: the line above keeps a bound server so it stays stoppable.
  if (res.movedFrom !== undefined) console.warn(`[webhook] port ${res.movedFrom} was in use; listening on ${res.port} instead. A local caller must use ${res.port} for this session.`);
  analytics.trackFeature('webhook_trigger');
  if (res.url) lastWebhookUrl = res.url;
  startWebhookDoneObserver();
  return res;
}

/** Bring the running server in line with config after any webhook mutation.
 *  Live endpoint swap when it's up, start when the enabled set becomes non-empty,
 *  stop when it empties. Never restarts a healthy server. */
function reconcileWebhookServer(): void {
  const endpoints = enabledWebhookEndpoints();
  if (endpoints.length === 0) { stopWebhookServer(); return; }
  if (webhookServer) { webhookServer.setEndpoints(endpoints); return; }
  void startWebhookServer().then((r) => {
    if (!r.ok) console.error('[webhook] start failed:', r.error);
    else console.log('[webhook] listening', r.url ? `(tunnel: ${r.url})` : '(no tunnel)');
  });
}

/** Per-endpoint public URLs for the settings surface's copy button. Empty string
 *  when no tunnel has ever come up — the UI shows the endpoint, just not a URL
 *  it could hand out yet. */
function webhookEndpointUrls(): { id: string; url: string }[] {
  const base = (webhookServer?.publicUrl() ?? lastWebhookUrl ?? '').replace(/\/+$/, '');
  return (readConfig().webhookTriggers ?? []).map((t) => ({
    id: t.id,
    url: base ? `${base}/${encodeURIComponent(t.id)}` : ''
  }));
}

/** Stop and forget the webhook server. Best-effort; safe when not running. The
 *  last tunnel URL is retained so Settings keeps showing it. */
function stopWebhookServer(): void {
  try { webhookServer?.stop(); } catch (e) { console.error('[webhook] stop failed:', e); }
  webhookServer = null;
  lastWebhookError = undefined;
  // The done-observer deliberately OUTLIVES the server (it is a ledger concern,
  // not a transport one) — it is torn down with the process/hive, not here.
}

/** The persisted main-window geometry (kv key `window.bounds`). */
interface WindowBounds { x?: number; y?: number; width: number; height: number }

const DEFAULT_WIN = { width: 1440, height: 900 };
const MIN_WIN = { width: 1280, height: 800 };

/** Validate + clamp restored bounds: enforce the minimum size, and drop a
 *  position that no longer lands on any connected display (monitor unplugged) so
 *  the window can't open off-screen. Returns null for unusable input. */
function clampBounds(b: unknown): WindowBounds | null {
  if (!b || typeof b !== 'object') return null;
  const r = b as Partial<WindowBounds>;
  if (typeof r.width !== 'number' || typeof r.height !== 'number') return null;
  const width = Math.max(MIN_WIN.width, Math.round(r.width));
  const height = Math.max(MIN_WIN.height, Math.round(r.height));
  if (typeof r.x !== 'number' || typeof r.y !== 'number') return { width, height };
  const x = Math.round(r.x), y = Math.round(r.y);
  // Keep the position only if the window rect overlaps some display's work area.
  const onScreen = screen.getAllDisplays().some((d) => {
    const wa = d.workArea;
    return x < wa.x + wa.width && x + width > wa.x && y < wa.y + wa.height && y + height > wa.y;
  });
  return onScreen ? { x, y, width, height } : { width, height };
}

/** Minimal trailing-edge debounce for the move/resize flood. */
function debounce(fn: () => void, ms: number): () => void {
  let t: NodeJS.Timeout | null = null;
  return () => { if (t) clearTimeout(t); t = setTimeout(() => { t = null; fn(); }, ms); };
}

/** Cascade a new floor off the focused window so it doesn't stack exactly on
 *  top, clamped on-screen (clampBounds drops an off-display position). */
function floorCascade(): WindowBounds | null {
  const base = (mainWindow && !mainWindow.isDestroyed())
    ? mainWindow
    : [...allWindows].find((w) => !w.isDestroyed());
  if (!base) return null;
  const b = base.getBounds();
  const OFFSET = 36;
  return clampBounds({ x: b.x + OFFSET, y: b.y + OFFSET, width: b.width, height: b.height });
}

// ─── Shareable hires: munderdifflin:// deep link + file import ──────────────
// A hire manifest NEVER auto-spawns: it is validated, then handed to the
// renderer, which pre-fills the Add-Agent modal for human review. See
// src/shared/hire.ts for the spec + security model.

/** Manifests that arrived before the renderer was ready to receive them.
 *  The renderer PULLS these via hire:drainPending once its subscription is
 *  mounted — main never pushes blind, so a fast-loading packaged renderer
 *  can't lose a deep link to a startup race. */
const pendingHires: HireManifest[] = [];
let rendererReadyForHires = false;

function deliverHire(manifest: HireManifest): void {
  if (rendererReadyForHires && mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send('hire:import', manifest);
  } else {
    pendingHires.push(manifest);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }
  }
}

async function handleHireLink(link: string): Promise<void> {
  const src = parseHireDeepLink(link);
  if (!src) { console.warn('[hire] ignoring malformed deep link'); return; }
  const res = await fetchHireManifest(src);
  if (!res.ok) {
    console.error('[hire] deep link rejected:', res.error);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('hire:error', { error: res.error });
    }
    return;
  }
  deliverHire(res.manifest);
  analytics.trackFeature('hire_install');
}
function handleDeepLink(link: string): void {
  void handleHireLink(link);
}

// Register the protocol. In dev (electron .) Windows needs the explicit
// exe+args form or the registration points at electron.exe with no entry.
// A floor never registers: deep links belong to the main install (B23 part 2).
if (isFloorProcess()) {
  /* the main install owns munderdifflin:// */
} else if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('munderdifflin', process.execPath, [resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('munderdifflin');
}

// Deep links on Windows/Linux arrive as the argv of a SECOND process — take the
// single-instance lock and forward them to the running instance. (macOS gets
// the 'open-url' event instead.) The lock also rules out two harnesses fighting
// over the same hive, which was previously possible but never useful.
const gotInstanceLock = app.requestSingleInstanceLock();
if (!gotInstanceLock) {
  allowQuit = true;
  app.quit();
  // app.quit() only REQUESTS teardown. If 'ready' still fires for this losing
  // process before that teardown completes, the unguarded whenReady() below
  // runs bootstrapHiveServices() a second time, and markStoppedAtBoot()
  // there marks stopped every agent this new process has no PTY for: every live
  // agent the real instance owns. This process owns nothing yet, so leave now
  // and give that race no window at all.
  process.exit(0);
} else {
  app.on('second-instance', (_evt, argv) => {
    if (process.platform === 'darwin' && primaryWindow === null) createWindow();
    else if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    const link = argv.find((a) => a.startsWith('munderdifflin://'));
    if (link) handleDeepLink(link);
  });
}

// A window of this app shows this app's own page and nothing else (navigationGuard.ts). Put on
// every contents as it is made, so no window can be added without it. The dev server's address
// counts as ours only in a run that is not packaged.
app.on('web-contents-created', (_evt, contents) => {
  guardNavigation(
    contents,
    { rendererUrl, rendererDir: join(__dirname, '../renderer') },
    (url) => { void shell.openExternal(url); }
  );
});

app.on('open-url', (evt, url) => {
  evt.preventDefault();
  handleDeepLink(url);
});

ipcMain.handle('hire:drainPending', () => {
  rendererReadyForHires = true;
  const out = pendingHires.splice(0, pendingHires.length);
  return out;
});

// IPC: "import hires…" file picker in the Add-Agent modal. Every selected file
// is validated independently; valid neighbours survive an invalid manifest.
ipcMain.handle('hire:openFile', async () => {
  const res = await dialog.showOpenDialog({
    title: 'Import hire manifests',
    filters: [{ name: 'Hire manifest', extensions: ['json'] }],
    properties: ['openFile', 'multiSelections']
  });
  if (res.canceled || res.filePaths.length === 0) {
    return { ok: false, manifests: [], errors: [], error: 'cancelled' };
  }
  const batch = readHireManifestFiles(res.filePaths);
  return {
    ok: batch.manifests.length > 0,
    ...batch,
    error: batch.manifests.length === 0 ? 'no valid hire manifests selected' : undefined
  };
});

// Which office is which (0.5.3, founder 25 Sep): every floor is the same app,
// so the Dock shows one icon and one name per office. The main install is 1,
// a floor takes the lowest free number from 2; with more than one office open
// each gets "Munder Difflin N" as its window title and N as a Dock badge. One
// office alone keeps the plain name and no badge (floorNumber.ts).
let officeNumber = 1;
let officeTimer: ReturnType<typeof setInterval> | null = null;
function officeTitle(): string {
  return windowTitle(officeNumber, liveOfficeCount(sharedDataDir(), pidAlive));
}
function applyOfficeLabel(): void {
  try {
    const live = liveOfficeCount(sharedDataDir(), pidAlive);
    const { badge } = officeLabel(officeNumber, live);
    const title = windowTitle(officeNumber, live);
    for (const w of allWindows) {
      if (w.isDestroyed()) continue;
      if (w.getTitle() !== title) w.setTitle(title);
    }
    if (process.platform === 'darwin' && app.dock && app.dock.getBadge() !== badge) app.dock.setBadge(badge);
  } catch { /* a label is never worth a crash */ }
}
if (gotInstanceLock) {
  app.whenReady().then(() => {
    officeNumber = claimFloorNumber(sharedDataDir(), { floor: isFloorProcess(), dataDir: app.getPath('userData'), pid: process.pid }, pidAlive);
    applyOfficeLabel();
    // Another office opening or closing changes this one's label too.
    officeTimer = setInterval(applyOfficeLabel, 4000);
  });
  app.on('browser-window-created', () => setImmediate(applyOfficeLabel));
  app.on('will-quit', () => { if (officeTimer) clearInterval(officeTimer); releaseFloorNumber(sharedDataDir(), process.pid); });
}

/**
 * Create a window. The PRIMARY window (no opts) restores saved geometry, uses
 * the default session, runs the hive, and keeps the existing app-quit warning.
 * A FLOOR window (`{ floor: true }`) gets its own persistent session partition
 * — isolating its renderer state (agents/queues/selection) from every other
 * window — cascades its position, and on close stops only its OWN terminals
 * while the app keeps running.
 */
/** The frame of an office or IDE window. The Mac keeps its hidden inset title bar: the traffic lights sit on our
 *  bar. On Windows and Linux there is no title bar and no menu row of the system's: our bar is the window's one
 *  top row, the system's minimise, maximise and close are drawn over its right end (titleBarOverlay) in the bar's
 *  colours, which the page sets as its theme and skin change (`window:controls`), and the menu opens from a
 *  button in the bar (`appMenu:popup`). The menu's shortcuts work as before. */
const WINDOW_BAR_HEIGHT = 38;
function windowFrame(): Pick<Electron.BrowserWindowConstructorOptions, 'titleBarStyle' | 'titleBarOverlay'> {
  if (process.platform === 'darwin') return { titleBarStyle: 'hiddenInset' };
  return { titleBarStyle: 'hidden', titleBarOverlay: { color: '#FFFDF5', symbolColor: '#3D2E4A', height: WINDOW_BAR_HEIGHT } };
}
/** Off the Mac, the menu row is never drawn (a Linux window would draw it under the hidden title bar); the menu
 *  stays the application's, so its shortcuts still work, and opens from our bar. */
function hideMenuRow(win: BrowserWindow): void {
  if (process.platform !== 'darwin') win.setMenuBarVisibility(false);
}
/** The windows that are floors. */
const floorContents = new WeakSet<Electron.WebContents>();
/** The main window while it is open; null once it has closed, undefined before the first. mainWindow is not this: it follows the focus and passes on when a window closes. */
let primaryWindow: BrowserWindow | null | undefined;
function createWindow(opts: { floor?: boolean } = {}): BrowserWindow {
  const isFloor = opts.floor === true;

  // Primary restores saved geometry; floors cascade off the focused window.
  let saved: WindowBounds | null = null;
  if (!isFloor) { try { saved = clampBounds(persist.getKv('window.bounds')); } catch { saved = null; } }
  const cascade = isFloor ? floorCascade() : null;
  const geom = cascade ?? saved;

  const win = new BrowserWindow({
    width: geom?.width ?? DEFAULT_WIN.width,
    height: geom?.height ?? DEFAULT_WIN.height,
    ...(geom && geom.x !== undefined && geom.y !== undefined ? { x: geom.x, y: geom.y } : {}),
    minWidth: MIN_WIN.width,
    minHeight: MIN_WIN.height,
    title: officeTitle(),
    backgroundColor: '#FFF8E7',
    ...windowFrame(),
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      // Keep Chromium's OS renderer sandbox active; privileged work stays behind
      // the narrow contextBridge/IPC surface owned by the main process.
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      // The renderer runs the hive's heartbeat loops (inbox nudge, message
      // flush, telemetry polls). Chromium throttles timers in occluded windows
      // — incl. behind the LOCK SCREEN — which silently stalls the hive while
      // the user is away. Don't.
      backgroundThrottling: false,
      // Each floor gets its OWN persistent session partition → isolated
      // localStorage so floors never share or stomp each other's office state.
      // The primary keeps the DEFAULT session so existing persisted state loads.
      ...(isFloor ? { partition: `persist:floor-${++floorSeq}` } : {})
    }
  });
  // The page's <title> would put the plain name back over the office number.
  win.on('page-title-updated', (e) => { e.preventDefault(); });
  hideMenuRow(win);

  // Capture the webContents once: after 'closed' the window is gone, but this
  // reference stays valid as the per-PTY ownership key.
  const wc = win.webContents;
  /** Read now: a destroyed webContents throws on `.id`, and 'closed' runs after. */
  const wcId = wc.id;

  // Renderer liveness. Installed BEFORE the first load so a crash during load
  // is caught too. A dead renderer used to leave this window mapped and frozen
  // forever, with the compositor's "Terminate" (which kills the whole agent
  // tree) as the only way out. See rendererHealth.ts.
  installWindowHealth(win, {
    label: isFloor ? 'floor' : 'primary',
    // A reload keeps the same webContents object, so PTY ownership and the
    // default sink stay valid; re-assert the sink anyway so the primary's
    // routing survives even if that ever stops being true.
    onReloaded: (next) => { if (!isFloor) ptyManager.attachWebContents(next); }
  });

  allWindows.add(win);
  if (isFloor) floorContents.add(wc);
  // Global timer events follow the user — the most-recently-focused window is
  // primary. The primary is also seeded synchronously so boot events route now.
  win.on('focus', () => { mainWindow = win; });
  if (!isFloor) { mainWindow = win; primaryWindow = win; }

  // The floor pauses while its OWN window is off screen: minimised, hidden,
  // Cmd+H, or (macOS) fully covered. Each window sends to its own renderer, never
  // to mainWindow (the last focused), so every floor follows its own window.
  // focus clears both flags: a focused window is on screen, so a missed 'show'
  // cannot leave a frozen floor in front of the person.
  windowVisibility.set(win, initialWindowVisibility(win.isVisible(), win.isMinimized()));
  const onVisibility = (ev: WindowVisibilityEvent) => {
    const next = nextWindowVisibility(windowVisibility.get(win) ?? initialWindowVisibility(true, false), ev);
    windowVisibility.set(win, next);
    if (!wc.isDestroyed()) wc.send('window:visibility', { hidden: windowHidden(next) });
  };
  win.on('minimize', () => onVisibility('minimize'));
  win.on('restore', () => onVisibility('restore'));
  win.on('hide', () => onVisibility('hide'));
  win.on('show', () => onVisibility('show'));
  win.on('focus', () => onVisibility('focus'));

  // Permission gate for the renderer (our own trusted, local content). The
  // only permission we constrain is microphone capture: open only while a
  // Realtime Michael voice session (`realtimeVoiceEnabled`, flipped on by the
  // session at start() before getUserMedia, off at stop()) is on. Every other
  // permission keeps the app's prior permissive behavior (e.g. clipboard for
  // xterm/editor copy must keep working).
  const micFeatureLive = (): boolean => readConfig().realtimeVoiceEnabled === true;
  const ses = win.webContents.session;
  ses.setPermissionRequestHandler((_wc, permission, callback, details) => {
    if (permission === 'media') {
      const mediaTypes = details && 'mediaTypes' in details ? details.mediaTypes : undefined;
      const wantsAudio = !mediaTypes || mediaTypes.includes('audio');
      callback(micFeatureLive() && wantsAudio);
      return;
    }
    callback(true);
  });
  ses.setPermissionCheckHandler((_wc, permission) => {
    if (permission === 'media') return micFeatureLive();
    return true;
  });

  // Only the primary persists geometry (kv `window.bounds`); floors cascade
  // fresh each launch. Skip while maximized/minimized so a restore doesn't save
  // the fullscreen rect.
  if (!isFloor) {
    const saveBounds = debounce(() => {
      if (win.isDestroyed() || win.isMinimized() || win.isMaximized()) return;
      try { persist.setKv('window.bounds', win.getBounds()); } catch { /* DB best-effort */ }
    }, 400);
    win.on('resized', saveBounds);
    win.on('moved', saveBounds);
    win.on('close', () => {
      if (win.isDestroyed() || win.isMinimized() || win.isMaximized()) return;
      try { persist.setKv('window.bounds', win.getBounds()); } catch { /* DB best-effort */ }
    });
  }


  win.once('ready-to-show', () => win.show());

  // A link that opens a new window (target=_blank, which the markdown renderer emits) goes to the
  // person's browser and never becomes a window of this app: navigationGuard.ts, on every contents.

  // Close interception when live PTYs exist. The red-X destroys the window;
  // intercept it the same way before-quit does so PTY users aren't surprised.
  win.on('close', (e) => {
    if (allowQuit) return;
    // Closing a window unmounts its IDE and every unsaved buffer in it.
    if (!confirmLosingIdeEdits(win, ideDirtyByWindow.get(wc.id) ?? 0)) { e.preventDefault(); return; }
    if (isFloor) {
      // A floor's close is NOT an app quit — confirm only its OWN terminals,
      // via a self-contained native dialog (no renderer modal). Confirming lets
      // the window close; its PTYs are stopped in the 'closed' handler.
      const owned = ptyManager.countByOwner(wc);
      if (owned > 0) {
        const choice = dialog.showMessageBoxSync(win, {
          type: 'warning',
          buttons: ['Close floor', 'Cancel'],
          defaultId: 1,
          cancelId: 1,
          message: `Close this floor? ${owned} running terminal${owned === 1 ? '' : 's'} on it will be stopped.`,
          detail: 'Other floors keep running.'
        });
        if (choice === 1) e.preventDefault();
      }
      return;
    }
    // Primary window, on the Mac, with another window of this app open: it closes
    // alone. Its terminals stop once it has closed, below, and only after asking.
    if (process.platform === 'darwin' && allWindows.size > 1) {
      const stopping = mainWindowTerminals(win).length;
      if (stopping > 0) {
        const choice = dialog.showMessageBoxSync(win, {
          type: 'warning',
          buttons: ['Close window', 'Cancel'],
          defaultId: 1,
          cancelId: 1,
          message: `Close this window? ${stopping} running terminal${stopping === 1 ? '' : 's'} on it will stop.`,
          detail: 'Your other windows stay open.'
        });
        if (choice === 1) e.preventDefault();
      }
      return;
    }
    // Primary window: the app-wide quit warning (renderer modal).
    const count = ptyManager.list().length;
    if (count === 0) return;
    // Same wedge as before-quit: with no renderer to draw the warning, cancelling
    // the close leaves a window that can never be closed. Let it go instead.
    if (!logQuitPromptDecision(win, 'window-close')) return;
    e.preventDefault();
    win.focus();
    wc.send('app:closeRequested', { ptyCount: count });
  });

  // The primary is the default PTY sink; floors route purely by per-PTY owner.
  if (!isFloor) ptyManager.attachWebContents(wc);

  // A main-frame reload unmounts the renderer's hire subscription — queue again
  // until the fresh renderer drains. Guard on isMainFrame: a stray sub-frame
  // navigation must NOT flip readiness off (the renderer only drains on mount,
  // so a later deep link would otherwise queue and sit until a full reload).
  win.webContents.on('did-start-navigation', (details) => {
    if (details.isMainFrame) rendererReadyForHires = false;
    // A reloaded page lost its unsaved IDE text; its count goes with it.
    if (details.isMainFrame && !details.isSameDocument) ideDirtyByWindow.forget(wcId);
  });

  if (rendererUrl) {
    win.loadURL(rendererUrl);
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'));
  }

  win.on('closed', () => {
    allWindows.delete(win);
    // Its unsaved IDE text went with it, so the next quit must not ask about it.
    ideDirtyByWindow.forget(wcId);
    // A closed floor must not leave its terminals running headless. (Natural
    // onExit teardown — archive + worktree cleanup — still runs per PTY.)
    if (isFloor) { try { ptyManager.killByOwner(wc); } catch { /* best-effort */ } }
    if (primaryWindow === win) {
      primaryWindow = null;
      if (process.platform === 'darwin' && !allowQuit && allWindows.size > 0) stopMainWindowTerminals(win);
    }
    if (mainWindow === win) {
      mainWindow = null;
      for (const w of allWindows) { if (!w.isDestroyed()) { mainWindow = w; break; } }
    }
    syncKeepAwake();
  });

  return win;
}

/** The terminals the main window stops when it closes alone: every one but
 *  those a floor still open on this computer owns. */
function mainWindowTerminals(win: BrowserWindow): string[] {
  const kept = new Set<Electron.WebContents>();
  for (const w of allWindows) {
    if (w !== win && !w.isDestroyed() && floorContents.has(w.webContents)) kept.add(w.webContents);
  }
  return ptyManager.list().map((p) => p.id).filter((id) => {
    const owner = ptyOwners.get(id);
    return !(owner && kept.has(owner));
  });
}

/** Stop them so that the main window can bring them back when it opens again, as
 *  after a quit. Not killByOwner: that leaves the exit handler on, and each would
 *  count as an agent that ended on its own, and lose a clean worktree. */
function stopMainWindowTerminals(win: BrowserWindow): void {
  for (const id of mainWindowTerminals(win)) {
    try {
      const temp = liveWorkers.get(id);
      if (temp) temp.result = 'stopped';
      keepDemandScreen(id);
      ptyManager.kill(id);
      teardownPty(id, temp ? 'worker' : 'revive');
      pendingInstallRelaunch.delete(id);
      endCliSetup(id);
      agentRuns.delete(id);
      endCodexHold(id);
    } catch (e) { console.error('[window] stop failed:', e); }
  }
}

/* end ide doors */

// The window's own frame off the Mac (windowFrame): the menu from our bar, and the system's window controls in
// our bar's colours and height. Window state only; the Mac answers no.
ipcMain.handle('appMenu:popup', (evt, at: unknown) => {
  const win = BrowserWindow.fromWebContents(evt.sender);
  const menu = Menu.getApplicationMenu();
  if (process.platform === 'darwin' || !win || !menu) return { ok: false };
  const p = at && typeof at === 'object' ? at as { x?: unknown; y?: unknown } : {};
  const px = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.round(v)) : undefined);
  // Answers when the menu closes, so the button is drawn pressed while it is open.
  return new Promise<{ ok: boolean }>((done) => { menu.popup({ window: win, x: px(p.x), y: px(p.y), callback: () => done({ ok: true }) }); });
});
ipcMain.handle('window:controls', (evt, c: unknown) => {
  const win = BrowserWindow.fromWebContents(evt.sender);
  if (process.platform === 'darwin' || !win || !c || typeof c !== 'object') return { ok: false };
  const { color, symbolColor, height } = c as { color?: unknown; symbolColor?: unknown; height?: unknown };
  const hex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
  if (!hex(color) || !hex(symbolColor) || typeof height !== 'number' || !Number.isInteger(height) || height < 24 || height > 64) return { ok: false };
  try { win.setTitleBarOverlay({ color, symbolColor, height }); } catch { return { ok: false }; }
  return { ok: true };
});

/** Build + install the application menu. Only called when multiWindow is on, so
 *  flag-off keeps Electron's default menu (zero behavior change). Uses standard
 *  role-based items so copy/paste/quit/etc. work per-platform, and adds the
 *  "New Floor" item (Cmd/Ctrl+Shift+N). */
function installAppMenu(): void {
  const isMac = process.platform === 'darwin';
  const newFloorItem = {
    label: 'New Floor',
    accelerator: 'CmdOrCtrl+Shift+N',
    // 0.5.3, B21: ask where to start (the picker in the focused window), not
    // a second window of this floor.
    click: () => { openFloorPicker(); }
  };
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac ? [{ role: 'appMenu' as const }] : []),
    {
      label: 'File',
      submenu: isMac
        ? [newFloorItem, { type: 'separator' as const }, { role: 'close' as const }]
        : [newFloorItem, { type: 'separator' as const }, { role: 'quit' as const }]
    },
    // The Edit menu is spelled out rather than `{ role: 'editMenu' }` for one
    // reason: `registerAccelerator: false` on the clipboard items.
    //
    // A registered accelerator is claimed by the MENU, which then replays the
    // action through `webContents.paste()` — an async hop that runs a beat after
    // the keystroke. Dictation tools (Muesli, Wispr Flow, …) insert text by
    // stashing the clipboard, writing the transcript, sending the paste key, and
    // restoring the old clipboard immediately; the menu's late paste therefore
    // read the RESTORED clipboard and typed the user's previous copy instead of
    // what they had just said. It hit the terminal and the composer alike,
    // because both were downstream of the same replay.
    //
    // With registerAccelerator false the item still shows its shortcut, but the
    // key is left for the focused element to handle inline — xterm's own paste
    // handler and the textarea's native paste event both read the clipboard
    // synchronously, inside the keystroke, before any restore can land.
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const, registerAccelerator: false },
        { role: 'redo' as const, registerAccelerator: false },
        { type: 'separator' as const },
        { role: 'cut' as const, registerAccelerator: false },
        { role: 'copy' as const, registerAccelerator: false },
        { role: 'paste' as const, registerAccelerator: false },
        { role: 'selectAll' as const, registerAccelerator: false }
      ]
    },
    { role: 'viewMenu' },
    { role: 'windowMenu' }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}


// ─── IPC: pty lifecycle ─────────────────────────────────────────────────────
/** Map a `ptyManager.spawn` failure string to the closed `agent_spawn_failed.reason`
 *  enum (analytics.ts). The two known strings come from PtyManager.spawn; anything
 *  else is a generic `spawn_error`. The raw message never leaves the machine — only
 *  the enum value does, per TELEMETRY.md. */
function spawnFailReason(error?: string): SpawnFailReason {
  if (error?.startsWith('cwd does not exist')) return 'cwd_missing';
  if (error?.includes('already exists')) return 'already_running';
  return 'spawn_error';
}

ipcMain.handle('pty:spawn', async (evt, opts: AgentSpawnOptions) => {
  if (!opts || typeof opts.id !== 'string' || typeof opts.cwd !== 'string' || typeof opts.command !== 'string') {
    return { ok: false, error: 'invalid SpawnOptions' };
  }
  // Record the spawning window as the PTY's owner so its output routes ONLY back
  // to that floor, then run the shared spawn core.
  const owner = BrowserWindow.fromWebContents(evt.sender)?.webContents ?? null;
  return spawnAgentCore(opts, owner);
});

/** 0.5.5 perf, item 6: native http hooks for this Claude spawn, or the command
 *  hooks and the reason (hookTransport.ts). The version probe runs the same
 *  binary the terminal is about to launch, once per binary per app run. */
async function claudeHookTransport(command: string, cwd: string): Promise<HookTransport> {
  await launchEnvReady();
  const endpoint = hookServer.httpEndpoint();
  if (!endpoint) return chooseHookTransport({ endpoint, version: null, allowlistReason: null });
  const bin = command.trim().split(/\s+/)[0] || command;
  const binPath = ptyManager.commandPath(bin);
  const version = binPath ? await claudeVersionOnce(binPath, ptyManager.childEnv()) : null;
  return chooseHookTransport({
    endpoint,
    version,
    allowlistReason: httpHookAllowlistReason(cwd, { configDir: process.env.CLAUDE_CONFIG_DIR })
  });
}

/** Core agent-spawn logic, now in src/core/spawnAgent.ts:
 *  provider inference, the missing-CLI installer short-circuit, git-worktree
 *  isolation, hive provisioning, model/resume flags, and the final PTY spawn.
 *  Called by the `pty:spawn` IPC handler and the god-triggered ephemeral-worker
 *  watcher (which has no renderer `evt`). `owner` is the window that should
 *  receive this PTY's output (null → the primary window). Bound on first use,
 *  so every index.ts object it reads exists by then. */
let boundSpawnAgent: ((opts: AgentSpawnOptions, owner: Electron.WebContents | null) => Promise<SpawnResult>) | null = null;
function spawnAgentCore(opts: AgentSpawnOptions, owner: Electron.WebContents | null): Promise<SpawnResult> {
  return startAgent(opts, owner);
}
/** One lifecycle per office. A terminal view only reads its existing xterm buffer. */
function keepDemandScreen(ptyId: string): void {
  const id = ptyToAgent.get(ptyId);
  const root = hive.root();
  if (!id || !root) return;
  try { writeFileSync(join(root, 'agents', id, 'sleep-screen.ansi'), ptyManager.tail(ptyId), 'utf8'); } catch { /* screen is a cache */ }
}
const agentDemand = new AgentDemand({
  running: (id) => !!ptyForAgent(id),
  exempt: (id) => id === hive.registry().godId || hive.registry().agents[id]?.isGod === true || hive.registry().agents[id]?.role === 'temp' || liveWorkers.has(id) || !!hive.registry().agents[id]?.isAssistant,
  busy: (id) => {
    const pty = ptyForAgent(id);

    return workerWake.waitsOnPerson(id) || !!hive.inboxBacklog(id) || !!switchClear.background.open(id) || !!pendingCliSetup.has(pty ?? id)
      || workerWake.openTurn(id)
      || (pty ? Date.now() - (ptyManager.lastOutputAt(pty) ?? 0) < 15_000 : false);
  },
  minutes: () => readConfig().agentIdleMinutes,
  canSleep: async (id) => {
    const ptyId = ptyForAgent(id);
    const info = ptyId ? ptyManager.info(ptyId) : null;
    if (!ptyId || !info) return false;
    const probe = await terminalProbes.request((rid) => ptyManager.sendToOwner(ptyId, 'terminal:probe', { id: rid, ptyId, cols: info.cols, rows: info.rows }));
    return probe === undefined || probe?.safe === true;
  },
  start: async (id) => {
    const reg = hive.registry();
    const a = reg.agents[id];
    if (!localDemandAllowed(id, a, roster.read(), reg.godId)) throw new Error(`${id} is not on the current team`);
    const saved = [...agentRuns.values()].find((r) => r.opts.hive?.id === id)?.opts;
    const snap = roster.read();
    const card = [...(snap?.agents ?? []), ...(snap?.restorable ?? [])]
      .find((r) => !!r && typeof r === 'object' && (r as { id?: string }).id === id) as
      { command?: string; cwd?: string; worktreePath?: string; model?: string; ptyId?: string } | undefined;
    const provider = inferAgentProvider(card?.command, a.provider);
    const fallback = buildWorkerLaunch({ requestProvider: provider, defaultCommand: readConfig().defaultCommand, autoMode: !!readConfig().autoMode });
    const command = commandWithModel(card?.command ?? (a.isGod ? readConfig().godCommand : undefined) ?? fallback.command, card?.model ?? (a.isGod ? readConfig().godModel : undefined), provider);
    const [bin, ...args] = tokenizeCommand(command ?? '');
    if (!saved && !bin) throw new Error(`${id}: no saved start command`);
    const opts: AgentSpawnOptions = saved ? { ...saved, resume: true, isolate: false } : {
      id: card?.ptyId ?? `pty-${id}`, cwd: card?.worktreePath && existsSync(card.worktreePath) ? card.worktreePath : card?.cwd ?? a.cwd,
      command: bin, args, provider, hive: a, cols: 120, rows: 32, resume: true, isolate: false
    };
    const recipeCommand = saved ? joinCommandLine([saved.command, ...(saved.args ?? [])]) : command;
    liveWebContents()?.send(`pty:relaunch:${opts.id}`);
    const result = await spawnAgentCore(opts, liveWebContents());
    if (!result.ok) throw new Error(result.error ?? `${id} could not start`);
    liveWebContents()?.send('hive:agentSpawned', spawnedCard({ ...a, id, ptyId: opts.id, command: recipeCommand, args: opts.args, provider }));
  },
  stop: (id) => {
    const pty = ptyForAgent(id);
    if (!pty) return;
    keepDemandScreen(pty);
    const ended = ptyManager.kill(pty);
    if (!ended.ok) throw new Error(ended.error);
    teardownPty(pty, 'sleep');
  },
  sleeping: (id, asleep) => {
    hive.setSleeping(id, asleep);
    // Registry polling also restores this state after a renderer reload.
    writeFleetSnapshot();
  }
});
function wakeDemand(id: string): void {
  const reg = hive.registry();
  if (!localDemandAllowed(id, reg.agents[id], roster.read(), reg.godId)) return;
  void agentDemand.wake(id).catch((e) => console.warn('[agent-demand]', id, String(e)));
}
function demandBeat(): void {
  const reg = hive.registry();
  for (const id of Object.keys(reg.agents)) {
    if (hive.inboxBacklog(id) > 0 && reg.agents[id]?.role !== 'temp') wakeDemand(id);
    const pty = ptyForAgent(id);
    if (pty) agentDemand.touch(id, ptyManager.lastOutputAt(pty) ?? 0);
  }
  void agentDemand.tick(Object.keys(reg.agents)).catch((e) => console.warn('[agent-sleep]', String(e)));
}

function startAgent(opts: AgentSpawnOptions, owner: Electron.WebContents | null): Promise<SpawnResult> {
  boundSpawnAgent ??= createSpawnAgent<Electron.WebContents>({
    ptyManager, launchEnvReady, ptyOwners, loginWatcher, enableCodexRemoteForSpawn, ptyToAgent,
    pendingInstallRelaunch, pendingCliMissing, sendCliMissing, pendingCliSetup, agentRuns, watchSignIn,
    endCliSetup, sendCliSetup, hive, workerWake, memory, knowledge,
    nextRestoreSlowSeq: () => ++restoreSlowSeq,
    isPackaged: () => app.isPackaged,
    worktreePaths, worktreeOrigins, worktreeBases, worktreeFinalizing, brokerGrants, BACKEND_KEY_ENV,
    providerKeyRef, syncKeepAwake, breakerToast, skillsResourceDir, findCodexHomeForSession,
    spawnFailReason, claudeHookTransport, readConfig, ensureClaudePermissionsAccepted, modelForRole, integrations,
    // 0.5.8: the Codex folder hold, the switch of work clear and the skills started off are this app's.
    codexHold: {
      hold: holdForCodexFolders,
      probe: probeCodexFolders,
      commit: (id, probe, held, holder, card) => commitCodexHold(id, probe as CodexWaitingFolder[], held, holder, card)
    },
    noteSpawn: (agentId) => {
      switchClear.noteSpawn(agentId);
      // 0.5.8 crash loop guard (src/shared/agentLive.ts): a run that is still up
      // after QUICK_EXIT_MS has lasted, so its quick exit count goes back to none.
      // Here rather than at its exit because a quit ends it with no exit at all.
      const ptyAtSpawn = ptyForAgent(agentId);
      setTimeout(() => {
        if (ptyAtSpawn && ptyForAgent(agentId) === ptyAtSpawn && hive.enabled()) {
          try { hive.noteEndedOnItsOwn(agentId, null); } catch { /* best-effort */ }
        }
      }, QUICK_EXIT_MS).unref?.();
    },
    startedWithSkillsOff: (agentId, folders) => { skillsOffAtLaunch.set(agentId, folders); }
  });
  return boundSpawnAgent(opts, owner);
}
/** I2: the card's one button. Install and Try again run the rung the card
 *  named, in this terminal; Check again (manual rung, or a CLI installed by
 *  hand meanwhile) re-probes PATH. Both are the same spawn again with
 *  `installNow`: a binary that is there now starts normally into the same pty
 *  (the grid is cleared first, like the relaunch after an install), a binary
 *  still missing runs its installer, and the manual rung just draws the card
 *  again. Only a spawn that stopped at the card can be resumed this way. */
/** I2 part 2: the sign in modal's buttons. The link opened is the one main
 *  read from the CLI, never a string the renderer sends; a pasted code goes
 *  into the pty followed by Enter, as the person would have typed it;
 *  dismiss closes this ask for good. */
ipcMain.handle('pty:loginAct', async (_evt, payload: unknown) => {
  const p = (payload ?? {}) as { id?: unknown; action?: unknown; text?: unknown };
  if (typeof p.id !== 'string') return { ok: false, error: 'invalid id' };
  const prompt = loginWatcher.current(p.id);
  if (p.action === 'dismiss') { loginWatcher.dismiss(p.id); return { ok: true }; }
  if (!prompt) return { ok: false, error: 'no-prompt' };
  if (p.action === 'open-link') {
    // Only a link this provider's own recipe read, on that provider's sign in
    // host: a terminal carries model and tool output too, and the app vouches
    // for nothing it did not recognise (the modal shows such a link as text).
    // A CLI on this computer: its localhost callback is its own. What opens is the parsed address.
    const href = loginLinkToOpen(prompt.provider, prompt.url, { local: true });
    if (!prompt.trusted || prompt.recipe !== 'provider' || href === null) return { ok: false, error: 'link-not-vouched' };
    await shell.openExternal(href);
    return { ok: true };
  }
  if (p.action === 'paste') {
    if (typeof p.text !== 'string' || !p.text.trim()) return { ok: false, error: 'text required' };
    // One line, no control characters: a code, never a script.
    const code = p.text.replace(/[\u0000-\u001f\u007f]/g, '').trim();
    return ptyManager.write(p.id, code + '\r');
  }
  return { ok: false, error: 'unknown action' };
});
ipcMain.handle('pty:installCli', async (_evt, id: unknown) => {
  if (typeof id !== 'string') return { ok: false, error: 'invalid id' };
  const paused = pendingCliMissing.get(id);
  if (!paused) return { ok: false, error: 'nothing-to-install' };
  const bin = paused.opts.command.trim().split(/\s+/)[0] || paused.opts.command;
  await launchEnvReady();
  if (ptyManager.isCommandAvailable(bin)) {
    // Installed by hand since the card was drawn: start it, no installer.
    pendingCliMissing.delete(id);
    const wc = (paused.owner && !paused.owner.isDestroyed()) ? paused.owner : liveWebContents();
    try { wc?.send(`pty:relaunch:${id}`); } catch { /* window gone */ }
    return spawnAgentCore({ ...paused.opts, noAutoInstall: true }, paused.owner);
  }
  if (paused.state.rung === 'manual') {
    sendCliMissing(id, paused.owner, paused.state);
    return { ok: true, cwd: paused.opts.cwd, cliMissing: paused.state };
  }
  return spawnAgentCore({ ...paused.opts, installNow: true, guidedSetup: true }, paused.owner);
});
// F3 (0.5.3, founder 24 Sep 2026): the card's push reaches only a terminal
// that is already listening. A pty that stopped at the card BEFORE its
// terminal existed (an agent respawned at app start, a screen opened later)
// left a silent blank grid, so the pool asks once at acquire.
ipcMain.handle('pty:cliMissingState', (_evt, id: unknown) => {
  if (typeof id !== 'string') return null;
  return pendingCliMissing.get(id)?.state ?? null;
});
/** Batch 2: the setup phase for a terminal opened after it began (same reason
 *  as pty:cliMissingState). */
ipcMain.handle('pty:cliSetupState', (_evt, id: unknown) => {
  if (typeof id !== 'string') return null;
  return pendingCliSetup.get(id)?.state ?? null;
});
/** Batch 2: "Setup complete, start agent". The login terminal (and the install
 *  output above it) is discarded: the login is killed if it is still running,
 *  the renderer wipes the grid, and the agent starts fresh into the same pty.
 *  Refused while the installer still runs: there is nothing to start yet. */
ipcMain.handle('pty:cliSetupStart', async (_evt, id: unknown, opts?: unknown) => {
  if (typeof id !== 'string') return { ok: false, error: 'invalid id' };
  const setup = pendingCliSetup.get(id);
  if (!setup) return { ok: false, error: 'nothing-to-start' };
  if (setup.state.phase === 'installing') return { ok: false, error: 'still-installing' };
  const anyway = opts === 'anyway';
  if (!setupCanStart(setup.state) && !(anyway && setupCanStartAnyway(setup.state))) return { ok: false, error: 'not-signed-in' };
  return startAgentAfterSetup(id);
});
/** The person allows the folders a held Codex start named. The OK
 *  is kept (config codexLayerOptIns, and this run's memory) and the agent
 *  starts. Only the folders main found are recorded, never a path from the
 *  renderer. A config that cannot be written (R2) keeps the OK until a restart. */
ipcMain.handle('codex:allowFolder', async (_evt, id: unknown) => {
  if (typeof id !== 'string') return { ok: false, error: 'invalid id' };
  const held = endCodexHold(id);
  if (!held) return { ok: false, error: 'nothing-to-start' };
  for (const f of held.folders) { codexFoldersAllowedThisRun.add(f); codexWaitingFolders.delete(f); }
  allowCodexLayerFolders(held.folders);
  hive.appendLog({ kind: 'codex-folders-allowed', agent: held.opts.hive?.id ?? null, folders: held.folders });
  return spawnAgentCore(held.opts, held.owner);
});
/** Settings, Codex folders: the folders a start with
 *  no card waits on, each with what the card would show. */
ipcMain.handle('codex:waitingFolders', (): CodexWaitingFolder[] => codexWaitingList());
/** Allow one waiting folder, recorded like an Allow. Only a folder on the
 *  waiting list, by exact match: never another path from the window. It starts
 *  nothing; whoever asked starts the agent again. */
ipcMain.handle('codex:allowWaitingFolder', (_evt, folder: unknown) => {
  if (typeof folder !== 'string' || !codexWaitingList().some((w) => w.folder === folder)) return { ok: false, error: 'not-waiting' };
  codexWaitingFolders.delete(folder);
  codexFoldersAllowedThisRun.add(folder);
  allowCodexLayerFolders([folder]);
  hive.appendLog({ kind: 'codex-folders-allowed', agent: null, folders: [folder], via: 'settings' });
  return { ok: true };
});
/** The held card for a terminal opened after the start was held
 *  (same reason as pty:cliMissingState). Null when nothing is held. */
ipcMain.handle('codex:heldFolders', (_evt, id: unknown) => {
  if (typeof id !== 'string') return null;
  return pendingCodexFolders.get(id)?.state ?? null;
});
/** Settings, Agents & Models: the folders allowed so far, and a
 *  withdraw that applies from each agent's next start. */
ipcMain.handle('codex:allowedFolders', (): string[] => codexAllowedFolders());
ipcMain.handle('codex:withdrawFolder', (_evt, folder: unknown): string[] => {
  if (typeof folder === 'string') {
    const before = codexAllowedFolders();
    codexFoldersAllowedThisRun.delete(folder);
    withdrawCodexLayerFolder(folder);
    if (before.includes(folder)) hive.appendLog({ kind: 'codex-folder-withdrawn', folder });
  }
  return codexAllowedFolders();
});
/** Batch 4: "Set up manually", from the failed install card or the sign in
 *  panel. */
ipcMain.handle('pty:cliSetupManual', (_evt, id: unknown) => {
  if (typeof id !== 'string') return { ok: false, error: 'invalid id' };
  return openManualSetup(id);
});
/** Batch 2: "Sign in again" after a login that did not finish. */
ipcMain.handle('pty:cliSetupLogin', (_evt, id: unknown) => {
  if (typeof id !== 'string') return { ok: false, error: 'invalid id' };
  const setup = pendingCliSetup.get(id);
  if (!setup || setup.state.phase !== 'signin' || setup.state.login === 'running' || !setup.state.loginCommand) return { ok: false, error: 'nothing-to-run' };
  runLoginStep(id);
  return { ok: true };
});
ipcMain.handle('pty:sleepScreen', (_evt, id: unknown) => {
  if (typeof id !== 'string' || ptyManager.info(id)) return '';
  const snap = roster.read();
  const card = [...(snap?.agents ?? []), ...(snap?.restorable ?? [])].find((r) =>
    !!r && typeof r === 'object' && ((r as { ptyId?: string }).ptyId === id || (r as { id?: string }).id === id)) as { id: string } | undefined;
  const root = hive.root();
  if (!root || !card || !hive.registry().agents[card.id]?.sleeping) return '';
  try { return readFileSync(join(root, 'agents', card.id, 'sleep-screen.ansi'), 'utf8').slice(-256_000); } catch { return ''; }
});
ipcMain.handle('pty:write', async (_evt, id: string, data: string, wake = true) => {
  if (typeof id !== 'string' || typeof data !== 'string') return { ok: false, error: 'invalid args' };
  // I2 part 2: a line the person submits to the CLI means they are at its
  // prompt, past any sign in; the watcher stops reading this pty (unless its
  // ask is still open: they may be typing the code in the terminal).
  if (/[\r\n]/.test(data)) loginWatcher.pastLogin(id);
  const agentId = ptyToAgent.get(id) ?? Object.values(hive.registry().agents).find((a) => a.id === id)?.id
    ?? (roster.read()?.agents as Array<{ id: string; ptyId?: string }> | undefined)?.find((a) => a.ptyId === id)?.id;
  if (agentId && data && wake) { await agentDemand.wake(agentId); agentDemand.touch(agentId); }
  return ptyManager.write(id, data);
});
ipcMain.handle('pty:resize', (_evt, id: string, cols: number, rows: number) => {
  if (typeof id !== 'string' || typeof cols !== 'number' || typeof rows !== 'number') return { ok: false, error: 'invalid args' };
  return ptyManager.resize(id, cols, rows);
});
ipcMain.handle('pty:redraw', (_evt, id: string) => {
  if (typeof id !== 'string') return { ok: false, error: 'invalid id' };
  return ptyManager.redraw(id);
});
ipcMain.handle('pty:kill', (_evt, id: string, why?: unknown) => {
  if (typeof id !== 'string') return { ok: false, error: 'invalid id' };
  // ONE channel carries a person's Stop, a Restart, the automatic revive after
  // sleep and the theme switch, and it used to give all of them one reason. The
  // renderer now says which. It can only make the teardown SAFER: anything it
  // sends that is not a known safer reason is a person (reasonFromRenderer).
  const reason = reasonFromRenderer(why);
  // Kill the process, then run the shared lifecycle teardown (archive the agent,
  // remove its isolated worktree, drop the maps). teardownPty is idempotent, so
  // node-pty firing onExit once the child actually dies is a harmless no-op.
  const res = ptyManager.kill(id);
  teardownPty(id, reason);
  // A Stop or Restart during install or sign in ends that setup too; a later
  // spawn under this id starts from the card again if the CLI is still missing.
  pendingInstallRelaunch.delete(id);
  endCliSetup(id);
  agentRuns.delete(id);
  endCodexHold(id);
  return res;
});
ipcMain.handle('pty:list', () => ptyManager.list());
/** How each agent that ended on its own in this run ended, for a window
 *  that reloaded. One with a live terminal again is left out. */
ipcMain.handle('hive:endedAgents', () => {
  const live = new Set(ptyToAgent.values());
  return [...endedAgents].filter(([agentId]) => !live.has(agentId)).map(([agentId, e]) => ({ agentId, ...e }));
});
// Autosend (0.5.5): every automated message goes through ONE submitter per
// terminal, in main (ptySubmit.ts). The renderer answers for the screen and a
// person's draft (terminal:probe), matched by id, with a 300 ms timeout.
const terminalProbes = new TerminalProbes();
ipcMain.on('terminal:probe:reply', (_evt, msg: { id?: unknown } | undefined) => terminalProbes.reply(msg?.id, msg));
const ptySubmitter = new PtySubmitter({
  messageText: (req) => fileBackedMessage(hive.root(), req.agentId, req.provider, req.text),
  write: (id, data) => {
    // As pty:write: a submitted line means the person is past any sign in.
    if (/[\r\n]|\x1b\[13u/.test(data)) loginWatcher.pastLogin(id);
    return ptyManager.write(id, data);
  },
  info: (id) => ptyManager.info(id),
  probe: (id, grid) => terminalProbes.request((rid) => ptyManager.sendToOwner(id, 'terminal:probe', { id: rid, ptyId: id, cols: grid.cols, rows: grid.rows })),
  proof: hookServer.proof,
  inputHeld: (agentId) => !!agentId && workerWake.holdsInput(agentId),
  claudeVersion: async (id) => {
    const bin = ptyManager.info(id)?.command;
    return bin ? claudeVersionOnce(bin, ptyManager.childEnv()) : null;
  },
  // The transcript the History tab reads (historyService.ts), by agent id only.
  sessionWrittenAt: (agentId) => {
    const r = agentId ? historyService.resolve(agentId) : null;
    return r && 'file' in r ? statSync(r.file).mtimeMs : null;
  },
  began: (req) => { ptyManager.sendToOwner(req.ptyId, 'pty:began', { ptyId: req.ptyId }); },
  // Claude only: another engine's file has no turns of this shape.
  turnOpen: (agentId, since) => {
    const r = agentId ? historyService.resolve(agentId) : null;
    if (!r || !('file' in r) || r.provider !== 'claude') return false;
    const read = sessionTurnRead(r.file, since);
    return read === 'not-found' ? read : read === 'open';
  },
  // hive.ts starts every Codex agent with its launch prompt.
  codexLaunchTurn: true,
  log: (e) => { try { hive.appendLog(e); } catch { /* hive not bootstrapped yet */ } }
});
/** The sources a window may submit under (ptySubmit.ts SubmitSource). */
const SUBMIT_SOURCES: ReadonlySet<string> = new Set<SubmitSource>(['queue', 'seed', 'god-boot', 'nudge', 'remote-control']);
ipcMain.handle('pty:submit', async (_evt, req: unknown) => {
  const r = (req ?? {}) as Record<string, unknown>;
  if (typeof r.ptyId !== 'string' || typeof r.text !== 'string' || typeof r.provider !== 'string'
      || typeof r.source !== 'string' || !SUBMIT_SOURCES.has(r.source)) return { ok: false, error: 'invalid args' };
  try {
    const demandId = ptyToAgent.get(r.ptyId) ?? (typeof r.agentId === 'string' ? r.agentId : undefined);
    if (demandId && r.source !== 'seed') { await agentDemand.wake(demandId); agentDemand.touch(demandId); }
    // Noted before the submit, which waits for the prompt it is matched to.
    const typedBy = ptyToAgent.get(r.ptyId) ?? (typeof r.agentId === 'string' ? r.agentId : undefined);
    if (typedBy && r.pressOnly !== true) {
      founderTurns.noteTyped(typedBy, r.text,
        r.person === true || wakeCarriesPersonMail(r.text, hive.inbox(typedBy)), Date.now());
    }
    const result = await ptySubmitter.submit({
      ptyId: r.ptyId,
      // The id its hooks arrive under, which proof is looked up by.
      agentId: ptyToAgent.get(r.ptyId) ?? (typeof r.agentId === 'string' ? r.agentId : undefined),
      provider: r.provider as AgentProvider,
      text: r.text,
      source: r.source as SubmitSource,
      settleMs: typeof r.settleMs === 'number' && r.settleMs >= 0 ? Math.min(r.settleMs, 10_000) : undefined,
      pressOnly: r.pressOnly === true,
      idle: r.idle !== false,
      ...(typeof r.ref === 'string' && r.ref ? { ref: r.ref } : {})
    });
    // 0.5.6: a typed wake's mail is filed when the turn it started ends.
    wakeFiling.noteTyped(ptyToAgent.get(r.ptyId) ?? (typeof r.agentId === 'string' ? r.agentId : undefined), r.text, result, r.pressOnly === true);
    // And the clear on a switch of work is told what it was: a hand off
    // request, the clear, or a wake (shared/switchClear.ts).
    switchClear.noteTyped(
      ptyToAgent.get(r.ptyId) ?? (typeof r.agentId === 'string' ? r.agentId : undefined),
      typedKind(r.text, switchClearCommand(r.provider as AgentProvider)), result.outcome, r.pressOnly === true
    );
    // A Codex file too large is done once its clear went in: one line in the
    // log, and that file is never cleared again (shared/codexSizeClear.ts).
    const rotatedAgent = ptyToAgent.get(r.ptyId) ?? (typeof r.agentId === 'string' ? r.agentId : undefined);
    const rotatedBytes = codexSize.noteTyped(
      rotatedAgent, typedKind(r.text, switchClearCommand(r.provider as AgentProvider)), result.outcome, r.pressOnly === true
    );
    if (rotatedAgent && rotatedBytes !== null) {
      try { hive.appendLog({ kind: 'codex-session-rotated', agentId: rotatedAgent, bytes: rotatedBytes }); } catch { /* hive not bootstrapped yet */ }
    }
    // A clear the orchestrator asked for is done once its clear went in, and
    // every clear the app asked a hand off for keeps what the agent knew in its
    // last-session.md (shared/askedClear.ts, shared/lastSession.ts).
    const typed = typedKind(r.text, switchClearCommand(r.provider as AgentProvider));
    if (askedClear.noteTyped(rotatedAgent, typed, result.outcome, r.pressOnly === true)) {
      try { hive.appendLog({ kind: 'clear-request-done', agentId: rotatedAgent }); } catch { /* hive not bootstrapped yet */ }
    }
    // A compact an agent asked for is done once any compact went in.
    if (askedCompact.noteTyped(rotatedAgent, typeof r.text === 'string' && isCompactionCommand(r.text), result.outcome, r.pressOnly === true)) {
      try { hive.appendLog({ kind: 'compact-request-done', agentId: rotatedAgent }); } catch { /* hive not bootstrapped yet */ }
    }
    const save = clearHistory.noteTyped(rotatedAgent, typed, result.outcome, r.pressOnly === true, () => {
      const reason = typeof r.text === 'string' ? handoffReason(r.text) : null;
      return reason && rotatedAgent
        ? { reason, work: switchClear.state(rotatedAgent)?.onWork, transcriptPath: hookServer.transcriptPath(rotatedAgent) }
        : null;
    });
    if (rotatedAgent && save) void saveLastSession(rotatedAgent, save);
    return { ok: true, result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
});
/** The cross on a queued row: a send main already has for it is never typed or pressed from now on
 *  (PtySubmitter.withdraw). Takes the queued message's id only. */
ipcMain.handle('pty:withdraw', (_evt, ref: unknown) => (typeof ref === 'string' && ref ? ptySubmitter.withdraw(ref) : false));

// ─── IPC: analytics (the ONE renderer-facing seam) ──────────────────────────
/** Count one human-sent message (TELEMETRY.md → `message_sent`). A COUNT, and
 *  nothing else: this channel takes no text, no length and no id, so there is
 *  no shape in which message content could cross it.
 *
 *  This is the only analytics event the renderer can cause. It exists because
 *  two of the four send surfaces — a line typed into the agent's terminal, and
 *  the queue composer — are submits main cannot observe: the `pty:write` handler
 *  above fires on EVERY KEYSTROKE, so counting there would produce a keystroke
 *  meter, not a message count. `steer` and `hive` are counted at their own IPC
 *  handlers in this file and are rejected here (isRendererMessageSurface) so
 *  they can never be counted twice. The event name is fixed here, not passed
 *  in: the renderer chooses a surface, never an event. */
ipcMain.handle('analytics:messageSent', (_evt, surface: unknown) => {
  if (!isRendererMessageSurface(surface)) return { ok: false };
  analytics.trackMessageSent(surface);
  return { ok: true };
});
// 0.5.8: the needs a fix notices this computer's agents raised that no floor has shown yet (a stop while the window sat
// at the sign in door). Taking them clears them, so each is shown once (degradedPending.ts).
ipcMain.handle('hive:takeDegraded', () => hive.takeDegraded());

// Resolve a pasted Claude session id to the cwd it originally ran in, so the Add
// Agent dialog can auto-fill the folder for a resume (#2 zero-step resume). Reads
// the cwd from a transcript record; null when the id is invalid/unknown.
ipcMain.handle('session:resolveCwd', (_evt, sessionId: unknown) =>
  (typeof sessionId === 'string' ? resolveSessionCwd(sessionId) : null));

// ─── IPC: clipboard ─────────────────────────────────────────────────────────
ipcMain.handle('app:copyToClipboard', (_evt, text: unknown) => {
  if (typeof text !== 'string') return { ok: false, error: 'invalid text' };
  try { clipboard.writeText(text); return { ok: true }; }
  catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
});
ipcMain.handle('app:readClipboard', () => {
  try { return clipboard.readText(); } catch { return ''; }
});
// Same read, SYNCHRONOUS, for the terminal's paste shortcut.
//
// Dictation tools (muesli.works, Wispr Flow, …) type by stashing the user's
// clipboard, writing the transcript, sending the paste key, then restoring the
// old clipboard immediately. An `invoke` read returns a tick or two later — by
// which point the restore has already landed and we paste the PREVIOUS text.
// A `sendSync` read completes inside the keydown handler, before the tool gets
// a chance to put the old contents back.
ipcMain.on('app:readClipboardSync', (evt) => {
  try { evt.returnValue = clipboard.readText(); } catch { evt.returnValue = ''; }
});
// NOTE: the terminal theme is mirrored into each agent's per-session Claude
// settings at spawn (hive.ensureAgent theme option) — deliberately NOT via
// `claude config set -g theme`, which would also restyle the user's own
// Claude sessions outside the app.

// ─── IPC: folder picker ─────────────────────────────────────────────────────
ipcMain.handle('dialog:chooseFolder', async (evt) => {
  const win = BrowserWindow.fromWebContents(evt.sender);
  if (!win) return { ok: false as const, error: 'no window' };
  const res = await dialog.showOpenDialog(win, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Pick a folder'
  });
  if (res.canceled || res.filePaths.length === 0) return { ok: false as const, error: 'cancelled' };
  return { ok: true as const, path: res.filePaths[0] };
});

// ─── IPC: Terminal.app at a folder ──────────────────────────────────────────
ipcMain.handle('terminal:openAtFolder', async (_evt, cwd: unknown) => {
  if (typeof cwd !== 'string' || cwd.length === 0) return { ok: false, error: 'invalid cwd' };
  return new Promise<{ ok: boolean; error?: string }>((resolve) => {
    const p = spawn('open', ['-a', 'Terminal', cwd]);
    let err = '';
    p.stderr.on('data', (d) => { err += d.toString(); });
    p.on('error', (e) => resolve({ ok: false, error: e.message }));
    p.on('close', (code) => {
      if (code === 0) resolve({ ok: true });
      else resolve({ ok: false, error: err.trim() || `open exited ${code}` });
    });
  });
});
ipcMain.handle('integrations:list', (evt) => {
  return integrations.listRecordsRedacted();
});
ipcMain.handle('integrations:templates', () => INTEGRATION_TEMPLATES);
const integrationIpc = integrationHandlers({
  upsertRecord: integrations.upsertRecord,
  setIntegrationSecret: integrations.setIntegrationSecret,
  removeRecord: integrations.removeRecord,
  onChanged: () => { brokerGrants.onIntegrationsChanged(); }
});
ipcMain.handle('integrations:upsert', (_evt, record: unknown) => integrationIpc.upsert(record));
ipcMain.handle('integrations:setSecret', (_evt, payload: unknown) => integrationIpc.setSecret(payload));
// The form's Save: a record, and then its key when the person typed one.
ipcMain.handle('integrations:save', (_evt, payload: unknown) => {
  const p = (payload ?? {}) as { record?: unknown; secret?: unknown };
  const up = integrationIpc.upsert(p.record);
  if (!up.ok) return { ok: false, error: up.error };
  if (typeof p.secret === 'string' && p.secret.length > 0) {
    // The address this window showed: the key is sealed for it and no other.
    const shown = (p.record as { baseUrl?: unknown } | null)?.baseUrl;
    const ss = integrationIpc.setSecret({ id: up.record.id, secret: p.secret, baseUrl: typeof shown === 'string' ? shown : up.record.baseUrl });
    if (!ss.ok) return { ok: false, error: ss.error };
  }
  return { ok: true };
});
ipcMain.handle('integrations:remove', (_evt, payload: unknown) => integrationIpc.remove(payload));
void app.whenReady().then(() => {
  // The secrets an older version kept are sealed, held or dropped before anything reads one
  // (sealedStore.ts). Names and counts only are ever logged, never a value.
  try {
    const moved = integrations.moveOldSecrets({
      // Keys the app keeps for itself in the data folder, this build's or another
      // build's that shares the folder: a value that matches one is never moved.
      appKeyFiles: appKeyFilesIn(officePaths().userData()),
      isAgentKey: (ref) => (ref.startsWith('apikey:') && Object.hasOwn(BACKEND_KEY_ENV, ref.slice('apikey:'.length)))
        || (ref.startsWith(CUSTOM_SECRET_PREFIX) && secretNameProblem(ref.slice(CUSTOM_SECRET_PREFIX.length)) === null)
    });
    if (moved.skipped) console.warn(`[secrets] the saved keys of an older version were not looked at (${moved.skipped}); they read as not set`);
    else if (moved.decisions.length) {
      const n = (f: (d: (typeof moved.decisions)[number]) => boolean): number => moved.decisions.filter(f).length;
      console.warn(`[secrets] saved keys of an older version: ${n((d) => d.action === 'seal')} ready, ${n((d) => d.action === 'drop')} must be set again`);
    }
    // What an earlier 0.5.8 start held or dropped, back in use. Counts only.
    if (moved.released?.length || moved.recovered?.length) console.warn(`[secrets] keys an earlier 0.5.8 start held or dropped, in use again: ${moved.released?.length ?? 0} released, ${moved.recovered?.length ?? 0} kept again`);
  } catch (e) { console.error('[secrets] the saved keys of an older version could not be moved:', e); }
});
// ─── IPC: per-CLI-provider BYOK keys (write-only) ────────────────────────────
// API keys for the backend model-providers the non-Claude CLIs use are stored
// WRITE-ONLY under `apikey:<backend>` in the same encrypted broker. The renderer
// can SET a key and ASK whether one is set (boolean) — it can never read the
// plaintext back. Keys are materialized MAIN-ONLY at spawn (spawnAgentCore). Base
// URLs are non-secret and ride HarnessConfig.providerBaseUrls (normal config save).
ipcMain.handle('providerKey:set', (_evt, payload: unknown) => {
  const p = (payload ?? {}) as { backend?: unknown; key?: unknown };
  if (typeof p.backend !== 'string' || !(p.backend in BACKEND_KEY_ENV)) return { ok: false, error: 'unknown backend' };
  if (typeof p.key !== 'string' || !p.key) return { ok: false, error: 'key required' };
  return integrations.setSecret(providerKeyRef(p.backend), { kind: 'env' }, p.key);
});
ipcMain.handle('providerKey:has', (_evt, backend: unknown) =>
  typeof backend === 'string' ? integrations.hasSecret(providerKeyRef(backend)) : false);
ipcMain.handle('providerKey:clear', (_evt, backend: unknown) => {
  if (typeof backend !== 'string' || !(backend in BACKEND_KEY_ENV)) return { ok: false, error: 'unknown backend' };
  try { integrations.deleteSecret(providerKeyRef(backend)); return { ok: true }; }
  catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
});
ipcMain.handle('customSecret:list', (evt) => {
  return customSecretNames(integrations.listSecretRefs());
});
ipcMain.handle('customSecret:set', (_evt, payload: unknown) => {
  const p = (payload ?? {}) as { name?: unknown; value?: unknown };
  if (typeof p.name !== 'string') return { ok: false, error: 'name required' };
  const problem = secretNameProblem(p.name);
  if (problem) return { ok: false, error: `${p.name || 'name'}: ${problem === 'reserved' ? 'the harness sets this one itself' : 'use only capitals, digits and underscores'}` };
  if (typeof p.value !== 'string' || !p.value) return { ok: false, error: 'value required' };
  const saved = integrations.setSecret(customSecretRef(p.name), { kind: 'env' }, p.value);
  return saved;
});
// The key check (preview 15): keys that wait for the person's yes, and Done. Values never leave main.
const PROVIDER_NAMES: Record<string, string> = { anthropic: 'Anthropic', openai: 'OpenAI', google: 'Google', openrouter: 'OpenRouter', groq: 'Groq' };
const keyCheck = keyCheckHandlers({
  held: integrations.heldSecrets,
  lastMove: integrations.lastSecretMove,
  lost: integrations.lostSecrets,
  seenLost: integrations.seenLostSecrets,
  oldRefs: integrations.oldSecretRefs,
  skipSeen: integrations.seenSecretSkip,
  seeSkip: integrations.seeSecretSkip,
  records: integrations.listRecords,
  release: integrations.releaseHeldSecret,
  forget: integrations.forgetHeldSecret,
  switchOff: integrations.disableRecord,
  providerName: (ref) => (ref.startsWith('apikey:') && Object.hasOwn(BACKEND_KEY_ENV, ref.slice('apikey:'.length)) ? PROVIDER_NAMES[ref.slice('apikey:'.length)] ?? ref.slice('apikey:'.length) : undefined),
  envName: (ref) => (ref.startsWith(CUSTOM_SECRET_PREFIX) && secretNameProblem(ref.slice(CUSTOM_SECRET_PREFIX.length)) === null ? ref.slice(CUSTOM_SECRET_PREFIX.length) : undefined),
  onChanged: () => brokerGrants.onIntegrationsChanged()
});
ipcMain.handle('integrations:keyCheck', () => keyCheck.list());
ipcMain.handle('integrations:keyCheckAnswer', (_evt, payload: unknown) => keyCheck.answer(payload));
ipcMain.handle('customSecret:remove', (_evt, name: unknown) => {
  if (typeof name !== 'string' || secretNameProblem(name)) return { ok: false, error: 'unknown secret' };
  try { integrations.deleteSecret(customSecretRef(name)); } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
  return { ok: true };
});
// Probe an integration's reachability through the broker's own auth path (admin-only;
// runs in main, so the secret is used but never returned — only the upstream status).
ipcMain.handle('integrations:test', async (evt, payload: unknown) => {
  const p = (payload ?? {}) as { id?: unknown; path?: unknown };
  // Test before Connect, with the token typed on the form and nothing kept (core/integrationTest.ts).
  const typed = draftForTest(payload);
  if (typed && 'error' in typed) return { ok: false, error: typed.error };
  if (!typed && (typeof p.id !== 'string' || !p.id)) return { ok: false, error: 'id required' };
  const rec = typed ? typed.rec : integrations.getRecord(p.id as string);
  if (!rec) return { ok: false, error: 'unknown integration' };
  const probe = validateBaseUrl(rec.baseUrl);
  if (!probe.ok) return { ok: false, error: probe.error };
  // Confine the probe path through the SAME gate as the worker forward() path, so an
  // absolute URL / backslash-host / traversal in p.path can't override the origin and
  // exfiltrate the secret to an attacker host. Resolve (and reject) BEFORE the secret
  // is ever materialized, so a bad path never even decrypts it.
  // 0.5.5: with no path asked for, the record's (or its template's) read only
  // probe path, not the bare baseUrl that 404s whatever the key.
  const probePath = typeof p.path === 'string' && p.path ? p.path : probePathFor(INTEGRATION_TEMPLATES, rec);
  const target = resolveUpstreamUrl(rec.baseUrl, probePath);
  if (!target) return { ok: false, error: 'path escapes the integration baseUrl', code: 'bad_request' };
  let secret: string | undefined;
  if (typed) {
    secret = typed.secret;
  } else {
    secret = integrations.getSecret(rec.secretRef, { kind: 'http', url: rec.baseUrl });
  }
  // Both halves: a query-parameter API carries its credential in the URL, so a
  // probe that merged only the headers would report 401 on a working key.
  const { headers, query } = buildAuthRequest(rec, secret);
  for (const [k, v] of Object.entries(query)) target.searchParams.set(k, v);
  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 15_000);
    // 0.5.6: monday.com takes its GraphQL query in a POST body, so a GET
    // cannot confirm a good token; its template names a read only query.
    const gql = typeof p.path === 'string' && p.path ? '' : probeQueryFor(INTEGRATION_TEMPLATES, rec);
    const r = gql
      ? await fetch(target, { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify({ query: gql }), redirect: 'manual', signal: ac.signal })
      : await fetch(target, { method: 'GET', headers, redirect: 'manual', signal: ac.signal });
    clearTimeout(timer);
    if (!typed) logConnTest(rec.id, r.ok, r.status);
    return { ok: r.ok, status: r.status };
  } catch (e) {
    if (!typed) logConnTest(rec.id, false);
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
});
/** One `conn-test` line for the connection's Activity tab (0.5.6): passed or
 *  not, and the status. Never the URL, its query or the error text. */
function logConnTest(id: string, ok: boolean, status?: number): void {
  try { hive.appendLog({ kind: 'conn-test', id, ok, ...(status !== undefined ? { status } : {}) }); } catch { /* hive not bootstrapped yet */ }
}
// The Integrations screen's Activity tab (0.5.6): the last events of one
// integration, newest first, from the tail of the hive log
// (./integrationActivity.ts). A key of any other shape is an empty list.
ipcMain.handle('integrations:activity', (evt, key: unknown) => {
  // In a window on an office: that office's own log.
  const root = hive.root();
  let reg: ReturnType<typeof hive.registry> = { godId: null, agents: {} };
  try { reg = hive.registry(); } catch { /* names fall back to ids */ }
  const nameOf = (id: string): string | undefined => reg.agents[id]?.name ?? (id === 'god' && reg.godId ? reg.agents[reg.godId]?.name : undefined);
  return integrationActivity(root ? join(root, 'log.jsonl') : null, key, { nameOf });
});
ipcMain.handle('config:get', (evt): HarnessConfig | Promise<HarnessConfig> => {
  return readConfig();
});
// The settings file, agent list or board that exists but does not read: each is
// kept as it is with a copy beside it, and writes to it pause (damagedFile.ts).
// The window polls this for its banner.
ipcMain.handle('integrity:issues', () => [...configIntegrityIssues(), ...hive.integrityIssues()]);
// The banner's "show the file": selects the damaged file in the file
// manager, its dated copy beside it. Only a file the list above names right
// now, by that name; never a path from the window.
ipcMain.handle('integrity:reveal', (_evt, name: unknown) => {
  if (typeof name !== 'string' || !name || basename(name) !== name) return { ok: false, error: 'not-listed' };
  const p = configDamagedPath(name) ?? hive.damagedPath(name);
  if (!p) return { ok: false, error: 'not-listed' };
  shell.showItemInFolder(p);
  return { ok: true };
});

// Settings, Graphics. The status is what is IN FORCE (the mode read before
// ready) beside what is saved; a saved change applies on the next start.
function graphicsStatusView(): GraphicsStatusView {
  let feature: Record<string, string> | null = null;
  try { feature = app.getGPUFeatureStatus() as unknown as Record<string, string>; } catch { /* unknown */ }
  return { ...graphicsStatus(readConfig(), feature), runningAgents: ptyManager.list().length };
}
ipcMain.handle('graphics:status', () => graphicsStatusView());
ipcMain.handle('graphics:setMode', (_evt, mode: unknown) => {
  setGraphicsMode(mode);
  try { hive.appendLog({ kind: 'graphics-set', mode: typeof mode === 'string' ? mode : null, applied: appliedGraphicsMode() }); } catch { /* best effort */ }
  return graphicsStatusView();
});
// The same clean relaunch as a change of hive folder: agents stop, the app
// starts again and reads the new mode before its window opens.
ipcMain.handle('graphics:restart', () => {
  allowQuit = true;
  try { ptyManager.killAll(); } catch (e) { console.error('[graphics] killAll:', e); }
  app.relaunch();
  app.exit(0);
});
// `--no-god` / MD_NO_GOD=1, DEV BUILDS ONLY: the renderer skips booting the
// orchestrator. Every launch otherwise spawns a real, paid `claude` session
// (resolved by absolute path, so a stripped PATH does not stop it); a UI check
// on a throwaway home has no use for one. Ignored in a packaged app so the
// switch can never reach a user.
const DEV_NO_GOD = !app.isPackaged && (process.argv.includes('--no-god') || process.env.MD_NO_GOD === '1');
if (DEV_NO_GOD) console.log('[dev] --no-god: the orchestrator will not be spawned');
ipcMain.handle('dev:noGod', (): boolean => DEV_NO_GOD);
ipcMain.handle('config:update', (_evt, patch: Partial<HarnessConfig>) => updateLocalConfig(patch));

function updateLocalConfig(patch: Partial<HarnessConfig>): HarnessConfig {
  // The cap on a context rule's message holds for this call too, not only for
  // the trigger form's own (`triggers:setContext`).
  if (patch && 'contextTrigger' in patch && contextMessageOverCap(patch.contextTrigger, readConfig().contextTrigger)) throw new Error(CONTEXT_MESSAGE_TOO_LONG);
  // FIRST RUN: every hive-bound service is started by bootstrapHiveServices(),
  // which runs once at app-ready and early-returns on `!hive.enabled()` — i.e.
  // whenever harnessHome is still null, which is exactly the state a fresh
  // install boots in. Onboarding then sets harnessHome through THIS handler and
  // nothing re-bootstrapped, so the hook server, message router, telemetry
  // collector and mission scheduler all stayed dead for the rest of the session.
  //
  // Symptom: agents spawn and run (the PTY is not hive-bound), but no hook ever
  // reaches the app — no `hooks.sock` on disk, so no SessionStart, which means
  // recordSession() is never called and "Restart & Continue" fails with "No
  // recorded session ID"; the cards also sit on "ctx no status tick yet" and 0
  // tool calls. Everything healed on the next app launch, which is what hid it.
  //
  // changeHome() has always handled this by relaunching; onboarding does not
  // relaunch, so bootstrap here on the null → set transition. Gated on the
  // transition so ordinary config writes never re-enter it.
  const hiveWasEnabled = hive.enabled();
  const wasOnboarded = readConfig().onboardingComplete;
  // 0.5.2: the responder is an agent id or nothing. '' from the Settings
  // select means "the orchestrator" and is stored as ABSENT, so a cleared
  // field and an older config.json with no field read the same.
  if ('responder' in patch) {
    patch.responder = typeof patch.responder === 'string' && patch.responder.trim() ? patch.responder.trim() : undefined;
  }
  // 0.5.3: the webhook default is stored the same way.
  if ('webhookResponder' in patch) {
    patch.webhookResponder = typeof patch.webhookResponder === 'string' && patch.webhookResponder.trim() ? patch.webhookResponder.trim() : undefined;
  }
  // 0.5.5: the season is one of two words or absent, and absent is Halloween.
  if ('seasonalTheme' in patch) {
    patch.seasonalTheme = patch.seasonalTheme === 'halloween' || patch.seasonalTheme === 'none' ? patch.seasonalTheme : undefined;
  }
  const next = writeConfig(patch);
  // Live opt-in/out from Settings → Privacy (TELEMETRY.md).
  if (typeof patch?.telemetryEnabled === 'boolean') analytics.setEnabled(patch.telemetryEnabled);
  // Activation funnel (v0.4.6): onboarding just finished (false → true) — the top of
  // the launch → first-agent funnel. `provider` is the engine chosen in the wizard.
  // Fired here (main), not in the renderer, so it rides the same allowlist as the rest.
  if (!wasOnboarded && next.onboardingComplete) {
    analytics.track('onboarding_completed', { provider: next.godProvider ?? 'claude' });
  }
  // Keep the hive's mirror of the spawn gate current. The queue itself reads
  // config per tick so it gates immediately; this is for the PROMPT, which is
  // built per spawn, so flipping the toggle reaches god the next time he starts.
  if (typeof patch?.orchestratorMaySpawn === 'boolean') hive.setOrchestratorMaySpawn(patch.orchestratorMaySpawn);
  if (patch && 'ticketPrefix' in patch) hive.setTicketPrefix(patch.ticketPrefix);
  if (!hiveWasEnabled && hive.enabled()) {
    console.log('[hive] harnessHome configured — bootstrapping hive services');
    try { bootstrapHiveServices(); } catch (e) { console.error('[hive] bootstrap after onboarding:', e); }
  }
  return next;
}
ipcMain.handle('config:setAgentMcp', (evt, agentId: unknown, mcpId: unknown, enabled: unknown) => {
  return setAgentMcp(agentId, mcpId, enabled);
});
// 0.5.6: one skill turned off or back on for one agent (shared/agentSkills.ts).
ipcMain.handle('config:setAgentSkillOff', (evt, agentId: unknown, skill: unknown, off: unknown) => {
  return setAgentSkillOff(agentId, skill, off);
});
// One Codex agent's own memories into search. On is refused for an
// agent that is not Codex. Off removes the copy now, not at the next mine pass; the pass after copies nothing.
ipcMain.handle('config:setAgentCodexMemory', (_evt, agentId: unknown, on: unknown) => {
  const root = hive.root();
  const agent = typeof agentId === 'string' && root ? hive.registry().agents[agentId] : undefined;
  if (on === true && agent?.provider !== 'codex') throw new Error('codex memory is for Codex agents only');
  const out = setAgentCodexMemory(agentId, on);
  if (on === false && agent && root) removeCodexMemory(join(root, 'agents', agentId as string));
  return out;
});
/** The skill folders each agent was STARTED with turned off, by agent id, for
 *  this run of the app. A running agent keeps the settings it started with, so
 *  the capabilities sheet compares this with the config to say which agent
 *  still needs a restart (founder, 15 Oct 2026: the untick looked broken). */
// Filled at each start by the spawn path (core/spawnAgent.ts, `startedWithSkillsOff`).
const skillsOffAtLaunch = new Map<string, string[]>();
ipcMain.handle('config:skillsOffAtLaunch', () => Object.fromEntries(skillsOffAtLaunch));
// Sprite editor: create / update / delete a custom avatar. Validated and merged
// in main against the config on disk, like the two handlers above.
ipcMain.handle('config:saveAvatar', (_evt, input: unknown) => saveAvatar(input));
ipcMain.handle('config:deleteAvatar', (_evt, id: unknown) => deleteAvatar(id));
ipcMain.handle('config:ensureHome', (_evt, path: unknown) => {
  if (typeof path !== 'string' || path.length === 0) return { ok: false, error: 'invalid path' };
  return ensureHarnessHome(path);
});

// The new project step asks whether a chosen folder is empty
// before it is used. Read only: nothing is created or written.
ipcMain.handle('folder:state', (_evt, path: unknown) => folderState(path));

// Change the harnessHome folder. Because every derived path (hive root, palace,
// sock, agent dirs) resolves lazily through getHome(), the only real work is
// optionally MOVING the existing hive + palace and relaunching so every service
// re-binds against the new root. mode: 'move' copies the data (old kept as a
// safety net), 'fresh' just re-points and bootstraps an empty home.
ipcMain.handle('config:changeHome', async (_evt, payload: unknown) => {
  const p = (payload ?? {}) as { newHome?: unknown; mode?: unknown };
  if (typeof p.newHome !== 'string' || !p.newHome) return { ok: false, error: 'invalid newHome' };
  const mode: 'move' | 'fresh' = p.mode === 'fresh' ? 'fresh' : 'move';
  // expandTilde BEFORE resolve: both UI callers feed a folder-dialog result
  // (always absolute), but the hive picker's recents list can serve a literal
  // "~/…" persisted by a pre-#140 build — resolve() would anchor that at cwd
  // and the app would relaunch against a real directory named "~". Same
  // defence-in-depth-at-the-consumer rule as expandTilde's own doc.
  const newHome = resolve(expandTilde(p.newHome));
  const oldRaw = readConfig().harnessHome;
  const oldHome = oldRaw ? resolve(oldRaw) : null;

  // Guard against same-folder / nested-folder (a move would self-copy forever).
  if (oldHome) {
    if (newHome === oldHome) return { ok: false, error: 'That is already the current home folder.' };
    const a = newHome + sep, b = oldHome + sep;
    if (a.startsWith(b) || b.startsWith(a)) {
      return { ok: false, error: 'Pick a folder that is not inside (or a parent of) the current home.' };
    }
  }

  const ensured = ensureHarnessHome(newHome);
  if (!ensured.ok) return ensured;

  // Tear down everything bound to the OLD root before copying, so nothing writes
  // mid-copy — a live git commit into hive/.git would otherwise be copied as a
  // half-written object and corrupt the moved repo.
  try { stopAutomationArming(); } catch (e) { console.error('[changeHome] stopAutomationArming:', e); }
  try { clearMissionTimers(); } catch (e) { console.error('[changeHome] clearMissionTimers:', e); }
  try { clearContextTimers(); } catch (e) { console.error('[changeHome] clearContextTimers:', e); }
  try { stopWebhookDoneObserver(); } catch (e) { console.error('[changeHome] stopWebhookDoneObserver:', e); }
  try { stopEphemeralWorkerWatcher(); } catch (e) { console.error('[changeHome] stopWorkerWatcher:', e); }
  try { integrationBroker.stop(); } catch (e) { console.error('[changeHome] broker.stop:', e); }
  try { hive.stopRouter(); } catch (e) { console.error('[changeHome] stopRouter:', e); }
  try { hookServer.stop(); } catch (e) { console.error('[changeHome] hookServer.stop:', e); }
  try { stopSlackIngestion(); } catch (e) { console.error('[changeHome] slack.stop:', e); }
  try { stopWebhookServer(); } catch (e) { console.error('[changeHome] webhook.stop:', e); }
  try { memory.stop(); } catch (e) { console.error('[changeHome] memory.stop:', e); }
  try { reflector.stop(); } catch (e) { console.error('[changeHome] reflector.stop:', e); }
  try { handoffJob.stop(); } catch (e) { console.error('[changeHome] handoffJob.stop:', e); }
  try { stopCodexSessionPrune(); } catch (e) { console.error('[changeHome] stopCodexSessionPrune:', e); }
  // The hive commit queue runs git in the background (0.5.5): commit what is
  // marked against the OLD root and wait for git, at most 10 s, gc stopped
  // rather than waited for. Past that the running git is stopped as a tree
  // and waited for, so the copy below never catches a half-written object.
  // When the flush ran out of time the copy waits for the queue, at most 2
  // minutes (each of its git steps has its own time limit).
  try {
    if (!(await hive.flushCommits()) && !(await hive.waitCommitQueue(120_000))) console.error('[changeHome] the commit queue did not finish in 2 minutes; copying anyway');
  } catch (e) { console.error('[changeHome] flushCommits:', e); }

  if (mode === 'move' && oldHome) {
    try {
      // roster.json + its backups ride along with hive/palace: the roster is the
      // renderer's half of the same state, and leaving it behind would move the
      // agents' sessions and memory to the new home while their names, notes and
      // worktree paths stayed at the old one.
      // 0.5.6: palace.rebuilt-056 is the marker of the one time store rebuild
      // (palaceScope.ts). It rides with the store, or the new home would set
      // the store aside a second time.
      for (const sub of ['hive', 'palace', 'palace.rebuilt-056', 'roster.json', 'roster-backups']) {
        const src = join(oldHome, sub);
        if (!existsSync(src)) continue;
        // cpSync copies the whole tree incl. .git and is cross-device safe (unlike
        // renameSync, which throws EXDEV across volumes). We COPY, never delete —
        // the old folder stays as a safety net the user removes manually.
        cpSync(src, join(newHome, sub), { recursive: true, force: true, dereference: false });
      }
    } catch (e) {
      // Copy failed: recover IN PLACE against the unchanged old home (config never
      // repointed) so the user loses nothing, and surface the error — no relaunch.
      bootstrapHiveServices();
      const cfg = readConfig();
      if (cfg.slackEnabled) void startSlackIngestion();
      reconcileWebhookServer();
      return { ok: false, error: `Could not copy data: ${e instanceof Error ? e.message : String(e)}` };
    }
  }

  // Repoint config and relaunch so every service re-bootstraps against newHome.
  // (Identical recovery path to resetAll — relaunch is the clean re-bind.)
  allowQuit = true;
  writeConfig({ harnessHome: newHome });
  try { ptyManager.killAll(); } catch (e) { console.error('[changeHome] killAll:', e); }
  app.relaunch();
  app.exit(0);
  return { ok: true as const }; // unreachable (process exits) — typed for the renderer
});


/** Reveal a path in the OS file browser — Finder, Explorer, or whatever the
 *  Linux desktop registers. Backs ⌘-click on a terminal path we cannot open
 *  ourselves (an image, an archive, an unknown extension).
 *
 *  `showItemInFolder`, NEVER `shell.openPath`, for a file. The path arrives
 *  from agent output, and openPath hands an arbitrary file to its default
 *  application: a printed `installer.dmg` or `.desktop` would be one click from
 *  executing. Revealing only ever opens a file browser, so the worst an agent
 *  can achieve by printing a path is a window at a folder the user could
 *  already open themselves.
 *
 *  Directory packages such as macOS .app bundles can execute through
 *  openPath too. Every kind of path is selected in its parent instead. */
ipcMain.handle('fs:revealPath', async (_evt, p: unknown) => {
  if (typeof p !== 'string' || !p.length || p.length > 4096 || p.includes('\0')) {
    return { ok: false, error: 'bad request' };
  }
  const st = await statAbs(p);
  if (!st.exists) return { ok: false, error: 'not found' };
  try {
    shell.showItemInFolder(st.path);
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
});

/**
 * Delete means TRASH, and it is not a policy this handler is free to revisit.
 *
 * `shell.trashItem` puts the path in the OS bin, where the person who deleted
 * the wrong thing can get it back with the gesture they already know. An
 * `unlink` here would be the app permanently destroying a file on behalf of a
 * click in a tree — and the tree is one row tall, so the click that deletes
 * the file is one pixel from the click that opens it.
 */
ipcMain.handle('fs:trash', async (_evt, root: unknown, rel: unknown) => {
  if (typeof root !== 'string' || typeof rel !== 'string') return { ok: false, error: 'invalid args' };
  if (!rel.trim() || rel.includes('\0')) return { ok: false, error: 'invalid args' };
  const abs = await safeResolve(root, rel);
  if (!abs) return { ok: false, error: 'path escapes root' };
  // Trashing the root itself would take the workspace with it.
  if (abs === await safeResolve(root, '')) return { ok: false, error: 'that is the workspace itself' };
  try {
    await shell.trashItem(abs);
    return { ok: true as const, path: abs };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
});

// ─── IPC: roster mirror (shared between dev and a packaged build) ───────────
// The renderer's store is built synchronously at module load, before any async
// IPC could resolve, so the read is `ipcMain.on` + `returnValue` — one blocking
// round trip at boot, in exchange for the roster being correct on first paint
// instead of flashing an empty floor and then filling in.
// (`roster` itself is constructed earlier so HookServer can read standing goals.)
ipcMain.on('roster:readSync', (evt) => { evt.returnValue = roster.read(); });
ipcMain.on('config:homeSync', (evt) => { evt.returnValue = readConfig().harnessHome ?? null; });
ipcMain.handle('roster:write', (_evt, snap: unknown) => roster.write(snap));
// ─── IPC: hive, control, memory, files and git (this computer) ──────────────
// Every core call is answered here, by this computer's own hive and stores.
ipcMain.handle('hive:registry', () => hive.registry());
ipcMain.handle('hive:renameAgent', (_evt, id: unknown, name: unknown) => {
  if (typeof id !== 'string' || typeof name !== 'string') return { ok: false, error: 'Invalid rename request' };
  return hive.renameAgent(id, name);
});
ipcMain.handle('hive:setAgentHold', (_evt, id: unknown, hold: unknown) => {
  if (typeof id !== 'string' || typeof hold !== 'boolean') return { ok: false, error: 'Invalid hold request' };
  return hive.setAgentHold(id, hold);
});
ipcMain.handle('hive:wake', async (_evt, id: unknown) => {
  if (typeof id !== 'string' || !id) return { ok: false, error: 'invalid id' };
  try { await agentDemand.wake(id); return { ok: true }; } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
});
ipcMain.handle('hive:board', () => hive.board());
ipcMain.handle('hive:tasks', () => hive.tasks());
ipcMain.handle('hive:tasksSince', (_evt, since: unknown) => hive.tasksSince(typeof since === 'string' ? since : ''));
ipcMain.handle('hive:ticketPrefix', () => hive.ticketMeta(hive.tasks()).prefix);
ipcMain.handle('hive:tasksArchive', () => hive.tasksArchive());
ipcMain.handle('hive:log', (_evt, n: unknown) => hive.logTail(typeof n === 'number' ? n : 200));
ipcMain.handle('hive:memory', (_evt, id: unknown) => (typeof id === 'string' ? hive.memory(id) : ''));
ipcMain.handle('hive:inbox', (_evt, id: unknown) => (typeof id === 'string' ? hive.inbox(id) : []));
ipcMain.handle('hive:inboxPath', (_evt, id: unknown) => (typeof id === 'string' ? hive.inboxPath(id) : null));
ipcMain.handle('hive:messages', (_evt, opts: unknown) =>
  hive.voiceMessages(opts && typeof opts === 'object' ? (opts as Parameters<typeof hive.voiceMessages>[0]) : {}));
ipcMain.handle('hive:send', (_evt, partial: Partial<HiveMessage>, from: unknown) => {
  if (!hive.enabled()) return { ok: false, error: 'hive disabled (no harnessHome)' };
  const sender = typeof from === 'string' ? from : 'system';
  const msg = hive.send(partial ?? {}, sender);
  if (sender === 'human') analytics.trackMessageSent('hive');
  return { ok: true, message: msg };
});
ipcMain.handle('hive:addTask', (_evt, task: unknown) => {
  if (!task || typeof task !== 'object' || Array.isArray(task) || typeof (task as { id?: unknown }).id !== 'string') {
    return { ok: false, error: 'invalid task' };
  }
  if (!hive.enabled()) return { ok: false, error: 'hive disabled (no harnessHome)' };
  return { ok: hive.addTask(task as HiveTask) };
});
ipcMain.handle('hive:patchTask', (_evt, id: unknown, patch: unknown) => {
  if (typeof id !== 'string' || !id || !patch || typeof patch !== 'object' || Array.isArray(patch)) {
    return { ok: false, error: 'invalid task patch' };
  }
  if (!hive.enabled()) return { ok: false, error: 'hive disabled (no harnessHome)' };
  return { ok: hive.patchTask(id, patch as Partial<Omit<HiveTask, 'id'>>) };
});
ipcMain.handle('hive:patchTasks', (_evt, patches: unknown) => {
  if (!Array.isArray(patches)) return { ok: false, applied: [], error: 'invalid task patches' };
  if (!hive.enabled()) return { ok: false, applied: [], error: 'hive disabled (no harnessHome)' };
  const list = patches.filter((p): p is { id: string; patch: Partial<Omit<HiveTask, 'id'>> } =>
    !!p && typeof p === 'object' && typeof (p as { id?: unknown }).id === 'string'
    && !!(p as { patch?: unknown }).patch && typeof (p as { patch?: unknown }).patch === 'object');
  return { ok: true, applied: hive.patchTasks(list) };
});
ipcMain.handle('hive:answerQuestion', (_evt, taskId: unknown, ref: unknown, change: unknown) => {
  if (typeof taskId !== 'string' || !taskId) return { ok: false, error: 'invalid task id' };
  if (!hive.enabled()) return { ok: false, error: 'hive disabled (no harnessHome)' };
  const [r] = hive.answerQuestions([{ taskId, ref: ref as HumanQARef, change: change as HumanQAChange }]);
  return r?.ok ? { ok: true } : { ok: false, error: r?.error ?? 'invalid' };
});
ipcMain.handle('hive:answerQuestions', (_evt, items: unknown) => {
  if (!Array.isArray(items)) return { ok: false, applied: [], error: 'invalid answers' };
  if (!hive.enabled()) return { ok: false, applied: [], error: 'hive disabled (no harnessHome)' };
  const results = hive.answerQuestions(items as Array<{ taskId: string; ref: HumanQARef; change: HumanQAChange }>);
  const failed = results.find((r) => !r.ok);
  return { ok: !failed, applied: results.filter((r) => r.ok).map((r) => r.taskId), ...(failed ? { error: failed.error ?? 'invalid' } : {}) };
});
ipcMain.handle('hive:deleteTask', (_evt, id: unknown) => {
  if (typeof id !== 'string' || !id) return { ok: false, error: 'invalid task id' };
  if (!hive.enabled()) return { ok: false, error: 'hive disabled (no harnessHome)' };
  return { ok: hive.deleteTask(id) };
});
ipcMain.handle('hive:setArchived', (_evt, id: unknown, archived: unknown) => {
  if (typeof id !== 'string') return { ok: false, error: 'invalid id' };
  if (!hive.enabled()) return { ok: false, error: 'hive disabled (no harnessHome)' };
  hive.setArchived(id, archived === true);
  return { ok: true };
});
ipcMain.handle('hive:patchAgentRole', (_evt, id: unknown, role: unknown) => {
  if (typeof id !== 'string') return { ok: false, error: 'invalid id' };
  if (typeof role !== 'string') return { ok: false, error: 'invalid role' };
  if (!hive.enabled()) return { ok: false, error: 'hive disabled (no harnessHome)' };
  return hive.patchAgentRole(id, role);
});
ipcMain.handle('hive:archivedAtBoot', () => bootGate.snapshot());
ipcMain.handle('hive:heldAtBoot', () => bootGate.heldAtBoot());
ipcMain.handle('hive:history', (_evt, req: unknown) => historyService.page(req));
ipcMain.handle('hive:agentUsage', (_evt, cwd: unknown) => (typeof cwd === 'string' ? readAgentUsage(cwd) : null));
ipcMain.handle('hive:agentContext', (_evt, agentId: unknown) => {
  if (typeof agentId !== 'string') return null;
  const tp = hookServer.transcriptPath(agentId);
  if (!tp) return null;
  return readContextTokens(tp) ?? 0;
});
ipcMain.handle('hive:agentContextLimit', (_evt, agentId: unknown) =>
  (typeof agentId === 'string' ? hookServer.contextFor(agentId)?.limit ?? null : null));
ipcMain.handle('hive:agentDirectory', () => {
  if (!hive.enabled()) return { godId: null, agents: [] };
  const reg = hive.registry();
  const snap = telemetry.snapshot();
  const usageById = new Map(snap.usage.map((u) => [u.agentId, u]));
  const now = Date.now();
  const agents = Object.entries(reg.agents).map(([id, a]) => {
    const u = usageById.get(id);
    const spans = snap.spans[id] ?? [];
    const tokens = u ? u.input + u.output + u.cacheRead + u.cacheCreation : 0;
    const ctx = hookServer.contextFor(id);
    return {
      id,
      name: a.name,
      role: a.role ?? (a.isGod ? 'orchestrator' : 'agent'),
      provider: a.provider ?? 'claude',
      model: u?.model ?? null,
      status: a.status ?? 'idle',
      cwd: a.cwd ?? null,
      cwdValid: a.cwdValid ?? null,
      archived: !!a.archived,
      isGod: !!a.isGod,
      isAssistant: !!a.isAssistant,
      sessionId: a.sessionId ?? null,
      hasMemory: hive.hasMemory(id),
      inboxBacklog: hive.inboxBacklog(id),
      breaker: breaker.levelFor(id),
      tokens,
      usd: u ? Number(u.usd.toFixed(4)) : 0,
      lastTool: spans.length ? spans[spans.length - 1].tool : null,
      lastActiveSecAgo: u ? Math.round((now - u.ts) / 1000) : null,
      contextTokens: ctx?.tokens ?? null,
      contextLimit: ctx?.limit ?? null,
      contextPct: ctx && ctx.limit > 0 ? Math.round((ctx.tokens / ctx.limit) * 100) : null
    };
  });
  return { godId: reg.godId, agents };
});

ipcMain.handle('tools:status', () => readToolsStatus(memory));
ipcMain.handle('skills:local', (_evt, cwd: unknown): LocalSkill[] => {
  const cfg = readConfig();
  const cwds = [...(typeof cwd === 'string' && cwd ? [cwd] : []), ...(cfg.registeredRepos ?? [])];
  try { return listLocalSkills({ cwds, bundledDir: skillsResourceDir() }); } catch (e) { console.error('[skills] local scan failed:', e); return []; }
});
ipcMain.handle('skills:catalog', (_evt, force: unknown) =>
  loadCatalog(join(app.getPath('userData'), 'skill-catalog.json'), { force: force === true }));
ipcMain.handle('skills:install', (_evt, url: unknown, name: unknown) => {
  if (typeof url !== 'string' || typeof name !== 'string') return { ok: false as const, error: 'bad request' };
  return installSkill(url, name);
});
ipcMain.handle('skills:uninstall', (_evt, path: unknown) => {
  if (typeof path !== 'string') return { ok: false as const, error: 'bad request' };
  return uninstallSkill(path, { cwds: readConfig().registeredRepos ?? [] });
});

ipcMain.handle('hive:memoryStatus', () => memory.refresh());
ipcMain.handle('hive:searchMemory', (_evt, query: unknown, wing: unknown) => {
  if (typeof query !== 'string' || !query.trim()) return { ok: false, output: '', error: 'empty query' };
  return memory.search(query, { wing: typeof wing === 'string' ? wing : undefined });
});
ipcMain.handle('hive:memoryWakeUp', (_evt, wing: unknown) => memory.wakeUp(typeof wing === 'string' ? wing : undefined));
ipcMain.handle('hive:mineNow', () => { memory.mineNow(); return { ok: true }; });
ipcMain.handle('memory:reflectNow', (_evt, id: unknown) => reflector.reflectNow(typeof id === 'string' && id ? id : undefined));

ipcMain.handle('kg:status', () => knowledge.status());
ipcMain.handle('kg:list', () => knowledge.list());
ipcMain.handle('kg:search', (_evt, query: unknown, limit: unknown) => {
  if (typeof query !== 'string' || !query.trim()) return [];
  return knowledge.search(query, typeof limit === 'number' ? limit : undefined);
});
ipcMain.handle('kg:get', (_evt, id: unknown) => (typeof id === 'string' && id ? knowledge.get(id) : null));
ipcMain.handle('kg:remove', (_evt, id: unknown) => ({ ok: typeof id === 'string' && id ? knowledge.remove(id) : false }));
ipcMain.handle('kg:ingestFiles', (_evt, payload: unknown) => {
  const p = (payload ?? {}) as { paths?: unknown; tags?: unknown };
  const paths = Array.isArray(p.paths) ? p.paths.filter((x): x is string => typeof x === 'string') : [];
  const tags = Array.isArray(p.tags) ? p.tags.filter((x): x is string => typeof x === 'string') : undefined;
  const results = paths.map((srcPath) => {
    try {
      const r = knowledge.ingestFile(srcPath, { tags });
      return { ok: true as const, srcPath, docId: r.docId, chunkCount: r.chunkCount };
    } catch (e) {
      return { ok: false as const, srcPath, error: e instanceof Error ? e.message : String(e) };
    }
  });
  return { results };
});

ipcMain.handle('history:add', (_evt, payload: unknown) => {
  const p = (payload ?? {}) as { agentId?: unknown; cwd?: unknown; text?: unknown };
  if (typeof p.agentId !== 'string' || typeof p.text !== 'string') return { ok: false, error: 'invalid args' };
  try {
    persist.addHistory({ agentId: p.agentId, cwd: typeof p.cwd === 'string' ? p.cwd : null, text: p.text });
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
});
ipcMain.handle('history:list', (_evt, agentId: unknown, limit: unknown) =>
  persist.listHistory(typeof agentId === 'string' && agentId ? agentId : undefined, typeof limit === 'number' ? limit : undefined));
ipcMain.handle('history:search', (_evt, query: unknown, limit: unknown) =>
  persist.searchHistory(typeof query === 'string' ? query : '', typeof limit === 'number' ? limit : undefined));

ipcMain.handle('telemetry:usage', (_evt, agentId: unknown) => (typeof agentId === 'string' ? usageProvider.getAgentUsage(agentId) : null));
ipcMain.handle('telemetry:spans', (_evt, agentId: unknown) => (typeof agentId === 'string' ? telemetry.getSpans(agentId) : []));
ipcMain.handle('telemetry:snapshot', () => telemetry.snapshot());
ipcMain.handle('telemetry:usageLimits', (_evt, opts: unknown) =>
  usageLimits.read(opts && typeof opts === 'object' ? (opts as UsageLimitsReadOptions) : {}));

ipcMain.handle('control:setBreakerState', (_evt, state: unknown) => {
  try { liveWebContents()?.send('control:breakerState', state); } catch { /* window tore down */ }
  return { ok: true };
});
ipcMain.handle('control:pause', (_evt, agentId: unknown, on: unknown) => {
  if (typeof agentId !== 'string') return null;
  control.pause(agentId, on === true);
  return control.snapshot(agentId);
});
ipcMain.handle('control:autoDelivery', (_evt, agentId: unknown, paused: unknown) => {
  if (typeof agentId !== 'string') return null;
  const on = paused === true;
  control.pauseAutoDelivery(agentId, on);
  const current = new Set(readConfig().autoDeliveryPausedAgents ?? []);
  if (on) current.add(agentId); else current.delete(agentId);
  writeConfig({ autoDeliveryPausedAgents: Array.from(current).sort() });
  return control.snapshot(agentId);
});
ipcMain.handle('control:resume', (_evt, agentId: unknown) => {
  if (typeof agentId !== 'string') return null;
  control.resume(agentId);
  return control.snapshot(agentId);
});
ipcMain.handle('control:gateTool', (_evt, agentId: unknown, tool: unknown, on: unknown) => {
  if (typeof agentId !== 'string' || typeof tool !== 'string') return null;
  control.gateTool(agentId, tool, on === true);
  return control.snapshot(agentId);
});
ipcMain.handle('control:steer', (_evt, agentId: unknown, text: unknown) => {
  if (typeof agentId !== 'string' || typeof text !== 'string') return null;
  control.steer(agentId, text);
  analytics.trackMessageSent('steer');
  return control.snapshot(agentId);
});
ipcMain.handle('control:halt', (_evt, agentId: unknown) => {
  if (typeof agentId !== 'string') return null;
  control.halt(agentId);
  return control.snapshot(agentId);
});
ipcMain.handle('control:unhalt', (_evt, agentId: unknown) => {
  if (typeof agentId !== 'string') return null;
  control.unhalt(agentId);
  return control.snapshot(agentId);
});
ipcMain.handle('control:snapshot', (_evt, agentId: unknown) => (typeof agentId === 'string' ? control.snapshot(agentId) : null));

ipcMain.handle('missions:list', () => readConfig().missions ?? []);
ipcMain.handle('missions:save', (_evt, missions: unknown) => {
  storeMissions((Array.isArray(missions) ? missions : []) as ScheduledMission[]);
  return { ok: true };
});
ipcMain.handle('workers:history', () => listWorkerHistory());

ipcMain.handle('fs:listDir', (_evt, root: unknown, rel: unknown) => {
  if (typeof root !== 'string' || typeof rel !== 'string') return { ok: false, error: 'invalid args' };
  return listDir(root, rel);
});
ipcMain.handle('fs:readFile', (_evt, root: unknown, rel: unknown) => {
  if (typeof root !== 'string' || typeof rel !== 'string') return { ok: false, error: 'invalid args' };
  return readFileText(root, rel);
});
ipcMain.handle('fs:readBinary', (_evt, root: unknown, rel: unknown) => {
  if (typeof root !== 'string' || typeof rel !== 'string') return { ok: false, error: 'invalid args' };
  return readFileBinary(root, rel);
});
ipcMain.handle('fs:writeFile', (_evt, root: unknown, rel: unknown, content: unknown) => {
  if (typeof root !== 'string' || typeof rel !== 'string' || typeof content !== 'string') return { ok: false, error: 'invalid args' };
  return writeFileText(root, rel, content);
});
ipcMain.handle('fs:statAbs', (_evt, p: unknown) => {
  if (typeof p !== 'string' || p.length > 4096 || p.includes('\0')) return { exists: false, isFile: false, path: '' };
  return statAbs(p);
});
ipcMain.handle('fs:search', (_evt, root: unknown, query: unknown, opts: unknown) => {
  if (typeof root !== 'string' || typeof query !== 'string') return { ok: false, error: 'invalid args' };
  return searchInRoot(root, query, opts && typeof opts === 'object' ? (opts as SearchOptions) : {});
});
ipcMain.handle('fs:mkdir', (_evt, root: unknown, rel: unknown) => {
  if (typeof root !== 'string' || typeof rel !== 'string') return { ok: false, error: 'invalid args' };
  return makeDirIn(root, rel);
});
ipcMain.handle('fs:createFile', (_evt, root: unknown, rel: unknown) => {
  if (typeof root !== 'string' || typeof rel !== 'string') return { ok: false, error: 'invalid args' };
  return createFileIn(root, rel);
});
ipcMain.handle('fs:rename', (_evt, root: unknown, from: unknown, to: unknown) => {
  if (typeof root !== 'string' || typeof from !== 'string' || typeof to !== 'string') return { ok: false, error: 'invalid args' };
  return renameIn(root, from, to);
});

ipcMain.handle('git:isRepo', (_evt, cwd: unknown) => (typeof cwd === 'string' ? isRepo(cwd) : false));
ipcMain.handle('git:mainRepo', (_evt, cwd: unknown) => (typeof cwd === 'string' && cwd ? mainRepoRoot(cwd) : null));
ipcMain.handle('git:branch', (_evt, cwd: unknown) => (typeof cwd === 'string' ? getBranch(cwd) : { error: 'invalid cwd' }));
ipcMain.handle('git:status', (_evt, cwd: unknown) => (typeof cwd === 'string' ? getStatus(cwd) : { error: 'invalid cwd' }));
ipcMain.handle('git:log', (_evt, cwd: unknown, n: unknown) => {
  if (typeof cwd !== 'string') return { error: 'invalid cwd' };
  return getLog(cwd, typeof n === 'number' ? Math.min(500, Math.max(1, n)) : 50);
});
ipcMain.handle('git:branches', (_evt, cwd: unknown) => (typeof cwd === 'string' ? getBranches(cwd) : { error: 'invalid cwd' }));
ipcMain.handle('git:aheadBehind', (_evt, cwd: unknown) => (typeof cwd === 'string' ? getAheadBehind(cwd) : { error: 'invalid cwd' }));
ipcMain.handle('git:diff', (_evt, cwd: unknown, relPath: unknown) => {
  if (typeof cwd !== 'string' || typeof relPath !== 'string') return { ok: false, error: 'invalid args' };
  return getDiff(cwd, relPath);
});
ipcMain.handle('git:logGraph', (_evt, cwd: unknown, n: unknown, skip: unknown) => {
  if (typeof cwd !== 'string') return { error: 'invalid args' };
  const count = Math.min(500, Math.max(1, typeof n === 'number' ? n : 200));
  return getLogGraph(cwd, count, Math.max(0, typeof skip === 'number' ? skip : 0));
});
ipcMain.handle('git:commitFiles', (_evt, cwd: unknown, sha: unknown) => {
  if (typeof cwd !== 'string' || typeof sha !== 'string') return { error: 'invalid args' };
  return getCommitFiles(cwd, sha);
});
ipcMain.handle('git:showFile', (_evt, cwd: unknown, rev: unknown, relPath: unknown) => {
  if (typeof cwd !== 'string' || typeof rev !== 'string' || typeof relPath !== 'string') return { ok: false, error: 'invalid args' };
  return getFileAtRev(cwd, rev, relPath);
});
ipcMain.handle('git:compareRefs', (_evt, cwd: unknown, base: unknown, head: unknown, mode: unknown) => {
  if (typeof cwd !== 'string' || typeof base !== 'string' || typeof head !== 'string') return { error: 'invalid args' };
  return compareRefs(cwd, base, head, mode === 'two' ? 'two' : 'three');
});
ipcMain.handle('git:worktrees', (_evt, cwd: unknown) => (typeof cwd === 'string' ? listWorktrees(cwd) : { error: 'invalid args' }));
ipcMain.handle('git:checkout', (_evt, cwd: unknown, ref: unknown, detach: unknown) => {
  if (typeof cwd !== 'string' || typeof ref !== 'string') return { ok: false, error: 'invalid args' };
  // Never swap files under an agent that is working: a terminal in this tree
  // that wrote output in the last 10 seconds counts as mid run.
  const busy = ptyManager.list().find((p) =>
    (p.cwd === cwd || p.cwd.startsWith(cwd.endsWith('/') ? cwd : `${cwd}/`)) && Date.now() - p.lastOutputAt < 10_000);
  if (busy) return { ok: false, error: `an agent is actively working in this repo (${busy.id}) — try again when it goes quiet` };
  return checkoutRef(cwd, ref, detach === true);
});

// 0.5.3, feature 24: the worktree list (main/worktreeAdmin.ts holds the rules).
/** What only the running app knows: where the app makes worktrees, which
 *  terminals are running and in which folder, and the base it recorded. A folder
 *  that is still being set up has no terminal yet, so the tracked paths count as
 *  live as well. */
function worktreeAdminContext(): WorktreeAdminContext {
  const roots = new Set<string>();
  const home = readConfig().harnessHome;
  if (home) roots.add(join(home, 'worktrees'));
  for (const p of worktreePaths.values()) roots.add(dirname(p));
  for (const e of preservedWorktrees.values()) roots.add(dirname(e.wtPath));
  const bases = new Map<string, string>();
  for (const [id, p] of worktreePaths) { const b = worktreeBases.get(id) ?? liveWorkers.get(id)?.baseBranch; if (b) bases.set(p, b); }
  for (const e of preservedWorktrees.values()) bases.set(e.wtPath, e.baseBranch);
  return {
    roots: [...roots],
    liveCwds: [...ptyManager.list().map(t => t.cwd), ...worktreePaths.values()],
    // After a restart the maps are empty: the base written beside the worktree answers.
    baseFor: (p) => bases.get(p) ?? readWorktreeBase(p) ?? undefined
  };
}
ipcMain.handle('worktrees:list', () => listOwnedWorktrees(worktreeAdminContext()));
ipcMain.handle('worktrees:work', (_evt, path: unknown) => (typeof path === 'string' && path ? worktreeWork(path, worktreeAdminContext()) : null));
ipcMain.handle('worktrees:size', (_evt, path: unknown) => (typeof path === 'string' && path ? worktreeSize(path, worktreeAdminContext().roots) : null));
ipcMain.handle('worktrees:remove', (_evt, path: unknown, confirmed: unknown) => {
  if (typeof path !== 'string' || !path) return { ok: false, code: 'git-failed', error: 'invalid path' };
  return removeOwnedWorktree(path, confirmed === true, worktreeAdminContext());
});

// 0.5.6: the wake as it is to be typed right now, asked for by the renderer's
// drain at delivery. Null: nothing is pending that an earlier wake has not
// already carried, so the queued wake is dropped.
ipcMain.handle('hive:wakeText', (_evt, id: unknown) => (typeof id === 'string' ? inboxWakeFor(id) : null));
// trigger-prompt-058: mail a wake typed with no proof it was taken (WakeFiling.unconfirmed). Said on the agent's
// queue, and typed again only on the person's word (Type again): the watchdog's next wake prints it, once.
ipcMain.handle('hive:wakeUnconfirmed', (_evt, id: unknown) =>
  (typeof id === 'string' ? wakeFiling.unconfirmed(id, hive.inbox(id)).map((m) => String(m.id)) : []));
ipcMain.handle('hive:wakeRetry', (_evt, id: unknown) => {
  if (typeof id !== 'string') return [];
  const ids = wakeFiling.retry(id);
  if (ids.length) {
    workerWake.unannounce(id);
    try { hive.appendLog({ kind: 'wake-retry', agentId: id, ids }); } catch { /* the log is best effort */ }
  }
  return ids;
});
// 0.5.6: the window asks this before it types the clear it queued behind a
// hand off request. `go`, `hold` (a sub agent is open, no ceiling) or `drop`
// (the switch ended: a wake went in first, or the context is already clear).
ipcMain.handle('hive:switchClearGate', (_evt, id: unknown) => (typeof id === 'string' ? switchClear.clearGate(id) : 'drop'));
// A Codex conversation file too large (0.5.6): the hand off request the window
// queues in front of the clear, or null when none may go now.
ipcMain.handle('hive:codexSizeClearText', (_evt, id: unknown) => (typeof id === 'string' ? askedHandoffFor(id) ?? codexSizeHandoffFor(id) : null));


// ─── IPC: Settings hero payload (remote data, cached) ───────────────────────
/** Plan copy and sponsor, fetched from the repo so they can change without a
 *  release. Validated in shared/heroPayload before it reaches the renderer. */
ipcMain.handle('hero:payload', async (_evt, force: unknown) =>
  loadHero(join(app.getPath('userData'), 'hero.json'), { force: force === true }));

// ─── IPC: model catalog (remote data, cached) ───────────────────────────────
/** The agent model presets, fetched from docs/model-catalog.json on main so a
 *  new model reaches installed copies without a release. Validated in
 *  shared/modelCatalogPayload; a null catalog means "keep the baked one". */
const MODEL_CATALOG_CACHE = () => join(app.getPath('userData'), 'model-catalog.json');
ipcMain.handle('models:catalog', async (_evt, force: unknown) =>
  loadModelCatalog(MODEL_CATALOG_CACHE(), { force: force === true }));


/** Reveal a skill on disk. `openExternal` is deliberately https-only, so a
 *  file:// URL cannot (and should not) be smuggled through it. */
ipcMain.handle('skills:reveal', (_evt, path: unknown) => {
  if (typeof path !== 'string' || !path.trim()) return { ok: false, error: 'bad request' };
  const skillRoots = [join(homedir(), '.claude', 'skills'), join(homedir(), '.config', 'opencode')];
  const target = resolve(path);
  const inRoot = skillRoots.some((r) => target.startsWith(resolve(r) + sep))
    || (readConfig().registeredRepos ?? []).some((c) => target.startsWith(resolve(c) + sep));
  if (!inRoot) return { ok: false, error: 'outside a managed skills directory' };
  shell.showItemInFolder(target);
  return { ok: true };
});

// Open a multi-file picker and ingest the chosen artifacts in one round-trip.
ipcMain.handle('kg:addFiles', async (evt) => {
  const win = BrowserWindow.fromWebContents(evt.sender);
  if (!win) return { ok: false as const, error: 'no window' };
  const res = await dialog.showOpenDialog(win, {
    properties: ['openFile', 'multiSelections'],
    title: 'Add documents to the Knowledge Graph'
  });
  if (res.canceled || res.filePaths.length === 0) return { ok: false as const, error: 'cancelled' };
  const results = res.filePaths.map((srcPath) => {
    try {
      const r = knowledge.ingestFile(srcPath);
      return { ok: true as const, srcPath, docId: r.docId, chunkCount: r.chunkCount };
    } catch (e) {
      return { ok: false as const, srcPath, error: e instanceof Error ? e.message : String(e) };
    }
  });
  return { ok: true as const, results };
});

// ─── IPC: composer attachments (images + arbitrary files, attached by PATH) ──
// The message queue pipes raw text into a Claude CLI PTY, so attachments travel
// as a file PATH the agent reads with its Read tool (same convention as Slack).
// Picker offers an Images group + All Files.
// Any file, a PDF or a video included, and folders (0.5.3, I8). The Mac takes
// both kinds in one picker; Windows and Linux cannot, so their composers ask
// for one kind per button (shared/attachDialog).
ipcMain.handle('dialog:attachFiles', async (evt, want: unknown) => {
  const win = BrowserWindow.fromWebContents(evt.sender);
  if (!win) return { ok: false as const, error: 'no window' };
  const res = await dialog.showOpenDialog(win, attachDialogOptions(process.platform, asAttachWant(want)));
  if (res.canceled || res.filePaths.length === 0) return { ok: false as const, error: 'cancelled' };
  const isFolder = (p: string): boolean => { try { return statSync(p).isDirectory(); } catch { return false; } };
  return { ok: true as const, files: res.filePaths.map((p) => ({ path: p, name: attachName(p, isFolder(p)) })) };
});

// Persist the current native clipboard image to a temp PNG so a pasted
// screenshot can be attached by PATH. Returns an error result when the
// clipboard holds no image (e.g. a normal text paste).
ipcMain.handle('clipboard:saveImage', async () => {
  try {
    const img = clipboard.readImage();
    if (img.isEmpty()) return { ok: false as const, error: 'no image in clipboard' };
    const dir = join(app.getPath('temp'), 'cth-pastes');
    mkdirSync(dir, { recursive: true });
    const name = `paste-${Date.now()}.png`;
    const dest = join(dir, name);
    writeFileSync(dest, img.toPNG());
    return { ok: true as const, file: { path: dest, name } };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
  }
});

// Persist a dropped File that carried no resolvable path. macOS file-promise
// sources (the Cmd Shift 5 screenshot thumbnail among them) can hand Chromium
// the file's bytes without a stable path webUtils.getPathForFile can name, and
// the message body needs a PATH the agent Reads. The renderer sends the bytes;
// the copy written here is app-owned, so it also cannot vanish the way the
// screencaptureui staging file under TemporaryItems does. (founder, 5 Sep 2026)
const DROP_SAVE_MAX_BYTES = 64 * 1024 * 1024;
ipcMain.handle('drop:saveFile', async (_evt, name: unknown, bytes: unknown) => {
  try {
    if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0) {
      return { ok: false as const, error: 'no bytes' };
    }
    if (bytes.byteLength > DROP_SAVE_MAX_BYTES) {
      return { ok: false as const, error: 'file too large to persist' };
    }
    // The name names a file on the user's disk: strip separators and control
    // characters, keep the tail so the extension survives, never trust it raw.
    const raw = typeof name === 'string' && name ? name : 'drop';
    const safe = raw.replace(/[/\\]/g, '').replace(/[\u0000-\u001f]/g, '').slice(-80) || 'drop';
    const dir = join(app.getPath('temp'), 'cth-drops');
    mkdirSync(dir, { recursive: true });
    const dest = join(dir, `${Date.now()}-${safe}`);
    writeFileSync(dest, bytes);
    return { ok: true as const, file: { path: dest, name: safe } };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
  }
});


// ─── IPC: quit confirmation ─────────────────────────────────────────────────
/** Tear the harness down and quit. The "kill all & quit" path: every PTY dies
 *  at once (whatever an agent held in working memory and had not written to
 *  disk goes with it), everything already on disk stays, then the app exits. */
function teardownAndQuit(): void {
  allowQuit = true;
  for (const ptyId of ptyToAgent.keys()) keepDemandScreen(ptyId);
  // Each teardown step is best-effort: a throw here (e.g. a dying child or a
  // half-torn-down socket) must never abort the quit or pop a crash dialog.
  try { stopAutomationArming(); } catch (e) { console.error('[quit] stopAutomationArming:', e); }
  try { clearMissionTimers(); } catch (e) { console.error('[quit] clearMissionTimers:', e); }
  try { clearContextTimers(); } catch (e) { console.error('[quit] clearContextTimers:', e); }
  try { stopWebhookDoneObserver(); } catch (e) { console.error('[quit] stopWebhookDoneObserver:', e); }
  try { stopEphemeralWorkerWatcher(); } catch (e) { console.error('[quit] stopWorkerWatcher:', e); }
  try { integrationBroker.stop(); } catch (e) { console.error('[quit] broker.stop:', e); }
  try { hive.stopRouter(); } catch (e) { console.error('[quit] stopRouter:', e); }
  try { stopTaskHygiene(); } catch (e) { console.error('[quit] stopTaskHygiene:', e); }
  try { hookServer.stop(); } catch (e) { console.error('[quit] hookServer.stop:', e); }
  try { hookServer.stopHttp(); } catch (e) { console.error('[quit] hookServer.stopHttp:', e); }
  try { telemetry.stop(); } catch (e) { console.error('[quit] telemetry.stop:', e); }
  try { stopSlackIngestion(); } catch (e) { console.error('[quit] slack.stop:', e); }
  try { stopWebhookServer(); } catch (e) { console.error('[quit] webhook.stop:', e); }
  try { memory.stop(); } catch (e) { console.error('[quit] memory.stop:', e); }
  try { reflector.stop(); } catch (e) { console.error('[quit] reflector.stop:', e); }
  try { handoffJob.stop(); } catch (e) { console.error('[quit] handoffJob.stop:', e); }
  try { stopCodexSessionPrune(); } catch (e) { console.error('[quit] stopCodexSessionPrune:', e); }
  try { persist.close(); } catch (e) { console.error('[quit] persist.close:', e); }
  try { hive.stopAllProxyBridges(); } catch (e) { console.error('[quit] stopAllProxyBridges:', e); }
  try { ptyManager.killAll(); } catch (e) { console.error('[quit] killAll:', e); }
  app.quit();
}
/** The first read of this window's visibility (the floor asks on mount, after
 *  it subscribes to 'window:visibility'). Answered from main's per-window state,
 *  so a renderer reload starts right. */
ipcMain.handle('window:getVisibility', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (!win || win.isDestroyed()) return { hidden: false };
  const state = windowVisibility.get(win) ?? initialWindowVisibility(win.isVisible(), win.isMinimized());
  return { hidden: windowHidden(state) };
});
ipcMain.handle('app:confirmClose', () => {
  teardownAndQuit();
});
ipcMain.handle('app:cancelClose', () => {
  // Nothing to do in main: the modal closes on the renderer side.
});

// New Floor from the renderer (0.5.3, B21): the picker opens in the asking
// window; the app-menu item does the same for the focused one.
ipcMain.handle('window:newFloor', (evt) => {
  if (!readConfig().multiWindow) return { ok: false };
  return { ok: openFloorPicker(BrowserWindow.fromWebContents(evt.sender)) };
});

// ─── IPC: full reset (wipe data + config, relaunch into onboarding) ──────────
ipcMain.handle('app:resetAll', async () => {
  allowQuit = true;
  // Tear everything down first so nothing writes back into the dirs we wipe.
  try { stopAutomationArming(); } catch (e) { console.error('[reset] stopAutomationArming:', e); }
  try { clearMissionTimers(); } catch (e) { console.error('[reset] clearMissionTimers:', e); }
  try { clearContextTimers(); } catch (e) { console.error('[reset] clearContextTimers:', e); }
  try { stopWebhookDoneObserver(); } catch (e) { console.error('[reset] stopWebhookDoneObserver:', e); }
  try { stopEphemeralWorkerWatcher(); } catch (e) { console.error('[reset] stopWorkerWatcher:', e); }
  try { integrationBroker.stop(); } catch (e) { console.error('[reset] broker.stop:', e); }
  try { hive.stopRouter(); } catch (e) { console.error('[reset] stopRouter:', e); }
  try { stopTaskHygiene(); } catch (e) { console.error('[reset] stopTaskHygiene:', e); }
  try { hookServer.stop(); } catch (e) { console.error('[reset] hookServer.stop:', e); }
  try { telemetry.stop(); } catch (e) { console.error('[reset] telemetry.stop:', e); }
  try { stopSlackIngestion(); } catch (e) { console.error('[reset] slack.stop:', e); }
  try { memory.stop(); } catch (e) { console.error('[reset] memory.stop:', e); }
  try { reflector.stop(); } catch (e) { console.error('[reset] reflector.stop:', e); }
  try { handoffJob.stop(); } catch (e) { console.error('[reset] handoffJob.stop:', e); }
  try { stopCodexSessionPrune(); } catch (e) { console.error('[reset] stopCodexSessionPrune:', e); }
  try { persist.close(); } catch (e) { console.error('[reset] persist.close:', e); }
  try { ptyManager.killAll(); } catch (e) { console.error('[reset] killAll:', e); }
  try { hive.removeExposedCodexData(); } catch (e) { console.error('[reset] removeExposedCodexData:', e); }
  // The hive is about to be erased: nothing marked is worth committing, and a
  // git job still running would race the rm below (0.5.5 commit queue).
  try { await hive.dropCommits(); } catch (e) { console.error('[reset] dropCommits:', e); }
  // Erase the hive (Michael's + every agent's memory, inboxes, tasks, board,
  // git history) and the semantic-memory palace. Only these harness-created
  // subdirs are removed — never the user's whole harnessHome folder.
  // Removed AND confirmed gone (removeTree.ts): a half removed hive keeps a
  // partial .git that the next launch takes for a working repo.
  for (const dir of [hive.root(), memory.palacePath()]) {
    if (!dir) continue;
    const removed = await removeTreeFully(dir);
    if (!removed.gone) console.error('[reset] rm', dir, removed.error);
    else if (removed.movedAside) console.warn(`[reset] ${dir} would not delete; moved aside to ${removed.movedAside}`);
  }
  // The roster is the renderer's half of the same state, so it retires with the
  // hive — archived into roster-backups/ rather than deleted, and cleared as the
  // active file so re-selecting this folder later doesn't resurrect agents whose
  // sessions and memory are gone.
  try { roster.archive(); }
  catch (e) { console.error('[reset] roster.archive:', e); }
  // Back to first-run defaults, then relaunch clean so all in-memory services
  // re-bootstrap from scratch and the renderer lands on onboarding.
  resetConfig();
  app.relaunch();
  app.exit(0);
});

// The History tab's pages, read only, from each CLI's own
// transcript (historyService.ts). The renderer names an agent, never a path.
const historyService = new HistoryService({
  redact: redactSecrets,
  // Own keys only: 'constructor' or '__proto__' pass the id check.
  agent: (id) => {
    const agents = hive.enabled() ? hive.registry().agents : undefined;
    const a = agents && Object.hasOwn(agents, id) ? agents[id] : undefined;
    return a ? { provider: a.provider, cwd: a.cwd, sessionId: a.sessionId } : null;
  },
  transcriptPath: (id) => hookServer.transcriptPath(id),
  codexHomeFor: (id) => {
    const root = hive.root();
    const agents = hive.registry().agents;
    if (!root || !Object.hasOwn(agents, id) || agents[id]?.provider !== 'codex') return null;
    return join(root, 'agents', id, '.codex');
  },
  geminiHome: () => join(homedir(), '.gemini')
});

/** The one door every mission list is saved through: the Automations screen
 *  and an agent's mission request (connectionRequests.ts) alike. */
function storeMissions(incoming: ScheduledMission[]): void {
  // lastFiredAt is scheduler-owned; mergeSavedMissions keeps the newer stamp so a
  // stale array from the renderer can never erase it.
  writeConfig({ missions: mergeSavedMissions(incoming, readConfig().missions ?? []) });
  // The write above already re-armed through the arming watch, and this check
  // finds nothing left to do, so a save arms once. Without the watch (hive
  // off) nothing is listening, so arm directly.
  if (automationArming) automationArming.check(); else syncMissions();
}


// ─── IPC: GitHub issue ingestion (gh CLI) ────────────────────────────────────
ipcMain.handle('github:issues', (_evt, cwd: unknown) =>
  typeof cwd === 'string' ? listIssues(cwd) : { ok: false, error: 'no cwd' }
);

// ─── IPC: GitHub CI status watcher (gh CLI) ──────────────────────────────────
ipcMain.handle('github:ciRuns', (_evt, cwd: unknown) =>
  typeof cwd === 'string' ? listCIRuns(cwd) : { ok: false, error: 'no cwd' }
);

// ─── IPC: desktop notifications toggle ──────────────────────────────────────
ipcMain.handle('app:setNotifications', (_evt, val) => writeConfig({ notifications: val === true }));

// ─── IPC: onboarding reliability — open Settings deep-link + login-item toggle ─
/** Open a System Settings deep-link (or https URL) in the OS default handler.
 *  Restricted to Settings panes / https so the renderer can't shell arbitrary
 *  schemes. macOS uses `x-apple.systempreferences:`, Windows uses `ms-settings:`
 *  (Linux has no universal settings URI, so the renderer never sends one there).
 *  Used by the onboarding "Permissions & reliability" step. */
ipcMain.handle('app:openExternal', async (_evt, url: unknown) => {
  if (typeof url !== 'string' || !/^(x-apple\.systempreferences:|ms-settings:|https:\/\/)/.test(url)) {
    return { ok: false, error: 'blocked url' };
  }
  await shell.openExternal(url);
  return { ok: true };
});
/** Toggle macOS "Open at Login" — fully programmatic, no permission prompt.
 *  Returns the resulting state so the renderer toggle reflects reality. */
ipcMain.handle('app:setLoginItem', (_evt, enabled: unknown) => {
  app.setLoginItemSettings({ openAtLogin: enabled === true });
  return app.getLoginItemSettings().openAtLogin;
});

// ─── IPC: Slack integration ─────────────────────────────────────────────────
ipcMain.handle('slack:start', () => startSlackIngestion());
/** Stop must survive a restart. Boot re-arms from `slackEnabled`, so stopping
 *  without clearing it silently brought the way back on the next launch: the
 *  user pressed Stop and Slack was live again. Public main fixed that on the
 *  webhook-only stop; 0.4.11 runs three ways behind `stopSlackIngestion`, so
 *  the clear belongs here.
 *
 *  Persist BEFORE tearing down. If the write throws (read-only volume, ENOSPC)
 *  the way is still up and the UI stays truthful; the other order leaves a dead
 *  transport that still reads as Connected with the flag set, which is this same
 *  bug again with no error to show for it.
 *
 *  Only this handler clears the flag. changeHome / quit / reset call
 *  `stopSlackIngestion()` directly and must not: they are lifecycle, not a user
 *  turning the integration off. (Start persists the flag from the renderer, in
 *  `SettingsModal.startSlack`, not here.) */
ipcMain.handle('slack:stop', () => {
  writeConfig({ slackEnabled: false });
  stopSlackIngestion();
  return { ok: true };
});
/** The live way's state (0.4.11): which way, running, team and bot, the poll or
 *  socket times, the webhook's Request URL, the last error, live temps. */
ipcMain.handle('slack:status', (): SlackStatus => slackStatusNow());
/** Test the connection. Starts nothing and SAVES NOTHING: the renderer sends
 *  the fields as typed, so this answers about the token on screen. Never gated
 *  on readiness, because naming what is missing is its whole job. */
ipcMain.handle('slack:test', (_evt, draft: unknown) => {
  const d = (draft ?? {}) as Record<string, unknown>;
  const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);
  return slackTestNow({
    mode: (SLACK_MODES as readonly string[]).includes(String(d.mode)) ? (d.mode as SlackMode) : undefined,
    botToken: str(d.botToken),
    appToken: str(d.appToken),
    signingSecret: str(d.signingSecret)
  });
});
// The Slack ledger (slackHistory.ts): every inbound thread message and every
// post we made, newest first.
ipcMain.handle('slack:history', () => listSlackHistory());
function notifySlackHistoryUpdated(): void {
  try { liveWebContents()?.send('slack:historyUpdated'); } catch { /* window gone */ }
}
setSlackPostSink((r) => {
  appendSlackHistory({ direction: 'outbound', channel: r.channel, thread_ts: r.thread_ts, text: r.text, ok: r.ok, error: r.error });
  notifySlackHistoryUpdated();
  // 0.5.6: the Integrations Activity tab. Where and how it went; never the text.
  slackLog(r.ok ? 'reply-out' : 'reply-failed', { channel: r.channel, ...(r.ok ? {} : { error: r.error ?? 'unknown' }) });
});
/** Absolute path to the bundled reply helper, for the prompt the office worker
 *  runs to post its summary back in-thread. No secret crosses this boundary. */
ipcMain.handle('slack:replyScriptPath', () => slackReplyScriptPath());
/** Renderer's immediate "queued" ack into the triggering Slack thread. The bot
 *  token stays in main — only channel/thread/text cross IPC. */
ipcMain.handle('slack:reply', (_evt, arg: unknown) => {
  const p = (arg ?? {}) as { channel?: unknown; thread_ts?: unknown; text?: unknown };
  const cfg = readConfig();
  // With the line off nothing posts. The other ways out (the reply
  // endpoint and the done poller) only run while the line does.
  if (!cfg.slackEnabled) return { ok: false, error: SLACK_LINE_OFF_REASON };
  // CLAUSE-3 (human: "stop posting into Slack by default"): this is the ONLY
  // app/voice-INITIATED proactive Slack post (the renderer's "queued" ack). It is
  // OFF unless the user opts in via Settings → Slack. The Slack-ORIGIN done-reply
  // round-trip (done-poller) and an agent's own direct /reply are NOT routed
  // through here, so they are unaffected and always stay on.
  // Name the switch as the SCREEN names it, not as the code names it. This
  // string is what a person sees when a reply does not appear, and "app-initiated
  // proactive posting" is not a phrase on any surface they can go and look at
  // (founder, 7 Sep 2026: "it is not even clear what it does").
  if (!cfg.slackProactivePosting) {
    return { ok: false, error: SLACK_PROACTIVE_OFF_REASON };
  }
  const botToken = cfg.slackBotToken;
  if (!botToken) return { ok: false, error: 'no bot token' };
  if (typeof p.channel !== 'string' || typeof p.thread_ts !== 'string' || typeof p.text !== 'string') {
    return { ok: false, error: 'channel, thread_ts, text required' };
  }
  // CLAUSE-1 (fix-slack-integration): an app-initiated send must target an
  // EXPLICIT thread — reject a blank/whitespace channel or thread rather than
  // letting it fall through to an implicit destination (the channel root).
  if (!p.channel.trim() || !p.thread_ts.trim()) {
    return { ok: false, error: 'explicit channel + thread_ts required' };
  }
  return postSlackReply({ botToken, channel: p.channel, thread_ts: p.thread_ts, text: p.text });
});
ipcMain.handle('slack:setConfig', (_evt, patch: unknown) => writeSlackConfig(patch));
/** Write the Slack fields a patch carries, and stop what the change breaks.
 *  Settings' Save and an agent's slack.set request both come through here. */
function writeSlackConfig(patch: unknown): { ok: true } {
  const p = (patch ?? {}) as {
    signingSecret?: unknown; botToken?: unknown; appToken?: unknown; channelId?: unknown; port?: unknown; enabled?: unknown;
    proactivePosting?: unknown; mode?: unknown; pollSeconds?: unknown; catchupSeconds?: unknown; tempCwd?: unknown; triage?: unknown;
  };
  const before = slackReadiness(readConfig());
  const next: Partial<HarnessConfig> = {};
  // Trim string fields; an emptied field clears back to undefined.
  if (typeof p.signingSecret === 'string') next.slackSigningSecret = p.signingSecret.trim() || undefined;
  if (typeof p.botToken === 'string') next.slackBotToken = p.botToken.trim() || undefined;
  if (typeof p.appToken === 'string') next.slackAppToken = p.appToken.trim() || undefined;
  if (typeof p.channelId === 'string') next.slackChannelId = p.channelId.trim() || undefined;
  if (typeof p.port === 'number' && Number.isFinite(p.port)) next.slackPort = p.port;
  if (typeof p.enabled === 'boolean') next.slackEnabled = p.enabled;
  if (typeof p.proactivePosting === 'boolean') next.slackProactivePosting = p.proactivePosting;
  // 0.4.11: the way, the two frequency pickers and the temps folder. A value
  // outside its range reads as the default (shared/slackMode), never as garbage.
  if (typeof p.mode === 'string' && (SLACK_MODES as readonly string[]).includes(p.mode)) next.slackMode = p.mode as SlackMode;
  if (typeof p.pollSeconds === 'number') next.slackPollSeconds = resolvePollSeconds(p.pollSeconds);
  if (typeof p.catchupSeconds === 'number') next.slackSocketCatchupSeconds = resolveCatchupSeconds(p.catchupSeconds);
  if (typeof p.tempCwd === 'string') next.slackTempCwd = p.tempCwd.trim() || undefined;
  // `triage` (0.4.11) is accepted and ignored: who answers moved to
  // config.responder (0.5.2), the one setting for every inbound channel,
  // written through config:update. An older renderer sending it breaks nothing.
  void p.triage;
  writeConfig(next);
  // Reconcile what runs: disabling, clearing the chosen way's token, or choosing
  // another way (one at a time) stops the running transport. Nothing restarts
  // here; the person presses Turn on (or Start, for the webhook's fresh URL).
  const after = slackReadiness(readConfig());
  if (after.error || after.mode !== before.mode) stopSlackIngestion();
  return { ok: true };
}

// ─── Agents set up connections themselves (0.5.3 batch 3 #6) ────────────────
// An agent writes a request into $AGENT_DIR/connections/requests; this applies
// it through the same doors Settings uses (storeWebhooks, writeSlackConfig)
// and answers in $AGENT_DIR/connections/results. See connectionRequests.ts.
const connectionDeps: ConnDeps = {
  hiveRoot: () => hive.root(),
  listWebhooks: () => readConfig().webhookTriggers ?? [],
  saveWebhooks: (list) => storeWebhooks(list),
  mintSecret: () => randomBytes(32).toString('hex'),
  newWebhookId: () => `wh-${Date.now().toString(36)}-${randomBytes(3).toString('hex')}`,
  endpointUrl: (id) => webhookEndpointUrls().find((e) => e.id === id)?.url ?? '',
  applySlack: (patch) => {
    // Like Settings' Save: stop, write, then start when it is on and ready.
    stopSlackIngestion();
    writeSlackConfig(patch);
    const c = readConfig();
    if (c.slackEnabled && !slackReadiness(c).error) void startSlackIngestion();
  },
  setDefaults: (d) => {
    writeConfig({
      ...(typeof d.webhookResponder === 'string' ? { webhookResponder: d.webhookResponder || undefined } : {}),
      ...(typeof d.responder === 'string' ? { responder: d.responder || undefined } : {})
    });
  },
  snapshot: () => connectionSnapshot(),
  log: (e) => hive.appendLog(e),
  now: () => Date.now(),
  onChanged: () => { try { liveWebContents()?.send('webhooks:changed'); } catch { /* window gone */ } try { liveWebContents()?.send('missions:updated'); } catch { /* window gone */ } },
  listMissions: () => readConfig().missions ?? [],
  saveMissions: (list) => storeMissions(list),
  agentIds: () => [...new Set([...Object.keys(hive.registry().agents ?? {}), 'god'])]
};

/** state.json: what is set up, with no secret and no token in it. */
function connectionSnapshot(): Record<string, unknown> {
  const c = readConfig();
  const urls = webhookEndpointUrls();
  return {
    note: 'Written by the app. Read only; to change anything, see README.md.',
    webhookServer: { running: webhookServer != null, url: lastWebhookUrl ?? '' },
    webhookResponder: c.webhookResponder ?? '',
    webhooks: (c.webhookTriggers ?? []).map((w) => ({
      id: w.id, name: w.name, source: w.source ?? 'custom', ...(w.source ? {} : { auth: w.auth ?? 'header' }),
      to: w.to ?? '', enabled: w.enabled, mode: w.mode, description: w.description ?? '',
      hasPrompt: !!w.prompt, url: urls.find((e) => e.id === w.id)?.url ?? ''
    })),
    missions: (c.missions ?? []).map((m) => missionSummary(m)),
    slack: {
      enabled: c.slackEnabled === true, mode: c.slackMode ?? '', channelId: c.slackChannelId ?? '', responder: c.responder ?? '',
      botTokenSet: !!c.slackBotToken, appTokenSet: !!c.slackAppToken, signingSecretSet: !!c.slackSigningSecret
    }
  };
}

let connectionTimer: NodeJS.Timeout | null = null;
function startConnectionRequests(): void {
  if (connectionTimer) return;
  connectionTimer = setInterval(() => {
    try { processConnectionRequests(connectionDeps); } catch (e) { console.error('[connections]', e instanceof Error ? e.message : e); }
  }, 3000);
}

// ─── IPC: Triggers — context (auto-compact / auto-clear) ────────────────────
// The context trigger is an office setting, kept in this computer's config.
const nextContextTrigger = (arg: unknown, current: ContextTriggerConfig): ContextTriggerConfig => {
  // `arg` is a screen's, or an office's stored value: anything but an object is no change.
  const p = (arg && typeof arg === 'object' && !Array.isArray(arg) ? arg : {}) as Partial<ContextTriggerConfig>;
  const half = (v: unknown): Partial<ContextRule> | undefined => (v && typeof v === 'object' && !Array.isArray(v) ? v as Partial<ContextRule> : undefined);
  return { compact: sanitizeContextRule(half(p.compact), current.compact), clear: sanitizeContextRule(half(p.clear), current.clear), switchClear: sanitizeSwitchClear(p.switchClear, current.switchClear) };
};
ipcMain.handle('triggers:getContext', (): ContextTriggerConfig => readConfig().contextTrigger ?? DEFAULT_CONTEXT_TRIGGER);
ipcMain.handle('triggers:setContext', (_evt, arg: unknown) => {
  const stored = readConfig().contextTrigger ?? DEFAULT_CONTEXT_TRIGGER;
  if (contextMessageOverCap(arg, stored)) throw new Error(CONTEXT_MESSAGE_TOO_LONG);
  const next = nextContextTrigger(arg, stored);
  writeConfig({ contextTrigger: next });
  // The timers ARE the setting — a cadence saved but not re-armed would keep
  // firing on the old rhythm until the next boot.
  syncContextTriggers();
  return next;
});

/** Clamp one half of the context trigger. The renderer is not trusted with the
 *  arming maths: a zero/negative/NaN `everyMs` would arm a runaway timer, and an
 *  out-of-range percentage would silently disable (or permanently trip) the
 *  pressure gate. */
function sanitizeContextRule(patch: Partial<ContextRule> | undefined, current: ContextRule): ContextRule {
  const p = (patch ?? {}) as Partial<ContextRule>;
  const num = (v: unknown, fallback: number, min: number, max: number): number =>
    typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
  // Force compact (19 Oct 2026): kept only while on, so a rule saved off reads as before.
  const force = typeof p.force === 'boolean' ? p.force : current.force === true;
  return {
    enabled: typeof p.enabled === 'boolean' ? p.enabled : current.enabled,
    everyMs: num(p.everyMs, current.everyMs, 60_000, 86_400_000),
    minContextPct: num(p.minContextPct, current.minContextPct, 0, 100),
    minContextPctLargeWindow: num(p.minContextPctLargeWindow, current.minContextPctLargeWindow, 0, 100),
    // Never cut here: a save past the cap is refused where the value is
    // stored (`contextMessageOverCap`), and a longer message already stored
    // is shown and kept whole, so a save of another field writes back the
    // words that were there.
    message: typeof p.message === 'string' ? p.message : current.message,
    ...(force ? { force: true } : {})
  };
}
import { TokenUsage } from './tokenUsage';
import { LiveCountGuard } from './liveCount';
import { overLimits, periodStart } from '../shared/tokenLimits';
// 0.5.6: the last minute of token use, which the beat writes at most once a minute.
app.on('will-quit', () => { try { tokenUsage.flush(Date.now(), true); } catch { /* noop */ } });

ipcMain.handle('webhooks:list', async () => {
  automationArming?.check();
  return readConfig().webhookTriggers ?? [];
});
ipcMain.handle('webhooks:save', async (_evt, arg: unknown) => {
  return storeWebhooks(Array.isArray(arg) ? arg : []);
});
/** Sanitise, store and re-point the live server. Settings, Automations and an
 *  agent's connection request (connectionRequests.ts) all write through here. */
function storeWebhooks(incoming: unknown[]): WebhookTrigger[] {
  const existing = readConfig().webhookTriggers ?? [];
  const list: WebhookTrigger[] = [];
  const seen = new Set<string>();
  for (const raw of incoming) {
    const t = sanitizeWebhookTrigger(raw, existing);
    if (!t || seen.has(t.id)) continue; // an id is a URL path segment — one owner each
    seen.add(t.id);
    list.push(t);
  }
  writeConfig({ webhookTriggers: list });
  reconcileWebhookServer();
  return list;
}
ipcMain.handle('webhooks:delete', async (_evt, arg: unknown) => {
  const id = typeof arg === 'string' ? arg : '';
  const list = (readConfig().webhookTriggers ?? []).filter((t) => t.id !== id);
  writeConfig({ webhookTriggers: list });
  // Revoking one endpoint must not disturb the others: the live server is
  // re-pointed, not restarted, so every remaining caller's URL keeps working.
  reconcileWebhookServer();
  return list;
});
/** Mint a strong (256-bit) secret for the operator to paste into their caller.
 *  Not persisted here — it belongs to whichever endpoint the UI saves it onto. */
ipcMain.handle('webhooks:generateSecret', () => randomBytes(32).toString('hex'));
/** 0.5.3 (Integrations, Telegram): point a Telegram bot at one endpoint. The
 *  bot token is used for this one call and never stored; Telegram then signs
 *  every update with the endpoint's secret as its secret_token. Only a
 *  Telegram endpoint that exists, and only its own URL, can be registered. */
ipcMain.handle('telegram:setWebhook', async (_evt, arg: unknown) => {
  const a = (arg && typeof arg === 'object' ? arg : {}) as { id?: unknown; botToken?: unknown };
  const botToken = typeof a.botToken === 'string' ? a.botToken.trim() : '';
  if (!/^\d{5,16}:[A-Za-z0-9_-]{20,64}$/.test(botToken)) return { ok: false, error: 'bad-token' };
  const t = (readConfig().webhookTriggers ?? []).find((w) => w.id === a.id && w.source === 'telegram');
  if (!t || !t.secret) return { ok: false, error: 'no-endpoint' };
  const url = webhookEndpointUrls().find((e) => e.id === t.id)?.url ?? '';
  if (!url) return { ok: false, error: 'no-public-url' };
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url, secret_token: t.secret, allowed_updates: ['message', 'edited_message', 'channel_post'] }),
      signal: AbortSignal.timeout(10_000)
    });
    const body = await res.json().catch(() => ({})) as { ok?: boolean; description?: string };
    return body.ok ? { ok: true } : { ok: false, error: body.description ?? `http ${res.status}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
});
/** Server state + the tunnel root + one public URL per configured endpoint (the
 *  UI offers a copy button per webhook, so the root alone isn't enough). */
ipcMain.handle('webhooks:status', () => webhooksStatusHere());
const webhooksStatusHere = () => (automationArming?.check(), {
  running: webhookServer != null,
  starting: webhookStarting,
  ...(lastWebhookError ? { error: lastWebhookError } : {}),
  url: lastWebhookUrl,
  ...(webhookServer?.boundPort() ?? {}),
  endpoints: webhookEndpointUrls()
});
/** Retry after a failed start: a server that bound but never got a tunnel is
 *  stopped first, because a running server only re-points its endpoints. */
ipcMain.handle('webhooks:retry', async () => {
  if (webhookStarting) return { ok: false, error: 'already starting' };
  if (webhookServer && !webhookServer.publicUrl()) stopWebhookServer();
  return startWebhookServer();
});


// ─── IPC: Triggers — history ledger + the approval gate ─────────────────────
ipcMain.handle('triggerHistory:list', () => listTriggerHistory());
ipcMain.handle('triggerHistory:clear', (_evt, arg: unknown) => {
  const source = arg === 'webhook' || arg === 'org' ? arg : undefined;
  clearTriggerHistory(source);
  pruneHeldTokens();
  notifyTriggerHistoryUpdated();
  return { ok: true };
});
/**
 * The operator's verdict on a held message.
 *
 * 'approved' RELEASES it: it takes the identical path an auto-allowed message
 * would have taken (card + god request), then the entry flips. 'rejected' just
 * flips — nothing is ever dispatched.
 *
 * Idempotent by construction: only an entry still sitting at `pending` can be
 * decided, so a double-click (or two windows deciding at once) cannot dispatch
 * the same message twice.
 */
ipcMain.handle('triggerHistory:decide', (_evt, arg: unknown) => {
  const p = (arg ?? {}) as { id?: unknown; decision?: unknown };
  const id = typeof p.id === 'string' ? p.id : '';
  const decision = p.decision === 'approved' ? 'approved' : p.decision === 'rejected' ? 'rejected' : null;
  if (!id || !decision) return null;
  const entry: TriggerHistoryEntry | undefined = listTriggerHistory().find((e) => e.id === id);
  if (!entry) return null;
  if (entry.decision !== 'pending') return entry; // already decided → no-op, not a re-dispatch

  const heldOn = entry.source === 'webhook' ? entry.sourceId : undefined;
  if (decision === 'rejected') {
    const next = updateTriggerHistory(id, { decision: 'rejected' });
    notifyTriggerHistoryUpdated();
    logWebhookCall(heldOn, 'declined');
    return next;
  }

  const taskId = `webhook-${randomBytes(8).toString('hex')}`;
  const tokenHash = heldTokenHashFor(id);
  const title = entry.title ?? (entry.body.length > 80 ? `${entry.body.slice(0, 79)}…` : entry.body);
  // The endpoint's standing instruction and guardrails, as they stand NOW. An
  // approved message must reach the orchestrator with the same briefing an
  // auto-allowed one would have had, or "approved" quietly means something
  // weaker than "allowed". An endpoint deleted while the message was held has
  // no briefing left to give, and the message goes with the message alone.
  const held = (readConfig().webhookTriggers ?? []).find((h) => h.id === entry.sourceId);
  if (!dispatchWebhookWork({ taskId, title, message: entry.body, tokenHash, origin: entry.source, prompt: held?.prompt, guardrails: held?.guardrails, to: held?.to })) {
    // The card is what the caller polls and what god works from. Leave the entry
    // pending so the operator can approve again once the hive is writable.
    return entry;
  }
  logWebhookTaken(heldOn, taskId, 'approved');
  // The hash now lives on the card, so the caller's GET resolves through the
  // normal task lookup from here on.
  if (tokenHash) { heldTokens().delete(tokenHash); persistHeldTokens(); }
  const next = updateTriggerHistory(id, { decision: 'approved', taskId });
  pruneHeldTokens();
  notifyTriggerHistoryUpdated();
  return next;
});

// ─── IPC: Generic webhook (LEGACY single-endpoint channels) ─────────────────
// Kept alive for Settings → Webhook, which still speaks the one-secret shape.
// They are now THIN SHIMS over the multi-endpoint engine: the legacy secret and
// enabled flag map onto the `legacy` WebhookTrigger the config migration created,
// so the two surfaces can never disagree about whether the endpoint is live.
ipcMain.handle('webhook:start', () => startWebhookServer());
ipcMain.handle('webhook:stop', () => { stopWebhookServer(); return { ok: true }; });
/** Current state + last public endpoint URL, for the Settings badge/URL field. */
ipcMain.handle('webhook:status', () => ({ running: webhookServer != null, url: lastWebhookUrl, ...(webhookServer?.boundPort() ?? {}) }));
/** Mint a strong (256-bit) secret, persist it, and return it so Settings can show
 *  it for the user to copy into their client. The previous secret is replaced. */
ipcMain.handle('webhook:generateSecret', () => {
  const secret = randomBytes(32).toString('hex');
  writeConfig({ webhookSecret: secret });
  upsertLegacyWebhookTrigger({ secret });
  return { ok: true, secret };
});
ipcMain.handle('webhook:setConfig', (_evt, patch: unknown) => {
  const p = (patch ?? {}) as { secret?: unknown; port?: unknown; enabled?: unknown };
  const next: Partial<HarnessConfig> = {};
  if (typeof p.secret === 'string') next.webhookSecret = p.secret.trim() || undefined;
  if (typeof p.port === 'number' && Number.isFinite(p.port)) next.webhookPort = p.port;
  if (typeof p.enabled === 'boolean') next.webhookEnabled = p.enabled;
  writeConfig(next);
  upsertLegacyWebhookTrigger({
    secret: typeof p.secret === 'string' ? p.secret.trim() : undefined,
    enabled: typeof p.enabled === 'boolean' ? p.enabled : undefined
  });
  // Disabling (or clearing the secret) stops the public surface immediately; the
  // reconcile also picks up the case where OTHER endpoints are still enabled, in
  // which case the server stays up minus the legacy one.
  reconcileWebhookServer();
  return { ok: true };
});

/** Mirror a legacy `webhook:setConfig` / `webhook:generateSecret` edit onto the
 *  `legacy` WebhookTrigger. Creates the row only once a secret exists — an
 *  enabled endpoint without a secret would be an open door, so a bare "enable"
 *  against a never-configured webhook is deliberately a no-op. */
function upsertLegacyWebhookTrigger(patch: { secret?: string; enabled?: boolean }): void {
  const list = readConfig().webhookTriggers ?? [];
  const prior = list.find((t) => t.id === 'legacy');
  const secret = patch.secret !== undefined ? patch.secret : prior?.secret ?? '';
  if (!secret) return;
  const row: WebhookTrigger = {
    id: 'legacy',
    name: prior?.name ?? 'Default webhook',
    secret,
    enabled: patch.enabled !== undefined ? patch.enabled : prior?.enabled ?? false,
    mode: prior?.mode ?? DEFAULT_TRIGGER_MODE,
    schema: prior?.schema ?? DEFAULT_WEBHOOK_SCHEMA,
    createdAt: prior?.createdAt ?? Date.now()
  };
  writeConfig({
    webhookTriggers: prior ? list.map((t) => (t.id === 'legacy' ? row : t)) : [...list, row]
  });
}

// ─── IPC: Realtime Michael (voice orchestrator — ephemeral token mint, rt-1) ──
// MAIN owns the BYOK OpenAI key (encrypted broker, apikey:openai) and mints a
// short-lived EPHEMERAL client secret; the real key never crosses IPC. All wiring
// lives in ./realtime so this stays a single registration line.
registerRealtimeIpc();

// ─── IPC: Realtime Michael voice ACTIONS (rt-5, Phase 2) ─────────────────────
// Thin adapters over the SAME main fns the god PTY already uses. ALL of the safety
// spine — soft-vs-destructive tiering, the two-step verbal echo-back confirm, the
// distinct-token rule, the hard allowlist (kill-god / mass-ops forbidden), and the
// michael-voice attribution — lives in ./realtimeActions. This site only injects
// the existing functions; it adds NO new orchestration logic.
// ─── IPC: Realtime Michael completion watcher (rt-12, Phase 2) ───────────────
// Jim's net-new engine (realtimeCompletionWatcher.ts) detects a voice-dispatched
// task finishing (card→done OR a done-reply in michael-voice's inbox) and EMITS it;
// I own the seam — inject the hive read deps, push completions to the live session
// (so Michael speaks them unprompted), and bridge waitFor / queue-drain over IPC.
const completionWatcher = initCompletionWatcher({
  readTasks: () => { const t = hive.tasks() as { tasks?: TaskCard[] }; return Array.isArray(t?.tasks) ? t.tasks : []; },
  // Voice dispatches go out as from:michael-voice, so assignee done-replies land here.
  readInbox: () => {
    // Voice dispatches go out from:michael-voice, so done-replies normally land in its
    // inbox — but an assignee may address god out of habit. Merge both inboxes (de-dupe
    // by id) so a god-addressed completion isn't missed; the detector filters by sender.
    try {
      const mv = hive.inbox('michael-voice') as unknown as InboxMessage[];
      const godId = hive.registry().godId;
      const god = godId ? (hive.inbox(godId) as unknown as InboxMessage[]) : [];
      const seen = new Set<string>();
      return [...mv, ...god].filter((m) => !!m?.id && !seen.has(m.id) && seen.add(m.id) !== undefined);
    } catch {
      return [];
    }
  },
  onNotify: (evt) => {
    try {
      if (!Notification.isSupported()) return;
      const reg = hive.registry();
      const title = resolveGodName(reg.agents[reg.godId ?? 'god']?.name);
      new Notification({ title, body: evt.summary }).show();
    } catch { /* best-effort */ }
  }
});
registerRealtimeActionIpc({
  hiveEnabled: () => hive.enabled(),
  hiveSend: (partial, from) => hive.send(partial, from),
  hiveTasks: () => hive.tasks(),
  hiveAddTask: (task) => hive.addTask(task as HiveTask),
  hivePatchTask: (id, patch) => hive.patchTask(id, patch as Partial<Omit<HiveTask, 'id'>>),
  hiveDeleteTask: (id) => hive.deleteTask(id),
  hiveRegistry: () => hive.registry(),
  hiveLog: (event) => hive.appendLog(event),
  controlPause: (id, on) => control.pause(id, on),
  controlSteer: (id, text) => {
    if (hive.registry().agents[id]?.sleeping) return;
    control.steer(id, text); wakeDemand(id);
  },
  controlHalt: (id) => control.halt(id),
  controlSnapshot: (id) => control.snapshot(id),
  killAgent: (id) => {
    // The voice spine hands us a HIVE registry id, but the pty and worktree maps
    // are keyed by PTY id, and a renderer hire makes them differ (`pty-<id>`).
    // Killed under the bare hive id, the process, its worktree and the hive
    // archive all survived while the card below disappeared. Resolve first,
    // exactly like the breaker stop path does.
    const ptyId = ptyForAgent(id);
    if (!ptyId) return { ok: false, error: `no agent is live: ${id}` };
    const r = ptyManager.kill(ptyId);
    teardownPty(ptyId, 'person');
    // A voice (MAIN-initiated) kill: the renderer never removed the card itself
    // (unlike a UI kill), so tell the floor to archive it. Mirrors hive:agentSpawned.
    // The card is keyed by the HIVE id, so the payload keeps the caller's id.
    try { liveWebContents()?.send('hive:agentArchived', { id }); } catch { /* window torn down */ }
    return r;
  },
  spawnAgent: async (opts) => {
    const o = opts as AgentSpawnOptions;
    // A main initiated spawn (a voice hire, a temp) has nobody at the card, so
    // a missing CLI installs itself as before (I2 keeps the card for a person's
    // own terminal, where the button is).
    const res = await spawnAgentCore({ ...o, installNow: true }, null);
    // The renderer roster is only mutated by renderer-initiated hires (AddAgentModal),
    // so a MAIN-initiated spawn is invisible on the floor until we broadcast it. The
    // renderer (useHive) builds the Agent card from this descriptor; addAgent is
    // idempotent so a renderer-initiated hire is never double-carded.
    if (res.ok) {
      try {
        // spawnAgentCore wrote the resolved provider and the final argv (default
        // model included) back onto `o`, so the card says what actually started.
        liveWebContents()?.send('hive:agentSpawned', spawnedCard({
          id: o.id,
          name: o.hive?.name,
          provider: o.provider ?? o.hive?.provider,
          cwd: res.worktreePath ?? o.cwd,
          command: o.command,
          args: o.args,
          role: o.hive?.role,
          worktreePath: res.worktreePath
        }));
      } catch { /* window torn down */ }
    }
    return res;
  },
  listMissions: () => { automationArming?.check(); return readConfig().missions ?? []; },
  // The spec carries lastFiredAt through from listMissions(), so a wholesale write
  // preserves the scheduler's stamps; edit_schedule is deliberate + rare.
  // Armed by the config write itself (automationArming), like every other door.
  saveMissions: (missions) => { writeConfig({ missions }); },
  // rt-12: register each voice dispatch so the watcher can detect its completion.
  trackDispatch: (d) => { try { completionWatcher.track({ ...d, kind: 'dispatch' }); } catch { /* watcher unavailable */ } },
  // ── v0.3.4 full-control extensions ──
  controlResume: (id) => { control.resume(id); wakeDemand(id); },
  controlAutoDelivery: (id, paused) => control.pauseAutoDelivery(id, paused),
  controlGateTool: (id, toolName, on) => control.gateTool(id, toolName, on),
  setArchived: (id, archived) => {
    if (!hive.enabled()) return { ok: false, error: 'hive disabled' };
    hive.setArchived(id, archived);
    // Unarchive used to send the id alone, and the renderer builds a whole card
    // from this descriptor: the row came back named after its raw id with no
    // engine and no folder. The registry record survives archiving, so ask it.
    const rec = hive.registry().agents[id];
    try { liveWebContents()?.send(archived ? 'hive:agentArchived' : 'hive:agentSpawned', archived ? { id } : spawnedCard({ id, name: rec?.name, provider: rec?.provider, cwd: rec?.cwd, role: rec?.role })); } catch { /* window gone */ }
    return { ok: true };
  },
  // clear_context: hand the text to the renderer's queue so delivery rides every
  // existing gate (idle-only, boot grace, draft/picker safety).
  enqueueToAgent: (id, text) => {
    try { liveWebContents()?.send('realtime:enqueue', { agentId: id, text }); } catch { /* window gone */ }
  },
  getConfigValue: (key) => (readConfig() as unknown as Record<string, unknown>)[key],
  // False when the save was not written: a damaged or unreadable config.json skips it silently (R2).
  patchConfig: (patch) => {
    writeConfig(patch as Partial<HarnessConfig>);
    return configIntegrityIssues().length === 0;
  }
});

// rt-12 seam: push detected completions to the live floor; bridge live-flag, queue
// drain (closed-session warm-start), and wait_for over IPC. Then start polling.
completionWatcher.onCompletion((evt) => { try { liveWebContents()?.send('realtime:completion', evt); } catch { /* window gone */ } });
// v0.3.4: the floor delta watcher shares the session-live flag — while a voice
// session is open it pushes coalesced floor updates the renderer injects as
// silent conversation items (snapshot-at-connect + append-only deltas).
const floorWatcher = new RealtimeFloorWatcher({
  enabled: () => hive.enabled(),
  registry: () => hive.registry(),
  tasks: () => hive.tasks(),
  ptys: () => ptyManager.list().map((p) => ({ id: p.id, lastOutputAt: p.lastOutputAt })),
  push: (text) => { try { liveWebContents()?.send('realtime:floorDelta', { text }); } catch { /* window gone */ } }
});
floorWatcher.start();
ipcMain.handle('realtime:setSessionLive', (_e, live: unknown) => {
  completionWatcher.setSessionLive(live === true);
  floorWatcher.setSessionLive(live === true);
  return { ok: true };
});
// v0.3.4: app self-knowledge for the voice get_app_info tool — version + the
// newest CHANGELOG sections. Read-only; ships CHANGELOG.md with the app.
ipcMain.handle('app:info', () => {
  let changelog = '';
  for (const p of [join(app.getAppPath(), 'CHANGELOG.md'), join(process.cwd(), 'CHANGELOG.md')]) {
    try { changelog = readFileSync(p, 'utf8'); if (changelog) break; } catch { /* try next */ }
  }
  const top = changelog
    ? changelog.split(/\n## /).slice(1, 3).map((s) => `## ${s}`).join('\n').slice(0, 8000)
    : '';
  return { version: app.getVersion(), changelog: top };
});
ipcMain.handle('realtime:drainCompletions', () => completionWatcher.drainQueuedCompletions());
ipcMain.handle('realtime:waitFor', (_e, taskId: unknown, timeoutMs: unknown) =>
  typeof taskId === 'string'
    ? completionWatcher.waitFor(taskId, typeof timeoutMs === 'number' && timeoutMs > 0 ? timeoutMs : 120_000)
    : Promise.resolve({ timedOut: true as const, taskId: '' }));
completionWatcher.start();

// ─── god-triggered ephemeral Slack workers ──────────────────────────────────
// god drops a spawn-request JSON into HIVE_ROOT/spawn-requests/; MAIN polls that
// queue (same cadence + atomic-rename archival as the hive router — reliability
// over latency, no fs.watch/dedup needed), spins up a FRESH ISOLATED worker via
// the shared spawnAgentCore, dispatches the objective through the standard inbox
// path, then watches each worker for a terminal `act:"done"` (success → release)
// or excessive idleness (reap). All teardown flows through teardownPty, where a
// temp's worktree goes by default: what it left is committed to its branch first
// and the folder is kept only when that fails (0.5.6). Every terminal failure
// informs god WITH the Slack coords so
// god closes the Slack loop; the success path is the worker replying in-thread.
//
// 0.5.6: any lasting agent may start a temp too, from its own folder
// HIVE_ROOT/agents/<agent id>/spawn-requests/. Who asked is the folder a request
// was in, never a field in the file, and every report about that temp goes to
// whoever asked. A temp's folder is never read: a temp cannot start a temp.

/** A spawn-request god drops into HIVE_ROOT/spawn-requests/<id>.json. god authors
 *  these directly; `objective` and `cwd` are the only required fields. */
interface SpawnRequest {
  id?: string;
  /** What kind of request. 'slack' and 'inbound' requests (written by main for
   *  a person's message: Slack since 0.4.11, the other inbound channels since
   *  0.5.6) run even while `orchestratorMaySpawn` is off: the person chose a
   *  temp as the receiver, and that is the consent for the spend. Absent means
   *  Michael wrote it. Read only from the orchestrator's own queue: a request
   *  in an agent's folder is 'agent' whatever its file says. */
  origin?: 'slack' | 'god' | 'inbound' | 'agent';
  /** The lasting agent to clone (0.5.6): its folder, engine, name and look. An
   *  id that cannot be cloned reads as a plain temp. */
  cloneOf?: string;
  /** The inbound channel a message came through (0.5.6). */
  source?: InboundSource;
  /** What the orchestrator is sent when an inbound message waits
   *  INBOUND_TEMP_WAIT_MS with no free temp slot (0.5.6). */
  fallback?: { subject: string; body: string };
  /** The card the channel made for this message (a webhook's), handed to the
   *  orchestrator with the fallback (0.5.6). */
  taskId?: string;
  objective?: string;
  command?: string;                                   // engine CLI; default = config.defaultCommand
  provider?: AgentProvider;                           // optional explicit provider
  model?: string;                                     // optional --model override (Claude)
  cwd?: string;                                        // repo the worker (and its worktree) runs in
  name?: string;                                       // display name
  slack?: { channel: string; thread_ts: string };     // reply target + where failures surface
  slackAbout?: unknown;                                // 0.5.6: what the brief says about the message (slackAboutOf)
  isolate?: boolean;                                   // default true (fresh worktree)
  tokenCap?: number;                                   // optional per-worker token cap (advisory P1)
  // Appearance on the office floor. Both optional and both validated renderer-side
  // against the real cast and accent lists, so a bad value degrades to the default
  // rather than breaking the card.
  //
  // Naming a worker after a cast member ALREADY gets you their avatar: the floor
  // card infers it from the name. These two exist for the case that inference
  // cannot express, an agent called something else that should still look like a
  // particular character, and picking the accent instead of taking the one hashed
  // from the worker id.
  character?: string;
  accent?: string;
}

/** Polling cadence — matches the hive router. */
const WORKER_TICK_MS = 1500;
let workerWatchTimer: ReturnType<typeof setInterval> | null = null;
/** Re-entrancy guard so a slow tick (await spawn / git checks) never overlaps. */
let workerTickRunning = false;

/** HIVE_ROOT/spawn-requests — the queue dir god drops requests into. */
function spawnRequestsDir(): string | null {
  const root = hive.root();
  return root ? join(root, 'spawn-requests') : null;
}

/** One queue of spawn requests, and who its requests are from (0.5.6). */
interface TempQueue { dir: string; from: string }

/** The queues the watcher reads, in order: the orchestrator's, then the own
 *  folder of each agent that may start a temp (registered, not archived, not
 *  the orchestrator or its assistant, not a temp: the agents a temp may be
 *  cloned from). `withAgents` false lists the orchestrator's alone. */
function tempQueues(withAgents: boolean): TempQueue[] {
  const root = hive.root();
  const own = spawnRequestsDir();
  if (!root || !own) return [];
  const queues: TempQueue[] = [{ dir: own, from: ORCHESTRATOR_ASKER }];
  if (!withAgents) return queues;
  for (const id of cloneableIdsOf(Object.values(hive.registry().agents))) {
    queues.push({ dir: join(root, 'agents', id, 'spawn-requests'), from: id });
  }
  return queues;
}

/** Is a request id already filed, under `.done` or `.failed`, in any queue?
 *  Every registered agent's folder is looked at, an archived one's too: the
 *  temp it started still owns the id. */
function tempIdFiled(reqId: string): boolean {
  const root = hive.root();
  const own = spawnRequestsDir();
  if (!root || !own) return false;
  const file = `${reqId}.json`;
  const dirs = [own, ...Object.keys(hive.registry().agents).map((id) => join(root, 'agents', id, 'spawn-requests'))];
  return dirs.some((dir) => existsSync(join(dir, '.done', file)) || existsSync(join(dir, '.failed', file)));
}

/** How many temps an asker has running now. */
function tempsStartedBy(from: string): number {
  let n = 0;
  for (const rec of liveWorkers.values()) if (rec.from === from) n += 1;
  return n;
}

/** Move a processed request out of the queue so it's never reprocessed. Filed
 *  under the folder it was in: the orchestrator's queue or an agent's own.
 *  `as` is `<request id>.json` once the id is known, so tempIdFiled finds a used
 *  id by name even when the file was called something else. */
function archiveRequest(filePath: string, sub: '.done' | '.failed', as = basename(filePath)): void {
  try {
    const dir = join(dirname(filePath), sub);
    mkdirSync(dir, { recursive: true });
    renameSync(filePath, join(dir, as));
  } catch (e) {
    // Last resort: delete it so a poison file can't loop forever.
    try { unlinkSync(filePath); } catch { /* noop */ }
    console.error('[worker] archiveRequest failed:', e);
  }
}

/** Did this worker post a terminal `act:"done"` yet? Scans its own outbox AND
 *  outbox/.sent (the router archives delivered mail there ~every 1.5s), so the
 *  signal is caught whether or not it's been routed out yet. Returns the newest
 *  done's body and timestamp, or null. The timestamp is the cut off for settling
 *  its inbox (#472): mail that arrived after it is still pending.
 *
 *  Stale-done guard: agent dirs persist after teardown, so REUSING a reqId would
 *  leave a PRIOR worker's `done` sitting in this same dir. Without a guard that
 *  stale signal would release the new worker on its very first tick — before it
 *  does anything or replies — causing a silent Slack hang. So we only count a
 *  `done` authored AFTER this worker spawned: by its `created_at` (the message's
 *  own timestamp), falling back to the file's mtime when `created_at` is missing
 *  or unparseable. When neither yields a usable timestamp we DON'T count it
 *  (fail toward keeping the worker alive — the idle reaper is the backstop). */
function workerSignaledDone(workerId: string, spawnedAt: number): { body: string; at: number } | null {
  const root = hive.root();
  if (!root) return null;
  const base = join(root, 'agents', workerId, 'outbox');
  let found: { body: string; at: number } | null = null;
  for (const dir of [base, join(base, '.sent')]) {
    if (!existsSync(dir)) continue;
    let files: string[];
    try { files = readdirSync(dir); } catch { continue; }
    for (const f of files) {
      if (!f.endsWith('.json')) continue;
      const fp = join(dir, f);
      try {
        const msg = JSON.parse(readFileSync(fp, 'utf8')) as { act?: string; created_at?: string; body?: unknown; subject?: unknown };
        if (msg.act !== 'done') continue;
        let ts = Date.parse(msg.created_at ?? '');
        if (!Number.isFinite(ts)) {
          try { ts = statSync(fp).mtimeMs; } catch { ts = NaN; }
        }
        // The body is the temp's own summary: a Slack card's `result` (0.4.11),
        // which the done poller posts in thread when the temp did not reply itself.
        if (Number.isFinite(ts) && ts > spawnedAt && (found === null || ts > found.at)) {
          const body = typeof msg.body === 'string' && msg.body.trim() ? msg.body : typeof msg.subject === 'string' ? msg.subject : '';
          found = { body, at: ts };
        }
      } catch { /* skip unreadable/partial */ }
    }
  }
  return found;
}

/** What a spawn request says about its Slack message, each field checked:
 *  the file is written by main, and read back as untrusted JSON all the same. */
function slackAboutOf(v: unknown): SlackAbout {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const out: SlackAbout = {};
  if (o.place === 'channel' || o.place === 'group' || o.place === 'dm') out.place = o.place;
  if (typeof o.user === 'string' && /^[A-Z0-9]{2,20}$/.test(o.user)) out.user = o.user;
  for (const k of ['inThread', 'hasFiles', 'hasThread', 'hasEarlier', 'hasRefs'] as const) if (o[k] === true) out[k] = true;
  return out;
}

/** The live temp that owns a Slack thread, if any: a follow up in that thread is
 *  delivered to its inbox instead of hiring a second temp (0.4.11). */
function liveSlackThreadOwner(thread_ts: string): string | undefined {
  for (const [id, rec] of liveWorkers) {
    if (!rec.releasing && rec.slack?.thread_ts === thread_ts) return id;
  }
  return undefined;
}

/** `origin` of a spawn request file in the orchestrator's own queue, read without
 *  processing it: 'slack' or 'inbound' for one main wrote for a person's
 *  message, else undefined. Only consulted while Michael's own spawning is
 *  switched off, to let those through. Never asked of an agent's folder, where
 *  the field means nothing: who asked is the folder (0.5.6). */
function spawnRequestOrigin(filePath: string): 'slack' | 'inbound' | undefined {
  try {
    const raw = JSON.parse(readFileSync(filePath, 'utf8')) as SpawnRequest;
    return raw.origin === 'slack' || raw.origin === 'inbound' ? raw.origin : undefined;
  } catch { return undefined; }
}

/** The request id: the file's own `id`, else its name, folded to the characters
 *  an id may hold. The temp's id is `worker-` plus this. */
function spawnRequestId(raw: SpawnRequest, filePath: string): string {
  return (typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : basename(filePath).replace(/\.json$/i, ''))
    .replace(/[^A-Za-z0-9._-]/g, '-');
}

/** The lasting agent a request asks to clone, from the registry, or null. An id
 *  that cannot be cloned (the orchestrator, its assistant, a temp, an archived
 *  or unknown agent) is null, and the request then runs as a plain temp: the
 *  rule the receiver setting follows (shared/responder resolveReceiver). */
function cloneSourceOf(cloneOf: unknown): AgentMeta | null {
  const id = typeof cloneOf === 'string' ? cloneOf.trim() : '';
  if (!id) return null;
  const agents = Object.values(hive.registry().agents);
  return cloneableIdsOf(agents).includes(id) ? agents.find((a) => a.id === id) ?? null : null;
}

/** The channels an inbound request may name as its `source`. */
const INBOUND_SOURCES: readonly InboundSource[] = ['slack', 'webhook', 'mission'];

/** 0.5.6: an inbound message that found no free temp. A 'slack' or 'inbound'
 *  request still waiting INBOUND_TEMP_WAIT_MS after it was written, with the
 *  floor at its limit, goes to the orchestrator instead: its `fallback` is sent
 *  as a request (with the Slack thread when there is one) and the file is filed
 *  under .failed. A request with no `fallback` keeps waiting. Called only for
 *  the orchestrator's queue, and only while the floor is full. */
function sendWaitingInboundToOrchestrator(filePath: string): void {
  let raw: SpawnRequest;
  try {
    if (Date.now() - statSync(filePath).mtimeMs < INBOUND_TEMP_WAIT_MS) return;
    raw = JSON.parse(readFileSync(filePath, 'utf8')) as SpawnRequest;
    if (!raw || typeof raw !== 'object') return;
  } catch { return; } // unreadable: processSpawnRequest rejects it once a slot frees
  const reqId = spawnRequestId(raw, filePath);
  const reason = `no free temp slot in ${Math.round(INBOUND_TEMP_WAIT_MS / 60_000)} minutes; sent to the orchestrator`;
  // Not sent, so not filed: it waits and the next tick tries again.
  if (!sendInboundFallback(raw, reason)) return;
  // A Slack card that will never get a temp is closed as blocked with the reason.
  try { onTempFinished(`${TEMP_ID_PREFIX}${reqId}`, { ok: false, reason }, { hive }); } catch { /* card only */ }
  archiveRequest(filePath, '.failed', `${reqId}.json`);
  console.warn(`[worker] ${basename(filePath)}: ${reason}`);
}

/** Whether a request carries a message the orchestrator can be handed: the two
 *  checks sendInboundFallback makes before it sends. Where this is true, a
 *  false from that function means the send itself failed. */
function hasInboundFallback(raw: SpawnRequest): boolean {
  if (raw.origin !== 'slack' && raw.origin !== 'inbound') return false;
  const fb = raw.fallback;
  return !!fb && typeof fb.subject === 'string' && typeof fb.body === 'string' && !!(fb.subject.trim() || fb.body.trim());
}

/** Hand an inbound message to the orchestrator in place of the temp it was
 *  meant for: no slot freed in time, or the temp could not start. An inbound
 *  channel must never lose a message. False when the request is not an inbound
 *  one, carries no `fallback`, or the send failed. */
function sendInboundFallback(raw: SpawnRequest, reason: string): boolean {
  if (raw.origin !== 'slack' && raw.origin !== 'inbound') return false;
  const fb = raw.fallback;
  if (!fb || typeof fb.subject !== 'string' || typeof fb.body !== 'string' || !(fb.subject.trim() || fb.body.trim())) return false;
  const slack = raw.slack && typeof raw.slack.channel === 'string' && typeof raw.slack.thread_ts === 'string'
    ? { channel: raw.slack.channel, thread_ts: raw.slack.thread_ts } : undefined;
  // Slack's own fallback already carries the orchestrator's rules and the
  // reply command; the line is added only where the body does not have it.
  const slackLine = slack && !fb.body.includes(slackReplyScriptPath())
    ? `\n\n[SLACK] This came from Slack. Answer in channel ${slack.channel} thread ${slack.thread_ts} with:\n  "${hive.nodeCommand()}" "${slackReplyScriptPath()}" --channel ${slack.channel} --thread ${slack.thread_ts} --text "<your message>"`
    : '';
  // The sender is the channel when the file names a known one, never a free
  // string from the file: that would let a request speak as any agent.
  const sender = raw.source && INBOUND_SOURCES.includes(raw.source) ? raw.source : raw.origin === 'slack' ? 'slack' : 'temps';
  try {
    hive.send({
      to: 'god', act: 'request', subject: fb.subject,
      body: `${fb.body}${slackLine}\n\n[TEMP] This was meant for a temp: ${reason}.`
    }, sender);
  } catch (e) {
    console.error('[worker] inbound fallback send failed:', e);
    return false;
  }
  // A card made for the temp (a webhook's) is the orchestrator's now.
  if (typeof raw.taskId === 'string' && raw.taskId.trim()) {
    try { hive.patchTask(raw.taskId.trim(), { assignee: 'god' }); } catch { /* card only */ }
  }
  return true;
}

/** Spin up one ephemeral worker from a spawn-request. Terminal failures (bad
 *  request, missing CLI, spawn error) archive to .failed and inform god WITH the
 *  Slack coords so god can post a 'couldn't start' reply. On success the worker is
 *  registered (for done-scan / reaping / safe teardown) and dispatched its
 *  objective via the standard inbox path.
 *
 *  `from` is who asked (0.5.6), given by the watcher from the folder the file
 *  was in and never read from the file: every report about this request and
 *  the temp it starts goes there, and the temp sends its `done` there. */
async function processSpawnRequest(filePath: string, from: string): Promise<void> {
  await launchEnvReady();
  let raw: SpawnRequest;
  try {
    raw = JSON.parse(readFileSync(filePath, 'utf8')) as SpawnRequest;
    // `null` and a bare string parse too. Read as a request they would throw on
    // every tick, and with agents' folders in the queue one such file would
    // stop the watcher for the whole floor.
    if (!raw || typeof raw !== 'object') throw new Error('not a JSON object');
  } catch (e) {
    console.error('[worker] unparseable spawn-request:', filePath, e);
    informTempAsker(from, '[worker spawn rejected] unparseable request', `Could not parse spawn-request ${basename(filePath)} — ${String(e)}`);
    archiveRequest(filePath, '.failed');
    return;
  }
  const slack = raw.slack && typeof raw.slack.channel === 'string' && typeof raw.slack.thread_ts === 'string'
    ? { channel: raw.slack.channel, thread_ts: raw.slack.thread_ts } : undefined;
  const reqId = spawnRequestId(raw, filePath);
  const workerId = `${TEMP_ID_PREFIX}${reqId}`;
  const fail = (reason: string): void => {
    // One line in log.jsonl, so a temp that never started can be found later.
    try { hive.appendLog({ kind: 'temp-failed', id: workerId, from, reason }); } catch { /* log only */ }
    // 0.5.6: an inbound message whose temp cannot start goes to the orchestrator
    // with the reason, so it is never lost. Only main's own requests carry a
    // fallback, and those are read from the orchestrator's queue alone.
    const handed = from === ORCHESTRATOR_ASKER && sendInboundFallback(raw, `the temp could not start (${reason})`);
    // The message was there to hand on and the send failed. Not sent, so not
    // filed, as on the two minute road: it waits and the next tick tries again.
    if (!handed && from === ORCHESTRATOR_ASKER && hasInboundFallback(raw)) return;
    if (!handed) informTempAsker(from, `[worker spawn rejected] ${reason}`, `Spawn-request ${basename(filePath)} rejected: ${reason}.`, slack);
    // A Slack card that will never get a temp is closed as blocked with the
    // reason, so the Tasks screen and the done poller do not wait on it.
    try { onTempFinished(workerId, { ok: false, reason }, { hive }); } catch { /* card only */ }
    archiveRequest(filePath, '.failed', `${reqId}.json`);
  };

  const objective = typeof raw.objective === 'string' ? raw.objective.trim() : '';
  if (!objective) { fail('missing "objective"'); return; }

  // One id, one temp, across every queue (0.5.6): the id names the temp's
  // folder, its branch and its mailbox, so an id that is live or was filed
  // before is refused rather than started on top of what the first one left.
  // Not through fail(): the card under this id belongs to the temp that has it.
  if (liveWorkers.has(workerId) || tempIdFiled(reqId)) {
    informTempAsker(
      from,
      '[worker spawn rejected] id already used',
      `Spawn-request ${basename(filePath)} rejected: id already used. An id names one temp for good: ${workerId} is running, or a request under this id is filed in .done or .failed. Write the request again under a new id.`,
      slack
    );
    archiveRequest(filePath, '.failed', `${reqId}.json`);
    return;
  }

  // 0.5.6: a clone of a lasting agent. It opens that agent's folder as the
  // registry has it, so its worktree is cut from the agent's current branch
  // head and the agent's uncommitted changes are not carried.
  const clone = cloneSourceOf(raw.cloneOf);
  const cloneCard = clone ? savedCardOf(roster.read(), clone.id) : null;
  const cloneCwd = clone?.cwd && existsSync(clone.cwd) ? clone.cwd : '';
  // A clone of an agent whose folder is not a git repository gets no worktree,
  // and still never runs in that folder: it starts in a new empty folder of its
  // own beside the office's worktrees, and may read its source's folder
  // (founder's test, 15 Oct 2026: a clone of an agent in a plain folder refused
  // every message it was meant to answer).
  let cloneFolder = '';
  if (cloneCwd && !(await isRepo(cloneCwd).catch(() => false))) {
    const root = join(readConfig().harnessHome ?? hive.root() ?? cloneCwd, 'worktrees');
    const dir = join(root, workerId.replace(/[^A-Za-z0-9._-]/g, '-'));
    try {
      if (!resolve(dir).startsWith(resolve(root) + sep)) throw new Error('unsafe folder name');
      mkdirSync(dir, { recursive: true });
      cloneFolder = dir;
    } catch (e) {
      fail(`no folder of its own could be made (${e instanceof Error ? e.message : String(e)})`);
      return;
    }
  }

  // Worker request files are hand/LLM-authored, so `~/…` shows up here too — expand
  // before the existence check (Node reads `~` literally).
  let cwd = cloneFolder || cloneCwd || (typeof raw.cwd === 'string' && raw.cwd.trim() ? expandTilde(raw.cwd) : '');
  // A new install has no project folder. A temp may name a folder under <hive>/projects, made here (a git
  // repository of its own) when it is not, and one that names none on a computer with no project folder works in
  // <hive>/projects/<its id>.
  const hiveRootNow = hive.root();
  try {
    if (cwd && hiveRootNow && inHiveProjects(hiveRootNow, cwd)) makeHiveProjectFolder(hiveRootNow, cwd);
    else if (!cwd && hiveRootNow && !(readConfig().registeredRepos ?? []).length) cwd = defaultHiveProjectFolder(hiveRootNow, workerId);
  } catch (e) {
    fail(`its project folder could not be made (${e instanceof Error ? e.message : String(e)})`);
    return;
  }
  if (!cwd || !existsSync(cwd)) { fail(`"cwd" missing or not found (${cwd || 'unset'})`); return; }

  // Request line → executable + argv (auto-mode inheritance, tokenization,
  // model-flag dedupe). Pure and unit-tested — see workerLaunch.ts for why this
  // translation earned a test. A clone starts on its source's own line, provider
  // and model, read from its saved card (the registry has the provider alone),
  // unless the request names an engine itself.
  const cfgSpawn = readConfig();
  const engine = cloneEngine(raw, clone ? { ...cloneCard, provider: cloneCard?.provider ?? clone.provider } : null);
  const provider = engine.provider as AgentProvider | undefined;
  const launch = buildWorkerLaunch({
    requestCommand: engine.command,
    requestProvider: engine.provider,
    requestModel: engine.model,
    // Orchestrator hires multiply spend, so the user may give them their own
    // default (#585). Unset leaves spawnAgentCore's usual precedence alone
    // (defaultModel, then the role default), exactly as before.
    fallbackModel: cfgSpawn.subAgentDefaultModel,
    defaultCommand: cfgSpawn.defaultCommand,
    autoMode: !!cfgSpawn.autoMode
  });
  const bin = launch.bin;
  // Validate the executable name on the spawn path. A spawn-request file is
  // untrusted input (authored by the orchestrator, reachable by anything that can
  // write HIVE_ROOT/spawn-requests), so the bin must be a plain command token or
  // an absolute path — never a string a downstream shell `which`/`where` could
  // reinterpret. Rejected here, before any resolution; the resolver guards behind
  // it validate the same thing in depth.
  if (!isSafeCommandName(bin) && !isAbsolute(bin)) {
    fail(`refusing spawn: engine command "${bin}" is not a plain command name or an absolute path`);
    return;
  }
  // Missing-CLI → FAIL FAST. A headless worker has no human to watch an installer,
  // so we never run the cc49e1e install banner here — we reject and tell god.
  if (!ptyManager.isCommandAvailable(bin)) { fail(`engine CLI "${bin}" is not installed`); return; }

  // default true. A clone in its source's folder always gets a worktree of its
  // own: it must never write in the folder the agent is working in.
  const isolate = cloneFolder ? false : !!cloneCwd || raw.isolate !== false;
  // Base branch the worktree will be cut from (for the ahead-of-base safety check).
  let baseBranch = 'main';
  try { const br = await getBranch(cwd); if ('current' in br && br.current) baseBranch = br.current; } catch { /* keep default */ }

  const meta: AgentMeta = {
    id: workerId,
    // A clone is named after its source: `<agent name> (temp)`.
    name: clone ? `${clone.name} (temp)` : typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : `Temp ${reqId.slice(0, 12)}`,
    provider,
    // "temp" is the word on every screen and in every prompt (0.4.11). The id
    // prefix stays `worker-`: it is a contract with the ledger, the reaper and
    // the Slack owner lookup, and the prompts name it once as an id. A clone
    // stays a temp too: teardown, the reaper and the screens read this.
    role: 'temp',
    // A clone carries its source's capability tags. Unset for a plain temp, so
    // ensureAgent keeps what the id had (nothing).
    ...(clone?.capabilities ? { capabilities: clone.capabilities } : {}),
    cwd
  };
  // The broker grant (URL + a per-worker capability TOKEN, never a secret) is
  // made in spawnAgentCore for every hive agent since 0.5.5, this one included;
  // it is revoked in teardownPty (and below if the spawn fails). It covers every
  // enabled integration for every agent, and the bundled skills are copied into
  // every agent at start, so a clone holds the same of both as its source.
  const spawnOpts: AgentSpawnOptions = {
    id: workerId, cwd, command: bin, cols: 120, rows: 32,
    args: launch.args,
    hive: meta, isolate, provider,
    ...(clone ? { mcpAs: clone.id } : {}),
    // In its source's folder with no worktree of its own it is not started at
    // all: spawnAgentCore refuses before the engine runs, and that comes back
    // below as a failed spawn.
    ...(cloneCwd && !cloneFolder ? { ownWorktreeOnly: true } : {}),
    installNow: true // a god dispatched worker has nobody at the card (I2)
  };

  let res: { ok: boolean; error?: string; worktreePath?: string };
  try {
    res = await spawnAgentCore(spawnOpts, liveWebContents());
  } catch (e) {
    res = { ok: false, error: String(e) };
  }
  if (!res.ok) {
    brokerGrants.release(workerId);
    if (cloneFolder) { try { rmSync(cloneFolder, { recursive: true, force: true }); } catch { /* best effort */ } }
    fail(`spawn failed — ${res.error ?? 'unknown error'}`); return;
  }
  if (cloneFolder) plainCloneFolders.set(workerId, cloneFolder);

  // A god-hired worker is a MAIN-initiated spawn, so the renderer would never
  // card it on its own (same reason as the voice-spawn broadcast): without this
  // the worker is invisible on the floor, never enters the roster, and after a
  // restart nothing offers to restore it. The card rides the normal agent
  // lifecycle from here — teardownPty broadcasts the matching archive. A card
  // RESTORED after an app quit revives through the renderer's normal spawn path
  // and never re-enters liveWorkers: ephemerality is a property of the hiring,
  // not of the card, so a restored worker is a regular agent (no reaping).
  try {
    // spawnAgentCore wrote the resolved provider and the final argv (the
    // request's separate `model`, or the floor default) back onto spawnOpts.
    liveWebContents()?.send('hive:agentSpawned', spawnedCard({
      id: workerId,
      name: meta.name,
      provider: spawnOpts.provider ?? provider,
      cwd: res.worktreePath ?? cwd,
      command: launch.command,
      args: spawnOpts.args,
      role: meta.role,
      worktreePath: res.worktreePath,
      // A clone wears its source's character and accent, from its saved card.
      character: cloneCard?.character ?? (typeof raw.character === 'string' ? raw.character : undefined),
      accent: cloneCard?.accent ?? (typeof raw.accent === 'string' ? raw.accent : undefined)
    }));
  } catch { /* window torn down */ }

  // Register for done-scan / idle-reap / token-cap / safe teardown (pty id == workerId).
  // tokenCap is optional plumbing (default unlimited) — only a positive finite cap is kept.
  const tokenCap = typeof raw.tokenCap === 'number' && Number.isFinite(raw.tokenCap) && raw.tokenCap > 0
    ? raw.tokenCap : undefined;
  liveWorkers.set(workerId, { workerId, reqId, name: meta.name, slack, baseBranch, spawnedAt: Date.now(), tokenCap, request: raw, job: objective, provider: spawnOpts.provider ?? provider, model: modelFromArgs(spawnOpts.args ?? []), effort: effortFromArgs(spawnOpts.args ?? []), from, cloneOf: clone?.id });
  if (from === ORCHESTRATOR_ASKER && (raw.origin === 'inbound' || raw.origin === 'slack')) inboundTemps.add(workerId);

  // Dispatch the objective via the standard inbox path (zero new transport),
  // reusing the autonomous-request preamble so the worker gets the exact Slack
  // reply command + autonomy policy. The sender is whoever asked: `god` for the
  // orchestrator's queue, so the worker treats it as a god dispatch per its
  // protocol, else the agent that started it.
  try {
    const prefix = slack
      ? buildAutonomousRequestProtocol(slack.channel, slack.thread_ts, slackReplyScriptPath(), 'temp', slackAboutOf(raw.slackAbout))
      : '[TEMP JOB] You are a temp: one job, and no human is watching in the app. Work autonomously; no interactive questions. The job: ';
    // 0.4.11, founder: "temporary agents should be able to fetch context from any
    // agent's memories". The harness writes the memory index now, so the brief
    // points at a file that exists, and the block sits between the policy and the
    // objective. A failure to write the index must not cost the spawn.
    let context = '';
    try {
      const root = hive.root();
      if (root) {
        const indexPath = writeMemoryIndex(root, hive.memoryIndexRows());
        const kg = knowledge.active() && knowledge.env().KG_CLI
          ? `"${hive.nodeCommand()}" "${knowledge.env().KG_CLI}" search "<the request in a few words>"`
          : undefined;
        context = memoryContextBlock(root, indexPath, memory.active(), kg) + '\n\n';
      }
    } catch (e) {
      console.error('[worker] memory index skipped:', e instanceof Error ? e.message : e);
    }
    // 0.5.6: a clone is told whose copy it is before the floor's memory. Built
    // outside the try above, so a memory index that failed does not cost it.
    if (clone) {
      const sourceDir = join(hive.root() ?? '', 'agents', clone.id);
      context = cloneBrief({
        id: clone.id, name: clone.name, role: clone.role,
        agentDir: sourceDir, memoryPath: join(sourceDir, 'memory.md'),
        cwd: cloneCwd && res.worktreePath ? cloneCwd : undefined,
        ...(cloneFolder ? { readOnly: cloneCwd, ownFolder: cloneFolder } : {}),
        palace: memory.active()
      }) + '\n\n' + context;
    }
    // 0.5.6: a temp an agent started reports to that agent, and says so first.
    if (from !== ORCHESTRATOR_ASKER) {
      context = `[REPORT] ${from} started you. Send your "act":"done" message to "${from}", not to god. ${from} merges your branch.\n\n` + context;
    }
    // The catalog path is spelled absolute and joined natively: `$AGENT_DIR` is
    // POSIX only and was dead on a Windows floor.
    const skillFile = join(hive.root() ?? '', 'agents', workerId, '.claude', 'skills', 'capabilities', 'SKILL.md');
    // The done goes to whoever asked (0.5.6), and that one merges the branch.
    const suffix = `\n\n[CAPABILITIES] Read ${skillFile} once (or run /capabilities) before you start: it lists your date skills (/today, /last30Days, /lastQuarter and more) and the integrations you reach through the loopback broker (MD_BROKER_URL is set for you), with how to call each. Resolve any time window with the date skills, never by hand.\n\n[DONE] When finished, send ${from} ONE outbox message with "act":"done" and a short result summary; that releases you (terminal closed, your branch handed to ${from}). Do not push to any remote; ${from} is the only integrator.`;
    hive.send({ to: workerId, conversation: `worker-${reqId}`, act: 'request', subject: meta.name, body: `${prefix}${context}${objective}${suffix}` }, from);
  } catch (e) {
    console.error('[worker] dispatch send failed:', e);
  }

  console.log(`[worker] spawned ${workerId} (cwd=${cwd}, base=${baseBranch}, from=${from}${clone ? `, clone of ${clone.id}` : ''}${slack ? ', slack' : ''})`);
  archiveRequest(filePath, '.done', `${reqId}.json`);
}

/** Total tokens (input+output+cache) a worker has burned so far, from the usage
 *  provider — 0 when unknown. Mirrors the breaker's `tokensOf`. Used only by the
 *  (default-off) per-worker token cap. */
function workerTokensUsed(workerId: string): number {
  const s = usageProvider.getAgentUsage(workerId);
  return s ? s.input + s.output + s.cacheRead + s.cacheCreation : 0;
}

/** Throttle for the GC sweep — git checks are cheap but pointless every 1.5s tick. */
const GC_SWEEP_MS = 60_000;
let lastGcSweepAt = 0;
let gcSweepRunning = false;
/** Worktrees removeWorktree refused: logged once and not retried
 *  this run; the folder stays for a person, and the Worktrees screen lists it. */
const gcRefusedWorktrees = new Set<string>();

/** Reclaim preserved worker worktrees (+ their scratch dirs) whose work is now
 *  integrated, or whose worktree was already removed by hand. Fail-safe: a worktree
 *  is removed ONLY when `worktreeIsGcSafe` proves it clean AND integrated; any doubt
 *  KEEPS it (never discards un-integrated work — god is the sole integrator). Runs
 *  inside the worker tick, throttled to GC_SWEEP_MS, and is a no-op when nothing is
 *  preserved (the common case → zero cost). */
async function gcPreservedWorktrees(): Promise<void> {
  if (gcSweepRunning || preservedWorktrees.size === 0) return;
  gcSweepRunning = true;
  try {
    for (const [key, e] of [...preservedWorktrees]) {
      // A worker id that is live again (reqId reuse) → never GC its worktree or
      // scratch out from under the new run; leave the stale entry for a later sweep.
      if (liveWorkers.has(e.workerId)) continue;
      // (a) Worktree already gone (removed at clean teardown, or god removed it by
      //     hand per the preserve note) → just reclaim the scratch dir + drop tracking.
      if (!existsSync(e.wtPath)) {
        removeWorkerScratch(e.workerId);
        preservedWorktrees.delete(key);
        console.log(`[worker gc] ${e.workerId}: worktree already gone — reclaimed scratch`);
        continue;
      }
      if (gcRefusedWorktrees.has(e.wtPath)) continue;
      // (b) Still on disk → reclaim ONLY when provably integrated + clean.
      const deps = await unlinkWorktreeDeps(e.origCwd, e.wtPath);
      if (!deps.ok) { console.error('[worker gc] dependency unlink failed (keeping):', deps.error); continue; }
      let safe: { gc: boolean; detail: string };
      try { safe = await worktreeIsGcSafe(e.wtPath, e.baseBranch); }
      catch (err) { console.error('[worker gc] gc-safe check threw (keeping):', err); continue; }
      if (!safe.gc) continue; // keep — fail-safe
      const r = await removeWorktree(e.origCwd, e.wtPath);
      if (!r.ok) {
        console.error(`[worker gc] removeWorktree failed (keeping ${e.workerId}):`, r.error);
        if (r.refused) {
          gcRefusedWorktrees.add(e.wtPath);
          hive.appendLog({ kind: 'worktree-removal-refused', path: e.wtPath, error: r.error });
        }
        continue;
      }
      removeWorkerScratch(e.workerId);
      preservedWorktrees.delete(key);
      console.log(`[worker gc] reclaimed ${e.workerId} (${safe.detail})`);
      informTempAsker(
        e.from,
        `[worker worktree reclaimed] ${e.workerId}`,
        `The preserved worktree for ${e.workerId} is now integrated (${safe.detail}), so it and its scratch dir were garbage-collected.\nWorktree: ${e.wtPath}`,
        e.slack
      );
    }
  } finally {
    gcSweepRunning = false;
  }
}

/** One controller tick: (1) finish/reap live workers (frees slots), then (2) pull
 *  new requests up to the concurrency cap. Order matters so a freed slot is reused
 *  the same tick. */
async function ephemeralWorkerTick(): Promise<void> {
  if (workerTickRunning) return;
  workerTickRunning = true;
  try {
    const cfg = readConfig();
    const maxWorkers = Math.max(1, cfg.maxConcurrentWorkers ?? 4);
    const idleTimeoutMs = Math.max(1, cfg.workerIdleTimeoutMinutes ?? 20) * 60_000;
    // Per-worker token cap. 0 = UNLIMITED (the default — wired but never throttles
    // unless a positive cap is set per-request or via defaultWorkerTokenCap).
    const defaultTokenCap = typeof cfg.defaultWorkerTokenCap === 'number' && cfg.defaultWorkerTokenCap > 0
      ? cfg.defaultWorkerTokenCap : 0;

    // (1) Finish or reap. Each release calls teardownPty EXPLICITLY after the
    //     kill, like every other kill site: ptyManager.kill() deletes the session
    //     synchronously, so when node-pty's async onExit later fires it fails the
    //     session-identity guard and the global exit handler (→ teardownPty)
    //     never runs. Relying on onExit here left released workers un-torn-down:
    //     no hive archive, no hive:agentArchived, frozen floor cards, and god
    //     kept mailing dead agents (seen live 2026-08-16 with worker-business/
    //     worker-qa/worker-bizreview). A double teardown is a harmless no-op.
    for (const [workerId, rec] of [...liveWorkers]) {
      if (rec.releasing) continue;
      const done = workerSignaledDone(workerId, rec.spawnedAt);
      if (done !== null) {
        // Success: the worker already replied in-thread; just release it.
        rec.releasing = true;
        rec.result = 'done';
        console.log(`[worker] ${workerId} signaled done — releasing`);
        // A Slack temp's card closes with its summary as the result (0.4.11).
        try { onTempFinished(workerId, { ok: true, body: done.body }, { hive }); } catch { /* card only */ }
        // 0.5.6: a clone's source hears the summary and the branch, in a note.
        // Kept on the record because the branch is only known once teardown has
        // run (finalizeWorkerWorktree sends it); a clone with no folder of its
        // own has no teardown to wait for, so its note goes now.
        rec.summary = done.body;
        if (!worktreePaths.has(workerId)) noteCloneSource(rec, 'It had no folder of its own, so there is no branch.');
        // Its mailbox is finished with too (#472). Workers seldom file their own
        // work order before signaling done, and the id is reused on every
        // re-hire of the same name, so anything left unread here would greet
        // the next incarnation as pending work (seen live: a re-hired worker
        // spent its first turns re-triaging yesterday's orders, and the wake
        // watchdog read them as mail unanswered for 21h). Only the DONE path
        // settles (an idle or token cap reap never signaled completion), and
        // only mail from BEFORE the done signal: a follow-up that crossed the
        // done stays pending. Whoever asked for the temp hears which
        // requests/queries were filed.
        const doneAt = done.at;
        const settled = hive.settleInbox(workerId, doneAt);
        if (settled.moved > 0) console.log(`[worker] ${workerId}: filed ${settled.moved} unread inbox message(s) under inbox/.done`);
        if (settled.kept > 0) console.log(`[worker] ${workerId}: left ${settled.kept} message(s) that arrived after its done signal pending`);
        // The worker's own work order is dispatched in conversation
        // `worker-<reqId>` (processSpawnRequest) and is what it just completed:
        // only OTHER requests/queries count. Subjects are agent-written: keep
        // each on its own line.
        const unanswered = settled.unanswered.filter((m) => m.conversation !== `worker-${rec.reqId}`);
        if (unanswered.length > 0) {
          const oneLine = (s: string): string => s.replace(/[\r\n]+/g, ' ');
          const lines = unanswered.map((m) => `- ${m.act} ${oneLine(m.id)} from ${oneLine(m.from)}: "${oneLine(m.subject)}"`);
          informTempAsker(
            rec.from,
            `[worker released — mail filed unread] ${workerId}`,
            `Worker ${workerId} signaled done and was released. These messages were still unread in its inbox and were filed under inbox/.done without an answer:\n`
            + lines.join('\n')
            + `\nIf one of them is not the order it just completed, nobody is working on it: resend it to another agent or re-hire the worker.`,
            rec.slack
          );
        }
        ptyManager.kill(workerId);
        teardownPty(workerId, 'worker');
        continue;
      }
      // Token-cap reap (default-off plumbing). An effective cap > 0 → reap when the
      // worker's cumulative token use exceeds it; its committed work is preserved.
      const tokenCap = (rec.tokenCap && rec.tokenCap > 0) ? rec.tokenCap : defaultTokenCap;
      if (tokenCap > 0) {
        const used = workerTokensUsed(workerId);
        if (used > tokenCap) {
          rec.releasing = true;
          rec.result = 'token-cap';
          console.warn(`[worker] reaping ${workerId} — token cap (${used.toLocaleString()} > ${tokenCap.toLocaleString()})`);
          informTempAsker(
            rec.from,
            `[worker reaped — token cap] ${workerId}`,
            `Worker ${workerId} used ${used.toLocaleString()} tokens (> its cap of ${tokenCap.toLocaleString()}) and was reaped. Any committed work on its branch is preserved for you.`,
            rec.slack
          );
          try { onTempFinished(workerId, { ok: false, reason: `over its token cap of ${tokenCap.toLocaleString()}` }, { hive }); } catch { /* card only */ }
          ptyManager.kill(workerId);
          teardownPty(workerId, 'worker');
          continue;
        }
      }
      const idleMs = ptyManager.idleFor(workerId);
      if (idleMs === undefined) continue; // PTY already gone; teardownPty cleans up
      if (idleMs > idleTimeoutMs) {
        rec.releasing = true;
        rec.result = 'idle';
        console.warn(`[worker] reaping idle ${workerId} (${Math.round(idleMs / 60000)}min idle)`);
        informTempAsker(
          rec.from,
          `[worker reaped — idle] ${workerId}`,
          `Worker ${workerId} produced no output for ${Math.round(idleMs / 60000)} min (> the ${Math.round(idleTimeoutMs / 60000)} min cap) and never signaled done, so it was reaped. Any committed work on its branch is preserved for you.`,
          rec.slack
        );
        try { onTempFinished(workerId, { ok: false, reason: `idle for ${Math.round(idleMs / 60000)} min` }, { hive }); } catch { /* card only */ }
        ptyManager.kill(workerId);
        teardownPty(workerId, 'worker');
      }
    }

    // (2) Process new requests, honoring the concurrency cap (backpressure: leave
    //     the rest in the queue for a later tick).
    //
    //     Gated on config.orchestratorMaySpawn (default ON since 0.5.3; was OFF): letting the
    //     orchestrator spin up agents unprompted is a SPEND decision, so the
    //     operator opts in. The gate sits HERE, on intake, and not on the watcher
    //     itself, because step (1) above owns the lifecycle of workers that are
    //     already running — reaping, teardown, the Slack failure notice — and
    //     turning the toggle off mid-flight must not strand them.
    //
    //     Declining also means declining to CONSUME. A request dropped in while
    //     this is off stays in the queue and runs when it is turned on, rather
    //     than being eaten and failed for a reason god never asked about.
    //
    //     0.4.11: a request main wrote for a Slack message (`origin: 'slack'`)
    //     is consumed even while that toggle is off. Turning Slack on is the
    //     person's consent for that spend, and the Slack form says so. Michael's
    //     own requests still wait for the toggle.
    //
    //     0.5.6: the same holds for a request main wrote for any other inbound
    //     message (`origin: 'inbound'`): the person chose a temp as the
    //     receiver. And any lasting agent may start a temp from its own folder,
    //     read after the orchestrator's queue. An agent's requests wait in its
    //     folder while the toggle is off, while the floor is at its limit, and
    //     while the agent has `maxTempsPerAgent` temps running (0: agents start
    //     none). The orchestrator is bound by the floor limit alone.
    const maySpawn = readConfig().orchestratorMaySpawn !== false;
    const perAgent = resolveMaxTempsPerAgent(cfg.maxTempsPerAgent);
    const floorFull = (): boolean => liveWorkers.size >= maxWorkers;
    for (const q of tempQueues(maySpawn && perAgent > 0 && !floorFull())) {
      const own = q.from === ORCHESTRATOR_ASKER;
      if (!own && (floorFull() || tempsStartedBy(q.from) >= perAgent)) continue;
      if (!existsSync(q.dir)) continue;
      let files: string[] = [];
      try { files = readdirSync(q.dir).filter(f => f.endsWith('.json')).sort(); } catch { /* dir vanished */ }
      for (const f of files) {
        const fp = join(q.dir, f);
        if (!own) {
          if (floorFull() || tempsStartedBy(q.from) >= perAgent) break;
        } else if (floorFull()) {
          // The rest waits, but an inbound message does not wait for ever: after
          // INBOUND_TEMP_WAIT_MS the orchestrator takes it instead.
          sendWaitingInboundToOrchestrator(fp);
          continue;
        } else if (!maySpawn && !spawnRequestOrigin(fp)) continue;
        await processSpawnRequest(fp, q.from);
      }
    }

    // (3) GC preserved worktrees whose work has since integrated. Throttled to
    //     GC_SWEEP_MS and a no-op when nothing is preserved (the common case).
    const now = Date.now();
    if (preservedWorktrees.size > 0 && now - lastGcSweepAt >= GC_SWEEP_MS) {
      lastGcSweepAt = now;
      await gcPreservedWorktrees();
    }
  } catch (e) {
    console.error('[worker] tick error:', e);
  } finally {
    workerTickRunning = false;
  }
}

function startEphemeralWorkerWatcher(): void {
  if (workerWatchTimer || !hive.enabled()) return;
  const dir = spawnRequestsDir();
  if (dir) { try { mkdirSync(dir, { recursive: true }); } catch { /* noop */ } }
  workerWatchTimer = setInterval(() => { void ephemeralWorkerTick(); }, WORKER_TICK_MS);
}

function stopEphemeralWorkerWatcher(): void {
  if (workerWatchTimer) { clearInterval(workerWatchTimer); workerWatchTimer = null; }
}

/** Snapshot of one live ephemeral worker for the renderer Workers tab. */
interface WorkerSnapshot {
  workerId: string;
  reqId: string;
  name: string;
  job?: string;
  model?: string;
  effort?: string;
  baseBranch: string;
  spawnedAt: number;
  ageMs: number;
  idleMs: number | null;        // null = PTY already gone
  tokensUsed: number;
  tokenCap: number | null;      // effective cap (per-request or config default); null = unlimited
  hasSlack: boolean;
  releasing: boolean;
  status: 'releasing' | 'working';
  from: string;                 // who asked: `god` for the orchestrator's queue, else an agent id (0.5.6)
  cloneOf: string | null;       // the lasting agent it was cloned from, if any (0.5.6)
}
/** Snapshot of a preserved-but-not-yet-GC'd worktree for the tab. */
interface PreservedSnapshot {
  workerId: string;
  wtPath: string;
  baseBranch: string;
  preservedAt: number;
}

/** List live ephemeral workers (+ preserved worktrees awaiting GC) for the tab. */
ipcMain.handle('workers:list', (): { live: WorkerSnapshot[]; preserved: PreservedSnapshot[]; maxWorkers: number } => {
  const cfg = readConfig();
  const defaultCap = typeof cfg.defaultWorkerTokenCap === 'number' && cfg.defaultWorkerTokenCap > 0
    ? cfg.defaultWorkerTokenCap : 0;
  const now = Date.now();
  const live: WorkerSnapshot[] = [...liveWorkers.values()].map((rec) => {
    const idle = ptyManager.idleFor(rec.workerId);
    const effCap = (rec.tokenCap && rec.tokenCap > 0) ? rec.tokenCap : (defaultCap > 0 ? defaultCap : 0);
    return {
      workerId: rec.workerId,
      reqId: rec.reqId,
      name: rec.name ?? rec.workerId,
      job: rec.job, model: rec.model, effort: rec.effort,
      baseBranch: rec.baseBranch,
      spawnedAt: rec.spawnedAt,
      ageMs: Math.max(0, now - rec.spawnedAt),
      idleMs: idle === undefined ? null : idle,
      tokensUsed: workerTokensUsed(rec.workerId),
      tokenCap: effCap > 0 ? effCap : null,
      hasSlack: !!rec.slack,
      releasing: !!rec.releasing,
      status: rec.releasing ? 'releasing' : 'working',
      from: rec.from,
      cloneOf: rec.cloneOf ?? null
    };
  });
  const preserved: PreservedSnapshot[] = [...preservedWorktrees.values()].map((e) => ({
    workerId: e.workerId, wtPath: e.wtPath, baseBranch: e.baseBranch, preservedAt: e.preservedAt
  }));
  return { live, preserved, maxWorkers: Math.max(1, cfg.maxConcurrentWorkers ?? 4) };
});


/** Manually stop a live ephemeral worker. Mirrors the done-release path: mark
 *  releasing, then kill + teardownPty runs the SAFETY-GATED worktree teardown
 *  (committed work is preserved, never force-discarded). Idempotent. teardownPty
 *  is called explicitly (D10) rather than left to the PTY's natural exit: kill()
 *  frees the manager's id slot synchronously, so by the time the process's real
 *  exit arrives the exit-handler's stale-id guard already misreads it as a
 *  reclaimed id and skips teardown — the worker would stay "live" in registry.json
 *  and fleet.json forever after this call. */
ipcMain.handle('workers:stop', (_evt, workerId: string): { ok: boolean; error?: string } => {
  if (typeof workerId !== 'string' || !workerId) return { ok: false, error: 'invalid worker id' };
  const rec = liveWorkers.get(workerId);
  if (!rec) return { ok: false, error: 'no such live worker' };
  if (rec.releasing) return { ok: true }; // already stopping
  rec.releasing = true;
  rec.result = 'stopped';
  console.log(`[worker] manual stop requested for ${workerId}`);
  try { ptyManager.kill(workerId); } catch (e) { return { ok: false, error: String(e) }; }
  teardownPty(workerId, 'worker');
  return { ok: true };
});

/** Start every hive-bound background service against the current harnessHome.
 *  Called on boot, and again to recover in place if a folder-change copy fails
 *  (config:changeHome tears these down before copying). No-op without a home. */
const floorGateDeps = (): FloorGateDeps => ({
  hiveRoot: () => hive.root(),
  currentHome: () => readConfig().harnessHome ?? null,
  hiveRootOf: (home) => join(home, 'hive'),
  ensureHome: ensureHarnessHome,
  writeHome: (home) => { writeConfig({ harnessHome: home }); }
});
registerFloorIpc(floorGateDeps());

// B23 part 2: the spawn behind the picker. The same binary, its own data
// folder under the main install's `floors/`, the main install's folder as the
// shared one (a floor spawning a floor still hands over the main folder, not
// its own), detached so closing this floor never takes the new one with it.
// Resolved on the child's `spawn` event, rejected on `error` (a missing
// executable), so the picker's "could not start" is real, not a guess.
setFloorSpawner(({ harnessHome }) => {
  const sharedDir = sharedDataDir();
  const dataDir = floorDataDirFor(sharedDir, harnessHome);
  const plan = floorSpawnPlan({ execPath: process.execPath, appPath: app.getAppPath(), packaged: app.isPackaged, dataDir, sharedDir, home: harnessHome });
  return new Promise((done) => {
    try {
      mkdirSync(dataDir, { recursive: true });
      const child = spawn(plan.command, plan.args, { detached: true, stdio: 'ignore', env: floorSpawnEnv(process.env) });
      child.once('spawn', () => { child.unref(); console.log(`[floor] spawned pid ${child.pid} on ${harnessHome} (data ${dataDir})`); done({ ok: true }); });
      child.once('error', (e) => done({ ok: false, error: e.message }));
    } catch (e) {
      done({ ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  });
});

function bootstrapHiveServices(): void {
  if (!hive.enabled()) return;
  // 0.5.3, B23: one floor per hive. A hive another live floor holds is refused
  // here with a dialog, and the process relaunches on another folder or quits;
  // nothing below may start against it (the hook server would steal that
  // floor's agents, see floorLock.ts).
  if (!acquireFloorAtBoot(floorGateDeps())) return;
  hive.ensureHive();
  // PROTOCOL.md and COMMANDS.md are refreshed here, once per start (#474);
  // ensureHive on its own only creates them when missing.
  hive.refreshGeneratedDocs();
  // Windows hook wrappers whose launcher or script is gone (plan F, gate of #190).
  hive.sweepHookWrappers();
  // Tell the hive what it is running inside, BEFORE anything spawns: the prompt
  // builder reads this, so an agent spawned earlier would never learn it.
  hive.setRuntimeInfo({ version: app.getVersion(), packaged: app.isPackaged, appPath: app.getAppPath() });
  // Hook shims named by the user's GLOBAL CLI configs (agy, Grok) live here,
  // outside any floor's hive, so a second floor, a moved hive or an older app
  // version cannot pull the file out from under a running agent (B23 point 5).
  hive.setSharedBinDir(join(app.getPath('appData'), 'munder-difflin', 'shared', 'bin'));
  // An agy hooks file 0.5.7 wrote in a shape agy rejects is written again.
  try { hive.repairAgyHooks(); } catch { /* best-effort */ }
  // 0.5.6: every agent's prompt names md-secret.cjs, so a key saved later is used with no restart.
  hive.setSecretHelperPath(secretScriptPath());
  // 0.5.8 (founder, 9 Nov 2026): every agent's start brief names what it can reach now,
  // in words (shared/integrationList.ts): its own grants, then this computer's webhooks.
  hive.setIntegrationsNow((agentId) => integrationList(integrations.enabledIds().map((id) => integrations.getRecord(id)), webhookListNow()));
  hive.setOrchestratorMaySpawn(readConfig().orchestratorMaySpawn !== false);
  hive.setTicketPrefix(readConfig().ticketPrefix);
  // An app-start marker in the event log. log.jsonl had twelve event kinds and
  // none of them meant "the app restarted", so a relaunch, and more importantly a
  // switch between a packaged build and a local one, was invisible to every agent
  // reading the feed. That gap cost a multi-hour investigation whose answer was
  // exactly this: a local build inherits the launching shell's umask, a
  // Finder-launched app does not.
  hive.appendLog({
    kind: 'app-start',
    version: app.getVersion(),
    packaged: app.isPackaged,
    // WHICH bundle, not just which version. Version plus packaged is not enough
    // to tell two builds apart: a stale copy in /Applications and a fresh one in
    // dist/ can report the same version and both be packaged, and picking the
    // wrong one by habit looks exactly like the new build being broken. Cost us
    // twice before this line existed.
    appPath: app.getAppPath(),
    exePath: process.execPath,
    electron: process.versions.electron,
    platform: process.platform
  });
  control.replaceAutoDeliveryPauses(readConfig().autoDeliveryPausedAgents ?? []);
  // The restore's main-side half, read BEFORE the step below marks every entry
  // with no live PTY stopped. See src/shared/agentLive.ts.
  captureBootGate();
  markStoppedAtBoot(); // #57/#58: no live PTY means stopped, never archived (0.5.8)
  // Codex daemons a crash, a force quit or an older build left for this
  // hive's agents. This floor holds the hive (acquireFloorAtBoot), so no other
  // app runs them; a live agent is skipped. In the background.
  try {
    const root = hive.root();
    if (root) {
      const cli = async (): Promise<{ executable: string; env: NodeJS.ProcessEnv }> => {
        const PATH = await shellPathReady();
        return { executable: resolveCliCommand('codex'), env: { ...process.env, PATH } };
      };
      void codexDaemons.sweep({ hiveRoot: root, live: new Set(ptyToAgent.values()), cli })
        .catch((e) => console.error('[codex-daemon] launch sweep failed:', e));
    }
  } catch (e) { console.error('[codex-daemon] launch sweep failed:', e); }
  // One whole scan of the hive, with the untracked cache off (0.5.5 commit
  // queue): it commits whatever changed while the app was closed or after a
  // crash, and the launch writes above with it. In the background; the start
  // does not wait. Before the router, whose first beats would otherwise be the
  // first commit.
  hive.scanCommitsAtStart();
  hive.setDemandWake(wakeDemand);
  hive.startRouter();
  startConnectionRequests();
  // W-A (0.4.9): archive old cards and cap the board, once now and then hourly.
  // After the router so the board ask has a live door to god's inbox.
  startTaskHygiene(hive);
  // 0.4.10: bound the stores that never had a cap — the cost ledger, the event
  // log, the roster backups, the handled-message archives, the spawn queue's
  // done/failed folders, the two files hygiene moves its bloat INTO, and the
  // memory condense backups. Delayed then hourly, and deliberately after
  // startTaskHygiene so a boot sweep never trims the archive in the same tick
  // hygiene is appending to it. See src/shared/retention.ts for every bound and
  // the one sentence that defends it.
  startRetention(() => ({ hiveRoot: hive.root(), harnessHome: readConfig().harnessHome ?? null }));
  // 0.5.6: the agents' finished Codex conversations, which nothing removed (one
  // person had 2.8 GB). A few minutes after start, then daily, async and one
  // run at a time. Keeps every registry session and every hook reported
  // transcript; see codexSessionPrune.ts for each rule.
  startCodexSessionPrune({
    input: () => {
      const root = hive.root();
      if (!root) return null;
      const registryPath = join(root, 'registry.json');
      return {
        codexHome: join(homedir(), '.codex'),
        hiveRoot: root,
        keep: () => {
          // Read strictly: a registry that cannot be read throws, and the
          // folder is skipped rather than walked with nothing to keep.
          const { chains, agentIds } = registryKeep(readFileSync(registryPath, 'utf8'));
          return { chains, paths: agentIds.map((id) => hookServer.transcriptPath(id)) };
        }
      };
    },
    onResult: (r) => {
      if (r.files > 0) {
        hive.appendLog({ kind: 'codex-sessions-pruned', files: r.files, bytes: r.bytes });
        console.log(`[codex-prune] removed ${r.files} old Codex conversation file(s), ${r.bytes} bytes, ${r.dirs} empty folder(s)`);
      }
      if (r.refused.length) console.warn('[codex-prune]', r.refused.join('; '));
    }
  });
  startEphemeralWorkerWatcher(); // poll HIVE_ROOT/spawn-requests → ephemeral workers
  // Phase 2: the loopback secret broker. Bind it BEFORE workers spawn so each spawn can
  // be granted a capability token + the broker URL in its env. Loopback-only, idempotent.
  void integrationBroker.start().then((r) => {
    if (r.ok) {
      console.log('[broker] integration broker listening on', integrationBroker.url());
      // New port, no tokens: re-grant every agent already running (one restored
      // before the port was bound, or one that outlived a home change) through
      // its .broker file, since its env still holds the old URL or none.
      const n = brokerGrants.onBrokerStart();
      if (n > 0) console.log(`[broker] re-granted ${n} running agent(s) via .broker`);
    }
    else console.error('[broker] failed to start:', r.error);
  });
  ensureDefaultMissions(); // one-time: seed the built-in heartbeat, retire old missions
  syncMissions(); // arm recurring auto-dispatch missions now the router is live
  startAutomationArming(); // …and keep them armed whichever door saves them next
  syncContextTriggers(); // …and the context trigger's own compact/clear cadences
  // Pair replies to inbound webhook messages in the ledger. Tied to the FEATURE
  // (any endpoint configured), not to the server: an approved message's card can
  // finish long after the operator switched the public surface back off, and its
  // reply still belongs in the history.
  if ((readConfig().webhookTriggers ?? []).length > 0) startWebhookDoneObserver();
  hookServer.start();
  // Claude's native http hooks (0.5.5 perf, item 6). Bound once for the whole
  // app run; a spawn that beats it gets the command hooks and a log line.
  void hookServer.startHttp().then((ep) => {
    if (!ep) console.error('[hive] hook http listener did not bind; Claude agents keep command hooks');
  });
  // Bind the telemetry collector BEFORE the renderer spawns any agent, then point
  // the hive at it so every subsequent spawn is instrumented. Best-effort — a bind
  // failure just leaves telemetry off (transcript reconciler stays). No breaker.start():
  // the breaker is POLICY-only, ticked by the heartbeat beat (#1, ships disabled).
  void telemetry.start().then((r) => {
    if (r.ok && r.endpoint) { hive.setOtelEndpoint(r.endpoint); console.log('[telemetry] collector listening', r.endpoint); }
    else console.error('[telemetry] collector failed to start:', r.error);
  });
  // After the login shell's PATH has landed: mempalace is looked for on it.
  void launchEnvReady().then(() => memory.refresh()); // init shared palace + mine loop (no-op without mempalace)
  // A laptop that has synced names its archives -laptop from the first condense (PR 20b).
  { const home = readConfig().harnessHome; if (home) adoptArchiveSide('laptop', join(home, 'sync.git')); }
  reflector.start(); // bound oversized memory.md files on a timer (no-op until threshold)
  handoffJob.start(); // trim each handoff.md past its limits on a timer (0.5.6)

  armAlwaysOnBeats();
}

/** Cadence of the worker inbox-wake watchdog (#151). Well under the renderer's
 *  own nudge cooldown so a throttled window is caught within ~15s of a stall. */
const WORKER_WAKE_POLL_MS = 15_000;
let workerWakeTimer: ReturnType<typeof setInterval> | null = null;
/** How often the beat verifies the hook socket is bound AND still ours. */
const HOOK_HEALTH_MS = 15_000;
let hookHealthTimer: ReturnType<typeof setInterval> | null = null;

/** Deliver the renderer's guarded nudge to one worker, through the one
 *  submit door (ptySubmit.ts): same bytes, same proof, same serial chain as the
 *  queue, so the two can never interleave. A nudge that ended stuck is followed
 *  by the key alone, never the text again (nextNudgeAction). Best effort, never
 *  throws. */
const nudgeStates = new Map<string, NudgeState>();
/** A nudge still in the submitter (up to about 32 s without proof, longer than
 *  a beat): the next beat skips that terminal rather than queue behind it. */
const nudgesInFlight = new Set<string>();
function nudgeWorker(ptyId: string, mail: HiveMessage[] = [], agentId = ptyToAgent.get(ptyId)): void {
  if (nudgesInFlight.has(ptyId)) return;
  const state = nudgeStates.get(ptyId);
  const action = nextNudgeAction(state, (ms) => hookServer.proof.activitySeen(agentId, ms));
  if (action === 'wait') { console.log(`[worker-wake] ${ptyId}: last nudge is stuck in the input box, waiting for the person`); return; }
  const provider = inferAgentProvider(undefined, agentId ? hive.registry().agents[agentId]?.provider : undefined);
  // Same text the renderer's drain types (inboxNudgeText), so the two wake
  // paths read the same and the queue's one pending rule recognises either via
  // isInboxNudge. 0.5.6: it carries the messages themselves, and wakeFiling is
  // told what was typed so that mail is filed when the turn ends.
  // The absolute inbox path rides along (public #559) for a body too long to type.
  const inboxPath = agentId ? hive.inboxPath(agentId) : null;
  const text = inboxNudgeText(mail, inboxPath, wakeOptionsFor(provider));
  // A press submits the older wake in the box, not this text: the mail it did
  // not carry is announced again by a later beat.
  if (action === 'press' && agentId) workerWake.unannounce(agentId);
  // 0.5.6: this path types a plain wake and never starts a clear on a switch
  // of work. If the window has one under way for this agent it ends here,
  // before the text goes in: a clear must never land after a wake.
  if (agentId) switchClear.abandon(agentId);
  if (action !== 'press') founderTurns.noteTyped(agentId, text, mail.some((m) => PERSON_SENDERS.has(m.from)), Date.now());
  void ptySubmitter.submit({ ptyId, agentId, provider, text, source: 'nudge', pressOnly: action === 'press', idle: true })
    .then((r) => {
      wakeFiling.noteTyped(agentId, text, r, action === 'press');
      switchClear.noteTyped(agentId, 'wake', r.outcome, action === 'press', oldestWakingWork(mail));
      if (r.outcome === 'held') return;
      // The process the stuck nudge sat in is gone: the next beat types afresh.
      if (r.outcome === 'gone') { nudgeStates.delete(ptyId); return; }
      if (action === 'press' && state) nudgeStates.set(ptyId, { ...state, outcome: r.outcome, pressOnlyPasses: state.pressOnlyPasses + 1 });
      else nudgeStates.set(ptyId, { typedAt: Date.now() - r.ms, outcome: r.outcome, pressOnlyPasses: 0 });
    })
    .catch((e) => console.warn(`[worker-wake] nudge failed for ${ptyId}: ${e instanceof Error ? e.message : String(e)}`))
    .finally(() => nudgesInFlight.delete(ptyId));
  nudgesInFlight.add(ptyId);
}

/** Main-process inbox-wake beat (issue #151, fix A): the renderer's idle nudge
 *  (useHive.ts) is the only path that wakes a worker parked on an undrained
 *  inbox — and it lives on a setInterval in the renderer, which a throttled or
 *  occluded window stops honoring. This beat is the renderer-INDEPENDENT fallback:
 *  it gathers live-worker facts (PTY quiescence, inbox depth, control flags) and
 *  lets WorkerWakeWatchdog.decide apply the exact renderer guards (idle-only,
 *  post-boot-grace, not paused/halted, no pending HITL, cooldown), then types the
 *  same nudge the renderer would have. God is never a candidate (its heartbeat
 *  path already re-engages it). */
function runWorkerWakeBeat(): void {
  if (!hive.enabled()) return;
  demandBeat();
  // 0.5.6: a turn that ended with no Stop hook (a person interrupted it, or a
  // bridge with no turn end event) still gets its wake's mail filed, on the
  // evidence the idle status rests on: a quiet terminal (wakeFiling.noteQuiet).
  // Every agent, the orchestrator included.
  for (const agentId of wakeFiling.waiting()) {
    const ptyId = ptyForAgent(agentId);
    if (ptyId) wakeFiling.noteQuiet(agentId, ptyManager.lastOutputAt(ptyId) ?? 0);
  }
  const reg = hive.registry();
  if (!reg?.agents || !reg.godId) return;
  const now = Date.now();
  const facts: WorkerWakeFacts[] = [];
  for (const [agentId, a] of Object.entries(reg.agents)) {
    if (agentId === reg.godId || !isLive(a)) continue;
    const ptyId = ptyForAgent(agentId);
    if (!ptyId) continue;
    const snap = control.snapshot(agentId);
    // 0.5.6: the mail that wakes. Not what an earlier wake already carried
    // (the turn end files it), and not one of the app's notes about a temp
    // still inside its 30 minutes: that rides the next wake (wakesReceiver).
    const mail = wakeFiling.pending(agentId, hive.inbox(agentId)).filter((m) => wakesReceiver(m, now));
    // Oldest pending message: the stall rule (#455) measures how long the
    // worker has ignored its mail, and telemetry says whether it has done ANY
    // turn since.
    let oldestMailAt = 0;
    for (const m of mail) {
      const t = Date.parse(m.created_at ?? '');
      if (Number.isFinite(t) && (oldestMailAt === 0 || t < oldestMailAt)) oldestMailAt = t;
    }
    // Read only while mail waits: the transcript fallback is a file read.
    const usage = mail.length ? usageProvider.getAgentUsage(agentId) : null;
    facts.push({
      agentId,
      isGod: agentId === reg.godId,
      ptyId,
      lastOutputAt: ptyManager.lastOutputAt(ptyId) ?? 0,
      inboxIds: mail.map((message) => message.id).filter(Boolean),
      autoDeliveryPaused: snap.autoDeliveryPaused,
      paused: snap.paused,
      halted: snap.halted,
      // Hold is registry state (setAgentHold), not ControlRegistry state — the
      // two stores are disjoint, so it must be read from the registry here.
      onHold: !!a.onHold,
      // A turn the CLI demonstrably took: a tool span, or a usage sample WITH
      // tokens. The zero token sample stamped at session start is not one, but
      // it does prove the CLI exports telemetry. Other engines show their
      // turns through hook events, which the watchdog hears itself.
      lastActivityAt: usage ? activityEvidenceAt({ usage, spans: telemetry.getSpans(agentId) }) : 0,
      hasTelemetry: usage !== null,
      oldestMailAt
    });
  }
  const nudged = new Set(workerWake.decide(facts, now));
  for (const agentId of nudged) {
    const ptyId = ptyForAgent(agentId);
    if (!ptyId) continue;
    // Re-read at delivery time, not from the facts snapshot: the agent may have
    // drained the mail during the beat, and a nudge naming ids it already filed
    // is the exact staleness #187 exists to stop. 0.5.6: the wake carries every
    // pending message no earlier wake has, waiting notes included.
    const pending = wakeFiling.pending(agentId, hive.inbox(agentId)).filter((m) => m.id);
    if (!pending.length) { console.log(`[worker-wake] ${agentId} drained before delivery, skipping`); continue; }
    // 0.5.6: a wake that starts a clear on a switch of work, or one that would
    // cut a held clear short, is the window's (switchLeftToWindow).
    if (switchLeftToWindow(agentId, pending)) { workerWake.unannounce(agentId); continue; }
    console.log(`[worker-wake] nudging ${agentId} on ${ptyId} (${pending.length} pending)`);
    nudgeWorker(ptyId, pending, agentId);
  }
  // A worker sitting on old mail without a nudge is the failure this watchdog
  // exists for: say WHY it is held, once per cooldown, so the log can never
  // again read "nothing happened" while a worker starves on its inbox (#455).
  for (const f of facts) {
    if (nudged.has(f.agentId) || f.inboxIds.length === 0) continue;
    const mailAge = f.oldestMailAt && f.oldestMailAt > 0 ? now - f.oldestMailAt : 0;
    if (mailAge < WORKER_WAKE_REPORT_MS) continue;
    const hold = workerWake.explain(f, now);
    if (!hold || !workerWake.shouldReportHold(f.agentId, now)) continue;
    const quiet = f.lastOutputAt > 0 ? `${Math.round((now - f.lastOutputAt) / 1000)}s` : 'never';
    const activeAt = Math.max(f.lastActivityAt ?? 0, workerWake.turnHookAt(f.agentId));
    const active = activeAt > 0 ? `${Math.round((now - activeAt) / 1000)}s ago` : 'never';
    const turn = workerWake.openTurn(f.agentId, now) ? ', open-turn' : '';
    console.warn(`[worker-wake] holding ${f.agentId}: ${hold} (mail pending ${Math.round(mailAge / 1000)}s, pty quiet ${quiet}, last activity ${active}${turn})`);
  }
}

/** (Re)arm the always-on beats (decoupled from the optional heartbeat): the live
 *  fleet snapshot Michael reads (~8s) + the breaker/cost-ledger beat (~30s).
 *  Guarded (clear-then-set) so a re-bootstrap (changeHome recovery) OR a
 *  powerMonitor resume can't stack duplicate timers — these are setInterval
 *  handles that freeze during true system sleep and must be re-armed on wake. */
function armAlwaysOnBeats(): void {
  if (fleetTimer) clearInterval(fleetTimer);
  writeFleetSnapshot();
  fleetTimer = setInterval(writeFleetSnapshot, 8_000);
  if (breakerBeatTimer) clearInterval(breakerBeatTimer);
  breakerBeatTimer = setInterval(() => { try { runBreakerBeat(300_000); } catch (e) { console.error('[breaker beat]', e); } }, 30_000);
  if (workerWakeTimer) clearInterval(workerWakeTimer);
  workerWakeTimer = setInterval(() => { try { runWorkerWakeBeat(); } catch (e) { console.error('[worker-wake beat]', e); } }, WORKER_WAKE_POLL_MS);
  runWorkerWakeBeat(); // catch-up on arm — power-resume re-arms and drains the backlog
  // A silently unbound hook socket looks exactly like "no workers have spawned
  // yet". Verify it (bound, and the path still ours) and re-bind when it is
  // not. Socket only: the http hook listener is never touched by this.
  if (hookHealthTimer) clearInterval(hookHealthTimer);
  hookHealthTimer = setInterval(() => { hookServer.ensureListening().catch((e) => console.error('[hooks beat]', e)); }, HOOK_HEALTH_MS);
  // A Codex conversation file too large (0.5.6): stat only, a minute per agent at most.
  if (codexSizeTimer) clearInterval(codexSizeTimer);
  codexSizeTimer = setInterval(() => { try { runCodexSizeBeat(); } catch (e) { console.error('[codex-size beat]', e); } try { runClearRequests(); } catch (e) { console.error('[clear-requests beat]', e); } try { runCompactRequests(); } catch (e) { console.error('[compact-requests beat]', e); } }, CODEX_SIZE_BEAT_MS);
  // And the orchestrator's clear requests (0.5.6) and any agent's compact
  // requests ride the same beat.
  { const dir = clearRequestsDir(); if (dir) { try { mkdirSync(dir, { recursive: true }); } catch { /* noop */ } } }
  { const dir = compactRequestsDir(); if (dir) { try { mkdirSync(dir, { recursive: true }); } catch { /* noop */ } } }
}

/** Wall-clock instant we last observed the machine suspend or lock, so a resume
 *  can report how long we were out. Best-effort context for the renderer follow-on
 *  (auto-revive); null until the first suspend/lock of the session. */
let lastSuspendAt: number | null = null;
/** Single pending post-resume PTY health check, so overlapping resume+unlock
 *  events collapse to ONE check (the latest) instead of stacking. */
let resumeHealthTimer: NodeJS.Timeout | null = null;

/** After the machine wakes, probe each live PTY for liveness and surface any that
 *  didn't survive. macOS can wedge a child `claude` process/socket across a long
 *  sleep while node-pty still holds the fd (its exit event never fired) — so a
 *  dead PTY can linger in our list. `process.kill(pid, 0)` is a pure existence
 *  probe (signal 0 never touches the process); ESRCH means the process is gone.
 *  We only LOG + NOTIFY here (no auto-kill/respawn — true revive is renderer-owned
 *  via pty:spawn) and emit `power:resume` as the integration point for the
 *  follow-on renderer auto-revive card. */
function healthCheckPtys(reason: string, awayMs: number | null): void {
  const ptys = ptyManager.list();
  const dead: string[] = [];
  for (const p of ptys) {
    if (typeof p.pid === 'number' && p.pid > 0) {
      try { process.kill(p.pid, 0); }   // liveness probe only — never kills
      catch (e) {
        // ONLY ESRCH MEANS GONE. EPERM means the process is ALIVE and not ours
        // to signal, and a bare catch used to call that dead too. "Dead" is the
        // dangerous direction here: the revive that follows KILLS the agent. So
        // it needs proof, and anything that is not ESRCH is treated as alive.
        if ((e as NodeJS.ErrnoException)?.code === 'ESRCH') dead.push(p.id);
      }
    }
  }
  const away = awayMs != null ? ` (away ~${Math.round(awayMs / 1000)}s)` : '';
  if (dead.length) {
    console.warn(`[power] ${reason}${away}: ${dead.length}/${ptys.length} PTY(s) look wedged (process gone):`, dead.join(', '));
    breakerToast('Agents need a restart', `${dead.length} agent terminal(s) didn't survive sleep — re-open them to resume.`);
  } else {
    console.log(`[power] ${reason}${away}: ${ptys.length} PTY(s) healthy`);
  }
  // Single integration point for the (separate) renderer auto-revive card: it can
  // listen for 'power:resume' and respawn the `dead` PTYs with --resume.
  try { liveWebContents()?.send('power:resume', { reason, awayMs, dead, total: ptys.length }); } catch { /* window gone */ }
}

/** Re-arm everything that runs on a frozen libuv timer after the machine slept,
 *  and surface any PTY that didn't survive. macOS pauses setTimeout/setInterval
 *  during true system sleep (the monotonic clock halts) — on wake they resume
 *  where they paused, shifted by the whole sleep, so missions due during sleep
 *  never fired and never replay. We rebuild the scheduler (syncMissions reuses its
 *  remaining=max(0,…) semantics → each overdue mission fires exactly ONCE then
 *  re-settles, never N replays), re-arm the always-on beats, re-evaluate the
 *  power blocker, then — after a short grace for PTYs to wake their pipes —
 *  health-check the terminals. Idempotent: overlapping resume+unlock events
 *  collapse safely (clear-then-arm everywhere; at most one catch-up fire). */
function onSystemResume(reason: string): void {
  console.log(`[power] ${reason} — re-arming scheduler, beats, router, keep-awake`);
  try { syncMissions(); } catch (e) { console.error('[power] syncMissions on resume', e); }
  // Same freeze, same catch-up: the context timers honour elapsed-time-since-last-
  // run, so a compact/clear that came due while the machine slept fires ONCE here
  // rather than being lost or replayed N times.
  try { syncContextTriggers(); } catch (e) { console.error('[power] syncContextTriggers on resume', e); }
  try { armAlwaysOnBeats(); } catch (e) { console.error('[power] armAlwaysOnBeats on resume', e); }
  // The hive message router (outbox→inbox drain) is a setInterval that freezes
  // during true system sleep exactly like the beats above — but it was the one
  // always-on timer never re-armed on wake. Symptom: after a long sleep the
  // scheduler→god path recovered (it injects straight into god's inbox), while
  // every agent's outbox silently stopped draining, so god→worker and
  // worker↔worker mail piled up undelivered. Re-arm the poll loop (clear-then-set,
  // idempotent) and immediately drain the backlog that accrued while we were out
  // instead of waiting for the first post-wake tick. The renderer's idle inbox-wake
  // nudge (useHive.ts) then wakes each parked recipient once its mail lands.
  try {
    hive.stopRouter();
    hive.startRouter();
    const drained = hive.routeOnce();
    if (drained > 0) console.log(`[power] ${reason} — flushed ${drained} queued hive message(s)`);
  } catch (e) { console.error('[power] router re-arm on resume', e); }
  // 0.4.11: the Slack socket died with the sleep, so reconnect now rather than
  // waiting out the backoff; the poller sweeps at once for what arrived meanwhile.
  try { slackSocket?.reconnectNow(); void slackPoller?.sweepNow(); } catch (e) { console.error('[power] slack on resume', e); }
  // 0.5.6: a start that failed before the sleep is tried now, not when its wait is up.
  try { slackRetry.tryNow(); } catch (e) { console.error('[power] slack retry on resume', e); }
  try { syncKeepAwake(); } catch (e) { console.error('[power] syncKeepAwake on resume', e); }
  const awayMs = lastSuspendAt != null ? Date.now() - lastSuspendAt : null;
  // Give PTYs a beat to resume their pipes before judging them wedged; reset any
  // pending check so a resume quickly followed by unlock runs the probe just once.
  if (resumeHealthTimer) clearTimeout(resumeHealthTimer);
  resumeHealthTimer = setTimeout(() => {
    resumeHealthTimer = null;
    healthCheckPtys(reason, awayMs);
  }, 15_000);
}

app.whenReady().then(() => {
  // GPU and utility deaths are recorded, not acted on: Chromium respawns them,
  // but when a renderer dies moments later the ORDER of the two is the
  // diagnosis, and a packaged launch has stdout on /dev/null.
  installProcessHealth();

  // Reap agents a previous run left behind (a SIGKILLed or crashed main
  // process never ran killAll). An orphan is not just idle: it keeps its
  // provider session file open, so this launch could not resume that agent.
  // The previous ledger is taken off disk NOW, before this run spawns anything
  // into the same file; the identity check and the kills run async (one ps).
  // Every kill is gated on process identity; see staleAgents.ts.
  try {
    const agentLedgerPath = join(app.getPath('userData'), 'agent-pids.json');
    const previousAgents = takePreviousLedger(agentLedgerPath);
    ptyManager.setLedger(new AgentLedger(agentLedgerPath));
    if (previousAgents.length) {
      void sweepStaleAgents(previousAgents, (m, d) => console.log(m, d))
        .catch((e) => console.error('[stale-agents] sweep failed:', e));
    }
  } catch (e) { console.error('[stale-agents] ledger setup failed:', e); }

  // Realtime Michael mic-gate hygiene (rt-8 / Pam rt-10 nit): the voice session
  // opens the mic permission gate by persisting realtimeVoiceEnabled=true and
  // closes it on disconnect — but a hard crash/reload mid-session skips that
  // teardown, leaving the flag stuck true so the gate would boot PRE-OPEN with no
  // live session. Force it closed at startup (a real session re-opens it via
  // setMicGate(true)); macOS TCC stays a second gate regardless.
  if (readConfig().realtimeVoiceEnabled) writeConfig({ realtimeVoiceEnabled: false });

  // 0.5.3, bug 12: a harness config whose folder somebody deleted is taken off
  // the remembered list before any window asks for it, so the launch picker
  // never offers a row that would quietly make the folder again.
  try {
    const gone = pruneRecentHivesOnDisk();
    if (gone.length) console.log(`[config] dropped ${gone.length} deleted harness config(s) from the recent list: ${gone.join(', ')}`);
  } catch (e) { console.error('[config] could not prune the recent list:', e); }

  // Anonymous product analytics (PostHog) — the full contract lives in
  // TELEMETRY.md. No-op unless a build-time key was injected (official releases
  // only), and gated on DO_NOT_TRACK + the telemetryEnabled config (opt-out).
  analytics.init({
    stateDir: app.getPath('userData'),
    appVersion: app.getVersion(),
    enabled: readConfig().telemetryEnabled !== false
  });

  // Warm the model catalog cache before any picker opens. The renderer reads
  // the same cache over IPC on load; doing the network hop here means the file
  // is already fresh on disk by the time a modal is opened, and a failure is
  // silent by construction (the baked catalog is the floor).
  void loadModelCatalog(MODEL_CATALOG_CACHE()).catch(() => { /* never fatal */ });

  // A cold-start deep link (Windows/Linux) rides in on OUR argv.
  const startupHireLink = process.argv.find((a) => a.startsWith('munderdifflin://'));
  if (startupHireLink) handleDeepLink(startupHireLink);

  // Hand every spawned agent the path to the Slack reply discovery file via the
  // inherited env (pty merges process.env). The path is stable whether or not the
  // server is running; the FILE only exists while it is, so the helper degrades
  // to "endpoint not running" cleanly. NO secret is in the env — only the path.
  process.env.MD_SLACK_REPLY_CONFIG = slackReplyConfigPath();
  // Open the durable store first — createWindow() reads the saved window bounds.
  // Guarded: a DB failure (e.g. a bad native build) must degrade to defaults,
  // never block app startup.
  try { persist.open(); } catch (e) { console.error('[db] open failed:', e); }
  // Update notice from GitHub releases (packaged builds only; gated on the
  // `autoUpdate` config flag). It tells the person a newer release is out and
  // links its page; releases are source only, so nothing is downloaded or
  // installed. A floor never checks: the app that opened it already does.
  if (!isFloorProcess()) initUpdateNotice(() => liveWebContents());
  // Bootstrap the hive (if harnessHome is configured) and start the message router.
  bootstrapHiveServices();
  // The Graphics mode this run started with, and what Chromium made of it.
  logGraphicsWhenKnown(app, graphicsAtStartup, (row) => hive.appendLog(row));
  // Survive sleep/lock. macOS freezes libuv timers during true system sleep, so a
  // locked/idle/slept Mac stops firing schedules and can wedge PTYs. On wake we
  // re-arm the scheduler (catching up missed missions ONCE) + beats + keep-awake,
  // then health-check terminals. App-lifetime listeners — powerMonitor outlives
  // every window, so there is nothing to tear down on quit.
  powerMonitor.on('resume', () => onSystemResume('resume'));
  powerMonitor.on('unlock-screen', () => onSystemResume('unlock-screen'));
  powerMonitor.on('suspend', () => { lastSuspendAt = Date.now(); console.log('[power] suspend — system sleeping'); });
  powerMonitor.on('lock-screen', () => { lastSuspendAt = Date.now(); console.log('[power] lock-screen'); });
  // Multi-window floors (opt-in): install the menu carrying "New Floor". When
  // off, the app keeps Electron's default menu — zero behavior change.
  if (readConfig().multiWindow) installAppMenu();
  createWindow();
  // 0.5.5, Plan G: read the mailboxes in the background now, so the first
  // screen that lists them does not wait for 6,000 files to be parsed.
  void hive.warmMailboxes();
  // Auto-start the Slack webhook server when configured. Best-effort: a tunnel
  // failure (offline) is logged, not fatal. The tunnel URL is ephemeral and
  // changes per restart, so the user re-pastes it via Settings → Start.
  // 0.4.11: whichever of the three ways is chosen; the readiness check inside
  // says what is missing instead of silently doing nothing.
  const slackCfg = readConfig();
  if (slackCfg.slackEnabled) {
    void startSlackIngestion().then((r) => {
      if (!r.ok) console.error('[slack] auto-start failed:', r.error);
      else console.log(`[slack] ${resolveSlackMode(readConfig())} started`, r.url ? `(tunnel: ${r.url})` : '');
    });
  }
  // Auto-start the generic webhook only for endpoints the user has explicitly
  // enabled (each with its own secret) — never a default-on public surface.
  // Opt-in, like Slack; an install with no enabled endpoint opens no tunnel.
  if (enabledWebhookEndpoints().length > 0) {
    void startWebhookServer().then((r) => {
      if (!r.ok) console.error('[webhook] auto-start failed:', r.error);
      else console.log('[webhook] listening', r.url ? `(tunnel: ${r.url})` : '(no tunnel)');
    });
  }
  // The Dock click. Count the APP'S windows (primary + floors), not every
  // BrowserWindow. ONE CLICK ON THE DOCK ICON REACHES THE WINDOW (0.5.6): the
  // window the person last used is brought forward, the way a second launch
  // already does it. `focus` does nothing to a window that was never shown, so
  // a click during launch cannot show one early.
  app.on('activate', () => {
    if (allWindows.size === 0 || !primaryWindow) { createWindow(); return; }
    const w = mainWindow && !mainWindow.isDestroyed() ? mainWindow : [...allWindows].find((x) => !x.isDestroyed()) ?? null;
    if (!w) return;
    if (w.isMinimized()) w.restore();
    w.focus();
  });
});

// before-quit covers Cmd-Q / dock-quit; the per-window close handler covers
// the red close button. Both routes hit the same warning UX.
app.on('before-quit', (e) => {
  if (allowQuit) return;
  // Unsaved IDE text first: it is lost whichever way the terminal question below
  // is answered, and with no terminals running that question is never asked.
  const ideDirty = ideDirtyByWindow.total();
  if (!confirmLosingIdeEdits(mainWindow, ideDirty)) { e.preventDefault(); return; }
  const count = ptyManager.list().length;
  if (count === 0) return;
  // The confirmation is a RENDERER modal, so it can only be asked for when a
  // renderer is alive to draw it. Cancelling the quit without one wedges the
  // app for good: `app:closeRequested` goes nowhere, nothing ever sets
  // allowQuit, and every later quit (a SIGTERM included) is swallowed the same
  // way. With no one to ask, quit; the teardown path still stops the PTYs.
  if (!logQuitPromptDecision(mainWindow, 'before-quit')) return;
  e.preventDefault();
  mainWindow.focus();
  mainWindow.webContents.send('app:closeRequested', { ptyCount: count });
});

// Every window loads the config once at start-up, so tell them all when a
// setting is saved — a floor left out would keep showing what it opened with.
onConfigWritten((config) => {
  for (const w of allWindows) {
    if (w.isDestroyed() || w.webContents.isDestroyed()) continue;
    w.webContents.send('config:changed', config);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Full teardown, not a bare killAll: this path must also stop the proxy
    // sidecars and helper servers — on Windows a child is NOT killed when its
    // parent exits, so anything skipped here outlives the app.
    teardownAndQuit();
  }
});

// Final analytics flush (session_ended + drain the send queue), bounded so a
// hung network can never wedge quit: preventDefault ONCE, race the flush
// against a short timeout, then exit hard.
//
// finish MUST be app.exit(), not a re-entrant app.quit(): when the quit was
// initiated while a window was still open (the "kill all & quit" confirm path
// calls teardownAndQuit → app.quit() and the window closes DURING that quit),
// Electron is left with its internal is-quitting state set after this
// preventDefault, and the later app.quit() is silently a no-op — no before-quit,
// no will-quit, no quit; the main process idles forever with zero windows. On
// Windows that stranded the whole Electron process group (main + GPU + network
// service) after every agents-running quit. By this point teardown has already
// run and the flush has finished or timed out, so an unconditional exit is
// exactly what's left to do.
let analyticsFlushed = false;
app.on('will-quit', (e) => {
  if (analyticsFlushed) return;
  analyticsFlushed = true;
  e.preventDefault();
  const finish = (): void => app.exit(0);
  // The hive commit queue (0.5.5): a last whole scan, waiting at most 5 s,
  // then an app-quit line in log.jsonl so a clean quit can be told from a
  // crash. Anything the scan did not reach is on disk, and the scan at the
  // next start commits it.
  const quitStarted = Date.now();
  const hiveDrained = hive.drainCommitsForQuit().then(
    (drained) => { try { hive.appendLog({ kind: 'app-quit', commitsDrained: drained, ms: Date.now() - quitStarted }); } catch { /* best-effort */ } },
    () => { try { hive.appendLog({ kind: 'app-quit', commitsDrained: false, ms: Date.now() - quitStarted }); } catch { /* best-effort */ } }
  );
  Promise.all([
    Promise.race([
      analytics.endSession(),
      new Promise<void>((r) => setTimeout(r, 1200))
    ]),
    hiveDrained,
    codexDaemons.stopAll(2_500)
  ]).then(finish, finish);
});
