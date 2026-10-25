---
title: "Agent Tools Today, 23 Oct 2026: Claude Duet, OpenAI CLI, Nvidia OpenShell"
seoTitle: "Agent Tools Today (23 Oct 2026): Launches, Skills, MCP Servers"
description: "The top launches, skills and MCP servers, multi agent moves, rising repos and arguments in coding agents on 23 Oct 2026, each with its source."
date: 2026-10-23
category: news
categoryLabel: News
type: Non-technical
series: agent-tools-today
primaryKeyword: "agent tools today 23 oct 2026"
secondaryKeywords: ["claude duet", "openai cli", "nvidia openshell", "omnara", "copilot cli 1.0.103", "openclaw 2026.10.6"]
tags: ["Daily Brief", "Claude Code", "MCP", "Open Source"]
---

Agent tools today, 23 Oct 2026, in one line: Anthropic opened a waitlist for Claude Duet, a proactive agent app, OpenAI shipped an official CLI for its API, and Nvidia's OpenShell sandbox reached the Hacker News front page. Every number was checked on 23 Oct. The last edition is [22 Oct](/blog/agent-tools-today-2026-10-22/).

[Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. It is not ranked in the lists below.

<figure class="mg" data-scene="today"><img src="/blog/assets/media/agent-tools-today-2026-10-23/today.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a small square labelled Agent sits inside a box labelled Sandbox. The square sends three requests outward: one to a file, one to a package site and one to a new host. A gate labelled Policy lets the first two through with a green tick and adds a key only to the approved one. The third request stops at the gate with a label that reads Waiting for review. Tap Approve to let it through."><figcaption>How OpenShell checks each agent request against a policy, drawn from its README on 23 Oct 2026.</figcaption></figure>

## Top 3 launches

1. **Claude Duet.** Anthropic opened a research preview of "a new app where Claude works as a proactive agent": it sends a morning brief across your connected apps, takes on tasks, keeps working when you step away and checks with you before it acts for you. Built on Claude Opus 5.5, by waitlist, starting with US Pro and Max plans. Announced 21 Oct, more than 540 points and 500 comments on Hacker News. Our [waitlist guide](/blog/claude-duet-waitlist/) covers who gets in first. [Source](https://claude.com/resources/articles/claude-duet), and [Anthropic's post on X](https://x.com/claudeai/status/2112984664256241837)
2. **OpenAI CLI.** The official command line tool for the OpenAI REST API: generate images, upload files and run batches from a shell script. Its README says to use Codex CLI instead when you want a coding agent to work on a project. More than 230 points on Hacker News on 22 Oct, v1.40.5 on 23 Oct, Apache 2.0, more than 1,050 stars. [Source](https://github.com/openai/openai-cli)
3. **Omnara.** A Show HN for an open source managed agent platform and a self hosted alternative to Claude Managed Agents and OpenAI's Agents API, with tools, secrets and permissions built in. 110 points on Hacker News on 21 Oct, a release on 23 Oct, Apache 2.0, more than 3,150 stars. [Source](https://github.com/omnara-ai/omnara)

## Top 3 skills, MCP servers and plugins

1. **Co-op Anything.** An MCP server and playbook: point your coding agent at a single player PC game and it reverse engineers the game, builds the multiplayer, tests it with bots inside the game and packages it for friends to join over Steam. Created 16 Oct. MIT, more than 840 stars on 23 Oct. [Source](https://github.com/cranebeaker/coop-anything)
2. **NS game Apple ARM port.** An instruction skill, written in Chinese, for porting Nintendo Switch games to Apple silicon on macOS, iPadOS and iOS with a Rust compatibility layer and Metal. It asks for real run evidence before a port counts as done. Created 18 Oct. MIT, more than 470 stars on 23 Oct. [Source](https://github.com/realskyrin/ns-game-apple-arm-port)
3. **Archestra 1.4.** A gateway for LLM calls and MCP servers that gives Claude Code, Codex and Cursor one token, with cost limits and guardrails. Version 1.4 swaps in OpenAPPA guardrails and adds a remote agent runtime that takes work off your laptop and hands it back; v1.4.2 followed on 23 Oct. AGPL 3.0 or an enterprise licence, more than 4,350 stars. [Source](https://github.com/archestra-ai/archestra/releases/tag/platform-v1.4.0)

## Top 3 moves from multi agent tools

1. **GitHub Copilot CLI 1.0.103.** Published 22 Oct. ACP sessions now honour saved sandbox settings and the `--sandbox` flags, including on resume, cloud replies keep their full text after a dropped connection, and cached MCP tool lists are shared across Git worktrees of one repository. See [Copilot CLI vs Claude Code](/blog/github-copilot-cli-vs-claude-code-for-hive-work/). [Source](https://github.com/github/copilot-cli/releases/tag/v1.0.103)
2. **OpenClaw 2026.10.6.** Published 22 Oct, a patch with "focused reliability fixes only" across 293 pull requests. It now requires a patched Node runtime, 24.22.1 or 26.12.1 and up, which rejects TLS chains signed with the certificate keys exposed in the October Node security releases, and `openclaw update` refuses to install on an older Node. Compare it in [Hermes Agent vs OpenClaw](/blog/hermes-agent-vs-openclaw/). [Source](https://github.com/openclaw/openclaw/releases/tag/v2026.10.6)
3. **OpenCode v1.19.4.** Published 22 Oct. It bundles Bun 1.4.4, which carries security fixes for Brotli, TLS, HTTP, WebSocket and `fetch`, and updates root certificates. [Source](https://github.com/anomalyco/opencode/releases/tag/v1.19.4)

Also out: [Claude Code v2.1.308](https://github.com/anthropics/claude-code/releases/tag/v2.1.308), published 22 Oct, with notes that say only "Bug fixes and reliability improvements."

## Top 3 rising repos

1. **earshot.** "Ears for coding agents": it turns sound into evidence an agent can reason about, and lets an agent make sound effects in code. Runs locally on CPU as a CLI, a Python API and an MCP server. Created 15 Oct. MIT, more than 2,200 stars on 23 Oct. [Source](https://github.com/Leonxlnx/earshot)
2. **PandaCode.** A native desktop workspace that runs Claude Code, Codex, OpenCode, Copilot CLI and other agent CLIs side by side, with a task board and an architect with up to three workers. Built on Tauri, with no account and no telemetry. Created 18 Oct. More than 500 stars on 23 Oct under the PandaCode License, MIT with a rule that public or commercial forks must say so. [Source](https://github.com/aicodeking/pandacode)
3. **OpenGCUA.** Tongyi's open stack for generalist computer use agents that read the accessibility tree, call app APIs and run shell commands as well as click, with a paper and released trajectories from eight models. Created 15 Oct. Apache 2.0, more than 430 stars on 23 Oct. [Source](https://github.com/Tongyi-MAI/OpenGCUA)

New repos can gain stars quickly for reasons other than use, so treat these as names to watch, not recommendations.

## Top 3 things people are arguing about

1. **Should an agent sandbox send telemetry by default?** Nvidia's OpenShell runs each agent in an isolated sandbox, checks every file access and network call against a policy, adds credentials only to requests bound for approved endpoints, and uses formal verification to hold risky policy changes for review. Its README also says it collects anonymous operational telemetry unless you turn it off, and that drew the sharpest replies. More than 320 points on Hacker News on 22 Oct; v0.1.5 shipped 20 Oct. Our [sandboxing guide](/blog/agent-security-and-sandboxing/) covers the wider choice. [Source](https://github.com/NVIDIA/OpenShell)
2. **Can Claude prove code safe, or only the model of it?** Anthropic and Theorem report that Claude proved security properties at the RISC V assembly level in more than 100 open source libraries and found bugs that years of testing missed. Replies asked how anyone knows the proof matches the real program, and whether agents can scale the method past small libraries. More than 180 points on Hacker News on 22 Oct. [Source](https://www.anthropic.com/research/formal-verification)
3. **Why every model gives the same "controversial" take.** ModelCompare asked 12 models from ten labs for their most controversial take on humans, three times each. All of them said at least once that people pick what their group believes and then invent the reasons; 7 said it every time. More than 270 points and 320 comments on Hacker News on 22 Oct. [Source](https://www.modelcompare.ai/blog/ai-models-controversial-take-on-humans)

## How this list is built

Each day our agents read GitHub releases and new repos, vendor posts, official accounts on X and the Hacker News front page about coding agents. A name only makes a list with a link that was opened and a signal that can be shown: points, stars or a dated release. Repos are checked against the GitHub API before they appear, and a claim that exists only as a social post is left out. New here? Start with the [install guide](/blog/how-to-install-and-use-munder-difflin/).

<link rel="stylesheet" href="/blog/assets/media/agent-tools-today-2026-10-23/motion.css"><script defer src="/blog/assets/media/agent-tools-today-2026-10-23/motion.js"></script>
