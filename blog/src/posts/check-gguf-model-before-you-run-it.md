---
title: "GGUF Malware: How to Check a Model Before You Run It"
seoTitle: "GGUF Malware: Check a Model Before You Run It"
description: "Spot GGUF malware before it runs: read the chat template, scan for bytes after the last tensor, use the original publisher, run no command it prints."
date: 2026-11-28
category: guides
categoryLabel: Guides
type: Technical
primaryKeyword: "gguf malware"
secondaryKeywords: ["malicious gguf models", "gguf chat template poisoning", "is it safe to download gguf", "gguf-radar", "gguf security"]
tags: ["Guides", "Security", "Local-First", "Models"]
author:
  name: Chaitanya Giri
  initials: CG
faq:
  - q: "Can a GGUF file contain malware?"
    a: "Malspark reports that it can. Its scan of Hugging Face on 26 Nov 2026 found 5 malicious GGUF models. In the larger campaign a Windows program sat after the last tensor, where loaders never read, and the chat template was later changed so the model asks the user to run the line that unpacks it."
  - q: "What is GGUF chat template poisoning?"
    a: "The chat template is \"a small Jinja2 program\" in the GGUF metadata that formats every conversation, Malspark explains. Poisoning it means the template \"quietly adds instructions the user never sees\", such as telling an agent to run a command."
  - q: "Is it safe to download GGUF models from Hugging Face?"
    a: "Our view: get the model from its original publisher, read the template and scan the file first. gguf-radar's own docs add that \"A clean result is not a guarantee\" and that \"files in a repository can change after you first check them.\""
  - q: "Does Hugging Face scan GGUF files for malware?"
    a: "Its malware scanning page says \"We run every file of your repositories that is smaller than 2 GB through a malware scanner.\" The page does not say it reviews chat templates. Malspark reports that \"Antivirus engines and checks that only look at the last few kilobytes of a file do not see the compressed payload.\""
  - q: "What does gguf-radar do?"
    a: "Its README says it \"checks LLM model files for hidden malware and poisoned chat templates\" and \"never runs the model or its template.\" It scans local files and Hugging Face models, can build a clean copy with the same model weights, and is MIT licensed."
---

To check a GGUF model before you run it, read its chat template, scan the file for extra bytes after the last tensor, get it from the original publisher, and never run a command the model tells you to. Malspark reports five malicious GGUF models on Hugging Face that used these tricks. Checked 28 Nov 2026.

[Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. The [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup.

## What does a GGUF file carry?

A GGUF file carries the model weights, a set of metadata and a chat template. Hugging Face's [GGUF docs](https://huggingface.co/docs/hub/gguf) say "GGUF encodes both the tensors and a standardized set of metadata," and the Hub "has a viewer for GGUF files that lets a user check out metadata & tensors info (name, shape, precision)".

The [Malspark report](https://malspark.com/blog/malicious-gguf-models-hugging-face/), dated 27 Nov 2026, names the two weak spots. The chat template is "a small Jinja2 program stored under the metadata key `tokenizer.chat_template`", and in chat template poisoning "the template quietly adds instructions the user never sees": a hidden line the chat window never shows. And past the end of the last tensor, "Anything after that point is never read," so extra bytes there go unseen and "no runtime warns about it."

<figure class="mg" data-scene="fortunecookie"><img src="/blog/assets/media/check-gguf-model-before-you-run-it/fortunecookie.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a yellow fortune cookie sits on a soft white plate beside a blue teacup. The cookie cracks open and a sky blue paper slip labelled chat template slides out with three lines of text. The first two lines are soft white and get a mint tick each. The third line starts blank, then lights up lilac and reads hidden line. Tapping the cookie closes it and cracks it open again."><figcaption>Malspark reports a poisoned chat template adds instructions the user never sees (27 Nov 2026). Tap the cookie to crack it again.</figcaption></figure>

## What did Malspark find on Hugging Face?

Malspark reports that a scan of every public Hugging Face model repository on 26 Nov 2026 found 5 malicious GGUF models with 2,428 downloads as of 27 Nov, from 2 actors.

| What Malspark reports | Number |
|---|---|
| Public model repositories scanned, 26 Nov 2026 | 3,273,389 |
| GGUF repositories among them | 226,310 |
| Chat templates parsed without running them | 572,184 |
| Malicious GGUF models, all still online on 27 Nov | 5 |
| Downloads at the time of the scan, 26 Nov | 1,502 |
| Downloads as of 27 Nov | 2,428 |

"Hugging Face counts downloads, not people," the report adds, "so the number of affected users is lower or equal."

The larger campaign, in the section titled "Plant First and Arm Later", hid a Windows remote access trojan after the last tensor of two uncensored models with clean templates, then on 26 November rewrote both templates "so the model asks the user to run the line that unpacks it." The account was new; of its 14 repositories, the report says, "Twelve of them are empty placeholders named after expected releases."

The second, under "Hijacking Coding Agents", copied one model three times. A trigger phrase makes its template insert a fake system directive that "orders an agent with shell access to download and run a script," and its README "advises against replacing the embedded template."

On [Hacker News](https://news.ycombinator.com/item?id=50676752) the report had 104 points at 16:19 UTC on 28 Nov.

<figure class="mg" data-scene="baggage"><img src="/blog/assets/media/check-gguf-model-before-you-run-it/baggage.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a blue suitcase labelled model weights stands on a soft white luggage scale, with a sky blue tag on its handle that reads last tensor. The suitcase tips onto its side and a false bottom slides open, and a lilac parcel labelled extra bytes slips out from under the lining. A yellow magnifying glass moves over the parcel and a mint tick appears on the empty suitcase. Tapping the suitcase closes the false bottom and opens it again."><figcaption>Malspark reports a Windows program hidden after the last tensor of two models (27 Nov 2026). Tap the suitcase to open it again.</figcaption></figure>

## How do you check a GGUF model before you run it?

Run these 8 checks. [gguf-radar](https://github.com/Root0ne/gguf-radar), the MIT licensed scanner the report links, had 118 GitHub stars on 28 Nov 2026, and its README says it "never runs the model or its template."

```bash
# read the metadata and template (llama.cpp gguf-py)
pip install gguf
gguf-dump --json --no-tensors model.gguf

# Ollama
ollama show --modelfile llama3.2

# scan a file or a Hugging Face repo (gguf-radar)
pip install git+https://github.com/Root0ne/gguf-radar
gguf-radar scan ./model.gguf
gguf-radar scan Qwen/Qwen2.5-0.5B-Instruct-GGUF

# run with your own template (llama.cpp)
llama-server -m model.gguf --chat-template-file my-template.jinja
```

1. **Original publisher.** gguf-radar's [limitations page](https://github.com/Root0ne/gguf-radar/blob/main/docs/limitations.md) says to "Download models from publishers you trust". Our view: a new account full of placeholder repos is a warning sign.
2. **Read the template.** Use the Hub's viewer, or `gguf-dump` from llama.cpp's [gguf-py](https://github.com/ggml-org/llama.cpp/tree/master/gguf-py), which "Dumps a GGUF file's metadata to the console". Its plain view shortens long strings; the `--json` flag ("Produce JSON output") prints the whole template. For Ollama, the [Modelfile docs](https://github.com/ollama/ollama/blob/main/docs/modelfile.mdx) point to `ollama show --modelfile`.
3. **Commands in the template.** gguf-radar flags "file reads and writes, decompression, process starts, download commands, conditional hidden directives," Malspark says. Our view: a template formats text, so a shell, URL or file path in it is a warning sign, as is a model card that tells you to keep the template.
4. **Extra bytes.** gguf-radar "reports any bytes after that point", the end of the model data, the report says. For Hugging Face models the README says "it downloads only the small parts it needs". Verdicts are `CLEAN`, `SUSPICIOUS`, `MALICIOUS` or `ERROR`.
5. **Antivirus alone.** Hugging Face's [malware scanning page](https://huggingface.co/docs/hub/security-malware) says "We run every file of your repositories that is smaller than 2 GB through a malware scanner." Malspark reports that "Antivirus engines and checks that only look at the last few kilobytes of a file do not see the compressed payload."
6. **Your own template.** llama.cpp's [server docs](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md) say `--chat-template-file` will "set custom jinja chat template file (default: template taken from model's metadata)". In Ollama, `TEMPLATE` is "The full prompt template to be sent to the model." Malspark says that when the model has access to tools, a reviewed template "takes the embedded one out of the loop."
7. **No command from a model.** Malspark's advice: "treat any command a model suggests as untrusted."
8. **Check again.** Keep scanning, the limitations page says, "because files in a repository can change after you first check them."

<figure class="mg" data-scene="smokealarm"><img src="/blog/assets/media/check-gguf-model-before-you-run-it/smokealarm.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a round soft white smoke alarm hangs on a sky blue ceiling panel, with 8 small lights around its edge. One light at a time glows yellow while a blue label below shows its check: Original publisher, Read the template, Commands in the template, Extra bytes, Antivirus alone, Your own template, No command from a model, Check again. The light for Extra bytes turns lilac to show a flagged file. When all 8 are lit, a mint ribbon reads 8 checks. Tapping the alarm runs the lights again."><figcaption>8 checks. Malspark's report (27 Nov 2026) says to treat any command a model suggests as untrusted. Tap the alarm to run the lights again.</figcaption></figure>

## What should you do if you already ran one?

Scan your machine and your GGUF files first. Malspark advises: "Check endpoints against the indicators in Section 7.2 and scan local .gguf files with gguf-radar." It reports the Windows program it took apart sends saved passwords from Chrome, Edge and Brave, and targets the Phantom and MetaMask wallet extensions.

Our view: take the machine off the network, scan it, then from a clean device change your saved browser passwords and rotate your API keys.

## Why do local agents raise the stakes?

A poisoned template can give orders to your agent, as the campaign under "Hijacking Coding Agents" shows. Our view: give a community model shell tools only with permission prompts on. Claude Code's [permissions docs](https://code.claude.com/docs/en/permissions) say the default mode "Prompts before most edits, shell commands, and network requests" and "Permission rules are enforced by Claude Code, not by the model." To wire in a local model, see [how to connect Ollama to Claude Code](/blog/how-to-connect-ollama-to-claude-code/), [is Ollama good for coding](/blog/is-ollama-good-for-coding/) and [llama.cpp 1.0](/blog/llama-cpp-1-0/). For skills and tools, see [how to check an agent skill before you install it](/blog/check-agent-skill-before-install/) and [MCP tool poisoning](/blog/mcp-security-tool-poisoning/).

In Munder Difflin, the [README](https://github.com/HarnessMD/munder-difflin), read 28 Nov 2026, says: "API keys and local models (Ollama, LM Studio, vLLM) go in Settings → Agents & Models." We think the same checks apply there.

<link rel="stylesheet" href="/blog/assets/media/check-gguf-model-before-you-run-it/motion.css"><script defer src="/blog/assets/media/check-gguf-model-before-you-run-it/motion.js"></script>
