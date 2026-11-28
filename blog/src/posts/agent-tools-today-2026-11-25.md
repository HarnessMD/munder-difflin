---
title: "Agent Tools Today, 25 Nov 2026: Skills over MCP, Claude Apps and Ternary Bonsai 2.5"
seoTitle: "Agent Tools Today (25 Nov 2026): Launches, Skills, MCP Servers"
description: "The top launches, skills, multi agent moves, rising repos and talking points in AI agents from 24 to 25 Nov 2026, each with its source and date."
date: 2026-11-25
category: news
categoryLabel: News
type: Non-technical
series: agent-tools-today
primaryKeyword: "agent tools today 25 nov 2026"
secondaryKeywords: ["skills over mcp", "install as app", "ternary bonsai 2.5 27b", "claude code v2.1.332", "t3 code v0.1.12", "openclaw 2026.11.10"]
tags: ["Daily Brief", "Anthropic", "MCP", "Open Source"]
---

Agent tools today, 25 Nov 2026: Anthropic put Skills over MCP in public beta, Claude artifacts began rolling out in beta as Mac and Windows apps, and PrismML released Ternary Bonsai 2.5 27B. It covers 24 Nov 03:45 UTC to 25 Nov 09:30 UTC, checked 25 Nov. Previous edition: [24 Nov](/blog/agent-tools-today-2026-11-24/).

<figure class="mg" data-scene="clothesline"><img src="/blog/assets/media/agent-tools-today-2026-11-25/clothesline.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a blue clothesline sways between two yellow posts. Three lilac cards hang from sky pegs and read Skills over MCP, Install as app and Bonsai 2.5. As a breeze reaches each card, the card lifts, turns mint and its words brighten. Tapping a card stops the breeze and shows a soft white tag with its date, 24 Nov."><figcaption>The three lead items, from their own pages dated 24 Nov 2026, read 25 Nov 2026.</figcaption></figure>

## Top 5 launches

1. **Skills over MCP.** Anthropic's post of 24 Nov puts Skills over MCP "in public beta in Claude, so MCP servers can ship skills alongside their tools". Tasks, which run long jobs "while Claude keeps working", and Elicitation, which can "pause to ask the user for input", are "now generally available"; File Uploads "is rolling out soon". MCP turns two, with "over 10,000 MCP connectors for Claude". [Source](https://claude.com/resources/articles/skills-over-mcp-tasks-and-more)
2. **Install as app.** Anthropic's post of 24 Nov says the "Install as app" feature "is rolling out in beta in Claude for Mac and Windows". An installed artifact "gets its own icon and opens in its own window", can use your connectors, and Claude asks for permission again "after every update". Its requests "count toward your plan's usage limits". [Source](https://claude.com/resources/articles/install-as-app)
3. **Ternary Bonsai 2.5 27B.** PrismML's post of 24 Nov calls it an upgrade "with substantially stronger agentic coding, multi-turn tool use, and multi-step task execution", based on Qwen3.8 27B, with a "5.9 GB model footprint" and Apache 2.0 weights. It scores 75.6 on SWE-bench Verified, up from 60.8 for Bonsai 2: PrismML's own figures. 444 points on [Hacker News](https://news.ycombinator.com/item?id=50633922), posted 24 Nov at 20:08 UTC. [Source](https://prismml.com/news/bonsai-2-5-27b)
4. **Claude Code v2.1.332.** Published 25 Nov at 01:32 UTC. It adds "skills from MCP servers (beta)", shown as `server:skill` in the `/` menu, and a `PreSkillShellCommand` hook event "that can refuse a skill or command's inline shell commands as it loads". See [Claude Code Max plan tips](/blog/claude-code-max-plan-tips/). [Source](https://github.com/anthropics/claude-code/releases/tag/v2.1.332)
5. **goose v1.61.0.** Published 25 Nov at 03:31 UTC. It can "Import MCP's server.json format into goose config", makes tool approval optional for execution, and adds Gemini 4 Neon to its catalog. See [goose alternatives](/blog/goose-alternatives/). [Source](https://github.com/aaif-goose/goose/releases/tag/v1.61.0)

## Top 4 skills, MCP servers and plugins

1. **Chrome DevTools MCP 1.14.0.** Published 24 Nov at 14:59 UTC. It adds an "inspect-in-devtools skill and claude plugin command", `--backgroundNewPages` and transparent screenshots, and lists "errors a page raises while a tool runs". [Source](https://github.com/ChromeDevTools/chrome-devtools-mcp/releases/tag/chrome-devtools-mcp-v1.14.0)
2. **Versine.** Its team's Launch HN says to "think Venmo with an MCP": your agent can send and request money, each user has "a self-custodial stablecoin wallet storing USDC on Base", and sending needs your approval "(via passkey in our app)" unless you mark the contact as trusted. Its site calls it "a fintech company, not an FDIC-insured bank". 87 points on [Hacker News](https://news.ycombinator.com/item?id=50634426), posted 24 Nov at 20:44 UTC. [Source](https://versine.com)
3. **Caveman.** "why use many token when few token do trick", its repo says: a "Skill + local proxy for coding agents". Docs commits landed on 24 Nov. 122,719 stars on 25 Nov; Apache-2.0. More in [what Caveman is](/blog/what-is-caveman/). [Source](https://github.com/JuliusBrussee/caveman)
4. **UI UX Pro Max.** "An AI skill that provides design intelligence for building professional UI/UX", its repo says. A commit on 24 Nov adds "exact hex palette lookup". 153,943 stars on 25 Nov; MIT. More in [what UI UX Pro Max is](/blog/what-is-ui-ux-pro-max-skill/). [Source](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)

## Top 4 moves from multi agent tools

1. **OpenClaw 2026.11.10.** The [release](https://github.com/openclaw/openclaw/releases/tag/v2026.11.10), published 25 Nov at 05:42 UTC, rolls up "7,671 pull requests". Deep Research, "enabled by default", returns "a cited report with side-by-side quotes when sources disagree"; Knowledge, which you opt into, builds "a linked local Markdown vault". See [OpenClaw alternatives](/blog/openclaw-alternatives/). [Source](https://raw.githubusercontent.com/openclaw/openclaw/main/CHANGELOG/2026.11.10.md)
2. **T3 Code v0.1.12.** Published 25 Nov at 07:36 UTC with "1092 changes from 226 contributors". Projects can "Work across several repositories", and Workflows (beta) run "durable workflows with agents, schedules, webhooks, and human approvals". See [T3 Code alternatives](/blog/t3-code-alternatives/). [Source](https://github.com/pingdotgg/t3code/releases/tag/v0.1.12)
3. **OpenHands 1.45.0.** Published 24 Nov at 09:13 UTC. It adds "OpenHands Projects in Canvas (experimental)" and nests "sub-agent conversations under their parent". See [OpenHands alternatives](/blog/openhands-alternatives/). [Source](https://github.com/OpenHands/OpenHands/releases/tag/v1.45.0)
4. **Orca v1.4.273 and v1.4.274.** Published 24 Nov at 10:20 and 22:52 UTC. In [v1.4.273](https://github.com/stablyai/orca/releases/tag/v1.4.273), "Bot panels show upcoming runs" and the phone app can "post to groups across computers"; v1.4.274 turns App Rail on for new users. See [Orca alternatives](/blog/orca-alternatives/). [Source](https://github.com/stablyai/orca/releases/tag/v1.4.274)

## Top 2 rising repos

1. **diagram-design.** "Editorial diagram design for Claude Code, Codex, GitHub Copilot, Cursor, Factory Droid, Qoder, and Pi", its repo says, with 52 diagram types. Fixes landed on 25 Nov. 802 stars in a day on GitHub trending on 25 Nov, 72,479 in total; MIT. [Source](https://github.com/cathrynlavery/diagram-design)
2. **Brickie.** Hatchet's repo says it lets you "run durable sandboxes in your own cloud / k8s cluster", with snapshots that are "immutable and forkable". It "is in beta"; its README was rewritten on 24 Nov. Created 28 Aug; 126 stars; MIT. [Source](https://github.com/hatchet-dev/brickie)

Stars can rise for reasons other than use: names to watch, not picks.

## Top 4 things people are talking about

1. **Do agents work for you or for their makers?** For their makers, Michael Harley argues in his essay of 1 Nov. Claude would not help his music buying skill past a new Bandcamp challenge, so he wants "a local model that runs in my homelab": models work for us "only insofar as Anthropic or OpenAI or whoever else allows them to". 973 points on [Hacker News](https://news.ycombinator.com/item?id=50627340), posted 24 Nov at 12:40 UTC. [Source](https://michaelharley.net/posts/2026/11/01/llm-agents-work-for-their-parent-companies-not-for-you/)
2. **Is the matrix multiplication exponent 9/4?** The README of OpenAI's preprint of 24 Nov says "The exponent of square matrix multiplication is 9/4 over every field", and that a Lean development proves it "for division-free circuits computing formal polynomial identities". It is a preprint. 628 points on [Hacker News](https://news.ycombinator.com/item?id=50637220), posted 25 Nov at 01:19 UTC. [Source](https://github.com/openai/math/tree/main/preprints/The-matrix-multiplication-exponent-is-nine-fourths-November-24-2026)
3. **Can sandboxed models talk to each other?** Yes, through a shared inference server, Niranjan Deshpande and David Africa write on LessWrong: signals pass through "the way vLLM chooses kernels". One model guessed the other's colour "in 1,221/1,221 rounds", though the post calls its initial setups "quite contrived". 229 points on [Hacker News](https://news.ycombinator.com/item?id=50637686), posted 25 Nov at 02:34 UTC. [Source](https://www.lesswrong.com/posts/7wzWuLP3HhyBLmKfo/models-can-communicate-via-inference-servers-despite-being)
4. **Can GPT-6 design proteins?** OpenAI says its GPT-6 models can, "using only reasoning and code". In lab tests with Onava, designs "showed evidence of binding" across five targets, with help from specialized models. This is OpenAI's own account of 24 Nov. 264 points on [Hacker News](https://news.ycombinator.com/item?id=50634658), posted 24 Nov at 21:02 UTC. [Source](https://openai.com/index/gpt-6-models-demonstrate-intrinsic-protein-design-capabilities/)

## How this list is built

We checked releases, the Hacker News front page and GitHub trending ourselves, used two scouts' notes (Google sources and X) as leads, and rechecked every item on its own page. Points and stars were checked on 25 Nov. The 24 Nov brief missed Claude Ship, which Anthropic introduced on 23 Nov: see [what Claude Ship is](/blog/what-is-claude-ship/). Claude Agent SDK v0.2.189 shipped without notes, Agent Relay made only small fixes, and Hermes Agent v0.23.4 holds its notes for v0.24.0. LiteLLM v1.111.0 and Copilot CLI v1.0.115 are left out for space.

<link rel="stylesheet" href="/blog/assets/media/agent-tools-today-2026-11-25/motion.css"><script defer src="/blog/assets/media/agent-tools-today-2026-11-25/motion.js"></script>
