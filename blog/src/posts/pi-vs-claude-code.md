---
title: "Pi vs Claude Code: Price, Models and Permissions Compared (Oct 2026)"
seoTitle: "Pi vs Claude Code (Oct 2026): Free Harness or Built In Features?"
description: "Pi vs Claude Code, checked 27 Oct 2026: Pi is free, MIT and works with 15+ providers; Claude Code is from $20 a month billed monthly, plan mode built in."
date: 2026-10-27
category: comparisons
categoryLabel: Comparisons
type: Technical
primaryKeyword: "pi vs claude code"
secondaryKeywords: ["pi agent vs claude code", "pi coding agent vs claude code", "claude code vs pi", "pi agent harness", "is pi better than claude code"]
tags: ["Comparisons", "Pi", "Claude Code", "CLI Agents", "Open Source"]
faq:
  - q: "Is Pi better than Claude Code?"
    a: "Neither wins outright. Pi is better if you want a free, MIT licensed agent you shape yourself and any of more than 15 model providers. Claude Code is better if you want plan mode, subagents and permission modes built in, on Anthropic's models, from $20 a month billed monthly (27 Oct 2026)."
  - q: "Is Pi free?"
    a: "Yes. Pi is MIT licensed and pi.dev lists no price for it. You pay the model provider you connect with /login or an API key, or nothing extra with a local model."
  - q: "Can Pi use Claude models?"
    a: "Yes. Anthropic is one of the built in providers Pi lists, next to OpenAI, Google, Mistral, Ollama and others. Run /login inside Pi and pick a provider, or set an API key."
  - q: "Does Pi have plan mode like Claude Code?"
    a: "Not built in. Pi's README says it skips subagents and plan mode on purpose, and asks you to build what you want or install a package that does it. Claude Code has plan mode as one of its permission modes."
  - q: "Can I run Pi and Claude Code together?"
    a: "Yes. Munder Difflin is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. Pi and Claude Code are both engines its agents can run on."
---

Pick Pi if you want a free, MIT licensed agent you shape yourself on any of more than 15 model providers; pick Claude Code if you want plan mode, subagents and permission modes in the box on Anthropic's models, from $20 a month billed monthly on 27 Oct 2026. Both work in your terminal.

[Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. Pi and Claude Code are both engines it runs. New to Pi? Start with [what is Pi agent](/blog/what-is-pi-agent/).

<figure class="mg" data-scene="box"><img src="/blog/assets/media/pi-vs-claude-code/box.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, two open boxes sit side by side. The Claude Code box fills with labelled cards: Plan mode, Subagents, Permission modes, Hooks, MCP. The Pi box holds four small cards, Read, Write, Edit and Bash, plus an empty dashed slot labelled Your extension that fills with a card when tapped."><figcaption>Pi's four default tools, per its CLI docs, against Claude Code's built in features, per its docs, read 27 Oct 2026. Pi also has MCP built in.</figcaption></figure>

## Pi vs Claude Code at a glance (checked 27 Oct 2026)

| | Pi | Claude Code |
| :-- | :-- | :-- |
| Maker | Earendil Inc. (written by Mario Zechner) | Anthropic |
| Licence | MIT | Closed; use is subject to Anthropic's Commercial Terms |
| Price | Free; you pay your model provider | Claude Pro, $20 a month billed monthly, or API usage |
| Models | 15+ providers: Anthropic, OpenAI, Google, Mistral, Ollama and more | Anthropic's Claude models: Opus 5.5 by default |
| Plan mode and subagents | Not built in; add them with extensions | Built in |
| Permissions | None built in; use a container or sandbox | Permission modes, from Manual to auto |
| MCP | Yes, stdio and streamable HTTP | Yes |
| Where it runs | Terminal, print or JSON mode, RPC, TypeScript SDK | Terminal, IDE extensions, desktop app, web |
| Latest release | v1.4.0, 21 Oct 2026 | v2.1.311, 26 Oct 2026 |

Sources: Pi's [README](https://github.com/earendil-works/pi) and [pi.dev](https://pi.dev/), Claude Code's [overview](https://code.claude.com/docs/en/overview) and [model configuration](https://code.claude.com/docs/en/model-config) docs, and [claude.com/pricing](https://claude.com/pricing), all read 27 Oct 2026. Pi's repo had more than 118,000 GitHub stars that day.

## How much do Pi and Claude Code cost?

Pi costs nothing; Claude Code started at $20 a month billed monthly, or $17 billed annually, on 27 Oct 2026. Pi has no plan of its own. Inside Pi you run `/login` to connect "a subscription or API key", per its README, and you pay that provider, or nothing extra with a local model through Ollama.

Claude Code is not on Claude's Free plan. On 27 Oct 2026 claude.com/pricing listed Pro at $20 a month billed monthly, or $17 a month billed annually, and Max at $100 and $200 a month. You can also pay per token with an API key. Our [Claude Code pricing breakdown](/blog/how-much-does-claude-code-cost/) covers the plans in detail.

## Which models can each one use?

Pi is built for many providers; Claude Code is built for Claude. pi.dev says it supports more than 15 providers, and its providers doc covers sign in by OAuth or API key, with `auth.json` holding the credential. You switch models mid session.

Claude Code runs Anthropic's models. Its model configuration docs, read 27 Oct 2026, list Opus 5.5 as the default on the Anthropic API, with Sonnet 5.5 and Haiku 5.5 beside it, On Amazon Bedrock, Google Cloud's Agent Platform and Microsoft Foundry the same aliases can point at older Claude versions, such as Sonnet 4.5.

<figure class="mg" data-scene="plugs"><img src="/blog/assets/media/pi-vs-claude-code/plugs.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a Claude Code card has one cable running to a socket labelled Claude models. A Pi card has a power strip with many sockets; plugs labelled Anthropic, OpenAI, Google, Mistral and Ollama click in one by one, and a small tag reads 15 plus providers."><figcaption>One model family against a power strip of providers, per each project's docs, read 27 Oct 2026.</figcaption></figure>

## What does each give you out of the box?

Claude Code ships the features; Pi ships a small core you extend. Pi's README says it "ships with powerful defaults but skips features like sub-agents and plan mode. Ask Pi to build what you want, or install a package that does it your way." You customise it with TypeScript extensions, skills, prompt templates and themes, bundled as Pi packages on npm or git. Each session is a tree you can rewind and branch.

Claude Code has [plan mode](/blog/how-to-use-claude-code-plan-mode/) as a permission mode, subagents with their own context windows, hooks that run before and after tool calls, and MCP servers. If you want those today without writing code, Claude Code saves you the work. If you want an agent that matches your own workflow, Pi lets you build it.

## Which is safer to let loose on a repo?

Claude Code checks actions before they run; Pi does not ask. Pi's README is direct: "Pi does not include a built-in permission system for restricting filesystem, process, network, or credential access." It suggests three ways to box it in: the Gondolin extension, which routes tools into a local Linux micro VM, plain Docker, or an OpenShell sandbox.

Claude Code's permission modes run from Manual, which asks before most edits and commands, to auto, where a classifier reviews actions instead of you; since v2.1.283, new terminal and VS Code sessions start in auto. Neither one replaces a container for untrusted work.

<figure class="mg" data-scene="gate"><img src="/blog/assets/media/pi-vs-claude-code/gate.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, two paths lead to a folder labelled Your repo. On the Claude Code path a small gate swings with three labels in turn: Manual, Plan, Auto. On the Pi path there is no gate, and a dashed box labelled Container or sandbox slides around the path when tapped."><figcaption>Built in permission modes against a sandbox you add, per Claude Code's permission docs and Pi's README, read 27 Oct 2026.</figcaption></figure>

## Pick Pi if..., pick Claude Code if...

**Pick Pi if:**
* You want a free, MIT licensed agent and the freedom to read and change its code.
* You switch between model providers, or run local models.
* You like building your own commands and tools more than learning someone else's.

**Pick Claude Code if:**
* You want plan mode, subagents and permission modes without setting them up.
* You already pay for Claude and want coding on the same plan.
* You want it in your IDE, a desktop app or the web, not only the terminal.

Still deciding? [Pi agent alternatives](/blog/pi-agent-alternatives/) lists six more options, and the [multi agent tools roundup](/blog/best-claude-code-multi-agent-tools/) is the wider map.

## Can you run Pi and Claude Code together?

Yes. In Munder Difflin you pick the engine per agent, so a Pi agent and a Claude Code agent can work side by side, each in its own terminal, while other agents take research, writing or ops. The [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup.

<link rel="stylesheet" href="/blog/assets/media/pi-vs-claude-code/motion.css"><script defer src="/blog/assets/media/pi-vs-claude-code/motion.js"></script>
