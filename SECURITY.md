# Security Policy

## Scope

Agent Stage is a local-first desktop app. It starts local processes in PTYs and
reads and writes files under directories you register. It has no public network
listener; its hook server uses a local Unix-domain socket.

Running Agent Stage can execute commands and affect files on your machine. You
are responsible for deciding whether it is safe for your environment, data,
credentials, projects, and workflows. Use it at your own risk.

The software is provided without warranty. The project owner and contributors
accept no responsibility or liability for damage, loss, or other consequences
of using it.

## Supported versions

Security fixes target the `main` branch only.

| Version | Supported |
| --- | --- |
| `main` | Yes |
| older tags | No |

## Reporting a vulnerability

Open a public GitHub issue or submit a pull request with the vulnerability,
impact, and reproduction details. Do not include secrets, private credentials,
or sensitive user data in a public report.

## Notes for reviewers

- Renderer ↔ main IPC goes through a typed `contextBridge` (`window.cth`); the renderer has no direct Node access (`nodeIntegration: false`, `contextIsolation: true`).
- All `fs:*` / `git:*` IPC calls are sandboxed and path-validated in the main process, rooted at an agent's working directory.
- The hive commits to a local git repo from a single committer (the main process); agents only write plain files.
