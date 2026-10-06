---
title: "OpenAI text watermarking: textGrain, who gets it, limits"
seoTitle: "ChatGPT Watermark: OpenAI Text Watermarking (textGrain)"
description: "OpenAI text watermarking (textGrain) is opt in for the API now and is coming to eligible ChatGPT and Codex text in the EU. Limits checked 6 Oct 2026."
date: 2026-10-06
category: concepts
categoryLabel: Concepts
type: Non-technical
primaryKeyword: "openai text watermarking"
secondaryKeywords: ["chatgpt watermark", "textgrain", "does chatgpt watermark text", "codex watermark", "openai watermark detector", "can you remove chatgpt watermark"]
tags: ["Concepts", "Codex", "OpenAI"]
faq:
  - q: "Does ChatGPT watermark text outside the EU?"
    a: "Not by default. OpenAI's 5 Oct 2026 announcement says the ChatGPT and Codex rollout is for the EU only, and that it is not making text watermarking a global default at launch. Outside the EU, text is marked when an API customer has switched watermarking on for a supported model."
  - q: "Can you remove a ChatGPT watermark?"
    a: "OpenAI does not claim the watermark is permanent. In its test of 400 token passages, replacing 10% of words with synonyms cut detection from about 92% to 66%, and replacing 25% cut it to 17%. OpenAI's help page adds that substantial paraphrasing or translation can make the watermark undetectable. Light edits and copy and paste are what it is designed to survive."
  - q: "Is there a public OpenAI watermark detector for text?"
    a: "No. OpenAI says the text detector is limited to approved researchers and expert organizations, reviewed case by case, because of the risk of missed watermarks and false positives. Its openai.com/verify tool checks images and audio, not text."
  - q: "Does the ChatGPT watermark add hidden characters?"
    a: "No. OpenAI's help page says textGrain does not add hidden characters, invisible spaces or unusual punctuation. The signal is in the pattern of word choices, so copying and pasting adds no hidden material. The watermark is part of the wording, so OpenAI expects it to remain when the wording is kept."
  - q: "Does text watermarking make OpenAI models worse or slower?"
    a: "OpenAI says no. Its published benchmark table for its Astra model shows moves in both directions, which OpenAI says fall within normal run to run noise, for example 72.80% without the watermark and 71.68% with it on DeepSWE v1.1. The help page calls the speed impact negligible. These are OpenAI's own tests, checked 6 Oct 2026."
---

OpenAI text watermarking is textGrain, an invisible signal in the model's word choices. [OpenAI announced it](https://openai.com/index/eu-text-provenance) on 5 Oct 2026: opt in for API customers worldwide, and on for eligible ChatGPT and Codex text output in the EU over the coming weeks. Our view: a compliance signal, not proof of who wrote a text. Checked 6 Oct 2026.

Codex is one of the coding agents people run inside [Munder Difflin](https://harnessmd.com/download), which is free and open source: a desktop app that runs a team of coding agents such as Claude Code, Codex and Gemini CLI on your own computer. So this change reaches some of our readers directly. The [Concepts hub](/blog/topics/concepts/) has more explainers like this one.

## What is OpenAI text watermarking?

It is a way to mark text from OpenAI models so software can spot it later. OpenAI's [announcement](https://openai.com/index/eu-text-provenance) says the EU AI Act requires generative AI providers to make generated text identifiable in a machine-readable way. textGrain is OpenAI's answer for text.

The watermark is not something you can see. OpenAI's [help page](https://help.openai.com/en/articles/8912793-provenance-signals-content-credentials-synthid-in-openai-generated-content) says it does not add hidden characters, invisible spaces or unusual punctuation. It is part of the wording itself.

It is also not an AI detector of the usual kind. The same page says third party tools typically use classifiers that analyze text after it is written, while the EU AI Act requires a signal embedded in the generated text. OpenAI says it plans to release textGrain as open source.

<figure class="mg" data-scene="grain"><img src="/blog/assets/media/openai-text-watermarking/grain.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A paragraph of plain grey word shapes is scanned by a frame that carries a key, and some of the words light up yellow in a pattern. Three labels below say it does not add hidden characters, invisible spaces or unusual punctuation."><figcaption>The signal is in the word choices, not in extra characters. From OpenAI's help page, checked 6 Oct 2026.</figcaption></figure>

## Who gets the watermark, and when?

Eligible ChatGPT and Codex users in the EU get it over the coming weeks, and API customers anywhere can opt in for select models. These scopes come from OpenAI's [announcement](https://openai.com/index/eu-text-provenance). [Unite.AI](https://www.unite.ai/openai-begins-phased-text-watermarking-under-eu-ai-act-rules/) dates it 5 October 2026:

| Where | What happens | When |
| --- | --- | --- |
| ChatGPT and Codex in the EU | Watermark added to eligible text output, across all plans | Over the coming weeks |
| ChatGPT and Codex outside the EU | Not included. OpenAI says the rollout is EU only and not a global default at launch | No date given |
| OpenAI API, worldwide | Opt in, for select models. Off by default | From 5 Oct 2026 |
| Text watermark detector | Applications open for approved researchers and expert organizations | From 5 Oct 2026 |

The EU rules behind this already apply. The European Commission's [Code of Practice page](https://digital-strategy.ec.europa.eu/en/policies/code-practice-ai-generated-content) says the Article 50 transparency obligations apply from 2 August 2026. Signing the code is voluntary. The obligations are not.

<figure class="mg" data-scene="switches"><img src="/blog/assets/media/openai-text-watermarking/switches.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. Three hanging lamps. The OpenAI API lamp has a switch marked opt in, the lamp for ChatGPT and Codex in the EU runs on a timer marked over the coming weeks, and the lamp for ChatGPT and Codex outside the EU has no switch and is marked not included."><figcaption>Who gets the watermark, from OpenAI's announcement. Flip the API switch. Checked 6 Oct 2026.</figcaption></figure>

## How does textGrain work?

It nudges the model's random word choices with a secret key, and a detector with the same key looks for the pattern. A model writes one token at a time, a token being a word or a piece of one. OpenAI's [help page](https://help.openai.com/en/articles/8912793-provenance-signals-content-credentials-synthid-in-openai-generated-content) says the system builds several adjusted sets of likelihoods for the next token, and the key selects which set to use. Averaged together, the sets match the model's original likelihoods.

The [technical report](https://cdn.openai.com/pdf/e9508624-d767-41b6-a26d-e34ca798ada6/textgrain-entropy-calibrated-watermarking-for-language-model-text.pdf), dated 5 October 2026, says the detector needs the generated text and the secret key. Our reading: without that key, a third party site cannot run this check, and OpenAI has not said it shares the key.

## How reliable is the detection?

Stronger on long, loosely worded text, and much weaker on short, exact or edited text. All figures below are OpenAI's own, from the [announcement](https://openai.com/index/eu-text-provenance) and the [help page](https://help.openai.com/en/articles/8912793-provenance-signals-content-credentials-synthid-in-openai-generated-content). The length rows and the language rows are separate tests, both at a 1% false positive rate.

| Test | Detection rate |
| --- | --- |
| 200 token passages, content such as psychology | About 80% |
| 400 token passages, content such as psychology | About 95% |
| Content such as mathematics | "Substantially lower", no figure given in the text |
| 400 token passages, unedited | About 92% |
| Same passages, 10% of words replaced with synonyms | 66% |
| Same passages, 25% of words replaced | 17% |
| Spanish, the highest baseline of the 24 official EU languages | 69.0% |
| Romanian, the lowest baseline, before OpenAI raised the watermark strength | 42.2% |

OpenAI says it raised the watermark strength for languages under 60%, and gives no figures for the result in the text.

So can you remove a ChatGPT watermark? OpenAI's numbers say replacing one word in ten with a synonym already weakens it a lot, and the help page says substantial paraphrasing or translation can make it undetectable. OpenAI [says](https://openai.com/index/eu-text-provenance) these limits are part of why the detector is not public at launch.

<figure class="mg" data-scene="signal"><img src="/blog/assets/media/openai-text-watermarking/signal.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A dial needle swings to about 80% for 200 token passages and about 95% for 400 token passages. In a second test it falls from about 92% unedited to 66% with 10% of words replaced and 17% with 25% replaced."><figcaption>OpenAI's own detection figures. Drag the slider to replace words. Checked 6 Oct 2026.</figcaption></figure>

## What does a watermark not prove?

It does not prove who wrote a text, or that a person did not. OpenAI's [announcement](https://openai.com/index/eu-text-provenance) lists five limits:

* **Not human effort.** It can indicate an OpenAI system generated or processed part of a passage, not how much editing or judgment a person added.
* **Not ownership.** It says nothing about who owns the text or who is responsible for it.
* **Not identity.** It does not link a person, account, prompt or conversation to the text.
* **Not accuracy.** It does not tell you whether the passage is true.
* **No watermark is not proof of a human.** The text may be too short, edited, translated, from an unsupported model, older than the watermark, or from another company's tools.

<figure class="mg" data-scene="stamp"><img src="/blog/assets/media/openai-text-watermarking/stamp.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A stamp marked proof slides along a rail and bounces off five tags without leaving a mark: not human effort, not ownership, not identity, not accuracy, and no watermark is not proof of a human."><figcaption>The five limits OpenAI lists for its text watermark. Checked 6 Oct 2026.</figcaption></figure>

## Does it affect Codex and code?

Eligible Codex text output in the EU is in scope, and OpenAI does not spell out what happens to code. The [announcement](https://openai.com/index/eu-text-provenance) covers "eligible ChatGPT and Codex text output" and does not define eligible. The [help page](https://help.openai.com/en/articles/8912793-provenance-signals-content-credentials-synthid-in-openai-generated-content) says code is harder to watermark, because there are fewer plausible choices for what comes next. It adds that the EU Code of Practice does not require watermarks in code snippets, or in outputs shorter than 200 tokens, about 150 words in English. That page names ChatGPT alone for the EU watermark, so we go by the announcement.

If Codex is new to you, start with [what Codex is](/blog/what-is-codex/) and [how to install the Codex CLI](/blog/how-to-install-codex-cli/).

## How do you turn it on in the API?

You switch it on in the platform settings, for one project or for the whole organization. OpenAI's [help page](https://help.openai.com/en/articles/8912793-provenance-signals-content-credentials-synthid-in-openai-generated-content) gives two places:

1. **Whole organization:** Organization settings, then Data controls, then Text provenance.
2. **One project:** Project Settings, then Text provenance.

Turn on Allow text watermarking, select your models, then select Save. Switching it on does not give you the detector.

## What should you do now?

Very little, unless you build on the API.

* **In the EU, on ChatGPT or Codex:** nothing to set up. The pages we opened describe no user switch for it.
* **Building on the API:** it stays off unless you choose it. OpenAI's [help page](https://help.openai.com/en/articles/8912793-provenance-signals-content-credentials-synthid-in-openai-generated-content) says it cannot advise on your legal obligations, so ask your own legal team.
* **Judging someone's text:** do not treat a missing watermark as proof of anything.
* **Choosing a coding agent:** our view is that this should not decide it. [Codex CLI vs Claude Code](/blog/codex-cli-vs-claude-code/) and our [Codex Max plan tips](/blog/codex-max-plan-tips/) cover what does.

<link rel="stylesheet" href="/blog/assets/media/openai-text-watermarking/motion.css"><script defer src="/blog/assets/media/openai-text-watermarking/motion.js"></script>
