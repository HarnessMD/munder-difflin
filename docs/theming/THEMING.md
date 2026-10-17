# Making and installing a theme

A theme pack re-skins the pixel office: the floor plan, tiles, seats, colours, and optionally
fonts, UI tokens and a cast of characters. A pack is a plain folder. Nothing is compiled.

The only pack bundled with the app is **plain** (`resources/themes/plain`). It is generated from
flat shapes (`scripts/theme-packs/plain/gen_pack.py`) so it carries no third-party art.

## Quick start

```bash
npm run theme:new -- my-office            # copies `plain` to ./my-themes/my-office
npm run theme:validate -- my-themes/my-office
MD_THEMES_DIR=./my-themes npm run dev     # or set "Extra themes folder" in Settings
```

Then open **Settings → Office theme**, press **Rescan**, and pick your pack. A pack with errors
shows greyed out with the exact problems listed under the grid.

## Where packs are found

Each pack is a folder whose name is its id (`^[a-z0-9][a-z0-9-]{1,39}$`; `office`, `default` and
`none` are reserved). The app scans, in order, and the first folder with a given id wins:

1. `MD_THEMES_DIR` (a `;`-separated list on Windows, `:` elsewhere)
2. `<userData>/themes` (the **Open themes folder** button creates and opens it)
3. The **Extra themes folder** from Settings (`themesDir` in config)
4. The bundled `themes` folder

Changes are picked up when you press **Rescan**. Switching the active theme starts a fresh cast
(the orchestrator carries over, other agents are archived).

## Folder layout

```
my-office/
  theme.json            manifest (required)
  map.tmj               Tiled map, JSON format (required)
  tilesets/*.png        16x16 tile sheets referenced by the manifest (required)
  chrome/tokens.css     optional UI colour tokens
  chrome/fonts/*.woff2  optional fonts (<= 4, each <= 300 KB)
  cast/cast.json        optional character roster
  cast/sprites/<name>.png   optional sprite per roster member (108x32)
```

## theme.json

```jsonc
{
  "schema": 1,
  "id": "my-office",              // must equal the folder name
  "name": "My Office",
  "version": "1.0.0",
  "author": "you",
  "license": "MIT",               // required if you ship tilesets; credit art creators here
  "blurb": "One line for the picker",
  "swatch": "#2c2e3a",            // picker colour chip
  "map": "map.tmj",
  "tilesets": [
    { "file": "tilesets/main.png", "embedded": true }   // see "Tilesets"
  ],
  "seats": {
    "primary": ["desk-ceo", "pc-1", "pc-2"],            // [0] MUST be desk-ceo
    "cafe": ["cafe-seat-1"],
    "cafeStands": [["cafe-stand-coffee", "coffee"]],    // optional stands
    "facing": { "desk-ceo": "up" }                      // up|down|left|right, optional
  },
  "coffee": { "trayTile": {"x":1,"y":1}, "trayStand": {"x":1,"y":2}, "machineStand": {"x":2,"y":2},
              "sinkTile": {"x":3,"y":1}, "sinkStand": {"x":3,"y":2}, "maxCups": 4 },   // optional
  "anchors": { "calendar": {"x":4,"y":1}, "boards": {"x":8,"y":1}, "clock": {"x":12,"y":1} },
  "errandSpots": [],              // optional little trips: water, window, dispenser, fridge, shelf, bin, smoke
  "monitor": { "offTopLeftGid": 6, "onGids": [[7, 0, 0]] },   // the screen tile and its "on" swap
  "palette": { "background": "#14151c",
               "noteColors": { "todo": "#f2df8a", "doing": "#9ecbf0", "blocked": "#f0a3a3", "done": "#a8e0b0" } },
  "copy": { "orchestratorName": "Captain" },   // optional, see below
  "fonts": [], "chrome": { "tokens": "chrome/tokens.css", "defaultMode": "dark" }
}
```

Required: `schema`, `id`, `name`, `version`, `author`, `license`, `map`, `tilesets`, `seats`,
`anchors`, `monitor`, `palette`. Everything else is optional. Bad optional fields (fonts,
tokens, copy, cast) are reported as warnings and dropped, never fatal.

### Naming the orchestrator

The code always calls the lead agent *orchestrator*. What people **see** is a display name,
resolved in this order:

1. the name the user typed when renaming it in the app
2. `copy.orchestratorName` from the active theme (1-40 characters)
3. `Orchestrator`

So a themed pack can present the lead as "Captain" or "Michael" without anything in the code
or the agents' protocol changing, and a user's own rename always wins.

## map.tmj (Tiled)

Author in [Tiled](https://www.mapeditor.org/) and export as JSON (`.tmj`). Rules:

- Orthogonal, **finite**, **16x16 px tiles**, between 8 and 128 tiles per side. Tile layer data
  must be a plain array (set Tile Layer Format to *CSV*, not base64/zlib).
- Tile layers, by exact name: `floor`, `walls`, `furniture-below`, `furniture-above`, `collision`.
  Any non-zero tile in `collision` blocks walking.
- Object layers: `spawn-points` (points; the **name** is what matters) and `zones` (optional;
  `boardroom` is recognised).
- Every seat named in `theme.json` needs a point with the same name in `spawn-points`. `desk-ceo`
  is the orchestrator's seat. Seats starting with `desk-`, `pc-`, `warroom-` and the `entrance`
  point are always walkable. Add an `entrance` point: agents wait there for a free desk.
- The monitor overlay is the tile `monitor.offTopLeftGid` on `furniture-above`, two rows above the
  seat; `onGids` is `[gid, dx, dy]` tiles drawn when the agent is working.

## Tilesets

PNG, a multiple of 16 px, at most 2048x8192 and 4 MB each, at most 8 per pack. Either:

- **embedded**: the map has the tileset inline with `firstgid`/`tilecount`; the manifest entry is
  `{ "file": "...", "embedded": true }`, or
- **external**: the manifest gives `firstgid` (defaults to following the previous tileset) and the
  app derives size and columns from the PNG header.

More than 5% of tile ids not covered by any tileset rejects the pack.

## Cast (optional)

`cast/cast.json` is an array of `{ "name", "displayName", "shirt", "blurb" }`. `name` is letters,
digits, `-` or `_`. Add `cast/sprites/<name>.png`, 108x32: six 18x32 frames (front stand, step L,
step R, then the same three from behind). A missing sprite falls back to a drawn character and
produces a warning, not an error. Without `cast.json` the built-in roster is used.

## Limits

Pack total 24 MB (warning at 12 MB), manifest 256 KB, map 2 MB, `tokens.css` 16 KB (no `url()` or
`@import`), fonts `.woff2` only. The authoritative list is `PACK_LIMITS` in
`src/shared/themePack.ts`; `validatePack` there is the contract.

## Checking your work

`npm run theme:validate -- <folder> [<folder> ...]` runs the same validator the app uses and prints
every `error` / `warn` with a code and a path. Exit code 1 means the app would refuse the pack.

## Licensing

Only commit art you have the right to. Third-party packs (for example ones made from commercial
tilesets or a TV show's likeness) belong in your own themes folder, not in a public repo. This
repository gitignores everything in `resources/themes` except `plain`.
