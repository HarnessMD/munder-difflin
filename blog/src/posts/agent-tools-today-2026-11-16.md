---
title: "Agent Tools Today, 16 Nov 2026: Qwen4-Max, Browser Use 1.0.6 and an Open Source Essay"
seoTitle: "Agent Tools Today (16 Nov 2026): Launches, Skills, MCP Servers"
description: "The top launches, skills, multi agent moves, rising repos and talking points in AI agents from 15 to 16 Nov 2026, each with its source and date."
date: 2026-11-16
category: news
categoryLabel: News
type: Non-technical
series: agent-tools-today
primaryKeyword: "agent tools today 16 nov 2026"
secondaryKeywords: ["qwen4-max", "browser-use 1.0.6", "qwen code 0.27.4", "tokeneconomizer", "paradev 2.0.9", "agent relay 18.8.0"]
tags: ["Daily Brief", "Qwen", "Browser Use", "Paradev"]
---

Agent tools today, 16 Nov 2026, in one line: Qwen launched Qwen4-Max, Browser Use 1.0.6 made a pricier model its default, and the essay "All AI-generated code should be Open Source" passed 1,100 Hacker News points. It covers 15 Nov 04:00 UTC to 16 Nov 04:00 UTC, checked 16 Nov. Previous edition: [15 Nov](/blog/agent-tools-today-2026-11-15/).

<figure class="mg" data-scene="pinwheel"><img src="/blog/assets/media/agent-tools-today-2026-11-16/pinwheel.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a pinwheel on a blue stick turns slowly around a yellow hub. Its three lilac blades read Qwen, Browser and Open Source. As each blade reaches the top, it turns mint and its word brightens. Tapping a blade stops the pinwheel and shows a sky tag with its date, 16 Nov or 15 Nov."><figcaption>The day's three lead items, from Qwen's post and the Browser Use release notes of 16 Nov and the essay's Hacker News post of 15 Nov, read 16 Nov 2026.</figcaption></figure>

## Top 3 launches

1. **Qwen4-Max.** Qwen's blog post, dated 16 Nov, introduces Qwen4-Max, built on the new Qwen4 architecture "with a 2.4-trillion-parameter backbone, native vision capabilities, and a one-million-token context window". It "is now available on QwenCloud", through "either the Token Plan or the API". Qwen says it has "lowered API prices compared with Qwen3.8-Max", and puts the average cost per task in its Work360 evaluation at $1.67, down from $4.43, in the 16 Nov post. Benchmarks and costs are the vendor's own figures. It also says "Smaller models in the family are coming to open source". 150 points on [Hacker News](https://news.ycombinator.com/item?id=50513215) by 16 Nov, posted at 02:14 UTC. [Source](https://qwen.ai/blog?id=qwen4-max)
2. **Browser Use 1.0.6.** Published 16 Nov at 00:51 UTC. "BU 4.0 is the default model": `Agent(task)` and `ChatBrowserUse()` now run `bu-4.0` instead of `bu-fast`. The notes warn "This costs more if you pass no `llm`". The 16 Nov notes list BU 4.0 at $1.80 per million input tokens and $9.00 per million output, against $0.12 and $0.60 for `bu-fast`: "15 times as much". To keep the old model and price, pass `llm='bu-fast'`. [Source](https://github.com/browser-use/browser-use/releases/tag/1.0.6)
3. **Qwen Code v0.27.4.** Published 15 Nov at 07:04 UTC; desktop v0.27.4 followed at 08:43 UTC. "Auto Mode now requires explicit authorization for risky actions" and "visibly marks Full Access". You can "Send outputs to Feishu and WeCom webhooks", and Managed Agent sessions get "an interactive Managed Web Terminal". [Source](https://github.com/QwenLM/qwen-code/releases/tag/v0.27.4)

## Top 3 skills, MCP servers and plugins

1. **TokenEconomizer.** A plugin from UC Berkeley and Microsoft "makes coding agents cheaper to run in the repositories you work in often, without changing the agent itself", its README says. It learns repo facts, drops unused tools and nudges stuck turns, though "it never stops a turn itself". It works with Claude Code, Codex, GitHub Copilot CLI and Pi. The README, read 16 Nov, reports 18.4 to 30.9% lower mean cost on SWE-Bench tasks across five agent and model setups: the authors' own figures. No release since v0.1.0 on 26 Oct, but a [commit](https://github.com/microsoft/TokenEconomizer/commit/ad31993df391232092f9ac80f675b122076d7f93) at 02:02 UTC on 16 Nov runs the loop guard's judge "on Apple's on-device model". Created 13 Oct; Apache-2.0, 6,631 stars by 16 Nov. See [what Claude Code costs](/blog/how-much-does-claude-code-cost/). [Source](https://github.com/microsoft/TokenEconomizer)
2. **turbo-browser-mcp.** A Playwright based MCP server "built to cut LLM token waste and multi-turn latency in browser automation", with 10 batched tools and "a default human-in-the-loop Submit guard". v0.5.0 was committed 15 Nov at 14:05 UTC. Its README reports a 98.4% token saving for a delta snapshot after a click, against a full ARIA rescan: the author's own figures, read 16 Nov. Its Show HN, posted 15 Nov at 04:09 UTC, had 47 points by 16 Nov. Created 14 Nov; MIT, 110 stars. See [what an MCP server is](/blog/what-is-an-mcp-server/). [Source](https://github.com/Tthanh2k6/turbo-browser-mcp)
3. **NVIDIA SkillEvaluator.** It "checks AI agent skills and measures their effect on task results". No release in the window (v0.9.0 shipped 13 Nov), but 37 commits landed in it, one moving "the nv_build default model to Nemotron 3.5 Lightning". 122 stars in a day on GitHub trending on 16 Nov, 1,821 in total; created 24 Jun; Apache-2.0. See [Claude Code skills](/blog/claude-code-skills/). [Source](https://github.com/NVIDIA/SkillEvaluator)

## Top 2 moves from multi agent tools

1. **Paradev desktop v2.0.9.** Published 15 Nov at 21:13 UTC by Paradev, formerly Superset. It adds "stacked merge, merge queue, and restack for pull requests", lets you "keep talking while background subagents run", and can "move a workspace to the cloud from any of your computers". The mobile app gets "Android and web support". See [Paradev alternatives](/blog/paradev-alternatives/). [Source](https://github.com/ParadevAI/Paradev/releases/tag/desktop-v2.0.9)
2. **Agent Relay v18.8.0.** Published 16 Nov at 00:22 UTC. Relay can now "wake idle Copilot CLI and Gemini CLI sessions on each post", and the same for "Factory Droid, Cursor CLI and Amp sessions". Its Chief execution bridge now refreshes "the repository checkout before each spawn". For more tools like these, see [Herdr alternatives](/blog/herdr-alternatives/) and [Agent Relay alternatives](/blog/agent-relay-alternatives/). [Source](https://github.com/AgentWorkforce/relay/releases/tag/v18.8.0)

## Top 2 rising repos

1. **AG-UI.** "The Agent-User Interaction Protocol", an "open, lightweight, event-based protocol that standardizes how AI agents connect to user-facing applications", its README says. No commits in the window. 355 stars in a day on GitHub trending on 16 Nov, 18,041 in total; MIT. See [what A2UI is](/blog/what-is-a2ui/). [Source](https://github.com/ag-ui-protocol/ag-ui)
2. **Stitch Skills.** Google Labs' "collection of agent skills and plugins for Google Stitch". Its last push was 17 Aug, so the stars are the news: 247 in a day on GitHub trending on 16 Nov, 9,396 in total; Apache-2.0. [Source](https://github.com/google-labs-code/stitch-skills)

Stars can rise for reasons other than use: names to watch, not picks.

## Top 2 things people are talking about

1. **Should all AI code be open source?** Jakub T. Jankiewicz says yes. His essay says "all code generated by AI should be Open Source", says turning the open code that models learned from into closed code "feels like license laundering", and argues that "purely AI-generated code is not written by a human, meaning it should not be copyrightable". The page carries no date; its Hacker News post, from 15 Nov at 14:46 UTC, had 1,113 points by 16 Nov. See [open source AI agents](/blog/open-source-ai-agents/). [Source](https://jakub.jankiewicz.org/blog/ai-code-open-source/)
2. **Will your agent pick your next gadget?** Geoff Stearns thinks so. His post, dated 15 Nov, says "Ask your agent which TV, router, or synth to get, and it will lean toward the one it can change". His example is the M-Vave FM-1 synth, whose maker, he writes, published its firmware "as open source under GPLv3" in October. His forecast, not a launch. 74 points on [Hacker News](https://news.ycombinator.com/item?id=50510799), posted 15 Nov at 21:10 UTC. [Source](https://geoffstearns.com/blog/your-agent-will-pick-the-hackable-one/)

## How this list is built

We read our scout's report from X, checked releases, Hacker News and GitHub trending ourselves, and rechecked every item on its own page. A name only makes a list with an opened link and a signal: points, stars or a dated release. Points and stars were checked on 16 Nov. Claude Code, Codex, Gemini CLI, OpenCode, Copilot CLI, Cline, Paperclip, AionUi and OpenClaw shipped no stable release in the window. Claude BugHunter's one commit in the window refreshed a star chart.

<link rel="stylesheet" href="/blog/assets/media/agent-tools-today-2026-11-16/motion.css"><script defer src="/blog/assets/media/agent-tools-today-2026-11-16/motion.js"></script>
