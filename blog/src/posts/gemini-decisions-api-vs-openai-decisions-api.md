---
title: "Gemini Decisions API vs OpenAI Decisions API: Price, Inputs and Limits"
seoTitle: "Gemini Decisions API vs OpenAI Decisions API (Nov 2026)"
description: "Gemini Decisions API vs OpenAI Decisions API: both list $0.10 per 1M input tokens. Inputs, models, status, limits and which to pick, checked 12 Nov 2026."
date: 2026-11-12
category: comparisons
categoryLabel: Comparisons
type: Technical
primaryKeyword: "gemini decisions api"
secondaryKeywords: ["gemini decisions api vs openai decisions api", "gemini decision model", "gemini decisions api pricing", "gemini decision 1", "openai decisions api vs gemini"]
tags: ["Comparisons", "OpenAI", "AI Agents", "Models"]
faq:
  - q: "What is the difference between the Gemini Decisions API and the OpenAI Decisions API?"
    a: "Mostly inputs, caps and status. Google's docs say the Gemini Decisions API reads text, images, audio, video and PDFs, takes up to 1,000 questions a request and is available on the Gemini Developer API (v1beta). OpenAI's guide says its Decisions API reads text, images and JSON, takes up to 400 questions and is generally available. Checked 12 Nov 2026."
  - q: "How much does the Gemini Decisions API cost?"
    a: "On 12 Nov 2026 Google's pricing page listed Gemini Decision 1 at $0.10 per 1M input tokens on the paid tier and free of charge on the free tier. Output is listed as not applicable, because the model generates 0 output tokens. Context caching is not available for it."
  - q: "Is the OpenAI Decisions API still in beta?"
    a: "No. OpenAI's changelog entry for Oct 22 says the Decisions API is now generally available with gpt-6-luna. The same entry raised the cap to 400 questions per request, up from 200 in public beta. Checked 12 Nov 2026."
  - q: "Is the Gemini Decisions API on Vertex AI?"
    a: "Vertex AI is not stated on Google's pages. The launch post says the API is \"available through the Gemini API in Google AI Studio\", \"with support coming soon to Gemini in Google Cloud.\" The docs list the Gemini Developer API (v1beta) only. Checked 12 Nov 2026."
  - q: "Can either decisions API write text or code?"
    a: "No. Google's docs say the Gemini Decisions API generates zero text tokens and point to the Interactions API for generated text. OpenAI's guide points to Structured Outputs or function calling when you need written output or a tool call."
---

Our view: pick the Gemini Decisions API for audio, video or PDF inputs and up to 1,000 questions a call, and the OpenAI Decisions API for a generally available endpoint with prompt caching and JSON input. On 12 Nov 2026 both list $0.10 per 1M input tokens with no output charge. Checked 12 Nov 2026.

Google launched its API on 11 Nov 2026; OpenAI's went generally available on 22 Oct, per its [changelog](https://developers.openai.com/api/docs/changelog). Both answer fixed questions with numbers instead of text. More in our [Comparisons hub](/blog/topics/comparisons/) and [OpenAI Decisions API explainer](/blog/openai-decisions-api/). To run several agents rather than score inputs, see [Herdr alternatives](/blog/herdr-alternatives/).

## Gemini Decisions API vs OpenAI Decisions API at a glance (checked 12 Nov 2026)

Both return probabilities for questions you write and bill only input tokens; they differ on inputs, caps and status.

| | Gemini Decisions API | OpenAI Decisions API |
| --- | --- | --- |
| What it returns | Yes or no probability, a choice or a score, each with a confidence | A probability, a choice or a score; confidence on choice and score |
| Inputs | Text, images, audio, video, PDFs | Text, images, JSON, conversation history |
| Model | `gemini-decision-1` | `gpt-6-luna` |
| Status | Gemini Developer API (v1beta); preview or GA not stated | Generally available since 22 Oct 2026 |
| Where it runs | Gemini API, Google AI Studio | OpenAI API, Playground |
| Price on 12 Nov 2026 | $0.10 per 1M input tokens; free tier | $0.10 per 1M uncached input tokens |
| Questions per request | 1 to 1,000 | 1 to 400 |
| Context limit | 262,144 tokens | Not stated on its page |
| Caching | Not available | Prompt caching |

## What is the Gemini Decisions API?

It is a Gemini API endpoint that scores answers you supply instead of writing text. Google's [launch post](https://blog.google/innovation-and-ai/technology/developers-tools/gemini-decisions-api/) calls it "a new endpoint for fast, closed-set decisions powered by our new Gemini Decision 1 model (gemini-decision-1)". The [docs](https://aistudio.google.com/docs/decisions-api) add that it "generates zero text tokens, so output token usage is always 0."

You send one shared input of text, images, audio, video or PDF, plus 1 to 1,000 questions. Each question is one of three types. A yes or no question returns a probability from 0.01 to 0.99. A `choice` question picks from 2 to 255 options. A `score` question rates the input against ordered rubric levels. Every answer carries a confidence value. The yes or no type really is spelled `noul` in Google's docs and code samples.

<figure class="mg" data-scene="prism"><img src="/blog/assets/media/gemini-decisions-api-vs-openai-decisions-api/prism.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, blue and green beams labelled text, images, audio, video and PDF enter a glass prism, and three slim beams labelled yes or no, choice and score come out the other side. Tapping the prism replays the beams."><figcaption>Gemini Decision 1 reads text, images, audio, video and PDFs and returns three answer types. Google's docs, 12 Nov 2026.</figcaption></figure>

The docs give a context window of 262,144 tokens across the input and all questions. The API "doesn't support context caching, Batch API, or Flex or Priority inference", so "Repeated input across requests counts in full." The [rate limits page](https://aistudio.google.com/docs/rate-limits) lists 200 requests a minute and 10,000 a day free, and 1,500 a minute on Tier 1.

On status, the docs say "Available on the Gemini Developer API (v1beta)". No preview or GA label appears on the pages, and Vertex AI is not named. The launch post says support is "coming soon to Gemini in Google Cloud".

Google's own figures: 150 to 250 ms end to end, "the lowest calibration error" on its benchmarks, and "nearly 5x cheaper across the shared benchmark suite than Gemini 3.5 Flash-Lite with the Interactions API."

## What is the OpenAI Decisions API?

It is OpenAI's `POST /v1/decisions` endpoint, generally available since 22 Oct 2026 with one model, `gpt-6-luna`. The [Decisions guide](https://developers.openai.com/api/docs/guides/decisions) says it "evaluates text, images, and JSON and returns typed answers about 10x faster than the Responses API". That speed figure is OpenAI's own.

Since the public beta, the guide has added prompt caching, JSON input, images inside questions, hosted image URLs and conversation history with tool calls. It allows "up to 400 questions per request, up from 200 during the public beta." It still takes no audio: "Files, audio, and item references aren't supported."

The question types are `predicate`, which returns a probability from 0 to 1, `choice` and `score`. Choice and score answers add "a probability distribution and a separate `confidence` field." Zero Data Retention and HIPAA use are supported "for eligible customers". The guide states no rate limit for the endpoint.

<figure class="mg" data-scene="ballot"><img src="/blog/assets/media/gemini-decisions-api-vs-openai-decisions-api/ballot.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, paper slips marked predicate, choice and score drop one by one into a ballot box labelled OpenAI while its counter ticks up to 400 and stops. A second box labelled Gemini keeps counting to 1,000. Tapping a box restarts its count."><figcaption>OpenAI allows up to 400 questions per request, up from 200 in beta; Google allows up to 1,000. Vendor docs, 12 Nov 2026.</figcaption></figure>

## How much do they cost?

They list the same price: $0.10 per 1M input tokens on 12 Nov 2026, and nothing for output. The difference is in what you pay for repeated input.

On 12 Nov 2026 Google's [pricing page](https://aistudio.google.com/docs/pricing) listed Gemini Decision 1 as free of charge on the free tier and $0.10 per 1M input tokens on the paid tier. Each request "bills shared input tokens once, regardless of question count."

On 12 Nov 2026 OpenAI's guide said "uncached input costs $0.10 per 1M tokens", with cache hits discounted and cache writes charged. OpenAI's [pricing page](https://developers.openai.com/api/docs/pricing) listed `gpt-6-luna` cached input at $0.01 per 1M tokens on 12 Nov 2026. The cached prefix needs at least 1,024 tokens. Regional processing premiums and long context multipliers apply.

<figure class="mg" data-scene="tollbooth"><img src="/blog/assets/media/gemini-decisions-api-vs-openai-decisions-api/tollbooth.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, two tollbooths labelled Gemini and OpenAI each show a sign reading $0.10 per 1M input tokens. Small cars marked input stop and pay, while cars marked output roll through an open lane signed 0. Tapping a booth lifts its barrier again."><figcaption>Both list $0.10 per 1M input tokens and charge nothing for output, per Google's pricing page and OpenAI's Decisions guide on 12 Nov 2026.</figcaption></figure>

Our view: OpenAI's caching suits one long document asked new questions across many calls; Google's single bill for shared input suits many questions in one call.

## Which should you pick?

Pick by input type, question count and status.

**Pick the Gemini Decisions API if:**
- Your input is audio, video or a PDF.
- You ask more than 400 questions of one input.
- You want a free tier to prototype in Google AI Studio.

**Pick the OpenAI Decisions API if:**
- You need an endpoint marked generally available today.
- You resend a long shared input and want cache discounts.
- Your evidence is JSON or a conversation with tool calls.

Our view: set thresholds from your own labelled examples, as OpenAI's guide advises, and keep "a human or a second check on high-stakes actions such as payouts", as Google's docs put it.

## Can a team of agents use a decisions API?

Yes, as a fast step between agents, not as an agent. Google's docs list "Decide which tools an agent needs, or whether to compact, escalate, or stop" as a use. OpenAI's guide puts the split plainly: "Decisions returns typed answers; your application runs any actions those answers select."

Our view: use it to route a task to the right agent or [the right model](/blog/do-more-with-less-model-routing/), or to flag work for a person, and leave the writing to a model that writes.

If you want the team itself, [Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. Its agents run on engines such as Claude Code, Codex and Gemini CLI, and can use MCP servers and skills. The [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup.

<link rel="stylesheet" href="/blog/assets/media/gemini-decisions-api-vs-openai-decisions-api/motion.css"><script defer src="/blog/assets/media/gemini-decisions-api-vs-openai-decisions-api/motion.js"></script>
