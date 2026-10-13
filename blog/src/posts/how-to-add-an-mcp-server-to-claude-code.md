---
title: "Claude Code MCP Servers: How to Add One, Scopes and .mcp.json"
description: "Add Claude Code MCP servers with claude mcp add: transports, scopes, --env and --header, .mcp.json, OAuth sign in and output limits. Checked 29 Sep 2026."
date: 2026-09-10
updated: 2026-09-29
category: guides
categoryLabel: Guides
type: Technical
primaryKeyword: "claude code mcp servers"
secondaryKeywords: ["claude code mcp", "claude code mcp add", "claude code mcp json", "claude code mcp config file", "claude mcp add transport", "claude code mcp servers global"]
tags: ["Guides", "MCP", "Claude Code", "Getting Started"]
faq:
  - q: "How do I add an MCP server to Claude Code?"
    a: "Run claude mcp add from your terminal, not inside a session. For a hosted server use --transport http, a name and the URL. For a local server give a name, then the double dash separator, then the command that starts it. Check the result with claude mcp list."
  - q: "Where is the Claude Code MCP config file?"
    a: "Local and user scoped servers live in ~/.claude.json: local ones under the entry for the project, user ones under the top level mcpServers key. Project scoped servers live in .mcp.json at the project root, which you commit. Claude Code does not read ~/.claude/mcp.json or ~/.claude/.mcp.json."
  - q: "How do I add an MCP server to Claude Code globally?"
    a: "Add it with --scope user. It is then active in every project you open and stays private to you. A server's scope is fixed when you add it, so to move one you remove it and add it again at the new scope."
  - q: "Is the SSE transport still supported in Claude Code?"
    a: "It still works but is deprecated. The MCP specification replaced HTTP+SSE with Streamable HTTP in its 2025-03-26 revision, and Claude Code's docs say to use --transport http. Since Claude Code 2.1.265, an http entry falls back to SSE on its own when a server only speaks the old transport."
  - q: "Why does my MCP server show Pending approval?"
    a: "It comes from a project's .mcp.json and you have not approved it yet. Claude Code asks before it starts a server a cloned repository defines, so run claude in that folder and accept the prompt, or approve it later from /mcp."
---

<div class="callout tldr"><span class="ic">TL;DR</span><p>Hosted server: <code>claude mcp add --transport http &lt;name&gt; &lt;url&gt;</code>. Local server: <code>claude mcp add &lt;name&gt;</code>, the double dash separator, then the launch command. Add <code>--scope user</code> for every project or <code>--scope project</code> to share through <code>.mcp.json</code>. SSE is deprecated; use <code>http</code>. Check with <code>claude mcp list</code>, sign in with <code>/mcp</code>. Checked on Claude Code 2.1.284, 29 Sep 2026.</p></div>

You add Claude Code MCP servers with `claude mcp add`: a name, then a URL for a hosted server or a launch command for a local one. The server lands in one of three scopes, and `claude mcp list` tells you whether it connected.

You can do all of this by hand, or use [Munder Difflin](https://harnessmd.com/download), free and open source, which writes a default set of MCP servers into every Claude Code agent it starts ([install guide](/blog/how-to-install-and-use-munder-difflin/)). The rest of this guide is the by hand route, checked against [Anthropic's MCP docs](https://code.claude.com/docs/en/mcp) on 29 Sep 2026. If you want the concept first, read [what an MCP server is](/blog/what-is-an-mcp-server/).

## Claude Code MCP commands at a glance

These are the commands you will actually use on Claude Code 2.1.284, checked on 29 Sep 2026 against `claude mcp --help` and the docs.

| Task | Command |
| --- | --- |
| Add a hosted server | `claude mcp add --transport http <name> <url>` |
| Add a local server | `claude mcp add <name> -- <command> [args...]` |
| Pass an environment variable | `--env KEY=value` or `-e`, before the `--` |
| Pass a header | `--header "Authorization: Bearer <token>"` or `-H` |
| Pick a scope | `--scope local` (default), `project` or `user`, or `-s` |
| Add from a JSON blob | `claude mcp add-json <name> '<json>'` |
| Copy servers from Claude Desktop | `claude mcp add-from-claude-desktop` (macOS and WSL) |
| Check status | `claude mcp list`, `claude mcp get <name>` |
| Remove | `claude mcp remove <name> --scope <scope>` |
| Sign in from the shell | `claude mcp login <name>`, `claude mcp logout <name>` |
| Manage inside a session | `/mcp`, `/mcp reconnect all` |
| Forget project approvals | `claude mcp reset-project-choices` |

## How do you add an MCP server to Claude Code?

Run `claude mcp add` in your terminal, outside a session, and everything Claude Code needs to know goes before the `--`. Everything after it is passed to the server untouched. Here is a real run from a throwaway folder on 29 Sep 2026, using the MCP project's reference test server:

```bash
$ claude --version
2.1.284 (Claude Code)

$ claude mcp add --scope project everything -- npx -y @modelcontextprotocol/server-everything
Added stdio MCP server everything with command: npx -y @modelcontextprotocol/server-everything to project config
File modified: <your folder>/mcp-demo/.mcp.json

$ claude mcp get everything
everything:
  Scope: Project config (shared via .mcp.json)
  Status: ⏸ Pending approval (run `claude` to approve)
  Type: stdio
  Command: npx
  Args: -y @modelcontextprotocol/server-everything
  Environment:

To remove this server, run: claude mcp remove everything -s project
```

Forget the `--` and the add fails at once with `error: unknown option '-y'`. The `Pending approval` status is correct for a project scoped server: Claude Code will not start a process a repository defines until you say yes in an interactive session.

For a hosted server the shape is the same without the separator: `claude mcp add --transport http sentry https://mcp.sentry.dev/mcp`, the example `claude mcp --help` prints.

{% img "note-1" %}

## Which transport should you use: stdio, HTTP or SSE?

Use `stdio` for a program on your machine and `http` for anything at a URL. The current MCP specification, revision 2026-07-28, defines exactly two standard transports: stdio and Streamable HTTP ([MCP transports](https://modelcontextprotocol.io/specification/latest/basic/transports), checked 29 Sep 2026).

The old HTTP+SSE transport is deprecated. The spec's [deprecated features registry](https://modelcontextprotocol.io/specification/2026-07-28/deprecated) lists it as deprecated since 2025-03-26 and names Streamable HTTP as the replacement. Claude Code still accepts `--transport sse`, but its docs mark it deprecated, and since 2.1.265 (8 Sep 2026) an `http` entry falls back to SSE by itself when a server only speaks the old transport.

Two details trip people up. In `.mcp.json`, `"type": "streamable-http"` is accepted as an alias for `"http"`, so JSON copied from a server's README works. And WebSocket (`"type": "ws"`) can only be added through `.mcp.json` or `claude mcp add-json`, because `--transport` does not accept `ws`.

## Where does Claude Code store MCP servers?

In two files, split three ways by the `--scope` flag. The default is local.

| Scope | File | Who gets it |
| --- | --- | --- |
| `local` (default) | `~/.claude.json`, under this project's path | You, this project only |
| `project` | `.mcp.json` in the project root | Everyone who clones the repo |
| `user` | `~/.claude.json`, top level `mcpServers` key | You, every project |

That table is the answer to "how do I add an MCP server globally": use `--scope user`. When the same name exists in more than one place, local wins over project, project over user, and the whole entry comes from the winner; fields are not merged. Scope is fixed at add time, so moving a server means `claude mcp remove <name> --scope local` and adding it again. Claude Code does not read `~/.claude/mcp.json`, `~/.claude/.mcp.json` or `~/.claude/config/mcp.json`, so a server written there never appears.

## How do you pass an API key or a header?

Use `--env KEY=value` for a local server and `--header "Name: value"` for a hosted one. Both accept several values. The catch with `--env` is order: it swallows every `KEY=value` that follows, so if the server name comes straight after it, the name gets read as a malformed pair. We hit exactly that on 29 Sep 2026:

```bash
$ claude mcp add --scope project --env DEMO_KEY=abc123 demo-env -- npx -y @modelcontextprotocol/server-everything
Invalid environment variable format: demo-env, environment variables should be added as: -e KEY1=value1 -e KEY2=value2

$ claude mcp add --scope project --env DEMO_KEY=abc123 --transport stdio demo-env -- npx -y @modelcontextprotocol/server-everything
Added stdio MCP server demo-env with command: npx -y @modelcontextprotocol/server-everything to project config
File modified: <your folder>/mcp-demo/.mcp.json
```

Any other option between `--env` and the name fixes it, as the docs recommend. One more rule: in a remote server's `url` and `headers`, Claude Code reads its own credential variables such as `ANTHROPIC_API_KEY` as empty, so a shared `.mcp.json` cannot ship your key to a stranger's server.

## How do you edit .mcp.json by hand?

Write an `mcpServers` object where each key is a server name. This is the `demo-env` entry the second add wrote, and it is the format for all three scopes:

```json
{
  "mcpServers": {
    "demo-env": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-everything"],
      "env": { "DEMO_KEY": "abc123" }
    }
  }
}
```

For a hosted server use `"type": "http"` and a `url`. Always set `type` on a URL entry: without it Claude Code treats the entry as stdio, skips it and says so. For secrets, commit `${API_KEY}` or `${API_KEY:-fallback}` rather than the key; expansion works in `command`, `args`, `env`, `url` and `headers`. Claude Code reads `.mcp.json` when a session starts, so restart after editing. Approve servers because you read what they do: tool descriptions are text Claude trusts, which is how [tool poisoning](/blog/mcp-security-tool-poisoning/) works.

{% img "note-2" %}

## How do you sign in to a remote MCP server with OAuth?

Add the URL with no credentials, then authenticate from `/mcp` inside a session or `claude mcp login <name>` from the shell. Until then `claude mcp list` shows `! Needs authentication`, which is expected. `claude mcp login` arrived in 2.1.186 (22 Jun 2026) and has `--no-browser` for SSH sessions, where you paste the redirect URL back by hand.

Servers without dynamic client registration take `--client-id`, `--client-secret` (it prompts with masked input, or reads `MCP_CLIENT_SECRET`) and `--callback-port`, which fixes the redirect to `http://localhost:PORT/callback`. These flags only apply to HTTP and SSE servers.

## How much output can an MCP tool return?

Claude Code warns when one tool result passes 10,000 tokens and cuts it at 25,000 by default. Raise the cap with `MAX_MCP_OUTPUT_TOKENS=50000 claude`; the warning threshold stays fixed. A server author can instead set `_meta["anthropic/maxResultSizeChars"]` on a tool, up to 500,000 characters, for text results. Other variables worth knowing, all from the docs on 29 Sep 2026:

* `MCP_TIMEOUT`: server startup timeout in milliseconds, default 30 seconds. Useful when `npx` is still downloading.
* `ENABLE_TOOL_SEARCH`: tool search is on by default, so only tool names and server instructions load at start. `false` loads everything upfront.
* `CLAUDE_CODE_MAX_MCP_DESCRIPTION_LENGTH`: tool descriptions and server instructions are cut at 2,048 characters unless you change this.
* `"alwaysLoad": true` on a server entry skips tool search for that server's tools.

## What changed for MCP in Claude Code in the last six months?

Mostly connection status and sign in. From the [Claude Code changelog](https://code.claude.com/docs/en/changelog), checked 29 Sep 2026:

| Version (date) | Change |
| --- | --- |
| 2.1.284 (28 Sep 2026) | `/mcp reconnect all` retries every failed or unauthenticated server |
| 2.1.280 (22 Sep 2026) | `CLAUDE_CODE_MAX_MCP_DESCRIPTION_LENGTH` |
| 2.1.274 (17 Sep 2026) | v2 MCP client and 2026-07-28 protocol negotiation on Bedrock, Vertex and Foundry too |
| 2.1.265 (8 Sep 2026) | `http` servers that only speak HTTP+SSE now fall back to SSE |
| 2.1.259 (2 Sep 2026) | `managedMcpServers` lets an organisation provide servers to every user |
| 2.1.219 (24 Jul 2026) | `claude mcp list` shows the HTTP status and error text on a failure |
| 2.1.186 (22 Jun 2026) | `claude mcp login` and `claude mcp logout` |
| 2.1.121 (28 Apr 2026) | `alwaysLoad` server option |
| 2.1.91 (2 Apr 2026) | `anthropic/maxResultSizeChars` per tool override |

## Can Munder Difflin set up MCP servers for every agent?

Yes, for a default set. In the v0.5.3 release, Settings, Connections has a Default MCP servers list (`src/renderer/src/components/McpDefaultsSettings.tsx`). Six servers from the safe tier are on by default: Sequential Thinking, Time, Fetch, Context7, and Filesystem and Git limited to the agent's own folder. GitHub, Database, Email & Calendar and Web Search need a key and stay off until you turn them on (`src/shared/mcpCatalog.ts`).

When an agent starts, `buildDefaultMcpServers` in `src/main/hive.ts` writes the enabled ones into that agent's own session settings file as `munder-<id>` and passes it with `--settings`. It never edits your `~/.claude.json` or `.mcp.json`, and changes apply at the next spawn, not to running agents. The honest limit: in v0.5.3 that list is one switchboard for all agents, not a per-agent grant. Each agent is still a normal `claude` session, so your user and project servers load as usual. [Running several sessions at once](/blog/manage-multiple-claude-code-sessions/) covers why the per session file matters.
