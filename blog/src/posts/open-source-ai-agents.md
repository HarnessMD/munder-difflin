---
title: "Best Open Source AI Agents: 10 Picks by Job, Checked 1 Oct 2026"
seoTitle: "Best Open Source AI Agents in 2026: 10 Self Hosted Picks"
description: "The best open source AI agents in 2026, sorted by job: personal assistants, coding agents, agent teams and a framework. Licences checked 1 Oct 2026."
date: 2026-10-01
category: comparisons
categoryLabel: Comparisons
type: Non-technical
primaryKeyword: "open source ai agents"
secondaryKeywords: ["best open source ai agents", "open source ai agent", "self hosted ai agent", "open source ai coding agent", "open source personal ai assistant"]
tags: ["Comparisons", "AI Agents", "Open Source", "CLI Agents"]
faq:
  - q: "What is the best open source AI agent?"
    a: "It depends on the job. OpenClaw is the strongest personal assistant, Munder Difflin runs a team of named agents on your computer, and Hermes Agent is best on memory that grows. For coding alone, OpenCode in the terminal or Cline in your editor."
  - q: "Are open source AI agents free?"
    a: "The software is. All ten picks here are MIT or Apache 2.0 licensed, checked on 1 Oct 2026. You still pay for the model behind them, unless you run a local one or the agent reuses a subscription you already have."
  - q: "What is a self hosted AI agent?"
    a: "An agent whose code runs on hardware you control, such as your laptop, a home server or a VPS, instead of a vendor's cloud. Your prompts still go to whichever model provider you configure. OpenClaw, Hermes Agent and OpenHands are built to live on a server, so they keep working when your laptop is shut."
  - q: "Can I run an open source AI agent with a local model?"
    a: "Yes. OpenCode works with local models, Goose lists Ollama among its providers, and Hermes Agent takes your own endpoint. Check each tool's provider docs for the exact setup."
  - q: "Is OpenHands the same as OpenDevin?"
    a: "Yes, OpenDevin was renamed OpenHands. As of 1 Oct 2026 its README leads with Agent Canvas, a self hosted control center that runs the OpenHands agent or other agents such as Claude Code and Codex."
---

The best open source AI agents right now are OpenClaw for a personal assistant, [Munder Difflin](https://harnessmd.com/download) for a team of agents on your computer, Hermes Agent for memory that learns, and OpenCode or Cline for coding. All ten picks below are MIT or Apache 2.0, checked on their repos on 1 Oct 2026.

## What is an open source AI agent?

It is a program that calls a language model in a loop and uses tools to finish a goal, with code you may read, change and share. The model is a separate question: open code does not make the model open. [Is Claude Code open source?](/blog/is-claude-code-open-source/) shows where that line sits for one popular agent.

## The best open source AI agents in 2026

### Personal assistants and agent teams

**1. OpenClaw.** [OpenClaw](https://github.com/openclaw/openclaw) is a personal assistant that runs on your own computer and answers in Discord, iMessage, Slack, Teams, Telegram, WhatsApp and 20+ more channels. Its README says state, memory and credentials live on your hardware, and that it has no paid tier, hosted service or token. Best for: one assistant for your personal life.

**2. Munder Difflin.** [Munder Difflin](https://harnessmd.com/download) is what we make: a free and open source desktop app (MIT) that runs a team of named AI agents on your own computer. Each agent runs on a CLI engine you already use, such as Claude Code, Codex, Gemini CLI, OpenCode or Cursor, and keeps its own `memory.md`, inbox and outbox. You can put missions on schedules, and a Slack trigger feeds requests to Michael, the orchestrator who hands work out. The limits: agents run only while your computer does, you install and sign in to each CLI yourself, and anonymous usage telemetry is on by default (you can turn it off in Settings). Best for: project work spread over several engines. The [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup.

**3. Hermes Agent.** [Hermes Agent](https://github.com/NousResearch/hermes-agent) from Nous Research is built around a learning loop: it curates its own memory, writes skills after complex tasks and searches its past sessions. It has a built in cron scheduler, talks over Telegram, Slack, Signal and more, and runs on a laptop, a VPS or serverless backends. Best for: a server agent that improves with use. Our [Hermes Agent explainer](/blog/what-is-hermes-agent/) covers the install command, the models it takes and what it costs.

**4. NanoClaw.** [NanoClaw](https://github.com/nanocoai/nanoclaw) is a lightweight alternative to OpenClaw that runs each agent in its own Linux container, so isolation comes from the operating system rather than permission checks. Its author writes that they couldn't have slept after giving software they didn't understand full access to their life, which is a fair review of most agents. Best for: reading every line of the thing that touches your accounts.

### Coding agents

**5. OpenCode.** OpenCode is an MIT terminal coding agent that works with many model providers, local models included. Our [what is OpenCode](/blog/what-is-opencode/) explainer walks through it. Best for: a Claude Code style agent you can fork.

**6. Cline.** Cline (Apache 2.0) calls itself the open source coding agent in your IDE, terminal and desktop. Best for: working inside your editor.

**7. Aider.** [Aider](https://github.com/Aider-AI/aider) (Apache 2.0) is AI pair programming in your terminal, with git built into the loop. Its latest release is from August 2025. Best for: a small, proven tool, if slow updates are fine.

One more for the terminal: Pi, Earendil's MIT licensed agent harness, which leaves out plan mode and subagents on purpose. Our [what is Pi agent](/blog/what-is-pi-agent/) explainer covers its 1.0 release.

**8. OpenHands.** OpenHands (MIT), formerly OpenDevin, leads its README with Agent Canvas: a self hosted control center that runs the OpenHands agent, Claude Code, Codex or Gemini on local, Docker, VM or cloud backends. Best for: a shared agent server for a team.

**9. Goose.** Goose (Apache 2.0) moved from Block to the Agentic AI Foundation at the Linux Foundation. It is a general agent with a desktop app and a CLI, and works with 15+ model providers. Best for: a general agent that is not only for code.

### Frameworks

**10. CrewAI.** CrewAI (MIT) is a Python framework for orchestrating role playing agents. You write the agents in code; it is not an app you chat with. Our [multi agent harness](/blog/what-is-a-multi-agent-harness/) explainer covers how that differs from an app that runs CLIs. Best for: building your own multi agent product.

## Open source AI agents compared, checked 1 Oct 2026

| Agent | Job | Runs on | Licence | Latest release (checked) |
| --- | --- | --- | --- | --- |
| OpenClaw | Personal assistant | Your computer or server | MIT | v2026.9.7, 30 Sep 2026. |
| Munder Difflin | Team of agents | Your computer (macOS, Windows, Linux) | MIT | v0.5.3, 18 Sep 2026. |
| Hermes Agent | Personal assistant | Your computer, a VPS or serverless | MIT | v2026.9.24, 24 Sep 2026. |
| NanoClaw | Personal assistant | Containers on your computer | MIT | v2.4.0, 23 Sep 2026. |
| OpenCode | Coding agent | Your terminal | MIT | v1.18.34, 30 Sep 2026. |
| Cline | Coding agent | Your editor, terminal or desktop | Apache 2.0 | v4.1.22 (extension), 30 Sep 2026. |
| Aider | Coding agent | Your terminal | Apache 2.0 | v0.86.0, 9 Aug 2025. |
| OpenHands | Coding agent server | Your computer, Docker, a VM or cloud | MIT | v1.24.0, 25 Sep 2026. |
| Goose | General agent | Desktop app or CLI | Apache 2.0 | v1.52.0, 23 Sep 2026. |
| CrewAI | Framework | Your Python code | MIT | 1.15.23, 28 Sep 2026. |

We read each tag from the GitHub API on 1 Oct 2026. Two of them:

```
$ gh api repos/openclaw/openclaw/releases/latest --jq '.tag_name + " " + .published_at'
v2026.9.7 2026-09-30T04:44:14Z
$ gh api repos/Aider-AI/aider/releases/latest --jq '.tag_name + " " + .published_at'
v0.86.0 2025-08-09T17:42:19Z
```

One oddity: GitHub's API labels OpenClaw's licence `NOASSERTION`, but its LICENSE file is the MIT text plus a pointer to third party notices.

## Which open source AI agent can I self host?

All ten run on hardware you control; the difference is which hardware. OpenClaw, Hermes Agent and OpenHands are built to live on a server, so they keep working with your laptop shut. Cline, Munder Difflin and Aider expect the machine you work at, and NanoClaw needs Docker. Self hosted is not the same as private: prompts still go to the model provider you pick. Our [ChatGPT dots alternatives](/blog/chatgpt-dots-alternatives/) splits the same field into local and cloud.

## Why do other open source AI agent lists look different?

Most top results list frameworks, and some have aged. As of 1 Oct 2026, Modal's page from September 2024 still leads with Devika and smol developer. AIMultiple, updated 16 Aug 2026, skips OpenClaw and Hermes Agent. Eesel's list, edited 8 Sep 2026, is mostly frameworks and builders, including Flowise, which that page says was archived in August 2026.

## Which open source AI agent should you pick?

Match the agent to the job.

* Pick **OpenClaw** if you want one assistant in your chat apps.
* Pick **Munder Difflin** if you want several named agents with roles, each on the CLI you already use.
* Pick **Hermes Agent** if you want a server agent whose memory and skills grow.
* Pick **NanoClaw** if container isolation matters more than features.
* Pick **OpenCode** or **Cline** if you want one coding agent, in the terminal or the editor.
* Pick **OpenHands** if your team wants a shared, self hosted agent server.
* Pick **CrewAI** if you are writing your own agent product in Python.
