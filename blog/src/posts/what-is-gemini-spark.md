---
title: "Gemini Spark: what it is, what it costs and who can get it"
description: "Gemini Spark is Google's personal AI agent in the Gemini app. Plans, US prices, countries, limits and how it compares with Grok Bot, checked 3 Oct 2026."
date: 2026-10-03
category: concepts
categoryLabel: Concepts
type: Non-technical
primaryKeyword: "gemini spark"
secondaryKeywords: ["what is gemini spark", "gemini spark pricing", "how to use gemini spark", "gemini spark vs grok bot", "gemini spark availability", "is gemini spark free"]
tags: ["Concepts", "AI Agents", "Pricing"]
faq:
  - q: "Is Gemini Spark free?"
    a: "No. Google's help page says you need a Google AI Pro or Ultra subscription, so the Free and Google AI Plus plans do not include it. In the US, Google AI Pro was listed at $19.99 a month when we checked on 3 Oct 2026. Spark is not sold on its own."
  - q: "Is Gemini Spark available in the UK or Europe?"
    a: "No. Google's help page says Spark is available wherever Gemini Apps are supported, except in the European Economic Area, Nigeria, Switzerland and the United Kingdom. That was still the wording on 3 Oct 2026."
  - q: "Does Gemini Spark work when my laptop is off?"
    a: "Yes, with one catch. Spark runs in Google's cloud, so tasks and schedules keep going with your devices off. A task that uses your own Chrome needs the device and Chrome awake; if the device goes off, Spark might finish it in a remote browser. One line on Google's help page also says schedules will not run if your device is off, so test any schedule you rely on."
  - q: "Can I use Gemini Spark with a work Google account?"
    a: "Not through the Gemini app. The help page says you must sign in with a personal Google Account, and that Spark is not available for now with a work or school account. Google's product page separately mentions select business users."
  - q: "How many tasks can Gemini Spark run at once?"
    a: "Up to 15. Google's help page says you can have up to 15 tasks running at a given time, and you wait for one to finish before adding another. Your plan's compute based usage limits apply on top of that."
---

Gemini Spark is Google's personal AI agent inside the Gemini app: you hand it a task or a schedule and it works through your Gmail, Calendar, Drive and the web in Google's cloud, with your laptop shut. Verdict: worth it if your day already runs on Google apps and you live outside Europe. Checked 3 Oct 2026.

Our [Concepts hub](/blog/topics/concepts/) explains the ideas behind agents like this, and [Grok Bot alternatives](/blog/grok-bot-alternatives/) lines Spark up against the rest.

## What is Gemini Spark?

Gemini Spark is an agent, not a chat mode. Google's [help page](https://support.google.com/gemini/answer/17094507) calls it a personal AI agent that automates workflows and manages schedules for ongoing tasks in Gemini Apps. Google [announced it on 19 May 2026](https://blog.google/innovation-and-ai/products/gemini-app/next-evolution-gemini-app/) at I/O, and said then that it runs on Gemini 3.5 and the Antigravity harness.

It has three building blocks:

* **Tasks.** One objective that Spark works on in its own thread, such as tracking internship listings.
* **Schedules.** A task that runs at a set time or when something happens.
* **Skills.** Reusable instructions with extra context, such as how you write emails.

Because it [runs in the cloud](https://support.google.com/gemini/answer/17094710), it keeps going after you close the laptop or lock the phone.

{% img "note-1" %}

## How much does Gemini Spark cost?

Spark has no price of its own. It comes with Google AI Pro and Google AI Ultra, and the cheaper plans do not include it. These are the US prices on Google's [plans page](https://gemini.google/us/subscriptions/?hl=en), checked 3 Oct 2026:

| Plan | US price (checked 3 Oct 2026) | Gemini Spark | Usage limits |
| --- | --- | --- | --- |
| Free | $0 | No | Base |
| Google AI Plus | $4.99 a month | No | 2x Free |
| Google AI Pro | $19.99 a month | Yes | 4x Free |
| Google AI Ultra | $99.99 a month | Yes | 5x Pro |
| Google AI Ultra | $199.99 a month | Yes | 20x Pro |

Prices differ by country, so open the plans page from where you live. That page only names Spark on the Ultra card, with the words "in select countries". The Pro entitlement comes from the help page, which asks for a Google AI Pro or Ultra subscription.

The dearer plans mainly buy more room. Google's [limits page](https://support.google.com/gemini/answer/16275805) says Gemini Apps use compute based limits, and the plans page says those limits count the complexity of your prompt, the features you use and the length of the chat. Google does not publish a separate Spark quota.

## Who can get Gemini Spark?

You need to be 18 or over, on a personal Google Account, with Google AI Pro or Ultra and Keep Activity switched on. The help page says work and school accounts are out for now. Google's [product page](https://gemini.google/us/overview/agent/spark/) separately mentions select business users.

On countries, the help page says Spark is available wherever Gemini Apps are supported, except in the European Economic Area, Nigeria, Switzerland and the United Kingdom. It runs in the Gemini mobile app, the Gemini app on Mac and on the web at gemini.google.com.

The dates below come from Google's [Spark changelog](https://support.google.com/gemini/answer/17171264?hl=en) and its [30 July post](https://blog.google/innovation-and-ai/products/gemini-app/gemini-spark-updates-july-2026/):

| Date (2026) | What changed |
| --- | --- |
| 19 May | First rollout in the United States, with Schedules and Skills |
| 17 June | Rollout beyond the US, with ten regions still excluded, including Canada, Australia, India and Japan |
| 30 June | Spark arrives in the Gemini app for Mac |
| 14 July | All Gemini Apps languages for Ultra subscribers, minus the four excluded regions |
| 16 July | Google AI Pro subscribers in the US, in English |
| 30 July | Google AI Pro subscribers in over 160 more countries |

## What can Gemini Spark do?

It can read and act across Google's own apps, a short list of outside apps, and the open web. The help page lists Calendar, Gmail, Docs, Sheets, Slides, Drive, Keep and Tasks, plus Search, Maps, Finance, Flights, Hotels, YouTube, Google Photos, Gemini Notebook and Contacts.

Outside Google, the changelog shows Canva, Instacart and OpenTable support starting on 1 July, then Dropbox and Zillow on 7 July. Since 29 June you can also connect your own app by pasting in its Model Context Protocol server URL. See [what an MCP server is](/blog/what-is-an-mcp-server/).

For websites, Spark has two browsers. The remote one lives in Google's cloud and keeps working with your device off. The local one is your own Chrome, where Spark can reach every site you are signed into. Google's 30 July post says the Chrome feature is rolling out in the US first.

## What can Gemini Spark not do?

It is designed to check with you before the risky steps. Google says Spark asks for confirmation before sending messages, changing your data, making purchases, submitting web forms or using Sign in with Google. When it browses in your own Chrome, it also asks for confirmation on every task that involves web browsing. One exception on the same page: it can make bulk changes to your private Google Tasks without asking.

Other limits from the help page:

* **15 tasks at a time.** You wait for one to finish before starting another.
* **Local Chrome needs a live device.** Close the laptop and Spark might switch to the remote browser.
* **No secrets in the thread.** Google tells you not to type sign in details or payment details into a task.
* **Prompt injection is a real risk.** The page warns that hidden instructions in a web page or file could make Gemini share private data, and says your active supervision is the most important protection.

## How do you use Gemini Spark?

On the web, open gemini.google.com, click Switch to Spark in the sidebar, describe the task in the text box and click Submit.

1. Type "set up", "get started" or "interview me" as your first task. Since 17 July, Spark walks you through building your first skills and tasks.
2. Give a task a time or a trigger and it becomes a schedule. You can pause and resume schedules.

Turning Spark off stops schedules and deletes the remote browser and remote code data. Your tasks, threads and schedules stay, and they resume when you turn it back on.

{% img "note-2" %}

## Gemini Spark vs Grok Bot: which is better?

Spark is better if your work lives in Google apps, and Grok Bot is better if you want several agents with a computer of their own. Spark is one personal agent tied to your Google account. Grok Bot gives you several Bots on a persistent cloud computer and comes bundled with SuperGrok and paid Cursor plans, as our [Grok Bot pricing](/blog/grok-bot-pricing/) breakdown shows.

* **Pick Gemini Spark** for inbox, calendar and document chores, if you are 18 or over and outside the excluded regions.
* **Pick [Munder Difflin](https://harnessmd.com/download)** if the work is code. It is free and open source: a desktop app that runs a team of coding agents such as Claude Code, Codex and Gemini CLI on your own computer. The [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup.
* **Pick Grok Bot** for always on work agents that sign into your apps from the cloud.

If Europe rules Spark out for you, [ChatGPT dots alternatives](/blog/chatgpt-dots-alternatives/) lists the options that still work there.
