---
title: "How to Use Gemini 4 Argon: Five Ways In, and Free Is Not One of Them"
seoTitle: "How to Use Gemini 4 Argon: API, AI Studio, Antigravity, App"
description: "How to use Gemini 4 Argon on 13 Oct 2026: the Gemini app, AI Mode, AI Studio, the API with model ID gemini-4-argon, and Antigravity. What each route needs."
date: 2026-10-13
category: guides
categoryLabel: Guides
type: Technical
primaryKeyword: "how to use gemini 4"
secondaryKeywords: ["how to use gemini 4 argon", "gemini 4 api", "gemini 4 argon api", "gemini-4-argon", "gemini 4 antigravity", "antigravity cli", "gemini 4 ai studio"]
tags: ["Guides", "Getting Started", "Engines"]
faq:
  - q: "How do I get access to Gemini 4 Argon?"
    a: "Google's launch post of 13 October 2026 lists the paid tier of the Gemini API in AI Studio and Android Studio, Google AI Ultra subscribers in AI Studio and Antigravity, and Google AI Ultra and Pro subscribers in the Gemini app and AI Mode in Search. Google's pricing page says the model is not available on the Free tier."
  - q: "What is the Gemini 4 Argon model ID?"
    a: "The API model ID is gemini-4-argon, on Google's models page and pricing page as read on 13 Oct 2026."
  - q: "Can I use Gemini 4 Argon in Antigravity?"
    a: "Yes, if you are a Google AI Ultra subscriber. Google's Antigravity post of 13 Oct 2026 says the model is available in the Antigravity desktop app and the Antigravity CLI for Google AI Ultra subscribers, and on eligible Gemini Enterprise subscriptions for businesses."
  - q: "Can I use Gemini 4 Argon in Gemini CLI?"
    a: "It was not listed on 13 Oct 2026. The model list file in the Gemini CLI repository had no Gemini 4 entry that day, and Google's Antigravity post names the Antigravity CLI, not Gemini CLI."
  - q: "Is Gemini 4 Argon in the Gemini app?"
    a: "Yes, for subscribers. Google's launch post says everyday users can try it in the Gemini app and AI Mode in Search with a Google AI Ultra or Pro subscription. Google's plans page says it is rolling out to Google AI Pro subscribers in select countries."
---

To use Gemini 4 Argon today, pick one of five routes: the Gemini app, AI Mode in Search, Google AI Studio, the Gemini API or Antigravity. Each one needs a subscription or the paid API tier. This is how to use Gemini 4 by each route. Checked 13 Oct 2026.

[Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of coding agents such as Claude Code, Codex and Gemini CLI on your own computer. This guide follows Google's own pages, read on 13 Oct 2026. The [install guide](/blog/how-to-install-and-use-munder-difflin/) covers our own setup, the [Guides hub](/blog/topics/guides/) has more how to pages, and our [Gemini 4 Argon page](/blog/gemini-4-argon/) covers the launch.

## What do you need before you start?

You need a paid route, because there is no free tier. Google's API [pricing page](https://ai.google.dev/gemini-api/docs/pricing) says Gemini 4 Argon "is not available on the Free tier or on the Google AI Pro plan". The rows are our summary of Google's [launch post](https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-argon/) of 13 October 2026.

| Route | What you need |
| --- | --- |
| Gemini app | Google AI Ultra or Pro subscription |
| AI Mode in Search | Google AI Ultra or Pro subscription |
| Google AI Studio | Paid tier of the Gemini API, or Google AI Ultra |
| Gemini API | Paid tier |
| Antigravity | Google AI Ultra subscription |

<figure class="mg" data-scene="menu"><img src="/blog/assets/media/how-to-use-gemini-4-argon/menu.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A tall paper menu stands on a white table with the heading Gemini 4 Argon. Five lines write themselves in: Gemini app, AI Mode in Search, Google AI Studio, Gemini API and Antigravity. Beside each line a small tag slides in with what you need: Ultra or Pro, Ultra or Pro, Paid tier or Ultra, Paid tier, Ultra. A last line at the bottom reads Free tier, not available."><figcaption>Google's launch post and pricing page, read 13 Oct 2026, put these five routes behind a subscription or the paid tier. There is no free tier. The drawing shows them as a menu. Tap a line to underline it.</figcaption></figure>

## How do you use Gemini 4 Argon in the Gemini app?

Open the Gemini app or AI Mode in Search with a Google AI Ultra or Pro subscription. Google's launch post says everyday users can "Try it starting today in the Gemini app and AI Mode in Search if you're a Google AI Ultra or Pro subscriber".

Pro may take longer. Google's [plans page](https://one.google.com/about/google-ai-plans/) said on 13 Oct 2026 that the model is "rolling out to Google AI Pro subscribers in select countries".

## How do you call Gemini 4 Argon from the API?

Use the model ID `gemini-4-argon` on the paid tier of the Gemini API. The ID is on Google's [models page](https://ai.google.dev/gemini-api/docs/models), read on 13 Oct 2026.

1. Create an API key in Google AI Studio and turn on billing.
2. Put the key in an environment variable named `GEMINI_API_KEY`.
3. Send a request with the model ID.

```bash
curl -X POST "https://generativelanguage.googleapis.com/v1beta/interactions" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "gemini-4-argon",
    "input": "Explain how AI works in a few words"
  }'
```

This is the REST call from Google's [quickstart](https://ai.google.dev/gemini-api/docs/quickstart), read on 13 Oct 2026, with the model swapped from `gemini-3.8-flash` to `gemini-4-argon`. If it fails, check that billing is on, because the free tier has no Argon to give.

For long outputs, read the docs first. Google's launch post describes "an industry-leading 1M unified input-output token limit via the Gemini API" and points developers to "the new continuation protocol" in its documentation.

<figure class="mg" data-scene="plane"><img src="/blog/assets/media/how-to-use-gemini-4-argon/plane.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A paper plane leaves an open laptop on a white desk, carrying a slip that reads model: gemini-4-argon. It loops across to a small post box labelled Gemini API, paid tier. A second paper plane flies back and lands on the laptop with a slip that reads output."><figcaption>Google's models page, read 13 Oct 2026, lists the model ID gemini-4-argon, and its pricing page puts it on the paid tier. The drawing shows a request and its reply as paper planes. Tap the laptop to send another.</figcaption></figure>

## How do you use Gemini 4 Argon in Antigravity?

Sign in to Antigravity with a Google AI Ultra subscription and pick the model. Google's [Antigravity post](https://antigravity.google/blog/gemini-4-argon-in-google-antigravity) of 13 Oct 2026 says it is rolling out "for Google AI Ultra subscribers", "available in the Antigravity desktop app and the Antigravity CLI".

Businesses get it another way. The Antigravity post lists "the API in Gemini platform" and Antigravity "on eligible Gemini Enterprise subscriptions". Google's launch post also mentions "slash commands like /goal" and multi agent loops with custom skills in Antigravity. Our [Claude Code vs Antigravity](/blog/claude-code-vs-antigravity/) page compares the tool itself.

<figure class="mg" data-scene="floating"><img src="/blog/assets/media/how-to-use-gemini-4-argon/floating.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A plain desk on a white background with a name plate reading Antigravity. A pencil, a notebook and an apple lift gently off the desk and float above it. Two cards float up after them and settle side by side: desktop app and CLI. A tag tied to the desk reads Google AI Ultra."><figcaption>Google's Antigravity post, dated 13 Oct 2026, says Gemini 4 Argon is in the Antigravity desktop app and the Antigravity CLI for Google AI Ultra subscribers. The drawing takes the product name literally. Tap the desk to drop everything.</figcaption></figure>

## Can you use it in Gemini CLI or Munder Difflin?

In Gemini CLI it was not listed on 13 Oct 2026; in Munder Difflin, yes, through Antigravity or Cursor. That day the [model list file](https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/config/models.ts) in the Gemini CLI repository had no Gemini 4 entry, and Google's Antigravity post names the Antigravity CLI. Our [Gemini CLI install guide](/blog/how-to-install-gemini-cli/) explains how to set a model once an ID is supported.

In Munder Difflin, Gemini 4 Argon is in the model pickers for Antigravity and Cursor, added by a [pull request](https://github.com/HarnessMD/munder-difflin/pull/738) merged on 13 Oct 2026.

## Are there other ways in?

Two, both by application. Google's launch post offers 10,000 scientists "the highest usage tier in Google Antigravity free of charge for 6 months", "subject to eligibility, capacity, and selection". It also invites security teams to "Apply to join the Fairwind Program".

## Which route should you pick?

Pick the route you already pay for. Chat users on Ultra or Pro should start in the Gemini app. Developers with billing on should call `gemini-4-argon` through the API, where the price is listed per token. Teams that want an agent to do long coding jobs should look at Antigravity on Ultra.

<link rel="stylesheet" href="/blog/assets/media/how-to-use-gemini-4-argon/motion.css"><script defer src="/blog/assets/media/how-to-use-gemini-4-argon/motion.js"></script>
