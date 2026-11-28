// Builds the live munderdiffl.in home page in its Halloween dress (version C, "Full dress", founder's pick 1 Oct 2026).
//   node tools/landing-halloween/build.cjs
// In:  base.html (the plain page, also what shows with the Halloween switch off), halloween.css, halloween.js,
//      cast-halloween.json (the app's own portraits and walk cycles in costume).
// Out: docs/index.html. Edit base.html for copy changes, then rebuild; never edit docs/index.html by hand.
// Every edit is an exact anchor; a missing anchor throws, so a changed base fails loudly.
const fs = require('fs');
const path = require('path');

const SRC = __dirname, OUT = path.resolve(SRC, '../../docs/index.html');
const base = fs.readFileSync(path.join(SRC, 'base.html'), 'utf8');
const css = fs.readFileSync(path.join(SRC, 'halloween.css'), 'utf8');
const js = fs.readFileSync(path.join(SRC, 'halloween.js'), 'utf8');
const cast = JSON.parse(fs.readFileSync(path.join(SRC, 'cast-halloween.json'), 'utf8'));

function must(html, from, to, count = 1) {
  const n = html.split(from).length - 1;
  if (n !== count) throw new Error(`expected ${count} of ${JSON.stringify(from).slice(0, 90)}, found ${n}`);
  return html.split(from).join(to);
}
function cut(html, startMark, endMark) {
  const a = html.indexOf(startMark); if (a < 0) throw new Error('no ' + startMark.slice(0, 60));
  const b = html.indexOf(endMark, a); if (b < 0) throw new Error('no end for ' + startMark.slice(0, 60));
  return html.slice(0, a) + html.slice(b + endMark.length);
}

const PK = '<svg class="hw-pk" viewBox="0 0 48 40" aria-hidden="true"><use href="#hw-pk"/></svg>';
const PKX = '<svg class="hw-pk hw-x" viewBox="0 0 48 40" aria-hidden="true"><use href="#hw-pk"/></svg>';
// The nav switch. It reads the page's own tokens, so it looks right in both dresses.
const SWITCH = '<button type="button" class="hw-toggle" id="hwToggle" role="switch" aria-checked="true" aria-label="Halloween version" title="Halloween version"><span class="hw-tg-ic"><svg viewBox="0 0 48 40" aria-hidden="true"><use href="#hw-pk"/></svg></span><span class="hw-tg-l">Halloween</span><span class="hw-tg-track" aria-hidden="true"><i></i></span></button>';
const BASE_CSS = `.cinema{max-width:864px}
html:not(.hw-on) .hw-x{display:none!important}html.hw-on .hw-n{display:none!important}
.stapler-copy .chip{margin-left:0}
.nav-links{margin-left:auto}
.hero h1.hw-h1{font-weight:900;letter-spacing:-.05em;line-height:.94;font-size:clamp(2.9rem,8.4vw,6.4rem);max-width:none;padding-bottom:.12em}
.hw-h1 .w{display:inline-block;vertical-align:top;padding-bottom:.3em;margin-bottom:-.3em;clip-path:inset(-.5em -.5em 0 -.5em)}
.hw-h1 .w>span{display:inline-block;transform:translateY(105%);transition:transform .9s cubic-bezier(.2,.9,.1,1)}
.hw-h1.in .w>span{transform:none}
html:not(.js-hw) .hw-h1 .w>span{transform:none}
@media (prefers-reduced-motion:reduce){.hw-h1 .w>span{transform:none!important;transition:none}}
.hw-toggle{display:inline-flex;align-items:center;gap:5px;height:30px;padding:0 4px 0 6px;margin-left:12px;border:1px solid var(--line-strong);border-radius:999px;background:var(--card);color:var(--ink);font:500 .78rem var(--mono);cursor:pointer;white-space:nowrap;transition:border-color .2s,background .3s,color .3s}
.hw-toggle:hover{border-color:var(--ink)}
.hw-toggle:focus-visible{outline:3px solid var(--ink);outline-offset:2px}
.hw-tg-ic{display:grid;place-items:center;width:18px;height:16px}
.hw-tg-ic svg{width:18px;height:15px;--pk-shell:#B9AEC8;--pk-stem:#8C8093;--pk-face:#8C8093;transition:transform .35s cubic-bezier(.3,1.6,.5,1)}
.hw-tg-track{position:relative;width:30px;height:18px;border-radius:999px;background:var(--line-strong);transition:background .25s}
.hw-tg-track i{position:absolute;left:2px;top:2px;width:14px;height:14px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);transition:transform .28s cubic-bezier(.3,1.4,.5,1)}
.hw-toggle[aria-checked="true"] .hw-tg-track{background:#F59A3C}
.hw-toggle[aria-checked="true"] .hw-tg-track i{transform:translateX(12px)}
.hw-toggle[aria-checked="true"] .hw-tg-ic svg{--pk-shell:#F59A3C;--pk-stem:#5E7E2E;--pk-face:#5A2C0A;transform:rotate(-8deg) scale(1.08)}
.hw-toggle[aria-checked="true"]:hover .hw-tg-ic svg{--pk-face:#FFE08A}
.hw-on.hw-night .hw-toggle{background:#1E1727;color:#F1E8F7;border-color:#3E3350}
@media (max-width:980px){.hw-toggle{margin-left:auto;margin-right:8px}}
.hw-tg-l{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.brand span{font-size:.92rem;letter-spacing:0}
.nav-links .btn.primary.sm{margin-left:8px}
@media (prefers-reduced-motion:reduce){.hw-tg-track,.hw-tg-track i,.hw-tg-ic svg{transition:none}}
::view-transition-old(root),::view-transition-new(root){animation-duration:.45s}`;
const SPRITE = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
<symbol id="hw-pk" viewBox="0 0 48 40"><path d="M24 6 C24 3, 25.5 1, 28 0.5" stroke="var(--pk-stem,#5E7E2E)" stroke-width="3" stroke-linecap="round" fill="none"/><ellipse cx="13" cy="23" rx="12" ry="15" fill="var(--pk-shell,#F59A3C)"/><ellipse cx="35" cy="23" rx="12" ry="15" fill="var(--pk-shell,#F59A3C)"/><ellipse cx="24" cy="23" rx="13" ry="16.5" fill="var(--pk-shell,#F59A3C)"/><path d="M13 10 C8 16, 8 30, 13 36 M35 10 C40 16, 40 30, 35 36" stroke="rgba(30,18,8,.22)" stroke-width="1.4" fill="none"/><path d="M15 21 L19.5 17 L21 22.5 Z M33 21 L28.5 17 L27 22.5 Z M14 28 C18 33, 30 33, 34 28 C31 29, 29 31.5, 27 29.5 L25.5 31 L24 29.5 L22.5 31 L21 29.5 C19 31.5, 17 29, 14 28 Z" fill="var(--pk-face,#5A2C0A)"/></symbol>
</defs></svg>`;
// a bat drawn as one silhouette in a 100 by 50 box: pointed ears, a round head, a body, and each wing
// with an arched leading edge and a scalloped trailing edge between the finger tips
const WL = 'M47 16 C38 6, 22 2, 3 8 Q12 13, 13 25 Q19 19, 25 28 Q31 21, 36 29 Q41 23, 47 28 Z';
const WR = 'M53 16 C62 6, 78 2, 97 8 Q88 13, 87 25 Q81 19, 75 28 Q69 21, 64 29 Q59 23, 53 28 Z';
const BODY = 'M50 9 C55 9, 56 14, 55 18 C57 24, 55 31, 50 35 C45 31, 43 24, 45 18 C44 14, 45 9, 50 9 Z M45.5 12 L44.5 3 L49 9 Z M54.5 12 L51 9 L55.5 3 Z';
const bat = (cls) => `<div class="hw-bat ${cls}"><div class="hw-fl"><div class="hw-wl"><svg viewBox="0 0 50 50" width="32" height="32"><path d="${WL}" fill="var(--hw-bat)"/></svg></div><div class="hw-wr"><svg viewBox="50 0 50 50" width="32" height="32"><path d="${WR}" fill="var(--hw-bat)"/></svg></div><svg class="bd" viewBox="0 0 100 50" width="64" height="32"><path d="${BODY}" fill="var(--hw-bat)"/><circle cx="48" cy="14.5" r="1.3" fill="#FFB067"/><circle cx="52" cy="14.5" r="1.3" fill="#FFB067"/></svg></div></div>`;

// A string of paper lanterns on a sagging cord: the cord is M0 6 Q500 60 1000 6 in a 60 px tall box.
function lanternString(n, lit) {
  let lans = '';
  for (let i = 0; i < n; i++) {
    const t = 0.07 + (0.86 * i) / (n - 1);
    const y = (1 - t) * (1 - t) * 6 + 2 * t * (1 - t) * 60 + t * t * 6;
    lans += `<i class="hw-lan${i % 2 ? ' m-hide' : ''}" style="left:calc(var(--pad) + ${(t * 100).toFixed(2)}% - ${(t * 2).toFixed(3)} * var(--pad));top:${(y - 1).toFixed(1)}px"><span class="hw-lan-in"><i class="glow"></i>${PK}</span></i>`;
  }
  return `<div class="hw-string hw-x"${lit ? ' data-lit' : ''} aria-hidden="true"><svg class="cord" viewBox="0 0 1000 60" preserveAspectRatio="none"><path d="M0 6 Q500 60 1000 6"/></svg>${lans}</div>\n`;
}

const VERSIONS = [{ cls: 'hw-full' }];

for (const v of VERSIONS) {
  let h = base;

  h = must(h, '--maroon:#B23A4E', '--maroon:#7B4FB0');

  // founder, 1 Oct: they are terminal agents, not coding agents (every mention, the search text included)
  h = must(h, 'coding agents', 'terminal agents', 11);
  h = must(h, 'Coding agents', 'Terminal agents', 1);
  if (/coding agent/i.test(h)) throw new Error('a coding agent is left');
  h = must(h, '<html lang="en">', `<html lang="en" class="${v.cls}">`);

  // the cast in costume, drawn by the app. These rules live in the switchable Halloween sheet, so the
  // page's own plain art is what shows when the season is off, and under the hover when it is on.
  let castCss = '';
  for (const [n, c] of Object.entries(cast)) castCss += `.pt-${n}{background-image:url(${c.portrait})}.pt-${n}.hw-can:hover{background-image:url(${c.portraitPlain})}.sp-${n}{background-image:url(${c.walk})}\n`;
  h = h.replace(/class="pt pt-/g, 'class="pt hw-can pt-');

  // no clock stamps over the chapters and no day strip under the hero (founder, 1 Oct); the corner clock stays
  const stamps = (h.match(/<span class="stamp">[^<]*<\/span>\s*/g) || []).length;
  if (stamps !== 12) throw new Error('expected 12 stamps, found ' + stamps);
  h = h.replace(/<span class="stamp">[^<]*<\/span>\s*/g, '');
  h = cut(h, '<div class="daynote" id="daynote" data-rv>', '</div>\n');

  // the title: only the promise, set heavy
  h = must(h, '<h1>An office of AI employees working 24/7 for you</h1>',
    '<h1 class="hw-h1"><span class="w"><span>Office</span></span> <span class="w"><span>of</span></span> <span class="w ai"><span>AI</span></span> <span class="w"><span>employees</span></span></h1>');

  // pumpkins on the Download buttons
  h = must(h, '<a class="btn primary lg" href="https://harnessmd.com/download">⤓ Download free</a>', `<a class="btn primary lg" href="https://harnessmd.com/download"><span class="hw-n">⤓</span>${PKX} Download free</a>`, 2);
  h = must(h, '<a class="btn primary sm" href="https://harnessmd.com/download">Download</a>', `<a class="btn primary sm" href="https://harnessmd.com/download">${PKX} Download</a>`);

  // the hero screen: the real office after dark, recorded in the app; the launch film one press away
  const vid = h.match(/<video id="launchVideo"[\s\S]*?<\/video>/);
  if (!vid) throw new Error('no launch video');
  h = h.replace(vid[0], `<video id="launchVideo" poster="media/office-halloween-poster.jpg" data-office="media/office-halloween.mp4" data-office-poster="media/office-halloween-poster.jpg" data-film="./media/munder-difflin-053.mp4" data-film-poster="./media/munder-difflin-053-poster.jpg" preload="auto" autoplay playsinline muted loop
               aria-label="The Munder Difflin office after dark, recorded in the app with the Halloween season on: the whole cast in costume at their desks, red wall lamps, pumpkins and cobwebs">
          <source src="media/office-halloween.mp4" type="video/mp4">
        </video>`);
  h = must(h, `<link rel="preload" as="image" href="./media/munder-difflin-053-poster.jpg">`, '<link rel="preload" as="image" href="media/office-halloween-poster.jpg">');
  h = must(h, '<div class="screen" id="screen">', '<div class="screen hw-office" id="screen">');
  h = must(h, '<span class="vl-t">Loading the launch video</span>', '<span class="vl-t">Opening the office</span>');
  h = must(h, '<span>Watch with sound</span><small>0:54</small>', '<span class="hw-x">Watch launch video</span><span class="hw-n">Watch with sound</span><small>0:54</small>');
  h = must(h, '<figcaption>The 0.5.3 launch video. One shotted with Munder Difflin and Opus 5.5.</figcaption>',
    '<figcaption><span class="hw-x">Launching Halloween theme in the office, characters</span><span class="hw-n">The 0.5.3 launch video. One shotted with Munder Difflin and Opus 5.5.</span></figcaption>');

  // no Pro trial on this page: the pricing line, the FAQ answer and its copy in the search data
  // no Pro trial anywhere on the page (founder, 1 Oct)
  if (/trial/i.test(h)) throw new Error('a trial mention is left');
  // the nav name in title case
  h = must(h, '<span>MUNDER&nbsp;DIFFLIN</span></a>', '<span>Munder&nbsp;Difflin</span></a>');

  // three more of the cast walk the hero floor, in costume
  h = must(h, '<i class="walker w5"><i class="sp sp-kevin"></i></i>',
    '<i class="walker w5"><i class="sp sp-kevin"></i></i>\n      <i class="walker w6 hw-x"><i class="sp sp-phyllis"></i></i>\n      <i class="walker w7 hw-x"><i class="sp sp-toby"></i></i>\n      <i class="walker w8 hw-x"><i class="sp sp-meredith"></i></i>');

  // lantern strings between the chapters
  h = must(h, '<section class="chap c1" id="story"', lanternString(7) + '<section class="chap c1" id="story"');
  h = must(h, '<section class="chap c4 band" id="memory"', lanternString(7) + '<section class="chap c4 band" id="memory"');
  h = must(h, '<section class="chap c7" id="security"', lanternString(7) + '<section class="chap c7" id="security"');
  h = must(h, '<section class="chap c9 band" id="pricing"', lanternString(7) + '<section class="chap c9 band" id="pricing"');

  // after hours: stars, the moon, bats across it, a lit pumpkin on every other desk
  h = must(h, '<section class="afterhours" id="download" data-chapter="17:00|Clocking out">',
    '<section class="afterhours" id="download" data-chapter="17:00|Clocking out">\n  <canvas class="hw-stars hw-x" aria-hidden="true"></canvas>\n  ' + lanternString(9, true));
  h = must(h, '<i class="win"></i><i class="win"></i><i class="win"></i><i class="moon"></i>', `<i class="win"></i><i class="win"></i><i class="win"></i><i class="moon"></i>\n      <div class="hw-batlane hw-x">${bat('hw-moonbat b1')}${bat('hw-moonbat b2')}${bat('hw-moonbat b3')}</div>`);
  h = must(h, '<i class="win"></i><i class="win"></i><i class="win"></i><i class="moon"></i>', '<i class="win"></i><i class="win hw-mwin"><i class="hw-moon hw-x"></i></i><i class="win"></i><i class="moon"></i>');
  let k = 0;
  h = h.replace(/<i class="mon"><\/i><i class="tbl"><\/i><\/div>/g, (m) => (k++ % 2 === 0 ? `<i class="mon"></i><i class="tbl"></i><i class="hw-dpk hw-x">${PK}</i></div>` : m));
  if (k !== 8) throw new Error('expected 8 night desks, found ' + k);

  // C: the hero air
  if (v.cls === 'hw-full') {
    h = must(h, '<header class="hero s0" data-chapter="09:00|Clock in">',
      `<header class="hero s0" data-chapter="09:00|Clock in">\n  <canvas class="hw-embers hw-x" aria-hidden="true"></canvas>\n  <div class="hw-fog hw-x" aria-hidden="true"><i></i><i></i></div>\n  <div class="hw-herobats hw-x" aria-hidden="true">${bat('b1')}${bat('b2')}${bat('b3')}</div>`);
  }

  // the switch in the nav: Halloween on or off
  h = must(h, '    <button type="button" class="nav-burger"', `    ${SWITCH}\n    <button type="button" class="nav-burger"`);

  // the layer itself: an always-on sheet, the switchable Halloween sheet, and the stored choice applied before first paint
  h = must(h, '<body>', `<body>\n${SPRITE}`);
  h = must(h, '</head>', `<style id="hw-base">\n${BASE_CSS}\n</style>\n<style id="hw-halloween">\n${css}\n${castCss}</style>\n<script>(function(){var on=true;try{on=localStorage.getItem('mdf_season')!=='none'}catch(e){}if(on)document.documentElement.classList.add('hw-on');else document.getElementById('hw-halloween').disabled=true})();</script>\n</head>`);
  h = must(h, '</body>', `<script>\n${js}\n</script>\n</body>`);

  if (!/googletagmanager/.test(h) || !/posthog/i.test(h)) throw new Error('the site analytics went missing');
  if (/noindex|hw-review/.test(h)) throw new Error('a draft only piece is in the page');
  fs.writeFileSync(OUT, h);
  console.log(path.relative(process.cwd(), OUT), h.length);
}
