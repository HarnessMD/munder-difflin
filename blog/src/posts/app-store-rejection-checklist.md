---
title: "App Store Rejection Checklist: Catch It Before Review With AI"
seoTitle: "App Store Rejection Checklist: Catch It Before Review"
description: "An app store rejection checklist from the App Store Compliance Playbook: eight common causes, the Apple guideline or Play policy, the fix, and the scan to run."
date: 2026-11-27
category: guides
categoryLabel: Guides
type: Technical
primaryKeyword: "app store rejection checklist"
secondaryKeywords: ["app store rejection reasons", "how to avoid app store rejection", "google play rejection", "app store review guidelines checklist", "app store compliance playbook"]
tags: ["Guides", "Claude Code", "Skills", "Codex"]
faq:
  - q: "What are the most common App Store rejection reasons?"
    a: "The App Store Compliance Playbook's README puts two checks first: a working demo account with a live backend, and a privacy declaration that matches what the app does at runtime, including every SDK. Apple's guideline 2.1 asks for demo account info and a live back end when an app has a login."
  - q: "How do I check my app before I submit it?"
    a: "The README gives two commands. The first clones mjmirza/app-store-compliance, the second runs its guard script on your app folder. It needs git and bash, and per the README nothing is installed and nothing in your app is changed."
  - q: "Does a CLEAR result mean my app will be approved?"
    a: "No. The README says CLEAR means \"No critical risk in your code. Not an approval, the reviewer still checks what a scan cannot see\". It sends you to the checklist for the account and listing checks."
  - q: "Which AI coding tools does the App Store Compliance Playbook work with?"
    a: "Its installer table names Claude Code, Codex CLI, Gemini CLI, OpenCode, Cursor, GitHub Copilot, Grok, Qwen Code, Kimi Code, Kiro, Factory Droid, Augment Auggie and Windsurf, read 27 Nov 2026."
  - q: "Is the App Store Compliance Playbook free?"
    a: "The README says the whole repository is under the OpenRoots Agent License 2.3. Its LICENSE summary says \"Free and unconditional at or below USD 20,000,000 annual revenue, and for any individual, nonprofit, school, or government body, at any size\", with a royalty above that, and AI training is not granted by either tier. The GitHub API lists the licence as Other."
---

An app store rejection checklist is a list of the causes reviewers reject apps for, checked before you submit; the [App Store Compliance Playbook](https://github.com/mjmirza/app-store-compliance) (mjmirza/app-store-compliance) turns one into a scan you can run from a terminal or an AI coding tool. Checked 27 Nov 2026.

If you run AI agents, [Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. Its agents run on engines such as Claude Code, Codex and Gemini CLI, and can use skills, MCP servers and plugins. The [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup.

## Why do apps get rejected?

Apps get rejected when the build, the listing or the account fails a store rule at review. Apple's [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), last updated 16 October 2026, say every app "is reviewed by experts", and guideline 2.1 says "We will reject incomplete app bundles and binaries that crash or exhibit obvious technical problems."

Google's [Developer Program Policy](https://play.google/developer-content-policy/) page says that if you include an SDK, "you are responsible for ensuring that their third-party code and practices do not cause your app to violate Google Play Developer Program Policies."

## What is the App Store Compliance Playbook?

It is, in its README's words, "A reference and a pre-submission guard for iOS and Android apps", published on GitHub by mjmirza. The README aims to "Catch App Store and Google Play rejection causes before the reviewer does", says "It does not guarantee approval", and defines the guard as "The script that scans your app and blocks a submit when it finds a critical risk".

<figure class="mg" data-scene="scanner"><img src="/blog/assets/media/app-store-rejection-checklist/scanner.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a yellow luggage scanner with a sky belt carries soft white app cards marked iOS and Android through its tunnel, one at a time. As each card rolls out, a tag drops onto it: a lilac tag reading BLOCKED or a mint tag reading CLEAR. A blue screen on the scanner reads critical risk. Tap the scanner to send the next card through."><figcaption>Per the README, the guard scans your app and blocks a submit when it finds a critical risk. Read 27 Nov 2026.</figcaption></figure>

The repo description counts "125 documented rejection patterns"; the project's [site](https://mjmirza.github.io/app-store-compliance/) says 126. These are the project's own figures. The README ranks two checks first: "A working demo account with a live backend, and a privacy declaration that matches what your app actually does at runtime, including every SDK."

The README says the whole repository is under the [OpenRoots Agent License 2.3](https://openroots.org/licenses/ora/2.3). Its `LICENSE` summary says "Free and unconditional at or below USD 20,000,000 annual revenue, and for any individual, nonprofit, school, or government body, at any size", with a royalty above that, and "AI training is not granted by either tier above."

## How do you run the check before you submit?

You run the README's two commands: one downloads the playbook, one scans your app. It "Needs git and bash", and "Nothing is installed and nothing in your app is changed."

```
git clone https://github.com/mjmirza/app-store-compliance ~/repositories/app-store-compliance
bash ~/repositories/app-store-compliance/agent-os/hooks/app-store-compliance-guard.sh "/path/to/your/app"
```

Replace only `/path/to/your/app` "with the folder that holds your Xcode project or your Android app". "The last lines tell you where you stand":

| Verdict line | What the README says |
| --- | --- |
| `BLOCKED.` | "A critical rejection risk was found". Fix each `[CRITICAL]` line, then run again |
| `CLEAR.` | "No critical risk in your code. Not an approval, the reviewer still checks what a scan cannot see" |
| `NOT CHECKED.` | "No iOS or Android project was found in that folder, or the guard could not write its scan files" |
| `Rule pack STALE.` (near the top) | "The rules this scan used are more than 60 days old". Run `git pull`, then scan again |

<figure class="mg" data-scene="signalbox"><img src="/blog/assets/media/app-store-rejection-checklist/signalbox.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a yellow signal box holds four round lamps in a column, each beside a soft white label: a lilac lamp for BLOCKED, a mint lamp for CLEAR, a sky lamp for NOT CHECKED and a blue lamp for Rule pack STALE. One lamp lights at a time and the glow steps down the column. Under CLEAR a small soft white plate reads Not an approval. Tap the signal box to light the next verdict."><figcaption>The guard's last lines give the verdict; the README says CLEAR is "Not an approval". Read 27 Nov 2026.</figcaption></figure>

## What should an app store rejection checklist cover?

Start with the causes the stores name in their own rules. Each of these eight has its guideline from Apple's page or policy from Google's page, read 27 Nov 2026, and the fix from the playbook's [root cause page](https://github.com/mjmirza/app-store-compliance/blob/main/docs/MISTAKE-PATTERNS.md) or [checklist](https://github.com/mjmirza/app-store-compliance/blob/main/docs/PRE-SUBMISSION-CHECKLIST.md):

| Cause | Apple | Google Play | The playbook's fix |
| --- | --- | --- | --- |
| No demo account, backend down | 2.1 App Completeness | | "Provide a working demo account and a live backend at submission." |
| Privacy declaration does not match | 2.3 Accurate Metadata | User Data | "Audit actual runtime data flows, including every third party SDK, against every declaration." |
| Vague permission reason | 5.1.1 (ii) Permission | Permissions and APIs that Access Sensitive Information | "Every sensitive permission must trace to a visible core feature" |
| No account deletion | 5.1.1 (v) Account Sign-In | User Data | "Every account creating app needs in app account deletion." |
| Personal data sent to an AI | 5.1.2 (i) | | A "consent modal naming the provider and data types" |
| Digital goods sold outside store billing | 3.1.1 In-App Purchase | Payments | "Use Apple in app purchase and Google Play Billing for all digital goods unless the app is a documented exempt category." |
| A website in an app shell | 4.2 Minimum Functionality | Functionality, Content, and User Experience | "Add genuine native capability, offline value, device integration, or content the web version does not have." |
| Near identical apps | 4.3 Spam | Spam | "One app per concept" |

A blank cell means no Google policy is cited. Apple's 5.1.2 (i) names "third-party AI".

<figure class="mg" data-scene="flipchart"><img src="/blog/assets/media/app-store-rejection-checklist/flipchart.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a yellow flip chart on a blue stand shows a soft white page of lines: demo account, privacy declaration, permission reason, account deletion. A mint tick draws in beside each line in turn, then the page flips to digital goods, app shell and near identical apps. A lilac tab on the corner reads 2.1, 5.1.1, 3.1.1, 4.2, 4.3 in sky letters. Tap the chart to flip the page."><figcaption>The chart shows every cause in the checklist except personal data sent to an AI. Read 27 Nov 2026.</figcaption></figure>

## How do you run it from an AI coding tool?

You run the README's installer, which "puts the check in front of every submit". Per the README, "Your agent runs the guard before any submit command, such as an upload to App Store Connect or Google Play, and stops the command when a critical rejection risk stands."

```
git clone https://github.com/mjmirza/app-store-compliance ~/repositories/app-store-compliance
bash ~/repositories/app-store-compliance/scripts/install.sh --tool all
```

"`--tool all` installs into every supported tool it finds in your home folder." Claude Code gets "Hook, skill, `/app-store-audit`", then "Restart Claude Code". A run ends with `Install verified.` only after the hook has blocked a test submit command, per the README. Undo it "with the same command and `uninstall`".

Claude Code reads the skill from `~/.claude/skills/`; see [Claude Code Skills: What They Are, Where They Live and How to Write One](/blog/claude-code-skills/). Another skill built around a checklist: [What is UI UX Pro Max?](/blog/what-is-ui-ux-pro-max-skill/).

## What can a scan not check?

A scan reads your project, not your store account, your listing or the reviewer's judgment. The README's setup prompt says "The code scan cannot see whether my developer account is active, whether every agreement is accepted, or whether my Play account and package names are registered". Its [scan page](https://github.com/mjmirza/app-store-compliance/blob/main/docs/WHAT-THE-SCAN-PROVES.md) says "A static scan cannot decide 4.3". After `CLEAR.`, the README says to do "the account and listing checks" in the checklist.

Our view: treat `CLEAR.` as the start of the human checks. The two checks the README ranks first, a demo login and a privacy declaration that matches every SDK, both need a person on the release build.

## App Store Compliance Playbook at a glance

Checked 27 Nov 2026.

| Item | Detail |
| --- | --- |
| Code | mjmirza/app-store-compliance on GitHub, created 6 Jun 2026 |
| Last push | 26 Nov 2026, 23:21 UTC |
| Stars | 7,101 at 04:05 UTC on 27 Nov 2026 |
| Licence | OpenRoots Agent License 2.3, per the README; the GitHub API lists "Other" |
| Patterns | 125 in the repo description, 126 on the site, the project's own figures |
| Tools the installer names | Claude Code, Codex CLI, Gemini CLI, OpenCode, Cursor, GitHub Copilot, Grok, Qwen Code, Kimi Code, Kiro, Factory Droid, Augment Auggie, Windsurf |
| Needs | git and bash; python3 for every tool other than Claude Code |

<link rel="stylesheet" href="/blog/assets/media/app-store-rejection-checklist/motion.css"><script defer src="/blog/assets/media/app-store-rejection-checklist/motion.js"></script>
