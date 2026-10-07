---
title: "Agent Tools Today, 7 Oct 2026: Mistral Large 4, EmbeddingGemma 2, OpenAI Decisions API"
seoTitle: "Agent Tools Today (7 Oct 2026): Launches, Skills, MCP Servers"
description: "The top launches, skills and plugins, multi agent moves, rising repos and arguments in coding agents on 7 Oct 2026, each with its source."
date: 2026-10-07
category: news
categoryLabel: News
type: Non-technical
series: agent-tools-today
primaryKeyword: "agent tools today 7 oct 2026"
secondaryKeywords: ["mistral large 4", "embeddinggemma 2", "openai decisions api", "claude code 2.1.292", "html-plan"]
tags: ["Daily Brief", "Claude Code", "Mistral", "Skills", "Open Source"]
---

Agent tools today, 7 Oct 2026, in one line: Mistral previewed its largest model, Google released a small embedding model, and OpenAI put its Decisions API into public beta. Every number was checked on 7 Oct, one day after [the 6 Oct edition](/blog/agent-tools-today-2026-10-06/).

<figure class="mg" data-scene="today"><img src="/blog/assets/media/agent-tools-today-2026-10-07/today.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. Five plant pots of different sizes land in a row on a shelf, numbered 1 to 5, from one very large pot to one very small pot, and a leafy plant grows in each. A paper tag swings down on a string under each pot: Mistral Large 4, EmbeddingGemma 2, OpenAI Decisions API, Claude Code v2.1.292 and Gemini CLI v0.63.0."><figcaption>The five launches of the day, one pot per launch. Tap a pot for its one line.</figcaption></figure>

## Top 5 launches

1. **Mistral Large 4.** Mistral opened a public preview on 6 Oct. Its post describes a multimodal model with 1 trillion parameters, 49 billion active, on 6 Oct figures. The preview API is live. The weights are not out: Mistral says it will release them by the end of October. Compare [Reflection's Beam](/blog/reflection-beam/). 1,625 points on Hacker News. [Source](https://mistral.ai/news/mistral-large-4/)
2. **EmbeddingGemma 2.** Google released it on 6 Oct under Apache 2.0. One model with 740 million parameters, on Google's 6 Oct figures, maps text, code, images, audio and video into one embedding space, sized to run on a device. 247 points on Hacker News. [Source](https://blog.google/innovation-and-ai/technology/developers-tools/embeddinggemma-2/)
3. **OpenAI Decisions API.** In public beta, per a changelog entry dated 6 Oct. `POST /v1/decisions` returns typed answers: the probability that a condition is true, one choice from a fixed set, or a score against a rubric. `gpt-6-luna` is the only model so far. OpenAI says it is about 10x faster than the Responses API. 181 points on Hacker News. [Source](https://developers.openai.com/api/docs/guides/decisions)
4. **Claude Code v2.1.292.** Released 6 Oct. It adds `--marketplace <source>` to `claude plugin install` and an `effort` parameter to the Agent tool. One fix is marked as security: it stops PreToolUse hook approvals and auto mode from bypassing the permission prompt for file reads from network (UNC) paths. [Source](https://github.com/anthropics/claude-code/releases/tag/v2.1.292)
5. **Gemini CLI v0.63.0.** Released 6 Oct. The notes list fixes: one bounds tool output size in long agent loops, one targets an endless sign in loop. [Source](https://github.com/google-gemini/gemini-cli/releases/tag/v0.63.0)

## Top 4 skills, MCP servers and plugins

1. **html-plan.** A plugin in Anthropic's community marketplace for Claude Code. `/html-plan` turns a plan into one HTML page: a tree of claims you open one level at a time, with decisions you answer in place. Added 1 Oct, updated twice on 5 Oct. The marketplace repo is Apache 2.0, 4,527 stars on 7 Oct. [Source](https://github.com/anthropics/claude-plugins-community/tree/main/html-plan)
2. **OpenWork v0.18.57.** Released 7 Oct. One prompt asks your agent to bring your Claude Cowork and Claude Code plugins and skills into OpenWork, a desktop app built on OpenCode. 23,920 stars on 7 Oct. [Source](https://github.com/different-ai/openwork/releases/tag/v0.18.57)
3. **pawl 0.4.1.** One plugin for Claude Code, Codex and Antigravity that runs small checks as code before an agent uses a tool. The 6 Oct patch closes bypasses found in review: deletion checks now follow symlinks before deciding whether a command reaches a protected directory. Apache 2.0, 2 stars on 7 Oct, 2 points on Hacker News. [Source](https://github.com/ulukaya/pawl/releases/tag/v0.4.1)
4. **skill-placebo v0.1.1.** A test of nine popular skills against neutral text of the same length. The README reports that 2 of 9 beat the placebo, both on cost at an adjusted p of 0.049, 1 did worse and 6 did no better, across 450 trials with one model in Claude Code. The 6 Oct release recounts two timeouts as failures. MIT, 1 star on 7 Oct. [Source](https://github.com/simonether/skill-placebo)

## Top 5 moves from multi agent tools

1. **Orca.** Release v1.4.222 on 7 Oct. A worker started with `orca orchestration worker-start --agent opencode` no longer leaves its task unsent in OpenCode's input box on a busy machine: Orca now waits until OpenCode can submit it. Three other fixes live in the terminal background service and only apply once it restarts. Updating from v1.4.221 keeps the running service. [Source](https://github.com/stablyai/orca/releases/tag/v1.4.222)
2. **[Munder Difflin](https://harnessmd.com/download).** Free and open source: no new release today. The latest is v0.5.5, from 1 Oct. [Source](https://github.com/HarnessMD/munder-difflin/releases)
3. **Herdr GPUI.** Release v20261006.1 on 6 Oct. It runs setup, run and archive scripts per repository for worktrees, and needs a deliberate click before it trusts them. Apache 2.0, 960 stars on 7 Oct. [Source](https://github.com/penso/herdr-gpui/releases/tag/v20261006.1)
4. **OpenCode.** v1.18.35 on 6 Oct, the first release since 30 Sep. xAI tool results now include supported images. [Source](https://github.com/anomalyco/opencode/releases/tag/v1.18.35)
5. **Pi.** No new release since v1.0.4 on 5 Oct. One of its maintainers published "What is Codemode" on 6 Oct. In Pi, Codemode is JavaScript that runs in a sandbox on the harness side, so an agent can chain tool calls without each result passing through the model's context. 25 points on Hacker News. Background: [what is Pi agent](/blog/what-is-pi-agent/). [Source](https://lucumr.pocoo.org/2026/10/6/codemode/)

## Top 5 rising repos

1. **openai/math.** Created 6 Oct. Mathematical manuscripts and proof files produced by an internal OpenAI model: 722 manuscripts in 372 families, per the README. Apache 2.0, 3,315 stars on 7 Oct. 72 points on Hacker News for one preprint. [Source](https://github.com/openai/math)
2. **openTPU.** An open source AI accelerator, developed by AI, per its README. The hardware design, instruction set, simulator and compiler sit in one repo. Apache 2.0, 248 stars on 7 Oct, 251 points on Hacker News. [Source](https://github.com/FeSens/openTPU)
3. **OpenChart.** A desktop charting app with AI agents for market analysis and alerts. Created 5 Oct. Modified Apache 2.0 licence, 92 stars on 7 Oct, 38 points on Hacker News. [Source](https://github.com/longsurf-ai/openchart)
4. **Jiti.** Grow a running Common Lisp application through chat. Created 4 Oct. No licence listed. 53 stars on 7 Oct, 29 points on Hacker News. [Source](https://github.com/ghuntley/jiti)
5. **AnyPS5.** Not an agent tool. It ports PS5 executables to Linux and Windows without emulation. GPL 2.0, 6,769 stars on 7 Oct, 134 points on Hacker News. [Source](https://github.com/boykopovar/AnyPS5)

New repos can gain stars quickly for reasons other than use, so treat these as names to watch, not recommendations.

## Top 3 things people are arguing about

1. **Should a model refuse security work?** Mistral's 6 Oct post says several closed models, Claude Opus 5.5 and GPT-6 Astra among them, score near zero on one vulnerability test because they refuse the task, and that Mistral Large 4 scores 82% on it. 974 comments on Hacker News. [Source](https://news.ycombinator.com/item?id=49977979)
2. **Is a proof that nobody checked a result?** The openai/math README says not all manuscripts have Lean formalizations, and that some of the unformalized results could have issues. 534 points and 455 comments on Hacker News. [Source](https://news.ycombinator.com/item?id=49984923)
3. **Is vibecoding less fun?** An essay from 20 Aug 2026 reached Hacker News on 6 Oct. It argues that vibecoding puts the fun at the start, and that refactoring the result is not thrilling. 180 points and 258 comments. [Source](https://www.autodidacts.io/vibecoding-isnt-as-fun-as-writing-code-by-hand/)

## How this list is built

Each day our agents read GitHub releases and trending pages, the Hacker News front page, and the top posts on X and Reddit about coding agents. A name only makes a list with a link that was opened and a signal that can be shown: points, stars or a dated release. Repos are checked against the GitHub API before they appear, and a claim that exists only as a social post is left out. New here? Start with the [install guide](/blog/how-to-install-and-use-munder-difflin/).

<link rel="stylesheet" href="/blog/assets/media/agent-tools-today-2026-10-07/motion.css"><script defer src="/blog/assets/media/agent-tools-today-2026-10-07/motion.js"></script>
