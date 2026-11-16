/* Bright coded scenes for "Browser Use alternatives". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88";
  const PALE = "#D5EFFF", GREY = "#DCD6E3";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  let uid = 0;
  const nid = (p) => `mg-${p}-${++uid}`;
  const tw = (n) => { try { return n.getComputedTextLength() || n.textContent.length * 12; } catch (e) { return n.textContent.length * 12; } };
  const ring = (p, x, y, w, h, rx) => el("rect", { x, y, width: w, height: h, rx, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, p);

  const SC = {};

  /* ---- 1. the colander: a tall 0.x stack shakes down to a short 1.0 stack ---- */
  SC.colander = {
    dur: 9.5, still: 9.5,
    build(svg, api) {
      const FL = 322, BH = 22, BW = 160, N = 10, GONE = 8;
      el("path", { d: "M356 0 V30 M444 0 V30", stroke: INK, "stroke-width": 2.5 }, svg);
      el("rect", { x: 328, y: 26, width: 144, height: 56, rx: 14, fill: SKY, stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 400, 65, "0.x", { "text-anchor": "middle", "font-family": MONO, "font-size": 32, "font-weight": 700 });
      // the pale blue bowl: back, the fallen bits, then the front with its label
      el("ellipse", { cx: 400, cy: 500, rx: 170, ry: 16, fill: SKY, stroke: INK, "stroke-width": 3 }, svg);
      const PILE = [];
      [9, 7, 5, 3].forEach((n, r) => { for (let k = 0; k < n; k++) PILE.push([400 + (k - (n - 1) / 2) * 17, 497 - r * 12]); });
      const HOLES = [350, 375, 400, 425, 450];
      const bits = PILE.map((p, n) => {
        const j = Math.floor(n / 3), b = n % 3;
        return { n: el("rect", { x: -6.5, y: -6.5, width: 13, height: 13, rx: 3, fill: LIL, stroke: INK, "stroke-width": 2, opacity: 0 }, svg), p, j, b, hx: HOLES[(j + b * 2) % 5], r: ((n * 37) % 30) - 15 };
      });
      el("path", { d: "M230 500 A170 16 0 0 0 570 500 Q564 580 470 584 H330 Q236 580 230 500 Z", fill: PALE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      txt(svg, 400, 558, "80% deleted", { "text-anchor": "middle", "font-size": 26, "font-weight": 700 });
      // the mint colander and its stack, shaken together
      const cid = nid("clip"), cp = el("clipPath", { id: cid, clipPathUnits: "userSpaceOnUse" }, el("defs", {}, svg));
      el("rect", { x: 0, y: 0, width: 800, height: FL }, cp);
      const sh = el("g", {}, svg);
      el("rect", { x: 186, y: 96, width: 428, height: 336, fill: "#fff", "fill-opacity": 0 }, sh);
      const stack = el("g", { "clip-path": `url(#${cid})` }, sh);
      const blocks = Array.from({ length: N }, () => el("rect", { x: 400 - BW / 2, y: 0, width: BW, height: BH, rx: 5, fill: LIL, stroke: INK, "stroke-width": 2.5 }, stack));
      el("rect", { x: 192, y: 321, width: 40, height: 14, rx: 7, fill: MINT, stroke: INK, "stroke-width": 3 }, sh);
      el("rect", { x: 568, y: 321, width: 40, height: 14, rx: 7, fill: MINT, stroke: INK, "stroke-width": 3 }, sh);
      el("path", { d: "M236 328 Q244 420 330 424 H470 Q556 420 564 328 Z", fill: MINT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, sh);
      [[360, 270, 11], [388, 296, 9], [412, 350, 5]].forEach(([y, x0, n]) => { for (let k = 0; k < n; k++) el("circle", { cx: x0 + k * (n === 5 ? 25 : 26), cy: y, r: 5, fill: "#fff", stroke: INK, "stroke-width": 2 }, sh); });
      el("rect", { x: 222, y: 320, width: 356, height: 16, rx: 8, fill: MINT, stroke: INK, "stroke-width": 3 }, sh);
      ring(sh, 180, 306, 440, 132, 24);
      button(sh, "Refill the colander and shake it again", () => api.seek(0));
      // the yellow tag on the short stack that stays
      const tag = el("g", { opacity: 0 }, svg);
      el("path", { d: "M480 300 L527 263", stroke: INK, "stroke-width": 2 }, tag);
      el("path", { d: "M532 238 H732 Q742 238 742 248 V276 Q742 286 732 286 H532 L512 262 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, tag);
      el("circle", { cx: 528, cy: 262, r: 4.5, fill: "#fff", stroke: INK, "stroke-width": 2 }, tag);
      txt(tag, 546, 269, "1.0 REPL on CDP", { "font-family": MONO, "font-size": 19, "font-weight": 700 });
      const A = (j) => 1.9 + j * 0.42;
      return (t) => {
        let dr = 0;
        for (let j = 0; j < GONE; j++) dr += io(seg(t, A(j), A(j) + 0.36));
        blocks.forEach((b, i) => {
          const r0 = 0.1 + i * 0.11, k = oc(seg(t, r0, r0 + 0.3));
          b.setAttribute("y", FL - (i + 1) * BH + dr * BH - 18 * (1 - k));
          b.setAttribute("opacity", seg(t, r0, r0 + 0.15));
        });
        const env = seg(t, 1.5, 1.9) * (1 - seg(t, 5.1, 5.5));
        sh.setAttribute("transform", `translate(${Math.sin(t * 34) * 6 * env} 0) rotate(${Math.sin(t * 34 + 1) * 1.4 * env} 400 372)`);
        bits.forEach((o) => {
          const e = A(o.j) + 0.22 + o.b * 0.07, q = seg(t, e, e + 0.42);
          tf(o.n, o.hx + (o.p[0] - o.hx) * q, 418 + (o.p[1] - 418) * q * q, 1, o.r * q);
          o.n.setAttribute("opacity", q > 0 ? 1 : 0);
        });
        const k = ob(seg(t, 5.6, 6.2));
        tag.setAttribute("transform", `translate(512 262) scale(${k}) translate(-512 -262)`);
        tag.setAttribute("opacity", cl(k * 3));
      };
    },
  };

  /* ---- 2. the trampoline: the cheap coin hops, the default coin springs 15 times higher ---- */
  SC.trampoline = {
    dur: 4.8, still: 4.8,
    build(svg, api) {
      el("path", { d: "M60 182 H740", stroke: YEL, "stroke-width": 10, "stroke-linecap": "round" }, svg);
      el("rect", { x: 56, y: 160, width: 140, height: 44, rx: 22, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 126, 190, "15 times", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
      el("ellipse", { cx: 400, cy: 566, rx: 290, ry: 12, fill: SOFT }, svg);
      const tr = el("g", {}, svg);
      el("rect", { x: 120, y: 430, width: 560, height: 150, fill: "#fff", "fill-opacity": 0 }, tr);
      ring(tr, 114, 424, 572, 162, 24);
      el("path", { d: "M170 476 L150 562 M188 476 L208 562 M630 476 L650 562 M612 476 L592 562", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, tr);
      const matO = el("path", { fill: "none", stroke: INK, "stroke-width": 18, "stroke-linecap": "round" }, tr);
      const mat = el("path", { fill: "none", stroke: SKY, "stroke-width": 12, "stroke-linecap": "round" }, tr);
      el("rect", { x: 148, y: 456, width: 30, height: 24, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 3 }, tr);
      el("rect", { x: 622, y: 456, width: 30, height: 24, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 3 }, tr);
      button(tr, "Bounce both coins again", () => api.seek(0));
      const coins = [
        { x: 290, r: 52, col: MINT, a: "BU Fast", b: "$0.12", fa: 17, fb: 22, ya: -4, yb: 23, rise: 20, F: 0.3, Cn: 0.2, dip: 8 },
        { x: 510, r: 66, col: LIL, a: "BU 4.0", b: "$1.80", fa: 21, fb: 26, ya: -6, yb: 27, rise: 300, F: 1, Cn: 0.4, dip: 30 },
      ].map((c) => {
        c.rest = 459 - c.r; c.P = 2 * c.F + c.Cn; c.g = el("g", {}, svg);
        el("circle", { r: c.r, fill: c.col, stroke: INK, "stroke-width": 3 }, c.g);
        el("circle", { r: c.r - 9, fill: "none", stroke: INK, "stroke-width": 1.5, "stroke-opacity": 0.3 }, c.g);
        txt(c.g, 0, c.ya, c.a, { "text-anchor": "middle", "font-family": MONO, "font-size": c.fa, "font-weight": 700 });
        txt(c.g, 0, c.yb, c.b, { "text-anchor": "middle", "font-family": MONO, "font-size": c.fb, "font-weight": 700 });
        return c;
      });
      return (t) => {
        let dip = 0;
        coins.forEach((c) => { const u = t % c.P; c.u = u; c.s = u >= c.F && u < c.F + c.Cn ? Math.sin((Math.PI * (u - c.F)) / c.Cn) : 0; dip += c.dip * c.s; });
        const d = `M163 468 Q400 ${468 + 2 * dip} 637 468`;
        matO.setAttribute("d", d); mat.setAttribute("d", d);
        coins.forEach((c) => {
          const u = c.u; let h;
          if (u < c.F) { const x = u / c.F; h = c.rise * (1 - x * x); }
          else if (u < c.F + c.Cn) h = 0;
          else { const x = (u - c.F - c.Cn) / c.F; h = c.rise * (1 - (1 - x) * (1 - x)); }
          const y = c.rest - h + 0.78 * dip * (1 - h / c.rise);
          c.g.setAttribute("transform", `translate(${c.x} ${y}) scale(${1 + 0.08 * c.s} ${1 - 0.1 * c.s})`);
        });
      };
    },
  };

  /* ---- 3. the funnel: drop who you are in, get the matching pick out ---- */
  SC.funnel = {
    dur: 14, still: 14,
    build(svg, api) {
      const CH = ["Your code", "Team of agents", "No code", "MCP client", "Shell"];
      const PK = ["Stagehand", "Munder Difflin", "Skyvern", "Playwright MCP", "Rust CLI"];
      const RY = 96, LX = 400, LY = 248, P = 2.8;
      let user = null, last = null;
      const slotL = el("g", {}, svg);
      el("ellipse", { cx: 400, cy: 250, rx: 150, ry: 24, fill: BLUE, "fill-opacity": 0.5, stroke: INK, "stroke-width": 3 }, svg);
      const card = el("g", {}, svg);
      const cRing = ring(card, 0, -42, 0, 84, 22);
      const cBody = el("rect", { y: -36, height: 72, rx: 18, fill: MINT, stroke: INK, "stroke-width": 3 }, card);
      const cTxt = txt(card, 0, 10, "", { "text-anchor": "middle", "font-family": MONO, "font-size": 30, "font-weight": 700 });
      const cw = PK.map((p) => { cTxt.textContent = p; return Math.ceil(tw(cTxt)) + 64; });
      let shown = -1;
      const lodged = () => (!last ? -1 : last.cur >= 0 && last.ck > 0 ? last.cur : last.prev >= 0 && last.pk > 0 ? last.prev : -1);
      const tapChip = (j) => { const l = lodged(); user = l === j ? { prev: -1, cur: j, t0: api.now() - 2 } : { prev: l, cur: j, t0: api.now() }; api.poke(); };
      button(card, "Send the pick back up", () => { user = { prev: lodged(), cur: -1, t0: api.now() }; api.poke(); });
      const chipL = el("g", {}, svg);
      el("path", { d: "M250 250 A150 24 0 0 0 550 250 L422 388 V408 Q422 414 416 414 H384 Q378 414 378 408 V388 Z", fill: SKY, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      const chips = CH.map((s, i) => {
        const g = el("g", {}, chipL), rg = ring(g, 0, -30, 0, 60, 30);
        const body = el("rect", { y: -24, height: 48, rx: 24, fill: LIL, stroke: INK, "stroke-width": 3 }, g);
        const w = Math.ceil(tw(txt(g, 0, 7, s, { "text-anchor": "middle", "font-size": 20, "font-weight": 600 }))) + 32;
        body.setAttribute("x", -w / 2); body.setAttribute("width", w); rg.setAttribute("x", -w / 2 - 6); rg.setAttribute("width", w + 12);
        button(g, `${s}: drop it into the funnel`, () => tapChip(i));
        return { g, w };
      });
      let x0 = 400 - (chips.reduce((a, c) => a + c.w, 0) + 12 * 4) / 2;
      chips.forEach((c) => {
        c.sx = x0 + c.w / 2; x0 += c.w + 12;
        el("rect", { x: c.sx - c.w / 2, y: RY - 24, width: c.w, height: 48, rx: 24, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 6", "stroke-opacity": 0.35 }, slotL);
      });
      const place = (c, k) => tf(c.g, c.sx + (LX - c.sx) * io(k), RY + (LY - RY) * oc(k), 1, 6 * Math.sin(Math.PI * k) * Math.sign(LX - c.sx));
      const auto = (t) => {
        const n = Math.floor(t / P), i = n % 5, u = t - n * P;
        return { prev: (i + 4) % 5, pk: 1 - io(seg(u, 0.25, 0.7)), pc: 1 - io(seg(u, 0, 0.3)), cur: i, ck: seg(u, 0.75, 1.35), cc: ob(seg(u, 1.35, 1.75)) };
      };
      const manual = (now) => {
        const s = now - user.t0, d = user.prev >= 0 ? 0.75 : 0;
        return { prev: user.prev, pk: 1 - io(seg(s, 0.25, 0.7)), pc: 1 - io(seg(s, 0, 0.3)), cur: user.cur, ck: seg(s, d, d + 0.6), cc: ob(seg(s, d + 0.6, d + 1)) };
      };
      return (t, now) => {
        const st = user ? manual(now) : auto(t); last = st;
        chips.forEach((c, j) => place(c, j === st.cur ? st.ck : j === st.prev ? st.pk : 0));
        const show = st.cur >= 0 && st.cc > 0.001 ? [st.cur, st.cc] : st.prev >= 0 && st.pc > 0.001 ? [st.prev, st.pc] : null;
        if (!show) { card.style.visibility = "hidden"; return; }
        const [i, k] = show;
        if (i !== shown) {
          shown = i; cTxt.textContent = PK[i];
          cBody.setAttribute("x", -cw[i] / 2); cBody.setAttribute("width", cw[i]);
          cRing.setAttribute("x", -cw[i] / 2 - 6); cRing.setAttribute("width", cw[i] + 12);
          card.setAttribute("aria-label", `Send ${PK[i]} back up`);
        }
        card.style.visibility = "visible";
        tf(card, 400, 414 + 70 * k, 0.15 + 0.85 * k);
        card.setAttribute("opacity", cl(k * 4));
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 4, still: 4,
    build(svg) {
      const pill = el("rect", { x: 56, y: 40, height: 42, rx: 21, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
      pill.setAttribute("width", Math.ceil(tw(txt(svg, 76, 68, "Alternatives", { "font-size": 20, "font-weight": 700 }))) + 40);
      txt(svg, 904, 68, "Checked 16 Nov 2026", { "text-anchor": "end", "font-size": 20, "font-weight": 500, fill: MUTE });
      txt(svg, 56, 176, "Browser Use alternatives", { "font-size": 62, "font-weight": 700 });
      el("path", { d: "M60 202 H250", stroke: YEL, "stroke-width": 12, "stroke-linecap": "round" }, svg);
      txt(svg, 56, 252, "5 tools for AI agents that drive a browser", { "font-size": 26, "font-weight": 500, fill: MUTE });
      const lines = el("g", {}, svg);
      const tb = el("rect", { y: 300, height: 50, rx: 12, fill: GREY, stroke: INK, "stroke-width": 2.5 }, svg);
      const w0 = Math.ceil(tw(txt(svg, 480, 332, "Browser Use", { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700 }))) + 48;
      tb.setAttribute("x", 480 - w0 / 2); tb.setAttribute("width", w0);
      const tiles = [["Stagehand", YEL], ["Munder Difflin", BLUE], ["Skyvern", LIL], ["Playwright MCP", SKY], ["+1", MINT]].map(([s, col]) => {
        const g = el("g", {}, svg), r = el("rect", { y: -23, height: 46, rx: 12, fill: col, stroke: INK, "stroke-width": 2.5 }, g);
        const w = Math.max(64, Math.ceil(tw(txt(g, 0, 6, s, { "text-anchor": "middle", "font-family": MONO, "font-size": 18, "font-weight": 700 }))) + 32);
        r.setAttribute("x", -w / 2); r.setAttribute("width", w);
        return { g, w };
      });
      let x0 = 480 - (tiles.reduce((a, o) => a + o.w, 0) + 22 * 4) / 2;
      tiles.forEach((o) => { o.cx = x0 + o.w / 2; x0 += o.w + 22; o.ln = el("path", { d: `M480 350 C480 392 ${o.cx} 384 ${o.cx} 423`, stroke: INK, "stroke-width": 1.8, fill: "none" }, lines); });
      return (t) => tiles.forEach((o, i) => {
        const a = 0.3 + i * 0.2, k = oc(seg(t, a, a + 0.6));
        tf(o.g, o.cx, 446 + 34 * (1 - k));
        o.g.setAttribute("opacity", seg(t, a, a + 0.3));
        o.ln.setAttribute("opacity", seg(t, a + 0.2, a + 0.6));
      });
    },
  };

  /* ---- player ---- */
  const q = new URLSearchParams(location.search), frozen = q.has("mgstill"), fixed = parseFloat(q.get("mgstill"));
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mount = (fig) => {
    const sc = SC[fig.dataset.scene], img = fig.querySelector("img"); if (!sc || !img) return;
    const W = sc.w || 800, H = sc.h || 600;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "mg-svg", role: "group", "aria-label": img.alt || "" });
    svg.style.aspectRatio = `${W} / ${H}`;
    el("rect", { width: W, height: H, fill: "#fff" }, svg);
    img.replaceWith(svg);
    let off = 0, raf = 0, seen = false, held = calm;
    const base = performance.now(), clock = () => (performance.now() - base) / 1000;
    let draw = () => {};
    const frame = () => { const now = clock(); draw(held ? sc.still : (((now + off) % sc.dur) + sc.dur) % sc.dur, now); };
    const tick = () => { cancelAnimationFrame(raf); frame(); if (seen && !held) raf = requestAnimationFrame(tick); };
    const api = { now: clock, seek: (s) => { off = s - clock(); held = false; tick(); }, poke: () => { held = false; tick(); } };
    draw = sc.build(svg, api);
    if (frozen) { draw(isNaN(fixed) ? sc.still : fixed, 0); return; }
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen) { tick(); if (!fig.dataset.sent && window.posthog) { fig.dataset.sent = 1; window.posthog.capture("blog_scene_view", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } }
      else cancelAnimationFrame(raf);
    }, { threshold: 0.25 }).observe(fig);
    svg.addEventListener("click", () => { if (!fig.dataset.hit && window.posthog) { fig.dataset.hit = 1; window.posthog.capture("blog_scene_interact", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } });
    frame();
  };
  const go = () => document.querySelectorAll("figure.mg[data-scene]").forEach(mount);
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
