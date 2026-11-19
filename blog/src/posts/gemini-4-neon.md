---
title: "Gemini 4 Neon: Price, API and How It Compares (Nov 2026)"
description: "Gemini 4 Neon came out on 18 Nov 2026: $3 input and $15 output per 1M tokens, the gemini-4-neon model code, where to use it and how it compares."
date: 2026-11-19
category: concepts
categoryLabel: Concepts
type: Non-technical
primaryKeyword: "gemini 4 neon"
secondaryKeywords: ["gemini 4 neon price", "gemini 4 neon api", "gemini-4-neon", "gemini 4 neon vs carbon", "gemini 4 neon benchmarks", "gemini 4 neon release date"]
tags: ["Concepts", "AI Agents", "Models"]
faq:
  - q: "When was Gemini 4 Neon released?"
    a: "Google announced Gemini 4 Neon on 18 Nov 2026 and began rolling it out that day. The Gemini API changelog for 18 Nov 2026 lists gemini-4-neon as generally available on the paid tier."
  - q: "How much does Gemini 4 Neon cost?"
    a: "On 19 Nov 2026 Google's Gemini API pricing page listed Neon on the paid tier at $3.00 per million input tokens and $15.00 per million output tokens, thinking tokens included, with context caching at $0.15. Batch and Flex are $1.50 and $7.50. It is not available on the Free tier."
  - q: "What is the Gemini 4 Neon model code?"
    a: "The model code is gemini-4-neon. Google's model page, read on 19 Nov 2026, lists it as stable, with a context window of 1,048,576 tokens and 65,536 output tokens by default, or up to 1,048,576 with long decode."
  - q: "Is Gemini 4 Neon better than Gemini 4 Carbon?"
    a: "Google does not say so. Its developer guide says Neon \"sits between Gemini 4 Hydrogen and Gemini 4 Carbon for high-frequency complex tasks\" and sends the hardest problems to Carbon. Google's own figures, published 18 Nov 2026, give Neon a 32% lower cost per task than Carbon at the default high thinking level."
  - q: "Can I use Gemini 4 Neon for free?"
    a: "Not in the Gemini API. On 19 Nov 2026 Google's pricing page says Neon \"is not available on the Free tier\". Google's launch post of 18 Nov 2026 lists Google AI Pro and Ultra subscribers for the Gemini app, Google AI Studio and Google Antigravity."
---

Gemini 4 Neon is Google's new Gemini 4 model for coding, office work and science, released on 18 Nov 2026 in its [launch post](https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-neon/). On 19 Nov 2026 Google's [pricing page](https://ai.google.dev/gemini-api/docs/pricing) listed $3.00 input and $15.00 output per 1M tokens on the paid tier, with no free tier.

New models end up inside the agents you run. [Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. It runs engines such as Gemini CLI, Claude Code and Codex. The [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup, and [OmniAgent alternatives](/blog/omniagent-alternatives/) compares other tools that run several agents.

## What is Gemini 4 Neon?

Gemini 4 Neon is Google's Gemini 4 model for complex coding, analysis and enterprise work that has to finish fast. The launch post of 18 Nov 2026 sums it up as "Bringing frontier-level intelligence with fast end-to-end task completion across complex software engineering, knowledge work, and science workflows."

The [model card](https://deepmind.google/models/model-cards/gemini-4-neon/), published 18 Nov 2026, says "Gemini 4 Neon is adapted from Gemini 4 Carbon" and gives a knowledge cutoff of March 2026.

Google's [model page](https://ai.google.dev/gemini-api/docs/models/gemini-4-neon), read 19 Nov 2026, lists `gemini-4-neon` as stable. Its context window is 1,048,576 tokens, input and output combined. Output stops at 65,536 tokens by default, or up to 1,048,576 with long decode. Inputs are "Text, Image, Video, Audio, and PDF"; output is Text.

<figure class="mg" data-scene="prism"><img src="/blog/assets/media/gemini-4-neon/prism.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, five thin beams in sky, mint, lilac, yellow and blue slide into a soft white glass prism, labelled Text, Image, Video, Audio and PDF. A single blue beam leaves the far side labelled Text, and a yellow card under the prism reads 1,048,576 tokens. Tap the prism to send the beams again."><figcaption>Neon reads text, images, video, audio and PDF and writes text, in a window of 1,048,576 tokens, per Google's model page read 19 Nov 2026.</figcaption></figure>

## Who can use Gemini 4 Neon, and where?

Paying Gemini API developers and Google AI Pro and Ultra subscribers, rolling out from 18 Nov 2026. The Gemini API [changelog](https://ai.google.dev/gemini-api/docs/changelog) that day lists it as "generally available (GA)". Google's launch post lists:

- **Gemini API:** the paid tier, in Google AI Studio and Android Studio.
- **Google AI Studio:** "all Pro and Ultra subscribers can try it in AI Studio".
- **Google Antigravity:** paid Google AI Pro and Ultra subscribers.
- **Gemini app:** Google AI Pro and Ultra subscribers, from the model drop down.
- **Gemini for business:** "via the API or model drop-down".
- **Cyber defenders:** Neon for cyber is "rolling out to trusted defenders in the coming days as part of the Fairwind Program."

Google Cloud's [Gemini Enterprise Agent Platform docs](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/4-neon), updated 19 Nov 2026, list Neon as GA and "available to verified enterprise customers in select regions". The ten latest [Gemini CLI releases](https://github.com/google-gemini/gemini-cli/releases), read 19 Nov 2026, do not mention Neon.

## How much does Gemini 4 Neon cost?

Gemini 4 Neon costs $3.00 per 1M input tokens and $15.00 per 1M output tokens on the paid tier, per Google's pricing page read 19 Nov 2026, in four ways to buy:

| Neon, paid tier, per 1M tokens, read 19 Nov 2026 | Standard | Batch | Flex | Priority |
| --- | --- | --- | --- | --- |
| Input | $3.00 | $1.50 | $1.50 | $5.40 |
| Output, thinking included | $15.00 | $7.50 | $7.50 | $27.00 |
| Context caching | $0.15 | $0.075 | $0.075 | $0.27 |

The page says Neon "is not available on the Free tier", and caching is "Implicit caching only". The launch post calls the cached price "a 95% discount" (18 Nov 2026). The page states no end date for Neon's prices.

The order changes on 1 Dec 2026. The same page lists Carbon and Argon at $2.00 input and $10.00 output through 30 Nov 2026, less than Neon. From 1 Dec 2026 they cost $4.00 and $20.00, more than Neon's undated $3.00 and $15.00. On 19 Nov 2026 Hydrogen costs $1.50 and $7.50 with no end date, and keeps a free tier.

<figure class="mg" data-scene="thermometer"><img src="/blog/assets/media/gemini-4-neon/thermometer.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a soft white thermometer with a blue column stands beside yellow tags reading Hydrogen $1.50, Carbon and Argon $2.00, Neon $3.00 and From 1 Dec 2026 $4.00. A sky card on top reads Input per 1M tokens. The blue column rises and stops at Neon $3.00, then a lilac arrow lifts the Carbon and Argon tag from $2.00 to $4.00. Tap the thermometer to run it again."><figcaption>Paid tier input price per 1M tokens on Google's pricing page, read 19 Nov 2026: Neon $3.00, Hydrogen $1.50, Carbon and Argon $2.00 through 30 Nov 2026 and $4.00 from 1 Dec 2026.</figcaption></figure>

## How does Gemini 4 Neon compare to Argon, Carbon and Hydrogen?

Google places Neon between [Gemini 4 Hydrogen](/blog/gemini-4-hydrogen/) and [Gemini 4 Carbon](/blog/gemini-4-carbon/). Its launch post of 18 Nov 2026 says: "While Carbon tackles your hardest, long-horizon projects and Hydrogen handles fast everyday execution, Neon balances depth and efficiency." Google's [developer guide](https://ai.google.dev/gemini-api/docs/whats-new-gemini-4-neon) says Neon "sits between Gemini 4 Hydrogen and Gemini 4 Carbon for high-frequency complex tasks".

<figure class="mg" data-scene="tuningfork"><img src="/blog/assets/media/gemini-4-neon/tuningfork.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, three tuning forks stand in a row from small to large: a mint fork labelled Hydrogen, a lilac fork labelled Neon and a blue fork labelled Carbon. The Neon fork hums with sky rings and a yellow card above it reads Balances depth and efficiency. Tap a fork to make it hum."><figcaption>Google places Neon between Hydrogen and Carbon, saying it "balances depth and efficiency", in its launch post of 18 Nov 2026.</figcaption></figure>

[Gemini 4 Argon](/blog/gemini-4-argon/) is not in that line. The pricing page calls Argon "Our efficient Gemini 4 frontier reasoning model". In its Frontier Safety Assessment, the model card says Neon "showed an increase in general capability under our MCC assessment compared with Gemini 4 Argon". The increase "falls below our MCC threshold" (Material Capability Change), so Google carries forward Argon's capability evaluation results.

Google's own figures for Neon, from the launch post of 18 Nov 2026:

- **Cost per task:** "a 32% lower cost per task than Carbon" at the default high thinking level.
- **Security:** 70.7% on Collinear's CWE-bench v2, "a 3.4% uplift over Carbon" (18 Nov 2026).
- **Behaviour:** 0.0% cheating on Terminal-Bench 4.0, matching Carbon, and shortcuts on 2.45% of tasks in Google's coding cheating evaluation, "the lowest rate of any Gemini 4 model" (18 Nov 2026).
- **Overall:** "#3 overall with a score of 61 on the Artificial Analysis Intelligence Index at its xhigh thinking level".

Against Hydrogen, Google's own figures on HLE-Diamond, which both model cards take from the Artificial Analysis leaderboard: Neon 71.3% (card of 18 Nov 2026), Hydrogen 58.8% ([card](https://deepmind.google/models/model-cards/gemini-4-hydrogen/) of 12 Nov 2026).

Our view: these are Google's launch day numbers, and the price gap with Carbon flips on 1 Dec 2026. Test both on your own jobs before you budget.

## How do you use Gemini 4 Neon with agents?

Pass the model code `gemini-4-neon` to the Gemini API on the paid tier. Google's developer guide, read 19 Nov 2026, says it works with `generateContent` and the Interactions API, and defaults to the `high` thinking level with a 64K synchronous output limit. Google's example at the deepest level:

```python
from google import genai

client = genai.Client()
interaction = client.interactions.create(
    model="gemini-4-neon",
    input="Audit this payment retry queue for race conditions and rewrite the lock acquisition logic.",
    generation_config={"thinking_level": "xhigh"},
)
print(interaction.output_text)
```

The same guide advises: "Start with `high` for most complex tasks, and reserve `xhigh` for hard, multi-step problems where `high` falls short."

The launch post says Neon works "standalone or acting as a fast, high-judgment Orchestrator directing parallel Hydrogen subagents in Google Antigravity". The guide adds that the Antigravity agent in Gemini Managed Agents supports it, "either standalone or paired with Hydrogen in multi-model workflows".

## Gemini 4 Neon at a glance, checked 19 Nov 2026

| | Gemini 4 Neon |
| --- | --- |
| Released | 18 Nov 2026 |
| Model code | `gemini-4-neon`, stable |
| Price | $3.00 input and $15.00 output per 1M tokens, paid tier |
| Cached input | $0.15 per 1M tokens |
| Free tier | Not available |
| Context window | 1,048,576 tokens, input and output combined |
| Thinking levels | low, medium, high (default), xhigh |
| Knowledge cutoff | March 2026, per the model card |
| Place in the family | Between Hydrogen and Carbon |

<link rel="stylesheet" href="/blog/assets/media/gemini-4-neon/motion.css"><script defer src="/blog/assets/media/gemini-4-neon/motion.js"></script>
