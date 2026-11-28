---
title: "Agent Tools Today, 13 Oct 2026: Muse Wonder, GLM-Legal, the Codex Daemon Issue"
seoTitle: "Agent Tools Today (13 Oct 2026): Launches, Skills, MCP Servers"
description: "The top launches, skills and plugins, multi agent moves, rising repos and arguments in coding agents on 13 Oct 2026, each with its source."
date: 2026-10-13
category: news
categoryLabel: News
type: Non-technical
series: agent-tools-today
primaryKeyword: "agent tools today 13 oct 2026"
secondaryKeywords: ["glm-legal", "agent37", "codex daemon issue", "skills hub 1.0.0", "qgis ai policy"]
tags: ["Daily Brief", "Claude Code", "Codex", "Skills", "Open Source"]
---

Agent tools today, 13 Oct 2026, in one line: Meta launched Muse Wonder and Muse Wonder Full, GLM-Legal arrived as a model for legal agents, and an issue about a background daemon in Codex CLI started the day's argument. Every number was checked on 13 Oct. The edition before this one on the site is [12 Oct](/blog/agent-tools-today-2026-10-12/).

[Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of coding agents such as Claude Code, Codex and Gemini CLI on your own computer. It shipped no release in the last 24 hours, so it is not in the lists below.

<figure class="mg" data-scene="today"><img src="/blog/assets/media/agent-tools-today-2026-10-13/today.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A yellow kite rises on a white background, its line running down to a reel. A tag tied to the kite reads Muse Wonder. Three paper bows tie onto its tail one after another, and a label appears beside each bow: 1M context, $4.00 input, $20.00 output."><figcaption>Meta's model page on 13 Oct 2026 lists Muse Wonder with a 1M context window at $4.00 input and $20.00 output per Mtok. The drawing shows the listing as bows on a kite's tail. Tap the kite for a gust of wind.</figcaption></figure>

## Top 3 launches

1. **Muse Wonder and Muse Wonder Full.** Meta announced the two models on 12 Oct, and its launch post calls them "our most capable models". Meta's [model page](https://dev.meta.ai/models/muse-wonder), read on 13 Oct, lists Muse Wonder at $4.00 input and $20.00 output per Mtok with a 1M context window. The model page prints no token price for Muse Wonder Full, which is "Included with a Muse Code subscription". More than 600 points on Hacker News on 13 Oct. Full page: [Muse Wonder](/blog/muse-wonder/). [Source](https://research.meta.ai/blog/muse-wonder)
2. **GLM-Legal.** The GLM-Legal launch post, dated 12 Oct, describes a model for legal work built on "the lightweight GLM-5.3-Flash foundation". The 12 Oct post reports "a 19.2% all-pass rate on Harvey LAB" and gives a link to apply for API access. More than 530 points on Hacker News on 13 Oct. [Source](https://z.ai/blog/glm-legal)
3. **Agent37.** Sandboxes for running AI agents, from a Launch HN post on 12 Oct. The post, read on 13 Oct, puts average customer spend at $0.37 a month per sandbox. The post says its gVisor sandboxes do not support Docker-in-Docker or Android emulators. More than 120 points on Hacker News on 13 Oct. Background: [agent security and sandboxing](/blog/agent-security-and-sandboxing/). [Source](https://news.ycombinator.com/item?id=50059096)

## Top 3 skills, MCP servers and plugins

1. **Skills Hub v1.0.0.** Released 11 Oct. A desktop app that syncs agent skills to your coding tools. The README says it "supports 48 AI coding tools, including Claude Code, Codex, Cursor, and OpenCode". MIT, 1,788 stars on 13 Oct. [Source](https://github.com/qufei1993/skills-hub)
2. **SolidCraft v0.7.0.** Released 13 Oct. Parametric 3D CAD in Rust. The README says you can "let AI agents model through the built-in MCP server". Created 7 Oct. Apache 2.0, more than 1,250 stars on 13 Oct. [Source](https://github.com/bherbruck/solidcraft)
3. **Pensieve.** v0.6.7 on 13 Oct. Local search on a Mac, with an MCP server. The README says agents "get the few most relevant files and passages instead of grepping your disk". Created 8 Oct. MIT, 59 stars on 13 Oct. [Source](https://github.com/TedHaley/pensieve)

## Top 4 moves from multi agent tools

1. **OpenHands.** v1.27.0 and v1.27.1, both on 12 Oct. The v1.27.0 notes add OpenCode and Pi as built-in ACP agents on local backends. MIT, 90,770 stars on 13 Oct. [Source](https://github.com/OpenHands/OpenHands/releases/tag/v1.27.0)
2. **Hermes Agent.** v0.21.7, published 12 Oct. The notes say "Updates now follow tagged releases" for source installs, in place of every commit on main. MIT, 253,253 stars on 13 Oct. See [what is Hermes Agent](/blog/what-is-hermes-agent/). [Source](https://github.com/NousResearch/hermes-agent/releases/tag/v0.21.7)
3. **OpenClaw.** v2026.10.2 on 12 Oct. API key routes for OpenAI and Anthropic now default to provider-native compaction. MIT, 391,825 stars on 13 Oct. See [Hermes Agent vs OpenClaw](/blog/hermes-agent-vs-openclaw/). [Source](https://github.com/openclaw/openclaw/releases/tag/v2026.10.2)
4. **Herdr GPUI.** v20261013.1 on 13 Oct. It can remove a worktree once its pull request is merged, and the sidebar shows Meta's mark for Muse Code agents. Apache 2.0, 1,182 stars on 13 Oct. See [Herdr alternatives](/blog/herdr-alternatives/). [Source](https://github.com/penso/herdr-gpui/releases/tag/v20261013.1)

## Top 3 rising repos

1. **Janas.** It runs mixture-of-experts models larger than your RAM by streaming the experts each token needs from an NVMe SSD. The README reports 24 tok/s without drafts from a 48 GB model on a laptop with 32 GB of memory, where llama.cpp manages 2.8. Created 20 Sep. GPL 3.0, more than 160 stars on 13 Oct. More than 110 points on Hacker News on 13 Oct. [Source](https://github.com/prabanta-dev/janas)
2. **Atticus.** v1.0 on 13 Oct. A voice assistant for the Mac. The README says it "runs on the Claude Pro or Max plan you already have, through Claude Code". Created 10 Oct. MIT, more than 110 stars on 13 Oct. More than 95 points on Hacker News on 13 Oct. [Source](https://github.com/SaarthurR/atticus-mac)
3. **Doory.** Not an agent tool. The repo description reads "Open source canva alternative". The README gives the licence as the Attribution Assurance License. Created 10 Oct. More than 900 stars on 13 Oct. More than 210 points on Hacker News on 13 Oct. [Source](https://github.com/shaongitbd/doory)

New repos can gain stars quickly for reasons other than use, so treat these as names to watch, not recommendations.

## Top 4 things people are arguing about

1. **A background daemon in Codex CLI.** A GitHub issue opened on 25 Sep reports that, since version 0.157.0, an interactive `codex` session starts a daemon that keeps running after every Codex window is closed. The issue title says "a persistent, self-updating background daemon shouldn't be the default". On 13 Oct the issue was open, and none of its 16 comments came from an account GitHub marks as a project member. More than 540 points and more than 270 comments on Hacker News on 13 Oct. See [Codex CLI vs Claude Code](/blog/codex-cli-vs-claude-code/). [Source](https://github.com/openai/codex/issues/48195)
2. **QGIS says no to AI code.** A pull request merged on 7 Oct rewrites the QGIS AI tool policy. The new policy text reads "No LLM, AI or agent assisted code contributions are allowed" in the main QGIS repository. More than 370 points and more than 400 comments on Hacker News on 13 Oct. [Source](https://github.com/qgis/QGIS-Enhancement-Proposals/pull/387)
3. **Is AI a tool?** Huahai's blog post, dated 12 Oct, answers an 11 Oct article by Rich Hickey titled "'AI' is Not a Tool". Huahai's post argues "A tool does not stop being a tool because it is difficult to control". More than 370 points on Hacker News on 13 Oct. [Source](https://yyhh.org/blog/2026/10/ai-is-a-tool/)
4. **Capabilities an audit cannot find.** An arXiv paper submitted on 9 Oct builds backdoors that "embed encrypted neural networks within host model weights" and run them only on a secret trigger. The abstract says the results "reveal a limit of elicitation-based capability audits". More than 180 points on Hacker News on 13 Oct. [Source](https://arxiv.org/abs/2610.13928)

## How this list is built

Each day our agents read GitHub releases and trending pages, the Hacker News front page, and the top posts on X and Reddit about coding agents. A name only makes a list with a link that was opened and a signal that can be shown: points, stars or a dated release. Repos are checked against the GitHub API before they appear, and a claim that exists only as a social post is left out. New here? Start with the [install guide](/blog/how-to-install-and-use-munder-difflin/).

<link rel="stylesheet" href="/blog/assets/media/agent-tools-today-2026-10-13/motion.css"><script defer src="/blog/assets/media/agent-tools-today-2026-10-13/motion.js"></script>
