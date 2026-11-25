---
title: "GLM-5.4: Z.ai's first loop transformer model, explained"
seoTitle: "GLM-5.4 (Nov 2026): Loop Transformer, 1M Context, Where to Use It"
description: "GLM-5.4 is Z.ai's first loop transformer model, out 23 Nov 2026. What looping means, where you can use it today and how to set it up in Claude Code."
date: 2026-11-24
category: concepts
categoryLabel: Concepts
type: Technical
primaryKeyword: "glm-5.4"
secondaryKeywords: ["glm 5.4", "glm-5.4 loop transformer", "glm-5.4 coding plan", "z.ai glm-5.4", "glm-5.4 claude code", "glm-5.4 api"]
tags: ["Concepts", "AI Agents", "Engines"]
faq:
  - q: "Is GLM-5.4 open source?"
    a: "Not yet. Z.ai's announcement of 23 Nov 2026 says: \"We plan to open-source the model weights responsibly after completing necessary safety hardening.\" It gives no date, so for now you reach the model through Z.ai's own products."
  - q: "Is the GLM-5.4 API available?"
    a: "Not on 24 Nov 2026. The announcement lists the API as \"Coming Soon\", and Z.ai's GLM-5.4 docs page says the Model API will be made available upon completion of the security assessment. Today it runs in the GLM Coding Plan, ZCode and Z.ai Chat."
  - q: "What is the GLM-5.4 model name in Claude Code?"
    a: "Z.ai's model switching guide, read 24 Nov 2026, sets the Claude Code model variables to glm-5.4[1m]. The [1m] suffix turns on the 1M context window, with CLAUDE_CODE_AUTO_COMPACT_WINDOW set to 1000000. After that, /status should show glm-5.4 or glm-5.4[1m]."
  - q: "How big is GLM-5.4?"
    a: "Z.ai describes it at the 750B scale. Its post says GLM-5.4 loops 28 layers of the GLM-5 base model for two iterations, and claims intelligence levels \"comparable to 2T-3T parameter models\". That comparison is Z.ai's own claim, and its charts are images, so this page gives no benchmark numbers."
  - q: "What is a loop transformer?"
    a: "A model that runs the same block of layers more than once per forward pass. Z.ai's post says the shared layers run for several iterations, each refining the result of the pass before. That gives a deeper network without adding parameters."
---

GLM-5.4 is Z.ai's new flagship model, launched 23 Nov 2026, and the first it built as a loop transformer: it runs one block of layers twice to reason deeper without adding parameters. You can use it today in the GLM Coding Plan, ZCode and Z.ai Chat; the API is not out yet. Checked 24 Nov 2026.

[Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer, with engines such as Claude Code, Codex and Gemini CLI. ZCode is a separate app, Z.ai's own. Setup for ours is in the [install guide](/blog/how-to-install-and-use-munder-difflin/).

| GLM-5.4 at a glance | As of 24 Nov 2026 |
| --- | --- |
| Announced | 23 Nov 2026, on the [Z.ai blog](https://z.ai/blog/glm-5.4) |
| Architecture | Loop Transformer: 28 layers of the GLM-5 base model, run twice |
| Scale | 750B base model, per Z.ai |
| Context | 1M tokens, 128K maximum output |
| Speed | Up to 200 tokens/s off peak, 70 to 80 at peak |
| Where to use it | GLM Coding Plan, ZCode, Z.ai Chat |
| API | Coming soon |
| Open weights | Planned, no date |

## What is GLM-5.4?

GLM-5.4 is Z.ai's latest flagship model. The [launch post](https://z.ai/blog/glm-5.4) calls it "our first flagship model built on the Loop Transformer architecture, reaching intelligence levels comparable to 2T-3T parameter models." That comparison is Z.ai's claim. The charts behind it are images, so we quote no scores here.

Z.ai's [GLM-5.4 docs page](https://docs.z.ai/guides/llm/glm-5.4), read 24 Nov 2026, lists video, image, text and file as input, text as output, a 1M context length and 128K maximum output tokens.

Z.ai pitches the release as the start of "Generalized Coding": code as the tool for work beyond software. Its examples: a self narrated music video, a 6 axis robotic arm modelled in FreeCAD, a complete game and an interactive 3D bird watching scene.

## What is a loop transformer?

A loop transformer runs the same layers more than once, so the model thinks deeper without more parameters. In a normal transformer each layer runs once per forward pass. Z.ai's post says that in a Loop Transformer "a group of weight-shared layers runs for multiple iterations, refining the hidden states from the previous pass."

For GLM-5.4 that means 28 layers, run twice. The post says the first pass "builds global context" and writes small updates, and the second pass reuses that state to refine the output. Z.ai did not train the loop from scratch. It adapted the pretrained GLM-5 base model through continued training.

<figure class="mg" data-scene="racetrack"><img src="/blog/assets/media/glm-5-4/racetrack.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a sky blue toy car drives around a lilac oval racetrack lined with soft white posts, under a blue banner that reads 28 layers. A yellow flag reads first pass on the first lap and second pass on the second lap, then the car stops at a mint finish line. Tapping the track runs both laps again."><figcaption>GLM-5.4 runs 28 layers of the GLM-5 base model twice: a first pass and a second pass, per Z.ai's post of 23 Nov 2026.</figcaption></figure>

Three changes balance gains against deployment cost at the 750B scale, per the post. Gated progressive updates stop hidden states from blowing up between passes. A hybrid KV cache means an extra loop costs "one sliding window of KV cache rather than a full context cache". Sparse attention index reuse lets the second loop reuse the first loop's attention indices.

A side effect: on a 30B test model, average output length dropped by 10 to 14% on most benchmarks, Z.ai's post of 23 Nov 2026 says, "mostly from shorter chains of thought".

Z.ai gives speeds of up to 200 tokens/s off peak and 70 to 80 tokens/s at peak.

<figure class="mg" data-scene="metronome"><img src="/blog/assets/media/glm-5-4/metronome.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a sky blue metronome swings fast while a soft white card above it reads up to 200 tokens/s off peak. It then swings slower as the card changes to 70 to 80 tokens/s at peak, and a lilac needle on a mint dial follows each swing. Tapping the metronome switches between the two speeds."><figcaption>Up to 200 tokens/s off peak and 70 to 80 tokens/s at peak, in Z.ai's post of 23 Nov 2026.</figcaption></figure>

## Where can you use GLM-5.4 today?

In three places: the GLM Coding Plan, ZCode and Z.ai Chat.

| Where | Status on 24 Nov 2026 | Source |
| --- | --- | --- |
| GLM Coding Plan | Open now, on Lite, Pro and Max | [Coding Plan overview](https://docs.z.ai/devpack/overview) |
| ZCode | Open now | [ZCode site](https://zcode.z.ai/en) |
| Z.ai Chat | Open now | Launch post |
| API | Coming soon | Launch post and docs page |
| Open weights | Planned, no date | Launch post |

The docs page says GLM-5.4 "is now available to all GLM Coding Plan users", and that on weekly quota plans its quota "is increased to 1.5× that of GLM-5.3". Plans are listed at [z.ai/subscribe](https://z.ai/subscribe). That page is drawn by JavaScript, so we quote no prices. ZCode's site now calls itself "Z.ai's Official Agent Harness for GLM-5.4", and our [ZCode explainer](/blog/what-is-zcode/) covers the app.

For the API, the launch post lists "API (Coming Soon)" and the docs page says "The Model API will be made available upon completion of the security assessment." For weights: "We plan to open-source the model weights responsibly after completing necessary safety hardening." Neither has a date. Z.ai also says its next, "significantly larger model" will "be ready soon".

<figure class="mg" data-scene="gate"><img src="/blog/assets/media/glm-5-4/gate.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, five soft white metal garden gates stand in a row on a mint path. Three swing open under blue signs reading GLM Coding Plan, ZCode and Z.ai Chat, each with a mint tag that says Open now. Two stay latched under lilac signs: API with a yellow tag that says Coming soon, and Open weights with a sky tag that says Planned. Tapping a gate swings it again and lifts its tag."><figcaption>On 24 Nov 2026 GLM-5.4 is open now in the GLM Coding Plan, ZCode and Z.ai Chat; the API is coming soon, per Z.ai's post of 23 Nov 2026.</figcaption></figure>

## How do you use GLM-5.4 with Claude Code or other agents?

Point the agent at Z.ai's endpoint with a Coding Plan key, then set the model: `glm-5.4[1m]` in Claude Code, `glm-5.4` in Cline. Z.ai's [model switching guide](https://docs.z.ai/devpack/latest-model), read 24 Nov 2026, gives these base URLs:

- Claude Code and Goose (Anthropic compatible): `https://api.z.ai/api/anthropic`
- Codex: `https://api.z.ai/api/v1`
- Other OpenAI compatible tools: `https://api.z.ai/api/coding/paas/v4`

The [Claude Code page](https://docs.z.ai/devpack/tool/claude) covers the base URL and key. To switch models, the guide adds these keys to `~/.claude/settings.json`, and warns not to replace the whole file:

```json
{
  "env": {
    "CLAUDE_CODE_AUTO_COMPACT_WINDOW": "1000000",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "glm-5.4[1m]",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "glm-5.4[1m]",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "glm-5.4[1m]"
  }
}
```

The `[1m]` suffix and the compact window of 1000000 turn on the 1M context. Run `claude`, type `/status`, and the model should read `glm-5.4` or `glm-5.4[1m]`. The `/effort` command sets thinking intensity, and the default is `max`.

Two limits from the [quick start](https://docs.z.ai/devpack/quick-start). The plan "is strictly limited to use within officially supported tools and products", and Coding Plan keys are managed separately from standard API keys. Other agents: see our [Claude Code alternatives](/blog/claude-code-alternatives/).

## Should you switch to GLM-5.4?

Yes if you already pay for a GLM Coding Plan, since it is a settings change. Otherwise, use Z.ai Chat or ZCode until the API opens. Plain rules:

1. On a GLM Coding Plan: set `glm-5.4[1m]` and compare it with GLM-5.3 on a task from your own repo.
2. Building on an API: wait, it is still "Coming Soon".
3. Want weights to host yourself: wait, there is no date.
4. Short tasks that drag: we think a lower `/effort` setting is the first thing to try, though Z.ai recommends `max` for coding tasks.

Z.ai names one flaw itself. The model "tends to get caught in overly long 'marathon thinking' loops", though Z.ai says that extra reflection "does consistently improve accuracy beyond its parameter count".

Our view: the loop idea is the interesting part, more depth from the same weights. But the comparison with 2T to 3T models is Z.ai's own, its scores sit in images, and the API is not out, so judge it on your own work. For another recent launch, see [Mistral Large 4](/blog/mistral-large-4/).

<link rel="stylesheet" href="/blog/assets/media/glm-5-4/motion.css"><script defer src="/blog/assets/media/glm-5-4/motion.js"></script>
