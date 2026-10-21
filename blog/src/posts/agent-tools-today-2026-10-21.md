---
title: "Agent Tools Today, 21 Oct 2026: DeepInfer, Voxtral 3, Claude Code 2.1.305"
seoTitle: "Agent Tools Today (21 Oct 2026): Launches, Skills, MCP Servers"
description: "The top launches, skills and MCP servers, multi agent moves, rising repos and arguments in coding agents on 21 Oct 2026, each with its source."
date: 2026-10-21
category: news
categoryLabel: News
type: Non-technical
series: agent-tools-today
primaryKeyword: "agent tools today 21 oct 2026"
secondaryKeywords: ["deepinfer", "deepseek deepinfer", "voxtral 3", "claude code 2.1.305", "harp claude code codex"]
tags: ["Daily Brief", "Claude Code", "MCP", "Open Source"]
---

Agent tools today, 21 Oct 2026, in one line: DeepSeek opened up the inference framework behind its own services, Mistral shipped speech models with a voice agent SDK, and Claude Code fixed a tool search failure on Vertex and Bedrock. Every number was checked on 21 Oct. The last edition is [19 Oct](/blog/agent-tools-today-2026-10-19/).

[Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of coding agents such as Claude Code, Codex and Gemini CLI on your own computer. It shipped no release in the last 24 hours, so it is not in the lists below.

<figure class="mg" data-scene="today"><img src="/blog/assets/media/agent-tools-today-2026-10-21/today.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a row of terminal tabs slides into a tall sidebar. Four agent rows appear one by one; three show a small dot for running work, and one lights up with a mark that reads Needs you. A click on that row opens its terminal."><figcaption>Harp's agent sidebar, drawn from its README on 21 Oct 2026.</figcaption></figure>

## Top 3 launches

1. **DeepInfer.** DeepSeek's README calls it "the high-performance inference framework that powers DeepSeek's large-scale production services." This open source release runs offline inference for DeepSeek V4.1 Flash only, on NVIDIA SM100 GPUs and Huawei Ascend 950 NPUs; a KV cache system, prefill and decode disaggregation and load balancing are not included. Apache 2.0. More than 2,100 points on Hacker News and more than 14,000 stars on 21 Oct. See [DeepSeek V4.1 Flash 1017](/blog/deepseek-v4-1-flash-1017/). [Source](https://github.com/deepseek-ai/DeepInfer)
2. **Voxtral 3.** Mistral's post of 20 Oct brings new speech to text and text to speech models plus a voice agent SDK that "combines listening, reasoning, tool calling, and speaking into a real-time experience." Voxtral Small Transcribe 3 covers 50 languages, and Voxtral Mini TTS 3 costs $13 per million characters (Mistral, 20 Oct 2026). It runs on Mistral's EU hosted API or on your own infrastructure. More than 550 points on Hacker News on 21 Oct. [Source](https://mistral.ai/news/voxtral-3/)
3. **Respan.** A Launch HN for an open source AI gateway written in Rust where everything is a plugin: providers, protocols such as MCP and voice, and features such as fallbacks, PII redaction and smart routing. The team says it has built on LiteLLM since 2024 and that its wrapper code at one stage passed 100,000 lines. More than 45 points on Hacker News on 21 Oct. [Source](https://news.ycombinator.com/item?id=50167583)

## Top 3 skills, MCP servers and plugins

1. **Motion2Code.** A skill that teaches coding agents to rebuild a motion design video as inline SVG driven by one GSAP timeline, then check it frame by frame against the source. For screen recordings of sites and apps it builds the real interactive page. The README lists Claude Code, Codex, Cursor, Copilot and Gemini. Created 20 Oct. MIT, more than 70 stars on 21 Oct. [Source](https://github.com/lovisdotio/motion2code)
2. **Dashboard Design.** A Claude Code skill to build, redesign and critique dashboards: KPI tiles, charts, date pickers and phone layouts. It ends every job with a screenshot QA pass, "so it judges what is on the screen rather than what is in the code." Created 20 Oct. MIT, 80 stars on 21 Oct. [Source](https://github.com/abdiraimov-otabek/dashboard-design-skill)
3. **BetterSearch.** A skill built on DeepSeek's new search API that writes better queries, runs research in parallel, adds a fact check pass and ends with a clean report. Its README says it works in Claude Code, Codex, Cursor, Gemini CLI, OpenCode and Hermes. Created 18 Oct. MIT, more than 35 stars on 21 Oct. [Source](https://github.com/ry0narushima/bettersearch)

## Top 3 moves from multi agent tools

1. **Claude Code v2.1.305 and v2.1.306.** Published 20 and 21 Oct. v2.1.305 fixes "every request failing on Vertex, Bedrock and other providers" when an endpoint or gateway rejects tool search, a 2.1.304 regression. It also lets unattended retry mode notice a usage limit lifted before its reset, and a Bash command on a full disk now says the disk is full and that nothing ran. v2.1.306 fixes `claude -p` saying "Not logged in" inside cloud sessions when started without the session's environment variables. [Source](https://github.com/anthropics/claude-code/releases/tag/v2.1.305)
2. **GitHub Copilot CLI v1.0.101.** Published 20 Oct. Dynamic workflow subagents get native structured output on supported models, a new `assistedApprovalInstructions` setting guides Assisted Permissions, plugins assigned to a team install from that team's GitHub marketplaces, and the first prompt no longer hangs when no model is selected. See [Copilot CLI vs Claude Code](/blog/github-copilot-cli-vs-claude-code-for-hive-work/). [Source](https://github.com/github/copilot-cli/releases/tag/v1.0.101)
3. **Gemini CLI v0.65.0.** Published 20 Oct. Workspace settings in untrusted folders are now read only, resumed sessions no longer repeat tool response turns, and telemetry accepts custom OTLP headers. See [Gemini CLI vs Claude Code](/blog/gemini-cli-vs-claude-code/). [Source](https://github.com/google-gemini/gemini-cli/releases/tag/v0.65.0)

## Top 3 rising repos

1. **Harp.** "Run many Claude Code and Codex agents side by side, in one calm sidebar that tells you which one needs you." An unofficial fork of the Warp terminal that swaps the tab bar for that sidebar; with its tmux integration on, tab groups and their order survive a restart. Created 20 Oct. GitHub lists the licence as AGPL 3.0; more than 340 stars on 21 Oct. See [tmux and scripts vs an agent harness](/blog/tmux-and-scripts-vs-an-agent-harness/). [Source](https://github.com/dominikmartn/harp)
2. **Decks.** "Make slides by commenting on them": you leave a comment under a slide, Claude Code or Codex changes the deck, and it replies on the slide with what it did or a question. Created 18 Oct. MIT, more than 90 stars on 21 Oct. [Source](https://github.com/paulmil11/decks)
3. **penmentor.** You work by hand, press a key, and Claude, Gemini or GPT marks your maths on screen "like a teacher with coloured pens," with hints instead of answers. Created 17 Oct. MIT, more than 60 stars on 21 Oct. [Source](https://github.com/AbdullahAlhariri/penmentor)

New repos can gain stars quickly for reasons other than use, so treat these as names to watch, not recommendations.

## Top 3 things people are arguing about

1. **Medium effort beat xhigh for Opus 5.5.** HumanLayer's SlopCodeBench report, dated 15 Oct, ran frontier models over 36 problems and 196 checkpoints. Strict pass rates landed between 12.2% and 16.3% (HumanLayer, 15 Oct 2026), with GPT-6 Astra on top, and it says Opus 5.5 "did *BETTER* on medium effort than on xhigh," while xhigh cost 2.11 to 4.22 times as much as medium in the three complete pairs. More than 190 points on Hacker News on 21 Oct. [Source](https://github.com/humanlayer/advanced-context-engineering-for-coding-agents/blob/main/benchmarking-new-models-on-slop-code-bench.md)
2. **Fake stats that AI answers keep citing.** Peec AI's post describes a site of 50,000 made up statistics built in one day. Google deindexed it, the post says, but ChatGPT kept citing it, sending more than 10,000 AI sessions, and more than 330 domains now link to it. More than 320 points on Hacker News on 21 Oct. [Source](https://peec.ai/blog/publish-stats-get-cited-the-tactic-that-put-my-data-all-over-the-web)
3. **Ad free TV home screens, set up by agents.** A guide dated 19 Oct to an ad free Android TV tells readers to hand the article to an AI agent and review each command before approving it; it passed 390 points on Hacker News. In the same days, Free My TV ("Built with Claude Code") passed 1,900 stars and TV Detox passed 950. [Source](https://cretezy.com/2026/ad-free-android-tv)

## How this list is built

Each day our agents read GitHub releases and new repos, vendor posts and the Hacker News front page about coding agents. A name only makes a list with a link that was opened and a signal that can be shown: points, stars or a dated release. Repos are checked against the GitHub API before they appear, and a claim that exists only as a social post is left out. New here? Start with the [install guide](/blog/how-to-install-and-use-munder-difflin/).

<link rel="stylesheet" href="/blog/assets/media/agent-tools-today-2026-10-21/motion.css"><script defer src="/blog/assets/media/agent-tools-today-2026-10-21/motion.js"></script>
