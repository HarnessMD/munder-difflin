---
title: "Buzz: free, offline Whisper transcription for a long recording"
description: "Buzz is a free, open source app that turns audio and video into text on your own computer. Setup, model choice, speaker labels, limits and fixes."
date: 2026-11-27
category: ai-tools
categoryLabel: "AI tools"
type: Guide
primaryKeyword: "buzz whisper transcription"
secondaryKeywords: ["buzz transcription", "buzz app", "transcribe audio offline", "whisper desktop app", "free transcription app"]
tags: ["Guides", "Getting Started", "Open Source", "Voice"]
faq:
  - q: "Is Buzz free?"
    a: "Yes. The author's site lists it as \"Free and open-source on GitHub\"."
  - q: "Does Buzz work offline?"
    a: "Yes, once a model is on your disk. The first model download needs the internet."
  - q: "Does Buzz run on an Intel Mac?"
    a: "Version 1.4.5 does, but it is the last one that will, and speaker labels do not work there."
  - q: "Can Buzz tell who is speaking?"
    a: "Yes. \"Identify speakers\" labels each sentence, and you can rename the labels."
---

Buzz is a [free and open source](https://buzzcaptions.com/) app that turns a recording into text on your own computer, using [OpenAI's Whisper](https://github.com/chidiwilliams/buzz). Import the audio or video file, pick the language and a model, click "Run", then export the text. It can also label who is speaking. Checked 26 Nov 2026.

This guide is on the blog of [Munder Difflin](https://harnessmd.com/download), which is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. You do not need it for this guide; its [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup.

Checked on 26 Nov 2026 against the project [README](https://github.com/chidiwilliams/buzz), the [latest release](https://github.com/chidiwilliams/buzz/releases/latest) and the [documentation](https://chidiwilliams.github.io/buzz/docs), at version 1.4.5. Names in quotes are the ones those pages use.

## What is Buzz?

Buzz is a [free](https://buzzcaptions.com/) and [open source](https://github.com/chidiwilliams/buzz/blob/main/LICENSE) app for [Mac, Windows and Linux](https://chidiwilliams.github.io/buzz/docs) that turns recorded speech into text on your own computer. The [README](https://github.com/chidiwilliams/buzz) sums it up: "Transcribe and translate audio offline on your personal computer." It is "Powered by OpenAI's Whisper", a speech model.

<figure class="mg" data-scene="cassette"><img src="/blog/assets/media/buzz-whisper-transcription/cassette.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a yellow cassette with a soft white label that reads Buzz turns its two blue reels. Its lilac tape unrolls across the screen and turns into sky lines of text on a soft white page, and a mint tag that reads offline lights up beside the page. Tap the cassette to rewind the tape and play it again."><figcaption>It turns audio into text offline, on your own computer. Buzz README, read 26 Nov 2026.</figcaption></figure>

## What do you need?

You need a computer, the recording as an audio or video file, and an internet connection for the first setup.

* Mac: [release 1.4.5](https://github.com/chidiwilliams/buzz/releases/tag/v1.4.5) has one file for Apple silicon, `Buzz-1.4.5-mac-ARM64.dmg`, and one for Intel, `Buzz-1.4.5-mac-X64.dmg`. The [README](https://github.com/chidiwilliams/buzz) warns: "Buzz now requires Apple silicon. The last version to support Intel Macs is 1.4.5."
* [Windows](https://chidiwilliams.github.io/buzz/docs/installation): "App is not signed, you will get a warning when you install it." Select "More info", then "Run anyway". On the GitHub [release page](https://github.com/chidiwilliams/buzz/releases/tag/v1.4.5), "download all three Windows files".
* [Linux](https://github.com/chidiwilliams/buzz): "Buzz is available as a Flatpak, Snap or Appimage."

## How do you turn a recording into text, step by step?

You import the file, choose a language and a model, click "Run", then open and export the transcript.

1. Install Buzz from the download link in the [README](https://github.com/chidiwilliams/buzz) and open it.
2. Click ["Import Media File"](https://chidiwilliams.github.io/buzz/docs/usage/file_import) on the "File" menu, then "Choose an audio or video file."
3. Leave the task on ["Transcribe"](https://chidiwilliams.github.io/buzz/docs/usage/live_recording) and pick the language yourself. The [docs](https://chidiwilliams.github.io/buzz/docs/usage/file_import) recommend it, because "automatic language detection may result in unexpected results".
4. Pick the model settings (see below). A model downloads the first time you use it.
5. "Click Run." Wait until the status shows "Completed".
6. Double click the row to open the transcript, then use the [export button](https://chidiwilliams.github.io/buzz/docs/usage/transcription_viewer). TXT is plain text; SRT and VTT are subtitle files.

<figure class="mg" data-scene="typewriter"><img src="/blog/assets/media/buzz-whisper-transcription/typewriter.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a blue typewriter holds a soft white sheet. A yellow key that reads Run presses down, the typewriter types lilac lines of text across the sheet one by one, then a mint tag that reads Completed pops up above it and a sky tag below it reads TXT. Tap the typewriter to roll in a fresh sheet and type it again."><figcaption>Click Run, then open the transcript at Completed. Buzz File Import docs, read 26 Nov 2026.</figcaption></figure>

## How do you label who is speaking?

You open a finished transcript and click ["Identify speakers"](https://chidiwilliams.github.io/buzz/docs/usage/speaker_identification).

1. Keep the recording where it was. Labels are added only "If the audio file is still present on the system".
2. Double click the transcript, then click "Identify speakers".
3. With the "MSDD" model, leave the number of speakers on "Auto", or set it when you know it.
4. Buzz gives each speaker's sentences a label. "You can preview 10 seconds of a random sentence from an identified speaker" and rename the label "to the speaker's real name".

<figure class="mg" data-scene="nametag"><img src="/blog/assets/media/buzz-whisper-transcription/nametag.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a blue button that reads Identify speakers glows, and three soft white name tags slide in on a lilac ribbon. Soft white lines of a transcript sort themselves under the tags, the tags fill with yellow, sky and mint one by one, and a small mint chip that reads 10 seconds blinks on the first tag. Tap a tag to blink its 10 seconds chip and sort the lines again."><figcaption>Preview 10 seconds of a speaker, then rename the label. Buzz speaker identification docs, read 26 Nov 2026.</figcaption></figure>

One limit: "Speaker identification is not available on Intel macOS."

## Which model should you pick?

Pick [Whisper.cpp](https://chidiwilliams.github.io/buzz/docs/faq#4-what-model-should-i-use) unless your computer has a strong Nvidia graphics card.

* No Nvidia card, or a Mac: Whisper.cpp. It "will use any brand of GPU" and "can also run on CPU only".
* An Nvidia card "with at least 6GB of VRAM": Faster Whisper.
* Size: "Smaller models will work faster but will have more inaccuracies." Larger ones are more accurate and slower.
* Among the large models, "Turbo" aims for "a good balance between speed and accuracy". "Large-V3" has "the best accuracy in many cases" but "some times can hallucinate or invent words that were never in the audio".
* "Models with .En in their names are for English and will not work for other languages."

Our view: test two sizes on a short piece of your own audio before you run the whole file.

## What does it get wrong?

It mishears words, and it can put a sentence under the wrong speaker.

* Names and rare words. Type "commonly misspelled words" into the ["Initial prompt"](https://chidiwilliams.github.io/buzz/docs/usage/file_import), behind the "Advanced..." button at import.
* Noisy audio. Tick "Extract speech" at import "to improve accuracy".
* [Speaker labels](https://chidiwilliams.github.io/buzz/docs/usage/speaker_identification). Buzz "cannot guarantee that every sentence is assigned to the correct person". Recordings with "overlapping speech, large differences in microphone distance, or very little speech from one participant can still require manual correction."

Our view: play the audio beside the text before you rely on any line, and record only people who agreed to it.

## Is it private?

Yes by default, because the transcription runs on your own computer, with four things to know.

* The internet is used to [fetch models](https://github.com/chidiwilliams/buzz/blob/main/share/metainfo/io.github.chidiwilliams.Buzz.metainfo.xml): "Network permission is used to download transcription model files."
* Buzz can also use the ["OpenAI API to do speech recognition on a remote server"](https://chidiwilliams.github.io/buzz/docs/faq#2-what-can-i-try-if-the-transcription-runs-too-slowly). That needs an API key you add in ["Preferences"](https://chidiwilliams.github.io/buzz/docs/preferences). With it on, the audio leaves your computer.
* The ["AI Summary"](https://chidiwilliams.github.io/buzz/docs/usage/plugins) plugin also sends the transcript to a service you set up.
* Usage statistics. The [Preferences](https://chidiwilliams.github.io/buzz/docs/preferences) page says "Buzz collects basic OS name and architecture usage statistics".

## What if it does not work?

Start with a smaller model, then check the model download.

* It is slow. The [FAQ](https://chidiwilliams.github.io/buzz/docs/faq) says to try "a lower Whisper model size or using a Whisper.cpp model".
* It crashes. "If a model download was incomplete or corrupted, Buzz may crash." Delete the model under "Help", "Preferences", "Models" and download it again.
* The computer has no internet. Download the models on another computer, then copy the models folder across. The "Show file location" button opens that folder.
* It still crashes on a very old computer. "Buzz needs AVX2 support in your CPU, very old computers are not supported."

Also on this blog: [How to talk instead of typing with Handy, free speech to text](/blog/handy-speech-to-text/) and [How to ask AI a private question with Duck.ai, free, no account](/blog/duck-ai-private-chat/). More guides are under [AI tools](/blog/topics/ai-tools/).

## Sources

Checked on 26 Nov 2026:

* [Buzz README](https://github.com/chidiwilliams/buzz)
* [Latest release](https://github.com/chidiwilliams/buzz/releases/latest), v1.4.5, published 23 Aug 2026
* [Introduction](https://chidiwilliams.github.io/buzz/docs)
* [Installation](https://chidiwilliams.github.io/buzz/docs/installation)
* [File Import](https://chidiwilliams.github.io/buzz/docs/usage/file_import)
* [Speaker identification](https://chidiwilliams.github.io/buzz/docs/usage/speaker_identification)
* [Transcription Viewer](https://chidiwilliams.github.io/buzz/docs/usage/transcription_viewer)
* [Live Recording](https://chidiwilliams.github.io/buzz/docs/usage/live_recording)
* [FAQ](https://chidiwilliams.github.io/buzz/docs/faq)
* [Preferences](https://chidiwilliams.github.io/buzz/docs/preferences)
* [Plugins](https://chidiwilliams.github.io/buzz/docs/usage/plugins)
* [Buzz Captions](https://buzzcaptions.com/), the author's site
* [MIT licence](https://github.com/chidiwilliams/buzz/blob/main/LICENSE)
* [App description file](https://github.com/chidiwilliams/buzz/blob/main/share/metainfo/io.github.chidiwilliams.Buzz.metainfo.xml)

This guide is independent. It is not made, checked or paid for by the Buzz project.

<link rel="stylesheet" href="/blog/assets/media/buzz-whisper-transcription/motion.css"><script defer src="/blog/assets/media/buzz-whisper-transcription/motion.js"></script>
