---
title: "Agent Tools Today, 9 Nov 2026: Orca Git Graph, Goodbye Claude for Pi, Goldman Pulls Claude Code"
seoTitle: "Agent Tools Today (9 Nov 2026): Launches, Skills, MCP Servers"
description: "The top launches, skills, multi agent moves, rising repos and talking points in AI agents from 8 to 9 Nov 2026, each with its source and date."
date: 2026-11-09
category: news
categoryLabel: News
type: Non-technical
series: agent-tools-today
primaryKeyword: "agent tools today 9 nov 2026"
secondaryKeywords: ["orca 1.4.254 git graph", "goodbye claude hello pi", "goldman sachs claude code", "opencode browse mcp", "llama-modchip", "headless agent skill"]
tags: ["Daily Brief", "Orca", "Skills", "MCP"]
---

Agent tools today, 9 Nov 2026, in one line: Orca 1.4.254 adds a Git Graph, "Goodbye Claude, hello Pi" drew 711 Hacker News points, and State of AI reports Goldman Sachs is pulling Claude Code from bankers and traders. It covers 8 Nov 04:00 UTC to 9 Nov 04:00 UTC, checked 9 Nov. Previous edition: [8 Nov](/blog/agent-tools-today-2026-11-08/).

<figure class="mg" data-scene="rolodex"><img src="/blog/assets/media/agent-tools-today-2026-11-09/rolodex.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a desk rolodex with blue, lilac and mint cards turns and stops on three cards in turn. They read Git Graph, Hello Pi and Goldman. Each card tips forward a little as it stops. Tapping a card turns the wheel to the next card and shows the date 9 Nov on it."><figcaption>The day's three lead items, from the Orca 1.4.254 release notes, the Hacker News front page and State of AI's report, read 9 Nov 2026.</figcaption></figure>

## Top 2 launches

1. **OpenCode Browse.** Our last edition missed it: its repo shows four releases on 7 Nov, UTC. OpenCode's page calls it "An MCP server and a Chromium extension that let your agents use your real browser, with your tabs, your logins and your extensions." For "a login, a 2FA prompt or a payment, they hand the tab back to you". In v0.0.16, published 8 Nov at 19:59 UTC, "Pi is a supported agent in `browse install`." MIT, 355 stars on 9 Nov. See [OpenCode alternatives](/blog/opencode-alternatives/). [Source](https://opencode.ai/product/browse)
2. **llama-modchip.** Posted to Hacker News on 8 Nov at 10:22 UTC as "Llama-modchip: 284B DeepSeek on 64GB RAM, no GPU", with 382 points by 9 Nov. The README lists 44.36 tok/s prefill for the 284B model on a 16 core Zen 5 CPU and "0" GPUs required. These are the vendor's own figures. `./modchip claude` "Launches Claude Code CLI (`40 tools`) wired to the local 256K engine". Apache 2.0, created 29 Oct, 534 stars on 9 Nov. [Source](https://github.com/synchopate/llama-modchip)

## Top 3 skills, MCP servers and plugins

1. **headless.** "Agent skill that sets up a headless Mac, Linux or Windows machine over SSH, step by step, without ever seeing the admin password." The README says "The admin password stays in your secret store; the agent only ever names the entry." Install with `npx skills add kunchenguid/headless -g`. MIT, created 7 Nov, 135 stars on 9 Nov. See [Claude Code skills](/blog/claude-code-skills/). [Source](https://github.com/kunchenguid/headless)
2. **tinker-ai-skill.** "Agent Skill for fine-tuning an agentic model on your own Claude Code sessions with Tinker. Works in Claude Code, Codex and OpenCode." The README says "The agent takes it from there and stops before anything that costs money." MIT, created 7 Nov, 267 stars on 9 Nov. [Source](https://github.com/drost-ai/tinker-ai-skill)
3. **Orca's Activity Monitor plugin.** By aamonnaig4, updated 6 Nov on Orca's plugin directory, which our last editions missed. "Live CPU cores, memory, network, disk, GPU and processes in Orca's sidebar, with a health strip that warns before your computer locks up." It "Requires Orca 1.4.248 or later" and is marked "Community · unreviewed". The page warns: "Install only if you trust the author." [Source](https://www.onorca.dev/plugins/aamonnaig4/orca-plugins/activity-monitor)

## Top 5 moves from multi agent tools

1. **Orca 1.4.254.** Published 8 Nov at 23:25 UTC. "A new Git Graph tab shows local and remote branches and tags, with each commit's details and changed files." In Chat UI, "`/btw` asks a side question in a fork beside the chat while the original keeps running". New repos now prompt once: "Orca asks whether to trust the repo or let each agent ask for itself." Orca also appears in our [herdr alternatives](/blog/herdr-alternatives/). [Source](https://github.com/stablyai/orca/releases/tag/v1.4.254)
2. **T3 Code nightly 20261109.4392.** A nightly, published 9 Nov at 01:00 UTC, with real changes: "Idle parent threads can resume when delegated results arrive after their run has ended." The 8 Nov nightly 4367 adds "Move a scheduled task to another thread without recreating it or losing its history." See [T3 Code alternatives](/blog/t3-code-alternatives/). [Source](https://github.com/pingdotgg/t3code/releases/tag/v0.1.8-nightly.20261109.4392)
3. **Paradev desktop v2.0.6.** Published 8 Nov at 06:22 UTC. The notes list "connect multiple GitHub organizations to one Paradev organization", "remove Beta labels from cloud workspaces and the CLI" and "keep a chat's permission mode across resume, fork and recovery". See [Paradev alternatives](/blog/paradev-alternatives/). [Source](https://github.com/ParadevAI/Paradev/releases/tag/desktop-v2.0.6)
4. **OpenClaw 2026.11.2.** Published 8 Nov at 19:31 UTC. The highlights: "Keep configuration secrets, conversation content, tool errors, and channel payloads out of diagnostic logs", and "release MCP grants after warm CLI turns." See [OpenClaw alternatives](/blog/openclaw-alternatives/). [Source](https://github.com/openclaw/openclaw/releases/tag/v2026.11.2)
5. **crewAI 1.15.38.** Published 8 Nov at 19:39 UTC. The first feature line: "Make gpt-6-luna crewAI's default model everywhere". It also adds "--no-open to crewai eval for headless use". [Source](https://github.com/crewAIInc/crewAI/releases/tag/1.15.38)

## Top 2 rising repos

1. **Anthropic's skills.** "Public repository for Agent Skills". 189,784 stars, 792 in a day on GitHub trending on 9 Nov. [Source](https://github.com/anthropics/skills)
2. **phoneuse.** "phoneuse lets a Linux PC see and operate an unmodified iPhone." An agent can drive it "from the command line or over MCP". The README warns: "Under heavy construction." MIT, created 7 Nov, 459 stars on 9 Nov. [Source](https://github.com/lxe/phoneuse)

Stars can rise for reasons other than use: names to watch, not picks.

## Top 4 things people are talking about

1. **Why did one developer leave Claude Code for Pi?** Small frustrations that added up, the author says. The post, dated 21 Sep and updated 7 Nov, says "due to an accumulation of many small frustrations, I’ve finally decided to retire it as my main coding harness and migrate my development setup to use Pi instead." The author writes: "At the time of writing, there have been 244 releases to Claude Code this year". 711 points and 441 comments on [Hacker News](https://news.ycombinator.com/item?id=50410107) by 9 Nov, posted there 8 Nov at 03:11 UTC. See [Pi vs Claude Code](/blog/pi-vs-claude-code/) and [Pi agent alternatives](/blog/pi-agent-alternatives/). [Source](https://caleb.software/posts/claude-to-pi.html)
2. **Who at Goldman Sachs can still use Claude Code?** Engineers and strats, State of AI reports, citing Bloomberg News: "Internal guidance updated in October restricts Anthropic's Claude Code and Microsoft's GitHub to the bank's engineers". It adds that strats "still have access, according to a second person familiar with the matter." 647 points and 368 comments on [Hacker News](https://news.ycombinator.com/item?id=50415628) by 9 Nov. [Source](https://www.thestateofai.com/news/goldman-sachs-claude-code-traders-bankers)
3. **Does "Don't Ask Again" in Claude Code leak secrets?** That is the claim in a Hacker News item titled: Claude Code's "Don't Ask Again" exposes passwords in 1,122 public GitHub files. It links Apiiro's post, whose page returned a 403, so this rests on the title. Posted 7 Nov, 595 points by 9 Nov. See [why Claude Code keeps asking for permission](/blog/why-does-claude-code-keep-asking-for-permission/). [Source](https://news.ycombinator.com/item?id=50407882)
4. **Should agent memory have one shared format?** Yes, argues LoreKit's Mads Thines in a 7 Nov post: "Every agent tool stores memory in its own shape, and every week someone builds another one. None of them can read the others." He writes "This isn't a pitch that LoreKit has solved memory." 176 points and 103 comments on [Hacker News](https://news.ycombinator.com/item?id=50411467) by 9 Nov. See [long term memory for Claude Code](/blog/give-claude-code-long-term-memory/). [Source](https://www.lorekit.io/blog/open-agent-memory-format)

## How this list is built

We read tracked tools' GitHub releases, GitHub trending, the Hacker News front page and leads from Google, and opened every page linked above. A name only makes a list with an opened link and a signal: points, stars or a dated release. Claude Code, Codex, Gemini CLI, OpenCode, Goose, Pi, Crush and Paperclip shipped no release in the window. Qwen Code shipped only a backfilled SDK release, and ai-cli's v0.9.1 notes say "The published CLI is unchanged".

<link rel="stylesheet" href="/blog/assets/media/agent-tools-today-2026-11-09/motion.css"><script defer src="/blog/assets/media/agent-tools-today-2026-11-09/motion.js"></script>
