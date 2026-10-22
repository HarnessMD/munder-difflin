---
title: "What Is Claude Duet? Anthropic's Proactive Agent App, Explained"
seoTitle: "Claude Duet: What It Is, Who Can Get It and How It Works (Oct 2026)"
description: "Claude Duet is Anthropic's proactive agent app, in research preview since 21 Oct 2026: who can join, how it works, what it asks first and its limits."
date: 2026-10-22
category: concepts
categoryLabel: Concepts
type: Non-technical
primaryKeyword: "claude duet"
secondaryKeywords: ["what is claude duet", "claude duet waitlist", "claude duet vs cowork", "claude duet pricing", "claude duet research preview", "anthropic duet app"]
tags: ["Concepts", "AI Agents", "Automation"]
faq:
  - q: "Is Claude Duet free?"
    a: "Not as a separate product. Anthropic's announcement of 21 Oct 2026 says the research preview is included in Pro and Max plans and uses the same usage limits as the rest of Claude. Team and Enterprise plans are not included yet, says the product page, and access starts with US subscribers through a waitlist."
  - q: "How do I get Claude Duet?"
    a: "Join the waitlist on Anthropic's Claude Duet page. Anthropic says it is starting with Pro and Max users in the US and will email you as soon as Duet is ready for you. Once in, it runs as a standalone app on iOS and Android, and on claude.ai."
  - q: "Does Claude Duet need my computer to stay on?"
    a: "No. Anthropic says Claude Duet has a virtual machine with its own browser, so it does not need your laptop or phone to be on. You get a notification when a task is complete or needs your review."
  - q: "What will Claude Duet not do without asking?"
    a: "Before it sends a message, makes a payment, signs a document or deletes anything, Anthropic says it shows exactly what it is about to do and waits for your approval. Some things are off limits even with approval, such as trading securities or moving money between accounts."
  - q: "What is the difference between Claude Duet and Claude Cowork?"
    a: "Who starts the work. Anthropic's Cowork page says you give Cowork a goal and come back to finished work for review. Duet comes to you first: it sends a morning brief, checks your connected apps every few hours and messages you when something needs you. For now Duet lives in its own app, separate from the main Claude app."
---

Claude Duet is a new Anthropic app in which Claude works as a proactive agent: it briefs you each morning, works on tasks in the background and asks before it acts for you. Anthropic opened it as a research preview on 21 Oct 2026, by waitlist, starting with Pro and Max subscribers in the US.

This page sums up Anthropic's announcement and product page, both opened on 22 Oct 2026. Duet is built around business work. For a team of agents instead of one, [Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. Our [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup.

## What is Claude Duet?

Claude Duet is Anthropic's new app in which Claude acts as a proactive agent. Anthropic's [announcement](https://claude.com/resources/articles/claude-duet) says it brings you what needs your attention, does tasks you ask for, keeps working while you are away and checks with you before acting on your behalf. Anthropic says it built Duet "for professionals and small business owners with more on their plates than they can track."

| Claude Duet, 22 Oct 2026 | What Anthropic says |
| --- | --- |
| Status | Research preview, by waitlist |
| Who first | Pro and Max subscribers in the US |
| Cost | Included in Pro and Max; shares the plan's usage limits |
| Model | Claude Opus 5.5 |
| Where | Standalone app on iOS and Android, and on claude.ai |
| Apps it can use | "over 6,000 connectors and plugins in the Claude Marketplace" |

## How does Claude Duet work?

It starts from your Claude account. Your memory, skills and connected apps carry over, and you talk to Duet in one ongoing thread, by typing or by voice. Each morning it sends a short brief on the most important items across your connected apps. During the day it checks those apps every few hours and messages you only when something needs you. Anthropic says it does not check nonstop "because checking nonstop would use up your plan's limits much faster," and you can tell it what you want to hear about and how often.

For a task, Duet uses a virtual machine with its own browser, so your laptop or phone can be off. It works out which apps and steps to use, then notifies you when the task is done or needs your review. Anthropic's examples include finding missed Gmail and Slack messages, checking QuickBooks or Stripe for unpaid invoices, and drafting HubSpot follow ups.

<figure class="mg" data-scene="brief"><img src="/blog/assets/media/what-is-claude-duet/brief.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. Under a Morning brief header, five cards drop in and sort into two trays. Needs you holds Invoice overdue, Meeting moved and Contract to sign. Can wait holds Newsletter and Receipt. Tap a card to see a one line reason, such as Due today."><figcaption>How a morning brief splits items, based on Anthropic's description of Claude Duet (21 Oct 2026). The cards are examples.</figcaption></figure>

## What does Claude Duet ask before it acts?

Anything that sends, pays, signs or deletes waits for you. Anthropic says Duet reads, drafts and prepares work on its own, but before it sends a message, makes a payment, signs a document or deletes anything, it shows you exactly what it is about to do and waits for your approval. And: "A few things are off-limits even with your approval, like trading securities or moving money between accounts." You can disconnect any app it has access to.

<figure class="mg" data-scene="gate"><img src="/blog/assets/media/what-is-claude-duet/gate.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. Three lanes. In the top lane, labelled Works on its own, tokens reading Read, Draft and Prepare pass straight through. In the middle lane, Send a message, Make a payment, Sign a document and Delete anything wait at a closed gate labelled Your approval. In the bottom lane, Trade securities and Move money stop at a wall labelled Off limits. Tap Approve to let one waiting token through."><figcaption>What Claude Duet does alone, what waits for you, and what it never does, from Anthropic's announcement (21 Oct 2026).</figcaption></figure>

Purchases can use Link, Stripe's digital wallet: Duet confirms the item with you, Link asks you to approve the spend, and Duet pays with a virtual card, so your real card number is not shared. Anthropic says Duet's handling of credentials follows the design of Claude Managed Agents, "so it never directly sees your passwords or sign-in tokens," and that its actions are approved by the same auto mode classifier that guards Claude Code. A new classifier is "designed to reject requests to share the strictest tier of information, including credit card numbers and government identification."

## How does Claude Duet use your plan's limits?

Its background checks count against your plan's limits, so it can use allowance even when you ask for nothing. During the preview it shares your plan's usage limits with the rest of Claude, which Anthropic says it uses differently from a typical conversation, and larger tasks, such as a financial model or a deck, need more model turns and background work. Anthropic's wording is "the rest of Claude"; it does not say how Duet's checks sit next to heavy Claude Code use on the same plan, so watch your usage page in the first week.

<figure class="mg" data-scene="meter"><img src="/blog/assets/media/what-is-claude-duet/meter.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A wide bar labelled Your plan's usage limits fills from the left in three colours for Chats, Background checks and Large tasks. A small clock labelled Every few hours ticks, and each tick adds a block for a background check. A large block for Large tasks slides in, leaving the bar about three quarters full."><figcaption>Chats, background checks and large tasks share one allowance during the preview (Anthropic, 21 Oct 2026). The bar shows the idea, not real numbers.</figcaption></figure>

## How is Claude Duet different from Cowork and Claude Code?

The difference is who starts. Based on Anthropic's pages, opened on 22 Oct 2026:

| | Claude Duet | Claude Cowork | Claude Code |
| --- | --- | --- | --- |
| Who starts | Duet, with a brief and messages | You, with a goal | You, with a coding task |
| Built for | Professionals and small business owners | "non-coding knowledge work" | "a bug fix, test, or multi-day migration" |
| Where it runs | Its own virtual machine; app on iOS, Android and claude.ai | Desktop app, rolling out on web and mobile | Terminal, IDE, Slack or web; macOS, Linux and Windows |

Our [Claude Cowork explainer](/blog/what-is-claude-cowork/) and [Cowork vs Claude Code](/blog/claude-cowork-vs-claude-code/) cover the other two. Can't get in yet? See the [Claude Duet waitlist](/blog/claude-duet-waitlist/), [Claude Duet alternatives](/blog/claude-duet-alternatives/), [Claude Duet for developers](/blog/claude-duet-for-developers/), [Claude Duet vs Munder Difflin](/blog/claude-duet-vs-munder-difflin/) and how to [build your own Claude Duet](/blog/build-your-own-claude-duet/). Our view: Duet is built to decide by itself when to talk to you, which is why the approval rules above matter more than the feature list. To see what a team of agents does in a day, read our [office use cases](/blog/ai-agent-use-cases-our-office/).

## What are Claude Duet's known limits?

Anthropic lists them itself. This is an early version, and "it still might misread a thread or miscalibrate what's urgent." Its core is built around work, so personal errands such as booking tickets "aren't quite as strong," and it cannot yet show you its browser. The product page adds that it "can miss something that arrives between checking in with you." It lives in its own app, separate from the main Claude app, and Anthropic says early users will shape how the two work together. Signing in to sites with logins saved in 1Password is announced but not yet available.

<link rel="stylesheet" href="/blog/assets/media/what-is-claude-duet/motion.css"><script defer src="/blog/assets/media/what-is-claude-duet/motion.js"></script>
