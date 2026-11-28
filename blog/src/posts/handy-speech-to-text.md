---
title: "How to talk instead of typing with Handy, free speech to text"
description: "Handy is a free, open source app that types what you say into any text box, on your own computer. Setup, which model to pick, limits and fixes."
date: 2026-11-26
category: ai-tools
categoryLabel: "AI tools"
type: Guide
primaryKeyword: "handy speech to text"
secondaryKeywords: ["handy app", "handy dictation", "free speech to text", "parakeet v3", "offline speech to text"]
tags: ["Guides", "Getting Started", "Open Source", "Voice"]
faq:
  - q: "Is Handy free?"
    a: "Yes. It is free and open source, and it needs no account."
  - q: "Does your voice leave your computer?"
    a: "Not in ordinary use. The speech model runs on your own machine."
  - q: "Which model should you pick?"
    a: "Parakeet V3 for English and European languages, a Whisper model for other languages."
  - q: "Does it work offline?"
    a: "Yes, once the app and one model are downloaded."
---

[Handy](https://handy.computer/) is a free and open source app that types what you say into any text box. Hold a shortcut, talk, let go, and your words are pasted at your cursor. The speech model runs on your own computer, and your voice stays there. Checked 25 Nov 2026.

This guide is on the blog of [Munder Difflin](https://harnessmd.com/download), which is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. You do not need it for this guide; its [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup.

Checked on 25 Nov 2026 against the makers' [website](https://handy.computer/), [documentation](https://handy.computer/docs) and [README](https://github.com/cjpais/Handy), at version [v0.10.2](https://handy.computer/download). Names in quotes are the ones those pages use.

## What is Handy?

Handy is a [free and open source](https://handy.computer/) app for [Mac, Windows and Linux](https://handy.computer/download) that turns your speech into text and pastes it wherever your cursor is. It is a dictation tool, not an assistant: "One tool, one job. Transcribe what you say and put it into a text box."

<figure class="mg" data-scene="microphone"><img src="/blog/assets/media/handy-speech-to-text/microphone.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a yellow microphone stands beside a soft white text box. A mint sound wave rolls out of the microphone and turns into lilac letters that land in the text box and read One tool, one job, while a blue cursor blinks after them. Tap the microphone to send a new wave and play it again."><figcaption>It types what you say into a text box. Handy home page, read 25 Nov 2026.</figcaption></figure>

## What do you need?

You need a computer, a microphone and an internet connection for the first setup.

The computer can be a Mac, a Windows PC or a Linux machine; the [download page](https://handy.computer/download) lists no phone version. The recommended model takes about 478 MB of disk space ([models page](https://handy.computer/docs/models)).

## How do you set up Handy and dictate, step by step?

You download the app, grant two permissions, pick a model, then hold the shortcut and talk.

1. Go to [handy.computer](https://handy.computer/), open the [download page](https://handy.computer/download) and take the file for your computer. The Homebrew and winget packages "are not maintained by the Handy developers" ([README](https://github.com/cjpais/Handy)).
2. Install it. On a Mac, grant both permissions Handy asks for: "Microphone" and "Accessibility" ([Getting Started](https://handy.computer/docs)). Skip the second and Handy hears you but pastes nothing.
3. Pick a model (next section) and wait for the download.
4. Click into any text field: "a browser, editor, chat app, anywhere you can type".
5. Hold the shortcut. The default is Option + Space on a Mac and Ctrl + Space on Windows and Linux ([General settings](https://handy.computer/docs/general)). "Speak naturally", then let go. Your words are pasted at the cursor.

Holding the keys is "Push To Talk", the default. Turn it off in the General settings and one press starts recording and a second stops it. Shortcuts with the fn key "only work on Apple keyboards" ([README](https://github.com/cjpais/Handy)).

<figure class="mg" data-scene="keyboard"><img src="/blog/assets/media/handy-speech-to-text/keyboard.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a soft white keyboard lies flat. Two keys reading Option and Space glow yellow and press down, a sky label above them reads Push To Talk, and a mint sound wave pulses while they are held. The keys rise, the wave stops and blue lines of text appear in a lilac text box. Tap the keyboard to press the keys again."><figcaption>Hold Option + Space on a Mac, Ctrl + Space on Windows and Linux. Handy General docs, read 25 Nov 2026.</figcaption></figure>

## Which model should you pick?

Pick Parakeet V3 unless one of the cases below fits ([Getting Started](https://handy.computer/docs), [Models](https://handy.computer/docs/models)).

* English or a European language: Parakeet V3, about 478 MB.
* A language outside Europe, or several: Whisper Medium, about 492 MB, or Whisper Small, about 487 MB, on a weaker computer.
* A very slow computer, English only: Moonshine V2 Tiny, about 31 MB.
* The best English on a strong graphics chip: Cohere Transcribe, about 1.8 GB.

Parakeet writes numbers as words, so use a Whisper model for digits. The [FAQ](https://handy.computer/docs/faq) warns that Parakeet "is primarily an English model" and with other speech "may produce English output or gibberish".

## What does it get wrong?

It writes what it heard, so rambling, restarts and misheard names all come through.

* Names and rare words. Add them under "Custom Words" in "Settings > Advanced" ([Advanced](https://handy.computer/docs/advanced)). The makers admit: "This is very imperfect."
* Long recordings. The [FAQ](https://handy.computer/docs/faq) says to keep recordings under 3 to 5 minutes for best results, because current models "do not handle very long audio well". Longer ones can fail.
* Saying "period" or "comma" does not insert the symbol.
* It is not live: "Handy records a segment, then transcribes it."
* Whisper can add a stray "thank you" or "bye bye" to a short recording. Parakeet does not.
* It hears only your microphone, not a video call.

Our view: talk in short takes and read every paste before you send it.

<figure class="mg" data-scene="speechbubble"><img src="/blog/assets/media/handy-speech-to-text/speechbubble.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a long lilac speech bubble splits into three short sky speech bubbles. Each short bubble drops its words, one at a time, into a soft white text box beside a blinking blue cursor, while a yellow tag above them reads short takes and a mint tick appears next to the text box. Tap a bubble to join them into one long bubble and split it again."><figcaption>Keep recordings under 3 to 5 minutes. Handy FAQ, read 25 Nov 2026.</figcaption></figure>

## Is it private?

Yes for the audio, with three things to know. The [policy](https://handy.computer/privacy) says: "During ordinary transcription, Handy does not send your microphone audio or transcription content to the Handy maintainers or to Handy servers."

* The internet is used for model downloads and update checks. Update checks are on by default and can be turned off in the settings.
* The "History" tab keeps recent transcriptions with their audio on your disk. The policy says this data is protected by your operating system account and file system controls, and Handy does not currently add its own encryption. To keep nothing, set "History Limit" to 0 under "Advanced > History" ([History](https://handy.computer/docs/history)).
* Post processing is optional and experimental. With a cloud provider, the text of what you said goes to that company. It is off unless you set it up ([Post Processing](https://handy.computer/docs/post-processing)).

## What if it does not work?

Start with the permission and the paste method ([Troubleshooting](https://handy.computer/docs/troubleshooting)).

* Nothing is pasted. Check the cursor was in a text field. On a Mac, allow Handy under "System Settings > Privacy & Security > Accessibility". If your words show in the "History" tab, try another paste method in "Settings > Advanced". On Windows, an app running as administrator blocks the paste, so run Handy as administrator too. On Linux, Handy "needs a small tool to type into other apps": xdotool on X11, and on Wayland one that depends on your desktop. On Wayland the shortcut may also work only while Handy's window is in front ([Linux Setup](https://handy.computer/docs/linux)), and the [README](https://github.com/cjpais/Handy) calls Wayland support limited.
* Old copied text is pasted. In the Debug settings (Cmd+Shift+D on a Mac, Ctrl+Shift+D elsewhere), raise the paste delay from 60 ms to between 100 and 200 ms.
* Nothing is transcribed. Check the microphone is not muted and a model shows under "Settings > Models", then try another microphone in "Settings > General". Bluetooth devices "can have issues with Handy".
* The shortcut stopped on a Mac. Secure Input is probably active, often from a terminal with "Secure Keyboard Entry" on or a password manager. Turn it off or quit that app.
* It is slow. Try "a smaller model (Moonshine Tiny or Whisper Small)".

Also on this blog: [Goblin Tools Magic ToDo: break a scary chore into small steps](/blog/goblin-tools-magic-todo/), [How to use Upscayl to make a small photo sharp again](/blog/upscayl-make-a-small-photo-sharp/) and [Gemini Notebook: turn a long contract into an audio summary](/blog/gemini-notebook-contract-audio-summary/). More guides are under [AI tools](/blog/topics/ai-tools/).

## Sources

Checked on 25 Nov 2026:

* [Handy home page](https://handy.computer/)
* [Download Handy](https://handy.computer/download)
* [About Handy](https://handy.computer/about)
* [Getting Started](https://handy.computer/docs)
* [Linux Setup](https://handy.computer/docs/linux)
* [Models](https://handy.computer/docs/models)
* [General](https://handy.computer/docs/general)
* [Advanced](https://handy.computer/docs/advanced)
* [FAQ](https://handy.computer/docs/faq)
* [Troubleshooting](https://handy.computer/docs/troubleshooting)
* [Post Processing](https://handy.computer/docs/post-processing)
* [History](https://handy.computer/docs/history)
* [Privacy Policy](https://handy.computer/privacy), effective 18 Sep 2026
* [README](https://github.com/cjpais/Handy)

This guide is independent. It is not made, checked or paid for by the Handy project.

<link rel="stylesheet" href="/blog/assets/media/handy-speech-to-text/motion.css"><script defer src="/blog/assets/media/handy-speech-to-text/motion.js"></script>
