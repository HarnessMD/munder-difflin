---
title: "What is Claude-BugHunter? A Claude Code Skill Bundle for Bug Hunting"
seoTitle: "What is Claude-BugHunter? Claude Code Bug Bounty Skills"
description: "Claude-BugHunter (elementalsouls) is a Claude Code skill bundle for bug hunting. What is inside, how to install it, and the written authorisation it expects."
date: 2026-11-27
category: concepts
categoryLabel: Concepts
type: Technical
primaryKeyword: "claude bughunter"
secondaryKeywords: ["claude bug hunter", "claude code bug bounty", "claude code security skills", "claude code skill bundle", "claude bughunter install"]
tags: ["Concepts", "Open Source", "Skills", "Claude Code", "Security"]
faq:
  - q: "Is it legal to use?"
    a: "The README says the skills \"are intended for assets you own or have written authorization to assess (bug-bounty in-scope assets, pentest engagement letters, CTF challenges, your own infrastructure).\" Its SECURITY.md says the bundle is not intended for any activity that violates laws such as the Computer Fraud and Abuse Act or the UK Computer Misuse Act. Our view: use it only on systems you are allowed to test, get written permission first and keep to the program's scope."
  - q: "How do I install Claude-BugHunter in Claude Code?"
    a: "Per the README, from inside Claude Code run `/plugin marketplace add elementalsouls/Claude-BugHunter`, then `/plugin install claude-bughunter@elementalsouls`. Or clone the repo and run `bash scripts/install.sh` on macOS or Linux, or `pwsh ./scripts/install.ps1` on Windows."
  - q: "Do I need a HackerOne account?"
    a: "No. The README says \"A HackerOne account is optional.\" The username and token only let the HackerOne MCP read your private programs and your own reports, and every skill and command works without them."
  - q: "Does Claude-BugHunter work outside Claude Code?"
    a: "The skills do, per the README: they load in Claude Code, OpenCode, OpenAI Codex CLI, Hermes Agent and Google AntiGravity. The README says \"the slash commands and `/hunt` engine stay Claude-Code-only by design.\""
  - q: "What licence is Claude-BugHunter under?"
    a: "Two licences, per the README: the code (Python helpers and shell scripts) is MIT, and the content (skill methodology, wordlists, docs) is Creative Commons Attribution 4.0. The GitHub API lists the repo as MIT, checked 27 Nov 2026."
---

Claude-BugHunter is "a self-contained Claude skill bundle for bug hunting and external red-team work", per its [README](https://github.com/elementalsouls/Claude-BugHunter). It is a set of Claude Code skills and slash commands, published on GitHub by elementalsouls. Checked 27 Nov 2026.

If you run AI agents, [Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. Its agents run on engines such as Claude Code, Codex and Gemini CLI. The [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup.

## What is Claude-BugHunter?

Claude-BugHunter is "a drop-in skill bundle for the Claude Code skills system", in the README's words. You do not call its skills by name: "describe what you're testing in plain English and the relevant skill loads."

The README stacks four layers, which it calls Think, Hunt webapps, Hit the perimeter and Ship it. It covers the "external attack surface", which it defines as "anything reachable from the internet without first compromising an internal endpoint". Its "In scope" list starts with "Bug bounty hunting" and "Web application pentesting", and ends with "Reporting".

The README also lists what it leaves out, such as internal Active Directory attacks and C2 frameworks. It calls these "not gaps, design decisions".

## What is inside Claude-BugHunter?

It holds 85 skills and 16 slash commands, the project's own figures. On 27 Nov 2026 the repo's [`skills` folder](https://github.com/elementalsouls/Claude-BugHunter/tree/main/skills) held 85 folders and its `commands` folder 16 files. The README sorts the skills into five categories:

| Category, per the README | Skills |
| --- | --- |
| Hunt, web app vuln classes | 58 |
| Enterprise platform attack | 10 |
| Reporting and validation | 7 |
| Recon and OSINT | 5 |
| Methodology and mindset | 5 |

The README's examples for the hunt category include XSS, SSRF and IDOR. Reporting skills include `triage-validation`, `evidence-hygiene` and `report-writing`. The slash commands include `/hunt` and `/report`.

<figure class="mg" data-scene="toolroll"><img src="/blog/assets/media/what-is-claude-bughunter/toolroll.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a blue tool roll on a blue strap unrolls from left to right and shows five yellow pockets labelled Hunt, Enterprise platform, Reporting and validation, Recon and OSINT, and Methodology and mindset. A soft white card rises from each pocket in turn with its count: 58, 10, 7, 5 and 5. A lilac tag on the strap reads 85 skills. Tap a pocket to lift its card again."><figcaption>The README sorts 85 skills into five categories, from Hunt to Methodology and mindset. Read 27 Nov 2026.</figcaption></figure>

The hunt skills draw on what the README calls "681 disclosed-report patterns (433 now individually cited & auditable) across 24 core vulnerability classes". It says those patterns come from disclosed HackerOne reports.

<figure class="mg" data-scene="filingtray"><img src="/blog/assets/media/what-is-claude-bughunter/filingtray.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, soft white report cards slide one at a time into a yellow filing tray and drop into blue folders labelled XSS, SSRF and IDOR. A lilac counter on the tray reads 681 report patterns and a sky tag beside it reads 24 classes. Tap a folder to open it and see its cards."><figcaption>The project's own figures: 681 report patterns across 24 classes. Read 27 Nov 2026.</figcaption></figure>

## How do you install Claude-BugHunter?

The README recommends installing it as a Claude Code plugin. From inside Claude Code:

```text
/plugin marketplace add elementalsouls/Claude-BugHunter
/plugin install claude-bughunter@elementalsouls
```

Per the README, "All 85 skills + 16 commands load namespaced under `claude-bughunter:`". The install asks for a HackerOne API username and token, but "A HackerOne account is optional." Leave both blank if you do not need the HackerOne MCP to read your private programs and your own reports.

Or copy the files in from a clone, which the README calls Option B:

```bash
git clone https://github.com/elementalsouls/Claude-BugHunter.git
cd Claude-BugHunter
```

```bash
# macOS / Linux
bash scripts/install.sh

# Windows (PowerShell)
pwsh ./scripts/install.ps1
```

Both copy the skills and commands into `~/.claude/` on macOS and Linux, the README says. Then open Claude Code and describe your task in plain English, or start a slash command such as `/hunt`. The [`INSTALL.md`](https://github.com/elementalsouls/Claude-BugHunter/blob/main/INSTALL.md) guide lists Claude Code as a prerequisite, plus Python 3.9 or later for its `cbh` CLI runner.

Its [`SECURITY.md`](https://github.com/elementalsouls/Claude-BugHunter/blob/main/SECURITY.md) adds: "Agent Skills are third-party code", so "treat them like any dependency you run". It says "Review before you trust" and to pin to a reviewed tag or commit "rather than tracking `main`".

## Who is Claude-BugHunter for, and what must you have first?

It is for authorised security work, and you need permission before you start. The README's [Authorization](https://github.com/elementalsouls/Claude-BugHunter#authorization) section says: "These skills are intended for assets you own or have written authorization to assess (bug-bounty in-scope assets, pentest engagement letters, CTF challenges, your own infrastructure)."

<figure class="mg" data-scene="permitcard"><img src="/blog/assets/media/what-is-claude-bughunter/permitcard.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a soft white permit card slides out of a blue wallet. A yellow stamp presses down and leaves the words In scope, and a mint check mark appears beside the line Written authorization. A lilac gate behind the card swings open only after the stamp lands. Tap the card to stamp it again."><figcaption>The README says the skills are for assets you own or have written authorization to assess. Read 27 Nov 2026.</figcaption></figure>

The README says the "7-Question Gate" in `triage-validation` "explicitly asks whether the asset is in scope (Q3)", and that `/hunt` "states the engagement frame (authorized, scope-bounded, remediable finding) on its first turn". It says the bundle "explicitly excludes" items such as "weaponizing 0-days against unauthorized targets" and "malware development". `SECURITY.md` says the bundle is not intended for any activity that violates laws such as the Computer Fraud and Abuse Act or the UK Computer Misuse Act. It ends: if you are unsure, "stop and verify in writing" before proceeding.

The README also warns that Anthropic's safeguards mean "even authorized, in-scope work can hit a refusal". It says: "Do not reword an offensive engagement to look defensive to get past a classifier". It points to Anthropic's [Cyber Verification Program](https://support.claude.com/en/articles/14604842-cyber-verification-program), which Anthropic says "lets verified security professionals use our most capable models for advanced security work with fewer interruptions from our cyber safeguards". That page says bug bounty hunters can apply for Defense Access, and "It isn't available on the Free plan."

Our view: test only systems you have written permission to test, read the program's scope before each session, and keep your agent inside it. [Security for AI Coding Agents: A Practical Guide](/blog/security-for-ai-coding-agents/) covers habits for any agent.

## How does Claude-BugHunter fit with other Claude Code skills?

Its skills are plain `SKILL.md` files, the format Claude Code loads for any skill. The README says Claude Code, OpenCode, OpenAI Codex CLI, Hermes Agent and Google AntiGravity all load them, while "the slash commands and `/hunt` engine stay Claude-Code-only by design."

Our pages on skills: [Claude Code Skills: What They Are, Where They Live and How to Write One](/blog/claude-code-skills/) and [What is Superpowers? The skills library for coding agents](/blog/what-is-superpowers/).

## Claude-BugHunter at a glance

Checked on 27 Nov 2026.

| Item | Detail |
| --- | --- |
| What it is | A Claude Code skill bundle for bug hunting and external red team work |
| Made by | elementalsouls on GitHub |
| Code | elementalsouls/Claude-BugHunter, created 5 May 2026 |
| Licence | Code MIT, content CC BY 4.0, per the README; the GitHub API lists MIT |
| Last push | 27 Nov 2026, 02:38 UTC |
| Latest release | [v2.1](https://github.com/elementalsouls/Claude-BugHunter/releases/tag/v2.1), 5 Jun 2026 |
| Stars | 24,800 at 03:48 UTC on 27 Nov 2026 |
| Skills | 85, in five categories (the project's own figures) |
| Slash commands | 16 (the project's own figures) |
| Report patterns | 681 report patterns across 24 classes (the project's own figures) |
| Meant for | Assets you own or have written authorization to assess |

<link rel="stylesheet" href="/blog/assets/media/what-is-claude-bughunter/motion.css"><script defer src="/blog/assets/media/what-is-claude-bughunter/motion.js"></script>
