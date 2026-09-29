---
title: "ChatGPT Dots vs Munder Difflin: One Cloud Agent or a Team on Your Computer"
description: "ChatGPT dots vs Munder Difflin: one hosted agent on OpenAI's cloud, or a free, open source team of agents on your own computer. Checked 30 Sep 2026."
date: 2026-09-30
category: comparisons
categoryLabel: Comparisons
type: Non-technical
primaryKeyword: "chatgpt dots vs munder difflin"
secondaryKeywords: ["munder difflin vs chatgpt dots", "chatgpt dots open source alternative", "chatgpt dots local", "always on ai agents on your own computer", "chatgpt dots alternative"]
tags: ["Comparisons", "AI Agents", "Local-First", "Multi-Agent", "Open Source"]
ogImage: "https://munderdiffl.in/blog/assets/media/munder-difflin-vs-chatgpt-dots/lead-still.png"
faq:
  - q: "What is the difference between ChatGPT dots and Munder Difflin?"
    a: "A dot is one always-on agent that OpenAI hosts on its own cloud computer, powered by GPT-6 Astra and reached through ChatGPT, Slack, Teams or a phone call. Munder Difflin is a free and open source desktop app that runs a team of named agents on your own computer, each one a CLI engine you choose, such as Claude Code, Codex or Gemini CLI."
  - q: "Is there an open source alternative to ChatGPT dots?"
    a: "Yes. Munder Difflin is MIT licensed and runs on macOS, Windows and Linux. It is built for work on files and code rather than personal errands, and it uses the AI subscriptions or API keys you already have."
  - q: "Can I have more than one dot?"
    a: "Not at launch. Each person gets one primary dot, and OpenAI says it plans to let you add more dots and have teams of dots work together later. Specialist dots with their own identity are limited to enterprise pilots."
  - q: "How much does ChatGPT dots cost?"
    a: "Your first dot is included with ChatGPT Pro or Business Premium at no extra cost. Pro starts at $100 a month on OpenAI's Pro tiers page, checked 30 Sep 2026. Dots are not on Free, Go or Plus."
  - q: "Can ChatGPT dots run on my own computer?"
    a: "The dot itself runs on OpenAI's cloud computer. You can give it optional access to your local computer through the ChatGPT desktop app, which is off by default, but the agent and its memory still live with OpenAI."
---

Pick dots for a hosted personal agent inside ChatGPT that works while your laptop is shut; pick Munder Difflin for a team of agents on your own machine using the engines you already pay for. OpenAI announced dots on 29 September 2026, and we checked everything below against its own pages on 30 September.

<!-- LOOP lead -->

[Munder Difflin](https://harnessmd.com/download) is a free and open source desktop app. It is a [multi-agent harness](/blog/what-is-a-multi-agent-harness/): you hire agents, give each a name and a role, and they share a board on your computer. [Your first hour with Munder Difflin](/blog/your-first-hour-with-munder-difflin/) shows the setup. For the dots basics, read [what ChatGPT dots is](/blog/what-is-chatgpt-dots/).

## ChatGPT dots vs Munder Difflin, checked 30 Sep 2026

| | ChatGPT dots | Munder Difflin |
| --- | --- | --- |
| Made by | OpenAI | Open source project, MIT licence |
| Where the agent works | OpenAI's cloud computer and browser; optional access to your computer, off by default | Terminal sessions on your own computer |
| Agents today | One primary dot; more dots are a stated future plan | As many named agents as you hire, each with a role |
| Models | GPT-6 Astra | 12 CLI engines, such as Claude Code, Codex and Gemini CLI, or a local model through Ollama or LM Studio |
| Memory | Memories from ChatGPT plus its own, including from connected apps | A plain `memory.md` file per agent on your disk |
| Works without you asking | Proactive research (read only), scheduled tasks and reminders | Scheduled missions (interval or weekly), webhook and Slack triggers |
| Approvals | Custom Rules per action, auto review, some tasks always stay with you | Webhook triggers held for approval by default, ASK ME board, circuit breaker |
| Where you talk to it | ChatGPT desktop, web and mobile, Slack, Teams, voice calls, texting beta in the US | The desktop app; Slack and webhooks as inbound triggers |
| App connections | Over 4,000 apps through plugins | MCP servers wired into each agent; write access off by default |
| Keeps working with your laptop closed | Yes | Only if the computer running it stays on |
| Who can get it | Pro (not EEA, Switzerland or UK) and Business Premium, age 18 and over | Anyone; macOS, Windows and Linux |
| Cost to start | First dot included with Pro or Business Premium | Free; you bring your own subscriptions or API keys |

Dots facts come from [OpenAI's launch post](https://openai.com/index/introducing-dots/), the [getting started help article](https://help.openai.com/en/articles/20001530-getting-started-with-your-dot) and the [Pro tiers page](https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers). OpenAI's Pro tiers page listed Pro at $100, $200 or $500 a month on 30 Sep 2026. Munder Difflin facts come from the 0.5.3 release source.

## Can ChatGPT dots run on my own computer?

No, a dot lives on OpenAI's cloud computer with its own browser. You can open it at any time to watch or step in. If you turn on local access in the ChatGPT desktop app, the dot can also create Codex tasks, use local skills and drive your local browser. That access is off by default and you can revoke it.

<!-- LOOP note-1 -->

Munder Difflin flips this. Each agent is a terminal session on your machine, in a folder you pick. Its identity, `memory.md`, inbox and outbox are files in its workspace. Your code never has to leave your disk unless the engine you chose sends it to its own model provider. If that matters to you, [why local first matters for AI agents](/blog/why-local-first-matters-for-ai-agents/) goes further.

The trade is real. A dot keeps going while your laptop sleeps. A Munder Difflin office stops when the computer does.

## Can I have more than one dot?

Not today. At launch each person gets one primary dot. OpenAI writes that "over time, we envision teams of dots working together" and that you will be able to add more dots in the future. Specialist dots with their own identity and credentials exist only in enterprise pilots.

<!-- LOOP note-2 -->

One dot can still work on several projects at once. The difference is roles. In Munder Difflin you hire a team now: a reviewer, a tester, a writer, each with its own name, memory and engine. Michael, the orchestrator, reads the board, hands out tasks and chases anyone who stalls. Agents message each other through their outboxes, and the app routes each message to the right inbox. More in [running an office of AI agents](/blog/run-an-office-of-ai-agents/).

## Which models can each one use?

Dots run on GPT-6 Astra, and only that. Munder Difflin 0.5.3 ships presets for Claude Code, Codex, Grok, Kimi Code, Gemini CLI, Antigravity, Qwen, OpenCode, Crush, Pi, Copilot and Cursor, plus a custom slot. Mix them on one floor: a Claude Code agent writes, a Codex agent reviews. Local models run through Ollama or LM Studio with no API key.

## How do the controls and approvals compare?

Custom Rules let you set each kind of action to act freely, act if pre-approved, ask first, or hand off to you. Auto review checks actions that touch accounts or share information, and saved passwords are used without showing them to the model.

Munder Difflin's controls are aimed at a team of coding agents. A request from a webhook waits for your approval unless you loosen the mode. As of 0.5.3 the default is set in `src/shared/triggers.ts`:

```ts
export type TriggerMode = 'strict' | 'allow-all' | 'communication-only';
export const DEFAULT_TRIGGER_MODE: TriggerMode = 'strict';
```
 When an agent needs a human decision, the card goes to the ASK ME board. A circuit breaker watches each agent for loops, repeated identical tool calls, error storms and runaway spend, and escalates from a steering message to tighter limits. It only stops an agent if you turn on hard stop.

## Where dots is better

Setup is zero if you already pay for Pro. You can reach your dot from your phone, in Slack or Teams, or call it by voice, and over 4,000 apps plug in. Proactive research brings you things you did not ask for, using read only access. Closing your laptop changes nothing. Nobody in a Munder Difflin office will answer the phone, and we have made our peace with that.

## Where Munder Difflin is better

It is free and open source, with no region list, and runs on macOS, Windows and Linux. You keep the engines and subscriptions you already have. You get a team of named agents today, not a roadmap item. Memory is a markdown file you can read, edit or put in git. And the files your agents touch stay on your machine.

## Is there an open source alternative to ChatGPT dots?

Yes, for work on code and files: Munder Difflin is MIT licensed. It does not try to match dots on personal errands across thousands of apps. Our [ChatGPT dots alternatives](/blog/chatgpt-dots-alternatives/) list covers the others.

## Pick dots if..., pick Munder Difflin if...

- **Pick ChatGPT dots** if you have Pro outside the EEA, Switzerland and the UK, or Business Premium anywhere, and want one agent for errands, inbox and research on your phone.
- **Pick Munder Difflin** if your agents work on code or files, you want several roles now, you want to choose the model, and the work should stay on your computer. [Download it free](https://harnessmd.com/download).

OpenAI's own advice holds for both: "Dots can still make mistakes, so always review consequential work."
