---
title: "How to run a free AI chat offline on your laptop with Jan"
description: "Jan is a free, open source app that runs an AI chat on your own computer. What you need, the steps, how to pick a model, the limits and the fixes."
date: 2026-11-29
category: ai-tools
categoryLabel: "AI tools"
type: Guide
primaryKeyword: "jan ai offline"
secondaryKeywords: ["jan ai", "offline ai chat", "local llm app", "run ai locally", "jan hub models"]
tags: ["Guides", "Getting Started", "Privacy"]
faq:
  - q: "Is Jan free?"
    a: "Yes. Jan's home page says \"Free & Open source\", and the docs call it \"Apache 2.0 licensed\"."
  - q: "Does it work with no internet?"
    a: "Yes, with a local model, once the first download is done. The docs say local models run \"entirely on your machine\"."
  - q: "Do you need an account?"
    a: "No. The docs say you can \"chat with AI in minutes\", with \"no account needed\"."
  - q: "Is a local model as good as the big online ones?"
    a: "No. Jan's page for one of its own small models says its size limits \"complex multi-step reasoning compared to larger models\"."
---

[Jan](https://www.jan.ai/) is a free, open source app that runs an AI chat on your own computer. With a local model, the default, Jan's [quickstart](https://docs.jan.ai/desktop/quickstart) says it runs "private, offline". Install it, let it download its default model once while online, then pick more models by the "Fits" label in the Hub. Checked 28 Nov 2026.

This guide is on the blog of [Munder Difflin](https://harnessmd.com/download), which is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. You do not need it for this guide; its [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup.

Checked on 28 Nov 2026 against Jan's [website](https://www.jan.ai/), [documentation](https://docs.jan.ai/desktop) and [repository](https://github.com/janhq/jan). Names in quotes are theirs. Labels come from the documentation, so check them against your own app.

## What is Jan?

Jan is a [free](https://www.jan.ai/) desktop app that runs an AI chat on your own computer. Its [docs](https://docs.jan.ai/desktop) describe "built-in foundation models" and "an application ecosystem that runs entirely on your hardware". It is [open source](https://github.com/janhq/jan/blob/main/LICENSE) and made by [Menlo Research](https://www.jan.ai/).

## What do you need?

You need a recent computer with enough memory and free disk, plus an internet connection for the first download.

* Windows: Windows 10 or higher, "8GB minimum (16GB recommended)" of memory and "10GB free space minimum" ([Windows page](https://docs.jan.ai/desktop/install/windows)). The processor must support AVX2 (Intel from 2013, AMD from 2015), or be an ARM64 chip.
* Mac: "a Mac with Apple Silicon (M1 or newer)" on macOS 13.6 or higher, with "10GB+ free space" ([Mac page](https://docs.jan.ai/desktop/install/mac)). The page warns: "Intel-based Macs are no longer supported."
* Linux: the same memory and disk figures ([Linux page](https://docs.jan.ai/desktop/install/linux)). Jan's install steps there are terminal commands.

<figure class="mg" data-scene="sandglass"><img src="/blog/assets/media/jan-ai-offline-chat/sandglass.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a sky sandglass sits on a soft white stand. Yellow sand runs from the top bulb into the bottom one. Beside it, three blue tags read 8GB minimum, 16GB recommended and 10GB free space minimum, and each one lights up mint as the sand passes it. Tap the sandglass to flip it and run the sand again."><figcaption>Jan asks for 8GB of memory at minimum, 16GB recommended, and 10GB of free disk on Windows and Linux. Jan's install pages, read 28 Nov 2026.</figcaption></figure>

## How do you set up Jan, step by step?

You download it, install it and let it fetch its default model once.

1. Open [jan.ai](https://www.jan.ai/) and press "Download Jan". Pick your system.
2. On a [Mac](https://docs.jan.ai/desktop/install/mac), open the installer, "Drag Jan to Applications" and launch Jan. On [Windows](https://docs.jan.ai/desktop/install/windows), run the downloaded file, wait for it to complete and launch Jan.
3. At first launch, choose your tracking preference. The [privacy page](https://docs.jan.ai/desktop/privacy) promises "Zero data collection until you say so".
4. Wait. The [docs](https://docs.jan.ai/desktop/quickstart) say "Jan automatically downloads its default foundation model on first launch". Stay online until it completes.
5. Type a question. The quickstart says "Type your message and start chatting."
6. Test it at home, before a trip. Turn the wifi off and ask one more question.

## How do you pick a model that fits?

You read the fit label in the Hub before you download anything.

* Open the "Hub" from the left sidebar ([quickstart](https://docs.jan.ai/desktop/quickstart)).
* Each model carries one of three labels "based on your hardware": "Fits", "May be slow" or "Won't fit" ([Model Management](https://docs.jan.ai/desktop/manage-models)).
* Sizes are grouped as "Small", "Balanced" or "Large". The default download has a "Recommended" tag.
* Click "Download". Then choose the model "from the model selector in any chat".
* A rule from the [troubleshooting page](https://docs.jan.ai/desktop/troubleshooting), read 28 Nov 2026: "Choose models that use less than 80% of your available RAM". With 8GB, "Use models under 6GB". With 16GB, "Use models under 13GB".

<figure class="mg" data-scene="picnicbasket"><img src="/blog/assets/media/jan-ai-offline-chat/picnicbasket.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a yellow picnic basket opens its lid. Three jars rise out one by one: a mint jar labelled Fits, a sky jar labelled May be slow and a lilac jar labelled Won't fit. Each jar wears a soft white tag that reads Small, Balanced or Large, and a blue ribbon that reads Recommended ties itself around the mint jar. Tap the basket to close the lid and lift the jars again."><figcaption>In the Hub, each model shows "Fits", "May be slow" or "Won't fit", based on your hardware. Jan's Model Management page, read 28 Nov 2026.</figcaption></figure>

Our view: start with a model marked "Fits". One marked "May be slow" will test your patience on an older laptop.

## What does it get wrong?

A small local model reasons less well than the large online ones. Jan's [page for its own 4B model](https://docs.jan.ai/desktop/jan-models/jan-v3-4b-base-instruct) lists the limit in plain words: "4B parameters limit complex multi-step reasoning compared to larger models".

* It can be slow. The [troubleshooting page](https://docs.jan.ai/desktop/troubleshooting) has a section named "Models Running Slowly".
* Offline, it has no fresh facts. [Web search](https://docs.jan.ai/desktop/web-search) is how a model "can look up current information", and a search needs a connection.

Our view: use it for drafts, rewording and summaries of your own notes. Check any fact it gives you.

## Is it private?

Yes for local models, by Jan's own account, and no for the two online paths. The [quickstart](https://docs.jan.ai/desktop/quickstart) says local models "run entirely on your machine", "private, offline, no API key", and adds: "This is the default."

<figure class="mg" data-scene="snowglobe"><img src="/blog/assets/media/jan-ai-offline-chat/snowglobe.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a soft white snow globe sits on a blue base that reads private, offline. Inside the glass, a yellow chat bubble glows on a small lilac laptop while mint snow falls. Outside the glass, a sky wifi symbol fades out, and the chat bubble keeps glowing as a new line of text fills in. Tap the globe to shake the snow and bring the wifi symbol back."><figcaption>Jan's quickstart says local models run "private, offline", and local is the default. Jan QuickStart, read 28 Nov 2026.</figcaption></figure>

* Web search is "on by default", and a search goes to a search provider. Switch it off for a chat with the globe icon in the chat box, which shows "Web Search (Active)" while on, or in "Settings > Web Search" ([Web Search page](https://docs.jan.ai/desktop/web-search)).
* Cloud models "need to see your messages to work" ([privacy page](https://docs.jan.ai/desktop/privacy)). They run only after you add a provider and a key under "Settings > Model Providers" ([quickstart](https://docs.jan.ai/desktop/quickstart)).
* Your chats are stored on your disk. The [install pages](https://docs.jan.ai/desktop/install/mac) say "Jan stores all your data locally" and "Nothing is sent to the cloud".
* Usage counts, if you allow them, are "tied to a random ID". The [privacy page](https://docs.jan.ai/desktop/privacy) lists "No prompt logging".

Our view: for private notes, use a local model, switch web search off and add no provider key.

Also on this blog, about privacy: [How to ask AI a private question with Duck.ai, free, no account](/blog/duck-ai-private-chat/).

## What if it does not work?

Start with the model size, because "Out of memory" comes first in the [troubleshooting page](https://docs.jan.ai/desktop/troubleshooting) list of "The most common causes" when a model will not load.

* The model fails to load, or stops with an out of memory error. The fix in the docs: "Use a smaller or more quantized model".
* Answers crawl. The docs say "Close other memory-intensive applications". With a graphics card, open "Settings > Hardware > GPUs" and turn its switch on ([Windows page](https://docs.jan.ai/desktop/install/windows)).
* A banner says the model ran out of context size. Click "Increase Context Size".
* The disk is full. Open "Settings > Model Providers > Llama.cpp" and click the trash icon next to a model you no longer use ([engine page](https://docs.jan.ai/desktop/local-engine/llama-cpp)).
* You have an Intel Mac. Since version 0.8.5, local models "do not run on them at all" ([Mac page](https://docs.jan.ai/desktop/install/mac)).

Also on this blog: [How to remove a photo background free with BgSub, in your browser](/blog/bgsub-remove-background/). More guides like these are on the [AI tools](/blog/topics/ai-tools/) page.

## Sources

Checked on 28 Nov 2026:

* [Jan home page](https://www.jan.ai/) and [download page](https://www.jan.ai/download)
* Jan Docs: [Overview](https://docs.jan.ai/desktop), [QuickStart](https://docs.jan.ai/desktop/quickstart), [Privacy](https://docs.jan.ai/desktop/privacy), [Model Management](https://docs.jan.ai/desktop/manage-models), [Web Search](https://docs.jan.ai/desktop/web-search), [Troubleshooting](https://docs.jan.ai/desktop/troubleshooting), [Local AI Engine (llama.cpp)](https://docs.jan.ai/desktop/local-engine/llama-cpp)
* Jan Docs installation pages: [Mac](https://docs.jan.ai/desktop/install/mac), [Windows](https://docs.jan.ai/desktop/install/windows), [Linux](https://docs.jan.ai/desktop/install/linux)
* Jan Docs model page: [Jan v3 4B](https://docs.jan.ai/desktop/jan-models/jan-v3-4b-base-instruct)
* [janhq/jan](https://github.com/janhq/jan), the README of Jan's repository, and its [LICENSE](https://github.com/janhq/jan/blob/main/LICENSE) file

This guide is independent. It is not made, checked or paid for by Menlo Research.

<link rel="stylesheet" href="/blog/assets/media/jan-ai-offline-chat/motion.css"><script defer src="/blog/assets/media/jan-ai-offline-chat/motion.js"></script>
