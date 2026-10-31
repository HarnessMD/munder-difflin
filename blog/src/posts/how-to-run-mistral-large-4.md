---
title: "How to Run Mistral Large 4 Locally: Hardware, GGUF Sizes and vLLM (Oct 2026)"
seoTitle: "How to Run Mistral Large 4 Locally (2026): Memory, GGUF, vLLM"
description: "Mistral Large 4 weights are out. Which file fits your memory, the llama.cpp and vLLM commands, the GPUs Mistral validated and the licence, checked 29 Oct 2026."
date: 2026-10-29
category: guides
categoryLabel: Guides
type: Technical
primaryKeyword: "how to run mistral large 4 locally"
secondaryKeywords: ["mistral large 4 gguf", "mistral large 4 hardware requirements", "mistral large 4 vllm", "mistral large 4 llama.cpp", "mistral large 4 weights download", "mistral large 4 mac studio"]
tags: ["Guides", "Open Source", "Local-First", "AI Agents"]
faq:
  - q: "How much memory do you need to run Mistral Large 4?"
    a: "At least about 256 GB of RAM plus VRAM, or unified memory, for the smallest file. Unsloth's guide of 29 Oct 2026 says its 1 bit UD-IQ1_S quant uses about 233 GB of disk and should fit on 256 GB, including a Mac Studio. The 4 bit UD-Q4_K_XL file is 605 GB and the full FP8 checkpoint about 1.06 TB."
  - q: "Can Mistral Large 4 run on a Mac?"
    a: "Only a Mac with 256 GB or more of unified memory, using a heavily quantized GGUF. Unsloth names a Mac Studio for its 233 GB 1 bit file, and llama.cpp enables Metal by default on macOS. ggml-org lists its 381 GB Q2_K and 298 GB IQ2_XXS files as fitting in 512 GB of unified memory."
  - q: "What GPUs does vLLM support for Mistral Large 4?"
    a: "vLLM's recipe, read 29 Oct 2026, lists validated runs on NVIDIA GB300, 8x B300, 8x B200, two nodes of 8 H200 with FP8, and AMD Instinct MI350X with 8 GPUs. It says FP8 needs about 128 GiB of weights per GPU on 8 GPUs and NVFP4 about 76 GiB."
  - q: "Is Mistral Large 4 free for commercial use?"
    a: "Mostly. Mistral's post of 29 Oct 2026 says the Mistral Ecosystem Open-Weight license, a modified MIT license, lets you use, modify, fine tune and commercialize the model, with one condition: a business that runs a Model as a Service offering needs a separate commercial license from Mistral."
  - q: "Is it cheaper to use the Mistral API than to self host?"
    a: "For most people, yes. Mistral's post of 29 Oct 2026 prices the API at $0.70 per million input tokens, $0.07 cached and $2.10 output, and the model card recommends the Mistral API if local serving is subpar. Self hosting pays off when the data must stay on your own hardware."
---

You can run Mistral Large 4 yourself from today, but only with about 256 GB of memory or more: a 1 bit GGUF on a large Mac Studio, a 2 to 4 bit GGUF on a workstation, or the full checkpoint on 8 data center GPUs with vLLM. Mistral released the weights on 29 Oct 2026, checked the same day.

If you want a team of agents on your own work, [Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. For what the model is and its scores, see [Mistral Large 4](/blog/mistral-large-4/). This guide sits in our [Guides hub](/blog/topics/guides/).

<figure class="mg" data-scene="luggage"><img src="/blog/assets/media/how-to-run-mistral-large-4/luggage.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, five suitcases ride a baggage carousel, smallest first, tagged 233 GB 1 bit, 378 GB 2 bit, 605 GB 4 bit, 1.1 TB 8 bit and 2.1 TB 16 bit. A shelf labelled 256 GB memory accepts only the smallest case. Tapping a case shows which memory size it needs."><figcaption>GGUF file sizes from Unsloth and ggml-org on Hugging Face, read 29 Oct 2026.</figcaption></figure>

## What do you need to run Mistral Large 4?

Total memory decides it: RAM plus VRAM, or unified memory, has to be larger than the file you load. The [model card](https://huggingface.co/mistralai/Mistral-Large-4-1T-A52B), read 29 Oct 2026, describes a mixture of experts model with "49 billion active parameters per token" out of about 1 trillion, a 1M token context window and text plus image input.

Only the active part runs for each token, but all of it has to sit in memory. That is why a model with 49B active parameters still needs hundreds of gigabytes.

| File (checked 29 Oct 2026) | Size | Source |
| --- | --- | --- |
| UD-IQ1_S, 1 bit | 233 GB | Unsloth |
| UD-Q2_K_XL, 2 bit | 378 GB | Unsloth |
| UD-Q4_K_XL, 4 bit | 605 GB | Unsloth |
| Q8_0, 8 bit | 1.12 TB | ggml-org |
| NVFP4 checkpoint | about 610 GB | vLLM recipe |
| FP8 checkpoint | about 1.06 TB | vLLM recipe |

[Unsloth's guide](https://unsloth.ai/docs/models/mistral-large-4) says the 1 bit file "should fit on 256GB RAM including a Mac Studio or 2x NVIDIA DGX Sparks", and that its 2 bit file keeps 95.6% of top 1 accuracy against the original. Longer contexts need more memory on top of the file.

## How to run it on one machine with llama.cpp

Use a GGUF file and a llama.cpp build with Mistral Large 4 support. ggml-org publishes [GGUF files](https://huggingface.co/ggml-org/Mistral-Large-4-1T-A52B-GGUF) from 298 GB up, and Unsloth publishes its own. Unsloth's example serves the 2 bit file with a 32K context:

```bash
./llama.cpp/build/bin/llama-server \
  -hf unsloth/Mistral-Large-4-1T-A52B-GGUF:UD-Q2_K_XL \
  --ctx-size 32768 --temp 1.0 --top-p 0.95 --top-k 0 --min-p 0.0 \
  --chat-template-kwargs '{"reasoning_effort":"high"}' \
  --host 127.0.0.1 --port 8080
```

That starts a chat page at http://127.0.0.1:8080 and an API at /v1. On a Mac, Unsloth says "Metal support is enabled by default". If you run out of memory, it says to lower the context size or pick a smaller quant. Unsloth Desktop does the same on macOS, Windows and Linux without the command line.

Two settings come from the model card: temperature 1.0 and top_p 0.95 for every reasoning effort. The ggml-org page adds that "Reasoning cannot be turned off": low, medium and high are the choices, and high is the default.

## How to serve it on GPUs with vLLM

Mistral recommends [vLLM](https://recipes.vllm.ai/mistralai/Mistral-Large-4-1T-A52B) for production. The model card serves it from the official Docker image across 8 GPUs:

```bash
docker run --runtime nvidia --gpus all \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  -p 8000:8000 --ipc=host \
  vllm/vllm-openai:mistral-large-4 \
  --model mistralai/Mistral-Large-4-1T-A52B \
  --tensor-parallel-size 8 \
  --tool-call-parser mistral --reasoning-parser mistral \
  --enable-auto-tool-choice --gpu-memory-utilization 0.85
```

The two parser flags are required for tool calls and to keep reasoning out of the answer. vLLM's recipe lists validated hardware: NVIDIA GB300, 8x B300, 8x B200, two nodes of 8 H200 for FP8, and AMD Instinct MI350X. It says FP8 "needs ~128 GiB of weights per GPU on 8 GPUs", NVFP4 about 76 GiB. The recipe validated contexts up to 256K, not the full 1M. SGLang works too, with its own image.

<figure class="mg" data-scene="tin"><img src="/blog/assets/media/how-to-run-mistral-large-4/tin.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a long loaf labelled Mistral Large 4 is sliced into eight equal pieces that drop into an eight cup baking tin, each cup labelled GPU. A switch flips the label from FP8, 128 GiB a cup, to NVFP4, 76 GiB a cup, and the slices shrink."><figcaption>vLLM's recipe, read 29 Oct 2026: about 128 GiB of weights per GPU for FP8 on 8 GPUs, about 76 GiB for NVFP4.</figcaption></figure>

## What does the licence allow?

Almost everything except selling the model as a hosted service. Mistral's [post of 29 Oct 2026](https://mistral.ai/news/mistral-large-4-oss/) calls it the Mistral Ecosystem Open-Weight license, "a modified MIT license", free to "use, modify, fine-tune, and commercialize". The one condition: "businesses that operate a Model-as-a-Service offering must obtain a separate commercial license from Mistral". The [licence text](https://huggingface.co/mistralai/Mistral-Large-4-1T-A52B/blob/main/LICENSE) is in the repo.

<figure class="mg" data-scene="signpost"><img src="/blog/assets/media/how-to-run-mistral-large-4/signpost.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a wooden signpost rises with four arms that read Use, Modify, Fine tune and Sell, each with a tick. A fifth arm reading Model as a Service swings out with a small note that says separate licence from Mistral."><figcaption>Mistral's post of 29 Oct 2026 lists one condition: a separate licence for Model as a Service businesses.</figcaption></figure>

## Should you self host or use the API?

Use the API unless the data has to stay on hardware you control. Mistral's post priced it at $0.70 per million input tokens, $0.07 cached and $2.10 output on 29 Oct 2026, and the model card says to use the Mistral API "if local serving is subpar". The post also lists OpenRouter, Microsoft Foundry and NVIDIA hosted endpoints.

Self hosting earns its cost when the model must run under your own control, or when you want to fine tune it; Unsloth, Axolotl and TRL all list guides.

## Can you use it with coding agents?

Yes, through any agent that accepts an OpenAI compatible base URL; both servers above expose one. Mistral points to its own coding agent, Mistral Vibe.

Munder Difflin runs a team of agents for research, writing, ops and coding on engines such as Claude Code, Codex and Gemini CLI, takes work in from Slack and webhooks, and connects tools through MCP servers, skills and plugins. Some of its engines accept a local base URL; [running Munder Difflin on open models](/blog/run-munder-difflin-on-open-models/) has the wiring. A Cloud Office and a mobile app are coming soon; [how to install and use Munder Difflin](/blog/how-to-install-and-use-munder-difflin/) covers setup. For a lighter local setup, see [how to connect Ollama to Claude Code](/blog/how-to-connect-ollama-to-claude-code/).

<link rel="stylesheet" href="/blog/assets/media/how-to-run-mistral-large-4/motion.css"><script defer src="/blog/assets/media/how-to-run-mistral-large-4/motion.js"></script>
