---
title: "How to Make the Most of Your Codex Max Plan"
description: "There is no Codex Max plan. What ChatGPT Pro 5x and 20x give you in Codex, how the weekly limit works, and how to stretch it."
date: 2026-09-14
category: guides
categoryLabel: Guides
type: Technical
pinned: true
pinOrder: 5
primaryKeyword: "codex max plan"
secondaryKeywords: ["how to make the most of codex", "codex max plan usage", "chatgpt pro codex usage limits", "does codex have weekly limits", "how to check codex limit usage", "how to reduce codex token usage"]
tags: ["Guides", "Codex", "Cost", "Model Routing"]
faq:
  - q: "Can I still buy ChatGPT Pro 20x for Codex?"
    a: "Not as a new subscriber right now. OpenAI paused new sign-ups and upgrades to Pro $200, also called Pro 20x, on 10 Sep 2026, and existing subscriptions keep renewing. Pro $100 (Pro 5x) is still on sale. If your Pro $200 subscription lapses, you cannot buy it again until the pause lifts."
  - q: "Is there a five hour limit on ChatGPT Pro for Codex?"
    a: "No. OpenAI dropped the five hour window on 12 Jul 2026. On 25 Aug 2026 Thibault Sottiaux of the Codex team said it was coming back for Plus while Pro $100 and Pro $200 stay without it for the upcoming months, and on 31 Aug he said the Pro multiples apply to weekly limits. The weekly limit still applies, so check the usage dashboard for your reset time."
  - q: "Does Codex code review count against my usage limit?"
    a: "It depends on where the review runs. OpenAI's pricing page says reviews Codex runs through GitHub, such as tagging @codex on a pull request, count as Code Review usage, while reviews run locally or outside GitHub count toward your general limits. For local reviews, set review_model in config.toml to a smaller model."
  - q: "What happens when I hit my Codex usage limit in the middle of a task?"
    a: "Codex keeps working on the turn already in progress, subject to fair use limits, per OpenAI's pricing page checked 14 Sep 2026. After that, Plus and Pro users can buy credits without upgrading, use an available reset, or wait for the reset time shown on the usage page."
  - q: "Does switching to a smaller model give me my Codex limit back?"
    a: "No. OpenAI's help article on managing usage with GPT-6 Astra says switching models does not restore allowance in a shared usage pool. A smaller model only makes what is left go further, so switch while you are approaching the limit, not after you hit it."
---

OpenAI has no plan called Codex Max. The plan people mean is ChatGPT Pro, which comes as Pro 5x at $100 a month or Pro 20x at $200 (OpenAI pricing, checked 14 Sep 2026). To make the most of it, run the smallest model and effort that works, keep one chat per task, and check `/status` before big jobs.

Three things muddy the name: Anthropic's Claude Max plan, OpenAI's older GPT-5.1-Codex-Max model, and Codex's **Max** reasoning setting, which gives a model more time on one task ([OpenAI, Models](https://learn.chatgpt.com/docs/models)). None is a Codex plan. Still choosing between tools? Our [Codex CLI vs Claude Code comparison](/blog/codex-cli-vs-claude-code/) covers that. The habits in [managing several Claude Code sessions](/blog/manage-multiple-claude-code-sessions/), like one scope per session, carry straight over to Codex.

You can apply every tip below by hand, or use [Munder Difflin](https://harnessmd.com/download), a free and open source desktop app that runs Codex agents next to Claude Code and other CLIs. Each Codex agent signs in with your own Codex login, and you pick its model per agent, from Luna for routine edits to Astra for the hard bug. Our [mixed engine office guide](/blog/run-a-mixed-engine-office/) shows a layout.

## Is there a Codex max plan?

No, but ChatGPT Pro is the closest thing, and its bigger tier just got harder to buy. OpenAI split Pro in two on 9 Apr 2026, adding a $100 tier with 5x the Codex usage of Plus and a launch boost to up to 10x that ran through 31 May 2026 ([OpenAI on X](https://x.com/OpenAI/status/2042295688323875316)), so that boost is over.

Pro $200, labelled Pro 20x, is still the highest usage tier, but since 10 Sep 2026 OpenAI has paused new sign-ups and upgrades to it ([About ChatGPT Pro tiers](https://help.openai.com/en/articles/9793128)). Existing subscriptions renew as usual. If you have Pro 20x, think before you cancel or downgrade: once it lapses, you cannot buy it back until the pause lifts.

## Does Codex have weekly limits?

Yes, and on Pro right now the weekly limit is the one that matters. OpenAI's [pricing page](https://learn.chatgpt.com/docs/pricing) says local messages and cloud chats share one allowance and that weekly limits may also apply. The same pool covers the Codex CLI, the IDE extension, the ChatGPT desktop app and ChatGPT Work.

Plus got its five hour window back in late August. On 25 Aug 2026, Thibault Sottiaux of OpenAI's Codex team said Pro $100 and Pro $200 would keep running without one "for the upcoming months" ([post on X](https://x.com/thsottiaux/status/2092058556707344708)). Nothing refills after five hours, so a long unattended run keeps drawing down the whole week. Budget by the week, not by the sitting.

## Do cloud tasks use more than local ones?

Often, yes. Cloud chats on ChatGPT plans run on GPT-5.6 Sol and may use more of your allowance than local messages, per OpenAI, and for now you can't change their default model. Local work in the CLI or IDE runs whichever model you pick, including the cheaper Terra and Luna. Code review follows the same split: reviews Codex runs through GitHub count as Code Review usage, while a local `/review` counts toward your general limits.

{% img "note-1" %}

So send work to the cloud because you want it off your laptop and running in parallel, not to save usage. From the terminal, `codex cloud exec` needs an environment id and makes one attempt unless you ask for more. Checked on 14 Sep 2026 (output trimmed):

```
$ codex --version
codex-cli 0.153.4
$ codex cloud exec --help
Usage: codex cloud exec [OPTIONS] --env <ENV_ID> [QUERY]
      --attempts <ATTEMPTS>
          Number of assistant attempts (best-of-N)
          [default: 1]
```

Leave `--attempts` at 1 unless you want to compare versions, since each attempt is its own run.

## How do I check my Codex usage?

Type `/status` in an active Codex CLI session, or open the usage dashboard at `chatgpt.com/codex/settings/usage`. OpenAI's pricing page points to both and suggests checking the dashboard every week or two to learn your pace. In the CLI, `/statusline` can pin rate limits to the footer so you see them without asking.

If you run out mid task, Codex keeps working on that turn, subject to fair use, and Plus and Pro users can buy credits rather than upgrade. Better still, follow OpenAI's advice and switch to a smaller model while you are approaching the limit.

## Which model makes Codex usage last longest?

GPT-5.6 Luna, by a wide margin. OpenAI's Pro 5x estimates, checked 14 Sep 2026, are 25 to 225 local messages per five hours on GPT-6 Astra, 50 to 500 on Sol, 125 to 1,000 on Terra and 1,250 to 10,000 on Luna. Pro 20x is four times each. With no five hour cap on Pro, treat them as pace, not a limit. The models page says to use the lowest effort that gets the result, and that most tasks need neither Max nor Ultra, which splits work across subagents.

A workable split: Luna for clear, repeatable edits, Terra for everyday features, and Sol or Astra at low or medium effort for the bug that has beaten you twice. Switch with `/model` inside a chat, or pass `codex exec -m gpt-5.6-luna` for scripted runs. Fast mode is the quiet drain: on Astra and GPT-5.6 it bills at 2.5x, making replies quicker and your week shorter. If an old `config.toml` still pins `gpt-5.4`, change it to `gpt-5.6-terra`: GPT-5.4 left Codex for ChatGPT accounts on 31 Aug 2026.

{% img "note-2" %}

## How do I reduce Codex token usage?

Cut what every turn has to carry. Your prompt, files, chat history and tool results all spend tokens, so these habits pay off on every message:

* **Keep `AGENTS.md` short.** Codex reads it before any work. Move folder specific rules into nested `AGENTS.md` files, as OpenAI's pricing page suggests.
* **Turn off MCP servers you are not using.** OpenAI says each one adds context to your messages.
* **Use one chat per task.** Start the next task with `/new` instead of stacking it onto a long chat, and use `/compact` when a single task runs long. OpenAI's best practices guide warns that one chat for a whole project bloats context.
* **Stop retry loops early.** If a run misses, interrupt it, fix the prompt or add the missing file, then rerun. OpenAI's Astra usage guide notes that raising effort cannot supply information or access the model never had.
* **Point reviews at a cheaper model.** Set `review_model` in `config.toml` so `/review` does not inherit an expensive session model.

## Can I run several Codex agents at once?

Yes, and that is where a Pro allowance goes fastest. Worktrees, cloud chats and subagents all run in parallel from the same pool, and OpenAI's docs say subagent runs use more tokens than a single agent. Go parallel only when tasks touch separate files and a cheaper model suffices. The [multi-agent cost playbook](/blog/the-multi-agent-cost-playbook/) covers model tiering across a fleet.
