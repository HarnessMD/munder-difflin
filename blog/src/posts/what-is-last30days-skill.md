---
title: "What is last30days? The research skill for AI agents"
description: "last30days (mvanhorn/last30days-skill) is an MIT licensed skill that researches a topic across Reddit, X, YouTube, HN and more. Install, keys, limits."
date: 2026-11-25
category: concepts
categoryLabel: Concepts
type: Technical
primaryKeyword: "last30days"
secondaryKeywords: ["what is last30days", "last30days skill", "last30days claude code", "last30days install", "last30days api keys"]
tags: ["Concepts", "Open Source", "Skills", "Claude Code"]
faq:
  - q: "Is last30days free and open source?"
    a: "Yes. The code is on GitHub at mvanhorn/last30days-skill under the MIT licence, per the GitHub API, checked 25 Nov 2026. The README says Reddit, Hacker News, Polymarket and GitHub need nothing and cost nothing. Some other sources need keys, and a few of those are paid, per the README's table."
  - q: "How do I install last30days in Claude Code?"
    a: "Per the README, run `/plugin marketplace add mvanhorn/last30days-skill`, then `/plugin install last30days`. The README calls this the recommended path, with updates through the marketplace."
  - q: "Does last30days work with Codex, Cursor or Gemini CLI?"
    a: "Yes, per the README: run `npx skills add mvanhorn/last30days-skill -g` for Codex, Cursor, Copilot, Gemini CLI \"or any of 50+ Agent Skills hosts\". Add `-a codex`, `-a cursor` or `-a gemini-cli` to pick one."
  - q: "Which last30days sources need an API key?"
    a: "Per the README, read 25 Nov 2026, Reddit, Hacker News, Polymarket, GitHub and StockTwits need nothing. X takes an `X_BEARER_TOKEN`, a browser login or another provider key. TikTok, Instagram, Threads, Pinterest and LinkedIn take a ScrapeCreators key (\"10,000 free calls, then PAYG\"), and web search takes a Brave Search key (\"2,000 free queries/month\")."
  - q: "Does last30days send my data anywhere?"
    a: "The README says the skill runs on your machine by default and no data leaves \"except to the search APIs you call\". If you set a reasoning provider key, such as `OPENAI_API_KEY`, the engine sends your topic and retrieved snippets to that provider for relevance scoring. That is opt in."
---

last30days is an open source skill for AI agents that researches what people said about a topic in the last 30 days, across Reddit, X, YouTube, Hacker News, Polymarket and the web, then writes one brief. Its [GitHub repo](https://github.com/mvanhorn/last30days-skill) is mvanhorn/last30days-skill, under the MIT licence. Checked 25 Nov 2026.

If you run AI agents, [Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. Its agents run on engines such as Claude Code, Codex and Gemini CLI, and its [README](https://github.com/HarnessMD/munder-difflin#readme) lists "MCP servers and skills", read 25 Nov 2026. The [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup.

## What is last30days?

It is a research skill: you give your agent a topic and it comes back with one brief. The [README](https://github.com/mvanhorn/last30days-skill#readme) opens with "An AI agent-led search engine scored by upvotes, likes, and real money". In the README's words: "Google aggregates editors. /last30days searches people."

The name is the window. The README says the skill "searches all of it in parallel, scores it by what real people actually engage with, and an AI agent judge synthesizes it into one brief." Techmeme results, for example, are "date-windowed to your 30 days".

<figure class="mg" data-scene="calendar"><img src="/blog/assets/media/what-is-last30days-skill/calendar.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a soft white month calendar sits under a blue header reading last 30 days. Its squares light up yellow one at a time until 30 are lit, and a lilac ring circles the newest square. A mint tag below the calendar reads one brief. Tap the calendar to clear the squares and light them again."><figcaption>last30days reads what people posted in the last 30 days and writes one brief, per the README. Read 25 Nov 2026.</figcaption></figure>

## How does last30days work?

You type a topic, the engine searches every source it can reach at once, and your agent writes the brief. The README's "How it works" list has seven steps. Our summary:

* **Topic.** A person, company, product, technology, or one thing against another.
* **Who matters.** The agent finds the X handles, subreddits, GitHub repos and YouTube channels for it.
* **Search.** "All sources searched in parallel", with "Results scored by engagement, relevance, freshness."
* **Merge.** The same story on Reddit, X and TikTok becomes "one cluster, not three separate items."
* **Brief.** "Synthesized into one brief", "Cited by source".
* **Follow up.** "After one run, your Claude session knows everything the community knows", so you can ask more questions in the same session.

"The default mode produces a fresh markdown snapshot per run," per the README, and research files save to `~/Documents/Last30Days/` unless you set `LAST30DAYS_MEMORY_DIR` or pass `--save-dir`.

<figure class="mg" data-scene="notebook"><img src="/blog/assets/media/what-is-last30days-skill/notebook.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a lilac notebook opens to a soft white page headed one brief. Blue lines write themselves down the page, and three small sky tabs on its edge read Reddit, X and YouTube. A mint stamp lands at the foot of the page reading cited by source. Tap the notebook to turn to a clean page and write it again."><figcaption>Per the README, the results are merged and synthesized into one brief, cited by source. Read 25 Nov 2026.</figcaption></figure>

## How do you install and use last30days?

In Claude Code, the README recommends the plugin marketplace ("auto-updates via marketplace"):

```
/plugin marketplace add mvanhorn/last30days-skill
/plugin install last30days
```

For Codex, Cursor, Copilot, Gemini CLI "or any of 50+ Agent Skills hosts", it gives:

```
npx skills add mvanhorn/last30days-skill -g
```

In the README's words, "`-g` installs globally for your user, available across all projects." Add `-a codex`, `-a cursor` or `-a gemini-cli` to pick one host. Update with `npx skills update last30days -g` and remove with `npx skills remove last30days -g`.

The README also lists Grok Build, claude.ai, Claude Desktop, OpenClaw and a manual `git clone`. It warns that Claude Code "does not dedupe across install methods", so "Use one install method per machine."

To run it, type the command and a topic. This example from the README asks for "a ranked discovery brief" instead of research on one topic:

```
/last30days what's trending in AI agents?
```

## What does last30days read, and what does it need?

Some sources need nothing, and others need a key or a login. The README names four that work straight away: "Zero config. Reddit, HN, Polymarket, and GitHub work immediately, and so do patent filings and careers pages when your topic is a company." Running it once starts a setup wizard for X, YouTube, TikTok, arXiv, Techmeme "and more in 30 seconds".

<figure class="mg" data-scene="binoculars"><img src="/blog/assets/media/what-is-last30days-skill/binoculars.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a pair of blue binoculars sweeps left to right across four soft white source cards labelled Reddit, Hacker News, Polymarket and GitHub. Each card glows mint as the lenses pass it, and a yellow tag above the row reads zero config. Tap a card to make the binoculars swing back and look at it again."><figcaption>Per the README, Reddit, Hacker News, Polymarket and GitHub work with zero config. Read 25 Nov 2026.</figcaption></figure>

Our selection from the README's "Bring your own keys" table, read 25 Nov 2026:

| Sources | What you need | Cost, per the README |
| --- | --- | --- |
| Reddit, HN, Polymarket, GitHub, StockTwits | Nothing | Free |
| arXiv, Techmeme, Yahoo Finance | "Free CLIs, auto-installed by first-run setup" | Free |
| X | `X_BEARER_TOKEN`, a browser login, or `XQUIK_API_KEY` / `XAI_API_KEY` | "X API credits come from your X developer project; browser cookies are free; other keys are provider-specific" |
| YouTube | `brew install yt-dlp` | Free |
| TikTok, Instagram, Threads, Pinterest, LinkedIn | ScrapeCreators key | "10,000 free calls, then PAYG" |
| Perplexity | Perplexity key, or OpenRouter key | "Pay as you go" |
| Web search | Brave Search key | "2,000 free queries/month" |

The skill itself is MIT licensed; the costs in the README sit with the sources. It also says: "Availability depends on credentials, installed tools, the topic, and explicit opt-ins."

## When does last30days help, and when should you be careful?

It helps when you want what people are saying about a topic this month, not only what search engines rank. The README's own uses include a company check "before a sales call", reading up before a meeting, comparing tools and planning a trip. The README also notes:

* **The X API reaches back about a week.** With `X_BEARER_TOKEN`, it gets "recent posts, about the last week, unless your X developer project has full-archive access".
* **Browser sessions.** X can use your browser login, and with your OK, Reddit can search "as your own logged-in Reddit account". In a source checkout, the README's `python3 skills/last30days/scripts/last30days.py --preflight` shows the "browser-cookie plan" and "planned writes" without starting research.
* **Data sent out.** "By default the skill runs entirely on your machine", and no data leaves "except to the search APIs you call". A reasoning provider key, such as `OPENAI_API_KEY`, sends "your research topic and retrieved content snippets to that provider for relevance scoring". That is opt in.
* **Publishing.** The library feed can host your briefs, but "publishing is explicit opt-in and public by default."
* **Versions.** "This README describes the current source tree; your installed version may differ."

Our view: an upvote measures attention, not accuracy, so treat the brief as a map of what people say and check any fact that matters at its source. Your agent writes the brief, so we think a run on a Claude Pro or Max plan draws on the same usage limits as any other session. Our [Max plan guide](/blog/claude-code-max-plan-tips/) covers those limits.

## How does last30days relate to our pages?

Three of our pages cover nearby ground. They are [Claude Code Skills: What They Are, Where They Live and How to Write One](/blog/claude-code-skills/), [What is Caveman? The token saving skill for coding agents](/blog/what-is-caveman/) and [What is Superpowers? The skills library for coding agents](/blog/what-is-superpowers/).

## last30days at a glance

Checked 25 Nov 2026.

| Item | Detail |
| --- | --- |
| What it is | A research skill for AI agents |
| Made by | Matt Van Horn, [mvanhorn on GitHub](https://github.com/mvanhorn) |
| Code | mvanhorn/last30days-skill on GitHub, created 23 Jan 2026 |
| Licence | MIT |
| Latest release | [v4.6.0](https://github.com/mvanhorn/last30days-skill/releases/tag/v4.6.0), 22 Nov 2026 |
| Stars | 74,877 at 16:11 UTC on 25 Nov 2026; 10th of 16 on [GitHub's trending page](https://github.com/trending) at 16:13 UTC |
| Agents named | Claude Code, Codex, Cursor, Copilot, Gemini CLI, Grok Build, OpenClaw, DeepSeek Harness "or any of 50+ Agent Skills hosts" |

<link rel="stylesheet" href="/blog/assets/media/what-is-last30days-skill/motion.css"><script defer src="/blog/assets/media/what-is-last30days-skill/motion.js"></script>
