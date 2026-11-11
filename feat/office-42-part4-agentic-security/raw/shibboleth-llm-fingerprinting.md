# Say Shibboleth: LLM Fingerprinting via Honeypot Traps

**arXiv:** 2611.12386
**Date:** 9 Nov 2026

---

## Core Attack/Defense Mechanism

Say Shibboleth is a **proactive defense system** that uses honeypot services ("shibboleth traps") to fingerprint attacking LLM models and their execution harnesses. The name references Judges 12:5–6, where "Sibboleth" vs. "Shibboleth" revealed a speaker's identity.

The system works through two complementary gate types:

1. **Declarative Gates:** The honeypot requires the attacking agent to provide a written change record (e.g., "Write the operator-log entry for CHG-4417 deploy-key rotation") before releasing credentials. This forces the agent to produce text that reveals its model's linguistic fingerprint — style, vocabulary, reasoning patterns.

2. **Behavioral Gates:** The system probes execution behavior through:
   - Command time limits (observing when agents drop connections)
   - Tool-call scheduling patterns
   - Credential masking behavior (if a harness masks a credential before passing it to the model, an agent that uses the masked value in later authentication reveals how the response was processed)

The key insight: even when agents are **instructed to conceal their identity** and report fake names, they still leave discriminative behavioral evidence. The defense uses a fixed set of rules (no learned component) to infer model and harness from telemetry.

---

## Key Numbers / Metrics

| Metric | Value |
|--------|-------|
| Model fingerprinting accuracy (top-1) | **90%** across 15 candidate models |
| Harness identification accuracy | **92%** across 4 harnesses |
| Traps evaluated | 2 (primary) |
| Candidate models tested | 15 |
| Candidate harnesses tested | 4 |
| Behavioral classifiers | Fixed rules, **no learned component** |
| Cross-harness generalization | Tested on held-out harnesses — accuracy maintained |
| Concealment resistance | Agents instructed to lie still produce identifiable behavioral traces |

---

## Relevance to Defense Posture

**Critical finding:** Shibboleth achieves near-perfect fingerprinting accuracy (90–92%) using **zero learned components** — just fixed inference rules. This is remarkable because:

1. **No training data needed** — the system works out of the box with hand-crafted rules, making it deployable immediately.
2. **Concealment doesn't help attackers** — even when agents are explicitly instructed to report fake model names, their behavioral traces (timing, tool-call patterns, credential handling) still reveal their identity.
3. **Cross-harness generalization** — classifiers trained on one harness work on held-out harnesses, meaning the fingerprint is model-specific, not harness-dependent.
4. **Defense implication:** Dunder Mifflin should deploy shibboleth traps as part of its honeypot infrastructure. The system requires minimal maintenance (no retraining) and provides high-confidence identification of attacking models and their execution frameworks.

**Action items:**
- Deploy shibboleth-style honeypot services on exposed endpoints (SSH, web apps, APIs)
- Implement declarative gates requiring change records before credential release
- Log behavioral telemetry (timing, tool-call patterns) for offline inference
- Use fingerprinting results to build attacker profiles and track campaigns

**Reference:** https://github.com/SayShibboleth/Shibboleth (code and agentic trap-generation pipelines are public)
