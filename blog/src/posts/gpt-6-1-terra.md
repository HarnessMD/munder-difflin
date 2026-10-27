---
title: "GPT-6.1 Terra: Price, Specs and How to Use It in Codex (Oct 2026)"
seoTitle: "GPT-6.1 Terra (Oct 2026): Price, Context Window, Codex Setup"
description: "GPT-6.1 Terra is OpenAI's fast new model for images, computer use and writing: price, specs and how to pick it in Codex, checked 27 Oct 2026."
date: 2026-10-27
category: concepts
categoryLabel: Concepts
type: Non-technical
primaryKeyword: "gpt-6.1 terra"
secondaryKeywords: ["gpt 6.1 terra", "gpt-6.1-terra", "gpt-6.1 terra pricing", "gpt-6.1 terra vs gpt-5.6 terra", "gpt-6.1 terra codex", "gpt 6.1"]
tags: ["Concepts", "Codex", "OpenAI", "Models"]
faq:
  - q: "How much does GPT-6.1 Terra cost?"
    a: "$1 per million input tokens and $5 per million output tokens on OpenAI's model page, read on 27 Oct 2026. Cached input is $0.05. Prompts over 272K input tokens cost 2x input and 1.5x output for the whole request, and Batch and Flex are 50% lower."
  - q: "Is GPT-6.1 Terra cheaper than GPT-5.6 Terra?"
    a: "Yes. OpenAI's model pages list GPT-5.6 Terra at $2 input and $12 output per million tokens, against $1 and $5 for GPT-6.1 Terra, both read on 27 Oct 2026."
  - q: "How do I use GPT-6.1 Terra in Codex?"
    a: "In the Codex CLI, version 0.159.0 or later, run codex -m gpt-6.1-terra. In the ChatGPT desktop app, open Advanced under the composer and pick it from the model list where your plan offers it, per OpenAI's Codex models page on 27 Oct 2026."
  - q: "What is the GPT-6.1 Terra context window?"
    a: "1,050,000 tokens, with up to 922,000 input tokens and 128,000 output tokens, and a knowledge cutoff of 1 June 2026, per OpenAI's model page read on 27 Oct 2026."
---

GPT-6.1 Terra is OpenAI's new fast, efficient model for visual reasoning, computer use and writing. OpenAI released it on 26 October 2026. Its API price is $1 per million input tokens and $5 per million output tokens as of 27 Oct 2026, half or less of the GPT-5.6 Terra price.

Codex is one of the engines in [Munder Difflin](https://harnessmd.com/download), free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. The [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup. New to Codex? Start with [what is Codex](/blog/what-is-codex/).

## What is GPT-6.1 Terra?

The third of four models in OpenAI's GPT-6 lineup, between GPT-6.1 Sol and GPT-6 Luna. OpenAI's [GPT-6 guide](https://developers.openai.com/api/docs/guides/latest-model), read on 27 Oct 2026, describes them like this:

- **GPT-6 Astra**: "Highest intelligence".
- **GPT-6.1 Sol**: balanced speed, cost and intelligence.
- **GPT-6.1 Terra**: "Fast and efficient".
- **GPT-6 Luna**: the fastest and most cost effective.

The guide's examples for Terra: matching product photos to catalog entries, comparing technical drawings, acting on application screens, and drafting and revising text. The [API changelog](https://developers.openai.com/api/docs/changelog) lists the release under Oct 26. The [Hacker News thread](https://news.ycombinator.com/item?id=50248124) had 215 points when we checked on 27 Oct 2026.

<figure class="mg" data-scene="lineup"><img src="/blog/assets/media/gpt-6-1-terra/lineup.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, four labelled boxes stand in a row from tall to short: Astra, Sol, Terra and Luna. The Terra box lifts slightly and a yellow tag drops onto it reading Fast and efficient, while three small icons appear beside it: a picture, a pointer arrow and a pencil."><figcaption>GPT-6.1 Terra sits third in OpenAI's GPT-6 lineup, per its GPT-6 guide on 27 Oct 2026.</figcaption></figure>

## What does GPT-6.1 Terra cost?

$1 per million input tokens and $5 per million output tokens, on OpenAI's [model page](https://developers.openai.com/api/docs/models/gpt-6.1-terra) read on 27 Oct 2026. Cached input is $0.05, which the page says is 5% of the input rate (27 Oct 2026).

| Price per 1M tokens, 27 Oct 2026 | Input | Cached input | Output |
| --- | --- | --- | --- |
| GPT-6 Astra | $10 | $1 | $50 |
| GPT-6.1 Sol | $2 | $0.10 | $10 |
| **GPT-6.1 Terra** | **$1** | **$0.05** | **$5** |
| GPT-5.6 Terra | $2 | $0.20 | $12 |
| GPT-6 Luna | $0.10 | $0.01 | $0.50 |

Five rules on the model page change the bill:

- Prompts over 272K input tokens cost 2x the input and cache rates and 1.5x output, for the full request.
- Batch and Flex prices are 50% lower than Standard.
- Fast mode costs 2x Standard.
- Cache writes cost $1.25 per million tokens for 30 minute retention and $2.50 for 12 hour retention (27 Oct 2026).
- Regional processing adds 10% where available.

For ChatGPT plan prices rather than API prices, see [Codex pricing](/blog/codex-pricing/).

<figure class="mg" data-scene="tags"><img src="/blog/assets/media/gpt-6-1-terra/tags.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A white price tag reads GPT-5.6 Terra, $2 in and $12 out. A second, smaller tag slides in front of it reading GPT-6.1 Terra, $1 in and $5 out, and a small mint label pops up beside it saying per 1M tokens."><figcaption>API prices per 1 million tokens on OpenAI's model pages, read 27 Oct 2026.</figcaption></figure>

## What is GPT-6.1 Terra good at?

Images, screens and text. The model page calls it "A fast, efficient model for visual reasoning, precise computer use, and clear, natural writing". It takes text and images as input and writes text; audio and video are not supported.

Its reasoning effort has six settings, from `none` to `max`, with `medium` as the default. The guide says to start with `medium` and raise it "if the improvement in quality is worth the added time and tokens". GPT-6.1 Sol, by contrast, has no `none` setting; its lowest is `low`.

In the Responses API, Terra can use web search, file search, image generation, code interpreter, hosted shell, apply patch, skills, computer use, MCP and tool search. Tool calling requires the Responses API, and fine tuning is not supported.

<figure class="mg" data-scene="dial"><img src="/blog/assets/media/gpt-6-1-terra/dial.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A round dial on a white card has six stops labelled none, low, medium, high, xhigh and max. The pointer starts at medium, which glows yellow as the default, then sweeps up to max and back to medium."><figcaption>Six reasoning effort settings, medium by default, per OpenAI's model page on 27 Oct 2026.</figcaption></figure>

## How do you use GPT-6.1 Terra in Codex and ChatGPT?

Pick it by name. OpenAI's [Codex models page](https://developers.openai.com/codex/models), read on 27 Oct 2026, lists it in these places:

- **Codex CLI**, version 0.159.0 or later: run `codex -m gpt-6.1-terra`, or switch inside a session with `/model`.
- **Work and Codex in the ChatGPT desktop app**: open **Advanced** under the composer and choose it from the model list; OpenAI says the options vary by plan, workspace and rollout.
- **ChatGPT Work on the web.**
- **The API**, which the model page says supports the Responses and Chat Completions endpoints.

The same page calls Terra "a fast, efficient choice for writing, visual understanding, and computer use". For screen work in the desktop app, see [Codex computer use](/blog/codex-computer-use/).

## Which GPT-6 model should you pick in Codex?

The Codex models page, read on 27 Oct 2026, starts from the kind of work:

- **GPT-6 Astra** suits the most demanding workflows.
- **GPT-6.1 Sol** offers near Astra performance at a lower cost than Astra.
- **GPT-6.1 Terra** is the fast, efficient choice for writing, visual understanding and computer use.
- **GPT-6 Luna** suits focused, repeatable tasks.

The page says these picks apply to ChatGPT Work and Codex. Moving from GPT-5.6 Terra? The guide says to compare both models on representative images and workflows at the same reasoning effort, and to move tool calls from Chat Completions to the Responses API.

<figure class="mg" data-scene="switch"><img src="/blog/assets/media/gpt-6-1-terra/switch.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A white terminal window shows the line codex -m gpt-6.1-terra being typed. A small card below it labelled Codex CLI 0.159.0 or later gets a mint tick, and the model chip on the window changes to 6.1 Terra."><figcaption>The Codex CLI needs version 0.159.0 or later for GPT-6.1 Terra, per OpenAI's Codex models page on 27 Oct 2026.</figcaption></figure>

## GPT-6.1 Terra at a glance, checked 27 Oct 2026

| Spec | GPT-6.1 Terra |
| --- | --- |
| Model ID | `gpt-6.1-terra` |
| Released | 26 Oct 2026 |
| Context window | 1,050,000 tokens |
| Maximum input | 922,000 tokens |
| Maximum output | 128,000 tokens |
| Knowledge cutoff | 1 Jun 2026 |
| Input and output | Text and images in, text out |
| Price as of 27 Oct 2026 | $1 input, $5 output per 1M tokens |
| Reasoning effort | none, low, medium (default), high, xhigh, max |

<link rel="stylesheet" href="/blog/assets/media/gpt-6-1-terra/motion.css"><script defer src="/blog/assets/media/gpt-6-1-terra/motion.js"></script>
