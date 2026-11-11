# Agents of Chaos: Systematization of Agentic AI Attacks (SoK)

**arXiv:** 2611.10843
**Date:** 7 Nov 2026

---

## Core Mechanism

This Systematization of Knowledge (SoK) paper presents the most comprehensive mapping of attacks targeting agentic AI systems to date. It screened **186 candidate sources** and retained **98** after eligibility screening, producing a structured taxonomy of the entire agentic attack landscape.

The paper organizes attacks using:
- **8 causal-mechanism classes** (not just insertion points, but the actual mechanism by which harm occurs)
- **6-stage attack lifecycle:** Insertion → Exposure/Selection → Interpretation → Planning → Execution → Persistence
- **Orthogonal dimensions:** insertion points, activation conditions, abused capabilities, objectives, impacts, persistence, and evidence quality

Key structural insight: **Insertion and activation are often separated in time and across different components.** An attacker may inject malicious content into a skill file at one point, and the agent activates it weeks later through a completely different workflow. This temporal decoupling makes traditional perimeter defenses ineffective.

---

## Key Numbers / Metrics

| Metric | Value |
|--------|-------|
| Sources screened | 186 candidate sources |
| Sources retained after screening | **98** |
| Atomic attacks identified | **284** |
| Atomic safeguards identified | **452** |
| Explicit attack-safeguard relationships | **660** |
| Causal-mechanism classes | **8** |
| Attack lifecycle stages | 6 (Insertion → Exposure → Interpretation → Planning → Execution → Persistence) |
| Safeguard relationships directly assessed | 278 of 660 (42.1%) |
| Strong safeguard coverage | **Uncommon** — most relationships have partial or limited coverage |

---

## Relevance to Defense Posture

**Critical finding:** This SoK provides the **definitive map** of the agentic attack landscape. The numbers reveal both the scale of the threat and the inadequacy of current defenses:

1. **Tool/MCP/action-layer attacks are most numerous** — these represent the largest share of atomic attacks, confirming that the tool-calling interface is the primary attack surface.
2. **Prompt injection and action-hijacking have broadest coverage** — these attack classes appear across the most papers, indicating they are pervasive and transferable across systems.
3. **Safeguard coverage is critically inadequate** — only 42.1% of attack-safeguard relationships are directly assessed, and strong coverage is uncommon. This means most attacks have no known effective defense.
4. **Temporal decoupling is the key challenge** — insertion and activation happening separately across components means defenses must track the full lifecycle, not just point-in-time checks.

**Defense implications for Dunder Mifflin:**

- **Lifecycle-aware threat modeling is essential** — map all 6 stages for each agent workflow, not just the execution stage.
- **Tool governance must be prioritized** — tool/MCP/action-layer attacks are the most numerous class; implement PRISM-style least privilege.
- **Defense-in-depth is non-negotiable** — with only 42% of relationships assessed and strong coverage being uncommon, no single defense is sufficient.
- **Cross-reference with other papers:**
  - StealthyPoison → memory/RAG poisoning class (class 3)
  - Shibboleth → detection within the execution stage
  - Agent Swarms → prompt injection class (class 1) with broadest coverage

**Action items:**
- Map Dunder Mifflin's agent workflows against the 8 causal-mechanism classes
- Identify gaps in current safeguards (the 57.9% of relationships with no assessment)
- Implement lifecycle-aware monitoring covering all 6 stages
- Prioritize tool-layer protections (most numerous attack class)
