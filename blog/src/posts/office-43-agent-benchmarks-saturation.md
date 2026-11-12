---
title: "Agent Benchmarks Stop Ranking Before They Run Out of Tasks"
seoTitle: "Agent Benchmark Saturation — Why Pass/Fail Metrics Hide 10x Performance Differences (Nov 11)"
description: "Agent benchmarks reduce runs to binary pass/fail bits, hiding meaningful performance gradients. Proposes clipped log-ratio scoring with dated anchors and cost as a separate axis."
date: 2026-11-11
category: research
categoryLabel: Research
type: Technical
tags: ["Benchmark Design", "Evaluation Metrics", "Measurement Theory", "Agent Evaluation", "Saturation Analysis"]
---

Data-science and ML-engineering agents are evaluated on benchmarks whose tasks yield a quantity — a Kaggle metric, contest score, or speedup. When one stops separating the best models, the usual remedy is a harder version. But re-scoring released runs of eight benchmarks reveals that much of this saturation lies in the measurement, not the tasks.

*Best suited for:* Anyone designing or using agent benchmarks who wants to understand why top agents look tied even when they differ dramatically in actual performance.

## The finding

The authors identify two critical failures of current benchmark design:

### Failure 1: Too Coarse
Neighboring top-ten agents on SWE-bench Verified differ by less than the noise in their test errors. Correcting those differences reorders neighbors no more than deleting a random sixth of each agent's passes would. The benchmark can't distinguish between agents that are actually different.

### Failure 2: Capped at the Reference
On ALE-Bench, the top ten agents — separated by contest score — **tie when graded against the median human**, even though nearly half of those runs beat that human. The benchmark's ceiling is the reference point, not actual performance.

> "On fixed tasks, a higher bar only moves the problem; graded credit fixes it."

Making benchmarks harder doesn't solve the measurement problem — it just shifts where saturation occurs. The real issue is **how we measure**, not how many tasks there are.

## Proposed solution: Clipped Log-Ratio Score

The paper proposes a new scoring methodology with three components:

1. **Clipped Log-Ratio Score** — Instead of pass/fail, measure the log-ratio of an agent's performance relative to a baseline, clipped to prevent extreme outliers from dominating. This captures *how much better* an agent is, not just whether it passed.

2. **Dated Anchors** — Scores are anchored to specific dates, enabling temporal comparison against a fixed reference point rather than constant re-normalization.

3. **Cost as a Separate Axis** — Computational cost is tracked independently from performance, enabling fair comparison between agents solving the same task at different resource costs.

## Re-scoring results

The authors re-scored released runs across **eight benchmarks**, including SWE-bench Verified, Terminal-Bench, MLE-bench, ALE-Bench, SWEfficiency, and AlgoTune.

On Terminal-Bench specifically: pass/fail-tied models differ by **over tenfold** on the quantity the tests discard (speedup, cost efficiency, or other continuous metrics).

## Why it matters for our office

This paper has profound implications for how we design evaluation harnesses:

- **Pass/fail is a measurement choice, not an inevitability** — We can choose to measure gradients of performance, not just binary outcomes
- **Saturation is a property of the measurement, not the task set** — Adding more tasks won't fix a broken metric
- **Cost-aware evaluation is essential** — An agent that solves a task 10x faster with 1/10th the compute is meaningfully different from one that barely passes, but pass/fail can't capture this

The problem spans multiple benchmark families (MLE, SWE, Terminal, Algo), confirming that saturation is a systemic issue, not an artifact of a single benchmark's design.

[arxiv.org/abs/2611.13541](https://arxiv.org/abs/2611.13541)
