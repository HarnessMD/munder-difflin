---
title: "Claude Code Router: What It Is, How It Works and How to Install It"
seoTitle: "Claude Code Router (CCR): Point Claude Code at Other Models"
description: "Claude Code Router, checked 14 Oct 2026: what the local gateway does, how to install it, which providers it lists, and what Anthropic says about it."
date: 2026-10-14
category: concepts
categoryLabel: Concepts
type: Technical
primaryKeyword: "claude code router"
secondaryKeywords: ["claude-code-router", "ccr", "use claude code with other models", "claude code openrouter", "claude code deepseek"]
tags: ["Concepts", "Claude Code", "Model Routing", "Open Source", "Cost"]
faq:
  - q: "Is Claude Code Router free?"
    a: "The software is open source: GitHub listed it under the MIT licence on 14 Oct 2026. The models behind it are a separate matter: you add each provider with your own API key, and Anthropic's gateway docs say that while a gateway credential or apiKeyHelper is active, gateway traffic is billed per token to whoever owns the credential the gateway forwards."
  - q: "Does Anthropic support Claude Code Router?"
    a: "No. Anthropic's LLM gateway docs said on 14 Oct 2026 that Anthropic doesn't endorse, maintain, or audit third-party gateway products, and doesn't support routing Claude Code to non-Claude models through any gateway."
  - q: "Can I use Claude Code with DeepSeek or OpenRouter?"
    a: "Claude Code Router's README names both among the providers it supports. You add the provider and key in the app, start its server and apply a Claude Code profile. Anthropic's gateway docs say it doesn't support routing Claude Code to non-Claude models."
  - q: "What port does Claude Code Router use?"
    a: "Its README says the local model gateway listens on http://127.0.0.1:3456 by default. If you install the npm CLI and run ccr ui, the browser management screen is at http://127.0.0.1:3458, and the gateway stays on 3456."
  - q: "Do my Claude Pro or Max limits apply when I use a gateway?"
    a: "Not while a gateway credential is active. Anthropic's LLM gateway docs say those requests carry the gateway credential in place of your claude.ai login, so the subscription's usage limits don't apply to them. Setting only ANTHROPIC_BASE_URL, with no gateway credential, keeps your saved login and its limits."
---

Claude Code Router (CCR) is an MIT licensed local gateway that points Claude Code, and other coding agents, at the providers and models you choose, such as OpenRouter or DeepSeek. Anthropic's [gateway docs](https://code.claude.com/docs/en/llm-gateway) say Anthropic doesn't support routing Claude Code to non-Claude models through any gateway. Checked 14 Oct 2026.

Want several agents side by side rather than one agent on many models? [Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of coding agents such as Claude Code, Codex and Gemini CLI on your own computer. More explainers sit in our [Concepts hub](/blog/topics/concepts/).

## What is Claude Code Router?

It is a local model gateway and control plane for coding agents, in the words of its [README](https://github.com/musistudio/claude-code-router). The README says it gives agents "one stable local endpoint" while you manage providers, models, accounts, routing rules and tools in one place. In effect, it is a switchboard operator for API calls.

GitHub shows the repo was created in February 2025, and on 14 Oct 2026 its description read "One local control plane for every AI agent". The README lists Claude Code, Claude Design, Codex, Grok CLI, Kimi CLI, Kilo Code, OpenCode, Pi, ZCode and WorkBuddy as supported agents. GitHub showed v3.1.3, released 9 Oct 2026, under the MIT licence, with more than 37,000 stars.

<figure class="mg" data-scene="switchboard"><img src="/blog/assets/media/claude-code-router/switchboard.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. An old telephone switchboard has one jack marked Claude Code on the left and jacks marked OpenRouter, DeepSeek, Moonshot and Mistral on the right. A patch cord plugs Claude Code into DeepSeek, then moves across to OpenRouter."><figcaption>One local endpoint for the agent, many providers behind it. CCR's README, read 14 Oct 2026.</figcaption></figure>

## How does Claude Code Router work?

Claude Code sends its requests to CCR on your machine, and CCR forwards each one to the provider, model and account you set up. The README's diagram shows the agents on top, "Claude Code Router :3456" in the middle with profiles, routing, credentials, tools and logs, and the selected provider, model and account below.

Routing rules can match on request headers and bodies, use prefixes, rewrite requests, retry and fall back to models in a set order, per the README. The README also lists credential pools and key rotation to keep requests running, and logs that show the resolved provider, model, latency, tokens and estimated cost.

<figure class="mg" data-scene="pinwheel"><img src="/blog/assets/media/claude-code-router/pinwheel.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A pinwheel spins in a breeze drawn as lines labelled retry. The lines fade out, a second breeze labelled fall back starts from the other side, and the pinwheel keeps turning."><figcaption>Retries, key rotation and ordered fallback models, as listed in CCR's README on 14 Oct 2026.</figcaption></figure>

## How do you install Claude Code Router?

Download the desktop app for macOS, Windows or Linux, or install the npm CLI, which needs `Node.js` 22 or newer. The README's desktop steps:

1. Open Providers, then Add Provider. Pick a preset or a custom endpoint, enter the API key, choose the protocol and models, and save.
2. Open Server and click Start. The gateway listens on `http://127.0.0.1:3456` by default.
3. Open Agent Config, choose Claude Code, select a model and apply the profile.
4. Use Claude Code as normal, and check Logs for the resolved provider and model.

The CLI starts the same gateway with a browser management screen instead of the Electron app:

```sh
npm install -g @musistudio/claude-code-router
ccr ui
```

Then open `http://127.0.0.1:3458` and follow the same steps; the gateway stays on port 3456. There is a Docker route too, and the README says to read its Docker guide before you expose CCR remotely.

## Which models and providers can it use?

Custom compatible providers, in the README's words, plus a list of named presets. These rows are our selection from the README, read 14 Oct 2026:

| Type | What the README names |
| --- | --- |
| API formats | OpenAI Chat and Responses, Anthropic Messages, Gemini Generate Content and Interactions |
| Hosted providers | OpenRouter, DeepSeek, SiliconFlow, Moonshot, Kimi Code, Mistral, Z.AI, Bailian |
| Your own endpoint | Custom compatible providers |
| Extra capabilities | Fusion vision, web search, MCP tools, ToolHub |

<figure class="mg" data-scene="chime"><img src="/blog/assets/media/claude-code-router/chime.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A wind chime hangs from one bar labelled CCR. Its tubes are labelled OpenRouter, DeepSeek, SiliconFlow, Moonshot, Mistral and Z.AI, and a breeze touches each tube in turn so it swings."><figcaption>Some of the hosted providers CCR's README named on 14 Oct 2026.</figcaption></figure>

DeepSeek also publishes its own Claude Code setup with no gateway in between; see [DeepSeek V4.1 Flash 1017](/blog/deepseek-v4-1-flash-1017/).

## What are the trade offs?

You leave Anthropic's support behind, and some Claude Code features may not make the trip. Anthropic's [LLM gateway docs](https://code.claude.com/docs/en/llm-gateway) say Anthropic "doesn't endorse, maintain, or audit third-party gateway products, and doesn't support routing Claude Code to non-Claude models through any gateway."

Anthropic's gateway docs add that Claude Code gains capabilities with each release, and "a gateway that doesn't forward them breaks the corresponding features", so the gateway has to keep up. On billing, the gateway docs say that while a gateway credential is active, requests carry it in place of your claude.ai login, the subscription's usage limits don't apply, and the traffic is billed per token to whoever owns the credential.

<figure class="mg" data-scene="boat"><img src="/blog/assets/media/claude-code-router/boat.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A paper boat marked Claude Code carries four small flags toward a lock gate marked gateway. The gate lifts part way, the boat passes under it, and its two tall flags stay behind on the bank."><figcaption>A gateway that doesn't forward new capabilities breaks those features. Anthropic's gateway docs, 14 Oct 2026.</figcaption></figure>

We think the bigger risk is the model, not the router: try a small task on any model Claude Code was not built for before you trust it with a refactor. Our [Ollama guide](/blog/how-to-connect-ollama-to-claude-code/) lists what breaks when Claude Code runs on a local model. If price is the reason you are looking, compare first with [what Claude Code costs](/blog/how-much-does-claude-code-cost/) on a plan.

## What are the other options?

Another gateway, Anthropic's own gateway, a local model, or a different agent. [OmniRoute](https://github.com/diegosouzapw/OmniRoute) is another MIT licensed gateway, and its GitHub description said on 14 Oct 2026 that it works with Claude Code, Codex, Cursor, OpenCode, Cline and Copilot.

If you want a gateway for Claude models with budgets and audit logs, Anthropic's docs point to Claude apps gateway, its self-hosted gateway with SSO sign-in. For local models, our Ollama guide covers `ollama launch claude`. For an agent built around many models from the start, see [Claude Code alternatives](/blog/claude-code-alternatives/).

## Can you use it with Munder Difflin?

Munder Difflin runs Claude Code as you have it set up on your machine. Setup is in [how to install and use Munder Difflin](/blog/how-to-install-and-use-munder-difflin/).

<link rel="stylesheet" href="/blog/assets/media/claude-code-router/motion.css"><script defer src="/blog/assets/media/claude-code-router/motion.js"></script>
