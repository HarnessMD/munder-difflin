---
title: "OpenAI Decisions API: what it is, price and limits"
description: "The OpenAI Decisions API is a beta endpoint that returns a probability, a pick or a score. Price, limits and how to call it, checked 7 Oct 2026."
date: 2026-10-07
category: concepts
categoryLabel: Concepts
type: Non-technical
primaryKeyword: "openai decisions api"
secondaryKeywords: ["decisions api", "gpt-6-luna decisions", "openai decisions api pricing", "decision model", "what is a decision model", "v1/decisions"]
tags: ["Concepts", "OpenAI", "AI Agents"]
faq:
  - q: "Is the OpenAI Decisions API generally available?"
    a: "No. OpenAI's Decisions guide says the API is in public beta and that OpenAI expects to GA in the coming weeks. It gives no date. The API changelog entry for the beta release is dated Oct 6, 2026. Checked 7 Oct 2026."
  - q: "How much does the OpenAI Decisions API cost?"
    a: "OpenAI's guide says that with gpt-6-luna, input costs $0.10 per 1M tokens, and that you pay only for input tokens, with no cache-read, cache-write or output-token charges. It adds that regional processing premiums and long-context input pricing multipliers apply. Checked 7 Oct 2026."
  - q: "Which models work with the Decisions API?"
    a: "One. OpenAI's guide says gpt-6-luna is the only model currently available on the POST /v1/decisions endpoint."
  - q: "Can the Decisions API read images?"
    a: "Yes, with a limit. OpenAI's guide says images must be inline base64 data URLs. Hosted HTTP or HTTPS image URLs and file_id inputs are not supported by this endpoint."
  - q: "Can the Decisions API write code?"
    a: "No. It returns typed answers: a probability, a choice from your options or a score. OpenAI's guide points you to Structured Outputs with the Responses API when you need an object in your own JSON schema, such as a written explanation, and to function calling when you need a tool call."
---

The OpenAI Decisions API is a beta endpoint that answers fixed questions with a probability, a pick or a score instead of written text. OpenAI released it on 6 Oct 2026 with one model, gpt-6-luna, at $0.10 per 1M input tokens. Our view: worth a test for classifying and routing, not a coding tool. Checked 7 Oct 2026.

Agents need sorting and routing too, which is why we looked. [Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of coding agents such as Claude Code, Codex and Gemini CLI on your own computer. We have not tried the Decisions API, so nothing here is a test result. The [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup and the [Concepts hub](/blog/topics/concepts/) explains the terms.

## What is the OpenAI Decisions API?

It is an OpenAI endpoint, `POST /v1/decisions`, that reads text, images or both and returns a typed answer. OpenAI's [Decisions guide](https://developers.openai.com/api/docs/guides/decisions) says it "returns typed answers about 10x faster than the Responses API", and names three uses: classify content, route requests and prioritize work. The speed figure is OpenAI's own.

The [API changelog](https://developers.openai.com/api/docs/changelog) entry dated Oct 6 reads: "Released the Decisions API in beta with gpt-6-luna." The guide says the API is in public beta, "and we expect to GA in the coming weeks".

Each question has one of three types. From the guide, 7 Oct 2026:

| Type | Use it to | Main result |
| --- | --- | --- |
| `predicate` | Check a condition, such as visible damage | `probability`: an estimate from 0 to 1 that the condition is true |
| `choice` | Select one option, such as a department | `choice`: one of your supplied values |
| `score` | Rate an input against ordered levels, such as issue severity | `score`: the probability-weighted average of the level indices |

The [Hacker News thread](https://news.ycombinator.com/item?id=49984025) had more than 250 points and 114 comments when we read it on 7 Oct 2026.

<figure class="mg" data-scene="chute"><img src="/blog/assets/media/openai-decisions-api/chute.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. Marbles roll down a sorting chute and drop through one of three gates labelled predicate, choice and score. Each gate lights a small tag: probability, one of your supplied values, or a score."><figcaption>The three question types in OpenAI's Decisions guide, read on 7 Oct 2026.</figcaption></figure>

## What is a decision model, and how is it different from a chat model call?

A decision model picks from options you supply and attaches a number, where a chat model writes free text. OpenAI's guide does not use the term. This definition is from [Strands' post](https://strandsagents.com/blog/introducing-strands-decider/) of 1 October 2026: "Unlike LLMs that can generate arbitrary output, decision models are designed to pick between sets of options" and "assign simple numerical scores".

OpenAI's guide describes an endpoint, not a new kind of model. The [gpt-6-luna model page](https://developers.openai.com/api/docs/models/gpt-6-luna) calls it OpenAI's "most efficient model for focused, high-volume tasks" and lists the Responses endpoint as supported too. See also [GPT-6 Luna in ChatGPT](/blog/gpt-6-intelligent-ui/).

The practical difference is the reply. In a chat call you ask for a label and then parse a sentence. Here the answer arrives as fields: `probability`, `choice` or `score`, with a `confidence` field and per option `probabilities` on choice and score answers. It answers the question and stops.

The guide draws the line: use Structured Outputs with the Responses API when you need "extracted fields or a written explanation", and function calling when you need a tool call with arguments.

## What does the Decisions API cost?

Input costs $0.10 per 1M tokens on 7 Oct 2026, and output is not charged. OpenAI's [guide](https://developers.openai.com/api/docs/guides/decisions) says: "You pay only for input tokens: there are no cache-read, cache-write, or output-token charges." The two rows below are a selection from the guide and OpenAI's [pricing page](https://developers.openai.com/api/docs/pricing), which lists more tiers.

| Where gpt-6-luna runs (7 Oct 2026) | Input per 1M tokens | Output per 1M tokens |
| --- | --- | --- |
| `/v1/decisions` | $0.10 | No charge |
| Other requests, Standard, short context | $0.10 | $0.50 |

One qualifier: the guide says "Regional processing premiums and long-context input pricing multipliers apply", and gives no figures for them.

<figure class="mg" data-scene="meter"><img src="/blog/assets/media/openai-decisions-api/meter.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A parking meter with two slots. Tokens dropped in the slot marked input make the display tick up to $0.10 per 1M tokens. Tokens dropped in the slot marked output fall straight through and the display does not move."><figcaption>On /v1/decisions, input costs $0.10 per 1M tokens and output is not charged. OpenAI's guide, 7 Oct 2026.</figcaption></figure>

## What are the limits in beta?

One model, inline images and typed answers. From OpenAI's [guide](https://developers.openai.com/api/docs/guides/decisions):

* **Beta.** GA is expected "in the coming weeks". No date.
* **One model.** "`gpt-6-luna` is the only model currently available."
* **Images.** "Images must be inline base64 data URLs." Hosted HTTP or HTTPS image URLs and `file_id` inputs aren't supported by this endpoint.
* **No chained questions.** Independent questions can share one request. A decision that depends on an earlier answer needs a separate request.
* **Compliance.** Zero Data Retention and HIPAA use are supported "for eligible customers".

The guide states no rate limit and no input size cap for the endpoint.

<figure class="mg" data-scene="turnstile"><img src="/blog/assets/media/openai-decisions-api/turnstile.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. Three picture cards arrive at a turnstile. The card marked inline base64 data URL passes through. The cards marked hosted image URL and file_id are stopped as the arm locks."><figcaption>Images must be inline base64 data URLs. OpenAI's guide, 7 Oct 2026.</figcaption></figure>

## How do you call the Decisions API?

You send a POST with a model, an input and a list of questions. This request is trimmed from the guide's routing example, which lists four choices:

```bash
curl https://api.openai.com/v1/decisions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-6-luna",
    "input": "I was charged twice for my order.",
    "questions": [{
      "type": "choice",
      "name": "department",
      "instructions": "Which department should handle this complaint?",
      "choices": [
        {"value": "billing", "description": "Payments, invoices, and refunds."},
        {"value": "other", "description": "Requests outside these categories."}
      ]
    }]
  }'
```

The guide's score example shows how a score is built. Three severity levels get probabilities of 0.1, 0.7 and 0.2, and because level indices start at 0, the score comes out at 1.1. The guide calls that response illustrative.

<figure class="mg" data-scene="thermometer"><img src="/blog/assets/media/openai-decisions-api/thermometer.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A thermometer with three marks numbered 0, 1 and 2 for cosmetic, workaround available and fully blocked. Three bars sized 0.1, 0.7 and 0.2 grow beside the marks and the liquid rises to rest at 1.1, just above the middle mark."><figcaption>Probabilities of 0.1, 0.7 and 0.2 produce a score of 1.1 in the illustrative example in OpenAI's guide, 7 Oct 2026.</figcaption></figure>

## Is there an open alternative?

Yes, Strands Decider 2B is one you can run yourself. The [Strands post](https://strandsagents.com/blog/introducing-strands-decider/) of 1 October 2026 describes "a 2 billion parameter model, suitable for running on a local CPU or GPU", with weights on Hugging Face. GitHub listed the [repo](https://github.com/strands-labs/strands-decider) as Apache 2.0 on 7 Oct 2026.

The vendor's own figures: a median of around 115ms on an Nvidia RTX3090, and "3rd of 33 in the 2B class" on JevBench's public set. No source we opened compares it with OpenAI's endpoint.

## What does it mean if you run coding agents?

Little for the code writing itself, because the endpoint returns answers, not code. Strands says of this class of model that its "lack of ability to generate text makes it unsuited for coding". No source we opened says the Decisions API works with Codex or any other coding agent.

Our view: the fit is the small jobs around an agent, such as [model routing](/blog/do-more-with-less-model-routing/) or scoring a bug report's severity. Strands lists model routing, tool selection, evaluations and guardrails among early uses. These are ideas, not results.

## What should you do now?

Our view: try it on one narrow labelling job if you already use the OpenAI API, and otherwise wait for GA.

1. Test your own inputs in the [Playground](https://platform.openai.com/decisions).
2. Set thresholds from labeled examples of your own, as the guide advises.
3. Keep a beta endpoint out of anything you cannot change later.
4. For the code writing, see [best AI coding agents](/blog/best-ai-coding-agents/) and [what Codex is](/blog/what-is-codex/).

<link rel="stylesheet" href="/blog/assets/media/openai-decisions-api/motion.css"><script defer src="/blog/assets/media/openai-decisions-api/motion.js"></script>
