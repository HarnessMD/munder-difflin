---
title: "Agent Tools Today, 4 Oct 2026: You should Know, OpenClaw's Android Wait, Codex Wish List"
seoTitle: "Agent Tools Today (4 Oct 2026): Launches, Skills, MCP Servers"
description: "The top 5 launches, skills and plugins, multi agent moves, rising repos and arguments in coding agents on 4 Oct 2026, each with its source."
date: 2026-10-04
category: news
categoryLabel: News
type: Non-technical
series: agent-tools-today
primaryKeyword: "agent tools today 4 oct 2026"
secondaryKeywords: ["you should know plugin", "openclaw android", "codex wish list", "kolibri model", "nvidia agent skills"]
tags: ["Daily Brief", "Claude Code", "Codex", "Skills", "Open Source"]
---

Agent tools today, 4 Oct 2026, in one line: the builders asked in public. Tibo, who works on Codex at OpenAI, asked users what is missing, OpenClaw's creator asked Google for help, and Anthropic shipped a plugin that tells you what you missed. Every number was read on 4 Oct. Yesterday's edition is [here](/blog/agent-tools-today-2026-10-03/).

## Top 5 launches

1. **You should Know.** Anthropic added a built in Claude Code plugin that scans Claude's output for important information you might miss. Enable it with `/plugin enable cc-plugin-you-should-know@builtin`. The post had 15,199 likes and 1,435,171 views. [Source](https://x.com/ClaudeDevs/status/2106118517447876618)
2. **Kolibri.** Aleph Alpha released an English and German open weight model on 3 Oct: 78B total parameters, 3B active, context up to 1M tokens, Apache 2.0, weights on Hugging Face. 627 points on Hacker News. [Source](https://aleph-alpha.com/en/blog/kolibri-has-landed-a-sovereign-open-weight-model/)
3. **OpenAI Agents API, weekly update.** OpenAI's developer account quoted Steven Coffey's list of the week's changes: a browser plus agent from one API call, Bedrock Managed Agents on AWS, and light or large hosted environments. 474 likes. [Source](https://x.com/OpenAIDevs/status/2106176799545970710)
4. **Muse Gadgets.** Open source hardware for Muse, from Meta, that you build yourself: program an ESP32 board or set up a Raspberry Pi with the SDKs, then connect displays, buttons and sensors. 246 points on Hacker News. [Source](https://gadgets.muse.ai)
5. **Claude Frontier Academy.** Anthropic said on 2 Oct 2026 that it is putting $100 million behind training 10,000 Frontier Deployed Engineers by the end of 2027. First cohorts come from Accenture, Deloitte, McKinsey and others. [Source](https://www.anthropic.com/news/claude-frontier-academy)

## Top 5 skills, MCP servers and plugins

1. **NVIDIA Agent Skills.** NVIDIA's catalog of verified skills for Claude Code, Codex and other coding agents, covering robotics, simulation, CUDA libraries and RAG. Install with `npx skills add nvidia/skills`. Apache 2.0, 3,519 stars. [Source](https://github.com/NVIDIA/skills)
2. **text-to-cad.** A library of agent skills for generating, inspecting and slicing CAD and robot description files. Version 0.7.11 on 3 Oct added a Cursor plugin. MIT, 16,700 stars. [Source](https://github.com/earthtojake/text-to-cad)
3. **logo-design-skill.** A skill that walks an agent from a brief to production ready SVG logos, with a reference library of more than 1,400 real logos and Python tools to test the result. MIT, 1,800 stars. [Source](https://github.com/kaankiziltug/logo-design-skill)
4. **herdr web ui.** A browser and phone client that installs as a herdr plugin, so you can read and reply to agent sessions running on your computer. MIT, 433 stars. [Source](https://github.com/devswha/herdr-web-ui)
5. **filecoin-clawdi.** A skill that seals an agent's working context and stores it on Filecoin so another agent can verify it and resume. It runs on Filecoin's Calibration testnet and has 1 star. There is no licence file; the README says Apache 2.0 or MIT, as declared in each skill. [Source](https://github.com/FIL-Builders/filecoin-clawdi)

## Top 5 moves from multi agent tools

1. **OpenClaw.** Creator Peter Steinberger said the OpenClaw Android app has been in review for over a week, and asked if anyone at Google could help. 7,314 likes and 1,273,032 views. [Source](https://x.com/steipete/status/2106446147791597774)
2. **Munder Difflin.** [Munder Difflin](https://harnessmd.com/download), free and open source: no new release today. The latest is v0.5.5, from 1 Oct. [Source](https://github.com/HarnessMD/munder-difflin/releases)
3. **Pi.** Two patch releases after 1.0: v1.0.1 on 3 Oct added a Nix flake and per project overrides for MCP servers, and v1.0.2 on 4 Oct added sampling settings per thinking level. Background: [what is Pi agent](/blog/what-is-pi-agent/). [Source](https://github.com/earendil-works/pi/releases)
4. **Orca.** Release v1.4.220 on 4 Oct. In the experimental native chat, the Stop button now ends Claude's process, including background commands and subagents. [Source](https://github.com/stablyai/orca/releases/tag/v1.4.220)
5. **Cline.** Cline said Ling 3.1 Flash is now available in Cline and free until 13 Oct. 346 likes. [Source](https://x.com/cline/status/2106470199415456151)

## Top 5 rising repos

1. **ds4 (DwarfStar).** A small native inference engine from Redis creator Salvatore Sanfilippo for running a few large open models on hardware people can own, starting with DeepSeek V4 Flash. MIT, 23,304 stars, 353 points on Hacker News. [Source](https://github.com/antirez/ds4)
2. **claude-swap.** Switches between several Claude Code accounts without logging out, with a usage dashboard and rotation before a rate limit. MIT, 3,051 stars. [Source](https://github.com/realiti4/claude-swap)
3. **Open Dot.** An open source take on OpenAI's Dots that runs on your Mac with your own OpenAI key or open models through OpenRouter. Created on 29 Sep, 540 stars, no licence file yet. [Source](https://github.com/composio-community/open-dot)
4. **Herdr GPUI.** A native Rust client for a Herdr daemon, not affiliated with Herdr. Release v20261003.1 added scrollback search and images in the terminal. Apache 2.0, 517 stars. [Source](https://github.com/penso/herdr-gpui)
5. **Bloks.** A local first desktop workspace that looks like a messaging app, where each agent is a contact and each room is a group chat. 147 stars. Licence is FSL-1.1-MIT (Functional Source License), which is source available, not a standard open source licence. [Source](https://github.com/hamedgitty/bloks)

New repos can gain stars quickly for reasons other than use, so treat these as names to watch, not recommendations.

## Top 5 things people are arguing about

1. **What is missing in Codex?** Tibo, who works on Codex and ChatGPT at OpenAI, asked for the one thing users wish it had. The post drew 7,683 replies and 5,261 likes. Background: [what is Codex](/blog/what-is-codex/). [Source](https://x.com/thsottiaux/status/2106439068557144179)
2. **Hard budget caps.** Simon Willison argued that pay by usage services need hard spending limits on by default, because agents make it easy to start things that cost money. 508 points on Hacker News. [Source](https://simonwillison.net/2026/Oct/3/default-hard-budget-caps/)
3. **Memory or documentation?** Kevin Liao's essay says memory plugins are similarity search over snippets, and that agents need written documentation. 253 points on Hacker News. [Source](https://liao.gg/blog/agents-dont-need-memory)
4. **Dots or Codex?** OpenAI's Dominik Kundel answered the question by saying they work great together. OpenAI's developer account quoted him and added that a dot coordinates Codex tasks and flags what needs your attention. 779 likes. Background: [what is ChatGPT Dots](/blog/what-is-chatgpt-dots/). [Source](https://x.com/OpenAIDevs/status/2106152299026661641)
5. **"There is no moat."** Pi's Mario Zechner built a phone agent on Pi Durable in a day and said it beats the vendor Android apps. He calls it a personal project, not an Earendil product. 495 likes. [Source](https://x.com/badlogicgames/status/2106452296087302173)

## How this list is built

Each day our agents read GitHub releases and trending pages, the Hacker News front page, and the top posts on X about coding agents. A name only makes a list with a link that was opened and a signal that can be shown: points, stars, likes or views. Repos are checked against the GitHub API before they appear, and rumours about unreleased models are left out. New here? The [install guide](/blog/how-to-install-and-use-munder-difflin/) is the place to start.
