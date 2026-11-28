/**
 * THE FLOOR GATE (0.5.3, B21 and B23 part 2, Creed 23 Sep 2026): the Electron
 * side of floorLock.ts. Three jobs, kept out of index.ts so the spawn work
 * (Kevin, process per floor) and this can land side by side.
 *
 *   1. At boot, take this hive's lock before the hook server starts. A hive
 *      another live floor holds is refused with a dialog: choose another
 *      folder (config is repointed and the app relaunches) or quit. The lock
 *      is released on will-quit.
 *   2. "New Floor" opens the picker in the renderer (B21) instead of a second
 *      window of the same floor; the picker asks main to probe the remembered
 *      folders and to open the one chosen.
 *   3. `floor:open` validates the choice (not this floor's own hive, not a hive
 *      another floor holds, not this floor's own data folder), makes the folder
 *      when it is new, and hands the request to the floor spawner. Until the
 *      spawner is registered (setFloorSpawner, Kevin's process per floor) the
 *      answer is a plain "not in this build yet", never a second window.
 */
import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import {
  acquireFloorLock, releaseFloorLock, describeFloorLock, validateFloorRequest, probeFloor,
  type FloorContext, type FloorIdentity, type FloorLock, type FloorProbe, type FloorRefusal
} from './floorLock';

export interface FloorGateDeps {
  /** HiveManager.root(): `<harnessHome>/hive`, or null before onboarding. */
  hiveRoot: () => string | null;
  currentHome: () => string | null;
  hiveRootOf: (home: string) => string;
  /** config.ensureHarnessHome: mkdir -p, tilde expanded. */
  ensureHome: (home: string) => { ok: boolean; error?: string };
  /** writeConfig({ harnessHome }) for the boot dialog's "choose another folder". */
  writeHome: (home: string) => void;
  log?: (line: string) => void;
}

export interface FloorSpawnRequest { harnessHome: string }
export type FloorSpawner = (req: FloorSpawnRequest) => Promise<{ ok: boolean; error?: string }>;

let spawner: FloorSpawner | null = null;

/** The process per floor spawn registers itself here (B23 part 2). */
export function setFloorSpawner(fn: FloorSpawner | null): void { spawner = fn; }

function me(): FloorIdentity {
  return { pid: process.pid, userData: app.getPath('userData'), version: app.getVersion() };
}

function ctxOf(deps: FloorGateDeps): FloorContext {
  return { currentHome: deps.currentHome(), userData: app.getPath('userData'), hiveRootOf: deps.hiveRootOf };
}

/**
 * Take the lock for the current hive. True means go on and start the hive
 * services. False means the process is on its way out (relaunching against
 * another folder, or quitting) and the caller must start nothing.
 */
export function acquireFloorAtBoot(deps: FloorGateDeps): boolean {
  const root = deps.hiveRoot();
  if (!root) return true;
  const log = deps.log ?? ((l: string) => console.log(l));
  const r = acquireFloorLock(root, me());
  if (r.ok) {
    if (r.cleared) log(`[floor] cleared a stale floor lock on ${root} (${describeFloorLock(r.cleared)})`);
    log(`[floor] lock taken on ${root} (pid ${process.pid})`);
    return true;
  }
  if (r.error === 'io') {
    // A read only folder must not keep the app from starting; the hive is
    // simply unguarded, and the log says so.
    log(`[floor] could not write the floor lock on ${root}: ${r.detail}; starting unguarded`);
    return true;
  }
  log(`[floor] REFUSED: ${root} is open in another floor (${describeFloorLock(r.lock)})`);
  const choice = dialog.showMessageBoxSync({
    type: 'warning',
    title: 'This hive is open in another floor',
    message: `The folder ${deps.currentHome() ?? root} is already open in another floor of Munder Difflin (${describeFloorLock(r.lock)}).`,
    detail: 'A hive can be open in one floor at a time, or the two floors would take each other\'s agents. Close that floor and start again, or choose a different folder for this one.',
    buttons: ['Choose another folder…', 'Quit'],
    defaultId: 0,
    cancelId: 1
  });
  if (choice === 0) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const picked = dialog.showOpenDialogSync({ properties: ['openDirectory', 'createDirectory'], title: 'Choose a folder for this floor' });
      const home = picked?.[0];
      if (!home) break;
      const v = validateFloorRequest({ harnessHome: home }, { ...ctxOf(deps), currentHome: null });
      if (!v.ok) {
        dialog.showMessageBoxSync({ type: 'warning', title: 'That folder is open too', message: refusalText(v.refusal, v.lock), buttons: ['Choose again'] });
        continue;
      }
      const made = deps.ensureHome(v.harnessHome);
      if (!made.ok) {
        dialog.showMessageBoxSync({ type: 'error', title: 'Could not use that folder', message: made.error ?? 'unknown error', buttons: ['Choose again'] });
        continue;
      }
      deps.writeHome(v.harnessHome);
      log(`[floor] relaunching on ${v.harnessHome}`);
      app.relaunch();
      break;
    }
  }
  app.exit(0);
  return false;
}

function refusalText(refusal: FloorRefusal, lock?: FloorLock): string {
  switch (refusal) {
    case 'current': return 'That folder is the hive this floor is already on.';
    case 'held': return `That folder is open in another floor${lock ? ` (${describeFloorLock(lock)})` : ''}.`;
    case 'same-data-dir': return 'A floor cannot use this floor\'s own data folder.';
    default: return 'That is not a folder this app can open.';
  }
}

/** Ask a window's renderer to show the New Floor picker (B21). The focused
 *  window, else the first one alive. */
export function openFloorPicker(win?: BrowserWindow | null): boolean {
  const target = win ?? BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows().find((w) => !w.isDestroyed()) ?? null;
  if (!target || target.isDestroyed() || target.webContents.isDestroyed()) return false;
  target.webContents.send('floor:pickerOpen');
  return true;
}

export type FloorOpenReply =
  | { ok: true }
  | { ok: false; refusal: FloorRefusal | 'no-spawner' | 'spawn-failed' | 'mkdir-failed'; lock?: FloorLock; detail?: string };

/** The picker's two calls, and the lock release on quit. Register once. */
export function registerFloorIpc(deps: FloorGateDeps): void {
  ipcMain.handle('floor:probe', (_evt, paths: unknown): Array<{ path: string; state: FloorProbe; lock?: FloorLock }> => {
    const list = Array.isArray(paths) ? paths.filter((p): p is string => typeof p === 'string' && !!p) : [];
    const ctx = ctxOf(deps);
    return list.map((p) => ({ path: p, ...probeFloor(p, ctx) }));
  });

  ipcMain.handle('floor:open', async (_evt, arg: unknown): Promise<FloorOpenReply> => {
    const a = (arg ?? {}) as { harnessHome?: unknown; dataDir?: unknown };
    const harnessHome = typeof a.harnessHome === 'string' ? a.harnessHome : '';
    const dataDir = typeof a.dataDir === 'string' ? a.dataDir : undefined;
    const v = validateFloorRequest({ harnessHome, dataDir }, ctxOf(deps));
    if (!v.ok) return { ok: false, refusal: v.refusal, lock: v.lock, detail: v.detail };
    const made = deps.ensureHome(v.harnessHome);
    if (!made.ok) return { ok: false, refusal: 'mkdir-failed', detail: made.error };
    if (!spawner) return { ok: false, refusal: 'no-spawner' };
    try {
      const r = await spawner({ harnessHome: v.harnessHome });
      return r.ok ? { ok: true } : { ok: false, refusal: 'spawn-failed', detail: r.error };
    } catch (e) {
      return { ok: false, refusal: 'spawn-failed', detail: e instanceof Error ? e.message : String(e) };
    }
  });

  // Normal quits fire will-quit; app.exit() (changeHome, resetAll) does not,
  // and the lock left behind names our userData, which the next boot treats
  // as its own (floorLock.ts, the identity rule).
  app.on('will-quit', () => {
    const root = deps.hiveRoot();
    if (root) { try { releaseFloorLock(root, me()); } catch { /* the folder may be gone */ } }
  });
}
