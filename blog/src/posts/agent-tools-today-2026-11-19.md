---
title: "Agent Tools Today, 19 Nov 2026: GPT-6.2 Astra and Sol, Gemini 4 Neon and MAI Code 2"
seoTitle: "Agent Tools Today (19 Nov 2026): Launches, Skills, MCP Servers"
description: "The top launches, skills, multi agent moves, rising repos and talking points in AI agents from 16 to 19 Nov 2026, each with its source and date."
date: 2026-11-19
category: news
categoryLabel: News
type: Non-technical
series: agent-tools-today
primaryKeyword: "agent tools today 19 nov 2026"
secondaryKeywords: ["gpt-6.2 astra", "gemini 4 neon", "mai code 2", "opencode browse 0.1.0", "paperclip v2026.1117.0", "claude code verification"]
tags: ["Daily Brief", "OpenAI", "Gemini", "Microsoft"]
---

Agent tools today, 19 Nov 2026, in one line: OpenAI shipped GPT-6.2 Astra and Sol, Google launched Gemini 4 Neon, and Microsoft released MAI Code 2. It covers the three days since the 16 Nov brief (no brief shipped 17 or 18 Nov), 16 Nov 04:00 UTC to 19 Nov 04:00 UTC, checked 19 Nov. Previous edition: [16 Nov](/blog/agent-tools-today-2026-11-16/).

<figure class="mg" data-scene="sundial"><img src="/blog/assets/media/agent-tools-today-2026-11-19/sundial.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a sky shadow sweeps slowly around a yellow sundial from its blue pointer. Three lilac tiles on the dial read Astra, Neon and MAI. As the shadow reaches each tile, it turns mint and its word brightens. Tapping a tile stops the shadow and shows a soft white tag with its date, 17 Nov or 18 Nov."><figcaption>The three lead items, from OpenAI's model pages, Microsoft AI's post of 17 Nov and Google's post of 18 Nov, read 19 Nov 2026.</figcaption></figure>

## Top 5 launches

1. **GPT-6.2 Astra and Sol.** OpenAI's model pages call Astra "Our most capable model for your hardest projects". Both list a 1,050,000 token context window. Astra costs $8 per million input tokens and $40 per million output; Sol costs $2 and $10, checked 19 Nov. Above 272K input tokens, "input and cache rates double". 1,337 points on [Hacker News](https://news.ycombinator.com/item?id=50535230), posted 17 Nov at 17:46 UTC. More in [GPT-6.2 Astra and Sol](/blog/gpt-6-2-astra-and-sol/). [Source](https://developers.openai.com/api/docs/models/gpt-6.2-astra)
2. **Gemini 4 Neon.** Google's post, dated 18 Nov, prices it at "$3 per million input tokens" and "$15 per million output tokens, with a 1 million-token context window". It ranks Neon "#1 overall on the Artificial Analysis Coding Agent Index (58.6)": Google's own figures. 540 points on [Hacker News](https://news.ycombinator.com/item?id=50552424), posted 18 Nov at 21:34 UTC. More in [Gemini 4 Neon](/blog/gemini-4-neon/). [Source](https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-neon/)
3. **MAI Code 2 and MAI Code 2 Flash.** Microsoft AI's post, dated 17 Nov, says MAI Code 2 gives "98% of the performance of GPT-6.1 Sol at 40% of the cost", with cost "shown at its 50% promotional price": Microsoft's own figures. Both are "explicitly not yet tuned" for "very long-horizon agentic work", and both are in GitHub Copilot. They are two of [seven new models](https://microsoft.ai/news/microsoft-ignite-2026/) Microsoft released for Ignite. 417 points on [Hacker News](https://news.ycombinator.com/item?id=50535885), posted 17 Nov at 18:25 UTC. [Source](https://microsoft.ai/news/introducing-mai-code-2-and-mai-code-2-flash/)
4. **Claude Code v2.1.326 to v2.1.328.** Three releases, from 16 Nov at 22:11 UTC to 19 Nov at 01:14 UTC. [v2.1.327](https://github.com/anthropics/claude-code/releases/tag/v2.1.327) adds `claude mcp add-json <name> -`, which reads JSON from stdin "so tokens can stay off the command line"; it is "not available inside a Claude Code session". v2.1.328 lets `mcp_tool` hooks take `"onFailure": "block"`: "a hook whose call fails blocks the action". [Source](https://github.com/anthropics/claude-code/releases/tag/v2.1.328)
5. **OpenCode v2.3.1 and v2.3.2.** Published 18 Nov. In [v2.3.1](https://github.com/anomalyco/opencode/releases/tag/v2.3.1), a shell command still running at its timeout "now moves to the background instead of being killed". v2.3.2 stops GPT-6.2 models "re-billing the system prompt as uncached input on every step": on GitHub Copilot `gpt-6.2-sol`, uncached input per step "dropped from about 14,000 tokens to 3". A good week for a cache. [Source](https://github.com/anomalyco/opencode/releases/tag/v2.3.2)

## Top 2 skills, MCP servers and plugins

1. **OpenCode Browse v0.1.0.** New since the 9 Nov brief: v0.1.0, published 16 Nov at 16:47 UTC, rewrites it "in Rust: one small binary for the CLI, relay and MCP server". Agents use "your real browser, with your tabs, your logins and your extensions", its [page](https://opencode.ai/product/browse) says. 331 points on [Hacker News](https://news.ycombinator.com/item?id=50523459), posted 16 Nov at 21:20 UTC; MIT, 912 stars. See [OpenCode Browse vs agent-browser](/blog/opencode-browse-vs-agent-browser/). [Source](https://github.com/anomalyco/browse/releases/tag/v0.1.0)
2. **last30days v4.3.0.** An agent skill that researches a topic across social sites, YouTube, Hacker News, Polymarket and the web, its repo says. v4.3.0, published 16 Nov at 23:57 UTC, leads entity topics "with their most interesting markets". 1,059 stars in a day on GitHub trending on 19 Nov, 70,140 in total; MIT. See [Claude Code skills](/blog/claude-code-skills/). [Source](https://github.com/mvanhorn/last30days-skill/releases/tag/v4.3.0)

## Top 2 moves from multi agent tools

1. **Paperclip v2026.1117.0.** Published 18 Nov at 22:20 UTC, it "carries 1,586 commits". "The Coordinator layout and Agent Chat are now standard", and task chat "shows what a Runner agent actually did". Planning runs put Codex and Claude "into their native plan mode", and **Approve** resumes the agent. The built in Google Workspace connector "is off by default". See [Paperclip alternatives](/blog/paperclip-alternatives/). [Source](https://github.com/paperclipai/paperclip/releases/tag/v2026.1117.0)
2. **Agent Relay v18.10.0.** Published 17 Nov at 19:17 UTC. It adds "support native GitHub Copilot desktop sessions" and lets "sessions in an organization's repositories join by themselves". For more tools like these, see [Herdr alternatives](/blog/herdr-alternatives/). [Source](https://github.com/AgentWorkforce/relay/releases/tag/v18.10.0)

## Top 2 rising repos

1. **ECC.** "The agent harness performance optimization system" for "Claude Code, Codex, Opencode, Cursor and beyond". No release since 1 Oct, but merges on 17 Nov add an "opt-in context-gate hook" and an "experimental native Antigravity plugin and hooks". 1,108 stars in a day on GitHub trending on 19 Nov, 306,634 in total; MIT. [Source](https://github.com/affaan-m/ECC)
2. **Cursor plugins.** "Official Cursor plugins for popular developer tools, frameworks, and SaaS products". Commits in the window added plugins for Expensify, Strava, FactSet and Close. 314 stars in a day on GitHub trending on 19 Nov, 17,274 in total; no license named. [Source](https://github.com/cursor/plugins)

Stars can rise for reasons other than use: names to watch, not picks.

## Top 4 things people are talking about

1. **How does the Claude Code team verify agent work?** With checks Claude runs itself, its post of 16 Nov says, including a skill called verify. "If a check is still failing after three rounds, Claude stops and brings in a human." The team keeps "a reliability checklist with 39 items". 292 points on [Hacker News](https://news.ycombinator.com/item?id=50529612), posted 17 Nov at 10:20 UTC. See [Claude Code hooks explained](/blog/claude-code-hooks-explained/). [Source](https://claude.dev/blog/how-the-claude-code-team-thinks-about-verification/)
2. **Does Windows 11 log which coding agents you use?** Xusheng Li says it does. Li's post, dated 16 Nov, finds `MissionControlAggregator.dll` checking for `claude.exe`, `codex.exe` and others, and says the data is uploaded to Microsoft "unless you have opted out of the “optional” diagnostic data (which is enabled by default)". Li found "no prompt text or source code in this report". 728 points on [Hacker News](https://news.ycombinator.com/item?id=50524736), posted 16 Nov at 22:58 UTC. [Source](https://xusheng.dev/posts/windows-coding-agent-telemetry/)
3. **Did coding agents move the bottleneck to review?** A Harvard working paper says so. [ComplexDiscovery reports](https://complexdiscovery.com/harvard-researchers-find-ai-coding-agents-shifted-the-bottleneck-to-code-review/), in its 13 Oct article on the paper's 4 Aug version, about 30 percent more code at adopting firms, no measurable rise in finished work, and review that "took 49 percent longer". The [current version](https://fion.ac/jellyfish.pdf), dated 14 Nov, gives different figures and says "Code review becomes the bottleneck." 320 points on [Hacker News](https://news.ycombinator.com/item?id=50538303), posted 17 Nov at 21:16 UTC. [Source](https://complexdiscovery.com/harvard-researchers-find-ai-coding-agents-shifted-the-bottleneck-to-code-review/)
4. **What is the best harness for each model?** It depends on the model, says Runta, whose post of 17 Nov ran 22 harnesses on 5 models. By cost per task, "Codex CLI went from 1st with GLM-5.3 to 16th with Kimi-K3": the vendor's own figures. 417 points on [Hacker News](https://news.ycombinator.com/item?id=50532191), posted 17 Nov at 14:53 UTC. [Source](https://runta.com/blog/introducing-frontierharness-eval-v1-1/)

## How this list is built

We read our scouts' 17 Nov reports from Google, Reddit and X, checked releases, Hacker News and GitHub trending ourselves, and rechecked every item on its own page. Points and stars were checked on 19 Nov. Cline, Browser Use, AionUi and Paradev shipped no stable release in the window. Codex, Gemini CLI, Qwen Code, OpenClaw and OpenHands shipped releases that are left out for space.

<link rel="stylesheet" href="/blog/assets/media/agent-tools-today-2026-11-19/motion.css"><script defer src="/blog/assets/media/agent-tools-today-2026-11-19/motion.js"></script>
