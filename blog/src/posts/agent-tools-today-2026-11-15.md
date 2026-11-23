---
title: "Agent Tools Today, 15 Nov 2026: Antigravity's /teamwork, GLM-5.3 on Two DGX Stations and Lovable Apps"
seoTitle: "Agent Tools Today (15 Nov 2026): Launches, Skills, MCP Servers"
description: "The top launches, skills, multi agent moves, rising repos and talking points in AI agents from 14 to 15 Nov 2026, each with its source and date."
date: 2026-11-15
category: news
categoryLabel: News
type: Non-technical
series: agent-tools-today
primaryKeyword: "agent tools today 15 nov 2026"
secondaryKeywords: ["antigravity teamwork", "glm-5.3 vllm", "browser-use 1.0.5", "agweb", "plannotator 0.28.65", "lovable apps exposed data"]
tags: ["Daily Brief", "Antigravity", "vLLM", "Lovable"]
---

Agent tools today, 15 Nov 2026, in one line: Google detailed what Antigravity's /teamwork agents solved, NVIDIA served GLM-5.3 across two DGX Stations, and researchers report many Lovable apps expose private data. It covers 14 Nov 04:00 UTC to 15 Nov 04:00 UTC, checked 15 Nov. Previous edition: [14 Nov](/blog/agent-tools-today-2026-11-14/).

<figure class="mg" data-scene="watermill"><img src="/blog/assets/media/agent-tools-today-2026-11-15/watermill.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a blue water wheel with a yellow hub turns slowly in a sky stream. It has three lilac paddles that read Teamwork, GLM and Lovable. As each paddle reaches the top, it turns mint and its word brightens. Tapping a paddle stops the wheel and shows the date 14 Nov on it."><figcaption>The day's three lead items, from the Google Research and NVIDIA posts of 13 Nov and the Lovable research page, read 15 Nov 2026.</figcaption></figure>

## Top 3 launches

1. **Antigravity's /teamwork results.** Google Research's post, dated 13 Nov, shares "recent results from Antigravity’s /teamwork multiagent systems" in math, chemistry, systems software and ML engineering, "done in collaboration with human experts". Each agent "receives only the exact files and tools it needs for a specific step". "Teamwork expresses these workflows as declarative self-improving natural-language patterns." Google says all the features reach external users "in the coming weeks", and reports a Lean formalization of the Weil conjectures of "about 1.8 million lines". 177 points on [Hacker News](https://news.ycombinator.com/item?id=50496811), posted 14 Nov at 13:20 UTC. See [Antigravity alternatives](/blog/antigravity-alternatives/). [Source](https://research.google/blog/advancing-science-engineering-with-antigravitys-teamwork-feature/)
2. **GLM-5.3 across two DGX Stations.** NVIDIA's developer blog post, dated 13 Nov, serves GLM-5.3 NVFP4, with 753 billion parameters and "40 billion activated per token", on two GB300 DGX Stations with vLLM. At about 464 GB, the checkpoint "exceeds the 252 GB of HBM3e on a single GB300 GPU". Tensor parallelism (TP=2) splits the model, and Station A answers through "one OpenAI-compatible API". Throughput peaks at 607.8 tokens per second at concurrency 16 and falls to 385.0 at 32. All figures here are NVIDIA's own. 130 points on [Hacker News](https://news.ycombinator.com/item?id=50497155), posted 14 Nov at 14:09 UTC. [Source](https://developer.nvidia.com/blog/when-one-gpu-isnt-enough-serving-glm-5-3-across-two-nvidia-dgx-stations-with-vllm/)
3. **browser-use 1.0.5.** Published 14 Nov at 08:24 UTC. "Every run is judged by your own model": one more request fills `result.judgement` with fields such as `failure_reason`, `prompt_injection_detected` and `gotchas`, and `judge=False` turns it off. Across 13 runs, the notes report gotchas "on 15/15 verdicts where the site pushed back (6/15 before)": the vendor's own figures. [Source](https://github.com/browser-use/browser-use/releases/tag/1.0.5)

## Top 2 skills, MCP servers and plugins

1. **Agweb.** "A browser built for agents" on macOS, built on WebKit, that "never takes focus". A dashboard shows "every tab of every agent at once". It installs an agent skill for Claude Code and Codex, and `fill --secret-cmd` types a secret "the agent never sees in replies". v0.3.0, published 14 Nov at 23:18 UTC, makes a click on a covered element fail; it "names the cover instead of clicking it". Its Show HN, posted 14 Nov at 14:08 UTC, had 91 points by 15 Nov. Created 11 Nov; MIT, 189 stars; needs macOS 26 or later. [Source](https://github.com/paul-nameless/agweb)
2. **Plannotator v0.28.65.** Published 15 Nov at 00:07 UTC. A reply your agent "has not received yet" now has a Take back button. Over Tailscale, the Inbox "now opens only for the Tailscale account that owns the computer"; other accounts are refused; `/mcp` gets a 403. The notes call this "a behavior change". Tags now work across linked machines. 408 stars in a day on GitHub trending on 15 Nov, 11,250 in total; Apache-2.0. See [what an MCP server is](/blog/what-is-an-mcp-server/). [Source](https://github.com/backnotprop/plannotator/releases/tag/v0.28.65)

## Top 2 moves from multi agent tools

1. **Orca v1.4.259.** Published 14 Nov at 21:20 UTC. Workspace Cleanup in Settings can now clear finished workspaces automatically. "Rules start off", and matching workspaces "may be deleted within seconds of confirmation". You can follow one subagent in "a dedicated view", and "Use Kimi Code in Chat", which needs Kimi Code 2.5.0 or later and a login. For tools like it, see [Herdr alternatives](/blog/herdr-alternatives/). [Source](https://github.com/stablyai/orca/releases/tag/v1.4.259)
2. **Agent Relay v18.7.2.** Published 14 Nov at 16:17 UTC. Setup on a claimed inbox now "asks to sign in instead of making a temporary workspace", and Copilot idle hooks are released "after native cancellation". v18.7.1 and v18.7.3 were small fixes. See [Agent Relay alternatives](/blog/agent-relay-alternatives/). [Source](https://github.com/AgentWorkforce/relay/releases/tag/v18.7.2)

## Top 3 rising repos

1. **Open Code Review v1.13.10.** New since the 14 Nov brief: v1.13.10, published 15 Nov at 02:56 UTC, adds `--resume` for workspace mode and defaults `--to` to `HEAD` "when only --from is given". 893 stars in a day on GitHub trending on 15 Nov, 51,505 in total; Apache-2.0. [Source](https://github.com/alibaba/open-code-review/releases/tag/v1.13.10)
2. **TensorFold 1.2.9.** An "LLM Inference Engine for Metal, CUDA and Vulkan". 1.2.9, published 15 Nov at 01:22 UTC, adds "An Ollama-compatible API" and `tensorfold serve --config FILE.toml`, and reports faster decode for several models on Metal, CUDA and HIP: the vendor's own figures. 37 stars in a day on GitHub trending on 15 Nov, 2,183 in total; Apache-2.0. [Source](https://github.com/ashhart/TensorFold/releases/tag/v1.2.9)
3. **LoopForge.** Tencent's "Self-hosted workflows for coding-agent delivery", which runs CodeBuddy, Codex and Claude Code "with scripts and human approval gates". The README says its Main Bot "opens a Docker sandbox, checks out your repositories, delegates to project roles, and opens the PR". Its last stable release, v0.3.8, shipped 12 Nov. 33 stars in a day on GitHub trending on 15 Nov, 973 in total; created 28 Jul; MIT, its README says. [Source](https://github.com/Tencent/LoopForge)

Stars can rise for reasons other than use: names to watch, not picks.

## Top 2 things people are talking about

1. **Do Lovable apps expose private data?** Many do, the researchers report. The undated page updates Handelsblatt's 2 Nov report. Crissy Field says it examined 159,041 Lovable projects from Common Crawl and "found many cases where personal and confidential information was accessible without logging in". It found email addresses "in 10,560 tables across 7,403 of the 24,664 websites (30%)", and warns "The 30% figure should therefore not be read as a confirmed data leak rate." Cases include "more than 1,000 records containing identity document details" and "More than 200,000 chat messages". It says "Handelsblatt contacted Lovable with the findings"; the page links no statement from Lovable. 699 points on [Hacker News](https://news.ycombinator.com/item?id=50499017), posted 14 Nov at 17:43 UTC. See [what vibe coding is](/blog/what-is-vibe-coding/). [Source](https://www.crissyfield.de/research/lovable-en/)
2. **Can DeepSeek V3 fit in one readable file?** A Show HN says yes, and its README says "190 lines of pure JAX", with MLA, DeepSeekMoE and MTP, pretrained "on a MacBook Air on public-domain detective fiction". It reports a 36.2M parameter model trained in about 2.6 hours: the author's own figures. 199 points on [Hacker News](https://news.ycombinator.com/item?id=50497589), posted 14 Nov at 15:04 UTC. Created 13 Nov; MIT, 129 stars. [Source](https://github.com/Vaibhaav-Tiwari/deepseek-v3-jax)

## How this list is built

We read our scout's report from X, checked releases, Hacker News and GitHub trending ourselves, and rechecked every item on its own page. A name only makes a list with an opened link and a signal: points, stars or a dated release. Points and stars were read on 15 Nov. It was a Saturday, so the release pages were quiet; the research blogs did not get the memo. Claude Code, Codex, Gemini CLI, OpenCode, Copilot CLI, Cline, Qwen Code, Paperclip, AionUi and OpenClaw shipped no stable release in the window. Goose v1.59.1's notes list no changes, LiteLLM v1.108.9 backports fixes to its 1.108 line, and Chrome DevTools MCP had no commits in the window.

<link rel="stylesheet" href="/blog/assets/media/agent-tools-today-2026-11-15/motion.css"><script defer src="/blog/assets/media/agent-tools-today-2026-11-15/motion.js"></script>
