---
title: "LiteLLM 1.107.0 Compromise: What It Steals and How to Check Your Machine"
seoTitle: "LiteLLM 1.107.0 Compromised on PyPI: How to Check and What to Rotate"
description: "LiteLLM 1.107.0 on PyPI carried a credential stealer and a backdoor on 21 Oct 2026: who was exposed, how to check without Python, and what to rotate."
date: 2026-10-21
category: guides
categoryLabel: Guides
type: Technical
primaryKeyword: "litellm 1.107.0"
secondaryKeywords: ["litellm compromised", "litellm pypi malware", "litellm 1.107.0 malware", "cook.pth", "litellm credential stealer", "litellm docker image compromised"]
tags: ["Guides", "Security", "Open Source"]
faq:
  - q: "Which LiteLLM version was compromised?"
    a: "litellm 1.107.0 on PyPI, uploaded on 21 Oct 2026 between 11:39 and 11:40 UTC. SafeDep reports that all seven wheels for Linux, macOS and Windows carry the implant, and BerriAI says PyPI quarantined the release. SafeDep and the public report on BerriAI's GitHub say 1.106.2, 1.107.0rc1 and 1.107.0rc2 are clean. BerriAI asks open source users to pin 1.106.2 or an explicit version published before the incident."
  - q: "Was the LiteLLM Docker image affected too?"
    a: "Yes, for a time. BerriAI's incident report says the v1.107.0, latest, main-latest and main-stable tags pointed to the compromised image from 11:46 UTC on 21 Oct 2026, until 13:51 UTC on GitHub's registry and 14:20 UTC on Docker Hub. If a container ran that image in that window, treat it as compromised."
  - q: "How do I check if I installed LiteLLM 1.107.0?"
    a: "Search from the shell, without starting Python, for cook.pth, cook.py and sitecustomize.py inside site-packages folders, and for a litellm-1.107.0.dist-info folder. Also look for /tmp/.pc_once_72129118c59f5636c0bb and /tmp/remote_code_loader.lock. The report on BerriAI's GitHub warns that any Python start, pip included, runs the payload again."
  - q: "Did Aider install the bad LiteLLM release?"
    a: "Not on its own. On 21 Oct 2026 the aider-chat package on PyPI (version 0.86.2) pins litellm 1.81.10, so installing Aider pulls that version. An environment where litellm was upgraded separately on 21 Oct is a different case and should be checked."
  - q: "What should I rotate after installing LiteLLM 1.107.0?"
    a: "Everything the host could reach: SSH keys, cloud credentials and instance roles, CI secrets, coding agent tokens, browser saved passwords, every provider key stored in a LiteLLM proxy database with its master and virtual keys, and the database password. The report on BerriAI's GitHub says to assume the theft succeeded if 1.107.0 was ever installed on a host with internet access."
---

If you installed litellm 1.107.0 from PyPI or pulled a floating LiteLLM Docker tag on 21 Oct 2026, treat that machine as compromised: clean it from the shell and rotate every secret it could reach. Updated on 22 Oct 2026 at about 04:00 UTC with BerriAI's incident report; the investigation continues.

LiteLLM is the open source Python library and proxy that lets one piece of code call many model providers. [Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. Our [security guide for AI coding agents](/blog/security-for-ai-coding-agents/) covers the wider habits and our [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup; this page covers one incident.

## What happened to LiteLLM 1.107.0?

A poisoned build of LiteLLM sat on PyPI for under two hours. [SafeDep's analysis](https://safedep.io/litellm-pypi-compromise-credential-stealer-backdoor/) of 21 Oct says the 1.107.0 wheels add three files to site-packages, and two of them "run when any Python process starts on the host, even one that never imports litellm." A [public report on BerriAI's GitHub](https://github.com/BerriAI/litellm/issues/47826) set out the same findings at 12:06 UTC.

| Time, 21 Oct 2026 (UTC) | Event | Source |
| --- | --- | --- |
| 10:44 | Clean 1.106.2 uploaded to PyPI | SafeDep, PyPI |
| 11:20 to 11:37 | Malicious 1.107.0 wheels built | SafeDep |
| 11:39 | 1.107.0 live on PyPI | BerriAI |
| 11:46 | Docker tags point to the bad image | BerriAI |
| 12:06 | Public report opened on BerriAI's GitHub | GitHub |
| 13:23 | Pulled from PyPI | BerriAI |
| 13:51 | GitHub registry tags made unavailable | BerriAI |
| 14:20 | Docker Hub tags pointed at clean sources | BerriAI |
| 21:22 | BerriAI names the attack chain | GitHub |

BerriAI's [incident report](https://docs.litellm.ai/blog/security-incident-oct-21-2026) and its 21:22 UTC update on GitHub set out the attack chain BerriAI believes it has found; it is still confirming parts of it. In that account, the attacker held GitHub CLI OAuth tokens of three BerriAI engineers. With an organization owner's token it disabled branch protection and pointed the release workflow at a lookalike repository, `Berri-AI/litellm`, which built and signed the wheels. BerriAI believes the tokens came from the logs of its own internal LiteLLM deployment, which was open to the internet, and says "Claude Code will embed a user's GitHub CLI OAuth token into a response body" in specific situations, so a proxy that logs response bodies can store it. How the attacker reached that deployment is not yet confirmed.

<figure class="mg" data-scene="window"><img src="/blog/assets/media/litellm-1-107-0-compromise/window.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A day timeline for 21 Oct 2026 in UTC slides in. A clean 1.106.2 package lands at 10:44. A 1.107.0 package lands at 11:40 and a highlighted band opens from there. A PyPI marker closes at 13:23 and a Docker marker closes at 14:20. A label reads Exposure window."><figcaption>The exposure window on 21 Oct 2026, from SafeDep's timeline and BerriAI's incident report. The Docker marker shows the later Docker Hub close.</figcaption></figure>

## What does the malware take?

SafeDep describes two payloads. A file named `cook.pth` runs `cook.py`, a stealer that encrypts what it finds and sends it to a lookalike domain, `www.litellm[.]dev`. A `sitecustomize.py` file starts a background process that, every hour, reads a server address from a GitHub file, runs the stealer again and downloads and runs code from that server. SafeDep found that the GitHub account behind that address returned 404 at 13:40 UTC, so the backdoor now finds no server, but hosts that ran it earlier "could have received and run second-stage code."

What the stealer reads, per SafeDep's table:

* SSH, GPG and TLS private keys, and shell history.
* Cloud credentials for AWS, Azure and Google Cloud, Kubernetes and Docker configs, the GitHub CLI's hosts file and ~/.netrc.
* CI secrets: GitLab runner, Jenkins, Vault and Terraform files.
* Coding agent and editor tokens: Claude Code, Claude Desktop, Cursor, Windsurf, Copilot, VS Code `mcp.json`, Gemini CLI, Codex `auth.json`, Continue, Aider, Goose, opencode, Qwen, Crush, Kiro and Zed, plus a Hugging Face token.
* Saved browser passwords and history.
* Environment variables of its own process and of other processes.
* The provider API keys stored in a LiteLLM proxy database.
* AWS instance role credentials from the metadata service.

<figure class="mg" data-scene="magnet"><img src="/blog/assets/media/litellm-1-107-0-compromise/magnet.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A row of folders labelled SSH, Cloud, CI, Agent tokens, Browser and Proxy keys sits on a white shelf. A horseshoe magnet passes over them and small key shapes lift out of each folder into a locked box labelled Sent out. Tap a folder to see what it holds."><figcaption>What the stealer collects, grouped from SafeDep's table of modules (21 Oct 2026).</figcaption></figure>

## Are you affected?

Match what you did on 21 Oct 2026 against each row:

| What you did | Exposed? |
| --- | --- |
| pip or uv installed litellm 1.107.0, or an unpinned upgrade picked it up, between 11:39 and 13:23 UTC | Yes |
| Pulled ghcr.io/berriai/litellm, litellm-database, litellm-non_root or docker.io/litellm/litellm by tag v1.107.0, latest, main-latest or main-stable from 11:46 UTC until 13:51 (GitHub) or 14:20 (Docker Hub) | Yes |
| Installed 1.106.2, 1.107.0rc1 or 1.107.0rc2 | No, per SafeDep |
| Installed aider-chat 0.86.2 without touching litellm | No: it pins litellm 1.81.10 |
| BerriAI enterprise customer on the private registry | No, per BerriAI |

Any tool with an unpinned litellm could have pulled it, so check every project's lock file. A pip or uv cache, or a company package mirror, can still hold the release after PyPI removed it.

## How do you check your machine?

The GitHub report warns: "Any Python start in the affected environment runs `cook.pth` and `sitecustomize.py` again, and that includes running pip." So check from the shell, with commands that do not start Python.

```bash
# implant files in any site-packages or dist-packages folder (macOS and Linux)
find / -path '*-packages/cook.pth' -o -path '*-packages/cook.py' \
  -o -path '*-packages/sitecustomize.py' 2>/dev/null

# the 1.107.0 install record
find / -type d -name 'litellm-1.107.0.dist-info' 2>/dev/null

# markers the malware leaves behind
ls -la /tmp/.pc_once_72129118c59f5636c0bb /tmp/remote_code_loader.lock 2>/dev/null
```

The first marker means the stealer uploaded its data; the lock file means the backdoor ran. The report adds that a missing marker "proves nothing", because containers and temp folder cleanup remove it. A `sitecustomize.py` can also be legitimate, so look at the folder it sits in and compare it with the `litellm-1.107.0.dist-info` result.

<figure class="mg" data-scene="lens"><img src="/blog/assets/media/litellm-1-107-0-compromise/lens.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A magnifying glass moves along a folder tree that ends in a site-packages folder. Three files light up yellow inside it: cook.pth and two Python files, cook and sitecustomize, and a litellm-1.107.0.dist-info folder lights lilac. Two small tags below read /tmp marker and lock file. Tap the glass to step through the checks."><figcaption>The files and markers to look for, from SafeDep's indicators of compromise (21 Oct 2026).</figcaption></figure>

## What should you do if you find it?

The remediation in the GitHub report, in order:

1. From the shell, delete `cook.pth`, `cook.py` and `sitecustomize.py`, and their cached `.pyc` files, from every affected site-packages folder.
2. Stop the detached Python process that holds `/tmp/remote_code_loader.lock`.
3. Reinstall pinned to litellm 1.106.2, or better, rebuild the environment or image from scratch.
4. If 1.107.0 was ever installed on a host with internet access, assume the data was sent.
5. Rotate everything that host could reach: instance roles, every provider key in the LiteLLM proxy database plus the master and virtual keys, the database password, and any secret in the environment of any process. Our addition: SafeDep's list includes coding agent token files, so revoke or rotate the tokens and API keys used by Claude Code, Codex and any other agent on that host.
6. On AWS, check CloudTrail for `GetCallerIdentity` calls from the instance role around install time, then for use of that role's credentials from outside your own infrastructure.

On 22 Oct at 02:19 UTC BerriAI said on GitHub that its registries stay locked to new releases and regular LiteLLM releases are paused. Wiz told BerriAI there at 19:14 UTC on 21 Oct that it had begun to observe post exploitation activity.

Our view: two lessons. The payload ran at Python start, not at import, so pin versions and review lock file changes before an upgrade lands on a machine that holds agent tokens. And treat any log that stores model responses as a secret store: BerriAI believes that is where the tokens behind this release came from. For the wider risk of agents with access to secrets, read [the lethal trifecta for coding agents](/blog/the-lethal-trifecta-for-coding-agents/) and [MCP tool poisoning](/blog/mcp-security-tool-poisoning/).

<link rel="stylesheet" href="/blog/assets/media/litellm-1-107-0-compromise/motion.css"><script defer src="/blog/assets/media/litellm-1-107-0-compromise/motion.js"></script>
