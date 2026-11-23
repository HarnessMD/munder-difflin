---
title: "How to Install Munder Difflin 0.5.10: A Beginner's Guide From Zero to a Working Office"
seoTitle: "How to Install Munder Difflin 0.5.10: Beginner's Guide"
description: "Install Munder Difflin 0.5.10 on macOS, Windows or Linux: which AI engine to pick, the sign in, first open, the Cloud Office and a fix for each failure."
date: 2026-06-05
updated: 2026-11-23
category: guides
categoryLabel: Guides
type: Non-technical
pinned: true
pinOrder: 1
primaryKeyword: "how to install munder difflin"
secondaryKeywords: ["munder difflin download", "munder difflin setup", "install munder difflin windows", "install munder difflin mac", "what is a coding agent", "munder difflin beginner guide", "munder difflin not installed fix", "munder difflin cloud office"]
tags: ["Guides", "Getting Started", "Tutorial", "Non-Technical"]
author:
  name: Chaitanya Giri
  initials: CG
faq:
  - q: "Do I need to know how to code to install Munder Difflin?"
    a: "No. You type two or three commands, to install an AI engine and sign in to it, and you can copy and paste them. If you skip that, the app offers to install a missing engine the first time an agent starts. You still sign in to the engine yourself."
  - q: "Do I need an account?"
    a: "Yes. The first launch asks you to sign in through your browser, on the free version as well. The browser does not open by itself: press Open browser to sign in and sign in there. The screen usually moves on by itself; if it does not, paste the code the browser shows you into the app."
  - q: "Which operating systems does Munder Difflin 0.5.10 run on?"
    a: "macOS, Windows and Linux. The download page lists three files for 0.5.10, published 17 Nov 2026: one universal .dmg for Apple silicon and Intel Macs, a setup .exe for 64 bit Windows and an .AppImage for 64 bit Linux."
  - q: "Can these agents really change files on my computer?"
    a: "Yes, and that is the point, so understand it before you start. An agent starts in the folder you give it and can read files, write files and run commands. It is not locked in there: it can reach anything your account can. Start with a new empty folder and watch what the agents do before you point one at anything you care about."
  - q: "Is the free version a separate download from Pro?"
    a: "No. There is one installer for every plan. Free gives you Pro features up to a monthly allowance of tokens, and Pro has no token cap. Compare Free, Pro, Max and Teams in Settings, Billing."
  - q: "Do my agents keep working when my computer is off?"
    a: "In a Cloud Office, yes. The office on your computer stops when the app closes or the laptop sleeps. A Cloud Office runs on its own machine in the cloud, with its own orchestrator, so its agents keep working day and night. It comes with Max, or as an add on for Teams seats."
startHere: true
startOrder: 1
---

<div class="callout tldr"><span class="ic">TL;DR</span><p>Download the app, install one AI engine and sign in to it. Open the app, sign in, and name your workspace and your orchestrator. It opens on <strong>Home</strong>: give him a first job. About twenty minutes. A Cloud Office keeps agents working while your computer sleeps.</p></div>

[Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. This guide installs Munder Difflin 0.5.10 for someone who has never used an AI agent, and has a fix for every way setup can fail.

## What is the short version?

Five steps, about twenty minutes. Each one links to its details below.

1. [Download the app](#how-do-you-download-and-install-munder-difflin) and install it.
2. [Install one AI engine](#which-ai-engine-should-you-pick), picked by what you already pay for.
3. [Sign in to that engine](#how-do-you-install-an-engine-and-sign-in), or let the app install it.
4. [Open the app](#what-happens-the-first-time-you-open-it), sign in, and name your workspace and orchestrator.
5. [Give your orchestrator a first job](#what-do-you-do-in-your-first-ten-minutes) on **Home**, and watch.

## What is Munder Difflin?

In plain words, it is a small office of AI workers on your computer, for research, writing, email, analysis, code and the rest of your knowledge work. One of them is your orchestrator, the one you talk to. He is called Michael until you rename him. You give Michael a job, he splits it into pieces, hands the pieces to other agents and comes back to you only when something needs your decision.

It is not a chatbot. You brief Michael, do something else, and come back to finished work.

<figure class="mg" data-scene="office"><img src="/blog/assets/media/how-to-install-and-use-munder-difflin/office.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. An office seen from the front on white. One wide desk with a screen stands at the front, marked your orchestrator. Behind it, on a step marked other agents, are four smaller desks, each with its own screen. A slip marked your job lands on the front screen, is torn into three smaller slips, and each flies to a different desk at the back, where a progress bar starts to fill. Two of those desks finish with a tick. The third stops part way and sends back a slip marked needs your decision, which lands on the front screen. The fourth desk gets no slip, and its screen runs a bouncing screensaver. A filing cabinet and a water cooler stand at the sides."><figcaption>What Munder Difflin does: you brief one orchestrator, he hands the pieces to other agents, and only the decisions come back to you. Tap the front desk to send another job.</figcaption></figure>

## What is a coding agent, and what can it touch on your computer?

A coding agent is an AI that acts instead of only answering. Ask a chatbot a question and you get text. Give a coding agent a job and it reads your files, writes new ones, runs commands and checks its own work, in a loop, until the job is done or it gets stuck. The job does not have to be code: a report or a sorted folder works the same way.

Each agent runs through a program called an engine: Claude Code, Codex, Antigravity and the others in this guide. The engine does the thinking. Munder Difflin is the office around a team of them: tasks, memory, schedules, messages, and when to come and ask you.

An engine runs with your own permissions. Anything you can do from your account, it can do: open files, change them, delete them, run software. That is why it is useful, and why you should be deliberate. Three things keep it sane:

1. **You choose the folder.** An agent starts in the folder you give it. It is not locked in there, so do not make your first one your whole home folder.
2. **You choose how much freedom they have.** Whether agents act on their own or stop and ask is a setting: **Settings**, then **Autonomy & Budgets**. On autonomous, agents act without asking. Check which one is set before your first real job.
3. **You can watch.** Every agent has a live terminal you can open and watch.

{% img "autonomy-0510", "Settings, then Autonomy & Budgets in Munder Difflin 0.5.10, with sample data: how much agents do alone, who may add agents, and the circuit breaker." %}

<figure class="mg" data-scene="rooms"><img src="/blog/assets/media/how-to-install-and-use-munder-difflin/rooms.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. The floor plan of a house on white. Four pale rooms are each labelled as a folder: Documents, Photos, Projects and Downloads. Beside them is a hatched plot with a plus sign, labelled new empty folder. Its walls are drawn in and it becomes a fifth room, the only one drawn in colour. A small desk with a terminal on it drops into that room, a tag reading agent works here appears under it, and three new files appear beside it. The other rooms stay pale, and loose pages keep piling up in Downloads. Tapping a pale room colours it and moves a second desk in."><figcaption>For your first job, make a new empty folder and use that. The agent is not locked in there: it can reach anything your account can. Tap a room to give it another folder.</figcaption></figure>

## What do you need before you install?

Less than you would think. The app itself needs nothing else installed.

* **A computer.** macOS on Apple silicon or Intel, 64 bit Windows, or a modern 64 bit Linux.
* **An email address.** The first launch asks you to sign in, on the free version as well.
* **One AI engine, signed in.** You can install it now with one command, or let the app install it later. Either way you sign in to the engine yourself, with your own subscription or key.

Good to have, and you can add them after setup: git, and two small tools called `uv` and MemPalace that let agents search their memory by meaning. The app checks for these, and for Node, under **Settings**, then **Prerequisites**.

{% img "prerequisites-0510", "Settings, then Prerequisites in Munder Difflin 0.5.10, with sample data: each engine shows Found or Not found, and a missing one shows the command that installs it." %}

## How do you download and install Munder Difflin?

Get the file for your system from the [download page](https://harnessmd.com/download). It lists version 0.5.10, published 17 Nov 2026, as three files:

* **macOS, Apple silicon and Intel:** `Munder-Difflin-0.5.10-mac-universal.dmg`, 355 MB, 17 Nov 2026. It is one universal file. Open it and drag Munder Difflin into Applications. If it will not open, see [the fixes](#what-do-you-do-when-an-install-fails).
* **Windows x64:** `Munder-Difflin-0.5.10-win-x64-setup.exe`, 234 MB, 17 Nov 2026. Run it and follow its steps.
* **Linux x86_64:** `Munder-Difflin-0.5.10-linux-x86_64.AppImage`, 289 MB, 17 Nov 2026. Mark it as executable (`chmod +x` on the file), then run it.

<figure class="mg" data-scene="download"><img src="/blog/assets/media/how-to-install-and-use-munder-difflin/download.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A download page on white shows the address harnessmd.com/download and three buttons labelled macOS, Windows and Linux. A file hangs from a clip under each button: universal .dmg, setup .exe and .AppImage. Each button is pressed in turn and lets go of its file, which opens a parachute and floats down to a landing pad on the ground."><figcaption>One file per system for 0.5.10: a universal .dmg for macOS, a setup .exe for Windows and an .AppImage for Linux. Tap a button to drop its file again.</figcaption></figure>

## Which AI engine should you pick?

Munder Difflin does not include an AI. It drives one you install. [harnessmd.com](https://harnessmd.com/) lists "Twelve engines" and "a custom command of your own" (22 Nov 2026), and you need exactly one to start. What you already pay for usually decides it.

* **You pay for Claude:** use **Claude Code**. It is the app's default engine.
* **You pay for ChatGPT:** use **Codex**.
* **You pay for nothing:** use **Antigravity**, Google's coding tool, whose command is `agy`.
* **You already have a key from an AI provider:** use **OpenCode**, which is open source and runs on the provider and model you choose.

<figure class="mg" data-scene="engine"><img src="/blog/assets/media/how-to-install-and-use-munder-difflin/engine.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. Three cards lie on a white table, reading You pay for Claude, You pay for ChatGPT and You pay for nothing. Each card turns over in turn to show the engine to pick: use Claude Code with a Claude subscription, use Codex with a ChatGPT subscription, and use Antigravity if you pay for nothing. The third card turns over once more than it needs to and lands crooked before it straightens. The line under the cards ends on You need exactly one to start."><figcaption>Pick your first engine by what you already pay for: Claude Code with a Claude subscription, Codex with a ChatGPT subscription, Antigravity if you pay for nothing. Tap a card to flip it back.</figcaption></figure>

Each of the other engines has its own sign in, and the app can install them for you. Pick one only if you already use it.

| Engine | Command | Installs with |
| --- | --- | --- |
| Gemini CLI | `gemini` | npm |
| Qwen | `qwen` | npm |
| Crush | `crush` | npm |
| Pi | `pi` | npm |
| Copilot | `copilot` | npm |
| Grok | `grok` | its own installer |
| Kimi Code | `kimi` | its own installer |
| Cursor | `cursor-agent` | its own installer |

You can add more engines later and run several at once, with different agents on different engines. The [Gemini CLI install guide](/blog/how-to-install-gemini-cli/) has that engine's steps.

## How do you install an engine and sign in?

Open a terminal and paste the lines for your engine one at a time, pressing Enter after each. A terminal is a plain text window for typing commands. On macOS press `Cmd+Space`, type `Terminal` and press Enter. On Windows press Start, type `PowerShell` and press Enter.

**Claude Code** (a Claude subscription). macOS and Linux:

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

Windows PowerShell:

```powershell
irm https://claude.ai/install.ps1 | iex
```

On any system, close the terminal and open a new one, then run `claude` once and sign in when the browser opens.

**Codex** (a ChatGPT subscription). macOS and Linux:

```bash
curl -fsSL https://chatgpt.com/codex/install.sh | sh
```

Windows PowerShell:

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://chatgpt.com/codex/install.ps1 | iex"
```

Codex also installs through npm, which comes with Node: `npm install -g @openai/codex`. The app wants Node 20 or newer. If `node --version` prints an error instead of a number, get the LTS build from [nodejs.org](https://nodejs.org/en/download), then open a new terminal.

Then close the terminal, open a new one and run `codex`. The first `codex` opens a sign in; choose to sign in with ChatGPT. [How to install Codex CLI](/blog/how-to-install-codex-cli/) covers Windows and updates.

**Antigravity** (no subscription). macOS and Linux:

```bash
curl -fsSL https://antigravity.google/cli/install.sh | bash
```

Windows PowerShell:

```powershell
irm https://antigravity.google/cli/install.ps1 | iex
```

Then close the terminal, open a new one, run `agy` and sign in with a Google account.

**OpenCode** (a key from an AI provider you choose; you pay that provider). The second line asks which provider and takes the key:

```bash
npm install -g opencode-ai@latest
opencode auth login
```

To check any of them, ask for its version, for example `claude --version`. A version number means you are done with the terminal.

<figure class="mg" data-scene="terminal"><img src="/blog/assets/media/how-to-install-and-use-munder-difflin/terminal.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A light terminal window on white, above a row of keyboard keys with a large Enter key. A line types itself: npm install -g @openai/codex. Enter is pressed and a progress bar fills, slips back one block near the end, then finishes with a tick. A second line types codex, a dotted arrow runs from it to a small browser window that slides in over the terminal showing Sign in, and the button in that window turns into a tick. A third line types codex --version and prints three blocks that stand in for a version number, a tick and the words a version number."><figcaption>Install the engine, run it once to sign in, then ask for its version. The drawing uses Codex; every engine follows the same three steps. Tap the terminal to run it again.</figcaption></figure>

<div class="callout warn"><span class="ic">The step people skip</span><p><strong>Installing an engine is not the same as signing in to it.</strong> Run its command once and finish the sign in. Otherwise the agent cannot start. For Claude Code, Codex and Cursor the app shows <strong>Sign in needed</strong>.</p></div>

### Or let the app install it

You can skip the terminal. Setup marks every engine **Installed**, **Installs on first start** or **Not installed**. When you start an agent whose engine is missing, the app says so and offers an **Install** button. Nothing installs until you press it.

The app picks the first install route that works on your computer, down to a manual one with a link to the docs. The sign in is still yours to finish, in that agent's terminal.

## What happens the first time you open it?

Setup has four steps. The words in bold are the words on the screen.

1. **How are you using Munder Difflin?** Pick **On my own**, or **With my team** if someone sent you an invite code, and press **Continue**. Then comes **Sign in to continue**: press **Open browser to sign in**. The browser never opens by itself. Sign in there. The screen usually moves on by itself. If it does not, copy the code the browser shows, switch back to the app, paste it into **Code from the browser** and press **Use this code**. You see **You are signed in**; press **Continue**.
2. **Name your workspace.** The default name is `HarnessAgents`. Everything your agents do lives in this one folder: their work, memory, tasks and history. **Browse** picks where it goes. The name cannot hold a space, and the app offers a fixed one if you type a space. This step also asks: **Are you technical or non-technical?**
3. **Meet your orchestrator.** Name him and pick his engine. The engine you pick shows **Installed**, **Installs on first start** or **Not installed**.
4. **A last look at him.** Press **Open the workspace**, and you are in.

<figure class="mg" data-scene="signin"><img src="/blog/assets/media/how-to-install-and-use-munder-difflin/signin.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. Two windows on white. An app window on the left holds a button reading Open browser to sign in, an empty field labelled Code from the browser and a pale button reading Use this code. A dotted outline on the right marks the browser, which is not open yet. The first button is pressed and a browser window opens in the outline, with a crowded row of tabs, a tick, the words copy the code and a code drawn as a row of boxes with a dot in each. A copy of the code lifts out of the browser, travels across and drops into the field. Use this code turns yellow and is pressed, and the app window shows You are signed in."><figcaption>Sign in takes two windows: press Open browser to sign in and sign in there. If the screen does not move on by itself, copy the code from the browser, paste it into Code from the browser and press Use this code. Tap the app window to watch it again.</figcaption></figure>

Then comes the plans screen, **Run your agents like a company**, with three buttons.

* **Continue with the free version** starts you on Free. Pick this one if you have no licence.
* **I have a licence key** lets you paste a key.
* **Get PRO** opens the checkout in your browser.

<figure class="mg" data-scene="fork"><img src="/blog/assets/media/how-to-install-and-use-munder-difflin/fork.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A mini golf course on white, seen from above. A putter taps a ball off a mat marked after setup. The green lane splits into three branches, and a button sits on each one: Continue with the free version, I have a licence key and Get PRO. Each branch ends at a hole, marked Free, paste a key and checkout in your browser. The ball rolls to the split, stops, leans toward two of the branches, then takes the one under Continue with the free version, which turns yellow. It circles the rim of the hole once before it drops in, and a tick appears on the hole beside Free. The other two buttons then light up in turn. Tapping a branch sends the ball down that one."><figcaption>Without a licence, press Continue with the free version to start on Free. Tap a branch to take it.</figcaption></figure>

In the words of [harnessmd.com](https://harnessmd.com/): "The free plan lets you use Pro features up to a monthly allowance of work tokens." The [download page](https://harnessmd.com/download) puts that at 200M tokens a month and lists four plans: Free, Pro, Max and Teams. Compare them in **Settings**, then **Billing**.

The app then opens on **Home**: your office's floor, with one box under it for messages. Only your orchestrator starts with the app. Every other agent shows **Sleeping** until a message wakes it, and sleeps again after 60 minutes with nothing to do; you can change that time. To wake one yourself, press **Wake** on its screen or in its right click menu, or click its **Sleeping** label.

A new install needs no project first. In the download page's words: "The orchestrator makes a project folder inside your hive for each agent it starts, so there is no project to add first."

In the top bar, **Usage limits** shows the percent used for each engine you pick, amber from 80 percent; a click opens each vendor's own windows and reset times. Next to it, the **Theme** button sets your floor's look. It opens **Simulation**, which says "Simulations do not consume tokens." The title bar switches between **Classic**, the plain office floor, and **PRO**, with Home and the other screens.

## What do you do in your first ten minutes?

You are on Home, and only your orchestrator is awake. Type in the box under the floor, pick him as who it goes to, and send. Brief him the way you would brief a capable new hire: the outcome, the folder, and what done looks like.

Weak: *"organise my files"*

Better: *"Look in my Documents/receipts folder. Sort every PDF into folders by year, using the date inside the document, not the file name. Tell me about any file you cannot read."*

Your orchestrator decides whether he needs help, and starts it. A new agent appears at a desk, with a project folder of its own. Click any agent to open its terminal and watch it work.

When that works, [your first hour](/blog/your-first-hour-with-munder-difflin/) covers teams, schedules, Slack and the Pro screens. For ideas, [every agent on our own floor](/blog/ai-agent-use-cases-our-office/) shows the jobs we give ours.

## What does the Cloud Office add?

A Cloud Office is an office on its own machine in the cloud, with its own orchestrator. The office on your computer stops when the app closes or the laptop sleeps. A Cloud Office does not: its agents keep working day and night, while your computer sleeps or is closed.

Little else changes for you. Its agents have the same screens: Inbox, Tasks, Terminal, History and the details panel. Mail both ways: you and your agents on this computer write to its agents, and they answer.

<figure class="mg" data-scene="cloud"><img src="/blog/assets/media/how-to-install-and-use-munder-difflin/cloud.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a soft white laptop on the left closes its lid and a small lilac moon rises over it. On the right a sky blue cloud holds a mint card reading Cloud Office, where three yellow dots keep blinking as its agents work. A yellow arrow reading Mail both ways runs between them. Tapping the cloud shows soft white tags: Its own orchestrator, 2 vCPU, 4 GB memory, 100 GB disk and From $138 a month."><figcaption>A Cloud Office keeps working while your computer sleeps, with mail both ways. From $138 a month on Max at the launch price (pricing page, 22 Nov 2026). Tap the cloud to see what comes with it.</figcaption></figure>

Max is the plan with a Cloud Office. On the [pricing page](https://munderdiffl.in/pricing.html) on 22 Nov 2026, Max costs "from $138 a month" at the launch price ("List price $148 a month") and includes "Everything in Pro, with no token cap", "A Cloud Office of your own: 2 vCPU, 4 GB memory, 100 GB disk" and "Its own orchestrator, in the cloud". On Teams, the same page lists a "Cloud Office add on: $99 a seat a month", for some or all seats (22 Nov 2026).

To get one, compare the plans in **Settings**, then **Billing**. You buy Max on our website, then turn the office on from the app and switch to it at the top of the sidebar.

## How do you move an agent to the Cloud Office and back?

With a Cloud Office, you drag the agent onto it in the sidebar and confirm in the sheet that opens. With an agent called Writer:

1. Drag Writer's row out of the **Main Office** by its middle. The dots handle under its avatar works too; it shows when **Keep my agent order** is on in **Settings**, **General**.
2. Drop it on the **Cloud Office** section. Under the pointer the whole section lights up and reads **Drop to run Writer in Cloud Office**.
3. The drop opens the **Run in** sheet: **Run Writer in the Cloud Office**.
4. Read what comes and what does not. Under **Comes with Writer**: memory, skills and settings, and work that is pushed. "Writer knows there what it knows here." Under **Does not come**: the open conversation, keys, mail and tasks, and work that is not pushed. "Push first to bring them."
5. Keep or untick **Stop Writer in your Main Office**: "Writer runs in one office at a time. Untick to run a second copy there and keep this one going."
6. Press **Move**, or **Copy and start** with the box unticked. **Cancel** leaves everything as it was.

Nothing moves until you confirm in the sheet. While it checks, the sheet says what it is checking, and when **Move** stays grey it says why.

<figure class="mg" data-scene="move"><img src="/blog/assets/media/how-to-install-and-use-munder-difflin/move.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A soft white sidebar shows two sections headed MAIN OFFICE and CLOUD OFFICE, with agent rows marked by lilac and sky dots. Under an ink pointer, the row reading Writer lifts out of the Main Office and its place fades. As it reaches the Cloud Office, the whole section turns soft yellow with a yellow outline and the line Drop to run Writer in Cloud Office. On the drop a white sheet slides in titled Run Writer in the Cloud Office, with a yellow tick reading Stop Writer in your Main Office, a group Comes with Writer listing Memory, skills and settings, a group Does not come listing The open conversation, Keys and Mail and tasks, and two buttons, Cancel and a yellow Move. Tapping the scene plays the way back: the Main Office lights up with Drop to bring Writer back to the Main Office, and the sheet title reads Run Writer in the Main Office."><figcaption>The drop opens the Run in sheet, and nothing moves until you press Move. Munder Difflin 0.5.10. Tap the scene to play the way back.</figcaption></figure>

The way back is the same drag in reverse: drag Writer's Cloud Office row onto the **Main Office**, which reads **Drop to bring Writer back to the Main Office**. The sheet opens as **Run Writer in the Main Office**, and "Writer knows here what it learned there."

{% img "shot-move", "The real screens in Munder Difflin 0.5.10, from a sample office: the Cloud Office lit up under a dragged row, and the Run in sheet the drop opens. The sample agent there is Pam; the folder and the repository are made up." %}

## What is the IDE button for?

Click an agent and press **IDE** in its panel. The button opens a code editor on that agent's working folder, inside the app. Use it to see what an agent just did without leaving the office.

* Open, edit and save any file, or make a **New file**.
* See what the agent changed: **Changes**, **History** and **Compare**.
* Preview Markdown files, the plain text format agents write reports in, as **code**, **split** or **preview**.
* Open images.

It is the quickest way to check an agent's work. Ask for a report, open the IDE and read the report in preview next to the files it describes.

<figure class="mg" data-scene="ide"><img src="/blog/assets/media/how-to-install-and-use-munder-difflin/ide.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A light code editor window on white. Its title bar holds a button reading IDE and the words an agent's working folder. Under it are three tabs, Changes, History and Compare, and a switch reading code, split and preview. A file list runs down the left side with a New file button at the bottom, and one file is selected. The code pane shows the file as grey bars, one bar per line. Two new lines type themselves in at the bottom, and a yellow dot marks the selected file as changed. The Changes tab lights up and the two new lines are marked in green. The switch then slides to split, and a formatted preview with a heading and a bullet list opens beside the code. It slides to preview, where the preview fills the pane, and back to split. The scroll bar handle is tiny, because the file is long."><figcaption>The IDE button opens an editor on an agent's working folder: edit and save files, see Changes, History and Compare, and preview Markdown as code, split or preview. Tap the switch to change the view.</figcaption></figure>

## What can you add after setup?

Almost everything. Setup asks for the minimum, and the rest lives in **Settings** and **Integrations**.

* **Prerequisites** shows whether each engine and helper tool is installed.
* **Agents & Models** is where a second or third engine comes in.
* **Autonomy & Budgets** holds how much agents may do alone, their budgets, and whether temps (short lived agents for one job) may be started.
* **Memory & Knowledge** covers what agents remember. Search by meaning needs `uv` and MemPalace.

In Pro, the **Integrations** row in the sidebar puts Slack, webhooks, the apps your agents use and your keys in one place, each with a plain status and the last 50 things that happened. Nothing saves until you press **Save**. OpenCode, Crush, Pi and Qwen take a key, which goes in Integrations, under Keys and secrets; Claude Code and Codex use their own sign in. The [Slack guide](/blog/connect-slack-to-munder-difflin/) walks through Slack.

## What do you do when an install fails?

Read the message first. The app says what is wrong in a sentence, and most screens carry the button that fixes it.

| What you see | What to do |
| --- | --- |
| "… is not installed on this computer.", with your engine's name in front | Press **Install**. If it stops, **Try again**. **Open the docs** and **Set up manually** are the fallbacks. |
| **Sign in needed** | Finish the engine's sign in in that agent's terminal, then press **Setup complete, start agent**. |
| "Signing in needs the internet. Your work is safe on this machine. Reconnect and try again." | Reconnect, then try again. Nothing is lost. |
| "Munder Difflin could not verify the secure connection to our server." | Check the computer's date and time. If they are right, ask whoever runs your network or security software to allow the address in the message, then press **Try again**. |
| "A folder name cannot hold a space." | Press the button that reads **Use** and the suggested name. |
| A note that a port (a numbered door programs listen on) was in use and the session listens on another one | Nothing, unless something on this computer calls that port, such as a webhook. Then point it at the new number. |
| macOS will not open the app | Try to open it once, then **System Settings**, then **Privacy & Security**, then **Open Anyway** within the hour, and enter your password. |
| Pro stopped, and Classic says why | Press the one button it shows. |

If the message does not settle it, work up this list and stop at the first step that fixes it. The order is our view; the app itself only offers the first step.

1. **Check again.** Press **Check again** or **Try again** on the screen.
2. **Restart the agent.** Close that agent and start it again.
3. **Reopen the app.** Quit Munder Difflin completely and open it again.
4. **Restart the computer.** The last resort, if step 3 did not help.

<figure class="mg" data-scene="fixes"><img src="/blog/assets/media/how-to-install-and-use-munder-difflin/fixes.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. Four stepping stones cross a small stream on white, between two green banks, each stone a little bigger than the last. They are labelled Check again, restart the agent, reopen the app and restart the computer. Every stone carries the same round restart arrow, drawn around a button, a terminal, an app window and a computer. Above the near bank a crooked card reading Install shows a progress bar snapped in two and a yellow warning mark. A pebble hops from the bank onto the first stone, the arrow spins, the broken half of the bar lifts and drops again, and the stone gets a lilac cross. The second stone goes the same way. On the third stone the bar mends and fills, the card straightens, a tick appears and the pebble stays there. The fourth stone is never needed. Past the far bank a speech bubble reads Still stuck? Ask your orchestrator. Tapping a stone makes that stone the one that works."><figcaption>When an install fails, work up four steps and stop at the first that fixes it: Check again, restart the agent, reopen the app, restart the computer. Tap a stone to hop that far.</figcaption></figure>

Still stuck? Ask your orchestrator: *"The Codex install failed. Read the log and tell me why."* If his own engine failed, run its lines from the terminal section above, then press **Check again**. The log is `hive/log.jsonl` in your workspace folder, and a crashed agent's output is in `hive/crashes`.

Four things look like failures and are not:

* **An agent reads Sleeping.** It rests until a message wakes it. Press **Wake** to start it now.
* **An agent reads "looping".** That is the circuit breaker warning an agent that repeats itself or spends fast. It is the app working.
* **An agent's session was cleared.** With **Clear on a switch of work** on in **Automations** (it is off by default), the app clears a session when the agent's work switches and the session has run for 60 minutes, to save tokens. A file called `handoff.md` in the agent's folder carries the thread across.
* **Everything is slow with many agents.** A computer with 8 GB of memory struggles with a large team. Run fewer at once, or move some to a Cloud Office.

<link rel="stylesheet" href="/blog/assets/media/how-to-install-and-use-munder-difflin/motion.css"><script defer src="/blog/assets/media/how-to-install-and-use-munder-difflin/motion.js"></script>
