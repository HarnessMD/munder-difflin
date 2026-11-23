# Munder Difflin runbook for Quire

Munder Difflin is an Electron desktop app. Quire does not open it by URL: the operator starts the app with `--remote-debugging-port`, and the Run's browser attaches to its window over CDP (`QUIRE_BROWSER_CDP`). The brief says so under "Browser target".

## Environment

- The app is already running when the Run starts. Never start, quit, restart, or reinstall it, and never delete its data folder.
- Each Trail starts from the state its request names, usually a fresh profile (the onboarding wizard) or a finished onboarding (the office floor). If the window shows a different state than the request expects, report the check `blocked` with what is shown instead of trying to reset it.
- Agents run real CLIs with the operator's subscriptions. Hire agents only on cheap models (Claude Code: Haiku 5.5 or Sonnet 5.5). Never pick Opus or Fable for an agent you hire.
- Scratch repository for agent work: `/tmp/md-sample` (a git repo). Agents may create or edit files only there.
- Harness home for onboarding: `/tmp/md-harness`.
- In CI (`.github/workflows/quire-*.yml`) the job builds the app and starts it on a virtual display with a fresh profile, so a Run begins at the onboarding wizard unless it completes onboarding itself. Claude Code is installed but not signed in, so agents cannot do work there; checks that need a reply from an agent are `blocked`. The runner is a throwaway, so a Run may set up what it needs outside the app — installing a skill into `~/.claude/skills`, writing fixtures — and should say in the handoff what it set up.

## Safe actions

- Clicking through onboarding, the office floor, panels (tasks, memory, skills, settings), and the add-agent dialog.
- Sending Michael or a hired agent a short message whose work stays inside `/tmp/md-sample`.
- In onboarding step 4, turn **Share anonymous usage stats** off before finishing, so test runs send no analytics.

## Out of reach

- "add a repo" and every "pick" button open a native folder dialog that the browser cannot see. Use the typed path fields instead (the add-agent project field accepts `/tmp/md-sample`); a check that needs the dialog is `blocked`.
- Desktop notifications, tray, open-at-login, and the system sleep setting are OS features: do not enable them, and report checks about them `blocked`.
- Slack, webhooks, Pro sign-in, billing, and Capabilities installs need accounts or spend: out of scope.

## Evidence

- Terminal content renders in xterm on a canvas, so its text is not in the accessibility snapshot. Read agent replies from screenshots of the terminal panel, or from the files an agent wrote.
- For agent work, also confirm the effect on disk with `run_shell_check` (for example `cat /tmp/md-sample/HELLO.md`).
- First launch of Claude Code can show a "Try the new fullscreen renderer?" prompt in the agent's terminal; answer "Not now" through the Terminal input (ArrowDown, Enter).
