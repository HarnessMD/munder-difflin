---
title: "Claude Fable 5.2: price, fast mode, Mythos 5.2 and when to pick it"
seoTitle: "Claude Fable 5.2: Price, Fast Mode and Fable vs Opus 5.5"
description: "Claude Fable 5.2 is Anthropic's model for the hardest technical work. Its price as of 9 Nov 2026, fast mode, Mythos 5.2 and when to pick it."
date: 2026-11-10
category: concepts
categoryLabel: Concepts
type: Non-technical
primaryKeyword: "claude fable 5.2"
secondaryKeywords: ["claude mythos 5.2", "claude fable 5.2 pricing", "claude fable 5.2 fast mode", "fable 5.2 vs opus 5.5", "claude-fable-5-2"]
tags: ["Concepts", "Claude Code", "AI Agents"]
faq:
  - q: "How much does Claude Fable 5.2 cost?"
    a: "Anthropic's announcement of 9 November 2026 lists $8 per million input tokens and $40 per million output tokens. Fast mode costs $16 and $80. Checked 10 Nov 2026."
  - q: "What is the difference between Claude Fable 5.2 and Mythos 5.2?"
    a: "Anthropic says they are the same underlying model. Fable has cybersecurity and biology safeguards and is open to all users. Mythos 5.2 is for organizations accepted into Anthropic's Cyber or Life Sciences Verification Programs."
  - q: "Should I use Claude Fable 5.2 or Opus 5.5?"
    a: "Anthropic recommends starting most coding and knowledge tasks on Opus 5.5 and moving up to Fable for the most ambitious technical work, or when Opus 5.5 at higher effort still falls short."
  - q: "What is the model ID for Claude Fable 5.2?"
    a: "It is claude-fable-5-2 on the Claude API, Google Cloud, Microsoft Foundry and Claude Platform on AWS, and anthropic.claude-fable-5-2 on Amazon Bedrock, according to Anthropic's models page read on 10 Nov 2026."
  - q: "Is Claude Fable 5.2 in Claude Code?"
    a: "Yes. The Claude Code v2.1.321 release notes of 9 November 2026 say it added Claude Fable 5.2, now the default Fable model."
---

Claude Fable 5.2 is Anthropic's model for the hardest technical work, priced at $8 per million input tokens and $40 per million output tokens as of 9 Nov 2026, per its [announcement](https://www.anthropic.com/claude-fable-and-mythos-5-2). Anthropic still says to start most work on Opus 5.5 and move up when the job needs it. Checked 10 Nov 2026.

It is for people who hand a model big, loosely defined technical jobs and accept a higher price per token. For ordinary coding, writing and analysis, Anthropic's own advice points to Opus 5.5 first. The [Hacker News thread](https://news.ycombinator.com/item?id=50429068) had 488 points and 752 comments by 10 Nov 2026. Our [Agent Tools Today for 10 Nov](/blog/agent-tools-today-2026-11-10/) has the rest of that day's news.

## What changed in Fable 5.2?

It is faster and cheaper than Fable 5.1, and stronger on Anthropic's own benchmarks. The announcement, dated 9 Nov 2026, says Fable 5.2 and Mythos 5.2 "generate outputs up to 30% faster than Claude Fable 5.1 and Claude Mythos 5.1". That is the vendor's own figure.

The price dropped too. Anthropic's [pricing page](https://platform.claude.com/docs/en/about-claude/pricing), read on 10 Nov 2026, still lists Fable 5.1 at $10 input and $50 output per million tokens.

Anthropic also says the safety filters get in the way less often. Its 9 Nov 2026 page says that in early testing it "observed about 55% fewer blocks with Fable 5.2 compared with Fable 5.1".

A few of Anthropic's own figures, from its 9 Nov 2026 table:

* **FrontierCode 2.0:** 49.1% at Xhigh effort, against 45.5% for Opus 5.5 and 32.4% for Fable 5.1.
* **FrontierSWE v2:** 69.9%, against 62.3% for Opus 5.5.
* **OSWorld 2.1, offline set, partial:** 89.3%, against 87.2% for Opus 5.5.

## Fable 5.2 or Mythos 5.2?

Most people get Fable 5.2, because Mythos 5.2 is for vetted organizations. Anthropic puts it plainly: "Claude Fable and Claude Mythos are the same underlying model. Fable has strong cybersecurity and biology safeguards to guard against misuse, which allows us to make it available to all users."

So the difference is the filters, not the brain. Same model, two names, and one of them needs a hall pass. Organizations in cybersecurity or biomedical research can apply for Mythos through Anthropic's Cyber Verification Program or its Life Sciences Verification Program. Claude Enterprise customers also get Mythos 5.2 inside Claude Security, per the announcement.

The announcement warns that Fable 5.2's safeguards "will block most cybersecurity-related tasks". When a query is blocked, users get an answer from Opus 4.8 for cybersecurity and Opus 5 for biology instead. Anthropic's pricing page, read 10 Nov 2026, lists Mythos 5.2 at the same $8 and $40.

<figure class="mg" data-scene="mugs"><img src="/blog/assets/media/claude-fable-5-2/mugs.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. Two identical white mugs slide in side by side on a white table. One reads Fable 5.2 and a blue lid that reads safeguards drops onto it. The other reads Mythos 5.2 and a small green card in front of it reads apply for access. A line under both reads same underlying model. Tapping a mug lifts its lid or card."><figcaption>Anthropic says Fable 5.2 and Mythos 5.2 are the same underlying model, with safeguards on Fable. Announcement of 9 Nov 2026.</figcaption></figure>

## How much does Claude Fable 5.2 cost?

It costs $8 per million input tokens and $40 per million output tokens as of 9 Nov 2026, and fast mode doubles that to $16 and $80. Anthropic says fast mode "speeds up token generation by up to 2.5 times".

| Per 1M tokens | Input | Output |
| --- | --- | --- |
| Fable 5.2, standard, 9 Nov 2026 | $8 | $40 |
| Fable 5.2, fast mode, 9 Nov 2026 | $16 | $80 |
| Fable 5.1, pricing page, 10 Nov 2026 | $10 | $50 |
| Opus 5.5, pricing page, 10 Nov 2026 | $4 | $20 |

The pricing page, read 10 Nov 2026, lists cache hits on Fable 5.2 at $0.20 per million tokens. It also says fast mode is not available with the Batch API.

<figure class="mg" data-scene="menu"><img src="/blog/assets/media/claude-fable-5-2/menu.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A chalk menu board on a white wall fills in line by line in blue and green chalk. It reads Fable 5.2, then Standard: $8 input, $40 output, then Fast mode: $16 input, $80 output, then per million tokens, 9 Nov 2026. Tapping the board moves a chalk underline between the standard and fast mode lines."><figcaption>Standard and fast mode prices per million tokens, from Anthropic's announcement of 9 Nov 2026.</figcaption></figure>

## When should you use Fable 5.2 instead of Opus 5.5?

Use Fable 5.2 when the job is large, open and technical, or when Opus 5.5 has already fallen short. Anthropic's own words: "Fable and Mythos are best for the most ambitious, open-ended technical work. For most coding and knowledge tasks, we recommend that users start with Claude Opus 5.5, our strongest daily driver, and then switch to a different model as required".

Anthropic's [models page](https://platform.claude.com/docs/en/models/overview), read 10 Nov 2026, says the same thing in fewer words: use Fable 5.2 "for demanding reasoning and long-horizon agentic work, or when your evals on Claude Opus 5.5 at higher effort still fall short."

Per token, Opus 5.5 is half the price. Per task, Anthropic argues the gap can close. On FrontierCode 2.0 it says Fable 5.2 at High effort "scores about the same as Opus 5.5’s best score (45.3% vs. 45.5%) for roughly half the cost per task". That is Anthropic's own figure from 9 Nov 2026. Our view: check it against your own bills before you switch everything.

Commenters on Hacker News raised two talking points by 10 Nov. Some said you have to push the ambition of a prompt to see a clear gap over Opus 5.5. Others argued about how much understanding of the code people give up as models take on bigger jobs.

<figure class="mg" data-scene="seesaw"><img src="/blog/assets/media/claude-fable-5-2/seesaw.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A wooden seesaw rests with the end that reads Opus 5.5 on the ground and a tag that reads start here. A blue block that reads harder job drops onto the other end, which reads Fable 5.2, and the seesaw tips toward it. Tapping the block lifts it off and the seesaw tips back to Opus 5.5."><figcaption>Anthropic recommends starting most coding and knowledge tasks on Opus 5.5 and moving up to Fable when needed. Announcement of 9 Nov 2026.</figcaption></figure>

## Where can you use it?

On every platform Anthropic sells through. The announcement says Fable 5.2 "is available today on all platforms, including Amazon Web Services, Google Cloud, and Microsoft Azure".

* **Model ID:** `claude-fable-5-2`, or `anthropic.claude-fable-5-2` on Amazon Bedrock, per the models page.
* **Context:** a 1M token context window and 128K tokens of output, per the same page.
* **Fast mode:** the announcement lists "Claude Code, the Claude Platform, Claude Models on Google Cloud (Anthropic managed and Google managed), and Microsoft Foundry (Anthropic hosted)".
* **Claude Code:** the [v2.1.321 release notes](https://github.com/anthropics/claude-code/releases/tag/v2.1.321), published 9 Nov 2026, say "Added Claude Fable 5.2 (`claude-fable-5-2`), now the default Fable model".

For subscribers, the 9 Nov 2026 announcement describes a launch week offer: "Fable is included for up to 50% of weekly usage limits for Pro plans and standard seats on the Team plan."

## Running Fable 5.2 inside a team of agents

Pick the model inside each engine, because that is where the setting lives. The same holds when an engine runs inside [Munder Difflin](https://harnessmd.com/download), which is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. It runs engines such as Claude Code, Codex and Gemini CLI, and the model an engine uses is that engine's setting.

Anthropic describes two team roles for Fable 5.2. As an Advisor, "Haiku, Sonnet, or Opus models consult it to help solve harder problems". As an Orchestrator, "it delegates simpler tasks to smaller models".

We think that is the sane split: one expensive planner, several cheaper workers. Our page on [Claude Haiku 5.5](/blog/claude-haiku-5-5/) covers the small end, and our [Claude Code Max plan tips](/blog/claude-code-max-plan-tips/) cover usage limits. The [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup, and the [Concepts hub](/blog/topics/concepts/) explains the terms.

<link rel="stylesheet" href="/blog/assets/media/claude-fable-5-2/motion.css"><script defer src="/blog/assets/media/claude-fable-5-2/motion.js"></script>
