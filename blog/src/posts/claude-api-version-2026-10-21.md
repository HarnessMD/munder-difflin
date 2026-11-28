---
title: "Claude API Version 2026-10-21: What Breaks and How to Upgrade"
seoTitle: "Claude API 2026-10-21: temperature Removed, SDK 2.0 Changes (Oct 2026)"
description: "Claude API version 2026-10-21 removes temperature, top_p and top_k and ships new SDK majors. What returns a 400 now, what breaks proxies, and how to upgrade."
date: 2026-10-22
category: guides
categoryLabel: Guides
type: Technical
primaryKeyword: "claude api 2026-10-21"
secondaryKeywords: ["anthropic-version 2026-10-21", "anthropic python sdk 2.0", "claude api temperature removed", "anthropic temperature 400 error", "anthropic sdk authorization bearer", "anthropic api version migration"]
tags: ["Guides", "Claude API", "Python"]
faq:
  - q: "Is temperature removed from the Claude API?"
    a: "Yes, in API version 2026-10-21. Anthropic's migration guide says a request that sends temperature, top_p or top_k returns a 400 error, even at the parameter's default value. Requests on 2023-06-01 keep working with them. The new SDK majors, such as Python 2.0.0, no longer have the three parameters."
  - q: "Which SDK versions use API version 2026-10-21?"
    a: "Python SDK 2.0.0, TypeScript SDK 1.0.0, C# SDK 13.0.0, Go SDK 2.0.0, Java SDK 3.0.0, PHP SDK 1.0.0, Ruby SDK 2.0.0 and the ant CLI 2.0.0, per Anthropic's API release notes of 21 Oct 2026. Older SDK versions keep sending 2023-06-01."
  - q: "Do I have to upgrade to 2026-10-21 now?"
    a: "Anthropic's versions page recommends the latest API version whenever possible, and it gives no end date for 2023-06-01 on 22 Oct 2026. The migration guide says a request that relies on a non default temperature can stay on 2023-06-01."
  - q: "Why does my proxy reject requests after upgrading the Anthropic SDK?"
    a: "The new SDKs send your API key as Authorization: Bearer instead of the X-Api-Key header. A proxy or gateway that reads X-Api-Key finds no key. Change it to read Authorization, or set X-Api-Key yourself on the client, as Anthropic's migration guide shows."
  - q: "Does API version 2026-10-21 work on Amazon Bedrock?"
    a: "Only for Claude 4.7 and later models. Anthropic's migration guide says calls to older models on Bedrock should stay on the SDK version or API version you use today, or move to a Claude 4.7 or later model first."
---

Claude API version 2026-10-21 is the first new Claude API version since 2023-06-01. Anthropic released it on 21 Oct 2026 with new major versions of every SDK. It removes `temperature`, `top_p` and `top_k`, rejects two odd message shapes, renames fields in the Admin API, and the new SDKs send your key in a different header.

This page sums up Anthropic's [versions page](https://platform.claude.com/docs/en/api/versioning), [migration guide](https://platform.claude.com/docs/en/api/migration-2026-10-21) and API release notes, opened on 22 Oct 2026, with the Python changes in most detail. If you would rather run a team of agents than call the API yourself, [Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. Our [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup.

## What changed in Claude API version 2026-10-21?

Three Messages API requests that used to work now return a 400 error, and each SDK has a new major version that sends `anthropic-version: 2026-10-21` by default. An SDK keeps the API version that was current when its major version came out, so code on an older SDK keeps sending 2023-06-01 until you upgrade.

| SDK or tool | First version on 2026-10-21 |
| --- | --- |
| Python | 2.0.0 |
| TypeScript | 1.0.0 |
| Go | 2.0.0 |
| Java | 3.0.0 |
| C# | 13.0.0 |
| PHP and Ruby | 1.0.0 and 2.0.0 |
| ant CLI | 2.0.0 |

The release notes add that the new SDK and CLI versions are licensed under Apache 2.0 instead of MIT, and the versions page says 2026-10-21 runs on the Claude API, Claude Platform on AWS, Microsoft Foundry and Google Cloud. On Amazon Bedrock it covers Claude 4.7 and later models only.

<figure class="mg" data-scene="header"><img src="/blog/assets/media/claude-api-version-2026-10-21/header.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A request card shows the header anthropic-version 2023-06-01. The date flips to 2026-10-21, and eight small badges drop onto a shelf below: Python 2.0.0, TypeScript 1.0.0, Go 2.0.0, Java 3.0.0, C# 13.0.0, PHP 1.0.0, Ruby 2.0.0 and ant CLI 2.0.0. Tap a badge to see that it sends 2026-10-21."><figcaption>The SDK versions that send API version 2026-10-21, from Anthropic's API release notes (21 Oct 2026).</figcaption></figure>

## Why do temperature, top_p and top_k return a 400?

They are removed. Anthropic's migration guide says a request on 2026-10-21 that sends `temperature`, `top_p` or `top_k` "returns a 400 error, even at the parameter's default value." That covers Message Batch requests and token counting too.

The fix is to delete the three parameters; the new SDK majors no longer have them:

```python
# anthropic 1.x sends 2023-06-01: temperature is accepted
client.messages.create(model="claude-opus-5-5", max_tokens=1024,
                       temperature=1.0, messages=messages)

# anthropic 2.0 sends 2026-10-21 and has no temperature, top_p or top_k
client.messages.create(model="claude-opus-5-5", max_tokens=1024,
                       messages=messages)
```

A request without them samples at the defaults, a `temperature` of 1.0, the same as a 2023-06-01 request that leaves them out. Models that already accept only the defaults, "such as Claude 4.7 and later models," sample as before. On a model that accepts other values, such as Claude Sonnet 4.6, a request that lowered `temperature` for steadier output loses that effect, and the guide says: "No other setting replaces it." Such a request can stay on 2023-06-01.

<figure class="mg" data-scene="dials"><img src="/blog/assets/media/claude-api-version-2026-10-21/dials.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A control panel has three dials labelled temperature, top_p and top_k. A request card with the dials attached gets a yellow stamp reading 400. The dials lift off the panel, the card goes again and gets a mint stamp reading 200, with a note that reads Defaults, temperature 1.0. Tap Remove to lift the dials yourself."><figcaption>Sampling parameters on API version 2026-10-21, from Anthropic's migration guide (21 Oct 2026).</figcaption></figure>

## What other requests now fail?

Two message shapes, plus renamed fields outside the Messages API. A `document` block placed directly in an `assistant` message returns a 400; send documents in `user` messages instead. A `text` block with a non empty `citations` array in a `user` message, directly or inside a `search_result` block, also returns a 400. Citations on Claude's own replies that you send back are still accepted.

In the Admin API, API key entries no longer return `workspace_id` (use `scope.workspace_id`), RBAC roles return `display_name` instead of `name`, and rate limit entries return `group.type` instead of `group_type`. The Claude Enterprise Analytics reports drop `actor.email` for `actor.email_address`. Dashboards built on those fields need the new names.

## What changes in the Anthropic Python SDK 2.0?

Most code that writes messages as plain dicts needs no change. The main ones for Python, from the guide:

* `MessageParam` is now a union of `UserMessageParam`, `AssistantMessageParam` and `SystemMessageParam`. Calling `MessageParam(role="user", content="Hello")` raises a `TypeError`; write the dict instead.
* `client.models.list()` and `retrieve()` no longer take `betas`. Use `client.beta.models.list(betas=[...])`.
* The API key goes out as `Authorization: Bearer <key>`, not `X-Api-Key`.
* A client holds one credential. Passing both `api_key` and `auth_token` now raises a `ValueError`; version 1 sent both.
* With no credential in code, the client takes the first of `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, the profile `ANTHROPIC_PROFILE` names, the workload identity federation variables and the active profile on disk, and logs a warning when the first two are both set.

## Will a proxy or gateway break?

It will if it reads `X-Api-Key`. The Claude API accepts a key in either header, so code that talks to the API directly is fine. A company gateway, a logging proxy or a router that looks for `X-Api-Key` will see a request with no key once your app moves to the new SDK. Change it to read `Authorization`, or move the key back with the `auth` function on the HTTP client that the guide shows. If you relied on sending a gateway token and an API key together, the guide's answer is to pass the token as `auth_token`, set `X-Api-Key` in `default_headers`, and have the gateway remove its `Authorization` header before it forwards the request. For a proxy of another kind, one that routes Claude Code to other providers, see our [Claude Code Router guide](/blog/claude-code-router/).

<figure class="mg" data-scene="key"><img src="/blog/assets/media/claude-api-version-2026-10-21/key.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A key token slides out of a slot labelled X-Api-Key and into a slot labelled Authorization Bearer on an envelope. The envelope reaches a gateway box that checks only the X-Api-Key slot and shows a yellow note reading No key found. Tap Fix gateway and the box checks the Authorization slot, turns mint and lets the envelope through to the Claude API."><figcaption>Why a gateway that reads X-Api-Key misses the key from the new SDKs, from Anthropic's migration guide (21 Oct 2026).</figcaption></figure>

## How do you upgrade safely?

Do it in one release, as the guide's steps say: upgrade the SDK, fix the breaking changes, test against 2026-10-21, ship together. In practice:

1. Search your code for `temperature`, `top_p` and `top_k`, including Message Batch jobs and prompt templates that pass them through.
2. Check any proxy, gateway or test double that reads `X-Api-Key`.
3. Upgrade the package, such as `pip install "anthropic>=2.0.0"`, and run your type checker for `MessageParam` and `betas` errors.
4. Keep calls to older Bedrock models on your current SDK until they move to Claude 4.7 or later.

Claude Code 2.1.307, released on 21 Oct, added a `/claude-api api-version` command to move Claude API code to 2026-10-21; its release notes do not say what it edits. Our view: the sampling change is the one most likely to slip through, because a call that sets `temperature` to its default looks harmless and still fails. For background on building agents on this API, read [what the Claude Agent SDK is](/blog/what-is-claude-agent-sdk/).

<link rel="stylesheet" href="/blog/assets/media/claude-api-version-2026-10-21/motion.css"><script defer src="/blog/assets/media/claude-api-version-2026-10-21/motion.js"></script>
