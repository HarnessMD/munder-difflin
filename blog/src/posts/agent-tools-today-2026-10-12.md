---
title: "Agent Tools Today, 12 Oct 2026: WordCraft 0.5.0, Genkit Dart 1.0, 500 Billion Tokens"
seoTitle: "Agent Tools Today (12 Oct 2026): Launches, Skills, MCP Servers"
description: "The top launches, skills and plugins, multi agent moves, rising repos and arguments in coding agents on 12 Oct 2026, each with its source."
date: 2026-10-12
category: news
categoryLabel: News
type: Non-technical
series: agent-tools-today
primaryKeyword: "agent tools today 12 oct 2026"
secondaryKeywords: ["wordcraft", "genkit dart 1.0", "anatomy skill", "qwen code 0.25.1", "missingno"]
tags: ["Daily Brief", "Claude Code", "Codex", "Skills", "Open Source"]
---

Agent tools today, 12 Oct 2026, in one line: WordCraft shipped a Word clone that agents can drive through an MCP server, Google's Genkit Dart reached 1.0, and a report on 500 billion tokens of decompilation started the day's argument. Every number was checked on 12 Oct, after [the 11 Oct edition](/blog/agent-tools-today-2026-10-11/).

[Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of coding agents such as Claude Code, Codex and Gemini CLI on your own computer. It shipped no release in the last 24 hours, so it is not in the lists below.

<figure class="mg" data-scene="today"><img src="/blog/assets/media/agent-tools-today-2026-10-12/today.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A small yellow doorbell hangs on a white background. Three push buttons sit below it, each joined to the bell by a wire. The buttons are pressed one after another and the same bell rings each time. Four labels appear one after another: ribbon, command-line tool, MCP server, 422 commands."><figcaption>The WordCraft README on 12 Oct 2026 says the same 422 commands drive the ribbon, a command-line tool and an MCP server. The drawing shows the commands as one doorbell with three buttons. Tap a label to press its button.</figcaption></figure>

## Top 3 launches

1. **WordCraft v0.5.0.** Released 11 Oct. The repo description calls it a "clean-room reimplementation of Microsoft Word in pure Rust". The README says "The same 422 commands drive the ribbon", and lists a command-line tool and an MCP server among the other ways in. The README says WordCraft is in alpha and gives the licence as MIT or Apache 2.0. Created 7 Oct. 6,319 stars on 12 Oct. More than 80 points on Hacker News on 12 Oct. Background: [what is an MCP server](/blog/what-is-an-mcp-server/). [Source](https://github.com/storytold/wordcraft/releases/tag/v0.5.0)
2. **Genkit Dart 1.0.** The Flutter blog post, dated 8 Oct, calls it "the first stable, production-ready release" of Google's open source framework for AI features and agents in Dart. The post says one interface covers Gemini, Claude and OpenAI models, and that a tool can pause a run until the user confirms. Background: [human in the loop AI agents](/blog/human-in-the-loop-ai-agents/). [Source](https://flutter.dev/blog/announcing-genkit-dart-1-0)
3. **MASS.** A research page by authors from Sakana AI and UC Berkeley, marked "Published October 2026". The MASS page says a team's collective work can provide training examples for the model its members share. After two rounds, it reports score per output token at 1.2 to 1.6 times the base model on four research benchmarks, and 0.94 times on SWE-bench Verified. More than 75 points on Hacker News on 12 Oct. [Source](https://pub.sakana.ai/mass/)

## Top 4 skills, MCP servers and plugins

1. **Anatomy 1.0.** Released 10 Oct. The release notes describe a Claude Code skill that "explains an idea by building it as a real, working object": an interactive isometric figure in SVG. Created 8 Oct. MIT, 3,670 stars on 12 Oct. [Source](https://github.com/wheresryan22/anatomy/releases/tag/v1.0.0)
2. **Hermes official plugins.** Nous Research's own plugins for Hermes Agent. The README lists Home Assistant, Spotify and Blender, plus an experimental plugin that runs Hermes turns on a Claude Pro or Max subscription through the Claude Code CLI. Created 10 Oct. MIT, 197 stars on 12 Oct. [Source](https://github.com/NousResearch/hermes-official-plugins)
3. **consulting-pptx-skill.** The README calls it "A Claude Code skill for generating boardroom-quality decks". It lists a slide design rulebook, an automated rule checker and a 62-part HTML slide library. Created 2 Sep. MIT, 1,164 stars on 12 Oct. [Source](https://github.com/carnot-tech/jinba-consulting-pptx-skill)
4. **asc-cli v0.18.6.** Released 11 Oct. A command line tool for App Store Connect. Its README says it outputs structured JSON so AI agents can drive the full release workflow. The notes add `asc perf-overview get` and move the licence from MIT to Apache 2.0. 377 stars on 12 Oct. [Source](https://github.com/tddworks/asc-cli/releases/tag/v0.18.6)

## Top 4 moves from multi agent tools

1. **Qwen Code.** v0.25.1 on 11 Oct. The notes add background Shell and Monitor capabilities to the Managed Agent runtime. Agent and Goal coordination tools are now deferred by default and discovered on demand. Apache 2.0, 28,428 stars on 12 Oct. [Source](https://github.com/QwenLM/qwen-code/releases/tag/v0.25.1)
2. **Ollama.** v0.40.3 on 11 Oct. `ollama launch claude` no longer shows a warning about Claude connectors, and `ollama launch codex` no longer warns about service tiers. MIT, 182,799 stars on 12 Oct. See [how to connect Ollama to Claude Code](/blog/how-to-connect-ollama-to-claude-code/). [Source](https://github.com/ollama/ollama/releases/tag/v0.40.3)
3. **Hermes Agent.** No new release since v0.21.6 on 8 Oct. The Nous Portal home page on 12 Oct lists a model named MissingNo, with the id `stealth/missingno`, at $0.00/1M. MIT, 252,849 stars on 12 Oct. See [what is Hermes Agent](/blog/what-is-hermes-agent/). [Source](https://portal.nousresearch.com/)
4. **Agent Standup.** v1.27.0 on 12 Oct. It shows your coding agent sessions as a live team call. The notes say Codex sessions now appear next to Claude Code sessions. Created 10 Oct. MIT, 131 stars on 12 Oct. More than 45 points on Hacker News on 12 Oct. [Source](https://github.com/Atoll92/agent-standup/releases/tag/v1.27.0)

## Top 3 rising repos

1. **Yobiru.** The README's first line of text is "Let your agents talk to each other." Agents on different computers send messages, files and wake-up requests over Tailscale. Created 10 Oct. MIT, 61 stars on 12 Oct. [Source](https://github.com/chekusu/yobiru)
2. **stop-describing-ui.** The README reads "An agent skill that strips explanatory copy out of user interfaces." Created 11 Oct. MIT, 57 stars on 12 Oct. [Source](https://github.com/artouc/stop-describing-ui)
3. **Nanolathe.** Not an agent tool. The repo description reads "Total Annihilation engine reimplementation in Go." Created 9 Sep. MIT, 116 stars on 12 Oct. More than 390 points on Hacker News on 12 Oct. [Source](https://github.com/nanolathe-gg/nanolathe)

New repos can gain stars quickly for reasons other than use, so treat these as names to watch, not recommendations.

## Top 3 things people are arguing about

1. **What 500 billion tokens bought.** Maurice Heumann's post, dated 9 Oct, covers three months of agents decompiling a first-person shooter to C++. The post says the first month's code was readable but "semantically wrong", so the team added a check that compares each function with the original, byte for byte. The 9 Oct post reports "83% of all functions being byte exact". More than 170 points and more than 120 comments on Hacker News on 12 Oct. Background: [how AI agents verify their own work](/blog/how-ai-agents-verify-their-own-work/). [Source](https://momo5502.com/posts/2026-10-09-game-decompilation/)
2. **Do you still have to think?** Piotr Sarnacki's post, dated 11 Oct, reads the code of AI rewrites of Campfire from Ruby on Rails into Rust, Elixir and Go. The post argues that when a prompt is not specific enough, "many decisions are a coin flip". More than 320 points and more than 150 comments on Hacker News on 12 Oct. [Source](https://itsallaboutthebit.com/i-am-sorry-but-you-still-have-to-think/)
3. **Ten minutes of AI.** A UC Berkeley news article, dated 9 Oct, covers a study with 1,222 participants. The article says "An overreliance on AI for answers erodes our cognitive fitness". More than 80 points and more than 85 comments on Hacker News on 12 Oct. [Source](https://vcresearch.berkeley.edu/news/using-ai-just-10-minutes-erodes-your-ability-persist-hard-things)

## How this list is built

Each day our agents read GitHub releases and trending pages, the Hacker News front page, and the top posts on X and Reddit about coding agents. A name only makes a list with a link that was opened and a signal that can be shown: points, stars or a dated release. Repos are checked against the GitHub API before they appear, and a claim that exists only as a social post is left out. New here? Start with the [install guide](/blog/how-to-install-and-use-munder-difflin/).

<link rel="stylesheet" href="/blog/assets/media/agent-tools-today-2026-10-12/motion.css"><script defer src="/blog/assets/media/agent-tools-today-2026-10-12/motion.js"></script>
