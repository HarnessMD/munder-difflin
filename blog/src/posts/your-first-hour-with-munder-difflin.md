---
title: "Your First Hour With Munder Difflin 0.5.6: Onboarding From First Sign In to a Working Office"
seoTitle: "Munder Difflin Onboarding: Your First Hour With 0.5.6"
description: "Your first hour with Munder Difflin 0.5.6: sign in, brief your orchestrator, hire a team, schedule work, connect Slack, start temps, then tour the Pro screens."
date: 2026-07-03
updated: 2026-10-14
category: guides
categoryLabel: Guides
type: Non-technical
pinned: true
pinOrder: 2
primaryKeyword: "munder difflin onboarding"
secondaryKeywords: ["getting started with munder difflin", "munder difflin tutorial", "munder difflin pro", "munder difflin temps", "munder difflin automations", "munder difflin stapler", "munder difflin first hour"]
tags: ["Guides", "Onboarding", "Getting Started", "Multi-Agent"]
author:
  name: Chaitanya Giri
  initials: CG
faq:
  - q: "How long does it take to get Munder Difflin running?"
    a: "Setup is four short steps when an AI engine is already installed and signed in: download, sign in, name your workspace and your orchestrator. The rest of the hour goes on a first job, a small team and the first work that starts without you."
  - q: "Do I need Pro for this first hour?"
    a: "No. Agents, schedules, the context rules, webhooks, Slack and temps are in both views. The Pro view adds one window with screens for Tasks, Inbox, Automations, Memory and Capabilities, plus the Stapler, a small window above every app. Until Saturday 24 October 2026, Pro is free for everyone as part of the launch."
  - q: "What is a temp?"
    a: "A temp is a short lived agent started for one job. The orchestrator or any lasting agent can start one, and the app can start one to answer an inbound message. It does the job, reports done and leaves."
  - q: "Can one office mix Claude Code, Codex and other engines?"
    a: "Yes. Each agent picks its own engine and model when you add it, and can have its own token limit per period. Claude Code and Codex use their own sign in; OpenCode, Crush, Pi and Qwen take a key."
  - q: "Does the office keep working when I close my laptop?"
    a: "No. Agents, schedules, Slack and webhooks all run on your own computer, so they stop when the app closes or the laptop sleeps."
  - q: "Why did my agent's session clear itself?"
    a: "That is a default in 0.5.6 that saves tokens. When an agent's work switches and its session has run for 60 minutes, the app clears the session, and a handoff file in the agent's folder carries the thread across."
startHere: true
startOrder: 2
---

Your first hour of Munder Difflin onboarding goes like this: sign in, give your orchestrator one real job, hire a small team, set up work that starts without you, then learn the Pro screens. This guide is written for version 0.5.6 and follows the clock.

[Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of coding agents such as Claude Code, Codex and Gemini CLI on your own computer. Not installed yet? The [install guide](/blog/how-to-install-and-use-munder-difflin/) covers the download, the engines and every fix. For ideas on what to hand your agents, [every agent on our own floor](/blog/ai-agent-use-cases-our-office/) shows what ours do.

<figure class="mg" data-scene="hour"><img src="/blog/assets/media/your-first-hour-with-munder-difflin/hour.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A bus route map on white: one road runs left to right, bends round a hairpin past a pond and comes back, with six stops on it. Each stop has a minute mark and a name: Minute 0, sign in; Minute 10, a first job; Minute 20, a small team; Minute 35, work that starts without you; Minute 45, temps and tokens; Minute 50, the Pro screens. A small yellow bus drives from stop to stop, the road turns blue behind it, and each stop lights up yellow as the bus arrives. The bus leans through the hairpin and leaves two skid marks."><figcaption>The first hour as a route: sign in, a first job, a small team, work that starts without you, temps and tokens, then the Pro screens. Tap a stop to send the bus there.</figcaption></figure>

## Minute 0: what do you need, and how do you sign in?

You need the app, one AI engine and an email address. The app needs nothing else installed, and it can install a missing engine for you later.

The first launch asks **How are you using Munder Difflin?** Pick **On my own**, then:

1. Press **Open browser to sign in**. The browser does not open by itself.
2. Sign in in the browser. The screen moves on by itself; if it does not, paste the code into **Code from the browser** and press **Use this code**.
3. **Name your workspace**, **Meet your orchestrator**, then **Open the workspace**.

Next comes the Pro sales screen, **Run your agents like a company**. Until Saturday 24 October 2026, Pro is free for everyone as part of the launch: once you sign in, the app opens the Pro view with no licence and skips this screen. From Sunday 25 October, press **Continue with the free version** to reach the Classic view, or **I have a licence key** to turn on Pro. The steps through minute 45 work in both views; a few labels below are the Pro view's.

## Minute 10: how do you give your orchestrator a first job?

Brief him like a capable new hire: the outcome, the folder, and what done looks like. Your orchestrator is the one agent you talk to. He is called Michael until you rename him.

A vague brief gets a vague job. Compare:

* Weak: *"clean up my project"*
* Better: *"In the folder notes-app, find every function with no test. Write the tests, run them, and give me a list of what failed and why. Do not change any function."*

Your orchestrator turns the brief into tasks and works them, hands them to an agent you added, or starts a temp. Once there is one, click any agent to watch its terminal. To read what it wrote, press **IDE**: an editor opens on the agent's folder, with **Changes** to show what was edited and a Markdown **preview** for reports.

<figure class="mg" data-scene="brief"><img src="/blog/assets/media/your-first-hour-with-munder-difflin/brief.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. Two notepads on white above a long toaster marked your orchestrator. The pad tagged Weak reads clean up my project; the pad tagged Better reads the outcome, the folder, what done looks like. A slip drops from the weak pad into the first slot, the toaster works, and one grey card with a question mark pops up, wobbles and keeps smoking a little. A slip drops from the better pad into the second slot, and three task cards pop up, hop apart and each one gets a tick in its box."><figcaption>A brief with the outcome, the folder and what done looks like turns into clear tasks. A vague one turns into a question. Tap a note to drop it again.</figcaption></figure>

## Minute 20: how do you hire a small team?

Press **Add an agent**. Pick a face, an engine, a model and the folder it works in. Each agent can run on a different engine, and that is the point: put your best model on the hard work and a cheaper one on the chores.

One split to try on day one:

* a builder on **Claude Code**, writing the feature
* a reviewer on **Codex**, reading every change the builder makes
* a helper on a free engine such as Antigravity, for docs and tidying

Each agent can also have its own **token limit per period**: **Every 5 hours**, **Daily**, **Weekly** or **Monthly**, with a cap, in the agent's side panel under **Budget**. Leave it empty unless one agent needs its own. Sign every engine in before you hire on it, or the new agent cannot start; a Claude Code, Codex or Cursor agent stops at **Sign in needed**.

Our own floor has eleven kinds of seat: an orchestrator, mission control, a community lead, growth, motion graphics, research, a founder's office, a scrum master, an engineering lead, builders, and a designer. You do not need eleven. You need a reviewer.

<figure class="mg" data-scene="team"><img src="/blog/assets/media/your-first-hour-with-munder-difflin/team.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. Three dotted outlines of office chairs stand in a row on white under a yellow button reading Add an agent, with the roles builder, reviewer and helper below them. A pointer presses the button three times; each press rolls in a chair, and an engine tag appears under it: on Claude Code, on Codex, on a free engine. The third chair arrives still spinning. A sheet of paper leaves the builder's chair, crosses to the reviewer's chair, is read line by line, gets a tick and comes back. Then the helper's heap of papers squares itself into a neat stack."><figcaption>A first team of three: a builder on Claude Code, a reviewer on Codex that reads every change, and a helper on a free engine for docs and tidying. Tap the builder to send another change for review.</figcaption></figure>

## Minute 35: how do you set up work that starts without you?

With an automation. In the Pro view open **Automations** and press **New automation**; in the Classic view the same things live under Triggers. Two kinds start there, a schedule and a webhook, and Slack is a third way in.

**A schedule** sends a message to an agent on a clock. Choose **Schedule**, then fill in four things: a **Label**, **When** (an **Interval** or **Weekly**), **Sends to**, and the **Message**, then press **Save**. The message is what the agent should do when it fires. A good first one: every weekday morning, ask an agent to check something and write you three lines.

<figure class="mg" data-scene="schedule"><img src="/blog/assets/media/your-first-hour-with-munder-difflin/schedule.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A card on white titled Automations with a yellow New automation button; on the right, a horizon with an empty sky and an office chair. A pointer presses New automation, picks Schedule over Webhook endpoint, and four fields fill in: Label, morning check; When, Weekly rather than Interval; Sends to, an agent; Message, check something and write you three lines. The pointer leaves. A sun climbs over the horizon, the card fires by itself, and a paper slip flies to the chair and gets a tick. The pointer peeks back in to check, then leaves again."><figcaption>A schedule has four parts: a Label, When (an Interval or Weekly), Sends to, and the Message the agent gets every time it fires. Tap the card to fire it again.</figcaption></figure>

**A webhook** lets any tool that can send a web request start work. Choose **Webhook endpoint**. A new endpoint starts switched off: choose how much you trust the caller, copy its address and its secret into the tool that will send, then turn it on and press **Save**. The sender must hold the secret.

**Slack** lets people send work from a channel or a direct message and read the answer in the same thread. In the Pro view it is under **Integrations**; in Classic, under **Settings**, then **Connections**. Create the Slack app from a manifest: press **Copy manifest** under **How to get these**, then in Slack choose **Create New App**, **From a manifest**. The channel list opens on **All channels**, every channel the bot is in, and direct messages to the bot are answered too. Tick channels only to narrow it. You choose the agent under **Who answers inbound messages**. If Slack fails to start, it now comes back by itself. The [Slack guide](/blog/connect-slack-to-munder-difflin/) has the full setup.

<figure class="mg" data-scene="slack"><img src="/blog/assets/media/your-first-hour-with-munder-difflin/slack.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On white, a Connections card under Settings with a Slack switch and a box for Every channel the bot is in; below it, three chat cards labelled a channel, another channel and a direct message. A pointer switches Slack on and ticks the box, and an office chair rolls into the empty seat under Who answers inbound messages. A string runs from each card to the chair. Each card posts a message, a note travels down its string to the chair, and a reply comes back and lands under that message as a thread. Then Slack switches itself off, the strings go slack, and it switches itself back on."><figcaption>In 0.5.6 one bot can hear every channel it is in, a direct message is always answered, and the reply comes back in the same thread. Tap a card to send a message.</figcaption></figure>

## Minute 45: what are temps, and how do you keep token use down?

A temp is an agent for one job. It gets an objective, does the work, reports done and leaves. There is no button for one. You ask: *"Michael, start a temp to rename every file in this folder to lower case."*

Three things changed in 0.5.6:

* **Any lasting agent can start a temp**, not only the orchestrator. A temp cannot start a temp.
* **A temp can answer inbound messages.** Wherever you pick who answers (Slack, a teammate, a webhook, a schedule's **Sends to**, the Stapler's **Send captures to**), the list now offers **A temp** and **A temp, clone of** one of your agents.
* **You set the limits.** In the Pro view, on the orchestrator's **Budget & breaker** tab, **Temps per agent** runs from 0 to 4 and **Max temps at once** caps how many temps run in the whole office at the same time. At 0, agents cannot start temps.

<figure class="mg" data-scene="temp"><img src="/blog/assets/media/your-first-hour-with-munder-difflin/temp.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. Three office chairs stand on white over the words your lasting agents, beside the dotted outline of a folding chair. A message card reading one job waits at the top left, then flies across while a yellow folding chair slides in folded, half opens, snaps shut, then opens properly and gets a tag reading A temp. The message lands on its seat, a done card pops up and flies to the first office chair, and the folding chair folds flat and slides away. The three office chairs never move."><figcaption>A temp answers one message or does one job, reports done and leaves; your lasting agents keep their seats. Tap the message to send another.</figcaption></figure>

Tokens are the other limit. Long sessions fill an agent's context, and a full context is slow and uses up your plan's limits faster. 0.5.6 ships with defaults that deal with it:

* **Compact when context fills** summarises a long session and carries the summary forward.
* **Clear on a switch of work** clears the session when an agent moves to different work and the session has run for 60 minutes. A file called `handoff.md` in the agent's folder carries the thread across, so the next session knows where the last one stopped.
* **No hourly standup.** A new install no longer pings the orchestrator every hour.

The first two are rules in **Automations** under **Context** (in the Classic view, the Triggers tab). Leave them on.

<figure class="mg" data-scene="tokens"><img src="/blog/assets/media/your-first-hour-with-munder-difflin/tokens.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On white, a tall glass on a coaster stands beside a card titled Context under Automations, with two rules switched on: Compact when context fills, and Clear on a switch of work. A pill below the card reads Leave them on. Paper slips drop into the glass until the pile nears a dashed line. The first rule lights up, a press with a yellow knob swings over and pushes down, and the slips squash into one slip labelled summary. A few more slips land on top. Then the second rule lights up: the glass turns upside down and is shaken, the slips fall out, the summary clings on until a second shake, and the glass turns back. A yellow note labelled with the handoff file's name drops into the empty glass and stays."><figcaption>Two defaults in 0.5.6 keep sessions small: Compact when context fills summarises a long session, and Clear on a switch of work clears it and leaves a handoff file to carry the thread. Tap the glass to fill it again.</figcaption></figure>

## Minute 50: what does the Pro view add?

One window with a sidebar, and a screen for each part of the office. The switch in the title bar moves between **Classic** and **PRO**; without a licence it reads **TRY PRO**.

<figure class="mg" data-scene="sidebar"><img src="/blog/assets/media/your-first-hour-with-munder-difflin/sidebar.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. An app window on white with a switch in the title bar reading Classic and PRO, with PRO selected, and a sidebar of six rows: Tasks, Inbox, Automations, Memory, Capabilities, Stapler. A yellow highlight walks down the rows, and as each one lights, its one line note writes itself into the pane beside it: every card in the office; one conversation per agent; Scheduled, Context and Webhooks; Search every agent's memory; what each agent can reach; a small window that floats above every app. When the highlight reaches Stapler, that row lifts off the sidebar and floats above it with a small shadow under it."><figcaption>The Pro view is one window with a sidebar row for Tasks, Inbox, Automations, Memory, Capabilities and the Stapler. Tap a row to see what it is for.</figcaption></figure>

{% img "pro-sidebar-056", "The real Pro sidebar: Tasks, Inbox, Automations, Memory, Capabilities and Stapler. From a preview build of 0.5.6 with sample data." %}

**Tasks** is every card in the office, as a **Board**, a **List** or **Cards**. The habit that pays: start the day on the **Asks me** filter, which shows only the cards waiting on you. (It is a filter in Tasks; **Ask me** in the Inbox, below, is where you answer.) You can drag cards between columns. Nothing changes for your team until you send your edits, and then your orchestrator makes the change.

**Inbox** holds one conversation per agent, plus **Ask me**, **Slack** and **Webhooks**. **Ask me** is the list of questions waiting on a person. Answer in one line; answering unblocks the task. This is the screen that keeps an office moving while you do something else.

{% img "ask-me-056", "Ask me in an agent's Inbox: each question waits with an Answer button. From a preview build of 0.5.6 with sample data." %}

<figure class="mg" data-scene="askme"><img src="/blog/assets/media/your-first-hour-with-munder-difflin/askme.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On white, a large card with an Ask me chip and the word Inbox shows a question as grey lines with a lilac question mark, an answer field reading Answer in one line, a blue send button and a chip reading waiting on you. Beside it, three smaller question cards wait in a column under the words waiting on a person. A short answer types itself in as one line and is sent; the question mark turns into a mint tick and the chip becomes unblocks the task. The card slides away, the next question card grows into its place, and the queue shuffles up; the last card arrives a little too fast and bumps the one ahead. The new question gets its one line answer and its tick too."><figcaption>Ask me collects the questions waiting on a person. A short answer unblocks the task, and the card moves on. Tap the card to ask again.</figcaption></figure>

**Automations** is the list you met at minute 35, with filters for **Scheduled**, **Context** and **Webhooks**, Each schedule shows when it **Last fired**, each webhook lists its **Recent** arrivals, and **History** opens the Inbox, where webhook messages are answered.

**Memory** lets you **Search every agent's memory** at once and see the result as a **Graph** or a **List**. Use it before you brief: if an agent already solved this last week, the note is here. Narrow a search with **Whose memory** and **Kind**.

**Capabilities** is a marketplace of 2,347 MCP servers, skills, plugins and tools from the public list [HarnessMD/awesome-agent-capabilities](https://github.com/HarnessMD/awesome-agent-capabilities). We reviewed 622 of them; the rest read **Listed, not reviewed by us** and have no **Install** button. A merged change to the list reaches the app with no new release.

**The Stapler** is a small window that floats above every app. On the **Stapler** screen, turn on **Show the stapler**, then click it for its ring:

* **Screenshot** captures a region of the screen and sends it, with a note, to the agent you pick under **Send captures to**.
* **Record message** takes a spoken message and shows you the transcript before it goes.
* **Record meeting** records the microphone into a folder of transcripts, one folder per meeting.
* **Make invisible** hides the Stapler from screen sharing and recordings.

A fifth button, **Computer use**, reads **Coming soon** and cannot be turned on yet.

The habit: when you see a bug in any app, do not describe it. Staple it.

<figure class="mg" data-scene="stapler"><img src="/blog/assets/media/your-first-hour-with-munder-difflin/stapler.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On white, a plain app window made of grey bars, with a setting above it reading Show the stapler and a chip reading an agent. The setting switches on and a round stapler button pops up and floats over the corner of the app window. A pointer clicks it and a ring of four actions opens around it: Screenshot, Record message, Record meeting, Make invisible. Screenshot is picked, a crosshair drags a dashed box over part of the app, and the region lifts out as a capture. A note field reading your note slides in under it and a short line types itself in. The stapler's arm comes down and a staple joins the note to the capture, then the pair flies to the agent chip, which gets a tick. The ring opens again and stays."><figcaption>The Stapler floats above every app. Its ring offers Screenshot, Record message, Record meeting and Make invisible, plus Computer use, coming soon, and a capture goes to an agent with your note. Tap the stapler to open the ring.</figcaption></figure>

## Minute 58: what about accounts and teams?

Your account sits in the profile menu. **Sign out** asks you to press again, so you cannot do it by accident. **Switch to Teams** opens one sheet for joining a team with an invite code or generating one. In 0.5.6 your office talks to your teammates' offices: one plain chat per teammate, you choose who answers each one, and files and folders go as a link with a password, for one download.

## What trips people up in the first hour?

Eight things, all normal.

1. **The paywall comes first.** Press **Continue with the free version** to reach the app.
2. **The sign in browser does not open by itself.** Press the button and sign in there. If the screen does not move on by itself, paste the code.
3. **"Installs on first start" still needs you.** The engine installs when you press **Install**.
4. **An agent reads "looping".** The circuit breaker warns an agent that repeats itself or spends fast. That is the app working, not a crash.
5. **A session cleared itself.** See the token rules above. `handoff.md` has the thread.
6. **Auto mode decides how much agents ask.** On, agents act on their own and ask only when blocked. Off, they ask before each tool call. In the Pro view it is on the orchestrator's **Budget & breaker** tab; in the Classic view, **Settings**, then **Autonomy & Budgets**. It applies when an agent next starts.
7. **Many agents on 8 GB of memory run slowly.** Run fewer at once.
8. **On Linux with Wayland, dictation into other apps is refused.** It needs X11.

## What should you do after the first hour?

Add one seat at a time. A reviewer first, then one scheduled job, then a scout. [Every agent on our own floor](/blog/ai-agent-use-cases-our-office/) has starter messages for four seats. [How the orchestrator routes work](/blog/how-the-god-orchestrator-works/) explains what your orchestrator does with your briefs, and [build your personal AGI](/blog/build-your-personal-agi-on-your-computer/) turns the office into something that briefs you each morning.

<link rel="stylesheet" href="/blog/assets/media/your-first-hour-with-munder-difflin/motion.css"><script defer src="/blog/assets/media/your-first-hour-with-munder-difflin/motion.js"></script>
