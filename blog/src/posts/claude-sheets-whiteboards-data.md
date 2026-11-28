---
title: "Claude Sheets, Whiteboards and Data: what launched on 10 Nov 2026"
seoTitle: "Claude Sheets, Whiteboards and Data: What Launched, Who Gets It"
description: "Claude Sheets and Whiteboards launched in beta on 10 Nov 2026 and Dashboards became Claude Data. What each does, which plans get it, admin defaults."
date: 2026-11-10
category: concepts
categoryLabel: Concepts
type: Non-technical
primaryKeyword: "claude sheets"
secondaryKeywords: ["claude whiteboards", "claude data", "claude dashboards", "claude interactive connectors", "claude sheets beta"]
tags: ["Concepts", "AI Agents", "Automation"]
faq:
  - q: "Is Claude Sheets free?"
    a: "No. Anthropic's announcement of 10 November 2026 says Sheets, Whiteboards and Data are available on all paid plans. Claude's pricing page, read 10 Nov 2026, marks all three as not included on Free."
  - q: "What happened to Claude Dashboards?"
    a: "It became generally available as Claude Data on 10 November 2026. Anthropic says it changed the name because the way companies use their data is broader than dashboards."
  - q: "Can I export Claude Sheets to Excel?"
    a: "Yes. Anthropic says you can export a sheet to .xlsx or CSV, or use Claude for Excel when you need the full functionality of Excel."
  - q: "When does Claude Data turn on for Enterprise plans?"
    a: "On 19 November 2026, per Anthropic's announcement. Whiteboards and Sheets stay off by default on Enterprise. Admins change all three in Organization settings > Artifacts."
  - q: "Does Claude Data need a connector?"
    a: "Yes. Anthropic says Claude Data needs a data connector, such as a warehouse or CRM."
---

Claude Sheets and Claude Whiteboards launched in beta on 10 Nov 2026, and Claude Dashboards became generally available as Claude Data, on all paid Claude plans, per [Anthropic's announcement](https://claude.com/resources/articles/sheets-whiteboards-data). They work on web, desktop and mobile. Team plans get all three on by default. Checked 10 Nov 2026.

We think this matters most if you brainstorm, plan a budget or read company numbers in Claude, then copy the result elsewhere. Anthropic's pitch: "Now, your documents, boards, sheets, and dashboards can stay in Claude, with access for your team to continue editing together." Our [Agent Tools Today for 10 Nov](/blog/agent-tools-today-2026-11-10/) has the rest of that day's news, and our [Claude Fable 5.2 page](/blog/claude-fable-5-2/) covers the model Anthropic released on 9 Nov.

## What launched on 10 Nov?

Three apps inside Claude, plus a bigger window for interactive connectors. The announcement lists the three:

| Product | Status on 10 Nov 2026 | In Anthropic's words |
| --- | --- | --- |
| Claude Whiteboards | Beta | "a shared board where your team brainstorms with Claude" |
| Claude Sheets | Beta | "a spreadsheet Claude builds and edits with you" |
| Claude Data | Generally available, with certified queries and live sharing in beta | Formerly Claude Dashboards; it "adds data stories, certified queries, and live sharing" |

Anthropic's [overview post](https://claude.com/resources/articles/more-ways-to-work-with-claude-sheets-whiteboards-and-interactive-connectors) of the same date says "an idea can carry over from a whiteboard to a spreadsheet to a dashboard".

## What is Claude Whiteboards?

It is a shared board where you and your team lay out ideas and Claude organizes them. Anthropic's example is a retro meeting: "everyone can add their notes, and Claude can group them by theme and draft the action items for each person."

The announcement lists more:

* Talk through a messy plan, and Claude turns it into a board with a timeline, owners and dates.
* Drag a box around part of the board and ask Claude questions about just that part.
* Ask Claude to turn the finished board into a doc or deck.
* Move the board into Lucid, Miro or Vani by Zoho, the tools Anthropic names.

We think the grouping is the useful part. Anyone who has sorted a wall of sticky notes after a retro knows why.

<figure class="mg" data-scene="easel"><img src="/blog/assets/media/claude-sheets-whiteboards-data/easel.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A paper flip chart stands on a pale wooden easel on a white background. Loose yellow and blue sticky notes drift across the page and slide into columns under the labels ideas and actions, then a heading that reads retro board appears at the top. Tapping the chart flips to a fresh page and the notes scatter and group again."><figcaption>Claude can group retro notes by theme and draft action items, per Anthropic's announcement of 10 Nov 2026.</figcaption></figure>

## What is Claude Sheets?

It is a spreadsheet Claude builds from a prompt and then edits with you. Anthropic says Claude "can now generate spreadsheets with tabs, formulas, formatting, and drop-downs, often from just a prompt like asking for a campaign tracker or a hiring budget."

Edits show where they happen. Claude "can edit in the cells, outlining each new edit so you can track changes", and you can share a sheet so your team and Claude work on it together.

Anthropic states the limit plainly: "For now, sheets have simple spreadsheet functionality, but we are working on adding more." When you need more, the announcement gives three ways out:

1. Export the file to .xlsx or CSV.
2. Use Claude for Excel.
3. Continue in a partner tool it names: Airtable, Asana, `monday.com` or Smartsheet.

Our view: treat Sheets as a quick first version of a tracker or a budget, and expect to move to Excel or a partner tool once the sheet outgrows "simple".

<figure class="mg" data-scene="seedtray"><img src="/blog/assets/media/claude-sheets-whiteboards-data/seedtray.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A green seed tray with a grid of small square cells sits on a white table. The cells fill with soil row by row, and a small paper tag pushed into a cell reads formula. A label on the side of the tray reads beta. Tapping the tray empties the cells and they fill again in order."><figcaption>Claude Sheets builds spreadsheets with tabs and formulas and launched in beta, per Anthropic's announcement of 10 Nov 2026.</figcaption></figure>

## What is Claude Data?

Claude Data is the new name for Claude Dashboards, now out of beta. Dashboards [launched in beta on 8 Oct 2026](https://claude.com/resources/articles/dashboards-and-motion) for quick questions about company data. On the rename, Anthropic says: "We changed the name because the way companies use their data is broader than dashboards, and the product now covers how they work more broadly."

What is new, per the 10 Nov announcement:

* **Certified queries, in beta.** Your data team certifies the queries everyone should use, and charts built on them carry a "certified" badge.
* **Live sharing, in beta.** Colleagues see current numbers in a shared dashboard even without access to the connectors behind it. "Viewers see dashboard results rather than the underlying data, and they can run only the queries you’ve approved."
* **Data stories.** Claude drafts data stories or narrated videos from your metrics, for you to review before sharing.
* **Caching.** Dashboards no longer reload on every load, and you set the refresh cadence for each dashboard.
* **Tracked changes.** You see who edited what and can roll back to a specific version.
* **Design systems.** Supported now, so a dashboard can match your look and feel.

Anthropic names Amplitude, Mixpanel, Omni, PostHog and Sigma as its partners for Claude Data.

<figure class="mg" data-scene="barometer"><img src="/blog/assets/media/claude-sheets-whiteboards-data/barometer.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A round brass barometer hangs on a white wall. Its needle swings across the dial and settles, and a small window under the needle reads live. A blue ribbon tied below the dial unrolls and reads certified. Tapping the dial makes the needle swing and settle again."><figcaption>Claude Data adds certified queries and live sharing, both in beta, per Anthropic's announcement of 10 Nov 2026.</figcaption></figure>

## Who gets it and how do admins turn it on?

Every paid plan gets all three, and Free does not. Claude's [pricing page](https://claude.com/pricing), read 10 Nov 2026, marks Claude Data, Claude Sheets (beta) and Claude Whiteboards (beta) as included on Pro, Max and Ultra, and not on Free. Its Team plan card lists "Claude Data, plus Motion, Sheets, and Whiteboards (beta)".

The announcement says the three "work on web, desktop, and mobile", and that "Claude Data needs a data connector, such as a warehouse or CRM."

Admin defaults depend on the plan:

| Plan | Whiteboards and Sheets | Claude Data |
| --- | --- | --- |
| Team | On by default | On by default |
| Enterprise | Off by default | On by default from 19 Nov 2026 |

Admins can change these at any time in **Organization settings > Artifacts**. Our view: if you run an Enterprise workspace, look at that setting before 19 Nov, not after.

## What changed for interactive connectors?

They can now open as a full tool beside your chat. A [companion article](https://claude.com/resources/articles/interactive-connectors-full-tool) of 10 Nov 2026 says that "where a connector supports it, you can open a tool beside your conversation or expand it to full screen". It is rolling out on the web and in the Claude desktop app on all plans.

Claude can then make changes in the open tool, and you "approve its actions the same way you approve a connector’s actions." The first group includes Asana, Canva, Carta, Dropbox, `monday.com`, Smartsheet, Vercel and Webflow, per that article. They run on MCP Apps, "the open extension to the Model Context Protocol".

## Working with these next to a team of agents

Sheets, Whiteboards and Data are Claude apps, and they sit next to whatever agents you already run. If you also want a team of agents working on your own computer, [Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. It runs engines such as Claude Code, Codex and Gemini CLI.

Our [Claude Cowork explainer](/blog/what-is-claude-cowork/) covers Anthropic's agent for office work, and our [Claude Code Max plan tips](/blog/claude-code-max-plan-tips/) cover usage limits on paid plans. The [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup, and the [Concepts hub](/blog/topics/concepts/) explains the terms.

<link rel="stylesheet" href="/blog/assets/media/claude-sheets-whiteboards-data/motion.css"><script defer src="/blog/assets/media/claude-sheets-whiteboards-data/motion.js"></script>
