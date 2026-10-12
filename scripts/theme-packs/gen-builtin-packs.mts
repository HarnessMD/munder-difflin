// Script to generate builtin theme packs: munder-difflin and brooklyn99
// Run via: npx vite-node scripts/theme-packs/gen-builtin-packs.mts
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { OFFICE_THEME, BROOKLYN99_THEME, type ThemeConfig } from '../../src/renderer/src/scene/office/themeRegistry';
import { numberToHex, type PackManifest, type PackManifestTileset } from '../../src/shared/themePack';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '../..');

interface PackMetaInfo {
  id: string;
  name: string;
  version: string;
  author: string;
  license: string;
  blurb?: string;
  swatch?: string;
}

const PACK_METAS: Record<string, PackMetaInfo> = {
  'munder-difflin': {
    id: 'munder-difflin',
    name: 'Munder Difflin',
    version: '1.0.0',
    author: 'Munder Difflin contributors',
    license: 'MIT',
    blurb: 'The original floor',
    swatch: '#6b5a4a',
  },
  'brooklyn99': {
    id: 'brooklyn99',
    name: 'Brooklyn Nine-Nine',
    version: '1.0.0',
    author: 'Munder Difflin contributors',
    license: 'MIT',
    blurb: 'The 99th precinct bullpen',
    swatch: '#3a5a7a',
  },
};

const TILESET_SOURCE_FILES: Record<string, string> = {
  'tilesets/office-tileset.png': resolve(REPO_ROOT, 'src/renderer/src/assets/tilesets/office-tileset.png'),
  'tilesets/a5-office-floors-walls.png': resolve(REPO_ROOT, 'src/renderer/src/assets/tilesets/a5-office-floors-walls.png'),
  'tilesets/interiors.png': resolve(REPO_ROOT, 'src/renderer/src/assets/tilesets/interiors.png'),
};

function themeConfigToManifestTilesets(theme: ThemeConfig): PackManifestTileset[] {
  return theme.tilesets.map((t) => {
    if (t.embedded) {
      return {
        file: 'tilesets/office-tileset.png',
        embedded: true,
      };
    }
    if (t.image === 'a5') {
      return {
        file: 'tilesets/a5-office-floors-walls.png',
        firstgid: t.firstgid,
        image: t.image,
      };
    }
    if (t.image === 'interiors') {
      return {
        file: 'tilesets/interiors.png',
        firstgid: t.firstgid,
        image: t.image,
      };
    }
    throw new Error(`Unknown tileset entry: ${JSON.stringify(t)}`);
  });
}

function buildManifest(theme: ThemeConfig, meta: PackMetaInfo): PackManifest {
  const noteColorsHex: Record<string, string> = {};
  for (const [k, v] of Object.entries(theme.palette.noteColors)) {
    noteColorsHex[k] = numberToHex(v);
  }

  const manifest: PackManifest = {
    schema: 1,
    id: meta.id,
    name: meta.name,
    version: meta.version,
    author: meta.author,
    license: meta.license,
    blurb: meta.blurb,
    swatch: meta.swatch,
    map: 'map.tmj',
    tilesets: themeConfigToManifestTilesets(theme),
    seats: {
      primary: [...theme.primarySeatNames],
      cafe: [...theme.cafeSeatNames],
      cafeStands: theme.cafeStands.map(([name, kind]) => [name, kind]),
    },
    coffee: theme.coffee ? { ...theme.coffee } : undefined,
    anchors: { ...theme.anchors },
    errandSpots: theme.errandSpots.map((s) => ({ ...s })),
    monitor: {
      offTopLeftGid: theme.monitor.offTopLeftGid,
      onGids: theme.monitor.onGids.map((g) => [g[0], g[1], g[2]]),
    },
    palette: {
      background: numberToHex(theme.palette.background),
      noteColors: noteColorsHex,
    },
  };

  return manifest;
}

function generatePack(
  packId: 'munder-difflin' | 'brooklyn99',
  theme: ThemeConfig,
  sourceMapPath: string,
) {
  const targetDir = resolve(REPO_ROOT, `resources/themes/${packId}`);
  const tilesetsDir = resolve(targetDir, 'tilesets');

  mkdirSync(tilesetsDir, { recursive: true });

  // 1. Copy map.tmj byte-for-byte
  const targetMapPath = resolve(targetDir, 'map.tmj');
  copyFileSync(sourceMapPath, targetMapPath);
  console.log(`[${packId}] Copied map -> ${targetMapPath}`);

  // 2. Copy tileset PNGs byte-for-byte
  for (const [relFile, srcPath] of Object.entries(TILESET_SOURCE_FILES)) {
    const destPath = resolve(targetDir, relFile);
    copyFileSync(srcPath, destPath);
    console.log(`[${packId}] Copied tileset ${relFile} -> ${destPath}`);
  }

  // 3. Write theme.json
  const meta = PACK_METAS[packId];
  const manifest = buildManifest(theme, meta);
  const targetManifestPath = resolve(targetDir, 'theme.json');
  writeFileSync(targetManifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
  console.log(`[${packId}] Wrote theme.json -> ${targetManifestPath}`);
}

function main() {
  console.log('Generating builtin theme packs...');

  // Munder Difflin (pack #1)
  generatePack(
    'munder-difflin',
    OFFICE_THEME,
    resolve(REPO_ROOT, 'src/renderer/src/assets/maps/office.tmj'),
  );

  // Brooklyn Nine-Nine
  generatePack(
    'brooklyn99',
    BROOKLYN99_THEME,
    resolve(REPO_ROOT, 'src/renderer/src/assets/maps/brooklyn99.tmj'),
  );

  console.log('All builtin theme packs generated successfully.');
}

main();
