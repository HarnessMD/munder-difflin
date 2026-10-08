---
title: "Claude Code agent teams: what they are, how to use them"
description: "Claude Code agent teams, checked 8 Oct 2026: what they are, the experimental setting that turns them on, how they differ from subagents, token cost and limits."
date: 2026-10-08
category: concepts
categoryLabel: Concepts
type: Technical
primaryKeyword: "claude code agent teams"
secondaryKeywords: ["claude agent teams", "claude code teams", "how to use agent teams claude code", "claude code agent teams vs subagents", "claude code multi agent"]
tags: ["Concepts", "Claude Code", "AI Agents"]
faq:
  - q: "What are Claude Code agent teams?"
    a: "They are several Claude Code instances working together. Anthropic's docs say one session acts as the team lead, coordinating work, assigning tasks and synthesizing results, while teammates work independently, each in its own context window, and communicate directly with each other."
  - q: "Are Claude Code agent teams generally available?"
    a: "No. On 8 Oct 2026 Anthropic's docs said agent teams are experimental and disabled by default. You enable them by setting CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS to 1 in your shell environment or through settings.json."
  - q: "What is the difference between agent teams and subagents?"
    a: "Per the docs, subagents return a result to the caller and the main agent manages all work. Teammates message each other directly and coordinate themselves through messages, plus a shared task list for agents that have the Task tools. The docs rate token cost lower for subagents and higher for teams."
  - q: "Do agent teams use more tokens?"
    a: "Yes. The docs say agent teams use significantly more tokens than a single session, and that token usage scales with the number of active teammates. The costs page says approximately 7x more tokens than standard sessions when teammates run in plan mode."
  - q: "How many teammates should an agent team have?"
    a: "The docs say there is no hard limit on the number of teammates, but practical constraints apply, and suggest starting with 3 to 5 teammates for most workflows. They add that three focused teammates often outperform five scattered ones."
---

Claude Code agent teams let one lead session run several teammate sessions that share a task list and message each other. The feature is experimental and disabled by default. Our view: try it for research and review, and keep one session for routine work. Checked 8 Oct 2026.

Our sources are Anthropic's [agent teams docs](https://code.claude.com/docs/en/agent-teams) and [costs page](https://code.claude.com/docs/en/costs), plus the Claude Code [GitHub releases](https://github.com/anthropics/claude-code/releases), all read on 8 Oct 2026. New here? See [how to use Claude Code](/blog/how-to-use-claude-code/) or the [concepts hub](/blog/topics/concepts/).

[Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of coding agents such as Claude Code, Codex and Gemini CLI on your own computer. It is not part of agent teams. The [install guide](/blog/how-to-install-and-use-munder-difflin/) covers it.

## What are Claude Code agent teams?

Agent teams are several Claude Code instances working together, with one session acting as the team lead. The docs say the lead coordinates work, assigns tasks and synthesizes results, while teammates "work independently, each in its own context window, and communicate directly with each other".

A new teammate loads the same project context as a regular session (`CLAUDE.md`, MCP servers and skills) and receives the lead's spawn prompt. The lead's conversation history does not carry over.

<figure class="mg" data-scene="oars"><img src="/blog/assets/media/claude-code-agent-teams/oars.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A long rowing boat seen from above. A steering oar at the stern, labelled lead, turns first. Then the side oars, each labelled teammate, start pulling at their own pace while small notes slide along the hull from one oar to the next."><figcaption>One lead session, several teammates, each with its own context window. Anthropic's agent teams docs, read 8 Oct 2026.</figcaption></figure>

## Are agent teams experimental, and how do you turn them on?

Yes. On 8 Oct 2026 the warning at the top of the docs page said agent teams are "experimental and disabled by default". You enable them by setting `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` to `1`, in your shell environment or through `settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

The same page adds two qualifiers. Enabling teams changes ordinary delegation: while they are enabled, a subagent that Claude names launches as a teammate, "so teams can form even when you didn't ask for one". And spawning teammates requires an interactive session. In non-interactive mode with the `-p` flag, including Agent SDK sessions, Claude doesn't spawn teammates.

## How are agent teams different from subagents?

Subagents report results back to the main agent, while teammates share a task list, claim work and message each other directly. This table is from Anthropic's agent teams docs, as it read on 8 Oct 2026:

| | Subagents | Agent teams |
| :-- | :-- | :-- |
| Context | Own context window; results return to the caller | Own context window; fully independent |
| Communication | Return a result to the caller. Subagents that Claude named when it spawned them can also message each other | Teammates message each other directly |
| Coordination | Main agent manages all work | Self-coordination through messages, plus a shared task list for agents that have the Task tools |
| Best for | Focused tasks where only the result matters | Complex work requiring discussion and collaboration |
| Token cost | Lower: results summarized back to main context | Higher: each teammate is a separate Claude instance |

The docs' rule: use subagents "when you need quick, focused workers that report back", and agent teams "when teammates need to share findings, challenge each other, and coordinate on their own". See also [subagents vs a multi-agent harness](/blog/claude-code-subagents-vs-multi-agent-harness/).

<figure class="mg" data-scene="switchboard"><img src="/blog/assets/media/claude-code-agent-teams/switchboard.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. Two old telephone switchboards side by side. On the left board, labelled subagents, every cable runs up to one plug labelled main agent. On the right board, labelled agent teams, cables also hop between the four lower plugs, lighting up one pair after another."><figcaption>Subagents return a result to the caller. Teammates message each other directly. From the docs' comparison table, read 8 Oct 2026.</figcaption></figure>

## How do you start an agent team?

You ask for one in plain language once the feature is enabled. The steps, from the docs:

1. Set `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` to `1` and open an interactive session.
2. Describe the task and the teammates you want. The docs' example asks for three teammates: one on UX, one on technical architecture, one playing devil's advocate.
3. Check the agent panel below the prompt input. Subagents appear in the same panel, so the panel alone doesn't confirm a team formed. If Claude spawned subagents, ask again and explicitly request an agent team.
4. Select a teammate with the up and down arrows and press Enter to message it.
5. To end a teammate, name it: "Ask the researcher teammate to shut down".

The docs say tasks have three states (pending, in progress and completed), and that the lead can assign a task or a teammate can self-claim the next unassigned, unblocked one.

<figure class="mg" data-scene="tickets"><img src="/blog/assets/media/claude-code-agent-teams/tickets.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A kitchen pass with a rail of paper order tickets. Each ticket slides along the rail from a section marked pending to in progress to completed, and a new ticket, task 3, only moves once task 2, the one it depends on, has reached completed."><figcaption>Tasks have three states: pending, in progress and completed. Anthropic's agent teams docs, read 8 Oct 2026.</figcaption></figure>

## What do agent teams cost in tokens?

More than one session: the docs say agent teams "use significantly more tokens than a single session". Anthropic's costs page said on 8 Oct 2026 that token usage "scales with the number of active teammates and how long each one runs", and is "roughly proportional to team size".

It gives one number for teams: agent teams use "approximately 7x more tokens than standard sessions when teammates run in plan mode". That is Anthropic's own figure. Neither page puts a dollar price on a team. For plan prices, see [how much Claude Code costs](/blog/how-much-does-claude-code-cost/).

The costs page's advice: use Sonnet for teammates, keep teams small, and shut teammates down when their work is done. Each active teammate keeps consuming tokens until it exits or the session ends.

<figure class="mg" data-scene="meters"><img src="/blog/assets/media/claude-code-agent-teams/meters.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A wall of round utility meters on one pipe. One meter labelled lead ticks slowly on its own. As more meters labelled teammate are bolted on beside it, each needle starts spinning independently and a shared bar labelled total tokens below fills faster."><figcaption>Token usage scales with the number of active teammates and how long each one runs. Anthropic's costs page, read 8 Oct 2026.</figcaption></figure>

## What are the documented limits and known issues?

The docs list nine current limitations. These five are our selection:

* **No session resumption with in-process teammates.** `/resume` and `/rewind` do not restore them.
* **Task status can lag.** Teammates sometimes fail to mark tasks as completed, which blocks dependent tasks.
* **One team per session.** You can't create additional named teams or share a team across sessions.
* **No nested teams.** Teammates cannot spawn their own teammates.
* **Split panes require tmux or iTerm2.** The default in-process mode works in any terminal.

Fixes are still landing. The GitHub release notes for v2.1.251 (28 Aug 2026) fixed a teammate's final answer not reaching the team lead, and v2.1.288 (2 Oct 2026) fixed a plugin-defined agent spawned by name running with the defaults instead of its own prompt.

## When is a team worth it, and when is one session enough?

Our view: a team is worth it when the work splits into independent pieces that gain from discussion, and one session is enough for the rest. The docs name research and review, new modules or features, debugging with competing hypotheses and cross-layer coordination as the strongest use cases. For sequential tasks, same-file edits or work with many dependencies, they say a single session or subagents are more effective.

On size, the docs say to start with 3 to 5 teammates for most workflows, and that "three focused teammates often outperform five scattered ones". We think a PR review is the right first run. A team of five to rename a variable is a meeting that should have been an email.

To run separate sessions by hand, see [managing multiple Claude Code sessions](/blog/manage-multiple-claude-code-sessions/).

<link rel="stylesheet" href="/blog/assets/media/claude-code-agent-teams/motion.css"><script defer src="/blog/assets/media/claude-code-agent-teams/motion.js"></script>
