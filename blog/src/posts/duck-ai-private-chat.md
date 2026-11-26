---
title: "How to ask AI a private question with Duck.ai, free, no account"
description: "Duck.ai is DuckDuckGo's free AI chat with no account. What it hides, where chats are saved, how to delete them, the limits and the fixes."
date: 2026-11-27
category: ai-tools
categoryLabel: "AI tools"
type: Guide
primaryKeyword: "duck.ai"
secondaryKeywords: ["duck ai", "duckduckgo ai chat", "private ai chat", "ai chat no account", "is duck.ai free"]
tags: ["Guides", "Getting Started", "Privacy"]
faq:
  - q: "Is Duck.ai free?"
    a: "Yes, with no account. DuckDuckGo's usage limits page says: \"Duck.ai is free to use, but there is a daily limit on usage.\" Checked 26 Nov 2026."
  - q: "Where are your chats saved?"
    a: "By default, \"locally on your device\", not on DuckDuckGo's servers."
  - q: "Can the AI company see who you are?"
    a: "Your IP address is removed first, but whatever you type is still sent."
  - q: "What costs money?"
    a: "The \"additional, advanced AI models\" and higher limits need a DuckDuckGo subscription."
---

[Duck.ai](https://duck.ai/) is DuckDuckGo's [free](https://duckduckgo.com/duckduckgo-help-pages/duckai/usage-limits) AI chat, with [no account](https://duckduckgo.com/duckduckgo-help-pages/duckai/approach-to-ai). It [removes your IP address](https://duckduckgo.com/duckduckgo-help-pages/duckai/ai-chat-privacy) before your question goes to another company's model and [saves chats on your device](https://duckduckgo.com/duckduckgo-help-pages/duckai/recent-chats) by default. Free use has a daily limit, and what you type is still sent, so leave out personal details. Checked 26 Nov 2026.

This guide is on the blog of [Munder Difflin](https://harnessmd.com/download), which is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. You do not need it for this guide; its [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup.

Checked on 26 Nov 2026 against DuckDuckGo's [help pages](https://duckduckgo.com/duckduckgo-help-pages/duckai) and the [Duck.ai Privacy Policy and Terms of Service](https://duckduckgo.com/duckai/privacy-terms). Names in quotes are the ones those pages use.

## What is Duck.ai?

Duck.ai is a free AI chat from DuckDuckGo that passes your question to another company's model after taking your IP address off it. The [help page](https://duckduckgo.com/duckduckgo-help-pages/duckai) calls it "private conversations with 3rd-party AI chat models, anonymized by us". You pick the model, and some are free. DuckDuckGo subscribers "also get access to the additional, advanced AI models" ([models page](https://duckduckgo.com/duckduckgo-help-pages/duckai/chat-models)) and higher usage limits ([usage limits page](https://duckduckgo.com/duckduckgo-help-pages/duckai/usage-limits)).

## What do you need?

You need a web browser and nothing else: DuckDuckGo says "no account required" ([approach to AI page](https://duckduckgo.com/duckduckgo-help-pages/duckai/approach-to-ai)). Two limits apply.

* Age: "Duck.ai is only intended for people who are age 18 or older." Under 18s "may use Duck.ai with your parent or legal guardian's supervision" ([terms](https://duckduckgo.com/duckai/privacy-terms)).
* Place: the help pages list [twelve countries and regions](https://duckduckgo.com/duckduckgo-help-pages/duckai/duckai-unsupported-regions) where Duck.ai is not supported.

## How do you ask a question, step by step?

You open the site, pick a free model, and type your question without personal details.

1. Go to [duck.ai](https://duck.ai/) in your browser.
2. Click the current chat model name in the chat input area to change model. The free ones today come from Anthropic, Mistral AI and OpenAI, plus two models hosted by Tinfoil ([models page](https://duckduckgo.com/duckduckgo-help-pages/duckai/chat-models)).
3. Type your question. Leave out names, addresses and account numbers (the next section says why).
4. Start a new chat when the subject changes. The [usage limits page](https://duckduckgo.com/duckduckgo-help-pages/duckai/usage-limits) says: "Long conversations can cost more, so begin a new chat whenever you change subjects."

## What does "anonymized" mean here?

It means the details that travel with your message are removed, not the message itself. In DuckDuckGo's words ([privacy help](https://duckduckgo.com/duckduckgo-help-pages/duckai/ai-chat-privacy)): "Metadata that contains personal information (for example, your IP address) is completely removed before prompting the model provider." The request then looks "as though" it came "from DuckDuckGo rather than individual users".

What you type still goes to the model. The [policy](https://duckduckgo.com/duckai/privacy-terms) says: "If you submit personal information in your Prompts, it may be reproduced in the Outputs".

<figure class="mg" data-scene="envelope"><img src="/blog/assets/media/duck-ai-private-chat/envelope.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a soft white envelope carries a lilac return address label that reads IP address. A yellow eraser wipes the label clean and a sky stamp that reads DuckDuckGo appears in its place, while a mint card that reads your question stays in plain view inside the open envelope. The envelope slides through a blue mail slot labelled model provider. Tap the envelope to put the label back and play it again."><figcaption>Your IP address is removed; what you type is still sent. DuckDuckGo privacy help, read 26 Nov 2026.</figcaption></figure>

## Which models can the host not read?

The two models hosted by Tinfoil, gpt-oss-120b and Gemma 4 31B, today. They run "in a Trusted Execution Environment such that Tinfoil cannot see your prompts or the model's response" ([privacy help](https://duckduckgo.com/duckduckgo-help-pages/duckai/ai-chat-privacy)). Duck.ai labels them "zero provider visibility".

<figure class="mg" data-scene="lockbox"><img src="/blog/assets/media/duck-ai-private-chat/lockbox.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a sky card that reads your question drops into a blue lockbox and the yellow lid closes over it. A mint tag on the front of the box reads zero provider visibility, and a soft white reply card slides out of a lilac slot on the side while the lid stays shut. Tap the lockbox to drop in another card and play it again."><figcaption>Tinfoil cannot see your prompts or the replies on these two models. DuckDuckGo privacy help, read 26 Nov 2026.</figcaption></figure>

Our view: use one of those two for your most sensitive question.

## Where are your chats saved, and how do you delete them?

They are saved on your own device [by default](https://duckduckgo.com/duckduckgo-help-pages/duckai/recent-chats), and the Fire Button inside Duck.ai deletes them.

* To delete everything: "Tap the Fire Button icon at the top of the chats list and choose "Delete Chats"."
* To delete one chat: tap the Fire Button icon beside it.
* Pinned chats stay. They "won't be deleted when you use the Fire Button in Duck.ai", so unpin them first.
* To stop saving chats: "You can disable chat history at any time in Duck.ai settings."
* Your browser matters. Some keep chats "for extended periods or indefinitely, unless you explicitly clear your browser data". Safari deletes them "if you go more than 7 days without visiting duck.ai".

<figure class="mg" data-scene="shredder"><img src="/blog/assets/media/duck-ai-private-chat/shredder.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a lilac list holds a stack of soft white chat cards, and one card carries a sky pin and a tag that reads Pinned. A yellow button that reads Delete Chats lights up, and a blue shredder pulls in every card without a pin and turns them into mint confetti, while the pinned card stays in place. Tap the button to bring the cards back and shred them again."><figcaption>The Fire Button deletes your chats, but pinned chats stay. DuckDuckGo chat history help, read 26 Nov 2026.</figcaption></figure>

"Sync & Backup" is optional. It stores chats on a DuckDuckGo server, encrypted so that "only you can decrypt this information".

## What does it get wrong?

It can give a wrong answer that looks complete. The [terms](https://duckduckgo.com/duckai/privacy-terms) say: "Outputs may be inaccurate, incomplete, or otherwise unreliable." They add that you should not rely on an answer "without verifying its contents using other sources, especially for professional advice (like medical, financial, or legal advice)".

## Is it private?

Yes, in the ways DuckDuckGo's pages list, with exceptions those pages also list.

* The model companies "agree to" delete your prompts and responses and never train on them ([privacy help](https://duckduckgo.com/duckduckgo-help-pages/duckai/ai-chat-privacy)). DuckDuckGo allows "limited, clearly defined exceptions".
* One listed exception: with OpenAI and Anthropic models, chats "may be held in short-term memory for up to 1 hour". Another, for Anthropic: chats "may be retained where required by law or as necessary to combat malicious use".
* The [policy's](https://duckduckgo.com/duckai/privacy-terms) own wording is looser than the help page: the model companies agree to delete information "at most within 30 days, with limited exceptions for safety and legal compliance".
* Files and images you upload are "anonymously checked by a third-party content moderation provider, and in some cases, the model provider".
* DuckDuckGo samples messages to sort them into broad topics, then says: "We don't store the message itself or any identifiers".

Our view: these are promises from a company and its suppliers. Treat them as lower risk, not zero risk.

## What if it does not work?

Start with your network, then your model.

* You hit the limit on your first message. This can happen "when using a VPN or cellular network" ([usage limits page](https://duckduckgo.com/duckduckgo-help-pages/duckai/usage-limits)). Try another VPN location or switch to WiFi.
* You run out during the day. "Lower cost models use your limits more efficiently than higher cost models", and the same page says to use "Fast" mode by default.
* Something else is broken. Use the "Share Feedback" button at the bottom of the chat page. A chat you send as feedback is stored and reviewed by DuckDuckGo ([privacy help](https://duckduckgo.com/duckduckgo-help-pages/duckai/ai-chat-privacy)).

Also on this blog: [Buzz: free, offline Whisper transcription for a long recording](/blog/buzz-whisper-transcription/) and [Goblin Tools Magic ToDo: break a scary chore into small steps](/blog/goblin-tools-magic-todo/). More guides like these are on the [AI tools](/blog/topics/ai-tools/) page.

## Sources

Checked on 26 Nov 2026:

* [Duck.ai](https://duckduckgo.com/duckduckgo-help-pages/duckai), DuckDuckGo Help Pages
* [How does Duck.ai protect my privacy?](https://duckduckgo.com/duckduckgo-help-pages/duckai/ai-chat-privacy)
* [Is my Duck.ai chat history private?](https://duckduckgo.com/duckduckgo-help-pages/duckai/recent-chats)
* [Does Duck.ai have usage limits?](https://duckduckgo.com/duckduckgo-help-pages/duckai/usage-limits)
* [What AI chat models are available?](https://duckduckgo.com/duckduckgo-help-pages/duckai/chat-models)
* [What is DuckDuckGo's approach to AI?](https://duckduckgo.com/duckduckgo-help-pages/duckai/approach-to-ai)
* [Duck.ai Privacy Policy and Terms of Service](https://duckduckgo.com/duckai/privacy-terms), last updated 16 Nov 2026
* [Duck.ai Unsupported Regions](https://duckduckgo.com/duckduckgo-help-pages/duckai/duckai-unsupported-regions)
* [Duck.ai](https://duck.ai/) itself

This guide is independent. It is not made, checked or paid for by DuckDuckGo.

<link rel="stylesheet" href="/blog/assets/media/duck-ai-private-chat/motion.css"><script defer src="/blog/assets/media/duck-ai-private-chat/motion.js"></script>
