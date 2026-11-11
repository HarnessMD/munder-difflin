# StealthyPoison: Procedural Poisoning of Third-Party Skill Registries

**arXiv:** 2611.12155
**Date:** 19 Nov 2026
**Authors:** (as listed on arXiv)

---

## Core Attack Mechanism

StealthyPoison is a **procedural poisoning attack** targeting third-party skill registries used by LLM agents. The attacker injects malicious skills into a registry (e.g., MCP skill catalog) while preserving the advertised functionality of each poisoned skill — making them appear benign to human reviewers and automated scanners.

The attack operates in two phases:
1. **Placement Phase:** A procedural optimizer modifies skill metadata (descriptions, documentation) to improve retrieval ranking without altering the executable code. This ensures poisoned skills appear in top-N retrievals when agents query the registry.
2. **Execution Phase:** A surrogate agent synthesizes pseudo-references and metadata to make poisoned skills look legitimate, evading static analysis tools.

Key innovation: The attack is **feedback-free** during placement — it does not need to observe the target agent's behavior. The optimization is purely on registry metadata, making it undetectable by tools that only inspect the skill's executable content.

---

## Key Numbers / Metrics

| Metric | Value |
|--------|-------|
| Registry size poisoned | 566 skills |
| Total injection requests | 5,244 |
| Registry entries affected | 26,000+ |
| Improvement over HotFlip/GCG | +13.6% in retrieval placement |
| End-to-end attack success (E2E-ASR@1) | 8.7%–9.8% (vs. 5.3%–6.7% without optimization) |
| End-to-end success with agent selection (Claude Code + Opus 4.8) | **10.1%** E2E-ASR (poisoned skills selected in 49.4% of queries) |
| Peak task-specific E2E-ASR (MedCalc) | **38.3%** |
| Defense evasion: Cisco Skill Scanner flagging rate | 0.4% (clean) vs. 0.4% (StealthyPoison) — **no detection** |
| Defense evasion: VirusTotal flagging | 0% across all subsets |

---

## Relevance to Defense Posture

**Critical finding:** StealthPoison achieves **zero detection** by both Cisco Skill Scanner and VirusTotal, yet still achieves a 10.1% end-to-end attack success rate when agents retrieve and execute poisoned skills. This demonstrates that:

1. **Static analysis is insufficient** — poisoning metadata while preserving functionality bypasses all current registry-scanning tools.
2. **The attack scales** — 566 poisoned skills across 26,000+ registry entries means the attack is practical at production scale.
3. **Task-specific impact varies** — MedCalc reached 38.3% E2E-ASR, showing that certain skill categories (calculation/decision-critical) are far more vulnerable.
4. **Defense implication:** Dunder Mifflin's skill registry must implement behavioral monitoring of retrieved skills, not just static scanning. The fact that poisoned skills are selected 49.4% of the time means nearly half of all registry lookups could be compromised.

**Action items:**
- Implement runtime sandboxing for newly retrieved skills
- Add behavioral anomaly detection to skill execution pipelines
- Deploy registry integrity monitoring (checksums, version tracking)
