---
title: "Agent Tools Today, 3 Oct 2026: Claude Code Mods, OpenDots, Conductor Mobile"
seoTitle: "Agent Tools Today (3 Oct 2026): Launches, Skills, MCP Servers"
description: "The top 5 launches, skills and MCP servers, multi agent moves, rising repos and arguments in coding agents on 3 Oct 2026, each with its source."
date: 2026-10-03
category: news
categoryLabel: News
type: Non-technical
series: agent-tools-today
primaryKeyword: "agent tools today 3 oct 2026"
secondaryKeywords: ["claude code mods", "opendots", "conductor mobile", "new mcp servers", "new claude code skills"]
tags: ["Daily Brief", "Claude Code", "MCP", "Skills", "Open Source"]
---

Agent tools today, 3 Oct 2026, in one line: everything became a plugin. Claude Code can now be modded, DeepSeek's desktop harness is built from plugins, and an open source copy of ChatGPT Dots appeared two days after the original. This is the first edition, so it covers the last two days. Every number was read on 3 Oct.

## Top 5 launches

1. **Claude Code Mods.** Anthropic now lets you change how Claude Code behaves and looks with a few lines of TypeScript, shipped as plugins you install with `/plugin`. The announcement on X had 19,861 likes and 4 million views. [Source](https://claude.com/blog/claude-code-mods)
2. **OpenDots.** CopilotKit released a self hosted template for always on AI coworkers that works with any agent harness, announced two days after OpenAI's Dots. MIT licensed, 1,813 GitHub stars. Background in [what is ChatGPT Dots](/blog/what-is-chatgpt-dots/). [Source](https://github.com/CopilotKit/OpenDots)
3. **Pi 1.0 and Pi Durable.** Earendil shipped version 1.0 of its small terminal agent, plus an experimental runtime for long running agents. 1,583 points on Hacker News. Our explainer: [what is Pi agent](/blog/what-is-pi-agent/). [Source](https://earendil.com/posts/pi-1-0/)
4. **DeepSeek Harness desktop.** DeepSeek released packaged desktop apps for macOS and Windows, with Linux through npm. Its pitch is that every feature is a plugin. The repo has 242,637 stars. [Source](https://github.com/deepseek-ai/deepseek-harness)
5. **Conductor Mobile.** Announced on 1 Oct: Conductor's iPhone app starts and steers a team of cloud agents from your phone. The app has been on the App Store since 14 Sep. 744 likes on the announcement. [Source](https://x.com/charlieholtz/status/2105769644498002130)

## Top 5 skills, MCP servers and plugins

1. **Headroom.** Compresses tool output, logs and files before they reach the model, so long sessions use less context. Apache 2.0, 74,273 stars. [Source](https://github.com/headroomlabs-ai/headroom)
2. **codebase-memory-mcp.** An MCP server that indexes a repo into a knowledge graph the agent can query. MIT, 45,672 stars. [Source](https://github.com/DeusData/codebase-memory-mcp)
3. **HarnessRouter.** One self hosted API in front of Codex, Claude Code, Hermes, Pi and DeepSeek Harness. You pick the harness per request. Apache 2.0, 2,855 stars. [Source](https://github.com/HarnessRouter/harnessrouter)
4. **typesafe-ai skills.** Skills for building with TypeSafe's System One API, which returns typed judgments and probabilities for routing, ranking and verification. MIT, 2,542 stars. [Source](https://github.com/typesafe-ai/skills)
5. **claude-code-setup.** A plugin in Anthropic's official plugin repo that reads your project and recommends hooks, skills, MCP servers and subagents. Install with `/plugin install claude-code-setup@claude-plugins-official`. [Source](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/claude-code-setup)

## Top 5 moves from multi agent tools

1. **Pi.** Pi Durable shipped beside 1.0: an experimental runtime where each task saves a checkpoint at every step. 492 points on Hacker News. [Source](https://earendil.com/posts/pi-durable/)
2. **Munder Difflin.** [Munder Difflin](https://harnessmd.com/download), free and open source, shipped version 0.5.5 on 1 Oct: a faster office view, Stop and Archive that keep an agent's work, and dictation at the cursor. [Source](https://github.com/HarnessMD/munder-difflin/releases/tag/v0.5.5)
3. **Hermes Agent.** Maintainer Teknium said the next update should be around 4 times faster for everyone. It has not shipped; the latest release is still v2026.9.24. [Source](https://x.com/Teknium/status/2105809042291798441)
4. **Orca.** Release v1.4.219 on 2 Oct, and a new Android companion build on 3 Oct. [Source](https://github.com/stablyai/orca/releases)
5. **OpenClaw.** Three releases in two days: v2026.8.34 and v2026.8.35 on 2 Oct, then v2026.9.8 on 3 Oct. [Source](https://github.com/openclaw/openclaw/releases)

If you are choosing between these, the [open source AI agents](/blog/open-source-ai-agents/) list compares ten of them, and [what a multi agent harness is](/blog/what-is-a-multi-agent-harness/) explains the category.

## Top 5 rising repos

1. **Strata.** Runs a Qwen model on a gaming PC behind a local API that coding agents can call, with an MCP server so your assistant can install and manage it. MIT, 7,326 stars. [Source](https://github.com/Niko1221/Strata)
2. **PDoomVideo.** A music video where every frame is code written by Opus 5.5. 1,728 stars. [Source](https://github.com/JohnHeibel/PDoomVideo)
3. **ZCode.** Z.ai's coding agent harness, created on 20 Sep. Apache 2.0, 7,355 stars. [Source](https://github.com/zai-org/ZCode)
4. **Spark-X2.5.** A small on device agent model with a 1 million token context, Apache 2.0. 606 stars. [Source](https://github.com/XHToken/Spark-X2.5)
5. **EvoSkills.** Skill packs for research and paper writing. 468 stars. [Source](https://github.com/EvoScientist/EvoSkills)

New repos can gain stars quickly for reasons other than use, so treat these as names to watch, not recommendations.

## Top 5 things people are arguing about

1. **Is Opus 5.5 getting worse?** A post showing Opus 5.5 at 94.2% on NerfBench drew 6,218 likes, with its author saying the drop is still inside normal variance. [Source](https://x.com/bridgemindai/status/2106013611231440980)
2. **Gemini 4 Argon exists, but you can't use it.** Google's [launch post](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-4-argon/) gives first access to a set of trusted cyber defenders. One post argued that by the time it is public, newer models will be ahead and it will be dead on launch. What works today is in our [Gemini CLI install guide](/blog/how-to-install-gemini-cli/). [Source](https://x.com/elshayib_/status/2105737351427154054)
3. **Durable runtimes.** LangChain's Harrison Chase, quoting the Pi launch: it is pretty clear every agent harness needs a durable runtime. 299 likes. [Source](https://x.com/hwchase17/status/2105791360796397954)
4. **Everything is a plugin.** Claude Code Mods and DeepSeek's plugin built desktop landed a day apart. The open question is who reviews what a plugin can touch. DeepSeek's post had 4,103 likes. [Source](https://x.com/deepseek_ai/status/2105915715241062644)
5. **Sites in ChatGPT.** OpenAI's site builder inside ChatGPT had 277 points on Hacker News by 3 Oct. [Source](https://news.ycombinator.com/item?id=49927747)

## How this list is built

Each day our agents read GitHub releases and trending pages, the Hacker News front page, and the top posts on X and Reddit about coding agents. A name only makes a list with a link that was opened and a signal that can be shown: points, stars, likes or views. Repos are checked against the GitHub API before they appear. New to Munder Difflin? The [install guide](/blog/how-to-install-and-use-munder-difflin/) is the place to start.
