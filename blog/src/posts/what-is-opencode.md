---
title: "What Is OpenCode? Install, Pricing and How It Compares"
description: "OpenCode is Anomaly's MIT licensed coding agent for the terminal. What it is, how to install it, what it costs, and how it compares with Claude Code and Codex."
date: 2026-09-29
category: concepts
categoryLabel: Concepts
type: Technical
primaryKeyword: "what is opencode"
secondaryKeywords: ["opencode", "open code", "is opencode free", "opencode zen", "opencode install", "opencode vs claude code"]
tags: ["Concepts", "Open Source", "CLI Agents", "Engines"]
faq:
  - q: "Is OpenCode free?"
    a: "The tool is free and MIT licensed. You pay the model provider you connect, unless you use a local model or one of the free models on OpenCode Zen. Zen itself is pay as you go, and OpenCode Go is an optional monthly subscription, checked on opencode.ai on 29 Sep 2026."
  - q: "Can OpenCode use my Claude Pro or Max subscription?"
    a: "No. OpenCode's providers page says plugins for Claude Pro and Max exist and that Anthropic explicitly prohibits them, and OpenCode stopped bundling them as of 1.3.0. Claude models still work with an Anthropic API key, billed per token."
  - q: "Is OpenCode the same as Crush?"
    a: "No. Crush is Charm's agent, and it continues the archived Go project that was also called OpenCode, built by its original author. The OpenCode on opencode.ai is a separate TypeScript project from Anomaly. Crush is also licensed differently: its licence file is FSL 1.1 with an MIT future licence, not plain MIT."
  - q: "Does OpenCode run locally?"
    a: "The agent runs on your machine, and the OpenCode site says it does not store your code or context data. The model can be local too: the docs cover Ollama, LM Studio and llama.cpp. With a hosted provider or a Zen model, your prompts go to that provider."
  - q: "Does OpenCode have a desktop app?"
    a: "Yes. The site lists a terminal interface, a desktop app and an IDE extension. The README points to the GitHub releases page and opencode.ai/download for the desktop build."
---

OpenCode is an open source AI coding agent made by Anomaly, the company behind the SST framework, released under the MIT licence. It reads your repo, edits files and runs commands from your terminal, a desktop app or your IDE, using any of 75+ model providers, local models included. Checked on opencode.ai and GitHub on 29 Sep 2026.

You can run OpenCode on its own, or use [Munder Difflin](https://harnessmd.com/download), free and open source, a desktop app that runs OpenCode agents next to Claude Code and Codex, each in its own terminal. What the code does with OpenCode is further down, and the [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup.

## What is OpenCode?

OpenCode is a model agnostic coding agent: you describe a change, and it finds the files, edits them and runs commands with whichever model you connect. The source lives at [anomalyco/opencode](https://github.com/anomalyco/opencode), which the old sst/opencode address now redirects to. On 29 Sep 2026 the GitHub API showed the MIT licence, 210,667 stars and v1.18.33 as the latest release, published the day before.

It ships two primary agents you switch between with Tab. Build is the default and has every tool. Plan sets file edits and bash commands to ask first, so it can read and suggest without touching anything. The agents page in the docs covers both.

The same binary does more than the chat screen. `opencode --help` on our machine lists `opencode run` for one shot tasks, `opencode serve` for a headless server, `opencode web` for a browser interface, `opencode acp` for editors that speak the Agent Client Protocol and `opencode github` for a GitHub agent.

## Is OpenCode the same as Crush?

No, and the name has belonged to two projects. The Go agent at `opencode-ai/opencode` is archived, and its README says it "has continued under the name Crush, developed by the original author and the Charm team." This page is about the TypeScript agent at opencode.ai, the one `npm install -g opencode-ai` installs. If a guide installs it with `go install github.com/opencode-ai/opencode@latest`, it is describing the older project.

## How do I install OpenCode?

Run the install script on macOS or Linux, or use a package manager on any system. These are the commands from the [OpenCode docs](https://opencode.ai/docs/), checked 29 Sep 2026:

| Platform | Command |
| --- | --- |
| macOS, Linux | `curl -fsSL https://opencode.ai/install \| bash` |
| macOS, Linux (Homebrew) | `brew install anomalyco/tap/opencode` |
| Any system with Node | `npm install -g opencode-ai` |
| Arch Linux | `sudo pacman -S opencode` |
| Windows | `choco install opencode` or `scoop install opencode` |
| Docker | `docker run -it --rm ghcr.io/anomalyco/opencode` |

On Windows the docs recommend WSL "for the best experience". Then run `opencode` in a project and type `/connect` to add a provider, or skip that step and use a free model.

## Does OpenCode work without an API key?

Yes, for now: OpenCode Zen serves a few free models that need no account. We checked on 29 Sep 2026 at 09:37 IST on a Mac with OpenCode 1.18.30, installed with npm. We pointed its config and data folders at an empty scratch directory so no saved login could help, and shortened the credentials path below:

```
$ opencode providers list
┌  Credentials …/oc-scratch/xdg/data/opencode/auth.json
│
└  0 credentials

$ opencode models opencode
opencode/big-pickle
opencode/ling-3.0-flash-fin-free
opencode/mimo-v2.5-free
opencode/muse-spark-1.2-contributor-free
opencode/muse-spark-1.3-contributor-free
opencode/nemotron-3-ultra-free
opencode/nemotron-3.5-lightning-free

$ opencode run -m opencode/big-pickle "Read hello.py and tell me in one sentence what it prints. Do not edit any files."
> build · big-pickle
→ Read hello.py
It prints `Hello, Scranton`.
```

The run took 7 seconds. The Zen page in the docs says the free models are "available on OpenCode for a limited time", so treat that list as a snapshot. The prompt still went to a hosted model, not to your machine.

{% img "note-1" %}

## Is OpenCode free?

The tool is free, and the model is what you pay for. How each option bills, checked on opencode.ai on 29 Sep 2026:

| Model source | How you pay |
| --- | --- |
| Your own key: Anthropic, OpenAI, Google, OpenRouter, Amazon Bedrock and 75+ more | That provider's rates |
| ChatGPT Plus, GitHub Copilot, GitLab Duo | The subscription you already have |
| Local models: Ollama, LM Studio, llama.cpp | Your own hardware |
| OpenCode Zen | Pay as you go per token, card fees passed on at cost, a few free models |
| OpenCode Go | Optional subscription: Go at $10 a month or Go Plus at $40 a month, with monthly usage limits per model |

## Can OpenCode use my Claude subscription?

No. The [providers page](https://opencode.ai/docs/providers/) says plugins for Claude Pro and Max exist and "Anthropic explicitly prohibits this", and OpenCode stopped bundling them as of 1.3.0. Anthropic's [legal and compliance page](https://code.claude.com/docs/en/legal-and-compliance) says third party developers may not route requests through Free, Pro or Max plan credentials. Claude models still work through an Anthropic API key.

## OpenCode vs Claude Code vs Codex CLI: which should you use?

OpenCode if you want to choose the model, Claude Code if you want Anthropic's own agent, Codex CLI if you already pay for ChatGPT. Each row checked on 29 Sep 2026 against the [Claude Code setup docs](https://code.claude.com/docs/en/setup), the [Codex README](https://github.com/openai/codex) and `codex --help` (0.153.4), and the OpenCode docs:

| | OpenCode | Claude Code | Codex CLI |
| --- | --- | --- | --- |
| Maker | Anomaly | Anthropic | OpenAI |
| Licence | MIT | Proprietary, "All rights reserved" | Apache-2.0 |
| Install | `curl -fsSL https://opencode.ai/install \| bash` | `curl -fsSL https://claude.ai/install.sh \| bash` | `curl -fsSL https://chatgpt.com/codex/install.sh \| sh` |
| Models | 75+ providers and local models | Claude only, via Anthropic, Bedrock, Google Cloud or Foundry | OpenAI, plus custom providers and Ollama or LM Studio with `--oss` |
| Account | None for Zen's free models | Pro, Max, Team, Enterprise or Console | ChatGPT plan or API key |

**Pick OpenCode if** you want to switch models per task, run local models, or reuse a Copilot or ChatGPT subscription.

**Pick Munder Difflin if** you'd rather not choose: it runs all three side by side, each agent a real CLI in its own terminal.

**Pick Claude Code if** you're on a Claude plan and want Anthropic's agent. Anthropic's gateway docs say it doesn't support routing Claude Code to non Claude models.

**Pick Codex CLI if** you pay for ChatGPT and want OpenAI's agent with an open source client.

Our [Codex CLI vs Claude Code](/blog/codex-cli-vs-claude-code/) comparison goes further on those two, and [best AI coding agents](/blog/best-ai-coding-agents/) covers the wider field.

{% img "note-2" %}

## Does Munder Difflin run OpenCode?

Yes. In Munder Difflin 0.5.3, `src/shared/agentProvider.ts` lists OpenCode as an engine, with a comment naming anomalyco/opencode and ruling out the archived Go project. It starts the normal `opencode` interface in the agent's terminal and passes the brief with `--prompt`.

It picks no model for you. `--model provider/model` goes on the command only when you choose one, so otherwise OpenCode uses whatever you configured. If `opencode` is missing, the app runs `npm install -g opencode-ai@latest` in that terminal, installing Node first when npm is absent and falling back to the official script, or Chocolatey on Windows, then relaunches the agent. Each agent gets an `OPENCODE_CONFIG_CONTENT` value that turns auto update off, and edit, bash and webfetch are set to allow only when the floor's Auto Mode is on.

One limit: the code does not resume an OpenCode session after a respawn, it starts a fresh one. To run OpenCode on local models inside the app, see [run Munder Difflin on open models](/blog/run-munder-difflin-on-open-models/).
