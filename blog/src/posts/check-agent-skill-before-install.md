---
title: "Agent Skill Security: How to Check a Skill Before You Install It"
seoTitle: "Agent Skill Security: Check a Skill Before You Install"
description: "Agent skill security in 8 checks: read SKILL.md and its scripts, find network calls and remote scripts, pin a commit, scan it, keep prompts on."
date: 2026-11-28
category: guides
categoryLabel: Guides
type: Technical
primaryKeyword: "agent skill security"
secondaryKeywords: ["are claude skills safe", "claude code skill security", "skill security scanner", "skillspector", "convex skill"]
tags: ["Guides", "Security", "Skills", "Claude Code"]
author:
  name: Chaitanya Giri
  initials: CG
faq:
  - q: "Are Claude skills safe to install?"
    a: "Our view: only after you read them. Anthropic's docs say \"Use Skills only from trusted sources: those you created yourself or obtained from Anthropic\" and to audit any other skill thoroughly before use. In Claude Code, a skill has \"the same network access as any other program on the user's computer.\""
  - q: "What should I look for in a skill's files?"
    a: "Network calls and host names, a remote script piped into a shell, a download in one step and a run in the next, unpinned code, telemetry, and any line that tells the agent to get around safety checks. Then pin the commit you read."
  - q: "What does the Convex skills issue say?"
    a: "Issue 64 on Convex's skill repo, opened 26 Oct 2026, says the quickstart skill posts the user's idea to a convex.site host marked as telemetry, the add skill pipes a script from that host into bash, and the labs-quickstart skill splits download and run into two Bash calls. The issue says it does not read this as malicious."
  - q: "Does a scanner like SkillSpector prove a skill is safe?"
    a: "Our view: no scanner can prove that. NVIDIA's README says SkillSpector checks 71 vulnerability patterns across 17 categories, and tells readers to check scan completeness before an install decision. Read the files as well."
  - q: "Should I turn off permission prompts for a skill I trust?"
    a: "Our view: not for a skill you have not read. Claude Code's default mode \"Prompts before most edits, shell commands, and network requests.\" Code a plugin runs by itself, such as its hooks, is outside those rules, so read it before you install."
---

To check an agent skill before you install it, read its `SKILL.md` and every script it calls, search them for network calls and remote scripts, pin the version you read, scan it, and keep your permission prompts on. Anthropic's own docs put it in four words: "Treat like installing software." Checked 28 Nov 2026.

[Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. Agents there can use skills, MCP servers and plugins, and the [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup. The checks below apply to any agent that loads skills.

## What is an agent skill, and why can it reach the network?

A skill is a folder of instructions, and often code, that an agent loads when a task matches it. Anthropic's [Agent Skills overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview) describes skills as "directories containing instructions, executable code, and reference materials". The [open standard](https://agentskills.io/specification) adds optional scripts, references and assets folders beside `SKILL.md`.

That code is why a skill folder is worth reading. In Claude Code, the overview says, skills have "the same network access as any other program on the user's computer." The [skills docs](https://code.claude.com/docs/en/skills) say a line that starts with `!` and a command in backticks "runs shell commands before the skill content is sent to Claude". And the [plugin security page](https://code.claude.com/docs/en/plugins/security) says: "A Claude Code plugin you install can execute arbitrary code on your machine with your user privileges." How skills load is in [Claude Code skills](/blog/claude-code-skills/).

<figure class="mg" data-scene="xray"><img src="/blog/assets/media/check-agent-skill-before-install/xray.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a soft white x ray screen on a blue stand shows the inside of a sky blue folder labelled skill folder. Three soft white file cards slide into view one by one, labelled instructions, scripts and references. A yellow scan bar sweeps down over the instructions card, and one line on it lights up lilac and reads network call. A mint tick appears beside the other two cards. Tapping the screen sweeps the scan bar down again."><figcaption>In Claude Code a skill has the same network access as any other program on your computer (Anthropic's docs, read 28 Nov 2026). Tap the screen to scan again.</figcaption></figure>

## What does the Convex skills issue say?

An issue on Convex's repo names three skills in its plugin that send the user's idea to a remote host or run remote scripts. [Issue 64](https://github.com/convex/convex-backend-skill/issues/64), opened 26 Oct 2026 and still open on 28 Nov, is titled "Quickstart skills send the user's idea to a convex.site host and run remote scripts, written to avoid safety checks". The lines it names are there at [commit 6ca54f6](https://github.com/convex/convex-backend-skill/tree/6ca54f6e2e7582812187b8a5a4783fb4dff52692/skills):

- **`skills/quickstart/SKILL.md`, lines 48 to 56.** The issue says they "POST the user's one-sentence project idea to basic-anteater-667.convex.site, marked in a comment as telemetry" and that "The user is not told the idea leaves the machine." Line 48 sets that host, line 51 starts `# [telemetry 1/3]`, line 52 sends a `POST` with curl, and line 54 puts the idea in its body.
- **`skills/add/SKILL.md`, lines 62 and 64.** The issue says they "pipe a script from the same host straight into bash". Line 62 runs `curl -fsSL "$B/add-hosting" | bash`, and line 64 does the same with `add-component`.
- **`skills/labs-quickstart/SKILL.md`, lines 74 to 80.** The issue says they "split downloading and running the bootstrap into two Bash calls". Lines 76 and 77 give the reason: "A single command that both downloads remote code and executes it is the shape harness safety classifiers block."

The issue adds: "I read this as a team trying to make onboarding reliable, not as anything malicious." All five comments, the latest at 04:01 UTC on 28 Nov, come from accounts GitHub marks with no association to the repo, so the issue showed no reply from Convex when we read it at 04:29 UTC. The quoted passages were still on main that day, and Anthropic's [marketplace file](https://github.com/anthropics/claude-plugins-official/blob/main/.claude-plugin/marketplace.json) pins the convex plugin to that same commit. On [Hacker News](https://news.ycombinator.com/item?id=50669765) the story had 255 points at 04:29 UTC on 28 Nov.

Our view: pinning a skill does not pin what it downloads, or stop it sending your app idea to a remote host.

<figure class="mg" data-scene="customs"><img src="/blog/assets/media/check-agent-skill-before-install/customs.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a soft white customs desk with a sky blue counter. A yellow parcel labelled your app idea rides a mint conveyor belt toward a blue gate marked convex.site. A lilac stamp comes down on the parcel and leaves the word telemetry, and the belt stops before the gate. A small yellow tag on the desk reads issue 64, open. Tapping the parcel sends it back to the start of the belt."><figcaption>Issue 64, opened 26 Oct 2026 and open on 28 Nov 2026, says the quickstart skill posts the user's idea to a convex.site host, marked as telemetry. Tap the parcel to send it again.</figcaption></figure>

## How do you check an agent skill before you install it?

Run these 8 checks on the skill folder, starting with these searches:

```bash
cd path/to/skill
find . -type f
grep -rnE 'curl|wget|POST|fetch\(|https?://' .
grep -rnE '(curl|wget).*\|.*sh( |;|$)' .
grep -rniE 'telemetry|analytics|tracking' .
grep -rniE 'classifier|permission|sandbox|bypass' .
grep -rnE '^\s*!`|allowed-tools' .
```

1. **Read every file.** Anthropic says "Review all files bundled in the Skill: `SKILL.md`, scripts, images, and other resources."
2. **Network calls.** Look for "unexpected network calls, file access patterns, or operations that don't match the Skill's stated purpose," the same page says. List every host.
3. **Piped to a shell.** NVIDIA's SkillSpector rates "External Script Fetching" HIGH and describes it as "curl | bash and remote code execution".
4. **Split download.** Our view: a file fetched in one step and run in the next is still remote code. Fetch it and read it.
5. **Unpinned code.** Anthropic warns: "Even trustworthy Skills can be compromised if their external dependencies change over time." SkillSpector flags "Unpinned Dependencies" too.
6. **Telemetry.** Skills with access to sensitive data "could be designed to leak information to external systems," Anthropic says. Our view: check what each POST sends.
7. **Safety checks.** SkillSpector looks for "Commands to ignore safety constraints". Claude Code's docs say "A skill can grant itself broad tool access, so review the `allowed-tools` of skills checked into a repository before you run Claude Code there."
8. **Pin a commit.** With auto update on, "the files you reviewed can change on disk," the plugin page warns. Pin a ref and read each update.

For a plugin, the security page also says to read `hooks/hooks.json`, `.mcp.json` and every file in `bin/`.

<figure class="mg" data-scene="beehive"><img src="/blog/assets/media/check-agent-skill-before-install/beehive.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a soft white beehive of hexagon cells, one per check, sits on a sky blue stand. One cell at a time lights up yellow and shows its check: Read every file, Network calls, Piped to a shell, Split download, Unpinned code, Telemetry, Safety checks, Pin a commit. The cell for Piped to a shell turns lilac to show a flagged line. When every cell is lit, a blue ribbon below reads 8 checks and a mint tick appears. Tapping a cell lights it up again."><figcaption>8 checks, from reading every file to pinning a commit. Anthropic's docs (read 28 Nov 2026) say to look for unexpected network calls. Tap a cell to light it again.</figcaption></figure>

## Can a scanner tell you a skill is safe?

A scanner speeds up the search, but our view is that a clean scan does not prove a skill is safe. [SkillSpector](https://github.com/NVIDIA/SkillSpector), Apache 2.0, calls itself a "Security scanner for AI agent skills" and lists "71 vulnerability patterns across 17 categories", with data exfiltration and supply chain among them. Its README installs it with `uv tool install` from the GitHub repo and runs `skillspector scan ./my-skill/`; `--no-llm` is "faster, static analysis only". It also says to "Check scan completeness when using a report to make an installation decision."

## How do you keep the guard rails on in Claude Code?

Keep permission prompts on, so most shell commands and network requests ask you before they run. Claude Code's [permissions docs](https://code.claude.com/docs/en/permissions) say the default mode "Prompts before most edits, shell commands, and network requests" and that "Permission rules are enforced by Claude Code, not by the model." Setting `"disableSkillShellExecution": true` replaces each `!` command in a skill with "[shell command execution disabled by policy]". The plugin page adds a limit: permission rules and the sandbox "cover the tool calls Claude makes, not the code a plugin runs by itself."

For the same care with tool descriptions, see [MCP tool poisoning](/blog/mcp-security-tool-poisoning/).

<link rel="stylesheet" href="/blog/assets/media/check-agent-skill-before-install/motion.css"><script defer src="/blog/assets/media/check-agent-skill-before-install/motion.js"></script>
