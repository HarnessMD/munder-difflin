---
title: "Inkling 2 Mini: Size, Benchmarks and How to Run It (Nov 2026)"
description: "Inkling 2 Mini is Thinking Machines' open weights looped model: 26.4B parameters, about 20GB, its benchmarks, Hugging Face, Tinker and coding agents."
date: 2026-11-21
category: concepts
categoryLabel: Concepts
type: Non-technical
primaryKeyword: "inkling 2 mini"
secondaryKeywords: ["inkling 2 mini run locally", "inkling 2 mini benchmarks", "inkling 2 mini hugging face", "inkling 2 mini vs inkling 2 small", "looped transformer", "inkling 2 mini tinker"]
tags: ["Concepts", "AI Agents", "Models"]
faq:
  - q: "How much memory does Inkling 2 Mini need?"
    a: "Thinking Machines' launch post of 20 Nov 2026 gives a total memory footprint of about 20GB. The Hugging Face card, read 21 Nov 2026, supports one NVIDIA DGX Spark, \"Apple silicon devices with 32GB or more memory\", and other GPUs with 32GB or more of VRAM recommended."
  - q: "Is Inkling 2 Mini open source?"
    a: "Its weights are open. The Hugging Face card for thinkingmachines/Inkling-2-Mini, read 21 Nov 2026, lists the licence as Apache 2.0 and a release date of November 20, 2026."
  - q: "Can Inkling 2 Mini run on a MacBook?"
    a: "Thinking Machines says so. Its post of 20 Nov 2026 says \"At launch we support Inkling 2 Mini running on any Mac system (MacBook, Mac Mini) with at least 32GB RAM via Ollama.\" Its demo ran offline on a MacBook Pro (M5 Pro, 48GB)."
  - q: "Can I use Inkling 2 Mini with Aider or OpenCode?"
    a: "Thinking Machines gives no setup for coding agents. The Hugging Face card lists Ollama and vLLM for local inference. Aider's docs say \"Aider can connect to local Ollama models\", and OpenCode's docs say it discovers local Ollama and vLLM models, both read 21 Nov 2026. Neither agent's docs name Inkling 2 Mini."
  - q: "How does Inkling 2 Mini compare to Inkling 2 Small?"
    a: "Small is far bigger, with 594B total parameters and 17B active against Mini's 26.4B and 3.4B, and it scores higher on the vendor's own figures: 72.1% against 48.2% on DeepSWE v1.1. The Hugging Face card says Mini is less capable than Small across most of Thinking Machines' evaluations."
---

Inkling 2 Mini is an open weights model from Thinking Machines, released on 20 Nov 2026, that the company calls "small enough to run on your laptop". Its [launch post](https://thinkingmachines.ai/news/inkling-2-mini/) describes a looped transformer with 26.4B total parameters, 3.4B active, and a memory footprint of about 20GB.

New models end up inside the agents you run. [Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. It runs engines such as Claude Code, Codex and Gemini CLI. The [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup, and [OmniAgent alternatives](/blog/omniagent-alternatives/) compares other tools that run several agents.

## What is Inkling 2 Mini?

Inkling 2 Mini is a looped transformer: in Thinking Machines' words, it runs "the middle layers of the model three times for every token". The post says this lets it "apply more reasoning and reach the right answer with fewer tokens, especially on tasks such as agentic coding that depend on reasoning quality."

The model has 24 layers in four blocks of six, and "The two middle blocks run three times, while the first and last blocks each run once." In the post's diagram the Prelude runs once, the middle blocks run as Pass 1, Pass 2 and Pass 3, and the Final block runs once.

<figure class="mg" data-scene="rollercoaster"><img src="/blog/assets/media/inkling-2-mini/rollercoaster.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a soft white rollercoaster track runs from a sky sign reading Prelude to a mint sign reading Final block, with one blue loop in the middle. A yellow car goes around the blue loop three times while a lilac board above it counts Pass 1, Pass 2 and Pass 3, then rolls on to Final block. Tap the track to send the car around again."><figcaption>The two middle blocks run three times for every token, per Thinking Machines' post of 20 Nov 2026.</figcaption></figure>

## How big is Inkling 2 Mini, and what does it need to run?

Inkling 2 Mini has 26.4B total parameters with 3.4B active and needs about 20GB of memory, per the launch post of 20 Nov 2026. It is a Mixture of Experts model, and counting the loops the post gives "5.4B weight activations per token".

The post says most weights were "trained and are deployed natively in NVFP4, with the last four layers in MXFP8", so "there is no conversion loss from quantization."

The [Hugging Face card](https://huggingface.co/thinkingmachines/Inkling-2-Mini), read 21 Nov 2026, describes "a single checkpoint of about 20GB" and supports one NVIDIA DGX Spark, "Apple silicon devices with 32GB or more memory (MacBooks, Mac minis and Studios)", and other GPUs "with 32GB or more of VRAM recommended".

<figure class="mg" data-scene="suitcase"><img src="/blog/assets/media/inkling-2-mini/suitcase.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a soft white suitcase lies open. Blue blocks labelled NVFP4 slide in, then one smaller lilac block labelled MXFP8, and the lid closes. A yellow luggage tag on the handle reads About 20GB, and a mint tag beside it reads 32GB or more memory. Tap the suitcase to unpack and pack it again."><figcaption>About 20GB of weights, per Thinking Machines' post of 20 Nov 2026. The card supports Apple silicon with 32GB or more memory, read 21 Nov 2026.</figcaption></figure>

The vendor's laptop demo: its researchers took the model on a flight, "where it ran offline on a MacBook Pro and built a playable flight simulator in a few minutes". The video is labelled MacBook Pro (M5 Pro, 48GB) and Airplane mode. The card adds: "Support for looped models in local runtimes is new, and speed varies by runtime and hardware."

## What do Inkling 2 Mini's benchmarks say?

On the vendor's own figures, Inkling 2 Mini scores 48.2% on DeepSWE v1.1 and 46.5% on Vals Index v2.2 (20 Nov 2026). The post says it "leads every open-weights model with less than 100B total parameters" on benchmarks such as these, and its chart note warns: "Evaluation setups vary by model."

| The vendor's own figures, published 20 Nov 2026 | Inkling 2 Mini | Qwen3.8-27B |
| --- | --- | --- |
| DeepSWE v1.1 | 48.2% | 42.2% |
| Vals Index v2.2 | 46.5% | not listed |
| SWEBench Verified | 79.2% | 77.8% |
| Terminal Bench v2.1 | 71.6% | 73.0% |
| MCP Atlas | 82.7% | 77.3% |

The post also says Mini "is not the strongest small model for multi-turn chat or for instructions with many constraints", with 50.0% on MultiChallenge and 33.4% on ComplexConstraints v1.1, behind Qwen3.8-27B on both (20 Nov 2026). It compares Mini with Qwen3.8-27B, not with Qwen's flagship [Qwen4-Max](/blog/qwen4-max/).

Our view: these are the maker's launch day numbers. Run your own tasks before you switch.

## How do you get and run Inkling 2 Mini?

Download the weights from Hugging Face as `thinkingmachines/Inkling-2-Mini`, under the Apache 2.0 licence, per the card read 21 Nov 2026. The card gives "a context window of up to 1M tokens" and shows no install commands.

For local inference the card names frameworks including SGLang, vLLM, TokenSpeed, NVIDIA Dynamo, Llama App, Unsloth, llama.cpp "for quantized GGUF versions", and "Ollama and Exo Labs, on Apple silicon". At launch, the post says, Thinking Machines supports it on "any Mac system (MacBook, Mac Mini) with at least 32GB RAM via Ollama".

The launch post says Mini "is available on Tinker today for inference and customization." Tinker's [pricing page](https://thinkingmachines.ai/tinker/pricing/), read 21 Nov 2026, lists Mini for training and sampling: $0.15 prefill, $0.50 sample and $0.75 train per 1M tokens at 64K context, "as of October 19, 2026". Its serverless inference beta is "Currently available for Inkling 2 Small, Inkling, and Inkling-Small only." The [overview](https://thinkingmachines.ai/tinker/) gives Mini a 256K max context and says "Pay for actual tokens used, not inactive time."

## How do you use Inkling 2 Mini with coding agents?

Thinking Machines gives no setup for coding agents. The card names vLLM, and Ollama on Apple silicon, for local inference, and each agent's docs below support one or both.

[Aider's Ollama docs](https://aider.chat/docs/llms/ollama.html), read 21 Nov 2026, say "Aider can connect to local Ollama models." They warn that "Ollama uses a 2k context window by default", and say aider raises it to fit each request plus 8k tokens for the reply.

[OpenCode's provider docs](https://opencode.ai/docs/providers/), read 21 Nov 2026, say it probes a local Ollama server and "discovers completion models". They add that vLLM also has "built-in local discovery", and "discovered vLLM models start with tools disabled". Neither agent's docs name Inkling 2 Mini.

The card advises "setting limits on output tokens and agent turns", warns the model "may take destructive actions, such as deleting or overwriting files, without confirmation", and says to "Run agentic workloads in a sandbox". [Aider alternatives](/blog/aider-alternatives/) compares agents that take local models, and [Devin alternatives](/blog/devin-alternatives/) covers more coding agents.

## How does Inkling 2 Mini compare to Inkling 2 Small?

Inkling 2 Small is much bigger and scores higher: 594B total parameters and 17B active, per Thinking Machines' [post](https://thinkingmachines.ai/news/inkling-2-small/) of 5 Nov 2026, against Mini's 26.4B and 3.4B. The card says Mini "is less capable than Inkling 2 Small across most of our evaluations".

<figure class="mg" data-scene="matryoshka"><img src="/blog/assets/media/inkling-2-mini/matryoshka.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, two nesting dolls stand side by side on a soft white shelf. A large blue doll labelled Inkling 2 Small wears a yellow tag reading 594B total. Next to it, a much smaller lilac doll labelled Inkling 2 Mini wears a mint tag reading 26.4B total. Tap a doll to make it wobble."><figcaption>Inkling 2 Small has 594B total parameters (5 Nov 2026) and Inkling 2 Mini has 26.4B (20 Nov 2026), per Thinking Machines' own posts.</figcaption></figure>

| The vendor's own figures | Inkling 2 Mini, 20 Nov 2026 | Inkling 2 Small, 5 Nov 2026 |
| --- | --- | --- |
| Parameters | 26.4B total, 3.4B active | 594B total, 17B active |
| DeepSWE v1.1 | 48.2% | 72.1% |
| Vals Index v2.2 | 46.5% | 56.1% |

Our view: Mini is the one its maker sizes for a laptop; Small leads every score above.

## Inkling 2 Mini at a glance, checked 21 Nov 2026

| | Inkling 2 Mini |
| --- | --- |
| Released | 20 Nov 2026 |
| Model id | `thinkingmachines/Inkling-2-Mini` |
| Licence | Apache 2.0 |
| Design | Looped transformer, Mixture of Experts, 24 layers |
| Parameters | 26.4B total, 3.4B active |
| Weights | About 20GB, NVFP4 with the last four layers in MXFP8 |
| Context | Up to 1M tokens per the card, 256K max on Tinker |
| Local hardware | Apple silicon with 32GB or more memory, one NVIDIA DGX Spark |
| Tinker | Training and sampling, paid per token |

<link rel="stylesheet" href="/blog/assets/media/inkling-2-mini/motion.css"><script defer src="/blog/assets/media/inkling-2-mini/motion.js"></script>
