---
title: "Top 10 Indian open source projects that are giving US big tech a tough time"
seoTitle: "Top 10 Indian Open Source AI Projects Taking On Big Tech"
description: "Ten open source AI projects from Indian developers, each lined up against the big tech product it takes on. Laya vs Jev, Munder Difflin vs Muse and Grok Bot."
date: 2026-09-25
featured: true
category: comparisons
categoryLabel: Comparisons
type: Non-technical
primaryKeyword: "indian open source ai projects"
secondaryKeywords: ["open source ai india", "indian github projects", "laya vs jev", "munder difflin", "open source alternatives to big tech ai"]
tags: ["Comparisons", "Open Source", "India", "AI Agents"]
ogImage: "https://munderdiffl.in/blog/assets/media/indian-open-source-ai-projects-vs-big-tech/hero.png"
author:
  name: Chaitanya Giri
  initials: CG
faq:
  - q: "Which Indian open source AI project has the most GitHub stars?"
    a: "Of the ten on this list, Mem0 had the most on 25 September 2026, at about 65.9k stars. Plane was next at about 59.8k."
  - q: "What is Laya?"
    a: "Laya is an open weight decision model from Convai Innovations in Kasaragod, Kerala. It answers typed questions with a choice, a score or a yes or no probability instead of generating text, and it can serve the same API as TypeSafe's hosted Jev model. It is released under Apache 2.0."
  - q: "Is Munder Difflin free?"
    a: "Yes. Munder Difflin is free and open source. It runs an office of AI agents on your own computer using an AI engine you already have, such as a Claude Code or Codex subscription."
  - q: "How were these projects picked?"
    a: "Open source on GitHub, AI at the core of the product, started by Indian founders or developers, and a clear big tech product on the other side. Star counts come from the GitHub API on 25 September 2026."
---

<div class="ind10">

<style>
/* the static hero is for cards and link previews; on the page the animated one leads */
article .hero-wrap{display:none}
.ind10 .stage{margin:1.4rem 0 1rem;border:1px solid var(--line,#D9CFE0);border-radius:16px;overflow:hidden;background:#FFF8E7}
.ind10 .stage svg{display:block;width:100%;height:auto}
.ind10 svg g[class],.ind10 svg path[class],.ind10 svg circle[class],.ind10 svg rect[class]{transform-box:fill-box;transform-origin:center}
.ind10 .lbl{font:600 15px "Space Grotesk",system-ui,sans-serif;fill:#1A1320}
.ind10 .big{font:700 22px "Space Grotesk",system-ui,sans-serif;fill:#1A1320}
.ind10 .chips{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 1.2rem;padding:0;list-style:none}
.ind10 .chips li::before,.ind10 .chips li::marker{content:none;display:none}
.ind10 .chips li{font:600 13px/1 "Space Grotesk",system-ui,sans-serif;padding:7px 12px;border:1px solid #1A1320;border-radius:999px;background:#FCFAF0;margin:0}
.ind10 .chips li.star{background:#FFCA54}
.ind10 .chips li.who{padding:0;background:#FFF8E7}
.ind10 .chips li.who a{display:inline-flex;align-items:center;gap:7px;padding:4px 12px 4px 4px;color:#1A1320;text-decoration:none;border-radius:999px}
.ind10 .chips li.who a:hover{background:#FFCA54}
.ind10 .chips li.who img{width:22px;height:22px;border-radius:50%;border:1px solid #1A1320;margin:0;display:block}
.ind10 .vs{font:600 13px "Space Grotesk",system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-faint,#6B5878);margin:-.4rem 0 0}
@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
@keyframes blink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
@keyframes sway{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(2deg)}}
@keyframes swing{0%,100%{transform:rotate(-7deg)}50%{transform:rotate(7deg)}}
@keyframes heave{0%,100%{transform:translateX(0) rotate(0)}50%{transform:translateX(-6px) rotate(-4deg)}}
@keyframes tug{0%,100%{transform:translateX(0)}50%{transform:translateX(-10px)}}
@keyframes dragged{0%,100%{transform:translateX(0)}50%{transform:translateX(-14px)}}
@keyframes strain{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(-9deg)}}
@keyframes drip{0%{transform:translateY(0);opacity:0}15%{opacity:1}100%{transform:translateY(40px);opacity:0}}
@keyframes flap{0%,100%{transform:skewY(0)}50%{transform:skewY(12deg)}}
@keyframes drift{from{transform:translateX(0)}to{transform:translateX(-60px)}}
@keyframes puff{0%{opacity:0;transform:scale(.4)}40%{opacity:.9}100%{opacity:0;transform:scale(1.4) translateX(20px)}}
@keyframes cardin{from{transform:translateX(0)}to{transform:translateX(-360px)}}
@keyframes stomp{0%,70%,100%{transform:translateY(0) scaleY(1)}80%{transform:translateY(4px) scaleY(.9)}}
@keyframes popup{0%{opacity:0;transform:translateY(20px) scale(.6)}15%{opacity:1;transform:translateY(0) scale(1)}70%{opacity:1}100%{opacity:0;transform:translateY(-24px)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes dropin{0%{opacity:0;transform:translate(0,-30px)}20%{opacity:1;transform:translate(0,0)}70%{opacity:1;transform:translate(80px,60px) scale(.5)}85%,100%{opacity:0;transform:translate(80px,80px) scale(.3)}}
@keyframes fill{0%,100%{transform:scaleY(.5);transform-origin:bottom}50%{transform:scaleY(1)}}
@keyframes flow{to{stroke-dashoffset:-22}}
@keyframes type{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
@keyframes screen{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes n1{0%,15%{transform:translate(0,0)}45%,60%{transform:translate(110px,0)}90%,100%{transform:translate(220px,0);opacity:0}}
@keyframes n2{0%,40%{transform:translate(0,0)}75%,100%{transform:translate(110px,-36px)}}
@keyframes pplane{0%{transform:translate(120px,168px) rotate(-10deg);opacity:0}10%{opacity:1}100%{transform:translate(360px,40px) rotate(-10deg);opacity:0}}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
@keyframes loop{0%{transform:translate(80px,150px) rotate(-8deg)}25%{transform:translate(260px,80px) rotate(8deg)}50%{transform:translate(420px,150px) rotate(18deg)}75%{transform:translate(260px,200px) rotate(-170deg)}100%{transform:translate(80px,150px) rotate(-8deg)}}
@keyframes wobble{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg)}}
@keyframes snap{0%,10%{opacity:0;transform:translateY(-60px)}25%{opacity:1;transform:translateY(6px)}30%,85%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(0)}}
@keyframes coin{0%{transform:translate(620px,40px) rotate(0);opacity:0}10%{opacity:1}60%{transform:translate(470px,120px) rotate(-360deg);opacity:1}75%,100%{transform:translate(460px,150px) rotate(-360deg);opacity:0}}
@keyframes sweep{0%,100%{transform:translateX(0)}50%{transform:translateX(270px)}}
@keyframes spark{0%,40%{transform:scale(0) rotate(0)}55%{transform:scale(1.2) rotate(45deg)}75%,100%{transform:scale(0) rotate(90deg)}}
@keyframes msg{0%{opacity:0;transform:translateX(-20px)}12%{opacity:1;transform:translateX(0)}80%{opacity:1}100%{opacity:0}}
@keyframes beat{from{stroke-dashoffset:0}to{stroke-dashoffset:-420}}
@keyframes led{0%,100%{opacity:1}50%{opacity:.2}}
@keyframes unroll{0%{transform:scaleY(.15);transform-origin:top}80%,100%{transform:scaleY(1);transform-origin:top}}
@keyframes cape{0%,100%{transform:skewX(0) scaleX(1)}50%{transform:skewX(-10deg) scaleX(1.1)}}
@keyframes fly0{0%{transform:translate(620px,40px);opacity:0}10%{opacity:1}80%{transform:translate(310px,180px) scale(.4);opacity:1}100%{transform:translate(300px,190px) scale(.2);opacity:0}}
@keyframes fly1{0%{transform:translate(40px,50px);opacity:0}10%{opacity:1}80%{transform:translate(290px,180px) scale(.4);opacity:1}100%{transform:translate(300px,190px) scale(.2);opacity:0}}
@keyframes arm{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(2deg)}}
@keyframes plug{0%,20%,100%{fill:#FCFAF0}8%{fill:#FFCA54}}
.ind10 .bob{animation:bob 2.4s ease-in-out infinite}
.ind10 .blink{animation:blink 3.6s infinite}
.ind10 .sway{animation:sway 3s ease-in-out infinite}
.ind10 .swing{animation:swing 2.6s ease-in-out infinite;transform-origin:top center}
.ind10 .heave{animation:heave 1.1s ease-in-out infinite}
.ind10 .tug{animation:tug 2.2s ease-in-out infinite}
.ind10 .dragged{animation:dragged 2.2s ease-in-out infinite}
.ind10 .strain{animation:strain 1.1s ease-in-out infinite}
.ind10 .drip{animation:drip 1.8s ease-in infinite}
.ind10 .flap{animation:flap .6s ease-in-out infinite;transform-origin:left center}
.ind10 .clouds{animation:drift 14s linear infinite alternate}
.ind10 .dust circle{animation:puff 1.1s ease-out infinite}
.ind10 .card-in{animation:cardin 4s linear infinite}
.ind10 .stomp{animation:stomp 1s ease-in-out infinite;transform-origin:bottom center}
.ind10 .popup{animation:popup 3s ease-out infinite;opacity:0}
.ind10 .spinfast{animation:spin .8s linear infinite;transform-origin:bottom center}
.ind10 .spinslow{animation:spin 2.8s linear infinite}
.ind10 .drop{animation:dropin 4.2s ease-in-out infinite;opacity:0}
.ind10 .fill{animation:fill 4.2s ease-in-out infinite;transform-origin:bottom center}
.ind10 .flow{animation:flow .9s linear infinite}
.ind10 .type{animation:type .35s ease-in-out infinite}
.ind10 .screen{animation:screen .7s steps(2) infinite}
.ind10 .n1{animation:n1 5s ease-in-out infinite}
.ind10 .n2{animation:n2 5s ease-in-out infinite}
.ind10 .plane-p{animation:pplane 3.2s ease-in infinite}
.ind10 .pulse{animation:pulse 1.6s ease-in-out infinite}
.ind10 .loop{animation:loop 7s ease-in-out infinite}
.ind10 .wobble{animation:wobble 1.4s ease-in-out infinite;transform-origin:bottom center}
.ind10 .snap{animation:snap 5s ease-out infinite;opacity:0}
.ind10 .s2{animation-delay:.5s}.ind10 .s3{animation-delay:1s}
.ind10 .coin{animation:coin 5s ease-in-out infinite}
.ind10 .sweep{animation:sweep 5s ease-in-out infinite}
.ind10 .spark{animation:spark 2.5s ease-out infinite}
.ind10 .msg,.ind10 .reply{animation:msg 3.6s ease-out infinite;opacity:0}
.ind10 .beat{stroke-dasharray:210 210;animation:beat 2s linear infinite}
.ind10 .led{animation:led 1s steps(2) infinite}
.ind10 .unroll{animation:unroll 4s ease-in-out infinite alternate}
.ind10 .cape{animation:cape .8s ease-in-out infinite;transform-origin:right center}
.ind10 .fly{opacity:0}
.ind10 .f0{animation:fly0 3.2s ease-in infinite}
.ind10 .f1{animation:fly1 3.2s ease-in infinite .8s}
.ind10 .f2{animation:fly0 3.2s ease-in infinite 1.6s}
.ind10 .f3{animation:fly1 3.2s ease-in infinite 2.4s}
.ind10 .arm{animation:arm 2s ease-in-out infinite;transform-origin:center}
.ind10 .plug{animation:plug 2.8s linear infinite}
@media (prefers-reduced-motion:reduce){.ind10 .stage *{animation:none!important}.ind10 .popup,.ind10 .drop,.ind10 .snap,.ind10 .msg,.ind10 .reply,.ind10 .fly{opacity:1}}
</style>

<figure class="stage"><svg viewBox="0 40 900 250" role="img" aria-label="Ten small colourful mascots pulling a rope in a tug of war against a big grey robot labelled big tech, who is sweating and sliding forward"><rect width="100%" height="100%" fill="#FFF8E7"/><line x1="0" y1="262" x2="900" y2="262" stroke="#1A1320" stroke-width="2.5" stroke-dasharray="2 9" stroke-linecap="round"/>
<g class="clouds"><ellipse cx="120" cy="90" rx="46" ry="16" fill="#FCFAF0"/><ellipse cx="480" cy="72" rx="56" ry="18" fill="#FCFAF0"/></g>
<g class="tug">
<line x1="20" y1="214" x2="712" y2="214" stroke="#E8A33D" stroke-width="8" stroke-linecap="round"/>
<line x1="20" y1="214" x2="712" y2="214" stroke="#1A1320" stroke-width="8" stroke-linecap="round" stroke-dasharray="1 13" opacity=".35"/>
<g transform="translate(470,214)"><line x1="0" y1="0" x2="0" y2="30" stroke="#1A1320" stroke-width="3"/><path class="flap" d="M0,30 L24,40 L0,50Z" fill="#FFCA54" stroke="#1A1320" stroke-width="2.5"/></g>
<g transform="translate(46,224) rotate(-10)"><g transform="translate(0,0) scale(0.78,0.78)"><g class="heave" style="animation-delay:0s">
<path d="M-10,28 v11 M10,28 v11" stroke="#1A1320" stroke-width="3.2" stroke-linecap="round"/>
<path d="M-27,14 C-30,-22 -17,-38 0,-38 C17,-38 30,-22 27,14 C24,33 -24,33 -27,14Z" fill="#C9B6E4" stroke="#1A1320" stroke-width="3"/>
<g class="blink" style="animation-delay:0s"><circle cx="-8" cy="-13" r="3.6" fill="#1A1320"/><circle cx="8" cy="-13" r="3.6" fill="#1A1320"/></g>
<ellipse cx="-16" cy="-3" rx="5" ry="3" fill="#F29E4C" opacity=".45"/><ellipse cx="16" cy="-3" rx="5" ry="3" fill="#F29E4C" opacity=".45"/>
<ellipse cx="0" cy="0" rx="3.5" ry="4.5" fill="#1A1320"/>
</g></g><circle cx="14" cy="-9" r="6" fill="#C9B6E4" stroke="#1A1320" stroke-width="2.5"/></g><g transform="translate(86,224) rotate(-10)"><g transform="translate(0,0) scale(0.78,0.78)"><g class="heave" style="animation-delay:0.09s">
<path d="M-10,28 v11 M10,28 v11" stroke="#1A1320" stroke-width="3.2" stroke-linecap="round"/>
<path d="M-27,14 C-30,-22 -17,-38 0,-38 C17,-38 30,-22 27,14 C24,33 -24,33 -27,14Z" fill="#9ED9B8" stroke="#1A1320" stroke-width="3"/>
<g class="blink" style="animation-delay:0.153s"><circle cx="-8" cy="-13" r="3.6" fill="#1A1320"/><circle cx="8" cy="-13" r="3.6" fill="#1A1320"/></g>
<ellipse cx="-16" cy="-3" rx="5" ry="3" fill="#F29E4C" opacity=".45"/><ellipse cx="16" cy="-3" rx="5" ry="3" fill="#F29E4C" opacity=".45"/>
<path d="M-7,-3 Q0,7 7,-3 Z" fill="#1A1320"/>
</g></g><circle cx="14" cy="-9" r="6" fill="#9ED9B8" stroke="#1A1320" stroke-width="2.5"/></g><g transform="translate(126,224) rotate(-10)"><g transform="translate(0,0) scale(0.78,0.78)"><g class="heave" style="animation-delay:0.18s">
<path d="M-10,28 v11 M10,28 v11" stroke="#1A1320" stroke-width="3.2" stroke-linecap="round"/>
<path d="M-27,14 C-30,-22 -17,-38 0,-38 C17,-38 30,-22 27,14 C24,33 -24,33 -27,14Z" fill="#FFCA54" stroke="#1A1320" stroke-width="3"/>
<g class="blink" style="animation-delay:0.306s"><circle cx="-8" cy="-13" r="3.6" fill="#1A1320"/><circle cx="8" cy="-13" r="3.6" fill="#1A1320"/></g>
<ellipse cx="-16" cy="-3" rx="5" ry="3" fill="#F29E4C" opacity=".45"/><ellipse cx="16" cy="-3" rx="5" ry="3" fill="#F29E4C" opacity=".45"/>
<path d="M-7,-3 Q0,7 7,-3 Z" fill="#1A1320"/>
</g></g><circle cx="14" cy="-9" r="6" fill="#FFCA54" stroke="#1A1320" stroke-width="2.5"/></g><g transform="translate(166,224) rotate(-10)"><g transform="translate(0,0) scale(0.78,0.78)"><g class="heave" style="animation-delay:0.27s">
<path d="M-10,28 v11 M10,28 v11" stroke="#1A1320" stroke-width="3.2" stroke-linecap="round"/>
<path d="M-27,14 C-30,-22 -17,-38 0,-38 C17,-38 30,-22 27,14 C24,33 -24,33 -27,14Z" fill="#A9D4F5" stroke="#1A1320" stroke-width="3"/>
<g class="blink" style="animation-delay:0.459s"><circle cx="-8" cy="-13" r="3.6" fill="#1A1320"/><circle cx="8" cy="-13" r="3.6" fill="#1A1320"/></g>
<ellipse cx="-16" cy="-3" rx="5" ry="3" fill="#F29E4C" opacity=".45"/><ellipse cx="16" cy="-3" rx="5" ry="3" fill="#F29E4C" opacity=".45"/>
<ellipse cx="0" cy="0" rx="3.5" ry="4.5" fill="#1A1320"/>
</g></g><circle cx="14" cy="-9" r="6" fill="#A9D4F5" stroke="#1A1320" stroke-width="2.5"/></g><g transform="translate(206,224) rotate(-10)"><g transform="translate(0,0) scale(0.78,0.78)"><g class="heave" style="animation-delay:0.36s">
<path d="M-10,28 v11 M10,28 v11" stroke="#1A1320" stroke-width="3.2" stroke-linecap="round"/>
<path d="M-27,14 C-30,-22 -17,-38 0,-38 C17,-38 30,-22 27,14 C24,33 -24,33 -27,14Z" fill="#F29E4C" stroke="#1A1320" stroke-width="3"/>
<g class="blink" style="animation-delay:0.612s"><circle cx="-8" cy="-13" r="3.6" fill="#1A1320"/><circle cx="8" cy="-13" r="3.6" fill="#1A1320"/></g>
<ellipse cx="-16" cy="-3" rx="5" ry="3" fill="#F29E4C" opacity=".45"/><ellipse cx="16" cy="-3" rx="5" ry="3" fill="#F29E4C" opacity=".45"/>
<path d="M-7,-3 Q0,7 7,-3 Z" fill="#1A1320"/>
</g></g><circle cx="14" cy="-9" r="6" fill="#F29E4C" stroke="#1A1320" stroke-width="2.5"/></g><g transform="translate(246,224) rotate(-10)"><g transform="translate(0,0) scale(0.78,0.78)"><g class="heave" style="animation-delay:0.44999999999999996s">
<path d="M-10,28 v11 M10,28 v11" stroke="#1A1320" stroke-width="3.2" stroke-linecap="round"/>
<path d="M-27,14 C-30,-22 -17,-38 0,-38 C17,-38 30,-22 27,14 C24,33 -24,33 -27,14Z" fill="#C9B6E4" stroke="#1A1320" stroke-width="3"/>
<g class="blink" style="animation-delay:0.7649999999999999s"><circle cx="-8" cy="-13" r="3.6" fill="#1A1320"/><circle cx="8" cy="-13" r="3.6" fill="#1A1320"/></g>
<ellipse cx="-16" cy="-3" rx="5" ry="3" fill="#F29E4C" opacity=".45"/><ellipse cx="16" cy="-3" rx="5" ry="3" fill="#F29E4C" opacity=".45"/>
<path d="M-7,-3 Q0,7 7,-3 Z" fill="#1A1320"/>
</g></g><circle cx="14" cy="-9" r="6" fill="#C9B6E4" stroke="#1A1320" stroke-width="2.5"/></g><g transform="translate(286,224) rotate(-10)"><g transform="translate(0,0) scale(0.78,0.78)"><g class="heave" style="animation-delay:0.54s">
<path d="M-10,28 v11 M10,28 v11" stroke="#1A1320" stroke-width="3.2" stroke-linecap="round"/>
<path d="M-27,14 C-30,-22 -17,-38 0,-38 C17,-38 30,-22 27,14 C24,33 -24,33 -27,14Z" fill="#9ED9B8" stroke="#1A1320" stroke-width="3"/>
<g class="blink" style="animation-delay:0.918s"><circle cx="-8" cy="-13" r="3.6" fill="#1A1320"/><circle cx="8" cy="-13" r="3.6" fill="#1A1320"/></g>
<ellipse cx="-16" cy="-3" rx="5" ry="3" fill="#F29E4C" opacity=".45"/><ellipse cx="16" cy="-3" rx="5" ry="3" fill="#F29E4C" opacity=".45"/>
<ellipse cx="0" cy="0" rx="3.5" ry="4.5" fill="#1A1320"/>
</g></g><circle cx="14" cy="-9" r="6" fill="#9ED9B8" stroke="#1A1320" stroke-width="2.5"/></g><g transform="translate(326,224) rotate(-10)"><g transform="translate(0,0) scale(0.78,0.78)"><g class="heave" style="animation-delay:0.63s">
<path d="M-10,28 v11 M10,28 v11" stroke="#1A1320" stroke-width="3.2" stroke-linecap="round"/>
<path d="M-27,14 C-30,-22 -17,-38 0,-38 C17,-38 30,-22 27,14 C24,33 -24,33 -27,14Z" fill="#FFCA54" stroke="#1A1320" stroke-width="3"/>
<g class="blink" style="animation-delay:1.071s"><circle cx="-8" cy="-13" r="3.6" fill="#1A1320"/><circle cx="8" cy="-13" r="3.6" fill="#1A1320"/></g>
<ellipse cx="-16" cy="-3" rx="5" ry="3" fill="#F29E4C" opacity=".45"/><ellipse cx="16" cy="-3" rx="5" ry="3" fill="#F29E4C" opacity=".45"/>
<path d="M-7,-3 Q0,7 7,-3 Z" fill="#1A1320"/>
</g></g><circle cx="14" cy="-9" r="6" fill="#FFCA54" stroke="#1A1320" stroke-width="2.5"/></g><g transform="translate(366,224) rotate(-10)"><g transform="translate(0,0) scale(0.78,0.78)"><g class="heave" style="animation-delay:0.72s">
<path d="M-10,28 v11 M10,28 v11" stroke="#1A1320" stroke-width="3.2" stroke-linecap="round"/>
<path d="M-27,14 C-30,-22 -17,-38 0,-38 C17,-38 30,-22 27,14 C24,33 -24,33 -27,14Z" fill="#A9D4F5" stroke="#1A1320" stroke-width="3"/>
<g class="blink" style="animation-delay:1.224s"><circle cx="-8" cy="-13" r="3.6" fill="#1A1320"/><circle cx="8" cy="-13" r="3.6" fill="#1A1320"/></g>
<ellipse cx="-16" cy="-3" rx="5" ry="3" fill="#F29E4C" opacity=".45"/><ellipse cx="16" cy="-3" rx="5" ry="3" fill="#F29E4C" opacity=".45"/>
<path d="M-7,-3 Q0,7 7,-3 Z" fill="#1A1320"/>
</g></g><circle cx="14" cy="-9" r="6" fill="#A9D4F5" stroke="#1A1320" stroke-width="2.5"/></g><g transform="translate(406,224) rotate(-10)"><g transform="translate(0,0) scale(0.78,0.78)"><g class="heave" style="animation-delay:0.8099999999999999s">
<path d="M-10,28 v11 M10,28 v11" stroke="#1A1320" stroke-width="3.2" stroke-linecap="round"/>
<path d="M-27,14 C-30,-22 -17,-38 0,-38 C17,-38 30,-22 27,14 C24,33 -24,33 -27,14Z" fill="#F29E4C" stroke="#1A1320" stroke-width="3"/>
<g class="blink" style="animation-delay:1.3769999999999998s"><circle cx="-8" cy="-13" r="3.6" fill="#1A1320"/><circle cx="8" cy="-13" r="3.6" fill="#1A1320"/></g>
<ellipse cx="-16" cy="-3" rx="5" ry="3" fill="#F29E4C" opacity=".45"/><ellipse cx="16" cy="-3" rx="5" ry="3" fill="#F29E4C" opacity=".45"/>
<ellipse cx="0" cy="0" rx="3.5" ry="4.5" fill="#1A1320"/>
</g></g><circle cx="14" cy="-9" r="6" fill="#F29E4C" stroke="#1A1320" stroke-width="2.5"/></g>
</g>
<g class="dragged">
<path d="M696,190 Q690,210 712,214" fill="none" stroke="#1A1320" stroke-width="5" stroke-linecap="round"/><circle cx="710" cy="214" r="8" fill="#E4DEE9" stroke="#1A1320" stroke-width="3"/>
<g transform="translate(770,176)"><g class="strain">
<line x1="0" y1="-75" x2="0" y2="-93" stroke="#1A1320" stroke-width="3"/><circle cx="0" cy="-97" r="6" fill="#B9B0C4" stroke="#1A1320" stroke-width="3"/>
<rect x="-75" y="-75" width="150" height="150" rx="14" fill="#E4DEE9" stroke="#1A1320" stroke-width="3"/>
<rect x="-63" y="-61" width="126" height="36" rx="8" fill="#B9B0C4" stroke="#1A1320" stroke-width="2.5"/>
<g class="blink"><circle cx="-30" cy="-41" r="6" fill="#1A1320"/><circle cx="30" cy="-41" r="6" fill="#1A1320"/><circle cx="-28" cy="-43" r="1.8" fill="#FCFAF0"/><circle cx="32" cy="-43" r="1.8" fill="#FCFAF0"/></g>
<path d="M-39,-51 l16,-5 M39,-51 l-16,-5" stroke="#1A1320" stroke-width="3" stroke-linecap="round"/><path d="M-8,-30 q8,-5 16,0" fill="none" stroke="#1A1320" stroke-width="2.5" stroke-linecap="round"/>
<text x="0" y="59" text-anchor="middle" class="lbl" fill="#8E849B">BIG TECH</text>
</g></g>
<g transform="translate(700,96)"><path class="drip" style="animation-delay:0s" d="M0,0 C4,6 4,10 0,11 C-4,10 -4,6 0,0Z" fill="#A9D4F5" stroke="#1A1320" stroke-width="1.8"/></g><g transform="translate(842,104)"><path class="drip" style="animation-delay:0.7s" d="M0,0 C4,6 4,10 0,11 C-4,10 -4,6 0,0Z" fill="#A9D4F5" stroke="#1A1320" stroke-width="1.8"/></g><g transform="translate(724,76)"><path class="drip" style="animation-delay:1.3s" d="M0,0 C4,6 4,10 0,11 C-4,10 -4,6 0,0Z" fill="#A9D4F5" stroke="#1A1320" stroke-width="1.8"/></g>
<g class="dust"><circle cx="720" cy="258" r="7" fill="#E4DEE9"/><circle cx="706" cy="252" r="5" fill="#E4DEE9"/><circle cx="824" cy="258" r="6" fill="#E4DEE9"/></g>
</g></svg></figure>

<div class="callout tldr"><span class="ic">TL;DR</span><p>Big tech ships an AI product, charges $20 to $120 a month for it, and a few weeks later someone in Kerala or Bengaluru puts a free version on GitHub. Here are ten Indian open source AI projects doing exactly that, each one next to the big tech product it is up against.</p></div>

**Full disclosure:** number three is ours. We made the list, so we put ourselves on it. We did put ourselves third and not first, which we think shows admirable restraint.

**How we picked:** the project is open source on GitHub, AI sits at the core of it, it was started by Indian founders or developers, and there is a clear big tech product on the other side of the ring. Star counts come from the GitHub API on 25 September 2026. Stars measure attention, not quality, so treat them as a rough signal.

## 1. Laya vs TypeSafe's Jev

<p class="vs">Open decision model vs hosted decision model</p>

<figure class="stage"><svg viewBox="0 0 640 280" role="img" aria-label="Laya, a small lilac mascot, stamps decision cards with yes, no and a pick while a stopwatch reads 33 milliseconds; a grey hosted API robot in the corner is still loading"><rect width="100%" height="100%" fill="#FFF8E7"/><line x1="0" y1="250" x2="640" y2="250" stroke="#1A1320" stroke-width="2.5" stroke-dasharray="2 9" stroke-linecap="round"/>
<g class="belt"><g transform="translate(360,196)"><g class="card-in" style="animation-delay:0s"><rect x="-24" y="-30" width="48" height="36" rx="6" fill="#FCFAF0" stroke="#1A1320" stroke-width="2.5"/><text x="0" y="-5" text-anchor="middle" class="big">?</text></g></g><g transform="translate(450,196)"><g class="card-in" style="animation-delay:-1s"><rect x="-24" y="-30" width="48" height="36" rx="6" fill="#FCFAF0" stroke="#1A1320" stroke-width="2.5"/><text x="0" y="-5" text-anchor="middle" class="big">?</text></g></g><g transform="translate(540,196)"><g class="card-in" style="animation-delay:-2s"><rect x="-24" y="-30" width="48" height="36" rx="6" fill="#FCFAF0" stroke="#1A1320" stroke-width="2.5"/><text x="0" y="-5" text-anchor="middle" class="big">?</text></g></g><g transform="translate(630,196)"><g class="card-in" style="animation-delay:-3s"><rect x="-24" y="-30" width="48" height="36" rx="6" fill="#FCFAF0" stroke="#1A1320" stroke-width="2.5"/><text x="0" y="-5" text-anchor="middle" class="big">?</text></g></g></g>
<rect x="150" y="206" width="400" height="12" rx="6" fill="#E4DEE9" stroke="#1A1320" stroke-width="2.5"/>
<g transform="translate(150,196) scale(1,1)"><g class="stomp" style="animation-delay:0s">
<path d="M-10,28 v11 M10,28 v11" stroke="#1A1320" stroke-width="3.2" stroke-linecap="round"/>
<path d="M-27,14 C-30,-22 -17,-38 0,-38 C17,-38 30,-22 27,14 C24,33 -24,33 -27,14Z" fill="#C9B6E4" stroke="#1A1320" stroke-width="3"/>
<g class="blink" style="animation-delay:0s"><circle cx="-8" cy="-13" r="3.6" fill="#1A1320"/><circle cx="8" cy="-13" r="3.6" fill="#1A1320"/></g>
<ellipse cx="-16" cy="-3" rx="5" ry="3" fill="#F29E4C" opacity=".45"/><ellipse cx="16" cy="-3" rx="5" ry="3" fill="#F29E4C" opacity=".45"/>
<path d="M-5,-2 Q0,4 5,-2" fill="none" stroke="#1A1320" stroke-width="2.6" stroke-linecap="round"/>
</g></g>
<g transform="translate(120,110)"><g class="popup" style="animation-delay:0s"><rect x="-44.6" y="-14" width="89.2" height="28" rx="14" fill="#9ED9B8" stroke="#1A1320" stroke-width="2.5"/><text x="0" y="5" text-anchor="middle" class="lbl">YES 0.97</text></g></g>
<g transform="translate(190,70)"><g class="popup" style="animation-delay:1s"><rect x="-40.400000000000006" y="-14" width="80.80000000000001" height="28" rx="14" fill="#A9D4F5" stroke="#1A1320" stroke-width="2.5"/><text x="0" y="5" text-anchor="middle" class="lbl">NO 0.91</text></g></g>
<g transform="translate(96,50)"><g class="popup" style="animation-delay:2s"><rect x="-36.2" y="-14" width="72.4" height="28" rx="14" fill="#FFCA54" stroke="#1A1320" stroke-width="2.5"/><text x="0" y="5" text-anchor="middle" class="lbl">PICK B</text></g></g>
<g transform="translate(300,78)"><circle r="30" fill="#FCFAF0" stroke="#1A1320" stroke-width="3"/><rect x="-6" y="-40" width="12" height="8" rx="2" fill="#1A1320"/><g class="spinfast"><line x1="0" y1="0" x2="0" y2="-22" stroke="#F29E4C" stroke-width="3.5" stroke-linecap="round"/></g><circle r="3.5" fill="#1A1320"/></g>
<text x="300" y="138" text-anchor="middle" class="lbl">33 ms</text>
<g transform="translate(570,110)"><g class="sway">
<line x1="0" y1="-37" x2="0" y2="-55" stroke="#1A1320" stroke-width="3"/><circle cx="0" cy="-59" r="6" fill="#B9B0C4" stroke="#1A1320" stroke-width="3"/>
<rect x="-39" y="-37" width="78" height="74" rx="14" fill="#E4DEE9" stroke="#1A1320" stroke-width="3"/>
<rect x="-27" y="-23" width="54" height="36" rx="8" fill="#B9B0C4" stroke="#1A1320" stroke-width="2.5"/>
<g class="blink"><circle cx="-15.6" cy="-3" r="6" fill="#1A1320"/><circle cx="15.6" cy="-3" r="6" fill="#1A1320"/><circle cx="-13.6" cy="-5" r="1.8" fill="#FCFAF0"/><circle cx="17.6" cy="-5" r="1.8" fill="#FCFAF0"/></g>
<path d="M-24.6,-13 l16,-5 M24.6,-13 l-16,-5" stroke="#1A1320" stroke-width="3" stroke-linecap="round"/><path d="M-8,8 q8,-5 16,0" fill="none" stroke="#1A1320" stroke-width="2.5" stroke-linecap="round"/>
</g></g>
<g transform="translate(570,196)"><g class="spinslow"><circle r="13" fill="none" stroke="#B9B0C4" stroke-width="4" stroke-dasharray="20 62"/></g></g>
<text x="570" y="236" text-anchor="middle" class="lbl" fill="#8E849B">hosted API</text></svg></figure>

<ul class="chips"><li class="star">22.7k stars</li><li class="who"><a href="https://github.com/NandhaKishorM" target="_blank" rel="noopener noreferrer"><img src="https://github.com/NandhaKishorM.png?size=64" alt="" width="22" height="22" loading="lazy"/>Nandakishor M</a></li><li>Kasaragod, Kerala</li><li>Apache 2.0</li></ul>

Jev went viral this month. It comes from TypeSafe AI, a startup brought out of stealth by a former OpenAI researcher, and its pitch is "decisions, not strings": you ask a typed question, it answers with a choice, a score or a yes or no probability, and it never writes a paragraph you did not ask for. You reach it through TypeSafe's hosted API.

Convai Innovations, a small team in Kasaragod, Kerala, answered with [Laya](https://github.com/NandhaKishorM/laya). It is a 421 million parameter model under the Apache 2.0 license, with weights on Hugging Face, and it ships a self hosted server that speaks the same wire protocol as Jev's API. There is a multilingual version for 100+ languages, and the project site quotes 33 millisecond answers. The community has already ported it to Apple's MLX, to Node.js and into a plain browser tab.

## 2. Mem0 vs OpenAI's ChatGPT memory and Amazon's AgentCore Memory

<p class="vs">Memory for any agent vs memory for one company's agent</p>

<figure class="stage"><svg viewBox="0 0 640 280" role="img" aria-label="Mem0, a mint mascot, drops little memory bubbles into a jar that feeds three different robots, while a grey vault keeps its memory locked inside one app"><rect width="100%" height="100%" fill="#FFF8E7"/><line x1="0" y1="250" x2="640" y2="250" stroke="#1A1320" stroke-width="2.5" stroke-dasharray="2 9" stroke-linecap="round"/>
<g transform="translate(96,206) scale(1,1)"><g class="bob" style="animation-delay:0s">
<path d="M-10,28 v11 M10,28 v11" stroke="#1A1320" stroke-width="3.2" stroke-linecap="round"/>
<path d="M-27,14 C-30,-22 -17,-38 0,-38 C17,-38 30,-22 27,14 C24,33 -24,33 -27,14Z" fill="#9ED9B8" stroke="#1A1320" stroke-width="3"/>
<g class="blink" style="animation-delay:0s"><circle cx="-8" cy="-13" r="3.6" fill="#1A1320"/><circle cx="8" cy="-13" r="3.6" fill="#1A1320"/></g>
<ellipse cx="-16" cy="-3" rx="5" ry="3" fill="#F29E4C" opacity=".45"/><ellipse cx="16" cy="-3" rx="5" ry="3" fill="#F29E4C" opacity=".45"/>
<path d="M-7,-3 Q0,7 7,-3 Z" fill="#1A1320"/>
</g></g>
<g transform="translate(250,168)"><path d="M-44,-44 H44 V52 Q44,70 26,70 H-26 Q-44,70 -44,52 Z" fill="#FCFAF0" stroke="#1A1320" stroke-width="3"/><rect x="-50" y="-58" width="100" height="16" rx="5" fill="#FFCA54" stroke="#1A1320" stroke-width="3"/><g class="fill"><rect x="-38" y="10" width="76" height="52" rx="10" fill="#9ED9B8" opacity=".7"/></g><text x="0" y="-12" text-anchor="middle" class="lbl">memory</text></g>
<g transform="translate(170,70)"><g class="drop" style="animation-delay:0s"><rect x="-59" y="-14" width="118" height="28" rx="14" fill="#C9B6E4" stroke="#1A1320" stroke-width="2.5"/><text x="0" y="5" text-anchor="middle" class="lbl">likes chai</text></g></g><g transform="translate(170,70)"><g class="drop" style="animation-delay:1.4s"><rect x="-59" y="-14" width="118" height="28" rx="14" fill="#A9D4F5" stroke="#1A1320" stroke-width="2.5"/><text x="0" y="5" text-anchor="middle" class="lbl">lives in Pune</text></g></g><g transform="translate(170,70)"><g class="drop" style="animation-delay:2.8s"><rect x="-59" y="-14" width="118" height="28" rx="14" fill="#FFCA54" stroke="#1A1320" stroke-width="2.5"/><text x="0" y="5" text-anchor="middle" class="lbl">uses tabs</text></g></g>
<path d="M300,186 C340,190 340,120 382,120" fill="none" stroke="#1A1320" stroke-width="2.5" stroke-dasharray="4 7" class="flow"/><path d="M300,190 C340,190 340,180 382,180" fill="none" stroke="#1A1320" stroke-width="2.5" stroke-dasharray="4 7" class="flow"/><path d="M300,194 C340,190 340,240 382,240" fill="none" stroke="#1A1320" stroke-width="2.5" stroke-dasharray="4 7" class="flow"/>
<g transform="translate(410,120)"><g class="bob" style="animation-delay:0s"><rect x="-22" y="-18" width="44" height="34" rx="9" fill="#C9B6E4" stroke="#1A1320" stroke-width="2.5"/><circle cx="-7" cy="-3" r="3" fill="#1A1320"/><circle cx="7" cy="-3" r="3" fill="#1A1320"/></g></g><g transform="translate(410,180)"><g class="bob" style="animation-delay:0.3s"><rect x="-22" y="-18" width="44" height="34" rx="9" fill="#A9D4F5" stroke="#1A1320" stroke-width="2.5"/><circle cx="-7" cy="-3" r="3" fill="#1A1320"/><circle cx="7" cy="-3" r="3" fill="#1A1320"/></g></g><g transform="translate(410,240)"><g class="bob" style="animation-delay:0.6s"><rect x="-22" y="-18" width="44" height="34" rx="9" fill="#FFCA54" stroke="#1A1320" stroke-width="2.5"/><circle cx="-7" cy="-3" r="3" fill="#1A1320"/><circle cx="7" cy="-3" r="3" fill="#1A1320"/></g></g>
<g transform="translate(560,160)"><rect x="-54" y="-60" width="108" height="112" rx="12" fill="#E4DEE9" stroke="#1A1320" stroke-width="3"/><circle r="22" fill="#B9B0C4" stroke="#1A1320" stroke-width="3"/><g class="spinslow"><circle r="13" fill="none" stroke="#1A1320" stroke-width="3" stroke-dasharray="14 8"/></g><g transform="translate(0,-70)"><g class="swing"><rect x="-14" y="-4" width="28" height="22" rx="4" fill="#B9B0C4" stroke="#1A1320" stroke-width="2.5"/><path d="M-8,-4 V-12 A8,8 0 0 1 8,-12 V-4" fill="none" stroke="#1A1320" stroke-width="2.5"/></g></g><text x="0" y="40" text-anchor="middle" class="lbl" fill="#8E849B">one app</text></g></svg></figure>

<ul class="chips"><li class="star">65.9k stars</li><li class="who"><a href="https://github.com/taranjeet" target="_blank" rel="noopener noreferrer"><img src="https://github.com/taranjeet.png?size=64" alt="" width="22" height="22" loading="lazy"/>Taranjeet Singh</a></li><li class="who"><a href="https://github.com/deshraj" target="_blank" rel="noopener noreferrer"><img src="https://github.com/deshraj.png?size=64" alt="" width="22" height="22" loading="lazy"/>Deshraj Yadav</a></li><li>Y Combinator</li></ul>

ChatGPT remembers you, but only inside ChatGPT. Amazon sells agent memory, but inside AWS. [Mem0](https://github.com/mem0ai/mem0) is a drop in memory layer that works with whatever model and agent you already use.

Taranjeet Singh started out as an engineer at Paytm, and Deshraj Yadav led the AI platform for Tesla Autopilot. They built an open source ML platform, EvalAI, together before this. Mem0 has raised $24 million from Y Combinator, Peak XV and Basis Set, and it is the most starred project on this list.

## 3. Munder Difflin vs Meta's Muse and SpaceXAI's Grok Bot

<p class="vs">An office of agents on your laptop vs a subscription in someone else's cloud</p>

<figure class="stage"><svg viewBox="0 0 640 280" role="img" aria-label="A tiny office floor: three mascots type at desks while sticky notes slide across a kanban board from to do to done; price tags of 100 and 120 dollars a month swing on the right and a yellow tag says free"><rect width="100%" height="100%" fill="#FFF8E7"/><rect x="30" y="30" width="330" height="120" rx="10" fill="#FCFAF0" stroke="#1A1320" stroke-width="2.5"/>
<text x="85" y="54" text-anchor="middle" class="lbl">todo</text><text x="195" y="54" text-anchor="middle" class="lbl">doing</text><line x1="140" y1="40" x2="140" y2="140" stroke="#B9B0C4" stroke-width="2"/><text x="305" y="54" text-anchor="middle" class="lbl">done</text><line x1="250" y1="40" x2="250" y2="140" stroke="#B9B0C4" stroke-width="2"/>
<g class="note n1"><rect x="62" y="70" width="44" height="30" rx="4" fill="#FFCA54" stroke="#1A1320" stroke-width="2"/></g>
<g class="note n2"><rect x="62" y="106" width="44" height="30" rx="4" fill="#9ED9B8" stroke="#1A1320" stroke-width="2"/></g>
<g><rect x="282" y="70" width="44" height="30" rx="4" fill="#A9D4F5" stroke="#1A1320" stroke-width="2"/><path d="M293,85 l6,6 l12,-12" fill="none" stroke="#1A1320" stroke-width="2.5" stroke-linecap="round"/></g>
<line x1="0" y1="250" x2="640" y2="250" stroke="#1A1320" stroke-width="2.5" stroke-dasharray="2 9" stroke-linecap="round"/>
<g transform="translate(80,196) scale(0.8,0.8)"><g class="type" style="animation-delay:0s">
<path d="M-10,28 v11 M10,28 v11" stroke="#1A1320" stroke-width="3.2" stroke-linecap="round"/>
<path d="M-27,14 C-30,-22 -17,-38 0,-38 C17,-38 30,-22 27,14 C24,33 -24,33 -27,14Z" fill="#C9B6E4" stroke="#1A1320" stroke-width="3"/>
<g class="blink" style="animation-delay:0s"><circle cx="-8" cy="-13" r="3.6" fill="#1A1320"/><circle cx="8" cy="-13" r="3.6" fill="#1A1320"/></g>
<ellipse cx="-16" cy="-3" rx="5" ry="3" fill="#F29E4C" opacity=".45"/><ellipse cx="16" cy="-3" rx="5" ry="3" fill="#F29E4C" opacity=".45"/>
<path d="M-5,-2 Q0,4 5,-2" fill="none" stroke="#1A1320" stroke-width="2.6" stroke-linecap="round"/>
</g></g><rect x="40" y="214" width="80" height="12" rx="3" fill="#E8A33D" stroke="#1A1320" stroke-width="2.5"/><rect x="64" y="198" width="32" height="18" rx="3" fill="#1A1320"/><rect x="68" y="201" width="24" height="10" rx="2" fill="#9ED9B8" class="screen" style="animation-delay:0s"/><path d="M48,226 v24 M112,226 v24" stroke="#1A1320" stroke-width="3"/><g transform="translate(200,196) scale(0.8,0.8)"><g class="type" style="animation-delay:0.2s">
<path d="M-10,28 v11 M10,28 v11" stroke="#1A1320" stroke-width="3.2" stroke-linecap="round"/>
<path d="M-27,14 C-30,-22 -17,-38 0,-38 C17,-38 30,-22 27,14 C24,33 -24,33 -27,14Z" fill="#FFCA54" stroke="#1A1320" stroke-width="3"/>
<g class="blink" style="animation-delay:0.34s"><circle cx="-8" cy="-13" r="3.6" fill="#1A1320"/><circle cx="8" cy="-13" r="3.6" fill="#1A1320"/></g>
<ellipse cx="-16" cy="-3" rx="5" ry="3" fill="#F29E4C" opacity=".45"/><ellipse cx="16" cy="-3" rx="5" ry="3" fill="#F29E4C" opacity=".45"/>
<path d="M-5,-2 Q0,4 5,-2" fill="none" stroke="#1A1320" stroke-width="2.6" stroke-linecap="round"/>
</g></g><rect x="160" y="214" width="80" height="12" rx="3" fill="#E8A33D" stroke="#1A1320" stroke-width="2.5"/><rect x="184" y="198" width="32" height="18" rx="3" fill="#1A1320"/><rect x="188" y="201" width="24" height="10" rx="2" fill="#9ED9B8" class="screen" style="animation-delay:0.2s"/><path d="M168,226 v24 M232,226 v24" stroke="#1A1320" stroke-width="3"/><g transform="translate(320,196) scale(0.8,0.8)"><g class="type" style="animation-delay:0.4s">
<path d="M-10,28 v11 M10,28 v11" stroke="#1A1320" stroke-width="3.2" stroke-linecap="round"/>
<path d="M-27,14 C-30,-22 -17,-38 0,-38 C17,-38 30,-22 27,14 C24,33 -24,33 -27,14Z" fill="#A9D4F5" stroke="#1A1320" stroke-width="3"/>
<g class="blink" style="animation-delay:0.68s"><circle cx="-8" cy="-13" r="3.6" fill="#1A1320"/><circle cx="8" cy="-13" r="3.6" fill="#1A1320"/></g>
<ellipse cx="-16" cy="-3" rx="5" ry="3" fill="#F29E4C" opacity=".45"/><ellipse cx="16" cy="-3" rx="5" ry="3" fill="#F29E4C" opacity=".45"/>
<path d="M-5,-2 Q0,4 5,-2" fill="none" stroke="#1A1320" stroke-width="2.6" stroke-linecap="round"/>
</g></g><rect x="280" y="214" width="80" height="12" rx="3" fill="#E8A33D" stroke="#1A1320" stroke-width="2.5"/><rect x="304" y="198" width="32" height="18" rx="3" fill="#1A1320"/><rect x="308" y="201" width="24" height="10" rx="2" fill="#9ED9B8" class="screen" style="animation-delay:0.4s"/><path d="M288,226 v24 M352,226 v24" stroke="#1A1320" stroke-width="3"/>
<path class="plane-p" d="M0,0 L22,8 L0,16 L5,8 Z" fill="#FCFAF0" stroke="#1A1320" stroke-width="2" transform="translate(120,168)"/>
<g transform="translate(470,70)"><g class="swing" style="animation-delay:0s"><line x1="0" y1="-26" x2="0" y2="-8" stroke="#1A1320" stroke-width="2"/><path d="M-34,-8 H26 L40,10 L26,28 H-34 Z" fill="#E4DEE9" stroke="#1A1320" stroke-width="2.5"/><circle cx="26" cy="10" r="3.5" fill="#FCFAF0" stroke="#1A1320" stroke-width="2"/><text x="-4" y="16" text-anchor="middle" class="lbl">$100/mo</text></g></g><g transform="translate(560,120)"><g class="swing" style="animation-delay:0.6s"><line x1="0" y1="-26" x2="0" y2="-8" stroke="#1A1320" stroke-width="2"/><path d="M-34,-8 H26 L40,10 L26,28 H-34 Z" fill="#E4DEE9" stroke="#1A1320" stroke-width="2.5"/><circle cx="26" cy="10" r="3.5" fill="#FCFAF0" stroke="#1A1320" stroke-width="2"/><text x="-4" y="16" text-anchor="middle" class="lbl">$120/mo</text></g></g>
<g transform="translate(500,208)"><g class="pulse"><rect x="-56" y="-24" width="112" height="48" rx="24" fill="#FFCA54" stroke="#1A1320" stroke-width="3"/><text x="0" y="7" text-anchor="middle" class="big">free</text></g></g></svg></figure>

<ul class="chips"><li class="star">7.9k stars</li><li class="who"><a href="https://github.com/chaitanyagiri" target="_blank" rel="noopener noreferrer"><img src="https://github.com/chaitanyagiri.png?size=64" alt="" width="22" height="22" loading="lazy"/>Chaitanya Giri</a></li><li>Free and open source</li><li>macOS, Windows, Linux</li></ul>

Meta launched Muse on 8 September with a free tier plus $20 and $100 monthly plans, and it launched for US users first. SpaceXAI's Grok Bot gives you always on agent teammates for $120 a month and passed 400,000 weekly users in its first month. People clearly want AI coworkers.

[Munder Difflin](https://harnessmd.com/download) gives you a whole office of them, running on your own computer. You bring the AI engine you already have, like a Claude Code or Codex subscription, and the agents get desks, an inbox, a shared task board and a memory that survives the weekend. It is free and open source.

## 4. Plane vs Atlassian's Jira

<p class="vs">Open project planning with AI built in vs the incumbent</p>

<figure class="stage"><svg viewBox="0 0 640 280" role="img" aria-label="Plane: a paper plane loops through a blue sky carrying a task card while a grey stack of forms wobbles on the ground"><rect width="100%" height="100%" fill="#FFF8E7"/><rect width="640" height="280" fill="#A9D4F5" opacity=".45"/>
<g class="clouds"><ellipse cx="110" cy="70" rx="50" ry="18" fill="#FCFAF0"/><ellipse cx="420" cy="50" rx="60" ry="18" fill="#FCFAF0"/><ellipse cx="560" cy="120" rx="40" ry="14" fill="#FCFAF0"/></g>
<line x1="0" y1="250" x2="640" y2="250" stroke="#1A1320" stroke-width="2.5" stroke-dasharray="2 9" stroke-linecap="round"/>
<g class="loop"><g transform="translate(0,0)"><path d="M-40,-10 L30,0 L-40,14 L-26,0 Z" fill="#FCFAF0" stroke="#1A1320" stroke-width="3"/><path d="M-26,0 L30,0" stroke="#1A1320" stroke-width="2"/><circle cx="-2" cy="-5" r="2.8" fill="#1A1320"/><line x1="-30" y1="12" x2="-30" y2="30" stroke="#1A1320" stroke-width="2"/><rect x="-46" y="30" width="32" height="22" rx="3" fill="#FFCA54" stroke="#1A1320" stroke-width="2"/><path d="M-38,41 l5,5 l10,-10" fill="none" stroke="#1A1320" stroke-width="2.2"/></g></g>
<g transform="translate(520,250)"><g class="wobble"><rect x="-46" y="-24" width="92" height="22" rx="3" fill="#B9B0C4" stroke="#1A1320" stroke-width="2.5"/><line x1="-34" y1="-13" x2="20" y2="-13" stroke="#8E849B" stroke-width="2"/><rect x="-40" y="-48" width="92" height="22" rx="3" fill="#E4DEE9" stroke="#1A1320" stroke-width="2.5"/><line x1="-28" y1="-37" x2="26" y2="-37" stroke="#8E849B" stroke-width="2"/><rect x="-46" y="-72" width="92" height="22" rx="3" fill="#B9B0C4" stroke="#1A1320" stroke-width="2.5"/><line x1="-34" y1="-61" x2="20" y2="-61" stroke="#8E849B" stroke-width="2"/><rect x="-40" y="-96" width="92" height="22" rx="3" fill="#E4DEE9" stroke="#1A1320" stroke-width="2.5"/><line x1="-28" y1="-85" x2="26" y2="-85" stroke="#8E849B" stroke-width="2"/><rect x="-46" y="-120" width="92" height="22" rx="3" fill="#B9B0C4" stroke="#1A1320" stroke-width="2.5"/><line x1="-34" y1="-109" x2="20" y2="-109" stroke="#8E849B" stroke-width="2"/></g></g>
<text x="520" y="272" text-anchor="middle" class="lbl" fill="#8E849B">required fields</text>
<g transform="translate(110,208) scale(0.8,0.8)"><g class="bob" style="animation-delay:0s">
<path d="M-10,28 v11 M10,28 v11" stroke="#1A1320" stroke-width="3.2" stroke-linecap="round"/>
<path d="M-27,14 C-30,-22 -17,-38 0,-38 C17,-38 30,-22 27,14 C24,33 -24,33 -27,14Z" fill="#FFCA54" stroke="#1A1320" stroke-width="3"/>
<g class="blink" style="animation-delay:0s"><circle cx="-8" cy="-13" r="3.6" fill="#1A1320"/><circle cx="8" cy="-13" r="3.6" fill="#1A1320"/></g>
<ellipse cx="-16" cy="-3" rx="5" ry="3" fill="#F29E4C" opacity=".45"/><ellipse cx="16" cy="-3" rx="5" ry="3" fill="#F29E4C" opacity=".45"/>
<path d="M-7,-3 Q0,7 7,-3 Z" fill="#1A1320"/>
</g></g></svg></figure>

<ul class="chips"><li class="star">59.8k stars</li><li class="who"><a href="https://github.com/vamsi" target="_blank" rel="noopener noreferrer"><img src="https://github.com/vamsi.png?size=64" alt="" width="22" height="22" loading="lazy"/>Vamsi Kurama</a></li><li class="who"><a href="https://github.com/vihar" target="_blank" rel="noopener noreferrer"><img src="https://github.com/vihar.png?size=64" alt="" width="22" height="22" loading="lazy"/>Vihar Kurama</a></li><li>Hyderabad</li></ul>

[Plane](https://github.com/makeplane/plane) calls itself the open source alternative to Jira, Linear, Monday and ClickUp, and nearly 60,000 GitHub stars suggest a lot of people were waiting for one. Brothers Vamsi and Vihar Kurama started it in Hyderabad in late 2022. Plane AI now sits inside the product, alongside projects and a wiki, and you can self host the lot.

## 5. ToolJet vs Microsoft Power Apps

<p class="vs">Build internal apps with AI vs build them inside Microsoft's walls</p>

<figure class="stage"><svg viewBox="0 0 640 280" role="img" aria-label="ToolJet: a mascot in a hard hat watches a table, a chart and a button drop into a browser window; a grey coin marked M12 flies over from the grey side"><rect width="100%" height="100%" fill="#FFF8E7"/><line x1="0" y1="250" x2="640" y2="250" stroke="#1A1320" stroke-width="2.5" stroke-dasharray="2 9" stroke-linecap="round"/>
<g transform="translate(300,140)"><rect x="-130" y="-100" width="260" height="190" rx="12" fill="#FCFAF0" stroke="#1A1320" stroke-width="3"/><line x1="-130" y1="-76" x2="130" y2="-76" stroke="#1A1320" stroke-width="2.5"/><circle cx="-114" cy="-88" r="4" fill="#F29E4C" stroke="#1A1320" stroke-width="1.5"/><circle cx="-100" cy="-88" r="4" fill="#FFCA54" stroke="#1A1320" stroke-width="1.5"/><circle cx="-86" cy="-88" r="4" fill="#9ED9B8" stroke="#1A1320" stroke-width="1.5"/>
<g class="snap s1"><rect x="-116" y="-62" width="140" height="80" rx="6" fill="#A9D4F5" stroke="#1A1320" stroke-width="2.5"/><line x1="-108" y1="-40" x2="16" y2="-40" stroke="#1A1320" stroke-width="2"/><line x1="-108" y1="-20" x2="16" y2="-20" stroke="#1A1320" stroke-width="2"/><line x1="-108" y1="0" x2="16" y2="0" stroke="#1A1320" stroke-width="2"/></g>
<g class="snap s2"><rect x="36" y="-62" width="80" height="80" rx="6" fill="#9ED9B8" stroke="#1A1320" stroke-width="2.5"/><rect x="48" y="-8" width="14" height="20" fill="#FCFAF0" stroke="#1A1320" stroke-width="2"/><rect x="70" y="-26" width="14" height="38" fill="#FCFAF0" stroke="#1A1320" stroke-width="2"/><rect x="92" y="-44" width="14" height="56" fill="#FCFAF0" stroke="#1A1320" stroke-width="2"/></g>
<g class="snap s3"><rect x="-116" y="32" width="100" height="40" rx="20" fill="#FFCA54" stroke="#1A1320" stroke-width="2.5"/><text x="-66" y="58" text-anchor="middle" class="lbl">Ship</text></g></g>
<g transform="translate(520,206) scale(1,1)"><g class="bob" style="animation-delay:0s">
<path d="M-10,28 v11 M10,28 v11" stroke="#1A1320" stroke-width="3.2" stroke-linecap="round"/>
<path d="M-27,14 C-30,-22 -17,-38 0,-38 C17,-38 30,-22 27,14 C24,33 -24,33 -27,14Z" fill="#F29E4C" stroke="#1A1320" stroke-width="3"/>
<g class="blink" style="animation-delay:0s"><circle cx="-8" cy="-13" r="3.6" fill="#1A1320"/><circle cx="8" cy="-13" r="3.6" fill="#1A1320"/></g>
<ellipse cx="-16" cy="-3" rx="5" ry="3" fill="#F29E4C" opacity=".45"/><ellipse cx="16" cy="-3" rx="5" ry="3" fill="#F29E4C" opacity=".45"/>
<path d="M-5,-2 Q0,4 5,-2" fill="none" stroke="#1A1320" stroke-width="2.6" stroke-linecap="round"/><path d="M-26,-26 Q0,-58 26,-26 Z" fill="#FFCA54" stroke="#1A1320" stroke-width="3"/><rect x="-30" y="-30" width="60" height="7" rx="3" fill="#FFCA54" stroke="#1A1320" stroke-width="2.5"/>
</g></g>
<g class="coin"><circle cx="0" cy="0" r="18" fill="#E4DEE9" stroke="#1A1320" stroke-width="3"/><text x="0" y="5" text-anchor="middle" class="lbl">M12</text></g></svg></figure>

<ul class="chips"><li class="star">41.0k stars</li><li class="who"><a href="https://github.com/Navaneeth-pk" target="_blank" rel="noopener noreferrer"><img src="https://github.com/Navaneeth-pk.png?size=64" alt="" width="22" height="22" loading="lazy"/>Navaneeth Padanna Kalathil</a></li><li>Self hostable</li></ul>

[ToolJet](https://github.com/ToolJet/ToolJet) builds internal tools, dashboards, business apps and AI agents, and describes itself as an enterprise app generation platform. Founder Navaneeth Padanna Kalathil had already sold an earlier startup to Freshworks. The best detail: ToolJet has raised money from M12, Microsoft's own venture fund. So Microsoft is, in a small way, paying for its competition. We love that for everyone.

## 6. Khoj vs Google's Gemini Deep Research

<p class="vs">Your own research assistant vs Google's</p>

<figure class="stage"><svg viewBox="0 0 640 280" role="img" aria-label="Khoj: a detective mascot sweeps a magnifying glass over notes, PDFs and a globe, and sparkles pop where the answer is found"><rect width="100%" height="100%" fill="#FFF8E7"/><line x1="0" y1="250" x2="640" y2="250" stroke="#1A1320" stroke-width="2.5" stroke-dasharray="2 9" stroke-linecap="round"/>
<g transform="translate(180,200)"><rect x="-32" y="-42" width="64" height="80" rx="6" fill="#C9B6E4" stroke="#1A1320" stroke-width="2.5"/><line x1="-20" y1="-20" x2="20" y2="-20" stroke="#1A1320" stroke-width="2" opacity=".5"/><line x1="-20" y1="-6" x2="20" y2="-6" stroke="#1A1320" stroke-width="2" opacity=".5"/><line x1="-20" y1="8" x2="20" y2="8" stroke="#1A1320" stroke-width="2" opacity=".5"/><text x="0" y="30" text-anchor="middle" class="lbl">PDF</text></g><g transform="translate(270,200)"><rect x="-32" y="-42" width="64" height="80" rx="6" fill="#FCFAF0" stroke="#1A1320" stroke-width="2.5"/><line x1="-20" y1="-20" x2="20" y2="-20" stroke="#1A1320" stroke-width="2" opacity=".5"/><line x1="-20" y1="-6" x2="20" y2="-6" stroke="#1A1320" stroke-width="2" opacity=".5"/><line x1="-20" y1="8" x2="20" y2="8" stroke="#1A1320" stroke-width="2" opacity=".5"/><text x="0" y="30" text-anchor="middle" class="lbl">notes</text></g><g transform="translate(360,200)"><rect x="-32" y="-42" width="64" height="80" rx="6" fill="#A9D4F5" stroke="#1A1320" stroke-width="2.5"/><line x1="-20" y1="-20" x2="20" y2="-20" stroke="#1A1320" stroke-width="2" opacity=".5"/><line x1="-20" y1="-6" x2="20" y2="-6" stroke="#1A1320" stroke-width="2" opacity=".5"/><line x1="-20" y1="8" x2="20" y2="8" stroke="#1A1320" stroke-width="2" opacity=".5"/><text x="0" y="30" text-anchor="middle" class="lbl">web</text></g><g transform="translate(450,200)"><rect x="-32" y="-42" width="64" height="80" rx="6" fill="#9ED9B8" stroke="#1A1320" stroke-width="2.5"/><line x1="-20" y1="-20" x2="20" y2="-20" stroke="#1A1320" stroke-width="2" opacity=".5"/><line x1="-20" y1="-6" x2="20" y2="-6" stroke="#1A1320" stroke-width="2" opacity=".5"/><line x1="-20" y1="8" x2="20" y2="8" stroke="#1A1320" stroke-width="2" opacity=".5"/><text x="0" y="30" text-anchor="middle" class="lbl">docs</text></g>
<g class="sweep"><g transform="translate(180,150)"><circle r="36" fill="#FCFAF0" fill-opacity=".45" stroke="#1A1320" stroke-width="4"/><line x1="26" y1="26" x2="56" y2="56" stroke="#1A1320" stroke-width="9" stroke-linecap="round"/></g></g>
<g transform="translate(366,120)"><path class="spark" style="animation-delay:0s" d="M0,-12 L3,-3 L12,0 L3,3 L0,12 L-3,3 L-12,0 L-3,-3Z" fill="#FFCA54" stroke="#1A1320" stroke-width="2"/></g><g transform="translate(378,98)"><path class="spark" style="animation-delay:0.5s" d="M0,-12 L3,-3 L12,0 L3,3 L0,12 L-3,3 L-12,0 L-3,-3Z" fill="#FFCA54" stroke="#1A1320" stroke-width="2"/></g>
<g transform="translate(70,206) scale(0.9,0.9)"><g class="bob" style="animation-delay:0s">
<path d="M-10,28 v11 M10,28 v11" stroke="#1A1320" stroke-width="3.2" stroke-linecap="round"/>
<path d="M-27,14 C-30,-22 -17,-38 0,-38 C17,-38 30,-22 27,14 C24,33 -24,33 -27,14Z" fill="#E8A33D" stroke="#1A1320" stroke-width="3"/>
<g class="blink" style="animation-delay:0s"><circle cx="-8" cy="-13" r="3.6" fill="#1A1320"/><circle cx="8" cy="-13" r="3.6" fill="#1A1320"/></g>
<ellipse cx="-16" cy="-3" rx="5" ry="3" fill="#F29E4C" opacity=".45"/><ellipse cx="16" cy="-3" rx="5" ry="3" fill="#F29E4C" opacity=".45"/>
<path d="M-5,-2 Q0,4 5,-2" fill="none" stroke="#1A1320" stroke-width="2.6" stroke-linecap="round"/><path d="M-30,-30 H30 L22,-38 H-22Z" fill="#1A1320"/><path d="M-20,-38 Q0,-62 20,-38Z" fill="#1A1320"/>
</g></g>
<g transform="translate(580,150)"><g class="sway">
<line x1="0" y1="-35" x2="0" y2="-53" stroke="#1A1320" stroke-width="3"/><circle cx="0" cy="-57" r="6" fill="#B9B0C4" stroke="#1A1320" stroke-width="3"/>
<rect x="-35" y="-35" width="70" height="70" rx="14" fill="#E4DEE9" stroke="#1A1320" stroke-width="3"/>
<rect x="-23" y="-21" width="46" height="36" rx="8" fill="#B9B0C4" stroke="#1A1320" stroke-width="2.5"/>
<g class="blink"><circle cx="-14" cy="-1" r="6" fill="#1A1320"/><circle cx="14" cy="-1" r="6" fill="#1A1320"/><circle cx="-12" cy="-3" r="1.8" fill="#FCFAF0"/><circle cx="16" cy="-3" r="1.8" fill="#FCFAF0"/></g>
<path d="M-23,-11 l16,-5 M23,-11 l-16,-5" stroke="#1A1320" stroke-width="3" stroke-linecap="round"/><path d="M-8,10 q8,-5 16,0" fill="none" stroke="#1A1320" stroke-width="2.5" stroke-linecap="round"/>
</g></g></svg></figure>

<ul class="chips"><li class="star">37.5k stars</li><li class="who"><a href="https://github.com/debanjum" target="_blank" rel="noopener noreferrer"><img src="https://github.com/debanjum.png?size=64" alt="" width="22" height="22" loading="lazy"/>Debanjum Singh Solanky</a></li><li class="who"><a href="https://github.com/sabaimran" target="_blank" rel="noopener noreferrer"><img src="https://github.com/sabaimran.png?size=64" alt="" width="22" height="22" loading="lazy"/>Saba Imran</a></li><li>Self hostable</li></ul>

Khoj is Hindi for "search", which is a pretty good summary. [Khoj](https://github.com/khoj-ai/khoj) is an AI second brain that does deep research across the web and your own notes and PDFs, schedules automations, and works with any online or local model. Its founders, Debanjum Singh Solanky and Saba Imran, both worked on Cortana at Microsoft before leaving to build the open version.

## 7. Chatwoot vs Salesforce's Agentforce

<p class="vs">Open support desk with an AI agent vs the enterprise suite</p>

<figure class="stage"><svg viewBox="0 0 640 280" role="img" aria-label="Chatwoot: a mascot in a captain's hat answers chat bubbles arriving from email, web and phone icons in quick succession"><rect width="100%" height="100%" fill="#FFF8E7"/><line x1="0" y1="250" x2="640" y2="250" stroke="#1A1320" stroke-width="2.5" stroke-dasharray="2 9" stroke-linecap="round"/>
<g transform="translate(70,70)"><rect x="-24" y="-20" width="48" height="40" rx="10" fill="#FCFAF0" stroke="#1A1320" stroke-width="2.5"/><path d="M-14,-9 H14 V9 H-14Z M-14,-9 L0,2 L14,-9" fill="none" stroke="#1A1320" stroke-width="2"/></g><g transform="translate(70,140)"><rect x="-24" y="-20" width="48" height="40" rx="10" fill="#FCFAF0" stroke="#1A1320" stroke-width="2.5"/><circle r="11" fill="none" stroke="#1A1320" stroke-width="2"/><ellipse rx="5" ry="11" fill="none" stroke="#1A1320" stroke-width="2"/><line x1="-11" y1="0" x2="11" y2="0" stroke="#1A1320" stroke-width="2"/></g><g transform="translate(70,210)"><rect x="-24" y="-20" width="48" height="40" rx="10" fill="#FCFAF0" stroke="#1A1320" stroke-width="2.5"/><rect x="-7" y="-12" width="14" height="24" rx="3" fill="none" stroke="#1A1320" stroke-width="2"/></g>
<g transform="translate(130,70)"><g class="msg" style="animation-delay:0s"><path d="M0,-14 H80 Q90,-14 90,-4 V6 Q90,16 80,16 H14 L4,24 L6,16 Q0,16 0,6Z" fill="#A9D4F5" stroke="#1A1320" stroke-width="2.5"/><circle cx="30" cy="1" r="3" fill="#1A1320"/><circle cx="45" cy="1" r="3" fill="#1A1320"/><circle cx="60" cy="1" r="3" fill="#1A1320"/></g></g><g transform="translate(130,140)"><g class="msg" style="animation-delay:1.2s"><path d="M0,-14 H80 Q90,-14 90,-4 V6 Q90,16 80,16 H14 L4,24 L6,16 Q0,16 0,6Z" fill="#A9D4F5" stroke="#1A1320" stroke-width="2.5"/><circle cx="30" cy="1" r="3" fill="#1A1320"/><circle cx="45" cy="1" r="3" fill="#1A1320"/><circle cx="60" cy="1" r="3" fill="#1A1320"/></g></g><g transform="translate(130,210)"><g class="msg" style="animation-delay:2.4s"><path d="M0,-14 H80 Q90,-14 90,-4 V6 Q90,16 80,16 H14 L4,24 L6,16 Q0,16 0,6Z" fill="#A9D4F5" stroke="#1A1320" stroke-width="2.5"/><circle cx="30" cy="1" r="3" fill="#1A1320"/><circle cx="45" cy="1" r="3" fill="#1A1320"/><circle cx="60" cy="1" r="3" fill="#1A1320"/></g></g>
<g transform="translate(300,60)"><g class="reply" style="animation-delay:0.6s"><path d="M0,-14 H90 Q100,-14 100,-4 V6 Q100,16 90,16 H-4 Q4,10 0,6Z" fill="#FFCA54" stroke="#1A1320" stroke-width="2.5"/><path d="M40,1 l6,6 l12,-12" fill="none" stroke="#1A1320" stroke-width="2.5" stroke-linecap="round"/></g></g><g transform="translate(300,130)"><g class="reply" style="animation-delay:1.7999999999999998s"><path d="M0,-14 H90 Q100,-14 100,-4 V6 Q100,16 90,16 H-4 Q4,10 0,6Z" fill="#FFCA54" stroke="#1A1320" stroke-width="2.5"/><path d="M40,1 l6,6 l12,-12" fill="none" stroke="#1A1320" stroke-width="2.5" stroke-linecap="round"/></g></g><g transform="translate(300,200)"><g class="reply" style="animation-delay:3s"><path d="M0,-14 H90 Q100,-14 100,-4 V6 Q100,16 90,16 H-4 Q4,10 0,6Z" fill="#FFCA54" stroke="#1A1320" stroke-width="2.5"/><path d="M40,1 l6,6 l12,-12" fill="none" stroke="#1A1320" stroke-width="2.5" stroke-linecap="round"/></g></g>
<g transform="translate(500,206) scale(1,1)"><g class="bob" style="animation-delay:0s">
<path d="M-10,28 v11 M10,28 v11" stroke="#1A1320" stroke-width="3.2" stroke-linecap="round"/>
<path d="M-27,14 C-30,-22 -17,-38 0,-38 C17,-38 30,-22 27,14 C24,33 -24,33 -27,14Z" fill="#5B9BD5" stroke="#1A1320" stroke-width="3"/>
<g class="blink" style="animation-delay:0s"><circle cx="-8" cy="-13" r="3.6" fill="#1A1320"/><circle cx="8" cy="-13" r="3.6" fill="#1A1320"/></g>
<ellipse cx="-16" cy="-3" rx="5" ry="3" fill="#F29E4C" opacity=".45"/><ellipse cx="16" cy="-3" rx="5" ry="3" fill="#F29E4C" opacity=".45"/>
<path d="M-7,-3 Q0,7 7,-3 Z" fill="#1A1320"/><path d="M-30,-30 Q0,-46 30,-30 L26,-24 H-26Z" fill="#FCFAF0" stroke="#1A1320" stroke-width="3"/><rect x="-28" y="-30" width="56" height="7" fill="#1A1320"/><circle cx="0" cy="-37" r="4" fill="#FFCA54" stroke="#1A1320" stroke-width="1.5"/>
</g></g>
<g transform="translate(590,110)"><g class="swing"><g transform="translate(0,0)"><g class="swing" style="animation-delay:0s"><line x1="0" y1="-26" x2="0" y2="-8" stroke="#1A1320" stroke-width="2"/><path d="M-34,-8 H26 L40,10 L26,28 H-34 Z" fill="#E4DEE9" stroke="#1A1320" stroke-width="2.5"/><circle cx="26" cy="10" r="3.5" fill="#FCFAF0" stroke="#1A1320" stroke-width="2"/><text x="-4" y="16" text-anchor="middle" class="lbl">per seat</text></g></g></g></g></svg></figure>

<ul class="chips"><li class="star">37.2k stars</li><li class="who"><a href="https://github.com/pranavrajs" target="_blank" rel="noopener noreferrer"><img src="https://github.com/pranavrajs.png?size=64" alt="" width="22" height="22" loading="lazy"/>Pranav Raj S</a></li><li class="who"><a href="https://github.com/sojan-official" target="_blank" rel="noopener noreferrer"><img src="https://github.com/sojan-official.png?size=64" alt="" width="22" height="22" loading="lazy"/>Sojan Jose</a></li><li class="who"><a href="https://github.com/nithindavid" target="_blank" rel="noopener noreferrer"><img src="https://github.com/nithindavid.png?size=64" alt="" width="22" height="22" loading="lazy"/>Nithin David Thomas</a></li><li>Kerala roots</li></ul>

[Chatwoot](https://github.com/chatwoot/chatwoot) is an open source support desk for live chat, email, WhatsApp and more, and it lists Intercom, Zendesk and Salesforce Service Cloud as the things it replaces. Its AI agent, Captain, answers common questions and suggests replies to human agents. It was founded in 2017 by Pranav Raj S, Sojan Jose and Nithin David Thomas. Pranav studied at the College of Engineering, Trivandrum, and Sojan built product at Freshworks before this.

## 8. SigNoz vs Datadog

<p class="vs">Open observability vs the famous bill</p>

<figure class="stage"><svg viewBox="0 0 640 280" role="img" aria-label="SigNoz: a mascot doctor listens to a server rack while a heartbeat line scrolls on a monitor; on the right a long grey bill keeps unrolling"><rect width="100%" height="100%" fill="#FFF8E7"/><line x1="0" y1="250" x2="640" y2="250" stroke="#1A1320" stroke-width="2.5" stroke-dasharray="2 9" stroke-linecap="round"/>
<g transform="translate(250,110)"><rect x="-120" y="-70" width="240" height="120" rx="10" fill="#1A1320"/><rect x="-110" y="-60" width="220" height="100" rx="6" fill="#241B2C"/><path class="beat" d="M-104,-10 H-60 L-48,-40 L-34,26 L-22,-10 H10 L20,-26 L30,6 L40,-10 H104" fill="none" stroke="#9ED9B8" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/></g>
<g transform="translate(120,206)"><rect x="-30" y="-44" width="60" height="84" rx="6" fill="#E4DEE9" stroke="#1A1320" stroke-width="3"/><rect x="-20" y="-34" width="40" height="14" rx="3" fill="#FCFAF0" stroke="#1A1320" stroke-width="2"/><circle class="led" style="animation-delay:0s" cx="12" cy="-27" r="3" fill="#9ED9B8"/><rect x="-20" y="-10" width="40" height="14" rx="3" fill="#FCFAF0" stroke="#1A1320" stroke-width="2"/><circle class="led" style="animation-delay:0.3s" cx="12" cy="-3" r="3" fill="#9ED9B8"/><rect x="-20" y="14" width="40" height="14" rx="3" fill="#FCFAF0" stroke="#1A1320" stroke-width="2"/><circle class="led" style="animation-delay:0.6s" cx="12" cy="21" r="3" fill="#9ED9B8"/></g>
<g transform="translate(230,212) scale(0.85,0.85)"><g class="bob" style="animation-delay:0s">
<path d="M-10,28 v11 M10,28 v11" stroke="#1A1320" stroke-width="3.2" stroke-linecap="round"/>
<path d="M-27,14 C-30,-22 -17,-38 0,-38 C17,-38 30,-22 27,14 C24,33 -24,33 -27,14Z" fill="#9ED9B8" stroke="#1A1320" stroke-width="3"/>
<g class="blink" style="animation-delay:0s"><circle cx="-8" cy="-13" r="3.6" fill="#1A1320"/><circle cx="8" cy="-13" r="3.6" fill="#1A1320"/></g>
<ellipse cx="-16" cy="-3" rx="5" ry="3" fill="#F29E4C" opacity=".45"/><ellipse cx="16" cy="-3" rx="5" ry="3" fill="#F29E4C" opacity=".45"/>
<path d="M-5,-2 Q0,4 5,-2" fill="none" stroke="#1A1320" stroke-width="2.6" stroke-linecap="round"/><path d="M-14,10 Q-38,40 -64,8" fill="none" stroke="#1A1320" stroke-width="3"/><circle cx="-66" cy="6" r="6" fill="#B9B0C4" stroke="#1A1320" stroke-width="2.5"/>
</g></g>
<g transform="translate(520,50)"><rect x="-60" y="-10" width="120" height="16" rx="8" fill="#B9B0C4" stroke="#1A1320" stroke-width="3"/><g class="unroll"><rect x="-50" y="6" width="100" height="190" fill="#FCFAF0" stroke="#1A1320" stroke-width="2.5"/><line x1="-38" y1="24" x2="38" y2="24" stroke="#8E849B" stroke-width="2"/><line x1="-38" y1="42" x2="38" y2="42" stroke="#8E849B" stroke-width="2"/><line x1="-38" y1="60" x2="10" y2="60" stroke="#8E849B" stroke-width="2"/><line x1="-38" y1="78" x2="38" y2="78" stroke="#8E849B" stroke-width="2"/><line x1="-38" y1="96" x2="38" y2="96" stroke="#8E849B" stroke-width="2"/><line x1="-38" y1="114" x2="10" y2="114" stroke="#8E849B" stroke-width="2"/><line x1="-38" y1="132" x2="38" y2="132" stroke="#8E849B" stroke-width="2"/><line x1="-38" y1="150" x2="38" y2="150" stroke="#8E849B" stroke-width="2"/><line x1="-38" y1="168" x2="10" y2="168" stroke="#8E849B" stroke-width="2"/><text x="0" y="192" text-anchor="middle" class="lbl">total: $$$$</text></g></g></svg></figure>

<ul class="chips"><li class="star">32.2k stars</li><li class="who"><a href="https://github.com/pranay01" target="_blank" rel="noopener noreferrer"><img src="https://github.com/pranay01.png?size=64" alt="" width="22" height="22" loading="lazy"/>Pranay Prateek</a></li><li class="who"><a href="https://github.com/ankitnayan" target="_blank" rel="noopener noreferrer"><img src="https://github.com/ankitnayan.png?size=64" alt="" width="22" height="22" loading="lazy"/>Ankit Nayan</a></li><li>Bengaluru</li></ul>

TechCrunch literally called [SigNoz](https://github.com/SigNoz/signoz) the "open source Datadog rival". It gives your team, and now your AI agents, logs, metrics and traces in one tool, built on OpenTelemetry, which you can run yourself. Pranay Prateek (IIT Madras, IIM Ahmedabad) and Ankit Nayan (IIT Delhi) started it in Bengaluru in 2020. If you have ever opened an observability invoice and sat very still for a minute, you already get the appeal.

## 9. Supermemory vs Google's NotebookLM

<p class="vs">A memory engine you can run locally vs Google's notebook</p>

<figure class="stage"><svg viewBox="0 0 640 280" role="img" aria-label="Supermemory: a lilac mascot wearing a yellow cape catches flying bookmarks, notes and links and tucks them into its memory"><rect width="100%" height="100%" fill="#FFF8E7"/><line x1="0" y1="250" x2="640" y2="250" stroke="#1A1320" stroke-width="2.5" stroke-dasharray="2 9" stroke-linecap="round"/>
<g transform="translate(300,206)"><g class="bob"><path class="cape" d="M-24,-20 C-60,0 -70,30 -52,40 L24,30 Z" fill="#FFCA54" stroke="#1A1320" stroke-width="3"/></g></g>
<g transform="translate(300,206) scale(1,1)"><g class="bob" style="animation-delay:0s">
<path d="M-10,28 v11 M10,28 v11" stroke="#1A1320" stroke-width="3.2" stroke-linecap="round"/>
<path d="M-27,14 C-30,-22 -17,-38 0,-38 C17,-38 30,-22 27,14 C24,33 -24,33 -27,14Z" fill="#C9B6E4" stroke="#1A1320" stroke-width="3"/>
<g class="blink" style="animation-delay:0s"><circle cx="-8" cy="-13" r="3.6" fill="#1A1320"/><circle cx="8" cy="-13" r="3.6" fill="#1A1320"/></g>
<ellipse cx="-16" cy="-3" rx="5" ry="3" fill="#F29E4C" opacity=".45"/><ellipse cx="16" cy="-3" rx="5" ry="3" fill="#F29E4C" opacity=".45"/>
<path d="M-7,-3 Q0,7 7,-3 Z" fill="#1A1320"/><path d="M-16,-40 C-26,-60 -4,-62 0,-50 C4,-62 26,-60 16,-40" fill="none" stroke="#1A1320" stroke-width="2.5"/>
</g></g>
<g class="fly f0"><rect x="-26" y="-16" width="52" height="32" rx="6" fill="#A9D4F5" stroke="#1A1320" stroke-width="2.5"/><text x="0" y="5" text-anchor="middle" class="lbl">link</text></g><g class="fly f1"><rect x="-26" y="-16" width="52" height="32" rx="6" fill="#9ED9B8" stroke="#1A1320" stroke-width="2.5"/><text x="0" y="5" text-anchor="middle" class="lbl">note</text></g><g class="fly f2"><rect x="-26" y="-16" width="52" height="32" rx="6" fill="#FCFAF0" stroke="#1A1320" stroke-width="2.5"/><text x="0" y="5" text-anchor="middle" class="lbl">tweet</text></g><g class="fly f3"><rect x="-26" y="-16" width="52" height="32" rx="6" fill="#F29E4C" stroke="#1A1320" stroke-width="2.5"/><text x="0" y="5" text-anchor="middle" class="lbl">pdf</text></g></svg></figure>

<ul class="chips"><li class="star">30.9k stars</li><li class="who"><a href="https://github.com/Dhravya" target="_blank" rel="noopener noreferrer"><img src="https://github.com/Dhravya.png?size=64" alt="" width="22" height="22" loading="lazy"/>Dhravya Shah</a></li><li>From Mumbai</li></ul>

[Supermemory](https://github.com/supermemoryai/supermemory) is a memory and context engine with an app on top for your links, notes and files, plus a memory API developers can build on. It can run fully on your own machine. Dhravya Shah grew up in Mumbai, skipped the IIT entrance exam, and built the first version during a challenge to ship something new every week for 40 weeks. He raised his seed round at 19. One of his angel investors is Jeff Dean, Google's AI chief. Google, again, funding the other side.

## 10. Composio vs OpenAI's connectors

<p class="vs">1000+ tools for any agent vs tools for one assistant</p>

<figure class="stage"><svg viewBox="0 0 640 280" role="img" aria-label="Composio: a friendly blue octopus plugs its arms into eight different app tiles, and each plug lights up in turn"><rect width="100%" height="100%" fill="#FFF8E7"/><line x1="0" y1="250" x2="640" y2="250" stroke="#1A1320" stroke-width="2.5" stroke-dasharray="2 9" stroke-linecap="round"/>
<path class="arm" style="animation-delay:0s" d="M281.25667355485473,191.0262022567029 Q194.08418905327795,225.0786067701087 103.03737190718664,195.21485850496381" fill="none" stroke="#5B9BD5" stroke-width="10" stroke-linecap="round"/>
<g transform="translate(77.85420971784222,188.7489214386776)"><rect x="-22" y="-22" width="44" height="44" rx="10" fill="#C9B6E4" stroke="#1A1320" stroke-width="2.5"/><circle class="plug" style="animation-delay:0s" r="7" fill="#FCFAF0" stroke="#1A1320" stroke-width="2"/></g><path class="arm" style="animation-delay:0.15s" d="M287.6393202250021,184.24429495415055 Q214.8277907312568,204.7328848624516 138.78019326001177,139.6032186240344" fill="none" stroke="#5B9BD5" stroke-width="10" stroke-linecap="round"/>
<g transform="translate(117.74575140626314,124.3208020644301)"><rect x="-22" y="-22" width="44" height="44" rx="10" fill="#A9D4F5" stroke="#1A1320" stroke-width="2.5"/><circle class="plug" style="animation-delay:0.35s" r="7" fill="#FCFAF0" stroke="#1A1320" stroke-width="2"/></g><path class="arm" style="animation-delay:0.3s" d="M298.56692820084015,179.1134414899597 Q250.34251665273047,189.34032446987908 199.97479792470477,97.53022021766954" fill="none" stroke="#5B9BD5" stroke-width="10" stroke-linecap="round"/>
<g transform="translate(186.04330125525087,75.57769415461715)"><rect x="-22" y="-22" width="44" height="44" rx="10" fill="#FFCA54" stroke="#1A1320" stroke-width="2.5"/><circle class="plug" style="animation-delay:0.7s" r="7" fill="#FCFAF0" stroke="#1A1320" stroke-width="2"/></g><path class="arm" style="animation-delay:0.44999999999999996s" d="M312.50474741657104,176.35425498542622 Q295.6404291038558,181.06276495627867 278.02658553279764,74.90489088049506" fill="none" stroke="#5B9BD5" stroke-width="10" stroke-linecap="round"/>
<g transform="translate(273.1546713535688,49.36542236154915)"><rect x="-22" y="-22" width="44" height="44" rx="10" fill="#9ED9B8" stroke="#1A1320" stroke-width="2.5"/><circle class="plug" style="animation-delay:1.0499999999999998s" r="7" fill="#FCFAF0" stroke="#1A1320" stroke-width="2"/></g><path class="arm" style="animation-delay:0.6s" d="M327.49525258342896,176.35425498542622 Q344.3595708961442,181.06276495627867 361.97341446720225,74.90489088049506" fill="none" stroke="#5B9BD5" stroke-width="10" stroke-linecap="round"/>
<g transform="translate(366.8453286464311,49.36542236154915)"><rect x="-22" y="-22" width="44" height="44" rx="10" fill="#F29E4C" stroke="#1A1320" stroke-width="2.5"/><circle class="plug" style="animation-delay:1.4s" r="7" fill="#FCFAF0" stroke="#1A1320" stroke-width="2"/></g><path class="arm" style="animation-delay:0.75s" d="M341.43307179915985,179.1134414899597 Q389.65748334726953,189.34032446987908 440.0252020752952,97.53022021766952" fill="none" stroke="#5B9BD5" stroke-width="10" stroke-linecap="round"/>
<g transform="translate(453.95669874474913,75.57769415461712)"><rect x="-22" y="-22" width="44" height="44" rx="10" fill="#C9B6E4" stroke="#1A1320" stroke-width="2.5"/><circle class="plug" style="animation-delay:1.75s" r="7" fill="#FCFAF0" stroke="#1A1320" stroke-width="2"/></g><path class="arm" style="animation-delay:0.8999999999999999s" d="M352.3606797749979,184.24429495415055 Q425.17220926874313,204.7328848624516 501.21980673998826,139.60321862403438" fill="none" stroke="#5B9BD5" stroke-width="10" stroke-linecap="round"/>
<g transform="translate(522.2542485937369,124.32080206443008)"><rect x="-22" y="-22" width="44" height="44" rx="10" fill="#A9D4F5" stroke="#1A1320" stroke-width="2.5"/><circle class="plug" style="animation-delay:2.0999999999999996s" r="7" fill="#FCFAF0" stroke="#1A1320" stroke-width="2"/></g><path class="arm" style="animation-delay:1.05s" d="M358.7433264451452,191.0262022567029 Q445.915810946722,225.07860677010868 536.9626280928134,195.21485850496376" fill="none" stroke="#5B9BD5" stroke-width="10" stroke-linecap="round"/>
<g transform="translate(562.1457902821578,188.7489214386775)"><rect x="-22" y="-22" width="44" height="44" rx="10" fill="#FFCA54" stroke="#1A1320" stroke-width="2.5"/><circle class="plug" style="animation-delay:2.4499999999999997s" r="7" fill="#FCFAF0" stroke="#1A1320" stroke-width="2"/></g>
<g transform="translate(320,200)"><g class="bob"><path d="M-54,14 C-60,-40 -30,-66 0,-66 C30,-66 60,-40 54,14 C40,30 -40,30 -54,14Z" fill="#A9D4F5" stroke="#1A1320" stroke-width="3"/><g class="blink"><circle cx="-14" cy="-24" r="5" fill="#1A1320"/><circle cx="14" cy="-24" r="5" fill="#1A1320"/></g><ellipse cx="-28" cy="-10" rx="7" ry="4" fill="#F29E4C" opacity=".45"/><ellipse cx="28" cy="-10" rx="7" ry="4" fill="#F29E4C" opacity=".45"/><path d="M-8,-10 Q0,-2 8,-10" fill="none" stroke="#1A1320" stroke-width="3" stroke-linecap="round"/></g></g></svg></figure>

<ul class="chips"><li class="star">30.3k stars</li><li class="who"><a href="https://github.com/sohamganatra" target="_blank" rel="noopener noreferrer"><img src="https://github.com/sohamganatra.png?size=64" alt="" width="22" height="22" loading="lazy"/>Soham Ganatra</a></li><li class="who"><a href="https://github.com/kaavee315" target="_blank" rel="noopener noreferrer"><img src="https://github.com/kaavee315.png?size=64" alt="" width="22" height="22" loading="lazy"/>Karan Vaidya</a></li><li>IIT Bombay grads</li></ul>

An agent that cannot touch your apps is just a chatbot with ambition. [Composio](https://github.com/ComposioHQ/composio) gives agents 1000+ toolkits with login and permissions handled, so they can act inside GitHub, HubSpot and the rest, with any model and any framework. Soham Ganatra and Karan Vaidya were physics Olympiad teammates in 2013, went through IIT Bombay together, and started Composio in 2023.

## What this list is not

It is not a ranking of quality. It is not a claim that any of these projects has beaten the company it is lined up against. Some of those companies are worth a trillion dollars and will be fine. The point is simpler: in almost every corner of AI, there is now an open source option started by an Indian team, and plenty of developers are choosing it.

A few of these companies now have a US office or headquarters. We counted a project if Indian founders or developers started it.

Missed one? We almost certainly did. Tell us on [GitHub](https://github.com/chaitanyagiri/munder-difflin) and we will look at it for the next list.

</div>
