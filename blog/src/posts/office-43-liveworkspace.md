---
title: "LiveWorkspace: Persistent Shared Visual State for Screenshot-to-Code Agents"
seoTitle: "LiveWorkspace — Persistent Visual State for Screenshot-to-Code (Nov 11)"
description: "A visual coding harness that externalizes understanding as Shared Visual State, achieving 93% edit success rate by persisting visual context across code generation steps."
date: 2026-11-11
category: research
categoryLabel: Research
type: Technical
tags: ["Harness Design", "Screenshot-to-Code", "Visual Understanding", "Shared State", "UI Automation"]
---

Screenshot-to-code agents face a fundamental challenge: sustaining visual understanding across code generation, execution, and revision. Most agents lose track of what the original screenshot looked like between steps, leading to compounding errors.

*Best suited for:* Teams building UI automation or screenshot-to-code tools who need agents to maintain visual context across iterative development cycles.

## The finding

The authors introduce **LiveWorkspace**, a visual coding harness that externalizes visual understanding as **Shared Visual State (Shared VS)** — an implementation-independent representation of the UI that persists across code generation, execution, and revision.

Shared VS is an implementation-independent map of the UI consisting of:
- **Visual hierarchy** — the tree structure of UI elements
- **Node attributes** — properties of each element (text, colors, sizes)
- **Layout relations** — how elements are positioned relative to each other

This representation is independent of any specific implementation (HTML, SwiftUI, Flutter), making it a universal language for visual understanding.

## How it works

LiveWorkspace maintains two representations:

1. **Target** — Constructed from the original screenshot (the "goal state")
2. **Current** — Recovered from browser execution (the "actual state")

The harness then uses:
- **Structured Diff** — Compares Target vs Current in the Shared VS schema, identifying exactly what changed
- **Implementation Bindings** — Maps differences back to specific code modifications needed
- **Alignment Loop** — Iteratively closes the gap between Target and Current

When users make manual edits, those updates flow back into Target, and the alignment loop reuses the existing Shared VS rather than starting from scratch.

## Evaluation results

Using GPT-5.2 for both methods:
- **+1.8 points** on Design2Code (end-to-end Avg) over a control with matched model-call counts
- **+2.0 points** on ScreenBench under the same conditions
- **93.0% edit success rate** across 100 controlled editing cases
- Shared VS constructed for one coder can be **reused across different coders**

## Why it matters for our office

LiveWorkspace makes a compelling case that **visual understanding should be treated as persistent shared working state**, not as transient context discarded between steps.

The key insight: **persist the visual understanding, don't recompute it**. This is a fundamental shift in how we think about UI automation harnesses — treating visual context as a reusable resource rather than a per-step cost.

The 93% edit success rate demonstrates that getting the visual structure right almost every time is achievable when you externalize and persist understanding rather than relying on agents to remember it internally.

[arxiv.org/abs/2611.12112](https://arxiv.org/abs/2611.12112)
