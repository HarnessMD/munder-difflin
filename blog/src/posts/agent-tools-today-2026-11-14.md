---
title: "Agent Tools Today, 14 Nov 2026: llama.cpp 1.0, OpenCode 2.3 and Two Claude Outages"
seoTitle: "Agent Tools Today (14 Nov 2026): Launches, Skills, MCP Servers"
description: "The top launches, skills, multi agent moves, rising repos and talking points in AI agents from 13 to 14 Nov 2026, each with its source and date."
date: 2026-11-14
category: news
categoryLabel: News
type: Non-technical
series: agent-tools-today
primaryKeyword: "agent tools today 14 nov 2026"
secondaryKeywords: ["llama.cpp 1.0", "opencode 2.3", "codex 0.169.0", "claude code 2.1.325", "copilot cli 1.0.112", "browser hands mcp"]
tags: ["Daily Brief", "llama.cpp", "OpenCode", "Claude Code"]
---

Agent tools today, 14 Nov 2026, in one line: llama.cpp reached v1.0.0, OpenCode 2.3 made background subagents the default, and Claude had two outages on 13 Nov, the first with 488 Hacker News points. It covers 13 Nov 04:00 UTC to 14 Nov 04:00 UTC, checked 14 Nov. Previous edition: [13 Nov](/blog/agent-tools-today-2026-11-13/).

<figure class="mg" data-scene="typewriter"><img src="/blog/assets/media/agent-tools-today-2026-11-14/typewriter.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a blue typewriter types three lines on a lilac sheet: Llama, OpenCode and Outage. Its mint keys press down in turn and each word appears letter by letter. Tapping a line slides the carriage back to it and shows the date 13 Nov beside it."><figcaption>The day's three lead items, from the llama.cpp and OpenCode release pages and Claude's status page, read 14 Nov 2026.</figcaption></figure>

## Top 3 launches

1. **llama.cpp v1.0.0.** Published 13 Nov at 10:20 UTC. The notes say it "removes the deprecated public API", adds a `/v1/audio/speech` endpoint and hardens `llama-server`. The ggml-org [post of 13 Nov](https://huggingface.co/blog/ggml-org/llama-cpp-v1) says llama.cpp and ggml "will reflect API and ABI incompatibilities with major-version bumps". ggml v1.0.0 was tagged the same day, with 60 points on [Hacker News](https://news.ycombinator.com/item?id=50493062) by 14 Nov. Our page covers [llama.cpp 1.0](/blog/llama-cpp-1-0/). [Source](https://github.com/ggml-org/llama.cpp/releases/tag/v1.0.0)
2. **OpenCode v2.3.0.** Published 13 Nov at 08:55 UTC. "Subagents now return immediately, continue in the background, and report back whenever they become idle." The TUI folds each run of tool calls and thoughts "into one collapsible activity row"; set Verbosity to `medium` or `high` to see every step. MCP events sit behind the experimental `mcp_events` flag. Our page covers [OpenCode 2.3](/blog/opencode-2-3/). [Source](https://github.com/anomalyco/opencode/releases/tag/v2.3.0)
3. **Codex 0.169.0.** Published 13 Nov at 08:37 UTC. "The opt-in terminal workspace supports multiple side-chat tabs", and you can search older tasks from the agent command center. `codex exec` now keeps project configuration and MCP servers disabled in untrusted directories, even with `--sandbox workspace-write`. See [Codex alternatives](/blog/codex-alternatives/). [Source](https://github.com/openai/codex/releases/tag/rust-v0.169.0)

## Top 4 skills, MCP servers and plugins

1. **Browser Hands.** A Chrome extension plus a local MCP server that lets Claude Code, Codex, Cursor and other agents "drive the Chrome you already use", each session in its own tab group. Agents "are told to stop before final submit, payment, send and delete". The README lists macOS as a requirement; Linux is "experimental and untested". v0.2.0 shipped 13 Nov at 05:39 UTC; MIT, 15 stars by 14 Nov. See [what an MCP server is](/blog/what-is-an-mcp-server/). [Source](https://github.com/214140846/browser-hands)
2. **Claude Trading Skills.** A skills toolkit for "time-constrained individual investors". The README says "The goal is not to outsource buy/sell decisions to AI" and "It is not financial advice". 69 stars in a day on GitHub trending on 14 Nov, 4,247 in total; MIT. See [Claude Code skills](/blog/claude-code-skills/). [Source](https://github.com/tradermonty/claude-trading-skills)
3. **Harness Tuner.** Kiln's loop to "Tune your agent's harness: tools, prompts, skills, model and hyperparams". The README reports "2.5x fewer failures, 6x cheaper, 2x lower latency" for one production agent: the vendor's own figures. Its Show HN, posted 13 Nov, had 5 points by 14 Nov; MIT, 10 stars. [Source](https://github.com/Kiln-AI/harness-tuner)
4. **Chrome DevTools MCP.** No release in the window, but two features merged to its main branch on 13 Nov: "list errors a page raises while a tool runs" and inline CSS variable values in `get_css_styles`. 67 stars in a day on GitHub trending on 14 Nov, 55,572 in total. [Source](https://github.com/ChromeDevTools/chrome-devtools-mcp)

## Top 4 moves from multi agent tools

1. **Claude Code v2.1.325.** Published 13 Nov at 20:40 UTC. Sandboxed Bash commands now "follow the normal permission flow by default"; set `sandbox.autoAllowBashIfSandboxed: true` to keep them running without prompts. Scheduled tasks and `/loop` now ask before running a skill that declares `allowed-tools` or hooks. See [Claude Code Max plan tips](/blog/claude-code-max-plan-tips/). [Source](https://github.com/anthropics/claude-code/releases/tag/v2.1.325)
2. **GitHub Copilot CLI v1.0.111.** Published 13 Nov at 13:40 UTC. Permission prompts now show "directly in the sub-agent view", and with experimental dynamic workflows "a workflow can no longer start copies of itself without limit when all tools are allowed". Not a sentence you read in every changelog. [Source](https://github.com/github/copilot-cli/releases/tag/v1.0.111)
3. **GitHub Copilot CLI v1.0.112.** Published 13 Nov at 23:59 UTC. "Subagents now respect the session-wide AI credit limit set with `--max-ai-credits`", and the CLI uses "each model's recommended context window by default". [Source](https://github.com/github/copilot-cli/releases/tag/v1.0.112)
4. **Plannotator v0.28.63.** Published 13 Nov at 11:11 UTC. It "brings personal and cloud agents into the Inbox": from Settings you can pair Grok Bot, a Claude Code routine or an OpenClaw server. A paired agent "cannot answer your questions, approve anything, run anything on your computer". 108 stars in a day on GitHub trending on 14 Nov. [Source](https://github.com/backnotprop/plannotator/releases/tag/v0.28.63)

## Top 2 rising repos

1. **Open Code Review.** Alibaba's "Hybrid architecture code review tool: deterministic pipelines + LLM Agent, precise line-level comments". v1.13.9 shipped 13 Nov at 09:47 UTC. 215 stars in a day on GitHub trending on 14 Nov, 50,760 in total; Apache-2.0. [Source](https://github.com/alibaba/open-code-review)
2. **Buzz.** Block's "workspace where humans and agents build together, on a relay you own." Desktop v0.5.30, published 14 Nov at 00:31 UTC, is mostly mobile speed work. 97 stars in a day on GitHub trending on 14 Nov, 37,328 in total; Apache-2.0. [Source](https://github.com/block/buzz)

Stars can rise for reasons other than use: names to watch, not picks.

## Top 3 things people are talking about

1. **Was Claude down on 13 Nov?** Twice, says Anthropic's status page. From 09:58 to 11:58 UTC it recorded errors on claude.ai, Claude Code and platform.claude.com, which began as "an issue with users authenticating to Claude.ai and Claude Code". A [second incident](https://status.claude.com/incidents/34wq7gxnxvvm), from 13:09 to 15:38 UTC, hit claude.ai, the Claude API and Claude Code, with connectors and Claude Managed Agents degraded for part of it. Both are marked resolved. The first drew 488 points on [Hacker News](https://news.ycombinator.com/item?id=50481187) by 14 Nov. [Source](https://status.claude.com/incidents/nn11wk485zfn)
2. **What is the No AI Slop manifesto?** A list of values "Written by the speakers and attendees of AIE Code Summit 2026". It warns that "a swarm of agents can produce more work in a single day than a person can review in our lifetime". The page carries no date; its Hacker News post, from 13 Nov at 19:51 UTC, had 189 points by 14 Nov. [Source](https://www.slopmanifesto.com/)
3. **Is AI research next after math?** Dwarkesh Patel thinks so. His essay, published 13 Nov at 18:37 UTC, says "we're only a couple of years away, and possibly only a couple of months away, from AIs that are as good as the best humans at AI research." His forecast, not a launch. 61 points on [Hacker News](https://news.ycombinator.com/item?id=50487854) by 14 Nov. [Source](https://www.dwarkesh.com/p/rsi)

## How this list is built

We read our scout's report from Google, Reddit and Hacker News, checked releases, Hacker News and GitHub trending ourselves, and rechecked every item on its own page. A name only makes a list with an opened link and a signal: points, stars or a dated release. Gemini CLI, Goose, Pi, Paperclip, AionUi, Cline and OpenClaw shipped no stable release in the window; T3 Code and Crush shipped only nightlies. Replit's commerce post and Claude Meetings are dated 12 Nov. Reuters and The Atlantic refused our requests.

<link rel="stylesheet" href="/blog/assets/media/agent-tools-today-2026-11-14/motion.css"><script defer src="/blog/assets/media/agent-tools-today-2026-11-14/motion.js"></script>
