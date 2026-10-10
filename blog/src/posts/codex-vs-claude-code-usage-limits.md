---
title: "Codex Usage Limits vs Claude Code: What Each Plan Gives You"
seoTitle: "Codex Usage Limits vs Claude Code Usage Limits (Oct 2026)"
description: "Codex usage limits vs Claude Code usage limits, checked 10 Oct 2026: the five hour window, weekly limits, credits and how to check usage on each plan."
date: 2026-10-10
category: comparisons
categoryLabel: Comparisons
type: Non-technical
primaryKeyword: "codex usage limits"
secondaryKeywords: ["codex limits", "claude code usage limits", "codex rate limits", "claude code weekly limit", "codex vs claude code limits"]
tags: ["Comparisons", "Codex", "Claude Code", "Usage Limits", "Cost"]
faq:
  - q: "What are the Codex usage limits on ChatGPT Plus?"
    a: "OpenAI publishes estimates, not fixed caps. On 10 Oct 2026 its Codex pricing page estimated 5 to 45 local messages per five hours on GPT-6 Astra, 15 to 160 on GPT-6.1 Sol, 15 to 150 on GPT-6 Sol and 350 to 3,000 on GPT-6 Luna for Plus, and said weekly limits may also apply."
  - q: "Does Claude Code have a weekly limit?"
    a: "Yes. Anthropic's help article on Claude Code, checked 10 Oct 2026, says both Pro and Max plans have a five hour session limit and a weekly limit, and that Max plans also have a separate weekly limit for Fable. Anthropic gives no number for either limit."
  - q: "Which runs out first, Codex or Claude Code?"
    a: "No page we opened says, and we ran no test. OpenAI publishes message estimates for Plus. Anthropic publishes multipliers and no counts, so the two cannot be compared on paper. Checked 10 Oct 2026."
  - q: "How do I check my Codex or Claude Code usage?"
    a: "In Codex, type /status in an active CLI session or open the usage dashboard at chatgpt.com/codex/settings/usage. In Claude Code, run /usage to see your plan limits and when they reset. Both come from each vendor's own docs, checked 10 Oct 2026."
  - q: "What happens when I hit a limit in Codex or Claude Code?"
    a: "Codex can finish the turn in progress, subject to fair use limits, and Plus and Pro users can buy credits. Claude Code blocks further requests until the reset time in the message, unless you turn on usage credits in Settings > Usage, which are billed at standard API rates."
---

On paper you can count only the Codex limits: OpenAI publishes estimated messages per five hours for ChatGPT Plus, while Anthropic publishes multipliers for Claude Code and no counts. Checked 10 Oct 2026.

This page is one of our [Comparisons](/blog/topics/comparisons/). If you use both tools, [Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of coding agents such as Claude Code, Codex and Gemini CLI on your own computer. It fits when you run both plans. Setup is in [how to install and use Munder Difflin](/blog/how-to-install-and-use-munder-difflin/).

## Codex vs Claude Code usage limits at a glance (checked 10 Oct 2026)

This table is our selection of rows from the vendor pages named under it, in US prices.

| Checked 10 Oct 2026 | Codex (OpenAI) | Claude Code (Anthropic) |
| --- | --- | --- |
| $20 plan | Plus, $20 a month | Pro, $20 billed monthly, $17 a month billed annually |
| Bigger plans | Pro from $100 a month, with $100, $200 and $500 tiers | Max 5x at $100 a month, Max 20x at $200 |
| Five hour window | Plus: estimated ranges per model. Pro plans "currently have no five-hour limit" | Pro and Max: a five hour session limit, no number given |
| Weekly limit | "Weekly limits may also apply", no number given | Pro and Max: a weekly limit, no number given. Max: a separate weekly limit for Fable |
| When you run out | The turn in progress can continue, subject to fair use limits | Requests are blocked until the reset time shown |
| Paying for more | Plus and Pro users can buy credits | Usage credits on Pro, Max 5x and Max 20x, turned on in Settings > Usage, at standard API rates |
| How to check | `/status` in the CLI, or the usage dashboard | `/usage` in Claude Code, or Settings > Usage |

Sources: OpenAI's [Codex pricing page](https://learn.chatgpt.com/docs/pricing), [claude.com/pricing](https://claude.com/pricing), Anthropic's help articles on [Claude Code with Pro or Max](https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan), the [Max plan](https://support.claude.com/en/articles/11049741-what-is-the-max-plan) and [usage credits](https://support.claude.com/en/articles/12429409-extra-usage-for-paid-claude-plans), and Claude Code's [cost docs](https://code.claude.com/docs/en/costs).

## What are the Codex usage limits?

Codex has no fixed message cap: OpenAI publishes estimates that move with the model and the task. Its pricing page said on 10 Oct 2026 that the number depends on the model, the size and complexity of the task, and whether it runs locally or in the cloud.

For Plus and Standard Business seats, the page estimated these local messages per five hours:

* GPT-6 Astra: 5 to 45
* GPT-6.1 Sol: 15 to 160
* GPT-6 Sol: 15 to 150
* GPT-6 Luna: 350 to 3,000

The same page says "Pro plans currently have no five-hour limit", that local messages and cloud chats share one allowance, and that "weekly limits may also apply". It gives no size for the weekly limit and no estimate for Free, Go or Pro. [Codex pricing](/blog/codex-pricing/) covers each plan.

<figure class="mg" data-scene="jugs"><img src="/blog/assets/media/codex-vs-claude-code-usage-limits/jugs.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. Four measuring jugs fill one after another to different heights. Each jug has a low mark and a high mark, and the water wobbles between the two without settling on one line."><figcaption>OpenAI publishes ranges, not fixed caps, for Plus. Codex pricing page, 10 Oct 2026. The drawing shows the ranges as jug marks.</figcaption></figure>

## What are the Claude Code usage limits?

Claude Code on Pro and Max has two limits, a five hour session limit and a weekly limit, and Anthropic puts no number on either. Its help article, checked 10 Oct 2026, says "Both Pro and Max plans have a five-hour session limit and a weekly limit", and that Max plans also have a separate weekly limit for Fable.

What Anthropic does publish is multipliers. Its pricing page said on 10 Oct 2026 that Max gives "5x or 20x more usage per 5-hour session than Pro". The Max plan article says the weekly limit applies across all models and resets at a fixed time each week that is assigned to your account.

Claude Code also shares its limits with the rest of your plan, per the pricing page. [Claude Code pricing](/blog/how-much-does-claude-code-cost/) has the plan prices.

<figure class="mg" data-scene="timers"><img src="/blog/assets/media/codex-vs-claude-code-usage-limits/timers.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A small sand timer and a large one run side by side. The small one empties and flips over again and again, while the large one drains slowly the whole time and never flips."><figcaption>Two limits run at once on Pro and Max: a five hour session limit and a weekly limit. Anthropic help article, 10 Oct 2026.</figcaption></figure>

## Which runs out first, Codex or Claude Code?

No page we opened says, and we ran no test. OpenAI gives message estimates for Plus. Anthropic gives multipliers of a Pro allowance it does not size. A count and a ratio cannot be compared.

Two things the sources do say. Pro plans in Codex currently have no five hour limit, so a weekly limit, if one applies, is the only one left. And Claude Code's [error docs](https://code.claude.com/docs/en/errors) warn that a burst of heavy activity "can exhaust the weekly allowance before the session window resets".

Our view: do not pick a tool on limits you cannot measure. Read your own meter for a week. See [Codex vs Claude Code](/blog/codex-cli-vs-claude-code/).

## How do you check your usage in each tool?

Type `/status` in Codex and `/usage` in Claude Code. OpenAI's pricing page says you can find your current limits in the usage dashboard at `chatgpt.com/codex/settings/usage`, and that `/status` shows your remaining limits during an active Codex CLI session.

Claude Code's error docs say to run `/usage` to see your plan limits and when they reset. The cost docs add that pressing `d` or `w` switches between the last 24 hours and the last 7 days. Anthropic's help article names `/status` for the same job, and the Max plan article points to Settings > Usage for your next reset time. Two vendors, three commands.

<figure class="mg" data-scene="dials"><img src="/blog/assets/media/codex-vs-claude-code-usage-limits/dials.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. Two round dials sit side by side, one labelled slash status and one labelled slash usage. A cloth lifts off each in turn and the needle swings up to show how much is left."><figcaption>/status in the Codex CLI, /usage in Claude Code. Each vendor's docs, 10 Oct 2026.</figcaption></figure>

## What do you do when you hit a limit?

Wait for the reset, pay for more, or move up a plan. In Codex, the pricing page says that if you reach your limits during an active turn, the agent can keep working on that turn, subject to fair use limits. After that, ChatGPT Plus and Pro users can buy credits without changing plan.

In Claude Code, the error docs say it blocks further requests until the reset time shown in the message. Those two limits are shared across all models, so switching models does not restore access. For Pro and Max, Anthropic's help article lists four options:

1. Wait for the limits to reset.
2. Turn on usage credits in Settings > Usage. Anthropic's usage credits article says they are billed at standard API rates, and you can set a monthly spend limit.
3. Move up to Max 5x, or from Max 5x to Max 20x.
4. Switch to the Claude Console and buy API credits.

## How do you stretch a plan?

Send less context per message, which is what both vendors' own tips come down to.

OpenAI's pricing page says to be precise with instructions, limit source material, reduce the size of your `AGENTS.md` and limit the number of MCP servers you use. Claude Code's cost docs say to `/clear` between unrelated tasks, use Sonnet for most coding tasks because it costs less than Opus, and aim to keep `CLAUDE.md` under 200 lines.

<figure class="mg" data-scene="suitcase"><img src="/blog/assets/media/codex-vs-claude-code-usage-limits/suitcase.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. An overstuffed suitcase will not close. Two bulky blocks lift out, two more shrink, and the lid then drops shut with room to spare."><figcaption>Both vendors' tips come down to carrying less context. Vendor docs, 10 Oct 2026. The drawing shows it as packing light.</figcaption></figure>

See our [Codex plan tips](/blog/codex-max-plan-tips/) and [Claude Code Max plan tips](/blog/claude-code-max-plan-tips/).

<link rel="stylesheet" href="/blog/assets/media/codex-vs-claude-code-usage-limits/motion.css"><script defer src="/blog/assets/media/codex-vs-claude-code-usage-limits/motion.js"></script>
