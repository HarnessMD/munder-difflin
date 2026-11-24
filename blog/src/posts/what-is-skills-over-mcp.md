---
title: "What is Skills over MCP? Plus MCP Tasks and Elicitation"
description: "Skills over MCP lets an MCP server ship skills with its tools. What it is, plus MCP Tasks, Elicitation and File Uploads, who gets them, and the docs."
date: 2026-11-25
category: concepts
categoryLabel: Concepts
type: Technical
primaryKeyword: "skills over mcp"
secondaryKeywords: ["mcp skills", "mcp tasks", "mcp elicitation", "mcp file uploads", "claude mcp update"]
tags: ["Concepts", "MCP", "Skills", "Claude Code"]
faq:
  - q: "What is Skills over MCP?"
    a: "A way for an MCP server to publish skills alongside its tools, so Claude gets guidance on how to handle a job, not only a list of tools. Claude loads a skill only when it is needed. Anthropic put it in public beta in Claude and Claude Code on 24 Nov 2026."
  - q: "Who can use Skills over MCP?"
    a: "Per Anthropic's article of 24 Nov 2026, it is \"on by default for Pro, Max, and Ultra plans and available to Team plans once an admin enables it\", and \"Coming soon to Enterprise.\" In Claude Code, MCP skills need v2.1.331 or later."
  - q: "What are MCP Tasks?"
    a: "An MCP extension that lets a server answer a slow tool call with a task handle instead of blocking. Claude keeps working and picks up the result when it is ready. Anthropic made Tasks generally available in Claude and Claude Code for Pro, Max and Ultra on 24 Nov 2026, rolling out to Team and Enterprise organizations."
  - q: "What is MCP elicitation?"
    a: "Part of the MCP spec that lets a server pause a call and ask the user for input, through a form or a URL. The spec says servers must not use form mode to ask for passwords, API keys, access tokens or payment credentials."
  - q: "Does Skills over MCP only work in Claude?"
    a: "Anthropic says these features \"are part of the open MCP spec and its extensions, so a server that supports them works in any compatible client, not just Claude.\" The MCP docs add that host support for Skills is still being implemented and Tasks support varies by client, and the File Uploads repo calls that extension experimental."
---

Skills over MCP lets an MCP server publish skills alongside its tools, so Claude learns how to do a job with them, not only what they are. [Anthropic put it in public beta](https://claude.com/resources/articles/skills-over-mcp-tasks-and-more) in Claude and Claude Code on 24 Nov 2026, with Tasks and Elicitation generally available. Checked 25 Nov 2026.

If you run AI agents, [Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. Its agents run on engines such as Claude Code, Codex and Gemini CLI. The [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup.

## What is Skills over MCP?

It lets servers "publish skills alongside their tools to help Claude take on longer, multi-step work," per [Anthropic's article](https://claude.com/resources/articles/skills-over-mcp-tasks-and-more) of November 24, 2026. "Claude loads a skill only when it's needed, keeping context use low. Skills update with the server, so developers can ship tools and guidance together and users have nothing separate to install."

<figure class="mg" data-scene="guidebook"><img src="/blog/assets/media/what-is-skills-over-mcp/guidebook.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a yellow guidebook labelled Skill rests shut on a mint shelf beside a blue toolbox labelled Tools. When a lilac card labelled Job slides in, the guidebook opens and its soft white pages turn, and a sky arrow points from the pages to the toolbox. When the card slides out, the guidebook closes. Tap the card to send in a new job."><figcaption>Claude loads a skill only when it's needed. Anthropic, 24 Nov 2026.</figcaption></figure>

Skills "can cover best practices, step-by-step workflows, or even playbooks tailored to a user's account or organization," the article says. It names Shopify, HubSpot and Atlassian as users, with Carta "coming soon".

Underneath, "A skill is a directory containing a `SKILL.md` file and optional supporting files, following the Agent Skills specification," per the [MCP Skills extension docs](https://modelcontextprotocol.io/extensions/skills/overview). The news came as MCP "turns two years old this week", per the [MCP blog](https://blog.modelcontextprotocol.io/posts/mcp-turns-two) of 24 Nov 2026.

## How is it different from tool descriptions and skills you install?

A skill carries the how. "Tool names and descriptions tell Claude what a server can do, but don't cover how to handle specific use cases," Anthropic's article says.

Skills you install yourself have their own post, [Claude Code Skills](/blog/claude-code-skills/). An MCP skill comes with the server, and "Servers can change skills at any time," the [Claude Code MCP docs](https://code.claude.com/docs/en/mcp) warn. In Claude Code its name is `<server>:<skill>`, so a `pdf` skill on a server named `docs` is `docs:pdf`, and `/docs:pdf report.pdf` runs it on `report.pdf`. In Manual mode you see a prompt before one loads, and **Allow this version** skips it "until the server changes the skill's files."

## What do MCP Tasks do?

Tasks let a server run slow work without making Claude wait. "Tool calls used to have to finish before Claude could move on. With Tasks, servers can run operations that take time, or even full agent loops, while Claude keeps working and picks up the result when it's ready," per [Anthropic](https://claude.com/resources/articles/skills-over-mcp-tasks-and-more).

<figure class="mg" data-scene="oven"><img src="/blog/assets/media/what-is-skills-over-mcp/oven.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a yellow oven with a sky timer labelled Task bakes while a blue counter beside it keeps sliding lilac cards labelled Work along. When the timer runs out, a mint tray labelled Result slides out of the oven onto the counter, carrying a soft white plate. Tap the oven to bake again."><figcaption>With Tasks, Claude keeps working and picks up the result when it's ready. Anthropic, 24 Nov 2026.</figcaption></figure>

Servers "return a durable handle instead of blocking, so clients can poll for progress," say the [Tasks extension docs](https://modelcontextprotocol.io/extensions/tasks/overview). In Claude Code, an MCP task is "a long job, such as a report export or a build", and it needs v2.1.304 or later, per the [Claude Code MCP docs](https://code.claude.com/docs/en/mcp).

## What does MCP Elicitation do?

"Some actions need a user's sign-off, like spending money or deleting data. With Elicitation, a server can pause to ask the user for input through a form or link, then continue where it left off," [Anthropic](https://claude.com/resources/articles/skills-over-mcp-tasks-and-more) writes. GitHub, for one, "has users enter a repository's name before an agent deletes it."

<figure class="mg" data-scene="doorbell"><img src="/blog/assets/media/what-is-skills-over-mcp/doorbell.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a blue parcel rides a mint belt toward a soft white door and stops beside a yellow doorbell, which rings. A lilac card labelled Input pops up with two sky buttons, Accept and Decline. Tap Accept and the parcel rolls on through the door; tap Decline and it rolls back."><figcaption>Elicitation lets a server pause to ask the user for input, then continue. Anthropic, 24 Nov 2026.</figcaption></figure>

The [Elicitation spec](https://modelcontextprotocol.io/specification/2026-07-28/client/elicitation) has a form mode and a URL mode, and the user can accept, decline or cancel. Servers "MUST NOT use form mode elicitation to request sensitive information such as passwords, API keys, access tokens, or payment credentials."

## What will File Uploads do?

"Claude will be able to pass files to MCP servers, not just text," per [Anthropic](https://claude.com/resources/articles/skills-over-mcp-tasks-and-more). "The File Uploads extension sends PDFs, spreadsheets, and images to a server without passing them through the context window." It is "rolling out soon", with no date given.

Its [GitHub repo](https://github.com/modelcontextprotocol/experimental-ext-file-uploads) calls it an "Experimental MCP extension" and says: "It is not part of the MCP specification and has not been proposed as a SEP. Expect breaking changes while the working group iterates."

## Who can use them, and where?

Skills over MCP is "in public beta in Claude and Claude Code, on by default for Pro, Max, and Ultra plans and available to Team plans once an admin enables it. Coming soon to Enterprise," per [Anthropic](https://claude.com/resources/articles/skills-over-mcp-tasks-and-more) on 24 Nov 2026. Tasks and Elicitation "are now generally available in Claude and Claude Code for Pro, Max, and Ultra plans, and rolling out to Team and Enterprise organizations." File Uploads "is rolling out soon in Claude and Claude Code to Pro, Max, Ultra, and eligible Team and Enterprise plans."

In Claude Code, MCP skills need v2.1.331 or later, and cloud sessions and `claude -p` don't support them, per the [docs](https://code.claude.com/docs/en/mcp). The docs add that with `/login` on a Team or Enterprise plan "they're off until your organization turns them on"; Anthropic's article still lists Enterprise as coming soon.

Anthropic says these features "are part of the open MCP spec and its extensions, so a server that supports them works in any compatible client, not just Claude." Elicitation is in the [MCP spec](https://modelcontextprotocol.io/specification/2026-07-28/client/elicitation) itself; Skills and Tasks are extensions, and File Uploads is an experimental extension outside the spec, per its repo. For Skills, the MCP docs say "SDK and host support is still being implemented"; for Tasks, "Host support varies by client."

## How does a server author add support?

For Skills, "Servers that support Skills **MUST** declare both the `resources` capability and the `io.modelcontextprotocol/skills` extension in `server/discover`," per the [Skills extension docs](https://modelcontextprotocol.io/extensions/skills/overview):

```json
{
  "capabilities": {
    "resources": {},
    "extensions": {
      "io.modelcontextprotocol/skills": {
        "directoryRead": true
      }
    }
  }
}
```

Those servers "**MUST** implement `skills/list` and `skills/get`. Skill files are served through `resources/read`."

For Tasks, the [Tasks docs](https://modelcontextprotocol.io/extensions/tasks/overview) say to advertise `io.modelcontextprotocol/tasks` in `server/discover`, answer a long request with `resultType: "task"` and a `taskId`, and serve `tasks/get`. The [Claude Code docs](https://code.claude.com/docs/en/mcp) add: "Answer with a task only when the request carries the extension, or the call fails with the tool error `Unsupported result type 'task' for tools/call`."

## How does it relate to our pages?

These posts cover the ground around it.

* [What Is an MCP Server?](/blog/what-is-an-mcp-server/)
* [MCP Tool Poisoning: How to Secure the Model Context Protocol](/blog/mcp-security-tool-poisoning/)
* [Claude Code MCP Servers: How to Add One, Scopes and .mcp.json](/blog/how-to-add-an-mcp-server-to-claude-code/)
* [How to Get the Most Out of Your Claude Code Max Plan](/blog/claude-code-max-plan-tips/)

Our view: a server that ships skills and runs long tasks gives you more to trust than one with tools alone, so read what a server ships before you add it. The [Claude Code docs](https://code.claude.com/docs/en/mcp) put it plainly: "Skills can direct Claude to run code. Servers can change skills at any time. Add only servers you trust."

## Skills over MCP at a glance

Checked 25 Nov 2026.

| Item | Detail |
| --- | --- |
| Announced | 24 Nov 2026, by Anthropic |
| Skills over MCP | Public beta in Claude and Claude Code |
| Tasks and Elicitation | Generally available in Claude and Claude Code |
| File Uploads | Rolling out soon; an experimental MCP extension |
| Plans | Pro, Max and Ultra; Team and Enterprise vary by feature |
| Claude Code | v2.1.331 or later for MCP skills; v2.1.304 or later for MCP tasks |

<link rel="stylesheet" href="/blog/assets/media/what-is-skills-over-mcp/motion.css"><script defer src="/blog/assets/media/what-is-skills-over-mcp/motion.js"></script>
