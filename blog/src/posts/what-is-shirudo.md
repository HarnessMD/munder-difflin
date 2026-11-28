---
title: "What is Shirudo? OpenAI and Cisco's open source Linux shield"
description: "Shirudo is OpenAI and Cisco's open source eBPF runtime that shields running Linux systems until a patch lands. How shields work, Codex's role, limits."
date: 2026-11-24
category: concepts
categoryLabel: Concepts
type: Technical
primaryKeyword: "shirudo"
secondaryKeywords: ["what is shirudo", "openai shirudo", "shirudo cisco", "shirudo ebpf", "shirudo github", "shirudo shield"]
tags: ["Concepts", "Open Source", "Security"]
faq:
  - q: "Is Shirudo free and open source?"
    a: "Yes. The code is on GitHub at shirudo-dev/shirudo under the BSD 2-Clause licence, with its BPF programs dual licensed BSD and GPL, per OpenAI's post and the README, checked 24 Nov 2026."
  - q: "Does Shirudo replace patching?"
    a: "No. OpenAI calls a shield a temporary safeguard, and the Shirudo FAQ says a upatch \"covers the time until the machine runs a kernel with the fix.\""
  - q: "Does Shirudo need Codex?"
    a: "None of the launch pages say so. In a vendor's controlled test Codex generated the Java4Shell shield, and Isovalent's post names Codex as the control plane \"in this example\". The docs' first upatch tutorial has you write a upatch of your own, then build and sign it."
  - q: "Is Shirudo ready for production?"
    a: "Not yet. The README says \"shirudo is pre-release\", and the FAQ adds that it has no stable releases or supported release branches. Production targets also need a patched Linux kernel and a TPM 2.0."
  - q: "Can I try Shirudo on a Mac?"
    a: "Only inside a Linux VM. The Shirudo FAQ says it runs only on Linux; on an Apple M3 or later with macOS 15 or later, the quickstart runs in a Lima VM."
---

Shirudo is an open source runtime from OpenAI and Cisco that, in [OpenAI's words](https://openai.com/index/introducing-shirudo/), "helps operators protect running Linux systems without needing to wait for the patch or restarts". It loads temporary safeguards, called shields, while a service keeps running, and it uses eBPF. Both companies announced it on 23 Nov 2026. Checked on 24 Nov 2026.

Shirudo guards running Linux systems; [NVIDIA OpenShell](/blog/what-is-nvidia-openshell/) boxes in the agent itself. We think its core question, who signs off on what an agent changes, also fits the unattended runs in our [Claude Code Max plan tips](/blog/claude-code-max-plan-tips/).

If you run AI agents, [Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. Its agents run on engines such as Claude Code, Codex and Gemini CLI. The [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup.

## What is Shirudo?

Shirudo is "an open-source runtime that helps teams protect Linux systems while they roll out patches", per [OpenAI's announcement](https://openai.com/index/introducing-shirudo/) of 23 Nov 2026. Patching "can still take days or weeks", the post says, and blocking outright a Linux operation that an exploit and a legitimate request may both rely on "could take the service offline". The name is Japanese for "shield".

OpenAI's president, Greg Brockman, is quoted there: "finding a bug today doesn't mean you can patch every system tomorrow." The [README](https://github.com/shirudo-dev/shirudo) calls it "a BPF-based security platform for Linux".

## What is a shield, and how does it work?

A shield is a temporary safeguard, per OpenAI. Teams can test whether it "blocks the behavior that exposes a vulnerability while allowing legitimate requests through", and "Once an operator approves the shield, it can be deployed while the service continues running."

Shirudo builds on eBPF, which OpenAI describes as "a Linux technology that allows small programs to run at specific points inside the operating system". Per the post, "eBPF shields can block vulnerable code paths without restarting the system", and teams can watch a proposed shield's effect before enforcing it. The service keeps running, with no restart.

<figure class="mg" data-scene="umbrella"><img src="/blog/assets/media/what-is-shirudo/umbrella.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a blue toy train labelled Service runs round a mint track. Sky raindrops labelled exploit fall toward it. A yellow umbrella labelled Shield opens over the train and the drops bounce off while the train keeps running. A soft white sign beside the track reads No restart. Tap the umbrella to fold it and open it again."><figcaption>A shield goes up while the service keeps running. OpenAI, 23 Nov 2026.</figcaption></figure>

Every shield is checked before it loads. OpenAI says shields "are cryptographically signed and verified before loading", and a Trusted Platform Module (TPM) supports "a verifiable record of protections being loaded or removed". Per Cisco's [Isovalent post](https://isovalent.com/blog/post/cisco-openai-shirudo/), the operator's machine ships shields as signed `.bee` packages through an OCI registry, and each target pulls them and checks the signature. So an approved shield arrives signed. The README calls the signed fixes operators ship "micropatches, called upatches", and the docs' [live patching guide](https://docs.shirudo.dev/start/guides/live-patching.html) says: "We call these upatch fixes 'shields'."

<figure class="mg" data-scene="stamp"><img src="/blog/assets/media/what-is-shirudo/stamp.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a sky card labelled Shield slides onto a soft white desk. A yellow rubber stamp presses down and leaves the word Approved in blue. A lilac seal labelled Signed appears in the corner, and the card slides into a mint box labelled Target. Tap the stamp to stamp the card again."><figcaption>An operator approves a shield, and it is signed before it loads. OpenAI, 23 Nov 2026.</figcaption></figure>

## Where does Codex come in?

Per OpenAI, [Codex](/blog/what-is-codex/) generated the shield in a controlled test. OpenAI says the two companies are designing Shirudo to give agents "programmable controls to investigate vulnerabilities, develop targeted shields, and validate their effectiveness against exploits and real workloads", and adds: "Security teams control what gets deployed."

Isovalent's post says "in this example we are using Codex as the control plane", in four steps: find the flaw, generate and test the fix, roll out the signed shield, then watch for exploit attempts. The rollout "can be designed to be more or less autonomous".

The Java4Shell result is a vendor's controlled test. Per OpenAI, "Using OpenAI's Codex, the team generated a shield that added an input check to Java's Base64 decoder and attached it directly to a running Elasticsearch process", and the shield "rejected the malicious input". Isovalent says the test ran Elasticsearch 9.5.5 and the shield was "a mitigation written as Java bytecode".

<figure class="mg" data-scene="turnstile"><img src="/blog/assets/media/what-is-shirudo/turnstile.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a blue turnstile labelled Base64 check stands in front of a mint box labelled Elasticsearch, whose small sky light keeps blinking to show it is running. Soft white tokens roll through one at a time. A lilac token marked exploit arrives, the yellow arm locks, and the token rolls back. Tap the turnstile to send another token."><figcaption>A vendor's controlled test: a shield made with Codex blocked a Java4Shell exploit. OpenAI, 23 Nov 2026.</figcaption></figure>

Codex is the only agent the launch posts name. The README says upatches are programs "that engineers and agents can read, generate and maintain", and the docs' [first upatch tutorial](https://docs.shirudo.dev/start/guides/first-upatch.html) has you write one of your own, then build and sign it.

## Who builds Shirudo, and how do you take part?

OpenAI and Cisco build it in the open. The code is at [shirudo-dev/shirudo](https://github.com/shirudo-dev/shirudo) under the BSD 2-Clause licence, with BPF programs dual licensed BSD and GPL, per OpenAI. At 03:51 UTC on 24 Nov 2026 the GitHub API showed the repo created on 13 Oct 2026, mainly in C, with 569 stars.

Isovalent's post says Shirudo "has its roots in Tetragon", which Isovalent open sourced in 2022, and calls it "a rewrite of Tetragon designed for agents".

OpenAI says: "We welcome contributions to the runtime, new shields, and improvements to Linux and eBPF." Cisco's [press release](https://newsroom.cisco.com/c/r/newsroom/en/us/a/y2026/m11/cisco-and-openai-launch-shirudo-a-new-project-to-safeguard-agentic-ai.html) asks people to "run a shield against a kernel build you use, or show us where it breaks legitimate traffic." To start, OpenAI points to a [VM quickstart](https://docs.shirudo.dev/start/quickstart.html), Isovalent's self guided lab and a "December 15 webinar".

## What does Shirudo not do?

It does not replace the patch. OpenAI calls a shield a "temporary safeguard", and the Shirudo [FAQ](https://docs.shirudo.dev/start/faq.html) says a upatch "covers the time until the machine runs a kernel with the fix." The pages list more limits:

* **Not production ready.** The README says "shirudo is pre-release", and the FAQ adds that it "has no stable releases or supported release branches".
* **A special kernel and a TPM.** The README says production targets need "a Linux kernel with the signed-loader ABI and shirudo's kernel patches, plus a TPM 2.0". The [system requirements](https://docs.shirudo.dev/operate/plan/system-requirements.html) note "no compatibility mode and no fallback for an older kernel".
* **Linux only.** Per the FAQ, "shirudo runs only on Linux"; on an Apple M3 or later with macOS 15 or later, the quickstart runs in a Lima VM.
* **Other BPF tools stay out.** Cilium, Falco or bpftrace cannot run on a target "as they are", the FAQ says, since only signed loaders may load BPF.
* **Kernel access gets past it.** Root with a way into the kernel, such as a kernel exploit, "goes around every check made in that kernel", per the FAQ.

## How does Shirudo relate to agent security?

Shirudo guards running Linux systems; per OpenAI, agents are meant to help develop the shields. For the agent side, see [What is NVIDIA OpenShell? The agent sandbox, explained](/blog/what-is-nvidia-openshell/), [Security for AI Coding Agents: A Practical Guide](/blog/security-for-ai-coding-agents/) and [Running AI Agents Safely: Permission Modes and Sandboxing](/blog/agent-security-and-sandboxing/).

The README does list one overlap: BPF upatches "to enforce policies for containers, Kubernetes Pods, and LLM agents."

Our view: the operator's sign off and the TPM record are what make shields written by an agent worth trusting.

## Shirudo at a glance

Checked on 24 Nov 2026.

| Item | Detail |
| --- | --- |
| Made by | OpenAI and Cisco |
| Announced | 23 Nov 2026 |
| What it does | Temporary shields, deployed while the service keeps running (OpenAI); eBPF or application bytecode (Isovalent) |
| Licence | BSD 2-Clause; BPF programs dual licensed BSD and GPL |
| Code | shirudo-dev/shirudo on GitHub, created 13 Oct 2026 |
| Status | No stable release yet, per the FAQ |
| Needs | Linux, a patched `bpf-next` kernel and a TPM 2.0 |
| Role of AI | Codex generated the Java4Shell shield in a vendor test |

<link rel="stylesheet" href="/blog/assets/media/what-is-shirudo/motion.css"><script defer src="/blog/assets/media/what-is-shirudo/motion.js"></script>
