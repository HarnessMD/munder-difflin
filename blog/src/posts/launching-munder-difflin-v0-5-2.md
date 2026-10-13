---
title: "Munder Difflin 0.5.2: Pro, the Stapler and Everything Since 0.4.6"
description: "Munder Difflin 0.5.2 is out: how to install it, how to start Pro, what Pro adds, what changed since 0.4.6, and the end of signed Community builds."
date: 2026-09-10
category: story
categoryLabel: Story
type: Non-technical
primaryKeyword: "munder difflin 0.5.2"
secondaryKeywords: ["munder difflin pro", "install munder difflin pro", "munder difflin stapler", "munder difflin release notes", "munder difflin community build"]
tags: ["Story", "Release", "Pro"]
author:
  name: Chaitanya Giri
  initials: CG
faq:
  - q: "Is Munder Difflin 0.5.2 free?"
    a: "Yes. The 0.5.2 download runs the classic office for free after you sign in to your harnessMD account, and your work stays on your machine. Pro and Teams are optional paid plans on the same download."
  - q: "Do I need a different download for Pro?"
    a: "No. The free classic office, Pro and Teams all run on the same 0.5.2 download. Buying Pro or entering a licence key switches that machine to Pro."
  - q: "Are Community builds still signed and notarized?"
    a: "No. We have stopped signing and notarizing Community builds. The build we sign, notarize and maintain is the Pro build, which is the 0.5.2 download on our download pages."
  - q: "How do I update from 0.4.6?"
    a: "If the update badge in the title bar offers 0.5.2, click it and restart. If it does not, or the update fails, download 0.5.2 and install it over your current copy."
  - q: "What does the Stapler need?"
    a: "A Pro plan, and you turn it on from Stapler in the Pro sidebar. On macOS the first screenshot asks for Screen Recording permission. Spoken messages and meeting transcripts need a free Groq API key, which you add under Voice."
---

<div class="callout tldr"><span class="ic">TL;DR</span><p><strong>Munder Difflin 0.5.2 is the version to
install today.</strong> One download runs the free classic office, Pro and Teams. Pro adds a sidebar workspace
and the Stapler, a small helper that floats over your screen. We shipped eight versions between 0.4.6 and 0.5.2,
in thirteen days. One change to know first: <strong>Community builds are no longer signed or notarized.</strong>
The build we sign, notarize and maintain is the Pro build.</p></div>

Munder Difflin 0.5.2 came out on 9 September 2026. It is one download for macOS, Windows and Linux that runs the
free classic office, Pro and Teams. This post covers how to install it, how to start Pro, what Pro adds, and what
happened between 0.4.6 and 0.5.2.

## Are Community builds still signed and notarized?

No. We have stopped signing and notarizing Community builds, and the build we now sign, notarize and maintain is
the Pro build. That Pro build is the 0.5.2 download on [harnessmd.com/download](https://harnessmd.com/download)
and [munderdiffl.in/download](https://munderdiffl.in/download).

What that means depends on which one you run:

* **The 0.5.2 download** is signed with our Apple Developer ID and notarized by Apple, so macOS opens it without a
  warning. If you install from the download page, nothing changes for you.
* **A Community build** of the open source code is no longer signed or notarized. On macOS its first launch is
  blocked until you allow it in System Settings, under Privacy & Security, with Open Anyway. Windows may show a
  SmartScreen warning before it runs.

The source on GitHub stays MIT licensed. 0.5.2 itself is a binaries only release: its
[GitHub release](https://github.com/chaitanyagiri/munder-difflin/releases/tag/v0.5.2) carries the installers, not
the 0.5.2 source.

## How do I install Munder Difflin 0.5.2?

Download it from the [download page](https://harnessmd.com/download), pick your system, and install it like any
other app. You need one supported coding CLI installed and signed in first, such as Claude Code, Codex or
Antigravity.

1. **macOS**, Apple silicon and Intel in one universal build: open the `.dmg` and drag Munder Difflin into
   Applications.
2. **Windows** 10 and 11, 64 bit: run the setup `.exe`. A portable `.exe` is on the release too.
3. **Linux**, x86_64: mark the `.AppImage` as executable, then run it.

On first launch the app opens your browser so you can sign in or create your harnessMD account. Your work itself
never leaves your machine. After that the classic office opens, free.

Want to check the file before you open it? Every release ships `SHA256SUMS.txt`. Compare the line for your file
with the output of:

```bash
# macOS and Linux
shasum -a 256 Munder-Difflin-0.5.2-mac-universal.dmg

# Windows (PowerShell)
Get-FileHash .\Munder-Difflin-0.5.2-win-x64-setup.exe -Algorithm SHA256
```

Coming from 0.4.6? If the update badge in the title bar offers 0.5.2, click it and restart. If it does not,
install 0.5.2 from the download page over your current copy. The
[install guide](/blog/how-to-install-and-use-munder-difflin/) walks through every screen.

{% img "note-1" %}

## What is Munder Difflin Pro?

Pro is the professional workspace for one person, on the same download as the free office. In the app's own
words, your agents run as a company, with an orchestrator, a task board, an inbox and a memory, all on your
machine. Free keeps the classic desktop, local and at no charge.

A Pro licence runs on one machine at a time. Teams is the plan for 2 to 20 people whose clones message each
other, sealed on each device. Plans and prices are on the [pricing page](https://munderdiffl.in/#pricing).

## What is new in Pro?

Pro stopped being a skin over Classic in this stretch: every screen you open under Pro is now drawn by Pro.

* **A sidebar workspace.** Tasks, Inbox, Automations, Memory, Capabilities, Stapler, Agents, Temps and Team, one
  screen at a time, with Classic one click away in the title bar.
* **A room for every agent.** The conversation on one side, the live terminal on the other, and a details panel
  with engine, workspace, capabilities and budget. Pause tools, stop after this step and archive are buttons now,
  not folklore.
* **Your orchestrator's screen.** Terminal, Messages, Routing, Budget and breaker, Board and Configuration, with a
  button to restart him.
* **An inbox that reads like a messenger.** Ask me for questions waiting on you, Floor for mail between agents,
  Outside for Slack and webhooks, and Team for direct messages.
* **Memory you can browse and search**, as cards, as a list, or on a graph of agents and topics.
* **Capabilities per agent.** Grant an MCP server to one agent and not another.
* **A history of temps.** Every temporary worker that ends is recorded: what it was asked, how long it ran, the
  tokens it used and how it ended.

Prefer the classic screens? The [Command Center guide](/blog/command-center-guide/) covers them.

### The Stapler

The biggest new thing is small. The Stapler is a little window that floats above every other app, off until you
turn it on. Click it and a ring of actions opens: capture a region of the screen, speak a message, record a
meeting, or hide it from screen sharing. Whatever it captures goes to your orchestrator, or since 0.5.2 to one
agent you pick, with a line from you about what to do with it. It has a face, drawn from a word you choose, and so
far nobody has put it in jelly.

Screenshots are deleted 24 hours after they are taken. Meeting audio is deleted 24 hours after it is transcribed,
and the transcript is kept. While anything is recording, the Stapler hides itself from screen shares and
recordings. Faces are by [Blobatar](https://github.com/Alain00/blobatar), open source under the MIT licence.

## How do I start using Pro?

Click **TRY PRO** in the title bar of the free office, choose **Get PRO**, and finish checkout in your browser.
The machine switches to Pro on its own when you come back.

1. Install 0.5.2 and sign in when the app asks. The free classic office opens.
2. Click **TRY PRO** in the title bar. Looking costs nothing.
3. Choose **Get PRO**. Checkout opens in your browser, where you are already signed in, so nobody signs in twice.
4. When checkout finishes, the browser hands you back to the app and this machine activates itself.
5. Already have a key? Choose **I have a licence key** instead. Keys start with MDS, and yours is in your console
   and on your receipt.
6. Switch between Classic and PRO in the title bar whenever you like. Settings, General, Default view picks the
   one the office opens in.
7. For the Stapler, open **Stapler** in the sidebar and turn it on. On macOS the first screenshot asks for Screen
   Recording permission: turn it on, then quit and reopen the app. Spoken messages and meeting transcripts need a
   free [Groq API key](https://console.groq.com/) under Voice.

Moving Pro to another machine? A key is active on one machine at a time, so release it in your console first.

{% img "note-2" %}

## What happened between 0.4.6 and 0.5.2?

Eight versions in thirteen days. 0.5.0 delivered everything since 0.4.6 as one update, so here is what each
version added along the way.

* **0.4.7, 2 Sep.** Pro became the default way to run the floor, with the sidebar workspace above. Releases and
  the updater moved to our own server, app.harnessmd.com.
* **0.4.8, 3 Sep.** Every machine needed a team seat to open. 0.4.11 replaced that with a free tier.
* **0.4.9, 3 Sep.** Pro drew every screen itself: agent rooms, the orchestrator's screen, browsable memory, eleven
  role bundles, a sprite editor for your own avatars, orchestrators with names of their own, and search across
  the whole workspace in the editor.
* **0.4.10, 4 Sep.** The first changes from a team actually using it: choose who may reach you and when, messages
  with a subject and a Markdown body, files sent as links that expire in an hour, a house style for every agent,
  and Pro for one person on a licence.
* **0.4.11, 6 Sep.** A free tier, a licence that activates on the machine that redeemed it, Slack three ways
  (polling, Socket Mode or webhooks), temps instead of workers, a redesigned editor, and sign out from the sidebar.
* **0.5.0, 8 Sep.** The Stapler, checkout in the browser with the licence coming back on its own, task ids on
  every card, and Fable 5.1, GPT-6 Astra, Gemini 3.7 Flash and Gemini 3.8 Flash in the model pickers. The app now
  reads its model list at runtime, so a new model no longer needs a release. GPT-6 Astra needs Codex 0.153.1 or
  newer.
* **0.5.1, 8 Sep.** 0.5.0 had been built without its analytics key and reported nothing; 0.5.1 put it back. Do
  Not Track still turns it off. A message delivered while the machine is busy also submits more reliably.
* **0.5.2, 9 Sep.** Captures aimed at one agent, meetings you can search and rename, screenshots and meeting audio
  deleted after 24 hours, your name and your agents' names reaching teammates inside sealed messages, a sender
  told when you are not receiving, one responder setting for Slack and teammates, a loading screen while your team
  restores, and Voice Michael able to read an agent's terminal.

### Fixed in 0.5.2

* A meeting no longer starts recording when there is no transcription key to read it.
* **Send now** on a queued message answers the click and shows it is next.
* Clicking the Dock icon brings back a closed main window while the Stapler is on screen.
* A message queued for the orchestrator survives a restart.

## Credits

0.5.0 brought in pull requests from people outside the company, merged from public main, with fixes across Slack,
worktrees, hooks, the terminal, the circuit breaker and the sandbox. Thank you:

* [@AmIrRX0](https://github.com/chaitanyagiri/munder-difflin/pull/218)
* [@LavaDMan](https://github.com/chaitanyagiri/munder-difflin/pull/309)
* @aaroncoville ([#321](https://github.com/chaitanyagiri/munder-difflin/pull/321), [#337](https://github.com/chaitanyagiri/munder-difflin/pull/337))
* [@reschandreas](https://github.com/chaitanyagiri/munder-difflin/pull/332)
* [@savvaskoualis](https://github.com/chaitanyagiri/munder-difflin/pull/335)
* [@devrahulbanjara](https://github.com/chaitanyagiri/munder-difflin/pull/347)
* [@HaningZS](https://github.com/chaitanyagiri/munder-difflin/pull/356)
* @drona23 ([#367](https://github.com/chaitanyagiri/munder-difflin/pull/367), [#368](https://github.com/chaitanyagiri/munder-difflin/pull/368), [#369](https://github.com/chaitanyagiri/munder-difflin/pull/369))
* [@gpinkham](https://github.com/chaitanyagiri/munder-difflin/pull/384)
* [@xxiaoxiong](https://github.com/chaitanyagiri/munder-difflin/pull/388)
* @HsienW ([#390](https://github.com/chaitanyagiri/munder-difflin/pull/390), [#400](https://github.com/chaitanyagiri/munder-difflin/pull/400), [#438](https://github.com/chaitanyagiri/munder-difflin/pull/438))
* [@wckleinhenz](https://github.com/chaitanyagiri/munder-difflin/pull/396)
* [@vicenteliu](https://github.com/chaitanyagiri/munder-difflin/pull/406)
* [@ketan0095](https://github.com/chaitanyagiri/munder-difflin/pull/410)
* [@skyzhao1223](https://github.com/chaitanyagiri/munder-difflin/pull/412)
* @Vasilispapg ([#415](https://github.com/chaitanyagiri/munder-difflin/pull/415), [#416](https://github.com/chaitanyagiri/munder-difflin/pull/416))
* @snehithareddy28 ([#424](https://github.com/chaitanyagiri/munder-difflin/pull/424), [#425](https://github.com/chaitanyagiri/munder-difflin/pull/425), [#426](https://github.com/chaitanyagiri/munder-difflin/pull/426))
* [@M1chaelTran](https://github.com/chaitanyagiri/munder-difflin/pull/433)
* [@divijendra](https://github.com/chaitanyagiri/munder-difflin/pull/442)

## Get it

* Download 0.5.2: [harnessmd.com/download](https://harnessmd.com/download)
* Plans and prices: [munderdiffl.in/#pricing](https://munderdiffl.in/#pricing)
* The release on GitHub, with checksums: [v0.5.2](https://github.com/chaitanyagiri/munder-difflin/releases/tag/v0.5.2)
* New here? Start with [your first hour with Munder Difflin](/blog/your-first-hour-with-munder-difflin/).
* The previous release: [Munder Difflin v0.4.6](/blog/launching-munder-difflin-v0-4-6/).
