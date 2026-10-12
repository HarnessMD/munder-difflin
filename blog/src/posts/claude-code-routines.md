---
title: "Claude routines: what they are, triggers, cost and limits"
seoTitle: "Claude routines explained: triggers, cost and limits"
description: "Claude routines run a saved Claude Code prompt in the cloud on a schedule, an API call or a GitHub event. Plans, steps and limits, checked 12 Oct 2026."
date: 2026-10-12
category: concepts
categoryLabel: Concepts
type: Non-technical
primaryKeyword: "claude routines"
secondaryKeywords: ["claude code routines", "claude routines pricing", "claude code scheduled tasks", "claude routines vs cron", "claude code routines limits"]
tags: ["Concepts", "Claude Code", "Automation"]
faq:
  - q: "Are Claude routines generally available?"
    a: "No. Anthropic's routines page, checked 12 Oct 2026, says routines are in research preview and that behavior, limits and the API surface may change. It says routines are available on Pro, Max, Team and Enterprise plans."
  - q: "Do Claude routines cost extra?"
    a: "Anthropic's routines page gives no separate price. It says routines draw down subscription usage the same way interactive sessions do. Organizations with usage credits turned on can keep running routines on metered overage after the subscription usage limit."
  - q: "How often can a Claude routine run?"
    a: "The routines page says the minimum interval for a schedule is one hour, and more frequent expressions are rejected. It also lists 100 scheduled runs per hour for your account, checked 12 Oct 2026."
  - q: "Can a routine read files on my computer?"
    a: "No. Anthropic's scheduled tasks page says a cloud routine has no access to local files and works from a fresh clone. It lists Desktop scheduled tasks and /loop as the options that run on your machine."
  - q: "Does a green run status mean the task worked?"
    a: "No. The routines page says a green status means the session started and exited without an infrastructure error. It does not mean the task in your prompt succeeded, so open the run and read the transcript."
---

Our view: Claude routines are worth one small, low risk job if you want Claude Code to work while your laptop is closed, but they are a research preview with hourly limits. A routine is a saved prompt that runs in the cloud on a schedule, an API call or a GitHub event. Checked 12 Oct 2026.

We have not tried routines. This page reports what Anthropic's documentation says. [Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of coding agents such as Claude Code, Codex and Gemini CLI on your own computer. It sits at the local end of this choice, and routines sit at the cloud end. The [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup, and the [Concepts hub](/blog/topics/concepts/) explains the terms.

## What are Claude routines?

A routine is a saved Claude Code configuration that runs automatically. Anthropic's [routines page](https://code.claude.com/docs/en/routines) lists what is saved: a prompt, one or more repositories, and a set of connectors, "packaged once and run automatically".

The routines page says routines execute on Anthropic-managed cloud infrastructure, or on your organization's self-hosted environment when routed there, "so they keep working when your laptop is closed".

Each run is a full Claude Code cloud session. The routines page says the session runs shell commands and calls the connectors you include without stopping for approval, apart from some artifact actions.

<figure class="mg" data-scene="alarm"><img src="/blog/assets/media/claude-code-routines/alarm.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A laptop closes its lid on a desk. An alarm clock beside it shakes its bells, and a cloud above the desk lights up while a sheet of paper labelled prompt floats up into it. You can tap the alarm clock."><figcaption>Routines run in the cloud, so they keep working when your laptop is closed. Routines page, checked 12 Oct 2026. The drawing shows the alarm clock as the trigger.</figcaption></figure>

## Who can use routines today?

People on Pro, Max, Team and Enterprise plans can. The routines page says "Routines are available on Pro, Max, Team, and Enterprise plans", and it carries this note: "Routines are in research preview. Behavior, limits, and the API surface may change."

The routines page says Team and Enterprise Owners can disable routines for all members. It also says routines belong to your individual claude.ai account and are not shared with teammates.

We found no launch date on the routines page. We found no entry announcing routines in Anthropic's [Claude Code changelog](https://code.claude.com/docs/en/changelog), so we give no date.

## What can start a routine?

A schedule, an API call or a GitHub event can start a routine. These are the three trigger types on the routines page on 12 Oct 2026.

| Trigger | Starts a run |
| --- | --- |
| Scheduled | On a recurring cadence, or once at a future time |
| API | When you send an HTTP POST with a bearer token |
| GitHub | On repository events such as pull requests or releases |

The routines page says a single routine can combine triggers. It also says a run scheduled exactly on the hour, such as 9:00, "can start several minutes late", and suggests a time like 9:07.

<figure class="mg" data-scene="letterbox"><img src="/blog/assets/media/claude-code-routines/letterbox.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. One letterbox stands on a post. Three envelopes labelled Scheduled, API and GitHub drop into its slot one after another, and each time the small flag on its side lifts. You can tap any envelope."><figcaption>A schedule, an API call or a GitHub event can start a routine, and one routine can combine them. Routines page, checked 12 Oct 2026.</figcaption></figure>

## How do you create a routine?

You create one on the web at claude.ai/code/routines, in the Desktop app, or from the CLI with `/schedule`. The routines page gives these web steps:

1. Click New routine.
2. Name it and write the prompt, which must be "self-contained and explicit".
3. Add one or more GitHub repositories.
4. Pick a cloud environment, which controls network access.
5. Choose one trigger type or combine several.
6. Review connectors. Your connected MCP connectors are included by default, so remove any the routine doesn't need.
7. Click Create.

From the CLI, the page's example is:

```text
/schedule daily PR review at 9am
```

The routines page says `/schedule` in the CLI creates scheduled routines, and that you add an API trigger on the web.

## What does a routine cost and what are the limits?

A routine uses your plan's usage, and each way of starting a run has an hourly limit. The routines page says "Routines draw down subscription usage the same way interactive sessions do." It gives no separate price.

Anthropic's [pricing page](https://claude.com/pricing) listed Pro at $20 if billed monthly and Max "From $100" per month on 12 Oct 2026. For plan detail see [how much Claude Code costs](/blog/how-much-does-claude-code-cost/).

These rows are our selection from the limits table on the routines page.

| Way of starting a run | Limit on 12 Oct 2026 | Over the limit |
| --- | --- | --- |
| Scheduled runs, including one-off runs | 100 per hour, for your account | The run waits |
| Run now, API fires and one-off reruns | 30 per hour, for each routine | The action fails |
| GitHub events | Hourly caps, no number given | Events are dropped |

The routines page says "None of these hourly limits has overage." It also says the minimum interval for a schedule is one hour. At the subscription usage limit, the page says organizations with usage credits turned on can keep running routines on metered overage.

<figure class="mg" data-scene="mugs"><img src="/blog/assets/media/claude-code-routines/mugs.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A row of mugs slides along a shelf under a coffee tap and each one fills. A meter beside the tap, labelled 100 per hour for your account, fills up. Then the tap closes and the next mug waits until a wall clock hand comes round and the meter resets."><figcaption>Scheduled runs: 100 per hour for your account, and a run over the limit waits until the limit resets. Routines page, checked 12 Oct 2026.</figcaption></figure>

The routines page also warns that a green status means the session "started and exited without an infrastructure error". Green is a statement about plumbing, not about your task.

## How is a routine different from a scheduled task, cron or GitHub Actions?

A routine runs in the cloud without your machine, and the other options run on your computer or on GitHub's runners. Anthropic's [scheduled tasks page](https://code.claude.com/docs/en/scheduled-tasks) compares the cloud option with Desktop scheduled tasks and `/loop`. Cloud needs no machine on, has no access to local files (a fresh clone), and has a minimum interval of 1 hour. Desktop tasks and `/loop` run on your machine with a minimum interval of 1 minute.

<figure class="mg" data-scene="watering"><img src="/blog/assets/media/claude-code-routines/watering.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. Two plant pots sit side by side. A watering can hanging from a cloud tips over the left pot once while a clock hand sweeps 1 hour. A small watering can on a desk tips over the right pot again and again, once each 1 minute tick."><figcaption>Minimum interval: 1 hour for cloud routines, 1 minute for Desktop tasks and /loop. Scheduled tasks page, checked 12 Oct 2026.</figcaption></figure>

On cron, the routines page says you set a cron expression with `/schedule update`, and that expressions more frequent than one hour are rejected.

Anthropic's [GitHub Actions page](https://code.claude.com/docs/en/github-actions) says the Claude Code GitHub Action runs on GitHub-hosted runners, "which consume your GitHub Actions minutes".

We think a local task still fits jobs that need local files or a run every few minutes.

## What does it mean if you run coding agents on your own computer?

Little changes for local agents, because the scheduled tasks page says a cloud routine works from a fresh clone. The routines page says routines suit work that is "unattended, repeatable, and tied to a clear outcome".

Our view: use routines for that kind of job, and local agents for daily work in your repo. See [Claude Code automation while you sleep](/blog/claude-code-automation-while-you-sleep/), [Claude Code hooks explained](/blog/claude-code-hooks-explained/) and [local-first and cloud agent SDKs](/blog/local-first-vs-cloud-agent-sdks/).

## What should you do now?

Try one low risk routine and read its first run.

1. Pick a repeatable job, such as a weekly docs check.
2. Remove the connectors it doesn't need.
3. Schedule it a few minutes past the hour.
4. Open the first run and read the transcript.

<link rel="stylesheet" href="/blog/assets/media/claude-code-routines/motion.css"><script defer src="/blog/assets/media/claude-code-routines/motion.js"></script>
