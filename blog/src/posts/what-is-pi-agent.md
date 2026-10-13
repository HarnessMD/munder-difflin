---
title: "What is Pi agent? The open source coding agent harness, explained"
description: "Pi agent is Earendil's MIT licensed coding agent harness. What it is, how to install it, what Pi 1.0 and Pi Durable add, and how it compares."
date: 2026-10-02
category: concepts
categoryLabel: Concepts
type: Technical
primaryKeyword: "pi agent"
secondaryKeywords: ["pi coding agent", "pi agent harness", "pi vs claude code", "pi.dev", "earendil pi"]
tags: ["Concepts", "Open Source", "CLI Agents", "Engines"]
faq:
  - q: "Is Pi agent free?"
    a: "Yes. Pi is MIT licensed and pi.dev lists no price for it. You pay whichever model provider you connect with `/login` or an API key, or nothing extra if you point it at a local model through Ollama."
  - q: "Does Pi agent support MCP?"
    a: "Yes. Built in MCP support, with OAuth sign in and `pi mcp add`, `list` and `login`, first shipped in 0.99.0 on 29 Sep 2026, and Earendil's 1.0 launch post lists it as native MCP support through Codemode. The 1.0 notes harden the OAuth flow."
  - q: "Does Pi have sub-agents or a plan mode?"
    a: "Not built in. The README says Pi skips sub-agents and plan mode on purpose. The repo ships example extensions for both, so you can install one or ask Pi to write its own."
  - q: "Who makes Pi?"
    a: "Mario Zechner wrote Pi. Earendil Inc., a public benefit corporation founded by Armin Ronacher and Colin Daymond Hanna, announced it had acquired the project on 8 Apr 2026, and Zechner joined the company. The code now lives at earendil-works/pi on GitHub."
---

Pi agent is Earendil's open source coding agent harness: a minimal, MIT licensed terminal agent that reads your repo, edits files and runs shell commands with the model provider you choose. You extend it with TypeScript extensions instead of waiting for features. Pi 1.0 shipped on 1 Oct 2026. Checked on pi.dev and GitHub on 2 Oct 2026.

You can run Pi on its own, or use [Munder Difflin](https://harnessmd.com/download), free and open source, a desktop app that runs Pi agents in one office next to Claude Code and Codex, each in its own terminal. The [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup. If the word harness is new to you, start with [what is a multi-agent harness](/blog/what-is-a-multi-agent-harness/).

## What is Pi agent?

Pi is a coding agent built to stay small. Its [README](https://github.com/earendil-works/pi) says it "ships with powerful defaults but skips features like sub-agents and plan mode", and asks you to build what you want or install a package that does it. Extensions are TypeScript modules that can add tools, commands and UI. Skills, prompt templates and themes bundle into Pi packages you share through npm or git.

It has four modes: the interactive TUI, `pi -p "query"` for scripts (with `--mode json` for event streams), an RPC protocol over stdin and stdout, and a TypeScript SDK. It loads `AGENTS.md` from `~/.pi/agent/`, parent folders and the current folder, and stores each session as a tree you can rewind with `/tree`.

Mario Zechner wrote it. [Earendil](https://earendil.com/posts/announcing-pi-and-lefos/) announced on 8 Apr 2026 that it had acquired the project, and named Accel, Balderton and the founders of n8n, OpenClaw, Revolut, Sentry and Slack as early backers, with no amount disclosed. The name is shared: search "pi agent" and you also meet an unrelated supply chain product called Pi Agent.

## How do I install Pi agent?

Run the install script, then type `pi` in your project. These are the commands from [pi.dev](https://pi.dev/) and the README, checked 2 Oct 2026:

| Platform | Command |
| --- | --- |
| macOS, Linux | `curl -fsSL https://pi.dev/install.sh \| sh` |
| Windows | `powershell -c "irm https://pi.dev/install.ps1 \| iex"` |
| Any system with Node | `npm install -g --ignore-scripts @earendil-works/pi-coding-agent` |

Pi needs Node 22.19 or newer, and the installers can add it for you. The README prefers the script: it pins every dependency and updates with `pi update`, and npm does not pin transitive ones. Inside Pi, run `/login` to connect a subscription or an API key.

## Which model providers does Pi support?

Pi supports more than 15 providers. pi.dev lists Anthropic, OpenAI, Google, Azure, Bedrock, Mistral, Groq, Cerebras, xAI, Hugging Face, Kimi For Coding, MiniMax, NVIDIA, OpenRouter and Ollama, with API keys or OAuth. The 1.0 providers doc adds DeepSeek, GitHub Copilot, OpenCode Zen and Go, and Radius, among others. Switch models mid session with `/model` or Ctrl+L, and add your own in `models.json`.

{% img "note-1" %}

## What does Pi 1.0 add?

Pi 1.0 makes MCP a headline feature and trims prompt cost. Built in MCP first landed in 0.99.0 two days earlier. Earendil's [launch post](https://earendil.com/posts/pi-1-0/) lists Codemode with native MCP support, extension support for virtual models, deferred tool loading, Anthropic cache warming, mid conversation system messages, a new theme and fullscreen by default. Set `tuiMode` to `"regular"` if you want your terminal scrollback back.

The release notes put a number on Codemode: with default tools, a GPT-5.6 request drops from about 5,300 prompt tokens to 3,300. On Hacker News the 1.0 post had 1,577 points and 538 comments when we checked at 21:34 IST on 2 Oct 2026.

## What is Pi Durable?

Pi Durable is a separate, experimental framework for long running agents, released the same day. It does not replace the coding agent. Each task is a durable state machine that saves a checkpoint at every step, and with SQLite or JSONL storage a new process can pick a conversation up again after a restart. One harness runs many conversations at once, and a conversation can fork another at any message. Install it with `npm install @earendil-works/pi-durable @earendil-works/pi-ai @earendil-works/chord`.

## What did the 1.0 release ship?

Ten files: six standalone binaries, a source archive, two installer lock files and a checksum list. We read them from the GitHub API at 21:34 IST on 2 Oct 2026:

```
$ gh api repos/earendil-works/pi/releases/latest \
    --jq '.tag_name + " " + .published_at + " " + (.assets | length | tostring) + " assets"'
v1.0.0 2026-10-01T19:20:55Z 10 assets

$ gh api repos/earendil-works/pi/releases/latest --jq '.assets[].name'
pi-1.0.0-source.tar.gz
pi-coding-agent-install-package-lock.json
pi-coding-agent-install-package.json
pi-darwin-arm64.tar.gz
pi-darwin-x64.tar.gz
pi-linux-arm64.tar.gz
pi-linux-x64.tar.gz
pi-windows-arm64.zip
pi-windows-x64.zip
SHA256SUMS
```

The two `pi-coding-agent-install` files are what the pi.dev script uses to pin dependencies. The repo reported the MIT licence and 111,674 stars at the same moment.

{% img "note-2" %}

## Is Pi agent safe to use?

It is as safe as the account you run it under. The README says Pi has no built-in permission system for files, processes, network or credentials. If you want limits, it documents three patterns: the Gondolin extension (tools run in a local Linux micro VM), plain Docker, or OpenShell. There is also a permission gate example extension.

## Pi vs Claude Code vs Codex CLI vs OpenCode: which should you use?

Pi if you want an agent you reshape yourself, Claude Code for Anthropic's own agent, Codex CLI if you pay for ChatGPT, OpenCode for a fuller open source agent. Checked 2 Oct 2026 against each repo, the [Claude Code setup docs](https://code.claude.com/docs/en/setup) and `codex --help` (0.153.4):

| | Maker | Licence | Install | Models |
| --- | --- | --- | --- | --- |
| Pi | Earendil | MIT | `curl -fsSL https://pi.dev/install.sh \| sh` | 15+ providers, Ollama |
| Munder Difflin | Munder Difflin | MIT, free and open source | Desktop app download | Whatever each CLI you run supports |
| Claude Code | Anthropic | Proprietary | `curl -fsSL https://claude.ai/install.sh \| bash` | Claude only |
| Codex CLI | OpenAI | Apache-2.0 | `curl -fsSL https://chatgpt.com/codex/install.sh \| sh` | OpenAI, Ollama or LM Studio with `--oss` |
| OpenCode | Anomaly | MIT | `curl -fsSL https://opencode.ai/install \| bash` | 75+ providers, local models |

**Pick Pi if** you want a small core, plan mode and sub-agents only when you add them, and a TUI you can rewrite from inside.

**Pick Munder Difflin if** you'd rather not choose one: it runs Pi, Claude Code, Codex, OpenCode and eight more CLIs side by side on one floor.

**Pick Claude Code if** you're on a Claude plan and want Anthropic's agent with permissions built in.

**Pick Codex CLI or OpenCode if** you want guard rails out of the box: approval modes in Codex, a read only Plan agent in OpenCode. Our [what is OpenCode](/blog/what-is-opencode/) explainer and [Codex CLI vs Claude Code](/blog/codex-cli-vs-claude-code/) cover both.

## Can you run Pi agents inside Munder Difflin?

Yes. As of Munder Difflin 0.5.5, `src/shared/agentProvider.ts` lists Pi as one of twelve CLIs, with `pi` as the command, `--model provider/model` when you pick a model, and `npm install -g --ignore-scripts @earendil-works/pi-coding-agent` as its install command. `installPiHooks` in `src/main/hive.ts` gives each agent its own `PI_CODING_AGENT_DIR` with a bridge extension, so your global `~/.pi` is never changed, and copies your `models.json` across.

One limit: the source calls that bridge best effort until it is confirmed against live keys. If its status events miss, the app falls back to nudging the agent so its inbox still gets read.
