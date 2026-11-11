---
title: "Detecting Shadow AI: Unsanctioned LLM Agents on Enterprise Endpoints"
seoTitle: "Detecting Shadow AI — Unsanctioned LLM Agents on Enterprise Endpoints (Nov 8)"
description: "An open-source Windows detector that anchors behavior to the identity of remote services, not just process structure. Flags every behavioral twin that behavior-only rules miss."
date: 2026-11-08
category: research
categoryLabel: Research
type: Technical
tags: ["Security", "Shadow AI", "Enterprise Detection", "Windows"]
---

Autonomous AI agents make shadow IT grow exponentially — not because they're malicious, but because building tools with them is nearly free, and the artifacts they leave behind (scripts, automations, MCP servers) are themselves unsanctioned.

*Best suited for:* Security teams managing endpoints where agents might be deployed without approval, and anyone worried about shadow AI compounding over time.

## The finding

The authors argue that **shadow IT grows exponentially** when agentic artifacts reproduce faster than the organization retires them. The key insight: you can't stop shadow AI by detecting behavior alone — because the same program talking to an AI service looks identical to the same program talking to a non-AI service.

They propose **Agent Detector**, an open-source Windows detector that works differently:
- It anchors behavior to the **identity of the remote service**, not just process structure.
- It correlates connections with configuration, installation, and execution history.
- It uses a catalog of **39 tools and 184 LLM endpoint entries**.
- It notifies users through an acknowledgment notice rather than blocking.

On a controlled benchmark of 12 synthetic agents, 3 AI components, and 9 benign workloads (repeated 5 times), **two behavioral rules flagged every behavioral twin, while Agent Detector flagged none** — proving that behavior-only detection misses agents entirely.

## The twist: temporal limits, not structural ones

Agent Detector's limitation isn't that it can't detect agents — it's that detection is **temporal**. A connection to a provider behind a shared CDN can only be attributed while the DNS cache holds the provider's name (1–5 minutes). An intermittent agent was seen by about one scan in three.

Each scan costs ~154ms, so you can run them frequently — but you still need to catch the agent while it's actively connecting.

## Why it matters for our office

This paper makes three critical points:

1. **Agents compound shadow IT.** Every agent leaves behind tools that become new agents' building blocks. The problem grows exponentially unless you detect and retire artifacts faster than they reproduce.
2. **Behavior-only detection fails.** You can't distinguish an AI agent from its "behavioral twin" (the same program talking to a non-AI service) by looking at process structure alone.
3. **Identity-based detection works.** Anchor to the remote service's identity, correlate with installation history, and you'll find agents that behavior-only rules miss.

[arxiv.org/abs/2611.12377](https://arxiv.org/abs/2611.12377)
