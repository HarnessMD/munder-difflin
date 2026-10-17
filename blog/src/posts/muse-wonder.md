---
title: "Muse Wonder and Muse Code: Meta's new models, prices and scores"
description: "Meta's Muse Wonder and Muse Wonder Full: API price, Muse Code plans, context window and Meta's own coding scores, checked 13 Oct 2026."
date: 2026-10-13
category: concepts
categoryLabel: Concepts
type: Non-technical
primaryKeyword: "muse wonder"
secondaryKeywords: ["meta muse wonder", "muse wonder full", "muse code", "muse wonder pricing", "muse wonder api", "muse wonder benchmarks", "muse wonder vs muse spark"]
tags: ["Concepts", "AI Agents"]
faq:
  - q: "What is Muse Wonder?"
    a: "Muse Wonder is a series of two AI models from Meta, Muse Wonder and Muse Wonder Full. Meta's launch post of 12 October 2026 calls them its most capable models, for personal and professional agentic tasks and coding. Meta's model card lists text, image, video and audio input, text output and a context length of 1M tokens at inference."
  - q: "What is Muse Code?"
    a: "Muse Code is Meta's coding agent that runs in your terminal. Meta's Muse Code page, read on 13 Oct 2026, prints an install command and says it is available for MacOS and Windows. Meta's launch post says Muse Wonder is available today in Muse Code, and Muse Wonder Full is available today for Muse Code subscribers."
  - q: "How much does Muse Wonder cost?"
    a: "Meta's model page listed Muse Wonder at $4.00 input, $0.20 cached input and $20.00 output per Mtok on 13 Oct 2026. The model page prints no token price for Muse Wonder Full. The model page says Muse Wonder Full is included with a Muse Code subscription, with access on the Power Usage and Maximum Usage plans, which the Muse Code page listed at $50.00/month and $200.00/month."
  - q: "What is the difference between Muse Wonder and Muse Wonder Full?"
    a: "Meta's model card calls Muse Wonder Full its most capable variant. On 13 Oct 2026 Meta's model page listed Muse Wonder as available in the Model API and Muse Code with a token price, and Muse Wonder Full as available by subscription in Muse Code. Both were listed with a 1M context window."
  - q: "Is Muse Wonder better than Claude Opus 5.5 at coding?"
    a: "It depends on the test, on the figures Meta published. Meta's table has Muse Wonder Full ahead on DeepSWE 1.1 (79.0 against 74.2) and SWE-Marathon (57.5 at xhigh effort against 46.3), and Claude Opus 5.5 ahead on Terminal-Bench 4.0-AA (59.6 against 57.1) and ProgramBench (70.5 against 59.0). Meta's model card says the SWE-Marathon row is not a controlled common-harness comparison."
---

Our view: Muse Wonder is a real contender for coding agents, not a clear winner. Meta announced Muse Wonder and Muse Wonder Full on 12 October 2026. In Meta's own coding table, Muse Wonder Full tops two of four rows and Claude Opus 5.5 tops the other two. Checked 13 Oct 2026.

New coding models drive coding agents. [Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of coding agents such as Claude Code, Codex and Gemini CLI on your own computer. The [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup, and the [Concepts hub](/blog/topics/concepts/) explains the terms.

## What is Muse Wonder?

Muse Wonder is a pair of AI models from Meta, Muse Wonder and Muse Wonder Full, aimed at agent work and coding. Meta's [launch post](https://research.meta.ai/blog/muse-wonder), dated October 12, 2026, calls them "our most capable models". Meta's [model card](https://research.meta.ai/static/muse-wonder-model-card) lists text, image, video and audio input, text output and a context length of "1M tokens at inference".

The [Hacker News thread](https://news.ycombinator.com/item?id=50059115) had more than 600 points on 13 Oct 2026.

## What is the difference between Muse Wonder and Muse Wonder Full?

Muse Wonder Full is the more capable of the two by Meta's description, and it comes by subscription with no token price. Meta's model card calls Muse Wonder Full "our most capable variant". The rows are our selection from Meta's [model page](https://dev.meta.ai/models/muse-wonder), read on 13 Oct 2026.

| | Muse Wonder | Muse Wonder Full |
| --- | --- | --- |
| Model ID | muse-wonder-1.0 | muse-wonder-full-1.0 |
| Context window | 1M | 1M |
| Listed in | Model API and Muse Code | Muse Code, by subscription |
| Token price | Listed | None listed |

## Where can you use Muse Wonder today?

Meta's launch post says you can use Muse Wonder today through the Meta Model API and Muse Code, and Muse Wonder Full as a Muse Code subscriber. Meta's model page narrows Muse Wonder Full to "Access on the Power Usage and Maximum Usage plans".

Muse itself comes later. Meta's launch post says Muse Wonder "will soon power experiences in Muse, and will roll out first to subscribers", with no date. Our [Meta Muse alternatives](/blog/meta-muse-alternatives/) list covers the Muse app.

<figure class="mg" data-scene="hooks"><img src="/blog/assets/media/muse-wonder/hooks.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A row of coat hooks on a wall is labelled Meta Model API, Muse Code and Muse. A jacket tagged Muse Wonder drops onto the Meta Model API hook and another onto the Muse Code hook. A jacket tagged Muse Wonder Full drops onto the Muse Code hook. The Muse hook stays empty, with only a dashed outline of a jacket, while a tag reading soon swings on it."><figcaption>Availability in Meta's launch post of 12 October 2026. The drawing shows hooks and jackets.</figcaption></figure>

## What is Muse Code?

Muse Code is Meta's coding agent that runs in your terminal. Meta's [Muse Code page](https://dev.meta.ai/products/muse-code) calls it "A coding agent for your most complex coding workstreams".

The Muse Code page prints its install command with and without flags, the fuller being `curl -fsSL https://dev.meta.ai/install.sh | bash`, and says "Available for MacOS and Windows". The Muse Code page does not mention Linux.

Meta's [developer home page](https://dev.meta.ai/) says "Multi-agent coding in your terminal". On 14 Oct 2026 the Muse Code page said "powered by Muse models", and its plans listed Muse Wonder.

<figure class="mg" data-scene="toolbox"><img src="/blog/assets/media/muse-wonder/toolbox.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A toolbox labelled Muse Code opens. A hammer, a saw and a screwdriver lift out and work side by side on one plank, while a spirit level slides along behind them checking the work."><figcaption>Meta's Muse Code page, read 13 Oct 2026, says "Workers in parallel, reviewers in the background". The drawing shows tools.</figcaption></figure>

## What does Muse Wonder cost?

Through the API, Muse Wonder costs $4.00 input, $0.20 cached input and $20.00 output per Mtok, on Meta's model page as read on 13 Oct 2026. We read Mtok as a million tokens. Muse Wonder Full has no token price: Meta's model page says it is "Included with a Muse Code subscription". Meta's Muse Code page listed four plans on 13 Oct 2026.

| Muse Code plan | Price | Usage listed |
| --- | --- | --- |
| Everyday Usage | $5.00/month | 10 to 50 prompts every 5 hours |
| High Usage | $15.00/month | 5x more than Everyday Usage |
| Power Usage | $50.00/month | 20x more than Everyday Usage |
| Maximum Usage | $200.00/month | 80x more than Everyday Usage |

The Muse Code page lists no token allowance for any plan, as of 13 Oct 2026.

For comparison, the Muse Code page listed muse-spark-1.3 at $1.25 input and $4.25 output per Mtok on 13 Oct 2026.

<figure class="mg" data-scene="ladder"><img src="/blog/assets/media/muse-wonder/ladder.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A ladder with four rungs labelled Everyday Usage, High Usage, Power Usage and Maximum Usage. Cards reading $5.00/month, $15.00/month, $50.00/month and $200.00/month clip onto the rungs from the bottom up. Then a ribbon reading Muse Wonder Full ties onto the Power Usage and Maximum Usage rungs. A note beside the ladder gives the usage listed for one plan at a time."><figcaption>Plans from Meta's Muse Code page, read 13 Oct 2026. The drawing shows a ribbon on the two plans Meta's model page names for Muse Wonder Full.</figcaption></figure>

## What are Active Memory and Active Focus?

They are Meta's names for two behaviours: remembering what matters across conversations, and sticking with a hard task. Meta's launch post defines Active Memory as "carrying important context about you across conversations", and says Active Focus "describes how Muse Wonder continues working toward a challenging goal".

Meta's launch post names no setting that turns either one on. Our view: wait for outside tests before you rely on either.

## How good is Muse Wonder at coding?

On Meta's own figures, Muse Wonder Full leads two of the four coding rows and Claude Opus 5.5 leads the other two. The table holds the four coding rows from Meta's model card, our selection from its 14 rows. Each number is Meta's own figure, and Meta's model page labels every column "(max)".

| Benchmark | Muse Wonder Full | Muse Wonder | Claude Fable 5.1 | GPT-6 Astra | Claude Opus 5.5 |
| --- | --- | --- | --- | --- | --- |
| Terminal-Bench 4.0-AA | 57.1 | 52.0 | 52.0 | 59.1 | 59.6 |
| DeepSWE 1.1 | 79.0 | 78.8 | 67.4 | 74.1 | 74.2 |
| SWE-Marathon | 57.5 (xhigh) | 53.1 | 45.6 | 42.5 | 46.3 |
| ProgramBench | 59.0 | 50.0 | 55.5 | 52.5 | 70.5 |

Claude Opus 5.5 scores higher than both Muse Wonder models on Terminal-Bench 4.0-AA and ProgramBench. Muse Wonder, the model with an API price, is lowest of the five on ProgramBench.

Meta's model card says the SWE-Marathon row "is not a controlled common-harness comparison" and that Muse Wonder Full "was reported with xhigh reasoning effort" there. The model card names outside result sources: Artificial Analysis for Terminal-Bench 4.0, Abundant AI for SWE-Marathon, and Datacurve for three of the five DeepSWE scores.

<figure class="mg" data-scene="magnifier"><img src="/blog/assets/media/muse-wonder/magnifier.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A magnifying glass slides down a sheet with four rows: Terminal-Bench 4.0-AA, DeepSWE 1.1, SWE-Marathon and ProgramBench. It stops on each row and enlarges the highest number: 59.6 for Claude Opus 5.5, 79.0 for Muse Wonder Full, 57.5 (xhigh) for Muse Wonder Full, then 70.5 for Claude Opus 5.5."><figcaption>Meta's own figures from its model card, read 13 Oct 2026. Our selection of rows. The drawing shows the highest score in each.</figcaption></figure>

## What did Meta say about safety?

Meta's launch post says Muse Wonder "offers our strongest safeguards to date" against CBRN and cyber misuse, and that a fuller safety report "will be available soon".

Meta's model card says that without mitigations Meta does "not rule out" Muse Wonder Full reaching the high risk threshold in the Chemical & Biological domain. With mitigations, the model card puts it at "moderate or lower" across all domains. For agent builders, the model card recommends "human-in-the-loop confirmation for irreversible actions".

## What does it mean if you run coding agents locally?

It means one more hosted model your agents can call, not a model you can download. None of the five Meta pages we read offers Muse Wonder's weights. Meta's developer home page lists a different model, Muse Glimmer, as "available on Hugging Face".

Our view: the agent can still run on your machine, but its prompts go to Meta. Our comparison of [local-first and cloud agent SDKs](/blog/local-first-vs-cloud-agent-sdks/) covers that trade-off.

## What should you do now?

Try Muse Wonder on one real task before you move work to it.

1. Read Meta's [model page](https://dev.meta.ai/models/muse-wonder) again before you budget.
2. For Muse Wonder Full, check your Muse Code plan.
3. Compare with [Claude Haiku 5.5](/blog/claude-haiku-5-5/) and [Mistral Large 4](/blog/mistral-large-4/).

<link rel="stylesheet" href="/blog/assets/media/muse-wonder/motion.css"><script defer src="/blog/assets/media/muse-wonder/motion.js"></script>
