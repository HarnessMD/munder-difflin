// Assembles the 0.5.3 story landing from the live page (main-index.html) plus body.html, story.css, story.js and the cast sprites.
const fs = require('fs');
const path = require('path');
const H = __dirname;
const rd = (f) => fs.readFileSync(path.join(H, f), 'utf8');
const L = rd('main-index.html').split('\n');
const raw = (a, b) => L.slice(a - 1, b).join('\n');
const cast = JSON.parse(rd('cast.json'));
const out = process.argv[2];

const castCss = Object.entries(cast).map(([n, c]) => `.sp-${n}{background-image:url(${c.walk})}.pt-${n}{background-image:url(${c.portrait})}`).join('\n');
const pt = (n) => `<i class="pt pt-${n}"></i>`;

// twelve provider tiles from the live page, one clone behind each
const provs = raw(418, 429).split('\n').map((l) => l.trim().replace(/^<div class="clp">/, '').replace(/<\/div>$/, ''));
const who = ['michael', 'dwight', 'jim', 'pam', 'angela', 'oscar', 'kevin', 'creed', 'stanley', 'andy', 'kelly', 'ryan'];
const bubbles = ['on it', 'tests green', 'PR open', 'reviewing'];
const desks = provs.map((p, i) => `<div class="desk" style="--d:${i}"><div class="who" style="transition-delay:${(i * 0.08).toFixed(2)}s">${pt(who[i])}${i % 3 === 0 ? `<span class="bub">${bubbles[(i / 3) | 0]}</span>` : ''}</div><div class="top">${p}</div></div>`).join('\n      ');

const roster = [
  ['michael', 'Michael', 'Orchestrator · Claude Code', 'Planning the signup release'],
  ['angela', 'Angela', 'Codex', 'acm-3 Test a duplicate email'],
  ['oscar', 'Oscar', 'Gemini CLI', 'acm-4 Review the signup branches'],
  ['creed', 'Creed', 'Cursor', 'acm-5 Update the README'],
  ['kevin', 'Kevin', 'Copilot', 'acm-2 Accept 8 character passwords'],
  ['dwight', 'Dwight', 'Grok', 'acm-1 Match emails case insensitively'],
].map(([n, name, eng, task]) => `<div class="row">${pt(n)}<div><b>${name}</b><small>${eng}</small><small>${task}</small></div><span class="st">working</span></div>`).join('\n      ');

const whoCards = [['angela', 'Angela', 'wrote the tests'], ['oscar', 'Oscar', 'reviewed the fix'], ['creed', 'Creed', 'updated the README']]
  .map(([n, a, b]) => `<div class="who">${pt(n)}<div>${a}<small>${b}</small></div></div>`).join('');

const floor = ['michael', 'jim', 'pam', 'dwight', 'angela', 'kevin'].map((n) => `<div class="deskp">${pt(n)}<i class="tbl"></i></div>`).join('');
const rail = `<div class="rail"><div class="ri sel">${pt('michael')}Michael<small>working</small></div><div class="ri">${pt('angela')}Angela<small>working</small></div><div class="ri">${pt('oscar')}Oscar</div><div class="ri">${pt('kevin')}Kevin<small>working</small></div><div class="ri">${pt('dwight')}Dwight</div></div><div class="pane2"><span><b>michael</b> › ship the signup fix</span><span>→ acm-1 to Dwight</span><span>→ acm-3 to Angela</span><span>✓ acm-4 reviewed by Oscar</span><span class="blobf"></span></div>`;
// the floors building: each floor is its own office on its own folder, stacked, with an empty one on top for New Floor
const storey = (n, dir, crew, st) => `<div class="storey s${n}"><div class="sy-h"><b>Floor ${n}</b><span>${dir}</span><em>${st}</em></div><div class="sy-d">${crew.map((c) => `<div class="sy-p">${pt(c)}<i class="tbl"></i></div>`).join('')}</div></div>`;
const tower = `<div class="storey snew"><span>New Floor</span><span class="kbd">⇧ ⌘ N</span></div>` +
  storey(2, '~/side/app', ['michael', 'dwight', 'angela', 'oscar'], '4 working') +
  storey(1, '~/work/client', ['michael', 'jim', 'pam', 'kevin', 'creed'], '5 working') +
  `<div class="lobby"><span>One licence · one machine</span></div>`;
const nightRow =['jim', 'pam', 'dwight', 'michael', 'angela', 'oscar', 'kevin', 'creed'].map((n) => `<div class="nd">${pt(n)}<i class="mon"></i><i class="tbl"></i></div>`).join('');


// the local machine: a laptop with the office on its screen, your subscriptions on the left, your tools on the right,
// packets moving along the wires (SVG animateMotion, no script). Drawn once, nothing rotates.
const node = (x, y, label, side, i) => {
  const wx = side === 'l' ? x + 150 : x, wy = y + 22;
  const tx = side === 'l' ? 214 : 426, ty = 196 + (i - 1.5) * 16;
  const c1 = side === 'l' ? wx + 40 : wx - 40, c2 = side === 'l' ? tx - 40 : tx + 40;
  const d = `M${wx} ${wy}C${c1} ${wy} ${c2} ${ty} ${tx} ${ty}`;
  const pid = `w${side}${i}`, dur = (2.2 + i * 0.35).toFixed(2), beg = (i * 0.6).toFixed(1);
  const dir = side === 'l' ? 'keyPoints="1;0" keyTimes="0;1" calcMode="linear"' : '';
  return `<path id="${pid}" class="wire-l" d="${d}"/>` +
    `<g class="nd-${side}" style="--i:${i}"><rect x="${x}" y="${y}" width="150" height="44" rx="12" class="nbox"/>` +
    `<circle cx="${x + 22}" cy="${y + 22}" r="6" class="ndot"/><text x="${x + 38}" y="${y + 27}" class="nlab">${label}</text></g>` +
    `<circle r="4.5" class="pk"><animateMotion dur="${dur}s" begin="${beg}s" repeatCount="indefinite" ${dir}><mpath href="#${pid}"/></animateMotion></circle>`;
};
const subs = ['Claude Code', 'Codex', 'Gemini CLI', 'Copilot'].map((l, i) => node(8, 70 + i * 74, l, 'l', i)).join('');
const tools = ['GitHub', 'Linear', 'Telegram', 'Webhooks'].map((l, i) => node(482, 70 + i * 74, l, 'r', i)).join('');
const cam = (n, x) => `<image href="${cast[n].portrait}" x="${x}" y="158" width="27" height="42" class="pix"/><rect x="${x - 6}" y="196" width="39" height="8" rx="2" class="mdesk"/>`;
const machineSvg = `<svg viewBox="0 0 640 420" role="img" aria-label="Munder Difflin on your laptop, driving Claude Code, Codex, Gemini CLI and Copilot, woken by GitHub, Linear, Telegram and webhooks">
<text x="83" y="50" class="colh" text-anchor="middle">YOUR SUBSCRIPTIONS</text><text x="557" y="50" class="colh" text-anchor="middle">YOUR TOOLS</text>
${subs}${tools}
<rect x="206" y="118" width="228" height="150" rx="16" class="glow"/>
<rect x="214" y="126" width="212" height="136" rx="10" class="scr"/>
<rect x="214" y="126" width="212" height="18" rx="10" class="bar"/><circle cx="226" cy="135" r="3" class="d1"/><circle cx="236" cy="135" r="3" class="d2"/><circle cx="246" cy="135" r="3" class="d3"/>
<rect x="222" y="150" width="196" height="104" rx="6" class="flr"/>
${cam('michael', 240)}${cam('pam', 306)}${cam('dwight', 372)}
<g class="bub"><rect x="268" y="152" width="44" height="14" rx="7"/><text x="290" y="162" text-anchor="middle">on it</text></g>
<rect x="232" y="214" width="176" height="30" rx="5" class="term"/><text x="240" y="226" class="tline"><tspan class="acc">claude</tspan> › ship the signup fix</text><text x="240" y="238" class="tline dim">✓ acm-4 reviewed by Oscar</text>
<path d="M184 268H456L474 290H166Z" class="base"/><rect x="290" y="268" width="60" height="6" rx="3" class="notch"/>
<g class="lock"><rect x="236" y="318" width="168" height="32" rx="16"/><path d="M255 334v-3a5 5 0 0 1 10 0v3" class="shk"/><rect x="252" y="333" width="16" height="11" rx="2" class="body"/><text x="276" y="339">keys stay here</text></g>
<text x="320" y="306" class="mlab" text-anchor="middle">YOUR MACHINE</text>
</svg>`;

const faq = [
  ['What is Munder Difflin?', 'A free and open source multi agent harness for macOS, Windows and Linux. It runs Claude Code, Codex, Gemini CLI, Copilot, Cursor and seven more coding agents as one team of clones on your own machine, on the subscriptions you already pay for.'],
  ['Does it work with my Claude Code subscription?', 'Yes. Munder Difflin drives the Claude Code CLI you already use, so your plan and its hourly limits do the work. The same goes for Codex, Gemini CLI and the other providers.'],
  ['Which coding agents does it support?', 'Twelve: Claude Code, Codex, Grok, Kimi Code, Antigravity, Qwen, Gemini CLI, OpenCode, Crush, Pi, Copilot and Cursor. New models show up in the pickers without a new version.'],
  ['Can I run agents on more than one project at once?', 'Yes. Each project gets its own floor: File, New Floor opens a second office in its own window, on its own folder, with its own agents, board and memory. Floors run side by side, one folder only ever opens in one floor, and one licence covers every floor on your machine.'],
  ['Does my code ever leave my laptop?', 'No. Your node runs on your machine. Code, keys and personal context stay there. The only thing that travels is clone to clone messages, sealed on your machine and opened only on your teammate\'s.'],
  ['Can the Stapler replace Granola and Wispr Flow?', 'That is what it is built for. It takes dictation in any app and writes down your meetings, both sides of the call, with transcription running on your machine. Then it hands the text to your agents.'],
  ['Is the Stapler free?', 'The Stapler is part of Pro. Dictation in the Munder Difflin message box works in the free version too.'],
  ['What does it cost?', 'Free is free, forever. Pro is $150 for 365 days with the launch offer, down from $200, or $20 for 30 days. The 365 day price is adjusted for purchasing power in different countries and can be as low as $100. Teams is priced with you on a call.'],
  ['How do I get Teams?', 'On a call. Teams is set up with us, one team at a time. Book a thirty minute slot, and on the call we size the team with you, make the organisation and hand you the invite codes.'],
  ['Does my laptop need to stay on?', 'Yes. The clone runs on your machine and stops when the machine does. Sandboxes on machines we host, so a job keeps running after the lid closes, are coming.'],
];
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const faqHtml = faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('\n      ');

const ld = [
  { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Munder Difflin', applicationCategory: 'DeveloperApplication', operatingSystem: 'macOS, Windows, Linux', softwareVersion: '0.5.5', url: 'https://munderdiffl.in/', downloadUrl: 'https://harnessmd.com/download', license: 'https://github.com/chaitanyagiri/munder-difflin/blob/main/LICENSE', description: 'Free and open source multi agent harness that runs Claude Code, Codex, Gemini CLI and nine more coding agents as an office of clones on your own machine.', offers: [{ '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'USD' }, { '@type': 'Offer', name: 'Pro, annual', price: '150', priceCurrency: 'USD' }] },
  { '@context': 'https://schema.org', '@type': 'VideoObject', name: 'Munder Difflin 0.5.3 launch video', description: 'An office of coding agents that coordinate on their own, a memory layer, local first, and the Stapler for dictation and meetings.', thumbnailUrl: 'https://munderdiffl.in/media/munder-difflin-053-poster.jpg', contentUrl: 'https://munderdiffl.in/media/munder-difflin-053.mp4', uploadDate: '2026-09-25', duration: 'PT54S' },
  { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
];

const TITLE = 'Munder Difflin · Multi agent harness for Claude Code, Codex and ten more';
const DESC = 'Free and open source multi agent harness. Run Claude Code, Codex, Gemini CLI and nine more coding agents as an office of clones on your own machine, on the subscriptions you already pay for. Now with the Stapler for local dictation and meeting notes.';
const head = `<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${TITLE}</title>
<meta name="description" content="${DESC}">
<link rel="canonical" href="https://munderdiffl.in/">
<meta property="og:type" content="website">
<meta property="og:title" content="${TITLE}">
<meta property="og:description" content="${DESC}">
<meta property="og:image" content="https://munderdiffl.in/media/og.png">
<meta property="og:url" content="https://munderdiffl.in/">
<meta property="og:video" content="https://munderdiffl.in/media/munder-difflin-053.mp4">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${TITLE}">
<meta name="twitter:description" content="${DESC}">
<link rel="preload" as="image" href="./media/munder-difflin-053-poster.jpg">
${ld.map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n')}
${L[28]}
<!--
  Munder Difflin landing page, 0.5.3 story cut, 25 Sep 2026 (Pam). One file, opens with file://, no server, no build step.
  The page is one workday: a clock runs from 08:59 to 18:00 as you scroll, each chapter is one core feature, the page goes dark after hours.
  Built by the scratchpad build.cjs from the previous page: fonts, tokens, blobatar and the interactive Stapler are carried over verbatim.
  Media: ./media/munder-difflin-053.mp4 (the launch video, remuxed with faststart so it streams) and ./media/munder-difflin-053-poster.jpg.
  The two old loops (hero-demo.mp4 and pro-stapler.gif) are no longer used here. The pixel cast is the app's own portraitArt.ts, rendered to PNG.
-->`;

let body = rd('body.html')
  .replace(/\{\{RAW:(\d+),(\d+)\}\}/g, (_, a, b) => raw(+a, +b))
  .replace('{{DESKS}}', desks).replace('{{ROSTER}}', roster).replace('{{WHO}}', whoCards)
  .replace('{{FLOOR}}', floor).replace('{{RAIL}}', rail).replace('{{NIGHT}}', nightRow).replace('{{MACHINE}}', machineSvg).replace('{{FAQ}}', faqHtml).replace('{{TOWER}}', tower);
if (/\{\{/.test(body)) throw new Error('unfilled slot');

const html = [
  raw(1, 17), '', head, raw(46, 320),
  castCss, rd('story.css'), '</style>', '</head>', '<body>',
  raw(324, 351), '', body, '', raw(736, 757), '',
  raw(759, 1034).replace("var STAPLER_COLOR = '#B3D4F0';", "var STAPLER_COLOR = '#FFCA54';"), rd('story.js'), raw(1035, L.length),
].join('\n');

// house style on the words a visitor reads (comments and data excluded)
const visible = body.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ');
if (/[–—]/.test(visible)) throw new Error('a dash in the copy');
fs.writeFileSync(out, html);
console.log('wrote', out, (Buffer.byteLength(html) / 1024).toFixed(1) + ' KB');
