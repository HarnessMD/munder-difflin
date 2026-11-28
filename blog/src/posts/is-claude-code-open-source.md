---
title: "Is Claude Code Open Source?"
description: "No. Claude Code is proprietary under Anthropic's terms. What its GitHub repo holds, what the 2026 leak changed, and which open tools sit around it."
date: 2026-09-14
category: concepts
categoryLabel: Concepts
type: Non-technical
primaryKeyword: "is claude code open source"
secondaryKeywords: ["claude code open source", "is claude code cli open source", "claude code license", "claude code sdk open source", "claude code open source alternative", "claude code source code leak"]
tags: ["Concepts", "Open Source", "Claude Code", "Engines"]
faq:
  - q: "Is Claude Code open source now?"
    a: "No. The licence file in the anthropics/claude-code repository still reads 'All rights reserved' and was last changed on 22 May 2025, when Claude Code 1.0 went generally available. We checked it through the GitHub API on 14 Sep 2026."
  - q: "Can I fork or modify Claude Code?"
    a: "Not under its licence. The repository grants no open source rights, and Anthropic's legal page says a product that runs Claude Code must run the binary unmodified. After the March 2026 leak, Anthropic filed a DMCA notice that, after a partial retraction, covered a GitHub mirror of the source and 96 of its forks."
  - q: "Is the Claude Agent SDK open source?"
    a: "Only in part. Anthropic's docs put the Agent SDK under its Commercial Terms, except components that carry their own licence file. The TypeScript SDK repo has the same all rights reserved notice as Claude Code, while the Python SDK repo is MIT licensed, though its README still says use of the SDK is governed by the Commercial Terms, and the package bundles the Claude Code CLI, which keeps Anthropic's terms."
  - q: "Is MCP open source?"
    a: "Yes. The Model Context Protocol specification and its SDKs are public repositories in the modelcontextprotocol GitHub organisation. As of 14 Sep 2026 the project is moving from MIT to Apache 2.0: new code and specification contributions are Apache 2.0, and the Python SDK still reads MIT."
  - q: "What is the closest open source alternative to Claude Code?"
    a: "OpenCode is the closest in shape: a terminal coding agent under the MIT licence that works with many model providers, local models included. Codex CLI, under Apache 2.0, is the other common pick. Neither makes the hosted models behind it open."
---

No, Claude Code is not open source. Its GitHub repository is public, but the only licence file says "All rights reserved", and your use falls under Anthropic's Commercial Terms or Consumer Terms depending on your plan. The repo holds plugins, examples and issue scripts, not the CLI's source. Checked on 14 Sep 2026.

You can juggle engines by hand in separate terminal windows, or use [Munder Difflin](https://harnessmd.com/download), a free and open source desktop app (MIT licensed) that runs Claude Code next to open source CLIs such as OpenCode and Codex, each agent a real CLI process in its own terminal. It starts the `claude` you already installed and signed in to, so nothing about Claude Code's licence changes. What you get is the choice, agent by agent, of which engine does the work. The [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup on macOS, Windows and Linux.

## What licence does Claude Code use?

Claude Code uses no open source licence: it is proprietary software under Anthropic's own terms. Anthropic's [legal and compliance page](https://code.claude.com/docs/en/legal-and-compliance) splits it by plan. Team, Enterprise and Claude API users are under the Commercial Terms of Service, and Free, Pro and Max users are under the Consumer Terms. If you put Claude Code inside your own product, the same page adds that "the Claude Code binary must not be modified."

{% img "note-1" %}

Here is the read only check we ran on 14 Sep 2026 against GitHub, npm and a local install:

```
$ gh api repos/anthropics/claude-code --jq '{license}'
{"license":null}

$ gh api repos/anthropics/claude-code/contents/LICENSE.md --jq .content | base64 -d
© Anthropic PBC. All rights reserved. Use is subject to Anthropic's [Commercial Terms of Service](https://www.anthropic.com/legal/commercial-terms).

$ npm view @anthropic-ai/claude-code license
SEE LICENSE IN README.md

$ claude --version
2.1.270 (Claude Code)

$ cd ~/.local/bin && file -L claude
claude: Mach-O 64-bit executable arm64
```

Three things stand out. GitHub detects no licence on the repo at all, so its sidebar shows none. The npm package ships its own `LICENSE.md` saying use is subject to Anthropic's legal agreements, and the GitHub README sends you to the Commercial Terms and the Privacy Policy. And what runs on your machine is a compiled native executable rather than a folder of source files: the README now calls installing through npm deprecated, and the npm package just pulls in one of eight platform specific binary packages.

## Is Claude Code open source on GitHub?

No. `anthropics/claude-code` is a public repository, but public is not the same as open source, and this repo does not contain the CLI. As of 14 Sep 2026 it holds 13 official plugins under `plugins/`, hook, settings, gateway and MDM samples under `examples/`, issue triage scripts under `scripts/`, the changelog and the issue tracker.

Since 10 Sep 2026 it also has a `mods/` folder. Its README says the folder holds the source of three plugins "built into the binary": a diff pane, a telemetry helper and a guard that keeps an organisation's managed settings out of reach of installed plugins. That is real Claude Code source, but a small slice, and every one of the repo's 1,590 paths sits under the same single `LICENSE.md`, last changed on 22 May 2025 when version 1.0 dropped its beta wording. You can read the plugins, open an issue and star the repo. You cannot fork the thing the issues are about.

## Did the 2026 source code leak make Claude Code open source?

No, a leak exposes code without granting any right to use it. In late March 2026, npm version 2.1.88 shipped with a source map that led to the full TypeScript source, "nearly 2,000 TypeScript files and more than 512,000 lines of code" according to [The Hacker News](https://thehackernews.com/2026/04/claude-code-tleaked-via-npm-packaging.html) on 1 Apr 2026. Anthropic called it "a release packaging issue caused by human error, not a security breach."

Anthropic then sent GitHub a [DMCA takedown notice on 31 Mar 2026](https://github.com/github/dmca/blob/master/2026/03/2026-03-31-anthropic.md), which answers "Is the work licensed under an open source license?" with "No". It named one repository, and GitHub applied it to that mirror's whole network of 8.1K repositories. A retraction on 1 Apr 2026 narrowed it to that repository and 96 of its forks, listed by name. The version itself is gone: on 14 Sep 2026, `npm view @anthropic-ai/claude-code@2.1.88 version` returns E404, while 2.1.87 and 2.1.89 both resolve.

## Is the Claude Code SDK open source?

Mostly not, with one exception. Anthropic's docs for the [Claude Agent SDK](https://code.claude.com/docs/en/agent-sdk/overview), the renamed Claude Code SDK, put it under the Commercial Terms "except to the extent a specific component or dependency is covered by a different license as indicated in that component's LICENSE file." The TypeScript SDK repo carries the same all rights reserved line as Claude Code. The Python SDK repo carries an MIT licence, and PyPI lists it as MIT, but its README repeats that use of the SDK is governed by the Commercial Terms, except components with their own licence file, and the package bundles the Claude Code CLI, which keeps Anthropic's terms.

What is open around Claude Code is the layer you build on. The Model Context Protocol lives in public repos that license new code and specification work under Apache 2.0 while they move off MIT, and the Python MCP SDK still reads MIT. Anthropic's official plugin directory, `anthropics/claude-plugins-official`, is Apache 2.0, and its README tells you to check each plugin's own licence.

{% img "note-2" %}

## What are the open source alternatives to Claude Code?

The usual open source picks are OpenCode, Codex CLI, Gemini CLI and Aider. We read each licence on the project's own repo on 14 Sep 2026:

1. **OpenCode** (`anomalyco/opencode`, formerly sst/opencode): MIT. The closest in shape, a terminal agent that works with many providers and with local models. Our [open models guide](/blog/run-munder-difflin-on-open-models/) shows that wiring.
2. **Munder Difflin**: MIT. Not a coding agent itself, but the desktop app that runs these CLIs and Claude Code side by side, so you can move a job from a closed engine to an open one without changing tools.
3. **Codex CLI** (`openai/codex`): Apache 2.0. The client is open and the models behind it are OpenAI's. Our [Codex CLI vs Claude Code](/blog/codex-cli-vs-claude-code/) comparison covers the daily differences.
4. **Gemini CLI** (`google-gemini/gemini-cli`): Apache 2.0, but Google said on 19 May 2026 that from 18 Jun 2026 it would stop serving free, Google AI Pro and Ultra users, leaving paid API keys and enterprise licences.
5. **Aider** (`Aider-AI/aider`): Apache 2.0, with its last commit on main dated 22 May 2026.

One trap: Crush from Charm is source available, not open source. Its `LICENSE.md` is FSL-1.1-MIT, which bars competing commercial use and turns each version into MIT on its second anniversary. If you want open agents beyond coding, such as personal assistants and agent teams, we keep a list of [open source AI agents](/blog/open-source-ai-agents/) sorted by job.

## Does it matter that Claude Code is closed?

It matters if you need to patch, fork, audit or redistribute the agent itself, and for daily use it mostly does not. You cannot fix a Claude Code bug yourself or ship a modified build, and changes arrive when Anthropic releases them. If that is a dealbreaker for part of your work, run that part on OpenCode or Codex CLI and keep Claude Code where you like it. The longer case for open agent tooling is in [why we build ours in the open](/blog/open-source-ai-tools-on-purpose/).
