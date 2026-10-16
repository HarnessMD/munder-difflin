---
title: "What Is Codex? OpenAI's Coding Agent, Its Free Plan and Models"
description: "Codex is OpenAI's coding agent for your terminal, editor, desktop app and cloud. ChatGPT Free, Go, Plus and Pro include it. Plans and models, 15 Oct 2026."
date: 2026-10-02
updated: 2026-10-15
category: concepts
categoryLabel: Concepts
type: Non-technical
primaryKeyword: "what is codex"
secondaryKeywords: ["openai codex", "codex cli", "codex app", "codex cloud", "is codex free", "is codex the same as chatgpt"]
tags: ["Concepts", "Codex", "CLI Agents", "Open Source", "Engines"]
faq:
  - q: "Is Codex free?"
    a: "Yes, with limits. OpenAI's Codex pricing page says Codex is included in ChatGPT Free, Go, Plus, Pro, Business, Edu and Enterprise. Free and Go list GPT-6 Luna in the desktop app, subject to rollout. Cloud features such as automatic code review start at Plus. Checked 15 Oct 2026."
  - q: "Is Codex the same as ChatGPT?"
    a: "No. ChatGPT is OpenAI's general assistant and Codex is its coding agent. They share an account and the desktop app, and the pricing page says ChatGPT Work shares usage with Codex and uses the same pricing, credits and usage limits as Codex. Codex works on your repository: it edits files and runs commands."
  - q: "Is Codex open source?"
    a: "The CLI is. Its source is at openai/codex on GitHub under the Apache-2.0 licence, and on 16 Oct 2026 the latest release was rust-v0.163.0 (15 Oct). Codex Cloud runs on OpenAI's machines and is not open source."
  - q: "Which models does Codex use?"
    a: "OpenAI's Codex pricing page lists GPT-6.1 Sol and GPT-6 Luna on Plus, and GPT-6 Luna on Free and Go. GPT-5.5 retired from Codex with ChatGPT sign in on 14 Oct 2026; sessions signed in with an API key were not affected. With an API key you get the models your key can access."
  - q: "Can I run Codex and Claude Code together?"
    a: "Yes. Munder Difflin is free and open source: a desktop app that runs a team of coding agents such as Claude Code, Codex and Gemini CLI on your own computer."
---

Codex is OpenAI's coding agent: it reads your repo, edits files and runs commands to finish a task. It runs in your terminal, your editor, the ChatGPT desktop app and Codex Cloud on OpenAI's machines. ChatGPT Free, Go, Plus, Pro, Business, Edu and Enterprise include it. Checked 15 Oct 2026.

You can run Codex on its own, or inside [Munder Difflin](https://harnessmd.com/download), which is free and open source: a desktop app that runs a team of coding agents such as Claude Code, Codex and Gemini CLI on your own computer. If several agents on one repo is new to you, [what an agent harness is](/blog/what-is-a-multi-agent-harness/) explains the setup.

## What is OpenAI Codex?

OpenAI Codex is an agent rather than a chat window: it works inside your project, with your files and your terminal, within the permissions you give it. You sign in with a ChatGPT account or an OpenAI API key. Project instructions go in an `AGENTS.md` file, which has [its own page](https://developers.openai.com/codex/agent-configuration/agents-md) in OpenAI's Codex docs.

The models change often. OpenAI's [Codex pricing page](https://learn.chatgpt.com/docs/pricing) lists GPT-6.1 Sol and GPT-6 Luna on Plus. The same page says GPT-5.5 retired from Codex with ChatGPT sign in on 14 Oct 2026 at 19:00 UTC, and that the OpenAI API and Codex sessions signed in with an API key were not affected.

## Where does Codex run?

Codex runs on your machine through the CLI, your editor or the desktop app, and on OpenAI's machines through Codex Cloud.

| Surface | Where the work happens | Good for |
| --- | --- | --- |
| Codex CLI | Your terminal | Scripts, CI, keyboard people |
| IDE extension | VS Code, Cursor, Windsurf; Xcode and JetBrains have their own integrations | Edits beside open files |
| ChatGPT desktop app | Your computer, one workspace for chats and projects | Parallel projects, files, scheduled tasks |
| Codex Cloud | OpenAI's machines, from a published environment | Long tasks while your laptop sleeps |

### Codex CLI

The CLI is the open source part. On 16 Oct 2026 GitHub showed openai/codex under Apache-2.0 with more than 129,000 stars, and the latest release was rust-v0.163.0, published 15 Oct. Its [release notes](https://github.com/openai/codex/releases/tag/rust-v0.163.0) add a searchable `/config`, follow up messages that steer Codex while it is responding, and a restart for the background server from `/daemon`. Our [Codex CLI install guide](/blog/how-to-install-codex-cli/) has every install method.

### IDE extension and desktop app

OpenAI's [IDE page](https://developers.openai.com/codex/ide) says VS Code and compatible editors use the Codex extension: in VS Code, Cursor or Windsurf you choose the Codex icon. Xcode and JetBrains IDEs provide their own integrations. The same page suggests Git checkpoints before and after a task so you can revert. The [ChatGPT desktop app page](https://developers.openai.com/codex/app) describes one workspace to "run projects in parallel, work with files, use your computer", where you pick ChatGPT or Codex and can schedule a task inside a chat.

### Codex Cloud

Codex Cloud runs a task in its own workspace on OpenAI's machines. OpenAI's [cloud page](https://developers.openai.com/codex/cloud) says you choose GitHub repositories, Codex "inspects your repositories, installs dependencies and tools, and tests the workflow", and you publish that environment once. Each later task starts from it, "can keep working while your computer is asleep", and you review from the web, mobile or desktop app.

{% img "note-1" %}

## What is Codex used for?

Codex is used for the jobs you would hand a colleague with repo access: fixing a bug, building a feature, explaining an unfamiliar codebase or reviewing a pull request. The API key option, in the pricing page's words, is "great for automation in shared environments like CI." Codex Cloud suits work that outlasts your attention span.

## Is Codex free?

Yes, with limits: OpenAI's pricing page says Codex is included in ChatGPT Free, Go, Plus, Pro, Business, Edu and Enterprise. Here is what the [Codex pricing page](https://learn.chatgpt.com/docs/pricing) lists on 15 Oct 2026:

| Plan | US price | What it lists for Codex |
| --- | --- | --- |
| Free | $0 a month | GPT-6 Luna at Standard speed in the desktop app, subject to rollout |
| Go | $8 a month | Same as Free, for lightweight coding tasks |
| Plus | $20 a month | Web, CLI, IDE extension and iOS; automatic code review and Slack; GPT-6.1 Sol and GPT-6 Luna |
| Pro | From $100 a month ($100, $200 or $500) | Everything in Plus; Ultrafast mode on Pro $500 |
| Business | $20 per user a month for two or more users, billed annually; $25 per user a month billed monthly | Desktop and mobile apps, larger virtual machines for cloud chats |
| API key | API rates | CLI, SDK and IDE extension, no cloud features |

So you can try Codex for nothing, and the cloud integrations start at Plus. Our [Codex pricing](/blog/codex-pricing/) page covers usage limits and API rates, and [Codex plan tips](/blog/codex-max-plan-tips/) cover stretching a Pro plan.

{% img "note-2" %}

## Is Codex the same as ChatGPT?

No: ChatGPT is OpenAI's assistant, and Codex is the coding agent that ships with it. They share your account and the desktop app, and the pricing page says ChatGPT Work uses the same pricing, credits and usage limits as Codex. The difference is the job. ChatGPT answers in a conversation; Codex changes files in a repository. With an API key you can run the CLI without any ChatGPT plan.

## How does Codex compare with Claude Code?

Codex and Claude Code do the same job; our view is that the plan you already pay for usually decides. Codex's CLI is open source under Apache-2.0 and the Free plan lists Codex in the desktop app. Claude Code is Anthropic's agent and, per Anthropic's [memory docs](https://code.claude.com/docs/en/memory), reads `CLAUDE.md` files and can read `AGENTS.md` too. We think neither wins for every repo. Our [Codex vs Claude Code comparison](/blog/codex-cli-vs-claude-code/) has a dated table, and [Codex vs Cursor](/blog/codex-vs-cursor/) covers the editor side.
