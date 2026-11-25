---
title: "What is UI UX Pro Max? The design skill for coding agents"
description: "UI UX Pro Max (nextlevelbuilder/ui-ux-pro-max-skill) is an open source design skill for coding agents. What is inside, how to install it, which agents it names."
date: 2026-11-25
category: concepts
categoryLabel: Concepts
type: Technical
primaryKeyword: "ui ux pro max"
secondaryKeywords: ["ui ux pro max skill", "ui-ux-pro-max claude code", "ui ux pro max install", "design skill for coding agents", "what is ui ux pro max"]
tags: ["Concepts", "Open Source", "Skills", "Claude Code"]
faq:
  - q: "Is UI UX Pro Max open source?"
    a: "Yes. The code is on GitHub at nextlevelbuilder/ui-ux-pro-max-skill under the MIT licence, per the GitHub API and the README, checked 25 Nov 2026. The README calls the repo the Basic version and describes a separate Premium version."
  - q: "How do I install UI UX Pro Max in Claude Code?"
    a: "Per the README, run `/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill`, then `/plugin install ui-ux-pro-max@ui-ux-pro-max-skill`. Or install the CLI with `npm install -g ui-ux-pro-max-cli` and run `uipro init --ai claude` in your project."
  - q: "Which coding agents does UI UX Pro Max work with?"
    a: "The README lists 20 agents for skill mode, including Claude Code, Cursor, Codex CLI, Gemini CLI and GitHub Copilot. Kiro, Roo Code and KiloCode use it as a slash command, and Trae needs SOLO mode first."
  - q: "What is inside UI UX Pro Max?"
    a: "By the README's own count on 25 Nov 2026: 80 searchable UI styles (51 active), 194 colour palettes, 74 font pairings, 25 chart types, 22 tech stacks, 141 UX guidelines and 194 reasoning rules."
  - q: "Does UI UX Pro Max need Python?"
    a: "Yes. The README says Python 3.x is required for the search script, using the standard library only, and that the scripts install nothing and make no network calls."
---

UI UX Pro Max is "An AI skill that provides design intelligence for building professional UI/UX across multiple platforms and frameworks", per its [README](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill). It is open source under the MIT licence, at nextlevelbuilder/ui-ux-pro-max-skill on GitHub. Checked 25 Nov 2026.

The README's troubleshooting notes that raising Claude Code's output token limit "can also increase latency and usage". We think that makes usage worth planning for; see [How to Get the Most Out of Your Claude Code Max Plan](/blog/claude-code-max-plan-tips/).

If you run AI agents, [Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. Its agents run on engines such as Claude Code, Codex and Gemini CLI. The [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup.

## What is UI UX Pro Max?

UI UX Pro Max is a skill that provides "design intelligence for building professional UI/UX", in the README's words. It is searchable design data plus a Python script that turns a request into a design system. A skill, per Anthropic's [skills docs](https://code.claude.com/docs/en/skills), is a `SKILL.md` file with instructions, and "Claude uses skills when relevant".

Per the README, "The skill activates automatically when you request UI/UX work." Its main feature is the Design System Generator, which "analyzes your project requirements and generates a complete, tailored design system in seconds". It runs five searches in parallel (product type, style, colour palette, landing page pattern and typography), then a reasoning engine picks a pattern, style, colours, fonts, effects, patterns to avoid and a checklist to run before delivery.

## What is inside UI UX Pro Max?

The README lists 80 searchable UI styles, 194 colour palettes, 74 font pairings and 141 UX guidelines, among other data. These are the project's own counts, read on 25 Nov 2026:

| Data | The README's count |
| --- | --- |
| Searchable UI styles | 80, of which 51 are active |
| Colour palettes | 194, one per product type |
| Font pairings | 74, with Google Fonts imports |
| Chart types | 25 |
| Tech stacks | 22 |
| UX guidelines | 141 |
| Reasoning rules | 194, industry specific |
| Landing page patterns | 34 |

Styles include Glassmorphism, Minimalism, Brutalism and Bento Grid. Each reasoning rule names a landing page pattern, style priority, colour mood, typography mood, key effects and "Anti-Patterns", such as "AI purple/pink gradients" for banking. The skill's own [`SKILL.md`](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/main/.claude/skills/ui-ux-pro-max/SKILL.md) also counts 105 curated icons and 17 GSAP presets.

<figure class="mg" data-scene="swatchbook"><img src="/blog/assets/media/what-is-ui-ux-pro-max-skill/swatchbook.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a yellow swatchbook fans open into soft white cards, one at a time. Each card has a colour chip, blue, lilac, sky and mint, and a label: 80 searchable UI styles, 194 colour palettes, 74 font pairings and 141 UX guidelines. A lilac tag on the cover reads UI UX Pro Max. Tap the swatchbook to fan it open or closed."><figcaption>The README counts 80 searchable UI styles, 194 colour palettes, 74 font pairings and 141 UX guidelines. Read 25 Nov 2026.</figcaption></figure>

The project's website, [uupm.cc](https://www.uupm.cc/), showed smaller counts on 25 Nov 2026, such as 57 UI styles and 95 colour palettes. This page uses the README's.

## How do you install and use UI UX Pro Max?

In Claude Code, the README gives two commands: add the repo as a plugin marketplace, then install from it:

```
/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill
/plugin install ui-ux-pro-max@ui-ux-pro-max-skill
```

With the GitHub CLI:

```bash
gh skill install nextlevelbuilder/ui-ux-pro-max-skill .claude/skills/ui-ux-pro-max
```

The README marks its CLI "Recommended". From its install block, which lists 25 targets plus `all`:

```bash
# Install CLI globally
npm install -g ui-ux-pro-max-cli

# Go to your project
cd /path/to/your/project

# Install for your AI assistant
uipro init --ai claude      # Claude Code
uipro init --ai codex       # Codex CLI
uipro init --ai gemini      # Gemini CLI
```

Add `--global` to install for every project, for example `uipro init --ai claude --global`, which installs to `~/.claude/skills/`. The README says "The npm package is `ui-ux-pro-max-cli`" and "Older `uipro-cli` releases are stale". The search script needs Python 3.x.

Then you ask for UI work in plain words. The README's example prompt is:

```
Build a landing page for my SaaS product
```

<figure class="mg" data-scene="paintroller"><img src="/blog/assets/media/what-is-ui-ux-pro-max-skill/paintroller.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a sky note pinned above a soft white wall reads Build a landing page for my SaaS product. A yellow paint roller rolls across the wall from left to right, and behind it a tidy layout appears: a blue hero block, a row of lilac cards and a mint button. Tap the wall to roll it again."><figcaption>Per the README, the skill activates automatically when you request UI/UX work. Read 25 Nov 2026.</figcaption></figure>

Name your stack in the prompt, "or let it default to HTML + Tailwind". In Kiro, Roo Code and KiloCode you call it as a slash command: `/ui-ux-pro-max Build a landing page for my SaaS product`.

## Which agents and frameworks does UI UX Pro Max name?

The README names 20 agents for skill mode and 22 stacks. The agents: Claude Code, Cursor, Windsurf, Antigravity, Codex CLI, Continue, Gemini CLI, OpenCode, Qoder, CodeBuddy, Droid (Factory), KiloCode, Warp, Augment, CodeWhale, ZCode, Kimi Code, Amazon Q Developer, OpenClaw and GitHub Copilot. Kiro, Roo Code and KiloCode get the slash command. For Trae, "Switch to SOLO mode first."

The stacks:

| Area | Stacks, per the README |
| --- | --- |
| Web (HTML) | HTML + Tailwind (default) |
| React | React, `Next.js`, shadcn/ui |
| Vue | Vue, `Nuxt.js`, Nuxt UI |
| Angular | Angular |
| PHP | Laravel |
| Other web | Svelte, Astro, `Three.js` |
| Desktop | JavaFX, WPF, WinUI 3, Avalonia, Uno Platform, UWP |
| iOS | SwiftUI |
| Android | Jetpack Compose |
| Cross platform | React Native, Flutter |

## When does UI UX Pro Max help, and what should you watch for?

Per the README, it covers "any UI/UX task (build, design, create, implement, review, fix, improve)", and it can retheme an existing app. The sample design system in the README ends with a checklist to run before delivery, with items such as "Light mode: text contrast 4.5:1 minimum", "No emojis as icons (use SVG: Heroicons/Lucide)" and "Responsive: 375px, 768px, 1024px, 1440px".

<figure class="mg" data-scene="ruler"><img src="/blog/assets/media/what-is-ui-ux-pro-max-skill/ruler.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a long yellow ruler lies across the top with marks at 375px, 768px, 1024px and 1440px. Loose boxes, one blue, one lilac, one sky and one mint, slide up and snap into line under the marks. A soft white tag below reads text contrast 4.5:1 minimum. Tap the ruler to scatter the boxes and snap them back."><figcaption>The README's sample checklist checks layouts at 375px, 768px, 1024px and 1440px. Read 25 Nov 2026.</figcaption></figure>

The README names these limits:

* **Guidance, not edits.** "Search results provide design guidance; they do not automatically rewrite your app."
* **Python is yours to install.** Agents "should never install software on your machine; they are instructed to ask you instead."
* **No Claude.ai upload.** Do not upload the full repository ZIP to Claude.ai; it is over Claude's 200 file upload limit, and the project does not currently publish a separate upload ZIP.
* **Old marketplace error.** "Zip file contains a symbolic link" is "a known issue with versions prior to v2.5.1"; the fix is the CLI installer.
* **Long answers.** For Claude Code's output token error, first "ask Claude to split the task into smaller steps".
* **Premium tier.** The repo is the Basic version; the README describes a Premium version with brand identity, logo design, banners and slides, with details at uupm.cc.

Our view: the checklist is the part worth copying even without the skill, since a fixed list of checks gives any agent a clear finish line.

## How does UI UX Pro Max relate to our pages?

Our related pages: [Claude Code Skills: What They Are, Where They Live and How to Write One](/blog/claude-code-skills/), [What is Superpowers? The skills library for coding agents](/blog/what-is-superpowers/) and [What is A2UI? Google's A2UI 1.0, explained](/blog/what-is-a2ui/).

## UI UX Pro Max at a glance

Checked 25 Nov 2026.

| Item | Detail |
| --- | --- |
| What it is | A design skill for coding agents |
| Code | nextlevelbuilder/ui-ux-pro-max-skill on GitHub, created 30 Nov 2025 |
| Licence | MIT |
| Latest release | [v2.15.0](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/releases/tag/v2.15.0), 13 Aug 2026 |
| Stars | 153,940 at 09:50 UTC on 25 Nov 2026 |
| Agents named | 20 for skill mode; slash command in Kiro, Roo Code and KiloCode |
| Stacks | 22, default HTML + Tailwind |
| Needs | Python 3.x for the search script |
| Install | Claude Code marketplace, GitHub CLI or `uipro` CLI |

<link rel="stylesheet" href="/blog/assets/media/what-is-ui-ux-pro-max-skill/motion.css"><script defer src="/blog/assets/media/what-is-ui-ux-pro-max-skill/motion.js"></script>
