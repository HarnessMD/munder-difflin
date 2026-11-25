---
title: "What is Superpowers? The skills library for coding agents"
description: "Superpowers (obra/superpowers) is an open source skills library that gives coding agents a set workflow. What is inside, how to install it, its limits."
date: 2026-11-24
category: concepts
categoryLabel: Concepts
type: Technical
primaryKeyword: "superpowers"
secondaryKeywords: ["what is superpowers", "obra superpowers", "superpowers claude code", "superpowers skills", "how to install superpowers"]
tags: ["Concepts", "Open Source", "Skills", "Claude Code"]
faq:
  - q: "Is Superpowers open source?"
    a: "Yes. The code is on GitHub at obra/superpowers under the MIT licence, per the GitHub API and the README, checked 24 Nov 2026."
  - q: "Which coding agents does Superpowers work with?"
    a: "The README gives install steps for 16 harnesses: Claude Code, Antigravity, Codex App, Codex CLI, Cursor, Devin CLI, Factory Droid, Gemini CLI, GitHub Copilot CLI, Grok Build CLI, Kimi Code, OpenCode, Pi, Qwen Code, Hermes Agent and Muse. It says to install Superpowers separately for each one you use."
  - q: "How do I install Superpowers in Claude Code?"
    a: "Per the README, run `/plugin install superpowers@claude-plugins-official` to install it from Anthropic's official marketplace. Or register the Superpowers marketplace with `/plugin marketplace add obra/superpowers-marketplace`, then run `/plugin install superpowers@superpowers-marketplace`."
  - q: "Does Superpowers send telemetry?"
    a: "Only through an optional feature. The README says the Prime Radiant logo on brainstorming's optional visual companion loads from Prime Radiant's website and includes the Superpowers version, not your project or prompt. Setting `SUPERPOWERS_DISABLE_TELEMETRY` to any true value turns it off."
  - q: "Who makes Superpowers?"
    a: "Jesse Vincent and the rest of the folks at Prime Radiant, per the README. He announced it on his blog on 9 Oct 2025, the day the GitHub repo was created."
---

Superpowers is "a complete software development methodology for your coding agents, built on top of a set of composable skills and some initial instructions that make sure your agent uses them", per its [README](https://github.com/obra/superpowers). It is open source under the MIT licence, at obra/superpowers on GitHub. Checked on 24 Nov 2026.

The README says "It's not uncommon for your agent to work autonomously for a couple hours at a time". We think runs that long make usage limits worth planning for; see [How to Get the Most Out of Your Claude Code Max Plan](/blog/claude-code-max-plan-tips/).

If you run AI agents, [Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. Its agents run on engines such as Claude Code, Codex and Gemini CLI. The [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup.

## What is Superpowers?

Superpowers is a set of skills plus starting instructions that make a coding agent use them. Per the README, "because the skills trigger automatically, you don't need to do anything special. Your coding agent just has Superpowers."

In Claude Code it installs as a plugin. Anthropic's [plugin docs](https://code.claude.com/docs/en/plugins/overview) define a plugin as "a directory of skills, agents, hooks, MCP servers, or other components that Claude Code installs and loads as one unit". A skill, per the [skills docs](https://code.claude.com/docs/en/skills), is a `SKILL.md` file with instructions, and "Claude uses skills when relevant".

## What is inside Superpowers?

The README groups 15 skills under four headings: Testing, Debugging, Collaboration and Meta. On 24 Nov 2026 the repo's [`skills` folder](https://github.com/obra/superpowers/tree/main/skills) held the same 15 folders.

| Group | Skills |
| --- | --- |
| Testing | `test-driven-development` |
| Debugging | `systematic-debugging`, `verification-before-completion`, `diagnosing-superpowers` |
| Collaboration | `brainstorming`, `writing-plans`, `executing-plans`, `dispatching-parallel-agents`, `requesting-code-review`, `receiving-code-review`, `using-git-worktrees`, `finishing-a-development-branch`, `subagent-driven-development` |
| Meta | `writing-skills`, `using-superpowers` |

In the README's own words, brainstorming is "Drawing out intent before building", test driven development is the "RED-GREEN-REFACTOR cycle", systematic debugging is a "4-phase root cause process", and writing skills lets you "Create new skills following best practices".

<figure class="mg" data-scene="toolchest"><img src="/blog/assets/media/what-is-superpowers/toolchest.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a yellow toolchest has four blue drawers labelled Testing, Debugging, Collaboration and Meta. One by one each drawer slides open and a soft white card rises from it, reading test driven development, systematic debugging, brainstorming and writing skills. A lilac tag on the lid reads 15 skills. Tap a drawer to open or close it."><figcaption>The README groups 15 skills under Testing, Debugging, Collaboration and Meta. Read 24 Nov 2026.</figcaption></figure>

## How do you install Superpowers?

You install it once for each agent you use. "Installation differs by harness", the README says, and "If you use more than one, install Superpowers separately for each one." It gives steps for 16 harnesses.

<figure class="mg" data-scene="cape"><img src="/blog/assets/media/what-is-superpowers/cape.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, three soft white hangers on a blue rail are labelled Claude Code, Codex CLI and Gemini CLI. A yellow cape floats down onto each hanger in turn, one at a time. A sky tag on the rail reads install Superpowers separately for each one. Tap a hanger to drop its cape again."><figcaption>The README says to install Superpowers separately for each harness you use. Read 24 Nov 2026.</figcaption></figure>

In Claude Code, install from Anthropic's official marketplace:

```bash
/plugin install superpowers@claude-plugins-official
```

Or register the Superpowers marketplace, then install from it:

```bash
/plugin marketplace add obra/superpowers-marketplace
/plugin install superpowers@superpowers-marketplace
```

For the other harnesses, the README gives these steps, with commands word for word:

| Harness | Install, per the README |
| --- | --- |
| Antigravity | `agy plugin install https://github.com/obra/superpowers` |
| Codex App | Click on Plugins in the sidebar, then the `+` next to Superpowers |
| Codex CLI | `/plugins`, search `superpowers`, select `Install Plugin` |
| Cursor | `/add-plugin superpowers` in Cursor Agent chat |
| Devin CLI | `devin plugins install obra/superpowers` |
| Factory Droid | `droid plugin marketplace add https://github.com/obra/superpowers`, then `droid plugin install superpowers@superpowers` |
| Gemini CLI | `gemini extensions install https://github.com/obra/superpowers` |
| GitHub Copilot CLI | `copilot plugin marketplace add obra/superpowers-marketplace`, then `copilot plugin install superpowers@superpowers-marketplace` |
| Grok Build CLI | `grok plugin install superpowers@xai-official --trust` |
| Kimi Code | `/plugins install https://github.com/obra/superpowers` |
| OpenCode | Tell it: `Fetch and follow instructions from https://raw.githubusercontent.com/obra/superpowers/refs/heads/main/.opencode/INSTALL.md` |
| Pi | `pi install git:github.com/obra/superpowers` |
| Qwen Code | `qwen extensions install obra/superpowers`, and pick `superpowers` when prompted |
| Hermes Agent | `hermes plugins install obra/superpowers --enable` |
| Muse | From a local checkout: `muse plugins install ./`, then `muse plugins approve superpowers` |

## How does Superpowers work in a session?

It makes the agent ask before it codes: per the README, it "steps back and asks you what you're really trying to do." The basic workflow has seven steps, each a skill:

1. **Brainstorming** (`brainstorming`): questions about what you want, then a design you approve.
2. **Worktree** (`using-git-worktrees`): an isolated workspace on a new branch, with a "clean test baseline".
3. **Plan** (`writing-plans`): "bite-sized tasks (2-5 minutes each)", each with "exact file paths, complete code, verification steps".
4. **Subagents** (`subagent-driven-development` or `executing-plans`): "a fresh subagent per task with a review after each", or every task inline with one review of the whole branch at the end.
5. **Tests** (`test-driven-development`): "RED-GREEN-REFACTOR", and it "Deletes code written before tests."
6. **Review** (`requesting-code-review`): between tasks; "Critical issues block progress."
7. **Finish** (`finishing-a-development-branch`): verifies tests, then offers merge, PR, keep or discard.

The README adds: "The agent checks for relevant skills before any task." It calls these "Mandatory workflows, not suggestions."

<figure class="mg" data-scene="trafficlight"><img src="/blog/assets/media/what-is-superpowers/trafficlight.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a tall blue traffic light has seven round lamps labelled brainstorming, worktree, plan, subagents, tests, review and finish. Each lamp glows mint in turn from top to bottom while the others stay soft white, and a yellow arrow beside the pole points at the lit lamp. Tap the light to step to the next lamp."><figcaption>The README's basic workflow runs in seven steps, from brainstorming to finish. Read 24 Nov 2026.</figcaption></figure>

## Who makes Superpowers, and under what licence?

Jesse Vincent and Prime Radiant make it, under the MIT licence. The README says Superpowers "is built by Jesse Vincent and the rest of the folks at Prime Radiant". At 16:24 UTC on 24 Nov 2026 the GitHub API showed [obra/superpowers](https://github.com/obra/superpowers) created on 9 Oct 2025, with 325,716 stars and [v7.0.2](https://github.com/obra/superpowers/releases/tag/v7.0.2), released 3 Nov 2026, as its latest release.

Vincent's [release post](https://blog.fsck.com/2025/10/09/superpowers/) of 9 Oct 2025 says: "Anthropic released Claude's new plugins system this morning and it seemed like the right impetus to ship."

## What should you watch for with Superpowers?

The README names these limits:

* **Updates vary.** "Superpowers updates are somewhat coding-agent dependent, but are often automatic."
* **Restarts.** Restart active Hermes and Muse sessions after installing. On Hermes, "a very long session that compacts over its first turn loses the bootstrap", so start a fresh session if skills stop triggering.
* **Sessions can misbehave.** A skill can fire "when it shouldn't", or the agent can burn "more tokens than you'd expect". Ask your agent to "figure out what went wrong with superpowers in this session" and it runs `diagnosing-superpowers`.
* **Optional telemetry.** The Prime Radiant logo in brainstorming's optional visual companion loads from Prime Radiant's website and includes the Superpowers version. Set `SUPERPOWERS_DISABLE_TELEMETRY` to any true value to stop it.
* **Skill contributions.** The README says "we don't generally accept contributions of new skills", and any skill update "must work across all of the coding agents we support".

## How does Superpowers relate to our pages?

Our pages on skills and agents: [Claude Code Skills: What They Are, Where They Live and How to Write One](/blog/claude-code-skills/), [What Are Claude Code Agents? And How to Use Many at Once](/blog/what-are-claude-code-agents/) and [Claude Code Best Practices: 9 Habits From Anthropic's Docs](/blog/claude-code-best-practices/). For design work, [UI UX Pro Max](/blog/what-is-ui-ux-pro-max-skill/) (nextlevelbuilder/ui-ux-pro-max-skill) is a design skill for coding agents.

Our view: the brainstorming and plan steps are worth copying even without the plugin, since a written plan leaves any agent less room to drift.

## Superpowers at a glance

Checked on 24 Nov 2026.

| Item | Detail |
| --- | --- |
| What it is | A skills library and workflow for coding agents |
| Made by | Jesse Vincent and Prime Radiant |
| Code | obra/superpowers on GitHub, created 9 Oct 2025 |
| Licence | MIT |
| Latest release | v7.0.2, 3 Nov 2026 |
| Stars | 325,716 at 16:24 UTC on 24 Nov 2026 |
| Skills | 15, in four groups |
| Install steps for | 16 harnesses, from Claude Code to Muse |
| Telemetry | Optional; off with `SUPERPOWERS_DISABLE_TELEMETRY` |

<link rel="stylesheet" href="/blog/assets/media/what-is-superpowers/motion.css"><script defer src="/blog/assets/media/what-is-superpowers/motion.js"></script>
