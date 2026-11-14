---
title: "Gemini 4 Carbon: Price, Access and How It Compares to Argon (Nov 2026)"
seoTitle: "Gemini 4 Carbon (Nov 2026): Price, Access, Scores vs Argon"
description: "Gemini 4 Carbon is Google's new frontier model, open to paying Gemini API developers since 10 Nov 2026: its price, who can use it and how it compares to Argon."
date: 2026-10-29
updated: 2026-11-14
category: concepts
categoryLabel: Concepts
type: Non-technical
primaryKeyword: "gemini 4 carbon"
secondaryKeywords: ["gemini 4 carbon price", "gemini 4 carbon release date", "gemini 4 carbon vs argon", "gemini 4 carbon api", "fairwind program", "gemini 4 carbon benchmarks"]
tags: ["Concepts", "AI Agents", "Models"]
faq:
  - q: "When was Gemini 4 Carbon released?"
    a: "Google announced Gemini 4 Carbon on 28 October 2026 and gave it first to a subset of cyber defenders through the Fairwind Program. Google's post of 10 Nov 2026 made it available to developers, enterprises, scientists and consumers."
  - q: "How much does Gemini 4 Carbon cost?"
    a: "On 14 Nov 2026 Google's Gemini API pricing page listed Carbon on the paid tier at $2 per million input tokens and $10 per million output tokens through 30 November 2026, and $4 and $20 from 1 December 2026. Context caching is $0.10, then $0.20. It is not on the Free tier."
  - q: "Can I use Gemini 4 Carbon in the Gemini API today?"
    a: "Yes, on the paid tier. On 14 Nov 2026 Google's Gemini API docs listed the stable model code gemini-4-carbon, and the pricing page says it is not available on the Free tier."
  - q: "Is Gemini 4 Carbon better than Gemini 4 Argon?"
    a: "On Google's own figures, yes on safety and security tests: Carbon has a 0.0% attack success rate on Gray Swan's indirect prompt injection test against 0.7% for Argon, about 2x fewer unsupported claims, and more than 2x the success rate on secure code in internal tests. These are Google's numbers, published 28 Oct 2026."
  - q: "Should I use Carbon or Argon?"
    a: "Argon for \"the majority of software engineering and knowledge work\", says Google's post of 10 Nov 2026; Carbon is for \"tasks that test the limits of a model’s intelligence\" and uses more tokens. On 14 Nov 2026 both cost $2 input and $10 output per million tokens on the paid tier, through 30 November 2026."
---

Gemini 4 Carbon is Google's new frontier model, open since [10 Nov 2026](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-4-carbon-now-available/) to paying Gemini API developers and Google AI Ultra subscribers. On 14 Nov 2026 Google's [pricing page](https://ai.google.dev/gemini-api/docs/pricing) listed $2 input and $10 output per million tokens through 30 Nov 2026, and $4 and $20 from 1 Dec 2026.

On 12 Nov 2026 Google added [Gemini 4 Hydrogen](/blog/gemini-4-hydrogen/), which it calls its daily driver for agentic workflows.

New models end up inside the agents you run. [Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. It runs engines such as Claude Code, Codex and Gemini CLI. The [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup, and the [Concepts hub](/blog/topics/concepts/) explains the terms.

## What is Gemini 4 Carbon?

Gemini 4 Carbon is the model Google placed above [Gemini 4 Argon](/blog/gemini-4-argon/), aimed at long engineering jobs and security work. Google's [launch post](https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-carbon/) of 28 October 2026 calls it "our strongest model with state-of-the-art cybersecurity and long horizon capabilities".

The post says Carbon is "built for sustained agentic workflows" and that Google's teams have seen it "run for days" on multi step engineering tasks, such as finding the root cause of subtle bugs across large codebases. It builds on Argon, which the same post says launched two weeks earlier.

<figure class="mg" data-scene="podium"><img src="/blog/assets/media/gemini-4-carbon/podium.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a two step podium stands empty. A block labelled Argon drops onto the lower step with a tag Open now, then a block labelled Carbon drops onto the higher step with a tag Open now."><figcaption>Carbon sits above Argon in Google's Gemini 4 line, per Google's launch post of 28 Oct 2026.</figcaption></figure>

## Who can use Gemini 4 Carbon?

Paying Gemini API developers and Google AI Ultra subscribers, since 10 Nov 2026. Google's [post of that day](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-4-carbon-now-available/) says Carbon "is available via the API in Google AI Studio and Gemini for business for all paying developers and enterprises" and "is also rolling out to all Google AI Ultra subscribers in Google Antigravity, the Gemini app, and AI Mode in Search".

On 14 Nov 2026 the Gemini API [models page](https://ai.google.dev/gemini-api/docs/models) listed it as `gemini-4-carbon`, marked Stable on [its own page](https://ai.google.dev/gemini-api/docs/models/gemini-4-carbon). Google's [Antigravity post](https://antigravity.google/blog/gemini-4-hydrogen-in-google-antigravity/) of 12 Nov 2026 adds that "Orchestrator is rolling out as Orchestrator (Carbon) and Orchestrator (Argon) for Google AI Ultra subscribers".

Before that, Google's post of 28 Oct 2026 gave Carbon first to "a subset of cyber defenders" and planned to "gradually phase access to additional trusted partners" through its [Fairwind Program](https://deepmind.google/fairwind-program/). Google says it takes part in the U.S. government's voluntary process for testing models before release.

Argon opened the same way Carbon did on 10 Nov 2026. Google's [developer post](https://blog.google/innovation-and-ai/technology/developers-tools/build-with-gemini-4-argon/) of 13 October 2026 opened it on the paid tier of the Gemini API in Google AI Studio and Android Studio, and to Google AI Ultra subscribers in AI Studio and Google Antigravity.

<figure class="mg" data-scene="ticket"><img src="/blog/assets/media/gemini-4-carbon/ticket.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a row of three ticket stubs is torn off one at a time. They read Cyber defenders, Developers and Ultra subscribers, and each is stamped with a mint tick as it tears off."><figcaption>Carbon went to cyber defenders through Fairwind first, then to paying Gemini API developers and Google AI Ultra subscribers on 10 Nov 2026, per Google's post of that day.</figcaption></figure>

## How much does Gemini 4 Carbon cost?

The same as Argon. Google's post of 28 Oct 2026 said Carbon "will launch at the same introductory price" as Argon. On 14 Nov 2026 the [pricing page](https://ai.google.dev/gemini-api/docs/pricing) listed `gemini-4-carbon` on the paid tier with these dates:

| Gemini 4 Carbon, paid tier | Through 30 Nov 2026 | From 1 Dec 2026 |
| --- | --- | --- |
| Input, per 1M tokens | $2.00 | $4.00 |
| Output, per 1M tokens, thinking included | $10.00 | $20.00 |
| Context caching, per 1M tokens | $0.10 | $0.20 |

The same page says Carbon "is not available on the Free tier" and lists the same standard prices for Argon. [Gemini 4 Argon pricing](/blog/gemini-4-argon-pricing/) has the batch prices.

## How does Gemini 4 Carbon compare to Argon?

On Google's numbers, Carbon is stronger on security work and safer in agent tasks. The test rows come from Google's launch post of 28 October 2026; the access and price rows come from the [pricing page](https://ai.google.dev/gemini-api/docs/pricing) read on 14 Nov 2026.

| Checked 14 Nov 2026 | Gemini 4 Carbon | Gemini 4 Argon |
| --- | --- | --- |
| Who can use it | Paid tier of the Gemini API | Paid tier of the Gemini API |
| Price per 1M tokens through 30 Nov 2026 | $2 in, $10 out | $2 in, $10 out |
| Gray Swan indirect prompt injection, attack success | 0.0% | 0.7% |
| Unsupported claims, internal test | About 2x fewer | Baseline |
| Secure code success, internal test | More than 2x | Baseline |

Google also gives these Carbon results on their own, from external tests it says were "evaluated without guardrails": 88.2% on SEC-bench Pro for finding vulnerabilities, 54.8% on ExploitGym for exploitation, and 71.0% on Collinear's CWE-bench for patching. Google says Carbon ranks first on version 5.0 of the Artificial Analysis Intelligence Index at 59, and fourth on WebDev Arena at 1768, up 89 points.

<figure class="mg" data-scene="scale"><img src="/blog/assets/media/gemini-4-carbon/scale.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a balance scale tips as two weights drop onto its pans. The weight labelled Argon reads 0.7%, the weight labelled Carbon reads 0.0%, and a card below reads Prompt injection."><figcaption>Gray Swan indirect prompt injection attack success: 0.7% for Argon, 0.0% for Carbon, per Google's post of 28 Oct 2026.</figcaption></figure>

## What did Google change in how Carbon behaves?

Google lists these changes in its post of 28 Oct 2026, each from its own testing:

- **Fewer shortcuts.** Successful cheating on Terminal-Bench 4.0 fell to 0.0%, with attempts at 0.4%, and high severity misalignment alerts in live coding with Google's teams dropped "by almost 80%".
- **More honest output.** About 2x fewer unsupported claims than Argon. Carbon puts caveats in the deliverable or lists what is still needed instead of fabricating.
- **Asks when unclear.** It fetches sources and shows the user discrepancies before acting.
- **Stays in scope.** Overreach fell 26% and under service 29%.

Our view: these are vendor numbers from one post, so read them as Google's claims until outside tests appear. [How to use Gemini 4 Argon](/blog/how-to-use-gemini-4-argon/) covers setup, and [Gemini 4 Argon vs Claude Opus 5.5](/blog/gemini-4-argon-vs-claude-opus-5-5/) puts it beside Anthropic's model.

## Gemini 4 Carbon at a glance, checked 14 Nov 2026

| | Gemini 4 Carbon |
| --- | --- |
| Maker | Google DeepMind |
| Announced | 28 Oct 2026 |
| Access | Cyber defenders through Fairwind first, then paying Gemini API developers and Google AI Ultra subscribers since 10 Nov 2026 |
| Launch price | $2 input and $10 output per 1M tokens through 30 Nov 2026 |
| Price from 1 Dec 2026 | $4 input and $20 output per 1M tokens |
| Cached input | 95% off the input price |
| Public model ID | `gemini-4-carbon`, stable, per the [models page](https://ai.google.dev/gemini-api/docs/models/gemini-4-carbon) on 14 Nov 2026 |
| In the Gemini API pricing page | Yes, [paid tier only](https://ai.google.dev/gemini-api/docs/pricing), 14 Nov 2026 |

<link rel="stylesheet" href="/blog/assets/media/gemini-4-carbon/motion.css"><script defer src="/blog/assets/media/gemini-4-carbon/motion.js"></script>
