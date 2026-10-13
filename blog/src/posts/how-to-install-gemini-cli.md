---
title: "How to Install Gemini CLI, and Can It Use Gemini 4 Yet?"
description: "Install Gemini CLI 0.62.0 with one npm command, see which sign ins still work after 18 Jun 2026, and why Gemini 4 Argon isn't in it yet."
date: 2026-09-15
updated: 2026-10-02
category: guides
categoryLabel: Guides
type: Technical
primaryKeyword: "how to install gemini cli"
secondaryKeywords: ["gemini cli install", "how to install gemini cli on windows", "gemini cli install npm", "does gemini cli still work", "gemini 4", "gemini cli gemini 4"]
tags: ["Guides", "Getting Started", "CLI Agents", "Engines", "Open Source"]
faq:
  - q: "Does Gemini CLI still work in 2026?"
    a: "Yes, for some accounts. Google's announcement of 19 May 2026 said Gemini CLI would stop serving free, Google AI Pro and Ultra users on 18 Jun 2026, while paid API keys and Gemini Code Assist Standard or Enterprise licences keep working. The project is still shipping: stable release 0.62.0 came out on 29 Sep 2026 and nightly builds land almost every day."
  - q: "Can I use Gemini 4 Argon in Gemini CLI?"
    a: "Not as of 2 Oct 2026. Google announced Gemini 4 Argon on 30 Sep 2026 but is rolling it out first to approved cyber defenders, with paid API customers and AI Ultra subscribers next and no date given. There is no public model ID yet, and Gemini CLI's source has no Gemini 4 entry. When an ID ships, a paid API key is the likeliest route, since Ultra sign ins no longer work in Gemini CLI."
  - q: "Is Gemini CLI free?"
    a: "The software is open source under Apache 2.0, but free use of Google's models through it largely ended on 18 Jun 2026. Google's quota page still lists an unpaid API key tier of 250 requests a day on Flash models, yet the transition announcement only promises paid keys. If your work depends on it, plan on a paid key or a work licence."
  - q: "What Node version does Gemini CLI need?"
    a: "Node 20 or newer. Google's installation page lists Node 20.0.0, and the npm package's engines field read >=20 when we checked on 2 Oct 2026. The Homebrew formula and the MacPorts port both pull in Node for you."
  - q: "What is the difference between Gemini CLI and Antigravity CLI?"
    a: "Gemini CLI is the open source agent you install from npm as @google/gemini-cli and start with gemini. Antigravity CLI is the newer Google tool, started with agy, that Google moved unpaid and Google One users to on 18 Jun 2026. Homebrew now points gemini-cli users at an antigravity-cli cask, but the two are separate products."
---

To install Gemini CLI, get Node 20 or newer, run `npm install -g @google/gemini-cli`, then type `gemini` in a project folder and sign in. Since 18 Jun 2026 Google no longer serves free, AI Pro or Ultra accounts in it, so you need a paid API key, Vertex AI or a work licence. Gemini 4 isn't in it yet.

This is Google's open source terminal agent, published on npm as `@google/gemini-cli` under Apache 2.0. It is not Antigravity CLI (`agy`), the tool Google moved individual users to, and it is not the Gemini app. The latest stable release is 0.62.0, published on 29 Sep 2026.

You can install it and keep it current by hand, or use [Munder Difflin](https://harnessmd.com/download), a free and open source desktop app that runs Gemini CLI agents next to Claude Code, Codex and other CLIs in one office. Gemini CLI is a built-in engine. Start a Gemini agent on a machine without `gemini` and the app runs `npm install -g @google/gemini-cli` in that agent's terminal, tries to install Node first if npm is missing or its Node is older than 20, then relaunches the agent. The app's hook bridge goes into a per agent settings file, so your own `~/.gemini/settings.json` is left alone. It can't restore access Google has stopped serving, though. The [Munder Difflin install guide](/blog/how-to-install-and-use-munder-difflin/) walks through setup.

## Who can still use Gemini CLI after June 2026?

Organisations on a Gemini Code Assist Standard or Enterprise licence can, and so can anyone paying for API access, including Vertex AI, which Google now calls [Gemini Enterprise Agent Platform](https://cloud.google.com/products/gemini-enterprise-agent-platform). [Google's announcement of 19 May 2026](https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/) said that on 18 Jun 2026 Gemini CLI would "stop serving requests for Google AI Pro and Ultra, as well as those using it free of charge", and that it "will remain accessible via paid Gemini and Gemini Enterprise Agent Platform API keys". The docs now carry a banner saying it "was replaced by Antigravity CLI on June 18th, 2026" for unpaid and Google One users.

The [quota page](https://geminicli.com/docs/resources/quota-and-pricing/) and the README still advertise 1,000 free requests a day for a personal sign in. That is history. The page also lists an unpaid API key tier on Flash, but the announcement only names paid keys, so don't build on it. Individuals on AI Pro or Ultra are pointed to Antigravity CLI, and [Claude Code vs Antigravity](/blog/claude-code-vs-antigravity/) covers that tool.

## Can Gemini CLI use Gemini 4?

No, not as of 2 Oct 2026. Google [announced Gemini 4 Argon](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-4-argon/) on 30 Sep 2026 and is rolling it out first to "a set of trusted cyber defenders" through its Fairwind Program, then to paid API customers and Google AI Ultra subscribers, with no date. There is no public model ID. The [Gemini API models page](https://ai.google.dev/gemini-api/docs/models), updated 1 Oct 2026, tops out at `gemini-3.8-flash`, and Gemini CLI's main branch had no Gemini 4 entry on 2 Oct. Its `/model` dialog offers Auto and Manual.

When an ID ships, you pick it with `gemini --model <id>`, the `GEMINI_MODEL` variable, `model.name` in `settings.json`, or Manual under `/model`. The likely path is a paid API key: Ultra is on Google's list, but Ultra sign ins no longer work in Gemini CLI. Don't guess the string: until a September fix ([issue #28859](https://github.com/google-gemini/gemini-cli/issues/28859)), any `gemini-X.Y-flash` ID, real or made up, was quietly served by `gemini-3.5-flash`. Run `gemini -m <id> -p "say ok" --output-format json` and read `stats.models` to see which model actually replied.

## How do I install Gemini CLI with npm?

Check Node is 20 or newer, then install globally:

```bash
node --version
npm install -g @google/gemini-cli
gemini --version
```

Node 20 is the floor on [Google's installation page](https://geminicli.com/docs/get-started/installation/) and in the package's `engines` field. The June change didn't stop releases. Here are GitHub and npm on 2 Oct 2026:

```text
$ gh api 'repos/google-gemini/gemini-cli/releases?per_page=3' --jq '.[]|[.tag_name,.published_at]'
["v0.64.0-nightly.20261002.gc9096a847","2026-10-02T01:33:21Z"]
["v0.64.0-nightly.20261001.gc6bccb7ec","2026-10-01T01:34:16Z"]
["v0.64.0-nightly.20260930.g38700b4b3","2026-09-30T01:33:55Z"]
$ npm view @google/gemini-cli version engines.node
version = '0.62.0'
engines.node = '>=20'
```

The same page lists MacPorts (`sudo port install gemini-cli`), a conda environment for locked down machines, and `npx @google/gemini-cli` to try it without installing. Stable releases land on the `latest` tag, `@preview` sits one minor ahead, and `@nightly` ships almost every day, for people who enjoy surprises.

{% img "note-1" %}

## Why is brew install gemini-cli stuck on an old version?

Homebrew deprecated its `gemini-cli` formula on 18 Jun 2026 as not supported upstream, and it is still at 0.46.0. Google's installation page still lists `brew install gemini-cli`, but that page was last updated on 14 May 2026. Here is the Mac this post was written on, checked again on 2 Oct 2026:

```text
$ which -a gemini
/opt/homebrew/bin/gemini
$ gemini --version
0.46.0
$ brew info gemini-cli
==> gemini-cli: stable 0.46.0 (bottled)
Interact with Google Gemini AI models from the command-line
https://geminicli.com
Deprecated because it is not supported upstream! It will be disabled on 2026-12-18.
Replacement:
  brew install --cask antigravity-cli
```

That leaves this machine sixteen minor versions behind npm. That replacement cask is a different product. To stay on Gemini CLI, run `brew uninstall gemini-cli` and use the npm command above.

## How do I install Gemini CLI on Windows?

Use npm in PowerShell. Google's recommended specs name Windows 11 24H2 or newer, Node 20 and PowerShell; Windows 10 isn't on that list. Install Node, open a fresh PowerShell window, and run the same `npm install -g @google/gemini-cli`.

For a session API key, the authentication doc gives `$env:GEMINI_API_KEY="YOUR_GEMINI_API_KEY"`. To keep it, put the variable in `%USERPROFILE%\.gemini\.env`.

## How do I sign in to Gemini CLI?

Run `gemini` in a project folder and choose Sign in with Google, Use Gemini API key, or Vertex AI. [Google's authentication doc](https://geminicli.com/docs/get-started/authentication/), last updated 18 Sep 2026, says the Google option opens a browser and caches your credentials. Since June that route is for organisation accounts with a Code Assist Standard or Enterprise licence, which also need a Google Cloud project set.

{% img "note-2" %}

For a key from Google AI Studio, set it and start the CLI, then pick the API key option:

```bash
export GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
gemini
```

Vertex AI needs `GOOGLE_CLOUD_PROJECT` and `GOOGLE_CLOUD_LOCATION` set, plus one of `gcloud auth application-default login`, a service account JSON key, or a Google Cloud API key. Headless runs with `-p` reuse cached credentials or need those variables.

## How do I update or uninstall Gemini CLI?

Reinstall with the `latest` tag to update, and uninstall with npm:

```bash
npm install -g @google/gemini-cli@latest
npm uninstall -g @google/gemini-cli
```

The [configuration reference](https://geminicli.com/docs/reference/configuration/) lists `general.enableAutoUpdate`, on by default, but compare `gemini --version` with npm now and then anyway. If it still shows an old number after updating, `which -a gemini` lists every copy on your `PATH` in the order your shell tries them, which is how you spot a leftover Homebrew copy shadowing a fresh npm one.

Running Codex too? [How to install Codex CLI](/blog/how-to-install-codex-cli/) covers OpenAI's agent and its sign in quirks. Comparing tools? See [Gemini CLI vs Claude Code](/blog/gemini-cli-vs-claude-code/).
