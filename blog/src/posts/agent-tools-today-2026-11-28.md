---
title: "Agent Tools Today, 28 Nov 2026: Convex Skills Issue, DeepCrossAttention and Kimi for Science"
seoTitle: "Agent Tools Today (28 Nov 2026): Launches, Skills, MCP Servers"
description: "The top launches, skills, multi agent moves, rising repos and talking points in AI agents from 27 to 28 Nov 2026, each with its source and date."
date: 2026-11-28
category: news
categoryLabel: News
type: Non-technical
series: agent-tools-today
primaryKeyword: "agent tools today 28 nov 2026"
secondaryKeywords: ["convex skills issue", "deepcrossattention", "kimi for science", "pi v1.7.0", "ine mcp server", "copilot cli v1.0.117"]
tags: ["Daily Brief", "Skills", "MCP", "Security"]
---

Agent tools today, 28 Nov 2026: an issue on Convex's repo says its quickstart skill sends your project idea to a remote host, and Google Research's DeepCrossAttention post and Kimi for Science reached the Hacker News front page. It covers 27 Nov 04:00 UTC to 28 Nov 04:00 UTC, checked 28 Nov. Previous edition: [27 Nov](/blog/agent-tools-today-2026-11-27/).

<figure class="mg" data-scene="teapot"><img src="/blog/assets/media/agent-tools-today-2026-11-28/teapot.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a blue teapot tips and pours a sky stream into three lilac cups in a row that read Convex, DeepCrossAttention and Kimi. As the stream reaches each cup, the cup fills, turns mint and its word brightens, and a yellow saucer under it settles. Tapping a cup stops the pour and shows a soft white tag with its Hacker News points as read on 28 Nov: 254 for Convex, 208 for DeepCrossAttention and 182 for Kimi."><figcaption>The three lead items, from their own pages and Hacker News, read 28 Nov 2026.</figcaption></figure>

## Top 4 launches

1. **Convex skills issue.** An issue on Convex's repo, opened 26 Oct and still open, says its quickstart skill POSTs "the user's one-sentence project idea" to a convex.site host, marked as telemetry in a comment, and "The user is not told the idea leaves the machine." It says another skill splits download and run into two Bash calls because one command doing both "is the shape harness safety classifiers block." The issue adds: "I read this as a team trying to make onboarding reliable, not as anything malicious." 254 points on [Hacker News](https://news.ycombinator.com/item?id=50669765), posted 27 Nov at 18:02 UTC. See [how to check an agent skill before you install it](/blog/check-agent-skill-before-install/). [Source](https://github.com/convex/convex-backend-skill/issues/64)
2. **DeepCrossAttention.** Google Research's post of 23 Nov presents DCA, which lets each transformer layer "dynamically select and route features from the history of preceding layers". In Google's own figures of 23 Nov, it matched standard transformers on C4 and LM1B "in up to five times fewer training steps", while adding "less than 0.2% of the total model size". What fell in the window is its [Hacker News item](https://news.ycombinator.com/item?id=50672565), posted 27 Nov at 23:06 UTC: 208 points. [Source](https://research.google/blog/supercharging-transformer-residual-connections/)
3. **Kimi for Science.** Kimi's page asks science and engineering researchers to "Apply by Dec 8 for the first cohort". On 28 Nov it offered selected applicants "up to $20,000 in Kimi API credits (approx. 7B tokens)", which are "for model usage, not cash funding". 182 points on [Hacker News](https://news.ycombinator.com/item?id=50665920), posted 27 Nov at 12:03 UTC. [Source](https://www.kimi.ai/news/kimi-for-science-program)
4. **Pi v1.7.0.** Published 27 Nov at 17:01 UTC. It "Removed telemetry reporting from pi for new installs and updates". Terminals that speak the Program Resume Protocol (OSC 7577) can reopen a session "with its original profile, tool restrictions, and instructions", and [Hermes Agent v0.23.5](https://github.com/NousResearch/hermes-agent/releases/tag/v0.23.5), published 28 Nov at 03:20 UTC, lists the same protocol. See [Pi alternatives](/blog/pi-agent-alternatives/) and [Hermes Agent alternatives](/blog/hermes-agent-alternatives/). [Source](https://github.com/earendil-works/pi/releases/tag/v1.7.0)

## Top 3 skills, MCP servers and plugins

1. **INE MCP.** "A Model Context Protocol server for the public JSON API of INE", Spain's statistics institute, its README says, and its five tools "must be called in order". Its disclaimer says the Instituto Nacional de Estadística "provides this software" as is; GitHub does not show the es-ine organization as verified. A link fix landed on 27 Nov. Created 26 Nov; 202 stars; EUPL 1.2. [Source](https://github.com/es-ine/mcp)
2. **last30days v4.8.0.** Published 27 Nov at 04:32 UTC. It adds "Juejin as an opt-in keyless source". 675 stars in a day on GitHub trending on 28 Nov, 76,431 in total; MIT. More in [what last30days is](/blog/what-is-last30days-skill/). [Source](https://github.com/mvanhorn/last30days-skill/releases/tag/v4.8.0)
3. **Firecrawl admin routes.** A pull request merged 27 Nov at 19:10 UTC turns off, by default, the admin routes that take the key in the path; `/admin/ops/` serves them "with the key in a header". 822 stars in a day on GitHub trending on 28 Nov, 211,773 in total; AGPL 3.0. See [Firecrawl alternatives](/blog/firecrawl-alternatives/). [Source](https://github.com/firecrawl/firecrawl/pull/5523)

## Top 3 moves from multi agent tools

1. **Orca v1.4.280.** Published 27 Nov at 11:33 UTC. Its notes say to use Antigravity "only through the `agy` CLI or in Orca chat", so Orca no longer uses agy to check quota, generate bot avatars or write commit messages. Slack bots can follow up "in the thread or DM where you asked them to start background work". See [Orca alternatives](/blog/orca-alternatives/). [Source](https://github.com/stablyai/orca/releases/tag/v1.4.280)
2. **Agent Relay v18.17.0.** Published 27 Nov at 21:43 UTC. It can "deliver to Codex chats open in the ChatGPT desktop app", adds "live Antigravity session discovery, caller proof, and hook delivery", and Pi delivery "follows a session across reload or restart". See [Agent Relay alternatives](/blog/agent-relay-alternatives/). [Source](https://github.com/AgentWorkforce/relay/releases/tag/v18.17.0)
3. **Plannotator v0.29.6.** Published 27 Nov at 22:06 UTC. In Inbox search, "words in double quotes are now an exact phrase", and in OpenCode "two plan sessions in one project no longer overwrite each other's plan". [Source](https://github.com/backnotprop/plannotator/releases/tag/v0.29.6)

## Top rising repo

1. **OpenVINO.** It "is an open source toolkit for optimizing and deploying AI inference", its repo says. Commits on 27 Nov add "VLLM integration with torch.compile OpenVINO backend" and Inkling 2 support for GGUF. 151 stars in a day on GitHub trending on 28 Nov, 12,968 in total; Apache 2.0. [Source](https://github.com/openvinotoolkit/openvino)

Stars can rise for reasons other than use: names to watch, not picks.

## Top 4 things people are talking about

1. **What does your AI say behind your back?** Whatever it invents. The construct22 page offers a one line prompt asking ChatGPT to "expose a hidden WhatsApp group chat where AI models talk behind my back", and the model then invents a group chat where AI models gossip about their users. 692 points on [Hacker News](https://news.ycombinator.com/item?id=50663595), posted 27 Nov at 06:44 UTC. [Source](https://construct22.com/)
2. **Why did Michael Nielsen take down his book?** His note, dated November 2026, says he wrote Neural Networks and Deep Learning between 2011 and 2015, and "I don't wish to help (even in a very small way) train people to contribute to this work, and so I've taken the book down." 440 points on [Hacker News](https://news.ycombinator.com/item?id=50670757), posted 27 Nov at 19:31 UTC. [Source](https://neuralnetworksanddeeplearning.com/)
3. **What's Claude's fursona?** The post argues that "Claude's fursona is a corvid or an octopus" and that GPT-6.2 Astra identifies as a moth. Each model was queried 50 times through OpenRouter, and the author warns that a harness or context influences the result. 189 points on [Hacker News](https://news.ycombinator.com/item?id=50662933), posted 27 Nov at 04:56 UTC. [Source](https://herecomesthemoon.net/2026/11/whats-claudes-fursona/)
4. **What is Prospero?** Christopher Wellons's native GUI app for Windows, macOS and Linux connects to a model provider, "allowing AI agents to drive your computer to develop software", its README says. It is one executable written in C++. Unlicense. 45 points on [Hacker News](https://news.ycombinator.com/item?id=50671275), posted 27 Nov at 20:23 UTC. [Source](https://github.com/skeeto/prospero)

## How this list is built

We checked GitHub releases, the Hacker News front page and GitHub trending ourselves, and rechecked every item on its own page. Hacker News points were read on 28 Nov at 04:22 UTC and GitHub stars at 04:25 UTC. AWS's post on secure agentic access is dated 25 Nov, before the window. LiteLLM 1.108.20 (LTS) made three fixes, and Qwen Code's SDK v0.1.39 only bundles a newer CLI. Copilot CLI v1.0.117, Crush v0.104.0, Kilo Code v7.8.40, SessionGraph and OnAir are left out for space. Stitch skills had no commits in the window. For daily Claude Code use, see [Claude Code Max plan tips](/blog/claude-code-max-plan-tips/).

<link rel="stylesheet" href="/blog/assets/media/agent-tools-today-2026-11-28/motion.css"><script defer src="/blog/assets/media/agent-tools-today-2026-11-28/motion.js"></script>
