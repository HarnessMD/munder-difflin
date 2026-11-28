---
title: "Agent Tools Today, 7 Nov 2026: Claude Code MCP Tasks, OpenCode Shared MCP, Cloudflare Audit Skill"
seoTitle: "Agent Tools Today (7 Nov 2026): Launches, Skills, MCP Servers"
description: "The top launches, skills, multi agent moves, rising repos and talking points in AI agents from 6 to 7 Nov 2026, each with its source and date."
date: 2026-11-07
category: news
categoryLabel: News
type: Non-technical
series: agent-tools-today
primaryKeyword: "agent tools today 7 nov 2026"
secondaryKeywords: ["claude code 2.1.319", "opencode 2.2.6 mcp pool", "cloudflare security audit skill", "libghostty 1.0", "devvm", "firecracker vm escape"]
tags: ["Daily Brief", "Claude Code", "Skills", "MCP"]
---

Agent tools today, 7 Nov 2026, in one line: Claude Code 2.1.319 moves MCP tasks to the background, OpenCode 2.2.6 shares one MCP connection across projects, and Cloudflare's security audit skill gained 2,548 stars in a day. It covers 6 Nov 04:00 UTC to 7 Nov 04:00 UTC, checked 7 Nov. The previous edition is [6 Nov](/blog/agent-tools-today-2026-11-06/).

<figure class="mg" data-scene="dice"><img src="/blog/assets/media/agent-tools-today-2026-11-07/dice.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, three large dice in blue, lilac and mint roll onto a plain table one after another and settle. The top faces read Claude Code, OpenCode and Cloudflare skill. Each die gives a small bounce as it lands. Tapping a die rolls it over to show the date 6 Nov on another face."><figcaption>The day's three lead items, from the Claude Code 2.1.319 and OpenCode 2.2.6 release notes and Cloudflare's security audit skill on GitHub, read 7 Nov 2026.</figcaption></figure>

## Top 3 launches

1. **Claude Code 2.1.319.** Published 6 Nov at 17:04 UTC. When an MCP server runs a tool call as a task, "Claude Code moves it to the background right away and tells Claude the result when it finishes". A new `permissions.denyInsteadOfPrompting` setting means "a tool call that would wait on a permission prompt is denied and the turn continues". The notes also list "Fixed a sandbox escape when creating a worktree" and a Bash bypass "where a crafted environment prefix could hide part of a command from permission checks". They do not mention the `User-Agent` email report from our last edition; that issue was still open with 98 comments when we read it on 7 Nov. [Source](https://github.com/anthropics/claude-code/releases/tag/v2.1.319)
2. **OpenCode 2.2.6.** Published 6 Nov at 23:37 UTC. "Turn on pooling for an MCP server to share one connection across projects with the same setup, so you run fewer processes and start faster." The setting is `pool: true`. One catch from the notes: `opencode run` now waits for background jobs, and "a job that never exits, such as a dev server or file watcher, keeps the run open", so set a timeout on CI jobs. [Source](https://github.com/anomalyco/opencode/releases/tag/v2.2.6)
3. **Libghostty 1.0.** Mitchell Hashimoto's 6 Nov post: "libghostty-vt 1.0 is here", and "both the library itself and the C ABI are now stable." He writes that "agentic" coding tools "such as herdr and cmux" are built on it (see [herdr alternatives](/blog/herdr-alternatives/)) rather than on a new emulator. 340 points on Hacker News on 7 Nov. [Source](https://mitchellh.com/writing/libghostty-1-0)

## Top 2 skills, MCP servers and plugins

1. **Cloudflare security audit skill.** "A coding-agent skill for multi-phase security audits with independently verified, machine-readable findings." It runs six phases and gives "every unique candidate to a fresh verifier that tries to disprove it." The README calls it "the skill that seeded Cloudflare's vulnerability discovery harness". MIT, 64,274 stars, 2,548 in a day on GitHub trending on 7 Nov. See [Claude Code skills](/blog/claude-code-skills/). [Source](https://github.com/cloudflare/security-audit-skill)
2. **Matt Pocock's skills.** "These skills are designed to be small, easy to adapt, and composable. They work with any model." Claude Code installs them with `claude plugin install mattpocock-skills@claude-plugins-official`. MIT, 316,848 stars, 2,070 in a day on 7 Nov. [Source](https://github.com/mattpocock/skills)

## Top 5 moves from multi agent tools

1. **Orca 1.4.251.** Published 6 Nov at 06:31 UTC. "Workers can start their own workers", finished workers "keep messaging their coordinator", and "stopping a worker stops its helpers." The upgrade note: "Nested worker depth: The default is now 4." [Source](https://github.com/stablyai/orca/releases/tag/v1.4.251)
2. **LobeHub 2.3.2.** Published 6 Nov at 15:52 UTC. It adds "GitHub Copilot CLI as a heterogeneous Agent", and "Interactive views from MCP Apps render inside the conversation." See [what an MCP server is](/blog/what-is-an-mcp-server/). [Source](https://github.com/lobehub/lobehub/releases/tag/v2.3.2)
3. **Orchestrator.inc 0.14.10.** Published 6 Nov at 11:55 UTC. The notes list "Cloud on for everyone", "Add Hermes Agent harness with native ACP chat" and "Mark bypass permissions as a risk and show the permission caret". [Source](https://github.com/OrchestratorInc/agent-orchestrator/releases/tag/v0.14.10)
4. **Qwen Code 0.26.9.** Published 6 Nov at 16:07 UTC. It "Adds daemon API routes for installing large Skill ZIPs by upload or host file path" and enables image input for Llama 4, LLaVA, Pixtral and other models. The notes list "No known breaking changes." [Source](https://github.com/QwenLM/qwen-code/releases/tag/v0.26.9)
5. **Cursor Live Apps.** Cursor's changelog entry is dated 5 Nov, which our last edition missed. "Now, you can build live apps directly in Cursor and share them with a link." Cursor sets up the database, auth and hosting, and "Nothing goes live until the checks pass and you explicitly publish the app." It is "available on all paid plans with cloud agents enabled". [Source](https://cursor.com/changelog/build-live-apps)

Outside the window, Perplexity's 4 Nov post launched teammates, "personal agents that can take on that long-running work". [Source](https://www.perplexity.ai/en-GB/hub/blog/teammates-are-agents-for-complex-ongoing-work)

## Top 2 rising repos

1. **Auto Ontology.** NVIDIA's library builds a context layer from enterprise metadata and serves it "to any agent harness through MCP, CLI, and API." The project "is currently not accepting external contributions." Apache 2.0, 9,207 stars, 2,015 in a day on 7 Nov. [Source](https://github.com/NVIDIA/auto-ontology)
2. **devvm.** "One VM for every project. An isolated sandbox with your project’s toolchain, ready for you or a coding agent to start coding". Its site says `~/.ssh`, `~/.aws` and `~/Documents` "stay out of the VM", and network traffic goes through an allowlist proxy. Created 6 Nov, MIT, 198 stars on 7 Nov; 131 points on Hacker News. [Source](https://github.com/devvmhq/devvm)

Stars can rise for reasons other than use: names to watch, not picks.

## Top 3 things people are talking about

1. **Can a microVM keep untrusted code in?** A new write up says not always. PWN Research's post says "Firecracker is supposed to keep untrusted code inside a microVM. We escaped it and achieved code execution as root on the host." These are the researchers' claims. 192 points and 89 comments on Hacker News on 7 Nov. See [agent security and sandboxing](/blog/agent-security-and-sandboxing/). [Source](https://pwn.ai/blog/firecracker-escape)
2. **Is AI already speeding up AI research?** Ajeya Cotra thinks so. Her 6 Nov post reads a public METR report as finding that "capabilities progress at Anthropic has been going about twice as fast as it had been over the previous twelve months." That is her reading, and her opinions are her own. 229 points and 174 comments on Hacker News on 7 Nov. [Source](https://www.planned-obsolescence.org/p/ai-is-dramatically-accelerating-ai)
3. **Can a cheap model ask a frontier model for help?** Hightouch says yes, for grading identity resolution. In its 4 Nov post, a hybrid of the Jev decision model and Claude Opus 5.5 scored 95.3% on the harder test at $2.94 per 1,000 identities, against 95.1% and $5.39 for Opus alone (the vendor's own figures, prices as of 4 Nov). So the cheap model does the easy cases and phones a friend for the rest. 376 points on Hacker News on 7 Nov. [Source](https://hightouch.com/blog/llm-judges-identity-resolution)

## How this list is built

We read tracked tools' GitHub releases, GitHub trending, the Hacker News front page and leads from Google and X, and opened every page linked above. A name only makes a list with an opened link and a signal: points, stars or a dated release. Codex shipped only an alpha with empty notes. Gemini CLI, Goose and Pi shipped no release in the window, and the Crush, Qwen Code and T3 Code nightlies are left out. Gemini Omni 1.2 Flash drew 305 points, but Google's 5 Nov post describes a video generation and editing model, not an agent tool.

<link rel="stylesheet" href="/blog/assets/media/agent-tools-today-2026-11-07/motion.css"><script defer src="/blog/assets/media/agent-tools-today-2026-11-07/motion.js"></script>
