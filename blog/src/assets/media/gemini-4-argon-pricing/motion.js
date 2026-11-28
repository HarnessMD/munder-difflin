/* Bright coded scenes for "Gemini 4 Argon Pricing". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88";
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
  const strip = (svg, y, w = 680) => {
    el("rect", { x: (800 - w) / 2, y, width: w, height: 48, rx: 24, fill: SOFT }, svg);
    return txt(svg, 400, y + 31, "", { "text-anchor": "middle", "font-size": 20, "font-weight": 500 });
  };

  const lerp = (a, b, k) => a + (b - a) * k;
  /* ease that lands a little past the mark and settles; c sets how far past */
  const bk = (x, c) => 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
  /* scene heading on the left, the tap hint on the right; the heading shrinks if the two would touch */
  const head = (svg, s, hint) => {
    const a = txt(svg, 44, 62, s, { "font-size": 32, "font-weight": 700 });
    const b = txt(svg, 756, 60, hint, { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
    const room = 756 - b.getComputedTextLength() - 28 - 44, w = a.getComputedTextLength();
    if (w > room) a.setAttribute("font-size", Math.floor((32 * room) / w));
  };
  const star = (p, x, y, r, fill) => el("path", { d: `M0 ${-r} Q0 0 ${r} 0 Q0 0 0 ${r} Q0 0 ${-r} 0 Q0 0 0 ${-r} Z`, fill, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round", transform: `translate(${x} ${y})` }, p);
  /* a damped wobble that starts at zero: size a, decay d, speed f */
  const ring = (tau, a, d, f) => (tau > 0 ? a * Math.exp(-d * tau) * Math.sin(f * tau) : 0);

  const SC = {};

  /* ---- 1. a shop window; the launch price is a round sticker on the glass, which peels off and flutters to the pavement ---- */
  SC.sticker = {
    dur: 12, still: 9.8,
    build(svg, api) {
      head(svg, "When does the launch price end?", "tap the window");
      const G = 486, WX = 330, WR = 756, WB = 436, CX = 543, CY = 292, LX = 170, LY = G - 122, PHI = -42;
      let T = 0;
      el("path", { d: `M30 ${G} H770`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      /* the shop sign, hung on two chains */
      el("path", { d: "M56 108 H288", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      const sign = el("g", {}, svg);
      el("path", { d: "M-82 0 V28 M82 0 V28", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round", "stroke-dasharray": "5 4" }, sign);
      el("rect", { x: -126, y: 28, width: 252, height: 98, rx: 14, fill: MINT, stroke: INK, "stroke-width": 3 }, sign);
      txt(sign, 0, 70, "Gemini 4 Argon", { "text-anchor": "middle", "font-size": 28, "font-weight": 700 });
      txt(sign, 0, 104, "per 1M tokens", { "text-anchor": "middle", "font-size": 22, "font-weight": 500 });
      [56, 288].forEach((x) => el("circle", { cx: x, cy: 108, r: 5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg));
      const win = el("g", {}, svg);
      el("rect", { x: 312, y: 92, width: 462, height: 402, rx: 18, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, win);
      el("rect", { x: WX + 6, y: WB + 10, width: WR - WX - 12, height: G - WB - 10, fill: "#fff", stroke: INK, "stroke-width": 3 }, win);
      el("path", { d: `M${WX + 148} ${WB + 22} V${G - 10} M${WR - 148} ${WB + 22} V${G - 10}`, stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, win);
      el("rect", { x: WX, y: 126, width: WR - WX, height: WB - 126, fill: SOFT, stroke: INK, "stroke-width": 3 }, win);
      el("path", { d: "M352 250 L392 196 M360 284 L380 257 M704 392 L734 352", stroke: "#fff", "stroke-width": 7, "stroke-linecap": "round" }, win);
      /* the card in the window */
      el("rect", { x: CX - 9, y: CY + 84, width: 18, height: WB - CY - 92, fill: "#fff", stroke: INK, "stroke-width": 3 }, win);
      el("rect", { x: CX - 56, y: WB - 14, width: 112, height: 14, rx: 6, fill: LIL, stroke: INK, "stroke-width": 3 }, win);
      const card = el("g", {}, win);
      el("rect", { x: -102, y: -92, width: 204, height: 178, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 3 }, card);
      txt(card, 0, -57, "From", { "text-anchor": "middle", "font-size": 20, "font-weight": 500, fill: MUTE });
      txt(card, 0, -25, "1 Dec 2026", { "text-anchor": "middle", "font-size": 28, "font-weight": 700 });
      el("path", { d: "M-82 -8 H82", stroke: LIL, "stroke-width": 3, "stroke-linecap": "round", "stroke-dasharray": "1 9" }, card);
      [["Input", "$4.00", 26], ["Output", "$20.00", 62]].forEach(([k, v, y]) => {
        txt(card, -84, y, k, { "font-size": 20, "font-weight": 500 });
        txt(card, 86, y + 1, v, { "text-anchor": "end", "font-size": 26, "font-weight": 700 });
      });
      /* the glue ring the sticker leaves on the glass */
      const glue = el("circle", { cx: CX, cy: CY, r: 117, fill: "none", stroke: LIL, "stroke-width": 3, "stroke-linecap": "round", "stroke-dasharray": "1 11" }, win);
      el("rect", { x: WX - 12, y: WB, width: WR - WX + 24, height: 16, rx: 6, fill: BLUE, stroke: INK, "stroke-width": 3 }, win);
      /* awning */
      const AW = (WR - WX + 28) / 9;
      for (let i = 0; i < 9; i++) el("path", { d: `M${(WX - 14 + i * AW).toFixed(1)} 98 h${AW.toFixed(1)} v38 q${(-AW / 2).toFixed(1)} 20 ${(-AW).toFixed(1)} 0 Z`, fill: i % 2 ? "#fff" : LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, win);
      /* the sticker */
      const seal = (p, fill) => {
        let d = "";
        for (let i = 0; i < 56; i++) { const a = (i * Math.PI) / 28, r = i % 2 ? 112 : 120; d += `${i ? "L" : "M"}${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}`; }
        return el("path", { d: d + "Z", fill, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, p);
      };
      const st = el("g", {}, win);
      const cr = el("rect", { x: -300, y: -300, width: 430, height: 600 }, el("clipPath", { id: "mgc-peel" }, el("defs", {}, svg)));
      const pg = el("g", { transform: `rotate(${PHI})`, "clip-path": "url(#mgc-peel)" }, st);
      const face = el("g", { transform: `rotate(${-PHI})` }, pg);
      seal(face, YEL);
      txt(face, 0, -60, "Through", { "text-anchor": "middle", "font-size": 20, "font-weight": 500 });
      txt(face, 0, -28, "30 Nov 2026", { "text-anchor": "middle", "font-size": 28, "font-weight": 700 });
      el("path", { d: "M-82 -11 H82", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round", "stroke-dasharray": "1 9" }, face);
      [["Input", "$2.00", 23], ["Output", "$10.00", 59]].forEach(([k, v, y]) => {
        txt(face, -84, y, k, { "font-size": 20, "font-weight": 500 });
        txt(face, 86, y + 1, v, { "text-anchor": "end", "font-size": 26, "font-weight": 700 });
      });
      const flap = el("g", {}, pg);
      seal(flap, "#fff");
      const fold = el("path", { stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, el("g", { transform: `rotate(${PHI})` }, st));
      button(win, "Stick the launch price sticker back on the window", () => api.seek(T >= 5.9 && T < 11.2 ? 11.2 : 0.1));
      const cap = strip(svg, 508, 740);
      return (t, now) => {
        T = t;
        const back = io(seg(t, 11.2, 11.85)), p = seg(t, 4.5, 5.9), e = io(p), tau = t - 5.9;
        let k = 0.12 * io(seg(t, 2.2, 2.8)) + 0.88 * io(seg(t, 3.4, 4.5));
        k = lerp(k, 0.2 + 0.04 * Math.sin(now * 1.7), io(seg(t, 4.55, 5.9))) * (1 - back);
        const d = lerp(126, 30, k), hh = Math.sqrt(Math.max(0, 116 * 116 - d * d));
        cr.setAttribute("width", (300 + d).toFixed(1));
        flap.setAttribute("transform", `translate(${(2 * d).toFixed(1)} 0) scale(-1 1) rotate(${-PHI})`);
        fold.setAttribute("d", `M${d.toFixed(1)} ${(-hh).toFixed(1)} V${hh.toFixed(1)}`); fold.setAttribute("opacity", d < 114 ? 1 : 0);
        let x = lerp(CX, LX, e) + 34 * Math.sin(p * Math.PI * 2) * (1 - p);
        let y = lerp(CY, LY, p * p) - (tau > 0 ? 9 * Math.exp(-6 * tau) * Math.abs(Math.sin(10 * tau)) : 0);
        let r = lerp(-5, -8, e) + 16 * Math.sin(p * Math.PI * 2.5) * (1 - p) + ring(tau, 3.4, 3.2, 9);
        x = lerp(x, CX, back); y = lerp(y, CY, back) - 44 * Math.sin(Math.PI * back); r = lerp(r, -5, back);
        tf(st, x.toFixed(2), y.toFixed(2), (1 + 0.05 * Math.sin(Math.PI * seg(t, 0, 0.45))).toFixed(4), r.toFixed(3));
        tf(card, CX, CY, (1 + 0.06 * Math.sin(Math.PI * seg(t, 4.9, 5.4))).toFixed(4));
        glue.setAttribute("opacity", (seg(t, 4.5, 4.8) * (1 - seg(t, 11.5, 11.8))).toFixed(2));
        sign.setAttribute("transform", `translate(172 108) rotate(${(Math.sin(now * 1.2) * 1.3 + ring(t - 5.1, 3, 2.2, 8)).toFixed(3)})`);
        cap.textContent = t < 4.7 || t >= 11.2 ? "Through 30 November 2026: $2.00 input, $10.00 output per 1M tokens" : t < 8.6 ? "From 1 December 2026: $4.00 input, $20.00 output per 1M tokens" : "Every figure doubles on the same day";
      };
    },
  };

  /* ---- 2. a wire basket; two cartons drop in, then a counter card fills in what the job costs ---- */
  SC.basket = {
    dur: 12, still: 9.8,
    build(svg, api) {
      head(svg, "What would a real job cost?", "tap the basket");
      const F = 472, BOT = 454, LAND = [1.7, 3.1], POP = [4.4, 6.5];
      el("rect", { x: 30, y: F, width: 740, height: 16, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      const bas = el("g", {}, svg);
      el("rect", { x: 40, y: 112, width: 380, height: 384, rx: 18, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, bas);
      /* the handle stands up behind the cartons */
      const hand = el("g", {}, bas);
      el("path", { d: "M92 0 C92 -262 368 -262 368 0", fill: "none", stroke: INK, "stroke-width": 11, "stroke-linecap": "round" }, hand);
      el("path", { d: "M92 0 C92 -262 368 -262 368 0", fill: "none", stroke: LIL, "stroke-width": 5, "stroke-linecap": "round" }, hand);
      el("rect", { x: 184, y: -209, width: 92, height: 24, rx: 12, fill: BLUE, stroke: INK, "stroke-width": 3 }, hand);
      const boxes = [[171, 150, 268, SKY, "500,000", "tokens in", 28], [312, 118, 238, MINT, "50,000", "out", 26]].map(([cx, w, h, col, a, b, fs]) => {
        const g = el("g", {}, bas);
        el("rect", { x: -w / 2, y: -h, width: w, height: h, rx: 6, fill: col, stroke: INK, "stroke-width": 3 }, g);
        el("path", { d: `M${-w / 2} ${-h + 12} H${w / 2}`, stroke: INK, "stroke-width": 2 }, g);
        el("rect", { x: -w / 2 + 9, y: -h + 22, width: w - 18, height: 78, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        txt(g, 0, -h + 56, a, { "text-anchor": "middle", "font-size": fs, "font-weight": 700 });
        txt(g, 0, -h + 86, b, { "text-anchor": "middle", "font-size": 22, "font-weight": 500 });
        return { g, cx, h };
      });
      const front = el("g", {}, bas);
      let wires = "";
      for (let i = 1; i < 12; i++) wires += `M${(60 + (i * 340) / 12).toFixed(1)} 338 L${(88 + (i * 284) / 12).toFixed(1)} ${BOT} `;
      [376, 414].forEach((y) => { const k = ((y - 338) / (BOT - 338)) * 28; wires += `M${(60 + k).toFixed(1)} ${y} H${(400 - k).toFixed(1)} `; });
      el("path", { d: wires, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round", fill: "none" }, front);
      el("path", { d: `M60 338 L88 ${BOT} H372 L400 338`, stroke: INK, "stroke-width": 3.5, "stroke-linejoin": "round", "stroke-linecap": "round", fill: "none" }, front);
      el("rect", { x: 52, y: 322, width: 356, height: 18, rx: 9, fill: BLUE, stroke: INK, "stroke-width": 3 }, front);
      [112, 348].forEach((x) => el("rect", { x: x - 10, y: BOT, width: 20, height: F - BOT, rx: 5, fill: INK }, front));
      button(bas, "Drop the job into the basket and add it up again", () => api.seek(0.9));
      /* the counter card */
      el("rect", { x: 592, y: 416, width: 16, height: 42, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 540, y: 456, width: 120, height: 16, rx: 7, fill: LIL, stroke: INK, "stroke-width": 3 }, svg);
      /* the pen on a chain, so nobody walks off with it */
      const pen = el("g", {}, svg);
      el("path", { d: "M0 0 V15", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round", "stroke-dasharray": "1 5" }, pen);
      el("path", { d: "M-5 40 L0 49 L5 40 Z", fill: "#fff", stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, pen);
      el("rect", { x: -6, y: 15, width: 12, height: 26, rx: 5, fill: BLUE, stroke: INK, "stroke-width": 2.5 }, pen);
      el("rect", { x: 446, y: 118, width: 310, height: 300, rx: 16, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 601, 162, "Through 30 Nov 2026", { "text-anchor": "middle", "font-size": 23, "font-weight": 500 });
      el("path", { d: "M474 262 H728", stroke: LIL, "stroke-width": 3, "stroke-linecap": "round", "stroke-dasharray": "1 9" }, svg);
      txt(svg, 601, 304, "From 1 Dec 2026", { "text-anchor": "middle", "font-size": 23, "font-weight": 500 });
      const blanks = [226, 374].map((y) => el("path", { d: `M540 ${y} H662`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round", "stroke-dasharray": "10 8" }, svg));
      const a1 = el("g", {}, svg), a2 = el("g", {}, svg);
      txt(a1, 0, 20, "$1.50", { "text-anchor": "middle", "font-size": 58, "font-weight": 700 });
      el("rect", { x: -104, y: -38, width: 208, height: 78, rx: 18, fill: YEL, stroke: INK, "stroke-width": 3 }, a2);
      txt(a2, 0, 21, "$3.00", { "text-anchor": "middle", "font-size": 58, "font-weight": 700 });
      const cap = strip(svg, 508, 740);
      return (t, now) => {
        const out = seg(t, 11.2, 11.8);
        let jolt = 0, hw = 0;
        boxes.forEach((b, i) => { const tau = t - LAND[i]; jolt += ring(tau, 7, 7, 18) * (1 - out); hw += ring(tau, 3.4, 3, 9); });
        boxes.forEach((b, i) => {
          const L = LAND[i], f = seg(t, L - 0.4, L), tau = t - L, up = io(seg(t, 11.2 + i * 0.1, 11.7 + i * 0.1));
          /* each carton pops in just above the basket, hangs a beat, then drops */
          const sc = cl(bk(seg(t, L - 0.9, L - 0.5), 1.6), 0, 1.2) * (1 - up);
          const y = BOT - 4 - (1 - f * f) * (i ? 112 : 84) - (tau > 0 ? 12 * Math.exp(-5 * tau) * Math.abs(Math.sin(10 * tau)) : 0) + (tau > 0 ? jolt : 0);
          const rot = (1 - f) * (i ? 6 : -5) + ring(tau, i ? -2.6 : 2.2, 4, 12);
          b.g.setAttribute("transform", `translate(${b.cx} ${y.toFixed(2)}) rotate(${rot.toFixed(3)}) translate(0 ${-b.h / 2}) scale(${sc.toFixed(4)}) translate(0 ${b.h / 2})`);
          b.g.setAttribute("opacity", sc > 0.01 ? 1 : 0);
        });
        front.setAttribute("transform", `translate(0 ${jolt.toFixed(2)})`);
        hand.setAttribute("transform", `translate(0 ${(330 + jolt).toFixed(2)}) rotate(${(hw + Math.sin(now * 1.1) * 0.7).toFixed(3)} 230 0)`);
        const k1 = cl(bk(seg(t, POP[0], POP[0] + 0.5), 2.4), 0, 1.4) * (1 - out), k2 = cl(bk(seg(t, POP[1], POP[1] + 0.5), 2.4), 0, 1.4) * (1 - out);
        tf(a1, 601, 206, k1.toFixed(4), ring(t - POP[0] - 0.5, 2, 4, 11).toFixed(3));
        tf(a2, 601, 354, k2.toFixed(4), ring(t - POP[1] - 0.5, -2, 4, 11).toFixed(3));
        blanks[0].setAttribute("opacity", k1 > 0.05 ? 0 : 1); blanks[1].setAttribute("opacity", k2 > 0.05 ? 0 : 1);
        pen.setAttribute("transform", `translate(470 418) rotate(${(Math.sin(now * 1.3) * 6 + ring(t - POP[0], 14, 2.2, 9) + ring(t - POP[1], 16, 2.2, 9)).toFixed(3)})`);
        cap.textContent = t < POP[0] || t >= 11.2 ? "A job that reads 500,000 tokens and writes 50,000" : t < POP[1] ? "$1.50 at the launch price" : t < 8.6 ? "$3.00 from 1 December 2026" : "Our arithmetic: $1.50 at the launch price, $3.00 from 1 December 2026";
      };
    },
  };

  /* ---- 3. four gumball machines; each handle turns and a price card springs up from the lid ---- */
  SC.gumballs = {
    dur: 12, still: 10,
    build(svg, api) {
      txt(svg, 44, 54, "How does it compare with", { "font-size": 30, "font-weight": 700 });
      txt(svg, 44, 90, "Claude Opus 5.5 and GPT-6 Astra?", { "font-size": 30, "font-weight": 700 });
      txt(svg, 756, 52, "tap a machine", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      el("rect", { x: 596, y: 66, width: 160, height: 36, rx: 18, fill: SOFT }, svg);
      txt(svg, 676, 91, "per 1M tokens", { "text-anchor": "middle", "font-size": 20, "font-weight": 500 });
      const C = 488, A = [1.8, 3.3, 4.8, 6.3], PAL = [YEL, BLUE, MINT, LIL, SKY];
      const M = [
        ["Gemini 4 Argon", "$4.00", "$20.00", "from 1 Dec 2026", BLUE, "Gemini 4 Argon, from 1 Dec 2026: $4.00 input, $20.00 output"],
        ["Muse Wonder", "$4.00", "$20.00", "", MINT, "Muse Wonder: $4.00 input, $20.00 output"],
        ["Claude Opus 5.5", "$4", "$20", "", LIL, "Claude Opus 5.5: $4 input, $20 output"],
        ["GPT-6 Astra", "$10.00", "$50.00", "short context", SKY, "GPT-6 Astra, short context: $10.00 input, $50.00 output"],
      ];
      el("path", { d: `M30 ${C} H770`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      let pinned = -1;
      const ms = M.map(([name, pin, pout, note, col, line], i) => {
        const cx = 122.5 + i * 185, g = el("g", {}, svg), h = note ? 104 : 76;
        el("rect", { x: cx - 91, y: 108, width: 182, height: C - 104, rx: 14, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, g);
        const body = el("g", {}, g);
        /* the price card on its spring */
        const card = el("g", {}, body);
        el("path", { d: "M0 6 V-6 l-7 -2 l14 -4 l-14 -4 l14 -4 l-7 -2", stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, card);
        const face = el("rect", { x: -87, y: -22 - h, width: 174, height: h, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 3 }, card);
        [["Input", pin, 31], ["Output", pout, 61]].forEach(([k, v, y]) => {
          txt(card, -75, -22 - h + y, k, { "font-size": 20, "font-weight": 500 });
          txt(card, 76, -22 - h + y + 1, v, { "text-anchor": "end", "font-size": 22, "font-weight": 700 });
        });
        if (note) txt(card, 0, -22 - h + 90, note, { "text-anchor": "middle", "font-size": 20, "font-weight": 500 });
        el("rect", { x: -88, y: -38, width: 176, height: 34, rx: 9, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, body);
        txt(body, 0, -14, name, { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
        el("path", { d: "M-46 -38 L-38 -120 H38 L46 -38 Z", fill: col, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, body);
        el("rect", { x: -19, y: -70, width: 38, height: 24, rx: 7, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, body);
        const ball = el("circle", { r: 9, fill: PAL[(i + 2) % 5], stroke: INK, "stroke-width": 2.5 }, body);
        el("circle", { cx: 0, cy: -94, r: 14, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, body);
        const knob = el("g", {}, body);
        el("rect", { x: -5, y: -13, width: 10, height: 26, rx: 5, fill: YEL, stroke: INK, "stroke-width": 2.5 }, knob);
        el("rect", { x: -32, y: -132, width: 64, height: 14, rx: 5, fill: YEL, stroke: INK, "stroke-width": 3 }, body);
        el("circle", { cx: 0, cy: -182, r: 52, fill: "#fff", stroke: INK, "stroke-width": 3 }, body);
        const balls = el("g", {}, body);
        [[36, [-20, 0, 20]], [18.5, [-32, -11, 11, 32]], [1, [-39, -19.5, 0, 19.5, 39]], [-16.5, [-30, -10, 10, 30]]].forEach(([dy, xs], r) => xs.forEach((dx, j) => el("circle", { cx: dx, cy: -182 + dy, r: 9.5, fill: PAL[(j * 2 + r * 3 + i) % 5], stroke: INK, "stroke-width": 2.5 }, balls)));
        el("path", { d: "M-37 -196 A40 40 0 0 1 -15 -220", stroke: SKY, "stroke-width": 5, fill: "none", "stroke-linecap": "round" }, body);
        el("path", { d: "M-22 -232 Q0 -252 22 -232 Z", fill: col, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, body);
        const m = { cx, body, card, face, knob, ball, balls, t0: -99 };
        button(g, `${line} per 1M tokens`, () => { m.t0 = api.now(); pinned = i; api.poke(); });
        return m;
      });
      /* the one that got away */
      const stray = el("g", {}, svg);
      el("circle", { r: 9.5, fill: YEL, stroke: INK, "stroke-width": 2.5 }, stray);
      el("circle", { cx: 3, cy: -3, r: 2, fill: "#fff" }, stray);
      const cap = strip(svg, 508, 740);
      return (t, now) => {
        let cur = -1;
        ms.forEach((m, i) => {
          const a = A[i], w = now - m.t0, hit = w >= 0 && w < 4, tau = t - a - 0.55;
          const k = cl(bk(seg(t, a, a + 0.55), 1.1), 0, 1.3) * (1 - io(seg(t, 11.2 + i * 0.05, 11.7 + i * 0.05)));
          const lift = i < 3 ? -9 * Math.sin(Math.PI * seg(t, 8.6 + i * 0.12, 9.1 + i * 0.12)) : 0;
          const rot = ring(tau, 4, 3, 10) + (k > 0.9 ? Math.sin(now * 1.2 + i * 1.4) * 0.6 : 0) + (hit ? ring(w - 0.5, 3.5, 2.6, 12) : 0);
          m.card.setAttribute("transform", `translate(0 ${(-240 + lift).toFixed(2)}) rotate(${rot.toFixed(3)}) scale(${k.toFixed(4)})`);
          m.face.setAttribute("fill", i < 3 && t >= 8.6 && t < 11.2 ? YEL : "#fff");
          const turn = 360 * bk(seg(t, a - 0.6, a + 0.1), 0.9) + (hit ? 360 * bk(seg(w, 0, 0.7), 0.9) : 0);
          m.knob.setAttribute("transform", `translate(0 -94) rotate(${turn.toFixed(1)})`);
          const sh = (t > a - 0.6 && t < a + 0.1 ? 1 : 0) + (hit && w < 0.7 ? 1 : 0);
          m.balls.setAttribute("transform", `translate(${(sh * Math.sin(now * 46 + t * 46) * 1.5).toFixed(2)} ${(sh * -Math.abs(Math.sin(now * 33 + t * 33)) * 1.6).toFixed(2)})`);
          const dk = Math.max(cl(bk(seg(t, a, a + 0.35), 2.6), 0, 1.4) * (1 - seg(t, 11.3, 11.6)), hit ? cl(bk(seg(w, 0.5, 0.85), 2.6), 0, 1.4) : 0) * (hit && w < 0.5 ? 0 : 1);
          m.ball.setAttribute("transform", `translate(0 -58) scale(${dk.toFixed(4)})`);
          m.body.setAttribute("transform", `translate(${m.cx} ${(C - 2 - 9 * Math.sin(Math.PI * seg(t, 0.2 + i * 0.14, 0.62 + i * 0.14))).toFixed(2)})`);
          if (t >= a && t < 11.2) cur = i;
        });
        const sx = Math.sin(now * 1.4) * 5;
        stray.setAttribute("transform", `translate(${(ms[2].cx + 67 + sx).toFixed(2)} ${C - 50}) rotate(${(sx * 6).toFixed(1)})`);
        const pw = pinned >= 0 ? now - ms[pinned].t0 : 99;
        cap.textContent = pw < 4 ? M[pinned][5] : cur < 0 ? "All four price pages were read on 13 Oct 2026" : t >= 8.6 ? "From 1 December 2026: three vendors, one price tag" : M[cur][5];
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 1, still: 0,
    build(svg) {
      txt(svg, 66, 112, "API rates, plans and free tier", { "font-size": 25, "font-weight": 500, fill: MUTE });
      txt(svg, 62, 204, "Gemini 4 Argon", { "font-size": 80, "font-weight": 700 });
      const ti = txt(svg, 62, 292, "Pricing", { "font-size": 80, "font-weight": 700 });
      el("path", { d: `M68 322 H${Math.round(56 + ti.getComputedTextLength())}`, stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      el("rect", { x: 62, y: 362, width: 312, height: 56, rx: 28, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 218, 399, "Checked 13 Oct 2026", { "text-anchor": "middle", "font-size": 25, "font-weight": 700 });
      el("path", { d: "M70 474 C190 438 300 500 420 464 S610 462 700 402", stroke: LIL, "stroke-width": 5, fill: "none", "stroke-linecap": "round", "stroke-dasharray": "1 16" }, svg);
      el("circle", { cx: 70, cy: 474, r: 11, fill: MINT, stroke: INK, "stroke-width": 3 }, svg);
      /* a wind chime: four tubes, a striker and a sail */
      const c = el("g", { transform: "translate(808 0)" }, svg);
      el("path", { d: "M0 58 V100", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, c);
      el("circle", { cx: 0, cy: 52, r: 8, fill: "#fff", stroke: INK, "stroke-width": 3 }, c);
      const parts = [[-66, 186, BLUE], [-33, 246, MINT], [33, 278, SKY], [66, 212, LIL]].map(([x, len, col]) => {
        const g = el("g", {}, c);
        el("path", { d: "M0 0 V22", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, g);
        el("rect", { x: -11, y: 22, width: 22, height: len, rx: 11, fill: col, stroke: INK, "stroke-width": 3 }, g);
        el("path", { d: `M-3 38 V${len - 4}`, stroke: "#fff", "stroke-width": 4, "stroke-linecap": "round" }, g);
        return [g, x];
      });
      const mid = el("g", {}, c);
      el("path", { d: "M0 0 V292", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, mid);
      el("circle", { cx: 0, cy: 150, r: 15, fill: "#fff", stroke: INK, "stroke-width": 3 }, mid);
      el("path", { d: "M0 288 L25 325 L0 362 L-25 325 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, mid);
      el("path", { d: "M-90 132 Q0 62 90 132 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, c);
      star(svg, 676, 104, 15, SKY); star(svg, 898, 432, 13, MINT); star(svg, 560, 500, 12, YEL);
      return (t, now) => {
        parts.forEach(([g, x], i) => g.setAttribute("transform", `translate(${x} 130) rotate(${(Math.sin(now * 1.3 + 0.6 + i * 1.1) * 2.4).toFixed(3)})`));
        mid.setAttribute("transform", `translate(0 130) rotate(${(Math.sin(now * 1.3 + 2.2) * 3.6 - 2).toFixed(3)})`);
      };
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
