# Codex launch evidence for issue #642

The PNGs render captured stdout from the same launch-argument regression, against origin/main (before) and the fix (after). They are test-output captures, not screenshots of the application or proof of mobile connectivity.

The regression checks that an Auto Mode resume retains its session ID, approval policy, sandbox and writable hive directory without selecting remote transport. The old helper attaches `--remote`; the new launch planner selects `--no-daemon`.

To repeat from the repository root:

```sh
git show origin/main:src/shared/codexRemote.ts > /tmp/md-codex-642-before.ts
CODEX_TEST_SOURCE=/tmp/md-codex-642-before.ts node --test --test-reporter=spec docs/evidence/issue-642/check-launch.cjs
node --test --test-reporter=spec docs/evidence/issue-642/check-launch.cjs
```

The first run should exit 1, and the second should exit 0. Paths with spaces are deliberately included. No Codex model turn is run.
