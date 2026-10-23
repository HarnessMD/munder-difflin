---
title: "Claude Code Pricing (Oct 2026): US and India Plans, Is It Free?"
description: "Claude Code starts at $20 a month on Claude Pro (checked 22 Oct 2026). Every plan, API rates, India rupee prices, and whether it is free."
date: 2026-09-10
updated: 2026-10-22
category: concepts
categoryLabel: Concepts
type: Non-technical
primaryKeyword: "claude code pricing"
secondaryKeywords: ["how much does claude code cost", "is claude code free", "claude code free", "claude code cost per month", "claude code api pricing", "claude code price india", "claude code pricing india", "claude code cost india"]
tags: ["Concepts", "Cost", "Claude Code", "Getting Started"]
faq:
  - q: "Is Claude Code free?"
    a: "No. As of 22 Oct 2026 the free Claude plan does not include Claude Code; it starts on Claude Pro at $20 a month (claude.com/pricing). The only $0 routes are the small trial credit a new Claude Console API account gets, and Anthropic's Claude for Open Source program, which gives eligible maintainers six months of Max 20x."
  - q: "How much does Claude Code cost per month?"
    a: "$17 to $200 a month for one person on a subscription, checked 22 Oct 2026: Pro is $20 billed monthly or $17 billed annually, Max is $100 (5x) or $200 (20x). On an API key there is no monthly fee; Anthropic's cost docs put the average enterprise developer at $150 to $250 a month."
  - q: "Do Claude Code and Claude chat share the same usage limit?"
    a: "Yes. On Pro and Max, all activity in Claude and Claude Code counts against the same limits, according to Anthropic's help article on using Claude Code with Pro or Max (checked 22 Oct 2026). A long chat in the afternoon leaves less room for coding in the same five hour window."
  - q: "Is the API cheaper than a subscription for Claude Code?"
    a: "For light or occasional use, usually yes, because you pay only for the tokens you use. For daily use a subscription is almost always cheaper: Anthropic's cost docs, checked 22 Oct 2026, put the average enterprise developer on the API at about $13 per active day, which passes the $100 Max 5x price in eight working days."
  - q: "Does Claude Code cost less in India?"
    a: "A TechCrunch report of 13 Jul 2026 said rupee prices had begun to appear for some users in India, with Pro at ₹2,000 a month billed annually and Max from ₹11,999, taxes included. Anthropic did not comment on the rollout, so check the price your own account sees at checkout."
  - q: "How do I see what Claude Code is spending?"
    a: "Run /usage inside Claude Code. On an API key it shows a session cost estimate at list price; on paid plans it shows plan usage bars and a breakdown by skills, subagents, plugins and MCP servers. The Claude Console usage page is the authoritative bill for API users (code.claude.com/docs/en/costs, checked 22 Oct 2026)."
---

As of 22 Oct 2026, Claude Code pricing starts at $20 a month with Claude Pro ($17 a month billed annually), and every paid plan above it includes Claude Code. The free plan does not. In India, a July 2026 TechCrunch report put Pro at ₹2,000 a month billed annually; check the price your own account sees at checkout.

For light use, the cheapest way in is an API key billed per token. If you run several sessions at once, [Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer, on the subscription or API key you already pay for.

## What are all the ways to pay for Claude Code?

There are nine. Prices are in US dollars from [claude.com/pricing](https://claude.com/pricing), checked 22 Oct 2026, unless the row says otherwise.

| Way to pay | Price (checked 22 Oct 2026) | Includes Claude Code | Usage you get |
|---|---|---|---|
| Free | $0 | No | Chat only |
| Pro | $20 a month, or $17 billed annually | Yes | Five hour window plus a weekly cap, shared with chat |
| Max 5x | $100 a month (Anthropic Max help article) | Yes | Five times Pro, plus a weekly cap |
| Max 20x | $200 a month (Anthropic Max help article) | Yes | Twenty times Pro, plus a weekly cap |
| Team Standard seat | $25 a seat monthly, $20 billed annually | Yes | More usage than Pro |
| Team Premium seat | $125 a seat monthly, $100 billed annually | Yes | Five times a Standard seat |
| Enterprise | $20 a seat a month billed annually, 20 seat minimum | Yes | Usage billed at API rates on top |
| API key (Claude Console) | Per token, see below | Yes | No plan cap; rate limits by tier |
| Usage credits on Pro or Max | API rates, past your plan limit | Yes | Up to an optional monthly spend limit |

Inside Claude Code, `/usage-credits` opens the spend limit setting ([Claude Code cost docs](https://code.claude.com/docs/en/costs), checked 22 Oct 2026). The pricing page also lists $100 to $200 a month in Claude Platform API credits on Max, and up to $500 a month pooled on Team (checked 22 Oct 2026).

{% img "note-1" %}

## Is Claude Code free?

No. claude.com/pricing lists Claude Code from Pro upward, not on the free plan (checked 22 Oct 2026). What does exist:

* **API trial credit.** Anthropic's pricing docs say new API users "receive a small amount of free credits to test the API", with no amount given (checked 22 Oct 2026).
* **Claude for Open Source.** Qualifying maintainers (for example 200,000 combined monthly downloads) can apply for six months of Max 20x at no cost, per claude.com/contact-sales/claude-for-oss, checked 22 Oct 2026.
* **A local model.** Claude Code can use a model in Ollama, which costs nothing per token. Our guide on [connecting Ollama to Claude Code](/blog/how-to-connect-ollama-to-claude-code/) covers the setup and what stops working.

Cloud sessions (Claude Code on the web) count toward your plan's usage limits, with "no separate charge for the cloud VM" ([cloud session docs](https://code.claude.com/docs/en/claude-code-on-the-web), checked 22 Oct 2026). The $100 and $250 cloud session credits Anthropic gave Pro and Max subscribers on 23 Sep 2026 had to be claimed by 7 Oct 2026 and expire on 4 Nov 2026 (BleepingComputer, 25 Sep 2026).

## What does Claude Code cost in India?

Pro is ₹2,000 a month billed annually and Max starts at ₹11,999 a month, taxes included, according to TechCrunch's report of 13 Jul 2026 on Anthropic's rupee rollout. Team seats started at ₹2,399 in that July 2026 report. Anthropic did not respond to TechCrunch, and claude.com/pricing showed US dollar prices when we checked it from outside India on 22 Oct 2026, so check the price your own account sees at checkout. Anthropic's API pricing docs list prices in US dollars only (checked 22 Oct 2026).

## How much does Claude Code cost on the API?

It depends on the model, from $0.10 to $10 per million input tokens as of 22 Oct 2026, per Anthropic's [pricing docs](https://platform.claude.com/docs/en/about-claude/pricing):

| Model | Claude Code alias | Input | Output | Cache hit |
|---|---|---|---|---|
| Claude Fable 5.1 | `fable` | $10 | $50 | $0.25 |
| Claude Opus 5.5 | `opus`, the default | $4 | $20 | $0.20 |
| Claude Sonnet 5.5 | `sonnet` | $2 | $10 | $0.10 |
| Claude Haiku 5.5 | `haiku` | $0.10 | $0.50 | $0.01 |

On the Anthropic API the `haiku` alias now points to Haiku 5.5, and Opus 5.5 is the default on every plan; Fable never is ([model configuration docs](https://code.claude.com/docs/en/model-config), checked 22 Oct 2026). As of 22 Oct 2026, Haiku 5.5 prompts over 100,000 tokens cost $0.50 in and $2.50 out, and Opus 5.5 and Sonnet 5.5 cache hits cost 5% of the input price, which matters because Claude Code rereads your conversation from cache every turn.

For a monthly figure, Anthropic's cost docs (checked 22 Oct 2026) say enterprise deployments average about $13 per developer per active day and $150 to $250 per developer per month, with 90% of users under $30 per active day.

## Is a subscription or the API cheaper for Claude Code?

A subscription, if you use Claude Code most working days. At Anthropic's $13 per active day average (cost docs, checked 22 Oct 2026), the API passes the $20 Pro price in two days and the $100 Max 5x price in eight. The API wins when you code with Claude a few times a month, or run Claude Code in CI. Our breakdown of [whether Claude Code Max is worth it](/blog/is-claude-code-max-worth-it/) runs that sum for you, and our [Max plan guide](/blog/claude-code-max-plan-tips/) covers weekly limits.

## How do you keep Claude Code costs down?

Pick the model on purpose and keep context small. From Anthropic's cost docs, checked 22 Oct 2026:

* Use `/model sonnet` for everyday edits, and set `model: haiku` on subagents that only search or summarise.
* Run `/clear` between unrelated tasks. `/clear` costs nothing; `/compact` reads the whole conversation, so it is a large request.
* Keep `CLAUDE.md` under 200 lines and move workflow instructions into skills, which load only when used.
* Lower `/effort` for routine work. Thinking tokens are billed as output tokens.
* Check `/usage`. On paid plans it flags any habit behind 10% or more of your recent usage (Oct 2026).

## What happens to the bill when you run several agents?

It multiplies. Each agent has its own context window, all drawing on the same plan or API key. Anthropic's cost docs (checked 22 Oct 2026) say agent teams in plan mode use about 7 times the tokens of a single session.

{% img "note-2" %}

Claude Code's own guard, `--max-budget-usd`, works in print mode only, according to the [CLI reference](https://code.claude.com/docs/en/cli-reference) (checked 22 Oct 2026), so it covers scripted runs, not interactive sessions. Munder Difflin has guards across the whole team: token limits per period (every 5 hours, daily, weekly or monthly) for the office and for each agent, and a circuit breaker that steers, then constrains, then stops an agent that loops, storms errors or blows its budget. None of this changes what Anthropic charges. Our [multi agent cost playbook](/blog/the-multi-agent-cost-playbook/) covers other levers.

Anthropic revises these numbers often, so check [claude.com/pricing](https://claude.com/pricing) before you commit a team to a plan.
