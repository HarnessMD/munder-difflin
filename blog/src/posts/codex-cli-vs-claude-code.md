---
title: "Codex vs Claude Code: Plans, Limits and Computer Use (Sep 2026)"
description: "Codex vs Claude Code, checked 29 Sep 2026: models, plans, usage limits, sandboxing, computer use, MCP and subagents in one dated table, then which to pick."
date: 2026-09-10
updated: 2026-09-29
category: comparisons
categoryLabel: Comparisons
type: Technical
primaryKeyword: "codex vs claude code"
secondaryKeywords: ["claude code vs codex", "codex cli vs claude code", "codex vs claude code usage limits", "codex vs claude code computer use", "is codex cli free", "does claude code read agents md"]
tags: ["Comparisons", "Claude Code", "Codex", "Multi-Agent", "Engines"]
faq:
  - q: "Is Codex better than Claude Code?"
    a: "Neither wins outright as of 29 Sep 2026. Codex is the better fit if you want a free way in, limits published per model, and computer use that can run in the background on a Mac. Claude Code is the better fit if you want Opus 5.5 as the default model and computer use from inside the CLI on a Pro or Max plan."
  - q: "Is Codex CLI free?"
    a: "Yes, with a cap. OpenAI's Codex pricing page lists a Free plan at $0 and a Go plan at $8 a month, both with GPT-6 Luna in the desktop app subject to rollout, checked 29 Sep 2026. The CLI, IDE extension and web start at Plus, $20 a month. Claude Code is not on Claude's Free plan at all; it starts at Pro."
  - q: "Which has higher usage limits, Codex or Claude Code?"
    a: "You can only compare them on paper for Codex, because OpenAI publishes estimated messages per five hours for each model and Anthropic does not. Both products meter a rolling five hour window plus a weekly limit, and both sell credits once you run out. The multipliers line up: 5x and 20x tiers on each side."
  - q: "Does Claude Code read AGENTS.md?"
    a: "Yes. Claude Code's memory docs, checked 29 Sep 2026, say it can read a repository's `AGENTS.md` on its own or alongside `CLAUDE.md`. Codex uses `AGENTS.md` natively, so one file can now brief both agents."
  - q: "Does Codex CLI have computer use?"
    a: "Not in the CLI. OpenAI's docs put Computer Use in the ChatGPT desktop app, with Codex, on macOS and Windows in supported regions, checked 29 Sep 2026. Claude Code has it inside the CLI, but only on macOS, as a research preview on Pro and Max plans."
  - q: "Can I run Codex and Claude Code together?"
    a: "Yes. Munder Difflin, free and open source, runs Codex and Claude Code agents side by side on one office floor, each in its own terminal, and you choose the CLI per agent. Both tools also read `AGENTS.md` now, so one instructions file can cover both."
---

Codex and Claude Code are close enough in September 2026 that your plan should decide: pick Codex for a free tier, limits published per model and background computer use on a Mac; pick Claude Code for Opus 5.5 by default and computer use inside the terminal.

You can also skip the choice: switch between the two by hand, or run both in [Munder Difflin](https://harnessmd.com/download), free and open source, which puts Codex and Claude Code agents side by side on one floor, each in its own terminal. Everything below was checked on 29 Sep 2026 against each vendor's own pricing pages and docs.

## Codex vs Claude Code at a glance (checked 29 Sep 2026)

| | Codex (OpenAI) | Claude Code (Anthropic) |
|:--|:--|:--|
| Where it runs | CLI, IDE extension, ChatGPT desktop app, web, iOS | CLI, IDE extensions, desktop app, web |
| Source | CLI is Apache-2.0 on GitHub | Closed, Anthropic commercial terms |
| Models | GPT-6 Astra, GPT-6 Sol, GPT-6 Luna, GPT-5.6 family. GPT-5.5 retires 14 Oct 2026 | Opus 5.5 is the default on Pro, Max, Team and Enterprise. Sonnet 5.5, Haiku, Fable 5.1 on usage credits |
| Cheapest plan with the CLI | Plus, $20 a month (Free and Go get the desktop app only) | Pro, $20 a month |
| Heavy plans | Pro 5x from $100, Pro 20x at $200 (closed to new sign ups since 10 Sep 2026) | Max 5x at $100, Max 20x at $200 |
| Limits | Published ranges per model per 5 hours, weekly limits may apply, credits after | 5 hour session limit plus a weekly limit, no published message counts, credits after |
| Sandbox | On by default: Seatbelt on macOS, bubblewrap on Linux and WSL2, native Windows sandbox | Built in Bash sandbox (Seatbelt, bubblewrap), set up with `/sandbox`. No native Windows |
| Approval controls | `--sandbox` and `--ask-for-approval`, two flags | One `--permission-mode` with six modes |
| Computer use | ChatGPT desktop app on macOS and Windows, background on macOS, not in the CLI | In the CLI on macOS, research preview, Pro and Max only. Desktop app: macOS and Windows |
| MCP | Yes, STDIO and streamable HTTP | Yes, local stdio and remote HTTP |
| Subagents | On by default in current releases, plus custom agents | Built in and custom, each in its own context window |
| Project instructions | `AGENTS.md` | `CLAUDE.md`, and it reads `AGENTS.md` too |

Sources: OpenAI's [Codex pricing page](https://learn.chatgpt.com/docs/pricing) and [Pro tiers article](https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers), Anthropic's [Max plan article](https://support.claude.com/en/articles/11049741-what-is-the-max-plan) and [Claude Code model docs](https://code.claude.com/docs/en/model-config), all checked 29 Sep 2026. Sandbox flags come from `codex --help` and `claude --help`, run the same day.

## Which one has higher usage limits, Codex or Claude Code?

Only Codex lets you compare on paper, because OpenAI publishes estimated local messages per five hours for each model and Anthropic publishes none. OpenAI's [pricing page](https://learn.chatgpt.com/docs/pricing), checked 29 Sep 2026, lists these ranges:

| Model | Plus | Pro 5x | Pro 20x |
|:--|:--|:--|:--|
| GPT-6 Astra | 5 to 45 | 25 to 225 | 100 to 900 |
| GPT-6 Sol | 15 to 150 | 70 to 700 | 300 to 3,000 |
| GPT-6 Luna | 350 to 3,000 | 1,750 to 14,000 | 7,000 to 56,000 |

The same page says weekly limits may also apply, and that Plus and Pro users can buy credits when they run out. The spread inside each range comes from task size, context and reasoning, so a long Astra session lands near the bottom end.

Anthropic describes its limits as multipliers instead. Max 5x gives five times Pro's per session usage and Max 20x gives twenty times, both with a weekly limit across all models that resets at a fixed time for your account, per its [Max plan article](https://support.claude.com/en/articles/11049741-what-is-the-max-plan) checked 29 Sep 2026. Anthropic also raised five hour limits on Pro, Max, Team and seat based Enterprise when it shipped [Opus 5.5 on 22 Sep 2026](https://www.anthropic.com/claude-opus-5-5). Claude Code and the Claude apps share one pool, so a long chat eats into your coding time. Our [Claude Code Max plan tips](/blog/claude-code-max-plan-tips/) cover how to stretch it, and the [Codex Max plan tips](/blog/codex-max-plan-tips/) do the same for OpenAI's side.

### Can new subscribers still get ChatGPT Pro 20x?

Not as a new subscriber right now. OpenAI's [Pro tiers article](https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers) says that from 10 Sep 2026 it is temporarily pausing new sign ups and upgrades to Pro 20x, while existing Pro 20x subscriptions and all Pro 5x plans carry on. If you burn through Pro 5x, your options today are credits, an API key, or a second tool. Anthropic's Max plan article carried no pause of that kind on 29 Sep 2026.

## Does Codex or Claude Code have better computer use?

Codex does more on a Mac, and Claude Code is the only one of the two that does it from the terminal. OpenAI's [Computer Use docs](https://learn.chatgpt.com/docs/computer-use), checked 29 Sep 2026, put the feature in the ChatGPT desktop app with Codex, on macOS and Windows, in supported regions. On macOS it can run a scoped task in the background while you keep working elsewhere. On Windows it takes over the active desktop.

Claude Code's [computer use docs](https://code.claude.com/docs/en/computer-use), checked the same day, describe a built in `computer-use` MCP server you enable from `/mcp`. It is a macOS research preview for Pro and Max plans only, not Team or Enterprise, and it will not run under `-p`. Only one session can hold the screen at a time, and other apps are hidden while Claude works. If you want an agent clicking through your app while you type in another window, Codex's desktop app is the better fit. If you want the agent that just wrote the Swift to launch it and click every button in the same terminal session, that is Claude Code.

## How do sandboxing and approvals differ?

Codex splits the decision into two flags and Claude Code folds it into one. We ran both help screens on 29 Sep 2026 with `codex-cli 0.153.4` and Claude Code `2.1.284` installed:

```text
codex --help
  -s, --sandbox <SANDBOX_MODE>
          [possible values: read-only, workspace-write, danger-full-access]
  -a, --ask-for-approval <APPROVAL_POLICY>
          - on-request: The model decides when to ask the user for approval
          - never:      Never ask for user approval

claude --help
  --permission-mode <mode>   (choices: "acceptEdits", "auto",
                              "bypassPermissions", "manual",
                              "dontAsk", "plan")
```

Codex applies its sandbox in the default permissions mode, so every command it spawns, `git` and test runners included, inherits the boundary. Claude Code's Bash sandbox uses the same OS primitives (Seatbelt on macOS, bubblewrap on Linux and WSL2) but you set it up with `/sandbox`. Both kept a loud escape hatch, `--dangerously-bypass-approvals-and-sandbox` and `--dangerously-skip-permissions`. Somebody in both design rooms wanted you to feel that flag before you typed it.

{% img "note-1" %}

## Does Claude Code read `AGENTS.md`?

Yes, and that changed since we first wrote this post. Claude Code's [memory docs](https://code.claude.com/docs/en/memory), checked 29 Sep 2026, say it can read a repository's `AGENTS.md` on its own or alongside `CLAUDE.md`. Codex uses `AGENTS.md` natively and creates one with `/init`. A repo that runs both no longer needs two copies of the same rules or a symlink between them.

## Is Codex CLI free?

Not quite: the free tier covers the desktop app, not the CLI. OpenAI's pricing page, checked 29 Sep 2026, lists Free at $0 and Go at $8 a month, both with GPT-6 Luna in the desktop app subject to rollout, and Plus at $20 a month for Codex on the web, in the CLI, in the IDE extension and on iOS. You can also run the CLI on an API key and pay API rates. Claude Code is not on Claude's Free plan; it starts at Pro.

{% img "note-2" %}

## Pick Codex if..., pick Claude Code if...

**Pick Codex if:**
* You want to start free before you commit.
* You like knowing roughly how many messages each model buys you per five hours.
* You want computer use that runs in the background on a Mac or works on Windows.
* You want to read the CLI's source (Apache-2.0).

**Pick Claude Code if:**
* You want Opus 5.5 as your default model without touching settings.
* You want the agent to drive native apps and simulators from the same terminal session.
* You already pay for Claude and want chat and coding on one plan.
* You want one permission dial instead of two, and a sandbox you switch on per project.

If you are still choosing between whole categories of tools, not just these two engines, the [multi-agent tools roundup](/blog/best-claude-code-multi-agent-tools/) is the wider map, and [Claude Code vs Antigravity](/blog/claude-code-vs-antigravity/) covers Google's agent.

## Can you run Codex and Claude Code together?

Yes, and for a lot of teams that is the honest answer. Munder Difflin (as of 0.5.3) lets you pick the CLI per agent, Claude Code or Codex among others, and runs each one as a real terminal process on the same floor. A Codex agent can take the UI bug while a Claude Code agent takes the refactor, and both read the same `AGENTS.md`. When one plan hits its weekly limit, the other keeps working.
