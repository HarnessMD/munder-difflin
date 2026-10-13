---
title: "Claude Code Pricing (Sep 2026): Every Plan, and Is It Free?"
description: "Claude Code pricing checked 29 Sep 2026: Pro, Max, Team, Enterprise and API rates, usage limits, what changed this year, and whether Claude Code is free."
date: 2026-09-10
updated: 2026-09-29
category: concepts
categoryLabel: Concepts
type: Non-technical
primaryKeyword: "claude code pricing"
secondaryKeywords: ["how much does claude code cost", "is claude code free", "claude code free", "claude code cost per month", "claude code api pricing", "claude code price india"]
tags: ["Concepts", "Cost", "Claude Code", "Getting Started"]
faq:
  - q: "Is Claude Code free?"
    a: "No. As of 29 Sep 2026 the free Claude plan does not include Claude Code; it starts on Claude Pro at $20 a month (claude.com/pricing). The only $0 routes are the small trial credit a new Claude Console API account gets, and Anthropic's Claude for Open Source program, which gives eligible maintainers six months of Max 20x."
  - q: "How much does Claude Code cost per month?"
    a: "$17 to $200 a month for one person on a subscription, checked 29 Sep 2026: Pro is $20 billed monthly or $17 billed annually, Max is $100 (5x) or $200 (20x). On an API key there is no monthly fee; Anthropic's cost docs put the average enterprise developer at $150 to $250 a month."
  - q: "Do Claude Code and Claude chat share the same usage limit?"
    a: "Yes. On Pro and Max, everything you do in Claude and in Claude Code counts against the same limits, according to Anthropic's help article on using Claude Code with Pro or Max (updated 19 Aug 2026). A long chat in the afternoon leaves less room for coding in the same five hour window."
  - q: "Is the API cheaper than a subscription for Claude Code?"
    a: "For light or occasional use, usually yes, because you pay only for the tokens you use. For daily use a subscription is almost always cheaper: Anthropic's own cost docs, checked 29 Sep 2026, put the average enterprise developer on the API at about $13 per active day, which passes the $100 Max 5x price in eight working days."
  - q: "Does Claude Code cost less in India?"
    a: "Anthropic started charging in rupees in India on 13 Jul 2026, with Pro at ₹2,000 a month billed annually and Max from ₹11,999, taxes included (TechCrunch, 13 Jul 2026). Anthropic did not comment on the rollout, so check the price your own account sees at checkout."
  - q: "How do I see what Claude Code is spending?"
    a: "Run /usage inside Claude Code. On an API key it shows a session cost estimate at list price; on Pro and Max it shows plan usage bars and a breakdown by skills, subagents and MCP servers. The Claude Console usage page is the authoritative bill for API users (code.claude.com/docs/en/costs, checked 29 Sep 2026)."
---

As of 29 Sep 2026, Claude Code pricing starts at $20 a month with Claude Pro ($17 a month billed annually), and every paid plan above it includes Claude Code too. The free Claude plan does not. For light use, the cheapest way in is an API key billed per token.

Anthropic changed limits, models or local pricing at least five times between May and September 2026, so every figure here names its source and the date it was checked. If you run more than one Claude Code session at a time, you can track spend by hand, or use [Munder Difflin](https://harnessmd.com/download), free and open source: it runs every agent on the Claude subscription or API key you already pay for, and adds per agent token caps on top.

## What are all the ways to pay for Claude Code?

There are nine: four individual plans (one of them free and without Claude Code), two Team seats, Enterprise, a pay as you go API key, and usage credits on top of Pro or Max. Every price below is in US dollars from [claude.com/pricing](https://claude.com/pricing) unless the row says otherwise, checked 29 Sep 2026.

| Way to pay | Price (checked 29 Sep 2026) | Includes Claude Code | Usage you get |
|---|---|---|---|
| Free | $0 | No | Chat in the Claude apps (web search, memory, files, code, app connectors), no Claude Code |
| Pro | $20 a month, or $17 a month billed annually | Yes | Base allowance: five hour window plus a weekly cap, shared with Claude chat |
| Max 5x | $100 a month (Anthropic Max help article) | Yes | Five times Pro per session, plus a weekly cap across all models |
| Max 20x | $200 a month (Anthropic Max help article) | Yes | Twenty times Pro per session, plus a weekly cap |
| Team Standard seat | $25 a seat monthly, $20 a seat billed annually | Yes | More usage than Pro |
| Team Premium seat | $125 a seat monthly, $100 a seat billed annually | Yes | Five times a Standard seat |
| Enterprise | $20 a seat a month billed annually, plus usage at API rates | Yes | Usage billed on top of the seat |
| API key (Claude Console) | Per token, see the next table | Yes | No plan cap; API rate limits by tier |
| Usage credits on Pro or Max | Standard API rates, past your plan limit | Yes | Up to an optional monthly spend limit |

Usage credits bridge the two. When a Pro or Max plan hits its limit, you keep going at API rates, capped by a monthly spend limit if you set one (without one, `/usage` shows Unlimited). Inside Claude Code, `/usage-credits` opens that setting ([Claude Code cost docs](https://code.claude.com/docs/en/costs), checked 29 Sep 2026).

{% img "note-1" %}

## Is Claude Code free?

No. The free Claude plan covers chat on web, desktop and mobile, but claude.com/pricing lists Claude Code only from Pro upward (checked 29 Sep 2026). The free tier will happily explain Claude Code to you; it just will not run it.

Some pages claim a free account gets a few prompts every five hours; Anthropic's pricing page did not say so on 29 Sep 2026. What does exist:

* **API trial credit.** Anthropic's pricing docs say new API users "receive a small amount of free credits to test the API", with no amount given. Point Claude Code at that key and it runs until the credit is gone.
* **Claude for Open Source.** Maintainers who qualify (for example 200,000 combined monthly downloads, or 100 merged pull requests into repos they do not own in the last 12 months) can apply for six months of Max 20x at no cost, per claude.com/contact-sales/claude-for-oss, checked 29 Sep 2026.
* **A local model.** Claude Code can talk to a model running in Ollama instead of Anthropic's API, which costs nothing per token. Our guide on [connecting Ollama to Claude Code](/blog/how-to-connect-ollama-to-claude-code/) covers the setup and what stops working.

The $100 and $250 cloud session credits Anthropic began handing out on 23 Sep 2026 are not a free route: they go to people who already pay for Pro or Max, cover cloud sessions only, must be claimed by 7 Oct 2026 and expire on 4 Nov 2026 (BleepingComputer, 25 Sep 2026).

## What changed in Claude Code pricing in the last six months?

Limits and models moved; the subscription prices did not. Here is what changed between April and September 2026, oldest first:

* **6 May 2026:** Anthropic [doubled Claude Code's five hour limits](https://www.anthropic.com/news/higher-limits-spacex) on Pro, Max, Team and seat based Enterprise, and dropped the peak hours reduction on Pro and Max.
* **13 Jul 2026:** rupee pricing arrived in India (details below).
* **31 Aug 2026:** the introductory period for Claude Sonnet 5's $2 and $10 per million token price ended, and that price stayed as the standard price. The planned rise to $3 and $15 on 1 Sep 2026 was cancelled, per a footnote on Anthropic's pricing docs.
* **14 Sep 2026:** a temporary 50% boost to weekly limits ended and a permanent 25% increase over the old standard began. Anthropic said on 29 Aug 2026, as BleepingComputer reported that day, that this works out to a 17% cut against the boosted level; our [Max plan guide](/blog/claude-code-max-plan-tips/) has the details.
* **Claude Code 2.1.280 and later:** the default model on Pro, Max, Team, Enterprise and API keys is now Opus 5.5. Before that, Pro and Team Standard started on Sonnet 5 ([model configuration docs](https://code.claude.com/docs/en/model-config), checked 29 Sep 2026).

That last one matters: a Pro user who updated in September now spends the same allowance on Opus by default.

## How much does Claude Code cost on the API?

It depends on the model, from $1 to $10 per million input tokens as of 29 Sep 2026. These are the per million token list prices on Anthropic's [pricing docs](https://platform.claude.com/docs/en/about-claude/pricing), checked 29 Sep 2026:

| Model | Claude Code alias | Input | Output | Cache hit |
|---|---|---|---|---|
| Claude Fable 5.1 | `fable` | $10 | $50 | $0.25 |
| Claude Opus 5.5 | `opus`, the default | $4 | $20 | $0.20 |
| Claude Sonnet 5.5 | `sonnet` | $2 | $10 | $0.20 |
| Claude Haiku 4.5 | `haiku` | $1 | $5 | $0.10 |

Two details from the same page, checked 29 Sep 2026. Opus 5.5 is cheaper than Opus 5 ($5 and $25), and in Sep 2026 its cache hits cost 5% of the input price instead of the usual 10%, which matters because Claude Code re-reads your conversation from cache on every turn. Fable is never the default on any plan; you only pay Fable prices if you pick it with `/model fable`.

For a monthly figure, Anthropic's cost docs (checked 29 Sep 2026) say enterprise deployments average about $13 per developer per active day and $150 to $250 per developer per month, with 90% of users under $30 per active day.

## Is a subscription or the API cheaper for Claude Code?

A subscription, if you use Claude Code most working days. Against Anthropic's own $13 per active day average (cost docs, checked 29 Sep 2026), the API passes the $20 Pro price in two days and the $100 Max 5x price in eight. The API wins when you code with Claude a few times a month, or run Claude Code in CI where a personal subscription does not belong. Our breakdown of [whether Claude Code Max is worth it](/blog/is-claude-code-max-worth-it/) runs that sum on your own usage.

## What does Claude Code cost in India?

Pro is ₹2,000 a month billed annually and Max starts at ₹11,999 a month, taxes included, according to TechCrunch's report of 13 Jul 2026 on Anthropic's rupee rollout. Team seats started at ₹2,399 in that July 2026 report. Anthropic did not respond to TechCrunch and its public pricing page showed only dollars when we fetched it on 29 Sep 2026, so treat the checkout price on your own account as the real one. API usage is still billed in USD.

## How do you keep Claude Code costs down?

Pick the model on purpose and keep the context small, because every turn resends the conversation. These come from Anthropic's cost docs, checked 29 Sep 2026:

* Run `/model sonnet` for everyday edits now that Opus 5.5 is the default, and set `model: haiku` on subagents that only search or summarise.
* Run `/clear` between unrelated tasks. `/clear` costs nothing; `/compact` reads the whole conversation to summarise it, so it is a large request itself.
* Keep `CLAUDE.md` short and move workflow instructions into skills, which load only when used. Anthropic suggests under 200 lines.
* Lower `/effort` for routine work. Thinking tokens are billed as output tokens.
* Check `/usage` once a day. On Pro and Max it flags any habit, such as long context, that took 10% or more of your usage in the last day or week (docs checked Sep 2026).

## What happens to the bill when you run several agents?

It multiplies. Each Claude Code agent is its own process with its own context window, all drawing on the same plan or the same API key. Anthropic's cost docs (checked 29 Sep 2026) say agent teams in plan mode use about 7 times the tokens of a single session.

{% img "note-2" %}

Claude Code has one guard of its own. On 29 Sep 2026, `claude --help` on Claude Code 2.1.284 printed:

```
--max-budget-usd <amount>             Maximum dollar amount to spend on API
                                      calls (only works with --print)
```

So it applies to scripted runs, not interactive sessions. Munder Difflin adds the guard across a whole floor. As of Munder Difflin 0.5.3, its circuit breaker (`src/main/breaker.ts`) checks each agent against its own token cap, checks the whole floor against a total cap (blaming the biggest spender), and watches for loops and error storms. When one trips, it steers the agent with a message first, then constrains it; it only stops an agent if you turn hard stop on, which is off by default. None of this changes what Anthropic charges you. Our [multi agent cost playbook](/blog/the-multi-agent-cost-playbook/) covers the other levers for a fleet.

Anthropic revises these numbers without much notice. Check [claude.com/pricing](https://claude.com/pricing) before you commit a team to a plan; this page is correct as of 29 Sep 2026.
