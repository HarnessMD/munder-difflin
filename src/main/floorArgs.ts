/**
 * A FLOOR IS A PROCESS (0.5.3, B23 part 2, Kevin, 23 Sep 2026). New Floor
 * spawns this same binary again with its own app data folder, so everything
 * that is process wide today (the single instance lock, config, the hook
 * server, the puck, the helpers) stays process wide and each floor has its
 * own. This file is the pure part: the flags, the data folder per hive and
 * the spawn plan. No electron import, so the tests load it as plain node.
 *
 *   --floor-data=<dir>     this floor's userData (its own lock, config, hive)
 *   --floor-shared=<dir>   the main install's userData, where the solo licence
 *                          and the solo device key live (one machine, one
 *                          licence: every floor reads the same record)
 *   --floor-home=<dir>     the hive folder the picker chose; written into the
 *                          floor's config on first boot so the floor opens on
 *                          it instead of the onboarding wizard
 *
 * The env forms (MD_FLOOR_DATA, MD_FLOOR_SHARED, MD_FLOOR_HOME) are for the
 * test runner. Unlike MD_USER_DATA these are honoured in packaged builds: the
 * packaged app is exactly where New Floor runs.
 */
import { createHash } from 'node:crypto';
import { isAbsolute, join, resolve } from 'node:path';

export const FLOOR_DATA_FLAG = '--floor-data=';
export const FLOOR_SHARED_FLAG = '--floor-shared=';
export const FLOOR_HOME_FLAG = '--floor-home=';
/** Under the main userData: `floors/<id>/`, one folder per hive. */
export const FLOORS_DIR = 'floors';

export interface FloorArgs {
  dataDir: string;
  sharedDir: string;
  home: string | null;
}

function flag(argv: readonly string[], prefix: string): string | null {
  for (const a of argv) if (a.startsWith(prefix) && a.length > prefix.length) return a.slice(prefix.length);
  return null;
}

/** The floor this process is, or null for the main install. Both folders must
 *  be absolute and different: a "floor" on the main data folder is the main
 *  install wearing a flag, and it would share one lock with it. */
export function parseFloorArgs(argv: readonly string[], env: Readonly<Record<string, string | undefined>> = {}): FloorArgs | null {
  const dataDir = flag(argv, FLOOR_DATA_FLAG) ?? env.MD_FLOOR_DATA ?? null;
  const sharedDir = flag(argv, FLOOR_SHARED_FLAG) ?? env.MD_FLOOR_SHARED ?? null;
  const home = flag(argv, FLOOR_HOME_FLAG) ?? env.MD_FLOOR_HOME ?? null;
  if (!dataDir || !sharedDir) return null;
  if (!isAbsolute(dataDir) || !isAbsolute(sharedDir)) return null;
  if (resolve(dataDir) === resolve(sharedDir)) return null;
  return { dataDir: resolve(dataDir), sharedDir: resolve(sharedDir), home: home && isAbsolute(home) ? resolve(home) : null };
}

/** One data folder per hive, stable across launches, so reopening the same
 *  hive as a floor finds its windows, its config and its renderer state
 *  again. The name is a hash, never the hive's path: a path has separators
 *  and can be long. */
export function floorDataDirFor(mainUserData: string, harnessHome: string): string {
  const id = createHash('sha1').update(resolve(harnessHome)).digest('hex').slice(0, 12);
  return join(mainUserData, FLOORS_DIR, id);
}

export interface FloorSpawnPlan { command: string; args: string[] }

/** What to run. Packaged: the app's own executable with the three flags. Dev:
 *  the electron binary is `execPath` and the app is a folder argument, then the
 *  flags; the dev server the parent is on is inherited through the env. */
export function floorSpawnPlan(o: { execPath: string; appPath: string; packaged: boolean; dataDir: string; sharedDir: string; home: string }): FloorSpawnPlan {
  const flags = [`${FLOOR_DATA_FLAG}${o.dataDir}`, `${FLOOR_SHARED_FLAG}${o.sharedDir}`, `${FLOOR_HOME_FLAG}${o.home}`];
  return { command: o.execPath, args: o.packaged ? flags : [o.appPath, ...flags] };
}

/** The env a floor is spawned with: the parent's, minus the dev only override
 *  that would put the child back on the parent's data folder, and minus the
 *  floor env forms so a floor spawned by a floor takes its flags, not the
 *  parent's. */
export function floorSpawnEnv(env: Readonly<Record<string, string | undefined>>): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = { ...env };
  delete out.MD_USER_DATA;
  delete out.MD_FLOOR_DATA;
  delete out.MD_FLOOR_SHARED;
  delete out.MD_FLOOR_HOME;
  return out;
}

/** Config keys that belong to ONE hive or ONE listener and never move to a
 *  floor: the hive's repos, missions and per agent settings; the Slack and
 *  webhook servers (two floors on one workspace token would both answer). */
export const FLOOR_CONFIG_STRIP: readonly string[] = [
  'harnessHome', 'recentHives', 'registeredRepos',
  'missions', 'opsStandupSeeded', 'heartbeatSeeded', 'compactMaintenanceSeeded',
  'agentTokenCaps', 'agentMcp', 'autoDeliveryPausedAgents', 'avatars',
  'slackEnabled', 'slackSigningSecret', 'slackBotToken', 'slackChannelId', 'slackPort', 'slackProactivePosting', 'slackMode',
  'webhookEnabled', 'webhookSecret', 'webhookPort', 'webhookTriggers'
];

/** A floor's first config: the main install's, so the person who finished
 *  onboarding, chose a model and pasted a key is that same person in the new
 *  floor, minus what is per hive or per listener, on the picker's folder. */
export function seedFloorConfig(main: Readonly<Record<string, unknown>>, harnessHome: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(main)) if (!FLOOR_CONFIG_STRIP.includes(k)) out[k] = v;
  out.harnessHome = resolve(harnessHome);
  out.recentHives = [resolve(harnessHome)];
  out.slackEnabled = false;
  out.webhookEnabled = false;
  return out;
}
