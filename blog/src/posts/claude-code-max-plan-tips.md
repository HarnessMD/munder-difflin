---
title: "How to Get the Most Out of Your Claude Code Max Plan"
description: "Stretch a Claude Code Max plan: model choice, context hygiene, prompt caching, subagents and unattended runs, checked against Anthropic's own pages."
date: 2026-09-14
category: guides
categoryLabel: Guides
type: Technical
pinned: true
pinOrder: 3
primaryKeyword: "how to get the most out of claude max"
secondaryKeywords: ["how to make the most of claude max", "claude code max plan tips", "how to maximize claude code usage", "how to reduce claude code token usage", "claude code usage limit reset", "does claude code max have weekly limits"]
tags: ["Guides", "Claude Code", "Cost", "Workflow"]
faq:
  - q: "Does Claude Code Max have weekly limits?"
    a: "Yes. Every Max plan has a session limit that resets every five hours and a weekly limit across all models that resets at a fixed time assigned to your account, per Anthropic's Max plan article as checked on 14 Sep 2026. Claude chat, Claude Code and the IDE extensions all draw from the same allowance."
  - q: "Does Claude Code Max include Fable?"
    a: "Yes. Anthropic's help article on Fable, updated 2 Sep 2026, says Fable 5 and Fable 5.1 are a standard part of Max, and you can spend up to half of your weekly limit on them at no extra cost. That half is a ceiling inside the same weekly allowance, not extra room. Past it you either pay with usage credits or switch to another model."
  - q: "Is Claude Code Max unlimited?"
    a: "No. Max 5x and Max 20x give five or twenty times Pro's usage per session, and Anthropic says it may limit usage in other ways too. If you turn on usage credits, work past the limit is billed at standard API rates, so decline them if you want to stay inside what the plan includes."
  - q: "When does the Claude Code usage limit reset?"
    a: "The session limit resets every five hours and the weekly limit at a fixed day and time assigned to your account. Run /usage in Claude Code or open Settings > Usage on claude.ai to see both reset times. In an interactive session, Claude Code 2.1.234 and later can wait for a session reset and then continue the task on its own."
  - q: "Can you share a Claude Code Max plan?"
    a: "No. Anthropic's Consumer Terms say you may not share your login or make your account available to anyone else, and its Claude Code legal page says advertised Pro and Max limits assume ordinary, individual use. A team that needs shared capacity should look at Team seats or an API key instead."
---

To get the most out of Claude Max in Claude Code, spend the plan on work, not on rereading context. Pick the model per task, `/clear` between tasks, plan before big edits, keep sessions inside the one hour cache, and watch `/usage` so the weekly limit never surprises you. Anthropic's figures below were checked on 14 Sep 2026.

Prices are in our post on [what Claude Code costs](/blog/how-much-does-claude-code-cost/), and whether to upgrade at all is in [is it worth paying for Claude Code Max](/blog/is-claude-code-max-worth-it/), so this one sticks to using the plan well. If you already run more than one terminal, read [how to manage multiple Claude Code sessions](/blog/manage-multiple-claude-code-sessions/) too, because every extra session draws from the same allowance.

You can do all of this by hand, or use [Munder Difflin](https://harnessmd.com/download), a free and open source desktop app that runs your Claude Code agents on the login you already have. Give each agent its own model and token cap, schedule long jobs for when you are away, and watch every session from one screen. One tip first: in 0.5.2 the default agent model is Fable 5, which on Max can use at most half your weekly limit, so pick another default under Settings > Agents & Models.

## How do Claude Max usage limits work in Claude Code?

Two meters run at once: a session limit that resets every five hours, and a weekly limit. The weekly one covers all models and resets at a fixed time assigned to your account ([Anthropic, What is the Max plan](https://support.claude.com/en/articles/11049741-what-is-the-max-plan), checked 14 Sep 2026). Max 5x and Max 20x multiply Pro's usage per session, and chat, Claude Code and the IDE extensions share one pool. Because both meters are shared across models, switching with `/model` does not bring back a spent session or week. The separate Opus and Sonnet family limits are different: switch outside that family and you keep working (Claude Code errors reference). Run `/usage` to see both bars and their reset times.

{% img "note-1" %}

## Did Claude Code weekly limits change in September 2026?

Yes, from 14 Sep 2026. On 29 Aug 2026 Anthropic's [ClaudeDevs account](https://x.com/ClaudeDevs/status/2093742321473065266) announced that from 14 Sep 2026 standard weekly limits in Claude Code rise permanently by 25%, with the temporary 50% increase staying until then. A follow up post in that thread on 29 Aug 2026 says this "works out to a 17% reduction in weekly limits on Claude Code" against the boosted limit.

## Which model should you use on a Max plan?

Match the model to the job, because model and effort both change how fast you use the limit. Claude Code starts Max accounts on Opus 5, while Anthropic's cost docs say Sonnet handles most coding tasks well and costs less. Reserve Opus for architecture and hard debugging, or set `/model opusplan` so Opus plans and Sonnet executes, though each plan mode toggle then starts a fresh cache. Lower `/effort` for routine work; asking Opus at `max` effort to rename a variable is a very thorough way to spend a morning.

Fable needs a budget of its own. Anthropic's [Fable help article](https://support.claude.com/en/articles/15424964-claude-fable-models-on-your-plan), updated 2 Sep 2026, says Max can spend up to 50% of its weekly limit on Fable 5 and 5.1, and those models use limits faster than the others. Save Fable for the long, ambiguous task, not the quick fix.

## How do you stop context from eating the plan?

Keep the conversation short, because Claude Code resends it with every request. Anthropic's [cost management page](https://code.claude.com/docs/en/costs) gives the levers:

* `/clear` when you switch to unrelated work.
* `/compact Focus on the failing tests` at a natural break. Compaction reads the whole conversation, so on a cold cache it is a large request itself.
* Keep `CLAUDE.md` under 200 lines and move workflow instructions into skills, which load only when used.
* Run `/context` to see what is loaded, and disable MCP servers you are not using.

Plan before editing. Shift+Tab into [plan mode](/blog/how-to-use-claude-code-plan-mode/) for anything that touches several files, press Escape the moment Claude heads the wrong way, and use `/rewind` instead of stacking "try again" on a bad attempt. Each retry rereads everything before it.

## Does prompt caching help on a subscription?

Yes, while the cache is warm. Claude Code's prompt caching page says the main conversation gets a one hour cache on a subscription within plan usage, dropping to five minutes once you draw on usage credits, and subagents get five minutes. We checked by reading the `usage` fields Claude Code 2.1.270 writes to its session transcripts on our machine, with no cache settings changed. Across 27 requests in an orchestrating session, all 121,041 cache write tokens were one hour writes; a subagent it started wrote only five minute entries over 69 requests, and both read 96% to 98% of input from cache on 14 Sep 2026. To check yours, run `claude -p "hello" --output-format json` and read `usage.cache_creation`.

So come back inside the hour, or `/clear` and start fresh, rather than reheating a huge stale context. Switching model mid task rebuilds the cache, and on most models so does changing effort, so choose both at the start. Our guide to [prompt caching for AI agents](/blog/prompt-caching-for-ai-agents/) explains why a stable prefix matters.

## Are subagents cheaper than doing it yourself?

Not automatically. Unless Claude or the subagent's definition names a model, a subagent runs on your session's model, which on Max is Opus 5 by default. Put `model: haiku` or `model: sonnet` in subagents that search, run tests or read logs. They still help: verbose output stays in the subagent and only a summary returns. Open `/usage` and press `w` to see how much of the last week went to subagents, skills and MCP servers.

## Can Claude Code keep working while you are away?

Yes, within limits. Since version 2.1.234, an interactive session signed in with a subscription waits out a usage limit and continues the task on its own. It still stops on permission prompts, re-arms at most twice in a row, and does not start a wait by itself for a reset more than 24 hours away, which a weekly limit often is. `/rate-limit-options` starts or cancels that wait.

Background sessions and `/loop` tasks draw on the same subscription, and each scheduled fire resends the full context. Claude Code's agent view docs put it plainly: ten agents in parallel use quota roughly ten times as fast as one.

{% img "note-2" %}

## Can you share a Max plan or use it in other apps?

No to sharing, and be careful with other apps. Anthropic's Consumer Terms bar sharing your login, and its [Claude Code legal page](https://code.claude.com/docs/en/legal-and-compliance) says advertised Pro and Max limits assume ordinary, individual use. The same page bars third party developers from routing requests through Pro or Max credentials for their users, and says that does not stop you signing in to the unmodified Claude Code binary with your own subscription. If you are building a product on Claude, it points you to an API key.
