---
title: "Agent Tools Today, 12 Nov 2026: AWS Emulator, Gemini Decisions API, Agents and a Maya Site"
seoTitle: "Agent Tools Today (12 Nov 2026): Launches, Skills, MCP Servers"
description: "The top launches, skills, multi agent moves, rising repos and talking points in AI agents from 11 to 12 Nov 2026, each with its source and date."
date: 2026-11-12
category: news
categoryLabel: News
type: Non-technical
series: agent-tools-today
primaryKeyword: "agent tools today 12 nov 2026"
secondaryKeywords: ["aws emulator", "gemini decisions api", "zellij 0.46 attention inbox", "orca 1.4.257", "codex 0.167.2", "pomerado mcp"]
tags: ["Daily Brief", "AWS", "Gemini", "MCP"]
---

Agent tools today, 12 Nov 2026, in one line: AWS released AWS Emulator, built by AI agents, Google launched the Gemini Decisions API, and a post about agents finding a Maya site drew 941 Hacker News points. It covers 11 Nov 04:00 UTC to 12 Nov 04:00 UTC, checked 12 Nov. Previous edition: [11 Nov](/blog/agent-tools-today-2026-11-11/).

<figure class="mg" data-scene="periscope"><img src="/blog/assets/media/agent-tools-today-2026-11-12/periscope.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a blue periscope rises from a lilac box and turns to face three round mint windows in turn. They read Emulator, Decisions and Maya. Each window brightens as the periscope faces it. Tapping a window turns the periscope to it and shows the date 11 Nov on it."><figcaption>The day's three lead items, from Amazon's and Google's 11 Nov posts and the Hacker News front page, read 12 Nov 2026.</figcaption></figure>

## Top 3 launches

1. **AWS Emulator.** Amazon's 11 Nov post says "Today, we released AWS Emulator, a local emulator of AWS services", and that it "was written entirely by autonomous agents". The docs say "You don't need an AWS account", list "An aws-emulator skill for AI coding agents", and warn "Don't use it to test security." CC0; 729 points on [Hacker News](https://news.ycombinator.com/item?id=50456631) by 12 Nov, posted 11 Nov at 18:21 UTC. [Source](https://www.aboutamazon.com/news/aws/how-autonomous-ai-agents-built-aws-emulator)
2. **Gemini Decisions API.** Google's 11 Nov post calls it "a new endpoint for fast, closed-set decisions powered by our new Gemini Decision 1 model". One request takes one input and "up to 1,000 independent questions". Price as of 11 Nov: "$0.10 per 1M input tokens and $0 for output tokens". Google says it is "nearly 5x cheaper" than Gemini 3.5 Flash-Lite on its benchmark suite: the vendor's own figures. 305 points on [Hacker News](https://news.ycombinator.com/item?id=50456791) by 12 Nov. Our page compares the [Gemini and OpenAI Decisions APIs](/blog/gemini-decisions-api-vs-openai-decisions-api/). [Source](https://blog.google/innovation-and-ai/technology/developers-tools/gemini-decisions-api/)
3. **Zellij 0.46.** Published 11 Nov at 09:43 UTC. It adds a built in terminal, run with `zellij terminal`, and an Attention Inbox that lets you "see at a glance which pane, in which tab, in which session needs them". The post ties it to coding agents, since terminals now run "background tasks that require occasional attention". 29 points on [Hacker News](https://news.ycombinator.com/item?id=50452313) by 12 Nov. See [tmux and scripts vs an agent harness](/blog/tmux-and-scripts-vs-an-agent-harness/). [Source](https://zellij.dev/news/terminal-inbox-session-previews/)

## Top 3 skills, MCP servers and plugins

1. **Pomerado.** A Launch HN from a YC F26 company, posted 11 Nov at 17:11 UTC. The founders write that you describe a site's workflow and "receive a MCP in less than an hour"; later calls use that MCP and usually return in 5 to 30 seconds, they say. 51 points and 40 comments by 12 Nov. New to MCP? See [what an MCP server is](/blog/what-is-an-mcp-server/). [Source](https://news.ycombinator.com/item?id=50455811)
2. **Klad.** "Give your agent real brushes." The README says you paint with a pen while the agent paints "through the `klad` command line" on the same drawing. It is source available, not open source, and free for companies under 500,000 euros a year in revenue. Show HN, 74 points by 12 Nov; 130 stars. [Source](https://github.com/klad-app/klad)
3. **Project OS for Claude Code and Codex.** "Project management for Claude Code and Codex with shared task files, developer and QA roles, and human approvals." Created 11 Nov at 11:15 UTC; MIT, 61 stars by 12 Nov. See [Claude Code skills](/blog/claude-code-skills/). [Source](https://github.com/ferhatcore/claude-codex-project-os)

## Top 5 moves from multi agent tools

1. **Orca 1.4.257.** Published 12 Nov at 01:20 UTC. "Unsent text annotations survive restarts", and agents running on the desktop "can read those notes with `orca tab annotations`". Pastes into a starting terminal "now wait for the shell, rather than being dropped". [Source](https://github.com/stablyai/orca/releases/tag/v1.4.257)
2. **Codex 0.167.2.** Published 11 Nov at 22:44 UTC. "Codex now sends tool updates incrementally by default on Google Cloud Vertex AI", with `incremental_tools_legacy_gcp = false` to opt out. See [Codex alternatives](/blog/codex-alternatives/). [Source](https://github.com/openai/codex/releases/tag/rust-v0.167.2)
3. **OpenClaw `v2026.11.5-beta.2`.** A beta, published 12 Nov at 00:43 UTC. "Large conversations remain browsable with paged history in both directions", and Gemini Flash moves to the Interactions API on Google's official endpoint. [Source](https://github.com/openclaw/openclaw/releases/tag/v2026.11.5-beta.2)
4. **Orchestrator.inc 0.14.11.** A nightly, built 11 Nov at 18:39 UTC. It can "Tell agents the user's local time zone" and "Start New task in the project last worked in". [Source](https://github.com/OrchestratorInc/agent-orchestrator/releases/tag/v0.14.11-nightly.202611111839)
5. **Capy with Morph Ultra.** Capy's 11 Nov post: "Morph Ultra now works in Capy." Morph Ultra is "unlimited Kimi K3.1 and DeepSeek V4.1 Flash for $200 a month" as of 11 Nov, and Capy "charges no credits for the tokens your Morph key serves". [Source](https://capy.ai/blog/morph-ultra)

## Top 2 rising repos

1. **Yogurt.** "Private AI meeting notes. Free and open source." The README says it "records your calls without adding a bot to the meeting". Its Show HN, posted 11 Nov at 15:33 UTC, had 190 points by 12 Nov. MIT, 472 stars, created 10 Nov. [Source](https://github.com/FrigadeHQ/yogurt)
2. **Claude Usage Widget for Windows Taskbar.** It shows your Claude five hour and weekly usage next to the Windows 11 clock, from "One small file (~450 KB)". Created 11 Nov at 10:00 UTC; MIT, 29 stars by 12 Nov. See [Claude Code Max plan tips](/blog/claude-code-max-plan-tips/). [Source](https://github.com/AbdoSarmini/claude-usage-widget-for-windows-taskbar)

Stars can rise for reasons other than use: names to watch, not picks.

## Top 3 things people are talking about

1. **Can agents find a lost Maya site?** Yes, though not a new one. Pietro Miotti's post says 48 agents went through about 1,200 km² of lidar images "like very patient archaeologists" and flagged a site missing from Mexico's official register. His 11 Nov update says "the site had already been mapped in Estrada-Belli et al. 2025", so the title now reads "(Re)discovered". 941 points on [Hacker News](https://news.ycombinator.com/item?id=50452455) by 12 Nov. [Source](https://pietromiotti.com/latest/maya-site)
2. **Can your agent book a United flight?** No. CBS News reports United "is banning artificial intelligence agents from making flight reservations on behalf of travelers, citing security risks". Pomerado's founders say their own agents failed at flight checkout; United has now shut that door from its side. 438 points and 424 comments on [Hacker News](https://news.ycombinator.com/item?id=50458900) by 12 Nov. [Source](https://www.cbsnews.com/news/united-airlines-bans-ai-agents-booking-flights/)
3. **Can you resume a Claude Code session in Codex?** Atuin says yes. Its post, dated 27 Oct, says "Starting with Atuin 18.24, you can search your agent sessions across machines, resume them anywhere". 194 points on [Hacker News](https://news.ycombinator.com/item?id=50453637) by 12 Nov, posted 11 Nov at 14:10 UTC. Talk, not a new launch. [Source](https://blog.atuin.sh/threads-agent-sessions/)

## How this list is built

We read our scouts' reports from Google, Reddit, Hacker News and X and checked every item again on its own page, plus tracked tools' GitHub releases, the Hacker News top 30 and GitHub trending. A name only makes a list with an opened link and a signal: points, stars or a dated release. Claude Code, Gemini CLI, Goose, Pi, Qwen Code, Paperclip, AionUi and Cline shipped no stable release in the window. T3 Code, Crush and Copilot CLI shipped only previews or nightlies. OpenCode's only release was its `process-daemon-v0.5.2` package, and LiteLLM v1.109.1 backports one security fix. Repos created on 11 Nov with one star or none were left out.

<link rel="stylesheet" href="/blog/assets/media/agent-tools-today-2026-11-12/motion.css"><script defer src="/blog/assets/media/agent-tools-today-2026-11-12/motion.js"></script>
