---
title: "Claude Code Plan Mode: Shortcut, Exit and Default (Oct 2026)"
seoTitle: "Claude Code Plan Mode: Shift+Tab, Exit and Default Setting (Oct 2026)"
description: "Press Shift+Tab until the status bar says plan mode on. How to enter, exit and default to Claude Code plan mode, what it blocks, checked 27 Oct 2026."
date: 2026-09-11
updated: 2026-10-27
category: guides
categoryLabel: Guides
type: Technical
primaryKeyword: "claude code planning mode"
secondaryKeywords: ["claude plan mode", "claude code plan mode shortcut", "how to exit plan mode in claude code", "claude code plan mode vs auto mode", "claude code plan mode vs accept edits", "opusplan"]
tags: ["Guides", "Claude Code", "Getting Started", "Human-in-the-Loop"]
faq:
  - q: "What is Claude Code plan mode?"
    a: "It is one of Claude Code's permission modes. Claude reads files and runs shell commands to explore, then writes a plan, but does not edit your source until you approve that plan."
  - q: "What is the shortcut for plan mode in Claude Code?"
    a: "Shift+Tab cycles permission modes. A new terminal session with no mode set starts in auto mode, and from there plan mode is three presses away. On Windows terminals where Shift+Tab does not register, Alt+M does the same job. You can also prefix a prompt with /plan, or start with claude --permission-mode plan."
  - q: "How do you exit plan mode in Claude Code?"
    a: "Approve the plan, or press Shift+Tab to leave without approving anything. The approval prompt offers Yes, and use auto mode, Yes, manually approve edits, and No, keep planning. Approving switches the session to the mode you picked and Claude starts editing."
  - q: "Can Claude run shell commands in plan mode?"
    a: "Yes. Plan mode blocks edits to your source, not exploration. Read only commands run, and other shell commands either go to the auto mode classifier (when auto mode is available and useAutoModeDuringPlan is on, the default) or ask you first."
  - q: "Which model does Claude Code use in plan mode?"
    a: "The session's model, unless you pick the opusplan alias, which runs Opus while you plan and Sonnet once you approve. A Haiku session also moves up to Sonnet for planning."
  - q: "Which Claude Code version made auto mode the starting mode?"
    a: "The sources differ by one release. The permission modes docs, read 27 Oct 2026, say v2.1.283 or later. The changelog lists 2.1.283 for third party providers and sessions with telemetry off, and 2.1.284 for every plan and provider."
---

Claude Code plan mode is the permission mode where Claude reads your code, runs exploratory commands and writes a plan, but cannot edit your source until you approve it. Press Shift+Tab until the status bar shows `⏸ plan mode on`, type `/plan`, or start with `claude --permission-mode plan`.

[Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. Its Claude Code agents can plan first too; the last section shows how. Everything below was checked against Anthropic's [permission modes docs](https://code.claude.com/docs/en/permission-modes) and changelog on 27 Oct 2026.

## What is the Claude Code plan mode shortcut?

Shift+Tab is the shortcut, and plan mode sits three presses away from where a new session starts. A terminal or VS Code session with no permission mode set starts in auto mode, or in Manual if auto mode isn't available. From auto, the first press goes to Manual, the second to accept edits and the third to plan. On Windows terminals that don't send Shift+Tab, use Alt+M (interactive mode docs, read 27 Oct 2026).

Which version made auto the starting mode? The docs say "With Claude Code v2.1.283 or later, auto mode is the built-in starting permission mode for interactive terminal and VS Code sessions." The [changelog](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md) lists that change for third party providers and telemetry off sessions in 2.1.283, and for every plan and provider in 2.1.284.

| Way in or out (checked 27 Oct 2026) | What it does |
| :-- | :-- |
| `Shift+Tab` (Alt+M on some Windows terminals) | Cycles auto, Manual, accept edits, plan, then any optional modes |
| `/plan fix the auth bug` | Plans that one prompt |
| `claude --permission-mode plan` | Starts the session in plan mode |
| `"defaultMode": "plan"` under `permissions` in `.claude/settings.json` | Every terminal session in that project starts in plan mode |
| `claudeCode.initialPermissionMode: "plan"` | Same for the VS Code extension, which ignores project settings here |
| Approve the plan | Leaves plan mode and switches to the mode you picked |

## How do you make plan mode the default?

Put it in the project's settings file. Terminal sessions started in that folder then open in plan mode:

```json
{
  "permissions": {
    "defaultMode": "plan"
  }
}
```

Save that as `.claude/settings.json` in the repo. It also works from `~/.claude/settings.json` for every project on the machine. The docs add one catch: project settings honour every starting mode except `auto` and `bypassPermissions`, so `plan` is fine there.

## What can Claude do in plan mode?

Claude can read, search and run shell commands to explore, but it cannot edit your source. Plan mode does not ban Bash. The docs say Claude "reads files, runs shell commands to explore, and writes a plan, but does not edit your source". What happens to a given command depends on the session, and the first case that matches applies:

* **Interactive terminal session with bypass permissions available**: neither the classifier nor a prompt applies, and edits are not blocked until approval. More on that below.
* **Auto mode available and `useAutoModeDuringPlan` on** (the default): a classifier reviews each shell command except critical path removals instead of prompting you. Approved ones run, rejected ones are blocked.
* **Auto mode unavailable, or that setting off**: anything outside the built in read only command set asks you first.

The one file plan mode does write is the plan itself, by default under `~/.claude/plans/`. Set `plansDirectory` to a path inside the project, such as `./plans`, if you want a teammate to read the plan before anyone approves it, the approach in [approving AI agents without a queue](/blog/human-in-the-loop-approving-ai-agents/).

{% img "note-1" %}

## How do you exit plan mode in Claude Code?

Approve the plan, or press Shift+Tab to leave without approving it. When the plan is ready, Claude Code asks how to proceed:

* **Yes, and use auto mode**: approve and continue in auto mode. It reads **Yes, auto-accept edits** when auto mode isn't available, and offers bypass permissions instead if you started the session with them.
* **Yes, manually approve edits**: approve, then review each edit.
* **No, keep planning**: stay in plan mode and say what to change.

Press Ctrl+G at that prompt to open the plan in your own editor and change it before Claude starts. If you want a fresh context for the build, set `showClearContextOnPlanAccept` to `true` and the list gains a first option that approves and clears the planning context.

{% img "note-2" %}

## Which model does Claude Code use for planning?

Your session's model, unless you choose `opusplan`. That alias runs Opus while you plan and switches to Sonnet once you approve, set with `/model opusplan` or `--model opusplan` ([Model configuration](https://code.claude.com/docs/en/model-config), read 27 Oct 2026). A Haiku session moves up to Sonnet for planning. The [Max plan tips](/blog/claude-code-max-plan-tips/) cover when Opus planning is worth the usage.

## Plan mode vs auto mode vs accept edits: which should you use?

Use them in order. Plan mode decides what to change, accept edits approves file writes, and auto mode has a classifier review actions instead of you. When you don't yet know what you want, Anthropic's [best practices page](https://code.claude.com/docs/en/best-practices) suggests asking Claude to interview you until it could write a spec, then building from that spec in a fresh session.

* **Pick plan mode if** the change touches several files, the code is new to you, or you want to redirect Claude before anything is written.
* **Pick accept edits if** you already know the change and will read `git diff` afterwards.
* **Pick auto mode if** it's a long task you've already planned and you'd rather not click through prompts.

If one risky command is the real worry, a [PreToolUse hook](/blog/claude-code-hooks-explained/) blocks just that call, and [why Claude Code keeps asking for permission](/blog/why-does-claude-code-keep-asking-for-permission/) explains the prompts you'll see in Manual mode. New to the tool? Start with [how to use Claude Code](/blog/how-to-use-claude-code/).

## What changed in plan mode recently?

The names and defaults moved, per the changelog read 27 Oct 2026:

| Version | Change |
| :-- | :-- |
| 2.1.200 | `default` mode renamed Manual; `manual` accepted as an alias |
| 2.1.218 | Classifier, not a prompt, judges commands it can't prove read only |
| 2.1.222 | Ultraplan removed |
| 2.1.283 | Auto start on third party providers and telemetry off sessions |
| 2.1.284 | Auto start on every plan and provider |

## Does plan mode work with Munder Difflin?

Yes, once you stop Munder Difflin from skipping permissions for that agent. In the app source on main, read 27 Oct 2026, Auto Mode is on by default (`autoMode: true` in `src/main/config.ts`), and with it on, Claude Code agents launch with `--permission-mode bypassPermissions` (`src/shared/agentProvider.ts`). Each agent is an interactive `claude` in its own terminal, which is exactly the case where Claude Code doesn't enforce plan mode's blocks.

Two ways around it. In the Add Agent dialog the command field is editable, so replace the prefilled flag with `--permission-mode plan` for the agents you want planning first. Or switch Auto Mode off in Settings, start the agent again, and cycle into plan mode with Shift+Tab in its terminal. Approval happens in Claude Code's own prompt, inside the agent's terminal. For running several sessions at once, see [managing multiple Claude Code sessions](/blog/manage-multiple-claude-code-sessions/).
