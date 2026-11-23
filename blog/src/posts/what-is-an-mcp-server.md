---
title: "What Is an MCP Server?"
description: "An MCP server gives an AI agent tools, data and prompts over one open protocol. What it is, the host, client and server roles, and where Claude Code plugs in."
date: 2026-09-11
category: concepts
categoryLabel: Concepts
type: Technical
primaryKeyword: "what is an mcp server"
secondaryKeywords: ["how does an mcp server work", "mcp server vs api", "what does mcp server mean", "what does mcp stand for", "mcp server claude code"]
tags: ["Concepts", "MCP", "Claude Code", "Getting Started"]
faq:
  - q: "What does MCP stand for?"
    a: "Model Context Protocol, the open standard an AI application uses to reach tools, data and prompt templates it does not have built in. Anthropic open sourced it on 25 November 2024, and the specification you would read today is dated 2026-07-28."
  - q: "Why use an MCP server instead of a plain API?"
    a: "A plain API needs its own client code written by hand for every application that wants to call it. An MCP server lists its own tools when a client asks, in a shape any MCP host already understands, so the same server works in Claude Code, an IDE or a chat app without custom glue for each one."
  - q: "Can an MCP server access the internet?"
    a: "Yes, if its own code does. An MCP server is an ordinary program, local or remote, and either kind can read files, run commands or call whatever APIs it is written to call. The protocol does not limit what a server can do, only how it talks to the client."
  - q: "What is an MCP server in Claude?"
    a: "The same thing as anywhere else: a program that gives Claude tools, data or prompts over MCP. Claude Code and Claude Desktop can run a local server on your machine, while a custom connector on claude.ai has to be a remote server reached over HTTP. Anthropic's connector docs also list MCP features Claude does not support yet, such as resource subscriptions, and set a different tool result limit for claude.ai than for Claude Code, so a server can behave differently from one Claude surface to the next (checked 11 Sep 2026, claude.com/docs/connectors/building)."
  - q: "Does every AI coding agent support MCP servers?"
    a: "Many do. The protocol's own site names Claude, ChatGPT, Visual Studio Code and Cursor among the applications that support it, and its architecture page names Claude Code as an example host (checked 11 Sep 2026, modelcontextprotocol.io). Support for each feature and the setup screen still vary, so check a given agent's docs before assuming a server will show up the same way."
---

<div class="callout tldr"><span class="ic">TL;DR</span><p>An <strong>MCP server</strong> is a small program that hands an AI agent tools, data or prompt templates over the <strong>Model Context Protocol</strong>, an open standard. The agent's app (the <strong>host</strong>) opens a <strong>client</strong> connection to each server it uses, the two talk in JSON-RPC over stdio or Streamable HTTP, and the server answers with whatever it was built to expose. One server, many hosts, no custom glue code.</p></div>

An MCP server is a small program that gives an AI agent access to something it doesn't have built in: a database, an issue tracker, a browser, your files. It speaks the Model Context Protocol, an open standard, so any compliant AI application can connect the same way, without custom code to wire each one up.

Google's A2UI 1.0, released 11 Nov 2026, has web and Flutter renderers that work inside MCP Apps, as our [A2UI explainer](/blog/what-is-a2ui/) covers; to run several agents side by side, see our [Herdr alternatives](/blog/herdr-alternatives/) guide.

If you already use one AI coding CLI, this layer matters more once you run several agents at once in a [multi-agent harness](/blog/what-is-a-multi-agent-harness/), because each agent reaches its databases and issue trackers through the servers it has been given, and which agent gets which server becomes your call.

## What is an MCP server?

It's a program that exposes tools, data or prompt templates to an AI application over the Model Context Protocol. The protocol's own site describes it as an open standard for connecting AI applications to external systems (checked 11 Sep 2026, [modelcontextprotocol.io](https://modelcontextprotocol.io/docs/2026-07-28/getting-started/intro)). Anthropic open sourced MCP on 25 November 2024 (checked 11 Sep 2026, [Introducing the Model Context Protocol](https://www.anthropic.com/news/model-context-protocol)), and it's grown well past Anthropic's own tools since: the protocol's own site names ChatGPT, Visual Studio Code and Cursor among the applications that support it.

The official framing is a USB-C port for AI applications: one connector shape instead of a different adapter for every device. It's a fair comparison, and a relief if you remember the drawer full of proprietary chargers that preceded USB-C.

{% img "note-1" %}

## How does an MCP server work?

Three roles do the work: a host, a client and a server. The **host** is the AI application, Claude Code or Claude Desktop, say. It opens one **client** for every server it connects to, and each client keeps a dedicated connection to its server (checked 11 Sep 2026, [MCP architecture](https://modelcontextprotocol.io/docs/2026-07-28/learn/architecture)). Client and server exchange JSON-RPC 2.0 messages, and the spec says MCP takes some inspiration from the Language Server Protocol that editors use for programming languages (checked 11 Sep 2026, [MCP specification](https://modelcontextprotocol.io/specification/2026-07-28)). Those messages travel over one of two transports: stdio for a server running as a local process, or Streamable HTTP for one running remotely, which typically serves many clients at once.

A client can ask a server which protocol versions and features it supports with one `server/discover` request, then fetch the actual tools, resources and prompts with `tools/list`, `resources/list` and `prompts/list`, and those lists can change while you work (checked 11 Sep 2026, [MCP architecture](https://modelcontextprotocol.io/docs/2026-07-28/learn/architecture)).

## What does an MCP server actually give an agent?

Three things, formally called primitives: tools, resources and prompts. **Tools** are functions the agent can call to do something, like running a query or filing a ticket. **Resources** are data the agent can read for context, like a file's contents or a database record. **Prompts** are ready made templates the user picks, often shown as slash commands ([MCP server concepts](https://modelcontextprotocol.io/docs/2026-07-28/learn/server-concepts)), so a server can ship its own few-shot examples alongside its tools (checked 11 Sep 2026, [MCP architecture](https://modelcontextprotocol.io/docs/2026-07-28/learn/architecture)).

Claude Code is one MCP host among several, and not every host handles all three: client and server each declare what they support, so check your client's docs (checked 11 Sep 2026, [MCP architecture](https://modelcontextprotocol.io/docs/2026-07-28/learn/architecture)). Here's the Claude Code command that manages those servers from the client side, checked on 11 Sep 2026:

```bash
$ claude --version
2.1.268 (Claude Code)

$ claude mcp --help
Usage: claude mcp [options] [command]

Configure and manage MCP servers

Options:
  -h, --help                            Display help for command

Commands:
  add [options] <name> <commandOrUrl> [args...]  Add an MCP server to Claude Code.
  ...
  list                                  List configured MCP servers. Unapproved
                                        .mcp.json servers are shown as ⏸ Pending
                                        approval and not connected to; approved
                                        servers are health-checked unless
                                        disabled for this project.
  ...
  remove [options] <name>               Remove an MCP server
  ...
  serve [options]                       Start the Claude Code MCP server
```

The full help screen lists eleven subcommands and `add`'s own usage examples; this excerpt cuts to what matters here (the `...` lines mark where). `add` is the client side, wiring a server in; `list` shows what's configured and health-checks the approved servers; `serve` runs Claude Code itself as a server, the same binary on both ends of the protocol. For the actual walkthrough, [adding an MCP server to Claude Code](/blog/how-to-add-an-mcp-server-to-claude-code/) covers the scope flag, the `.mcp.json` file it writes and how to pass an API key.

{% img "note-2" %}

## What is the difference between an MCP server and an API?

An API is a fixed contract you integrate against by reading its docs and writing client code once, for that one API. An MCP server lists its own tools for any client that asks, in a shape every MCP host already understands, so the same server plugs into Claude Code, an IDE or a chat app with no per app glue. Underneath, many MCP servers wrap an existing API; MCP is the layer that makes the tool discoverable and callable by a model without you writing that translation each time.

## Does an MCP server run locally, or does it need the internet?

Either, and the choice belongs to the server, not the protocol. A local server using the stdio transport runs on your own machine, commonly one client at a time, with no network hop at all, which is how the filesystem or a local database server usually ships. A remote server using Streamable HTTP runs on someone else's infrastructure and can serve many clients at once, the way a hosted issue tracker or CRM server would (checked 11 Sep 2026, [MCP architecture](https://modelcontextprotocol.io/docs/2026-07-28/learn/architecture)).

Whichever way a server runs, the spec says descriptions of tool behavior "should be considered untrusted, unless obtained from a trusted server" (checked 11 Sep 2026, [MCP specification](https://modelcontextprotocol.io/specification/2026-07-28)). That's exactly the opening [MCP's known attacks](/blog/mcp-security-tool-poisoning/) work through, so approve a server because you've read what it does, not on reflex.

In Munder Difflin 0.5.2, Pro's Capabilities screen gives each server an on or off switch per Claude Code agent, and a server rated write or secret stays off until you turn it on yourself. The grant reaches Claude Code agents only, so Codex and the other CLIs on the floor don't get servers from it. MCP itself doesn't need Munder Difflin: `claude mcp add` is Claude Code's own command, and MCP is an open standard either way. [Download Munder Difflin](https://munderdiffl.in/download) for the free classic office, or see [what Pro adds](https://munderdiffl.in/#pricing) for per-agent control over servers like these.
