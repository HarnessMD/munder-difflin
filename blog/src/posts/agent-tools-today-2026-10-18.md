---
title: "Agent Tools Today, 18 Oct 2026: LeanREA Takes On REA, FLUX 3 Image Klein, Hy Memory"
seoTitle: "Agent Tools Today (18 Oct 2026): Launches, Skills, MCP Servers"
description: "The top launches, skills and MCP servers, multi agent moves, rising repos and arguments in coding agents on 18 Oct 2026, each with its source."
date: 2026-10-18
category: news
categoryLabel: News
type: Non-technical
series: agent-tools-today
primaryKeyword: "agent tools today 18 oct 2026"
secondaryKeywords: ["leanrea", "rea reverse engineer anything", "flux 3 image klein", "hy memory", "orca native chat"]
tags: ["Daily Brief", "Claude Code", "MCP", "Open Source"]
---

Agent tools today, 18 Oct 2026, in one line: an 8 KB skill file claims to match a 207 tool MCP server, Black Forest Labs shipped a 5.6B image model with a build for 8 GB graphics cards, and Tencent opened a memory engine for agents. Every number was checked on 18 Oct. The last edition is [17 Oct](/blog/agent-tools-today-2026-10-17/).

[Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of coding agents such as Claude Code, Codex and Gemini CLI on your own computer. It shipped no release in the last 24 hours, so it is not in the lists below.

<figure class="mg" data-scene="today"><img src="/blog/assets/media/agent-tools-today-2026-10-18/today.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a big backpack stuffed with small tool cards sits next to a single index card. Under the backpack a counter reads 400.7k tokens; under the card a counter reads 34.5k tokens."><figcaption>REA 6.5.0 against LeanREA in context tokens with every tool loaded, from the LeanREA README of 17 Oct 2026.</figcaption></figure>

## Top 3 launches

1. **FLUX 3 Image Klein.** Black Forest Labs wrote on 15 Oct: "Today we are releasing FLUX 3 Image Klein, a 5.6B parameter open weights model" for text to image, editing and up to 10 reference images. The generator weights need "11.2 GB in BF16 and 5.6 GB in FP8", and the INT8 build runs on RTX cards "with as little as 8GB of VRAM". The licence is the FLUX Kommunity License. More than 200 points on Hacker News on 18 Oct. [Source](https://bfl.ai/blog/flux-3-image-klein)
2. **Hy Memory.** Tencent Hunyuan's repo calls it a "dual-system cognitive memory engine and Python SDK" for agents, with separate pipelines for chat, work and coding. Its desktop and CLI product, MemHub, pulls history from apps you authorise, such as Claude Code, Cursor, Codex and OpenCode, into one local data directory. Created 15 Oct. Apache 2.0, more than 590 stars on 18 Oct. [Source](https://github.com/Tencent-Hunyuan/Hy-Memory)
3. **MOSS-Image.** OpenMOSS released a 5B parameter base diffusion transformer with base and SFT checkpoints on Hugging Face and a technical report in the repo. Created 16 Oct. Apache 2.0, more than 460 stars on 18 Oct. For yesterday's open weights model from DeepSeek, see [DeepSeek V4.1 Flash 1017](/blog/deepseek-v4-1-flash-1017/). [Source](https://github.com/OpenMOSS/MOSS-Image)

## Top 3 skills, MCP servers and plugins

1. **LeanREA.** "One 8 KB skill file that does what REA does: no MCP server, no 207 tools, no setup." It tells the agent which command line tool to run for each target. In its own test with Claude Code headless and Sonnet 5.5, it reports "38% less wall time, 35% lower cost, 56% fewer turns and 60% fewer tokens, at the same accuracy" against REA, scoring 74 of 75 to REA's 75. Created 17 Oct. MIT, more than 460 stars on 18 Oct. [Source](https://github.com/aicodeking/leanrea)
2. **REA 6.6.0.** The skill and MCP server LeanREA measures itself against shipped a release on 18 Oct. It adds Kuna, which you install yourself, as a static analysis provider and extends Ghidra analysis "to Windows ARM PE targets and explicit raw m68k images". MIT. [Source](https://github.com/morluto/rea/releases/tag/rea-agents-6.6.0)
3. **Co-op Anything.** An "MCP server and playbook" that points a coding agent at a game for one player. The README says the agent reverse engineers the game if it has to, "tests it with bots inside the game", and packages the result so friends can install it in one click and join over Steam. Created 16 Oct. MIT, more than 180 stars on 18 Oct. See [MCP and skills in a hive](/blog/mcp-and-skills-in-a-hive/). [Source](https://github.com/cranebeaker/coop-anything)

## Top 3 moves from multi agent tools

1. **Orca v1.4.229.** Published 17 Oct. An experimental native chat shows edits inline, one turn at a time, along with "Claude goals and Codex context usage"; shared skill installation "now supports 20 additional agents". [Source](https://github.com/stablyai/orca/releases/tag/v1.4.229)
2. **Herdr GPUI v20261016.1.** Published 16 Oct. The native desktop client for Herdr shows "network latency and loss after CPU and memory" in the status bar, lets you reorder devices by dragging, and can destroy a Coder workspace from Settings. It "Requires an existing Herdr daemon". See [Herdr alternatives](/blog/herdr-alternatives/). [Source](https://github.com/penso/herdr-gpui/releases/tag/v20261016.1)
3. **Ollama v0.40.6.** Published 16 Oct. Four changes: it prevents orphaned runners on Windows, adds the q2_0 tensor and file types to GGUF, launches clef in Ollama's cloud, and uses identifiers for ask mode question keys. See [how to connect Ollama to Claude Code](/blog/how-to-connect-ollama-to-claude-code/). [Source](https://github.com/ollama/ollama/releases/tag/v0.40.6)

## Top 3 rising repos

1. **Handwired.** "Turn your regular JavaScript code into a neural net; no training, exact, yet also fully differentiable!" The README shows if and else, loops and state turned into matrix multiplication over floats. Created 15 Oct. MIT, more than 1,600 stars on 18 Oct. [Source](https://github.com/chenglou/handwired)
2. **web-ocean.** A real time ocean renderer "written from scratch on WebGPU, with no engine or rendering library". The README says it was built with Claude Code (Opus 5.5), which checked its own renders with headless Chrome screenshots reviewed by separate critic subagents. Created 16 Oct. MIT, more than 510 stars on 18 Oct. [Source](https://github.com/Noniv/web-ocean)
3. **PS5LM.** "Your PS5 runs the language model. Every device on your network uses it." It runs llama.cpp on a jailbroken console's GPU "with OpenAI and Anthropic APIs". GPL 3.0, more than 500 stars and more than 360 points on Hacker News on 18 Oct. [Source](https://github.com/cobanov/PS5LM)

New repos can gain stars quickly for reasons other than use, so treat these as names to watch, not recommendations.

## Top 3 things people are arguing about

1. **Postgres 19 and AI code review.** The Register reported on 16 Oct that PostgreSQL 19 is now expected "around November 19" and that developers dropped "between eight and 10 significant features". It quotes a leading PostgreSQL committer who says the reverts could be due at least in part to LLM code reviews. More than 210 points on Hacker News on 18 Oct. [Source](https://www.theregister.com/databases/2026/10/16/postgres-19-delayed-after-ai-reviewers-find-more-bugs-than-humans-can-fix/5303471)
2. **What benchmarks miss.** Mercor's Benchmark Map maps 29 AI benchmarks onto 923 US occupations, and its provisional findings "suggest that 90% of American working hours are spent on tasks with little or no coverage from existing benchmarks". More than 590 points on Hacker News on 18 Oct. [Source](https://www.mercor.com/research/labor-index/benchmark-map/)
3. **How fast a local model feels.** Llmspeed lets you pick a graphics card or Mac and a model, such as DeepSeek V4.1 Flash or Gemma 4 31B, and see the speed. The site says its numbers are "Estimates for a short prompt on a single device", some measured by the community and the rest derived from similar setups or projected from specs. More than 260 points on Hacker News on 18 Oct. [Source](https://llmspeed.dev/)

## How this list is built

Each day our agents read GitHub releases and new repos, vendor posts and the Hacker News front page about coding agents. A name only makes a list with a link that was opened and a signal that can be shown: points, stars or a dated release. Repos are checked against the GitHub API before they appear, and a claim that exists only as a social post is left out. New here? Start with the [install guide](/blog/how-to-install-and-use-munder-difflin/).

<link rel="stylesheet" href="/blog/assets/media/agent-tools-today-2026-10-18/motion.css"><script defer src="/blog/assets/media/agent-tools-today-2026-10-18/motion.js"></script>
