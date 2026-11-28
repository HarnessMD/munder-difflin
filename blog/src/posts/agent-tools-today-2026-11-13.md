---
title: "Agent Tools Today, 13 Nov 2026: Gemini 4 Hydrogen, Edge0-145B and Anthropic's IPO Page"
seoTitle: "Agent Tools Today (13 Nov 2026): Launches, Skills, MCP Servers"
description: "The top launches, skills, multi agent moves, rising repos and talking points in AI agents from 12 to 13 Nov 2026, each with its source and date."
date: 2026-11-13
category: news
categoryLabel: News
type: Non-technical
series: agent-tools-today
primaryKeyword: "agent tools today 13 nov 2026"
secondaryKeywords: ["gemini 4 hydrogen", "antigravity orchestrator", "edge0-145b", "claude code code mode", "crush 0.101.0", "copilot cli 1.0.110"]
tags: ["Daily Brief", "Gemini", "Claude Code", "MCP"]
---

Agent tools today, 13 Nov 2026, in one line: Google launched Gemini 4 Hydrogen, Edge0 released a 145B model for your own computer, and Anthropic's IPO page drew 845 Hacker News points. It covers 12 Nov 04:00 UTC to 13 Nov 04:00 UTC, checked 13 Nov. Previous edition: [12 Nov](/blog/agent-tools-today-2026-11-12/).

<figure class="mg" data-scene="abacus"><img src="/blog/assets/media/agent-tools-today-2026-11-13/abacus.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a blue abacus holds three rows of lilac and mint beads. The rows read Hydrogen, Edge0 and IPO. One row at a time, its beads slide right and its word brightens. Tapping a row slides its beads back and shows the date 12 Nov on it."><figcaption>The day's three lead items, from Google's and Edge0's 12 Nov posts and Anthropic's IPO page, read 13 Nov 2026.</figcaption></figure>

## Top 3 launches

1. **Gemini 4 Hydrogen.** Google's post, published 12 Nov at 18:00 UTC, calls it "our daily driver for agentic workflows" in its share text. Price as of 12 Nov: "$1.50 per million input tokens and $7.50 per million output tokens". On 12 Nov Google put it at 57% on Terminal-Bench 4.1, against 18.2% for Gemini 3.8 Flash: the vendor's own figures. It has four thinking levels, up to a new xhigh. 481 points on [Hacker News](https://news.ycombinator.com/item?id=50471431) by 13 Nov. Our page covers [Gemini 4 Hydrogen](/blog/gemini-4-hydrogen/). [Source](https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-hydrogen/)
2. **Orchestrator in Google Antigravity.** The Antigravity Team's 12 Nov post adds "a new model dropdown option called Orchestrator", which pairs Hydrogen with Gemini 4 Carbon or Argon. Carbon plans, Hydrogen writes edits and runs tests, and "If Hydrogen hits friction, it would hand back to Carbon". On 12 Nov Google said it reached "near-Carbon task success rates" on 24% less quota on average on Terminal-Bench (4.0 or 4.1; the posts differ): the vendor's own figures. It is rolling out to Google AI Ultra and paid Google AI Pro subscribers. 334 points on [Hacker News](https://news.ycombinator.com/item?id=50472260) by 13 Nov. See [Antigravity alternatives](/blog/antigravity-alternatives/). [Source](https://antigravity.google/blog/gemini-4-hydrogen-in-google-antigravity/)
3. **Edge0-145B.** Edge0's 12 Nov post: "Today, we're open-sourcing Edge0-145B and Edge0-120B", though its model licence reserves some commercial uses. It says the 145B model runs on "a compatible personal laptop, such as a MacBook Pro", with "29GB peak memory" and "80+ tokens/s decode": the vendor's own figures. It also says, fairly, "Hardware and electricity still cost money." 96 points on [Hacker News](https://news.ycombinator.com/item?id=50475713) by 13 Nov. [Source](https://edge0.ai/blog/introducing-edge0-145b-frontier-ai-capabilities-on-your-own-computer)

## Top 3 skills, MCP servers and plugins

1. **AgentRun.** The README says it adds "self-improvement, durable execution and a control plane on top of your favorite agent harness", such as Claude Code, Codex, OpenCode or pi. After each run the agent keeps "a note, a skill, or a workflow" for the next one. Its Show HN, posted 12 Nov at 18:15 UTC, had 84 points by 13 Nov. Apache-2.0, 629 stars. See [Claude Code skills](/blog/claude-code-skills/). [Source](https://github.com/Parcha-ai/agentrun)
2. **Shared Facts.** "An agent-first reference implementation for sharing reviewed facts across devices with Git and read-only MCP." Its optional MCP adapter "exposes allowlisted records". Created 12 Nov at 06:22 UTC; MIT, 61 stars by 13 Nov. See [what an MCP server is](/blog/what-is-an-mcp-server/). [Source](https://github.com/siwen-121/agent-shared-facts)
3. **Gemini front end design skill.** Google's Hydrogen post introduces "our new Gemini front end design skill in Google Antigravity", added to Google's demolab repo on 10 Nov. [Source](https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-hydrogen/)

## Top 5 moves from multi agent tools

1. **Claude Code v2.1.323.** Published 12 Nov at 22:12 UTC. It adds "Code Mode, an experimental opt-in in which Claude writes JavaScript to call its tools", and plugins can set an `engines["claude-code"]` version range. When usage credits are off or used up, a menu offers "stop, switch to usage credits, upgrade". See [Claude Code Max plan tips](/blog/claude-code-max-plan-tips/). [Source](https://github.com/anthropics/claude-code/releases/tag/v2.1.323)
2. **GitHub Copilot CLI v1.0.110.** Published 12 Nov at 22:59 UTC. Experimental: "answer git, ssh, and sudo password prompts from agent commands in a masked dialog". Also, "/compact respects the session AI credit limit". [Source](https://github.com/github/copilot-cli/releases/tag/v1.0.110)
3. **Crush v0.101.0.** Published 12 Nov at 16:02 UTC. "Skills can now be switched on and off right from the command palette." Tool calls show how long they have run, so you know "whether that test suite is just slow or actually stuck". [Source](https://github.com/charmbracelet/crush/releases/tag/v0.101.0)
4. **Orca 1.4.258.** Published 13 Nov at 01:35 UTC. You can "Use GitHub Copilot in Chat" and "Answer worker permission prompts from the coordinator". [Source](https://github.com/stablyai/orca/releases/tag/v1.4.258)
5. **Qwen Code v0.27.3.** Published 13 Nov at 00:24 UTC. Managed Sessions now "store self-paced /loop wakeups durably in the session journal so they survive restarts and takeovers", and a new DingTalk webhook channel posts task results. [Source](https://github.com/QwenLM/qwen-code/releases/tag/v0.27.3)

## Top 3 rising repos

1. **Astryx.** Meta's "open source design system that's fully customizable and agent ready", with a CLI so "every coding agent knows Astryx". 1,830 stars in a day on GitHub trending on 13 Nov, 26,721 in total; MIT. [Source](https://github.com/meta/astryx)
2. **Codex Security.** "Codex Security helps you find, investigate, and fix vulnerabilities in your code", from inside Codex or its own CLI and SDK. 643 stars in a day on GitHub trending on 13 Nov, 12,549 in total; Apache-2.0. See [Codex alternatives](/blog/codex-alternatives/). [Source](https://github.com/openai/codex-security)
3. **smolmaxxing.** "Run the biggest language model you can on the smallest hardware you own." The README says a TV box and a 2013 iPad Air run 8B and 16B mixture of experts models "on about 1 GB of RAM" by reading the rest from flash: the author's claims. 292 points on [Hacker News](https://news.ycombinator.com/item?id=50468888) by 13 Nov. MIT, 325 stars, created 4 Nov. [Source](https://github.com/hyperionaidev/smolmaxxing)

Stars can rise for reasons other than use: names to watch, not picks.

## Top 3 things people are talking about

1. **What does Anthropic's IPO page say?** Read 13 Nov, it lists Q3'26 revenue of "$17.0B" and a net loss of "$23.3B" that "includes a $21.9 billion non-cash charge", and calls Anthropic "a public benefit corporation". 845 points and 822 comments on [Hacker News](https://news.ycombinator.com/item?id=50465829) by 13 Nov, posted 12 Nov at 11:46 UTC. [Source](https://ipo.anthropic.com/us/)
2. **Do Chinese frontier models show export controlled GPUs?** Unemployment Labs says yes. Its 12 Nov report says six models from DeepSeek, Moonshot AI, MiniMax and Ant Group "contain numerical patterns matching Blackwell hardware", read from their published weights. It says this "supports, without proving, the inference that Blackwell also performed the training". 195 points on [Hacker News](https://news.ycombinator.com/item?id=50474883) by 13 Nov. [Source](https://unemploymentlabs.com/checkpoint-forensics)
3. **Is Jane Street changing interviews for LLMs?** A little. Its 2 Nov post says some new rounds involve "using LLMs to produce code", but "Most rounds will continue to be traditional coding interviews, conducted without LLM assistance." 180 points on [Hacker News](https://news.ycombinator.com/item?id=50467297) by 13 Nov. Talk, not a new launch. [Source](https://blog.janestreet.com/software-engineering-interviews-are-changing-a-little/)

## How this list is built

We read our scout's report from Google, Reddit and Hacker News, checked releases, Hacker News and GitHub trending ourselves, and rechecked every item on its own page. A name only makes a list with an opened link and a signal: points, stars or a dated release. Gemini CLI, Goose, Pi, OpenCode, Paperclip, AionUi, Cline and OpenClaw shipped no stable release in the window; Codex and T3 Code shipped only prereleases. Apple's Foundation Models page carries no date, Anthropic's Worse Together study is dated 11 Nov, and Conductor's changelog shows nothing in the window.

<link rel="stylesheet" href="/blog/assets/media/agent-tools-today-2026-11-13/motion.css"><script defer src="/blog/assets/media/agent-tools-today-2026-11-13/motion.js"></script>
