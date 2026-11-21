---
title: "Agent Tools Today, 21 Nov 2026: Inkling 2 Mini, Claude Code v2.1.330 and DreamCoder"
seoTitle: "Agent Tools Today (21 Nov 2026): Launches, Skills, MCP Servers"
description: "The top launches, skills, multi agent moves, rising repos and talking points in AI agents from 20 to 21 Nov 2026, each with its source and date."
date: 2026-11-21
category: news
categoryLabel: News
type: Non-technical
series: agent-tools-today
primaryKeyword: "agent tools today 21 nov 2026"
secondaryKeywords: ["inkling 2 mini", "claude code v2.1.330", "dreamcoder", "opencomputer", "nanoclaw 2026.11.0", "t3 code v0.1.11"]
tags: ["Daily Brief", "Claude Code", "Open Source", "Skills"]
---

Agent tools today, 21 Nov 2026: Thinking Machines released Inkling 2 Mini, an open weights model, Claude Code v2.1.330 added easel for charts, and the author of Mastering Emacs launched DreamCoder. It covers 20 Nov 04:00 UTC to 21 Nov 04:00 UTC, checked 21 Nov. Previous edition: [20 Nov](/blog/agent-tools-today-2026-11-20/).

<figure class="mg" data-scene="sailboat"><img src="/blog/assets/media/agent-tools-today-2026-11-21/sailboat.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a yellow sailboat with a blue sail drifts slowly from left to right over sky waves. Three lilac buoys on the water read Inkling, Claude Code and DreamCoder. As the boat passes each buoy, the buoy turns mint and its word brightens. Tapping a buoy stops the boat and shows a soft white tag with its date, 20 Nov."><figcaption>The three lead items, from their own pages dated 20 Nov 2026, read 21 Nov 2026.</figcaption></figure>

## Top 5 launches

1. **Inkling 2 Mini.** Thinking Machines' post, dated 20 Nov, calls it "a fast, powerful model that's small enough to run on your laptop", with 26.4B total parameters, 3.4B active and open weights. It leads open weights models under 100B total parameters on DeepSWE v1.1 at 48.2%, the vendor's own figures of 20 Nov. 793 points on [Hacker News](https://news.ycombinator.com/item?id=50581260), posted 20 Nov at 20:12 UTC; more in [Inkling 2 Mini](/blog/inkling-2-mini/). [Source](https://thinkingmachines.ai/news/inkling-2-mini/)
2. **Claude Code v2.1.330.** Published 20 Nov at 22:32 UTC. It adds easel, "a built-in mod that draws charts when asked and under MCP metrics results", on "Pro, Max and, where available, Team and Enterprise on macOS and Linux"; you turn automatic charts off in `/config`. Recurring scheduled tasks and `/loop` now run "up to 30 days instead of 7" while their session keeps running; tasks made before this release "still end at 7 days". See [Claude Code Max plan tips](/blog/claude-code-max-plan-tips/). [Source](https://github.com/anthropics/claude-code/releases/tag/v2.1.330)
3. **DreamCoder.** Mickey Petersen, the author of Mastering Emacs, calls it in his post of 20 Nov "a frontier coding harness with a tiling window manager that runs in your browser on all 3 platforms", with "MCP, backgroundable sub agents and shell commands, terminal windows, skills, hooks". He expected "2 or 3 months" of work; it took 15. 142 points on [Hacker News](https://news.ycombinator.com/item?id=50581110), posted 20 Nov at 20:03 UTC. [Source](https://www.masteringemacs.org/article/announcing-dreamcoder)
4. **OpenComputer.** "The open-source Devin alternative", its README says: mention `@Computer` in a Slack thread and "the result lands as a pull request", from a Claude Code, Codex or OpenCode session. It "opens PRs 3.3x faster than Devin" in its own benchmark: the vendor's own figures. 76 points on [Show HN](https://news.ycombinator.com/item?id=50581403), posted 20 Nov at 20:19 UTC; 766 stars, Apache-2.0. See [Devin alternatives](/blog/devin-alternatives/). [Source](https://github.com/diggerhq/opencomputer)
5. **Qwen Code v0.28.3.** Published 21 Nov at 01:45 UTC. It adds a Microsoft Teams channel extension, and the CLI can now "run background workflows in headless mode". [Source](https://github.com/QwenLM/qwen-code/releases/tag/v0.28.3)

## Top 2 skills, MCP servers and plugins

1. **Claude-BugHunter.** "A Claude Code skill bundle for bug hunting and external red-team work", its repo says, "intended for assets you own or have written authorization to assess". A [merge](https://github.com/elementalsouls/Claude-BugHunter/pull/187) on 20 Nov adds `get_report`, "a public, keyless, read-only HackerOne MCP tool" that fetches disclosed reports live. 1,622 stars in a day on GitHub trending on 21 Nov, 14,513 in total; MIT. See [Claude Code skills](/blog/claude-code-skills/). [Source](https://github.com/elementalsouls/Claude-BugHunter)
2. **Browser Use 1.0.7.** Published 20 Nov at 20:01 UTC. "MCP calls no longer time out at 60 s": a long `browser_exec` now replies within 50 s with the output so far, and calling it again with empty code "returns the rest". See [Browser Use alternatives](/blog/browser-use-alternatives/). [Source](https://github.com/browser-use/browser-use/releases/tag/1.0.7)

## Top 4 moves from multi agent tools

1. **Orca v1.4.266 to v1.4.268.** Published 20 Nov 08:25 UTC to 21 Nov 03:50 UTC. In [v1.4.266](https://github.com/stablyai/orca/releases/tag/v1.4.266), Orca installs its own OpenCode, Cursor, Copilot, Grok, Kimi Code and OMP "when a host has none". In v1.4.268, bots "can run on Cursor, GitHub Copilot and Hermes", and `orca slack post --at` "schedules a post for later". See [Orca alternatives](/blog/orca-alternatives/). [Source](https://github.com/stablyai/orca/releases/tag/v1.4.268)
2. **NanoClaw 2026.11.0.** Published 20 Nov at 18:45 UTC. "Agents can create other agents from templates", and new agent groups "get only their model key". Eight changes "need action from some installs", among them a OneCLI database password that "closes a critical security hole". See [what NanoClaw is](/blog/what-is-nanoclaw/). [Source](https://github.com/qwibitai/nanoclaw/releases/tag/v2026.11.0)
3. **T3 Code v0.1.11.** Published 20 Nov at 07:38 UTC with "643 changes from 138 contributors". An Issues page shows Linear, GitHub, GitLab, Azure DevOps and Forgejo issues, and you can "hand an issue to an agent all the way to a merged PR". See [T3 Code alternatives](/blog/t3-code-alternatives/). [Source](https://github.com/pingdotgg/t3code/releases/tag/v0.1.11)
4. **Paradev desktop v2.0.11.** Published 20 Nov at 19:35 UTC. Cloud boxes now "stop an idle sandbox after 15 minutes instead of an hour", and the desktop shows "when you're in a subagent view and how to get back". For more tools like these, see [Herdr alternatives](/blog/herdr-alternatives/) and [Paradev alternatives](/blog/paradev-alternatives/). [Source](https://github.com/ParadevAI/Paradev/releases/tag/desktop-v2.0.11)

## Top rising repo

1. **Stitch Skills.** "A library of Agent Skills designed to work with the Stitch MCP server", its repo says. Three fixes merged on 20 Nov. 315 stars in a day on GitHub trending on 21 Nov, 11,094 in total; Apache-2.0. [Source](https://github.com/google-labs-code/stitch-skills)

Stars can rise for reasons other than use: names to watch, not picks.

## Top 4 things people are talking about

1. **Did Claude help prove the Generalized Riemann Hypothesis?** Levent Alpöge claims so. His note says "I believe I have, working with Claude, discovered a proof" of the Riemann Hypothesis, that the method extends to "the so-called Generalized Riemann Hypothesis", and "Claude and I have also formalized the arguments". [Scott Aaronson's post](https://scottaaronson.blog/?p=10344) of 20 Nov cites "17.4 million (!!) lines of Lean code" and adds: "I'm not 100% sure, but my bet is that the proof will stand." It is a claim. 2,438 points on [Hacker News](https://news.ycombinator.com/item?id=50574968), posted 20 Nov at 14:16 UTC. [Source](https://alpo.ge/remark.pdf)
2. **Should apps block AI agents that read the screen?** Signal does, for its own app. Its post of 20 Nov says it is "preventing screenshots in the app on iOS 27 and when AI assistants attempt to capture screen data on Android"; you can turn this off in settings. Signal calls the remedy "incomplete". This is Signal's own account. 527 points on [Hacker News](https://news.ycombinator.com/item?id=50572348), posted 20 Nov at 09:42 UTC. [Source](https://signal.org/blog/protecting-your-privacy/)
3. **Did coding agents turn developers into architects?** Mani Doraisamy argues so: "if you generate code by specifying your requirements instead of specifying your architecture, AI will decide the architecture on your behalf". His example: vibe coded logging made a welcome screen take "15 seconds to load". 339 points on [Hacker News](https://news.ycombinator.com/item?id=50579331), posted 20 Nov at 18:17 UTC. [Source](https://manidoraisamy.com/developer-to-architect.html)
4. **Can a model rewrite its own weights?** A paper first submitted to arXiv on 16 Nov says an open 27B model did. Its authors, Jiajun Fan, Neil He, Changyi Yang, Andy Mao, Xi Zhu, Chaoran Cheng, Kaiqu Liang, Shuaike Shen, Zetian Li, Ruihan Guo and Ge Liu, say the model "rewrites its own weights by its own reasoning and becomes better, with no gradients and no training", and its own edit "makes it 6.6 points more accurate on problems it never saw". 361 points on [Hacker News](https://news.ycombinator.com/item?id=50577265), posted 20 Nov at 16:29 UTC. [Source](https://arxiv.org/abs/2611.21885)

## How this list is built

We checked releases, the Hacker News front page and GitHub trending ourselves, and rechecked every item on its own page. Points and stars were checked on 21 Nov. Codex, Gemini CLI and Copilot CLI shipped only prereleases in the window; Cline, OpenCode, OpenClaw, Hermes Agent and Crush shipped no stable release. goose v1.60.2 added Gemini 4 Neon to its catalog; Kilo Code v7.8.32 and the LiteLLM patches made only small changes.

<link rel="stylesheet" href="/blog/assets/media/agent-tools-today-2026-11-21/motion.css"><script defer src="/blog/assets/media/agent-tools-today-2026-11-21/motion.js"></script>
