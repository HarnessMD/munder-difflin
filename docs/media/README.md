# docs/media

Media assets the landing page (`../index.html`) embeds.

## What's here now

- `og.png` — canonical social preview (Open Graph, Twitter, hero `<video poster>`, README demo)
- Legacy **SVG posters** (optional fallbacks if you re-point the page):

- `hero-poster.svg` — office floor + live terminal (legacy placeholder)
- `how-agents-poster.svg`
- `how-mempalace-poster.svg`
- `how-orchestrator-hive-poster.svg`

## What to add

Rendered video loops (committed, since GitHub Pages serves them statically). Provide both
`.webm` (VP8/VP9) and `.mp4` (H.264) for cross-browser autoplay:

| File | Produced by |
|---|---|
| `hero.webm` / `hero.mp4` | **Your real screen recording** of a busy agent session (preferred), or `npm run render:hero:*` in `../../landing-remotion` |
| `how-agents.webm` / `.mp4` | `../../landing-remotion` → `npm run render:agents:*` |
| `how-mempalace.webm` / `.mp4` | `npm run render:mempalace:*` |
| `how-orchestrator-hive.webm` / `.mp4` | `npm run render:orchestratorhive:*` |

See `../../landing-remotion/README.md` for the full render workflow. The page degrades
gracefully: if a video file is missing, the matching poster stays on screen.
