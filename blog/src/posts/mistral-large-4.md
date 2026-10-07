---
title: "Mistral Large 4 (Le Chonk): size, price, scores and weights"
description: "Mistral Large 4 is a 1 trillion parameter open weight model in public preview. Context window, API price, Mistral's own scores and weights, checked 6 Oct 2026."
date: 2026-10-06
category: concepts
categoryLabel: Concepts
type: Non-technical
primaryKeyword: "mistral large 4"
secondaryKeywords: ["mistral large 4 benchmarks", "mistral large 4 pricing", "mistral large 4 open weights", "le chonk mistral", "mistral large 4 vs", "mistral large 4 context window"]
tags: ["Concepts", "Open Source", "AI Agents"]
faq:
  - q: "Is Mistral Large 4 open source?"
    a: "Mistral calls it open weight, and the weights are not out yet. Its launch post of 6 October 2026 says it will release the weights by the end of the month. When we checked Mistral's model page on 6 Oct 2026, both the weights and the licence were marked Coming soon. VentureBeat reported the same day that the weights are expected under a custom Mistral license."
  - q: "What is the Mistral Large 4 context window?"
    a: "1M tokens. Mistral's model page listed a context size of 1M tokens on 6 Oct 2026, and defines the context window as the maximum number of input plus output tokens the model can process at once."
  - q: "How much does Mistral Large 4 cost?"
    a: "Mistral's model page listed $0.68 per million input tokens, $0.07 per million cached input tokens and $2.09 per million output tokens on 6 Oct 2026. The same page showed $1.36, $0.14 and $4.18 struck through, and the launch post lists $1.36 and $4.18. The page did not say how long the lower prices last."
  - q: "Why is Mistral Large 4 called Le Chonk?"
    a: "It is Mistral's own nickname for the model. The launch post of 6 October 2026 says the model is unofficially ML4 and very officially le Chonk. Mistral describes it as its largest and most capable model to date."
  - q: "Is Mistral Large 4 better than Kimi K3?"
    a: "It depends on the test, on the figures Mistral published. Mistral's charts show Kimi K3 ahead on DeepSWE 1.1 (68 against 62) and Mistral Large 4 ahead on Terminal-Bench 4 (28 against 21). VentureBeat reported on 6 October 2026 that Mistral's ranking claim remains provisional until outsiders can test the released weights."
---

Our view: Mistral Large 4, nicknamed Le Chonk, is a serious open weight coding model that you can only rent for now. Mistral launched it as a public preview on 6 October 2026, with about 1 trillion parameters, a 1M token context window, an API you can call today and weights promised this month. Checked 6 Oct 2026.

Open models can drive coding agents, which is why we care. [Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of coding agents such as Claude Code, Codex and Gemini CLI on your own computer. We have not tried Mistral Large 4 with it. Our guide to [running Munder Difflin on open models](/blog/run-munder-difflin-on-open-models/) covers the models you can use now, the [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup, and the [Concepts hub](/blog/topics/concepts/) explains the terms.

## What is Mistral Large 4?

Mistral Large 4 is Mistral's largest model so far, released as a public preview. The [launch post](https://mistral.ai/news/mistral-large-4/) says the model is "unofficially ML4, very officially: le Chonk". Yes, that is the vendor's wording, not ours.

Mistral's [model page](https://docs.mistral.ai/models/mistral-large-4-0) describes an open-weight, general-purpose multimodal model with a Mixture-of-Experts architecture. The launch post says it takes multimodal input and was trained on more than 160 languages. [VentureBeat](https://venturebeat.com/technology/mistral-debuts-large-4-le-chonk-a-1-trillion-parameter-text-output-model-with-high-benchmarks-planned-for-open-weights-release) describes it as a text output model.

The [Hacker News thread](https://news.ycombinator.com/item?id=49977979) had more than 750 points and 430 comments when we checked on 6 Oct 2026.

## How big is it, and what is the context window?

It has about 1 trillion parameters and a 1M token context window. The launch post of 6 October 2026 says "1 trillion-parameter" with 49 billion active parameters. The model page is more exact: 1.05T total parameters, 49B active, and a 1.6B vision encoder.

In plain words: the total sets how big the download will be, and the active count sets how much work each token costs. The model page lists the context size as 1M tokens, counting input and output together.

<figure class="mg" data-scene="scales"><img src="/blog/assets/media/mistral-large-4/scales.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A kitchen scale holds a very large flour sack labelled 1.05T total parameters. A small scoop labelled 49B active lifts out of the sack for each new token on a belt beside it, then tips back in."><figcaption>Mistral's model page lists 1.05T total parameters and 49B active, as of 6 Oct 2026.</figcaption></figure>

## Can you download the weights, and what is the licence?

No, not yet. The launch post says "We will release the weights by the end of the month", and that until then Mistral is red-teaming the model with cybersecurity partners and state authorities. On the model page, the Weights tab showed "Coming soon" for both the weights and the licence on 6 Oct 2026.

VentureBeat reported on 6 October 2026 that Mistral plans to publish the weights on Oct. 27, and that they are "expected under a custom Mistral license". Mistral's own pages did not name a licence when we checked. Our view: do not plan a commercial self-hosted deployment until the licence text is public.

<figure class="mg" data-scene="crate"><img src="/blog/assets/media/mistral-large-4/crate.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A crate marked Mistral Large 4 rolls in on a trolley. Its delivery slip is stamped Coming soon twice, once for weights and once for licence. A wall calendar for October tears off its pages from 6 to 31, with notes for VentureBeat's Oct. 27 and Mistral's end of month."><figcaption>Weights and licence were both marked Coming soon on Mistral's model page on 6 Oct 2026. Mistral says the weights arrive by the end of the month.</figcaption></figure>

## What does Mistral Large 4 cost on the API?

Input costs $0.68 per million tokens and output costs $2.09, on the price Mistral's model page listed on 6 Oct 2026. The page showed a higher figure struck through beside each price, and the launch post lists those higher figures. Neither page said how long the lower prices last.

| Per million tokens | Listed price | Struck through price |
| --- | --- | --- |
| Input | $0.68 | $1.36 |
| Cached input | $0.07 | $0.14 |
| Output | $2.09 | $4.18 |

Source: [Mistral's model page](https://docs.mistral.ai/models/mistral-large-4-0), checked 6 Oct 2026. The API model name is `mistral-large-4`.

<figure class="mg" data-scene="tags"><img src="/blog/assets/media/mistral-large-4/tags.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. Three price tags hang from pegs on a line, for input, cached input and output. On each tag the higher price is crossed out by a pencil and the lower price drops in below it."><figcaption>Mistral's model page on 6 Oct 2026: input $0.68 with $1.36 struck through, cached input $0.07 with $0.14 struck through, output $2.09 with $4.18 struck through.</figcaption></figure>

## How does Mistral Large 4 score on benchmarks?

On the vendor's own figures, it is second among the five models in both charts below, and leads neither. The two rows below are our selection from the charts in Mistral's [launch post](https://mistral.ai/news/mistral-large-4/). We did not run them. The charts round to whole numbers.

| Benchmark (Mistral's charts) | Mistral Large 4 | Kimi K3 | GLM-5.3 | DeepSeek V4 Pro 0813 | Qwen3.8 Max |
| --- | --- | --- | --- | --- | --- |
| DeepSWE 1.1 | 62 | 68 | 61 | 57 | 51 |
| Terminal-Bench 4 | 28 | 21 | 40 | 10 | 17 |

In its text, Mistral gives 61.7% on DeepSWE v1.1, 28.3% on Terminal-Bench 4 and 59.4% on SWE-Atlas-QnA, and a combined Coding Agent Index of 49.8%. It also says the model solves 93% of Cybench. In a blind human evaluation of coding quality across five models, Mistral says the preview rated 3.74 out of 5, second to Claude Opus 5 at 4.22.

VentureBeat noted that the model did not yet appear in Artificial Analysis' public evaluations or on the DeepSWE leaderboard, so the ranking claim "remains provisional". Mistral's charts say the scores were evaluated privately by Artificial Analysis. For another launch this week, see our [Reflection Beam explainer](/blog/reflection-beam/).

<figure class="mg" data-scene="flags"><img src="/blog/assets/media/mistral-large-4/flags.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. Five flags for Mistral Large 4, Kimi K3, GLM-5.3, DeepSeek V4 Pro 0813 and Qwen3.8 Max slide up their poles to heights set by their scores, first for DeepSWE 1.1 and then for Terminal-Bench 4, and the order changes between the two."><figcaption>Mistral's own figures from its launch post of 6 October 2026, two rows we selected. We did not run them.</figcaption></figure>

## What hardware do you need to run it?

Mistral has not said. The model page has a column for approximate GPU RAM, and it read "N/A" on 6 Oct 2026. The launch post gives training hardware only: 3,800 NVIDIA Grace Blackwell GPUs in Mistral's own datacenters in Europe.

Our view: do not read 49B active as "fits on a workstation". The download will hold every parameter. For a local coding model this week, [is Ollama good for coding?](/blog/is-ollama-good-for-coding/) covers what runs on normal hardware.

## Can Mistral Large 4 drive a coding agent today?

Through the API, probably, but no source we opened names a coding CLI that ships with it. The model page lists Function Calling on `/v1/chat/completions`, which is what a coding agent needs from a model. The launch post points people to the preview API on Mistral Studio.

One detail is telling. Mistral's DeepSWE chart labels rivals by harness, such as Qwen3.8 Max with Claude Code and GLM-5.3 with Opencode. Its own bar names none, and the footnote mentions a harness that has not launched publicly.

We think any agent that accepts a custom API endpoint could be pointed at it, but we have not tested that. For what works now, see our [best AI coding agents](/blog/best-ai-coding-agents/) roundup.

## What should you do now?

Try the preview on the API if you are curious, and wait for the weights before committing.

1. Test `mistral-large-4` on a task from your own repo.
2. Budget on the struck through prices, in case the lower ones end.
3. Read the licence when it is published.
4. Wait for independent scores before you switch models.

<link rel="stylesheet" href="/blog/assets/media/mistral-large-4/motion.css"><script defer src="/blog/assets/media/mistral-large-4/motion.js"></script>
