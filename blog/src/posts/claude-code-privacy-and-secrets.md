---
title: "Claude Code Privacy: Your Email Address, Saved Rules and Secrets"
seoTitle: "Claude Code Privacy: Your Email Address and Saved Secrets"
description: "Two Claude Code privacy stories hit Hacker News in Nov 2026. What 2.1.317 changed, where Don't Ask Again saves rules, and how to deny .env reads."
date: 2026-11-09
category: guides
categoryLabel: Guides
type: Technical
primaryKeyword: "claude code privacy"
secondaryKeywords: ["claude code secrets", "claude code don't ask again", "claude code email address", "claude code settings.local.json", "claude code deny env file"]
tags: ["Guides", "Claude Code", "Security", "Privacy", "Guardrails"]
faq:
  - q: "Does Claude Code send my email address to websites?"
    a: "A user reported in issue 107757, on 5 Nov 2026, that Claude Code sent their email address in the User-Agent header during web searches. Claude Code 2.1.317, released 3 Nov 2026, added a check that asks before a web or shell tool call sends your account email address to the network. Update to 2.1.317 or later; the report itself lists 2.1.318."
  - q: "Where does Claude Code save Don't Ask Again approvals?"
    a: "In .claude/settings.local.json at the root of the git repository, as an allow rule. Approvals for Bash commands and WebFetch domains are saved for future sessions. A file edit approval is not saved and lasts until the session ends."
  - q: "How do I remove a saved Claude Code permission rule?"
    a: "Run /permissions. The dialog lists every permission rule and the settings file it came from, and you can remove a rule there, even while Claude is working."
  - q: "How do I stop Claude Code reading my .env file?"
    a: "Add Read deny rules such as Read(./.env) and Read(./.env.*) under permissions.deny in a settings file. They cover Claude's file tools and commands like cat, but not a script that opens files itself, so turn on the sandbox for a block that every process obeys."
  - q: "Is .claude/settings.local.json committed to git?"
    a: "Not by default. The first time Claude Code writes the file, it adds **/.claude/settings.local.json to your global git excludes. If you created the file by hand, add it to .gitignore yourself."
---

Two Claude Code stories ran on Hacker News: one says Claude Code sent a user's email address to websites, the other says "Don't Ask Again" exposes passwords in public GitHub files. The one thing to do: update to Claude Code 2.1.317 or later, then open `/permissions` and remove any saved rule with a secret in it. Checked 9 Nov 2026.

Below is what each says and what Anthropic's own release notes and docs say to change. If constant prompts are your real problem, start with [why Claude Code keeps asking for permission](/blog/why-does-claude-code-keep-asking-for-permission/).

We make [Munder Difflin](https://harnessmd.com/download), free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer.

## What happened with Claude Code and email addresses?

A user reported that Claude Code put their email address in a request header sent to websites during web searches. The Hacker News post [Claude Code sends your email address to websites](https://news.ycombinator.com/item?id=50385272), from 5 Nov 2026, had 1,603 points and 533 comments on 9 Nov. It links [issue 107757](https://github.com/anthropics/claude-code/issues/107757) on Anthropic's Claude Code repository.

The reporter's claim, in their words: Claude Code "divulged my email to arbitrary 3rd parties in the `User-Agent` request header while conducting web searches without my permission." The report lists version 2.1.318 on macOS. On 9 Nov the issue was still open, with more than 100 comments.

## Which Claude Code version has the email check?

Version 2.1.317 or later. Anthropic's [v2.1.317 release notes](https://github.com/anthropics/claude-code/releases/tag/v2.1.317), published 3 Nov 2026, list this line word for word: "Added a check that asks before a web or shell tool call sends your account email address to the network". The newest release on 9 Nov was [v2.1.319](https://github.com/anthropics/claude-code/releases/tag/v2.1.319), from 6 Nov.

<figure class="mg" data-scene="postcard"><img src="/blog/assets/media/claude-code-privacy-and-secrets/postcard.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A postcard slides across a desk toward a slot and stops when a card pops up reading Send your email address? with two buttons, Allow and Deny. Tap Deny and the postcard slides back to the desk."><figcaption>Claude Code 2.1.317 added a check that asks before a web or shell tool call sends your account email address. Release notes, 3 Nov 2026.</figcaption></figure>

One reply on the issue, posted on 5 Nov, speaks as "we": "We introduced a built-in mod called `cc-plugin-privacy` to deterministically block this behavior in v2.1.317 and later". It adds that the mod "is enabled by default, you can turn it off via `/plugins`". GitHub marks the author as a contributor to the repository, and the page doesn't say they work at Anthropic. Note that the report lists 2.1.318, a later release than 2.1.317.

Our view: update and leave that mod on.

## What is the "Don't Ask Again" story?

It is a Hacker News post titled [Claude Code's "Don't Ask Again" exposes passwords in 1,122 public GitHub files](https://news.ycombinator.com/item?id=50407882), posted 7 Nov 2026 and on 596 points on 9 Nov. It links a write up by Apiiro, on apiiro.com. We cover only its title here.

By the fortieth prompt of the day, "don't ask again" is the most tempting button on the screen, so it helps to know what it writes down.

## Where does "Don't ask again" save your approvals?

In `.claude/settings.local.json` at the root of the git repository. The [permissions docs](https://code.claude.com/docs/en/permissions) say: "When you choose "Yes, and don't ask again" and the approval saves permanently, such as for a Bash command or a WebFetch domain, Claude Code saves the rule to `.claude/settings.local.json` at the root of the git repository". The rule then applies to future sessions anywhere in that repository, worktrees included. A file edit approval is not saved; it lasts until the session ends.

Approving a compound command saves "a separate rule for each subcommand that requires approval", up to 5 rules. Our view: a saved Bash rule is built from the command text, so a command with a password typed into it can leave that password in the file.

<figure class="mg" data-scene="typewriter"><img src="/blog/assets/media/claude-code-privacy-and-secrets/typewriter.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A typewriter types the line Bash(npm test *) onto a sheet headed settings.local.json, and the sheet rolls up to show the typed line. Tap the sheet and it rolls back down and the line types again."><figcaption>Yes, and don't ask again saves a Bash rule to .claude/settings.local.json at the repository root. Claude Code docs, checked 9 Nov 2026.</figcaption></figure>

The file is meant to stay out of git. The [settings docs](https://code.claude.com/docs/en/settings) say that the first time Claude Code writes it, "it adds `**/.claude/settings.local.json` to your global git excludes file". But: "If you created the file by hand and Claude Code hasn't written to it yet, add it to `.gitignore` yourself." And the [permissions docs](https://code.claude.com/docs/en/permissions) say that when the file is tracked in git, Claude Code "treats it as repository-supplied instead and holds its rules until you trust the folder."

## How do you review and remove saved rules?

Run `/permissions`. The docs say: "The dialog lists all permission rules and the `settings.json` file each rule comes from." You can add or remove a rule there, even while Claude is working. Rules are checked deny first, then ask, then allow, so a matching deny always wins.

A short routine we think is worth five minutes:

* Open `/permissions` and read every allow rule.
* Remove any rule with a password, token or key inside it.
* Change that secret, since it sat in a file on your disk.
* Make sure `.claude/settings.local.json` is not tracked in your repository.

## How do you keep .env files out of reach?

Add `Read` deny rules. This is the docs' own example for `~/.claude/settings.json`, which lets your lint and test commands run without asking "and stop it reading `.env` files" ([Settings](https://code.claude.com/docs/en/settings)):

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "allow": [
      "Bash(npm run lint)",
      "Bash(npm run test *)"
    ],
    "deny": [
      "Read(./.env)",
      "Read(./.env.*)"
    ]
  }
}
```

A `Read` deny rule also blocks the Edit and Write tools on that path, and it covers file commands Claude Code recognizes in Bash, "such as `cat`, `head`, `tail`, `sed`, and `tee`" ([Read and Edit rules](https://code.claude.com/docs/en/permissions#read-and-edit)). It has limits, in the docs' words: the rules "don't apply to a command that reads files without naming them, such as `grep -r pattern .` run from the directory that holds the file", or to "a Python or Node script that opens files itself". For a block every process obeys, the docs point you to the sandbox. And a `.claudeignore` file "has no effect, so move its entries into `Read` deny rules."

<figure class="mg" data-scene="strainer"><img src="/blog/assets/media/claude-code-privacy-and-secrets/strainer.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. Small file cards pour into a kitchen strainer; cards named notes and README pass through, while the card named .env stays in the mesh under the words Read(./.env) denied. Tap the strainer and it shakes, and the .env card still stays."><figcaption>A Read deny rule such as Read(./.env) blocks Claude's file tools and recognized commands like cat. Claude Code docs, checked 9 Nov 2026.</figcaption></figure>

## Which permission mode should you use?

For a repository with secrets nearby, Manual mode, which the docs call `default`: it "Prompts for permission on first use of each tool". The [modes table](https://code.claude.com/docs/en/permissions#permission-modes) lists six modes:

* `default`: prompts on first use of each tool.
* `acceptEdits`: accepts file edits and common file commands in the working directory.
* `plan`: reads and explores but doesn't edit your source files.
* `auto`: a background classifier checks actions such as shell commands and network requests.
* `dontAsk`: denies every call that would otherwise prompt.
* `bypassPermissions`: skips prompts, except for the actions no mode auto approves.

To change the mode new sessions start in, set `defaultMode` in a settings file. Our view: pick the mode for the task, but write the deny rules before you need them.

## Where to read next

For the wider picture, read [security for AI coding agents](/blog/security-for-ai-coding-agents/), [agent security and sandboxing](/blog/agent-security-and-sandboxing/) and the [Claude Code Max plan tips](/blog/claude-code-max-plan-tips/). Our [install guide](/blog/how-to-install-and-use-munder-difflin/) covers the desktop app.

<link rel="stylesheet" href="/blog/assets/media/claude-code-privacy-and-secrets/motion.css"><script defer src="/blog/assets/media/claude-code-privacy-and-secrets/motion.js"></script>
