---
title: "What Is Vibe Coding? Meaning, Risks and Safer Habits"
description: "Vibe coding means building software from AI prompts without reading the code. Where the term came from, when it is fine, where it bites, and what to check."
date: 2026-09-14
category: concepts
categoryLabel: Concepts
type: Non-technical
primaryKeyword: "what is vibe coding"
secondaryKeywords: ["vibe coding meaning", "who coined vibe coding", "is vibe coding bad", "vibe coding vs agentic coding", "what is vibe coding in simple words"]
tags: ["Concepts", "Claude Code", "Security", "Getting Started"]
faq:
  - q: "Is vibe coding the same as coding with AI?"
    a: "No. Vibe coding is one way of coding with AI: the way where nobody reads what the model wrote. Reviewing, testing and understanding the output turns the same tool into ordinary AI assisted programming, even if the AI typed every line."
  - q: "Does vibe coding require coding skills?"
    a: "Not to start. You describe what you want in plain language and judge the result by running it. You need real skills the moment something breaks in a way the model cannot fix, or when the app starts holding other people's data."
  - q: "Which tools do people use for vibe coding?"
    a: "Anything that turns a prompt into running code: a chat window, an AI editor or a terminal agent such as Claude Code or Codex. Karpathy's own setup in his February 2025 post was Cursor's Composer with a Claude Sonnet model, driven by voice through SuperWhisper. The tool matters less than the habit, because the same tool works with or without review."
  - q: "Can vibe coding get you a job?"
    a: "Prompting on its own is a thin thing to hire for, since anyone can type a request. Teams pay for judgement: spotting when the output is wrong, writing the test that proves it, and keeping the code maintainable. Vibe coded side projects still show that you ship, as long as you can walk someone through how they work."
---

Vibe coding is building software by describing what you want to an AI model and accepting the code it writes without reading it. You judge the result by running the app, not by reviewing the code. Andrej Karpathy named it in February 2025. It suits throwaway projects and gets risky once real users or their data depend on it.

If you have ever asked an AI to build something and just run what came back, you have already vibe coded. The line that matters is not which tool you use but whether anyone checks what it produced, and that line matters more when several agents write code at once, which is the job of a [multi-agent harness](/blog/what-is-a-multi-agent-harness/), an app that runs several AI agents together.

You can do that checking yourself, or use [Munder Difflin](https://harnessmd.com/download), a free and open source desktop app that runs several AI coding agents as a team on your computer. Each agent gets its own job and can run a different AI, such as Anthropic's Claude Code or OpenAI's Codex, so one builds a feature while another reviews it. Michael, the lead agent, hands out the work, and anything that needs your decision waits on an ASK ME board until you answer.

## What does vibe coding mean?

It means you let the model write the code and you stop reading it. Karpathy's original [post on X](https://x.com/karpathy/status/1886192184808149383), dated 2 February 2025, describes the whole loop: he talked to Cursor's Composer through a voice app, accepted every change, pasted error messages back with no comment, and asked for random changes when a bug would not go away. His summary of the review step was blunt: "I don't read the diffs anymore."

Several of the pages that rank for this question stretch vibe coding to cover any AI assisted programming, which blurs the one thing the word was coined to describe. A fairer test is simple: if you read the diff (the lines the AI changed), ran the tests and could explain the code to a colleague, you were not vibe coding. You were writing software with a fast assistant.

{% img "note-1" %}

## Who coined vibe coding?

Andrej Karpathy, the AI researcher, coined it in that post on 2 February 2025. A year later he described it as an offhand post that happened to give a name to something a lot of people were already feeling.

Collins noticed. It named vibe coding its [Word of the Year 2025](https://blog.collinsdictionary.com/language-lovers/collins-word-of-the-year-2025-ai-meets-authenticity-as-society-shifts/) on 6 November 2025, describing it as using AI, prompted in natural language, to write computer code. The shortlist also had clanker, a derogatory term for computers, robots or AI. Of the two AI words on the list, Collins crowned the one that does not insult the machine.

## Is vibe coding bad?

No, not for the jobs it fits. Karpathy himself said it was not too bad for throwaway weekend projects, and that is still the honest range: a prototype to show an idea, a personal script that renames your photos, a one page internal tool or a demo you will delete on Friday. If it breaks, you lose an afternoon.

It bites in three places.

* **Security.** Veracode has tested more than 150 AI models since 2025 on 80 coding tasks. Its [Spring 2026 update](https://www.veracode.com/blog/spring-2026-genai-code-security/), published 24 March 2026, found that with no security instructions in the prompt only 55% of tasks produced secure code, while more than 95% had valid syntax. Clean syntax is not safe code, and a vibe coder only ever sees whether the app runs.
* **Maintenance.** Karpathy noted that his code grew past what he could follow without a long read. That is fine until the first bug the model cannot fix, and then someone has to read all of it at once.
* **Ownership.** On a team, code nobody has read has no owner. Review exists so that at least two people understand a change before it ships, and a model's confident summary is not a second person.

## How do you vibe code without the damage?

Keep the speed of prompting and add a check wherever a mistake gets expensive. Three habits cover most of it.

**Plan before editing.** Ask the agent for a plan and approve it before any file changes. In Claude Code that is [plan mode](/blog/how-to-use-claude-code-plan-mode/), where it reads files and proposes a plan but makes no edits until you approve ([Claude Code common workflows](https://code.claude.com/docs/en/common-workflows)). We tried it on 14 Sep 2026 with Claude Code 2.1.270 in an empty folder (output trimmed):

```
$ claude -p --permission-mode plan --model sonnet "Create a file called hello.txt containing the word hi."
**Plan:** Create `hello.txt` in the working directory containing the text `hi`, then read it back to confirm.
$ ls
$
```

It wrote the plan and stopped. The folder stayed empty, because nobody had said yes. In a normal session, pressing `Shift+Tab` cycles to plan mode.

**Make a test the finish line.** Tell the agent the task is done when a named test command passes, and have it paste the output. A green run you can see beats "all tests pass" in a summary. [How AI agents verify their own work](/blog/how-ai-agents-verify-their-own-work/) covers how to make agents prove what they claim.

**Put a second reader on anything that ships.** That can be you reading the diff, or a separate agent on a different model whose brief is only to review, so the model that wrote the code is not the only one that judged it. Keep passwords and keys out of prompts and out of generated code, and keep each diff small enough to read in one sitting.

{% img "note-2" %}

## What is the difference between vibe coding and agentic coding?

Oversight is the difference, not the tool. In vibe coding the model drives and nobody reviews. In agentic engineering, Karpathy's name for it, agents write most of the code while a person directs them and checks their work.

Karpathy drew the same split on 4 February 2026, a year after the original post. He [wrote](https://x.com/karpathy/status/2019137879310836075) that models in early 2025 were weak enough that vibe coding mostly meant toy projects and demos, and that programming through AI agents was becoming a default workflow for professionals, with more oversight and scrutiny. His favourite name for that was agentic engineering: agentic because you orchestrate agents and act as oversight instead of typing the code, engineering because it takes expertise you can learn.

So the word has split. Collins keeps the broad sense, any code an AI writes from plain language, while Karpathy's is narrower. In 2025 vibe coding was a cheerful name for a new habit. By 2026 it more often names the unreviewed end of AI coding, while the reviewed end picked up names like agentic engineering. If orchestrator and subagent are new words too, the [AI coding agent glossary](/blog/ai-agent-glossary/) defines each in a line.

Vibe code the prototype. Before it reaches real users, read it, test it, or hand it to someone who will.
