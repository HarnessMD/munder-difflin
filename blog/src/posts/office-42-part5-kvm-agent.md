---
title: "Coding Agents in KVM: Practical Containment and User Control with Limited Resources"
seoTitle: "KVM-Agent — Coding Agents in KVM, Practical Containment with Limited Resources (Nov 8)"
description: "An open-source implementation that gives agents broad authority inside replaceable Ubuntu VMs while keeping host administration outside. Balances autonomy, containment, and user control."
date: 2026-11-08
category: research
categoryLabel: Research
type: Technical
tags: ["Security", "Containment", "KVM", "Coding Agents", "Infrastructure"]
---

Coding agents need broad authority to be productive — but granting that authority exposes users' data and infrastructure. Cloud workspaces help contain agent activity, but relying on provider-specific platforms creates vendor lock-in and reduces user control.

*Best suited for:* Teams running coding agents on bare metal or private infrastructure who want containment without cloud-vendor lock-in.

## The finding

The authors analyze the trade-offs between agent autonomy, enforced containment, and user control — then present **KVM-Agent**, an open-source implementation that automates most setup and provisioning steps.

The architecture:
- Agents get **broad authority inside replaceable Ubuntu VMs**.
- Host administration stays **outside those VMs** — the host is off-limits to agents.
- Supports multiple coding-agent applications, model services, and remote job delegation.

The approach retains familiar workflows and user choice at the cost of VM resources, maintenance overhead, and residual risks from secrets accessible inside the VMs and permitted network access.

## The trade-off triangle

The paper identifies three competing goals:
1. **Agent autonomy** — agents need broad permissions to be productive
2. **Enforced containment** — you need hard boundaries so agents can't escape
3. **User control** — users should choose their tools, models, and infrastructure

KVM-Agent resolves this by making VMs **replaceable** rather than immutable. If an agent misbehaves, you destroy the VM and spin up a fresh one — no forensic cleanup needed.

## Why it matters for our office

This paper is the practical answer to "how do I let agents code without giving them root on my actual machines?"

The key insight: **make the boundary disposable**. Don't try to perfectly restrict what an agent can do inside a persistent environment — instead, make the entire environment replaceable. This is simpler, more secure, and actually works at scale.

The residual risks (secrets inside VMs, permitted network access) are real but manageable — they're the same risks you'd have with any cloud workspace, just without vendor lock-in.

[arxiv.org/abs/2611.12823](https://arxiv.org/abs/2611.12823)
