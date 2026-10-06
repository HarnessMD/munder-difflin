---
title: "Reflection AI Beam: the 501B open weight model, explained"
description: "Reflection AI Beam is a 501B parameter open weight model. Size, Reflection's own scores, licence and when you can get it, checked 6 Oct 2026."
date: 2026-10-06
category: concepts
categoryLabel: Concepts
type: Non-technical
primaryKeyword: "reflection ai beam"
secondaryKeywords: ["reflection ai", "reflection beam model", "beam open weight model", "reflection beam benchmarks", "can you download reflection beam", "reflection beam vs qwen"]
tags: ["Concepts", "Open Source", "AI Agents"]
faq:
  - q: "Is Reflection Beam open source?"
    a: "Not yet, and the word Reflection uses is open weight. Its launch post of 5 October 2026 says it will release the weights under an Apache 2.0 license this month, with documentation and the stack for running, evaluating and fine-tuning the model. When we checked on 6 Oct 2026 there was only an early access sign up."
  - q: "Who makes the Beam model?"
    a: "Reflection AI. Its website says it builds open models for everyone to access, use and build on. TechCrunch reported on 5 October 2026 that the company was founded in 2024 by two former Google DeepMind researchers and is based in Brooklyn."
  - q: "Is Reflection Beam better than Qwen 3.8 Max?"
    a: "Not on the numbers Reflection published. Its launch post says Beam is approaching Qwen 3.8 Max on coding and agentic tasks, and its table shows Qwen 3.8 Max ahead on SWE Bench Pro v1 (67.7 against 65.5) and Terminal Bench v2.1 (86.6 against 80.1). Reflection's argument is that Beam needs less compute per token."
  - q: "Can Reflection Beam read images?"
    a: "No. Reflection's launch post says Beam is text-only, and that it can work with information from other modalities when that information is represented as text."
  - q: "How long is Beam's context window?"
    a: "Reflection says a training stage it calls midtraining extends Beam's effective context length to 1M tokens. The reinforcement learning run it describes used a maximum context length of 256K tokens. The model card, which should state the supported limit, is not out as of 6 Oct 2026."
---

Reflection AI Beam is a 501 billion parameter open weight AI model for coding, reasoning and agent work, announced on 5 October 2026. You cannot download it yet. Our view: promising on efficiency, unproven until the weights ship, and behind Qwen 3.8 Max on every row in Reflection's own tables where both have a score. Checked 6 Oct 2026.

Open models can drive coding agents, which is why we care. [Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of coding agents such as Claude Code, Codex and Gemini CLI on your own computer. We have not tried Beam with it, because there are no weights to try. Our guide to [running Munder Difflin on open models](/blog/run-munder-difflin-on-open-models/) covers the models you can use now, the [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup, and the [Concepts hub](/blog/topics/concepts/) explains the terms.

## What is Reflection AI Beam?

Beam is Reflection AI's first open weight model, by the company's own description. Its [launch post](https://reflection.ai/blog/introducing-beam) calls Beam a sparse Mixture-of-Experts model with 501 billion total parameters, 23 billion active, built for coding, reasoning and agentic workloads. The post also says Beam is text-only.

Reflection's [website](https://reflection.ai/) says it builds open models for everyone to access, use and build on. [TechCrunch](https://techcrunch.com/2026/10/05/reflection-debuts-beam-a-open-weight-ai-model-to-rival-chinese-models-at-lower-compute-cost) reported on 5 October 2026 that the company was founded in 2024 by two former Google DeepMind researchers.

The [Hacker News thread](https://news.ycombinator.com/item?id=49969183) had more than 400 points and 130 comments when we checked on 6 Oct 2026.

<figure class="mg" data-scene="parcel"><img src="/blog/assets/media/reflection-beam/parcel.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A sealed yellow parcel labelled Beam lands on a shelf and is stamped open weight and text only. A padlock clicks shut, a tag reading later this month swings in, and an early access sign up slip slides out beside it."><figcaption>Announced on 5 October 2026 and still sealed. As of 6 Oct 2026 there are no weights to download.</figcaption></figure>

## Can you download Reflection Beam today?

No. As of 6 Oct 2026 there are no weights to download. The [launch post](https://reflection.ai/blog/introducing-beam) says Beam is undergoing final red-teaming and evaluations, and that Reflection will release the weights, technical report, model card and developer artifacts "later this month".

What exists today is a sign up. The post says an early version is available to a select group of users, and its waitlist link goes to [platform.reflection.ai](https://platform.reflection.ai/). When we opened that page on 6 Oct 2026 it was a sign in screen that reads "Build on the Reflection API Platform" and asks for an email address.

On the licence, the post says the weights will come under an Apache 2.0 license, with documentation and the full stack for running, evaluating and fine-tuning the model.

## How big is Beam, and what does "501 billion total, 23 billion active" mean?

Reflection says Beam holds 501 billion parameters in total, with 23 billion active. In its compute estimate, the [launch post](https://reflection.ai/blog/introducing-beam) says that for mixture-of-experts models it counts "the parameters activated per token rather than the total model size".

In plain words: the total sets the size of the model, and the active count sets how much work each token costs.

The post gives these training figures:

* **Pretraining data.** 23.8 trillion tokens.
* **Pretraining hardware.** Under four weeks on 6,144 NVIDIA GB300 NVL72 GPUs.
* **Reinforcement learning.** More than 100 million rollouts on 10.5K NVIDIA GB300 GPUs over four weeks.
* **Depth.** 52 layers.

<figure class="mg" data-scene="lamps"><img src="/blog/assets/media/reflection-beam/lamps.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A wall of 501 small lamps, each standing for 1 billion parameters. As five tokens arrive one by one, a different patch of 23 lamps lights up for each of them."><figcaption>Reflection says 501 billion parameters in total, with 23 billion active. Which lamps light is illustrative.</figcaption></figure>

## How does Beam score on benchmarks?

On Reflection's own figures, Beam is close to GLM 5.2 and behind Qwen 3.8 Max and Kimi K3. The six rows below are our selection from the 21 rows in the four tables in Reflection's [launch post](https://reflection.ai/blog/introducing-beam). We did not run them. NR means not reported.

| Benchmark (as named by Reflection) | Beam | GLM 5.2 | Qwen 3.8 Max | Kimi K3 |
| --- | --- | --- | --- | --- |
| SWE Bench Pro v1 | 65.5 | 62.1 | 67.7 | NR |
| Terminal Bench v2.1 | 80.1 | 81.0 | 86.6 | 88.3 |
| DeepSWE v1.1 | 44.4 | 44.0 | 51.0 | 68.0 |
| MCP Atlas | 78.7 | 77.8 | 84.5 | 82.3 |
| HLE no tools | 36.2 | 40.5 | 43.6 | 46.9 |
| GPQA Diamond | 90.5 | 91.2 | 92.6 | 93.5 |

On these six rows Beam is ahead of GLM 5.2 on three and behind on three. Across all 13 rows where Reflection reports both, Beam is ahead on eight. Qwen 3.8 Max is ahead of Beam on all six. Kimi K3 is ahead on all five rows where it has a score. Reflection also lists DeepSeek V4.1 Flash at 90.6 on Terminal Bench v2.1.

Reflection says as much. The post calls Beam "competitive with larger open models like GLM 5.2 and approaching Qwen 3.8-Max", and adds that frontier open models like Kimi K3 "remain ahead on raw capability". TechCrunch noted on 5 October 2026 that the performance claims haven't been independently verified.

<figure class="mg" data-scene="balloons"><img src="/blog/assets/media/reflection-beam/balloons.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. Four balloons for Beam, GLM 5.2, Qwen 3.8 Max and Kimi K3 float at heights set by their scores on one benchmark at a time, with a tag on the one that is ahead. Arrow buttons step through the six benchmarks."><figcaption>Reflection's own figures, six rows we selected from its tables. We did not run them. Use the arrows to change benchmark.</figcaption></figure>

## What makes Beam efficient?

Reflection's claim is that Beam scores comparably to the larger GLM 5.2 on reasoning while spending less compute. The [launch post](https://reflection.ai/blog/introducing-beam) says that on advanced reasoning benchmarks Beam scores comparably to GLM-5.2 while using 3 to 4 times less inference compute.

By Reflection's method, part of that is the small active count. Part is training: Reflection says it used a length penalty that rewards successful solutions while discouraging unnecessary tokens. It also says users can set a reasoning effort parameter, where lower settings favour shorter responses.

Reflection estimates compute from active parameters and generated tokens, and says the result is "an approximate compute comparison rather than measured inference cost". Our view: treat 3 to 4 times as a claim to test, not a bill you can plan on.

<figure class="mg" data-scene="kettles"><img src="/blog/assets/media/reflection-beam/kettles.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. Two kettles, GLM 5.2 and Beam, both come to the boil and a tag says scores comparably. The GLM 5.2 kettle fills twelve blocks of inference compute while the Beam kettle fills three, with a fourth drawn dashed."><figcaption>Reflection says Beam uses 3 to 4 times less inference compute than GLM 5.2 on advanced reasoning benchmarks. It calls this an approximate comparison.</figcaption></figure>

## What hardware do you need to run Beam?

Reflection has not said. The [launch post](https://reflection.ai/blog/introducing-beam) lists the GPUs used to train Beam, and gives no memory figure, GPU count or quantised size for running it.

Our view: do not read "23 billion active" as "fits on a laptop". The download will still hold all 501 billion parameters. If you want a local coding model this week, [is Ollama good for coding?](/blog/is-ollama-good-for-coding/) covers what runs on normal hardware.

## What does Beam mean if you run coding agents?

It means one more open model that may plug into the tools you already use, but not yet. Reflection's [launch post](https://reflection.ai/blog/introducing-beam) says Beam will launch with distribution partners and integration with a broad range of open source libraries and harnesses. It also describes a demo where the team plugged Beam into OpenCode.

The post does not name the partners, so nobody can say yet which agents Beam will work in. For what works now, see our [best AI coding agents](/blog/best-ai-coding-agents/) roundup.

## What should you do now?

Sign up for early access if you want to try it, and otherwise wait for the weights.

1. Join the waitlist at [platform.reflection.ai](https://platform.reflection.ai/).
2. Hold any purchase or migration until the model card and technical report are out.
3. When weights land, test Beam on your own repo before trusting any table.
4. Until then, [connect Ollama to Claude Code](/blog/how-to-connect-ollama-to-claude-code/) if you want an open model driving an agent today.

<link rel="stylesheet" href="/blog/assets/media/reflection-beam/motion.css"><script defer src="/blog/assets/media/reflection-beam/motion.js"></script>
