import { useEffect, useSyncExternalStore } from 'react';
import { useStore, type Agent } from '@/store/store';
import { buildSpawnCommand, inferAgentProvider, tokenizeCommand, type HarnessConfig } from '@/store/config';
import { respawnAgent, rendererRespawnDeps } from './respawnAgent';
import { splitRestorable } from '@/hooks/restoreGate';
import { commandWithModel } from '@shared/liveModel';

/** "Restore team" — respawn every worker from the previous session.
 *
 *  Lives here rather than inside AgentStrip because the floor strip is hidden in
 *  fullscreen, which used to mean the restore button (and the list of restorable
 *  agents) simply vanished when you went fullscreen. Both mount points share the
 *  progress state below, so a restore kicked off from one view shows as running
 *  in the other and can't be double-started. */

let restoring = false;
let note: string | null = null;
/** True only while the AUTOMATIC boot restore is in flight, so the UI can say
 *  "this is happening on its own" rather than looking like a click you don't
 *  remember making. */
let autoRestoring = false;
/** Latched the moment the automatic restore starts. Module-level, not per
 *  component: `useRestoreTeam` is mounted from both the floor strip and the
 *  fullscreen rail, and without this each of them would kick off its own. */
let autoStarted = false;
/** How many of the run's spawns have ANSWERED, restored or failed. The boot
 *  gate's line reads restorable minus this: spawns run as one batch and the
 *  agents join the roster only after the whole batch, so without this count
 *  the line sat on the full number until the last spawn answered and then
 *  dropped to zero in one step (found with MD_RESTORE_SLOW_MS, 0.5.2). An
 *  agent that turns out to be already live leaves the restorable list on
 *  its own and is not counted here twice. */
let landed = 0;
const listeners = new Set<() => void>();

/** How long to wait after boot before restoring on our own.
 *
 *  App.tsx reconciles the persisted roster against the PTYs actually alive in
 *  the main process, and that is an async round trip. Firing before it lands
 *  would read a restorable list that still contains agents whose terminals are
 *  already running, and try to spawn duplicates of them. The delay is also the
 *  window in which you can hit a dismiss ✕ if you don't want an agent back. */
export const AUTO_RESTORE_DELAY_MS = 2500;

function emit(): void {
  for (const l of [...listeners]) l();
}

/** Ids whose terminal ENDED in the previous session. Asked once per window: the
 *  answer is a snapshot main took at bootstrap and never changes while the app
 *  runs, and the gate runs on every restore path. */
let archivedAtBoot: Promise<string[]> | null = null;

/**
 * THE RESTORE GATE (0.5.5, findings item 5: "archived agents get started again").
 *
 * The restorable list is built from the renderer's roster alone
 * (`reconcileWithLivePtys`: a roster agent whose PTY is no longer alive). The
 * roster only learns about a terminal the person ENDED with a button; a terminal
 * that ended on its own (the CLI exited, crashed, or was killed from outside the
 * app) leaves the card in place deliberately so Restart still works — see
 * `teardownPty` in src/main/index.ts, which broadcasts `hive:agentArchived` for
 * temps only. Main archives that agent in the registry all the same. At the next
 * launch the roster called it restorable and the automatic restore started it
 * again, with the registry saying archived the whole time.
 *
 * So: ask main which agents ENDED in the previous session, and move those off the
 * restorable list into the archived one. Both stores then agree, the button's
 * count is honest, and "Reopen" is the only way such an agent comes back.
 *
 * ENDED, not "archived". `archiveOrphanedAgents` archives every entry with no
 * live PTY at every startup as bookkeeping; an agent archived only that way must
 * still restore. main keeps the two apart in src/main/restoreGateStore.ts.
 *
 * Failure is non-fatal on purpose. If main cannot answer we restore exactly as
 * before rather than refusing to bring a team back.
 */
async function applyRestoreGate(): Promise<void> {
  try {
    if (!archivedAtBoot) archivedAtBoot = Promise.resolve(window.cth?.hiveArchivedAtBoot?.() ?? []);
    const ids = await archivedAtBoot;
    if (!ids.length) return;
    const { retire } = splitRestorable(useStore.getState().restorableAgents, ids);
    if (!retire.length) return;
    console.warn('[restore] not starting agents whose terminal ended last session:', retire.map((a) => a.id).join(', '));
    useStore.getState().retireRestorable(retire.map((a) => a.id));
  } catch (e) {
    archivedAtBoot = null;
    console.error('[restore] archived-at-boot gate failed; restoring ungated', e);
  }
}

/** Stopped agents the AUTOMATIC restore leaves alone (0.5.8,
 *  src/shared/agentLive.ts): one whose terminal ended on its own soon after
 *  starting twice in a row, or that the circuit breaker stopped. They stay on
 *  the restorable list, so a click on Restore team still starts them. Asked once
 *  per window, like the archived set; a failed ask holds nothing back. */
let heldAtBootAsk: Promise<Array<{ id: string; why: 'crash-loop' | 'guardrail' }>> | null = null;
async function heldAtBoot(): Promise<Map<string, 'crash-loop' | 'guardrail'>> {
  try {
    if (!heldAtBootAsk) heldAtBootAsk = Promise.resolve(window.cth?.hiveHeldAtBoot?.() ?? []);
    return new Map((await heldAtBootAsk).map((h) => [h.id, h.why]));
  } catch (e) {
    heldAtBootAsk = null;
    console.error('[restore] held-at-boot ask failed; holding nothing back', e);
    return new Map();
  }
}

const HELD_WHY: Record<'crash-loop' | 'guardrail', string> = {
  'crash-loop': 'it ended on its own twice right after starting',
  guardrail: 'the circuit breaker stopped it'
};

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** The boot gate (store/bootGate.ts) follows the automatic restore from
 *  here: not started, running, or over. Over with failures is over; the
 *  failures are on the floor for the person to read. */
export const subscribeRestore = subscribe;
export function autoRestorePhase(): 'idle' | 'running' | 'done' {
  if (!autoStarted) return 'idle';
  // Running from the moment the automatic run is CLAIMED, not from the
  // moment restoreTeam() marks itself busy one call later. The claim below
  // emits between the two, the gate reads that tick as "started and over",
  // and its latch held that answer for the life of the window: the blur
  // came down the instant the restore began and never counted a spawn.
  // Found by mounting the boot (test/boot-blur-replay.test.cjs, 0.5.2).
  return restoring || autoRestoring ? 'running' : 'done';
}
/** Spawns answered so far in the run in flight; 0 between runs. */
export function restoreLanded(): number {
  return landed;
}

// useSyncExternalStore requires a stable snapshot identity — returning a fresh
// object each call would loop forever, so the two fields are read separately.
const getRestoring = (): boolean => restoring;
const getNote = (): string | null => note;
const getAutoRestoring = (): boolean => autoRestoring;

export interface RestoreTeamState {
  restoring: boolean;
  /** True when the run in flight was started automatically at boot, not by a
   *  click. Drives the "restoring your team…" banner. */
  autoRestoring: boolean;
  /** Outcome of the last run ("restored 3 · 1 failed — …"), or null. */
  restoreNote: string | null;
  restoreTeam: () => Promise<void>;
}

/**
 * @param config used only to rebuild a spawn command for a restorable agent
 *        persisted before the `command` field existed.
 */
export function useRestoreTeam(config?: HarnessConfig | null): RestoreTeamState {
  const isRestoring = useSyncExternalStore(subscribe, getRestoring, getRestoring);
  const restoreNote = useSyncExternalStore(subscribe, getNote, getNote);
  const isAutoRestoring = useSyncExternalStore(subscribe, getAutoRestoring, getAutoRestoring);

  /** Respawn every worker from the previous session with its ORIGINAL agent id,
   *  cwd, model and command — the hive workspace (memory.md, inbox, registry
   *  entry) reattaches by itself, no memory transplant needed. */
  const restoreTeam = async (): Promise<void> => {
    if (restoring) return;
    restoring = true;
    landed = 0;
    note = null;
    emit();
    // THE GATE (item 5, 0.5.5). An agent starts only if BOTH stores say it is
    // live. `reconcileWithLivePtys` builds the restorable list from the renderer's
    // roster alone, and the roster does not learn about a terminal that ended
    // without a button press — so an agent whose terminal ended could arrive here
    // and be started again. Ask main which agents ENDED last session and retire
    // those instead of spawning them.
    await applyRestoreGate();
    const restorableAgents = useStore.getState().restorableAgents;
    // The automatic restore leaves held agents where they are, and says so.
    const held = autoRestoring ? await heldAtBoot() : new Map<string, 'crash-loop' | 'guardrail'>();
    const leftAlone = restorableAgents.filter((a) => held.has(a.id));
    // Answered already, so the boot gate's count does not wait on them.
    if (leftAlone.length) { landed += leftAlone.length; emit(); }
    // Tally every agent's outcome so the run ALWAYS leaves a visible trace — the
    // original bug was that every failure path was console-only, so a click that
    // couldn't spawn anything looked like a dead button.
    let restored = 0;
    let alreadyLive = 0;
    const failures: string[] = [];
    const fresh: string[] = [];
    try {
      // Restore every agent CONCURRENTLY. Each spawn is keyed by its own ptyId and
      // touches no cross-agent state in the renderer, and in the main process the
      // whole `pty:spawn` handler (hive registry read-modify-write included) runs
      // synchronously between awaits, so concurrent handlers can't interleave
      // mid-update. Serially this cost the sum of every agent's git probe + spawn;
      // a 6-agent team took ~6× one agent for no reason.
      // Spawns run concurrently but agents are ADDED in roster order afterwards.
      // Calling addAgent from inside each spawn made completion timing decide
      // the roster order — and that order is persisted, so a slow provider or a
      // slow git probe silently overwrote the sequence the user had dragged the
      // cards into.
      const restoredInOrder = await Promise.all([...restorableAgents].map(async (a): Promise<Agent | null> => {
        // Held: stays on the restorable list, named in the note below.
        if (autoRestoring && !a.isGod) {
          landed++; emit();
          return { ...a, ptyId: a.ptyId ?? `pty-${a.id}`, sleeping: true, exit: undefined, status: 'sleeping', action: 'Sleeping', seedPrompt: undefined };
        }
        if (held.has(a.id)) return null;
        // Per-agent guard: one agent's failure (or a rejected IPC call) must NEVER
        // abort the others — an unhandled rejection here used to make the
        // entire restore a silent no-op after the first bad agent.
        try {
          const provider = inferAgentProvider(a.command, a.provider);
          // 0.5.3 bug 2(b): replay the saved command ON the model last seen running.
          // The saved line alone lost it twice over: an old --model in it beat the
          // saved `model`, and a line with no --model got today's floor default.
          const command = commandWithModel(a.command, a.model, provider) || (config ? buildSpawnCommand(config, a.model, provider) : '');
          if (!command || !a.cwd) {
            // No spawn recipe (an old entry persisted before `command`, with no
            // config to rebuild one). Keep it restorable and SAY why rather than
            // silently dropping it — silent removal read as "nothing happened".
            failures.push(`${a.name}: no saved command`);
            return null;
          }
          const [exe, ...args] = tokenizeCommand(command);
          // One recipe, shared with "Reopen" on an archived agent (#503):
          // original id, its own worktree when that is still on disk (the base
          // repo when it is not), prior CLI session resumed, so the registry
          // entry, memory.md and inbox reattach by id. See hooks/respawnAgent.ts.
          const res = await respawnAgent(a, { provider, exe: exe ?? '', args }, rendererRespawnDeps);
          if (res.outcome === 'respawned') {
            if (res.worktreeGone) {
              console.warn(`[restore] worktree gone for ${a.id} (${a.worktreePath}); falling back to base repo ${a.cwd}`);
            }
            restored++;
            // 0.5.3 bug 1: a session was on record and none of it could be resumed.
            // The agent is up but EMPTY, and 'restored 5' over that is a lie.
            if (res.resumeNotFound) fresh.push(a.name);
            landed++;
            emit();
            return {
                ...a,
                provider,
                ptyId: res.ptyId,
                archived: false,
                status: 'idle',
                // Surface the worktree fallback on the floor card; otherwise normal.
                action: res.worktreeGone ? 'worktree gone — using base repo' : res.resumeNotFound ? 'started fresh, last session not found' : 'starting up',
                // The worktree is no longer on disk — drop it so this agent is treated
                // as a plain base-cwd agent going forward (a future restore won't keep
                // re-probing a dead path).
                worktreePath: res.worktreeGone ? undefined : a.worktreePath,
                // Crush spawns bare (no positional protocol) and hands the seed back
                // here; useHive types it after boot. Re-seeding a resumed worker is
                // idempotent (it just re-reads its inbox per protocol). (ondev-b)
                seedPrompt: res.seedPrompt,
                carrying: undefined,
                currentStation: 'desk',
                recentTextTs: Date.now()
            };
          } else if (res.outcome === 'already-live') {
            // A live PTY with this id is already running (e.g. respawned at boot or
            // by another path) — the agent isn't actually missing, so retire it from
            // the restorable list rather than reporting a phantom failure.
            alreadyLive++;
            useStore.getState().removeRestorableAgent(a.id);
          } else {
            // Leave it restorable so the user can retry — but record WHY so the
            // outcome is shown on the floor, not buried in the devtools console.
            failures.push(`${a.name}: ${res.error}`);
            console.error('[restore] spawn failed for', a.id, res.error);
            landed++;
            emit();
          }
        } catch (e) {
          failures.push(`${a.name}: ${e instanceof Error ? e.message : String(e)}`);
          console.error('[restore] error for', a.id, e);
          landed++;
          emit();
        }
        return null;
      }));
      // Add in the ORIGINAL roster order, not completion order.
      for (const restoredAgent of restoredInOrder) {
        if (restoredAgent) useStore.getState().addAgent(restoredAgent, { keepSelection: true });
      }
    } finally {
      restoring = false;
      landed = 0;
      // ALWAYS surface a result so the button can never look inert.
      const parts: string[] = [];
      if (restored) parts.push(`restored ${restored}`);
      if (alreadyLive) parts.push(`${alreadyLive} already live`);
      if (fresh.length) parts.push(`${fresh.length} started fresh, last session not found: ${fresh.join(', ')}`);
      if (failures.length) parts.push(`${failures.length} failed — ${failures.join('; ')}`);
      if (leftAlone.length) {
        const why = leftAlone.map((a) => `${a.name} (${HELD_WHY[held.get(a.id) ?? 'crash-loop']})`).join('; ');
        parts.push(`${leftAlone.length} not started on ${leftAlone.length === 1 ? 'its' : 'their'} own: ${why}. Press Restore team to start ${leftAlone.length === 1 ? 'it' : 'them'}`);
      }
      note = parts.length ? parts.join(' · ') : 'nothing to restore';
      emit();
    }
  };

  // Restore the previous session's team on open, without waiting for a click.
  //
  // Deliberately driven by a store SUBSCRIPTION rather than a plain timer: the
  // restorable list is empty on the first render and only fills once App.tsx's
  // PTY reconcile resolves, so a timer started at mount would look at an empty
  // list, decide there was nothing to do, and never look again.
  //
  // Only ever fires for agents BOTH stores agree are live. The roster's half is
  // the restorable list (a terminal was open when the app last quit); the
  // registry's half is applyRestoreGate below, which retires anything the
  // previous session left archived. An archived agent comes back only through
  // "Reopen", which is a deliberate press.
  useEffect(() => {
    if (autoStarted || !config?.onboardingComplete) return;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const startAutoRestore = (): void => {
      // Latch BEFORE the await so the other mount point's timer, which may
      // fire in this same tick, sees it.
      autoStarted = true;
      autoRestoring = true;
      emit();
      void restoreTeam().finally(() => { autoRestoring = false; emit(); });
    };

    const check = (): void => {
      if (autoStarted || restoring || timer) return;
      if (!useStore.getState().restorableAgents.length) return;
      timer = setTimeout(() => {
        timer = null;
        if (autoStarted || restoring) return;
        if (!useStore.getState().restorableAgents.length) return;
        // Gate here as well as inside restoreTeam: this is what keeps the restore
        // button's count honest, and it must be able to empty the list so a team
        // of nothing but archived agents never starts an automatic restore at all.
        void applyRestoreGate().then(() => {
          if (autoStarted || restoring) return;
          if (!useStore.getState().restorableAgents.length) { emit(); return; }
          startAutoRestore();
        });
      }, AUTO_RESTORE_DELAY_MS);
    };

    check();
    const unsub = useStore.subscribe(check);
    return () => { unsub(); if (timer) clearTimeout(timer); };
    // restoreTeam is rebuilt every render but only ever called from inside the
    // timer, so it is read fresh at call time and does not belong in the deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.onboardingComplete]);

  return { restoring: isRestoring, autoRestoring: isAutoRestoring, restoreNote, restoreTeam };
}
