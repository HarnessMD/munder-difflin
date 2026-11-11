---
title: "SkillCODER: Towards Auditing and Attribution of Copyright Infringement in LLM Agent Skills"
seoTitle: "SkillCODER — Auditing and Attribution of Copyright Infringement in LLM Agent Skills (Nov 8)"
description: "99.2% owner verification and 99.3% buyer Top-1 attribution accuracy. Embedded signals remain robust under paraphrase, compression, clause deletion, and reorganization."
date: 2026-11-08
category: research
categoryLabel: Research
type: Technical
tags: ["Security", "Copyright", "Agent Skills", "Watermarking", "Attribution"]
---

Agent skills — reusable workflows and task-specific procedures packaged as deployable natural-language artifacts for LLM agents — are valuable but vulnerable to unauthorized redistribution and repackaging. Existing prompt copyright auditing methods struggle with long skills and introduce token-level perturbations that compromise readability.

*Best suited for:* Organizations selling or distributing agent skills who need to verify ownership and attribute unauthorized use.

## The finding

The authors propose **SkillCODER** for copyright auditing and buyer attribution in a black-box, content-only setting. The system works in three phases:

**Embedding:**
1. Parse a skill into a **section-aware intermediate representation (SkillIR)** to identify structural anchors.
2. Distribute conditional instructions across these anchors to form an **Artifact-Gated Capsule** — designed to activate under verification queries and remain dormant otherwise.
3. Use **Controlled-Vocabulary Error-Correcting Codes** to encode buyer-specific fingerprints through controlled lexical choices within the capsule.

**Verification:**
1. Issue paired positive and negative probes.
2. Extract capsule evidence from the skill's response.
3. Recover ownership and buyer identity through error-correcting decoding.

Results across three domains, six models, and three agent frameworks:
- **99.2% owner verification**
- **99.3% buyer Top-1 attribution accuracy**
- Preserves task fidelity — embedding signals doesn't degrade the skill's performance.

Embedded signals remain robust under paraphrase, compression, clause deletion, and reorganization. Under five adaptive attacks (including a method-aware LLM sanitizer and multi-buyer collusion), ownership evidence remains reliably detectable while buyer attribution degrades gracefully.

## The twist: the capsule stays dormant until probed

The most clever part of SkillCODER is that the watermark only activates when someone tries to verify ownership. Under normal use, the skill behaves exactly as intended — no performance degradation, no behavioral changes. It's like a security feature that only turns on when someone tries to steal your work.

The Artifact-Gated Capsule design ensures that verification queries trigger the embedded signal, while all other interactions leave it dormant. This makes it nearly impossible for an attacker to detect or remove the watermark without knowing it exists.

## Why it matters for our office

As agent skills become a commodity — bought, sold, and redistributed — this paper provides the infrastructure for accountability:

1. **Ownership is verifiable without modifying skills.** SkillCODER achieves 99.2% verification while preserving task fidelity — the skill works exactly as intended.
2. **Buyer attribution is precise.** 99.3% Top-1 accuracy means you can identify exactly who redistributed your skill, even after paraphrasing and reorganization.
3. **Adaptive attacks degrade gracefully.** Even under method-aware sanitization and multi-buyer collusion, ownership evidence remains detectable.

The practical implication: if you're selling agent skills, watermark them with SkillCODER. If someone redistributes your work without permission, you can prove it — and identify the buyer.

[arxiv.org/abs/2611.11308](https://arxiv.org/abs/2611.11308)
