---
title: "CLAUDE.md Best Practices: What to Write, Where It Lives, How Long (Oct 2026)"
seoTitle: "CLAUDE.md Best Practices (Oct 2026): 8 Rules From Anthropic's Docs"
description: "CLAUDE.md best practices from Anthropic's docs, checked 26 Oct 2026: what to put in it, where each file lives, the 200 line target and how AGENTS.md loads."
date: 2026-10-26
category: guides
categoryLabel: Guides
type: Technical
primaryKeyword: "claude md best practices"
secondaryKeywords: ["claude.md best practices", "what to put in claude.md", "claude.md example", "claude.md vs agents.md", "how long should claude.md be"]
tags: ["Guides", "Claude Code", "Memory", "Context"]
faq:
  - q: "How long should a `CLAUDE.md` file be?"
    a: "Under 200 lines per file. Anthropic's memory docs say longer files use more context and reduce adherence, and that imports help you organise a long file but do not cut its context cost. Checked 26 Oct 2026."
  - q: "Does Claude Code read `AGENTS.md`?"
    a: "Yes, from Claude Code v2.1.277. By default it reads `AGENTS.md` only when there is no `CLAUDE.md` or `CLAUDE.local.md` in your working directory or above it. The Project instructions setting in /config can make it read both."
  - q: "Should `CLAUDE.md` be committed to git?"
    a: "The project `CLAUDE.md`, yes: Anthropic's best practices page says to check it into git so your team can contribute. Keep personal notes in `CLAUDE.local.md` and add that file to `.gitignore`."
  - q: "Why does Claude ignore my `CLAUDE.md`?"
    a: "Usually the file is too long or two lines disagree. Anthropic's docs say a rule gets lost in a long file and that Claude may pick one of two conflicting instructions arbitrarily. For a rule with no exceptions, use a hook."
---

The best `CLAUDE.md` is short, concrete and checked often: under 200 lines, only what Claude needs in every session, and hooks for anything that must never be skipped. These eight rules come from Anthropic's [memory docs](https://code.claude.com/docs/en/memory) and [best practices page](https://code.claude.com/docs/en/best-practices), read on 26 Oct 2026.

Running several Claude Code agents? [Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. The [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup. For habits beyond this file, see [Claude Code best practices](/blog/claude-code-best-practices/).

## What is a `CLAUDE.md` file?

A plain markdown file of instructions that Claude Code loads at the start of every session. The memory docs say each session "begins with a fresh context window", and `CLAUDE.md` is how your build commands, conventions and rules carry over. Claude writes a second kind of memory itself, auto memory, from your corrections.

One line matters more than the rest: Claude treats `CLAUDE.md` "as context, not enforced configuration". It is advice Claude reads, not a lock.

## Where should `CLAUDE.md` files live?

Four places, loaded from broadest to most specific, per the memory docs on 26 Oct 2026:

| Scope | Where | Shared with |
| --- | --- | --- |
| Managed policy | `/Library/Application Support/ClaudeCode/CLAUDE.md` on macOS | Everyone in the organisation |
| User | `~/.claude/CLAUDE.md` | Only you, every project |
| Project | `./CLAUDE.md` or `./.claude/CLAUDE.md` | Your team, through git |
| Local | `./CLAUDE.local.md`, added to `.gitignore` | Only you, this project |

Files above your working folder load at launch, and files in subfolders load when Claude touches a file there. They add up rather than replace each other, so the line closest to where you started Claude is read last.

<figure class="mg" data-scene="stack"><img src="/blog/assets/media/claude-md-best-practices/stack.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, four sheets of paper drop onto a pile one at a time, labelled Managed, User, Project and Local. Each sheet lands slightly offset so every label stays visible, and a small arrow beside the pile reads Read last at the top sheet."><figcaption>Instruction files load from broadest to most specific and add up, per Anthropic's memory docs on 26 Oct 2026.</figcaption></figure>

## What should go in `CLAUDE.md`?

Facts Claude should hold in every session and cannot work out from the code. The memory docs name build commands, conventions, project layout and "always do X" rules, and say to add a line when:

- Claude makes the same mistake a second time.
- A code review catches something Claude should have known.
- You type the same correction you typed last session.
- A new teammate would need the same context.

Write lines you could check. The docs give examples: "Use 2-space indentation" instead of "Format code properly", and "Run `npm test` before committing" instead of "Test your changes". Here is a short project file in that style:

```markdown
# Build
- Run `npm run build` before you say a task is done.
- Run `npm test -- path/to/file` for one test file, not the whole suite.

# Style
- TypeScript strict mode; no `any`.
- API handlers live in `src/api/handlers/`.

# Rules
- Never edit files in `generated/`.
```

A procedure with many steps, or a rule for one corner of the repo, belongs in a [skill](/blog/claude-code-skills/) or a path scoped rule.

## How long should `CLAUDE.md` be?

Under 200 lines per file. The docs say longer files "consume more context and reduce adherence". Three tools keep it short:

- **Path scoped rules.** Files in `.claude/rules/` with a `paths` field load only when Claude works on matching files.
- **Imports.** `@path/to/file` pulls in another file, up to four hops deep. This organises a long file but does not cut its context cost.
- **HTML comments.** Block comments are stripped before Claude sees the file, so notes for people cost no tokens.

The best practices page asks of every line: "Would removing this cause Claude to make mistakes?" If not, cut it.

<figure class="mg" data-scene="gauge"><img src="/blog/assets/media/claude-md-best-practices/gauge.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A tall white measuring tube fills with blue lines of text up to a yellow mark labelled 200 lines. Extra lilac lines float off to the side into three small trays labelled Rules, Skills and Imports, and the tube level settles below the mark."><figcaption>Target under 200 lines per file; move the rest into rules or skills.</figcaption></figure>

## Does Claude Code read `AGENTS.md`?

Yes, from v2.1.277, but not next to a `CLAUDE.md` by default. The memory docs say Claude reads `AGENTS.md` when you have no `CLAUDE.md`, `.claude/CLAUDE.md` or `CLAUDE.local.md` in your working folder or above it. Add any one of those and `AGENTS.md` stops loading.

To keep one file for every agent, import `AGENTS.md` from `CLAUDE.md`, or set **Project instructions** in `/config` to `claude-md-and-agents-md` so Claude reads both. Codex, OpenCode and Pi all read `AGENTS.md`, so one shared file keeps a mixed team in step.

<figure class="mg" data-scene="junction"><img src="/blog/assets/media/claude-md-best-practices/junction.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A small blue cart rolls along a white rail toward a junction with two tracks, one to a card labelled Claude file and one to a card labelled Agents file. A yellow switch flips the cart toward the Agents file when the Claude file card fades out, then a third track appears labelled Both."><figcaption>By default Claude Code reads the shared agents file only when it finds no Claude file of its own, per Anthropic's memory docs on 26 Oct 2026.</figcaption></figure>

## How do you keep `CLAUDE.md` up to date?

Treat it like code. The best practices page says to check it into git and review it when things go wrong. Run `/init` for a starter file, `/context` to confirm it loaded and `/memory` to list and open your memory files. From v2.1.283, `/doctor prompt-audit` looks for stale instructions, missing files and contradictions, and changes nothing until you say so.

If one rule keeps slipping, the page suggests adding "IMPORTANT" to that line alone. If a rule must hold every time, the memory docs point to a PreToolUse hook instead; see [Claude Code hooks explained](/blog/claude-code-hooks-explained/).

## `CLAUDE.md` best practices at a glance, checked 26 Oct 2026

| Rule | From |
| --- | --- |
| Under 200 lines per file | Memory docs |
| Only what applies in every session | Best practices page |
| Concrete lines you could verify | Memory docs |
| Path scoped rules and skills for the rest | Memory docs |
| No two lines that disagree | Memory docs |
| Commit the project file, keep `CLAUDE.local.md` private | Both pages |
| Emphasis on the one line that slips, not many | Best practices page |
| Hooks for rules with no exceptions | Both pages |

<link rel="stylesheet" href="/blog/assets/media/claude-md-best-practices/motion.css"><script defer src="/blog/assets/media/claude-md-best-practices/motion.js"></script>
