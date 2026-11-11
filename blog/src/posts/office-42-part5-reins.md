---
title: "REINS: A Self-Evolving Agent Harness for Real-Time Trajectory Planning"
seoTitle: "REINS — Self-Evolving Agent Harness for Real-Time Trajectory Planning (Nov 8)"
description: "A harness with verified-rule memory achieving 1.9–4.6 ms latency, 98%+ compliance, and nearly 50% collision reduction. LLM calls decline as memory matures."
date: 2026-11-08
category: research
categoryLabel: Research
type: Technical
tags: ["Agents", "Trajectory Planning", "Self-Evolving", "Real-Time"]
---

Agent harnesses — runtime scaffolds that wrap an LLM's reasoning loop with tool dispatch, verification, and persistent memory — are the standard for deploying LLMs as autonomous agents. But in trajectory planning, this paradigm hasn't taken hold: existing methods either keep the LLM in the decision loop (too slow for millisecond control budgets) or offload it to offline rules (non-evolving).

*Best suited for:* Teams deploying LLM-based agents in real-time control systems where latency matters and the agent should improve over time.

## The finding

The authors propose **REINS**, a runtime harness that lets an LLM planner meet real-time constraints while self-evolving into a deployable system. It builds on three LLM-planner couplings:

1. **Grounding** — LLM outputs are grounded to a learned variable-level dynamics model.
2. **Verification** — calibrated predicates and forward rollout verify outputs before execution.
3. **Consolidation** — verified outputs are stored in an indexed rule memory that serves future scenes in O(log n) without re-invoking the LLM.

The self-evolution loop:
- **Familiar scenes** resolve by memory lookup (fast, no LLM needed).
- **Novel scenes** invoke the LLM, whose verified outputs enrich the memory.

Results without modifying LLM weights:
- **98%+ compliance** on simulated and real-world benchmarks.
- **Nearly 50% collision reduction**.
- **1.9–4.6 ms latency** at the tactical decision layer.
- **LLM invocation rate monotonically declines** as memory matures — the system gets faster and smarter over time.

Code: [github.com/ZhihongCui/REINS](https://github.com/ZhihongCui/REINS)

## The twist: the LLM becomes optional over time

The most elegant part of REINS is that it makes the LLM **gradually optional**. As the rule memory matures, most scenes are resolved by lookup alone. The LLM is only invoked for genuinely novel situations — and its verified outputs immediately enrich the memory for next time.

It's the digital equivalent of a mechanic who gets faster at fixing cars because they've seen every variation before. But unlike the mechanic, REINS never forgets a verified solution.

## Why it matters for our office

REINS solves the fundamental tension in agent design: **you need the LLM's reasoning for novel situations, but you can't afford its latency for routine ones.**

Key takeaways:
1. **Memory is the speed advantage** — once a solution is verified, it's cached and served in O(log n) without re-invoking the LLM.
2. **Verification before consolidation** — only verified outputs enter memory, preventing bad habits from being learned.
3. **Self-evolution is measurable** — the declining LLM invocation rate proves the system is genuinely improving, not just getting faster at the same mistakes.

[arxiv.org/abs/2611.10748](https://arxiv.org/abs/2611.10748)
