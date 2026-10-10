---
title: "Claude Managed Agents dynamic workflows: limits and cost"
seoTitle: "Claude Managed Agents: dynamic workflows explained"
description: "Dynamic workflows let a Claude Managed Agents agent write a program that runs many agents. How to turn them on, beta limits and cost, checked 11 Oct 2026."
date: 2026-10-11
category: concepts
categoryLabel: Concepts
type: Non-technical
primaryKeyword: "claude managed agents"
secondaryKeywords: ["claude managed agents dynamic workflows", "claude dynamic workflows", "managed agents workflow runs", "claude managed agents pricing", "multiagent_20261001"]
tags: ["Concepts", "Claude Code", "AI Agents"]
faq:
  - q: "Are dynamic workflows in Claude Managed Agents generally available?"
    a: "No. Anthropic's platform release notes entry for October 9, 2026 says dynamic workflows are in beta with the managed-agents-2026-04-01 beta header. The Managed Agents overview says Claude Managed Agents itself is in beta, and that behaviors may be refined between releases."
  - q: "How many agents can one workflow run start?"
    a: "Anthropic's workflow runs page, checked 11 Oct 2026, lists 1,000 agents that a workflow starts over the run's whole life, and 64 threads working at once in one run. It says the API doesn't guarantee the 64, so it can change."
  - q: "Do dynamic workflows cost extra?"
    a: "The workflow runs page says a run has no price of its own. The tokens its agents use are billed like the session's other tokens, at each model's rates. Anthropic's pricing page lists session runtime at $0.08 per session-hour, checked 11 Oct 2026."
  - q: "Can you start a workflow run with an API call?"
    a: "No. The workflow runs page says only the agent starts a run. The multiagent page says you describe the work in a user.message, and the agent determines whether and when to start a run. You steer that choice in the message or in the agent's system prompt."
  - q: "Are dynamic workflows on by default?"
    a: "With the multiagent_20261001 type, yes. Anthropic's multiagent page says subagents and workflows are both enabled by default with that type. To turn one off you set it to {\"type\": \"disabled\"}. The older coordinator type can't start workflow runs."
---

Dynamic workflows let a Claude Managed Agents agent write a program that runs many agents in the background and combines their results. They have been in beta since 9 October 2026. Our view: a good fit for work with many pieces, and a reason to set a budget first. Checked 11 Oct 2026.

We have not tried dynamic workflows. This page reports what Anthropic's documentation says. [Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of coding agents such as Claude Code, Codex and Gemini CLI on your own computer. It sits at the local end of this choice, and Managed Agents sits at the hosted end. The [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup, and the [Concepts hub](/blog/topics/concepts/) explains the terms.

## What is Claude Managed Agents?

Claude Managed Agents is Anthropic's hosted agent runner on the Claude API. The [overview](https://platform.claude.com/docs/en/managed-agents/overview) calls it a pre-built, "configurable agent harness that runs in managed infrastructure", best for long-running tasks and asynchronous work.

The overview names four concepts: an agent, an environment, a session and events. The environment is an Anthropic-managed cloud sandbox, or a self-hosted sandbox on your own infrastructure.

It is in beta. The overview says all Managed Agents endpoints require the `managed-agents-2026-04-01` beta header, and that access is enabled by default for all API accounts. If you want the library instead of the hosted service, see [what the Claude Agent SDK is](/blog/what-is-claude-agent-sdk/).

## What are dynamic workflows?

Dynamic workflows are the feature that lets an agent write a workflow and start a run of it. Anthropic's [workflow runs page](https://platform.claude.com/docs/en/managed-agents/workflow-runs) defines a workflow as "a program that an agent writes to run many agents and combine what they return".

The [release notes](https://platform.claude.com/docs/en/release-notes/overview) entry for October 9, 2026 gives the use case: work with many pieces, such as reviewing hundreds of documents. The server runs the workflow in the background.

The workflow runs page lists five things the program can do:

1. Run many agents at the same time.
2. Pass one agent's result to another agent.
3. Determine which agents run next, and write their prompts.
4. Repeat work, such as revising a draft until a review passes.
5. Handle a failed agent, or let it end the run.

In the page's example diagram, three agents read contracts in the first phase, and one agent in the second phase works with what they returned.

<figure class="mg" data-scene="tracks"><img src="/blog/assets/media/claude-managed-agents-dynamic-workflows/tracks.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. Three rail wagons labelled contract roll along three tracks side by side in a first phase. The tracks join at a junction, three paper slips travel along them, and a single wagon labelled one agent carries the slips away in a second phase."><figcaption>Anthropic's example: three agents read contracts in the first phase, and one agent in the second phase combines the results. Workflow runs page, checked 11 Oct 2026.</figcaption></figure>

## How do you turn dynamic workflows on?

You set the agent's `multiagent` field to the `multiagent_20261001` type. The release notes give this value:

```json
{"type": "multiagent_20261001", "workflows": {"type": "enabled"}}
```

The [multiagent page](https://platform.claude.com/docs/en/managed-agents/multiagent-orchestration) says dynamic workflows and delegating (`subagents`) are both on by default with this type. For dynamic workflows without delegating, it says to add `"subagents": {"type": "disabled"}`.

The older `coordinator` type can't start workflow runs.

There is no start call. The workflow runs page says "Only the agent starts a run." The multiagent page says you describe the work in a `user.message`, and the agent determines whether and when to start one.

<figure class="mg" data-scene="switches"><img src="/blog/assets/media/claude-managed-agents-dynamic-workflows/switches.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A wall plate labelled multiagent_20261001 holds two light switches, subagents and workflows. Both click on and a bulb lights above each. Then the subagents switch flips off and its bulb goes dark. You can tap either switch."><figcaption>With the multiagent_20261001 type, subagents and workflows are both on by default, and each can be turned off. Multiagent page, checked 11 Oct 2026.</figcaption></figure>

## What are the limits in beta?

One run can start 1,000 agents over its life, with 64 threads working at once, a number the API doesn't guarantee. These are the figures on Anthropic's pages on 11 Oct 2026. The first four rows are the whole limits table on the workflow runs page. The last is our selection from the multiagent page.

| Limit | Value on 11 Oct 2026 | Anthropic's note |
| --- | --- | --- |
| Threads working at once in one run | 64 | The API doesn't guarantee this number |
| Agents a workflow starts over the run's whole life | 1,000 | Past it, the run ends with `thread_limit_error` |
| Run lifetime | 24 hours by default | The agent can set a shorter one |
| Runs open at once in a session | 10 by default | Idle runs count |
| Subagent child threads at a time | At most 25 | A run's threads don't count |

The workflow runs page says the server has other limits on workflows "that aren't listed here". A run's model requests also count toward your Messages API rate limits.

<figure class="mg" data-scene="carpark"><img src="/blog/assets/media/claude-managed-agents-dynamic-workflows/carpark.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A car park with 64 bays fills with small cars, and one more car waits outside until a bay frees up. A counter beside it climbs to 1,000, and a clock hand sweeps one full day of 24 hours."><figcaption>64 threads at once (not guaranteed), 1,000 agents over a run's life, and a 24 hour default lifetime. Workflow runs page, checked 11 Oct 2026.</figcaption></figure>

## What does a workflow run cost?

A run has no price of its own, by Anthropic's wording. The workflow runs page says the tokens its agents use "are billed like the session's other tokens, at each model's rates".

Anthropic's [pricing page](https://platform.claude.com/docs/en/about-claude/pricing) says Claude Managed Agents is billed on two dimensions: tokens and session runtime. On 11 Oct 2026 it listed session runtime at $0.08 per session-hour, counted while the session's status is `running`.

The multiagent page says it plainly: "every agent in a run uses tokens".

The control is a [session budget](https://platform.claude.com/docs/en/managed-agents/budgets), an optional hard spend ceiling. The budgets page says you attach it when the session is created, and adding one later is rejected with a 400 error. The workflow runs page says a run can pass the budget by one request for each working thread.

At the budget every open run pauses. A paused run's lifetime keeps passing, which is a polite way of saying the clock does not care.

<figure class="mg" data-scene="bathtub"><img src="/blog/assets/media/claude-managed-agents-dynamic-workflows/bathtub.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. Three taps on a pipe labelled tokens fill one bathtub that has a dashed line marked budget. A small ticker labelled session runtime, $0.08 per session-hour, ticks below it. When the water reaches the line the taps close and a label says pauses. You can drag the budget line."><figcaption>A run has no price of its own. Session runtime was $0.08 per session-hour on 11 Oct 2026, on top of tokens. The drawing shows a budget pausing the run.</figcaption></figure>

## How is this different from subagents?

With subagents the agent delegates and reads each report itself. With a workflow, a program does the handing out. The multiagent page says results are "passed programmatically from one agent to another".

The trade is follow-up. The agent can send a subagent more messages. It can't send follow-up messages to a run's threads, and the server archives each one by the end of its run.

Claude Code is a separate product. See [Claude Code agent teams](/blog/claude-code-agent-teams/) and [subagents against a multi-agent harness](/blog/claude-code-subagents-vs-multi-agent-harness/).

## What does it mean if you run coding agents on your own computer?

Nothing changes for you today, because this is an API feature for Managed Agents sessions. The overview says sessions store conversation history, sandbox state and outputs server-side, and that Managed Agents is "not currently eligible" for Zero Data Retention.

Our view: pick hosted runs for large batch work, and local agents for daily work in your own repo. See [local-first and cloud agent SDKs](/blog/local-first-vs-cloud-agent-sdks/).

## What should you do now?

Try it on one small job first.

1. Create a test agent with the `multiagent_20261001` type.
2. Create the session with a small budget.
3. Tell the agent in its system prompt when to start a run.
4. Follow the `workflow_run.*` events.

<link rel="stylesheet" href="/blog/assets/media/claude-managed-agents-dynamic-workflows/motion.css"><script defer src="/blog/assets/media/claude-managed-agents-dynamic-workflows/motion.js"></script>
