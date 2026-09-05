# Cursor agent + n8n MCP → Slack integration (no Slack app to build)

**Goal:** use your **own n8n** (already wired into Cursor as an MCP) to **poll a
Slack channel and reply in-thread** — driven by a **Cursor agent you spawn from
Munder Difflin**. No new Slack app, no relay, no tunnel required (polling is
outbound-only, exactly like this repo's `md-slack-poller.cjs`).

This guide has two parts:
- **(A)** how Munder Difflin's Cursor integration actually works (verified in the
  code) — how to spawn/configure a Cursor-provider agent, and the one important
  gotcha about MCP;
- **(B)** a copy-pasteable prompt to hand that Cursor agent so it builds the n8n
  Slack poll→reply workflow, plus the exact nodes, credentials, and how it maps
  to the `md-slack-poller.cjs` / `md-slack-reply.cjs` pattern this hive uses.

---

## (A) Munder Difflin's Cursor integration — how it really works

**Yes, `cursor` is a first-class, directly-selectable provider** (verified:
`src/shared/agentProvider.ts:531-560`, preset `id:'cursor'`,
`defaultCommand:'cursor-agent'`, models `gpt-5.6-luna-high` / `composer-2.5` /
`auto`). It is rendered as a normal provider chip in the Add-Agent modal with no
gate or filter (`src/renderer/src/components/AddAgentModal.tsx:872`).

### Spawn it from the UI (the normal path)
1. **Command Center → Add Agent.**
2. **Identity:** name it (e.g. `slack-n8n`), pick a character/color.
3. **Workspace:** choose the working folder (point it at wherever you want the
   agent to keep any workflow JSON it exports — e.g. an `n8n/` scratch dir). Leave
   isolation off unless you want a throwaway git worktree.
4. **Engine:** click the **Cursor** provider chip. Pick a model
   (`gpt-5.6-luna-high` is the recommended default; `composer-2.5` or `auto` also
   work). The **command** field will auto-fill to roughly:
   ```
   cursor-agent --model gpt-5.6-luna-high --force --trust
   ```
   (`--force --trust` are added when the floor **Auto mode** toggle is on — they
   let the agent run tools without confirmations and skip the workspace-trust
   prompt. You can edit this command field directly.)
5. **Briefing:** paste the **role/goal** — this is where the Part (B) prompt goes.
6. **Spawn.**

**Prerequisite:** the `cursor-agent` CLI must be on PATH. Install:
`curl https://cursor.com/install -fsS | bash` (Munder Difflin auto-runs this if
the binary is missing). Then `cursor-agent login` once so model calls bill against
your Cursor account.

### How the brief reaches the agent
Cursor's CLI parses early argv as sub-commands (`login`, `models`, `mcp`, …), so
Munder Difflin **cannot** pass the brief as a flag. Instead it **types the brief
into the Cursor TUI after boot** (`seedDelivery:'type-into-tui'`, verified at
`src/shared/agentProvider.ts:549-550` and `src/renderer/src/hooks/useHive.ts:735-769`).
Practical effect: after you spawn, watch the terminal — the goal is typed in and
submitted for you a moment after the TUI is ready.

### ⚠️ The one gotcha: MCP is Cursor's job, not Munder's
**Munder Difflin does NOT write any MCP config for a Cursor agent.** Its MCP
catalog + consent UI (`src/shared/mcpCatalog.ts`, `config.mcpDefaults`) only apply
to **Claude** agents — for cursor, `ensureAgent` returns before any MCP/settings
is written (verified: `src/main/hive.ts:862-863` and `:841`). n8n is not in
Munder's catalog anyway.

**Good news — you don't need Munder to do it.** The `cursor-agent` CLI
**automatically detects and respects the same `mcp.json` you configured for the
Cursor editor** (per Cursor's CLI docs). So the **n8n MCP you already have in
Cursor is available to a Munder-spawned cursor-agent for free**, as long as it
runs as the **same OS user on the same machine** (same `~/.cursor` /
project `.cursor/mcp.json`). Nothing extra to wire.

Quick check before you spawn: run `cursor-agent mcp` (or `cursor-agent mcp list`)
in a terminal and confirm your **n8n** server shows up. If it does, the spawned
agent will have it too.

### Honesty / caveats (from the code's own notes)
- Cursor has **no hook/proxy bridge yet** (`src/shared/agentProvider.ts:543-544`),
  so mid-session hive features (routed inbox mail, precise live status) are
  **best-effort** (idle-nudge / work-order fallback). The **seed brief** and
  **your reply-in-thread flow via n8n** do not depend on that bridge, so they're
  unaffected — but don't expect the same tight hive lifecycle you get from Claude.
- A **hire manifest** (`munder-difflin/hire@1`) can pre-fill provider=`cursor` +
  model + safe flags, but it **cannot carry an MCP spec for cursor** (manifest
  `mcpServers` may only reference Munder's built-in catalog ids, and n8n isn't
  one). So MCP always comes from your Cursor config, never the manifest.

---

## (B) Hand this to the Cursor agent — build the n8n Slack poll→reply workflow

The design mirrors this repo's proven pattern so the two approaches stay
consistent:
- `resources/md-slack-poller.cjs` = **pull**: `conversations.history` on a
  schedule, track a last-seen `ts` so only NEW messages are processed, skip the
  bot's own messages, reply **in-thread**.
- `resources/md-slack-reply.cjs` = **reply**: `chat.postMessage` with `thread_ts`
  set, Slack **mrkdwn** body.

The n8n workflow is the visual equivalent: **Schedule Trigger → Slack "Get many
messages" → Filter new/relevant → (process) → Slack "Send message" (in-thread).**

### Credentials & scopes YOU must supply (never commit these)
Configure a **Slack API credential in n8n** (n8n stores it in its own encrypted
credential store — do **not** paste the token into the workflow JSON or any repo):
- **Bot token** `xoxb-…` with scopes: `channels:history` (public) and/or
  `groups:history` (private) for reading, plus **`chat:write`** for replying.
  (`groups:read`/`channels:read` only if you resolve channel names.)
- The **bot must be invited** to the channel (`/invite @yourbot`) — a bot token
  can only read channels it's in.
- **Channel id:** `C0BTJ8REX5Z` is this workspace's channel.
- Poll interval: **5 min** default (safe even under Slack's worst-case
  1-req/min non-Marketplace limit; internal/Marketplace apps get Tier 3).

### Design decision: poll vs Slack Events trigger
This guide uses **polling** (Schedule Trigger + `conversations.history`) because
it's outbound-only and needs **no public URL / tunnel** — matching your stated
intent and this repo's NAT-safe poll-only design. If your n8n is publicly
reachable (e.g. n8n Cloud), you *could* instead use n8n's **Slack Trigger** node
(Events API webhook) for push. Polling is the recommended default; swap to the
Slack Trigger only if you want push and have a reachable n8n.

### The copy-pasteable prompt

> **Copy everything in this block into the Cursor agent's briefing (or paste it
> into the Cursor TUI):**

```
You have an n8n MCP server available (verify with the MCP tools; if you can't see n8n, stop and tell me). Build and activate an n8n workflow that POLLS a Slack channel for new messages and REPLIES in-thread. Mirror this reference pattern exactly:
- pull  = Slack conversations.history on a schedule, tracking the last-seen message ts so only NEW messages are handled, skipping the bot's own messages, replying IN-THREAD.
- reply = Slack chat.postMessage with thread_ts set and a Slack-mrkdwn body.

Build it with these nodes (use the n8n MCP to create/update/activate the workflow — do NOT ask me to click through the UI):

1) Schedule Trigger — every 5 minutes.

2) Read last-seen ts — from n8n workflow static data (getWorkflowStaticData('global').lastTs). On the very first run, if lastTs is empty, set it to "now" (the newest message ts) and forward NOTHING (baseline; never replay history).

3) Slack node "Get many messages" (conversations.history):
   - Credential: the Slack Bot credential I configured in n8n (do not hardcode any token).
   - Channel: C0BTJ8REX5Z
   - oldest = lastTs, inclusive = false, limit = 15 (ascending by ts after fetch).

4) Filter / Code node — keep only messages that are genuinely new and should trigger a reply:
   - ts > lastTs;
   - drop the bot's own messages (has bot_id, or user === our bot user id from Slack auth.test);
   - (recommended, mirrors the reference) only act on messages that @-mention the bot OR are replies in a thread the bot has already replied in — so unrelated channel chatter is ignored. Track "threads the bot replied in" in static data.
   - After processing, advance lastTs to the max ts seen and persist it to static data (so restarts/re-runs never double-process).

5) (Optional) A processing step — an LLM/agent node or a call to my handler — that produces the reply text as Slack mrkdwn. Keep it a short *bold* headline + the substantive answer; never a bare "done".

6) Slack node "Send message" (chat.postMessage):
   - Credential: the same Slack Bot credential.
   - Channel: C0BTJ8REX5Z
   - thread_ts = the originating message's thread_ts (or its own ts if it's a root) so the reply nests in-thread.
   - Text: the mrkdwn reply.

7) (Optional, advanced — mirrors md-slack-poller.cjs thread-following) For each thread the bot has replied in, also poll Slack conversations.replies (channel + thread ts, oldest = last-seen reply ts) and handle new human replies the same way, so follow-ups work WITHOUT a new @-mention. Expire followed threads with no activity in the last 90 days.

Constraints:
- NEVER put the Slack token in the workflow JSON, in logs, or in any file — use the n8n Slack credential only.
- Reply strictly in-thread (always set thread_ts); never post to the channel root.
- Idempotent: the last-seen ts + a channel:ts dedup guarantee each message is handled once, even across re-runs.
- When done: activate the workflow, then run it once and show me (a) the workflow id/URL, (b) the node list, and (c) proof it posted a test reply in-thread to channel C0BTJ8REX5Z.
```

### How this maps to the existing hive pattern (so both stay consistent)
| Concern | `md-slack-poller.cjs` / `md-slack-reply.cjs` | n8n equivalent |
| --- | --- | --- |
| Trigger cadence | launchd/cron every ~5 min | **Schedule Trigger** (5 min) |
| Pull new msgs | `conversations.history` since `lastTs` | **Slack "Get many messages"**, `oldest=lastTs` |
| Dedup / no replay | `slack-poller-state.json` last-seen ts + `channel:ts` cache | **workflow static data** `lastTs` |
| Self-loop guard | drop `bot_id` / own `user` | **Filter/Code** drop bot's own msgs |
| Trigger scope | @-mention OR bot-participated thread | **Filter** on mention/participated thread |
| Reply | `chat.postMessage` + `thread_ts`, mrkdwn | **Slack "Send message"**, `thread_ts`, mrkdwn |
| Thread follow-ups | `conversations.replies`, 90-day expiry | optional step 7 |
| Secrets | bot token in MD `config.json` (never logged) | **n8n Slack credential** (never in JSON) |

The net effect is the same contract as the poll-only path already shipped in this
repo (see `docs/local-slack-poller.md`): outbound-only, no tunnel, one channel in
→ substantive mrkdwn reply in-thread out — just orchestrated by your n8n instead
of the bundled `.cjs` helpers.

---

## Can an existing Munder Difflin **Claude** agent use the n8n MCP too?

**Yes — with caveats.** A MD Claude agent can use the n8n MCP, but *not* by
reusing Cursor's config, and *not* through Munder Difflin's MCP catalog.

**Why not via Munder:** MD's MCP catalog + consent (`config.mcpDefaults`,
`mcpCatalog.ts`) is a **closed allowlist** and applies to Claude agents only;
n8n isn't in it and can't be added there. MD writes a per-session `settings.json`
with `--settings` carrying only its `munder-*` catalog servers — and it does **not**
pass `--strict-mcp-config`, so it never locks MCP down. (For cbcode/LLM-Gateway-
wrapped Claude agents, `--settings` is stripped entirely, so only Claude's own MCP
config applies anyway.)

**The real path — Claude Code's OWN MCP config.** A MD Claude agent reads Claude
Code's native MCP scopes. Add n8n there and any MD-spawned Claude agent (including
me) picks it up on its **next launch**. Server names that don't collide with MD's
`munder-*` ones are simply loaded alongside them.

**You must re-add it (you can't point Claude at Cursor's file).** Cursor's
`mcp.json` (`~/.cursor/mcp.json` or `<project>/.cursor/mcp.json`) is Cursor-only;
Claude Code doesn't read it. **Copy the server *definition* out of your Cursor
`mcp.json` and re-add it to Claude**, re-supplying the n8n credentials into
Claude's config:

- **Remote n8n MCP (HTTP/SSE):**
  ```
  claude mcp add --scope user --transport http n8n https://<your-n8n>/mcp \
    --header "Authorization: Bearer <YOUR_N8N_TOKEN>"
  ```
- **Local/stdio n8n MCP (e.g. an `n8n-mcp` npm server):**
  ```
  claude mcp add --scope user --transport stdio n8n \
    --env N8N_API_URL=https://<your-n8n> --env N8N_API_KEY=<YOUR_N8N_KEY> \
    -- npx -y <the-n8n-mcp-package-from-your-cursor-config>
  ```

**Scope choice:** `--scope user` (stored in `~/.claude.json`, home — **not** a
repo) makes it available to every MD Claude agent in every project. Use
`--scope project` only with a **`.mcp.json`** that keeps secrets out of the file
via env expansion (`"headers": {"Authorization": "Bearer ${N8N_TOKEN}"}` +
export `N8N_TOKEN`) — never commit a token. Verify with `claude mcp list`.

**Credentials/security:** the n8n API key + instance URL are **yours to supply** —
put them in user scope or an env var as above. I will not create, store, paste, or
commit them, and they must never land in a tracked file.

**To enable it for me (Meredith) specifically:** run the `--scope user` command
above with your n8n endpoint + key; it applies to my cwd too. It takes effect on a
**fresh agent session** (MCP servers load at launch, not mid-session), so restart/
respawn me afterward. This is fundamentally a *you* action — it needs your n8n
credentials, which I won't handle.

## TL;DR
1. `cursor-agent login`; confirm your **n8n MCP** shows in `cursor-agent mcp`.
2. Munder Difflin → **Add Agent → Engine → Cursor** (model `gpt-5.6-luna-high`) →
   paste the Part (B) prompt as the goal → spawn. (Cursor's own `mcp.json` gives
   the agent your n8n MCP; Munder writes none.)
3. In n8n, create a **Slack Bot credential** with `channels:history`/`groups:history`
   + `chat:write`, invite the bot to `C0BTJ8REX5Z`.
4. Let the Cursor agent build + activate the **Schedule→history→filter→reply**
   workflow and post a test reply in-thread.
