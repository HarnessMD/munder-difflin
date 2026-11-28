---
title: "Cursor Pricing (Oct 2026): Every Plan After the 12 Oct Change"
description: "Cursor pricing as of 26 Oct 2026: Free, Plus $8, Premium $30, Super $100, Ultra $200, Teams seats, what changed on 12 Oct and what old plans keep."
date: 2026-10-26
category: guides
categoryLabel: Guides
type: Non-technical
primaryKeyword: "cursor pricing"
secondaryKeywords: ["cursor plans", "cursor price", "is cursor free", "cursor pro price", "cursor x subscription", "cursor teams pricing", "cursor legacy plans", "cursor usage limits"]
tags: ["Guides", "Cursor", "Pricing", "Cost", "Engines"]
faq:
  - q: "How much does Cursor cost per month?"
    a: "As of 26 Oct 2026, Cursor's pricing page lists Free at $0, Plus at $8 a month, Premium at $30, Super at $100 and Ultra at $200. Cursor's docs list yearly billing at $80, $300, $1,000 and $2,000 for the four paid plans. Teams seats cost $30, $100 or $200 a month and Enterprise is custom. Prices exclude tax."
  - q: "Is Cursor free?"
    a: "Yes, with limits. The Free plan costs $0 and, per Cursor's pricing help page, includes Agent, Chat and Tab completions with Cursor's own models (Grok and Composer), with limited usage. It has no Cloud Agents and no third party models. Checked 26 Oct 2026."
  - q: "Can I keep my old Cursor Pro plan?"
    a: "Yes. Cursor's legacy plans docs say Hobby, Start, Pro, Pro+, Ultra and the old Teams seats keep working as they are, and switching to The X Subscription is optional. The switch is permanent, and new customers start on the new plans. Checked 26 Oct 2026."
  - q: "Does Cursor Plus include Claude or GPT models?"
    a: "No. Cursor's models and pricing docs say Plus runs Cursor's own models only, with no third party models and no use of your own API keys. Premium at $30 and above let you use third party models at API list price, paid from prepaid credit. Checked 26 Oct 2026."
  - q: "What does Cursor cost for a team?"
    a: "Teams seats cost $30, $100 or $200 a month each, matching Premium, Super and Ultra, per Cursor's docs on 26 Oct 2026. The old Teams seats were $40 and $120 a user. Teams and Enterprise also pay a Cursor Token Rate of $0.25 per million tokens on eligible third party model requests. Enterprise is priced by sales."
---

Cursor costs $0 on Free, $8 a month on Plus, $30 on Premium, $100 on Super and $200 on Ultra, and Teams seats cost $30, $100 or $200 each, as of 26 Oct 2026. Our view: Premium is the real starting plan for coding, because Plus runs Cursor's own models only.

If you run Cursor's CLI next to other agents, [Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer, and Cursor's `cursor-agent` is one of the engines it can run ([setup guide](/blog/how-to-install-and-use-munder-difflin/)).

## How much does Cursor cost?

Cursor costs $0 to $200 a month for one person, as of 26 Oct 2026. These rows come from Cursor's [models and pricing docs](https://cursor.com/docs/models-and-pricing) and [pricing page](https://cursor.com/pricing):

| Plan | Monthly (26 Oct 2026) | Yearly | Included usage | What it adds for coding |
| --- | --- | --- | --- | --- |
| Free | $0 | | Limited | Agent and Chat with limited usage |
| Plus | $8 | $80 | Base | Grok 4.7, Grok 4.6, Grok 4.5 and Composer 2.5 at fixed settings; no Cloud Agents, Bugbot or third party models |
| Premium | $30 | $300 | 4x Plus | Cloud Agents, Automations, Origin, Bugbot, third party models at API list price |
| Super | $100 | $1,000 | 15x Plus | Priority model access at peak times |
| Ultra | $200 | $2,000 | 50x Plus | Earliest access to new products and models |
| Teams | $30, $100 or $200 a seat | | Matches the seat's tier | SSO, central billing, usage analytics |
| Enterprise | Custom | | Pooled | SCIM, audit logs, invoice billing |

Cursor's models and pricing docs say "Prices exclude tax." Every paid plan also carries X perks, such as a checkmark and fewer ads, because Cursor is now sold with Grok and X. None of those perks helps with code. Cursor's pricing page advises: "Plus is recommended for social creators with limited AI usage."

<figure class="mg" data-scene="cups"><img src="/blog/assets/media/cursor-pricing/cups.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. Five clear measuring cups stand in a row on white, labelled Free, Plus, Premium, Super and Ultra, with price tags reading $0, $8, $30, $100 and $200. Blue water pours into each in turn and stops at a line: limited, base, 4x Plus, 15x Plus and 50x Plus. The Ultra cup fills last and nearly to the brim."><figcaption>Cursor's five individual plans and how much usage each holds, from Cursor's models and pricing docs on 26 Oct 2026. Tap a cup to fill it again.</figcaption></figure>

## What changed on 12 Oct 2026?

Cursor became part of The X Subscription, one plan for Grok, Grok Bot, Cursor and X Premium. Cursor's [forum announcement](https://forum.cursor.com/t/introducing-the-x-subscription/174450) of 12 Oct 2026 and its help pages list four changes for Cursor users:

* **One weekly pool.** Paid plans share one pool of usage for Cursor's own models across Grok and Cursor. It refreshes weekly, not monthly.
* **More usage on Cursor's models.** Cursor's forum post says each new plan includes "at least twice as much coding usage" with Grok models as the comparable old plan.
* **Third party models moved out.** Models like Claude or GPT now bill at API list price from prepaid credit, on Premium and above only.
* **Billing moved.** New plans are managed at `grok.com/dashboard/billing` instead of on Cursor's dashboard.

## What happened to the old Cursor plans?

They still work, and switching is optional. Cursor's [legacy plans docs](https://cursor.com/docs/account/pricing/legacy-cursor-plans) say "They keep working as they are." New customers start on the new plans. Cursor's own mapping on 26 Oct 2026:

| Legacy plan | Price | Comparable new plan |
| --- | --- | --- |
| Hobby | Free | Free |
| Start (India only) | ₹649 a month, tax inclusive | Plus |
| Pro | $20 a month | Premium ($30) |
| Pro+ | $60 a month | Super ($100) |
| Ultra | $200 a month | Ultra ($200) |
| Teams Standard | $40 a user a month | Premium seat ($30) |
| Teams Premium | $120 a user a month | Super seat ($100) |

Two catches. The switch is permanent, and the new plans drop "the included third-party model allowance". Legacy Pro still includes an Other Models pool for third party models; on Premium you pay for that use on top. Our view: if you live on Claude or GPT inside Cursor, do the sums before you switch.

Start is the only rupee plan Cursor lists, paid by UPI or Indian card, and it sits on the legacy list. Cursor's Hindi pricing page showed dollar prices when we opened it on 26 Oct 2026.

<figure class="mg" data-scene="points"><img src="/blog/assets/media/cursor-pricing/points.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A toy railway on white splits at a set of points. The straight track is labelled legacy plan and the branch is labelled The X Subscription. A small wagon labelled Pro rolls up and keeps going straight. A lever beside the points carries two tags, optional and permanent. When the lever is pulled, the next wagon takes the branch and a stop block drops behind it so it cannot roll back."><figcaption>Old Cursor plans keep working; switching to The X Subscription is optional and permanent. From Cursor's legacy plans docs, 26 Oct 2026. Pull the lever to send a wagon.</figcaption></figure>

## What do Teams and Enterprise cost?

As of 26 Oct 2026, Teams seats cost $30, $100 or $200 a month, matching Premium, Super and Ultra, and Enterprise is custom. The forum post says the new seats are "lower per seat" than the old ones. Teams adds SAML and OIDC SSO, central billing, usage analytics and mixed seat types. Cursor's docs add a Cursor Token Rate of $0.25 per million tokens on eligible third party model requests for Teams and Enterprise (26 Oct 2026); individual plans don't pay it.

## What happens when you run out of usage?

You buy top ups, wait for the weekly reset, or upgrade. Cursor's [usage charges help page](https://cursor.com/help/account-and-billing/overages) says top ups add prepaid credit. That credit pays for third party models from the first request, and for Cursor's models past your weekly pool "at the same per-model rates as included usage". Credit expires 365 days after purchase. Auto Top-up stays off until you turn it on, and a monthly additional usage limit caps the total. Legacy plans keep on demand usage, billed monthly in arrears at API rates.

<figure class="mg" data-scene="wallet"><img src="/blog/assets/media/cursor-pricing/wallet.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A round water tank labelled weekly pool sits on white beside an open wallet labelled prepaid credit. A tap draws water from the tank into a cup labelled Grok and Composer until the tank runs dry. Coins then slide out of the wallet into a second cup labelled third party models. A dial on the tank turns to a mark reading weekly reset and the tank fills again."><figcaption>Cursor's own models draw from a weekly pool; third party models and extra use come from prepaid credit that lasts 365 days. From Cursor's usage charges help page, 26 Oct 2026.</figcaption></figure>

## Is Cursor free?

Yes, with limits. The Free plan is $0 and gives Agent, Chat and Tab completions with Cursor's own models, according to Cursor's [pricing and plans help page](https://cursor.com/help/account-and-billing/pricing). It has no Cloud Agents and no third party models. There is no standing student discount: Cursor's [students page](https://cursor.com/students) says "Anyone can get started with Cursor for free" and points to campus promotions.

## How does Cursor compare with Claude Code, Codex and Copilot?

Cursor Plus and Codex Go tie as the cheapest paid plans of the four at $8, but Plus runs only Cursor's own models and Go covers only the Codex desktop app; Copilot Pro at $10 comes next (26 Oct 2026). Each row comes from the vendor's own page on 26 Oct 2026:

| Tool | Free plan | First paid plan | Higher individual plans |
| --- | --- | --- | --- |
| Cursor | Yes, limited | Plus $8; Premium $30 for third party models | Super $100, Ultra $200 |
| Claude Code | No | Claude Pro $20, or $17 a month billed annually | Max, from $100 |
| Codex | Yes, desktop app | Go $8, desktop app only; Plus $20, the first plan with the CLI | Pro at $100, $200 or $500 |
| GitHub Copilot | Yes, 2,000 completions a month | Pro $10 | Pro+ $39, Max $100 |

Sources: [Anthropic's pricing page](https://claude.com/pricing), OpenAI's [Codex pricing page](https://learn.chatgpt.com/docs/pricing) and GitHub's [Copilot plans page](https://github.com/features/copilot/plans). Our [Claude Code pricing](/blog/how-much-does-claude-code-cost/) and [Codex pricing](/blog/codex-pricing/) guides go row by row. For the tools themselves, see [Claude Code vs Cursor](/blog/claude-code-vs-cursor/), [Cursor vs Cline](/blog/cursor-vs-cline/) and our [Cursor alternatives](/blog/cursor-alternatives/).

<figure class="mg" data-scene="abacus"><img src="/blog/assets/media/cursor-pricing/abacus.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A wooden abacus stands on white with four rows labelled Cursor Premium, Claude Pro, Codex Plus and Copilot Pro. Beads slide across each row to a tag at the end: $30, $20, $20 and $10. A fifth row labelled Cursor Plus slides in below and stops at $8, with a small note reading own models only."><figcaption>A common starting plan for coding with each tool, plus Cursor Plus, from each vendor's pricing page on 26 Oct 2026. Tap Slide to count it again.</figcaption></figure>

<link rel="stylesheet" href="/blog/assets/media/cursor-pricing/motion.css"><script defer src="/blog/assets/media/cursor-pricing/motion.js"></script>
