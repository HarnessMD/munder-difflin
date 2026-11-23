---
title: "GPT-6.2 Astra and Sol: Price, Specs and How to Use Them in Codex (Nov 2026)"
seoTitle: "GPT-6.2 Astra and Sol (Nov 2026): Price, Context Window, Codex"
description: "GPT-6.2 Astra and GPT-6.2 Sol are OpenAI's newest models: API prices, context window, cutoff and how to pick them in Codex, checked 18 Nov 2026."
date: 2026-11-18
category: concepts
categoryLabel: Concepts
type: Non-technical
primaryKeyword: "gpt-6.2 astra"
secondaryKeywords: ["gpt-6.2 sol", "gpt-6.2-astra", "gpt-6.2-sol", "gpt-6.2 astra pricing", "gpt-6.2 astra vs sol", "gpt-6.2 codex"]
tags: ["Concepts", "Codex", "OpenAI", "Models"]
faq:
  - q: "How much does GPT-6.2 Astra cost?"
    a: "$8 per million input tokens and $40 per million output tokens on OpenAI's model page, read on 18 Nov 2026. Cached input is $0.40. Requests over 272K input tokens pay double the input and cache rates and 1.5 times output for the whole request, and Batch costs 50% of Standard."
  - q: "How much does GPT-6.2 Sol cost?"
    a: "$2 per million input tokens and $10 per million output tokens, with cached input at $0.10, on OpenAI's model page read on 18 Nov 2026. In Codex, OpenAI's models page says Sol costs fewer credits per token than GPT-6.2 Astra at Standard speed."
  - q: "How do I use GPT-6.2 Astra in Codex?"
    a: "In the Codex CLI, run codex -m gpt-6.2-astra, or type /model inside a session and choose it. In the ChatGPT desktop app, if you see the Power slider, open Advanced and pick GPT-6.2 Astra on a supported plan, per OpenAI's Codex models page on 18 Nov 2026."
  - q: "What is the GPT-6.2 Astra context window?"
    a: "1,050,000 tokens, with up to 922,000 input tokens and 128,000 output tokens, and a knowledge cutoff of 18 May 2026, per OpenAI's model page read on 18 Nov 2026. Codex starts it at 272,000 tokens; set model_context_window in config.toml to raise that."
  - q: "What is the difference between GPT-6.2 Astra and GPT-6.2 Sol?"
    a: "OpenAI calls Astra its most capable model for the hardest projects and Sol its go to model for everyday work. Both have a 1,050,000 token context window and take text and images. Astra costs $8 input and $40 output per million tokens and Sol $2 and $10, as of 18 Nov 2026."
---

GPT-6.2 Astra is "Our most capable model for your hardest projects, from start to finish", in OpenAI's [words](https://developers.openai.com/api/docs/models/gpt-6.2-astra), and GPT-6.2 Sol is its cheaper everyday model. Both reached the API on 17 Nov 2026. Astra costs $8 per million input tokens and $40 output as of 18 Nov 2026, Sol $2 and $10. Checked 18 Nov 2026.

Codex is one of the engines in [Munder Difflin](https://harnessmd.com/download), free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. Our [install guide](/blog/how-to-install-and-use-munder-difflin/) walks through setup, and the [GPT-6.1 Terra page](/blog/gpt-6-1-terra/) covers the fast, efficient model in the same lineup.

## GPT-6.2 Astra and Sol at a glance, checked 18 Nov 2026

Read on 18 Nov 2026 from the [GPT-6.2 Astra](https://developers.openai.com/api/docs/models/gpt-6.2-astra) and [GPT-6.2 Sol](https://developers.openai.com/api/docs/models/gpt-6.2-sol) model pages, the [API changelog](https://developers.openai.com/api/docs/changelog) and the [Codex models page](https://learn.chatgpt.com/docs/models).

| Spec | GPT-6.2 Astra | GPT-6.2 Sol |
| --- | --- | --- |
| Model ID | `gpt-6.2-astra` | `gpt-6.2-sol` |
| Released in the API | 17 Nov 2026 | 17 Nov 2026 |
| Price per 1M tokens, 18 Nov 2026 | $8 input, $40 output | $2 input, $10 output |
| Context window | 1,050,000 tokens | 1,050,000 tokens |
| Maximum input | 922,000 tokens | 922,000 tokens |
| Maximum output | 128,000 tokens | 128,000 tokens |
| Knowledge cutoff | 18 May 2026 | 1 Jun 2026 |
| Default context in Codex | 272,000 tokens | 500,000 tokens |

Yes, the cheaper model has the later knowledge cutoff, by two weeks.

## What is GPT-6.2 Astra?

GPT-6.2 Astra is OpenAI's most capable model, released on 17 Nov 2026 for long, hard work. The [models overview](https://developers.openai.com/api/docs/models) calls it "our flagship model for complex reasoning and coding", and its model page says it "can build and revise software, use a computer, and work with documents." It reads text and images and writes text.

OpenAI's [GPT-6.2 guide](https://developers.openai.com/api/docs/guides/latest-model) lists how it behaves:

- **Shorter answers.** It is "more concise and direct by default than earlier models", so revisit "be concise" in your system prompt.
- **More check ins.** When intent is unclear, it "may propose a next step and wait for confirmation".
- **Code.** It "tends to write more efficient, high-quality code than its predecessors".

In the Responses API it supports tools such as web search, computer use, hosted shell and MCP, and it can delegate work to subagents through a beta feature. Fine tuning is not supported.

## What is GPT-6.2 Sol?

GPT-6.2 Sol is the model OpenAI suggests for everyday work, at a quarter of Astra's token price on 18 Nov 2026. Its [model page](https://developers.openai.com/api/docs/models/gpt-6.2-sol) calls it "Our go-to model for everyday work, from coding to powering agents at scale", and the models overview says to choose it "to balance intelligence and cost".

Two API changes apply to both. From GPT-6.2, the API "will drop reasoning items" after edits to earlier conversation history, a model downgrade, or a change of end user or organization, and then "answer quality can decline and the model may use more tokens to repeat earlier work." Both model pages say the API rejects reasoning effort `none`; the guide says to start at `medium`, or `low` if you used `none` or `minimal`.

The models overview lists four flagship models: GPT-6.2 Astra, GPT-6.2 Sol, GPT-6.1 Terra and GPT-6 Luna.

<figure class="mg" data-scene="orrery"><img src="/blog/assets/media/gpt-6-2-astra-and-sol/orrery.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a small blue and grey orrery turns slowly. Four planets circle a centre post, labelled GPT 6.2 Astra, GPT 6.2 Sol, GPT 6.1 Terra and GPT 6 Luna. The two GPT 6.2 planets glow yellow and a card drops in reading New on 17 Nov 2026. Tapping the scene replays the animation."><figcaption>OpenAI's flagship models on 18 Nov 2026: GPT-6.2 Astra, GPT-6.2 Sol, GPT-6.1 Terra and GPT-6 Luna, per its models page.</figcaption></figure>

## How much do GPT-6.2 Astra and Sol cost?

Astra costs $8 per million input tokens and $40 per million output tokens, and Sol costs $2 and $10, as of 18 Nov 2026 on OpenAI's model pages.

<figure class="mg" data-scene="scale"><img src="/blog/assets/media/gpt-6-2-astra-and-sol/scale.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a kitchen balance holds two price tags. The left tag reads GPT 6.2 Astra, $8 in, $40 out. The right tag reads GPT 6.2 Sol, $2 in, $10 out. The Astra side sinks, and a mint label pops up below reading per 1M tokens, 18 Nov 2026. Tapping the scene replays the animation."><figcaption>API prices per 1M tokens on OpenAI's GPT-6.2 model pages, read 18 Nov 2026.</figcaption></figure>

Two older models, from their own pages on the same day:

| Price per 1M tokens, 18 Nov 2026 | Input | Cached input | Output |
| --- | --- | --- | --- |
| **GPT-6.2 Astra** | $8 | $0.40 | $40 |
| GPT-6 Astra | $10 | $1 | $50 |
| **GPT-6.2 Sol** | $2 | $0.10 | $10 |
| GPT-6.1 Sol | $2 | $0.10 | $10 |

Rules on the GPT-6.2 model pages that change the bill:

- Over 272K input tokens, input and cache rates double and output costs 1.5 times, for the whole request.
- Batch costs 50% of Standard and Fast mode twice Standard (18 Nov 2026).
- Ultrafast costs 3 times Standard through 28 Feb 2027 and 6 times from 1 Mar 2027, Pacific time.
- Cache writes cost $10 per million tokens for Astra and $2.50 for Sol for 30 minutes of retention, and $20 and $5 for 12 hours on short context requests at Standard (18 Nov 2026).
- The changelog for 17 Nov adds background completion windows in public beta, at rates 30% below Standard for two hours and 40% below for eight.

Inside Codex, the Codex models page says Sol "costs fewer credits per token than GPT-6.2 Astra at Standard speed". For ChatGPT plans and credits, see [Codex pricing](/blog/codex-pricing/).

## How do I use GPT-6.2 Astra and Sol in Codex?

Pick them by name: OpenAI's [Codex models page](https://learn.chatgpt.com/docs/models), read on 18 Nov 2026, lists both for the Codex app and CLI on supported plans.

- **Codex CLI**: `codex --model gpt-6.2-sol` (or `-m`) starts a session, and `codex exec -m gpt-6.2-sol "Review the current changes"` runs one without the interactive screen. Inside a session, `/model` switches models and reasoning effort. For Astra, the page shows `codex -m gpt-6.2-astra`.
- **Default model**: add `model = "gpt-6.2-sol"` to `config.toml`.
- **ChatGPT desktop app**: use the model control beneath the composer; if you see the Power slider, open **Advanced** to choose a specific model. New Work chats start on GPT-6.2 Sol at Light on supported consumer plans.

Codex gives Astra a default context of 272,000 tokens and Sol 500,000. To go further, set `model_context_window` in `config.toml`; the page says both "support a context window of up to 1 million tokens".

<figure class="mg" data-scene="measuringcup"><img src="/blog/assets/media/gpt-6-2-astra-and-sol/measuringcup.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, two glass measuring cups stand side by side, labelled GPT 6.2 Astra and GPT 6.2 Sol. Blue liquid rises in the first to a line reading 272,000 tokens and in the second to a line reading 500,000 tokens. A dotted line near both rims then fades in, reading up to 1 million with model_context_window. Tapping the scene replays the animation."><figcaption>Default context in Codex: 272,000 tokens for Astra and 500,000 for Sol, up to 1 million with a config change, per OpenAI's Codex models page on 18 Nov 2026.</figcaption></figure>

The page names a minimum CLI version only for GPT-6.1 Terra (0.159.0), and the newest stable [Codex release](https://github.com/openai/codex/releases) on 18 Nov 2026, 0.169.0 from 13 Nov, does not mention GPT-6.2. Our view: if `/model` does not list them, update the CLI first.

## Which one should you pick?

Use Sol by default and Astra for the hardest jobs, which is how OpenAI's Codex models page splits them on 18 Nov 2026:

- **GPT-6.2 Astra**: "demanding work across code, apps, or research". Its Codex example: "trace a bug across services, fix it, and test the change".
- **GPT-6.2 Sol**: "everyday coding, writing, and work across several sources".
- **GPT-6.1 Terra**: "a fast, efficient choice for writing, visual understanding, and computer use".
- **GPT-6 Luna**: "focused, repeatable tasks".

Our view: start on Sol and switch to Astra with `/model` when a task crosses several services or the first attempt goes wrong. Astra's output costs four times Sol's on 18 Nov 2026 and its Codex default context is smaller, so it should earn its place. In the API, keep earlier history unchanged, or the model may redo work you already paid for.

Weighing Codex against other agents? See [Codex alternatives](/blog/codex-alternatives/).

<link rel="stylesheet" href="/blog/assets/media/gpt-6-2-astra-and-sol/motion.css"><script defer src="/blog/assets/media/gpt-6-2-astra-and-sol/motion.js"></script>
