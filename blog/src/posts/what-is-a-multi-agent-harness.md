---
title: "What Is an AI Agent Harness? Single vs Multi-Agent Harness Explained"
description: "An agent harness is the code around an AI model that runs its tool loop, memory and permissions. Single vs multi-agent harnesses, compared and dated."
date: 2026-05-22
updated: 2026-09-29
category: concepts
categoryLabel: Concepts
type: Non-technical
primaryKeyword: "agent harness"
secondaryKeywords: ["ai agent harness", "harness agent", "what is an agent harness", "multi-agent harness", "agent harness vs framework", "is claude code an agent harness"]
tags: ["Concepts", "Multi-Agent", "Claude Code"]
author:
  name: Chaitanya Giri
  initials: CG
faq:
  - q: "What is an agent harness in simple terms?"
    a: "It is everything around the model that lets it act: the loop that calls the model, runs the tools it asks for and feeds the results back, plus memory, permissions and a workspace. The usual shorthand is agent = model + harness."
  - q: "Is Claude Code an agent harness?"
    a: "Yes, a single agent one. Anthropic describes the Claude Agent SDK as the agent harness that powers Claude Code, with the same tools, agent loop and context management. It runs one agent, which can spawn subagents and, as an experimental feature, a team of other Claude Code sessions."
  - q: "What is the difference between an agent harness and an agent framework?"
    a: "A framework is a library you write an agent with. A harness is the runtime that actually drives the model and its tools. The line blurs in practice: Microsoft ships a Harness inside Agent Framework, and LangChain's Deep Agents is a library that calls itself an agent harness."
  - q: "What is a multi-agent harness?"
    a: "Software that runs several single agent harnesses at once and makes them work as a team. It adds roles, messages between agents, a shared plan and memory, an orchestrator that hands out work, and guardrails across the whole group."
  - q: "Is Harness Agents the same thing as an agent harness?"
    a: "No. Harness Agents is a product from Harness, the CI/CD company, described on its own docs as AI agents that run inside your pipelines. An agent harness is the general term for the software that runs any AI agent."
---

An agent harness is the software around an AI model that turns it into an agent: it calls the model, runs the tools the model asks for, feeds the results back, and keeps track of memory, permissions and the workspace. The model thinks. The harness does everything else.

The term has two meanings in the wild. Anthropic, LangChain and Microsoft use it for the loop around one model, so Claude Code is a harness. Others, us included, also use it for the layer that runs several of those agents as one team: a **multi-agent harness**. This page covers both, then what the multi agent version adds.

If you searched "harness agent" looking for Harness, the CI/CD company, its [Harness Agents](https://developer.harness.io/harness-ai/3.0/use-harness-ai/ai-agents/harness-agents) are, in its own words, "autonomous AI agents that run inside your pipelines". Same word, different office.

You can build a multi agent setup by hand with git worktrees and a few terminals, or use [Munder Difflin](https://harnessmd.com/download), free and open source, which is the multi-agent harness this blog is written by. The [install guide](/blog/how-to-install-and-use-munder-difflin/) gets you from download to a first agent.

## What does an agent harness actually do?

It runs the loop the model cannot run by itself. A language model only produces text, so something has to notice a tool call in that text, execute it, and hand back the result. LangChain's [anatomy of an agent harness](https://www.langchain.com/blog/the-anatomy-of-an-agent-harness) (10 Mar 2026) puts it bluntly: a harness is "every piece of code, configuration, and execution logic that isn't the model itself." In practice that covers:

- **Tool dispatch.** Reading files, running commands, calling MCP servers, searching the web.
- **Context and memory.** Keeping the conversation, compacting it when it gets long, and loading project instructions such as `CLAUDE.md`.
- **Permissions.** Deciding which tools run on their own and which need your approval.
- **A workspace.** A directory, a sandbox or a container the agent is allowed to touch.
- **Hooks and logs.** Code that runs at set points in the loop, so you can see and steer what happened.

Microsoft's [Agent Framework docs](https://learn.microsoft.com/en-us/agent-framework/concepts/harness) (updated Sep 2026) give the same shape in one line: "the runtime scaffolding that turns a language model into an agent that can perform work."

## Is Claude Code an agent harness?

Yes, in the single agent sense. When Anthropic renamed the Claude Code SDK to the Claude Agent SDK on 29 Sep 2025, it called it "[the agent harness that powers Claude Code](https://claude.com/blog/building-agents-with-the-claude-agent-sdk)". The [Agent SDK overview](https://code.claude.com/docs/en/agent-sdk/overview) says it gives you "the same tools, agent loop, and context management that power Claude Code", in Python and TypeScript. Claude Code is that harness with a terminal on top.

## Is an agent harness the same as an agent framework?

No, though the line is blurry. A framework is a library you write an agent with; a harness is the runtime that drives it. Microsoft ships a Harness inside Agent Framework, and LangChain's [Deep Agents](https://github.com/langchain-ai/deepagents) is a library that calls itself "the batteries-included agent harness". A useful test: are you writing the agent, or running one that already exists? Our [CrewAI and AutoGen comparison](/blog/crewai-autogen-vs-a-local-agent-harness/) covers that choice in more detail.

## What is a multi-agent harness?

A multi-agent harness runs several single agent harnesses at the same time and makes them behave like one team. Anthropic's own write-up on [harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) (26 Nov 2025) already splits the work between "an initializer agent" and "a coding agent", which is the smallest team there is. A multi-agent harness generalises that. On top of each agent's own loop it adds:

- **Roles.** A researcher, a builder and a reviewer, instead of five generalists stepping on each other.
- **Messaging.** Agents hand findings to each other directly, not through you copying text between windows.
- **A shared plan and lasting memory.** A board everyone reads, and notes that survive a restart.
- **An orchestrator.** One coordinator turns your request into tasks and assigns them.
- **Isolation.** Each worker gets its own working copy, so two agents do not edit the same file.
- **Guardrails for the group.** A loop or a runaway token bill is caught across the floor, not per window.
- **Mixed vendors.** Because it sits outside any one CLI, it can put Claude Code next to Codex or Gemini CLI.

{% img "note-1" %}

## What does a multi-agent harness look like in code?

Mostly files and a router. We read the Munder Difflin source at tag v0.5.3 on 29 Sep 2026, and the coordination layer lives in `src/main/hive.ts`. Every agent gets a folder with an identity, a memory file, an inbox, an outbox and a read cursor. A router in the main process moves each outbox message into the recipient's inbox, and that process is the only one that commits to the hive's git repo, so agents never race on git. The shared plan is `board.md`, and by protocol only the orchestrator (Michael, your clone) edits it; other agents propose changes.

This page was refreshed by a Munder Difflin worker. Running this inside its own hive folder on 29 Sep 2026 (the grep hides unrelated files) printed:

```
$ ls -1p | grep -E '^(identity\.md|memory\.md|cursor\.json|inbox/|outbox/)$'
cursor.json
identity.md
inbox/
memory.md
outbox/
```

Three other details from the same tag:

- When an agent tries to finish with unread mail, `drainForStop` in `src/main/hive.ts` blocks it with a message that starts "You have N new hive message(s) in your inbox. Address them before finishing".
- `src/main/breaker.ts` watches cost, token velocity, repeated identical tool calls and file progress, and escalates one level per beat: steer, then constrain, then stop. `hardStop` is off by default, so without it the ladder never kills an agent.
- `src/shared/agentProvider.ts` lists twelve CLIs plus a custom slot: Claude Code, Codex, Gemini CLI, Antigravity, Grok, Kimi Code, Qwen, OpenCode, Crush, Pi, Copilot and Cursor. Each runs in its own terminal through `node-pty` (`src/main/pty.ts`), signed in the way that CLI already is.

Questions that need a human land on the ASK ME board rather than in a scrollback. What it does not do: it is a desktop app, not a library, so it will not help you ship an agent inside your own product.

## Which agent harnesses can you use today?

Here is how the main options line up, checked on 29 Sep 2026. Munder Difflin rows come from the v0.5.3 source; the rest from each vendor's own docs.

| Harness | Kind | What runs | Multi agent support | Source |
|---|---|---|---|---|
| Claude Code | Single agent harness, terminal CLI | Claude models | Subagents; agent teams are experimental and off by default | [Anthropic docs](https://code.claude.com/docs/en/agent-teams) |
| Munder Difflin | Multi-agent harness, desktop app, MIT | Twelve coding CLIs, each in its own terminal | Orchestrator, mailboxes, shared board, per agent memory, circuit breaker | v0.5.3 source, paths above |
| Claude Agent SDK | Single agent harness as a library, Python and TypeScript | Claude Code's loop in your own process | Subagents; no teammates in SDK sessions | [SDK overview](https://code.claude.com/docs/en/agent-sdk/overview), [agent teams](https://code.claude.com/docs/en/agent-teams) |
| Claude Code agent teams | Team inside one Claude Code session | Claude Code instances only | Lead plus teammates, shared task list, mailbox; one team per session, no nested teams | [Anthropic docs](https://code.claude.com/docs/en/agent-teams) |
| Microsoft Agent Framework Harness | Harness as a library, .NET and Python | Your chosen chat client | Optional background agents, experimental in Python | [Microsoft Learn](https://learn.microsoft.com/en-us/agent-framework/concepts/harness) |
| LangChain Deep Agents | Harness as a library, Python and JS, MIT | Many model providers | A `task` tool that spawns short lived subagents | [GitHub](https://github.com/langchain-ai/deepagents) |

{% img "note-2" %}

**Pick Claude Code** if one agent in one terminal does the job. **Pick Munder Difflin** if you run several CLIs at once, want them to message each other and remember across sessions, and would rather watch a floor than tail five terminals. **Pick agent teams** if every worker is Claude Code and the team only needs to last one session. **Pick the Agent SDK, Microsoft Agent Framework or Deep Agents** if you are building an agent into your own application.

## Do you need a multi-agent harness?

Only when coordinating your agents costs more time than they save you. The usual signs:

- you run **three or more** sessions and lose track of which one is doing what,
- you keep **explaining the same context** because every session starts from zero,
- two agents **collide** on the same files,
- you want work to **keep moving** while you are in a meeting, with the machine left on.

If none of that sounds familiar, one session is fine.

## Where to go next

- [Claude Code subagents vs a multi-agent harness](/blog/claude-code-subagents-vs-multi-agent-harness/), for where subagents stop.
- [What is harness engineering?](/blog/what-is-harness-engineering/), for the discipline behind building one.
- [How to manage multiple Claude Code sessions](/blog/manage-multiple-claude-code-sessions/) without losing track of them.
- [The best tools to run multiple Claude Code agents](/blog/best-claude-code-multi-agent-tools/), compared.

---

Munder Difflin is free and open source under the MIT license. [Download it](https://harnessmd.com/download) for macOS, Windows or Linux.
