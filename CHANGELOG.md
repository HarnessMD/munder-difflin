# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.5.4] - date set at release

### Fixed
- **The Stapler stays under the cursor.** Zooming while the Stapler had focus (Cmd and =, or a pinch) saved a zoom level for its window, and from then on the disc drew away from the pointer during a drag. The Stapler windows now stay at 100%, ignore the zoom keys, and undo a zoom saved by 0.5.3.

## [0.5.3] - date set at release

**Stapler becomes your dictation and meeting notes, on your machine, and every agent gets easier to start, restart and steer.**

### Stapler and dictation
- **Dictate into any app.** Hold Option on the Mac, or Control+Alt+Space on Windows and Linux (X11), talk, and let go: the words land in whatever field is in front, in any app. The audio streams while you hold the key, so the words arrive a moment after you let go.
- **The composer mic** works with whichever engine is picked, in both skins and in the orchestrator's prompt bar. Free Flow no longer has a switch of its own.
- **Transcription on your machine.** A Whisper model ships inside the app for every platform and is the default for dictation and meetings. A larger, more accurate model can be downloaded. Apple's on device recogniser (macOS 26) and then Groq are the fallbacks; an empty answer from Apple is retried, and a missing model falls back to the bundled one.
- **Apple's recogniser is warmed at launch** when it is the dictation engine, so the first dictation does not wait.
- **Each transcription starts clean**: the end of one meeting no longer shapes the start of the next.
- **Meetings hear both sides.** Your microphone is written as You and the call's audio as Them: on the Mac through the system's screen audio, on Windows through the system loopback, on Linux through the PulseAudio or PipeWire monitor. Settings has the switch and a line saying whether it works on this machine.
- **Loud speakers no longer put the other side into You.** The meeting mic cancels echo, and the Stapler suggests headphones when a call plays through the built in speakers.
- **A meeting key.** Shift+Command+Space starts and stops a meeting on the Mac, Control+Shift+Space on Windows and Linux.
- **Meeting notes you can edit.** Correct the transcript, add a description under the title and ID, and send the meeting to one or more agents. The audio is never changed.
- **Your words.** A default list of 126 technical terms plus your own custom words, used by dictation and meetings, and editable from the Stapler.
- **Shortcuts from a list.** Pick a key from the choices shown instead of typing its name.
- **The Stapler panel** is compact, with collapsible sections, tooltips and one Save, and stays in step with Settings.
- **The Stapler** has eyes, a level meter and sounds while it listens, and says Make invisible or Make visible.
- **Several screenshots in one Stapler message**, a key to take one, and a screenshot taken from the card shows as attached.
- **The To menu** keeps who you picked, and the Stapler names the agent it sent to by its real name.
- **Stapler cards** open whole, away from the screen's edges, with Done and Cancel above the card.
- **Stapler fixes:** the mic stops at the click; no words are lost at a pause; Record message never gets stuck; Done and Cancel always take the click; with nothing to transcribe, it opens Dictation & Meetings instead of an error; it goes dark with the app; it survives a monitor arriving, leaving or waking, and a drag into an edge.

### Agents
- **A missing CLI is a card, not an error.** Install it from the agent's terminal and only that terminal restarts. The card works after a restart, follows the theme, and its buttons take the click.
- **Sign in from inside the app** for every engine, and **Set up manually** when an install or a sign in fails. An installed CLI that ended signed out gets the same panel.
- **Command and Restart in the right panel.** An agent's start command can be edited, Restart is always there, and a stopped agent restarts from the panel.
- **The orchestrator's command is editable** too.
- **A dead agent says so** in the sidebar, with Restart.
- **Restart keeps the session** for every engine that can resume one, and says so when it cannot. Restart & Continue frees a Claude session something else was holding.
- **Send now goes straight in.** On a queued message it types into Claude Code at once, even mid turn, ahead of the rest of the queue. Other engines take it first when they are idle.
- **A message typed into an agent is submitted** even on a slow machine: Return waits until the agent has read the text.
- **Opus 5.5** is the default Claude model, and model names come from the live catalog.
- **The model an agent is running** shows in the sidebar, and a restart keeps it.
- **Every engine is listed** wherever an agent's engine is chosen, the orchestrator's included.
- **Concise by default.** Claude Code agents start on the Concise output style, and you can change it.
- **Ask me** on every agent's Inbox, one box over the composer to answer, Dismiss all, questions grouped by who asked, the newest on the sidebar, and a badge on the agent's screen while one waits.
- **An open question is never answered by the app**: a queued message waits while a multiple choice question is on screen.
- **Attach PDFs, videos and folders** from the composer.
- **Paste an image** into a Pro composer.
- **Two floors on one machine.** New Floor asks where to start and runs a second office on its own hive, with one licence for the machine. A hive is only ever open in one floor.
- **Temps are on by default again.** Michael starts one when you ask.
- **An agent the app just gave a task** shows as working, for every engine.
- **Grok agents show their cost**, Codex remote control starts, and Copilot runs interactive after sign in, with its sign in link shown once and an Open link button.

### Settings
- **One Save.** Every section waits for it and names anything that did not save; leaving with unsaved changes asks first. Notifications save on Save too.
- **Collapsible sections and tooltips** in place of long paragraphs.
- **Connections**: Slack in plain fields, each connection with the agent that answers it.
- **Inbound integrations**: Telegram, Linear, GitHub and your own webhook. A webhook shows Creating address until it is live, turns red with Retry when it fails, and says which agent answers. The Automations and Classic webhook editors set who answers too.
- **Agents can edit connections**, and Settings never saves over a change an agent made.
- **Keys & Secrets** holds the provider keys and your own custom secrets.
- **Dictation & Meetings** holds the engine, the Groq key right under the engine list, the shortcuts, the other side of calls and your words.
- **Orchestrator's voice** replaces the Voice section. The organisation trigger and the MCP section are gone.
- **Worktrees.** Settings, General lists the worktree folders on disk and deletes one on request. An agent that crashes keeps its uncommitted work.
- **Auto compaction** every 40 minutes at 30% of the context window, one bar for every model.
- **The webhook and Slack servers** move to a free port when theirs is taken, and Settings shows the port they are on.

### Sidebar
- **Keep my agent order.** Turn it on and Save, then drag an agent by the handle under its picture, or a project by its name. Off, the sidebar orders itself as before.
- **The new agent row**: name, unread badge, engine, model, status, context, task, live action, and the Asked you, Finished and Crashed lines, with notes and search.
- **The new agent cards in Classic** as well: the strip card and the roster row with status, engine, model, context, ticket, live action and a right click menu.
- **Status words say what they mean**: Needs you when an agent waits on you, Waiting when it waits on another agent. The status dots are readable in both themes.
- **Tooltips open beside the sidebar**, never over the rows below.
- **One update redraws one row**, so a busy floor no longer repaints the whole list.
- **The note button** is a notepad, and the Asked you line reads in plain words.

### IDE
- **Command+I opens the IDE** from any screen.
- **Find and replace.** Command+F on the Mac, Control+F on Windows and Linux, in the open file.
- **Unsaved text is never lost**: it always keeps a tab, the IDE asks before closing, comes back the way you left it, and quitting warns only for windows that are open.

### Fixes
- The terminal takes the width of its pane, and a restarted agent's terminal draws and takes the mouse again.
- Grok stays light in a light app.
- A config whose folder was deleted is no longer offered at launch.
- The hive folder no longer swallows agents' git folders into its database.
- A skill install that fails leaves nothing half done, and two installs at once no longer undo each other.
- Rewriting the saved command keeps its quotes and flags.
- A file share that expires also closes its public link.
- The release page's pictures and fonts load.
- Memory cards no longer clip in Chinese.
- Michael's picture is the logo in the app, the Dock and the installer.
- Every new screen has its Arabic and Chinese words, the sidebar's reorder handle sits on the right in Arabic, and code in the IDE reads left to right in every language.
- **Windows: an agent no longer stops at Claude Code's folder trust dialog.** The trust entry is written under the path spelling Claude Code reads (public #607, [@himeshram](https://github.com/himeshram)).
- **Windows: config.json and the hive's registry and task files are written whole**, temp file then rename, so a crash or a locked file mid write can no longer empty your settings, the roster or the board (public #529 [@UsryAce](https://github.com/UsryAce), #578 [@TTAWDTT](https://github.com/TTAWDTT)).
- **Windows: Antigravity is found** at its own install location, `%LOCALAPPDATA%\agy\bin\agy.exe` (public #592, [@HsienW](https://github.com/HsienW)); the Windows tests run the same on every machine (public #403, [@oleg-ai-dev](https://github.com/oleg-ai-dev)).
- The Mac helpers for dictation, hotkeys and meeting audio ship exactly as the release runner builds them, in the one universal build for Apple Silicon and Intel.

## [0.5.2] - 2026-09-09

**What the founder met on his first day with 0.5.1, and a team that can see who is talking.**

### Added
- **Captures can be aimed at one agent.** A screenshot, a spoken message or a meeting transcript
  went to the orchestrator and nothing said so. The Stapler's own section now carries the choice,
  the list is the agents actually running, and a chosen agent that is no longer running does not
  swallow the capture: it lands on the orchestrator, by the same rule the Slack responder uses.
- **Meetings are searchable and filterable.** A search box over the meeting's name AND the words
  in its transcript, a date range on either side, and a meeting can be renamed, which is what
  makes filtering by name mean anything.
- **Screenshots are deleted 24 hours after they are taken**, at start-up and hourly, whether or
  not the screen is open, and the rule is stated where the captures are. A capture that was SENT
  loses its image on the same clock but keeps its record, because the message that named the file
  outlives the file: our own protocol tells agents to re-read their inbox, so a week-old message
  pointing at nothing would be a hole we manufactured. The message itself now carries the expiry
  from the moment it is written.
- **A meeting's audio is deleted 24 hours after it is transcribed**, on the same sweep and the
  same day as a screenshot, and the transcript and its details are kept for ever. The founder
  asked not to keep the audio at all; the day buys back the one thing deleting it on transcription
  destroys, which is a second chance when the transcription is wrong. THE CLOCK STARTS AT THE
  TRANSCRIPTION, not at the recording: a meeting recorded before a key was on file still
  transcribes the moment a key arrives, and audio that expired while it waited would break that
  promise. So audio that never transcribed is never swept. Audio transcribed by an earlier build
  carries no stamp and is dated by the file itself rather than given a fresh day.
- **Your name on the team.** Enrolment keeps the name that sign in already handed the relay, and a
  new Settings field sets or changes it (`PATCH /me { name }`, contract 3.11). Agents' names ride
  inside the sealed message and are pinned on the receiving machine; the relay never sees them.
- **The receive door on the relay.** The machine publishes its inbound door (the status ANDed with
  every per-person exception) as one flag per seat plus exceptions, and the relay refuses a
  sender whose recipient is closed with `not_receiving` before anything is stored. Contract 0.3 is
  amended for this one field and section 4 lists what the relay now knows.
- **The responder setting.** One control for every inbound channel: which agent takes a Slack
  request or a teammate's message. The orchestrator by default, any active agent otherwise, and
  the orchestrator again when the chosen agent is not running.
- **A loading state at startup**, blurred over the whole window with a count, a skip after three
  seconds and a cap at thirty, both counted from the moment the app is in, in both skins; the
  release drop waits for it.
- **`MD_RESTORE_SLOW_MS`**, a dev-only lever that staggers every spawn so the restore can be
  watched slowly on purpose. Dead in a packaged app, like `MD_NO_GOD`.
- **`MD_DEV_PRO=1`**, a dev-only lever that answers the PRO gate with a synthetic live licence and
  skips the renewal question, so a second instance can be run beside a live office without
  enrolling a test profile on a real org or binding a real key to a throwaway device. Dead in a
  packaged app, like the two above; the gate itself is unchanged.
- **Voice Michael reads an agent's terminal.** `get_agent_terminal`, one agent by id or name, the
  last 25 lines (at most 40) from the terminal the app drew or the pty's own tail. Every line is
  redacted in main and scrubbed of injection lead-ins (`shared/voiceText`, the same rule floor
  deltas go through) before the model sees it.

### Fixed
- **A meeting with no transcription key recorded anyway.** It started, wrote every segment of
  audio to the person's disk, queued a transcriber that found no key and returned, and sat
  "pending" for ever. Nobody asked for that recording and nobody could read it: it was silent
  collection with nothing to show for it. The Stapler now refuses to start a meeting without a
  key, with the same refusal the spoken message has always had, and the ring's button says so
  before it is pressed. `test/puck-main-wiring.test.cjs` runs the refusal and checks the disk.
- **The startup blur, as first wired, never drew.** App's first frame has no config yet, and fed
  as "not onboarded" the gate read "fresh install, nothing to restore" and latched settled for the
  life of the window, so no install saw the blur and the release drop was not held. Its clock also
  ran from page load, so a sign-in or the paywall before the app spent the budget. Found before the
  tag by rendering the real gate through React; the answer is held until the config is known, the
  clock starts when the app is in, and `test/boot-gate-wiring.test.cjs` renders the module rather
  than matching its text. A second fault sat under the first: `useRestoreTeam` set `autoStarted`
  and emitted one call before `restoreTeam()` set `restoring`, `autoRestorePhase()` answered
  `done` on that tick, and the gate's latch kept it, so the blur came down the moment the restore
  fired; and the gate's snapshot was the settled flag alone, so the count re-rendered only when
  something else redrew the shell. The phase now reads running from the claim, the snapshot is
  the whole view, and `test/boot-blur-replay.test.cjs` boots the real store, hooks and overlay on
  the founder's roster shape and watches the blur hold through the batch and count 5 to 1.
- **"Send now" on a queued row answers the click.** The release moves the row to the front and
  lifts the delivery pause, and the drain types it the moment the agent is idle, never mid-turn;
  with the orchestrator mid-turn for half an hour nothing visible happened and the row said nothing.
  The click now toasts when the row goes, the row shows it is next, the button's title says a
  running turn is Steer's job, and `test/pro-052-send-now.test.cjs` renders the real composer and
  clicks the real button. One component serves the agent room and the orchestrator's Terminal tab.
- **The Dock click recreates a closed main window while the puck lives.** `app.on('activate')`
  asked `BrowserWindow.getAllWindows()`, and the puck is one, so the count was never zero again
  once it was up: a person who closed the last window with no agents running had a floating puck,
  no window and Quit as the only exit. It counts `allWindows`, the app's own registry, now.
  Introduced with the puck; found while proving a "vanishing window" report was macOS Spaces.
- **A re-listed request is not new mail.** The bridge keeps `teams/handled.json`, drops re-listed
  ids before opening them, acks each request to the relay on its own frame, and does not announce
  a request that expired before it arrived. A dismissed approval toast stays dismissed.
- **A status chosen by hand holds against the schedule** until the next window instance starts.
- **The PRO sidebar**: 288px wide, a shorter account block, a hidden scrollbar with scrolling kept.
- **An agent's note that the row cut shows in full on hover**, gated on actual truncation.
- **Check again stays on offer beside Restart** once an update is downloaded.
- **The Stapler's microphone notice** stays inside the window and its buttons stack.
- **Voice Michael's memory tool answers.** It handed the model the MemPalace printout cut at 1600
  characters (a banner and one hit, often source code). It now parses the hits, ranks notes ahead
  of code, drops weak ones, and speaks up to six under 2400 characters (`shared/voiceMemory`); the
  CLI is asked for eight results; the text fallback matches the words of a spoken question.
- **A message parked for the orchestrator survives a restart.** The god boot cleared his stale
  roster row with `removeAgent`, which dropped and persisted away his parked queue before the row
  was re-added under the same id, so anything queued for him before quitting was silently gone at
  the next launch. Reproduced against the store; the boot now clears the row and keeps the queue.
- **The orchestrator's PRO composer is the agents' composer.** The god screen's Terminal tab mounted
  its own fork from phase 3 of 0.4.9 (two lines, chips for the queue, no Send now, no edit, no
  Steer, sends absent from the sent log). It mounts `pro/Composer` now; `pro.god.queued`,
  `pro.god.prompt` and `pro.god.sendHint` are gone from the locales. Classic never diverged.

### Changed
- **The Stapler screen's Actions tab leads every row and section with the ring's own button**
  (`puck/glyph`, one path table shared by the puck and the screen; `pro/puck/RingButton` draws the
  `.puck-btn` face inline) and its Transcription section carries the Groq key field. Saving goes
  through `voice/keyEntry.saveGroqKey`, the same `config.groqApiKey` Settings, Voice and the
  microphone cards write and the Stapler's transcriber reads; the already-saved display is
  AiEnginesSettings' check and masked placeholder. No new strings.
- **The Slack "a temp takes it straight away" route folds into the responder setting.** An install
  saved on it reads as the orchestrator. The temps machinery stays in the codebase for a later
  ruling.
- **Capture and Cancel moved from the edge of the screenshot selection to the Stapler**, below the
  disc (above it near the bottom of the screen). The puck sits above the overlay only while a
  capture is up. Enter and Escape still work in the overlay.
- **Voice Michael's persona and confirmation gate.** The persona is the founder's: short, casual,
  one question at most, "I don't know" and stop, the snapshot first, then the terminal tool, then
  memory. A yes is asked only before something destructive (kill, halt, archive, clear context,
  delete a task or a schedule), before words go to an agent (ping, dispatch, steer, a new
  schedule), or before something that spends (hire, `autoMode`, `costCapTokens`,
  `maxConcurrentWorkers`, `maxTurns`). Pause, schedule enable and disable, and the other settings
  apply at once. Ping, dispatch and steer ask now where they did not before.

## [0.5.1] - 2026-09-08

**A small release that makes 0.5.0 count, and makes a delivered message land.**

### Added
- **Agent runs report how long they took and how they ended.** One anonymous event when an agent's
  terminal exits: the engine, a coarse duration bucket (six, from under thirty seconds to over two
  hours) and one of four endings. Never raw milliseconds, never anything the agent printed. Its row
  is in `TELEMETRY.md`, and the count always runs low, because a crash reports nothing.

### Fixed
- **The app reports again.** 0.5.0 was built without its analytics key, so it sent nothing at all.
  0.5.1 is built with the key in place and the anonymous events listed in `TELEMETRY.md` flow again.
  Do Not Track still turns them off.
- **A message sent while the machine is busy submits more reliably.** The Return that submits a
  delivered message now follows the text after 240ms rather than 140ms, from one constant shared by
  the visible terminals and the hidden sessions, so the two cannot drift apart again.

### Changed
- **`period` moved from `checkout_opened` to `licence_activated`.** The app could only ever assert a
  constant at the checkout door, because the browser chooses the period after the handoff. The
  claimed licence knows what it is billed by, so the property now rides there, at the checkout door
  only. `TELEMETRY.md` says the same.

## [0.5.0] - 2026-09-08

**Five releases landed at once.** Everything since 0.4.6 arrives in one update, and the largest
new thing in it is a small creature that floats over your screen.

### Added

- **The Stapler.** A small window that floats above every other app, PRO, and **off until you turn
  it on** under Settings. Click it and a ring of actions opens around it: capture a region of the
  screen, speak a message, record a meeting, or hide it from screen sharing in one click. Computer
  use sits on the ring too, drawn but disabled and marked coming soon, so you can see it arriving.
  Anything it captures goes to your orchestrator with one line from you about what to do with it,
  and you read the transcript or see the shot before it goes.
  Meetings record into a folder of their own and roll to a new file every ten minutes, so a long
  call transcribes as it runs instead of at the end. Transcription uses the Groq key from Voice; with
  no key the audio still records and the transcript waits for one rather than being lost. While
  anything is recording the Stapler turns on content protection and disappears from screen shares and
  recordings by itself.
  Its face is drawn from a word you choose, and the same word always draws the same face: eleven
  shapes, fourteen expressions, any colour including a hex you type, plus size, opacity, always on
  top, snap to edges and a default corner. It blinks and breathes on its own. Faces by
  [Blobatar](https://github.com/blobatar), open source under the MIT licence.
  On macOS the first screenshot asks for Screen Recording permission in System Settings, and the app
  has to be restarted once after you grant it.
- **The paywall hands off to the browser, and the licence comes back on its own.** Buying PRO used
  to end with copying a key out of an email. The paywall now opens the console's checkout in your
  browser, where you are already signed in from the free step so nobody signs in twice, and the app
  sends no identity of its own with it. When the payment finishes the browser returns through a
  `munderdifflin://pro/checkout` link and the machine activates itself.
  The app mints a random state before it opens the browser and checks the returning link against it
  **before the grant is used for anything**. The state is spent on any answer, refusal included, and
  nothing about it is written to disk, so a link from an earlier attempt, a second window, or an app
  that was closed in between is refused rather than half-honoured. Exchanging the grant for the key
  sends the grant and nothing else: no person id, no email, not even the state.
- **Seven new events, and a public table saying exactly what they carry.** 0.5.0 counts how many
  people meet a price and how many finish, which nothing in the app measured before. Every event and
  every value it can take is written out in [`TELEMETRY.md`](TELEMETRY.md).
  It is buckets and fixed words only. No email, no account id, no payment id, no amount, no card
  detail, no licence key or any part of one, and nothing you typed. A seat count is a bucket
  (`1`, `2-5`, `6-20`, `21+`), never a number. Each event has its own allowlist of properties and
  each property a closed list of values, and an event carrying anything outside those lists is
  dropped whole rather than sent with the odd part quietly removed, so a wrong reading cannot reach
  a dashboard looking like a right one. Do Not Track still turns all of it off.
- **28 pull requests from people outside the company**, merged from public `main`: fixes across
  Slack, worktrees, hooks, the terminal and the sandbox.
- **Tasks show their id.** The one thing people actually refer to a card by, `bmt-12`, was not
  displayed anywhere: not on the kanban card, which printed only the title and the assignee, and not
  in the detail view behind it. It now leads the card above the title, and leads the detail view's
  fact row, in mono in the same muted ink as the assignee. Every id shows, including the synthetic
  `t-xxxx` fallbacks a card gets when it arrives without one.
- **Gemini 3.8 Flash in the model pickers.** Antigravity gets it at all three reasoning levels and
  Cursor gets the one build it carries. Both ids were read out of the CLI that will be invoked with
  them (`agy models`, `cursor-agent models`) rather than guessed from a name, which is why they look
  different: Antigravity is spawned with its display label (`Gemini 3.8 Flash (High)`) and Cursor
  with a slug (`gemini-3.8-flash-high`). Google's own `gemini` CLI takes unversioned aliases
  (`auto`, `pro`, `flash`, `flash-lite`) and so needs nothing added.
- **Fable 5.1, GPT-6 Astra, and Gemini 3.7 Flash in the model pickers.** Claude Code gets
  `claude-fable-5-1`, Codex gets `gpt-6-astra`, and Antigravity gets Gemini 3.7 Flash at all three
  reasoning levels; Cursor gets its own build of the two it carries. Every id was read out of the
  CLI that will be invoked with it (`codex-rs/models-manager/models.json`, `agy models`,
  `cursor-agent models`, and the installed `claude` binary) rather than guessed from a name.
  **GPT-6 Astra needs Codex 0.153.1 or newer.** The slug landed in that release, so an older
  `codex` on your machine will reject it when the agent spawns; update Codex first. The catalog's
  version bounds cover the app, not the CLI it launches, so this is a prerequisite rather than
  something the picker can hide for you.
- **A new model no longer needs a release.** The pickers now read
  [`docs/model-catalog.json`](docs/model-catalog.json) on `main`, fetched at runtime and cached for
  six hours, so adding a model is one line in one file on GitHub rather than a build. The check runs
  at startup, not on a timer: an installed copy picks a new model up the next time it launches with
  a cached copy older than six hours, and an app left open does not change under you.
  The catalog compiled into the build stays the floor: it is what renders offline, on first
  launch, and whenever the remote copy is missing, unreadable, or announces a schema this build does
  not know. A provider present in the remote copy replaces that provider's list; a provider it does
  not mention keeps the built-in one, so a bad edit costs a list rather than a picker. The payload is
  data and never markup, and a model id is length-capped and stripped of control characters before it
  can reach a `--model` flag on a spawn command line. Same mechanism as the Settings hero card.

## [0.4.11] - 2026-09-06

Free opens the door, Slack walks in three ways, and the office learns to say temp.

### Added
- **A free tier.** One onboarding for every install with the console sign in inside it; the paid key is asked for only at the paywall, which is drawn in PRO chrome with what PRO gives one person and the next three months. Free opens Classic. A dead PRO key steps down to free instead of a wall.
- **The licence bridge.** A paid key activates on the machine that redeemed it, and a replaced key locks the old machine out.
- **Slack, three ways in.** Polling (the default, every 30 seconds to 5 minutes), Socket Mode with a catch up sweep, or webhooks, one at a time, each saying the laptop must stay on. The orchestrator triages every request by default, or a temp takes each one at once and the orchestrator is told. Temps are briefed with an index of every agent's memory.
- **Default view.** A PRO setting under General picks Classic or PRO as the view the office opens in.
- **Voice keys where you click.** The microphone and Talk open a card with the key box; the hold to talk gesture and the recorder refuse without a key.
- **Restart the orchestrator** from his Configuration tab, with the command shown above the button.
- **The IDE redesigned.** A home tab, one search, three sidebar tabs.
- **Sign out** from the sidebar drop up, which also says who you are and on what plan.

### Changed
- **Temps, not workers,** on every screen and in every prompt. The orchestrator's brief is nine numbered rules; it always learns how to start a temp and what the switch does; every agent learns where its capability catalog is; the Slack protocol has one text per reader.
- **Teams says less.** Four plain words (Off, Listen, Converse, Open) replace the guardrail maze, a spent thread starts fresh, and quit has two doors.
- **The room gets clearer.** Every agent says its engine, a free install's switch reads TRY PRO, the spawn command sits under the provider, and the last onboarding step shows only the orchestrator.
- **A face and a gallery.** The pixel orchestrator is the mark everywhere, avatars draw at whole pixels a step larger, and one avatar list runs four rows deep, with Darrell.
- **The board condenses at 50000 tokens,** not 6000.

### Fixed
- A drop released anywhere lands in the lit composer, one bad file cannot kill the rest, a dropped file with no path is kept by bytes, the memory graph holds still, stop after this step can be taken back, restore team works under PRO, and long ids stay inside their cards.

## [0.4.10] - 2026-09-04

The first round of changes from a team actually using it.

### Added
- **You decide who may reach you, and when.** Three axes instead of one word, and a status you set in one place.
- **Messages between people have a shape.** A subject, a body in Markdown, and a rendering to match.
- **Send someone a file.** It crosses machines as a link that dies in an hour.
- **Every agent has a house style.** One response style brief, editable in Settings, reaching all six engines.
- **Memory search answers in three shapes.** Tickets, agents and notes, as cards, as a list, and on the graph.
- **Working on your own.** PRO opens for a person on their own, and a licence is how they get in.

### Changed
- **Settings is drawn by PRO.** The last screen where PRO opened a Classic page.
- **Long answers stop burying the screen.** A long answer shows its opening and says how much it is hiding.
- **Nothing grows for ever.** Eight stores that grew with no bound are bounded.

## [0.4.9] - 2026-09-03

PRO stops being a shell over Classic. Every screen a person opens under PRO is
drawn by PRO, and the pieces that used to be a Classic dialog behind a PRO
button are gone.

### Added
- **Your orchestrator has a name of its own.** Every machine chooses what its orchestrator is called, and the word has to be one nobody else in the organisation has taken. It is asked for while you join, it can be changed in Settings, and it is the name your teammates see beside yours on every roster and every message. Their agents can write to it by that name, or by yours, instead of an id; a name that matches two people bounces back naming both. Until this version every install called its orchestrator Michael, so a message from Michael on a team of three named nobody.
- **Onboarding is PRO.** Join a team, choose the workspace folder and the engine that will run it, then meet your team, all in the kit. An engine the machine cannot start is refused where you pick it, with the reason, rather than discovered when nothing boots.
- **The Agents screen is a grid you can read.** Every agent is a card with its sprite, what it is doing right now in words, its context and spend, and the ticket it is on. The orchestrator's card is always drawn, from the moment it starts, so a floor that is still booting is never an empty screen.
- **Every agent has a room.** One screen per agent: the conversation on one side, the live terminal on the other, and a details panel with identity, engine, workspace, capabilities and budget. Pause tools, stop after this step, one to one, and archive are buttons there rather than folklore.
- **One door adds or edits an agent.** The agent sheet replaces two Classic modals and is opened by the header, the grid's Add card and the agent's own room.
- **Michael's screen.** Terminal, Messages, Routing, Budget and breaker, Board, and Configuration. The routing log, the spend against the cap with the breaker's thresholds, and the shared board with a composer to propose a change were all unreachable under PRO before.
- **Memory you can browse.** Pinned facts, summaries, recent notes and research deliverables, filtered by kind, each topic showing which agents know it and opening the note it came from.
- **Role bundles.** Eleven of them, Designer through Legal. Pick one for an agent and it gets that role's connectors in one write, with the sheet saying plainly what it does not touch.
- **Sprite editor.** Make your own agent avatars. Pick a skin, face shape, eyes, brows, nose, mouth, one of thirteen hair styles, facial hair, glasses, a wardrobe of twenty garments and their colours, and watch the card and the walking figure update as you go. Save it with a name and it sits beside the fifteen cast members in the character picker, in Add Agent and Edit Agent, in Classic and in PRO, and on the floor. Twenty four generated presets can be used as they are or as a starting point. Avatars live in `config.json`; the cast renders exactly as before, pinned pixel for pixel by a test.
- **Team in Classic.** One Team button in the title bar (⌘⇧T, Ctrl+Shift+T elsewhere) opens the Team window: your teammates on the left with their sprite, presence and the Verified chip, the selected person's thread on the right with what they sent and what came back, and the composer under it. The button carries the count of what arrived since you last read a thread. Esc closes it.
- **PRO titlebar.** Under PRO the title bar is the kit's: the version at the far left (it is the update control, one state machine with Classic), a Simple | Technical switch that is a second door to the onboarding answer Settings already owns, a Connected chip that opens the Team screen, the theme and Settings buttons, and Classic | PRO. The "auto mode" text left the bar. Toasts and dialogs under PRO (an update, a finished voice dispatch, a teammate's request, a key change, the quit warning) are the kit's too and subscribe to the same events Classic's do; the fullscreen terminal is Classic only.
- **Messages you can see move.** When the orchestrator routes a message under PRO, both cards wear the accent ring, a dot travels from the sender's card to the recipient's, and the two sidebar rows glow for the same beat. More than six beats in a second keep the glow and drop the dots; reduced motion gets the glow only.
- **Search the whole workspace from the editor.** A Search pane beside the file tree finds a string across every file in the workspace and lists the hits by file; clicking one opens that file with the match selected. Match case, whole word and regular expressions are toggles, a plain search treats your text literally, and a result that hit its limit says so instead of looking complete.
- **Work on another agent's workspace without leaving the editor.** A switcher in the editor's title bar lists every workspace this window can reach and moves the whole editor to it. It refuses while you have unsaved changes and says why.
- **Make, rename and delete files in the tree.** Right click any row for New file, New folder, Rename, Copy path and Move to Bin, with the name typed on the row itself. Nothing overwrites: a name already in use is refused rather than silently replacing what is there. Delete goes to the operating system's bin, so it can be undone the usual way.

### Changed
- **Settings, Updates, Team and the rest are one screen each now, not two.** The surfaces PRO used to show by embedding a Classic dialog are drawn in the PRO kit for both skins, so what you see under PRO and what you see under Classic can no longer drift apart. Buttons everywhere in them respond to the pointer again, and Version & updates gained a status chip, a real progress bar while a download runs, and the release notes in their own panel.
- **Simple or technical, everywhere.** The reading level you chose during onboarding now decides what every PRO screen shows, not just the wording on a few of them. Ids, paths, raw status names and token counts appear for technical and stay out of the way for everyone else. Settings still owns the answer and the titlebar is a second door to it.
- **Tasks, Ask me and the board stop growing.** Done cards leave the live ledger after two days and untouched ones after three weeks (they show a Stale chip at two), moving to `tasks-archive.json` beside it and staying searchable behind an Archived chip on the Tasks screen. A question that has waited a week says so on its card instead of vanishing. Past about 6k tokens the board's full text is copied to `board-archive.md` and the orchestrator is asked once to condense it, keeping Decisions verbatim. All five thresholds are rows in Settings under Autonomy & Budgets.
- **PRO says what it means.** The words the app used for its own internals, the floor, the hive, spawning, the palace, no longer appear on a PRO screen. Agents are hired, they work in a workspace, and memory is searched.
- **Checking this machine moved to Settings.** Whether the tools an agent needs are installed is machine wide, so it is a Settings section now instead of a tab inside one agent's screen, and the Capabilities screen no longer probes anything to draw itself.
- Every other teams and organisation trace left Classic: the connection chip moved inside the Team window, and Classic Settings keeps one Connections row, the team relay. PRO keeps its own Team screen and chrome.

## [0.4.8] - 2026-09-03

### Changed
- The app requires a seat (founder ruling 3 Sep 2026). A machine with no membership opens on Join a team and nothing else, before and after onboarding; the solo path and the licence sign-in are gone from the first launch. Billing that is not active locks every machine in the organisation behind one screen that names the fix: the admin adds a card in the console.
- The join's browser sign-in is live: `/desktop/signin` on the console mints the grant the app has asked for since 0.4.7, and the relay binds the seat to the person who signed in.

## [0.4.7] - 2026-09-02

### Changed
- The mac download is the one universal DMG, and the manual download link now names it (it used to name a per arch DMG that no release ships).

**PRO is the default way to run the floor.** A sidebar and one screen at a time, built for the
person running thirty agents, with Classic one click away in the title bar.

### Added

- **PRO mode, on by default.** The professional skin was removed and redrawn from scratch as the
  default: a sidebar of Tasks, Inbox, Automations, Memory, Capabilities, Agents, Temps and Team,
  one screen on the right, and a profile drop-up for Profile, Settings and Version & updates. The
  focus button in the title bar became a Classic | PRO switch; a skin you had already chosen still
  wins, and Classic keeps the fullscreen terminal exactly as it was.
- **Agents are their sprites.** Every place PRO shows an agent, from the Agents grid to a task's
  author to a message row, draws the character sprite. No initials anywhere.
- **Inbox reads like a messenger.** Ask me (the human queue), Floor (agent to agent), Outside (Slack
  and webhooks, with a new ledger of every Slack message the app posted or received) and Team direct
  messages, one thread list, newest first. Clicking a teammate on the Team screen opens their thread.
- **Automations is one list.** Schedules, context rules, webhooks and the organisation trigger sit
  in a single table with a drawer that edits each in place, and the approval ledger beside it.
- **Capabilities grants MCP servers per agent.** A server can be on for one agent and off for
  another; the launch path honours the grant, and write and secret tiers still need an explicit yes.
- **Memory is a graph you can search.** Agents, topics and the memories that join them, drawn on a
  canvas that turns slowly (and holds still when your system asks for reduced motion), with search
  across any agent's memory.
- **Temps keeps a history.** Every temporary worker that ends is recorded: what it was asked, how
  long it ran, tokens used, how it ended and whether its worktree was kept, with the path to copy.
- **Team, Profile and Subscription & billing.** The Team screen shows the roster with what each
  clone allows; invites, removals and seat changes open the console page that owns them. Profile
  shows your seat, your machine and its fingerprint, and signs out. Subscription & billing appears
  only for an organisation admin, is refused by the app itself for anyone else, and reads plan,
  seats, card and invoices from the relay with no payment identifier ever on the wire.
- **Keyboard.** ⌘\ folds the sidebar, ⌘. folds the agent config panel, ⌘, opens Settings, and Esc
  closes any sheet or drawer (an Esc inside a text field leaves the field first, so nothing typed
  is lost). The same chords are Ctrl on Windows and Linux.
- **Settings has one door in PRO.** The gear, the ⌘, chord and every "set it now" link land on the
  Settings page, on the tab that holds the field; the Classic modal is never drawn over PRO.

### Changed

- **The design tokens moved to kit v2.** One accent (the amber from the website) on every action
  and important figure, the six pastels for agents and states, and even 1px borders on every card:
  status lives in a chip, never in a thicker edge.
- **Chinese and Arabic cover every PRO string.** Each of the new screens ships translated in
  zh-CN and Arabic, checked key for key against English.

## [0.4.6] — 2026-08-27

**The release that speaks your language and updates itself.** The interface runs in Chinese and
Arabic, the auto-updater downloads and installs a new build end to end, fonts ship inside the app so
a blocked network never leaves you on a blank window, and the way agent engines are launched is
hardened.

### Added

- **The interface speaks Chinese and Arabic.** Every string is translated (nothing falls back to
  English) and the terminals read right to left under Arabic. The physical-direction sweep — padding
  and icons that still mirror the wrong way on some screens — is tracked as the next piece of work.
- **`message_sent` telemetry.** A single anonymous event closes the activation funnel by counting
  the messages a person sends to an agent — a count and nothing else: no text, no length, no content
  of any kind. Counted at the submit, never per keystroke, and suppressed by every existing opt-out.
  [`TELEMETRY.md`](TELEMETRY.md) lists it like every other event.
- **The ASK ME card renders markdown.** Questions arrived with their asterisks and backticks on
  screen, because the card printed the raw text. It now renders the same way the file preview does:
  emphasis, bullets, `code`, tables, and links that open in the browser instead of navigating the
  app. The task detail's Q&A trail renders too, answers included. A single newline is still a line
  break, so a question written as plain text looks exactly as it did before. Raw HTML is still shown
  as text rather than parsed, which is what keeps agent-written markdown safe to display.
- **Agents are told to format what they ask you.** The orchestrator prompt and `PROTOCOL.md` now
  ask for a bold lead line, backticks around paths and commands, and bullets whenever a question has
  more than one option.

### Fixed

- **The auto-updater installs a new build end to end.** The title-bar badge advances from check to
  available to downloading to downloaded on its own, and the action at the end restarts into the new
  version. This is the release that proves that path — a build's own updater is only exercised by the
  next release.
- **Fonts ship inside the app.** The renderer and the release drop no longer fetch Google Fonts at
  launch, so the app opens at the same speed on any network, including one where Google is blocked.
  The release drop can no longer white-screen while a stylesheet loads: its fonts are bundled, its
  content-security policy denies a remote stylesheet outright, and a loader covers the frame until it
  paints.
- **Settings has one Save button.** The Connections tab stops repeating itself; the REST API, MCP,
  Slack and webhook sections each keep their place.
- **IME typing no longer sends early.** Pressing Enter to choose a Chinese or Japanese candidate
  picks the word instead of firing the message with half-typed text.

### Security

- **Engine command launching is hardened.** The name of the CLI an agent launches is validated
  before it is resolved against your PATH, so only a plain command name or an absolute path reaches a
  shell.

### Thanks

16 community pull requests from 13 contributors landed in this release, one of them (#213)
re-implemented rather than merged:

- [#156](https://github.com/chaitanyagiri/munder-difflin/pull/156) [@gpechieu](https://github.com/gpechieu): the roster empty-write guard stays armed after a refused write
- [#205](https://github.com/chaitanyagiri/munder-difflin/pull/205) [@Schopenhauer-loves-Hegel](https://github.com/Schopenhauer-loves-Hegel): the react-i18next multilingual UI foundation, shipping the Chinese translation
- [#213](https://github.com/chaitanyagiri/munder-difflin/pull/213) [@abo123v-glitch](https://github.com/abo123v-glitch): the Arabic/RTL terminal rendering recipe (re-implemented into this release)
- [#225](https://github.com/chaitanyagiri/munder-difflin/pull/225) [@jhinzzz](https://github.com/jhinzzz): Codex hive sessions are visible to usage scanners
- [#242](https://github.com/chaitanyagiri/munder-difflin/pull/242) [@raifemre](https://github.com/raifemre): the localStorage roster fallback is scoped to the hive that wrote it
- [#243](https://github.com/chaitanyagiri/munder-difflin/pull/243) [@L422Y](https://github.com/L422Y): the ASK ME question renders as markdown
- [#248](https://github.com/chaitanyagiri/munder-difflin/pull/248) [@djbiz](https://github.com/djbiz): a floor rebuild that cannot get a WebGL context retries instead of failing
- [#270](https://github.com/chaitanyagiri/munder-difflin/pull/270) [@BUGHUNTER-SACHIN](https://github.com/BUGHUNTER-SACHIN): /compact is not enqueued for an undeliverable agent
- [#271](https://github.com/chaitanyagiri/munder-difflin/pull/271) [@HsienW](https://github.com/HsienW): a typed hook-event payload contract
- [#282](https://github.com/chaitanyagiri/munder-difflin/pull/282) [@savvaskoualis](https://github.com/savvaskoualis): a renamed god identity no longer reverts to "Michael"
- [#284](https://github.com/chaitanyagiri/munder-difflin/pull/284) [@HundredBillion](https://github.com/HundredBillion): the Settings save button moves into the modal footer
- [#286](https://github.com/chaitanyagiri/munder-difflin/pull/286) [@HundredBillion](https://github.com/HundredBillion): every config write is announced so Settings stops going stale
- [#310](https://github.com/chaitanyagiri/munder-difflin/pull/310) [@LavaDMan](https://github.com/LavaDMan): the hive-hook-node test no longer races its own stdin write
- [#317](https://github.com/chaitanyagiri/munder-difflin/pull/317) [@aaroncoville](https://github.com/aaroncoville): usage resets when a PTY exits
- [#323](https://github.com/chaitanyagiri/munder-difflin/pull/323) [@aaroncoville](https://github.com/aaroncoville): the WebGL context is released when a terminal's renderer tears down
- [#339](https://github.com/chaitanyagiri/munder-difflin/pull/339) [@aaroncoville](https://github.com/aaroncoville): the model catalog is brought up to date

## [0.4.5] — 2026-08-22

**The release that fixes the things you trusted and were quietly wrong.** Cost reporting was off
by more than half after a restart, semantic memory never worked on Apple Silicon, and agents
could not talk to each other reliably. All three are fixed, alongside weekday scheduling,
clickable paths in terminal output, one editor instead of two, and 23 community pull requests.

### Added

- **Weekday scheduling for triggers.** A trigger can run at a time of day on chosen weekdays
  rather than only on a fixed interval, and the schedule is DST safe.
- **Every path in terminal output is clickable.** Markdown opens the preview, source and config
  open in the IDE, and images, archives and anything we cannot honestly render are revealed in
  Finder or Explorer instead of being opened. A path token is never handed to the OS "open with
  default app" call, so a printed `installer.dmg` cannot become an execution.
- **Manual updates download on click,** with install steps for the platform you are on. The
  title-bar badge is always the manual path, auto-update stays in Settings, and the badge says
  `latest` once a check confirms you are current.
- **The first run after an update shows that release's page.**
- **A hero card at the top of Settings** with your version, your plan, and a way back to the
  release notes.
- **A 1:1 hold** that tells Michael to leave an agent alone.
- **Editable agent names,** and Michael can choose a worker's avatar and accent when he hires.
- **Gemini CLI and Cursor Agent** join the engine list.
- **Edit an agent from inside focus mode,** next to its name.

### Added

- **`update_applied` telemetry.** The app now reports, once, on the first start after its own
  version changes: `update_applied { from_version, to_version }`. Auto-update health was the one
  thing we had no way to see — a release is delivered in place, and the only evidence we had was
  installs that happened to show events on two versions. `from_version` is `unknown` for an
  install that predates the event, so the first release carrying it is measurable rather than
  silent for a cycle. Both values are version strings; nothing new about you is collected, the
  same opt-outs apply, and [`TELEMETRY.md`](TELEMETRY.md) lists it like every other event.
  A `via` property says whether the app's own updater installed it (`auto`), something else moved
  the version (`manual`), or there was no update log to read (`unknown`) — read from the update
  log the app already keeps, so it works for installs updating from a version released before
  this one. A restart the user asked for that then quietly installed nothing counts as `manual`,
  not `auto`, because the log names which build started next.

### Fixed

- **Cost is reported over the app's lifetime, not since the last restart.** The telemetry counter
  reset on every launch while the session id stayed the same, so the floor under reported spend
  by 59 percent. It is now folded from the ledger, with a separate session figure alongside it.
- **Semantic memory works on Apple Silicon.** CoreML overflowed the quantized embedding graph,
  every vector came back NaN, and chroma rejected every upsert. Embeddings are pinned to CPU
  on macOS.
- **Agent-to-agent messaging is reliable.** A main-process watchdog wakes an idle worker sitting
  on an undrained inbox, stale nudges no longer fire at an inbox that has since been drained,
  mail to an id with no inbox is bounced and logged rather than dropped, the per-agent steer
  queue is capped, webhook dispatch is atomic, and `PROTOCOL.md` refreshes on boot.
- **Restart to update no longer sticks** when a running agent makes the app refuse to quit.
- **Focus mode survives a restart,** the close button no longer drops you to the sidebar, and the
  focused terminal refits when the roster changes.
- **Terminals follow the window theme.** Running TUIs are told when the theme flips, OSC colour
  queries are answered, and Crush and OpenCode are handed the theme at spawn.
- **A partial ANSI escape carries across pty chunks** instead of printing as garbage.
- **Windows agent processes quit when the app does.**
- **Buttons in a squeezed row no longer paint over their neighbours,** and the sidebar header
  drops its button labels before it drops the agent's name.

### Changed

- **One editor.** The fullscreen file overlay is gone. Markdown, source and images all open in
  the IDE, whose git rail is now collapsed by default and carries a git mark.
- **The renderer runs inside Chromium's sandbox.**

### Thanks

All 23 of these community pull requests landed in this release:

- [#157](https://github.com/chaitanyagiri/munder-difflin/pull/157) [@gpechieu](https://github.com/gpechieu): inherited Claude Code session markers are stripped from an agent's PTY env
- [#158](https://github.com/chaitanyagiri/munder-difflin/pull/158) [@gpechieu](https://github.com/gpechieu): semantic memory works on Apple Silicon again: embeddings are pinned to CPU on macOS
- [#159](https://github.com/chaitanyagiri/munder-difflin/pull/159) [@gpechieu](https://github.com/gpechieu): reliable spawn, teardown and floor cards for the workers Michael hires
- [#165](https://github.com/chaitanyagiri/munder-difflin/pull/165) [@rajpreetcodes](https://github.com/rajpreetcodes): a `~` in the harness home folder resolves, so setup cannot die on ENOENT
- [#171](https://github.com/chaitanyagiri/munder-difflin/pull/171) [@KrushanPatel](https://github.com/KrushanPatel): CONTRIBUTING.md matches the platforms the app actually supports
- [#175](https://github.com/chaitanyagiri/munder-difflin/pull/175) [@rekcilyssup](https://github.com/rekcilyssup): a main-process watchdog wakes an idle worker sitting on an undrained inbox
- [#176](https://github.com/chaitanyagiri/munder-difflin/pull/176) [@FenjuFu](https://github.com/FenjuFu): Gemini CLI joins the engine list
- [#177](https://github.com/chaitanyagiri/munder-difflin/pull/177) [@TTAWDTT](https://github.com/TTAWDTT): each agent's live context-window occupancy shows in the roster
- [#178](https://github.com/chaitanyagiri/munder-difflin/pull/178) [@gpechieu](https://github.com/gpechieu): a god-hired worker gets a floor card, and it archives when the worker dies
- [#179](https://github.com/chaitanyagiri/munder-difflin/pull/179) [@kdahal7](https://github.com/kdahal7): `statAbs` expands `~`, so a path resolves the same way on every platform
- [#181](https://github.com/chaitanyagiri/munder-difflin/pull/181) [@TTAWDTT](https://github.com/TTAWDTT): webhook dispatch goes through an atomic add, so a stale ledger cannot overwrite it
- [#184](https://github.com/chaitanyagiri/munder-difflin/pull/184) [@TTAWDTT](https://github.com/TTAWDTT): the per-agent steer queue is capped, which bounds memory on a stalled agent
- [#185](https://github.com/chaitanyagiri/munder-difflin/pull/185) [@hyperstream-pro](https://github.com/hyperstream-pro): mail to an id with no inbox is bounced and logged instead of dropped
- [#186](https://github.com/chaitanyagiri/munder-difflin/pull/186) [@BUGHUNTER-SACHIN](https://github.com/BUGHUNTER-SACHIN): tests cover the Notifications and Stop idle-detection branches
- [#187](https://github.com/chaitanyagiri/munder-difflin/pull/187) [@hyperstream-pro](https://github.com/hyperstream-pro): a stale inbox nudge no longer wakes an agent against an inbox that is already empty
- [#190](https://github.com/chaitanyagiri/munder-difflin/pull/190) [@swarnendu19](https://github.com/swarnendu19): agent names can be edited after spin-up
- [#199](https://github.com/chaitanyagiri/munder-difflin/pull/199) [@amey-op](https://github.com/amey-op): the Antigravity queue no longer wedges for 30 seconds
- [#203](https://github.com/chaitanyagiri/munder-difflin/pull/203) [@lifelmy](https://github.com/lifelmy): the Crush config env points at the agent's own directory
- [#210](https://github.com/chaitanyagiri/munder-difflin/pull/210) [@chaitanyagiri](https://github.com/chaitanyagiri): the art licence claims are true again, Modern Interiors is bought
- [#214](https://github.com/chaitanyagiri/munder-difflin/pull/214) [@pontusm](https://github.com/pontusm): Windows agent processes quit when the app does
- [#219](https://github.com/chaitanyagiri/munder-difflin/pull/219) [@chaitanyagiri](https://github.com/chaitanyagiri): engine availability is checked before Michael's engine is committed
- [#226](https://github.com/chaitanyagiri/munder-difflin/pull/226) [@chaitanyagiri](https://github.com/chaitanyagiri): the floor reports lifetime spend, not spend since the last app restart
- [#227](https://github.com/chaitanyagiri/munder-difflin/pull/227) [@scy73](https://github.com/scy73): the renderer runs inside Chromium's sandbox

## [0.4.4] — 2026-08-18

**Windows agents can finally talk to each other** — and the first run stops silently failing.
Two bugs made the core product not work on the platform that accounts for roughly half of all
downloads, and a third meant a brand-new install never started the services that carry messages
between agents. Alongside them: a rebuilt dark mode, a Skills browser, a Prerequisites page, and
release notes that can carry their own designed page.

### Fixed

- **Agent-to-agent messaging on Windows.** The hive protocol reaches an agent as a multi-line
  command-line argument. A `.cmd` cannot go to `CreateProcess`, so any non-`.exe` target ran via
  `cmd.exe /d /s /c "…"`, and cmd.exe cuts an argument at its first newline — taking the block
  that names `inbox/` and `outbox/` with it. Agents booted, rendered, looked healthy, and had no
  idea they could message anyone. Prompt-carrying spawns now decode the npm shim and launch its
  real interpreter with an argv array; anything undecodable falls back to the previous behaviour.
- **Windows OpenCode specifically.** `opencode-ai`'s bin is a compiled binary, so npm writes an
  interpreter-less shim that the first fix did not model — it returned null for every Windows
  OpenCode install and fell back to the truncating path. Direct-executable shims are now handled,
  and the previously silent fallback logs the target it could not decode.
- **A fresh install never started its hive services.** `bootstrapHiveServices()` early-returns
  while `harnessHome` is null, which is exactly the state a first run boots in; onboarding then
  set the home without re-bootstrapping. The message router, hook server, telemetry collector and
  mission scheduler stayed dead for the whole session — mail never moved and agents never
  reported. Now bootstrapped on the `null → set` transition.
- **The setup wizard could not be finished.** `~/HarnessAgents` persisted with a literal `~` and
  died on `ENOENT: mkdir`; the folder field also never pre-filled, because it read
  `window.process.env.HOME`, which is always undefined under `contextIsolation`. An empty folder
  now fails at step one instead of after step four, and the panel no longer overflows a short
  screen.
- **"Restart & Continue" had nothing to resume.** The live session id is now recorded from a
  second source, so continuing works even when a hook never lands.
- **Dark mode was unreadable in a specific way.** `ink-300` measured 1.73–2.09:1 against every
  surface, and it is the structural token — 187 uses, 93 as 1px borders — so every control's edge
  was invisible and the UI read as flat grey. Now 3.4–4.0:1, on a softer ground with warm
  off-white text. The selected Command Center tab measured 1.55–1.87:1 (near-white on a light
  accent); a new `--cth-on-accent` token takes it to 7.0–8.5:1.
- **OpenCode ran a model you might not own.** It preselected a BYOK slug and silently fell back
  when the key was absent, while every surface kept reporting the model it had asked for.
- Terminal copy strips the CLI's quote rail and agent terminals run in UTF-8; dictation pastes
  what was just said; task-ledger mutations are atomic; a frozen context reading no longer
  re-fires `/compact` hourly; one odd message id no longer silences an agent's wake nudge; the
  cost ledger stays out of the hive's git history; a root cwd no longer resolves to the projects
  directory; the office floor stops rendering when nobody is looking at it.
- Agent selection is visible on every card including Michael's — it used to be drawn in each
  agent's own accent and was invisible on the one card that was always framed.

### Added

- **Skills** — installed skills across Claude Code, OpenCode and Codex with scope precedence,
  plus a browsable catalog of 227 with search, category and publisher filters, install and
  uninstall. Installs are bounded and containment-checked; uninstall refuses anything that is not
  a `SKILL.md` folder inside a managed root.
- **Prerequisites** (Settings) — live status for uv, git, Node, MemPalace and every agent engine,
  with real paths, platform-correct install commands, and a button that asks Michael to fill the
  gaps.
- **Release drops** — a release body can carry an authored HTML page, rendered in a sandboxed
  iframe (`sandbox=""` + `default-src 'none'`) as a centered modal.
- **Settings hero card** — version, plan, sponsor and a way to reopen the release notes, with its
  contents fetched from `docs/hero.json` so they can change without a build.
- IDE image preview (PNG/SVG/markdown embeds), agent-named title, real shortcut hints.
- The update notification says what changed, and asks for a star at most once ever.
- Grok 4.6 in the model picker.
- Dictation setup guidance behind an info mark on the voice button, including that Groq is free.
- `pause` and `halt` explain what they do on hover.
- Fullscreen gained `open` (terminal at the agent's cwd) and `✕` (end + archive), and its roster
  cards now show model, project and a context gauge.

### Changed

- One card size for every agent; Michael is distinguished by surface, not by a heavier border.
- Command Center tabs wrap when docked and scroll in fullscreen; the `commands` tab was removed.
- Prerequisites moved out of the Command Center into Settings — it is machine-wide state, not
  something about the agent whose terminal you are reading.

### Thanks

Community fixes in this release: [@gts-47](https://github.com/gts-47) (#129, #130,
#131, #132, #133, #134, #143, #144) and [@baziyer](https://github.com/baziyer) (#142).

## [0.4.3] — 2026-08-13

**A new brand mark: Michael's portrait replaces the "MD" tile.**
The logo is now the character the product is about, drawn in the app's own pixel art on the brand
yellow. It is authored as pure vector (`docs/logo.svg`) and every raster is generated from that
one source by `tools/make-logo.cjs`, so the site, the app and all three platform icons can no
longer drift apart. Appearance only — no functional change.

### Changed
- **Logo replaced everywhere** — `build/icon.{svg,png,ico,icns}`, `docs/logo.svg`,
  `docs/logo.png`, `docs/logo-light.png`, the site header and favicon, the in-app toolbar and
  window icon, and the README header.
- **App icons are natively multi-resolution** — `.icns` spans 16→1024 with the macOS drop shadow;
  `.ico` carries 16/32/48/64/128/256. Previously both were built around a single 1024px raster.
- **Site CTA buttons are brighter by default.** `.btn.primary` drew its fill from `--accent`,
  which also colours accent *text* and so must stay dark enough to read on a white page — the
  light theme's `#E5A00D` made the download button read brown. Fills now use dedicated
  `--accent-fill` / `--accent-fill-hover` tokens, starting at the old hover colour.
- **The Product Hunt thumbnail** (`docs/media/ph-thumbnail-240.gif`) sits on the brand yellow
  instead of a pale tint, matching the new mark.

### Added
- `tools/make-logo.cjs` — generates the SVG plus every PNG, the `.ico` and the `.icns` from the
  sprite in `src/renderer/src/scene/office/portraitArt.ts`. No external image tooling.
- `docs/favicon-32.png` and `docs/apple-touch-icon.png` — native-size icons, so browsers stop
  downsampling a 512px portrait.

### Fixed
- `docs/llms.txt` advertised 0.4.1 two releases after the fact. `tools/check-release-links.cjs`
  now checks it, so it cannot silently drift again.
- README version badge and status note had been stuck at 0.4.0 since two releases ago.

## [0.4.2] — 2026-08-13

**Anonymous usage stats — documented, opt-out, and off in forks.**
The project previously had zero insight into whether anyone launches the app or which features
get used. This release adds a minimal, anonymous product-analytics layer (PostHog), governed by
a public contract: [TELEMETRY.md](TELEMETRY.md) lists every event and property, and the code
enforces that list as a hard allowlist.

### Added
- **Anonymous usage events** (`src/main/analytics.ts`): `first_run`, `app_launched`,
  `agent_spawned` (engine name only), `feature_used` (fixed enum, once per session), and
  `session_ended` (coarse duration bucket). Common properties are app version, OS, and CPU
  arch — nothing else. No prompts, transcripts, file paths, repo names, or identifiers of any
  kind; events are PostHog *anonymous events* (`$process_person_profile: false`), keyed by a
  random install UUID that lives in the app's user-data dir.
- **Consent surfaces**: a "Share anonymous usage stats" toggle on the final onboarding step and
  in Settings → General (`telemetryEnabled`, default on = opt-out). The standard `DO_NOT_TRACK`
  env var is respected unconditionally.
- **[TELEMETRY.md](TELEMETRY.md)** — the complete public contract, linked from the README.

### Note
The PostHog key is injected only in release CI (`POSTHOG_KEY` secret). **Building from source or
forking the repo produces a build with no key, and the entire analytics module is a no-op** — a
fork never sends events anywhere.

## [0.4.1] — 2026-08-13

**The app says what the site says.**
munderdiffl.in describes Munder Difflin as a clone of you that works around the clock; the app
still called it a "GOD agent." This release closes that gap. Wording only — no behaviour changes.

### Changed
- **Michael is your clone.** Onboarding refers to him as your clone throughout, and his card on
  the floor now carries a **BOSS** tag instead of **GOD** — he's the boss of the agents, you're
  still the boss of him.
- **Onboarding leads with the product, not the feature list.** The first screen opens on "a clone
  of you, working 24/7"; step 2 is "your clone's engine."
- **The engine card names all ten engines.** It had advertised three (Claude Code, Antigravity,
  Codex) since before seven more shipped — Grok, Kimi, Qwen, OpenCode, Crush, pi and Copilot are
  now named too.
- **Site copy fixes.** A misspelled "requrired" in the hero, `cli` → `CLI`, a pricing FAQ that
  named plans ("Basic"/"Pro") the pricing table doesn't sell, and an interactive demo card that
  claimed a clone ran on Cursor — which is not one of the supported engines.
- **README back in sync.** It listed nine engines (Qwen was missing in four places) and still
  reported v0.3.8.

### Note
The `god` agent id, the hive folder layout, and message routing are **unchanged**. Existing hives,
memory, and running agents carry over as-is; there is nothing to migrate.

## [0.4.0] — 2026-08-12

**The brand grew up — and the landing page with it.**
Munder Difflin now looks like one product everywhere: a yellow "MD" mark, matching app icons on
every platform, and a rebuilt munderdiffl.in that shows the real app instead of describing it.

### Added
- **Real app screenshots on the landing page.** The Add Agent dialog, the memory panel, and
  Settings → Autonomy & Budgets — captured from the actual app, not mockups.
- **A live demo video in the hero.** The old static home-screen shot is now a looping screen
  recording of the office floor with a live agent terminal.
- **Clone-to-clone chat and encrypted-wire visuals** with request-a-demo contact points for the
  Teams features.

### Changed
- **New app icon.** The dock/taskbar icon is now the yellow "MD" tile on every platform
  (macOS .icns with proper margins and shadow, Windows .ico, Linux .png), matching the in-app
  logo and the site favicon.
- **Landing page defaults to bright (light) mode.** Dark stays one click away and remembered.
- **Landing accent is yellow again** — bright amber in light mode, gold in dark — applied across
  buttons, diagrams, the Pokédex-style floor sim, and the pricing cards.
- **Pricing reframed around the two services** — Private Cloud (a dedicated sandbox VM per clone)
  and Private Network (E2E-encrypted clone-to-clone wire) — with a team-size slider.
- **Social previews refreshed.** New Open Graph card and copy that match the current product.

## [0.3.9] — 2026-08-11

**Ask the app whether it's up to date.**
Settings → General now names the running version, says whether it is the latest, and offers one
button that states what it does. Shipped now because 0.3.8 needs to reach people who already
installed it.

### Added
- **Check for updates, in Settings.** A block at the top of **Settings → General** that always
  answers "am I on the latest?": the version you're on, whether a newer one exists, and a single
  button — **Check for updates** → **Download v0.4.0** → **Restart to update** — plus the verbatim
  error when a check fails. It shares the status stream, the reducer and the state machine with the
  toolbar chip, so the two can never disagree about what is installed; only the wording differs,
  because a chip that must stay quiet when everything is fine is no use to someone who opened
  Settings to ask.

### Changed
- **Fullscreen roster avatars are larger.** They were rendered at 1× — an 18-pixel figure — and the
  tile width was free to grow past that, so a wider roster just padded the same small sprite.
  Portrait size now moves in half-sprite steps and the art is drawn at the tile's width.

### Removed
- **The usage-limit hold, entirely.** Shipped in the first v0.3.8 tag; it did not release. Agents
  held behind a limit stayed held — the stated reset never arrived, and the manual **resume now**
  button returned them to the held state instead of draining their queue. Delivery behaves as it
  did in 0.3.7. `rateLimit.ts`, `limitGate.ts`, `useLimitWatch.ts`, the banner, the Settings
  section, the config keys and their IPC are all gone, along with the compaction gate that had been
  layered on top of them.

## [0.3.8] — 2026-08-11

**Memory condensation works for the first time.**
The harness had been reading Claude Code transcripts from a directory that has not existed for
months, so the summarizer never had anything to summarize — and nothing errored, because an absent
directory reads as "no transcripts yet". That is the headline fix. Behind it, a run of things that
had been quietly costing tokens or hiding in plain sight: compaction firing on two schedules at
once, a commit history that rendered no commit messages, and buttons whose labels were invisible in
dark mode.

### Added
- **Triggers hub.** Schedules, inbound webhooks, context rules and peer messaging now share one
  home in Settings, with a history of what fired and what it did.
- **Collapsible panels.** The IDE's git rail folds away to give the file tree its height back, and
  the fullscreen roster folds for a full-width terminal. Both remember the choice.
- **The OpenAI key can be set where voice is explained.** Settings → Voice now carries the field
  itself, names the model it pays for (`gpt-realtime-2.1`), and the disabled Talk button links
  straight to it.

### Fixed
- **Claude Code transcripts were read from a directory that has not existed for months.**
  `projectDir()` built the pre-2026 project key — leading slash dropped — while Claude Code dashes
  every non-alphanumeric character. Nothing errored, because every caller reads an absent directory
  as "no transcripts yet", so memory condensation had never once succeeded: a long run of
  `condense-abort`s and zero successes, each failed attempt still writing a full backup first. The
  offline usage reconciler and cross-cwd session-resume read and wrote the same wrong path. Found
  and diagnosed by [@gts-47](https://github.com/gts-47).
- **Compaction ran on two schedules at once.** The hourly ops standup carried an `autoCompact`
  flag that the context trigger was supposed to have replaced, so a default install requested
  compaction on both cadences — and turning the trigger off left the standup compacting anyway.
  There is now one control, and its off-switch is honest.
- **Duplicate `/compact` messages piled up in the queue** and fired together, each answering
  "nothing to compact" after the first had done the work. One pending compaction per agent is now
  enforced in the message store, where no caller can route around it.
- **The commit history is legible.** It rendered through a library that positions rows at a fixed
  64px regardless of the spacing it draws the graph at (rows overlapped), reserves 500px for the
  graph regardless of available width (text was squeezed into the remainder and wrapped), and
  never displayed the commit subject at all. It is now drawn directly and fits any panel width.
- **Disabled buttons were unreadable, and icons vanished on dark buttons.** Disabled fills swapped
  to a mid surface while the label kept its inverted colour — roughly 1.4:1 in dark mode. Icons
  were painted in the same token as a primary button's fill, so the arrow on **Send** was
  invisible whenever it was enabled.
- **Two scrollers that never scrolled** — the IDE's changed-file list and the per-commit file list.
  `overflow: auto` inside a capped column sizes to its content without `flex: 1`, so it overflowed
  the cap rather than reaching its own scroll threshold.
- **Codex hooks stopped timing out after 1s.** Codex reads `timeout` as seconds and normalises it
  with `.max(1)`, so the `timeout: 0` sentinel copied from Claude's config meant *one second*, not
  "no timeout" — every Codex worker logged a failed SessionStart hook.
- **Every download link on the release page 404'd.** They carried a version-pinned filename that
  stopped resolving four releases ago; mac downloads fell from ~118 to single digits. The release
  gate now refuses to ship links that don't resolve.
- **A tooltip clipped by the agent dock**, and the missing-key notice that overflowed the agent
  card.

### Changed
- Scheduled auto-compact is held while any provider is rate-limited: `/compact` is a model call,
  and sending it into a capped CLI spends a rejected attempt *and* parks a `/compact` ahead of
  your real backlog.

## [0.3.7] — 2026-08-08

**Auto-update, fixed.**
It never ran. Not once, in any packaged build, since it shipped in v0.3.4 — and the app had no
way to tell you so.

### Fixed
- **The native updater actually runs.** `electron-updater` is CommonJS and exposes `autoUpdater`
  through a lazy `Object.defineProperty` getter, which Node's `cjs-module-lexer` cannot see. So
  `await import('electron-updater')` produced a namespace with no `autoUpdater` export — only
  `.default.autoUpdater` — and destructuring it yielded `undefined`. The first line of setup threw
  `TypeError: Cannot set properties of undefined (setting 'autoDownload')` into a `catch` that
  silently latched notify-only mode for the whole session. Every packaged build from v0.3.4 to
  v0.3.6 could therefore only ever offer "open the releases page". Invisible in development,
  because the whole path sits behind `app.isPackaged`.
- **Updater failures are no longer swallowed.** Every error is emitted to the renderer *and*
  appended to `updater.log` in the app's data folder. The old `catch` discarded the message, which
  is precisely why the bug above survived three releases.
- **A single blip no longer disables updates for the session.** The notify-only downgrade is
  per-check now, not a permanent latch, and a re-check can never clobber an already-staged update.

### Added
- **The toolbar version is an update control.** Next to the logo it shows `checking…`,
  `vX.Y.Z ready to install` (click to download), live download progress, and **restart to update**
  (click to apply). With nothing pending, a click runs a manual check — the app previously only
  checked 30 seconds after launch and then every six hours, with no way to ask.
- **`update-available` and `download-progress` are surfaced**, so a multi-minute download is
  visible instead of looking like nothing happened. New `update:download` and `update:current` IPC:
  one-click download, and a reloaded window pulls the current state instead of waiting for the next
  tick.
- **9 tests** over the update state model (`src/shared/updateState.ts`), covering the rule that bit
  here — a re-check must never wipe a staged "restart to update" — and that the underlying error
  reaches the UI.

### Changed
- **Website, README and release notes trimmed.** The landing page drops the demo-video section and
  dark mode; the README's 48-row feature table becomes a scannable grouped list; `RELEASE.md` leads
  with the current release instead of stacking every prior one in full.

> **Upgrading from v0.3.5 or v0.3.6?** Those builds carry the broken updater and cannot fetch this
> fix themselves — install v0.3.7 manually once. From v0.3.7 onward, updates arrive on their own.

## [0.3.6] — 2026-08-08

**A machine with nothing installed on it can now run agents.**
Every fix in this release is about the same failure: the app assumed the user's machine
already had things on it — a shell to expand `~`, a `node` on PATH, an npm to install
with — and when it didn't, agents died with a bare exit code and no explanation. Plus a
long-standing office bug where the floor went blank and never came back.

### Fixed
- **`~/dev/foo` no longer fails with "cwd does not exist".** Only a shell expands `~`;
  Node treats it as a literal directory, so a typed `~/…` path failed every existence
  check and the agent never spawned. `~` is now expanded once at ingestion, so the
  registry only ever stores an absolute cwd — which also repairs existing `~` entries
  that had been reading as "not absolute" forever.
- **Hooks stopped silently dying with exit 127.** Agent CLIs run hooks through `sh -c`
  with a bare `PATH=/usr/bin:/bin:/usr/sbin:/sbin` — nvm's node isn't there, so every
  hook payload was lost: no live status, no Stop→inbox drain, no session ids. Every hook
  shim now runs under the Node the app already bundles.
- **`node` is on every agent's PATH.** An MCP server declared as `node ./server.js`, a
  provider CLI that shells out, a `.cjs` an agent wrote itself — all died with 127 on a
  machine with no system node. The bundled runtime is now *appended* to the agent's PATH,
  never prepended, so anyone with their own node keeps their own version.
- **The office floor comes back after losing its GPU context.** Chromium caps live WebGL
  contexts and silently evicts the oldest — always the office, since it starts first,
  once enough agent terminals are open. Pixi reported nothing, so the floor simply went
  blank until you restarted the app. It now detects the loss and rebuilds the scene.
- **God no longer messages agents that no longer exist.** A live roster of the floor is
  pushed into the orchestrator's context on session start and on every prompt, instead of
  relying on it to re-read `fleet.json` — which is why it went stale across restarts.

### Added
- **Node and npm install themselves when they're missing.** Selecting an engine on a
  machine with no Node used to print `npm install -g …` and run it anyway, so the user
  watched `npm: command not found` scroll past. The app now fetches the latest Node LTS
  straight from nodejs.org, verifies it against the official `SHASUMS256.txt` before
  anything executes, installs it visibly in that agent's terminal, and then installs the
  CLI. If you already have Node 20 or newer, it is left completely alone.
- **An honest dead end instead of a doomed command.** When no installer can succeed, the
  banner names the missing piece and runs nothing at all.

## [0.3.5] — 2026-08-06

**The queue always has an escape hatch, and the app updates itself for the first time.**
A fast-follow to 0.3.4: one real workflow fix, a sidebar polish pass, and the first
release your installed app can pick up on its own — 0.3.4 installs get the
"v0.3.5 downloaded — Restart to update" toast instead of a trip to the website.

### Fixed
- **Queued messages are never stuck again.** Pausing floor-wide auto-delivery (the
  Command Center switch) used to hold every queued message with no explanation and no
  manual override. Each queued row now grows a **send now** link while the floor is
  paused: it moves that message to the front and bypasses *only* the pause gate —
  idle/draft/picker safety and delivery acknowledgement all still apply, so it types in
  the moment the terminal is genuinely free ("sending when free…" until then). The
  composer also says why nothing is moving: "held — delivery paused floor-wide", with
  the full story (and where to resume) on hover.

### Changed
- **Compact Command Center header.** At sidebar width the old header wrapped its
  display-font title onto three lines, stacked "runs the floor" word-per-line, and let
  the two wide toolbar buttons crush everything else. Now: single-line **COMMAND
  CENTER** title + "Michael runs the floor" subtitle (both ellipsize), and the floor
  delivery toggle compressed to ▶ `auto` / ⏸ `paused` with the full explanation in its
  tooltip. The queue header's "clear all" no longer wraps either.

### Notes
- **First auto-updated release.** 0.3.4 introduced the updater; 0.3.5 is the first
  version it delivers. Running 0.3.4 apps download this in the background and prompt
  "Restart to update" (never restarting on their own). 0.3.3 and older have no updater —
  grab this one from [munderdiffl.in](https://munderdiffl.in) and you're on the train.

## [0.3.4] — 2026-08-06

**The queue you can trust, a Michael who actually knows the floor, and an IDE that shows
you everything.** A community release: the headline terminal/queue/roster reliability wave
is by [@gts-47](https://github.com/gts-47) (Vyapak Goyal), with major fixes by
[@qschmick](https://github.com/qschmick) ([#110](https://github.com/chaitanyagiri/munder-difflin/pull/110),
[#111](https://github.com/chaitanyagiri/munder-difflin/pull/111),
[#112](https://github.com/chaitanyagiri/munder-difflin/pull/112),
[#114](https://github.com/chaitanyagiri/munder-difflin/pull/114)). Plus four new
first-party features — **voice Michael with live floor context + full app control**,
**markdown previews** (IDE and ⌘-click in any terminal), **git history / branch compare /
safe checkout** in the IDE, and a **redesigned six-tab Settings** — alongside **xAI Grok
and Kimi Code as first-class engines**, **auto-update from GitHub releases**, a
**professional type + color recalibration with full-app dark mode**, and a **scheduled
auto-compact switch (default off)**.

### Added (v0.3.4 feature wave)
- **Talk mode grows up: live context + full control.** Michael's voice session now opens
  with a compact per-agent floor snapshot (status, engine, context fill, breaker, inbox,
  in-flight tasks) and receives silent "(Floor update: …)" notes as things change mid-call
  — most "what's happening" questions need zero look-ups. New read tools: `get_floor_state`
  (precise live-floor JSON) and `get_app_info` (app version + release notes — "what's new
  in this version?" finally has an answer). New voice verbs behind the same safety spine:
  **resume** (the missing undo for pause/halt), auto-delivery pause/resume, tool gating,
  delete task, archive/unarchive, **clear an agent's context** (queued through every
  delivery gate; allowed on god behind confirm), **create schedules**, and **change
  settings** from a strict main-side allowlist (secrets and dangerous keys refused
  outright; behavior-changing keys echo old→new and require the distinct confirm word).
  Model bumped to gpt-realtime-2.1.
- **Markdown previews everywhere agents write them.** Markdown files in the IDE get a
  **code | split | preview** switch with live re-render as you type; **⌘-click any `.md`
  path an agent prints in its terminal** to open a rendered preview instantly (edit toggle
  + "open in IDE" escalation included). Rendering is safe by construction for untrusted
  agent output — no raw-HTML pipeline exists, links never navigate the app, and remote
  images stay blocked.
- **Git time-machine in the IDE.** The left rail becomes **CHANGES · HISTORY · COMPARE**:
  a clickable commit graph (topologically ordered, all worktree branches, paginated) where
  picking a commit lists its files and opens per-file Monaco diffs; branch compare with
  ahead/behind counts and PR-style or literal modes; and **guarded checkout** — jump to
  any commit or branch, refused automatically when the tree is dirty or an agent is
  actively working in it. The slim git status panel also returns as a per-agent sidebar tab.
- **Settings, redesigned into six tabs** — General · Agents & Models · Autonomy & Budgets ·
  Connections · Voice · Memory & Knowledge. The default agent model, autonomy mode,
  keep-Mac-awake, explain-things-simply, and the full circuit breaker (hard-stop included)
  all get real controls for the first time; dead display-only rows are gone; Danger Zone
  became a red row in General. Plus config truth fixes: Knowledge Graph genuinely defaults
  off, and the Free Flow toggle no longer shows OFF while the feature is on.

### Added
- **Auto-update.** Packaged builds check GitHub releases on boot and every ~6 hours, download the new
  version in the background, and show a small "restart to update" toast — installation is always your
  click; the app never restarts on its own. Installs that can't self-update (the Windows portable exe)
  get a notify-only toast linking the release page. Settings → General → **Auto-update** turns the
  whole thing off. (Auto-update starts working for users **on 0.3.4+**; 0.3.3 and earlier have no
  updater — grab this release from the site once more.)
- **xAI Grok, a first-class agent engine** (`grok`) — worker *and* orchestrator-eligible. Grok's
  lifecycle events are Claude-compatible but camelCase on the wire; an AGENT_ID-scoped hook adapter
  (`installGrokHooks`) normalizes them into the hive's contract, so live status, guarded inbox
  delivery, and operator gates all work. `grok [PROMPT]` takes the protocol positionally and
  `--resume` continues a session. *(gts-47)*
- **Kimi Code engine** (`kimi`) — spawn Kimi workers with `--auto` autonomy and the K3/K2.7 model
  aliases. No hook bridge yet, so routed mail bounces to the god rather than silently dropping. *(gts-47)*
- **Scheduled auto-compact switch — default OFF.** The dedicated compact-maintenance schedule (v0.3.2)
  now ships disabled: scheduled `/compact` is opt-in. Flip it in Settings → General → **Scheduled
  auto-compact** or the Schedules tab (which keeps its interval picker and its warning when off).
  Existing installs keep whatever state they already chose. Scheduled compaction is now also
  **provider-aware** — each engine gets its own compact command instead of Claude's only. *(founder decision + gts-47)*
- **Fullscreen agent roster rail.** The horizontal tab bar ran out of room past a handful of agents and hid the operator controls; it's replaced by a left rail — `+ agent` pinned at the top, god agents ungrouped above everything, workers bucketed under repository headers, restore-team and its dismiss chips pinned at the bottom. An isolated agent's cwd is its own git worktree, so a new `mainRepoRoot` helper follows a linked worktree back to its main checkout (cached per cwd) and groups key on the absolute repo root, so two checkouts with the same name stay separate. Notes render on the row (one line per bullet) instead of behind a hover popover, the note editor becomes a textarea so Enter makes a new bullet instead of dropping every bullet but the first, pause/halt/steer come back in fullscreen, god agents render the full Command Center, and drag-to-reorder carries over (confined to an agent's own repository group). The destructive kill button is gone.
- **`typing` badge — see why a queue is held.** A message queue held by your own unsent text on an agent's prompt used to look identical to an idle agent with nothing to do. Agent cards and the fullscreen roster now show a **"your draft"** badge whenever you have unsubmitted text on that agent's prompt. It's derived at render from the same check the delivery gate uses, so the badge can never disagree with the reason nothing is being delivered.
- **[`docs/message-queue.md`](./docs/message-queue.md)** — the delivery contract: who may type into an agent's terminal, when, and what automation is never allowed to do to your text.
- **Remote Control sessions are named after the agent** ([#81](https://github.com/chaitanyagiri/munder-difflin/pull/81)). claude.ai / the mobile app now shows "Michael", "Jim", … instead of `<hostname>-<random>`, so a floor full of RC sessions is finally tellable-apart. *(gts-47)*
- **Roster shared between dev and a packaged build.** The roster (agents + notes + queues + selection) mirrors to a file beside the hive (`src/main/roster.ts`), so the dev build and the installed app see the same team; localStorage remains the per-origin fallback. Restore-team also runs **in parallel**, fires **on open**, and each restorable agent gets its own ✕ dismiss. *(gts-47)*
- **Fable 5 + Sonnet 5** in the Claude model picker (Fable 5 is the new default model). The two "default" entries — the harness's configured default vs the CLI's own — are now labeled distinctly in every picker, and every Claude option names a real model. *(gts-47)*
- **New test suites** — queue delivery, terminal automation + recovery, roster persistence, provider config/automation, codex remote, agent env, and PID release (`npm run test:focused` + `test/proc-kill.test.cjs`). *(gts-47, qschmick)*

### Changed
- **One gate for every automatic writer.** The queue kept breaking because two loops each decided for themselves when it was safe to type into a terminal. The inbox-wake nudge now enqueues like scheduled `/compact` already did, so a single drain loop owns every "is this terminal free?" decision — idle, off cooldown, past boot grace, delivery not paused, no user draft in the way.
- **Automation never destroys or closes what you own.** A draft block lasts half an hour rather than a minute, a picker block half an hour rather than three minutes, and when either expires delivery simply types *after* whatever is on the line (the two fuse into one prompt). Wiping the line first, and sending Escape at an open picker, are both gone — deleting text is worse than garbling one prompt, and we can't verify that Escape closed anything. Both keys remain on the composer's own button, where you asked for them.
- **Terminal zoom scales the whole pane.** Cmd +/- moved out of `PtyTerminalView` into a shared subscribable module, so it now scales the message composer and the roster along with the terminal instead of leaving them pinned at sizes tuned for a 14" display.
- **Changing an agent's model within the same provider resumes its session** instead of starting fresh (best-effort — an agent with no recorded session still gets its model changed). The Command Center picker is now **cross-provider** (switch an agent between engines from one dropdown).
- **Codex resume actually resumes.** Codex has no `--resume` flag — it resumes via the `codex resume` subcommand — and its rollout transcript + sqlite index live together in a per-agent `CODEX_HOME`. Respawns now use the subcommand, and resuming by a pasted session id points `CODEX_HOME` at the agent home whose state DB actually indexes that session (a stray rollout copy without an index can't be opened). Codex workers also get **Codex Remote**: the app-server daemon is started under the agent's isolated home so the thread shows up in ChatGPT mobile. *(gts-47)*
- **Restore team runs in parallel** and the login-shell capture is memoised, so rebuilding a roster no longer serialises one shell probe per agent. Agents are added in roster order rather than completion order.

### Fixed
- **Blank terminal pane where typing does nothing.** Three causes, which is why every single-cause fix only half-worked. (a) WebGL is now a lease taken on attach and released on detach — a browser allows only ~16 live contexts and silently discards the oldest past that cap, so restoring a team blew the cap and Chromium killed a background terminal's renderer while its pty, buffer and subscription stayed healthy. (b) `requestInitialPtyRedraw` latches only once the redraw actually succeeds, instead of burning the terminal's one chance on a failed fire-and-forget IPC. (c) The needs-repaint marker is cleared only after the refresh returns, so a throw no longer discards the last record that the terminal needed repainting.
- **Message queue silently stopped delivering to an agent.** (a) Only a *bare* command opens a picker — `/model` prompts you to choose, `/model sonnet` applies the argument and returns to the prompt; first-token matching latched the block on both and the submitting Enter couldn't clear it. (b) The picker block now expires like the draft block does, so a picker closed in a way we can't observe no longer wedges the queue for the rest of the session. (c) `lineBuf` moved onto the pool entry and is reset everywhere `inputDirty` is — as a closure variable it survived a draft clear, so the next keystroke recomputed the block from text that had just been deleted.
- **Phantom drafts blocked delivery against text that didn't exist.** `inputDirty` is inferred by counting keystrokes, and a TUI that swallows keys for its own UI leaves it set while the prompt is visibly empty. The prompt is now read from xterm's rendered buffer (cursor row, prompt chrome stripped) — deliberately one-directional: the screen can only *clear* a phantom draft, never invent one, because being wrong the other way would type over something you really wrote.
- **A queued message could be typed into an open picker and acked as delivered.** Clearing the input line no longer clears the picker latch — Ctrl-U kills the input line, it does not close a menu — so automation is no longer told the prompt is free while a picker still owns it.
- **A model or command change died on reload.** `updateAgent` now persists when a durable field changes (volatile run-state fields — status, action, progress, context counters — still skip the write, so a burst of terminal output doesn't rewrite storage).
- **The roster stopped spawning `git rev-parse` on every chunk of terminal output** — failed and in-flight repo lookups are cached, so an agent outside a repo is looked up once.
- **Killed processes actually die** ([#110](https://github.com/chaitanyagiri/munder-difflin/pull/110)). Every explicit kill was a bare node-pty `proc.kill()` — one SIGHUP to the direct child only, so a TUI that traps SIGHUP lived on and its children (MCP servers, helper daemons) reparented to PID 1 and kept running for the machine's uptime. Every kill path now routes through `ensureKilled`: a grace signal, then SIGKILL of the whole process group (POSIX) / `taskkill /T /F` (Windows). *(qschmick)*
- **Circuit-breaker false-positive storm on idle/compacting agents** ([#109](https://github.com/chaitanyagiri/munder-difflin/issues/109) → [#112](https://github.com/chaitanyagiri/munder-difflin/pull/112)). Compaction and inbox-ack token bursts no longer read as looping. *(qschmick)*
- **Shell-capture fencing.** The interactive login shell used for PATH/`which` capture runs the user's rc files, which are free to print (zsh's "Restored session: …" plugin chatter was being prepended to every agent's PATH). Capture output is now fenced between markers, with a multi-line sanity check before a PATH is trusted. *(gts-47)*
- **Fullscreen surfaces notes and modals** (they stacked under the overlay); **an un-echoed keystroke no longer reads as an empty prompt**; **expired automation blocks are acted on** instead of typed through. *(gts-47)*

### Performance
- **~350× faster warm usage reads** — an incremental per-file transcript cache replaces re-reading every transcript on each poll ([#111](https://github.com/chaitanyagiri/munder-difflin/pull/111)). *(qschmick)*
- **Spawns stopped freezing the app.** Command resolution is memoized (with on-disk revalidation) and the login-shell PATH is captured once per session — each interactive-shell launch cost ~1s of blocked main thread, paid twice per spawn, ×N on a team restore ([#114](https://github.com/chaitanyagiri/munder-difflin/pull/114) + gts-47's equivalent, merged). *(qschmick + gts-47)*

## [0.3.3] — 2026-07-03

**An IDE on the floor, and a seventh engine.** Two headliners: a **built-in Monaco IDE** — the
VS Code editor engine in a full-window overlay, with a git CHANGES rail, side-by-side diffs vs
HEAD, a file tree, editor tabs, and Cmd/Ctrl+S save — and **GitHub Copilot CLI** as a first-class
agent engine, the project's **first community-contributed provider**
([PR #101](https://github.com/chaitanyagiri/munder-difflin/pull/101) by
[@anxkhn](https://github.com/anxkhn)).

### Added
- **Built-in Monaco IDE panel.** A title-bar **IDE** button toggles a full-window IDE overlay
  (matching the existing fullscreen-overlay pattern — the office floor, terminals, and voice UX are
  untouched). Left rail: a **git CHANGES list** (click a file → read-only **side-by-side diff vs
  HEAD**) plus the reused workspace **file tree** (click → edit). Right: **editor tabs** with
  dirty-state dots, save, and close; **Cmd/Ctrl+S** saves the active tab. The workspace root
  snapshots from the selected/god/first agent cwd. Monaco is **fully self-hosted** —
  electron-vite-safe bootstrap with bundled `?worker` imports and `loader.config({ monaco })`, no
  CDN — themed to the harness's light palette, and **all fs/git access goes through main-process
  IPC** (`git:diff` + preload bridge; the renderer holds no fs/git access)
  (`src/renderer/src/ide/*`, `src/main/git.ts`).
- **GitHub Copilot CLI agent engine** (`copilot`, npm `@github/copilot`) — community-contributed.
  Registered as a provider preset driven in Copilot's documented non-interactive **print mode**:
  `copilot -p "<prompt>" -s --allow-all-tools --no-ask-user [--model <id>]`, with the auto-approval
  flags **gated by the floor auto-mode toggle** like every other engine. Includes a
  **`COPILOT_MODELS` picker** (Claude Sonnet 4.5 default · GPT-5.4 · auto), `--resume` session
  continuity (best-effort), voice-hire (`spawn`) support, binary inference for pasted commands, and
  the official `npm install -g @github/copilot` offered by the missing-CLI installer. Non-hiveAware
  by design: print mode exits per turn and exposes no hook bridge, so `canReceiveInbox` is `false`
  and routed mail bounces to the GOD orchestrator instead of silently dropping
  (`src/shared/agentProvider.ts`, PR #101 — thanks [@anxkhn](https://github.com/anxkhn)).
- **Agent-provider registry test.** A self-contained, framework-free test
  (`node test/agent-provider.test.cjs`) transpiles the shared registry and asserts provider
  selection, the copilot command shape, model/resume passthrough, and codex non-regression.

### Fixed
- **IDE: no silent loss of edits typed during an in-flight save.** Keystrokes entered while a save
  was still writing can no longer be dropped when the save completes.

## [0.3.2] — 2026-06-27

**Talk to Michael.** The headline is **Realtime Michael** — a low-latency **voice channel to the
GOD orchestrator**, running alongside the async terminal floor. Press **Talk**, and Michael listens,
answers, and *acts* in real time: he reads the hive (tasks, board, memory, agents, activity) and —
behind spoken **echo-back confirmation** for anything destructive — creates and assigns work,
dispatches agents, spawns and kills workers, and steers the floor, all attributed to a distinct
**michael-voice** actor that pings the GOD terminal. He greets you on connect, **speaks task
completions the moment they land** ("respond when done"), and runs under a live cost meter with a
hard spend cap and an idle auto-disconnect. It's **bring-your-own OpenAI key**: the key is decrypted
**main-only**, minted into short-lived ephemeral session tokens, and never reaches the renderer. Plus
**Slack hardening** (proactive posting off by default; no sends without an explicit thread), a
dedicated **auto-compact** maintenance schedule decoupled from missions, and **per-agent environment
metadata**.

> **Live verification note.** The realtime voice loop is **human-verified end-to-end** on a real
> OpenAI key — connect → mic → Michael answers via the read tools, and the full destructive action
> path (spoken echo-back confirm → spawn / kill / dispatch → the worker appears on the floor →
> completion spoken back) was exercised live. It requires **your own OpenAI key with Realtime API
> access**; without one the **Talk** button stays visibly disabled with a "needs OpenAI key" cue.

### Added
- **Realtime Michael — talk to the GOD orchestrator by voice.** A new low-latency realtime channel
  (OpenAI Realtime API over WebRTC) sits next to the async terminal. A **Talk** toggle (on Michael's
  card and in any fullscreen terminal) opens a mic session with EC/NS/AGC, semantic-VAD turn-taking +
  barge-in, and a device picker for both microphone and speaker. Michael runs his own persona and
  answers in a natural voice, with an `Off → Connecting → Listening → Responding → Working` state
  machine surfaced live on his card (`src/renderer/src/realtime/*`, `src/main/realtime.ts`,
  `RealtimeMichaelToggle.tsx`).
- **BYOK ephemeral-token mint.** The voice session authenticates with a **short-lived ephemeral
  client secret** minted main-side from your stored OpenAI key — the real key is decrypted main-only
  and never crosses IPC. The renderer's CSP allows the WebRTC SDP exchange to reach `api.openai.com`
  while keeping everything else locked down (`src/main/realtime.ts`, renderer `index.html` CSP).
- **Voice action set with tiered echo-back confirmation.** Michael can *do* things by voice — read
  tools (tasks / board / memory / agents / activity / cost) plus the full action set: create and
  assign tasks, dispatch agents, pause / steer / halt, spawn / hire, kill, and edit schedules. Every
  **destructive** verb is gated behind a spoken **echo-back confirmation** (a distinct confirm token,
  never a bare "yes"), with hard refusals for killing the GOD agent or targeting all agents at once
  (`src/renderer/src/realtime/actions.ts`, `src/main/realtimeActions.ts`).
- **"Respond when done" completion loop.** Voice-dispatched work reports back on its own: a
  main-process completion watcher detects when a dispatched task finishes (card → done or a done
  reply in the inbox) and **proactively pushes the event into the live session so Michael speaks it
  unprompted**, while a `CompletionToast` shows it on screen. If the session is closed, completions
  queue to a desktop notification and a "completions since last session" warm-start; a `wait_for`
  tool covers the block-until-done case (`src/main/realtimeCompletionWatcher.ts`,
  `CompletionToast.tsx`).
- **michael-voice as a distinct actor.** Actions taken by voice are attributed to a separate
  **michael-voice** identity in messages, the board, and the activity log, and notify the GOD PTY —
  so a voice-driven dispatch is auditable and never silently impersonates a worker.
- **Cost guard + idle auto-disconnect for voice sessions.** A live session cost HUD by the Talk
  toggle, a configurable **spend cap** that auto-disconnects when hit, and a configurable **idle
  auto-disconnect** (default 3 min, 30 s–10 min or Off) so a forgotten-open mic can't run up a bill
  (`src/renderer/src/realtime/cost*`, **Settings → AI Engines**).
- **Greeting on connect.** When a session goes live, Michael opens with a warm, rotating greeting
  ("Hi, what's up?", "Hey, how's it going?", …) instead of waiting in silence — best-effort and
  guarded so a not-yet-ready data channel never blocks a successful connect.
- **Conversational read-layer.** The voice read tools were reworked to actually answer hive
  questions: `get_memory` no longer dead-ends, and new agent/board tools plus an expanded persona let
  Michael talk through roster, tasks, and floor state naturally.
- **Voice read-layer over hive messages (read/brief-only).** Realtime Michael can now read message
  *content*, not just metadata: a `get_messages` tool returns a **full message by id, one mailbox, or
  the latest across the floor** to brief the operator. **All redaction is main-side** —
  `voiceMessages()` runs every `subject`/`body` through `redactSecrets()` before the result leaves
  the main process, so the renderer/voice layer only ever receives already-redacted bodies (no
  provider / Slack / GitHub / AWS / Google key, JWT, PEM private-key block, or `Bearer` token can
  leak) and holds **zero** redaction policy. Read-only: it adds no write/mutate path — voice writes
  still go through the separate confirm-gated action spine (`src/main/hive.ts` `voiceMessages` +
  `redactSecrets`, `src/renderer/src/realtime/{tools.ts,VOICE-MESSAGE-ACCESS.md}`,
  `test/voice-messages.test.cjs`).
- **Talk reachable from any fullscreen terminal.** The Talk toggle is no longer Michael-only chrome —
  it's reachable in any fullscreen terminal view (the toggle is global/session state, so it's correct
  everywhere), while the per-session cost HUD stays Michael-only (`FullscreenTerminal.tsx`).
- **OpenAI Realtime key — documented and gated.** **Settings → AI Engines** now documents the
  **OpenAI Realtime key** as its own requirement (the same OpenAI provider key, distinct from your
  Anthropic key; main mints a short-lived token from it per session). The Talk button shows a live
  enabled/disabled status and an inline **"needs OpenAI key"** cue when none is set, so connecting
  never lands on a silently-dead button (`RealtimeMichaelToggle.tsx`, `SettingsModal.tsx`,
  `AiEnginesSettings.tsx`).
- **Dedicated auto-compact maintenance schedule.** Auto-compaction is now a **persistent,
  configurable maintenance mission** of its own, decoupled from the standup mission it used to ride
  on (so editing standups can't silently drop it). It reappears disabled rather than vanishing, with
  a mandatory warning and a configurable interval in the **Schedules** tab, plus a migration
  (`src/main/schedules*`, `SchedulesTab`).
- **Per-agent environment metadata + cwd guard.** Each agent now carries queryable environment
  metadata with a working-directory validity guard, and a new agent-env query tool (`src/main/hive.ts`).

### Changed
- **"Voice" is now "Talk".** The voice feature is renamed **Talk** throughout, with a redesigned
  navigation: the GOD card pops with a dedicated **Talk** line, and the worker nav cards are
  compacted to make room (`src/renderer/src/components/*`).
- **Robust voice task-matching (findCard).** Resolving a task by voice is now tolerant of
  hyphens/punctuation, phrasing, and truncation: both the spoken phrase and the stored title are
  normalized, candidates are **scored** (exact / prefix / token-coverage / substring), and close
  matches trigger a spoken **"which one?"** disambiguation instead of silently mutating the wrong card
  (`src/main/realtimeActions.ts`, `test/realtime-findcard.test.cjs`).

### Fixed
- **Fullscreen agent modal now opens above the fullscreen view.** The Add-Agent modal launched from
  the in-fullscreen "+ agent" button rendered *behind* the fullscreen terminal (z-index 100 vs 250)
  and was non-interactive. It's lifted to the dialog tier (300) so it's on top and clickable, and the
  fullscreen Esc handler now closes the modal first instead of exiting fullscreen underneath it
  (`AddAgentModal.tsx`, `FullscreenTerminal.tsx`).
- **Voice `get_memory` no longer dead-ends.** The conversational read tools were fixed so memory
  lookups return usable answers instead of stalling the turn.

### Security
- **BYOK voice secret invariant.** The real OpenAI key is encrypted at rest and decrypted
  **main-only**; the renderer only ever sees a **short-lived ephemeral client secret** minted per
  session. The key never crosses IPC and is never logged. The voice read-layer reports **tokens, not
  dollars** (de-monetized chrome), and every destructive voice action is held behind spoken echo-back
  confirmation with hard refusals for killing the GOD agent or targeting all agents at once.
- **Slack: proactive posting off by default + explicit-thread guard.** App/voice Slack sends are now
  **off by default** behind a config flag + Settings toggle, and a request with no explicit
  channel+thread is **refused** rather than guessed — closing an unattended-broadcast path
  (`src/main/slack.ts`, Settings).

## [0.3.1] — 2026-06-22

Three more coding CLIs join the floor — **OpenCode**, **Crush**, and **pi.dev** — each usable as a
worker *and* as Michael, with **bring-your-own keys + local LLMs**. Plus two reliability fixes: the
sleep-frozen message router and Codex workers' filesystem permissions.

> **Live verification note.** The three engines are wired end-to-end and selectable as god, and
> their architecture (preset + bridge + payload contract) was reviewed line-by-line. Their bridges'
> *runtime* behavior needs real model calls, so the following are **on-device checks pending BYOK
> keys / a local LLM** (not runtime-proven here):
> 1. each bridge's **turn-end signal** actually fires — OpenCode `session.idle`, pi `agent_end`,
>    Crush's proxy-synthesized `Stop` — flipping the agent to *idle*;
> 2. **OpenCode local-LLM** happy path: pick `local/<id>` with a base-URL set and confirm a turn
>    completes (the injected config now registers the *selected* model id);
> 3. **Crush** routes through the proxy on an OpenAI-wire model (the default god is now
>    `openai/gpt-4o`) and Crush honors the partial `base_url` override;
> 4. the **auto-mode gate** holds (no `permission:allow` / `--yolo` when the floor toggle is off).
>
> Crucially, mail delivery does **not** depend on those signals: a new **provider-agnostic
> PTY-quiescence idle fallback** flips any silent-but-pinned-`working` agent to idle, so the
> provider-agnostic idle inbox-wake nudge drains a god even if a bridge's turn-end signal never
> fires. That backstop is the safety net under shipping all three as `canReceiveInbox:true`.

### Added
- **Three new selectable engines: OpenCode · Crush · pi.dev.** Each lands as a declarative
  `AgentProviderPreset` and appears automatically in the Add-Agent picker (worker) and the god
  engine picker (orchestrator). Each gets a **bridge** for live status + turn-end inbox-drain:

  | Engine | Identity | Bridge | Notes |
  |---|---|---|---|
  | **OpenCode** | `opencode` (anomalyco/opencode, TS) | **native plugin** (`session.idle`) | bundled per-agent plugin; no traffic interception; auto-approve via gated `OPENCODE_CONFIG_CONTENT` |
  | **Crush** | `crush` (charmbracelet, Go) | **proxy** (qwen-tier) | per-agent `CRUSH_GLOBAL_CONFIG` routes traffic through the loopback sidecar (Crush has no base-URL env) |
  | **pi.dev** | `pi` (earendil-works) | **hooks** (bundled extension) | `pi.on(event)` → HIVE_SOCK; extension auto-approves tools only when the floor is in auto mode |

- **BYOK + local-LLM config UI (Settings → AI Engines).** A new per-provider config surface: API
  keys for the backend model-providers (Anthropic / OpenAI / Google / OpenRouter / Groq) stored
  **write-only** in the encrypted secret broker (never read back to the renderer; materialized
  main-only at spawn), plus per-engine **local base-URL** + default-model fields
  (`HarnessConfig.providerBaseUrls` / `providerDefaultModels`). Pi/OpenCode/Crush/Qwen pick up the
  keys + endpoints at spawn; auto-mode stays gated behind the floor toggle, and each engine runs
  unsandboxed in auto mode (surfaced as a caveat).
- **Provider-agnostic idle backstop (PTY-quiescence fallback).** A floor-wide check flips any agent
  pinned `working` with no terminal output for a short window back to *idle* — so the idle
  inbox-wake nudge can always drain a non-Claude god even if its bridge's turn-end signal (Stop /
  `session.idle` / `agent_end`) never fires. This is the safety net under shipping all three engines
  as god-eligible (`canReceiveInbox:true`) while their bridges await on-device verification
  (`src/renderer/src/hooks/useHive.ts`).

### Fixed
- **Codex hive workers get full filesystem + auto-approval from spawn (parity with Claude).** A Codex-engine agent in auto mode launched with `-a never -s workspace-write`, whose sandbox scopes writes to the PTY cwd (the user's project). But a hive worker must also write to its agent folder at `<harnessHome>/hive/agents/<id>/` (move `inbox/` → `.done/`, append `memory.md`, drop outbox JSON, write deliverables) — a **different path tree from cwd**, which `workspace-write` blocked. So a freshly spawned Codex worker couldn't complete HIVE PROTOCOL housekeeping and reported "it does not have permissions … grant write permission to the agent folder." Codex's auto-mode flag is now `--dangerously-bypass-approvals-and-sandbox` — the documented equivalent of Claude's `bypassPermissions` / Antigravity's `--dangerously-skip-permissions` (skip all approval prompts **and** drop the OS sandbox), so a Codex worker has the same filesystem access and auto-approval as a Claude worker from the get-go (`src/shared/agentProvider.ts`; reference/copy updated in `src/shared/codexCommands.ts`, `OnboardingWizard.tsx`, `renderer/store/config.ts`). Claude/agy/antigravity behavior is unchanged.
- **Re-arm the hive message router on wake (god→worker delivery survives sleep).** The outbox→inbox router is a `setInterval` (`hive.routeOnce` every ~1.5s) that, like the always-on beats, freezes during true macOS system sleep. `onSystemResume()` already re-armed the mission scheduler, the fleet/breaker beats, and keep-awake on `powerMonitor` `resume`/`unlock-screen` — but it never re-armed the router. So after a long sleep (e.g. laptop closed overnight) the scheduler→god path recovered while **every agent's outbox silently stopped draining**: god→worker, worker↔worker, and broadcast mail piled up undelivered, and no `message` event was logged. The resume handler now re-arms the router (clear-then-set, idempotent) **and** immediately drains the accumulated backlog instead of waiting for the first post-wake tick; the renderer's idle inbox-wake nudge then wakes each parked recipient once its mail lands (`src/main/index.ts`). Verified by `scripts/verify-keepalive-catchup.mjs` (now also reproduces the pre-fix backlog stall and proves the re-arm + flush).
- **Open-source model quick-picks + local-setup guides in Add-Agent.** Hiring a worker on a local-capable CLI engine (OpenCode/Crush/pi.dev) now shows curated **OSS-model quick-picks** — a **Local** bucket (Mac-runnable Ollama tags: gpt-oss 20B/120B, Qwen3 30B-A3B/Coder, DeepSeek-R1 32B, Mistral Small, GLM-4.7-Flash, Llama 3.3 70B) and a **third-party OSS provider** bucket (BYOK: gpt-oss/Llama via Groq, DeepSeek-V4-Flash, GLM-4.6, Kimi K2.6, Qwen3-Coder via OpenRouter). Picking one fills the engine-correct slug (OpenCode `local/<tag>`, Crush/pi `ollama/<tag>`; provider slugs identical across engines) and rebuilds the command. Slugs are transcribed from a verified catalog — bleeding-edge frontier models are intentionally left out of code defaults. The Add-Agent help line and **Settings → AI Engines** local-setup area now hyperlink two how-to guides (run on open models · set up on a Mac Mini) (`src/shared/ossModels.ts`, `AddAgentModal.tsx`, `AiEnginesSettings.tsx`).
- **Crush no longer dies with `Unknown command` on spawn (the hive protocol now reaches it).** A Crush worker was launched as `crush --model <m> --yolo "You are …(the whole hive protocol)"` — the protocol passed as a positional arg. But bare `crush` is an interactive Bubble Tea TUI on a Cobra root command, which reads the first positional as a **subcommand**, so it aborted with `unknown command "You are…"`; the protocol never reached the model, the worker never learned it was a hive agent, and the PTY died. Crush has no `--prompt` flag and `crush run` is one-shot, so the protocol is now **typed into the TUI** instead: a new preset capability `seedDelivery:'type-into-tui'` makes the spawn drop the positional (`crush [--model m] [--yolo]`) and hand the protocol back as a `seedPrompt`, which the renderer types in as the worker's first turn after a boot-grace — through the **same per-pty write-chain as the inbox-wake nudge**, so the seed and a nudge can never jam onto one line. Covers fresh Crush spawns, restores, and Crush-as-Michael (`src/shared/agentProvider.ts`, `src/main/hive.ts`, `src/main/index.ts`, `src/preload/index.ts`, `src/renderer/src/hooks/useHive.ts`, `AddAgentModal.tsx`, `AgentStrip.tsx`, `store.ts`).
- **Auto restart-and-continue after a first-time engine-CLI install (no dead-end).** When an agent's engine binary (OpenCode/Crush/pi.dev/Codex/…) wasn't installed, the missing-CLI short-circuit ran the provider's installer in the PTY, then printed *"click restart & continue to launch the agent"* — but no such button exists for a not-yet-started agent, so the PTY just sat at `process exited (code 0)` and the agent dead-ended. Now, on a **clean install exit**, the PTY-exit handler auto restart-and-continues: it re-runs the *same* spawn into the *same* pty/window (carrying a `noAutoInstall` flag) so the freshly-installed CLI launches with no user click, and the renderer re-arms that terminal in place (clears the "process exited" line, re-enables input) via a new `pty:relaunch` signal. Provider-agnostic (every engine's installer path) and idempotent by construction — `noAutoInstall` guarantees the installer can never fire twice, and providers with no bundled installer (manual-hint-only) are never armed for relaunch. The install banner copy is now honest ("Installed — launching the agent…") (`src/main/index.ts`, `src/main/pty.ts`, `src/preload/index.ts`, `src/renderer/src/components/terminalPool.ts`).

## [0.3.0] — 2026-06-21

A platform release: the floor stops being Claude-shaped. **Selectable agent engines** make
every hire — and Michael himself — a pluggable engine (Claude Code / Antigravity / Codex /
local providers), each with its own **per-hire skills + MCP catalog** behind a consent UI. A
new **integrations registry + loopback secret broker** turns "connect a service" into a
write-only, registry-driven Settings flow. Michael can now **spawn an ephemeral worker straight
from Slack** — reply, then tear it down safely with worktree GC and token caps — surfaced in a
new **Workers tab**. Plus **temporal date-range skills** and a **worker capability catalog**, a
**Provider / Hive picker** in onboarding and add-agent, the **Agent Gallery** (the rebranded
Hiring Fair) with **six off-the-shelf hires**, feature-aware onboarding, and wake-reliability
hardening. Everything from v0.2.8 and earlier is included.

### Added
- **Selectable agent engines + per-hire capabilities.** A new engine abstraction (`agentProvider` + an `mcpCatalog`, mirrored across a 3-file config) makes the runtime behind each agent *pluggable* — Claude Code, Antigravity, Codex, or a **local provider** (a claw/qwen backend proxy bridge with default-MCP merge). Each hire carries its own **manifest** of allowed skills + MCP servers (a default-deny allowlist over the catalog), with **bundled skills** shipped via Electron `extraResources` (`resources/skills` → `<resources>/skills`) and a **consent UI** that surfaces every skill/MCP a hire wants before it can use it — untrusted hire input is reviewed, never auto-granted.
- **Swappable Michael (god) engine.** The orchestrator is no longer hard-wired to one CLI: `useHive` gains an engine-spawn path, Onboarding gains an **engine picker** for Michael, and a **change-engine flow** lets you re-home the god orchestrator onto a different engine without rebuilding the floor.
- **Integrations registry + loopback secret broker.** A declarative **integrations registry** (`src/shared/integrations.ts`) plus a **loopback secret broker** (`src/main/integrationBroker.ts`): secrets are **write-only** (set once, never read back into the renderer) and reached only through the broker over loopback. A **registry-driven Settings UI** (`IntegrationsRegistry`) renders each integration's config form from the spec — conformed to registry spec v1 — and a first wave of **declarative templates** (the canonical schema + initial YC-style templates) ships in the registry. The `integrations:*` surface is exposed to the renderer through a dedicated preload bridge.
- **God-triggered ephemeral Slack worker loop.** Michael can now **spawn an isolated worker directly in response to a Slack request** — the worker does the work, posts its reply back into the thread, and is then **torn down safely**. Lifecycle hardening adds **worktree garbage collection**, **token-cap wiring** per spawned worker, and a **teardown-safety gate** that refuses to auto-discard a worker's *unintegrated* work. The `pty:spawn` IPC handler was refactored into a reusable `spawnAgentCore` that underpins worker spawning, and a new **Workers tab** surfaces live ephemeral workers in the UI.
- **Temporal date-range skills + worker capability catalog.** A family of date-range skills (`today` / `yesterday` / `thisWeek` / `lastWeek` / `thisMonth` / `thisQuarter` / `thisYear` / `lastMonth` / `lastQuarter` / `lastYear` / `last7Days` / `last30Days` … plus an arbitrary-range `temporal` resolver backed by `temporal/when.mjs`) resolve a named window to concrete ISO dates without hand-math. A **worker capability catalog** lets each spawned worker read exactly which skills and brokered integrations it has and how to call them.
- **Provider / Hive picker UI.** A new `HivePicker` component plus a `ProviderLogo` set (real provider logos) appear in **onboarding** and the **add-agent** flow, so choosing the engine/provider for a hire is a first-class, visual step instead of a free-text command.
- **Agent Gallery + six off-the-shelf hires.** The community gallery is rebranded from *The Hiring Fair* to the **Agent Gallery**, and ships **six ready-made, off-the-shelf hires** you can browse, review, and spawn.
- **Feature-aware onboarding + a permissions & reliability step.** First-run onboarding now adapts to the features you have available and adds an explicit permissions & reliability step.
- **Visible engine-CLI installer.** When the engine binary for a chosen provider is missing, the installer now runs **visibly** instead of failing silently, so a first-time setup self-heals.

### Changed
- **The Hiring Fair → Agent Gallery.** The gallery is renamed throughout (landing page, in-app links, copy) to *Agent Gallery*; existing hire links and the `/hires/` path continue to work.
- **Add-Agent config IA rework + Command Center UX fixes.** The Add-Agent modal's configuration is reorganized around the new engine/capability model, with assorted Command Center UX cleanups.
- **VDE prototype (experimental).** An experimental Virtual Desktop Environment prototype lands behind the scenes, with a Groq chat-completion module (`src/main/groq.ts`) powering its AI assist.

### Fixed
- **Orchestrator delegates opportunistically to existing agents.** Michael now checks the live roster (active agents in `registry.json` + their state in `fleet.json`) before spawning, and prefers routing a task to an existing agent that already fits — above all when the request names one ("ask Pam…", "have Jim…") — instead of reflexively creating a new agent; he only spawns a fresh one when no existing agent is a sensible fit, and says that he checked. Encoded in both the floor orchestrator prompt and the Slack autonomous-request protocol (`src/main/hive.ts`, `src/main/index.ts`).
- **Auto-revive wedged terminals on wake.** A terminal that wedged while the machine slept is now detected and auto-revived when the machine wakes, instead of sitting dead until manually restarted.
- **Catch up missed schedules on wake (power keep-alive hardening).** Scheduled missions whose fire time elapsed while the machine was asleep are now caught up on wake rather than silently skipped (verified by `scripts/verify-keepalive-catchup.mjs`).
- **Worker stale-done guard.** A worker is now released only on a `done` authored *after* it was spawned, so a stale `done` from a prior life can no longer prematurely release or tear down a live worker.
- **Floor: "add agent" button stays on one line.** The add-agent button no longer wraps as the roster fills.
- **Voice button disabled with a tooltip when the Groq key is missing**, instead of failing on click.

### Security
- **Confined the `integrations:test` probe path.** The connectivity-test path for integrations is now constrained so it can't be turned into a secret-exfiltration or SSRF primitive — a brokered, bounded probe rather than an arbitrary outbound request driven by registry/secret input.

## [0.2.8] — 2026-06-15

A feature release: **shareable hires** — package a role-configured agent as a portable
manifest, share it as a file or host it in a gallery, and import it into any office with one
click. Plus **The Hiring Fair**, a community gallery of ready-made roles, and a hardened,
untrusted-input import pipeline.

### Added
- **Shareable hires (#70, #71).** A portable `munder-difflin/hire@1` JSON manifest describing a role-configured agent — name, sprite, provider, model, command flags, goal, capability tags, token budget. Two import paths, one pipeline: a `munderdifflin://hire?src=<https-manifest-url>` deep link (fetched and validated in the main process, queued, then pulled by the renderer on mount) and an *import hire…* button in the Add-Agent modal that reads a local manifest file. Either way the manifest only **pre-fills** the Add-Agent modal behind an "imported" banner; spawning stays an explicit human click — import never auto-spawns. Protocol registration ships for all three platforms (macOS `open-url`, Windows/Linux single-instance lock + cold-start argv forwarding), and packaged builds register the scheme via `electron-builder.yml`.
- **The Hiring Fair — community gallery** at [munderdiffl.in/hires](https://munderdiffl.in/hires/) (`docs/hires/`, static, no build step, served by the existing GitHub Pages setup). Seed roles drawn from the cast (Pam writes docs, Dwight enforces QA, Jim reviews PRs, Creed audits security, Angela audits the office's own token spend, Stanley does the migrations nobody wants), each with a Claude Code / Antigravity / Codex provider toggle (per-provider variants generated from one base manifest), function filters matching the landing page, and a client-side validator identical to the app's alongside a JSON schema (`docs/hires/spec/`). Model suggestions are data-driven (`docs/hires/models.json`), so new models are a one-line update.

### Security
- **A hire manifest is untrusted input — defense in depth.** No auto-spawn and no executable field: `provider: "custom"` is rejected and the binary always comes from the user's local provider preset. Embedded CLI flags are gated by a **default-deny allowlist** (`SAFE_FLAG_NAMES`) — only known-harmless flags pass, nothing system-prompt/settings-related — replacing an earlier denylist that drifted as each CLI added flags. `model` is constrained to a safe charset (`MODEL_RE`), and a command-line quoter neutralizes `cmd.exe` metacharacters (`& | ^ < > ( ) % !`) on **every** spawn path — closing a Windows command-injection class (PoC `"model":"x&calc"`). The manifest fetch is https-only, manual-redirect with per-hop re-validation (kills redirect SSRF into `127.0.0.1` / `169.254.169.254`, including an IPv6-bracket bypass), streamed with a 64 KB byte cap (no trusting `content-length`), a 10s timeout, and ≤5 hops. The dependency-free validator (`src/shared/hire.ts`) is shared by the main process, the renderer, the gallery (`docs/hires/validator.js`), and the JSON schema, so all four stay in sync.

## [0.2.7] — 2026-06-13

A feature release: talk to your agents with your voice, an opt-in enterprise Knowledge
Graph, multi-window "floors", a richer message composer with file/image attachments, the
groundwork for TV-show office themes, and a redesigned landing page — plus composer and
fullscreen polish.

### Added
- **Free Flow voice dictation → message queue (now on by default).** Hold Option to talk; your speech is transcribed by Groq Whisper (`whisper-large-v3-turbo`) straight into the message composer. Gated on a Groq API key, which is encrypted at rest.
- **Enterprise Knowledge Graph v1 (now on by default).** A multimodal store of your own documents / policies / business context, with a CLI agents can query for ranked passages and full documents — so company-specific facts come from your data instead of guesses.
- **Multi-window "floors" (now on by default).** Open isolated office windows, each with its own set of agents and per-PTY routing.
- **Rich message composer — file & image attachments.** Attach files/images (via a "files" button or paste-to-attach), shown as removable chips above a taller, resizable input; you can send with attachments alone.
- **Restore agent sessions across restart, with Restart & Continue (#78).** Agents reattach their prior Claude conversation after an app restart: Michael resumes his session (the orientation prompt is skipped on a genuine resume), and a restored worker re-enters its *existing* worktree instead of re-isolating, so uncommitted work isn't lost. The recorded session transcript is seeded into the target cwd before `--resume` attaches (and `--resume` is only used when the transcript is actually present, so there are no broken resumes against a missing id), and the pooled terminal soft-resets in place — staying live and typeable across a model change or respawn, redrawn at its real fit-derived grid. A per-agent **Restart & Continue** button respawns the session on the same model with resume to redraw a garbled terminal, and Add Agent gains a "resume session" field that reattaches by session id (auto-filling the folder, falling back to a fresh session if the id isn't found).
- **Drag a file onto a terminal to inject its path (#79).** Dropping a file (an image, etc.) onto an agent's terminal now writes its absolute, shell-escaped path into the session — so Claude Code detects the image path in the prompt and attaches it — instead of Electron navigating to the dropped `file://` URL. Backed by `webUtils.getPathForFile` exposed from preload (Electron 32 removed `File.path`); only file drags are intercepted, so text/selection drags still fall through to xterm.
- **TV-show office themes — infrastructure (behind a flag, off by default).** A theme abstraction (`ThemeConfig` + registry/loader), a Settings theme picker with a destructive switch-flow, and the first themed map (Brooklyn-99 precinct). Ships dark via the `tvShowOffices` flag while the remaining maps land.
- **Live GitHub star count** next to the Star buttons on the landing page.

### Changed
- **Composer redesign.** A full-width input above a single tidy control bar (Delegate · Attach · voice · Send) — no dead space from a stacked side column.
- **Landing page redesign.** Bento layout for the #features and #why sections with new SVG illustrations; the #claude section refreshed for v0.2.7.

### Fixed
- **Fullscreen tab bar no longer clipped.** The fullscreen terminal's tab bar is un-clipped.
- **Slack double-ack (#).** A single Slack message delivered as both `app_mention` and `message.*` is now de-duplicated by `channel:ts`, so it's handled exactly once.

## [0.2.6] — 2026-06-10

A polish + reliability patch: the agent terminal renders correctly the moment it opens,
`npm run dev` no longer crashes on a missing sidecar, a Windows ConPTY crash is guarded,
the wall clock becomes a clickable closing-time control, the ASK ME board reads in the
memory font, and the Slack file download is host-pinned.

### Added
- **The office clock is interactive (#64).** The clock on the wall reads the real time, and clicking it opens the closing-time (graceful shutdown) flow.

### Fixed
- **Terminal no longer renders oversized/clipped when an agent boots.** xterm used to fit before its container had a real size and cached the character-cell metrics from before the web font (VT323) loaded, so the welcome banner overflowed and was clipped until you manually resized. The view now waits for a real size, re-measures and re-rasters the WebGL glyph atlas after the font loads, and lets the `ResizeObserver` drive the first fit — so it fits immediately on boot.
- **`npm run dev` no longer crashes on the missing Slack-trigger sidecar (#67).** The `.cjs` sidecar copy now runs as a vite `writeBundle` plugin, so both `dev` and `build` emit `out/main/slack-trigger.cjs` from one place. (v0.2.5 fixed only the packaged-build path, so a fresh clone's `npm run dev` still died at boot.)
- **Windows: node-pty ConPTY `AttachConsole` crash guarded (#65).** Companion to the Antigravity provider work — the main process no longer crashes when ConPTY fails to attach a console.
- **ASK ME reads in the memory font (#63).** The ASK ME board now uses VT323 instead of the chunky Pixelify Sans, matching the rest of the memory surfaces.

### Security
- **`downloadSlackFile()` host-pinned to Slack.** The Slack bot token is now only ever sent to `slack.com` / `*.slack.com` hosts — a defense-in-depth guard before the `Authorization: Bearer` header is attached (the URL is already Slack-issued + HMAC-verified, so this hardens against a future redirect/parsing change).

## [0.2.5] — 2026-06-10

A reliability + reach patch: a Windows-terminal regression fix, an agent-lifecycle
cleanup that ends the breaker inbox-flood, Slack requests that actually reply with
substance, a delegate toggle, six new tutorials/blogs, and an enriched landing diagram.

### Added
- **Delegate-to-agents toggle.** A toggle switch above the Send button in the god orchestrator's composer prepends a delegation instruction so a request fans out to available agents (and is handled one-by-one if none are free). God-only, default off.
- **AUTONOMOUS REQUEST PROTOCOL for Slack-origin requests.** Inbound Slack requests now run fully autonomously: god routes the request to the most-relevant agent, that agent does the work and **posts its substantive result back into the Slack thread itself**, then reports to god. It pauses only for high-severity actions (pushing to main, spawning infrastructure/paid services, deleting files it didn't create), and any decision it needs is asked as a numbered-options reply in the thread and correlated back by `thread_ts`.
- **Six new tutorials & blog posts** — webhook setup, the full Slack setup, deploying an automated PR-reviewer agent, deploying a blog-writer agent, why CLI agents are so powerful (and how the hive cuts token use), and why a mixed-capability swarm beats a clone army.
- **Enriched "how it works" landing diagram** — Slack / Webhook / Schedule triggers feeding the orchestrator, plus a band showing each agent in its own isolated local git worktree.

### Fixed
- **Windows agent terminals no longer die on Program-Files installs (#55).** `cmd.exe` is now invoked with a properly double-quoted command line (`/d /s /c`), so a Claude/node path containing a space (e.g. `C:\Program Files\…`) launches instead of splitting on the space.
- **Orphaned-agent lifecycle cluster (#56/#57/#58).** A stale agent entry with no live terminal no longer (a) re-writes a frozen cost-ledger row every ~30s, (b) trips the circuit breaker into an unclearable inbox-flood to the orchestrator, or (c) lingers un-archived — a startup migration archives no-PTY entries and the breaker now skips assistant/orphaned shells.
- **Slack replies are real answers, not empty confirmations.** Worker agents post the actual outcome into the thread; the orchestrator's auto-summary is now a fallback that never posts a bare "✅" with no content and skips threads already answered directly.

### Removed
- **Reverted the unfinished compact-protocol feature** — it was only half-wired (main-side committed, renderer-side unfinished) and broke the web typecheck. It will return fully wired in a later release.

## [0.2.4] — 2026-06-09

A multi-provider patch: Codex graduates to **full hive parity** via a native
lifecycle-hook bridge, the god orchestrator opens to its terminal by default, and a
handful of resilience fixes land.

### Added
- **Codex lifecycle-hook bridge — full hive parity.** Codex now joins the hive as a first-class, hive-aware provider: a native lifecycle-hook bridge maps Codex's events into the existing hook pipeline (live status + inbox-drain + outbox routing), and agy/codex dispatch is unified behind one path. Verified running hive-aware in bypass-permissions mode. (#47, #54)
- **Codex hook discovery via `config.toml [hooks]`.** The bridge registers through Codex's `config.toml [hooks]` surface rather than a bare `hooks.json`, matching how Codex actually discovers lifecycle hooks.

### Changed
- **God orchestrator opens to the Terminal sidebar by default.** Selecting the god agent no longer reopens a stale "ASK ME" tab — a leftover command-center tab request is cleared on select, so the panel mounts to its terminal default. The ASK ME tab is still one click away.
- **Landing + blog refreshed for multi-provider.** The landing page now presents Claude Code, Antigravity (Gemini), and OpenAI Codex as equal first-class providers (with a one-line mobile-friendly badge), and a grand v0.2.4 launch post + technical walkthrough replace the v0.2.3 posts.

### Fixed
- **Slack/webhook tunnel no longer crashes at load.** `tunnelmole` is ESM-only; a static `import` in the CommonJS-bundled Electron main process threw `ERR_REQUIRE_ESM`. It's now loaded via a dynamic `import()` inside `openTunnel()`, so the public ingress actually starts.
- **Heartbeat re-engages the god on an unread actionable inbox** — not only when the floor is quiet — so worker/human mail is drained promptly.
- **Slack done-summary stops retrying on terminal errors.** A permanently-failing post (e.g. the bot token missing `chat:write` → `missing_scope`) is now recorded and logged once instead of retrying every 5s and flooding the console; transient errors still retry.

## [0.2.3] — 2026-06-09

A multi-provider release: the floor is no longer Claude-only. Antigravity (Gemini)
and Codex agents become first-class hive participants, schedules get their own tab,
and the Slack / webhook ingress is moved off the flaky public tunnel.

### Added
- **First-class Antigravity (Gemini / `agy`) provider.** A worker can now run the Antigravity CLI as a full hive participant. Because `agy` has no Claude-style `--append-system-prompt`/`--settings` hooks, the hive identity + protocol ride in as the session's initial prompt, and a native `agy-hook` bridge normalizes Antigravity's lifecycle events into the existing hook pipeline so a Gemini worker gets the same live status + inbox-drain as Claude — on the subscription, no API key. (#54)
- **Schedules tab.** Recurring auto-dispatched missions (and the adaptive heartbeat) get their own Command-Center tab instead of an inline section. (#50)
- **Terminal work-order handoff for hookless providers.** A provider with no inbox-drain path now receives hive mail as a `WORK ORDER FROM HIVE` typed into its terminal, falling back to a god-bounce only if the renderer is unavailable. (#53)

### Fixed
- **Codex agents now follow the hive protocol and message back.** Codex spawned without the hive protocol or any hook, so it never read its inbox or wrote its outbox. Codex is now a non-hive-aware-but-inbox-capable provider: the protocol is injected as its initial (positional) prompt, its outbox is drained provider-agnostically by the router, and inbox mail reaches it via the renderer's idle inbox-wake nudge. Codex and Antigravity coexist in the provider union. (#47, #54)
- **Slack + webhook public URL no longer silently breaks.** The ingress used `localtunnel`/loca.lt, which now serves a browser interstitial that fails Slack's `url_verification` POST and breaks saved webhook URLs. Both `slack.ts` and `webhook.ts` now use **tunnelmole** (MIT, POSTs pass straight through), and a failed tunnel surfaces a real error instead of a silent "started" with no URL.

## [0.2.2] — 2026-06-07

A community polish release — almost entirely the work of @Gulum: a live context-window
gauge on every agent card, sharper terminals, correct Windows metering, and dispatch that
always routes through the god.

### Added
- **Live context-window gauge on each agent card.** A Claude Code statusLine pushes the session's exact token count and real context-window size after every response, so each agent card shows a precise live fuel gauge drawn from Claude Code itself instead of a transcript estimate. The gauge also zeroes the instant you send `/clear`, rather than briefly showing the previous session's full bar until the next response. (Thanks @Gulum — #12, closes #11.)
- **Per-session terminal theme toggle + Unicode 11 emoji widths.** Each terminal session can now switch its Claude theme independently, and emoji column widths follow Unicode 11 so wide glyphs stop nudging the cursor out of alignment. (The WebGL renderer, copy/paste, and `minimumContrastRatio` from v0.2.0 are kept as-is.) (Thanks @Gulum — #26.)
- **All human dispatch flows through the god.** Every Command Center dispatch now mails the god (`Task from the human`) instead of writing straight into a worker's inbox; the worker dropdown becomes a **suggested owner** (Michael still decides), so nothing skips the orchestrator. (Thanks @Gulum — #45, fixes #44.)
- **Dedicated context-window row on the monitor tab.** The Floor monitor's cumulative budget bar was being misread as a per-agent context gauge; a separate `ctx` context-window row now sits alongside it, so the live context window and the cumulative budget aren't confused. (Thanks @Gulum — #46.)

### Fixed
- **Windows usage meter no longer reads 0/0.** The transcript reconciler built the per-project directory name with the POSIX rule, but Claude Code on Windows encodes *every* non-alphanumeric character (including the drive colon), so the meter never found the transcript and always read 0 tokens / $0.00. (Thanks @Gulum — #34, fixes #10.)
- **Send-only assistant mail no longer black-holes.** Direct mail to the send-only prep assistant landed in an inbox nothing reads; the router now bounces it to the god (subject prefixed `[bounced …]`) instead of dropping it. (Thanks @Gulum — #33, fixes #32.)
- **Boot banner no longer stacks in scrollback.** `tryFit()` fired `resizePty` on every fit even when the dimensions were unchanged; redundant resizes are now skipped, so the boot banner stops re-stacking in the terminal history. (Thanks @Gulum — #8.)
- **Visible text-select cursor on the cream theme.** The hovering I-beam (an OS cursor that CSS color hints can't touch, drawn white by several Windows schemes) is now an inked I-beam with a halo, so it stays visible over the light terminal. (Thanks @Gulum — #39.)

### Acknowledgements
This release is almost entirely the work of @Gulum — thank you. Maintained by @chaitanyagiri.

## [0.2.1] — 2026-06-07

A small follow-up to v0.2.0 that makes the scheduler considerate of agents that are mid-task.

### Changed
- **Scheduled auto-compaction is queued, not forced.** The hourly ops-standup's terminal compaction is now enqueued per agent and delivered only when that agent is idle (deduped — at most one `/compact` pending at a time), so it compacts *between* steps instead of jamming a working terminal mid-step. The standup prompt now asks each agent to summarise its current task and next step, then resume from the same point after compacting.
- **Heartbeat is inbox-driven.** The floor heartbeat (`reengageGod`) no longer types directly into Michael's terminal; it drops its digest in his inbox, which the busy-aware inbox-wake delivers once he's idle.

### Docs
- Expanded the README roadmap (chat integrations, pluggable agent CLIs, realtime Michael).

## [0.2.0] — 2026-06-07

The observability and control release. v0.2.0 makes the fleet visible and keeps it in check — and it's a community release in the most literal sense: most of the work below came from external contributors. Huge thanks to everyone credited.

### Added
- **Command Center overhaul.** Michael's control surface was reworked into the place you actually run the floor from — the roster, dispatch, schedules, memory, and activity views now carry the new live signals (token budgets, telemetry, breaker state) without becoming a wall of numbers.
- **Per-agent token budgets + live fleet monitoring.** Every agent carries a token budget, and the floor monitors consumption live so a single agent can't quietly run the bill up.
- **Live OTel telemetry collector + per-model cost.** A built-in OpenTelemetry collector and a `UsageProvider` seam feed real usage in, with per-model cost attribution (interim transcript-backed stub behind the seam to start).
- **Fleet grid + per-agent tool-span waterfall.** A live grid of the whole fleet, plus a per-agent tool-span waterfall that shows what an agent spent its turn doing — which tool calls ran, in what order, for how long.
- **Agent-card context-window gauge.** The agent card's progress bar is repurposed into a context-window gauge so you can see at a glance how close each agent is to filling its context. (Thanks @Gulum — #12.)
- **Circuit breaker.** A steer → constrain → stop ladder plus a cost/runaway guard, fed by hook signals (repeated identical tool calls), an `onApiError` seam for error-storm trips, and budget config.
- **Scheduler heartbeat.** A heartbeat beat tracks each agent's last output (quiet/idle signals), enforces circuit-breaker policy, and adds spawn guardrails; the SCHEDULES view shows the heartbeat row plus last-fired / next-fired times. (Thanks @albozes — #2.)
- **Human-in-the-loop, mid-run.** A HITL gate, mid-run steer, and graceful stop all delivered through hook returns — approve, redirect, or cleanly halt an agent mid-turn instead of yanking it.
- **Durable SQLite persistence (Phase A).** A SQLite durable store persists window bounds and history, alongside a persisted `session_id` and a durable cost ledger (`cost-ledger.jsonl`) so cost and provenance survive restarts.
- **MemoryReflector — memory condensation.** The janitor's missing condense half: a reflector that condenses memory instead of only mining it, keeping the semantic store lean.
- **Configurable hive/memory home folder.** Point the hive and memory home at a folder of your choosing, with a safe move that relocates existing data.
- **One-click "Restore team."** After a harness restart, a single click brings back the last session's workers — no more re-adding agents one by one. (Thanks @Gulum — #16.)
- **Delete scheduled missions.** Scheduled missions now have a delete button. (Thanks @Gulum — #9.)
- **New avatar states.** A compacting state (on `PreCompact`) and a looping state (when the breaker engages) so the floor reflects what the control layer is doing.

### Fixed
- **Terminal contrast + HiDPI legibility.** A `minimumContrastRatio` floor and a tuned light palette (including dual fg/bg-legible green/yellow) keep text legible on coloured backgrounds across both the new and legacy terminal views.
- **Crisp, readable floor text.** A HiDPI canvas, bold bubbles, and a walk-flicker fix sharpen office-floor text; thought-cloud text now stays 1:1 when the window shrinks. (Thanks @Gulum — #20.)
- **Terminal no longer jumps to the top of history on first scroll**, and the viewport dead zone is gone (re-sync routed through xterm, not the DOM). (Thanks @Gulum — #8.)
- **Windows: keep the hive running behind the lock screen.** The hive no longer freezes when Windows locks — keep-awake plus no throttling. (Thanks @Gulum — #18.)
- **Live agent statuses** and **composer-draft fixes** for the message-queue composer. (Thanks @Gulum — #7, #27, #28.)
- **Palace writer-lock serialization** and **Windows named-pipe + mempalace detection** so the hook server and semantic memory work on Windows. (Thanks @Xileck.)
- **Per-PTY input serialization** so the boot sequence can't jam mid-spawn; restored `+x` on the `node-pty` spawn-helper so agents can spawn.
- **GOD orchestration tabs** are now scrollable; the title-bar settings button is a clear gear chip.
- **Global `defaultModel` wins over role tier** (an explicit per-agent pick still wins); cost-ledger row is fully snake_case for a 1:1 SQLite migration (#4).

### Acknowledgements
Reported / requested by the community: @JLAD75 (Windows hive router / `hooks.sock` — #1), @billrehm (Windows GOD-spawn error 193 — #22), @darrensheffield (uv-not-installed assumption — #30; macOS Gatekeeper — #29), @pdurlej (first-class Codex CLI provider request — #21), @wild-gobatz (agents showing idle until clicked — #3). Maintained by @chaitanyagiri.

## [0.1.9] — 2026-06-06

### Added
- **Hourly ops standup.** A built-in scheduled mission (enabled by default) where the GOD orchestrator reviews every agent — who's doing what, whether tasks are on track, and whether agents are still running — and **compacts each terminal's context** on the same hourly cadence to keep agents lean. Toggle it in the Command Center; a one-time migration seeds it into existing installs (and won't re-add it once deleted).

### Fixed
- **Agents exited on their own at a "Bypass Permissions mode" prompt.** Agents spawn with `--permission-mode bypassPermissions`, which on a fresh machine shows a one-time interactive "WARNING: Bypass Permissions mode … 1. No, exit / 2. Yes, I accept" prompt the terminal couldn't answer, so the agent exited code 1 within seconds. The harness now idempotently pre-accepts Claude Code's dangerous-mode warning (`skipDangerousModePermissionPrompt` / `skipAutoPermissionPrompt`) and per-folder trust before each spawn.
- **Blog cards.** The colored thumbnail tile sat flush against each card's bold border; it's now inset with padding for breathing room (desktop + mobile).
- **Windows: hook server + semantic memory.** The hook server now binds a named pipe on Windows (where Node IPC isn't a filesystem socket), and `mempalace` is detected via `where` + the standard `.exe` install locations so semantic memory works on Windows. POSIX behavior unchanged. (Thanks @Xileck — #4.)
- **Palace mining writer-lock collisions.** Mining is now serialized — a single writer at a time with a re-entrancy guard — fixing "palace is held by PID …" failures when multiple agents mined concurrently. (Thanks @Xileck — #5.)
- **MemPalace index noise.** Each agent's `.gitignore` is ensured before mining so `settings.json`, the cursor file, and raw inbox/outbox message JSON stay out of the semantic index — keeping recall and wake-up focused on real memory.

## [0.1.8] — 2026-06-05

### Fixed
- **Windows agent spawn.** Launching an agent on Windows failed with `cannot create process, error code: 2` (ENOENT) because binary and PATH resolution were Unix-only (`SHELL`/`/bin/zsh`, `-ilc`, `which`, and Unix-only fallback paths). Windows now resolves `claude` via `where`, checks the standard Windows install locations (`%APPDATA%\npm\claude.cmd`, `%LOCALAPPDATA%\Programs\claude`, `%USERPROFILE%\.claude\local`), uses the process `PATH` directly (no login-shell probe), and recognizes Windows-style (`\`) absolute paths. macOS and Linux resolution is unchanged; the Unix fallbacks now also include `~/.volta/bin`.

## [0.1.7] — 2026-06-04

### Added
- **Slack → Michael's queue.** A new Slack integration (Settings → Slack) pipes a channel's messages straight into Michael's message queue — paste a message in Slack and it lands in his queue exactly as if you'd typed it. Off by default; every request is verified with your Slack signing secret (HMAC + 5-minute replay guard) before it's accepted, and a localtunnel exposes the local webhook for Slack's Event Subscriptions.

### Changed
- **Approvals are now native.** The in-app approvals queue/panel is removed in favor of native Claude Code human-in-the-loop prompts. A `to:"human"` decision now reaches you through Michael's session and native permission prompts — approvable from your phone via `/remote-control` — and Michael boots straight into running the floor.

### Fixed
- The floating approvals panel could re-queue an item when you approved it (`resolveApproval` re-routed the message back into the queue). Moving to native HITL removes the panel and the bug.

## [0.1.6] — 2026-06-04

### Added
- **Per-agent git worktrees.** A 'Git isolation' toggle in Add Agent auto-provisions a dedicated worktree (`<harnessHome>/worktrees/<agentId>/`) on spawn and tears it down on kill. Agents on the same repo never collide on branches.
- **Task kanban with dependencies.** A Tasks tab in the Command Center renders a full kanban board (todo / doing / blocked / done). Each task carries an assignee, a `dependsOn[]` list, priority, and description — and persists in `hive/tasks.json` via a new `hive:writeTasks` IPC channel.
- **Scheduled missions.** A Schedules section in the Floor tab lets you define recurring auto-dispatch missions (label, interval, target agent, body). The main process fires each on a `setInterval`, stamps `lastFiredAt`, and persists the list in config.
- **Real token & cost telemetry.** The Activity tab reads `~/.claude/projects/` JSONL transcripts — the same files Claude Code writes — and displays actual input/output/cache token counts and estimated USD cost per agent per model. No more proxy tool-call counts.
- **Global hive text search.** Full-text search across `board.md`, `tasks.json`, and all agent `memory.md` files, available in the Memory tab alongside MemPalace semantic search.
- **Threaded chat.** A Messages tab in each agent's sidebar renders every hive message grouped by conversation with full reply chains and an inline reply form.
- **Memory graph.** A visual graph in the Command Center Memory tab maps agents and their knowledge relationships.
- **GitHub issue ingestion.** An Issues section in the Floor tab pulls open issues from any registered repo via `gh issue list` and lets you assign them to any agent with one click.
- **CI status watcher.** A CI Status section in the Activity tab polls `gh run list` for every registered repo and shows live pass/fail/in-progress status for GitHub Actions runs.
- **Desktop notifications.** Native OS notifications fire when an agent finishes a task or is waiting for your input. Toggle in Settings.
- **Agent archival.** Closing an agent's tab archives it (memory + history intact) rather than deleting it permanently.

### Fixed
- Scheduler now honors `lastFiredAt` on config reload — missions don't double-fire after a save.
- PTY lifecycle teardown runs on natural process exit as well as explicit kill, so worktrees are cleaned up reliably.
- Task IDs fall back to a stable UUID when the title is empty; `writeTasks` IPC validates its input.

## [0.1.5] — 2026-06-04

### Added
- **Dwight, Michael's prep assistant.** A persistent, visible assistant agent
  (Sonnet, 1M context) spawns on startup. A global **enrich** toggle routes
  Michael's queued prompts through Dwight first — he gathers repo context and
  rewrites the prompt, then forwards it to Michael through the hive; toggle it off
  and prompts go straight to Michael.
- **Michael's Command Center.** His sidebar becomes a control surface with
  Terminal, Floor (agent roster + **per-agent model selector** with safe restart,
  a dispatch box, and working dirs), Memory (MemPalace search + per-agent memory),
  and Activity (live log feed + board + usage proxy), plus a copyable Claude
  command handbook.
- **Per-agent model selection** — a model picker in **Add Agent**, a shared model
  list, and a message-queue composer with the enrich toggle.
- **Getting-started tutorial** on the blog (canonical install + first-run walkthrough),
  with Blog/tutorial CTAs and a redesigned "How it works" section on the landing page.

### Fixed
- Agents no longer read **"idle" while still working** — a Stop blocked mid-turn now
  reports `blocked` so the UI keeps the agent in its working state.
- Long agent thought/tool labels now **word-wrap inside their cards** instead of
  overflowing the bubble horizontally (Pixi word-wrap with a raw-length cap so a
  pathological string can't grow a runaway-tall card).
- Switching agent terminals now lands at the **latest output**, while resizes
  preserve scroll position; the idle action label no longer echoes the "idle" badge.

## [0.1.4] — 2026-06-04

### Added
- **Signed macOS builds.** The app now ships with a hardened-runtime Developer ID
  signature (notarization is attempted in CI and stapled when it succeeds; the build is
  best-effort, so a notarization hiccup never blocks a release). Because macOS binds a
  folder-access (TCC) grant to a stable code signature, you're now prompted for
  Documents/Desktop/Downloads access **once** instead of on every agent action.
  Usage-description strings explain each prompt. Signing/notarization run in CI only
  when Apple credentials are present, so contributor builds stay unsigned and green.
- **Blog at [/blog](https://munderdiffl.in/blog/)** — an Eleventy-generated static blog
  sharing the landing page's neo-brutalist design system, seeded with the first posts
  on long-term memory, multi-agent harnesses, and MemPalace, plus tag/topic indexes and
  an RSS feed.
- **On-site SEO/AEO metadata** — JSON-LD, `robots.txt`, a root `sitemap.xml`, and richer
  link-unfurl/meta tags across the site.

## [0.1.3] — 2026-06-01

### Added
- **Settings panel** (title-bar gear) with a **Reset & start over** action that wipes
  Michael's memories, the entire hive (every agent, message, task, and the board), and
  the semantic-memory palace, then relaunches the app into onboarding.
- Boot loader ("clocking in") shown while the GOD agent initializes, so returning users
  no longer see the empty "add agent" screen during startup.

### Fixed
- Crash dialog on quit caused by sending IPC to an already-destroyed window during
  teardown; all renderer sends are now destroyed-safe and shutdown steps are best-effort.
- Michael no longer marches to the door flagged "needs you" right after finishing a turn —
  idle "waiting for input" notifications now let him linger at his desk instead of
  escalating as a blocked/needs-action state.

## [Brand & rename]

### Added
- Brand identity: **Munder Difflin** — logo (`docs/logo.svg`), square mark
  (`docs/logo-mark.svg`), and hero banner (`docs/banner.svg`).
- Landing page at `docs/index.html` (GitHub Pages–ready).
- In-app branding: window title, boot screen, title-bar `MD` badge, and fullscreen
  header captions.
- Open-source community files: `SECURITY.md`, `CHANGELOG.md`, issue/PR templates, and a
  CI workflow.

### Changed
- Renamed the project from *Claude Terminal Harness* to **Munder Difflin** across the
  README, docs (`SPEC.md`, `DESIGN.md`, `HIVE.md`), `package.json`, and the app UI.

## [0.1.0] — 2026

Initial working prototype.

### Added
- Electron + React + TypeScript shell (electron-vite).
- Real terminals via `node-pty`, rendered with xterm.js; multi-agent spawn/write/
  resize/kill over typed IPC (`window.cth`).
- Pixi.js office floor: Tiled map, camera, recolored cast, pathfinding, seat assignment,
  tool bubbles, and message envelopes.
- The hive: on-disk multi-agent layer (`hive.ts`), hook server + `cth-hook` shim and
  `Stop`-loop (`hooks.ts`), and a semantic memory layer (`memory.ts`).
- GOD orchestrator agent, approvals queue, and memory search panel.
- Sandboxed file browser + CodeMirror editor and a git tab (status, log, branches,
  commit graph).
- Onboarding wizard, safe-quit guard, and a tokenized SNES/Animal-Crossing design
  system.

[0.1.0]: https://github.com/chaitanyagiri/munder-difflin/releases/tag/v0.1.0
