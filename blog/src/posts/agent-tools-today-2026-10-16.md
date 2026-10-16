---
title: "Agent Tools Today, 16 Oct 2026: Muse Spark Open, Tiny Little Office, OpenCode Ends Sharing"
seoTitle: "Agent Tools Today (16 Oct 2026): Launches, Skills, MCP Servers"
description: "The top launches, skills and MCP servers, multi agent moves, rising repos and arguments in coding agents on 16 Oct 2026, each with its source."
date: 2026-10-16
category: news
categoryLabel: News
type: Non-technical
series: agent-tools-today
primaryKeyword: "agent tools today 16 oct 2026"
secondaryKeywords: ["muse spark open", "tiny little office", "opencode session sharing", "open_scion", "aidlc workflows"]
tags: ["Daily Brief", "Claude Code", "OpenCode", "MCP", "Open Source"]
---

Agent tools today, 16 Oct 2026, in one line: Meta released the weights of an 816B parameter model "built for coding and agentic work", an office suite told agents how to write its documents, and OpenCode switched off session sharing. Every number was checked on 16 Oct. The edition before this one on the site is [13 Oct](/blog/agent-tools-today-2026-10-13/).

[Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of coding agents such as Claude Code, Codex and Gemini CLI on your own computer. It shipped no release in the last 24 hours, so it is not in the lists below.

<figure class="mg" data-scene="today"><img src="/blog/assets/media/agent-tools-today-2026-10-16/today.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A pop-up book opens on a white background and a card rises from the fold, reading Muse Spark Open, then three tabs unfold in front of it: 816B total, 42B active and 1M token context."><figcaption>Meta's Muse Spark Open, from its model card, checked 16 Oct 2026.</figcaption></figure>

## Top 3 launches

1. **Muse Spark Open.** Meta's post, dated 15 Oct, releases the weights of "the most capable US open-weight model to date". The model card lists 816B total and 42B active parameters and a 1M token context, and says running it yourself takes "a GPU with at least 700GB of VRAM for NVFP4". Weights are on Hugging Face under the Muse Model License. More than 800 points on Hacker News on 16 Oct. For Meta's closed models, see [Muse Wonder](/blog/muse-wonder/). [Source](https://research.meta.ai/blog/muse-spark-open)
2. **Tiny Little Office.** A set of small web apps: a word processor, outliner, presentation builder, spreadsheet, calculator, drawing tool, diagram maker, animator, calendar and trip planner. Its front page tells agents that its llms.txt "says how to make a document as a link". More than 660 points on Hacker News on 16 Oct. [Source](https://tinylittleoffice.com/)
3. **Antithesis for agents.** Antithesis wrote on 15 Oct that "agents can build, debug, and test large-scale systems with Antithesis", including its Multiverse Debugger, which rewinds a bug's history "down to the nanosecond". [Source](https://antithesis.com/blog/2026/time-traveling-agents/)

## Top 3 skills, MCP servers and plugins

1. **AI-DLC.** AWS Labs' workflow rules for coding agents. The README says "One harness-neutral core runs natively in Claude Code, Kiro CLI, Kiro IDE, Codex CLI, Cursor, opencode, and GitHub Copilot", and badges version 2.11.0. MIT-0, more than 5,300 stars on 16 Oct. [Source](https://github.com/awslabs/aidlc-workflows)
2. **OpenAI Agents SDK v0.24.0.** Published 15 Oct. The notes "expose MCP annotations on converted tools" and "support run-wide tool exception formatting". [Source](https://github.com/openai/openai-agents-python/releases/tag/v0.24.0)
3. **GitHub Copilot CLI v1.0.98.** Published 14 Oct. The notes "Add support for Gemini 4 Argon" and keep MCP status and /mcp commands "synced to the active session after split-view session switches". See [Gemini 4 Argon](/blog/gemini-4-argon/). [Source](https://github.com/github/copilot-cli/releases/tag/v1.0.98)

## Top 3 moves from multi agent tools

1. **OpenCode v1.19.1.** Published 15 Oct. The notes say "Session sharing has been discontinued": existing share links and sharing commands no longer work, and importing sessions from share URLs is unsupported. See [what is OpenCode](/blog/what-is-opencode/). [Source](https://github.com/anomalyco/opencode/releases/tag/v1.19.1)
2. **Pi v1.3.0.** Published 15 Oct, the same hour. Pi went the other way on sharing: a new `sessionShareDestination` setting picks where `/share` uploads, `auto`, `gist` or `radius`. See [what is Pi](/blog/what-is-pi-agent/). [Source](https://github.com/earendil-works/pi/releases/tag/v1.3.0)
3. **Claude Code v2.1.301.** Published 15 Oct. The notes add `CLAUDE_CODE_RETRY_WATCHDOG_MAX_USAGE_LIMIT_WAIT_MS`, so unattended retry mode ends a request at a usage limit that "resets too far away instead of waiting", and the `%` motion in vim mode. [Source](https://github.com/anthropics/claude-code/releases/tag/v2.1.301)

## Top 3 rising repos

1. **open_scion.** A version of the design Anthropic described for Scion, its internal source control system for coding agents. The README says Scion "is internal to Anthropic and is not available to the public", and that open_scion "is not affiliated with or endorsed by Anthropic". The README says MIT; GitHub does not detect a standard licence. Created 15 Oct, more than 1,000 stars on 16 Oct. [Source](https://github.com/feder-cr/open_scion)
2. **hw-harness.** Its description reads "Small set of tools for helping with reverse engineering Linux drivers". It comes from the hardware post in the next list. Created 14 Oct. MIT, more than 45 stars on 16 Oct. [Source](https://github.com/cschalle/hw-harness)
3. **paperchecker.** Its description calls it "a totally PRIVATE paper agent that help you review your own paper". Created 15 Oct. MIT, more than 80 stars on 16 Oct. [Source](https://github.com/Ayi914/paperchecker)

New repos can gain stars quickly for reasons other than use, so treat these as names to watch, not recommendations.

## Top 3 things people are arguing about

1. **A preview pane that read local files.** Noma Labs says poisoned HTML in a public repo could run JavaScript in Claude Code Desktop's preview pane and read local files, and that Anthropic scored it CVSS 8.7 (High). Its timeline says a first patch was bypassed, and that Anthropic "issued a fix in Claude Desktop 1.30096.1 and later" on 17 Aug. See [agent security and sandboxing](/blog/agent-security-and-sandboxing/). [Source](https://noma.security/noma-labs/sneakpeek-how-the-preview-pane-in-claude-code-desktop-can-exfiltrate-your-data)
2. **Reverse engineering hardware with an agent.** Christian Schaller, writing on his blog on 15 Oct, describes having Claude set up a Windows virtual machine so it could run scans and capture the USB data of a film scanner Linux no longer supported. With the same harness he had kernel and libcamera patches for his laptop's MIPI camera ready by the end of a day. More than 180 points on Hacker News on 16 Oct. [Source](https://blogs.gnome.org/uraeus/2026/10/15/aiandreverseengineerhardware/)
3. **Prompt injection in HTTP headers.** Signals Corps scanned the headers of 217 million crawled web responses. Of 7,959 sites that sent a header aimed at AI, "30 tried to give an agent orders, and 22 of those were pranks". Its conclusion: "Most teams need no new controls." More than 85 points on Hacker News on 16 Oct. [Source](https://www.signalscorps.com/blog/prompt-injection-in-http-headers/)

## How this list is built

Each day our agents read GitHub releases and trending pages, the Hacker News front page, and the top posts on X and Reddit about coding agents. A name only makes a list with a link that was opened and a signal that can be shown: points, stars or a dated release. Repos are checked against the GitHub API before they appear, and a claim that exists only as a social post is left out. New here? Start with the [install guide](/blog/how-to-install-and-use-munder-difflin/).

<link rel="stylesheet" href="/blog/assets/media/agent-tools-today-2026-10-16/motion.css"><script defer src="/blog/assets/media/agent-tools-today-2026-10-16/motion.js"></script>
