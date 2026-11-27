---
title: "How to remove vocals from a song with Audacity's free AI effects"
description: "Intel's free OpenVINO AI effects split a song into vocals and instruments inside Audacity. Which version to install, the steps, limits and fixes."
date: 2026-11-27
category: ai-tools
categoryLabel: "AI tools"
type: Guide
primaryKeyword: "audacity remove vocals"
secondaryKeywords: ["remove vocals from a song", "audacity openvino", "audacity music separation", "openvino ai plugins", "free vocal remover"]
tags: ["Guides", "Getting Started", "Open Source", "Local-First"]
faq:
  - q: "Is it free?"
    a: "Yes. Audacity's blog says \"these effects are completely free\", and Audacity itself is free."
  - q: "Does it work with the newest Audacity?"
    a: "Not yet. Install the older version named for your system first."
  - q: "Does the song leave your computer?"
    a: "No, by Intel's account: the effects \"run 100% locally on your PC\"."
  - q: "Does it work on a Mac?"
    a: "Yes, as a release that Audacity calls \"a beta of sorts\"."
---

To remove vocals from a song in Audacity, add Intel's [free](https://www.audacityteam.org/blog/openvino-mac/) [OpenVINO AI effects](https://www.audacityteam.org/download/openvino/), select the track and run "OpenVINO Music Separation" with "2-Stem". You get a vocals track and an instrumental track. The effects need an older Audacity: [3.7.1 on Windows](https://github.com/intel/openvino-plugins-ai-audacity/releases/tag/v3.7.1-R4.2), [3.7.4 on a Mac](https://www.audacityteam.org/blog/openvino-mac/). Checked 27 Nov 2026.

This guide is on the blog of [Munder Difflin](https://harnessmd.com/download), which is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. You do not need it for this guide; its [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup.

Checked on 27 Nov 2026 against Audacity's [website](https://www.audacityteam.org/), [blog](https://www.audacityteam.org/blog/openvino-mac/) and [help pages](https://support.audacityteam.org/music/isolating-or-removing-vocals-from-a-song) and Intel's [repository](https://github.com/intel/openvino-plugins-ai-audacity) for the effects. Names in quotes are the ones those pages use.

## What are the OpenVINO AI effects?

They are a free pack of AI effects that [Intel built for Audacity](https://www.audacityteam.org/blog/openvino-ai-effects/), the [free audio editor](https://www.audacityteam.org/). One of them, "Music Separation", splits a song into separate tracks: ["Drums, Bass, Vocals, & Other Instruments"](https://www.audacityteam.org/download/openvino/). [Audacity's blog](https://www.audacityteam.org/blog/openvino-mac/) says "these effects are completely free and run on your own machine, no internet connection required".

<figure class="mg" data-scene="vinyl"><img src="/blog/assets/media/audacity-remove-vocals/vinyl.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a blue vinyl record with a soft white label that reads Music Separation spins, then splits into four rings that drift apart: a yellow ring that reads Drums, a lilac ring that reads Bass, a sky ring that reads Vocals and a mint ring that reads Other Instruments. Tap the record to join the rings and split it again."><figcaption>Music Separation splits a song into drums, bass, vocals and other instruments. Audacity's download page, read 27 Nov 2026.</figcaption></figure>

## What do you need?

You need a computer, an older version of Audacity and the effects installer for your system. The [download page](https://www.audacityteam.org/download/openvino/) warns: "The OpenVINO plugins are not yet compatible with the latest Audacity version". The latest is [4.0.2](https://www.audacityteam.org/download/windows/) today.

* Windows: Audacity 3.7.1, 64 bit. Intel's [release notes](https://github.com/intel/openvino-plugins-ai-audacity/releases/tag/v3.7.1-R4.2) say the effects are "only compatible with" that release, and add that 3.7.3 works too. Windows on ARM is out: there, plugins ["are not supported"](https://www.audacityteam.org/download/windows/).
* Mac: Audacity 3.7.4 and [macOS 12 or later](https://www.audacityteam.org/blog/openvino-mac/). Audacity calls this first Mac release "a beta of sorts", and its [release page](https://github.com/audacity/mod-openvino-macos/releases) marks it as a pre release.
* Linux: no installer. Intel [says](https://github.com/intel/openvino-plugins-ai-audacity/releases/tag/v3.7.1-R4.2) it "can be compiled for Linux". Its [Linux guide](https://github.com/intel/openvino-plugins-ai-audacity/blob/main/doc/build_doc/linux/README.md) adds that the Audacity snap supports the effects, with the models fetched by a separate command.

## How do you take the vocals out, step by step?

You install the right Audacity, add the effects, then run "OpenVINO Music Separation" on your track.

1. Open audacityteam.org, go to Downloads, then ["Older versions of Audacity"](https://www.audacityteam.org/download/older-versions/), and install the version listed above for your system.
2. Open the page ["Get AI effects for Audacity"](https://www.audacityteam.org/download/openvino/) and choose "Download for Windows" or "Download for macOS". Run the installer.
3. On Windows, check the folder the installer picks. Intel [warns](https://github.com/intel/openvino-plugins-ai-audacity/releases/tag/v3.7.1-R4.2) it "may select the wrong location by default" when more than one Audacity is installed. Use the browse button to point it at 3.7.1.
4. Restart Audacity and bring your song in.
5. Select the track, or the part of it you want.
6. Open ["Effect > OpenVINO AI Effects > OpenVINO Music Separation"](https://support.audacityteam.org/music/isolating-or-removing-vocals-from-a-song).
7. Under ["Separation Mode"](https://github.com/intel/openvino-plugins-ai-audacity/blob/main/doc/feature_doc/music_separation/README.md), choose "2-Stem" for two new tracks, "Instrumental, Vocals", or "4-Stem" for four: "Drums, Bass, Other Instruments, Vocals".
8. Click "Apply" and wait. The new tracks show up in the Audacity workspace, each with the name of its part added to the track name.
9. Mute the track you do not want, then export.

<figure class="mg" data-scene="faders"><img src="/blog/assets/media/audacity-remove-vocals/faders.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a soft white mixing desk shows a blue button that reads Apply. The Apply button presses down, two lilac faders labelled Vocals and Instrumental rise, then the Vocals fader slides all the way down while a mint level light keeps blinking beside Instrumental. Tap the desk to slide the Vocals fader back up and play it again."><figcaption>"2-Stem" makes two new tracks, Instrumental and Vocals. Intel's Music Separation guide, read 27 Nov 2026.</figcaption></figure>

## Which settings make it faster?

"OpenVINO Inference Device" matters most, because it decides which chip does the work. Audacity's [help page](https://support.audacityteam.org/music/isolating-or-removing-vocals-from-a-song) puts it this way:

* "CPU always works, but is typically slowest"
* "GPU is typically fastest on high-end computers"
* "NPU can only be used on modern Intel processors, and is similarly fast as GPU"

<figure class="mg" data-scene="speedometer"><img src="/blog/assets/media/audacity-remove-vocals/speedometer.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a soft white speedometer with a blue dial and a yellow needle sits above three chips that read CPU, GPU and NPU, coloured mint, sky and lilac. While the mint CPU chip glows, the needle rests low; when the sky GPU chip or the lilac NPU chip lights up, the needle swings high. Tap a chip to move the needle to that setting."><figcaption>CPU is typically slowest; GPU is typically fastest on high end computers. Audacity Support, read 27 Nov 2026.</figcaption></figure>

The ["Device Details"](https://github.com/intel/openvino-plugins-ai-audacity/blob/main/doc/feature_doc/music_separation/README.md) button shows which chip each name means. The first run is the slow one: loading the model "usually takes 10 to 30 seconds" the first time on a device. After that it is cached and "should run much faster the next time". Tick "Advanced" to see "Shifts", and leave it alone at first. A higher value "may produce better results", but processing time grows in step with it.

Our view: start with "2-Stem" on a short selection, see how long it takes, then run the whole song.

## What does it get wrong?

No page promises a clean split, so listen to every new track before you rely on it. The [help page](https://support.audacityteam.org/music/isolating-or-removing-vocals-from-a-song) goes no further than saying the two stem mode "works well on most songs". In four stem mode everything that is not drums, bass or vocals lands in one track, which [Audacity's blog](https://www.audacityteam.org/blog/openvino-ai-effects/) calls a combined "anything else" part. It is also [heavy work](https://support.audacityteam.org/music/isolating-or-removing-vocals-from-a-song): "This effect takes a lot of computing power, as do all AI effects."

## Is it private?

Yes, by Intel's description: ["These AI features run 100% locally on your PC"](https://github.com/intel/openvino-plugins-ai-audacity). Nothing on the pages says your song is sent anywhere to be processed. You do need the internet once, to download Audacity, the installer and the models.

Privacy is not permission, though. Our view: use it on your own recordings and on music you have the right to edit, and do not share a split of somebody else's song.

## What if it does not work?

Start with the Audacity version, because the effects only fit the older releases.

* The effects are missing from the Effect menu. Check that you opened the older Audacity, not 4.0.2, and that you restarted it after installing.
* It is very slow. Switch "OpenVINO Inference Device" to GPU if you have one, and try a shorter selection.
* It misbehaves on a Mac. The [release](https://github.com/audacity/mod-openvino-macos/releases) has one build for Apple silicon and one for Intel, and [Audacity notes](https://www.audacityteam.org/blog/openvino-mac/) that "in some cases, the Intel binaries perform better, even on Apple Silicon macs".
* You want it gone. On Windows, uninstall "OpenVINO AI Plugins for Audacity" under "Settings > Apps > Installed Apps". For a Mac, the help page ["Uninstalling OpenVINO models"](https://support.audacityteam.org/troubleshooting/uninstalling-openvino-models) lists the folder to remove.
* Still stuck. The [download page](https://www.audacityteam.org/download/openvino/) links a "Help forum" and Intel's GitHub page, where Intel's [README](https://github.com/intel/openvino-plugins-ai-audacity) welcomes you to "submit an issue".

Also on this blog: [How to translate a web page on your own computer with Firefox](/blog/firefox-translate-page/) and [Buzz: free, offline Whisper transcription for a long recording](/blog/buzz-whisper-transcription/). More guides are under [AI tools](/blog/topics/ai-tools/).

## Sources

Checked on 27 Nov 2026:

* [Get AI effects for Audacity](https://www.audacityteam.org/download/openvino/)
* [Older versions](https://www.audacityteam.org/download/older-versions/)
* [Download for Windows](https://www.audacityteam.org/download/windows/), current version 4.0.2
* [OpenVINO AI Plugins are now available for macOS](https://www.audacityteam.org/blog/openvino-mac/), 11 June 2025
* [Introducing OpenVINO AI effects for Audacity](https://www.audacityteam.org/blog/openvino-ai-effects/), 2 January 2024
* [Isolating or removing vocals from a song](https://support.audacityteam.org/music/isolating-or-removing-vocals-from-a-song)
* [Uninstalling OpenVINO models](https://support.audacityteam.org/troubleshooting/uninstalling-openvino-models)
* [AI plugins](https://plugins.audacityteam.org/ai-plugins/ai-plugins)
* [Audacity home page](https://www.audacityteam.org/) and [FAQ](https://www.audacityteam.org/faq/)
* [Intel's repository](https://github.com/intel/openvino-plugins-ai-audacity) and [releases](https://github.com/intel/openvino-plugins-ai-audacity/releases), latest `v3.7.1-R4.2`, published 20 Dec 2024
* [Music Separation guide](https://github.com/intel/openvino-plugins-ai-audacity/blob/main/doc/feature_doc/music_separation/README.md)
* [Linux guide](https://github.com/intel/openvino-plugins-ai-audacity/blob/main/doc/build_doc/linux/README.md)
* [Mac package repository](https://github.com/audacity/mod-openvino-macos) and [releases](https://github.com/audacity/mod-openvino-macos/releases), latest `v3.7.1-R4.2-beta-3`, published 19 Jun 2025, marked pre release

This guide is independent. It is not made, checked or paid for by Intel or Audacity.

<link rel="stylesheet" href="/blog/assets/media/audacity-remove-vocals/motion.css"><script defer src="/blog/assets/media/audacity-remove-vocals/motion.js"></script>
