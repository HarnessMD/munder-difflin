---
title: "OpenCode 2.4: built in browser, automations and upgrade notes"
description: "OpenCode 2.4 adds a desktop browser the agent can drive, automations on a timer, cron or MCP event, and generate_video. Upgrade notes, checked 24 Nov 2026."
date: 2026-11-24
category: concepts
categoryLabel: Concepts
type: Technical
primaryKeyword: "opencode 2.4"
secondaryKeywords: ["opencode 2.4.0", "opencode automations", "opencode browser", "opencode generate video", "opencode upgrade", "opencode changelog"]
tags: ["Concepts", "Open Source", "CLI Agents", "Engines"]
faq:
  - q: "What is new in OpenCode 2.4?"
    a: "The v2.4.0 release notes, published on GitHub on 23 Nov 2026, list five highlights: a built in desktop browser, automations, video generation with generate_video, a new TUI look and Windows taskbar status. v2.4.1 followed the same day and fixes assistant messages failing to save on macOS 12."
  - q: "How do I turn off OpenCode automations?"
    a: "Set \"automations\": false in your config, per the v2.4.0 notes. Automations run a prompt, a script or a shell command on a timer, on a cron schedule or when an MCP server sends an event, and you manage them with /automation. A shell action asks for approval once, when it is created."
  - q: "Can the OpenCode agent use my browser sign ins?"
    a: "In the desktop app, yes. The v2.4.0 notes say you can import sign ins and browsing history from Chrome, Edge, Firefox or Safari into one persistent desktop profile, and the agent can read and drive the same pages. A browser deny in your permission rules refuses every agent browser call."
  - q: "Why does OpenCode ask again before generating images after the upgrade?"
    a: "The image tool experimental_image_generate is now generate_image. The v2.4.0 notes say permission rules with the old name are mapped automatically, but saved \"always allow\" approvals are not, so it asks again once."
  - q: "How do I upgrade OpenCode to 2.4?"
    a: "OpenCode's README lists npm i -g @opencode/cli@latest, a curl install script and the anomalyco/tap/opencode-v2 Homebrew tap. On 24 Nov 2026 the npm registry gave 2.4.1 as the latest tag for @opencode/cli. 2.4.1 fixes assistant messages failing to save on macOS 12."
---

OpenCode 2.4 puts a browser inside the desktop app that the agent can drive, and lets the agent run prompts, scripts or shell commands on a schedule. Anomaly published [v2.4.0](https://github.com/anomalyco/opencode/releases/tag/v2.4.0) on GitHub on 23 Nov 2026 at 09:22 UTC and [v2.4.1](https://github.com/anomalyco/opencode/releases/tag/v2.4.1) at 15:57 UTC. Checked 24 Nov 2026.

New to the tool? Start with [What is OpenCode](/blog/what-is-opencode/); [OpenCode 2.3](/blog/opencode-2-3/) and [OpenCode 2.0](/blog/opencode-2-0/) cover the releases before this one. Running Claude Code too? See our [Max plan guide](/blog/claude-code-max-plan-tips/).

## What is new in OpenCode 2.4?

Five highlights: a built in desktop browser, automations, video generation, a new TUI look and Windows taskbar status. The table is our selection from the [v2.4.0 notes](https://github.com/anomalyco/opencode/releases/tag/v2.4.0) and the [v2.4.1 notes](https://github.com/anomalyco/opencode/releases/tag/v2.4.1), read on 24 Nov 2026.

| Change | What it does | Release |
| --- | --- | --- |
| Desktop browser | Imports sign ins and history, adds extensions; the agent drives the same pages | v2.4.0 |
| Automations | A prompt, script or shell command on a timer, a cron schedule or an MCP event | v2.4.0 |
| `generate_video` | Makes videos when a connected provider has a video model | v2.4.0 |
| New TUI look | New designs by default; `opencode-classic` keeps the previous look | v2.4.0 |
| Windows taskbar | Shows session progress and flashes when a permission or question waits | v2.4.0 |
| macOS 12 fix | Assistant messages save again on macOS 12 | v2.4.1 |

## How does the built in browser work?

It is a browser pane in the desktop app with one saved profile, so you and the agent see the same signed in pages. The v2.4.0 notes say you can "Import your sign-ins and browsing history from Chrome, Edge, Firefox or Safari, and add extensions from Chromium browsers or the Chrome and Edge stores." They go on: "Everything stays in one persistent desktop profile: chat links open signed in, your tabs survive restarts and the agent can read and drive the same pages without you switching apps."

<figure class="mg" data-scene="periscope"><img src="/blog/assets/media/opencode-2-4/periscope.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A yellow periscope labelled agent rises from a blue box and turns toward a soft white card labelled same pages, where a sky tab and a mint tab sit side by side. A lilac tag reading signed in slides onto each tab as the periscope looks at it. A tap on the periscope swings it to the other tab."><figcaption>The agent can read and drive the same signed in pages you use, per the v2.4.0 notes of 23 Nov 2026.</figcaption></figure>

Web links from the chat now open beside the conversation; the notes say "Modifier-click a link to open it in your system browser." To keep the agent out, "A `browser` deny in your permission rules refuses every agent browser call." OpenCode's [tools docs](https://opencode.ai/docs/tools/), read on 24 Nov 2026, add: "A `browser` deny rule with resource `*` removes the browser catalog; browser operations do not issue individual permission prompts." The [permissions page](https://opencode.ai/docs/permissions/) did not list a `browser` action that day.

For a CLI approach, compare [OpenCode Browse vs agent-browser](/blog/opencode-browse-vs-agent-browser/).

## What are OpenCode automations, and how do you turn them off?

Automations are jobs the agent sets up to run later on its own. The v2.4.0 highlights say: "Ask the agent to run a prompt, a script or a shell command on a timer, on a cron schedule or when an MCP server sends an event, and manage them with `/automation`." The core notes add: "A shell action asks for approval once, when it's created, and records each run's exit code and output."

<figure class="mg" data-scene="alarmclock"><img src="/blog/assets/media/opencode-2-4/alarmclock.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A yellow alarm clock labelled automation ticks on a soft white shelf. When its hands reach the top it rings, and a blue card reading prompt, a lilac card reading script and a mint card reading shell command pop up one after another. A sky switch beside the clock reads off. A tap on the switch stops the clock."><figcaption>Automations run a prompt, script or shell command on a timer, a cron schedule or an MCP event, per the v2.4.0 notes of 23 Nov 2026.</figcaption></figure>

To turn them off, the notes say to set this in your config:

```json
{
  "automations": false
}
```

OpenCode's [config docs](https://opencode.ai/docs/config/) did not list the `automations` key on 24 Nov 2026, and the docs had no automations page. Our view: since a shell action asks only once, read it closely when the agent first proposes it.

## What does generate_video do, and what happened to generate_image?

`generate_video` lets the agent make videos "whenever a connected provider has a video model", per the v2.4.0 notes. The job "runs in the background, survives a server restart, saves the finished videos into the workspace and wakes the agent with their paths." Set a default model with `experimental.video_generate.model`.

<figure class="mg" data-scene="zoetrope"><img src="/blog/assets/media/opencode-2-4/zoetrope.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A lilac zoetrope drum spins on a soft white stand, and through its slits a small yellow paper plane seems to fly. A blue card beside it reads generate_video, and a mint folder labelled workspace catches each finished strip. A tap on the drum spins it once more."><figcaption>generate_video saves finished videos into the workspace, per the v2.4.0 notes of 23 Nov 2026.</figcaption></figure>

The same release renamed the image tool: `experimental_image_generate` is now `generate_image`. OpenCode's tools docs listed `generate_image` on 24 Nov 2026 but had no entry for `generate_video`.

## What should you watch for when upgrading?

Renamed tools, plugins that update themselves, token, protocol and theme changes, new shortcuts, and a macOS 12 fix in 2.4.1. Our picks from the [v2.4.0 upgrade notes](https://github.com/anomalyco/opencode/releases/tag/v2.4.0):

1. Image tool rename: "Permission rules with the old name are mapped automatically, but saved 'always allow' approvals are not, so it asks again once."
2. Plugins written as `name@latest`, a version range or a Git branch are "checked on startup and every 24 hours" and update themselves; an exact version does not. The [plugins docs](https://opencode.ai/docs/plugins/) give the same check and call exact versions "pinned".
3. "GitHub Copilot no longer reads `GITHUB_TOKEN`." Set `COPILOT_GITHUB_TOKEN` or sign in with OAuth.
4. "MCP servers are tried on the newest protocol first": a server without a `protocol` setting "is probed before falling back to the legacy handshake". Set `protocol: "legacy"` on a server that misbehaves. The [MCP servers docs](https://opencode.ai/docs/mcp-servers/), read on 24 Nov 2026, called `legacy` the default.
5. The `opencode` theme "now means the new theme". Set `opencode-classic` for the previous look.
6. `Cmd+Shift+S` (`Ctrl+Shift+S` on Windows and Linux) "now archives the open session".
7. v2.4.1: "Fixed assistant messages failing to save on macOS 12 because its system SQLite does not support the JSON operator used in v2.4.0."

Our view: on macOS 12, go straight to 2.4.1, and set `protocol` on any MCP server you depend on.

## How do you upgrade to OpenCode 2.4?

Use an install command from OpenCode's [README](https://github.com/anomalyco/opencode). On 24 Nov 2026 the [npm registry](https://registry.npmjs.org/@opencode/cli) gave 2.4.1 as the `latest` tag for `@opencode/cli`. For macOS and Linux, the README calls the Homebrew tap "recommended, always up to date":

```bash
npm i -g @opencode/cli@latest
curl -fsSL https://opencode.ai/v2/install | bash
brew install anomalyco/tap/opencode-v2
```

The browser needs the desktop app, which the README lists as "Desktop App (BETA)" at opencode.ai/download.

Still on 1.x? The [migration guide](https://opencode.ai/docs/migrate-v1/) says: "Remove a package-managed V1 installation before installing V2". On 24 Nov 2026 GitHub's [latest release](https://github.com/anomalyco/opencode/releases/latest) link still opened v1.19.6, so a script that follows it gets 1.x.

## Munder Difflin and OpenCode

[Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. Its [README](https://github.com/HarnessMD/munder-difflin), read on 24 Nov 2026, lists OpenCode under Engines and says: "Each agent picks its own, so one office can mix them." See [how to install and use Munder Difflin](/blog/how-to-install-and-use-munder-difflin/), or compare [OpenCode alternatives](/blog/opencode-alternatives/).

## What are the key OpenCode 2.4 facts at a glance?

Here they are, checked 24 Nov 2026 against the pages linked above.

| Item | Detail |
| --- | --- |
| Latest on npm | 2.4.1 |
| Published | v2.4.0 at 09:22 UTC, v2.4.1 at 15:57 UTC, 23 Nov 2026 |
| Browser | Desktop app, one saved profile |
| Automations off | `"automations": false` |
| Image tool | Now `generate_image` |
| GitHub latest link | Still v1.19.6 |

<link rel="stylesheet" href="/blog/assets/media/opencode-2-4/motion.css"><script defer src="/blog/assets/media/opencode-2-4/motion.js"></script>
