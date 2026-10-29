---
title: "What Is Kimi K3.1 Pro? Price, Weights and How to Use It for Coding (Oct 2026)"
seoTitle: "Kimi K3.1 Pro (2026): Price, Weights, Codex and Claude Code"
description: "Kimi K3.1 Pro is Moonshot's 1M context coding model, weights due by 4 Nov. Price, Terminal-Bench score and setup in Kimi Code, Codex and Claude Code."
date: 2026-10-29
category: concepts
categoryLabel: Concepts
type: Non-technical
primaryKeyword: "kimi k3.1 pro"
secondaryKeywords: ["what is kimi k3.1 pro", "kimi k3.1 pro price", "kimi k3.1 pro weights", "kimi k3.1 pro codex", "kimi k3.1 pro claude code", "kimi k3.1 pro highspeed"]
tags: ["Concepts", "Open Source", "AI Agents", "Codex"]
faq:
  - q: "Is Kimi K3.1 Pro open source?"
    a: "Not yet. Kimi's launch post calls it its most capable 3T class open weight model and says the full weights will be released by 4 November 2026. Until then it is available on Kimi's apps, Kimi Work, Kimi Code, the Kimi API and OpenRouter. Checked 29 Oct 2026."
  - q: "How much does Kimi K3.1 Pro cost?"
    a: "OpenRouter listed moonshotai/kimi-k3.1-pro at $2 per million input tokens, $10 per million output tokens and $0.20 per million cached input tokens on 29 Oct 2026. Kimi's own pricing page says its API is pay as you go with no subscription and no tiering by context length."
  - q: "Can I use Kimi K3.1 Pro in Codex?"
    a: "Yes. Kimi's Codex guide, read 29 Oct 2026, says Codex can use kimi-k3.1-pro directly through Kimi's Responses API, with no proxy. You add a kimi provider in ~/.codex/config.toml with base_url https://api.moonshot.ai/v1 and wire_api set to responses."
  - q: "What is the difference between Kimi K3.1 Pro and K3.1 Pro Highspeed?"
    a: "Speed. Kimi's launch post says Kimi K3.1 Pro Highspeed delivers 2 to 3 times the speed of K3.1 Pro for more responsive interactions. Its API model ID is kimi-k3.1-pro-highspeed."
  - q: "Can you turn off thinking in Kimi K3.1 Pro?"
    a: "No. Kimi's quickstart says K3.1 Pro always has thinking mode on. You set reasoning_effort to low, high or max, and max is the default."
---

Kimi K3.1 Pro is Moonshot AI's coding and agent model with a 1M token context window, available through Kimi's apps, Kimi Code and the Kimi API, with open weights promised by 4 November 2026. On Kimi's own Terminal-Bench 4.0 table it sits 0.7 points behind Claude Opus 5.5. Checked 29 Oct 2026.

For a team of agents on your own work, [Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. For another open model released this week, see [Mistral Large 4](/blog/mistral-large-4/). This page sits in our [Concepts hub](/blog/topics/concepts/).

<figure class="mg" data-scene="highjump"><img src="/blog/assets/media/what-is-kimi-k3-1-pro/highjump.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, three high jump bars rise to 58.2, 65.7 and 66.4 on a scale titled Terminal-Bench 4.0, labelled GPT-6 Astra, Kimi K3.1 Pro and Claude Opus 5.5. A small ruler slides between the two highest bars and reads 0.7 points. Tapping a bar shows its source."><figcaption>Terminal-Bench 4.0 figures from Kimi's launch post: Claude Opus 5.5 66.4%, Kimi K3.1 Pro 65.7%, GPT-6 Astra 58.2%.</figcaption></figure>

## What is Kimi K3.1 Pro?

It is the first model in Kimi's K3.1 series, a post trained version of Kimi K3. Kimi's [launch post](https://kimi.ai/blog/kimi-k3-1-pro) calls it "our most capable 3T-class open-weight model to date", with improvements "across coding, 3D creation, financial research, and other agentic capabilities". OpenRouter first listed it on 23 Oct 2026.

A faster variant, Kimi K3.1 Pro Highspeed, "delivers 2-3× the speed of K3.1 Pro", the post says. Moonshot posted it on 23 Oct 2026, and the [Hacker News thread](https://news.ycombinator.com/item?id=50212065) had more than 1,090 points and 670 comments when we checked on 29 Oct 2026.

Kimi's [quickstart](https://platform.kimi.ai/docs/guide/kimi-k3-1-pro-quickstart.md) adds three facts that matter for agents: thinking is always on, `reasoning_effort` takes low, high or max (the default), and the API accepts text, images and video.

## How good is it at coding?

Close to the top on Kimi's own figures. On Terminal-Bench 4.0, the post gives "65.7%, ahead of GPT-6 Astra (58.2%) and narrowly behind Claude Opus 5.5 (66.4%)". Kimi says it ran its model "with the Claude-Code harness" and took rivals' scores from their posts or the official leaderboard, so the margin depends on setup.

On Kimi Code Bench 3.0 Long-horizon, an internal test, it scores 61.2% against K3's 55.95%. Artificial Analysis wrote on 28 Oct 2026 that Kimi K3.1 Pro scores 1678 Elo on its AA-Briefcase knowledge work test, above Muse Wonder (1659) and Grok 4.7 (1638).

## How much does it cost?

On 29 Oct 2026, OpenRouter listed it at $2 per million input tokens, $10 per million output tokens and $0.20 per million cached input tokens, with a 1,048,576 token context. Kimi's [pricing page](https://platform.kimi.ai/docs/pricing/chat.md) says the API is pay as you go, "with no subscription plan", and the quickstart says there is "no tiering by context length".

Because thinking is always on, output tokens include reasoning. Setting `reasoning_effort` to low is the lever Kimi gives for cost and speed.

<figure class="mg" data-scene="route"><img src="/blog/assets/media/what-is-kimi-k3-1-pro/route.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a parcel tracking line draws three stops: Launched 23 Oct with a tick, API and apps today with a tick, and Weights by 4 Nov with an empty circle. A small parcel labelled Kimi K3.1 Pro moves along the line and waits at the last stop."><figcaption>Launch on 23 Oct 2026 and weights promised by 4 Nov 2026, from Kimi's launch post and OpenRouter's listing.</figcaption></figure>

## When are the weights out?

By 4 November 2026, Kimi says: "Full model weights will be released by Nov 4, 2026." Until then you rent it. The post also says Kimi removed cyber related data from training for the open release, and that its offensive cyber skill "remains behind that of frontier proprietary models".

## How do you use it for coding?

Three routes, from Kimi's own docs, read 29 Oct 2026:

1. **Kimi Code.** Run Kimi Code and pick Kimi K3.1 Pro with the `/model` command, the launch post says. Kimi Code CLI also takes a Kimi API key.
2. **Codex.** Kimi's [Codex guide](https://platform.kimi.ai/docs/guide/codex-kimi.md) says Codex "can use the `kimi-k3.1-pro` model directly" through Kimi's Responses API, with this in `~/.codex/config.toml`:

```toml
model = "kimi-k3.1-pro"
model_provider = "kimi"
model_context_window = 1048576

[model_providers.kimi]
name = "Kimi"
base_url = "https://api.moonshot.ai/v1"
env_key = "KIMI_API_KEY"
wire_api = "responses"
```

3. **Claude Code.** Kimi's [Claude Code guide](https://platform.kimi.ai/docs/guide/claude-code-kimi.md) points Claude Code at its Anthropic compatible endpoint, `https://api.moonshot.ai/anthropic`, through `ANTHROPIC_BASE_URL` in `~/.claude/settings.json`. Its example sets the model to `kimi-k3[1m]`, and its test call uses `kimi-k3.1-pro`.

Both guides need a key from the Kimi API Platform. Our [Codex CLI install guide](/blog/how-to-install-codex-cli/) covers Codex itself.

<figure class="mg" data-scene="plugs"><img src="/blog/assets/media/what-is-kimi-k3-1-pro/plugs.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a power strip labelled Kimi API lights up as three plugs slide into it one by one, labelled Kimi Code, Codex and Claude Code. Each plug shows a small tag: model picker, config.toml and settings.json. Tapping a plug shows the endpoint it uses."><figcaption>Kimi's docs, read 29 Oct 2026, cover Kimi Code, Codex through the Responses API and Claude Code through the Anthropic compatible endpoint.</figcaption></figure>

## Should you switch to it?

Try it if you want a cheaper model close to Claude Opus 5.5 on terminal coding, and if open weights matter to you later. Wait for independent scores and the weights if you plan to self host.

Munder Difflin runs a team of agents for research, writing, ops and coding on engines such as Claude Code, Codex and Gemini CLI, takes work in from Slack and webhooks, and connects tools through MCP servers, skills and plugins. The agents run on your computer today; a Cloud Office and a mobile app are coming soon. [How to install and use Munder Difflin](/blog/how-to-install-and-use-munder-difflin/) walks through setup, and [Mistral Large 4 vs Claude Opus 5.5](/blog/mistral-large-4-vs-claude-opus-5-5/) compares another open model with Opus.

<link rel="stylesheet" href="/blog/assets/media/what-is-kimi-k3-1-pro/motion.css"><script defer src="/blog/assets/media/what-is-kimi-k3-1-pro/motion.js"></script>
