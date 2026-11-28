---
title: "What is CLI-Anything? A Command Line for Any App, for AI Agents"
seoTitle: "What is CLI-Anything? A Command Line for Any App"
description: "CLI-Anything (HKUDS/CLI-Anything) gives AI agents a command line for existing software. What it is, how CLI-Hub works and how to install it."
date: 2026-11-26
category: concepts
categoryLabel: Concepts
type: Technical
primaryKeyword: "cli anything"
secondaryKeywords: ["cli-anything", "cli hub", "cli-anything hub", "agent native software", "cli for ai agents"]
tags: ["Concepts", "Open Source", "CLI Agents", "Claude Code"]
faq:
  - q: "What is CLI-Anything?"
    a: "An open source project from HKUDS, under the Apache 2.0 licence, whose README is titled \"CLI-Anything: Making ALL Software Agent-Native\". It has two parts: a generator that builds a command line for a piece of software, and CLI-Hub, a registry of CLIs you can install. Checked 26 Nov 2026."
  - q: "How do I install CLI-Anything in Claude Code?"
    a: "Per the README, run `/plugin marketplace add HKUDS/CLI-Anything`, then `/plugin install cli-anything`, then `/cli-anything <software-name>` to build a CLI. To install CLIs that already exist, run `pip install cli-anything-hub`, then `cli-hub install <name>`."
  - q: "What is CLI-Hub?"
    a: "CLI-Hub, at clianything.cc, is the project's catalogue of CLIs. The site calls it \"an agent-friendly registry and package manager for CLI tools\". The `cli-hub` command can list, search, inspect, install, update, uninstall and launch them."
  - q: "Which agents does CLI-Anything work with?"
    a: "For building CLIs, the README names Claude Code, Cursor, Pi, OpenClaw, OpenCode, Codex, Hermes, Reasonix, Qodercli and GitHub Copilot CLI, plus Goose through a CLI provider. Its CLI-Hub skill names OpenClaw, Nanobot, Claude Code, Codex, Reasonix and Antigravity."
  - q: "Is CLI-Anything free?"
    a: "Yes. Its pricing page, read 26 Nov 2026, says \"CLI-Anything and CLI-Anything Hub are open source and free to use.\" It adds that some third party CLIs, APIs or apps in the registry may have their own pricing."
---

CLI-Anything is an open source project that gives AI agents a command line for existing software, so they can drive apps like GIMP, Blender and LibreOffice with commands instead of clicks. Its [README](https://github.com/HKUDS/CLI-Anything) pairs a CLI generator with CLI-Hub, a registry of CLIs. It comes from HKUDS under the Apache 2.0 licence. Checked 26 Nov 2026.

If you run AI agents, [Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. Its agents run on engines such as Claude Code, Codex and Gemini CLI, and can use skills, MCP servers and plugins. The [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup.

## What is CLI-Anything?

CLI-Anything turns software built for people into tools an agent can run from a terminal. The README calls it "Bridging the Gap Between AI Agents and the World's Software" and says: "Make any software agent-ready for Pi, OpenClaw, nanobot, Cursor, Claude Code, etc." Each CLI it builds is called a harness.

It is both a generator and a hub. The README says it "has two equally useful starting points": install `cli-anything-hub` to "Use the existing CLI ecosystem now", or install the plugin or skill for your agent to "Build a new agent-native CLI". Software it names includes GIMP, Blender, LibreOffice, Zotero and FreeCAD, among many others.

<figure class="mg" data-scene="adapter"><img src="/blog/assets/media/what-is-cli-anything/adapter.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a yellow plug labelled command line slides into a blue adapter. The adapter has three soft white sockets labelled GIMP, Blender and LibreOffice, and a small mint light turns on beside each socket in turn. Tap the adapter to pull the plug out and push it in again."><figcaption>The README promises one command line to "Make any software agent-ready". Read 26 Nov 2026.</figcaption></figure>

## How does CLI-Anything work?

You point your agent at a program's source code or repo, and it builds a Python CLI in seven phases, per the README:

1. Analyze: "Scans source code, maps GUI actions to APIs".
2. Design: command groups, a state model and output formats.
3. Implement: a Click CLI with a REPL, JSON output, and undo and redo.
4. Plan tests in a `TEST.md` file.
5. Write the tests.
6. Document the results.
7. Publish: create `setup.py` and install the CLI to your PATH.

The CLI calls the real program rather than copying it: "We build structured interfaces TO software, not replacements." So LibreOffice still makes the PDFs and Blender still renders the 3D scenes. Each CLI also gets a `SKILL.md` with a name and description "for agent skill discovery", the same idea as [Claude Code Skills: What They Are, Where They Live and How to Write One](/blog/claude-code-skills/). By the project's own figures, read 26 Nov 2026, the README badge shows 2,461 tests passing, while its test summary totals 2,464.

The README names three limits. It "relies on frontier-class models (e.g., Claude Opus 4.6, Claude Sonnet 4.6, GPT-5.4)", and weaker or smaller models "may produce incomplete or incorrect CLIs". When the software only provides compiled binaries that require decompilation, "harness quality and coverage will degrade substantially". And one run may not cover everything: "Running `/refine` one or more times is often needed".

## How do you install and use CLI-Anything?

There are two routes: install CLIs that already exist, or build a new one. For existing CLIs, the README starts with:

```bash
pip install cli-anything-hub
```

```bash
# Browse what is available
cli-hub list
cli-hub search image

# Install and try a CLI immediately
cli-hub install gimp
cli-hub info gimp
cli-hub launch gimp
```

It warns: "If a selected CLI needs GIMP, Blender, LibreOffice, or another upstream tool, install that upstream application too."

To build a new CLI you need Python 3.10+ and a supported AI coding agent. In Claude Code, the README gives:

```bash
# Add marketplace & install (recommended)
/plugin marketplace add HKUDS/CLI-Anything
/plugin install cli-anything

# Build a CLI for any software with a codebase
/cli-anything <software-name>
```

Its example is `/cli-anything ./gimp`. The README also has install steps for Cursor, Pi, OpenClaw, OpenCode, Codex, Hermes, Reasonix, Qodercli and GitHub Copilot CLI, and Goose can run the same commands through a CLI provider such as Claude Code. It marks OpenCode, Goose, Codex, Hermes and Reasonix as Experimental.

Then the agent uses the CLI like any other command. Per the README, "the generated CLI works the same way" whichever agent built it:

```bash
# Install to PATH
cd gimp/agent-harness && pip install -e .

# Use from anywhere
cli-anything-gimp --help
cli-anything-gimp project new --width 1920 --height 1080 -o poster.json
cli-anything-gimp --json layer add -n "Background" --type solid --color "#1a1a2e"

# Enter interactive REPL
cli-anything-gimp
```

Agents "discover capabilities via standard --help and which commands", and a `--json` flag on every command returns structured data.

<figure class="mg" data-scene="remote"><img src="/blog/assets/media/what-is-cli-anything/remote.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a soft white remote has three lilac buttons that read help, project new and layer add. The buttons press down one after another, and each press sends a sky pulse to a blue screen, where a yellow card reading poster.json appears, then a mint card reading Background. Tap the remote to clear the screen and press the buttons again."><figcaption>Per the README, a generated CLI works the same way whichever agent built it, with JSON output for agents. Read 26 Nov 2026.</figcaption></figure>

## What is CLI-Hub?

CLI-Hub is the project's catalogue of CLIs, at [clianything.cc](https://clianything.cc/). The site calls it "an agent-friendly registry and package manager for CLI tools". It lists CLI-Anything CLIs and Public CLIs, which it says "remain the property of their respective software owners and maintainers".

The README's meta skill lets agents "discover and install the right CLI for a task", and it names OpenClaw, Nanobot, Claude Code, Codex, Reasonix and Antigravity:

```bash
npx skills add HKUDS/CLI-Anything --skill cli-hub-meta-skill -g -y
```

Then you prompt: "Find appropriate CLI software in CLI-Hub and complete the task: ..."

<figure class="mg" data-scene="switchboard"><img src="/blog/assets/media/what-is-cli-anything/switchboard.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a sky switchboard holds a yellow card on the left that reads agent and three mint cards on the right that read GIMP, Blender and Zotero. A blue cable stretches from the agent card to the GIMP card, and a lilac lamp above it lights up with the word install. Tap the board to move the cable to the next card."><figcaption>Per the README, the CLI-Hub meta skill lets agents "discover and install the right CLI for a task". Read 26 Nov 2026.</figcaption></figure>

Release [v0.4.0](https://github.com/HKUDS/CLI-Anything/releases/tag/v0.4.0), out on 25 Jun 2026, added matrices, bundles of CLIs for a whole workflow, found with `cli-hub can <task>`. The [pricing page](https://clianything.cc/pricing.md), read 26 Nov 2026, says "CLI-Anything and CLI-Anything Hub are open source and free to use", though some third party CLIs, APIs or apps in the registry "may have their own pricing".

## Why a command line instead of a browser or screen clicks?

The README's answer is reliability: "No screenshots, no clicking, no RPA fragility. Pure command-line reliability with structured interfaces". Its list of reasons says text commands "match LLM format", `--help` flags give "automatic documentation agents can discover", and JSON output "eliminates parsing complexity". The project's [technical report](https://arxiv.org/abs/2606.03854) on arXiv, dated 2 Jun 2026, adds that current GUI agents "struggle with brittle pixel-level interactions, timing dependencies, and coordinate-based actions that break with interface changes."

Our view: a command line suits work an agent repeats, because a fixed command is easier to check than a click on a moving screen. A browser still fits sites with no CLI, and the README's own table lists a browser CLI, `cli-anything-browser`. For more, read [Why CLI Agents Are So Powerful](/blog/why-cli-agents-are-powerful/) and [Browser Use Alternatives: 5 Picks After the 1.0 Rewrite (Nov 2026)](/blog/browser-use-alternatives/).

## CLI-Anything at a glance

Checked 26 Nov 2026.

| Item | Detail |
| --- | --- |
| What it is | A CLI generator for software, plus CLI-Hub, a registry of CLIs |
| Code | HKUDS/CLI-Anything on GitHub, created 8 Mar 2026, last push 20 Nov 2026 |
| Licence | Apache 2.0 |
| Latest release | [v0.4.0](https://github.com/HKUDS/CLI-Anything/releases/tag/v0.4.0), 25 Jun 2026 |
| Stars | 65,782 at 03:54 UTC on 26 Nov 2026 |
| Agents with install steps | Claude Code, Cursor, Pi, OpenClaw, OpenCode, Codex, Hermes, Reasonix, Qodercli, GitHub Copilot CLI, Goose |
| Software named | GIMP, Blender, Inkscape, Audacity, LibreOffice, OBS Studio, Kdenlive, Shotcut, Zotero, Draw.io, Zoom, FreeCAD and more |
| To build a CLI | Python 3.10+ and a supported AI coding agent |
| Price | Free, per its pricing page |

<link rel="stylesheet" href="/blog/assets/media/what-is-cli-anything/motion.css"><script defer src="/blog/assets/media/what-is-cli-anything/motion.js"></script>
