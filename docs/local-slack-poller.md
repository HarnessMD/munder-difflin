# Local Slack Poller — one shared Slack app, every colleague's own laptop

`resources/md-slack-poller.cjs` lets any Coinbase colleague pipe a Slack channel
into the Munder Difflin (MD) running on **their own laptop**, using **one
security-approved Slack app** that everyone reuses — with **no central relay, no
tunnel, and nothing exposed inbound**.

## The problem this avoids

A single Slack app delivers events to exactly **one** Event Subscriptions Request
URL. (Socket Mode doesn't help: it *load-balances* an app's events across all of
that app's open WebSockets, so with many users on one app, User A's message can
land on User B's socket — it **misroutes**.) So fanning one shared app's *pushed*
events out to N private laptops — each getting only its own messages — would
require a custom routing layer (a hosted relay), which the team has explicitly
rejected.

## The insight: pull, don't push

Everyone already has Coinbase Slack on their phone, so **Slack is just the
inbox**. Instead of Slack *pushing* to a shared endpoint, each laptop **pulls**
its own channel with its own token:

```
Colleague's laptop                                   Slack
┌────────────────────────────┐   outbound HTTPS      ┌──────────────┐
│ md-slack-poller.cjs (cron)  │ ───── auth.test ────▶ │  Web API      │
│                             │ ── conversations.history ─────────────│
│   reads MD config.json      │ ◀──── new messages ── │              │
│   tracks last-seen ts       │                       └──────────────┘
│        │ signed POST (127.0.0.1)                                     
│        ▼                                                             
│ MD SlackWebhookServer :3847 │  (verify → slack-trigger → dedup →     
│   → renderer → office run   │   download files → reply-in-thread)    
│        │ reply via bot token│ ─────── chat.postMessage ───────────▶ Slack thread
└────────────────────────────┘                                        
```

Because the poll is **outbound-only HTTPS to slack.com**, it works from home,
from the office, and behind corporate NAT/firewalls — no inbound URL, no
per-laptop tunnel, nothing to expose.

## How it works (and why it changes nothing downstream)

MD already runs a local HTTP endpoint (`SlackWebhookServer`, default port
`3847`) that Slack would normally POST events to. The poller **re-delivers each
new message to that same endpoint on `127.0.0.1`** as a synthetic
`event_callback`, **HMAC-signed with the app's signing secret exactly like a real
Slack push**. Everything after the socket is therefore **identical to today**:

- `slack.ts` `verify()` — same signature + 5-min replay check (a bad signature is
  still `403`; verified live).
- `slack-trigger.cjs` `shouldTrigger` — same @-mention / activated-thread filter.
  **The server stays the single source of truth for what triggers a run**; the
  poller only *delivers candidate messages* to it.
- `channel:ts` dedup, the `_rawFiles` download path, the IPC hand-off to the
  renderer, the office run, and reply-in-thread via the bot token — all unchanged.

No change to `slack.ts` or `index.ts` was required. The poller is purely
additive.

### No dupes, survives restarts

The poller keeps a tiny JSON **state file** (default:
`<userData>/slack-poller-state.json`, mode `0600`, **never contains a secret**)
holding the last-seen `ts` per channel and per followed thread. It advances the
cursor only after a message is accepted, and persists after each — so a crash
never re-forwards. On the **first run for a channel it baselines to the newest
`ts` and forwards nothing** (enabling the poller never replays history); pass
`--backfill N` to replay the last N once.

There are two independent dedup layers: the poller's `last-seen ts` cursor, and
the server's in-memory `channel:ts` cache — so even overlapping polls can't
double-fire a run.

### Threads — replies reach the bot with no @-mention (durable)

`conversations.history` returns top-level channel messages (including the
@-mentions that start threads) but **not** replies inside existing threads, and a
new reply does **not** resurface its parent. So to catch a human's follow-up in a
thread — *without* requiring them to re-@-mention — the bot must already be
**following** that thread and polling `conversations.replies` for it. Threads are
followed from two sources (bounded to the 50 newest, `--no-threads` disables):

1. **@-mention** — when the poller forwards a message that @-mentions the bot, it
   follows that thread (as before).
2. **Bot participation (durable)** — the poller also auto-follows every thread the
   **bot has replied in**, read from the shared **bot-thread ledger** (below).
   This survives an app restart and catches threads whose original @-mention was
   delivered by the push/tunnel path rather than the poller. On adoption, the
   reply cursor is baselined to the **bot's own last reply** (`lastBotTs`), so
   only *newer* replies are forwarded — no thread-history replay.

### Bot-thread ledger (`slack-bot-threads.json`)

A second small file — `<userData>/slack-bot-threads.json`, mode `0600`,
**channel ids + thread timestamps only, NEVER a token** — is the shared record of
"threads the bot has replied in". It is **written by MD's main process** whenever
the bot posts a reply (the direct loopback `/reply` path and the done-summary
fallback), keyed `threadTs → { channel, lastBotTs, updated }`, bounded to the 500
newest. Two readers consume it:

- **The webhook server** loads these roots at startup into its activated-thread
  set (and adds to it live on every bot reply). A plain human reply in any of
  these threads then triggers a run **with no @-mention, even after a restart** —
  scoped strictly to bot-participated threads, so unrelated channel messages
  never trigger. The HMAC `verify()` and self-loop guard are unchanged.
- **The poller** reads the same file to build its follow-set (source 2 above).

Because main is the only writer and the poller only reads it, there is no
two-writer conflict; the poller keeps its own cursor in `slack-poller-state.json`.

## The shared Slack app — one-time security approval

This is the piece that's approved **once** and reused by everyone. Nothing about
polling requires a per-user app or a per-user security review.

- **App type:** one internal Slack app for the Coinbase workspace/org. Each
  colleague **installs that same app** to get their **own bot token** — no new
  app, no new review.
- **Bot token scopes** (read the channel + post replies):
  - `channels:history` (public channels) and/or `groups:history` (private
    channels) — required by `conversations.history` / `conversations.replies`.
  - `chat:write` — post the reply in-thread (already used today).
  - *(optional)* `channels:read` / `groups:read` — only if you later resolve
    channel names; polling by channel **id** doesn't need them.
- **Bot membership:** the bot must be **a member of the channel** it polls
  (`/invite @yourbot`). A bot token can only read conversations it's in.
- **Events API / Request URL:** **not needed** for polling. The existing
  push/tunnel setup can be left off entirely for poll-only colleagues (see the
  NAT note below).
- **Signing secret:** still used — the poller signs its local delivery with it,
  so `verify()` stays fully enforced on the loopback hop too.

### Slack rate limits (why the default interval is safe)

As of **2025-05-29**, `conversations.history`/`conversations.replies` for apps
distributed **outside** the Slack Marketplace are capped at **1 request/min and
15 messages/call**; Marketplace and org-**internal** apps keep Tier 3 (50+/min).
The poller's default cadence (5–15 min) is comfortably under **even the worst-
case 1 req/min cap**, and it requests `limit: 15`, so it's safe on any tier. If
the internal app retains Tier 3, you can poll more tightly.

## Per-colleague setup (install from the internal repo → connect)

1. **Install MD** from the Coinbase internal repo and run it once.
2. **Install the shared Slack app** to your workspace and copy your **bot token**
   and the app **signing secret** into MD settings (the same fields MD already
   has: `slackBotToken`, `slackSigningSecret`). Set your **channel id**
   (`slackChannelId`) and **enable Slack** so the local endpoint is listening.
   For a laptop behind NAT with no tunnel, also set **`slackPollingOnly: true`**
   in `config.json` — this binds the endpoint to `127.0.0.1` only, skips the
   public tunnel, and still starts the reply endpoint so replies work (see
   below). Tokens live in MD's `config.json` under the OS user profile —
   **never commit or paste a token anywhere else.**
3. `/invite` the bot into the channel you want to pipe in.
4. **Run the poller** — pick one:
   - one-shot (cron/launchd drives the cadence):
     ```
     "<md-node>" /path/to/resources/md-slack-poller.cjs
     ```
   - self-watching loop:
     ```
     "<md-node>" /path/to/resources/md-slack-poller.cjs --watch --interval 10
     ```
5. **Register it to run automatically:**
   - **macOS launchd** — a `~/Library/LaunchAgents/com.munderdifflin.slackpoller.plist`
     `StartInterval` of `600` (10 min) running the one-shot command; or a
     `KeepAlive` job running `--watch`.
   - **cron** (macOS/Linux): `*/10 * * * * "<md-node>" /path/to/md-slack-poller.cjs`
   - **Windows:** Task Scheduler, "repeat every 10 minutes", running the one-shot
     command.

`<md-node>` is any Node ≥18; the poller has **zero dependencies** (Node built-ins
only). It auto-discovers `config.json` at the platform Electron userData path
(`~/Library/Application Support/munder-difflin/` on macOS,
`~/.config/munder-difflin/` on Linux, `%APPDATA%\munder-difflin\` on Windows);
override with `--config`.

### CLI reference

| Flag | Effect |
| --- | --- |
| *(none)* | one poll pass, then exit (for cron/launchd) |
| `--watch` | loop forever (default 5-min interval) |
| `--interval <min>` | interval for `--watch` |
| `--channel C0123` | channel to poll (else `config.slackChannelId`) |
| `--backfill <N>` | on first run, forward the last N (default 0 = baseline only) |
| `--no-threads` | don't follow thread replies |
| `--config <path>` | override `config.json` location (or `MD_CONFIG` env) |
| `--state <path>` | override the state-file location |
| `--ledger <path>` | override the bot-thread ledger location (else alongside config) |
| `--port <n>` | override the local webhook port (else `config.slackPort`) |
| `--verbose` | log each forwarded message id |

## Security considerations

- **Signature preserved end-to-end.** The loopback delivery is HMAC-signed with
  the signing secret and verified by the same `verify()` as a real push; a bad
  signature is rejected `403` (verified live). No security control is bypassed or
  downgraded.
- **Tenant isolation by construction.** Each laptop polls with **its own token**
  and delivers only to **its own** `127.0.0.1` endpoint. There is no shared
  inbox and no cross-user path — User A's messages can never reach User B's MD
  (the exact misrouting that a shared-push/Socket-Mode design risks).
- **Secrets.** The bot token and signing secret are read from MD's `config.json`
  and used only in outbound Slack auth headers / the local HMAC. They are
  **never logged and never written to the state file**. Per Coinbase rules, do
  not commit tokens; prefer OS keychain / a `0600` config for storage.
- **Self-loop guard.** Messages authored by the bot (`bot_id`, or `user ===`
  bot's own id) are dropped before forwarding, and the server drops them again.
- **Reads only what the bot can see.** The bot must be invited to a channel to
  read it — no broader visibility than the app was granted.

## Poll-only mode: replies with no tunnel (`slackPollingOnly`)

Polling delivers messages *in* over loopback with no tunnel. The **reply** path
(`md-slack-reply.cjs` → loopback `SlackReplyServer` → `chat.postMessage`) needs
that reply endpoint running — and previously it only started as part of the
tunnel bring-up, so on a NAT'd laptop where `tunnelmole` couldn't connect,
`startSlackServer()` treated the failure as fatal and never started the reply
endpoint or the done-observer.

The **`slackPollingOnly`** config flag (default **off**) fixes this for poll-only
laptops:

- `SlackWebhookServer` binds to **`127.0.0.1` only** and **skips `openTunnel()`
  entirely** — no public listener is ever opened (a poll-only laptop is *less*
  exposed, not more).
- `start()` resolves `{ ok: true }` with **no URL**, so `startSlackServer()`
  proceeds to start the **reply endpoint** and the **done-observer** exactly as
  in tunnel mode.
- **HMAC `verify()` is unchanged** — every request (including the poller's own
  loopback delivery) is still signature-checked; a bad signature is still `403`.

The result: on a NAT'd, tunnel-free laptop, the poller delivers messages in over
loopback, the office run happens locally, and the agent's reply posts back
in-thread via the bot token — **all outbound-only, nothing exposed inbound.**

The classic single-user setup is untouched: with `slackPollingOnly` unset/false,
`startSlackServer()` opens the tunnel and pushes exactly as before.

## Verification performed

Against the live MD build (v0.4.5) and the live Slack channel:

- **Pull half (live):** `auth.test` resolved the bot user id, and
  `conversations.history` succeeded (scopes + channel membership OK) and
  baselined the channel — forwarding nothing on first run.
- **Replay half (live):** a poller-signed synthetic event POSTed to the running
  `127.0.0.1:3847` endpoint returned **HTTP 200** (accepted + verified through
  the real ingestion path; a non-triggering message, so no run/reply — zero side
  effects), and a **bad** signature returned **HTTP 403** (verify enforced).
- **Unit tests:** `test/slack-poller.test.cjs` — pure-helper tests (arg parsing,
  ts comparison, `selectNewMessages` dedup/ordering/self-loop guard, payload
  shape, signature parity with `verify()`, plus the bot-thread ledger reader and
  the `mergeLedgerThreads` follow-set merge: baseline-to-`lastBotTs`, channel
  filter, never clobber an existing cursor).
- **Poll-only mode:** `test/slack-polling-only.test.cjs` — 5 tests spinning up a
  real `SlackWebhookServer` with `skipTunnel: true`: `start()` resolves ok with
  no tunnel URL, a valid signed loopback event is accepted (`200`) and reaches
  `onMessage`, a bad signature is rejected (`403`), the `url_verification`
  handshake still works, and the default (tunnel) construction leaves poll-only
  off.
- **Durable thread activation (GATE 2):** `test/slack-thread-activation.test.cjs`
  — 4 tests spinning a real `SlackWebhookServer` seeded with
  `initialActivatedThreads` (exactly what startup does from the ledger): a plain
  reply (no @-mention) in a seeded thread fires; unrelated thread + top-level
  messages do not; `activateThread()` activates live; @-mention still works.
- **End-to-end (real code, simulated restart):** wrote the ledger as main would,
  booted a real server seeded from it → a plain reply (no @-mention) fired a run;
  **tore the server down and booted a fresh one re-reading the same persisted
  ledger → the plain reply fired again** (HTTP 200); an unrelated top-level
  message did not fire; and the poller's `mergeLedgerThreads` followed the thread
  with its cursor baselined to the bot's own reply. Full focused suite passing;
  `typecheck:node` clean.

## KG note

The Coinbase Knowledge Graph was **empty on this machine** at design time
(`kg.cjs list` → "knowledge base is empty"), so no internal doc ids could be
cited. Scope names, rate-limit facts, and the app-approval model above are
grounded in Slack's official API docs; confirm the internal app-registration and
token-storage process against Coinbase's own security process before rollout.
```
