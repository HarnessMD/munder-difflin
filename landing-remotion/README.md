# Munder Difflin — landing-remotion

[Remotion](https://www.remotion.dev/) project that produces the looping "HOW it works"
clips embedded on the landing page (`../docs/index.html`). The page references the rendered
files in `../docs/media/`; on-brand SVG **posters** already live there so the page looks
complete before you render anything.

## Compositions

| ID | Renders to | Shows |
|---|---|---|
| `HowAgents` | `docs/media/how-agents.{webm,mp4}` | Multiple terminal agents managed & visualized in the office simulation |
| `HowMemPalace` | `docs/media/how-mempalace.{webm,mp4}` | The shared MemPalace memory layer + millisecond recall |
| `HowOrchestratorHive` | `docs/media/how-orchestrator-hive.{webm,mp4}` | The orchestrator orchestrating every agent through the hive |
| `HeroFallback` | `docs/media/hero.{webm,mp4}` | *Optional* synthetic hero — use only if you have no real screen recording yet |

## Preview live

```bash
cd landing-remotion
npm install
npm run studio        # opens Remotion Studio at http://localhost:3000
```

## Render the web assets

Rendering uses a headless Chromium that Remotion downloads on first run, plus its bundled
ffmpeg. Outputs land directly in `../docs/media/`.

```bash
npm run render:all          # all three HOW clips (webm + mp4)

# or one at a time
npm run render:agents:webm
npm run render:orchestratorhive:mp4
# optional synthetic hero:
npm run render:hero:webm && npm run render:hero:mp4
```

`webm` (VP8) autoplays small and looping on Chromium/Firefox; the `mp4` (H.264) is the
Safari/iOS fallback. The page's `<video>` lists both sources, so render both.

## The hero banner

The hero is meant to be a **real screen recording of a busy agent session in the app**.
Capture one, export it as a muted loop, and save it as:

```
docs/media/hero.webm
docs/media/hero.mp4
```

If you don't have a capture yet, render `HeroFallback` (above) as a stand-in. Until either
exists, the page shows `docs/media/og.png`.

## Notes

- Tokens mirror `../DESIGN.md` and the page CSS — see `src/theme.ts`.
- This project is intentionally separate from the Electron app so the app's build is
  untouched. It is dev-only tooling; the deployed site is the static `docs/` folder.
