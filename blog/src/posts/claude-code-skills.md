---
title: "Claude Code Skills: What They Are, Where They Live and How to Write One"
seoTitle: "Claude Code Skills: Write, Find and Share Skills (Oct 2026)"
description: "Claude Code skills, checked 14 Oct 2026: what a skill is, where skill folders live, a first skill file, how Claude picks one and how to share them."
date: 2026-10-14
category: guides
categoryLabel: Guides
type: Technical
primaryKeyword: "claude code skills"
secondaryKeywords: ["claude skills", "how to create a claude code skill", "SKILL.md", "claude code skills directory", "agent skills", "skills hub"]
tags: ["Guides", "Claude Code", "Skills", "Security", "Open Source"]
faq:
  - q: "What is the difference between a skill and CLAUDE.md?"
    a: "Anthropic's skills docs say that, unlike `CLAUDE.md` content, a skill's body loads only when it is used, so long reference material costs almost nothing until you need it. The docs suggest a skill when a section of `CLAUDE.md` has grown into a procedure rather than a fact."
  - q: "Are custom slash commands the same as skills now?"
    a: "Yes. Anthropic's skills docs say custom commands have been merged into skills: `.claude/commands/deploy.md` and `.claude/skills/deploy/SKILL.md` both create `/deploy` and work the same way. Old command files keep working, but a skill folder can also hold supporting files."
  - q: "Why is my Claude Code skill not triggering?"
    a: "Anthropic's troubleshooting list starts with the description: it should include keywords users would naturally say. Check that the skill appears when you ask Claude what skills are available, or invoke it with its slash name. If the frontmatter YAML is malformed, Claude can't match your description; on v2.1.233 or later, `claude plugin validate .claude/skills` finds the broken file."
  - q: "How do I stop Claude from running a skill by itself?"
    a: "Add `disable-model-invocation: true` to the skill's frontmatter. Anthropic's skills docs say Claude then can't invoke it on its own, while you can still run it by typing its slash name. The docs suggest this for workflows with side effects, such as a deploy or a commit."
  - q: "Do Claude Code skills work in Codex or Cursor?"
    a: "The format can travel. Claude Code skills follow the Agent Skills open standard, and on 14 Oct 2026 the Skills Hub README listed Codex, Cursor and OpenCode among 48 supported tools. Claude Code adds its own features on top of the standard, such as dynamic context injection, so we think shared skills should stick to the standard fields."
---

A Claude Code skill is a folder holding a `SKILL.md` file of instructions, which Claude loads when your request matches its description or when you type `/skill-name`. Anthropic's [skills docs](https://code.claude.com/docs/en/skills) put personal skills in `~/.claude/skills/` and project skills in `.claude/skills/`. Checked 14 Oct 2026.

Everything below applies to a plain Claude Code session. If you run several agents side by side, [Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of coding agents such as Claude Code, Codex and Gemini CLI on your own computer. More walkthroughs sit in our [Guides hub](/blog/topics/guides/).

## What is a Claude Code skill?

A skill is a set of instructions that Claude adds to its toolkit and uses when relevant. Anthropic's skills docs suggest writing one "when you keep pasting the same instructions, checklist, or multi-step procedure into chat". The difference from `CLAUDE.md` is cost: the docs say a skill's body "loads only when it's used, so long reference material costs almost nothing until you need it."

<figure class="mg" data-scene="stamp"><img src="/blog/assets/media/claude-code-skills/stamp.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A rubber stamp lifts off an ink pad and presses the same short checklist onto three blank cards in a row, and every print comes out identical."><figcaption>Write the instructions once and reuse them. Anthropic's skills docs, read 14 Oct 2026.</figcaption></figure>

Custom commands now count as skills. Per the skills docs, `.claude/commands/deploy.md` and `.claude/skills/deploy/SKILL.md` both create `/deploy`, and old command files keep working. Skills follow the [Agent Skills](https://agentskills.io) open standard, which the docs say "works across multiple AI tools". Our guide to [adding an MCP server](/blog/how-to-add-an-mcp-server-to-claude-code/) covers the other common way to extend Claude Code.

## Where do Claude Code skills live?

Where you save a skill decides which sessions load it. These rows are our selection from the table in Anthropic's skills docs, read 14 Oct 2026:

| Location | Path | Loads in |
| --- | --- | --- |
| Personal | `~/.claude/skills/<skill-name>/SKILL.md` | All your projects on this machine, but not Cowork or cloud sessions |
| Project | `.claude/skills/<skill-name>/SKILL.md` | Sessions in this repository; commit it so your team gets it |
| Plugin | `<plugin>/skills/<skill-name>/SKILL.md` | Wherever the plugin is enabled, as `/plugin-name:skill-name` |
| Enterprise | `.claude/skills/<skill-name>/SKILL.md` in the managed settings directory | All users on machines where your organization deploys it |

When two skills share a name, the docs say enterprise wins over personal, and personal over project. If you sign in with a claude.ai account in the terminal, Claude Code v2.1.273 or later syncs the skills enabled there into `~/.claude/skills/synced/`.

<figure class="mg" data-scene="drawers"><img src="/blog/assets/media/claude-code-skills/drawers.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A wooden card catalogue has four drawers labelled Personal, Project, Plugin and Enterprise. Each drawer slides open in turn and one index card rises out of it."><figcaption>Where a skill is saved decides which sessions load it. Anthropic's skills docs, 14 Oct 2026.</figcaption></figure>

## How do you write your first Claude Code skill?

Make a folder, add a `SKILL.md` with a `description`, and write the steps under it. This is the example in Anthropic's skills docs, a skill that summarizes your uncommitted changes:

```bash
mkdir -p ~/.claude/skills/summarize-changes
```

Save this as `~/.claude/skills/summarize-changes/SKILL.md`:

```yaml
---
description: Summarizes uncommitted changes and flags anything risky. Use when the user asks what changed, wants a commit message, or asks to review their diff.
---

## Current changes

!`git diff HEAD`

## Instructions

Summarize the changes above in two or three bullet points, then list any risks you notice such as missing error handling, hardcoded values, or tests that need updating. If the diff is empty, say there are no uncommitted changes.
```

The line that starts with `!` runs `git diff HEAD` first and swaps in its output, so Claude reads your real diff. Test it by asking "What did I change?" or by typing `/summarize-changes`. The folder name becomes the command unless you set `name`.

The docs say every frontmatter field is optional and only `description` is recommended. Four you will meet early, our pick:

- `disable-model-invocation: true` stops Claude loading the skill on its own.
- `allowed-tools` lets Claude use the listed tools without asking, for that turn.
- `paths` limits automatic loading to files that match its patterns.
- `context: fork` runs the skill in a forked subagent.

## How does Claude decide to use a skill?

Claude reads each skill's description and loads the full skill when a request matches it. Anthropic's skills docs say descriptions sit in context during a regular session, but "full skill content only loads when invoked". On 14 Oct 2026 the docs set two defaults, which settings can change: 1,536 characters for the description plus `when_to_use`, and 1% of the context window for the listing. With many skills, Claude Code drops some descriptions to fit, starting with the ones you invoke least.

<figure class="mg" data-scene="bookmark"><img src="/blog/assets/media/claude-code-skills/bookmark.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A closed book has a row of bookmark tabs along its top edge, each with a short label. A request card slides in, one tab lifts and the book falls open at that page."><figcaption>Claude sees each description first, and the full skill loads when invoked. Anthropic's skills docs, 14 Oct 2026.</figcaption></figure>

The docs' first fix for a skill that never triggers is a description with the keywords users would naturally say. Typing `/deploy staging` at the start of a message runs the skill directly; the same name after plain text gives Claude permission but doesn't run it. If Claude skips a rule that must hold every time, the docs say to move it into a hook, and our [hooks guide](/blog/claude-code-hooks-explained/) shows how.

## How do you share skills across tools?

Commit them to the repo, ship them in a plugin, or sync one copy to several agents. Anthropic's skills docs list three scopes: commit `.claude/skills/`, add a `skills/` directory to a plugin, or deploy through managed settings. The [last30days skill](https://github.com/mvanhorn/last30days-skill), a research skill, installs in Claude Code as a plugin, per its README on 14 Oct 2026: `/plugin marketplace add mvanhorn/last30days-skill`, then `/plugin install last30days`.

For several tools at once, [Skills Hub](https://github.com/qufei1993/skills-hub) is a desktop app for macOS, Windows and Linux that installs a skill once and syncs it to the tools you choose. Its README said on 14 Oct 2026 that it supports 48 AI coding tools, including Claude Code, Codex, Cursor and OpenCode. GitHub showed v1.0.0, released 11 Oct 2026, under the MIT licence, with more than 1,800 stars.

<figure class="mg" data-scene="rack"><img src="/blog/assets/media/claude-code-skills/rack.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. One labelled jar sits on a central spice rack. Copies of it slide onto four smaller racks marked Claude Code, Codex, Cursor and OpenCode, and every label matches."><figcaption>Skills Hub's README lists 48 supported tools, these four among them. Read 14 Oct 2026.</figcaption></figure>

Portability has a catch. Anthropic's skills docs say that outside Claude Code, for claude.ai uploads and the Skills API, you can use only the six fields in the Agent Skills spec: `name`, `description`, `license`, `compatibility`, `metadata` and `allowed-tools`. Any other field makes packaging or upload fail with a hard error. Our view: keep a skill you plan to share to those six.

## Are Claude Code skills safe to install?

Treat a skill like a script you are about to run, because it can run commands. Anthropic's skills docs warn that workspace trust doesn't gate a project skill's `allowed-tools`, even in a `-p` run in a folder you've never trusted, and tell you to review that field in repository skills before you run Claude Code there. A skill from a stranger is a shell script with good manners.

NVIDIA's [SkillSpector](https://github.com/NVIDIA/SkillSpector) README said on 14 Oct 2026 that 26.1% of skills in a 31,132 skill research subset contained vulnerabilities, and its `skillspector scan` command checks a skill before you install it.

## Do skills work inside Munder Difflin?

Yes. Munder Difflin runs Claude Code in your project folder, so the skills Claude Code reads there apply. To set it up, follow [how to install and use Munder Difflin](/blog/how-to-install-and-use-munder-difflin/).

<link rel="stylesheet" href="/blog/assets/media/claude-code-skills/motion.css"><script defer src="/blog/assets/media/claude-code-skills/motion.js"></script>
