# Contributing to Agent Stage

Contributions are welcome through pull requests. Keep them easy to review.

## Rules for pull requests

- Open a PR when the change is ready. You do not need permission first for a focused fix or improvement.
- One fix, improvement, or refactor per PR. Split unrelated work.
- Keep the diff small. Do not mix a behavior change with cleanup, formatting, or a broad rewrite unless all of it is necessary for that single change.
- Write a clear title and description that state what changed, why it changed, and how you verified it.
- Include screenshots or a short recording for visual changes. Show the same state before and after when that makes the result clearer.
- Add a test when it meaningfully protects changed behavior or a regression. Tests are not ceremony; they should earn their maintenance cost.

## Before opening a PR

1. Read your diff. Remove debug output, dead code, unrelated formatting, and generated files.
2. Run the relevant checks. For most code changes, start with:

   ```bash
   npm run typecheck
   npm run test:focused
   ```

3. For UI work, verify the running Electron app and include visual evidence.
4. For a behavior change, add or update a test when it provides useful regression coverage.
5. If you change design surfaces, use the tokens and conventions in [`DESIGN.md`](./DESIGN.md).

## Working in the repository

- Agent Stage supports macOS, Windows, and Linux. Use platform-safe paths and avoid shell assumptions.
- Quote paths and account for directories with spaces.
- Keep provider-specific behavior behind an explicit check. Shared behavior must remain provider-neutral.
- Do not assume another developer's files, credentials, processes, or shell are available.
- Do not commit credentials, tokens, customer data, `node_modules`, build output, or generated artifacts.

## Development setup

```bash
git clone <your-fork-url> agent-stage
cd agent-stage
npm install
npm run dev
```

Agent Stage requires Node.js 18+ and a C/C++ toolchain for `node-pty`. If an Electron upgrade leaves `node-pty` with an ABI error, run `npm install` again.

## Assets and questions

Contributed art must be original or compatibly licensed, with attribution where needed. Do not add third-party theme packs or unlicensed assets to the repo.

Use a GitHub issue or discussion for questions that need coordination before a large change.
