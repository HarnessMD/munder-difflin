---
title: "Codex vs Claude Code: Plans, Limits and Computer Use (Oct 2026)"
description: "Codex vs Claude Code, checked 27 Oct 2026: both CLIs need a $20 a month plan billed monthly. Plans, usage limits, computer use and AGENTS.md compared."
date: 2026-09-10
updated: 2026-10-27
category: comparisons
categoryLabel: Comparisons
type: Technical
primaryKeyword: "codex vs claude code"
secondaryKeywords: ["claude code vs codex", "codex cli vs claude code", "codex vs claude code usage limits", "codex vs claude code computer use", "is codex cli free", "does claude code read agents md"]
tags: ["Comparisons", "Claude Code", "Codex", "Multi-Agent", "Engines"]
faq:
  - q: "Is Codex better than Claude Code?"
    a: "Neither wins outright as of 27 Oct 2026. Codex is the better fit if you want to try it free in the desktop app, limits published per model, and computer use that can run in the background on a Mac. Claude Code is the better fit if you want Opus 5.5 as the default model and computer use from inside the CLI on a Pro or Max plan."
  - q: "Is Codex CLI free?"
    a: "No. The Free ($0) and Go ($8 a month) cards on OpenAI's Codex pricing page list GPT-6 Luna in the desktop app only, subject to rollout. Plus ($20 a month) is the first card that lists the CLI, or you can use an API key billed at API rates. Checked 27 Oct 2026. Claude Code is not on Claude's Free plan either; it starts at Pro."
  - q: "Which has higher usage limits, Codex or Claude Code?"
    a: "Only Codex can be compared on paper, because OpenAI publishes estimated messages per five hours for each model on Plus and Anthropic does not. The heavy plans are built differently: OpenAI sells Pro at $100, $200 or $500 a month with no five hour limit for now, and Anthropic sells Max 5x at $100 and Max 20x at $200, five and 20 times Pro's per session usage (checked 27 Oct 2026)."
  - q: "Does Claude Code read AGENTS.md?"
    a: "Yes, with a catch. Claude Code's memory docs, checked 27 Oct 2026, say it reads AGENTS.md by default only when there is no CLAUDE.md or CLAUDE.local.md in the working directory or above it. If one exists, it reads the CLAUDE.md files only, unless that file imports AGENTS.md or you change the Project instructions setting. It needs Claude Code v2.1.277 or later."
  - q: "Does Codex CLI have computer use?"
    a: "Not that OpenAI documents. OpenAI's docs put Computer Use in the ChatGPT desktop app, with ChatGPT Work and Codex, on macOS and Windows in supported regions, checked 27 Oct 2026. Claude Code has it inside the CLI, but only on macOS, as a research preview on Pro and Max plans."
  - q: "Can I run Codex and Claude Code together?"
    a: "Yes. Munder Difflin is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. You choose the engine per agent, so Codex and Claude Code agents can work side by side."
---

The Codex CLI and Claude Code both need a $20 a month plan, billed monthly, in October 2026, so your plan should decide: pick Codex for a free desktop tier, limits published per model and background computer use on a Mac; pick Claude Code for Opus 5.5 by default and computer use inside the terminal.

You can also skip the choice. [Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer, with Codex and Claude Code among its engines. Everything below was checked on 27 Oct 2026 against each vendor's own pricing pages and docs.

## Codex vs Claude Code at a glance (checked 27 Oct 2026)

| | Codex (OpenAI) | Claude Code (Anthropic) |
|:--|:--|:--|
| Source | CLI is Apache 2.0 on GitHub | Closed; the repo says use is subject to Anthropic's Commercial Terms |
| Models | GPT-6 Astra, GPT-6.1 Sol, GPT-6.1 Terra, GPT-6 Sol, GPT-6 Luna, and the GPT-5.6 family | Opus 5.5 by default on the Anthropic API, plus Sonnet 5.5 and Haiku 5.5 |
| First plan that lists the CLI | Plus, $20 a month (the Free and Go cards list the desktop app only) | Pro, $20 a month |
| Heavy plans | Pro at $100, $200 or $500 a month; Ultrafast mode on Pro $500 only | Max 5x at $100, Max 20x at $200 |
| Limits | Published ranges per model per five hours on Plus, weekly limits may apply, credits after | Per session usage plus a weekly limit, no published message counts |
| Computer use | ChatGPT desktop app on macOS and Windows, background on macOS; OpenAI's docs list no CLI support | In the CLI on macOS, research preview, Pro and Max only |
| Project instructions | `AGENTS.md` | `CLAUDE.md`; reads `AGENTS.md` only when no `CLAUDE.md` exists, by default |

Sources: OpenAI's [Codex pricing page](https://learn.chatgpt.com/docs/pricing), Anthropic's [Max plan article](https://support.claude.com/en/articles/11049741-what-is-the-max-plan) and Claude Code's [model configuration docs](https://code.claude.com/docs/en/model-config), all read 27 Oct 2026.

## Which one has higher usage limits, Codex or Claude Code?

Only Codex lets you compare on paper, because OpenAI publishes estimated local messages per five hours for each model and Anthropic publishes none. OpenAI's pricing page, read 27 Oct 2026, lists these ranges for Plus and says Pro plans currently have no five hour limit:

| Model | Plus, local messages per five hours |
|:--|:--|
| GPT-6 Astra | 5 to 45 |
| GPT-6.1 Sol | 15 to 160 |
| GPT-6.1 Terra | 35 to 285 |
| GPT-6 Sol | 15 to 150 |
| GPT-6 Luna | 350 to 3,000 |

The same page says these are estimates, not fixed limits, that weekly limits may also apply, and that Plus and Pro users who reach their limit can buy credits. A long Astra session lands near the bottom of its range.

Anthropic describes its limits as multipliers instead. Its Max plan article, read 27 Oct 2026, says Max 5x includes five times the Pro plan's per session usage and Max 20x includes 20 times. Claude Code and the Claude apps share one pool, so a long chat eats into your coding time. Our [Claude Code Max plan tips](/blog/claude-code-max-plan-tips/) cover how to stretch it, and the [Codex Max plan tips](/blog/codex-max-plan-tips/) do the same for OpenAI's side.

So the tiers do not line up one to one. On 27 Oct 2026 OpenAI had three Pro prices, $100, $200 and $500 a month, and only Pro $500 gets Ultrafast mode. Anthropic had two Max prices on 27 Oct 2026, $100 and $200. If you burn through either, step up, buy credits, or use an API key.

## Does Codex or Claude Code have better computer use?

Codex does more on a Mac, and Claude Code is the only one of the two that does it from the terminal. OpenAI's [Computer Use docs](https://learn.chatgpt.com/docs/computer-use), read 27 Oct 2026, put the feature in the ChatGPT desktop app with ChatGPT Work and Codex, on macOS and Windows, in supported regions, as a plugin you install. On macOS it can run a scoped task in the background while you keep working. On Windows the target app has to stay visible on the active desktop.

Claude Code's [computer use docs](https://code.claude.com/docs/en/computer-use), read the same day, call it "a research preview on macOS that requires a Pro or Max plan", not on Team or Enterprise, and not with the `-p` flag. Only one session can hold the screen at a time. If you want an agent clicking through your app while you type in another window, Codex's desktop app is the better fit. If you want the agent that just wrote the Swift to launch it and click every button in the same terminal session, that is Claude Code.

{% img "note-1" %}

## Does Claude Code read `AGENTS.md`?

Yes, but only when there is no `CLAUDE.md`, by default. Claude Code's [memory docs](https://code.claude.com/docs/en/memory), read 27 Oct 2026, say it reads `AGENTS.md` when there is no `CLAUDE.md` or `CLAUDE.local.md` in your working directory or above it. If one exists, it reads your `CLAUDE.md` files only. To share one file, import `AGENTS.md` from `CLAUDE.md`, or change the Project instructions setting. Direct reading needs Claude Code v2.1.277 or later. Codex reads `AGENTS.md` before doing any work, so a repo with only an `AGENTS.md` briefs both agents.

## Is Codex CLI free?

No: the Free and Go cards list the desktop app, not the CLI. OpenAI's pricing page, read 27 Oct 2026, lists Free at $0 and Go at $8 a month, both with GPT-6 Luna in the desktop app subject to rollout, and Plus at $20 a month for Codex on the web, in the CLI, in the IDE extension and on iOS. You can also run the CLI on an API key and pay API rates. Claude Code is not on Claude's Free plan; it starts at Pro.

{% img "note-2" %}

## Pick Codex if..., pick Claude Code if...

**Pick Codex if:**
* You want to try Codex free in the desktop app before you pay.
* You like knowing roughly how many messages each model buys you per five hours.
* You want computer use that runs in the background on a Mac.
* You want to read the CLI's source (Apache 2.0).

**Pick Claude Code if:**
* You want Opus 5.5 as your default model without touching settings.
* You want the agent to drive native apps and simulators from the same terminal session.
* You already pay for Claude and want chat and coding on one plan.

If you are still choosing between whole categories of tools, the [multi agent tools roundup](/blog/best-claude-code-multi-agent-tools/) is the wider map, and [Claude Code vs Antigravity](/blog/claude-code-vs-antigravity/) covers Google's agent.

## Can you run Codex and Claude Code together?

Yes, and for a lot of teams that is the honest answer. In Munder Difflin you pick the engine per agent, Claude Code or Codex among others, and each one runs as a real terminal process on the same floor. A Codex agent can take the UI bug while a Claude Code agent takes the refactor, and other agents can handle research, writing or ops. When one plan hits its weekly limit, the other keeps working.
