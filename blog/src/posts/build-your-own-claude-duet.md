---
title: "Build Your Own Claude Duet: A Free Morning Brief Agent for Your Codebase"
seoTitle: "Build Your Own Claude Duet for Free: Morning Brief Agent for Developers"
description: "No Claude Duet invite? Build a proactive morning brief for your code in Munder Difflin: one agent, one schedule, and Slack replies. Free and open source."
date: 2026-10-22
category: guides
categoryLabel: Guides
type: Technical
primaryKeyword: "build your own claude duet"
secondaryKeywords: ["claude duet for developers", "open source claude duet", "claude duet alternative free", "morning brief ai agent", "proactive coding agent", "claude code morning brief"]
tags: ["Guides", "AI Agents", "Automation", "Claude Code"]
faq:
  - q: "Is this the same as Claude Duet?"
    a: "No. Claude Duet is Anthropic's app that works on business apps in its own virtual machine and decides by itself when to message you. This build copies one idea, a brief that comes to you first, for a codebase, on your own computer, on a clock you set."
  - q: "What do I need for this build?"
    a: "Munder Difflin, which is free, a coding CLI such as Claude Code with a subscription or key, and the GitHub CLI signed in to your account so the agent can read pull requests, runs and issues. Slack is optional."
  - q: "Does the brief run if my laptop is asleep?"
    a: "No. Schedules run on your computer, so it has to be awake. Munder Difflin has a setting that keeps the computer awake while agents are live, and it works best on mains power."
  - q: "Can I use Codex or Gemini CLI instead of Claude Code?"
    a: "Yes. Each agent picks its own engine when you add it, so the brief agent can run Codex, Gemini CLI, OpenCode or another supported CLI. The prompt stays the same."
---

You can build your own Claude Duet for a codebase with one [Munder Difflin](https://harnessmd.com/download) agent, one daily schedule that asks it for a brief, and Slack for replies. It costs nothing beyond the coding subscription you already have.

Claude Duet, Anthropic's proactive agent app, opened as a US waitlist on 21 Oct 2026 and is built for business apps ([what is Claude Duet?](/blog/what-is-claude-duet/)). Its best idea, a brief that comes to you before you ask, works just as well for code. Munder Difflin is free and open source: a desktop app that runs a team of coding agents such as Claude Code, Codex and Gemini CLI on your own computer. Labels below match the app's source on 22 Oct 2026.

## What will this build do?

Every morning at 08:00 an agent checks your repository and writes you a short brief: pull requests waiting for review, checks failing on main, and new issues. When you want something fixed, you say so in Slack and the work starts. Duet does the same for email and invoices: per [Anthropic](https://claude.com/resources/articles/claude-duet), "each morning, it sends you a short brief on the most important items across your connected apps."

You need three things:

- Munder Difflin installed, with the [install guide](/blog/how-to-install-and-use-munder-difflin/).
- A coding CLI, such as Claude Code, with a subscription or key.
- The [GitHub CLI](https://cli.github.com/) signed in, so the agent can run `gh pr list`, `gh run list` and `gh issue list`.

## How do you set up the brief agent and its schedule?

Add one agent, then give it a clock. Press **Add agent**, pick an engine such as Claude Code, and point it at your repository folder. Call it "brief agent" so the schedule is easy to read.

Then add the schedule. In the Pro view open **Automations**, press **New automation** and choose **Schedule**. In the Classic view, open the Command Center's Triggers tab, which the app describes as "everything that can start work without you typing", and add a schedule there. Fill in:

1. **Label**: Morning brief.
2. **When**: 08:00 every day, or weekdays only. In the Classic view pick every day, at 08:00; in the Pro view choose **Weekly** and set the days and time.
3. **Sends to**: brief agent.
4. **Message**: "List open pull requests, failing checks and new issues. Write me a short brief."

Press **Save**. The message is sent word for word on every run.

<figure class="mg" data-scene="schedule"><img src="/blog/assets/media/build-your-own-claude-duet/schedule.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A NEW SCHEDULE form fills in: LABEL Morning brief, GOES TO brief agent, WHEN Every day, 08:00, and a PROMPT asking for open pull requests, failing checks and new issues. Save is pressed and a saved tag appears. When the clock reaches 08:00 the prompt flies as an envelope to the brief agent's terminal. Tap Replay to watch again."><figcaption>The schedule as it looks in the Classic view. The Pro view names the fields Label, When, Sends to and Message.</figcaption></figure>

## What does the morning brief look like?

Three short sections, written by the agent from the GitHub CLI's output. The agent runs the commands in your repository, reads the results and keeps only what needs you. You read it in the agent's conversation in **Inbox**, which holds one conversation per agent.

<figure class="mg" data-scene="brief"><img src="/blog/assets/media/build-your-own-claude-duet/brief.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A terminal runs gh pr list, gh run list and gh issue list. Each result flows into a Morning brief card: Pull requests: 3 waiting for review, Checks: 1 failing on main, Issues: 2 new since yesterday. The numbers are examples. Tap a section for one more detail."><figcaption>A brief built from three GitHub CLI commands. The numbers are examples.</figcaption></figure>

A fuller version of the message stays short and specific:

```text
List open pull requests waiting for my review, checks failing on main,
and issues opened since yesterday. Write me a brief of at most ten lines.
Put anything that blocks a release first.
```

Tune it with the message, not code. Ask for "only items older than one day", or "skip draft pull requests", and the next run follows. Keep it short: Duet checks "every few hours, because checking nonstop would use up your plan's limits much faster", and the same holds for your coding plan. One run a day is cheap; a run every ten minutes is not.

Want more than one repository? Add one brief agent per repository, each pointed at its own folder, and give each its own schedule a few minutes apart. Each agent keeps its own memory file, so you can tell it once which items to skip.

## How do you answer the brief from Slack?

Connect Slack once, then reply in a thread. Create the Slack app from the manifest the app gives you: under **Integrations** in Pro, or **Settings**, then **Connections** in Classic, press **Copy manifest**. Our [Slack guide](/blog/connect-slack-to-munder-difflin/) has every step. Pick Michael, the orchestrator, under **Who answers inbound messages**.

Now write "Fix the failing check on main" in a channel the bot is in. The project's [README](https://github.com/HarnessMD/munder-difflin) says Michael "can spawn an ephemeral worker, reply in-thread, and tear it down."

<figure class="mg" data-scene="thread"><img src="/blog/assets/media/build-your-own-claude-duet/thread.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. In a #standup thread you write Fix the failing check on main. The message travels to Michael, the orchestrator, which starts a short lived temp worker. The worker replies Fix ready for review in the same thread and folds away."><figcaption>A reply in Slack becomes a short lived worker and an answer in the same thread.</figcaption></figure>

Spend, scope changes and destructive steps still come back to you for approval, and a circuit breaker stops an agent that loops.

## What is still missing compared with Claude Duet?

Judgment and the cloud. Duet decides what is urgent on its own and runs in a virtual machine with your laptop off. This build fires on your clock, on your awake computer, and sees only what its commands show. It works on your code, with any engine you pick, today, anywhere. For the full picture, read [Claude Duet vs Munder Difflin](/blog/claude-duet-vs-munder-difflin/) and [scheduling agent missions](/blog/scheduling-autonomous-agent-missions/).

<link rel="stylesheet" href="/blog/assets/media/build-your-own-claude-duet/motion.css"><script defer src="/blog/assets/media/build-your-own-claude-duet/motion.js"></script>
