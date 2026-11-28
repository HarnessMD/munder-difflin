/**
 * THE OFFICE CORE AND ITS HOST.
 *
 * The office core is the hive (registry, board, tasks, mail), the terminals
 * (pty), the hook transport, the broker, the automations and the agent spawn.
 * It runs inside the Electron main process and loads no Electron itself.
 *
 * Everything the core needs from the program around it comes through this
 * interface: the harness home, a sink for floor events, the config, a toast
 * and the packaged flag. The app's host is `src/main/electronHost.ts`.
 */
import type { HarnessConfig } from '../main/config';

/** Where a terminal's bytes go: a window's `webContents`. Structurally what `WebContents` offers, so the app
 *  passes its windows as they are. Identity matters: a pty session is owned by
 *  one owner and compared with `===`. */
export interface PtyOwner {
  send(channel: string, ...args: any[]): void;
  isDestroyed(): boolean;
}

export interface OfficeHost {
  /** The app's version string, as agents and the hive log see it. */
  readonly version: string;
  /** A packaged build (true) or a local dev run (false). Core uses it for the
   *  same two things main did: the dev only spawn stagger and the runtime line
   *  in the hive log. */
  readonly packaged: boolean;
  /** The harness home as configured right now, or null before the person has
   *  chosen one. Read lazily on every use so the hive follows config changes. */
  harnessHome(): string | null;
  /** The live config. Core reads it where main did; it never writes it. */
  readConfig(): HarnessConfig;
  /** Push a floor event to whoever is watching the office (the windows in the
   *  app). Returns false when nobody is. Channel names are the IPC names the
   *  renderer already listens on; they do not change. */
  emit(channel: string, payload: unknown): boolean | void;
  /** Tell the person something outside any terminal: a native toast in the
   *  app, gated on the notifications setting there. */
  notify(title: string, body: string): void;
}
