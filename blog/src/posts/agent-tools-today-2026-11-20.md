---
title: "Agent Tools Today, 20 Nov 2026: Codex 0.171.0, Claude Code v2.1.329 and Claude on Black Holes"
seoTitle: "Agent Tools Today (20 Nov 2026): Launches, Skills, MCP Servers"
description: "The top launches, skills, multi agent moves, rising repos and talking points in AI agents from 19 to 20 Nov 2026, each with its source and date."
date: 2026-11-20
category: news
categoryLabel: News
type: Non-technical
series: agent-tools-today
primaryKeyword: "agent tools today 20 nov 2026"
secondaryKeywords: ["codex 0.171.0", "claude code v2.1.329", "crush v0.102.0", "orca bots", "onlook 2.0", "models engineering index"]
tags: ["Daily Brief", "Codex", "Claude Code", "Anthropic"]
---

Agent tools today, 20 Nov 2026: Codex 0.171.0 makes GPT-6.2 Sol its default catalog selection, Claude Code v2.1.329 warns where a folder's hooks are declared, and Anthropic says Claude agents solved two open physics problems on black holes. It covers 19 Nov 04:00 UTC to 20 Nov 04:00 UTC, checked 20 Nov. Previous edition: [19 Nov](/blog/agent-tools-today-2026-11-19/).

<figure class="mg" data-scene="metronome"><img src="/blog/assets/media/agent-tools-today-2026-11-20/metronome.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, the blue arm of a yellow metronome swings slowly from side to side. Three lilac tiles beneath it read Codex, Claude Code and Black holes. As the arm passes over each tile, the tile turns mint and its word brightens. Tapping a tile stops the arm and shows a soft white tag with its date: 20 Nov, 19 Nov or 17 Nov."><figcaption>The three lead items, from the Codex and Claude Code release notes and Anthropic's post, read 20 Nov 2026.</figcaption></figure>

## Top 5 launches

1. **Codex 0.171.0.** Published 20 Nov at 00:44 UTC. It adds "GPT-6.2 Sol and Astra to model catalogs, with Sol as the default catalog selection". The TUI workspace is now on by default, "with searchable document previews, image previews, and subagent transcripts alongside the main conversation". `codex exec --remote <ADDR>` starts or resumes noninteractive sessions on an existing app server. See [Codex alternatives](/blog/codex-alternatives/). [Source](https://github.com/openai/codex/releases/tag/rust-v0.171.0)
2. **Claude Code v2.1.329.** Published 19 Nov at 22:14 UTC. It adds "a trust dialog warning that says where a folder's hooks are declared", and `/tasks` now lists scheduled tasks, `/loop` wakeups and forks. A remote HTTP MCP server that refuses the connection gets a "Server message" row in `/mcp`. It fixes `~/.claude.json` "sometimes being reset to defaults" after a network stall or file lock. See [Claude Code hooks explained](/blog/claude-code-hooks-explained/). [Source](https://github.com/anthropics/claude-code/releases/tag/v2.1.329)
3. **Crush v0.102.0.** Published 19 Nov at 17:30 UTC. You can now replace the system prompts, "not just the main agent but prompts for subagents, planning, compaction, session titles and `crush init`", with `--prompt name=path` or `option prompt` in config. Channels, "an experimental MCP feature from Claude", "allow MCP servers to push events into your session as they happen". The server now blocks "dns rebinding and cross-site tcp requests". Less urgent: a KITT theme. For more open source agents, see [Aider alternatives](/blog/aider-alternatives/) and [goose alternatives](/blog/goose-alternatives/). [Source](https://github.com/charmbracelet/crush/releases/tag/v0.102.0)
4. **OpenClaw 2026.11.6.** Published 19 Nov at 17:26 UTC. It keeps "subagent and background turns running through configuration edits" and delivers final answers "when a Gateway restart interrupted sending". It cuts "startup memory pressure and resident memory on constrained hosts", and redacts "inline environment credentials in configuration reads". See [OpenClaw alternatives](/blog/openclaw-alternatives/). [Source](https://github.com/openclaw/openclaw/releases/tag/v2026.11.6)
5. **Hermes Agent v0.23.3.** Published 20 Nov at 00:34 UTC. A "Patch release" that "rolls up the ~370 PRs merged since v0.23.2" for the CLI, installers, the Microsoft Store app, Docker and Hermes Cloud. The notes list, without detail, "GPT-6.2 Astra and Sol (+ Pro) on OpenRouter and Nous Portal" and "compaction of idle chats before the 1h cache expires". Full notes "ship with v0.24.0". See [Hermes Agent alternatives](/blog/hermes-agent-alternatives/). [Source](https://github.com/NousResearch/hermes-agent/releases/tag/v0.23.3)

## Top 2 skills, MCP servers and plugins

1. **Firecrawl Local.** A README change on 19 Nov at 17:49 UTC puts Firecrawl Local first: "one binary that turns websites into clean markdown, plugs into your AI agent as an MCP server and serves the Firecrawl API on localhost". It installs with `cargo install firecrawl-local` and needs Rust and a C compiler. Another commit in the window removes "the hosted bash endpoint at /v2/bash". 825 stars in a day on GitHub trending on 20 Nov, 204,375 in total; AGPL-3.0. See [what an MCP server is](/blog/what-is-an-mcp-server/). [Source](https://github.com/firecrawl/firecrawl)
2. **Cloudflare Computer 0.11.4.** "Give your agent a computer": a virtual filesystem inside a Durable Object, with a Computer MCP example of "one Code Mode `code` tool backed by a durable workspace, a Worker shell, and a full Linux container", its repo says. Version 0.11.4, published 19 Nov at 20:52 UTC, adds "passthrough mounts, which serve files straight from your own source without storing them in the workspace". 9,937 stars; MIT. [Source](https://github.com/cloudflare/computer/releases/tag/%40cloudflare/computer%400.11.4)

## Top 4 moves from multi agent tools

1. **Orca v1.4.265.** Published 19 Nov at 23:41 UTC, it introduces Orca Bots, which "work like first-class teammates". Managed agent sessions "are no longer limited to Claude and Codex", a Slack thread "reflects what its turn is working on", and Gmail triggers match "the sender's actual address". The new **Automatic updates** setting "defaults to off". See [Orca alternatives](/blog/orca-alternatives/). [Source](https://github.com/stablyai/orca/releases/tag/v1.4.265)
2. **Agent Relay v18.11.0.** Published 19 Nov at 15:32 UTC. Question escalation routes "Claude Code's AskUserQuestion to an inbox" so you can "type the answer back". It also lets "desktop spawns fork a Grok session" and adds a "shared memory-aware spawn placement policy". For more tools like these, see [Herdr alternatives](/blog/herdr-alternatives/) and [Agent Relay alternatives](/blog/agent-relay-alternatives/). [Source](https://github.com/AgentWorkforce/relay/releases/tag/v18.11.0)
3. **Paradev desktop v2.0.10.** Published 19 Nov at 06:54 UTC; GitHub now sends the old superset-sh/superset address to ParadevAI/Paradev. Paradev now tells clients "when a cloud workspace's sandbox is asleep", the desktop gets "the redesigned shell's finished look, with the command palette rework", and the composer merges "the agent picker into the model picker". See [Paradev alternatives](/blog/paradev-alternatives/). [Source](https://github.com/ParadevAI/Paradev/releases/tag/desktop-v2.0.10)
4. **crewAI 1.15.44.** Published 19 Nov at 17:59 UTC. It adds the "capability to save files as versioned, shareable artifacts", teaches the flow skill "to save and read artifacts", and enforces "cwd containment for all FilePath paths". See [CrewAI and AutoGen vs a local agent harness](/blog/crewai-autogen-vs-a-local-agent-harness/). [Source](https://github.com/crewAIInc/crewAI/releases/tag/1.15.44)

## Top rising repo

1. **Onlook 2.0.** Onlook is "a free, open-source editor for designers and visual engineers who shape their product in real code", its release notes say. The desktop app includes "the layer that runs Claude Code or ChatGPT on your Mac" and works with the Claude or ChatGPT subscription you already have. v2.0.2 was published 19 Nov at 16:47 UTC. Its Launch HN had 91 points on [Hacker News](https://news.ycombinator.com/item?id=50562320), posted 19 Nov at 16:34 UTC. 27,434 stars; Apache-2.0. [Source](https://github.com/onlook-dev/onlook/releases/tag/v2.0.2)

Stars can rise for reasons other than use: names to watch, not picks.

## Top 2 things people are talking about

1. **Black holes, solved by an agent team?** Anthropic says so. Its post, dated 17 Nov, says Claude "has solved two open problems in theoretical physics", both about black holes. Asked for open problems, Claude "came back hours later with 22 candidates"; separate agents worked on them "for about six weeks". The results "were formally verified in Lean", and "a physicist checked every main result". This is Anthropic's own account. 422 points on [Hacker News](https://news.ycombinator.com/item?id=50563148), posted 19 Nov at 17:30 UTC. [Source](https://www.anthropic.com/research/claude-black-hole-physics)
2. **Which model leads on engineering tasks?** Gemini 4 Neon, on one ranking. Mei, the Models Engineering Index, ranks Neon first at 68.0, ahead of Claude Fable 5.2 at 65.3 and GPT-6.2 Astra at 61.5, on data from Cognition, Cursor, the Laude Institute and Vals AI. Its own caveat: "there are no error bars, so small gaps are not meaningful". 213 points on [Hacker News](https://news.ycombinator.com/item?id=50568130), posted 19 Nov at 23:35 UTC. See [Gemini 4 Neon](/blog/gemini-4-neon/). [Source](https://git-aarvin.github.io/mei/)

## How this list is built

We read our scout's report from Google, Reddit and GitHub for 19 Nov, checked releases, Hacker News and GitHub trending ourselves, and rechecked every item on its own page. Points and stars were checked on 20 Nov. Gemini CLI v0.70.0, LangGraph 1.2.23 and 1.2.24 and LiteLLM v1.110.1 shipped only small changes; OpenWork v0.18.69 and v0.18.71 changed packaging, and emdash v1.2.13 shipped without notes.

<link rel="stylesheet" href="/blog/assets/media/agent-tools-today-2026-11-20/motion.css"><script defer src="/blog/assets/media/agent-tools-today-2026-11-20/motion.js"></script>
