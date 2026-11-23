/**
 * THE SPAWN PATH, out of index.ts. Every agent
 * start comes through `spawnAgentCore`: provider inference, the missing CLI
 * card and installer, worktree isolation, hive provisioning, model and resume
 * flags, and the PTY spawn. The body is the 0.5.5 one, unchanged; what used to
 * be index.ts module state arrives as `SpawnDeps`.
 *
 * Electron never appears here, not even as a type: the window that owns a pty
 * is any `PtyOwner`. Config and the secret store come from main through the
 * deps.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve, sep, dirname } from 'node:path';
import { homedir } from 'node:os';
import { resolveCommand as resolveCliCommand } from '../main/shellEnv';
import { releaseClaudeSession } from '../main/claudeSessionRelease';
import { effectiveMcp, enabledCustomMcp, sanitizeAgentMcp } from '../shared/agentMcp';
import { skillsOffFor, skillsOffSupported } from '../shared/agentSkills';
import { skillRootsFor, skillsOffNamesOnDisk } from '../main/skillsOff';
import { expandTilde } from '../main/fs';
import { getBranch, isRepo, addWorktree, discardNewWorktree } from '../main/git';
import { linkWorktreeDeps } from '../main/worktreeDeps';
import { seedSessionTranscript } from '../main/transcript';
import { analytics } from '../main/analytics';
import { customSecretEnv, customSecretNames } from '../shared/customSecrets';
import { withCodexFolder } from '../shared/codexRemote';
import { pickResumableSession } from '../shared/resumeKey';
import { chooseResumeSession, providerSessionStore, sessionIdFits, type DirLister, type StoreContext } from '../shared/resumeStore';
import { slowSpawnDelayMs } from '../shared/restoreSlow';
import { argsWithAutoModeFlag, inferAgentProvider, isClaudeProvider, nonInteractiveEnvForProvider, providerPreset, installInfoForProvider } from '../shared/agentProvider';
import { buildMissingCliScript, chooseInstallRung, describeMissingCli } from '../main/cliInstall';
import { isPrintModeRun, type CliSetupState } from '../shared/cliSetup';
import { checkSignedIn, hasSignInCheck } from '../main/cliReadiness';
import { detectNodeVersion, nodeIsUsable, resolveNodeInstaller } from '../main/nodeInstall';
import type { PtyOwner } from './host';
import type { PtyManager, SpawnOptions } from '../main/pty';
import type { HiveManager, AgentMeta } from '../main/hive';
import type { HookTransport } from '../main/hookTransport';
import type { MemoryManager } from '../main/memory';
import type { KnowledgeManager } from '../main/knowledge';
import type { SpawnFailReason } from '../main/analytics';
import type { BrokerGrants } from '../main/brokerAccess';
import type { WorkerWakeWatchdog } from '../main/workerWake';
import type { CliLoginWatcher } from '../main/cliLoginWatcher';
import type { HarnessConfig } from '../main/config';
import type * as ConfigModule from '../main/config';
import type * as IntegrationsModule from '../main/integrations';
import { githubStartEnv, githubToken } from '../shared/githubToken';
import type { AgentProvider } from '../shared/agentProvider';
import type { CliMissingState } from '../shared/cliMissing';

/** One live agent run, as main keeps it (the spawn path writes it). */
export interface AgentRun<O extends PtyOwner> {
  opts: AgentSpawnOptions;
  owner: O | null;
  provider: AgentProvider;
  printMode: boolean;
  startedAt: number;
  /** This run really attached a resume (SpawnResult.resumed), so an
   *  abnormal exit at the gate is a refused resume, not a crash mid-work. */
  resumed?: boolean;
  /** The session id that resume attached (Codex), marked refused when Codex
   *  will not reopen it, so no later start tries it again. */
  resumedSession?: string;
}

/** Spawn options shared by the `pty:spawn` IPC handler and the god-triggered
 *  ephemeral-worker watcher. */
export type AgentSpawnOptions = SpawnOptions & { hive?: AgentMeta; isolate?: boolean; /** 0.5.6: a clone reads its source's MCP rows. */ mcpAs?: string; resume?: boolean; requireResume?: boolean; resumeSessionId?: string; provider?: AgentProvider; noAutoInstall?: boolean;
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
  guidedSetup?: boolean;
  /** 0.5.6: this spawn may not run in the folder it was given (a clone, in its
   *  source agent's folder). When no worktree can be made for it, it is refused
   *  and nothing is started. */
  ownWorktreeOnly?: boolean };

export type SpawnResult = { ok: boolean; error?: string; cwd?: string; worktreePath?: string; resumeNotFound?: boolean; resumed?: boolean; seedPrompt?: string; cliMissing?: CliMissingState; signedIn?: boolean; codexFolders?: string[] };

/** What the spawn path reads and writes that belongs to its host. In the app
 *  every field is the index.ts object of the same name. `O` is the window
 *  type: Electron's WebContents in the app. */
export interface SpawnDeps<O extends PtyOwner> {
  ptyManager: PtyManager;
  launchEnvReady: () => Promise<void>;
  ptyOwners: Map<string, O | null>;
  loginWatcher: CliLoginWatcher;
  enableCodexRemoteForSpawn: (opts: SpawnOptions & { hive?: AgentMeta }, agentId: string) => Promise<boolean>;
  ptyToAgent: Map<string, string>;
  pendingInstallRelaunch: Map<string, { opts: AgentSpawnOptions; owner: O | null; bin: string; rung: string }>;
  pendingCliMissing: Map<string, { opts: AgentSpawnOptions; owner: O | null; state: CliMissingState }>;
  sendCliMissing: (id: string, owner: O | null, state: CliMissingState) => void;
  pendingCliSetup: Map<string, { opts: AgentSpawnOptions; owner: O | null; state: CliSetupState; poll?: ReturnType<typeof setInterval> }>;
  agentRuns: Map<string, AgentRun<O>>;
  watchSignIn: (id: string, provider: AgentProvider, binPath: string, env: Record<string, string>, cwd: string) => void;
  endCliSetup: (id: string) => { opts: AgentSpawnOptions; owner: O | null; state: CliSetupState } | undefined;
  sendCliSetup: (id: string, owner: O | null, state: CliSetupState | null) => void;
  hive: HiveManager;
  workerWake: WorkerWakeWatchdog;
  memory: MemoryManager;
  knowledge: KnowledgeManager;
  /** The `++restoreSlowSeq` counter of a restore burst. */
  nextRestoreSlowSeq: () => number;
  /** `app.isPackaged` in the app. */
  isPackaged: () => boolean;
  worktreePaths: Map<string, string>;
  worktreeOrigins: Map<string, string>;
  worktreeBases: Map<string, string>;
  worktreeFinalizing: Map<string, Promise<unknown>>;
  brokerGrants: BrokerGrants;
  BACKEND_KEY_ENV: Record<string, string>;
  providerKeyRef: (backend: string) => string;
  syncKeepAwake: () => void;
  breakerToast: (title: string, body: string) => void;
  skillsResourceDir: () => string;
  findCodexHomeForSession: (sessionId: string, siblingsRoot: string) => string | null;
  spawnFailReason: (error?: string) => SpawnFailReason;
  claudeHookTransport: (command: string, cwd: string) => Promise<HookTransport>;
  readConfig: () => HarnessConfig;
  ensureClaudePermissionsAccepted: typeof ConfigModule.ensureClaudePermissionsAccepted;
  modelForRole: typeof ConfigModule.modelForRole;
  integrations: Pick<typeof IntegrationsModule, 'getSecret' | 'listSecretRefs'> & Partial<Pick<typeof IntegrationsModule, 'listRecords'>>;
  /** The app's hold on a hive Codex start until the person
   *  OKs each `.codex` folder it would load (main/index.ts). `hold` answers the
   *  refusal to return, or null to go on; `probe` and `commit` are its two
   *  halves, for a worktree made just now. Absent: no hold. */
  codexHold?: {
    hold: (opts: AgentSpawnOptions, held: AgentSpawnOptions, owner: O | null, card: boolean) => SpawnResult | null;
    probe: (opts: AgentSpawnOptions) => unknown[] | null;
    commit: (id: string, probe: unknown[], held: AgentSpawnOptions, owner: O | null, card: boolean) => SpawnResult;
  };
  /** 0.5.6: a session starts now, on no work yet (shared/switchClear.ts). Absent: nothing to note. */
  noteSpawn?: (agentId: string) => void;
  /** 0.5.6: the skill folders an agent was started with turned off, told at its start (the app keeps them
   *  for the capabilities sheet). */
  startedWithSkillsOff?: (agentId: string, folders: string[]) => void;
}

/** The spawn path bound to its host. Returns the 0.5.5 `spawnAgentCore`. */
export function createSpawnAgent<O extends PtyOwner>(d: SpawnDeps<O>): (opts: AgentSpawnOptions, owner: O | null) => Promise<SpawnResult> {
  const {
    ptyManager, launchEnvReady, ptyOwners, loginWatcher, enableCodexRemoteForSpawn, ptyToAgent,
    pendingInstallRelaunch, pendingCliMissing, sendCliMissing, pendingCliSetup, agentRuns, watchSignIn,
    endCliSetup, sendCliSetup, hive, workerWake, memory, knowledge,
    worktreePaths, worktreeOrigins, worktreeBases, worktreeFinalizing, brokerGrants, BACKEND_KEY_ENV,
    providerKeyRef, syncKeepAwake, breakerToast, skillsResourceDir, findCodexHomeForSession,
    spawnFailReason, claudeHookTransport, readConfig, ensureClaudePermissionsAccepted, modelForRole, integrations
  } = d;

  /** 0.5.6: the skills turned off for this agent, as names on disk; told to the host first. */
  function skillsOffAtStart(provider: AgentProvider, agentId: string, cwd: string): string[] {
    if (!skillsOffSupported(provider)) return [];
    const folders = skillsOffFor(readConfig().agentSkillsOff, agentId);
    d.startedWithSkillsOff?.(agentId, [...folders]);
    return skillsOffNamesOnDisk(folders, skillRootsFor(cwd));
  }

  async function spawnAgentCore(opts: AgentSpawnOptions, owner: O | null): Promise<SpawnResult> {
    // An agent never starts with a short PATH: a start that beats the login
    // shell's answer waits for it here (0.5.5, Plan G).
    await launchEnvReady();
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
    // A hive Codex agent loads its project's own `.codex` folders
    // without asking (its folder is seeded trusted), so it waits for the
    // person's OK on each one. Checked on the folder given, before a worktree
    // is made, so a held start leaves nothing behind. A linked worktree's
    // folders are named as in the main checkout, so the same OK covers it. The
    // login step is not the agent and is never held. A start nobody has a card
    // for (a voice hire: no owner; a temp: installNow without guidedSetup) puts
    // its folders on the waiting list in Settings instead.
    const codexHold = !!d.codexHold && provider === 'codex' && !!opts.hive && hive.enabled() && opts.loginScript === undefined;
    const codexCard = owner !== null && !(asGiven.installNow === true && asGiven.guidedSetup !== true);
    if (codexHold) {
      const { installNow: _i, guidedSetup: _g, ...held } = asGiven;
      const refused = d.codexHold!.hold(opts, held, owner, codexCard);
      if (refused) return refused;
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
    // 0.5.6: the fall back above is not open to a spawn that may not run in the
    // folder it was given (a clone, in the folder its source agent is working
    // in). Still in that folder here means no worktree was made: not a repo, or
    // the add failed. Refused now, before the hive provisions anything and before
    // the engine starts.
    if (opts.ownWorktreeOnly === true && opts.cwd === asGiven.cwd) {
      return { ok: false, error: 'no worktree of its own could be made, and it may not run in the folder it was given' };
    }
    // The same hold again in a worktree made just now: its committed `.codex` can differ
    // from the main checkout's files. Held, the worktree is taken back (folder,
    // the branch made for it, the three records), so nothing is left when no
    // teardown follows (a temp, a voice hire), and the start is held as given:
    // an Allow makes the worktree again. A worktree that cannot be taken back
    // stays, and the start is held in it as before. The card goes up only after
    // the take back: an Allow while it runs would start the agent in a folder
    // being deleted.
    if (codexHold && opts.cwd !== asGiven.cwd && worktreePaths.get(opts.id) === opts.cwd) {
      const { installNow: _i, guidedSetup: _g, ...held } = asGiven;
      const wt = opts.cwd;
      const origin = worktreeOrigins.get(opts.id) ?? asGiven.cwd;
      const base = worktreeBases.get(opts.id) ?? 'main';
      const probe = d.codexHold!.probe(opts);
      if (probe) {
        const gone = await discardNewWorktree(origin, wt, base);
        if (!gone.ok) {
          console.error('[worktree] a held start could not take its new worktree back:', gone.error);
          return d.codexHold!.commit(opts.id, probe, { ...held, cwd: wt, isolate: false }, owner, codexCard);
        }
        worktreePaths.delete(opts.id);
        worktreeOrigins.delete(opts.id);
        worktreeBases.delete(opts.id);
        return d.codexHold!.commit(opts.id, probe, held, owner, codexCard);
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
    // Permission posture (D9, #626), for EVERY provider. Only a GUI hire (Add
    // Agent) builds its command through buildSpawnCommand, which bakes autoMode's
    // flag into the command STRING before this function sees it. A main-only
    // spawn (the ephemeral-worker watcher, a voice hire) skips that step, so it
    // arrived with no posture at all; this used to be patched for Claude only, and
    // a Codex or Gemini temp still sat at its first approval prompt with nobody to
    // answer it. argsWithAutoModeFlag only ADDS the provider's flag, and only when
    // the args state no posture of their own (hasAutoModeStance), so a GUI spawn
    // is a no-op and a flag the user typed on purpose, either way, is kept. Auto
    // mode off changes nothing. Before ensureAgent, so the provider's positional
    // hive prompt stays the last argument.
    if (opts.hive) opts.args = argsWithAutoModeFlag(opts.args ?? [], readConfig().autoMode === true, provider);
    // If the agent carries hive metadata, provision its workspace and add
    // provider-specific spawn injection. Non-Claude providers get shared AGENT_*
    // env only; Claude Code also gets prompt/settings hook args.
    // Protocol seed that must be TYPED into a bare TUI after boot (Crush —
    // seedDelivery:'type-into-tui') rather than passed on argv. Surfaced in the spawn
    // result so the renderer types it through the per-pty write-chain. (ondev-b)
    let seedPrompt: string | undefined;
    if (opts.hive && hive.enabled()) {
      try {
        const hookTransport = claudeProvider ? await claudeHookTransport(opts.command, opts.cwd) : undefined;
        const inj = await hive.ensureAgent(
          { ...opts.hive, cwd: opts.cwd, provider },
          {
            semanticMemory: memory.active(),
            mempalaceBin: memory.bin(),
            knowledgeGraph: knowledge.active(),
            // Bake the ABSOLUTE KG CLI path into the agent's prompt. The prompt used
            // to spell it `$KG_CLI`, which is POSIX-only: under cmd.exe/PowerShell it
            // expands to nothing, so every knowledge-graph instruction was dead on a
            // Windows floor. Empty when the KG is off (the line isn't emitted then).
            kgCliPath: knowledge.env().KG_CLI,
            theme: readConfig().terminalTheme ?? 'light',
            outputStyle: readConfig().claudeOutputStyle,
            // W3 — MCP consent, resolved for THIS agent: its own rows in
            // config.agentMcp over the floor-wide mcpDefaults.
            mcpDefaults: effectiveMcp(readConfig().mcpDefaults, sanitizeAgentMcp(readConfig().agentMcp), opts.mcpAs ?? opts.hive.id),
            // 0.5.6, the agent file: this agent's own servers from outside the
            // catalog, and only the ones a person switched on.
            customMcp: enabledCustomMcp(readConfig().agentCustomMcp, opts.mcpAs ?? opts.hive.id),
            // 0.5.6: the skills a person turned off for THIS agent, by folder and
            // by the name each SKILL.md gives. Only a Claude Code start writes them.
            skillsOff: skillsOffAtStart(provider, opts.mcpAs ?? opts.hive.id, opts.cwd),
            skillsDir: skillsResourceDir(),
            // The shared palace is mutated by the agent's own `mempalace` calls, so
            // the OS sandbox must let it through (empty when memory is off).
            extraWritableDirs: [memory.env().MEMPALACE_PALACE_PATH].filter((p): p is string => !!p),
            hookTransport
          }
        );
        opts.args = [...(opts.args ?? []), ...inj.args];
        seedPrompt = inj.seedPrompt;
        // A degraded spawn (proxy bridge never bound) is told to the user the same
        // way breaker escalations are: a native toast, gated on the notifications
        // setting. The hive already logged it and pushed hive:degraded to the floor.
        if (inj.degraded) breakerToast('An agent needs a fix', inj.degraded);
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
    // The session id a resume attached, whatever the engine, so the exit handler
    // can mark it refused when the CLI will not reopen it (shared/resumeRetry.ts).
    let resumedSession: string | undefined;
    // Claude-only: these are Claude Code model, naming, turn-limit and resume
    // flags. The permission posture for every provider was applied above.
    if (opts.hive && claudeProvider) {
      const cfg = readConfig();
      const args = [...(opts.args ?? [])];
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
      // A typed id the CLI already refused is not handed to it again,
      // as on the other engines' path below; the recorded walk leaves those out.
      const typedClaudeSid = typeof opts.resumeSessionId === 'string' ? opts.resumeSessionId.trim() : '';
      const explicitSid = typedClaudeSid && hive.isRefusedSession?.(opts.hive.id, typedClaudeSid) !== true ? typedClaudeSid : '';
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
          resumedSession = sid;
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
      // 0.5.8 blocker: a session the CLI already refused is never handed to it
      // again, typed or recorded (shared/resumeRetry.ts). A refused typed id
      // falls back to the recorded walk, which leaves the refused ones out too.
      // Nor one in a form this engine refuses on sight (resumeStore.ts sessionIdFits): an agent that changed
      // engine keeps the old engine's ids, and OpenCode was handed Claude's at every start. None left: fresh, and said.
      const fits = (s: string | undefined): s is string => !!s && sessionIdFits(provider, s);
      const typedOk = fits(typedSid) && hive.isRefusedSession?.(opts.hive.id, typedSid) !== true;
      const recorded = opts.resume === true ? hive.resumeCandidates(opts.hive.id) : [];
      const walked = typedOk ? [typedSid] : recorded.filter(fits);
      if (!typedOk && !walked.length && recorded.some(Boolean)) {
        console.warn(`[resume] ${opts.hive.id}: no recorded session is in ${provider}'s own form - starting a fresh session`);
        resumeNotFound = true;
      }
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
          if (!args.includes(rf)) { args.push(rf, sid); opts.args = args; didResume = true; resumedSession = sid; }
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
          if (args[0] !== rsub) { opts.args = [rsub, sid, ...args]; didResume = true; resumedSession = sid; }
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
      // 0.5.6: a session starts now, on no work yet (shared/switchClear.ts).
      d.noteSpawn?.(opts.hive.id);
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
        const key = integrations.getSecret(providerKeyRef(backend), { kind: 'env' });
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
    // Custom secrets (Settings > Keys & Secrets): every agent,
    // whatever its CLI, gets each one as the env var of its name. Read MAIN ONLY
    // here; never over the harness's own vars (shared/customSecrets.ts).
    if (opts.hive) {
      const custom = customSecretEnv(customSecretNames(integrations.listSecretRefs()), (ref) => integrations.getSecret(ref, { kind: 'env' }), opts.env ?? {});
      if (Object.keys(custom).length > 0) opts.env = { ...(opts.env ?? {}), ...custom };
      // The GitHub token, for git and gh (shared/githubToken.ts). After the secrets: one named GH_TOKEN stands.
      const github = githubStartEnv(githubToken(integrations.listRecords?.() ?? [], (ref, use) => integrations.getSecret(ref, use)), { GIT_CONFIG_COUNT: process.env.GIT_CONFIG_COUNT, ...(opts.env ?? {}) });
      if (Object.keys(github).length > 0) opts.env = { ...(opts.env ?? {}), ...github };
    }
    // Codex Remote is daemon-based (there is no `/remote-control` slash command).
    // Start/enable the daemon under this agent's isolated CODEX_HOME and connect
    // the TUI to it so the thread is visible in ChatGPT mobile. Best-effort: an
    // unavailable/older Codex install still gets a normal local terminal.
    if (provider === 'codex' && opts.hive?.id) {
      opts.args = withCodexFolder(opts.args ?? [], opts.cwd);
      await enableCodexRemoteForSpawn(opts, opts.hive.id);
    }
    // The dev stagger, immediately before the real spawn and after every
    // step that could still refuse it, so a refused spawn does not wait for
    // nothing and the wait is the last thing between the gate and the PTY.
    const wait = slowSpawnDelayMs(process.env.MD_RESTORE_SLOW_MS, d.nextRestoreSlowSeq(), d.isPackaged());
    if (wait > 0) {
      console.log(`[dev] MD_RESTORE_SLOW_MS: spawn ${opts.id} waits ${wait} ms`);
      await new Promise((r) => setTimeout(r, wait));
    }
    // 0.5.5: every hive agent gets the integration broker, lasting agents and a
    // restore included (only temps did before). Granted here, after every step
    // that could still refuse the spawn, so a refusal leaves no live token. A
    // restore mints a new grant against this launch's port. Not in asGiven, so a
    // later restart is granted fresh too.
    if (opts.hive) opts.env = { ...(opts.env ?? {}), ...brokerGrants.grant(opts.id, opts.env?.AGENT_DIR) };
    const res = ptyManager.spawn(opts, owner);
    if (!res.ok && opts.hive) brokerGrants.release(opts.id);
    if (res.ok) analytics.track('agent_spawned', { provider });
    else analytics.track('agent_spawn_failed', { provider, reason: spawnFailReason(res.error) });
    if (res.ok) { loginWatcher.track(opts.id, provider); ptyOwners.set(opts.id, owner); }
    if (res.ok) {
      // Started again in the SAME folder: a worktree made above is reused, not
      // made twice (the renderer's revive does the same, isolate off).
      const wt = worktreePaths.get(opts.id);
      agentRuns.set(opts.id, {
        opts: { ...asGiven, ...(wt ? { cwd: wt, isolate: false } : {}), installNow: undefined, guidedSetup: undefined },
        owner, provider, printMode: isPrintModeRun(provider, opts.args ?? []), startedAt: Date.now(),
        ...(didResume ? { resumed: true } : {}),
        ...(resumedSession ? { resumedSession } : {})
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

  return spawnAgentCore;
}

