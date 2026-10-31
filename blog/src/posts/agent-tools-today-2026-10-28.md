---
title: "Agent Tools Today, 28 Oct 2026: OpenCode 2.2, Entire, Hallmark"
seoTitle: "Agent Tools Today (28 Oct 2026): Launches, Skills, MCP Servers"
description: "The top launches, skills, multi agent moves, rising repos and arguments in AI agents from 27 to 28 Oct 2026, each with its source and date."
date: 2026-10-28
category: news
categoryLabel: News
type: Non-technical
series: agent-tools-today
primaryKeyword: "agent tools today 28 oct 2026"
secondaryKeywords: ["opencode 2.2.0", "entire git forge", "hallmark design skill", "claude code 2.1.312", "codex 0.165.0", "soulgent"]
tags: ["Daily Brief", "Claude Code", "Skills", "Open Source"]
---

Agent tools today, 28 Oct 2026, in one line: OpenCode 2.2.0 opened its desktop app to plugins, Entire launched a Git forge where review agents score every push, and the design skill Hallmark gained more than 2,800 stars in a day. It covers 27 to 28 Oct, checked 28 Oct. An earlier edition is [26 Oct](/blog/agent-tools-today-2026-10-26/).

[Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. It is not ranked in the lists below.

<figure class="mg" data-scene="today"><img src="/blog/assets/media/agent-tools-today-2026-10-28/today.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a small cabinet with three drawers opens one drawer at a time. The top drawer holds a card labelled OpenCode 2.2.0 with a tag Desktop plugins, the middle one a card labelled Entire with a tag Trails, and the bottom one a card labelled Hallmark with a tag Design skill. Tapping a drawer opens or closes it."><figcaption>The day's three lead items, from OpenCode's release notes, Entire's blog and the Hallmark repo, read 28 Oct 2026.</figcaption></figure>

## Top 3 launches

1. **OpenCode 2.2.0.** Published 27 Oct. You can now create, install and share desktop plugins, which the release notes mark experimental, and the desktop app was refreshed. Plugins can add keyed session instructions without editing the system prompt, so the prompt cache survives. See [OpenCode alternatives](/blog/opencode-alternatives/). [Source](https://github.com/anomalyco/opencode/releases/tag/v2.2.0)
2. **Entire.** On 26 Oct Entire introduced what it calls "the first Git forge built specifically for agent-human collaboration". In place of a pull request, a Trail shows eval scores that review agents give on every push, and Gates can require human approval and passing CI before a merge. Entire says the review agents use Claude Code and Codex in cloud sandboxes, and that its Git server pushes up to 89x faster than GitHub, which is its own figure. More than 50 points on Hacker News on 28 Oct. [Source](https://entire.com/blog/the-git-forge-for-agent-human-collaboration)
3. **Survival LLM.** A free AI assistant and emergency library that, after setup, needs no internet. It runs on Apple Silicon Macs with macOS 14 or newer and on 64 bit Windows 10 or 11, picks a model that fits your memory, from IBM Granite 4.2 8B for 16 to 31 GB up to NVIDIA Nemotron 3.5 Super for 128 GB or more, and lists the sources behind every answer, including about 930,000 Wikipedia articles. More than 210 points on Hacker News on 28 Oct; repo created 24 Oct, more than 170 stars, and GitHub detects no standard licence. [Source](https://www.brangus.io/survival-llm)

## Top 3 skills, MCP servers and plugins

1. **Hallmark.** A design skill for Claude Code, Codex, Cursor and OpenCode, made by Together AI, that its README says "refuses to look AI-generated". Version 2 deals three themes from a catalog of fifty and checks the page in a real browser against signs of machine made design. MIT, more than 39,000 stars, and 2,830 stars in a day on GitHub trending on 28 Oct. [Source](https://github.com/Nutlope/hallmark)
2. **AI Design Skills.** A growing set of design skills for Claude Code, Cursor, Codex, Windsurf and any tool that reads a markdown rules file. The first is `landing-page-design`, which asks intake questions and builds a landing page with its copy and a visual system. MIT, created 29 Jul, more than 9,600 stars, and 1,395 stars in a day on GitHub trending on 28 Oct. [Source](https://github.com/elayadesign/ai-design-skills)
3. **mcp-video-editor.** An MCP server that lets Cursor, Claude Desktop, Codex CLI, Antigravity, OpenCode and KiloCode edit video projects in CapCut and OpenCut over stdio. Its README lists 50 tools, from timeline clips and captions to export, and says all of them default to `dryRun: true`. Created 26 Oct, more than 50 stars on 28 Oct; GitHub detects no licence. [Source](https://github.com/AISEO-VirtualabDigital/mcp-video-editor)

## Top 3 moves from multi agent tools

1. **Claude Code v2.1.312.** Published 27 Oct. Claude no longer overwrites a very large `CLAUDE.md`, rules file or included file in a subdirectory after seeing only its start; Write now asks it to read the whole file or edit in place. In fullscreen you can click the hint under a queued message to send it now. See [Claude Code best practices](/blog/claude-code-best-practices/). [Source](https://github.com/anthropics/claude-code/releases/tag/v2.1.312)
2. **Codex 0.165.0.** Published 27 Oct. It adds a built in Google Cloud Vertex AI provider (`model_provider = "gcp"`), puts [GPT-6.1 Terra](/blog/gpt-6-1-terra/) in the model catalogs, turns on memory v2 by default for fresh profiles with import of memories from other agents, and lets you change reasoning effort mid conversation on supported models. [Source](https://github.com/openai/codex/releases/tag/rust-v0.165.0)
3. **OpenClaw 2026.10.8.** Published 27 Oct. A failed post update Doctor check now restarts the Gateway instead of leaving it stopped, an orphaned maintenance worker no longer blocks every CLI command, and updates no longer abort on ACL filesystems or Windows pnpm links. See [OpenClaw alternatives](/blog/openclaw-alternatives/). [Source](https://github.com/openclaw/openclaw/releases/tag/v2026.10.8)

## Top 3 rising repos

1. **Soulgent.** A Mac app that turns each Claude Code, Codex and WorkBuddy session into a character with a name, a look and a mood, so you can see at a glance who is working, who is done and who is waiting for your decision. MIT, created 27 Oct, more than 30 stars on 28 Oct. [Source](https://github.com/Ericcc0321/soulgent)
2. **OpenBot.** A desktop workspace for persistent AI teammates that runs Codex and Claude Code, plus Grok CLI, OpenCode, Gemini, Cursor CLI and Cline CLI through ACP, each with its own workspace, queues, file transfer, an embedded browser and agent to agent messages. Its README warns it is a development preview whose agents run with `danger-full-access` and no per action approval. On GitHub trending on 28 Oct, more than 2,500 stars; GitHub detects no standard licence. [Source](https://github.com/nightly-labs/openbot)
3. **agent-purge.** One system prompt for many coding agents, among them Codex, Claude, OpenCode, Grok, Hermes and Pi, with four modes (replace, strict, append, off) and a local web console. MIT, created 25 Oct, more than 650 stars on 28 Oct. [Source](https://github.com/ZiChuanLan/agent-purge)

Stars can rise for reasons other than use: names to watch, not picks.

## Top 3 things people are arguing about

1. **Do agents mean more work, not less?** An engineer writes that with several agents running at once, each needing him "sometimes", he works more than ever, because every answer means switching to another problem. The Hacker News thread had more than 620 points and 610 comments on 28 Oct. [Source](https://oioannou.com/blog/ai-promised-less-work/)
2. **Does Brooks's law hold for agents?** A post revisits The Mythical Man-Month and argues that sequential tasks stay sequential and the overhead moves to you: someone still defines done, reviews the code and stitches the parts together. More than 440 points on Hacker News on 28 Oct. [Source](https://j11g.com/the-mythical-man-month-in-the-age-of-ai)
3. **What does a thumbs up send to Anthropic?** Anthropic's privacy article for its commercial products, dated 18 Aug 2026, says it does not train on their inputs and outputs by default, but feedback through the thumbs up or down button stores the entire related conversation for up to 5 years and may be used to train models. Owners of Team and Enterprise plans can turn the button off with the Rate chats setting. More than 210 points on Hacker News on 28 Oct. [Source](https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training)

## How this list is built

For this edition, covering 27 to 28 Oct, we read the GitHub releases of 21 tracked tools, vendor blogs and changelogs, GitHub trending, and the Hacker News front page. We did not read X or Reddit for it. A name only makes a list with a link that was opened and a signal that can be shown: points, stars or a dated release. Repos are checked against the GitHub API before they appear. New here? Start with the [install guide](/blog/how-to-install-and-use-munder-difflin/).

<link rel="stylesheet" href="/blog/assets/media/agent-tools-today-2026-10-28/motion.css"><script defer src="/blog/assets/media/agent-tools-today-2026-10-28/motion.js"></script>
