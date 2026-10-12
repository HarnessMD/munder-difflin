# Theme Pack Inventory & Format Spec

Status: analysis only (no source changed). Paths are relative to `src/renderer/src/` unless prefixed
`main/` / `preload/` (= `src/main`, `src/preload`). Line numbers are as of branch
`agent/worker-phase-a-inventory-v2`.

**Goal.** Given a folder that meets size + naming rules, the app loads it as a theme. We do not
hand-author themes. "Munder Difflin" is pack #1: the current office look, migrated byte-identical.

## 1. Inventory of themeable surfaces
TODO

## 2. The pack format (centerpiece)

### 2.0 Starting point (what already exists)
`scene/office/themeRegistry.ts` defines `ThemeConfig` (map + tilesets + seat/cafe names + coffee +
anchors + errands + monitor gids + palette + cast) and `themeLoader.ts` has an async
`loadTheme(id)` that already validates lightly and falls back to `OFFICE_THEME`. What blocks
"drop in a folder": (a) `ThemeId` is a closed union (`themeRegistry.ts:36`, mirrored in
`main/config.ts:320`, `store/config.ts:127`, `preload/index.ts:327`, `main/realtimeActions.ts:142`);
(b) the map and tilesets are build-time Vite `?raw`/`?url` imports (`themeRegistry.ts:23-28`);
(c) the cast is compiled TS (`cast.ts` + `portraitArt.ts`); (d) chrome tokens, copy and terminal
palette are not part of the contract at all. The pack format below makes `ThemeConfig` the
**in-memory** shape and adds a **JSON manifest** as the on-disk shape, extending rather than
replacing the existing field names.

### 2.1 Folder structure
A pack is one directory. The directory name is the pack id (`[a-z0-9][a-z0-9-]{1,39}`).

```
<pack-id>/
  theme.json            REQUIRED  manifest (2.2)
  map.tmj               REQUIRED  Tiled JSON map (2.4)
  tilesets/             REQUIRED  1..8 PNG atlases, referenced by theme.json
    <name>.png
  preview.png           optional  picker thumbnail, 320x180 (falls back to a generated swatch)
  CREDITS.md            REQUIRED if any asset is third-party (see §5); surfaced in About/credits
  cast/                 optional  omit => default roster (see 2.7)
    cast.json           roster metadata (CastMember[])
    portraits/<name>.png    one per cast member, 36x64 (2x of the 18x32 scene frame)
    sprites/<name>.png      one per cast member, 108x32 (6 frames of 18x32, see 2.4)
  chrome/               optional  live-switchable, no reseat
    tokens.css          only `--cth-*` custom properties inside `:root{}` / `[data-cth-theme=dark]{}`
    fonts/*.woff2       latin subsets; declared in theme.json `fonts[]`
  terminal.json         optional  { light: {...xterm ITheme}, dark: {...} }
  copy/<locale>.json    optional  PARTIAL i18n override, same keys as i18n/locales/<locale>.json
```

Rules: no symlinks, no `..`, no absolute paths, no files outside this tree are read. Unknown files
are ignored. Total pack size cap 24 MB (soft warn at 12 MB).

### 2.2 Manifest: `theme.json`
```jsonc
{
  "schema": 1,                       // REQUIRED integer; loader supports 1..N, rejects higher w/ warning
  "id": "munder-difflin",            // REQUIRED, must equal directory name
  "name": "Munder Difflin",          // REQUIRED display name (picker)
  "version": "1.0.0",                // REQUIRED semver
  "author": "…", "license": "MIT",   // REQUIRED strings (license of pack's own content)
  "blurb": "The original floor",     // optional
  "swatch": "#6b5a4a",               // optional picker colour if no preview.png

  "map": "map.tmj",
  "tilesets": [                      // order == map tileset order == texture load order
    { "file": "tilesets/office-tileset.png", "embedded": true },
    { "file": "tilesets/a5-office-floors-walls.png", "firstgid": 513 },
    { "file": "tilesets/interiors.png",       "firstgid": 1025 }
  ],                                 // firstgid optional: loader assigns 1, then prev+tilecount

  "seats":  { "primary": ["desk-ceo","pc-1", "…"], "cafe": ["cafe-seat-1","…"],
              "cafeStands": [["cafe-stand-coffee","coffee"],["cafe-stand-vending","vending"]] },
  "coffee": { "trayTile":{"x":29,"y":15}, "trayStand":{…}, "machineStand":{…},
              "sinkTile":{…}, "sinkStand":{…}, "maxCups":4 },        // optional => coffee loop disabled
  "anchors": { "calendar":{"x":4,"y":1}, "boards":{"x":6,"y":10}, "clock":{"x":1,"y":1} },
  "errandSpots": [ { "kind":"water","stand":{…},"facing":"left","fx":{…},"duration":4.5,"godOnly":false } ],
  "monitor": { "offTopLeftGid":365, "onGids":[[367,0,0],[368,1,0],[383,0,1],[384,1,1]] },
  "palette": { "background":"#1A1320", "noteColors":{"todo":"#f2df8a","doing":"#9ecbf0","blocked":"#f0a3a3","done":"#a8e0b0"} },

  "fonts":  [ { "family":"Inter", "file":"chrome/fonts/inter.woff2", "weight":"400 700", "slot":"ui" } ],
  "chrome": { "tokens": "chrome/tokens.css", "defaultMode": "light" },
  "terminal": "terminal.json",
  "copy":   { "appName": "Munder Difflin", "godName": "Michael" },   // small typed set; bulk strings go in copy/<locale>.json
  "cast":   { "roster": "cast/cast.json", "default": "jim" }
}
```
Field names deliberately equal `ThemeConfig` so the TS interface is a superset of the existing one:
`seats.primary` = `primarySeatNames`, `seats.cafe` = `cafeSeatNames`, etc. Colours are `#rrggbb`
strings on disk (the in-memory `PaletteConfig` stays `number`, converted by the loader via
`hexNum`/`hexToNumber`, as `OfficeFloor.tsx:247` and `cast.ts:50` already do).

### 2.3 Naming conventions (hard requirements)
| Thing | Rule |
|---|---|
| pack dir / `id` | `^[a-z0-9][a-z0-9-]{1,39}$`; reserved: `office`, `default`, `none` (legacy alias, see §4) |
| manifest | exactly `theme.json` (lowercase) |
| map | `map.tmj` (Tiled JSON; `.json` not accepted) |
| tilesets | any `tilesets/*.png`, lowercase `[a-z0-9._-]`, PNG only |
| map layers (exact names; `TiledMapRenderer.ts:259` looks up by name+type) | tilelayers `floor`, `walls`, `furniture-below`, `furniture-above`, `collision`; objectgroups `spawn-points`, `zones` |
| required spawn points | `desk-ceo` (god's seat) plus >=1 more in `seats.primary`; every name in `seats.*` must exist in `spawn-points` |
| zones | `boardroom`, `cafeteria` (optional; absent => feature off) |
| cast files | `<name>` = lowercase `[a-z0-9-]`, must match a `cast.json` entry; `portraits/` and `sprites/` required together |
| tokens | only `--cth-*` names that exist in `design/tokens.css`; others dropped with a warning |
| `noteColors` keys | `todo`, `doing`, `blocked`, `done` |

### 2.4 Dimension / size requirements
Engine constants (NOT themeable): **tile = 16x16 px** (every tileset and the map; see the
`TilesetEntry` literals at `themeRegistry.ts:163-164`); cast scene frame = **18x32 px**
(`SCENE_W`/`SCENE_H`, `portraitArt.ts:15-16`).

| Asset | Requirement | Hard limit (reject) |
|---|---|---|
| tileset PNG | width and height multiples of 16; `columns = width/16` derived, never trusted from manifest; RGBA | width <= 2048, height <= 8192, file <= 4 MB, <= 8 tilesets |
| map | `tilewidth=tileheight=16`, `infinite:false`, orthogonal, plain-array `data` (no zlib/base64) | width,height in 8..128 tiles; JSON <= 2 MB |
| map gids | every non-zero gid must fall in a declared tileset's `[firstgid, firstgid+tilecount)` | unresolved gid => tile skipped + warning; >5% unresolved => reject |
| cast sprite sheet | **108x32**: six 18x32 frames left to right: front stand, front step-L, front step-R, back stand, back step-L, back step-R (mirrors `sceneFrameBufs() -> {front[3], back[3]}`, `cast.ts:80`) | exact size or member skipped |
| cast portrait | **36x64** (2x the scene frame; `paintCastPortrait` default scale 2) | exact size or member skipped |
| preview | 320x180 | PNG <= 512 KB, else ignored |
| fonts | woff2 only, <= 300 KB each, <= 4 files | else ignored (system stack stays) |
| tokens.css | <= 16 KB, no `url()`, no `@import`, only `--cth-*` declarations | else ignored |
| cast roster | 1..40 members; `shirt` is `#rrggbb`; blurb <= 60 chars | |

Reference values from the existing office: map 34x22 tiles, 5 tilelayers + 2 objectgroups, 24 spawn
points; atlases 256x512 (a5), 256x1424 (interiors), office-tileset 16 columns / 512 tiles.

### 2.5 Validation + graceful-fallback contract
One function owns this: `validatePack(rawFiles) -> { pack: ThemePack | null, issues: Issue[] }`,
pure and unit-testable (no fs, no Pixi). It runs in **main** at scan time (structural checks, byte
sizes, PNG header dims) and again in the **renderer** before the scene touches the pack.
`Issue = { level: 'error'|'warn', code, path, message }`.

**Errors (pack rejected whole, never partially applied):** missing/unparseable `theme.json` or
`map.tmj`; unsupported `schema`; `id` != directory name; map missing a required layer or
`desk-ceo`; any `seats.*` name absent from `spawn-points`; a tileset missing / not PNG / over
limits; map over limits; >5% unresolved gids.

**Warnings (pack loads; the one field falls back to the default pack's value):** bad `coffee` /
individual `errandSpots` (feature disabled / spot dropped; stand tile out of bounds or on a
collision cell); bad `monitor` (desks render without ON overlay); invalid cast member (skipped; if
roster ends empty => default roster); bad font/tokens/terminal/copy (ignored); missing preview.

**Fallback chain (single, deterministic):** requested id -> last-known-good id (persisted in
config) -> built-in `munder-difflin`. `loadTheme()` stays total — today it already returns a theme
on any failure (`themeLoader.ts:58-65`); the new version returns `{ theme, usedFallbackFor?,
issues }` and the UI shows a non-blocking notice. Rules that keep the floor alive:
1. The picker runs `themes:validate` BEFORE the destructive confirm modal; an invalid pack never
   reaches `applyTheme` (`OfficeThemePicker.tsx:64`), so a bad pack can never archive live agents.
2. An exception inside `OfficeFloor.init` (`OfficeFloor.tsx:246`) is caught and the scene re-inits
   once with the built-in pack.
3. Size caps are enforced **in main before bytes cross IPC** (a 50 MB PNG never reaches renderer).
4. Every issue is logged so a bad pack is diagnosable.

### 2.6 Discovery (where packs live)
Search order; first id wins, collisions are logged and the later one is shown as unavailable:
1. **Built-in:** `<process.resourcesPath>/themes/<id>/` — shipped via `electron-builder.yml`
   `extraResources` (block starts at line 62; add `resources/themes -> themes`). In dev:
   `<repo>/resources/themes`.
2. **User:** `<userData>/themes/<id>/` (`app.getPath('userData')`, same root as
   `main/config.ts:491` and `main/db.ts:81`). Settings gets an "Open themes folder" button.
3. **Dev override:** env `MD_THEMES_DIR` (path-delimiter list) so authors iterate without touching
   userData (see the shared-userData hazard in §5).

Scan = startup + explicit "Rescan" (no fs watcher in v1). A scan returns lightweight
`PackSummary { id, name, version, blurb, swatch, source, issues[] }`; heavy bytes load on demand.

### 2.7 TypeScript contract and load path
```ts
// scene/office/themePack.ts (new). ThemeConfig stays: it is the resolved scene half.
export type ThemeId = string;                          // was a closed union

export interface PackManifest {                        // == theme.json, 1:1
  schema: 1; id: ThemeId; name: string; version: string; author: string; license: string;
  blurb?: string; swatch?: string; map: string;
  tilesets: { file: string; embedded?: boolean; firstgid?: number }[];
  seats: { primary: string[]; cafe: string[]; cafeStands: [string, 'coffee' | 'vending'][] };
  coffee?: CoffeeConfig; anchors: AnchorConfig; errandSpots: ErrandSpot[];
  monitor: MonitorConfig;
  palette: { background: string; noteColors: Record<string, string> };
  fonts?: { family: string; file: string; weight?: string; slot?: 'display' | 'ui' | 'mono' }[];
  chrome?: { tokens?: string; defaultMode?: 'light' | 'dark' };
  terminal?: string;
  copy?: { appName?: string; godName?: string };
  cast?: { roster: string; default: string };
}

/** What main returns over IPC: manifest + the already size-checked bytes. */
export interface PackPayload {
  manifest: PackManifest;
  files: Record<string, Uint8Array>;                   // key = pack-relative path
  source: 'builtin' | 'user' | 'dev';
  issues: Issue[];
}

/** Runtime object: a ThemeConfig plus the non-scene layers. */
export interface ThemePack extends ThemeConfig {
  meta: { name: string; version: string; author: string; license: string; source: string };
  chrome?: { tokensCss?: string; fontFaces: FontFace[]; defaultMode?: AppTheme };
  terminal?: { light?: ITheme; dark?: ITheme };
  copy?: Record<string /* locale */, Record<string, unknown>>;
  disposeUrls(): void;                                 // revokes blob: URLs
}
```
**Load path — ONE path for built-in and user packs.**
- `main/themes.ts` (new): `scanThemes()`, `readPack(id)` (reads the dir, enforces §2.4, returns
  `PackPayload`). Registered next to the existing fs handlers (`main/index.ts:3330-3340`):
  `ipcMain.handle('themes:list' | 'themes:load' | 'themes:validate' | 'themes:openFolder')`. Args
  are string-checked; `id` is matched against the scanned set, never path-joined from raw input.
- `preload/index.ts`: add `listThemes()`, `loadThemePack(id)`, `validateTheme(id)`,
  `openThemesFolder()` to the `cth` bridge (`exposeInMainWorld` at `preload/index.ts:1429`).
- Renderer: `themeLoader.loadTheme(id)` calls `window.cth.loadThemePack(id)` and builds `blob:`
  URLs (`URL.createObjectURL`) for tilesets/fonts/portraits — the technique the repo already uses
  for images, because the CSP (`index.html:6`, `img-src 'self' data: blob:`) has no `file:` source
  and no file protocol is registered (`main/index.ts:3334-3338`). **No CSP change.** (Alternative,
  rejected for v1: a `cth-theme://` protocol + widened `img-src` — a CSP widening for no gain.)
  `resolveThemeMap` / `themeTilesetUrls` keep their signatures, so the scene call sites
  (`OfficeFloor.tsx:281-285`) are untouched.
- **Superseding the registry:** delete the Vite `?url`/`?raw` imports at `themeRegistry.ts:23-28`.
  `THEMES`/`getTheme` become a runtime `Map<ThemeId, ThemePack>` filled by `loadTheme`. The
  `OFFICE_THEME` / `BROOKLYN99_THEME` literals become two `theme.json` files (§4).
- **Config:** `officeTheme` becomes `string` (the four mirrors in §2.0); the hard enum at
  `realtimeActions.ts:142` becomes a runtime check against the scanned id set.
- **i18n:** `copy/<locale>.json` is merged with `i18n.addResourceBundle(lng, 'translation', obj,
  true, true)` on activate and the base bundle restored on deactivate (i18n is initialised with
  static `resources` at `i18n/index.ts:110`).
- **Chrome:** tokens.css injected as one `<style id="cth-theme-pack">` (replaced on switch); fonts
  via `FontFace` + `document.fonts.add`. **Terminal:** the two hard-coded `ITheme` objects in
  `components/PtyTerminalView.tsx:55-110` become `pack.terminal?.[mode] ?? DEFAULT[mode]`.
- **Cast default:** a pack with no `cast/` uses the built-in procedural roster
  (`cast.ts` + `portraitArt.ts`) via `ThemeCast`, exactly as `BROOKLYN99_THEME` reuses
  `OFFICE_THEME.cast` today (`themeRegistry.ts:285`). Disk cast and procedural cast satisfy the
  same `ThemeCast { byName, getFrames, defaultCharacter }`.

## 3. Switch layers (cast-reseat vs. live)
TODO

## 4. Migration plan
TODO

## 5. Asset / license notes
TODO
