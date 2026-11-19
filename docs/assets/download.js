/* One click downloads for munderdiffl.in (founder, 20 Nov 2026).

   On a computer, every Download button fetches the installer for that computer straight away, and the hero's button
   has a menu with every build. Phones are left alone: site.js turns their buttons into Send to my computer.

   WHERE THE FILES COME FROM. The release folder at harnessmd.com/releases holds electron-builder's three channel files,
   one per system, and each names the installer that sits beside it. They allow any origin, so this page reads them
   directly. The installers themselves do not allow a cross origin HEAD, so a channel file is the only way a page on
   another host can tell which files exist. A system whose channel file is missing, or names no installer, is not
   offered. A system whose channel file cannot be read keeps the link to harnessmd.com/download, as do all buttons
   until the files arrive, so the page never names a version or a file of its own.

   Markup it reads:
     a[data-dl]                the visitor's own system
     a[data-os="mac|win|linux"] that system
     [data-dl-split]           the hero's split button: a.dl-main, button.dl-more and .dl-menu inside it */
(function () {
  'use strict';
  var PAGE = 'https://harnessmd.com/download';
  var NOTES = PAGE + '#whats-new';
  var REL = 'https://harnessmd.com/releases/';
  var GUIDE = 'https://munderdiffl.in/blog/how-to-install-and-use-munder-difflin/#how-do-you-download-and-install-munder-difflin';
  // The "downloaded the app" conversion. Same live id as web/harnessmd/src/lib/google-ads.ts (ADS_DOWNLOAD_SEND_TO):
  // visitors who download here never reach harnessmd.com/download, where that page would have reported it.
  var ADS_SEND_TO = 'AW-18388216863/qnM3CI670_kcEJ_Yl8BE';

  // The same test as site.js, so a button's label and its file always agree.
  var ua = navigator.userAgent;
  var isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIOS || /Android/.test(ua)) return;
  var OS = /Win/.test(navigator.platform || ua) ? 'win' : /Linux|X11|CrOS/.test(ua) ? 'linux' : 'mac';

  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var ICON = {
    mac: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.4 12.6c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8-1.6 0-3.1 1-4 2.4-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.2-.8s1.9.8 3.2.8c1.3 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.3-2.8-.1 0-2.6-1-2.6-3.9zM14 5.4c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1 .1 2.1-.6 2.8-1.4z"/></svg>',
    win: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 5.5l7.4-1v7.1H3zm8.3-1.1L21 3v8.6h-9.7zM3 12.5h7.4v7.1L3 18.5zm8.3 0H21V21l-9.7-1.4z"/></svg>',
    linux: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2c-2.2 0-3.4 1.9-3.4 4.4 0 1.6.4 2.7-.6 4.1C6.8 12.1 5 14.6 5 17.3c0 .9.2 1.6.6 2.2-.6.4-1 .9-1 1.5h14.8c0-.6-.4-1.1-1-1.5.4-.6.6-1.3.6-2.2 0-2.7-1.8-5.2-3-6.8-1-1.4-.6-2.5-.6-4.1C15.4 3.9 14.2 2 12 2z"/></svg>'
  };
  var SYS = [
    { os: 'mac', name: 'macOS', sub: 'Universal .dmg, Apple silicon and Intel', channel: 'latest-mac.yml', ext: /-mac-universal\.dmg$/ },
    { os: 'win', name: 'Windows', sub: '64 bit setup .exe', channel: 'latest.yml', ext: /-win-x64-setup\.exe$/ },
    { os: 'linux', name: 'Linux', sub: 'x86_64 .AppImage', channel: 'latest-linux.yml', ext: /-linux-x86_64\.AppImage$/ }
  ];

  /* ---------- the release folder ---------- */
  // A channel file lists its files as "- url: <name>" with a "size:" line under each. Only names of plain characters
  // are taken, so nothing in the file can turn into anything but a link into the release folder.
  function parse(yaml, ext) {
    var v = /^version:\s*['"]?([0-9][\w.-]*)/m.exec(yaml);
    if (!v) return null;
    var parts = yaml.split(/^\s*-\s*url:\s*/m).slice(1);
    for (var i = 0; i < parts.length; i++) {
      var name = /^['"]?([\w.-]+)/.exec(parts[i]);
      if (!name || !ext.test(name[1])) continue;
      var size = /^\s*size:\s*(\d+)/m.exec(parts[i]);
      return { version: v[1], file: name[1], url: REL + name[1], size: size ? +size[1] : 0 };
    }
    return null;
  }
  // 'ok' with the build, 'none' when the folder has no installer for that system, 'err' when it could not be read.
  function read(s) {
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 6000);
    return fetch(REL + s.channel, { credentials: 'omit', signal: ctl ? ctl.signal : undefined })
      .then(function (r) {
        if (r.status === 404) return { state: 'none' };
        if (!r.ok) return { state: 'err' };
        return r.text().then(function (y) { var b = parse(y, s.ext); return b ? { state: 'ok', build: b } : { state: 'none' }; });
      })
      .catch(function () { return { state: 'err' }; })
      .then(function (x) { clearTimeout(timer); return x; });
  }

  // A button's system, always one of SYS's own names: the attribute only picks among them, so nothing read off the
  // page is ever written back into it.
  function osOf(a) {
    var want = a.getAttribute('data-os') || OS;
    for (var i = 0; i < SYS.length; i++) if (SYS[i].os === want) return SYS[i].os;
    return null;
  }

  var builds = null, missing = {};
  var ready = Promise.all(SYS.map(read)).then(function (res) {
    builds = {};
    res.forEach(function (x, i) { if (x.state === 'ok') builds[SYS[i].os] = x.build; else if (x.state === 'none') missing[SYS[i].os] = 1; });
    $$('a[data-dl], a[data-os]').forEach(point);
    return builds;
  });
  function point(a) {
    var os = osOf(a), b = os && builds[os];
    if (!os) return;
    if (b) a.href = b.url;
    else if (missing[os] && a.hasAttribute('data-os')) a.hidden = true;
  }

  /* ---------- the click ---------- */
  function conversion() {
    if (navigator.doNotTrack === '1' || typeof window.gtag !== 'function') return;
    try { window.gtag('event', 'conversion', { send_to: ADS_SEND_TO }); } catch (e) { /* never let a measurement stop a download */ }
  }
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[data-dl], a[data-os]') : null;
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var os = osOf(a);
    if (!os) return;
    if (builds === null) {
      // Clicked before the release folder answered: wait for it rather than send them to another page.
      e.preventDefault();
      ready.then(function () {
        var b = builds[os];
        if (!b) { location.href = PAGE; return; }
        conversion(); note(b, os); location.href = b.url;
      });
      return;
    }
    var b = builds[os];
    if (b && a.href === b.url) { conversion(); note(b, os); } // the browser follows the link, and the file downloads
  });

  /* ---------- after the click: how to install it ---------- */
  function mb(n) { return n ? Math.round(n / 1e6) + ' MB' : ''; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function steps(b, os) {
    if (os === 'mac') return [
      'Open the .dmg from your Downloads folder.',
      'Drag Munder Difflin into Applications, then open it from there.',
      'If macOS will not open it, go to System Settings, then Privacy &amp; Security, and press Open Anyway.'
    ];
    if (os === 'win') return [
      'Open the setup .exe from your Downloads folder.',
      'It installs for your user only. Keep the folder it offers or pick another.',
      'When it finishes, open Munder Difflin from the Start menu.'
    ];
    return [
      'Make it executable. In a terminal, in the folder you saved it to:<code class="b">chmod +x ' + esc(b.file) + '</code>',
      'Run it:<code class="b">./' + esc(b.file) + '</code>'
    ];
  }
  var box = null;
  function closeNote() { if (box) { box.remove(); box = null; } }
  function note(b, os) {
    closeNote();
    box = document.createElement('aside');
    box.className = 'mddl-note';
    box.setAttribute('aria-labelledby', 'mddlT');
    box.innerHTML =
      '<button type="button" class="mddl-x" aria-label="Close"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg></button>' +
      '<p class="mddl-t" id="mddlT" role="status">Your download has started</p>' +
      '<p class="mddl-f">' + ICON[os] + '<span>Munder Difflin ' + esc(b.version) + ' for ' + esc(SYS.filter(function (s) { return s.os === os; })[0].name) + (b.size ? ', ' + mb(b.size) : '') + '</span></p>' +
      '<ol class="mddl-s">' + steps(b, os).map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ol>' +
      '<p class="mddl-l"><a href="' + GUIDE + '" target="_blank" rel="noopener">Full install guide</a><a href="' + esc(b.url) + '" data-os="' + os + '">Did not start? Download again</a></p>';
    box.querySelector('.mddl-x').addEventListener('click', closeNote);
    document.body.appendChild(box);
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && box && !menuOpen()) closeNote(); });

  /* ---------- the hero's split button ---------- */
  var split = document.querySelector('[data-dl-split]');
  var more = split && split.querySelector('.dl-more'), menu = split && split.querySelector('.dl-menu');
  function menuOpen() { return !!(menu && !menu.hidden); }
  function fill() {
    if (builds === null) { menu.innerHTML = '<p class="dl-wait">Reading the release folder…</p>'; ready.then(function () { if (menuOpen()) fill(); }); return; }
    var rows = SYS.filter(function (s) { return builds[s.os]; }).map(function (s) {
      var b = builds[s.os];
      return '<a href="' + esc(b.url) + '" data-os="' + s.os + '"><span class="dl-ic">' + ICON[s.os] + '</span><span class="dl-tx"><b>' + s.name + (s.os === OS ? '<i class="dl-you">This computer</i>' : '') + '</b><small>' + s.sub + '</small></span><span class="dl-sz">' + mb(b.size) + '</span></a>';
    }).join('');
    var v = SYS.map(function (s) { return builds[s.os] && builds[s.os].version; }).filter(Boolean)[0];
    menu.innerHTML = (rows || '<a href="' + PAGE + '"><span class="dl-tx"><b>Open the download page</b><small>The release folder did not answer just now</small></span></a>') +
      '<hr><div class="dl-more-links"><a href="' + GUIDE + '" target="_blank" rel="noopener">How to install</a><a href="' + (v ? NOTES : PAGE) + '">' + (v ? 'What is new in ' + esc(v) : 'Release notes') + '</a></div>';
  }
  function toggle(on) {
    menu.hidden = !on;
    more.setAttribute('aria-expanded', on ? 'true' : 'false');
    split.classList.toggle('open', on);
    if (on) fill();
  }
  if (split && more && menu) {
    more.hidden = false;
    split.classList.add('on');
    more.addEventListener('click', function () { toggle(!menuOpen()); });
    document.addEventListener('click', function (e) { if (menuOpen() && !split.contains(e.target)) toggle(false); });
    menu.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('a')) setTimeout(function () { toggle(false); }, 0); });
    document.addEventListener('keydown', function (e) {
      if (!menuOpen()) return;
      if (e.key === 'Escape') { toggle(false); more.focus(); return; }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      var links = $$('a', menu), i = links.indexOf(document.activeElement);
      if (!links.length) return;
      e.preventDefault();
      i = e.key === 'ArrowDown' ? (i + 1) % links.length : (i <= 0 ? links.length - 1 : i - 1);
      links[i].focus();
    });
  }
})();
