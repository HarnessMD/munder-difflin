---
title: "Agent Tools Today, 22 Oct 2026: Claude API 2026-10-21, LayerFS 1.0, PHP2Shell"
seoTitle: "Agent Tools Today (22 Oct 2026): Launches, Skills, MCP Servers"
description: "The top launches, skills and MCP servers, multi agent moves, rising repos and arguments in coding agents on 22 Oct 2026, each with its source."
date: 2026-10-22
category: news
categoryLabel: News
type: Non-technical
series: agent-tools-today
primaryKeyword: "agent tools today 22 oct 2026"
secondaryKeywords: ["claude api 2026-10-21", "layerfs", "php2shell", "claude code 2.1.307", "reason network", "axuse mcp"]
tags: ["Daily Brief", "Claude Code", "MCP", "Open Source"]
---

Agent tools today, 22 Oct 2026, in one line: Anthropic shipped its first new API version since 2023, LayerFS reached 1.0 with a filesystem built for parallel agents, and BerriAI believes the LiteLLM attack ran through tokens kept in a proxy's logs. Every number was checked on 22 Oct. The last edition is [21 Oct](/blog/agent-tools-today-2026-10-21/).

[Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. It shipped no release in the last 24 hours, so it is not in the lists below.

<figure class="mg" data-scene="today"><img src="/blog/assets/media/agent-tools-today-2026-10-22/today.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a stack of thin layers labelled Shared history sits at the bottom. Three clear sheets labelled Agent 1, Agent 2 and Agent 3 slide on top, and small marks appear on each. Agent 2's sheet presses down into the stack as a new commit, and the other two sheets lift away. Tap Commit to press another sheet down."><figcaption>How LayerFS gives each agent a workspace over shared history, drawn from its README on 22 Oct 2026.</figcaption></figure>

## Top 3 launches

1. **Claude API version 2026-10-21.** Anthropic's first new API version since 2023-06-01, released on 21 Oct with new major SDKs, Python 2.0.0 and TypeScript 1.0.0 among them. Requests on it that send `temperature`, `top_p` or `top_k` return a 400 error, and the new SDKs send your key as `Authorization: Bearer`. Our [upgrade guide](/blog/claude-api-version-2026-10-21/) covers what breaks. [Source](https://platform.claude.com/docs/en/api/migration-2026-10-21)
2. **LayerFS 1.0.0.** LayerFS calls itself "the substrate under your agents": each agent mounts a complete, writable workspace over shared committed history, commits what it changed and goes away, and work can branch, rewind or merge. Released 21 Oct as source; today it runs through a plugin for DeepSeek Harness, and its README warns the store has no crash or power loss durability. MIT, more than 1,650 stars and more than 65 points on Hacker News on 22 Oct. [Source](https://github.com/Ephemeral-AI-Lab/layerfs)
3. **Alter.** A Launch HN for access control when one agent acts for many people, such as a team Slack bot that reaches a CRM with one shared key. Alter sits as a proxy, holds the downstream credentials and checks the end user and a policy on every call. More than 50 points on Hacker News on 22 Oct. [Source](https://news.ycombinator.com/item?id=50176908)

## Top 3 skills, MCP servers and plugins

1. **axuse.** One MCP server for browser and computer use in Codex, Claude Code, OpenCode, Antigravity or any MCP host, which reads the DOM and the accessibility tree over the Chrome DevTools Protocol instead of taking screenshots: "a screenshot loop is not the right interface for a machine." Created 14 Oct. More than 230 stars on 22 Oct; PolyForm Noncommercial licence, so commercial use needs a separate licence. [Source](https://github.com/ctoldigital/axuse)
2. **Scrawl.** "Show an agent a problem instead of describing it": record the screen, talk and draw, and Scrawl packs a contact sheet of keyframes, a timeline and a manifest for the agent, with a skill for Claude Code, OpenCode and Codex. Apple silicon Macs, with a Windows preview. Created 14 Oct. MIT, more than 650 stars on 22 Oct. [Source](https://github.com/kitlangton/scrawl)
3. **Gauge CLI.** An open source tool to "hillclimb your Skills, CLI, SDK, MCP, API, or Docs to make something agents want." Shown on Hacker News on 20 Oct, created the same day. MIT, 5 stars on 22 Oct, so it is early. [Source](https://github.com/gauge-sh/gauge-cli)

## Top 3 moves from multi agent tools

1. **Claude Code v2.1.307.** Published 21 Oct. Adds `/claude-api api-version` to move Claude API code to version 2026-10-21, and a `claude_code.safety_event` OpenTelemetry event for each tool call a permission rule, auto mode, a safety check, a hook or the sandbox stopped, prompted or sent back. It also fixes HTTP MCP tool calls being sent twice when a connection closed mid call. [Source](https://github.com/anthropics/claude-code/releases/tag/v2.1.307)
2. **Orca v1.4.237.** Published 21 Oct, as the project passed 100,000 stars on GitHub. It brings notes and Markdown editing to the phone client, keeps Claude's rewound context across Orca rollbacks, and brings back phone dictation through headless `orca serve` hosts. [Source](https://github.com/stablyai/orca/releases/tag/v1.4.237)
3. **GitHub Copilot CLI v1.0.102.** Published 21 Oct. Subagents now honour custom and MCP tool approvals, so they stop asking twice, prompt mode follows managed Auto model selection, and replies cut off by a provider overload retry with backoff. See [Copilot CLI vs Claude Code](/blog/github-copilot-cli-vs-claude-code-for-hive-work/). [Source](https://github.com/github/copilot-cli/releases/tag/v1.0.102)

## Top 3 rising repos

1. **Reason Network.** "Your agents, talking to your teammates' agents": a small daemon per computer lists every coding agent session on a team, with repo, branch and status, and lets any of them message another, end to end encrypted and peer to peer. It names Claude Code, Codex, Cursor, Gemini CLI and more. Sign in needs a Reason account. Created 16 Oct. Apache 2.0, more than 900 stars on 22 Oct. [Source](https://github.com/reason-machines/reason-network)
2. **fx0.** Vercel Labs' open source design agent: describe a page and it writes one HTML file. It doubles as the example app for the libfx agent library, and a turn stops after 64 model steps "which keeps an agent stuck in a loop from running up a bill." Created 19 Oct. Apache 2.0, more than 350 stars on 22 Oct. [Source](https://github.com/vercel-labs/fx0)
3. **EAGLE-4.** The official inference code for EAGLE-4, a speculative decoding drafter billed as "One Flexible Drafter for All Batch Sizes and Hardware", with a paper and a draft model for Qwen3.8 27B. Created 20 Oct. More than 700 stars on 22 Oct, under its own EAGLE-4 licence. [Source](https://github.com/eagle-hq/EAGLE-4)

New repos can gain stars quickly for reasons other than use, so treat these as names to watch, not recommendations.

## Top 3 things people are arguing about

1. **How the LiteLLM release was poisoned.** BerriAI's incident report says the attacker used GitHub CLI OAuth tokens from three engineers, which it believes were read from the logs of an internal LiteLLM deployment open to the internet. It adds that in specific situations "Claude Code will embed a user's GitHub CLI OAuth token into a response body." SafeDep's analysis of the release passed 450 points on Hacker News. [Source](https://docs.litellm.ai/blog/security-incident-oct-21-2026)
2. **Is PHP2Shell as bad as it sounds?** Wiz says frontier AI helped find remote code execution and memory disclosure flaws in core PHP, with nearly every version back to 5.4 hit by at least one; PHP shipped fixes on 21 Oct. Elias Taylor replied that there is no easy exploit and that the public proofs of concept "do not work against a vanilla PHP instance." More than 430 and 240 points on Hacker News. [Source](https://www.wiz.io/blog/php2shell-php-rce)
3. **Claude shrank what strangers can reach in OpenSSH.** Anthropic's Frontier Red Team post of 20 Oct reports 493 issues across 25 open source projects with more than five million lines, using three attack surface methods. In OpenSSH, its fix removed roughly a fifth of the code an unauthenticated client could reach in a default build, shipped in 10.6. More than 130 points on Hacker News. [Source](https://www.anthropic.com/research/attack-surface-reduction)

## How this list is built

Each day our agents read GitHub releases and new repos, vendor posts and the Hacker News front page about coding agents. A name only makes a list with a link that was opened and a signal that can be shown: points, stars or a dated release. Repos are checked against the GitHub API before they appear, and a claim that exists only as a social post is left out. New here? Start with the [install guide](/blog/how-to-install-and-use-munder-difflin/).

<link rel="stylesheet" href="/blog/assets/media/agent-tools-today-2026-10-22/motion.css"><script defer src="/blog/assets/media/agent-tools-today-2026-10-22/motion.js"></script>
