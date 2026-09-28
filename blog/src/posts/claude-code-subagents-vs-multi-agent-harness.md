---
title: "Claude Code Subagents: How to Create and Use Them (vs Agent Teams)"
description: "Claude Code subagents in 2026: the .claude/agents file, built-in Explore and Plan, models, nesting, and when agent teams or a harness fit better."
date: 2026-05-23
updated: 2026-09-29
category: guides
categoryLabel: Guides
type: Technical
primaryKeyword: "claude code subagents"
secondaryKeywords: ["how to create claude code subagents", "claude code subagents vs agent teams", "claude code subagents model", "can claude code subagents spawn subagents", "multi-agent harness"]
tags: ["Guides", "Subagents", "Multi-Agent", "Claude Code"]
author:
  name: Chaitanya Giri
  initials: CG
faq:
  - q: "What are Claude Code subagents?"
    a: "A subagent is a separate Claude worker that takes one task in its own context window and returns only a summary to your main conversation. You define custom ones as Markdown files in .claude/agents/ or ~/.claude/agents/, and Claude Code also ships built-ins such as Explore, Plan and general-purpose."
  - q: "Can Claude Code subagents spawn subagents?"
    a: "Yes. By default a subagent can spawn its own, up to three layers below the main conversation (default since Claude Code 2.1.219, 24 July 2026). Set CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH to change the limit, or to 1 to turn nesting off."
  - q: "How do I choose the model a subagent uses?"
    a: "Set model in its front matter to sonnet, opus, haiku, fable, a full model ID or inherit. Claude can also pass a model when it spawns the subagent, and that wins over the front matter. Run /tasks while it runs to see the model on its row."
  - q: "What is the difference between subagents and agent teams?"
    a: "Subagents work inside one session and report back to whoever spawned them. Agent teams, still experimental and switched on with CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1, run several full Claude Code sessions with a shared task list and a mailbox so teammates message each other directly."
  - q: "Where did the /agents wizard go?"
    a: "Claude Code 2.1.198 removed it. Typing /agents now only points you to the alternatives: ask Claude to write the subagent file, or create it yourself in .claude/agents/. The file format and folders did not change."
---

A Claude Code subagent is a separate Claude worker that takes one task in its own context window and returns only a summary. You define one as a Markdown file in `.claude/agents/`, and Claude delegates to it when a task matches its `description`. Everything below was checked against Claude Code 2.1.284 on 29 Sep 2026.

You can do all of this by hand with the files below, or use [Munder Difflin](https://harnessmd.com/download), free and open source, when what you need is several long running agents rather than helpers inside one session. The second half of this post shows where that line falls; the [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup.

## How do you create a Claude Code subagent?

You save a Markdown file with YAML front matter in `.claude/agents/` for one project, or in `~/.claude/agents/` for every project on your machine. Only `name` and `description` are required, and the body under the front matter becomes the subagent's system prompt. This one runs tests on Haiku and has no Edit or Write tool:

```markdown
---
name: test-runner
description: Runs the test suite and reports only failing tests with their error messages. Use proactively after code changes.
tools: Read, Grep, Glob, Bash
model: haiku
maxTurns: 20
---

Run the project's test command. For each failing test, report the file,
the assertion that failed and the first lines of the error. Do not try to fix anything.
```

Every field in that file is on the [official front matter list](https://code.claude.com/docs/en/sub-agents). The rest of the list: `disallowedTools`, `permissionMode`, `skills` (preloaded into context), `mcpServers`, `hooks`, `memory`, `background`, `effort`, `isolation: worktree`, `color`, `initialPrompt`, `omitClaudeMd` (new in 2.1.271) and an `experimental` map for `cacheTtl`. Names are camelCase; an unknown field is silently ignored.

Claude Code watches both folders and picks up a new or edited file within a few seconds. If the `agents` folder did not exist when the session started, restart once. A file with no `name` is treated as documentation, and one with a `name` but no `description` is skipped; neither shows a message in the session, though `claude --debug` logs the second.

Definitions can also come from managed settings, the `--agents` JSON flag or a plugin; managed wins, then `--agents`, then project, user and plugin.

## What happened to the /agents command?

It no longer opens a wizard. Claude Code 2.1.198 (1 July 2026) removed the interactive creator, so typing `/agents` only tells you to ask Claude or edit `.claude/agents/` yourself. The fastest route now is a sentence:

```text
Create a test-runner subagent in .claude/agents/ that runs our tests and
reports only failures. No Edit or Write tools, and use Haiku.
```

Then check the front matter. Do not confuse this with the `claude agents` CLI command. On 2.1.284, `claude agents --help` describes it as "Manage background agents": it lists background sessions, not subagent definitions.

{% img "note-1" %}

## Which built-in subagents does Claude Code have?

Three do most of the work: Explore, Plan and general-purpose. Explore is a read-only searcher that Claude calls with a thoroughness level of quick, medium or very thorough. Plan is the read-only researcher Claude uses in plan mode. General-purpose gets every tool available to subagents and handles tasks that need both reading and editing.

Two details changed this year. Since 2.1.198, Explore inherits your session's model (capped at Opus on the Claude API) instead of always running on Haiku; define your own subagent named `Explore` with `model: haiku` if you want the cheap version back. Explore and Plan also skip your `CLAUDE.md` files and the git status snapshot to stay fast.

## How does Claude decide when to use a subagent?

It reads the `description` field. When your request matches a description, Claude hands off the task with a delegation prompt it writes itself. Put "use proactively" in the description if you want it to delegate without being asked.

You can also force it: name the subagent in plain words, @-mention it with `@agent-test-runner`, or run a whole session as that agent with `claude --agent test-runner`. The subagent starts fresh: it sees its own prompt, your `CLAUDE.md` files and the delegation message, not your conversation history.

## How do you set a subagent's model and tools?

Use `model` and `tools` in the front matter. The model is resolved in this order: a model Claude passes when it spawns the subagent, then the `model` field, then the `CLAUDE_CODE_SUBAGENT_MODEL` variable, then your session's model. Since 2.1.251 that variable is only a default. To force one model on every subagent, also set `CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1` (2.1.257 and later). Run `/tasks` to see which model each subagent is on.

`tools` is an allowlist and `disallowedTools` a denylist. A `disallowedTools` entry such as `Bash(git push *)` removes the whole Bash tool, so block single commands with a deny rule in settings instead. The Task tool was renamed Agent in 2.1.63, and old `Task(...)` rules still work.

## Do Claude Code subagents run in the background?

Yes, by default in an interactive session. Background became the default in 2.1.198, so the subagents Claude spawns run while you keep typing. Since 2.1.232 (13 Aug 2026) fork mode is on, so Claude can no longer ask for the foreground. A background subagent gets a smaller built-in tool set, and its permission prompts appear in your main session with its name on them. `/subtask` starts a fork, which is a subagent that inherits your whole conversation. Up to 20 subagents can run at once; `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` changes that.

## Can Claude Code subagents spawn subagents?

Yes, up to three layers below your main conversation. That default arrived in 2.1.219 (24 July 2026), after two releases where nesting was off. Set `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` to change the depth, or leave `Agent` out of a subagent's `tools` to stop that one from delegating. From 2.1.172 to 2.1.216 the limit was a fixed five layers; 2.1.217 and 2.1.218 turned nesting off.

## Can Claude Code subagents talk to each other?

Named ones can (since 2.1.206). When Claude gives a subagent a name, other agents in the session can reach it with the `SendMessage` tool, which also resumes a finished subagent with its full history. Subagents can keep notes between sessions too: `memory: project` gives one a folder at `.claude/agent-memory/<name>/`. For how this compares with separate sessions, see [can Claude Code agents talk to each other](/blog/can-claude-code-agents-talk-to-each-other/).

### What changed for subagents in the last six months

| Version (date) | Change |
|---|---|
| 2.1.198 (1 Jul 2026) | `/agents` wizard removed; Explore inherits the session model; subagents run in the background by default |
| 2.1.217 (21 Jul 2026) | Cap of 20 running subagents |
| 2.1.219 (24 Jul 2026) | Nesting up to depth 3 by default |
| 2.1.232 (13 Aug 2026) | Fork mode on by default; spawns run in the background |
| 2.1.251 (28 Aug 2026) | `CLAUDE_CODE_SUBAGENT_MODEL` becomes a default, not an override |
| 2.1.271 (14 Sep 2026) | `omitClaudeMd` front matter field |

Source: the [Claude Code changelog](https://code.claude.com/docs/en/changelog), read on 29 Sep 2026.

## Claude Code subagents vs agent teams: what is the difference?

Subagents work inside one session and report to whoever spawned them, while agent teams run several full Claude Code sessions that coordinate with each other. [Agent teams](https://code.claude.com/docs/en/agent-teams) are experimental and off until you set `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`. The main session becomes the lead, teammates share a task list and message each other through mailbox files under `~/.claude/teams/`, and you can talk to any teammate directly.

The documented limits: one team per session, no nested teams, a fixed lead, and `/resume` does not bring back in-process teammates. Every teammate is a separate Claude instance, so teams cost more tokens. With teams on, a subagent Claude names launches as a teammate, so a team can form unasked.

{% img "note-2" %}

## When do you need a multi agent harness instead?

When the agents should outlive a session. Subagents and agent teams both hang off one lead session: close it and the team goes with it, and a subagent comes back only if you resume that same session. A [multi agent harness](/blog/what-is-a-multi-agent-harness/) runs each agent as its own long lived session and coordinates them from outside.

Munder Difflin is one, and as of v0.5.3 (the ref we read for this) it works like this:

- Each agent is a full CLI session, and it does not have to be Claude Code: `AGENT_PROVIDER_PRESETS` in `src/shared/agentProvider.ts` lists Claude Code, Codex, Gemini CLI, Antigravity, Grok, Kimi Code, Qwen, OpenCode, Crush, Pi, Copilot and Cursor.
- Each agent gets a workspace folder with `identity.md`, `memory.md`, `inbox/` and `outbox/` that survives restarts, and a router in the main process moves outbox messages into the right inboxes (`src/main/hive.ts`).
- Michael, the orchestrator, keeps the shared plan in `board.md` and the kanban in `tasks.json`. That only Michael edits `board.md` is a rule in the agents' instructions, not something the code enforces.
- If you turn on orchestrator spawning (off by default, `orchestratorMaySpawn` in `src/main/config.ts`), Michael can start workers, each on its own git worktree unless the request says otherwise (`src/main/index.ts`).

What it does not do: it is a desktop app, not a flag you add to a script, and a floor of full sessions spends more tokens than one session with a few subagents. Each agent still uses Claude Code's own subagents as usual. The two sit at different levels, like the person who files the paperwork and the office that decides what gets filed.

## Which should you pick?

**Pick subagents if** one task has side work (searching, running tests, reading logs) that would flood your main context, and you only need the answer back.

**Pick agent teams if** a few Claude Code sessions need to argue about one problem for an afternoon, and you are fine with an experimental feature that lives and dies with the lead session.

**Pick a harness if** you run agents across days or several CLIs and want their notes, messages and status in one place. The next read is [how to run multiple Claude Code agents](/blog/how-to-run-multiple-claude-code-agents/).
