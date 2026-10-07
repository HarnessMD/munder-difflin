---
title: "Claude Haiku 5.5: price, benchmarks and where it fits"
description: "Claude Haiku 5.5 is Anthropic's new small model. Its tiered price, Anthropic's own scores and how to pick it in Claude Code, checked 8 Oct 2026."
date: 2026-10-08
category: concepts
categoryLabel: Concepts
type: Non-technical
primaryKeyword: "claude haiku 5.5"
secondaryKeywords: ["claude haiku", "haiku 5.5", "claude haiku 5.5 pricing", "claude haiku 5.5 vs haiku 4.5", "claude haiku 5.5 claude code", "claude-haiku-5-5"]
tags: ["Concepts", "Claude Code", "AI Agents"]
faq:
  - q: "How much does Claude Haiku 5.5 cost?"
    a: "Anthropic's announcement of 7 October 2026 lists $0.10 input and $0.50 output per million tokens for prompts up to 100,000 tokens, and $0.50 input and $2.50 output for prompts over 100,000 tokens. Cache reads are $0.01 and $0.05. Checked 8 Oct 2026."
  - q: "Is Claude Haiku 5.5 better than Haiku 4.5?"
    a: "On Anthropic's own figures, yes on every row where both have a score. For example, the announcement lists 72.4% for Haiku 5.5 and 15.7% for Haiku 4.5 on the offline subset of OSWorld 2.1. We did not run these tests."
  - q: "Is Claude Haiku 5.5 better than Sonnet 5.5?"
    a: "No. Sonnet 5.5 is ahead on every row of Anthropic's own benchmark table, and the announcement says Sonnet 5.5 and Opus 5.5 remain better choices for complex agentic coding tasks. Haiku 5.5 is the cheaper and faster option."
  - q: "What is the model ID for Claude Haiku 5.5?"
    a: "It is claude-haiku-5-5 on the Claude API, Google Cloud, Microsoft Foundry and Claude Platform on AWS, and anthropic.claude-haiku-5-5 on Amazon Bedrock, according to Anthropic's model page read on 8 Oct 2026."
  - q: "How do I use Claude Haiku 5.5 in Claude Code?"
    a: "Claude Code's model docs say to run /model claude-haiku-5-5 in a session, or start with claude --model claude-haiku-5-5. The same page says to use Claude Code v2.1.293 or later with Haiku 5.5. Read on 8 Oct 2026."
---

Claude Haiku 5.5 is Anthropic's new small model: much cheaper than Haiku 4.5 on prompts up to 100,000 tokens, and behind Sonnet 5.5 on every row of Anthropic's own benchmark table. Anthropic released it on 7 October 2026. We have not tried it. Checked 8 Oct 2026.

[Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of coding agents such as Claude Code, Codex and Gemini CLI on your own computer. A cheaper small model matters when several agents run at once, which is why we cover it. The [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup and the [Concepts hub](/blog/topics/concepts/) explains the terms.

## What is Claude Haiku 5.5?

It is Anthropic's new small model, with the model ID `claude-haiku-5-5`. Anthropic's [announcement](https://www.anthropic.com/claude-haiku-5-5), dated October 7, 2026, calls it "the cheapest, fastest, and most capable small model we've ever released" and says it is designed for high-volume, cost-sensitive tasks.

The speed claim has a footnote. Anthropic says Haiku 5.5 is its fastest model to date at each model's standard speed, although it runs less quickly than its Opus models in Fast Mode.

Anthropic's [model page](https://platform.claude.com/docs/en/models/haiku-5-5/overview), read on 8 Oct 2026, lists a 1M token context window and a maximum output of 128K tokens. The announcement adds that this is the first Haiku-class model with an adjustable effort setting.

The [Hacker News thread](https://news.ycombinator.com/item?id=49996437) had more than 300 points and 140 comments when we checked on 8 Oct 2026.

<figure class="mg" data-scene="stopwatch"><img src="/blog/assets/media/claude-haiku-5-5/stopwatch.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A stopwatch labelled Haiku 5.5 starts, its hand sweeps round and stops. Two paper labels slide in beside it: one reads fastest to date at standard speed, the other reads Opus in Fast Mode is quicker."><figcaption>Anthropic calls Haiku 5.5 its fastest model to date at standard speed, with Opus in Fast Mode quicker. Announcement of 7 October 2026.</figcaption></figure>

## What does Claude Haiku 5.5 cost?

It costs $0.10 per million input tokens and $0.50 per million output tokens for prompts up to 100,000 tokens, as of 8 Oct 2026, and five times that above. These are the prices in the table in Anthropic's [announcement](https://www.anthropic.com/claude-haiku-5-5), per 1 million tokens.

| Price per 1M tokens | Haiku 5.5, prompts up to 100k | Haiku 5.5, prompts over 100k | Haiku 4.5 | Sonnet 5.5 |
| --- | --- | --- | --- | --- |
| Input | $0.10 | $0.50 | $1.00 | $2.00 |
| Output | $0.50 | $2.50 | $5.00 | $10.00 |
| Cache writes | $0.125 | $0.625 | $1.25 | $2.50 |
| Cache reads | $0.01 | $0.05 | $0.10 | $0.10 |

Anthropic says prompts up to 100,000 tokens made up around 90% of requests to its previous Haiku model. Its headline is that Haiku 5.5 costs around 75% less to run on average. A footnote explains the gap: the price is 90% lower for requests up to 100,000 tokens, less for larger ones, and an updated tokenizer uses slightly more tokens per task. The model page says the same text counts as approximately 30% more tokens than on Haiku 4.5.

The model page also lists a 50% Batch API discount on input and output. For the wider bill, see [how much Claude Code costs](/blog/how-much-does-claude-code-cost/).

<figure class="mg" data-scene="cups"><img src="/blog/assets/media/claude-haiku-5-5/cups.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A tap fills a small measuring cup, and a card under it headed prompts up to 100k tokens shows $0.10 input and $0.50 output. The water spills over the lip into a larger cup, and its card headed prompts over 100k tokens shows $0.50 input and $2.50 output."><figcaption>Anthropic's prices per 1 million tokens, in two tiers by prompt size. Checked 8 Oct 2026.</figcaption></figure>

## How does Claude Haiku 5.5 score on benchmarks?

On Anthropic's own figures it is far ahead of Haiku 4.5 and behind Sonnet 5.5. The five rows below are our selection from the eight rows in the [announcement](https://www.anthropic.com/claude-haiku-5-5) table. We did not run them. NR means not reported.

| Benchmark (as named by Anthropic) | Haiku 5.5 | Haiku 4.5 | GPT-6 Luna | Sonnet 5.5 |
| --- | --- | --- | --- | --- |
| GDPval-AA v2.1 | 1620 | 735 | 1437 | 1840 |
| OSWorld 2.1, offline subset | 72.4% | 15.7% | 48.9% | 83.9% |
| Humanity's Last Exam, no tools | 45.9% | 10.2% | NR | 56.9% |
| Terminal-Bench 4.0 | 39.2% | 0.0% | 16.4% | 70.6% |
| FrontierCode 1.1 (Main) | 46.4% | NR | 42.4% | 52.1% |

Sonnet 5.5 leads on all eight rows of the full table. Anthropic marks its FrontierCode figure for Sonnet 5.5 as Xhigh effort. Haiku 5.5 is ahead of GPT-6 Luna on all six rows where Anthropic reports both.

The coding gap is the one to notice. On Terminal-Bench 4.0, Haiku 5.5 is at 39.2% against 70.6% for Sonnet 5.5. Anthropic says so itself: "Sonnet 5.5 and Opus 5.5 remain better choices for complex agentic coding tasks like those measured by Terminal-Bench 4.0."

<figure class="mg" data-scene="planes"><img src="/blog/assets/media/claude-haiku-5-5/planes.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. Four paper planes for Haiku 5.5, Haiku 4.5, GPT-6 Luna and Sonnet 5.5 glide along a ruled strip and land at distances set by their scores on one benchmark at a time. Arrow buttons step through the five benchmarks."><figcaption>Anthropic's own figures, five rows we selected from its table of 7 October 2026. We did not run them.</figcaption></figure>

## Where can you use Claude Haiku 5.5?

Anthropic says it "is available now on all platforms, including Amazon Web Services, Google Cloud, and Microsoft Azure". The [model page](https://platform.claude.com/docs/en/models/haiku-5-5/overview) lists the Claude API, Amazon Bedrock, Google Cloud, Microsoft Foundry and Claude Platform on AWS. The ID is `claude-haiku-5-5`, except on Amazon Bedrock, where it is `anthropic.claude-haiku-5-5`.

Neither page says which Claude app plans include it, so we leave that out.

## How do you use Claude Haiku 5.5 in Claude Code?

Run `/model claude-haiku-5-5` in a session, or start with `claude --model claude-haiku-5-5`. That wording is from Claude Code's [model configuration docs](https://code.claude.com/docs/en/model-config), read on 8 Oct 2026. The same page says to use v2.1.293 or later with Haiku 5.5.

Three details from the docs:

* **The alias depends on your provider.** `haiku` resolves to Haiku 5.5 on the Anthropic API. On Claude Platform on AWS, Amazon Bedrock, Google Cloud's Agent Platform and Microsoft Foundry it resolves to Haiku 4.5.
* **Long prompts cost more.** The docs repeat that a Haiku 5.5 request costs more per token when its prompt is longer than 100K tokens.
* **Subagents take a model.** The [subagent docs](https://code.claude.com/docs/en/sub-agents) say the `model` field accepts an alias such as `haiku`, a full model ID or `inherit`. `CLAUDE_CODE_SUBAGENT_MODEL` sets a default.

Our post on [Claude Code subagents](/blog/claude-code-subagents-vs-multi-agent-harness/) walks through that file.

<figure class="mg" data-scene="postcards"><img src="/blog/assets/media/claude-haiku-5-5/postcards.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A postcard rack turns slowly. Each card names a provider, and as it faces front it flips to show which model the haiku alias gives: Haiku 5.5 on the Anthropic API card, Haiku 4.5 on the other cards."><figcaption>In Claude Code the haiku alias resolves to Haiku 5.5 on the Anthropic API and to Haiku 4.5 on the other listed providers. Docs read 8 Oct 2026.</figcaption></figure>

## What does it mean if you run a team of coding agents?

We think it makes the split between a planner and its helpers cheaper to try. Anthropic says Haiku 5.5 "pairs well with Opus 5.5 and Sonnet 5.5 as a subagent on coding work", and that it suits narrowly scoped tasks like compaction, summarization or subagent work.

Two customer quotes from the announcement, the first on subagents and the second on speed. Rogo: "The short and high-volume work is where Claude Haiku 5.5 fits for us, like quick lookups, subagents, and summaries." Asana: "Compared with the model we use today, we saw over a 30% reduction in latency for task completions and up to 2.5x faster inference per agent turn."

Our view: put a bigger model on planning and hard debugging, and a small fast one on searching, summarising and running tests. The small one fetches, the big one decides. This is an idea, not a test. We have not tried Haiku 5.5. Our piece on [model routing](/blog/do-more-with-less-model-routing/) explains the reasoning.

## What should you do now?

Our view: try it on routine work first, and keep your bigger model where the task is hard.

1. Update Claude Code to v2.1.293 or later.
2. Set `model: haiku` on one subagent that only searches or summarises.
3. Watch prompt size. The lower price applies up to 100,000 tokens.
4. Compare results on your own repo before trusting any table.

<link rel="stylesheet" href="/blog/assets/media/claude-haiku-5-5/motion.css"><script defer src="/blog/assets/media/claude-haiku-5-5/motion.js"></script>
