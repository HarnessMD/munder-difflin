---
title: "Mistral Large 4 (Le Chonk): size, price, scores and weights"
description: "Mistral Large 4 is a 1 trillion parameter open weight model, with weights out since 29 Oct 2026. Context window, API price, scores, licence and hardware."
date: 2026-10-06
updated: 2026-10-29
category: concepts
categoryLabel: Concepts
type: Non-technical
primaryKeyword: "mistral large 4"
secondaryKeywords: ["mistral large 4 benchmarks", "mistral large 4 pricing", "mistral large 4 open weights", "le chonk mistral", "mistral large 4 vs", "mistral large 4 context window", "mistral large 4 license"]
tags: ["Concepts", "Open Source", "AI Agents"]
faq:
  - q: "Is Mistral Large 4 open source?"
    a: "It is open weight. Mistral released the weights on Hugging Face on 29 October 2026 under the Mistral Ecosystem Open-Weight license, which its post calls a modified MIT license. You may use, modify, fine tune and commercialize it; a business that runs a Model as a Service offering needs a separate commercial license from Mistral."
  - q: "What is the Mistral Large 4 context window?"
    a: "1M tokens. Mistral's model card, read 29 Oct 2026, lists a 1M context length, and vLLM's recipe says it validated serving up to 256K. Mistral's model page defines the context window as the maximum number of input plus output tokens the model can process at once."
  - q: "How much does Mistral Large 4 cost?"
    a: "Mistral's post of 29 Oct 2026 prices the API at $0.70 per million input tokens, $0.07 per million cached input tokens and $2.10 per million output tokens. On 6 Oct 2026 the model page had listed $0.68, $0.07 and $2.09, with higher prices struck through."
  - q: "Why is Mistral Large 4 called Le Chonk?"
    a: "It is Mistral's own nickname for the model. The launch post of 6 October 2026 says the model is unofficially ML4 and very officially le Chonk. Mistral describes it as its largest and most capable model to date."
  - q: "Is Mistral Large 4 better than Kimi K3?"
    a: "It depends on the test, on the figures Mistral published. Its preview charts of 6 Oct 2026 show Kimi K3 ahead on DeepSWE 1.1 (68 against 62). Its post of 29 Oct 2026 says graders in Surge Code's blind test preferred Mistral Large 4 over Kimi K3, GLM-5.3 and DeepSeek V4.1 Flash, behind only Claude Opus 5.5 among the models evaluated."
---

Our view: Mistral Large 4, nicknamed Le Chonk, is now the open weight coding model to try first if you can host about 1 trillion parameters, and a cheap API model if you cannot. Mistral released the weights on 29 October 2026, three weeks after the 6 October preview, with a 1M token context window. Checked 29 Oct 2026.

Open models can drive the agents you run. [Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. Our guide to [running Munder Difflin on open models](/blog/run-munder-difflin-on-open-models/) covers the wiring, the [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup, and the [Concepts hub](/blog/topics/concepts/) explains the terms.

## What is Mistral Large 4?

Mistral Large 4 is Mistral's largest model so far. The [launch post](https://mistral.ai/news/mistral-large-4/) says the model is "unofficially ML4, very officially: le Chonk". Yes, that is the vendor's wording, not ours.

The [model card](https://huggingface.co/mistralai/Mistral-Large-4-1T-A52B), read 29 Oct 2026, describes a mixture of experts model that takes text and images and writes text, fluent in more than 160 languages. It unifies instruction following, reasoning, coding and agent work in one set of weights, with three reasoning efforts: low, medium and high, the default.

The [Hacker News thread](https://news.ycombinator.com/item?id=50289418) on the weights release had more than 420 points when we checked on 29 Oct 2026.

## How big is it, and what is the context window?

It has about 1 trillion parameters and a 1M token context window. The model card says "49 billion active parameters per token (52 billion including embeddings and output layers)", from 128 routed experts with 4 active per token plus 1 shared expert. On 6 Oct 2026 Mistral's model page listed 1.05T total and a 1.6B vision encoder.

In plain words: the total sets how big the download is, and the active count sets how much work each token costs.

<figure class="mg" data-scene="scales"><img src="/blog/assets/media/mistral-large-4/scales.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A kitchen scale holds a very large flour sack labelled 1.05T total parameters. A small scoop labelled 49B active lifts out of the sack for each new token on a belt beside it, then tips back in."><figcaption>Mistral's model page lists 1.05T total parameters and 49B active, as of 6 Oct 2026.</figcaption></figure>

## Can you download the weights, and what is the licence?

Yes, since 29 October 2026. Mistral's [release post](https://mistral.ai/news/mistral-large-4-oss/) says to "download the open weights from Hugging Face and deploy on your own infrastructure with vLLM or SGLang". GGUF files for llama.cpp followed the same day, and a quantized NVFP4 checkpoint targets Blackwell GPUs.

The licence is the Mistral Ecosystem Open-Weight license, "a modified MIT license". The post says the model "is free to use, modify, fine-tune, and commercialize", with one condition: businesses that run a Model as a Service offering need a separate commercial licence from Mistral. The [licence text](https://huggingface.co/mistralai/Mistral-Large-4-1T-A52B/blob/main/LICENSE) is in the repo.

<figure class="mg" data-scene="crate"><img src="/blog/assets/media/mistral-large-4/crate.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A crate marked Mistral Large 4 rolls in on a trolley. Its delivery slip is stamped Released twice, once for weights and once for licence. A wall calendar for October tears off its pages from 6 to 29, where a note reads Weights out."><figcaption>Mistral released the weights and the licence on 29 Oct 2026, three weeks after the preview of 6 Oct.</figcaption></figure>

## What does Mistral Large 4 cost on the API?

Input costs $0.70 per million tokens and output $2.10, in Mistral's post of 29 Oct 2026. That is a little above the $0.68 and $2.09 the model page listed on 6 Oct 2026, when higher prices were shown struck through.

| Per million tokens | 29 Oct 2026 (release post) | 6 Oct 2026 (model page) |
| --- | --- | --- |
| Input | $0.70 | $0.68 |
| Cached input | $0.07 | $0.07 |
| Output | $2.10 | $2.09 |

The API model name is `mistral-large-4`. The post also lists OpenRouter, Microsoft Foundry and NVIDIA hosted endpoints. Against Claude, see [Mistral Large 4 vs Claude Opus 5.5](/blog/mistral-large-4-vs-claude-opus-5-5/).

<figure class="mg" data-scene="tags"><img src="/blog/assets/media/mistral-large-4/tags.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. Three price tags hang from pegs on a line, for input, cached input and output. Each tag shows the price from Mistral's release post of 29 Oct 2026: 0.70, 0.07 and 2.10 dollars per million tokens. Tapping a tag shows the 6 Oct price beside it."><figcaption>Mistral's release post on 29 Oct 2026: input $0.70, cached input $0.07, output $2.10 per million tokens.</figcaption></figure>

## How does Mistral Large 4 score on benchmarks?

Better than the preview, on Mistral's own figures. Its post of 29 Oct 2026 gives 48% on the Artificial Analysis Coding Agent Index, "effectively tied with the leading open-weight model, GLM-5.3, while using 47% fewer tokens per task". It gives 41% on Terminal-Bench 4.0, 13 points above the preview, and 19.7% on Cognition's private FrontierCode 2.0 benchmark.

The preview charts of 6 October showed a different picture; two rows we selected:

| Preview benchmark (6 Oct 2026, Mistral's charts) | Mistral Large 4 | Kimi K3 | GLM-5.3 | DeepSeek V4 Pro 0813 | Qwen3.8 Max |
| --- | --- | --- | --- | --- | --- |
| DeepSWE 1.1 | 62 | 68 | 61 | 57 | 51 |
| Terminal-Bench 4 | 28 | 21 | 40 | 10 | 17 |

The model card puts it at 26 on the Artificial Analysis Intelligence Index v5, "the highest among western open-weight models", and says leading Chinese open models score higher on that index. For another launch, see our [Reflection Beam explainer](/blog/reflection-beam/).

<figure class="mg" data-scene="flags"><img src="/blog/assets/media/mistral-large-4/flags.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. Five flags for Mistral Large 4, Kimi K3, GLM-5.3, DeepSeek V4 Pro 0813 and Qwen3.8 Max slide up their poles to heights set by their scores, first for DeepSWE 1.1 and then for Terminal-Bench 4, and the order changes between the two."><figcaption>Mistral's own figures from its launch post of 6 October 2026, two rows we selected.</figcaption></figure>

## What hardware do you need to run it?

Hundreds of gigabytes of memory. Unsloth's smallest 1 bit GGUF is about 233 GB and, its guide says, fits on 256 GB including a Mac Studio. vLLM's recipe, read 29 Oct 2026, validated it on 8 data center GPUs such as B300 (FP8 or NVFP4) or B200 (NVFP4).

Our view: do not read 52B active as "fits on a workstation"; the file holds every parameter. [How to run Mistral Large 4 locally](/blog/how-to-run-mistral-large-4/) has the sizes and commands, and [is Ollama good for coding?](/blog/is-ollama-good-for-coding/) covers what runs on normal hardware.

## Can Mistral Large 4 drive a coding agent today?

Yes. The model card recommends Mistral Vibe, "our coding agent powered by Mistral Large 4", and supports native function calling and strict JSON schema output. Any agent that accepts an OpenAI compatible base URL can point at the API or at your own vLLM server. For what else works, see our [best AI coding agents](/blog/best-ai-coding-agents/) roundup.

## What should you do now?

Test it on your own work before you switch.

1. Run `mistral-large-4` on the API against a task from your own repo.
2. Read the licence if you plan to serve it to others.
3. Price the hardware before self hosting; the API is cheaper for most teams.
4. Compare it with the model you use today at the same reasoning effort.

<link rel="stylesheet" href="/blog/assets/media/mistral-large-4/motion.css"><script defer src="/blog/assets/media/mistral-large-4/motion.js"></script>
