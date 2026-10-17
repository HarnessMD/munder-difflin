/**
 * Realtime voice — floor delta watcher (v0.3.4).
 *
 * The voice session's context strategy is "snapshot at connect + APPEND-ONLY
 * deltas" (never session.update on instructions — that busts the prompt cache).
 * This watcher is the delta half: while a voice session is live, it polls the
 * floor's main-side signals and pushes short coalesced update sentences that
 * the renderer injects into the conversation as silent items.
 *
 * Signals (all owned by main — no renderer trust):
 *   - roster: agents appearing / archiving (hive registry)
 *   - tasks: status transitions on the kanban ledger
 *   - activity: a pty flipping between quiet and streaming (≈ idle ↔ working)
 * Deltas are debounced (≥ MIN_PUSH_GAP_MS between pushes) and coalesced into
 * one parenthetical line, capped in length. When no session is live, nothing
 * is emitted and nothing queues — the next connect takes a fresh snapshot.
 */

interface RegistryLike {
  agents: Record<string, { name?: string; archived?: boolean }>;
  orchestratorId?: string | null;
}

export interface FloorWatcherDeps {
  enabled(): boolean;
  registry(): RegistryLike;
  tasks(): unknown;
  ptys(): Array<{ id: string; lastOutputAt: number }>;
  push(text: string): void;
}

const POLL_MS = 5_000;
const MIN_PUSH_GAP_MS = 12_000;
const ACTIVE_WINDOW_MS = 8_000;
const MAX_PUSH_CHARS = 600;

export class RealtimeFloorWatcher {
  private deps: FloorWatcherDeps;
  private timer: ReturnType<typeof setInterval> | null = null;
  private live = false;
  private lastPushAt = 0;
  private buffer: string[] = [];
  private prevAgents = new Map<string, { archived: boolean; name: string }>();
  private prevTasks = new Map<string, { status: string; title: string }>();
  private prevActive = new Map<string, boolean>();
  private primed = false;

  constructor(deps: FloorWatcherDeps) {
    this.deps = deps;
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => { try { this.tick(); } catch { /* never throw from a timer */ } }, POLL_MS);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  setSessionLive(live: boolean): void {
    this.live = live;
    // A fresh session starts from a fresh snapshot — old buffered deltas would
    // duplicate what the snapshot already says.
    this.buffer = [];
    this.primed = false; // re-prime so the first tick after connect diffs from NOW
  }

  private tick(): void {
    if (!this.deps.enabled()) return;

    const reg = this.deps.registry();
    const agents = new Map<string, { archived: boolean; name: string }>();
    for (const [id, m] of Object.entries(reg.agents ?? {})) {
      agents.set(id, { archived: !!m.archived, name: m.name || id });
    }

    const tasksRaw = this.deps.tasks() as { tasks?: Array<{ id?: string; status?: string; title?: string }> } | null;
    const tasks = new Map<string, { status: string; title: string }>();
    for (const t of Array.isArray(tasksRaw?.tasks) ? tasksRaw!.tasks! : []) {
      if (typeof t?.id === 'string') tasks.set(t.id, { status: t.status ?? 'todo', title: t.title ?? t.id });
    }

    const now = Date.now();
    const active = new Map<string, boolean>();
    for (const p of this.deps.ptys()) {
      active.set(p.id.replace(/^pty-/, ''), now - p.lastOutputAt < ACTIVE_WINDOW_MS);
    }

    if (this.primed && this.live) {
      // roster changes
      for (const [id, cur] of agents) {
        const prev = this.prevAgents.get(id);
        if (!prev) this.buffer.push(`${cur.name} joined the floor`);
        else if (!prev.archived && cur.archived) this.buffer.push(`${cur.name} was archived`);
        else if (prev.archived && !cur.archived) this.buffer.push(`${cur.name} is back from the archive`);
      }
      // task transitions
      for (const [id, cur] of tasks) {
        const prev = this.prevTasks.get(id);
        if (!prev) this.buffer.push(`new task "${cur.title.slice(0, 60)}"`);
        else if (prev.status !== cur.status) this.buffer.push(`task "${cur.title.slice(0, 60)}" moved to ${cur.status}`);
      }
      // activity flips (quiet ↔ streaming), named via the registry
      for (const [id, isActive] of active) {
        const prev = this.prevActive.get(id);
        const name = agents.get(id)?.name;
        if (prev === undefined || !name || agents.get(id)?.archived) continue;
        if (prev && !isActive) this.buffer.push(`${name} went quiet (likely done or idle)`);
        else if (!prev && isActive) this.buffer.push(`${name} started producing output`);
      }
    }

    this.prevAgents = agents;
    this.prevTasks = tasks;
    this.prevActive = active;
    this.primed = true;

    if (!this.live || this.buffer.length === 0) { if (!this.live) this.buffer = []; return; }
    if (now - this.lastPushAt < MIN_PUSH_GAP_MS) return;

    const text = this.buffer.join('; ').slice(0, MAX_PUSH_CHARS);
    this.buffer = [];
    this.lastPushAt = now;
    this.deps.push(text);
  }
}
