# Preview harness

Renders renderer components in a plain browser, with the real tokens, the real
component kit and the real locale files, without starting Electron.

```bash
npm run dev:preview     # http://localhost:5199
```

## Why this exists

`src/main/index.ts` calls `app.requestSingleInstanceLock()`, so `npm run dev`
exits immediately while a packaged Munder Difflin is already running. On the
agent floor the packaged app is the thing everyone is standing on, so
"just close it and run the dev build" means killing the hive to look at a
screen. Nobody could review a desktop screen visually without doing that, and
several people were quietly building throwaway harnesses to get around it.

This is that harness, made real.

## What it is not

It is not the app. There is no main process, no IPC, no store hydration and no
agents, so anything that reads `window.api` or the Zustand store will not work
here. It is for **presentational** review: layout, spacing, type, tokens, both
themes, both skins, and every state a component can be put in by props.

If a screen cannot be rendered from props alone, it does not belong here — that
is a signal about the component, not about the harness. `OnboardingWizard` is
the current example: it reads config over IPC, so it is reviewed in the app.

Each frame catches its own errors, so one component that needs IPC shows a
message in its own box instead of blanking the whole board.

## Adding a screen

Add a `<Frame>` to `boards.tsx`. Give every state its own frame rather than one
frame you have to interact with: the point is that a reviewer sees all of them
at once without clicking.

## Not in the production build

`electron-vite build` only reads `src/`. This directory is never bundled, and
its vite config is separate from `electron.vite.config.ts`.
