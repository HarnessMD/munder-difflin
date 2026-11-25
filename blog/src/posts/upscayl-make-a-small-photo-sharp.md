---
title: "How to use Upscayl to make a small photo sharp again"
description: "Upscayl is a free, open source app that enlarges small or pixelated photos on your own computer. Steps for Windows, Mac and Linux, limits and fixes."
date: 2026-11-25
category: ai-tools
categoryLabel: "AI tools"
type: Guide
primaryKeyword: "upscayl"
secondaryKeywords: ["how to use upscayl", "upscayl gpu id", "upscayl washed out", "upscayl mac", "free ai image upscaler"]
tags: ["Guides", "Getting Started", "Open Source", "Images"]
faq:
  - q: "Is Upscayl free?"
    a: "The desktop app is free and open source. Its download page, read 25 Nov 2026, says \"Upscayl Desktop is completely free and open source\" and labels the Mac file \"DMG (Free)\". The Mac App Store version is a paid version with extra features, per the same page."
  - q: "Can Upscayl fix a blurry photo?"
    a: "No. The makers' FAQ says it can enhance low resolution and pixelated images \"but it cannot de-blur or do focus adjustment on your image\". It suits small or blocky photos, not out of focus ones."
  - q: "Does Upscayl need a graphics card?"
    a: "Yes. The README says \"You'll need a Vulkan compatible GPU (Graphics Card) to upscale images\" and that many integrated graphics chips do not work. The download page says \"CPU only mode is not supported at the moment\". The makers' docs link a slow workaround for Windows and Linux."
  - q: "Why do my Upscayl results look washed out?"
    a: "The makers say Upscayl \"currently only supports the sRGB color profile\". Convert the photo to sRGB in any image editor, then upscale it again."
  - q: "Where does Upscayl do the work?"
    a: "The desktop app does the work on your own computer's graphics chip; its download page says \"Upscayl Desktop does all the processing on your local machine.\" The same makers run a separate service, Upscayl Cloud, whose privacy policy lists \"Images you upload\" among what it collects."
---

[Upscayl](https://github.com/upscayl/upscayl) is a free, open source desktop app for Windows, Mac and Linux that makes a small or pixelated photo bigger and cleaner. Its default models return an image four times as wide and tall. It needs a compatible graphics chip and cannot fix blur. Checked 25 Nov 2026.

This guide is on the blog of [Munder Difflin](https://harnessmd.com/download), which is free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer. You do not need it for this guide; its [install guide](/blog/how-to-install-and-use-munder-difflin/) covers setup.

## What is Upscayl?

It is a "Free and Open Source AI Image Upscaler" that "uses AI models to enhance your images by guessing what the details could be", per its [README](https://github.com/upscayl/upscayl). The latest [release](https://github.com/upscayl/upscayl/releases/latest), "2.15 New Year Update" (v2.15.0), came out 25 Dec 2024. On GitHub, its licence is GNU Affero General Public License v3.0.

## Will it work on your photo?

Only if the photo is small or pixelated, not blurred. The [README FAQ](https://github.com/upscayl/upscayl#-faq) says it "cannot de-blur or do focus adjustment on your image. If your image is out-of-focus or totally blurred, Upscayl is not the right tool for it."

Our view: zoom in. If you see squares and jagged edges, try it; if you see soft smears, it will not help.

## Will it work on your computer?

Only with a compatible graphics chip. The README says: "You'll need a Vulkan compatible GPU (Graphics Card) to upscale images. Many iGPUs (integrated graphics) do not work but, no harm in trying". The rough rule on the [Troubleshooting page](https://github.com/upscayl/upscayl/wiki/Troubleshooting): a GPU "is usually either from Nvidia, named an 'Arc', or named with the letter R followed by a number or X; anything else is probably an incompatible CPU, which may work but only slowly with a workaround".

It also needs Windows 10 or later, or macOS 12 or later (README), or Ubuntu 20.04 or later ([Compatibility List](https://github.com/upscayl/upscayl/wiki/Compatibility-List)).

## How do you use Upscayl, step by step?

Download it, install it, then upscale a copy of your photo.

1. **Download it** from the [download page](https://upscayl.org/download) or the release page, and nowhere else. The files end in `win.exe`, `mac.dmg` or `linux.AppImage`. On Mac, take the file marked "DMG (Free)"; the page's FAQ says the Mac App Store version is a paid one.
2. **Install it.**
   * Windows: double click the exe file. If you get a SmartScreen warning, click "More Info" and then "Run Anyway" or press "YES" on the unverified publisher dialog. Do that only for a file from those two places. Then follow the installation steps.
   * Mac: double click the dmg and drag the Upscayl icon into the Applications folder. Open Finder, click "Applications" in the left sidebar, find Upscayl and right click on it. Select "Open". In the window that appears, press "Open" again.
   * Linux: Upscayl "should be available on the software listings of most Linux operating systems". For the AppImage, right click it, go to the Permissions tab, check "allow file to execute", then double click the file.
3. **Copy your photo first.** Keep the original safe; the result is a guess.
4. **Upscale one photo.** Open the "Upscayl" tab, choose your photo, and choose a model, which the app calls the "Upscayling type". Start the job and wait. The [wiki Guide](https://github.com/upscayl/upscayl/wiki/Guide) says "all the default models only support x4"; for a smaller scale, the app shrinks the x4 image.

For business use, the download page FAQ says "only General Photo (Real-ESRGAN), General Photo (Fast Real-ESRGAN) and Digital Art, allow commercial use. All other models are for personal use only."

<figure class="mg" data-scene="mosaic"><img src="/blog/assets/media/upscayl-make-a-small-photo-sharp/mosaic.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, blocky blue and lilac square tiles sit loose on a soft white board. They slide together and settle into a clean yellow circle that grows four times as wide, and a mint tag reading X4 drops onto the corner of the board. Tap the board to break the circle back into tiles and play it again."><figcaption>The default models only support x4. Upscayl wiki Guide, read 25 Nov 2026.</figcaption></figure>

## How do you try a second model, a batch, or go bigger?

The makers' [website](https://upscayl.org/) names all three.

* **A second model.** The README credits name models such as "High Fidelity", Remacri, Ultrasharp and Ultramix Balanced. Our view: run the photo through two and keep the one closest to the real scene, not the sharpest.
* **A batch.** "Batch Upscayl" does "several images in one go". Do not stop it early; the README FAQ says to "simply wait for the process to finish".
* **Bigger.** "Double Upscayl" will "Upscayl your images twice", and the site says "up to 16x better resolution": by our count, four times, done twice. Our view: use it rarely; it is a guess on a guess, and files get huge.

## What does Upscayl get wrong, and how do you check?

It guesses, so small details can change: a letter on a sign, the pattern on a shirt, a face. Put the original and the result side by side and look at faces and text first.

<figure class="mg" data-scene="loupe"><img src="/blog/assets/media/upscayl-make-a-small-photo-sharp/loupe.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, two soft white photo cards stand side by side, labelled Original and Result. A blue loupe with a yellow handle glides from the Original card to the Result card and stops over a lilac sign, where a sky ring pulses. Tap the loupe to send it back to the Original card."><figcaption>The makers say it works "by guessing what the details could be". Upscayl README, read 25 Nov 2026.</figcaption></figure>

Our view: for a photo that matters, like a memorial or official one, tell people it was enhanced and keep the original. Never use an enhanced photo as proof of what something said or looked like.

<figure class="mg" data-scene="frame"><img src="/blog/assets/media/upscayl-make-a-small-photo-sharp/frame.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white background, a yellow picture frame holds the enlarged photo, and a mint tag reading Enhanced swings from its corner. Beside it, a smaller blue frame holds the kept photo with a soft white tag reading Original. A lilac shelf slides in under both. Tap the tag to make it swing again."><figcaption>Our view, 25 Nov 2026: say a photo was enhanced, and keep the original.</figcaption></figure>

## Where does Upscayl do the work?

The desktop app does the work on your own computer's graphics chip, which is why it needs one. The download page says "Upscayl Desktop does all the processing on your local machine."

The same makers run a separate service, [Upscayl Cloud](https://upscayl.org/cloud); its [privacy policy](https://upscayl.org/privacy) lists "Images you upload" among what it collects. Only enhance photos you have the right to use. See also: [Why Local-First Matters for Your AI Agents](/blog/why-local-first-matters-for-ai-agents/).

## What should you try when Upscayl fails?

Work down this list, which follows the makers' [Troubleshooting page](https://github.com/upscayl/upscayl/wiki/Troubleshooting).

1. Update the app, or uninstall and reinstall it.
2. Restart your computer.
3. Set the GPU ID. After one upscale try, the logs area of the "Settings" tab lists your GPU IDs. Type your discrete GPU's number, the separate graphics card, into the "GPU ID" box.
4. Washed out colours: the app "currently only supports the sRGB color profile", so convert the photo to sRGB first.
5. Linux: install graphics drivers, including Vulkan drivers.
6. Mac: "Make sure you're using the latest MacOS update."
7. Windows: set the app to performance mode under advanced display settings, or Windows may override your GPU ID.
8. No graphics chip: the download page says "CPU only mode is not supported at the moment". The [docs](https://docs.upscayl.org/) link a slow workaround, "[Using Upscayl on Windows and Linux with only a CPU](https://github.com/upscayl/upscayl/issues/390)".
9. Still stuck: press the COPY button by the logs in the "Settings" tab and follow [How to ask for help](https://github.com/upscayl/upscayl/wiki/%F0%9F%99%8B-How-to-ask-for-help%3F): GitHub issues only, not email or Telegram. Our view: read logs before you post them in public.

Also on this blog: [Gemini Notebook: turn a long contract into an audio summary](/blog/gemini-notebook-contract-audio-summary/).

## Sources

All opened 25 Nov 2026.

* [Website](https://upscayl.org/), [download page](https://upscayl.org/download), [Upscayl Cloud](https://upscayl.org/cloud), [privacy policy](https://upscayl.org/privacy)
* [README](https://github.com/upscayl/upscayl), [latest release](https://github.com/upscayl/upscayl/releases/latest)
* Wiki: [Guide](https://github.com/upscayl/upscayl/wiki/Guide), [Troubleshooting](https://github.com/upscayl/upscayl/wiki/Troubleshooting), [Compatibility List](https://github.com/upscayl/upscayl/wiki/Compatibility-List), [How to ask for help](https://github.com/upscayl/upscayl/wiki/%F0%9F%99%8B-How-to-ask-for-help%3F)
* [Documentation](https://docs.upscayl.org/), [General Fixes](https://docs.upscayl.org/troubleshooting/general-fixes)
* [Issue 390](https://github.com/upscayl/upscayl/issues/390), [custom models](https://github.com/upscayl/custom-models), [Mac App Store](https://apps.apple.com/us/app/upscayl/id6468265473)

This guide is independent. It is not made, checked or paid for by the Upscayl team.

<link rel="stylesheet" href="/blog/assets/media/upscayl-make-a-small-photo-sharp/motion.css"><script defer src="/blog/assets/media/upscayl-make-a-small-photo-sharp/motion.js"></script>
