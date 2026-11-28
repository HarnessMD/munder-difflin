---
title: "ASD-STE100 Prompting: Karpathy's 4 Tricks for Clearer AI Answers"
seoTitle: "ASD-STE100 Prompting: Karpathy's 4 Tricks for Clearer AI Answers"
description: "Ask your AI to answer in ASD-STE100, the aerospace manual standard, about 80% of the way. Plus Karpathy's three other tricks: diagrams, HTML and video."
date: 2026-10-05
category: guides
categoryLabel: Guides
type: Non-technical
primaryKeyword: "asd-ste100 prompting"
secondaryKeywords: ["asd-ste100 prompt", "karpathy prompting tricks", "simplified technical english llm", "80% asd-ste100", "karpathy asd-ste100", "ask llm for html output"]
tags: ["Guides", "Claude Code", "AI Agents"]
faq:
  - q: "What is ASD-STE100?"
    a: "ASD-STE100 is Simplified Technical English, a controlled language first written for aircraft maintenance manuals. It has about 900 approved words and 53 writing rules, such as short sentences and the active voice. The ASD, the European aerospace and defence industry group, maintains it, and it has been free of charge since 2013."
  - q: "What prompt do I use for ASD-STE100?"
    a: "Add one line to your request: explain this in ASD-STE100, about 80% of the way. Andrej Karpathy suggested the 80% version on 2 Oct 2026 because the full specification is quite strict."
  - q: "Why 80% and not full ASD-STE100?"
    a: "Karpathy's reason is that the specification is quite stringent. It was built for repair instructions and limits general words to an approved dictionary, so in our view a full strength answer can sound robotic. Asking for 80% keeps the short sentences and plain words and lets the answer keep a natural tone."
  - q: "Does ASD-STE100 prompting work with ChatGPT, Claude and Gemini?"
    a: "It is a plain instruction, so you can type it into any chat model. Karpathy's post says language models are well versed in the standard. We tested it with Claude Opus 5.5 on 5 Oct 2026; results in other models will differ."
  - q: "What are Karpathy's four prompting tricks?"
    a: "In his 2 Oct 2026 post: ask for writing in ASD-STE100, ask for a diagram instead of text, ask for the output in HTML to get an interactive page, and ask for a custom explainer video. He ranks them in that order, each one better than the last."
---

Add "explain this in ASD-STE100, about 80% of the way" to a prompt and the answer comes back in short, plain sentences. Verdict: it is a cheap prompting upgrade, and it is only the first of four. Checked 5 Oct 2026.

<figure class="mg" data-scene="ladder"><img src="/blog/assets/media/asd-ste100-prompting/ladder.png" width="1360" height="765" loading="lazy" decoding="async" alt="Animation. Five grey lines of messy text shrink into five short clean lines, turn into the boxes of a diagram, then into a web page with a bar chart and a slider, then into a video player."><figcaption>The four tricks in order: clean writing, a diagram, a web page, a video.</figcaption></figure>

The trick comes from [a post by Andrej Karpathy](https://x.com/karpathy/status/2105819303471976479) on 2 Oct 2026. Karpathy helped start OpenAI and [joined Anthropic's pretraining team](https://www.searchenginejournal.com/karpathy-llm-aircraft-manual-writing/591813/) in May 2026. His post had more than 6.7 million views when we checked.

If your AI work is code, [Munder Difflin](https://harnessmd.com/download) is free and open source: a desktop app that runs a team of coding agents such as Claude Code, Codex and Gemini CLI on your own computer. The [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup. More how to posts sit in our [Guides hub](/blog/topics/guides/).

## What is ASD-STE100?

ASD-STE100 is [Simplified Technical English](https://en.wikipedia.org/wiki/Simplified_Technical_English), a rule book for writing aircraft maintenance manuals so that a mechanic anywhere reads each step the same way. AECMA, the European aerospace industry association, released the first version in 1985. Issue 9 came out in January 2025, and the standard has been free of charge since 2013.

The rules are strict:

* **About 900 approved words.** Most have one meaning. "Close" is a verb only; in place of the adjective you write "near".
* **53 writing rules.**
* **Short sentences.** No more than 20 words in an instruction and 25 in a description.
* **Short paragraphs.** Six sentences at most.
* **Active voice.** "Remove the cover", not "the cover should be removed".

Karpathy says language models are well versed in this standard. So naming it is a shortcut: one line stands in for a page of style instructions.

## Why ask for 80% and not all of it?

Because the full standard is very strict. Karpathy wrote that he sometimes softens the request to "80% of the way to ASD-STE100" because the specification is quite stringent. Our view: it was built for repair steps, and an answer held to its dictionary can sound robotic and lose some natural tone.

The prompt:

```
Explain how a vector database works.
Follow ASD-STE100 about 80% of the way.
```

You keep the short sentences and the plain words, and the answer still reads like a person wrote it.

## What does an ASD-STE100 answer look like?

Shorter, with one idea per sentence. We gave Claude Opus 5.5 a typical chatbot paragraph on 5 Oct 2026 and asked for the same content at 80%.

| | Text | Words |
| --- | --- | --- |
| Before | "Please be aware that prompt caching can be leveraged to significantly reduce costs, as it essentially allows previously processed portions of a prompt to be reused across subsequent requests rather than being reprocessed each time." | 35 |
| After, 80% ASD-STE100 | "Prompt caching lowers cost. The model saves the processed parts of your prompt. Later requests use the saved parts again. The model does not process them a second time." | 29 |

<figure class="mg" data-scene="filter"><img src="/blog/assets/media/asd-ste100-prompting/filter.png" width="1360" height="765" loading="lazy" decoding="async" alt="Animation. A 35 word sentence has its filler words marked and struck out. It is replaced by four short numbered sentences, and a counter drops from 35 words to 29."><figcaption>Same meaning, 35 words down to 29, one sentence split into four.</figcaption></figure>

The meaning is the same. The second version has four sentences, no filler and nothing you have to read twice. That subject has its own post: [prompt caching for AI agents](/blog/prompt-caching-for-ai-agents/).

## Trick 2: ask for a diagram

Even clean writing still has to be read. Karpathy's second tip is to skip the writing: ask your model to create a diagram, which can be much easier to process and understand.

```
Do not explain this in text.
Draw a diagram of how a request moves through our login flow.
```

<figure class="mg" data-scene="diagram"><img src="/blog/assets/media/asd-ste100-prompting/diagram.png" width="1360" height="765" loading="lazy" decoding="async" alt="Animation. Nine lines of text fade out and a flow diagram draws itself: Browser, Login API, Auth check, then Session if the password is ok or Try again if it is wrong. A yellow marker travels along the arrows."><figcaption>A login flow as a diagram. You follow the marker; you do not read a paragraph.</figcaption></figure>

Use it for anything with a shape: a flow, a hierarchy, a timeline, a before and after.

## Trick 3: ask for the output in HTML

Add "in HTML" and you get a web page you can click, not a block of text. Karpathy says language models are getting really good at front end work and can create interactive pages with animations.

A prompt to try:

```
Build a SIP calculator in HTML that shows compounding
year by year, with sliders for the monthly amount,
the return and the number of years.
```

A SIP is a systematic investment plan, a fixed sum invested every month. We asked Claude Opus 5.5 for one. This is it, working inside this page:

<figure class="mg" data-scene="sip"><img src="/blog/assets/media/asd-ste100-prompting/sip.png" width="1360" height="788" loading="lazy" decoding="async" alt="A SIP calculator with three sliders, for monthly amount, yearly return and years, and a bar chart that splits each year into the amount invested and the growth."><figcaption>Live: drag a slider. Claude Opus 5.5 wrote this calculator for the post on 5 Oct 2026.</figcaption></figure>

Text gives you one answer for one set of numbers. A page with sliders lets you move the numbers yourself.

## Trick 4: ask for an explainer video

This is the format Karpathy is most bullish on: a fully custom explainer video on any topic. His example prompt:

```
Create a 3b1b style video explainer on X.
Use my ElevenLabs API key for audio narration.
```

<figure class="mg" data-scene="video"><img src="/blog/assets/media/asd-ste100-prompting/video.png" width="1360" height="765" loading="lazy" decoding="async" alt="Animation in the style of a maths explainer. A point moves around a circle and its height draws a sine wave, with a caption line and a narration track underneath."><figcaption>What a short explainer can look like: a moving picture, a caption and a voice track.</figcaption></figure>

"3b1b" is 3Blue1Brown, the YouTube channel known for animated maths lessons. ElevenLabs makes the voice, and you need your own API key for it. Karpathy adds that you can ask the model to find a decent free alternative that runs on your own computer. He says this is "actually starting to work". We read that as: expect rough results. Never paste an API key into a chat you share with others.

## The four tricks side by side

| Trick | What to add to your prompt | Best for |
| --- | --- | --- |
| 1. Clean writing | "Follow ASD-STE100 about 80% of the way" | Explanations you will read once and act on |
| 2. Diagram | "Create a diagram, not text" | Flows, structures, comparisons |
| 3. Web page | "Give me the output in HTML" | Calculators, dashboards, anything with numbers to move |
| 4. Video | "Create a 3b1b style video explainer on X" | A topic you want to learn properly |

Karpathy ranks them in this order. After each of the first three his post says "But even better".

## Why do these tricks matter now?

Because reading the output is becoming the job. Karpathy's summary has two parts:

1. As models improve they will do more of the legwork on their own, and our work will move up into oversight and understanding.
2. Intelligence and code are becoming abundant. So you can ask for large, custom, throwaway pieces of software, such as a web app or a video, that would never have made sense to build before.

His advice is to push the boundaries and be surprised.

The same holds when agents write code for you: the limit is how fast you can check their work. [Plan mode in Claude Code](/blog/how-to-use-claude-code-plan-mode/) helps before the work starts, and [context engineering](/blog/context-engineering-for-ai-agents/) decides what the agent reads. These four tricks help at the other end, when the answer comes back.

Start with the 80% line today. It costs seven words.

<link rel="stylesheet" href="/blog/assets/media/asd-ste100-prompting/motion.css"><script defer src="/blog/assets/media/asd-ste100-prompting/motion.js"></script>
