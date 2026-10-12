import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

import { validatePack, hexToNumber, type ValidatedPack } from '../../src/shared/themePack';
import type { ThemeConfig } from '../../src/renderer/src/scene/office/themeRegistry';
import { resolveThemeMap } from '../../src/renderer/src/scene/office/themeLoader';
import { ORACLE_OFFICE_THEME as OFFICE_THEME, ORACLE_BROOKLYN99_THEME as BROOKLYN99_THEME } from './fixtures/oracleThemes';

function sha256(buf: Buffer | Uint8Array): string {
  return createHash('sha256').update(buf).digest('hex');
}

function loadPackFiles(packDir: string): Record<string, Uint8Array> {
  const files: Record<string, Uint8Array> = {};
  
  // Root files
  for (const entry of readdirSync(packDir, { withFileTypes: true })) {
    if (entry.isFile()) {
      files[entry.name] = readFileSync(resolve(packDir, entry.name));
    } else if (entry.isDirectory() && entry.name === 'tilesets') {
      const tilesetsDir = resolve(packDir, 'tilesets');
      for (const tEntry of readdirSync(tilesetsDir, { withFileTypes: true })) {
        if (tEntry.isFile()) {
          files[`tilesets/${tEntry.name}`] = readFileSync(resolve(tilesetsDir, tEntry.name));
        }
      }
    }
  }

  return files;
}

/** Construct a ThemeConfig-like object from a ValidatedPack's manifest + mapRaw
 *  to compare against in-code ThemeConfig scene fields. */
function validatedPackToSceneThemeConfig(validated: ValidatedPack): Omit<ThemeConfig, 'id' | 'cast'> {
  const manifest = validated.manifest;
  return {
    mapRaw: validated.mapRaw,
    tilesets: validated.tilesets.map((t) => {
      if (t.embedded) {
        return {
          url: '', // runtime url constructed by loader; ignore in scene structural comparison
          embedded: true,
        };
      }
      return {
        url: '',
        firstgid: t.meta!.firstgid,
        image: t.meta!.image,
        imagewidth: t.meta!.imagewidth,
        imageheight: t.meta!.imageheight,
        tilewidth: t.meta!.tilewidth,
        tileheight: t.meta!.tileheight,
        columns: t.meta!.columns,
        tilecount: t.meta!.tilecount,
      };
    }),
    primarySeatNames: [...manifest.seats.primary],
    cafeSeatNames: [...manifest.seats.cafe],
    cafeStands: manifest.seats.cafeStands.map(([name, kind]) => [name, kind] as const),
    coffee: manifest.coffee ? { ...manifest.coffee } : undefined as any,
    anchors: { ...manifest.anchors },
    errandSpots: manifest.errandSpots.map((s) => ({ ...s })),
    monitor: {
      offTopLeftGid: manifest.monitor.offTopLeftGid,
      onGids: manifest.monitor.onGids.map((g) => [g[0], g[1], g[2]] as const),
    },
    palette: {
      background: hexToNumber(manifest.palette.background),
      noteColors: Object.fromEntries(
        Object.entries(manifest.palette.noteColors).map(([k, v]) => [k, hexToNumber(v)])
      ),
    },
  };
}

describe('Theme Pack Equivalence Oracle', () => {
  const repoRoot = resolve(__dirname, '../..');
  const assetsDir = resolve(repoRoot, 'src/renderer/src/assets');
  const themesDir = resolve(repoRoot, 'resources/themes');

  describe('munder-difflin (pack #1)', () => {
    const packDir = resolve(themesDir, 'munder-difflin');
    const files = loadPackFiles(packDir);
    const result = validatePack({ dirName: 'munder-difflin', files });

    it('passes validatePack with 0 errors and 0 warnings', () => {
      expect(result.issues.filter((i) => i.level === 'error')).toEqual([]);
      expect(result.issues).toEqual([]);
      expect(result.pack).not.toBeNull();
    });

    it('has byte-for-byte SHA256 equality for map.tmj vs src/renderer/src/assets/maps/office.tmj', () => {
      const origBytes = readFileSync(resolve(assetsDir, 'maps/office.tmj'));
      const packBytes = files['map.tmj'];
      expect(sha256(packBytes)).toBe(sha256(origBytes));
    });

    it('has byte-for-byte SHA256 equality for all tilesets vs originals', () => {
      const tsOffice = readFileSync(resolve(assetsDir, 'tilesets/office-tileset.png'));
      const tsA5 = readFileSync(resolve(assetsDir, 'tilesets/a5-office-floors-walls.png'));
      const tsInteriors = readFileSync(resolve(assetsDir, 'tilesets/interiors.png'));

      expect(sha256(files['tilesets/office-tileset.png'])).toBe(sha256(tsOffice));
      expect(sha256(files['tilesets/a5-office-floors-walls.png'])).toBe(sha256(tsA5));
      expect(sha256(files['tilesets/interiors.png'])).toBe(sha256(tsInteriors));
    });

    it('asserts deep-equality against OFFICE_THEME scene fields', () => {
      const sceneConfig = validatedPackToSceneThemeConfig(result.pack!);

      // mapRaw equivalence
      expect(sceneConfig.mapRaw).toBe(OFFICE_THEME.mapRaw);

      // primarySeatNames, cafeSeatNames, cafeStands
      expect(sceneConfig.primarySeatNames).toEqual(OFFICE_THEME.primarySeatNames);
      expect(sceneConfig.cafeSeatNames).toEqual(OFFICE_THEME.cafeSeatNames);
      expect(sceneConfig.cafeStands).toEqual(OFFICE_THEME.cafeStands);

      // coffee, anchors, errandSpots, monitor, palette
      expect(sceneConfig.coffee).toEqual(OFFICE_THEME.coffee);
      expect(sceneConfig.anchors).toEqual(OFFICE_THEME.anchors);
      expect(sceneConfig.errandSpots).toEqual(OFFICE_THEME.errandSpots);
      expect(sceneConfig.monitor).toEqual(OFFICE_THEME.monitor);
      expect(sceneConfig.palette).toEqual(OFFICE_THEME.palette);

      // tilesets metadata equivalence (ignoring `url`)
      expect(sceneConfig.tilesets.map(({ url, ...rest }) => rest)).toEqual(
        OFFICE_THEME.tilesets.map(({ url, ...rest }) => rest)
      );
    });

    it('produces identical resolved TiledMap from resolveThemeMap', () => {
      const resolvedFromPack = resolveThemeMap({
        ...OFFICE_THEME,
        mapRaw: result.pack!.mapRaw,
        tilesets: result.pack!.tilesets.map((t) => {
          if (t.embedded) return { url: '', embedded: true };
          return { url: '', ...t.meta };
        }),
      });

      const resolvedFromOracle = resolveThemeMap(OFFICE_THEME);
      expect(resolvedFromPack).toEqual(resolvedFromOracle);
    });
  });

  describe('brooklyn99', () => {
    const packDir = resolve(themesDir, 'brooklyn99');
    const files = loadPackFiles(packDir);
    const result = validatePack({ dirName: 'brooklyn99', files });

    it('passes validatePack with 0 errors and 0 warnings', () => {
      expect(result.issues.filter((i) => i.level === 'error')).toEqual([]);
      expect(result.issues).toEqual([]);
      expect(result.pack).not.toBeNull();
    });

    it('has byte-for-byte SHA256 equality for map.tmj vs src/renderer/src/assets/maps/brooklyn99.tmj', () => {
      const origBytes = readFileSync(resolve(assetsDir, 'maps/brooklyn99.tmj'));
      const packBytes = files['map.tmj'];
      expect(sha256(packBytes)).toBe(sha256(origBytes));
    });

    it('has byte-for-byte SHA256 equality for reused office tilesets vs originals', () => {
      const tsOffice = readFileSync(resolve(assetsDir, 'tilesets/office-tileset.png'));
      const tsA5 = readFileSync(resolve(assetsDir, 'tilesets/a5-office-floors-walls.png'));
      const tsInteriors = readFileSync(resolve(assetsDir, 'tilesets/interiors.png'));

      expect(sha256(files['tilesets/office-tileset.png'])).toBe(sha256(tsOffice));
      expect(sha256(files['tilesets/a5-office-floors-walls.png'])).toBe(sha256(tsA5));
      expect(sha256(files['tilesets/interiors.png'])).toBe(sha256(tsInteriors));
    });

    it('asserts deep-equality against BROOKLYN99_THEME scene fields', () => {
      const sceneConfig = validatedPackToSceneThemeConfig(result.pack!);

      // mapRaw equivalence
      expect(sceneConfig.mapRaw).toBe(BROOKLYN99_THEME.mapRaw);

      // primarySeatNames, cafeSeatNames, cafeStands
      expect(sceneConfig.primarySeatNames).toEqual(BROOKLYN99_THEME.primarySeatNames);
      expect(sceneConfig.cafeSeatNames).toEqual(BROOKLYN99_THEME.cafeSeatNames);
      expect(sceneConfig.cafeStands).toEqual(BROOKLYN99_THEME.cafeStands);

      // coffee, anchors, errandSpots, monitor, palette
      expect(sceneConfig.coffee).toEqual(BROOKLYN99_THEME.coffee);
      expect(sceneConfig.anchors).toEqual(BROOKLYN99_THEME.anchors);
      expect(sceneConfig.errandSpots).toEqual(BROOKLYN99_THEME.errandSpots);
      expect(sceneConfig.monitor).toEqual(BROOKLYN99_THEME.monitor);
      expect(sceneConfig.palette).toEqual(BROOKLYN99_THEME.palette);

      // tilesets metadata equivalence (ignoring `url`)
      expect(sceneConfig.tilesets.map(({ url, ...rest }) => rest)).toEqual(
        BROOKLYN99_THEME.tilesets.map(({ url, ...rest }) => rest)
      );
    });

    it('produces identical resolved TiledMap from resolveThemeMap', () => {
      const resolvedFromPack = resolveThemeMap({
        ...BROOKLYN99_THEME,
        mapRaw: result.pack!.mapRaw,
        tilesets: result.pack!.tilesets.map((t) => {
          if (t.embedded) return { url: '', embedded: true };
          return { url: '', ...t.meta };
        }),
      });

      const resolvedFromOracle = resolveThemeMap(BROOKLYN99_THEME);
      expect(resolvedFromPack).toEqual(resolvedFromOracle);
    });
  });
});
