<!-- RELEASE RUNNER: releases are source only from 0.6.0. Pushing a v* tag creates the GitHub Release from this file with no files attached; GitHub adds the source archive. Nothing is built, signed or notarized. This comment is not rendered in the published notes. -->
# Munder Difflin v0.6.0

**A local hive of Claude Code, Antigravity, Codex, Gemini, Cursor, Grok & Copilot agents that run themselves.**
Messaging, routing, and remembering, coordinated by your clone, Michael, who you talk to. Local-first and open source.

### → [**munderdiffl.in**](https://munderdiffl.in/) · see it in action, then build it from source below

---

## What's new in 0.6.0

**The engine catches up.** The agents' engine gets a year's worth of work: agents that sleep and
wake, keys that reach a running agent, MCP servers chosen per agent, a token cap per agent, and
integrations for Slack, webhooks and the tunnel.

- **The new engine.** Mail and wake, temps, compaction by size, a clear when an agent switches
  work, handoff, memory trim and the memory index, restart and resume, the circuit breaker and
  the token ledger, safe git and worktree admin, hooks over HTTP, the retention sweep, board
  hygiene, two floors, recovery of a crashed window, and Windows fixes.
- **Agents sleep.** An idle agent sleeps after the time set in Settings and shows a Sleeping card
  with a Wake button on its terminal.
- **Integrations.** Slack in every mode, inbound webhooks (GitHub, Linear, Telegram and your own),
  the tunnel, an integration broker every agent can use, and an inbound message handled by a temp.
- **Keys reach running agents.** A key or secret saved in Settings is available to an agent
  through `md-secret` at once, with no restart.
- **MCP servers per agent**, over the floor wide defaults, and a **token cap per agent** in the
  command center.
- **A top bar** with the version, auto mode, usage limits, theme, settings and focus.

### Releases are source only

From 0.6.0 on, a release carries the source code and its notes, and no installers. Build the app
on your own machine with the steps under **Build it** below. The app checks for a newer release
and tells you when one is out, with a link to its notes. It no longer downloads or installs
anything.

### Removed

- Downloading and installing updates inside the app (see above).
- Freeflow dictation and the office theme picker. The floor keeps its default office.

<!-- drop -->
<div class="drop">
  <p class="eyebrow">Munder Difflin 0.6.0</p>
  <h1>The engine catches up.</h1>
  <p class="lede">Agents that sleep and wake, keys that reach a running agent, MCP servers per
  agent and a token cap per agent. Releases are source only from now on.</p>
  <ul class="features">
    <li>
      <h2>Agents sleep</h2>
      <p>An idle agent sleeps after the time you set in Settings. Wake it from its terminal.</p>
    </li>
    <li>
      <h2>Keys reach running agents</h2>
      <p>A key saved in Settings is ready for an agent at once, with no restart.</p>
    </li>
    <li>
      <h2>Integrations</h2>
      <p>Slack in every mode, inbound webhooks, the tunnel and a broker every agent can use.</p>
    </li>
    <li>
      <h2>Build it yourself</h2>
      <p>Releases now carry the source code and no installers. The app tells you when a new
      version is out and links to its notes.</p>
    </li>
  </ul>
</div>
<!-- /drop -->

## Still new in 0.4.6

**The release that speaks your language and updates itself.** The interface now runs in Chinese and
Arabic, the auto-updater downloads and installs a new build end to end, fonts ship inside the app so
a blocked network never leaves you on a blank window, and the way agent engines are launched is
hardened. Plus the Settings rework, an IME fix for CJK typing, and 16 community pull requests.

- **The interface speaks Chinese and Arabic.** Pick zh-CN or Arabic in Settings — every string is
  translated, with nothing falling back to English, and the terminals read right to left. Some
  screens still need their padding and icons mirrored, and that is the next piece of work.
- **Updates install themselves.** The badge advances check to available to downloading to downloaded
  on its own, and the button at the end restarts into the new version. This is the release that
  proves that path end to end.
- **Fonts ship inside the app.** No Google Fonts fetch on launch, so the app opens at the same speed
  on any network, including one where Google is blocked. The release drop's fonts are bundled too,
  and it can no longer white-screen while a stylesheet loads.
- **Engine command launching is hardened.** The name of the CLI an agent launches is validated
  before it is ever resolved against your PATH, so nothing but a plain command name or an absolute
  path reaches a shell.
- **IME typing no longer sends early.** Pressing Enter to choose a Chinese or Japanese candidate
  picks the word instead of firing the message with half-typed text.
- **Settings has one Save button.** The Connections tab stops repeating itself; REST API, MCP,
  Slack and webhooks each keep their place.
- **The app counts messages you send, not what they say.** A single `message_sent` event closes the
  activation funnel: a count and nothing else, no text, no length, no content of any kind.
  [`TELEMETRY.md`](TELEMETRY.md) lists it like every other event and the same opt-out applies.
- **The ASK ME card renders markdown.** Questions with emphasis, bullets, `code`, tables and links
  now render instead of showing their raw asterisks.

### Thanks

16 community pull requests from 13 contributors landed in this release, one of them (#213)
re-implemented rather than merged. Thank you to [@aaroncoville](https://github.com/aaroncoville), [@abo123v-glitch](https://github.com/abo123v-glitch),
[@BUGHUNTER-SACHIN](https://github.com/BUGHUNTER-SACHIN), [@djbiz](https://github.com/djbiz),
[@gpechieu](https://github.com/gpechieu), [@HsienW](https://github.com/HsienW),
[@HundredBillion](https://github.com/HundredBillion), [@jhinzzz](https://github.com/jhinzzz),
[@L422Y](https://github.com/L422Y), [@LavaDMan](https://github.com/LavaDMan),
[@raifemre](https://github.com/raifemre), [@savvaskoualis](https://github.com/savvaskoualis) and
[@Schopenhauer-loves-Hegel](https://github.com/Schopenhauer-loves-Hegel), and to everyone who
reviewed a pull request or filed the bug that led to one.

## Still new in 0.4.5

**The release that fixes the things you trusted and were quietly wrong.** Cost reporting was off
by more than half after a restart, semantic memory never worked on Apple Silicon, and agents
could not talk to each other reliably. All three are fixed. Plus weekday scheduling, clickable
paths everywhere, one editor instead of two, and 23 community pull requests.

- **Costs are reported right.** The telemetry counter reset on every app restart while the
  session id stayed the same, so the floor under reported spend by a wide margin. It is now folded
  from the ledger, with a separate session figure kept alongside.
- **Semantic memory works on Apple Silicon.** CoreML overflowed the quantized embedding graph,
  every vector came back NaN, and chroma rejected every upsert. Embeddings are pinned to CPU
  on macOS.
- **Agents talk to each other reliably.** An inbox wake watchdog, no more stale nudges, mail to
  a missing inbox is bounced and logged instead of dropped, a capped steer queue, atomic
  webhook dispatch, and PROTOCOL.md refreshes on boot.
- **Workers are reliable to hire.** Spawn, teardown, floor cards, and engine availability are
  all checked before a hire is committed.
- **The renderer runs inside Chromium's sandbox.**
- **Windows agents quit when the app does.**
- **Restart to update no longer gets stuck** when a running agent makes the app refuse to quit.
- **Triggers run on weekdays at a time of day,** not just on an interval, and they are DST safe.
- **Focus mode** survives a restart and you can edit an agent from inside it.
- **Every path in terminal output is clickable.** Markdown previews, source opens in the editor,
  images and unknown types reveal in Finder or Explorer.
- **One editor.** The fullscreen file overlay is gone, everything opens in the IDE, and the git
  rail is collapsed by default.
- **Updating is one click.** The title-bar badge downloads the build for your machine and tells
  you how to install it, it says `latest` once a check confirms you are current, and the first
  run after an update opens that release's page.
- **Settings opens with a card** carrying your version, your plan, and a way back to these notes.
- **Terminals follow the window theme,** Gemini CLI and Cursor Agent join the engine list, and
  Michael hires on his own terms with editable agent names.

## Still new in 0.4.4 · *Windows joins the floor*

**If you use Windows, 0.4.4 is the release that made the app work.** Agents could never message
each other there. They started, looked completely healthy, and quietly ignored one another
forever. It also fixed the first five minutes: setup could not be finished, and on a brand new
install the parts that carry messages between agents never started until you quit and reopened
the app.

- **Windows agents talk to each other.** The hive protocol reaches an agent as a multi-line
  command-line argument, and `cmd.exe` cut it at the first newline, taking the block that names
  `inbox/` and `outbox/` with it. Spawns now hand the real interpreter an argument array.
- **Setup finishes.** Accepting the suggested folder used to fail outright, and the folder box
  was empty even though the text above promised a suggestion.
- **A fresh install works immediately.** Messages between agents, live status on the cards, and
  Restart & Continue all stayed dead until you restarted the app, and nothing said so.
- **Skills and Prerequisites.** Every skill your agents can use, 227 more to browse and install,
  and one page in Settings that says which supporting tools you have and which you do not.
- **Release drops.** A release can carry its own designed page instead of a version number in
  the corner. You are reading one.
- **Dark mode rebuilt.** The one-pixel borders that draw every control measured under 2:1
  against their background, so the whole app read as flat grey shapes. Re-tuned and measured
  rather than picked by eye.

---

## Still new in 0.4.3 — *Michael is the logo*

**The mark is a face now.** Munder Difflin has always been an office you watch people work in,
and the icon was a pair of script initials on a gradient. It's Michael — your clone — drawn in
the app's own pixel art, on the brand yellow, looking straight back at you.

- **One mark, everywhere.** The dock icon on macOS, Windows and Linux, the site favicon and
  header, the in-app toolbar, and the README all render the same portrait. No variant is a
  redrawing of another.
- **The SVG is the source of truth.** The mark is authored as pure vector — every pixel of the
  sprite is a rect, with no fonts, no gradients and no filters — and every raster in `build/`
  and `docs/` is generated from it by [`tools/make-logo.cjs`](https://github.com/chaitanyagiri/munder-difflin/blob/main/tools/make-logo.cjs).
  The old icon depended on the Lobster webfont being installed to render correctly.
- **Icons are native at every size.** A real multi-resolution `.icns` (16→1024, with the macOS
  drop shadow) and a `.ico` carrying six sizes, plus a 32px favicon and a 180px apple-touch-icon,
  so nothing is a downscale of a 512px image any more.
- **Brighter call-to-action buttons.** The download button took its fill from the same token as
  accent *text*, which has to stay dark enough to read on a white page — so on the light theme
  it came out brown. Fills now have their own token and start at what used to be the hover colour.

> [!NOTE]
> **Appearance only.** No functional change in this release: the update carries the new icon into
> your dock, and nothing else moves.

---

## Still new in 0.4.2 — *Anonymous usage stats, done in the open*

Munder Difflin now sends a **small set of anonymous usage events** (app opened, agent spawned,
feature used) so we can tell whether features are actually used. It is built the way an
open-source project should build it:

- **[TELEMETRY.md](https://github.com/chaitanyagiri/munder-difflin/blob/main/TELEMETRY.md) is the
  complete contract.** Every event and property is listed there, and the code enforces that list
  as a hard allowlist — anything not in the table cannot be sent. No prompts, no transcripts, no
  file paths, no repo names, no identifiers. Events are PostHog *anonymous events* (no person
  profile, no identity), keyed by a random UUID you can delete.
- **Opt-out, three ways.** Uncheck it during onboarding, flip **Settings → General → Anonymous
  usage stats**, or set the standard `DO_NOT_TRACK` env var.
- **Forks send nothing.** The analytics key is injected only in release CI — building from
  source produces a build where the analytics module is a complete no-op.

---

## Still new in 0.4.1 — *The app says what the site says*

**Michael is your clone.** The website has been describing Munder Difflin as a clone of you that
works around the clock — the app still called it a "GOD agent." Now they match.

- **Your clone, not the GOD agent.** Michael is described as your clone throughout onboarding,
  and his card on the floor carries a **BOSS** tag — he's the boss of the agents, you're still
  the boss of him.
- **Onboarding was rewritten.** It opens on what you actually get ("a clone of you, working
  24/7") instead of a feature list, and the engine card no longer advertises three engines when
  ten ship — Claude Code, Codex, Grok, Kimi, Antigravity, Qwen, OpenCode, Crush, pi and Copilot
  are all named.

> [!NOTE]
> **This release changes wording only.** The `god` agent id, the hive folder layout, and message
> routing are untouched, so existing hives, memory, and running agents carry over exactly as they
> are. Nothing to migrate.

---

> [!NOTE]
> **Auto-update carries you here from v0.3.7 or later.** If you are still on v0.3.5 or v0.3.6,
> those builds shipped the broken updater and need one manual install — grab the download below,
> once.

---

## Previously

- **0.4.0** — *the brand grew up*: one yellow "MD" mark across the dock icon, in-app logo, site
  favicon, and munderdiffl.in; the landing page rebuilt around real screenshots and a live
  pixel-floor sim; pricing reframed around **Private Cloud** and **Private Network**.
- **0.3.9** — Settings → General answers "am I up to date?" directly, and removes 0.3.8's
  usage-limit guard that never released held agents.
- **0.3.8** — memory condensation works for the first time; a Triggers hub; one compaction
  schedule instead of two; a readable commit history.
- **0.3.7** — auto-update actually runs: a CommonJS/ESM import bug meant the native updater never
  fired in any packaged build since v0.3.4, and the failure was swallowed by a `catch`.
- **0.3.6** — *a machine with nothing on it can run agents*: Node and npm install themselves
  (verified against the official `SHASUMS256.txt`), hooks stopped dying with exit 127, `~/dev/foo`
  paths resolve, and the office floor rebuilds itself after losing its GPU context.
- **0.3.5** — a **send now** escape hatch for a paused message queue, and a compact Command
  Center header.
- **0.3.4** — talk mode that knows the floor, markdown previews, the IDE git time-machine
  (history + branch compare), redesigned Settings, xAI Grok and Kimi Code, and a single
  delivery gate for every automatic writer. Community work by
  [@gts-47](https://github.com/gts-47) and [@qschmick](https://github.com/qschmick).
- **0.3.3** — the built-in Monaco IDE, and GitHub Copilot CLI as the first community-contributed
  engine ([@anxkhn](https://github.com/anxkhn)).
- **0.3.2** — Realtime Michael: a voice channel to the GOD orchestrator.
- **0.3.1** — three more engines: OpenCode, Crush, and pi.dev.

Full history in the [CHANGELOG](https://github.com/chaitanyagiri/munder-difflin/blob/main/CHANGELOG.md).


---

## Thanks

This release carries community work. All 23 of these landed in v0.4.5:

| | | |
|---|---|---|
| [#157](https://github.com/chaitanyagiri/munder-difflin/pull/157) | [@gpechieu](https://github.com/gpechieu) | inherited Claude Code session markers are stripped from an agent's PTY env |
| [#158](https://github.com/chaitanyagiri/munder-difflin/pull/158) | [@gpechieu](https://github.com/gpechieu) | semantic memory works on Apple Silicon again: embeddings are pinned to CPU on macOS |
| [#159](https://github.com/chaitanyagiri/munder-difflin/pull/159) | [@gpechieu](https://github.com/gpechieu) | reliable spawn, teardown and floor cards for the workers Michael hires |
| [#165](https://github.com/chaitanyagiri/munder-difflin/pull/165) | [@rajpreetcodes](https://github.com/rajpreetcodes) | a `~` in the harness home folder resolves, so setup cannot die on ENOENT |
| [#171](https://github.com/chaitanyagiri/munder-difflin/pull/171) | [@KrushanPatel](https://github.com/KrushanPatel) | CONTRIBUTING.md matches the platforms the app actually supports |
| [#175](https://github.com/chaitanyagiri/munder-difflin/pull/175) | [@rekcilyssup](https://github.com/rekcilyssup) | a main-process watchdog wakes an idle worker sitting on an undrained inbox |
| [#176](https://github.com/chaitanyagiri/munder-difflin/pull/176) | [@FenjuFu](https://github.com/FenjuFu) | Gemini CLI joins the engine list |
| [#177](https://github.com/chaitanyagiri/munder-difflin/pull/177) | [@TTAWDTT](https://github.com/TTAWDTT) | each agent's live context-window occupancy shows in the roster |
| [#178](https://github.com/chaitanyagiri/munder-difflin/pull/178) | [@gpechieu](https://github.com/gpechieu) | a god-hired worker gets a floor card, and it archives when the worker dies |
| [#179](https://github.com/chaitanyagiri/munder-difflin/pull/179) | [@kdahal7](https://github.com/kdahal7) | `statAbs` expands `~`, so a path resolves the same way on every platform |
| [#181](https://github.com/chaitanyagiri/munder-difflin/pull/181) | [@TTAWDTT](https://github.com/TTAWDTT) | webhook dispatch goes through an atomic add, so a stale ledger cannot overwrite it |
| [#184](https://github.com/chaitanyagiri/munder-difflin/pull/184) | [@TTAWDTT](https://github.com/TTAWDTT) | the per-agent steer queue is capped, which bounds memory on a stalled agent |
| [#185](https://github.com/chaitanyagiri/munder-difflin/pull/185) | [@hyperstream-pro](https://github.com/hyperstream-pro) | mail to an id with no inbox is bounced and logged instead of dropped |
| [#186](https://github.com/chaitanyagiri/munder-difflin/pull/186) | [@BUGHUNTER-SACHIN](https://github.com/BUGHUNTER-SACHIN) | tests cover the Notifications and Stop idle-detection branches |
| [#187](https://github.com/chaitanyagiri/munder-difflin/pull/187) | [@hyperstream-pro](https://github.com/hyperstream-pro) | a stale inbox nudge no longer wakes an agent against an inbox that is already empty |
| [#190](https://github.com/chaitanyagiri/munder-difflin/pull/190) | [@swarnendu19](https://github.com/swarnendu19) | agent names can be edited after spin-up |
| [#199](https://github.com/chaitanyagiri/munder-difflin/pull/199) | [@amey-op](https://github.com/amey-op) | the Antigravity queue no longer wedges for 30 seconds |
| [#203](https://github.com/chaitanyagiri/munder-difflin/pull/203) | [@lifelmy](https://github.com/lifelmy) | the Crush config env points at the agent's own directory |
| [#210](https://github.com/chaitanyagiri/munder-difflin/pull/210) | [@chaitanyagiri](https://github.com/chaitanyagiri) | the art licence claims are true again, Modern Interiors is bought |
| [#214](https://github.com/chaitanyagiri/munder-difflin/pull/214) | [@pontusm](https://github.com/pontusm) | Windows agent processes quit when the app does |
| [#219](https://github.com/chaitanyagiri/munder-difflin/pull/219) | [@chaitanyagiri](https://github.com/chaitanyagiri) | engine availability is checked before Michael's engine is committed |
| [#226](https://github.com/chaitanyagiri/munder-difflin/pull/226) | [@chaitanyagiri](https://github.com/chaitanyagiri) | the floor reports lifetime spend, not spend since the last app restart |
| [#227](https://github.com/chaitanyagiri/munder-difflin/pull/227) | [@scy73](https://github.com/scy73) | the renderer runs inside Chromium's sandbox |

Four of the fixes above are [@gpechieu](https://github.com/gpechieu)'s and three are
[@TTAWDTT](https://github.com/TTAWDTT)'s. Thank you, and thank you to everyone who reviewed a
pull request or filed the bug that led to one.

---

## Build it

Releases carry the source code only. Build the app on your own machine:

```bash
git clone https://github.com/HarnessMD/munder-difflin.git
cd munder-difflin
git checkout v0.6.0
nvm use            # Node 22 (Node 20 works too; Node 26 cannot run the native rebuild)
npm install        # rebuilds node-pty for Electron
npm run dev        # starts the app
```

To make an app you can keep in your Applications folder: `npm run dist` (current OS), or
`dist:mac` / `dist:win` / `dist:linux`. The result is not signed, so on first open macOS may ask
you to right click the app and choose **Open**, and Windows SmartScreen may ask you to choose
**More info**, then **Run anyway**.

When a newer release is out, the app tells you and links to its notes. To update, pull the new
tag and run the same steps again.

---

## Requirements
- macOS 12+, Windows 10/11, or a modern Linux desktop
- Node 20 or 22, and a C/C++ toolchain (Xcode Command Line Tools on macOS, Build Tools on Windows)
- [Claude Code](https://claude.com/claude-code) installed and on your `PATH` (and/or the Antigravity `agy` or OpenAI `codex` CLI for those providers)
- A Claude Code subscription (Munder Difflin drives your existing `claude` CLI; it doesn't replace it)
- For **Realtime Michael** (voice): your own **OpenAI key with Realtime API access**. Without it the **Talk** button stays disabled

---

## What's inside
- **The simulation** — every agent is a real `claude` (or `agy` / `codex` / local-provider) pseudo-terminal, visualized as an avatar on a watchable office floor (`node-pty` · `xterm.js` · Pixi.js).
- **Talk to Michael** — a realtime **voice channel to the GOD orchestrator** that reads the hive and acts behind spoken echo-back confirmation, BYOK and main-only.
- **Selectable engines + per-hire capabilities** — each hire (and Michael himself) runs on a pluggable engine, with its own consented skills + MCP catalog.
- **MemPalace** — a markdown-first, semantic memory layer the whole office shares; cross-session recall in ~12ms.
- **GOD orchestrator + hive** — one agent you talk to routes work to specialists and stays autonomous, escalating only critical items (spend, destructive ops, scope) to you natively, through human-in-the-loop prompts. It can also spawn an ephemeral worker straight from Slack and tear it down safely.
- **Plugs into your setup** — your subscription, settings, skills, and MCP servers, plus an integrations registry with a write-only secret broker; `/remote-control` reaches the whole floor from your phone.

Full notes in the [CHANGELOG](https://github.com/HarnessMD/munder-difflin/blob/main/CHANGELOG.md).

---

## Links
[Website](https://munderdiffl.in/) ·
[Repo](https://github.com/HarnessMD/munder-difflin) ·
[Issues](https://github.com/HarnessMD/munder-difflin/issues) ·
[Contribute](https://github.com/HarnessMD/munder-difflin/blob/main/CONTRIBUTING.md) ·
[Become a patron](https://razorpay.me/@munderdifflinfund)

MIT-licensed. An affectionate parody — not affiliated with NBC's *The Office* or Dunder Mifflin.
