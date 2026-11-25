---
title: "What is Cogentic? Google's AI Agent Team That Writes Math Proofs"
seoTitle: "What is Cogentic? Google's AI Agent Team for Math Proofs"
description: "Cogentic is a Google research harness where AI agents find and check proofs. Its factoring paper's bound is subexponential, not polynomial; it never names RSA."
date: 2026-11-26
category: concepts
categoryLabel: Concepts
type: Non-technical
primaryKeyword: "cogentic"
secondaryKeywords: ["cogentic google", "cogentic integer factorization", "ai integer factorization", "does ai break rsa", "multi agent harness math"]
tags: ["Concepts", "AI Agents"]
faq:
  - q: "What is Cogentic?"
    a: "A research harness built at Google Research and Google DeepMind. Its arXiv paper, submitted 30 Sep 2026, calls it \"a multi-agent harness for automated proof discovery on open research problems\": an orchestrator sends independent provers down different routes, their output faces adversarial verification, and confirmed results go into a verified ledger."
  - q: "Does Cogentic's factoring paper break RSA?"
    a: "The paper does not claim to, and read on 25 Nov 2026 it never mentions RSA or encryption. Its bound, L_N[1/3, 105], is subexponential, not polynomial. It matches the exponent 1/3 of the General Number Field Sieve, which the paper says runs in L_N[1/3, (64/9)^(1/3)] only under unproven heuristics; its own constant, 105, is far larger."
  - q: "What papers has Cogentic produced?"
    a: "Google Research's folder, checked 25 Nov 2026, lists ten: one dated 30 Oct 2026, one dated 18 Nov, two dated 23 Nov and six dated 25 Nov, among them \"Unconditional Integer Factorization in Time L_N[1/3, O(1)]\"."
  - q: "Which AI model does Cogentic use?"
    a: "Its arXiv abstract says \"either Gemini 3.1 Pro or an early version of Gemini 4 Argon as the base model\". The factoring paper's README says that paper was obtained \"using Gemini 4 as the base model\"."
  - q: "Is Munder Difflin the same as Cogentic?"
    a: "They are different things. Cogentic is Google's research harness for math proofs. Munder Difflin is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. It does not prove theorems."
---

Cogentic is a [research harness](https://arxiv.org/abs/2609.40324) from Google Research and Google DeepMind in which several AI agents try proofs, others check them, and checked steps are kept for later rounds. Does its new factoring paper break RSA? It does not claim to: its bound is subexponential, not polynomial, and it never mentions RSA. Checked 25 Nov 2026.

[Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. The [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup.

## What is Cogentic?

Cogentic is, in its own paper's words, "a multi-agent harness for automated proof discovery on open research problems". The paper, [Cogentic: Multi-Agent Orchestration for Automated Proof Discovery](https://arxiv.org/abs/2609.40324), was submitted to arXiv on 30 Sep 2026 by Yang Cai, Vineet Gupta, Yanchen Jiang, Christopher Liaw, Aranyak Mehta, Grigoris Velegkas and Di Wang.

Its abstract describes "an iterative prove-verify loop in which an orchestrator allocates a population of independent provers across distinct proof directions, subjects their output to adversarial verification by several specialized components, and promotes confirmed intermediate results into a persistent verified ledger that later rounds build on."

In plain words: each prover takes a different route, several checker components try to break what comes back, and only what survives goes into the ledger for the next round.

<figure class="mg" data-scene="relay"><img src="/blog/assets/media/what-is-cogentic/relay.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, blue cards labelled prover slide along soft white lanes toward a lilac card labelled checker. The checker turns each card over: some get a mint tick and slide into a yellow box labelled ledger, and the rest slide back to the start of their lane. Tap the lanes to run the relay again."><figcaption>Cogentic's arXiv paper, 30 Sep 2026: provers, adversarial verification, a verified ledger.</figcaption></figure>

The base model is "either Gemini 3.1 Pro or an early version of Gemini 4 Argon", the abstract says (see our [Gemini 4 Argon page](/blog/gemini-4-argon/)). Its first results came "on open problems across online learning, auction theory, and mechanism design", and of those it says "Each result was independently verified by domain experts."

## What did Cogentic publish on 25 Nov 2026?

Six papers, in a [Google Research folder on GitHub](https://github.com/google-research/google-research/tree/master/cogentic_research_papers) that "holds research papers that were produced by Cogentic". Checked 25 Nov 2026, it lists ten papers by date:

- **25 Nov 2026:** "Unconditional Integer Factorization in Time L_N[1/3, O(1)]", "Discrete Logarithms in Finite Fields of Fixed Characteristic in Sub-Quasi-Polynomial Time", "An Exact Polynomial-Time Algorithm for 1/5-Approximate Nash Equilibria in Bimatrix Games", "Unconditional Deterministic Subexponential Integer Factoring and Quadratic Nonresidue Construction", "Breaking the Square-Root Barrier for the Log-Rank Conjecture" and "Unconditional Edge Reconstruction of Simple Graphs of Linear Density".
- **23 Nov 2026:** "Nearly Tight O(log log log m) Prophet Inequalities for Subadditive Combinatorial Auctions" and "Polynomial Dimension Dependence for Fictitious Play Convergence".
- **18 Nov 2026:** "Near-Quadratic Sample Compression for All VC Classes".
- **30 Oct 2026:** "Intractability of Approximate Correlated Equilibria in Two-Player Convex Games".

The folder is under the Apache 2.0 license "Unless otherwise noted in individual subdirectories"; the factoring paper is under CC-BY-4.0. Both READMEs say: "This is not an official Google product." [Hacker News](https://news.ycombinator.com/item?id=50642086) showed 366 points when checked on 25 Nov 2026.

## What does Cogentic's factoring paper prove?

The paper says it proves a time bound for splitting any whole number into its prime factors on a classical computer, with no unproven assumptions. The [paper's README](https://github.com/google-research/google-research/tree/master/cogentic_research_papers/integer_factorization) says it "constructs an unconditional, zero-error Las Vegas algorithm" that "computes the exact complete prime factorization" of every integer N ≥ 2, "in worst-case expected time L_N[1/3, 105] and worst-case deterministic workspace L_N[1/3, 40]", where:

```
L_x(α, c) := exp(c (ln x)^α (ln ln x)^(1-α))
```

**Unconditional** means the proof rests on "no unproven number-theoretic hypotheses", per the README. A **Las Vegas algorithm** flips coins to choose its steps but never gives a wrong answer; only its running time varies. **Subexponential** means the work grows faster than any polynomial in the number of digits, but slower than an exponential; for α between 0 and 1, [Wikipedia's L notation page](https://en.wikipedia.org/wiki/L-notation) calls it "subexponential of ln n (and superpolynomial)".

Each prime factor "is certified deterministically" by the Agrawal, Kayal and Saxena (AKS) primality test and "direct multiplication against N", so the answer is checked first. A Lean 4 version of the proof, which a program can check, "has also been completed and will be released in a companion submission."

"This paper and its Lean 4 formalization were entirely obtained by Cogentic", the README says, "using Gemini 4 as the base model", with "no human interaction other than the initial prompt".

## Does Cogentic's factoring paper break RSA?

The paper does not say so, and it never mentions RSA, encryption or key sizes. Factoring is why the question comes up: [Wikipedia's RSA page](https://en.wikipedia.org/wiki/RSA_cryptosystem), read 25 Nov 2026, says "The security of RSA is related to the difficulty of factoring the product of two large prime numbers".

The [paper's](https://github.com/google-research/google-research/blob/master/cogentic_research_papers/integer_factorization/paper.pdf) abstract says it "establishes the number-field-sieve exponent 1/3 unconditionally", "improving on the rigorous L_N[1/2,1] bound of Lenstra and Pomerance (1992) and matching the asymptotic exponent of the heuristic General Number Field Sieve." On its second page, that sieve "runs in time L_N[1/3,(64/9)^(1/3)], but only under unproven smoothness, splitting, and full-rank heuristics."

So the exponent, 1/3, is the same; the constant is not: 105 here, against the cube root of 64/9 for the sieve. The paper chose "transparent explicit constants (105 and 40) rather than optimizing them". Neither factoring paper of 25 Nov claims polynomial time; the second has "Subexponential" in its title.

<figure class="mg" data-scene="chalkboard"><img src="/blog/assets/media/what-is-cogentic/chalkboard.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a sky chalkboard with a soft white frame writes L_N[1/3, 105] one symbol at a time. A yellow tag reading subexponential drops onto the board, then a lilac card reading not polynomial slides in beneath it. Tap the board to write it again."><figcaption>The factoring paper, 25 Nov 2026: L_N[1/3, 105], subexponential, not polynomial.</figcaption></figure>

Our view: the news is a claimed proof of the 1/3 exponent without heuristics. The paper makes no claim about real keys, and neither do we.

## What else came out the same week?

OpenAI's [math repository](https://github.com/openai/math/tree/main/preprints), of manuscripts "produced by an unnamed internal OpenAI model", added "The matrix multiplication exponent is nine fourths" and "Superpolynomial graph diameter of simple polytopes" on 24 Nov 2026. The polytope paper's README says: "This disproves the polynomial Hirsch conjecture."

Another AI proof story this month: [Riemann Hypothesis Proof With Claude, Checked in Lean (Nov 2026)](/blog/riemann-hypothesis-ai-proof/).

## What can you take from Cogentic for your own agent team?

The team shape: one orchestrator splits the work, several workers try different routes, separate reviewers check before anything is kept, and a shared record holds what passed for later rounds. That is our reading, not Google's advice.

<figure class="mg" data-scene="ledger"><img src="/blog/assets/media/what-is-cogentic/ledger.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a soft white ledger lies open under a sky tab reading checked. Lilac and blue slips slide in from the side, one line at a time. Lines that get a mint tick from a yellow pencil stay on the page; lines without a tick fade away. Tap the ledger to run the next round."><figcaption>Cogentic's arXiv paper, 30 Sep 2026: confirmed results go into a verified ledger.</figcaption></figure>

We think it fits ordinary work:

- **Research:** three agents search different sources; a reviewer checks each claim against its link.
- **Writing:** two agents draft; a reviewer checks the facts and keeps one.
- **Code review:** one agent writes a change; another tries to break it with tests.

Our view: the part to copy is a reviewer who did not do the work; Cogentic's version is "adversarial verification".

Cogentic is Google's research harness; Munder Difflin is not Cogentic and does not prove theorems. Its [README](https://github.com/HarnessMD/munder-difflin), checked 25 Nov 2026, says "Michael, the orchestrator, takes your request and hands each piece to the right agent", and agents talk through "the hive, a local git repository of plain files." The [Munder Difflin site](https://harnessmd.com), checked 25 Nov 2026, says: "The free plan lets you use Pro features up to a monthly allowance of work tokens." See [what a multi agent harness is](/blog/what-is-a-multi-agent-harness/).

To run a team like this on your own work, [download Munder Difflin](https://harnessmd.com/download).

<link rel="stylesheet" href="/blog/assets/media/what-is-cogentic/motion.css"><script defer src="/blog/assets/media/what-is-cogentic/motion.js"></script>
