# agent-stage

**A local-first stage for a team of terminal coding agents.** Each `claude`, `codex`, `gemini`,
`agy`, `grok`, `kimi`, `qwen`, `opencode`, `crush`, `pi`, `copilot` or `cursor-agent` session runs as
a real process in its own pseudo-terminal. A file-based **hive** lets them message each other, and
an **orchestrator** agent is the one you brief. You watch the work happen as characters at desks on
a pixel office floor.

agent-stage is a fork of [munder-difflin](https://github.com/chaitanyagiri/munder-difflin) by
Chaitanya Giri (MIT). It keeps the engine and changes the surface: a neutral default theme with no
third-party art, a theme system you can extend, a usage-aware standup, and the orchestrator naming
used throughout the code.

## What you get

- **Every terminal is an agent.** Real CLIs under `node-pty`, rendered with xterm.js. Nothing is
  emulated.
- **An orchestrator you talk to.** It assigns work, routes mail between agents and escalates only
  when it needs you. You can rename it; a theme can suggest a name. See
  [Naming the orchestrator](#naming-the-orchestrator).
- **A hive on disk.** `registry.json`, per-agent `inbox`/`outbox`, a task ledger and an append-only
  `log.jsonl`. Plain files, easy to inspect and back up.
- **A pixel office.** Agents walk to desks as they work and envelopes travel between them.
- **Themes.** The bundled **plain** theme is generated from flat shapes. Drop in your own packs:
  see [Themes](#themes).
- **Standups with usage awareness.** An hourly ops standup can pull your own
  *"how many tokens does each agent have left"* endpoint so the orchestrator can reroute away from
  agents near their limit, or spend capacity that is about to reset. See
  [Usage endpoint](#usage-endpoint).
- **Bring your own keys and local models** (Ollama, LM Studio, vLLM) in Settings → AI Engines.

## Run it

Requirements: macOS, Windows or Linux; Node.js 18+; a C/C++ toolchain for `node-pty`; and at least
one agent CLI on your `PATH`. **Settings → Prerequisites** shows what is missing.

```bash
git clone https://github.com/jdell64/agent-stage.git
cd agent-stage
npm install        # postinstall rebuilds node-pty against Electron's ABI
npm run dev
```

Complete the onboarding wizard, then **Add agent** to start a session. The orchestrator seats itself
at the first desk.

```bash
npm run build         # production build
npm run typecheck     # main/preload and renderer projects
npm run test:focused  # node:test suites in test/
npm run test:themes   # vitest: theme-pack validator and the bundled pack
```

If `node-pty` fails to load after an Electron upgrade, re-run `npm install`.

## How it works

```
        you ── brief ──►  ┌──────────────┐   roster · routing · adjudication
                          │ orchestrator │   task ledger · blackboard
                          └──────┬───────┘
                 inbox/outbox    │   hive router
              ┌──────────────────┼──────────────────┐
         ┌────▼────┐        ┌────▼────┐        ┌────▼────┐
         │ agent A │        │ agent B │        │ agent C │   each: a CLI in a PTY
         └─────────┘        └─────────┘        └─────────┘
```

Agents read their instructions, drain their inbox, and write replies to their outbox. The router
moves messages between inboxes. The orchestrator id is `orchestrator`; older hives that used a
different id are migrated on first start (the registry is backed up first).

## Themes

A theme pack is a folder: a `theme.json` manifest, a Tiled `map.tmj`, and 16 px tilesets, with
optional fonts, UI tokens and a cast. The only pack in this repository is `plain`.

```bash
npm run theme:new -- my-office              # copy `plain` to ./my-themes/my-office
npm run theme:validate -- my-themes/my-office
MD_THEMES_DIR=./my-themes npm run dev       # or Settings → Office theme → Extra themes folder
```

Settings → Office theme lists every pack, shows exactly what is wrong with a broken one, and has
**Rescan** and **Open themes folder** buttons. The full contract is in
[docs/theming/THEMING.md](docs/theming/THEMING.md).

Third-party packs (for example art you bought, or a TV show's likeness) are yours to keep outside
this repository. `resources/themes/*` is gitignored except `plain`.

### Naming the orchestrator

Code and agent protocol always say *orchestrator*. The label people see resolves in this order:
your own rename, then the active theme's `copy.orchestratorName`, then `Orchestrator`.

## Usage endpoint

Point agent-stage at any HTTP endpoint that returns per-agent remaining capacity, and the hourly
standup will include a summary and write `usage-availability.json` into the hive for the
orchestrator to read. Settings → Autonomy & Budgets has the URL, optional bearer token, timeout, and
a **Test** button. Failure never blocks a standup. The response format, a ~30-line reference server
and security notes are in [docs/usage-endpoint.md](docs/usage-endpoint.md).

## Models

The model list ships in `src/shared/modelCatalog.json` (including Gemini 4 Argon for Antigravity
and the Gemini CLI) and is refreshed at runtime from `docs/model-catalog.json` on this repository's
`main` branch, so edit that file to add a model without a release.

## Layout

| Path | What lives there |
| --- | --- |
| `src/main` | Electron main process: hive, router, PTYs, missions/standups, config |
| `src/renderer/src` | React UI, Pixi office scene, i18n |
| `src/shared` | Code shared by both: theme-pack validator, identity, usage endpoint |
| `resources/themes/plain` | The built-in theme (generated by `scripts/theme-packs/plain/gen_pack.py`) |
| `docs/` | `ARCHITECTURE.md`, `DESIGN.md`, `theming/`, `usage-endpoint.md` |
| `test/` | `node:test` suites and vitest theme tests |

## License and credit

Code: MIT, see [LICENSE](LICENSE); the copyright notice of the original author is retained. The
bundled `plain` theme is original and covered by the same licence ([LICENSE-ASSETS](LICENSE-ASSETS)).
Original project: [chaitanyagiri/munder-difflin](https://github.com/chaitanyagiri/munder-difflin).
