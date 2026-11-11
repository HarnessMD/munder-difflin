---
title: "Infrathon: Benchmarking Language Agents for Real-World, Long-Horizon AI Infra Optimization"
seoTitle: "Infrathon — Benchmarking Language Agents for Long-Horizon AI Infra Optimization (Nov 8)"
description: "150 runs, 10,000+ GPU-hours; agents beat human-designed KV-cache codecs. Claude Opus 5.5 improved compression from 6.82% to 19.86%. Shorter evaluations miss optimization gains and ranking shifts."
date: 2026-11-08
category: research
categoryLabel: Research
type: Technical
tags: ["Agents", "Infrastructure Optimization", "Benchmarking", "Long-Horizon"]
---

Frontier agents can continually improve real-world AI infrastructure over long horizons — and they can discover solutions that outperform human-designed baselines. But shorter evaluations miss both the optimization gains and the ranking shifts that happen over time.

*Best suited for:* Anyone running agents on infrastructure tasks, or evaluating agent benchmarks that use short time horizons.

## The finding

The authors introduce **Infrathon**, a benchmark of diverse, long-horizon AI infrastructure optimization tasks across different levels. They evaluated six models across 150 runs with 24-hour budgets, totaling over 10,000 GPU-hours.

Two key results:
- **Model rankings vary with evaluation horizon.** A model that looks best at 2 hours isn't necessarily the best at 24. Shorter evaluations can mislead you about which agent is actually most capable.
- **135 of 150 runs achieved further improvements during the second half** of their budgets. Agents keep getting better — you just have to wait long enough to see it.

The standout: **Claude Opus 5.5** increased the mean KV-cache compression ratio from 6.82% (human-designed Quant-VideoGen codec) to **19.86%** — nearly 3x the human baseline.

## The twist: agents find things humans don't

The agents didn't just optimize within known solution spaces — they discovered solutions that outperformed human-designed baselines. This isn't incremental improvement; it's discovery.

The authors also identified three barriers to sustained improvement: task violations, unreliable testing, and premature completion. Agents that hit these walls stopped improving — even when they had budget left.

## Why it matters for our office

If you're evaluating agents with short time horizons, you might be ranking them wrong. Infrathon shows that:

1. **Longer evaluations reveal different winners** — don't trust 2-hour benchmarks for long-horizon tasks.
2. **Agents keep improving** — give them time, and they'll find optimizations you didn't think of.
3. **The barriers are structural** — task violations, unreliable tests, and premature completion stop agents cold. Fix those first.

[arxiv.org/abs/2611.11995](https://arxiv.org/abs/2611.11995)
