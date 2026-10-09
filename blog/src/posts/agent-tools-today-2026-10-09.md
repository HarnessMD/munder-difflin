---
title: "Agent Tools Today, 9 Oct 2026: Gemini Agent, Codex CLI 0.162.0, Step 5 Preview"
seoTitle: "Agent Tools Today (9 Oct 2026): Launches, Skills, MCP Servers"
description: "The top launches, skills and plugins, multi agent moves, rising repos and arguments in coding agents on 9 Oct 2026, each with its source."
date: 2026-10-09
category: news
categoryLabel: News
type: Non-technical
series: agent-tools-today
primaryKeyword: "agent tools today 9 oct 2026"
secondaryKeywords: ["gemini agent", "codex cli 0.162.0", "claude code 2.1.295", "step 5 preview", "whistle speech to text"]
tags: ["Daily Brief", "Claude Code", "Codex", "Skills", "Open Source"]
---

Agent tools today, 9 Oct 2026, in one line: Google announced one Gemini agent for all of work, Codex and Claude Code both shipped releases, and OpenAI withdrew three maths papers. Every number was checked on 9 Oct, one day after [the 8 Oct edition](/blog/agent-tools-today-2026-10-08/).

[Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of coding agents such as Claude Code, Codex and Gemini CLI on your own computer. It shipped no release in the last 24 hours, so it is not in the lists below.

<figure class="mg" data-scene="today"><img src="/blog/assets/media/agent-tools-today-2026-10-09/today.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A closed blue pocket knife lies on a white background. Four tools unfold from it one after another: a magnifying glass, a pen, a paintbrush and a screwdriver. A label appears beside each tool in turn: answers questions, knowledge work, images and media, writes and runs code."><figcaption>Google's post of 9 Oct 2026 gives the Gemini agent four jobs. The drawing shows one tool per job. Tap a tool for its one line.</figcaption></figure>

## Top 5 launches

1. **Gemini agent.** Google Cloud's post, dated 9 Oct, calls it a "single, universal agent for work" with four jobs: it answers questions, handles knowledge work, creates images and media, and writes and runs code. The Verge reports that it is in private preview, for enterprise customers only. Google's consumer agent is covered in [what is Gemini Spark](/blog/what-is-gemini-spark/). 14 points on Hacker News on 9 Oct. [Source](https://cloud.google.com/blog/products/ai-machine-learning/welcome-to-gemini-at-work-2026)
2. **Codex CLI 0.162.0.** Released 8 Oct. New tools create and list managed Git worktrees from trusted local projects when the worktrees feature is on. You can pin tasks in the agent Command Center with `p`, and `apply_patch` keeps existing CRLF line endings. Background: [what is Codex](/blog/what-is-codex/). [Source](https://github.com/openai/codex/releases/tag/rust-v0.162.0)
3. **Claude Code v2.1.295.** Released 8 Oct, the same day as v2.1.294. A hook can set `onFailure: "block"`, so a hook that cannot start or times out blocks the action. It also adds OSC 7501 support, so terminals can show whether Claude Code is working, waiting on you, or done. More in [hooks explained](/blog/claude-code-hooks-explained/). [Source](https://github.com/anthropics/claude-code/releases/tag/v2.1.295)
4. **Step 5 Preview.** OpenRouter lists StepFun's model as released on 8 Oct with a 1.0M context window. The listing calls it StepFun's flagship for agentic work. 114 points on Hacker News on 9 Oct. [Source](https://openrouter.ai/stepfun/step-5-preview)
5. **Whistle.** A speech to text model in one 16.9 MB file, from Cactus. The post, dated 2 Oct, says it runs on the CPU with no dependencies and transcribes seven languages. Not an agent tool. 601 points on Hacker News on 9 Oct. [Source](https://cactuscompute.com/blog/whistle)

## Top 4 skills, MCP servers and plugins

1. **diagram-design.** A skill for Claude Code, Codex, GitHub Copilot, Factory Droid and Pi that draws 42 diagram types as self-contained HTML and SVG. It was on GitHub's trending page on 9 Oct. MIT, 46,603 stars on 9 Oct. [Source](https://github.com/cathrynlavery/diagram-design)
2. **claude-mem.** It captures what your agent does in a session, compresses it, and puts the relevant context back into later sessions. Also on GitHub's trending page on 9 Oct. Apache 2.0, 98,597 stars on 9 Oct. [Source](https://github.com/thedotmack/claude-mem)
3. **The Founder Skill.** Eleven Claude skills that test a business idea before launch, including a consumer panel of 100 buyer agents. Created 7 Oct. MIT, 151 stars on 9 Oct. [Source](https://github.com/Jakeschincariol/founder-skill)
4. **terse.** A Claude Code plugin that shortens replies. On 9 Oct 2026 its README reported 54% fewer words on Opus 5.5 across 20 prompts, the maintainer's own figures. MIT, 37 stars on 9 Oct. [Source](https://github.com/lowenbjer/claude-terse)

## Top 4 moves from multi agent tools

1. **Cline.** cli-v3.0.70 on 8 Oct. `cline mcp add` now keeps your `--header` values when it opens the setup wizard, and `cline dashboard` becomes `cline hub dashboard`. Tasks with reasoning off no longer fail with a 400 error on four models, including GPT-6 Astra and Claude Opus 5.5. See [Cline vs Munder Difflin](/blog/cline-vs-munder-difflin/). [Source](https://github.com/cline/cline/releases/tag/cli-v3.0.70)
2. **Herdr GPUI.** v20261008.1 on 8 Oct. You can review changes of any size with a folding file tree, workspaces indent under their host, and adding a device suggests nearby SSH hosts. Apache 2.0, 1,025 stars on 9 Oct. See [Herdr alternatives](/blog/herdr-alternatives/). [Source](https://github.com/penso/herdr-gpui/releases/tag/v20261008.1)
3. **Pullboard.** v0.8.0 on 8 Oct adds a Roadmap tab: milestones in order, each with live status. Any agent can add a fact to an item. Only the item's holder or the coordinator can add a judgement. MIT, 68 stars on 9 Oct. [Source](https://github.com/pullboard-dev/pullboard/releases/tag/v0.8.0)
4. **Pinrail.** v0.1.2 on 7 Oct, a small fix release. Pinrail is a desktop app where coding agents ask you before they act. It runs on macOS and Linux. Apache 2.0, 32 stars on 9 Oct. [Source](https://github.com/forgeplane/pinrail/releases/tag/v0.1.2)

## Top 4 rising repos

1. **ts-rust.** An experimental Rust port of the TypeScript 7 compiler, written by models. On 9 Oct 2026 its README said the port cost over $420,000 in tokens, and called this an early release. Created 7 Oct. MIT, 713 stars on 9 Oct. [Source](https://github.com/pingdotgg/ts-rust)
2. **ARTEX.** An AI penetration testing system. The repo description says it won Baidu's "agent+" attack and defence challenge. Created 8 Oct. AGPL 3.0, 977 stars on 9 Oct. [Source](https://github.com/mhtsec/ARTEX)
3. **rea.** Reverse engineering with agents, "from app behavior down to native binaries". On GitHub's trending page on 9 Oct. MIT, 28,767 stars on 9 Oct. [Source](https://github.com/morluto/rea)
4. **AgentGarten.** Real-time interactive environments for agents to practise in, drawn by a shared neural renderer. Created 8 Oct. Apache 2.0, 60 stars on 9 Oct. [Source](https://github.com/MirroS-Lab/AgentGarten)

New repos can gain stars quickly for reasons other than use, so treat these as names to watch, not recommendations.

## Top 4 things people are arguing about

1. **Three withdrawn papers.** The openai/math [history file](https://github.com/openai/math/blob/main/history.md), dated 7 Oct, says a sign error in one manuscript broke it and two papers that depended on it. OpenAI withdrew all three and revised 14 others. 253 points and 550 comments on Hacker News on 9 Oct. [Source](https://news.ycombinator.com/item?id=50002650)
2. **What should maths reward now?** Terence Tao's 6 Oct post says "Math 2.0" will need to "value mathematical progress more holistically", for instance by elevating the role of exposition. 593 points and 631 comments on Hacker News on 9 Oct. [Source](https://mathstodon.xyz/@tao/117395269325940185)
3. **One prompt, six hours.** A Quesma post dated 7 Oct gave Claude Opus 5.5 one prompt and six hours to visualize Invisible Cities. The post says it stopped after 1 hour 25 minutes, using 6 subagents in parallel. Given six hours, it left early. 376 points and 187 comments on Hacker News on 9 Oct. [Source](https://quesma.com/blog/invisible-cities-one-shot/)
4. **OpenAI's revenue.** CNBC reported on 8 Oct that OpenAI told investors it hit roughly $50 billion in annualized revenue at the end of September, below the $68 billion figure reported earlier. 362 points and 246 comments on Hacker News on 9 Oct. [Source](https://www.cnbc.com/2026/10/08/open-ai-revenue-nvidia-oracle-coreweave.html)

## How this list is built

Each day our agents read GitHub releases and trending pages, the Hacker News front page, and the top posts on X and Reddit about coding agents. A name only makes a list with a link that was opened and a signal that can be shown: points, stars or a dated release. Repos are checked against the GitHub API before they appear, and a claim that exists only as a social post is left out. New here? Start with the [install guide](/blog/how-to-install-and-use-munder-difflin/).

<link rel="stylesheet" href="/blog/assets/media/agent-tools-today-2026-10-09/motion.css"><script defer src="/blog/assets/media/agent-tools-today-2026-10-09/motion.js"></script>
