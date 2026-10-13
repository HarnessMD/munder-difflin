# Blog scene kit

Coded motion graphics for blog posts. One script and one stylesheet for every post, no library.

| File | What it is |
| --- | --- |
| `src/assets/mg/kit.js` | The scenes, the cast and the player |
| `src/assets/mg/kit.css` | The frame, the focus ring |
| `src/assets/mg/cast.png` | The landing page cast, 15 characters, built by `scripts/build-mg-cast.mjs` |
| `src/assets/mg/demo.html` | Every scene with sample data: `/blog/assets/mg/demo.html` |

## Put a scene in a post

Add the two files once, at the end of the post:

```html
<link rel="stylesheet" href="/blog/assets/mg/kit.css"><script defer src="/blog/assets/mg/kit.js"></script>
```

Then one figure per scene. Keep it on one line so Markdown leaves it alone. The image is the still; the JSON is the page's own data.

```html
<figure class="mg" data-scene="price-ladder"><img src="/blog/assets/media/SLUG/prices.png" width="1600" height="900" loading="lazy" decoding="async" alt="Animation. Four price steps rise from Free to Team while Kevin points at them."><script type="application/json">{"title":"What each plan costs a month","prefix":"$","items":[{"label":"Free","value":0,"display":"Free"},{"label":"Pro","value":20,"highlight":true,"note":"Most people pick Pro."}],"host":"kevin","say":"Pro is the sweet spot."}</script><figcaption>Prices checked on 5 Oct 2026.</figcaption></figure>
```

What the kit does for every scene:

* Swaps the still for a live SVG, 960 by 540, and plays it only while it is on screen.
* Reduced motion: draws the still frame and does not loop. Taps and keys still work, without the move.
* Script blocked or a broken scene: the still image stays.
* Every tap target is a button: Tab reaches it, Enter or Space presses it, arrow keys move along a row.
* After a reader taps, the story stops on its still frame and a "Play again" button appears.
* Sends `blog_scene_view` (first time on screen) and `blog_scene_interact` (first tap) to PostHog with `slug` and `scene`, only when `window.posthog` exists.

## Phones

Under 520 px wide a kit scene draws on a tall stage (540 by 720) instead of the wide one (960 by 540): larger type, the content on top, the host and the bubble below. The timeline runs down the page and a flow uses two columns. The kit picks the stage from the width of the figure and swaps when the window changes. `?mgtall=1` forces the tall stage and `?mgtall=0` the wide one. The still image stays 16 by 9; only the live scene is tall.

## Stills

`?mgstill` freezes every scene on its own still frame. `?mgstill=3.5` freezes on second 3.5. Screenshot the figure at 1600 by 900 for the post still.

For the title image use the `title` scene, not the first scene of the post, so the top of the post does not show the same picture twice. It is composed for 1600 by 900 and stays readable as a small card on the blog index: keep the title under about 60 characters.

## Scenes and their data

Every scene takes `kicker` (the yellow chip) and `title`. `host` is a cast name; `say` is the host's closing line (keep it under 40 characters).

| Scene | Data | The reader can |
| --- | --- | --- |
| `title` | `title` (up to 3 lines of 27 characters), `sub`, `cast: [names]` (2 or 3, default Michael and Jim), `say` (first cast member, under 40 characters) | Nothing to tap, no hint |
| `stage` | `script: [{ who, say, point, carry }]`, optional `board: { label, lines }`. Up to 5 script lines. A board holds 4 lines of 43 characters; with a board, keep each `say` under 68 characters (two bubble lines) so it stays below the board. `point`: left, right, up-left, up-right, raise. `carry`: a short sign held at the chest | Tap a character to hear the line again |
| `price-ladder` | `prefix`, `suffix`, `items: [{ label, value, display, note, highlight }]`, up to 6 | Tap or hover a step for its note |
| `compare` | `cols: [a, b]`, `pick` (0 or 1), `rows: [{ label, a, b, win, note }]`, up to 5. `win` is "a", "b" or "". A cell fits about 17 characters at full size (15 with a tick); longer cells shrink to fit and are cut at 30 | Tap a row for its note |
| `timeline` | `events: [{ when, label, note }]`, up to 6 | Tap a date; the host walks to it |
| `flow` | `nodes: [{ label, note }]`, up to 8 (5 or more wrap to two rows), `labels: [text on arrow i]`, each up to 16 characters, drawn as a tag above the arrow | Tap a step or use arrow keys |
| `before-after` | `before: { label, lines }`, `after: { label, lines }` | Tap the card to flip it |
| `counter` | `from`, `to`, `prefix`, `suffix`, `label`, `note` | Tap the number to count again |

Fixed roles, so readers learn the cast: Jim explains, Dwight gives rules and warnings, Kevin does prices and numbers, Oscar checks facts, Pam draws diagrams, Michael opens and closes. The defaults follow this.

## The cast

`cast.png` is packed from the landing page (`docs/index.html`, classes `.sp-<name>` and `.pt-<name>`), pixel for pixel. Nothing is redrawn. Run `node scripts/build-mg-cast.mjs` when the landing page cast changes; it also rewrites the cast table in `kit.js`.

The landing strips only walk. The kit adds, on the same pixel grid and in each character's own colours: an arm that points (side or up), two raised arms, a hop, a talking bob, a speech bubble and a carried sign.

## A custom scene for one page

A page script registers its own scene with the same tools the kit uses:

```html
<script>
(window.MGQ = window.MGQ || []).push((MG) => MG.scene("my-scene", {
  build(svg, data, api) {
    MG.stage(svg, { kicker: "Launch", title: "My scene" });
    const jim = MG.actor(svg, "jim"), bub = MG.bubble(svg, 20);
    bub.set("Hello.");
    const draw = (t) => {
      const w = MG.walk(t, 0.2, 1.4, -60, 300);
      jim.draw({ x: w.x, step: w.step, arm: t > 1.5 ? "up-right" : "" });
      bub.draw(300, MG.GROUND - jim.top - 4, MG.p(t, 1.6, 2));
    };
    return { draw, dur: 6, still: 3 };
  },
}));
</script>
```

A custom scene always gets the wide stage. To support phones, set `tall: true` on the scene, pass `api.L` to `MG.stage(svg, data, api.L)` and lay out from the layout it returns (`W`, `H`, `x0`, `x1`, `top`, `bot`, `gy`, `hx`, `tall`); `MG.host(svg, L, name)` places the host and the bubble for both.

`draw(t)` must draw the whole frame from the time alone, so stills and reduced motion work. For a tap target use `MG.hit(parent, label, fn)` then `MG.ring(...)`, and call `api.poke(change, ms)` inside `fn`; read `api.ui.k` (0 to 1) in `draw` for the move.

## Rules

No red in anything new. Stage `#1A1320`, accent `#FFCA54`. The cast keeps its landing page colours.
