---
title: "How to translate a web page on your own computer with Firefox"
description: "Firefox, a free browser, translates foreign web pages on your device. The steps, the offline setting, the limits and the fixes when a page will not translate."
date: 2026-11-27
category: ai-tools
categoryLabel: "AI tools"
type: Guide
primaryKeyword: "firefox translate page"
secondaryKeywords: ["firefox translation", "firefox translate offline", "firefox translate not working", "translate web page", "private translation"]
tags: ["Guides", "Getting Started", "Privacy"]
faq:
  - q: "Is it free?"
    a: "Yes. Firefox's own FAQ says \"The Firefox Browser is free\" and \"No hidden costs or anything\". Translation is part of the browser."
  - q: "Is the page sent to a server to be translated?"
    a: "No, by Mozilla's account: \"translation is done locally in Firefox, so that the text being translated does not leave your machine\"."
  - q: "How many languages does it have?"
    a: "Firefox's list on firefox.com names 52 as of 27 Nov 2026, English included, and says more are in development."
  - q: "Does it work offline?"
    a: "Yes, once you download the language in Settings while you are still online."
---

[Firefox](https://www.firefox.com/en-US/more/faq/), a free browser, has a translator built in that turns a foreign web page into your language [on your own computer](https://www.firefox.com/en-US/firefox/118.0/releasenotes/). Click the translate button in the address bar and press "Translate". Download a language in Settings first and it works offline. [Firefox's list](https://www.firefox.com/en-US/features/translate/) names 52 languages today. Checked 27 Nov 2026.

This guide is on the blog of [Munder Difflin](https://harnessmd.com/download), which is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. You do not need it for this guide; its [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup.

Checked on 27 Nov 2026 against Firefox's [website](https://www.firefox.com/en-US/features/translate/), [release notes](https://www.firefox.com/en-US/firefox/118.0/releasenotes/) and [source documentation](https://firefox-source-docs.mozilla.org/toolkit/components/translations/index.html), and the [interface text](https://raw.githubusercontent.com/mozilla-firefox/firefox/main/browser/locales/en-US/browser/translations.ftl) in Mozilla's repository. Names in quotes are theirs. Mozilla's help site did not open that day, so check the labels against your own Firefox.

## What is Firefox translation?

It is a translator built into the Firefox browser that turns a foreign web page into your language on your own device. Mozilla describes it as "machine learning models that are downloaded and run locally on the user's device" ([source documentation](https://firefox-source-docs.mozilla.org/toolkit/components/translations/index.html)). Settings files it under small AI models "that download to your device if you use the feature" ([Settings text](https://raw.githubusercontent.com/mozilla-firefox/firefox/main/browser/locales/en-US/browser/preferences/preferences.ftl)).

## What do you need?

You need Firefox, a page in a language on the list, and an internet connection the first time you use that language. Firefox "works on Windows, Mac and Linux devices, and is also available for Android and iOS" ([Firefox FAQ](https://www.firefox.com/en-US/more/faq/)).

* Computer: translation arrived in [Firefox 118](https://www.firefox.com/en-US/firefox/118.0/releasenotes/), in September 2023.
* Android: [Firefox for Android 127](https://www.firefox.com/en-US/firefox/android/127.0/releasenotes/), June 2024, as a gradual roll out.
* iPhone: the [Firefox for iOS 146 notes](https://www.firefox.com/en-US/firefox/ios/146.0/releasenotes/), December 2025, list translation of full web pages.
* An older computer may be refused: the [source documentation](https://firefox-source-docs.mozilla.org/toolkit/components/translations/resources/01_overview.html) says the feature needs a processor with SSE4.1.

## How do you translate a page, step by step?

You open the page, click the translate button in the address bar and press "Translate".

1. Open the foreign page in Firefox.
2. Look at the address bar. When Firefox can translate the page, a translate button appears there ([overview](https://firefox-source-docs.mozilla.org/toolkit/components/translations/resources/01_overview.html)). Its tooltip reads "Translate this page".
3. Click it. A panel opens with the heading "Translate this page?" ([interface text](https://raw.githubusercontent.com/mozilla-firefox/firefox/main/browser/locales/en-US/browser/translations.ftl)).
4. Check the two boxes, "Translate from" and "Translate to".
5. Press "Translate". The first time you use a language, wait while Firefox fetches it.
6. Scroll slowly on a long page. Firefox translates the part near your view first and skips the rest "unless you scroll to it" ([Firefox 140 notes](https://www.firefox.com/en-US/firefox/140.0/releasenotes/)).
7. To see the real wording, open the panel again and press "Show original".

<figure class="mg" data-scene="postcard"><img src="/blog/assets/media/firefox-translate-page/postcard.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a soft white postcard shows lilac lines of text with no readable words. Above it, a sky panel reads Translate this page? and holds two blue boxes that read Translate from and Translate to, and a yellow button that reads Translate. The yellow button presses in and the lilac lines turn mint one by one from the top. Then a small blue button that reads Show original appears in the corner of the postcard. Tap the postcard to turn the lines back to lilac and play it again."><figcaption>Press "Translate" and the page comes back in your language; "Show original" brings back the real wording. Firefox interface text, read 27 Nov 2026.</figcaption></figure>

No button in the address bar? Open the main menu and choose "Translate Page…" ([menu text](https://raw.githubusercontent.com/mozilla-firefox/firefox/main/browser/locales/en-US/browser/appmenu.ftl)).

On Android the names match: "Translate page" in the menu, then "Translate this page?", "Translate" and "Show original" ([Android interface text](https://raw.githubusercontent.com/mozilla-firefox/firefox/main/mobile/android/fenix/app/src/main/res/values/strings.xml)).

## Which settings are worth changing?

The offline download matters most, because it lets you translate with no connection at all.

* In Settings, find "Translations" and open "More translation settings" ([Settings text](https://raw.githubusercontent.com/mozilla-firefox/firefox/main/browser/locales/en-US/browser/preferences/preferences.ftl)).
* Under "Speed up translation" it says: "Download complete languages for faster translations and to translate offline". Use "Download languages" and "Select language". Each choice shows its size in MB.
* To stop being asked on one site, open the panel's settings menu and pick "Never translate this site".
* For one sentence, select the text, right click and choose "Translate Selection…", or "Translate Selection to" and your language ([Firefox 128 notes](https://www.firefox.com/en-US/firefox/128.0/releasenotes/)). The small panel has "Copy" and "Translate full page".
* For your own text, open the main menu, then More Tools, then "Translate…" ([Firefox 151 notes](https://www.firefox.com/en-US/firefox/151.0/releasenotes/)). The box there reads "Add text to translate".

<figure class="mg" data-scene="luggagetag"><img src="/blog/assets/media/firefox-translate-page/luggagetag.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a lilac button that reads Download languages lights up. A mint parcel slides down a sky ribbon into an open blue suitcase, and the lid closes. A yellow luggage tag on the handle flips over to read translate offline, and a soft white tick appears on the tag. Tap the suitcase to open it and send the parcel down again."><figcaption>Download a language in Settings first and Firefox can translate offline. Firefox Settings text, read 27 Nov 2026.</figcaption></figure>

Our view: download the languages you need before a trip.

## What does it get wrong?

It is machine translation, so it can choose the wrong word and, at times, a word that does not exist. The [Firefox 135 notes](https://www.firefox.com/en-US/firefox/135.0/releasenotes/) describe a fix that will "reduce the likelihood" that models "invent new" words. Reduced is not gone.

* The list is limited. For a missing language you see "Sorry, we don't support translations from this language yet".
* Some pairs go through English. With no direct model, Firefox translates into English first and then into your language ([overview](https://firefox-source-docs.mozilla.org/toolkit/components/translations/resources/01_overview.html)).
* Words inside a picture are a different feature. On a computer, with Google as your default search engine, Firefox offers "Search Image with Google Lens" ([Firefox 144 notes](https://www.firefox.com/en-US/firefox/144.0/releasenotes/)). That is Google's service, not the local translator.

Our view: use it to understand a listing or a form. For a contract or anything you must sign, ask a person who reads the language.

## Is it private?

Yes, as far as the translating goes, by Mozilla's own words. The [Firefox 118 notes](https://www.firefox.com/en-US/firefox/118.0/releasenotes/) say "the text being translated does not leave your machine", and [Firefox's page](https://www.firefox.com/en-US/features/translate/) adds "Mozilla doesn't record what webpages you translate".

Two limits apply. The page still comes from its website, like any page you open. And the Google Lens image feature is not part of this promise.

Also on this blog, about privacy: [How to ask AI a private question with Duck.ai, free, no account](/blog/duck-ai-private-chat/).

## What if it does not work?

Start with the language, because the first two messages below are about a language that is missing or will not load.

* "Couldn't load languages". The panel says "Check your internet connection and try again". Reconnect and press "Try again".
* "Sorry, we don't support translations from this language yet". If Firefox guessed the language wrong, press "Change source language".
* "Translation isn't available on this device". Firefox's advice is "Try switching to a different device" ([translation page text](https://raw.githubusercontent.com/mozilla-firefox/firefox/main/toolkit/locales/en-US/toolkit/about/aboutTranslations.ftl)).
* "Translations aren't available for your organization". Ask your administrator.
* "To translate text, unblock this feature". You blocked it under AI controls. Press "Unblock".
* Part of the page stayed foreign. Scroll to it and wait a moment.

<figure class="mg" data-scene="phrasebook"><img src="/blog/assets/media/firefox-translate-page/phrasebook.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a yellow phrasebook lies open with soft white pages and lilac tabs. The first page reads Couldn't load languages over a mint button that reads Try again. The pages turn one by one: the next reads Sorry, we don't support translations from this language yet over a blue button that reads Change source language, and the last reads To translate text, unblock this feature over a mint button that reads Unblock. A sky bookmark slides down to mark each open page. Tap the phrasebook to turn back to the first page."><figcaption>Each message has its own fix, from "Try again" to "Unblock". Firefox interface text, read 27 Nov 2026.</figcaption></figure>

Also on this blog: [How to remove vocals from a song with Audacity's free AI effects](/blog/audacity-remove-vocals/). More guides like these are on the [AI tools](/blog/topics/ai-tools/) page.

## Sources

Checked on 27 Nov 2026:

* [Translate a webpage with Firefox](https://www.firefox.com/en-US/features/translate/), firefox.com
* [Firefox FAQ](https://www.firefox.com/en-US/more/faq/)
* Firefox release notes: [118](https://www.firefox.com/en-US/firefox/118.0/releasenotes/), [128](https://www.firefox.com/en-US/firefox/128.0/releasenotes/), [135](https://www.firefox.com/en-US/firefox/135.0/releasenotes/), [140](https://www.firefox.com/en-US/firefox/140.0/releasenotes/), [144](https://www.firefox.com/en-US/firefox/144.0/releasenotes/), [151](https://www.firefox.com/en-US/firefox/151.0/releasenotes/)
* Firefox for Android release notes: [127](https://www.firefox.com/en-US/firefox/android/127.0/releasenotes/); Firefox for iOS release notes: [146](https://www.firefox.com/en-US/firefox/ios/146.0/releasenotes/)
* Firefox Source Docs: [Translations](https://firefox-source-docs.mozilla.org/toolkit/components/translations/index.html) and [Overview of Translations](https://firefox-source-docs.mozilla.org/toolkit/components/translations/resources/01_overview.html)
* [mozilla/translations](https://github.com/mozilla/translations), the README of Mozilla's translations repository
* Firefox interface text in Mozilla's repository: [translation panel](https://raw.githubusercontent.com/mozilla-firefox/firefox/main/browser/locales/en-US/browser/translations.ftl), [Settings](https://raw.githubusercontent.com/mozilla-firefox/firefox/main/browser/locales/en-US/browser/preferences/preferences.ftl), [main menu](https://raw.githubusercontent.com/mozilla-firefox/firefox/main/browser/locales/en-US/browser/appmenu.ftl), [translation page](https://raw.githubusercontent.com/mozilla-firefox/firefox/main/toolkit/locales/en-US/toolkit/about/aboutTranslations.ftl), [Firefox for Android](https://raw.githubusercontent.com/mozilla-firefox/firefox/main/mobile/android/fenix/app/src/main/res/values/strings.xml)

This guide is independent. It is not made, checked or paid for by Mozilla.

<link rel="stylesheet" href="/blog/assets/media/firefox-translate-page/motion.css"><script defer src="/blog/assets/media/firefox-translate-page/motion.js"></script>
