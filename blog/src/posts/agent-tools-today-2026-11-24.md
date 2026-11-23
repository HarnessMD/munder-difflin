---
title: "Agent Tools Today, 24 Nov 2026: GLM-5.4, OpenCode v2.4.0 and Shirudo"
seoTitle: "Agent Tools Today (24 Nov 2026): Launches, Skills, MCP Servers"
description: "The top launches, skills, multi agent moves, rising repos and talking points in AI agents from 21 to 24 Nov 2026, each with its source and date."
date: 2026-11-24
category: news
categoryLabel: News
type: Non-technical
series: agent-tools-today
primaryKeyword: "agent tools today 24 nov 2026"
secondaryKeywords: ["glm-5.4", "opencode v2.4.0", "shirudo", "claude code v2.1.331", "codex 0.172.0", "pandex mcp server"]
tags: ["Daily Brief", "OpenCode", "Codex", "Open Source"]
---

Agent tools today, 24 Nov 2026: Z.ai released GLM-5.4, its first Loop Transformer model, OpenCode v2.4.0 added a built in desktop browser, and OpenAI and Cisco launched Shirudo. It covers the three days since the 21 Nov brief, 21 Nov 04:00 UTC to 24 Nov 03:45 UTC, checked 24 Nov. Previous edition: [21 Nov](/blog/agent-tools-today-2026-11-21/).

<figure class="mg" data-scene="windmill"><img src="/blog/assets/media/agent-tools-today-2026-11-24/windmill.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, the blue sails of a yellow windmill turn slowly. Three lilac tiles beneath it read GLM 5.4, OpenCode and Shirudo. As a sail sweeps past each tile, the tile turns mint and its word brightens. Tapping a tile stops the sails and shows a soft white tag with its date, 23 Nov."><figcaption>The three lead items, from their own pages dated 23 Nov 2026, read 24 Nov 2026.</figcaption></figure>

## Top 5 launches

1. **GLM-5.4.** Z.ai's post of 23 Nov says it loops 28 layers of the GLM-5 base model for two iterations, at the 750B scale, and claims "intelligence levels comparable to 2T-3T parameter models". It runs now in the GLM Coding Plan, ZCode and Z.ai Chat. There is no API yet, and open weights are only planned. 1,080 points on [Hacker News](https://news.ycombinator.com/item?id=50609685), posted 23 Nov at 10:06 UTC. [Source](https://z.ai/blog/glm-5.4)
2. **OpenCode v2.4.0.** Published 23 Nov at 09:22 UTC. A built in desktop browser imports your logins from Chrome, Edge, Firefox or Safari, and "the agent can read and drive the same pages". Automations run on a timer, a cron schedule or an MCP server event, and when a connected provider has a video model, `generate_video` makes videos. More in [OpenCode 2.4](/blog/opencode-2-4/). [Source](https://github.com/anomalyco/opencode/releases/tag/v2.4.0)
3. **Shirudo.** OpenAI's post of 23 Nov calls it "an open-source runtime that helps operators protect running Linux systems without needing to wait for the patch or restarts". In a controlled test, a shield made with Codex blocked a Java4Shell exploit attempt on a running Elasticsearch service. 46 points on [Hacker News](https://news.ycombinator.com/item?id=50619630), posted 23 Nov at 21:30 UTC. More in [what Shirudo is](/blog/what-is-shirudo/). [Source](https://openai.com/index/introducing-shirudo/)
4. **Claude Code v2.1.331.** Published 23 Nov at 21:34 UTC. It adds Code Mode in terminal sessions on Amazon Bedrock, Microsoft Foundry and other clouds, an API check in `claude doctor`, and `optionalDependencies` for plugins. It fixes "MCP tool calls hanging for up to 30 minutes on some malformed replies from a local or WebSocket server". See [Claude Code Max plan tips](/blog/claude-code-max-plan-tips/). [Source](https://github.com/anthropics/claude-code/releases/tag/v2.1.331)
5. **Codex 0.172.0.** Published 24 Nov at 00:03 UTC. Optional stdio MCP servers with cached tool lists "now start on their first tool call by default", and you can set an approval reviewer for individual connected app tools in `config.toml`. The bundled `openai-docs` skill now covers migration to GPT-6.2 Astra and Sol. See [Codex alternatives](/blog/codex-alternatives/). [Source](https://github.com/openai/codex/releases/tag/rust-v0.172.0)

## Top 2 skills, MCP servers and plugins

1. **Pandex.** "Real law for AI agents", its site says, with legislation and court decisions from the bodies that publish them. You add it with `claude mcp add --transport http pandex https://api.pandex.io/mcp`, "No key needed to try the MCP server". It lists 8 jurisdictions live. 140 points on [Hacker News](https://news.ycombinator.com/item?id=50593481), posted 21 Nov at 20:47 UTC. See [how to add an MCP server to Claude Code](/blog/how-to-add-an-mcp-server-to-claude-code/). [Source](https://www.pandex.io)
2. **agent-browser v0.44.0.** Published 23 Nov at 22:44 UTC. It adds a Ladybird provider, and WebMCP announcements "now tell agents what the page's tools are and when to use them". An allowlist with no domain now "is an error" instead of turning containment off. See [OpenCode Browse vs agent-browser](/blog/opencode-browse-vs-agent-browser/). [Source](https://github.com/vercel-labs/agent-browser/releases/tag/v0.44.0)

## Top 3 moves from multi agent tools

1. **Orca v1.4.269 to v1.4.272.** Published 21 Nov 17:57 UTC to 23 Nov 12:35 UTC. In [v1.4.269](https://github.com/stablyai/orca/releases/tag/v1.4.269), bots run on eight more agents, among them Kiro, Gemini CLI and Goose, and when a bot names another member as @Name in a group room, "that member picks up the turn". In v1.4.272, conversations paused by usage limits "can continue automatically after an account switch or restart". See [Orca alternatives](/blog/orca-alternatives/). [Source](https://github.com/stablyai/orca/releases/tag/v1.4.272)
2. **Agent Relay v18.12.0 to v18.14.0.** Published 21 Nov 15:37 UTC to 24 Nov 00:06 UTC. In [v18.12.0](https://github.com/AgentWorkforce/relay/releases/tag/v18.12.0), question escalation "reaches Codex, Devin and Copilot", [v18.13.0](https://github.com/AgentWorkforce/relay/releases/tag/v18.13.0) adds an "MCP Events (SEP-3415) server and webhook receiver", and v18.14.0 adds "owner-named trusted delegates". For more tools like these, see [Herdr alternatives](/blog/herdr-alternatives/) and [Agent Relay alternatives](/blog/agent-relay-alternatives/). [Source](https://github.com/AgentWorkforce/relay/releases/tag/v18.14.0)
3. **OpenClaw 2026.11.7.** Published 23 Nov at 01:33 UTC. It recovers "interrupted replies and child results across Gateway restarts without losing pending work", and pairs another browser "with a short code approved on the Gateway host". Three changes are marked "breaking SDK change". See [OpenClaw alternatives](/blog/openclaw-alternatives/). [Source](https://github.com/openclaw/openclaw/releases/tag/v2026.11.7)

## Top 2 rising repos

1. **fast-anything.** Its repo says it will "profile Python, Node or Ruby apps, port the hot functions with your coding agent, prove they behave the same". Created 21 Nov; v0.8.6 was published 24 Nov at 00:12 UTC. 3,218 stars on 24 Nov; MIT. [Source](https://github.com/EL4CTEO/fast-anything)
2. **OpenSRE.** "The open-source agent for CI/CD reliability", its repo says. A commit on 22 Nov sets up MCP servers with `opensre integrations setup mcp`, and v0.1.2026.11.24 makes GPT-6.2 Sol the default for hosted turns. 436 stars in a day on GitHub trending on 24 Nov, 14,875 in total; Apache-2.0. [Source](https://github.com/Tracer-Cloud/opensre)

Stars can rise for reasons other than use: names to watch, not picks.

## Top 4 things people are talking about

1. **Did a Claude model find that VP ≠ VNP over every field?** Its README says so. Anthropic's formal-math repo calls it a result "discovered by an internal research Claude model"; the paper and its Lean 4 proof "were written by AI models, and no human mathematician has checked the proof". It "does not settle P vs NP". 282 points on [Hacker News](https://news.ycombinator.com/item?id=50620102), posted 23 Nov at 22:09 UTC. [Source](https://github.com/anthropics/formal-math/tree/main/vp-vnp)
2. **How much of Anthropic's power will come from gas?** About 87% in 2028, and 11% from coal, the Better Data Center Project estimates in its post of 16 Nov. It says "As of October 2026, Anthropic has contracted 15 GW of compute". These are the project's own estimates. 1,029 points on [Hacker News](https://news.ycombinator.com/item?id=50597612), posted 22 Nov at 08:57 UTC. [Source](https://betterdatacenterproject.com/2026/11/16/how-ai-is-powered-a-breakdown-of-byop-and-grid-power/)
3. **What did researchers find on inference providers?** Broken data policies at some, OpenRouter says. Its post of 22 Nov says security researchers reported that certain providers "had data compromised or otherwise shown evidence that their data policies were not being upheld", with no breach of OpenRouter itself. It "Off-boarded three providers" and removed 125 endpoints from Zero Data Retention eligibility. 294 points on [Hacker News](https://news.ycombinator.com/item?id=50595554), posted 22 Nov at 02:14 UTC. [Source](https://openrouter.ai/blog/announcements/data-processing-incidents-on-inference-providers/)
4. **Can a coding agent run on DOS?** ClawDOS does, its author Ricapar says. It "runs on an IBM PC XT: an 8088 at 4.77 MHz, 640K of RAM, a CGA card", with a "bridge" PC for TLS, and its 176 KB HARNESS.EXE "speaks the Claude Messages API itself". 175 points on [Hacker News](https://news.ycombinator.com/item?id=50586292), posted 21 Nov at 05:38 UTC. [Source](http://ricapar.net/ClawDOS/)

## How this list is built

We checked releases, the Hacker News front page and GitHub trending ourselves, used one scout's notes on Google sources as leads, and rechecked every item on its own page. Points and stars were checked on 24 Nov. Gemini CLI v0.71.0 and the OpenAI Agents SDK v0.26.0 made only small changes. OpenHands v1.44.0, Browser Use 1.0.8 and the NariQ quantized Qwen model are left out for space.

<link rel="stylesheet" href="/blog/assets/media/agent-tools-today-2026-11-24/motion.css"><script defer src="/blog/assets/media/agent-tools-today-2026-11-24/motion.js"></script>
