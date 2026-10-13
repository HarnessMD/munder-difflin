---
title: "Hermes Agent vs OpenClaw: which self-hosted AI assistant to pick"
seoTitle: "Hermes Agent vs OpenClaw: Memory, Channels, Install (Oct 2026)"
description: "Hermes Agent vs OpenClaw, checked 7 Oct 2026: licence, latest release, install, channels, models, memory, skills, security notes and who should pick which."
date: 2026-10-07
category: comparisons
categoryLabel: Comparisons
type: Non-technical
primaryKeyword: "hermes agent vs openclaw"
secondaryKeywords: ["openclaw vs hermes", "hermes vs openclaw", "is hermes agent better than openclaw", "hermes agent or openclaw", "openclaw vs hermes agent memory"]
tags: ["Comparisons", "Open Source", "CLI Agents"]
faq:
  - q: "Is Hermes Agent better than OpenClaw?"
    a: "Not across the board. We think Hermes Agent is the better pick if you want a small, capped memory or serverless backends. OpenClaw is the larger project: the GitHub API showed 391,524 stars against 251,736 on 7 Oct 2026, and its README lists native apps for macOS, iOS, Android, Windows and Linux."
  - q: "What is the difference between Hermes Agent and OpenClaw memory?"
    a: "Hermes Agent keeps two small files, `MEMORY.md` (2,200 characters) and `USER.md` (1,375 characters), and searches past sessions in a SQLite database. OpenClaw writes Markdown files in its workspace, including `MEMORY.md` and dated daily notes, and a background process it calls dreaming promotes items into long-term memory. Both descriptions come from each project's docs on 7 Oct 2026."
  - q: "Are Hermes Agent and OpenClaw free?"
    a: "Yes. The GitHub API listed both as MIT licensed on 7 Oct 2026, and OpenClaw's README says it has no paid tier, hosted service, or token. You pay for the model you connect, unless you run a local one."
  - q: "Can I move from OpenClaw to Hermes Agent?"
    a: "Yes. The Hermes docs say `hermes claw migrate` imports your persona file, memory file, skills, command allowlist and messaging settings. Add `--dry-run` to preview. API keys, Telegram's bot token included, need `--migrate-secrets`."
  - q: "Who makes Hermes Agent and OpenClaw?"
    a: "Hermes Agent is built by Nous Research. OpenClaw's README says it is stewarded by the OpenClaw Foundation, an independent 501(c)(3)."
---

Our view: pick OpenClaw if you want the larger project with native apps, and Hermes Agent if you want a small, capped memory and a tool that can import an OpenClaw setup. Both are free, MIT licensed AI assistants you host yourself. Checked 7 Oct 2026.

This sits in our [Comparisons hub](/blog/topics/comparisons/). For each tool alone, read [what is Hermes Agent](/blog/what-is-hermes-agent/) and [OpenClaw alternatives](/blog/openclaw-alternatives/).

## What are Hermes Agent and OpenClaw?

Both are open source AI assistants that you run yourself and message from your chat apps. The [Hermes Agent README](https://github.com/NousResearch/hermes-agent) calls it "the self-improving AI agent built by Nous Research". The [OpenClaw README](https://github.com/openclaw/openclaw) says OpenClaw is "stewarded by the OpenClaw Foundation, an independent 501(c)(3), and has no paid tier, hosted service, or token".

The GitHub API listed both under the MIT licence on 7 Oct 2026. On the same day it showed 391,524 stars for OpenClaw and 251,736 for Hermes Agent.

<figure class="mg" data-scene="jugs"><img src="/blog/assets/media/hermes-agent-vs-openclaw/jugs.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. Two measuring jugs fill at the same speed. The Hermes Agent jug stops at 251,736 stars and the OpenClaw jug keeps filling to 391,524 stars. A dotted line marks the gap between the two levels, and each jug carries an MIT label."><figcaption>OpenClaw is the larger project by stars. Both are MIT. GitHub API, 7 Oct 2026.</figcaption></figure>

## What is the latest release of each?

Hermes Agent's latest release is v0.21.5 (tag v2026.9.24), published 24 Sep 2026, and OpenClaw's is 2026.9.8, published 3 Oct 2026. We read both from the GitHub API (`gh api repos/NousResearch/hermes-agent/releases/latest` and the same call for `openclaw/openclaw`) on 7 Oct 2026, dates in UTC.

OpenClaw also had a prerelease, v2026.10.1-beta.1, from 5 Oct 2026. None of the six newest Hermes Agent releases was marked a prerelease.

## Hermes Agent vs OpenClaw at a glance, checked 7 Oct 2026

These rows are our selection, from each project's README, docs and the GitHub API on 7 Oct 2026.

| | Hermes Agent | OpenClaw |
| --- | --- | --- |
| Maker | Nous Research | OpenClaw Foundation |
| Licence | MIT | MIT |
| Latest release | v0.21.5, 24 Sep 2026 | 2026.9.8, 3 Oct 2026 |
| Prerelease | None in the six newest | v2026.10.1-beta.1, 5 Oct 2026 |
| GitHub stars | 251,736 | 391,524 |
| Needs | The install script | Node 24.16+ or 26.1+ |
| Memory | Two capped files, plus session search | Markdown files in the workspace |
| Skills | Written by the agent, or from a hub | Self-learning, or ClawHub |
| Price | Free. You pay for the model. | Free. You pay for the model. |

## How do you install each, and where does it run?

Each installs with one script. These come from the two READMEs:

```
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

Both also publish a PowerShell installer for Windows. The Hermes README lists Linux, macOS, WSL2, native Windows and Android through Termux, and seven terminal backends: local, Docker, SSH, Singularity, Modal, Daytona and Vercel Sandbox.

[OpenClaw's install page](https://docs.openclaw.ai/install) asks for Node 24.16+ or 26.1+ and lists macOS, Linux and Windows (native or WSL2). After that, `openclaw onboard --install-daemon` sets it up. Its README also lists native apps for macOS, iOS, Android, Windows and Linux.

## Which chat apps does each connect to?

Both connect to Telegram, Discord, Slack, WhatsApp, Signal and Microsoft Teams, going by their docs. OpenClaw's README names "Discord, iMessage, Slack, Teams, Telegram, WhatsApp, and 20+ more". Its [channels page](https://docs.openclaw.ai/channels) says to start with Telegram, because it "needs a bot token and no plugin install".

The Hermes [messaging page](https://hermes-agent.nousresearch.com/docs/user-guide/messaging) adds SMS, email, Matrix, Mattermost, LINE and iMessage through BlueBubbles, among others. One command, `hermes gateway`, runs them.

<figure class="mg" data-scene="cubbies"><img src="/blog/assets/media/hermes-agent-vs-openclaw/cubbies.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. Two racks of pigeonholes stand side by side, one headed Hermes Agent and one headed OpenClaw. Letters drop into matching cubbies in both racks one at a time, labelled Telegram, Discord, Slack, WhatsApp, Signal and Teams, and each cubby gets a tick. Tapping a cubby highlights that app in both racks."><figcaption>Six chat apps both projects' docs name. Checked 7 Oct 2026.</figcaption></figure>

## Which models does each support?

Both take hosted and local models, and you bring the key. The Hermes README lists "Nous Portal, OpenRouter, OpenAI, your own endpoint, and many others", switched with `hermes model`.

[OpenClaw's models page](https://docs.openclaw.ai/concepts/models) mentions OpenAI, Anthropic, OpenRouter, Ollama and LM Studio, among others, set with `openclaw models set <provider/model>`. Its advice: "Set your primary to the strongest latest-generation model available to you."

## How do memory and skills differ?

Both can write their own skills, going by their docs. The memory differs: Hermes Agent caps its memory files, while OpenClaw keeps a growing set of Markdown files.

The [Hermes memory docs](https://hermes-agent.nousresearch.com/docs/user-guide/features/memory) describe two files in `~/.hermes/memories/`: `MEMORY.md` at 2,200 characters and `USER.md` at 1,375. Past sessions sit in SQLite with full-text search. The [skills docs](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills) say the agent creates, patches and deletes skills in `~/.hermes/skills/` itself.

[OpenClaw's memory docs](https://docs.openclaw.ai/concepts/memory) describe plain Markdown in `~/.openclaw/workspace`: `MEMORY.md` for long-term facts, `memory/YYYY-MM-DD.md` for daily notes, and `DREAMS.md`. A default background process called dreaming promotes qualified items into `MEMORY.md`. Yes, your assistant keeps a dream diary. With an embedding provider configured, search mixes vector and keyword matching.

<figure class="mg" data-scene="drawers"><img src="/blog/assets/media/hermes-agent-vs-openclaw/drawers.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On the left, under Hermes Agent, two short drawers slide out of a chest, one for the memory file, 2,200 characters, and one for the user file, 1,375 characters. Each fills with cards and is marked full, and one extra card bounces off. On the right, under OpenClaw, a shelf marked daily notes gains one dated folder after another, and a card floats up into a binder marked long-term memory. An add a day button puts one more folder on the shelf."><figcaption>Hermes Agent caps two files. OpenClaw adds dated notes. Each project's memory docs, 7 Oct 2026.</figcaption></figure>

[OpenClaw skills](https://docs.openclaw.ai/tools/skills) are folders with a `SKILL.md` file. `openclaw skills install @owner/<slug>` pulls one from ClawHub, its public registry. Its [self-learning docs](https://docs.openclaw.ai/tools/self-learning) say it "turns corrections and successful work into reusable skills", and that the default mode is `auto`.

## What do their docs say about security?

Both docs describe a pairing code for unknown senders, and each lists its own controls. We did not test either tool, so this is each project's own wording.

The [Hermes security page](https://hermes-agent.nousresearch.com/docs/user-guide/security) lists eight layers, including dangerous command approval and container isolation. The default approval mode is `smart`, which uses a second model to judge risk. Hub skills go through a security scanner.

OpenClaw's README says "Tools run on the host for the main session unless you configure sandboxing" and "Treat inbound messages as untrusted input". Its [security page](https://docs.openclaw.ai/gateway/security) offers `openclaw security audit`. The skills docs say: "Treat third-party skills as untrusted code."

## What do they cost?

Both are free software, and you pay for the model you connect. The Hermes README offers Nous Portal as an optional subscription that covers the model and hosted tools.

Our view: both are general assistants, not tools for coding work. For that there is [Munder Difflin](https://harnessmd.com/download), free and open source: a desktop app that runs a team of coding agents such as Claude Code, Codex and Gemini CLI on your own computer. It fits coding work, not chat app errands. See [how to install and use Munder Difflin](/blog/how-to-install-and-use-munder-difflin/).

## Who should pick which?

Pick by what you want the assistant to become over time.

<figure class="mg" data-scene="doors"><img src="/blog/assets/media/hermes-agent-vs-openclaw/doors.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. Two doors stand side by side. The Hermes Agent door swings open on capped memory and serverless backends. The OpenClaw door swings open on the larger project, native apps and ClawHub. A paper plane marked hermes claw migrate flies from the OpenClaw door to the Hermes Agent door."><figcaption>Two doors, one hallway. The Hermes docs describe an import from OpenClaw, 7 Oct 2026.</figcaption></figure>

- **Hermes Agent** if you want a tight, capped memory or serverless backends.
- **OpenClaw** if you want the larger project, native apps, or ClawHub.
- **Undecided:** we think starting on OpenClaw is low risk. The [Hermes migration guide](https://hermes-agent.nousresearch.com/docs/guides/migrate-from-openclaw) says `hermes claw migrate` imports your persona, memory, skills, allowlist and messaging settings, and `--dry-run` previews it. API keys need `--migrate-secrets`.

The wider field is in [open source AI agents](/blog/open-source-ai-agents/), and hosted options are in [ChatGPT dots alternatives](/blog/chatgpt-dots-alternatives/).

<link rel="stylesheet" href="/blog/assets/media/hermes-agent-vs-openclaw/motion.css"><script defer src="/blog/assets/media/hermes-agent-vs-openclaw/motion.js"></script>
