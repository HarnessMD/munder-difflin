---
title: "Agent Tools Today, 17 Oct 2026: Muse Spark Open on Mac Studio, StarSkirmish, Claude Design Closes"
seoTitle: "Agent Tools Today (17 Oct 2026): Launches, Skills, MCP Servers"
description: "The top launches, skills and MCP servers, multi agent moves, rising repos and arguments in coding agents on 17 Oct 2026, each with its source."
date: 2026-10-17
category: news
categoryLabel: News
type: Non-technical
series: agent-tools-today
primaryKeyword: "agent tools today 17 oct 2026"
secondaryKeywords: ["muse spark open mac studio", "starskirmish bench", "claude design closing", "agentplay", "cc-stretch"]
tags: ["Daily Brief", "Claude Code", "MCP", "Open Source"]
---

Agent tools today, 17 Oct 2026, in one line: Apple ran Meta's open weights model on four Mac Studios, a StarCraft benchmark put coding agents in their own CLIs, and Claude Code says standalone Claude Design is closing. Every number was checked on 17 Oct. The edition before this one on the site is [16 Oct](/blog/agent-tools-today-2026-10-16/).

[Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of coding agents such as Claude Code, Codex and Gemini CLI on your own computer. It shipped no release in the last 24 hours, so it is not in the lists below.

<figure class="mg" data-scene="today"><img src="/blog/assets/media/agent-tools-today-2026-10-17/today.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, four small boxes labelled Mac Studio sit in a row joined by a blue cable, their lights turn green, and a counter above them rolls up to 36, with the label tokens per second."><figcaption>Muse Spark Open on four Mac Studios, from Apple's machine learning research post of 15 Oct 2026.</figcaption></figure>

## Top 3 launches

1. **Muse Spark Open on Mac Studio.** Apple's machine learning research team wrote on 15 Oct that "the latest version of MLX, released today" runs Meta's Muse Spark Open, and that "On a cluster of four Mac Studios, Muse Spark Open generates over 36 tokens per second". The post scales out with "the RDMA over Thunderbolt driver" and also times Mistral Medium 3.5 and Qwen 3.8 on a single Mac Studio. More than 280 points on Hacker News on 17 Oct. For Meta's hosted models, see [Muse Wonder](/blog/muse-wonder/). [Source](https://machinelearning.apple.com/research/mlx-distributed-inference)
2. **StarSkirmish Bench v0.2.** A benchmark, dated 15 Oct, where "Each LLM gets one hour to write a Protoss bot in C++", with every model "running in its lab's 1st party CLI harness". It reports GPT-6 Astra first, and Gemini 4 Argon, Claude Opus 5.5 and Claude Fable 5.1 "all scoring between 37 and 39". More than 190 points on Hacker News on 17 Oct. See [Gemini 4 Argon](/blog/gemini-4-argon/). [Source](https://starskirmish.com/bench/v0-2/)
3. **goose v1.55.0.** Published 16 Oct. The open source agent adds an "AIgateway declarative provider", passes trace context "from ACP prompts to MCP tool calls", and will "Cap auto-compaction at 225k tokens by default". [Source](https://github.com/aaif-goose/goose/releases/tag/v1.55.0)

## Top 3 skills, MCP servers and plugins

1. **cc-stretch.** A Claude Code plugin: "Replies arrive short. Click a linked phrase and it grows right where it stands." The README says clicks in the terminal need Claude Code's fullscreen renderer. Created 14 Oct. MIT, more than 340 stars on 17 Oct. [Source](https://github.com/pro-vi/cc-stretch)
2. **Claudemy.** The README calls it "a free Claude Code skill that builds the course you will actually finish": name a topic and it "hands back about 12 audio lessons of 2 minutes each". Created 14 Oct. MIT, more than 280 stars on 17 Oct. [Source](https://github.com/assafkip/claudemy)
3. **mcp-for-blender-pro.** An AI assistant for Blender "with a visual chat workspace and a built-in Model Context Protocol (MCP) server". Its description lists OpenAI, Claude, Gemini, Ollama and OpenCode. Created 15 Oct. MIT, more than 300 stars on 17 Oct. See [MCP and skills in a hive](/blog/mcp-and-skills-in-a-hive/). [Source](https://github.com/anujasid/mcp-for-blender-pro)

## Top 3 moves from multi agent tools

1. **Claude Code v2.1.302.** Published 16 Oct. The notes add "a notice to `/design-sync` and `/design-login` that standalone Claude Design (claude.ai/design) closes by December 14, 2026", an `Idle compaction` row in `/config` to turn idle compaction off, and `CLAUDE_CODE_AUTO_MODE_MODEL` for the client side auto mode classifier. See [Claude Code best practices](/blog/claude-code-best-practices/). [Source](https://github.com/anthropics/claude-code/releases/tag/v2.1.302)
2. **Cline CLI v3.0.73.** Published 17 Oct. GPT-6 models now work on OpenAI and Azure OpenAI compatible endpoints, where before "every request was rejected", and with no model chosen the Cline provider "uses Claude Sonnet 5.5 again". See [Cline vs Munder Difflin](/blog/cline-vs-munder-difflin/). [Source](https://github.com/cline/cline/releases/tag/cli-v3.0.73)
3. **OpenCode v1.19.3.** Published 16 Oct, one day after v1.19.1 ended session sharing. The one listed change lets you "Configure model reasoning options to generate reasoning variants". See [what is OpenCode](/blog/what-is-opencode/). [Source](https://github.com/anomalyco/opencode/releases/tag/v1.19.3)

## Top 3 rising repos

1. **earshot.** "Ears for coding agents": it describes sounds in words, scores how well they fit a description and runs "locally on CPU, as a CLI, a Python API and an MCP server". Created 15 Oct. MIT, more than 360 stars on 17 Oct. [Source](https://github.com/Leonxlnx/earshot)
2. **agentplay.** Replays coding agent sessions "as a map and a timeline", from Claude Code, Codex, Cursor, Copilot, OpenCode and Kiro. The README says `uvx agentplay` builds "a redacted replay of each one" with no account or API key. Created 14 Oct. Apache 2.0, more than 220 stars on 17 Oct. [Source](https://github.com/Entelligence-AI/agentplay)
3. **trim-1.** "a small model that decides which lines of a context an AI agent needs for its current ask, and drops the rest". The README says it is 1.2 MB, runs "on one CPU core" and "never rewrites or summarizes a line". Created 14 Oct. Apache 2.0, more than 110 stars on 17 Oct. [Source](https://github.com/caveman-ai/trim-1)

New repos can gain stars quickly for reasons other than use, so treat these as names to watch, not recommendations.

## Top 3 things people are arguing about

1. **How the Claude Code team reviews code.** A claude.dev post dated 15 Oct says "Claude writes about 90 percent of Claude Code's own code", and that from June to September merged pull requests "more than doubled while the share that had to be reverted fell by more than 40 percent". More than 260 points on Hacker News on 17 Oct. [Source](https://claude.dev/blog/solving-code-review-at-anthropic/)
2. **Claude and the NIST curve seeds.** Anthropic wrote on 16 Oct that an internal research model found, "In under half an hour", that the seeds of five NIST elliptic curves came from the C library's `lrand48` generator seeded with a Unix timestamp. It adds: "This is not a cryptographic break". More than 740 points on Hacker News on 17 Oct. [Source](https://www.anthropic.com/research/ecdsa-curve-origins)
3. **Harnesses and the prompt cache.** Neuralwatt, which runs an inference cloud, wrote on 16 Oct that "Every cache break in our lab tests came from a harness editing what it had already sent". It counts about 1 cache breaking turn in 100 for deepseek-harness against "about 3 in 100 for OpenCode and Pi". More than 45 points on Hacker News on 17 Oct. [Source](https://neuralwatt.com/news/why-harnesses-matter-for-energy-efficiency)

## How this list is built

Each day our agents read GitHub releases and new repos, vendor posts and the Hacker News front page about coding agents. A name only makes a list with a link that was opened and a signal that can be shown: points, stars or a dated release. Repos are checked against the GitHub API before they appear, and a claim that exists only as a social post is left out. New here? Start with the [install guide](/blog/how-to-install-and-use-munder-difflin/).

<link rel="stylesheet" href="/blog/assets/media/agent-tools-today-2026-10-17/motion.css"><script defer src="/blog/assets/media/agent-tools-today-2026-10-17/motion.js"></script>
