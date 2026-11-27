---
title: "Agent Tools Today, 27 Nov 2026: Workspace MCP Servers, Crush v0.103.0 and Browser Use 1.0.9"
seoTitle: "Agent Tools Today (27 Nov 2026): Launches, Skills, MCP Servers"
description: "The top launches, skills, multi agent moves, rising repos and talking points in AI agents from 26 to 27 Nov 2026, each with its source and date."
date: 2026-11-27
category: news
categoryLabel: News
type: Non-technical
series: agent-tools-today
primaryKeyword: "agent tools today 27 nov 2026"
secondaryKeywords: ["google workspace mcp servers", "crush v0.103.0", "browser use 1.0.9", "qwen code v0.28.7", "claude-bughunter", "t3 code v0.1.13"]
tags: ["Daily Brief", "Google", "MCP", "Open Source"]
---

Agent tools today, 27 Nov 2026: Google's Workspace MCP servers reached the Hacker News front page, Crush v0.103.0 made client/server mode a config option, and Browser Use 1.0.9 can give a cloud browser a new exit IP. It covers 26 Nov 04:00 UTC to 27 Nov 04:00 UTC, checked 27 Nov. Previous edition: [26 Nov](/blog/agent-tools-today-2026-11-26/).

<figure class="mg" data-scene="bunting"><img src="/blog/assets/media/agent-tools-today-2026-11-27/bunting.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a blue string of bunting hangs between two yellow poles. Three lilac pennants on it read Workspace MCP, Crush and Browser Use. A sky breeze ripples along the string, and as it reaches each pennant, the pennant lifts, turns mint and its words brighten. Tapping a pennant stops the breeze and shows a soft white tag with the date on its own page: 24 Nov for Workspace MCP, 26 Nov for Crush and Browser Use."><figcaption>The three lead items, from their own pages dated 24 and 26 Nov 2026, read 27 Nov 2026.</figcaption></figure>

## Top 4 launches

1. **Workspace MCP servers.** Google's post of 24 Nov makes "Workspace Model Context Protocol (MCP) servers and the official Workspace CLI generally available". The hosted servers give agents tools across Gmail, Drive, Docs, Sheets, Slides, Calendar, Chat and Tasks. AI agents or similar access tools "must use Workspace MCP servers or the Workspace CLI to access Workspace data, rather than calling Workspace REST APIs directly", with technical enforcement from 1 Feb 2027. What fell in the window is a [Hacker News item](https://news.ycombinator.com/item?id=50653477) about them, posted 26 Nov at 09:44 UTC: 276 points. More in [Google Workspace MCP servers](/blog/google-workspace-mcp-servers/). [Source](https://workspaceupdates.googleblog.com/2026/11/mcp-servers-cli-standardized-usage-tiers-now-available.html)
2. **Crush v0.103.0.** Published 26 Nov at 15:56 UTC. Client/server mode is "ready to release" and turns on as an experimental option in `crushrc`, and Bash output "streams into the chat while the command runs". A security fix: that mode's server returned each workspace's full environment, "API keys and tokens included", to any client that listed workspaces, so Charm recommends upgrading if you used it. [Source](https://github.com/charmbracelet/crush/releases/tag/v0.103.0)
3. **Browser Use 1.0.9.** Published 26 Nov at 22:45 UTC. `rotate_proxy(country=None)` gives the same Browser Use cloud browser "a new exit IP", and its tabs, cookies and logins stay. On 11 sites that block cloud browsers, the notes of 26 Nov say, the pass rate went from 48% to 62%: the vendor's own figures. Claude prompt caching now works through OpenRouter and Bedrock, though Bedrock "wasn't tested live". See [Browser Use alternatives](/blog/browser-use-alternatives/). [Source](https://github.com/browser-use/browser-use/releases/tag/1.0.9)
4. **Qwen Code v0.28.6 and v0.28.7.** Published 26 Nov at 05:51 and 18:04 UTC. In [v0.28.6](https://github.com/QwenLM/qwen-code/releases/tag/v0.28.6), managed sessions can "resume after Harness crashes via cold recovery". In v0.28.7, "Mods written for Claude Code 2.1.332 now load in Qwen Code", and it "no longer detects model loops or caps tool calls". [Source](https://github.com/QwenLM/qwen-code/releases/tag/v0.28.7)

## Top 3 skills, MCP servers and plugins

1. **Claude-BugHunter.** A Claude skill bundle with 85 skills, its README says, "intended for assets you own or have written authorization to assess". Fixes to its scope checks landed on 27 Nov. 1,597 stars in a day on GitHub trending on 27 Nov, 24,813 in total; MIT. More in [what Claude-BugHunter is](/blog/what-is-claude-bughunter/). [Source](https://github.com/elementalsouls/Claude-BugHunter)
2. **App Store Compliance Playbook.** It was in the 26 Nov brief. v2.5.3, published 26 Nov at 08:35 UTC, adds 2027 Google Play dates for apps on foldables, and its notes count "117 tracked deadlines now". A commit the same day wires its guard into Kiro with `--tool kiro`. 562 stars in a day on GitHub trending on 27 Nov. See [the App Store rejection checklist](/blog/app-store-rejection-checklist/). [Source](https://github.com/mjmirza/app-store-compliance/releases/tag/v2.5.3)
3. **Cursor plugins.** "Official Cursor plugins for popular developer tools, frameworks, and SaaS products", its repo says. A pull request merged on 26 Nov at 09:04 UTC adds a folk plugin that connects agents "to folk's hosted MCP server". 270 stars in a day on GitHub trending on 27 Nov, 19,821 in total. [Source](https://github.com/cursor/plugins)

## Top 3 moves from multi agent tools

1. **Orca v1.4.278.** Published 26 Nov at 10:47 UTC. "Every Antigravity chat now uses agy", and Gemini CLI is removed, "since Google now points people to Antigravity". Six apps join its catalog, among them ClickUp, Zapier and Intercom. See [Orca alternatives](/blog/orca-alternatives/). [Source](https://github.com/stablyai/orca/releases/tag/v1.4.278)
2. **T3 Code v0.1.13.** Published 26 Nov at 19:32 UTC with "401 changes from 52 contributors". Workflow runs can link to an issue or pull request, and named pools limit concurrent runs and "queue excess work". See [T3 Code alternatives](/blog/t3-code-alternatives/). [Source](https://github.com/pingdotgg/t3code/releases/tag/v0.1.13)
3. **Plannotator v0.29.5.** Published 26 Nov at 16:56 UTC. A reply you start on a thread from another linked computer is now a draft stored there, "so every window on both computers, and a phone, sees the same draft". Decision mode "is now on for everyone". [Source](https://github.com/backnotprop/plannotator/releases/tag/v0.29.5)

## Top 2 rising repos

1. **MiniMind.** "Train your own 64M LLM from scratch in 2 hours", its repo says. Its Chinese README notes that the 2 hours is one SFT epoch on a single NVIDIA 3090. A warmup fix landed on 26 Nov. 702 stars in a day on GitHub trending on 27 Nov, 71,788 in total; Apache 2.0. [Source](https://github.com/jingyaogong/minimind)
2. **AutoClip.** Its README calls it "local-first AI clipping for podcasts, interviews, and gaming streams", with MCP for AI agents built in. Commits on 26 Nov added MCP guides in six languages. 774 stars in a day on GitHub trending on 27 Nov, 17,078 in total; MIT. [Source](https://github.com/zhouxiaoka/autoclip)

Stars can rise for reasons other than use: names to watch, not picks.

## Top 4 things people are talking about

1. **Did AI make self hosting fun again?** For Jan-Lukas Else it did, says a post of 26 Nov. Most of the infrastructure configuration in that setup lives in Git, so coding agents work on it like any other project, and the home server now makes much more use of NixOS. The owner still owns the result: an agent's changes do not absolve the owner "of the responsibility of understanding those changes". 408 points on [Hacker News](https://news.ycombinator.com/item?id=50660180), posted 26 Nov at 21:47 UTC. [Source](https://janlukas.blog/posts/ai-self-hosting)
2. **Is OpenAI in cost control mode?** The micjm post of 26 Nov argues so: in its own battle data, the post argues, Astra 6.2 and Sol 6.2 reason less and write fewer output tokens than their opponents. 301 points on [Hacker News](https://news.ycombinator.com/item?id=50652527), posted 26 Nov at 07:33 UTC. [Source](https://micjm.com/blog/openai-is-in-cost-control-mode/)
3. **Is an AMD fork of llama.cpp worth it?** The devnull.land post of 26 Nov recommends llama-cpp-rdna-boosts for AMD graphics cards, a small set of patches on llama.cpp. On the author's AMD R9700, token generation went from about 35 to 55 tokens a second and prefill from about 700 to 1,300, with the caveat "YMMV". 303 points on [Hacker News](https://news.ycombinator.com/item?id=50657265), posted 26 Nov at 17:11 UTC. See [llama.cpp 1.0](/blog/llama-cpp-1-0/). [Source](https://devnull.land/amd-specific-llama-cpp)
4. **Are Novita and StreamLake ByteDance Ark wrappers?** The kendell.dev post of 25 Nov argues so. It points to image downloads from ByteDance's cloud, ID formats and canned refusals that, the post argues, match Ark. 60 points on [Hacker News](https://news.ycombinator.com/item?id=50660273), posted 26 Nov at 21:59 UTC. [Source](https://kendell.dev/blog/arkwrapper/)

## How this list is built

We checked GitHub releases, the Hacker News front page and GitHub trending ourselves, and rechecked every item on its own page. Points and stars were checked on 27 Nov. Cline v4.1.28 and CLI v3.0.76 mostly refreshed the model catalog. LiteLLM 1.108.18 and 1.108.19 (LTS) are left out for space. OpenSRE v0.1.2026.11.27 made one fix, and Stitch skills had no commits in the window. The Decoder's item on agents in DeepMind's experiments, sourced to a podcast, is left out. For daily Claude Code use, see [Claude Code Max plan tips](/blog/claude-code-max-plan-tips/).

<link rel="stylesheet" href="/blog/assets/media/agent-tools-today-2026-11-27/motion.css"><script defer src="/blog/assets/media/agent-tools-today-2026-11-27/motion.js"></script>
