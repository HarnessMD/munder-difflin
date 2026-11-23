---
title: "llama.cpp 1.0: What Changed and What to Check Before Upgrading"
description: "llama.cpp 1.0 drops the deprecated API, adds FP8 KV caches and an MoE expert cache, and hardens llama-server. What changed. Checked 13 Nov 2026."
date: 2026-11-13
category: concepts
categoryLabel: Concepts
type: Technical
primaryKeyword: "llama.cpp 1.0"
secondaryKeywords: ["llama.cpp v1", "llama.cpp 1.0 release", "llama.cpp breaking changes", "llama-server mcp", "llama.cpp fp8 kv cache"]
tags: ["Concepts", "Open Source", "Local-First", "Release"]
faq:
  - q: "What is llama.cpp 1.0?"
    a: "It is the first major version of llama.cpp, the C/C++ library and tools for running LLMs, published on GitHub on 13 Nov 2026 at 10:20 UTC. The release notes say it removes the deprecated public API, promotes the NextN and speculative API to llama.h, adds FP8 KV caches and an MoE expert cache, and hardens llama-server. It also updates ggml to v1.0.0."
  - q: "Will my code that calls llama.h break on llama.cpp 1.0?"
    a: "It can. The release notes say 1.0 removes llama_set_warmup, 35 deprecated functions and defrag_thold, and renames llama_set_embd_state_src to llama_set_ctx_state_src. Code that still uses any of those needs updating."
  - q: "What does the 1.0 version number mean for llama.cpp?"
    a: "It is a versioning promise. The ggml-org blog post says: \"Moving forward, both llama.cpp and ggml will reflect API and ABI incompatibilities with major-version bumps.\" Its rules table defines a MAJOR bump as a \"Breaking change to the public C API in ./include\"."
  - q: "Is --defrag-thold still supported in llama.cpp 1.0?"
    a: "No. The v1.0.0 release notes list defrag_thold and --defrag-thold among the removed items, next to llama_set_warmup and 35 deprecated functions."
  - q: "Does llama-server in 1.0 handle MCP tools?"
    a: "Yes. The release notes say llama-server now cancels MCP tool calls on client disconnect or timeout and notifies the MCP server. They also add --allow-unauthenticated-tools as an opt in, and the web UI moves Models, MCP and Settings into a sidebar footer."
---

[llama.cpp 1.0](https://github.com/ggml-org/llama.cpp/releases/tag/v1.0.0) is a cleanup release with a promise attached: it removes the deprecated public API, and from now on a breaking change to that API gets a new major version. It also adds FP8 KV caches, an MoE expert cache, new models and a hardened `llama-server`. Checked 13 Nov 2026.

The release went out on GitHub at 10:20 UTC on 13 Nov 2026, with a [ggml-org blog post](https://huggingface.co/blog/ggml-org/llama-cpp-v1) the same day. The [Concepts hub](/blog/topics/concepts/) explains the terms. If you mostly run hosted Claude, our [Claude Code Max plan tips](/blog/claude-code-max-plan-tips/) cover that side.

## What is llama.cpp?

llama.cpp is an open source C/C++ engine for running large language models, locally or in the cloud. Its [README](https://github.com/ggml-org/llama.cpp) describes it as "LLM inference in C/C++", built on the [ggml](https://github.com/ggml-org/ggml) library, with the goal "to enable LLM (and VLM) inference with minimal setup and state-of-the-art performance on a wide range of hardware".

The repo is MIT licensed and showed 134,841 GitHub stars on 13 Nov 2026. The [Hacker News](https://news.ycombinator.com/item?id=50483765) launch thread had 12 points at 16:12 UTC on 13 Nov 2026, two hours after it was posted.

## What changed in llama.cpp 1.0?

Nine things stand out. Our selection from the v1.0.0 release notes, as of 13 Nov 2026:

| Change | What it does | Who it affects |
| --- | --- | --- |
| Deprecated API removed | Drops `llama_set_warmup`, 35 deprecated functions, `defrag_thold` | Code calling `llama.h` |
| NextN API promoted | Moves NextN from `llama-ext.h` into `llama.h` | Speculative decoding code |
| FP8 KV caches | `-ctk/-ctv f8_e4m3`, optional static scales | Anyone setting KV cache types |
| MoE expert cache | Experts cached in host memory, CPU share for misses | Mixture of experts users |
| New models | Kimi-K3.1-Pro, Ripple, xing4_0, drama-3 TTS, two vision models | Users of those models |
| Server hardening | SSRF, CORS and DNS rebinding fixes, MCP tool cancellation | Anyone running `llama-server` |
| Speech endpoint | OpenAI compatible `/v1/audio/speech` | Text to speech apps |
| Web UI | Chat groups, markdown editor, phone layout | Web UI users |
| ggml 1.0.0 | Prunes deprecated API and `DIAG_MASK` ops, adds FP8 | Direct `ggml` users |

## What happened to the deprecated API?

It is gone. The release notes list these removals under `llama.h`: `llama_set_warmup`, 35 deprecated functions, `defrag_thold` and the `--defrag-thold` flag, all in pull request [#30565](https://github.com/ggml-org/llama.cpp/pull/30565). Deprecation warnings tend to be ignored until the day the function disappears. For 35 functions, that day was 13 Nov 2026.

The same pull request promotes the NextN API out of `llama-ext.h` and into `llama.h`, and renames `llama_set_embd_state_src` to `llama_set_ctx_state_src`. The overview calls it the "NextN/speculative API", so it now sits in the public header the new version rules cover.

<figure class="mg" data-scene="legos"><img src="/blog/assets/media/llama-cpp-1-0/legos.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A tower of plastic building bricks stands on a white table, with a sign reading llama.h. Grey bricks labelled deprecated slide out one by one and drop into a box marked 35 removed, then a blue brick labelled NextN snaps onto the top of the tower. Tapping the tower replays the build."><figcaption>1.0 removes 35 deprecated functions and promotes the NextN API to llama.h, per the release notes of 13 Nov 2026.</figcaption></figure>

## What are the FP8 KV caches and the MoE expert cache?

They are two memory features. The release notes add "OCP FP8 KV caches", set with `-ctk/-ctv f8_e4m3`, with "optional static per-tensor scales".

The MoE expert cache is for mixture of experts models. The overview calls it "a host-memory MoE expert cache with a configurable CPU share", and the core notes add "LRFU/ClassLRU replacement" and "no CPU wait on cached experts". Two new fields in `llama_context_params`, `moe_cache_size` and `moe_cache_cpu_share`, control it. 1.0 also loads external PLE shards from separate GGUF files with `--shard` or `--ple`.

Neither source gives speed figures, so we won't guess.

<figure class="mg" data-scene="backpack"><img src="/blog/assets/media/llama-cpp-1-0/backpack.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. An open backpack labelled host memory sits beside a shelf of cards labelled expert. The cards called most often hop into the backpack. When a card that is not packed is called, a small desk labelled CPU share lights up and handles it while the packed cards keep working. Tapping the backpack shuffles which cards are packed."><figcaption>The MoE expert cache keeps experts in host memory, with a CPU share for misses, per the release notes of 13 Nov 2026.</figcaption></figure>

## Which new models does llama.cpp 1.0 support?

Three new text architectures, a speech model and two vision models, per the release notes:

- Kimi-K3.1-Pro, "K3 with the full-attention MLA layers replaced by DSA"
- Ripple-65B-Preview, a "new dense 65B architecture, no new ops"
- xing4_0, with "mHC, MLA, MoE and MTP"
- drama-3 TTS from fishaudio
- MageVL-Cowork and Kimi-K3.1 vision

The blog post says llama.cpp now supports "more than 150 architecture variants as well as all mainstream speculative decoding methods".

## What changed in llama-server?

It is harder to misuse, and it can now speak. The release notes list fixes for `--cors-origins`, DNS rebinding, SSRF through the CORS proxy and child instance access, plus two new opt in flags: `--allow-unauthenticated-tools` and `--media-allow-private-urls`. A changelog entry describes the change behind the first flag as "explicit opt-in tools via non-loopback addr".

The server also limits `HF_TOKEN` to `huggingface.co` hosts, and cancels MCP tool calls on client disconnect or timeout, notifying the MCP server. For audio, there is the OpenAI compatible `/v1/audio/speech` endpoint and a `temperature` option for `/tts`.

The redesigned web UI adds named chat groups, a live preview markdown editor, a native phone layout, and Models, MCP and Settings in a sidebar footer.

## What should you check before upgrading?

Six removed or changed items, all named in the release notes:

1. Calls to `llama_set_warmup` or the 35 removed deprecated functions.
2. Any `defrag_thold` or `--defrag-thold` in code, scripts or configs.
3. Calls to `llama_set_embd_state_src`, now `llama_set_ctx_state_src`.
4. Includes of `clip.h`, which is removed; its code now lives in `mtmd`.
5. Tools on a network address without an API key, or private media URLs, which now need the opt in flags above.
6. Code on `ggml` itself: ggml 1.0.0 "prunes the deprecated public API and the legacy `DIAG_MASK` ops".

## What does the 1.0 number mean?

It is a versioning promise. The ggml-org blog post says: "Moving forward, both llama.cpp and ggml will reflect API and ABI incompatibilities with major-version bumps."

The post sets rules for all ggml-org projects using semantic versioning. MAJOR is a "Breaking change to the public C API in ./include", MINOR a "Backward-compatible feature, backend updates, model support, or API addition", and PATCH a "Bug fix with no API change". It also gives the reason: "many downstream applications already depend on our work."

<figure class="mg" data-scene="anchor"><img src="/blog/assets/media/llama-cpp-1-0/anchor.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a plain white background, an anchor labelled v1.0.0 rests at the bottom, holding a buoy labelled public C API on a line. Small waves labelled minor and patch roll past and the buoy only bobs in place. Then a tall wave labelled major arrives and the anchor lifts and settles in a new spot. Tapping the buoy sends the waves again."><figcaption>From 1.0, a breaking change to the public C API means a major version bump, per the ggml-org blog post of 13 Nov 2026.</figcaption></figure>

## Should you upgrade now?

Neither the release notes nor the blog post gives upgrade advice; the list above names what the notes remove or change. We think the version rules matter more than any single feature: apps that embed llama.cpp now get a clear signal for breaking changes.

Prefer Ollama? Read [is Ollama good for coding](/blog/is-ollama-good-for-coding/) and [how to connect Ollama to Claude Code](/blog/how-to-connect-ollama-to-claude-code/). If you want a team of agents on local models, [Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. Its [README](https://github.com/HarnessMD/munder-difflin), read 13 Nov 2026, says: "Plus bring your own keys and local models through Ollama, LM Studio or vLLM." The [open models guide](/blog/run-munder-difflin-on-open-models/) shows the wiring for each engine.

<link rel="stylesheet" href="/blog/assets/media/llama-cpp-1-0/motion.css"><script defer src="/blog/assets/media/llama-cpp-1-0/motion.js"></script>
