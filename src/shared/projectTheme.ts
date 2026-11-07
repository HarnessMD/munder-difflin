/**
 * Each project keeps its own floor theme. The small, renderer-safe catalogue (the
 * built-in themes plus the theme packs registered at start-up) and the per-project
 * map, `officeThemeByHive`, keyed by the project's home folder (one hive root each).
 *
 * A project with no entry shows the global `officeTheme` it showed before, so
 * nothing moves on upgrade.
 *
 * Ported from Prozzta/guppyos 02d0d50b (MIT).
 */
export type BuiltinProjectThemeId = 'office' | 'friends' | 'brooklyn99' | 'siliconvalley' | 'got' | 'hogwarts';
/** A built-in id, or the id of a registered theme pack (see registerPackThemes). */
export type ProjectThemeId = string;

export interface ProjectThemeSeed {
  /** Absent: the seed is a look only, and the person's own orchestrator keeps its nickname. */
  name?: string;
  appearance: {
    bodyId: string;
    colors?: { skin?: string; shirt?: string; hair?: string };
    presetId?: string;
  };
}

export interface ProjectTheme {
  id: ProjectThemeId;
  label: string;
  blurb: string;
  swatch: string;
  /** The scene id: a built-in scene, or for a theme pack its own id. */
  sceneTheme: string;
  projectDefaults?: { orchestrator?: ProjectThemeSeed };
}

export const PROJECT_THEMES: readonly ProjectTheme[] = [
  { id: 'office', label: 'The Office', blurb: 'Dunder Mifflin — the original floor', swatch: '#6b5a4a', sceneTheme: 'office' },
  { id: 'friends', label: 'Friends', blurb: 'Central Perk coffee house', swatch: '#9a5a32', sceneTheme: 'friends' },
  { id: 'brooklyn99', label: 'Brooklyn Nine-Nine', blurb: 'The 99th precinct bullpen', swatch: '#3a5a7a', sceneTheme: 'brooklyn99' },
  { id: 'siliconvalley', label: 'Silicon Valley', blurb: 'The Hacker Hostel', swatch: '#4a6a4a', sceneTheme: 'siliconvalley' },
  { id: 'got', label: 'Game of Thrones', blurb: 'The Red Keep throne room', swatch: '#6a2630', sceneTheme: 'got' },
  { id: 'hogwarts', label: 'Harry Potter', blurb: 'Hogwarts great hall', swatch: '#39305a', sceneTheme: 'hogwarts' },
];

// Theme packs (themes/<dir>/theme.json) join the catalogue at start-up, in main and in
// the renderer, each from the packs that pass the renderer's manifest validator.
const PACK_THEME_ID = /^[a-z0-9][a-z0-9-]{0,39}$/;
const packThemes = new Map<string, ProjectTheme>();

export interface PackThemeEntry { id: string; label: string; orchestrator?: unknown }

/** Add theme packs to the catalogue. Ids must be pack-shaped and not a built-in; a seed must be a valid seed. */
export function registerPackThemes(entries: ReadonlyArray<PackThemeEntry>): void {
  for (const e of entries) {
    if (!e || typeof e.id !== 'string' || !PACK_THEME_ID.test(e.id) || PROJECT_THEMES.some((t) => t.id === e.id)) continue;
    const label = typeof e.label === 'string' && e.label.trim() ? e.label.trim().slice(0, 40) : e.id;
    packThemes.set(e.id, {
      id: e.id, label, blurb: label, swatch: '#6b5a4a', sceneTheme: e.id,
      ...(isProjectThemeSeed(e.orchestrator) ? { projectDefaults: { orchestrator: e.orchestrator } } : {}),
    });
  }
}

/** True for a registered theme pack's id. */
export function isPackProjectTheme(value: unknown): boolean {
  return typeof value === 'string' && packThemes.has(value);
}

/** The floor a project shows. The tvShowOffices flag gates the built-in TV-show
 * maps only; a theme pack is its own floor. */
export function floorSceneTheme(id: ProjectThemeId, tvShowOffices: boolean | undefined): string {
  return tvShowOffices || isPackProjectTheme(id) ? projectTheme(id).sceneTheme : 'office';
}

/** Every project theme: the built-ins, then the registered packs. */
export function projectThemes(): ProjectTheme[] {
  return [...PROJECT_THEMES, ...packThemes.values()];
}

/** The themes a project can switch to right now (the Settings picker's list, and voice's): the
 *  Office and every pack always; the built-in TV-show themes only while tvShowOffices is on. */
export function offeredProjectThemes(tvShowOffices: boolean | undefined): ProjectTheme[] {
  return projectThemes().filter((theme) => tvShowOffices || theme.id === 'office' || isPackProjectTheme(theme.id));
}

export function isProjectThemeId(value: unknown): value is ProjectThemeId {
  return typeof value === 'string' && (PROJECT_THEMES.some((theme) => theme.id === value) || packThemes.has(value));
}

/** True for an id a stored project-theme entry may keep: a built-in, or any pack-shaped id even if no pack of that id is
 * registered in this build. A pack that is renamed or dropped must not wipe projects' theme entries on the next config
 * read; resolveProjectTheme falls back at render, and the entry comes back to life if the pack returns. */
export function isStoredProjectThemeId(value: unknown): value is ProjectThemeId {
  return typeof value === 'string' && (PROJECT_THEMES.some((theme) => theme.id === value) || PACK_THEME_ID.test(value));
}

export function projectTheme(themeId: unknown): ProjectTheme {
  return PROJECT_THEMES.find((theme) => theme.id === themeId) ?? (typeof themeId === 'string' ? packThemes.get(themeId) : undefined) ?? PROJECT_THEMES[0];
}

/** The theme a project shows: its own entry, else the global officeTheme, else the Office. */
export function resolveProjectTheme(
  config: { officeTheme?: ProjectThemeId; officeThemeByHive?: Record<string, ProjectThemeId> },
  harnessHome?: string | null,
): ProjectThemeId {
  const selected = harnessHome ? projectThemeForHome(config.officeThemeByHive, harnessHome) : undefined;
  return isProjectThemeId(selected) ? selected : isProjectThemeId(config.officeTheme) ? config.officeTheme : 'office';
}

/** The answer to a theme save, read back from config.json: the theme in force
 *  afterwards. 'not-saved': config.json is damaged or not readable just now, so
 *  the save was skipped; 'no-home': no project is open. */
export type ProjectThemeSave =
  | { ok: true; theme: ProjectThemeId }
  | { ok: false; reason: 'invalid' | 'no-home' | 'not-saved'; theme: ProjectThemeId };

/** The map key for a home. Map keys arrive from both renderer and main. A Windows path,
 * drive (`C:\…`) or UNC (`\\server\share\…`), is matched whatever its case; a POSIX path
 * keeps its case, so two Linux or macOS homes are never merged because their spelling
 * differs only by case. */
export function projectThemeHomeKey(home: string): string {
  const normalized = home.trim().replace(/\\/g, '/').replace(/\/+$/, '');
  return /^[a-z]:\//i.test(normalized) || /^\/\/[^/]+\/[^/]/.test(normalized) ? normalized.toLowerCase() : normalized;
}

export function projectThemeForHome(map: Record<string, ProjectThemeId> | undefined, home: string): ProjectThemeId | undefined {
  if (!map) return undefined;
  const key = projectThemeHomeKey(home);
  return Object.entries(map).find(([stored]) => projectThemeHomeKey(stored) === key)?.[1];
}

/** A pack's orchestrator seed, as its manifest declares it (the manifest's own rule): a
 *  body id, and a name only when given, each a short non-blank string. */
export function isProjectThemeSeed(value: unknown): value is ProjectThemeSeed {
  if (!value || typeof value !== 'object') return false;
  const seed = value as { name?: unknown; appearance?: { bodyId?: unknown } };
  const short = (v: unknown): boolean => typeof v === 'string' && v.trim().length > 0 && v.length <= 40;
  return (seed.name === undefined || short(seed.name)) && !!seed.appearance && short(seed.appearance.bodyId);
}

/** The map after a home change. A move takes the project's entry to its new home; a fresh
 * home that held no project drops any entry left there by an earlier project at that path,
 * so it shows the global theme like any new project, or the floor the person chose for it
 * (`theme`, P2; ignored on a move). */
export function moveProjectTheme(
  map: Record<string, ProjectThemeId> | undefined,
  change: { mode: 'move' | 'fresh'; oldHome?: string | null; newHome: string; blankProject: boolean; theme?: ProjectThemeId },
): Record<string, ProjectThemeId> {
  const next = { ...(map ?? {}) };
  const newKey = projectThemeHomeKey(change.newHome);
  if (change.mode === 'move') {
    const oldKey = change.oldHome ? projectThemeHomeKey(change.oldHome) : undefined;
    if (!oldKey || oldKey === newKey) return next;
    const theme = projectThemeForHome(next, change.oldHome!);
    for (const k of Object.keys(next)) if (projectThemeHomeKey(k) === oldKey || projectThemeHomeKey(k) === newKey) delete next[k];
    if (theme) next[newKey] = theme;
    return next;
  }
  if (!change.blankProject) return next;
  for (const k of Object.keys(next)) if (projectThemeHomeKey(k) === newKey) delete next[k];
  if (isProjectThemeId(change.theme)) next[newKey] = change.theme;
  return next;
}
