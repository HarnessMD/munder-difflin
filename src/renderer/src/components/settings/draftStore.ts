/**
 * THE SETTINGS DRAFT (0.5.3, founder 24 Sep 2026: "there should be only one
 * save button that saves the settings whatever changes are made, no turn on,
 * no turn off, no save individually").
 *
 * Every section of Settings, in SettingsModal or in its own file under
 * components/settings/, writes its changes HERE instead of to disk. The footer
 * Save is the only thing that commits them. Two kinds of change:
 *
 *   - a config field: `stage({ key: value })`. All staged fields go to main in
 *     ONE updateConfig, merged with the modal's own form, so a half applied
 *     save is not a state the app can reach.
 *   - anything that is not a config field (a key for the write only secret
 *     broker, a connection that has to be started): `setTask(id, run)`. Tasks
 *     run after the config write, in the order they were first set. Setting the
 *     same id again replaces the task; `null` drops it.
 *
 * A toggle is just a field in the draft. Nothing here turns a thing on.
 *
 * Import free on purpose: test/load-ts.cjs loads this file and runs it, which
 * it cannot do for a .tsx or anything that imports React.
 */

export type DraftTask = () => Promise<void>;

export interface DraftCommitResult {
  ok: boolean;
  /** One entry per thing that failed: 'config' for the config write, else the
   *  task's id. Whatever failed stays in the draft, so Save can be pressed
   *  again without typing anything twice. */
  errors: Array<{ id: string; message: string }>;
}

export interface SettingsDraft {
  /** Stage config fields. A later stage of the same key wins. */
  stage(patch: Record<string, unknown>): void;
  /** Drop staged fields (a section put a value back to what is on disk). */
  unstage(keys: readonly string[]): void;
  /** The staged value of `key`, or `fallback` when nothing is staged. */
  value<T>(key: string, fallback: T): T;
  /** Add, replace or (with null) drop a non config change. */
  setTask(id: string, run: DraftTask | null): void;
  hasTask(id: string): boolean;
  /** A copy of the staged config fields. */
  patch(): Record<string, unknown>;
  taskIds(): string[];
  dirty(): boolean;
  /** Bumps on every change; the React hook re-renders off it. */
  version(): number;
  subscribe(fn: () => void): () => void;
  /**
   * Write `base` merged with the staged fields (staged wins) through `write`,
   * then run the tasks. Fields and tasks that were changed again while the
   * save was in flight are kept, since the save did not carry the new value.
   */
  commit<P extends object>(base: P, write: (patch: P) => Promise<unknown>): Promise<DraftCommitResult>;
  /** Forget everything staged (Close without saving). */
  reset(): void;
}

const errText = (e: unknown): string => (e instanceof Error ? e.message : String(e));

export function createSettingsDraft(): SettingsDraft {
  let fields: Record<string, unknown> = {};
  const tasks = new Map<string, DraftTask>();
  const listeners = new Set<() => void>();
  let ver = 0;

  const changed = (): void => {
    ver += 1;
    for (const fn of [...listeners]) {
      try { fn(); } catch { /* a listener's failure is not the draft's */ }
    }
  };

  return {
    stage(patch) {
      const keys = Object.keys(patch);
      if (keys.length === 0) return;
      fields = { ...fields, ...patch };
      changed();
    },
    unstage(keys) {
      let hit = false;
      const next = { ...fields };
      for (const k of keys) if (k in next) { delete next[k]; hit = true; }
      if (!hit) return;
      fields = next;
      changed();
    },
    value<T>(key: string, fallback: T): T {
      return key in fields ? (fields[key] as T) : fallback;
    },
    setTask(id, run) {
      if (run === null) {
        if (!tasks.delete(id)) return;
      } else {
        tasks.set(id, run);
      }
      changed();
    },
    hasTask: (id) => tasks.has(id),
    patch: () => ({ ...fields }),
    taskIds: () => [...tasks.keys()],
    dirty: () => Object.keys(fields).length > 0 || tasks.size > 0,
    version: () => ver,
    subscribe(fn) {
      listeners.add(fn);
      return () => { listeners.delete(fn); };
    },
    async commit<P extends object>(base: P, write: (patch: P) => Promise<unknown>) {
      const sent = fields;
      const errors: DraftCommitResult['errors'] = [];
      try {
        await write({ ...base, ...sent } as P);
      } catch (e) {
        return { ok: false, errors: [{ id: 'config', message: errText(e) }] };
      }
      // Clear only what was sent and not restaged since.
      const next = { ...fields };
      let cleared = false;
      for (const k of Object.keys(sent)) {
        if (k in next && Object.is(next[k], sent[k])) { delete next[k]; cleared = true; }
      }
      if (cleared) { fields = next; changed(); }

      for (const [id, run] of [...tasks]) {
        try {
          await run();
          if (tasks.get(id) === run) { tasks.delete(id); changed(); }
        } catch (e) {
          errors.push({ id, message: errText(e) });
        }
      }
      return { ok: errors.length === 0, errors };
    },
    reset() {
      if (Object.keys(fields).length === 0 && tasks.size === 0) return;
      fields = {};
      tasks.clear();
      changed();
    }
  };
}

/** Where a collapsible section remembers being open, per section id. */
export const COLLAPSE_STORE_PREFIX = 'cth.settings.open.';
