---
title: "ZCode: Z.ai's coding agent harness, explained"
description: "ZCode is Z.ai's Apache-2.0 coding workspace: desktop app, browser view and terminal agent. How to install it, which models it lists, and what it costs."
date: 2026-10-08
category: concepts
categoryLabel: Concepts
type: Technical
primaryKeyword: "zcode"
secondaryKeywords: ["what is zcode", "zcode z.ai", "zcode coding agent", "zcode install", "zcode vs claude code", "is zcode free", "zcode glm"]
tags: ["Concepts", "Open Source", "CLI Agents", "Engines"]
faq:
  - q: "Is ZCode free?"
    a: "The code is free under Apache-2.0. Model use is separate. On 8 Oct 2026 the ZCode site listed GLM Coding Plan Lite at $12.6 a month next to an $18 figure, and its docs described 5 days of free benefits for first-time users. The site says prices and plan benefits may change."
  - q: "Who makes ZCode?"
    a: "Z.ai. The source is at zai-org/ZCode on GitHub, and its description reads: Z.ai's coding agent harness. Powerful, intelligent, extensible."
  - q: "Does ZCode only work with GLM models?"
    a: "No. The built-in provider file in the repo had 20 templates on 8 Oct 2026, including Z.ai, Kimi, MiniMax, DeepSeek, OpenAI, Anthropic, xAI and OpenRouter. The ZCode docs say it is tuned for GLM-5.3."
  - q: "Does ZCode support MCP, skills and subagents?"
    a: "Yes, according to its docs. They describe stdio, HTTP and SSE MCP servers, skills as a folder with a SKILL.md file, and two built-in subagents called general-purpose and Explore. Custom subagents are marked Beta."
  - q: "Is Z.ai's ZCode the only product called zcode?"
    a: "No. Other products use the name. This page covers only the ZCode made by Z.ai, at zcode.z.ai and zai-org/ZCode."
---

ZCode is Z.ai's open source coding workspace: a desktop app, a browser interface and a terminal agent in one Apache-2.0 repo, tuned for Z.ai's GLM models but shipped with templates for other providers. We have not tested it. This page reports what its own pages say. Checked 8 Oct 2026.

Other products are also called zcode. This page is about Z.ai's ZCode only. It is one vendor's workspace. If you want several agent CLIs working side by side, that is the layer [Munder Difflin](https://harnessmd.com/download) works at: free and open source: a desktop app that runs a team of coding agents such as Claude Code, Codex and Gemini CLI on your own computer. The [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup, and more explainers sit in the [concepts hub](/blog/topics/concepts/).

## What is ZCode and who makes it?

ZCode is a coding agent workspace made by Z.ai. The [README](https://github.com/zai-org/ZCode/blob/main/README.en.md) calls it "an AI coding workspace with desktop, browser, and terminal interfaces", and says the repo holds the clients, backend services, shared UI, and the Agent CLI and runtime source.

The GitHub API for [zai-org/ZCode](https://github.com/zai-org/ZCode) showed this on 8 Oct 2026: created 20 Sep 2026, last push 29 Sep 2026, Apache-2.0, 7,541 stars. The description reads "Z.ai's coding agent harness. Powerful, intelligent, extensible." The [releases page](https://github.com/zai-org/ZCode/releases) had one release, v3.14.3, published 24 Sep 2026. Z.ai's [product page](https://zcode.z.ai/en) calls it the "Official Harness for GLM-5.3". New to the word? Read [what is a multi-agent harness](/blog/what-is-a-multi-agent-harness/).

<figure class="mg" data-scene="fan"><img src="/blog/assets/media/what-is-zcode/fan.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A deck of three playing cards fans open on a table, one labelled desktop, one browser, one terminal, then closes back into one deck."><figcaption>One repo, three interfaces: desktop, browser and terminal, per the ZCode README on 8 Oct 2026.</figcaption></figure>

## How do I install ZCode?

Download the desktop installer from zcode.z.ai, or build from source. The [install docs](https://zcode.z.ai/en/docs/install) list macOS (Apple Silicon and Intel), Windows (x64 and ARM64) and Linux (x64 and ARM64, as AppImage, DEB or RPM). The download page marks Linux as Beta.

To build from source, the README asks for Git, Node 24.14.0 and pnpm 10.33.2, then:

```bash
pnpm bootstrap      # install dependencies, prepare desktop assets
pnpm dev:desktop    # run the desktop app
pnpm build:zcode    # build the command line distribution
```

The command line build gives one `zcode` command. With no arguments it starts the terminal UI. `zcode --web` starts the browser interface. The README says both modes run locally without Electron, and that the distribution still requires Node.

The README gives no hosted one line installer. `pnpm build:zcode` needs a download base URL, and the one in the README is a placeholder.

## Which models and providers does ZCode support?

The README does not list models. The list is in the repo's built-in provider file, [zcode-builtin.json](https://github.com/zai-org/ZCode/blob/main/config/provider/zcode-builtin.json). On 8 Oct 2026 it held 20 provider templates: Z.ai Coding Plan, Z.ai API, BigModel, Kimi, MiniMax, DeepSeek, Alibaba Cloud, Xiaomi MiMo, OpenAI, Anthropic, xAI, OpenRouter, and OpenCode Go and Zen. The Z.ai Coding Plan template names two models, GLM-5.3 and GLM-5.3-Flash.

We found no Ollama entry in that file. The [model docs](https://zcode.z.ai/en/docs/configuration) say you can connect compatible services "through the Anthropic / OpenAI protocols" or with an API key.

<figure class="mg" data-scene="dial"><img src="/blog/assets/media/what-is-zcode/dial.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A round radio dial clicks through 20 marked stops, pausing on stops labelled Z.ai, OpenAI and Anthropic."><figcaption>20 provider templates in zcode-builtin.json, read from GitHub on 8 Oct 2026.</figcaption></figure>

## What does ZCode cost?

The code costs nothing: the repo is Apache-2.0. Model use is billed by the provider you connect.

For Z.ai's own plan, the ZCode product page listed these GLM Coding Plan prices on 8 Oct 2026, and added: "Prices and plan benefits may change."

| Plan | Price shown | Figure shown beside it | Usage as listed |
| --- | --- | --- | --- |
| Lite | $12.6 / month | $18 | 10,000 credits / week |
| Pro | $56 / month | $80 | 6× Lite usage |
| Max | $117.6 / month | $168 | 14× Lite usage |

The page shows the second figure struck through and does not explain it. On 8 Oct 2026 Z.ai's [Coding Plan overview](https://docs.z.ai/devpack/overview) said "Starting at just 18 USD per month" and that each plan has both a 5-hour and a weekly limit. The [ZCode docs](https://zcode.z.ai/en/docs/welcome) describe 5 days of free benefits for first-time users, with daily quotas "granted only during these 5 days".

<figure class="mg" data-scene="abacus"><img src="/blog/assets/media/what-is-zcode/abacus.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. Beads slide along three rods of an abacus, one rod per plan, labelled Lite, Pro and Max, the Max rod filling furthest."><figcaption>Lite, Pro and Max: Pro is listed as 6× Lite usage and Max as 14×, on zcode.z.ai on 8 Oct 2026.</figcaption></figure>

## What features does ZCode list?

MCP, skills, subagents, hooks, plugins and workflows, per its docs and its [`NOTICE.md`](https://github.com/zai-org/ZCode/blob/main/NOTICE.md) file, which is written in Chinese (our translation).

- **MCP.** The [MCP page](https://zcode.z.ai/en/docs/mcp-services) covers stdio servers and says SSE and HTTP remote servers are also supported.
- **Skills.** A [skill](https://zcode.z.ai/en/docs/skill) is a folder with a `SKILL.md` file, at `~/.zcode/skills/<skill-name>/SKILL.md` for user-level skills.
- **Subagents.** The [subagents page](https://zcode.z.ai/en/docs/subagents) names two built-in ones, `general-purpose` and the read-only `Explore`. Custom subagents are marked Beta.
- **Hooks.** `NOTICE.md` lists seven lifecycle events, from `SessionStart` to `Stop`.
- **Workflows.** The v3.14.3 release notes say a running workflow's concurrency limit can be changed without stopping the task.

<figure class="mg" data-scene="dominoes"><img src="/blog/assets/media/what-is-zcode/dominoes.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. Seven dominoes stand in a row and tip over one after another, the first marked SessionStart and the last marked Stop."><figcaption>Seven hook events, SessionStart to Stop, per the NOTICE file in the repo on 8 Oct 2026.</figcaption></figure>

## How does ZCode compare with Claude Code, Codex CLI and OpenCode?

ZCode, Codex CLI and OpenCode carry open source licences, and Claude Code's licence file says all rights reserved. This table is our selection of rows, each from that tool's own repo or docs on 8 Oct 2026.

| Tool | Maker | Licence | Model access, as stated |
| --- | --- | --- | --- |
| ZCode | Z.ai | Apache-2.0 | 20 built-in provider templates |
| Munder Difflin | Munder Difflin | Free and open source | Whatever each CLI you run supports |
| [Claude Code](https://code.claude.com/docs/en/setup) | Anthropic | "All rights reserved" | Pro, Max, Team, Enterprise or Console account, or a third-party provider like Amazon Bedrock |
| [Codex CLI](https://github.com/openai/codex) | OpenAI | Apache-2.0 | Sign in with ChatGPT, or an API key with additional setup |
| [OpenCode](https://opencode.ai/docs/) | Anomaly | MIT | "any LLM provider by configuring their API keys" |

Longer write-ups: [what is OpenCode](/blog/what-is-opencode/), [what is Codex](/blog/what-is-codex/) and [Claude Code alternatives](/blog/claude-code-alternatives/).

## What are the limits and what is not documented?

Our view: the biggest gap is that the public repo may not match the shipped product. `NOTICE.md` says the project does not promise every feature and promotion of the official product. Three more points from the same file:

- The shared agent execution adapter provides no default operating system sandbox.
- The standalone CLI uses `yolo` mode for `--prompt` runs when no `--mode` is given.
- The bundled Computer Use package is an unavailable placeholder.

Versions differ too. GitHub's one release is v3.14.3, with a macOS arm64 and a Windows x64 installer. The download page listed v3.14.4. The README has no benchmark figures and no model list.

## Who does ZCode suit?

Our view: ZCode suits people who already pay for a GLM Coding Plan and want Z.ai's own desktop workspace with the source open to read. The repo is under three weeks old, so for a longer public record we think OpenCode or Codex CLI is the safer first pick. We have not run ZCode: this is a reading of its documents, not a review. Our [best AI coding agents](/blog/best-ai-coding-agents/) page compares more tools.

<link rel="stylesheet" href="/blog/assets/media/what-is-zcode/motion.css"><script defer src="/blog/assets/media/what-is-zcode/motion.js"></script>
