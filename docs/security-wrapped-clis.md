# Running behind a security-wrapped agent CLI

Some companies do not let you run a stock agent CLI. They ship their own build instead — same
underlying model and roughly the same flags, wrapped in a layer that enforces auth, spend limits,
and a tool-approval policy the security team owns. Coinbase's `cbcode` is one of these. If your
laptop has something like it, this page is for you.

The harness works fine with these builds. It just needs to be told that the wrapper *is* the agent,
because a wrapped binary trips three assumptions at once and the failure looks like "the agent
appears on the floor and then does nothing".

## Why a wrapper breaks things

**The binary name is unknown.** `inferAgentProvider()` maps a command to a provider by its binary
name. An unrecognised name falls through to the `custom` preset, which is `hiveAware: false` with no
`hookBridge` — no protocol injection, no lifecycle hooks, no inbox drain. The terminal works; the
agent is not in the hive.

**The auto-mode flag is refused.** The `claude` preset launches with
`--permission-mode bypassPermissions`. That flag is exactly what a corporate wrapper exists to
prevent, so it is usually rejected outright and the process exits non-zero. The agent dies at spawn.

**Slash commands may be missing.** Munder Difflin opens the GOD agent with `/remote-control`, which
relies on the vendor's own remote-session feature. A wrapper authenticating against a company
gateway generally does not have it, and the command text is left stranded in the prompt.

## Setting up cbcode

`cbcode` is supported directly — the harness recognises the binary, sends it the `auto` permission
mode it accepts, and skips `/remote-control`.

1. **Confirm the CLI works on its own first.** This is the step worth not skipping: if `cbcode` is
   not authenticated, every downstream symptom looks like a harness bug.

   ```bash
   cbcode doctor
   cbcode --permission-mode auto -p "reply with OK"
   ```

   You want `OK` back. If you get an auth error, fix it with `cbcode` before opening the app.

2. **Install and run the harness** as normal — see [Getting started](../README.md#getting-started).

3. **Set the agent command to `cbcode`.** In the onboarding wizard, or per agent via **Add agent**,
   the command is `cbcode` rather than `claude`. The model picker, hive protocol and inbox all work.

### Known limitations

**Lifecycle hooks do not fire.** `cbcode` accepts the `--settings` flag that wires our lifecycle
hooks (`SessionStart`, `Stop`, …) but never runs them, so a cbcode agent has no live status ticker,
no Stop-to-inbox drain, and no captured session id. The harness compensates by delivering the
standing goal on the PTY the way a hookless engine does, so an agent still receives and acts on its
goal — it simply reports less telemetry to the floor.

**A shim *named* `claude` that is really cbcode is not detected.** The carve-outs key off the
resolved binary's leaf name, so a managed-laptop install that ships `cbcode` under the name `claude`
still receives `--permission-mode bypassPermissions` and dies at spawn. Set the agent's provider
explicitly, or name the command `cbcode`, to work around it.

### Do not rely on a shell alias

A common setup is `alias claude=cbcode` in `.zshrc`. That will not do what you want here. Shell
aliases only exist in interactive shells, and the harness resolves the binary off `PATH`, so
`claude` will resolve to whatever real `claude` binary you have installed — or fail if you have
none. Type `cbcode` into the command field explicitly.

You can check what the harness will actually resolve:

```bash
zsh -c 'command -v claude'   # what the harness sees — NOT your alias
```

### One caveat worth knowing

`cbcode` can front more than one agent (`--agent claude|codex|opencode|pi`, and a persistent default
set by `cbcode select-agent`). The harness treats a `cbcode` command as the **Claude** family, which
is correct for the default. If you have switched your default agent away from Claude, point the
harness at that vendor's own CLI instead, or pass `--agent claude` explicitly in the command field.

## Adding support for a different wrapper

If your company ships something similar, the change is small and lives in three places:

| What | Where | What to add |
|---|---|---|
| Recognise the binary | `src/shared/agentProvider.ts` → `inferAgentProvider()` | Map your binary name to the provider family it wraps. |
| Fix the auto-mode flag | `src/main/pty.ts` → `normalizeArgsForBinary()` | Rewrite the rejected flag to whatever your wrapper accepts, gated on the resolved binary. |
| Skip unsupported slash commands | `src/renderer/src/hooks/useHive.ts` | Carve your binary out of the `/remote-control` opener. |

Gate every rewrite on the **resolved** binary, never on the provider family, so a stock install of
the CLI you are wrapping keeps its existing arguments untouched. Add a regression test asserting
exactly that — `test/win-cmd-shim.test.cjs` has one for cbcode you can copy.

A note on posture, because this code path is about permissions: the goal is to send the *strictest*
mode your wrapper will accept, not to find a way back to the permissive one. If a wrapper refuses a
flag, that refusal is the security control doing its job. Work with it.

## Troubleshooting

| Symptom | Cause |
|---|---|
| Agent spawns then exits immediately | The wrapper refused the permission flag. Run the command by hand to see the refusal. |
| Agent runs but ignores the hive | Binary not recognised — it fell through to the `custom` preset. |
| `/remote-control` text stuck in the prompt | The wrapper has no such slash command; it needs carving out. |
| Works in your terminal, not in the app | A shell alias. The harness resolves off `PATH`, not your `.zshrc`. |
