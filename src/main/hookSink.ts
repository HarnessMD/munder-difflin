/**
 * The hook server's renderer sink (#463). Its own file with no electron import
 * so it is unit testable without the Electron binary.
 */

/** Where hook driven renderer events go. Structurally an Electron WebContents,
 *  so tests can pass a bare `{ send }` and main can pass a fan out. */
export interface HookSink {
  send(channel: string, ...args: unknown[]): void;
}

/** One sink that reaches EVERY floor window with the events that describe
 *  agent state (`hive:hookEvent`, `hive:contextUpdate`, `hive:modelUpdate`)
 *  and only the live (focused) window with `control:approvalRequest`. (#463)
 *
 *  Why: each floor window runs its own store and queue drain, and its status,
 *  idle gate and stuck head release all come from these events. They used to
 *  go to `mainWindow` alone, which follows focus, so a floor that was not
 *  focused never saw its own agents' hooks. Each window ignores agents it does
 *  not hold. The approval dialog stays on one window: one prompt, one answer. */
export function fanOutHookSink(all: () => readonly HookSink[], live: () => HookSink | null): HookSink {
  return {
    send(channel: string, ...args: unknown[]): void {
      if (channel === 'control:approvalRequest') {
        try { live()?.send(channel, ...args); } catch { /* window tore down */ }
        return;
      }
      for (const sink of all()) {
        try { sink.send(channel, ...args); } catch { /* window tore down */ }
      }
    }
  };
}
