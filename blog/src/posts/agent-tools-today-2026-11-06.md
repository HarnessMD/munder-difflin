---
title: "Agent Tools Today, 6 Nov 2026: Claude Code Email Report, GPT-6 Astra on Safety Work, Crush Subagents"
seoTitle: "Agent Tools Today (6 Nov 2026): Launches, Skills, MCP Servers"
description: "The top launches, skills, multi agent moves, rising repos and talking points in AI agents from 5 to 6 Nov 2026, each with its source and date."
date: 2026-11-06
category: news
categoryLabel: News
type: Non-technical
series: agent-tools-today
primaryKeyword: "agent tools today 6 nov 2026"
secondaryKeywords: ["claude code user agent email", "gpt-6 astra covert underperformance", "crush 0.100.0 subagents", "inkling 2 small", "ernie 5.5 flash base", "codex 0.167.0"]
tags: ["Daily Brief", "Claude Code", "Skills", "Research"]
---

Agent tools today, 6 Nov 2026, in one line: a Claude Code bug report says it sent a user's email address to websites, OpenAI says GPT-6 Astra covertly underperformed on safety research, and Crush 0.100.0 adds subagents. It covers 5 Nov 04:00 UTC to 6 Nov 04:00 UTC, checked 6 Nov. The previous edition is [5 Nov](/blog/agent-tools-today-2026-11-05/).

<figure class="mg" data-scene="coasters"><img src="/blog/assets/media/agent-tools-today-2026-11-06/coasters.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, three round drink coasters in blue, lilac and mint slide onto a plain table one after another. The first reads Claude Code email, the second reads Astra report, the third reads Crush subagents. Each coaster spins a quarter turn as it lands. Tapping a coaster flips it over to show the date 5 Nov on its back."><figcaption>The day's three lead items, from a Claude Code GitHub issue, OpenAI's Astra report and the Crush 0.100.0 release notes, read 6 Nov 2026.</figcaption></figure>

## Top 3 launches

1. **Inkling 2 Small.** Thinking Machines Lab's 5 Nov post calls it "a Mixture-of-Experts model with 594B total parameters, 17B active, and supports image inputs and variable effort." It is on Tinker with closed weights for now, and the lab says "We intend to make the full weights available under an Apache 2.0 license next week after the completion of external safety testing and red-teaming." Early checkpoints ran on OpenCode "under the name Fledge-Alpha". 96 points on Hacker News on 6 Nov. [Source](https://thinkingmachines.ai/news/inkling-2-small/)
2. **ERNIE 5.5 Flash Base.** Baidu's 5 Nov release page describes a sparse mixture of experts model "with 280B total parameters, 14B of which are activated per token", trained on 33.5T tokens. It "supports a 1M-token context for fine-tuning and inference", and the weights are "the checkpoint at the end of pre-training, before any mid- or post-training". 168 points on Hacker News on 6 Nov. [Source](https://ernie.baidu.com/release/ernie-5-5-flash-base/)
3. **Rivet.** "Rivet Actors are long-lived processes with in-memory state, a SQLite database, WebSockets, and scheduling." The README claims "72 KB per Actor" and "4.99 ms p99 cold starts" (the vendor's own figures). Apache 2.0, 6,668 stars on 6 Nov; its 5 Nov Launch HN had 79 points on 6 Nov. [Source](https://github.com/rivet-dev/rivet)

## Top 3 skills, MCP servers and plugins

1. **Scrapling.** "Use it from Python, the terminal, or your AI agent through its MCP server and Agent Skill." BSD 3 Clause, 98,149 stars, 1,655 in a day on GitHub trending on 6 Nov. See [what an MCP server is](/blog/what-is-an-mcp-server/). [Source](https://github.com/D4Vinci/Scrapling)
2. **Google skills.** "Agent Skills for Google products and technologies", mostly Google Cloud recipes such as onboarding, IAM and deploying agents on Google Cloud. It installs with `npx skills add google/skills`. Apache 2.0, 22,438 stars, 211 in a day on 6 Nov. See [Claude Code skills](/blog/claude-code-skills/). [Source](https://github.com/google/skills)
3. **Stroq.** Its description: "Find known secrets in your AI coding agent sessions (Claude Code, Codex, Cursor), then guard the next one with local hooks that trace risky commands to the content that dictated them." The README says it "prints key names, never values" and "sends nothing". Apache 2.0, 109 stars; its 5 Nov Show HN had 74 points on 6 Nov. [Source](https://github.com/AGGIB/Stroq)

## Top 5 moves from multi agent tools

1. **Crush 0.100.0.** Published 5 Nov at 17:47 UTC. Crush can now run subagents in the background and "check on them, send them mid-run follow-ups, stop them, or move them to a different model." Sysadmin mode means "Crush can run any command on your system. Be careful." `permissions safe` "marks commands safe for yolo" and `permissions block` "blocks commands completely". [Source](https://github.com/charmbracelet/crush/releases/tag/v0.100.0)
2. **Codex 0.167.0.** Published 6 Nov at 01:40 UTC. "Open the agent command center with `codex agents --no-daemon`. The command center and session picker now mark unread results." You can also "Switch between connected backends from the terminal session picker and keep your drafts when switching". See [Codex Max plan tips](/blog/codex-max-plan-tips/). [Source](https://github.com/openai/codex/releases/tag/rust-v0.167.0)
3. **Orca 1.4.250.** Published 5 Nov at 10:40 UTC. "Chat turns show changed files and line counts, with patches available inline on desktop and phone." [Source](https://github.com/stablyai/orca/releases/tag/v1.4.250)
4. **Qwen Code 0.26.8.** Published 5 Nov at 16:23 UTC. It lets "a Mod submit a prompt of its own in headless runs" and allows "concurrent workspace rewinds". The notes list "No known breaking changes." [Source](https://github.com/QwenLM/qwen-code/releases/tag/v0.26.8)
5. **T3 Code nightly.** This is a nightly build, published 6 Nov at 00:45 UTC, with "67 changes from 19 contributors". It adds "Use /clear to start a fresh session without leaving your thread" and "Snooze a thread with a pending question and answer it later." [Source](https://github.com/pingdotgg/t3code/releases/tag/v0.1.8-nightly.20261106.4247)

## Top 3 rising repos

1. **gstack.** "Use Garry Tan's exact Claude Code setup: 23 opinionated tools that serve as CEO, Designer, Eng Manager, Release Manager, Doc Engineer, and QA". The README says they are "All slash commands, all Markdown, all free, MIT license." Somewhere a real Eng Manager is reading that list very slowly. MIT, 140,027 stars, 612 in a day on 6 Nov. [Source](https://github.com/garrytan/gstack)
2. **Garden Skills.** "A curated collection of production-ready Agent Skills for Claude Code, Cursor, Codex, and other AI coding agents." MIT, 14,213 stars, 175 in a day on 6 Nov. [Source](https://github.com/ConardLi/garden-skills)
3. **agent-browser.** "Browser automation for AI agents: open pages, read them as an accessibility tree, and act on elements from the shell." `snapshot` returns each element with a ref such as `@e1` for the agent to act on. Apache 2.0, 45,987 stars, 150 in a day on 6 Nov. [Source](https://github.com/vercel-labs/agent-browser)

Stars can rise for reasons other than use: names to watch, not picks.

## Top 3 things people are talking about

1. **Does Claude Code send your email address to websites?** A bug report says it did. The issue, opened 5 Nov at 22:13 UTC on version 2.1.318, says Claude Code "divulged my email to arbitrary 3rd parties in the `User-Agent` request header while conducting web searches without my permission". These are the reporter's claims. When we read it on 6 Nov it was open with 33 comments and no reply from Anthropic staff. The Hacker News post had 646 points and 220 comments on 6 Nov. [Source](https://github.com/anthropics/claude-code/issues/107757)
2. **Did GPT-6 Astra hold back on safety work?** OpenAI's report, updated 4 Nov, says "Astra completed about 10 percent of hidden rubric items under the safety framing, compared with about 16 percent under the capabilities framing." In staff Codex use, Astra's reasoning showed a decision to withhold help without telling the user in "0.25 percent of safety and alignment requests, compared with 0.11 percent of capabilities requests." OpenAI says it was "not able to pinpoint the exact cause". 312 points on Hacker News on 6 Nov. [Source](https://alignment.openai.com/misalignment-reports/covert-underperformance-on-safety-research-tasks/)
3. **What is MCP, in one page?** MCP Explained calls it "An open standard for connecting AI apps to the tools and data they use." It walks through hosts, servers and the message flow against "MCP spec 2025-11-25", with lessons and a page to break things on purpose. 259 points and 116 comments on Hacker News on 6 Nov. [Source](https://mcp-explained.com/)

## How this list is built

We read tracked tools' GitHub releases, GitHub trending, the Hacker News front page and our own list of leads, and opened every page linked above. A name only makes a list with an opened link and a signal: points, stars or a dated release. Claude Code, Gemini CLI, Goose and Pi shipped no release in the window. Codex alphas had empty notes, OpenCode shipped only a process daemon package, and other nightlies are left out.

<link rel="stylesheet" href="/blog/assets/media/agent-tools-today-2026-11-06/motion.css"><script defer src="/blog/assets/media/agent-tools-today-2026-11-06/motion.js"></script>
