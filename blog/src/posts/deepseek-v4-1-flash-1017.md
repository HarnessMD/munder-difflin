---
title: "DeepSeek V4.1 Flash 1017: What Changed, the Price and Claude Code Setup"
description: "DeepSeek V4.1 Flash 1017, released 17 Oct 2026 under MIT: what changed, DeepSeek's benchmarks, the API price and Claude Code setup."
date: 2026-10-17
category: concepts
categoryLabel: Concepts
type: Non-technical
primaryKeyword: "deepseek v4.1 flash 1017"
secondaryKeywords: ["deepseek v4.1 flash", "deepseek flash", "deepseek v4.1 flash price", "deepseek claude code", "deepseek v4.1 flash benchmarks", "deepseek-flash api"]
tags: ["Concepts", "AI Agents", "Open Source"]
faq:
  - q: "What is DeepSeek V4.1 Flash 1017?"
    a: "DeepSeek V4.1 Flash 1017 is DeepSeek's update to its V4.1 Flash model, released on 17 October 2026. The model card calls it \"a minor update to DeepSeek-V4.1-Flash\" with gains in reasoning, coding, agentic tasks and visual benchmarks, and says it also cuts task execution time and output length. The weights are on Hugging Face under the MIT License."
  - q: "How much does DeepSeek V4.1 Flash 1017 cost?"
    a: "On DeepSeek's pricing page on 17 Oct 2026, the deepseek-flash model cost $0.15 per million input tokens on a cache miss and $0.60 per million output tokens at off peak rates, and twice that at peak hours. On OpenRouter that day, DeepSeek's own endpoint, one of several providers, listed $0.15 input and $0.60 output."
  - q: "Can I use DeepSeek V4.1 Flash 1017 in Claude Code?"
    a: "DeepSeek publishes a Claude Code guide. It sets ANTHROPIC_BASE_URL to https://api.deepseek.com/anthropic, your DeepSeek API key as ANTHROPIC_AUTH_TOKEN, and deepseek-flash as the model names, then you run claude in your project."
  - q: "Is DeepSeek V4.1 Flash 1017 open source?"
    a: "The model card says the repository and the model weights are licensed under the MIT License. Hugging Face lists the model size as 763B parameters; our view is that running it yourself takes data centre hardware."
  - q: "What happened to deepseek-v4-flash in the API?"
    a: "DeepSeek's API docs say the legacy names deepseek-v4-flash and deepseek-v4-flash-vision-exp are still accepted, but those models have been retired. Their requests are served by DeepSeek V4.1 Flash 1017 and billed at the Flash price."
---

DeepSeek V4.1 Flash 1017 is an update to DeepSeek's V4.1 Flash model, released on 17 October 2026 with open weights under the MIT License. DeepSeek's release note promises "Stronger benchmark performance, faster task completion, and shorter outputs than the previous version". It now serves the deepseek-flash name in DeepSeek's API. Checked 17 Oct 2026.

Open weight coding models need an agent to drive them. [Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of coding agents such as Claude Code, Codex and Gemini CLI on your own computer. Our guide to [running it on open models](/blog/run-munder-difflin-on-open-models/) covers local runtimes and providers, and our [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup.

## What is DeepSeek V4.1 Flash 1017?

The [model card](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash-1017) calls it "a minor update to DeepSeek-V4.1-Flash, delivering substantial improvements across reasoning, coding, agentic tasks, and visual benchmarks." It adds that the model "reduces task execution time and output length". Hugging Face created the repo on 17 Oct 2026 and lists the model size as 763B parameters.

| Detail | DeepSeek V4.1 Flash 1017 (17 Oct 2026) |
| --- | --- |
| Licence | MIT, for the repository and the weights |
| Size | 763B parameters, per Hugging Face |
| Weights | FP8, with the experts in FP4, per the model's config file |
| Context | 1M tokens |
| Max output in the API | 384K tokens |
| Input | Text and images (the API lists Vision for deepseek-flash) |
| Recommended sampling | temperature 1.0, top_p 1.0, max_tokens of at least 256K |

The release ships no Jinja chat template. Instead the repo has an encoding folder with a Python reference implementation, and the model card also points to DeepSeek's [deepseek-recipe](https://github.com/deepseek-ai/deepseek-recipe), Rust libraries with Python bindings for the same prompt format. The inference folder calls itself "A readable reference implementation rather than a production serving engine."

<figure class="mg" data-scene="bars"><img src="/blog/assets/media/deepseek-v4-1-flash-1017/bars.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. Two bars grow side by side for Terminal-Bench 4.0: V4.1 Flash reaches 31.2 and V4.1 Flash 1017 reaches 42.3. Buttons switch the bars to DeepSWE v1.1 and Automation-Bench."><figcaption>Three rows from DeepSeek's table on the model card, 17 Oct 2026.</figcaption></figure>

## How does it score?

DeepSeek's table compares the update with the previous Flash and with models it labels K3, GLM-5.3, GPT-5.6 Sol and Opus 5. Selected rows:

| Benchmark | V4.1 Flash 1017 | V4.1 Flash | Opus 5 |
| --- | --- | --- | --- |
| Terminal-Bench 4.0 | 42.3 | 31.2 | 51.8 |
| DeepSWE v1.1 | 77.0 | 74.2 | 74.0 |
| ProgramBench | 29.1 | 20.3 | 37.0 |
| Automation-Bench v1.0.6 | 60.5 | 54.8 | 50.3 |
| Agents' Last Exam | 35.4 | 31.8 | 28.6 |

DeepSeek notes: "We use the Claude Code harness for Terminal-Bench 4.0 and the Mini-SWE-V2 harness for DeepSWE v1.1." Of the eleven rows in its table, the update has the top score on four (DeepSWE v1.1, Automation-Bench, Agents' Last Exam and Apex Bench), Opus 5 on six, including Terminal-Bench 4.0 and ProgramBench, and GPT-5.6 Sol on one. These are DeepSeek's own numbers.

DeepSeek's [release note](https://api-docs.deepseek.com/news/news261017) says the model "uses reinforcement learning with self-feedback to improve end-to-end project development" and is "Optimized for DeepSeek Harness, Tencent CodeBuddy, WorkBuddy, and more." On Hacker News, two posts about the release had more than 200 points each on 17 Oct.

## How much does DeepSeek V4.1 Flash 1017 cost?

The weights are free to download. DeepSeek's [first API call page](https://api-docs.deepseek.com/) says deepseek-flash "is now served by DeepSeek-V4.1-Flash-1017". DeepSeek's [pricing page](https://api-docs.deepseek.com/quick_start/pricing) lists these rates per million tokens on 17 Oct 2026:

| deepseek-flash | Off peak | Peak |
| --- | --- | --- |
| Input, cache hit | $0.003 | $0.006 |
| Input, cache miss | $0.15 | $0.30 |
| Output | $0.60 | $1.20 |

DeepSeek says "Off-peak rates are half of the peak rates." Peak hours are 01:00 to 04:00 and 06:00 to 10:00 UTC, Monday through Friday, excluding Chinese public holidays; weekends are off peak. On [OpenRouter](https://openrouter.ai/deepseek/deepseek-v4.1-flash-1017) on 17 Oct, several providers served it, including DeepSeek, whose own endpoint listed $0.15 input and $0.60 output per million tokens with a 1,048,576 token context.

<figure class="mg" data-scene="receipt"><img src="/blog/assets/media/deepseek-v4-1-flash-1017/receipt.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A small receipt printer feeds out a slip for deepseek-flash at off peak rates: $0.15 per million input tokens on a cache miss, then $0.60 per million output tokens. A button switches the slip to peak rates."><figcaption>DeepSeek's API price for deepseek-flash, served by V4.1 Flash 1017, on 17 Oct 2026.</figcaption></figure>

The old names still work. The API docs say deepseek-v4-flash and deepseek-v4-flash-vision-exp "are still accepted, but the corresponding models have been retired", with requests served by the new model "and billed at the Flash price."

The release note also opens DeepSeek's Search and Fetch APIs to everyone at "$0.75 per 1,000 calls" per endpoint. Search and Fetch calls through server side tools in DeepSeek Harness, Claude Code and Codex are free for DeepSeek API users until billing starts on 31 Oct 2026 at 16:00 UTC.

## How do you use it in Claude Code?

DeepSeek's API speaks the Anthropic format at https://api.deepseek.com/anthropic, and its [Claude Code guide](https://api-docs.deepseek.com/quick_start/agent_integrations/claude_code) sets these variables before you run claude in your project:

```bash
export ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic
export ANTHROPIC_AUTH_TOKEN=<your DeepSeek API Key>
export ANTHROPIC_MODEL=deepseek-flash[1m]
export ANTHROPIC_DEFAULT_OPUS_MODEL=deepseek-flash[1m]
export ANTHROPIC_DEFAULT_SONNET_MODEL=deepseek-flash[1m]
export ANTHROPIC_DEFAULT_HAIKU_MODEL=deepseek-flash
export CLAUDE_CODE_SUBAGENT_MODEL=deepseek-flash
export CLAUDE_CODE_EFFORT_LEVEL=max
export CLAUDE_CODE_AUTO_COMPACT_WINDOW=786432
```

The same docs also have guides for tools such as Codex, OpenCode, OpenClaw and Hermes. For routing several providers through one endpoint, see [Claude Code Router](/blog/claude-code-router/).

<figure class="mg" data-scene="plug"><img src="/blog/assets/media/deepseek-v4-1-flash-1017/plug.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A terminal window types the base URL api.deepseek.com/anthropic, the model deepseek-flash[1m] and claude. A plug labelled Anthropic format slides into a socket labelled DeepSeek API and a light turns green."><figcaption>The setup from DeepSeek's Claude Code guide, 17 Oct 2026.</figcaption></figure>

Our view: a 763B model is out of reach for a desktop, so for most people this update arrives through the API, where it has already replaced the old Flash. For open source agents that work with local models, see [open source AI agents](/blog/open-source-ai-agents/).

<link rel="stylesheet" href="/blog/assets/media/deepseek-v4-1-flash-1017/motion.css"><script defer src="/blog/assets/media/deepseek-v4-1-flash-1017/motion.js"></script>
