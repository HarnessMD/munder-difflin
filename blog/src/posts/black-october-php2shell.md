---
title: "Black October: What PHP2Shell Is and How to Patch (Oct 2026)"
description: "Black October is the scramble around PHP2Shell, two critical PHP flaws fixed on 21 Oct 2026. Who found them, the fixed versions and how to patch."
date: 2026-10-23
category: news
categoryLabel: News
type: Technical
primaryKeyword: "black october php2shell"
secondaryKeywords: ["php2shell", "cve-2026-109618", "cve-2026-109619", "php vulnerability october 2026", "php 8.4.27", "black october cyber"]
tags: ["Security", "Open Source"]
faq:
  - q: "Which PHP version fixes PHP2Shell?"
    a: "PHP 8.5.12, 8.4.27, 8.3.36 and 8.2.35, all released on 21 Oct 2026, according to php.net. PHP 8.1 and older get no release from the PHP project; some distributions and long term support vendors backport the fix."
  - q: "Is my WordPress site affected by PHP2Shell?"
    a: "It can be, because the flaws are in PHP itself, not in WordPress. The WordPress project said on 21 Oct 2026 that no WordPress update is required or planned, and that you can see your PHP version under Tools > Site Health > Info > Server."
  - q: "Did AI find PHP2Shell?"
    a: "AI helped. The PHP Foundation says Calif reported the root cause on 11 Aug 2026, OpenAI reported it independently, and Wiz added attack vectors on 24 Aug. Wiz says frontier models made building the exploit practical. A PHP core developer first spotted signs of the problem in 2024."
  - q: "Is PHP2Shell being exploited?"
    a: "Attempts are widespread. Cloudflare's CEO reported millions of attempts, and AWS saw one as early as 17 Oct 2026. The PHP Foundation told Wired that, to its knowledge, no attempt at remote code execution had succeeded."
  - q: "Why is it called Black October?"
    a: "Axios reported on 22 Oct 2026 that security professionals were calling the recent series of attacks Black October because of their volume and risk. PHP2Shell is the best known item in it, but not the only one."
---

Black October is the name some security people gave this month's run of hacks, bugs and emergency patches, with PHP2Shell at its centre: two critical flaws in PHP itself, CVE-2026-109618 and CVE-2026-109619, fixed on 21 Oct 2026. If you run PHP, update to 8.5.12, 8.4.27, 8.3.36 or 8.2.35. Checked 23 Oct 2026.

Every source below was checked on 23 Oct 2026. We first flagged the story in our [22 Oct brief](/blog/agent-tools-today-2026-10-22/).

## What is Black October?

It is a nickname for a bad few weeks, not one bug. [Axios](https://www.axios.com/2026/10/22/php-vulnerability-security-update-websites) (we read its [Yahoo copy](https://www.yahoo.com/news/world/articles/black-october-why-bugs-discovered-180131955.html)) reported on 22 Oct that cyber pros use the name "due to the sheer volume and the level of risk." [404 Media](https://www.404media.co/php2shell-black-october-ai-is-changing-everything-about-hacking-no-one-knows-what-happens-next/) wrote the same day that infosec experts took it up after PHP2Shell, alongside incidents at GitLab, Plex, Railway and OpenCode. Axios added that many organisations had so far avoided massive real world harm.

<figure class="mg" data-scene="calendar"><img src="/blog/assets/media/black-october-php2shell/calendar.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A white wall calendar shows October 2026. A yellow ring draws itself around the 21st, labelled Fixes released. A tag reading PHP2Shell, 2 CVEs, CVSS 9.2 slides in beside it, and the header of the page changes to read Black October."><figcaption>PHP fixed CVE-2026-109618 and CVE-2026-109619, both rated CVSS 9.2, on 21 Oct 2026 (php.net).</figcaption></figure>

## What is PHP2Shell, in plain words?

PHP2Shell is two memory bugs in the PHP engine that can let an attacker run code on a server without logging in. The [php.net advisory](https://www.php.net/archive/2026.php#2026-10-21-5) explains both. If a request hits PHP's memory limit, or another fatal error, at the wrong moment, PHP can leave half built data or a pointer to freed memory behind. The cleanup step, or the next request on the same worker, then trusts it.

Both rate 9.2 on CVSS v4.0. Because the bug is in PHP, not the app, [Wiz](https://www.wiz.io/blog/php2shell-php-rce) says even a "Hello World" page can be vulnerable; it ran code on the latest WordPress, Drupal and Joomla container images. php.net puts mod_php at highest risk, with PHP-FPM, php-cgi, FrankenPHP and LiteSpeed also exposed.

<figure class="mg" data-scene="conveyor"><img src="/blog/assets/media/black-october-php2shell/conveyor.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. On a white conveyor belt, a tray labelled Request 1 fills until a gauge labelled Memory limit reaches its top and the tray stops. It leaves a yellow sticky note labelled Stale state on the belt. The next tray, labelled Request 2, rolls up and carries the note away as if it were its own."><figcaption>Both PHP2Shell bugs leave bad state behind after a fatal error, which the cleanup step or a later request then trusts, from php.net's advisory of 21 Oct 2026.</figcaption></figure>

## Who found it, and what did AI do?

Several teams, close together. The [PHP Foundation](https://thephp.foundation/blog/2026/10/21/todays-php-security-release-and-how-were-strengthening-php-security/) says a PHP core developer spotted signs of the memory problem in 2024, but no exploit path turned up and the fix stalled. Calif began auditing PHP on 30 Jul 2026 under OpenAI's Patch the Planet program and reported remote code execution on 11 Aug; OpenAI independently reported the same root cause. Wiz added attack vectors on 24 Aug.

Wiz says it used Gemini 4 Argon and GPT-5.6 Sol, and that frontier models made the exploit chain practical. [Calif's write up](https://calif.io/php2shell/) describes its agent tracing the bug through PHP's source. OpenAI, quoted by Axios: "To our knowledge, frontier AI found these vulnerabilities before attackers did." Our view: AI shortened the road from a known weak spot to a working exploit. People had noticed the weak spot two years earlier.

## Which PHP versions are affected and fixed?

Every supported branch got a fix on 21 Oct 2026. Wiz and Cloudflare say the flaws reach back to PHP 5.4. Our selection of rows from the php.net advisory and release notes:

| Branch | Fixed release, 21 Oct 2026 | Note from php.net |
| --- | --- | --- |
| 8.5 | 8.5.12 | |
| 8.4 | 8.4.27 | |
| 8.3 | 8.3.36 | |
| 8.2 | 8.2.35 | End of life 31 Dec 2026 |
| 8.1, 8.0, 7.4 | None | Source backports only; ask your vendor |
| Older | None | Upgrade |

## How did governments and sites respond?

Fast, and often by switching things off. The PHP Foundation says the CVE ids leaked on 20 Oct with a wrong score of 10.0, so the release moved up a day to 21 Oct, 14:00 UTC. It says Chainguard broke the embargo by publishing patched images more than six hours early.

Axios reports the NSA told operators to take sites down if they could not patch in time, and the UK's [NCSC](https://www.ncsc.gov.uk/news/critical-security-issue-affecting-php) gave similar advice. Wikimedia took its Cloud Services offline on 20 Oct as a precaution. 404 Media says 4chan and Archive.org went down briefly too, and Axios counted dozens of sites in the US, UK and elsewhere.

## Is anyone exploiting PHP2Shell?

Attempts, yes. Confirmed breaches, not in any source we read. Cloudflare's CEO Matthew Prince posted, per 404 Media, that Cloudflare saw thousands of attempts in the 10 hours before the announcement, tens of thousands in the 45 minutes after, hundreds of thousands within 2 hours, then millions. [AWS](https://aws.amazon.com/blogs/security/amazon-threat-intelligence-identifies-php2shell-exploitation-prior-to-public-disclosure-in-madpot/) logged a honeypot attempt on 17 Oct, four days early. The PHP Foundation's executive director told [Wired](https://www.wired.com/story/hackers-exploited-the-php-vulnerabilities-days-before-they-were-patched/) there had been "no successful attempt at remote code execution" to its knowledge.

<figure class="mg" data-scene="tally"><img src="/blog/assets/media/black-october-php2shell/tally.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A grey mechanical tally counter on a white desk clicks forward through four labelled stops: 10 hours before, thousands; 45 minutes after, tens of thousands; 2 hours after, hundreds of thousands; later, millions. A yellow tag under it reads Attempts, not confirmed breaches."><figcaption>Exploit attempts Cloudflare saw around disclosure, as its CEO posted and 404 Media reported on 22 Oct 2026.</figcaption></figure>

## Do the public exploits even work?

Many do not, says the loudest dissent. Elias Taylor [wrote on 21 Oct](https://eliastaylor.com/noexploit/) that public proofs of concept "do not work against a vanilla PHP instance", and that many need an existing file inclusion hole. PHP's security team also found no working one at release. Taylor still says patch.

The other side: Wiz and Calif showed their own exploits on stock setups, and Trail of Bits' CEO posted that his firm built one in a day with Codex, 404 Media reported. Our view: a broken script on GitHub is no reason to wait.

## What should you do now?

Update PHP today, then check you were not hit first.

1. Run `php -v` on servers you manage. In WordPress, look under Tools > Site Health > Info > Server, as the [WordPress project](https://wordpress.org/news/2026/10/critical-php-security-release/) says.
2. Update to the fixed release for your branch. php.net says distributions and LTS vendors got the patch early, so check your vendor's packages, then restart PHP.
3. On managed hosting, ask your host. [Cloudflare](https://blog.cloudflare.com/php-vulnerabilities-waf-protection) says updating site code or plugins alone does not fix this; WordPress plans no update.
4. On 8.1 or older, upgrade. WordPress says that if you manage your own hosting, consider taking the server offline until you can; the NCSC says the same for any system you cannot patch or mitigate in time.
5. Cannot patch today? php.net lists interim settings such as `memory_limit=-1` and `session.upload_progress.enabled=0`, which reduce exposure but do not make you safe.
6. Cloudflare's WAF rules have protected free and paid WAF users by default since 03:02 UTC on 21 Oct; paid plans should check the Managed Ruleset is in block mode. Keep them on while you patch, not instead.
7. Look back from at least 17 Oct, as AWS advises. Wiz lists signs: odd multipart requests followed by memory limit errors or repeated HTTP 500s, and malformed PHPSESSID cookies.

<figure class="mg" data-scene="clipboard"><img src="/blog/assets/media/black-october-php2shell/clipboard.png" width="1600" height="1200" loading="lazy" decoding="async" alt="Animation. A white clipboard holds a four line checklist: Run php -v, Update to the fixed release, Keep the WAF on, Check logs from 17 Oct. A green tick lands in each box in turn, and a small yellow note at the bottom reads Plugins alone do not fix it."><figcaption>What php.net, WordPress, Cloudflare and AWS told site owners to do, 21 Oct 2026.</figcaption></figure>

If you look after many servers, agents in a [Munder Difflin](https://harnessmd.com/download) office (free and open source: a desktop app that runs a team of AI agents for all kinds of knowledge work, coding included, on your own computer) can be pointed at keeping that list patched; see our [install guide](/blog/how-to-install-and-use-munder-difflin/). Before giving agents server access, read our [security guide for AI coding agents](/blog/security-for-ai-coding-agents/) and [running AI agents safely](/blog/agent-security-and-sandboxing/).

<link rel="stylesheet" href="/blog/assets/media/black-october-php2shell/motion.css"><script defer src="/blog/assets/media/black-october-php2shell/motion.js"></script>
