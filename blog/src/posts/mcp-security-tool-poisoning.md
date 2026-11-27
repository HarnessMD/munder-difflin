---
title: "MCP Tool Poisoning: How to Secure the Model Context Protocol"
description: "MCP tool poisoning hides instructions in the tool descriptions a model reads. How it works, rug pulls, token risks and the layered defenses that help."
date: 2026-06-05
updated: 2026-11-27
category: guides
categoryLabel: Guides
type: Technical
primaryKeyword: "mcp tool poisoning"
secondaryKeywords: ["mcp security", "model context protocol security", "mcp prompt injection", "securing mcp servers"]
tags: ["Security", "MCP", "Protocols", "Guardrails"]
author:
  name: Chaitanya Giri
  initials: CG
faq:
  - q: "What is MCP tool poisoning?"
    a: "An attack that embeds malicious instructions in an MCP tool's metadata, such as its description. The client passes that text to the model, so a poisoned description can steer the agent. A threat modeling paper submitted to arXiv on 23 Mar 2026 found it \"the most prevalent and impactful client-side vulnerability\" in its analysis."
  - q: "What is an MCP rug pull?"
    a: "Tool poisoning on a delay. A server looks safe when you install it, then a later update changes its tools. Red Hat's example is a weather tool that starts \"gathering confidential information and sending it to an attacker.\" Pin server versions, scan tool descriptions at install and on every update, and reject silent changes."
  - q: "What is the biggest MCP security risk?"
    a: "Sources differ. The March 2026 arXiv paper ranks tool poisoning first among client side flaws. Practical DevSecOps, in a post dated 26 May 2026, names \"Public, unauthenticated MCP servers.\" Our view: authentication and tightly scoped tokens deserve as much attention as any single injection."
---

MCP tool poisoning hides malicious instructions in an MCP tool's metadata, such as its description, and the agent then follows them. A threat modeling [paper on arXiv](https://arxiv.org/abs/2603.22489), submitted 23 Mar 2026, found it "the most prevalent and impactful client-side vulnerability" in its analysis. Treat tool descriptions as untrusted input. Checked 27 Nov 2026.

Running a team of agents with MCP tools? [Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. The [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup, and the defenses below apply to any agent that calls MCP tools.

## What is MCP tool poisoning, and why does it work?

It works because the MCP client hands the model the tool information it got from each server, and the model acts on that text. [Red Hat's overview](https://www.redhat.com/en/blog/model-context-protocol-mcp-understanding-security-risks-and-controls) says the client passes "the request from the user plus the information from the MCP servers to an LLM", which picks the tool and its parameters. So whoever controls a server controls part of what the model reads. New to the roles? See [what an MCP server is](/blog/what-is-an-mcp-server/).

For example, a tool that looks like a weather lookup can carry a description that tells the model to read `~/.ssh/id_rsa` and pass it along. The agent is not jailbroken. It is following instructions from a source it was told to trust. [Practical DevSecOps](https://www.practical-devsecops.com/mcp-security-best-practices/) puts it in five words: "Tool descriptions are model input."

The arXiv paper compared how seven major MCP clients validate and defend against tool poisoning, and found significant security issues with most of them, which it puts down to "insufficient static validation and parameter visibility."

{% img "note-1" %}

## What is an MCP rug pull?

A rug pull is tool poisoning on a delay: the server is clean when you approve it and changes later. Red Hat warns that a malicious server "might initially appear safe during installation, even with its source code and tool descriptions appearing normal. But the tools may be modified during a future update." Its example is a weather tool that, after an update, starts "gathering confidential information and sending it to an attacker."

Our view: approval is a moment, but trust has to be continuous. Red Hat says software that installs MCP servers should be able to pin their versions and notify the user "if any changes occur in their code or composition after installation." Practical DevSecOps adds: "Scan descriptions at install time and at every server update. Reject silent changes."

## Which other MCP attacks should you watch for?

Watch for command injection, confused deputies, token passthrough and malicious local servers.

- **Command injection.** Red Hat warns that a local server's command execution "may be vulnerable to command injection vulnerabilities" and says to "sanitize the data before using it as an argument for a function that executes commands." Never pass model output straight into a shell.
- **Confused deputy.** Practical DevSecOps describes proxy servers "acting with server privileges instead of user privileges." The [MCP spec's security best practices](https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices) say proxy servers MUST keep "a registry of approved client_id values per user", check it before the third party authorization flow starts, and store consent decisions securely.
- **Token passthrough.** The same page calls it "an anti-pattern where an MCP server accepts tokens from an MCP client without validating that the tokens were properly issued to the MCP server" and says it "is explicitly forbidden in the authorization specification".
- **Malicious local servers.** A client configuration can carry a harmful startup command. A client that offers one click setup must show "the exact command that will be executed, without truncation" and get explicit approval first, the spec says.

## Is tool poisoning the biggest MCP risk?

Not on every list. Practical DevSecOps, in a post dated 26 May 2026, answers "What is the biggest MCP security risk today?" with "Public, unauthenticated MCP servers." The same post cites an analysis of "more than 5,000 open-source MCP servers" in which "over half relied on static secrets, while only a small fraction used OAuth for downstream connections."

The spec's section on scope minimization explains why broad tokens hurt: "Poor scope design increases token compromise impact". Its fix is "a progressive, least-privilege scope model": start with a minimal scope set and ask for more only when a privileged operation is first attempted. Our view: if you do one thing, scope every token so a tool can reach only the data it needs.

On the admin side, [Google's post of 24 Nov 2026](https://workspaceupdates.googleblog.com/2026/11/mcp-servers-cli-standardized-usage-tiers-now-available.html), which made [Workspace MCP servers](/blog/google-workspace-mcp-servers/) generally available, says that requiring external AI agents to identify themselves in OAuth and connect through those servers or the Workspace CLI "allows admins to manage agent access in the admin console just like traditional apps."

{% img "note-2" %}

## How do you defend against MCP tool poisoning?

Layer your defenses, because each control covers a different gap.

- **Treat tool metadata as untrusted.** Scan descriptions at install and on every update, pin versions, and require approval again when a description changes.
- **Validate arguments.** Practical DevSecOps says to "Validate types, ranges, lengths, and formats on every tool call." Model output is never a safe command.
- **Use the spec's authorization for HTTP servers.** In the current [authorization spec](https://modelcontextprotocol.io/specification/latest/basic/authorization), version 2026-07-28, authorization is OPTIONAL; when it is supported, HTTP implementations SHOULD conform to it, a protected MCP server acts as an OAuth 2.1 resource server, and authorization servers MUST implement OAuth 2.1. Clients and authorization servers SHOULD support OAuth Client ID Metadata Documents; Dynamic Client Registration "is deprecated and retained for backwards compatibility". Implementations on stdio "SHOULD NOT follow this specification, and instead retrieve credentials from the environment."
- **Stop confused deputies** with a registry of approved `client_id` values for each user and stored consent, as above.
- **Contain execution.** The spec says clients SHOULD "Execute MCP server commands in a sandboxed environment with minimal default privileges". Pair that with the habits in [running AI agents safely](/blog/agent-security-and-sandboxing/).
- **Gate and record risky actions.** [Human approval](/blog/human-in-the-loop-approving-ai-agents/) before actions that write, delete or send, and an [audit log that is only ever appended to](/blog/append-only-event-log-agents/), give you a check before damage and a record after it. Practical DevSecOps lists both: "Require human approval for high-risk actions" and "Log every tool call with full context".

The [OWASP guide to secure MCP server development](https://genai.owasp.org/resource/a-practical-guide-for-secure-mcp-server-development/), dated 16 Feb 2026, "outlines best practices for secure architecture, strong authentication and authorization, strict validation, session isolation, and hardened deployment." The arXiv authors propose "static metadata analysis, model decision path tracking, behavioral anomaly detection, and user transparency mechanisms."

## Should you stop using MCP servers?

No. Our view: stop trusting tool metadata by default instead of dropping MCP. Pin and scan descriptions, scope every token, sanitize what reaches a shell and contain execution. To decide which agent gets which server, see [bringing MCP servers and skills into a hive](/blog/mcp-and-skills-in-a-hive/).
