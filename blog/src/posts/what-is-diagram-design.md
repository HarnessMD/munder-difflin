---
title: "What is diagram-design? The Diagram Skill for Claude Code and Codex"
seoTitle: "What is diagram-design? The agent skill for diagrams"
description: "diagram-design is an open source agent skill that draws diagrams as one HTML + SVG file. What it makes, how to install it, which agents it names."
date: 2026-11-26
category: concepts
categoryLabel: Concepts
type: Technical
primaryKeyword: "diagram design skill"
secondaryKeywords: ["diagram-design", "diagram-design claude code", "claude code diagrams", "agent skill for diagrams", "editorial diagrams"]
tags: ["Concepts", "Open Source", "Skills", "Claude Code"]
faq:
  - q: "Is diagram-design open source?"
    a: "Yes. The code is on GitHub at cathrynlavery/diagram-design under the MIT licence, per the GitHub API and the README, checked 26 Nov 2026. It has no GitHub releases; its plugin manifest was at version 2.6.179 on 25 Nov 2026."
  - q: "How do I install diagram-design in Claude Code?"
    a: "Per the README, run `/plugin marketplace add cathrynlavery/diagram-design`, then `/plugin install diagram-design@diagram-design`. Any host that reads Agent Skills can also use `npx skills add cathrynlavery/diagram-design`."
  - q: "Which agents does diagram-design work with?"
    a: "The repo description names Claude Code, Codex, GitHub Copilot, Cursor, Factory Droid, Qoder and Pi. The README says it works with any host that reads Agent Skills, including Gemini CLI, Cline, Windsurf and Amp."
  - q: "What diagrams does diagram-design make?"
    a: "The README counts 52 diagram types, each in three static variants, from Architecture, Flowchart and Sequence to Gantt, Sankey and Git graph. Each diagram is one HTML file with inline SVG, which you can export to SVG or PNG."
  - q: "Should I use diagram-design or Mermaid?"
    a: "The README itself says that for docs that live in Git and change every sprint, \"Mermaid is still the better fit\", and that \"Diagram Design is for the diagram you are going to publish.\""
---

Diagram Design, or diagram-design on GitHub, is an open source agent skill that "draws diagrams as one self-contained HTML + SVG file, in your brand", per its [README](https://github.com/cathrynlavery/diagram-design). The code is at cathrynlavery/diagram-design under the MIT licence, and the README counts 52 diagram types. Checked 26 Nov 2026.

If you run AI agents, [Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. Its agents run on engines such as Claude Code, Codex and Gemini CLI. The [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup.

## What is diagram-design?

diagram-design is a skill: a folder of instructions and references that your agent loads when you ask for a diagram. Per the README, "At startup, the agent sees only the skill name and description. When a request matches, it loads `SKILL.md`", and a type's own reference file loads only when that type is chosen. For how skills work in general, see [Claude Code Skills: What They Are, Where They Live and How to Write One](/blog/claude-code-skills/).

The README says Cathryn Lavery made it for blog post diagrams. Its "Why I built it" section reads: "The model already understood the content. What it was missing was taste, so I wrote the taste down: one accent color for the one or two things that matter, 1px hairlines, no shadows, every coordinate on a 4px grid."

Other skills we cover include [UI UX Pro Max](/blog/what-is-ui-ux-pro-max-skill/), a design skill for interfaces, and [Superpowers](/blog/what-is-superpowers/), a skills library for coding agents.

## What diagrams does diagram-design make?

diagram-design makes 52 diagram types, by the project's own count in the README, read 26 Nov 2026. Each type comes "in three static variants: minimal light, minimal dark, and full-editorial." The [gallery](https://cathrynlavery.github.io/diagram-design/) numbered them 01 to 52 on 26 Nov 2026. They run from Architecture, Flowchart, Sequence, State machine and ER to Quadrant, Gantt, Sankey, Wardley map, Kanban, Exploded axonometric and Git graph.

<figure class="mg" data-scene="stencil"><img src="/blog/assets/media/what-is-diagram-design/stencil.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a yellow stencil sheet lies flat with cut out shapes. One at a time, soft white cards slide out from under it, each with a shape and a label: a blue box for Architecture, a lilac diamond for Flowchart, a row of sky arrows for Sequence and a mint grid for Quadrant. A lilac tag on the sheet reads 52 diagram types. Tap the stencil sheet to slide the cards out or back."><figcaption>The README counts 52 diagram types, each in three static variants. Read 26 Nov 2026.</figcaption></figure>

Each diagram is one HTML file with inline SVG that you open in a browser. The README says "There is no build step, JavaScript, or external image dependency." You can export the diagram itself to SVG or PNG. PNG export uses Playwright, and the README gives this setup for it: `pip install playwright && playwright install chromium`.

## How do you install diagram-design?

The README gives one command for any host that reads Agent Skills, which it says includes Cursor, Claude Code, Codex, Qoder, GitHub Copilot, Gemini CLI, Cline, Windsurf and Amp:

```bash
npx skills add cathrynlavery/diagram-design
```

In Claude Code, the README says the plugin marketplace "gets you updates and the slash commands":

```text
/plugin marketplace add cathrynlavery/diagram-design
/plugin install diagram-design@diagram-design
```

In Codex:

```bash
codex plugin marketplace add cathrynlavery/diagram-design
codex plugin add diagram-design@diagram-design
```

In GitHub Copilot:

```bash
copilot plugin marketplace add cathrynlavery/diagram-design
copilot plugin install diagram-design@diagram-design
```

In Factory Droid:

```bash
droid plugin marketplace add https://github.com/cathrynlavery/diagram-design
droid plugin install diagram-design@diagram-design --scope user
```

In Pi, install, then run `/reload` in an open Pi session:

```bash
pi install https://github.com/cathrynlavery/diagram-design
```

The README also covers Qoder (clone the repo, validate it, then run `qoder plugins install ./diagram-design`), Kiro, OpenCode, Claude Cowork and Claude Desktop. Claude Desktop's skill upload "rejects a ZIP with more than 200 files", so you build a smaller ZIP with `python3 scripts/build-claude-skill-zip.py`. The README warns: "Official builds come only from this repository." It says LittleMight, Cathryn Lavery's company, publishes the plugin directory listings, and a listing under any other name is an unofficial copy.

## How do you ask for a diagram?

You ask your agent in plain words. These are the README's examples:

* "Make me an architecture diagram of my app: frontend, backend, database, Redis cache."
* "I need a quadrant showing Q2 projects by impact vs effort."
* "Give me a sequence of a bearer call with token refresh on 401."

Per the README, "The agent picks the type, states its plan, and writes one `.html` file you can open by double-clicking."

<figure class="mg" data-scene="easel"><img src="/blog/assets/media/what-is-diagram-design/easel.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a yellow easel holds a soft white canvas, with a sky note pinned on top that reads Make me an architecture diagram of my app. Boxes draw themselves in a row on the canvas: a blue box labelled frontend, a lilac box labelled backend, a mint box labelled database and a sky box labelled Redis cache, joined by thin blue arrows. A yellow tag below reads one HTML file. Tap the easel to draw the diagram again."><figcaption>Per the README, the agent picks the type, states its plan, and writes one HTML file. Read 26 Nov 2026.</figcaption></figure>

The fourth README example is `Onboard diagram-design to https://yoursite.com`, which "pulls your palette and fonts so every diagram after this one matches your site". On first use in a new project, the skill checks whether its style guide is still the default and asks before it draws. In Pi, `/skill:diagram-design` calls the skill directly. The README also lists slash commands to import and export, such as:

```text
/diagram-design:import-mermaid README.md --diagram=all
/diagram-design:export-diagram path/to/diagram.html
```

## When does diagram-design help, and what should you check?

Per the README, it is "for the diagram you are going to publish". It can also redraw diagrams you already have: point it at a draw.io, Mermaid, Excalidraw or PlantUML file and it redraws the same content in its own style, ending with a "fidelity ledger" of what got merged, collapsed or dropped.

<figure class="mg" data-scene="lightbox"><img src="/blog/assets/media/what-is-diagram-design/lightbox.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a yellow lightbox glows under a soft white sheet. A rough sketch of wobbly boxes and crossing lines shows through, then a clean diagram traces itself on top: three blue boxes on a straight grid, one lilac box as the single accent, and sky arrows between them. A mint tag reads One accent, 1px hairlines, no shadows. Tap the lightbox to switch between the sketch and the clean diagram."><figcaption>Per the README, the skill redraws draw.io, Mermaid, Excalidraw and PlantUML files in its own style. Read 26 Nov 2026.</figcaption></figure>

The README's style rules start with "One accent color, 1 or 2 focal elements per diagram." It uses three font families (Instrument Serif, Geist and Geist Mono), "1px hairline borders, no shadows, max border-radius 10px", and "Every coordinate, width, and gap is divisible by 4." The default palette is "jet-black + tangerine"; onboarding swaps in your site's colours and fonts.

What the README says to check:

* **Results vary.** "Output quality depends on the model you run it with, and the same prompt can lay out differently twice."
* **No editable source.** "The result is not an editable source format: there is no text to diff in a pull request and no canvas to drag a box on." For docs that live in Git and change every sprint, "Mermaid is still the better fit."
* **A self check.** `python3 skills/diagram-design/scripts/self_check.py <file>` should print `OK` on a generated file.
* **Updates.** An `npx skills add` install "does not follow marketplace updates automatically"; run `npx skills update diagram-design`.
* **When not to draw.** Lists go in a table or bullets, and before and after comparisons in a table. The README asks: "would a reader learn more from this than from a well-written paragraph? If no, don't draw."

Our view: that last question is the most useful line in the README, and it works before any diagram, with or without the skill.

## diagram-design at a glance

Checked 26 Nov 2026.

| Item | Detail |
| --- | --- |
| What it is | An agent skill that draws diagrams as one HTML + SVG file |
| Code | cathrynlavery/diagram-design on GitHub, created 16 Apr 2026 |
| Made by | Cathryn Lavery |
| Licence | MIT |
| Latest release | None on GitHub; [plugin manifest](https://github.com/cathrynlavery/diagram-design/blob/main/.claude-plugin/plugin.json) at version 2.6.179, bumped 25 Nov 2026 |
| Last push | 25 Nov 2026 |
| Stars | 73,163 at 03:37 UTC on 26 Nov 2026 |
| Agents in the repo description | Claude Code, Codex, GitHub Copilot, Cursor, Factory Droid, Qoder and Pi |
| Diagram types | 52 per the README, each in three static variants |
| Output | HTML with inline SVG; export to SVG or PNG |
| Website | [diagramdesign.dev](https://diagramdesign.dev) |

<link rel="stylesheet" href="/blog/assets/media/what-is-diagram-design/motion.css"><script defer src="/blog/assets/media/what-is-diagram-design/motion.js"></script>
