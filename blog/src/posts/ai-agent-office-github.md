---
title: "Open Source AI Agent Office Apps on GitHub (Oct 2026)"
description: "Open source AI agent office apps on GitHub, checked 23 Oct 2026: ChatDev, Munder Difflin, OpenHands, CrewAI, AG2 and three more, with licences."
date: 2026-10-23
category: comparisons
categoryLabel: Comparisons
type: Non-technical
primaryKeyword: "ai agent office github"
secondaryKeywords: ["agent office github", "ai agent office", "open source ai agent office", "ai office agents open source", "virtual office ai agents github"]
tags: ["Comparisons", "Open Source", "AI Agents"]
faq:
  - q: "What is an AI agent office?"
    a: "A desktop or web app that runs several AI agents as one team. Each agent has a role, the tasks sit on a shared board, and the agents pass messages to each other and to you. The work can be code, research, writing or any other knowledge work."
  - q: "Is there a free, open source AI agent office app?"
    a: "Yes. All eight projects on this list carry an open source licence on GitHub, checked on 23 Oct 2026. The software is free; you still pay for the model behind it, unless you run a local one. AgentOffice, for example, runs on local models through Ollama."
  - q: "Is MetaGPT still maintained?"
    a: "Not actively, as far as GitHub shows. On 23 Oct 2026 its last commit was from 21 Jan 2026 and its last release, v0.8.1, was from April 2024. The code is still MIT licensed and usable."
  - q: "What happened to AutoGen?"
    a: "Microsoft's AutoGen README now says the project is archived and no longer maintained, and points new users to Microsoft Agent Framework. AG2, which describes itself as formerly AutoGen, is still active and Apache 2.0 licensed."
  - q: "Can an AI agent office do work that is not coding?"
    a: "Yes, if the app is built for it. ChatDev 2.0 describes itself as a platform for developing everything, and Munder Difflin runs agents for all kinds of knowledge work, coding included. OpenHands, Pixel Agents and Claude Squad are built around coding agents."
---

An AI agent office is an app that runs several AI agents as one team, with roles, a shared board and messages. The open source ones on GitHub worth a look are ChatDev, [Munder Difflin](https://harnessmd.com/download), OpenHands, CrewAI, AG2, Pixel Agents, AgentOffice and Claude Squad. Checked 23 Oct 2026.

Licences and dates come from GitHub, read on 23 Oct 2026. This list sits in our [Comparisons hub](/blog/topics/comparisons/), next to our wider pick of [open source AI agents](/blog/open-source-ai-agents/).

## What is an AI agent office app?

It is a desktop or web app where several AI agents work as one team on your jobs. Three parts make it an office rather than a chat window:

- **Roles.** Each agent has a job, such as researcher, writer or reviewer.
- **A shared board.** Tasks sit where you and every agent can see them.
- **Messages.** Agents hand work to each other and ask you when they are stuck.

The work does not have to be code; research, reports and spreadsheets fit the same shape. Our [multi agent harness explainer](/blog/what-is-a-multi-agent-harness/) covers the idea, and [Run an office of AI agents](/blog/run-an-office-of-ai-agents/) shows a working day.

<figure class="mg" data-scene="corkboard"><img src="/blog/assets/media/ai-agent-office-github/corkboard.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white desk, three stacked trays are labelled Researcher, Writer and Reviewer. A corkboard labelled Shared board holds cards that slide from a To do column to a Done column. A row of pigeonholes labelled Messages fills and empties as small envelopes pass between the trays."><figcaption>The three parts of an AI agent office: roles, a shared board and messages.</figcaption></figure>

## Which open source agent office apps are on GitHub?

Eight projects pass three tests: an open source licence, a commit in the last three months, and a README that describes several agents working together.

**1. ChatDev.** [ChatDev](https://github.com/OpenBMB/ChatDev) from OpenBMB began as a "Virtual Software Company" with agents such as CEO, CTO and Programmer. Its README calls version 2.0, released on 7 Jan 2026, "a Zero-Code Multi-Agent Platform for Developing Everything", run from a web console. Apache 2.0. Best for: designing an agent team without code.

**2. Munder Difflin.** This is what we make. [Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. MIT licence, code at [HarnessMD/munder-difflin](https://github.com/HarnessMD/munder-difflin). A Cloud Office and a mobile app are coming soon. The [install guide](/blog/how-to-install-and-use-munder-difflin/) goes from download to a first agent. Best for: a ready office for technical and non technical work.

**3. OpenHands.** [OpenHands](https://github.com/OpenHands/OpenHands) now leads its README with Agent Canvas, which "turns your coding agents into a self-hosted, always-on engineering team". It runs its own agent or Claude Code, Codex, Gemini, Pi and OpenCode, on a laptop or a server. MIT. Best for: a coding team that keeps working with your laptop shut.

**4. CrewAI.** [CrewAI](https://github.com/crewAIInc/crewAI) is "an open-source Python framework" for multi agent workflows, with "role-based AI agents". It is a library you code against, not an app; a paid AMP Suite adds a control plane. MIT. Best for: Python developers building their own office.

**5. AG2.** [AG2](https://github.com/ag2ai/ag2), formerly AutoGen, is "an open-source programming framework for building AI agents and facilitating cooperation among multiple agents". Apache 2.0. Best for: AutoGen style teams that still get updates.

**6. Pixel Agents.** [Pixel Agents](https://github.com/pixel-agents-hq/pixel-agents) turns the coding agents in your terminals into "animated pixel-art characters working in a tiny office", in VS Code or a browser. Claude Code is the agent it supports today, and its README lists a task board as a plan: "Most of this is still ahead." MIT, v1.5.0 on 17 Oct 2026. Best for: seeing which agent is busy.

**7. AgentOffice.** [AgentOffice](https://github.com/harishkotra/agent-office) promises "Self-growing AI teams in a pixel-art virtual office" on local models through Ollama. Agents talk, take tasks from a TaskBoard and can hire new team members on their own, which is more autonomy than most interns get. MIT, last commit 25 Sep 2026. Best for: tinkering with a local, visual team.

**8. Claude Squad.** [Claude Squad](https://github.com/smtg-ai/claude-squad) is "a terminal app that manages multiple" agents such as Claude Code, Codex and Gemini, each task in "its own isolated git workspace". No roles or board; it is the lean option. AGPL 3.0, v1.0.20 on 20 Aug 2026. See [Claude Squad vs Munder Difflin](/blog/claude-squad-vs-munder-difflin/).

<figure class="mg" data-scene="shelf"><img src="/blog/assets/media/ai-agent-office-github/shelf.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. Eight plain boxes slide one by one onto a long white shelf, labelled ChatDev, Munder Difflin, OpenHands, CrewAI, AG2, Pixel Agents, AgentOffice and Claude Squad. As each box lands, a small tag drops onto it with its licence: Apache 2.0, MIT or AGPL 3.0."><figcaption>Eight open source agent office projects, licences checked on 23 Oct 2026.</figcaption></figure>

## Agent office apps compared, checked 23 Oct 2026

| Project | Kind | Licence | Latest activity |
| --- | --- | --- | --- |
| ChatDev | Web app | Apache 2.0 | Commit 16 Oct 2026 |
| Munder Difflin | Desktop app | MIT | Commit 22 Oct 2026 |
| OpenHands | Self hosted app | MIT | Commit 23 Oct 2026 |
| CrewAI | Python framework | MIT | Commit 23 Oct 2026 |
| AG2 | Python framework | Apache 2.0 | Commit 22 Oct 2026 |
| Pixel Agents | Viewer | MIT | v1.5.0, 17 Oct 2026 |
| AgentOffice | Browser app | MIT | Commit 25 Sep 2026 |
| Claude Squad | Terminal app | AGPL 3.0 | v1.0.20, 20 Aug 2026 |

Licences come from the GitHub API, dates from commit histories and releases. The kinds are our labels.

## Is an agent framework the same as an agent office app?

No. A framework is a library you write code against; an office app is something you open and use. ChatDev, Munder Difflin, OpenHands and AgentOffice are apps you run. CrewAI and AG2 are what you would build one with. Our view: if you do not want to write Python, start with an app. [How to choose a multi-agent tool](/blog/how-to-choose-a-multi-agent-tool/) has a checklist, and [CrewAI and AutoGen vs a local agent harness](/blog/crewai-autogen-vs-a-local-agent-harness/) covers the split.

<figure class="mg" data-scene="bins"><img src="/blog/assets/media/ai-agent-office-github/bins.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. Three white bins stand in a row, labelled Apps you run, Frameworks you code and Viewers you watch. Name cards drop from above: ChatDev, Munder Difflin and OpenHands land in Apps you run, CrewAI and AG2 in Frameworks you code, and Pixel Agents in Viewers you watch."><figcaption>Apps you run, frameworks you code against, and a viewer, as their READMEs described them on 23 Oct 2026.</figcaption></figure>

## Which projects did we leave out, and why?

Six well known names failed the check on 23 Oct 2026:

- **MetaGPT.** MIT and famous for its AI software company, but its last commit was 21 Jan 2026 and its last release, v0.8.1, is from April 2024.
- **AutoGen.** Its [README](https://github.com/microsoft/autogen) says "Project archived and no longer maintained" and points to Microsoft Agent Framework. AG2 carries the AutoGen line on.
- **AI Town.** MIT, but it is "a virtual town where AI characters live, chat and socialize". Nobody files a report.
- **Claw Empire** and **Star Office UI.** Pixel offices with no commit since March 2026; GitHub could not match Star Office UI's licence to a standard one.
- **AionUi.** Apache 2.0 and busy, but we read it as a cowork app with many agents in one window, not a team with roles and a board.

<figure class="mg" data-scene="lamps"><img src="/blog/assets/media/ai-agent-office-github/lamps.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A row of white desk lamps sits on a long table. Lamps labelled MetaGPT, last commit 21 Jan 2026, and AutoGen, archived, dim to grey one after the other. A card labelled AG2 slides under the AutoGen lamp and its bulb glows blue again."><figcaption>MetaGPT has had no commit since 21 Jan 2026 and AutoGen's README says it is archived, checked on 23 Oct 2026.</figcaption></figure>

## Which agent office app should you pick?

Pick by whether you want to write code and what work the team does.

- **ChatDev** to design an agent team without code.
- **Munder Difflin** for a ready desktop office for any knowledge work, coding included.
- **OpenHands** for an always on coding team on a server.
- **CrewAI** or **AG2** to build your own in Python.
- **Pixel Agents** or **AgentOffice** to watch agents as pixel art.
- **Claude Squad** for parallel coding sessions in the terminal.

For Claude Code in particular, see [the best Claude Code multi agent tools](/blog/best-claude-code-multi-agent-tools/).

<link rel="stylesheet" href="/blog/assets/media/ai-agent-office-github/motion.css"><script defer src="/blog/assets/media/ai-agent-office-github/motion.js"></script>
