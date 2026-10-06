---
title: "Codex Pricing: Every Plan, Usage Limit and API Rate (Oct 2026)"
description: "Codex pricing checked 5 Oct 2026: which ChatGPT plans include Codex, US prices from $0 to $500, how usage limits are counted, credits and API key rates."
date: 2026-10-05
category: guides
categoryLabel: Guides
type: Non-technical
primaryKeyword: "codex pricing"
secondaryKeywords: ["openai codex pricing", "codex plan", "codex plans", "codex usage limits", "is codex free", "codex api pricing"]
tags: ["Guides", "Codex", "Pricing", "Cost", "Engines"]
faq:
  - q: "How much does Codex cost?"
    a: "Codex has no price of its own. It comes with every ChatGPT plan: Free at $0, Go at $8, Plus at $20 and Pro at $100, $200 or $500 a month, plus Business seats from $20 per user a month billed annually ($25 monthly). You can also pay per token with an API key. These are US prices from OpenAI's pricing pages, checked 5 Oct 2026."
  - q: "Is Codex free?"
    a: "Yes, with limits. OpenAI's help centre says Codex is included across ChatGPT plans, including Free and Go, and the ChatGPT pricing page lists limited Codex access on Free. Codex Cloud is not included with Free or Go. Checked 5 Oct 2026."
  - q: "What are the Codex usage limits on Plus?"
    a: "OpenAI publishes estimates, not fixed caps. On Plus, the Codex pricing page estimates 15 to 160 local messages per five hours on GPT-6.1 Sol and 350 to 3,000 on GPT-6 Luna, and says weekly limits may also apply. The real figure depends on the model, task size and context. Checked 5 Oct 2026."
  - q: "Is it cheaper to use Codex with an API key or a ChatGPT plan?"
    a: "OpenAI does not give a way to compare them. Its pricing page says API token prices are separate from subscription usage and should not be used to estimate included tasks. An API key suits automation such as CI, where you pay only for what runs. A plan suits daily interactive work."
  - q: "What happens when I hit my Codex limit?"
    a: "Codex can finish the turn already in progress, subject to fair use limits. After that, eligible Plus and Pro users can buy credits without changing plans, or wait for the reset time shown on the usage page. OpenAI's help centre says credits are valid for 12 months from purchase."
---

Codex has no price of its own. It comes with every ChatGPT plan, from Free at $0 to Pro at $500 a month, or you pay per token with an API key. Verdict: Plus at $20 a month is the right first plan for most developers. These are US prices, checked 5 Oct 2026.

You can run Codex on its own, or inside [Munder Difflin](https://harnessmd.com/download), which is free and open source: a desktop app that runs a team of coding agents such as Claude Code, Codex and Gemini CLI on your own computer. The [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup, and the [Guides hub](/blog/topics/guides/) has our other Codex walkthroughs.

## How much does Codex cost?

Codex costs whatever your ChatGPT plan costs, because OpenAI does not sell it separately. Here is what OpenAI lists, in US dollars:

| Plan | US price (checked 5 Oct 2026) | What OpenAI lists for Codex |
| --- | --- | --- |
| Free | $0 | Limited Codex access in the desktop app, no Codex Cloud |
| Go | $8 a month | Same Codex access as Free, no Codex Cloud |
| Plus | $20 a month | Web, CLI, IDE extension and iOS, Codex Cloud, automatic code review, Slack |
| Pro 100 | $100 a month | Everything in Plus, no five hour limit for now |
| Pro 200 | $200 a month | More usage than Pro 100 |
| Pro 500 | $500 a month | Highest included usage, plus Astra Ultrafast |
| Business, Standard seat | $20 per user a month billed annually, $25 monthly | Desktop and mobile apps, larger cloud machines, admin controls |
| Business, Premium seat | $100 per user a month billed annually, $125 monthly | 5x the usage of a Standard seat, no five hour limit |
| API key | API token rates | CLI, SDK and IDE extension only, no cloud features |

Prices come from OpenAI's [Codex pricing page](https://learn.chatgpt.com/docs/pricing), the [ChatGPT pricing page](https://chatgpt.com/pricing), its [business pricing page](https://openai.com/api/pricing/) and the [Pro tiers article](https://help.openai.com/en/articles/9793128). Business needs two or more users. Pro is billed monthly only, according to the Pro article.

## Which ChatGPT plans include Codex?

All of them. OpenAI's [help centre](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan) says "Codex is included across ChatGPT plans, including Free and Go". The plan decides where you can use it and how much.

The Free and Go cards on the Codex pricing page list the desktop app only, "subject to rollout". Plus is the first card that lists the web, the CLI, the IDE extension and iOS. Codex Cloud, which runs tasks on OpenAI's machines, is for eligible Plus, Pro, Business, Enterprise, Healthcare and Education accounts, and the help centre says it is not included with Free or Go. Enterprise and Edu are "Contact sales". [What Codex is](/blog/what-is-codex/) explains each surface.

{% img "note-1" %}

## What are the Codex usage limits?

There is no fixed message count. OpenAI says the number of messages depends on the model, the size and complexity of the task, and whether it runs locally or in the cloud. It publishes estimates of local messages per five hour period for Plus and Standard Business seats:

| Model | Estimated local messages per five hours (checked 5 Oct 2026) |
| --- | --- |
| GPT-6 Astra | 5 to 45 |
| GPT-6.1 Sol | 15 to 160 |
| GPT-6 Sol | 15 to 150 |
| GPT-6 Luna | 350 to 3,000 |

Four rules from the same page decide how fast you get through that:

* **One shared pool.** Local messages and cloud chats draw on the same allowance, and ChatGPT Work shares it too. Cloud tasks may use more than local ones.
* **Weekly limits may also apply.** The page does not say how big they are.
* **Pro has no five hour limit right now.** The page says "currently", so treat it as temporary.
* **Speed costs extra.** Fast mode uses included usage at 2.5x the Standard rate, and GPT-6 Astra Ultrafast at 8x.

OpenAI does not publish message estimates for the Pro tiers on the pages we opened, only that Pro 200 includes more than Pro 100 and Pro 500 the most. One dated catch: new Pro 200 subscriptions carry a lower allowance than before. Anyone with an active Pro 200 subscription between 22 Sep and 10 a.m. Pacific on 29 Sep 2026 keeps the old one through 29 Oct 2026, while the subscription stays active.

To see where you stand, type `/status` in a Codex CLI session or open the usage dashboard. See our [Codex plan tips](/blog/codex-max-plan-tips/).

## What happens when you hit the limit?

Codex finishes the turn it is on, subject to fair use limits. After that, eligible Plus and Pro users can buy credits without changing plans; OpenAI says a limited group of Free and Go users can too. Credits are charged per million tokens at Standard speed:

| Model | Input | Cached input | Output |
| --- | --- | --- | --- |
| GPT-6 Astra | 250 credits | 25 credits | 1,250 credits |
| GPT-6.1 Sol | 50 credits | 2.5 credits | 250 credits |
| GPT-6 Luna | 2.5 credits | 0.25 credits | 12.5 credits |

OpenAI's [credits article](https://help.openai.com/en/articles/12642688) says credits are valid for 12 months from purchase. None of the pages we opened shows the dollar price of a credit. They say purchase prices vary by plan, account and region.

## What does Codex cost with an API key?

With an API key you pay per token and skip the subscription. OpenAI's [API pricing page](https://developers.openai.com/api/docs/pricing) lists these Standard rates per million tokens, short context, checked 5 Oct 2026:

| Model | Input | Cached input | Output |
| --- | --- | --- | --- |
| `gpt-6-astra` | $10.00 | $1.00 | $50.00 |
| `gpt-6.1-sol` | $2.00 | $0.10 | $10.00 |
| `gpt-6-luna` | $0.10 | $0.01 | $0.50 |

The API also bills cache writes ($12.50, $2.50 and $0.125 in the same order); Codex credits have no separate cache write charge. Long context requests cost more: `gpt-6.1-sol` rises to $4.00 input and $15.00 output. An API key runs Codex in the CLI, the SDK and the IDE extension, with no cloud features such as GitHub code review or Slack.

The Codex pricing page says API token prices are separate from subscription usage and should not be used to estimate included tasks.

{% img "note-2" %}

## Is Codex free?

Yes, with limits. The ChatGPT pricing page lists "Limited Codex access" on the $0 plan. The Free card lists the desktop app only, the help centre says Codex Cloud is not included, and OpenAI does not publish a message estimate for Free or Go. Its two pricing pages also name different models for Free, so check the model picker instead of trusting either. To set up the terminal client, see our [Codex CLI install guide](/blog/how-to-install-codex-cli/).

## Which Codex plan should you buy?

Buy the smallest plan that covers your week.

* **Solo, trying it out.** Start on Free in the desktop app. Move to Plus at $20 when you want Codex Cloud. Plus is also the first plan whose card lists the CLI; the help centre lists the CLI as a client without singling out Free, so try it first.
* **Solo, a few focused sessions a week.** Plus.
* **Heavy daily use.** Pro 100 first, since it drops the five hour limit. Step up to Pro 200 only if the weekly limit still stops you. Pro 500 is for people who need Astra Ultrafast.
* **A team.** Business Standard seats, with Premium seats for the heaviest users. OpenAI lets you mix seat types.
* **CI and scripts.** An API key, so the pipeline never eats a person's allowance.

Starting low is cheap. Explaining a $500 line to whoever reads the card statement is not.

Still deciding between tools? Our [Codex vs Claude Code comparison](/blog/codex-cli-vs-claude-code/) puts the plans side by side.
