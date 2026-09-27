/**
 * WHERE THE PER MACHINE RECORDS LIVE (0.5.3, B23 part 2). The solo licence is
 * bound to one machine, and a floor is another process on that same machine,
 * so the licence record and the solo device key are read from one place by
 * every floor: the main install's userData. A floor learns that folder from
 * `--floor-shared` (floorArgs.ts); the main install is its own shared folder,
 * so nothing moves for a machine that never opens a floor.
 */
import { app } from 'electron';

let shared: string | null = null;

/** Set once at boot, before any read, from the floor flags. */
export function setSharedDataDir(dir: string | null): void { shared = dir; }

/** The folder the per machine records are under. */
export function sharedDataDir(): string { return shared ?? app.getPath('userData'); }

/** True in a process New Floor spawned. The updater, the deep link handler
 *  and the any app hotkey belong to the main install and stay off here. */
export function isFloorProcess(): boolean { return shared !== null; }
