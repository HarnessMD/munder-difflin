---
title: "Gemini CLI vs Claude Code: price, licence, models"
seoTitle: "Gemini CLI vs Claude Code: Price, Licence, Models (Oct 2026)"
description: "Gemini CLI vs Claude Code, checked 7 Oct 2026: whether Gemini CLI is still free, what each costs, licence, models, features and who should pick which."
date: 2026-10-07
category: comparisons
categoryLabel: Comparisons
type: Technical
primaryKeyword: "gemini cli vs claude code"
secondaryKeywords: ["claude code vs gemini cli", "gemini cli or claude code", "is gemini cli free", "gemini cli pricing", "gemini cli vs claude code pricing"]
tags: ["Comparisons", "Claude Code", "Gemini CLI", "CLI Agents", "Engines"]
faq:
  - q: "Is Gemini CLI free?"
    a: "The software is free under Apache 2.0, but free use of Google's models in it is not something to count on. Google's notice of 19 May 2026 said Gemini CLI would stop serving requests for Google AI Pro and Ultra, and for people using it free of charge, on 18 Jun 2026. The README still listed a free tier when we read it on 7 Oct 2026."
  - q: "Is Gemini CLI or Claude Code cheaper?"
    a: "It depends on how you pay. Claude Code comes with Claude Pro at $20 a month billed monthly (claude.com/pricing, 7 Oct 2026). Gemini CLI has no plan of its own for individuals now, so you pay per token on a Gemini API key: Gemini 2.5 Pro was $1.25 in and $10.00 out per 1M tokens for prompts up to 200k tokens on Google's pricing page that day."
  - q: "Is Claude Code open source like Gemini CLI?"
    a: "No. The GitHub API listed Gemini CLI as Apache 2.0 on 7 Oct 2026. Claude Code's LICENSE.md read \"© Anthropic PBC. All rights reserved.\" on the same day."
  - q: "Can Gemini CLI run Claude models, or Claude Code run Gemini?"
    a: "Neither tool's docs list the other maker's models. Gemini CLI's model page names Gemini 3 and Gemini 2.5 models. Claude Code's model docs name Fable, Opus, Sonnet and Haiku aliases. Both pages checked 7 Oct 2026."
  - q: "Can I use Gemini CLI and Claude Code together?"
    a: "Yes. They are separate programs with separate sign ins, and both can be installed on one machine. Claude Code's docs say it can read an AGENTS.md file, and Gemini CLI's docs say its context file name can be set to AGENTS.md, so one instruction file can serve both."
---

Our view: pick Claude Code if you want a flat monthly plan, and Gemini CLI if you want an Apache 2.0 tool on a paid Gemini API key. Google said Gemini CLI would stop serving free, Google AI Pro and Ultra users on 18 Jun 2026. Checked 7 Oct 2026.

This sits in our [Comparisons hub](/blog/topics/comparisons/). For setup, read [how to install Gemini CLI](/blog/how-to-install-gemini-cli/). For OpenAI's tool, read [Codex vs Claude Code](/blog/codex-cli-vs-claude-code/).

## What are Gemini CLI and Claude Code?

Both are coding agents you run in a terminal, one from Google and one from Anthropic. The [Gemini CLI repo](https://github.com/google-gemini/gemini-cli) calls it "an open-source AI agent that brings the power of Gemini directly into your terminal". The [Claude Code docs](https://code.claude.com/docs/en/overview) call it "an agentic coding tool that reads your codebase, edits files, runs commands, and integrates with your development tools", available in "your terminal, IDE, desktop app, and browser".

Both shipped a release the day before we checked. The GitHub API (`gh api repos/google-gemini/gemini-cli/releases/latest`, and the same call for `anthropics/claude-code`) showed Gemini CLI v0.63.0 and Claude Code v2.1.292, both published 6 Oct 2026 (UTC).

## Is Gemini CLI still free?

No, not if you go by Google's own notice. The [transition notice](https://github.com/google-gemini/gemini-cli/discussions/27274), posted on 19 May 2026, says: "On June 18, 2026, Gemini CLI will stop serving requests for Google AI Pro and Ultra, as well as those using it free of charge. These tiers are now supported via Antigravity CLI."

The same notice says what stays. Access through a Gemini Code Assist Standard or Enterprise licence, or through Google Cloud, "remains fully supported". Gemini CLI "will also remain accessible via paid Gemini and Gemini Enterprise Agent Platform API keys".

<figure class="mg" data-scene="calendar"><img src="/blog/assets/media/gemini-cli-vs-claude-code/calendar.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A wall calendar shows a page for 18 Jun 2026. The page tears off and floats down. Three cards pinned beside it, marked free of charge, Google AI Pro and Ultra, slide off along an arrow to a second board headed Antigravity CLI. Two cards, marked paid API key and Code Assist licence, stay pinned."><figcaption>Google's notice set 18 Jun 2026 for free, Google AI Pro and Ultra users. Paid keys and work licences stay. Notice read 7 Oct 2026.</figcaption></figure>

The README has not caught up. As of 7 Oct 2026 it still listed "60 requests/min and 1,000 requests/day" for a Google account sign in. The notice is the later document and names free use directly, and the [Gemini CLI docs](https://geminicli.com/docs/) carry a banner: "Unpaid tier and Google One users: Gemini CLI was replaced by Antigravity CLI on June 18th, 2026."

One loose end: the [quota page](https://geminicli.com/docs/resources/quota-and-pricing/) still lists an unpaid API key tier of 250 requests a day, "Flash model only". The notice promises paid keys and nothing else. We think you should plan on paying.

## What does each one cost?

Claude Code comes with a Claude subscription or an API key, and Gemini CLI is now pay per token or a work licence. These rows are our selection, from [claude.com/pricing](https://claude.com/pricing), the [Gemini API pricing page](https://ai.google.dev/gemini-api/docs/pricing) and Google's notice, all read on 7 Oct 2026. Prices are in US dollars.

| | Gemini CLI | Claude Code |
| --- | --- | --- |
| Free use | Ended 18 Jun 2026, per Google's notice | Not listed on the Free plan |
| Individual plan | Google AI Pro and Ultra now go through Antigravity CLI | Pro: $20 a month, or $17 a month billed annually |
| Higher plan | No individual plan in the notice | Max: from $100 a month |
| Team | Gemini Code Assist Standard or Enterprise licence | Team standard seat: $25 a month, or $20 billed annually |
| API, top row | Gemini 2.5 Pro: $1.25 in, $10.00 out per 1M tokens (prompts up to 200k tokens) | Opus 5.5: $4 in, $20 out per 1M tokens |
| API, lower row | Gemini 2.5 Flash: $0.30 in, $2.50 out per 1M tokens | Sonnet 5.5: $2 in, $10 out per 1M tokens |

Per token prices do not tell you which tool is cheaper for a task. Nobody here has measured how many tokens each one uses. The Max card says you "choose 5x or 20x more usage than Pro". [How much Claude Code costs](/blog/how-much-does-claude-code-cost/) covers the limits.

<figure class="mg" data-scene="bucket"><img src="/blog/assets/media/gemini-cli-vs-claude-code/bucket.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On the left, under Gemini CLI, a garden tap drips into a bucket and a tally slip below it gains a mark with every drop, labelled pay per token. On the right, under Claude Code, a bucket marked Pro, $20 a month, arrives already filled to a line and the level slowly drops as it is used. A tap button on the left adds one more drop and one more tally mark."><figcaption>Pay per token on a paid Gemini key, or Claude Pro at $20 a month billed monthly, per both pricing pages on 7 Oct 2026.</figcaption></figure>

## Which one is open source?

Gemini CLI is, and Claude Code is not. The GitHub API listed Gemini CLI as Apache-2.0 on 7 Oct 2026, and Google's notice says the project "remains available to the community as an Apache 2.0 licensed repository with no changes".

Claude Code's [LICENSE.md](https://github.com/anthropics/claude-code/blob/main/LICENSE.md) is one line: "© Anthropic PBC. All rights reserved. Use is subject to Anthropic's Commercial Terms of Service." We go through that in [is Claude Code open source](/blog/is-claude-code-open-source/).

## Which models does each one run?

Each one's docs list its own maker's models. The [Gemini CLI model page](https://geminicli.com/docs/cli/model/) offers two automatic settings: Gemini 3, which picks between `gemini-3-pro-preview` and `gemini-3-flash-preview`, and Gemini 2.5, which picks between `gemini-2.5-pro` and `gemini-2.5-flash`.

The [Claude Code model docs](https://code.claude.com/docs/en/model-config) list the aliases `fable`, `opus`, `sonnet` and `haiku`. On the Anthropic API, `opus` resolves to Opus 5.5 and `sonnet` to Sonnet 5.5, and the default on Pro, Max, Team, Enterprise and the Anthropic API is Opus 5.5.

<figure class="mg" data-scene="books"><img src="/blog/assets/media/gemini-cli-vs-claude-code/books.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. Two short shelves, each held by a pair of bookends. On the Gemini CLI shelf four books slide in one by one, with spines reading gemini-3-pro-preview, gemini-3-flash-preview, gemini-2.5-pro and gemini-2.5-flash. On the Claude Code shelf four books slide in, with spines reading fable, opus, sonnet and haiku. Tapping a book tips it forward."><figcaption>Four model names from each tool's model docs. Checked 7 Oct 2026.</figcaption></figure>

## Which features differ?

Fewer than you might expect, going by the docs. Both sets of docs describe MCP servers, hooks, subagents and a plan mode you enter with `Shift+Tab` or `/plan`. The [Gemini CLI plan mode page](https://geminicli.com/docs/cli/plan-mode/) calls it "a read-only environment", and [Claude Code's permission docs](https://code.claude.com/docs/en/permission-modes) say plan mode has Claude "research and propose changes without making them".

The differences we could source:

- **Instruction file.** Gemini CLI reads `GEMINI.md`, and its [context file docs](https://geminicli.com/docs/cli/gemini-md/) say `context.fileName` can add names such as `AGENTS.md`. Claude Code reads `CLAUDE.md` and can read an `AGENTS.md` in its place.
- **Where it runs.** Claude Code's docs list the terminal, IDE extensions, a desktop app and the web. Gemini CLI's README describes a terminal tool and a GitHub Action.
- **Built in extras.** Gemini CLI's README lists Google Search grounding, conversation checkpointing and sandboxing. Claude Code's overview lists skills, auto memory and scheduled tasks.

We have not run a benchmark between them, so we are not ranking quality or speed.

## Who should pick which?

Our view: it comes down to how you want to pay and whether the licence matters to you.

<figure class="mg" data-scene="umbrellas"><img src="/blog/assets/media/gemini-cli-vs-claude-code/umbrellas.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. Two closed umbrellas stand in a stand. The Gemini CLI umbrella opens to show three panels reading Apache 2.0, paid API key and work licence. The Claude Code umbrella opens to show three panels reading monthly plan, web and desktop app. Each umbrella sways gently once it is open."><figcaption>Our view of who each tool suits, from the sources above. Checked 7 Oct 2026.</figcaption></figure>

- **Gemini CLI** if you need an Apache 2.0 tool, already pay for a Gemini API key, or your company holds a Gemini Code Assist licence.
- **Claude Code** if you want one monthly price, or want the same tool in a desktop app and the browser.
- **On Google AI Pro or Ultra:** neither. Google's notice points you to Antigravity CLI.

More options are in [Claude Code alternatives](/blog/claude-code-alternatives/) and [best AI coding agents](/blog/best-ai-coding-agents/).

## Can you run both?

Yes. They are separate programs with separate sign ins, so both can live on one machine. To run them side by side there is [Munder Difflin](https://harnessmd.com/download), free and open source: a desktop app that runs a team of coding agents such as Claude Code, Codex and Gemini CLI on your own computer. See [how to install and use Munder Difflin](/blog/how-to-install-and-use-munder-difflin/).

<link rel="stylesheet" href="/blog/assets/media/gemini-cli-vs-claude-code/motion.css"><script defer src="/blog/assets/media/gemini-cli-vs-claude-code/motion.js"></script>
