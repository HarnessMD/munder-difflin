/* Bright coded scenes for "How to translate a web page on your own computer with Firefox". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const mono = (p, x, y, s, size, a = {}) => txt(p, x, y, s, Object.assign({ "font-family": MONO, "font-size": size, "font-weight": 700 }, a));
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const at = (n, cx, cy, sx = 1, dx = 0, dy = 0, sy = sx) => n.setAttribute("transform", `translate(${cx + dx} ${cy + dy}) scale(${sx} ${sy}) translate(${-cx} ${-cy})`);
  const op = (n, v) => n.setAttribute("opacity", cl(v));
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  const ring = (g, x, y, w, h, rx) => el("rect", { x, y, width: w, height: h, rx, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "6 7", class: "mg-ring" }, g);
  /* a scene is a state at time t plus a painter; during a replay the player blends two states, keys starting with _ snap */
  const mix = (a, b, q) => { const o = {}; for (const k in b) o[k] = k[0] === "_" ? b[k] : Array.isArray(b[k]) ? b[k].map((v, i) => a[k][i] + (v - a[k][i]) * q) : a[k] + (b[k] - a[k]) * q; return o; };
  const run = (S, P) => (t, now, r) => P(r ? mix(S(r.from), S(t), r.q) : S(t), now);

  const SC = {};

  /* ---- 1. the panel translates a postcard, line by line ---- */
  SC.postcard = {
    dur: 8, still: 8,
    build(svg, api) {
      const pan = el("g", {}, svg);
      el("rect", { x: 120, y: 28, width: 560, height: 230, rx: 24, fill: SKY, stroke: INK, "stroke-width": 3 }, pan);
      const head = txt(pan, 400, 80, "Translate this page?", { "text-anchor": "middle", "font-size": 31, "font-weight": 700 });
      const boxes = [["Translate from", 146], ["Translate to", 408]].map(([s, x]) => {
        const g = el("g", {}, pan);
        el("rect", { x, y: 102, width: 246, height: 54, rx: 12, fill: BLUE, stroke: INK, "stroke-width": 2.5 }, g);
        mono(g, x + 18, 136, s, 19);
        el("path", { d: `M${x + 212} 124 l9 9 l9 -9`, stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
        return [g, x + 123];
      });
      const bt = el("g", {}, pan);
      el("rect", { x: 312, y: 184, width: 188, height: 52, rx: 26, fill: LIL }, bt);
      const face = el("g", {}, bt);
      el("rect", { x: 306, y: 178, width: 188, height: 52, rx: 26, fill: YEL, stroke: INK, "stroke-width": 3 }, face);
      mono(face, 400, 212, "Translate", 22, { "text-anchor": "middle" });

      const card = el("g", {}, svg), hit = el("g", {}, card);
      el("rect", { x: 160, y: 300, width: 500, height: 260, rx: 16, fill: LIL }, hit);
      el("rect", { x: 150, y: 290, width: 500, height: 260, rx: 16, fill: SOFT, stroke: INK, "stroke-width": 3 }, hit);
      el("rect", { x: 566, y: 312, width: 60, height: 72, rx: 4, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "6 5" }, hit);
      const LW = [348, 300, 368, 220];
      const lines = LW.map((w, i) => {
        const g = el("g", {}, hit), y = 332 + i * 48;
        const base = el("rect", { x: 186, y, width: w, height: 18, rx: 9, fill: LIL }, g);
        const m = el("rect", { x: 186, y, width: 0, height: 18, rx: 9, fill: MINT }, g);
        return { g, base, m, w, y };
      });
      const sb = el("g", {}, hit);
      el("rect", { x: 448, y: 494, width: 180, height: 42, rx: 21, fill: BLUE, stroke: INK, "stroke-width": 2.5 }, sb);
      const sl = mono(sb, 538, 521, "Show original", 18, { "text-anchor": "middle" });
      ring(hit, 136, 276, 540, 298, 24);
      button(hit, "Postcard: turn the lines back to lilac and play again", () => api.replay(1.5));

      return run((t) => ({
        pan: ob(seg(t, 0.05, 0.6)), head: oc(seg(t, 0.25, 0.65)), box: [0, 1].map((i) => ob(seg(t, 0.35 + i * 0.1, 0.8 + i * 0.1))), btn: ob(seg(t, 0.55, 1.0)),
        card: oc(seg(t, 0.15, 0.9)), lin: LW.map((_, i) => oc(seg(t, 0.5 + i * 0.09, 0.9 + i * 0.09))),
        press: io(seg(t, 2.0, 2.14)) * (1 - ob(seg(t, 2.24, 2.62))),
        mint: LW.map((_, i) => oc(seg(t, 2.75 + i * 0.5, 3.2 + i * 0.5))),
        show: ob(seg(t, 5.0, 5.45)), lab: oc(seg(t, 5.35, 5.8)),
      }), (s) => {
        at(pan, 400, 143, 0.9 + 0.1 * s.pan); op(pan, s.pan * 1.4);
        at(head, 400, 80, 1, 0, 10 * (1 - s.head)); op(head, s.head);
        boxes.forEach(([g, cx], i) => { at(g, cx, 129, 0.8 + 0.2 * s.box[i]); op(g, s.box[i] * 1.5); });
        at(bt, 400, 204, 0.8 + 0.2 * s.btn); op(bt, s.btn * 1.5);
        tf(face, 6 * s.press, 6 * s.press);
        tf(card, 0, 46 * (1 - s.card)); op(card, s.card * 1.3);
        lines.forEach((l, i) => {
          const m = cl(s.mint[i]);
          l.base.setAttribute("width", l.w * cl(s.lin[i])); op(l.base, s.lin[i] * 3);
          l.m.setAttribute("width", l.w * m); op(l.m, m > 0.002 ? 1 : 0);
          at(l.g, 186, l.y + 9, 1, 0, 0, 1 + 0.35 * Math.sin(Math.PI * m));
        });
        at(sb, 538, 515, cl(s.show, 0, 1.2)); op(sb, s.show * 3);
        op(sl, s.lab);
      });
    },
  };

  /* ---- 2. a language parcel slides into a suitcase for the trip ---- */
  SC.luggagetag = {
    dur: 8.5, still: 8.5,
    build(svg, api) {
      const rd = "M200 84 C200 262 524 206 532 340";
      const ribs = [[INK, 40], [SKY, 34]].map(([c, w]) => el("path", { d: rd, stroke: c, "stroke-width": w, fill: "none", "stroke-linecap": "round" }, svg));
      const L = ribs[1].getTotalLength();
      ribs.forEach((r) => r.setAttribute("stroke-dasharray", `${L} ${L + 80}`));

      const bg = el("g", {}, svg);
      const glow = el("rect", { x: 47, y: 31, width: 306, height: 88, rx: 44, fill: "none", stroke: LIL, "stroke-width": 7 }, bg);
      const rays = el("path", { d: "M34 52 L18 42 M30 75 H12 M34 98 L18 108 M366 52 L382 42 M370 75 H388 M366 98 L382 108", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, bg);
      el("rect", { x: 60, y: 44, width: 280, height: 62, rx: 31, fill: LIL, stroke: INK, "stroke-width": 3 }, bg);
      mono(bg, 200, 82, "Download languages", 20, { "text-anchor": "middle" });

      const par = el("g", {}, svg);
      el("rect", { x: -28, y: -22, width: 56, height: 44, rx: 6, fill: MINT, stroke: INK, "stroke-width": 3 }, par);
      el("path", { d: "M0 -22 V22 M-28 0 H28", stroke: INK, "stroke-width": 2.5 }, par);

      const cs = el("g", {}, svg);
      el("ellipse", { cx: 540, cy: 550, rx: 176, ry: 11, fill: SOFT }, cs);
      const hd = "M402 432 H386 Q374 432 374 444 V470 Q374 482 386 482 H402";
      el("path", { d: hd, stroke: INK, "stroke-width": 13, fill: "none" }, cs);
      el("path", { d: hd, stroke: BLUE, "stroke-width": 7, fill: "none" }, cs);
      const lid = el("g", {}, cs);
      el("rect", { x: 400, y: 360, width: 280, height: 34, rx: 10, fill: BLUE, stroke: INK, "stroke-width": 3 }, lid);
      el("rect", { x: 400, y: 390, width: 280, height: 146, rx: 16, fill: BLUE, stroke: INK, "stroke-width": 3 }, cs);
      el("path", { d: "M466 392 V534 M614 392 V534", stroke: INK, "stroke-width": 3 }, cs);
      ring(cs, 360, 342, 336, 222, 22);
      button(cs, "Suitcase: open it and send the parcel down again", () => api.replay(1.7));

      const tg = el("g", {}, svg);
      const str = el("path", { d: "", stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round" }, tg);
      const tag = el("g", {}, tg);
      el("path", { d: "M62 470 H322 L356 510 L322 550 H62 Q50 550 50 538 V482 Q50 470 62 470 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, tag);
      el("circle", { cx: 332, cy: 510, r: 7, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, tag);
      const back = el("g", {}, tag);
      const word = mono(back, 110, 517, "translate offline", 20);
      const tick = el("g", {}, back);
      const tk = "M70 510 L80 521 L98 497";
      el("path", { d: tk, stroke: INK, "stroke-width": 11, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, tick);
      el("path", { d: tk, stroke: SOFT, "stroke-width": 5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, tick);

      return run((t) => ({
        btn: ob(seg(t, 0.05, 0.5)), rib: oc(seg(t, 0.2, 1.0)), cs: ob(seg(t, 0.3, 0.8)), tg: oc(seg(t, 0.45, 0.95)),
        glow: ob(seg(t, 1.1, 1.55)),
        _pk: ob(seg(t, 1.75, 2.05)), _p: io(seg(t, 2.05, 3.5)), _d: seg(t, 3.5, 3.85),
        lid: 100 * (1 - io(seg(t, 4.05, 4.8))) + 7 * Math.sin(Math.PI * seg(t, 4.8, 5.1)),
        flip: io(seg(t, 5.35, 6.05)), word: oc(seg(t, 5.75, 6.15)), tick: ob(seg(t, 6.3, 6.75)),
      }), (s) => {
        at(bg, 200, 75, (0.85 + 0.15 * s.btn) * (1 + 0.06 * Math.sin(Math.PI * cl(s.glow)))); op(bg, s.btn * 1.5);
        at(glow, 200, 75, 0.92 + 0.08 * s.glow); op(glow, s.glow);
        at(rays, 200, 75, 0.8 + 0.2 * s.glow); op(rays, s.glow);
        ribs.forEach((r) => { r.setAttribute("stroke-dashoffset", L * (1 - s.rib)); op(r, s.rib > 0.01 ? 1 : 0); });
        const d0 = 50 + (L - 50) * s._p, pt = ribs[1].getPointAtLength(d0), p2 = ribs[1].getPointAtLength(Math.min(L, d0 + 2));
        const ang = (Math.atan2(p2.y - pt.y, p2.x - pt.x) * 180) / Math.PI;
        tf(par, pt.x, pt.y + 80 * s._d * s._d, cl(s._pk, 0, 1.2), ang * 0.15 * (1 - s._d));
        op(par, s._pk > 0.01 && s._d < 1 ? 1 : 0);
        at(cs, 540, 460, 0.85 + 0.15 * s.cs); op(cs, s.cs * 1.5);
        lid.setAttribute("transform", `rotate(${s.lid} 680 392)`);
        tf(tg, -30 * (1 - s.tg), 0); op(tg, s.tg);
        const lift = Math.sin(Math.PI * s.flip), sx = Math.max(0.02, Math.abs(Math.cos(Math.PI * s.flip))), hx = 203 + 129 * sx;
        at(tag, 203, 510, sx, 0, -10 * lift, 1);
        op(back, s.flip >= 0.5 ? 1 : 0);
        word.setAttribute("transform", `translate(${8 * (1 - s.word)} 0)`); op(word, s.word);
        at(tick, 84, 509, cl(s.tick, 0, 1.3)); op(tick, s.tick * 3);
        str.setAttribute("d", `M375 468 C356 470 ${hx + 22} 486 ${hx} ${503 - 10 * lift}`);
      });
    },
  };

  /* ---- 3. a phrasebook of error messages and their fixes ---- */
  SC.phrasebook = {
    dur: 10, still: 10,
    build(svg, api) {
      const MSG = [
        [["Couldn't load", "languages"], "Try again", MINT, 20],
        [["Sorry, we don't", "support", "translations from", "this language yet"], "Change source language", BLUE, 18],
        [["To translate text,", "unblock this", "feature"], "Unblock", MINT, 20],
      ];
      const content = (p, i) => {
        const [ls, lab, col, fs] = MSG[i], g = el("g", {}, p), y0 = 238 - ls.length * 18;
        const lines = ls.map((s, j) => txt(g, 428, y0 + j * 38, s, { "font-size": 25, "font-weight": 700 }));
        const w = lab.length * fs * 0.6 + 44, b = el("g", {}, g);
        el("rect", { x: 559 - w / 2, y: 392, width: w, height: 52, rx: 26, fill: col, stroke: INK, "stroke-width": 2.5 }, b);
        mono(b, 559, 418 + fs * 0.35, lab, fs, { "text-anchor": "middle" });
        return { g, lines, b };
      };
      const book = el("g", {}, svg);
      el("rect", { x: 76, y: 104, width: 672, height: 456, rx: 20, fill: SOFT }, book);
      el("rect", { x: 64, y: 92, width: 672, height: 456, rx: 20, fill: YEL, stroke: INK, "stroke-width": 3 }, book);
      const tabs = [146, 232, 318].map((y) => el("rect", { x: 698, y, width: 56, height: 60, rx: 10, fill: LIL, stroke: INK, "stroke-width": 2.5 }, book));
      const pages = el("g", {}, book);
      [84, 402].forEach((x) => {
        el("rect", { x: x + (x < 400 ? -3 : 3), y: 109, width: 314, height: 420, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, pages);
        el("rect", { x, y: 104, width: 314, height: 420, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, pages);
      });
      el("path", { d: "M400 104 V524", stroke: INK, "stroke-width": 2.5 }, pages);
      const stat = MSG.map((_, i) => content(pages, i));
      const leaf = el("g", {}, book);
      el("rect", { x: 402, y: 104, width: 314, height: 420, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, leaf);
      const lf = MSG.map((_, i) => content(leaf, i));
      const mark = el("path", { d: "", fill: SKY, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, book);
      ring(book, 50, 70, 712, 502, 26);
      button(book, "Phrasebook: turn back to the first page", () => api.replay(1.25, 1.2));

      return run((t) => ({
        cv: ob(seg(t, 0, 0.55)), pg: oc(seg(t, 0.12, 0.6)), tab: [0, 1, 2].map((i) => ob(seg(t, 0.3 + i * 0.08, 0.7 + i * 0.08))),
        ln: seg(t, 0.45, 1.05),
        pop: t < 3 ? ob(seg(t, 0.75, 1.15)) : t < 6 ? ob(seg(t, 4.35, 4.8)) : ob(seg(t, 7.35, 7.8)),
        turn: io(seg(t, 3.0, 3.9)) + io(seg(t, 6.0, 6.9)),
        mark: t < 2.6 ? ob(seg(t, 1.3, 1.85)) : t < 4 ? 1 - io(seg(t, 2.6, 2.95)) : t < 5.6 ? ob(seg(t, 4.0, 4.55)) : t < 7 ? 1 - io(seg(t, 5.6, 5.95)) : ob(seg(t, 7.0, 7.55)),
      }), (s) => {
        at(book, 400, 320, 0.9 + 0.1 * s.cv); op(book, s.cv * 1.6);
        tf(pages, 0, 10 * (1 - s.pg)); op(pages, s.pg);
        tabs.forEach((n, i) => { tf(n, -40 * (1 - s.tab[i]), 0); op(n, s.tab[i] * 2); });
        let i = Math.min(2, Math.floor(s.turn + 1e-6)), p = s.turn - i;
        if (p > 0.998) { i = Math.min(2, i + 1); p = 0; }
        const turning = p > 0.002 && i < 2, si = turning ? i + 1 : i;
        stat.forEach((c, j) => {
          c.g.setAttribute("display", j === si ? "inline" : "none");
          c.lines.forEach((n, k) => { const v = oc(cl((s.ln - k * 0.12) / 0.5)); op(n, v); tf(n, 0, 14 * (1 - v)); });
          at(c.b, 559, 418, cl(s.pop, 0, 1.2)); op(c.b, s.pop * 3);
        });
        leaf.setAttribute("display", turning ? "inline" : "none");
        if (turning) {
          const sx = Math.cos(Math.PI * p), lift = Math.sin(Math.PI * p);
          at(leaf, 400, 314, Math.abs(sx) < 0.01 ? (sx < 0 ? -0.01 : 0.01) : sx, 0, -8 * lift, 1 + 0.04 * lift);
          lf.forEach((c, j) => c.g.setAttribute("display", j === i && sx > 0 ? "inline" : "none"));
        }
        const y = 136 + 190 * s.mark;
        mark.setAttribute("d", `M352 74 V${y} L366 ${y - 13} L380 ${y} V74 Z`);
      });
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 800, h: 450, dur: 3.5, still: 3.5,
    build(svg) {
      const pill = el("g", {}, svg);
      el("rect", { x: 56, y: 40, width: 130, height: 40, rx: 20, fill: SKY, stroke: INK, "stroke-width": 2.5 }, pill);
      mono(pill, 121, 66.5, "AI tools", 18, { "text-anchor": "middle" });
      const ul = el("path", { d: "M60 174 H60", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      const title = txt(svg, 54, 154, "Firefox translation", { "font-size": 64, "font-weight": 700 });
      const tw = Math.min(690, title.getComputedTextLength());
      const sub = txt(svg, 56, 220, "Translates a web page on your own computer", { "font-size": 26, "font-weight": 500, fill: MUTE });
      const chk = mono(svg, 56, 256, "Checked 27 Nov 2026", 17, { "font-weight": 500, fill: MUTE });
      const tiles = [[56, LIL, "52 languages", "on Firefox's list"], [412, MINT, "Offline", "after a download"]].map(([x, col, a, b], i) => {
        const g = el("g", {}, svg), ax = x + 24;
        el("rect", { x: x + 8, y: 290, width: 332, height: 138, rx: 20, fill: SOFT }, g);
        el("rect", { x, y: 282, width: 332, height: 138, rx: 20, fill: col, stroke: INK, "stroke-width": 3 }, g);
        const ic = el("g", {}, g);
        if (i === 0) {
          el("rect", { x: ax, y: 296, width: 70, height: 46, rx: 6, fill: BLUE, stroke: INK, "stroke-width": 2.5 }, ic);
          el("rect", { x: ax + 9, y: 309, width: 30, height: 6, rx: 3, fill: SOFT }, ic);
          el("rect", { x: ax + 9, y: 322, width: 22, height: 6, rx: 3, fill: SOFT }, ic);
          el("rect", { x: ax + 49, y: 304, width: 13, height: 16, rx: 2, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 3" }, ic);
        } else {
          el("path", { d: `M${ax + 61} 319 q14 -2 18 -16`, stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round" }, ic);
          el("path", { d: `M${ax + 8} 299 H${ax + 50} L${ax + 68} 319 L${ax + 50} 339 H${ax + 8} Q${ax} 339 ${ax} 331 V307 Q${ax} 299 ${ax + 8} 299 Z`, fill: YEL, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, ic);
          el("circle", { cx: ax + 55, cy: 319, r: 4, fill: "#fff", stroke: INK, "stroke-width": 2 }, ic);
        }
        const t1 = txt(g, ax, 380, a, { "font-size": 30, "font-weight": 700 });
        const t2 = mono(g, ax, 406, b, 17, { "font-weight": 500 });
        return { g, ic, t: [t1, t2], cx: x + 166, ix: ax + 35 };
      });
      return run((t) => ({
        pill: ob(seg(t, 0.05, 0.45)), title: oc(seg(t, 0.15, 0.6)), ul: io(seg(t, 0.45, 1.0)), sub: oc(seg(t, 0.55, 0.95)), chk: oc(seg(t, 0.65, 1.05)),
        tile: [0, 1].map((i) => ob(seg(t, 0.85 + i * 0.1, 1.35 + i * 0.1))), ic: [0, 1].map((i) => ob(seg(t, 1.2 + i * 0.1, 1.6 + i * 0.1))), tx: [0, 1].map((i) => oc(seg(t, 1.5 + i * 0.1, 1.95 + i * 0.1))),
      }), (s) => {
        at(pill, 121, 60, 0.8 + 0.2 * s.pill); op(pill, s.pill * 2);
        tf(title, 0, 16 * (1 - s.title)); op(title, s.title);
        ul.setAttribute("d", `M60 174 H${60 + (tw - 10) * s.ul}`); op(ul, s.ul > 0.01 ? 1 : 0);
        tf(sub, 0, 10 * (1 - s.sub)); op(sub, s.sub);
        tf(chk, 0, 10 * (1 - s.chk)); op(chk, s.chk);
        tiles.forEach((o, i) => {
          at(o.g, o.cx, 351, 0.88 + 0.12 * s.tile[i]); op(o.g, s.tile[i] * 1.6);
          at(o.ic, o.ix, 319, cl(s.ic[i], 0, 1.3));
          o.t.forEach((n) => { tf(n, 0, 8 * (1 - s.tx[i])); op(n, s.tx[i]); });
        });
      });
    },
  };

  /* ---- player: plays once in view and holds the final frame; a tap replays through a short blend ---- */
  const q = new URLSearchParams(location.search), frozen = q.has("mgstill"), fixed = parseFloat(q.get("mgstill"));
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mount = (fig) => {
    const sc = SC[fig.dataset.scene], img = fig.querySelector("img"); if (!sc || !img) return;
    const W = sc.w || 800, H = sc.h || 600;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "mg-svg", role: "group", "aria-label": img.alt || "" });
    svg.style.aspectRatio = `${W} / ${H}`;
    el("rect", { width: W, height: H, fill: "#fff" }, svg);
    img.replaceWith(svg);
    let off = 0, raf = 0, seen = false, held = calm, begun = false, paused = null, rs = null;
    const base = performance.now(), clock = () => (performance.now() - base) / 1000;
    let draw = () => {};
    const pos = () => (held ? sc.still : cl(clock() + off, 0, sc.dur));
    const frame = () => { const now = clock(); if (rs && now < rs.end) draw(rs.to, now, { from: rs.from, q: io(seg(now, rs.start, rs.end)) }); else { rs = null; draw(pos(), now); } };
    const tick = () => { cancelAnimationFrame(raf); frame(); if (seen && !held && (rs || clock() + off < sc.dur)) raf = requestAnimationFrame(tick); };
    const api = {
      now: clock,
      seek: (s) => { off = s - clock(); held = false; tick(); },
      replay: (to, d = 0.7) => { const now = clock(), from = rs ? rs.to : pos(); rs = { from, to, start: now, end: now + d }; off = to - now - d; held = false; paused = null; tick(); },
    };
    draw = sc.build(svg, api);
    if (frozen) { draw(isNaN(fixed) ? sc.still : cl(fixed, 0, sc.dur), 0); return; }
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen) {
        if (!begun) { begun = true; off = -clock(); } else if (paused != null) off = paused - clock();
        paused = null; tick();
        if (!fig.dataset.sent && window.posthog) { fig.dataset.sent = 1; window.posthog.capture("blog_scene_view", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); }
      } else { cancelAnimationFrame(raf); if (begun && !held && !rs) paused = pos(); }
    }, { threshold: 0.25 }).observe(fig);
    svg.addEventListener("click", () => { if (!fig.dataset.hit && window.posthog) { fig.dataset.hit = 1; window.posthog.capture("blog_scene_interact", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } });
    frame();
  };
  const go = () => document.querySelectorAll("figure.mg[data-scene]").forEach(mount);
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
