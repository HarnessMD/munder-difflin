---
title: "What is Claude Ship? Anthropic's pull request agents"
description: "Claude Ship is Anthropic's set of GitHub pull request agents: Code Review, PR Steward and Claude Approvals. Plans, billing, limits and the /ship command."
date: 2026-11-24
category: concepts
categoryLabel: Concepts
type: Technical
primaryKeyword: "claude ship"
secondaryKeywords: ["what is claude ship", "claude pr steward", "claude approvals", "claude code review", "claude code ship command"]
tags: ["Concepts", "Claude Code", "Human-in-the-Loop"]
faq:
  - q: "Is Claude Ship free?"
    a: "No. Each agent is billed on token usage through your organization's usage credits, separately from your plan's included usage, per Anthropic's docs, checked 24 Nov 2026. Claude Approvals has no base charge, but its classifier runs and the Code Reviews a policy starts are billed, even in observe mode."
  - q: "Which plans include Claude Ship?"
    a: "Team and Enterprise, for repositories on GitHub. Code Review is generally available; PR Steward and Claude Approvals are in public beta. The agents are not available with Zero Data Retention, the HIPAA configuration or customer managed encryption keys."
  - q: "Can Claude Ship merge a pull request by itself?"
    a: "PR Steward is designed not to approve or merge pull requests. Claude Approvals can post an approving review where your policy allows it, and a GitHub branch rule can count that review as the approval. The docs say \"Your settings and GitHub branch rules determine what merges.\""
  - q: "How is /ship different from PR Steward?"
    a: "/ship runs in your own Claude Code session in a terminal, its work appears under your name, and it counts against your usage. PR Steward is turned on by an Owner, works in a cloud session as the Claude GitHub App, and bills your organization."
  - q: "Do I need Claude Code to use Claude Ship?"
    a: "No. Anthropic's product page says \"Using Claude Ship does not require using Claude Code.\" The local /ship command is the part that runs in Claude Code."
---

Claude Ship is Anthropic's set of agents for GitHub pull requests, announced on 23 Nov 2026. In [Anthropic's words](https://claude.com/blog/introducing-claude-ship), "Claude can now review pull requests, fix them, and approve the ones that a team's policy allows." It has three agents, Code Review, PR Steward and Claude Approvals, on Team and Enterprise plans. Checked on 24 Nov 2026.

If you run AI agents, [Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. Its agents run on engines such as Claude Code, Codex and Gemini CLI. The [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup.

## What is Claude Ship?

Per the [Claude Ship docs](https://code.claude.com/docs/en/claude-ship), it is "a set of agents that help get your team's GitHub pull requests ready to merge", [launched](https://claude.com/blog/introducing-claude-ship) in beta on 23 Nov 2026. "Together, they can take a pull request through review, fixes, and an approval decision," the docs say.

<figure class="mg" data-scene="tugboat"><img src="/blog/assets/media/what-is-claude-ship/tugboat.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a yellow tugboat nudges a soft white parcel labelled Pull request across sky water. It passes three mint harbour markers labelled Review, Fixes and Approval, and each marker's blue light turns on as the parcel goes by, until the parcel rests at a lilac dock. Tap the tugboat to send the parcel round again."><figcaption>Review, fixes, then an approval decision. Anthropic docs, checked 24 Nov 2026.</figcaption></figure>

Anthropic's [product page](https://claude.com/product/claude-ship) adds: "Using Claude Ship does not require using Claude Code."

## What are the three Claude Ship agents?

They are Code Review, PR Steward and Claude Approvals, adopted "each one separately, repo by repo", per the product page.

### Code Review

Several agents read each change "alongside the surrounding code", and a verification step checks findings, per the [Code Review docs](https://code.claude.com/docs/en/code-review). "By itself, a review doesn't approve or block the pull request." Review levels are Quick, Standard and Deep.

### PR Steward

PR Steward "pushes commits to address review feedback, and attempts to fix failing checks and resolve merge conflicts", per the [PR Steward docs](https://code.claude.com/docs/en/pr-steward). It works in a cloud session and "pushes commits and replies to comments without asking first". To stop it on one pull request, remove the `claude-pr-steward-watching` label or comment `@claude stop`.

### Claude Approvals

Claude Approvals is "a check on GitHub pull requests that reports who still has to approve", per the [Approvals docs](https://code.claude.com/docs/en/approvals). Rules in `.claude/approvals.yml` set how many people a path needs and whether Claude may approve.

## What stays with you and GitHub?

The merge does: "Your settings and GitHub branch rules determine what merges," per the [Claude Ship docs](https://code.claude.com/docs/en/claude-ship). PR Steward "is designed not to approve or merge pull requests".

Where Anthropic hosts the session, its service refuses PR Steward's requests to approve a pull request, change branch protection, rulesets or statuses, write check runs, delete a branch or push tags, per [What PR Steward can access](https://code.claude.com/docs/en/pr-steward-security). "Merging, turning on auto-merge, and force-pushing" are left to GitHub's branch rules. Two checks screen those commands, but "a command that's written another way can pass both." So [setup](https://code.claude.com/docs/en/pr-steward-setup) asks for a required approval on the default branch, with the Claude GitHub App off the bypass list.

The Approvals check "blocks a merge only where you make it a required check in GitHub, and normally not in observe mode." Where a branch rule requires one approval, "Claude's approving review can be that approval." The docs warn: "If you use GitHub auto-merge or a merge queue with a policy that doesn't require a person's approval, a change can merge without anyone acting."

<figure class="mg" data-scene="gangway"><img src="/blog/assets/media/what-is-claude-ship/gangway.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a blue ship waits beside a mint dock with a soft white sign reading Branch rules. A lilac card labelled Policy stands on the dock. When the card turns yellow and shows a blue tick, a sky gangway labelled Merge lowers onto the ship; when the card turns back to lilac, the gangway lifts again. Tap the card to flip it."><figcaption>Your settings and GitHub branch rules determine what merges. Anthropic docs, checked 24 Nov 2026.</figcaption></figure>

## Who can use Claude Ship, and how do you turn it on?

Organizations on Team and Enterprise plans can, for repositories on GitHub, per the [docs](https://code.claude.com/docs/en/claude-ship). Those with Zero Data Retention, the HIPAA configuration or "customer-managed encryption keys" cannot. Anthropic's [launch post](https://claude.com/blog/introducing-claude-ship) of 23 Nov 2026 says eligible Enterprise organizations can claim "at least $10,000 in Claude Ship credits to use within 30 days of claiming" by January 15, 2027; terms apply. Checked 24 Nov 2026.

An Owner opens Organization settings > Claude Ship and turns on "one agent at a time in one repository": Code Review, then PR Steward set to **Manual (@claude steward)**, then a Claude Approvals policy in observe mode. A policy file on the default branch starts Approvals, so "anyone who can merge a policy file into the default branch can turn Approvals on". A GitHub organization owner installs the Claude GitHub App.

## What does the /ship command do in Claude Code?

`/ship` is "a Claude Code command that opens a GitHub pull request for your change if your branch doesn't have one", per the [/ship docs](https://code.claude.com/docs/en/ship-command). Claude reviews the change with `/code-review`, then works on failing checks, conflicts and comments. The last step: "once the pull request is ready, merge it yourself". `/steward` skips the review.

Unlike the GitHub agents, it runs "from the Claude Code CLI in a terminal" in your local clone, and "Cloud sessions don't have them." It uses your `gh` and `git` logins, so "its work on GitHub appears under your name", and it runs in your session, so it "counts against your usage". [PR Steward](https://code.claude.com/docs/en/pr-steward) "acts as the Claude GitHub App and bills your organization." It needs Claude Code v2.1.330 or later. The page warns: "Run a watch only where you trust everyone who can merge to the base branch or push to your branch."

## What should you watch for?

"Each agent is billed on token usage through your organization's usage credits, separately from your plan's included usage," per the [docs](https://code.claude.com/docs/en/claude-ship), and turning off usage credits does not stop one that is on. PR Steward "has no spend limit of its own until you set one". An Owner sets its monthly limit and, for each repository, a spend cap in US dollars; at the cap it stops on that pull request, and "Spend can pass the cap before it stops," per [PR Steward setup](https://code.claude.com/docs/en/pr-steward-setup). It can be on in up to 256 repositories, checked 24 Nov 2026.

<figure class="mg" data-scene="buoy"><img src="/blog/assets/media/what-is-claude-ship/buoy.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a blue boat labelled PR Steward sails across sky water toward a yellow buoy labelled Spend cap. A mint coin counter on the boat climbs as it goes, and when the boat reaches the buoy it stops and a soft white flag rises on the buoy. Tap the buoy to reset the counter and send the boat again."><figcaption>PR Steward stops on a pull request at its spend cap. Anthropic docs, checked 24 Nov 2026.</figcaption></figure>

* **Observe mode is billed.** Approvals "has no base charge", but its classifiers and the Code Reviews a policy starts are billed, "even in observe mode," per the [launch post](https://claude.com/blog/introducing-claude-ship).
* **Claude can approve with no review.** A rule with `claude: approves` "starts no Code Review by itself", per the [Approvals docs](https://code.claude.com/docs/en/approvals).
* **A policy file can stop automatic reviews.** They "normally stop where no matching rule names" `claude/code_review`, the docs say.
* **AI can miss things.** The [docs](https://code.claude.com/docs/en/claude-ship) say "Claude Ship uses AI and may miss bugs, security vulnerabilities, or other issues."

## How does Claude Ship relate to our pages?

Four of our posts are related.

* [Approving AI Agents: Human-in-the-Loop Without a Queue](/blog/human-in-the-loop-approving-ai-agents/)
* [How to Trigger Your AI Agent Hive from a GitHub Webhook](/blog/trigger-ai-agents-from-github-webhook/)
* [Claude Code Best Practices: 9 Habits From Anthropic's Docs](/blog/claude-code-best-practices/)
* [How to Get the Most Out of Your Claude Code Max Plan](/blog/claude-code-max-plan-tips/)

Our view: read the policy file and branch rules closely; together they decide whether a change can merge with no person looking.

## Claude Ship at a glance

Checked on 24 Nov 2026.

| Item | Detail |
| --- | --- |
| Made by | Anthropic, announced 23 Nov 2026 |
| Agents | Code Review (generally available); PR Steward and Claude Approvals (public beta) |
| Plans | Team and Enterprise, on GitHub |
| Billing | Tokens, from usage credits |

<link rel="stylesheet" href="/blog/assets/media/what-is-claude-ship/motion.css"><script defer src="/blog/assets/media/what-is-claude-ship/motion.js"></script>
