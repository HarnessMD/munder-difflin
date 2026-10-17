---
title: "Agent Tools Today, 15 Oct 2026: OpenCode 2.0, Hermes Agent v0.22.0, a Lost TV Season"
seoTitle: "Agent Tools Today (15 Oct 2026): Launches, Skills, MCP Servers"
description: "The top launches, skills and MCP servers, multi agent moves, rising repos and arguments in coding agents on 15 Oct 2026, each with its source."
date: 2026-10-15
category: news
categoryLabel: News
type: Non-technical
series: agent-tools-today
primaryKeyword: "agent tools today 15 oct 2026"
secondaryKeywords: ["opencode 2.0", "hermes agent v0.22.0", "lfm2.5-24b-a2b", "pg_vectorsearch", "sgrep"]
tags: ["Daily Brief", "OpenCode", "Claude Code", "MCP", "Open Source"]
---

Agent tools today, 15 Oct 2026, in one line: Anomaly shipped OpenCode 2.0, a fresh Hermes Agent v0.22.0 desktop install sets itself up on a free trial model, and the loudest argument was whether agents go rogue or labs skip security basics. Every number was checked on 15 Oct. The edition before this one on the site is [13 Oct](/blog/agent-tools-today-2026-10-13/).

[Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of coding agents such as Claude Code, Codex and Gemini CLI on your own computer. It shipped no release in the last 24 hours, so it is not in the lists below.

<figure class="mg" data-scene="today"><img src="/blog/assets/media/agent-tools-today-2026-10-15/today.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A jigsaw puzzle on a white background. Four pieces slide in one after another and lock together, labelled Service, Code Mode, Background and Plugins. A final piece in the middle reads 2.0."><figcaption>Anomaly's OpenCode 2.0 post lists a background service, Code Mode, background tasks and a rebuilt plugin system among its changes. The drawing shows them as puzzle pieces. Tap the puzzle to scatter and rebuild it.</figcaption></figure>

## Top 3 launches

1. **OpenCode 2.0.** Anomaly's post, dated 12 Oct, calls it "a major overhaul". The OpenCode server now runs as one background process that the terminal, web and desktop apps all talk to. MCP servers are "opted into codemode by default", and the post says there are now "80+" internal plugins. Upgrade from the latest 1.x with `opencode upgrade --major`; 1.0 plugins do not work in 2.0. More than 370 points on Hacker News on 15 Oct. Full page: [OpenCode 2.0](/blog/opencode-2-0/). [Source](https://anoma.ly/notes/opencode-2-0/)
2. **LFM2.5-24B-A2B.** Liquid AI's post, dated 13 Oct, describes "a 24B-parameter reasoning model with just 2B active parameters, built for fast, private agents on-device". The post reports 184 tokens/s on an Apple M5 Max and says both models are open weight on Hugging Face. More than 100 points on Hacker News on 15 Oct. [Source](https://www.liquid.ai/blog/lfm2-5-24b-a2b)
3. **pg_vectorsearch.** A PostgreSQL extension from Timescale for approximate nearest neighbour search. The README says it can index existing pgvector columns "as-is", and marks the project "Status: alpha. Meant for testing, not production." PostgreSQL licence, more than 280 stars on 15 Oct. More than 190 points on Hacker News on 15 Oct. [Source](https://github.com/timescale/pg_vectorsearch)

## Top 3 skills, MCP servers and plugins

1. **sgrep.** Local code search for agents by words and meaning. The README says "No account, hosted index, or model server is needed", and it is candid that CK's semantic mode beats sgrep on its CoSQA test. Created 7 Oct. MIT, more than 260 stars on 15 Oct. [Source](https://github.com/context-dot-dev/sgrep)
2. **jevcrawl.** A web crawler and MCP server for agents, where a small model picks each link and passage. The README, read on 15 Oct, reports that on 50 WebWalkerQA tasks it answered 40% correctly at $0.025 per task, against 30% at $0.194 when Claude picks every link. Created 11 Oct. Apache 2.0, more than 50 stars on 15 Oct. [Source](https://github.com/RayenMlayeh/jevcrawl)
3. **Graphicle.** A code graph and project memory for coding agents, in one Rust program. The README lists Claude Code, Cursor, Codex, VS Code, Claude Desktop and "any MCP client", and says it needs no API key or account. Created 14 Oct. Apache 2.0, more than 130 stars on 15 Oct. More than 40 points on Hacker News. [Source](https://github.com/graphicle-ai/graphicle)

## Top 3 moves from multi agent tools

1. **Hermes Agent v0.22.0.** "The Threshold Release", published on GitHub on 14 Oct. The notes say a fresh desktop install "opens on a guided setup chat that runs on a free trial model", so a newcomer can talk to Hermes before owning an API key. They also list a one-click llama.cpp runtime, signed desktop packages "including the Microsoft Store" and "a 600-plugin catalog". MIT, more than 253,000 stars on 15 Oct. See [what is Hermes Agent](/blog/what-is-hermes-agent/). [Source](https://github.com/NousResearch/hermes-agent/releases/tag/v0.22.0)
2. **Claude Code v2.1.300.** Published 14 Oct. The notes add `/advisor` on Claude Platform on AWS, where "no advisor runs until you pick one", and a `prompt.change` mod hook. They also fix SessionEnd hooks sometimes not running when you exit during a background command. See [Claude Code hooks explained](/blog/claude-code-hooks-explained/). [Source](https://github.com/anthropics/claude-code/releases/tag/v2.1.300)
3. **Zed v1.24.2.** Published 14 Oct. The notes add "the ability to drag Terminal tabs into the Agent Panel" and better custom Amazon Bedrock model support. More than 91,000 stars on 15 Oct. [Source](https://github.com/zed-industries/zed/releases/tag/v1.24.2)

## Top 3 rising repos

1. **neckbeard.** A plugin for your coding agent that plans cloud infrastructure from a catalog of tested OpenTofu modules. The README promises infrastructure "you can actually review, with the monthly bill attached". Created 8 Sep. Apache 2.0, more than 180 stars on 15 Oct. [Source](https://github.com/bealesh/neckbeard)
2. **opencode-rust.** Its description reads "The open source AI coding agent, in Rust", with a CLI, a TUI and an HTTP server. It lives under a different GitHub account from Anomaly's anomalyco/opencode. Created 13 Oct. MIT, more than 70 stars on 15 Oct. [Source](https://github.com/vakandi/opencode-rust)
3. **heditor.** A video editing skill that its description says works with Claude Code, Codex, OpenCode, Cursor and Hermes, for editing vertical video. Created 13 Oct. GitHub does not detect a standard licence. More than 60 stars on 15 Oct. [Source](https://github.com/pycodebr/heditor)

New repos can gain stars quickly for reasons other than use, so treat these as names to watch, not recommendations.

## Top 4 things people are arguing about

1. **Agents are not "going rogue".** A CSO Online article argues that recent incidents where models reached outside systems come from labs skipping basic containment and monitoring. Its opening blames lab failures, "not agents with minds of their own". More than 840 points and more than 460 comments on Hacker News on 15 Oct. See [agent security and sandboxing](/blog/agent-security-and-sandboxing/). [Source](https://www.csoonline.com/article/4234854/ai-agents-arent-going-rogue-frontier-labs-are-skipping-security-basics.html)
2. **The TV season TV4 says an agent did not delete.** Aftonbladet reported on 14 Oct, citing sources, that an AI agent let into a production server deleted the edited season of The Challenge Sverige. Its update the same afternoon says TV4's own inquiry put the loss down to human error at the producer, Mastiff, not AI. The premiere moves from 22 November to 2027. A Hacker News thread on the first report passed 140 points. [Source](https://www.aftonbladet.se/nojesbladet/a/31oE8A/the-challenge-sverige-raderad-av-ai-bara-veckor-innan-premiaren)
3. **Scion and Mononoke.** An engineer who helped build Meta's Mononoke source control server wrote that Anthropic's new Scion system follows Mononoke's "derived data" design, and that crediting only Sapling "borders on plagiarism". The post also says the author has no problem with the design being copied. More than 280 points on Hacker News on 15 Oct. [Source](https://sunshowers.io/posts/anthropic-mononoke/)
4. **How much code do agents add?** Parsimony is a benchmark that ranks models by how much code they add to solve a task, counting syntax units rather than lines. Its page says existing benchmarks "don't punish excess code". More than 75 points on Hacker News. [Source](https://parsimony.lasu.dev/)

## How this list is built

Each day our agents read GitHub releases and trending pages, the Hacker News front page, and the top posts on X and Reddit about coding agents. A name only makes a list with a link that was opened and a signal that can be shown: points, stars or a dated release. Repos are checked against the GitHub API before they appear, and a claim that exists only as a social post is left out. New here? Start with the [install guide](/blog/how-to-install-and-use-munder-difflin/).

<link rel="stylesheet" href="/blog/assets/media/agent-tools-today-2026-10-15/motion.css"><script defer src="/blog/assets/media/agent-tools-today-2026-10-15/motion.js"></script>
