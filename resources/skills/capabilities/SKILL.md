---
name: capabilities
description: |
  Your capability catalog. Read it once at boot. Lists the date skills and the
  external integrations (reached via the loopback broker) available to you as
  an agent or a temp, and exactly how to call each. Read only. Consult it
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
holds the credentials and performs the outbound call on your behalf. You never
see or store a secret, and only loopback callers are accepted — so integration
access is brokered, auditable, and credential-free from your side.

**Only a temp receives the broker.** When you were started for one job,
`MD_BROKER_URL` and `MD_BROKER_TOKEN` are set in your environment; an agent with
a lasting session does not have them, and asks god when a job needs an
integration. What is enabled depends on the office's configuration, so discover
what is live at run time rather than assuming. The broker pattern is stable even
as specific integrations are added; treat the list below as the current surface,
not a fixed contract.

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
- **Semantic memory (MemPalace).** If enabled for you: `mempalace search
  "<query>"` to recall shared knowledge, `mempalace wake-up` for a digest.
- **Enterprise Knowledge Graph.** If enabled: `node "$KG_CLI" search "<query>"`
  for ranked passages, `node "$KG_CLI" list`, `node "$KG_CLI" get <id>` — use it
  for company-specific facts instead of guessing.
- **MCP integrations** (filesystem, git, and others) come pre-wired into your
  session settings when enabled; invoke them as normal tools. The set is gated
  by the hive's consent configuration.

As additional brokered integrations land (calendar, mail, docs, web fetch, …),
they follow the same shape: a brokered, credential-free call discoverable at run
time. Pair them with the temporal skills above — resolve the date window first,
then pass those concrete ISO bounds to the integration query.

## 4. Boundaries

- Temporal skills are **read-only** helpers — they never write or reach the
  network. The broker mediates all external calls; you hold no credentials.
- Do **not** push or tag to any remote. Commit locally; **god** is the sole
  integrator. Pause only for high-severity actions (remote push, paid/infra
  changes, deleting something you didn't create) — otherwise work autonomously.
- Finish by reporting to god (`"act":"done"`) with a real, substantive summary.
