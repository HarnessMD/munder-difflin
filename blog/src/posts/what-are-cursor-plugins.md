---
title: "What Are Cursor Plugins? The Official List and How to Add One"
seoTitle: "Cursor Plugins: What They Are and How to Add One"
description: "Cursor plugins bundle rules, skills, agents, commands, MCP servers and hooks. The official repo's README lists 150. What is in the list and how to add one."
date: 2026-11-28
category: concepts
categoryLabel: Concepts
type: Technical
primaryKeyword: "cursor plugins"
secondaryKeywords: ["cursor plugin marketplace", "cursor plugins list", "how to install cursor plugins", "cursor plugin.json", "cursor mcp plugins"]
tags: ["Concepts", "Plugins", "Cursor", "MCP", "Skills"]
faq:
  - q: "What is a Cursor plugin?"
    a: "Cursor's plugins docs say plugins \"package rules, skills, agents, commands, MCP servers, and hooks into distributable bundles.\" A Cursor Plugin is a directory with a `.cursor-plugin/plugin.json` manifest, and that manifest only requires a `name`. Checked 28 Nov 2026."
  - q: "How do I install a Cursor plugin?"
    a: "Per Cursor's plugins docs: open Customize in the sidebar, find the plugin you want to use, then select Install and choose a project or user scope. Cursor's 2.5 changelog says you can also \"install directly in the editor with /add-plugin\"."
  - q: "How many official Cursor plugins are there?"
    a: "The README table of github.com/cursor/plugins listed 150 plugins on 28 Nov 2026: 122 Integrations, 16 Developer Tools, 8 Productivity, 3 Finance and Legal and 1 Utilities. The repo's marketplace.json listed 160 entries the same day."
  - q: "Are Cursor Marketplace plugins safe to install?"
    a: "Cursor's marketplace security page says every plugin is manually reviewed before it is listed, all must be open source, and every update is reviewed. It also says \"Plugins are third-party software\" and recommends \"reviewing a plugin's source code before installing.\" Checked 28 Nov 2026."
  - q: "Do Cursor plugins work in Claude Code?"
    a: "Neither vendor's plugins page says so. Claude Code's plugins docs describe their own manifest at `.claude-plugin/plugin.json`, while a Cursor Plugin uses `.cursor-plugin/plugin.json`. Cursor's docs say Cursor also loads plugins that follow the Agent Plugins open standard. Checked 28 Nov 2026."
---

Cursor plugins are bundles that "package rules, skills, agents, commands, MCP servers, and hooks" for Cursor, per [Cursor's plugins docs](https://cursor.com/docs/plugins). The official [cursor/plugins](https://github.com/cursor/plugins) repo lists 150 plugins in its README table. Checked 28 Nov 2026.

If you run AI agents, [Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. The [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup.

## What is a Cursor plugin, and what can it bundle?

"A plugin is a directory with a manifest and its components", in Cursor's docs' words. A Cursor Plugin keeps its manifest at `.cursor-plugin/plugin.json`, and the docs say "Cursor Plugin manifests only require a `name`." The docs list six components a plugin can bundle:

| Component | What Cursor's docs say |
| --- | --- |
| Rules | "Persistent AI guidance and coding standards (`.mdc` files)" |
| Skills | "Specialized agent capabilities for complex tasks" |
| Agents | "Custom agent configurations and prompts" |
| Commands | "Agent-executable command files" |
| MCP Servers | "Model Context Protocol integrations" |
| Hooks | "Automation scripts triggered by events" |

On 28 Nov 2026 the [`create-plugin`](https://github.com/cursor/plugins/tree/main/create-plugin) manifest pointed to skills, rules and agents folders, and its README also lists a `create-plugin` command. The `thermos` manifest pointed to skills and agents. The [GitHub plugin](https://github.com/cursor/plugins/tree/main/third_party/github) pointed to an `mcp.json` file and asked for a `GITHUB_PERSONAL_ACCESS_TOKEN` variable.

Plugins arrived in Cursor 2.5 on 17 Feb 2026. The [changelog](https://cursor.com/changelog/2-5) says "This release introduces plugins for extending Cursor". Cursor also supports the [Agent Plugins](https://agent-plugins.org) open standard, which packages "portable skills and MCP servers" with a `plugin.json` at the plugin root, per Cursor's docs.

<figure class="mg" data-scene="tacklebox"><img src="/blog/assets/media/what-are-cursor-plugins/tacklebox.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a blue tackle box opens its lid and yellow trays slide out with six compartments labelled Rules, Skills, Agents, Commands, MCP Servers and Hooks. A soft white tag on the lid reads plugin.json. A lilac float bobs beside the box with the words Cursor 2.5. Tap the box to close it and open it again."><figcaption>Cursor's docs list six components a plugin can bundle, from rules to hooks. Plugins arrived in Cursor 2.5. Read 28 Nov 2026.</figcaption></figure>

## What is in the official Cursor plugins list?

The [cursor/plugins README](https://github.com/cursor/plugins#plugins) table listed 150 plugins in five categories on 28 Nov 2026. It calls them "Official Cursor plugins for popular developer tools, frameworks, and SaaS products." By the README's own Category column:

| Category | Plugins | Examples, in the README's words |
| --- | --- | --- |
| Integrations | 122 | GitHub: "Manage repos, issues, pull requests, and Actions." Playwright: "Navigate, click, screenshot, and test in a real browser." |
| Developer Tools | 16 | Create Plugin: "Scaffold and validate new agent plugins." Docs Canvas: "Render documentation as a navigable canvas." |
| Productivity | 8 | Gmail: "Search, read, draft, and manage email." Google Docs: "Read, create, and edit documents." |
| Finance and Legal | 3 | Intuit QuickBooks, FreshBooks and Campfire |
| Utilities | 1 | Teaching: "Skill mapping, practice plans, and learning retrospectives." |

The README says the root `.cursor-plugin/marketplace.json` "lists all plugins", and on 28 Nov 2026 it held 160 entries, 10 more than the table, such as `outlook`, `trello` and `beehiiv`.

The GitHub API showed 20,123 stars at 16:08 UTC on 28 Nov 2026, a creation date of 23 Jan 2026 and no licence in its licence field. The README itself ends with "License" and "MIT", and the three manifests above say "MIT".

<figure class="mg" data-scene="spicerack"><img src="/blog/assets/media/what-are-cursor-plugins/spicerack.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a sky spice rack holds soft white jars with yellow lids, labelled Integrations, Developer Tools, Productivity, Finance and Legal, and Utilities. Blue powder fills each jar in turn to its count: 122, 16, 8, 3 and 1. A lilac tag on the rack reads 150 plugins. Tap a jar to fill it again."><figcaption>The cursor/plugins README table lists 150 plugins in five categories. Read 28 Nov 2026.</figcaption></figure>

## How do you add a Cursor plugin?

Cursor's [docs](https://cursor.com/docs/plugins) give three steps, and say "the installation flow is the same" for Cursor Plugins and Agent Plugins:

1. Open **Customize** in the sidebar.
2. Find the plugin you want to use.
3. Select **Install** and choose a project or user scope.

You can browse the official ones at [cursor.com/marketplace](https://cursor.com/marketplace). The 2.5 changelog adds that you can "install directly in the editor with /add-plugin". The `create-plugin` README shows it in use:

```text
/add-plugin create-plugin
```

To test your own plugin, the docs say to put it in `~/.cursor/plugins/local/my-plugin`, then "Restart Cursor, or run **Developer: Reload Window**." On Enterprise, the **Allow Local Plugin Imports** setting "is off by default".

<figure class="mg" data-scene="charmbracelet"><img src="/blog/assets/media/what-are-cursor-plugins/charmbracelet.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a soft white bracelet chain lies flat and charms click onto it one by one: a yellow charm labelled Open Customize, a blue charm labelled Find the plugin and a mint charm labelled Install. A lilac clasp then swings between sky tags reading project and user. Tap a charm to click it on again."><figcaption>Cursor's docs: open Customize, find the plugin, select Install and choose a project or user scope. Read 28 Nov 2026.</figcaption></figure>

For teams, the docs say "Team marketplaces are available on Teams and Enterprise plans": up to 1 on Teams, unlimited on Enterprise. Admins pick an installation mode for each plugin:

* **Default Off**: "Developers can find the plugin and choose whether to install it."
* **Default On**: "The plugin is installed by default, but developers can opt out."
* **Required**: "The plugin is always installed and cannot be uninstalled."

## How do Cursor plugins compare with Claude Code plugins and skills?

Both are directories of components, but the manifests sit in different places. Claude Code's [plugins docs](https://code.claude.com/docs/en/plugins/overview) say "A Claude Code plugin is a directory of skills, agents, hooks, MCP servers, or other components that Claude Code installs and loads as one unit." Its manifest is "a JSON file at `.claude-plugin/plugin.json`". Cursor's sits at `.cursor-plugin/plugin.json`, and rules in `.mdc` files are a Cursor component.

In both tools a skill can live outside a plugin. Claude Code's docs say "Skills, subagents, hooks, and MCP servers all work on their own, without a plugin." Cursor's docs say members on Teams and Enterprise can publish a personal skill from `~/.cursor/skills/`, and "Cursor packs the skill into a plugin".

Neither plugins page says one tool loads the other's plugins. Our view: treat a Cursor plugin and a Claude Code plugin as two separate packages. Our guide to [Claude Code skills](/blog/claude-code-skills/) covers the skill side.

## How do you check a Cursor plugin before you add one?

Cursor's [marketplace security page](https://cursor.com/help/security-and-privacy/marketplace-security) says "Every plugin in the Cursor Marketplace is manually reviewed before it's listed." It says all marketplace plugins must be open source and "We manually review every plugin update". It also says "Plugins are third-party software, and installation is at the discretion and risk of the installing user", and "we recommend reviewing a plugin's source code before installing."

* **Read the source, as Cursor recommends.** Cursor's docs say components "are discovered from their default directories, or you can specify custom paths in the manifest", so `plugin.json` alone may not list every part. The GitHub plugin's manifest asks for a personal access token "with the repo scopes you want the agent to use."
* **Our view: read the hooks and MCP files first.** Hooks are "Automation scripts triggered by events", per Cursor's docs, and MCP servers connect the agent to outside tools.
* **Our view: start at project scope.** Cursor's install step offers a project or user scope, and we think project scope is the safer first pick for a new plugin.

Our guide on [how to check an agent skill before you install it](/blog/check-agent-skill-before-install/) covers the skill files inside a plugin.

## Where does Munder Difflin fit?

Cursor plugins extend Cursor. Munder Difflin is a separate desktop app whose agents can use MCP servers, skills and plugins, on engines such as Claude Code, Codex and Gemini CLI. For other tools in Cursor's space, see our [Cursor alternatives](/blog/cursor-alternatives/).

## Cursor plugins at a glance

Checked on 28 Nov 2026.

| Item | Detail |
| --- | --- |
| What they are | Bundles of rules, skills, agents, commands, MCP servers and hooks |
| Manifest | `.cursor-plugin/plugin.json`, which only requires a `name` |
| First shipped | Cursor 2.5, 17 Feb 2026 |
| Official list | 150 plugins in the cursor/plugins README table; 160 entries in marketplace.json |
| Team marketplaces | Teams and Enterprise plans |

<link rel="stylesheet" href="/blog/assets/media/what-are-cursor-plugins/motion.css"><script defer src="/blog/assets/media/what-are-cursor-plugins/motion.js"></script>
