---
title: "Agent Tools Today, 4 Nov 2026: Postman Plugins, Astra Critique, Claude Code 2.1.318"
seoTitle: "Agent Tools Today (4 Nov 2026): Launches, Skills, MCP Servers"
description: "The top launches, skills, multi agent moves, rising repos and arguments in AI agents from 3 to 4 Nov 2026, each with its source and date."
date: 2026-11-04
category: news
categoryLabel: News
type: Non-technical
series: agent-tools-today
primaryKeyword: "agent tools today 4 nov 2026"
secondaryKeywords: ["postman codex claude code plugins", "weight space programming critique", "claude code 2.1.318", "nvidia auto-ontology", "claude code game studios", "orca 1.4.248"]
tags: ["Daily Brief", "Claude Code", "Skills", "Research"]
---

Agent tools today, 4 Nov 2026, in one line: a GitHub issue says Postman's desktop app installed plugins into Codex and Claude Code, Matthew Honnibal called the Astra weights post misleading, and Claude Code 2.1.318 shipped. It covers 3 Nov 04:00 UTC to 4 Nov 04:00 UTC, checked 4 Nov. The previous edition is [3 Nov](/blog/agent-tools-today-2026-11-03/).

<figure class="mg" data-scene="toaster"><img src="/blog/assets/media/agent-tools-today-2026-11-04/toaster.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a toaster with three slots pops up three slices of toast one after another. The first slice reads Postman with a tag 1,084 points. The second reads Astra critique with a tag 922 points. The third reads Claude Code with a tag 2.1.318. Tapping a slice pushes it down and pops it up again."><figcaption>The day's three lead items, from the Postman GitHub issue, Matthew Honnibal's post and the Claude Code release notes, read 4 Nov 2026.</figcaption></figure>

## Top 2 launches

1. **Auto-Ontology.** NVIDIA calls it "An open context layer that helps agents give fewer wrong answers on enterprise data." It compiles database metadata into "business terms mapped to columns, reviewed SQL for measures, and the relationships between tables" and serves it "through MCP, agent skills, and a REST API". Apache 2.0, created 27 Apr 2026, 3,130 stars and 263 points on Hacker News on 4 Nov. [Source](https://github.com/NVIDIA/auto-ontology)
2. **Octomind.** "Open-source coding agent harness. One Rust binary, any model, every surface." Its README says "Policy lives in TOML guardrails, not approval prompts", and that "On 25 tasks taken from merged pull requests it solved 24; OpenCode solved 19 with the same model at about twice the cost"; these are the vendor's own figures. Apache 2.0, 409 stars and 52 points on Hacker News on 4 Nov. [Source](https://github.com/Muvon/octomind)

## Top 3 skills, MCP servers and plugins

1. **Claude Code Game Studios.** "Turn a single Claude Code session into a full game development studio." The README counts "49 agents. 74 skills."; the GitHub description says 72 workflow skills. MIT, 34,777 stars, and 1,182 stars in a day on GitHub trending on 4 Nov. [Source](https://github.com/Donchitos/Claude-Code-Game-Studios)
2. **Spotify Portal AI Plugins.** "Bring Spotify Portal into Claude Code, Codex, Cursor, and pi." A second plugin, shunt, is "Claude Code only for now" and sends bulk file reads and boilerplate work to "cheaper worker models". It installs with `claude plugin marketplace add spotify/portal-ai-plugins`. Apache 2.0, 3,075 stars, 91 in a day on GitHub trending on 4 Nov. See [Claude Code skills](/blog/claude-code-skills/). [Source](https://github.com/spotify/portal-ai-plugins)
3. **Skills For Real Engineers.** Matt Pocock's skills, also on yesterday's list, took 1,164 stars in a day on GitHub trending on 4 Nov, for 311,622 in total. [Source](https://github.com/mattpocock/skills)

## Top 3 moves from multi agent tools

1. **Claude Code 2.1.318.** Published 4 Nov at 00:01 UTC. `claude auth status` now shows when a stored claude.ai sign in ends (`loginExpiresAt`), and `claude -p` text output warns on stderr "starting 10 days before" it does. It fixes `--continue` "sometimes losing the earlier conversation after a malformed tool call's retries ran out", a regression in 2.1.314, and "workflows re-running finished agents when resumed after a usage limit". See [Claude Code Max plan tips](/blog/claude-code-max-plan-tips/). [Source](https://github.com/anthropics/claude-code/releases/tag/v2.1.318)
2. **Orca 1.4.248.** Published 4 Nov at 02:36 UTC. You can now hold updates for "None, 1, 3, 7, 14 or 30 days", and "The Orchestration panel is available again as an experimental opt-in." Under known issues: "Live-history compaction is paused, so chat storage can grow as conversations continue." [Source](https://github.com/stablyai/orca/releases/tag/v1.4.248)
3. **T3 Code nightly 0.1.7 (4 Nov).** A nightly, published 4 Nov at 00:58 UTC. "Windows administrators can configure T3 Code using a Group Policy template", and "Queued provider or model switches no longer end running background agents and commands." [Source](https://github.com/pingdotgg/t3code/releases/tag/v0.1.7-nightly.20261104.4151)

## Top 4 rising repos

1. **agent-desktop.** Vercel Labs' tool lets an agent "see and operate desktop apps on macOS, Windows, and Linux through the OS accessibility tree", and it "has no model inside". 13,098 stars, 3,791 in a day on GitHub trending on 4 Nov. [Source](https://github.com/vercel-labs/agent-desktop)
2. **Worktrunk.** "A CLI for git worktree management, designed for running AI agents in parallel." 10,577 stars, 438 in a day on GitHub trending on 4 Nov. [Source](https://github.com/max-sixty/worktrunk)
3. **claude-mem.** It "Captures everything your agent does during sessions, compresses it with AI, and injects relevant context back into future sessions". 112,061 stars, 1,139 in a day on GitHub trending on 4 Nov. See [long term memory for Claude Code](/blog/give-claude-code-long-term-memory/). [Source](https://github.com/thedotmack/claude-mem)
4. **Hex.** From anomalyco, the GitHub organisation that also hosts OpenCode: "Hold a key, speak, and it pastes." The README says "We don't take pull requests": you open an issue, and "our agents usually turn it around fast". One way to keep a review queue short. MIT, 4,674 stars, 410 in a day on GitHub trending on 4 Nov. [Source](https://github.com/anomalyco/hex)

Stars can rise for reasons other than use: names to watch, not picks.

## Top 4 things people are arguing about

1. **Did Postman install agent plugins without asking?** A GitHub issue opened 25 Oct says yes. The reporter says Postman desktop 12.33.4 added a Codex plugin, a Claude Code plugin, a session start hook, a remote MCP server and the Postman CLI, and quotes Postman's own log: `"source":"auto-existing-upgrade","results":["claude-code:installed","codex:installed"]`. The reporter also says the installer "attempts to approve its own hook". These are the reporter's claims. On 3 Nov an account writing as Postman, which GitHub does not mark as staff, replied: "We’re going to make the opt-in clearer, especially for existing users". 1,084 points and 359 comments on Hacker News on 4 Nov. See [Claude Code hooks explained](/blog/claude-code-hooks-explained/). [Source](https://github.com/postmanlabs/postman-app-support/issues/14370)
2. **Is the Astra weights post misleading?** Matthew Honnibal, the author of spaCy, says it is. His 3 Nov post argues the abstract mixes techniques: "Every experiment involving a real language model uses Python, and the Qwen result, which is the headline one, also gets to run the model on up to 50 batches of practice problems." He also grants that "AI models of a year or two ago would have failed at all these tasks." The MIT CSAIL post led our 3 Nov edition; we make no call. 922 points and 192 comments on Hacker News on 4 Nov. [Source](https://honnibal.dev/blog/astra-read-write-misleading)
3. **Can a laptop model read weights too?** Simon Willison wrote on 3 Nov that Qwen 3.8 27B, "just 17GB" on his laptop, named the Pac-Man network from the paper's weights after 46m 12s and 43,506 reasoning tokens. It also named Pong and Breakout, and missed Freeway. 514 points on Hacker News on 4 Nov. [Source](https://simonwillison.net/2026/Nov/3/qwen-can-interpret-model-weights/)
4. **Is OpenAI turning Codex training back on?** A Hacker News user wrote on 3 Nov that for their team "the setting had been silently reenabled in Codex. None of us knowingly opted back in." The setting they name is "Improve the model for everyone". These are user claims, not a confirmed change. 443 points and 139 comments on 4 Nov. [Source](https://news.ycombinator.com/item?id=50352757)

## How this list is built

For this edition we read the GitHub releases of tracked tools, GitHub trending and the Hacker News front page, and opened every page linked above. No item here comes from X or Reddit. A name only makes a list with an opened link and a signal: points, stars or a dated release. Nightlies appear only when the notes carry a change a user would notice. Codex 0.168.0 alpha 1 shipped in the window with empty notes, so it is left out.

<link rel="stylesheet" href="/blog/assets/media/agent-tools-today-2026-11-04/motion.css"><script defer src="/blog/assets/media/agent-tools-today-2026-11-04/motion.js"></script>
