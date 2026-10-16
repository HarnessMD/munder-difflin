---
title: "How to Install Munder Difflin 0.5.6: A Beginner's Guide From Zero to a Working Office"
seoTitle: "How to Install Munder Difflin 0.5.6: Beginner's Guide"
description: "Install Munder Difflin 0.5.6 on macOS, Windows or Linux: what you need first, which AI engine to pick, the sign in, the setup steps and a fix for each failure."
date: 2026-06-05
updated: 2026-10-14
category: guides
categoryLabel: Guides
type: Non-technical
pinned: true
pinOrder: 1
primaryKeyword: "how to install munder difflin"
secondaryKeywords: ["munder difflin download", "munder difflin setup", "install munder difflin windows", "install munder difflin mac", "what is a coding agent", "munder difflin beginner guide", "munder difflin not installed fix"]
tags: ["Guides", "Getting Started", "Tutorial", "Non-Technical"]
author:
  name: Chaitanya Giri
  initials: CG
faq:
  - q: "Do I need to know how to code to install Munder Difflin?"
    a: "No. You type two or three commands, to install an AI engine and sign in to it, and you can copy and paste them. If you skip that, the app offers to install a missing engine for you the first time an agent starts."
  - q: "Do I have to install an AI engine before the app?"
    a: "No. Setup marks each engine Installed, Installs on first start or Not installed. An engine marked Installs on first start is installed in the agent's own terminal when you press Install, and the app installs Node first if that engine needs it. You still have to sign in to the engine yourself."
  - q: "Do I need an account?"
    a: "Yes. The first launch asks you to sign in through your browser, on the free version as well. The browser does not open by itself: press Open browser to sign in and sign in there. The screen usually moves on by itself; if it does not, paste the code the browser shows you into the app."
  - q: "Which operating systems does Munder Difflin run on?"
    a: "macOS, Windows and Linux. macOS is one universal build for Apple Silicon and Intel, signed and notarized by Apple. Windows 10 and 11, 64 bit, get a setup installer and a portable build. Linux gets a 64 bit AppImage."
  - q: "Can these agents really change files on my computer?"
    a: "Yes, and that is the point, so understand it before you start. An agent starts in the folder you give it and can read files, write files and run commands. It is not locked in there: it can reach anything your account can. Start with a new empty folder and watch what the agents do before you point one at anything you care about."
  - q: "Is the free version a separate download from Pro?"
    a: "No. There is one installer. The free version is the Classic view, and a licence unlocks the Pro view in the same app. On first launch, press Continue with the free version to reach Classic. Until Saturday 24 October 2026, Pro is free for everyone as part of the launch: sign in and the app opens Pro with no licence."
startHere: true
startOrder: 1
---

<div class="callout tldr"><span class="ic">TL;DR</span><p>Pick one AI engine, by what you already pay for. Download Munder Difflin 0.5.6 and open it. Press <strong>Open browser to sign in</strong> and sign in, name your workspace and your orchestrator, then press <strong>Continue with the free version</strong>. Until Saturday 24 October 2026, Pro is free for everyone as part of the launch, so you go straight to Pro. If the engine is missing, the app offers to install it. About twenty minutes.</p></div>

This is how to install Munder Difflin 0.5.6 when you have never used an AI coding tool. Most guides start three steps ahead of you. This one starts with what the thing is, and ends with a working office and a fix for every way setup can fail.

## What is Munder Difflin?

[Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of coding agents such as Claude Code, Codex and Gemini CLI on your own computer.

In plain words, it is a small office of AI workers. One of them is your orchestrator, the one you talk to. He is called Michael until you rename him. You give Michael a job, he splits it into pieces, hands the pieces to other agents and comes back to you only when something needs your decision.

It is not a chatbot. You do not sit there typing and waiting for replies. You brief Michael, go and do something else, and come back to finished work.

<figure class="mg" data-scene="office"><img src="/blog/assets/media/how-to-install-and-use-munder-difflin/office.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. An office seen from the front on white. One wide desk with a screen stands at the front, marked your orchestrator. Behind it, on a step marked other agents, are four smaller desks, each with its own screen. A slip marked your job lands on the front screen, is torn into three smaller slips, and each flies to a different desk at the back, where a progress bar starts to fill. Two of those desks finish with a tick. The third stops part way and sends back a slip marked needs your decision, which lands on the front screen. The fourth desk gets no slip, and its screen runs a bouncing screensaver. A filing cabinet and a water cooler stand at the sides."><figcaption>What Munder Difflin does: you brief one orchestrator, he hands the pieces to other agents, and only the decisions come back to you. Tap the front desk to send another job.</figcaption></figure>

## What is a coding agent, and what can it touch on your computer?

A coding agent is an AI that acts instead of only answering. Ask a chatbot a question and you get text. Give a coding agent a job and it reads your files, writes new ones, runs commands and checks its own work, in a loop, until the job is done or it gets stuck.

Each agent runs through a program called an engine: Claude Code, Codex, Antigravity and the others in this guide. The engine does the thinking. Munder Difflin is the office around a team of them: tasks, memory, schedules, messages, and when to come and ask you.

An engine runs with your own permissions. Anything you can do from your account, it can do: open files, change them, delete them, run software. That is why it is useful, and why you should be deliberate. Three things keep it sane:

1. **You choose the folder.** An agent starts in the folder you give it. It is not locked in there, so do not make your first one your whole home folder.
2. **You choose how much freedom they have.** Whether agents act on their own or stop and ask is a setting: **Settings**, then **Autonomy & Budgets**. A new install starts on autonomous: agents act without asking. Look at it before your first real job.
3. **You can watch.** Every agent has a live terminal you can open and watch.

{% img "autonomy-056", "Settings, then Autonomy & Budgets: how much agents do alone, who may add agents, and the circuit breaker. From a preview build of 0.5.6 with sample data." %}

<figure class="mg" data-scene="rooms"><img src="/blog/assets/media/how-to-install-and-use-munder-difflin/rooms.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. The floor plan of a house on white. Four pale rooms are each labelled as a folder: Documents, Photos, Projects and Downloads. Beside them is a hatched plot with a plus sign, labelled new empty folder. Its walls are drawn in and it becomes a fifth room, the only one drawn in colour. A small desk with a terminal on it drops into that room, a tag reading agent works here appears under it, and three new files appear beside it. The other rooms stay pale, and loose pages keep piling up in Downloads. Tapping a pale room colours it and moves a second desk in."><figcaption>An agent starts in the folder you give it. It is not locked in there: it can reach anything your account can. For your first job, make a new empty folder and use that. Tap a room to give the agent another folder.</figcaption></figure>

## What do you need before you install?

Less than you would think. The app itself needs nothing else installed.

* **A computer.** macOS on Apple Silicon or Intel, Windows 10 or 11 (64 bit), or a modern 64 bit Linux.
* **An email address.** The first launch asks you to sign in, on the free version as well.
* **One AI engine, signed in.** You can install it now with one command, or let the app install it later. Either way you sign in to the engine yourself, with your own subscription or key.

Good to have, and you can add them after setup: git, and two small tools called `uv` and MemPalace that let agents search their memory by meaning. The app checks for these, and for Node, under **Settings**, then **Prerequisites**.

{% img "prerequisites-056", "Settings, then Prerequisites: each helper tool shows Found or Not found, and a missing one shows the command that installs it. From a preview build of 0.5.6 with sample data." %}

## Which AI engine should you pick?

Munder Difflin does not include an AI. It drives one you install. It supports twelve engines plus a custom one, and you need exactly one to start. What you already pay for usually decides it.

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

Codex can also install through npm, which comes with Node: `npm install -g @openai/codex`. Check Node with `node --version`; the app wants version 20 or newer. If you see an error such as "command not found" instead of a number, you have no Node: get the LTS build from [nodejs.org](https://nodejs.org/en/download), then close the terminal and open a new one.

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

<figure class="mg" data-scene="terminal"><img src="/blog/assets/media/how-to-install-and-use-munder-difflin/terminal.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A light terminal window on white, above a row of keyboard keys with a large Enter key. A line types itself: npm install -g @openai/codex. Enter is pressed and a progress bar fills, slips back one block near the end, then finishes with a tick. A second line types codex, a dotted arrow runs from it to a small browser window that slides in over the terminal showing Sign in, and the button in that window turns into a tick. A third line types codex --version and prints three blocks that stand in for a version number, a tick and the words a version number."><figcaption>The whole terminal part of this guide: install the engine, run it once to sign in, then ask for its version to check. The drawing uses Codex; every engine follows the same three steps, though the install command differs. Tap the terminal to run it again.</figcaption></figure>

<div class="callout warn"><span class="ic">The step people skip</span><p><strong>Installing an engine is not the same as signing in to it.</strong> Run its command once and finish the sign in. Otherwise the agent cannot start. For Claude Code, Codex and Cursor the app shows <strong>Sign in needed</strong>.</p></div>

### Or let the app install it

You can skip the terminal. Setup marks every engine **Installed**, **Installs on first start** or **Not installed**. When you start an agent whose engine is missing, the app says so and offers an **Install** button. Nothing installs until you press it.

The app uses the first route that can work on your computer: npm; Node and npm together if Node is missing; the engine's own installer; else a manual route with a link to the docs. The sign in is still yours to finish, in that agent's terminal.

## How do you download and install Munder Difflin?

Get the file for your system from the [download page](https://harnessmd.com/download).

<figure class="mg" data-scene="download"><img src="/blog/assets/media/how-to-install-and-use-munder-difflin/download.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A download page on white shows the address harnessmd.com/download and three buttons labelled macOS, Windows and Linux. A file hangs from a clip under each button: universal .dmg, setup .exe with portable .exe beside it, and .AppImage. Each button is pressed in turn and lets go of its file, which opens a parachute and floats down to a landing pad on the ground. The portable .exe has a carry handle and no parachute, so it drops and bounces."><figcaption>One file per system: a universal .dmg for macOS, a setup .exe or a portable .exe for Windows, and an .AppImage for Linux. Tap a button to drop its file again.</figcaption></figure>

* **macOS.** One universal `.dmg` for Apple Silicon and Intel, signed and notarized by Apple. Open it and drag Munder Difflin into Applications. If macOS still refuses to open it, try to open it once, then open **System Settings**, then **Privacy & Security**, press **Open Anyway** within the hour and enter your password.
* **Windows.** Run the setup `.exe`. It installs for your user only and lets you pick the folder. There is also a portable `.exe` that needs no installing.
* **Linux.** Mark the `.AppImage` as executable (`chmod +x` on the file), then run it.

Optional: to confirm the download arrived intact, compare its checksum with `SHA256SUMS-v0.5.6.txt`, published with the release. Run `shasum -a 256` on your download on macOS, `sha256sum` on Linux, or `Get-FileHash` in PowerShell, and compare the value with that file's line.

## What happens the first time you open it?

Setup has four steps. The words in bold are the words on the screen.

1. **How are you using Munder Difflin?** Pick **On my own**, or **With my team** if someone sent you an invite code (a team code, not the sign in code below), and press **Continue**. Then comes **Sign in to continue**: press **Open browser to sign in**. The browser never opens by itself. Sign in there. The screen usually moves on by itself. If it does not, copy the code the browser shows, switch back to the app, paste it into **Code from the browser** and press **Use this code**. You see **You are signed in**; press **Continue**.
2. **Name your workspace.** The default name is `HarnessAgents`. Everything your agents do lives in this one folder: their work, memory, tasks and history. **Browse** picks where it goes. The name cannot hold a space, and the app offers a fixed one if you type a space. This step also asks whether you are technical or non-technical.
3. **Meet your orchestrator.** Name him and pick his engine. The engine you pick shows **Installed**, **Installs on first start** or **Not installed**.
4. **A last look at him.** Press **Open the workspace**, and you are in.

<figure class="mg" data-scene="signin"><img src="/blog/assets/media/how-to-install-and-use-munder-difflin/signin.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. Two windows on white. An app window on the left holds a button reading Open browser to sign in, an empty field labelled Code from the browser and a pale button reading Use this code. A dotted outline on the right marks the browser, which is not open yet. The first button is pressed and a browser window opens in the outline, with a crowded row of tabs, a tick, the words copy the code and a code drawn as a row of boxes with a dot in each. A copy of the code lifts out of the browser, travels across and drops into the field. Use this code turns yellow and is pressed, and the app window shows You are signed in."><figcaption>Sign in takes two windows: press Open browser to sign in and sign in there. If the screen does not move on by itself, copy the code from the browser, paste it into Code from the browser and press Use this code. Tap the app window to watch it again.</figcaption></figure>

Until Saturday 24 October 2026, Pro is free for everyone as part of the launch. Once you sign in, the app opens the Pro view with no licence and skips the screen below. From Sunday 25 October it is back.

Then comes the screen that stops people: the Pro sales screen, **Run your agents like a company**, with three buttons.

* **Continue with the free version** opens the Classic view. This is the one you want if you have no licence.
* **I have a licence key** lets you paste a key.
* **Get PRO** opens the checkout in your browser.

<figure class="mg" data-scene="fork"><img src="/blog/assets/media/how-to-install-and-use-munder-difflin/fork.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A mini golf course on white, seen from above. A putter taps a ball off a mat marked after setup. The green lane splits into three branches, and a button sits on each one: Continue with the free version, I have a licence key and Get PRO. Each branch ends at a hole, marked Classic view, paste a key and checkout in your browser. The ball rolls to the split, stops, leans toward two of the branches, then takes the one under Continue with the free version, which turns yellow. It circles the rim of the hole once before it drops in, and a tick appears on the hole beside Classic view. The other two buttons then light up in turn. Tapping a branch sends the ball down that one."><figcaption>The first screen after setup offers Continue with the free version, I have a licence key and Get PRO. Without a licence, press Continue with the free version to reach the Classic view. Tap a branch to take it.</figcaption></figure>

Classic is the free view: the office floor. The Pro view adds one window with screens for Tasks, Inbox, Automations, Memory and Capabilities, plus the Stapler, a small window above every app. You can move between the two later with the switch in the title bar, **Classic** and **PRO**. Without a licence the second one reads **TRY PRO**, and pressing it brings back this screen.

## What do you do in your first ten minutes?

You are in the office. Your orchestrator is there, and nobody else yet. Talk to him the way you would brief a capable new hire: the outcome, the folder, and what done looks like.

Weak: *"organise my files"*

Better: *"Look in my Documents/receipts folder. Sort every PDF into folders by year, using the date inside the document, not the file name. Tell me about any file you cannot read."*

Your orchestrator decides whether he needs help, and hires it. A new agent appears at a desk. When you hire one yourself, you pick its face from fifteen built in avatars. Click any agent to open its terminal and watch it work.

When that works, [your first hour](/blog/your-first-hour-with-munder-difflin/) covers teams, schedules, Slack and the Pro screens. For ideas, [every agent on our own floor](/blog/ai-agent-use-cases-our-office/) shows the jobs we give ours.

## What is the IDE button for?

Click an agent and press **IDE** in its panel. The button opens a code editor on that agent's working folder, inside the app. Use it to see what an agent just did without leaving the office.

* Open, edit and save any file, or make a **New file**.
* See what the agent changed: **Changes**, **History** and **Compare**.
* Preview Markdown files, the plain text format agents write reports in, as **code**, **split** or **preview**.
* Open images.

It is the quickest way to check an agent's work. Ask for a report, open the IDE and read the report in preview next to the files it describes.

<figure class="mg" data-scene="ide"><img src="/blog/assets/media/how-to-install-and-use-munder-difflin/ide.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A light code editor window on white. Its title bar holds a button reading IDE and the words an agent's working folder. Under it are three tabs, Changes, History and Compare, and a switch reading code, split and preview. A file list runs down the left side with a New file button at the bottom, and one file is selected. The code pane shows the file as grey bars, one bar per line. Two new lines type themselves in at the bottom, and a yellow dot marks the selected file as changed. The Changes tab lights up and the two new lines are marked in green. The switch then slides to split, and a formatted preview with a heading and a bullet list opens beside the code. It slides to preview, where the preview fills the pane, and back to split. The scroll bar handle is tiny, because the file is long."><figcaption>The IDE button opens an editor on an agent's working folder: edit and save files, see Changes, History and Compare, and preview Markdown as code, split or preview. Tap the switch to change the view.</figcaption></figure>

## What can you add after setup?

Almost everything. Setup asks for the minimum, and the rest lives in **Settings**.

* **Prerequisites** shows whether each engine and helper tool is installed.
* **Agents & Models** is where a second or third engine comes in.
* **Autonomy & Budgets** holds how much agents may do alone, their budgets, and whether temps (short lived agents for one job) may be started.
* **Connections** is Slack and the other ways work arrives from outside. The [Slack guide](/blog/connect-slack-to-munder-difflin/) walks through it.
* **Memory & Knowledge** covers what agents remember. Search by meaning needs `uv` and MemPalace.
* **Keys & Secrets** is where saved keys live. OpenCode, Crush, Pi and Qwen take a key; Claude Code and Codex use their own sign in.

In Pro, the **Integrations** row in the sidebar puts Slack, webhooks, the apps your agents use and your keys in one place, each with a plain status and the last 50 things that happened. Nothing saves until you press **Save**.

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
| macOS will not open the app | Try to open it once, then **System Settings**, then **Privacy & Security**, then **Open Anyway**. |

If the message does not settle it, work up this list and stop at the first step that fixes it. This order is our advice from running the app every day; the app itself only offers the first step.

1. **Check again.** Press **Check again** or **Try again** on the screen.
2. **Restart the agent.** Close that agent and start it again.
3. **Reopen the app.** Quit Munder Difflin completely and open it again.
4. **Restart the computer.** The last resort, if step 3 did not help.

<figure class="mg" data-scene="fixes"><img src="/blog/assets/media/how-to-install-and-use-munder-difflin/fixes.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. Four stepping stones cross a small stream on white, between two green banks, each stone a little bigger than the last. They are labelled Check again, restart the agent, reopen the app and restart the computer. Every stone carries the same round restart arrow, drawn around a button, a terminal, an app window and a computer. Above the near bank a crooked card reading Install shows a progress bar snapped in two and a yellow warning mark. A pebble hops from the bank onto the first stone, the arrow spins, the broken half of the bar lifts and drops again, and the stone gets a lilac cross. The second stone goes the same way. On the third stone the bar mends and fills, the card straightens, a tick appears and the pebble stays there. The fourth stone is never needed. Past the far bank a speech bubble reads Still stuck? Ask your orchestrator. Tapping a stone makes that stone the one that works."><figcaption>When an install fails, work up four steps and stop at the first that fixes it: Check again, restart the agent, reopen the app, restart the computer. Tap a stone to hop that far.</figcaption></figure>

Still stuck? Ask your orchestrator: *"The Codex install failed. Read the log and tell me why."* If the engine that failed is the one your orchestrator runs on, there is nobody to ask yet: run that engine's lines from the terminal section above, then press **Check again**. The log is `hive/log.jsonl` inside your workspace folder, and a crashed agent's raw output is in `hive/crashes` beside it.

Three things look like failures and are not:

* **An agent reads "looping".** That is the circuit breaker warning an agent that repeats itself or spends fast. It is the app working.
* **An agent's session was cleared.** By default the app clears a session when the agent's work switches and the session has run for 60 minutes, to save tokens. A file called `handoff.md` in the agent's folder carries the thread across.
* **Everything is slow with many agents.** A computer with 8 GB of memory struggles with a large team. Run fewer at once.

## What is the short version?

Seven steps, about twenty minutes.

1. Pick one engine: Claude Code, Codex, or a free one.
2. Download Munder Difflin and open it.
3. Press **Open browser to sign in** and sign in.
4. Name your workspace and your orchestrator.
5. Press **Continue with the free version**.
6. If the engine is missing, press **Install**, then sign in to it.
7. Give your orchestrator a real job in a new empty folder, and watch.

<link rel="stylesheet" href="/blog/assets/media/how-to-install-and-use-munder-difflin/motion.css"><script defer src="/blog/assets/media/how-to-install-and-use-munder-difflin/motion.js"></script>
