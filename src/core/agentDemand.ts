/** Per-office start/sleep arbitration. Mail stays in the inbox until the existing
 * delivery loop proves it was typed; starting a terminal never consumes mail. */
export const DEFAULT_AGENT_IDLE_MINUTES = 60;
export function agentIdleMinutes(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 1
    ? value : DEFAULT_AGENT_IDLE_MINUTES;
}
export interface DemandWiring {
  running(id: string): boolean;
  start(id: string): Promise<void>;
  stop(id: string): Promise<void> | void;
  exempt(id: string): boolean;
  busy(id: string): boolean;
  minutes(): unknown;
  /** Confirm that a saved draft or an unread terminal is not being discarded. */
  canSleep?(id: string): Promise<boolean>;
  sleeping(id: string, asleep: boolean): void;
  waking?(id: string, waking: boolean): void;
  now?: () => number;
}
export class AgentDemand {
  private pending = new Map<string, Promise<void>>();
  private active = new Map<string, number>();
  private now: () => number;
  constructor(private w: DemandWiring) { this.now = w.now ?? Date.now; }
  touch(id: string, at = this.now()): void { this.active.set(id, Math.max(at, this.active.get(id) ?? 0)); }
  starting(id: string): boolean { return this.pending.has(id); }
  wake(id: string): Promise<void> {
    this.touch(id);
    const pending = this.pending.get(id);
    if (pending) return pending.then(() => this.w.running(id) ? undefined : this.wake(id));
    if (this.w.running(id)) return Promise.resolve();
    // Schedule after the map owns the promise, including for a synchronous start failure.
    const work = Promise.resolve().then(async () => {
      this.w.waking?.(id, true);
      await this.w.start(id);
      if (!this.w.running(id)) throw new Error(`${id} did not start`);
      this.w.sleeping(id, false);
      this.touch(id);
    }).finally(() => { this.pending.delete(id); this.w.waking?.(id, false); });
    this.pending.set(id, work);
    return work;
  }
  async tick(ids: readonly string[]): Promise<void> {
    for (const id of ids) {
      if (!this.w.running(id) || this.pending.has(id) || this.w.exempt(id)) continue;
      if (this.w.busy(id)) { this.touch(id); continue; }
      const last = this.active.get(id);
      if (last === undefined) { this.touch(id); continue; }
      if (this.now() - last < agentIdleMinutes(this.w.minutes()) * 60_000) continue;
      const work = Promise.resolve().then(async () => {
        if (this.w.canSleep && !await this.w.canSleep(id)) { this.touch(id); return; }
        // A wake or activity may arrive while the prompt check is in flight.
        if (!this.w.running(id) || this.w.exempt(id)) return;
        if (this.w.busy(id)) { this.touch(id); return; }
        if (this.now() - (this.active.get(id) ?? this.now()) < agentIdleMinutes(this.w.minutes()) * 60_000) return;
        await this.w.stop(id);
        if (this.w.running(id)) throw new Error(`${id} is still running`);
        this.w.sleeping(id, true);
      }).finally(() => { this.pending.delete(id); });
      this.pending.set(id, work);
      await work;
    }
  }
}
