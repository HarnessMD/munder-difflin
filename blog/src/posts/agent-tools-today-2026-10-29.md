---
title: "Agent Tools Today, 29 Oct 2026: Gemini 4 Carbon, Copilot Connectors, OpenCode Goals"
seoTitle: "Agent Tools Today (29 Oct 2026): Launches, Skills, MCP Servers"
description: "The top launches, skills, multi agent moves, rising repos and arguments in AI agents from 28 to 29 Oct 2026, each with its source and date."
date: 2026-10-29
category: news
categoryLabel: News
type: Non-technical
series: agent-tools-today
primaryKeyword: "agent tools today 29 oct 2026"
secondaryKeywords: ["gemini 4 carbon", "copilot connectors", "copilot automations", "opencode 2.2.1", "impeccable design skill", "goose 1.57.0"]
tags: ["Daily Brief", "Claude Code", "Skills", "Open Source"]
---

Agent tools today, 29 Oct 2026, in one line: Google announced Gemini 4 Carbon for a first group of cyber defenders, GitHub put verified MCP servers into Copilot, and OpenCode 2.2.1 added a `/goal` command that keeps a session going until a reviewer agrees. It covers 28 to 29 Oct, checked 29 Oct. An earlier edition is [26 Oct](/blog/agent-tools-today-2026-10-26/).

[Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. It is not ranked in the lists below.

<figure class="mg" data-scene="today"><img src="/blog/assets/media/agent-tools-today-2026-10-29/today.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, three cards are pinned to a cork board one at a time. The first reads Gemini 4 Carbon with a tag Early access, the second Copilot connectors with a tag 26 services, and the third OpenCode 2.2.1 with a tag Goal mode. Tapping a card lifts it off the board or pins it back."><figcaption>The day's three lead items, from Google's launch post, GitHub's changelog and OpenCode's release notes, read 29 Oct 2026.</figcaption></figure>

## Top 3 launches

1. **Gemini 4 Carbon.** Google announced it on 28 Oct as "our strongest model with state-of-the-art cybersecurity and long horizon capabilities". It goes first to a subset of cyber defenders, then to trusted partners through the Fairwind Program, and to developers later. Google's post of 28 Oct 2026 gives an introductory price of $2 input and $10 output per million tokens. More than 860 points on Hacker News on 29 Oct. Details in [Gemini 4 Carbon](/blog/gemini-4-carbon/). [Source](https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-carbon/)
2. **Copilot connectors.** On 28 Oct GitHub started rolling out GitHub verified MCP servers, which it calls connectors, in public preview on all Copilot plans. You sign in to a service once and it works across the Copilot app, Copilot CLI, VS Code, Copilot in the cloud and GitHub Mobile. 26 services at launch, among them Slack, Figma, Notion, Sentry and Linear. Business and Enterprise need an admin to switch on a preview policy. [Source](https://github.blog/changelog/2026-10-28-connect-your-tools-to-copilot-without-all-the-setup)
3. **Shared Copilot Automations.** Also on 28 Oct, automations that combine prompts, triggers and tools can now belong to a repository instead of one person. Everyone with read access sees them, AI credits bill to the repository owner, and actions show as Copilot. Rolling out on Copilot Pro, Pro+, Max, Business and Enterprise. The same day, Agent Merge came to pull requests on GitHub, fixing failing workflows and merge conflicts in the cloud on paid plans ([Agent Merge](https://github.blog/changelog/2026-10-28-agent-merge-watches-and-fixes-pull-requests-in-the-cloud)). [Source](https://github.blog/changelog/2026-10-28-build-shared-workflows-for-your-team-with-copilot-automations)

## Top 3 skills, MCP servers and plugins

1. **Impeccable.** A design skill whose README calls it "The design vocabulary for your coding agent", with commands such as `polish`, `bolder`, `critique` and `audit`. It lists Claude Code, Cursor, Codex CLI, GitHub Copilot, Gemini CLI, OpenCode and more. Apache 2.0, more than 93,000 stars, and 1,472 stars in a day on GitHub trending on 29 Oct. [Source](https://github.com/pbakaus/impeccable)
2. **Superpowers.** A software development method for coding agents built from composable skills, with install steps for Claude Code, Antigravity, the Codex app and CLI, Cursor, Devin CLI and others. MIT, more than 307,000 stars, and 1,095 stars in a day on GitHub trending on 29 Oct. [Source](https://github.com/obra/superpowers)
3. **Expo skills.** Official skills from the Expo team for building, deploying, upgrading and debugging Expo apps. Claude Code and Codex install it as a plugin; Cursor, OpenCode, Copilot, Gemini, Cline and others use the skills CLI. MIT, more than 3,600 stars, on GitHub trending on 29 Oct. [Source](https://github.com/expo/skills)

## Top 3 moves from multi agent tools

1. **OpenCode 2.2.1.** Published 29 Oct. `/goal <objective>` lets a session keep working until a reviewer confirms the goal is met, with pause and resume. Opt in scheduled prompts arrive through `/schedule`, and an experimental `image_generate` tool lets agents make or edit images. It drops the fal, Black Forest Labs, Replicate and Stability providers from the `@opencode/ai` package, a breaking change for code that imports them. See [OpenCode alternatives](/blog/opencode-alternatives/). [Source](https://github.com/anomalyco/opencode/releases/tag/v2.2.1)
2. **Goose 1.57.0.** Published 28 Oct. Its allowlist now requires HTTPS and validates redirects, callers can supply their own session IDs, scheduled runs use recipe settings, and Claude models are asked for summarized thinking. [Source](https://github.com/aaif-goose/goose/releases/tag/v1.57.0)
3. **Qwen Code 0.26.3.** Published 28 Oct. A persistent Workflow mode can be switched on from the CLI, the SDK or ACP, generated UI cards appear only for clients that can render MCP Apps, and tool results shrink to fit before auto compaction. [Source](https://github.com/QwenLM/qwen-code/releases/tag/v0.26.3)

## Top 3 rising repos

1. **Macro.** A workspace that puts email, messages, docs, tasks, agents and a CRM in one interface with shared team memory, built in SolidJS and Rust. AGPL 3.0, more than 5,500 stars, on GitHub trending on 29 Oct. [Source](https://github.com/macro-inc/macro)
2. **BAMA.** "Build Any Mac App": 21 agent skills that take a native macOS app in Swift and SwiftUI from idea to the Dock, as a Claude Code or Codex plugin. MIT, created 24 Oct, more than 620 stars on 29 Oct. [Source](https://github.com/daveebbelaar/bama)
3. **vvv.** Editable Remotion video templates that a coding agent picks, fills and renders from one sentence, installed as a Claude Code plugin, through the skills CLI or as an MCP server. MIT, created 22 Oct, more than 430 stars on 29 Oct. [Source](https://github.com/actionow-ai/vvv)

Stars can rise for reasons other than use: names to watch, not picks.

## Top 3 things people are arguing about

1. **Is Claude Code's status line worth its tokens?** A gist Flamerix AI published on 26 Oct says background agents send their whole transcript to the model about every 30 seconds to write a 3 to 5 word status, and that in its own measurement this was 16.4% of Claude Code's estimated spend. It offers a preload script to turn it off. An open issue on the Claude Code repo, filed 15 Aug, asks for a supported switch. More than 180 points on Hacker News on 29 Oct. [Source](https://gist.github.com/flamerix-ai/c3905705cc4205e5de3011fa2e74efce)
2. **Can agents do a tax professional's job?** Surge AI's DAYJOB: Tax benchmark, published 27 Oct, gives agents 50 assignments across 1,789 files and passes an attempt only when it meets 95% of the criteria. Claude Sonnet 5.5 leads at a 10.8% pass rate, then Claude Fable 5.1 at 9.6% and Claude Opus 5.5 at 9.2%. More than 220 points on Hacker News on 29 Oct. [Source](https://surgehq.ai/blog/dayjob-tax)
3. **What do you still need to know when agents write the code?** In a post of 27 Oct, an engineer describes CI failing on a file Codex had kept working on happily, with whole components on single lines, and asks how much a person must still understand of code they did not write. More than 190 points and 100 comments on Hacker News on 29 Oct. [Source](https://blog.adrq.dev/here-be-monsters-what-do-you-still-need-to-know-when-agents-do-the-work)

## How this list is built

For this edition, covering 28 to 29 Oct, we read the GitHub releases of 21 tracked tools, vendor blogs and changelogs, GitHub trending, and the Hacker News front page. We did not read X or Reddit for it. A name only makes a list with a link that was opened and a signal that can be shown: points, stars or a dated release. Repos are checked against the GitHub API before they appear. New here? Start with the [install guide](/blog/how-to-install-and-use-munder-difflin/).

<link rel="stylesheet" href="/blog/assets/media/agent-tools-today-2026-10-29/motion.css"><script defer src="/blog/assets/media/agent-tools-today-2026-10-29/motion.js"></script>
