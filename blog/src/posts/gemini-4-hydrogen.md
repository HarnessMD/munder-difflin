---
title: "Gemini 4 Hydrogen: Price vs Argon, Where to Use It and When to Pick It (Nov 2026)"
seoTitle: "Gemini 4 Hydrogen (Nov 2026): Price vs Argon, Access, Pick Rules"
description: "Gemini 4 Hydrogen costs $1.50 in and $7.50 out per 1M tokens (13 Nov 2026). Where you can use it, what Orchestrator does, and Hydrogen or Argon."
date: 2026-11-13
category: concepts
categoryLabel: Concepts
type: Non-technical
primaryKeyword: "gemini 4 hydrogen"
secondaryKeywords: ["gemini 4 hydrogen price", "gemini 4 hydrogen api", "gemini 4 hydrogen vs argon", "antigravity orchestrator", "gemini-4-hydrogen", "gemini 4 hydrogen context window"]
tags: ["Concepts", "AI Agents", "Models"]
faq:
  - q: "How much does Gemini 4 Hydrogen cost?"
    a: "Google's Gemini API pricing page, read on 13 Nov 2026, lists Gemini 4 Hydrogen on the paid tier at $1.50 per million input tokens and $7.50 per million output tokens, thinking tokens included. The same table lists input and output on the free tier as free of charge. Google's launch post of 12 Nov 2026 says the price is flat across the whole 1 million token context window."
  - q: "What is the Gemini 4 Hydrogen model ID?"
    a: "The model ID is gemini-4-hydrogen. Google's model page, read on 13 Nov 2026, lists it as the stable version, with a context window of 1,048,576 tokens and 65,536 output tokens by default, or up to 1,048,576 with long decode."
  - q: "Is Gemini 4 Hydrogen better than Gemini 4 Argon?"
    a: "On one index, by Google's own figures: its launch post of 12 Nov 2026 gives Hydrogen 51 on the Artificial Analysis Intelligence Index at its default high thinking level against 50 for Argon, and 54 at xhigh. Google still calls Argon and Carbon its frontier models for deep, long reasoning, and Hydrogen its model for fast execution."
  - q: "Can I use Gemini 4 Hydrogen for free?"
    a: "Yes, in some places. On 13 Nov 2026 the Gemini API pricing page lists Hydrogen's free tier input and output as free of charge, and Google's launch post says free Gemini app users get it through auto model selection when it fits the prompt. Google Search uses it for all users, the same post says."
  - q: "What is Orchestrator in Google Antigravity?"
    a: "Orchestrator is a model selector option in Google Antigravity that pairs a planner, Gemini 4 Carbon or Gemini 4 Argon, with Gemini 4 Hydrogen doing the implementation. Antigravity's post of 12 Nov 2026 says Google AI Ultra subscribers get Orchestrator (Carbon) and Orchestrator (Argon), and paid Google AI Pro subscribers get Orchestrator (Argon)."
---

Our view: start everyday agent work on Gemini 4 Hydrogen and keep Argon for the jobs that need deeper reasoning. Google released Hydrogen on 12 Nov 2026, and its [pricing page](https://ai.google.dev/gemini-api/docs/pricing) lists $1.50 input and $7.50 output per 1M tokens, under Argon's $2 and $10 through 30 Nov 2026. Checked 13 Nov 2026.

Models end up inside the agents you run. [Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. It runs engines such as Gemini CLI, Claude Code and Codex. The [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup, and [Herdr alternatives](/blog/herdr-alternatives/) compares other ways to run several agents side by side.

## What is Gemini 4 Hydrogen?

Gemini 4 Hydrogen is Google's fast, lower priced Gemini 4 model for everyday coding and agent work, placed under its two frontier models. Google's [launch post](https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-hydrogen/) of 12 Nov 2026 calls it "our daily driver for agentic workflows" in its share text.

The same post draws the line plainly: [Gemini 4 Carbon](/blog/gemini-4-carbon/) and [Gemini 4 Argon](/blog/gemini-4-argon/) "excel at deep, long-horizon reasoning on your hardest problems, Hydrogen is built for rapid execution across diverse agentic workflows." The [model card](https://deepmind.google/models/model-cards/gemini-4-hydrogen/), published 12 Nov 2026, says "Gemini 4 Hydrogen is adapted from Gemini 4 Carbon" and gives a knowledge cutoff of March 2026.

Google's [model page](https://ai.google.dev/gemini-api/docs/models/gemini-4-hydrogen), read 13 Nov 2026, lists the model ID `gemini-4-hydrogen` and a context window of 1,048,576 tokens, input and output combined. Output stops at 65,536 tokens by default, or up to 1,048,576 with long decode. It reads text, images, video, audio and PDF, and writes text. It has four thinking levels: low, medium, high (the default) and a new xhigh.

The scores are Google's own. The launch post gives Hydrogen 51 on the Artificial Analysis Intelligence Index at high against Argon's 50, and 54 at xhigh (12 Nov 2026). The model card's table of 12 Nov 2026 also prints rows Hydrogen loses: Claude Sonnet 5.5 leads on Terminal-Bench 4.1 (63.9% against 57.0%) and OSWorld-2.1 (83.9% against 77.6%), while Hydrogen leads on HLE-Diamond (58.8% against 53.3%).

## How much does Gemini 4 Hydrogen cost next to Argon?

Gemini 4 Hydrogen costs $1.50 per 1M input tokens and $7.50 per 1M output tokens on Google's pricing page, read 13 Nov 2026. The prices below sit under each model's heading on that page, in the Standard tab, column "Paid Tier, per 1M tokens in USD". Carbon is there too now, so it gets a column.

| Checked 13 Nov 2026 | Gemini 4 Hydrogen | Gemini 4 Argon | Gemini 4 Carbon |
| --- | --- | --- | --- |
| Model ID | `gemini-4-hydrogen` | `gemini-4-argon` | `gemini-4-carbon` |
| Input, per 1M tokens | $1.50 | $2.00 through 30 Nov 2026, then $4.00 | $2.00 through 30 Nov 2026, then $4.00 |
| Output, thinking included | $7.50 | $10.00, then $20.00 | $10.00, then $20.00 |
| Context caching | $0.075 | $0.10, then $0.20 | $0.10, then $0.20 |
| Gemini API free tier | Free of charge | Not available | Not available |
| Antigravity plans (models page) | Free and Plus, Pro, Ultra, Enterprise | Pro, Ultra, Enterprise | Ultra, Enterprise |

Hydrogen's price has no end date on the page, while Argon and Carbon double on 1 Dec 2026. Batch halves Hydrogen to $0.75 and $3.75 (13 Nov 2026). One catch on the free tier: the same table marks free tier content as used to improve Google's products, and paid tier content as not.

<figure class="mg" data-scene="vendingmachine"><img src="/blog/assets/media/gemini-4-hydrogen/vendingmachine.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a vending machine shows three lit buttons: Hydrogen $1.50 in $7.50 out, Argon $2.00 in $10.00 out, and Carbon $2.00 in $10.00 out. A can drops from the Hydrogen slot, then a card slides over the Argon and Carbon buttons reading From 1 Dec 2026: $4.00 in $20.00 out. Tap a button to drop a can."><figcaption>Paid tier prices per 1M tokens on Google's Gemini API pricing page, read 13 Nov 2026.</figcaption></figure>

## Where can you use Gemini 4 Hydrogen today?

Google's launch post of 12 Nov 2026 lists:

- **Gemini API and Google AI Studio:** "all tiers", plus Android Studio for building.
- **Gemini app:** in the model drop down. Free users get it through auto model selection "when it's the appropriate model for the prompt".
- **Google Search:** for all users.
- **Gemini in Google Sheets:** starting with Google AI Pro and Ultra subscribers.
- **Gemini for business:** through the API or the model drop down.
- **Google Antigravity:** paid Google AI Pro and Ultra subscribers.

One row differs: Antigravity's [models page](https://antigravity.google/docs/models), read 13 Nov 2026, also ticks its Free and Google AI Plus plans, while the [Antigravity post](https://antigravity.google/blog/gemini-4-hydrogen-in-google-antigravity/) names paid Pro and Ultra only.

The model card names seven channels: Gemini app, Gemini API, Google Sheets, Google AI Studio, Gemini for business, Google Antigravity and Google Search. Gemini CLI and Vertex AI are not on that list.

<figure class="mg" data-scene="keyring"><img src="/blog/assets/media/gemini-4-hydrogen/keyring.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a key ring swings into view and seven keys drop a tag one at a time: Gemini app, Gemini API, Google Sheets, AI Studio, Gemini for business, Antigravity and Google Search. An empty hook below holds a card reading Not listed: Gemini CLI, Vertex AI. Tap a key to swing the ring again."><figcaption>Seven channels on Google's model card of 12 Nov 2026. Gemini CLI and Vertex AI are not among them.</figcaption></figure>

## What is the Antigravity Orchestrator?

Orchestrator is an option in Antigravity's model selector that pairs a planner model with Hydrogen inside one conversation. The Antigravity post of 12 Nov 2026 describes "a dynamic, bidirectional approach between Carbon and Gemini 4 Hydrogen within the evolution of a single trajectory."

In practice, the planner (Carbon or Argon) starts in a read only phase, explores the code and writes a plan. Hydrogen then writes the edits, updates packages and runs the tests. When Hydrogen hits friction, the models page gives "a verification step that fails twice" as one example, it hands control back to the planner, which repairs the plan. It is delegation with a return policy. The post contrasts this with a static "model router" that guesses difficulty from your first prompt.

<figure class="mg" data-scene="zipline"><img src="/blog/assets/media/gemini-4-hydrogen/zipline.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a small basket rides a zipline from a post labelled Planner: Carbon or Argon, carrying a card reading Plan, to a post labelled Hydrogen: edits and tests. A card reading Test failed twice pops up and the basket rides back to the planner, then out again with a card reading New plan. Tap the basket to send it again."><figcaption>Orchestrator: the planner plans, Hydrogen builds and hands back on friction, per Antigravity's post of 12 Nov 2026.</figcaption></figure>

Google's figure: Orchestrator "reached near-Carbon task success rates while, on average, consuming 24% less quota and completing 19% faster" (12 Nov 2026). The launch post names Terminal-Bench 4.0 for that result and the Antigravity post names Terminal-Bench 4.1. The Antigravity post also says Ultra subscribers get Orchestrator (Carbon) and Orchestrator (Argon), and paid Pro subscribers get Orchestrator (Argon). The models page adds that you cannot choose a thinking level for it. If your agents live outside Antigravity, see [Antigravity alternatives](/blog/antigravity-alternatives/).

## How to choose between Hydrogen and Argon

We think Hydrogen should be your default Gemini 4 model, with Argon kept for the hard parts. Our pick rules, from Google's pages as read on 13 Nov 2026:

- **Pick Hydrogen** for the many small steps of agent work: edits, test runs, search, drafts and summaries. That is the job Google's launch post gives it.
- **Pick Hydrogen** when you need a free tier. Argon and Carbon say "not available on the Free tier".
- **Pick Argon** for system design and subtle bugs. The launch post says teams use frontier models "for deep architectural judgment when designing systems or untangling subtle bugs".
- **Pick Orchestrator** in Antigravity if you want both and do not want to switch by hand.
- **Budget for December.** Argon's input rises from $2.00 to $4.00 on 1 Dec 2026; Hydrogen's row shows no change.

Every score above is Google's own, from 12 Nov 2026. Run your own jobs on both before you move a team over.

<link rel="stylesheet" href="/blog/assets/media/gemini-4-hydrogen/motion.css"><script defer src="/blog/assets/media/gemini-4-hydrogen/motion.js"></script>
