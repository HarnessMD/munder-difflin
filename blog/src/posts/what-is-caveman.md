---
title: "What is Caveman? The token saving skill for coding agents"
description: "Caveman (JuliusBrussee/caveman) is an open source skill and local proxy that makes coding agents say less and read less. Install, levels, limits."
date: 2026-11-25
category: concepts
categoryLabel: Concepts
type: Technical
primaryKeyword: "caveman"
secondaryKeywords: ["what is caveman", "caveman skill", "caveman claude code", "caveman token saving", "caveman proxy"]
tags: ["Concepts", "Open Source", "Skills", "Claude Code"]
faq:
  - q: "Is Caveman free and open source?"
    a: "Yes. The code is on GitHub at JuliusBrussee/caveman under the Apache-2.0 licence, per the GitHub API and the README, checked 25 Nov 2026. The README says only its Auto part needs an account, and that account is free."
  - q: "How do I install Caveman?"
    a: "Per the README, run `npx @caveman-ai/cli@latest`, which needs `Node.js` 22.13+. For the skill alone, with no proxy, run `npx skills add JuliusBrussee/caveman -g`."
  - q: "Does Caveman work with Claude Code?"
    a: "Yes. The README says that after install, plain `claude` stays caveman'd, and so do Codex, Gemini CLI, OpenCode and 30+ more. Inside Claude Code it also installs as a plugin: `/plugin marketplace add JuliusBrussee/caveman`, then `/plugin install caveman@caveman`."
  - q: "How many tokens does Caveman save?"
    a: "It depends on the work. The project's own figures, read 25 Nov 2026, show 33.2% fewer input tokens per session on 6 synthetic tasks with large tool output (18 pairs, Aug 2026 engine). In an example run (n=10) the README calls \"not a claim\", `/caveman` answers 3% shorter than a plain \"Answer concisely.\" control at the median. Its Honest Numbers page says Caveman can also cost tokens."
  - q: "Does Caveman send any data?"
    a: "The README says the skill runs on your machine and sends nothing, except that `/caveman-compress` sends the file you compress to your model provider. The CLI sends usage stats by default, never your prompts or code; `caveman telemetry off` or `DO_NOT_TRACK=1` turns that off. Auto, once you sign in and pick it, sends Caveman Cloud your latest ask."
---

Caveman is an open source skill and local proxy that makes coding agents give shorter answers and read smaller tool output. Its [GitHub repo](https://github.com/JuliusBrussee/caveman) is JuliusBrussee/caveman, under the Apache-2.0 licence, with the tagline "why use many token when few token do trick". Checked 25 Nov 2026.

If you run AI agents, [Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. Its agents run on engines such as Claude Code, Codex and Gemini CLI. The [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup.

## What is Caveman?

"Caveman make your AI agent say less and read less", per the [README](https://github.com/JuliusBrussee/caveman#readme), which adds: "Code stay exact. Brain still big." The [docs](https://docs.caveman.so/caveman) describe two parts, "a response skill that shortens what the agent says, and a local proxy that shrinks what the agent reads", and say both "run on your machine, with your keys".

In the README's React example, a normal agent explains the problem in 63 tokens. The Caveman agent says "New object ref each render, so React re-renders. Wrap the prop in `useMemo`." in 20 tokens. "Same fix. 63 token become 20." The README counts tokens with tiktoken o200k.

<figure class="mg" data-scene="telegram"><img src="/blog/assets/media/what-is-caveman/telegram.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a long soft white letter covered in lilac lines carries a sky tag reading 63 tokens. It folds down, one fold at a time, into a short yellow telegram strip with a mint tag reading 20 tokens, and a blue stamp reading same fix lands on the strip. Tap the strip to unfold the letter and play it again."><figcaption>The README's example: same fix, 63 tokens become 20. Read 25 Nov 2026.</figcaption></figure>

## How does Caveman work?

A skill sets the agent's voice and a local proxy shrinks what it reads, each with its own switch. Per the README, every reply is "Answer first", with "One idea per sentence" and "20 words max", while "Code, commands, paths, and error messages" stay "untouched, character for character". The voice "Knows when to stop": "Security warnings, irreversible actions, and confused users get full sentences."

For the proxy, the README says: "Logs, JSON, CSV, test output shrink before the model reads them." It adds: "Every original stays on your disk. The agent can pull it back any time."

Since version 4.0, per the README, "caveman is six parts. All on after install. Each has its own switch."

| Part | What it does, per the README |
| --- | --- |
| Say less | "Agent answers short. Code stays exact" |
| Read less | "Logs, JSON, CSV, test output shrink before the model reads them" |
| Auto | "Picks the model and the effort for each ask" |
| Blocks | "Code mode: agent keeps the scripts it writes and runs them again" |
| Waste fixes | "Finds where your tokens go and fixes it" |
| Browse | "Web pages come back compressed" |

<figure class="mg" data-scene="satchel"><img src="/blog/assets/media/what-is-caveman/satchel.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a yellow satchel has six blue pockets labelled Say less, Read less, Auto, Blocks, Waste fixes and Browse. A lilac zipper closes across the top, and a mint tag on the yellow strap reads six parts. Each pocket glows mint in turn. Tap a pocket to turn it soft white, and tap again to make it glow mint."><figcaption>Since 4.0, Caveman is six parts, all on after install, each with its own switch. Read 25 Nov 2026.</figcaption></figure>

The skill has three levels: `/caveman`, `/ultracave` and `/megacave`. The README calls them "The voice, the grunt, the 文言文", and on its React example they take 20, 14 and 13 tokens.

## How do you install and use Caveman?

One command installs every part, per the README:

```bash
npx @caveman-ai/cli@latest
```

It runs on "Mac, Linux, Windows" and "Needs `Node.js` 22.13+". After that, the README says, "plain `claude` stays caveman'd. So do Codex, Gemini CLI, OpenCode, and 30+ more." It "runs on your machine, with your keys and your Claude Pro/Max login."

For the skill alone, with no proxy:

```bash
npx skills add JuliusBrussee/caveman -g
```

"Type `/caveman` (`$caveman` in Codex) if it doesn't start on its own. Say `stop caveman` to go back."

In Claude Code, the README also offers a plugin:

```text
/plugin marketplace add JuliusBrussee/caveman
/plugin install caveman@caveman
```

`caveman status` "shows what is on" and `caveman off browse` "turns one off". "Only Auto needs an account, and it is free." To remove the skill, run `npx skills remove JuliusBrussee/caveman -g`.

## What does Caveman change, and what does it save?

It shortens answers and shrinks tool output. Every number here is the project's own, from the README or its [Honest Numbers](https://github.com/JuliusBrussee/caveman/blob/main/docs/HONEST-NUMBERS.md) page, read 25 Nov 2026.

On input, the README reports "33.2% fewer input tokens per session", on "6 synthetic large-tool-output tasks, 18 pairs, Aug 2026 engine", with "18 of 18 answers right". HTML has no compressor yet, and that Aug 2026 session came out "9.9% worse". In the README's words: "Yours will vary."

<figure class="mg" data-scene="scroll"><img src="/blog/assets/media/what-is-caveman/scroll.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a long sky scroll unrolls with soft white rows labelled logs, JSON, CSV and test output. Yellow scissors snip along it until only a short soft white note remains, reading 33.2% fewer input tokens. The trimmed part rolls into a blue box labelled every original stays on your disk. Tap the box to roll the full scroll back out."><figcaption>The project's own figure, from 6 synthetic tasks, 18 pairs, Aug 2026 engine: 33.2% fewer input tokens per session. Read 25 Nov 2026.</figcaption></figure>

The other parts, in the project's own figures as read 25 Nov 2026:

* **Say less:** against a plain "Answer concisely." control, "`/caveman` cuts 3% more at the median and `/ultracave` 35% more". The README calls it an "Example run, n=10, not a claim", "Measured on the 3.1.0 rules, not yet re-run."
* **Auto:** "0.46× the cost of Opus at xhigh in an interim run (85 tasks); quality gap unresolved".
* **Blocks:** "397 → 76 tokens for one test run", against `| tail -20`.

## When does Caveman help, and when should you be careful?

Per the project's own table, it saved the most on sessions that read CSV files and logs, and HTML came out worse. The Honest Numbers page also says: "Caveman save tokens sometimes. Caveman cost tokens sometimes." The project names these limits:

* **The rules cost input.** "The rules cost about 1,160 tokens of input", per the README. For "Terse coding Q&A", the Honest Numbers page says "fixed prompt overhead can exceed any output reduction."
* **Billing by request.** The README says "if you pay per request (GitHub Copilot), shorter answers save nothing."
* **No quality claim for the voice yet.** Per the Honest Numbers page, its token counts "do not prove semantic or technical equivalence", and "no reviewed fidelity snapshot is committed, so no quality claim is published."
* **Usage stats.** "The CLI sends usage stats by default", but "Never your prompts, code, file paths, or scripts you wrote." Turn them off with `caveman telemetry off` or `DO_NOT_TRACK=1`. The skill "runs on your machine and sends nothing", except `/caveman-compress`, which "sends the file you compress to your configured model provider."
* **Auto sends your ask.** Once you sign in and pick Auto, each ask sends Caveman Cloud "your latest ask", among other details the README lists.

Its rule of thumb: "If Caveman increases billed cost for the same task, turn it off for that workload."

Our view: on a Claude Pro or Max plan, fewer tokens mean more room before a usage limit, not a lower plan price. Our [Max plan guide](/blog/claude-code-max-plan-tips/) covers those limits.

## How does Caveman relate to our pages?

Three of our pages cover nearby ground. They are [Claude Code Pricing (Oct 2026): US and India Plans, Is It Free?](/blog/how-much-does-claude-code-cost/), [Claude Code Skills: What They Are, Where They Live and How to Write One](/blog/claude-code-skills/) and [What is Superpowers? The skills library for coding agents](/blog/what-is-superpowers/).

## Caveman at a glance

Checked 25 Nov 2026.

| Item | Detail |
| --- | --- |
| What it is | A skill and local proxy for coding agents |
| Made by | Julius Brussee, per the README's citation |
| Code | JuliusBrussee/caveman on GitHub, created 4 Apr 2026 |
| Licence | Apache-2.0 |
| Latest release | [v4.2.0](https://github.com/JuliusBrussee/caveman/releases/tag/v4.2.0), 22 Nov 2026 |
| Stars | 122,716 at 09:41 UTC on 25 Nov 2026 |
| Agents named | Claude Code, Codex, Gemini CLI, OpenCode "and 30+ more" |

<link rel="stylesheet" href="/blog/assets/media/what-is-caveman/motion.css"><script defer src="/blog/assets/media/what-is-caveman/motion.js"></script>
