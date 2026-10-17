import { app } from 'electron';
import { existsSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { join, isAbsolute } from 'node:path';
import { sanitizeDisplayName } from '../shared/orchestratorIdentity';
import {
  type ThemeId,
  type PackSummary,
  type PackPayload,
  type Issue,
  PACK_ID_RE,
  PACK_LIMITS,
  validatePack
} from '../shared/themePack';

export interface ScanResult {
  packs: PackSummary[];
  byPath: Map<ThemeId, { dir: string; source: 'builtin' | 'user' | 'dev' }>;
}

let configuredThemesDir = '';
/** Folder from Settings → Themes (config.themesDir). Takes effect on the next scan. */
export function setConfiguredThemesDir(dir: unknown): void {
  configuredThemesDir = typeof dir === 'string' ? dir.trim() : '';
  cachedScan = null;
}

/**
 * Returns candidate root directories for theme discovery per §2.6:
 * 1. Dev override: env MD_THEMES_DIR (path-delimited list) -> source 'dev'
 * 2. User: <userData>/themes -> source 'user'
 * 2b. Configured: `themesDir` from Settings (set via setConfiguredThemesDir) -> source 'user'
 * 3. Built-in: <process.resourcesPath>/themes in packaged, or <repo>/resources/themes in dev -> source 'builtin'
 */
export function getThemeSearchPaths(): Array<{ dir: string; source: 'builtin' | 'user' | 'dev' }> {
  const paths: Array<{ dir: string; source: 'builtin' | 'user' | 'dev' }> = [];

  // 1. Dev override: MD_THEMES_DIR (path-delimited, e.g. ; on Windows, : on POSIX)
  const envDir = process.env.MD_THEMES_DIR;
  if (envDir && typeof envDir === 'string') {
    const delimiter = process.platform === 'win32' ? ';' : ':';
    for (const part of envDir.split(delimiter)) {
      const trimmed = part.trim();
      if (trimmed) {
        paths.push({ dir: trimmed, source: 'dev' });
      }
    }
  }

  // 2. User: <userData>/themes
  const userDataThemes = join(app.getPath('userData'), 'themes');
  paths.push({ dir: userDataThemes, source: 'user' });

  // 2b. A folder the user chose in Settings, searched after the default user folder.
  if (configuredThemesDir && isAbsolute(configuredThemesDir)) {
    paths.push({ dir: configuredThemesDir, source: 'user' });
  }

  // 3. Built-in: <resourcesPath>/themes (packaged) or <repo>/resources/themes (dev)
  const builtinThemes = app.isPackaged
    ? join(process.resourcesPath, 'themes')
    : join(app.getAppPath(), 'resources', 'themes');
  paths.push({ dir: builtinThemes, source: 'builtin' });

  return paths;
}

/**
 * Reads a pack directory from disk, enforcing §2.4 byte caps before returning bytes.
 */
export function readPackFromDisk(dir: string, source: 'builtin' | 'user' | 'dev', id: string): PackPayload {
  const files: Record<string, Uint8Array> = {};
  const issues: Issue[] = [];

  if (!existsSync(dir)) {
    issues.push({
      level: 'error',
      code: 'missing-dir',
      path: '',
      message: `Theme pack directory '${dir}' does not exist`
    });
    return {
      manifest: {
        schema: 1,
        id,
        name: id,
        version: '0.0.0',
        author: 'unknown',
        license: 'unknown',
        map: 'map.tmj',
        tilesets: [],
        seats: { primary: [], cafe: [], cafeStands: [] },
        anchors: { calendar: { x: 0, y: 0 }, boards: { x: 0, y: 0 }, clock: { x: 0, y: 0 } },
        errandSpots: [],
        monitor: { offTopLeftGid: 0, onGids: [] },
        palette: { background: '#000000', noteColors: {} }
      },
      files: {},
      source,
      issues
    };
  }

  // Read all files recursively or up to allowed structure
  function collectFiles(currentDir: string, prefix = ''): void {
    let entries: string[] = [];
    try {
      entries = readdirSync(currentDir);
    } catch (e) {
      issues.push({
        level: 'error',
        code: 'read-dir-failed',
        path: prefix,
        message: `Failed to read directory: ${(e as Error).message}`
      });
      return;
    }

    for (const entry of entries) {
      const full = join(currentDir, entry);
      const rel = prefix ? `${prefix}/${entry}` : entry;
      try {
        const st = statSync(full);
        if (st.isDirectory()) {
          collectFiles(full, rel);
        } else if (st.isFile()) {
          // Check file size caps per §2.4 BEFORE loading / adding to payload
          if (rel === 'theme.json' && st.size > PACK_LIMITS.manifestBytes) {
            issues.push({
              level: 'error',
              code: 'manifest-too-large',
              path: rel,
              message: `theme.json exceeds size limit (${st.size} > ${PACK_LIMITS.manifestBytes})`
            });
            continue;
          }
          if (rel === 'map.tmj' && st.size > PACK_LIMITS.mapBytes) {
            issues.push({
              level: 'error',
              code: 'map-too-large',
              path: rel,
              message: `map.tmj exceeds size limit (${st.size} > ${PACK_LIMITS.mapBytes})`
            });
            continue;
          }
          if (rel.startsWith('tilesets/') && st.size > PACK_LIMITS.tilesetBytes) {
            issues.push({
              level: 'error',
              code: 'tileset-too-large',
              path: rel,
              message: `${rel} exceeds tileset size limit (${st.size} > ${PACK_LIMITS.tilesetBytes})`
            });
            continue;
          }
          if (rel.startsWith('chrome/fonts/') && st.size > PACK_LIMITS.fontBytes) {
            issues.push({
              level: 'warn',
              code: 'bad-font',
              path: rel,
              message: `${rel} exceeds font size limit (${st.size} > ${PACK_LIMITS.fontBytes})`
            });
            continue;
          }
          if (rel === 'chrome/tokens.css' && st.size > PACK_LIMITS.tokensBytes) {
            issues.push({
              level: 'warn',
              code: 'bad-tokens',
              path: rel,
              message: `${rel} exceeds tokens size limit (${st.size} > ${PACK_LIMITS.tokensBytes})`
            });
            continue;
          }

          const buf = readFileSync(full);
          files[rel] = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
        }
      } catch (err) {
        issues.push({
          level: 'error',
          code: 'read-file-failed',
          path: rel,
          message: `Failed to read file ${rel}: ${(err as Error).message}`
        });
      }
    }
  }

  collectFiles(dir);

  // Validate pack using pure validator
  const validation = validatePack({ dirName: id, files });
  for (const iss of validation.issues) {
    issues.push(iss);
  }

  let manifest = validation.pack?.manifest;
  if (!manifest) {
    // Attempt fallback manifest extraction if theme.json exists
    try {
      if (files['theme.json']) {
        const parsed = JSON.parse(new TextDecoder('utf-8').decode(files['theme.json']));
        manifest = parsed;
      }
    } catch {
      // ignore
    }
  }

  if (!manifest) {
    manifest = {
      schema: 1,
      id,
      name: id,
      version: '0.0.0',
      author: 'unknown',
      license: 'unknown',
      map: 'map.tmj',
      tilesets: [],
      seats: { primary: [], cafe: [], cafeStands: [] },
      anchors: { calendar: { x: 0, y: 0 }, boards: { x: 0, y: 0 }, clock: { x: 0, y: 0 } },
      errandSpots: [],
      monitor: { offTopLeftGid: 0, onGids: [] },
      palette: { background: '#000000', noteColors: {} }
    };
  }

  return {
    manifest,
    files,
    source,
    issues
  };
}

/**
 * In-memory scan cache
 */
let cachedScan: ScanResult | null = null;

/**
 * Scans theme search paths per §2.6 discovery order.
 * First id wins; duplicate collisions are recorded as unavailable.
 */
export function scanThemes(force = false): ScanResult {
  if (cachedScan && !force) {
    return cachedScan;
  }

  const searchPaths = getThemeSearchPaths();
  const byPath = new Map<ThemeId, { dir: string; source: 'builtin' | 'user' | 'dev' }>();
  const summaries: PackSummary[] = [];
  const seenIds = new Set<ThemeId>();

  for (const { dir, source } of searchPaths) {
    if (!existsSync(dir)) continue;

    let subdirs: string[] = [];
    try {
      subdirs = readdirSync(dir);
    } catch {
      continue;
    }

    for (const sub of subdirs) {
      if (!PACK_ID_RE.test(sub)) continue;

      const packDir = join(dir, sub);
      try {
        if (!statSync(packDir).isDirectory()) continue;
      } catch {
        continue;
      }

      if (seenIds.has(sub)) {
        // Collision: first id wins per §2.6; later one is logged and shown as unavailable
        console.warn(`[themes] collision: pack id '${sub}' from ${packDir} (${source}) shadowed by earlier discovery`);
        summaries.push({
          id: sub,
          name: sub,
          version: 'unknown',
          source,
          available: false,
          issues: [
            {
              level: 'error',
              code: 'id-collision',
              path: '',
              message: `Theme id '${sub}' collides with an existing theme in higher-priority source`
            }
          ]
        });
        continue;
      }

      seenIds.add(sub);
      byPath.set(sub, { dir: packDir, source });

      // Name/blurb/swatch come from a cheap manifest read; the issue list comes from the
      // same validator the app loads with, so an "available" badge is truthful.
      const themeJsonPath = join(packDir, 'theme.json');
      const issues: Issue[] = [];
      let name = sub;
      let version = '0.0.0';
      let blurb: string | undefined;
      let swatch: string | undefined;

      if (!existsSync(themeJsonPath)) {
        issues.push({
          level: 'error',
          code: 'missing-manifest',
          path: 'theme.json',
          message: 'theme.json is missing'
        });
      } else {
        try {
          const st = statSync(themeJsonPath);
          if (st.size > PACK_LIMITS.manifestBytes) {
            issues.push({ level: 'error', code: 'manifest-too-large', path: 'theme.json', message: 'theme.json exceeds size limit' });
          } else {
            const raw = JSON.parse(readFileSync(themeJsonPath, 'utf8'));
            if (raw && typeof raw === 'object') {
              if (typeof raw.name === 'string') name = raw.name;
              if (typeof raw.version === 'string') version = raw.version;
              if (typeof raw.blurb === 'string') blurb = raw.blurb;
              if (typeof raw.swatch === 'string') swatch = raw.swatch;
            }
            issues.push(...readPackFromDisk(packDir, source, sub).issues);
          }
        } catch (e) {
          issues.push({
            level: 'error',
            code: 'bad-manifest',
            path: 'theme.json',
            message: `Could not parse theme.json: ${(e as Error).message}`
          });
        }
      }

      const available = !issues.some((i) => i.level === 'error');
      summaries.push({
        id: sub,
        name,
        version,
        blurb,
        swatch,
        source,
        available,
        issues
      });
    }
  }

  cachedScan = { packs: summaries, byPath };
  return cachedScan;
}

/**
 * Loads a pack by ID. Only loads if `id` is in the scanned set.
 */
export function readPack(id: string): PackPayload | null {
  if (!cachedScan) {
    scanThemes();
  }
  const entry = cachedScan?.byPath.get(id);
  if (!entry) {
    return null;
  }
  return readPackFromDisk(entry.dir, entry.source, id);
}

/**
 * Validates a pack by ID.
 */
export function validateThemePack(id: string): { valid: boolean; issues: Issue[] } {
  const pack = readPack(id);
  if (!pack) {
    return {
      valid: false,
      issues: [
        {
          level: 'error',
          code: 'not-found',
          path: '',
          message: `Theme '${id}' not found`
        }
      ]
    };
  }
  return {
    valid: !pack.issues.some((i) => i.level === 'error'),
    issues: pack.issues
  };
}

/** The orchestrator display name a theme suggests (`copy.orchestratorName`), or null.
 *  Reads only theme.json, so it is cheap enough for boot and for every config change. */
export function readThemeOrchestratorName(id: string | undefined): string | null {
  if (!id) return null;
  try {
    const entry = scanThemes().byPath.get(id);
    if (!entry) return null;
    const manifest = JSON.parse(readFileSync(join(entry.dir, 'theme.json'), 'utf8'));
    return sanitizeDisplayName(manifest?.copy?.orchestratorName);
  } catch { return null; }
}
