---
title: "What Is Roo Code? The Archived VS Code Agent, Explained"
description: "Roo Code was an open source AI coding agent for VS Code. Its GitHub repo was archived in May 2026. What the pages say happened, and what to use now."
date: 2026-10-17
category: concepts
categoryLabel: Concepts
type: Non-technical
primaryKeyword: "roo code"
secondaryKeywords: ["what is roo code", "is roo code dead", "roo code archived", "roo code alternative", "roo code shut down", "roo code vs kilo code"]
tags: ["Concepts", "Open Source", "Editors"]
faq:
  - q: "Is Roo Code dead?"
    a: "Roo Code itself is no longer developed. On 17 Oct 2026 GitHub showed the RooCodeInc/Roo-Code repository as archived, which makes it read only, and its README says \"The Roo Code Extension was shut down on May 15th.\" The VS Code Marketplace listing was still up, at version 3.54.0."
  - q: "Why did Roo Code shut down?"
    a: "Roo Code's own README does not give a reason. ZooCode's README says the Roo team wound down active Roo Code work to focus on Roomote, and Kilo's migration guide quotes the announcement: \"We're shutting it down to go all-in on Roomote.\" roocode.com now redirects to roomote.dev."
  - q: "Is Kilo Code a fork of Roo Code?"
    a: "It began as one, by Kilo's own account; its current extension was rebuilt on OpenCode server. Kilo's Roo migration guide says \"We started Kilo as a Roo fork in 2025\" and that the two codebases share real git history. Roo Code's README, in turn, names Cline as the project Roo Code originated from."
  - q: "Can I still use Roo Code?"
    a: "The extension is still listed on the VS Code Marketplace, but its README says it was shut down and that Roo Code, Inc makes no warranties about it. Kilo's migration guide says \"BYOK continues working after archive.\" An archived repository gets no new commits, so plan a move."
---

Roo Code was an open source AI coding agent for VS Code, and its GitHub repository was archived in May 2026. Its README now says "The Roo Code Extension was shut down on May 15th." Checked 17 Oct 2026.

This explainer covers what Roo Code was, what each official page shows today, and where its users are going. For the wider field, see our [Concepts hub](/blog/topics/concepts/) and [best AI coding agents](/blog/best-ai-coding-agents/).

## What is Roo Code?

Roo Code is an AI coding agent that runs inside VS Code. Its [documentation site](https://roocodeinc.github.io/Roo-Code/) calls it "an open-source AI coding agent for VS Code" and "model-agnostic". The [README](https://github.com/RooCodeInc/Roo-Code) lists five modes: Code, Architect, Ask, Debug and Custom Modes, with lines such as "Architect Mode: plan systems, specs, and migrations". The documentation site is frank about cost: "Roo's approach is to trade tokens for quality." Its Marketplace id is `RooVeterinaryInc.roo-cline`. The code is Apache 2.0, copyright Roo Code, Inc.

## Is Roo Code dead?

As a maintained project, yes. On 17 Oct 2026 [GitHub](https://github.com/RooCodeInc/Roo-Code) showed the repository as archived, which makes it read only. It still has more than 24,000 stars. The last push was 15 May 2026, the same day as the final release, v3.54.0.

<figure class="mg" data-scene="closed"><img src="/blog/assets/media/what-is-roo-code/closed.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A glass shop door with a hanging card. The card reads Roo Code, then swings and turns over to show the word Archived and the date 15 May 2026, and the door handle stays still. Notes taped in the two windows say read only and final release, v3.54.0."><figcaption>Archived on GitHub, last push 15 May 2026. From the RooCodeInc/Roo-Code repository, checked 17 Oct 2026.</figcaption></figure>

The [VS Code Marketplace listing](https://marketplace.visualstudio.com/items?itemName=RooVeterinaryInc.roo-cline) is still up. It shows version 3.54.0, last updated 15 May 2026, more than 2 million installs, and the same shutdown notice as the README.

## Why was Roo Code shut down?

Roo Code's own README does not say why; two other projects do. [ZooCode's README](https://github.com/Zoo-Code-Org/Zoo-Code) says it "continues development of this project after the Roo team wound down active Roo Code work to focus on Roomote". [Kilo's Roo migration guide](https://kilo.ai/articles/roo-to-kilo-migration-guide) dates the announcement to 21 April 2026 and quotes it: "We're shutting it down to go all-in on Roomote." Kilo's guide sums up the stated reason as a "Pivot to Roomote, Roo's cloud agent".

The company's own pages point the same way. roocode.com now redirects to [roomote.dev](https://roomote.dev/), a cloud coding agent whose homepage carries a "By the creators of" line with the Roo Code logo. The [RooCodeInc GitHub organisation](https://github.com/RooCodeInc) now shows the name Roomote, with Roo-Code marked "Public archive".

## Where did Roo Code come from, and who forked it?

Roo Code came from Cline; two of its forks are ZooCode and Kilo. Roo Code's README names [Cline](https://cline.bot/) as the project "from where Roo Code originated", and points to ZooCode as "a fork started by the Roo Code community". Kilo's guide gives the second: "We started Kilo as a Roo fork in 2025."

<figure class="mg" data-scene="tree"><img src="/blog/assets/media/what-is-roo-code/tree.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A family tree draws itself on a white page. A card labelled Cline appears at the top, a line grows down to a card labelled Roo Code, then the line branches to a card labelled ZooCode and a dashed card labelled Kilo Code."><figcaption>Cline to Roo Code to ZooCode, as Roo Code's own README tells it; the dashed Kilo Code branch is from Kilo's guide.</figcaption></figure>

ZooCode says it continues development of the project. Its README says its core team "contributed to Roo previously", and it has a Roo to Zoo migration guide. On 17 Oct 2026 its latest release was v3.90.0, published that day, under Apache 2.0.

## Roo Code status, checked 17 Oct 2026

Each row comes from the page named in its last column, opened on 17 Oct 2026.

| Item | What the page shows | Source |
| --- | --- | --- |
| Repository | Archived, read only; Apache 2.0; more than 24,000 stars | GitHub API |
| Last push and release | 15 May 2026; v3.54.0 | GitHub API |
| README | "The Roo Code Extension was shut down on May 15th." | GitHub README |
| Docs site | Same notice, under "Extension Shutdown" | roocodeinc.github.io |
| Marketplace | Still listed; 3.54.0, updated 15 May 2026 | VS Code Marketplace |
| roocode.com | Redirects to roomote.dev | roomote.dev |
| GitHub org | RooCodeInc shows the name Roomote | github.com/RooCodeInc |
| Alternatives named in README | ZooCode, a community fork, and Cline | Roo Code README |

## Can you still use Roo Code?

You can still install it, but the repository takes no new commits. The Marketplace listing is live, and Roo Code's README says such tools are provided "AS IS" and that Roo Code, Inc makes no warranties. Kilo's migration guide says "BYOK continues working after archive." Our view: treat Roo Code as frozen and plan a move before a model or VS Code change breaks it.

## How do you move off Roo Code?

Pick a successor, then carry your settings across by hand where the guides say so. ZooCode's README links a Roo to Zoo migration guide. Kilo's migration guide spells out the steps. It maps Architect mode to Kilo's plan agent and custom modes in YAML to custom agents in Markdown with YAML frontmatter. It also says the command namespace changes from `roo-cline.*` to `kilo-code.*`, so you find and replace in `keybindings.json`. On API keys it is blunt: "Re-authenticate manually. Keys don't port."

<figure class="mg" data-scene="boxes"><img src="/blog/assets/media/what-is-roo-code/boxes.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A cardboard removal box labelled Roo Code settings fills with small cards for Architect mode, custom modes and keybindings.json, the flaps fold shut, and the box slides across to a new shelf labelled Kilo Code. A card marked API keys bounces off the shut flaps and stays behind on the old Roo Code shelf."><figcaption>Modes and keybindings move; API keys do not, per Kilo's Roo migration guide, checked 17 Oct 2026.</figcaption></figure>

## What to use instead

Roo Code's README points to ZooCode, covered above, and Cline. Here are five ways to go, Cline included, each with its own source:

1. **Cline.** Its [README](https://github.com/cline/cline) says "The open source coding agent in your IDE, terminal, & desktop." Apache 2.0; latest extension release v4.1.25 (16 Oct 2026). See [Cline vs Munder Difflin](/blog/cline-vs-munder-difflin/).
2. **Munder Difflin.** [Munder Difflin](https://harnessmd.com/download) is what we make, and it is not an editor extension. It is free and open source: a desktop app that runs a team of coding agents such as Claude Code, Codex and Gemini CLI on your own computer. Start with [how to install and use Munder Difflin](/blog/how-to-install-and-use-munder-difflin/).
3. **Kilo Code.** Kilo's [README](https://github.com/Kilo-Org/kilocode) offers VS Code, JetBrains and a CLI, MIT licensed, and its Roo migration guide maps `RooVeterinaryInc.roo-cline` to `kilocode.Kilo-Code`.
4. **Claude Code.** Anthropic's [overview](https://code.claude.com/docs/en/overview) says it is "Available in your terminal, IDE, desktop app, and browser." Its [licence file](https://github.com/anthropics/claude-code/blob/main/LICENSE.md) says "All rights reserved". See [Claude Code alternatives](/blog/claude-code-alternatives/).
5. **Codex.** OpenAI's [README](https://github.com/openai/codex) says Codex installs in your code editor, naming VS Code, Cursor and Windsurf. The CLI is Apache 2.0.

<link rel="stylesheet" href="/blog/assets/media/what-is-roo-code/motion.css"><script defer src="/blog/assets/media/what-is-roo-code/motion.js"></script>
