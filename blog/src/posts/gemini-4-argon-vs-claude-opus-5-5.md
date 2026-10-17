---
title: "Gemini 4 Argon vs Claude Opus 5.5 vs GPT-6 Astra: Google Published a Table It Does Not Fully Win"
seoTitle: "Gemini 4 Argon vs Claude Opus 5.5 vs GPT-6 Astra (Oct 2026)"
description: "Google's own table: Gemini 4 Argon tops 13 of 19 rows, GPT-6 Astra 3 and Claude Opus 5.5 2. The coding rows split. List prices compared."
date: 2026-10-13
category: comparisons
categoryLabel: Comparisons
type: Technical
primaryKeyword: "gemini 4 vs claude opus 5.5"
secondaryKeywords: ["gemini 4 argon vs claude opus 5.5", "gemini 4 vs gpt 6", "gemini 4 argon vs gpt-6 astra", "gemini 4 benchmarks", "gemini 4 vs claude", "gemini 4 argon benchmarks"]
tags: ["Comparisons", "AI Agents", "Engines"]
faq:
  - q: "Is Gemini 4 Argon better than Claude Opus 5.5?"
    a: "In most rows of Google's own table, yes, but not in four of them. Google's figures have Gemini 4 Argon ahead of Claude Opus 5.5 in 14 of the 18 rows where both have a score. Claude Opus 5.5 is ahead on Terminal-bench 4.0 (66.4% against 57.4%), FrontierSWE v2 (62.3% against 55.0%), PostTrainBench (49.3% against 45.3%) and Terminal-Bench Science 0.1 (63.3% against 57.6%)."
  - q: "Is Gemini 4 Argon better than GPT-6 Astra?"
    a: "In most rows of Google's own table. GPT-6 Astra is ahead of Gemini 4 Argon on FrontierSWE v2 (65.5% against 55.0%), Terminal-Bench Science 0.1 (68.1% against 57.6%), the OSWorld-2.0 offline subset (72.6% against 69.2%) and Terminal-bench 4.0 (58.2% against 57.4%). The two share CWE-bench v1 at 68.0%."
  - q: "Which is cheaper, Gemini 4 Argon, Claude Opus 5.5 or GPT-6 Astra?"
    a: "Gemini 4 Argon through 30 November 2026, on the list prices read on 13 Oct 2026. Google lists $2.00 input and $10.00 output per 1M tokens through 30 November 2026, then $4.00 and $20.00. Anthropic lists Claude Opus 5.5 at $4 input and $20 output per MTok, the same as Gemini 4 Argon from 1 December 2026. OpenAI lists gpt-6-astra at $10.00 input and $50.00 output for short context."
  - q: "Who ran these Gemini 4 Argon benchmarks?"
    a: "The scores in this post are Google's own figures, from the table on its Gemini 4 Argon page as read on 13 Oct 2026. Google links a methodology page under the table."
---

Our view: on Google's own numbers, Gemini 4 Argon beats Claude Opus 5.5 and GPT-6 Astra in most rows and, until 30 November, on price, but not in two of the four coding tests. For coding, Gemini 4 vs Claude Opus 5.5 is a split decision. Checked 13 Oct 2026.

Every score below is Google's own figure. [Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of coding agents such as Claude Code, Codex and Gemini CLI on your own computer. The [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup, the [Comparisons hub](/blog/topics/comparisons/) has more match ups, and our [Gemini 4 Argon page](/blog/gemini-4-argon/) covers the launch.

## Which model wins the most rows in Google's table?

Gemini 4 Argon has the top score in 13 of the 19 rows, GPT-6 Astra in 3 and Claude Opus 5.5 in 2, with one row shared. Claude Fable 5.1 tops none. The table is on Google's [Gemini 4 Argon page](https://deepmind.google/models/gemini/), read on 13 Oct 2026.

| Benchmark | Gemini 4 Argon | GPT-6 Astra | Claude Fable 5.1 | Claude Opus 5.5 |
| --- | --- | --- | --- | --- |
| Vals Index | 68.9% | 63.1% | 65.8% | 67.0% |
| AutomationBench | 51.3% | 41.4% | 31.4% | 42.5% |
| Vals Finance Agent v2 | 65.4% | 53.5% | 58.9% | 58.6% |
| Harvey's Legal Agent Benchmark | 19.6% | 5.4% | 6.7% | 3.8% |
| DeepSWE v1.1 | 77.9% | 74.1% | 67.4% | 74.2% |
| FrontierSWE v2 | 55.0% | 65.5% | 56.3% | 62.3% |
| Vibe Code Bench | 91.9% | 89.6% | 90.3% | 90.3% |
| Terminal-bench 4.0 | 57.4% | 58.2% | 57.9% | 66.4% |
| PostTrainBench | 45.3% | 44.3% | 40.2% | 49.3% |
| Terminal-Bench Science 0.1 | 57.6% | 68.1% | 52.6% | 63.3% |
| LABBench 2 | 88.8% | 85.4% | 68.6% | 73.1% |
| RiemannBench | 76.0% | 72.0% | 65.6% | 69.6% |
| GraphWalks, up to 128k | 99.7% | 98.7% | 91.4% | 90.6% |
| GraphWalks, 256k to 1M | 84.2% | 71.8% | 65.0% | 66.8% |
| Agent's Last Exam | 39.5% | 34.2% | no score | 38.2% |
| OSWorld-2.0, offline subset, partial score | 69.2% | 72.6% | no score | no score |
| Chartography | 71.6% | 71.0% | 46.2% | 66.3% |
| LVBench | 91.7% | 87.5% | 79.7% | 83.7% |
| CWE-bench v1 | 68.0% | 68.0% | 58.0% | 67.0% |

<figure class="mg" data-scene="cups"><img src="/blog/assets/media/gemini-4-argon-vs-claude-opus-5-5/cups.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. Three trophy cups stand on a white shelf, engraved Gemini 4 Argon, GPT-6 Astra and Claude Opus 5.5. Tally cards rise from the cups one by one and settle at 13 rows, 3 rows and 2 rows. A ribbon tied between two of the cups reads one row shared."><figcaption>In Google's own table, read 13 Oct 2026, Gemini 4 Argon has the top score in 13 of the 19 rows, GPT-6 Astra in 3 and Claude Opus 5.5 in 2, with one row shared. The drawing shows the count as trophy cups. Tap a cup to polish it.</figcaption></figure>

## Which model is best for coding agents?

It depends on the test, because the four coding rows split two and two. Gemini 4 Argon tops DeepSWE v1.1 and Vibe Code Bench. Claude Opus 5.5 tops Terminal-bench 4.0 at 66.4% against 57.4%, and GPT-6 Astra tops FrontierSWE v2 at 65.5% against 55.0%.

In both of those rows Gemini 4 Argon has the lowest score of the four models. Google printed that itself, which deserves a small round of applause.

One row down, Claude Opus 5.5 also leads PostTrainBench, the machine learning engineering row, at 49.3% against 45.3%.

<figure class="mg" data-scene="abacus"><img src="/blog/assets/media/gemini-4-argon-vs-claude-opus-5-5/abacus.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. An abacus with four wires stands on a white desk. Each wire carries the name of a coding benchmark: DeepSWE v1.1, Vibe Code Bench, FrontierSWE v2 and Terminal-bench 4.0. On each wire a bead slides across to the model with the top score: Gemini 4 Argon 77.9%, Gemini 4 Argon 91.9%, GPT-6 Astra 65.5%, Claude Opus 5.5 66.4%."><figcaption>Google's own figures, read 13 Oct 2026: Gemini 4 Argon tops DeepSWE v1.1 and Vibe Code Bench, GPT-6 Astra tops FrontierSWE v2 and Claude Opus 5.5 tops Terminal-bench 4.0. The drawing shows the split on an abacus. Tap a wire to slide its bead again.</figcaption></figure>

## Which model handles the longest context?

Gemini 4 Argon, by a wide margin on Google's long context row. On GraphWalks from 256k to 1M, Google lists Gemini 4 Argon at 84.2%, GPT-6 Astra at 71.8%, Claude Opus 5.5 at 66.8% and Claude Fable 5.1 at 65.0%. Up to 128k the four sit closer, from 90.6% to 99.7%.

<figure class="mg" data-scene="tape"><img src="/blog/assets/media/gemini-4-argon-vs-claude-opus-5-5/tape.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A tape measure is pulled out across a white desk, past marks reading 128k, 256k and 1M. Four clips snap onto the far end, each with a score for GraphWalks, 256k to 1M: Gemini 4 Argon 84.2%, GPT-6 Astra 71.8%, Claude Opus 5.5 66.8%, Claude Fable 5.1 65.0%. A fifth card near the start reads up to 128k, 90.6% to 99.7%."><figcaption>Google's own figures for GraphWalks, 256k to 1M, read 13 Oct 2026: Gemini 4 Argon 84.2%, GPT-6 Astra 71.8%, Claude Opus 5.5 66.8%, Claude Fable 5.1 65.0%. The drawing shows the long context row as a tape measure. Tap the tape to pull it out again.</figcaption></figure>

## Where is the gap biggest?

The widest lead is in legal work. On Harvey's Legal Agent Benchmark, Google lists Gemini 4 Argon at 19.6%, with Claude Fable 5.1 at 6.7%, GPT-6 Astra at 5.4% and Claude Opus 5.5 at 3.8%. Top of the class at 19.6% is still not a mark anyone frames.

## What does each model cost?

Gemini 4 Argon is the cheapest of the three on list price through 30 November 2026, then level with Claude Opus 5.5. All three price pages were read on 13 Oct 2026.

| Per 1M tokens | Input | Output |
| --- | --- | --- |
| Gemini 4 Argon, through 30 Nov 2026 | $2.00 | $10.00 |
| Gemini 4 Argon, from 1 Dec 2026 | $4.00 | $20.00 |
| Claude Opus 5.5 | $4 | $20 |
| GPT-6 Astra, short context | $10.00 | $50.00 |
| GPT-6 Astra, long context | $20.00 | $75.00 |

The sources are Google's [pricing page](https://ai.google.dev/gemini-api/docs/pricing), Anthropic's [pricing page](https://platform.claude.com/docs/en/about-claude/pricing) and OpenAI's [pricing page](https://developers.openai.com/api/docs/pricing).

## Can you trust a vendor's own table?

Partly: the numbers are useful, and the vendor chose the rows. Google links a [methodology page](https://deepmind.google/models/evals-methodology/gemini-4-argon) under the table. Every vendor table has one thing in common, which is that the vendor does well in it.

Names matter too. Meta's table this week listed Claude Opus 5.5 at 59.6 on Terminal-Bench 4.0-AA, as our [Muse Wonder page](/blog/muse-wonder/) records, while Google lists 66.4% on Terminal-bench 4.0. Read those as two different tests.

## Which one should you run?

Our view: pick by job, not by logo. On Google's figures, Gemini 4 Argon suits long documents and, until December, tight budgets. Claude Opus 5.5 suits terminal work, and GPT-6 Astra leads the OSWorld-2.0 offline subset, one of the two computer use rows.

Mixing models by task is covered in [model routing](/blog/do-more-with-less-model-routing/), and Google's own coding tool in [Gemini CLI vs Claude Code](/blog/gemini-cli-vs-claude-code/).

<link rel="stylesheet" href="/blog/assets/media/gemini-4-argon-vs-claude-opus-5-5/motion.css"><script defer src="/blog/assets/media/gemini-4-argon-vs-claude-opus-5-5/motion.js"></script>
