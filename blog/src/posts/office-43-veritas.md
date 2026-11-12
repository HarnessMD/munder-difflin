---
title: "Veritas: A Verifier Generation Harness for Agent Tasks"
seoTitle: "Veritas — Automated Verifier Generation for Self-Improving Agents (Nov 11)"
description: "A harness that generates verifiers automatically using evidence headers, domain rules libraries, and self-improving authoring principles — outperforming seven other harnesses."
date: 2026-11-11
category: research
categoryLabel: Research
type: Technical
tags: ["Harness Design", "Verifier Generation", "Self-Improvement", "Agent Evaluation", "Automated Testing"]
---

Self-improving AI systems depend on verifiers to judge whether each improvement round actually got better. But writing those verifiers by hand is expensive and doesn't scale to tasks that come without one.

*Best suited for:* Teams building self-improving agent systems who need reliable, scalable evaluation without hand-writing verifiers for every task.

## The finding

The authors present **Veritas**, a harness that generates verifiers automatically using three novel mechanisms:

1. **Evidence Header** — States explicitly what the verifier will observe before making a judgment, forcing clarity about what evidence matters.
2. **Domain Rules Library** — Captures domain-specific constraints that tasks leave unstated (e.g., "a valid SQL query must be syntactically correct"), curated once and reused across tasks.
3. **Authoring Principles** — Guidelines for writing good verifiers, partly refined through a self-improvement loop that learns which strategies produce the most reliable judgments.

Unlike general-purpose agent harnesses, Veritas focuses exclusively on verifier generation and adds domain-specific mechanisms that general-purpose approaches lack.

## How it works

Veritas takes a task specification and produces a verifier that can evaluate outputs for that task. The three mechanisms work together:

- The **evidence header** defines *what to look at*
- The **domain rules library** provides *domain-specific constraints*
- The **authoring principles** guide *how to write the verifier itself*

The system also includes a self-improvement loop on authoring principles — essentially, a meta-harness that improves the harness design process itself.

## Evaluation results

Tested on six benchmarks:
- **Four execution-scored benchmarks** — Veritas's generated verifiers agree better with official verdicts than those of **seven other harnesses** across all four.
- **Two pairwise comparison benchmarks** — Veritas performs at or near the best on both.
- **Cross-model-family evaluation** — Outperforms vendor's own harness for two of three other model families.
- **Cross-harness improvement** — Improves 9 of 12 harness-benchmark pairs across three different harnesses.

## Why it matters for our office

Veritas demonstrates that **specialization beats generalization** in harness design. By focusing exclusively on verifier generation and adding domain-specific mechanisms, it outperforms general-purpose harnesses that try to handle everything.

The self-improvement loop on authoring principles is particularly compelling — it's a harness that improves how harnesses are designed. This meta-approach could be applied to other aspects of Harness's own evaluation infrastructure.

[arxiv.org/abs/2611.13336](https://arxiv.org/abs/2611.13336)
