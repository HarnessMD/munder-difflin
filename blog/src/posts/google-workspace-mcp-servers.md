---
title: "Google Workspace MCP Servers: What They Can Do and How to Connect"
seoTitle: "Google Workspace MCP Servers: Tools, Setup and Tiers"
description: "Google Workspace MCP servers went GA on 24 Nov 2026: the eight servers and their tools, setup for Claude and Antigravity, the agent OAuth rule and tiers."
date: 2026-11-26
category: guides
categoryLabel: Guides
type: Technical
primaryKeyword: "google workspace mcp"
secondaryKeywords: ["google workspace mcp servers", "gmail mcp server", "google drive mcp server", "google workspace cli", "google workspace mcp claude"]
tags: ["Guides", "MCP", "Google", "Security"]
faq:
  - q: "Can the Gmail MCP server send email?"
    a: "Google's Gmail MCP reference lists no tool that sends. It lists tools to search and read threads and messages, create and read drafts, and label, trash or mark mail as spam. Google's configure page says create_draft puts an email in your drafts folder so you can review and send it from Gmail. Checked 26 Nov 2026."
  - q: "Which Google Workspace MCP servers are generally available?"
    a: "Eight: Gmail, Drive, Docs, Sheets, Slides, Calendar, Chat and Tasks. The People API, Google Classroom and Universal Search servers are in the Google Workspace Developer Preview Program. Checked 26 Nov 2026."
  - q: "Are the Google Workspace MCP servers free?"
    a: "On the Standard tier, yes. Google says it has no cost and caps the GA servers at 5,000 requests per day, per project, per product. On the Scaled tier, Gmail, Calendar and Drive MCP usage is billed from the first request starting April 1, 2027. Checked 26 Nov 2026."
  - q: "How do I connect a Google Workspace MCP server to Claude?"
    a: "Create a Web application OAuth client with the redirect URI https://claude.ai/api/mcp/auth_callback and the agent setting selected. In Claude.ai or Claude Desktop, open Settings > Connectors, click Add custom connector, enter a server URL such as https://gmailmcp.googleapis.com/mcp/v1, and put the client ID and secret in Advanced settings. Google says this needs a Claude Enterprise, Pro, Max or Team plan."
  - q: "What changes on February 1, 2027?"
    a: "Google says technical enforcement of its MCP requirement begins: AI agents must use MCP to reach Workspace data rather than calling Workspace REST APIs directly. Agents that call the REST APIs directly are limited to Standard tier quotas."
---

Google made its [Workspace MCP servers generally available](https://workspaceupdates.googleblog.com/2026/11/mcp-servers-cli-standardized-usage-tiers-now-available.html) on 24 Nov 2026, and the Gmail server can search, read and draft mail, but its reference lists no tool that sends. Eight servers are GA, and each needs an OAuth client marked for AI agents. Checked 26 Nov 2026.

Running agents that use MCP servers? [Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. It runs engines such as Claude Code, Codex and Gemini CLI, and its agents can use MCP servers. The [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup.

## What did Google ship on 24 Nov 2026?

Hosted MCP servers and a CLI, plus usage tiers and admin controls. [Google's post](https://workspaceupdates.googleblog.com/2026/11/mcp-servers-cli-standardized-usage-tiers-now-available.html) says it is "making Workspace Model Context Protocol (MCP) servers and the official Workspace CLI generally available". Each [MCP server](/blog/what-is-an-mcp-server/) covers one product.

The [CLI guide](https://developers.google.com/workspace/guides/workspace-cli) says gwscli "connects AI agents such as Claude Code, Codex, and Antigravity". Google's [25 Nov 2026 blog post](https://workspace.google.com/blog/product-announcements/built-for-trust-and-control-new-ai-agent-protections-and-developer-tools-in-google-workspace) says agents must connect "through the Workspace MCP servers or CLI instead of traditional REST APIs (technical enforcement begins on February 1, 2027)."

## Which servers are GA, and what can each one do?

Eight are generally available; the [configure page](https://developers.google.com/workspace/guides/configure-mcp-servers) puts People API, Google Classroom and Universal Search in the Developer Preview Program. Tools are from each server's MCP reference, checked 26 Nov 2026.

| Server | Status | What its tools do |
| --- | --- | --- |
| [Gmail](https://developers.google.com/workspace/gmail/api/reference/mcp) | GA | Search, read, draft, label, trash, spam; no send tool |
| [Drive](https://developers.google.com/workspace/drive/api/reference/mcp) | GA | Search, read, download, create, copy, upload revisions |
| [Docs](https://developers.google.com/workspace/docs/api/reference/mcp) | GA | Read and update docs |
| [Sheets](https://developers.google.com/workspace/sheets/api/reference/mcp) | GA | Read and update values and formulas, insert rows or columns |
| [Slides](https://developers.google.com/workspace/slides/api/reference/mcp) | GA | Read slides and thumbnails, update presentations |
| [Calendar](https://developers.google.com/workspace/calendar/api/v3/reference/mcp) | GA | List, search, create, update, delete and respond to events; suggest a time |
| [Chat](https://developers.google.com/workspace/chat/api/reference/mcp) | GA | Search conversations and messages, send messages, mark read or unread |
| [Tasks](https://developers.google.com/workspace/tasks/reference/mcp) | GA | List, create, update, complete, delete and restore tasks |
| People API, Classroom, Universal Search | Developer Preview | Program members only |

### Can the Gmail MCP server send email?

Not by its [MCP reference](https://developers.google.com/workspace/gmail/api/reference/mcp), which lists no tool that sends. Its tools are `search_threads`, `get_thread`, `get_message`, `create_draft`, `list_drafts`, `get_draft`, `list_labels`, `create_label`, `label_thread`, `unlabel_thread`, `label_message`, `unlabel_message`, `update_message_labels`, `apply_sensitive_thread_label`, `apply_sensitive_message_label`, `trash_thread`, `untrash_thread`, `trash_message`, `untrash_message`, `mark_thread_spam`, `unmark_thread_spam`, `mark_message_spam` and `unmark_message_spam`. The configure page says `create_draft` makes "an email in your drafts folder, allowing you to review and send it from Gmail." Its approvals section still names "sending emails" among sensitive actions.

<figure class="mg" data-scene="toolbox"><img src="/blog/assets/media/google-workspace-mcp-servers/toolbox.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a yellow toolbox opens three soft white drawers one at a time, labelled Gmail, Drive and Calendar in plain text. The Gmail drawer slides out furthest and four blue tags rise from it, one by one: search_threads, get_thread, create_draft, trash_thread. Sky tags rise from the Drive drawer and lilac tags from the Calendar drawer, and a mint shelf under the box holds them. A tap closes every drawer and opens them again."><figcaption>The Gmail MCP reference lists search, read, draft, label and trash tools and no tool that sends, checked 26 Nov 2026.</figcaption></figure>

## Who can use them, and when?

The post says "Available to all Google Workspace customers and developers" and "Rapid Release and Scheduled Release domains: Rolling out to all in 2 weeks".

The configure page also has a setup "for your own Google Account", though the CLI guide says sending Chat messages with the CLI "isn't supported for personal Google Accounts."

Admins manage agent access, confirmation rules and agent audit logs "in the Admin console under Security > API Controls". A known issue: "Users can't view or revoke saved tool approvals themselves. Saved approvals expire after 90 days."

## How do you connect a Google Workspace MCP server?

Create an OAuth client marked for AI agents, then add each server URL. The [configure page](https://developers.google.com/workspace/guides/configure-mcp-servers) personal quick setup:

1. Open Personal mode onboarding in the Google Cloud console.
2. In Select Project, "select an existing personal-mode project or click Create a new project."
3. Name the client and add a redirect URI: `https://antigravity.google/oauth-callback` for Antigravity, `https://claude.ai/api/mcp/auth_callback` for Claude.
4. Check that Use this client for an AI-powered agent is selected, agree to the User Data Policy and click Continue.
5. Copy the Client ID and Client Secret.

For several users, the page enables the product APIs, then the MCP services with this command, then the consent screen and scopes:

```bash
gcloud services enable gmailmcp.googleapis.com \
drivemcp.googleapis.com \
docsmcp.googleapis.com \
sheetsmcp.googleapis.com \
slidesmcp.googleapis.com \
calendarmcp.googleapis.com \
chatmcp.googleapis.com \
tasksmcp.googleapis.com \
--project=PROJECT_ID
```

**Claude.** Google says this needs "the Claude Enterprise, Pro, Max, or Team plan". In Settings > Connectors, click Add custom connector, enter a name and a URL such as `https://gmailmcp.googleapis.com/mcp/v1`, put the client ID and secret in Advanced settings, and click Add. Repeat per server, changing gmail in the URL.

**Antigravity.** Add one `mcpServers` entry per server to `~/.gemini/config/mcp_config.json`, then authenticate each.

**Other apps.** The page has no Claude Code steps, only "Streamable HTTP" and OAuth 2.0; our [Claude Code MCP guide](/blog/how-to-add-an-mcp-server-to-claude-code/) shows where a hosted server goes. The CLI guide's steps, run in your own terminal, need a client secret JSON file from its personal mode setup; for Claude Code, install skills to `~/.claude/skills` instead:

```bash
curl -fsSL https://dl.google.com/workspace-cli/install.sh | bash
gwscli auth setup
gwscli auth login --bundle=readonly
gwscli skills install --dir ~/.agents/skills
```

The agent setting, `is_agentic` in Google's post, is required: without it, requests are rejected with "a generic invalid token error", the configure page says. The post adds that "traditional non-agent features should use a separate OAuth client".

<figure class="mg" data-scene="turnstile"><img src="/blog/assets/media/google-workspace-mcp-servers/turnstile.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a sky keycard slides toward a lilac turnstile and the turnstile stays shut. A yellow stamp presses the word is_agentic onto the card, then the mint turnstile arm turns and the card glides through to a soft white panel labelled MCP server. A blue light on the panel blinks once. A tap wipes the stamp off the card and plays it again."><figcaption>Requests from an OAuth client without the agent setting are rejected, per Google's configure page, checked 26 Nov 2026.</figcaption></figure>

## What do the usage tiers mean?

Standard is free with caps; Scaled lets you request more and, from April 1, 2027, bills. [Google's post](https://workspaceupdates.googleblog.com/2026/11/mcp-servers-cli-standardized-usage-tiers-now-available.html) calls Standard "No cost, with published usage quotas (rate limits)".

The [tiers page](https://developers.google.com/workspace/guides/quota-usage-tiers) caps the eight GA servers on Standard at "5,000 requests per day, per project, per product", with no billing account. Higher MCP quotas need Scaled, a linked billing account and a quota increase request.

From February 1, 2027, agents calling REST APIs directly "are limited to Standard Tier quotas, regardless of the tier selected." From April 1, 2027, "Scaled Tier Gmail, Calendar, and Drive MCP usage has no daily no-charge allowance and is billed from the first request." The [pricing page](https://developers.google.com/workspace/guides/quota-pricing) lists $0.10 per 1K requests (Light) to $0.50 per 1K requests (Premium), checked 26 Nov 2026.

<figure class="mg" data-scene="meter"><img src="/blog/assets/media/google-workspace-mcp-servers/meter.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a blue needle sweeps across a soft white dial with two zones, a mint zone labelled Standard and a lilac zone labelled Scaled. Under Standard a line reads 5,000 requests per day. The needle crosses into Scaled and a yellow tag drops in reading April 1, 2027, beside a sky billing slip. A tap swings the needle back to Standard."><figcaption>Standard caps GA servers at 5,000 requests per day; Scaled MCP billing starts April 1, 2027, per Google on 26 Nov 2026.</figcaption></figure>

## What should you check before you let an agent in?

Google's warning first: agents with these servers "can read, modify, and delete data in your Google Account", and "Never connect the Google Workspace MCP servers to untrusted or unverified applications."

Our view:

* Add only the servers and scopes a task needs.
* Use a host that supports form elicitation, so Google's confirmation prompts reach you; the `/mcp/v1self` fallback exposes "only tools and results that work without form elicitation under default policy".
* Treat every email and file an agent reads as untrusted input; see our [MCP tool poisoning guide](/blog/mcp-security-tool-poisoning/).
* Move any agent on Workspace REST APIs to MCP before February 1, 2027.

<link rel="stylesheet" href="/blog/assets/media/google-workspace-mcp-servers/motion.css"><script defer src="/blog/assets/media/google-workspace-mcp-servers/motion.js"></script>
