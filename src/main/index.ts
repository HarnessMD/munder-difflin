import { app, BrowserWindow, clipboard, dialog, ipcMain, Menu, powerMonitor, powerSaveBlocker, screen, shell, Notification } from 'electron';
import { spawn } from 'node:child_process';
import {
  rmSync, existsSync, readFileSync, readdirSync, statSync, cpSync, writeFileSync,
  unlinkSync, mkdirSync, renameSync, createWriteStream, copyFileSync, lstatSync,
  readlinkSync, symlinkSync
} from 'node:fs';
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { join, resolve, sep, basename, dirname, isAbsolute } from 'node:path';
import { homedir } from 'node:os';
import { request as httpsRequest } from 'node:https';
import { PtyManager, type SpawnOptions } from './pty';
import { resolveCommand as resolveCliCommand, isSafeCommandName } from './shellEnv';
import { releaseClaudeSession } from './claudeSessionRelease';
import { initAutoUpdater, abortPendingRestart } from './updater';
import { RealtimeFloorWatcher } from './realtimeFloorWatcher';
import {
  readConfig, writeConfig, setAgentTokenCap, setAgentMcp, saveAvatar, deleteAvatar, resetConfig, onConfigWritten, ensureHarnessHome, ensureClaudePermissionsAccepted,
  modelForRole, OPS_STANDUP_MISSION, HEARTBEAT_MISSION, COMPACT_MAINTENANCE_MISSION, type HarnessConfig, type ScheduledMission, pruneRecentHivesOnDisk } from './config';
import { asAttachWant, attachDialogOptions, attachName } from '../shared/attachDialog';
import { effectiveMcp, sanitizeAgentMcp } from '../shared/agentMcp';
import { listDir, readFileText, readFileBinary, writeFileText, statAbs, expandTilde, searchInRoot, makeDirIn, createFileIn, renameIn, safeResolve } from './fs';
import { normalizeWeekly, weeklyDelayMs } from '../shared/weeklySchedule';
import { anyAppStandsAside, type DictationFocus } from '../shared/dictationFocus';
import {
  getBranch, getStatus, getLog, getBranches, getAheadBehind, isRepo, getDiff, mainRepoRoot,
  addWorktree, removeWorktree, worktreeHasUnintegratedWork, worktreeIsGcSafe,
  getLogGraph, getCommitFiles, getFileAtRev, compareRefs, listWorktrees, checkoutRef
} from './git';
import { linkWorktreeDeps, unlinkWorktreeDeps } from './worktreeDeps';
import { HiveManager, redactSecrets, type AgentMeta, type HiveMessage, type HiveTask } from './hive';
import { HookServer } from './hooks';
import { acquireFloorAtBoot, openFloorPicker, registerFloorIpc, setFloorSpawner, type FloorGateDeps } from './floorGate';
import { parseFloorArgs, floorDataDirFor, floorSpawnPlan, floorSpawnEnv, seedFloorConfig } from './floorArgs';
import { setSharedDataDir, sharedDataDir, isFloorProcess } from './sharedData';
import { claimFloorNumber, releaseFloorNumber, liveOfficeCount, officeLabel } from './floorNumber';
import { pidAlive } from './floorLock';
import { ActivityDigest } from './activityDigest';
import { ACTIVITY_RING } from '../shared/activity';
import { CircuitBreaker, type BreakerInput } from './breaker';
import { CumulativeSampleGate, type UsageProvider } from './usage';
import { MemoryManager } from './memory';
import { KnowledgeManager } from './knowledge';
import { MemoryReflector, type ReflectSettings } from './reflect';
import { PersistStore } from './db';
import { readAgentUsage, readContextTokens, seedSessionTranscript, resolveSessionCwd } from './transcript';
import { listIssues, listCIRuns } from './github';
import { SlackWebhookServer, SlackReplyServer, postSlackReply, setSlackPostSink, type SlackEventFile, type SlackInboundMessage } from './slack';
import { appendSlackHistory, listSlackHistory } from './slackHistory';
import { handleInboundSlack, onTempFinished, type SlackInbound } from './slackInbound';
import { SlackPoller, fetchThread, slackAuthTest, slackListChannels } from './slackPoller';
import { SlackSocketClient, slackConnectionsOpenTest } from './slackSocket';
import { SLACK_BOT_SCOPES, SLACK_MODES, SLACK_PROACTIVE_OFF_REASON, resolveCatchupSeconds, resolvePollSeconds, resolveSlackMode, type SlackMode, type SlackStatus, type SlackTestDraft, type SlackTestResult } from '../shared/slackMode';
import { selectBroadcastTargets } from '../shared/broadcast';
import { memoryContextBlock, writeMemoryIndex } from './memoryIndex';
import { appendWorkerHistory, listWorkerHistory, setWorkerHistoryWorktree } from './workerHistory';
import { startTaskHygiene, stopTaskHygiene } from './taskHygiene';
import { startRetention } from './retention';
import type { WorkerResult } from '../shared/workerHistory';
import {
  WebhookServer,
  type WebhookDispatch, type WebhookEndpointRef, type WebhookInbound, type WebhookTaskStatus
} from './webhook';
import { processConnectionRequests, type ConnDeps } from './connectionRequests';
import {
  classifyInboundKind, isAutoAllowed, isWebhookAuth, isWebhookSource, webhookBriefing,
  DEFAULT_CONTEXT_TRIGGER, DEFAULT_TRIGGER_MODE, DEFAULT_WEBHOOK_SCHEMA,
  type ContextRule, type ContextTriggerConfig, type InboundKind,
  type TriggerHistoryEntry, type TriggerMode, type WebhookTrigger
} from '../shared/triggers';
import { resolveWebhookRecipient } from '../shared/responder';
import {
  appendTriggerHistory, clearTriggerHistory, listTriggerHistory, updateTriggerHistory
} from './triggerHistory';
import { transcribeWithGroq, DEFAULT_GROQ_MODEL } from './freeflow';
import { TranscribeRouter } from './transcribe/router';
import { withTranscribeDefaults, cleanCustomWords, defaultPushToTalkKeyFor, type TranscribeConfig } from '../shared/transcribeConfig';
import { registerPuck, puckMicLive, isPuckContents, meetingSystemAudio, toggleMeetingByKey, captureByKey, puckDictationEvent } from './puck';
import { MeetingHotkey } from './transcribe/meetingHotkey';
import { hotkeyProblem, meetingKeyFor, defaultMeetingKey, sameChord, captureKeyFor, defaultCaptureKey, needsNewHelperKey } from '../shared/hotkeyName';
import { SystemTap, mdTapAvailable, mdTapPath, isTapDenied } from './transcribe/systemTap';
import { registerRealtimeIpc } from './realtime';
import { registerRealtimeActionIpc } from './realtimeActions';
import { initCompletionWatcher } from './realtimeCompletionWatcher';
import type { TaskCard, InboxMessage } from './realtimeCompletionWatcher';
import { TelemetryCollector } from './telemetry';
import { CostLedgerTotals } from './costLifetime';
import { analytics, isFunnelEvent, isRendererMessageSurface, runDurationBucket, runEndReason } from './analytics';
import type { CheckoutReason, SpawnFailReason } from './analytics';
import { IntegrationBroker } from './integrationBroker';
import * as integrations from './integrations';
import { customSecretEnv, customSecretNames, customSecretRef, secretNameProblem } from '../shared/customSecrets';
import { validateBaseUrl, buildAuthRequest, resolveUpstreamUrl, secretRefFor, INTEGRATION_TEMPLATES } from '../shared/integrations';
import { RosterStore } from './roster';
import { buildWorkerLaunch } from './workerLaunch';
import { ControlRegistry } from './control';
import { WorkerWakeWatchdog, type WorkerWakeFacts } from './workerWake';
import { finalizeAgentWorktree } from './agentWorktree';
import { listOwnedWorktrees, removeOwnedWorktree, worktreeSize, worktreeWork, type WorktreeAdminContext } from './worktreeAdmin';
import { RESPAWNING, reasonFromRenderer, type TeardownReason } from '../shared/worktreeFate';
import { spawnedCard } from '../shared/spawnedCard';
import { IdeDirtyLedger, ideQuitWarning } from '../shared/ideBuffers';
import { pickResumableSession, sampleProvesConversation } from '../shared/resumeKey';
import { chooseResumeSession, providerSessionStore, type DirLister, type StoreContext } from '../shared/resumeStore';
import { inboxNudgeText } from '../shared/hiveNudge';
import { resolveGodName } from '../shared/godIdentity';
import { slowSpawnDelayMs } from '../shared/restoreSlow';
import { stripTerminalControl, terminalForVoice } from '../shared/voiceText';
import { excerptAround, keywordThreshold, keywordsOf, scoreLine } from '../shared/voiceMemory';
import { fetchHireManifest, readHireManifestFiles } from './hire';
import * as deviceIdentity from './deviceIdentity';
import { fetchBilling, patchMe, teamRoster } from './relay';
import { markVerified, setYouAllow, setYouAllowDefault } from './teamPins';
import * as teamsEnrol from './teamsEnrol';
import * as teamsGate from './teamsGate';
import * as soloLicense from './soloLicense';
import * as freeAccount from './freeAccount';
import * as teamsSession from './teamsSession';
import * as teamsBridge from './teamsBridge';
import * as teamsOrg from './teamsOrg';
import { parseBillingWire, type BillingSummary } from '../shared/billing';
import { readMembership, forgetMembership, setBossNameNeeded } from './teamsMembership';
import { validateBossName } from '../shared/bossName';
import { parseTeamsDeepLink } from '../shared/teams';
import { parseFreeDeepLink } from '../shared/freeTier';
import { parseProCheckoutDeepLink } from '../shared/proCheckout';
import * as proCheckoutShared from '../shared/proCheckout';
import * as proCheckout from './proCheckout';
import { parseHireDeepLink, type HireManifest } from '../shared/hire';
import {
  argsWithAutoModeFlag,
  inferAgentProvider,
  isClaudeProvider,
  nonInteractiveEnvForProvider,
  providerPreset,
  installInfoForProvider,
  type AgentProvider
} from '../shared/agentProvider';
import { buildLoginScript, buildManualSetupScript, buildMissingCliScript, chooseInstallRung, describeMissingCli } from './cliInstall';
import { installerTail, type CliMissingState } from '../shared/cliMissing';
import { isPrintModeRun, loginCommandLine, offerSignInAfterExit, providerLoginArgs, setupCanGoManual, setupCanStart, setupCanStartAnyway, type CliSetupState } from '../shared/cliSetup';
import { checkSignedIn, hasSignInCheck } from './cliReadiness';
import { CliLoginWatcher } from './cliLoginWatcher';
import { loginHostAllowed, type LoginEvent } from '../shared/cliLogin';
import { detectNodeVersion, nodeIsUsable, resolveNodeInstaller } from './nodeInstall';
import { toolCatalog, type ToolStatus } from '../shared/toolCatalog';
import { listLocalSkills, loadCatalog, installSkill, uninstallSkill, type LocalSkill } from './skills';
import { loadHero } from './hero';
import { loadModelCatalog } from './modelCatalog';
import {
  CODEX_REMOTE_SOCKET_RELATIVE,
  codexRemoteAliasPath,
  codexRemoteEndpoint,
  codexRemoteSocketFits,
  codexWritableRootsToml,
  splitCodexAddDirs,
  withCodexRemoteArgs
} from '../shared/codexRemote';

const isDev = !!process.env.ELECTRON_RENDERER_URL;

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
// the main install's userData, which is where the solo licence and the solo
// device key are read from by every floor: one machine, one licence. Honoured
// in packaged builds, which is exactly where New Floor runs, and before every
// userData read. The picker's folder arrives as `--floor-home` and goes into
// this floor's config on its first boot, so the floor opens on that hive and
// never sees the onboarding wizard.
const floorArgs = parseFloorArgs(process.argv, process.env);
if (floorArgs) {
  app.setPath('userData', floorArgs.dataDir);
  setSharedDataDir(floorArgs.sharedDir);
  // First boot of this floor: its config is the main install's, seeded once
  // (onboarding done, models, keys, dictation), minus the per hive and per
  // listener keys, on the picker's folder. Later boots keep the floor's own.
  const floorConfig = join(floorArgs.dataDir, 'config.json');
  if (floorArgs.home && !existsSync(floorConfig)) {
    let seed: Record<string, unknown> = {};
    try { seed = JSON.parse(readFileSync(join(floorArgs.sharedDir, 'config.json'), 'utf8')) as Record<string, unknown>; } catch { /* a main install with no config yet: defaults */ }
    mkdirSync(floorArgs.dataDir, { recursive: true });
    writeFileSync(floorConfig, JSON.stringify(seedFloorConfig(seed, floorArgs.home), null, 2), 'utf8');
  }
}

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

const ptyManager = new PtyManager();
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
const agentRuns = new Map<string, { opts: AgentSpawnOptions; owner: Electron.WebContents | null; provider: AgentProvider; printMode: boolean; startedAt: number }>();
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
const hive = new HiveManager(
  () => readConfig().harnessHome,
  (channel, payload) => {
    const wc = liveWebContents();
    if (!wc) return false;
    try { wc.send(channel, payload); return true; } catch { return false; }
  }
);
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
// live OTel arrives.
const usageProvider: UsageProvider = telemetry;
// Grok agents are costed from a cumulative file snapshot (telemetry.ts
// `grokFallback`), so an idle one re-reads identical totals every beat. Their
// session id is real, so the liveness gate below cannot filter that — this
// does, by admitting a row only when the numbers move. Claude's live OTel path
// does not consult it.
const grokLedgerGate = new CumulativeSampleGate();
// Circuit breaker (Lane A #6.6b) — the REAL policy (replaces Lane C's interim
// glue). POLICY only; the heartbeat beat feeds it signals (via usageProvider) +
// enforces its decisions. Config read live so a settings change applies next beat.
const breaker = new CircuitBreaker(() => {
  const c = readConfig();
  return { ...(c.circuitBreaker ?? {}), costCapUsd: c.costCapUsd, costCapTokens: c.costCapTokens, agentTokenCaps: c.agentTokenCaps };
});
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
// v0.4.9 phase 2 (D4): the per agent activity digest. The HookServer feeds it
// every real hook boundary and the hive router feeds it outbox mail; each
// record is pushed live on hive:agentActivity and the ring is read back by the
// hive:agentActivity invoke, so a renderer reload keeps the morning.
const activity = new ActivityDigest(() => liveWebContents());
hive.setActivitySink((agentId, entry) => activity.record(agentId, entry));
// HookServer needs BOTH: Oscar's control registry (HITL pause/gate/steer/halt via
// hook returns) AND Jim's breaker (feed recordToolUse on each PostToolUse).
const hookServer = new HookServer(
  hive,
  () => liveWebContents(),
  () => readConfig(),
  control,
  breaker,
  standingGoalFromRoster,
  // I2 part 2: a hook event means the CLI is working, past any sign in, so
  // the watcher stops reading that agent's pty first (loginPastOnHook is
  // always true); the digest stays the last argument.
  (agentId, event, message, tool) => loginPastOnHook(agentId) && workerWake.noteHook(agentId, event, message, undefined, tool),
  activity
);
function loginPastOnHook(agentId: string | undefined): true {
  if (agentId) for (const [pty, a] of ptyToAgent) if (a === agentId) loginWatcher.pastLogin(pty);
  return true;
}
const memory = new MemoryManager(
  () => readConfig().harnessHome,
  () => { const c = readConfig(); return { enabled: c.semanticMemory !== false, model: c.embeddingModel ?? 'minilm' }; }
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
// Finishes the janitor's missing condense half: bounds each agent's memory.md
// (Haiku tail-summary, backup→verify→atomic-swap) so it never grows unbounded.
const reflector = new MemoryReflector(
  () => readConfig().harnessHome,
  () => readConfig().defaultCommand ?? 'claude',
  () => memory.env(),
  reflectSettings,
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
  const opts = { type: 'warning' as const, buttons: ['Go back', 'Lose the changes'], defaultId: 0, cancelId: 0, message: text.message, detail: text.detail };
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
  /** Why this worker is being torn down, set by the kill site right before it
   *  calls teardownPty. Unset means the PTY ended on its own (`exited`). */
  result?: WorkerResult;
}
/** Live ephemeral workers by id. Populated by the spawn-request watcher; consulted
 *  by teardownPty so a finished/crashed/reaped worker's worktree is PRESERVED (not
 *  force-removed) when it holds unintegrated work — god is the sole integrator. */
const liveWorkers = new Map<string, WorkerRec>();

/** The loopback secret broker (Phase 2). Workers reach registered integrations through
 *  it without ever seeing a credential. getRecord/getSecret are injected so the broker
 *  stays electron-free + unit-testable. Started in bootstrapHiveServices; each worker is
 *  granted a per-worker capability token at spawn (revoked in teardownPty). */
const integrationBroker = new IntegrationBroker({
  getRecord: integrations.getRecord,
  getSecret: integrations.getSecret
});

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
  // 0) Revoke this id's broker capability (if any). Idempotent + harmless for a
  //    non-worker PTY; ensures a dead worker's token can never reach an integration.
  try { integrationBroker.revoke(id); } catch { /* best-effort */ }
  // 1) Archive the agent — retained + flagged; only live-PTY agents are active.
  const agentId = ptyToAgent.get(id);
  if (agentId) {
    ptyToAgent.delete(id);
    // Drop watchdog state so a dead agent can't get nudged or leak its grace.
    try { workerWake.forget(agentId, id); } catch { /* best-effort */ }
    // Drop breaker state so a dead agent can't leak/zombie a tripped level.
    try { breaker.forget(agentId); } catch { /* best-effort */ }
    // A replacement using this id needs a new usage counter, not the dead PTY's.
    try { telemetry.forgetAgent(agentId); } catch { /* best-effort */ }
    // Same for its activity digest: a replacement's card must not open on the dead one's morning.
    try { activity.forget(agentId); } catch { /* best-effort */ }
    // Same reason, for the Grok ledger gate: a respawned agent's first sample
    // must be admitted rather than matched against the dead one's last row.
    try { grokLedgerGate.forget(agentId); } catch { /* best-effort */ }
    // W1 — kill this agent's proxy-bridge sidecar (qwen), if any, so a dead
    // PTY never leaves an orphan loopback listener. No-op for non-proxy agents.
    try { hive.stopProxyBridge(agentId); } catch (e) { console.error('[hive] stopProxyBridge failed:', e); }
    if (hive.enabled()) {
      try { hive.setArchived(agentId, true); } catch (e) { console.error('[hive] setArchived failed:', e); }
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
      // crash included, which deleted whatever it had not committed. A person
      // ending it still removes it. A process that ended on its own keeps a
      // dirty tree (shared/worktreeFate.ts, main/agentWorktree.ts).
      const base = worktreeBases.get(id) ?? 'main';
      if (!respawning) worktreeBases.delete(id);
      const finalizing = finalizeAgentWorktree(wtPath, origCwd, base, reason)
        .then((out) => {
          if (out.fate === 'remove-failed') { console.error('[worktree] removeWorktree failed:', out.detail); return; }
          if (out.fate !== 'kept' || respawning) return;
          console.warn(`[worktree] KEPT after the agent ended on its own, uncommitted work inside: ${wtPath} (${out.detail})`);
          informGod(
            `[agent worktree kept] ${agentId ?? id}`,
            `Agent ${agentId ?? id} ${reason === 'guardrail' ? 'was stopped by the circuit breaker' : reason === 'sweep' ? 'was closed with the rest of the floor' : 'ended on its own (crashed, was killed from outside, or quit)'} with UNCOMMITTED work in its worktree, so the folder was NOT removed.\n`
            + `Worktree: ${wtPath}\nBranch: ${out.branch ?? '(unknown)'}\nState: ${out.detail}\n`
            + `Restarting the agent brings it back in that folder. To discard it instead: git -C "${origCwd}" worktree remove --force "${wtPath}"`
          );
        })
        .catch(e => console.error('[worktree] finalizeAgentWorktree threw (worktree left in place):', e))
        .finally(() => { if (worktreeFinalizing.get(wtPath) === finalizing) worktreeFinalizing.delete(wtPath); });
      worktreeFinalizing.set(wtPath, finalizing);
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
function informGod(subject: string, body: string, slack?: { channel: string; thread_ts: string }): void {
  try {
    const slackLine = slack
      // The bundled-node launcher, spelled as an ABSOLUTE PATH — NOT bare `node`
      // (absent from the PATH of any machine whose node comes from nvm) and NOT
      // `$HIVE_NODE` (POSIX-only: cmd.exe/PowerShell expand it to nothing, so the
      // whole reply command was dead on Windows).
      ? `\n\n[SLACK] Close the loop — post a reply to channel ${slack.channel} thread ${slack.thread_ts} via:\n  "${hive.nodeCommand()}" "${slackReplyScriptPath()}" --channel ${slack.channel} --thread ${slack.thread_ts} --text "<your message>"`
      : '';
    hive.send({ to: 'god', act: 'inform', subject, body: body + slackLine }, 'temps');
  } catch (e) {
    console.error('[worker] informGod failed:', e);
  }
}

/** Gated worktree teardown for an ephemeral worker: remove it ONLY when it holds no
 *  unintegrated work; otherwise leave it (and its branch) in place and ping god, the
 *  sole integrator. Async + best-effort; on any uncertainty it KEEPS the worktree
 *  (fail-safe — never auto-discard possibly-valuable work). */
async function finalizeWorkerWorktree(wtPath: string, origCwd: string, worker: WorkerRec): Promise<void> {
  try {
    const deps = await unlinkWorktreeDeps(origCwd, wtPath);
    if (!deps.ok) console.error('[worktree] dependency unlink failed:', deps.error);
    const work = await worktreeHasUnintegratedWork(wtPath, worker.baseBranch);
    if (work.keep) {
      console.warn(`[worker] PRESERVING worktree with unintegrated work: ${wtPath} (${work.detail})`);
      // Track it so the GC sweep can reclaim it (+ scratch dir) once integrated —
      // the worker is gone from liveWorkers by now, so its identity lives here.
      preservedWorktrees.set(wtPath, {
        workerId: worker.workerId, wtPath, origCwd, baseBranch: worker.baseBranch,
        scratchDir: workerScratchDir(worker.workerId), slack: worker.slack, preservedAt: Date.now()
      });
      try { setWorkerHistoryWorktree(worker.workerId, 'preserved'); notifyWorkerHistoryUpdated(); } catch { /* ledger is best-effort */ }
      informGod(
        `[worker worktree preserved] ${worker.workerId}`,
        `Ephemeral worker ${worker.workerId} ended but its worktree holds unintegrated work, so it was NOT auto-removed (you are the sole integrator).\n`
        + `Worktree: ${wtPath}\nBranch: ${work.branch}\nState: ${work.detail}\n`
        + `Review/merge it — it will be auto-reclaimed once its work lands in ${worker.baseBranch}, or remove it now with: git -C "${origCwd}" worktree remove "${wtPath}"`,
        worker.slack
      );
      return;
    }
    const r = await removeWorktree(origCwd, wtPath);
    if (!r.ok) { console.error('[worker] removeWorktree failed:', r.error); return; }
    try { setWorkerHistoryWorktree(worker.workerId, 'removed'); notifyWorkerHistoryUpdated(); } catch { /* ledger is best-effort */ }
    // Worktree is gone (clean/integrated at teardown), but DEFER its scratch-dir
    // cleanup to the throttled GC sweep rather than deleting it synchronously here:
    // HIVE_ROOT/agents/<id> holds the worker's memory.md and the MemPalace miner
    // ingests it asynchronously, so an immediate delete can beat the miner and
    // permanently lose the worker's durable notes from the shared palace. Register
    // it (its worktree path is now absent) so the sweep's path-gone branch reclaims
    // the scratch after a window — same throttled path the preserved case uses.
    preservedWorktrees.set(wtPath, {
      workerId: worker.workerId, wtPath, origCwd, baseBranch: worker.baseBranch,
      scratchDir: workerScratchDir(worker.workerId), slack: worker.slack, preservedAt: Date.now()
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
    pendingInstallRelaunch.delete(id);
    // Activation funnel: did the auto-installer actually complete? A non-zero exit
    // is the Linux-installer-cannot-finish-unattended signal that used to be silent.
    const provider = pending.opts.provider ?? inferAgentProvider(pending.opts.command, undefined);
    // A zero exit is only half the proof: the binary must now resolve too (an
    // install into a prefix that is not on PATH, or a Windows installer whose
    // script cannot carry its exit code, both end at 0 with no CLI).
    // A native installer (kimi, grok) puts its binary in its own folder and
    // adds that to the rc files, which the PATH read at app start never saw:
    // look again from scratch before deciding (batch 4).
    if (exitCode === 0) ptyManager.forgetLookups();
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
  try {
    const goneAgent = ptyToAgent.get(id);
    // printMode: a clean exit of a print mode run is "Finished its task".
    if (goneAgent) liveWebContents()?.send('hive:agentExited', { agentId: goneAgent, exitCode, signal: info?.signal, ...(run?.printMode ? { printMode: true } : {}) });
  } catch { /* window torn down */ }
  try {
    const endedAgent = ptyToAgent.get(id);
    const startedAt = info?.startedAt;
    if (endedAgent && typeof startedAt === 'number') {
      const provider = inferAgentProvider(undefined, hive.registry().agents[endedAgent]?.provider);
      analytics.track('agent_run_ended', {
        provider,
        duration_bucket: runDurationBucket(Date.now() - startedAt),
        ended_reason: runEndReason(exitCode, info?.signal)
      });
    }
  } catch (e) { console.error('[pty] agent_run_ended failed:', e); }
  // The ONE caller where nobody chose this: the process ended on its own. A
  // run offered the sign in panel is about to start again in the same folder,
  // so its worktree is kept and still tracked, as for a revive.
  if (signInOffer) teardownPty(id, 'revive');
  else teardownPty(id, 'exit');
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

/** A mission's live scheduler handles: the initial `setTimeout` that waits out
 *  the time remaining until its next due fire, and the steady `setInterval`
 *  armed once it has fired. Both are tracked so shutdown can clear whichever is
 *  pending. */
interface MissionTimer {
  timeout?: NodeJS.Timeout;
  interval?: NodeJS.Timeout;
}

/** Active scheduler timers keyed by mission id. */
const missionTimers = new Map<string, MissionTimer>();

/** Clear and forget every armed mission timer (both the setTimeout and the
 *  setInterval handle). Safe to call from syncMissions and from shutdown
 *  teardown so a tick never fires into half-torn-down services. */
function clearMissionTimers(): void {
  for (const t of missionTimers.values()) {
    if (t.timeout) clearTimeout(t.timeout);
    if (t.interval) clearInterval(t.interval);
  }
  missionTimers.clear();
}

/** Rebuild the scheduler from persisted config: clear every existing timer,
 *  then arm each enabled mission honoring its lastFiredAt — a setTimeout for the
 *  time remaining until its next due fire, which then settles into a steady
 *  interval. Each tick dispatches the mission to its target agent and stamps
 *  lastFiredAt back into config. Called on boot (after the router starts) and
 *  after every missions:save. */
function syncMissions(): void {
  clearMissionTimers();
  const missions = readConfig().missions ?? [];
  for (const m of missions) {
    if (!m.enabled) continue;
    // A weekly mission (day-of-week + time) is armed below and does NOT need an
    // interval, so the interval guard has to come after that branch — it used to
    // be folded into the line above and would have rejected every one of them.
    const weekly = m.kind === 'heartbeat' ? null : normalizeWeekly(m.weekly);
    if (!weekly && !(m.intervalMs > 0)) continue;
    // Heartbeat (Lane A #1) opts out of the fixed setInterval and self-reschedules
    // with an adaptive cadence. Registered into the same missionTimers map so
    // clearMissionTimers() tears it down identically on quit/reset.
    if (m.kind === 'heartbeat') { armHeartbeat(m); continue; }
    const fire = (): void => {
      try {
        // A 'compact' maintenance mission (maint-1) is compaction-ONLY: it carries
        // no dispatch body/target, so skip the hive.send and just fire auto-compact.
        // Gate on `kind!=='compact'` ALONE — that already excludes the compact mission;
        // we deliberately do NOT add `&& m.body`, so other (dispatch) missions keep
        // their prior behaviour, including the historical empty-body send (Pam N1).
        if (m.kind !== 'compact' && hive.enabled()) {
          hive.send({ to: m.to, act: 'request', subject: m.label, body: m.body }, 'scheduler');
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
    };
    const entry: MissionTimer = {};
    if (weekly) {
      // Weekly self-reschedules: there is no steady interval to settle into,
      // because the gap between two slots varies (Fri to Mon is not Mon to Wed,
      // and the week the clocks change is not 168 hours long).
      //
      // `justFired` is a spin guard, not a nicety. weeklyDelayMs returns 0 for a
      // slot that was missed and not yet run, and it learns "already run" from
      // the persisted lastFiredAt — so if fire()'s writeConfig ever failed, the
      // next computation would return 0 again, forever. Passing `now` as the
      // last-fired floor after a fire makes the catch-up branch unreachable, so
      // the worst case is a lost stamp rather than a hot loop.
      const rearm = (justFired: boolean): void => {
        const now = Date.now();
        const persisted = (readConfig().missions ?? []).find((x) => x.id === m.id)?.lastFiredAt ?? 0;
        const delay = weeklyDelayMs(weekly, now, justFired ? Math.max(persisted, now) : persisted);
        if (delay === null) return;
        entry.timeout = setTimeout(() => { fire(); rearm(true); }, delay);
      };
      rearm(false);
      missionTimers.set(m.id, entry);
      continue;
    }
    // Honor lastFiredAt so a partially-elapsed interval is not restarted from
    // zero on reboot or when an unrelated mission is edited: wait only the time
    // remaining until the next due fire, then settle into a steady interval.
    const remaining = Math.max(0, m.intervalMs - (Date.now() - (m.lastFiredAt ?? 0)));
    entry.timeout = setTimeout(() => {
      fire();
      entry.interval = setInterval(fire, m.intervalMs);
    }, remaining);
    missionTimers.set(m.id, entry);
  }
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

/** Timers for the two halves, keyed by action. Same two-phase shape as
 *  `missionTimers` (a setTimeout for the remaining time, then a steady interval)
 *  so a partially-elapsed cadence survives a re-arm. */
const contextTimers = new Map<'compact' | 'clear', MissionTimer>();

/** `ContextRule` has no `lastFiredAt` (unlike `ScheduledMission`), so the last-run
 *  instants live in the durable kv store instead. Without them every re-arm —
 *  boot, a settings edit, a wake from sleep — would restart a 2h cadence from
 *  zero, and an operator who edits the rule twice a day would never see it fire. */
const CONTEXT_LAST_RUN_KV_KEY = 'triggers.context.lastRun';
let contextLastRun: Record<string, number> | null = null;

function contextRunMap(): Record<string, number> {
  if (!contextLastRun) {
    try { contextLastRun = persist.getKv<Record<string, number>>(CONTEXT_LAST_RUN_KV_KEY) ?? {}; }
    catch { contextLastRun = {}; }
  }
  return contextLastRun;
}

/** When the rule last ran. An UNRECORDED half is stamped NOW rather than read as
 *  the epoch: `remaining` would otherwise clamp to 0 and compact every terminal
 *  the instant the app boots. It is the same trap `ensureDefaultMissions` avoids
 *  by stamping `lastFiredAt` when it seeds a mission — a first launch should wait
 *  a full cadence, not open with an interruption. */
function contextLastRunAt(action: 'compact' | 'clear'): number {
  const map = contextRunMap();
  const v = map[action];
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  return stampContextRun(action);
}

function stampContextRun(action: 'compact' | 'clear'): number {
  const map = contextRunMap();
  const at = Date.now();
  map[action] = at;
  try { persist.setKv(CONTEXT_LAST_RUN_KV_KEY, map); } catch { /* DB best-effort */ }
  return at;
}

/** The live rule for one half, deep-filled. `readConfig` already fills both
 *  halves, so the default is only a belt-and-braces fallback. */
function contextRule(action: 'compact' | 'clear'): ContextRule {
  return readConfig().contextTrigger?.[action] ?? DEFAULT_CONTEXT_TRIGGER[action];
}

/** Clear and forget both context timers (setTimeout + setInterval handles). */
function clearContextTimers(): void {
  for (const t of contextTimers.values()) {
    if (t.timeout) clearTimeout(t.timeout);
    if (t.interval) clearInterval(t.interval);
  }
  contextTimers.clear();
}

/** Ask the renderer to run one half of the context trigger.
 *
 *  Both callers funnel through here — the legacy per-mission `autoCompact` flag
 *  and the context trigger's own timer — so there is exactly one path from main
 *  to the renderer for each action. */
function emitContextTrigger(action: 'compact' | 'clear', rule: ContextRule): void {
  try { liveWebContents()?.send('trigger:context', { action, rule }); } catch { /* window gone */ }
  // TRANSITIONAL ALIAS: the renderer still carries the pre-Triggers
  // `mission:autoCompact` listener as a fallback. Both fire for compact until
  // every consumer has moved to `trigger:context`; then this line goes.
  if (action === 'compact') {
    try { liveWebContents()?.send('mission:autoCompact'); } catch { /* window gone */ }
  }
}

/** (Re)arm both context timers from persisted config. Clear-then-arm, so calling
 *  it after a settings change, on boot, or on wake from sleep can never stack
 *  duplicates. Honors elapsed-time-since-last-run exactly like mission arming:
 *  an overdue rule fires ONCE and then settles into its steady cadence. */
function syncContextTriggers(): void {
  clearContextTimers();
  for (const action of ['compact', 'clear'] as const) {
    const rule = contextRule(action);
    if (!rule.enabled || !(rule.everyMs > 0)) continue;
    const fire = (): void => {
      try {
        stampContextRun(action);
        // Re-read: the operator may have edited the message/thresholds since the
        // timer was armed, and the renderer should act on what's current.
        emitContextTrigger(action, contextRule(action));
      } catch (e) {
        console.error('[triggers] context', action, e);
      }
    };
    const remaining = Math.max(0, rule.everyMs - (Date.now() - contextLastRunAt(action)));
    const entry: MissionTimer = {};
    entry.timeout = setTimeout(() => {
      fire();
      entry.interval = setInterval(fire, rule.everyMs);
    }, remaining);
    contextTimers.set(action, entry);
  }
}

/** Startup migration (#57/#58): archive every agent entry that is `archived:false`
 *  but has NO live PTY. This runs in bootstrapHiveServices, BEFORE the renderer can
 *  respawn anything, so at this point NO agent owns a PTY — every `archived:false`
 *  entry is therefore a stale carry-over from a prior session that quit/crashed
 *  WITHOUT archiving (e.g. the pre-acc13a3 'assistant' Dwight entry). Left as-is
 *  they have no live PTY, so the breaker beat steers them and the steer bounces to
 *  GOD as a requires_reply GOD can't clear → inbox flood.
 *
 *  "No live PTY" = ptyForAgent(id) === undefined (ptyToAgent is populated only at
 *  spawn and pruned on teardown). God is never archived. A user's real agents are
 *  unaffected: the "restore team" flow respawns them through ensureAgent, which
 *  re-clears `archived` — restorability does not depend on the archived flag. */
function archiveOrphanedAgents(): void {
  if (!hive.enabled()) return;
  try {
    const reg = hive.registry();
    for (const [id, a] of Object.entries(reg.agents)) {
      if (a.archived) continue;
      if (id === reg.godId) continue;        // god is never archived
      if (ptyForAgent(id)) continue;         // has a live PTY → genuinely active
      hive.setArchived(id, true);            // stale archived:false orphan → archive
      console.log('[migration] archived orphaned agent (no live PTY):', id);
    }
  } catch (e) {
    console.error('[migration] archiveOrphanedAgents failed:', e);
  }
}

/** One-time migration: ensure the built-in hourly ops standup exists for installs
 *  that predate it. Guarded by `opsStandupSeeded` so a user who later deletes the
 *  mission doesn't get it re-added on every boot. Stamps lastFiredAt = now so the
 *  first standup waits a full interval instead of firing (and compacting every
 *  terminal) immediately on launch. */
function ensureDefaultMissions(): void {
  const cfg = readConfig();
  if (!cfg.opsStandupSeeded) {
    const missions = cfg.missions ?? [];
    const has = missions.some((m) => m.id === OPS_STANDUP_MISSION.id);
    writeConfig({
      missions: has ? missions : [...missions, { ...OPS_STANDUP_MISSION, lastFiredAt: Date.now() }],
      opsStandupSeeded: true
    });
  }
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
      const map = contextRunMap();
      map.compact = retiring.lastFiredAt;
      try { persist.setKv(CONTEXT_LAST_RUN_KV_KEY, map); } catch { /* DB best-effort */ }
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
    if (a.archived || id === reg.godId) continue;
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
  const active = Object.entries(reg.agents).filter(([id, a]) => !a.archived && id !== reg.godId);
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
    return hive.inbox(godId).filter((m) => !SYSTEM_SENDERS.has(m.from)).length;
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

/** One circuit-breaker beat: pull a fresh usage sample per active agent, append
 *  it to the durable cost ledger (the SOLE durable cost store), tick the breaker,
 *  emit each BreakerState on control:breakerState (Seam 2), and enforce any
 *  escalation. God is in the LEDGER (cost visibility) but NOT the breaker inputs
 *  (the heartbeat manages god; we never auto-steer/kill the orchestrator). */
function runBreakerBeat(progressWindowMs: number): void {
  if (!hive.enabled()) return;
  const reg = hive.registry();
  const now = Date.now();
  const inputs: BreakerInput[] = [];
  for (const [id, a] of Object.entries(reg.agents)) {
    if (a.archived) continue;
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
      // A Grok sample's session id is always truthy, so for that provider #56's
      // duplicate-row risk moves from "is there a live session" to "did anything
      // change". Short-circuits before the gate for everyone else, leaving the
      // live-OTel path exactly as it was.
      const moved = a.provider !== 'grok' || grokLedgerGate.admits(sample);
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

/** Build + write the live fleet snapshot Michael reads (`<hive>/fleet.json`).
 *  Always-on (independent of the heartbeat) since `claude agents` can't see the
 *  hive's sibling sessions. PII-free; never throws (called from a timer). */
function writeFleetSnapshot(): void {
  if (!hive.enabled()) return;
  try {
    const reg = hive.registry();
    const snap = telemetry.snapshot();
    const usageById = new Map(snap.usage.map((u) => [u.agentId, u]));
    const now = Date.now();
    // Async + incremental; returns immediately and never throws into the timer.
    const hiveRoot = hive.root();
    if (hiveRoot) void costTotals.refresh(join(hiveRoot, 'cost-ledger.jsonl'));
    const agents = Object.entries(reg.agents)
      .filter(([, a]) => !a.archived)
      .map(([id, a]) => {
        const u = usageById.get(id);
        const spans = snap.spans[id] ?? [];
        const tokens = u ? u.input + u.output + u.cacheRead + u.cacheCreation : 0;
        // `usd` is LIFETIME (reset-corrected). Until the first fold completes we
        // fall back to the session figure rather than publishing a cold $0.
        const lifetime = costTotals.usdFor(id);
        const sessionUsd = u ? Number(u.usd.toFixed(4)) : 0;
        return {
          id,
          name: a.name,
          role: a.role ?? (a.isGod ? 'orchestrator' : 'agent'),
          cwd: a.cwd,
          isGod: !!a.isGod,
          breaker: breaker.levelFor(id),
          tokens,
          usd: lifetime === null ? sessionUsd : Number(lifetime.toFixed(4)),
          sessionUsd,
          lastTool: spans.length ? spans[spans.length - 1].tool : null,
          lastActiveSecAgo: u ? Math.round((now - u.ts) / 1000) : null,
          inboxBacklog: hive.inboxBacklog(id),
          onHold: !!a.onHold
        };
      });
    hive.writeFleetSnapshot({ ts: now, agents });
  } catch (e) {
    console.error('[fleet] snapshot failed:', e);
  }
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
let slackPoller: SlackPoller | null = null;
let slackSocket: SlackSocketClient | null = null;

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
function buildAutonomousRequestProtocol(channel: string, threadTs: string, helperPath: string, reader: 'god' | 'temp' = 'god'): string {
  // The bundled Node, spelled as an absolute path: bare "node" is not on the
  // hook or agent PATH on many machines, and $VAR forms are dead on Windows.
  const reply = `"${hive.nodeCommand()}" "${helperPath}" --channel ${channel} --thread ${threadTs} --text "<your reply>"`;
  const verbatim = '(that first path is the harness\'s bundled Node, already resolved for this machine; pass it verbatim)';
  const pause = 'Pause only for a high severity action: pushing to main or any remote, buying or provisioning anything paid, deleting a repo, file or folder you did not create.';
  const mrkdwn = 'A reply is Slack mrkdwn with substance: a short *bold* headline plus the outcome, specifics and links, never a bare "done".';
  if (reader === 'temp') {
    return `[SLACK JOB] You are a temp. This job arrived from Slack and no human is watching in the app.
1. Do it autonomously; no interactive questions. ${pause}
2. When done, post your result to the thread yourself with exactly: ${reply} ${verbatim}. ${mrkdwn}
3. Then send god ONE outbox message with "act":"done" and a short summary; that releases you.
4. If you need a decision, post the question with numbered options to the thread via that command and record {q, options, askedAt (ISO), thread_ts ${threadTs}}; god picks up the human's threaded reply.
The job: `;
  }
  return `[SLACK REQUEST] This arrived from Slack and no human is watching in the app.
1. ROUTE FAST. Check the live roster (registry.json, fleet.json) and hand it to the one agent that fits, above all the one it names ("ask Pam..."); start a temp only if nobody fits. Split it only if it truly needs several people. Do not sit on it.
2. DELEGATE WITH THE REPLY COMMAND. Tell that agent to do the work autonomously and to post its own result to this thread with exactly: ${reply} ${verbatim}.
3. NO INTERACTIVE QUESTIONS. ${pause}
4. ${mrkdwn}
5. The agent reports back to you when done.
6. If a decision is needed, do not block: post the question with numbered options to the thread via that command and record {q, options, askedAt (ISO), thread_ts ${threadTs}} so the human's threaded reply resumes it.
The message: `;
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

/** W3 — the bundled read-only `skills/` source dir copied into each agent's
 *  `.claude/skills/` at spawn. Same packaged/dev resolution as the helpers above.
 *  Tolerated-missing until lp-manifest (Kevin) populates it (the hive copy is a
 *  no-op on an absent dir). */
function skillsResourceDir(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'skills')
    : join(app.getAppPath(), 'resources', 'skills');
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

/** Per-file download size cap — reject files larger than 10 MB before writing. */
const SLACK_FILE_MAX_BYTES = 10 * 1024 * 1024;

/** Sanitize a Slack filename: keep only the basename, replace non-safe chars,
 *  prefix with a random hex tag to prevent collisions and path-traversal attacks. */
function sanitizeSlackFilename(name: string | undefined, tag: string): string {
  const safe = (typeof name === 'string' && name)
    ? basename(name).replace(/[^\w.\-]/g, '_').replace(/^\.+/, '_').slice(0, 200) || 'file'
    : 'file';
  return `${tag}-${safe}`;
}

/**
 * Download a single Slack private file into slackFilesDir() using the bot token.
 * Returns the local path on success, null on any failure (size limit, network, etc.).
 * The bot token is used only in the Authorization header and is NEVER logged.
 */
function downloadSlackFile(
  file: SlackEventFile,
  botToken: string,
  destDir: string
): Promise<{ path: string; name: string; mimetype: string } | null> {
  return new Promise((resolve) => {
    const tag = randomBytes(4).toString('hex');
    const filename = sanitizeSlackFilename(file.name, tag);
    const destPath = join(destDir, filename);
    const name = file.name ?? filename;
    const mimetype = file.mimetype ?? 'application/octet-stream';

    try {
      mkdirSync(destDir, { recursive: true });
    } catch {
      resolve(null);
      return;
    }

    let urlObj: URL;
    try {
      urlObj = new URL(file.url_private);
    } catch {
      resolve(null);
      return;
    }
    if (urlObj.protocol !== 'https:') { resolve(null); return; }

    const req = httpsRequest(
      { hostname: urlObj.hostname, path: urlObj.pathname + urlObj.search, method: 'GET',
        headers: { authorization: `Bearer ${botToken}` } },
      (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          res.resume(); // drain response body
          resolve(null);
          return;
        }
        let written = 0;
        let aborted = false;
        const stream = createWriteStream(destPath);
        res.on('data', (chunk: Buffer) => {
          if (aborted) return;
          written += chunk.length;
          if (written > SLACK_FILE_MAX_BYTES) {
            aborted = true;
            stream.destroy();
            try { unlinkSync(destPath); } catch { /* best-effort cleanup */ }
            res.destroy();
            resolve(null);
            return;
          }
          stream.write(chunk);
        });
        res.on('end', () => {
          if (aborted) return;
          stream.end(() => resolve({ path: destPath, name, mimetype }));
        });
        res.on('error', () => { stream.destroy(); resolve(null); });
        stream.on('error', () => { res.destroy(); resolve(null); });
      }
    );
    req.on('error', () => resolve(null));
    req.end();
  });
}

/**
 * Download all raw Slack files (up to cap) and return the local-path file list.
 * Failures are silently dropped — a partial list is still useful to the agent.
 */
async function downloadSlackFiles(
  rawFiles: SlackEventFile[],
  botToken: string | undefined
): Promise<{ path: string; name: string; mimetype: string }[]> {
  if (!rawFiles.length || !botToken) return [];
  const destDir = slackFilesDir();
  const results = await Promise.all(
    rawFiles.map((f) => downloadSlackFile(f, botToken, destDir))
  );
  return results.filter((r): r is { path: string; name: string; mimetype: string } => r !== null);
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
    channelId: cfg.slackChannelId,
    // Fires from the HTTP server's event loop (not the IPC thread); route through
    // liveWebContents() so a message arriving during window teardown can't throw.
    // Downloads any file attachments (bot token stays in main; local paths go to IPC).
    // 0.4.11: the webhook is one of three ways in, and all three land on the
    // same door, which hands the request to a temp instead of Michael's queue.
    onMessage: (m) => onSlackTransportMessage(m)
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
    onReplied: (thread_ts) => { directlyRepliedThreads.add(thread_ts); }
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
// config.responder, @shared/responder), shared with the teammate channel: the
// orchestrator unless the person pointed it at an agent that is running. The
// 0.4.11 temps route (a temp hired per request, slackInbound.ts) no longer
// has a branch choosing it; the module stays for a later ruling.

/** Where the poller keeps its cursor and hot threads. Under userData, never in
 *  the hive repo, never a token. Shared by the polling and the socket way. */
function slackPollStatePath(): string {
  return join(app.getPath('userData'), 'slack-poll.json');
}

/** The gated "received" post, the same words on both routes. */
const SLACK_RECEIVED_TEXT = ':hourglass_flowing_sand: *Received.* The office is on it and will reply here when done.';

/** The one door: attachments down, ledger row, then whoever handles it. */
async function onSlackTransportMessage(m: SlackInboundMessage): Promise<void> {
  const localFiles = await downloadSlackFiles(m._rawFiles ?? [], readConfig().slackBotToken);
  appendSlackHistory({ direction: 'inbound', channel: m.channel, thread_ts: m.thread_ts, text: m.text, ok: true });
  notifySlackHistoryUpdated();
  // ONE route (0.5.2, founder ruling, Option A). The text lands in the
  // renderer's queue with the autonomous request protocol ahead of it and the
  // card gets the thread, exactly as the orchestrator's route always did. WHO
  // takes it is the responder setting, sent along as the configured id: the
  // renderer resolves it against the agents that are actually running and
  // falls back to the orchestrator (@shared/responder), the same rule the
  // teams bridge applies to a teammate's message. The gated "received" post
  // is main's.
  const cfg = readConfig();
  const ipcMsg: { text: string; channel: string; ts: string; thread_ts: string; responder: string; autonomyPreamble: string; files?: typeof localFiles } = {
    text: m.text, channel: m.channel, ts: m.ts, thread_ts: m.thread_ts,
    responder: cfg.responder ?? '',
    autonomyPreamble: buildAutonomousRequestProtocol(m.channel, m.thread_ts, slackReplyScriptPath())
  };
  if (localFiles.length > 0) ipcMsg.files = localFiles;
  try { liveWebContents()?.send('slack:incomingMessage', ipcMsg); } catch { /* window torn down */ }
  if (cfg.slackProactivePosting && cfg.slackBotToken) {
    void postSlackReply({ botToken: cfg.slackBotToken, channel: m.channel, thread_ts: m.thread_ts, text: SLACK_RECEIVED_TEXT });
  }
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
      if (a.isGod || a.archived || !a.cwd || !existsSync(a.cwd)) continue;
      return a.cwd;
    }
  } catch { /* no registry yet */ }
  return cfg.harnessHome && existsSync(cfg.harnessHome) ? cfg.harnessHome : app.getPath('home');
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
    tempCwd: resolveSlackTempCwd,
    replyCommand: (channel, thread_ts) =>
      `"${hive.nodeCommand()}" "${slackReplyScriptPath()}" --channel ${channel} --thread ${thread_ts} --text "<substantive result>"`,
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
  if (!cfg.slackChannelId?.trim()) return { mode, error: 'missing channel' };
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

/** Start the chosen way, and only it. Whatever was running stops first. */
async function startSlackIngestion(): Promise<{ ok: boolean; url?: string; error?: string }> {
  const cfg = readConfig();
  const ready = slackReadiness(cfg);
  slackLog('start-attempt', { mode: ready.mode });
  if (ready.error) {
    // The silent path that cost the founder his morning: enabled, tokens
    // saved, and the one missing field refused here without a word.
    slackLog('refused', { mode: ready.mode, error: ready.error });
    return { ok: false, error: ready.error };
  }
  stopSlackIngestion();
  if (ready.mode === 'webhook') {
    const r = await startSlackServer();
    slackLog(r.ok ? 'started' : 'failed', { mode: ready.mode, ...(r.ok ? {} : { error: r.error ?? 'unknown' }) });
    return r;
  }
  const common = {
    botToken: cfg.slackBotToken as string,
    // Optional now: readiness only insists on a channel for polling, so this
    // can legitimately be empty on the socket. Do not assert the string.
    channelId: (cfg.slackChannelId ?? '').trim(),
    stateFile: slackPollStatePath(),
    onMessage: onSlackTransportMessage,
    // The transports speak on failures, stops and rate limits, not per poll,
    // so mirroring them into log.jsonl is cheap and makes a dying bridge
    // visible after the fact.
    log: (line: string) => slackLog('transport', { line })
  };
  let res: { ok: boolean; error?: string };
  if (ready.mode === 'polling') {
    slackPoller = new SlackPoller({ ...common, intervalMs: resolvePollSeconds(cfg.slackPollSeconds) * 1000 });
    res = await slackPoller.start();
    if (!res.ok) { slackPoller.stop(); slackPoller = null; slackLog('failed', { mode: ready.mode, error: res.error ?? 'unknown' }); return res; }
  } else {
    slackSocket = new SlackSocketClient({ ...common, appToken: cfg.slackAppToken as string, catchupMs: resolveCatchupSeconds(cfg.slackSocketCatchupSeconds) * 1000 });
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

/** Stop every way. Safe when nothing runs. */
function stopSlackIngestion(): void {
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
    return { running: s.running, mode, team: s.team, botName: s.botName, socketConnectedAt: s.connected ? s.connectedAt : undefined, lastCatchupAt: s.lastCatchupAt, lastError: s.lastError, hotThreads: s.hotThreads, tempsLive };
  }
  // Nothing runs: say WHY it cannot start, so a surface drawing this status
  // can name the missing field instead of a silent Off (the founder's morning,
  // 6 Sep 2026: enabled with no channel looked exactly like healthy-but-quiet).
  return { running: slackServer != null, mode, url: lastSlackUrl, ...(slackServer?.boundPort() ?? {}), tempsLive, configError: slackReadiness(cfg).error };
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
  const to = arg.origin === 'webhook'
    ? resolveWebhookRecipient(arg.to, readConfig().webhookResponder, selectBroadcastTargets(hive.registry().agents, ''), 'god')
    : 'god';
  try {
    const card: HiveTask = {
      id: arg.taskId,
      title: arg.title,
      description: arg.message,
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
  try {
    hive.send({
      to,
      act: 'request',
      subject: `[${arg.origin}] ${arg.title}`,
      body: webhookBriefing({ message: arg.message, taskId: arg.taskId, origin: arg.origin, prompt: arg.prompt, guardrails: arg.guardrails }),
      requires_reply: false
    }, 'webhook');
  } catch (e) {
    console.error('[webhook] could not route to god:', e instanceof Error ? e.message : e);
  }
  return true;
}

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
    return { token, pending: true };
  }

  const taskId = `webhook-${randomBytes(8).toString('hex')}`;
  if (!dispatchWebhookWork({ taskId, title, message: msg.message, tokenHash, origin: 'webhook', prompt: trigger?.prompt, guardrails: trigger?.guardrails, to: trigger?.to })) return null;
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
    lookupStatus: lookupWebhookStatus
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

/**
 * Every `munderdifflin://` link lands here and is dispatched by action. Teams
 * first: `teams/enrol?grant=&state=` is the browser coming back from the Clerk
 * sign-in (plan 2.2), and it is accepted only against the `state` this app
 * minted, so a page cannot push a grant into an app that never asked. A cold
 * start with a teams link has no sign-in pending and is refused for that
 * reason; the refusal is logged, never rendered, because there is no screen
 * waiting for it.
 */
function handleDeepLink(link: string): void {
  const teams = parseTeamsDeepLink(link);
  if (teams) {
    const r = teamsEnrol.receiveGrant({ grant: teams.grant, state: teams.state }, 'link');
    if (!r.ok) console.warn('[teams] deep link refused:', r.detail);
    return;
  }
  // The free door (5 Sep 2026): its own route and its own pending state, so a
  // crafted link cannot steer one flow into the other. shared/freeTier.ts.
  const free = parseFreeDeepLink(link);
  if (free) {
    const r = freeAccount.receiveFreeGrant({ grant: free.grant, state: free.state }, 'link');
    if (!r.ok) console.warn('[free] deep link refused:', r.detail);
    return;
  }
  /* The claim's refusal, in the funnel's own vocabulary (0.5.0 spec §2).
     `offline` and `unavailable` are both "we never reached the route", which
     is `network`; the rest are server-side conditions with no closer word than
     `other`, and `other` existing is what keeps this total without ever
     needing a free-form sentence. `entitlement_inactive` and `unauthorized`
     never reach here — both are handled as outcomes above, not as failures. */
  const checkoutReasonOf = (e: proCheckoutShared.ProClaimError): CheckoutReason =>
    (e === 'offline' || e === 'unavailable') ? 'network' : 'other';

  // The paywall's return (item 2, contract agreed with Kevin 7 Sep 2026):
  // its own route again, so no crafted link can steer the checkout answer
  // into the enrol or the free parser. shared/proCheckout.ts.
  const checkout = parseProCheckoutDeepLink(link);
  if (checkout) {
    const r = proCheckout.receiveCheckoutReturn(checkout.grant, checkout.state);
    if (!r.ok) {
      console.warn('[pro] checkout deep link refused:', r.reason);
      for (const w of BrowserWindow.getAllWindows()) {
        w.webContents.send('pro:checkout:return', { ok: false, reason: r.reason });
      }
      return;
    }
    // The state is ours and it held. Spend the grant, then redeem the key it
    // answers with. `claimAndRedeem` never hands the key back here; the
    // renderer is told the OUTCOME, not the credential.
    void proCheckout.claimAndRedeem(r.grant).then((out) => {
      /* `checkout_finished` + `licence_activated` (0.5.0 funnel). This is the
         one place the app learns how a checkout ended, so it is the only place
         either can be fired honestly. Three shapes, and the middle one is the
         reason this is not a two-way branch:

          - redeemed        → succeeded, and the licence is live: both events.
          - entitlement_inactive → the grant is good and there is no licence
            behind it, which IS the person backing out of the browser without
            paying. That is `abandoned` / `user_cancelled`, NOT a failure: a
            failed purchase and a declined purchase are different questions and
            counting them together answers neither.
          - unauthorized    → the grant is spent, which is what a SECOND deep
            link looks like once the first one worked (Kevin's rule). Firing
            anything here would invent a failure for every person who clicks
            the same link twice, so this branch reports nothing at all. */
      if (out.ok && out.redeemed.ok) {
        /* No `reason` on a success: the property answers "why not", and a
           success carrying `other` would put a reason on every row and make
           the failure breakdown useless to group by. */
        analytics.trackFunnel('checkout_finished', {
          plan: 'pro', outcome: 'succeeded'
        });
        /* `period` (0.5.1) comes from the claim answer, the one honest source:
           the browser owned the choice after the handoff, and the licence this
           machine just claimed knows what it is billed by. A console that omits
           the field leaves the property absent; nothing is guessed. */
        analytics.trackFunnel('licence_activated', {
          plan: 'pro', source: 'checkout', ...(out.period ? { period: out.period } : {})
        });
      } else if (!out.ok && out.claim.error === 'entitlement_inactive') {
        analytics.trackFunnel('checkout_finished', {
          plan: 'pro', outcome: 'abandoned', reason: 'user_cancelled'
        });
      } else if (out.ok || out.claim.error !== 'unauthorized') {
        analytics.trackFunnel('checkout_finished', {
          plan: 'pro', outcome: 'failed',
          reason: out.ok ? 'other' : checkoutReasonOf(out.claim.error)
        });
      }
      const payload = out.ok && out.redeemed.ok
        ? { ok: true as const }
        // Kevin's rule: `unauthorized` is what a SECOND deep link looks like
        // once the grant is spent, so a recoverable refusal must read as
        // "finish with your key", never as a failure to somebody who has just
        // paid. `unavailable` covers the endpoint not existing yet.
        : {
          ok: false as const,
          reason: out.ok ? 'redeem-failed' as const : out.claim.error,
          recoverable: out.ok ? true : proCheckoutShared.claimIsRecoverable(out.claim.error)
        };
      for (const w of BrowserWindow.getAllWindows()) {
        w.webContents.send('pro:checkout:return', payload);
      }
    });
    return;
  }
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
} else {
  app.on('second-instance', (_evt, argv) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    const link = argv.find((a) => a.startsWith('munderdifflin://'));
    if (link) handleDeepLink(link);
  });
}

app.on('open-url', (evt, url) => {
  evt.preventDefault();
  handleDeepLink(url);
});

// IPC: the renderer signals readiness and PULLS anything queued (deep links
// that arrived before the window/subscription existed, incl. cold starts).
// ─── Teams: device identity ────────────────────────────────────────────────
// The public half only. There is deliberately no handler that returns the
// secret key: it stays in this process, encrypted at rest by the OS.
//
// None of these run at boot. A solo install reaches `has` at most, which does
// not generate anything, so 9,187 accountless installs never meet a keypair.

ipcMain.handle('teams:identity:has', () => deviceIdentity.hasIdentity());

/* The roster, already joined with this machine's local trust pins and youAllow
   overrides. The renderer never sees the raw relay shape, so it cannot
   accidentally read `verified` off the wire — there is nothing on the wire to
   read. Returns a REFUSAL rather than throwing, so D7 can render the reason. */
ipcMain.handle('teams:roster', async () => {
  if (!deviceIdentity.hasIdentity()) {
    return { ok: false, error: 'not_enrolled', detail: null };
  }
  return teamRoster();
});

/** A human confirmed a key out of band. The only path to `verified: true`.
 *  Anything the bridge held for D13 is offered again against the new pin. */
ipcMain.handle('teams:verify', (_e, deviceId: string, fingerprint: string) => {
  markVerified(deviceId, fingerprint);
  void teamsBridge.retryHeld();
  return { ok: true };
});

/** Your personal override for one teammate. Local only, never sent. */
ipcMain.handle('teams:setYouAllow', (_e, memberId: string, level: string | null) => {
  setYouAllow(memberId, level as never);
  return { ok: true };
});

/** This machine's default for everyone without an override; null follows the
 *  org default again. Local only, never sent: the message path reads it. */
ipcMain.handle('teams:setYouAllowDefault', (_e, level: string | null) => {
  setYouAllowDefault(level as never);
  return { ok: true };
});

/* `teams:identity:ensure` is GONE. It generated a key with no enrolment behind
   it, which was the fixture D3 ran on; the only path to a key now is a relay
   that accepted it (`teams:enrol` below), and a key without a membership is a
   machine the gate reads as solo. */

ipcMain.handle('teams:identity:forget', () => {
  deviceIdentity.forgetIdentity();
  forgetMembership();
  teamsGate.notify();
  return { ok: true };
});

/**
 * TEAM BACK TO INDIVIDUAL (founder, 6 Sep 2026, item 5).
 *
 * The teardown is `teams:identity:forget`'s, unchanged. What this adds is the
 * ONE CONDITION the founder put on the direction: it is allowed only when the
 * team has exactly one member, which is you. With teammates on the roster,
 * leaving is not a personal setting: their agents hold threads with yours,
 * their approvals point at your seat, and a machine that walked out on its own
 * would leave them talking to something that is gone.
 *
 * THE COUNT COMES FROM THE RELAY, NOT FROM DISK. `teamRoster()` already splits
 * self out of `teammates`, so "exactly one member" reads as an empty
 * teammates list. Asking the server rather than a cached file is the point:
 * this is the one moment where being wrong about who else is in the org does
 * real damage, and a stale local answer is exactly how you would be wrong.
 * A relay that cannot be reached refuses and says so, because "I could not
 * check" must never read as "there is nobody there".
 */
ipcMain.handle('teams:leave', async () => {
  if (!deviceIdentity.hasIdentity()) {
    // Already individual. Idempotent rather than an error: the caller wanted
    // to end up solo and it already is.
    return { ok: true, alreadySolo: true };
  }
  const roster = await teamRoster();
  if (!roster.ok) {
    return { ok: false, reason: 'unreachable', detail: roster.detail ?? null };
  }
  const others = roster.data.teammates.length;
  if (others > 0) {
    return { ok: false, reason: 'has-teammates', teammates: others };
  }
  deviceIdentity.forgetIdentity();
  forgetMembership();
  teamsGate.notify();
  return { ok: true, alreadySolo: false };
});

// ─── Teams: the gate and the join (plan sections 2.2, 4.1, 5) ──────────────
// The renderer reads `mode` once at mount and subscribes; main pushes on every
// change. Nothing here runs at boot: `mode()` is two file reads, and the solo
// path stops there.

ipcMain.handle('teams:mode', () => teamsGate.mode());

/** What the renderer may know about the membership. No key material. */
ipcMain.handle('teams:membership', () => {
  const m = readMembership();
  if (!m) return null;
  return {
    orgId: m.orgId, orgName: m.orgName, memberId: m.memberId, deviceId: m.deviceId,
    enrolledAt: m.enrolledAt, lastVerifiedAt: m.lastVerifiedAt,
    ...(m.bossNameNeeded ? { bossNameNeeded: true } : {}),
  };
});

/* ---- the solo licence bridge (SoloProBridge in @shared/soloPro) ----------
   The three doors the onboarding licence step reads off window.cth. Main owns
   the record and the round trip; the renderer never sees the endpoint. */
ipcMain.handle('solo:license', () => soloLicense.readLicense());
/* `licence_activated` (0.5.0 funnel) fires HERE and not inside redeemLicense,
   because the key and the checkout reach the same redemption by different
   doors and `source` is the whole point of the property. This door is a person
   typing a key they already hold. */
ipcMain.handle('solo:license:redeem', async (_e, key: unknown) => {
  const res = await soloLicense.redeemLicense(typeof key === 'string' ? key : '');
  if (res.ok) analytics.trackFunnel('licence_activated', { plan: 'pro', source: 'key_entry' });
  return res;
});
soloLicense.onLicenseChange((v) => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('solo:license', v);
});

/* The free door (5 Sep 2026). Main owns free.json and the sign-in round trip;
   the renderer sees the record, never the endpoint. shared/freeTier.ts. */
ipcMain.handle('free:account', () => freeAccount.readFreeAccount());
ipcMain.handle('free:signin:begin', () => freeAccount.beginFreeSignIn());
ipcMain.handle('free:signin:paste', (_e, pasted: unknown) =>
  freeAccount.receiveFreeGrant({ grant: typeof pasted === 'string' ? pasted : '' }, 'paste'));
ipcMain.handle('free:signin:cancel', () => { freeAccount.cancelFreeSignIn(); return { ok: true }; });
ipcMain.handle('free:register', () => freeAccount.registerFree());

/** Item 2: open the console's solo checkout with a fresh state. The browser
 *  already holds the session from step one, so nobody signs in twice; the app
 *  sends no identity of its own, on purpose. */
ipcMain.handle('pro:checkout:begin', async () => {
  const { url } = await proCheckout.beginProCheckout();
  /* `checkout_opened` (0.5.0 funnel) fires HERE rather than on the paywall's
     button, because this is the line that actually opened a checkout: the
     button also has a fallback path, and a click that opened nothing is not a
     started purchase. `seats_bucket` is '1' as a fact about this door — it is
     the solo PRO checkout, one machine, and the seat picker lives on the team
     side of the site. No `period` (0.5.1): the browser chooses it after this
     line, so the app could only ever have asserted a constant here. The
     licence the claim answers with carries it, on `licence_activated`. */
  analytics.trackFunnel('checkout_opened', { plan: 'pro', seats_bucket: '1' });
  return { ok: true as const, url };
});
/* Sign out (5 Sep 2026): this machine forgets the account it signed in with
   and any licence it holds, and both gates hear it. The way back in is the
   entry door; a key redeemed again simply rebinds. */
ipcMain.handle('free:signout', () => {
  freeAccount.cancelFreeSignIn();
  freeAccount.clearFreeAccount();
  soloLicense.forgetLicense();
  return { ok: true };
});
freeAccount.onFreeAccountChange((v) => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('free:account', v);
});

/**
 * 0.4.9 nickname (founder order, 3 Sep): ONE door names this machine's
 * orchestrator. It claims the word on the relay first, because uniqueness is
 * the org's to decide, and only a claim the relay accepted renames the agent
 * here. That ordering is the whole feature: a rename that skipped the relay
 * would put two Michaels back on one roster.
 *
 * Solo, or on a relay too old to know the route, or with the network down,
 * the rename still happens locally and the caller is told which of those it
 * was, so the UI can say whether teammates can see the name yet. A `conflict`
 * renames nothing: the word belongs to someone else.
 */
ipcMain.handle('teams:bossName:set', async (_e, raw: unknown) => {
  const parsed = validateBossName(String(raw ?? ''));
  if (!parsed.ok) return { ok: false as const, error: 'invalid' as const, detail: parsed.problem };
  const name = parsed.name;
  const local = (): { ok: true; name: string } | { ok: false; error: 'invalid'; detail: string } => {
    const r = hive.presetGodName(name);
    return r.ok ? { ok: true as const, name } : { ok: false as const, error: 'invalid' as const, detail: r.error ?? 'rename failed' };
  };

  if (!readMembership()) return local();

  const res = await patchMe({ bossName: name });
  if (res.ok) {
    setBossNameNeeded(false);
    return local();
  }
  if (res.error === 'conflict') return { ok: false as const, error: 'conflict' as const, detail: res.detail ?? null };
  // An older relay answers `not_found` for a route it does not have. That is
  // not a refusal of the name, so the machine keeps it and says so.
  if (res.error === 'not_found') return { ...local(), unsupported: true };
  return { ...local(), offline: true };
});

/**
 * 0.5.2: the PERSON's display name, set from the machine. Until now it was
 * whatever the console held, often nothing, and every surface fell back to
 * the machine's name. Unlike the nickname there is no local half: the name
 * lives on the relay and nowhere else, so a refusal or an outage saves
 * nothing here and says so. '' or null clears it. `unsupported` is a relay
 * that has the route but not the field (`invalid_body` naming `name`) or no
 * route at all (`not_found`); the field tells the person the relay needs an
 * update rather than pretending the word went through.
 */
ipcMain.handle('teams:name:set', async (_e, raw: unknown) => {
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  const name: string | null = trimmed === '' ? null : trimmed;
  if (name !== null && name.length > 80) return { ok: false as const, error: 'invalid' as const, detail: 'length' };
  if (!readMembership()) return { ok: false as const, error: 'solo' as const };
  const res = await patchMe({ name });
  if (res.ok) {
    // The cached roster still carries the old row; the next read fetches.
    teamsBridge.rosterInvalidate();
    return { ok: true as const, name };
  }
  if (res.error === 'not_found' || (res.error === 'invalid_body' && (res.detail ?? '').includes('unknown field: name'))) {
    return { ok: false as const, error: 'unsupported' as const };
  }
  return { ok: false as const, error: 'offline' as const, detail: res.detail ?? res.error };
});

/** D2's Continue: mint `state` and open the browser at the sign-in page. */
ipcMain.handle('teams:signin:begin', () => teamsEnrol.beginSignIn());

/** The paste fallback: the person typed what the browser showed. */
ipcMain.handle('teams:signin:paste', (_e, pasted: string) =>
  teamsEnrol.receiveGrant({ grant: String(pasted ?? '') }, 'paste'));

ipcMain.handle('teams:signin:cancel', () => { teamsEnrol.cancelSignIn(); return { ok: true }; });

/**
 * D3. Generates, registers, verifies, and only then writes.
 *
 * 0.4.9 nickname: a machine that ALREADY has a named orchestrator claims that
 * name for the org the moment it joins, so its teammates see the word it
 * already signs with. That is the Classic first run and PRO's join on an
 * onboarded machine. A fresh install has no orchestrator row yet and claims
 * nothing here: onboarding asks for the name and claims it explicitly, which
 * is what stops every new machine racing for the same default.
 *
 * A refused claim never fails the join. The seat is in and the word is not,
 * and the flag is what makes the Team screen ask for another one.
 */
/**
 * `invite_redeemed` + `licence_activated:invite` (0.5.0 funnel), and WHY they
 * do not fire in the handler below.
 *
 * The spec's `role` is `member` or `admin`, and at the moment an invite is
 * redeemed this app does not know which. The relay's enrol answer carries
 * `deviceId`, `memberId`, `orgId`, `orgName`, `fingerprint`, `relayUrl` and
 * `enrolledAt` (relay.ts `EnrolResponse`) — no role — and `EnrolResult` passes
 * none through either. `you.isAdmin` arrives one step later, on the first `/me`
 * the org poll fetches.
 *
 * So the events fire on that first view instead. It is the same business
 * moment a second later, and the alternative was defaulting to `member`, which
 * would report a value nothing had checked — the one thing the closed-enum
 * rule exists to prevent. The flag is one-shot: an ordinary `/me` refresh on a
 * machine that has been enrolled for a month must not look like a redemption.
 *
 * The cost of doing it this way, stated rather than hidden: a machine that
 * enrols and never reaches `/me` (offline straight after joining) reports
 * neither event. A lost row beats a wrong one.
 */
let awaitingInviteRole = false;
teamsOrg.onChange((v) => {
  if (!awaitingInviteRole || !v.available || !v.you) return;
  awaitingInviteRole = false;
  analytics.trackFunnel('invite_redeemed', { role: v.you.isAdmin ? 'admin' : 'member' });
});

ipcMain.handle('teams:enrol', async (_e, input: { code: string }) => {
  const res = await teamsEnrol.enrol({ code: String(input?.code ?? '') }, { appVersion: app.getVersion() });
  if (!res.ok) return res;
  /* `licence_activated` fires HERE and not with `invite_redeemed` below
     (Ryan's ruling, 7 Sep 2026). Both its properties are known the instant the
     enrol succeeds, so it has nothing to wait for — the variable is called
     `awaitingInviteRole` and this event is not waiting for a role. Riding
     along with it meant a machine that enrolled and went offline before its
     first `/me` lost a LICENCE ACTIVATION, and that is the one event whose
     whole justification is proving money turned into working software.
     Losing an invite row there is a fair trade; losing this is not. */
  analytics.trackFunnel('licence_activated', { plan: 'teams', source: 'invite' });
  awaitingInviteRole = true;
  const existing = hive.registry().agents[hive.registry().godId ?? 'god']?.name;
  const parsed = existing ? validateBossName(existing) : null;
  if (parsed?.ok) {
    const claim = await patchMe({ bossName: parsed.name });
    setBossNameNeeded(!claim.ok && claim.error === 'conflict');
  }
  return res;
});

// ─── Teams: the socket and the takeover (plan sections 4.3, 4.5) ───────────
// Main is the only writer of the connection state. The session runs whenever
// the gate says this machine is enrolled (live, degraded, OR locked: a locked
// machine reconnecting is how it unlocks) and stops the moment it is not.

ipcMain.handle('teams:connection', () => teamsSession.current());
ipcMain.handle('teams:lock', () => teamsGate.lockInfo());
ipcMain.handle('teams:reconnect', () => { teamsSession.reconnectNow(); return { ok: true }; });

// ─── Teams: Michael to Michael (plan section 4.6) ──────────────────────────
// The bridge seals what the hive router addresses `member:` and opens what the
// socket spooled; D11 reads the thread store and D10 the request queue.

ipcMain.handle('teams:thread', (_e, memberId: string) => teamsBridge.threadFor(String(memberId ?? '')));
/* 0.4.10: the WHOLE DRAFT crosses, not a flattened string. `String(body ?? '')`
   was the narrow door: a subject, an act and `expectsReply` all had to be
   folded into one line to fit through it. The draft is passed as it arrives and
   `sendFromPerson` re-checks it against @shared/teamMessage on THIS side, so
   the contract holds for anything reaching the door, not only for the composer
   that happens to check first. */
ipcMain.handle('teams:send', (_e, memberId: string, draft: unknown) =>
  teamsBridge.sendFromPerson(String(memberId ?? ''), draft));
ipcMain.handle('teams:requests', () => teamsBridge.pendingRequests());
ipcMain.handle('teams:request:decide', (_e, id: string, decision: string) =>
  teamsBridge.decide(String(id ?? ''), decision as never));

/* ─── Teams: your status, and what your clones allow (0.4.10) ───────────────
   THE PIN STORE IS THE ONE TRUTH. These read and write `teamPins`, which is
   also what `teamsBridge` enforces on every send and receive, so the control
   in Team's right sidebar cannot show a value the message path disagrees with.
   Everything goes through `teamsBridge` rather than importing `teamPins` here,
   which keeps main's Teams surface to the one namespace it already has.

   Nothing is trusted from the renderer: `normalizePolicy` and
   `normalizeSchedule` run inside `teamPins`, and both fail closed. */
ipcMain.handle('teams:policy', (_e, memberIds: unknown) =>
  teamsBridge.policyView(Array.isArray(memberIds) ? memberIds.filter((x): x is string => typeof x === 'string') : []));
ipcMain.handle('teams:setStatus', (_e, policy: unknown) => teamsBridge.setStatus(policy as never));
ipcMain.handle('teams:setSchedule', (_e, schedule: unknown) => teamsBridge.setSchedule(schedule));
ipcMain.handle('teams:setPolicy', (_e, memberId: unknown, policy: unknown) =>
  teamsBridge.setPolicy(String(memberId ?? ''), policy as never));
ipcMain.handle('teams:setPolicyDefault', (_e, policy: unknown) => teamsBridge.setPolicyDefault(policy as never));

/* The schedule moves the status on a timer inside the bridge. Without this
   push the one control would sit showing yesterday's choice while the message
   path already enforced the window, which is the exact class of defect this
   release exists to remove. */
teamsBridge.onPolicy(() => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('teams:policy', null);
});

/* ─── Teams: an agent handing a teammate a FILE (0.4.10) ────────────────────
   A local path is a dead reference on another machine, so the bridge mints a
   share and puts the LINK in the body instead. Two things are injected here
   and only here:

     create        the app's ONE `FileShareStore`, declared beside its own IPC
                   further down this file. Registered as a CLOSURE, which is
                   what lets the wiring sit next to the other Teams doors: the
                   arrow is not called until a message is actually sent, long
                   after this module has finished evaluating.
     workspaceFor  the directory an agent was hired into, from the hive
                   registry. It is the guard: an agent may publish a file
                   inside the workspace the person already scoped it to, and
                   nothing else. The reasoning is in @shared/fileShareMessage. */
teamsBridge.attachShares({
  create: (path) => fileShareStore.create(path),
  workspaceFor: (agentId) => hive.registry().agents[agentId]?.cwd ?? null,
});

// ─── Teams: the org channel (plan section 4.4, Pam's S1) ───────────────────
ipcMain.handle('teams:org', () => teamsOrg.view());
/**
 * `billing:summary` (PRO phase 5): the admin's billing view from the relay.
 * THE SECOND WALL (plan 6.4). The renderer's `can(standing, 'billing.view')`
 * decides what is drawn; this decides what is fetched, from the relay-verified
 * `/me` answer main holds (teamsOrg.view().you.isAdmin), never from the
 * renderer's word. A non-admin is refused here with no network call, and the
 * relay would refuse again with `forbidden` if it were asked.
 */
ipcMain.handle('billing:summary', async (): Promise<BillingSummary> => {
  const org = teamsOrg.view();
  if (!org.available || org.you?.isAdmin !== true) return { ok: false, reason: 'refused' };
  const r = await fetchBilling();
  if (!r.ok) {
    if (r.status === 404 || r.error === 'not_found') return { ok: false, reason: 'unavailable' };
    if (r.status === 0) return { ok: false, reason: 'offline' };
    return { ok: false, reason: 'error', error: r.error };
  }
  const view = parseBillingWire(r.data);
  return view ? { ok: true, view } : { ok: false, reason: 'error', error: 'invalid_body' };
});
ipcMain.handle('teams:org:verify', () => teamsOrg.verifyKey());
ipcMain.handle('teams:org:refresh', () => teamsOrg.refresh());

{
  const push = (channel: string, payload: unknown): void => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, payload);
  };
  teamsGate.onChange((mode) => push('teams:mode', mode));
  teamsEnrol.onGrant(() => push('teams:signin:grant', null));
  freeAccount.onFreeGrant(() => push('free:signin:grant', null));
  teamsEnrol.onProgress((step) => push('teams:enrol:progress', step));
  teamsSession.onChange((v) => push('teams:connection', v));
  teamsSession.onPresence(() => push('teams:presence', null));
  teamsBridge.onThread((memberId) => push('teams:thread', memberId));
  teamsBridge.onRequests(() => push('teams:requests', null));
  teamsOrg.onChange((v) => push('teams:org', v));

  // The bridge and the hive meet here and nowhere else: hive.ts never imports
  // Teams, and the bridge sees three calls of the hive.
  teamsBridge.attach({
    send: (partial, from) => hive.send(partial, from),
    appendLog: (event) => hive.appendLog(event),
    godId: () => hive.registry().godId ?? 'god',
    // 0.5.2: the sending agent's display name, sealed into the message so
    // the other floor can say which agent wrote. Null for `you` and for an
    // id that is not an agent here.
    agentName: (id) => hive.registry().agents[id]?.name ?? null,
    // 0.5.2 (founder ruling, Option A): who answers a teammate's message,
    // and which agents can take mail right now. The predicate is the one
    // broadcast fan-out uses (not archived, not the send-only assistant),
    // called with no sender so nobody is excluded on that ground; the bridge
    // resolves the two through @shared/responder and falls back to god.
    responder: () => readConfig().responder,
    activeAgentIds: () => selectBroadcastTargets(hive.registry().agents, ''),
  });
  hive.setRemote({
    send: (msg) => { void teamsBridge.send(msg); },
    rosterLine: () => teamsBridge.teammatesLine(),
    // 0.4.9: an agent may write to a teammate by the person's name or by the
    // name their orchestrator goes by, not only by member:<id>.
    resolve: (name) => teamsBridge.resolveTeammate(name),
  });

  let bridgeOff: (() => void) | null = null;
  let orgOff: (() => void) | null = null;
  const enrolled = (mode: string) => mode === 'live' || mode === 'degraded' || mode === 'locked';
  const follow = (mode: string): void => {
    if (enrolled(mode)) {
      teamsSession.start();
      teamsGate.startLeaseClock();
      if (!bridgeOff) bridgeOff = teamsBridge.start();
      if (!orgOff) orgOff = teamsOrg.start();
    } else {
      teamsSession.stop();
      teamsGate.stopLeaseClock();
      bridgeOff?.();
      bridgeOff = null;
      orgOff?.();
      orgOff = null;
    }
  };
  teamsGate.onChange(follow);
  // Nothing runs before the app is ready, and a solo install runs nothing here
  // at all: `mode()` is two file reads and `follow('solo')` stops what was
  // never started.
  app.whenReady().then(() => follow(teamsGate.mode()));
  // The laptop lid: a socket that slept is a socket the relay closed for
  // missed pings. Come back at once rather than waiting for a timer to notice.
  powerMonitor.on('resume', () => { if (enrolled(teamsGate.mode())) teamsSession.reconnectNow(); });
  app.on('before-quit', () => { teamsSession.stop(); teamsGate.stopLeaseClock(); });
}

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
  return officeLabel(officeNumber, liveOfficeCount(sharedDataDir(), pidAlive)).title;
}
function applyOfficeLabel(): void {
  try {
    const { title, badge } = officeLabel(officeNumber, liveOfficeCount(sharedDataDir(), pidAlive));
    for (const w of BrowserWindow.getAllWindows()) if (!w.isDestroyed() && w.getTitle() !== title) w.setTitle(title);
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
    titleBarStyle: 'hiddenInset',
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

  // Capture the webContents once: after 'closed' the window is gone, but this
  // reference stays valid as the per-PTY ownership key.
  const wc = win.webContents;
  /** Read now: a destroyed webContents throws on `.id`, and 'closed' runs after. */
  const wcId = wc.id;

  allWindows.add(win);
  // Global timer events follow the user — the most-recently-focused window is
  // primary. The primary is also seeded synchronously so boot events route now.
  win.on('focus', () => { mainWindow = win; });
  if (!isFloor) mainWindow = win;

  // Permission gate for the renderer (our own trusted, local content). The
  // only permission we constrain is microphone capture. Since 0.5.3 batch 3
  // Free Flow has no off switch (founder: the composer mic works with whatever
  // engine is picked), so an app window's own dictation is always a live mic
  // feature. The puck's page shares this session and stays gated as before:
  // only while it is actually recording (main/puck.ts flips it), or while a
  // Realtime Michael voice session (`realtimeVoiceEnabled`) is on. Every other
  // permission keeps the app's prior permissive behavior (e.g. clipboard for
  // xterm/editor copy must keep working).
  const micFeatureLive = (wc: Electron.WebContents | null): boolean => {
    if (!isPuckContents(wc)) return true;
    const cfg = readConfig();
    return cfg.realtimeVoiceEnabled === true || puckMicLive();
  };
  const ses = win.webContents.session;
  ses.setPermissionRequestHandler((wc, permission, callback, details) => {
    if (permission === 'media') {
      const mediaTypes = details && 'mediaTypes' in details ? details.mediaTypes : undefined;
      const wantsAudio = !mediaTypes || mediaTypes.includes('audio');
      callback(micFeatureLive(wc) && wantsAudio);
      return;
    }
    callback(true);
  });
  ses.setPermissionCheckHandler((wc, permission) => {
    if (permission === 'media') return micFeatureLive(wc);
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

  // Never opens a window; hands the URL to the OS browser instead.
  //
  // Scheme-checked, because this is now reachable from AUTHOR-CONTROLLED markup:
  // a release drop's iframe has `allow-popups`, so a target="_blank" link in a
  // release body arrives here. http(s) only — an unguarded openExternal will
  // happily launch file://, or a registered custom scheme, on the user's machine.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

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
    // Primary window: existing app-wide quit warning (renderer modal).
    const count = ptyManager.list().length;
    if (count === 0) return;
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

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
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
    if (mainWindow === win) {
      mainWindow = null;
      for (const w of allWindows) { if (!w.isDestroyed()) { mainWindow = w; break; } }
    }
    syncKeepAwake();
  });

  return win;
}

/** Open a new floor window — gated by the multiWindow flag. Returns the window,
 *  or null when the feature is off (the entry points are hidden in that case,
 *  but the IPC stays defensive). */
function openFloor(): BrowserWindow | null {
  if (!readConfig().multiWindow) return null;
  return createWindow({ floor: true });
}

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
    // a second window of this floor. openFloor() stays for the flag-off path.
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
/** Codex stores its rollout transcripts under a PER-AGENT CODEX_HOME
 *  (<hive>/agents/<id>/.codex/sessions/<Y>/<M>/<D>/rollout-*-<sessionId>.jsonl).
 *  A NEWLY added agent gets an empty CODEX_HOME, so `codex resume <sid>` finds
 *  nothing and silently opens a BLANK session — which is exactly what the Add
 *  Agent "resume session" field looked like it was doing. Find the agent whose
 *  CODEX_HOME owns this rollout and RETURN that home so the resumed agent can be
 *  pointed at it (the rollout AND its state_5.sqlite index live there together). */
function findCodexHomeForSession(sessionId: string, siblingsRoot: string): string | null {
  try {
    if (!sessionId || !/^[0-9a-fA-F][0-9a-fA-F-]{15,}$/.test(sessionId)) return null;
    let fallbackHome: string | null = null;
    // Walk each sibling agent's CODEX_HOME (<agent>/.codex) looking for the
    // rollout that owns this session. We RETURN that home rather than copy the
    // rollout out of it: Codex indexes sessions in its state_5.sqlite, so a lone
    // rollout file in a fresh home is invisible to `codex resume`. Pointing the
    // resumed agent at the OWNING home gives it the rollout AND the index.
    let agents: Array<{ name: string; isDirectory(): boolean }>;
    try {
      agents = readdirSync(siblingsRoot, { withFileTypes: true }) as unknown as Array<{ name: string; isDirectory(): boolean }>;
    } catch { return null; }
    for (const a of agents) {
      if (!a.isDirectory()) continue;
      const home = join(siblingsRoot, a.name, '.codex');
      const sessions = join(home, 'sessions');
      if (!existsSync(sessions)) continue;
      const stack = [sessions];
      let hasRollout = false;
      while (stack.length && !hasRollout) {
        const d = stack.pop() as string;
        let ents: Array<{ name: string; isDirectory(): boolean; isFile(): boolean }>;
        try {
          ents = readdirSync(d, { withFileTypes: true }) as unknown as Array<{ name: string; isDirectory(): boolean; isFile(): boolean }>;
        } catch { continue; }
        for (const e of ents) {
          const pth = join(d, e.name);
          if (e.isDirectory()) stack.push(pth);
          else if (e.isFile() && e.name.endsWith('.jsonl') && e.name.includes(sessionId)) { hasRollout = true; break; }
        }
      }
      if (!hasRollout) continue;
      // Prefer the home whose Codex state DB actually INDEXES this session — a
      // fresh/seeded home may carry only a stray rollout copy (no index), which
      // `codex resume` can't open. Match the id as raw bytes in state_5.sqlite
      // (+ its WAL). Homes with the rollout but no index are a last-resort fallback.
      const idBuf = Buffer.from(sessionId);
      let indexed = false;
      for (const db of ['state_5.sqlite', 'state_5.sqlite-wal']) {
        try { if (readFileSync(join(home, db)).includes(idBuf)) { indexed = true; break; } } catch { /* no db */ }
      }
      if (indexed) return home;
      if (!fallbackHome) fallbackHome = home;
    }
    return fallbackHome;
  } catch (e) {
    console.error('[resume] findCodexHomeForSession failed:', e);
    return null;
  }
}

/** Spawn options shared by the `pty:spawn` IPC handler and the god-triggered
 *  ephemeral-worker watcher. */
type AgentSpawnOptions = SpawnOptions & { hive?: AgentMeta; isolate?: boolean; resume?: boolean; requireResume?: boolean; resumeSessionId?: string; provider?: AgentProvider; noAutoInstall?: boolean;
  /** I2: the person pressed Install on the card, so a missing binary runs its
   *  installer now. Without it a missing binary only draws the card. */
  installNow?: boolean;
  /** Batch 2: run this login script in the agent's pty, with the agent's own
   *  environment (its per agent CLI home), instead of the agent itself. */
  loginScript?: string;
  /** Batch 4: the loginScript is the manual setup terminal, not a login: no
   *  sign in check first, and no link watcher (the person drives it). */
  manualSetup?: boolean;
  /** Batch 2: this install was started by a person pressing Install on the
   *  card, so a clean install stops at the sign in step. An install nobody is
   *  watching (a god dispatched worker, a voice hire) starts the agent at once,
   *  as before. */
  guidedSetup?: boolean };

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

/** Core agent-spawn logic — provider inference, the missing-CLI installer
 *  short-circuit, git-worktree isolation, hive provisioning, model/resume flags,
 *  and the final PTY spawn. Extracted VERBATIM from the `pty:spawn` IPC handler so
 *  it can ALSO be invoked by the god-triggered ephemeral-worker watcher (which has
 *  no renderer `evt`). `owner` is the window that should receive this PTY's output
 *  (null → the primary window). Behavior-identical to the prior inline handler. */
async function spawnAgentCore(opts: AgentSpawnOptions, owner: Electron.WebContents | null): Promise<{ ok: boolean; error?: string; cwd?: string; worktreePath?: string; resumeNotFound?: boolean; resumed?: boolean; seedPrompt?: string; cliMissing?: CliMissingState; signedIn?: boolean }> {
  // ── cwd INGESTION — expand `~` exactly once, here ───────────────────────────
  // This is the single door every agent spawn comes through (`pty:spawn` IPC and
  // the god-triggered ephemeral-worker watcher), so it is where a user-typed
  // `~/dev/foo` becomes an absolute path. Only a shell expands `~`; Node treats it
  // as a literal dir, so without this every downstream existsSync/statSync fails
  // with `cwd does not exist`. Expanding BEFORE hive provisioning is what makes the
  // registry store an ABSOLUTE cwd (and `cwdValid: true`). The resolved value is
  // returned to the caller so the renderer records the same absolute path.
  opts.cwd = expandTilde(opts.cwd);
  if (opts.hive) opts.hive = { ...opts.hive, cwd: expandTilde(opts.hive.cwd) };
  // The spawn as asked for, before the steps below add to it (the hive's args
  // and env, a worktree): what a later "start agent" re-runs (agentRuns).
  const asGiven: AgentSpawnOptions = { ...opts };
  // A teardown may still be deciding whether the folder we are about to start
  // in is removed (it asks git, which takes seconds on a large repo). The
  // crashed row offers Restart the instant the process dies, so a quick click
  // used to start the agent in a folder that was then taken from under it.
  // Wait for the decision; if the folder goes, the usual missing folder path
  // below handles it and says so.
  try {
    const here = resolve(opts.cwd);
    for (const [wt, pending] of worktreeFinalizing) {
      if (here === resolve(wt) || here.startsWith(resolve(wt) + sep)) await pending.catch(() => undefined);
    }
  } catch { /* an unresolvable cwd is reported further down */ }
  // Which CLI is this? Explicit wins; else inferred from the binary
  // (claude/codex/grok/agy). Non-Claude providers skip every Claude-only spawn step
  // below. Persist the resolved provider onto opts (+ hive meta) so the registry
  // record and downstream provider-aware steps agree on one value.
  const provider = inferAgentProvider(opts.command, opts.provider ?? opts.hive?.provider);
  const claudeProvider = isClaudeProvider(provider);
  opts.provider = provider;
  if (opts.hive) opts.hive = { ...opts.hive, provider };
  // Activation-funnel entry (v0.4.6): every spawn REQUEST, so (attempted − spawned)
  // measures the fallout the whole rebuild exists to see. Gated on !noAutoInstall so
  // the missing-CLI relaunch (the only re-entry, index.ts install-exit handler) does
  // NOT double-count a single user attempt — it is the SAME attempt continuing.
  if (!opts.noAutoInstall) analytics.track('agent_spawn_attempted', { provider });
  // ── Missing engine CLI → run its installer visibly (pre-spawn) ───────────────
  // If the agent's engine binary (claude/codex/…) isn't installed, spawning it
  // just dies with "— process exited (code 1) —" and the user has no idea why.
  // Detect the absent binary BEFORE spawning and, in this SAME terminal, print a
  // banner + RUN the provider's install command so the user can watch it (and
  // complete any interactive sign-in). On a CLEAN install exit the PTY-exit handler
  // auto restart-and-continues — it re-runs THIS spawn (with noAutoInstall) so the
  // freshly-installed CLI launches in the SAME pty/window, no user click. STRICTLY
  // pre-spawn: a non-zero exit from a CLI that DID start never reaches here, so there
  // is no install loop; and the relaunch's noAutoInstall guarantees the installer
  // can't fire twice. Providers with no known installer get a manual hint only (and
  // are NOT armed for relaunch) — nothing arbitrary is ever auto-run. We short-circuit
  // BEFORE worktree/hive/Claude-flag setup: ptyToAgent + worktreePaths stay unset for
  // this id, so when the install PTY exits teardownPty is a harmless no-op (the agent
  // isn't archived and no worktree is torn down) before the relaunch takes over.
  {
    const bin = opts.command.trim().split(/\s+/)[0] || opts.command;
    // Batch 2, the same rule for the setup panel: an ordinary start of this
    // id (a Restart on a good line, the Start button's own spawn) ends any
    // install or sign in step still recorded, so no panel sits over a
    // running agent. The login step and the installer are the setup's own.
    if (opts.loginScript === undefined && !opts.installNow && pendingCliSetup.has(opts.id)) {
      const ended = endCliSetup(opts.id);
      sendCliSetup(opts.id, ended?.owner ?? owner, null);
    }
    // A spawn of this id whose CLI IS here replaces the card an earlier line
    // left (founder, 24 Sep: a restart on a mistyped line, then on a good one).
    // Without this, pty:cliMissingState kept answering with the old card and a
    // reopened screen drew it over a running agent.
    if (!bin || opts.noAutoInstall || ptyManager.isCommandAvailable(bin)) pendingCliMissing.delete(opts.id);
    if (bin && !opts.noAutoInstall && !ptyManager.isCommandAvailable(bin)) {
      // The installer commands are `npm install -g …`. Probe for npm the same way
      // we probe for the engine CLI, so a no-Node machine gets the node-free rung
      // (or an honest manual hint) instead of watching `npm: not found` scroll by.
      // An npm whose Node is BELOW the floor counts as unavailable: founder rule
      // (2026-08-07) is "their Node newer than ours → leave it alone; absent or
      // older → install the latest stable for them".
      const npmAvailable =
        ptyManager.isCommandAvailable('npm') &&
        nodeIsUsable(detectNodeVersion(ptyManager.commandPath('node')));
      // Only reach the network when we actually need to (npm missing/too old);
      // resolveNodeInstaller is timeout-bounded and returns null offline, which
      // simply drops the ladder to the native/manual rung.
      const nodeInstaller = npmAvailable ? null : await resolveNodeInstaller();
      const rung = chooseInstallRung(installInfoForProvider(provider), npmAvailable, nodeInstaller);
      // I2 (0.5.3): nothing runs until the person presses Install. The terminal
      // draws a calm card with the rung's exact command; a spawn with no pty is
      // still ok for the caller (the agent exists, its terminal says what is
      // missing), and pty:installCli re-enters here with installNow. The manual
      // rung has nothing to run, so it is the same spawn failure it always was.
      if (!opts.installNow) {
        const state = describeMissingCli(provider, bin, npmAvailable, process.platform, nodeInstaller);
        pendingCliMissing.set(opts.id, { opts, owner, state });
        sendCliMissing(opts.id, owner, state);
        if (rung.kind === 'manual') analytics.track('agent_spawn_failed', { provider, reason: 'cli_missing' });
        return { ok: true, cwd: opts.cwd, cliMissing: state };
      }
      const res = ptyManager.spawn(
        {
          id: opts.id,
          cwd: opts.cwd,
          command: bin,
          cols: opts.cols,
          rows: opts.rows,
          shellScript: buildMissingCliScript(bin, provider, npmAvailable, process.platform, nodeInstaller)
        },
        owner
      );
      // Arm auto restart-and-continue: when this installer PTY exits cleanly, the
      // exit handler re-runs the spawn so the just-installed CLI launches in place
      // (no user click). Only when an installer actually RAN (a provider with no
      // bundled installer just prints a manual hint and exits 0 — relaunching there
      // would spawn the still-missing binary and die) and the PTY actually started.
      // …keyed on the RUNG, not on `installCommand`: the manual rung prints a hint
      // and exits 0, and relaunching there would just respawn the still-missing
      // binary and die with the bare "process exited (code 1)" this whole path exists
      // to replace.
      if (res.ok && rung.command) {
        pendingInstallRelaunch.set(opts.id, { opts, owner, bin, rung: rung.kind });
        // Batch 2: the terminal is the installer's until it ends; the composer
        // and the queue hold, and the panel says so.
        if (opts.guidedSetup) {
          const setup: CliSetupState = { phase: 'installing', provider, label: installInfoForProvider(provider).label, loginCommand: null };
          pendingCliSetup.set(opts.id, { opts, owner, state: setup });
          sendCliSetup(opts.id, owner, setup);
        }
        // The auto-installer PTY is running; agent_install_finished on its exit says
        // whether it actually produced an agent (rung is non-manual here by construction).
        analytics.track('agent_install_started', { provider, rung: rung.kind });
      } else if (res.ok) {
        // Manual rung: the PTY only printed a hint (no installer to run, no relaunch
        // armed), so no agent will start. This is the Mode 2 case that used to send
        // NOTHING — an absent engine with no unattended install path.
        analytics.track('agent_spawn_failed', { provider, reason: 'cli_missing' });
      } else {
        // The install PTY itself failed to spawn (cwd gone, id clash, throw).
        analytics.track('agent_spawn_failed', { provider, reason: spawnFailReason(res.error) });
      }
      syncKeepAwake();
      return res;
    }
  }
  // Git isolation: when requested and the cwd is a real repo, give this agent
  // its own worktree on an `agent/<id>` branch so it can't clobber other agents'
  // (or the user's) working tree. Best-effort — a failure falls back to the
  // shared cwd rather than blocking the spawn.
  // NOTE (tracked, not yet hardened): the restore flow passes isolate:false and
  // re-enters the existing worktree by cwd, so it never reaches here. But a stale
  // `isolate:true` recipe spawned against an already-existing worktree path would
  // make addWorktree below conflict (path/branch exists) and fall back to the base
  // cwd — reuse-existing-worktree handling here is the follow-up.
  if (opts.isolate === true && await isRepo(opts.cwd)) {
    try {
      const origCwd = opts.cwd;
      const wtRoot = join(readConfig().harnessHome ?? origCwd, 'worktrees');
      // The id is renderer-supplied (validated only as a string). Slugify it so a
      // crafted id can't inject path separators, then assert the resolved path
      // stays under the worktrees root (defends against bare '..' that slugify
      // leaves intact). If it would escape, bail isolation → fall back to cwd.
      const seg = (opts.hive?.id ?? opts.id).replace(/[^A-Za-z0-9._-]/g, '-');
      const wtPath = join(wtRoot, seg);
      if (!resolve(wtPath).startsWith(resolve(wtRoot) + sep)) {
        console.error('[worktree] refusing unsafe worktree path for id:', opts.hive?.id ?? opts.id);
      } else {
        const br = await getBranch(origCwd);
        const baseBranch = 'current' in br && br.current ? br.current : 'main';
        const wt = await addWorktree(origCwd, wtPath, baseBranch);
        if (wt.ok) {
          opts.cwd = wtPath;
          worktreePaths.set(opts.id, wtPath);
          worktreeOrigins.set(opts.id, origCwd);
          worktreeBases.set(opts.id, baseBranch);
          const deps = await linkWorktreeDeps(origCwd, wtPath);
          if (!deps.ok) console.error('[worktree] dependency link failed:', deps.error);
        } else {
          console.error('[worktree] addWorktree failed:', wt.error);
        }
      }
    } catch (e) {
      console.error('[worktree] isolation failed:', e);
    }
  }
  // Proxy-tier CLIs (qwen/crush) route their LLM traffic through a loopback sidecar
  // whose UPSTREAM is read from the preset's bridge.baseUrlEnv inside hive.ensureAgent.
  // For the local-LLM path, feed the user's configured base URL as that upstream so the
  // proxy forwards to their endpoint (Ollama/LM Studio/vLLM). Set on process.env BEFORE
  // ensureAgent reads it. (Crush's baseUrlEnv is an inert sentinel used ONLY as this
  // upstream source; its real routing is the per-agent CRUSH_GLOBAL_CONFIG base_url.)
  if (opts.hive && (provider === 'crush' || provider === 'qwen')) {
    const bridge = providerPreset(provider).bridge;
    const baseUrl = readConfig().providerBaseUrls?.[provider];
    if (bridge && bridge.kind === 'proxy' && baseUrl) process.env[bridge.baseUrlEnv] = baseUrl;
  }
  // If the agent carries hive metadata, provision its workspace and add
  // provider-specific spawn injection. Non-Claude providers get shared AGENT_*
  // env only; Claude Code also gets prompt/settings hook args.
  // Protocol seed that must be TYPED into a bare TUI after boot (Crush —
  // seedDelivery:'type-into-tui') rather than passed on argv. Surfaced in the spawn
  // result so the renderer types it through the per-pty write-chain. (ondev-b)
  let seedPrompt: string | undefined;
  if (opts.hive && hive.enabled()) {
    try {
      const inj = await hive.ensureAgent(
        { ...opts.hive, cwd: opts.cwd, provider },
        {
          semanticMemory: memory.active(),
          knowledgeGraph: knowledge.active(),
          // Bake the ABSOLUTE KG CLI path into the agent's prompt. The prompt used
          // to spell it `$KG_CLI`, which is POSIX-only: under cmd.exe/PowerShell it
          // expands to nothing, so every knowledge-graph instruction was dead on a
          // Windows floor. Empty when the KG is off (the line isn't emitted then).
          kgCliPath: knowledge.env().KG_CLI,
          theme: readConfig().terminalTheme ?? 'light',
          outputStyle: readConfig().claudeOutputStyle,
          // W3 — MCP consent, resolved for THIS agent: its own rows in
          // config.agentMcp over the floor-wide mcpDefaults (PRO phase 3).
          mcpDefaults: effectiveMcp(readConfig().mcpDefaults, sanitizeAgentMcp(readConfig().agentMcp), opts.hive.id),
          skillsDir: skillsResourceDir(),
          // The shared palace is mutated by the agent's own `mempalace` calls, so
          // the OS sandbox must let it through (empty when memory is off).
          extraWritableDirs: [memory.env().MEMPALACE_PALACE_PATH].filter((p): p is string => !!p)
        }
      );
      opts.args = [...(opts.args ?? []), ...inj.args];
      seedPrompt = inj.seedPrompt;
      // A degraded spawn (proxy bridge never bound) is told to the user the same
      // way breaker escalations are: a native toast, gated on the notifications
      // setting. The hive already logged it and pushed hive:degraded to the floor.
      if (inj.degraded) breakerToast('Agent running degraded', inj.degraded);
      // Point the agent's mempalace CLI at the shared palace + the `kg` CLI at the
      // enterprise knowledge store (both no-ops / empty when their flags are off).
      opts.env = { ...(opts.env ?? {}), ...inj.env, ...memory.env(), ...knowledge.env() };
    } catch (e) {
      // Hive provisioning is best-effort; never block a spawn on it.
      console.error('[hive] ensureAgent failed:', e);
    }
  }
  // Batch 2: the sign in step after an install. Here, and not earlier, because
  // the hive has just put the agent's own CLI home into opts.env (CODEX_HOME,
  // PI_CODING_AGENT_DIR and the rest): a login run with any other environment
  // would sign in somewhere the agent never reads. It is not the agent, so it
  // is never mapped to one (its exit archives nothing) and nothing is resumed.
  if (opts.loginScript !== undefined) {
    const bin = opts.command.trim().split(/\s+/)[0] || opts.command;
    const binPath = ptyManager.commandPath(bin) ?? bin;
    const checkEnv = ptyManager.childEnv(opts.env);
    // (e): a CLI that says it is signed in (with this agent's own home) needs
    // no sign in step; the caller starts the agent. Anything else, including
    // a check that failed or ran over, is "cannot tell": the step is shown.
    if (!opts.manualSetup && hasSignInCheck(provider) && await checkSignedIn(provider, binPath, checkEnv, opts.cwd) === 'signed-in') {
      return { ok: true, cwd: opts.cwd, signedIn: true };
    }
    if (!opts.loginScript) return { ok: true, cwd: opts.cwd };
    const res = ptyManager.spawn({ id: opts.id, cwd: opts.cwd, command: bin, cols: opts.cols, rows: opts.rows, env: opts.env, shellScript: opts.loginScript }, owner);
    if (res.ok && opts.manualSetup) ptyOwners.set(opts.id, owner);
    else if (res.ok) {
      loginWatcher.track(opts.id, provider);
      ptyOwners.set(opts.id, owner);
      watchSignIn(opts.id, provider, binPath, checkEnv, opts.cwd);
    }
    return { ...res, cwd: opts.cwd };
  }
  // Long-run guardrails + tiering (Lane A #6.4/#6.6). All additive to the args
  // already assembled (incl. the hive injection); an explicit choice always wins.
  // Set when an explicit Add Agent "resume session" id couldn't be located and we
  // silently fell back to a fresh session — returned so the dialog can surface it.
  let resumeNotFound = false;
  // Set when `--resume` was actually attached (explicit id or restore-on-restart),
  // so the renderer can skip re-orienting a god/assistant that resumed its thread.
  let didResume = false;
  // Claude-only — these are Claude Code flags; other CLIs carry their own flags
  // in the command string the renderer already built.
  if (opts.hive && claudeProvider) {
    const cfg = readConfig();
    // Permission posture (D9): only a GUI hire (Add Agent) builds its command
    // through buildSpawnCommand, which bakes autoMode's bypass flag into the
    // command STRING before this function ever sees it. A main-only spawn (the
    // ephemeral-worker watcher, a voice hire) skips that step entirely, so it
    // previously reached here with neither the flag nor any equivalent — every
    // other Claude spawn path got the user's autoMode posture and this one
    // didn't. argsWithAutoModeFlag is idempotent (a GUI spawn's args already has
    // the flag, so this is a no-op for it) and is the SAME check spawnAgentCore
    // already applies for opencode/crush et al a few lines below via
    // HIVE_AUTO_APPROVE — one global toggle, one posture, every spawn path.
    // Confirmed live: a worker spawned without this flag deadlocked — a
    // cross-session message to it came back "held for the recipient user's
    // approval" with no surface for anyone to ever grant that approval.
    const args = argsWithAutoModeFlag(opts.args ?? [], cfg.autoMode, provider);
    // Model precedence: an explicit per-agent --model (from the renderer) wins;
    // else the user's global defaultModel; else the role-based default tier. The
    // GOD is special-cased: it has its own engine config (godProvider/godModel), so
    // modelForRole resolves it and that wins over the worker-oriented defaultModel.
    if (!args.includes('--model')) {
      const m = opts.hive.isGod
        ? modelForRole(opts.hive, cfg)
        : cfg.defaultModel ?? modelForRole(opts.hive, cfg);
      if (m) args.push('--model', m);
    }
    // Name the Remote Control session after the agent (Michael, Jim, Dev1…) so it
    // is identifiable in claude.ai / the mobile app. Otherwise Claude defaults the
    // prefix to the machine hostname (e.g. "vyapaks-macbook-pro-…"), which is
    // opaque when several agents run at once — especially with remoteControlAtStartup
    // on, where RC auto-enables for every session. Slugify the friendly name into a
    // single safe token; Claude still appends its own random suffix for uniqueness.
    if (!args.includes('--remote-control-session-name-prefix')) {
      const label = (opts.hive.name || opts.hive.id || '')
        .trim().replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
      if (label) args.push('--remote-control-session-name-prefix', label);
    }
    // Coarse runaway cap.
    if (typeof cfg.maxTurns === 'number' && cfg.maxTurns > 0 && !args.includes('--max-turns')) {
      args.push('--max-turns', String(cfg.maxTurns));
    }
    // Resume: an explicit session id (Add Agent "resume session" field, #2) wins,
    // else this agent's last recorded session (#1 restore-on-restart / #6.6a).
    // Seed the transcript into the target cwd's Claude project dir first — Claude
    // keys sessions by cwd, so a session started elsewhere is invisible until its
    // `.jsonl` is copied across. Only attach `--resume` if the transcript is
    // actually present (already or after the copy); otherwise fall back to a fresh
    // session rather than launching a `--resume` against a missing id.
    const explicitSid = typeof opts.resumeSessionId === 'string' ? opts.resumeSessionId.trim() : '';
    // 0.5.3 bug 1: the current key is not always the agent's conversation (see
    // shared/resumeKey.ts), so walk the keys it displaced and resume the first
    // one whose transcript exists, instead of trusting one id and dropping the
    // flag when it turns out to be a ghost.
    const candidates = [explicitSid || undefined, ...(opts.resume === true ? hive.resumeCandidates(opts.hive.id) : [])];
    if (!args.includes('--resume') && candidates.some(Boolean)) {
      const cwd = opts.cwd;
      const sid = pickResumableSession(candidates, (s) => seedSessionTranscript(cwd, s));
      if (sid) {
        if (sid !== candidates.find(Boolean)) console.warn(`[resume] ${opts.hive.id}: recorded session has no transcript, resuming the earlier session "${sid}"`);
        args.push('--resume', sid);
        didResume = true;
        // Claude refuses --resume while its registry says another process or
        // a background session holds the id ("attach or stop it"). The old
        // agent process may still be exiting, or the session was sent to the
        // background; free it first (claudeSessionRelease.ts).
        const claudeDir = opts.env?.CLAUDE_CONFIG_DIR || process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude');
        const released = await releaseClaudeSession(sid, claudeDir, resolveCliCommand(opts.command || 'claude'));
        if (released.length > 0) console.warn(`[resume] ${opts.hive.id}: freed session ${sid}: ${released.join(', ')}`);
      } else {
        // A session was on record and none of it is on disk. We start FRESH rather
        // than launch a broken `--resume`, and that is never silent: it used to be
        // flagged only for an id a person typed, so a restore reported success
        // over an empty agent. Every caller can now say 'started fresh'.
        console.warn(`[resume] ${opts.hive.id}: no recorded session has a transcript in any Claude project dir — starting a fresh session`);
        resumeNotFound = true;
      }
    }
    opts.args = args;
  }
  // Idempotent session resume on respawn (#6.6a) — provider-aware: Claude
  // `--resume <sid>`, Grok `--resume <sid>`, Antigravity `--conversation <id>`.
  // The recorded session id comes from hook payloads, so
  // a restored worker continues its prior CLI session. Only when requested AND a
  // prior id exists for this agent.
  // Claude resume — incl. transcript seeding + only-attach-when-present — is
  // handled in the Claude-only block above; this generic flag path covers the
  // other CLIs (it must not blindly attach `--resume` when the seed failed).
  if (opts.hive && !claudeProvider) {
    const preset = providerPreset(provider);
    const rf = preset.resumeFlag;
    const rsub = preset.resumeSubcommand;
    // An id typed into Add Agent's "resume session" field wins; otherwise fall
    // back to this agent's own recorded session (restart-in-place). Previously
    // resumeSessionId was read ONLY in the Claude branch, so a Codex agent
    // silently ignored it and started a brand-new empty session.
    const typedSid = typeof opts.resumeSessionId === 'string' ? opts.resumeSessionId.trim() : '';
    // The founder, 24 Sep 2026: a restart must not lose the session for ANY
    // provider. The same three rules the Claude path got in bug 1, for every
    // CLI with a resume form: walk the recorded keys (the current one first,
    // then the ones it displaced), only attach an id the CLI's own store has
    // (shared/resumeStore.ts, the layouts read off disk per provider), and
    // when none is left start fresh and say so. A provider whose store is
    // unknown, or a machine where that store was never created, attaches the
    // newest recorded id unchecked: dropping a possibly good id would lose a
    // session to save a maybe.
    const walked = typedSid ? [typedSid] : (opts.resume === true ? hive.resumeCandidates(opts.hive.id) : []);
    const listDir: DirLister = (d) => { try { return readdirSync(d); } catch { return null; } };
    let sid: string | undefined = walked.find(Boolean);
    if (sid && rf) {
      // The store is resolved from the environment the CLI will actually run
      // with: the pty hands the child process.env with the agent's env over
      // it (buildPtyEnv), and the agent's env already carries the per agent
      // homes the hive set (pi's PI_CODING_AGENT_DIR above all). Reading the
      // person's ~ instead would call a good pi id missing (Kevin, #90).
      const storeCtx: StoreContext = {
        env: { ...process.env, ...(opts.env ?? {}) },
        home: homedir(),
        cwd: opts.cwd,
        readText: (f) => { try { return readFileSync(f, 'utf8'); } catch { return null; } }
      };
      const picked = chooseResumeSession(walked, providerSessionStore(provider, storeCtx), listDir);
      if (picked.checked && picked.sid && picked.sid !== sid) {
        console.warn(`[resume] ${opts.hive.id}: recorded ${provider} session is not in its store, resuming the earlier session "${picked.sid}"`);
      }
      sid = picked.sid;
      if (!sid) {
        console.warn(`[resume] ${opts.hive.id}: no recorded ${provider} session exists in its store - starting a fresh session`);
        resumeNotFound = true;
      } else {
        const args = opts.args ?? [];
        if (!args.includes(rf)) { args.push(rf, sid); opts.args = args; didResume = true; }
      }
    } else if (sid && rsub) {
      // Subcommand form (Codex): `codex resume [OPTIONS] [SESSION_ID]` — the
      // subcommand MUST be argv[0], the id trails the flags. Codex indexes
      // sessions in state_5.sqlite, so a fresh agent's empty CODEX_HOME can't
      // resume by id. If this agent's own home already has the session, resume in
      // place; otherwise point CODEX_HOME at the agent home that OWNS it (that
      // home has both the rollout and the sqlite index).
      const myHome = (opts.env ?? {}).CODEX_HOME;
      const agentsRoot = myHome ? dirname(dirname(myHome)) : '';
      // The same walk as the flag path: the recorded id first, then the ids
      // it displaced, resuming the first one a CODEX_HOME actually owns.
      sid = agentsRoot ? pickResumableSession(walked, (s) => !!findCodexHomeForSession(s, agentsRoot)) : sid;
      const ownerHome = agentsRoot && sid ? findCodexHomeForSession(sid, agentsRoot) : null;
      if (!ownerHome || !sid) {
        console.warn(`[resume] no recorded codex session found in any agent CODEX_HOME - starting fresh`);
        resumeNotFound = true;
      } else {
        if (ownerHome !== myHome) opts.env = { ...(opts.env ?? {}), CODEX_HOME: ownerHome };
        const args = opts.args ?? [];
        // Positional order matters: `codex resume [OPTIONS] [SESSION_ID] [PROMPT]`.
        // The hive identity prompt rides in `args` as a POSITIONAL (codex has no
        // prompt flag), so the id must come BEFORE it — appending the id last made
        // codex read the prompt as SESSION_ID ("No saved session found with ID
        // You are \"Dev2\"…") and the id as the prompt.
        if (args[0] !== rsub) { opts.args = [rsub, sid, ...args]; didResume = true; }
        console.log('[resume] codex resume', sid, 'in', ownerHome);
      }
    }
  }
  if (opts.requireResume === true && !didResume) {
    return {
      ok: false,
      error: 'Existing session could not be resumed; no replacement process was started.',
      ...(resumeNotFound ? { resumeNotFound: true } : {})
    };
  }
  // Remember which agent owns this PTY so closing the tab can archive it. A
  // live terminal means active — ensureAgent above already cleared `archived`.
  if (opts.hive?.id) {
    ptyToAgent.set(opts.id, opts.hive.id);
    // Worker inbox-wake watchdog (#151): boot grace starts at spawn so the
    // initial orientation prompt is never mistaken for an idle agent.
    workerWake.noteSpawn(opts.id);
  }
  // Pre-accept Claude Code's bypass-mode warning + folder-trust dialog so the
  // agent (spawned with --permission-mode bypassPermissions) doesn't stall on an
  // interactive prompt it can't answer and exit code 1. Best-effort, never blocks.
  // Claude-only — other CLIs handle their own permission UX.
  if (claudeProvider) {
    try { ensureClaudePermissionsAccepted(opts.cwd); } catch { /* never block spawn */ }
  }
  // Suppress first-run interactive prompts for providers that need it (e.g. Codex
  // directory-trust gate via CODEX_NON_INTERACTIVE). Merges into any env already
  // set on opts.
  const nonInteractiveEnv = nonInteractiveEnvForProvider(provider);
  if (Object.keys(nonInteractiveEnv).length > 0) {
    opts.env = { ...(opts.env ?? {}), ...nonInteractiveEnv };
  }
  // ── BYOK keys + per-provider config for the non-Claude CLI engines (v0.3.1) ──
  // OpenCode / Crush / pi / qwen read BYOK API keys from standard env vars and, for
  // the local-LLM path, a per-provider base URL. Keys are write-only in the broker
  // (read MAIN-ONLY here, never logged); base URLs ride HarnessConfig. Claude/codex
  // use their own login, so they skip this. Pam guardrails #3/#4/#5.
  if (opts.hive && (provider === 'opencode' || provider === 'crush' || provider === 'pi' || provider === 'qwen')) {
    const cfg = readConfig();
    const extra: Record<string, string> = {};
    // 1) BYOK keys — LEAST-PRIVILEGE (Pam/Jim NIT-2): inject ONLY the key for the
    //    spawned model's provider prefix when we can identify it; fall back to all
    //    stored keys when the model/prefix is unknown (default model, qwen slugs,
    //    custom). Reduces the blast radius vs handing every CLI all keys.
    const modelIdx = (opts.args ?? []).indexOf('--model');
    const modelSlug = modelIdx >= 0 ? (opts.args?.[modelIdx + 1] ?? '') : '';
    const prefix = modelSlug.includes('/') ? modelSlug.split('/')[0].toLowerCase() : '';
    const PREFIX_BACKEND: Record<string, string> = {
      anthropic: 'anthropic', openai: 'openai', google: 'google', gemini: 'google', groq: 'groq', openrouter: 'openrouter'
    };
    const scoped = PREFIX_BACKEND[prefix];
    const backends = scoped ? [scoped] : Object.keys(BACKEND_KEY_ENV);
    for (const backend of backends) {
      const key = integrations.getSecret(providerKeyRef(backend));
      if (!key) continue;
      extra[BACKEND_KEY_ENV[backend]] = key;
      // OpenCode/AI-SDK's Google provider reads GOOGLE_GENERATIVE_AI_API_KEY, not
      // GEMINI_API_KEY — inject both so google/* authenticates (Jim NIT #1).
      if (backend === 'google') extra.GOOGLE_GENERATIVE_AI_API_KEY = key;
    }
    // 2) Floor auto-state for pi's bundled extension auto-allow (guardrail #5): it
    //    only auto-approves tool calls when this is '1' (i.e. floor auto mode on).
    extra.HIVE_AUTO_APPROVE = cfg.autoMode ? '1' : '0';
    // 3) OpenCode's auto-approve + local provider live in its single config-injection
    //    env var, built dynamically so permission:allow is GATED on autoMode (#2).
    if (provider === 'opencode') {
      const oc: Record<string, unknown> = { autoupdate: false };
      if (cfg.autoMode) oc.permission = { edit: 'allow', bash: 'allow', webfetch: 'allow' };
      const baseUrl = cfg.providerBaseUrls?.opencode;
      if (baseUrl) {
        // Register the model id the user actually selects (the part after 'local/')
        // so `--model local/<id>` resolves; default to 'local'. Without this the
        // dropdown's `local/llama3` failed against a config that only declared model
        // 'local' (Jim verify-opencode MUST-FIX #2).
        const localModel = (prefix === 'local' && modelSlug.slice(6)) || 'local';
        oc.provider = {
          local: { npm: '@ai-sdk/openai-compatible', name: 'Local (self-hosted)', options: { baseURL: baseUrl }, models: { [localModel]: { name: localModel } } }
        };
      }
      extra.OPENCODE_CONFIG_CONTENT = JSON.stringify(oc);
    }
    opts.env = { ...(opts.env ?? {}), ...extra };
  }
  // Custom secrets (Settings > Keys & Secrets, founder batch 3): every agent,
  // whatever its CLI, gets each one as the env var of its name. Read MAIN ONLY
  // here; never over the harness's own vars (shared/customSecrets.ts).
  if (opts.hive) {
    const custom = customSecretEnv(customSecretNames(integrations.listSecretRefs()), integrations.getSecret, opts.env ?? {});
    if (Object.keys(custom).length > 0) opts.env = { ...(opts.env ?? {}), ...custom };
  }
  // Codex Remote is daemon-based (there is no `/remote-control` slash command).
  // Start/enable the daemon under this agent's isolated CODEX_HOME and connect
  // the TUI to it so the thread is visible in ChatGPT mobile. Best-effort: an
  // unavailable/older Codex install still gets a normal local terminal.
  if (provider === 'codex' && opts.hive?.id) {
    await enableCodexRemoteForSpawn(opts, opts.hive.id);
  }
  // The dev stagger, immediately before the real spawn and after every
  // step that could still refuse it, so a refused spawn does not wait for
  // nothing and the wait is the last thing between the gate and the PTY.
  const wait = slowSpawnDelayMs(process.env.MD_RESTORE_SLOW_MS, ++restoreSlowSeq, app.isPackaged);
  if (wait > 0) {
    console.log(`[dev] MD_RESTORE_SLOW_MS: spawn ${opts.id} waits ${wait} ms`);
    await new Promise((r) => setTimeout(r, wait));
  }
  const res = ptyManager.spawn(opts, owner);
  if (res.ok) analytics.track('agent_spawned', { provider });
  else analytics.track('agent_spawn_failed', { provider, reason: spawnFailReason(res.error) });
  if (res.ok) { loginWatcher.track(opts.id, provider); ptyOwners.set(opts.id, owner); }
  if (res.ok) {
    // Started again in the SAME folder: a worktree made above is reused, not
    // made twice (the renderer's revive does the same, isolate off).
    const wt = worktreePaths.get(opts.id);
    agentRuns.set(opts.id, {
      opts: { ...asGiven, ...(wt ? { cwd: wt, isolate: false } : {}), installNow: undefined, guidedSetup: undefined },
      owner, provider, printMode: isPrintModeRun(provider, opts.args ?? []), startedAt: Date.now()
    });
  } else agentRuns.delete(opts.id);
  syncKeepAwake(); // arm the power-save blocker while ≥1 agent PTY is alive (#18)
  // Hand the resolved worktree path back to the renderer so it can persist it on
  // the agent (only set when isolation actually provisioned a worktree above).
  // The restore flow re-enters this exact worktree (cwd = worktreePath) so a
  // restored isolated agent resumes in the CORRECT checkout, not the base repo.
  const worktreePath = worktreePaths.get(opts.id);
  // `cwd` echoes back the TILDE-EXPANDED absolute path so the renderer's agent
  // record matches what the registry and the PTY actually used.
  return { ...res, cwd: opts.cwd, ...(worktreePath ? { worktreePath } : {}), ...(resumeNotFound ? { resumeNotFound: true } : {}), ...(didResume ? { resumed: true } : {}), ...(seedPrompt ? { seedPrompt } : {}) };
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
    if (!prompt.trusted || prompt.recipe !== 'provider' || !loginHostAllowed(prompt.provider, prompt.url)) return { ok: false, error: 'link-not-vouched' };
    await shell.openExternal(prompt.url as string);
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
ipcMain.handle('pty:write', (_evt, id: string, data: string) => {
  if (typeof id !== 'string' || typeof data !== 'string') return { ok: false, error: 'invalid args' };
  // I2 part 2: a line the person submits to the CLI means they are at its
  // prompt, past any sign in; the watcher stops reading this pty (unless its
  // ask is still open: they may be typing the code in the terminal).
  if (/[\r\n]/.test(data)) loginWatcher.pastLogin(id);
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
  return res;
});
ipcMain.handle('pty:list', () => ptyManager.list());

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

/**
 * The two money-funnel events the renderer is the only one who can see:
 * `paywall_shown` (a purchase surface was drawn) and `access_blocked` (a dead
 * end was drawn instead). Everything else in the funnel happens in main and is
 * fired there, closer to the fact.
 *
 * THIS IS NOT A GENERAL WAY INTO track(). `isFunnelEvent` refuses any name
 * outside the six, and `trackFunnel` then checks every VALUE against its
 * closed enum and drops the whole event if one is unrecognised — because the
 * allowlist filters keys, not values, and everything arriving here is
 * untrusted input. Same reasoning as `isRendererMessageSurface` above.
 *
 * The two main-only events are refused here as well: they are fired at the
 * lines that actually know the outcome, so a renderer able to name them could
 * only ever double-count something main has already counted.
 */
const RENDERER_FUNNEL_EVENTS: ReadonlySet<string> = new Set([
  'paywall_shown', 'access_blocked', 'checkout_opened'
]);
ipcMain.handle('analytics:funnel', (_evt, event: unknown, props: unknown) => {
  if (!isFunnelEvent(event) || !RENDERER_FUNNEL_EVENTS.has(event)) return { ok: false };
  const clean: Record<string, string> = {};
  if (props && typeof props === 'object') {
    for (const [k, v] of Object.entries(props as Record<string, unknown>)) {
      if (typeof v === 'string') clean[k] = v;
    }
  }
  /* `checkout_opened` crosses this seam for TEAMS AND ONLY TEAMS.
     The PRO checkout is opened by `pro:checkout:begin` above, which fires it in
     main at the line that actually opens the URL — so a renderer allowed to
     name a PRO checkout could only ever double-count one main already counted.
     A teams checkout is a plain `window.open` in the renderer and main never
     sees it, which is why it has to cross at all. Refusing any other plan here
     makes that double count structurally impossible rather than a rule someone
     has to remember. */
  if (event === 'checkout_opened' && clean.plan !== 'teams') return { ok: false };
  /* No period is stamped here (0.5.1): `checkout_opened` no longer carries
     one, and a renderer that sends it is refused by the allowlist like any
     other unknown key. */
  analytics.trackFunnel(event, clean);
  return { ok: true };
});

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

// ─── IPC: integrations (Phase 2 registry — backend for Ryan's Settings UI) ────
// Records are metadata only (config-backed); secrets are encrypted at rest and NEVER
// returned over IPC. `list` redacts secretRef to a `hasSecret` boolean.
ipcMain.handle('integrations:list', () => integrations.listRecordsRedacted());
ipcMain.handle('integrations:templates', () => INTEGRATION_TEMPLATES);
ipcMain.handle('integrations:upsert', (_evt, record: unknown) => integrations.upsertRecord(record));
ipcMain.handle('integrations:setSecret', (_evt, payload: unknown) => {
  const p = (payload ?? {}) as { id?: unknown; secret?: unknown };
  if (typeof p.id !== 'string' || !p.id) return { ok: false, error: 'id required' };
  if (typeof p.secret !== 'string' || !p.secret) return { ok: false, error: 'secret required' };
  return integrations.setSecret(secretRefFor(p.id), p.secret);
});
ipcMain.handle('integrations:remove', (_evt, payload: unknown) => {
  const p = (payload ?? {}) as { id?: unknown };
  if (typeof p.id !== 'string' || !p.id) return { ok: false, error: 'id required' };
  return integrations.removeRecord(p.id);
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
  return integrations.setSecret(providerKeyRef(p.backend), p.key);
});
ipcMain.handle('providerKey:has', (_evt, backend: unknown) =>
  typeof backend === 'string' ? integrations.hasSecret(providerKeyRef(backend)) : false);
ipcMain.handle('providerKey:clear', (_evt, backend: unknown) => {
  if (typeof backend !== 'string' || !(backend in BACKEND_KEY_ENV)) return { ok: false, error: 'unknown backend' };
  try { integrations.deleteSecret(providerKeyRef(backend)); return { ok: true }; }
  catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
});
// ─── IPC: custom secrets (write only) ───────────────────────────────────────
// Settings > Keys & Secrets > Add custom secret. A name and a value; the value
// is encrypted in the same store as the provider keys under `env:<NAME>` and
// never comes back: the renderer can list NAMES, set one, or remove one.
ipcMain.handle('customSecret:list', () => customSecretNames(integrations.listSecretRefs()));
ipcMain.handle('customSecret:set', (_evt, payload: unknown) => {
  const p = (payload ?? {}) as { name?: unknown; value?: unknown };
  if (typeof p.name !== 'string') return { ok: false, error: 'name required' };
  const problem = secretNameProblem(p.name);
  if (problem) return { ok: false, error: `${p.name || 'name'}: ${problem === 'reserved' ? 'the harness sets this one itself' : 'use only capitals, digits and underscores'}` };
  if (typeof p.value !== 'string' || !p.value) return { ok: false, error: 'value required' };
  return integrations.setSecret(customSecretRef(p.name), p.value);
});
ipcMain.handle('customSecret:remove', (_evt, name: unknown) => {
  if (typeof name !== 'string' || secretNameProblem(name)) return { ok: false, error: 'unknown secret' };
  try { integrations.deleteSecret(customSecretRef(name)); return { ok: true }; }
  catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
});
// Probe an integration's reachability through the broker's own auth path (admin-only;
// runs in main, so the secret is used but never returned — only the upstream status).
ipcMain.handle('integrations:test', async (_evt, payload: unknown) => {
  const p = (payload ?? {}) as { id?: unknown; path?: unknown };
  if (typeof p.id !== 'string' || !p.id) return { ok: false, error: 'id required' };
  const rec = integrations.getRecord(p.id);
  if (!rec) return { ok: false, error: 'unknown integration' };
  const probe = validateBaseUrl(rec.baseUrl);
  if (!probe.ok) return { ok: false, error: probe.error };
  // Confine the probe path through the SAME gate as the worker forward() path, so an
  // absolute URL / backslash-host / traversal in p.path can't override the origin and
  // exfiltrate the secret to an attacker host. Resolve (and reject) BEFORE the secret
  // is ever materialized, so a bad path never even decrypts it.
  const target = resolveUpstreamUrl(rec.baseUrl, typeof p.path === 'string' ? p.path : '');
  if (!target) return { ok: false, error: 'path escapes the integration baseUrl', code: 'bad_request' };
  const secret = integrations.getSecret(rec.secretRef);
  // Both halves: a query-parameter API carries its credential in the URL, so a
  // probe that merged only the headers would report 401 on a working key.
  const { headers, query } = buildAuthRequest(rec, secret);
  for (const [k, v] of Object.entries(query)) target.searchParams.set(k, v);
  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 15_000);
    const r = await fetch(target, { method: 'GET', headers, redirect: 'manual', signal: ac.signal });
    clearTimeout(timer);
    return { ok: r.ok, status: r.status };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
});

// ─── IPC: config ────────────────────────────────────────────────────────────
ipcMain.handle('config:get', (): HarnessConfig => readConfig());
// `--no-god` / MD_NO_GOD=1, DEV BUILDS ONLY: the renderer skips booting the
// orchestrator. Every launch otherwise spawns a real, paid `claude` session
// (resolved by absolute path, so a stripped PATH does not stop it); a UI check
// on a throwaway home has no use for one. Ignored in a packaged app so the
// switch can never reach a user.
const DEV_NO_GOD = !app.isPackaged && (process.argv.includes('--no-god') || process.env.MD_NO_GOD === '1');
if (DEV_NO_GOD) console.log('[dev] --no-god: the orchestrator will not be spawned');
ipcMain.handle('dev:noGod', (): boolean => DEV_NO_GOD);
ipcMain.handle('config:update', (_evt, patch: Partial<HarnessConfig>) => {
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
});
ipcMain.handle('config:setAgentTokenCap', (_evt, agentId: unknown, tokenCap: unknown) =>
  setAgentTokenCap(agentId, tokenCap)
);
ipcMain.handle('config:setAgentMcp', (_evt, agentId: unknown, mcpId: unknown, enabled: unknown) =>
  setAgentMcp(agentId, mcpId, enabled)
);
// Sprite editor: create / update / delete a custom avatar. Validated and merged
// in main against the config on disk, like the two handlers above.
ipcMain.handle('config:saveAvatar', (_evt, input: unknown) => saveAvatar(input));
ipcMain.handle('config:deleteAvatar', (_evt, id: unknown) => deleteAvatar(id));
ipcMain.handle('config:ensureHome', (_evt, path: unknown) => {
  if (typeof path !== 'string' || path.length === 0) return { ok: false, error: 'invalid path' };
  return ensureHarnessHome(path);
});

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

  if (mode === 'move' && oldHome) {
    try {
      // roster.json + its backups ride along with hive/palace: the roster is the
      // renderer's half of the same state, and leaving it behind would move the
      // agents' sessions and memory to the new home while their names, notes and
      // worktree paths stayed at the old one.
      for (const sub of ['hive', 'palace', 'roster.json', 'roster-backups']) {
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

// ─── IPC: filesystem (sandboxed to a root) ──────────────────────────────────
ipcMain.handle('fs:listDir', (_evt, root: unknown, rel: unknown) => {
  if (typeof root !== 'string' || typeof rel !== 'string') return { ok: false, error: 'invalid args' };
  return listDir(root, rel);
});
ipcMain.handle('fs:readFile', (_evt, root: unknown, rel: unknown) => {
  if (typeof root !== 'string' || typeof rel !== 'string') return { ok: false, error: 'invalid args' };
  return readFileText(root, rel);
});
// Raw bytes for files the text reader refuses (images). The renderer cannot
// load them off disk itself — the CSP has no `file:` source and no file
// protocol is registered — so the bytes come through here and become a `blob:`
// URL on the other side. Same root confinement as every other fs handler.
ipcMain.handle('fs:readBinary', (_evt, root: unknown, rel: unknown) => {
  if (typeof root !== 'string' || typeof rel !== 'string') return { ok: false, error: 'invalid args' };
  return readFileBinary(root, rel);
});
ipcMain.handle('fs:writeFile', (_evt, root: unknown, rel: unknown, content: unknown) => {
  if (typeof root !== 'string' || typeof rel !== 'string' || typeof content !== 'string') {
    return { ok: false, error: 'invalid args' };
  }
  return writeFileText(root, rel, content);
});
// v0.3.4: existence check for the terminal ⌘-click markdown flow (metadata only).
ipcMain.handle('fs:statAbs', (_evt, p: unknown) => {
  if (typeof p !== 'string' || p.length > 4096 || p.includes('\0')) {
    return { exists: false, isFile: false, path: '' };
  }
  return statAbs(p);
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
 *  openPath IS used for a directory, and only after statAbs has confirmed it is
 *  one — a directory has no default application to launch, so the execution
 *  argument above does not apply, and revealing a folder inside its parent is
 *  not what "open this folder" means to anyone. */
ipcMain.handle('fs:revealPath', async (_evt, p: unknown) => {
  if (typeof p !== 'string' || !p.length || p.length > 4096 || p.includes('\0')) {
    return { ok: false, error: 'bad request' };
  }
  const st = await statAbs(p);
  if (!st.exists) return { ok: false, error: 'not found' };
  if (st.isFile) { shell.showItemInFolder(st.path); return { ok: true }; }
  const err = await shell.openPath(st.path);
  return err ? { ok: false, error: err } : { ok: true };
});

/* ─── IPC: search and file operations (0.4.9 phase 9, the IDE) ──────────────
 * Same root confinement as every handler above: the renderer names a root and
 * a path relative to it, and fs.ts decides whether that pair is allowed. The
 * renderer is never trusted with an absolute path here.
 */
ipcMain.handle('fs:search', (_evt, root: unknown, query: unknown, opts: unknown) => {
  if (typeof root !== 'string' || typeof query !== 'string') return { ok: false, error: 'invalid args' };
  if (query.length > 1024) return { ok: false, error: 'query too long' };
  const o = (opts && typeof opts === 'object' ? opts : {}) as Record<string, unknown>;
  return searchInRoot(root, query, {
    regex: o.regex === true,
    caseSensitive: o.caseSensitive === true,
    wholeWord: o.wholeWord === true,
    maxHits: typeof o.maxHits === 'number' ? o.maxHits : undefined
  });
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
  if (typeof root !== 'string' || typeof from !== 'string' || typeof to !== 'string') {
    return { ok: false, error: 'invalid args' };
  }
  return renameIn(root, from, to);
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

// ─── IPC: git ───────────────────────────────────────────────────────────────
ipcMain.handle('git:isRepo', (_evt, cwd: unknown) => {
  if (typeof cwd !== 'string') return false;
  return isRepo(cwd);
});

// The repo a cwd belongs to, following a linked worktree back to its main
// checkout — the renderer groups the agent roster by this.
ipcMain.handle('git:mainRepo', (_evt, cwd: unknown) => {
  if (typeof cwd !== 'string' || !cwd) return null;
  return mainRepoRoot(cwd);
});
ipcMain.handle('git:branch', (_evt, cwd: unknown) => {
  if (typeof cwd !== 'string') return { error: 'invalid cwd' };
  return getBranch(cwd);
});
ipcMain.handle('git:status', (_evt, cwd: unknown) => {
  if (typeof cwd !== 'string') return { error: 'invalid cwd' };
  return getStatus(cwd);
});
ipcMain.handle('git:log', (_evt, cwd: unknown, n: unknown) => {
  if (typeof cwd !== 'string') return { error: 'invalid cwd' };
  const count = typeof n === 'number' ? Math.min(500, Math.max(1, n)) : 50;
  return getLog(cwd, count);
});
ipcMain.handle('git:branches', (_evt, cwd: unknown) => {
  if (typeof cwd !== 'string') return { error: 'invalid cwd' };
  return getBranches(cwd);
});
ipcMain.handle('git:aheadBehind', (_evt, cwd: unknown) => {
  if (typeof cwd !== 'string') return { error: 'invalid cwd' };
  return getAheadBehind(cwd);
});
ipcMain.handle('git:diff', (_evt, cwd: unknown, relPath: unknown) => {
  if (typeof cwd !== 'string' || typeof relPath !== 'string') {
    return { ok: false, error: 'invalid args' };
  }
  return getDiff(cwd, relPath);
});
// ─── v0.3.4: history / compare / checkout (git visualization) ───────────────
ipcMain.handle('git:logGraph', (_evt, cwd: unknown, n: unknown, skip: unknown) => {
  if (typeof cwd !== 'string') return { error: 'invalid args' };
  const count = Math.min(500, Math.max(1, typeof n === 'number' ? n : 200));
  const off = Math.max(0, typeof skip === 'number' ? skip : 0);
  return getLogGraph(cwd, count, off);
});
ipcMain.handle('git:commitFiles', (_evt, cwd: unknown, sha: unknown) => {
  if (typeof cwd !== 'string' || typeof sha !== 'string') return { error: 'invalid args' };
  return getCommitFiles(cwd, sha);
});
ipcMain.handle('git:showFile', (_evt, cwd: unknown, rev: unknown, relPath: unknown) => {
  if (typeof cwd !== 'string' || typeof rev !== 'string' || typeof relPath !== 'string') {
    return { ok: false, error: 'invalid args' };
  }
  return getFileAtRev(cwd, rev, relPath);
});
ipcMain.handle('git:compareRefs', (_evt, cwd: unknown, base: unknown, head: unknown, mode: unknown) => {
  if (typeof cwd !== 'string' || typeof base !== 'string' || typeof head !== 'string') {
    return { error: 'invalid args' };
  }
  return compareRefs(cwd, base, head, mode === 'two' ? 'two' : 'three');
});
ipcMain.handle('git:worktrees', (_evt, cwd: unknown) => {
  if (typeof cwd !== 'string') return { error: 'invalid args' };
  return listWorktrees(cwd);
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
    baseFor: (p) => bases.get(p)
  };
}
ipcMain.handle('worktrees:list', () => listOwnedWorktrees(worktreeAdminContext()));
ipcMain.handle('worktrees:work', (_evt, wtPath: unknown) => {
  if (typeof wtPath !== 'string') return null;
  return worktreeWork(wtPath, worktreeAdminContext());
});
ipcMain.handle('worktrees:size', (_evt, wtPath: unknown) => {
  if (typeof wtPath !== 'string') return null;
  return worktreeSize(wtPath, worktreeAdminContext().roots);
});
ipcMain.handle('worktrees:remove', async (_evt, wtPath: unknown, confirmed: unknown) => {
  if (typeof wtPath !== 'string') return { ok: false, code: 'outside' };
  const res = await removeOwnedWorktree(wtPath, confirmed === true, worktreeAdminContext());
  if (res.ok) {
    // A preserved temp's tree removed by hand: stop the sweep watching it.
    preservedWorktrees.delete(wtPath);
    console.warn(`[worktree] removed by a person from the worktree list: ${wtPath}`);
  }
  return res;
});
ipcMain.handle('git:checkout', async (_evt, cwd: unknown, ref: unknown, detach: unknown) => {
  if (typeof cwd !== 'string' || typeof ref !== 'string') return { ok: false, error: 'invalid args' };
  // Guard: never swap files under an actively-working agent. Objective signal
  // owned by main — any live pty whose cwd sits in this tree and emitted output
  // in the last 10s is treated as mid-run. (Idle-but-open terminals are fine:
  // checkoutRef additionally requires a clean tree, and TUIs redraw on fs
  // changes gracefully.)
  const busy = ptyManager.list().find((p) =>
    (p.cwd === cwd || p.cwd.startsWith(cwd.endsWith('/') ? cwd : `${cwd}/`)) &&
    Date.now() - p.lastOutputAt < 10_000
  );
  if (busy) {
    return { ok: false, error: `an agent is actively working in this repo (${busy.id}) — try again when it goes quiet` };
  }
  return checkoutRef(cwd, ref, detach === true);
});

// ─── IPC: roster mirror (shared between dev and a packaged build) ───────────
// The renderer's store is built synchronously at module load, before any async
// IPC could resolve, so the read is `ipcMain.on` + `returnValue` — one blocking
// round trip at boot, in exchange for the roster being correct on first paint
// instead of flashing an empty floor and then filling in.
// (`roster` itself is constructed earlier so HookServer can read standing goals.)
ipcMain.on('roster:readSync', (evt) => { evt.returnValue = roster.read(); });
ipcMain.on('config:homeSync', (evt) => { evt.returnValue = readConfig().harnessHome ?? null; });
ipcMain.handle('roster:read', () => roster.read());
ipcMain.handle('roster:write', (_evt, snap: unknown) => roster.write(snap));

// ─── IPC: hive (multi-agent coordination) ───────────────────────────────────
ipcMain.handle('hive:registry', () => hive.registry());
ipcMain.handle('hive:renameAgent', (_evt, id: unknown, name: unknown) => {
  if (typeof id !== 'string' || typeof name !== 'string') {
    return { ok: false, error: 'Invalid rename request' };
  }
  return hive.renameAgent(id, name);
});
ipcMain.handle('hive:setAgentHold', (_evt, id: unknown, hold: unknown) => {
  if (typeof id !== 'string' || typeof hold !== 'boolean') {
    return { ok: false, error: 'Invalid hold request' };
  }
  return hive.setAgentHold(id, hold);
});
// 0.5.3, F25: the Pro rail's unread badge. The renderer hands in its per agent
// last-opened stamps and gets counts, stamps and three short texts back.
ipcMain.handle('hive:humanMailSince', (_evt, since: unknown) => {
  const map: Record<string, string> = {};
  if (since && typeof since === 'object') {
    for (const [k, v] of Object.entries(since as Record<string, unknown>)) if (typeof v === 'string') map[k] = v;
  }
  return hive.humanMailSince(map);
});
ipcMain.handle('hive:board', () => hive.board());

// ─── Dictate into any app (0.5.3, F16, macOS) ─────────────────────────────
// The loop lives in src/main/transcribe/anyApp.ts; these handlers are what a
// Settings section calls. The renderer starts it with the key, stops it, asks
// for the three permission states and opens the right pane. Events (key down,
// transcribing, injected, errors) go to the window as 'anyApp:event'. The
// transcriber is md-speech on macOS 26; the router (Kevin's PR) replaces
// `anyAppTranscriber` so md-whisper serves older Macs.
let anyAppLoop: AnyAppDictation | null = null;
let anyAppSpeech: MdSpeech | null = null;
const anyAppResources = (): string => (app.isPackaged ? process.resourcesPath : join(__dirname, '../../resources'));
/** Why the switch is off here, or null: a floor (B23, the main floor owns the
 *  machine wide key), no helper in this build, or a Wayland session. */
const anyAppReason = () => anyAppUnavailableReason(anyAppResources(), process.platform, process.env, { floor: isFloorProcess() });
function anyAppTranscriber(): AnyAppTranscriber | null {
  // 24 Sep: the loop follows the engine the router picks for dictation. Apple
  // keeps md-speech and its stream; anything else goes through the router.
  const router = getTranscribeRouter();
  const engine = router.status().chosen.dictation;
  if (engine !== 'apple') {
    if (!engine) return null;
    return anyAppViaRouter((wav) => router.transcribe({ audio: wav, mimeType: 'audio/wav', mode: 'dictation' }));
  }
  if (!mdSpeechAvailable(anyAppResources())) return null;
  anyAppSpeech ??= new MdSpeech(mdSpeechPath(anyAppResources()));
  const speech = anyAppSpeech;
  return {
    transcribe: (req, onPartial) => speech.transcribe({ ...req, autoInstall: true }, onPartial),
    // The streamed path: chunks while the key is held, final text a moment
    // after key up. The loop falls back to transcribe() if this is refused.
    openStream: (req, onPartial) => speech.openStream(req, onPartial)
  };
}
/** Reserve the asset and load the model before the first press: a cold
 *  helper made the first utterance wait 3 to 4 s (23 Sep). Once per helper. */
let anyAppWarmed: MdSpeech | null = null;
function warmAnyAppSpeech(): void {
  const speech = anyAppSpeech;
  if (!speech || anyAppWarmed === speech) return;
  anyAppWarmed = speech;
  void speech.install('en_US').then(() => speech.warm('en_US'))
    .then((r) => console.log(`[anyApp] md-speech warm in ${r.ms} ms`))
    .catch((e) => { anyAppWarmed = null; console.log(`[anyApp] warm: ${e instanceof Error ? e.message : String(e)}`); });
}
/** Every any app event goes to the Stapler (0.5.3, founder 24 Sep: its
 *  eyes, a live level, start and stop sounds); all but the level also go to
 *  the main window, which has no meter to feed. */
function anyAppEvent(e: AnyAppEvent): void {
  puckDictationEvent(e, withTranscribeDefaults(readConfig().transcribe).dictationSounds);
  if (e.type === 'level') return;
  const wc = mainWindow?.webContents;
  if (wc && !wc.isDestroyed()) wc.send('anyApp:event', e);
}
/** What has focus inside the main window, as its renderer last said
 *  (shared/dictationFocus). */
let mainDictationFocus: DictationFocus = 'other';
ipcMain.on('dictation:focus', (e, focus: unknown) => {
  if (!mainWindow || e.sender !== mainWindow.webContents) return;
  mainDictationFocus = focus === 'composer' || focus === 'field' || focus === 'password' ? focus : 'other';
});
/** Our own window focused: a held Option in a text field is dictated into
 *  that field from here, like in any app (founder, 25 Sep 2026: "like memory
 *  search"); on the composer or the terminal Free Flow's own hold owns it
 *  when on (freeflow/holdOption.ts), so this take is dropped rather than both
 *  recording the same words; a password field is nobody's. */
function anyAppIgnoresTake(): boolean {
  const focused = BrowserWindow.getFocusedWindow();
  if (!focused || focused !== mainWindow) return false;
  // Free Flow is always on (batch 3): it takes the composer's holds.
  return anyAppStandsAside(true, mainDictationFocus);
}
ipcMain.handle('anyApp:status', async () => {
  // F16, Windows and Linux (23 Sep): available on every platform that has its
  // helper, except a Wayland session or a floor; `reason` says why when it is
  // not, so nobody flips a switch that would silently do nothing.
  const reason = anyAppReason();
  const available = reason === null;
  const loop = anyAppLoop ?? (available ? new AnyAppDictation({ helperPath: mdHotkeyPath(anyAppResources()), key: defaultPushToTalkKeyFor(process.platform), transcriber: { transcribe: async () => ({ text: '' }) } }) : null);
  let permissions: AnyAppPermissions | null = null;
  if (loop) { try { permissions = await loop.permissions(); } catch { permissions = null; } }
  if (!anyAppLoop && loop) await loop.stop();
  return { available, reason, platform: process.platform, armed: anyAppLoop?.armed ?? null, transcriber: anyAppTranscriber() ? getTranscribeRouter().status().chosen.dictation : null, permissions };
});
/** Arm the push to talk key with this vocabulary. Words are read fresh for
 *  every utterance from the router (the shipped list plus the user's), unless
 *  a caller pins a list. */
async function startAnyApp(key: string, words?: string[]): Promise<{ ok: true; key: string; keyCode: number; stream: boolean } | { ok: false; error: string; detail?: string }> {
  // The hotkey is machine wide (a CGEventTap on macOS, a low level keyboard
  // hook on Windows, an X grab on Linux): two floors armed would both dictate
  // and both paste. The main install arms it; a floor never does.
  if (isFloorProcess()) return { ok: false, error: 'main-floor-only', detail: 'Dictate into any app is armed by the main floor' };
  const reason = anyAppReason();
  if (reason) return { ok: false, error: 'not-available', detail: reason };
  const transcriber = anyAppTranscriber();
  if (!transcriber) return { ok: false, error: 'no-transcriber' };
  if (anyAppLoop) await anyAppLoop.stop();
  anyAppLoop = new AnyAppDictation({
    helperPath: mdHotkeyPath(anyAppResources()),
    key: key || defaultPushToTalkKeyFor(process.platform),
    transcriber,
    words: words ? () => words : () => getTranscribeRouter().words(),
    onEvent: anyAppEvent,
    ignore: anyAppIgnoresTake
  });
  try {
    const r = await anyAppLoop.start();
    if (getTranscribeRouter().status().chosen.dictation === 'apple') warmAnyAppSpeech();
    return { ok: true, ...r };
  } catch (e) {
    const code = e instanceof HelperError ? e.code : 'start-failed';
    await anyAppLoop.stop().catch(() => { /* gone */ });
    anyAppLoop = null;
    return { ok: false, error: code, detail: e instanceof Error ? e.message : String(e) };
  }
}
/** 0.5.3, F16: the switch in Settings is the truth. On, with this key: armed;
 *  off: disarmed. Called at launch and after every transcribe:setConfig. */
async function syncAnyAppToConfig(t: TranscribeConfig = withTranscribeDefaults(readConfig().transcribe)): Promise<void> {
  if (anyAppReason()) return;
  if (!t.anyApp) { if (anyAppLoop) { await anyAppLoop.stop(); anyAppLoop = null; } return; }
  if (anyAppLoop && anyAppLoop.armed === t.pushToTalkKey) return;
  const r = await startAnyApp(t.pushToTalkKey);
  if (!r.ok) { console.log(`[anyApp] could not arm ${t.pushToTalkKey}: ${r.error}${r.detail ? ` (${r.detail})` : ''}`); return; }
  await askAnyAppPermissionsOnce();
}
/** On by default since 0.5.3, so the first arm is the first use: ask for
 *  the Microphone and Accessibility the normal way, once per launch, and when
 *  either is still missing tell the Stapler, which shows one button to fix it.
 *  Without Accessibility the Option hold is never heard at all, so waiting
 *  for a press to find out would be a silent failure. */
let anyAppAsked = false;
async function askAnyAppPermissionsOnce(): Promise<void> {
  const loop = anyAppLoop;
  if (!loop) return;
  try {
    let p = await loop.permissions();
    if (!anyAppAsked) {
      anyAppAsked = true;
      if (p.mic === 'notDetermined') await loop.requestMic();
      if (!p.accessibility) await loop.requestAccessibility();
      p = await loop.permissions();
    }
    const missing = p.mic !== 'authorized' ? 'microphone' : !p.accessibility ? 'accessibility' : null;
    if (missing) puckDictationEvent({ type: 'error', error: 'permission', detail: missing }, false);
  } catch (e) {
    console.log(`[anyApp] permissions: ${e instanceof Error ? e.message : String(e)}`);
  }
}
/** THE MEETING CHORD (0.5.3, F16, founder 23 Sep): Shift+Command+Space on
 *  the Mac, Control+Shift+Space on Windows and Linux, or the chord under
 *  Dictation & Meetings. One press starts a Stapler meeting through the same
 *  path as a click on the puck's recorder, a second press stops it. Its own
 *  md-hotkey process (the tap op), beside the any app loop. Armed at launch
 *  and after every transcribe:setConfig; a floor never arms it (a chord is
 *  machine wide, the main install owns it, exactly as any app). */
let meetingHotkey: MeetingHotkey | null = null;
let meetingHotkeyError: { reason: string; detail?: string } | null = null;
function meetingHotkeyReason(): string | null {
  // The chord and push to talk share the helper and its limits, so one
  // function answers for both (anyAppReason: a floor, a Wayland session, no
  // helper in this build), known from the environment before the helper is
  // spawned for nothing. This row's word for a missing helper is not-available.
  const r = anyAppReason();
  return r === 'no-helper' ? 'not-available' : r;
}
async function syncMeetingHotkeyToConfig(t: TranscribeConfig = withTranscribeDefaults(readConfig().transcribe)): Promise<void> {
  if (meetingHotkeyReason()) return;
  const key = meetingKeyFor(t.meetingKey, process.platform);
  if (meetingHotkey && meetingHotkey.armed === key) return;
  if (meetingHotkey) { await meetingHotkey.stop(); meetingHotkey = null; }
  const problem = hotkeyProblem(key, process.platform);
  if (problem) { meetingHotkeyError = { reason: 'bad-key', detail: problem }; console.log(`[meetingKey] not a chord: ${key} (${problem})`); return; }
  // One chord, one meaning: the helpers refuse a chord held by the other
  // slot (in-use-by-arm); the same answer here without asking, and before
  // any app is even on, so Settings says it the moment it is typed.
  if (sameChord(key, t.pushToTalkKey)) { meetingHotkeyError = { reason: 'register-failed', detail: 'in-use-by-arm' }; console.log(`[meetingKey] ${key} is the push to talk key`); return; }
  const loop = new MeetingHotkey({
    helperPath: mdHotkeyPath(anyAppResources()),
    key,
    onToggle: () => { const r = toggleMeetingByKey(); console.log(`[meetingKey] ${key}: ${r.ok ? 'toggled' : r.error}`); }
  });
  try {
    await loop.start();
    meetingHotkey = loop;
    meetingHotkeyError = null;
    console.log(`[meetingKey] armed ${key}`);
  } catch (e) {
    meetingHotkeyError = { reason: e instanceof HelperError ? e.code : 'start-failed', detail: e instanceof Error ? e.message : String(e) };
    console.log(`[meetingKey] could not arm ${key}: ${meetingHotkeyError.reason} (${meetingHotkeyError.detail})`);
  }
}
/** THE CAPTURE CHORD (I6, founder 23 Sep 2026): a press opens the Stapler's
 *  capture box, a second takes the picture. Its own md-hotkey process, the
 *  same tap op and the same checks as the meeting chord. Armed by default:
 *  Control+Shift+5 on the Mac, Control+Shift+PrintScreen elsewhere. */
let captureHotkey: MeetingHotkey | null = null;
let captureHotkeyError: { reason: string; detail?: string } | null = null;
async function syncCaptureHotkeyToConfig(t: TranscribeConfig = withTranscribeDefaults(readConfig().transcribe)): Promise<void> {
  if (meetingHotkeyReason()) return;
  const key = captureKeyFor(t.captureKey, process.platform);
  if (captureHotkey && captureHotkey.armed === key) return;
  if (captureHotkey) { await captureHotkey.stop(); captureHotkey = null; }
  captureHotkeyError = null;
  const problem = hotkeyProblem(key, process.platform);
  if (problem) { captureHotkeyError = { reason: 'bad-key', detail: problem }; console.log(`[captureKey] not a chord: ${key} (${problem})`); return; }
  // One chord, one meaning: never the push to talk key, never the meeting's.
  if (sameChord(key, t.pushToTalkKey)) { captureHotkeyError = { reason: 'register-failed', detail: 'in-use-by-arm' }; return; }
  if (sameChord(key, meetingKeyFor(t.meetingKey, process.platform))) { captureHotkeyError = { reason: 'register-failed', detail: 'in-use-by-meeting' }; return; }
  const loop = new MeetingHotkey({
    helperPath: mdHotkeyPath(anyAppResources()),
    key,
    onToggle: () => { void captureByKey().then((r) => console.log(`[captureKey] ${key}: ${r.ok ? r.step : r.error}`)); }
  });
  try {
    await loop.start();
    captureHotkey = loop;
    console.log(`[captureKey] armed ${key}`);
  } catch (e) {
    captureHotkeyError = { reason: e instanceof HelperError ? e.code : 'start-failed', detail: e instanceof Error ? e.message : String(e) };
    // PrintScreen comes with the next Windows and Linux helper build (#60):
    // an older helper refusing it is a build to wait for, not a wrong chord.
    if (captureHotkeyError.reason === 'bad-key' && needsNewHelperKey(key)) captureHotkeyError = { reason: 'needs-helper' };
    console.log(`[captureKey] could not arm ${key}: ${captureHotkeyError.reason} (${captureHotkeyError.detail})`);
  }
}
ipcMain.handle('captureHotkey:status', () => {
  const t = withTranscribeDefaults(readConfig().transcribe);
  return {
    platform: process.platform,
    key: captureKeyFor(t.captureKey, process.platform),
    defaultKey: defaultCaptureKey(process.platform),
    armed: captureHotkey?.armed ?? null,
    reason: meetingHotkeyReason() ?? captureHotkeyError?.reason ?? null,
    detail: captureHotkeyError?.detail
  };
});
ipcMain.handle('meetingHotkey:status', () => {
  const t = withTranscribeDefaults(readConfig().transcribe);
  return {
    platform: process.platform,
    key: meetingKeyFor(t.meetingKey, process.platform),
    defaultKey: defaultMeetingKey(process.platform),
    armed: meetingHotkey?.armed ?? null,
    reason: meetingHotkeyReason() ?? meetingHotkeyError?.reason ?? null,
    detail: meetingHotkeyError?.detail
  };
});
ipcMain.handle('anyApp:start', async (_evt, key: unknown, words: unknown) => {
  const list = Array.isArray(words) ? words.filter((w): w is string => typeof w === 'string') : undefined;
  return startAnyApp(typeof key === 'string' && key ? key : defaultPushToTalkKeyFor(process.platform), list && list.length ? list : undefined);
});
/* ---- the other side of the call, macOS (0.5.3, F16, PR 2) ------------------
 * One resident md-tap for the app's life, spawned on first use. Its chunks
 * go straight into the puck's ring (meetingSystemAudio.push), which cuts them
 * to the microphone's segments. The grant is asked of the helper and kept
 * here so a meeting start does not wait on a round trip; `systemAudio:status`
 * refreshes it for the Settings row (PR 5). */
let systemTap: SystemTap | null = null;
let systemTapGranted = false;
const systemTapResources = (): string => (app.isPackaged ? process.resourcesPath : join(__dirname, '../../resources'));
function systemTapReady(): boolean { return mdTapAvailable(systemTapResources()); }
function getSystemTap(): SystemTap | null {
  if (!systemTapReady()) return null;
  systemTap ??= new SystemTap(mdTapPath(systemTapResources()), (e) => {
    if (e.type === 'chunk') meetingSystemAudio.push(e.chunk.pcm16, e.chunk.ts);
    else if (e.type === 'error') { console.log(`[systemTap] ${e.error}${e.detail ? `: ${e.detail}` : ''}`); if (e.error === 'screen-denied') systemTapGranted = false; }
    else if (e.type === 'helper-exited') console.log(`[systemTap] helper exited: ${e.why}`);
  });
  return systemTap;
}
async function systemAudioStatus(): Promise<{ platform: NodeJS.Platform; available: boolean; granted: boolean; source: 'helper' | 'renderer' | null; reason?: string; detail?: string }> {
  if (process.platform === 'darwin') {
    if (!systemTapReady()) return { platform: 'darwin', available: false, granted: false, source: null, reason: mdTapAvailable(systemTapResources(), 'darwin', '22.0.0') ? 'macos-too-old' : 'no-helper' };
    const tap = getSystemTap();
    try { systemTapGranted = (await tap!.permissions()).screen; } catch { systemTapGranted = false; }
    return { platform: 'darwin', available: true, granted: systemTapGranted, source: systemTapGranted ? 'helper' : null, reason: systemTapGranted ? undefined : 'screen-not-granted' };
  }
  // Windows: Electron's loopback capture of the screen's audio, no grant to
  // ask for (PR 3).
  if (process.platform === 'win32') return { platform: 'win32', available: true, granted: true, source: 'renderer' };
  // Linux (PR 4): the monitor of the output device, as the puck last found
  // it; nothing to grant, X11 or Wayland alike. No monitor listed: the
  // meeting is the microphone alone and the Settings row says why.
  if (process.platform === 'linux') {
    return linuxMonitor
      ? { platform: 'linux', available: true, granted: true, source: 'renderer', detail: linuxMonitor.label }
      : { platform: 'linux', available: false, granted: true, source: null, reason: 'no-monitor' };
  }
  return { platform: process.platform, available: false, granted: false, source: null, reason: 'not-yet' };
}
/** Linux: what the puck's renderer found in enumerateDevices, reported at
 *  its load and on every device change (puck/systemAudio.ts watchMonitor). */
let linuxMonitor: { deviceId: string; label: string } | null = null;
ipcMain.on('systemAudio:monitor', (_e, m: unknown) => {
  const ok = !!m && typeof m === 'object' && typeof (m as { deviceId?: unknown }).deviceId === 'string' && typeof (m as { label?: unknown }).label === 'string';
  const next = ok ? { deviceId: (m as { deviceId: string }).deviceId, label: (m as { label: string }).label } : null;
  if ((next?.label ?? null) !== (linuxMonitor?.label ?? null)) console.log(`[systemAudio] linux monitor: ${next ? next.label : 'none'}`);
  linuxMonitor = next;
});
ipcMain.handle('systemAudio:status', () => systemAudioStatus());
ipcMain.handle('systemAudio:request', async () => {
  const tap = getSystemTap();
  if (!tap) return { ok: false, error: 'not-available' };
  try { const r = await tap.requestPermission(); systemTapGranted = r.screen; return { ok: true, granted: r.screen }; } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
});
ipcMain.handle('systemAudio:openSettings', async () => {
  const tap = getSystemTap();
  if (!tap) return { ok: false, error: 'not-available' };
  return { ok: await tap.openSettings() };
});
// Read the grant once at launch so the first meeting knows.
void systemAudioStatus().catch(() => { /* answered on the next status */ });

ipcMain.handle('anyApp:stop', async () => { if (anyAppLoop) { await anyAppLoop.stop(); anyAppLoop = null; } return { ok: true }; });
async function withAnyAppHelper<T>(fn: (loop: AnyAppDictation) => Promise<T>): Promise<T | { ok: false; error: string }> {
  if (anyAppReason()) return { ok: false, error: 'not-available' };
  if (anyAppLoop) return fn(anyAppLoop);
  const tmp = new AnyAppDictation({ helperPath: mdHotkeyPath(anyAppResources()), key: defaultPushToTalkKeyFor(process.platform), transcriber: { transcribe: async () => ({ text: '' }) } });
  try { return await fn(tmp); } finally { await tmp.stop(); }
}
ipcMain.handle('anyApp:requestMic', () => withAnyAppHelper(async (l) => ({ ok: true, mic: await l.requestMic() })));
ipcMain.handle('anyApp:requestAccessibility', () => withAnyAppHelper(async (l) => ({ ok: true, accessibility: await l.requestAccessibility() })));
ipcMain.handle('anyApp:openSettings', (_evt, pane: unknown) => withAnyAppHelper(async (l) => ({ ok: await l.openSettings(pane === 'microphone' ? 'microphone' : 'accessibility') })));
ipcMain.handle('anyApp:testPaste', (_evt, text: unknown) => withAnyAppHelper(async (l) => {
  try { return { ok: true, ...(await l.inject(typeof text === 'string' ? text : 'Munder Difflin can type here.')) }; }
  catch (e) { return { ok: false, error: e instanceof HelperError ? e.code : 'inject-failed' }; }
}));
app.on('will-quit', () => { void anyAppLoop?.stop(); void anyAppSpeech?.stop(); });

ipcMain.handle('hive:tasks', () => hive.tasks());
// 0.5.3 ticket keys: the prefix new cards get now (Settings shows it).
ipcMain.handle('hive:ticketPrefix', () => hive.ticketMeta(hive.tasks()).prefix);
ipcMain.handle('hive:tasksArchive', () => hive.tasksArchive());
ipcMain.handle('hive:log', (_evt, n: unknown) => hive.logTail(typeof n === 'number' ? n : 200));
ipcMain.handle('hive:memory', (_evt, id: unknown) => (typeof id === 'string' ? hive.memory(id) : ''));
ipcMain.handle('hive:inbox', (_evt, id: unknown) => (typeof id === 'string' ? hive.inbox(id) : []));
// Voice read-layer: recent message CONTENT (inbox/outbox bodies), REDACTED
// main-side by hive.voiceMessages(). The renderer/voice layer never sees a raw
// body — secrets are stripped here, before the result crosses IPC.
ipcMain.handle('hive:messages', (_evt, opts: unknown) =>
  hive.voiceMessages(opts && typeof opts === 'object' ? (opts as Parameters<typeof hive.voiceMessages>[0]) : {})
);
// v0.4.9 phase 2 (D4): an agent's activity digest, oldest first, at most `limit`
// entries (the ring size when the renderer does not say). The renderer reads
// updatedAt off the last entry; there is no second channel for it. A bad id is
// an empty list, never a throw into the renderer.
ipcMain.handle('hive:agentActivity', (_evt, agentId: unknown, limit: unknown) => {
  if (typeof agentId !== 'string' || !agentId.trim()) return [];
  const n = typeof limit === 'number' && Number.isInteger(limit) && limit > 0 ? limit : ACTIVITY_RING;
  return activity.list(agentId, n);
});
ipcMain.handle('hive:send', (_evt, partial: Partial<HiveMessage>, from: unknown) => {
  if (!hive.enabled()) return { ok: false, error: 'hive disabled (no harnessHome)' };
  const sender = typeof from === 'string' ? from : 'system';
  const msg = hive.send(partial ?? {}, sender);
  // Count only what a PERSON sent. Every renderer surface that dispatches on a
  // human's behalf passes 'human' (Command Center dispatch, thread replies, ASK
  // ME answers); agent-to-agent traffic passes the agent id and would swamp the
  // number. Counted AFTER the send so a rejected message is never counted.
  if (sender === 'human') analytics.trackMessageSent('hive');
  return { ok: true, message: msg };
});
ipcMain.handle('hive:addTask', (_evt, task: unknown) => {
  if (!task || typeof task !== 'object' || Array.isArray(task)
    || typeof (task as { id?: unknown }).id !== 'string') {
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
// Many cards in one write and one commit (askMeBulk, Dismiss all). An entry
// that is not { id, patch } is skipped, not a reason to refuse the rest.
ipcMain.handle('hive:patchTasks', (_evt, patches: unknown) => {
  if (!Array.isArray(patches)) return { ok: false, applied: [], error: 'invalid task patches' };
  if (!hive.enabled()) return { ok: false, applied: [], error: 'hive disabled (no harnessHome)' };
  const valid = patches.filter((p): p is { id: string; patch: Partial<Omit<HiveTask, 'id'>> } =>
    !!p && typeof p === 'object' && typeof (p as { id?: unknown }).id === 'string' && !!(p as { id: string }).id
    && !!(p as { patch?: unknown }).patch && typeof (p as { patch: unknown }).patch === 'object' && !Array.isArray((p as { patch: unknown }).patch));
  try {
    return { ok: true, applied: hive.patchTasks(valid) };
  } catch (err) {
    return { ok: false, applied: [], error: err instanceof Error ? err.message : String(err) };
  }
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

// ─── IPC: skills (installed locally, and the browsable catalog) ─────────────
/** Skills the CLIs on this machine can already use. Scans the registered repos
 *  plus the agent's own cwd, so a project-scoped skill shows up where it applies. */
ipcMain.handle('skills:local', (_evt, cwd: unknown): LocalSkill[] => {
  const cfg = readConfig();
  const cwds = [
    ...(typeof cwd === 'string' && cwd ? [cwd] : []),
    ...(cfg.registeredRepos ?? [])
  ];
  try {
    return listLocalSkills({ cwds, bundledDir: skillsResourceDir() });
  } catch (e) {
    console.error('[skills] local scan failed:', e);
    return [];
  }
});
/** The skills catalog, parsed from its README and cached in userData.
 *  `force` is the explicit refresh button; everything else is served from a
 *  day-old cache so opening the tab never waits on the network. */
ipcMain.handle('skills:catalog', async (_evt, force: unknown) => {
  const cachePath = join(app.getPath('userData'), 'skill-catalog.json');
  return loadCatalog(cachePath, { force: force === true });
});

/** Install one catalog skill into ~/.claude/skills. Structured refusals, never a
 *  throw: the UI distinguishes "not installable" from "install failed". */
ipcMain.handle('skills:install', async (_evt, url: unknown, name: unknown) => {
  if (typeof url !== 'string' || typeof name !== 'string') {
    return { ok: false as const, error: 'bad request' };
  }
  return installSkill(url, name);
});
/** Delete an installed skill. The guard rails live in uninstallSkill — it refuses
 *  any path it cannot prove is a skill folder inside a skills root. */
ipcMain.handle('skills:uninstall', (_evt, path: unknown) => {
  if (typeof path !== 'string') return { ok: false as const, error: 'bad request' };
  const cfg = readConfig();
  return uninstallSkill(path, { cwds: cfg.registeredRepos ?? [] });
});
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

// ─── IPC: setup catalog (which external tools are actually here) ────────────
/**
 * Probe every catalog row against THIS machine.
 *
 * Presence is a PATH resolution, not a spawn: running each candidate to read a
 * --version would be a dozen process launches on every panel open, and several of
 * these CLIs boot a TUI when invoked bare. `resolveCommand` returns its input
 * unchanged when it finds nothing, so "resolved to a real, existing path that is
 * not just the bare name" is the found test.
 *
 * mempalace is the one row that does NOT come from PATH: the memory subsystem
 * already resolves it (including uv/pip locations PATH may not carry for a
 * Finder-launched app) and knows whether the palace is initialised, so it is
 * authoritative and reused rather than re-probed differently here.
 */
ipcMain.handle('tools:status', (): ToolStatus[] => {
  const win = process.platform === 'win32';
  const mem = (() => { try { memory.resetBinCache(); return memory.status(); } catch { return null; } })();
  return toolCatalog().map((spec): ToolStatus => {
    const installCommand = win ? spec.install.win32 : spec.install.posix;
    if (spec.id === 'mempalace') {
      return {
        ...spec,
        installCommand,
        found: !!mem?.available,
        path: mem?.bin ?? null,
        detail: mem?.available
          ? (mem.initialized ? 'palace initialised' : 'installed — palace not built yet')
          : undefined
      };
    }
    if (!spec.bin) return { ...spec, installCommand, found: false, path: null };
    let path: string | null = null;
    try {
      const resolved = resolveCliCommand(spec.bin);
      if (resolved !== spec.bin && existsSync(resolved)) path = resolved;
    } catch { /* a probe must never take the panel down */ }
    return { ...spec, installCommand, found: !!path, path };
  });
});

// ─── IPC: semantic memory (MemPalace CLI) ───────────────────────────────────
// refresh() = resetBinCache + an idempotent start(). The poll is the one thing
// that reliably notices mempalace being installed after boot, so it is what arms
// the mine loop that boot's start() had to skip — otherwise the pill reads
// "getting ready" until the app is restarted.
ipcMain.handle('hive:memoryStatus', () => memory.refresh());
ipcMain.handle('hive:searchMemory', (_evt, query: unknown, wing: unknown) => {
  if (typeof query !== 'string' || !query.trim()) return { ok: false, output: '', error: 'empty query' };
  return memory.search(query, { wing: typeof wing === 'string' ? wing : undefined });
});
ipcMain.handle('hive:memoryWakeUp', (_evt, wing: unknown) =>
  memory.wakeUp(typeof wing === 'string' ? wing : undefined));
ipcMain.handle('hive:mineNow', () => { memory.mineNow(); return { ok: true }; });
// Condense memory.md on demand: an explicit id condenses that one agent (skips
// the size trigger — a "condense now" button); no id runs a full threshold scan.
ipcMain.handle('memory:reflectNow', (_evt, id: unknown) =>
  reflector.reflectNow(typeof id === 'string' && id ? id : undefined));

// ─── IPC: enterprise Knowledge Graph (multimodal context for agents) ─────────
ipcMain.handle('kg:status', () => knowledge.status());
ipcMain.handle('kg:list', () => knowledge.list());
ipcMain.handle('kg:search', (_evt, query: unknown, limit: unknown) => {
  if (typeof query !== 'string' || !query.trim()) return [];
  return knowledge.search(query, typeof limit === 'number' ? limit : undefined);
});
ipcMain.handle('kg:get', (_evt, id: unknown) =>
  (typeof id === 'string' && id ? knowledge.get(id) : null));
ipcMain.handle('kg:remove', (_evt, id: unknown) =>
  ({ ok: typeof id === 'string' && id ? knowledge.remove(id) : false }));
// Ingest one or more files from disk. Best-effort per file; returns per-file
// results so the UI can report partial success.
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

// ─── IPC: command history (SQLite — every prompt submitted to an agent) ──────
ipcMain.handle('history:add', (_evt, payload: unknown) => {
  const p = (payload ?? {}) as { agentId?: unknown; cwd?: unknown; text?: unknown };
  if (typeof p.agentId !== 'string' || typeof p.text !== 'string') return { ok: false, error: 'invalid args' };
  try {
    persist.addHistory({ agentId: p.agentId, cwd: typeof p.cwd === 'string' ? p.cwd : null, text: p.text });
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
});
ipcMain.handle('history:list', (_evt, agentId: unknown, limit: unknown) =>
  persist.listHistory(
    typeof agentId === 'string' && agentId ? agentId : undefined,
    typeof limit === 'number' ? limit : undefined
  ));
ipcMain.handle('history:search', (_evt, query: unknown, limit: unknown) =>
  persist.searchHistory(typeof query === 'string' ? query : '', typeof limit === 'number' ? limit : undefined));

// ─── IPC: quit confirmation ─────────────────────────────────────────────────
/** Tear the harness down and quit. The "kill all & quit" path: every PTY dies
 *  at once (whatever an agent held in working memory and had not written to
 *  disk goes with it), everything already on disk stays, then the app exits. */
function teardownAndQuit(): void {
  allowQuit = true;
  // Each teardown step is best-effort: a throw here (e.g. a dying child or a
  // half-torn-down socket) must never abort the quit or pop a crash dialog.
  try { clearMissionTimers(); } catch (e) { console.error('[quit] clearMissionTimers:', e); }
  try { clearContextTimers(); } catch (e) { console.error('[quit] clearContextTimers:', e); }
  try { stopWebhookDoneObserver(); } catch (e) { console.error('[quit] stopWebhookDoneObserver:', e); }
  try { stopEphemeralWorkerWatcher(); } catch (e) { console.error('[quit] stopWorkerWatcher:', e); }
  try { integrationBroker.stop(); } catch (e) { console.error('[quit] broker.stop:', e); }
  try { hive.stopRouter(); } catch (e) { console.error('[quit] stopRouter:', e); }
  try { stopTaskHygiene(); } catch (e) { console.error('[quit] stopTaskHygiene:', e); }
  try { hookServer.stop(); } catch (e) { console.error('[quit] hookServer.stop:', e); }
  try { telemetry.stop(); } catch (e) { console.error('[quit] telemetry.stop:', e); }
  try { stopSlackIngestion(); } catch (e) { console.error('[quit] slack.stop:', e); }
  try { stopWebhookServer(); } catch (e) { console.error('[quit] webhook.stop:', e); }
  try { memory.stop(); } catch (e) { console.error('[quit] memory.stop:', e); }
  try { reflector.stop(); } catch (e) { console.error('[quit] reflector.stop:', e); }
  try { persist.close(); } catch (e) { console.error('[quit] persist.close:', e); }
  try { hive.stopAllProxyBridges(); } catch (e) { console.error('[quit] stopAllProxyBridges:', e); }
  try { ptyManager.killAll(); } catch (e) { console.error('[quit] killAll:', e); }
  app.quit();
}
ipcMain.handle('app:confirmClose', () => {
  teardownAndQuit();
});
ipcMain.handle('app:cancelClose', () => {
  // The modal closes on the renderer side. The one thing main owes anybody here
  // is the truth about a restart-to-install: if this quit was one, it has just
  // been called off, and whoever is waiting on it needs to hear that rather than
  // sit disabled forever waiting for a process that is not going to die.
  abortPendingRestart();
});

// New Floor from the renderer (0.5.3, B21): the picker opens in the asking
// window; the app-menu item does the same for the focused one. The old
// second-window path (openFloor) is no longer an entry point.
ipcMain.handle('window:newFloor', (evt) => {
  if (!readConfig().multiWindow) return { ok: false };
  return { ok: openFloorPicker(BrowserWindow.fromWebContents(evt.sender)) };
});

// ─── IPC: full reset (wipe data + config, relaunch into onboarding) ──────────
ipcMain.handle('app:resetAll', () => {
  allowQuit = true;
  // Tear everything down first so nothing writes back into the dirs we wipe.
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
  try { persist.close(); } catch (e) { console.error('[reset] persist.close:', e); }
  try { ptyManager.killAll(); } catch (e) { console.error('[reset] killAll:', e); }
  try { hive.removeExposedCodexData(); } catch (e) { console.error('[reset] removeExposedCodexData:', e); }
  // Erase the hive (Michael's + every agent's memory, inboxes, tasks, board,
  // git history) and the semantic-memory palace. Only these harness-created
  // subdirs are removed — never the user's whole harnessHome folder.
  for (const dir of [hive.root(), memory.palacePath()]) {
    if (!dir) continue;
    try { rmSync(dir, { recursive: true, force: true }); }
    catch (e) { console.error('[reset] rm', dir, e); }
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

// ─── IPC: token telemetry (real usage + est. cost from CC transcripts) ───────
// Reconciler/fallback path: per-cwd transcript sum, now priced PER MODEL (cost
// bug #1 fixed in pricing.ts). Kept for back-compat with the existing UsageRow.
ipcMain.handle('hive:agentUsage', (_evt, cwd: unknown) =>
  typeof cwd === 'string' ? readAgentUsage(cwd) : null);
// Current context size (tokens) of an agent's LIVE session — the transcript
// path is learned from the agent's hook payloads (SessionStart fires right at
// spawn), so this works even when several agents share one cwd. Null until the
// first hook fires; a known-but-empty transcript reads as 0 so a freshly
// (re)started session zeroes the gauge instead of leaving a stale value up.
ipcMain.handle('hive:agentContext', (_evt, agentId: unknown) => {
  if (typeof agentId !== 'string') return null;
  const tp = hookServer.transcriptPath(agentId);
  if (!tp) return null;
  return readContextTokens(tp) ?? 0;
});

// A consolidated, NON-SENSITIVE per-agent directory for the voice read-layer
// (Realtime Michael's get_agent_detail / list_agents). One read that joins
// everything the office-floor sidebar + telemetry know per agent: the registry
// record (name/role/provider/cwd/status/archived/isGod/isAssistant/sessionId/
// cwdValid), live token + breaker + last-tool telemetry, and the current context
// window fill. Includes ARCHIVED agents (unlike the heartbeat's fleet.json, which
// is live-only) so Michael can speak to inactive agents — their cwd and memory
// stay reachable. PII-free: no secrets, env, or API keys ever leave main; cost is
// carried as tokens (+ a usd field the voice layer deliberately never speaks).
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

// ─── IPC: live telemetry (the OTel collector — the locked usage-provider seam) ─
// The fleet grid + span waterfall (#7B) read these; Lane A's breaker (#6)
// consumes getAgentUsage in-process via the provider, not over IPC.
ipcMain.handle('telemetry:usage', (_evt, agentId: unknown) =>
  typeof agentId === 'string' ? telemetry.getAgentUsage(agentId) : null);
ipcMain.handle('telemetry:spans', (_evt, agentId: unknown) =>
  typeof agentId === 'string' ? telemetry.getSpans(agentId) : []);
ipcMain.handle('telemetry:snapshot', () => telemetry.snapshot());

// ─── IPC: circuit-breaker state (Lane A #6 policy → this lane's avatars/meter) ─
// Lane A's breaker calls this with a BreakerState; we fan it out to the renderer
// on `control:breakerState`, where the avatar adapter gives it precedence over
// hook-derived status (#5C looping/zombie). Defined here so the channel exists
// before Jim's policy lands; he produces, this lane consumes.
ipcMain.handle('control:setBreakerState', (_evt, state: unknown) => {
  try { liveWebContents()?.send('control:breakerState', state); } catch { /* window tore down */ }
  return { ok: true };
});

// ─── IPC: operator control over agents (#7C.1–7C.3) ─────────────────────────
// All return the agent's fresh control snapshot so the UI can reflect state.
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
  // A steer typed into the control strip is a human message. Counted HERE, at
  // the IPC seam, and deliberately not inside control.steer(): the voice
  // action layer calls that directly, and it is not a person typing.
  analytics.trackMessageSent('steer');
  return control.snapshot(agentId);
});
ipcMain.handle('control:halt', (_evt, agentId: unknown) => {
  if (typeof agentId !== 'string') return null;
  control.halt(agentId);
  return control.snapshot(agentId);
});
// The stop-after control is a toggle: unhalt cancels a pending halt and ONLY
// the halt (control:resume also clears a pause, which the toggle must not).
ipcMain.handle('control:unhalt', (_evt, agentId: unknown) => {
  if (typeof agentId !== 'string') return null;
  control.unhalt(agentId);
  return control.snapshot(agentId);
});
ipcMain.handle('control:snapshot', (_evt, agentId: unknown) =>
  typeof agentId === 'string' ? control.snapshot(agentId) : null);

// ─── IPC: scheduled missions (recurring auto-dispatch) ──────────────────────
ipcMain.handle('missions:list', () => readConfig().missions ?? []);
ipcMain.handle('missions:save', (_evt, missions) => {
  // lastFiredAt is scheduler-owned. The renderer loads missions once and later
  // sends back a STALE array, so a wholesale write would clobber every
  // lastFiredAt the scheduler has stamped since. Merge by id and keep the newer
  // lastFiredAt (almost always the persisted one) so the UI can never erase it.
  const incoming = (Array.isArray(missions) ? missions : []) as ScheduledMission[];
  const persistedById = new Map(
    (readConfig().missions ?? []).map((m) => [m.id, m] as const)
  );
  const merged = incoming.map((m) => {
    const prevLastFired = persistedById.get(m.id)?.lastFiredAt ?? 0;
    const lastFiredAt = Math.max(m.lastFiredAt ?? 0, prevLastFired) || undefined;
    return { ...m, lastFiredAt };
  });
  writeConfig({ missions: merged });
  syncMissions();
  return { ok: true };
});

// ─── IPC: full-text search across hive files (board, tasks, memory) ──────────
ipcMain.handle('hive:textSearch', (_evt, query: unknown) => {
  if (typeof query !== 'string' || !query.trim()) return { ok: false, results: [] };
  const root = hive.root();
  if (!root) return { ok: false, results: [] };
  const q = query.trim().toLowerCase();
  // 0.5.2 (card v052-voice-michael-memory-dead-ends): a spoken question is a
  // sentence, and no line of anyone's notes contains the whole sentence. A
  // line now counts when it carries half the question's words (the whole
  // phrase still wins outright), and the best lines across every file come
  // back first. A query with no usable words keeps the old substring match.
  const keywords = keywordsOf(q);
  const threshold = keywordThreshold(keywords);
  const scored: Array<{ source: string; excerpt: string; score: number }> = [];
  // Each target file is (path, readable label). agents/<id>/memory.md is expanded below.
  const targets: Array<{ path: string; source: string }> = [
    { path: join(root, 'board.md'), source: 'board.md' },
    { path: join(root, 'tasks.json'), source: 'tasks.json' }
  ];
  const agentsDir = join(root, 'agents');
  if (existsSync(agentsDir)) {
    for (const id of readdirSync(agentsDir)) {
      targets.push({ path: join(agentsDir, id, 'memory.md'), source: `${id}/memory.md` });
    }
  }
  for (const { path, source } of targets) {
    if (!existsSync(path)) continue;
    const mine: Array<{ source: string; excerpt: string; score: number }> = [];
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const lower = line.toLowerCase();
      const phrase = lower.includes(q);
      const score = phrase ? keywords.length + 1 : keywords.length ? scoreLine(lower, keywords) : 0;
      if (phrase ? false : keywords.length ? score < threshold : true) continue;
      mine.push({ source, excerpt: excerptAround(line, keywords.length ? keywords : [q]), score });
    }
    mine.sort((a, b) => b.score - a.score);
    scored.push(...mine.slice(0, 3));
  }
  scored.sort((a, b) => b.score - a.score);
  const results = scored.slice(0, 14).map(({ source, excerpt }) => ({ source, excerpt }));
  return { ok: true, results };
});

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
// post we made, newest first. PRO's Inbox reads it as the Slack thread.
ipcMain.handle('slack:history', () => listSlackHistory());
function notifySlackHistoryUpdated(): void {
  try { liveWebContents()?.send('slack:historyUpdated'); } catch { /* window gone */ }
}
setSlackPostSink((r) => {
  appendSlackHistory({ direction: 'outbound', channel: r.channel, thread_ts: r.thread_ts, text: r.text, ok: r.ok, error: r.error });
  notifySlackHistoryUpdated();
});
/** Absolute path to the bundled reply helper, for the prompt the office worker
 *  runs to post its summary back in-thread. No secret crosses this boundary. */
ipcMain.handle('slack:replyScriptPath', () => slackReplyScriptPath());
/** Renderer's immediate "queued" ack into the triggering Slack thread. The bot
 *  token stays in main — only channel/thread/text cross IPC. */
ipcMain.handle('slack:reply', (_evt, arg: unknown) => {
  const p = (arg ?? {}) as { channel?: unknown; thread_ts?: unknown; text?: unknown };
  const cfg = readConfig();
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
  onChanged: () => { try { liveWebContents()?.send('webhooks:changed'); } catch { /* window gone */ } }
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
ipcMain.handle('triggers:getContext', () => readConfig().contextTrigger ?? DEFAULT_CONTEXT_TRIGGER);
ipcMain.handle('triggers:setContext', (_evt, arg: unknown) => {
  const current = readConfig().contextTrigger ?? DEFAULT_CONTEXT_TRIGGER;
  const p = (arg ?? {}) as Partial<ContextTriggerConfig>;
  const next: ContextTriggerConfig = {
    compact: sanitizeContextRule(p.compact, current.compact),
    clear: sanitizeContextRule(p.clear, current.clear)
  };
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
  return {
    enabled: typeof p.enabled === 'boolean' ? p.enabled : current.enabled,
    everyMs: num(p.everyMs, current.everyMs, 60_000, 86_400_000),
    minContextPct: num(p.minContextPct, current.minContextPct, 0, 100),
    minContextPctLargeWindow: num(p.minContextPctLargeWindow, current.minContextPctLargeWindow, 0, 100),
    message: typeof p.message === 'string' ? p.message : current.message
  };
}

// ─── IPC: file share (one local file, one public link, dead in an hour) ─────
// The cross MACHINE path for a file. The composer's attachment pastes a LOCAL
// PATH, which only works when the agent shares a filesystem with the sender;
// this publishes the file on a tunnel link, and the link expires in an hour.
//
// `FileShareStore` owns the whole thing — the loopback server, the single
// tunnel in front of it, the per share revoker and the sweep. Everything here
// is bridge. The import sits with its one consumer so the feature reads as one
// block; it is hoisted like every other import in this module.
import { FileShareStore } from './fileShare';
import { AnyAppDictation, anyAppUnavailableReason, mdHotkeyPath, type AnyAppEvent, type AnyAppPermissions, type AnyAppTranscriber } from './transcribe/anyApp';
import { HelperError } from './transcribe/lineHelper';
import { MdSpeech, mdSpeechAvailable, mdSpeechPath } from './transcribe/mdSpeech';
import { anyAppViaRouter } from './transcribe/anyAppEngine';

/** One store for the app. It binds nothing until the first share exists and
 *  closes the listener again when the last one goes. */
const fileShareStore = new FileShareStore();

/** Publish one file for an hour. The renderer's path is a REQUEST, never a
 *  fact: the store re-checks that it is absolute, resolves it through any
 *  symlink, refuses anything that is not a regular file and refuses anything
 *  over the size cap. A refusal comes back as a CODE, so no path and no token
 *  can ride out inside a message. Share IDS are what goes in a log line here;
 *  the token never does. */
ipcMain.handle('fileShare:create', (_evt, arg: unknown) => fileShareStore.create(arg));
/** Live shares only. The store sweeps before it answers. */
ipcMain.handle('fileShare:list', () => fileShareStore.list());
/** Kill one link early. Deletes NOTHING on disk: a share is a link, not a copy. */
ipcMain.handle('fileShare:revoke', (_evt, arg: unknown) => fileShareStore.revoke(arg));
// Every share dies with the app. `will-quit` rather than `before-quit` because
// before-quit can be cancelled (agents still running), and a cancelled quit
// must not have silently revoked somebody's links on the way past.
app.on('will-quit', () => { try { fileShareStore.stop(); } catch { /* noop */ } });

// ─── IPC: Triggers — webhooks (many endpoints, one server, one tunnel) ──────
ipcMain.handle('webhooks:list', () => readConfig().webhookTriggers ?? []);
ipcMain.handle('webhooks:save', (_evt, arg: unknown) => storeWebhooks(Array.isArray(arg) ? arg : []));
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
ipcMain.handle('webhooks:delete', (_evt, arg: unknown) => {
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
ipcMain.handle('webhooks:status', () => ({
  running: webhookServer != null,
  starting: webhookStarting,
  ...(lastWebhookError ? { error: lastWebhookError } : {}),
  url: lastWebhookUrl,
  ...(webhookServer?.boundPort() ?? {}),
  endpoints: webhookEndpointUrls()
}));
/** Retry after a failed start: a server that bound but never got a tunnel is
 *  stopped first, because a running server only re-points its endpoints. */
ipcMain.handle('webhooks:retry', async () => {
  if (webhookStarting) return { ok: false, error: 'already starting' };
  if (webhookServer && !webhookServer.publicUrl()) stopWebhookServer();
  return startWebhookServer();
});

/** Normalise one endpoint coming back from the renderer. Unknown/blank fields
 *  fall back to what is already persisted, so a UI that round-trips a partially
 *  filled row can never blank a live secret or silently widen a mode. */
function sanitizeWebhookTrigger(raw: unknown, existing: WebhookTrigger[]): WebhookTrigger | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<WebhookTrigger>;
  const id = typeof r.id === 'string' ? r.id.trim() : '';
  // The id is spliced into a public URL path. Restrict it to a boring charset
  // rather than escaping later: no slashes (which would forge a nested route),
  // no encoded traversal, nothing that could make two endpoints alias.
  if (!/^[A-Za-z0-9._-]{1,64}$/.test(id)) return null;
  const prior = existing.find((t) => t.id === id);
  const secret = typeof r.secret === 'string' && r.secret.trim() ? r.secret.trim() : prior?.secret ?? '';
  const mode = isTriggerMode(r.mode) ? r.mode : prior?.mode ?? DEFAULT_TRIGGER_MODE;
  return {
    id,
    name: typeof r.name === 'string' && r.name.trim() ? r.name.trim() : prior?.name ?? id,
    secret,
    // A secretless endpoint can never be enabled — it would be an open door.
    enabled: secret ? (typeof r.enabled === 'boolean' ? r.enabled : prior?.enabled ?? false) : false,
    mode,
    schema: typeof r.schema === 'string' && r.schema.trim() ? r.schema : prior?.schema ?? DEFAULT_WEBHOOK_SCHEMA,
    createdAt: typeof r.createdAt === 'number' && r.createdAt > 0 ? r.createdAt : prior?.createdAt ?? Date.now(),
    // 0.4.9 phase 4. Both are OPTIONAL and both fall back to what is already
    // stored, which is the whole migration: an endpoint written before these
    // existed keeps behaving as it did until someone edits it. The prompt is
    // bounded because it rides with EVERY request this endpoint accepts, and an
    // unbounded one would be an unbounded cost per call.
    ...(typeof r.prompt === 'string' ? (r.prompt.trim() ? { prompt: r.prompt.trim().slice(0, WEBHOOK_PROMPT_MAX) } : {}) : (prior?.prompt ? { prompt: prior.prompt } : {})),
    ...(typeof r.guardrails === 'boolean' ? { guardrails: r.guardrails } : (prior?.guardrails ? { guardrails: true } : {})),
    // 0.5.3 (settings redesign): who sends, who answers, and what it is for.
    // Optional and falling back to what is stored, like the two above. `to` is
    // an agent id or nothing; '' from the picker means the webhook default.
    ...(isWebhookSource(r.source) ? { source: r.source } : (prior?.source ? { source: prior.source } : {})),
    ...(typeof r.to === 'string' ? (/^[A-Za-z0-9._-]{1,80}$/.test(r.to.trim()) ? { to: r.to.trim() } : {}) : (prior?.to ? { to: prior.to } : {})),
    ...(typeof r.description === 'string' ? (r.description.trim() ? { description: r.description.trim().slice(0, 200) } : {}) : (prior?.description ? { description: prior.description } : {})),
    // 0.5.3 batch 3: how a custom caller proves itself. 'header' is the
    // default and is not stored.
    ...(isWebhookAuth(r.auth) ? (r.auth === 'header' ? {} : { auth: r.auth }) : (prior?.auth ? { auth: prior.auth } : {}))
  };
}

/** A standing instruction rides with every request the endpoint accepts, so it
 *  is bounded: an unbounded one is an unbounded cost per call. */
const WEBHOOK_PROMPT_MAX = 2000;

function isTriggerMode(v: unknown): v is TriggerMode {
  return v === 'strict' || v === 'allow-all' || v === 'communication-only';
}

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

  if (decision === 'rejected') {
    const next = updateTriggerHistory(id, { decision: 'rejected' });
    notifyTriggerHistoryUpdated();
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

// ─── IPC: Free Flow (voice dictation → message queue) ────────────────────────
// Entry point B is hold-Option-to-talk, handled entirely in the renderer
// (capture-phase key listeners) — no globalShortcut here. macOS doesn't deliver
// the Fn key to Electron (electron#16714) and a faithful native Fn helper
// (CGEventTap) is deferred; hold-Option is the human-chosen v1 activation.

// 0.5.3, F16: one router picks the engine (Apple on device, whisper.cpp, or
// Groq as the fallback) for the composer, Stapler and the any app loop. Built
// on first use so a test import of this module spawns nothing.
let transcribeRouter: TranscribeRouter | null = null;
function getTranscribeRouter(): TranscribeRouter {
  transcribeRouter ??= new TranscribeRouter({
    resourcesPath: app.isPackaged ? process.resourcesPath : join(__dirname, '../../resources'),
    userDataPath: app.getPath('userData'),
    readConfig,
    log: (line) => console.log(line)
  });
  return transcribeRouter;
}
app.on('will-quit', () => { transcribeRouter?.stop(); });

ipcMain.handle('transcribe:status', () => getTranscribeRouter().status());
ipcMain.handle('transcribe:setConfig', async (_evt, patch: unknown) => {
  const p = (patch ?? {}) as Partial<Record<keyof TranscribeConfig, unknown>>;
  const cur = withTranscribeDefaults(readConfig().transcribe);
  const next = withTranscribeDefaults({
    ...cur,
    ...(p.engine !== undefined ? { engine: p.engine } : {}),
    ...(p.model !== undefined ? { model: p.model } : {}),
    ...(p.customWords !== undefined ? { customWords: cleanCustomWords(p.customWords) } : {}),
    ...(p.defaultVocabulary !== undefined ? { defaultVocabulary: p.defaultVocabulary } : {}),
    ...(p.pushToTalkKey !== undefined ? { pushToTalkKey: p.pushToTalkKey } : {}),
    ...(p.anyApp !== undefined ? { anyApp: p.anyApp } : {}),
    // The other side of calls (F16, PR 5): read at every meeting start.
    ...(p.meetingSystemAudio !== undefined ? { meetingSystemAudio: p.meetingSystemAudio } : {}),
    ...(p.meetingKey !== undefined ? { meetingKey: p.meetingKey } : {}),
    ...(p.captureKey !== undefined ? { captureKey: p.captureKey } : {}),
    ...(p.dictationSounds !== undefined ? { dictationSounds: p.dictationSounds } : {}),
    // The two fields whose default moved in 0.5.3 remember being chosen, so
    // a later default never overrides the user (transcribeConfig `chosen`).
    chosen: [...cur.chosen, ...(p.anyApp !== undefined ? ['anyApp' as const] : []), ...(p.pushToTalkKey !== undefined ? ['pushToTalkKey' as const] : [])]
  });
  writeConfig({ transcribe: next });
  // A new engine means a new transcriber for the any app loop (24 Sep: it
  // follows the chosen engine), so an armed loop is re-armed with it.
  if (next.engine !== cur.engine && anyAppLoop) { await anyAppLoop.stop(); anyAppLoop = null; }
  // The any app loop follows the switch and the key at once; so does the
  // meeting chord.
  await syncAnyAppToConfig(next);
  await syncMeetingHotkeyToConfig(next);
  await syncCaptureHotkeyToConfig(next);
  return { ok: true, config: next, status: getTranscribeRouter().status() };
});
ipcMain.handle('transcribe:downloadModel', async (evt, id: unknown) => {
  if (id !== 'small') return { ok: false, error: 'unknown model' };
  const wc = evt.sender;
  const r = await getTranscribeRouter().downloadModel('small', (received, total) => {
    if (!wc.isDestroyed()) wc.send('transcribe:downloadProgress', { id, received, total });
  });
  return r;
});

ipcMain.handle('freeflow:setConfig', (_evt, patch: unknown) => {
  // No `enabled` any more: Free Flow is always on (batch 3); an old caller's
  // `enabled` is ignored.
  const p = (patch ?? {}) as { apiKey?: unknown; model?: unknown };
  const next: Partial<HarnessConfig> = {};
  // Trim string fields; an emptied key clears back to undefined.
  if (typeof p.apiKey === 'string') next.groqApiKey = p.apiKey.trim() || undefined;
  if (typeof p.model === 'string') next.freeflowModel = p.model.trim() || DEFAULT_GROQ_MODEL;
  writeConfig(next);
  return { ok: true };
});

/** Transcribe one captured audio clip through the router (Groq only when that
 *  engine is picked and a key is present). The Groq key stays
 *  in main — only the audio bytes cross IPC inbound and the transcript outbound. */
ipcMain.handle('freeflow:transcribe', async (_evt, arg: unknown) => {
  const cfg = readConfig();
  const a = (arg ?? {}) as { audio?: unknown; mimeType?: unknown; filename?: unknown; language?: unknown };
  if (!(a.audio instanceof ArrayBuffer) && !(a.audio instanceof Uint8Array)) {
    return { ok: false, error: 'no audio' };
  }
  // 0.5.3, F16: the router picks the engine; Groq is one of its choices and
  // still needs the key, the local engines do not.
  const out = await getTranscribeRouter().transcribe({
    mode: 'dictation',
    audio: a.audio,
    mimeType: typeof a.mimeType === 'string' ? a.mimeType : undefined,
    filename: typeof a.filename === 'string' ? a.filename : undefined,
    model: cfg.freeflowModel || DEFAULT_GROQ_MODEL,
    language: typeof a.language === 'string' && a.language ? a.language : undefined
  });
  if (out.ok) analytics.trackFeature('voice_dictation');
  return out;
});

// ─── IPC: Realtime Michael (voice orchestrator — ephemeral token mint, rt-1) ──
// MAIN owns the BYOK OpenAI key (encrypted broker, apikey:openai) and mints a
// short-lived EPHEMERAL client secret; the real key never crosses IPC. All wiring
// lives in ./realtime so this stays a single registration line.
registerRealtimeIpc();

// ─── IPC: the puck (Pro, 7 Sep 2026) ──────────────────────────────────────────
// The floating always-on-top window, its capture overlay and its folder of
// screenshots and meeting transcripts. All of it lives in ./puck; this site
// only injects the doors it already has: the config, the hive's send (a human
// request to the orchestrator, counted like one), and the Groq transcriber
// Free Flow uses. The puck's window is deliberately NOT in allWindows.
registerPuck({
  readConfig,
  writeConfig,
  onConfigWritten,
  hiveEnabled: () => hive.enabled(),
  hiveSend: (partial, from) => {
    const msg = hive.send(partial, from);
    if (from === 'human') analytics.trackMessageSent('hive');
    return msg;
  },
  transcribe: (opts) => getTranscribeRouter().transcribe({ ...opts, mode: opts.mode ?? 'meeting' }),
  canTranscribe: () => getTranscribeRouter().canTranscribe('meeting'),
  // The other side of the call (0.5.3, F16): on a Mac with the tap helper
  // and the Screen Recording grant, the helper feeds main; the grant is
  // read at every meeting start so one given in the meantime counts.
  // Windows: the renderer opens the loopback (PR 3); Linux: the renderer
  // opens the monitor when one is listed (PR 4); the Mac: the tap helper.
  systemAudioSource: () => (process.platform === 'win32' ? 'renderer' : process.platform === 'linux' ? (linuxMonitor ? 'renderer' : null) : systemTapReady() && systemTapGranted ? 'helper' : null),
  startSystemAudio: async (startedAt) => {
    const tap = getSystemTap();
    if (!tap) return;
    try {
      await tap.start();
    } catch (e) {
      if (isTapDenied(e)) systemTapGranted = false;
      throw e;
    }
    void startedAt;
  },
  stopSystemAudio: async () => { await systemTap?.stop(); },
  broadcast: (channel, payload) => {
    for (const w of allWindows) {
      if (w.isDestroyed() || w.webContents.isDestroyed()) continue;
      w.webContents.send(channel, payload);
    }
  },
  // The puck's "Open Voice settings": the app's window comes forward and
  // takes the same door into Settings as the titlebar gear (App relays
  // `settings:open` onto the `cth:open-settings` event).
  openSettings: (section) => {
    const w = mainWindow && !mainWindow.isDestroyed() ? mainWindow : [...allWindows].find((x) => !x.isDestroyed()) ?? null;
    if (!w) return;
    if (w.isMinimized()) w.restore();
    w.show();
    w.focus();
    w.webContents.send('settings:open', { section });
  },
  // Who a capture may be addressed to (0.5.2). Registered, not archived, and
  // with a terminal actually alive: an agent whose process is gone cannot read
  // its inbox, so offering it as a destination would be offering a hole.
  agentIds: () => {
    if (!hive.enabled()) return [];
    try {
      return Object.entries(hive.registry().agents)
        .filter(([id, a]) => !a.archived && !!ptyForAgent(id))
        .map(([id]) => id);
    } catch { return []; }
  },
  // What the Stapler calls whoever a capture reaches (0.5.3). The orchestrator
  // goes through resolveGodName so a renamed one is honoured and an unnamed one
  // still reads as the default; before this the Stapler window could only ever
  // print the default, because it has no store to learn the live name from.
  agentName: (id: string) => {
    try {
      const reg = hive.registry();
      const godId = reg.godId ?? 'god';
      if (id === godId || id === 'god') return resolveGodName(reg.agents[godId]?.name);
      return reg.agents[id]?.name?.trim() || id;
    } catch { return id; }
  },
  preload: join(__dirname, '../preload/index.js'),
  rendererUrl: isDev && process.env.ELECTRON_RENDERER_URL ? process.env.ELECTRON_RENDERER_URL : null,
  rendererDir: join(__dirname, '../renderer')
});

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
  controlSteer: (id, text) => control.steer(id, text),
  controlHalt: (id) => control.halt(id),
  controlSnapshot: (id) => control.snapshot(id),
  killAgent: (id) => {
    const r = ptyManager.kill(id);
    teardownPty(id, 'person');
    // A voice (MAIN-initiated) kill: the renderer never removed the card itself
    // (unlike a UI kill), so tell the floor to archive it. Mirrors hive:agentSpawned.
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
  listMissions: () => readConfig().missions ?? [],
  // The spec carries lastFiredAt through from listMissions(), so a wholesale write
  // preserves the scheduler's stamps; edit_schedule is deliberate + rare.
  saveMissions: (missions) => { writeConfig({ missions }); },
  // rt-12: register each voice dispatch so the watcher can detect its completion.
  trackDispatch: (d) => { try { completionWatcher.track({ ...d, kind: 'dispatch' }); } catch { /* watcher unavailable */ } },
  // ── v0.3.4 full-control extensions ──
  controlResume: (id) => control.resume(id),
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
  patchConfig: (patch) => { writeConfig(patch as Partial<HarnessConfig>); }
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
// 0.5.2 (card v052-voice-michael-terminal-context): the last lines of one
// agent's terminal for the voice model. The renderer hands over the rows its
// terminal drew (the faithful picture for a TUI); when it has none, the pty's
// own raw tail stands in. Everything is redacted HERE, on the trusted side,
// before the shared scrub cuts injection lead-ins and caps the size.
ipcMain.handle('voice:terminal', (_evt, ptyId: unknown, rows: unknown, lines: unknown) => {
  if (typeof ptyId !== 'string' || !ptyId) return { ok: false, lines: [], source: 'none' as const };
  const drawn = Array.isArray(rows) ? rows.filter((r): r is string => typeof r === 'string') : [];
  const fromScreen = drawn.some((r) => /[\p{L}\p{N}]/u.test(r));
  const source = fromScreen ? drawn : stripTerminalControl(ptyManager.tail(ptyId)).split('\n');
  const out = terminalForVoice(source, {
    lines: typeof lines === 'number' ? lines : undefined,
    redact: (l) => redactSecrets(l)
  });
  return { ok: true, lines: out, source: fromScreen ? ('screen' as const) : out.length ? ('stream' as const) : ('none' as const) };
});
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
// or excessive idleness (reap). All teardown flows through teardownPty's
// safety-gate, so a worker's worktree is never auto-removed while it holds
// unintegrated work. Every terminal failure informs god WITH the Slack coords so
// god closes the Slack loop; the success path is the worker replying in-thread.

/** A spawn-request god drops into HIVE_ROOT/spawn-requests/<id>.json. god authors
 *  these directly; `objective` and `cwd` are the only required fields. */
interface SpawnRequest {
  id?: string;
  /** Who asked. 'slack' requests (written by main for a Slack message, 0.4.11)
   *  run even while `orchestratorMaySpawn` is off: turning Slack on is the
   *  person's consent for that spend. Absent means Michael wrote it. */
  origin?: 'slack' | 'god';
  objective?: string;
  command?: string;                                   // engine CLI; default = config.defaultCommand
  provider?: AgentProvider;                           // optional explicit provider
  model?: string;                                     // optional --model override (Claude)
  cwd?: string;                                        // repo the worker (and its worktree) runs in
  name?: string;                                       // display name
  slack?: { channel: string; thread_ts: string };     // reply target + where failures surface
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

/** Move a processed request out of the queue so it's never reprocessed. */
function archiveRequest(filePath: string, sub: '.done' | '.failed'): void {
  const queue = spawnRequestsDir();
  try {
    if (!queue) throw new Error('no hive root');
    const dir = join(queue, sub);
    mkdirSync(dir, { recursive: true });
    renameSync(filePath, join(dir, basename(filePath)));
  } catch (e) {
    // Last resort: delete it so a poison file can't loop forever.
    try { unlinkSync(filePath); } catch { /* noop */ }
    console.error('[worker] archiveRequest failed:', e);
  }
}

/** Did this worker post a terminal `act:"done"` yet? Scans its own outbox AND
 *  outbox/.sent (the router archives delivered mail there ~every 1.5s), so the
 *  signal is caught whether or not it's been routed out yet.
 *
 *  Stale-done guard: agent dirs persist after teardown, so REUSING a reqId would
 *  leave a PRIOR worker's `done` sitting in this same dir. Without a guard that
 *  stale signal would release the new worker on its very first tick — before it
 *  does anything or replies — causing a silent Slack hang. So we only count a
 *  `done` authored AFTER this worker spawned: by its `created_at` (the message's
 *  own timestamp), falling back to the file's mtime when `created_at` is missing
 *  or unparseable. When neither yields a usable timestamp we DON'T count it
 *  (fail toward keeping the worker alive — the idle reaper is the backstop). */
function workerSignaledDone(workerId: string, spawnedAt: number): string | null {
  const root = hive.root();
  if (!root) return null;
  const base = join(root, 'agents', workerId, 'outbox');
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
        if (Number.isFinite(ts) && ts > spawnedAt) {
          return typeof msg.body === 'string' && msg.body.trim() ? msg.body : typeof msg.subject === 'string' ? msg.subject : '';
        }
      } catch { /* skip unreadable/partial */ }
    }
  }
  return null;
}

/** The live temp that owns a Slack thread, if any: a follow up in that thread is
 *  delivered to its inbox instead of hiring a second temp (0.4.11). */
function liveSlackThreadOwner(thread_ts: string): string | undefined {
  for (const [id, rec] of liveWorkers) {
    if (!rec.releasing && rec.slack?.thread_ts === thread_ts) return id;
  }
  return undefined;
}

/** `origin` of a spawn request file, read without processing it. Only consulted
 *  while Michael's own spawning is switched off, to let Slack's requests through. */
function spawnRequestOrigin(filePath: string): SpawnRequest['origin'] {
  try {
    const raw = JSON.parse(readFileSync(filePath, 'utf8')) as SpawnRequest;
    return raw.origin === 'slack' ? 'slack' : undefined;
  } catch { return undefined; }
}

/** Spin up one ephemeral worker from a spawn-request. Terminal failures (bad
 *  request, missing CLI, spawn error) archive to .failed and inform god WITH the
 *  Slack coords so god can post a 'couldn't start' reply. On success the worker is
 *  registered (for done-scan / reaping / safe teardown) and dispatched its
 *  objective via the standard inbox path. */
async function processSpawnRequest(filePath: string): Promise<void> {
  let raw: SpawnRequest;
  try {
    raw = JSON.parse(readFileSync(filePath, 'utf8')) as SpawnRequest;
  } catch (e) {
    console.error('[worker] unparseable spawn-request:', filePath, e);
    informGod('[worker spawn rejected] unparseable request', `Could not parse spawn-request ${basename(filePath)} — ${String(e)}`);
    archiveRequest(filePath, '.failed');
    return;
  }
  const slack = raw.slack && typeof raw.slack.channel === 'string' && typeof raw.slack.thread_ts === 'string'
    ? { channel: raw.slack.channel, thread_ts: raw.slack.thread_ts } : undefined;
  const reqId = (typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : basename(filePath).replace(/\.json$/i, ''))
    .replace(/[^A-Za-z0-9._-]/g, '-');
  const workerId = `worker-${reqId}`;
  const fail = (reason: string): void => {
    informGod(`[worker spawn rejected] ${reason}`, `Spawn-request ${basename(filePath)} rejected: ${reason}.`, slack);
    // A Slack card that will never get a temp is closed as blocked with the
    // reason, so the Tasks screen and the done poller do not wait on it.
    try { onTempFinished(workerId, { ok: false, reason }, { hive }); } catch { /* card only */ }
    archiveRequest(filePath, '.failed');
  };

  const objective = typeof raw.objective === 'string' ? raw.objective.trim() : '';
  if (!objective) { fail('missing "objective"'); return; }

  if (liveWorkers.has(workerId)) { fail(`worker "${workerId}" already running`); return; }

  // Worker request files are hand/LLM-authored, so `~/…` shows up here too — expand
  // before the existence check (Node reads `~` literally).
  const cwd = typeof raw.cwd === 'string' && raw.cwd.trim() ? expandTilde(raw.cwd) : '';
  if (!cwd || !existsSync(cwd)) { fail(`"cwd" missing or not found (${cwd || 'unset'})`); return; }

  // Request line → executable + argv (auto-mode inheritance, tokenization,
  // model-flag dedupe). Pure and unit-tested — see workerLaunch.ts for why this
  // translation earned a test.
  const cfgSpawn = readConfig();
  const launch = buildWorkerLaunch({
    requestCommand: raw.command,
    requestProvider: raw.provider,
    requestModel: raw.model,
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

  const isolate = raw.isolate !== false; // default true
  // Base branch the worktree will be cut from (for the ahead-of-base safety check).
  let baseBranch = 'main';
  try { const br = await getBranch(cwd); if ('current' in br && br.current) baseBranch = br.current; } catch { /* keep default */ }

  const meta: AgentMeta = {
    id: workerId,
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : `Temp ${reqId.slice(0, 12)}`,
    provider: raw.provider,
    // "temp" is the word on every screen and in every prompt (0.4.11). The id
    // prefix stays `worker-`: it is a contract with the ledger, the reaper and
    // the Slack owner lookup, and the prompts name it once as an id.
    role: 'temp',
    cwd
  };
  // Phase 2: grant this worker a broker capability over the currently-enabled
  // integrations and inject the broker URL + a per-worker capability TOKEN (a handle,
  // never a secret) into its env, so it can reach registered REST integrations through
  // the loopback secret broker without ever seeing a credential. Only when the broker
  // is up; the grant is revoked in teardownPty (and below if the spawn fails).
  const brokerEnv: Record<string, string> = {};
  if (integrationBroker.running()) {
    const token = integrationBroker.grant(workerId, integrations.enabledIds());
    brokerEnv.MD_BROKER_URL = integrationBroker.url();
    brokerEnv.MD_BROKER_TOKEN = token;
  }
  const spawnOpts: AgentSpawnOptions = {
    id: workerId, cwd, command: bin, cols: 120, rows: 32,
    args: launch.args,
    hive: meta, isolate, provider: raw.provider, env: brokerEnv,
    installNow: true // a god dispatched worker has nobody at the card (I2)
  };

  let res: { ok: boolean; error?: string; worktreePath?: string };
  try {
    res = await spawnAgentCore(spawnOpts, liveWebContents());
  } catch (e) {
    res = { ok: false, error: String(e) };
  }
  if (!res.ok) { integrationBroker.revoke(workerId); fail(`spawn failed — ${res.error ?? 'unknown error'}`); return; }

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
      provider: spawnOpts.provider ?? raw.provider,
      cwd: res.worktreePath ?? cwd,
      command: launch.command,
      args: spawnOpts.args,
      role: meta.role,
      worktreePath: res.worktreePath,
      character: typeof raw.character === 'string' ? raw.character : undefined,
      accent: typeof raw.accent === 'string' ? raw.accent : undefined
    }));
  } catch { /* window torn down */ }

  // Register for done-scan / idle-reap / token-cap / safe teardown (pty id == workerId).
  // tokenCap is optional plumbing (default unlimited) — only a positive finite cap is kept.
  const tokenCap = typeof raw.tokenCap === 'number' && Number.isFinite(raw.tokenCap) && raw.tokenCap > 0
    ? raw.tokenCap : undefined;
  liveWorkers.set(workerId, { workerId, reqId, name: meta.name, slack, baseBranch, spawnedAt: Date.now(), tokenCap, job: objective });

  // Dispatch the objective via the standard inbox path (zero new transport),
  // reusing the autonomous-request preamble so the worker gets the exact Slack
  // reply command + autonomy policy. `from: god` so the worker treats it as a god
  // dispatch per its protocol.
  try {
    const prefix = slack
      ? buildAutonomousRequestProtocol(slack.channel, slack.thread_ts, slackReplyScriptPath(), 'temp')
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
    // The catalog path is spelled absolute and joined natively: `$AGENT_DIR` is
    // POSIX only and was dead on a Windows floor.
    const skillFile = join(hive.root() ?? '', 'agents', workerId, '.claude', 'skills', 'capabilities', 'SKILL.md');
    const suffix = `\n\n[CAPABILITIES] Read ${skillFile} once (or run /capabilities) before you start: it lists your date skills (/today, /last30Days, /lastQuarter and more) and the integrations you reach through the loopback broker (MD_BROKER_URL is set for you), with how to call each. Resolve any time window with the date skills, never by hand.\n\n[DONE] When finished, send god ONE outbox message with "act":"done" and a short result summary; that releases you (terminal closed, your branch handed to god). Do not push to any remote; god is the only integrator.`;
    hive.send({ to: workerId, conversation: `worker-${reqId}`, act: 'request', subject: meta.name, body: `${prefix}${context}${objective}${suffix}` }, 'god');
  } catch (e) {
    console.error('[worker] dispatch send failed:', e);
  }

  console.log(`[worker] spawned ${workerId} (cwd=${cwd}, base=${baseBranch}${slack ? ', slack' : ''})`);
  archiveRequest(filePath, '.done');
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
      // (b) Still on disk → reclaim ONLY when provably integrated + clean.
      const deps = await unlinkWorktreeDeps(e.origCwd, e.wtPath);
      if (!deps.ok) { console.error('[worker gc] dependency unlink failed (keeping):', deps.error); continue; }
      let safe: { gc: boolean; detail: string };
      try { safe = await worktreeIsGcSafe(e.wtPath, e.baseBranch); }
      catch (err) { console.error('[worker gc] gc-safe check threw (keeping):', err); continue; }
      if (!safe.gc) continue; // keep — fail-safe
      const r = await removeWorktree(e.origCwd, e.wtPath);
      if (!r.ok) { console.error(`[worker gc] removeWorktree failed (keeping ${e.workerId}):`, r.error); continue; }
      removeWorkerScratch(e.workerId);
      preservedWorktrees.delete(key);
      console.log(`[worker gc] reclaimed ${e.workerId} (${safe.detail})`);
      informGod(
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
      const doneBody = workerSignaledDone(workerId, rec.spawnedAt);
      if (doneBody !== null) {
        // Success: the worker already replied in-thread; just release it.
        rec.releasing = true;
        rec.result = 'done';
        console.log(`[worker] ${workerId} signaled done — releasing`);
        // A Slack temp's card closes with its summary as the result (0.4.11).
        try { onTempFinished(workerId, { ok: true, body: doneBody }, { hive }); } catch { /* card only */ }
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
          informGod(
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
        informGod(
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
    const maySpawn = readConfig().orchestratorMaySpawn !== false;
    const dir = spawnRequestsDir();
    if (dir && existsSync(dir)) {
      let files: string[] = [];
      try { files = readdirSync(dir).filter(f => f.endsWith('.json')).sort(); } catch { /* dir vanished */ }
      for (const f of files) {
        if (liveWorkers.size >= maxWorkers) break;
        const fp = join(dir, f);
        if (!maySpawn && spawnRequestOrigin(fp) !== 'slack') continue;
        await processSpawnRequest(fp);
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
  baseBranch: string;
  spawnedAt: number;
  ageMs: number;
  idleMs: number | null;        // null = PTY already gone
  tokensUsed: number;
  tokenCap: number | null;      // effective cap (per-request or config default); null = unlimited
  hasSlack: boolean;
  releasing: boolean;
  status: 'releasing' | 'working';
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
      baseBranch: rec.baseBranch,
      spawnedAt: rec.spawnedAt,
      ageMs: Math.max(0, now - rec.spawnedAt),
      idleMs: idle === undefined ? null : idle,
      tokensUsed: workerTokensUsed(rec.workerId),
      tokenCap: effCap > 0 ? effCap : null,
      hasSlack: !!rec.slack,
      releasing: !!rec.releasing,
      status: rec.releasing ? 'releasing' : 'working'
    };
  });
  const preserved: PreservedSnapshot[] = [...preservedWorktrees.values()].map((e) => ({
    workerId: e.workerId, wtPath: e.wtPath, baseBranch: e.baseBranch, preservedAt: e.preservedAt
  }));
  return { live, preserved, maxWorkers: Math.max(1, cfg.maxConcurrentWorkers ?? 4) };
});

/** The Temps ledger (workerHistory.ts): one row per worker teardown, newest
 *  first. PRO's Temps screen reads it as the history table. */
ipcMain.handle('workers:history', () => listWorkerHistory());

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
  // Tell the hive what it is running inside, BEFORE anything spawns: the prompt
  // builder reads this, so an agent spawned earlier would never learn it.
  hive.setRuntimeInfo({ version: app.getVersion(), packaged: app.isPackaged, appPath: app.getAppPath() });
  // Hook shims named by the user's GLOBAL CLI configs (agy, Grok) live here,
  // outside any floor's hive, so a second floor, a moved hive or an older app
  // version cannot pull the file out from under a running agent (B23 point 5).
  hive.setSharedBinDir(join(app.getPath('appData'), 'munder-difflin', 'shared', 'bin'));
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
  archiveOrphanedAgents(); // #57/#58: archive stale archived:false entries with no live PTY
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
  startEphemeralWorkerWatcher(); // poll HIVE_ROOT/spawn-requests → ephemeral workers
  // Phase 2: the loopback secret broker. Bind it BEFORE workers spawn so each spawn can
  // be granted a capability token + the broker URL in its env. Loopback-only, idempotent.
  void integrationBroker.start().then((r) => {
    if (r.ok) console.log('[broker] integration broker listening on', integrationBroker.url());
    else console.error('[broker] failed to start:', r.error);
  });
  ensureDefaultMissions(); // one-time: seed the built-in hourly ops standup
  syncMissions(); // arm recurring auto-dispatch missions now the router is live
  syncContextTriggers(); // …and the context trigger's own compact/clear cadences
  // Pair replies to inbound webhook messages in the ledger. Tied to the FEATURE
  // (any endpoint configured), not to the server: an approved message's card can
  // finish long after the operator switched the public surface back off, and its
  // reply still belongs in the history.
  if ((readConfig().webhookTriggers ?? []).length > 0) startWebhookDoneObserver();
  hookServer.start();
  // Bind the telemetry collector BEFORE the renderer spawns any agent, then point
  // the hive at it so every subsequent spawn is instrumented. Best-effort — a bind
  // failure just leaves telemetry off (transcript reconciler stays). No breaker.start():
  // the breaker is POLICY-only, ticked by the heartbeat beat (#1, ships disabled).
  void telemetry.start().then((r) => {
    if (r.ok && r.endpoint) { hive.setOtelEndpoint(r.endpoint); console.log('[telemetry] collector listening', r.endpoint); }
    else console.error('[telemetry] collector failed to start:', r.error);
  });
  memory.start(); // init shared palace + mine loop (no-op without mempalace)
  reflector.start(); // bound oversized memory.md files on a timer (no-op until threshold)

  armAlwaysOnBeats();
}

/** Cadence of the worker inbox-wake watchdog (#151). Well under the renderer's
 *  own nudge cooldown so a throttled window is caught within ~15s of a stall. */
const WORKER_WAKE_POLL_MS = 15_000;
let workerWakeTimer: ReturnType<typeof setInterval> | null = null;

/** Type the renderer's guarded nudge into one worker's PTY — text first, Enter a
 *  tick later (the exact submitToPty pattern: a single-chunk write would land the
 *  "\r" inside the input box and never submit). Best-effort + never throws. */
function nudgeWorker(ptyId: string, ids: string[] = []): void {
  // Same text the renderer queues (#187's inboxNudgeText), so the two wake paths
  // produce byte-identical nudges: the queue's one-pending rule recognises either
  // via isInboxNudge, and a watchdog nudge names its ids so the agent can still
  // tell "I filed this last turn" from "woken for nothing".
  const wrote = ptyManager.write(ptyId, inboxNudgeText(ids));
  if (!wrote.ok) { console.warn(`[worker-wake] write failed for ${ptyId}: ${wrote.error}`); return; }
  setTimeout(() => {
    try {
      const submitted = ptyManager.write(ptyId, '\r');
      if (!submitted.ok) console.warn(`[worker-wake] submit failed for ${ptyId}: ${submitted.error}`);
    } catch (e) { console.error('[worker-wake] submit threw:', e); }
  }, 140);
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
  const reg = hive.registry();
  if (!reg?.agents || !reg.godId) return;
  const now = Date.now();
  const facts: WorkerWakeFacts[] = [];
  for (const [agentId, a] of Object.entries(reg.agents)) {
    if (agentId === reg.godId || a?.archived) continue;
    const ptyId = ptyForAgent(agentId);
    if (!ptyId) continue;
    const snap = control.snapshot(agentId);
    facts.push({
      agentId,
      isGod: agentId === reg.godId,
      ptyId,
      lastOutputAt: ptyManager.lastOutputAt(ptyId) ?? 0,
      inboxIds: hive.inbox(agentId).map((message) => message.id).filter(Boolean),
      autoDeliveryPaused: snap.autoDeliveryPaused,
      paused: snap.paused,
      halted: snap.halted
    });
  }
  for (const agentId of workerWake.decide(facts, now)) {
    const ptyId = ptyForAgent(agentId);
    if (!ptyId) continue;
    // Re-read at delivery time, not from the facts snapshot: the agent may have
    // drained the mail during the beat, and a nudge naming ids it already filed
    // is the exact staleness #187 exists to stop.
    const ids = hive.inbox(agentId).map((m) => m.id).filter(Boolean);
    if (!ids.length) { console.log(`[worker-wake] ${agentId} drained before delivery, skipping`); continue; }
    console.log(`[worker-wake] nudging ${agentId} on ${ptyId} (${ids.length} pending)`);
    nudgeWorker(ptyId, ids);
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
  // Auto-update from GitHub releases (packaged builds only; gated on the
  // `autoUpdate` config flag). Download-in-background + restart-to-apply toast;
  // never restarts on its own. Falls back to a notify-only releases/latest
  // check where native updating isn't possible (win-portable, dev-ish builds).
  // A floor never checks or installs: an install from one floor would replace
  // the bundle under every other (B23 part 2, risk 12).
  if (!isFloorProcess()) initAutoUpdater(() => liveWebContents());
  // Solo licence renewal question (contract 5.18): one check at start, then a
  // poll for as long as the app runs, so a key replaced on the console locks
  // this machine out of Pro within one poll instead of never (5 Sep 2026).
  // Deactivation flows out through soloLicense.onLicenseChange above.
  soloLicense.startLicenseRecheckLoop();
  // Bootstrap the hive (if harnessHome is configured) and start the message router.
  bootstrapHiveServices();
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
  // 0.5.3, F16: dictation into any app works before Settings is ever opened.
  void syncAnyAppToConfig().catch((e) => console.log(`[anyApp] launch: ${e instanceof Error ? e.message : String(e)}`));
  void syncMeetingHotkeyToConfig().catch((e) => console.log(`[meetingKey] launch: ${e instanceof Error ? e.message : String(e)}`));
  void syncCaptureHotkeyToConfig().catch((e) => console.log(`[captureKey] launch: ${e instanceof Error ? e.message : String(e)}`));
  // 0.5.3, F16: load Apple's model now, not on the composer's first dictation.
  try { getTranscribeRouter().warmUp(); } catch (e) { console.log(`[transcribe] warm up: ${e instanceof Error ? e.message : String(e)}`); }
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
  // BrowserWindow: the Stapler is a BrowserWindow too and it outlives a closed
  // main window, so `getAllWindows().length === 0` was never true again once
  // the puck was up. A person who closed the last window with no agents
  // running was left with a floating puck, no window, and Quit as the only
  // way out; the Dock icon did nothing. Found in 0.5.2, the release that
  // introduces the puck, while proving a "vanishing window" report was macOS
  // Spaces and not the app.
  app.on('activate', () => {
    if (allWindows.size === 0) createWindow();
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
  e.preventDefault();
  if (mainWindow) {
    mainWindow.focus();
    mainWindow.webContents.send('app:closeRequested', { ptyCount: count });
  }
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
  Promise.race([
    analytics.endSession(),
    new Promise<void>((r) => setTimeout(r, 1200))
  ]).then(finish, finish);
});
