---
title: "Your First Hour With Munder Difflin 0.5.10: Onboarding From First Sign In to a Working Office"
seoTitle: "Munder Difflin Onboarding: Your First Hour With 0.5.10"
description: "Your first hour with Munder Difflin 0.5.10: sign in, brief your orchestrator on Home, hire a team, schedule work, tour Pro, then meet the Cloud Office."
date: 2026-07-03
updated: 2026-11-23
category: guides
categoryLabel: Guides
type: Non-technical
pinned: true
pinOrder: 2
primaryKeyword: "munder difflin onboarding"
secondaryKeywords: ["getting started with munder difflin", "munder difflin tutorial", "munder difflin pro", "munder difflin temps", "munder difflin automations", "munder difflin stapler", "munder difflin first hour", "munder difflin cloud office"]
tags: ["Guides", "Onboarding", "Getting Started", "Multi-Agent"]
author:
  name: Chaitanya Giri
  initials: CG
faq:
  - q: "How long does it take to get Munder Difflin running?"
    a: "Setup is four short steps when an AI engine is already installed and signed in: download, sign in, name your workspace and your orchestrator. The rest of the hour goes on a first job, a small team and the first work that starts without you."
  - q: "Do I need Pro for this first hour?"
    a: "No, but you start in it. The app opens in the Pro view, and Pro is free up to 200M tokens a month. Agents, schedules, the context rules, webhooks, Slack and temps are in the Classic view too. The Pro view adds Home and screens for Tasks, Inbox, Automations, Memory and Capabilities, plus the Stapler, a small window above every app."
  - q: "What is a temp?"
    a: "A temp is a short lived agent started for one job. The orchestrator or any lasting agent can start one, and the app can start one to answer an inbound message. It does the job, reports done and leaves."
  - q: "Can one office mix Claude Code, Codex and other engines?"
    a: "Yes. Each agent picks its own engine and model when you add it, and can have its own token limit per period. Claude Code and Codex use their own sign in; OpenCode, Crush, Pi and Qwen take a key."
  - q: "Does the office keep working when I close my laptop?"
    a: "The office on your computer stops when the app closes or the laptop sleeps, because its agents, schedules, Slack and webhooks run there. A Cloud Office keeps working. It is an office on its own machine in the cloud, with its own orchestrator, and its agents work day and night while your computer sleeps. It comes with Max, and Teams can add one to a seat."
  - q: "Why did my agent's session clear itself?"
    a: "That is the Clear on a switch of work rule, which saves tokens. When an agent is woken for other work than it is on and its session is old enough, it writes a handoff file in its folder, its context is cleared, and then it gets the new work. The handoff carries the thread across. A Sleeping agent is different: it wakes into the same conversation."
startHere: true
startOrder: 2
---

Your first hour of Munder Difflin onboarding goes like this: sign in, give your orchestrator one real job, hire a small team, set up work that starts without you, then learn the Pro screens and the Cloud Office. This guide is written for version 0.5.10 and follows the clock.

[Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. Not installed yet? The [install guide](/blog/how-to-install-and-use-munder-difflin/) covers the download, the engines and every fix.

<figure class="mg" data-scene="hour"><img src="/blog/assets/media/your-first-hour-with-munder-difflin/hour.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A bus route map on white: one road runs left to right, bends round a hairpin past a pond and comes back, with seven stops on it. Each stop has a minute mark and a name: Minute 0, sign in; Minute 10, a first job; Minute 20, a small team; Minute 35, work that starts without you; Minute 45, temps and tokens; Minute 50, the Pro screens; Minute 55, the Cloud Office. A small yellow bus drives from stop to stop, the road turns blue behind it, and each stop lights up yellow as the bus arrives. The bus leans through the hairpin and leaves two skid marks."><figcaption>The first hour as a route: sign in, a first job, a small team, work that starts without you, temps and tokens, the Pro screens, then the Cloud Office. Tap a stop to send the bus there.</figcaption></figure>

## Minute 0: what do you need, and how do you sign in?

You need the app, one AI engine and an email address. The app can install a missing engine for you later.

The first launch asks **How are you using Munder Difflin?** Pick **On my own**, then:

1. Press **Open browser to sign in**. The browser does not open by itself.
2. Sign in in the browser. If the screen does not move on by itself, paste the code into **Code from the browser** and press **Use this code**.
3. **Name your workspace**, **Meet your orchestrator**, then **Open the workspace**.

A plans screen follows, **Run your agents like a company**: *Pick a plan, or start on Free.* Free is enough for this hour. [harnessmd.com](https://harnessmd.com) says: "The free plan lets you use Pro features up to a monthly allowance of work tokens." The [release notes](https://harnessmd.com/download) put it at 200M tokens a month.

You start in the Pro view: *Pro is the full office, and everyone starts here.* Classic, the pixel office, is one click away on the switch in the title bar. Most steps below work in both; the labels are the Pro view's.

## Minute 10: how do you give your orchestrator a first job?

Write a brief in the box on Home and send it to your orchestrator. Home is where the Pro view opens: your office's floor, with one box under it. Your orchestrator is the one agent that starts with you and runs the office; you named it during setup.

Pick who it goes to under **To**, or click an agent on the floor, and press **Send**. Your orchestrator hands the work to the right agent. A message to a busy agent waits its turn, or you can **Steer** the agent with it.

Brief it like a capable new hire: the outcome, the folder, and what done looks like. A vague brief gets a vague job. Compare:

* Weak: *"clean up my project"*
* Better: *"In the folder notes, read last week's meeting notes. Write one page of the decisions and the open questions, with who owns each one. Do not change the notes."*

Your orchestrator turns the brief into tasks, hands them to an agent, or starts a temp. There is no project to add first: it makes a folder inside your hive for each agent it starts. Click an agent to watch its terminal; press **IDE** to read what it wrote.

<figure class="mg" data-scene="brief"><img src="/blog/assets/media/your-first-hour-with-munder-difflin/brief.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. Two notepads on white above a long toaster marked your orchestrator. The pad tagged Weak reads clean up my project; the pad tagged Better reads the outcome, the folder, what done looks like. A slip drops from the weak pad into the first slot, the toaster works, and one grey card with a question mark pops up, wobbles and keeps smoking a little. A slip drops from the better pad into the second slot, and three task cards pop up, hop apart and each one gets a tick in its box."><figcaption>A brief with the outcome, the folder and what done looks like turns into clear tasks. A vague one turns into a question. Tap a note to drop it again.</figcaption></figure>

## Minute 20: how do you hire a small team?

Press **Add an agent**. Pick a face, an engine, a model and the folder it works in. Each agent can run on a different engine, and that is the point: put your best model on the hard work and a cheaper one on the chores.

One split to try on day one:

* a builder on **Claude Code**, writing the feature
* a reviewer on **Codex**, reading every change the builder makes
* a helper on a free engine such as Antigravity, for docs and tidying

An agent can have its own token limit per period (**Every 5 hours**, **Daily**, **Weekly** or **Monthly**) under **Budget** in its side panel. Sign every engine in before you hire on it; a Claude Code, Codex or Cursor agent that is not signed in stops at **Sign in needed**.

Your orchestrator can hire too: it adds lasting agents from agent files. Its switch, **Can add lasting agents on its own**, is in its **Configuration** tab and in **Settings**, **Autonomy & Budgets**. It is on unless you turn it off; while it is off, its requests wait. Each agent it adds is listed in your Inbox.

<figure class="mg" data-scene="team"><img src="/blog/assets/media/your-first-hour-with-munder-difflin/team.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. Three dotted outlines of office chairs stand in a row on white under a yellow button reading Add an agent, with the roles builder, reviewer and helper below them. A pointer presses the button three times; each press rolls in a chair, and an engine tag appears under it: on Claude Code, on Codex, on a free engine. The third chair arrives still spinning. A sheet of paper leaves the builder's chair, crosses to the reviewer's chair, is read line by line, gets a tick and comes back. Then the helper's heap of papers squares itself into a neat stack."><figcaption>A first team of three: a builder on Claude Code, a reviewer on Codex that reads every change, and a helper on a free engine for docs and tidying. Tap the builder to send another change for review.</figcaption></figure>

## Minute 35: how do you set up work that starts without you?

With an automation. In the Pro view open **Automations** and press **New automation**; in Classic, the same things live under Triggers. Two kinds start there, a schedule and a webhook, and Slack is a third way in.

**A schedule** sends a message to an agent on a clock. Choose **Schedule**, then fill in four things: a **Label**, **When** (an **Interval** or **Weekly**), **Sends to**, and the **Message**, then press **Save**. A good first one: every weekday morning, ask an agent to check something and write you three lines.

<figure class="mg" data-scene="schedule"><img src="/blog/assets/media/your-first-hour-with-munder-difflin/schedule.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A card on white titled Automations with a yellow New automation button; on the right, a horizon with an empty sky and an office chair. A pointer presses New automation, picks Schedule over Webhook endpoint, and four fields fill in: Label, morning check; When, Weekly rather than Interval; Sends to, an agent; Message, check something and write you three lines. The pointer leaves. A sun climbs over the horizon, the card fires by itself, and a paper slip flies to the chair and gets a tick. The pointer peeks back in to check, then leaves again."><figcaption>A schedule has four parts: a Label, When (an Interval or Weekly), Sends to, and the Message the agent gets every time it fires. Tap the card to fire it again.</figcaption></figure>

**A webhook** lets any tool that can send a web request start work. Choose **Webhook endpoint**. A new endpoint starts switched off: choose how much you trust the caller, copy its address and secret into the sending tool, then turn it on and press **Save**.

**Slack** lets people send work from a channel or a direct message and read the answer in the same thread. It is under **Integrations** (in Classic, **Settings**, then **Connections**). Press **Copy manifest**, then in Slack choose **Create New App**, **From a manifest**. The channel list opens on **All channels**, every channel the bot is in, and direct messages are answered too. Pick the agent under **Who answers inbound messages**. If Slack fails to start, it comes back by itself. The [Slack guide](/blog/connect-slack-to-munder-difflin/) has the full setup.

<figure class="mg" data-scene="slack"><img src="/blog/assets/media/your-first-hour-with-munder-difflin/slack.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On white, a Connections card under Settings with a Slack switch and a box for Every channel the bot is in; below it, three chat cards labelled a channel, another channel and a direct message. A pointer switches Slack on and ticks the box, and an office chair rolls into the empty seat under Who answers inbound messages. A string runs from each card to the chair. Each card posts a message, a note travels down its string to the chair, and a reply comes back and lands under that message as a thread. Then Slack switches itself off, the strings go slack, and it switches itself back on."><figcaption>One bot can hear every channel it is in, a direct message is always answered, and the reply comes back in the same thread. Tap a card to send a message.</figcaption></figure>

## Minute 45: what are temps, and how do you keep token use down?

A temp is an agent for one job. It gets an objective, does the work, reports done and leaves. There is no button for one. You ask your orchestrator: *"Start a temp to rename every file in this folder to lower case."*

* **Any lasting agent can start a temp**, not only the orchestrator. A temp cannot start a temp.
* **A temp can answer inbound messages.** Wherever you pick who answers, the list offers **A temp** and **A temp, clone of** one of your agents.
* **You set the limits** on the orchestrator's **Budget & breaker** tab: **Temps per agent**, from 0 to 4, and **Max temps at once** for the whole office.

<figure class="mg" data-scene="temp"><img src="/blog/assets/media/your-first-hour-with-munder-difflin/temp.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. Three office chairs stand on white over the words your lasting agents, beside the dotted outline of a folding chair. A message card reading one job waits at the top left, then flies across while a yellow folding chair slides in folded, half opens, snaps shut, then opens properly and gets a tag reading A temp. The message lands on its seat, a done card pops up and flies to the first office chair, and the folding chair folds flat and slides away. The three office chairs never move."><figcaption>A temp answers one message or does one job, reports done and leaves; your lasting agents keep their seats. Tap the message to send another.</figcaption></figure>

Tokens are the other limit. A full context is slow and uses up your plan's limits faster. Two rules under **Automations**, **Context** (Triggers in Classic) keep sessions small. Leave them on.

* **Compact when context fills** summarises a long session and carries the summary forward. Any agent can also ask for its own compact.
* **Clear on a switch of work**: when an agent is woken for other work and its session is old enough, it writes its handoff to `handoff.md` in its folder, its context is cleared, and then it gets the new work.

<figure class="mg" data-scene="tokens"><img src="/blog/assets/media/your-first-hour-with-munder-difflin/tokens.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On white, a tall glass on a coaster stands beside a card titled Context under Automations, with two rules switched on: Compact when context fills, and Clear on a switch of work. A pill below the card reads Leave them on. Paper slips drop into the glass until the pile nears a dashed line. The first rule lights up, a press with a yellow knob swings over and pushes down, and the slips squash into one slip labelled summary. A few more slips land on top. Then the second rule lights up: the glass turns upside down and is shaken, the slips fall out, the summary clings on until a second shake, and the glass turns back. A yellow note labelled with the handoff file's name drops into the empty glass and stays."><figcaption>Two rules keep sessions small: Compact when context fills summarises a long session, and Clear on a switch of work clears it and leaves a handoff file to carry the thread. Tap the glass to fill it again.</figcaption></figure>

Sleep saves resources too. Only the orchestrator starts with the app; other agents wake for messages and sleep after 60 minutes of inactivity, a time you can change. An agent shows **Sleeping** while it rests and **Waking up** while it starts again. Wake one with **Wake** on its screen or in its right click menu, or a click on its **Sleeping** label; it keeps the same conversation. A message sent as a note now wakes an idle agent at once, too.

The top bar shows how close you are: percent used for each engine you pick, amber from 80 percent. A click opens each vendor's own windows and reset times.

## Minute 50: what does the Pro view add?

One window with a sidebar, and a screen for each part of the office. **Home**, the floor and box from minute 10, comes first. **Integrations** holds your connected apps, chat apps, webhooks and keys. The switch in the title bar moves between **Classic** and **PRO**.

<figure class="mg" data-scene="sidebar"><img src="/blog/assets/media/your-first-hour-with-munder-difflin/sidebar.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. An app window on white with a switch in the title bar reading Classic and PRO, with PRO selected, and a sidebar of six rows: Tasks, Inbox, Automations, Memory, Capabilities, Stapler. A yellow highlight walks down the rows, and as each one lights, its one line note writes itself into the pane beside it: every card in the office; one conversation per agent; Scheduled, Context and Webhooks; Search every agent's memory; what each agent can reach; a small window that floats above every app. When the highlight reaches Stapler, that row lifts off the sidebar and floats above it with a small shadow under it."><figcaption>The Pro view is one window with a sidebar, a row for each part of the office. Tap a row to see what it is for.</figcaption></figure>

{% img "pro-sidebar-0510", "The Pro sidebar in Munder Difflin 0.5.10, with sample data: Home, Tasks, Inbox, Automations, Memory, Capabilities, Integrations and Stapler, then the Main Office and its agents. Pam's row reads Asked you: her question waits on you." %}

The **Theme** button sits in the top bar, right of the usage limits, on every screen. It opens **Simulation**: the looks your floor can take, such as Star Hike. *Simulations do not consume tokens.* Press **Create your own**, say what you want, and an agent builds it on a copy. Nothing changes until you save.

**Tasks** is every card in the office, as a **Board**, a **List** or **Cards**. Start the day on the **Asks me** filter: only the cards waiting on you. You can drag cards between columns; your orchestrator makes the change when you send your edits.

**Inbox** opens on **For you**: **Ask me**, then your orchestrator. **Your team** has one conversation per agent, and **Everyone** holds **All routed messages**. **Slack** and **Webhooks** get their own threads. When an agent asks you something, the question waits in **Ask me**, and the agent's row in the sidebar reads **Asked you**. Type a short answer and press **Answer**. It goes to the agent that asked and unblocks the task.

{% img "ask-me-0510", "Ask me at the top of the Inbox, under For you, in Munder Difflin 0.5.10 with sample data: one question waits with an answer box, Answer and Dismiss." %}

<figure class="mg" data-scene="askme"><img src="/blog/assets/media/your-first-hour-with-munder-difflin/askme.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On white, a large card with an Ask me chip and the word Inbox shows a question as grey lines with a lilac question mark, an answer field reading Answer in one line, a blue send button and a chip reading waiting on you. Beside it, three smaller question cards wait in a column under the words waiting on a person. A short answer types itself in as one line and is sent; the question mark turns into a mint tick and the chip becomes unblocks the task. The card slides away, the next question card grows into its place, and the queue shuffles up; the last card arrives a little too fast and bumps the one ahead. The new question gets its one line answer and its tick too."><figcaption>Ask me collects the questions waiting on a person. A short answer unblocks the task, and the card moves on. Tap the card to ask again.</figcaption></figure>

**Automations** is the list from minute 35, filtered by **Scheduled**, **Context** and **Webhooks**. Each schedule shows when it **Last fired**, and each webhook lists its **Recent** arrivals.

**Memory** lets you **Search every agent's memory** at once, as a **Graph** or a **List**. Search before you brief: if an agent solved this last week, the note is here.

**Capabilities** is what each agent can reach: a marketplace of MCP servers, skills, plugins and tools from the public list [HarnessMD/awesome-agent-capabilities](https://github.com/HarnessMD/awesome-agent-capabilities). Entries we have not reviewed read **Listed, not reviewed by us** and have no **Install** button.

**The Stapler** is a small window that floats above every app. On the **Stapler** screen, turn on **Show the stapler**, then click it for its ring:

* **Screenshot** sends a region of the screen, with a note, to the agent under **Send captures to**.
* **Record message** shows you the transcript before it goes.
* **Record meeting** records the microphone into a folder of transcripts, one folder per meeting.
* **Make invisible** hides the Stapler from screen sharing and recordings.

A fifth button, **Computer use**, cannot be turned on yet. The Stapler also transcribes meetings by their speech and keeps a history of dictations.

The habit: when you see a bug in any app, do not describe it. Staple it.

<figure class="mg" data-scene="stapler"><img src="/blog/assets/media/your-first-hour-with-munder-difflin/stapler.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On white, a plain app window made of grey bars, with a setting above it reading Show the stapler and a chip reading an agent. The setting switches on and a round stapler button pops up and floats over the corner of the app window. A pointer clicks it and a ring of four actions opens around it: Screenshot, Record message, Record meeting, Make invisible. Screenshot is picked, a crosshair drags a dashed box over part of the app, and the region lifts out as a capture. A note field reading your note slides in under it and a short line types itself in. The stapler's arm comes down and a staple joins the note to the capture, then the pair flies to the agent chip, which gets a tick. The ring opens again and stays."><figcaption>The Stapler floats above every app. Its ring offers Screenshot, Record message, Record meeting and Make invisible, and a capture goes to an agent with your note. Tap the stapler to open the ring.</figcaption></figure>

## Minute 55: how does the Cloud Office keep work going while you sleep?

A Cloud Office is an office on its own machine in the cloud, with its own orchestrator. Its agents keep working day and night, while your computer sleeps or is closed. The office on your computer stops when the app closes or the laptop sleeps.

It has the same screens as the office you know: Inbox, Tasks, Terminal, History and the details panel. Mail both ways: your agents here and its agents write to each other, and you can write to both. The two offices never sync, and an agent moves only when you ask.

A Cloud Office comes with Max. The [pricing page](https://munderdiffl.in/pricing.html), read on 22 Nov 2026, lists Max from $138 a month at the launch price (list price $148 a month). Max includes "Everything in Pro, with no token cap", "A Cloud Office of your own: 2 vCPU, 4 GB memory, 100 GB disk" and "Its own orchestrator, in the cloud". The same page on 22 Nov 2026 lists a "Cloud Office add on: $99 a seat a month" for Teams.

<figure class="mg" data-scene="cloud"><img src="/blog/assets/media/your-first-hour-with-munder-difflin/cloud.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a soft white laptop on the left closes its lid and a small lilac moon rises over it. On the right a sky blue cloud holds a mint card reading Cloud Office, where three yellow dots keep blinking as its agents work. A yellow arrow reading Mail both ways runs between them. Tapping the cloud shows soft white tags: Its own orchestrator, 2 vCPU, 4 GB memory, 100 GB disk and From $138 a month."><figcaption>Its agents work while your computer sleeps. Max is from $138 a month at the launch price (pricing page, 22 Nov 2026). Tap the cloud to see what it holds.</figcaption></figure>

To get one, open **Settings**, **Billing**. Then switch to it at the top of the sidebar.

### How do you move an agent to the Cloud Office?

Drag it there in the sidebar, then confirm in the sheet. Nothing moves until you do. With an agent called Writer:

1. Drag Writer's row by its middle from the **Main Office** onto the **Cloud Office** section. Under the pointer the whole section lights up and reads **Drop to run Writer in Cloud Office**. The dots handle under the avatar works too, once **Keep my agent order** is on in **Settings**, **General**.
2. Drop it. The Run in sheet opens, titled **Run Writer in the Cloud Office**: *Writer stops in your Main Office and starts in your Cloud Office. Its folder and files here are not touched.*
3. Read what comes and what does not. **Comes with Writer**: Memory, skills and settings (*Copied now, by the app.*) and pushed work. **Does not come**: the open conversation, keys, mail and tasks, and work that is not pushed (*Push first to bring them.*).
4. Keep **Stop Writer in your Main Office** ticked to move it. *Untick to run a second copy there and keep this one going.*
5. Press **Move**, or **Copy and start** with the tick off. **Cancel** leaves Writer where it is.

While it checks, the sheet says what it is checking, and when **Move** stays grey it says why. The way back: drag Writer's Cloud Office row onto the **Main Office**, which reads **Drop to bring Writer back to the Main Office**. The sheet reads **Run Writer in the Main Office**, and *Writer knows here what it learned there.*

{% img "shot-move", "The real screens in Munder Difflin 0.5.10, from a sample office: the Cloud Office lit up under a dragged row, and the Run in sheet the drop opens. The sample agent there is Pam; the folder and the repository are made up." %}

<figure class="mg" data-scene="move"><img src="/blog/assets/media/your-first-hour-with-munder-difflin/move.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A soft white sidebar shows two sections headed MAIN OFFICE and CLOUD OFFICE, with agent rows marked by lilac and sky dots. Under an ink pointer, the row reading Writer lifts out of the Main Office and its place fades. As it reaches the Cloud Office, the whole section turns soft yellow with a yellow outline and the line Drop to run Writer in Cloud Office. On the drop a white sheet slides in titled Run Writer in the Cloud Office, with a yellow tick reading Stop Writer in your Main Office, a group Comes with Writer listing Memory, skills and settings, a group Does not come listing The open conversation, Keys and Mail and tasks, and two buttons, Cancel and a yellow Move. Tapping the scene plays the way back: the Main Office lights up with Drop to bring Writer back to the Main Office, and the sheet title reads Run Writer in the Main Office."><figcaption>The drop opens the Run in sheet, and nothing moves until you press Move. Munder Difflin 0.5.10. Tap the scene to play the way back.</figcaption></figure>

## Minute 58: what about accounts and teams?

**Switch to Teams**, in the profile menu, opens one sheet for joining a team with an invite code or generating one. Your office talks to your teammates' offices: one plain chat per teammate, you choose who answers each one, and files go as a link with a password, for one download.

## What trips people up in the first hour?

Nine things, all normal.

1. **The plans screen comes after setup.** Start on Free; it is enough for now.
2. **The sign in browser does not open by itself.** Press the button and sign in there. If the screen does not move on, paste the code.
3. **"Installs on first start" still needs you.** The engine installs when you press **Install**.
4. **An agent reads "looping".** The circuit breaker warns an agent that repeats itself or spends fast. That is the app working, not a crash.
5. **An agent reads Sleeping.** Send it a message or press **Wake**; it keeps its conversation.
6. **A session cleared itself.** See the token rules above. `handoff.md` has the thread.
7. **Auto mode decides how much agents ask.** On, they ask only when blocked; off, before each tool call. Set it on the orchestrator's **Budget & breaker** tab; it applies when an agent next starts.
8. **Many agents on 8 GB of memory run slowly.** Run fewer at once.
9. **On Linux with Wayland, dictation into other apps is refused.** It needs X11.

## What should you do after the first hour?

Add one seat at a time. A reviewer first, then one scheduled job, then a scout. [Every agent on our own floor](/blog/ai-agent-use-cases-our-office/) has starter messages for four seats. [How the orchestrator routes work](/blog/how-the-god-orchestrator-works/) explains what your orchestrator does with your briefs, and [build your personal AGI](/blog/build-your-personal-agi-on-your-computer/) turns the office into something that briefs you each morning.

<link rel="stylesheet" href="/blog/assets/media/your-first-hour-with-munder-difflin/motion.css"><script defer src="/blog/assets/media/your-first-hour-with-munder-difflin/motion.js"></script>
