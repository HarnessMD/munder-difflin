---
title: "What Is Codex? OpenAI's Coding Agent in the CLI, App and Cloud"
description: "What is Codex? OpenAI's coding agent runs in your terminal, the ChatGPT desktop app, your IDE and the cloud. Which plans include it, checked 2 Oct 2026."
date: 2026-10-02
category: concepts
categoryLabel: Concepts
type: Non-technical
primaryKeyword: "what is codex"
secondaryKeywords: ["openai codex", "codex cli", "codex app", "codex cloud", "is codex free", "is codex the same as chatgpt"]
tags: ["Concepts", "Codex", "CLI Agents", "Open Source", "Engines"]
faq:
  - q: "Is Codex free?"
    a: "Yes, with limits. OpenAI's help centre says Codex is included in every ChatGPT plan, Free and Go included, and the DevDay 2026 recap says the refreshed Codex CLI is available to all plans. Free and Go do not include Codex Cloud, and the pricing page lists GPT-6 Luna for them. You can also use an API key and pay API rates. Checked 2 Oct 2026."
  - q: "Is Codex the same as ChatGPT?"
    a: "No. ChatGPT is OpenAI's general assistant and Codex is its coding agent. They share an account and the desktop app, and ChatGPT Work uses the same credits and limits as Codex, but Codex works on your repository: it edits files and runs commands."
  - q: "Is Codex open source?"
    a: "The CLI is. Its source is at openai/codex on GitHub under the Apache-2.0 licence, and on 2 Oct 2026 the latest release was rust-v0.160.0. The open source part is that terminal client; Codex Cloud runs on OpenAI's machines."
  - q: "Which models does Codex use?"
    a: "On Plus, the pricing page lists GPT-6.1 Sol and GPT-6 Luna, and Free and Go get GPT-6 Luna in the desktop app. GPT-5.5 retires from Codex on every plan on 14 Oct 2026, according to the same page. With an API key, you get the models your key can access."
  - q: "Can I run Codex and Claude Code together?"
    a: "Yes. Munder Difflin, free and open source, runs Codex agents and Claude Code agents side by side, each in its own terminal, and you pick the CLI per agent."
---

Codex is OpenAI's coding agent. You give it a task, and it reads your repo, edits files and runs commands until the change is done. It comes in three forms: an open source CLI for your terminal, Codex in the ChatGPT desktop app and IDE extension, and Codex Cloud, which runs tasks on OpenAI's machines. Checked 2 Oct 2026.

You can run Codex on its own, or run it inside [Munder Difflin](https://harnessmd.com/download), free and open source, next to Claude Code and other agents, each in its own terminal. If several agents on one repo is a new idea, [what an agent harness is](/blog/what-is-a-multi-agent-harness/) explains the setup.

One clarification first. Google's autocomplete for this query also offers "what is codex in venom" and "what is codex in superman". This page covers the Codex that edits code, which has fewer capes.

## What is OpenAI Codex?

OpenAI Codex is an agent rather than a chat window: it works inside your project, with your files and your terminal, within the permissions you give it. You sign in with a ChatGPT account or an OpenAI API key. Project instructions go in an `AGENTS.md` file at the repo root, and `/init` writes a starter one for you.

The models change often. OpenAI's [Codex pricing page](https://learn.chatgpt.com/docs/pricing) lists GPT-6.1 Sol and GPT-6 Luna on Plus, and says GPT-5.5 retires from Codex on every plan on 14 Oct 2026.

## Where does Codex run?

Codex runs in three places, and since DevDay on 29 Sep 2026 you can start a cloud task and follow it from any device. OpenAI's [DevDay 2026 recap](https://openai.com/index/devday-2026-recap/) put it as running Codex "on a computer, remotely from a phone, or in the cloud from any device."

| Surface | Where the work happens | Best for |
| --- | --- | --- |
| Codex CLI | Your terminal, on your machine | Scripts, CI with `codex exec`, keyboard people |
| Codex app and IDE extension | The ChatGPT desktop app or your editor, on your machine | Parallel chats, reviewing diffs visually |
| Codex Cloud | OpenAI's machines, from a published environment | Long tasks that keep going while your laptop sleeps |

### Codex CLI

The CLI is the open source part. We asked GitHub for the latest release on 2 Oct 2026 (IST):

```
$ gh api repos/openai/codex/releases/latest --jq '{tag:.tag_name,published:.published_at}'
{"published":"2026-10-01T20:19:13Z","tag":"rust-v0.160.0"}

$ gh api repos/openai/codex --jq '{stars:.stargazers_count,license:.license.spdx_id}'
{"license":"Apache-2.0","stars":127608}
```

The 0.160.0 notes add a "Show more" action for older tasks in the agent command center and fix Windows sandbox PowerShell fallbacks. The copy on our test Mac printed `codex-cli 0.153.4` for `codex --version`, seven minor versions behind, so updating now and then is worth the ten seconds. Install with `curl -fsSL https://chatgpt.com/codex/install.sh | sh` or `npm install -g @openai/codex`; our [Codex CLI install guide](/blog/how-to-install-codex-cli/) has every method.

### Codex app and IDE extension

The Codex app now lives inside the ChatGPT desktop app for macOS, Windows and Linux: open the ChatGPT dropdown and pick Codex. Each chat runs Local, in your project folder, or in a Worktree, a separate Git worktree so two chats never edit the same checkout. The IDE extension puts the same agent beside your editor, and OpenAI's help centre says it works in most VS Code forks.

### Codex Cloud

Codex Cloud runs a task in its own workspace on OpenAI's machines, built from a cloud environment you publish once. That reusable environment was the DevDay change: Codex inspects your GitHub repos, installs dependencies and tools, tests the setup with you, and every later task starts from it. You can follow and steer the task from the web, your phone or the desktop app. Your local files, browser sign ins and VPN are not carried over automatically. The older version, now called Codex Cloud (Legacy), still handles Code Review and the Linear and GitHub integrations, and OpenAI's docs say it will be deprecated.

{% img "note-1" %}

## What is Codex used for?

Codex is used for the jobs you'd hand a colleague with repo access: fixing a bug, building a feature, explaining an unfamiliar codebase or reviewing a pull request. The CLI also runs unattended in pipelines through `codex exec`. Codex Cloud suits work that outlasts your attention span, and DevDay added Codex Security Cloud, a research preview that scans connected GitHub repos and prepares fixes for you to review.

## Is Codex free?

Yes, with limits: every ChatGPT plan includes Codex, Free included, and OpenAI's DevDay recap says the refreshed CLI is available to all plans. What Free and Go lack is Codex Cloud. Here is what OpenAI lists, from the [Codex pricing page](https://learn.chatgpt.com/docs/pricing) and the [help centre](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan), as of 2 Oct 2026:

| Plan | US price on 2 Oct 2026 | What it lists for Codex |
| --- | --- | --- |
| Free | $0 | Quick coding tasks with GPT-6 Luna in the desktop app, subject to rollout, no Codex Cloud |
| Go | $8 a month | Lightweight tasks, same desktop app access as Free, no Codex Cloud |
| Plus | $20 a month | Web, CLI, IDE extension and iOS, Codex Cloud, automatic code review, Slack |
| Pro | From $100 a month ($100, $200 or $500) | Everything in Plus, no five hour limit for now, Astra Ultrafast on the $500 tier |
| Business | $20 per user a month billed annually, $25 monthly | Desktop and mobile apps, larger cloud machines |
| API key | API rates | CLI, SDK and IDE extension, no cloud features |

So you can try Codex for nothing, and Codex Cloud starts at Plus. Our [Codex pricing](/blog/codex-pricing/) page has every plan, the usage limits and the API rates. If you are on Pro, our [Codex plan tips](/blog/codex-max-plan-tips/) cover how the weekly limit works and how to stretch it.

{% img "note-2" %}

## Is Codex the same as ChatGPT?

No: ChatGPT is OpenAI's assistant, and Codex is the coding agent that ships with it. They share your account and the desktop app, and according to the pricing page Codex uses the same pricing, credits and usage limits as ChatGPT Work. The difference is the job. ChatGPT answers in a conversation; Codex changes files in a repository. With an API key you can run the CLI without any ChatGPT plan at all.

## How does Codex compare with Claude Code?

Codex and Claude Code do the same job, and the plan you already pay for usually decides. Codex's CLI is open source under Apache-2.0 and its Free tier lets you try the desktop app for nothing. Claude Code is Anthropic's agent, runs Claude models only and reads `CLAUDE.md` for instructions. Neither is a clear winner for every repo. Our [Codex vs Claude Code comparison](/blog/codex-cli-vs-claude-code/) has the dated table on limits, sandboxing and computer use, and the [openai/codex repo](https://github.com/openai/codex) is the place to read the CLI's own docs.
