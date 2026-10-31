---
title: "Agent Tools Today, 31 Oct 2026: Claude Code Extension Backdoor in Cursor, Claude Code 2.1.316, OpenCode 2.2.5"
seoTitle: "Agent Tools Today (31 Oct 2026): Launches, Skills, MCP Servers"
description: "The top launches, skills, multi agent moves, rising repos and arguments in AI agents from 29 to 31 Oct 2026, each with its source and date."
date: 2026-10-31
category: news
categoryLabel: News
type: Non-technical
series: agent-tools-today
primaryKeyword: "agent tools today 31 oct 2026"
secondaryKeywords: ["claude code extension backdoor", "cursor marketplace claude code 2.1.313", "claude code 2.1.316", "opencode 2.2.5", "northflank breach", "unslop skill"]
tags: ["Daily Brief", "Claude Code", "Skills", "Security"]
---

Agent tools today, 31 Oct 2026, in one line: a tampered Claude Code extension reached Cursor's marketplace, Claude Code 2.1.316 adds an effort setting for subagents, and OpenCode can now use your Claude Code login. It covers 29 to 31 Oct, checked 31 Oct. An earlier edition is [26 Oct](/blog/agent-tools-today-2026-10-26/).

[Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. It is not ranked in the lists below.

<figure class="mg" data-scene="shutters"><img src="/blog/assets/media/agent-tools-today-2026-10-31/shutters.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a small shopfront has three roller shutters that roll up one at a time. Behind the first, a card reads Claude Code extension with a tag Check Cursor. Behind the second, Claude Code 2.1.316 with a tag Subagent effort. Behind the third, OpenCode 2.2.3 with a tag Claude Agent. Tapping a shutter rolls it down or back up."><figcaption>The day's three lead items, from Cursor's security notice and the release notes of Claude Code and OpenCode, read 31 Oct 2026.</figcaption></figure>

## Check this first: the Claude Code extension in Cursor

Cursor's [security notice](https://cursor.com/blog/claude-code-extension-security-notice), posted 29 Oct and updated 30 Oct, says a maliciously modified copy of the Claude Code extension was on its marketplace between about 2:27am and 1:35pm PT on 29 Oct. It names versions 2.1.312 and 2.1.313 for Windows and macOS, and says the code "attempts to install a persistent SSH backdoor". Cursor says the SSH step usually fails because it needs admin rights, but the extension still adds the key, installs persistence and sends host details, and that the attacker's server is now offline. More than 800 points on Hacker News on 31 Oct.

- **How to check.** If you installed or updated either version from Cursor's marketplace in that window: on a Mac, search `~/.ssh/authorized_keys` for `svc-telemetry`. Cursor says a match means the machine is affected, and its check prints "No key found; machine not impacted" otherwise. Its notice gives the Windows command.
- **How to clean up.** Cursor warns that uninstalling the extension may not be sufficient. The notice has removal scripts and says to isolate an affected machine, assess whether to rebuild it, and rotate credentials and sessions reachable from it, from a trusted system.
- **What each side says.** Cursor writes that these versions "were not developed by Anthropic". [The Register](https://www.theregister.com/cyber-crime/2026/10/30/anthropic-that-claude-code-extension-compromise-couldnt-be-us/5306682) quoted a member of Anthropic's technical staff on 30 Oct: "A malicious actor used access to Cursor's marketplace to publish a tampered copy of the Claude Code extension, which we didn't build or publish. The versions on our official channels are not affected, and this only impacts Cursor users." It also reported that Cursor has not outlined how the package reached the marketplace.

For the wider picture, see [security for AI coding agents](/blog/security-for-ai-coding-agents/).

## Top 3 launches

1. **Mika.** "An on-device AI agent for Android that operates apps and the web to get things done for you", working on a hidden background screen while you use your phone. Apache 2.0, created 29 Oct, more than 1,500 stars on 31 Oct. [Source](https://github.com/wangzan101/Mika)
2. **nesformer.** "An NES CPU compiled into the weights of a stock Qwen3.5 model". It builds on Qwenputer, which compiled a CHIP-8 and then a RISC-V CPU into Qwen3.5-4B. Created 30 Oct, more than 200 points on Hacker News on 31 Oct. [Source](https://github.com/dbreunig/nesformer)
3. **The sleep framework from Google Research.** A method that alternates active use with an offline phase, moving short term context into long term parameters which Google says lets a model keep learning without catastrophic forgetting. Published 27 Oct, more than 180 points on Hacker News on 31 Oct. [Source](https://research.google/blog/the-sleep-framework-a-new-way-for-llms-to-retain-knowledge-in-continual-learning/)

## Top 3 skills, MCP servers and plugins

1. **Unslop.** A Claude skill that "turns vibecoded, AI-looking UI into a designed interface". It finds purple gradients, glows and emoji labels first. CC BY 4.0, created 29 Oct, more than 1,400 stars on 31 Oct. [Source](https://github.com/heydamir/unslop)
2. **Floorplan.** "Claude or Codex reads your codebase and draws an interactive map of it", with a plain English name for every part, file and web request. MIT, created 27 Oct, more than 490 stars on 31 Oct. [Source](https://github.com/haydenschmitty/floorplan)
3. **pixelfx.** 232 pixel art effects, each a small piece of code, plus a Claude Code skill for making new ones: draft, render, look, refine. MIT, created 30 Oct, more than 380 stars on 31 Oct. [Source](https://github.com/patch-gg/pixelfx)

## Top 3 moves from multi agent tools

1. **Claude Code 2.1.316.** Published 31 Oct. `CLAUDE_CODE_SUBAGENT_EFFORT` sets the effort subagents run at when nothing else names one. Fast mode for Opus 4.8 is deprecated, with removal on 30 Nov 2026. See [Claude Code alternatives](/blog/claude-code-alternatives/). [Source](https://github.com/anthropics/claude-code/releases/tag/v2.1.316)
2. **OpenCode 2.2.3 to 2.2.5.** Three releases on 30 Oct. A built in Claude Agent provider uses your Claude Code login and models, and `compaction.buffer` now accepts a share of the context window, such as `"20%"`. See [OpenCode alternatives](/blog/opencode-alternatives/). [Source](https://github.com/anomalyco/opencode/releases/tag/v2.2.3), [2.2.5](https://github.com/anomalyco/opencode/releases/tag/v2.2.5)
3. **Paradev Desktop 2.0.2.** Published 29 Oct. The right pane area is now on for everyone, and pull request actions use the viewer's own GitHub login rather than the host's. [Source](https://github.com/paradevai/paradev/releases/tag/desktop-v2.0.2)

## Top 3 rising repos

1. **DeepTutor.** "Lifelong Personalized Tutoring" from HKUDS. Apache 2.0, more than 51,000 stars, and 2,282 stars in a day on GitHub trending on 31 Oct. [Source](https://github.com/HKUDS/DeepTutor)
2. **T3 Code.** An "agent harness control surface" with a mobile app, which controls the Claude Code, Codex, Cursor, OpenCode and other tools set up on your computer. MIT, more than 32,000 stars, and 930 stars in a day on GitHub trending on 31 Oct. [Source](https://github.com/pingdotgg/t3code)
3. **OpenBot.** From CopilotKit, with AI coworkers that each get a browser, files and tools. Its README says it is "A template, not a product". MIT, more than 8,800 stars, and 706 stars in a day on GitHub trending on 31 Oct. [Source](https://github.com/CopilotKit/OpenBot)

Stars can rise for reasons other than use: names to watch, not picks.

## Top 3 things people are arguing about

1. **What if your hosting platform holds your AI keys?** Northflank's status page tells customers to "assume all environment variables have been compromised and rotate all secrets", and on 30 Oct it said users had reported "unauthorised use of AI API keys supplied to the Northflank platform". It says this may fit a wider pattern of attacks on AI credentials, citing Wiz's Black October report. More than 370 points on Hacker News on 31 Oct. See [Black October](/blog/black-october-php2shell/). [Source](https://status.northflank.com)
2. **What do 50 agents do left alone?** Y Combinator and Olam Labs ran 50 GPT-6.1 Sol agents in Minecraft for 3 hours. They sent about 5,900 messages, and four spent 11 minutes appointing a "sole fertilizer operator". More than 390 points on Hacker News on 31 Oct. [Source](https://labs.ycombinator.com/projects/games/index.html)
3. **Is AI wearing down the people who run production?** A SigNoz newsletter post with a byline of 28 Feb argues that heavy use of AI in incident response erodes the skills needed for new failures: "The more you let the system handle, the worse you get at handling things yourself". More than 520 points on Hacker News on 31 Oct. [Source](https://newsletter.signoz.io/p/ai-isnt-replacing-sres-its-deskilling)

## How this list is built

For this edition, covering 29 to 31 Oct, we read the GitHub releases of tracked tools, vendor blogs and changelogs, GitHub trending, and the Hacker News front page. We did not read X or Reddit for it. A name only makes a list with a link that was opened and a signal that can be shown: points, stars or a dated release. Repos are checked against the GitHub API before they appear. New here? Start with the [install guide](/blog/how-to-install-and-use-munder-difflin/).

<link rel="stylesheet" href="/blog/assets/media/agent-tools-today-2026-10-31/motion.css"><script defer src="/blog/assets/media/agent-tools-today-2026-10-31/motion.js"></script>
