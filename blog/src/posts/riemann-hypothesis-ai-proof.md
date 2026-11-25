---
title: "Riemann Hypothesis Proof With Claude, Checked in Lean (Nov 2026)"
description: "Levent Alpöge says he found a Riemann Hypothesis proof working with Claude. Lean's community certified it on 21 Nov 2026. What happened and how it was checked."
date: 2026-11-22
category: concepts
categoryLabel: Concepts
type: Non-technical
primaryKeyword: "riemann hypothesis proof"
secondaryKeywords: ["riemann hypothesis solved", "claude riemann hypothesis", "ai proof riemann hypothesis", "lean proof", "levent alpoge", "generalized riemann hypothesis"]
tags: ["Concepts", "AI Agents", "Claude Code"]
faq:
  - q: "Has the Riemann Hypothesis been proved?"
    a: "Levent Alpöge announced a proof, and the Lean and Mathlib communities certified it. Their statement of 21 Nov 2026 says \"We hereby certify that both the statement and the proof of the Riemann Hypothesis are correct.\" For now Alpöge presents it only as Lean code."
  - q: "What did Claude do in the Riemann Hypothesis proof?"
    a: "In Alpöge's words: \"I believe I have, working with Claude, discovered a proof of the Riemann Hypothesis.\" He writes that \"Claude far outpaced me near the finish line\" and that \"Claude and I have also formalized the arguments without assumptions.\" Terence Tao describes Alpöge as \"using an internal AI model\"."
  - q: "How was the Riemann Hypothesis proof checked?"
    a: "In Lean, by people and programs. The Lean community statement of 21 Nov 2026 says experts vetted the statement and several proof checkers, including Lean's official kernel, checked the exported proof. Andrew Sutherland's MIT page, with \"checks run with Claude Code\", showed at 04:35 UTC on 22 Nov 2026 the nanoda and con-leche kernels accepting the export and the Lean kernel on the export still running."
  - q: "What is the Riemann Hypothesis?"
    a: "It is a question about how prime numbers are spread out. Alpöge's note says \"It asks for optimal control on the count of prime numbers of a given size.\" Wikipedia's lead, read 22 Nov 2026, says it was first posed in 1859 by Bernhard Riemann."
  - q: "Was there a second proof of GRH on 20 Nov 2026?"
    a: "Ravi Vakil posted a separate proposed proof by Alessandro Maria Masullo that day and called it \"all human, with no AI\". About 8 hours later he wrote that people had reported problems \"identified with the assistance of different AI models\", and that \"all issues need to be resolved to the satisfaction of the community before this proof would be accepted as true.\""
---

On 20 Nov 2026 the mathematician Levent Alpöge announced a [proof of the Riemann Hypothesis](https://alpo.ge/remark.pdf) that he says he found "working with Claude", presented only as Lean code. On 21 Nov the [Lean and Mathlib communities](https://leanprover-community.github.io/blog/posts/riemann-hypothesis/) wrote: "We have full confidence that Alpöge's proof of the Riemann Hypothesis is correct."

If you run Claude yourself, [Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. It runs engines such as Claude Code, Codex and Gemini CLI. People use it to run long Claude Code jobs on their own computer or in the Cloud Office, where agents run in the cloud, always on, even with your computer off. The [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup.

## What happened with the Riemann Hypothesis proof?

Alpöge's undated [note](https://alpo.ge/remark.pdf) makes the claim. "I believe I have, working with Claude, discovered a proof of the Riemann Hypothesis," it says, and "the method easily extends much further, resolving the so-called Generalized Riemann Hypothesis", or GRH. The Lean and MIT pages date it to 20 Nov 2026.

[Terence Tao](https://terrytao.wordpress.com/2026/11/20/unforced-euler-singularity-unforced-navier-stokes-singularity-and-the-generalized-riemann-hypothesis/) wrote on 20 Nov 2026 that Alpöge, "using an internal AI model, has generated an (enormous) Lean-only proof of the Generalized Riemann Hypothesis." Tao also lists two fluid results. Alpöge, Tristan Buckmaster and Matei Coiculescu, "with heavy AI assistance", wrote "a human-readable proof" of finite time blowup for the "unforced incompressible Euler equations in three dimensions", formalized in Lean. Alpöge and Buckmaster, "again with heavy AI usage", generated one for the Navier Stokes equations, "again with a Lean formalization". Tao calls that paper "technically human-readable" and says "more work needs to be done to create a proper, professionally written proof".

[Scott Aaronson](https://scottaaronson.blog/?p=10344) titled his post of 20 Nov "The stochastic parrots have apparently proved the Riemann Hypothesis". On 22 Nov, [Hacker News](https://news.ycombinator.com/item?id=50574968) shows 2,882 points for "Levent Alpöge claims proof of the Generalized Riemann Hypothesis". Our [brief of 21 Nov](/blog/agent-tools-today-2026-11-21/) covered the first reports.

## What is the Riemann Hypothesis?

The Riemann Hypothesis is a question about how prime numbers are spread out. Alpöge's note says: "It asks for optimal control on the count of prime numbers of a given size." [Wikipedia's lead](https://en.wikipedia.org/wiki/Riemann_hypothesis), read 22 Nov 2026, says it was first posed in 1859 by Bernhard Riemann and "implies bounds on the distribution of prime numbers."

<figure class="mg" data-scene="telescope"><img src="/blog/assets/media/riemann-hypothesis-ai-proof/telescope.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a blue telescope on a soft white stand sweeps slowly along a long row of soft white tiles. As it passes, some tiles light up yellow at uneven gaps, and a lilac sign above the row reads prime numbers. Tap the telescope to sweep the row again."><figcaption>The Riemann Hypothesis "implies bounds on the distribution of prime numbers", per Wikipedia's lead, read 22 Nov 2026.</figcaption></figure>

## What did Claude do, in Alpöge's words?

By his account, Claude worked with him on both the proof and its Lean code. In his words, "this time Claude far outpaced me near the finish line." He adds: "I guided us to the right situation analogous to that toy setting, and then Claude began to leave me in awe."

"Claude and I have also formalized the arguments without assumptions," the note says. Formalized means written as Lean code, which programs can check.

He gives "a rough timeline Claude provided after a thorough search", running from 6 Oct 2026 to its last line, "11/16/26: GRH". Tao writes that the strategy of proof, "from very initial analysis", "appears to use the full power of modern developments on the Langlands program and arithmetic geometry".

Why Lean only? He writes that it would be "obviously inappropriate to attempt to post some massive unreadable travesty", so "I decided to only present Lean." In a footnote he writes that he hit 250,000+ pages, and that Claude called it the GRH "book". He calls the argument "incredibly long at the moment" and says he will do his best "to write it properly".

## How was the Riemann Hypothesis proof checked?

In Lean, by people and programs: the Lean and Mathlib communities checked it, and so did Andrew Sutherland at MIT.

The [joint statement](https://leanprover-community.github.io/blog/posts/riemann-hypothesis/) of the Lean and Mathlib communities, posted 21 Nov 2026 at 13:55 UTC, describes "a Lean library comprising 17 million lines of code" and says: "We hereby certify that both the statement and the proof of the Riemann Hypothesis are correct." It says four criteria "are all satisfied":

1. The statement is Mathlib's own, "carefully vetted by experts in Lean and number theory".
2. The library compiles: "dozens of people have reported correct compilation".
3. Two independent tools confirm the code proves exactly that statement.
4. The exported proof "has been checked by several proof checkers, including Lean's official kernel". Two, con-leche and con-ron, "come with a formal proof, relative to set theory, that they cannot accept a false proof".

Sutherland's [MIT page](https://math.mit.edu/~drew/grh/) says "checks run with Claude Code". As of its last update, 04:35 UTC on 22 Nov 2026, all 175,187 modules compile, and two independently written kernels, nanoda and con-leche, accept the full exported proof, which is 61,570,595,788 bytes. Two checks were still running: the Lean kernel, in its default and paranoid modes, on the export ("no verdict yet"), and an end to end lake comparator run.

Its GRH checks cover Dirichlet L-functions; "automorphic L-functions in general are not among the statements that were checked." It adds that a passing check "relies on those kernels and on Mathlib's definitions being what they are intended to be."

<figure class="mg" data-scene="beacon"><img src="/blog/assets/media/riemann-hypothesis-ai-proof/beacon.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, three beacons stand on a soft white rail. The first, labelled 175,187 modules, lights up mint, then the second, labelled nanoda, lights up mint. The third, labelled Lean kernel, blinks sky under a yellow tag reading still running. Tap a beacon to replay the checks in order."><figcaption>The MIT page at 04:35 UTC on 22 Nov 2026: 175,187 modules compile, nanoda accepts, the Lean kernel on the export is still running.</figcaption></figure>

## What about the other GRH proof announced the same day?

A separate proposed proof of GRH, by Alessandro Maria Masullo, appeared on 20 Nov 2026 in a [post by Ravi Vakil](https://math216.wordpress.com/2026/11/20/hurried-announcement-alessandro-masullo-grh/), who wrote: "It is all human, with no AI."

About 8 hours later Vakil added that people had reported problems, "identified with the assistance of different AI models", and that "all issues need to be resolved to the satisfaction of the community before this proof would be accepted as true." He also wrote: "I make no claim as to the correctness of the proof strategy."

<figure class="mg" data-scene="scale"><img src="/blog/assets/media/riemann-hypothesis-ai-proof/scale.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a soft white balance scale holds two cards. The left pan holds a blue card reading Alpöge with a mint tag reading with Claude. The right pan holds a lilac card reading Masullo with a yellow tag reading all human. The scale sways gently and settles level. Tap the scale to make it sway again."><figcaption>Two proposed proofs of GRH, both 20 Nov 2026: Alpöge's, working with Claude, and Masullo's, "all human, with no AI", per Vakil.</figcaption></figure>

## What does the Riemann Hypothesis proof mean for AI agents?

Our view: this is long running AI work checked largely by machines. Three of the Lean community's four criteria rest on programs that ran, and the MIT page lists "checks run with Claude Code". We think that pairing, a long job plus an independent automatic check, is worth copying in everyday agent work. For long Claude Code jobs, see [how to use Claude Code](/blog/how-to-use-claude-code/) and [Claude Code automation while you sleep](/blog/claude-code-automation-while-you-sleep/).

## Riemann Hypothesis proof at a glance, checked 22 Nov 2026

| | Riemann Hypothesis proof |
| --- | --- |
| Announced | 20 Nov 2026, per the Lean and MIT pages |
| Made with | Claude, in Alpöge's words; "an internal AI model", in Tao's |
| Form | Lean only; "17 million lines of code", per the Lean community |
| MIT page checked | The Riemann Hypothesis, and GRH for Dirichlet L-functions |
| Lean community | Certified on 21 Nov 2026 at 13:55 UTC |
| MIT checks | Run with Claude Code; 175,187 modules compile; nanoda and con-leche accept |
| Still running | Lean kernel on the export, 04:35 UTC on 22 Nov 2026 |
| Written proof | Alpöge says he will do his best "to write it properly" |

<link rel="stylesheet" href="/blog/assets/media/riemann-hypothesis-ai-proof/motion.css"><script defer src="/blog/assets/media/riemann-hypothesis-ai-proof/motion.js"></script>
