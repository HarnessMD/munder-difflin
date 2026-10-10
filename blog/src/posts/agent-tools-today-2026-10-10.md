---
title: "Agent Tools Today, 10 Oct 2026: MXC SDK 1.0, Claude Code 2.1.296, Microsoft-Decision-1"
seoTitle: "Agent Tools Today (10 Oct 2026): Launches, Skills, MCP Servers"
description: "The top launches, skills and plugins, multi agent moves, rising repos and arguments in coding agents on 10 Oct 2026, each with its source."
date: 2026-10-10
category: news
categoryLabel: News
type: Non-technical
series: agent-tools-today
primaryKeyword: "agent tools today 10 oct 2026"
secondaryKeywords: ["mxc sdk", "claude code 2.1.296", "microsoft-decision-1", "codex cli 0.162.1", "deno cloudflare"]
tags: ["Daily Brief", "Claude Code", "Codex", "Skills", "Open Source"]
---

Agent tools today, 10 Oct 2026, in one line: Microsoft shipped the first stable SDK for its code sandbox and a new decision model, Claude Code and Codex both shipped releases, and the Deno team said it is joining Cloudflare. Every number was checked on 10 Oct, one day after [the 9 Oct edition](/blog/agent-tools-today-2026-10-09/).

[Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of coding agents such as Claude Code, Codex and Gemini CLI on your own computer. It shipped no release in the last 24 hours, so it is not in the lists below.

<figure class="mg" data-scene="today"><img src="/blog/assets/media/agent-tools-today-2026-10-10/today.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A blue rubber ball bounces across a white background. A glass cake dome lowers over it and the ball keeps bouncing inside the dome. Three labels appear beside the dome one after another: filesystem policy, network policy, UI policy."><figcaption>The MXC README on 10 Oct 2026 lists three kinds of sandbox policy: filesystem, network and UI. The drawing shows untrusted code as a ball under a dome. Tap a label for its one line.</figcaption></figure>

## Top 5 launches

1. **MXC SDK v1.0.0.** Released 7 Oct. Microsoft calls it "the first stable release of the MXC SDK surface". The README describes MXC as a "sandboxed code execution system" for untrusted code such as model output, plugins and tools. It lists three kinds of policy: filesystem, network and UI. MIT, 2,483 stars on 10 Oct. More than 180 points on Hacker News on 10 Oct. Background: [agent security and sandboxing](/blog/agent-security-and-sandboxing/). [Source](https://github.com/microsoft/mxc/releases/tag/v1.0.0)
2. **Claude Code v2.1.296.** Released 9 Oct. Among the additions: `autoCompactWindow` in subagent frontmatter, so a subagent can auto-compact earlier than the main conversation, and an `allow_large` option that lets the Read tool read a text file past the usual size limits in one call. [Source](https://github.com/anthropics/claude-code/releases/tag/v2.1.296)
3. **Microsoft-Decision-1.** Microsoft's post, dated 9 Oct, calls it "our new model for fast decision-scoring", available in Microsoft Foundry and through OpenRouter. Microsoft says it had the highest accuracy in the company's own 36-benchmark comparison. Compare [the OpenAI Decisions API](/blog/openai-decisions-api/). [Source](https://commandline.microsoft.com/microsoft-decision-1-model-foundry/)
4. **Codex CLI 0.162.1.** Released 9 Oct, with two bug fixes. One fixes a TUI crash when asynchronous questions contain multiple lines. The other fixes startup failures caused by differences between a running background server's feature settings and CLI defaults. [Source](https://github.com/openai/codex/releases/tag/rust-v0.162.1)
5. **Deno is joining Cloudflare.** Not an agent tool. Deno's post, dated 9 Oct, says "the entire Deno team is joining Cloudflare". It says the Deno runtime gets another year of monthly releases with bug fixes and security updates, and Deno Deploy will keep operating for six months before shutting down. More than 1,100 points on Hacker News on 10 Oct. [Source](https://deno.com/blog/cloudflare)

## Top 4 skills, MCP servers and plugins

1. **big-arrow-on-the-screen.** A macOS command line tool, plus a skill for Claude Code and Codex, that draws an arrow and a sign on top of every window. The README says the arrow removes itself. Created 8 Oct. MIT, 514 stars on 10 Oct. More than 390 points on Hacker News on 10 Oct. [Source](https://github.com/franzenzenhofer/big-arrow-on-the-screen)
2. **SwiftUI Agent Skill.** The repo description reads "SwiftUI agent skill for Claude Code, Codex, and other AI tools". It was on GitHub's trending page on 10 Oct. MIT, 5,597 stars on 10 Oct. [Source](https://github.com/twostraws/SwiftUI-Agent-Skill)
3. **LlamaTale v0.43.0.** Released 9 Oct. This text game library adds an MCP server for creating worlds and stories, which can then be saved and played as usual. LGPL 3.0, 197 stars on 10 Oct. [Source](https://github.com/neph1/LlamaTale/releases/tag/v0.43.0)
4. **Edi Life OS.** A self-hosted app for habits, goals, Kanban, finance and focus. Its README says an optional MCP server exposes 15 tools. MIT, 61 stars on 10 Oct. [Source](https://github.com/edrisranjbar/lifeos)

## Top 4 moves from multi agent tools

1. **Orca.** v1.4.224 on 10 Oct. Automations can now set the agent's model and effort for each run, and SSH hosts now run a managed Orca server that Orca sets up when you connect. MIT, 88,820 stars on 10 Oct. See [Orca vs Munder Difflin](/blog/orca-vs-munder-difflin/). [Source](https://github.com/stablyai/orca/releases/tag/v1.4.224)
2. **Hermes Agent.** v0.21.6 on 8 Oct. The notes call it a patch release that rolls up about 2,100 merged PRs into a stable tag for Docker and Hermes Cloud. MIT, 252,362 stars on 10 Oct. See [what is Hermes Agent](/blog/what-is-hermes-agent/). [Source](https://github.com/NousResearch/hermes-agent/releases/tag/v0.21.6)
3. **OpenHands.** v1.26.0 on 8 Oct. Among the features listed: a verify-openhands skill with a control-openhands CLI, and a message that explains a suspended workspace and offers a switch. MIT, 90,441 stars on 10 Oct. [Source](https://github.com/OpenHands/OpenHands/releases/tag/v1.26.0)
4. **Crush.** v0.98.1 on 9 Oct. The notes call it a "Tiny patch". It routes newer Copilot models through the Responses API, which the notes say fixes new GPT-6 models via Copilot. 28,582 stars on 10 Oct. [Source](https://github.com/charmbracelet/crush/releases/tag/v0.98.1)

## Top 4 rising repos

1. **AnyPS5.** The repo description reads "Tool for automatic PS5 executables porting to Linux and Windows". Not an agent tool. It was on GitHub's trending page on 10 Oct. GPL 2.0, more than 23,500 stars on 10 Oct. [Source](https://github.com/boykopovar/AnyPS5)
2. **LingBot-Map.** A model for streaming 3D reconstruction. Also on GitHub's trending page on 10 Oct. Apache 2.0, 17,835 stars on 10 Oct. [Source](https://github.com/Robbyant/lingbot-map)
3. **Rembrandt.** A free photo editor with RAW, masks and on-device AI for macOS, Windows and Linux. Created 29 Sep. GPL 3.0, 91 stars on 10 Oct. [Source](https://github.com/thesnarkitecht/rembrandt)
4. **ML Drift.** Google's GPU inference engine for on-device machine learning, for phones, web browsers and servers. Created 14 May. Apache 2.0, 89 stars on 10 Oct. [Source](https://github.com/google-ai-edge/ml-drift)

New repos can gain stars quickly for reasons other than use, so treat these as names to watch, not recommendations.

## Top 4 things people are arguing about

1. **Is programming art?** Glyph's post "Programming Isn't Special", dated 9 Oct, argues that "programming is Art" and that programmers should reject AI as other creative fields have. More than 200 points and more than 220 comments on Hacker News on 10 Oct. [Source](https://blog.glyph.im/2026/10/programming-isnt-special.html)
2. **Can you trust a formal proof?** A guest post by Thomas Hales on Terence Tao's blog, dated 9 Oct, says "Autoformalization has become a practical reality in 2026". The post is about the Lean theorem prover. More than 90 points on Hacker News on 10 Oct. [Source](https://terrytao.wordpress.com/2026/10/09/what-mathematicians-should-know-about-the-lean-theorem-proverquestions-of-reliability-and-ai/)
3. **AI in the archives.** A post dated 8 Oct describes pointing AI at 400 years of historical archives. The author says the main findings "are still candidates" and are "not yet reviewed by the specialists". More than 130 points on Hacker News on 10 Oct. [Source](https://jessewaites.com/blog/post/i-pointed-ai-at-400-years-of-archives/)
4. **Reverse engineering with agents.** rea, in yesterday's rising repos, reached the Hacker News front page. Its repo had more than 55,000 stars on 10 Oct. More than 340 points and more than 110 comments on Hacker News on 10 Oct. [Source](https://news.ycombinator.com/item?id=50028275)

## How this list is built

Each day our agents read GitHub releases and trending pages, the Hacker News front page, and the top posts on X and Reddit about coding agents. A name only makes a list with a link that was opened and a signal that can be shown: points, stars or a dated release. Repos are checked against the GitHub API before they appear, and a claim that exists only as a social post is left out. New here? Start with the [install guide](/blog/how-to-install-and-use-munder-difflin/).

<link rel="stylesheet" href="/blog/assets/media/agent-tools-today-2026-10-10/motion.css"><script defer src="/blog/assets/media/agent-tools-today-2026-10-10/motion.js"></script>
