// Ported from Prozzta/guppyos 02d0d50b (MIT).
// Bundled theme packs: every folder under the repo's themes/ with a theme.json.
// Vite inlines the text files (manifest, maps, tilesets) and emits the
// pictures as assets, so a pack ships inside the app bundle and is read
// without file-system access. The pure loader (packs.ts) does the rest.

import { normPath, type PackFiles } from './tiled';
import { memoryFiles } from './packs';

const TEXTS = import.meta.glob('../../../../../themes/*/**/*.{json,tmx,tsx,tmj,tsj,txt}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const PICTURES = import.meta.glob('../../../../../themes/*/**/*.png', { query: '?url', import: 'default', eager: true }) as Record<string, string>;

export interface PackSource {
  /** The folder name under themes/. */
  dir: string;
  files: PackFiles;
  /** normalized pack path -> bundled URL, for every picture. */
  pictures: Map<string, string>;
}

const split = (key: string): [string, string] | null => {
  const m = /\/themes\/([^/]+)\/(.+)$/.exec(key.replace(/\\/g, '/'));
  return m ? [m[1], m[2]] : null;
};

function collect(): Map<string, PackSource> {
  const texts = new Map<string, Record<string, string | null>>();
  const pics = new Map<string, Map<string, string>>();
  for (const [k, v] of Object.entries(TEXTS)) {
    const s = split(k);
    if (!s) continue;
    if (!texts.has(s[0])) texts.set(s[0], {});
    texts.get(s[0])![s[1]] = v;
  }
  for (const [k, url] of Object.entries(PICTURES)) {
    const s = split(k);
    if (!s) continue;
    if (!texts.has(s[0])) texts.set(s[0], {});
    texts.get(s[0])![s[1]] = null; // listed (so map references resolve), not text
    if (!pics.has(s[0])) pics.set(s[0], new Map());
    pics.get(s[0])!.set(normPath(s[1]), url);
  }
  const out = new Map<string, PackSource>();
  for (const [dir, entries] of texts) if ('theme.json' in entries)
    out.set(dir, { dir, files: memoryFiles(entries), pictures: pics.get(dir) ?? new Map() });
  return out;
}

let cache: Map<string, PackSource> | null = null;

/** Every bundled pack folder that has a theme.json. */
export function bundledPacks(): Map<string, PackSource> {
  return (cache ??= collect());
}
