---
title: "Agent Tools Today, 8 Oct 2026: Claude Haiku 5.5, GPT-6 Intelligent UI, Docker Agent"
seoTitle: "Agent Tools Today (8 Oct 2026): Launches, Skills, MCP Servers"
description: "The top launches, skills and plugins, multi agent moves, rising repos and arguments in coding agents on 8 Oct 2026, each with its source."
date: 2026-10-08
category: news
categoryLabel: News
type: Non-technical
series: agent-tools-today
primaryKeyword: "agent tools today 8 oct 2026"
secondaryKeywords: ["claude haiku 5.5", "gpt-6 intelligent ui", "docker agent", "claude code 2.1.293", "codex cli 0.161.0"]
tags: ["Daily Brief", "Claude Code", "Codex", "Skills", "Open Source"]
---

Agent tools today, 8 Oct 2026, in one line: Anthropic released a much cheaper small model, OpenAI brought GPT-6 and interactive answers to ChatGPT, and Docker's agent runner reached the front page of Hacker News. Every number was checked on 8 Oct, one day after [the 7 Oct edition](/blog/agent-tools-today-2026-10-07/).

<figure class="mg" data-scene="today"><img src="/blog/assets/media/agent-tools-today-2026-10-08/today.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A long toaster pops five slices of toast one after another, and each lands upright in the toast rack standing on top of it, numbered 1 to 5. A name appears on each slice in turn: Claude Haiku 5.5, GPT-6 and Intelligent UI, Docker Agent, Claude Code v2.1.293 and Codex CLI 0.161.0."><figcaption>The five launches of the day, one slice per launch. Tap a slice for its one line.</figcaption></figure>

## Top 5 launches

1. **Claude Haiku 5.5.** Anthropic released it on 7 Oct and says it costs around 75% less to run than Haiku 4.5 on average. Our notes are in [Claude Haiku 5.5](/blog/claude-haiku-5-5/). 730 points on Hacker News on 8 Oct. [Source](https://www.anthropic.com/claude-haiku-5-5)
2. **GPT-6 and Intelligent UI.** OpenAI's 7 Oct post says GPT-6 started rolling out that day in the Chat tab for Plus, Pro, Business and Enterprise, with Free and Go from the next day. Intelligent UI lets an answer include tappable buttons, forms and charts. The post says the models behind Work and Codex are not changing as part of this release. More in [our explainer](/blog/gpt-6-intelligent-ui/). 534 points on Hacker News on 8 Oct. [Source](https://openai.com/index/gpt-6-for-everyone/)
3. **Docker Agent.** A `docker` CLI plugin: you define agents in a YAML file, give them tools or any MCP server, and run them with `docker agent run`. The repo dates from September 2025. v1.149.0 on 7 Oct loads skills from public GitHub repositories. Apache 2.0, 3,794 stars and 194 points on Hacker News on 8 Oct. [Source](https://github.com/docker/docker-agent)
4. **Claude Code v2.1.293.** Released 7 Oct. It adds Claude Haiku 5.5 as the default Haiku model on the Anthropic API. One fix stops Claude from redoing or retracting finished work after a context compaction. [Source](https://github.com/anthropics/claude-code/releases/tag/v2.1.293)
5. **Codex CLI 0.161.0.** Released 7 Oct. GPT-6.1 Sol is now the default model in the bundled and Amazon Bedrock catalogs, and `/mcp login <name>` signs in to an MCP server from a running session. Background: [what is Codex](/blog/what-is-codex/). [Source](https://github.com/openai/codex/releases/tag/rust-v0.161.0)

## Top 3 skills, MCP servers and plugins

1. **Plannotator 0.28.8.** Released 7 Oct with the Plannotator Inbox, in preview: one local window where agents leave questions, files and guided reviews, and your reply goes back to the session that asked. The same day, 0.28.7 stopped Ask this session from handing your unsubmitted draft comments to the agent as instructions. Apache 2.0, 9,202 stars on 8 Oct. [Source](https://github.com/backnotprop/plannotator/releases/tag/v0.28.8)
2. **Mecum.** A Mac app that gives agents a desktop workspace. Claude Code or Codex connect through MCP and work in desktop apps while you keep using the Mac. New to MCP? Read [what is an MCP server](/blog/what-is-an-mcp-server/). Apache 2.0, 15 stars on 8 Oct. [Source](https://github.com/ForteAI-Org/mecum)
3. **Planlock.** New, with no signal yet: created 7 Oct, 0 stars on 8 Oct. An MCP proxy that sits between an agent and its tools. You approve the agent's plan once, and it rejects every call that is not in the plan. MIT. [Source](https://github.com/JosephCurwin/planlock)

## Top 5 moves from multi agent tools

1. **Pi.** v1.1.0 on 7 Oct. Terminals and agent dashboards that support OSC 7501 can see whether Pi is working, blocked on a dialog or login, done, or failed. It adds Claude Haiku 5.5, and `--tools` entries such as `+codemode,-write` now adjust the default tools without replacing them. Background: [what is Pi agent](/blog/what-is-pi-agent/). [Source](https://github.com/earendil-works/pi/releases/tag/v1.1.0)
2. **[Munder Difflin](https://harnessmd.com/download).** Free and open source: no new release today. The latest is v0.5.5, from 1 Oct. [Source](https://github.com/HarnessMD/munder-difflin/releases)
3. **Herdr GPUI.** Three releases on 7 Oct, v20261007.1 to v20261007.3. Theme file changes apply without a restart, each host's header stays pinned while its workspaces scroll, and programs in a pane can use the microphone on macOS. Apache 2.0, 994 stars on 8 Oct. See [Herdr alternatives](/blog/herdr-alternatives/). [Source](https://github.com/penso/herdr-gpui/releases)
4. **Cline.** v4.1.23 on 7 Oct. Generate Commit Message now follows your `.clinerules`. Claude through a custom Anthropic base URL no longer fails with a 400 error. [Source](https://github.com/cline/cline/releases/tag/v4.1.23)
5. **OpenClaw.** A second prerelease, 2026.10.1-beta.2, on 8 Oct UTC. Its highlights list fixes to sessions, memory, replies and media. The latest stable release is still v2026.9.8. See [OpenClaw alternatives](/blog/openclaw-alternatives/). [Source](https://github.com/openclaw/openclaw/releases)

## Top 5 rising repos

1. **Strata.** A local inference engine that runs Qwen3.8-Flash-Next, a model its README sized at 125 billion parameters on 8 Oct, on a gaming PC. It serves OpenAI and Anthropic style APIs on localhost, so Claude Code can point at it. Created 24 Sep 2026. MIT, 17,290 stars on 8 Oct. [Source](https://github.com/Niko1221/Strata)
2. **openai/math.** Created 6 Oct. Manuscripts and proof files produced by an internal OpenAI model: 722 manuscripts in 372 families, per the README. Apache 2.0, 10,024 stars on 8 Oct. [Source](https://github.com/openai/math)
3. **11SquaresFormalized.** A Lean formalization of the optimality proof for packing 11 squares, posted to Hacker News as an AI assisted proof. The README says the result trusts Lean's kernel and native compiler. No licence listed. 24 stars and 109 points on Hacker News on 8 Oct. [Source](https://github.com/Queuingtheorydotcom/11SquaresFormalized)
4. **Codync.** Message Claude Code, Codex, Cursor, Gemini and other agents as bots on your own computer. v2.10.0 landed on 7 Oct. MIT, 177 stars on 8 Oct. [Source](https://github.com/leepokai/Codync)
5. **AnyPS5.** Not an agent tool, and here for the second day running. It ports PS5 executables to Linux and Windows without emulation. GPL 2.0, 11,008 stars and 348 points on Hacker News on 8 Oct. [Source](https://github.com/boykopovar/AnyPS5)

New repos can gain stars quickly for reasons other than use, so treat these as names to watch, not recommendations.

## Top 3 things people are arguing about

1. **What do 722 machine written manuscripts prove?** The openai/math README says the model was posed about 4,000 problems, that each result used three hours of ChatGPT Pro thinking compute on average, and that some unformalized results could have issues. The thread grew to 1,247 points and 1,419 comments on Hacker News on 8 Oct. [Source](https://news.ycombinator.com/item?id=49984923)
2. **How much does a cheaper small model matter?** Anthropic says Claude Haiku 5.5 costs around 75% less to run than Haiku 4.5 on average. The Hacker News thread had more than 700 points and 371 comments on 8 Oct. [Source](https://news.ycombinator.com/item?id=49996437)
3. **Does an answer need buttons?** OpenAI's post says ChatGPT can still give plain text when that is the most useful response, and that there is work ahead to improve the model's design judgment. The Hacker News thread had 280 comments on 8 Oct. Nobody could tap them. [Source](https://news.ycombinator.com/item?id=49996425)

## How this list is built

Each day our agents read GitHub releases and trending pages, the Hacker News front page, and the top posts on X and Reddit about coding agents. A name only makes a list with a link that was opened and a signal that can be shown: points, stars or a dated release. Repos are checked against the GitHub API before they appear, and a claim that exists only as a social post is left out. New here? Start with the [install guide](/blog/how-to-install-and-use-munder-difflin/).

<link rel="stylesheet" href="/blog/assets/media/agent-tools-today-2026-10-08/motion.css"><script defer src="/blog/assets/media/agent-tools-today-2026-10-08/motion.js"></script>
