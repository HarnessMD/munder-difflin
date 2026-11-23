---
name: capabilities
description: |
  Your capability catalog. Read it once at boot. Lists the date skills, the
  external integrations (reached via the loopback broker), the usage limits and
  the engines and models available to you as an agent or a temp, and exactly
  how to call each. Read only. Consult it
  whenever you are unsure what tools or integrations you have or how to invoke
  them.
allowed-tools:
  - Bash
---

# Capability catalog

You are an agent or a temp in this office. An agent has a lasting session; a temp
is a short lived agent the orchestrator starts for one job, and it reports done
when the job is finished. This catalog tells you **what you can do and how to
call it**, your date skills and your external integrations, so you never have to
guess. Everything here is read only to invoke (the integrations themselves may
act, but they are mediated and credential free from your side).

## 1. Your environment

The harness injects these env vars (use them; don't hard-code paths):

- `AGENT_ID`, `AGENT_NAME` — your identity in the hive.
- `AGENT_DIR` — your private workspace (`identity.md`, `memory.md`, `inbox/`,
  `outbox/`, and `.claude/skills/`). Your bundled skills live under
  `$AGENT_DIR/.claude/skills/`.
- `HIVE_ROOT` — the shared hive (`PROTOCOL.md`, the kanban, other agents).

At boot you also have `identity.md` (who you are) and `HIVE_ROOT/PROTOCOL.md`
(the full coordination protocol). To message god or another agent, write ONE
message JSON into `$AGENT_DIR/outbox/` (schema in PROTOCOL.md). When finished,
send god an `"act":"done"` outbox message with a substantive result summary.

## 2. Temporal skills — concrete date ranges, relative to now

When your task is time-scoped, resolve the dates instead of computing them by
hand. Each skill prints inclusive civil dates (`YYYY-MM-DD`, your local
timezone) **and** the half-open `[startUtc, endExclusiveUtc)` instants for
timestamp queries. All are read-only (clock + stdout only; no writes, no network).

Named shortcuts (invoke directly):

| Skill | Range it resolves |
| --- | --- |
| `/today`, `/yesterday` | the single civil day |
| `/thisWeek`, `/lastWeek` | ISO week (Mon-start); this = Mon→today, last = prior full week |
| `/last7Days`, `/last30Days` | rolling N-day window ending today |
| `/thisMonth`, `/lastMonth` | this = 1st→today; last = prior full month |
| `/thisQuarter`, `/lastQuarter` | this = quarter-start→today; last = prior full quarter |
| `/thisYear`, `/lastYear` | this = Jan 1→today (YTD); last = prior full year |

For **any** window — including `last90Days`, `last12Months`, or arbitrary
`lastNdays` / `lastNweeks` / `lastNmonths` — use `/temporal`, or call the
resolver directly:

```bash
node "$AGENT_DIR/.claude/skills/temporal/when.mjs" last30Days   # one window
node "$AGENT_DIR/.claude/skills/temporal/when.mjs"             # all windows
node "$AGENT_DIR/.claude/skills/temporal/when.mjs" --json 90d  # JSON only
node "$AGENT_DIR/.claude/skills/temporal/when.mjs" --list      # keywords
```

Convention: `this*` windows are **period-start → today** (to-date); `last*`
named periods are the **full prior complete period**.

## 3. Integrations — via the loopback broker

External services are reached through the hive's **loopback broker**: a local,
authenticated endpoint the harness runs on `127.0.0.1`. You call the broker; it
holds the credentials and performs the outbound call on your behalf. A service
connection's key never reaches you, and only loopback callers are accepted, so
integration access is brokered and auditable. The keys and secrets saved in
Integrations, Keys and secrets are the one exception: you use them through
`md-secret` (below), never by reading a file.

**Every agent receives the broker.** `MD_BROKER_URL` and `MD_BROKER_TOKEN` are
set in your environment, agent or temp. Call an integration as
`curl -H "Authorization: Bearer $MD_BROKER_TOKEN" "$MD_BROKER_URL/i/<integration id>/<path>"`.
The port changes every time the app starts, so a lasting session can outlive
its env: if the call is refused, read the current `url` and `token` from the
JSON file `$AGENT_DIR/.broker` (yours only, rewritten on every broker start)
and use those.
Load it without printing it, since what a command prints stays in your
transcript: `MD_BROKER_TOKEN=$(sed -n 's/.*"token":"\([^"]*\)".*/\1/p' "$AGENT_DIR/.broker")`,
and the same with `url`. Never `cat` or open that file. Never copy that token anywhere else. An integration enabled
after you started reaches you with no restart. The human adds or fixes a
connection in **Integrations > Apps and services** (a new one is a row in that
list); Slack and inbound webhooks are in the same list. The auth choices there are None, Bearer
token, Custom header, Header with a prefix, Query parameter and HTTP basic (a
User field plus the key, for services such as Razorpay, Twilio or Atlassian);
point the human at the matching one rather than a hand built header value.
What is enabled depends on the office's configuration, so discover what is
live at run time rather than assuming. The broker pattern is stable even
as specific integrations are added; treat the list below as the current surface,
not a fixed contract.

### What you can reach, how to call it, and what a refusal means (0.5.8)

**List what is live.** Your start brief has a LIVE INTEGRATIONS line: what you
could reach when you started. It changes while you run (the person switches
things on and off), so ask the broker when it matters:

    curl -s -H "Authorization: Bearer $MD_BROKER_TOKEN" "$MD_BROKER_URL/integrations"

It answers `{"integrations":[...]}`: one entry for each integration you may
reach now, only those switched on. Each has `id`, `name`, `kind` (`api` or
`webhook`) and `allows` (one sentence: what you may do with it). An API also
has `call` (the address to use) and `base` (the service address your path goes
under). It never holds a key, a token or a secret. `GET $MD_BROKER_URL/i` gives
the ids alone.

**Call an API** (kind `api`). The person saved a key for a service. Call
`$MD_BROKER_URL/i/<id>/<path>`, where `<path>` is what comes after `base`, with
any method, headers and body the service takes. The broker adds the key. What
that key may do is the service's decision.

**A webhook** (kind `webhook`) brings work in; there is nothing to call. Each
request to its address reaches the agent it names (or the default webhook
agent, or god) as a hive message from `webhook` with the subject
`[webhook] <title>`, and a kanban card `webhook-...` is made for it. Some
webhooks hold each message until the person approves it. The message says how
to finish: do the work, then set that card's status and result, because the
outside caller reads the card's status from its address.

**Ask for a webhook.** You may add one yourself: write a `webhook.add` request
into `$AGENT_DIR/connections/requests/` as `$HIVE_ROOT/connections/README.md`
says (its name, who it goes to, its standing prompt). The result file names its
id, address and secret. The secret is for the outside service only: never put
it in a message, a card or a log. If the address is empty, this computer has no
public address yet; tell god. Pasting the address into the outside service
(GitHub, Linear, Telegram, a form) is the person's to do: message god with the
address and what it is for. An API key is always the person's to add: message
god with what you need and why.

**When the broker refuses.** Every refusal is JSON with `code` (below) and
`error` (a sentence). Do not retry a refusal that needs the person; message god once,
naming the integration id, the code and what you were trying to do.

| Status and code | What it means | What you do |
| --- | --- | --- |
| 401 `unauthorized` | Your token is old: the app restarted. | Read `url` and `token` from `$AGENT_DIR/.broker` again and retry once. |
| 403 `forbidden`, "integration not in this ... capability" | Not granted to you. | List `/integrations`. If you need it, ask god. |
| 403 `forbidden`, "integration is disabled" | The person switched it off. | Tell god; do not retry. |
| 404 `not_found` | No integration has that id. | Use an id from `/integrations`. |
| 400 `bad_request` | The path left the service (`..`, a full address). | Give only the path under `base`. |
| 503 `no_secret` | Not set up: no key is saved for it. | Tell god: the person saves the key in Integrations. |
| 503 `secret_unreadable` or `secret_store_unreadable` | A saved key cannot be read here. | Tell god: the person saves it again. |
| 429 `rate_limited` | Too many calls. | Wait a minute, retry once. |
| 502 `bad_gateway` or 503 `upstream_unavailable` | The service did not answer. | Retry once later; then tell god. |
| 413 `payload_too_large` | The body is too big. | Send less. |

Concrete capabilities you may have right now (check availability before relying
on one):

- **Reply to the originating Slack thread.** If your job arrived from Slack,
  your dispatch includes the exact reply command (the bundled Node path, the
  helper, the channel and the thread). Use *that* command verbatim to post your
  result back to the thread. Send a substantive reply (a short `*bold*`
  headline plus the actual outcome and links), never a bare "done".
- **Hive messaging.** Coordinate or hand off by writing an outbox message JSON
  to god or another agent (`$AGENT_DIR/outbox/`). This is your always-available
  channel.
- **Semantic memory (MemPalace).** If enabled for you: `md-memory search
  "<query>"` to recall shared knowledge, when a task needs it. It runs
  `mempalace` one search at a time on this machine, so use it rather than
  `mempalace` itself. If it says MemPalace is busy, carry on without it.
- **Enterprise Knowledge Graph.** If enabled: `node "$KG_CLI" search "<query>"`
  for ranked passages, `node "$KG_CLI" list`, `node "$KG_CLI" get <id>` — use it
  for company-specific facts instead of guessing.
- **MCP integrations** (filesystem, git, and others) come pre-wired into your
  session settings when enabled; invoke them as normal tools. The set is gated
  by the hive's consent configuration.
- **Keys and secrets (0.5.6).** A key or secret saved in Integrations, Keys
  and secrets works at once, with no restart. Your CAPABILITIES line gives the exact
  command: `list` names what is saved, `run NAME -- <command>` runs the command
  with NAME set in its environment. Never print a key or write it anywhere.

As additional brokered integrations land (calendar, mail, docs, web fetch, …),
they follow the same shape: a brokered, credential-free call discoverable at run
time. Pair them with the temporal skills above — resolve the date window first,
then pass those concrete ISO bounds to the integration query.

## 4. Usage limits — `md-limits`

`md-limits` prints each engine's usage limits: Claude Code, Codex,
Antigravity (per model group) and OpenCode: the percent used of each window
the engine reports, when it resets, and how old the reading is.
`md-limits --json` gives the same as JSON.

- It reads what the app already keeps. It asks no engine, uses no key and costs
  nothing, so run it whenever the answer matters.
- Run it before a big piece of work, before starting temps, and when a call
  fails on a rate limit.
- A window at 80% or more says NEAR LIMIT: tell `god` instead of starting work
  that would stop half way. The orchestrator gives it to an agent on another
  engine or waits for the reset.
- "no reading yet" means no Claude agent has replied since the app started. It
  is not zero. "not available" means the engine reports no limits (OpenCode, or
  Codex signed in with an API key).

## 5. Engines and models — `md-models`

`md-models` lists every engine this app can start an agent on, with its
models, and says which engines are installed and signed in on this computer.
`md-models --json` gives the
same as JSON, every model included.

- Run it before you name an engine or a model anywhere: above all a temp's
  spawn request (`spawn-requests/`).
- `"provider"` is the id in quotes (`"claude"`, `"codex"`); `"model"` is one
  of that engine's model ids. Leave `"model"` out for the engine's default.
- Pick an engine that is installed and signed in. One that is signed out
  needs the human to sign it in first; one not installed cannot start.
- "sign in not known" means the engine has no status the app can read; it
  may well work. It is never a reason to guess a different engine.
- It shows no key, token or account, and costs nothing to run.

## 6. Boundaries

- **Contacting the user is opt in.** Use email, Slack direct messages, Telegram
  or another external channel only when the user explicitly chose that channel
  in onboarding or asked you to use it. A connected integration, saved key,
  account email or known address is not consent. Otherwise keep updates and
  questions in the app. Reply to incoming requests in their originating channel
  and thread; this does not authorize unrelated messages, another channel or
  recurring updates. Pass these limits to agents you delegate to.
- Temporal skills are **read-only** helpers — they never write or reach the
  network. The broker mediates all external calls; you hold no service keys,
  and a saved key or secret is used through `md-secret run`, never printed.
- Do **not** push or tag to any remote. Commit locally; **god** is the sole
  integrator. Pause only for high-severity actions (remote push, paid/infra
  changes, deleting something you didn't create) — otherwise work autonomously.
- Finish by reporting to god (`"act":"done"`) with a real, substantive summary.
