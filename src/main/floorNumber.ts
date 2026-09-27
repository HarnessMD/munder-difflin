/**
 * WHICH OFFICE IS WHICH (0.5.3, founder 25 Sep 2026). Every floor is the same
 * binary, so the Dock shows the same icon and the same name for each one. The
 * name under a Dock icon comes from the app bundle and cannot change at run
 * time, so each floor carries a number instead: the main install is 1 and a
 * floor takes the lowest free number from 2 up. The number goes on the Dock
 * icon as a badge and into the window title ("Munder Difflin 2"), which the
 * Window menu, Mission Control and the Dock's right click list all show. With
 * one office open nothing changes: no badge, the plain name.
 *
 * The record is one JSON file in the main install's folder, shared by every
 * floor: { "<n>": { "pid": 123, "dataDir": "..." } }. A number whose pid is
 * gone is free again. No electron import, so the tests load it as plain node.
 */
import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const FLOOR_NUMBERS_FILE = 'floor-numbers.json';
export const APP_TITLE = 'Munder Difflin';

export type FloorNumbers = Record<string, { pid: number; dataDir: string }>;

export function floorNumbersPath(sharedDir: string): string {
  return join(sharedDir, FLOOR_NUMBERS_FILE);
}

export function readFloorNumbers(sharedDir: string): FloorNumbers {
  try {
    const raw = JSON.parse(readFileSync(floorNumbersPath(sharedDir), 'utf8')) as unknown;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const out: FloorNumbers = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      const e = v as { pid?: unknown; dataDir?: unknown };
      if (/^\d+$/.test(k) && typeof e?.pid === 'number' && typeof e?.dataDir === 'string') out[k] = { pid: e.pid, dataDir: e.dataDir };
    }
    return out;
  } catch { return {}; }
}

function writeFloorNumbers(sharedDir: string, n: FloorNumbers): void {
  const path = floorNumbersPath(sharedDir);
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(n, null, 2), 'utf8');
  renameSync(tmp, path);
}

/** Only the entries whose process is still running. */
export function liveFloorNumbers(n: FloorNumbers, alive: (pid: number) => boolean): FloorNumbers {
  const out: FloorNumbers = {};
  for (const [k, v] of Object.entries(n)) if (alive(v.pid)) out[k] = v;
  return out;
}

/** The number this process gets: 1 for the main install; for a floor, the one
 *  it already holds for its data folder, else the lowest free number from 2. */
export function pickFloorNumber(live: FloorNumbers, me: { floor: boolean; dataDir: string }): number {
  if (!me.floor) return 1;
  for (const [k, v] of Object.entries(live)) if (k !== '1' && v.dataDir === me.dataDir) return Number(k);
  let n = 2;
  while (live[String(n)]) n++;
  return n;
}

/** Claim a number at boot and record it. Returns the number. Never throws: a
 *  folder that cannot be written still gets a number, it just is not shared. */
export function claimFloorNumber(sharedDir: string, me: { floor: boolean; dataDir: string; pid: number }, alive: (pid: number) => boolean): number {
  const live = liveFloorNumbers(readFloorNumbers(sharedDir), alive);
  const n = pickFloorNumber(live, me);
  live[String(n)] = { pid: me.pid, dataDir: me.dataDir };
  try { writeFloorNumbers(sharedDir, live); } catch { /* the number still labels this process */ }
  return n;
}

/** Drop this process's number on quit, so the next floor can take it. */
export function releaseFloorNumber(sharedDir: string, pid: number): void {
  try {
    const n = readFloorNumbers(sharedDir);
    let changed = false;
    for (const [k, v] of Object.entries(n)) if (v.pid === pid) { delete n[k]; changed = true; }
    if (changed) writeFloorNumbers(sharedDir, n);
  } catch { /* best effort */ }
}

/** How many offices are running now, this one included. */
export function liveOfficeCount(sharedDir: string, alive: (pid: number) => boolean): number {
  return Object.keys(liveFloorNumbers(readFloorNumbers(sharedDir), alive)).length;
}

/** The label: the plain name when this is the only office, numbered otherwise. */
export function officeLabel(number: number, liveCount: number): { title: string; badge: string } {
  if (liveCount <= 1 && number === 1) return { title: APP_TITLE, badge: '' };
  return { title: `${APP_TITLE} ${number}`, badge: String(number) };
}
