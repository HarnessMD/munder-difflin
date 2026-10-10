---
title: "Claude Agent SDK: what it is, languages, cost and limits"
description: "The Claude Agent SDK is Claude Code as a Python and TypeScript library. Install commands, features, billing, licence and limits, checked 8 Oct 2026."
date: 2026-10-08
category: concepts
categoryLabel: Concepts
type: Technical
primaryKeyword: "claude agent sdk"
secondaryKeywords: ["what is claude agent sdk", "claude agent sdk python", "claude agent sdk typescript", "claude agent sdk pricing", "claude agent sdk vs claude code", "claude code sdk"]
tags: ["Concepts", "Claude Code", "AI Agents"]
faq:
  - q: "What is the Claude Agent SDK?"
    a: "It is a library from Anthropic for Python and TypeScript. Anthropic's overview says it gives you the same tools, agent loop and context management that power Claude Code, and describes it as a library that runs the Claude Code binary. Checked 8 Oct 2026."
  - q: "Is the Claude Agent SDK the same as the Claude Code SDK?"
    a: "Yes, it is the new name. Anthropic's migration guide says the Claude Code SDK has been renamed to the Claude Agent SDK. The packages changed from @anthropic-ai/claude-code and claude-code-sdk to @anthropic-ai/claude-agent-sdk and claude-agent-sdk."
  - q: "How much does the Claude Agent SDK cost?"
    a: "No page we opened lists a charge for the package. The quickstart uses an API key from the Claude Console. Anthropic's help article says that when you are signed in with your Claude plan, Agent SDK usage still draws from your plan's usage limits. Checked 8 Oct 2026."
  - q: "Can I use my Claude subscription with the Claude Agent SDK?"
    a: "For your own runs, Anthropic's help article, updated 7 October 2026 says you can still use the Claude Agent SDK with your subscription limits. For products you offer to others, the docs say Anthropic does not allow third party developers to offer claude.ai login or rate limits unless previously approved."
  - q: "Is the Claude Agent SDK open source?"
    a: "Partly, by repo. GitHub lists the Python repo under the MIT License. The TypeScript repo's licence file says all rights reserved, with use subject to Anthropic's Commercial Terms of Service. The docs say those terms govern use of the SDK, except where a component's LICENSE file says otherwise. Checked 8 Oct 2026."
---

The Claude Agent SDK is Claude Code packaged as a Python and TypeScript library, so your own program can run the same agent loop and tools. Our view: pick it when you are building a product, not when you want a coding assistant today. Billing depends on how you sign in. Checked 8 Oct 2026.

[Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of coding agents such as Claude Code, Codex and Gemini CLI on your own computer. We did not run the SDK for this page. Everything below comes from Anthropic's docs and package pages. The [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup and the [Concepts hub](/blog/topics/concepts/) explains the terms.

## What is the Claude Agent SDK?

It is an Anthropic library that lets your Python or TypeScript code run Claude Code's agent. Anthropic's [Agent SDK overview](https://code.claude.com/docs/en/agent-sdk/overview) says it "gives you the same tools, agent loop, and context management that power Claude Code". The same page calls it "a library that runs the Claude Code binary".

## How does it relate to Claude Code and the Claude Code SDK?

It is the same agent with a different way in, and "Claude Code SDK" is its old name. The [migration guide](https://code.claude.com/docs/en/agent-sdk/migration-guide) says: "The Claude Code SDK has been renamed to the Claude Agent SDK". The packages moved from `@anthropic-ai/claude-code` and `claude-code-sdk` to the names in the table below.

The overview draws the line by job. The Agent SDK is for embedding the agent "in a process you operate". The Claude Code CLI is "built for daily interactive use". One default differs: the migration guide says the SDK "no longer uses Claude Code's system prompt by default", and you request the `claude_code` preset to get it back.

<figure class="mg" data-scene="musicbox"><img src="/blog/assets/media/what-is-claude-agent-sdk/musicbox.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A wind-up music box mechanism lifts out of a case labelled Claude Code CLI and lowers into a plain case labelled your app. The same cylinder keeps turning in both cases."><figcaption>The SDK is a library that runs the Claude Code binary. Anthropic's Agent SDK overview, read on 8 Oct 2026.</figcaption></figure>

## Which languages does it support, and how do you install it?

Python and TypeScript. Versions below are the latest listed on [npm](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk) and [PyPI](https://pypi.org/project/claude-agent-sdk/) on 8 Oct 2026. Install commands and requirements are from the [quickstart](https://code.claude.com/docs/en/agent-sdk/quickstart).

| | TypeScript | Python |
| --- | --- | --- |
| Install | `npm install @anthropic-ai/claude-agent-sdk` | `pip install claude-agent-sdk` |
| Latest version | 0.3.293 | 0.2.164 |
| Needs | `Node.js` 18+ | Python 3.10+ |

For other languages, the overview says to run the CLI as a subprocess with the `-p` flag and `--output-format json`.

## What do you get with it?

You get eight Claude Code capabilities, according to the overview's table:

* **Built-in tools**: "Read, write, edit files, run commands, and search the web".
* **Hooks**: custom code at key points in the agent lifecycle. Our [hooks explainer](/blog/claude-code-hooks-explained/) covers the idea.
* **Subagents**: specialized agents for focused subtasks. See [subagents compared with a harness](/blog/claude-code-subagents-vs-multi-agent-harness/).
* **MCP**: external tools and data sources.
* **Permissions**: which tools run automatically and which need approval.
* **Sessions**: context you can resume or fork later.
* **Skills, commands and memory**: loaded from `.claude/` and `~/.claude/`.
* **Plugins**: loaded by local path.

<figure class="mg" data-scene="penknife"><img src="/blog/assets/media/what-is-claude-agent-sdk/penknife.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A folded pocket knife opens one tool at a time until eight tools fan out. Each carries a small label: tools, hooks, subagents, MCP, permissions, sessions, skills, plugins."><figcaption>The eight capabilities in Anthropic's Agent SDK overview, read on 8 Oct 2026.</figcaption></figure>

## What does it cost, and how is it billed?

No page we opened lists a charge for the package itself. Where the model usage it creates lands depends on how you sign in.

* **API key.** The quickstart has you set `ANTHROPIC_API_KEY` from the Claude Console. It also lists Amazon Bedrock, Claude Platform on AWS, Google Cloud's Agent Platform and Microsoft Foundry.
* **Claude plan login.** Anthropic's [help article](https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan), updated October 7, 2026, says: "You can still use the Claude Agent SDK, `claude -p`, and third-party apps with your subscription limits."
* **Monthly API credits.** The [credits article](https://support.claude.com/en/articles/17154008-monthly-api-credits-for-max-and-team-plans) listed, on 8 Oct 2026, $100 a month for Max 5x and $200 for Max 20x. On 8 Oct 2026 it listed $20 per Standard seat and $100 per Premium seat for Team plans, pooled and capped at $500. Free, Pro and Enterprise plans aren't eligible. You claim the credit by linking a Console organization, after seven days on the plan. It covers SDK runs made with an API key from that organization, and unused credit doesn't roll over.

Two qualifiers. The help article says the changes announced earlier were paused on June 15, 2026, and the credits article says of the Agent SDK credits announced in June: "That credit isn't available." And the overview says that, "unless previously approved", third party developers may not offer claude.ai login or rate limits in their products. For the plans themselves, see [what Claude Code costs](/blog/how-much-does-claude-code-cost/).

<figure class="mg" data-scene="points"><img src="/blog/assets/media/what-is-claude-agent-sdk/points.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A toy rail cart rolls to a set of points. With the lever on API key it runs to a siding labelled Claude Console. The lever flips to plan login and the next cart runs to a siding labelled plan usage limits."><figcaption>Signed in with a Claude plan, SDK usage draws from the plan's usage limits. Run with an API key from a linked Console organization, it can use the monthly API credits on Max and Team plans. Anthropic's help articles, 8 Oct 2026.</figcaption></figure>

## What licence is it under?

It depends on the repo. GitHub lists the [Python repo](https://github.com/anthropics/claude-agent-sdk-python) under the MIT License. The [TypeScript repo](https://github.com/anthropics/claude-agent-sdk-typescript)'s `LICENSE.md` reads "All rights reserved", with use subject to Anthropic's Commercial Terms of Service.

The overview says those terms govern use of the SDK, including in products you offer to your own customers, "except to the extent a specific component or dependency is covered by a different license".

## What are the limits and requirements?

Each session is a real process on your machine, not a stateless API call. The [hosting page](https://code.claude.com/docs/en/agent-sdk/hosting) says "One agent session maps to one subprocess", and gives 1 GiB RAM, 5 GiB disk and 1 CPU per agent as "a reasonable starting point". It adds that the 1 GiB figure "is a floor, not the ceiling".

* **Network.** Outbound HTTPS to `api.anthropic.com`, or your provider's regional endpoint.
* **State.** Session files sit on local disk by default and are lost on a container restart.
* **Bundled binary.** The quickstart says "most installs need no separate Claude Code install".
* **Cost fields.** The [cost page](https://code.claude.com/docs/en/agent-sdk/cost-tracking) calls `total_cost_usd` a client-side estimate, "not authoritative billing data".

<figure class="mg" data-scene="eggbox"><img src="/blog/assets/media/what-is-claude-agent-sdk/eggbox.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. An empty egg box fills one egg at a time. Each egg is one session and gets a small label reading 1 GiB RAM, 5 GiB disk, 1 CPU. When the box is full, the next egg has nowhere to sit."><figcaption>One session maps to one subprocess, with 1 GiB RAM, 5 GiB disk and 1 CPU as a starting point. Anthropic's hosting page, 8 Oct 2026.</figcaption></figure>

## What does a minimal example look like?

One call to `query()` with a prompt. This Python example is copied from Anthropic's hosting page, not written or run by us:

```python
import asyncio

from claude_agent_sdk import ClaudeAgentOptions, query


async def main():
    async for message in query(
        prompt="Summarize the files in this directory",
        options=ClaudeAgentOptions(cwd="/work/session-a"),
    ):
        print(message)


asyncio.run(main())
```

## When should you use the SDK, and when does a ready-made app fit better?

Our view: use the SDK when the agent is a part inside software you ship or schedule, and you are ready to own hosting, permissions and billing. If you want agents on your repo this afternoon, we think an app is less work:

1. The Claude Code CLI, for interactive work in a terminal.
2. Munder Difflin, if you want several CLI agents side by side. See [what a multi-agent harness is](/blog/what-is-a-multi-agent-harness/).
3. Managed Agents, which the overview lists for when you want Anthropic to host the agent. See [dynamic workflows in Managed Agents](/blog/claude-managed-agents-dynamic-workflows/).

A library gives you every knob. It also gives you every knob.

<link rel="stylesheet" href="/blog/assets/media/what-is-claude-agent-sdk/motion.css"><script defer src="/blog/assets/media/what-is-claude-agent-sdk/motion.js"></script>
