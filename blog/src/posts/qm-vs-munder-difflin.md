---
title: "qm vs Munder Difflin: YC's Multiplayer Harness or an Office of Your Clones?"
description: "An honest September 2026 comparison of YC's qm and Munder Difflin. qm is a multiplayer agent harness a company deploys for Slack and the web. Munder Difflin runs an office of your clones on your own machine, with Teams to connect them."
date: 2026-08-06
updated: 2026-09-10
category: comparisons
categoryLabel: Comparisons
type: Non-technical
primaryKeyword: "qm vs munder difflin"
secondaryKeywords: ["yc qm alternative", "qm agent harness", "multiplayer agent harness", "local first agent orchestration", "qm y combinator agents", "self hosted agent harness"]
tags: ["Comparisons", "Multi-Agent", "Tools", "Claude Code", "Open Source"]
author:
  name: Chaitanya Giri
  initials: CG
faq:
  - q: "What is qm?"
    a: "qm (github.com/yc-software/qm) is Y Combinator's open source multiplayer agent harness for work, used in Slack and on the web. A company deploys it from its own deployment repository. Each person and each room gets scoped memory, files, permissions, crons and a durable sandbox, and Pi, OpenCode, Codex and Claude Code can all drive the same core. It is MIT licensed."
  - q: "What is the main difference between qm and Munder Difflin?"
    a: "Where the agents run and who they belong to. qm is a shared service a company deploys, and everyone reaches it through Slack and a browser. Munder Difflin is a desktop app where your agents run as real terminal processes on your own machine, coordinated by your clone, Michael."
  - q: "Can Munder Difflin be multiplayer like qm?"
    a: "Yes, in a different shape. The Munder Difflin Teams plan lets clones message each other, and every message is sealed for the device that opens it. Each person's clone still runs on their own machine under their own keys, and the relay carries messages it cannot read."
  - q: "How do their safety controls compare?"
    a: "qm has one security posture for the whole org: Strict pauses harness tool calls for human approval, Auto screens external data with a classifier, and Dangerous does neither. Munder Difflin sets autonomy on your floor: an ask first mode where agents pause for tool approval, per agent token budgets, a circuit breaker that steers, constrains and then stops a runaway agent, and an ASK ME board for decisions that need you."
  - q: "Which should I use?"
    a: "qm if your company wants one shared agent service in Slack, run by an admin on your own infrastructure. Munder Difflin if you want agents you can watch in real terminals on your own machine, across twelve CLIs, on the subscriptions you already pay for. Both are MIT licensed, so trying both costs you an afternoon."
---

<div class="callout tldr"><span class="ic">TL;DR</span><p><strong>qm</strong> is Y Combinator's
multiplayer agent harness. A company deploys it, and everyone works with agents through <strong>Slack and a
web app</strong>, each person and room with its own scoped memory, crons and sandbox. <strong>Munder
Difflin</strong> runs an <strong>office of your clones on your own machine</strong>: real terminal CLIs you
can watch, coordinated by Michael, with <strong>Teams</strong> so your clone can work with your teammates'
clones. Same destination, opposite starting points. Both MIT licensed.</p></div>

[qm](https://github.com/yc-software/qm) keeps picking up stars, and people keep asking how it compares. We
wrote the first version of this in August. Both projects have shipped a lot since, so this is the updated
comparison, checked against qm's README and our own 0.5.2 release on 10 September 2026.

## What problem do both tools solve?

One agent in one terminal does not scale to real work. Both tools let several agents work in parallel, safely,
on schedules, and reachable from where you already are. They just start from opposite ends.

**qm starts from the company.** You create a deployment repository that depends on `@yc-software/qm`, and the
qm CLI validates and deploys it. A headless core backed by Postgres runs the sessions, and people reach it
through Slack and a web app. Each person and each room gets its own scoped memory, files, keychain view,
permissions, crons, web apps and durable sandbox. Admins choose which harnesses and models are available, and
Pi, OpenCode, Codex and Claude Code can all drive the core.

**Munder Difflin starts from your desk.** It is a desktop app for macOS, Windows and Linux. Every agent is a
real CLI process in a real terminal on your machine, running on the subscriptions you already pay for, and
twelve CLIs are supported. The office floor shows who is doing what. Michael, your clone, turns requests into
tasks and routes the work. Agents share long term memory and message each other through mailboxes.

## How do the concepts map across?

| Job to be done | qm | Munder Difflin |
| --- | --- | --- |
| Safety | One org posture: Strict, Auto or Dangerous | Ask first or autonomous agents, per agent token budgets, a circuit breaker, an ASK ME board |
| Background work | Crons, watches, inbound webhooks | Scheduled triggers on an interval or on chosen weekdays, webhooks, Slack |
| Reusable behaviour | Skills owned by a scope, shared by grant, skill packs from git | A skills catalog, plus ready made hires from the Agent Gallery |
| Isolation | A durable sandbox per person and room | A git worktree per agent when isolation is on |
| Where you use it | Slack and a web app | A desktop app, plus Slack |
| Multiplayer | Built in: one deployment for the company | Teams plan: clones message each other, sealed per device |
| Where it runs | Your company's infrastructure | Your own machine |
| License | MIT | MIT |

{% img "note-1" %}

## What does qm do that Munder Difflin does not?

Company wide sharing, run by an admin. That is qm's home turf. One deployment serves everyone, the admin
controls which harnesses and models people can use, the whole company inherits one security posture, and
people can build internal web apps and publish them to each other. A sandbox per scope also means the tools
someone installs stay installed. If your company wants a single agent service living in Slack, qm was built
for exactly that.

## What does Munder Difflin do differently?

It puts everything on your own machine, where you can watch and touch it:

- **Real terminals.** Every agent is a CLI process you can open and type into. When something goes sideways,
  you read the actual session.
- **Twelve CLIs on your own subscriptions.** Claude Code, Codex, Gemini CLI, Copilot, Cursor and seven more,
  mixed on one floor, within the usage limits you already pay for.
- **Your clone in charge.** Michael takes your request, hires workers and routes messages, and you can talk
  to him by voice.
- **An IDE over the floor.** Browse and edit an agent's workspace and see its uncommitted changes as a diff.
- **Nothing to deploy.** Download it, answer a short setup, give Michael a job. No server, no database.
- **Local first.** Code, keys and personal context stay on your machine. With Teams, the only thing that
  travels is clone to clone messages, sealed so the relay in the middle cannot read them.

{% img "note-2" %}

## Which one should you use?

- **Your company wants one shared agent service in Slack, with admin control:** qm.
- **You want your own office of agents on your machine, visible and vendor neutral:** Munder Difflin. Add
  Teams when you want your clone working with your teammates' clones.
- **Some companies will run both.** qm as the company layer in Slack, and Munder Difflin as the personal floor
  where each person watches and steers their own agents. They do not compete for the same seat.

Facts about qm above come from its public README as of 10 September 2026. Check
[the repo](https://github.com/yc-software/qm) for the current state, because both projects ship often.

**[Download Munder Difflin free](https://munderdiffl.in/)** for macOS, Windows or Linux. MIT licensed.
