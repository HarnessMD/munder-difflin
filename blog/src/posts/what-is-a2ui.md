---
title: "What is A2UI? Google's A2UI 1.0, explained"
description: "A2UI 1.0 is Google's stable open protocol for agents that answer with native screens. What it is, what 1.0 adds, and how it fits MCP Apps and AG-UI."
date: 2026-11-12
category: concepts
categoryLabel: Concepts
type: Technical
primaryKeyword: "a2ui"
secondaryKeywords: ["what is a2ui", "a2ui 1.0", "a2ui protocol", "a2ui vs mcp apps", "a2ui vs ag-ui"]
tags: ["Concepts", "Open Source", "MCP", "AI Agents"]
faq:
  - q: "Is A2UI open source?"
    a: "Yes. The GitHub API lists the a2ui-project/a2ui repo under the Apache License 2.0, checked 12 Nov 2026. Google's 11 Nov 2026 post calls its renderer SDKs \"open-source\"."
  - q: "Is A2UI the same as AG-UI?"
    a: "No. AG-UI's introduction describes A2UI as \"a generative UI specification\" and AG-UI as the protocol \"which connects an agentic frontend to any agentic backend\". The same page says the two \"are quite different and work well together\"."
  - q: "Does A2UI work in Claude?"
    a: "Google's post says the web and Flutter renderers work inside MCP Apps, \"so A2UI screens can appear in AI assistants that support MCP Apps, such as Claude and Gemini.\" It also says Alation already shows its A2UI feeds in Claude."
  - q: "Which platforms does A2UI render on?"
    a: "Per Google's 11 Nov 2026 post: React, Angular and Lit on the web, Flutter on mobile, web and desktop, and SwiftUI on iOS and Jetpack Compose on Android, which the post marks \"currently v0.9.1, and v1.0 coming soon\"."
  - q: "How do I move from A2UI 0.9 to 1.0?"
    a: "Google points 0.9 users to an evolution guide that \"covers every change\". The 1.0 specification lists renamed wire envelopes, bindings prefixed with @ and new function call messages among the differences."
---

A2UI is Google's open protocol that lets an AI agent answer with an interactive screen, such as a form or a chart, which your app draws with its own components. Google [released A2UI 1.0](https://developers.googleblog.com/a2ui-10-build-delightful-fast-reliable-agentic-experiences/), which it calls "the first stable version", on 11 Nov 2026. Checked 12 Nov 2026.

A2UI screens can also run inside MCP Apps, so if MCP is new to you, start with [what is an MCP server](/blog/what-is-an-mcp-server/). If you run several agents at once, our [Herdr alternatives](/blog/herdr-alternatives/) guide compares tools that run them side by side. More explainers live under [Concepts](/blog/topics/concepts/).

## What is A2UI?

A2UI is a protocol plus a set of libraries that let an agent send a user interface as data instead of a reply in text. Google's [announcement](https://developers.googleblog.com/a2ui-10-build-delightful-fast-reliable-agentic-experiences/) sums it up: "the agent describes what to show, and every app draws the UI with its own native components." The problem it targets, in the same post, is the agent reply that arrives as "a wall of text, a poor way to compare three products or edit and approve a detailed plan."

The [A2UI README](https://github.com/a2ui-project/a2ui) expands the name as "Agent-to-User Interface" and calls it "an open-source generative UI framework", with a streaming protocol, "native renderers for web and mobile frameworks, and agent SDKs in several popular languages."

The old address, github.com/google/A2UI, now leads to a2ui-project/a2ui. The GitHub API listed the Apache License 2.0, a creation date of 24 Sep 2025 and 17,124 stars at 07:35 UTC on 12 Nov 2026. Its [releases](https://github.com/a2ui-project/a2ui/releases) had no release or tag named 1.0 when we read them; the newest was A2UI CLI v0.3.0, published 11 Nov 2026.

## What is new in A2UI 1.0?

A stable protocol with function calls in both directions, renderer libraries for major platforms, and new agent SDKs. From Google's post:

* Bidirectional function calls, "so a flight or reservation picker can check availability on the spot".
* Support for accessibility, and extensions "for any additional metadata".
* Renderers for React, Angular and Lit on the web, Flutter on mobile, web and desktop, and "SwiftUI on iOS and Jetpack Compose on Android (currently v0.9.1, and v1.0 coming soon)". Further down, the post says "The Jetpack Compose renderer supports 0.9.1 today, with 1.0 coming soon."
* "New SDKs for TypeScript and Dart along with Python".
* Swappable inference formats that "reduce latency", and in Python, A2UI Macros, which "add programmatic component expansion and data binding".

The [1.0 specification](https://a2ui.org/specification/v1.0-a2ui/) gives its status as "Current". It names the new messages `callRendererFunction`, `callAgentFunction`, `rendererFunctionResponse` and `agentFunctionResponse`, and it removes theme colours from the protocol so styling comes from the target framework's native theme.

<figure class="mg" data-scene="zipper"><img src="/blog/assets/media/what-is-a2ui/zipper.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a blue zipper lies open with one row of teeth labelled Agent and the other labelled App. A small card on the App side reads Flight picker. Tap the pull tab and it slides up, the teeth lock together, a tag reading Check availability crosses from App to Agent and a tag reading Available crosses back."><figcaption>A2UI 1.0 adds function calls in both directions. Google Developers Blog, 11 Nov 2026.</figcaption></figure>

## How does A2UI work?

The agent streams JSON messages that describe a screen, and a renderer in your app turns them into native widgets. The spec says "Communication occurs via a stream of JSON objects" and defines four agent to renderer message types: `createSurface`, `updateComponents`, `updateDataModel` and `deleteSurface`. Components arrive as a flat list linked by ID, and data arrives on its own, so the agent can change content "without resending the entire component structure."

The README splits the stack into three layers. In inference, a model guided by an A2UI skill describes the UI. In transport, an agent SDK validates that output and turns it into protocol messages. In rendering, a core library, a framework adapter and a widget catalog draw it.

The agent can only use what you allow. Google's post says agents "place and configure only the components you register", and the README says A2UI "expresses UI using data, not code", checked against a schema. Google also claims A2UI binds data on the server, "so sensitive values never reach the model."

<figure class="mg" data-scene="pegboard"><img src="/blog/assets/media/what-is-a2ui/pegboard.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a pegboard holds tools on labelled hooks: Button, Card, Chart and Date picker. A note labelled Agent slides in and points at each tool in turn. Another outline labelled Map has no hook, shows the words Not registered and fades. Tap a hook and its tool lifts onto a small screen beside the board."><figcaption>Agents place only the components you register. Google Developers Blog, 11 Nov 2026.</figcaption></figure>

## A2UI vs MCP Apps and AG-UI

Google's post says A2UI and MCP Apps "work together", and AG-UI's introduction says A2UI and AG-UI "work well together". Facts checked on 12 Nov 2026:

| Name | What it is, in its own words | Who runs it | Licence |
| --- | --- | --- | --- |
| A2UI | "our open protocol for generative UI" | Google; code at a2ui-project/a2ui | Apache License 2.0 |
| MCP Apps | "Interactive UI applications that render inside MCP hosts like Claude Desktop" | The MCP project, repo modelcontextprotocol/ext-apps | Moving from MIT to Apache 2.0, per its LICENSE file |
| AG-UI | "an open, lightweight, event-based protocol" for connecting agents to apps | ag-ui-protocol on GitHub | MIT |

The [MCP Apps overview](https://modelcontextprotocol.io/extensions/apps/overview) says servers return "interactive HTML interfaces" that run "in a sandboxed iframe controlled by the host." Google's post says A2UI's web and Flutter renderers "also work inside MCP Apps, so A2UI screens can appear in AI assistants that support MCP Apps, such as Claude and Gemini." It adds that Alation already uses both to show its A2UI feeds in Claude. Our [post on Claude's 10 Nov tools](/blog/claude-sheets-whiteboards-data/) covers interactive tools in Claude that run on MCP Apps.

<figure class="mg" data-scene="projector"><img src="/blog/assets/media/what-is-a2ui/projector.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a small slide projector loads a card labelled A2UI screen. Its beam lands inside a frame on the wall labelled MCP Apps host, and the card appears there as a short form with a Confirm button. Tap Confirm and a green tick appears on the form."><figcaption>A2UI's web and Flutter renderers work inside MCP Apps. Google Developers Blog, 11 Nov 2026.</figcaption></figure>

[AG-UI's introduction](https://docs.ag-ui.com/introduction) calls A2UI "a generative UI specification" for delivering UI widgets, and AG-UI the protocol "which connects an agentic frontend to any agentic backend". It says the two "are quite different and work well together".

## Who is building with A2UI?

Google names Atlassian, Alation, Bloomberg and ByteDance as "already building with it". That is Google's claim, and the post gives these details:

* Atlassian is "bringing A2UI to Jira", where an agent asks the team for a missing detail with "an interactive card in the work item".
* Alation's AIOS builds its feeds with A2UI, and the post shows the same feed in Claude and in Alation.
* ByteDance released an A2UI renderer for Lynx in June 2026, and "Lynx supports A2UI 0.9 today and is adapting to 1.0".
* Inside Google, Gemini Notebook answers with A2UI cards, and Gemini "supports A2UI 0.9.1 today".

Bloomberg is named with no further detail.

## Where does a team of agents fit in?

A2UI covers what an agent shows a person; running the agents behind those screens is a separate job. We think the next question after "can my agent answer with a form?" is how several agents split the work without stepping on each other.

If you run several agents at once, [Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. Its agents run on engines such as Claude Code, Codex and Gemini CLI and can use MCP servers and skills. The [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup.

<link rel="stylesheet" href="/blog/assets/media/what-is-a2ui/motion.css"><script defer src="/blog/assets/media/what-is-a2ui/motion.js"></script>
