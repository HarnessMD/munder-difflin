# Usage endpoint

Agent engines meter you: a five-hour window, a weekly window, sometimes more. If you already
track how much of each is left, you can point the app at that data and the orchestrator will use
it when it routes work.

Each **standup**, the app makes one `GET` to your URL, writes the result to
`usage-availability.json` in the hive root, and appends a short summary to the standup message.
The orchestrator then knows things like:

- *"codex has 8% of its five-hour window left: stop sending it work."*
- *"claude's five-hour window resets in 1h 10m with 60% unused: good time to give it more."*

It is optional and off by default. If the endpoint is down, the standup still goes out with a
line saying the usage data was unavailable.

## Turn it on

Settings → Autonomy & Budgets → **Usage endpoint**. Enter the URL, an optional bearer token and a
timeout, then press **Test** to see exactly what the orchestrator would be told. Nothing is saved
until you save settings.

## What your endpoint returns

`GET <url>` → `200` with JSON:

```json
{
  "timestamp": "2026-10-17T14:40:00Z",
  "agents": {
    "claude": {
      "five_hour": { "remaining_pct": 90.0, "resets_at": "2026-10-17T18:00:00Z" },
      "weekly":    { "remaining_pct": 69.5, "resets_at": "2026-10-21T00:00:00Z" },
      "availability": "available"
    },
    "codex": {
      "five_hour": { "remaining_pct": 8.0, "resets_at": "2026-10-17T15:30:00Z" },
      "availability": "available"
    }
  }
}
```

| Field | Meaning |
|---|---|
| `agents.<name>` | Any engine name you like. Use the names you use for your agents (`claude`, `codex`, `gemini`, ...). Up to 64. |
| `<window>` | Any key whose value is an object with a numeric `remaining_pct`. `five_hour` and `weekly` are conventions, not requirements; you can report `daily`, `monthly`, etc. Up to 8 per engine. |
| `remaining_pct` | 0–100. Values outside the range are clamped. |
| `resets_at` | ISO-8601 timestamp. Optional; without it the orchestrator gets the percentage only. |
| `availability` | Free text. Anything other than `available` is treated as "do not send new work here". |
| `timestamp` | When your data was measured. Optional. |

Everything is optional except having at least one engine with a window or an `availability`.
Unknown keys, malformed windows and bad dates are dropped, not rejected, so you can add your own
fields.

The response must be under 256 KB and the request is answered within your timeout (default 5 s,
max 30 s). Redirects are refused, so a token is never forwarded to a host you did not enter.

## How the orchestrator reads it

| Situation | Hint added to the standup |
|---|---|
| Any window at or below 15%, or `availability` is not `available` | *LOW: avoid new work here, reroute to another engine* |
| A window resets within 2 hours and still has 30% or more left | *use it or lose it ... good time to hand this engine more work* |
| Anything else | The numbers only |

The thresholds are constants in `src/shared/usageEndpoint.ts` (`LOW_PCT`, `BURN_WITHIN_MS`,
`BURN_MIN_PCT`).

## A reference server (Flask)

Replace `read_usage()` with however you gather the numbers (scraping CLI output, a database, a
cron job that writes a file).

```python
# usage_server.py  —  pip install flask
import os
from flask import Flask, jsonify, request, abort

app = Flask(__name__)
TOKEN = os.environ.get("USAGE_TOKEN")  # optional; set it and put the same value in Settings


def read_usage():
    return {
        "claude": {
            "five_hour": {"remaining_pct": 90.0, "resets_at": "2026-10-17T18:00:00Z"},
            "weekly": {"remaining_pct": 69.5, "resets_at": "2026-10-21T00:00:00Z"},
            "availability": "available",
        }
    }


@app.get("/api/agents/remaining")
def remaining():
    if TOKEN and request.headers.get("Authorization") != f"Bearer {TOKEN}":
        abort(401)
    from datetime import datetime, timezone
    return jsonify({"timestamp": datetime.now(timezone.utc).isoformat(), "agents": read_usage()})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
```

Quick check: `curl -H "Authorization: Bearer $USAGE_TOKEN" http://localhost:8080/api/agents/remaining`.

## Security

- The URL may be plain `http://` so a box on your LAN works. Keep it on your LAN or a VPN, or put
  it behind TLS if it is reachable from anywhere else.
- The bearer token is stored in the app's `config.json` in plain text.
  Use a token that only grants read access to this one endpoint.
- The app only ever reads from the endpoint. It never sends your agents' prompts, code or tokens.
