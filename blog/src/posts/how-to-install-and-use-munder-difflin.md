---
title: "How to Install and Use Munder Difflin: A Beginner's Guide"
description: "A plain language guide to Munder Difflin 0.5.2. What a coding agent is, which AI engine to pick based on what you already pay for, the one terminal command you'll ever run, and how to install and set it up on macOS, Windows or Linux."
date: 2026-06-05
updated: 2026-09-10
category: guides
categoryLabel: Guides
type: Non-technical
pinned: true
pinOrder: 1
primaryKeyword: "how to install munder difflin"
secondaryKeywords: ["munder difflin download", "munder difflin setup", "what is a coding agent", "munder difflin windows", "free ai coding agent", "antigravity free", "munder difflin beginner guide"]
tags: ["Guides", "Getting Started", "Tutorial", "Non-Technical", "Automation"]
author:
  name: Chaitanya Giri
  initials: CG
faq:
  - q: "Do I need to know how to code to use Munder Difflin?"
    a: "No. The onboarding asks whether you are technical or not on its very first screen, and the non-technical path replaces every piece of jargon with plain language. You will open a terminal exactly once, to install and log into your AI engine, and you can copy and paste those commands."
  - q: "Does Munder Difflin cost anything?"
    a: "The classic app is free and open source, with unlimited local agents. Pro and Teams are optional paid plans. What you may pay for is the AI engine behind it. Antigravity is available at no charge and OpenCode has a free path, so you can run the whole thing without paying anything. If you already pay for ChatGPT or Claude, you can use those subscriptions instead."
  - q: "Can these agents really change files on my computer?"
    a: "Yes, and that is the point, so it is worth understanding before you start. An agent can read files, write files and run commands in the folders you give it. You choose how much freedom it has during setup, and you can set it to ask permission before every change."
  - q: "Which operating systems does Munder Difflin run on?"
    a: "macOS, Windows and Linux. macOS ships as one universal .dmg for Apple Silicon and Intel, Windows 10 and 11 as a setup installer or a portable build, and Linux as an AppImage."
  - q: "Is my code or data sent anywhere?"
    a: "The app runs on your machine and stores its files there. Your prompts and the files an agent reads do go to whichever AI engine you picked, the same as if you used that tool directly. Anonymous usage telemetry is opt-out and every event is listed publicly in TELEMETRY.md."
startHere: true
startOrder: 1
---

<div class="callout tldr"><span class="ic">TL;DR</span><p>Pick an AI engine based on what you
already pay for (or pick a free one). Install it with one command in the terminal, which is the
only time you will open a terminal. Download Munder Difflin, answer six onboarding screens, and
you have an office of AI workers you can watch on a screen.</p></div>

If you have never used an AI coding tool, most guides start three steps ahead of you. This one does
not. It starts with what these things actually are, then walks the whole way to a working setup.

You will need about twenty minutes.

## First, what is Munder Difflin?

Munder Difflin is a desktop app that runs a small office of AI workers on your computer.

You see an actual office floor on screen, with characters at desks. Each character is an AI agent
working on something you asked for. One of them is your clone, the boss of the floor, who takes what
you ask for, breaks it into jobs, and hands those jobs to the others. You talk to your clone, and
your clone manages everyone else.

The app is free and open source. It runs on your machine, and it keeps its files on your machine. There are
optional paid plans, Pro and Teams, but nothing in this guide needs them.

The thing it is not: a chatbot. You are not sitting there typing and waiting for replies. You give
your clone a job, close the laptop, and come back to work that was done while you were gone.

{% img "note-1" %}

## What is a coding agent, and how can it touch my computer?

This is the part worth reading slowly, because it is the part that surprises people.

A **coding agent** is an AI that does not just talk back. It can act. Give a normal chatbot a
question and it returns text. Give a coding agent a job and it will read your files, write new ones,
run commands, install things, and check its own work, in a loop, until the job is done or it gets
stuck.

It does this through a program on your computer called a **CLI agent**. CLI stands for command line
interface, which is the text-only way of controlling a computer that predates windows and buttons.
Claude Code, Codex, Antigravity and the others in this guide are all CLI agents. They are the engine.
Munder Difflin is the office that runs a team of them and keeps track of everything around them:
memory, tasks, schedules, files, and when to come ask you something.

**So how does it reach your computer?** When you install one of these engines, it runs as a program
with your permissions. Anything you can do from your own account, it can technically do: open your
files, edit them, delete them, run software, reach the internet. It is not sandboxed away from your
machine by default. That is exactly why it is useful, and exactly why you should be deliberate.

Three things keep this sane, and Munder Difflin sets all three up during onboarding:

1. **You choose which folders it can work in.** Agents work inside the projects you add. A project
   is just a folder. Do not point your first one at your entire home directory.
2. **You choose how much freedom it has.** During setup you pick whether agents work on their own or
   pause and ask you before changing files and running commands. If you are new, pick ask.
3. **You can watch it happen.** Every agent has a terminal you can open and read, live. Nothing
   happens off-screen.

<div class="callout note"><span class="ic">Start safe</span><p>For your first project, make a brand
new empty folder and use that. Watch what the agents do for an hour before you point one at
anything you care about.</p></div>

## Step 1: Which AI engine will you use?

Munder Difflin does not include an AI. It drives one you install. Twelve engines are supported, but
you only need one, and the right one is usually decided by what you already pay for.

Find yourself below.

### You do not want to pay anything

**Use Antigravity.** It is Google's agentic development platform and it is
[available at no charge](https://antigravity.google/). It ships with a command line tool called
`agy`, which is what Munder Difflin drives. This is the best starting point for most people reading
this guide.

**OpenCode** is the other free path. It is open source, and it lets you bring your own model,
including free and local ones.

<div class="callout note"><span class="ic">If you are in India, on Jio</span><p>Jio is running an
offer that gives eligible users <a href="https://www.jio.com/google-gemini-offer/">Google AI Pro
free for 18 months</a>. The terms on Jio's page: you must be over 18 and on an active unlimited 5G
plan of ₹349 or above, prepaid or postpaid, kept active for the whole period, claimable once per
number. Google AI Pro raises the daily request limits on <strong>Gemini CLI</strong>, which is a
separate supported engine in Munder Difflin. Note that Jio's page does not mention Antigravity, so
treat this as a boost to the Gemini CLI path rather than to Antigravity. Antigravity is free for
everyone anyway. Check Jio's page for current terms, offers change.</p></div>

### You already pay for ChatGPT

**Use Codex.** Your ChatGPT Plus or Pro subscription covers it. Nothing more to buy.

### You already pay for Claude

**Use Claude Code.** Your Claude Pro or Max subscription covers it. This is the engine the app was
built against first, and it is the most thoroughly tested of the twelve.

### The other engines

Any of these work. Pick one only if you already use it.

| Engine | Command | Good reason to pick it |
|---|---|---|
| Gemini CLI | `gemini` | You have Google AI Pro, including via the Jio offer |
| Grok | `grok` | You have an xAI subscription |
| Kimi Code | `kimi` | You use Kimi already |
| Qwen | `qwen` | You want to run a model locally on your own hardware |
| Crush | `crush` | You like Charm's tools |
| Copilot | `copilot` | You have GitHub Copilot |
| Cursor | `cursor-agent` | You have a Cursor subscription |
| pi | `pi` | You use pi already |

You can add more engines later and run several at once, with different agents on different engines.

## Step 2: Install your engine, and log in

**This is the only step where you open a terminal.** Once it is done you will not need it again.

The terminal is a plain text window for typing commands. On macOS press `Cmd+Space`, type
`Terminal`, press Enter. On Windows press the Start button, type `PowerShell`, press Enter. On Linux
you already know.

Find your engine below, copy the block, paste it, press Enter. Wait for it to finish before typing
the next line.

{% img "shot-terminal", "Checking that the engines installed. This is the only time you need this window." %}

### First: do you have Node.js?

Most of these engines install through `npm`, which comes with Node.js. Check with:

```bash
node --version
```

If that prints a version number, you are ready. If it says "command not found", get the **LTS**
build from [nodejs.org/en/download](https://nodejs.org/en/download), install it, then close the
terminal window and open a fresh one.

Antigravity, Claude Code and Cursor can be installed without Node.js. Everything else needs it.

### Antigravity (free, no subscription)

Google's coding agent. The command is `agy`. Homepage:
[antigravity.google](https://antigravity.google/) · Install docs:
[antigravity.google/docs/cli/install](https://antigravity.google/docs/cli/install/)

macOS and Linux:

```bash
curl -fsSL https://antigravity.google/cli/install.sh | bash
```

Windows PowerShell:

```powershell
irm https://antigravity.google/cli/install.ps1 | iex
```

Then sign in:

```bash
agy
```

Your browser opens. Sign in with a Google account.

### OpenCode (free, bring your own model)

Open source, works with free and local models. Docs:
[opencode.ai/docs](https://opencode.ai/docs)

```bash
npm install -g opencode-ai@latest
opencode auth login
```

### Codex (with a ChatGPT subscription)

Covered by ChatGPT Plus or Pro. Docs:
[github.com/openai/codex](https://github.com/openai/codex)

```bash
npm install -g @openai/codex
codex
```

On first run it opens a browser to sign you into your ChatGPT account.

### Claude Code (with a Claude subscription)

Covered by Claude Pro or Max. Docs:
[docs.claude.com/en/docs/claude-code](https://docs.claude.com/en/docs/claude-code)

```bash
npm install -g @anthropic-ai/claude-code
claude
```

If you would rather not install Node.js, use the standalone installer instead.

macOS and Linux:

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

Windows PowerShell:

```powershell
irm https://claude.ai/install.ps1 | iex
```

Then run `claude` and sign in when the browser opens.

### The other engines

Same idea: install, then run the command once on its own to sign in.

| Engine | Install it with | Then run | Official docs |
|---|---|---|---|
| Gemini CLI | `npm install -g @google/gemini-cli` | `gemini` | [google-gemini/gemini-cli](https://github.com/google-gemini/gemini-cli) |
| Grok | `npm install -g @xai-official/grok` | `grok` | [docs.x.ai](https://docs.x.ai/build/overview) |
| Kimi Code | `npm install -g @moonshot-ai/kimi-code` | `kimi` | [kimi.com/code](https://www.kimi.com/code/docs/en/kimi-code-cli/guides/getting-started.html) |
| Qwen | `npm install -g @qwen-code/qwen-code@latest` | `qwen` | [QwenLM/qwen-code](https://github.com/QwenLM/qwen-code) |
| Crush | `npm install -g @charmland/crush` | `crush` | [charmbracelet/crush](https://github.com/charmbracelet/crush) |
| Copilot | `npm install -g @github/copilot` | `copilot` | [docs.github.com](https://docs.github.com/copilot/concepts/agents/about-copilot-cli) |
| Cursor | `curl https://cursor.com/install -fsS \| bash` | `cursor-agent` | [cursor.com/docs](https://cursor.com/docs/cli/overview) |
| pi | `npm install -g --ignore-scripts @earendil-works/pi-coding-agent` | `pi` | [pi.dev/docs](https://pi.dev/docs/latest) |

On Windows, the Cursor line is `irm 'https://cursor.com/install?win32=true' | iex` in PowerShell.

### Check it actually installed

Run this, swapping `claude` for whichever command you installed:

```bash
claude --version
```

A version number means you are done with the terminal. "Command not found" means the install did
not finish, or the terminal is still running from before the install: close the window, open a new
one, and try again.

<div class="callout warn"><span class="ic">The one thing people skip</span><p><strong>You must
actually sign in.</strong> Installing the tool is not the same as logging into it. Run the command
once on its own and complete the sign-in before moving on, or Munder Difflin will find the engine
and every agent will still fail the moment it starts.</p></div>

## Step 3: Install Munder Difflin

Go to [munderdiffl.in](https://munderdiffl.in) and download the build for your system, or take it
straight from the
[latest release on GitHub](https://github.com/chaitanyagiri/munder-difflin/releases/latest).

{% img "shot-download", "The download page. Pick the file that matches your computer." %}

**macOS.** Download the universal `.dmg`, which runs on Apple Silicon and Intel. Open it and drag
Munder Difflin into Applications. The app is signed and notarized by Apple, so the first launch only
shows the usual question about opening an app downloaded from the internet. Click Open.

**Windows.** Download the setup `.exe` and run it. If Windows SmartScreen shows a warning, click
More info, then Run anyway. If the installer will not start at all, download the portable `.exe`
from the release instead, which needs no installation.

**Linux.** Download the `.AppImage`, make it executable (`chmod +x` on the file) and run it.

**Want to be sure the file is genuine?** Every release carries a `SHA256SUMS.txt`. Run
`shasum -a 256` on the file you downloaded (or `Get-FileHash` in Windows PowerShell) and check that
the value matches that file's line.

## Step 4: Onboarding, six screens

Open the app. It walks you through setup. There are two intro screens and then four numbered steps.

### Screen 1: Who are you?

It asks whether you are technical or not.

**Pick the non-technical option.** This is not a downgrade. It changes the language of the entire
rest of the app, replacing engine ids, flags and model slugs with plain descriptions. You can change
it later in Settings.

{% img "shot-persona", "The first onboarding screen. Choosing the non-technical path rewrites the rest of the setup in plain language." %}

### Screen 2: Meet your office

An explanation of what you are about to set up. Read it and continue.

{% img "shot-welcome", "The office tour screen." %}

### Step 1 of 4: A home for the app

The app needs an empty folder to keep its own files: its settings, and your agents' memory.

Something like `HarnessAgents` in your home folder is fine. It will create it if it does not exist.
This is not where your work goes. It is the app's own filing cabinet.

{% img "shot-home", "Choosing a home folder. Make a new empty one." %}

### Step 2 of 4: Your clone

Name your clone and pick the engine that powers it. This is where the engine you installed in Step 2
shows up. If it is not listed as installed, the sign-in did not finish, so go back and run the
command once more.

Give your clone the most capable model available to you. It is doing the thinking and delegating,
so it benefits from the extra capability more than the workers do.

{% img "shot-engine", "Naming your clone and picking its engine." %}

### Step 3 of 4: Your projects

Add the folders you want agents working in. A project is just a folder. It can hold code, documents,
notes, or anything else.

You can skip this and add projects later. If you are adding one now, make it a new empty folder.

{% img "shot-repos", "Adding a project. A project is simply a folder." %}

### Step 4 of 4: Permissions

The important screen. It asks how much agents can do on their own.

**On** means agents carry out tasks without stopping to ask. Smoothest, and how you will eventually
want it.

**Off** means agents pause and ask you before changing files or running commands.

**Start with off.** Watch a few tasks run, see what the agents actually try to do, and turn it on
when you are comfortable. You can change this any time.

{% img "shot-permissions", "The autonomy choice. Start with agents asking permission." %}

## Step 5: Your first job

You are looking at the office floor. Your clone is there. Nobody else yet.

Talk to your clone the way you would talk to a capable new hire who has not met you yet. Be specific
about the outcome, and do not bother specifying the steps.

Weak: *"organise my files"*

Better: *"Look in my Documents/receipts folder. Sort every PDF into subfolders by year, based on the
date inside the document, not the filename. Tell me about anything you cannot read."*

Your clone will decide it needs a worker, hire one, and hand the job over. You will see a new
character appear at a desk.

{% img "shot-floor", "The office floor on a fresh setup. Michael, your clone, is the only one here yet. The Command Center on the right is where work gets dispatched." %}

Click any agent to open its terminal and watch it work in real time.

### Things people actually use this for

Not all of these are coding.

- **Documents.** Sort a folder of files, rename them consistently, pull the numbers out of fifty
  invoices into one spreadsheet.
- **Research.** Give an agent a question and a place to write, and let it work through it while you
  do something else.
- **Code.** The obvious one. Fix a bug, add a feature, upgrade a dependency, write the tests.
- **Repeating chores.** Anything you do every Monday, handed to a schedule instead.
- **Long jobs.** The ones you keep not starting because they take four hours. Start one before bed.

## Step 6: Add agents yourself

Your clone hires people on its own, but you can hire directly too.

Click add agent. You pick a name, an engine, a model and a project. Different agents can run on
different engines, so you can put a free engine on the boring jobs and your paid one on the hard
ones.

{% img "shot-addagent", "The add agent panel: identity, workspace, engine, briefing. Yes, you pick which Office character they are." %}

Agents persist. Close an agent and its memory and inbox reattach when you bring it back, with the
same identity.

## Step 7: Work that starts without you

Open the triggers tab. Everything here starts work when you are not typing.

{% img "shot-triggers", "The triggers tab: schedules, context, webhooks and organisation." %}

**Schedules** run a prompt on a repeating clock. You give it a label, choose who it goes to, and
write the prompt, which is sent word for word on every run. This is the feature that turns the app
from a tool you use into something that runs on its own.

Good first schedule: every morning, ask an agent to check something and write you a short summary.

{% img "shot-schedule", "Creating a schedule. The prompt is sent word for word on every run." %}

**Context** handles what happens as an agent's memory fills up (see below).

**Webhooks** let an outside system post work in.

**Organisation** lets a teammate's Munder Difflin send work to yours.

## Step 8: Context and auto-compaction, briefly

Every AI model has a limited working memory, called its context. A long-running agent will fill it.
When it is full, the agent gets confused or stops.

**Auto-compaction** is the fix. When an agent's context gets close to full, the app has it summarise
what has happened so far and carry the summary forward instead of the raw history. The agent keeps
going without losing the thread.

You control this under Context in the triggers tab: compact automatically, clear entirely, or leave
it alone. The default is sensible and most people never touch it.

## Step 9: Settings worth knowing

Seven sections. These are the ones that matter early:

- **General.** Change your home folder, switch between technical and plain language, pick your
  language. The app runs in English, Simplified Chinese and Arabic.
- **Prerequisites.** Checks whether your engines are actually installed and logged in. **This is the
  first place to look when something is not working.**
- **Agents & Models.** Which engines are available and which models each uses. New models show up
  without an app update, because the model pickers read the latest list when the app launches.
- **Autonomy & Budgets.** The permission choice from onboarding, plus spending limits per agent.
  Worth setting a cap before leaving anything running overnight.
- **Connections.** Slack, webhooks, MCP and the REST API.
- **Voice.** Talk to your agents out loud.
- **Memory & Knowledge.** What your agents remember between sessions.

{% img "shot-settings", "The settings panel. Prerequisites is where you check that an engine is really installed." %}

## Step 10: Focus mode

When you want to stop watching the office and work with one agent, press the fullscreen control on
its terminal. The floor disappears and you get a full-width terminal.

Press `Esc` to come back.

{% img "shot-focus", "Focus mode. One agent, full width, no office." %}

## When something goes wrong

**An agent dies the moment it starts.** Almost always the engine is installed but not logged in.
Open Settings, then Prerequisites. Or run the engine's command once in a terminal and finish the
sign-in.

**"Engine not installed" during onboarding, but you installed it.** The app looks for the command on
your system path. Close the app completely and reopen it, since it reads your environment at launch.

**Windows blocks the installer.** If SmartScreen flags it, choose More info, then Run anyway, or use
the portable build.

**macOS asks whether to open an app downloaded from the internet.** That is normal for anything you
download. Click Open.

**Nothing is happening.** Check whether message delivery is paused in the Command Center. Paused
means queued work is being held for every agent, and nothing is lost when you switch it back on.

## The short version

1. Pick an engine. Antigravity if you want free, Codex if you pay for ChatGPT, Claude Code if you
   pay for Claude.
2. Install it and sign in. One terminal command. The only one.
3. Download Munder Difflin and install it.
4. Six onboarding screens. Pick the non-technical path, use a new empty folder, start with agents
   asking permission.
5. Give your clone a real job and watch what happens.

{% img "note-2" %}

The app is [open source on GitHub](https://github.com/chaitanyagiri/munder-difflin). If you get
stuck, the [Discord](https://munderdiffl.in) is the fastest place to ask.
