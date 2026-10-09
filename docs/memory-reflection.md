# Provider-aware memory reflection

`MemoryReflector` bounds oversized agent `memory.md` files in Electron's main
process. It is independent of the interactive worker terminal. Every rewrite
still follows **lossless backup → summary validation → atomic swap**; pinned
facts and the newest sections must survive verbatim, and the result must shrink.
Backups are under `<harnessHome>/hive/backups/`.

## Provider and model selection

By default, reflection reads the agent's provider from the hive registry and its
command/model from the durable roster. A global `defaultCommand: "claude"` does
not override an OpenCode worker. For an older record without a provider recipe,
the global command remains the legacy fallback.

- **Claude:** uses the existing hidden interactive session and its subscription
  semantics. The cheap default remains `claude-haiku-4-5`; `reflectModel` can
  override it. All tools are denied for the text transformation.
- **OpenCode:** uses `opencode run`, reads the supplied prompt from stdin, and
  captures only text from its NDJSON event stream. It inherits the worker's
  model (or OpenCode's configured default), uses a dedicated deny-all-tools
  agent, disables external plugins and sharing, and sets an explicit session
  title to avoid an extra title-generation model request. This requires a CLI
  supporting `--pure`; the reproducible CLI fixture was verified with 1.18.34.
- **Other CLIs:** no safe reflection adapter is provided yet. Reflection logs
  `unsupported-provider` without launching Claude or another guessed CLI. An
  operator can explicitly select a supported reflection provider below.

For OpenCode `local/<model>`, the harness's configured OpenCode base URL and model
registration are forwarded. For a known cloud model prefix, only that backend's
broker key is forwarded. A CLI-default model uses OpenCode's own saved credentials;
the reflector does not hand it every broker secret.

## Optional config.json overrides

These main-process settings can select one explicit summarizer for the whole
floor; they are not a new Settings UI. Existing `reflectEnabled` and threshold
settings are unchanged.

```json
{
  "reflectProvider": "opencode",
  "reflectModel": "local/your-configured-model",
  "reflectCommand": "opencode",
  "reflectRetryBackoffMs": 3600000
}
```

Use an installed CLI binary/path, not a shell pipeline or arbitrary launch flags.
Quote an executable path containing spaces in the command string. If only
`reflectCommand` is set, its recognizable CLI name selects the provider. When
switching provider, the old provider's model is not inherited. No CLI is installed
automatically by reflection. An unavailable/unsupported CLI leaves memory intact.

## Limits and failure visibility

Quota/rate-limit output is logged as `condense-abort` with `reason: rate-limited`,
the selected provider/model, the limit detail and `retryAt` (Unix milliseconds),
instead of a summary-format error. Both autonomous and manual calls respect that
deadline. Agents using the same home/provider/binary/model share its cooldown.

Explicit relative retry delays and recent future Claude UTC reset banners are
honored. Unknown timezones, missing or stale resets use exponential backoff:
one hour by default, increasing to at most 24 hours. The configured initial delay
has a one-minute floor. Cooldowns are in-process, not persisted across app restart;
a restart can make one new attempt. A successfully parsed response clears the
cooldown. Bad summary structure remains `summarize-failed` and cannot overwrite
the original memory.

OpenCode calls have a three-minute timeout and a 1 MB output bound. Timeout or
overflow terminates their process tree. Windows npm shims are decoded to their
JavaScript interpreter or native executable; prompts never pass through `cmd.exe`.

## Reproducible tests

```sh
node --test test/reflect-provider.test.cjs test/reflect-session.test.cjs test/reflect-summary.test.cjs test/hidden-claude-limit.test.cjs
OPENCODE_BIN=/path/to/opencode node test/reflect-opencode.manual.cjs
```

The first command exercises provider selection, main wiring, quota backoff,
memory preservation, protocol parsing, process failures and Windows shim shapes.
The second runs an **official CLI** against an isolated deterministic loopback
OpenAI-compatible fixture. It verifies model selection, stdin/NDJSON transport,
no advertised tools and one successful model request. A second scenario emits a
deterministic quota banner through the CLI and verifies memory preservation plus
a zero-request cooldown call. This is neither an LLM quality benchmark nor a real
account-quota test; it uses no paid backend or account credentials.
