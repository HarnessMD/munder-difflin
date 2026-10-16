---
title: "AI Agent Use Cases From a Real Company: Every Agent on Our Floor and the Job It Does"
seoTitle: "AI Agent Use Cases: The Jobs Our Own Agents Do Every Day"
description: "We run our company on Munder Difflin. Every seat on our floor: what each AI agent does, how its work starts, what comes out, and how to copy it."
date: 2026-10-14
category: guides
categoryLabel: Guides
type: Non-technical
pinned: true
pinOrder: 3
startHere: true
startOrder: 3
primaryKeyword: "ai agent use cases"
secondaryKeywords: ["multi agent use cases", "ai agent team examples", "munder difflin use cases", "ai agents for a small company", "what can ai agents do", "ai agent roles", "ai agent workflows"]
tags: ["Guides", "Multi-Agent", "Getting Started", "AI Agents"]
faq:
  - q: "How many AI agents do you need to start?"
    a: "One. Every office starts with an orchestrator, the agent you talk to. Add a second agent when a job repeats, and a third when you want one agent to check another's work. Ours has fourteen today."
  - q: "Do all the agents run on the same model?"
    a: "No. Each agent picks its own engine and model when you add it. On our floor the research scout runs on Antigravity and the others run on Claude Code."
  - q: "Can the agents send email or merge code on their own?"
    a: "Email, no: it is written as a draft and never sent. Code, partly: our engineering lead merges into a release branch but never into main, and pull requests to this website wait for a person. Community triage adds labels and closes nothing. We set those limits in each agent's brief."
  - q: "What is a temp?"
    a: "A temp is a short lived agent started for one job. It gets an objective and a working folder, does the job, reports done and is removed. A lasting agent keeps its memory and its inbox; a temp's are filed away when it ends."
  - q: "Does the office keep working when the laptop is closed?"
    a: "No. The agents, schedules and connections run on your own computer, so they stop when it sleeps. Two of our scheduled agents check for mains power first and skip the run on battery."
---

We run our own company on [Munder Difflin](https://harnessmd.com/download), and these are the AI agent use cases on our floor: fourteen agents, each with one job, one way its work starts and one thing it hands back. Checked against our own records on 14 Oct 2026.

Munder Difflin is free and open source: a desktop app that runs a team of coding agents such as Claude Code, Codex and Gemini CLI on your own computer. New here? The [install guide](/blog/how-to-install-and-use-munder-difflin/) gets you a working office, [your first hour](/blog/your-first-hour-with-munder-difflin/) covers the first jobs, and the [Guides hub](/blog/topics/guides/) has the rest.

## What does the whole floor look like?

Fourteen agents, and each seat has one job. Most names come from the cast the app ships with; BOB, AgentG and Darryl are names we chose.

| Seat | Agent | The job in one line | How its work starts |
| --- | --- | --- | --- |
| Orchestrator | your clone | Takes your orders, splits them into jobs, asks you only what needs you | Your chat |
| Mission control | Ryan | Keeps one page of company numbers fresh | A schedule, every 6 hours |
| Community lead | Angela | Sorts what users say into a digest and a demand list | When the orchestrator asks |
| Growth | Jim | Researches and writes this blog | Schedules at 09:30 and 21:30 |
| Motion graphics | BOB | Launch videos and animation loops from real app screens | A request |
| Research | AgentG | A daily scout report, a link for every claim | One message from Jim |
| Founder's office | Andy | Assists the founder: a morning briefing, Slack answers, email drafts | A schedule at 09:00, and Slack |
| Scrum master | Meredith | Keeps the task board readable | A schedule, every 12 hours |
| Engineering lead | Kevin | Plans the work and gates every piece | A builder saying "done" |
| Engineers | Darryl, Stanley, Creed, Dwight | Build the pieces | Kevin's orders (Dwight: the founder's) |
| Designer | Pam | Draws every new screen before any code | A task card |

Ad hoc agents and temps fill the gaps, and they get their own section below. Two seats, community and motion graphics, have been quiet since early October.

<figure class="mg" data-scene="floor"><img src="/blog/assets/media/ai-agent-use-cases-our-office/floor.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A floor plan of a small office on white, drawn from above, with eleven desks. Name cards drop onto the desks one by one: Orchestrator, Mission control, Community lead, Growth, Motion graphics, Research, Founder's office, Scrum master, Engineering lead, Engineers, Designer. A small pot plant on each desk grows a leaf as its card lands. The Engineers desk is wide, with four chairs, and one chair at the Research desk is left spinning."><figcaption>Our floor on 14 Oct 2026: eleven kinds of seat, fourteen agents, one job each. The drawing shows the seats as desks seen from above. Tap a desk to read its job and grow its plant a leaf.</figcaption></figure>

And here is part of the real thing, at six in the morning:

{% img "busy-office", "The middle of our real office floor on 14 Oct 2026, in the Classic view of version 0.5.5." %}

## What does the orchestrator do?

The orchestrator is the only agent you have to talk to. Ours takes an order from the founder's chat, writes a short dispatch for the right agent (the objective, the output, the tools, the limits) and reports back when it is done.

It also guards your attention. When only a person can move a job forward, it writes one short question on a card. We call that an ASK ME card. The answer goes back on the same card, and nobody sits idle waiting for it.

**Copy it:** you already have this seat. It is the agent you name during setup. [How the orchestrator routes work](/blog/how-the-god-orchestrator-works/) explains its decisions.

## Which agents work on a clock?

Four of ours do their main job on a schedule, with no person typing anything.

* **Andy, 09:00.** Sends the founder a morning briefing.
* **Jim, 09:30 and 21:30.** Checks search data, reads the scout's report, writes pages and opens one pull request per run. Three shorter checks a day look for new launches.
* **Ryan, every 6 hours.** Wakes on a schedule and, twice a day, runs the scripts that refresh the company dashboard. Asked for a number, it marks each one measured or inferred.
* **Meredith, every 12 hours.** Rewrites each workstream card in one shape: where it stands, who has it, what changed, what is next, what waits on you.

A board nobody can read is a diary. Meredith's has one reader, and that is enough.

<figure class="mg" data-scene="clock"><img src="/blog/assets/media/ai-agent-use-cases-our-office/clock.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A large wall clock with a pendulum on white. As the hand sweeps through one day, four cards slide out from behind the clock, one to each corner: 09:00 briefing, 09:30 and 21:30 blog runs, every 6 hours dashboard, every 12 hours task board. A dot on each card fills each time its agent starts."><figcaption>Four of our agents do their main job on a schedule: a briefing at 09:00, blog runs at 09:30 and 21:30, the dashboard agent every 6 hours and a task board update every 12 hours. Tap the clock to run the day again.</figcaption></figure>

**Copy it:** in the app, schedules live under Automations (Triggers in the classic office). Pick the agent, pick the time, and write the message. It is sent word for word on every run.

## Who writes the code, and who checks it?

Builders build, and a different agent decides whether it is good. That split is the most useful thing on our floor.

1. **Pam draws first.** Every new screen is an HTML page with its loading, empty and error states before anyone writes app code.
2. **Builders build to an order.** Darryl, Stanley and Creed each get a piece from Kevin, with the files and the limits named. Dwight builds the next release directly with the founder.
3. **Kevin is the gate.** He reads the diff, writes his own tests, runs the full suite and merges into a release branch, never into main.
4. **Creed reads second.** Code that guards keys or commands gets a second, independent read.
5. **Pam compares.** The built screen is checked against her drawing, picture by picture.

On our floor the gate writes the tests, not the builder. Nobody grades their own homework.

<figure class="mg" data-scene="gate"><img src="/blog/assets/media/ai-agent-use-cases-our-office/gate.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A drawing board, a workbench and a small drawbridge stand in a row on white. A paper screen design leaves the drawing board, labelled draws first, becomes a jigsaw piece at the workbench, labelled build to an order, and hops up to the raised bridge under a sign reading the gate. Three lights come on one by one: reads the diff, own tests, full suite. The bridge lowers and the piece hops across and clicks into a row of pieces labelled release branch."><figcaption>How a change gets released on our floor: the designer draws it, a builder builds it, and a different agent reads the diff, writes its own tests and runs the full suite before it joins a release branch. Tap the bridge to send another piece.</figcaption></figure>

**Copy it:** add a second agent whose only job is review. [How agents verify their own work](/blog/how-ai-agents-verify-their-own-work/) has the method.

## Who deals with the outside world?

Four agents read what is outside the office, and none of them takes the final step alone.

* **Angela** runs the community queues: GitHub issues, pull requests and discussions, Discord and forums. She writes a digest and a demand list ranked by how many different people asked. On GitHub she can add labels. She cannot close or merge.
* **Andy** answers the founder on Slack and drafts his email. A person sends it.
* **AgentG** reads the open web for the daily scout report: signed out, read only, and with a rule to leave a source out when it cannot open it.
* **Jim** opens pull requests to this website. A person merges them.

The pattern: agents read widely and write drafts, and the step you cannot take back stays with a person.

<figure class="mg" data-scene="drafts"><img src="/blog/assets/media/ai-agent-use-cases-our-office/drafts.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. Three clipboards hang in a row on white, each holding a sheet: email draft, pull request and triage label. The first two sheets have a dotted line to sign. A fountain pen lying on a rest labelled a person lifts, signs the email draft, which gets a tick reading sent, then signs the pull request, which gets a tick reading merged, and lies down again. The third sheet has no line to sign. It collects coloured labels and a tag reading labels only, and one label too many hangs off its edge."><figcaption>What our agents may do alone and what waits for a person: email is drafted and never sent, pull requests to this website wait for a merge, and triage adds labels and closes nothing. The drawing shows a person's approval as a signature. Tap the pen to sign again.</figcaption></figure>

## Which jobs get another engine, or no lasting agent at all?

Not every job deserves a desk.

**A scout on another engine.** AgentG runs on Antigravity while the others run on Claude Code. A scout reads a great deal and decides very little, so it can run on a different engine from the builders. [Model routing](/blog/do-more-with-less-model-routing/) covers the idea.

**Ad hoc agents.** We added a second scout on Grok on 2 Oct 2026 and removed it on 13 Oct 2026, when its usage limits kept running out. It was hired and gone in eleven days, with no farewell card.

**Temps.** A temp is started for one job and removed when it reports done. Jobs ours have done: run the test suite and write an honest report, fix one release bug as a relay of four, each picking up the last one's work, and free disk space on a laptop. That last job took three temps. The first freed nothing, the second ran out of budget, and the third freed 39 GiB.

**Sub agents** are different again: helpers inside one agent's own session. The fact reviewers and scene artists for this blog are sub agents of Jim. They never appear on the floor.

<figure class="mg" data-scene="temps"><img src="/blog/assets/media/ai-agent-use-cases-our-office/temps.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. Three job tickets stand on poles in a row on white: run the test suite, fix one release bug, free disk space. Beside them is a small house with a smoking chimney and a sign reading lasting agent. A tent arrives as a rolled bag and is pitched under the first ticket, a bar fills, the ticket is marked done, and the tent is packed and slides away. The same happens for the second and third jobs, and the third tent needs three goes to stand up. The house stays where it is."><figcaption>A temp is started for one job and removed when it reports done; a lasting agent keeps its desk, its memory and its inbox. The drawing shows temps as tents and the lasting agent as a house. Tap a job to pitch its tent again.</figcaption></figure>

## How does work move between them?

Through files, on purpose. Every agent has its own folder with an inbox, an outbox and a memory file, and no agent writes in another agent's folder.

* **Messages.** An agent drops a small file in its outbox and the app delivers it. Two kinds of message, inform and done, end a thread, so two agents cannot reply to each other forever. A third kind, note, is information only and wakes nobody.
* **The plan.** One written plan that only the orchestrator edits, and one task board of cards: todo, doing, blocked, done.
* **The circuit breaker.** It watches every agent for loops, error storms and overspending. It steers first, then limits the agent to reading, then stops it.
* **Secrets.** Keys never reach an agent. A local broker makes the outside call for it.
* **Memory.** Each agent's notes are searchable by the others, so a lesson learned once is not learned twice.

<figure class="mg" data-scene="relay"><img src="/blog/assets/media/ai-agent-use-cases-our-office/relay.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. Two cabinets shaped like folders stand on white, each with two tube ends labelled outbox and inbox. Clear pneumatic tubes join them and cross inside a box in the middle labelled the app. A small file drops into the first cabinet's outbox and becomes a capsule, which shoots through the tube, passes through the app and lands in the second cabinet's inbox. A capsule labelled done travels back the other way to the first inbox. A tick lights on the app and a flap closes over each outbox to show the thread is finished."><figcaption>How one agent asks another for something: a file in its outbox, delivered by the app to the other's inbox. A message marked done or inform ends the thread, so two agents cannot loop. Tap the outbox to send a note.</figcaption></figure>

## How do you copy this office?

Start with three seats, not fourteen: the orchestrator, one builder and one scheduled job. Add a reviewer when the builder's work starts to matter, a scout when you keep looking the same things up, and a board keeper when the cards pile up.

| Seat | A first message to give it |
| --- | --- |
| Briefing | "Every weekday at 09:00, read the open task cards and your inbox. Write me one short briefing: what moved, what is stuck, what needs me. Never send anything outside the office." |
| Reviewer | "When a builder says a piece is done, read the diff, write your own tests and report pass or fail. Never merge to main." |
| Scout | "Each evening, list the five biggest launches in my field from the last 24 hours, with a link for each. If you cannot open a source, leave it out." |
| Board keeper | "Every 12 hours, rewrite each open card as: where it stands, who has it, what changed, what is next, what waits on me." |

Give each agent one job and one clear limit. Ours got useful the day we stopped asking any of them to do everything.

<link rel="stylesheet" href="/blog/assets/media/ai-agent-use-cases-our-office/motion.css"><script defer src="/blog/assets/media/ai-agent-use-cases-our-office/motion.js"></script>
