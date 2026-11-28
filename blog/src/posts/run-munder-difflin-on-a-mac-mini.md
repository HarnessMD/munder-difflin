---
title: "Run Munder Difflin Locally on a Mac Mini"
description: "Run a whole Munder Difflin office offline on an Apple silicon Mac mini: size the model to your unified memory, install Ollama or LM Studio, and wire OpenCode, Crush, Qwen and Pi to it. Current as of Munder Difflin 0.5.2 and the M6 and M5 Pro Mac mini."
date: 2026-06-22
updated: 2026-09-10
category: guides
categoryLabel: Guides
type: Technical
draft: false
primaryKeyword: "run munder difflin on a mac mini"
secondaryKeywords: ["local llm mac mini", "ollama mac mini", "apple silicon unified memory llm", "offline ai agents mac", "lm studio mac mini agents", "m6 mac mini local llm"]
tags: ["Guides", "Local-First", "Mac Mini", "Ollama", "LM Studio", "BYOK"]
author:
  name: Chaitanya Giri
  initials: CG
faq:
  - q: "Can a Mac mini run a Munder Difflin office offline?"
    a: "Yes. The Mac mini serves an open model through Ollama or LM Studio, and OpenCode, Crush, Qwen and Pi agents point at that local server. Munder Difflin's routing, mailboxes, memory and schedules already run on your machine, so once the model is local, the agents' work loop does not need the internet."
  - q: "How much memory does a Mac mini need for local AI agents?"
    a: "It depends on the size of the model, not the number of agents, because every agent shares one model server. As a rule of thumb for 4 bit models: 16 GB runs about 8B comfortably, 24 GB up to about 14B, 32 GB up to about 32B, and 64 GB runs a 70B class model."
  - q: "Which Mac mini should I buy for local models?"
    a: "Buy for the biggest model you want to run, because the memory cannot be upgraded later. As of September 2026 the M6 Mac mini goes up to 32 GB and the M5 Pro model goes up to 64 GB. For 30B class models, 32 GB is the sweet spot. For 70B class models, get the M5 Pro with 64 GB."
  - q: "Ollama or LM Studio on a Mac mini?"
    a: "Either works. Both serve an OpenAI compatible endpoint the engines can use. Ollama is a light background service that suits an always on box, and LM Studio is an app with a model browser and a one click local server. You can run both on different ports."
  - q: "How does Pi use a local model?"
    a: "Through Pi's own config. Add the local server to ~/.pi/agent/models.json, and Munder Difflin copies that file into every Pi agent it starts."
---

<div class="callout tldr"><span class="ic">TL;DR</span><p>An Apple silicon <strong>Mac mini</strong> can run
a whole <strong>Munder Difflin</strong> office offline. Serve an open model with <strong>Ollama</strong> or
<strong>LM Studio</strong>, size it to your <strong>unified memory</strong> (16 GB about 8B, 24 GB about 14B, 32 GB
about 32B, 64 GB a 70B class model at 4 bit), then point <strong>OpenCode</strong>, <strong>Crush</strong> and
<strong>Qwen</strong> at it in <strong>Settings → AI Engines</strong> and add it to <strong>Pi</strong>'s own models file.
The office's routing, mailboxes and schedules are <a href="/blog/local-first-ai-agent-orchestration/">already local
first</a>.</p></div>

Running one local model in a chat window is a hobby. Putting a whole team of agents to work on your own hardware, with no
API bill and nothing leaving the room, is a different project. Munder Difflin's plumbing already runs on your machine: message
routing, mailboxes, memory, schedules and git history. The one piece that usually calls out to the internet is the model. Move
that onto the Mac mini and the agents' whole loop stays in the room.

This guide covers picking a Mac mini, sizing a model to its memory, installing a model server and wiring each engine, checked
against Munder Difflin 0.5.2 and Apple's Mac mini lineup on 10 September 2026.

## Why is a Mac mini a good box for local agents?

Unified memory. On Apple silicon the CPU and GPU share one pool of fast memory, so the model's weights sit right where the GPU
works on them, with no copying across a bus. A 32 GB Mac mini holds a model that would need a 32 GB graphics card on a PC, for
a fraction of the power. It is also small and quiet, which makes it a natural always on box.

One catch up front: **the memory is part of the chip and cannot be upgraded later.** Buy for the largest model you plan to run.

## How much memory do you need?

Enough for the model, not for the agents. Every agent shares one model server, so ten agents and two agents on the same model
need about the same memory.

A 4 bit model needs roughly **0.6 GB per billion parameters**, plus room for context, the model server and macOS. macOS also
caps how much memory the GPU can hold by default, somewhere around two thirds to three quarters of it. On a dedicated box you can
raise that ceiling with `sudo sysctl iogpu.wired_limit_mb=<MB>`. A practical rule: **plan for the model to use about two thirds of
your memory.**

Here is the Mac mini range as of September 2026, and what each memory size runs comfortably at 4 bit:

| Mac mini | Memory | Comfortable model size |
|---|---|---|
| M6 | 16 GB | About 8B |
| M6 | 24 GB | Up to about 14B |
| M6 | 32 GB | Up to about 32B, with shorter context |
| M5 Pro | 24 GB | Up to about 14B, generated faster |
| M5 Pro | 48 GB | 32B with room, or 70B at heavy quantization |
| M5 Pro | 64 GB | 70B class at 4 bit |

The M5 Pro also has much faster memory, 307 GB/s against up to 170 GB/s on the M6, and that shows up as tokens per second.

A concrete pick for each memory size, pulled with `ollama pull <tag>`:

| Memory | Pick (Ollama tag) | Good for |
|---|---|---|
| 16 GB | `gpt-oss:20b` (tight), or `qwen3:8b` or `deepseek-r1:8b` for more context room | The smallest capable default |
| 24 GB | `qwen3:14b` or `mistral-small:24b` | A roomy generalist |
| 32 GB | `qwen3:30b-a3b`, `qwen3-coder:30b` or `deepseek-r1:32b` | The sweet spot: generalist, coding or reasoning |
| 48 GB | `glm-4.7-flash` at 8 bit, or `mixtral:8x7b` | Bigger context |
| 64 GB | `llama3.3:70b` or `deepseek-r1:70b` | A 70B class generalist or reasoner |

<div class="callout note"><span class="ic">Heads up</span><p><strong>What a Mac mini cannot run.</strong> The frontier open
flagships, like Kimi K2.6 and Qwen3 235B, are server class and far beyond 64 GB. Use a provider for those, which the
<a href="/blog/run-munder-difflin-on-open-models/">open models guide</a> covers. And <code>gpt-oss:120b</code> needs about 96 GB,
which means a Mac Studio rather than a mini.</p></div>

{% img "note-1" %}

## Step 1: Install a model server

Ollama or LM Studio. Both serve an OpenAI compatible endpoint, which is what the engines talk to.

### Ollama: light, good for an always on box

```bash
brew install ollama
ollama serve              # serves the API on http://localhost:11434
ollama pull gpt-oss:20b   # swap in the tag for your memory size
```

Its OpenAI compatible API lives at **`http://localhost:11434/v1`**. It runs as a background service, which suits a box you leave on.

### LM Studio: an app with a model browser

Download it from [lmstudio.ai](https://lmstudio.ai), find and download a model inside the app, then start its local server from the
Developer section. It serves an OpenAI compatible API at **`http://localhost:1234/v1`**.

You can run both, Ollama on 11434 and LM Studio on 1234, and point different engines at different ports to compare models.

## Step 2: Wire each engine to the local server

Four engines can use a local model on your Mac mini floor.

### OpenCode

Open **Settings → AI Engines** and set OpenCode's local base URL to `http://localhost:11434/v1`. The app injects it as a local
provider when the agent starts. Pick the model as `local/<tag>`, for example `local/gpt-oss:20b`.

### Crush

Set Crush's local base URL in the same panel. Crush runs through a small local proxy inside the app, and your server becomes that
proxy's upstream, so there is no Crush config to edit by hand. Pick the model as `ollama/<tag>`, for example `ollama/gpt-oss:20b`.

### Qwen

Set Qwen's local base URL and default model in the same panel. Qwen uses the same proxy approach as Crush.

### Pi

Pi reads local models from its own file, `~/.pi/agent/models.json`, and Munder Difflin copies that file into every Pi agent it
starts. The app's base URL field for Pi stays reserved. Add Ollama like this, then pick `ollama/gpt-oss:20b`:

```json
{
  "providers": {
    "ollama": {
      "baseUrl": "http://localhost:11434/v1",
      "api": "openai-completions",
      "apiKey": "ollama",
      "models": [{ "id": "gpt-oss:20b" }]
    }
  }
}
```

For LM Studio, use `http://localhost:1234/v1` and the model id LM Studio shows you.

{% img "note-2" %}

## Step 3: Run the office

With a model served and the engines pointed at it, hire workers from the
[Agent Gallery or Add agent](/blog/how-to-hire-from-the-agent-gallery/), give Michael a goal, and let it run. Messages move between
agents through [file mailboxes](/blog/atomic-file-mailboxes-for-agents/), schedules fire on local timers, and git keeps the history.

A few notes for an always on Mac mini:

- **One model, many workers.** Every agent shares the model server, so the limit is the chip's speed, not memory per agent. Watch
  tokens per second under load, and keep contexts trim on 16 and 24 GB.
- **Keep it awake.** Set the Mac mini not to sleep, or run `caffeinate`, so schedules keep firing. Munder Difflin also holds the
  machine awake while at least one agent is running.
- **Quantization is your lever.** If a model does not fit, try a smaller quantization before you try a smaller model.
- **Mix engines freely.** OpenCode, Crush, Qwen and Pi can all share the same local server, so choose per agent.

## Where to go next

- [Run Munder Difflin on open models](/blog/run-munder-difflin-on-open-models/) adds the provider route and the full list of quick picks.
- [Why local first matters for AI agents](/blog/why-local-first-matters-for-ai-agents/), for the reasoning behind all of this.
- New to the app? Start with [how to install and use Munder Difflin](/blog/how-to-install-and-use-munder-difflin/).
