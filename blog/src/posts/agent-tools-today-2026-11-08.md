---
title: "Agent Tools Today, 8 Nov 2026: Orca Chat Forks, Qwen Code 0.27.0, Anthropic on Agent Memory"
seoTitle: "Agent Tools Today (8 Nov 2026): Launches, Skills, MCP Servers"
description: "The top launches, skills, multi agent moves, rising repos and talking points in AI agents from 7 to 8 Nov 2026, each with its source and date."
date: 2026-11-08
category: news
categoryLabel: News
type: Non-technical
series: agent-tools-today
primaryKeyword: "agent tools today 8 nov 2026"
secondaryKeywords: ["orca 1.4.252 fork chat", "qwen code 0.27.0", "anthropic components of agent memory", "sandbox mcp windows", "maxxbench", "paperclip runner"]
tags: ["Daily Brief", "Orca", "Skills", "MCP"]
---

Agent tools today, 8 Nov 2026, in one line: Orca 1.4.252 forks chats from any reply, Qwen Code 0.27.0 lets managed agents hold several child questions at once, and Anthropic's agent memory post drew 154 Hacker News points by 8 Nov. It covers 7 Nov 04:00 UTC to 8 Nov 04:00 UTC, checked 8 Nov. Previous edition: [7 Nov](/blog/agent-tools-today-2026-11-07/).

<figure class="mg" data-scene="flashcards"><img src="/blog/assets/media/agent-tools-today-2026-11-08/flashcards.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, three flashcards in blue, lilac and mint flip up from a plain desk one after another. They read Orca forks, Qwen Code and Agent memory. Each card wobbles a little as it settles. Tapping a card flips it over to show the date 7 Nov on the back."><figcaption>The day's three lead items, from the Orca 1.4.252 and Qwen Code 0.27.0 release notes and Anthropic's agent memory post, read 8 Nov 2026.</figcaption></figure>

## Top 2 launches

1. **Qwen Code 0.27.0.** Published 7 Nov at 20:45 UTC. "Managed-agent sessions can hold multiple child questions at once, answer them in any order, and keep drafts and errors separated per child." After Esc or Ctrl+C, "cancelled shell commands are reported as interrupted instead of completed, preserving partial output." The notes list "No known breaking changes." [Source](https://github.com/QwenLM/qwen-code/releases/tag/v0.27.0)
2. **Sandbox MCP 1.2.0.** Scott Hanselman's tool, published 7 Nov at 06:40 UTC. The README pitch: "Give your AI agent a brand-new Windows PC. Then throw it away." Run it with `sbx` or through its optional MCP adapter. The 1.2.0 notes add "Bounded desktop recording" and say "The default never installs app prerequisites." You need "supported Windows 11 editions, virtualization and one free guest slot." A clean reply to "works on my machine": a machine that was never yours. MIT, 280 stars on 8 Nov. [Source](https://github.com/shanselman/sandbox-mcp/releases/tag/v1.2.0)

## Top 3 skills, MCP servers and plugins

1. **Google's skills.** "Agent Skills for Google products and technologies, including Google Cloud." Install with `npx skills add google/skills`. Apache 2.0, 23,476 stars, 443 in a day on GitHub trending on 8 Nov. See [Claude Code skills](/blog/claude-code-skills/). [Source](https://github.com/google/skills)
2. **cutaway.** "A Claude Code skill that turns one picture into a 3D object that takes itself apart." Install with `npx skills add Nyxera0x/cutaway -g -a claude-code`. The README says "Claude stops after round 2 and waits for your yes". MIT, created 6 Nov, 87 stars on 8 Nov. [Source](https://github.com/Nyxera0x/cutaway)
3. **billion-context.** "A context-compression plugin for month-long single sessions". The README says it "sits between" an agent "and its model API". 4,677 stars, 191 in a day on 8 Nov. See [compressing agent memory](/blog/compressing-agent-memory/). [Source](https://github.com/ranxianglei/billion-context)

## Top 4 moves from multi agent tools

1. **Orca 1.4.252.** Published 7 Nov at 04:03 UTC. "Fork any finished response to try another direction while the original chat stays as it was." In Claude or Codex chats, "type `/plan` to switch to Plan mode, which persists when you reopen the chat." Orca "now needs macOS 13.4 or later (previously macOS 12)". 1.4.253 followed at 10:47 UTC with "a few minor improvements." Orca also appears in our [herdr alternatives](/blog/herdr-alternatives/). [Source](https://github.com/stablyai/orca/releases/tag/v1.4.252)
2. **Paperclip v2026.1106.0.** Published 6 Nov at 22:31 UTC, which our last edition missed. "The headline is that the Paperclip Runner is now the default for new agents", and "GitHub Copilot joins as a native harness." Among four breaking changes: "The Pipelines experiment is removed." [Source](https://github.com/paperclipai/paperclip/releases/tag/v2026.1106.0)
3. **OpenMausBot 0.1.147 and 0.1.148.** Both published 7 Nov. In 0.1.147, "Paste a Google Meet, Microsoft Teams or Jitsi link and a bot joins the call as a guest." In 0.1.148, "Each way into this computer has its own switch, all off by default." Its [README](https://github.com/milind-soni/OpenMausBot) calls it "The open-source Grok Bot alternative: your own team of AI bots, in a chat app." Apache 2.0, 17,162 stars, 1,955 in a day on 8 Nov. [Source](https://github.com/milind-soni/OpenMausBot/releases/tag/v0.1.147)
4. **T3 Code nightly 20261107.4327.** A nightly, published 7 Nov at 16:20 UTC, with real changes: "Delete threads directly from Settings → Archive" and "Answer Antigravity’s form questions in chat, including multi-select choices." See [T3 Code alternatives](/blog/t3-code-alternatives/). [Source](https://github.com/pingdotgg/t3code/releases/tag/v0.1.8-nightly.20261107.4327)

## Top 2 rising repos

1. **Astryx.** Meta's "open source design system that's fully customizable and agent ready". The README says "The API, docs, and CLI are designed together so a person and an AI assistant build the same way, from the same reference." MIT, 14,667 stars, 96 in a day on 8 Nov. [Source](https://github.com/meta/astryx)
2. **agent-browser.** "Browser automation for AI agents: open pages, read them as an accessibility tree, and act on elements from the shell." Apache 2.0, 46,929 stars, 190 in a day on 8 Nov. [Source](https://github.com/vercel-labs/agent-browser)

Stars can rise for reasons other than use: names to watch, not picks.

## Top 4 things people are talking about

1. **How should an agent decide what to remember?** Tell it why, not how, says Anthropic. Its 6 Nov engineering post says "it helps to tell Claude what memory is for, but not how to use it." In Pokémon Red runs, Sonnet 3.7 "wrote 413 memory files across 225 folders and earned one badge", while Fable 5 "wrote nine files in two folders, plus a single top-level file called `global.md`, and earned four badges." 154 points and 81 comments on Hacker News by 8 Nov, posted there 7 Nov. See [long term memory for Claude Code](/blog/give-claude-code-long-term-memory/). [Source](https://www.anthropic.com/research/components-of-agent-memory)
2. **Do coding benchmark scores hold up when the task changes?** MaxxBench says often not. Its 20 Oct post changes "the instructions or starting code of 89 DeepSWE tasks". Claude Opus 5.5 and Gemini 3.8 Flash "both have published DeepSWE scores of about 74%. On MaxxBench, they score 76.4% and 53.4%." These are the benchmark authors' own figures. 228 points on Hacker News by 8 Nov. [Source](https://maxxbench.unlap.ai/research/why-maxxbench/)
3. **What happened to Microsoft Research's AI Frontiers group?** It closed, in John Langford's words: "So AI Frontiers is over." His post says the group of about 50 people, whose work included "the Autogen orchestration framework", was "reorged into Microsoft AI" in early September, and that he left. That is his account. 422 points and 246 comments on Hacker News by 8 Nov. [Source](https://hunch.net/?p=13764006)
4. **What does Cursor's Ultra plan include now?** Cursor and Grok together, as of 8 Nov. Cursor's pricing page, read 8 Nov 2026, lists Plus at $8, Premium at $30, Super at $100 and Ultra at $200 a month before tax. Plus notes "Only Grok models are available on this plan", Ultra gives "50x more usage compared to Plus", and from Premium up "3rd party models are available in Cursor, billed separately by usage". Premium also lists X perks such as "Ad-free scrolling on most surfaces". This lead came from X; the page is Cursor's own. See [Cursor pricing](/blog/cursor-pricing/). [Source](https://cursor.com/pricing)

## How this list is built

We read tracked tools' GitHub releases, GitHub trending, the Hacker News front page and leads from Google and X, and opened every page linked above. A name only makes a list with an opened link and a signal: points, stars or a dated release. Codex shipped only an alpha whose notes read "Release 0.169.0-alpha.3". Claude Code, OpenCode, Gemini CLI, Goose and Pi shipped no release in the window, and the Crush and Qwen Code nightlies are left out. Apiiro's post on Claude Code's "Don't Ask Again" drew 241 points on [Hacker News](https://news.ycombinator.com/item?id=50407882), but its page returned a bot check, so it is left out.

<link rel="stylesheet" href="/blog/assets/media/agent-tools-today-2026-11-08/motion.css"><script defer src="/blog/assets/media/agent-tools-today-2026-11-08/motion.js"></script>
