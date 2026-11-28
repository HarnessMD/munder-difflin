---
title: "Agent Tools Today, 26 Nov 2026: Cogentic Papers, GRH in Lean and OpenAI's Polytope Preprint"
seoTitle: "Agent Tools Today (26 Nov 2026): Launches, Skills, MCP Servers"
description: "The top launches, skills, multi agent moves, rising repos and talking points in AI agents from 25 to 26 Nov 2026, each with its source and date."
date: 2026-11-26
category: news
categoryLabel: News
type: Non-technical
series: agent-tools-today
primaryKeyword: "agent tools today 26 nov 2026"
secondaryKeywords: ["cogentic papers", "grh lean proof", "superpolynomial graph diameter", "opencode v2.4.2", "agent-browser v0.45.0", "orca v1.4.277"]
tags: ["Daily Brief", "Google", "Anthropic", "Open Source"]
---

Agent tools today, 26 Nov 2026: Google Research posted six Cogentic papers, a shorter Lean 4 proof of GRH from Anthropic went up on GitHub, and OpenAI's polytope preprint reached the Hacker News front page. It covers 25 Nov 09:30 UTC to 26 Nov 04:00 UTC, checked 26 Nov. Previous edition: [25 Nov](/blog/agent-tools-today-2026-11-25/).

<figure class="mg" data-scene="newsstand"><img src="/blog/assets/media/agent-tools-today-2026-11-26/newsstand.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a yellow newsstand with a blue awning holds three lilac papers that read Cogentic, GRH Lean and Hirsch. A sky breeze passes along the rack, and as it reaches each paper, the paper lifts, turns mint and its word brightens. Tapping a paper stops the breeze and shows a soft white tag with the date on its own page: 25 Nov for Cogentic and GRH Lean, 24 Nov for Hirsch."><figcaption>The three lead items, from their own pages dated 24 and 25 Nov 2026, read 26 Nov 2026.</figcaption></figure>

## Top 5 launches

1. **Cogentic papers.** Google Research's folder of "research papers that were produced by Cogentic" lists six dated 25 Nov 2026, among them "Unconditional Integer Factorization in Time L_N[1/3, O(1)]". Its [arXiv paper](https://arxiv.org/abs/2609.40324) calls Cogentic "a multi-agent harness for automated proof discovery on open research problems". The factoring paper's bound is subexponential, not polynomial: see [what Cogentic is](/blog/what-is-cogentic/). 460 points on [Hacker News](https://news.ycombinator.com/item?id=50642086), posted 25 Nov at 13:33 UTC. [Source](https://github.com/google-research/google-research/tree/master/cogentic_research_papers)
2. **GRH in Lean.** A repo created 25 Nov at 20:42 UTC holds "A Lean 4 proof of the Riemann Hypothesis and of the Generalized Riemann Hypothesis for Dirichlet L-functions". Its README says "The proof is based on Levent Alpöge's, with Claude", and calls it "a shorter version, produced in collaboration with my colleagues at Anthropic, and Claude", in two editions of about 300,000 and about 76,000 lines. Its status: "The proof has passed machine checks only, listed in each folder's README. No mathematician has read it through, and no paper comes with it." Apache 2.0. 326 points on [Hacker News](https://news.ycombinator.com/item?id=50648050), posted 25 Nov at 21:48 UTC. More in [the Riemann Hypothesis proof with Claude](/blog/riemann-hypothesis-ai-proof/). [Source](https://github.com/lsernau/grh-lean)
3. **Superpolynomial graph diameter of simple polytopes.** OpenAI's preprint, its "November 24, 2026 edition", was added to openai/math on 25 Nov at 00:04 UTC, before the window. It says that for every sufficiently large facet count n there is a simple polytope with exactly n facets whose graph diameter "grows faster than every fixed power of n", and that "This disproves the polynomial Hirsch conjecture." It is a preprint. What fell in the window is its [Hacker News item](https://news.ycombinator.com/item?id=50644980), posted 25 Nov at 17:34 UTC: 134 points. [Source](https://github.com/openai/math/tree/main/preprints/Superpolynomial-graph-diameter-of-simple-polytopes-November-24-2026)
4. **OpenCode v2.4.2.** Published 26 Nov at 00:59 UTC. "Always allow" for a web fetch now "allows that site only"; it used to allow every URL. Automations "keep running after a failed run", and `generate_image` and `generate_video` moved into Code Mode, so their definitions "no longer add about 700 tokens to every request". More in [OpenCode 2.4](/blog/opencode-2-4/). [Source](https://github.com/anomalyco/opencode/releases/tag/v2.4.2)
5. **Pi v1.6.1.** Published 25 Nov at 13:41 UTC. Codemode's `models.classify()` can call GitHub Copilot's `gpt-6-luna-decisions` and Radius decision models. Cache misses, cache warming, compaction costs and reasoning drops "each have their own setting under Notices", which replaces `showCacheMissNotices`. See [what Pi is](/blog/what-is-pi-agent/). [Source](https://github.com/earendil-works/pi/releases/tag/v1.6.1)

## Top 3 skills, MCP servers and plugins

1. **CLI-Anything.** Its README says it can "Make any software agent-ready for Pi, OpenClaw, nanobot, Cursor, Claude Code, etc.", and a README entry dated 16 Mar 2026 says every CLI it generates ships with a skill definition. No commits landed in the window. 1,106 stars in a day on GitHub trending on 26 Nov, 65,781 in total; Apache 2.0. More in [what CLI-Anything is](/blog/what-is-cli-anything/). [Source](https://github.com/HKUDS/CLI-Anything)
2. **diagram-design.** It was in the 25 Nov brief, and no commits landed in the window. It is still on GitHub trending, with 1,141 stars in a day on 26 Nov. More in [what diagram-design is](/blog/what-is-diagram-design/). [Source](https://github.com/cathrynlavery/diagram-design)
3. **agent-browser v0.45.0.** Published 25 Nov at 20:44 UTC. It adds a Firefox engine "driven over WebDriver BiDi": pass `--engine firefox` with Firefox 150 or newer. Attach mode connects to a Firefox that is already open and detaches on `close` "without closing the running browser". See [OpenCode Browse vs agent-browser](/blog/opencode-browse-vs-agent-browser/). [Source](https://github.com/vercel-labs/agent-browser/releases/tag/v0.45.0)

## Top 2 moves from multi agent tools

1. **Orca v1.4.277.** Published 26 Nov at 00:27 UTC. You can "Pick which Google accounts each agent uses", and in Slack you can ask a bot "to leave a thread and @mention it to bring it back". Antigravity terminals get "Approve for me", and a bot's automations can be deleted from its Activity panel. See [Orca alternatives](/blog/orca-alternatives/). [Source](https://github.com/stablyai/orca/releases/tag/v1.4.277)
2. **OpenClaw 2026.10.34.** Published 26 Nov at 01:37 UTC. Its notes call it "a gateway-only `extended-stable` release": OpenClaw "from the end of October 2026, plus critical security updates", while the latest version is still 2026.11.10. OpenAI and ClawRouter users can select GPT-6.2 Astra and Sol, and it delivers ready child results "without waiting for other helpers to finish". See [OpenClaw alternatives](/blog/openclaw-alternatives/). [Source](https://github.com/openclaw/openclaw/releases/tag/v2026.10.34)

## Top rising repo

1. **App Store Compliance Playbook.** "Catch App Store and Google Play rejection causes before the reviewer does", its repo says. It installs a hook and a skill into Claude Code, Codex CLI, Gemini CLI, Cursor and more (a plugin and a skill for OpenCode), and "It does not guarantee approval." v2.5.2, published 25 Nov at 16:22 UTC, lists "114 tracked deadlines now, across 33 jurisdictions and platform scopes". 858 stars in a day on GitHub trending on 26 Nov, 6,563 in total; OpenRoots Agent License 2.3. [Source](https://github.com/mjmirza/app-store-compliance)

Stars can rise for reasons other than use: names to watch, not picks.

## Top 3 things people are talking about

1. **How big is the AI math news?** Bigger than his earlier posts and talks conveyed, Scott Aaronson writes in his post of 25 Nov. He points to OpenAI's claim that the matrix multiplication exponent is exactly 9/4 and to what he calls OpenAI's and Anthropic's proofs of VP ≠ VNP, and expects "a whole new continent of mathematical truth". 1,028 points on [Hacker News](https://news.ycombinator.com/item?id=50646108), posted 25 Nov at 19:11 UTC. [Source](https://scottaaronson.blog/?p=10379)
2. **Is multiagent coding the future?** Patrick McKenzie argues so in his essay dated 24 Nov, calling multiagent coding "as much of a paradigm shift as LLMs coding". He describes Grimm, the internal orchestrator for coding tools at Situational Awareness, the hedge fund he consults for on software, which puts 2 to 100 or more Claudes in a devbox. He discloses that the fund holds a large stake in Anthropic. 55 points on [Hacker News](https://news.ycombinator.com/item?id=50645541), posted 25 Nov at 18:20 UTC. [Source](https://www.kalzumeus.com/2026/11/25/multiagent-coding-is-the-future/)
3. **Is Jev built on Qwen3.5-35B-A3B?** Modaic's post argues so. It says TypeSafe does not disclose the backbone of Jev, its System One model for calibrated judgments, and that self identification, tokenizer and throughput tests "all point to Qwen3.5-35B-A3B". Modaic's own Mo Lite, still in training, is derived from that model, the post says. 255 points on [Hacker News](https://news.ycombinator.com/item?id=50648823), posted 25 Nov at 22:57 UTC. [Source](https://modaic.dev/blog/latency-doesnt-lie)

## How this list is built

We checked GitHub releases, the Hacker News front page and GitHub trending ourselves, and rechecked every item on its own page. Points and stars were checked on 26 Nov. goose v1.61.1 made only fixes. Mastra core 1.86.0, Copilot CLI v1.0.116, OpenHands v1.46.0, Zed v1.30.2, OpenWork v0.18.73 and Paradev desktop v2.0.12 are left out for space. The Clojure and Lean post does not involve AI. The GPT-6.2 Astra code golf item went up on 22 Nov and the Agentic Algorithm Engineering Show HN item on 23 Nov, both before the window. For daily Claude Code use, see [Claude Code Max plan tips](/blog/claude-code-max-plan-tips/).

<link rel="stylesheet" href="/blog/assets/media/agent-tools-today-2026-11-26/motion.css"><script defer src="/blog/assets/media/agent-tools-today-2026-11-26/motion.js"></script>
