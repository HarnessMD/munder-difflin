---
title: "Aider vs Claude Code in 2026: Which Should You Use?"
description: "Aider vs Claude Code, checked 15 Sep 2026: how each edits code, which models it runs, what it costs, MCP, and Aider's stalled releases."
date: 2026-09-15
category: comparisons
categoryLabel: Comparisons
type: Technical
primaryKeyword: "aider vs claude code"
secondaryKeywords: ["claude code vs aider", "aider vs claude code 2026", "is aider still maintained", "does aider support mcp", "aider claude code subscription", "claude code vs aider benchmark"]
tags: ["Comparisons", "Claude Code", "CLI Agents", "Open Source", "Cost"]
faq:
  - q: "Is Aider free?"
    a: "The tool is. Aider is an Apache 2.0 Python package with no paid plan, so the only bill comes from the model provider behind your API key, or nothing if you run a local model. Claude Code is not free: Claude's Free plan does not include it, per claude.com/pricing on 15 Sep 2026. Without a plan, you pay per token with an Anthropic API key."
  - q: "Can I use my Claude Pro or Max subscription with Aider?"
    a: "No. Anthropic's legal and compliance page for Claude Code reserves subscription sign in for ordinary use of Claude Code and Anthropic's own apps. Aider reaches Claude models through an Anthropic API key or a cloud provider such as Amazon Bedrock, billed per token and separately from any plan."
  - q: "Is there a benchmark that compares Aider and Claude Code?"
    a: "Not a head to head one. Aider's polyglot leaderboard scores models running inside Aider on 225 Exercism exercises, and the page says it was last updated on 20 Nov 2025, with gpt-5 (high) on top at 88.0%. Claude Code is not on it, so it tells you which model edits well in Aider, not which tool is better."
  - q: "Can Aider run shell commands?"
    a: "Yes, with you in the loop. The /run command runs a command and can add its output to the chat, /test adds the output when a command fails, and aider --help lists suggesting shell commands as on by default. Claude Code runs commands inside its own loop, gated by its permission mode."
  - q: "Is Aider dead?"
    a: "It is not archived, but it has stalled. As of 15 Sep 2026 its latest release is 0.86.2 from 12 Feb 2026, the last commit on main is from 22 May 2026, and no pull request has been merged since. A community fork, cecli, published v1.5.1 on 12 Sep 2026."
---

Pick Claude Code if you want an agent that finds its own files, runs commands and splits work across subagents on Claude models. Pick Aider if you want a free, Apache 2.0 pair programmer that works with almost any model and commits every edit to git. The catch: Aider's last release was 0.86.2, on 12 Feb 2026.

Both run in a terminal inside your project. They differ on who picks what to read, who you pay, and whether the project still ships. We checked each point on 15 Sep 2026 against the projects' own docs and repos and a fresh Aider install. Already paying for Claude? Read [getting more out of a Claude Code Max plan](/blog/claude-code-max-plan-tips/).

## What is the difference between Aider and Claude Code?

Aider is a pair programmer you steer file by file, and Claude Code is an agent that goes looking for itself.

In Aider you add the files you want changed to the chat, and it sends the model a repo map: a ranked outline of classes and function signatures across the repo, 1k tokens by default. The model replies in an edit format Aider picks per model, usually search and replace blocks, and Aider applies the edit and commits it to git, so `/undo` takes it back. Claude Code starts from the task. It searches and reads files with its own tools, edits them, runs commands such as your tests, and commits when you ask. Instead of a commit per edit, it snapshots files before each prompt so `/rewind` can roll a turn back.

{% img "note-1" %}

Claude Code also has subagents with their own context window, tools and permissions, hooks around every tool call, MCP servers, and a [plan mode](/blog/how-to-use-claude-code-plan-mode/) that researches without editing. Aider's extras are more manual: an architect mode where one model plans and another writes the edits, `/run` and `/test` to feed command output back, and `--watch-files` for AI coding comments left in your files.

## What does a fresh Aider install show?

It shows version 0.86.2 and two git defaults worth knowing. We installed Aider into a throwaway folder with `uv tool install --python 3.12 aider-chat`, which took 28 seconds, then ran only version and help commands, with no key and no prompt:

```
$ aider --version
aider 0.86.2
$ aider --help | grep -A2 -e "--auto-commits," -e "--git-commit-verify,"
  --auto-commits, --no-auto-commits
                        Enable/disable auto commit of LLM changes (default:
                        True) [env var: AIDER_AUTO_COMMITS]
--
  --git-commit-verify, --no-git-commit-verify
                        Enable/disable git pre-commit hooks with --no-verify
                        (default: False) [env var: AIDER_GIT_COMMIT_VERIFY]
$ aider --help | grep -ci mcp
0
```

Aider will never forget to commit. It will also, by default, skip the pre-commit hooks you set up to stop bad commits: its git docs say it commits with `--no-verify` unless you pass `--git-commit-verify`. If your repo leans on a pre-commit linter or secret scanner, set that flag.

## Is Aider still maintained?

Barely: the repo is not archived, but its last commit on main landed on 22 May 2026. PyPI's latest version is 0.86.2, uploaded 12 Feb 2026, the first release since August 2025. On 15 Sep 2026, GitHub's API showed no pull request merged since and 493 open, while 280 new issues had arrived since 1 Jun 2026. When a user asked [where the maintainer had gone](https://github.com/Aider-AI/aider/issues/4613) in October 2025, Paul Gauthier replied: "Unfortunately I've been occupied with other projects recently." Aider's [LLM leaderboard](https://aider.chat/docs/leaderboards/) still says last updated 20 Nov 2025. Claude Code published 29 versions to npm between 17 Aug and 12 Sep 2026.

## Which models can Aider and Claude Code use?

Aider can use almost any model, and Claude Code is built for Claude only. Aider connects through LiteLLM to hundreds of models, including local ones through Ollama or any OpenAI compatible server. Claude Code runs Claude through Anthropic, Amazon Bedrock, Claude Platform on AWS, Google Cloud's Agent Platform or Microsoft Foundry, and Anthropic's [gateway docs](https://code.claude.com/docs/en/llm-gateway) say it "doesn't support routing Claude Code to non-Claude models through any gateway." People point it at Ollama anyway; our [Ollama and Claude Code guide](/blog/how-to-connect-ollama-to-claude-code/) covers what breaks when you do.

## Is Aider cheaper than Claude Code?

Aider itself is free, and every request bills your model provider per token. Claude Code needs a paid Claude plan or an Anthropic API key billed per token. Claude's [pricing page](https://claude.com/pricing) on 15 Sep 2026 shows Claude Code missing from the Free plan, Pro at $20 billed monthly (or $17 a month billed annually) with Claude Code included, and Max from $100 a month for 5x or 20x Pro's usage, all with usage limits. That subscription does not carry over to Aider. Anthropic's [legal and compliance page](https://code.claude.com/docs/en/legal-and-compliance) says subscription sign in is for "ordinary use of Claude Code and other native Anthropic applications", so Aider on Claude means an API key or a cloud provider account, billed per token. Our [Claude Code cost breakdown](/blog/how-much-does-claude-code-cost/) has the per token side.

{% img "note-2" %}

## Does Aider support MCP?

No, not as of 0.86.2. Its help output has no MCP option, a feature request for native MCP support has been open since 9 Sep 2025, and of four pull requests with MCP in the title, three were closed unmerged and one, opened 8 Aug 2026, still waits. Claude Code adds servers with `claude mcp` or `--mcp-config`.

## What are the options if Aider has stalled?

Four sensible moves, depending on what you liked about Aider:

1. **Claude Code**, if you want more autonomy and Claude models suit you. You trade a commit per edit for checkpoints, and you decide when to commit.
2. **[Munder Difflin](https://harnessmd.com/download)**, if you are picking Claude Code and will want more than one session going. It is a free and open source desktop app that runs Claude Code agents side by side, each in a real terminal and optionally its own git worktree, with long term memory and a shared task board (todo, doing, blocked, done). Aider is not a built in engine as of 0.5.2. You can type `aider` into the Custom engine, but that agent gets no hooks, so the app cannot tell when it is idle and messages to it go back to the orchestrator.
3. **[OpenCode](/blog/what-is-opencode/)**, if model choice was the point. It is MIT licensed, and its docs say it supports 75+ LLM providers and local models, checked 15 Sep 2026.
4. **cecli**, if you want to stay on Aider's codebase. This GitHub fork of Aider (Apache 2.0, formerly aider-ce) published v1.5.1 on 12 Sep 2026, and its README links docs for MCP configuration and subagents. We have not tested it.

## Should you choose Aider or Claude Code today?

Choose Claude Code if Claude models suit you and you want the agent to do the looking; it is the one still shipping. Choose Aider for a small tool on any model, local ones included, if you can accept that fixes may not come. Running several Claude Code sessions at once? The [multi-agent Claude Code tools roundup](/blog/best-claude-code-multi-agent-tools/) compares the options.
