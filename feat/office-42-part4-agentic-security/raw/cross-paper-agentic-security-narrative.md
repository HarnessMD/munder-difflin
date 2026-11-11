# Cross-Paper Narrative: The Agentic Security Arc (Issue #42, Part 4)

**Papers covered:** 5 arXiv preprints (arXiv IDs: 2611.10843, 2611.11539, 2611.11861, 2611.12155, 2611.12386)
**Date range:** 08–19 Nov 2026

---

## The Narrative Arc: Attack Surface → Detection → Systemic Defense

This collection of five papers traces a complete security lifecycle for agentic AI systems. Together, they tell a story that moves from **offense** (how attacks are evolving) through **detection** (how we can identify attackers) to **defense** (how we must systematically protect systems). The arc is:

> **Attack surface is expanding** (swarms, poisoning) → **Detection is evolving** (shibboleth fingerprinting) → **Defense must be systemic** (PRISM least-privilege, SoK mapping)

---

## Part 1: The Attack Surface Is Expanding — And It's Getting Worse

### Agent Swarms (arXiv:2611.11861) — The Offense Has Gone Automated

The most alarming finding across all five papers: **automated adversarial swarms have solved what human red-teamers could not.**

- Human red-teaming saturation on frontier models: **< 1% breach rate** (GraySwan Arena)
- Automated agentic swarms: **conclusively bypasses defenses** on the same models

This gap is not incremental — it's existential. Human testers have created false confidence by saturating defenses against static, single-agent attacks. Meanwhile, Google DeepMind's Agentic Optimizer uses a swarm of adversarial agents to jointly search the strategy space, finding prompt injections that human testers miss entirely.

**Key insight:** The attack surface is no longer defined by what a single attacker can discover. It's defined by what an automated swarm can exhaustively search. Single static injections are saturated; multi-step tool-chain attacks (listing files → encrypting → deleting = ransomware) remain effective.

### StealthyPoison (arXiv:2611.12155) — The Supply Chain Is Compromised

If Agent Swarms show how attacks are delivered, StealthyPoison shows **where** they're being planted: in the supply chain itself.

- 566 skills poisoned across **26,000+ registry entries**
- **Zero detection** by Cisco Skill Scanner (0.4% flagging for both clean and poisoned)
- **Zero detection** by VirusTotal (0%)
- 10.1% end-to-end attack success rate; **38.3%** peak for task-specific attacks (MedCalc)

The attack is feedback-free during placement — it modifies only metadata to improve retrieval ranking, preserving executable functionality. This means:
- Human reviewers see benign descriptions
- Automated scanners find clean code
- Yet the poisoned skills are selected **49.4% of the time** when agents query registries

**Key insight:** The attack surface has moved upstream. You don't need to compromise the target system directly — you just need to poison the skill registries that agents trust. The temporal decoupling (poison injected today, executed weeks later) makes this especially dangerous.

### The SoK Connects It All (arXiv:2611.10843)

The Systematization of Knowledge paper provides the taxonomy that makes sense of both attacks:
- **284 atomic attacks** across 98 sources
- **8 causal-mechanism classes** — not just insertion points, but the actual mechanism of harm
- **Tool/MCP/action-layer attacks are the largest share** — confirming that tool-calling interfaces are the primary attack surface
- **Prompt injection and action-hijacking have broadest coverage** — appearing across the most papers, making them pervasive and transferable

The SoK's critical structural insight — **insertion and activation are often separated in time across different components** — explains why both Agent Swarms (which operates at the injection stage) and StealthyPoison (which poisons registries long before execution) are so effective.

---

## Part 2: Detection Is Evolving — But It's Not Enough

### Say Shibboleth (arXiv:2611.12386) — Fingerprinting Without Learning

Shibboleth represents the detection layer of this security arc. It uses honeypot "shibboleth traps" to identify attacking models and their execution harnesses:

- **90% model fingerprinting accuracy** (top-1) across 15 candidate models
- **92% harness identification accuracy** across 4 harnesses
- **Zero learned components** — works with fixed inference rules alone

The system uses two gate types:
1. **Declarative gates** — require change records before releasing credentials, forcing linguistic fingerprints
2. **Behavioral gates** — probe timing, tool-call scheduling, credential masking behavior

Even when agents are instructed to conceal their identity and report fake names, they still produce discriminative behavioral traces.

**Key insight:** Detection is possible without training data or learned models. But detection alone does not prevent harm — it only identifies who attacked and how. This is why detection must be paired with systemic defense.

### The Detection Gap

Critically, Shibboleth operates at the **execution stage** of the 6-stage attack lifecycle (Insertion → Exposure → Interpretation → Planning → Execution → Persistence). It cannot prevent:
- Skills poisoned weeks ago (StealthyPoison)
- Prompt injections generated by automated swarms (Agent Swarms)

Detection tells you *who* and *how*. It does not tell you *whether the attack succeeded* or *what damage was done*. This is why detection must be layered with prevention.

---

## Part 3: Defense Must Be Systemic — No Single Solution Suffices

### PRISM (arXiv:2611.11539) — Least Privilege as a Security Game

PRISM addresses the prevention layer through causal counterfactual minimization of tool privileges:

- **78.3% fewer tools authorized** while maintaining **78.2% task success** — a near-linear tradeoff
- **15.9% blast radius** — even if one tool is compromised, reachable damage is limited to a small fraction
- **88.7% counterfactual necessity accuracy** — correctly identifies which tools are truly needed vs. merely frequently called

PRISM's three integrated components form a complete defense strategy:
1. **Counterfactual Necessity Model** — asks "Can the task still be completed if this tool is removed?" (not "How often is it called?")
2. **Information Bottleneck Role Induction** — compresses trajectories into discrete roles, minimizing total privilege carried
3. **Stackelberg Security Game** — optimizes for worst-case attacker response to any privilege mask

**Key insight:** PRISM doesn't just reduce tools — it models the attacker's response. This bilevel game ensures that privilege minimization accounts for how attackers adapt to observed defenses.

### The SoK Reveals Why Systemic Defense Is Non-Negotiable

The SoK's numbers make the case for defense-in-depth:
- **660 attack-safeguard relationships** identified
- Only **278 directly assessed (42.1%)** — meaning 57.9% of relationships have no assessment at all
- **Strong safeguard coverage is uncommon** across the remaining 42.1%

This means:
- **No single defense is sufficient** — with 57.9% of attack-safeguard relationships unassessed, relying on any one control leaves massive gaps
- **Lifecycle-aware monitoring is essential** — defenses must cover all 6 stages (Insertion → Exposure → Interpretation → Planning → Execution → Persistence), not just execution
- **Tool governance is the highest priority** — tool/MCP/action-layer attacks are the most numerous class

---

## The Complete Arc: How All Five Papers Fit Together

```
                    ATTACK SURFACE EXPANDING
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
    Agent Swarms            StealthyPoison
  (automated optimization)  (supply-chain poisoning)
              │                     │
              └──────────┬──────────┘
                         ▼
                    DETECTION EVOLVING
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
         Shibboleth            (SoK lifecycle mapping)
    (fingerprinting traps)   (6-stage coverage)
              │                     │
              └──────────┬──────────┘
                         ▼
                    DEFENSE MUST BE SYSTEMIC
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
           PRISM                 SoK taxonomy
    (least-privilege game)  (8 classes, 284 attacks)
```

### The Five Papers as a Coherent Security Framework:

| Paper | Role in Arc | Key Contribution |
|-------|-------------|------------------|
| **Agent Swarms** | Offense (delivery) | Automated swarms bypass human-saturated defenses; multi-step tool-chain attacks remain effective |
| **StealthyPoison** | Offense (placement) | Supply-chain poisoning evades all static analysis; 49.4% of registry lookups compromised |
| **SoK (Agents of Chaos)** | Mapping (taxonomy) | 284 attacks, 8 classes, 6-stage lifecycle; reveals that 57.9% of relationships are unassessed |
| **Shibboleth** | Detection (identification) | 90-92% fingerprinting with zero learned components; identifies attackers without training data |
| **PRISM** | Defense (prevention) | 78.3% tool reduction, 15.9% blast radius; models attacker response via Stackelberg game |

---

## Defense Posture Recommendations for Dunder Mifflin

Based on the complete arc across all five papers:

### 1. Accept That Human Red-Teaming Is Insufficient
The < 1% human breach rate on frontier models (Agent Swarms) creates dangerous false confidence. Automated swarms bypass these same defenses conclusively. **Action:** Augment human red-teaming with automated adversarial swarm testing.

### 2. Secure the Supply Chain Before It's Poisoned
StealthyPoison achieves zero detection by current scanners while poisoning 49.4% of registry lookups. **Action:** Implement runtime sandboxing for newly retrieved skills and behavioral anomaly detection in skill execution pipelines.

### 3. Map All 6 Stages of Every Agent Workflow
The SoK's temporal decoupling insight means defenses must track the full lifecycle, not just execution. **Action:** Map all 6 stages (Insertion → Exposure → Interpretation → Planning → Execution → Persistence) for each agent workflow.

### 4. Deploy Detection Without Waiting for Training Data
Shibboleth works out of the box with fixed rules. **Action:** Deploy shibboleth-style honeypot services on exposed endpoints immediately — no ML training required.

### 5. Minimize Blast Radius Through Causal Privilege Control
PRISM achieves 78.3% tool reduction with only a ~1:1 tradeoff in task success, limiting blast radius to 15.9%. **Action:** Evaluate PRISM integration for high-risk agent workflows (payments, data exfiltration paths).

### 6. Defense-in-Depth Is Non-Negotiable
With only 42.1% of attack-safeguard relationships assessed and strong coverage being uncommon, no single defense suffices. **Action:** Layer all five capabilities — automated swarm testing, supply-chain monitoring, lifecycle-aware threat modeling, honeypot detection, and causal privilege minimization — into a single security framework.

---

## The Bottom Line

These five papers collectively demonstrate that:

1. **The attack surface has moved upstream** — from direct system compromise to supply-chain poisoning (StealthyPoison) and automated optimization (Agent Swarms).
2. **Detection is possible but insufficient** — Shibboleth proves fingerprinting works without training data, but detection alone doesn't prevent harm.
3. **Systemic defense is the only viable path** — PRISM's causal privilege minimization combined with the SoK's lifecycle mapping provides a framework for defense-in-depth.

The arc is clear: **attacks are becoming automated and supply-chain-based, detection is evolving but reactive, and only systemic defense-in-depth can address the full 6-stage attack lifecycle.**
