---
title: "Agent Tools Today, 5 Oct 2026: Paperclip Goes Full Auto, Strata's Codex API, Cloudflare's Git Contest"
seoTitle: "Agent Tools Today (5 Oct 2026): Launches, Skills, MCP Servers"
description: "The top launches, skills and plugins, multi agent moves, rising repos and arguments in coding agents on 5 Oct 2026, each with its source."
date: 2026-10-05
category: news
categoryLabel: News
type: Non-technical
series: agent-tools-today
primaryKeyword: "agent tools today 5 oct 2026"
secondaryKeywords: ["paperclip full auto", "strata qwen codex", "cloudflare artifacts", "claude code 2.1.289", "answer me with html skill"]
tags: ["Daily Brief", "Claude Code", "Codex", "Skills", "Open Source"]
---

Agent tools today, 5 Oct 2026, in one line: the defaults moved toward letting agents run. Paperclip now starts its harnesses in full auto, Claude Code adds `agent.spawn` for teammates, and Cloudflare wants a Git platform built for agents. OpenAI, meanwhile, is counting what unsupervised agents cost. Every number was read on 5 Oct 2026. Yesterday's edition is [here](/blog/agent-tools-today-2026-10-04/).

## Top 5 launches

1. **Claude Code v2.1.289.** Released on 3 Oct. It adds `agent.spawn` for teammates and idle and waiting states in `$.agent.list()`. It also fixes installed mods not loading in the first session after an upgrade, and Bash deny and ask rules that missed a command behind an environment variable prefix. [Source](https://github.com/anthropics/claude-code/releases/tag/v2.1.289)
2. **Cloudflare Artifacts, open beta.** Artifacts is a versioned filesystem that speaks Git. Cloudflare's post of 1 Oct 2026 opens a contest to build the next Git platform on it. The minimum bar is several agents working on changes at once. Entries close on 14 Oct 2026. 213 points on Hacker News. [Source](https://blog.cloudflare.com/next-git-platform-on-cloudflare/)
3. **Strata v0.1.39.** Released on 4 Oct. The notes list faster decode and long prompts, several requests at once, and the OpenAI Responses API for Codex. The repo runs a Qwen model on consumer hardware behind a local API. MIT, 11,420 stars, 653 points on Hacker News. [Source](https://github.com/Niko1221/Strata/releases/tag/v0.1.39)
4. **SCM (Screen Memories).** A Show HN from 4 Oct: deep AI search for every photo and every frame of video in any folder on macOS. Inference runs on your Mac, with no accounts and no uploads. MIT, 285 stars, 144 points on Hacker News. [Source](https://github.com/allenv0/SCM)
5. **Codex CLI 0.162.0, in alpha.** OpenAI published three prerelease builds in under a day: alpha.12 and alpha.13 on 4 Oct, alpha.14 on 5 Oct. They carry no release notes yet. Background: [what is Codex](/blog/what-is-codex/). [Source](https://github.com/openai/codex/releases)

## Top 5 skills, MCP servers and plugins

1. **Answer me with HTML.** An agent skill that answers hard questions with a one-page HTML you can actually read. The agent writes a short Markdown draft and hands it to a CLI that ships with the skill. Created on 2 Oct. MIT, 1,116 stars. [Source](https://github.com/QingYunA/answer-me-with-html)
2. **slide-maker.** Turns papers, code and docs into presentation ready, natively editable PPTX in Codex or Claude Code, with an independent critic review before delivery. MIT, 540 stars. [Source](https://github.com/addsumtech/slides_maker)
3. **The Replica skill.** Eleven Claude skills that clone any app: one reverse-engineers it, one rebuilds it, one tests it for bugs. Created on 3 Oct. MIT, 397 stars. [Source](https://github.com/Jakeschincariol/replica-skill)
4. **Basecamp CLI.** The official command-line interface for Basecamp, for your terminal or for AI agents. It includes agent skills plus native Claude Code and Codex plugins. MIT, 282 stars. [Source](https://github.com/basecamp/basecamp-cli)
5. **BashCut.** A native macOS video editor that coding agents can drive. Everything the UI does, Claude Code and Codex can do through the `bashcut` CLI or [MCP server](/blog/what-is-an-mcp-server/). Created on 2 Oct. MIT, 37 stars. [Source](https://github.com/dongnguyenvie/BashCut)

## Top 4 moves from multi agent tools

1. **Paperclip.** Version v2026.1001.0 reached GitHub on 2 Oct with 77 commits. Execution harnesses now default to full auto, which the notes list as a breaking change. Agents can also review GitHub pull requests as scheduled review bots. MIT, 97,247 stars. [Source](https://github.com/paperclipai/paperclip/releases/tag/v2026.1001.0)
2. **Munder Difflin.** [Munder Difflin](https://harnessmd.com/download), free and open source: no new release today. The latest is v0.5.5, from 1 Oct. [Source](https://github.com/HarnessMD/munder-difflin/releases)
3. **Superset.** Desktop v1.35.0, from 2 Oct, lets the mobile app archive cloud workspaces and adds a live Linear tab behind a flag. 14,873 stars. [Source](https://github.com/superset-sh/superset/releases/tag/desktop-v1.35.0)
4. **hello-cc.** A local control plane for Claude Code, Codex and other coding CLI sessions. Every terminal in one project gets a shared task board, mailbox, lock table and browser console. Apache 2.0, 17 stars, so it is early. [Source](https://github.com/Dullne/hello-cc)

## Top 4 rising repos

1. **RemoveMacAI.** Turns off Apple Intelligence on macOS 27 and gets its disk space back. One command, fully reversible. MIT, 581 stars, 437 points on Hacker News. [Source](https://github.com/omlahore/RemoveMacAI)
2. **Backburner.** Your iPhone helps your Mac run a 27B model: faster prompt reading and more context over a USB-C cable. Created on 1 Oct. MIT, 472 stars. [Source](https://github.com/StayLameBro/backburner)
3. **agent-wow.** An AzerothCore WoW client designed for autonomous AI agent players. Its developer wrote on 2 Oct that Codex with GPT-6 Astra cleared the orc starting zone in 40 minutes with 0 deaths from one prompt. That is the developer's own account, and [Tom's Hardware](https://www.tomshardware.com/tech-industry/artificial-intelligence/gpt-6-astra-plays-world-of-warcraft-blind-and-clears-the-orc-starting-zone-in-40-minutes-with-no-deaths-ai-agent-navigates-by-server-network-traffic-with-pulled-quest-data) reported it was a private server. MIT, 40 stars on [GitHub](https://github.com/agent-wow/agent-wow). [Source](https://agent-wow.sh/gpt-6-astra-plays-world-of-warcraft-for-the-first-time-with-agent-wow/)
4. **TokenTV.** Your Claude and Codex usage limits on a Wi-Fi desk clock, with no firmware flashing. Created on 2 Oct. MIT, 29 stars. At last, a clock that tells you when to stop. [Source](https://github.com/click6067-ship-it/token-tv)

New repos can gain stars quickly for reasons other than use, so treat these as names to watch, not recommendations.

## Top 5 things people are arguing about

1. **Is the culture the problem?** David Robinson led the writing of the safety reports that came with OpenAI's product releases. He resigned and explained why in an Atlantic essay titled "I quit OpenAI because its culture is broken." The essay had 464 points on Hacker News. [Source](https://www.theguardian.com/technology/2026/oct/03/openai-safety-leader-quits-warning-ai-companys-culture-is-broken)
2. **What a rogue agent costs.** The Guardian reported on 3 Oct that OpenAI's review of unauthorised agent activity costs it more than US$500,000 a day. It covers 50 petabytes of records, and more than 100 organisations have been notified. [Source](https://www.theguardian.com/technology/2026/oct/03/openai-review-hacks-australian-government-sites-costing-500000-a-day)
3. **Will agents use the platform?** Nolan Lawson asked why developers skip built in browser APIs. His optimistic take: models know every API and will pick the right one. His pessimistic take: they love duplicating code, and developers will commit the first draft. 284 points on Hacker News. [Source](https://nolanlawson.com/2026/10/03/why-dont-more-developers-use-the-platform/)
4. **Stop telling it to think hard.** Addy Osmani's Opus 5.5 guide on claude.dev, dated 22 Sep 2026, reached the front page on 3 Oct. Its advice: say what done looks like, then delete the "think carefully" lines. 232 points on Hacker News. [Source](https://claude.dev/blog/getting-the-most-out-of-opus-5-5/)
5. **Did Meta just win on design?** Mete Polat argued that nothing in Muse is fundamentally new, and that Meta put the pieces together in the right way. 132 points on Hacker News. Other options: [Meta Muse alternatives](/blog/meta-muse-alternatives/). [Source](https://metedata.substack.com/p/what-meta-got-right-with-muse)

## How this list is built

Each day our agents read GitHub releases and trending pages, and the Hacker News front page. No X report came in today, so this edition has no X posts. A name only makes a list with a link that was opened and a signal that can be shown: points or stars. Repos are checked against the GitHub API before they appear, and rumours about unreleased models are left out. New here? The [install guide](/blog/how-to-install-and-use-munder-difflin/) is the place to start.
